import { useEffect, useState } from 'react';
import { BookOpenCheck, RefreshCw, X } from 'lucide-react';
import { listLegalDocuments, type LegalDocument } from '../../services/legalAcceptanceService';
import LegalDocumentViewer from './LegalDocumentViewer';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function LegalCenterDialog({ open, onClose }: Props) {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [viewing, setViewing] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError('');
    listLegalDocuments()
      .then(setDocuments)
      .catch(() => setError('Não foi possível carregar os documentos.'))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[230] flex items-end bg-black/70 sm:items-center sm:justify-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="legal-center-title">
      <section className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[1.75rem] border border-[var(--border)] bg-[var(--surface-elevated)] p-5 shadow-2xl sm:max-w-xl sm:rounded-[1.75rem] sm:p-6">
        <header className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent-primary)]">Transparência</p>
            <h2 id="legal-center-title" className="mt-1 font-display text-2xl font-semibold text-[var(--text-primary)]">Documentos do Comunhão</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Consulte a qualquer momento os documentos vigentes e seu registro de aceite.</p>
          </div>
          <button type="button" aria-label="Fechar" onClick={onClose} className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)]">
            <X size={19} />
          </button>
        </header>

        <div className="mt-5 space-y-3">
          {loading && <p className="flex min-h-24 items-center justify-center gap-2 text-sm text-[var(--text-muted)]"><RefreshCw size={16} className="animate-spin" /> Carregando…</p>}
          {error && <p role="alert" className="rounded-xl border border-[var(--danger)]/35 bg-[var(--danger)]/10 p-4 text-sm text-[var(--danger)]">{error}</p>}
          {!loading && documents.map(document => (
            <button key={`${document.codigo}:${document.versao}`} type="button" onClick={() => setViewing(document)} className="flex min-h-20 w-full items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-primary)]"><BookOpenCheck size={19} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[var(--text-primary)]">{document.titulo}</span>
                <span className="mt-1 block text-xs text-[var(--text-muted)]">Versão {document.versao}{document.aceito_em ? ` · registrado em ${new Date(document.aceito_em).toLocaleDateString('pt-BR')}` : ''}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="mt-5 text-xs leading-5 text-[var(--text-muted)]">Solicitações de privacidade: charlesaquino33@gmail.com</p>
      </section>
      {viewing && <LegalDocumentViewer document={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
