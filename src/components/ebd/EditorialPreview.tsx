import { Image, Video } from 'lucide-react';
import { getQuizSettings, type EbdEditorialDay, type EbdEditorialLesson } from '../../types/ebdEditorial';
import { getEbdBlockLabel } from '../../services/ebdStudioRules';

export default function EditorialPreview({ lesson, day }: { lesson: EbdEditorialLesson; day: EbdEditorialDay }) {
  return (
    <div className="mx-auto w-full max-w-[330px] overflow-hidden rounded-[2rem] border-[6px] border-[var(--text-primary)] bg-[var(--canvas)] shadow-2xl">
      <div className="h-5 bg-[var(--text-primary)]" />
      <div className="max-h-[620px] space-y-3 overflow-y-auto p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent-primary)]">
          Lição {lesson.number} · {day.label}
        </p>
        <h2 className="font-display text-xl text-[var(--text-primary)]">{day.title || 'Título do dia'}</h2>
        <p className="text-xs text-[var(--text-secondary)]">{day.subtitle || lesson.subtitle}</p>
        {day.blocks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center text-xs text-[var(--text-muted)]">
            Adicione blocos para visualizar o dia.
          </div>
        )}
        {day.blocks.map(block => (
          <div key={block.id} className="premium-surface rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-[var(--celebration)]">
              {getEbdBlockLabel(block.type)}
            </p>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{block.title || 'Sem título'}</h3>
            {block.reference && <p className="mt-1 text-xs font-semibold text-[var(--accent-primary)]">{block.reference}</p>}
            {block.content && <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-[var(--text-secondary)]">{block.content}</p>}
            {block.type === 'quiz' && (
              <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                {getQuizSettings(block).questions.length} pergunta(s) configurada(s)
              </p>
            )}
            {(block.type === 'video' || block.type === 'hero') && !block.mediaUrl && (
              <div className="mt-3 flex min-h-20 items-center justify-center rounded-xl bg-[var(--surface-highlighted)] text-[var(--text-muted)]">
                {block.type === 'video' ? <Video size={22} /> : <Image size={22} />}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
