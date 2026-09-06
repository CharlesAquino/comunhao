import { beforeEach, describe, expect, it, vi } from 'vitest';
import { changePassword, getUserId, isValidUsername, normalizeUsername, registerAuthenticatedAccess, registerWithUsername, requestAccountDeletion, signInWithUsername, validateNewPassword } from '../services/authService';
import { supabase } from '../services/supabaseClient';

vi.mock('../services/supabaseClient', () => ({
  supabase: {
    auth: { getUser: vi.fn(), getSession: vi.fn(), refreshSession: vi.fn(), setSession: vi.fn(), updateUser: vi.fn(), signOut: vi.fn() },
    functions: { invoke: vi.fn() },
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

describe('authService.getUserId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna o id do perfil, não o id de auth.users', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'auth-id' } },
      error: null,
    } as never);
    vi.mocked(supabase.rpc).mockResolvedValue({ data: 'perfil-id', error: null } as never);

    await expect(getUserId()).resolves.toBe('perfil-id');
    expect(supabase.rpc).toHaveBeenCalledWith('usuario_atual_id');
  });

  it('não usa auth.users.id como fallback quando o perfil não está vinculado', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'auth-id' } },
      error: null,
    } as never);
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never);

    await expect(getUserId()).rejects.toThrow('USER_PROFILE_NOT_LINKED');
  });
});

describe('authService.changePassword', () => {
  beforeEach(() => vi.clearAllMocks());

  it('valida tamanho e confirmação antes do envio', () => {
    expect(validateNewPassword('curta', 'curta')).toBe('A nova senha deve ter pelo menos 8 caracteres.');
    expect(validateNewPassword('NovaSenha123!', 'OutraSenha123!')).toBe('As senhas não coincidem.');
    expect(validateNewPassword('NovaSenha123!', 'NovaSenha123!')).toBeNull();
  });

  it('altera a senha autenticada e encerra as demais sessões', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: 'auth-id' } }, error: null } as never);
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({ data: {}, error: null } as never);
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as never);

    await expect(changePassword('NovaSenha123!')).resolves.toEqual({ otherSessionsSignedOut: true });
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'NovaSenha123!' });
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'others' });
  });

  it('não tenta alterar a senha sem sessão válida', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null }, error: null } as never);

    await expect(changePassword('NovaSenha123!')).rejects.toThrow('Sua sessão expirou');
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });
});

describe('authService.requestAccountDeletion', () => {
  beforeEach(() => vi.clearAllMocks());

  it('registra a solicitação somente pela RPC autenticada', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: '2026-08-25T12:00:00.000Z', error: null } as never);

    await expect(requestAccountDeletion()).resolves.toEqual(new Date('2026-08-25T12:00:00.000Z'));
    expect(supabase.rpc).toHaveBeenCalledWith('solicitar_exclusao_minha_conta');
  });

  it('não confirma a remoção quando a RPC falha', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: new Error('rpc failed') } as never);

    await expect(requestAccountDeletion()).rejects.toThrow('Não foi possível solicitar');
  });
});

describe('authService.registerAuthenticatedAccess', () => {
  beforeEach(() => vi.clearAllMocks());

  it('não chama a RPC de telemetria quando a sessão não está válida', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null } as never);

    await expect(registerAuthenticatedAccess()).resolves.toBeUndefined();
    expect(supabase.rpc).not.toHaveBeenCalledWith('registrar_acesso_autenticado');
  });

  it('registra o último acesso sem consultar o usuário remotamente quando o token é válido', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { expires_at: Math.floor(Date.now() / 1000) + 3600 } },
      error: null,
    } as never);
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never);

    await expect(registerAuthenticatedAccess()).resolves.toBeUndefined();
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
    expect(supabase.auth.refreshSession).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledWith('registrar_acesso_autenticado');
  });

  it('renova a sessão perto da expiração antes de registrar o último acesso', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { expires_at: Math.floor(Date.now() / 1000) + 30 } },
      error: null,
    } as never);
    vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
      data: { session: { expires_at: Math.floor(Date.now() / 1000) + 3600 } },
      error: null,
    } as never);
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never);

    await expect(registerAuthenticatedAccess()).resolves.toBeUndefined();
    expect(supabase.auth.refreshSession).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith('registrar_acesso_autenticado');
  });
});

describe('authService.username', () => {
  beforeEach(() => vi.clearAllMocks());

  it('normaliza username sem expor telefone', () => {
    expect(normalizeUsername('  Charles.Aquino_27  ')).toBe('charles.aquino_27');
    expect(normalizeUsername('Charles Aquino')).toBe('charlesaquino');
  });

  it('valida o contrato de username', () => {
    expect(isValidUsername('CharlesAquino')).toBe(true);
    expect(isValidUsername('1charles')).toBe(false);
    expect(isValidUsername('abc')).toBe(false);
    expect(isValidUsername('charles-aquino')).toBe(false);
  });

  it('cria sessão a partir dos tokens retornados pela Edge Function', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { access_token: 'access', refresh_token: 'refresh' },
      error: null,
    } as never);
    vi.mocked(supabase.auth.setSession).mockResolvedValue({ data: {}, error: null } as never);

    await expect(signInWithUsername('CharlesAquino', 'Senha123@')).resolves.toBeUndefined();
    expect(supabase.functions.invoke).toHaveBeenCalledWith('login-username', {
      body: { username: 'CharlesAquino', password: 'Senha123@' },
      timeout: 15_000,
    });
    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: 'access',
      refresh_token: 'refresh',
    });
  });

  it('cadastra diretamente sem solicitar OTP', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { access_token: 'access', refresh_token: 'refresh' },
      error: null,
    } as never);
    vi.mocked(supabase.auth.setSession).mockResolvedValue({ data: {}, error: null } as never);
    const input = {
      nome: 'Sara',
      telefone: '+5527999999999',
      username: 'sara.silva',
      password: 'Senha123@',
    };

    await expect(registerWithUsername(input)).resolves.toBeUndefined();
    expect(supabase.functions.invoke).toHaveBeenCalledWith('registrar-username', { body: input });
    expect(supabase.functions.invoke).not.toHaveBeenCalledWith('enviar-otp', expect.anything());
  });

  it('não diferencia usuário inexistente de senha incorreta', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: new Error('unauthorized'),
    } as never);

    await expect(signInWithUsername('desconhecido', 'errada')).rejects.toThrow('Não foi possível entrar agora');
  });

  it('preserva a mensagem segura devolvida pela função de login', async () => {
    const response = new Response(JSON.stringify({ error: 'Muitas tentativas. Aguarde alguns minutos.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
    const error = Object.assign(new Error('Edge Function returned a non-2xx status code'), { context: response });
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error } as never);

    await expect(signInWithUsername('sara', 'errada')).rejects.toThrow('Muitas tentativas');
  });
});
