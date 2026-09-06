import { supabase } from './supabaseClient';
import { createRuntimeId } from '../utils/createRuntimeId';
import { getCurrentUserId } from './dataService';
import { STORAGE } from './constants';
import type {
  EbdEditorialDocument,
  EbdEditorialLesson,
  EbdEditorialStatus,
  EbdEditorialVersion,
  EbdAiDayGenerationInput,
  EbdAiGeneratedDay,
} from '../types/ebdEditorial';
import { normalizeEditorialDocument } from '../types/ebdEditorial';
import { createIdempotencyKey, publicMessageFromFunctionError, sanitizeReason } from '../security/clientSecurity';
import { editorialPublicationError } from './ebdEditorialErrors';

interface EditorialLessonRow {
  id: string;
  numero: number;
  titulo: string;
  subtitulo: string;
  status: EbdEditorialStatus;
  versao: number;
  documento: EbdEditorialDocument;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
  publicado_em: string | null;
}

function mapLesson(row: EditorialLessonRow): EbdEditorialLesson {
  return {
    id: row.id,
    number: row.numero,
    title: row.titulo,
    subtitle: row.subtitulo,
    status: row.status,
    version: row.versao,
    document: normalizeEditorialDocument(row.documento),
    createdBy: row.criado_por,
    createdAt: row.criado_em,
    updatedAt: row.atualizado_em,
    publishedAt: row.publicado_em,
  };
}

export async function getEditorialLessons(): Promise<EbdEditorialLesson[]> {
  const { data, error } = await supabase
    .from('ebd_editorial_lessons')
    .select('*')
    .neq('status', 'archived')
    .order('numero', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as EditorialLessonRow[]).map(mapLesson);
}

