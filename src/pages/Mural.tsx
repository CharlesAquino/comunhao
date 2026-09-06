import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Camera, Heart, MessageCircle, Sparkles, X } from 'lucide-react';
import PedidoCard from '../components/PedidoCard';
import {
  getMuralData,
  intercederPorPedido,
  criarPublicacaoMural,
  updatePedido,
  deletePedido,
  subscribeToDataChanges,
} from '../services/dataService';
import { creditarKesef, creditarXp } from '../services/kesefService';
import { KESEF_VALORES } from '../services/kesefConstants';
import { XP_ACOES } from '../services/patente';
import type { PedidoMural, TipoPublicacaoMural } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useAdmin } from '../contexts/AdminContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { EmptyState, LoadingState } from '../components/ui/FeedbackState';
import { MuralComposeIcon } from '../components/icons/SanctuaryIcons';
import InstitutionalAction from '../components/ui/InstitutionalAction';
import {
  MURAL_MAX_IMAGE_BYTES,
  TIPOS_PUBLICACAO_MURAL,
  validateMuralImageFile,
} from '../services/muralSocial';
import { useSpatialSurface } from '../hooks/useSpatialSurface';
import { readMuralCache, writeMuralCache } from '../services/muralCache';

export default function Mural() {
  const muralSpatialRef = useSpatialSurface<HTMLDivElement>({ maxTilt: 0.55, pointerRange: 0.38 });
  const [initialCache] = useState(() => readMuralCache());
  const [pedidos, setPedidos] = useState<PedidoMural[]>(() => initialCache ?? []);
  const [loading, setLoading] = useState(() => initialCache === null);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [novoTexto, setNovoTexto] = useState('');
  const [novoTipo, setNovoTipo] = useState<TipoPublicacaoMural>('em_clamor');
  const [novaFoto, setNovaFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [intercedingIds, setIntercedingIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const toast = useToast();
  const { can } = useAdmin();
  const canModerate = can('moderation.manage');
  const canPublish = Boolean(novoTexto.trim()) && !creating;
  const typeIcons = { em_clamor: Heart, testemunho: Sparkles, reflexao: BookOpen, gratidao: Heart } as const;

  const pedidosFiltrados = pedidos.filter(p => {
    if (filtroTipo === 'todos') return true;
    return p.tipo === filtroTipo;
  });

  const loadMural = useCallback(async () => {
    try {
      const data = await getMuralData();
      setPedidos(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar mural');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadMural();
    const unsubscribe = subscribeToDataChanges(() => {
      void loadMural();
    });
    return () => unsubscribe();
  }, [loadMural]);

  useEffect(() => {
    if (!loading) writeMuralCache(pedidos);
  }, [loading, pedidos]);

  useEffect(() => {
    return () => {
      if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    };
  }, [fotoPreview]);

  const closeComposer = useCallback(() => {
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setFotoPreview(null);
    setNovaFoto(null);
    setNovoTexto('');
    setNovoTipo('em_clamor');
    setIsModalOpen(false);
  }, [fotoPreview]);

  useEffect(() => {
    if (!isModalOpen) return;
    const closeOnBack = (event: Event) => {
      event.preventDefault();
      closeComposer();
    };
    window.addEventListener('comunhao:back-request', closeOnBack);
    return () => window.removeEventListener('comunhao:back-request', closeOnBack);
  }, [isModalOpen, closeComposer]);

  const handleInterceder = async (pedidoId: string): Promise<void> => {
    if (intercedingIds.has(pedidoId)) return;

    const current = pedidos.find(item => item.id === pedidoId);
    if (!current) return;

    const optimisticState = !current.intercedendo;
    setPedidos(previous => previous.map(item => item.id === pedidoId ? {
      ...item,
      intercedendo: optimisticState,
      contagem: Math.max(0, item.contagem + (optimisticState ? 1 : -1)),
    } : item));
    setIntercedingIds(previous => new Set(previous).add(pedidoId));

    if (optimisticState && 'vibrate' in navigator) navigator.vibrate?.(24);

    try {
      const isNowInterceding = await intercederPorPedido(pedidoId);
      if (isNowInterceding) {
        await Promise.all([
          creditarKesef('oracao', KESEF_VALORES.INTERCEDER, pedidoId),
          creditarXp(XP_ACOES.INTERCEDER, pedidoId),
        ]);
      }

      if (isNowInterceding !== optimisticState) await loadMural();
    } catch (error) {
      setPedidos(previous => previous.map(item => item.id === pedidoId ? current : item));
      toast.error(error instanceof Error ? error.message : 'Erro ao interceder');
    } finally {
      setIntercedingIds(previous => {
        const next = new Set(previous);
        next.delete(pedidoId);
        return next;
      });
    }
  };

  const handlePhoto = (file: File | null) => {
    if (!file) return;
    try {
      validateMuralImageFile(file);
      if (fotoPreview) URL.revokeObjectURL(fotoPreview);
      setNovaFoto(file);
      setFotoPreview(URL.createObjectURL(file));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Foto inválida');
    }
  };

  const removePhoto = () => {
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setNovaFoto(null);
    setFotoPreview(null);
  };

  const handleCriarPublicacao = async (): Promise<void> => {
    if (!novoTexto.trim() || creating) return;
    setCreating(true);
    try {
      await criarPublicacaoMural({
        texto: novoTexto,
        tipo: novoTipo,
        foto: novaFoto,
      });
      await loadMural();
      closeComposer();
      toast.success('Publicação compartilhada com a comunidade');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao publicar');
    } finally {
      setCreating(false);
    }
  };

  const handleEditarPedido = async (pedidoId: string, novoT: string) => {
    try {
      await updatePedido(pedidoId, { texto: novoT });
      setPedidos(previous => previous.map(item => item.id === pedidoId ? { ...item, texto: novoT } : item));
      toast.success('Publicação atualizada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao editar');
    }
  };

  const handleExcluirPedido = async (pedidoId: string) => {
    try {
      await deletePedido(pedidoId);
      setPedidos(previous => previous.filter(item => item.id !== pedidoId));
      toast.success('Publicação removida');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir');
    }
  };

  const handleCommentCount = (pedidoId: string, count: number) => {
    setPedidos(previous => {
      const current = previous.find(item => item.id === pedidoId);
      if (!current || current.comentarios_contagem === count) return previous;
      return previous.map(item => item.id === pedidoId ? { ...item, comentarios_contagem: count } : item);
    });
  };

  if (loading) {
    return <LoadingState label="Carregando o mural..." />;
  }

  return (
    <div ref={muralSpatialRef} className="spatial-field mural-page mural-page--hd relative z-10 pb-6">
      <header className="spatial-section spatial-section--quiet mural-page-header border-b border-[var(--border)] pb-3 pt-3 space-y-3">
        <div className="mural-editorial-hero" aria-hidden="true" />
        <h1 className="sr-only">Mural</h1>
        <InstitutionalAction
          onClick={() => setIsModalOpen(true)}
          icon={<MuralComposeIcon size={18} />}
        >
          Criar publicação
        </InstitutionalAction>

        {/* Chips de Filtro de Modo Espiritual */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hidden" role="tablist" aria-label="Filtrar publicações por categoria">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'em_clamor', label: 'Clamor', Icon: Heart },
            { id: 'testemunho', label: 'Testemunhos', Icon: Sparkles },
            { id: 'gratidao', label: 'Gratidão', Icon: Heart },
            { id: 'reflexao', label: 'Reflexões', Icon: BookOpen },
          ].map(tabItem => {
            const isSelected = filtroTipo === tabItem.id;
            const TabIcon = tabItem.Icon;
            return (
              <button
                key={tabItem.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setFiltroTipo(tabItem.id)}
                className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-premium ${
                  isSelected
                    ? 'border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-primary)] shadow-sm'
                    : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {TabIcon && <TabIcon size={12} className={isSelected ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'} />}
                <span>{tabItem.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="mural-feed-list space-y-4 pt-4">
        {pedidosFiltrados.length === 0 ? (
          <EmptyState Icon={MessageCircle} title="Nenhuma publicação encontrada" description="Não há postagens nesta categoria no momento." />
        ) : (
          pedidosFiltrados.map(pedido => (
            <PedidoCard
              key={pedido.id}
              id={pedido.id}
              autorId={pedido.autor_id}
              autor={pedido.autor}
              autorUsername={pedido.autor_username}
              autorFotoUrl={pedido.autor_foto_url}
              autorXp={pedido.autor_xp}
              autorBrasaoInstitucional={pedido.autor_brasao_institucional}
              texto={pedido.texto}
              criadoEm={pedido.criado_em}
              contagemIntercessores={pedido.contagem}
              comentariosContagem={pedido.comentarios_contagem}
              intercedendo={pedido.intercedendo}
              onInterceder={() => void handleInterceder(pedido.id)}
              onComentariosAlterados={handleCommentCount}
              tipo={pedido.tipo}
              status={pedido.status}
              permiteComentarios={pedido.permite_comentarios}
              media={pedido.media}
              loading={intercedingIds.has(pedido.id)}
              isAdmin={canModerate}
              onEditar={handleEditarPedido}
              onExcluir={handleExcluirPedido}
            />
          ))
        )}
      </div>

      {isModalOpen && (
        <div
          className="mural-composer-overlay fixed inset-0 z-[180] flex items-end bg-black/60 backdrop-blur-sm sm:items-center sm:justify-center"
          onClick={closeComposer}
          role="presentation"
        >
          <Card
            className="mural-composer-sheet flex w-full flex-col overflow-hidden rounded-b-none rounded-t-[1.75rem] !p-0 sm:rounded-[1.75rem]"
            onClick={event => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="nova-publicacao-titulo"
          >
            <header className="mural-composer-header shrink-0 border-b border-[var(--border)] bg-[color:var(--surface)/0.96] pb-3 pt-4 backdrop-blur-xl">
              <div className="grid grid-cols-[5rem_minmax(0,1fr)_5rem] items-center gap-1">
                <button
                  type="button"
                  onClick={closeComposer}
                  className="grid size-10 place-items-center justify-self-start rounded-full border border-[var(--border)] txt-secondary"
                  aria-label="Fechar nova publicação"
                >
                  <X size={18} />
                </button>

                <div className="min-w-0 text-center">
                  <h2 id="nova-publicacao-titulo" className="truncate font-display text-lg font-semibold text-[var(--text-primary)]">
                    Nova publicação
                  </h2>
                  <p className="truncate text-[11px] text-[var(--text-secondary)]">Compartilhe com cuidado.</p>
                </div>

                <span aria-hidden="true" />
              </div>
            </header>

            <div className="mural-composer-body min-h-0 flex-1 overflow-y-auto overscroll-contain py-4 pb-8">
              <section aria-labelledby="foto-publicacao-label">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p id="foto-publicacao-label" className="text-xs font-semibold uppercase tracking-[0.12em] txt-tertiary">Foto</p>
                  <span className="text-[10px] txt-muted">Opcional · 1 imagem</span>
                </div>

                {fotoPreview ? (
                  <div>
                    <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2">
                      <img src={fotoPreview} alt="Miniatura da foto selecionada" className="size-11 shrink-0 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold txt-primary">Foto adicionada</p>
                        <p className="text-[10px] txt-muted">Será exibida em proporção 4:5 no Mural.</p>
                      </div>
                      <label className="inline-flex min-h-10 shrink-0 cursor-pointer items-center rounded-full border border-[var(--border)] px-3 text-xs font-semibold txt-primary">
                        Trocar
                        <input type="file" accept="image/*" className="sr-only" onChange={event => handlePhoto(event.target.files?.[0] ?? null)} />
                      </label>
                      <button type="button" onClick={removePhoto} className="grid size-10 shrink-0 place-items-center rounded-full text-rose-300" aria-label="Remover foto">
                        <X size={17} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-3 py-2 transition hover:border-[var(--accent-primary)]">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] txt-green"><Camera size={19} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold txt-primary">Adicionar foto</span>
                      <span className="block text-[10px] txt-tertiary">Opcional · até {Math.round(MURAL_MAX_IMAGE_BYTES / 1_000_000 * 10) / 10} MB após compressão</span>
                    </span>
                    <input type="file" accept="image/*" className="sr-only" onChange={event => handlePhoto(event.target.files?.[0] ?? null)} />
                  </label>
                )}
              </section>

              <fieldset className="mt-6">
                <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] txt-tertiary">Tipo de publicação</legend>
                <div className="mural-type-grid grid grid-cols-2 gap-2">
                  {TIPOS_PUBLICACAO_MURAL.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setNovoTipo(item.id)}
                      className={`sanctuary-choice mural-type-card w-full border text-left transition ${novoTipo === item.id ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface)]'}`}
                      aria-pressed={novoTipo === item.id}
                    >
                      {(() => { const Icon = typeIcons[item.id]; return <Icon size={16} aria-hidden="true" />; })()}
                      <span className="text-xs font-semibold txt-primary">{item.shortLabel}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-5 txt-tertiary">{TIPOS_PUBLICACAO_MURAL.find(item => item.id === novoTipo)?.helper}</p>
              </fieldset>

              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="nova-publicacao-texto" className="text-xs font-semibold uppercase tracking-[0.12em] txt-tertiary">Mensagem</label>
                  <span className="text-[10px] txt-muted">{novoTexto.length}/1000</span>
                </div>
                <textarea
                  id="nova-publicacao-texto"
                  className="input-theme h-36 w-full resize-none rounded-2xl p-4 text-sm leading-6 outline-none"
                  placeholder="Compartilhe com a comunidade..."
                  value={novoTexto}
                  maxLength={1000}
                  onChange={event => setNovoTexto(event.target.value)}
                />
              </div>
            </div>

            <footer className="mural-composer-footer shrink-0 border-t border-[var(--border)] bg-[color:var(--surface)/0.98] pt-3 backdrop-blur-xl">
              <Button
                onClick={() => void handleCriarPublicacao()}
                disabled={!canPublish}
                className="min-h-12 w-full rounded-2xl"
              >
                {creating ? 'Publicando...' : 'Publicar conteúdo'}
              </Button>
              <p className="mt-2 text-center text-[10px] txt-muted">
                O botão permanece visível enquanto você revisa a publicação.
              </p>
            </footer>
          </Card>
        </div>
      )}
    </div>
  );
}
