import type { MuralComment } from '../types';
import { supabase } from './supabaseClient';
import { createRuntimeId } from '../utils/createRuntimeId';
import { getUserId } from './authService';
import { MURAL_MAX_COMMENT_LENGTH } from './muralSocial';
import { listPublicInstitutionalCrests } from './institutionalCrestService';

interface CommentRow {
  id: string;
  publicacao_id: string;
  autor_id: string;
  comentario_pai_id: string | null;
  texto: string;
  criado_em: string;
  editado_em: string | null;
  autor: {
    id: string;
    nome: string;
    username: string | null;
    foto_url: string | null;
    xp: number | null;
  } | null;
}

export async function listMuralComments(publicationId: string): Promise<MuralComment[]> {
  const currentUserId = await getUserId();
  const { data, error } = await supabase
    .from('mural_comentarios')
    .select(`
      id,
      publicacao_id,
      autor_id,
      comentario_pai_id,
      texto,
      criado_em,
      editado_em,
      autor:usuarios!mural_comentarios_autor_id_fkey(id, nome, username, foto_url, xp)
    `)
    .eq('publicacao_id', publicationId)
    .order('criado_em', { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as unknown as CommentRow[];
  const brasoes = await listPublicInstitutionalCrests(rows.map(row => row.autor_id));
  return rows.map(row => ({
    id: row.id,
    publicationId: row.publicacao_id,
    authorId: row.autor_id,
    parentId: row.comentario_pai_id,
    text: row.texto,
    createdAt: row.criado_em,
    editedAt: row.editado_em,
    authorName: row.autor?.nome ?? 'Usuário',
    authorUsername: row.autor?.username ?? null,
    authorPhotoUrl: row.autor?.foto_url ?? null,
    authorXp: row.autor?.xp ?? 0,
    authorInstitutionalCrest: brasoes[row.autor_id] ?? null,
    isOwner: row.autor_id === currentUserId,
  }));
}

export async function createMuralComment(publicationId: string, text: string): Promise<void> {
  const cleanText = text.trim();
  if (!cleanText) throw new Error('Escreva um comentário.');
  if (cleanText.length > MURAL_MAX_COMMENT_LENGTH) {
    throw new Error(`O comentário deve ter no máximo ${MURAL_MAX_COMMENT_LENGTH} caracteres.`);
  }

  const userId = await getUserId();
  const { error } = await supabase
    .from('mural_comentarios')
    .insert({
      publicacao_id: publicationId,
      autor_id: userId,
      texto: cleanText,
    });

  if (error) throw error;
}

export async function deleteMuralComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('mural_comentarios')
    .delete()
    .eq('id', commentId);

  if (error) throw error;
}

export function subscribeToMuralComments(publicationId: string, callback: () => void): () => void {
  const channel = supabase
    .channel(`mural-comments-${publicationId}-${createRuntimeId()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'mural_comentarios',
        filter: `publicacao_id=eq.${publicationId}`,
      },
      callback,
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
