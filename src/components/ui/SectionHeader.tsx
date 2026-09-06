import type { ReactNode } from 'react';

export default function SectionHeader({ title, eyebrow, action }: { title: string; eyebrow?: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--celebration)]">{eyebrow}</p>}
        <h2 className="font-display text-xl font-semibold text-[var(--text-primary)]">{title}</h2>
      </div>
      {action}
    </div>
  );
}
