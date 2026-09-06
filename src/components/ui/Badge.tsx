import type { ReactNode } from 'react';

type Tone = 'accent' | 'celebration' | 'care' | 'neutral';

const tones: Record<Tone, string> = {
  accent: 'bg-[var(--accent-soft)] text-[var(--accent-primary)] border-[var(--accent-border)]',
  celebration: 'bg-[var(--celebration-soft)] text-[var(--celebration)] border-[var(--celebration-border)]',
  care: 'bg-[var(--care-soft)] text-[var(--care)] border-[var(--care-border)]',
  neutral: 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] border-[var(--border)]',
};

export default function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-flex min-h-6 items-center gap-1 rounded-full border px-2.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
