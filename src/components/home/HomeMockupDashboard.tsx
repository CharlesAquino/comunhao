import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Hand,
  Play,
  Plus,
  ShoppingBag,
  Users,
  Target,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DashboardData } from '../../types';
import type { ConviteOracao } from '../../services/conviteService';
import type { EbdSyncedProgress } from '../../services/ebdProgressService';
import type {
  EbdEditorialDay,
  EbdEditorialLesson,
  EbdWeekday,
} from '../../types/ebdEditorial';
import { ROUTES } from '../../services/constants';
import studiesBibleLight from '../../assets/home-v12/studies-bible-clean-v1.png';
import studiesBibleDark from '../../assets/home-v12/studies-bible-clean-v1.png';
import resumeCaveLight from '../../assets/home-v12/mockup-resume-cave-light.png';
import resumeCaveDark from '../../assets/home-v12/mockup-resume-cave-dark.png';
import devotionalSproutLight from '../../assets/home-v12/devotional-sprout-clean-v1.png';
import devotionalSproutDark from '../../assets/home-v12/devotional-sprout-clean-v1.png';
import '../../styles/home-mockup-v12.css';
import floralInitialS from '../../assets/home-v12/mission-floral-s-clean-v1.png';

interface Props {
  data: DashboardData;
  editorialLesson: EbdEditorialLesson | null;
  lessonProgress: EbdSyncedProgress | null;
  sessoesAbertas: Record<string, string>;
  conviteEnviado: ConviteOracao | null;
  criandoSala: boolean;
  hasEstudosAccess: boolean;
  onNavigate: (path: string) => void;
  onMissionAction: () => void;
  onCancelMissionInvite: () => void;
  onJoinSession: (sessionId: string) => void;
}

const DAYS: { key: EbdWeekday; short: string }[] = [
  { key: 'monday', short: 'Seg' },
  { key: 'tuesday', short: 'Ter' },
  { key: 'wednesday', short: 'Qua' },
  { key: 'thursday', short: 'Qui' },
  { key: 'friday', short: 'Sex' },
  { key: 'saturday', short: 'Sáb' },
  { key: 'sunday', short: 'Dom' },
];

const JS_DAY_TO_EBD: EbdWeekday[] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

function isUnlocked(
  lesson: EbdEditorialLesson | null,
  day: EbdEditorialDay | undefined,
  now: number,
) {
  if (!lesson || !day || day.blocks.length === 0) return false;
  if (lesson.document.releaseMode === 'immediate') return true;
  const releaseAt = Date.parse(day.unlocksAt);
  return Number.isFinite(releaseAt) && releaseAt <= now;
}

function formatHomeDate(date: Date) {
  const value = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short', day: 'numeric', month: 'long',
  }).format(date);
  return value.charAt(0).toUpperCase() + value.slice(1).replace('.', '');
}

