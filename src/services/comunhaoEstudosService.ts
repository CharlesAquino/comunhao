import { supabase } from './supabaseClient';
import { getCurrentUserId } from './dataService';
import { createIdempotencyKey, publicMessageFromFunctionError } from '../security/clientSecurity';
import type {
  CourseStatus,
  StudyBlock,
  StudyBlockType,
  StudyCatalog,
  StudyAiGeneratedLesson,
  StudyAiLessonGenerationInput,
  StudyCertificate,
  StudyCourse,
  StudyLesson,
  StudyModule,
  StudyTrack,
} from '../types/comunhaoEstudos';

export const COMUNHAO_ESTUDOS_CATALOG_SCHEMA_ENABLED = import.meta.env.VITE_ESTUDOS_CATALOG_SCHEMA_ENABLED === 'true';

type TrackRow = { id: string; slug: string; titulo: string; descricao: string; ordem: number };
type CourseRow = { id: string; trilha_id: string; slug: string; titulo: string; subtitulo: string; descricao: string; ministrante: string; nivel: StudyCourse['level']; duracao_minutos: number; capa_clara_url: string | null; capa_escura_url: string | null; banner_claro_url: string | null; banner_escuro_url: string | null; hero_url: string | null; tags: string[] | null; certificado_habilitado: boolean; status: 'rascunho' | 'revisao_pastoral' | 'publicado' | 'arquivado' | 'em_breve'; versao: number };
type ModuleRow = { id: string; curso_id: string; slug: string; titulo: string; descricao: string; ordem: number };
type LessonRow = { id: string; modulo_id: string; slug: string; titulo: string; referencia_biblica: string; descricao: string; duracao_minutos: number; ordem: number; status: 'rascunho' | 'publicada' | 'arquivada'; versao: number };
type BlockRow = { id: string; aula_id: string; tipo: StudyBlockType; titulo: string; resumo: string; conteudo: Record<string, unknown> | null; ordem: number; obrigatorio: boolean };
type ProgressRow = { bloco_id: string; aula_id: string; curso_id: string };
type CertificateRow = { id: string; curso_id: string; codigo_validacao: string; emitido_em: string; curso_versao: number; validade_pastoral: boolean };
type CourseSourceRow = { curso_id: string; fonte_id: string };

export interface CourseDraftInput {
  trackId: string;
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  minister: string;
  level: StudyCourse['level'];
  durationMinutes: number;
  certificateEnabled: boolean;
  coverLight?: string;
  coverDark?: string;
  bannerLight?: string;
  bannerDark?: string;
  heroImage?: string;
}

function ensureEnabled() {
  if (!COMUNHAO_ESTUDOS_CATALOG_SCHEMA_ENABLED) throw new Error('O catálogo remoto do Comunhão Estudos ainda não está habilitado neste ambiente.');
}

function mapCourseStatus(status: CourseRow['status']): CourseStatus {
  switch (status) {
    case 'rascunho': return 'draft';
    case 'revisao_pastoral': return 'pastoral_review';
    case 'publicado': return 'published';
    case 'arquivado': return 'archived';
    case 'em_breve': return 'coming_soon';
  }
}

function calculateCourseProgress(courseId: string, blocks: BlockRow[], lessons: LessonRow[], modules: ModuleRow[], completed: Set<string>): number {
  const moduleIds = new Set(modules.filter(module => module.curso_id === courseId).map(module => module.id));
  const lessonIds = new Set(lessons.filter(lesson => moduleIds.has(lesson.modulo_id)).map(lesson => lesson.id));
  const required = blocks.filter(block => lessonIds.has(block.aula_id) && block.obrigatorio);
  if (!required.length) return 0;
  return Math.round((required.filter(block => completed.has(block.id)).length / required.length) * 100);
}

