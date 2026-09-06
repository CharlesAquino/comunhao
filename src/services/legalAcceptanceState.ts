export interface LegalAcceptanceState {
  aceito_em: string | null;
}

export function hasPendingLegalDocuments(documents: LegalAcceptanceState[]): boolean {
  return documents.length === 0 || documents.some(document => !document.aceito_em);
}
