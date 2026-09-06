export type EbdEditorialStatus = 'draft' | 'review' | 'published' | 'archived';
export type EbdWeekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type EbdQuizSelectionMode = 'single' | 'multiple';
export type EbdReleaseMode = 'scheduled' | 'immediate';
export type EbdBlockType =
  | 'hero'
  | 'text'
  | 'scripture'
  | 'character'
  | 'timeline'
  | 'reflection'
  | 'mission'
  | 'prayer'
  | 'quiz'
  | 'video';

export interface EbdEditorialBlock {
  id: string;
  type: EbdBlockType;
  title: string;
  content?: string;
  reference?: string;
  mediaUrl?: string;
  altText?: string;
  prompt?: string;
  required?: boolean;
  settings?: Record<string, unknown>;
}

export interface EbdQuizQuestion {
  id: string;
  prompt: string;
  selectionMode: EbdQuizSelectionMode;
  options: string[];
  correctAnswers: number[];
  explanation?: string;
}

export interface EbdQuizSettings {
  questions: EbdQuizQuestion[];
}

export interface EbdEditorialDay {
  id: string;
  day: EbdWeekday;
  label: string;
  title: string;
  subtitle: string;
  purpose: string;
  estimatedMinutes: number;
  unlocksAt: string;
  blocks: EbdEditorialBlock[];
}

export interface EbdEditorialDocument {
  releaseMode?: EbdReleaseMode;
  coverImageUrl?: string;
  knowledgeSourceIds: string[];
  theme: string;
  summary: string;
  periodLabel: string;
  mainVerseReference: string;
  mainVerseSummary: string;
  weeklyMissionTitle: string;
  weeklyMissionDescription: string;
  source: {
    publisher: string;
    edition: string;
    pageRange: string;
  };
  days: EbdEditorialDay[];
}

export interface EbdEditorialLesson {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  status: EbdEditorialStatus;
  version: number;
  document: EbdEditorialDocument;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string | null;
}


export interface EbdAiDayGenerationInput {
  mode?: 'manual' | 'prepare_day';
  lessonUpdatedAt?: string;
  lessonId: string;
  lessonNumber: number;
  lessonTitle: string;
  lessonSubtitle: string;
  theme: string;
  summary: string;
  mainVerseReference: string;
  sourcePublisher: string;
  sourceEdition: string;
  sourcePageRange: string;
  day: EbdWeekday;
  dayLabel: string;
  dayPurpose: string;
  estimatedMinutes: number;
  audience: string;
  tone: string;
  objective: string;
  additionalInstructions: string;
  selectedBlockTypes: EbdBlockType[];
  knowledgeSourceIds: string[];
}

export interface EbdAiGeneratedBlock {
  type: EbdBlockType;
  title: string;
  content: string;
  reference: string;
  altText: string;
  prompt: string;
  required: boolean;
  quizQuestions: Array<{
    prompt: string;
    selectionMode: EbdQuizSelectionMode;
    options: string[];
    correctAnswers: number[];
    explanation: string;
  }>;
}

export interface EbdAiGeneratedDay {
  title: string;
  subtitle: string;
  purpose: string;
  estimatedMinutes: number;
  blocks: EbdAiGeneratedBlock[];
  generation?: {
    provider: string;
    model: string;
    executionId: string | null;
    agentRunId?: string | null;
    persistedByAgent?: boolean;
    fallbacks: Array<{
      provider: string;
      reason: string;
    }>;
  };
}

export interface EbdEditorialVersion {
  id: string;
  lessonId: string;
  version: number;
  document: EbdEditorialDocument;
  createdAt: string;
}

export const EBD_WEEKDAYS: Array<{ day: EbdWeekday; label: string; purpose: string }> = [
  { day: 'monday', label: 'Segunda-feira', purpose: 'Descobrir' },
  { day: 'tuesday', label: 'Terça-feira', purpose: 'Compreender' },
  { day: 'wednesday', label: 'Quarta-feira', purpose: 'Conversar' },
  { day: 'thursday', label: 'Quinta-feira', purpose: 'Praticar' },
  { day: 'friday', label: 'Sexta-feira', purpose: 'Fixar' },
  { day: 'saturday', label: 'Sábado', purpose: 'Aprofundar' },
  { day: 'sunday', label: 'Domingo', purpose: 'Vivenciar' },
];