function buildCatalog(rows: { tracks: TrackRow[]; courses: CourseRow[]; modules: ModuleRow[]; lessons: LessonRow[]; blocks: BlockRow[]; progress: ProgressRow[]; certificates: CertificateRow[]; courseSources: CourseSourceRow[] }): StudyCatalog {
  const completed = new Set(rows.progress.map(item => item.bloco_id));
  const orderedLessons = [...rows.lessons].sort((a, b) => a.ordem - b.ordem);
  const completedLessons = new Set(orderedLessons.filter(lesson => {
    const required = rows.blocks.filter(block => block.aula_id === lesson.id && block.obrigatorio);
    return required.length > 0 && required.every(block => completed.has(block.id));
  }).map(lesson => lesson.id));

  const tracks: StudyTrack[] = rows.tracks.map(row => ({ id: row.id, slug: row.slug, title: row.titulo, description: row.descricao, order: row.ordem }));
  const courses: StudyCourse[] = rows.courses.map(course => {
    const courseModules = rows.modules.filter(module => module.curso_id === course.id).sort((a, b) => a.ordem - b.ordem);
    let previousComplete = true;
    const modules: StudyModule[] = courseModules.map(module => {
      const lessons: StudyLesson[] = orderedLessons.filter(lesson => lesson.modulo_id === module.id).map(lesson => {
        const lessonBlocks = rows.blocks.filter(block => block.aula_id === lesson.id).sort((a, b) => a.ordem - b.ordem);
        const isComplete = completedLessons.has(lesson.id);
        const status: StudyLesson['status'] = isComplete ? 'completed' : previousComplete ? 'current' : 'locked';
        if (!isComplete) previousComplete = false;
        return {
          id: lesson.id,
          slug: lesson.slug,
          title: lesson.titulo,
          reference: lesson.referencia_biblica,
          description: lesson.descricao,
          durationMinutes: lesson.duracao_minutos,
          order: lesson.ordem,
          version: lesson.versao,
          status,
          blocks: lessonBlocks.map((block): StudyBlock => ({ id: block.id, type: block.tipo, title: block.titulo, summary: block.resumo, content: block.conteudo ?? {}, order: block.ordem, required: block.obrigatorio, completed: completed.has(block.id) })),
        };
      });
      return { id: module.id, slug: module.slug, title: module.titulo, description: module.descricao, order: module.ordem, lessons };
    });
    return {
      id: course.id,
      slug: course.slug,
      trackId: course.trilha_id,
      title: course.titulo,
      subtitle: course.subtitulo,
      description: course.descricao,
      minister: course.ministrante,
      level: course.nivel,
      durationMinutes: course.duracao_minutos,
      version: course.versao,
      status: mapCourseStatus(course.status),
      progress: calculateCourseProgress(course.id, rows.blocks, rows.lessons, rows.modules, completed),
      certificateEnabled: course.certificado_habilitado,
      coverLight: course.capa_clara_url ?? undefined,
      coverDark: course.capa_escura_url ?? undefined,
      bannerLight: course.banner_claro_url ?? undefined,
      bannerDark: course.banner_escuro_url ?? undefined,
      heroImage: course.hero_url ?? undefined,
      tags: course.tags ?? [],
      knowledgeSourceIds: rows.courseSources.filter(link => link.curso_id === course.id).map(link => link.fonte_id),
      modules,
    };
  });
  const certificates: StudyCertificate[] = rows.certificates.map(row => ({ id: row.id, courseId: row.curso_id, validationCode: row.codigo_validacao, issuedAt: row.emitido_em, courseVersion: row.curso_versao, pastoralValidity: row.validade_pastoral }));
  return { tracks, courses, certificates };
}

export async function getStudyCatalog(options: { includeDrafts?: boolean } = {}): Promise<StudyCatalog> {
  ensureEnabled();
  const courseStatuses = options.includeDrafts ? ['rascunho', 'revisao_pastoral', 'publicado', 'em_breve'] : ['publicado', 'em_breve'];
  const [tracksResult, coursesResult, progressResult, certificatesResult] = await Promise.all([
    supabase.from('estudos_trilhas').select('id,slug,titulo,descricao,ordem').order('ordem'),
    supabase.from('estudos_cursos').select('*').in('status', courseStatuses).order('criado_em'),
    supabase.from('estudos_aula_progresso').select('bloco_id,aula_id,curso_id'),
    supabase.from('estudos_certificados').select('id,curso_id,codigo_validacao,emitido_em,curso_versao,validade_pastoral').is('revogado_em', null),
  ]);
  if (tracksResult.error) throw tracksResult.error;
  if (coursesResult.error) throw coursesResult.error;
  const courses = (coursesResult.data ?? []) as CourseRow[];
  if (!courses.length) return {
    tracks: ((tracksResult.data ?? []) as TrackRow[]).map(row => ({ id: row.id, slug: row.slug, title: row.titulo, description: row.descricao, order: row.ordem })),
    courses: [],
    certificates: [],
  };
  const courseIds = courses.map(course => course.id);
  const [modulesResult, courseSourcesResult] = await Promise.all([
    supabase.from('estudos_modulos').select('*').in('curso_id', courseIds).order('ordem'),
    supabase.from('estudos_curso_fontes').select('curso_id,fonte_id').in('curso_id', courseIds),
  ]);
  if (modulesResult.error) throw modulesResult.error;
  if (courseSourcesResult.error) throw courseSourcesResult.error;
  const modules = (modulesResult.data ?? []) as ModuleRow[];
  const lessonsResult = modules.length ? await supabase.from('estudos_aulas').select('*').in('modulo_id', modules.map(module => module.id)).order('ordem') : { data: [], error: null };
  if (lessonsResult.error) throw lessonsResult.error;
  const lessons = (lessonsResult.data ?? []) as LessonRow[];
  const blocksResult = lessons.length ? await supabase.from('estudos_aula_blocos').select('*').in('aula_id', lessons.map(lesson => lesson.id)).order('ordem') : { data: [], error: null };
  if (blocksResult.error) throw blocksResult.error;
  if (progressResult.error) throw progressResult.error;
  if (certificatesResult.error) throw certificatesResult.error;
  return buildCatalog({ tracks: (tracksResult.data ?? []) as TrackRow[], courses, modules, lessons, blocks: (blocksResult.data ?? []) as BlockRow[], progress: (progressResult.data ?? []) as ProgressRow[], certificates: (certificatesResult.data ?? []) as CertificateRow[], courseSources: (courseSourcesResult.data ?? []) as CourseSourceRow[] });
}

