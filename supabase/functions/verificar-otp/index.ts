// Valida o OTP reservado exclusivamente para recuperação de senha.

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

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

Deno.serve(async (req) => {
  const security = createSecurityRequestContext(req);
  if (req.method === 'OPTIONS') return security.preflight();

  try {
    enforceRequestBasics(req);
    const body = await readJsonObject(req, 8 * 1024);
    assertAllowedKeys(body, ['username', 'code', 'password', 'mode']);
    const { username, code, password, mode } = body;

    if (mode !== undefined && mode !== 'recuperacao') {
      throw new PublicSecurityError(
        410,
        'REGISTRATION_OTP_DISCONTINUED',
        'A verificação por WhatsApp no cadastro foi descontinuada.',
      );
    }
    if (typeof username !== 'string' || !username.trim() || !code) {
      throw new PublicSecurityError(400, 'IDENTIFIER_AND_CODE_REQUIRED', 'Informe a conta e o código.');
    }
    if (typeof password !== 'string' || password.length < 8) {
      throw new PublicSecurityError(400, 'PASSWORD_TOO_SHORT', 'A senha deve ter pelo menos 8 caracteres');
    }

    const usernameNormalizado = username.trim().toLowerCase().replace(/[^a-z0-9._]/g, '');
    const codeStr = String(code).trim();
    const env: Env = Deno.env.toObject() as unknown as Env;
    const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: profile } = await admin
      .from('usuarios')
      .select('id, telefone, auth_user_id')
      .eq('username_normalizado', usernameNormalizado)
      .maybeSingle();
    if (!profile?.telefone || !profile.auth_user_id) {
      throw new PublicSecurityError(400, 'OTP_INVALID_OR_EXPIRED', 'Código inválido ou expirado');
    }

    const { data: otpRows, error: otpError } = await admin
      .from('otp_codes')
      .select('*')
      .eq('telefone', profile.telefone)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('criado_em', { ascending: false })
      .limit(3);
    if (otpError) throw otpError;
    if (!otpRows?.length) {
      throw new PublicSecurityError(400, 'OTP_INVALID_OR_EXPIRED', 'Código expirado ou inexistente');
    }

    const latestOtp = otpRows[0];
    if (Number(latestOtp.tentativas) >= 5) {
      await admin.from('otp_codes').update({ used_at: new Date().toISOString() }).eq('id', latestOtp.id);
      throw new PublicSecurityError(429, 'OTP_BLOCKED', 'Código bloqueado. Solicite um novo.', 60);
    }

    const hashHex = await sha256(codeStr);
    const otpRecord = otpRows.find((row) => row.code_hash === hashHex);
    if (!otpRecord) {
      await admin.from('otp_codes')
        .update({ tentativas: Number(latestOtp.tentativas) + 1 })
        .eq('id', latestOtp.id);
      throw new PublicSecurityError(400, 'OTP_INVALID', 'Código inválido');
    }

    const agora = new Date().toISOString();
    await admin.from('otp_codes')
      .update({ used_at: agora })
      .eq('id', otpRecord.id)
      .is('used_at', null);

    const { error: updateAuthError } = await admin.auth.admin.updateUserById(
      profile.auth_user_id,
      { password, phone_confirmed_at: agora },
    );
    if (updateAuthError) throw updateAuthError;

    const tokenResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: env.SUPABASE_ANON_KEY },
      body: JSON.stringify({ phone: profile.telefone, password }),
    });
    const tokenBody = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new PublicSecurityError(503, 'SESSION_GRANT_FAILED', 'Falha ao gerar sessão');
    }

    await admin.from('usuarios')
      .update({ telefone_verificado_em: agora })
      .eq('id', profile.id);

    return security.json({
      access_token: tokenBody.access_token,
      refresh_token: tokenBody.refresh_token,
      user: { id: profile.auth_user_id, phone: profile.telefone },
      isNewUser: false,
    });
  } catch (error) {
    return safeErrorResponse(security, error);
  }
});
