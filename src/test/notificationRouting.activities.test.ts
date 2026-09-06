import { describe, expect, it } from 'vitest';
import { obterDestinoNotificacao } from '../services/notificationRouting';

function notificacao(
  tipo: string,
  dados: Record<string, unknown> = {},
  url: string | null = null,
) {
  return {
    id: 'notificacao-1',
    tipo,
    dados,
    url,
  };
}

describe('roteamento da Central de Atividades', () => {
  it('abre a mão levantada pela sessão', () => {
    expect(
      obterDestinoNotificacao(
        notificacao('mao_levantada', { sessao_id: 'sessao 1' }),
      ),
    ).toBe('/?orar_com=sessao%201');
  });

  it('abre convite pendente pela identificação do convite', () => {
    expect(
      obterDestinoNotificacao(
        notificacao('convite_oracao', { convite_id: 'convite-1' }),
      ),
    ).toBe('/?convite_oracao=convite-1');
  });

  it('respeita a sala informada pelo convite aceito', () => {
    expect(
      obterDestinoNotificacao(
        notificacao('convite_aceito', { sala_id: 'sala-1' }),
      ),
    ).toBe('/sala/sala-1');
  });

  it('leva atividades do mural ao pedido relacionado', () => {
    expect(
      obterDestinoNotificacao(
        notificacao('intercessao_pedido', { pedido_id: 'pedido-1' }),
      ),
    ).toBe('/mural?pedido=pedido-1');
  });

  it('leva a nova lição ao módulo EBD', () => {
    expect(
      obterDestinoNotificacao(
        notificacao('nova_licao', { licao_id: 'licao-1' }),
      ),
    ).toBe('/ebd?licao=licao-1');
  });

  it('mantém uma URL específica produzida pelo banco', () => {
    expect(
      obterDestinoNotificacao(
        notificacao('nova_licao', { licao_id: 'licao-1' }, '/ebd/custom'),
      ),
    ).toBe('/ebd/custom');
  });
});
