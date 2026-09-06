import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, Check, Clock3, LayoutPanelTop, LockKeyhole, Play, Sparkles } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import InstitutionalAction from '../ui/InstitutionalAction';
import { creditarKesef, creditarXp } from '../../services/kesefService';
import { KESEF_VALORES } from '../../services/kesefConstants';
import { XP_ACOES } from '../../services/patente';
import { useToast } from '../../contexts/ToastContext';
import {
  getQuizSettings,
  getEditorialCoverImage,
  type EbdEditorialBlock,
  type EbdEditorialDay,
  type EbdEditorialLesson,
} from '../../types/ebdEditorial';
import { getEbdProgress, saveEbdProgress } from '../../services/ebdProgressService';
import { isRedundantEditorialTitle } from '../../services/editorialLanguage';

interface ProgressState {
  completedBlocks: string[];
  responses: Record<string, string>;
  rewardedDays: string[];
  rewardedQuizQuestions: string[];
  currentDayId?: string | null;
  currentBlockId?: string | null;
}

const progressKey = (lessonId: string) => `ebd-editorial-progress:${lessonId}`;

function readProgress(lessonId: string): ProgressState {
  try {
    const value = localStorage.getItem(progressKey(lessonId));
    if (!value) {
      return { completedBlocks: [], responses: {}, rewardedDays: [], rewardedQuizQuestions: [] };
    }
    const parsed = JSON.parse(value) as Partial<ProgressState>;
    return {
      completedBlocks: Array.isArray(parsed.completedBlocks) ? parsed.completedBlocks : [],
      responses: parsed.responses && typeof parsed.responses === 'object' ? parsed.responses as Record<string, string> : {},
      rewardedDays: Array.isArray(parsed.rewardedDays) ? parsed.rewardedDays : [],
      rewardedQuizQuestions: Array.isArray(parsed.rewardedQuizQuestions) ? parsed.rewardedQuizQuestions : [],
      currentDayId: typeof parsed.currentDayId === 'string' ? parsed.currentDayId : null,
      currentBlockId: typeof parsed.currentBlockId === 'string' ? parsed.currentBlockId : null,
    };
  } catch {
    return { completedBlocks: [], responses: {}, rewardedDays: [], rewardedQuizQuestions: [] };
  }
}

function isAvailable(lesson: EbdEditorialLesson, day: EbdEditorialDay) {
  if (!day.title.trim() || day.blocks.length === 0) {
    return false;
  }
  if (lesson.document.releaseMode === 'immediate') {
    return true;
  }
  // No modo agendado, data vazia significa que o gestor ainda fará a
  // liberação manual. Publicar um único dia grava o instante atual nele.
  return Boolean(day.unlocksAt) && Date.now() >= new Date(day.unlocksAt).getTime();
}

