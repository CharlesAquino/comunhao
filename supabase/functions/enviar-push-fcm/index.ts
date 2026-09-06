import { createClient } from 'jsr:@supabase/supabase-js@2';
import { importPKCS8, SignJWT } from 'npm:jose@6';
import {
  PublicSecurityError,
  createSecurityRequestContext,
  enforceRequestBasics,
  readJsonObject,
  safeErrorResponse,
  sha256,
} from '../_shared/security.ts';

type AppNotificationRecord = {
  id: string;
  usuario_id: string;
  tipo: string;
  titulo: string;
  corpo: string;
  url: string | null;
  dados: Record<string, unknown> | null;
  evento_chave: string | null;
  lida: boolean;
  criada_em: string;
};

type DatabaseWebhookPayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: AppNotificationRecord;
  old_record: AppNotificationRecord | null;
};

type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
};

type PushDevice = {
  id: string;
  token_fcm: string;
};

type NotificationPreferences = {
  oracao: boolean;
  mensagens: boolean;
  dupla_semanal: boolean;
  tesouro: boolean;
  ebd: boolean;
  comunidade: boolean;
  silencio_ativo: boolean;
  silencio_inicio: string;
  silencio_fim: string;
  fuso_horario: string;
};

const FIREBASE_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const DEFAULT_TOKEN_URI = 'https://oauth2.googleapis.com/token';

async function assertAuthorizedWebhook(req: Request): Promise<void> {
  const expectedSecret = Deno.env.get('PUSH_WEBHOOK_SECRET');
  if (!expectedSecret) {
    console.error('PUSH_WEBHOOK_SECRET não configurado');
    throw new PublicSecurityError(503, 'PUSH_WEBHOOK_NOT_CONFIGURED');
  }

  const providedSecret = req.headers.get('x-webhook-secret') || '';
  const [providedHash, expectedHash] = await Promise.all([
    sha256(providedSecret),
    sha256(expectedSecret),
  ]);
  if (!providedSecret || providedHash !== expectedHash) {
    throw new PublicSecurityError(401, 'UNAUTHORIZED');
  }
}

function decodeServiceAccount(): FirebaseServiceAccount {
  const encoded = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_BASE64');
  if (!encoded) throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 não configurado');

  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  const parsed = JSON.parse(new TextDecoder().decode(bytes)) as FirebaseServiceAccount;

  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error('Conta de serviço Firebase incompleta');
  }
  return parsed;
}

async function getFirebaseAccessToken(serviceAccount: FirebaseServiceAccount): Promise<string> {
  const tokenUri = serviceAccount.token_uri || DEFAULT_TOKEN_URI;
  const privateKey = await importPKCS8(serviceAccount.private_key, 'RS256');
  const now = Math.floor(Date.now() / 1000);

  const assertion = await new SignJWT({ scope: FIREBASE_SCOPE })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(serviceAccount.client_email)
    .setSubject(serviceAccount.client_email)
    .setAudience(tokenUri)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const tokenResponse = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const tokenPayload = await tokenResponse.json() as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenResponse.ok || !tokenPayload.access_token) {
    throw new Error(tokenPayload.error_description || tokenPayload.error || 'Falha ao autenticar no Firebase');
  }

  return tokenPayload.access_token;
}

function preferenceForType(type: string): keyof Pick<NotificationPreferences,
  'oracao' | 'mensagens' | 'dupla_semanal' | 'tesouro' | 'ebd' | 'comunidade'> {
  if (type === 'nova_mensagem') return 'mensagens';
  if ([
    'convite_oracao', 'convite_aceito', 'convite_recusado', 'convite_expirado',
    'mao_levantada', 'mao_aceita', 'orando_com', 'acompanhamento_oracao',
    'pedido_oracao_acolhido', 'intercessao_confirmada',
  ].includes(type)) return 'oracao';
  if ([
    'loja_pedido_aprovado', 'loja_pedido_rejeitado', 'loja_pedido_disponivel',
    'loja_pedido_entregue', 'estoque_baixo',
  ].includes(type)) return 'tesouro';
  if (['nova_licao', 'lembrete_ebd', 'ebd_publicada'].includes(type)) return 'ebd';
  if (['nova_dupla_semanal', 'dupla_semanal', 'sorteio_circulo'].includes(type)) return 'dupla_semanal';
  return 'comunidade';
}

function timeToMinutes(value: string): number {
  const [hour, minute] = value.slice(0, 5).split(':').map(Number);
  return (hour || 0) * 60 + (minute || 0);
}

function isQuietTime(preferences: NotificationPreferences, now = new Date()): boolean {
  if (!preferences.silencio_ativo) return false;
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: preferences.fuso_horario || 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const current = Number(parts.find(part => part.type === 'hour')?.value || 0) * 60
    + Number(parts.find(part => part.type === 'minute')?.value || 0);
  const start = timeToMinutes(preferences.silencio_inicio);
  const end = timeToMinutes(preferences.silencio_fim);
  return start === end || (start < end ? current >= start && current < end : current >= start || current < end);
}

