import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { Buffer } from 'node:buffer';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import mammoth from 'mammoth';
import { extractText, getDocumentProxy } from 'unpdf';
import {
  PublicSecurityError,
  assertAllowedKeys,
  assertCircuitClosed,
  beginIdempotentOperation,
  completeIdempotentOperation,
  consumeRateLimit,
  createSecurityRequestContext,
  enforceRequestBasics,
  failIdempotentOperation,
  hashResourceId,
  readJsonObject,
  recordSecurityEvent,
  requiredIdempotencyKey,
  safeErrorResponse,
  sha256,
} from '../_shared/security.ts';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_SOURCE_CHARS = 180_000;
const MAX_CHUNKS = 120;
const CHUNK_TARGET = 1_650;
const CHUNK_OVERLAP = 260;
const EXTRACTION_TIMEOUT_MS = 45_000;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/html',
  'application/json',
]);

type KnowledgeSource = {
  id: string;
  titulo: string;
  descricao: string;
  escopo: string;
  categoria: string;
  tags: string[];
  nome_arquivo: string;
  tipo_mime: string;
  storage_path: string;
  status?: string;
  atualizado_em: string;
};

const PROCESSING_LEASE_MS = 60_000;

async function gerarEmbeddingIsolado(
  supabaseUrl: string,
  serviceRoleKey: string,
  texto: string,
): Promise<number[]> {
  const response = await fetch(`${supabaseUrl}/functions/v1/gerar-embedding-rag`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ texto }),
  });

  if (!response.ok) {
    throw new PublicSecurityError(503, 'EMBEDDING_WORKER_FAILED');
  }
  const payload = await response.json() as { embedding?: unknown };
  if (!Array.isArray(payload.embedding) || payload.embedding.length !== 384) {
    throw new PublicSecurityError(503, 'EMBEDDING_WORKER_INVALID_RESPONSE');
  }
  return payload.embedding.map(Number);
}

function cleanText(value: string): string {
  return value
    .split(String.fromCharCode(0)).join('')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripHtml(value: string): string {
  return cleanText(
    value
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, ' ')
      .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, ' ')
      .replace(/<embed\b[^>]*>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'"),
  );
}

function assertFileSignature(bytes: Uint8Array, mimeType: string): void {
  if (bytes.length === 0) throw new PublicSecurityError(400, 'EMPTY_FILE');

  if (mimeType === 'application/pdf') {
    const signature = new TextDecoder().decode(bytes.slice(0, 5));
    if (signature !== '%PDF-') throw new PublicSecurityError(400, 'FILE_SIGNATURE_MISMATCH');
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const zipSignature = bytes[0] === 0x50 && bytes[1] === 0x4b;
    if (!zipSignature) throw new PublicSecurityError(400, 'FILE_SIGNATURE_MISMATCH');
  }
}

async function extractDocument(
  bytes: Uint8Array,
  mimeType: string,
): Promise<{ text: string; pages?: number }> {
  if (mimeType === 'application/pdf') {
    const pdf = await getDocumentProxy(bytes);
    if (pdf.numPages > 250) throw new PublicSecurityError(400, 'PDF_PAGE_LIMIT_EXCEEDED');
    const result = await extractText(pdf, { mergePages: true });
    return { text: cleanText(result.text), pages: result.totalPages };
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return { text: cleanText(result.value) };
  }

  const raw = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  if (mimeType === 'text/html') return { text: stripHtml(raw) };
  if (mimeType === 'application/json') {
    try {
      return { text: cleanText(JSON.stringify(JSON.parse(raw), null, 2)) };
    } catch {
      throw new PublicSecurityError(400, 'INVALID_JSON_DOCUMENT');
    }
  }
  return { text: cleanText(raw) };
}

async function withDeadline<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  let timer: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new PublicSecurityError(408, 'EXTRACTION_TIMEOUT')), milliseconds);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function chunkText(text: string): string[] {
  const paragraphs = text.split(/\n{2,}/).map(item => item.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  const pushCurrent = () => {
    const normalized = current.trim();
    if (normalized.length >= 40) chunks.push(normalized);
    current = '';
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > CHUNK_TARGET * 1.7) {
      pushCurrent();
      let start = 0;
      while (start < paragraph.length && chunks.length < MAX_CHUNKS) {
        let end = Math.min(start + CHUNK_TARGET, paragraph.length);
        if (end < paragraph.length) {
          const sentenceBreak = Math.max(
            paragraph.lastIndexOf('. ', end),
            paragraph.lastIndexOf('? ', end),
            paragraph.lastIndexOf('! ', end),
          );
          if (sentenceBreak > start + Math.floor(CHUNK_TARGET * 0.55)) end = sentenceBreak + 1;
        }
        chunks.push(paragraph.slice(start, end).trim());
        start = Math.max(end - CHUNK_OVERLAP, start + 1);
      }
      continue;
    }

    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= CHUNK_TARGET) {
      current = candidate;
    } else {
      const previousTail = current.slice(Math.max(0, current.length - CHUNK_OVERLAP));
      pushCurrent();
      current = previousTail ? `${previousTail}\n\n${paragraph}` : paragraph;
    }

    if (chunks.length >= MAX_CHUNKS) break;
  }
  pushCurrent();
  return chunks.slice(0, MAX_CHUNKS);
}

