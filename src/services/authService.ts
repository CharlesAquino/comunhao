import { supabase } from './supabaseClient';
import { clearDashboardCache } from './dashboardCache';
import { clearMuralCache } from './muralCache';
import { clearScreenCaches } from './screenCache';

let profileIdRequest: Promise<string> | null = null;

export interface UsernameLoginResult {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase().replace(/[^a-z0-9._]/g, '');
}

export function isValidUsername(username: string): boolean {
  return /^[a-z][a-z0-9._]{3,23}$/.test(username.trim().toLowerCase());
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('verificar-username', {
    body: { username },
  });
  if (error) throw error;
  return data?.available === true;
}

export interface DirectRegistrationInput {
  nome: string;
  telefone: string;
  username: string;
  password: string;
  emailRecuperacao?: string;
  codigoIndicacao?: string;
}

async function getFunctionErrorMessage(error: unknown, fallback: string): Promise<Error> {
  if (error instanceof Error && !(error as { context?: unknown }).context) {
    const technicalMessage = error.message.toLowerCase();
    if (error.name === 'AbortError' || technicalMessage.includes('timeout')) {
      return new Error('A conexão demorou demais. Verifique a internet e tente novamente.');
    }
    if (technicalMessage.includes('fetch') || technicalMessage.includes('network')) {
      return new Error('Não foi possível conectar ao Comunhão. Verifique a internet e tente novamente.');
    }
    return new Error(fallback);
  }

  const response = (error as { context?: Response } | null)?.context;
  if (response) {
    try {
      const payload = await response.clone().json() as { error?: string; message?: string };
      const message = payload.error || payload.message;
      if (message) return new Error(message);
    } catch {
      // Mantém a mensagem genérica quando a resposta não for JSON.
    }
  }

  return new Error(fallback);
}

export async function registerWithUsername(input: DirectRegistrationInput): Promise<void> {
  clearDashboardCache();
  clearMuralCache();
  clearScreenCaches();
  const { data, error } = await supabase.functions.invoke<UsernameLoginResult>('registrar-username', {
    body: input,
  });
  if (error || !data?.access_token || !data?.refresh_token) {
    throw await getFunctionErrorMessage(error, 'Não foi possível criar a conta.');
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
  if (sessionError) throw sessionError;
}

export async function signInWithUsername(username: string, password: string): Promise<void> {
  clearDashboardCache();
  clearMuralCache();
  clearScreenCaches();
  const { data, error } = await supabase.functions.invoke<UsernameLoginResult>('login-username', {
    body: { username, password },
    timeout: 15_000,
  });
  if (error || !data?.access_token || !data?.refresh_token) {
    throw await getFunctionErrorMessage(error, 'Não foi possível entrar agora. Tente novamente em alguns instantes.');
  }
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
  if (sessionError) throw sessionError;
}

export async function getUserId(): Promise<string> {
  if (profileIdRequest) return profileIdRequest;
  profileIdRequest = (async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('USER_NOT_AUTHENTICATED');

    const { data: profileId, error: profileError } = await supabase.rpc('usuario_atual_id');
    if (profileError) throw profileError;
    if (typeof profileId !== 'string' || !profileId) throw new Error('USER_PROFILE_NOT_LINKED');
    return profileId;
  })();
  try {
    return await profileIdRequest;
  } finally {
    profileIdRequest = null;
  }
}

export async function signOut(): Promise<void> {
  clearDashboardCache();
  clearMuralCache();
  clearScreenCaches();
  await supabase.auth.signOut();
}

export interface ChangePasswordResult {
  otherSessionsSignedOut: boolean;
}

export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password.length < 8) return 'A nova senha deve ter pelo menos 8 caracteres.';
  if (password.length > 72) return 'A nova senha deve ter no máximo 72 caracteres.';
  if (password !== confirmation) return 'As senhas não coincidem.';
  return null;
}

export async function changePassword(password: string): Promise<ChangePasswordResult> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Sua sessão expirou. Entre novamente para alterar a senha.');

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    const message = updateError.message.toLowerCase();
    if (message.includes('different') || message.includes('same password')) {
      throw new Error('Escolha uma senha diferente da atual.');
    }
    if (message.includes('reauth') || message.includes('nonce')) {
      throw new Error('Por segurança, entre novamente na conta antes de alterar a senha.');
    }
    throw new Error('Não foi possível alterar a senha. Tente novamente.');
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: 'others' });
  return { otherSessionsSignedOut: !signOutError };
}

export async function requestAccountDeletion(): Promise<Date> {
  const { data, error } = await supabase.rpc('solicitar_exclusao_minha_conta');
  if (error || typeof data !== 'string') {
    throw new Error('Não foi possível solicitar a remoção da conta. Tente novamente.');
  }
  return new Date(data);
}

export async function hasActiveSession(): Promise<boolean> {
  const { data, error } = await supabase.auth.getSession();
  return !error && Boolean(data.session);
}

export async function registerAuthenticatedAccess(): Promise<void> {
  // O registro de último acesso não pode criar uma chamada extra a `/auth/v1/user`
  // em toda montagem de rota. A sessão local é suficiente enquanto o token ainda
  // é válido; somente perto da expiração pedimos renovação ao Supabase.
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) return;

  const expiresAtMs = typeof session.expires_at === 'number' ? session.expires_at * 1000 : 0;
  if (expiresAtMs > 0 && expiresAtMs <= Date.now() + 60_000) {
    const { data, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !data.session) return;
  }

  const { error } = await supabase.rpc('registrar_acesso_autenticado');
  if (error) throw error;
}

export function subscribeToAuthentication(callback: (authenticated: boolean) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(Boolean(session)));
  return () => data.subscription.unsubscribe();
}
