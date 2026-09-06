import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Check, ChevronRight, Flag, Lightbulb, LockKeyhole, Play, Radio, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../src/components/ui/Card';
import Badge from '../src/components/ui/Badge';
import Button from '../src/components/ui/Button';
import SectionHeader from '../src/components/ui/SectionHeader';
import { PILOT_STUDY, STUDY_WEEKS, type StudyBlock } from '../src/types/comunhaoEstudos';
import { COMUNHAO_ESTUDOS_SCHEMA_ENABLED, getCompletedStudyBlockIds, getPublishedComunhaoStudies, markStudyBlockComplete } from '../src/services/comunhaoEstudosService';

const blockIcons = { video: Play, scripture: BookOpen, context: Sparkles, reflection: Lightbulb, mission: Flag, meeting: Radio };

function BlockRow({ block, onOpen }: { block: StudyBlock; onOpen: () => void }) {
  const Icon = blockIcons[block.type];
  return (
    <button type="button" onClick={onOpen} className="group flex min-h-20 w-full items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left transition-premium hover:border-[var(--accent-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]">
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl border ${block.completed ? 'border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-primary)]' : 'border-[var(--celebration-border)] bg-[var(--celebration-soft)] text-[var(--celebration)]'}`}>
        {block.completed ? <Check size={19} aria-hidden="true" /> : <Icon size={19} aria-hidden="true" />}
      </span>
      <span className="min-w-0 flex-1"><strong className="block text-sm txt-primary">{block.title}</strong><span className="mt-1 block text-xs leading-relaxed txt-tertiary">{block.summary}</span></span>
      <ChevronRight size={18} className="shrink-0 txt-tertiary transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </button>
  );
}

export default function ComunhaoEstudos() {
  const [blocks, setBlocks] = useState(PILOT_STUDY.blocks);
  const [study, setStudy] = useState(PILOT_STUDY);
  const [remoteState, setRemoteState] = useState<'local' | 'loading' | 'connected' | 'fallback'>('local');
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  useEffect(() => {
    if (!COMUNHAO_ESTUDOS_SCHEMA_ENABLED) return;
    let active = true;
    setRemoteState('loading');
    getPublishedComunhaoStudies().then(async studies => {
      if (!active) return;
      const first = studies[0];
      if (first) {
        let nextBlocks = first.blocks;
        try {
          const completedIds = await getCompletedStudyBlockIds({ studyId: first.id, version: first.version });
          nextBlocks = first.blocks.map(block => ({ ...block, completed: completedIds.includes(block.id) }));
        } catch {
          // O conteúdo remoto continua disponível mesmo quando o progresso não puder ser lido.
        }
        setStudy(first);
        setBlocks(nextBlocks);
      }
      setRemoteState('connected');
    }).catch(() => {
      if (active) setRemoteState('fallback');
    });
    return () => { active = false; };
  }, []);
  const completed = blocks.filter(block => block.completed).length;
  const progress = Math.round((completed / Math.max(blocks.length, 1)) * 100);

  const toggleBlock = (id: string) => {
    setBlocks(current => current.map(block => block.id === id ? { ...block, completed: !block.completed } : block));
    if (COMUNHAO_ESTUDOS_SCHEMA_ENABLED && !blocks.find(block => block.id === id)?.completed) {
      void markStudyBlockComplete({ studyId: study.id, blockId: id, version: study.version }).catch(() => undefined);
    }
  };
  const activeBlock = blocks.find(block => block.id === activeBlockId) ?? null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-5 pb-28 pt-8 sm:px-8 lg:px-10">
      <header className="flex items-start justify-between gap-4">
        <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--celebration)]">Comunhão Estudos</p><h1 className="font-display text-3xl font-semibold txt-primary sm:text-4xl">Uma jornada para conhecer Jesus</h1><p className="mt-3 max-w-2xl text-sm leading-6 txt-secondary">Estudos bíblicos em uma trilha gradual, com espaço para compreender, refletir e viver a Palavra em comunidade.</p>{remoteState === 'loading' && <p className="mt-3 text-xs txt-tertiary" role="status">Verificando estudos publicados…</p>}{remoteState === 'fallback' && <p className="mt-3 text-xs text-[var(--celebration)]" role="status">Exibindo o protótipo local enquanto o conteúdo remoto é preparado.</p>}</div>
        <Badge tone="celebration">Temporada piloto</Badge>
      </header>

      <Card variant="highlighted" className="overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="relative min-h-64 overflow-hidden p-6 sm:p-8"><img src="/hero.png" alt="Paisagem contemplativa para a temporada Quem é Jesus?" className="absolute inset-0 size-full object-cover opacity-45" /><div className="absolute inset-0 bg-gradient-to-r from-[var(--surface-highlighted)] via-[var(--surface-highlighted)]/75 to-transparent" /><div className="relative max-w-xl"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent-primary)]">Temporada 01</p><h2 className="mt-3 font-display text-4xl font-semibold leading-tight txt-primary sm:text-5xl">Quem é Jesus?</h2><p className="mt-3 max-w-sm text-sm leading-6 txt-secondary">O Evangelho de João como caminho para olhar para Cristo com mais profundidade.</p><Link to={`/estudos/estudo/${study.id}`} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--celebration)] px-4 text-sm font-bold text-[var(--celebration-contrast)] transition-premium hover:brightness-110">Continuar estudo <ArrowRight size={17} /></Link></div></div>
          <div className="flex flex-col justify-center gap-4 border-t border-[var(--border)] p-6 lg:border-l lg:border-t-0"><div className="flex items-center justify-between"><span className="text-sm txt-secondary">Progresso da temporada</span><strong className="font-display text-3xl txt-primary">{progress}%</strong></div><div className="h-2 overflow-hidden rounded-full bg-[var(--surface-elevated)]"><div className="h-full rounded-full bg-[var(--accent-primary)] transition-all" style={{ width: `${progress}%` }} /></div><p className="text-xs leading-5 txt-tertiary">Você está no começo da jornada. Cada etapa foi pensada para ser concluída com calma.</p></div>
        </div>
      </Card>

      <section className="space-y-4"><SectionHeader title="Sua temporada" eyebrow="Caminho de aprendizagem" /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{STUDY_WEEKS.map(item => <Card key={item.week} className={`p-4 ${item.status === 'locked' ? 'opacity-65' : ''}`}><div className="flex items-start justify-between gap-3"><span className={`grid size-9 place-items-center rounded-full border text-sm font-bold ${item.status === 'current' ? 'border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-primary)]' : 'border-[var(--border)] txt-tertiary'}`}>{item.status === 'locked' ? <LockKeyhole size={15} /> : item.week}</span>{item.status === 'current' && <Badge tone="accent">Atual</Badge>}</div><h3 className="mt-4 text-sm font-semibold txt-primary">{item.title}</h3><p className="mt-1 text-xs txt-tertiary">{item.reference}</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--surface-elevated)]"><div className="h-full rounded-full bg-[var(--accent-primary)]" style={{ width: `${item.progress}%` }} /></div></Card>)}</div></section>

      <section className="space-y-4"><SectionHeader title={`Semana ${study.week}`} eyebrow="O começo da jornada" action={<span className="text-xs txt-tertiary">{completed} de {blocks.length} etapas</span>} /><Card className="space-y-5 p-5 sm:p-6"><div><div className="flex flex-wrap items-center gap-2"><Badge tone="accent">{study.reference}</Badge><span className="text-xs txt-tertiary">{study.title}</span></div><h2 className="mt-3 font-display text-2xl txt-primary">{study.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 txt-secondary">{study.description}</p></div><div className="space-y-2">{blocks.map(block => <BlockRow key={block.id} block={block} onOpen={() => setActiveBlockId(block.id)} />)}</div>{activeBlock && <div className="rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-primary)]">Etapa do estudo</p><h3 className="mt-1 font-display text-xl txt-primary">{activeBlock.title}</h3><p className="mt-2 text-sm leading-6 txt-secondary">{activeBlock.summary}</p></div><Button variant="ghost" onClick={() => setActiveBlockId(null)}>Fechar</Button></div><p className="mt-4 text-sm leading-6 txt-secondary">Este espaço receberá o conteúdo editorial definido para esta etapa. O formato pode ser texto, vídeo, áudio, reflexão, missão ou encontro, conforme o estudo.</p><Button className="mt-4" onClick={() => { toggleBlock(activeBlock.id); setActiveBlockId(null); }}>{activeBlock.completed ? 'Marcar como pendente' : 'Marcar como concluído'}</Button></div>}<div className="flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 txt-tertiary">A composição deste estudo é definida pelo conteúdo, não por um molde fixo.</p><Button disabled={completed !== blocks.length} className="sm:min-w-44">{completed === blocks.length ? 'Estudo concluído' : 'Concluir estudo'}</Button></div></Card></section>
    </div>
  );
}
