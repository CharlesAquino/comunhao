import { useState } from 'react';

type SensitiveTextProps = {
  value: string;
  label?: string;
};

export function SensitiveText({ value, label = 'informação sensível' }: SensitiveTextProps) {
  const [revealed, setRevealed] = useState(false);
  const masked = value ? '•'.repeat(Math.min(Math.max(value.length, 6), 18)) : '—';

  return (
    <span className="inline-flex items-center gap-2">
      <span aria-label={revealed ? label : `${label} ocultada`}>
        {revealed ? value : masked}
      </span>
      {value ? (
        <button
          type="button"
          className="text-xs underline underline-offset-4"
          aria-pressed={revealed}
          onClick={() => setRevealed(current => !current)}
        >
          {revealed ? 'Ocultar' : 'Revelar'}
        </button>
      ) : null}
    </span>
  );
}
