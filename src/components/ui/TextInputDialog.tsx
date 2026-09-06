import { useEffect, useId, useRef } from 'react';
import Button from './Button';

interface TextInputDialogProps {
  open: boolean;
  title: string;
  description: string;
  label: string;
  value: string;
  confirmLabel: string;
  busy?: boolean;
  danger?: boolean;
  minLength?: number;
  onChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function TextInputDialog({
  open,
  title,
  description,
  label,
  value,
  confirmLabel,
  busy = false,
  danger = false,
  minLength = 1,
  onChange,
  onCancel,
  onConfirm,
}: TextInputDialogProps) {
  const titleId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  const valid = value.trim().length >= minLength;
  return (
    <div className="fixed inset-0 z-[190] flex items-end justify-center bg-black/65 p-3 backdrop-blur-sm sm:items-center" onMouseDown={() => !busy && onCancel()}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5 shadow-2xl"
        onMouseDown={event => event.stopPropagation()}
      >
        <h2 id={titleId} className="font-display text-xl text-[var(--text-primary)]">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>
        <label htmlFor={inputId} className="mt-5 block text-xs font-semibold text-[var(--text-secondary)]">
          {label}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          value={value}
          disabled={busy}
          onChange={event => onChange(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && valid && !busy) onConfirm();
          }}
          className="input-theme mt-2 min-h-12 w-full rounded-xl border px-3"
        />
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>Cancelar</Button>
          <Button type="button" variant={danger ? 'danger' : 'primary'} disabled={busy || !valid} onClick={onConfirm}>
            {busy ? 'Processando…' : confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
