import { describe, expect, it } from 'vitest';
import { extractEditorialSourceDay, parseEditorialSourceDay, SOURCE_BLOCKS, SOURCE_SCHEMA, sourceDayWarnings } from '../services/ebdSourcePackage';
import { createEmptyEditorialDocument, normalizeEditorialDocument } from '../types/ebdEditorial';

function fixture() {
  return {
    schemaVersion: SOURCE_SCHEMA, lessonKey: '2026-3T-L11', dayKey: '2026-3T-L11-D01', weekday: 'monday', revision: 1,
    day: { title: 'Título diário', subtitle: 'Subtítulo', purpose: 'Objetivo', estimatedMinutes: 12, blocks: SOURCE_BLOCKS.map(type => ({
      type, title: type, content: '  Texto com acentos: fé.\n\nSegundo parágrafo preservado.  ', reference: type === 'scripture' ? 'Juízes 17:1–6' : '', altText: '', prompt: '', required: !['hero', 'text'].includes(type),
      quizQuestions: type === 'quiz' ? Array.from({ length: 3 }, (_, i) => ({ prompt: `Qual alternativa ${i}?`, selectionMode: 'single', options: ['Um', 'Dois', 'Três', 'Quatro'], correctAnswers: [i], explanation: 'Explicação da resposta.' })) : [],
    })) },
    provenance: SOURCE_BLOCKS.map(blockType => ({ blockType, sourceIds: ['fonte'], sourceLocators: ['seção'], claimScopes: ['editorial_application'], notes: '' })),
  };
}

describe('pacotes editoriais sem geração', () => {
  it('preserva literalmente texto, seleção canônica, calendário e gabaritos após normalização do salvamento', () => {
    const input = fixture();
    const source = parseEditorialSourceDay(input);
    const document = createEmptyEditorialDocument();
    const target = { ...document.days[0], unlocksAt: '2026-09-07T08:00' };
    const imported = extractEditorialSourceDay(source, target, ['quiz', 'text']);
    expect(imported.blocks.map(b => b.type)).toEqual(['text', 'quiz']);
    expect(imported.id).toBe(target.id);
    expect(imported.unlocksAt).toBe(target.unlocksAt);
    const normalized = normalizeEditorialDocument({ ...document, days: [imported, ...document.days.slice(1)] });
    expect(normalized.days[0].blocks[0].content).toBe(input.day.blocks[1].content);
    expect(normalized.days[0].blocks[1].settings?.questions).toEqual(expect.arrayContaining([expect.objectContaining({ correctAnswers: [2], options: ['Um', 'Dois', 'Três', 'Quatro'] })]));
    expect(source.day.blocks).toHaveLength(10);
    expect(normalized.days[6]).toEqual(document.days[6]);
    expect(JSON.stringify(imported)).not.toContain('provenance');
  });
  it('sinaliza extensão editorial sem descartar texto ou tentar completá-lo', () => {
    const source = parseEditorialSourceDay(fixture());
    expect(sourceDayWarnings(source).some(w => w.startsWith('text:'))).toBe(true);
    expect(source.day.blocks[1].content).toBe(fixture().day.blocks[1].content);
  });
  it.each(['sunday', 'wrong'])('recusa dia %s', weekday => {
    expect(() => parseEditorialSourceDay({ ...fixture(), weekday })).toThrow();
  });
  it('recusa gabarito inválido e tipos duplicados', () => {
    const input = fixture(); input.day.blocks[8].quizQuestions[0].correctAnswers = [4];
    expect(() => parseEditorialSourceDay(input)).toThrow(/gabarito/);
    const duplicate = fixture(); duplicate.day.blocks[1] = duplicate.day.blocks[0];
    expect(() => parseEditorialSourceDay(duplicate)).toThrow(/fora de ordem/);
  });
  it('não mistura o dia nem aceita seleção vazia', () => {
    const source = parseEditorialSourceDay(fixture()); const days = createEmptyEditorialDocument().days;
    expect(() => extractEditorialSourceDay(source, days[1], ['text'])).toThrow(/não corresponde/);
    expect(() => extractEditorialSourceDay(source, days[0], [])).toThrow(/Selecione/);
  });
  it('rejeita comandos/campos adicionais e metadados incompletos', () => {
    expect(() => parseEditorialSourceDay({ ...fixture(), publish: true })).toThrow(/campo/);
    expect(() => parseEditorialSourceDay({ ...fixture(), provenance: [] })).toThrow(/procedência/);
  });
});
