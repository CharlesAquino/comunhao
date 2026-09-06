import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  assertAllowedKeys,
  createSecurityRequestContext,
  enforceRequestBasics,
  readJsonObject,
  safeErrorResponse,
} from '../_shared/security.ts';

const RESERVED_USERNAMES = new Set([
  'admin', 'administrador', 'professor', 'suporte', 'comunhao',
  'oracao', 'pastor', 'sistema', 'moderador', 'guardiao',
]);

Deno.serve(async req => {
  const security = createSecurityRequestContext(req);
  if (req.method === 'OPTIONS') return security.preflight();

  try {
    enforceRequestBasics(req);
    const body = await readJsonObject(req, 4 * 1024);
    assertAllowedKeys(body, ['username']);
    const normalized = typeof body.username === 'string'
      ? body.username.trim().toLowerCase().replace(/[^a-z0-9._]/g, '')
      : '';
    const rawNormalized = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    const valid = rawNormalized === normalized && /^[a-z][a-z0-9._]{3,23}$/.test(normalized);
    if (!valid) return security.json({ available: false, reason: 'invalid' });
    if (RESERVED_USERNAMES.has(normalized)) {
      return security.json({ available: false, reason: 'reserved' });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data, error } = await admin
      .from('usuarios')
      .select('id')
      .eq('username_normalizado', normalized)
      .maybeSingle();
    if (error) throw error;

    return security.json({ available: !data });
  } catch (error) {
    return safeErrorResponse(security, error);
  }
});
