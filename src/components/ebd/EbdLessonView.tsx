import type { ReactNode } from 'react';
import { ArrowLeft, BookOpen, Check, ChevronRight, Clock3, FileText, Flag, Heart, Lightbulb, Play, Sprout, Target, HandHeart, CircleHelp } from 'lucide-react';
import type { EbdEditorialBlock, EbdEditorialDay, EbdEditorialLesson } from '../../types/ebdEditorial';
import brand from '../../assets/ebd-v14/brand-leaf-light.png';
import ministryArt from '../../assets/ebd-v17/hero-ministry.png';
import missionArt from '../../assets/ebd-v17/hero-mission.png';
import prayerArt from '../../assets/ebd-v17/hero-prayer.png';
import bibleArt from '../../assets/home-v12/studies-bible-clean-v1.png';
import valleyArt from '../../assets/home-v12/hero-cross-clean-v1.png';
import '../../styles/ebd-lesson-view.css';

export interface EbdSession {
  kind: 'opening' | 'study' | 'reflection' | 'mission' | 'prayer' | 'quiz';
  label: string;
  blocks: EbdEditorialBlock[];
}

const icons = { opening: BookOpen, study: FileText, reflection: Lightbulb, mission: Target, prayer: HandHeart, quiz: CircleHelp };
const illustrations = { opening: valleyArt, study: bibleArt, reflection: valleyArt, mission: missionArt, prayer: prayerArt, quiz: bibleArt };
const titles = { opening: 'Abertura', study: 'Texto bíblico', reflection: 'Reflexão', mission: 'Missão', prayer: 'Oração', quiz: 'Perguntas' };
const objectiveLabels = { study: 'Entender o ensino bíblico', reflection: 'Refletir sobre o verdadeiro sustento', mission: 'Aplicar à sua vida', opening: 'Conhecer a lição', prayer: 'Orar com propósito', quiz: 'Rever o aprendizado' };

