import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import BadgeRank from '../BadgeRank';
import { calcularPatente } from '../../services/patente';

interface PatentSealProps {
  xp: number;
  compact?: boolean;
}

export default function PatentSeal({ xp, compact = false }: PatentSealProps) {
  const [open, setOpen] = useState(false);
  const patent = calcularPatente(xp);

  useEffect(() => {
    if (!open) return;
    const closeOnBack = (event: Event) => {
      event.preventDefault();
      setOpen(false);
    };
    window.addEventListener('comunhao:back-request', closeOnBack);
    return () => window.removeEventListener('comunhao:back-request', closeOnBack);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="inline-flex shrink-0 items-center justify-center rounded-full p-0.5 transition-transform active:scale-90"
        onClick={() => setOpen(true)}
        aria-label={`Patente: ${patent.nome}. Toque para saber mais.`}
      >
        <BadgeRank rank={patent.badgeRank} size={compact ? 17 : 20} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[180] flex items-end justify-center bg-black/65 p-4 backdrop-blur-sm sm:items-center"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <section
            className="patent-seal-dialog w-full max-w-sm rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`patent-title-${patent.id}`}
            onClick={event => event.stopPropagation()}
          >
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-10 place-items-center rounded-full border border-[var(--border)] txt-secondary"
                aria-label="Fechar detalhes da patente"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col items-center text-center">
              <BadgeRank rank={patent.badgeRank} size={72} animated />
              <h2 id={`patent-title-${patent.id}`} className="mt-4 font-display text-2xl font-semibold txt-primary">
                {patent.nome}
              </h2>
              <p className="mt-2 max-w-xs text-sm leading-6 txt-secondary">
                {patent.descricao}. Esta patente representa constância na jornada, não popularidade.
              </p>
              <p className="mt-5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs txt-tertiary">
                Jornada de oração, estudo e comunhão
              </p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
