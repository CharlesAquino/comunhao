import { describe, expect, it } from 'vitest';
import { hasPendingLegalDocuments } from '../services/legalAcceptanceState';
import type { LegalDocument } from '../services/legalAcceptanceService';

const document = (code: string, acceptedAt: string | null): LegalDocument => ({
  codigo: code,
  versao: '1.0.0',
  titulo: code,
  resumo: 'Resumo',
  conteudo: 'Conteúdo',
  tipo_aceite: code === 'aviso_privacidade' ? 'ciencia' : 'aceite',
  hash_conteudo: `hash-${code}`,
  vigente_desde: '2026-08-10T03:00:00.000Z',
  aceito_em: acceptedAt,
});

describe('aceite legal versionado', () => {
  it('mantém o acesso bloqueado quando nenhum documento vigente é retornado', () => {
    expect(hasPendingLegalDocuments([])).toBe(true);
  });

  it('solicita confirmação quando qualquer documento vigente estiver pendente', () => {
    expect(hasPendingLegalDocuments([
      document('termos_uso', '2026-08-10T20:00:00.000Z'),
      document('diretrizes_comunidade', null),
      document('aviso_privacidade', '2026-08-10T20:00:00.000Z'),
    ])).toBe(true);
  });

  it('libera o acesso quando todos os documentos vigentes estão registrados', () => {
    expect(hasPendingLegalDocuments([
      document('termos_uso', '2026-08-10T20:00:00.000Z'),
      document('diretrizes_comunidade', '2026-08-10T20:00:00.000Z'),
      document('aviso_privacidade', '2026-08-10T20:00:00.000Z'),
    ])).toBe(false);
  });
});
