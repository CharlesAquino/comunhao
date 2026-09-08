import { useMemo } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { EbdEditorialDay } from '../../types/ebdEditorial';
import { getQuizSettings } from '../../types/ebdEditorial';

interface PreflightCheck {
  id: string;
  category: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  passed: boolean;
}

interface Props {
  day: EbdEditorialDay;
}

export default function EditorialPreflight({ day }: Props) {
  const checks = useMemo<PreflightCheck[]>(() => {
    const list: PreflightCheck[] = [];

    // 1. Quantidade mínima de blocos
    const hasBlocks = day.blocks.length > 0;
    list.push({
      id: 'blocks-count',
      category: 'critical',
      title: 'Presença de conteúdo',
      description: hasBlocks
        ? `${day.blocks.length} bloco(s) configurado(s) para ${day.label}.`
        : `O dia está sem blocos. Adicione conteúdo antes de publicar.`,
      passed: hasBlocks,
    });

    if (!hasBlocks) return list;

    // 2. Título do dia
    const hasTitle = Boolean(day.title && day.title.trim().length >= 4);
    list.push({
      id: 'day-title',
      category: 'warning',
      title: 'Título do recorte diário',
      description: hasTitle
        ? `Título definido: "${day.title}".`
        : `Defina um título específico para ${day.label}.`,
      passed: hasTitle,
    });

    // 3. Checagem de Quiz (Gabaritos e alternativas)
    const quizBlock = day.blocks.find(b => b.type === 'quiz');
    if (quizBlock) {
      const quizSettings = getQuizSettings(quizBlock);
      const questions = quizSettings.questions;
      const validQuestions = questions.length >= 1 && questions.every(q =>
        q.prompt.trim().length >= 5 &&
        q.options.length >= 2 &&
        Array.isArray(q.correctAnswers) &&
        q.correctAnswers.length >= 1 &&
        q.correctAnswers.every(ans => ans >= 0 && ans < q.options.length)
      );

      list.push({
        id: 'quiz-integrity',
        category: 'critical',
        title: 'Integridade pedagógica do Quiz',
        description: validQuestions
          ? `${questions.length} questão(ões) com alternativas e gabaritos válidos.`
          : 'Existem questões incompletas, sem alternativas ou sem gabarito configurado.',
        passed: validQuestions,
      });
    }

    // 4. Pergunta de Reflexão
    const reflectionBlock = day.blocks.find(b => b.type === 'reflection');
    if (reflectionBlock) {
      const text = reflectionBlock.content.trim();
      const questionCount = (text.match(/\?/g) ?? []).length;
      const endsWithQuestion = text.endsWith('?');
      const validReflection = questionCount === 1 && endsWithQuestion;

      list.push({
        id: 'reflection-format',
        category: 'warning',
        title: 'Pergunta única na Reflexão',
        description: validReflection
          ? 'Bloco conclui com exatamente uma pergunta reflexiva objetiva.'
          : 'A reflexão deve terminar com exatamente uma pergunta no encerramento (sem perguntas no início).',
        passed: validReflection,
      });
    }

    // 5. Linha do Tempo (Mínimo 3 marcos)
    const timelineBlock = day.blocks.find(b => b.type === 'timeline');
    if (timelineBlock) {
      const lines = timelineBlock.content.split('\n').filter(l => l.trim().length > 0);
      const validTimeline = lines.length >= 3;

      list.push({
        id: 'timeline-steps',
        category: 'warning',
        title: 'Sequência da Linha do Tempo',
        description: validTimeline
          ? `${lines.length} etapas registradas em progressão clara.`
          : 'Recomenda-se pelo menos 3 etapas ou acontecimentos numerados.',
        passed: validTimeline,
      });
    }

    // 6. Bloco Escritura / Bíblico com referência
    const scriptureBlock = day.blocks.find(b => b.type === 'scripture');
    if (scriptureBlock) {
      const hasRef = Boolean(scriptureBlock.reference && scriptureBlock.reference.trim().length >= 3);
      list.push({
        id: 'scripture-ref',
        category: 'warning',
        title: 'Referência bíblica da passagem',
        description: hasRef
          ? `Referência canônica indicada: ${scriptureBlock.reference}.`
          : 'Preencha o campo de referência do texto bíblico (livro, capítulo e versículos).',
        passed: hasRef,
      });
    }

    return list;
  }, [day]);

  const criticalIssues = checks.filter(c => !c.passed && c.category === 'critical');
  const warningIssues = checks.filter(c => !c.passed && c.category === 'warning');

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className={criticalIssues.length > 0 ? 'text-[var(--danger)]' : 'text-[var(--accent-primary)]'} />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Pre-Flight Editorial · {day.label}</h3>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
            criticalIssues.length > 0
              ? 'border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)]'
              : warningIssues.length > 0
              ? 'border-[var(--celebration)]/30 bg-[var(--celebration)]/10 text-[var(--celebration)]'
              : 'border-[var(--accent-primary)]/30 bg-[var(--accent-soft)] text-[var(--accent-primary)]'
          }`}
        >
          {criticalIssues.length > 0
            ? `${criticalIssues.length} pendência(s)`
            : warningIssues.length > 0
            ? `${warningIssues.length} aviso(s)`
            : 'Pronto para publicação'}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {checks.map(item => (
          <div key={item.id} className="flex items-start gap-2.5 text-xs">
            {item.passed ? (
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[var(--accent-primary)]" />
            ) : item.category === 'critical' ? (
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-[var(--danger)]" />
            ) : (
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[var(--celebration)]" />
            )}
            <div className="min-w-0 flex-1">
              <span className={`font-semibold ${item.passed ? 'text-[var(--text-primary)]' : item.category === 'critical' ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'}`}>
                {item.title}
              </span>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