function pushData(record: AppNotificationRecord): Record<string, string> {
  return {
    notification_id: record.id,
    tipo: record.tipo,
    url: record.url || '/',
    evento_chave: record.evento_chave || record.id,
    dados_json: JSON.stringify(record.dados || {}),
  };
}

function fcmErrorCode(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const error = (payload as { error?: { details?: unknown[]; status?: string } }).error;
  if (!error) return null;

  for (const detail of error.details || []) {
    if (!detail || typeof detail !== 'object') continue;
    const code = (detail as { errorCode?: string }).errorCode;
    if (code) return code;
  }
  return error.status || null;
}

async function sendFcm(
  projectId: string,
  accessToken: string,
  token: string,
  record: AppNotificationRecord,
  unreadCount: number,
): Promise<{ ok: boolean; messageName?: string; error?: string; errorCode?: string | null }> {
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          notification: {
            title: record.titulo,
            body: record.corpo,
          },
          data: pushData(record),
          android: {
            priority: 'high',
            notification: {
              color: '#7C3AED',
              sound: 'default',
              tag: record.evento_chave || record.id,
              default_vibrate_timings: true,
              notification_count: Math.max(1, unreadCount),
              visibility: 'PUBLIC',
            },
          },
        },
      }),
    },
  );

  const payload = await response.json().catch(() => ({})) as { name?: string; error?: unknown };
  if (response.ok) return { ok: true, messageName: payload.name };

  return {
    ok: false,
    error: JSON.stringify(payload).slice(0, 1500),
    errorCode: fcmErrorCode(payload),
  };
}

Deno.serve(async req => {
  const security = createSecurityRequestContext(req);
  if (req.method === 'OPTIONS') return security.preflight();

  try {
    enforceRequestBasics(req);
    await assertAuthorizedWebhook(req);
    const payload = await readJsonObject(req, 64 * 1024) as unknown as DatabaseWebhookPayload;
    if (
      payload.type !== 'INSERT'
      || payload.schema !== 'public'
      || payload.table !== 'app_notificacoes'
      || !payload.record?.id
    ) {
      return security.json({ ignored: true, reason: 'EVENTO_NAO_SUPORTADO' });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Configuração Supabase incompleta');

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const record = payload.record;

    const [
      { data: devices, error: devicesError },
      { count: unreadCount, error: countError },
      { data: preferences, error: preferencesError },
    ] = await Promise.all([
      admin
        .from('push_dispositivos')
        .select('id, token_fcm')
        .eq('usuario_id', record.usuario_id)
        .eq('ativo', true),
      admin
        .from('app_notificacoes')
        .select('id', { count: 'exact', head: true })
        .eq('usuario_id', record.usuario_id)
        .eq('lida', false),
      admin
        .from('notificacao_preferencias')
        .select('oracao,mensagens,dupla_semanal,tesouro,ebd,comunidade,silencio_ativo,silencio_inicio,silencio_fim,fuso_horario')
        .eq('usuario_id', record.usuario_id)
        .maybeSingle<NotificationPreferences>(),
    ]);

    if (devicesError) throw devicesError;
    if (countError) throw countError;
    if (preferencesError) throw preferencesError;
    if (preferences && !preferences[preferenceForType(record.tipo)]) {
      return security.json({ sent: 0, skipped: 0, message: 'CATEGORIA_DESATIVADA' });
    }
    if (preferences && isQuietTime(preferences)) {
      return security.json({ sent: 0, skipped: 0, message: 'HORARIO_SILENCIOSO' });
    }
    if (!devices?.length) return security.json({ sent: 0, skipped: 0, message: 'SEM_DISPOSITIVOS' });

    const serviceAccount = decodeServiceAccount();
    const accessToken = await getFirebaseAccessToken(serviceAccount);
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const device of devices as PushDevice[]) {
      const { data: delivery, error: claimError } = await admin
        .from('push_entregas')
        .insert({
          notificacao_id: record.id,
          dispositivo_id: device.id,
          status: 'processando',
        })
        .select('id')
        .maybeSingle<{ id: string }>();

      if (claimError?.code === '23505') {
        skipped += 1;
        continue;
      }
      if (claimError || !delivery) {
        failed += 1;
        continue;
      }

      const result = await sendFcm(
        serviceAccount.project_id,
        accessToken,
        device.token_fcm,
        record,
        unreadCount || 1,
      );

      if (result.ok) {
        sent += 1;
        await admin
          .from('push_entregas')
          .update({
            status: 'enviado',
            fcm_message_name: result.messageName || null,
            atualizado_em: new Date().toISOString(),
          })
          .eq('id', delivery.id);
        continue;
      }

      failed += 1;
      await admin
        .from('push_entregas')
        .update({
          status: 'falhou',
          ultimo_erro: result.error || 'FCM_ERROR',
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', delivery.id);

      if (['UNREGISTERED', 'NOT_FOUND', 'SENDER_ID_MISMATCH'].includes(result.errorCode || '')) {
        await admin
          .from('push_dispositivos')
          .update({ ativo: false, atualizado_em: new Date().toISOString() })
          .eq('id', device.id);
      }
    }

    return security.json({ sent, failed, skipped });
  } catch (error) {
    return safeErrorResponse(security, error);
  }
});
