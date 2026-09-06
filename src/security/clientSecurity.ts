export type PublicApiErrorPayload = {
  error?: string;
  code?: string;
  correlationId?: string;
  retryAfterSeconds?: number;
  providerFallbacks?: Array<{
    provider?: string;
    model?: string;
    reason?: string;
  }>;
};

const SAFE_DEFAULT_MESSAGE = 'Não foi possível concluir a solicitação.';

const PUBLIC_CODE_MESSAGES: Record<string, string> = {
  AI_PROVIDER_FAILED: 'O provedor de IA recusou ou não conseguiu processar a solicitação.',
  AI_PROVIDER_REQUEST_INVALID: 'O provedor de IA rejeitou a configuração da solicitação.',
  AI_PROVIDER_AUTH_FAILED: 'A credencial configurada para o provedor de IA foi recusada.',
  AI_PROVIDER_MODEL_UNAVAILABLE: 'O modelo configurado não está disponível no provedor de IA.',
  AI_PROVIDER_TOKEN_LIMIT: 'A geração excedeu o limite de tokens do provedor. Tente novamente em instantes.',
  AI_PROVIDER_RATE_LIMITED: 'O provedor de IA atingiu o limite de uso. Tente novamente mais tarde.',
  AI_PROVIDER_QUOTA_EXHAUSTED: 'A cota do provedor alternativo está indisponível. Verifique os créditos e o faturamento configurados para a API.',
  AI_PROVIDER_UNAVAILABLE: 'O provedor de IA está temporariamente indisponível.',
  AI_PROVIDER_NOT_CONFIGURED: 'O provedor de IA ainda não está configurado neste ambiente.',
  AI_OUTPUT_MISSING: 'O provedor de IA não devolveu conteúdo utilizável.',
  AI_RESPONSE_INVALID_JSON: 'O provedor de IA devolveu uma resposta técnica inválida.',
  AI_OUTPUT_INVALID_JSON: 'A IA devolveu conteúdo que não pôde ser interpretado.',
  AI_OUTPUT_INVALID: 'A IA devolveu uma estrutura editorial inválida.',
  AI_BLOCK_COUNT_INVALID: 'A IA não devolveu todos os blocos editoriais selecionados.',
  AI_BLOCK_ORDER_INVALID: 'A IA devolveu os blocos em uma ordem diferente da exigida.',
  AI_BLOCK_INVALID: 'A IA devolveu um bloco editorial inválido.',
  AI_BLOCK_DEPTH_INVALID: 'A IA devolveu um bloco superficial. Gere novamente para obter o desenvolvimento editorial exigido.',
  AI_BLOCK_EDITORIAL_QUALITY_INVALID: 'A IA devolveu texto genérico ou sem exposição bíblica suficiente. O rascunho foi recusado para preservar a qualidade editorial.',
  AI_BLOCK_REQUIRED_INVALID: 'A IA devolveu um marcador obrigatório inválido.',
  AI_REQUIRED_BLOCK_FLAG_INVALID: 'A IA não marcou corretamente os blocos obrigatórios.',
  AGENT_MODE_INVALID: 'O modo solicitado para o Agente Editorial não é permitido.',
  AGENT_DRAFT_ONLY: 'O Agente Editorial só pode preparar conteúdo de lições em rascunho.',
  AGENT_AUDIT_FAILED: 'Não foi possível iniciar a auditoria do Agente Editorial.',
  EDITORIAL_VERSION_REQUIRED: 'Atualize a lição antes de pedir uma preparação pelo agente.',
  EDITORIAL_CONFLICT: 'A lição foi alterada durante a preparação. Recarregue o Estúdio e tente novamente.',
  EDITORIAL_DAY_NOT_FOUND: 'O dia editorial solicitado não foi encontrado na lição.',
  AI_DURATION_INVALID: 'A IA devolveu uma duração inválida para o conteúdo.',
  AI_TITLE_INVALID: 'A IA devolveu um título editorial inválido.',
  AI_SUBTITLE_INVALID: 'A IA devolveu um subtítulo editorial inválido.',
  AI_PURPOSE_INVALID: 'A IA devolveu um propósito editorial inválido.',
  RAG_SOURCE_SELECTION_REQUIRED: 'Vincule pelo menos uma fonte RAG oficial a este conteúdo.',
  RAG_SOURCE_SELECTION_INVALID: 'Uma fonte vinculada não está pronta ou disponível para esta geração.',
  RAG_SOURCE_LOOKUP_FAILED: 'Não foi possível validar as fontes vinculadas à lição.',
  RAG_CONTEXT_NOT_FOUND: 'As fontes vinculadas não possuem trechos suficientemente relacionados a este conteúdo.',
};

