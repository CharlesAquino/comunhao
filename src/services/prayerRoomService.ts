import { supabase } from './supabaseClient';

export interface SalaOracao {
  id: string;
  tipo_sala: 'dupla_aleatoria' | 'circulo_semana' | 'livre';
  status_sala: 'aguardando' | 'ativa' | 'encerrada';
  host_usuario_id: string;
  livekit_room_name: string;
  iniciada_em: string | null;
  encerrada_em: string | null;
  criado_em: string;
}

export interface ResultadoFinalizacao {
  usuario_id: string;
  creditado: boolean;
  motivo: string;
}

export async function criarSalaOracao(
  tipoSala: SalaOracao['tipo_sala'] = 'livre',
): Promise<SalaOracao> {
  const { data, error } = await supabase.rpc('criar_sala_oracao', {
    p_tipo_sala: tipoSala,
  });
  if (error) throw error;
  return data as SalaOracao;
}

export async function entrarSalaOracao(salaId: string): Promise<SalaOracao> {
  const { data, error } = await supabase.rpc('entrar_sala_oracao', {
    p_sala_id: salaId,
  });
  if (error) throw error;
  return data as SalaOracao;
}

export async function finalizarSalaOracao(salaId: string): Promise<ResultadoFinalizacao[]> {
  const { data, error } = await supabase.rpc('finalizar_sala_oracao', {
    p_sala_id: salaId,
  });
  if (error) throw error;
  return (data ?? []) as ResultadoFinalizacao[];
}

export async function obterTokenLiveKit(
  salaId: string,
): Promise<{ token: string; roomName: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('USER_NOT_AUTHENTICATED');

  const { data, error } = await supabase.functions.invoke('gerar-token-livekit', {
    body: { salaId },
  });

  if (error) {
    const response = 'context' in error && error.context instanceof Response ? error.context : null;
    if (response) {
      const payload = await response.clone().json().catch(() => null) as { message?: string; error?: string } | null;
      throw new Error(payload?.message || payload?.error || error.message);
    }
    throw error;
  }
  return data as { token: string; roomName: string };
}

export async function listarSalasAguardando(): Promise<SalaOracao[]> {
  const { data, error } = await supabase
    .from('salas_oracao')
    .select('*')
    .eq('status_sala', 'aguardando')
    .order('criado_em', { ascending: false });

  if (error) throw error;
  return (data ?? []) as SalaOracao[];
}

export function subscribeToSalasChanges(callback: () => void): () => void {
  const channel = supabase
    .channel('salas_oracao_changes')
    .on(
      'postgres_changes' as never,
      { event: '*', schema: 'public', table: 'salas_oracao' } as never,
      () => callback(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
