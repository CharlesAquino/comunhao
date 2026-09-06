import { createPortal } from 'react-dom';
import { Clock3, QrCode, ShieldCheck, X } from 'lucide-react';
import Button from '../ui/Button';
import CantinaPayloadQr from './CantinaPayloadQr';
import type { CantinaImmediateRedemption } from '../../types/cantina';

export default function CantinaOperatorCheckoutSheet({ checkout, onCancel }: { checkout: CantinaImmediateRedemption; onCancel: () => void }) {
  return createPortal(
    <div className="app-modal-layer fixed inset-0 flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="operator-checkout-title">
      <section className="max-h-[calc(100dvh-1rem)] w-full max-w-md overflow-y-auto rounded-t-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 pb-[calc(1.25rem+var(--safe-area-bottom))] shadow-2xl sm:rounded-[2rem]">
        <header className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] txt-green">Solicitação criada</p><h2 id="operator-checkout-title" className="mt-1 font-display text-2xl font-semibold txt-primary">Aguardando confirmação</h2></div><button type="button" onClick={onCancel} className="button-quiet grid size-10 place-items-center rounded-xl" aria-label="Fechar e cancelar"><X size={18} /></button></header>

        <div className="mt-5 rounded-[1.5rem] border border-[var(--accent-border)] bg-[var(--accent-soft)] p-5 text-center"><p className="text-xs uppercase tracking-[0.12em] txt-secondary">Total do resgate</p><strong className="mt-1 block font-display text-4xl text-[var(--celebration)]">{checkout.total_kesef} K</strong></div>

        <div className="mx-auto mt-5 w-fit rounded-[1.5rem] border border-[var(--border)] bg-white p-3 shadow-lg"><CantinaPayloadQr payload={{ v: 1, type: 'cantina_immediate', code: checkout.codigo }} label="QR Code para confirmar o resgate" /></div>
        <div className="mt-4 text-center"><div className="inline-flex items-center gap-2 text-xs txt-muted"><QrCode size={15} /> QR Code ou código manual</div><strong className="mt-2 block font-mono text-3xl tracking-[0.22em] text-[var(--celebration)]">{checkout.codigo}</strong></div>

        <div className="mt-5 grid grid-cols-2 gap-2"><div className="rounded-2xl border border-[var(--border)] p-3 text-center"><Clock3 size={18} className="mx-auto txt-muted" /><p className="mt-2 text-xs font-semibold txt-primary">Expira em 5 minutos</p></div><div className="rounded-2xl border border-[var(--border)] p-3 text-center"><ShieldCheck size={18} className="mx-auto txt-green" /><p className="mt-2 text-xs font-semibold txt-primary">Débito após confirmação</p></div></div>
        <p className="mt-4 text-center text-xs leading-relaxed txt-tertiary">O beneficiário lê o QR Code ou informa o código no mecanismo de resgate e confirma no próprio aparelho.</p>
        <Button className="mt-5 w-full" variant="ghost" onClick={onCancel}>Cancelar solicitação</Button>
      </section>
    </div>,
    document.body,
  );
}
