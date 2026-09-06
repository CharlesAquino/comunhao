import { supabase } from './supabaseClient';
import { createRuntimeId } from '../utils/createRuntimeId';
import { getCurrentUserId } from './dataService';
import { createIdempotencyKey, publicMessageFromFunctionError } from '../security/clientSecurity';
import type {
  KnowledgeCategory,
  KnowledgeScope,
  KnowledgeSearchResult,
  KnowledgeSource,
  KnowledgeUploadInput,
} from '../types/conhecimento';

const KNOWLEDGE_BUCKET = 'plataforma-conhecimento';
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const KNOWLEDGE_SOURCE_CACHE_TTL_MS = 2 * 60 * 1000;
const ACCEPTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/html',
  'text/csv',
  'application/json',
]);

interface KnowledgeSourceRow {
  id: string;
  titulo: string;
  descricao: string;
  escopo: KnowledgeScope;
  categoria: KnowledgeCategory;
  tags: string[] | null;
  nome_arquivo: string;
  tipo_mime: string;
  storage_path: string;
  tamanho_bytes: number;
  checksum_sha256: string;
  status: KnowledgeSource['status'];
  ativo: boolean;
  total_chunks: number;
  total_caracteres: number;
  paginas: number | null;
  metadata: Record<string, unknown> | null;
  erro: string | null;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
  processado_em: string | null;
}

let knowledgeSourceCache: { expiresAt: number; value: KnowledgeSource[] } | null = null;
let knowledgeSourceRequest: Promise<KnowledgeSource[]> | null = null;

function invalidateKnowledgeSourceCache(): void {
  knowledgeSourceCache = null;
}

function mapSource(row: KnowledgeSourceRow): KnowledgeSource {
  return {
    id: row.id,
    title: row.titulo,
    description: row.descricao,
    scope: row.escopo,
    category: row.categoria,
    tags: row.tags ?? [],
    fileName: row.nome_arquivo,
    mimeType: row.tipo_mime,
    storagePath: row.storage_path,
    sizeBytes: Number(row.tamanho_bytes),
    checksumSha256: row.checksum_sha256,
    status: row.status,
    active: row.ativo,
    totalChunks: row.total_chunks,
    totalCharacters: row.total_caracteres,
    pages: row.paginas,
    metadata: row.metadata ?? {},
    error: row.erro,
    createdBy: row.criado_por,
    createdAt: row.criado_em,
    updatedAt: row.atualizado_em,
    processedAt: row.processado_em,
  };
}

function sanitizeFileName(value: string): string {
  const safe = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return safe || 'arquivo';
}

async function sha256(file: File): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function normalizeMimeType(file: File): string {
  if (ACCEPTED_MIME_TYPES.has(file.type)) return file.type;
  const extension = file.name.toLowerCase().split('.').pop() ?? '';
  const byExtension: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    md: 'text/markdown',
    markdown: 'text/markdown',
    html: 'text/html',
    htm: 'text/html',
    csv: 'text/csv',
    json: 'application/json',
  };
  return byExtension[extension] ?? file.type;
}

function validateFile(file: File): string {
  if (file.size <= 0) throw new Error('O arquivo está vazio.');
  if (file.size > MAX_FILE_SIZE) throw new Error('O arquivo deve ter no máximo 15 MB.');
  const mimeType = normalizeMimeType(file);
  if (!ACCEPTED_MIME_TYPES.has(mimeType)) {
    throw new Error('Formato não aceito. Use PDF, DOCX, TXT, Markdown, HTML, CSV ou JSON.');
  }
  return mimeType;
}

export async function listKnowledgeSources(options: { force?: boolean } = {}): Promise<KnowledgeSource[]> {
  const now = Date.now();
  if (!options.force && knowledgeSourceCache && knowledgeSourceCache.expiresAt > now) {
    return knowledgeSourceCache.value;
  }
  if (!options.force && knowledgeSourceRequest) return knowledgeSourceRequest;

  const request = (async () => {
    const { data, error } = await supabase
      .from('plataforma_fontes_conhecimento')
      .select('*')
      .order('criado_em', { ascending: false });
    if (error) throw error;
    const value = ((data ?? []) as KnowledgeSourceRow[]).map(mapSource);
    knowledgeSourceCache = { value, expiresAt: Date.now() + KNOWLEDGE_SOURCE_CACHE_TTL_MS };
    return value;
  })();

  knowledgeSourceRequest = request;
  try {
    return await request;
  } finally {
    if (knowledgeSourceRequest === request) knowledgeSourceRequest = null;
  }
}

