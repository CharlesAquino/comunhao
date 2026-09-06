import { supabase } from './supabaseClient';
import type { InstitutionalCrestKind } from './institutionalCrestRules';

interface PublicInstitutionalCrestRow {
  usuario_id: string;
  brasao: InstitutionalCrestKind;
}

export async function listPublicInstitutionalCrests(userIds: string[]): Promise<Record<string, InstitutionalCrestKind>> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean))).slice(0, 200);
  if (!uniqueIds.length) return {};

  const { data, error } = await supabase.rpc('listar_brasoes_institucionais_publicos', {
    p_usuario_ids: uniqueIds,
  });

  // Compatibilidade durante a publicação em lote: perfis continuam carregando
  // mesmo antes de a migration alcançar o ambiente remoto.
  if (error) return {};

  return ((data || []) as PublicInstitutionalCrestRow[]).reduce<Record<string, InstitutionalCrestKind>>((result, row) => {
    result[row.usuario_id] = row.brasao;
    return result;
  }, {});
}

export async function getPublicInstitutionalCrest(userId: string): Promise<InstitutionalCrestKind | null> {
  const crests = await listPublicInstitutionalCrests([userId]);
  return crests[userId] ?? null;
}