export async function setStudyCourseKnowledgeSources(courseId: string, sourceIds: string[]): Promise<void> {
  ensureEnabled();
  const { error } = await supabase.rpc('estudos_definir_fontes_curso', {
    p_curso_id: courseId,
    p_fonte_ids: [...new Set(sourceIds)],
  });
  if (error) throw error;
}

export async function generateStudyLessonWithAI(input: StudyAiLessonGenerationInput): Promise<StudyAiGeneratedLesson> {
  ensureEnabled();
  const { data, error } = await supabase.functions.invoke('gerar-aula-estudo', {
    body: input,
    headers: { 'Idempotency-Key': createIdempotencyKey('estudos-ai-generate') },
  });
  if (error) throw new Error(await publicMessageFromFunctionError(error));
  const lesson = (data as { lesson?: StudyAiGeneratedLesson } | null)?.lesson;
  if (!lesson || !Array.isArray(lesson.blocks) || lesson.blocks.length !== input.selectedBlockTypes.length) {
    throw new Error('A IA retornou uma aula incompleta.');
  }
  return lesson;
}

export async function completeCourseBlock(blockId: string): Promise<{ progress: number; certificateId?: string; validationCode?: string }> {
  ensureEnabled();
  const { data, error } = await supabase.rpc('estudos_concluir_bloco', { p_bloco_id: blockId });
  if (error) throw error;
  const result = data as { percentual?: number; certificadoId?: string; codigoValidacao?: string } | null;
  return { progress: Number(result?.percentual ?? 0), certificateId: result?.certificadoId ?? undefined, validationCode: result?.codigoValidacao ?? undefined };
}

export async function recordCoursePastoralManifestation(input: { courseId: string; version: number; manifestation: 'gostei' | 'ficou_bom' }): Promise<void> {
  ensureEnabled();
  const userId = await getCurrentUserId();
  const { error } = await supabase.from('estudos_curso_manifestacoes_pastorais').upsert({ curso_id: input.courseId, revisor_id: userId, curso_versao: input.version, manifestacao: input.manifestation }, { onConflict: 'curso_id,revisor_id,curso_versao' });
  if (error) throw error;
}

export async function createStudyTrack(input: { title: string; slug: string; description: string; order: number }): Promise<string> {
  ensureEnabled();
  const userId = await getCurrentUserId();
  const { data, error } = await supabase.from('estudos_trilhas').insert({ titulo: input.title, slug: input.slug, descricao: input.description, ordem: input.order, criado_por: userId }).select('id').single();
  if (error) throw error;
  return String(data.id);
}

export async function createStudyCourse(input: CourseDraftInput): Promise<string> {
  ensureEnabled();
  const userId = await getCurrentUserId();
  const { data, error } = await supabase.from('estudos_cursos').insert({ trilha_id: input.trackId, titulo: input.title, slug: input.slug, subtitulo: input.subtitle, descricao: input.description, ministrante: input.minister, nivel: input.level, duracao_minutos: input.durationMinutes, capa_clara_url: input.coverLight || null, capa_escura_url: input.coverDark || null, banner_claro_url: input.bannerLight || null, banner_escuro_url: input.bannerDark || null, hero_url: input.heroImage || null, certificado_habilitado: input.certificateEnabled, criado_por: userId }).select('id').single();
  if (error) throw error;
  return String(data.id);
}

