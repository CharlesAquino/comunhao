import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export type SecurityOutcome = 'allowed' | 'denied' | 'failed' | 'blocked';

export type RateLimitResult = {
  allowed: boolean;
  remaining: number | null;
  retry_after_seconds: number;
  policy_enabled: boolean;
};

export type IdempotencyBeginResult = {
  state: 'acquired' | 'completed' | 'in_progress' | 'conflict';
  cached: boolean;
  response_data?: unknown;
  retry_after_seconds?: number;
};

const DEFAULT_ALLOWED_ORIGINS = [
  'capacitor://localhost',
  'https://localhost',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const BASE_SECURITY_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

export class PublicSecurityError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfterSeconds?: number;

  constructor(
    status: number,
    code: string,
    publicMessage = 'Não foi possível concluir a solicitação.',
    retryAfterSeconds?: number,
  ) {
    super(publicMessage);
    this.name = 'PublicSecurityError';
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function configuredOrigins(): Set<string> {
  const configured = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
  const publicSiteUrl = Deno.env.get('PUBLIC_SITE_URL')?.trim();
  return new Set([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...configured,
    ...(publicSiteUrl ? [publicSiteUrl] : []),
  ]);
}

function requestOrigin(req: Request): string | null {
  const origin = req.headers.get('Origin');
  return origin?.trim() || null;
}

function isLocalDevelopmentOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    const port = Number(url.port);
    // O Vite procura a próxima porta livre quando a 5173 está ocupada.
    // Limitamos essa exceção à faixa de desenvolvimento e a hosts locais/privados.
    if (url.protocol !== 'http:' || !Number.isInteger(port) || port < 5173 || port > 5199) return false;
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true;
    return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname);
  } catch {
    return false;
  }
}

export function isOriginAllowed(req: Request): boolean {
  const origin = requestOrigin(req);
  if (!origin) return true;
  return configuredOrigins().has(origin) || isLocalDevelopmentOrigin(origin);
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = requestOrigin(req);
  if (!origin || (!configuredOrigins().has(origin) && !isLocalDevelopmentOrigin(origin))) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

export type SecurityRequestContext = {
  correlationId: string;
  json: (body: unknown, status?: number, extraHeaders?: Record<string, string>) => Response;
  preflight: () => Response;
};

export function createSecurityRequestContext(req: Request): SecurityRequestContext {
  const correlationId = crypto.randomUUID();
  const commonHeaders = {
    ...BASE_SECURITY_HEADERS,
    ...corsHeaders(req),
    'X-Correlation-Id': correlationId,
  };

  return {
    correlationId,
    json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
      return new Response(JSON.stringify(body), {
        status,
        headers: { ...commonHeaders, ...extraHeaders },
      });
    },
    preflight() {
      if (!isOriginAllowed(req)) {
        return new Response(null, {
          status: 403,
          headers: {
            ...BASE_SECURITY_HEADERS,
            'X-Correlation-Id': correlationId,
          },
        });
      }
      return new Response(null, {
        status: 204,
        headers: commonHeaders,
      });
    },
  };
}

export function enforceRequestBasics(req: Request, allowedMethods: string[] = ['POST']): void {
  if (!isOriginAllowed(req)) {
    throw new PublicSecurityError(403, 'ORIGIN_NOT_ALLOWED');
  }
  if (!allowedMethods.includes(req.method)) {
    throw new PublicSecurityError(405, 'METHOD_NOT_ALLOWED');
  }
  const contentType = req.headers.get('Content-Type')?.toLowerCase() ?? '';
  if (req.method !== 'GET' && !contentType.startsWith('application/json')) {
    throw new PublicSecurityError(415, 'CONTENT_TYPE_NOT_ALLOWED');
  }
}

export async function readJsonObject(
  req: Request,
  maxBytes = 64 * 1024,
): Promise<Record<string, unknown>> {
  const declaredLength = Number(req.headers.get('Content-Length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new PublicSecurityError(413, 'PAYLOAD_TOO_LARGE');
  }

  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    throw new PublicSecurityError(413, 'PAYLOAD_TOO_LARGE');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new PublicSecurityError(400, 'INVALID_JSON');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new PublicSecurityError(400, 'JSON_OBJECT_REQUIRED');
  }
  return parsed as Record<string, unknown>;
}

