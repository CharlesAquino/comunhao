import { useState, useEffect, useCallback, useMemo } from 'react';
import { ShoppingBag, Package, AlertCircle, Check, X, Clock, Plus, Edit3, ArrowLeft, Download, PackageCheck, CalendarDays, MapPin, Store, Trash2 } from 'lucide-react';
import { getLojaItens, solicitarResgateIdempotente, getMeusPedidos, adminGetPedidos, adminProcessarPedido, adminAprovarPedido, adminAtualizarLogisticaPedido, adminCriarItem, adminAtualizarItem, adminAtualizarEstadoItem, adminExcluirItem, adminSalvarVariantes, getLojaItensAdmin, subscribeToAdminStoreOrders, type LojaLogisticaInput } from '../services/storeService';
import { getSaldoKesef } from '../services/kesefService';
import { createRuntimeId } from '../utils/createRuntimeId';
import type { LojaItem, LojaPedido, LojaVariante } from '../types';
import { useAdmin } from '../contexts/AdminContext';
import { useToast } from '../contexts/ToastContext';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import SealIcon from '../components/ui/SealIcon';
import AdminProductEditor, { type AdminProductDraft } from '../components/store/AdminProductEditor';
import OrderFulfillmentSheet from '../components/store/OrderFulfillmentSheet';
import { getStoreProductPath, removeStoreProductImage, uploadStoreProductImage } from '../services/storeImageService';
import { getStoreProductImage } from '../services/storeThemeImage';
import { useTheme } from '../contexts/ThemeContext';
import AppBrandMark from '../components/ui/AppBrandMark';
import { authorizeCantinaRepresentative, cancelCantinaReservation, listMyCantinaReservations, listPublicCantinaListings, reserveCantinaItem } from '../services/cantinaService';
import type { CantinaPublicListing, CantinaReservation } from '../types/cantina';
import CantinaReservationQr from '../components/cantina/CantinaReservationQr';
import TextInputDialog from '../components/ui/TextInputDialog';
import CantinaRedemptionSheet from '../components/cantina/CantinaRedemptionSheet';
import { AdminPageHeader } from '../components/admin/AdminPage';
import InstitutionalAction from '../components/ui/InstitutionalAction';
import KesefCoin3D from '../components/kesef/KesefCoin3D';
import { readScreenCache, SCREEN_CACHE_KEYS, writeScreenCache } from '../services/screenCache';

const TREASURE_CACHE_AGE = 30 * 60 * 1000;
const CANTEEN_CACHE_AGE = 2 * 60 * 1000;
interface CatalogCache<T> { items: T[]; balance: number }

type Tab = 'loja' | 'cantina' | 'pedidos' | 'admin';

const STATUS_META: Record<string, { label: string; cor: string; icon: typeof Clock }> = {
  pendente: { label: 'Pendente', cor: 'text-yellow-300 bg-yellow-600/20 border-yellow-500/30', icon: Clock },
  aprovado: { label: 'Aprovado', cor: 'txt-green bg-[var(--accent-soft)] border-green-subtle', icon: Check },
  rejeitado: { label: 'Rejeitado', cor: 'text-rose-300 bg-rose-600/20 border-rose-500/30', icon: X },
  entregue: { label: 'Entregue', cor: 'text-sky-300 bg-sky-600/20 border-sky-500/30', icon: Package },
};

const ETAPA_LOGISTICA_LABEL: Record<string, string> = {
  previsao_pendente: 'Previsão de entrega em definição',
  agendado: 'Entrega agendada',
  alinhamento_retirada: 'Alinhamento de retirada',
};

