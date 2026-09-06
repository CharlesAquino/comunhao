import { X } from 'lucide-react';
import type { LegalDocument } from '../../services/legalAcceptanceService';
import Button from '../ui/Button';

interface Props {
  document: LegalDocument;
  onClose: () => void;
}

export default function LegalDocumentViewer({ document, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[260] flex items-end bg-black/75 sm:items-center sm:justify-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="legal-document-title">
      <section className="flex max-h-[96dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] border border-[var(--border)] bg-[var(--surface-elevated)] shadow-2xl sm:max-w-3xl sm:rounded-[1.75rem]">
        <header className="flex items-start gap-4 border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent-primary)]">Documento vigente · versão {document.versao}</p>
            <h2 id="legal-document-title" className="mt-1 font-display text-xl font-semibold text-[var(--text-primary)]">{document.titulo}</h2>
          </div>
          <button type="button" aria-label="Fechar documento" onClick={onClose} className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)]">
            <X size={19} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
          <div className="whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">{document.conteudo.trim()}</div>
        </div>
        <footer className="border-t border-[var(--border)] bg-[var(--surface)] p-4 sm:px-6">
          <Button className="w-full" onClick={onClose}>Fechar documento</Button>
        </footer>
      </section>
    </div>
  );
}
