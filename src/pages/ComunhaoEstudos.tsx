import { useEffect, useMemo, useState } from 'react';
import { Award, BookOpen, Clock3, Search, Sparkles, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import InstitutionalAction from '../components/ui/InstitutionalAction';
import ProgressBar from '../components/ui/ProgressBar';
import SectionHeader from '../components/ui/SectionHeader';
import StudyCourseArtwork from '../components/estudos/StudyCourseArtwork';
import { COMUNHAO_ESTUDOS_CATALOG_SCHEMA_ENABLED, getStudyCatalog } from '../services/comunhaoEstudosService';
import { PILOT_CATALOG, type StudyCatalog, type StudyCourse } from '../types/comunhaoEstudos';

function CourseCover({ course, compact = false }: { course: StudyCourse; compact?: boolean }) {
  return <StudyCourseArtwork course={course} variant={compact ? 'card' : 'featured'} />;
}

function CourseCard({ course, trackTitle }: { course: StudyCourse; trackTitle: string }) {
  const lessonCount = course.modules.reduce((total, module) => total + module.lessons.length, 0);
  return (
    <Link to={`/estudos/curso/${course.id}`} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] rounded-2xl" aria-label={`Abrir curso ${course.title}`}>
      <Card variant="actionable" className="h-full overflow-hidden p-0">
        <CourseCover course={course} compact />
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2"><Badge tone="celebration">{trackTitle}</Badge>{course.certificateEnabled && <Badge tone="accent"><Award size={13} /> Certificado</Badge>}</div>
          <div><h3 className="font-display text-xl font-semibold txt-primary group-hover:text-[var(--accent-primary)]">{course.title}</h3><p className="mt-1 line-clamp-2 text-sm leading-5 txt-secondary">{course.subtitle}</p></div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs txt-tertiary"><span className="inline-flex items-center gap-1"><BookOpen size={14} /> {lessonCount} aulas</span><span className="inline-flex items-center gap-1"><Clock3 size={14} /> {course.durationMinutes} min</span></div>
          {course.progress > 0 && <ProgressBar value={course.progress} label="Seu progresso" />}
          {course.status === 'coming_soon' && <p className="text-xs font-semibold text-[var(--celebration)]">Em breve</p>}
        </div>
      </Card>
    </Link>
  );
}

