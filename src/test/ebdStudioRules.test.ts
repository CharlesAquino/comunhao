import { describe, expect, it } from 'vitest';
import {
  createEditorialSlug,
  createEmptyQuizQuestion,
  EBD_STUDIO_BLOCK_OPTIONS,
  getEbdBlockLabel,
} from '../services/ebdStudioRules';

describe('regras do Estúdio EBD', () => {
  it('gera identificadores editoriais previsíveis sem acentos', () => {
    expect(createEditorialSlug('Gideão e a Liderança!')).toBe('gideao-e-a-lideranca');
  });

  it('mantém os tipos selecionáveis com rótulo editorial', () => {
    expect(EBD_STUDIO_BLOCK_OPTIONS.map(option => option.type)).toContain('quiz');
    expect(getEbdBlockLabel('scripture')).toBe('Passagem bíblica');
  });

  it('cria perguntas independentes com duas opções iniciais', () => {
    const first = createEmptyQuizQuestion();
    const second = createEmptyQuizQuestion();

    expect(first.id).not.toBe(second.id);
    expect(first.options).toEqual(['', '']);
    expect(first.correctAnswers).toEqual([]);
  });
});