export async function createStudyModule(input: { courseId: string; title: string; slug: string; description: string; order: number }): Promise<string> {
  ensureEnabled();
  const { data, error } = await supabase.from('estudos_modulos').insert({ curso_id: input.courseId, titulo: input.title, slug: input.slug, descricao: input.description, ordem: input.order }).select('id').single();
  if (error) throw error;
  return String(data.id);
}

export async function createStudyLesson(input: { moduleId: string; title: string; slug: string; reference: string; description: string; durationMinutes: number; order: number }): Promise<string> {
  ensureEnabled();
  const { data, error } = await supabase.from('estudos_aulas').insert({ modulo_id: input.moduleId, titulo: input.title, slug: input.slug, referencia_biblica: input.reference, descricao: input.description, duracao_minutos: input.durationMinutes, ordem: input.order }).select('id').single();
  if (error) throw error;
  return String(data.id);
}

export async function createStudyBlock(input: { lessonId: string; type: StudyBlockType; title: string; summary: string; content?: Record<string, unknown>; order: number; required: boolean }): Promise<string> {
  ensureEnabled();
  const { data, error } = await supabase.from('estudos_aula_blocos').insert({ aula_id: input.lessonId, tipo: input.type, titulo: input.title, resumo: input.summary, conteudo: input.content ?? {}, ordem: input.order, obrigatorio: input.required }).select('id').single();
  if (error) throw error;
  return String(data.id);
}

export async function replaceStudyLessonBlocks(lessonId: string, blocks: StudyBlock[]): Promise<StudyBlock[]> {
  ensureEnabled();
  const { data, error } = await supabase.rpc('estudos_substituir_blocos_aula', {
    p_aula_id: lessonId,
    p_blocos: blocks.map(block => ({ tipo: block.type, titulo: block.title, resumo: block.summary, conteudo: block.content ?? {}, ordem: block.order, obrigatorio: block.required })),
  });
  if (error) throw error;
  return ((data ?? []) as BlockRow[]).sort((a, b) => a.ordem - b.ordem).map(row => ({ id: row.id, type: row.tipo, title: row.titulo, summary: row.resumo, content: row.conteudo ?? {}, order: row.ordem, required: row.obrigatorio, completed: false }));
}

export async function sendCourseToPastoralReview(courseId: string): Promise<void> {
  ensureEnabled();
  const modulesResult = await supabase.from('estudos_modulos').select('id').eq('curso_id', courseId);
  if (modulesResult.error) throw modulesResult.error;
  const moduleIds = (modulesResult.data ?? []).map(module => String(module.id));
  if (!moduleIds.length) throw new Error('Adicione ao menos um módulo antes de enviar o curso para revisão.');

  const lessonsResult = await supabase.from('estudos_aulas').select('id').in('modulo_id', moduleIds);
  if (lessonsResult.error) throw lessonsResult.error;
  const lessonIds = (lessonsResult.data ?? []).map(lesson => String(lesson.id));
  if (!lessonIds.length) throw new Error('Adicione ao menos uma aula antes de enviar o curso para revisão.');

  const blocksResult = await supabase.from('estudos_aula_blocos').select('id').in('aula_id', lessonIds).limit(1);
  if (blocksResult.error) throw blocksResult.error;
  if (!blocksResult.data?.length) throw new Error('Adicione conteúdo às aulas antes de enviar o curso para revisão.');

  const lessonsUpdate = await supabase.from('estudos_aulas').update({ status: 'publicada', atualizado_em: new Date().toISOString() }).in('id', lessonIds);
  if (lessonsUpdate.error) throw lessonsUpdate.error;
  const { error } = await supabase.from('estudos_cursos').update({ status: 'revisao_pastoral', atualizado_em: new Date().toISOString() }).eq('id', courseId);
  if (error) throw error;
}

export async function assignCourseReviewer(courseId: string, reviewerId: string): Promise<void> {
  ensureEnabled();
  const userId = await getCurrentUserId();
  const { error } = await supabase.from('estudos_curso_revisores').upsert({ curso_id: courseId, revisor_id: reviewerId, atribuido_por: userId }, { onConflict: 'curso_id,revisor_id' });
  if (error) throw error;
}