export async function getEditorialLessonById(
  lessonId: string,
): Promise<EbdEditorialLesson | null> {
  const { data, error } = await supabase
    .from('ebd_editorial_lessons')
    .select('*')
    .eq('id', lessonId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapLesson(data as EditorialLessonRow) : null;
}

export async function getPublishedEditorialLesson(): Promise<EbdEditorialLesson | null> {
  const { data, error } = await supabase
    .from('ebd_editorial_lessons')
    .select('*')
    .eq('status', 'published')
    // `publicado_em` registra uma operação editorial (publicação, correção ou
    // antecipação), não a posição da lição na sequência semanal. Ordenar por ele
    // fazia uma lição antiga voltar ao destaque ao liberar um de seus dias.
    // Enquanto a vigência canônica não está persistida em colunas próprias, o
    // número da lição é a fonte estável para a sequência editorial.
    .order('numero', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapLesson(data as EditorialLessonRow) : null;
}

export async function createEditorialLesson(input: {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  document: EbdEditorialDocument;
}): Promise<EbdEditorialLesson> {
  await getCurrentUserId(); // Confirma que existe uma sessão/perfil válido antes da escrita.
  const { data, error } = await supabase
    .from('ebd_editorial_lessons')
    .insert({
      id: input.id,
      numero: input.number,
      titulo: input.title,
      subtitulo: input.subtitle,
      documento: normalizeEditorialDocument(input.document),
    })
    .select()
    .single();
  if (error) throw error;
  return mapLesson(data as EditorialLessonRow);
}

export async function saveEditorialLesson(lesson: EbdEditorialLesson): Promise<void> {
  const { error } = await supabase
    .from('ebd_editorial_lessons')
    .update({
      numero: lesson.number,
      titulo: lesson.title,
      subtitulo: lesson.subtitle,
      documento: normalizeEditorialDocument(lesson.document),
    })
    .eq('id', lesson.id);
  if (error) throw error;
}

export async function saveUnreleasedEditorialDay(
  lessonId: string,
  day: EbdEditorialDocument['days'][number],
): Promise<void> {
  const { data: current, error: readError } = await supabase
    .from('ebd_editorial_lessons')
    .select('versao')
    .eq('id', lessonId)
    .single<{ versao: number }>();
  if (readError) throw editorialPublicationError(readError);

  const { error } = await supabase.rpc('ebd_salvar_dia_editorial_nao_liberado', {
    p_licao_id: lessonId,
    p_day_id: day.id,
    p_day: day,
    p_expected_version: current.versao,
    p_idempotency_key: createIdempotencyKey('ebd-save-unreleased-day'),
    p_reason: 'Salvamento editorial de dia ainda não liberado',
  });
  if (error) throw editorialPublicationError(error);
}

export async function deleteEditorialLesson(
  lessonId: string,
  reason = 'Arquivamento solicitado pelo Estúdio Editorial',
): Promise<void> {
  const { error } = await supabase.rpc('ebd_arquivar_editorial', {
    p_licao_id: lessonId,
    p_idempotency_key: createIdempotencyKey('ebd-archive'),
    p_reason: sanitizeReason(reason, 'Arquivamento solicitado pelo Estúdio Editorial'),
  });
  if (error) throw error;
}

export async function changeEditorialLessonStatus(
  lessonId: string,
  status: Exclude<EbdEditorialStatus, 'published'>,
  reason = '',
): Promise<void> {
  if (status === 'review') {
    const { error } = await supabase.rpc('ebd_enviar_para_revisao', {
      p_licao_id: lessonId,
      p_idempotency_key: createIdempotencyKey('ebd-review-submit'),
      p_reason: sanitizeReason(reason, 'Envio para revisão editorial'),
    });
    if (error) throw error;
    return;
  }

  if (status === 'draft') {
    const { error } = await supabase.rpc('ebd_retornar_para_rascunho', {
      p_licao_id: lessonId,
      p_idempotency_key: createIdempotencyKey('ebd-review-return'),
      p_reason: sanitizeReason(reason, 'Ajustes editoriais solicitados na revisão'),
    });
    if (error) throw error;
    return;
  }

  if (status === 'archived') {
    await deleteEditorialLesson(lessonId, reason);
    return;
  }

  throw new Error('Transição editorial não permitida.');
}

export async function publishEditorialLesson(
  lessonId: string,
  reason = 'Publicação editorial aprovada',
): Promise<number> {
  const { data: current, error: readError } = await supabase
    .from('ebd_editorial_lessons')
    .select('versao')
    .eq('id', lessonId)
    .single<{ versao: number }>();
  if (readError) throw readError;

  const { data, error } = await supabase.rpc('publicar_ebd_editorial_seguro', {
    p_licao_id: lessonId,
    p_expected_version: current.versao,
    p_idempotency_key: createIdempotencyKey('ebd-publish'),
    p_reason: sanitizeReason(reason, 'Publicação editorial aprovada'),
  });
  if (error) throw error;
  const result = data as { version?: unknown } | null;
  return Number(result?.version ?? 0);
}

export async function publishEditorialDayNow(
  lessonId: string,
  day: EbdEditorialDocument['days'][number],
): Promise<number> {
  // A versão exibida no Estúdio pode ficar obsoleta apó salvar ou publicar
  // outro dia. O RPC aplica controle otimista e exige a versão corrente.
  const { data: current, error: readError } = await supabase
    .from('ebd_editorial_lessons')
    .select('versao')
    .eq('id', lessonId)
    .single<{ versao: number }>();
  if (readError) throw editorialPublicationError(readError);

  const { data, error } = await supabase.rpc('ebd_publicar_dia_editorial', {
    p_licao_id: lessonId,
    p_day_id: day.id,
    p_day: day,
    p_expected_version: current.versao,
    p_idempotency_key: createIdempotencyKey('ebd-publish-day-now'),
    p_reason: 'Publicação manual do conteúdo diário pelo Estúdio Editorial',
  });
  if (error) throw editorialPublicationError(error);
  return Number((data as { version?: unknown } | null)?.version ?? 0);
}

export async function publishEditorialWeekNow(
  lessonId: string,
  expectedVersion: number,
): Promise<number> {
  const { data, error } = await supabase.rpc('ebd_antecipar_semana_publicada', {
    p_licao_id: lessonId,
    p_expected_version: expectedVersion,
    p_idempotency_key: createIdempotencyKey('ebd-publish-week-now'),
    p_reason: 'Antecipação manual da semana pelo Estúdio Editorial',
  });
  if (error) throw error;
  return Number((data as { version?: unknown } | null)?.version ?? 0);
}

export async function getEditorialVersions(lessonId: string): Promise<EbdEditorialVersion[]> {
  const { data, error } = await supabase
    .from('ebd_editorial_versions')
    .select('id, licao_id, versao, documento, criado_em')
    .eq('licao_id', lessonId)
    .order('versao', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(row => ({
    id: row.id as string,
    lessonId: row.licao_id as string,
    version: row.versao as number,
    document: row.documento as EbdEditorialDocument,
    createdAt: row.criado_em as string,
  }));
}

export function subscribeToEditorialLesson(callback: () => void): () => void {
  const channel = supabase
    .channel(`ebd-editorial-${createRuntimeId()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ebd_editorial_lessons' }, callback)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function uploadEditorialImage(file: File): Promise<string> {
  if (file.size > STORAGE.MAX_FILE_SIZE) {
    throw new Error(`A imagem deve ter no máximo ${STORAGE.MAX_FILE_SIZE / 1024 / 1024}MB.`);
  }
  if (!STORAGE.ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('Formato não aceito. Use JPEG, PNG ou WebP.');
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw new Error('Sua sessão expirou. Entre novamente para enviar a imagem.');
  }

  const extensionByType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  const extension = extensionByType[file.type];
  const filePath = `${authData.user.id}/${Date.now()}-${createRuntimeId()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE.EBD_MEDIA_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    const message = uploadError.message.toLowerCase();
    if (message.includes('bucket') && (message.includes('not found') || message.includes('does not exist'))) {
      throw new Error('O bucket público “ebd-media” ainda não foi criado no Supabase.');
    }
    if (message.includes('row-level security') || message.includes('policy') || message.includes('unauthorized')) {
      throw new Error('Sua sessão não tem permissão para enviar mídia editorial. Verifique as policies do bucket “ebd-media”.');
    }
    throw new Error(`Não foi possível enviar a imagem: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(STORAGE.EBD_MEDIA_BUCKET)
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}


export async function generateEditorialDayWithAI(
  input: EbdAiDayGenerationInput,
): Promise<EbdAiGeneratedDay> {
  const { data, error } = await supabase.functions.invoke('gerar-dia-ebd', {
    body: input,
    headers: {
      'Idempotency-Key': createIdempotencyKey('ebd-ai-generate'),
    },
  });

  if (error) {
    throw new Error(await publicMessageFromFunctionError(error));
  }

  const response = data as {
    day?: EbdAiGeneratedDay;
    provider?: unknown;
    model?: unknown;
    executionId?: unknown;
    agentRunId?: unknown;
    persistedByAgent?: unknown;
    fallbacks?: unknown;
  } | null;
  const day = response?.day;
  if (!day || !Array.isArray(day.blocks) || day.blocks.length !== input.selectedBlockTypes.length) {
    throw new Error('A IA retornou um conteúdo editorial incompleto.');
  }
  return {
    ...day,
    generation: {
      provider: typeof response?.provider === 'string' ? response.provider : 'desconhecido',
      model: typeof response?.model === 'string' ? response.model : 'desconhecido',
      executionId: typeof response?.executionId === 'string' ? response.executionId : null,
      agentRunId: typeof response?.agentRunId === 'string' ? response.agentRunId : null,
      persistedByAgent: response?.persistedByAgent === true,
      fallbacks: Array.isArray(response?.fallbacks)
        ? response.fallbacks.flatMap(item => (
          item
          && typeof item === 'object'
          && typeof (item as { provider?: unknown }).provider === 'string'
          && typeof (item as { reason?: unknown }).reason === 'string'
            ? [{
                provider: (item as { provider: string }).provider,
                reason: (item as { reason: string }).reason,
              }]
            : []
        ))
        : [],
    },
  };
}
