import { describe, expect, it } from 'vitest';
import { getInstitutionalCrestLabel, resolveInstitutionalCrest } from '../services/institutionalCrestRules';

describe('brasões institucionais', () => {
  it('prioriza administração geral', () => {
    expect(resolveInstitutionalCrest(['pastoral', 'administrador'], 'membro')).toBe('administrador');
    expect(resolveInstitutionalCrest([], 'admin')).toBe('administrador');
  });

  it('distingue cuidado pastoral de serviço administrativo', () => {
    expect(resolveInstitutionalCrest(['pastoral'], 'membro')).toBe('pastoral');
    expect(resolveInstitutionalCrest(['editor_ebd'], 'membro')).toBe('equipe');
    expect(resolveInstitutionalCrest([], 'mod')).toBe('equipe');
  });

  it('não atribui função institucional a membros', () => {
    expect(resolveInstitutionalCrest([], 'membro')).toBeNull();
  });

  it('fornece descrição acessível', () => {
    expect(getInstitutionalCrestLabel('pastoral')).toContain('Pastoral');
  });
});
