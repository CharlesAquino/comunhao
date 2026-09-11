import {
  useEffect,
  useRef,
  useState } from 'react'; import { Link } from 'react-router-dom'; import { ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  Grid2X2,
  History,
  Lightbulb,
  LockKeyhole,
  Play,
  Video,
  Hand,
  Heart,
  Target,
  Users,
  CircleHelp,
  Sprout,
  Flag,
} from 'lucide-react';
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
import brandLeafLight from '../../assets/ebd-v14/brand-leaf-light.png';
import '../../styles/ebd-mockup-v14.css';
import '../../styles/ebd-sessions-v16.css';
import '../../styles/ebd-reference-v17.css';
import { EbdLessonView } from './EbdLessonView';
import leafArt from '../../assets/ebd-v17/olive-branch.png';

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
      return {
        completedBlocks: [],
        responses: {},
        rewardedDays: [],
        rewardedQuizQuestions: [],
      };
    }

    const parsed = JSON.parse(value) as Partial<ProgressState>;
    return {
      completedBlocks: Array.isArray(parsed.completedBlocks)
        ? parsed.completedBlocks
        : [],
      responses:
        parsed.responses && typeof parsed.responses === 'object'
          ? (parsed.responses as Record<string, string>)
          : {},
      rewardedDays: Array.isArray(parsed.rewardedDays)
        ? parsed.rewardedDays
        : [],
      rewardedQuizQuestions: Array.isArray(parsed.rewardedQuizQuestions)
        ? parsed.rewardedQuizQuestions
        : [],
      currentDayId:
        typeof parsed.currentDayId === 'string' ? parsed.currentDayId : null,
      currentBlockId:
        typeof parsed.currentBlockId === 'string' ? parsed.currentBlockId : null,
    };
  } catch {
    return {
      completedBlocks: [],
      responses: {},
      rewardedDays: [],
      rewardedQuizQuestions: [],
    };
  }
}

function isAvailable(lesson: EbdEditorialLesson, day: EbdEditorialDay) {
  if (!day.title.trim() || day.blocks.length === 0) return false;
  if (lesson.document.releaseMode === 'immediate') return true;
  return Boolean(day.unlocksAt)
    && Date.now() >= new Date(day.unlocksAt).getTime();
}

function getLeadBlock(day: EbdEditorialDay) {
  return (
    day.blocks.find(block => block.type === 'hero' && Boolean(block.mediaUrl?.trim()))
    ?? day.blocks.find(block => block.type !== 'video' && Boolean(block.mediaUrl?.trim()))
    ?? null
  );
}

function splitEditorialLines(content?: string) {
  if (!content?.trim()) return [];

  return content
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);
}

function normalizeTimelineItems(content?: string) {
  const lines = splitEditorialLines(content);

  return lines.map((line, index) => {
    const cleaned = line
      .replace(/^\s*(?:[-–—•*]|\d+[.)])\s*/, '')
      .trim();

    const separatorIndex = cleaned.indexOf(':');
    if (separatorIndex > 0 && separatorIndex < 44) {
      return {
        id: `${index}-${cleaned.slice(0, separatorIndex)}`,
        title: cleaned.slice(0, separatorIndex).trim(),
        content: cleaned.slice(separatorIndex + 1).trim(),
      };
    }

    return {
      id: `${index}-${cleaned.slice(0, 24)}`,
      title: `Etapa ${index + 1}`,
      content: cleaned,
    };
  });
}

type BlockVisualDefinition = {
  label: string;
  session:
    | 'opening'
    | 'study'
    | 'reflection'
    | 'mission'
    | 'prayer'
    | 'quiz';
  description: string;
};

const BLOCK_VISUALS = {
  hero: {
    label: 'Abertura',
    session: 'opening',
    description: 'Apresentação visual e direção principal da etapa.',
  },
  text: {
    label: 'Estudo',
    session: 'study',
    description: 'Desenvolvimento do assunto em leitura editorial.',
  },
  scripture: {
    label: 'Escritura',
    session: 'study',
    description: 'Texto bíblico e referência em primeiro plano.',
  },
  character: {
    label: 'Personagem',
    session: 'study',
    description: 'Pessoa bíblica, contexto e aprendizado.',
  },
  timeline: {
    label: 'Linha do tempo',
    session: 'study',
    description: 'Sequência de acontecimentos em ordem visual.',
  },
  reflection: {
    label: 'Reflexão',
    session: 'reflection',
    description: 'Pergunta pessoal com resposta privada.',
  },
  mission: {
    label: 'Missão',
    session: 'mission',
    description: 'Aplicação prática do aprendizado.',
  },
  prayer: {
    label: 'Oração',
    session: 'prayer',
    description: 'Momento contemplativo e oração guiada.',
  },
  quiz: {
    label: 'Perguntas',
    session: 'quiz',
    description: 'Verificação do aprendizado, uma pergunta por vez.',
  },
  video: {
    label: 'Vídeo',
    session: 'study',
    description: 'Conteúdo audiovisual complementar.',
  },
} satisfies Record<EbdEditorialBlock['type'], BlockVisualDefinition>;

