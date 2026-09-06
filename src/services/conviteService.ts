import { supabase } from './supabaseClient';
import { createRuntimeId } from '../utils/createRuntimeId';
import { getUserId } from './authService';

export interface ConviteOracao {
  id: string;
  remetente_id: string;
  destinatario_id: string;
  status: 'pendente' | 'aceito' | 'recusado' | 'expirado';
  tipo_conexao_remetente: 'aceite' | 'voz' | 'video' | null;
  tipo_conexao_destinatario: 'aceite' | 'voz' | 'video' | null;
  sala_id: string | null;
  iniciado_em: string | null;
  finalizado_em: string | null;
  criado_em: string;
  origem: 'dupla_semana' | 'sala_oracao';
}

export interface ConviteComRemetente extends ConviteOracao {
  remetente_nome: string;
  remetente_foto: string | null;
}

export interface SessaoTimer {
  id: string;
  convite_id: string;
  usuario_id: string;
  status_presenca: 'orando' | 'finalizou' | 'ausente';
  entrou_em: string;
  saiu_em: string | null;
}

export interface EstadoSessaoTimer {
  convite: ConviteOracao;
  usuarioId: string;
}

export async function getCurrentUserNome(): Promise<string> {
  let userId: string;
  try {
    userId = await getUserId();
  } catch {
    return '';
  }
  const { data: profile } = await supabase
    .from('usuarios')
    .select('nome')
    .eq('id', userId)
    .maybeSingle<{ nome: string }>();
  return profile?.nome ?? 'Alguém';
}

export async function enviarConviteOracao(
  destinatarioId: string,
  tipoConexao: 'aceite' | 'voz' | 'video' = 'voz',
  origem: 'dupla_semana' | 'sala_oracao',
): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('enviar_convite_oracao', {
      p_destinatario_id: destinatarioId,
      p_tipo_conexao: tipoConexao,
      p_origem: origem,
    });
    if (error) throw error;
    return data as string;
  } catch (error) {
    if (origem === 'dupla_semana') {
      const rawCode = error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : '';
      const code = rawCode.match(/[A-Z][A-Z0-9_]{2,79}/)?.[0] ?? 'CONVITE_APP_FALHOU';
      // A telemetria é auxiliar: não pode mascarar o erro real do convite nem
      // conceder ao cliente acesso à tabela de eventos.
      void supabase.rpc('registrar_falha_convite_dupla', {
        p_destinatario_id: destinatarioId,
        p_codigo: code,
      }).then(() => undefined).catch(() => undefined);
    }
    throw error;
  }
}

export async function convidarParaSalaOracao(salaId: string, destinatarioId: string): Promise<string> {
  const { data, error } = await supabase.rpc('convidar_para_sala_oracao', {
    p_sala_id: salaId,
    p_destinatario_id: destinatarioId,
  });
  if (error) throw error;
  return data as string;
}

export async function responderConviteOracao(
  conviteId: string,
  resposta: 'aceito' | 'recusado',
  tipoConexao: 'aceite' | 'voz' | 'video' = 'aceite',
): Promise<{ status: string; sala_id?: string | null; conexao_final?: string }> {
  const { data, error } = await supabase.rpc('responder_convite_oracao', {
    p_convite_id: conviteId,
    p_resposta: resposta,
    p_tipo_conexao: tipoConexao,
  });
  if (error) throw error;
  return data as unknown as { status: string; sala_id?: string | null; conexao_final?: string };
}

export async function finalizarSessaoTimer(
  conviteId: string,
): Promise<{ status: string; duracao_segundos?: number; tipo_conexao?: string }> {
  const { data, error } = await supabase.rpc('finalizar_sessao_timer', {
    p_convite_id: conviteId,
  });
  if (error) throw error;
  return data as unknown as { status: string; duracao_segundos?: number; tipo_conexao?: string };
}

export async function getEstadoSessaoTimer(conviteId: string): Promise<EstadoSessaoTimer> {
  const userId = await getUserId();
  const { data: convite, error: conviteError } = await supabase
    .from('convites_oracao')
    .select('id, remetente_id, destinatario_id, status, tipo_conexao_remetente, tipo_conexao_destinatario, sala_id, iniciado_em, finalizado_em, criado_em, origem')
    .eq('id', conviteId)
    .maybeSingle<ConviteOracao>();

  if (conviteError) throw conviteError;
  if (!convite) throw new Error('CONVITE_NAO_ENCONTRADO');
  if (convite.remetente_id !== userId && convite.destinatario_id !== userId) {
    throw new Error('CONVITE_NAO_AUTORIZADO');
  }
  if (convite.status !== 'aceito') throw new Error('CONVITE_NAO_ESTA_ATIVO');

  const { data: presenca, error: presencaError } = await supabase
    .from('sessoes_oracao_timer')
    .select('id')
    .eq('convite_id', conviteId)
    .eq('usuario_id', userId)
    .maybeSingle<{ id: string }>();

  if (presencaError) throw presencaError;
  if (!presenca) throw new Error('SESSAO_TIMER_NAO_ENCONTRADA');
  return { convite, usuarioId: userId };
}

