import { createRuntimeId } from '../utils/createRuntimeId';
import type { EbdBlockType, EbdEditorialLesson, EbdQuizQuestion } from '../types/ebdEditorial';

export const EBD_STUDIO_BLOCK_OPTIONS: Array<{ type: EbdBlockType; label: string }> = [
  { type: 'hero', label: 'Abertura' },
  { type: 'text', label: 'Texto' },
  { type: 'scripture', label: 'Passagem bíblica' },
  { type: 'character', label: 'Personagem' },
  { type: 'timeline', label: 'Linha do tempo' },
  { type: 'reflection', label: 'Reflexão' },
  { type: 'mission', label: 'Missão' },
  { type: 'prayer', label: 'Oração' },
  { type: 'quiz', label: 'Quiz' },
  { type: 'video', label: 'Vídeo' },
];

export const GENERATED_WEEKDAY_COUNT = 6;

export const EBD_STUDIO_STATUS_LABELS = {
  draft: 'Rascunho',
  review: 'Em revisão',
  published: 'Publicado',
  archived: 'Arquivado',
} as const;

export function getEditorialReleaseModeLabel(lesson: EbdEditorialLesson): string {
  return lesson.document.releaseMode === 'immediate' ? 'Publicada agora' : 'Agendada';
}

export function getEditorialReleaseModeClasses(lesson: EbdEditorialLesson): string {
  return lesson.document.releaseMode === 'immediate'
    ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]'
    : 'border-[var(--border)] bg-[var(--surface-highlighted)] text-[var(--text-muted)]';
}

export function createEditorialSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function getEbdBlockLabel(type: EbdBlockType): string {
  return EBD_STUDIO_BLOCK_OPTIONS.find(option => option.type === type)?.label ?? type;
}

export function createEmptyQuizQuestion(): EbdQuizQuestion {
  return {
    id: `quiz-question-${createRuntimeId()}`,
    prompt: '',
    selectionMode: 'single',
    options: ['', ''],
    correctAnswers: [],
    explanation: '',
  };
}
