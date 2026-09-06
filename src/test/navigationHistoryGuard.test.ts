import { describe, expect, it } from 'vitest';
import { getNavigationFallback } from '../services/navigationRules';

describe('navegação administrativa', () => {
  it('volta de um módulo para a visão geral', () => {
    expect(getNavigationFallback('/admin/pessoas')).toBe('/admin');
    expect(getNavigationFallback('/admin/ebd/rascunho')).toBe('/admin');
  });

  it('volta da visão geral para o aplicativo', () => {
    expect(getNavigationFallback('/admin')).toBe('/');
  });
});
