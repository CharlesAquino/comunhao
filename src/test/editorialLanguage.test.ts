import { describe, expect, it } from 'vitest';
import { isRedundantEditorialTitle, normalizeEditorialText, validateEditorialDayLanguage } from '../services/editorialLanguage';

describe('linguagem editorial EBD', () => {
  it('compara rótulos sem depender de caixa, acento ou pontuação', () => {
    expect(normalizeEditorialText('  SEGUNDA-FEIRA  ')).toBe('segunda feira');
    expect(isRedundantEditorialTitle('Segunda feira', 'Segunda-feira')).toBe(true);
  });

  it('rejeita título que apenas repete o dia da semana', () => {
    expect(validateEditorialDayLanguage({
      label: 'Segunda-feira',
      title: 'Segunda-feira',
      subtitle: 'O fim da liderança de Gideão',
    })).toContainEqual(expect.objectContaining({ code: 'TITLE_REPEATS_DAY' }));
  });

  it('aceita hierarquia com dia, tema e complemento distintos', () => {
    expect(validateEditorialDayLanguage({
      label: 'Segunda-feira',
      title: 'O fim da liderança de Gideão',
      subtitle: 'O governo de Abimeleque',
    })).toEqual([]);
  });
});

