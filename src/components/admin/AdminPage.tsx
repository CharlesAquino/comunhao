import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import AppBrandMark from '../ui/AppBrandMark';

type Tone = 'accent' | 'celebration' | 'care' | 'neutral';

const toneClasses: Record<Tone, string> = {
  accent: 'bg-[var(--accent-soft)] text-[var(--accent-primary)]',
  celebration: 'bg-[var(--celebration-soft)] text-[var(--celebration)]',
  care: 'bg-[var(--care-soft)] text-[var(--care)]',
  neutral: 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]',
};

export function AdminPageHeader({ eyebrow, title, description, actions }: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex min-w-0 flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <AppBrandMark size="sm" className="size-6 drop-shadow-none" />
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--accent-primary)] sm:text-xs">{eyebrow}</p>
        </div>
        <h2 className="mt-2 font-display text-2xl font-semibold leading-tight tracking-[-0.025em] text-[var(--text-primary)] sm:text-3xl">{title}</h2>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-5 text-[var(--text-secondary)]">{description}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:shrink-0 sm:justify-end">{actions}</div>}
    </header>
  );
}

export function AdminSection({ title, description, actions, children, className = '' }: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`space-y-3 ${className}`}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-[var(--text-primary)] sm:text-xl">{title}</h3>
          {description && <p className="mt-0.5 text-xs leading-5 text-[var(--text-secondary)]">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function AdminMetric({ label, value, Icon, image, tone = 'neutral' }: {
  label: string;
  value: ReactNode;
  Icon?: LucideIcon;
  image?: string;
  tone?: Tone;
}) {
  return (
    <div className="flex min-h-20 items-center gap-3 px-3 py-2.5">
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${toneClasses[tone]}`}>
        {image ? <img src={image} alt="" className="size-8 object-contain" /> : Icon ? <Icon size={19} aria-hidden="true" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11px] text-[var(--text-secondary)]">{label}</span>
        <strong className="mt-0.5 block font-display text-xl font-semibold tabular-nums text-[var(--text-primary)]">{value}</strong>
      </span>
    </div>
  );
}

export function AdminMetricGrid({ children }: { children: ReactNode }) {
  return <div className="card-surface grid grid-cols-2 divide-x divide-y divide-[var(--border)] overflow-hidden sm:grid-cols-4 sm:divide-y-0">{children}</div>;
}

export function AdminToolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2 border-y border-[var(--border)] py-3 sm:flex-row sm:items-center">{children}</div>;
}

export function KesefAmount({ value, className = '' }: { value: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 tabular-nums ${className}`}>
      <img src="/kesef-coin.png" alt="Kesef" className="size-[1.35em] shrink-0 object-contain" />
      <span>{value}</span>
    </span>
  );
}
