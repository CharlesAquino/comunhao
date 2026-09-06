import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import Button from '../ui/Button';
import SealIcon from '../ui/SealIcon';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const CONFIRMATION = 'REMOVER';

export default function DeleteAccountDialog({ open, onClose, onConfirm }: Props) {
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) return;
    setConfirmation('');
    setSubmitting(false);
    setError('');
  }, [open]);

  if (!open) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || confirmation !== CONFIRMATION) return;
    setSubmitting(true);
    setError('');
    try {
      await onConfirm();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível solicitar a remoção.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-end bg-black/75 sm:items-center sm:justify-center sm:p-6" role="alertdialog" aria-modal="true" aria-labelledby="delete-account-title" aria-describedby="delete-account-description">
      <section className="w-full rounded-t-[1.75rem] border border-[var(--danger)]/35 bg-[var(--surface-elevated)] p-5 shadow-2xl sm:max-w-md sm:rounded-[1.75rem] sm:p-6">
        <header className="flex items-start gap-4">
          <SealIcon Icon={Trash2} size="md" className="text-[var(--danger)]" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--danger)]">Ação sensível</p>
            <h2 id="delete-account-title" className="mt-1 font-display text-2xl font-semibold text-[var(--text-primary)]">Remover minha conta</h2>
          </div>
          <button type="button" aria-label="Fechar" onClick={onClose} disabled={submitting} className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] disabled:opacity-50"><X size={19} /></button>
        </header>

        <div id="delete-account-description" className="mt-5 space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
          <p>Seu acesso será bloqueado e a solicitação entrará na fila de exclusão e anonimização.</p>
          <p>Alguns registros podem ser anonimizados ou mantidos pelo prazo estritamente necessário conforme as políticas vigentes. A conclusão está prevista em até 15 dias.</p>
          <p className="flex items-start gap-2 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-3 text-[var(--danger)]"><AlertTriangle size={17} className="mt-0.5 shrink-0" />Você sairá da conta imediatamente.</p>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="delete-account-confirmation" className="mb-2 block text-xs font-semibold text-[var(--text-secondary)]">Digite <strong>{CONFIRMATION}</strong> para confirmar</label>
            <input id="delete-account-confirmation" value={confirmation} onChange={event => { setConfirmation(event.target.value.toUpperCase()); setError(''); }} autoComplete="off" autoFocus disabled={submitting} className="input-theme min-h-12 w-full rounded-xl border px-4 text-sm outline-none" />
          </div>
          {error && <p role="alert" className="rounded-xl border border-[var(--danger)]/35 bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)]">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancelar</Button>
            <Button variant="danger" type="submit" disabled={submitting || confirmation !== CONFIRMATION}>{submitting ? 'Solicitando…' : 'Remover conta'}</Button>
          </div>
        </form>
      </section>
    </div>
  );
}