function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function normalizeEditorialDocument(
  document: Partial<EbdEditorialDocument> | null | undefined,
): EbdEditorialDocument {
  const input = document ?? {};
  const sourceDays = Array.isArray(input.days) ? input.days : [];
  const source = input.source ?? { publisher: 'CPAD', edition: '', pageRange: '' };
  const sourceIdCounts = sourceDays.reduce<Map<string, number>>((counts, candidate) => {
    const id = asText(candidate?.id);
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    return counts;
  }, new Map());

  const days = EBD_WEEKDAYS.map((metadata, index) => {
    const matchingDay = sourceDays.find(candidate => candidate?.day === metadata.day);
    const candidate = matchingDay ?? sourceDays[index];

    return {
      // IDs duplicados tornam a publicação diária ambígua. Documentos legados
      // chegaram a repetir o ID da segunda-feira nos sete dias; nesses casos,
      // recuperamos a identidade canônica a partir da posição/dia da semana.
      id: sourceIdCounts.get(asText(candidate?.id)) === 1
        ? asText(candidate?.id)
        : `day-${metadata.day}`,
      day: metadata.day,
      // O rótulo é sempre canônico. Isso corrige documentos antigos em que todos os dias foram salvos como segunda-feira.
      label: metadata.label,
      title: asText(candidate?.title),
      subtitle: asText(candidate?.subtitle),
      purpose: asText(candidate?.purpose).trim() || metadata.purpose,
      estimatedMinutes:
        typeof candidate?.estimatedMinutes === 'number' && candidate.estimatedMinutes > 0
          ? candidate.estimatedMinutes
          : metadata.day === 'sunday'
            ? 45
            : 10,
      unlocksAt: asText(candidate?.unlocksAt),
      blocks: Array.isArray(candidate?.blocks) ? candidate.blocks : [],
    } satisfies EbdEditorialDay;
  });

  return {
    releaseMode: input.releaseMode === 'immediate' ? 'immediate' : 'scheduled',
    coverImageUrl: asText(input.coverImageUrl),
    knowledgeSourceIds: Array.isArray(input.knowledgeSourceIds)
      ? [...new Set(input.knowledgeSourceIds.filter((id): id is string => typeof id === 'string' && id.length > 0))]
      : [],
    theme: asText(input.theme),
    summary: asText(input.summary),
    periodLabel: asText(input.periodLabel),
    mainVerseReference: asText(input.mainVerseReference),
    mainVerseSummary: asText(input.mainVerseSummary),
    weeklyMissionTitle: asText(input.weeklyMissionTitle),
    weeklyMissionDescription: asText(input.weeklyMissionDescription),
    source: {
      publisher: asText(source.publisher) || 'CPAD',
      edition: asText(source.edition),
      pageRange: asText(source.pageRange),
    },
    days,
  };
}

export function getEditorialCoverImage(document: EbdEditorialDocument): string {
  const explicitCover = document.coverImageUrl?.trim();
  if (explicitCover) return explicitCover;

  const monday = document.days.find(day => day.day === 'monday') ?? document.days[0];
  return monday?.blocks.find(block =>
    Boolean(block.mediaUrl?.trim()) && block.type !== 'video'
  )?.mediaUrl?.trim() ?? '';
}

export function createEmptyEditorialDocument(): EbdEditorialDocument {
  return normalizeEditorialDocument(null);
}

export function getQuizSettings(block: EbdEditorialBlock): EbdQuizSettings {
  if (block.type !== 'quiz') {
    return { questions: [] };
  }

  const rawQuestions = (block.settings as { questions?: unknown } | undefined)?.questions;
  if (!Array.isArray(rawQuestions)) {
    return { questions: [] };
  }

  const questions = rawQuestions.flatMap((rawQuestion, index) => {
    if (!rawQuestion || typeof rawQuestion !== 'object') {
      return [];
    }

    const candidate = rawQuestion as Partial<EbdQuizQuestion> & {
      options?: unknown;
      correctAnswers?: unknown;
      correctAnswer?: unknown;
      format?: unknown;
    };

    const options = Array.isArray(candidate.options)
      ? candidate.options.filter((option): option is string => typeof option === 'string')
      : [];

    const normalizedMode: EbdQuizSelectionMode =
      candidate.selectionMode === 'multiple' || candidate.format === 'multiple_select'
        ? 'multiple'
        : 'single';

    const rawCorrectAnswers = Array.isArray(candidate.correctAnswers)
      ? candidate.correctAnswers
      : typeof candidate.correctAnswer === 'number'
        ? [candidate.correctAnswer]
        : [];

    const correctAnswers = rawCorrectAnswers
      .filter((answer): answer is number => typeof answer === 'number' && Number.isInteger(answer))
      .filter(answer => answer >= 0 && answer < options.length);

    return [{
      id: typeof candidate.id === 'string' && candidate.id.length > 0 ? candidate.id : `quiz-question-${index + 1}`,
      prompt: typeof candidate.prompt === 'string' ? candidate.prompt : '',
      selectionMode: normalizedMode,
      options,
      correctAnswers: normalizedMode === 'single' ? correctAnswers.slice(0, 1) : correctAnswers,
      explanation: typeof candidate.explanation === 'string' ? candidate.explanation : '',
    }];
  });

  return { questions };
}
