import { describe, expect, it } from 'vitest';
import {
  obterCanalPush,
  obterIdNotificacaoPush,
  obterRotaPush,
  PUSH_CHANNELS,
} from '../services/pushNotificationConfig';

describe('pushNotificationConfig', () => {
  it('separa mensagens, oração e avisos em canais próprios', () => {
    expect(obterCanalPush('nova_mensagem')).toBe(PUSH_CHANNELS.MENSAGENS);
    expect(obterCanalPush('mao_levantada')).toBe(PUSH_CHANNELS.ORACAO);
    expect(obterCanalPush('sorteio_circulo')).toBe(PUSH_CHANNELS.AVISOS);
  });

  it('aceita somente rotas internas', () => {
    expect(obterRotaPush({ url: '/chat/123' })).toBe('/chat/123');
    expect(obterRotaPush({ url: 'https://site-malicioso.test' })).toBe('/');
    expect(obterRotaPush(undefined)).toBe('/');
  });

  it('extrai o id persistente da notificação', () => {
    expect(obterIdNotificacaoPush({ notification_id: 'abc' })).toBe('abc');
    expect(obterIdNotificacaoPush({ notification_id: 10 })).toBeNull();
  });
});
