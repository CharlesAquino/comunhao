import { createClient } from 'jsr:@supabase/supabase-js@2';
import { AccessToken } from 'npm:livekit-server-sdk@2';
import {
  PublicSecurityError,
  assertAllowedKeys,
  createSecurityRequestContext,
  enforceRequestBasics,
  readJsonObject,
  safeErrorResponse,
} from '../_shared/security.ts';

Deno.serve(async req => {
  const security = createSecurityRequestContext(req);
  if (req.method === 'OPTIONS') return security.preflight();

  try {
    enforceRequestBasics(req);
    const body = await readJsonObject(req, 4 * 1024);
    assertAllowedKeys(body, ['salaId']);
    if (typeof body.salaId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.salaId)) {
      throw new PublicSecurityError(400, 'ROOM_ID_REQUIRED', 'Sala inválida.');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new PublicSecurityError(401, 'AUTHENTICATION_REQUIRED', 'Não autenticado.');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new PublicSecurityError(401, 'AUTHENTICATION_REQUIRED', 'Não autenticado.');

    const { data: usuario } = await admin
      .from('usuarios')
      .select('id, nome')
      .eq('auth_user_id', user.id)
      .maybeSingle();
    if (!usuario) throw new PublicSecurityError(403, 'PROFILE_NOT_FOUND', 'Perfil não encontrado.');

    const { data: sala } = await admin
      .from('salas_oracao')
      .select('id, host_usuario_id, livekit_room_name, status_sala')
      .eq('id', body.salaId)
      .maybeSingle();
    if (!sala) throw new PublicSecurityError(404, 'ROOM_NOT_FOUND', 'Sala não encontrada.');
    if (sala.status_sala === 'encerrada') {
      throw new PublicSecurityError(409, 'ROOM_CLOSED', 'Sala já encerrada.');
    }

    const { data: participante } = await admin
      .from('salas_oracao_participantes')
      .select('id')
      .eq('sala_id', body.salaId)
      .eq('usuario_id', usuario.id)
      .is('desconectado_em', null)
      .maybeSingle();
    if (sala.host_usuario_id !== usuario.id && !participante) {
      throw new PublicSecurityError(403, 'ROOM_ACCESS_DENIED', 'Usuário não participa desta sala.');
    }

    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
    if (!apiKey || !apiSecret) throw new PublicSecurityError(503, 'LIVEKIT_NOT_CONFIGURED');

    const token = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: usuario.nome ?? 'Jovem',
      ttl: '2h',
    });
    token.addGrant({
      room: sala.livekit_room_name,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: false,
    });

    return security.json({ token: await token.toJwt(), roomName: sala.livekit_room_name });
  } catch (error) {
    return safeErrorResponse(security, error);
  }
});
