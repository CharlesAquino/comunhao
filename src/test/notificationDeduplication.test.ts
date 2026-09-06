import { describe, expect, it } from 'vitest';
import {
  contarNotificacoesUnicasNaoLidas,
  deduplicarNotificacoes,
  mesclarNotificacaoUnica,
  notificacaoJaExiste,
  obterIdentificadoresNotificacao,
} from '../services/notificationDeduplication';

type TestNotification = {
  id: string;
  evento_chave?: string | null;
  lida: boolean;
  criada_em: string;
};

const base: TestNotification = {
  id: 'notif-1',
  evento_chave: 'mensagem:abc',
  lida: false,
  criada_em: '2026-07-28T10:00:00.000Z',
};

describe('notificationDeduplication', () => {
  it('gera identificadores por id e pela chave do evento', () => {
    expect(obterIdentificadoresNotificacao(base)).toEqual([
      'id:notif-1',
      'evento:mensagem:abc',
    ]);
  });

  it('remove notificações repetidas pelo mesmo id', () => {
    expect(deduplicarNotificacoes([base, { ...base }])).toHaveLength(1);
  });

  it('remove notificações repetidas pela mesma chave de evento', () => {
    const duplicadaComOutroId = { ...base, id: 'notif-2' };
    expect(deduplicarNotificacoes([base, duplicadaComOutroId])).toHaveLength(1);
    expect(notificacaoJaExiste([base], duplicadaComOutroId)).toBe(true);
  });

  it('insere somente eventos realmente novos e mantém os mais recentes primeiro', () => {
    const nova: TestNotification = {
      id: 'notif-3',
      evento_chave: 'convite:def:pendente',
      lida: false,
      criada_em: '2026-07-28T11:00:00.000Z',
    };

    const resultado = mesclarNotificacaoUnica([base], nova);
    expect(resultado.adicionada).toBe(true);
    expect(resultado.notificacoes.map(item => item.id)).toEqual(['notif-3', 'notif-1']);

    const repetida = mesclarNotificacaoUnica(resultado.notificacoes, {
      ...nova,
      id: 'notif-4',
    });
    expect(repetida.adicionada).toBe(false);
    expect(repetida.notificacoes).toHaveLength(2);
  });

  it('conta apenas notificações não lidas únicas', () => {
    expect(contarNotificacoesUnicasNaoLidas([
      base,
      { ...base, id: 'notif-2' },
      {
        id: 'notif-3',
        evento_chave: 'convite:1:aceito',
        lida: true,
        criada_em: '2026-07-28T12:00:00.000Z',
      },
    ])).toBe(1);
  });
});
