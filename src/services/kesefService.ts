import { supabase } from './supabaseClient';
import { getUserId } from './authService';
import type { KesefTipo } from './kesefConstants';

export interface KesefTransacao {
  id: string;
  usuario_id: string;
  tipo: KesefTipo | 'resgate' | 'estorno';
  quantidade: number;
  referencia_id: string | null;
  criado_em: string;
}

export async function getSaldoKesef(usuarioId?: string): Promise<number> {
  const id = usuarioId ?? await getUserId();
  const { data, error } = await supabase
    .from('kesef_saldo')
    .select('saldo')
    .eq('usuario_id', id)
    .maybeSingle();

  if (error) throw error;
  return (data as { saldo: number } | null)?.saldo ?? 0;
}

export async function getHistoricoKesef(
  usuarioId?: string,
  limite = 20,
): Promise<KesefTransacao[]> {
  const id = usuarioId ?? await getUserId();
  const { data, error } = await supabase
    .from('kesef_ledger')
    .select('*')
    .eq('usuario_id', id)
    .order('criado_em', { ascending: false })
    .limit(limite);

  if (error) throw error;
  return (data ?? []) as KesefTransacao[];
}

export async function creditarKesef(
  tipo: KesefTipo,
  quantidade: number,
  referenciaId?: string,
): Promise<KesefTransacao> {
  const usuarioId = await getUserId();
  const { data, error } = await supabase.rpc('creditar_kesef', {
    p_usuario_id: usuarioId,
    p_tipo: tipo,
    p_quantidade: quantidade,
    p_referencia_id: referenciaId ?? null,
  });

  if (error) throw error;
  return data as unknown as KesefTransacao;
}

export async function creditarXp(
  quantidade: number,
  referenciaId?: string,
): Promise<number> {
  const usuarioId = await getUserId();
  const { data, error } = await supabase.rpc('creditar_xp', {
    p_usuario_id: usuarioId,
    p_quantidade: quantidade,
    p_referencia_id: referenciaId ?? null,
  });
  if (error) throw error;
  return data as number;
}

export async function debitarKesef(
  quantidade: number,
  referenciaId?: string,
): Promise<KesefTransacao> {
  const usuarioId = await getUserId();
  const { data, error } = await supabase.rpc('debitar_kesef', {
    p_usuario_id: usuarioId,
    p_quantidade: quantidade,
    p_referencia_id: referenciaId ?? null,
  });

  if (error) throw error;
  return data as unknown as KesefTransacao;
}

export async function estornarKesef(
  quantidade: number,
  referenciaId?: string,
): Promise<KesefTransacao> {
  const usuarioId = await getUserId();
  const { data, error } = await supabase.rpc('estornar_kesef', {
    p_usuario_id: usuarioId,
    p_quantidade: quantidade,
    p_referencia_id: referenciaId ?? null,
  });

  if (error) throw error;
  const records = data as KesefTransacao[];
  return records[0];
}

export function subscribeToKesefChanges(
  usuarioId: string,
  callback: () => void,
): () => void {
  const channel = supabase
    .channel(`kesef_ledger_changes_${usuarioId}`)
    .on(
      'postgres_changes' as never,
      {
        event: 'INSERT',
        schema: 'public',
        table: 'kesef_ledger',
        filter: `usuario_id=eq.${usuarioId}`,
      } as never,
      () => callback(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
