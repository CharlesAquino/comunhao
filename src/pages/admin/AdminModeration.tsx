import { useEffect, useMemo, useState } from 'react';
import { Check, Edit3, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { deletePedido, getAllPedidos, updatePedido } from '../../services/dataService';
import { useAdmin } from '../../contexts/AdminContext';
import { useToast } from '../../contexts/ToastContext';
import type { PedidoAdmin } from '../../types';
import { getTipoPublicacaoMeta, TIPOS_PUBLICACAO_MURAL } from '../../services/muralSocial';
import Button from '../../components/ui/Button';
import IconButton from '../../components/ui/IconButton';
import { AdminPageHeader, AdminSection, AdminToolbar } from '../../components/admin/AdminPage';

export default function AdminModeration() {
  const [items, setItems] = useState<PedidoAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'todos' | PedidoAdmin['tipo']>('todos');
  const [editing, setEditing] = useState<PedidoAdmin | null>(null);
  const [text, setText] = useState('');
  const [operatingId, setOperatingId] = useState<string | null>(null);
  const { can } = useAdmin();
  const toast = useToast();
  const canManage = can('moderation.manage');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await getAllPedidos());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o mural.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return items.filter(item => {
      if (type !== 'todos' && item.tipo !== type) return false;
      if (!term) return true;
      return item.autor.toLocaleLowerCase('pt-BR').includes(term)
        || item.texto.toLocaleLowerCase('pt-BR').includes(term);
    });
  }, [items, search, type]);

  const beginEdit = (item: PedidoAdmin) => {
    setEditing(item);
    setText(item.texto);
  };

  const saveEdit = async () => {
    if (!editing || operatingId || !text.trim()) return;
    setOperatingId(editing.id);
    try {
      await updatePedido(editing.id, { texto: text.trim() });
      toast.success('Publicação atualizada.');
      setEditing(null);
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Não foi possível atualizar.');
    } finally {
      setOperatingId(null);
    }
  };

  const cycleType = async (item: PedidoAdmin) => {
    if (operatingId) return;
    const currentIndex = TIPOS_PUBLICACAO_MURAL.findIndex(typeItem => typeItem.id === item.tipo);
    const nextType = TIPOS_PUBLICACAO_MURAL[(currentIndex + 1) % TIPOS_PUBLICACAO_MURAL.length].id;
    setOperatingId(item.id);
    try {
      await updatePedido(item.id, { tipo: nextType });
      toast.success('Classificação atualizada.');
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Não foi possível alterar a classificação.');
    } finally {
      setOperatingId(null);
    }
  };

  const removeItem = async (item: PedidoAdmin) => {
    if (operatingId || !window.confirm(`Excluir a publicação de ${item.autor}?`)) return;
    setOperatingId(item.id);
    try {
      await deletePedido(item.id);
      toast.success('Publicação removida.');
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Não foi possível excluir.');
    } finally {
      setOperatingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader eyebrow="Moderação" title="Mural e pedidos" description="Revise, corrija, classifique ou remova publicações." actions={<Button variant="secondary" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Atualizar</Button>} />

      {!canManage && (
        <div className="rounded-xl border border-[var(--celebration-border)] bg-[var(--celebration-soft)] p-4 text-sm text-[var(--celebration)]">
          Seu papel permite consultar as publicações, mas não modificá-las.
        </div>
      )}

      <AdminToolbar>
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 txt-muted" />
          <input value={search} onChange={event => setSearch(event.target.value)} className="input-theme min-h-12 w-full rounded-xl pl-11 pr-4 text-sm" placeholder="Buscar autor ou conteúdo" />
        </div>
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 scrollbar-hidden">
          {[{ id: 'todos' as const, shortLabel: 'Todos', emoji: '' }, ...TIPOS_PUBLICACAO_MURAL].map(item => (
            <button key={item.id} type="button" onClick={() => setType(item.id)} className={`min-h-10 shrink-0 rounded-lg px-3 text-xs font-semibold ${type === item.id ? 'bg-[var(--accent-soft)] txt-primary' : 'txt-tertiary'}`}>{item.shortLabel}</button>
          ))}
        </div>
      </AdminToolbar>

      {error && <div className="rounded-xl border border-[var(--care-border)] bg-[var(--care-soft)] p-4 text-sm text-[var(--care)]">{error}</div>}

      {loading ? (
        <div className="card-surface p-8 text-center text-sm txt-muted">Carregando publicações…</div>
      ) : filtered.length === 0 ? (
        <div className="card-surface p-8 text-center text-sm txt-muted">Nenhuma publicação encontrada.</div>
      ) : (
        <AdminSection title="Publicações" description={`${filtered.length} resultado(s) para os filtros atuais.`}>
        <div className="space-y-3">
          {filtered.map(item => (
            <article key={item.id} className="card-surface elevation-1 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold txt-primary">{item.autor}</h3>
                    <span className="rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-0.5 text-[10px] txt-secondary">
                      {getTipoPublicacaoMeta(item.tipo).label}
                    </span>
                  </div>
                  <time className="mt-1 block text-[11px] txt-muted" dateTime={item.criado_em}>{new Date(item.criado_em).toLocaleString('pt-BR')}</time>
                </div>
                <span className="rounded-full border border-[var(--border)] px-2 py-1 text-[10px] txt-muted">{item.contagem_intercessores} intercessor(es)</span>
              </div>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 txt-secondary">{item.texto}</p>

              {canManage && (
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--border)] pt-3">
                  <Button variant="secondary" onClick={() => beginEdit(item)} disabled={Boolean(operatingId)} className="!px-2 text-xs"><Edit3 size={15} /> Editar</Button>
                  <Button variant="secondary" onClick={() => cycleType(item)} disabled={Boolean(operatingId)} className="!px-2 text-xs"><Check size={15} /> Próximo tipo</Button>
                  <Button variant="danger" onClick={() => removeItem(item)} disabled={Boolean(operatingId)} className="!px-2 text-xs"><Trash2 size={15} /> Excluir</Button>
                </div>
              )}
            </article>
          ))}
        </div>
        </AdminSection>
      )}

      {editing && (
        <div className="fixed inset-0 z-[100] flex items-end bg-black/65 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6" onClick={() => setEditing(null)}>
          <section className="w-full max-w-xl rounded-t-3xl border border-[var(--border)] bg-[var(--surface)] p-5 pb-[calc(1.25rem+var(--safe-area-bottom))] sm:rounded-3xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] txt-green">Editar publicação</p><h3 className="mt-1 font-display text-xl txt-primary">{editing.autor}</h3></div><IconButton label="Fechar edição" onClick={() => setEditing(null)}><X size={18} /></IconButton></div>
            <textarea value={text} onChange={event => setText(event.target.value)} className="input-theme mt-5 min-h-40 w-full resize-y rounded-xl p-4 text-sm leading-6" />
            <Button onClick={saveEdit} disabled={Boolean(operatingId) || !text.trim()} className="mt-4 w-full"><Check size={17} /> Salvar alteração</Button>
          </section>
        </div>
      )}
    </div>
  );
}