export default function ComunhaoEstudos() {
  const [catalog, setCatalog] = useState<StudyCatalog>(PILOT_CATALOG);
  const [query, setQuery] = useState('');
  const [trackId, setTrackId] = useState<string>('all');
  const [remoteState, setRemoteState] = useState<'local' | 'loading' | 'connected' | 'fallback'>('local');

  useEffect(() => {
    if (!COMUNHAO_ESTUDOS_CATALOG_SCHEMA_ENABLED) return;
    let active = true;
    setRemoteState('loading');
    getStudyCatalog().then(result => {
      if (!active) return;
      if (result.courses.length) setCatalog(result);
      setRemoteState('connected');
    }).catch(() => { if (active) setRemoteState('fallback'); });
    return () => { active = false; };
  }, []);

  const filteredCourses = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR');
    return catalog.courses.filter(course => {
      const trackMatches = trackId === 'all' || course.trackId === trackId;
      const textMatches = !term || [course.title, course.subtitle, course.description, course.minister, ...course.tags].join(' ').toLocaleLowerCase('pt-BR').includes(term);
      return trackMatches && textMatches;
    });
  }, [catalog.courses, query, trackId]);

  const continueCourse = catalog.courses.find(course => course.progress > 0 && course.progress < 100);
  const featured = continueCourse ?? catalog.courses[0];
  const trackName = (id: string) => catalog.tracks.find(track => track.id === id)?.title ?? 'Comunhão Estudos';

  return (
    <div className="app-content-wide studies-catalog-page mx-auto w-full max-w-6xl space-y-8 px-5 pb-28 pt-8 sm:px-8 lg:px-10">
      <header className="space-y-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--celebration)]">Comunhão Estudos</p><h1 className="font-display text-3xl font-semibold txt-primary sm:text-4xl">Cursos bíblicos para caminhar com clareza</h1><p className="max-w-2xl text-sm leading-6 txt-secondary">Escolha um curso completo, avance por módulos em ordem e conclua uma formação reconhecida pastoralmente.</p>{remoteState === 'loading' && <p className="text-xs txt-tertiary" role="status">Atualizando catálogo…</p>}{remoteState === 'fallback' && <p className="text-xs text-[var(--celebration)]" role="status">Catálogo piloto exibido enquanto a estrutura remota é preparada.</p>}</header>

      {featured && <Card variant="highlighted" className="overflow-hidden p-0"><div className="studies-featured-layout"><CourseCover course={featured} /><div className="studies-featured-copy flex flex-col justify-center space-y-4 border-t border-[var(--border)] p-5 sm:p-7"><div className="flex flex-wrap gap-2"><Badge tone="celebration">{continueCourse ? 'Continuar estudando' : 'Comece por aqui'}</Badge><Badge tone="neutral">{trackName(featured.trackId)}</Badge></div><div><h2 className="font-display text-3xl font-semibold txt-primary">{featured.title}</h2><p className="mt-2 text-sm leading-6 txt-secondary">{featured.description}</p></div>{featured.progress > 0 && <ProgressBar value={featured.progress} label="Progresso do curso" />}<InstitutionalAction to={`/estudos/curso/${featured.id}`} icon={<BookOpen size={17} />}>{continueCourse ? 'Continuar curso' : 'Conhecer o curso'}</InstitutionalAction></div></div></Card>}

      <section className="space-y-4"><SectionHeader title="Trilhas de aprendizado" eyebrow="Encontre uma direção" /><div className="flex gap-2 overflow-x-auto pb-1"><button type="button" className={`sanctuary-choice min-h-11 shrink-0 px-4 ${trackId === 'all' ? 'sanctuary-choice--active' : ''}`} onClick={() => setTrackId('all')}>Todos os cursos</button>{catalog.tracks.map(track => <button key={track.id} type="button" className={`sanctuary-choice min-h-11 shrink-0 px-4 ${trackId === track.id ? 'sanctuary-choice--active' : ''}`} onClick={() => setTrackId(track.id)}>{track.title}</button>)}</div></section>

      <section className="space-y-4"><SectionHeader title="Catálogo de cursos" eyebrow={`${filteredCourses.length} ${filteredCourses.length === 1 ? 'curso encontrado' : 'cursos encontrados'}`} /><label className="studies-search flex min-h-12 items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 focus-within:border-[var(--accent-primary)]"><Search size={18} className="txt-tertiary" /><span className="sr-only">Buscar cursos</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por tema, livro ou ministrante" className="min-w-0 flex-1 bg-transparent text-sm txt-primary outline-none placeholder:txt-tertiary" /></label>{filteredCourses.length ? <div className="studies-course-grid">{filteredCourses.map(course => <CourseCard key={course.id} course={course} trackTitle={trackName(course.trackId)} />)}</div> : <Card className="p-8 text-center"><Sparkles className="mx-auto text-[var(--celebration)]" /><h3 className="mt-3 font-display text-xl txt-primary">Nenhum curso encontrado</h3><p className="mt-1 text-sm txt-tertiary">Tente outro termo ou escolha todas as trilhas.</p></Card>}</section>

      <Card className="flex items-start gap-4 p-5"><UsersRound className="mt-1 shrink-0 text-[var(--accent-primary)]" /><div><h2 className="font-display text-xl txt-primary">Formação em comunidade</h2><p className="mt-1 text-sm leading-6 txt-secondary">Os cursos podem incluir encontros, missões e participação pastoral. O certificado representa a conclusão do percurso integral, não apenas a reprodução de vídeos.</p></div></Card>
    </div>
  );
}
