import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff, KeyRound, ShieldCheck, X } from 'lucide-react';
import { changePassword, validateNewPassword } from '../../services/authService';
import Button from '../ui/Button';
import SealIcon from '../ui/SealIcon';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (otherSessionsSignedOut: boolean) => void;
}

export default function ChangePasswordDialog({ open, onClose, onSuccess }: Props) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) return;
    setPassword('');
    setConfirmation('');
    setShowPassword(false);
    setSubmitting(false);
    setError('');
  }, [open]);

  if (!open) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const validationError = validateNewPassword(password, confirmation);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const result = await changePassword(password);
      onSuccess(result.otherSessionsSignedOut);
      onClose();
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : 'Não foi possível alterar a senha.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[240] flex items-end bg-black/70 sm:items-center sm:justify-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
      <section className="w-full rounded-t-[1.75rem] border border-[var(--border)] bg-[var(--surface-elevated)] p-5 shadow-2xl sm:max-w-md sm:rounded-[1.75rem] sm:p-6">
        <header className="flex items-start gap-4">
          <SealIcon Icon={KeyRound} size="md" active />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent-primary)]">Segurança da conta</p>
            <h2 id="change-password-title" className="mt-1 font-display text-2xl font-semibold text-[var(--text-primary)]">Alterar senha</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Use uma senha nova, com pelo menos 8 caracteres, que você não utilize em outros serviços.</p>
          </div>
          <button type="button" aria-label="Fechar" onClick={onClose} disabled={submitting} className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] disabled:opacity-50">
            <X size={19} />
          </button>
        </header>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="new-password" className="mb-2 block text-xs font-semibold text-[var(--text-secondary)]">Nova senha</label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={event => { setPassword(event.target.value); setError(''); }}
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                autoFocus
                required
                disabled={submitting}
                className="input-theme min-h-12 w-full rounded-xl border px-4 pr-12 text-sm outline-none"
              />
              <button type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPassword(value => !value)} className="absolute inset-y-0 right-0 flex min-w-12 items-center justify-center text-[var(--text-muted)]">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-2 block text-xs font-semibold text-[var(--text-secondary)]">Confirmar nova senha</label>
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              value={confirmation}
              onChange={event => { setConfirmation(event.target.value); setError(''); }}
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              required
              disabled={submitting}
              className="input-theme min-h-12 w-full rounded-xl border px-4 text-sm outline-none"
            />
          </div>

          {error && <p role="alert" className="rounded-xl border border-[var(--danger)]/35 bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)]">{error}</p>}

          <div className="flex items-start gap-2 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)] p-3 text-xs leading-5 text-[var(--text-secondary)]">
            <ShieldCheck size={17} className="mt-0.5 shrink-0 text-[var(--accent-primary)]" aria-hidden="true" />
            A senha será alterada diretamente no serviço de autenticação. O Comunhão não consegue visualizá-la.
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancelar</Button>
            <Button type="submit" disabled={submitting || password.length < 8 || confirmation.length < 8}>
              {submitting ? 'Alterando…' : 'Alterar senha'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
