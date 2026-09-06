import type { LucideIcon } from 'lucide-react';

export function LoadingState({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-[var(--text-secondary)]" role="status">
      <div className="size-7 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({ Icon, title, description }: { Icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-primary)]">
        <Icon size={22} aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="mt-1 max-w-64 text-sm text-[var(--text-secondary)]">{description}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return <div className="flex min-h-64 items-center justify-center p-6 text-center text-sm text-[var(--danger)]" role="alert">{message}</div>;
}
