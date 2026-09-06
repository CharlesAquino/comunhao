import { describe, expect, it } from 'vitest';
import { editorialPublicationError } from '../services/ebdEditorialErrors';

describe('editorialPublicationError', () => {
  it('explica conflito de versão sem expor o erro interno', () => {
    const error = editorialPublicationError({
      code: '40001',
      message: 'EBD_VERSION_CONFLICT',
    });

    expect(error.message).toContain('atualizada em outra operação');
  });

  it('explica quando o dia está incompleto', () => {
    const error = editorialPublicationError({ message: 'EBD_DAY_INCOMPLETE' });

    expect(error.message).toContain('título e pelo menos um bloco');
  });

  it('preserva erros legíveis que não pertencem ao domínio editorial', () => {
    const original = new Error('Falha de rede');

    expect(editorialPublicationError(original)).toBe(original);
  });
});
