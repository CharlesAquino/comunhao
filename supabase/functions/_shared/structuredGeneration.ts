import { PublicSecurityError, withTimeoutSignal } from './security.ts';

type AiProvider = 'cloudflare' | 'nvidia' | 'gemini' | 'groq';
type Candidate = { provider: AiProvider; apiKey: string; model: string; endpoint: string };
export type ProviderFallback = { provider: AiProvider; model: string; reason: string };

type StructuredGenerationInput = {
  schemaName: string;
  schema: Record<string, unknown>;
  prompt: string;
  systemPrompt: string;
  retrySystemPrompt?: string;
  maxCompletionTokens?: number;
};

export type StructuredGenerationResult = {
  output: unknown;
  model: string;
  provider: AiProvider;
  attempts: number;
  inputTokens: number;
  outputTokens: number;
  fallbacks: ProviderFallback[];
};

export class StructuredGenerationError extends PublicSecurityError {
  constructor(
    status: number,
    code: string,
    readonly providerFallbacks: ProviderFallback[],
  ) {
    super(status, code);
  }
}

function configuredCandidates(): Candidate[] {
  const cloudflareAccountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')?.trim();
  const cloudflareKey = Deno.env.get('CLOUDFLARE_API_TOKEN')?.trim();
  const cloudflareModel = Deno.env.get('CLOUDFLARE_AI_MODEL')?.trim() || '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
  const nvidiaKey = Deno.env.get('NVIDIA_API_KEY')?.trim();
  const nvidiaModel = Deno.env.get('NVIDIA_AI_MODEL')?.trim() || 'deepseek-ai/deepseek-v4-pro-0813';
  const geminiKey = Deno.env.get('GEMINI_API_KEY')?.trim();
  const geminiModel = Deno.env.get('GEMINI_MODEL')?.trim() || 'gemini-2.5-flash';
  const groqKey = Deno.env.get('GROQ_API_KEY')?.trim();
  const groqModel = Deno.env.get('GROQ_MODEL')?.trim() || 'openai/gpt-oss-120b';
  const candidates: Candidate[] = [];

  if (cloudflareKey && cloudflareAccountId && /^[a-f0-9]{32}$/i.test(cloudflareAccountId)) {
    candidates.push({ provider: 'cloudflare', apiKey: cloudflareKey, model: cloudflareModel, endpoint: `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/run/${cloudflareModel}` });
  }
  if (nvidiaKey && /^[a-z0-9][a-z0-9._/-]{1,160}$/i.test(nvidiaModel)) {
    candidates.push({ provider: 'nvidia', apiKey: nvidiaKey, model: nvidiaModel, endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions' });
  }
  if (geminiKey && /^[a-z0-9][a-z0-9._-]{1,127}$/i.test(geminiModel)) {
    candidates.push({ provider: 'gemini', apiKey: geminiKey, model: geminiModel, endpoint: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent` });
  }
  if (groqKey) {
    candidates.push({ provider: 'groq', apiKey: groqKey, model: groqModel, endpoint: 'https://api.groq.com/openai/v1/chat/completions' });
    if (groqModel !== 'openai/gpt-oss-20b') candidates.push({ provider: 'groq', apiKey: groqKey, model: 'openai/gpt-oss-20b', endpoint: 'https://api.groq.com/openai/v1/chat/completions' });
  }
  return candidates;
}

export function getStructuredGenerationInitialModel(): string {
  return configuredCandidates()[0]?.model ?? 'unconfigured';
}

function headers(candidate: Candidate): Record<string, string> {
  return candidate.provider === 'gemini'
    ? { 'x-goog-api-key': candidate.apiKey, 'Content-Type': 'application/json' }
    : { Authorization: `Bearer ${candidate.apiKey}`, 'Content-Type': 'application/json' };
}

function providerError(payload: Record<string, unknown>): Record<string, unknown> {
  const cloudflareErrors = Array.isArray(payload.errors) ? payload.errors : [];
  if (cloudflareErrors[0] && typeof cloudflareErrors[0] === 'object') return cloudflareErrors[0] as Record<string, unknown>;
  return payload.error && typeof payload.error === 'object' ? payload.error as Record<string, unknown> : {};
}

function textFromPayload(candidate: Candidate, payload: Record<string, unknown>): string {
  if (candidate.provider === 'gemini') {
    const part = Array.isArray(payload.candidates)
      ? (payload.candidates[0] as { content?: { parts?: Array<{ text?: unknown }> } } | undefined)?.content?.parts?.[0]
      : null;
    if (typeof part?.text === 'string' && part.text.trim()) return part.text;
  }
  if (candidate.provider === 'cloudflare') {
    const response = payload.result && typeof payload.result === 'object'
      ? (payload.result as Record<string, unknown>).response
      : null;
    if (typeof response === 'string' && response.trim()) return response;
    if (response && typeof response === 'object') return JSON.stringify(response);
  }
  const choice = Array.isArray(payload.choices) ? payload.choices[0] : null;
  const content = choice && typeof choice === 'object'
    ? ((choice as { message?: { content?: unknown } }).message?.content)
    : null;
  if (typeof content === 'string' && content.trim()) return content;
  throw new PublicSecurityError(502, 'AI_OUTPUT_MISSING');
}

function parseJson(text: string): unknown {
  let candidate = text.trim();
  if (candidate.startsWith('```')) candidate = candidate.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try { return JSON.parse(candidate); } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { return JSON.parse(candidate.slice(start, end + 1)); } catch { /* validated below */ }
    }
    throw new PublicSecurityError(502, 'AI_OUTPUT_INVALID_JSON');
  }
}

function publicProviderError(response: Response, payload: Record<string, unknown>): PublicSecurityError {
  const error = providerError(payload);
  const code = typeof error.code === 'string' ? error.code.toLowerCase() : '';
  if (response.status === 401 || response.status === 403) return new PublicSecurityError(502, 'AI_PROVIDER_AUTH_FAILED');
  if (response.status === 404) return new PublicSecurityError(502, 'AI_PROVIDER_MODEL_UNAVAILABLE');
  if (response.status === 413) return new PublicSecurityError(502, 'AI_PROVIDER_TOKEN_LIMIT');
  if (response.status === 429) return new PublicSecurityError(429, ['insufficient_quota', 'billing_hard_limit_reached', 'quota_exceeded'].includes(code) ? 'AI_PROVIDER_QUOTA_EXHAUSTED' : 'AI_PROVIDER_RATE_LIMITED');
  if (response.status === 400 || response.status === 422 || payload.success === false) return new PublicSecurityError(502, 'AI_PROVIDER_REQUEST_INVALID');
  return new PublicSecurityError(502, 'AI_PROVIDER_UNAVAILABLE');
}

async function requestCandidate(candidate: Candidate, input: StructuredGenerationInput): Promise<{ output: unknown; attempts: number; inputTokens: number; outputTokens: number }> {
  const maxTokens = Math.max(800, Math.min(input.maxCompletionTokens ?? 3600, candidate.provider === 'cloudflare' ? 5600 : 5000));
  let attempts = 0;
  for (let retry = 0; retry < 2; retry += 1) {
    attempts += 1;
    const system = retry === 0 ? input.systemPrompt : input.retrySystemPrompt ?? input.systemPrompt;
    const messages = [{ role: 'system', content: system }, { role: 'user', content: input.prompt }];
    const body: Record<string, unknown> = candidate.provider === 'gemini'
      ? { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: input.prompt }] }], generationConfig: { maxOutputTokens: maxTokens, temperature: retry === 0 ? 0.3 : 0.1, responseMimeType: 'application/json', responseJsonSchema: input.schema } }
      : candidate.provider === 'cloudflare'
      ? { messages, max_tokens: maxTokens, temperature: retry === 0 ? 0.3 : 0.1, response_format: { type: 'json_schema', json_schema: input.schema } }
      : candidate.provider === 'nvidia'
      ? { model: candidate.model, messages, max_tokens: maxTokens, temperature: retry === 0 ? 0.3 : 0.1, top_p: 0.95, chat_template_kwargs: { thinking: false }, response_format: { type: 'json_object' } }
      : { model: candidate.model, messages, max_completion_tokens: maxTokens, reasoning_effort: 'low', temperature: retry === 0 ? 0.3 : 0.1, response_format: { type: 'json_schema', json_schema: { name: input.schemaName, strict: true, schema: input.schema } } };
    const response = await fetch(candidate.endpoint, { method: 'POST', headers: headers(candidate), signal: withTimeoutSignal(75_000), body: JSON.stringify(body) });
    const raw = await response.text();
    if (raw.length > 1_500_000) throw new PublicSecurityError(502, 'AI_RESPONSE_TOO_LARGE');
    let payload: Record<string, unknown>;
    try { payload = JSON.parse(raw) as Record<string, unknown>; } catch { throw new PublicSecurityError(502, 'AI_RESPONSE_INVALID_JSON'); }
    if (!response.ok || (candidate.provider === 'cloudflare' && payload.success === false)) throw publicProviderError(response, payload);
    try {
      const usageSource = payload.usageMetadata ?? payload.usage ?? (payload.result && typeof payload.result === 'object' ? (payload.result as Record<string, unknown>).usage : {});
      const usage = usageSource && typeof usageSource === 'object' ? usageSource as Record<string, unknown> : {};
      return { output: parseJson(textFromPayload(candidate, payload)), attempts, inputTokens: Number(usage.prompt_tokens || usage.input_tokens || usage.promptTokenCount || 0), outputTokens: Number(usage.completion_tokens || usage.output_tokens || usage.candidatesTokenCount || 0) };
    } catch (error) {
      if (retry === 0 && error instanceof PublicSecurityError && ['AI_OUTPUT_INVALID_JSON', 'AI_OUTPUT_MISSING'].includes(error.code)) continue;
      throw error;
    }
  }
  throw new PublicSecurityError(502, 'AI_OUTPUT_INVALID_JSON');
}

export async function generateStructuredJson(input: StructuredGenerationInput): Promise<StructuredGenerationResult> {
  const candidates = configuredCandidates();
  if (!candidates.length) throw new PublicSecurityError(503, 'AI_PROVIDER_NOT_CONFIGURED');
  const fallbacks: ProviderFallback[] = [];
  let lastError: PublicSecurityError | null = null;
  for (const candidate of candidates) {
    try {
      const result = await requestCandidate(candidate, input);
      return { ...result, model: candidate.model, provider: candidate.provider, fallbacks };
    } catch (error) {
      const normalized = error instanceof PublicSecurityError ? error : new PublicSecurityError(502, 'AI_PROVIDER_UNAVAILABLE');
      lastError = normalized;
      fallbacks.push({ provider: candidate.provider, model: candidate.model, reason: normalized.code });
    }
  }
  throw new StructuredGenerationError(lastError?.status ?? 502, lastError?.code ?? 'AI_PROVIDER_UNAVAILABLE', fallbacks);
}