export function assertAllowedKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
): void {
  const allowed = new Set(allowedKeys);
  const unexpected = Object.keys(value).filter(key => !allowed.has(key));
  if (unexpected.length > 0) {
    throw new PublicSecurityError(400, 'UNEXPECTED_FIELDS');
  }
}

export function requiredIdempotencyKey(req: Request): string {
  const key = req.headers.get('Idempotency-Key')?.trim() ?? '';
  if (key.length < 16 || key.length > 160 || !/^[A-Za-z0-9._:-]+$/.test(key)) {
    throw new PublicSecurityError(400, 'IDEMPOTENCY_KEY_REQUIRED');
  }
  return key;
}

export async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

function normalizedClientAddress(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const cloudflare = req.headers.get('cf-connecting-ip')?.trim();
  const realIp = req.headers.get('x-real-ip')?.trim();
  return forwarded || cloudflare || realIp || 'address-unavailable';
}

export async function buildRateLimitKey(
  req: Request,
  actorAuthUid: string,
  action: string,
): Promise<string> {
  const pepper = Deno.env.get('SECURITY_HASH_PEPPER')?.trim();
  const address = pepper ? normalizedClientAddress(req) : 'address-redacted';
  return sha256(`${pepper ?? 'no-pepper'}|origin|${action}|${actorAuthUid}|${address}`);
}

async function consumeSingleRateLimit(
  adminClient: SupabaseClient,
  action: string,
  keyHash: string,
): Promise<RateLimitResult> {
  const { data, error } = await adminClient.rpc('security_consume_rate_limit', {
    p_action: action,
    p_key_hash: keyHash,
  });

  if (error || !data || typeof data !== 'object') {
    console.error('security_consume_rate_limit failed', {
      action,
      code: error?.code,
    });
    throw new PublicSecurityError(503, 'SECURITY_GATE_UNAVAILABLE');
  }
  return data as RateLimitResult;
}

export async function consumeRateLimit(
  adminClient: SupabaseClient,
  req: Request,
  action: string,
  actorAuthUid: string,
): Promise<RateLimitResult> {
  // Duas barreiras: uma estável por usuário e outra por usuário + origem.
  // Variar cabeçalhos de rede não permite escapar do limite principal do ator.
  const pepper = Deno.env.get('SECURITY_HASH_PEPPER')?.trim() ?? 'no-pepper';
  const actorKey = await sha256(`${pepper}|actor|${action}|${actorAuthUid}`);
  const originKey = await buildRateLimitKey(req, actorAuthUid, action);

  const actorResult = await consumeSingleRateLimit(adminClient, action, actorKey);
  const originResult = await consumeSingleRateLimit(adminClient, action, originKey);
  const denied = [actorResult, originResult].find(result => !result.allowed);

  if (denied) {
    throw new PublicSecurityError(
      429,
      'RATE_LIMITED',
      'Muitas tentativas foram realizadas. Aguarde um pouco antes de tentar novamente.',
      Math.max(1, Number(denied.retry_after_seconds) || 60),
    );
  }

  return actorResult;
}

export async function assertCircuitClosed(
  adminClient: SupabaseClient,
  action: string,
): Promise<void> {
  const { data, error } = await adminClient.rpc('security_is_circuit_open', {
    p_action: action,
  });
  if (error || !data || typeof data !== 'object') {
    console.error('security_is_circuit_open failed', { action, code: error?.code });
    throw new PublicSecurityError(503, 'SECURITY_GATE_UNAVAILABLE');
  }
  const state = data as { open?: unknown };
  if (state.open === true) {
    throw new PublicSecurityError(
      503,
      'CIRCUIT_OPEN',
      'Esta operação está temporariamente indisponível.',
    );
  }
}