async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const output: R[] = [];
  for (let start = 0; start < items.length; start += batchSize) {
    const batch = items.slice(start, start + batchSize);
    const values = await Promise.all(batch.map((item, offset) => worker(item, start + offset)));
    output.push(...values);
  }
  return output;
}

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

  let sourceId = '';
  let actorAuthUid: string | null = null;
  let idempotencyKey = '';
  let idempotencyAcquired = false;

  try {
    enforceRequestBasics(req);
    await assertCircuitClosed(adminClient, 'rag.index');

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      throw new PublicSecurityError(401, 'AUTH_INVALID', 'Sua sessão expirou. Entre novamente.');
    }
    actorAuthUid = authData.user.id;

    const { data: allowed, error: permissionError } = await userClient.rpc('admin_tem_permissao', {
      p_permission: 'knowledge.manage',
    });
    if (permissionError) throw new PublicSecurityError(503, 'PERMISSION_GATE_UNAVAILABLE');
    if (!allowed) {
      await recordSecurityEvent(adminClient, {
        correlationId: security.correlationId,
        actorAuthUid,
        action: 'rag.index',
        outcome: 'denied',
        riskScore: 45,
        reasonCode: 'KNOWLEDGE_MANAGE_REQUIRED',
      });
      throw new PublicSecurityError(403, 'FORBIDDEN');
    }

    await consumeRateLimit(adminClient, req, 'rag.index', actorAuthUid);

    const body = await readJsonObject(req, 4 * 1024);
    assertAllowedKeys(body, ['sourceId']);
    sourceId = typeof body.sourceId === 'string' ? body.sourceId.trim() : '';
    if (!/^[0-9a-fA-F-]{36}$/.test(sourceId)) {
      throw new PublicSecurityError(400, 'SOURCE_ID_INVALID');
    }

    idempotencyKey = requiredIdempotencyKey(req);
    const requestHash = await sha256(JSON.stringify({ sourceId }));
    const idempotency = await beginIdempotentOperation(
      adminClient,
      actorAuthUid,
      'rag.index',
      idempotencyKey,
      requestHash,
    );
    if (idempotency.state === 'completed') {
      return security.json({
        ...(idempotency.response_data as Record<string, unknown>),
        cached: true,
        correlationId: security.correlationId,
      });
    }
    idempotencyAcquired = true;

    const { data: profile, error: profileError } = await adminClient
      .from('usuarios')
      .select('id')
      .eq('auth_user_id', actorAuthUid)
      .maybeSingle();
    if (profileError) throw new PublicSecurityError(503, 'PROFILE_LOOKUP_FAILED');
    if (!profile) throw new PublicSecurityError(403, 'PROFILE_REQUIRED');

    const { data: sourceData, error: sourceError } = await adminClient
      .from('plataforma_fontes_conhecimento')
      .select('id, titulo, descricao, escopo, categoria, tags, nome_arquivo, tipo_mime, storage_path, status, atualizado_em')
      .eq('id', sourceId)
      .single();
    if (sourceError || !sourceData) throw new PublicSecurityError(404, 'SOURCE_NOT_FOUND');
    const source = sourceData as KnowledgeSource;

    if (!ALLOWED_MIME_TYPES.has(source.tipo_mime)) {
      throw new PublicSecurityError(400, 'MIME_TYPE_NOT_ALLOWED');
    }
    if (!source.storage_path || source.storage_path.includes('..') || source.storage_path.startsWith('/')) {
      throw new PublicSecurityError(400, 'STORAGE_PATH_INVALID');
    }
    // `processing` funciona como um lease, não como um bloqueio permanente.
    // Se o runtime encerrar o worker (por exemplo, HTTP 546), o bloco `catch`
    // não executa e a fonte ficaria presa para sempre. O update condicional é
    // atômico: aceita estados livres ou recupera um lease abandonado.
    const staleBefore = new Date(Date.now() - PROCESSING_LEASE_MS).toISOString();
    const { data: claimedSource, error: processingError } = await adminClient
      .from('plataforma_fontes_conhecimento')
      .update({ status: 'processing', erro: null, processado_em: null })
      .eq('id', sourceId)
      .or(`status.neq.processing,atualizado_em.lt.${staleBefore}`)
      .select('id')
      .maybeSingle();
    if (processingError) throw new PublicSecurityError(503, 'SOURCE_STATE_UPDATE_FAILED');
    if (!claimedSource) throw new PublicSecurityError(409, 'SOURCE_ALREADY_PROCESSING');

    const { data: downloaded, error: downloadError } = await adminClient.storage
      .from('plataforma-conhecimento')
      .download(source.storage_path);
    if (downloadError || !downloaded) throw new PublicSecurityError(404, 'SOURCE_FILE_UNAVAILABLE');
    if (downloaded.size > MAX_FILE_BYTES) throw new PublicSecurityError(413, 'SOURCE_FILE_TOO_LARGE');

    const bytes = new Uint8Array(await downloaded.arrayBuffer());
    assertFileSignature(bytes, source.tipo_mime);

    const extracted = await withDeadline(
      extractDocument(bytes, source.tipo_mime),
      EXTRACTION_TIMEOUT_MS,
    );
    if (extracted.text.length < 80) {
      throw new PublicSecurityError(400, 'SOURCE_TEXT_INSUFFICIENT');
    }

    const truncated = extracted.text.length > MAX_SOURCE_CHARS;
    const indexedText = extracted.text.slice(0, MAX_SOURCE_CHARS);
    const chunks = chunkText(indexedText);
    if (chunks.length === 0) throw new PublicSecurityError(400, 'CHUNKING_FAILED');

    // Cada inferência roda em um isolate curto e independente. Executar o
    // modelo repetidamente neste orquestrador acumula CPU e encerra o worker
    // com HTTP 546 antes de concluir documentos com vários trechos.
    const rows = await mapInBatches(chunks, 3, async (content, index) => ({
      fonte_id: source.id,
      chunk_index: index,
      conteudo: content,
      token_estimado: Math.ceil(content.length / 4),
      metadata: {
        sourceTitle: source.titulo,
        sourceFile: source.nome_arquivo,
        scope: source.escopo,
        category: source.categoria,
        tags: Array.isArray(source.tags) ? source.tags.slice(0, 20) : [],
        pages: extracted.pages ?? null,
        untrustedSource: true,
      },
      embedding: JSON.stringify(await gerarEmbeddingIsolado(supabaseUrl, serviceRoleKey, content)),
    }));

    const { error: deleteError } = await adminClient
      .from('plataforma_memoria_chunks')
      .delete()
      .eq('fonte_id', sourceId);
    if (deleteError) throw new PublicSecurityError(503, 'CHUNK_REPLACEMENT_FAILED');

    for (let start = 0; start < rows.length; start += 20) {
      const { error: insertError } = await adminClient
        .from('plataforma_memoria_chunks')
        .insert(rows.slice(start, start + 20));
      if (insertError) throw new PublicSecurityError(503, 'CHUNK_INSERT_FAILED');
    }

    const { error: updateError } = await adminClient
      .from('plataforma_fontes_conhecimento')
      .update({
        status: 'ready',
        total_chunks: rows.length,
        total_caracteres: indexedText.length,
        paginas: extracted.pages ?? null,
        processado_em: new Date().toISOString(),
        erro: null,
        metadata: {
          extractor: source.tipo_mime === 'application/pdf'
            ? 'unpdf'
            : source.tipo_mime.includes('wordprocessingml')
            ? 'mammoth'
            : 'text-decoder',
          embeddingModel: 'gte-small',
          embeddingDimensions: 384,
          truncated,
          originalCharacters: extracted.text.length,
          fileBytes: bytes.length,
          securityScan: 'signature-and-limits-v1',
        },
      })
      .eq('id', sourceId);
    if (updateError) throw new PublicSecurityError(503, 'SOURCE_FINALIZATION_FAILED');

    const response = {
      ok: true,
      sourceId,
      chunks: rows.length,
      characters: indexedText.length,
      pages: extracted.pages ?? null,
      truncated,
      embeddingModel: 'gte-small',
    };

    await completeIdempotentOperation(
      adminClient,
      actorAuthUid,
      'rag.index',
      idempotencyKey,
      response,
    );
    idempotencyAcquired = false;

    await recordSecurityEvent(adminClient, {
      correlationId: security.correlationId,
      actorAuthUid,
      action: 'rag.index',
      resourceType: 'knowledge_source',
      resourceIdHash: await hashResourceId(sourceId),
      outcome: 'allowed',
      metadata: { chunks: rows.length, fileBytes: bytes.length, truncated },
    });

    return security.json({ ...response, correlationId: security.correlationId });
  } catch (error) {
    const reasonCode = error instanceof PublicSecurityError ? error.code : 'UNHANDLED_ERROR';

    if (actorAuthUid && idempotencyKey && idempotencyAcquired) {
      await failIdempotentOperation(
        adminClient,
        actorAuthUid,
        'rag.index',
        idempotencyKey,
        reasonCode,
      );
    }

    if (sourceId) {
      await adminClient
        .from('plataforma_fontes_conhecimento')
        .update({
          status: 'error',
          erro: `Falha de processamento. Referência: ${security.correlationId}`,
        })
        .eq('id', sourceId)
        .eq('status', 'processing');
    }

    if (actorAuthUid) {
      await recordSecurityEvent(adminClient, {
        correlationId: security.correlationId,
        actorAuthUid,
        action: 'rag.index',
        resourceType: sourceId ? 'knowledge_source' : null,
        resourceIdHash: sourceId ? await hashResourceId(sourceId) : null,
        outcome: error instanceof PublicSecurityError && error.status === 429 ? 'blocked' : 'failed',
        riskScore: error instanceof PublicSecurityError && error.status === 429 ? 60 : 30,
        reasonCode,
      });
    }

    return safeErrorResponse(security, error);
  }
});
