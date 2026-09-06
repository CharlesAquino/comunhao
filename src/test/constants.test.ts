import { describe, it, expect } from 'vitest';
import { STORAGE_KEYS, LIMITS, MESSAGES, ROUTES } from '../services/constants';

describe('constants', () => {
  it('STORAGE_KEYS should have correct values', () => {
    expect(STORAGE_KEYS.USER_ID).toBe('oracao_app_user_id');
    expect(STORAGE_KEYS.ADMIN_AUTH).toBe('oracao_app_admin_auth');
  });

  it('LIMITS should have correct values', () => {
    expect(LIMITS.INACTIVE_DAYS).toBe(15);
    expect(LIMITS.MIN_USERS_FOR_DRAW).toBe(2);
  });

  it('MESSAGES should have correct values', () => {
    expect(MESSAGES.USER_NOT_FOUND).toBe('Usuário não encontrado no banco de dados.');
    expect(MESSAGES.NOT_AUTHENTICATED).toBe('USER_NOT_AUTHENTICATED');
    expect(MESSAGES.AWAITING_DRAW).toBe('Aguardando sorteio...');
    expect(MESSAGES.ANONYMOUS).toBe('Anônimo');
    expect(MESSAGES.ADMIN_UNAUTHORIZED).toBe('Senha de administrador incorreta.');
  });

  it('ROUTES should have correct values', () => {
    expect(ROUTES.REGISTER).toBe('/register');
    expect(ROUTES.HOME).toBe('/');
    expect(ROUTES.MURAL).toBe('/mural');
    expect(ROUTES.MENSAGENS).toBe('/mensagens');
    expect(ROUTES.RANKING).toBe('/ranking');
    expect(ROUTES.ADMIN).toBe('/admin');
  });
});