function blockLabel(type: EbdEditorialBlock['type']) {
  return BLOCK_VISUALS[type].label;
}

function assertNeverBlock(value: never): never {
  throw new Error(`Tipo editorial sem interface: ${String(value)}`);
}



type LessonSessionKind =
  | 'opening'
  | 'study'
  | 'reflection'
  | 'mission'
  | 'prayer'
  | 'quiz';

interface LessonSession {
  kind: LessonSessionKind;
  label: string;
  blocks: EbdEditorialBlock[];
}

const SESSION_ORDER: Array<{
  kind: LessonSessionKind;
  label: string;
  types: EbdEditorialBlock['type'][];
}> = [
  { kind: 'opening', label: 'Abertura', types: ['hero'] },
  {
    kind: 'study',
    label: 'Estudo bíblico',
    types: ['text', 'scripture', 'character', 'timeline', 'video'],
  },
  { kind: 'reflection', label: 'Reflexão', types: ['reflection'] },
  { kind: 'mission', label: 'Missão', types: ['mission'] },
  { kind: 'prayer', label: 'Oração', types: ['prayer'] },
  { kind: 'quiz', label: 'Perguntas', types: ['quiz'] },
];

// Garantia adicional: todo tipo do registry precisa pertencer a uma sessão.
const BLOCK_TYPES_IN_SESSIONS = new Set(
  SESSION_ORDER.flatMap(session => session.types),
);

(Object.keys(BLOCK_VISUALS) as EbdEditorialBlock['type'][]).forEach(type => {
  if (!BLOCK_TYPES_IN_SESSIONS.has(type)) {
    throw new Error(`Tipo editorial sem sessão: ${type}`);
  }
});

function buildLessonSessions(day: EbdEditorialDay): LessonSession[] {
  const mapped = SESSION_ORDER.map(session => ({
    kind: session.kind,
    label: session.label,
    blocks: day.blocks.filter(block => session.types.includes(block.type)),
  }));

  // A abertura é uma etapa de orientação mesmo quando o conteúdo editorial
  // não traz um bloco hero explícito. As demais só aparecem quando existem.
  return mapped.filter(session =>
    session.kind === 'opening' ? true : session.blocks.length > 0,
  );
}

