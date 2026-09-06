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

type RecoveryChannel = 'whatsapp' | 'email';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_SENDS = 3;

function secureOtp(): string {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return String(100000 + (random[0] % 900000));
}

function normalizePhone(phone: string): string {
  const raw = phone.replace(/\D/g, '');
  return raw.startsWith('55') ? `+${raw}` : `+55${raw}`;
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase().replace(/[^a-z0-9._]/g, '');
}

function maskPhone(phone: string): string {
  return `WhatsApp terminado em ${phone.replace(/\D/g, '').slice(-4)}`;
}

function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  return `${name.slice(0, 1)}••••@${domain}`;
}

Deno.serve(async req => {
  const security = createSecurityRequestContext(req);
  if (req.method === 'OPTIONS') return security.preflight();

  try {
    enforceRequestBasics(req);
    const body = await readJsonObject(req, 8 * 1024);
    assertAllowedKeys(body, ['username', 'mode', 'channel']);
    if (body.mode !== undefined && body.mode !== 'recuperacao') {
      throw new PublicSecurityError(410, 'REGISTRATION_OTP_DISCONTINUED', 'A verificação por WhatsApp no cadastro foi descontinuada.');
    }
    const channel: RecoveryChannel = body.channel === 'email' ? 'email' : 'whatsapp';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    let phone = '';
    let email: string | null = null;
    if (typeof body.username !== 'string' || !body.username.trim()) {
      return security.json({ sent: true });
    }
    const usernameNormalized = normalizeUsername(body.username);
    const { data: profile } = await admin
      .from('usuarios')
      .select('telefone, email_recuperacao')
      .eq('username_normalizado', usernameNormalized)
      .maybeSingle();

    // Resposta neutra: não confirma se a conta existe.
    if (!profile?.telefone) {
      await sha256(`${usernameNormalized}:recovery-dummy`);
      return security.json({ sent: true });
    }
    phone = normalizePhone(profile.telefone);
    email = profile.email_recuperacao;
    if (channel === 'email' && !email) {
      throw new PublicSecurityError(400, 'RECOVERY_CHANNEL_UNAVAILABLE', 'Canal de recuperação indisponível');
    }

    const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateKey = await sha256(`recuperacao:${usernameNormalized}:${forwarded}`);
    const finalidade = 'otp_recuperacao';
    const now = new Date();
    const { data: rate } = await admin
      .from('auth_rate_limits')
      .select('*')
      .eq('chave_hash', rateKey)
      .eq('finalidade', finalidade)
      .maybeSingle();
    const sameWindow = rate && now.getTime() - new Date(rate.janela_inicio).getTime() < WINDOW_MS;
    const attempts = sameWindow ? Number(rate.tentativas) + 1 : 1;
    if (sameWindow && Number(rate.tentativas) >= MAX_SENDS) {
      throw new PublicSecurityError(429, 'OTP_RATE_LIMITED', 'Aguarde alguns minutos antes de solicitar outro código', 60);
    }

    await admin.from('auth_rate_limits').upsert({
      chave_hash: rateKey,
      finalidade,
      tentativas: attempts,
      janela_inicio: sameWindow ? rate.janela_inicio : now.toISOString(),
      atualizado_em: now.toISOString(),
    }, { onConflict: 'chave_hash,finalidade' });

    await admin.from('otp_codes').update({ used_at: now.toISOString() })
      .eq('telefone', phone).is('used_at', null);

    const code = secureOtp();
    const codeHash = await sha256(code);
    const { data: otpInsert, error: dbError } = await admin
      .from('otp_codes')
      .insert({
        telefone: phone,
        code_hash: codeHash,
        expires_at: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
        tentativas: 0,
      })
      .select('id')
      .single();
    if (dbError) throw dbError;

    if (channel === 'email' && email) {
      const resendKey = Deno.env.get('RESEND_API_KEY');
      const fromEmail = Deno.env.get('RECOVERY_FROM_EMAIL');
      if (!resendKey || !fromEmail) {
        await admin.from('otp_codes').update({ used_at: now.toISOString() }).eq('id', otpInsert.id);
        throw new PublicSecurityError(503, 'EMAIL_RECOVERY_NOT_CONFIGURED', 'Recuperação por e-mail ainda não configurada');
      }
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: fromEmail,
          to: [email],
          subject: 'Código de recuperação — Comunhão',
          text: `Seu código de recuperação é ${code}. Ele é válido por 10 minutos.`,
        }),
      });
      if (!emailResponse.ok) throw new Error('EMAIL_DELIVERY_FAILED');
    } else {
      const evolutionUrl = Deno.env.get('EVOLUTION_API_URL');
      const evolutionKey = Deno.env.get('EVOLUTION_API_KEY');
      const evolutionInstance = Deno.env.get('EVOLUTION_INSTANCE');
      if (!evolutionUrl || !evolutionKey || !evolutionInstance) {
        throw new PublicSecurityError(503, 'WHATSAPP_NOT_CONFIGURED', 'WhatsApp ainda não configurado');
      }

      const message = `Comunhão — seu código de recuperação é ${code}. Válido por 10 minutos.`;
      const waResponse = await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: evolutionKey },
        body: JSON.stringify({ number: phone, text: message }),
      });
      if (!waResponse.ok) throw new PublicSecurityError(502, 'WHATSAPP_DELIVERY_FAILED');
    }

    return security.json({
      sent: true,
      destination: channel === 'email' && email ? maskEmail(email) : maskPhone(phone),
    });
  } catch (error) {
    return safeErrorResponse(security, error);
  }
});
