import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  PublicSecurityError,
  assertAllowedKeys,
  createSecurityRequestContext,
  enforceRequestBasics,
  readJsonObject,
  safeErrorResponse,
  sha256,
} from '../_shared/security.ts';

const MAX_ATTEMPTS = 6;
const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9._]/g, '');
}

function authEmail(username: string): string {
  return `${username}@auth.comunhao.local`;
}

Deno.serve(async req => {
  const security = createSecurityRequestContext(req);
  if (req.method === 'OPTIONS') return security.preflight();

  try {
    enforceRequestBasics(req);
    const body = await readJsonObject(req, 8 * 1024);
    assertAllowedKeys(body, ['username', 'password']);
    const { username, password } = body;
    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
      throw new PublicSecurityError(400, 'CREDENTIALS_REQUIRED', 'Usuário ou senha incorretos');
    }

    const normalized = normalizeUsername(username);
    const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateKey = await sha256(`${normalized}:${forwarded}`);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const now = new Date();

    let { data: rate } = await admin
      .from('auth_rate_limits')
      .select('*')
      .eq('chave_hash', rateKey)
      .eq('finalidade', 'login')
      .maybeSingle();

    const { data: unlock } = await admin
      .from('auth_login_unlocks')
      .select('username_normalizado, expira_em')
      .eq('username_normalizado', normalized)
      .gt('expira_em', now.toISOString())
      .maybeSingle();

    if (unlock) {
      await admin.from('auth_rate_limits').delete().eq('chave_hash', rateKey).eq('finalidade', 'login');
      await admin.from('auth_login_unlocks').delete().eq('username_normalizado', normalized);
      rate = null;
    }

    if (rate?.bloqueado_ate && new Date(rate.bloqueado_ate) > now) {
      throw new PublicSecurityError(429, 'LOGIN_RATE_LIMITED', 'Muitas tentativas. Aguarde alguns minutos.', 60);
    }

    const { data: profile } = await admin
      .from('usuarios')
      .select('id, telefone')
      .eq('username_normalizado', normalized)
      .maybeSingle();

    let tokenResponse: Response | null = null;
    if (profile) {
      tokenResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: anonKey },
        body: JSON.stringify({ email: authEmail(normalized), password }),
      });
      // Compatibilidade com contas antigas criadas antes do username interno.
      if (!tokenResponse.ok && profile.telefone) {
        tokenResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: anonKey },
          body: JSON.stringify({ phone: profile.telefone, password }),
        });
      }
    } else {
      // Mantém tempo de resposta semelhante para reduzir enumeração de usuários.
      await sha256(`${password}:${normalized}:dummy`);
    }

    if (!tokenResponse?.ok) {
      const sameWindow = rate && now.getTime() - new Date(rate.janela_inicio).getTime() < WINDOW_MS;
      const attempts = sameWindow ? Number(rate.tentativas) + 1 : 1;
      const blockedUntil = attempts >= MAX_ATTEMPTS ? new Date(now.getTime() + BLOCK_MS).toISOString() : null;
      await admin.from('auth_rate_limits').upsert({
        chave_hash: rateKey,
        finalidade: 'login',
        tentativas: attempts,
        janela_inicio: sameWindow ? rate.janela_inicio : now.toISOString(),
        bloqueado_ate: blockedUntil,
        atualizado_em: now.toISOString(),
      }, { onConflict: 'chave_hash,finalidade' });

      throw new PublicSecurityError(
        attempts >= MAX_ATTEMPTS ? 429 : 401,
        attempts >= MAX_ATTEMPTS ? 'LOGIN_RATE_LIMITED' : 'INVALID_CREDENTIALS',
        attempts >= MAX_ATTEMPTS ? 'Muitas tentativas. Aguarde alguns minutos.' : 'Usuário ou senha incorretos',
        attempts >= MAX_ATTEMPTS ? 60 : undefined,
      );
    }

    const token = await tokenResponse.json();
    const { data: deletionRequest } = await admin
      .from('solicitacoes_exclusao_conta')
      .select('status')
      .eq('usuario_id', profile.id)
      .in('status', ['pendente', 'em_processamento'])
      .maybeSingle();
    if (deletionRequest) {
      throw new PublicSecurityError(
        403,
        'ACCOUNT_DELETION_PENDING',
        'A remoção desta conta foi solicitada. Fale com o responsável pela privacidade para contestar ou cancelar.',
      );
    }

    await admin.from('auth_rate_limits').delete().eq('chave_hash', rateKey).eq('finalidade', 'login');
    await admin.from('usuarios').update({ last_login: now.toISOString() }).eq('id', profile.id);

    return security.json({
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_in: token.expires_in,
    });
  } catch (error) {
    return safeErrorResponse(security, error);
  }
});
