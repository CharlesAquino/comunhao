import { describe, it, expect } from 'vitest';
import { executarSorteio } from '../services/sorteio';

describe('executarSorteio', () => {
  it('retorna pares circulares para 2 usuários', () => {
    const result = executarSorteio(['a', 'b']);
    expect(result).toHaveLength(2);

    const a = result.find(r => r.id === 'a')!;
    const b = result.find(r => r.id === 'b')!;

    expect(a.orando_por_id).toBe('b');
    expect(a.sendo_orado_por_id).toBe('b');
    expect(b.orando_por_id).toBe('a');
    expect(b.sendo_orado_por_id).toBe('a');
  });

  it('retorna pares circulares para 3 usuários', () => {
    const result = executarSorteio(['a', 'b', 'c']);
    expect(result).toHaveLength(3);

    for (const r of result) {
      expect(r.orando_por_id).not.toBe(r.id);
      expect(r.sendo_orado_por_id).not.toBe(r.id);
      expect(result.filter(x => x.orando_por_id === r.id)).toHaveLength(1);
      expect(result.filter(x => x.sendo_orado_por_id === r.id)).toHaveLength(1);
    }
  });

  it('cada ID aparece uma vez como orando_por_id e uma como sendo_orado_por_id', () => {
    const ids = ['1', '2', '3', '4', '5'];
    const result = executarSorteio(ids);

    const orando = result.map(r => r.orando_por_id);
    const orado = result.map(r => r.sendo_orado_por_id);

    for (const id of ids) {
      expect(orando.filter(o => o === id)).toHaveLength(1);
      expect(orado.filter(o => o === id)).toHaveLength(1);
    }
  });

  it('lança erro para lista vazia', () => {
    expect(() => executarSorteio([])).toThrow();
  });

  it('lança erro para lista com 1 elemento', () => {
    expect(() => executarSorteio(['a'])).toThrow();
  });

  it('embaralha a ordem (estatisticamente diferente)', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const results = Array.from({ length: 50 }, () => executarSorteio(ids));
    const firstPairs = results.map(r =>
      r.find(x => x.id === 'a')!.orando_por_id
    );
    const uniquePairs = new Set(firstPairs);
    expect(uniquePairs.size).toBeGreaterThan(1);
  });
});
