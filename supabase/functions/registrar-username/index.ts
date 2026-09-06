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

const MAX_REGISTRATIONS = 5;
const WINDOW_MS = 30 * 60 * 1000;
const RESERVED_USERNAMES = new Set([
  'admin', 'administrador', 'professor', 'suporte', 'comunhao',
  'oracao', 'pastor', 'sistema', 'moderador', 'guardiao',
]);

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('55') ? `+${digits}` : `+55${digits}`;
}

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9._]/g, '');
}

function authEmail(username: string): string {
  return `${username}@auth.comunhao.local`;
}

Deno.serve(async req => {
  const security = createSecurityRequestContext(req);
  if (req.method === 'OPTIONS') return security.preflight();

  let createdUserId: string | null = null;
  let adminClient: ReturnType<typeof createClient> | null = null;

  try {
    enforceRequestBasics(req);
    const body = await readJsonObject(req, 12 * 1024);
    assertAllowedKeys(body, [
      'nome', 'telefone', 'username', 'password', 'emailRecuperacao', 'codigoIndicacao',
    ]);

    const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
    const telefone = typeof body.telefone === 'string' ? normalizePhone(body.telefone) : '';
    const usernameInput = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    const username = normalizeUsername(usernameInput);
    const password = typeof body.password === 'string' ? body.password : '';
    const emailRecuperacao = typeof body.emailRecuperacao === 'string'
      ? body.emailRecuperacao.trim().toLowerCase()
      : null;

    if (
      nome.length < 2
      || !/^\+55\d{10,11}$/.test(telefone)
      || usernameInput !== username
      || !/^[a-z][a-z0-9._]{3,23}$/.test(username)
      || password.length < 8
    ) {
      throw new PublicSecurityError(
        400,
        'REGISTRATION_DATA_INVALID',
        'Confira nome, WhatsApp, usuário e senha. A senha deve ter pelo menos 8 caracteres.',
      );
    }
    if (RESERVED_USERNAMES.has(username)) {
      throw new PublicSecurityError(409, 'USERNAME_UNAVAILABLE', 'Escolha outro nome de usuário.');
    }
    if (emailRecuperacao && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRecuperacao)) {
      throw new PublicSecurityError(400, 'RECOVERY_EMAIL_INVALID', 'Informe um e-mail de recuperação válido.');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const admin = createClient(supabaseUrl, serviceRoleKey);
    adminClient = admin;
    const now = new Date();
    const address = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('cf-connecting-ip')?.trim()
      || 'unknown';
    const rateKey = await sha256(`cadastro:${username}:${address}`);
    const { data: rate } = await admin
      .from('auth_rate_limits')
      .select('*')
      .eq('chave_hash', rateKey)
      .eq('finalidade', 'cadastro')
      .maybeSingle();
    const sameWindow = Boolean(rate)
      && now.getTime() - new Date(rate.janela_inicio).getTime() < WINDOW_MS;
    const attempts = sameWindow ? Number(rate.tentativas) + 1 : 1;
    if (sameWindow && Number(rate.tentativas) >= MAX_REGISTRATIONS) {
      throw new PublicSecurityError(
        429,
        'REGISTRATION_RATE_LIMITED',
        'Muitas tentativas de cadastro. Aguarde alguns minutos.',
        60,
      );
    }
    await admin.from('auth_rate_limits').upsert({
      chave_hash: rateKey,
      finalidade: 'cadastro',
      tentativas: attempts,
      janela_inicio: sameWindow ? rate.janela_inicio : now.toISOString(),
      atualizado_em: now.toISOString(),
    }, { onConflict: 'chave_hash,finalidade' });

    const [{ data: phoneProfile }, { data: usernameProfile }] = await Promise.all([
      admin.from('usuarios').select('id').eq('telefone', telefone).maybeSingle(),
      admin.from('usuarios').select('id').eq('username_normalizado', username).maybeSingle(),
    ]);
    if (phoneProfile) {
      throw new PublicSecurityError(409, 'PHONE_ALREADY_REGISTERED', 'WhatsApp já cadastrado.');
    }
    if (usernameProfile) {
      throw new PublicSecurityError(409, 'USERNAME_UNAVAILABLE', 'Nome de usuário indisponível.');
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: authEmail(username),
      password,
      email_confirm: true,
      user_metadata: { nome },
    });
    if (createError || !created.user) {
      if (createError?.message?.toLowerCase().includes('already')) {
        throw new PublicSecurityError(409, 'USERNAME_UNAVAILABLE', 'Nome de usuário indisponível.');
      }
      throw createError || new Error('AUTH_USER_CREATION_FAILED');
    }
    createdUserId = created.user.id;

    let indicadoPorId: string | null = null;
    if (typeof body.codigoIndicacao === 'string' && body.codigoIndicacao.trim()) {
      const { data: indicador } = await admin
        .from('usuarios')
        .select('id')
        .eq('codigo_indicacao', body.codigoIndicacao.trim().toUpperCase())
        .maybeSingle();
      indicadoPorId = indicador?.id || null;
    }

    const { error: profileError } = await admin.from('usuarios').insert({
      id: created.user.id,
      nome,
      telefone,
      username,
      email_recuperacao: emailRecuperacao || null,
      auth_user_id: created.user.id,
      status_anel: 'offline',
      papel: 'membro',
      indicado_por_id: indicadoPorId,
    });
    if (profileError) throw profileError;

    const tokenResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: anonKey },
      body: JSON.stringify({ email: authEmail(username), password }),
    });
    const tokenBody = await tokenResponse.json();
    if (!tokenResponse.ok) throw new Error('SESSION_GRANT_FAILED');

    return security.json({
      access_token: tokenBody.access_token,
      refresh_token: tokenBody.refresh_token,
      expires_in: tokenBody.expires_in,
    });
  } catch (error) {
    if (adminClient && createdUserId) {
      await adminClient.from('usuarios').delete().eq('id', createdUserId);
      await adminClient.auth.admin.deleteUser(createdUserId);
    }
    return safeErrorResponse(security, error);
  }
});
