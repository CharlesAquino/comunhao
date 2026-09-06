import { describe, expect, it } from 'vitest';
import {
  EBD_WEEKDAYS,
  createEmptyEditorialDocument,
  normalizeEditorialDocument,
  getEditorialCoverImage,
  type EbdEditorialDocument,
} from '../types/ebdEditorial';

describe('normalizeEditorialDocument', () => {
  it('cria os sete dias com rótulos canônicos', () => {
    const document = createEmptyEditorialDocument();

    expect(document.days.map(day => day.label)).toEqual(EBD_WEEKDAYS.map(day => day.label));
    expect(document.days.map(day => day.day)).toEqual(EBD_WEEKDAYS.map(day => day.day));
    expect(document.knowledgeSourceIds).toEqual([]);
  });

  it('preserva e remove duplicatas dos vínculos de fontes RAG', () => {
    const sourceId = '11111111-1111-4111-8111-111111111111';
    const normalized = normalizeEditorialDocument({ knowledgeSourceIds: [sourceId, sourceId] });

    expect(normalized.knowledgeSourceIds).toEqual([sourceId]);
  });

  it('usa a capa explícita e recorre à primeira imagem da segunda-feira', () => {
    const document = createEmptyEditorialDocument();
    document.days[0].blocks = [{ id: 'hero', type: 'hero', title: 'Abertura', mediaUrl: 'https://cdn.test/segunda.webp' }];

    expect(getEditorialCoverImage(document)).toBe('https://cdn.test/segunda.webp');

    document.coverImageUrl = 'https://cdn.test/capa.webp';
    expect(getEditorialCoverImage(document)).toBe('https://cdn.test/capa.webp');
  });

  it('corrige documentos antigos com segunda-feira em todos os dias sem perder o conteúdo', () => {
    const broken = createEmptyEditorialDocument();
    broken.days = broken.days.map((day, index) => ({
      ...day,
      day: 'monday',
      label: 'Segunda-feira',
      title: `Conteúdo ${index + 1}`,
    })) as EbdEditorialDocument['days'];

    const normalized = normalizeEditorialDocument(broken);

    expect(normalized.days.map(day => day.label)).toEqual(EBD_WEEKDAYS.map(day => day.label));
    expect(normalized.days.map(day => day.title)).toEqual([
      'Conteúdo 1',
      'Conteúdo 2',
      'Conteúdo 3',
      'Conteúdo 4',
      'Conteúdo 5',
      'Conteúdo 6',
      'Conteúdo 7',
    ]);
  });

  it('repara IDs de dia duplicados usando a identidade canônica da semana', () => {
    const broken = createEmptyEditorialDocument();
    broken.days = broken.days.map(day => ({
      ...day,
      id: 'day-monday',
      day: 'monday',
      label: 'Segunda-feira',
    })) as EbdEditorialDocument['days'];

    const normalized = normalizeEditorialDocument(broken);

    expect(normalized.days.map(day => day.id)).toEqual(EBD_WEEKDAYS.map(day => `day-${day.day}`));
    expect(new Set(normalized.days.map(day => day.id)).size).toBe(7);
  });
});
