import { Minus, Plus, ReceiptText, ShieldCheck, Store } from 'lucide-react';
import Button from '../ui/Button';
import type { CantinaStockItem } from '../../types/cantina';

interface Props {
  stock: CantinaStockItem[];
  cart: Record<string, number>;
  processing: boolean;
  onChange: (announcementId: string, quantity: number) => void;
  onCreate: () => void;
}

export default function CantinaOperatorPos({ stock, cart, processing, onChange, onCreate }: Props) {
  const products = stock.filter(item => item.anuncio_id && item.anuncio_status === 'publicado' && item.quantidade_disponivel > 0);
  const selected = products.filter(item => item.anuncio_id && (cart[item.anuncio_id] ?? 0) > 0);
  const units = selected.reduce((sum, item) => sum + cart[item.anuncio_id!], 0);
  const total = selected.reduce((sum, item) => sum + cart[item.anuncio_id!] * (item.valor_kesef ?? 0), 0);

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--card-shadow)]" aria-labelledby="operator-pos-title">
      <div className="border-b border-[var(--border)] p-5">
        <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] txt-green">Operação presencial</p><h3 id="operator-pos-title" className="mt-1 font-display text-2xl font-semibold txt-primary">Novo resgate</h3><p className="mt-1 text-xs txt-tertiary">Selecione os itens e gere a confirmação para o beneficiário.</p></div><span className="grid size-11 place-items-center rounded-2xl bg-[var(--accent-soft)]"><Store size={20} className="txt-green" /></span></div>

        <div className="mt-5 rounded-[1.5rem] border border-[var(--accent-border)] bg-[var(--accent-soft)] p-5">
          <div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] txt-secondary">Total do resgate</p><strong className="mt-1 block font-display text-4xl leading-none text-[var(--celebration)]">{total} <span className="text-base">Kesef</span></strong></div><ReceiptText size={24} className="txt-green" /></div>
          <div className="mt-5 flex items-center justify-between border-t border-[var(--accent-border)] pt-3 text-xs"><span className="txt-tertiary">{units} {units === 1 ? 'item selecionado' : 'itens selecionados'}</span><span className="inline-flex items-center gap-1.5 txt-muted"><ShieldCheck size={14} /> Confirmação protegida</span></div>
        </div>
      </div>

      <div className="p-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] txt-muted">Produtos disponíveis</p>
        <div className="space-y-2.5">
          {products.map(item => {
            const id = item.anuncio_id!;
            const quantity = cart[id] ?? 0;
            return <article key={item.lote_id} className={`flex items-center gap-3 rounded-2xl border p-2.5 transition-colors ${quantity > 0 ? 'border-[var(--accent-border)] bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface-elevated)]'}`}>
              {item.imagem_url ? <img src={item.imagem_url} alt="" className="size-14 shrink-0 rounded-xl object-cover" /> : <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-[var(--surface)]"><Store size={18} className="txt-muted" /></span>}
              <div className="min-w-0 flex-1"><h4 className="truncate text-sm font-semibold txt-primary">{item.produto_nome}</h4><p className="mt-0.5 text-xs"><strong className="text-[var(--celebration)]">{item.valor_kesef} K</strong><span className="txt-muted"> · {item.quantidade_disponivel} disponíveis</span></p></div>
              <div className="flex shrink-0 items-center gap-1"><button type="button" onClick={() => onChange(id, Math.max(0, quantity - 1))} disabled={quantity === 0} className="button-quiet grid size-9 place-items-center rounded-xl disabled:opacity-35" aria-label={`Remover ${item.produto_nome}`}><Minus size={16} /></button><strong className="min-w-6 text-center text-sm tabular-nums txt-primary">{quantity}</strong><button type="button" onClick={() => onChange(id, Math.min(item.quantidade_disponivel, quantity + 1))} className="button-quiet grid size-9 place-items-center rounded-xl" aria-label={`Adicionar ${item.produto_nome}`}><Plus size={16} /></button></div>
            </article>;
          })}
          {products.length === 0 && <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center text-sm txt-muted">Nenhum produto publicado e disponível neste evento.</div>}
        </div>

        {selected.length > 0 && <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] txt-muted">Resumo</p><div className="mt-2 space-y-2">{selected.map(item => <div key={item.lote_id} className="flex justify-between gap-3 text-xs"><span className="txt-secondary">{cart[item.anuncio_id!]}× {item.produto_nome}</span><strong className="txt-primary">{cart[item.anuncio_id!] * (item.valor_kesef ?? 0)} K</strong></div>)}</div></div>}

        <Button className="mt-4 w-full !min-h-14 text-base" onClick={onCreate} disabled={processing || units === 0}>{processing ? 'Gerando…' : `Gerar resgate${total > 0 ? ` · ${total} K` : ''}`}</Button>
      </div>
    </section>
  );
}