export async function verificarTimerParceiro(
  conviteId: string,
): Promise<{ ambos_finalizaram?: boolean }> {
  const { data, error } = await supabase.rpc('verificar_timer_parceiro', {
    p_convite_id: conviteId,
  });
  if (error) throw error;
  return (data ?? {}) as { ambos_finalizaram?: boolean };
}

export async function getConvitesPendentes(): Promise<ConviteComRemetente[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('convites_oracao')
    .select(`
      id, remetente_id, destinatario_id, status, tipo_conexao_remetente,
      tipo_conexao_destinatario, sala_id, iniciado_em, finalizado_em, criado_em, origem,
      remetente:usuarios!convites_oracao_remetente_id_fkey (nome, foto_url)
    `)
    .eq('destinatario_id', userId)
    .eq('status', 'pendente')
    .order('criado_em', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((c: Record<string, unknown>) => {
    const remetente = c.remetente as { nome: string; foto_url: string | null };
    return {
      ...(c as unknown as ConviteOracao),
      remetente_nome: remetente?.nome ?? 'Alguém',
      remetente_foto: remetente?.foto_url ?? null,
    };
  });
}

export async function getConviteEnviadoPendente(): Promise<ConviteOracao | null> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('convites_oracao')
    .select('id, remetente_id, destinatario_id, status, tipo_conexao_remetente, tipo_conexao_destinatario, sala_id, iniciado_em, finalizado_em, criado_em, origem')
    .eq('remetente_id', userId)
    .eq('status', 'pendente')
    .maybeSingle<ConviteOracao>();

  if (error) throw error;
  return data;
}

export async function getConviteEnviadoEmAndamento(): Promise<ConviteOracao | null> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('convites_oracao')
    .select('id, remetente_id, destinatario_id, status, tipo_conexao_remetente, tipo_conexao_destinatario, sala_id, iniciado_em, finalizado_em, criado_em, origem')
    .eq('remetente_id', userId)
    .in('status', ['pendente', 'aceito'])
    .is('finalizado_em', null)
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle<ConviteOracao>();

  if (error) throw error;
  return data;
}

export async function cancelarConvite(conviteId: string): Promise<void> {
  const { error } = await supabase.rpc('cancelar_convite_oracao', {
    p_convite_id: conviteId,
  });
  if (error) throw error;
}

export function subscribeToConvites(
  userId: string,
  callback: (payload?: { id: string; status: string; sala_id?: string | null }) => void,
): () => void {
  function handleInsert(payload: { new: { destinatario_id: string } }) {
    if (payload.new.destinatario_id === userId) callback();
  }

  function handleUpdate(payload: { new: { id: string; remetente_id: string; destinatario_id: string; status: string; sala_id?: string | null } }) {
    if (payload.new.destinatario_id === userId) callback();
    if (payload.new.remetente_id === userId) {
      callback({ id: payload.new.id, status: payload.new.status, sala_id: payload.new.sala_id });
    }
  }

  const channel = supabase
    .channel(`convites_${userId}_${createRuntimeId()}`)
    .on(
      'postgres_changes' as never,
      { event: 'INSERT', schema: 'public', table: 'convites_oracao' } as never,
      handleInsert,
    )
    .on(
      'postgres_changes' as never,
      { event: 'UPDATE', schema: 'public', table: 'convites_oracao' } as never,
      handleUpdate,
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

export function subscribeToSessaoTimer(
  conviteId: string,
  callback: (payload: { new: SessaoTimer; eventType: string }) => void,
): () => void {
  const channel = supabase
    .channel(`sessao_timer_${conviteId}`)
    .on(
      'postgres_changes' as never,
      {
        event: '*',
        schema: 'public',
        table: 'sessoes_oracao_timer',
        filter: `convite_id=eq.${conviteId}`,
      } as never,
      (payload: { new: SessaoTimer; eventType: string }) => callback(payload),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
