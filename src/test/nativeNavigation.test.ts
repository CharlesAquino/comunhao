import { describe, expect, it } from 'vitest';
import { resolveBackTarget } from '../services/navigationRules';

describe('resolveBackTarget', () => {
  it('retorna à rota anterior da pilha', () => {
    expect(resolveBackTarget('/mural', ['/', '/mural'])).toEqual({ target: '/', nextStack: ['/'] });
  });

  it('retorna módulos administrativos à visão geral', () => {
    expect(resolveBackTarget('/admin/pessoas', ['/admin/pessoas']).target).toBe('/admin');
  });

  it('não envia um usuário autenticado para uma rota de login', () => {
    expect(resolveBackTarget('/mural', ['/login', '/mural']).target).toBe('/');
  });
});
