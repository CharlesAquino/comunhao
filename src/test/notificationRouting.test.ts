import { describe, expect, it } from 'vitest';
import { obterDestinoNotificacao, obterTagNotificacao } from '../services/notificationRouting';

describe('notificationRouting', () => {
  it('abre a tela de resposta para uma mão levantada', () => {
    expect(obterDestinoNotificacao({
      id: 'notif-1',
      tipo: 'mao_levantada',
      url: '/',
      dados: { sessao_id: 'sessao 1' },
    })).toBe('/?orar_com=sessao%201');
  });

  it('mantém a URL normal das demais notificações', () => {
    expect(obterDestinoNotificacao({
      id: 'notif-2',
      tipo: 'nova_mensagem',
      url: '/chat/usuario-1',
    })).toBe('/chat/usuario-1');
  });

  it('usa a chave do evento para impedir exibição duplicada', () => {
    expect(obterTagNotificacao({
      id: 'notif-3',
      tipo: 'convite_oracao',
      evento_chave: 'convite:abc:pendente',
    })).toBe('convite:abc:pendente');
  });
});
