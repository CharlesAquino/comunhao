import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Eye, Heart, MessageCircle } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useToast } from '../contexts/ToastContext';
import { PILOT_CATALOG, type StudyCatalog } from '../types/comunhaoEstudos';
import { COMUNHAO_ESTUDOS_CATALOG_SCHEMA_ENABLED, getStudyCatalog, recordCoursePastoralManifestation } from '../services/comunhaoEstudosService';

function ReviewBlock({ block, index }: { block: StudyCatalog['courses'][number]['modules'][number]['lessons'][number]['blocks'][number]; index: number }) {
  return <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"><span className="text-xs font-bold text-[var(--accent-primary)]">{index + 1}. {block.title}</span><p className="mt-1 text-xs leading-5 txt-tertiary">{block.summary}</p>{typeof block.content?.body === 'string' && block.content.body && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 txt-secondary">{block.content.body}</p>}</div>;
}

export default function EstudosPastoralReview() {
  const navigate = useNavigate();
  const toast = useToast();
  const { courseId } = useParams();
  const [catalog, setCatalog] = useState<StudyCatalog>(PILOT_CATALOG);
  const [manifestation, setManifestation] = useState<'gostei' | 'ficou_bom' | null>(null);
  const [working, setWorking] = useState(false);
  useEffect(() => { if (COMUNHAO_ESTUDOS_CATALOG_SCHEMA_ENABLED) void getStudyCatalog({ includeDrafts: true }).then(result => { if (result.courses.length) setCatalog(result); }).catch(() => undefined); }, []);
  const course = catalog.courses.find(item => item.id === courseId) ?? catalog.courses[0];

  const registerManifestation = async (value: 'gostei' | 'ficou_bom') => {
    if (!course || working || manifestation) return;
    setWorking(true);
    try {
      if (COMUNHAO_ESTUDOS_CATALOG_SCHEMA_ENABLED) await recordCoursePastoralManifestation({ courseId: course.id, version: course.version, manifestation: value });
      setManifestation(value);
      toast.success('Manifestação pastoral registrada para esta versão.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível registrar sua manifestação.'); }
    finally { setWorking(false); }
  };

  if (!course) return <main className="p-8 text-center txt-secondary">Curso não encontrado ou não atribuído.</main>;
  return <main className="standalone-scroll-page bg-[var(--canvas)] px-5 text-[var(--text-primary)] sm:px-8"><div className="mx-auto w-full max-w-4xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><Link to="/" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm txt-tertiary hover:txt-primary"><ArrowLeft size={16} /> Voltar ao Comunhão</Link><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--celebration)]">Revisão Pastoral</p><h1 className="mt-2 font-display text-3xl font-semibold txt-primary">{course.title}</h1><p className="mt-2 text-sm txt-secondary">Curso completo · versão {course.version} · {course.modules.length} módulos</p></div><Badge tone="neutral"><Eye size={14} /> Somente visualização</Badge></header>

    <Card variant="highlighted" className="p-5 sm:p-7"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent-primary)]">Manifestação pastoral</p><h2 className="mt-2 font-display text-2xl txt-primary">Como ficou o curso?</h2><p className="mt-2 max-w-2xl text-sm leading-6 txt-secondary">Esta área registra somente sua impressão sobre a experiência completa. Você não precisa editar, corrigir, aprovar tecnicamente ou publicar o conteúdo.</p><div className="mt-5 flex flex-col gap-3 sm:flex-row"><Button variant={manifestation === 'gostei' ? 'primary' : 'secondary'} disabled={working || Boolean(manifestation)} onClick={() => registerManifestation('gostei')}><Heart size={17} /> Gostei</Button><Button variant={manifestation === 'ficou_bom' ? 'primary' : 'secondary'} disabled={working || Boolean(manifestation)} onClick={() => registerManifestation('ficou_bom')}><Check size={17} /> Ficou bom</Button></div>{manifestation && <p className="mt-4 flex items-center gap-2 text-sm text-[var(--accent-primary)]" role="status"><Check size={16} /> Manifestação registrada para a versão {course.version}.</p>}</Card>

    <Card className="space-y-6 p-5 sm:p-7"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--celebration)]">Experiência completa</p><h2 className="mt-2 font-display text-2xl txt-primary">{course.subtitle}</h2><p className="mt-2 text-sm leading-6 txt-secondary">{course.description}</p></div>{course.modules.map(module => <section key={module.id} className="space-y-3"><div><p className="text-xs font-semibold text-[var(--accent-primary)]">Módulo {module.order}</p><h3 className="font-display text-xl txt-primary">{module.title}</h3></div>{module.lessons.map(lesson => <div key={lesson.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm txt-primary">{lesson.title}</strong><Badge tone="neutral">{lesson.reference}</Badge></div><p className="mt-2 text-xs leading-5 txt-tertiary">{lesson.description}</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{lesson.blocks.map((block, index) => <ReviewBlock key={block.id} block={block} index={index} />)}</div></div>)}</section>)}<div className="flex items-start gap-3 rounded-2xl border border-[var(--border)] p-4"><MessageCircle size={18} className="mt-0.5 shrink-0 text-[var(--celebration)]" /><p className="text-sm leading-6 txt-secondary">Organização, correções e publicação continuam sob responsabilidade exclusiva da equipe do produto.</p></div></Card>
    <Button variant="ghost" onClick={() => navigate('/estudos')} className="w-full">Voltar ao catálogo de Estudos</Button>
  </div></main>;
}
