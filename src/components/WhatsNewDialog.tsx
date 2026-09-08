import { useEffect, useState } from 'react';
import { Check, Sparkles, X } from 'lucide-react';
import { CURRENT_RELEASE, OPEN_WHATS_NEW_EVENT } from '../config/releaseInfo';
import { isNativeAndroid } from '../services/updateService';
import { useAdmin } from '../contexts/AdminContext';
import Button from './ui/Button';
import Card from './ui/Card';

const STORAGE_KEY = 'comunhao:last-seen-release';

export default function WhatsNewDialog() {
  const [open, setOpen] = useState(false);
  const { isAdmin, can, hasAdminAccess } = useAdmin();
  const hasEstudosAccess = isAdmin || can('estudos.manage') || can('estudos.review') || hasAdminAccess;

  useEffect(() => {
    const openManually = () => setOpen(true);
    window.addEventListener(OPEN_WHATS_NEW_EVENT, openManually);

    if (isNativeAndroid() && hasEstudosAccess) {
      const lastSeen = Number(window.localStorage.getItem(STORAGE_KEY) ?? 0);
      if (lastSeen < CURRENT_RELEASE.versionCode) setOpen(true);
    }

    return () => window.removeEventListener(OPEN_WHATS_NEW_EVENT, openManually);
  }, [hasEstudosAccess]);

  const close = () => {
    window.localStorage.setItem(STORAGE_KEY, String(CURRENT_RELEASE.versionCode));
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <Card className="relative max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto p-5">
        <button
          type="button"
          onClick={close}
          aria-label="Fechar novidades"
          className="absolute right-3 top-3 grid size-11 place-items-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-highlighted)]"
        >
          <X size={19} />
        </button>

        <div className="grid size-14 place-items-center rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-primary)]">
          <Sparkles size={25} />
        </div>
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--celebration)]">
          Novidades da versão · {CURRENT_RELEASE.versionName}
        </p>
        <h2 className="mt-1 pr-8 font-display text-2xl leading-tight text-[var(--text-primary)]">
          {CURRENT_RELEASE.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          {CURRENT_RELEASE.summary}
        </p>

        <div className="mt-5 space-y-3 border-y border-[var(--border)] py-4">
          {CURRENT_RELEASE.notes.map(note => (
            <div key={note} className="flex gap-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-primary)]">
                <Check size={12} strokeWidth={2.5} />
              </span>
              <span>{note}</span>
            </div>
          ))}
        </div>

        <Button className="mt-5 w-full" onClick={close}>Continuar no Comunhão</Button>
        <p className="mt-3 text-center text-[11px] text-[var(--text-muted)]">
          Você poderá rever estas novidades pelo Perfil.
        </p>
      </Card>
    </div>
  );
}
