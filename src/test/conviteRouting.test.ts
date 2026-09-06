import { describe, expect, it } from 'vitest';
import { deveEncaminharAceiteNovo, obterDestinoConviteAceito, obterModoConviteAceito } from '../services/conviteRouting';

describe('conviteRouting', () => {
  it('não redireciona enquanto o convite não estiver aceito', () => {
    expect(obterDestinoConviteAceito({
      id: 'convite-1',
      status: 'pendente',
      sala_id: null,
    })).toBeNull();
  });

  it('abre a mesma sala para o remetente quando houver sala_id', () => {
    expect(obterDestinoConviteAceito({
      id: 'convite-2',
      status: 'aceito',
      sala_id: 'sala 1',
    })).toBe('/sala/sala%201');
  });

  it('abre o timer compartilhado quando não houver sala_id', () => {
    expect(obterDestinoConviteAceito({
      id: 'convite 3',
      status: 'aceito',
      sala_id: null,
    })).toBe('/timer/convite%203');
  });

  it('prioriza vídeo quando qualquer participante solicitar vídeo', () => {
    expect(obterModoConviteAceito({ tipo_conexao_remetente: 'voz', tipo_conexao_destinatario: 'video' })).toBe('video');
  });

  it('mantém voz quando a sala não solicitar vídeo', () => {
    expect(obterModoConviteAceito({ tipo_conexao_remetente: 'voz', tipo_conexao_destinatario: 'voz' })).toBe('voz');
  });

  it('usa silêncio quando o convite não criar mídia', () => {
    expect(obterModoConviteAceito({ tipo_conexao_remetente: 'aceite', tipo_conexao_destinatario: 'aceite' })).toBe('silencio');
  });
});

describe('deveEncaminharAceiteNovo', () => {
  it('não reabre uma chamada antiga ao iniciar o aplicativo', () => {
    expect(deveEncaminharAceiteNovo(null, 'aceito')).toBe(false);
  });

  it('encaminha quando um convite pendente acaba de ser aceito', () => {
    expect(deveEncaminharAceiteNovo('pendente', 'aceito')).toBe(true);
  });

  it('encaminha um aceite recebido em tempo real', () => {
    expect(deveEncaminharAceiteNovo(null, 'aceito', true)).toBe(true);
  });
});
