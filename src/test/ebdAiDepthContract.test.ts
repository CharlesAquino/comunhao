import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const edgeFunction = readFileSync('supabase/functions/gerar-dia-ebd/index.ts', 'utf8');
const studio = readFileSync('src/pages/EbdStudio.tsx', 'utf8');

describe('contrato de profundidade da IA editorial EBD', () => {
  it('não limita mais todos os blocos ao resumo superficial de 120–420 caracteres', () => {
    expect(edgeFunction).not.toContain('entre 120 e 420 caracteres');
    expect(edgeFunction).toContain("text: { min: 650, max: 1400 }");
    expect(edgeFunction).toContain("scripture: { min: 500, max: 1300 }");
    expect(edgeFunction).toContain("character: { min: 150, max: 560 }");
  });

  it('mantém personagem, missão, oração e quiz como blocos breves de aplicação', () => {
    expect(edgeFunction).toContain("mission: { min: 60, max: 260 }");
    expect(edgeFunction).toContain("prayer: { min: 50, max: 220 }");
    expect(edgeFunction).toContain("quiz: { min: 20, max: 180 }");
    expect(edgeFunction).toContain('Quiz usa o content apenas como introdução curta');
  });

  it('rejeita saída da IA que não atinge o desenvolvimento mínimo do tipo', () => {
    expect(edgeFunction).toContain('throw new BlockDepthValidationError(type, generated.length, limits.min)');
    expect(edgeFunction).toContain('Não produza resumos superficiais.');
    expect(edgeFunction).toContain('explicação sustentada pelo RAG');
  });

  it('rejeita prosa genérica mesmo quando ela alcança o tamanho mínimo', () => {
    expect(edgeFunction).toContain('class BlockEditorialQualityError');
    expect(edgeFunction).toContain("'AI_BLOCK_EDITORIAL_QUALITY_INVALID'");
    expect(edgeFunction).toContain("'GENERIC_CONVERSATIONAL_FILLER'");
    expect(edgeFunction).toContain("'RHETORICAL_QUESTIONS_IN_EXPOSITION'");
    expect(edgeFunction).toContain("'SCRIPTURE_REFERENCE_REQUIRED'");
    expect(edgeFunction).toContain("'TIMELINE_SEQUENCE_REQUIRED'");
    expect(edgeFunction).toContain('validateBlockEditorialQuality(type, content, reference)');
    expect(edgeFunction).toContain('A qualidade é mais importante que preencher espaço');
    expect(edgeFunction).toContain('qualquer frase que poderia servir para uma lição diferente');
  });

  it('repara o bloco superficial em todos os provedores sem reduzir o limite editorial', () => {
    expect(edgeFunction).toContain('error instanceof BlockDepthValidationError');
    expect(edgeFunction).toContain('Todos os provedores do carrossel usam o mesmo contrato editorial.');
    expect(edgeFunction).not.toContain("!['gemini', 'cloudflare'].includes(candidate.provider)");
    expect(edgeFunction).toContain('AI targeted editorial repair activated');
    expect(edgeFunction).toContain('REPARO EDITORIAL CIRÚRGICO');
    expect(edgeFunction).toContain('selectedBlockTypes: [blockNeedingRepair.blockType]');
    expect(edgeFunction).toContain('replaceGeneratedBlock(');
    expect(edgeFunction).toContain('const maxBlockRepairs = 3');
    expect(edgeFunction).toContain('Math.min(5600, maxCompletionTokens + 1800)');
    expect(edgeFunction).toContain('enforceSingleBlockContentBounds = false');
    expect(edgeFunction).toContain('minLength: singleBlockLimits.min');
    expect(edgeFunction).toContain('AI freeform editorial recovery activated');
    expect(edgeFunction).toContain('requestFreeformBlockContent(');
    expect(edgeFunction).toContain('extractEditorialContentFromFreeformResponse(');
    expect(edgeFunction).toContain("'AI_FREEFORM_OUTPUT_INVALID'");
    expect(edgeFunction).toContain('FREEFORM_RECOVERY_BLOCK_TYPES');
    expect(edgeFunction).toContain('Responda somente com o corpo editorial solicitado');
  });

  it('mantém o RAG e a validação de profundidade ao trocar de provedor', () => {
    expect(edgeFunction).toContain("provider: 'gemini' as const");
    expect(edgeFunction).toContain("provider: 'cloudflare' as const");
    expect(edgeFunction).toContain("provider: 'nvidia' as const");
    expect(edgeFunction).toContain("provider: 'groq' as const");
    expect(edgeFunction).toContain("Deno.env.get('GEMINI_API_KEY')");
    expect(edgeFunction).toContain("'x-goog-api-key': candidate.apiKey");
    expect(edgeFunction).toContain("responseMimeType: 'application/json'");
    expect(edgeFunction).toContain('responseJsonSchema: schema');
    expect(edgeFunction).toContain('@cf/meta/llama-3.3-70b-instruct-fp8-fast');
    expect(edgeFunction).not.toContain("provider: 'openai' as const");
    expect(edgeFunction).toContain('generatedDay = validateGeneratedDay(parsedOutput, authoritativeInput)');
    expect(edgeFunction).toContain("model: 'openai/gpt-oss-20b'");
    expect(edgeFunction).toContain("'https://integrate.api.nvidia.com/v1/chat/completions'");
    expect(edgeFunction).toContain("Deno.env.get('NVIDIA_API_KEY')");
    expect(edgeFunction).toContain("prompt_version: 'ebd-day-v14-gemini-primary-multi-provider-depth-recovery'");
    expect(edgeFunction).toContain('completionTokenBudget(authoritativeInput.selectedBlockTypes)');
    expect(edgeFunction).toContain('diagnosticProviderError ??');
    expect(edgeFunction).toContain("'AI_PROVIDER_AUTH_FAILED'");
    expect(edgeFunction).toContain("'AI_PROVIDER_REQUEST_INVALID'");
    expect(edgeFunction).toContain('providerFallbacks');
    expect(edgeFunction).toContain('parseStructuredOutput(');
  });

  it('mantém o Agente Editorial limitado a rascunho, com contexto e auditoria', () => {
    expect(edgeFunction).toContain("mode: 'manual' | 'prepare_day'");
    expect(edgeFunction).toContain("'AGENT_DRAFT_ONLY'");
    expect(edgeFunction).toContain("'EDITORIAL_CONFLICT'");
    expect(edgeFunction).toContain(".from('ebd_agent_runs')");
    expect(edgeFunction).toContain("status: 'draft_ready'");
    expect(edgeFunction).toContain('mergeAgentGeneratedDay(');
    expect(edgeFunction).toContain("eq('status', 'draft')");
    expect(studio).toContain('Preparar dia com agente');
    expect(studio).toContain('Autonomia: somente rascunho · Publicação: sempre humana');
  });

  it('mantém o preview legível e mostra o conteúdo completo para revisão', () => {
    expect(studio).toContain('max-w-2xl');
    expect(studio).toContain('scrollbar-hidden');
    expect(studio).toContain('whitespace-pre-line text-base leading-7');
    expect(studio).not.toContain('line-clamp-4 whitespace-pre-line text-xs');
  });
});