export function EbdLessonView({ lesson, day, sessions, index, completedBlocks, currentBlockId, onSelect, onBack, onAdvance, onFinish, canAdvance, children }: {
  lesson: EbdEditorialLesson;
  day: EbdEditorialDay;
  sessions: EbdSession[];
  index: number;
  completedBlocks: string[];
  currentBlockId?: string | null;
  onSelect: (index: number) => void;
  onBack: () => void;
  onAdvance: () => void;
  onFinish: () => void;
  canAdvance: boolean;
  children?: ReactNode;
}) {
  const overview = index < 0;
  const session = sessions[Math.max(0, index)];
  const kind = session?.kind ?? 'opening';
  const opening = !overview && kind === 'opening';
  const lead = day.blocks.find(b => b.type === 'hero');
  const scripture = day.blocks.find(b => b.type === 'scripture');
  const ministry = /minist[eé]rio n[aã]o est[aá] [aà] venda/i.test(day.title);
  const blockMedia = session?.blocks.find(b => b.mediaUrl && b.type !== 'video')?.mediaUrl;
  const art = blockMedia || (ministry ? kind === 'mission' ? missionArt : kind === 'prayer' ? prayerArt : ministryArt : lead?.mediaUrl);
  const ref = scripture?.reference || lead?.reference || lesson.document.mainVerseReference;
  const activeTitle = kind === 'prayer' && !overview ? session?.blocks[0]?.title || day.title : day.title;
  const resumeIndex = Math.max(0, sessions.findIndex(s => s.blocks.some(b => b.id === currentBlockId)));
  const isComplete = (s: EbdSession) => s.blocks.length > 0 && s.blocks.every(b => completedBlocks.includes(b.id));
  const required = day.blocks.filter(b => b.required);
  const allDone = required.length > 0 && required.every(b => completedBlocks.includes(b.id));
  const next = sessions[index + 1];
  const objectives = sessions.filter(s => ['study', 'reflection', 'mission'].includes(s.kind));
  const description = (s: EbdSession) => s.kind === 'opening' ? day.subtitle
    : s.kind === 'study' ? ref
    : s.blocks[0]?.prompt || s.blocks[0]?.content || s.blocks[0]?.title || '';

  const stepper = (labels: boolean) => (
    <nav className={`ebd-match-steps ${labels ? 'ebd-match-steps--labels' : ''}`} aria-label="Sessões da lição">
      {sessions.map((s, i) => <button key={s.kind} type="button" onClick={() => onSelect(i)} aria-label={`Sessão ${i + 1}: ${titles[s.kind]}`} aria-current={i === (overview ? resumeIndex : index) ? 'step' : undefined} className={`${isComplete(s) ? 'is-complete' : ''} ${i === (overview ? resumeIndex : index) ? 'is-current' : ''}`}>
        <span>{isComplete(s) ? <Check size={14} /> : i + 1}</span>
        {labels && <small>{s.kind === 'study' ? 'Texto' : titles[s.kind]}</small>}
      </button>)}
    </nav>
  );

  return <div className={`ebd-match ebd-match--${overview ? 'overview' : kind}`}>
    <header className="ebd-match-brand"><img src={brand} alt="" /><div><strong>Comunhão</strong><small>MAIS DE DEUS<br />NO SEU DIA</small></div></header>
    <section className="ebd-match-hero">
      {art && <img className="ebd-match-hero__art" src={art} alt="" decoding="async" />}
      <button type="button" className="ebd-match-back" onClick={overview ? onBack : () => onSelect(-1)}><ArrowLeft size={20} />{overview ? <span className="ebd-match-eyebrow">EBD · {day.label}</span> : 'Jornada'}</button>
      {opening && <p className="ebd-match-eyebrow ebd-match-session-kicker">Sessão 1 de {sessions.length} · <span>Abertura</span></p>}
      <div className="ebd-match-hero__copy">
        {!overview && !opening && <p className="ebd-match-eyebrow">{kind === 'reflection' || kind === 'prayer' ? day.title : `EBD · ${day.label}`}</p>}
        {kind === 'reflection' && !overview ? <h1 className="ebd-match-reflection-heading">Sessão {index + 1} de {sessions.length} · Reflexão</h1> : <>
          {kind === 'prayer' && !overview && <p className="ebd-match-session-label">Sessão {index + 1} de {sessions.length} · Oração</p>}
          <h1>{ministry && kind !== 'prayer' ? <>Ministério<br /><span className="ebd-match-title-line">não está à venda</span></> : activeTitle}</h1>
          <p className="ebd-match-hero__summary">{!overview && kind === 'prayer' ? session?.blocks[0]?.prompt || day.subtitle : day.subtitle}</p>
        </>}
        {(overview || opening) && <div className="ebd-match-meta"><span><Clock3 />{day.estimatedMinutes} minutos de leitura</span>{ref && <span><BookOpen />{ref}</span>}</div>}
        {opening && lesson.document.mainVerseSummary && <blockquote className="ebd-match-opening-quote">“{lesson.document.mainVerseSummary}”<cite>{lesson.document.mainVerseReference}</cite></blockquote>}
        {overview && <button className="ebd-match-start" onClick={() => onSelect(resumeIndex)}><span><Play size={15} fill="currentColor" /></span>{resumeIndex ? 'Continuar jornada da lição' : 'Iniciar jornada da lição'}<ChevronRight size={18} /></button>}
      </div>
      {!overview && !opening && !['prayer', 'reflection'].includes(kind) && <p className="ebd-match-session-label ebd-match-session-label--bottom">Sessão {index + 1} de {sessions.length} · <strong>{titles[kind]}</strong></p>}
    </section>

    {overview ? <>
      <section className="ebd-match-progress ebd-match-paper"><div><h2>Sua jornada nesta lição</h2><span>{resumeIndex + 1} de {sessions.length} etapas</span></div>{stepper(true)}</section>
      <div className="ebd-match-timeline">{sessions.map((s, i) => {const Icon = icons[s.kind];return <div className="ebd-match-timeline__row" key={s.kind}><span className="ebd-match-timeline__number">{isComplete(s) ? <Check size={13} /> : i + 1}</span><button onClick={() => onSelect(i)} className="ebd-match-paper"><img className="ebd-match-timeline__art" src={s.blocks.find(b => b.type !== 'video' && b.mediaUrl)?.mediaUrl || illustrations[s.kind]} alt="" /><span className="ebd-match-icon"><Icon /></span><span className="ebd-match-timeline__copy"><strong>{titles[s.kind]}</strong><small>{description(s)}</small></span><span className="ebd-match-round"><ChevronRight size={18} /></span></button></div>;})}</div>
      <section className="ebd-match-finish"><Flag size={25} /><div><h2>Conclua a lição de hoje</h2><p>Sirvamos a Deus com um coração íntegro.</p></div><button disabled={!allDone} onClick={onFinish} title={allDone ? 'Finalizar lição' : 'Conclua as atividades obrigatórias'}>Finalizar lição <ChevronRight size={16} /></button></section>
    </> : <>
      {['study', 'quiz'].includes(kind) && <div className="ebd-match-progress">{stepper(false)}</div>}
      {opening ? <section className="ebd-match-objectives ebd-match-paper"><h2>Nesta lição, você vai:</h2>{objectives.map((s, i) => {const Icon = [BookOpen, Sprout, Heart][i] ?? BookOpen;return <article key={s.kind}><span className="ebd-match-icon"><Icon /></span><div><h3>{ministry && s.kind === 'study' ? 'Entender o que é a simonia' : objectiveLabels[s.kind]}</h3><p>{description(s)}</p></div></article>;})}</section> : <div className={`ebd-match-content ebd-match-content--${kind}`}>{children}</div>}
      {canAdvance && <button className="ebd-match-next" onClick={onAdvance}><span className="ebd-match-round"><Play size={17} fill="currentColor" /></span><span><strong>{kind === 'opening' ? 'Continuar jornada' : kind === 'prayer' ? 'Ore e continue' : next ? 'Próxima sessão' : 'Finalizar lição'}</strong>{next && kind === 'study' && <small>{titles[next.kind]}</small>}</span><ChevronRight size={24} /></button>}
    </>}
  </div>;
}
