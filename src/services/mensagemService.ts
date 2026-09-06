import { supabase } from './supabaseClient';
import { createRuntimeId } from '../utils/createRuntimeId';
import { getUserId } from './authService';
import { listPublicInstitutionalCrests } from './institutionalCrestService';
import type { InstitutionalCrestKind } from './institutionalCrestRules';
import { PRAYER_STICKERS, type PrayerStickerDefinition, type PrayerStickerPack } from './prayerStickerService';

export interface Mensagem {
  id: string;
  remetente_id: string;
  destinatario_id: string;
  texto: string;
  tipo: 'texto' | 'figurinha';
  figurinha_id: string | null;
  figurinha_pacote: PrayerStickerPack | null;
  lida: boolean;
  criado_em: string;
}

export interface MensagemComRemetente extends Mensagem {
  remetente_nome: string;
}

export interface ConversaResumo {
  parceiro_id: string;
  parceiro_nome: string;
  parceiro_foto_url: string | null;
  ultima_mensagem: string;
  criado_em: string;
  nao_lidas: number;
  parceiro_brasao_institucional?: InstitutionalCrestKind | null;
}

export async function getConversa(
  parceiroId: string,
): Promise<MensagemComRemetente[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('mensagens')
    .select('id, remetente_id, destinatario_id, texto, tipo, figurinha_id, figurinha_pacote, lida, criado_em, remetente:usuarios!mensagens_remetente_id_fkey (nome)')
    .or(`and(remetente_id.eq.${userId},destinatario_id.eq.${parceiroId}),and(remetente_id.eq.${parceiroId},destinatario_id.eq.${userId})`)
    .order('criado_em', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((m: Record<string, unknown>) => {
    const remetente = m.remetente as { nome: string } | undefined;
    return {
      ...(m as unknown as Mensagem),
      remetente_nome: remetente?.nome ?? 'Desconhecido',
    };
  });
}

export async function enviarMensagem(
  destinatarioId: string,
  texto: string,
): Promise<Mensagem> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('mensagens')
    .insert({ remetente_id: userId, destinatario_id: destinatarioId, texto, tipo: 'texto' })
    .select('id, remetente_id, destinatario_id, texto, tipo, figurinha_id, figurinha_pacote, lida, criado_em')
    .single<Mensagem>();

  if (error) throw error;
  return data;
}

export async function enviarFigurinha(
  destinatarioId: string,
  sticker: PrayerStickerDefinition,
  pack: PrayerStickerPack,
): Promise<Mensagem> {
  if (!PRAYER_STICKERS.some(item => item.id === sticker.id)) throw new Error('FIGURINHA_INVALIDA');
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('mensagens')
    .insert({
      remetente_id: userId,
      destinatario_id: destinatarioId,
      texto: sticker.label,
      tipo: 'figurinha',
      figurinha_id: sticker.id,
      figurinha_pacote: pack,
    })
    .select('id, remetente_id, destinatario_id, texto, tipo, figurinha_id, figurinha_pacote, lida, criado_em')
    .single<Mensagem>();

  if (error) throw error;
  return data;
}

export function subscribeToMensagens(
  userId: string,
  parceiroId: string,
  callback: () => void,
): () => void {
  const channel = supabase
    .channel(`mensagens_${userId}_${parceiroId}_${createRuntimeId()}`)
    .on(
      'postgres_changes' as never,
      {
        event: 'INSERT',
        schema: 'public',
        table: 'mensagens',
        filter: `destinatario_id=eq.${userId}`,
      } as never,
      (payload: { new: Mensagem }) => {
        if (payload.new.remetente_id === parceiroId) callback();
      },
    )
    .on(
      'postgres_changes' as never,
      {
        event: 'INSERT',
        schema: 'public',
        table: 'mensagens',
        filter: `destinatario_id=eq.${parceiroId}`,
      } as never,
      (payload: { new: Mensagem }) => {
        if (payload.new.remetente_id === userId) callback();
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/** Atualiza a caixa de entrada quando qualquer conversa recebe uma mensagem. */
export function subscribeToInbox(userId: string, callback: () => void): () => void {
  const channel = supabase
    .channel(`mensagens_inbox_${userId}_${createRuntimeId()}`)
    .on(
      'postgres_changes' as never,
      {
        event: 'INSERT',
        schema: 'public',
        table: 'mensagens',
        filter: `destinatario_id=eq.${userId}`,
      } as never,
      callback,
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function marcarComoLidas(parceiroId: string): Promise<void> {
  const userId = await getUserId();
  await supabase
    .from('mensagens')
    .update({ lida: true })
    .eq('remetente_id', parceiroId)
    .eq('destinatario_id', userId)
    .eq('lida', false);
}

export async function getUltimasConversas(): Promise<ConversaResumo[]> {
  const userId = await getUserId();

  const { data: enviadas, error: err1 } = await supabase
    .from('mensagens')
    .select('destinatario_id, texto, tipo, criado_em')
    .eq('remetente_id', userId)
    .order('criado_em', { ascending: false });

  const { data: recebidas, error: err2 } = await supabase
    .from('mensagens')
    .select('remetente_id, texto, tipo, criado_em, lida')
    .eq('destinatario_id', userId)
    .order('criado_em', { ascending: false });

  if (err1 || err2) throw err1 ?? err2;

  const parceiros = new Map<string, { texto: string; criado_em: string; nao_lidas: number }>();

  for (const m of recebidas ?? []) {
    if (!parceiros.has(m.remetente_id)) {
      parceiros.set(m.remetente_id, { texto: m.tipo === 'figurinha' ? `Figurinha: ${m.texto}` : m.texto, criado_em: m.criado_em, nao_lidas: 0 });
    }
    const p = parceiros.get(m.remetente_id)!;
    if (!m.lida) p.nao_lidas += 1;
  }

  for (const m of enviadas ?? []) {
    if (!parceiros.has(m.destinatario_id)) {
      parceiros.set(m.destinatario_id, { texto: m.tipo === 'figurinha' ? `Figurinha: ${m.texto}` : m.texto, criado_em: m.criado_em, nao_lidas: 0 });
    }
  }

  const ids = Array.from(parceiros.keys());
  if (ids.length === 0) return [];

  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('id, nome, foto_url')
    .in('id', ids);

  const parceiroMap = new Map((usuarios ?? []).map(u => [u.id, { nome: u.nome, foto_url: u.foto_url ?? null }]));
  const brasoes = await listPublicInstitutionalCrests(ids);

  return ids.map(id => ({
    parceiro_id: id,
    parceiro_nome: parceiroMap.get(id)?.nome ?? 'Desconhecido',
    parceiro_foto_url: parceiroMap.get(id)?.foto_url ?? null,
    ultima_mensagem: parceiros.get(id)!.texto,
    criado_em: parceiros.get(id)!.criado_em,
    nao_lidas: parceiros.get(id)!.nao_lidas,
    parceiro_brasao_institucional: brasoes[id] ?? null,
  })).sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
}
