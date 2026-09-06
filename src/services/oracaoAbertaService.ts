import { supabase } from './supabaseClient';
import { createRuntimeId } from '../utils/createRuntimeId';
import type { SessaoGrupoParticipanteInfo } from '../types';

export interface SessaoGrupo {
  id: string;
  anfitriao_id?: string;
  aceito_por_id?: string | null;
  status: 'aberta' | 'encerrada';
  criado_em: string;
  encerrada_em?: string;
}

export interface SessaoGrupoResponse {
  id: string;
  status: 'aberta' | 'encerrada';
  anfitriao_id?: string;
  aceito_por_id?: string | null;
}

export interface SessaoGrupoParticipante {
  id: string;
  sessao_id: string;
  usuario_id: string;
  entrou_em: string;
  saiu_em?: string;
}

export interface SessaoAbertaListada {
  sessao_id: string;
  anfitriao_id: string;
  anfitriao_nome: string;
  anfitriao_foto: string | null;
}

export async function abrirSessaoGrupo(): Promise<SessaoGrupoResponse> {
  const { data, error } = await supabase.rpc('abrir_sessao_grupo');
  if (error) throw error;
  return data as unknown as SessaoGrupoResponse;
}

export async function entrarSessaoGrupo(sessaoId: string): Promise<SessaoGrupoResponse> {
  const { data, error } = await supabase.rpc('entrar_sessao_grupo', {
    p_sessao_id: sessaoId,
  });
  if (error) throw error;
  return data as unknown as SessaoGrupoResponse;
}

export async function sairSessaoGrupo(sessaoId: string): Promise<void> {
  const { error } = await supabase.rpc('sair_sessao_grupo', {
    p_sessao_id: sessaoId,
  });
  if (error) throw error;
}

export async function finalizarSessaoGrupo(sessaoId: string): Promise<void> {
  const { error } = await supabase.rpc('finalizar_sessao_grupo', {
    p_sessao_id: sessaoId,
  });
  if (error) throw error;
}

export async function listarSessoesGrupoAbertas(): Promise<SessaoAbertaListada[]> {
  const { data, error } = await supabase.rpc('listar_sessoes_grupo_abertas');
  if (error) throw error;
  return (data ?? []) as SessaoAbertaListada[];
}

export async function listarParticipantesAtivos(sessaoId: string): Promise<SessaoGrupoParticipanteInfo[]> {
  const { data: ativos, error } = await supabase
    .from('sessoes_oracao_grupo_participantes')
    .select('usuario_id')
    .eq('sessao_id', sessaoId)
    .is('saiu_em', null);
  if (error) throw error;
  const ids = (ativos ?? []).map(item => item.usuario_id);
  if (!ids.length) return [];
  const { data: usuarios, error: usuariosError } = await supabase
    .from('usuarios')
    .select('id, nome, foto_url')
    .in('id', ids);
  if (usuariosError) throw usuariosError;
  return (usuarios ?? []).map(usuario => ({
    usuario_id: usuario.id,
    nome: usuario.nome,
    foto_url: usuario.foto_url,
  }));
}

export async function obterNomeUsuario(usuarioId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('nome')
    .eq('id', usuarioId)
    .maybeSingle<{ nome: string }>();
  if (error) throw error;
  return data?.nome ?? null;
}

export function subscribeToSessaoGrupo(
  sessaoId: string,
  callbacks: {
    onParticipanteEntrou?: (participante: { usuario_id: string; nome: string; foto_url: string | null }) => void;
    onParticipanteSaiu?: (participante: { usuario_id: string; nome: string; foto_url: string | null }) => void;
    onSessaoEncerrada?: () => void;
    onSessaoAceita?: (aceitoPorId: string) => void;
    onAnfitriaoAlterado?: (novoAnfitriaoId: string) => void;
  },
): () => void {
  const channel = supabase
    .channel(`sessao_grupo_${sessaoId}_${createRuntimeId()}`)
    .on(
      'postgres_changes' as never,
      {
        event: 'INSERT',
        schema: 'public',
        table: 'sessoes_oracao_grupo_participantes',
        filter: `sessao_id=eq.${sessaoId}`,
      } as never,
      async (payload: { new: { usuario_id: string } }) => {
        const { data: user } = await supabase
          .from('usuarios')
          .select('id, nome, foto_url')
          .eq('id', payload.new.usuario_id)
          .single<{ id: string; nome: string; foto_url: string | null }>();
        if (user) {
          callbacks.onParticipanteEntrou?.({ usuario_id: user.id, nome: user.nome, foto_url: user.foto_url });
        }
      },
    )
    .on(
      'postgres_changes' as never,
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessoes_oracao_grupo_participantes',
        filter: `sessao_id=eq.${sessaoId}`,
      } as never,
      async (payload: { new: { usuario_id: string; saiu_em: string | null } }) => {
        if (payload.new.saiu_em) {
          const { data: user } = await supabase
            .from('usuarios')
            .select('id, nome, foto_url')
            .eq('id', payload.new.usuario_id)
            .single<{ id: string; nome: string; foto_url: string | null }>();
          if (user) {
            callbacks.onParticipanteSaiu?.({ usuario_id: user.id, nome: user.nome, foto_url: user.foto_url });
          }
        }
      },
    )
    .on(
      'postgres_changes' as never,
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessoes_oracao_grupo',
        filter: `id=eq.${sessaoId}`,
      } as never,
      (payload: { new: { status: string; anfitriao_id?: string; aceito_por_id?: string | null } }) => {
        if (payload.new.status === 'encerrada') {
          callbacks.onSessaoEncerrada?.();
          return;
        }

        if (payload.new.aceito_por_id) {
          callbacks.onSessaoAceita?.(payload.new.aceito_por_id);
        }

        if (payload.new.anfitriao_id) {
          callbacks.onAnfitriaoAlterado?.(payload.new.anfitriao_id);
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
