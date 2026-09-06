import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { buscarContextoRag, resumirFontesRag, type RagScope } from '../_shared/rag.ts';
import {
  PublicSecurityError,
  assertAllowedKeys,
  assertCircuitClosed,
  consumeRateLimit,
  createSecurityRequestContext,
  enforceRequestBasics,
  hashResourceId,
  readJsonObject,
  recordSecurityEvent,
  safeErrorResponse,
} from '../_shared/security.ts';

const ALLOWED_SCOPES = new Set<RagScope>(['global', 'ebd']);
const MAX_QUERY_LENGTH = 1200;
const MAX_CATEGORIES = 8;
const MAX_RESULTS = 20;

Deno.serve(async req => {
  const security = createSecurityRequestContext(req);
  if (req.method === 'OPTIONS') return security.preflight();

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = req.headers.get('Authorization');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return safeErrorResponse(security, new PublicSecurityError(503, 'SERVICE_CONFIGURATION_INVALID'));
  }
  if (!authorization) {
    return safeErrorResponse(security, new PublicSecurityError(401, 'AUTH_REQUIRED', 'Sua sessão não foi encontrada.'));
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let actorAuthUid: string | null = null;

  try {
    enforceRequestBasics(req);
    await assertCircuitClosed(adminClient, 'rag.search');

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      throw new PublicSecurityError(401, 'AUTH_INVALID', 'Sua sessão expirou. Entre novamente.');
    }
    actorAuthUid = authData.user.id;

    const { data: allowed, error: permissionError } = await userClient.rpc('admin_tem_permissao', {
      p_permission: 'knowledge.read',
    });
    if (permissionError) throw new PublicSecurityError(503, 'PERMISSION_GATE_UNAVAILABLE');
    if (!allowed) {
      await recordSecurityEvent(adminClient, {
        correlationId: security.correlationId,
        actorAuthUid,
        action: 'rag.search',
        outcome: 'denied',
        riskScore: 35,
        reasonCode: 'KNOWLEDGE_READ_REQUIRED',
      });
      throw new PublicSecurityError(403, 'FORBIDDEN');
    }

    await consumeRateLimit(adminClient, req, 'rag.search', actorAuthUid);

    const body = await readJsonObject(req, 16 * 1024);
    assertAllowedKeys(body, ['query', 'scopes', 'categories', 'limit', 'threshold']);

    const query = typeof body.query === 'string'
      ? body.query.split(String.fromCharCode(0)).join('').trim().slice(0, MAX_QUERY_LENGTH)
      : '';
    if (query.length < 3) {
      throw new PublicSecurityError(400, 'QUERY_TOO_SHORT', 'Digite uma consulta com pelo menos três caracteres.');
    }

    const scopes = Array.isArray(body.scopes)
      ? body.scopes
          .filter((item): item is RagScope => typeof item === 'string' && ALLOWED_SCOPES.has(item as RagScope))
          .slice(0, ALLOWED_SCOPES.size)
      : undefined;

    const categories = Array.isArray(body.categories)
      ? body.categories
          .filter((item): item is string => typeof item === 'string')
          .map(item => item.trim().slice(0, 80))
          .filter(Boolean)
          .slice(0, MAX_CATEGORIES)
      : undefined;

    const requestedLimit = Number(body.limit);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(MAX_RESULTS, Math.trunc(requestedLimit)))
      : 8;

    const requestedThreshold = Number(body.threshold);
    const threshold = Number.isFinite(requestedThreshold)
      ? Math.max(0.1, Math.min(0.95, requestedThreshold))
      : 0.42;

    const results = await buscarContextoRag(adminClient, query, {
      scopes,
      categories,
      limit,
      threshold,
    });

    await recordSecurityEvent(adminClient, {
      correlationId: security.correlationId,
      actorAuthUid,
      action: 'rag.search',
      resourceType: 'rag_query',
      resourceIdHash: await hashResourceId(query),
      outcome: 'allowed',
      metadata: { resultCount: results.length, limit },
    });

    return security.json({
      query,
      results,
      sources: resumirFontesRag(results),
      count: results.length,
      embeddingModel: 'gte-small',
      correlationId: security.correlationId,
    });
  } catch (error) {
    const reasonCode = error instanceof PublicSecurityError ? error.code : 'UNHANDLED_ERROR';
    if (actorAuthUid) {
      await recordSecurityEvent(adminClient, {
        correlationId: security.correlationId,
        actorAuthUid,
        action: 'rag.search',
        outcome: error instanceof PublicSecurityError && error.status === 429 ? 'blocked' : 'failed',
        riskScore: error instanceof PublicSecurityError && error.status === 429 ? 55 : 20,
        reasonCode,
      });
    }
    return safeErrorResponse(security, error);
  }
});