export async function beginIdempotentOperation(
  adminClient: SupabaseClient,
  actorAuthUid: string,
  action: string,
  idempotencyKey: string,
  requestHash: string,
): Promise<IdempotencyBeginResult> {
  const { data, error } = await adminClient.rpc('security_begin_idempotent_operation', {
    p_actor_auth_uid: actorAuthUid,
    p_action: action,
    p_idempotency_key: idempotencyKey,
    p_request_hash: requestHash,
    p_ttl_seconds: 86400,
  });

  if (error || !data || typeof data !== 'object') {
    console.error('security_begin_idempotent_operation failed', {
      action,
      code: error?.code,
    });
    throw new PublicSecurityError(503, 'IDEMPOTENCY_GATE_UNAVAILABLE');
  }

  const result = data as IdempotencyBeginResult;
  if (result.state === 'conflict') {
    throw new PublicSecurityError(409, 'IDEMPOTENCY_CONFLICT');
  }
  if (result.state === 'in_progress') {
    throw new PublicSecurityError(
      409,
      'IDEMPOTENCY_IN_PROGRESS',
      'Esta operação já está sendo processada.',
      Math.max(1, Number(result.retry_after_seconds) || 5),
    );
  }
  return result;
}

export async function completeIdempotentOperation(
  adminClient: SupabaseClient,
  actorAuthUid: string,
  action: string,
  idempotencyKey: string,
  responseData: unknown,
): Promise<void> {
  const { error } = await adminClient.rpc('security_complete_idempotent_operation', {
    p_actor_auth_uid: actorAuthUid,
    p_action: action,
    p_idempotency_key: idempotencyKey,
    p_response_data: responseData,
  });
  if (error) {
    console.error('security_complete_idempotent_operation failed', {
      action,
      code: error.code,
    });
  }
}

export async function failIdempotentOperation(
  adminClient: SupabaseClient,
  actorAuthUid: string,
  action: string,
  idempotencyKey: string,
  errorCode: string,
): Promise<void> {
  const { error } = await adminClient.rpc('security_fail_idempotent_operation', {
    p_actor_auth_uid: actorAuthUid,
    p_action: action,
    p_idempotency_key: idempotencyKey,
    p_error_code: errorCode,
  });
  if (error) {
    console.error('security_fail_idempotent_operation failed', {
      action,
      code: error.code,
    });
  }
}

export async function recordSecurityEvent(
  adminClient: SupabaseClient,
  input: {
    correlationId: string;
    actorAuthUid?: string | null;
    action: string;
    resourceType?: string | null;
    resourceIdHash?: string | null;
    outcome: SecurityOutcome;
    riskScore?: number;
    reasonCode?: string | null;
    metadata?: Record<string, unknown>;
    source?: string;
  },
): Promise<void> {
  const { error } = await adminClient.rpc('security_record_event', {
    p_correlation_id: input.correlationId,
    p_actor_auth_uid: input.actorAuthUid ?? null,
    p_action: input.action,
    p_resource_type: input.resourceType ?? null,
    p_resource_id_hash: input.resourceIdHash ?? null,
    p_outcome: input.outcome,
    p_risk_score: Math.max(0, Math.min(100, input.riskScore ?? 0)),
    p_reason_code: input.reasonCode ?? null,
    p_metadata: input.metadata ?? {},
    p_source: input.source ?? 'edge-function',
  });
  if (error) {
    console.error('security_record_event failed', {
      action: input.action,
      code: error.code,
    });
  }
}

export function safeErrorResponse(
  context: SecurityRequestContext,
  error: unknown,
  options?: {
    providerFallbacks?: Array<{ provider: string; model: string; reason: string }>;
  },
): Response {
  if (error instanceof PublicSecurityError) {
    const headers: Record<string, string> = {};
    if (error.retryAfterSeconds) {
      headers['Retry-After'] = String(error.retryAfterSeconds);
    }
    return context.json(
      {
        error: error.message,
        code: error.code,
        correlationId: context.correlationId,
        ...(error.retryAfterSeconds ? { retryAfterSeconds: error.retryAfterSeconds } : {}),
        ...(options?.providerFallbacks?.length ? { providerFallbacks: options.providerFallbacks } : {}),
      },
      error.status,
      headers,
    );
  }

  const safeType = error instanceof Error ? error.name : typeof error;
  console.error('Unhandled edge-function error', {
    correlationId: context.correlationId,
    type: safeType,
  });
  return context.json(
    {
      error: 'Não foi possível concluir a solicitação.',
      code: 'INTERNAL_ERROR',
      correlationId: context.correlationId,
    },
    500,
  );
}

export async function hashResourceId(value: string): Promise<string> {
  return sha256(`resource|${value}`);
}

export function withTimeoutSignal(milliseconds: number): AbortSignal {
  return AbortSignal.timeout(Math.max(1000, Math.min(milliseconds, 120000)));
}
