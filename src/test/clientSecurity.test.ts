import { describe, expect, it, vi } from 'vitest';
import {
  createIdempotencyKey,
  describePublicApiError,
  publicMessageFromFunctionError,
  sanitizeReason,
} from '../security/clientSecurity';

describe('clientSecurity', () => {
  it('creates unique idempotency keys with a sanitized scope', () => {
    vi.stubGlobal('crypto', { randomUUID: vi.fn()
      .mockReturnValueOnce('11111111-1111-4111-8111-111111111111')
      .mockReturnValueOnce('22222222-2222-4222-8222-222222222222') });

    const first = createIdempotencyKey('ebd publish');
    const second = createIdempotencyKey('ebd publish');

    expect(first).toBe('ebd-publish:11111111-1111-4111-8111-111111111111');
    expect(second).not.toBe(first);
  });

  it('does not expose an unbounded server message', () => {
    const message = describePublicApiError({
      error: 'x'.repeat(1000),
      correlationId: 'sec-123',
    });
    expect(message.length).toBeLessThan(340);
    expect(message).toContain('Referência: sec-123');
  });

  it('normalizes administrative reasons', () => {
    expect(sanitizeReason('  revisão\u0000   aprovada  ', 'fallback'))
      .toBe('revisão aprovada');
    expect(sanitizeReason('curto', 'motivo padrão seguro'))
      .toBe('motivo padrão seguro');
  });

  it('extracts the public message from an edge function response', async () => {
    const response = new Response(JSON.stringify({
      error: 'Aguarde antes de tentar novamente.',
      correlationId: 'abc-123',
    }), { headers: { 'Content-Type': 'application/json' } });

    await expect(publicMessageFromFunctionError({ context: response }))
      .resolves.toBe('Aguarde antes de tentar novamente. Referência: abc-123');
  });

  it('explica quando a lição não possui fonte RAG vinculada', () => {
    expect(describePublicApiError({ code: 'RAG_SOURCE_SELECTION_REQUIRED' }))
      .toContain('Vincule pelo menos uma fonte RAG oficial');
  });

  it('informa o tempo aproximado quando todos os provedores atingem o limite', () => {
    expect(describePublicApiError({
      code: 'AI_PROVIDER_RATE_LIMITED',
      retryAfterSeconds: 42,
    })).toContain('Nova tentativa em aproximadamente 42 segundos');
  });

  it('mostra ao editor apenas o diagnóstico seguro dos provedores que falharam', () => {
    expect(describePublicApiError({
      code: 'AI_PROVIDER_MODEL_UNAVAILABLE',
      providerFallbacks: [
        { provider: 'gemini', model: 'gemini-2.5-flash', reason: 'AI_PROVIDER_MODEL_UNAVAILABLE' },
        { provider: 'cloudflare', model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', reason: 'AI_PROVIDER_RATE_LIMITED' },
      ],
    })).toContain('Gemini (gemini-2.5-flash): modelo indisponível; Cloudflare (@cf/meta/llama-3.3-70b-instruct-fp8-fast): limite de uso');
  });
});
