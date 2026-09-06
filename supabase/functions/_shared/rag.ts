import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export type RagScope = 'global' | 'ebd' | 'estudos' | 'oracao' | 'mural' | 'formacao' | 'administrativo';

export type RagResult = {
  chunk_id: number;
  fonte_id: string;
  fonte_titulo: string;
  escopo: RagScope;
  categoria: string;
  chunk_index: number;
  conteudo: string;
  metadata: Record<string, unknown>;
  similaridade_semantica: number;
  relevancia_lexical: number;
  score_final: number;
};

export type RagSearchOptions = {
  scopes?: RagScope[];
  categories?: string[];
  sourceIds?: string[];
  limit?: number;
  threshold?: number;
};

const embeddingSession = new Supabase.ai.Session('gte-small');

export async function gerarEmbedding(texto: string): Promise<number[]> {
  const normalized = texto.replace(/\s+/g, ' ').trim().slice(0, 12000);
  if (!normalized) throw new Error('Consulta vazia para geração de embedding.');

  const embedding = await embeddingSession.run(normalized, {
    mean_pool: true,
    normalize: true,
  });

  const values = Array.from(embedding as ArrayLike<number>, Number);
  if (values.length !== 384) {
    throw new Error(`Embedding inválido: esperadas 384 dimensões, recebidas ${values.length}.`);
  }

  return values;
}

export async function buscarContextoRag(
  supabaseAdmin: SupabaseClient,
  consulta: string,
  options: RagSearchOptions = {},
): Promise<RagResult[]> {
  const embedding = await gerarEmbedding(consulta);
  const hasSourceFilter = Array.isArray(options.sourceIds) && options.sourceIds.length > 0;
  const { data, error } = await supabaseAdmin.rpc(
    hasSourceFilter ? 'buscar_memoria_rag_filtrada' : 'buscar_memoria_rag',
    {
    p_embedding: embedding,
    p_consulta: consulta,
    p_escopos: options.scopes ?? null,
    p_categorias: options.categories ?? null,
    ...(hasSourceFilter ? { p_fonte_ids: options.sourceIds } : {}),
    p_limite: Math.max(1, Math.min(options.limit ?? 8, 20)),
    p_threshold: options.threshold ?? 0.42,
    },
  );

  if (error) throw new Error(`Falha ao consultar a memória sistêmica: ${error.message}`);
  return (data ?? []) as RagResult[];
}

export function formatarContextoRag(results: RagResult[], maxChars = 14000): string {
  if (results.length === 0) return '';

  let used = 0;
  const parts: string[] = [];
  for (const result of results) {
    const header = `[FONTE ${result.fonte_id} · ${result.fonte_titulo} · escopo ${result.escopo} · trecho ${result.chunk_index + 1}]`;
    const body = result.conteudo.trim();
    const next = `${header}\n${body}`;
    if (used + next.length > maxChars) break;
    parts.push(next);
    used += next.length;
  }
  return parts.join('\n\n---\n\n');
}

export function resumirFontesRag(results: RagResult[]) {
  const seen = new Set<string>();
  return results.flatMap(result => {
    if (seen.has(result.fonte_id)) return [];
    seen.add(result.fonte_id);
    return [{
      id: result.fonte_id,
      title: result.fonte_titulo,
      scope: result.escopo,
      category: result.categoria,
      score: Number(result.score_final.toFixed(4)),
    }];
  });
}