export async function uploadKnowledgeSource(input: KnowledgeUploadInput): Promise<KnowledgeSource> {
  const mimeType = validateFile(input.file);

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error('Sua sessão expirou. Entre novamente.');

  const profileId = await getCurrentUserId();
  const checksum = await sha256(input.file);
  const date = new Date();
  const folder = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
  const path = `${authData.user.id}/${folder}/${createRuntimeId()}-${sanitizeFileName(input.file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(KNOWLEDGE_BUCKET)
    .upload(path, input.file, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false,
    });
  if (uploadError) throw new Error(`Falha ao enviar o arquivo: ${uploadError.message}`);

  const { data, error } = await supabase
    .from('plataforma_fontes_conhecimento')
    .insert({
      titulo: input.title.trim() || input.file.name,
      descricao: input.description.trim(),
      escopo: input.scope,
      categoria: input.category,
      tags: input.tags,
      nome_arquivo: input.file.name,
      tipo_mime: mimeType,
      storage_path: path,
      tamanho_bytes: input.file.size,
      checksum_sha256: checksum,
      // A Edge Function é a dona da transição para `processing`.
      // Iniciar nesse estado faria a própria função interpretar o novo
      // arquivo como uma indexação concorrente e rejeitá-lo com 409.
      status: 'error',
      ativo: true,
      criado_por: profileId,
    })
    .select('*')
    .single();

  if (error) {
    await supabase.storage.from(KNOWLEDGE_BUCKET).remove([path]);
    if (error.code === '23505') throw new Error('Este arquivo já está ativo na memória sistêmica.');
    throw error;
  }

  const source = mapSource(data as KnowledgeSourceRow);
  invalidateKnowledgeSourceCache();
  const { error: invokeError } = await supabase.functions.invoke('indexar-memoria-rag', {
    body: { sourceId: source.id },
    headers: { 'idempotency-key': createIdempotencyKey('rag-index') },
  });
  if (invokeError) {
    const publicMessage = await publicMessageFromFunctionError(invokeError);
    await supabase
      .from('plataforma_fontes_conhecimento')
      .update({ status: 'error', erro: publicMessage })
      .eq('id', source.id);
    throw new Error(`Arquivo salvo, mas a indexação não iniciou: ${publicMessage} Use “Reindexar” para tentar novamente.`);
  }

  return source;
}

export async function reindexKnowledgeSource(sourceId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('indexar-memoria-rag', {
    body: { sourceId },
    headers: { 'idempotency-key': createIdempotencyKey('rag-reindex') },
  });
  if (error) throw new Error(`Não foi possível reindexar: ${await publicMessageFromFunctionError(error)}`);
}

export async function setKnowledgeSourceActive(sourceId: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from('plataforma_fontes_conhecimento')
    .update({ ativo: active, status: active ? 'ready' : 'archived' })
    .eq('id', sourceId);
  if (error) throw error;
  invalidateKnowledgeSourceCache();
}

export async function deleteKnowledgeSource(source: KnowledgeSource): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(KNOWLEDGE_BUCKET)
    .remove([source.storagePath]);
  if (storageError && !storageError.message.toLowerCase().includes('not found')) {
    throw new Error(`Não foi possível remover o arquivo: ${storageError.message}`);
  }

  const { error } = await supabase
    .from('plataforma_fontes_conhecimento')
    .delete()
    .eq('id', source.id);
  if (error) throw error;
  invalidateKnowledgeSourceCache();
}

export async function searchKnowledgeMemory(input: {
  query: string;
  scopes?: KnowledgeScope[];
  categories?: KnowledgeCategory[];
  limit?: number;
  threshold?: number;
}): Promise<KnowledgeSearchResult[]> {
  const { data, error } = await supabase.functions.invoke('buscar-memoria-rag', {
    body: {
      query: input.query,
      scopes: input.scopes,
      categories: input.categories,
      limit: input.limit ?? 8,
      threshold: input.threshold ?? 0.42,
    },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(String(data.error));
  return (data?.results ?? []) as KnowledgeSearchResult[];
}

export const knowledgeFileRules = {
  maxFileSize: MAX_FILE_SIZE,
  acceptedMimeTypes: Array.from(ACCEPTED_MIME_TYPES),
};
