import { describe, expect, it, vi } from 'vitest';
import type { PedidoMural } from '../types';
import {
  getTipoPublicacaoMeta,
  isPedidoSemResposta,
  priorizarPedidosMural,
  TIPOS_PUBLICACAO_MURAL,
} from '../services/muralSocial';

function pedido(partial: Partial<PedidoMural>): PedidoMural {
  return {
    id: crypto.randomUUID(),
    autor: 'Pessoa',
    autor_xp: 0,
    texto: 'Conteúdo',
    contagem: 0,
    comentarios_contagem: 0,
    intercedendo: false,
    tipo: 'em_clamor',
    status: 'publicado',
    permite_comentarios: true,
    criado_em: new Date().toISOString(),
    media: null,
    ...partial,
  };
}

describe('Mural Social', () => {
  it('mantém os quatro tipos de publicação planejados', () => {
    expect(TIPOS_PUBLICACAO_MURAL.map(item => item.id)).toEqual([
      'em_clamor',
      'testemunho',
      'reflexao',
      'gratidao',
    ]);
    expect(getTipoPublicacaoMeta('testemunho').label).toBe('Testemunho');
  });

  it('identifica pedido recente sem primeira intercessão', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-01T12:00:00Z'));

    expect(isPedidoSemResposta(pedido({
      criado_em: '2026-08-01T10:00:00Z',
      contagem: 0,
    }))).toBe(true);

    expect(isPedidoSemResposta(pedido({
      criado_em: '2026-08-01T10:00:00Z',
      contagem: 1,
    }))).toBe(false);

    expect(isPedidoSemResposta(pedido({
      tipo: 'gratidao',
      criado_em: '2026-08-01T10:00:00Z',
      contagem: 0,
    }))).toBe(false);

    vi.useRealTimers();
  });

  it('prioriza cuidado sem perder ordem cronológica do restante', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-01T12:00:00Z'));

    const testimony = pedido({ id: 'testimony', tipo: 'testemunho', criado_em: '2026-08-01T11:30:00Z' });
    const answered = pedido({ id: 'answered', contagem: 2, criado_em: '2026-08-01T11:00:00Z' });
    const waiting = pedido({ id: 'waiting', contagem: 0, criado_em: '2026-08-01T10:00:00Z' });

    expect(priorizarPedidosMural([answered, testimony, waiting]).map(item => item.id)).toEqual([
      'waiting',
      'testimony',
      'answered',
    ]);

    vi.useRealTimers();
  });
});