export default function HomeMockupDashboard({
  data,
  editorialLesson,
  lessonProgress,
  sessoesAbertas,
  conviteEnviado,
  criandoSala,
  hasEstudosAccess,
  onNavigate,
  onMissionAction,
  onCancelMissionInvite,
  onJoinSession,
}: Props) {
  const now = new Date();
  const nowTime = now.getTime();
  const todayKey = JS_DAY_TO_EBD[now.getDay()];

  const lessonDays = editorialLesson?.document.days ?? [];
  const validDays = lessonDays.filter(day => day.blocks.length > 0);
  const completed = new Set(
    (lessonProgress?.rewardedDays ?? []).filter(
      (day): day is EbdWeekday => DAYS.some(meta => meta.key === day),
    ),
  );

  const totalDays = validDays.length;
  const completedCount = validDays.filter(day => completed.has(day.day)).length;
  const progressPercent = totalDays > 0
    ? Math.round((completedCount / totalDays) * 100)
    : 0;

  const currentDay = lessonDays.find(day => day.day === todayKey && day.blocks.length > 0);
  const syncedDay = lessonProgress?.currentDayId
    ? lessonDays.find(day => day.id === lessonProgress.currentDayId)
    : undefined;
  const firstUnlocked = lessonDays.find(day => isUnlocked(editorialLesson, day, nowTime));
  const resumeDay = syncedDay ?? currentDay ?? firstUnlocked ?? validDays[0];

  const mission = data.missaoAtual;
  const hasMission = Boolean(mission?.id?.trim());
  const missionFirstName = hasMission
    ? mission.nome.trim().split(/\s+/)[0]
    : 'Aguardando';

  const lessonNumber = editorialLesson ? `Lição ${editorialLesson.number}` : 'EBD';
  const lessonTitle = editorialLesson?.title || 'Sua jornada na Palavra';
  const resumeTitle = resumeDay?.title || lessonTitle;
  const devotionalTitle = currentDay?.title || resumeDay?.title || lessonTitle;
  const devotionalReference = editorialLesson?.document.mainVerseReference || 'Palavra para hoje';

  return (
    <div className="home-v12-dashboard">
      <nav className="home-v12-quick-actions" aria-label="Acessos rápidos">
        <button type="button" className="home-v12-quick-action home-v12-quick-action--primary" onClick={() => onNavigate(ROUTES.ORACAO)}>
          <Hand size={22} aria-hidden="true" /><span>Orar</span>
        </button>
        <button type="button" className="home-v12-quick-action" onClick={() => onNavigate('/estudos')}>
          <BookOpen size={22} aria-hidden="true" /><span>Estudos</span>
        </button>
        <button type="button" className="home-v12-quick-action" onClick={() => onNavigate(ROUTES.LOJA)}>
          <ShoppingBag size={22} aria-hidden="true" /><span>Tesouro</span>
        </button>
        <button type="button" className="home-v12-quick-action" onClick={() => onNavigate(ROUTES.COMUNIDADE)}>
          <Users size={22} aria-hidden="true" /><span>Convidar</span>
        </button>
      </nav>

      <section className="home-v12-progress home-v12-surface" aria-labelledby="home-v12-progress-title">
        <button type="button" className="home-v12-progress__lesson" onClick={() => onNavigate(ROUTES.EBD)}>
          <span className="home-v12-progress__book" aria-hidden="true"><BookOpen size={21} /></span>
          <span><strong id="home-v12-progress-title">Progresso diário da lição</strong><small>{lessonNumber}</small></span>
        </button>

        <div className="home-v12-progress__days" aria-label="Progresso semanal">
          {DAYS.map(meta => {
            const day = lessonDays.find(item => item.day === meta.key);
            const dayCompleted = completed.has(meta.key);
            const unlocked = isUnlocked(editorialLesson, day, nowTime);
            const today = meta.key === todayKey;
            return (
              <button
                key={meta.key}
                type="button"
                className={['home-v12-progress__day', dayCompleted ? 'is-complete' : '', today ? 'is-today' : ''].filter(Boolean).join(' ')}
                onClick={() => unlocked && onNavigate(ROUTES.EBD)}
                disabled={!unlocked}
                aria-label={`${meta.short}: ${dayCompleted ? 'concluído' : unlocked ? 'disponível' : 'bloqueado'}`}
              >
                <span aria-hidden="true">{dayCompleted ? <Check size={12} /> : null}</span>
                <small>{meta.short}</small>
              </button>
            );
          })}
        </div>

        <strong className="home-v12-progress__count">{totalDays > 0 ? `${completedCount}/${totalDays}` : '—'}</strong>
      </section>

      <section className="home-v12-mission" aria-labelledby="home-v12-mission-title">
        <div className="home-v12-mission__copy">
          <p className="home-v12-eyebrow"><Target aria-hidden="true" />Missão da semana</p>
          <div className="home-v12-mission__title-row">
            <h2 id="home-v12-mission-title">{missionFirstName}</h2>
            <button
              type="button"
              className="home-v12-mission__action"
              onClick={onMissionAction}
              disabled={!hasMission || criandoSala || Boolean(conviteEnviado)}
              aria-label={!hasMission ? 'Aguardando sorteio da dupla da semana' : conviteEnviado ? `Convite para ${missionFirstName} enviado` : `Orar com ${missionFirstName}`}
            >
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="home-v12-mission__portrait">
          {mission?.avatar && hasMission
            ? <img src={mission.avatar} alt="" />
            : hasMission && mission.nome.charAt(0).toUpperCase() === 'S'
              ? <img src={floralInitialS} alt="" />
              : <span>{hasMission ? mission.nome.charAt(0) : '?'}</span>}
        </div>
        <p className="home-v12-mission__aside">{hasMission ? 'Interceda nesta semana' : 'Aguardando sorteio'}</p>
        {conviteEnviado && <button type="button" className="home-v12-mission__pending" onClick={onCancelMissionInvite}>Convite enviado · cancelar</button>}
      </section>

      <div className="home-v12-study-grid">
        <section className="home-v12-study-card home-v12-study-card--library" aria-labelledby="home-v12-studies-title">
          <img className="home-v12-study-card__art home-v12-theme-art home-v12-theme-art--light" src={studiesBibleLight} alt="" aria-hidden="true" loading="lazy" decoding="async" />
          <img className="home-v12-study-card__art home-v12-theme-art home-v12-theme-art--dark" src={studiesBibleDark} alt="" aria-hidden="true" loading="lazy" decoding="async" />
          <div className="home-v12-study-card__copy">
            <BookOpen size={22} aria-hidden="true" />
            <h2 id="home-v12-studies-title">Estudos</h2>
            <button type="button" className="home-v12-round-action" onClick={() => onNavigate('/estudos')} aria-label={hasEstudosAccess ? 'Acessar estudos' : 'Conhecer estudos'}>
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        </section>

        <section className="home-v12-study-card home-v12-study-card--resume" aria-labelledby="home-v12-resume-title">
          <div className="home-v12-resume__copy">
            <span className="home-v12-play" aria-hidden="true"><Play size={11} fill="currentColor" /></span>
            <p>Continuar</p>
            <h2 id="home-v12-resume-title">{resumeTitle}</h2>
            <div className="home-v12-mini-progress"><span><i style={{ width: `${progressPercent}%` }} /></span><strong>{progressPercent}%</strong></div>
          </div>
          <img className="home-v12-resume__art home-v12-theme-art home-v12-theme-art--light" src={resumeCaveLight} alt="" aria-hidden="true" loading="lazy" decoding="async" />
          <img className="home-v12-resume__art home-v12-theme-art home-v12-theme-art--dark" src={resumeCaveDark} alt="" aria-hidden="true" loading="lazy" decoding="async" />
          <button type="button" className="home-v12-resume__hit" onClick={() => onNavigate(ROUTES.EBD)} aria-label={`Continuar ${resumeTitle}`} />
        </section>
      </div>

      <section className="home-v12-lesson-strip home-v12-surface" aria-labelledby="home-v12-lesson-title">
        <span className="home-v12-lesson-strip__icon" aria-hidden="true"><BookOpen size={22} /></span>
        <div className="home-v12-lesson-strip__copy"><small>Acompanhamento da lição</small><h2 id="home-v12-lesson-title">{lessonNumber}</h2><p>{lessonTitle}</p></div>
        <div className="home-v12-lesson-strip__progress"><span><i style={{ width: `${progressPercent}%` }} /></span><strong>{progressPercent}%</strong></div>
        <button type="button" className="home-v12-pill-action" onClick={() => onNavigate(ROUTES.EBD)}>Continuar <ChevronRight size={16} aria-hidden="true" /></button>
      </section>

      <section className="home-v12-community home-v12-surface" aria-labelledby="home-v12-community-title">
        <div className="home-v12-community__heading">
          <div><Users size={20} aria-hidden="true" /><h2 id="home-v12-community-title">Nossa comunidade</h2></div>
          <button type="button" onClick={() => onNavigate(ROUTES.COMUNIDADE)}>Ver todos <ChevronRight size={15} aria-hidden="true" /></button>
        </div>

        <div className="home-v12-community__rail" role="list">
          <button type="button" className="home-v12-community__new" onClick={() => onNavigate(ROUTES.MURAL)}><span><Plus size={20} /></span><small>Novo</small></button>
          {data.mocidade.slice(0, 5).map(member => {
            const sessaoId = sessoesAbertas[member.id];
            return (
              <div key={member.id} className="home-v12-community__member" role="listitem">
                <Link to={ROUTES.PERFIL_USUARIO(member.id)} className="home-v12-community__profile" aria-label={`Abrir perfil de ${member.nome}`}>
                  <span className="home-v12-community__avatar">
                    {member.avatar ? <img src={member.avatar} alt="" /> : <b>{member.nome.charAt(0)}</b>}
                    {member.status_anel === 'disponivel' && <i aria-hidden="true" />}
                  </span>
                  <small>{member.nome.split(/\s+/)[0]}</small>
                </Link>
                {sessaoId && <button type="button" className="home-v12-community__pray" onClick={() => onJoinSession(sessaoId)} aria-label={`Juntar-se à oração de ${member.nome}`}><Hand size={9} aria-hidden="true" /></button>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="home-v12-devotional home-v12-surface" aria-labelledby="home-v12-devotional-title">
        <div className="home-v12-devotional__copy">
          <p className="home-v12-eyebrow">Palavra para hoje</p>
          <h2 id="home-v12-devotional-title">{devotionalTitle}</h2>
          <p>{devotionalReference}</p>
        </div>
        <time className="home-v12-devotional__date">{formatHomeDate(now)}</time>
        <img className="home-v12-devotional__art home-v12-theme-art home-v12-theme-art--light" src={devotionalSproutLight} alt="" aria-hidden="true" loading="lazy" decoding="async" />
        <img className="home-v12-devotional__art home-v12-theme-art home-v12-theme-art--dark" src={devotionalSproutDark} alt="" aria-hidden="true" loading="lazy" decoding="async" />
        <button type="button" className="home-v12-devotional__action" onClick={() => onNavigate(ROUTES.EBD)} aria-label="Abrir Palavra para hoje"><ArrowRight size={18} aria-hidden="true" /></button>
      </section>
    </div>
  );
}
