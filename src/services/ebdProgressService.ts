import { supabase } from './supabaseClient';
import { getCurrentUserId } from './dataService';
import type { EbdEditorialLesson } from '../types/ebdEditorial';

export interface EbdSyncedProgress {
  completedBlocks: string[];
  responses: Record<string, string>;
  rewardedDays: string[];
  rewardedQuizQuestions: string[];
  currentDayId?: string | null;
  currentBlockId?: string | null;
}

const lessonCacheKey = 'ebd:published-lesson:offline';

export function cacheEditorialLesson(lesson: EbdEditorialLesson | null): void {
  if (!lesson) return;
  try { localStorage.setItem(lessonCacheKey, JSON.stringify(lesson)); } catch { /* armazenamento opcional */ }
}

export function getCachedEditorialLesson(): EbdEditorialLesson | null {
  try {
    const cached = localStorage.getItem(lessonCacheKey);
    return cached ? JSON.parse(cached) as EbdEditorialLesson : null;
  } catch { return null; }
}

export async function getEbdProgress(lessonId: string, version: number): Promise<EbdSyncedProgress | null> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase.from('ebd_progresso_usuario').select('*')
    .eq('usuario_id', userId).eq('licao_id', lessonId).eq('versao', version).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    completedBlocks: data.blocos_concluidos || [],
    responses: data.respostas_privadas || {},
    rewardedDays: data.dias_recompensados || [],
    rewardedQuizQuestions: data.quizzes_recompensados || [],
    currentDayId: data.dia_atual_id,
    currentBlockId: data.bloco_atual_id,
  };
}

export async function saveEbdProgress(
  lessonId: string,
  version: number,
  progress: EbdSyncedProgress,
  totalRequiredBlocks: number,
): Promise<void> {
  const userId = await getCurrentUserId();
  const completed = totalRequiredBlocks > 0 && progress.completedBlocks.length >= totalRequiredBlocks;
  const { error } = await supabase.from('ebd_progresso_usuario').upsert({
    usuario_id: userId,
    licao_id: lessonId,
    versao: version,
    dia_atual_id: progress.currentDayId || null,
    bloco_atual_id: progress.currentBlockId || null,
    blocos_concluidos: progress.completedBlocks,
    dias_recompensados: progress.rewardedDays,
    quizzes_recompensados: progress.rewardedQuizQuestions,
    respostas_privadas: progress.responses,
    atualizado_em: new Date().toISOString(),
    concluido_em: completed ? new Date().toISOString() : null,
  }, { onConflict: 'usuario_id,licao_id,versao' });
  if (error) throw error;
}