export function createIdempotencyKey(scope: string): string {
  const normalizedScope = scope.replace(/[^a-zA-Z0-9._:-]/g, '-').slice(0, 48) || 'operation';
  return `${normalizedScope}:${createRuntimeId()}`;
}

function providerFallbackSummary(payload: PublicApiErrorPayload | null | undefined): string {
  if (!Array.isArray(payload?.providerFallbacks)) return '';

  const providerLabels: Record<string, string> = {
    gemini: 'Gemini',
    cloudflare: 'Cloudflare',
    nvidia: 'NVIDIA NIM',
    groq: 'Groq',
  };
  const reasonLabels: Record<string, string> = {
    AI_PROVIDER_MODEL_UNAVAILABLE: 'modelo indisponível',
    AI_PROVIDER_AUTH_FAILED: 'credencial recusada',
    AI_PROVIDER_RATE_LIMITED: 'limite de uso',
    AI_PROVIDER_QUOTA_EXHAUSTED: 'cota indisponível',
    AI_PROVIDER_REQUEST_INVALID: 'solicitação recusada',
    AI_PROVIDER_UNAVAILABLE: 'indisponível',
  };
  const entries = payload.providerFallbacks.slice(0, 4).flatMap(item => {
    const provider = typeof item?.provider === 'string' ? item.provider.trim().toLowerCase() : '';
    const model = typeof item?.model === 'string'
      ? item.model.trim().replace(/[^a-zA-Z0-9@/._:-]/g, '').slice(0, 96)
      : '';
    const reason = typeof item?.reason === 'string' ? item.reason.trim() : '';
    if (!provider || !reason) return [];
    const label = providerLabels[provider] ?? 'Provedor';
    return [`${label}${model ? ` (${model})` : ''}: ${reasonLabels[reason] ?? 'falha na geração'}`];
  });

  return entries.length ? ` Diagnóstico: ${[...new Set(entries)].join('; ')}.` : '';
}

export function describePublicApiError(payload: PublicApiErrorPayload | null | undefined): string {
  const mappedMessage = typeof payload?.code === 'string' ? PUBLIC_CODE_MESSAGES[payload.code] : undefined;
  let message = mappedMessage ?? (typeof payload?.error === 'string' && payload.error.trim()
    ? payload.error.trim().slice(0, 240)
    : SAFE_DEFAULT_MESSAGE);
  const retryAfterSeconds = Number(payload?.retryAfterSeconds);
  if (payload?.code === 'AI_PROVIDER_RATE_LIMITED' && Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    const wait = Math.max(1, Math.ceil(retryAfterSeconds));
    message = `${message} Nova tentativa em aproximadamente ${wait} segundo${wait === 1 ? '' : 's'}.`;
  }
  message += providerFallbackSummary(payload);
  const correlationId = typeof payload?.correlationId === 'string'
    ? payload.correlationId.trim().slice(0, 80)
    : '';
  return correlationId ? `${message} Referência: ${correlationId}` : message;
}

export async function publicMessageFromFunctionError(error: unknown): Promise<string> {
  const candidate = error as { message?: unknown; context?: Response } | null;
  const context = candidate?.context;
  if (context) {
    try {
      const payload = await context.clone().json() as PublicApiErrorPayload;
      console.error('Edge Function respondeu com erro', {
        code: typeof payload.code === 'string' ? payload.code : 'UNKNOWN',
        correlationId: typeof payload.correlationId === 'string' ? payload.correlationId : null,
        providerFallbacks: Array.isArray(payload.providerFallbacks) ? payload.providerFallbacks : [],
        status: context.status,
      });
      return describePublicApiError(payload);
    } catch {
      // A resposta pública é deliberadamente neutra quando não é JSON válido.
    }
  }
  return typeof candidate?.message === 'string' && candidate.message.trim()
    ? candidate.message.trim().slice(0, 240)
    : SAFE_DEFAULT_MESSAGE;
}

export function sanitizeReason(reason: string, fallback: string): string {
  const withoutControlCharacters = Array.from(reason, character => {
    const code = character.charCodeAt(0);
    if (code === 0) return '';
    if (code <= 31 || code === 127) return ' ';
    return character;
  }).join('');
  const normalized = withoutControlCharacters
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
  return normalized.length >= 8 ? normalized : fallback;
}
import { createRuntimeId } from '../utils/createRuntimeId';
