import { useEffect, useState } from 'react';
import { ArrowLeft, Award, BookOpen, Check, Clock3, LockKeyhole, PlayCircle, UserRound } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import InstitutionalAction from '../components/ui/InstitutionalAction';
import ProgressBar from '../components/ui/ProgressBar';
import StudyCourseArtwork from '../components/estudos/StudyCourseArtwork';
import { COMUNHAO_ESTUDOS_CATALOG_SCHEMA_ENABLED, getStudyCatalog } from '../services/comunhaoEstudosService';
import { PILOT_CATALOG, type StudyCatalog } from '../types/comunhaoEstudos';

export default function EstudosCurso() {
  const { courseId } = useParams();
  const [catalog, setCatalog] = useState<StudyCatalog>(PILOT_CATALOG);
  useEffect(() => { if (COMUNHAO_ESTUDOS_CATALOG_SCHEMA_ENABLED) void getStudyCatalog().then(result => { if (result.courses.length) setCatalog(result); }).catch(() => undefined); }, []);
  const course = catalog.courses.find(item => item.id === courseId) ?? catalog.courses[0];
  if (!course) return <div className="p-8 text-center txt-secondary">Curso não encontrado.</div>;
  const lessons = course.modules.flatMap(module => module.lessons);
  const nextLesson = lessons.find(lesson => lesson.status === 'current') ?? lessons.find(lesson => lesson.status === 'available');
  const certificate = catalog.certificates.find(item => item.courseId === course.id);

  return <div className="app-content-wide studies-course-page mx-auto w-full max-w-5xl space-y-7 px-5 pb-28 pt-7 sm:px-8">
    <Link to="/estudos" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold txt-tertiary hover:txt-primary"><ArrowLeft size={17} /> Voltar ao catálogo</Link>
    <Card variant="highlighted" className="overflow-hidden p-0"><StudyCourseArtwork course={course} variant="hero" /><div className="studies-course-intro space-y-5 p-5 sm:p-7"><div className="flex flex-wrap gap-2"><Badge tone="celebration">{catalog.tracks.find(track => track.id === course.trackId)?.title}</Badge><Badge tone="neutral">{course.level === 'fundamentos' ? 'Fundamentos' : course.level}</Badge>{course.certificateEnabled && <Badge tone="accent"><Award size={13} /> Certificado pastoral</Badge>}</div><div><h1 className="font-display text-3xl font-semibold txt-primary sm:text-4xl">{course.title}</h1><p className="mt-2 text-lg txt-secondary">{course.subtitle}</p><p className="mt-3 max-w-3xl text-sm leading-6 txt-secondary">{course.description}</p></div><div className="flex flex-wrap gap-4 text-sm txt-tertiary"><span className="inline-flex items-center gap-2"><UserRound size={16} /> {course.minister}</span><span className="inline-flex items-center gap-2"><Clock3 size={16} /> {course.durationMinutes} minutos</span><span className="inline-flex items-center gap-2"><BookOpen size={16} /> {lessons.length} aulas</span></div><ProgressBar value={course.progress} label="Progresso do curso" />{nextLesson && <InstitutionalAction to={`/estudos/aula/${nextLesson.id}`} icon={<PlayCircle size={17} />}>{course.progress > 0 ? 'Continuar curso' : 'Iniciar curso'}</InstitutionalAction>}</div></Card>

    <section className="space-y-4"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--celebration)]">Conteúdo ordenado</p><h2 className="font-display text-2xl font-semibold txt-primary">Módulos do curso</h2></div><div className="space-y-4">{course.modules.map(module => <Card key={module.id} className="overflow-hidden p-0"><div className="border-b border-[var(--border)] p-5"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent-primary)]">{module.order}</span><div><h3 className="font-display text-xl txt-primary">{module.title}</h3><p className="mt-1 text-sm leading-5 txt-tertiary">{module.description}</p></div></div></div><div className="divide-y divide-[var(--border)]">{module.lessons.map(lesson => { const locked = lesson.status === 'locked'; const content = <><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${lesson.status === 'completed' ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)]' : locked ? 'bg-[var(--surface-elevated)] txt-tertiary' : 'bg-[var(--celebration-soft)] text-[var(--celebration)]'}`}>{lesson.status === 'completed' ? <Check size={18} /> : locked ? <LockKeyhole size={17} /> : <PlayCircle size={18} />}</span><span className="min-w-0 flex-1"><strong className="block text-sm txt-primary">{lesson.title}</strong><span className="mt-1 block text-xs txt-tertiary">{lesson.reference} · {lesson.durationMinutes} min</span></span></>; return locked ? <div key={lesson.id} className="flex min-h-16 items-center gap-3 px-5 py-3 opacity-65">{content}</div> : <Link key={lesson.id} to={`/estudos/aula/${lesson.id}`} className="flex min-h-16 items-center gap-3 px-5 py-3 hover:bg-[var(--surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus)]">{content}</Link>; })}</div></Card>)}</div></section>

    <Card variant={certificate ? 'highlighted' : 'standard'} className="flex items-start gap-4 p-5"><Award className="mt-1 shrink-0 text-[var(--celebration)]" /><div><h2 className="font-display text-xl txt-primary">{certificate ? 'Certificado emitido' : 'Certificado de conclusão'}</h2><p className="mt-1 text-sm leading-6 txt-secondary">{certificate ? `Código de validação: ${certificate.validationCode}` : 'Conclua todas as aulas e blocos obrigatórios para receber o certificado com validade pastoral.'}</p></div></Card>
  </div>;
}
