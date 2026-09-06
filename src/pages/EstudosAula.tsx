import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Check, ChevronRight, Flag, Lightbulb, Play, Radio, Sparkles, Volume2, FileText } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ProgressBar from '../components/ui/ProgressBar';
import { useToast } from '../contexts/ToastContext';
import { COMUNHAO_ESTUDOS_CATALOG_SCHEMA_ENABLED, completeCourseBlock, getStudyCatalog } from '../services/comunhaoEstudosService';
import { PILOT_CATALOG, type StudyBlock, type StudyCatalog } from '../types/comunhaoEstudos';
import BiblicalComprehensionAssistant from '../components/estudos/BiblicalComprehensionAssistant';

const icons = { video: Play, scripture: BookOpen, context: Sparkles, reflection: Lightbulb, mission: Flag, meeting: Radio, audio: Volume2, resource: FileText };

export default function EstudosAula() {
  const { lessonId } = useParams();
  const toast = useToast();
  const [catalog, setCatalog] = useState<StudyCatalog>(PILOT_CATALOG);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  useEffect(() => { if (COMUNHAO_ESTUDOS_CATALOG_SCHEMA_ENABLED) void getStudyCatalog().then(result => { if (result.courses.length) setCatalog(result); }).catch(() => undefined); }, []);
  const course = catalog.courses.find(item => item.modules.some(module => module.lessons.some(lesson => lesson.id === lessonId))) ?? catalog.courses[0];
  const module = course?.modules.find(item => item.lessons.some(lesson => lesson.id === lessonId)) ?? course?.modules[0];
  const lesson = module?.lessons.find(item => item.id === lessonId) ?? module?.lessons[0];
  if (!course || !module || !lesson) return <div className="p-8 text-center txt-secondary">Aula não encontrada.</div>;
  const completed = lesson.blocks.filter(block => block.completed).length;
  const progress = lesson.blocks.length ? Math.round((completed / lesson.blocks.length) * 100) : 0;
  const active = lesson.blocks.find(block => block.id === activeId) ?? null;
  const activeContent = active?.content ?? {};

  const complete = async (block: StudyBlock) => {
    if (block.completed || working) return;
    setWorking(true);
    try {
      if (COMUNHAO_ESTUDOS_CATALOG_SCHEMA_ENABLED) await completeCourseBlock(block.id);
      setCatalog(current => ({
        ...current,
        courses: current.courses.map(item => ({
          ...item,
          modules: item.modules.map(currentModule => ({
            ...currentModule,
            lessons: currentModule.lessons.map(currentLesson => currentLesson.id === lesson.id
              ? { ...currentLesson, blocks: currentLesson.blocks.map(currentBlock => currentBlock.id === block.id ? { ...currentBlock, completed: true } : currentBlock) }
              : currentLesson),
          })),
        })),
      }));
      setActiveId(null);
      toast.success('Etapa concluída.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível concluir esta etapa.'); }
    finally { setWorking(false); }
  };

  return <div className={`app-content-wide studies-lesson-page mx-auto w-full max-w-6xl space-y-6 px-5 pb-28 pt-7 sm:px-8 ${active ? 'studies-lesson-page--open' : ''}`}>
    <Link to={`/estudos/curso/${course.id}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold txt-tertiary hover:txt-primary"><ArrowLeft size={17} /> Voltar ao curso</Link>
    <header className="space-y-3"><div className="flex flex-wrap gap-2"><Badge tone="celebration">Módulo {module.order}</Badge><Badge tone="accent">{lesson.reference}</Badge></div><h1 className="font-display text-3xl font-semibold txt-primary">{lesson.title}</h1><p className="max-w-2xl text-sm leading-6 txt-secondary">{lesson.description}</p><ProgressBar value={progress} label={`${completed} de ${lesson.blocks.length} etapas concluídas`} /></header>
    <Card className="space-y-2 p-4 sm:p-5">{lesson.blocks.length ? lesson.blocks.map(block => { const Icon = icons[block.type]; return <button key={block.id} type="button" onClick={() => setActiveId(block.id)} className="sanctuary-disclosure group flex min-h-20 w-full items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left"><span className={`grid size-11 shrink-0 place-items-center rounded-xl ${block.completed ? 'bg-[var(--accent-soft)] text-[var(--accent-primary)]' : 'bg-[var(--celebration-soft)] text-[var(--celebration)]'}`}>{block.completed ? <Check size={19} /> : <Icon size={19} />}</span><span className="min-w-0 flex-1"><strong className="block text-sm txt-primary">{block.title}</strong><span className="mt-1 block text-xs leading-5 txt-tertiary">{block.summary}</span></span><ChevronRight size={18} className="txt-tertiary" /></button>; }) : <div className="p-6 text-center text-sm txt-tertiary">O conteúdo desta aula será publicado gradualmente.</div>}</Card>
    <BiblicalComprehensionAssistant lessonTitle={lesson.title} lessonReference={lesson.reference} blocks={lesson.blocks} />
    {active && <Card variant="highlighted" className="space-y-4 p-5 sm:p-7"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-primary)]">Etapa da aula</p><h2 className="mt-1 font-display text-2xl txt-primary">{active.title}</h2><p className="mt-2 text-sm leading-6 txt-secondary">{active.summary}</p></div><div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm leading-7 txt-secondary">{typeof activeContent.reference === 'string' && activeContent.reference && <Badge tone="accent">{activeContent.reference}</Badge>}<p className="whitespace-pre-wrap">{typeof activeContent.body === 'string' && activeContent.body ? activeContent.body : 'O conteúdo editorial deste bloco será inserido no Studio.'}</p>{typeof activeContent.discussionPrompt === 'string' && activeContent.discussionPrompt && <div className="rounded-xl bg-[var(--accent-soft)] p-4"><strong className="block text-xs uppercase tracking-[0.1em] text-[var(--accent-primary)]">Para conversar</strong><p className="mt-1">{activeContent.discussionPrompt}</p></div>}{typeof activeContent.action === 'string' && activeContent.action && <div className="rounded-xl bg-[var(--celebration-soft)] p-4"><strong className="block text-xs uppercase tracking-[0.1em] text-[var(--celebration)]">Coloque em prática</strong><p className="mt-1">{activeContent.action}</p></div>}</div><div className="flex flex-col gap-2 sm:flex-row"><Button onClick={() => complete(active)} disabled={active.completed || working}>{active.completed ? <><Check size={16} /> Etapa concluída</> : working ? 'Concluindo…' : 'Marcar como concluída'}</Button><Button variant="ghost" onClick={() => setActiveId(null)}>Fechar</Button></div></Card>}
  </div>;
}