function EditorialBlock({
  block,
  done,
  response,
  onDone,
  onResponse,
  onRewardQuizQuestion,
  rewardedQuizQuestions,
}: {
  block: EbdEditorialBlock;
  done: boolean;
  response: string;
  onDone: () => void;
  onResponse: (value: string) => void;
  onRewardQuizQuestion: (questionRewardId: string) => Promise<void>;
  rewardedQuizQuestions: string[];
}) {
  const interactive = ['scripture', 'reflection', 'mission', 'quiz'].includes(block.type);
  const quizSettings = block.type === 'quiz' ? getQuizSettings(block) : null;
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number[]>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<string, boolean>>({});

  const toggleQuizAnswer = (questionId: string, optionIndex: number, multiple: boolean) => {
    setQuizAnswers(current => {
      const previous = current[questionId] ?? [];
      const next = multiple
        ? previous.includes(optionIndex)
          ? previous.filter(answer => answer !== optionIndex)
          : [...previous, optionIndex].sort((a, b) => a - b)
        : [optionIndex];
      return { ...current, [questionId]: next };
    });
  };

  const submitQuizQuestion = (questionId: string) => {
    setQuizSubmitted(current => ({ ...current, [questionId]: true }));
  };

  const sameAnswers = (left: number[], right: number[]) =>
    left.length === right.length && left.every((value, index) => value === right[index]);

  return (
    <Card variant={block.type === 'mission' ? 'highlighted' : 'standard'} className="overflow-hidden p-5">
      {block.mediaUrl && (block.type === 'hero' || block.type === 'video') && (
        block.type === 'video'
          ? <video controls preload="metadata" src={block.mediaUrl} className="mb-4 aspect-video w-full rounded-xl bg-black" />
          : (
            <div className="mb-4 flex w-full justify-center overflow-hidden rounded-xl bg-[var(--surface-highlighted)]">
              <img
                src={block.mediaUrl}
                alt={block.altText || ''}
                className="max-h-[32rem] max-w-full object-contain"
              />
            </div>
          )
      )}
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--celebration)]">{block.type}</p>
      <h3 className="mt-1 font-display text-lg text-[var(--text-primary)]">{block.title}</h3>
      {block.reference && <p className="mt-2 text-xs font-semibold text-[var(--accent-primary)]">{block.reference}</p>}
      {block.content && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[var(--text-secondary)]">{block.content}</p>}
      {block.type === 'video' && !block.mediaUrl && (
        <div className="mt-4 flex min-h-28 flex-col items-center justify-center rounded-xl bg-[var(--surface-highlighted)] text-[var(--text-muted)]">
          <Play size={24} /><span className="mt-2 text-xs">Conteúdo em produção</span>
        </div>
      )}
      {block.type === 'reflection' && (
        <textarea
          value={response}
          onChange={event => onResponse(event.target.value)}
          placeholder="Sua resposta permanece privada"
          className="input-theme mt-4 min-h-28 w-full resize-y rounded-xl border p-3 text-sm"
        />
      )}
      {block.type === 'quiz' && quizSettings && (
        <div className="mt-4 space-y-4">
          {quizSettings.questions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-muted)]">
              Nenhuma pergunta configurada neste quiz.
            </div>
          ) : quizSettings.questions.map((question, questionIndex) => {
            const selectedAnswers = quizAnswers[question.id] ?? [];
            const submitted = quizSubmitted[question.id] ?? false;
            const multiple = question.selectionMode === 'multiple';
            const correct = sameAnswers(selectedAnswers, [...question.correctAnswers].sort((a, b) => a - b));
            return (
              <div key={question.id} className="rounded-2xl border border-[var(--border)] p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--celebration)]">
                  Pergunta {questionIndex + 1} {multiple ? '· Caixa de seleção' : '· Resposta única'}
                </p>
                <h4 className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{question.prompt}</h4>
                <div className="mt-3 space-y-2">
                  {question.options.map((option, optionIndex) => {
                    const inputType = multiple ? 'checkbox' : 'radio';
                    const checked = selectedAnswers.includes(optionIndex);
                    return (
                      <label key={`${question.id}-${optionIndex}`} className="flex items-start gap-3 rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                        <input
                          type={inputType}
                          name={question.id}
                          checked={checked}
                          onChange={() => toggleQuizAnswer(question.id, optionIndex, multiple)}
                          className="mt-0.5"
                        />
                        <span>{option}</span>
                      </label>
                    );
                  })}
                </div>
                <Button
                  variant="secondary"
                  className="mt-3 w-full"
                  onClick={() => {
                    submitQuizQuestion(question.id);
                    if (correct) {
                      void onRewardQuizQuestion(`${block.id}:${question.id}`);
                    }
                  }}
                  disabled={selectedAnswers.length === 0}
                >
                  <Check size={16} /> Verificar resposta
                </Button>
                {submitted && (
                  <div className={`mt-3 rounded-xl border px-3 py-3 text-sm ${correct ? 'border-[var(--success)]/40 bg-[var(--success)]/10 text-[var(--text-primary)]' : 'border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--text-primary)]'}`}>
                    <p className="font-semibold">{correct ? 'Resposta correta' : 'Resposta incorreta'}</p>
                    {question.explanation && <p className="mt-1 text-[var(--text-secondary)]">{question.explanation}</p>}
                    {correct && rewardedQuizQuestions.includes(`${block.id}:${question.id}`) && (
                      <p className="mt-1 text-[var(--accent-primary)]">+{KESEF_VALORES.QUIZ_ACERTO} Kesef · +{XP_ACOES.QUIZ} XP</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {interactive && (
        <Button variant={done ? 'secondary' : 'primary'} className="mt-4 w-full" onClick={onDone} disabled={block.type === 'reflection' && response.trim().length < 3}>
          <Check size={16} /> {done ? 'Concluído' : 'Marcar como concluído'}
        </Button>
      )}
    </Card>
  );
}

export default function EbdJourney({ lesson, isAdmin = false }: { lesson: EbdEditorialLesson; isAdmin?: boolean }) {
  const toast = useToast();
  const [dayIndex, setDayIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState<ProgressState>(() => readProgress(lesson.id));
  const hydratedRef = useRef(false);
  const required = lesson.document.days.map(day => day.blocks.filter(block => block.required).map(block => block.id));
  const completedDays = required.filter(ids => ids.length > 0 && ids.every(id => progress.completedBlocks.includes(id))).length;
  const coverImageUrl = getEditorialCoverImage(lesson.document);
  const totalRequiredBlocks = required.flat().length;

  useEffect(() => {
    let active = true;
    getEbdProgress(lesson.id, lesson.version).then(remote => {
      if (!active || !remote) return;
      const merged: ProgressState = {
        completedBlocks: [...new Set([...progress.completedBlocks, ...remote.completedBlocks])],
        responses: { ...progress.responses, ...remote.responses },
        rewardedDays: [...new Set([...progress.rewardedDays, ...remote.rewardedDays])],
        rewardedQuizQuestions: [...new Set([...progress.rewardedQuizQuestions, ...remote.rewardedQuizQuestions])],
        currentDayId: remote.currentDayId || progress.currentDayId,
        currentBlockId: remote.currentBlockId || progress.currentBlockId,
      };
      setProgress(merged);
      localStorage.setItem(progressKey(lesson.id), JSON.stringify(merged));
    }).catch(() => undefined).finally(() => { hydratedRef.current = true; });
    return () => { active = false; };
    // A hidratação ocorre uma vez por versão; o progresso local inicial é a base de mesclagem offline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id, lesson.version]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const timer = setTimeout(() => {
      void saveEbdProgress(lesson.id, lesson.version, progress, totalRequiredBlocks).catch(() => undefined);
    }, 700);
    return () => clearTimeout(timer);
  }, [lesson.id, lesson.version, progress, totalRequiredBlocks]);

  const persist = (next: ProgressState) => {
    setProgress(next);
    localStorage.setItem(progressKey(lesson.id), JSON.stringify(next));
  };

  const openDay = (index: number) => {
    const day = lesson.document.days[index];
    persist({
      ...progress,
      currentDayId: day.id,
      currentBlockId: day.blocks.find(block => !progress.completedBlocks.includes(block.id))?.id || day.blocks[0]?.id || null,
    });
    setDayIndex(index);
  };

  const rewardDayCompletion = async (day: EbdEditorialDay) => {
    if (progress.rewardedDays.includes(day.id)) {
      return;
    }

    try {
      await Promise.all([
        creditarKesef('licao', KESEF_VALORES.LICAO_CONCLUIDA, `${lesson.id}:${day.id}`),
        creditarXp(XP_ACOES.LICAO, `${lesson.id}:${day.id}`),
      ]);
      const next = {
        ...progress,
        rewardedDays: [...progress.rewardedDays, day.id],
      };
      persist(next);
      toast.success(`${day.label} concluído · +${KESEF_VALORES.LICAO_CONCLUIDA} Kesef · +${XP_ACOES.LICAO} XP`);
    } catch {
      toast.error('O dia foi concluído, mas a recompensa não pôde ser registrada agora.');
    }
  };

  const rewardQuizQuestion = async (rewardId: string) => {
    if (progress.rewardedQuizQuestions.includes(rewardId)) {
      return;
    }

    try {
      await Promise.all([
        creditarKesef('quiz_acerto', KESEF_VALORES.QUIZ_ACERTO, `${lesson.id}:${rewardId}`),
        creditarXp(XP_ACOES.QUIZ, `${lesson.id}:${rewardId}`),
      ]);
      const next = {
        ...progress,
        rewardedQuizQuestions: [...progress.rewardedQuizQuestions, rewardId],
      };
      persist(next);
    } catch {
      toast.error('A resposta foi validada, mas a recompensa do quiz não pôde ser registrada agora.');
    }
  };

  const toggleBlockCompletion = (day: EbdEditorialDay, blockId: string) => {
    const exists = progress.completedBlocks.includes(blockId);
    const completedBlocks = exists
      ? progress.completedBlocks.filter(id => id !== blockId)
      : [...progress.completedBlocks, blockId];
    const next = { ...progress, completedBlocks };
    persist(next);

    const requiredIds = day.blocks.filter(block => block.required).map(block => block.id);
    const completedNow = requiredIds.length > 0 && requiredIds.every(id => completedBlocks.includes(id));
    const rewardedAlready = next.rewardedDays.includes(day.id);

    if (!exists && completedNow && !rewardedAlready) {
      void rewardDayCompletion(day);
    }
  };

  if (dayIndex !== null) {
    const day = lesson.document.days[dayIndex];
    const available = isAvailable(lesson, day);
    return (
      <div className="ebd-journey-page space-y-5 px-5 pb-8 pt-6">
        <Button variant="ghost" className="!px-2" onClick={() => setDayIndex(null)}><ArrowLeft size={17} /> Jornada</Button>
        <header>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)]">{day.label} · {day.purpose}</p>
          {!isRedundantEditorialTitle(day.title, day.label) && (
            <h1 className="mt-2 font-display text-2xl text-[var(--text-primary)]">{day.title}</h1>
          )}
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{day.subtitle}</p>
          <p className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]"><Clock3 size={14} /> {day.estimatedMinutes} minutos</p>
        </header>
        {!available ? (
          <Card className="p-7 text-center">
            <LockKeyhole size={28} className="mx-auto text-[var(--text-muted)]" />
            <h2 className="mt-4 font-display text-lg text-[var(--text-primary)]">Conteúdo programado</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {day.unlocksAt
                ? `Disponível em ${new Date(day.unlocksAt).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}.`
                : 'Aguardando liberação editorial.'}
            </p>
            <p className="mt-3 text-xs text-[var(--text-muted)]">A antecipação solidária será adicionada na próxima etapa.</p>
          </Card>
        ) : day.blocks.map(block => (
          <EditorialBlock
            key={block.id}
            block={block}
            done={progress.completedBlocks.includes(block.id)}
            response={progress.responses[block.id] ?? ''}
            onDone={() => toggleBlockCompletion(day, block.id)}
            onResponse={value => persist({ ...progress, responses: { ...progress.responses, [block.id]: value } })}
            onRewardQuizQuestion={rewardQuizQuestion}
            rewardedQuizQuestions={progress.rewardedQuizQuestions}
          />
        ))}
      </div>
    );
  }

  const firstPending = lesson.document.days.findIndex((day, index) => isAvailable(lesson, day) && !required[index].every(id => progress.completedBlocks.includes(id)));
  const continueIndex = firstPending >= 0 ? firstPending : 0;
  const today = lesson.document.days[continueIndex];

  return (
    <div className="ebd-journey-page space-y-5 px-5 pb-8 pt-6">
      <header className="relative overflow-hidden rounded-[1.7rem] border border-[var(--celebration-border)] bg-[var(--surface-highlighted)] p-5">
        <div className="flex items-start gap-4">
          <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            {coverImageUrl
              ? <img src={coverImageUrl} alt={`Capa da lição ${lesson.number}`} className="size-full object-contain" />
              : <BookOpen size={28} className="text-[var(--accent-primary)]" />}
          </div>
          <div className="min-w-0 flex-1 py-0.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--celebration)]">Escola Bíblica Digital · Lição {lesson.number}</p>
            <h1 className="mt-2 line-clamp-2 font-display text-2xl leading-tight text-[var(--text-primary)]">{lesson.title}</h1>
            {lesson.subtitle && <p className="mt-1 line-clamp-2 text-sm leading-snug text-[var(--text-secondary)]">{lesson.subtitle}</p>}
            {lesson.document.periodLabel && <p className="mt-2 text-xs text-[var(--text-muted)]">{lesson.document.periodLabel}</p>}
          </div>
        </div>
        {lesson.document.releaseMode === 'immediate' && (
          <p className="mt-4 inline-flex rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent-primary)]">
            Publicada agora
          </p>
        )}
      </header>

      {isAdmin && (
        <InstitutionalAction to="/admin/ebd-studio" icon={<LayoutPanelTop size={17} />}>Abrir Estúdio Editorial</InstitutionalAction>
      )}

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)]">Continuar jornada</p>
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
            lesson.document.releaseMode === 'immediate'
              ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-primary)]'
              : 'border-[var(--border)] bg-[var(--surface-highlighted)] text-[var(--text-muted)]'
          }`}>
            {lesson.document.releaseMode === 'immediate' ? 'Publicada agora' : 'Agendada'}
          </span>
        </div>
        <h2 className="mt-2 font-display text-xl text-[var(--text-primary)]">{today.title || 'Conteúdo da semana'}</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{today.label} · {today.estimatedMinutes} min</p>
        <InstitutionalAction className="mt-4" icon={<BookOpen size={17} />} onClick={() => openDay(continueIndex)}>Continuar jornada</InstitutionalAction>
      </Card>

      <Card className="space-y-3 p-5">
        <div className="flex justify-between"><h2 className="font-display text-lg text-[var(--text-primary)]">Progresso semanal</h2><span className="text-sm font-semibold text-[var(--accent-primary)]">{Math.round((completedDays / 7) * 100)}%</span></div>
        <div className="grid grid-cols-7 gap-2">
          {lesson.document.days.map((day, index) => {
            const complete = required[index].length > 0 && required[index].every(id => progress.completedBlocks.includes(id));
            const available = isAvailable(lesson, day);
            return (
              <button key={day.id} type="button" onClick={() => openDay(index)} className="flex flex-col items-center gap-1">
                <span className={`grid size-8 place-items-center rounded-full border text-[10px] font-bold ${complete ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--text-on-accent)]' : available ? 'border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-primary)]' : 'border-[var(--border)] text-[var(--text-muted)]'}`}>
                  {complete ? <Check size={14} /> : available ? index + 1 : <LockKeyhole size={12} />}
                </span>
                <span className="text-[9px] text-[var(--text-muted)]">{day.label.slice(0, 3)}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {lesson.document.weeklyMissionTitle && (
        <Card variant="highlighted" className="p-5">
          <Sparkles size={20} className="text-[var(--celebration)]" />
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[var(--celebration)]">Missão da semana</p>
          <h2 className="mt-1 font-display text-lg text-[var(--text-primary)]">{lesson.document.weeklyMissionTitle}</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{lesson.document.weeklyMissionDescription}</p>
        </Card>
      )}
    </div>
  );
}