export async function publishStudyCourse(courseId: string): Promise<void> {
  ensureEnabled();
  const { error } = await supabase.rpc('estudos_publicar_curso', { p_curso_id: courseId });
  if (error) throw error;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function persistStudyCourseDraft(course: StudyCourse, track: StudyTrack): Promise<StudyCourse> {
  ensureEnabled();
  let trackId = track.id;
  if (!isUuid(trackId)) trackId = await createStudyTrack({ title: track.title, slug: track.slug, description: track.description, order: track.order });
  else {
    const { error } = await supabase.from('estudos_trilhas').update({ titulo: track.title, slug: track.slug, descricao: track.description, ordem: track.order, atualizado_em: new Date().toISOString() }).eq('id', trackId);
    if (error) throw error;
  }

  let courseId = course.id;
  if (!isUuid(courseId)) courseId = await createStudyCourse({ trackId, title: course.title, slug: course.slug, subtitle: course.subtitle, description: course.description, minister: course.minister, level: course.level, durationMinutes: course.durationMinutes, certificateEnabled: course.certificateEnabled, coverLight: course.coverLight, coverDark: course.coverDark, bannerLight: course.bannerLight, bannerDark: course.bannerDark, heroImage: course.heroImage });
  else {
    const { error } = await supabase.from('estudos_cursos').update({ trilha_id: trackId, titulo: course.title, slug: course.slug, subtitulo: course.subtitle, descricao: course.description, ministrante: course.minister, nivel: course.level, duracao_minutos: course.durationMinutes, capa_clara_url: course.coverLight || null, capa_escura_url: course.coverDark || null, banner_claro_url: course.bannerLight || null, banner_escuro_url: course.bannerDark || null, hero_url: course.heroImage || null, certificado_habilitado: course.certificateEnabled, atualizado_em: new Date().toISOString() }).eq('id', courseId);
    if (error) throw error;
  }

  const modules: StudyModule[] = [];
  for (const module of course.modules) {
    let moduleId = module.id;
    if (!isUuid(moduleId)) moduleId = await createStudyModule({ courseId, title: module.title, slug: module.slug, description: module.description, order: module.order });
    else {
      const { error } = await supabase.from('estudos_modulos').update({ titulo: module.title, slug: module.slug, descricao: module.description, ordem: module.order, atualizado_em: new Date().toISOString() }).eq('id', moduleId);
      if (error) throw error;
    }
    const lessons: StudyLesson[] = [];
    for (const lesson of module.lessons) {
      let lessonId = lesson.id;
      if (!isUuid(lessonId)) lessonId = await createStudyLesson({ moduleId, title: lesson.title, slug: lesson.slug, reference: lesson.reference, description: lesson.description, durationMinutes: lesson.durationMinutes, order: lesson.order });
      else {
        const { error } = await supabase.from('estudos_aulas').update({ titulo: lesson.title, slug: lesson.slug, referencia_biblica: lesson.reference, descricao: lesson.description, duracao_minutos: lesson.durationMinutes, ordem: lesson.order, atualizado_em: new Date().toISOString() }).eq('id', lessonId);
        if (error) throw error;
      }
      const blocks = await replaceStudyLessonBlocks(lessonId, lesson.blocks);
      lessons.push({ ...lesson, id: lessonId, blocks });
    }
    modules.push({ ...module, id: moduleId, lessons });
  }
  await setStudyCourseKnowledgeSources(courseId, course.knowledgeSourceIds);
  return { ...course, id: courseId, trackId, modules };
}

// Compatibilidade com a fundação anterior enquanto a migration de catálogo não for aplicada.
export async function getPublishedComunhaoStudies() {
  const catalog = await getStudyCatalog();
  return catalog.courses.flatMap(course => course.modules.flatMap((module, moduleIndex) => module.lessons.map(lesson => ({ id: lesson.id, season: course.title, week: moduleIndex + 1, title: lesson.title, reference: lesson.reference, description: lesson.description, progress: course.progress, version: lesson.version, status: lesson.status, blocks: lesson.blocks }))));
}

export async function recordPastoralManifestation(input: { studyId: string; version: number; manifestation: 'gostei' | 'ficou_bom' }): Promise<void> {
  return recordCoursePastoralManifestation({ courseId: input.studyId, version: input.version, manifestation: input.manifestation });
}

export async function markStudyBlockComplete(input: { blockId: string }): Promise<void> {
  await completeCourseBlock(input.blockId);
}

export async function getCompletedStudyBlockIds(): Promise<string[]> {
  ensureEnabled();
  const { data, error } = await supabase.from('estudos_aula_progresso').select('bloco_id');
  if (error) throw error;
  return ((data ?? []) as Array<{ bloco_id: string }>).map(row => row.bloco_id);
}
