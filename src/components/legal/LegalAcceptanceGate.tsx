import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { BookOpenCheck, Check, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { CURRENT_RELEASE } from '../../config/releaseInfo';
import { signOut } from '../../services/authService';
import {
  acceptLegalDocuments,
  hasPendingLegalDocuments,
  listLegalDocuments,
  type LegalDocument,
} from '../../services/legalAcceptanceService';
import AppBrandMark from '../ui/AppBrandMark';
import Button from '../ui/Button';
import LegalDocumentViewer from './LegalDocumentViewer';

interface Props {
  children: ReactNode;
}

export default function LegalAcceptanceGate({ children }: Props) {
  const [documents, setDocuments] = useState<LegalDocument[] | null>(null);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<LegalDocument | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setError('');
    try {
      const nextDocuments = await listLegalDocuments();
      if (nextDocuments.length === 0) {
        throw new Error('Nenhum documento legal vigente foi encontrado.');
      }
      setDocuments(nextDocuments);
    } catch {
      setError('Não foi possível verificar os documentos obrigatórios. Confira sua conexão e tente novamente.');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const pending = useMemo(
    () => (documents ?? []).filter(document => !document.aceito_em),
    [documents],
  );
  const allConfirmed = pending.length > 0 && pending.every(document => confirmed.has(document.codigo));

  if (documents && !hasPendingLegalDocuments(documents)) return children;

  const toggle = (code: string) => {
    setConfirmed(current => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const submit = async () => {
    if (!documents || !allConfirmed || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await acceptLegalDocuments(documents, CURRENT_RELEASE.versionName);
      await load();
    } catch {
      setError('Não foi possível registrar o aceite. Nenhuma confirmação foi perdida; tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const exit = async () => {
    await signOut();
  };

  return (
    <div className="fixed inset-0 z-[240] overflow-y-auto bg-[var(--canvas)]">
      <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:justify-center sm:px-6 sm:py-10">
        <section className="overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
          <header className="border-b border-[var(--border)] bg-[var(--surface-elevated)] px-5 py-6 sm:px-8 sm:py-7">
            <div className="flex items-center gap-3">
              <AppBrandMark />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--accent-primary)]">Acesso responsável</p>
                <p className="font-display text-lg font-semibold text-[var(--text-primary)]">Comunhão</p>
              </div>
            </div>
            <div className="mt-6 flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-primary)]">
                <ShieldCheck size={22} />
              </span>
              <div>
                <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">Antes de continuar</h1>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Conheça a identidade cristã do Comunhão, as regras de convivência e como seus dados são protegidos.
                </p>
              </div>
            </div>
          </header>

          <div className="space-y-3 px-4 py-5 sm:px-8 sm:py-6">
            {!documents && !error && (
              <div className="flex min-h-32 items-center justify-center gap-3 text-sm text-[var(--text-muted)]" role="status">
                <RefreshCw size={18} className="animate-spin" />
                Carregando documentos…
              </div>
            )}

            {pending.map(document => {
              const checked = confirmed.has(document.codigo);
              return (
                <article key={`${document.codigo}:${document.versao}`} className={`rounded-2xl border p-4 transition-colors ${checked ? 'border-[var(--accent-border)] bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface-elevated)]'}`}>
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      aria-label={`${document.tipo_aceite === 'ciencia' ? 'Estou ciente de' : 'Aceito'} ${document.titulo}`}
                      onClick={() => toggle(document.codigo)}
                      className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border ${checked ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--canvas)]' : 'border-[var(--border-strong)] bg-[var(--surface)] text-transparent'}`}
                    >
                      <Check size={16} strokeWidth={3} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{document.titulo}</h2>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">v{document.versao}</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{document.resumo}</p>
                      <button type="button" onClick={() => setViewing(document)} className="mt-2 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-[var(--accent-primary)]">
                        <BookOpenCheck size={15} />
                        Ler documento completo
                      </button>
                      <p className="text-xs font-medium text-[var(--text-primary)]">
                        {document.tipo_aceite === 'ciencia' ? 'Li e estou ciente.' : 'Li e aceito.'}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}

            {error && (
              <div role="alert" className="rounded-2xl border border-[var(--danger)]/35 bg-[var(--danger)]/10 p-4 text-sm leading-6 text-[var(--danger)]">
                {error}
              </div>
            )}

            <p className="text-xs leading-5 text-[var(--text-muted)]">
              Controlador: Charles Thadeu Pereira de Aquino · Privacidade: charlesaquino33@gmail.com
            </p>
          </div>

          <footer className="space-y-3 border-t border-[var(--border)] bg-[var(--surface-elevated)] p-4 sm:px-8 sm:py-5">
            {error && !documents ? (
              <Button className="w-full" onClick={() => void load()}>
                <RefreshCw size={17} />
                Tentar novamente
              </Button>
            ) : (
              <Button className="w-full" disabled={!allConfirmed || submitting} onClick={() => void submit()}>
                <ShieldCheck size={18} />
                {submitting ? 'Registrando aceite…' : 'Aceitar e entrar no Comunhão'}
              </Button>
            )}
            <Button variant="ghost" className="w-full" onClick={() => void exit()}>
              <LogOut size={17} />
              Não concordo e quero sair
            </Button>
          </footer>
        </section>
      </main>
      {viewing && <LegalDocumentViewer document={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
