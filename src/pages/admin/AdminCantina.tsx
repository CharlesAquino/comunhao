import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { CalendarDays, CheckCircle2, Coins, Download, Edit3, FileSpreadsheet, PackagePlus, Plus, RefreshCw, Search, Send, Store, TrendingDown, UsersRound } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { EmptyState, ErrorState } from '../../components/ui/FeedbackState';
import SectionHeader from '../../components/ui/SectionHeader';
import { useAdmin } from '../../contexts/AdminContext';
import { useToast } from '../../contexts/ToastContext';
import { cancelImmediateCantinaRedemption, confirmCantinaPickup, createCantinaEvent, createImmediateCantinaRedemption, getCantinaRedemptionReport, getKesefEconomyMetrics, listCantinaEvents, listCantinaPickups, listCantinaStock, markCantinaNoShow, publishCantinaEvent, registerCantinaStock, updateCantinaEvent } from '../../services/cantinaService';
import CantinaOperatorPos from '../../components/cantina/CantinaOperatorPos';
import CantinaOperatorCheckoutSheet from '../../components/cantina/CantinaOperatorCheckoutSheet';
import type { CantinaImmediateRedemption } from '../../types/cantina';
import { uploadCantinaProductImage } from '../../services/cantinaImageService';
import type { CantinaEvent, CantinaEventType, CantinaPickup, CantinaRedemptionReportRow, CantinaStockItem, KesefEconomyMetrics } from '../../types/cantina';
import { AdminPageHeader, AdminSection, KesefAmount } from '../../components/admin/AdminPage';

const STATUS_LABELS: Record<CantinaEvent['status'], string> = {
  rascunho: 'Rascunho', anunciado: 'Anunciado', reservas_abertas: 'Reservas abertas',
  reservas_encerradas: 'Reservas encerradas', aberto: 'Aberto', pausado: 'Pausado',
  encerrado: 'Encerrado', cancelado: 'Cancelado',
};

const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });

function errorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof Error) return cause.message;
  if (cause && typeof cause === 'object' && 'message' in cause && typeof cause.message === 'string') return cause.message;
  return fallback;
}

