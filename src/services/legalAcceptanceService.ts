import { supabase } from './supabaseClient';
export { hasPendingLegalDocuments } from './legalAcceptanceState';

export type LegalAcceptanceKind = 'aceite' | 'ciencia';

export interface LegalDocument {
  codigo: string;
  versao: string;
  titulo: string;
  resumo: string;
  conteudo: string;
  tipo_aceite: LegalAcceptanceKind;
  hash_conteudo: string;
  vigente_desde: string;
  aceito_em: string | null;
}

export async function listLegalDocuments(): Promise<LegalDocument[]> {
  const { data, error } = await supabase.rpc('listar_documentos_legais');
  if (error) throw error;
  return (data ?? []) as LegalDocument[];
}

export async function acceptLegalDocuments(
  documents: LegalDocument[],
  appVersion: string,
): Promise<void> {
  const { error } = await supabase.rpc('registrar_aceites_legais', {
    p_documentos: documents.map(document => ({
      codigo: document.codigo,
      versao: document.versao,
      confirmado: true,
    })),
    p_versao_app: appVersion,
  });
  if (error) throw error;
}
