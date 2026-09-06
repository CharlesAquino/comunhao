import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PedidoMural } from '../types';
import { clearMuralCache, readMuralCache, writeMuralCache } from './muralCache';

const post: PedidoMural = {
  id: 'p1',
  autor: 'Ana',
  autor_xp: 0,
  texto: 'Pedido de oração',
  contagem: 0,
  comentarios_contagem: 0,
  intercedendo: false,
  tipo: 'em_clamor',
  status: 'publicado',
  permite_comentarios: true,
  criado_em: '2026-08-16T12:00:00.000Z',
  media: null,
};

describe('muralCache', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('restaura o último feed válido', () => {
    writeMuralCache([post]);
    expect(readMuralCache()).toEqual([post]);
  });

  it('expira antes das URLs assinadas das imagens', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-16T12:00:00.000Z'));
    writeMuralCache([post]);
    vi.setSystemTime(new Date('2026-08-16T12:31:00.000Z'));
    expect(readMuralCache()).toBeNull();
  });

  it('é removido ao encerrar ou trocar de conta', () => {
    writeMuralCache([post]);
    clearMuralCache();
    expect(readMuralCache()).toBeNull();
  });
});
