import type { HTMLAttributes, ReactNode } from 'react';

type Variant = 'standard' | 'actionable' | 'highlighted';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  standard: 'bg-[var(--surface)] border-[var(--border)]',
  actionable: 'bg-[var(--surface)] border-[var(--border)] transition-premium hover:border-[var(--accent-primary)]',
  highlighted: 'bg-[var(--surface-highlighted)] border-[var(--celebration-border)]',
};

export default function Card({ variant = 'standard', className = '', children, ...props }: CardProps) {
  return (
    <div className={`premium-surface rounded-2xl border ${variants[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}