export default function AdminCantina() {
  const { can } = useAdmin();
  const toast = useToast();
  const [metrics, setMetrics] = useState<KesefEconomyMetrics | null>(null);
  const [metricsError, setMetricsError] = useState('');
  const [events, setEvents] = useState<CantinaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState('');
  const [saving, setSaving] = useState(false);
  const [publishingEventId, setPublishingEventId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [stock, setStock] = useState<CantinaStockItem[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [pickups, setPickups] = useState<CantinaPickup[]>([]);
  const [pickupSearch, setPickupSearch] = useState('');
  const [processingPickup, setProcessingPickup] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkout, setCheckout] = useState<CantinaImmediateRedemption | null>(null);
  const [report, setReport] = useState<CantinaRedemptionReportRow[]>([]);
  const [reportSearch, setReportSearch] = useState('');
  const [reportOrigin, setReportOrigin] = useState('todos');
  const [showStockForm, setShowStockForm] = useState(false);
  const [stockForm, setStockForm] = useState({ produtoNome: '', descricao: '', unidade: 'unidade', alergenicos: '', origem: 'contribuicao_pessoal', quantidade: 1, valorKesef: 1, limitePorMembro: 1, quantidadeReservavel: 0, validadeEm: '', conservacao: '', observacaoPrivada: '' });
  const [stockImage, setStockImage] = useState<File | null>(null);
  const [form, setForm] = useState({
    nome: '', tipo: 'culto' as CantinaEventType, local: '', inicioEm: '', fimEm: '',
    reservasAbremEm: '', reservasFechamEm: '', cancelamentoAte: '', toleranciaRetiradaMinutos: 30,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [economyResult, eventsResult] = await Promise.allSettled([
        can('economy.read') ? getKesefEconomyMetrics(12) : Promise.resolve(null),
        listCantinaEvents(),
      ]);
      if (economyResult.status === 'fulfilled') {
        setMetrics(economyResult.value);
        setMetricsError('');
      } else {
        setMetrics(null);
        setMetricsError(errorMessage(economyResult.reason, 'Métricas indisponíveis.'));
      }
      if (eventsResult.status === 'rejected') throw eventsResult.reason;
      setEvents(eventsResult.value);
      setSelectedEventId(current => current || eventsResult.value[0]?.id || '');
    } catch (cause) {
      setError(errorMessage(cause, 'Não foi possível carregar a Cantina.'));
    } finally {
      setLoading(false);
    }
  }, [can]);

  useEffect(() => { load(); }, [load]);

  const loadStock = useCallback(async () => {
    if (!selectedEventId || (!can('canteen.inventory.manage') && !can('canteen.checkout.operate'))) {
      setStock([]);
      return;
    }
    setStockLoading(true);
    try {
      setStock(await listCantinaStock(selectedEventId));
    } catch (cause) {
      toast.error(errorMessage(cause, 'Não foi possível carregar o estoque.'));
    } finally {
      setStockLoading(false);
    }
  }, [can, selectedEventId, toast]);

  useEffect(() => { loadStock(); }, [loadStock]);

  const loadPickups = useCallback(async () => {
    if (!selectedEventId || (!can('canteen.checkout.operate') && !can('canteen.redemptions.read'))) return setPickups([]);
    try { setPickups(await listCantinaPickups(selectedEventId)); }
    catch (cause) { toast.error(errorMessage(cause, 'Não foi possível carregar as retiradas.')); }
  }, [can, selectedEventId, toast]);

  useEffect(() => { loadPickups(); }, [loadPickups]);

  const loadReport = useCallback(async () => {
    if (!can('canteen.reports.read')) return setReport([]);
    try { setReport(await getCantinaRedemptionReport(selectedEventId || undefined)); }
    catch (cause) { toast.error(errorMessage(cause, 'Não foi possível carregar o relatório.')); }
  }, [can, selectedEventId, toast]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const confirmPickup = async (pickup: CantinaPickup) => {
    setProcessingPickup(pickup.reserva_id);
    try { await confirmCantinaPickup(pickup.reserva_id, pickup.codigo_retirada); toast.success('Retirada confirmada.'); await loadPickups(); }
    catch (cause) { toast.error(errorMessage(cause, 'Não foi possível confirmar a retirada.')); }
    finally { setProcessingPickup(''); }
  };
  const markNoShow = async (pickup: CantinaPickup) => { setProcessingPickup(pickup.reserva_id); try { await markCantinaNoShow(pickup.reserva_id); toast.success('Pedido destinado à doação; Kesef resgatado.'); await loadPickups(); } catch (cause) { toast.error(errorMessage(cause, 'Disponível somente após o encerramento do evento.')); } finally { setProcessingPickup(''); } };

  const openImmediateRedemption = async () => {
    const items = stock.filter(item => item.anuncio_id && (cart[item.anuncio_id] ?? 0) > 0).map(item => ({ anuncio_id: item.anuncio_id!, quantidade: cart[item.anuncio_id!] }));
    if (!items.length) return toast.error('Adicione ao menos um item ao resgate.');
    setSaving(true);
    try { setCheckout(await createImmediateCantinaRedemption(selectedEventId, items)); setCart({}); await loadStock(); }
    catch (cause) { toast.error(errorMessage(cause, 'Não foi possível iniciar o resgate.')); }
    finally { setSaving(false); }
  };

  const closeCheckout = async () => {
    if (!checkout) return;
    try { await cancelImmediateCantinaRedemption(checkout.id); await loadStock(); }
    catch { /* Pode ter sido confirmado no outro aparelho entre o clique e o cancelamento. */ }
    setCheckout(null);
  };

  const reportFiltered = report.filter(row => {
    const query = reportSearch.trim().toLocaleLowerCase('pt-BR');
    const matchesOrigin = reportOrigin === 'todos' || row.origem === reportOrigin;
    const matchesSearch = !query || [row.usuario_nome, row.usuario_username, row.produto_nome, row.operador_nome, row.representante_nome]
      .some(value => value?.toLocaleLowerCase('pt-BR').includes(query));
    return matchesOrigin && matchesSearch;
  });
  const reportRedemptions = new Set(reportFiltered.map(row => `${row.origem}:${row.registro_id}`)).size;
  const reportProducts = reportFiltered.reduce((sum, row) => sum + row.quantidade, 0);
  const reportKesef = reportFiltered.reduce((sum, row) => sum + row.total_kesef, 0);

  const exportReport = () => {
    const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [['Data e hora','Evento','Origem','Usuário','Username','Produto','Quantidade','Valor unitário','Total Kesef','Status','Operador','Representante'], ...reportFiltered.map(row => [
      new Date(row.realizado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }), row.evento_nome, row.origem,
      row.usuario_nome, row.usuario_username, row.produto_nome, row.quantidade, row.valor_unitario_kesef,
      row.total_kesef, row.status, row.operador_nome, row.representante_nome,
    ])];
    const csv = `\uFEFF${rows.map(row => row.map(quote).join(';')).join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href=url; link.download=`cantina-resgates-${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.nome.trim() || !form.local.trim() || !form.inicioEm || !form.fimEm) {
      toast.error('Preencha nome, local, início e fim do evento.');
      return;
    }
    setSaving(true);
    try {
      if (editingEventId) await updateCantinaEvent(editingEventId, form);
      else await createCantinaEvent(form);
      toast.success(editingEventId ? 'Evento atualizado.' : 'Evento criado como rascunho. Nenhum item ou valor foi publicado.');
      setShowForm(false);
      setEditingEventId('');
      setForm({ nome: '', tipo: 'culto', local: '', inicioEm: '', fimEm: '', reservasAbremEm: '', reservasFechamEm: '', cancelamentoAte: '', toleranciaRetiradaMinutos: 30 });
      await load();
    } catch (cause) {
      toast.error(errorMessage(cause, 'Não foi possível criar o evento.'));
    } finally {
      setSaving(false);
    }
  };

  const editEvent = (event: CantinaEvent) => {
    const local = (value: string | null) => value ? new Date(value).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 16) : '';
    setForm({ nome: event.nome, tipo: event.tipo, local: event.local, inicioEm: local(event.inicio_em), fimEm: local(event.fim_em), reservasAbremEm: local(event.reservas_abrem_em), reservasFechamEm: local(event.reservas_fecham_em), cancelamentoAte: local(event.cancelamento_ate), toleranciaRetiradaMinutos: event.tolerancia_retirada_minutos });
    setEditingEventId(event.id); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitStock = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedEventId || !stockForm.produtoNome.trim() || stockForm.quantidade < 1 || stockForm.valorKesef < 1) {
      toast.error('Selecione o evento e informe produto, quantidade e valor Kesef.');
      return;
    }
    setSaving(true);
    try {
      const imagemUrl = stockImage ? await uploadCantinaProductImage(stockImage) : '';
      await registerCantinaStock({
        eventoId: selectedEventId,
        ...stockForm,
        imagemUrl,
        alergenicos: stockForm.alergenicos.split(',').map(value => value.trim()).filter(Boolean),
      });
      toast.success('Lote registrado. O anúncio permanece em rascunho até a publicação do evento.');
      setStockForm({ produtoNome: '', descricao: '', unidade: 'unidade', alergenicos: '', origem: 'contribuicao_pessoal', quantidade: 1, valorKesef: 1, limitePorMembro: 1, quantidadeReservavel: 0, validadeEm: '', conservacao: '', observacaoPrivada: '' });
      setStockImage(null);
      setShowStockForm(false);
      await loadStock();
    } catch (cause) {
      toast.error(errorMessage(cause, 'Não foi possível registrar o lote.'));
    } finally {
      setSaving(false);
    }
  };

  const publishEvent = async (eventId: string) => {
    if (publishingEventId) return;
    setPublishingEventId(eventId);
    try {
      await publishCantinaEvent(eventId);
      toast.success('Evento publicado na Cantina da aba Tesouro.');
      await Promise.all([load(), selectedEventId === eventId ? loadStock() : Promise.resolve()]);
    } catch (cause) {
      const message = errorMessage(cause, 'Não foi possível publicar o evento.');
      toast.error(message.includes('EVENTO_SEM_ANUNCIO_COMPLETO')
        ? 'Inclua ao menos um item com imagem, descrição, estoque e valor Kesef.'
        : message);
    } finally {
      setPublishingEventId('');
    }
  };

  return (
    <div className="min-w-0 space-y-7 overflow-x-hidden">
      <AdminPageHeader eyebrow="Cantina e economia" title="Preparar antes de precificar" description="Acompanhe a circulação do Kesef e prepare eventos sem criar equivalência com dinheiro." actions={<>
          <Button type="button" variant="secondary" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Atualizar</Button>
          {can('canteen.events.manage') && <Button type="button" onClick={() => { setEditingEventId(''); setShowForm(value => !value); }}><Plus size={17} /> Novo evento</Button>}
        </>} />

      {error && <ErrorState message={`Fundação da Cantina indisponível: ${error}. A migration local precisa estar aplicada no ambiente.`} />}

      {metricsError && <ErrorState message={`O painel econômico está temporariamente indisponível: ${metricsError}`} />}

      {metrics && (
        <AdminSection title="Linha de base — últimas 12 semanas" description="Créditos regulares; ajustes e estornos não entram na emissão.">
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Emissão semanal mediana" value={<KesefAmount value={number.format(metrics.emissao.mediana_semanal)} />} detail={`P25 ${number.format(metrics.emissao.p25_semanal)} · P75 ${number.format(metrics.emissao.p75_semanal)}`} Icon={Coins} />
            <Metric label="Membros com emissão" value={number.format(metrics.emissao.membros)} detail={`${metrics.segmentos.recorrentes} recorrentes · ${metrics.segmentos.ocasionais} ocasionais`} Icon={UsersRound} />
            <Metric label="Saldo mediano" value={<KesefAmount value={number.format(metrics.saldos.mediana)} />} detail={`Top 10% concentra ${number.format(metrics.saldos.top_10_percentual)}%`} Icon={Store} />
            <Metric label="Taxa de drenagem" value={`${number.format(metrics.movimentacao.taxa_drenagem * 100)}%`} detail={`${number.format(metrics.movimentacao.debitado)} Kesef debitados no período`} Icon={TrendingDown} />
          </div>
          <p className="mt-3 text-xs txt-muted">Esses indicadores orientam hipóteses. Eles não geram valores de itens automaticamente.</p>
        </AdminSection>
      )}

      {showForm && can('canteen.events.manage') && (
        <Card className="p-4 sm:p-5">
          <SectionHeader title={editingEventId ? 'Editar evento da Cantina' : 'Novo evento da Cantina'} /><p className="mt-1 text-xs txt-tertiary">{editingEventId ? 'Datas e janelas atualizadas passam a valer imediatamente.' : 'O evento nasce como rascunho e ainda não aceita anúncios ou reservas.'}</p>
          <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
            <Field label="Nome"><input className="input-theme min-h-11 w-full rounded-xl px-3" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Cantina do culto de domingo" /></Field>
            <Field label="Tipo"><select className="input-theme min-h-11 w-full rounded-xl px-3" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as CantinaEventType })}><option value="culto">Culto</option><option value="congresso">Congresso</option><option value="acampamento">Acampamento</option><option value="retiro">Retiro</option><option value="outro">Outro</option></select></Field>
            <Field label="Local"><input className="input-theme min-h-11 w-full rounded-xl px-3" value={form.local} onChange={e => setForm({ ...form, local: e.target.value })} placeholder="Salão da igreja" /></Field>
            <Field label="Tolerância para retirada (minutos)"><input type="number" min="0" max="240" className="input-theme min-h-11 w-full rounded-xl px-3" value={form.toleranciaRetiradaMinutos} onChange={e => setForm({ ...form, toleranciaRetiradaMinutos: Number(e.target.value) })} /></Field>
            <Field label="Início do evento"><input type="datetime-local" className="input-theme min-h-11 w-full rounded-xl px-3" value={form.inicioEm} onChange={e => setForm({ ...form, inicioEm: e.target.value })} /></Field>
            <Field label="Fim do evento"><input type="datetime-local" className="input-theme min-h-11 w-full rounded-xl px-3" value={form.fimEm} onChange={e => setForm({ ...form, fimEm: e.target.value })} /></Field>
            <Field label="Reservas abrem"><input type="datetime-local" className="input-theme min-h-11 w-full rounded-xl px-3" value={form.reservasAbremEm} onChange={e => setForm({ ...form, reservasAbremEm: e.target.value })} /></Field>
            <Field label="Reservas fecham"><input type="datetime-local" className="input-theme min-h-11 w-full rounded-xl px-3" value={form.reservasFechamEm} onChange={e => setForm({ ...form, reservasFechamEm: e.target.value })} /></Field>
            <Field label="Cancelamento permitido até"><input type="datetime-local" className="input-theme min-h-11 w-full rounded-xl px-3" value={form.cancelamentoAte} onChange={e => setForm({ ...form, cancelamentoAte: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-2 sm:col-span-2 sm:flex sm:items-end sm:justify-end"><Button type="button" variant="ghost" onClick={() => { setShowForm(false); setEditingEventId(''); }}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Salvando…' : editingEventId ? 'Salvar alterações' : 'Criar rascunho'}</Button></div>
          </form>
        </Card>
      )}

      <section>
        <SectionHeader title="Eventos" /><p className="mt-1 text-xs txt-tertiary">A Cantina não possui catálogo permanente; cada item existirá dentro de um evento.</p>
        <div className="mt-3 space-y-3">
          {!loading && events.length === 0 && <EmptyState Icon={CalendarDays} title="Nenhum evento criado" description="Crie o primeiro rascunho quando estoque, equipe e janela estiverem definidos." />}
          {events.map(item => <Card key={item.id} className="flex min-w-0 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)]"><CalendarDays size={18} className="txt-green" /></span><div className="min-w-0"><h3 className="break-words font-semibold txt-primary">{item.nome}</h3><p className="mt-1 break-words text-xs leading-5 txt-tertiary">{date.format(new Date(item.inicio_em))} · {item.local}</p></div></div><div className="flex min-w-0 flex-wrap items-center gap-2"><span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold txt-secondary">{STATUS_LABELS[item.status]}</span>{can('canteen.events.manage') && !['encerrado','cancelado'].includes(item.status) && <Button type="button" variant="ghost" className="!min-h-9 !px-3 text-xs" onClick={() => editEvent(item)}><Edit3 size={14} /> Editar</Button>}{can('canteen.events.manage') && can('canteen.inventory.manage') && ['rascunho', 'anunciado', 'reservas_abertas'].includes(item.status) && <Button type="button" variant="secondary" className="!min-h-9 !px-3 text-xs" disabled={Boolean(publishingEventId)} onClick={() => publishEvent(item.id)}><Send size={14} /> {publishingEventId === item.id ? 'Publicando…' : 'Publicar vitrine'}</Button>}</div></Card>)}
        </div>
      </section>

      {can('canteen.inventory.manage') && events.length > 0 && (
        <section>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div><SectionHeader title="Estoque do evento" /><p className="mt-1 text-xs txt-tertiary">Registre a oferta física antes de definir valores em Kesef.</p></div>
            <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
              <select aria-label="Evento do estoque" className="input-theme min-h-11 min-w-0 w-full rounded-xl px-3 text-sm sm:w-auto" value={selectedEventId} onChange={event => setSelectedEventId(event.target.value)}>{events.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}</select>
              <Button type="button" className="w-full sm:w-auto" onClick={() => setShowStockForm(value => !value)}><PackagePlus size={17} /> Registrar lote</Button>
            </div>
          </div>

          {showStockForm && (
            <Card className="mt-4 p-5">
              <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitStock}>
                <Field label="Produto"><input className="input-theme min-h-11 w-full rounded-xl px-3" value={stockForm.produtoNome} onChange={e => setStockForm({ ...stockForm, produtoNome: e.target.value })} placeholder="Caldo verde" /></Field>
                <Field label="Quantidade total"><input type="number" min="1" className="input-theme min-h-11 w-full rounded-xl px-3" value={stockForm.quantidade} onChange={e => setStockForm({ ...stockForm, quantidade: Number(e.target.value), quantidadeReservavel: Math.min(stockForm.quantidadeReservavel, Number(e.target.value)) })} /></Field>
                <Field label="Valor em Kesef neste evento"><input type="number" min="1" className="input-theme min-h-11 w-full rounded-xl px-3" value={stockForm.valorKesef} onChange={e => setStockForm({ ...stockForm, valorKesef: Number(e.target.value) })} /></Field>
                <Field label="Limite por membro"><input type="number" min="1" max="20" className="input-theme min-h-11 w-full rounded-xl px-3" value={stockForm.limitePorMembro} onChange={e => setStockForm({ ...stockForm, limitePorMembro: Number(e.target.value) })} /></Field>
                <Field label="Quantidade para reserva antecipada"><input type="number" min="0" max={stockForm.quantidade} className="input-theme min-h-11 w-full rounded-xl px-3" value={stockForm.quantidadeReservavel} onChange={e => setStockForm({ ...stockForm, quantidadeReservavel: Number(e.target.value) })} /></Field>
                <Field label="Unidade"><select className="input-theme min-h-11 w-full rounded-xl px-3" value={stockForm.unidade} onChange={e => setStockForm({ ...stockForm, unidade: e.target.value })}><option value="unidade">Unidade</option><option value="porcao">Porção</option><option value="fatia">Fatia</option><option value="copo">Copo</option><option value="kit">Kit</option><option value="outro">Outro</option></select></Field>
                <Field label="Origem"><select className="input-theme min-h-11 w-full rounded-xl px-3" value={stockForm.origem} onChange={e => setStockForm({ ...stockForm, origem: e.target.value })}><option value="contribuicao_pessoal">Contribuição pessoal</option><option value="doacao">Doação</option><option value="compra_comunitaria">Compra comunitária</option><option value="despesa_autorizada">Despesa autorizada</option><option value="outra">Outra</option></select></Field>
                <Field label="Descrição"><input className="input-theme min-h-11 w-full rounded-xl px-3" value={stockForm.descricao} onChange={e => setStockForm({ ...stockForm, descricao: e.target.value })} /></Field>
                <Field label="Imagem do anúncio"><input type="file" accept="image/jpeg,image/png,image/webp" className="input-theme min-h-11 w-full rounded-xl p-2 text-xs" onChange={e => setStockImage(e.target.files?.[0] ?? null)} /></Field>
                <Field label="Alergênicos (separados por vírgula)"><input className="input-theme min-h-11 w-full rounded-xl px-3" value={stockForm.alergenicos} onChange={e => setStockForm({ ...stockForm, alergenicos: e.target.value })} placeholder="leite, glúten" /></Field>
                <Field label="Validade"><input type="datetime-local" className="input-theme min-h-11 w-full rounded-xl px-3" value={stockForm.validadeEm} onChange={e => setStockForm({ ...stockForm, validadeEm: e.target.value })} /></Field>
                <Field label="Conservação"><input className="input-theme min-h-11 w-full rounded-xl px-3" value={stockForm.conservacao} onChange={e => setStockForm({ ...stockForm, conservacao: e.target.value })} placeholder="Manter aquecido" /></Field>
                <Field label="Observação privada"><input className="input-theme min-h-11 w-full rounded-xl px-3" value={stockForm.observacaoPrivada} onChange={e => setStockForm({ ...stockForm, observacaoPrivada: e.target.value })} /></Field>
                <div className="flex items-end justify-end gap-2 sm:col-span-2"><Button type="button" variant="ghost" onClick={() => setShowStockForm(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Registrando…' : 'Registrar em rascunho'}</Button></div>
              </form>
            </Card>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {!stockLoading && stock.length === 0 && <div className="sm:col-span-2"><EmptyState Icon={PackagePlus} title="Estoque ainda vazio" description="Registre as contribuições confirmadas para medir a oferta do evento." /></div>}
            {stock.map(item => <Card key={item.lote_id} className="overflow-hidden"><div className="flex gap-4 p-4">{item.imagem_url ? <img src={item.imagem_url} alt="" className="size-20 shrink-0 rounded-xl bg-[var(--surface-elevated)] object-contain" /> : <span className="grid size-20 shrink-0 place-items-center rounded-xl bg-[var(--surface-elevated)]"><Store size={24} className="txt-muted" /></span>}<div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold txt-primary">{item.produto_nome}</h3><p className="mt-1 text-xs txt-tertiary">{item.descricao || `${item.origem?.replace(/_/g, ' ')} · ${item.unidade}`}</p></div><span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-bold txt-green">{item.quantidade_disponivel}/{item.quantidade_recebida}</span></div>{item.alergenicos.length > 0 && <p className="mt-3 text-xs text-[var(--celebration)]">Alergênicos: {item.alergenicos.join(', ')}</p>}</div></div><div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3 text-xs txt-muted"><span>Anúncio: {item.anuncio_status}</span><strong className="text-[var(--celebration)]"><KesefAmount value={item.valor_kesef} /></strong></div></Card>)}
          </div>
        </section>
      )}

      {(can('canteen.checkout.operate') || can('canteen.redemptions.read')) && events.length > 0 && (
        <section>
          {can('canteen.checkout.operate') && <div className="mb-6"><CantinaOperatorPos stock={stock} cart={cart} processing={saving} onChange={(announcementId, quantity) => setCart(value => ({ ...value, [announcementId]: quantity }))} onCreate={openImmediateRedemption} /></div>}
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div><SectionHeader title="Caixa e retiradas" /><p className="mt-1 text-xs txt-tertiary">Localize pelo código do QR, nome ou usuário. A confirmação só funciona na janela presencial.</p></div>
            <div className="relative w-full sm:w-auto"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 txt-muted" /><input value={pickupSearch} onChange={event => setPickupSearch(event.target.value)} className="input-theme min-h-11 w-full min-w-0 rounded-xl pl-9 pr-3 text-sm" placeholder="Código, nome ou usuário" /></div>
          </div>
          <div className="mt-4 space-y-3">
            {pickups.filter(item => [item.codigo_retirada, item.membro_nome, item.membro_username, item.produto_nome].some(value => value?.toLocaleLowerCase('pt-BR').includes(pickupSearch.trim().toLocaleLowerCase('pt-BR')))).map(item => (
              <Card key={item.reserva_id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div><div className="flex items-center gap-2"><strong className="font-mono text-lg tracking-[0.12em] text-[var(--celebration)]">{item.codigo_retirada}</strong><span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] txt-secondary">{item.status}</span></div><h3 className="mt-1 font-semibold txt-primary">{item.quantidade}× {item.produto_nome}</h3><p className="mt-1 flex flex-wrap items-center gap-1 text-xs txt-tertiary"><span>{item.membro_nome}{item.membro_username ? ` · @${item.membro_username}` : ''} ·</span><KesefAmount value={item.kesef_aprovisionado} /></p></div>
                {item.status === 'reservada' && can('canteen.checkout.operate') && <div className="flex flex-wrap gap-2"><Button type="button" disabled={Boolean(processingPickup)} onClick={() => confirmPickup(item)}><CheckCircle2 size={16} />{processingPickup === item.reserva_id ? 'Processando…' : 'Confirmar retirada'}</Button><Button type="button" variant="danger" disabled={Boolean(processingPickup)} onClick={() => markNoShow(item)}>Não compareceu</Button></div>}
              </Card>
            ))}
            {pickups.length === 0 && <EmptyState Icon={Store} title="Nenhuma reserva para retirada" description="As reservas confirmadas aparecerão aqui durante a preparação do evento." />}
          </div>
        </section>
      )}

      {can('canteen.reports.read') && (
        <section>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><SectionHeader title="Relatório de resgates" /><p className="mt-1 text-xs txt-tertiary">Horários exibidos no fuso de São Paulo. Um resgate com vários produtos aparece em várias linhas.</p></div><Button type="button" variant="secondary" onClick={exportReport} disabled={reportFiltered.length === 0}><Download size={16} /> Exportar CSV</Button></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3"><Metric label="Resgates concluídos" value={number.format(reportRedemptions)} detail="Operações únicas" Icon={CheckCircle2} /><Metric label="Produtos resgatados" value={number.format(reportProducts)} detail="Soma das quantidades" Icon={FileSpreadsheet} /><Metric label="Kesef utilizado" value={<KesefAmount value={number.format(reportKesef)} />} detail="Total dos itens" Icon={Coins} /></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]"><div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 txt-muted" /><input value={reportSearch} onChange={event => setReportSearch(event.target.value)} className="input-theme min-h-11 w-full rounded-xl pl-9 pr-3 text-sm" placeholder="Buscar usuário, produto, operador ou representante" /></div><select value={reportOrigin} onChange={event => setReportOrigin(event.target.value)} className="input-theme min-h-11 rounded-xl px-3 text-sm"><option value="todos">Todos os fluxos</option><option value="imediato">Resgate imediato</option><option value="reserva">Reserva retirada/doada</option></select></div>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--border)]"><table className="min-w-[880px] w-full text-left text-xs"><thead className="bg-[var(--surface-elevated)] txt-secondary"><tr><th className="p-3">Data e hora</th><th className="p-3">Usuário</th><th className="p-3">Produto</th><th className="p-3 text-center">Qtd.</th><th className="p-3 text-right">Kesef</th><th className="p-3">Origem</th><th className="p-3">Operador</th></tr></thead><tbody>{reportFiltered.map(row => <tr key={`${row.origem}-${row.registro_id}-${row.produto_nome}`} className="border-t border-[var(--border)]"><td className="p-3 whitespace-nowrap txt-tertiary">{new Date(row.realizado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td><td className="p-3"><strong className="block txt-primary">{row.usuario_nome || '—'}</strong>{row.usuario_username && <span className="txt-muted">@{row.usuario_username}</span>}</td><td className="p-3 txt-primary">{row.produto_nome}</td><td className="p-3 text-center font-bold txt-primary">{row.quantidade}</td><td className="p-3 text-right font-bold text-[var(--celebration)]">{row.total_kesef} K</td><td className="p-3 txt-tertiary">{row.origem === 'imediato' ? 'Imediato' : row.status === 'doada' ? 'Reserva doada' : 'Reserva'}</td><td className="p-3 txt-tertiary">{row.operador_nome || '—'}{row.representante_nome && <span className="block txt-muted">Retirado por {row.representante_nome}</span>}</td></tr>)}</tbody></table>{reportFiltered.length === 0 && <div className="p-8 text-center text-sm txt-muted">Nenhum resgate encontrado para estes filtros.</div>}</div>
        </section>
      )}
      {checkout && <CantinaOperatorCheckoutSheet checkout={checkout} onCancel={closeCheckout} />}
    </div>
  );
}

function Metric({ label, value, detail, Icon }: { label: string; value: ReactNode; detail: string; Icon: typeof Coins }) {
  return <Card className="p-4"><span className="grid size-9 place-items-center rounded-xl bg-[var(--accent-soft)]"><Icon size={17} className="txt-green" /></span><p className="mt-4 text-2xl font-bold tabular-nums txt-primary">{value}</p><h3 className="mt-1 text-sm font-semibold txt-primary">{label}</h3><p className="mt-1 text-xs txt-muted">{detail}</p></Card>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="space-y-1.5 text-xs font-semibold txt-secondary"><span>{label}</span>{children}</label>;
}
