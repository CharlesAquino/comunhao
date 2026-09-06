import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, CheckCircle2, Keyboard, Nfc, QrCode, ShieldCheck, X } from 'lucide-react';
import Button from '../ui/Button';
import CantinaQrScanner from './CantinaQrScanner';
import { confirmImmediateCantinaRedemption, previewImmediateCantinaRedemption } from '../../services/cantinaService';
import type { CantinaImmediateRedemptionPreview, CantinaPublicListing } from '../../types/cantina';

type Method = 'menu' | 'qr' | 'codigo' | 'nfc';

interface Props {
  product: CantinaPublicListing;
  balance: number;
  onClose: () => void;
  onCompleted: () => Promise<void> | void;
}

export default function CantinaRedemptionSheet({ product, balance, onClose, onCompleted }: Props) {
  const [method, setMethod] = useState<Method>('menu');
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<CantinaImmediateRedemptionPreview | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const nfcSupported = typeof window !== 'undefined' && 'NDEFReader' in window;

  const locate = async (redemptionCode: string) => {
    setProcessing(true);
    setError('');
    try {
      setPreview(await previewImmediateCantinaRedemption(redemptionCode));
    } catch {
      setError('Código inválido, expirado ou já utilizado. Confira com o operador.');
    } finally {
      setProcessing(false);
    }
  };

  const confirm = async () => {
    if (!preview) return;
    setProcessing(true);
    setError('');
    try {
      await confirmImmediateCantinaRedemption(preview.id, preview.codigo);
      await onCompleted();
      onClose();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '';
      setError(message.includes('SALDO_INSUFICIENTE')
        ? 'Saldo Kesef insuficiente para concluir este resgate.'
        : 'Não foi possível concluir. Peça ao operador para conferir o pedido.');
    } finally {
      setProcessing(false);
    }
  };

  const content = (
    <div className="app-modal-layer fixed inset-0 flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="cantina-redemption-title" onClick={onClose}>
      <section className="max-h-[calc(100dvh-1rem)] w-full max-w-md overflow-y-auto rounded-t-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 pb-[calc(1.25rem+var(--safe-area-bottom))] shadow-2xl sm:rounded-[2rem]" onClick={event => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {method !== 'menu' && !preview && <button type="button" onClick={() => { setMethod('menu'); setError(''); }} className="button-quiet grid size-10 shrink-0 place-items-center rounded-xl" aria-label="Voltar"><ArrowLeft size={18} /></button>}
            <div><p className="text-[10px] font-bold uppercase tracking-[0.15em] txt-green">Resgate Cantina</p><h2 id="cantina-redemption-title" className="mt-1 font-display text-2xl font-semibold txt-primary">{preview ? 'Confirmar resgate' : method === 'menu' ? 'Resgatar com Kesef' : method === 'qr' ? 'Ler QR Code' : method === 'nfc' ? 'Usar NFC' : 'Digitar código'}</h2></div>
          </div>
          <button type="button" onClick={onClose} className="button-quiet grid size-10 shrink-0 place-items-center rounded-xl" aria-label="Fechar"><X size={18} /></button>
        </header>

        {!preview && method === 'menu' && <>
          <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-[var(--accent-border)] bg-[var(--accent-soft)] p-4">
            <div className="flex items-center gap-3">
              {product.imagem_url ? <img src={product.imagem_url} alt="" className="size-16 rounded-2xl object-cover" /> : null}
              <div className="min-w-0 flex-1"><p className="text-xs txt-tertiary">{product.evento_nome}</p><h3 className="truncate font-display text-xl font-semibold txt-primary">{product.produto_nome}</h3></div>
              <strong className="shrink-0 font-display text-2xl text-[var(--celebration)]">{product.valor_kesef} K</strong>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-[var(--accent-border)] pt-3 text-sm"><span className="txt-secondary">Saldo disponível</span><strong className="txt-primary">{balance} Kesef</strong></div>
          </div>
          <p className="mt-5 text-xs leading-relaxed txt-tertiary">O operador monta o pedido e mostra um QR Code ou código. Escolha como deseja localizar esse pedido.</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button type="button" onClick={() => setMethod('qr')} className="button-quiet flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-2 text-center"><QrCode size={24} className="txt-green" /><span className="text-xs font-semibold txt-primary">QR Code</span></button>
            <button type="button" onClick={() => setMethod('codigo')} className="button-quiet flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-2 text-center"><Keyboard size={24} className="text-[var(--celebration)]" /><span className="text-xs font-semibold txt-primary">Código</span></button>
            <button type="button" disabled={!nfcSupported} onClick={() => setMethod('nfc')} className="button-quiet flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-2 text-center disabled:opacity-45"><Nfc size={26} className="text-sky-500" /><span className="text-xs font-semibold txt-primary">NFC</span></button>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 text-[11px] txt-muted"><ShieldCheck size={16} className="shrink-0 txt-green" /> O Kesef só é debitado após sua confirmação.</div>
        </>}

        {!preview && method === 'qr' && <div className="mt-5"><CantinaQrScanner onCode={value => { setCode(value); setMethod('codigo'); void locate(value); }} onClose={() => setMethod('menu')} /></div>}

        {!preview && method === 'codigo' && <div className="mt-6 space-y-4"><p className="text-sm txt-tertiary">Digite os seis caracteres exibidos no caixa.</p><input autoFocus value={code} onChange={event => setCode(event.target.value.toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 6))} className="input-theme min-h-16 w-full rounded-2xl px-4 text-center font-mono text-2xl tracking-[0.25em]" placeholder="CÓDIGO" /><Button className="w-full !min-h-14" onClick={() => locate(code)} disabled={processing || code.length < 6}>{processing ? 'Localizando…' : 'Continuar'}</Button></div>}

        {!preview && method === 'nfc' && <div className="mt-6 rounded-[1.5rem] border border-sky-500/25 bg-sky-500/10 p-7 text-center"><Nfc size={48} className="mx-auto text-sky-500" /><h3 className="mt-4 text-lg font-semibold txt-primary">Aproxime da etiqueta do caixa</h3><p className="mt-2 text-xs leading-relaxed txt-tertiary">O NFC depende de etiqueta compatível. Se não houver, use QR Code ou código.</p></div>}

        {preview && <div className="mt-5 space-y-4">
          <div className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-elevated)] p-4"><p className="text-xs txt-tertiary">{preview.evento}</p><div className="mt-3 space-y-3">{preview.itens.map((item, index) => <div key={`${item.nome}-${index}`} className="flex items-center justify-between gap-3"><span className="text-sm txt-secondary">{item.quantidade}× {item.nome}</span><strong className="txt-primary">{item.subtotal_kesef} K</strong></div>)}</div></div>
          <div className="rounded-[1.5rem] bg-[var(--accent-soft)] p-4"><div className="flex items-end justify-between"><span className="text-sm txt-secondary">Total</span><strong className="font-display text-3xl text-[var(--celebration)]">{preview.total_kesef} K</strong></div><div className="mt-3 flex justify-between border-t border-[var(--accent-border)] pt-3 text-xs"><span className="txt-muted">Saldo após confirmar</span><strong className="txt-primary">{preview.saldo - preview.total_kesef} K</strong></div></div>
          {error && <p className="rounded-xl bg-rose-500/10 p-3 text-xs text-rose-400">{error}</p>}
          <Button className="w-full !min-h-14 text-base" onClick={confirm} disabled={processing || preview.saldo < preview.total_kesef}><CheckCircle2 size={19} /> {preview.saldo < preview.total_kesef ? 'Saldo insuficiente' : processing ? 'Confirmando…' : 'Confirmar resgate'}</Button>
        </div>}

        {!preview && error && <p className="mt-4 rounded-xl bg-rose-500/10 p-3 text-xs text-rose-400">{error}</p>}
      </section>
    </div>
  );

  return createPortal(content, document.body);
}
