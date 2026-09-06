import { describe, expect, it } from 'vitest';
import { mensagemErroConvite } from '../services/conviteErrors';

describe('mensagens do convite de oração', () => {
  it('traduz estados funcionais para mensagens compreensíveis', () => {
    expect(mensagemErroConvite(new Error('CONVITE_RECEBIDO_PENDENTE'))).toContain('já enviou');
    expect(mensagemErroConvite(new Error('REMETENTE_EM_SALA_ATIVA'))).toContain('Encerre');
    expect(mensagemErroConvite(new Error('DUPLA_NAO_DEFINIDA'))).toContain('não está definida');
  });

  it('preserva uma mensagem inesperada para diagnóstico', () => {
    expect(mensagemErroConvite(new Error('Falha de rede'))).toBe('Falha de rede');
  });

  it('normaliza objetos de erro retornados pelo Supabase', () => {
    expect(mensagemErroConvite({ message: 'No API key found in request' })).toContain('chave pública');
    expect(mensagemErroConvite({ message: 'Erro remoto' })).toBe('Erro remoto');
    expect(mensagemErroConvite({ code: 'UNKNOWN' })).toContain('Não foi possível');
  });
});