export function EditorialBlock({
  block,
  done,
  response,
  onDone,
  onResponse,
  onRewardQuizQuestion,
  rewardedQuizQuestions,
  suppressMedia = false,
}: {
  block: EbdEditorialBlock;
  done: boolean;
  response: string;
  onDone: () => void;
  onResponse: (value: string) => void;
  onRewardQuizQuestion: (questionRewardId: string) => Promise<void>;
  rewardedQuizQuestions: string[];
  suppressMedia?: boolean;
}) {
  const interactive = ['scripture', 'reflection', 'mission', 'quiz'].includes(block.type);
  const timelineItems = block.type === 'timeline'
    ? normalizeTimelineItems(block.content)
    : [];

  const [quizAnswers, setQuizAnswers] = useState<Record<string, number[]>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<string, boolean>>({});
  const [quizQuestionIndex, setQuizQuestionIndex] = useState(0);

  const toggleQuizAnswer = (
    questionId: string,
    optionIndex: number,
    multiple: boolean,
  ) => {
    setQuizSubmitted(current => ({ ...current, [questionId]: false }));
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

  const sameAnswers = (left: number[], right: number[]) =>
    left.length === right.length
    && left.every((value, index) => value === right[index]);

  const mediaVisible = !suppressMedia && Boolean(block.mediaUrl?.trim());

  if (block.type === 'hero') {
    return (
      <article className="ebd-v15-block ebd-v15-block--hero">
        {mediaVisible && (
          <img
            className="ebd-v15-hero-block__art"
            src={block.mediaUrl}
            alt={block.altText || ''}
          />
        )}

        <div className="ebd-v15-hero-block__veil" aria-hidden="true" />

        <div className="ebd-v15-hero-block__copy">
          <p className="ebd-v15-block__eyebrow">{blockLabel(block.type)}</p>
          <h3>{block.title}</h3>

          {block.reference && (
            <p className="ebd-v15-block__reference">{block.reference}</p>
          )}

          {block.content && (
            <p className="ebd-v15-block__body">{block.content}</p>
          )}
        </div>
      </article>
    );
  }

  if (block.type === 'scripture') {
    return (
      <article className="ebd-v15-block ebd-v15-block--scripture">
        <img className="ebd-match-leaf" src={leafArt} alt="" aria-hidden="true" />
        <div className="ebd-v15-block__icon" aria-hidden="true">
          <BookOpen size={25} />
        </div>

        <div className="ebd-v15-scripture__copy">
          <p className="ebd-v15-block__eyebrow">{blockLabel(block.type)}</p>
          <h3>{block.title}</h3>

          {block.reference && <p className="ebd-v15-scripture__reference">{block.reference}</p>}
          {block.content && (
            <blockquote>{block.content}</blockquote>
          )}

          {interactive && (
            <button
              type="button"
              className={`ebd-v15-inline-action ${done ? 'is-done' : ''}`}
              onClick={onDone}
            >
              <Check size={15} aria-hidden="true" />
              {done ? 'Leitura concluída' : 'Concluir leitura'}
            </button>
          )}
        </div>
      </article>
    );
  }

  if (block.type === 'character') {
    return (
      <article className="ebd-v15-block ebd-v15-block--character">
        {mediaVisible && (
          <div className="ebd-v15-character__media">
            <img src={block.mediaUrl} alt={block.altText || ''} />
          </div>
        )}

        <div className="ebd-v15-character__copy">
          <p className="ebd-v15-block__eyebrow">{blockLabel(block.type)}</p>
          <h3>{block.title}</h3>

          {block.reference && (
            <p className="ebd-v15-block__reference">{block.reference}</p>
          )}

          {block.content && (
            <p className="ebd-v15-block__body">{block.content}</p>
          )}
        </div>
      </article>
    );
  }

  if (block.type === 'timeline') {
    return (
      <article className="ebd-v15-block ebd-v15-block--timeline">
        <img className="ebd-match-leaf" src={leafArt} alt="" aria-hidden="true" />
        <header className="ebd-v15-block__header">
          <div className="ebd-v15-block__icon" aria-hidden="true">
            <Lightbulb size={24} />
          </div>
          <div>
            <h3>{block.title}</h3>
          </div>
        </header>

        {block.reference && (
          <p className="ebd-v15-block__reference">{block.reference}</p>
        )}

        <div className="ebd-v15-timeline">
          {(timelineItems.length > 0
            ? timelineItems
            : [{
                id: 'single',
                title: 'Contexto',
                content: block.content || '',
              }]
          ).map((item, index) => (
            <div key={item.id} className="ebd-v15-timeline__item">
              <span aria-hidden="true">{index + 1}</span>
              <div>
                <strong>{item.title}</strong>
                {item.content && <p>{item.content}</p>}
              </div>
            </div>
          ))}
        </div>
      </article>
    );
  }

  if (block.type === 'reflection') {
    return (
      <article className="ebd-v15-block ebd-v15-block--reflection">
        <header className="ebd-v15-block__header">
          <div className="ebd-v15-block__icon" aria-hidden="true">
            <Lightbulb size={26} />
          </div>
          <div>
            <p className="ebd-v15-block__eyebrow">{blockLabel(block.type)}</p>
            <h3>{block.title}</h3>
          </div>
        </header>

        {block.content && (
          <p className="ebd-v15-block__body">{block.content}</p>
        )}

        {block.prompt && (
          <p className="ebd-v15-reflection__prompt">{block.prompt}</p>
        )}

        <label className="ebd-v15-reflection__field">
          <span>Sua reflexão <span>(opcional)</span></span>
          <textarea
            value={response}
            maxLength={1000}
            onChange={event => onResponse(event.target.value)}
            placeholder="Escreva sua reflexão. Ela permanece privada."
          />
          <small className="ebd-match-response-count">{response.length}/1000</small>
        </label>

        <p className="ebd-match-private"><LockKeyhole size={13} /> Sua resposta é privada</p>

        <button
          type="button"
          className={`ebd-v15-full-action ${done ? 'is-done' : ''}`}
          onClick={onDone}
        >
          <Check size={17} aria-hidden="true" />
          {done ? 'Reflexão concluída' : 'Marcar como refletido'}
          <ChevronRight size={17} aria-hidden="true" />
        </button>
      </article>
    );
  }

  if (block.type === 'mission') {
    const generosity = /generosidade/i.test(block.title);
    const actions = generosity ? [
      { title: 'Ajude alguém de forma discreta', description: 'Faça algo por alguém que precisa, sem divulgar e sem esperar reconhecimento.' },
      { title: 'Doe algo sem esperar retorno', description: 'Contribua com tempo, recursos ou talentos, com um coração livre.' },
      { title: 'Sirva com gratidão', description: 'Coloque seus dons a serviço, agradecendo a Deus pela oportunidade de abençoar outras pessoas.' },
    ] : splitEditorialLines(block.prompt).map(title => ({ title, description: '' }));
    let selected: number[] = [];
    try { const parsed = JSON.parse(response || '[]'); if (Array.isArray(parsed)) selected = parsed.filter(value => Number.isInteger(value)); } catch { /* resposta anterior em texto */ }
    return (
      <article className="ebd-v15-block ebd-v15-block--mission">
        <div className="ebd-v15-mission__flare" aria-hidden="true" />

        <header className="ebd-v15-block__header">
          <div className="ebd-v15-block__icon" aria-hidden="true">
            <Target size={27} />
          </div>
          <div>
            <p className="ebd-v15-block__eyebrow">{blockLabel(block.type)}</p>
            <h3>{block.title}</h3>
          </div>
        </header>

        {block.content && (
          <p className="ebd-v15-block__body">{block.content}</p>
        )}

        {block.prompt && (
          <p className="ebd-v15-mission__prompt">{block.prompt}</p>
        )}

        {actions.length > 0 && <>
          <h3>Coloque em prática</h3>
          <p className="ebd-v15-block__body">Escolha atitudes simples para viver esta missão durante a semana.</p>
          <div className="ebd-match-mission-list">{actions.map((action, i) => {
            const Icon = [Users, Heart, Hand][i % 3];
            return <label key={action.title}><input type="checkbox" checked={selected.includes(i)} onChange={() => onResponse(JSON.stringify(selected.includes(i) ? selected.filter(value => value !== i) : [...selected, i]))} /><span className="ebd-match-icon"><Icon size={24} /></span><span><strong>{action.title}</strong>{action.description && <p>{action.description}</p>}</span></label>;
          })}</div>
          <div className="ebd-match-callout ebd-match-callout--green">
            <span className="ebd-match-callout__icon">
              <Sprout size={22} />
            </span>
            <div>
              <strong>Você faz a diferença!</strong>
              <p>Cada gesto de generosidade sem barganha espalha o amor de Cristo e edifica o Seu Reino.</p>
            </div>
          </div>
        </>}

        <button
          type="button"
          className={`ebd-v15-mission__action ${done ? 'is-done' : ''}`}
          onClick={onDone}
        >
          <span>
            {done ? <Check size={17} aria-hidden="true" /> : <Flag size={18} aria-hidden="true" />}
          </span>
          {done ? 'Missão concluída' : 'Concluir missão'}
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </article>
    );
  }

  if (block.type === 'prayer') {
    return (
      <>
      <article className="ebd-v15-block ebd-v15-block--prayer">
        <img className="ebd-match-leaf" src={leafArt} alt="" aria-hidden="true" />
        <div className="ebd-v15-prayer__icon" aria-hidden="true">
          <Hand size={23} />
        </div>

        <div className="ebd-v15-prayer__copy">
          <p className="ebd-v15-block__eyebrow">{blockLabel(block.type)}</p>
          <h3>Oração guiada</h3>

          {block.content && (
            <p className="ebd-v15-prayer__text">{block.content}</p>
          )}

          {block.reference && (
            <p className="ebd-v15-block__reference">{block.reference}</p>
          )}
        </div>
      </article>
      {block.prompt && <article className="ebd-v15-block ebd-match-prayer-intentions"><img className="ebd-match-leaf" src={leafArt} alt="" aria-hidden="true" /><h3>Ore também por:</h3><ol>{splitEditorialLines(block.prompt).map(line => <li key={line}>{line}</li>)}</ol></article>}
      </>
    );
  }

  if (block.type === 'video') {
    return (
      <article className="ebd-v15-block ebd-v15-block--video">
        <header className="ebd-v15-block__header">
          <div className="ebd-v15-block__icon" aria-hidden="true">
            <Video size={20} />
          </div>
          <div>
            <p className="ebd-v15-block__eyebrow">{blockLabel(block.type)}</p>
            <h3>{block.title}</h3>
          </div>
        </header>

        {block.mediaUrl ? (
          <video
            controls
            preload="metadata"
            src={block.mediaUrl}
            className="ebd-v15-video__frame"
          />
        ) : (
          <div className="ebd-v15-video__placeholder">
            <Play size={25} aria-hidden="true" />
            <span>Conteúdo em produção</span>
          </div>
        )}

        {block.content && (
          <p className="ebd-v15-block__body">{block.content}</p>
        )}
      </article>
    );
  }

  if (block.type === 'quiz') {
    const questions = getQuizSettings(block).questions;
    const safeQuestionIndex = Math.min(
      quizQuestionIndex,
      Math.max(questions.length - 1, 0),
    );
    const question = questions[safeQuestionIndex];

    if (!question) {
      return (
        <article className="ebd-v15-block ebd-v15-block--quiz">
          <header className="ebd-v15-block__header">
            <div className="ebd-v15-block__icon" aria-hidden="true">
              <Check size={20} />
            </div>
            <div>
              <p className="ebd-v15-block__eyebrow">Perguntas</p>
              <h3>{block.title}</h3>
            </div>
          </header>
          <div className="ebd-v15-quiz__empty">
            Nenhuma pergunta configurada neste quiz.
          </div>
        </article>
      );
    }

    const selectedAnswers = quizAnswers[question.id] ?? [];
    const submitted = quizSubmitted[question.id] ?? false;
    const multiple = question.selectionMode === 'multiple';
    const correct = sameAnswers(
      selectedAnswers,
      [...question.correctAnswers].sort((a, b) => a - b),
    );
    const lastQuestion = safeQuestionIndex === questions.length - 1;

    return (
      <article className="ebd-v15-block ebd-v15-block--quiz ebd-v16-quiz">
        <header className="ebd-v16-quiz__head">
          <div className="ebd-v16-quiz__icon" aria-hidden="true"><CircleHelp size={32} /></div>
          <div>
            <p className="ebd-v15-block__eyebrow">
              Pergunta {safeQuestionIndex + 1} de {questions.length}
            </p>
            <h3>{question.prompt}</h3>
          </div>
        </header>

        {block.content && safeQuestionIndex === 0 && (
          <p className="ebd-v15-block__body">{block.content}</p>
        )}

        <div className="ebd-v15-quiz__options ebd-v16-quiz__options">
          {question.options.map((option, optionIndex) => {
            const inputType = multiple ? 'checkbox' : 'radio';
            const checked = selectedAnswers.includes(optionIndex);

            return (
              <label
                key={`${question.id}-${optionIndex}`}
                className={checked ? 'is-selected' : ''}
              >
                <input
                  type={inputType}
                  name={question.id}
                  checked={checked}
                  onChange={() =>
                    toggleQuizAnswer(question.id, optionIndex, multiple)
                  }
                />
                <span>{option}</span>
              </label>
            );
          })}
        </div>

        {!submitted ? (
          <button
            type="button"
            className="ebd-v16-quiz__verify"
            onClick={() => {
              setQuizSubmitted(current => ({
                ...current,
                [question.id]: true,
              }));

              if (correct) {
                void onRewardQuizQuestion(`${block.id}:${question.id}`);
              }
            }}
            disabled={selectedAnswers.length === 0}
          >
            <span><Check size={17} aria-hidden="true" /></span>
            Verificar resposta
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        ) : (
          <div
            className={`ebd-v15-quiz__feedback ${
              correct ? 'is-correct' : 'is-wrong'
            }`}
          >
            <strong>
              {correct ? 'Resposta correta' : 'Resposta incorreta'}
            </strong>

            {question.explanation && <p>{question.explanation}</p>}

            {correct && rewardedQuizQuestions.includes(
              `${block.id}:${question.id}`,
            ) && (
              <small>
                +{KESEF_VALORES.QUIZ_ACERTO} Kesef · +{XP_ACOES.QUIZ} XP
              </small>
            )}
          </div>
        )}

        {submitted && correct && (
          <button
            type="button"
            className="ebd-v16-quiz__next"
            onClick={() => {
              if (lastQuestion) {
                if (!done) onDone();
                return;
              }
              setQuizQuestionIndex(current => current + 1);
            }}
          >
            {lastQuestion ? 'Concluir perguntas' : 'Próxima pergunta'}
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        )}
      </article>
    );
  }

  if (block.type === 'text') {
    return (
      <article className="ebd-v15-block ebd-v15-block--text">
        <header className="ebd-v15-block__header">
          <div className="ebd-v15-block__icon" aria-hidden="true">
            <FileText size={20} />
          </div>
          <div>
            <p className="ebd-v15-block__eyebrow">Estudo</p>
            <h3>{block.title}</h3>
          </div>
        </header>

        {block.reference && (
          <p className="ebd-v15-block__reference">{block.reference}</p>
        )}

        {block.content && (
          <div className="ebd-v16-text-reading">
            {block.content
              .split(/\n{2,}/)
              .map(paragraph => paragraph.trim())
              .filter(Boolean)
              .map(paragraph => (
                <p key={paragraph.slice(0, 48)}>{paragraph}</p>
              ))}
          </div>
        )}
      </article>
    );
  }

  return assertNeverBlock(block.type);
}

export default function EbdJourney({
  lesson,
  isAdmin = false,
}: {
  lesson: EbdEditorialLesson;
  isAdmin?: boolean;
}) {
  const toast = useToast();
  const [dayIndex, setDayIndex] = useState<number | null>(null);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [progress, setProgress] = useState<ProgressState>(() =>
    readProgress(lesson.id),
  );
  const hydratedRef = useRef(false);

  const required = lesson.document.days.map(day =>
    day.blocks.filter(block => block.required).map(block => block.id),
  );
  const totalRequiredBlocks = required.flat().length;
  const coverImageUrl = getEditorialCoverImage(lesson.document);

  const dayIsComplete = (index: number) => {
    const ids = required[index] ?? [];
    if (ids.length === 0) {
      return progress.rewardedDays.includes(lesson.document.days[index]?.id);
    }
    return ids.every(id => progress.completedBlocks.includes(id));
  };

  const completedDays = lesson.document.days.filter((_, index) =>
    dayIsComplete(index),
  ).length;

  useEffect(() => {
    let active = true;

    getEbdProgress(lesson.id, lesson.version)
      .then(remote => {
        if (!active || !remote) return;

        const merged: ProgressState = {
          completedBlocks: [
            ...new Set([
              ...progress.completedBlocks,
              ...remote.completedBlocks,
            ]),
          ],
          responses: { ...progress.responses, ...remote.responses },
          rewardedDays: [
            ...new Set([...progress.rewardedDays, ...remote.rewardedDays]),
          ],
          rewardedQuizQuestions: [
            ...new Set([
              ...progress.rewardedQuizQuestions,
              ...remote.rewardedQuizQuestions,
            ]),
          ],
          currentDayId: remote.currentDayId || progress.currentDayId,
          currentBlockId: remote.currentBlockId || progress.currentBlockId,
        };

        setProgress(merged);
        localStorage.setItem(progressKey(lesson.id), JSON.stringify(merged));
      })
      .catch(() => undefined)
      .finally(() => {
        hydratedRef.current = true;
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id, lesson.version]);

  useEffect(() => {
    if (!hydratedRef.current) return;

    const timer = setTimeout(() => {
      void saveEbdProgress(
        lesson.id,
        lesson.version,
        progress,
        totalRequiredBlocks,
      ).catch(() => undefined);
    }, 700);

    return () => clearTimeout(timer);
  }, [
    lesson.id,
    lesson.version,
    progress,
    totalRequiredBlocks,
  ]);

  const persist = (next: ProgressState) => {
    setProgress(next);
    localStorage.setItem(progressKey(lesson.id), JSON.stringify(next));
  };

  const openDay = (index: number) => {
    const day = lesson.document.days[index];
    if (!day || !isAvailable(lesson, day)) return;

    const pendingBlock = day.blocks.find(
      block => !progress.completedBlocks.includes(block.id),
    );
    const currentBlockId =
      progress.currentDayId === day.id
        ? progress.currentBlockId
        : pendingBlock?.id ?? day.blocks[0]?.id ?? null;

    persist({
      ...progress,
      currentDayId: day.id,
      currentBlockId,
    });
    setSessionIndex(-1);
    setDayIndex(index);
  };

  const rewardDayCompletion = async (day: EbdEditorialDay) => {
    if (progress.rewardedDays.includes(day.id)) return;

    try {
      await Promise.all([
        creditarKesef(
          'licao',
          KESEF_VALORES.LICAO_CONCLUIDA,
          `${lesson.id}:${day.id}`,
        ),
        creditarXp(XP_ACOES.LICAO, `${lesson.id}:${day.id}`),
      ]);

      const next = {
        ...progress,
        rewardedDays: [...progress.rewardedDays, day.id],
      };

      persist(next);
      toast.success(
        `${day.label} concluído · +${KESEF_VALORES.LICAO_CONCLUIDA} Kesef · +${XP_ACOES.LICAO} XP`,
      );
    } catch {
      toast.error(
        'O dia foi concluído, mas a recompensa não pôde ser registrada agora.',
      );
    }
  };

  const rewardQuizQuestion = async (rewardId: string) => {
    if (progress.rewardedQuizQuestions.includes(rewardId)) return;

    try {
      await Promise.all([
        creditarKesef(
          'quiz_acerto',
          KESEF_VALORES.QUIZ_ACERTO,
          `${lesson.id}:${rewardId}`,
        ),
        creditarXp(XP_ACOES.QUIZ, `${lesson.id}:${rewardId}`),
      ]);

      persist({
        ...progress,
        rewardedQuizQuestions: [
          ...progress.rewardedQuizQuestions,
          rewardId,
        ],
      });
    } catch {
      toast.error(
        'A resposta foi validada, mas a recompensa do quiz não pôde ser registrada agora.',
      );
    }
  };

  const toggleBlockCompletion = (
    day: EbdEditorialDay,
    blockId: string,
  ) => {
    const exists = progress.completedBlocks.includes(blockId);
    const completedBlocks = exists
      ? progress.completedBlocks.filter(id => id !== blockId)
      : [...progress.completedBlocks, blockId];

    const next = { ...progress, completedBlocks };
    persist(next);

    const requiredIds = day.blocks
      .filter(block => block.required)
      .map(block => block.id);
    const completedNow =
      requiredIds.length > 0
      && requiredIds.every(id => completedBlocks.includes(id));
    const rewardedAlready = next.rewardedDays.includes(day.id);

    if (!exists && completedNow && !rewardedAlready) {
      void rewardDayCompletion(day);
    }
  };

  const availableIndexes = lesson.document.days
    .map((day, index) => ({ day, index }))
    .filter(item => isAvailable(lesson, item.day))
    .map(item => item.index);

  const firstPending = lesson.document.days.findIndex(
    (day, index) =>
      isAvailable(lesson, day) && !dayIsComplete(index),
  );
  const continueIndex =
    firstPending >= 0
      ? firstPending
      : (availableIndexes[0] ?? 0);
  const continueDay =
    lesson.document.days[continueIndex] ?? lesson.document.days[0];
  const continueLead =
    continueDay ? getLeadBlock(continueDay) : null;
  const weeklyPercent = Math.round((completedDays / 7) * 100);

  if (dayIndex !== null) {
    const day = lesson.document.days[dayIndex];
    const available = isAvailable(lesson, day);
    const leadBlock = getLeadBlock(day);
    const sessions = buildLessonSessions(day);
    const safeSessionIndex = Math.max(0, Math.min(
      sessionIndex,
      Math.max(sessions.length - 1, 0),
    ));
    const activeSession = sessions[safeSessionIndex];
    const nextSession = sessions[safeSessionIndex + 1];

    const activeRequired = activeSession?.blocks.filter(block => block.required) ?? [];
    const activeInteractiveRequired = activeRequired.filter(block =>
      ['reflection', 'mission', 'quiz'].includes(block.type),
    );
    const activeInteractiveComplete = activeInteractiveRequired.every(block =>
      progress.completedBlocks.includes(block.id),
    );

    const completePassiveSessionBlocks = () => {
      if (!activeSession) return progress;

      const passiveIds = activeSession.blocks
        .filter(block => !['reflection', 'mission', 'quiz'].includes(block.type))
        .map(block => block.id);
      const completedBlocks = [
        ...new Set([...progress.completedBlocks, ...passiveIds]),
      ];

      const next: ProgressState = {
        ...progress,
        completedBlocks,
        currentDayId: day.id,
        currentBlockId: nextSession?.blocks[0]?.id ?? null,
      };

      persist(next);
      return next;
    };

    const advanceSession = () => {
      if (!activeSession) return;

      if (!activeInteractiveComplete) {
        toast.info('Conclua a atividade desta sessão para continuar.');
        return;
      }

      const nextProgress = completePassiveSessionBlocks();

      if (nextSession) {
        setSessionIndex(current => current + 1);
        requestAnimationFrame(() => {
          document
            .querySelector('.ebd-v16-session-page')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        return;
      }

      const requiredIds = required[dayIndex] ?? [];
      const completedAfterSession = new Set(nextProgress.completedBlocks);
      const allRequiredComplete = requiredIds.every(id =>
        completedAfterSession.has(id),
      );

      if (!allRequiredComplete) {
        toast.info('Ainda existe uma atividade obrigatória nesta jornada.');
        return;
      }

      if (!nextProgress.rewardedDays.includes(day.id)) {
        void rewardDayCompletion(day);
      }
      setDayIndex(null);
      setSessionIndex(0);
    };

    const renderSessionBlocks = () => {
      if (!activeSession) return null;

      return activeSession.blocks.map(block => (
        <EditorialBlock
          key={block.id}
          block={block}
          suppressMedia={activeSession.kind === 'opening' && leadBlock?.id === block.id}
          done={progress.completedBlocks.includes(block.id)}
          response={progress.responses[block.id] ?? ''}
          onDone={() => toggleBlockCompletion(day, block.id)}
          onResponse={value =>
            persist({
              ...progress,
              responses: {
                ...progress.responses,
                [block.id]: value,
              },
            })
          }
          onRewardQuizQuestion={rewardQuizQuestion}
          rewardedQuizQuestions={progress.rewardedQuizQuestions}
        />
      ));
    };

    if (!available) {
      return (
        <div className="ebd-v14-page ebd-v14-day-page">
          <EbdBrandHeader leaf={brandLeafLight} />
          <button
            type="button"
            className="ebd-v14-back"
            onClick={() => setDayIndex(null)}
          >
            <ArrowLeft size={17} aria-hidden="true" />
            Jornada
          </button>
          <section className="ebd-v14-card ebd-v14-locked">
            <LockKeyhole size={30} aria-hidden="true" />
            <h2>Conteúdo programado</h2>
            <p>
              {day.unlocksAt
                ? `Disponível em ${new Date(day.unlocksAt).toLocaleString(
                    'pt-BR',
                    { dateStyle: 'long', timeStyle: 'short' },
                  )}.`
                : 'Aguardando liberação editorial.'}
            </p>
          </section>
        </div>
      );
    }

    return (
      <EbdLessonView
        lesson={lesson}
        day={day}
        sessions={sessions}
        index={sessionIndex}
        currentBlockId={progress.currentBlockId}
        completedBlocks={progress.completedBlocks}
        onBack={() => setDayIndex(null)}
        onSelect={index => {
          setSessionIndex(index);
          if (index >= 0) persist({ ...progress, currentDayId: day.id, currentBlockId: sessions[index]?.blocks[0]?.id ?? null });
          document.querySelector('.app-shell__main')?.scrollTo({ top: 0 });
        }}
        onAdvance={advanceSession}
        onFinish={() => {
          if (!(required[dayIndex] ?? []).every(id => progress.completedBlocks.includes(id))) return;
          if (!progress.rewardedDays.includes(day.id)) void rewardDayCompletion(day);
          setDayIndex(null);
        }}
        canAdvance={activeSession?.kind === 'opening' || activeSession?.kind === 'study' || activeSession?.kind === 'prayer' || activeInteractiveComplete}
      >
        {renderSessionBlocks()}
      </EbdLessonView>
    );
  }

  return (
    <div className="ebd-v14-page ebd-v14-overview">
      <EbdBrandHeader leaf={brandLeafLight} />

      <section className="ebd-v14-intro">
        <div>
          <h1>EBD</h1>
          <p>Aprenda, acompanhe e viva a Palavra.</p>
        </div>

        <DecorativeMotto leaf={brandLeafLight} />
      </section>

      <section className="ebd-v14-feature-card">
        <div className="ebd-v14-feature-card__cover">
          {coverImageUrl ? (
            <img src={coverImageUrl} alt={`Capa da lição ${lesson.number}`} />
          ) : (
            <BookOpen size={34} aria-hidden="true" />
          )}
        </div>

        <div className="ebd-v14-feature-card__content">
          <p>Escola Bíblica Digital · Lição {lesson.number}</p>
          <h2>Nova lição {lesson.number}</h2>
          <h3>{lesson.title}</h3>
          <span className="ebd-v14-gold-line" aria-hidden="true" />

          <button
            type="button"
            className="ebd-v14-access-lesson"
            onClick={() => openDay(continueIndex)}
            disabled={!continueDay || !isAvailable(lesson, continueDay)}
          >
            <span>
              <BookOpen size={21} aria-hidden="true" />
            </span>
            Acessar lição
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>

        {coverImageUrl && (
          <img
            className="ebd-v14-feature-card__ambient"
            src={coverImageUrl}
            alt=""
            aria-hidden="true"
          />
        )}
      </section>

      {isAdmin && (
        <InstitutionalAction
          to="/admin/ebd-studio"
          icon={<Grid2X2 size={18} />}
          className="ebd-v14-studio-link"
        >
          Abrir Estúdio Editorial
        </InstitutionalAction>
      )}

      <section className="ebd-v14-card ebd-v14-continue-card">
        <div className="ebd-v14-continue-card__copy">
          <p>Continuar jornada</p>
          <h2>{continueDay?.title || 'Conteúdo da semana'}</h2>
          <span>
            <Clock3 size={15} aria-hidden="true" />
            {continueDay?.label || 'EBD'}
            {' · '}
            {continueDay?.estimatedMinutes || 0} min
          </span>

          <button
            type="button"
            onClick={() => openDay(continueIndex)}
            disabled={!continueDay || !isAvailable(lesson, continueDay)}
          >
            <i aria-hidden="true">
              <Play size={13} fill="currentColor" />
            </i>
            Continuar jornada
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="ebd-v14-continue-card__visual">
          {continueLead?.mediaUrl || coverImageUrl ? (
            <img
              src={continueLead?.mediaUrl || coverImageUrl}
              alt=""
              aria-hidden="true"
            />
          ) : (
            <BookOpen size={30} aria-hidden="true" />
          )}
        </div>
      </section>

      <section
        className="ebd-v14-card ebd-v14-week-progress"
        aria-labelledby="ebd-v14-progress-title"
      >
        <div className="ebd-v14-week-progress__head">
          <h2 id="ebd-v14-progress-title">Progresso semanal</h2>
          <strong>{weeklyPercent}%</strong>
        </div>

        <div className="ebd-v14-week-progress__days">
          {lesson.document.days.map((day, index) => {
            const complete = dayIsComplete(index);
            const available = isAvailable(lesson, day);

            return (
              <button
                key={day.id}
                type="button"
                onClick={() => openDay(index)}
                disabled={!available}
                className={[
                  complete ? 'is-complete' : '',
                  available && !complete ? 'is-current' : '',
                ].filter(Boolean).join(' ')}
              >
                <span>
                  {complete ? (
                    <Check size={17} aria-hidden="true" />
                  ) : available ? (
                    <i aria-hidden="true" />
                  ) : null}
                </span>
                <small>{day.label.slice(0, 3)}</small>
              </button>
            );
          })}
        </div>
      </section>

      <Link to="/guia" className="ebd-v14-help-card">
        <span aria-hidden="true">
          <Lightbulb size={22} />
        </span>
        <strong>Como usar esta tela</strong>
        <ChevronRight size={19} aria-hidden="true" />
      </Link>
    </div>
  );
}

function EbdBrandHeader({ leaf }: { leaf: string }) {
  return (
    <div className="ebd-v14-brand-row">
      <div className="ebd-v14-brand">
        <img src={leaf} alt="" aria-hidden="true" />
        <div>
          <strong>Comunhão</strong>
          <small>Juntos em uma caminhada com Deus</small>
        </div>
      </div>
    </div>
  );
}

function DecorativeMotto({ leaf }: { leaf: string }) {
  return (
    <div className="ebd-v14-motto" aria-hidden="true">
      <img src={leaf} alt="" />
      <span>
        Mais conhecimento.<br />
        Mais vida<br />
        com Deus.
      </span>
      <i />
    </div>
  );
}
