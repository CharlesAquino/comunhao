import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImagePlus, Package, Plus, Trash2, X } from 'lucide-react';
import type { LojaItem } from '../../types';
import { validateStoreProductImage } from '../../services/storeImageService';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';

export interface AdminProductDraft {
  nome: string;
  descricao: string;
  precoKesef: number;
  estoque: number;
  categoria: string;
  imagemAtualClaro: string;
  imagemAtualEscuro: string;
  imagemFileClaro: File | null;
  imagemFileEscuro: File | null;
  variantes: Array<{ id?: string; sku: string; nome: string; atributos: Record<string, string>; estoque: number; estoque_alerta: number }>;
}

interface Props {
  item: LojaItem | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (draft: AdminProductDraft) => Promise<void>;
}

export default function AdminProductEditor({ item, saving, onClose, onSubmit }: Props) {
  const titleId = useId();
  const inputClaroId = useId();
  const inputEscuroId = useId();
  const [nome, setNome] = useState(item?.nome ?? '');
  const [descricao, setDescricao] = useState(item?.descricao ?? '');
  const [preco, setPreco] = useState(item ? String(item.preco_kesef) : '');
  const [estoque, setEstoque] = useState(item ? String(item.estoque) : '');
  const [categoria, setCategoria] = useState(item?.categoria ?? '');
  const [imagemFileClaro, setImagemFileClaro] = useState<File | null>(null);
  const [imagemFileEscuro, setImagemFileEscuro] = useState<File | null>(null);
  const [previewClaro, setPreviewClaro] = useState(item?.imagem_url_claro ?? item?.imagem_url ?? '');
  const [previewEscuro, setPreviewEscuro] = useState(item?.imagem_url_escuro ?? item?.imagem_url ?? '');
  const [erro, setErro] = useState('');
  const [variantes, setVariantes] = useState(() => (item?.variantes || []).map(variant => ({
    id: variant.id,
    sku: variant.sku,
    nome: variant.nome,
    cor: String(variant.atributos.cor || ''),
    tamanho: String(variant.atributos.tamanho || ''),
    estoque: String(variant.estoque),
    estoqueAlerta: String(variant.estoque_alerta),
  })));

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, saving]);

  useEffect(() => () => {
    if (previewClaro.startsWith('blob:')) URL.revokeObjectURL(previewClaro);
  }, [previewClaro]);
  useEffect(() => () => {
    if (previewEscuro.startsWith('blob:')) URL.revokeObjectURL(previewEscuro);
  }, [previewEscuro]);

  const selecionarImagem = (variant: 'claro' | 'escuro', file?: File) => {
    if (!file) return;
    try {
      validateStoreProductImage(file);
      setErro('');
      const objectUrl = URL.createObjectURL(file);
      if (variant === 'claro') {
        setImagemFileClaro(file);
        setPreviewClaro(objectUrl);
      } else {
        setImagemFileEscuro(file);
        setPreviewEscuro(objectUrl);
      }
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Imagem inválida.');
    }
  };

  const publicar = async () => {
    const precoNumero = Number(preco);
    const estoqueNumero = Number(estoque);
    if (nome.trim().length < 2) return setErro('Informe o nome do produto.');
    if (descricao.trim().length < 8) return setErro('Escreva uma descrição com pelo menos 8 caracteres.');
    if (!Number.isInteger(precoNumero) || precoNumero <= 0) return setErro('Informe um preço inteiro maior que zero.');
    if (!Number.isInteger(estoqueNumero) || estoqueNumero < 0) return setErro('Informe um estoque válido.');
    if (!categoria.trim()) return setErro('Informe a categoria do produto.');
    if (!previewClaro || !previewEscuro) return setErro('Adicione as imagens para os temas claro e escuro.');
    if (variantes.some(variant => !variant.sku.trim() || !variant.nome.trim() || !Number.isInteger(Number(variant.estoque)) || Number(variant.estoque) < 0)) {
      return setErro('Preencha SKU, nome e estoque válido em todas as variações.');
    }
    setErro('');
    try {
      await onSubmit({
        nome: nome.trim(), descricao: descricao.trim(), precoKesef: precoNumero,
        estoque: estoqueNumero,
        categoria: categoria.trim(),
        imagemAtualClaro: item?.imagem_url_claro ?? item?.imagem_url ?? '',
        imagemAtualEscuro: item?.imagem_url_escuro ?? item?.imagem_url ?? '',
        imagemFileClaro,
        imagemFileEscuro,
        variantes: variantes.map(variant => ({
          id: variant.id,
          sku: variant.sku,
          nome: variant.nome,
          atributos: { cor: variant.cor, tamanho: variant.tamanho },
          estoque: Number(variant.estoque),
          estoque_alerta: Math.max(0, Number(variant.estoqueAlerta) || 0),
        })),
      });
    } catch {
      // O serviço exibe a falha no toast e mantém o editor aberto para correção.
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[180] flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={() => !saving && onClose()}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="glass-strong flex max-h-[calc(var(--app-viewport-height)-var(--safe-area-top)-0.75rem)] w-full max-w-xl flex-col overflow-hidden rounded-t-[1.75rem] border border-[var(--border)] shadow-2xl sm:max-h-[min(47rem,calc(var(--app-viewport-height)-3rem))] sm:rounded-[1.75rem]"
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--celebration)]">Administração · Tesouro</p>
            <h2 id={titleId} className="mt-1 font-display text-xl font-semibold txt-primary">{item ? 'Editar produto' : 'Novo produto'}</h2>
            <p className="mt-0.5 text-xs txt-tertiary">Imagem, informações, preço e disponibilidade.</p>
          </div>
          <IconButton onClick={onClose} label="Fechar editor" disabled={saving}><X size={18} /></IconButton>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <fieldset>
            <legend className="text-[11px] font-bold uppercase tracking-[0.12em] txt-secondary">Imagens por tema</legend>
            <p className="mb-2 mt-1 text-[10px] txt-muted">JPEG, PNG ou WebP · até 8 MB cada</p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { variant: 'claro' as const, id: inputClaroId, preview: previewClaro, label: 'Tema claro' },
                { variant: 'escuro' as const, id: inputEscuroId, preview: previewEscuro, label: 'Tema escuro' },
              ]).map(option => (
                <div key={option.variant}>
                  <p className="mb-1.5 text-xs font-semibold txt-tertiary">{option.label}</p>
                  <input id={option.id} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={event => selecionarImagem(option.variant, event.target.files?.[0])} />
                  <label htmlFor={option.id} className="group block cursor-pointer overflow-hidden rounded-2xl border border-dashed border-[var(--accent-border)] bg-[var(--accent-soft)] transition hover:border-[var(--accent-primary)]">
                    {option.preview ? (
                      <div className="relative aspect-square overflow-hidden">
                        <img src={option.preview} alt={`Prévia no ${option.label.toLowerCase()}`} className="size-full object-cover" />
                        <span className="absolute bottom-2 right-2 grid size-9 place-items-center rounded-xl border border-white/15 bg-black/65 text-white backdrop-blur-md" aria-hidden="true"><ImagePlus size={15} /></span>
                      </div>
                    ) : (
                      <div className="flex aspect-square flex-col items-center justify-center gap-2 px-3 text-center">
                        <span className="grid size-10 place-items-center rounded-xl bg-[var(--surface)] text-[var(--accent-primary)]"><ImagePlus size={19} /></span>
                        <strong className="text-xs txt-primary">Adicionar imagem</strong>
                      </div>
                    )}
                  </label>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] txt-muted">Cada imagem aparece somente em seu tema. A troca é automática.</p>
          </fieldset>

          <div className="space-y-4">
            <label className="block"><span className="text-[11px] font-bold uppercase tracking-[0.12em] txt-secondary">Nome</span><input className="input-theme mt-1.5 w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--focus)]" value={nome} onChange={e => setNome(e.target.value)} maxLength={80} placeholder="Ex.: Bíblia de estudo" /></label>
            <label className="block"><span className="text-[11px] font-bold uppercase tracking-[0.12em] txt-secondary">Descrição</span><textarea className="input-theme mt-1.5 min-h-24 w-full resize-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--focus)]" value={descricao} onChange={e => setDescricao(e.target.value)} maxLength={320} placeholder="Apresente o produto de forma clara." /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-[11px] font-bold uppercase tracking-[0.12em] txt-secondary">Preço em Kesef</span><input type="number" min="1" step="1" inputMode="numeric" className="input-theme mt-1.5 w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--focus)]" value={preco} onChange={e => setPreco(e.target.value)} placeholder="30" /></label>
              <label className="block"><span className="text-[11px] font-bold uppercase tracking-[0.12em] txt-secondary">Estoque</span><input type="number" min="0" step="1" inputMode="numeric" className="input-theme mt-1.5 w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--focus)]" value={estoque} onChange={e => setEstoque(e.target.value)} placeholder="10" /></label>
            </div>
            <label className="block"><span className="text-[11px] font-bold uppercase tracking-[0.12em] txt-secondary">Categoria</span><input className="input-theme mt-1.5 w-full rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--focus)]" value={categoria} onChange={e => setCategoria(e.target.value)} maxLength={40} placeholder="Ex.: livros, vestuário, utilidades" /></label>
          </div>

          <fieldset className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <legend className="text-[11px] font-bold uppercase tracking-[0.12em] txt-secondary">Variações e estoque</legend>
                <p className="mt-1 text-[10px] txt-muted">Use para cor e tamanho. Sem variações, vale o estoque geral.</p>
              </div>
              <Button type="button" variant="secondary" className="!min-h-9 !px-3 text-xs" onClick={() => setVariantes(current => [...current, { id: '', sku: '', nome: '', cor: '', tamanho: '', estoque: '0', estoqueAlerta: '2' }])}>
                <Plus size={14} /> Adicionar
              </Button>
            </div>
            {variantes.map((variant, index) => (
              <div key={variant.id || index} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['SKU', 'sku'], ['Nome', 'nome'], ['Cor', 'cor'], ['Tamanho', 'tamanho'],
                    ['Estoque', 'estoque'], ['Alerta baixo', 'estoqueAlerta'],
                  ] as const).map(([label, key]) => (
                    <label key={key} className="text-[10px] font-semibold uppercase tracking-wide txt-muted">
                      {label}
                      <input
                        type={key === 'estoque' || key === 'estoqueAlerta' ? 'number' : 'text'}
                        min={key === 'estoque' || key === 'estoqueAlerta' ? 0 : undefined}
                        value={variant[key]}
                        onChange={event => setVariantes(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: event.target.value } : row))}
                        className="input-theme mt-1 w-full rounded-lg px-2.5 py-2 text-xs normal-case tracking-normal outline-none"
                      />
                    </label>
                  ))}
                </div>
                <button type="button" onClick={() => setVariantes(current => current.filter((_, rowIndex) => rowIndex !== index))} className="mt-2 inline-flex min-h-9 items-center gap-1 text-xs text-[var(--danger)]">
                  <Trash2 size={13} /> Remover variação
                </button>
              </div>
            ))}
          </fieldset>
          {erro && <p role="alert" className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-[var(--danger)]">{erro}</p>}
        </div>

        <footer className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] px-5 pb-[max(1rem,var(--safe-area-bottom))] pt-4 sm:px-6 sm:pb-4">
          <div className="flex gap-3">
            <Button onClick={onClose} variant="ghost" className="shrink-0" disabled={saving}>Cancelar</Button>
            <Button onClick={publicar} className="min-w-0 flex-1" disabled={saving}>
              {saving ? <><Package className="animate-pulse" size={17} /> Publicando...</> : item ? 'Salvar alterações' : 'Publicar na loja'}
            </Button>
          </div>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
