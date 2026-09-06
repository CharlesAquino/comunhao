import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Award, BrainCircuit, Check, Eye, FileText, Layers3, LockKeyhole, Plus, Save, Send, Settings2, Sparkles, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';
import { useAdmin } from '../contexts/AdminContext';
import { useToast } from '../contexts/ToastContext';
import {
  assignCourseReviewer,
  COMUNHAO_ESTUDOS_CATALOG_SCHEMA_ENABLED,
  generateStudyLessonWithAI,
  persistStudyCourseDraft,
  publishStudyCourse,
  sendCourseToPastoralReview,
} from '../services/comunhaoEstudosService';
import { listKnowledgeSources } from '../services/conhecimentoService';
import type { KnowledgeSource } from '../types/conhecimento';
import { PILOT_COURSE, PILOT_TRACKS, type StudyBlockType, type StudyCourse } from '../types/comunhaoEstudos';

type StudioTab = 'estrutura' | 'conteudo' | 'revisao' | 'publicacao';
const inputClass = 'input-theme min-h-11 w-full rounded-xl border px-3 text-sm outline-none focus:border-[var(--accent-primary)]';
const localId = (kind: string) => `local-${kind}-${crypto.randomUUID()}`;

export default function EstudosStudio() {
  const [tab, setTab] = useState<StudioTab>('estrutura');
  const [course, setCourse] = useState<StudyCourse>(PILOT_COURSE);
  const [reviewerId, setReviewerId] = useState('');
  const [working, setWorking] = useState(false);
  const [savedMode, setSavedMode] = useState<'local' | 'remote' | null>(null);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [sourceSearch, setSourceSearch] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiCooldown, setAiCooldown] = useState(0);

  useEffect(() => {
    if (aiCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setAiCooldown(current => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [aiCooldown]);

  const [aiLessonId, setAiLessonId] = useState(PILOT_COURSE.modules[0]?.lessons[0]?.id ?? '');
  const [aiBlockTypes, setAiBlockTypes] = useState<StudyBlockType[]>(['video', 'scripture', 'context', 'reflection', 'mission', 'meeting']);
  const [aiForm, setAiForm] = useState({ audience: 'Jovens da igreja', tone: 'Bíblico, claro, acolhedor e direto', objective: '', additionalInstructions: '' });
  const { can } = useAdmin();
  const toast = useToast();
  const track = PILOT_TRACKS.find(item => item.id === course.trackId) ?? PILOT_TRACKS[0];
  const lessons = useMemo(() => course.modules.flatMap(module => module.lessons.map(lesson => ({ module, lesson }))), [course.modules]);
  const selectedAiLesson = lessons.find(item => item.lesson.id === aiLessonId) ?? lessons[0];
  const eligibleSources = useMemo(() => knowledgeSources.filter(source => source.active && source.status === 'ready' && ['global', 'ebd', 'estudos', 'formacao'].includes(source.scope) && (!sourceSearch.trim() || `${source.title} ${source.fileName} ${source.tags.join(' ')}`.toLocaleLowerCase('pt-BR').includes(sourceSearch.trim().toLocaleLowerCase('pt-BR')))), [knowledgeSources, sourceSearch]);
  const tabs: Array<{ id: StudioTab; label: string; Icon: typeof Layers3 }> = [
    { id: 'estrutura', label: 'Curso', Icon: Settings2 },
    { id: 'conteudo', label: 'Módulos e aulas', Icon: Layers3 },
    { id: 'revisao', label: 'Revisão Pastoral', Icon: Eye },
    { id: 'publicacao', label: 'Publicação', Icon: Send },
  ];

  useEffect(() => {
    if (!COMUNHAO_ESTUDOS_CATALOG_SCHEMA_ENABLED) return;
    void listKnowledgeSources().then(setKnowledgeSources).catch(() => undefined);
  }, []);

  const patchCourse = (value: Partial<StudyCourse>) => setCourse(current => ({ ...current, ...value }));
  const patchModule = (moduleId: string, value: Record<string, unknown>) => setCourse(current => ({ ...current, modules: current.modules.map(module => module.id === moduleId ? { ...module, ...value } : module) }));
  const patchLesson = (moduleId: string, lessonId: string, value: Record<string, unknown>) => setCourse(current => ({ ...current, modules: current.modules.map(module => module.id === moduleId ? { ...module, lessons: module.lessons.map(lesson => lesson.id === lessonId ? { ...lesson, ...value } : lesson) } : module) }));
  const patchBlock = (moduleId: string, lessonId: string, blockId: string, value: Record<string, unknown>) => setCourse(current => ({ ...current, modules: current.modules.map(module => module.id === moduleId ? { ...module, lessons: module.lessons.map(lesson => lesson.id === lessonId ? { ...lesson, blocks: lesson.blocks.map(block => block.id === blockId ? { ...block, ...value } : block) } : lesson) } : module) }));

  const addModule = () => setCourse(current => ({ ...current, modules: [...current.modules, { id: localId('modulo'), slug: `modulo-${current.modules.length + 1}`, title: `Novo módulo ${current.modules.length + 1}`, description: '', order: current.modules.length + 1, lessons: [] }] }));
  const addLesson = (moduleId: string) => setCourse(current => ({ ...current, modules: current.modules.map(module => module.id === moduleId ? { ...module, lessons: [...module.lessons, { id: localId('aula'), slug: `aula-${module.lessons.length + 1}`, title: `Nova aula ${module.lessons.length + 1}`, reference: '', description: '', durationMinutes: 10, order: module.lessons.length + 1, version: 1, status: 'locked', blocks: [] }] } : module) }));
  const addBlock = (moduleId: string, lessonId: string) => setCourse(current => ({ ...current, modules: current.modules.map(module => module.id === moduleId ? { ...module, lessons: module.lessons.map(lesson => lesson.id === lessonId ? { ...lesson, blocks: [...lesson.blocks, { id: localId('bloco'), type: 'scripture', title: `Novo bloco ${lesson.blocks.length + 1}`, summary: '', content: {}, order: lesson.blocks.length + 1, required: true, completed: false }] } : lesson) } : module) }));

  const save = async () => {
    setWorking(true);
    try {
      if (COMUNHAO_ESTUDOS_CATALOG_SCHEMA_ENABLED) {
        const persisted = await persistStudyCourseDraft(course, track);
        setCourse(persisted);
        const persistedLesson = persisted.modules.flatMap(module => module.lessons).find(lesson => lesson.slug === selectedAiLesson?.lesson.slug) ?? persisted.modules[0]?.lessons[0];
        if (persistedLesson) setAiLessonId(persistedLesson.id);
        setSavedMode('remote');
        toast.success('Rascunho salvo na estrutura de cursos.');
      } else {
        setSavedMode('local');
        toast.success('Rascunho mantido localmente neste protótipo.');
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o curso.'); }
    finally { setWorking(false); }
  };

  const toggleSource = (sourceId: string) => patchCourse({ knowledgeSourceIds: course.knowledgeSourceIds.includes(sourceId) ? course.knowledgeSourceIds.filter(id => id !== sourceId) : [...course.knowledgeSourceIds, sourceId] });
  const toggleAiBlock = (type: StudyBlockType) => setAiBlockTypes(current => current.includes(type) ? current.filter(item => item !== type) : [...current, type]);

  const generateLesson = async () => {
    if (aiGenerating || aiCooldown > 0) return;
    if (!selectedAiLesson) { toast.error('Selecione uma aula para gerar.'); return; }
    if (!course.knowledgeSourceIds.length) { toast.error('Vincule pelo menos uma fonte RAG oficial ao curso.'); return; }
    if (!aiBlockTypes.length || !aiForm.objective.trim()) { toast.error('Informe o objetivo bíblico e selecione ao menos um bloco.'); return; }
    setAiGenerating(true);
    try {
      const generated = await generateStudyLessonWithAI({ courseId: course.id, lessonId: selectedAiLesson.lesson.id, audience: aiForm.audience, tone: aiForm.tone, objective: aiForm.objective, additionalInstructions: aiForm.additionalInstructions, selectedBlockTypes: aiBlockTypes });
      patchLesson(selectedAiLesson.module.id, selectedAiLesson.lesson.id, {
        title: generated.title,
        description: generated.description,
        reference: generated.reference,
        durationMinutes: generated.estimatedMinutes,
        blocks: generated.blocks.map((block, index) => ({ id: localId('bloco-ia'), type: block.type, title: block.title, summary: block.summary, content: { body: block.body, reference: block.reference, discussionPrompt: block.discussionPrompt, action: block.action, generatedByAI: true }, order: index + 1, required: true, completed: false })),
      });
      setSavedMode(null);
      toast.success('Rascunho gerado e aplicado à aula. Revise antes de salvar.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível gerar a aula.'); }
    finally {
      setAiGenerating(false);
      setAiCooldown(12);
    }
  };

  const sendReview = async () => {
    if (!reviewerId.trim()) { toast.error('Informe o identificador do revisor pastoral.'); return; }
    setWorking(true);
    try { await assignCourseReviewer(course.id, reviewerId.trim()); await sendCourseToPastoralReview(course.id); patchCourse({ status: 'pastoral_review' }); toast.success('Curso enviado ao revisor pastoral.'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível enviar para revisão.'); }
    finally { setWorking(false); }
  };

  const publish = async () => {
    setWorking(true);
    try { await publishStudyCourse(course.id); patchCourse({ status: 'published' }); toast.success('Curso publicado.'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Publicação bloqueada.'); }
    finally { setWorking(false); }
  };

  return <main className="standalone-scroll-page bg-[var(--canvas)] px-5 text-[var(--text-primary)] sm:px-8"><div className="mx-auto w-full max-w-6xl space-y-7">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><Link to="/" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm txt-tertiary hover:txt-primary"><ArrowLeft size={16} /> Voltar ao Comunhão</Link><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--celebration)]">Studio Comunhão Estudos</p><h1 className="mt-2 font-display text-3xl font-semibold txt-primary">{course.title}</h1><p className="mt-2 text-sm txt-secondary">Trilha → curso → módulo → aula → blocos</p></div><div className="flex flex-wrap items-center gap-2"><Badge tone={course.status === 'published' ? 'accent' : 'neutral'}>{course.status === 'pastoral_review' ? 'Revisão pastoral' : course.status === 'published' ? 'Publicado' : 'Rascunho'}</Badge>{savedMode && <span className="inline-flex items-center gap-1 text-xs text-[var(--accent-primary)]"><Check size={14} /> Salvo {savedMode === 'remote' ? 'remotamente' : 'localmente'}</span>}</div></header>

    <nav className="sanctuary-nav grid grid-cols-2 p-1 sm:grid-cols-4" aria-label="Seções do Studio">{tabs.map(({ id, label, Icon }) => <button key={id} type="button" onClick={() => setTab(id)} className={`sanctuary-tab flex min-h-12 items-center justify-center gap-2 px-2 text-xs font-semibold ${tab === id ? 'sanctuary-tab--active txt-primary' : 'txt-tertiary'}`}><Icon size={15} /> {label}</button>)}</nav>

    {tab === 'estrutura' && <section className="space-y-5">
      <SectionHeader title="Identidade do curso" eyebrow="Card principal do catálogo" action={<Button onClick={save} disabled={working}><Save size={16} /> {working ? 'Salvando…' : 'Salvar rascunho'}</Button>} />
      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <label className="space-y-1 text-xs txt-tertiary">Título<input className={inputClass} value={course.title} onChange={event => patchCourse({ title: event.target.value })} /></label>
        <label className="space-y-1 text-xs txt-tertiary">Slug<input className={inputClass} value={course.slug} onChange={event => patchCourse({ slug: event.target.value })} /></label>
        <label className="space-y-1 text-xs txt-tertiary sm:col-span-2">Subtítulo<input className={inputClass} value={course.subtitle} onChange={event => patchCourse({ subtitle: event.target.value })} /></label>
        <label className="space-y-1 text-xs txt-tertiary sm:col-span-2">Descrição<textarea className={`${inputClass} min-h-28 py-3`} value={course.description} onChange={event => patchCourse({ description: event.target.value })} /></label>
        <label className="space-y-1 text-xs txt-tertiary">Ministrante<input className={inputClass} value={course.minister} onChange={event => patchCourse({ minister: event.target.value })} /></label>
        <label className="space-y-1 text-xs txt-tertiary">Duração estimada<input type="number" min="0" className={inputClass} value={course.durationMinutes} onChange={event => patchCourse({ durationMinutes: Number(event.target.value) })} /></label>
        <label className="flex min-h-11 items-center gap-3 text-sm txt-secondary"><input type="checkbox" checked={course.certificateEnabled} onChange={event => patchCourse({ certificateEnabled: event.target.checked })} /> Certificado pastoral habilitado</label>
      </Card>
      <Card className="space-y-4 p-5">
        <div className="flex items-start gap-3"><BrainCircuit className="mt-1 shrink-0 text-[var(--accent-primary)]" /><div><h2 className="font-display text-xl txt-primary">Fontes oficiais do curso</h2><p className="mt-1 text-sm leading-6 txt-secondary">A geração pesquisará somente as fontes selecionadas na mesma Memória Sistêmica usada pelo Editorial EBD.</p></div></div>
        <input value={sourceSearch} onChange={event => setSourceSearch(event.target.value)} placeholder="Buscar fonte por título, arquivo ou etiqueta" className={inputClass} />
        <div className="scrollbar-hidden max-h-64 space-y-2 overflow-y-auto">
          {eligibleSources.map(source => { const checked = course.knowledgeSourceIds.includes(source.id); return <label key={source.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${checked ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface)]'}`}><input type="checkbox" className="mt-1" checked={checked} onChange={() => toggleSource(source.id)} /><span className="min-w-0"><strong className="block truncate text-sm txt-primary">{source.title}</strong><span className="mt-1 block truncate text-xs txt-tertiary">{source.scope.toUpperCase()} · {source.category} · {source.totalChunks} trechos</span></span></label>; })}
          {!eligibleSources.length && <p className="rounded-xl border border-dashed border-[var(--border)] p-4 text-sm txt-tertiary">{COMUNHAO_ESTUDOS_CATALOG_SCHEMA_ENABLED ? 'Nenhuma fonte pronta encontrada.' : 'As fontes serão habilitadas após a ativação segura do catálogo remoto.'}</p>}
        </div>
        <p className="text-xs txt-tertiary">{course.knowledgeSourceIds.length} fonte(s) vinculada(s). O vínculo é salvo junto com o rascunho.</p>
      </Card>
    </section>}

    {tab === 'conteudo' && <section className="space-y-5">
      <SectionHeader title="Composição do curso" eyebrow={`${course.modules.length} módulos`} action={<Button variant="secondary" onClick={addModule}><Plus size={16} /> Adicionar módulo</Button>} />
      <Card variant="highlighted" className="space-y-5 p-5 sm:p-7">
        <div className="flex items-start gap-3"><Sparkles className="mt-1 shrink-0 text-[var(--celebration)]" /><div><h2 className="font-display text-2xl txt-primary">Gerar rascunho com IA + RAG</h2><p className="mt-1 text-sm leading-6 txt-secondary">A IA usa somente as fontes vinculadas, aplica o resultado no editor e nunca salva, revisa ou publica automaticamente.</p></div></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-xs txt-tertiary">Aula<select className={inputClass} value={selectedAiLesson?.lesson.id ?? ''} onChange={event => setAiLessonId(event.target.value)}>{lessons.map(item => <option key={item.lesson.id} value={item.lesson.id}>{item.module.order}. {item.module.title} — {item.lesson.title}</option>)}</select></label>
          <label className="space-y-1 text-xs txt-tertiary">Público<input className={inputClass} value={aiForm.audience} onChange={event => setAiForm(current => ({ ...current, audience: event.target.value }))} /></label>
          <label className="space-y-1 text-xs txt-tertiary">Tom<input className={inputClass} value={aiForm.tone} onChange={event => setAiForm(current => ({ ...current, tone: event.target.value }))} /></label>
          <label className="space-y-1 text-xs txt-tertiary sm:col-span-2">Objetivo bíblico<textarea className={`${inputClass} min-h-24 py-3`} value={aiForm.objective} onChange={event => setAiForm(current => ({ ...current, objective: event.target.value }))} placeholder="O que o jovem deve conseguir explicar ao concluir esta aula?" /></label>
          <label className="space-y-1 text-xs txt-tertiary sm:col-span-2">Orientações adicionais<textarea className={`${inputClass} min-h-20 py-3`} value={aiForm.additionalInstructions} onChange={event => setAiForm(current => ({ ...current, additionalInstructions: event.target.value }))} placeholder="Ênfases, limites interpretativos ou aplicação pastoral" /></label>
        </div>
        <fieldset><legend className="mb-2 text-xs font-semibold txt-tertiary">Blocos que a IA deve produzir</legend><div className="flex flex-wrap gap-2">{(['video','scripture','context','reflection','mission','meeting','audio','resource'] as StudyBlockType[]).map(type => <button key={type} type="button" onClick={() => toggleAiBlock(type)} className={`sanctuary-choice min-h-11 px-3 text-xs ${aiBlockTypes.includes(type) ? 'sanctuary-choice--active' : ''}`}>{type}</button>)}</div></fieldset>
        <div className="flex flex-wrap items-center gap-3"><Button onClick={generateLesson} disabled={!COMUNHAO_ESTUDOS_CATALOG_SCHEMA_ENABLED || aiGenerating || aiCooldown > 0 || !course.knowledgeSourceIds.length}><Sparkles size={16} /> {aiGenerating ? 'Gerando rascunho…' : aiCooldown > 0 ? `Aguarde ${aiCooldown}s...` : 'Gerar aula com IA'}</Button><span className="text-xs txt-tertiary">{course.knowledgeSourceIds.length} fonte(s) RAG vinculada(s)</span></div>
      </Card>
      <div className="space-y-5">{course.modules.map(module => <Card key={module.id} className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-[5rem_1fr]"><label className="space-y-1 text-xs txt-tertiary">Ordem<input type="number" min="1" className={inputClass} value={module.order} onChange={event => patchModule(module.id, { order: Number(event.target.value) })} /></label><label className="space-y-1 text-xs txt-tertiary">Módulo<input className={inputClass} value={module.title} onChange={event => patchModule(module.id, { title: event.target.value })} /></label></div>
        <div className="space-y-3">{module.lessons.map(lesson => <div key={lesson.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
          <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-xs txt-tertiary">Aula<input className={inputClass} value={lesson.title} onChange={event => patchLesson(module.id, lesson.id, { title: event.target.value })} /></label><label className="space-y-1 text-xs txt-tertiary">Referência bíblica<input className={inputClass} value={lesson.reference} onChange={event => patchLesson(module.id, lesson.id, { reference: event.target.value })} /></label></div>
          <div className="mt-4 space-y-3">{lesson.blocks.map(block => <div key={block.id} className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
            <div className="grid gap-2 sm:grid-cols-[9rem_1fr]"><select className={inputClass} value={block.type} onChange={event => patchBlock(module.id, lesson.id, block.id, { type: event.target.value as StudyBlockType })}>{(['video','scripture','context','reflection','mission','meeting','audio','resource'] as StudyBlockType[]).map(type => <option key={type} value={type}>{type}</option>)}</select><input className={inputClass} value={block.title} onChange={event => patchBlock(module.id, lesson.id, block.id, { title: event.target.value })} /></div>
            <label className="block space-y-1 text-xs txt-tertiary">Resumo<input className={inputClass} value={block.summary} onChange={event => patchBlock(module.id, lesson.id, block.id, { summary: event.target.value })} /></label>
            <label className="block space-y-1 text-xs txt-tertiary">Conteúdo<textarea className={`${inputClass} min-h-32 resize-y py-3`} value={typeof block.content?.body === 'string' ? block.content.body : ''} onChange={event => patchBlock(module.id, lesson.id, block.id, { content: { ...block.content, body: event.target.value } })} /></label>
          </div>)}<Button variant="ghost" onClick={() => addBlock(module.id, lesson.id)}><Plus size={15} /> Adicionar bloco</Button></div>
        </div>)}<Button variant="secondary" onClick={() => addLesson(module.id)}><Plus size={15} /> Adicionar aula</Button></div>
      </Card>)}</div>
      <Button onClick={save} disabled={working}><Save size={16} /> Salvar composição</Button>
    </section>}

    {tab === 'revisao' && <Card className="space-y-6 p-5 sm:p-7"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--celebration)]">Menor privilégio</p><h2 className="mt-2 font-display text-2xl txt-primary">Atribuir revisão pastoral</h2><p className="mt-2 max-w-2xl text-sm leading-6 txt-secondary">O revisor verá o curso completo e poderá registrar somente “Gostei” ou “Ficou bom”. Ele não recebe edição, correção, administração ou publicação.</p></div><label className="block max-w-xl space-y-1 text-xs txt-tertiary">Identificador do usuário revisor<input className={inputClass} value={reviewerId} onChange={event => setReviewerId(event.target.value)} placeholder="UUID do pastor revisor" /></label><div className="grid gap-3 sm:grid-cols-2"><Card className="p-4"><FileText size={20} className="text-[var(--accent-primary)]" /><p className="mt-3 text-sm font-semibold txt-primary">Curso completo</p><p className="mt-1 text-xs leading-5 txt-tertiary">{course.modules.length} módulos e {course.modules.reduce((total, module) => total + module.lessons.length, 0)} aulas nesta versão.</p></Card><Card className="p-4"><Eye size={20} className="text-[var(--celebration)]" /><p className="mt-3 text-sm font-semibold txt-primary">Ação pastoral limitada</p><p className="mt-1 text-xs leading-5 txt-tertiary">Manifestação simples e auditável para a versão {course.version}.</p></Card></div><Button onClick={sendReview} disabled={!COMUNHAO_ESTUDOS_CATALOG_SCHEMA_ENABLED || working}><Send size={16} /> Enviar para revisão pastoral</Button></Card>}

    {tab === 'publicacao' && <Card className="space-y-5 p-5 sm:p-7"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--celebration)]">Decisão protegida</p><h2 className="mt-2 font-display text-2xl txt-primary">Publicar curso</h2><p className="mt-2 max-w-2xl text-sm leading-6 txt-secondary">A publicação exige permissão própria, curso em revisão e manifestação pastoral registrada na versão vigente. A manifestação não concede poder de publicação ao pastor.</p></div><div className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4"><LockKeyhole size={18} className="mt-0.5 shrink-0 txt-tertiary" /><p className="text-sm leading-6 txt-secondary">Editores organizam o conteúdo. Somente a função com <code>estudos.publish</code> executa a publicação protegida no servidor.</p></div>{can('estudos.publish') ? <Button onClick={publish} disabled={!COMUNHAO_ESTUDOS_CATALOG_SCHEMA_ENABLED || working}><Award size={16} /> Publicar curso</Button> : <Badge tone="neutral"><UserRound size={13} /> Sem permissão de publicação</Badge>}</Card>}
  </div></main>;
}