function KesefValue({ value, prominent = false, compact = false }: { value: number; prominent?: boolean; compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-[var(--celebration-border)] bg-[var(--celebration-soft)] font-semibold text-[var(--celebration)] ${prominent ? 'gap-2 px-3 py-2' : compact ? 'gap-1.5 px-2 py-1' : 'gap-2 px-2.5 py-1.5'}`}
      aria-label={`${value} Kesef`}
    >
      <img src="/kesef-coin.png" alt="" className={prominent ? 'size-7 object-contain' : compact ? 'size-4 object-contain' : 'size-5 object-contain'} />
      <strong className={prominent ? 'font-display text-2xl leading-none' : compact ? 'text-xs leading-none' : 'text-sm leading-none'}>{value}</strong>
      {!compact && <span className={prominent ? 'text-xs txt-secondary' : 'text-[10px] txt-secondary'}>Kesef</span>}
    </span>
  );
}

export default function Loja({ adminMode = false }: { adminMode?: boolean }) {
  const [cachedTreasure] = useState(() => adminMode ? null : readScreenCache<CatalogCache<LojaItem>>(SCREEN_CACHE_KEYS.TREASURE, TREASURE_CACHE_AGE));
  const [tab, setTab] = useState<Tab>(() => adminMode ? 'admin' : new URLSearchParams(window.location.search).get('aba') === 'pedidos' ? 'pedidos' : 'loja');
  const [itens, setItens] = useState<LojaItem[]>(() => cachedTreasure?.items ?? []);
  const [cantinaItens, setCantinaItens] = useState<CantinaPublicListing[]>([]);
  const [cantinaReservas, setCantinaReservas] = useState<CantinaReservation[]>([]);
  const [reservaCantina, setReservaCantina] = useState<CantinaPublicListing | null>(null);
  const [resgateProdutoCantina, setResgateProdutoCantina] = useState<CantinaPublicListing | null>(null);
  const [quantidadeCantina, setQuantidadeCantina] = useState(1);
  const [processandoCantina, setProcessandoCantina] = useState(false);
  const [reservaRepresentante, setReservaRepresentante] = useState<CantinaReservation | null>(null);
  const [representanteUsername, setRepresentanteUsername] = useState('');
  const [pedidos, setPedidos] = useState<LojaPedido[]>([]);
  const [loading, setLoading] = useState(() => cachedTreasure === null);
  const [confirmando, setConfirmando] = useState<LojaItem | null>(null);
  const [chaveResgate, setChaveResgate] = useState('');
  const [resgatando, setResgatando] = useState(false);
  const [varianteSelecionada, setVarianteSelecionada] = useState<LojaVariante | null>(null);
  const [saldoKesef, setSaldoKesef] = useState(() => cachedTreasure?.balance ?? 0);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const { can } = useAdmin();
  const canManageStore = can('store.manage');
  const toast = useToast();
  const { theme } = useTheme();

  // Admin state
  const [adminPedidos, setAdminPedidos] = useState<LojaPedido[]>([]);
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<LojaItem | null | undefined>(undefined);
  const [adminLoadingLoja, setAdminLoadingLoja] = useState(false);
  const [itemParaExcluir, setItemParaExcluir] = useState<LojaItem | null>(null);
  const [excluindoItemId, setExcluindoItemId] = useState<string | null>(null);
  const [processandoPedidoId, setProcessandoPedidoId] = useState<string | null>(null);
  const [pedidoRejeicao, setPedidoRejeicao] = useState<LojaPedido | null>(null);
  const [pedidoLogistica, setPedidoLogistica] = useState<{ pedido: LojaPedido; mode: 'approve' | 'update' } | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [filtroPedido, setFiltroPedido] = useState('todos');
  const [buscaPedido, setBuscaPedido] = useState('');

  const load = useCallback(async () => {
    const cachedCatalog = tab === 'loja'
      ? readScreenCache<CatalogCache<LojaItem>>(SCREEN_CACHE_KEYS.TREASURE, TREASURE_CACHE_AGE)
      : tab === 'cantina'
        ? readScreenCache<CatalogCache<CantinaPublicListing>>(SCREEN_CACHE_KEYS.CANTEEN, CANTEEN_CACHE_AGE)
        : null;
    if (tab === 'loja' && cachedCatalog) {
      const cached = cachedCatalog as CatalogCache<LojaItem>;
      setItens(cached.items);
      setSaldoKesef(cached.balance);
    } else if (tab === 'cantina' && cachedCatalog) {
      const cached = cachedCatalog as CatalogCache<CantinaPublicListing>;
      setCantinaItens(cached.items);
      setSaldoKesef(cached.balance);
    }
    setLoading(!cachedCatalog);
    setErro('');
    try {
      if (tab === 'loja') {
        const [data, saldo] = await Promise.all([getLojaItens(), getSaldoKesef()]);
        setItens(data);
        setSaldoKesef(saldo);
        writeScreenCache(SCREEN_CACHE_KEYS.TREASURE, { items: data, balance: saldo });
      } else if (tab === 'cantina') {
        const [data, saldo] = await Promise.all([listPublicCantinaListings(), getSaldoKesef()]);
        setCantinaItens(data);
        setSaldoKesef(saldo);
        writeScreenCache(SCREEN_CACHE_KEYS.CANTEEN, { items: data, balance: saldo });
      } else if (tab === 'pedidos') {
        const [data, reservas] = await Promise.all([getMeusPedidos(), listMyCantinaReservations()]);
        setPedidos(data);
        setCantinaReservas(reservas);
      } else if (tab === 'admin') {
        const [pedidosData, itensData] = await Promise.all([adminGetPedidos(), getLojaItensAdmin()]);
        setAdminPedidos(pedidosData);
        setItens(itensData);
      }
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    if (adminMode && tab !== 'admin') {
      setTab('admin');
      return;
    }
    load();
  }, [adminMode, load, tab]);

  useEffect(() => {
    if (!adminMode || !canManageStore || tab !== 'admin') return;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeToAdminStoreOrders(() => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => { void load(); }, 300);
    });
    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      unsubscribe();
    };
  }, [adminMode, canManageStore, load, tab]);

  const confirmarResgate = (item: LojaItem) => {
    setChaveResgate(createRuntimeId());
    setVarianteSelecionada(item.variantes?.filter(variant => variant.ativo && variant.estoque > 0).length === 1
      ? item.variantes.find(variant => variant.ativo && variant.estoque > 0) || null
      : null);
    setConfirmando(item);
  };

  const executarResgate = async (item: LojaItem) => {
    if (resgatando) return;
    setErro('');
    setSucesso('');
    setResgatando(true);
    try {
      await solicitarResgateIdempotente(item.id, 1, chaveResgate, varianteSelecionada?.id);
      setSucesso(`Solicitação de “${item.nome}” enviada. O item será garantido após a aprovação.`);
      setConfirmando(null);
      await load();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao resgatar');
    } finally {
      setResgatando(false);
    }
  };

  const executarReservaCantina = async () => {
    if (!reservaCantina || processandoCantina) return;
    setProcessandoCantina(true);
    setErro('');
    try {
      await reserveCantinaItem(reservaCantina.anuncio_id, quantidadeCantina, createRuntimeId());
      setSucesso(`Reserva de “${reservaCantina.produto_nome}” confirmada. O Kesef ficou aprovisionado.`);
      setReservaCantina(null);
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível reservar.';
      setErro(message.includes('SALDO_INSUFICIENTE')
        ? 'Saldo Kesef insuficiente.'
        : message.includes('COTA_DE_RESERVA_ESGOTADA')
          ? 'A cota de reserva antecipada esgotou.'
          : message.includes('LIMITE_POR_MEMBRO')
            ? 'Você atingiu o limite deste item.'
            : message.includes('RESERVAS_FECHADAS')
              ? 'A reserva antecipada foi encerrada. Durante o evento, faça o resgate presencial pela Carteira.'
              : message.includes('ESTOQUE_INSUFICIENTE') || message.includes('ANUNCIO_INDISPONIVEL')
                ? 'Este item não está mais disponível para reserva.'
                : message);
    } finally {
      setProcessandoCantina(false);
    }
  };

  const cancelarReservaCantina = async (reserva: CantinaReservation) => {
    if (processandoCantina) return;
    setProcessandoCantina(true);
    try {
      await cancelCantinaReservation(reserva.id);
      setSucesso('Reserva cancelada. O estoque e o Kesef foram liberados.');
      await load();
    } catch (error) {
      setErro(error instanceof Error && error.message.includes('PRAZO_CANCELAMENTO') ? 'O prazo para cancelar esta reserva terminou.' : 'Não foi possível cancelar a reserva.');
    } finally {
      setProcessandoCantina(false);
    }
  };


  const autorizarRepresentante = (reserva: CantinaReservation) => {
    setRepresentanteUsername('');
    setReservaRepresentante(reserva);
  };

  const confirmarRepresentante = async () => {
    if (!reservaRepresentante || !representanteUsername.trim() || processandoCantina) return;
    const username = representanteUsername.trim().replace(/^@/, '');
    setProcessandoCantina(true);
    try {
      await authorizeCantinaRepresentative(reservaRepresentante.id, username);
      setSucesso(`@${username} foi autorizado a retirar esta reserva.`);
      setReservaRepresentante(null);
      setRepresentanteUsername('');
    }
    catch { setErro('Usuário não encontrado ou reserva indisponível para autorização.'); }
    finally { setProcessandoCantina(false); }
  };

  // ─── Admin ──────────────────────────────────────────────────

  const processarPedido = async (pedidoId: string, novoStatus: 'rejeitado' | 'entregue') => {
    if (processandoPedidoId) return;
    setProcessandoPedidoId(pedidoId);
    try {
      await adminProcessarPedido(pedidoId, novoStatus);
      toast.success(novoStatus === 'entregue' ? 'Pedido marcado como entregue.' : 'Pedido rejeitado.');
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao processar pedido');
    } finally {
      setProcessandoPedidoId(null);
    }
  };

  const salvarLogisticaPedido = async (logistica: LojaLogisticaInput) => {
    if (!pedidoLogistica || processandoPedidoId) return;
    const { pedido, mode } = pedidoLogistica;
    setProcessandoPedidoId(pedido.id);
    try {
      if (mode === 'approve') await adminAprovarPedido(pedido.id, logistica);
      else await adminAtualizarLogisticaPedido(pedido.id, logistica);
      toast.success(mode === 'approve' ? 'Resgate processado e membro avisado.' : 'Entrega atualizada e membro avisado.');
      setPedidoLogistica(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar a entrega.');
    } finally {
      setProcessandoPedidoId(null);
    }
  };

  const confirmarRejeicao = async () => {
    if (!pedidoRejeicao || motivoRejeicao.trim().length < 3 || processandoPedidoId) return;
    setProcessandoPedidoId(pedidoRejeicao.id);
    try {
      await adminProcessarPedido(pedidoRejeicao.id, 'rejeitado', motivoRejeicao.trim());
      toast.success('Pedido rejeitado com justificativa');
      setPedidoRejeicao(null);
      setMotivoRejeicao('');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao rejeitar pedido');
    } finally {
      setProcessandoPedidoId(null);
    }
  };

  const abrirCriarItem = () => {
    setProdutoEmEdicao(null);
  };

  const abrirEditarItem = (item: LojaItem) => {
    setProdutoEmEdicao(item);
  };

  const salvarItem = async (draft: AdminProductDraft) => {
    if (adminLoadingLoja) return;
    setAdminLoadingLoja(true);
    let novaImagemClaro: Awaited<ReturnType<typeof uploadStoreProductImage>> | null = null;
    let novaImagemEscuro: Awaited<ReturnType<typeof uploadStoreProductImage>> | null = null;
    try {
      if (draft.imagemFileClaro) novaImagemClaro = await uploadStoreProductImage(draft.imagemFileClaro, 'claro');
      if (draft.imagemFileEscuro) novaImagemEscuro = await uploadStoreProductImage(draft.imagemFileEscuro, 'escuro');
      const imagemClaro = novaImagemClaro?.url ?? draft.imagemAtualClaro;
      const imagemEscuro = novaImagemEscuro?.url ?? draft.imagemAtualEscuro;
      const dados = {
        nome: draft.nome,
        descricao: draft.descricao,
        preco_kesef: draft.precoKesef,
        estoque: draft.estoque,
        categoria: draft.categoria,
        imagem_url_claro: imagemClaro,
        imagem_url_escuro: imagemEscuro,
        imagem_url: imagemEscuro || imagemClaro,
      };
      if (produtoEmEdicao) {
        await adminAtualizarItem(produtoEmEdicao.id, dados);
        await adminSalvarVariantes(produtoEmEdicao.id, draft.variantes);
        const imagensAnteriores = new Set<string>();
        if (novaImagemClaro) {
          const path = getStoreProductPath(produtoEmEdicao.imagem_url_claro || '');
          if (path) imagensAnteriores.add(path);
        }
        if (novaImagemEscuro) {
          const path = getStoreProductPath(produtoEmEdicao.imagem_url_escuro || '');
          if (path) imagensAnteriores.add(path);
        }
        const limpezaAnteriores = await Promise.allSettled([...imagensAnteriores].map(removeStoreProductImage));
        if (limpezaAnteriores.some(result => result.status === 'rejected')) {
          toast.info('Produto atualizado. Uma imagem antiga não pôde ser limpa automaticamente.');
        }
        toast.success('Produto atualizado na loja');
      } else {
        const novoItem = await adminCriarItem(dados);
        await adminSalvarVariantes(novoItem.id, draft.variantes);
        toast.success('Produto publicado na loja');
      }
      setProdutoEmEdicao(undefined);
      await load();
    } catch (error) {
      await Promise.all(
        [novaImagemClaro?.path, novaImagemEscuro?.path]
          .filter((path): path is string => Boolean(path))
          .map(removeStoreProductImage),
      );
      const message = error instanceof Error
        ? error.message
        : typeof error === 'object' && error && 'message' in error
          ? String(error.message)
          : 'Erro ao publicar produto';
      toast.error(message);
      throw error;
    } finally {
      setAdminLoadingLoja(false);
    }
  };

  const pedidosFiltrados = adminPedidos.filter(pedido => {
    const matchesStatus = filtroPedido === 'todos' || pedido.status === filtroPedido;
    const query = buscaPedido.trim().toLocaleLowerCase('pt-BR');
    const matchesSearch = !query || [pedido.usuario?.nome, pedido.usuario?.username, pedido.item?.nome, pedido.variante?.nome, pedido.variante?.sku]
      .some(value => value?.toLocaleLowerCase('pt-BR').includes(query));
    return matchesStatus && matchesSearch;
  });

  const pedidosFiltradosOrdenados = useMemo(() => [...pedidosFiltrados].sort((a, b) => {
    const prioridade = { pendente: 0, aprovado: 1, rejeitado: 2, entregue: 3 } as const;
    const porStatus = prioridade[a.status] - prioridade[b.status];
    if (porStatus !== 0) return porStatus;
    return new Date(a.solicitado_em).getTime() - new Date(b.solicitado_em).getTime();
  }), [pedidosFiltrados]);

  const metricasOperacao = useMemo(() => {
    const pendentes = adminPedidos.filter(pedido => pedido.status === 'pendente');
    const aguardandoRetirada = adminPedidos.filter(pedido => pedido.status === 'aprovado');
    const decididos = adminPedidos.filter(pedido => pedido.processado_em && ['aprovado', 'rejeitado'].includes(pedido.status));
    const minutosMediosDecisao = decididos.length === 0 ? null : Math.round(decididos.reduce((total, pedido) => (
      total + Math.max(0, new Date(pedido.processado_em!).getTime() - new Date(pedido.solicitado_em).getTime()) / 60_000
    ), 0) / decididos.length);
    const maisAntigo = pendentes.reduce<LojaPedido | null>((atual, pedido) => !atual || new Date(pedido.solicitado_em) < new Date(atual.solicitado_em) ? pedido : atual, null);
    return { pendentes: pendentes.length, aguardandoRetirada: aguardandoRetirada.length, minutosMediosDecisao, maisAntigo };
  }, [adminPedidos]);

  const formatarDuracao = (minutosBase: number) => {
    const minutos = Math.max(0, Math.round(minutosBase));
    if (minutos < 60) return `${minutos} min`;
    const horas = Math.floor(minutos / 60);
    return horas < 48 ? `${horas} h` : `${Math.floor(horas / 24)} d`;
  };

  const formatarTempoAguardando = (date: string) => formatarDuracao((Date.now() - new Date(date).getTime()) / 60_000);

  const exportarPedidos = () => {
    const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Membro', 'Usuário', 'Produto', 'Variação', 'SKU', 'Quantidade', 'Kesef', 'Status', 'Código retirada', 'Solicitado em'],
      ...pedidosFiltrados.map(pedido => [
        pedido.usuario?.nome, pedido.usuario?.username, pedido.item?.nome, pedido.variante?.nome,
        pedido.variante?.sku, pedido.quantidade, pedido.kesef_debitado, pedido.status,
        pedido.codigo_retirada, new Date(pedido.solicitado_em).toLocaleString('pt-BR'),
      ]),
    ];
    const csv = `\uFEFF${rows.map(row => row.map(quote).join(';')).join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `resgates-tesouro-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const alterarEstadoItem = async (item: LojaItem, estado: 'ativo' | 'pausado' | 'arquivado') => {
    try {
      await adminAtualizarEstadoItem(item.id, estado);
      toast.success(estado === 'ativo' ? 'Produto ativado.' : estado === 'pausado' ? 'Produto pausado.' : 'Produto arquivado.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível alterar o produto.');
    }
  };

  const excluirItem = async () => {
    if (!itemParaExcluir || excluindoItemId) return;
    const item = itemParaExcluir;
    setExcluindoItemId(item.id);
    try {
      await adminExcluirItem(item.id);
      const caminhosDasImagens = [...new Set([
        item.imagem_url,
        item.imagem_url_claro,
        item.imagem_url_escuro,
        ...(item.imagens?.map(imagem => imagem.url) ?? []),
      ].map(url => getStoreProductPath(url || '')).filter((path): path is string => Boolean(path)))];
      const limpeza = await Promise.allSettled(caminhosDasImagens.map(removeStoreProductImage));
      setItemParaExcluir(null);
      await load();
      if (limpeza.some(result => result.status === 'rejected')) {
        toast.info('Produto removido. Algumas imagens antigas não puderam ser limpas automaticamente.');
      } else {
        toast.success('Produto e imagens removidos do Tesouro.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível excluir o produto.');
    } finally {
      setExcluindoItemId(null);
    }
  };

  const itemDestaque = itens.find(item => item.categoria === 'destaque') ?? itens[0];
  const outrosItens = itens.filter(item => item.id !== itemDestaque?.id);
  const imagemDoTema = (item: LojaItem) => getStoreProductImage(item, theme);
  const cantinaEventos = cantinaItens.reduce<Array<{ id: string; itens: CantinaPublicListing[] }>>((groups, item) => {
    const group = groups.find(entry => entry.id === item.evento_id);
    if (group) group.itens.push(item);
    else groups.push({ id: item.evento_id, itens: [item] });
    return groups;
  }, []);

  return (
    <div className={`${adminMode ? 'space-y-5' : 'tesouro-page min-h-full px-5 pb-8 pt-7'} relative z-10`}>
      {adminMode ? (
        <AdminPageHeader eyebrow="Operação" title="Loja e estoque" description="Gerencie catálogo, resgates, aprovações e entregas." />
      ) : tab === 'pedidos' ? (
        <div className="flex items-center gap-3 pr-28">
          <button type="button" onClick={() => setTab('loja')} className="button-quiet grid size-11 shrink-0 place-items-center rounded-xl" aria-label="Voltar ao Tesouro">
            <ArrowLeft size={19} />
          </button>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--celebration)]">Tesouro</p>
            <h1 className="font-display text-2xl font-semibold txt-primary">Meus resgates</h1>
          </div>
        </div>
      ) : (
        <div className="tesouro-heading pr-24">
          <div className="flex items-center gap-3">
            <AppBrandMark />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--celebration)]">Reconhecimento</p>
              <h1 className="mt-1 font-display text-[2rem] font-semibold leading-none txt-primary">Tesouro</h1>
            </div>
          </div>
          <p className="mt-3 max-w-[17rem] text-sm leading-relaxed txt-tertiary">Reconhecimentos que edificam e fortalecem nossa caminhada juntos.</p>
        </div>
      )}

      {/* Tabs */}
      {!adminMode && (tab === 'loja' || tab === 'cantina') && (
        <div className="mt-5 space-y-3">
          <div className="grid grid-cols-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1" aria-label="Seções do Tesouro">
            <button type="button" onClick={() => setTab('loja')} aria-pressed={tab === 'loja'} className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition ${tab === 'loja' ? 'bg-[var(--accent-soft)] txt-primary shadow-sm' : 'txt-tertiary'}`}><ShoppingBag size={16} className="mr-2 inline" />Lojinha</button>
            <button type="button" onClick={() => setTab('cantina')} aria-pressed={tab === 'cantina'} className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition ${tab === 'cantina' ? 'bg-[var(--celebration-soft)] txt-primary shadow-sm' : 'txt-tertiary'}`}><Store size={16} className="mr-2 inline" />Cantina</button>
          </div>
          <div className="tesouro-balance relative overflow-hidden flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-center gap-3.5">
              <div className="relative size-14 shrink-0 rounded-2xl border border-[var(--celebration-border)] bg-[var(--celebration-soft)] overflow-hidden shadow-inner">
                <KesefCoin3D className="size-full" label="Moeda Kesef do Tesouro" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--celebration)]">Kesef disponível</p>
                <div className="flex items-baseline gap-1.5">
                  <p className="font-display text-2xl font-bold txt-primary">{saldoKesef}</p>
                  <span className="text-xs text-[var(--text-muted)] font-medium">moedas</span>
                </div>
              </div>
            </div>
            <button type="button" onClick={() => setTab('pedidos')} className="button-quiet rounded-xl px-3.5 py-2 text-xs font-semibold txt-secondary border border-[var(--border)] hover:bg-[var(--surface-elevated)]">
              Meus resgates
            </button>
          </div>
        </div>
      )}

      {adminMode && !canManageStore && (
        <div className="rounded-xl border border-[var(--celebration-border)] bg-[var(--celebration-soft)] p-4 text-sm text-[var(--celebration)]">
          Seu papel permite consultar a loja, mas não alterar pedidos ou estoque.
        </div>
      )}

      {erro && (
        <div className="rounded-xl border border-[var(--care-border)] bg-[var(--care-soft)] p-4 flex items-start gap-3">
          <AlertCircle className="text-[var(--care)] shrink-0 mt-0.5" size={18} />
          <p className="txt-secondary text-sm">{erro}</p>
        </div>
      )}

      {sucesso && (
        <div className="glass-strong border border-green-subtle rounded-xl p-4 flex items-start gap-3">
          <Check className="txt-green shrink-0 mt-0.5" size={18} />
          <p className="txt-secondary text-sm">{sucesso}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse txt-tertiary">Carregando...</div>
        </div>
      ) : tab === 'loja' ? (
        itens.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center card-3d">
            <SealIcon Icon={ShoppingBag} size="lg" className="mx-auto mb-3 txt-muted" />
            <p className="txt-tertiary">Nenhum item disponível na loja.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-7">
            {itemDestaque && (
              <section aria-labelledby="tesouro-destaque-title">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--celebration)]">Destaque para você</p>
                <article className="tesouro-feature overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)]">
                  <div className="tesouro-feature__media relative overflow-hidden bg-[var(--surface-elevated)]">
                    {imagemDoTema(itemDestaque) ? <img key={`${itemDestaque.id}-${theme}`} src={imagemDoTema(itemDestaque)} alt={itemDestaque.nome} className="block h-auto w-full" /> : <div className="grid aspect-[4/3] w-full place-items-center"><SealIcon Icon={ShoppingBag} size="lg" className="txt-muted" /></div>}
                    <span className="absolute bottom-3 left-3 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-[10px] font-semibold text-white backdrop-blur-md">{itemDestaque.categoria === 'destaque' ? 'Estudo' : itemDestaque.categoria}</span>
                  </div>
                  <div className="tesouro-feature__content space-y-4 p-5">
                    <div>
                      <h2 id="tesouro-destaque-title" className="font-display text-2xl font-semibold txt-primary">{itemDestaque.nome}</h2>
                      <p className="mt-1.5 text-sm leading-relaxed txt-tertiary">{itemDestaque.descricao}</p>
                    </div>
                    <div className="flex items-end justify-between border-t border-[var(--border)] pt-4">
                      <div className="flex items-center gap-2 text-xs font-medium text-[var(--success)]"><PackageCheck size={16} /> {itemDestaque.estoque > 0 ? 'Em estoque' : 'Esgotado'}</div>
                      <KesefValue value={itemDestaque.preco_kesef} prominent />
                    </div>
                    <div className="rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] p-3.5 text-sm">
                      <p className="txt-secondary">Você tem <strong className="txt-primary">{saldoKesef} Kesef</strong></p>
                      <p className="mt-0.5 text-xs txt-muted">{saldoKesef >= itemDestaque.preco_kesef ? `Seu saldo após a aprovação será ${saldoKesef - itemDestaque.preco_kesef} Kesef.` : `Faltam ${itemDestaque.preco_kesef - saldoKesef} Kesef para solicitar.`}</p>
                    </div>
                    <InstitutionalAction icon={<ShoppingBag size={18} />} onClick={() => confirmarResgate(itemDestaque)} disabled={itemDestaque.estoque <= 0 || saldoKesef < itemDestaque.preco_kesef}>
                      {itemDestaque.estoque <= 0 ? 'Esgotado' : saldoKesef >= itemDestaque.preco_kesef ? 'Solicitar resgate' : `Faltam ${itemDestaque.preco_kesef - saldoKesef} Kesef`}
                    </InstitutionalAction>
                  </div>
                </article>
              </section>
            )}

            {outrosItens.length > 0 && (
              <section aria-labelledby="outros-tesouros-title">
                <h2 id="outros-tesouros-title" className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--celebration)]">Outros tesouros</h2>
                <div className="tesouro-product-grid grid grid-cols-2 gap-3">
                  {outrosItens.map(item => (
                    <button key={item.id} type="button" onClick={() => confirmarResgate(item)} disabled={item.estoque <= 0} className="tesouro-product overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-left disabled:opacity-55">
                      <div className="aspect-square overflow-hidden bg-[var(--surface-elevated)]">{imagemDoTema(item) ? <img key={`${item.id}-${theme}`} src={imagemDoTema(item)} alt="" className="size-full object-contain" /> : <div className="grid size-full place-items-center"><SealIcon Icon={ShoppingBag} size="md" className="txt-muted" /></div>}</div>
                      <div className="p-3">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--accent-primary)]">{item.categoria}</p>
                        <h3 className="mt-1 font-display text-base font-semibold leading-tight txt-primary">{item.nome}</h3>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed txt-muted">{item.descricao}</p>
                        <div className="mt-3"><KesefValue value={item.preco_kesef} compact /></div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )
      ) : tab === 'cantina' ? (
        cantinaEventos.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
            <SealIcon Icon={Store} size="lg" className="mx-auto mb-3 txt-muted" />
            <h2 className="font-display text-xl font-semibold txt-primary">Nenhuma Cantina anunciada</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed txt-tertiary">Os itens aparecerão aqui durante a janela definida para cada culto, congresso, acampamento ou retiro.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-7">
            {cantinaEventos.map(group => {
              const evento = group.itens[0];
              const inicio = new Date(evento.inicio_em);
              const agora = new Date();
              const acontecendo = agora >= inicio && agora < new Date(evento.fim_em);
              const reservasAbertas = Boolean(evento.reservas_abrem_em)
                && agora >= new Date(evento.reservas_abrem_em!)
                && (!evento.reservas_fecham_em || agora < new Date(evento.reservas_fecham_em));
              const reservaAindaNaoAbriu = evento.reservas_abrem_em && agora < new Date(evento.reservas_abrem_em);
              return (
                <section key={group.id} aria-labelledby={`cantina-evento-${group.id}`} className="overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--card-shadow)]">
                  <div className="border-b border-[var(--border)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--celebration)]">Cantina · {evento.evento_tipo}</p>
                        <h2 id={`cantina-evento-${group.id}`} className="mt-1 font-display text-xl font-semibold leading-tight txt-primary">{evento.evento_nome}</h2>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${acontecendo ? 'bg-[var(--accent-soft)] text-[var(--success)]' : 'bg-[var(--celebration-soft)] text-[var(--celebration)]'}`}>{acontecendo ? 'Acontecendo' : reservasAbertas ? 'Reservas abertas' : 'Anunciado'}</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs txt-tertiary">
                      <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} />{inicio.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}, {inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="inline-flex items-center gap-1.5"><MapPin size={14} />{evento.evento_local}</span>
                    </div>
                  </div>
                  <div className="space-y-3 p-3">
                    {group.itens.map(item => (
                      <article key={item.anuncio_id} className="grid grid-cols-[5.75rem_minmax(0,1fr)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)]">
                        <div className="min-h-36 overflow-hidden bg-[var(--surface)]">{item.imagem_url ? <img src={item.imagem_url} alt="" className="size-full object-cover" /> : <div className="grid size-full place-items-center"><Store size={24} className="txt-muted" /></div>}</div>
                        <div className="flex min-w-0 flex-col p-3">
                          <div className="flex items-start justify-between gap-2"><h3 className="min-w-0 font-display text-lg font-semibold leading-tight txt-primary">{item.produto_nome}</h3><KesefValue value={item.valor_kesef} compact /></div>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed txt-muted">{item.descricao}</p>
                          {item.alergenicos.length > 0 && <p className="mt-1 line-clamp-1 text-[10px] text-amber-500"><strong>Contém:</strong> {item.alergenicos.join(', ')}</p>}
                          <p className="mt-2 text-[10px] txt-tertiary">{item.quantidade_disponivel > 0 ? `${item.quantidade_disponivel} ${item.unidade}(s) disponível(is)` : 'Esgotado'}</p>
                          {acontecendo ? <Button onClick={() => setResgateProdutoCantina(item)} disabled={item.quantidade_disponivel <= 0 || saldoKesef < item.valor_kesef} className="mt-auto !min-h-10 w-full !px-3 text-xs">{item.quantidade_disponivel <= 0 ? 'Esgotado' : saldoKesef < item.valor_kesef ? 'Kesef insuficiente' : 'Resgatar'}</Button> : item.quantidade_reservavel > 0 && reservaAindaNaoAbriu ? <div className="mt-auto pt-2 text-[10px] font-semibold txt-secondary">Reservas: {new Date(evento.reservas_abrem_em!).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, {new Date(evento.reservas_abrem_em!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div> : item.quantidade_reservavel > 0 && reservasAbertas ? <Button onClick={() => { setReservaCantina(item); setQuantidadeCantina(1); }} disabled={item.quantidade_disponivel <= 0 || saldoKesef < item.valor_kesef} className="mt-auto !min-h-10 w-full !px-3 text-xs">{saldoKesef < item.valor_kesef ? 'Kesef insuficiente' : 'Reservar'}</Button> : <div className="mt-auto pt-2 text-[10px] font-semibold txt-secondary">Disponível no evento</div>}
                        </div>
                      </article>
                    ))}
                  </div>
                  <p className="border-t border-[var(--border)] px-4 py-3 text-center text-[11px] txt-muted">Retirada somente no evento. A Cantina não realiza entrega em domicílio.</p>
                </section>
              );
            })}
          </div>
        )
      ) : tab === 'pedidos' ? (
        pedidos.length === 0 && cantinaReservas.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center card-3d">
            <SealIcon Icon={Package} size="lg" className="mx-auto mb-3 txt-muted" />
            <p className="txt-tertiary">Você ainda não fez nenhum pedido.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {cantinaReservas.length > 0 && <section><h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--celebration)]">Reservas da Cantina</h2><div className="space-y-3">{cantinaReservas.map(reserva => {
              const podeCancelar = reserva.status === 'reservada' && Boolean(reserva.cancelamento_ate) && new Date(reserva.cancelamento_ate!) > new Date();
              return <article key={reserva.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="flex gap-3">{reserva.imagem_url && <img src={reserva.imagem_url} alt="" className="size-16 rounded-xl object-cover" />}<div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h3 className="font-semibold txt-primary">{reserva.quantidade}× {reserva.produto_nome}</h3><p className="mt-0.5 text-xs txt-tertiary">{reserva.evento_nome}</p></div><KesefValue value={reserva.kesef_aprovisionado} compact /></div><p className="mt-2 text-xs txt-muted">{new Date(reserva.inicio_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · {reserva.evento_local}</p></div></div>{reserva.status === 'reservada' && <div className="mt-3 rounded-xl border border-[var(--celebration-border)] bg-[var(--celebration-soft)] p-3 text-center"><p className="mb-2 text-[10px] uppercase tracking-[0.12em] txt-secondary">Apresente no caixa</p><CantinaReservationQr reservationId={reserva.id} code={reserva.codigo_retirada} /><strong className="mt-2 block font-mono text-2xl tracking-[0.18em] text-[var(--celebration)]">{reserva.codigo_retirada}</strong><p className="mt-1 text-[10px] txt-muted">O operador confere e confirma a retirada.</p><button type="button" onClick={() => autorizarRepresentante(reserva)} className="button-quiet mt-2 rounded-lg px-3 py-2 text-xs font-semibold txt-secondary">Autorizar retirada por terceiro</button></div>}<div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs font-semibold txt-secondary">{reserva.status === 'reservada' ? 'Kesef aprovisionado' : reserva.status.replace(/_/g, ' ')}</span>{podeCancelar && <button type="button" disabled={processandoCantina} onClick={() => cancelarReservaCantina(reserva)} className="button-quiet rounded-lg px-3 py-2 text-xs font-semibold text-rose-400">Cancelar reserva</button>}</div></article>;
            })}</div></section>}
            {pedidos.length > 0 && <section><h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] txt-secondary">Resgates da Lojinha</h2><div className="space-y-3">
            {pedidos.map((pedido) => {
              const meta = STATUS_META[pedido.status] || STATUS_META.pendente;
              const Icon = meta.icon;
              return (
                <div key={pedido.id} className="glass rounded-2xl p-4 space-y-2 card-3d">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold txt-primary">{pedido.item?.nome || 'Item'}</h3>
                      <p className="txt-tertiary text-sm">Qtd: {pedido.quantidade} · {pedido.kesef_debitado} Kesef</p>
                      {pedido.variante && <p className="mt-1 text-xs txt-secondary">Variação: {pedido.variante.nome}</p>}
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${meta.cor}`}>
                      <Icon size={14} />
                      {meta.label}
                    </div>
                  </div>
                  <div className="txt-muted text-xs">{new Date(pedido.solicitado_em).toLocaleDateString('pt-BR')}</div>
                  {pedido.status === 'aprovado' && (
                    <div className="relative overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-[var(--surface-elevated)] to-amber-950/20 p-4 shadow-sm">
                      <div className="flex items-center justify-between border-b border-amber-500/20 pb-2 mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-400">Passaporte de Comunhão · Resgate</p>
                        <span className="text-[10px] font-medium text-amber-300/80">{ETAPA_LOGISTICA_LABEL[pedido.etapa_logistica ?? 'previsao_pendente']}</span>
                      </div>
                      {pedido.etapa_logistica === 'agendado' && pedido.entrega_agendada_em ? (
                        <p className="mt-1 text-sm leading-relaxed txt-primary"><strong>{new Date(pedido.entrega_agendada_em).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}</strong>{pedido.entrega_local ? ` · ${pedido.entrega_local}` : ''}</p>
                      ) : (
                        <p className="mt-1 text-sm leading-relaxed txt-secondary">{pedido.etapa_logistica === 'alinhamento_retirada' ? 'O Gestor do Tesouro alinhará com você a data e o local de retirada.' : 'Seu pedido foi processado. Em breve você receberá uma previsão de entrega.'}</p>
                      )}
                      {pedido.instrucoes_retirada && <p className="mt-1.5 text-xs leading-relaxed txt-tertiary">{pedido.instrucoes_retirada}</p>}
                      {pedido.codigo_retirada && (
                        <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-400/30 bg-black/25 px-3.5 py-2.5 backdrop-blur-sm">
                          <div>
                            <span className="block text-[9px] uppercase tracking-wider text-amber-300/70 font-semibold">Código de Retirada Presencial</span>
                            <span className="font-mono text-base font-bold tracking-[0.2em] text-amber-300 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]">{pedido.codigo_retirada}</span>
                          </div>
                          <span className="text-xl">🏛️</span>
                        </div>
                      )}
                    </div>
                  )}
                  {pedido.observacoes && <p className="txt-tertiary text-sm mt-1">Obs: {pedido.observacoes}</p>}
                  {pedido.historico && pedido.historico.length > 0 && (
                    <details className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
                      <summary className="cursor-pointer list-none text-xs font-semibold txt-secondary">Acompanhar resgate <span className="ml-1 text-[10px] txt-muted">({pedido.historico.length} atualizações)</span></summary>
                      <ol className="mt-3 space-y-3 border-l border-[var(--border)] pl-3">
                        {[...pedido.historico].sort((a, b) => new Date(b.ocorrido_em).getTime() - new Date(a.ocorrido_em).getTime()).map(evento => (
                          <li key={evento.id} className="relative text-xs"><span className="absolute -left-[1.06rem] top-1.5 size-2 rounded-full bg-[var(--accent-primary)]" /><strong className="block txt-primary">{evento.titulo}</strong><p className="mt-0.5 leading-relaxed txt-tertiary">{evento.descricao}</p><time className="mt-1 block text-[10px] txt-muted">{new Date(evento.ocorrido_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</time></li>
                        ))}
                      </ol>
                    </details>
                  )}
                </div>
              );
            })}
            </div></section>}
          </div>
        )
      ) : (
        /* ─── Admin ─── */
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input value={buscaPedido} onChange={event => setBuscaPedido(event.target.value)} placeholder="Buscar membro, produto ou SKU" className="input-theme min-h-11 rounded-xl border px-3 text-sm" />
            <div className="flex gap-2">
              <select value={filtroPedido} onChange={event => setFiltroPedido(event.target.value)} className="input-theme min-h-11 flex-1 rounded-xl border px-3 text-sm">
                <option value="todos">Todos</option><option value="pendente">Pendentes</option><option value="aprovado">Aprovados</option><option value="rejeitado">Rejeitados</option><option value="entregue">Entregues</option>
              </select>
              <IconButton onClick={exportarPedidos} label="Exportar resgates filtrados"><Download size={16} /></IconButton>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold txt-secondary uppercase tracking-[0.12em]">Pedidos ({pedidosFiltrados.length})</h2>
            {canManageStore && (
              <Button onClick={abrirCriarItem} variant="secondary" className="text-xs !min-h-9 !px-3">
                <Plus size={14} /> Novo produto
              </Button>
            )}
          </div>

          <section aria-label="Indicadores da operação da Loja" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-2xl border border-[var(--care-border)] bg-[var(--care-soft)] p-3"><p className="text-[10px] font-bold uppercase tracking-[0.12em] txt-secondary">Ação agora</p><strong className="mt-1 block font-display text-2xl text-[var(--care)]">{metricasOperacao.pendentes}</strong><span className="text-[10px] txt-muted">pedido(s) pendente(s)</span></div>
            <div className="rounded-2xl border border-[var(--celebration-border)] bg-[var(--celebration-soft)] p-3"><p className="text-[10px] font-bold uppercase tracking-[0.12em] txt-secondary">Retirada</p><strong className="mt-1 block font-display text-2xl text-[var(--celebration)]">{metricasOperacao.aguardandoRetirada}</strong><span className="text-[10px] txt-muted">aguardando membro</span></div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3"><p className="text-[10px] font-bold uppercase tracking-[0.12em] txt-secondary">Resposta média</p><strong className="mt-1 block font-display text-2xl txt-primary">{metricasOperacao.minutosMediosDecisao === null ? '—' : formatarDuracao(metricasOperacao.minutosMediosDecisao)}</strong><span className="text-[10px] txt-muted">aprovar ou rejeitar</span></div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3"><p className="text-[10px] font-bold uppercase tracking-[0.12em] txt-secondary">Mais antigo</p><strong className="mt-1 block truncate font-display text-xl txt-primary">{metricasOperacao.maisAntigo ? formatarTempoAguardando(metricasOperacao.maisAntigo.solicitado_em) : '—'}</strong><span className="text-[10px] txt-muted">{metricasOperacao.maisAntigo ? metricasOperacao.maisAntigo.item?.nome || 'pendente' : 'sem pendências'}</span></div>
          </section>

          {adminPedidos.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center card-3d">
              <SealIcon Icon={Package} size="lg" className="mx-auto mb-3 txt-muted" />
              <p className="txt-tertiary">Nenhum pedido pendente.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pedidosFiltradosOrdenados.map((pedido) => {
                const meta = STATUS_META[pedido.status] || STATUS_META.pendente;
                const Icon = meta.icon;
                return (
                  <div key={pedido.id} className="glass rounded-2xl p-4 space-y-2 card-3d">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold txt-primary truncate">{pedido.item?.nome || 'Item'}</h3>
                        <p className="txt-tertiary text-xs">
                          {pedido.usuario?.nome || 'Desconhecido'}
                          {pedido.usuario?.username ? ` · @${pedido.usuario.username}` : ''}
                        </p>
                        <p className="txt-tertiary text-xs">Qtd: {pedido.quantidade} · {pedido.kesef_debitado} Kesef</p>
                        {pedido.variante && <p className="txt-secondary text-xs">Variação: {pedido.variante.nome} · SKU {pedido.variante.sku}</p>}
                      </div>
                      <div className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${meta.cor}`}>
                        <Icon size={12} />
                        {meta.label}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[10px] txt-muted"><span>{new Date(pedido.solicitado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>{pedido.status === 'pendente' && <span className="font-semibold text-[var(--care)]">Aguardando há {formatarTempoAguardando(pedido.solicitado_em)}</span>}</div>
                    {pedido.codigo_retirada && <p className="rounded-lg bg-[var(--accent-soft)] px-2.5 py-2 font-mono text-xs font-bold tracking-widest txt-primary">Retirada: {pedido.codigo_retirada}</p>}
                    {pedido.status === 'aprovado' && <p className="rounded-lg border border-[var(--celebration-border)] bg-[var(--celebration-soft)] px-2.5 py-2 text-xs txt-secondary"><strong className="text-[var(--celebration)]">{ETAPA_LOGISTICA_LABEL[pedido.etapa_logistica ?? 'previsao_pendente']}</strong>{pedido.etapa_logistica === 'agendado' && pedido.entrega_agendada_em ? ` · ${new Date(pedido.entrega_agendada_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}${pedido.entrega_local ? ` · ${pedido.entrega_local}` : ''}` : ''}</p>}
                    {canManageStore && <div className="flex gap-2 pt-1">
                      {pedido.status === 'pendente' && (
                        <>
                          <Button disabled={processandoPedidoId === pedido.id} onClick={() => setPedidoLogistica({ pedido, mode: 'approve' })} className="flex-1 text-xs">
                            {processandoPedidoId === pedido.id ? 'Processando...' : 'Processar'}
                          </Button>
                          <Button onClick={() => { setPedidoRejeicao(pedido); setMotivoRejeicao(''); }} variant="danger" className="flex-1 text-xs">
                            Rejeitar
                          </Button>
                        </>
                      )}
                      {pedido.status === 'aprovado' && (
                        <>
                          <Button disabled={processandoPedidoId === pedido.id} onClick={() => setPedidoLogistica({ pedido, mode: 'update' })} variant="secondary" className="flex-1 text-xs">Entrega</Button>
                          <Button disabled={processandoPedidoId === pedido.id} onClick={() => processarPedido(pedido.id, 'entregue')} className="flex-1 text-xs">
                            {processandoPedidoId === pedido.id ? 'Processando...' : 'Marcar entregue'}
                          </Button>
                        </>
                      )}
                    </div>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Itens da Loja (admin) */}
          <h2 className="text-sm font-bold txt-secondary uppercase tracking-[0.12em] pt-4">Itens</h2>
          <div className="space-y-2">
            {itens.map(item => (
              <div key={item.id} className="glass rounded-2xl p-3 flex items-center justify-between gap-3 card-3d">
                <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)]">
                  {imagemDoTema(item) ? <img key={`${item.id}-${theme}`} src={imagemDoTema(item)} alt="" className="size-full object-contain" /> : <ShoppingBag size={18} className="txt-muted" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold txt-primary text-sm truncate">{item.nome}</h3>
                  <div className="mt-1 flex items-center gap-2"><KesefValue value={item.preco_kesef} compact /><span className="txt-muted text-xs">{item.estoque} em estoque{item.ativo ? '' : ' · Inativo'}</span></div>
                </div>
                {canManageStore && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" onClick={() => alterarEstadoItem(item, item.estado === 'ativo' ? 'pausado' : 'ativo')} className="button-quiet min-h-9 rounded-lg px-2 text-[10px] font-semibold">{item.estado === 'ativo' ? 'Pausar' : 'Ativar'}</button>
                    <IconButton onClick={() => abrirEditarItem(item)} label={`Editar ${item.nome}`}><Edit3 size={14} /></IconButton>
                    <IconButton onClick={() => setItemParaExcluir(item)} label={`Excluir ${item.nome}`} className="!text-[var(--danger)]"><Trash2 size={14} /></IconButton>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal confirmação */}
      {reservaCantina && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-6 backdrop-blur-sm" onClick={() => setReservaCantina(null)}>
          <div className="glass-strong w-full max-w-sm space-y-4 rounded-2xl p-5" onClick={event => event.stopPropagation()}>
            <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--celebration)]">Reserva antecipada</p><h2 className="mt-1 font-display text-2xl font-semibold txt-primary">{reservaCantina.produto_nome}</h2><p className="mt-1 text-sm txt-tertiary">{reservaCantina.evento_nome}</p></div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3"><span className="text-sm txt-secondary">Quantidade</span><div className="flex items-center gap-3"><button type="button" className="button-quiet grid size-9 place-items-center rounded-lg text-lg" onClick={() => setQuantidadeCantina(value => Math.max(1, value - 1))}>−</button><strong className="min-w-5 text-center txt-primary">{quantidadeCantina}</strong><button type="button" className="button-quiet grid size-9 place-items-center rounded-lg text-lg" onClick={() => setQuantidadeCantina(value => Math.min(reservaCantina.limite_por_membro, reservaCantina.quantidade_reservavel, reservaCantina.quantidade_disponivel, value + 1))}>+</button></div></div>
            <div className="rounded-xl bg-[var(--celebration-soft)] p-3 text-sm"><div className="flex justify-between"><span className="txt-secondary">Kesef aprovisionado</span><strong className="text-[var(--celebration)]">{reservaCantina.valor_kesef * quantidadeCantina} K</strong></div><div className="mt-1 flex justify-between text-xs"><span className="txt-muted">Saldo após a reserva</span><strong className="txt-primary">{saldoKesef - reservaCantina.valor_kesef * quantidadeCantina} K</strong></div></div>
            <p className="text-xs leading-relaxed txt-muted">O Kesef fica retido agora. Se você não comparecer, o pedido será doado e os pontos serão resgatados, conforme a regra da Cantina.</p>
            <div className="flex gap-2"><Button variant="ghost" className="flex-1" onClick={() => setReservaCantina(null)} disabled={processandoCantina}>Voltar</Button><Button className="flex-1" onClick={executarReservaCantina} disabled={processandoCantina || saldoKesef < reservaCantina.valor_kesef * quantidadeCantina}>{processandoCantina ? 'Reservando…' : 'Confirmar reserva'}</Button></div>
          </div>
        </div>
      )}

      {resgateProdutoCantina && (
        <CantinaRedemptionSheet
          product={resgateProdutoCantina}
          balance={saldoKesef}
          onClose={() => setResgateProdutoCantina(null)}
          onCompleted={load}
        />
      )}

      {confirmando && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmando(null)}>
          <div className="glass-strong max-h-[min(42rem,calc(var(--app-viewport-height)-3rem))] w-full max-w-sm space-y-4 overflow-y-auto rounded-2xl p-6" onClick={e => e.stopPropagation()}>
            {imagemDoTema(confirmando) && <img key={`${confirmando.id}-${theme}`} src={imagemDoTema(confirmando)} alt="" className="max-h-[60vh] w-full rounded-xl object-contain" />}
            <h2 className="text-lg font-bold txt-primary">Confirmar Resgate</h2>
            <p className="txt-secondary">Deseja solicitar <strong className="txt-primary">{confirmando.nome}</strong>?</p>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--celebration-border)] bg-[var(--celebration-soft)] p-3">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] txt-secondary">Valor do resgate</span>
              <KesefValue value={confirmando.preco_kesef} />
            </div>
            <p className="txt-tertiary text-sm">{confirmando.descricao}</p>
            {Boolean(confirmando.variantes?.length) && (
              <fieldset>
                <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] txt-secondary">Escolha a variação</legend>
                <div className="grid grid-cols-2 gap-2">
                  {confirmando.variantes?.filter(variant => variant.ativo).map(variant => (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={variant.estoque <= 0}
                      onClick={() => setVarianteSelecionada(variant)}
                      className={`min-h-11 rounded-xl border px-3 py-2 text-left text-xs ${varianteSelecionada?.id === variant.id ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] txt-primary' : 'border-[var(--border)] txt-secondary'} disabled:opacity-40`}
                    >
                      <strong className="block">{variant.nome}</strong>
                      <span className="txt-muted">{variant.estoque > 0 ? `${variant.estoque} disponível(is)` : 'Esgotado'}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">
              <div className="flex justify-between gap-3"><span className="txt-tertiary">Saldo atual</span><strong className="txt-primary">{saldoKesef} Kesef</strong></div>
              <div className="mt-1 flex justify-between gap-3"><span className="txt-tertiary">Após aprovação</span><strong className={saldoKesef >= confirmando.preco_kesef ? 'txt-green' : 'text-[var(--danger)]'}>{saldoKesef >= confirmando.preco_kesef ? `${saldoKesef - confirmando.preco_kesef} Kesef` : `Faltam ${confirmando.preco_kesef - saldoKesef}`}</strong></div>
            </div>
            <p className="txt-muted text-xs">A solicitação entra em uma fila. O item e o débito serão confirmados somente na aprovação.</p>
            {confirmando.estoque <= 3 && confirmando.estoque > 0 && (
              <p className="text-yellow-300 text-xs">Apenas {confirmando.estoque} unidade(s) restante(s)!</p>
            )}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => setConfirmando(null)}
                variant="ghost"
                className="flex-1"
                disabled={resgatando}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => executarResgate(confirmando)}
                className="flex-1"
                disabled={resgatando || saldoKesef < confirmando.preco_kesef || confirmando.estoque <= 0 || Boolean(confirmando.variantes?.length && !varianteSelecionada)}
              >
                {resgatando ? 'Solicitando...' : saldoKesef >= confirmando.preco_kesef ? 'Confirmar' : 'Saldo insuficiente'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {pedidoRejeicao && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm" onClick={() => setPedidoRejeicao(null)}>
          <div className="glass-strong w-full max-w-sm space-y-4 rounded-2xl p-6" onClick={event => event.stopPropagation()}>
            <div>
              <h2 className="text-lg font-bold txt-primary">Rejeitar solicitação</h2>
              <p className="mt-1 text-sm txt-tertiary">Explique o motivo para {pedidoRejeicao.usuario?.nome || 'o membro'}.</p>
            </div>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] txt-secondary">Justificativa</span>
              <textarea
                value={motivoRejeicao}
                onChange={event => setMotivoRejeicao(event.target.value)}
                maxLength={300}
                className="input-theme mt-1 min-h-24 w-full resize-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--focus)]"
                placeholder="Ex.: item indisponível ou solicitação duplicada"
              />
            </label>
            <div className="flex gap-3">
              <Button onClick={() => setPedidoRejeicao(null)} variant="ghost" className="flex-1" disabled={Boolean(processandoPedidoId)}>Cancelar</Button>
              <Button onClick={confirmarRejeicao} variant="danger" className="flex-1" disabled={motivoRejeicao.trim().length < 3 || Boolean(processandoPedidoId)}>
                {processandoPedidoId ? 'Processando...' : 'Rejeitar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {produtoEmEdicao !== undefined && (
        <AdminProductEditor
          key={produtoEmEdicao?.id ?? 'novo-produto'}
          item={produtoEmEdicao}
          saving={adminLoadingLoja}
          onClose={() => setProdutoEmEdicao(undefined)}
          onSubmit={salvarItem}
        />
      )}
      {pedidoLogistica && (
        <OrderFulfillmentSheet
          pedido={pedidoLogistica.pedido}
          mode={pedidoLogistica.mode}
          busy={processandoPedidoId === pedidoLogistica.pedido.id}
          onClose={() => setPedidoLogistica(null)}
          onSubmit={salvarLogisticaPedido}
        />
      )}
      {itemParaExcluir && (
        <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm" onClick={() => !excluindoItemId && setItemParaExcluir(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="excluir-item-title" className="glass-strong w-full max-w-sm space-y-4 rounded-2xl p-5 shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-[var(--danger)]"><Trash2 size={19} /></span>
              <div>
                <h2 id="excluir-item-title" className="font-display text-xl font-semibold txt-primary">Excluir produto?</h2>
                <p className="mt-1 text-sm leading-relaxed txt-tertiary">“{itemParaExcluir.nome}” será removido do Tesouro, incluindo as imagens vinculadas.</p>
              </div>
            </div>
            <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs leading-relaxed txt-muted">Produtos com pedidos ou movimentações de estoque não podem ser excluídos: arquive-os para preservar o histórico.</p>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setItemParaExcluir(null)} disabled={Boolean(excluindoItemId)}>Cancelar</Button>
              <Button variant="danger" className="flex-1" onClick={excluirItem} disabled={Boolean(excluindoItemId)}>
                {excluindoItemId ? 'Excluindo...' : 'Excluir produto'}
              </Button>
            </div>
          </section>
        </div>
      )}
      <TextInputDialog
        open={reservaRepresentante !== null}
        title="Autorizar retirada por terceiro"
        description="A pessoa autorizada poderá apresentar esta reserva no caixa do evento. Não haverá entrega em domicílio."
        label="Nome de usuário"
        value={representanteUsername}
        confirmLabel="Autorizar retirada"
        busy={processandoCantina}
        onChange={setRepresentanteUsername}
        onCancel={() => { setReservaRepresentante(null); setRepresentanteUsername(''); }}
        onConfirm={confirmarRepresentante}
      />
    </div>
  );
}
