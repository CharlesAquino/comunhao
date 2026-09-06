import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearScreenCaches, readScreenCache, writeScreenCache } from './screenCache';

describe('screenCache', () => {
  beforeEach(() => { localStorage.clear(); vi.useRealTimers(); });

  it('mantém dados dentro da validade definida pela tela', () => {
    writeScreenCache('perfil', { nome: 'Ana' });
    expect(readScreenCache<{ nome: string }>('perfil', 1000)).toEqual({ nome: 'Ana' });
  });

  it('respeita o prazo específico de cada tipo de conteúdo', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-16T12:00:00.000Z'));
    writeScreenCache('cantina', ['caldo']);
    vi.setSystemTime(new Date('2026-08-16T12:03:00.000Z'));
    expect(readScreenCache('cantina', 2 * 60 * 1000)).toBeNull();
  });

  it('limpa todos os caches de tela sem apagar preferências', () => {
    writeScreenCache('perfil', { nome: 'Ana' });
    localStorage.setItem('app-theme', 'dark');
    clearScreenCaches();
    expect(readScreenCache('perfil', 1000)).toBeNull();
    expect(localStorage.getItem('app-theme')).toBe('dark');
  });
});
