import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shuffle, Users, ShieldCheck, AlertCircle, Lock, MessageCircle, Edit3, Trash2, X, Check, RefreshCw, Search } from 'lucide-react';
import { logoutAdmin } from '../services/adminAuth';
import { atualizarParticipacaoSorteio, executarSorteioCirculo } from '../services/adminService';
import { getAllPedidos, updatePedido, deletePedido, getMetricasEngajamento } from '../services/dataService';
import { ROUTES } from '../services/constants';
import EngajamentoCard from '../components/EngajamentoCard';
import type { AdminMessage, PedidoAdmin, EngajamentoJovem } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useAdmin } from '../contexts/AdminContext';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import SealIcon from '../components/ui/SealIcon';
import { getTipoPublicacaoMeta, TIPOS_PUBLICACAO_MURAL } from '../services/muralSocial';
import { AdminPageHeader } from '../components/admin/AdminPage';
import PrayerDrawTelemetry from '../components/admin/PrayerDrawTelemetry';

export default function Admin() {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<AdminMessage | null>(null);
  const [jovens, setJovens] = useState<EngajamentoJovem[]>([]);
  const [loadingJovens, setLoadingJovens] = useState(true);
  const [filtroSemafaro, setFiltroSemafaro] = useState<string>('todos');
  const [buscaNome, setBuscaNome] = useState('');
  const [operatingId, setOperatingId] = useState<string | null>(null);
  const [pedidos, setPedidos] = useState<PedidoAdmin[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTexto, setEditTexto] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [buscaSorteio, setBuscaSorteio] = useState('');
  const [updatingSorteioId, setUpdatingSorteioId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'operacao' | 'telemetria'>('operacao');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAdmin();
  const canRunDraw = can('prayer.draw');
  const canManagePrayer = can('prayer.manage');
  const canSeePastoralMetrics = can('people.sensitive');

  useEffect(() => {
    setActiveTab(searchParams.get('aba') === 'telemetria' ? 'telemetria' : 'operacao');
  }, [searchParams]);

  const changeTab = (tab: 'operacao' | 'telemetria') => {
    setActiveTab(tab);
    setSearchParams(tab === 'telemetria' ? { aba: 'telemetria' } : {});
  };

  const carregarPedidos = useCallback(async () => {
    setLoadingPedidos(true);
    try {
      const data = await getAllPedidos();
      setPedidos(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar pedidos');
    } finally {
      setLoadingPedidos(false);
    }
  }, [toast]);

  const carregarMetricas = useCallback(async () => {
    setLoadingJovens(true);
    try {
      const data = await getMetricasEngajamento();
      setJovens(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar métricas');
    } finally {
      setLoadingJovens(false);
    }
  }, [toast]);

  useEffect(() => {
    const autorizado = can('prayer.read');
    setIsAuth(autorizado);
    setChecking(false);
    if (autorizado) {
      document.title = 'Oração e supervisão — Comunhão';
      void carregarPedidos();
      void carregarMetricas();
    }
  }, [can, carregarPedidos, carregarMetricas]);

  const filteredJovens = jovens.filter(j => {
    if (filtroSemafaro !== 'todos' && j.semafaro !== filtroSemafaro) return false;
    if (buscaNome && !j.nome.toLowerCase().includes(buscaNome.toLowerCase())) return false;
    return true;
  });

  const resumo = {
    total: jovens.length,
    verde: jovens.filter(j => j.semafaro === 'verde').length,
    amarelo: jovens.filter(j => j.semafaro === 'amarelo').length,
    vermelho: jovens.filter(j => j.semafaro === 'vermelho').length,
  };
  const totalElegiveisSorteio = jovens.filter(j => j.participa_sorteio).length;

  const handleLogout = async (): Promise<void> => {
    await logoutAdmin();
    navigate(ROUTES.LOGIN);
  };

  if (checking) {
    return (
      <div className="p-6 min-h-full flex items-center justify-center relative z-10">
        <div className="w-8 h-8 border-2 border-green-subtle border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuth) {
    return (
      <div className="p-6 min-h-full flex items-center justify-center relative z-10">
        <div className="glass rounded-[2rem] p-8 w-full max-w-sm shadow-2xl relative overflow-hidden card-3d">
          <div className="glass-shine"></div>
          <div className="flex flex-col items-center mb-6">
            <div className="p-3 bg-surface rounded-2xl border border-subtle mb-4">
              <Lock size={28} className="text-rose-400" />
            </div>
            <h2 className="text-xl font-bold txt-primary">Acesso Restrito</h2>
            <p className="text-sm txt-tertiary mt-1 text-center">
              Apenas professores podem acessar o painel.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => navigate(ROUTES.HOME)}
            variant="ghost"
            className="w-full"
          >
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  const iniciarEdicao = (pedido: PedidoAdmin) => {
    setEditingId(pedido.id);
    setEditTexto(pedido.texto);
  };

  const cancelarEdicao = () => {
    setEditingId(null);
    setEditTexto('');
  };

  const salvarEdicao = async (pedidoId: string) => {
    if (!editTexto.trim() || operatingId) return;
    setOperatingId(pedidoId);
    try {
      await updatePedido(pedidoId, { texto: editTexto.trim() });
      setMessage({ type: 'success', text: 'Pedido atualizado com sucesso.' });
      cancelarEdicao();
      carregarPedidos();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar pedido');
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao atualizar pedido.' });
    } finally {
      setOperatingId(null);
    }
  };

  const confirmarExclusao = async (pedidoId: string) => {
    if (operatingId) return;
    setOperatingId(pedidoId);
    try {
      await deletePedido(pedidoId);
      setMessage({ type: 'success', text: 'Pedido removido com sucesso.' });
      setDeletingId(null);
      carregarPedidos();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover pedido');
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao remover pedido.' });
    } finally {
      setOperatingId(null);
    }
  };

  const alternarTipo = async (pedido: PedidoAdmin) => {
    if (operatingId) return;
    setOperatingId(pedido.id);
    const currentIndex = TIPOS_PUBLICACAO_MURAL.findIndex(item => item.id === pedido.tipo);
    const novoTipo = TIPOS_PUBLICACAO_MURAL[(currentIndex + 1) % TIPOS_PUBLICACAO_MURAL.length].id;
    try {
      await updatePedido(pedido.id, { tipo: novoTipo });
      setMessage({ type: 'success', text: `Publicação alterada para "${getTipoPublicacaoMeta(novoTipo).label}".` });
      carregarPedidos();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao alterar tipo');
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao alterar tipo.' });
    } finally {
      setOperatingId(null);
    }
  };

  const executarSorteio = async (): Promise<void> => {
    setLoading(true);
    setMessage(null);

    try {
      const result = await executarSorteioCirculo();
      const notifMsg = result.notificacoes.sucessos > 0
        ? ` ${result.notificacoes.sucessos} notificações enviadas.`
        : result.notificacoes.total === 0
          ? ' Nenhum parceiro para notificar.'
          : ` ${result.notificacoes.falhas} falha(s) de ${result.notificacoes.total} notificações.`;
      setMessage({ type: 'success', text: `Círculo de Oração atualizado! ${result.participantes} jovens ativos conectados.${notifMsg}` });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro no sorteio');
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro desconhecido' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full space-y-5 relative z-10">
      <AdminPageHeader eyebrow="Comunhão em oração" title="Círculo de Oração" description="Organize o sorteio semanal, participantes elegíveis e pedidos da comunidade." actions={<Button onClick={handleLogout} variant="ghost" className="text-xs">Sair</Button>} />

      <nav className="sanctuary-nav grid grid-cols-2 p-1" aria-label="Seções de oração e sorteio">
        <button type="button" onClick={() => changeTab('operacao')} className={`sanctuary-tab px-3 text-xs font-semibold transition-premium ${activeTab === 'operacao' ? 'sanctuary-tab--active txt-primary' : 'txt-tertiary hover:txt-primary'}`}>Operação</button>
        <button type="button" onClick={() => changeTab('telemetria')} className={`sanctuary-tab px-3 text-xs font-semibold transition-premium ${activeTab === 'telemetria' ? 'sanctuary-tab--active txt-primary' : 'txt-tertiary hover:txt-primary'}`}>Telemetria assistencial</button>
      </nav>

      {activeTab === 'telemetria' ? <PrayerDrawTelemetry /> : <>

      <section className="card-surface acento-lateral elevation-1 p-5" style={{ '--cor-acento': 'var(--green-mid)' } as React.CSSProperties}>
        <div className="flex items-center gap-3 mb-5">
          <SealIcon Icon={Shuffle} size="md" active />
          <div>
            <h2 className="font-display text-base txt-primary">Sorteio do Círculo</h2>
            <p className="text-xs txt-tertiary">Gerar novas duplas de oração</p>
          </div>
        </div>

        <p className="mb-4 text-xs txt-tertiary">
          O sorteio inclui exatamente as pessoas marcadas abaixo. Nenhum critério de atividade ou acesso substitui essa seleção.
        </p>

        {canRunDraw ? (
          <Button
            onClick={executarSorteio}
            disabled={loading}
            className="w-full min-h-14 text-base"
          >
            {loading ? "Processando..." : "Sorteio da Semana"}
          </Button>
        ) : (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
            Seu papel permite acompanhar o sorteio, mas não executá-lo.
          </div>
        )}

        <p className="mt-3 text-xs txt-muted">
          Selecionados para este sorteio: {totalElegiveisSorteio}
        </p>

        {message && (
          <div className={`mt-4 p-4 rounded-xl flex items-start gap-3 text-sm ${
            message.type === 'success' ? 'bg-[var(--accent-soft)] txt-green border border-green-subtle' : 'bg-rose-500/10 txt-rose border border-rose-500/20'
          }`}>
            {message.type === 'success' ? <ShieldCheck size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
            <span className="font-medium">{message.text}</span>
          </div>
        )}
      </section>

      {canManagePrayer && (
      <section className="card-surface elevation-1 p-5 mb-5">
        <div className="flex items-center gap-3 mb-4">
          <Users size={20} className="txt-green" />
          <div>
            <h3 className="font-display text-sm txt-primary">Elegibilidade do Sorteio</h3>
            <p className="text-xs txt-tertiary">Marque os membros aptos para o próximo sorteio.</p>
          </div>
        </div>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 txt-tertiary" />
          <input
            className="w-full input-theme rounded-xl py-3.5 pl-10 pr-4 text-sm outline-none"
            placeholder="Buscar por nome..."
            value={buscaSorteio}
            onChange={e => setBuscaSorteio(e.target.value)}
          />
        </div>

        {jovens.length === 0 ? (
          <p className="text-sm txt-muted text-center py-6">Nenhum jovem encontrado.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {jovens
              .filter(j => !buscaSorteio || j.nome.toLowerCase().includes(buscaSorteio.toLowerCase()))
              .map(jovem => {
                const checked = Boolean(jovem.participa_sorteio);
                const disabled = updatingSorteioId === jovem.id;
                const papelLabel = jovem.papel === 'admin'
                  ? 'Admin'
                  : jovem.papel === 'mod'
                    ? 'Guardião'
                    : 'Membro';

                return (
                  <label
                    key={jovem.id}
                    className="flex min-h-[56px] items-center justify-between gap-3 rounded-xl border border-subtle bg-surface p-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold txt-primary">{jovem.nome}</span>
                      <span className="text-[11px] txt-muted">
                        {papelLabel} · {checked ? 'participará do próximo sorteio' : 'não selecionado(a)'}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      aria-label={`Definir ${jovem.nome} como elegível para sorteio`}
                      className="size-5 rounded border border-[var(--border-strong)] accent-[var(--accent-primary)]"
                      onChange={async event => {
                        const proximoValor = event.target.checked;
                        setUpdatingSorteioId(jovem.id);
                        setJovens(atual => atual.map(item => item.id === jovem.id ? { ...item, participa_sorteio: proximoValor } : item));
                        try {
                          await atualizarParticipacaoSorteio(jovem.id, proximoValor);
                          toast.success(proximoValor ? `${jovem.nome} marcado(a) para o sorteio` : `${jovem.nome} removido(a) do sorteio`);
                        } catch (error) {
                          setJovens(atual => atual.map(item => item.id === jovem.id ? { ...item, participa_sorteio: !proximoValor } : item));
                          toast.error(error instanceof Error ? error.message : 'Erro ao atualizar elegibilidade');
                        } finally {
                          setUpdatingSorteioId(null);
                        }
                      }}
                    />
                  </label>
                );
              })}
          </div>
        )}
      </section>
      )}

      {canSeePastoralMetrics && (
      <section className="card-surface acento-lateral elevation-1 p-5 mb-5" style={{ '--cor-acento': 'var(--amber-mid)' } as React.CSSProperties}>
        <div className="flex items-center gap-3 mb-4">
          <Users size={20} className="txt-amber" />
          <h3 className="font-display text-sm txt-primary">Gestão Pastoral</h3>
        </div>

        {/* Resumo */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 bg-surface border border-subtle rounded-xl py-3 text-center">
            <span className="block txt-green font-bold text-lg">{resumo.verde}</span>
            <span className="txt-muted text-xs">Ativos</span>
          </div>
          <div className="flex-1 bg-surface border border-subtle rounded-xl py-3 text-center">
            <span className="block txt-amber font-bold text-lg">{resumo.amarelo}</span>
            <span className="txt-muted text-xs">Atenção</span>
          </div>
          <div className="flex-1 bg-surface border border-subtle rounded-xl py-3 text-center">
            <span className="block txt-rose font-bold text-lg">{resumo.vermelho}</span>
            <span className="txt-muted text-xs">Afastados</span>
          </div>
        </div>

        {resumo.total > 0 && (
          <p className="txt-muted text-xs mb-4">
            {Math.round((resumo.verde / resumo.total) * 100)}% engajados esta semana
          </p>
        )}

        {/* Filtros */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {['todos', 'verde', 'amarelo', 'vermelho'].map(f => (
            <Button
              key={f}
              onClick={() => setFiltroSemafaro(f)}
              variant={filtroSemafaro === f ? 'secondary' : 'ghost'}
              className="text-xs capitalize"
            >
              {f === 'todos' ? 'Todos' : f}
            </Button>
          ))}
        </div>

        <div className="relative mb-3">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 txt-muted" />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={buscaNome}
            onChange={e => setBuscaNome(e.target.value)}
            className="w-full input-theme rounded-xl py-3.5 pl-10 pr-4 text-sm outline-none"
          />
        </div>

        {/* Grid */}
        {loadingJovens ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-7 h-7 border-2 border-green-subtle border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredJovens.length === 0 ? (
          <p className="txt-muted text-xs text-center py-6">Nenhum jovem encontrado.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
            {filteredJovens.map(j => (
              <EngajamentoCard key={j.id} jovem={j} />
            ))}
          </div>
        )}
      </section>
      )}

      {/* Moderação do Mural */}
      <section className="card-surface acento-lateral elevation-1 p-5" style={{ '--cor-acento': 'var(--amber-mid)' } as React.CSSProperties}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <SealIcon Icon={MessageCircle} size="md" className="txt-amber" />
            <div>
              <h2 className="font-display text-base txt-primary">Moderar Mural</h2>
              <p className="text-xs txt-tertiary">Editar ou remover postagens</p>
            </div>
          </div>
          <IconButton
            onClick={carregarPedidos}
            disabled={loadingPedidos}
            label="Atualizar pedidos"
          >
            <RefreshCw size={18} className={loadingPedidos ? 'animate-spin' : ''} />
          </IconButton>
        </div>

        {loadingPedidos ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-7 h-7 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : pedidos.length === 0 ? (
          <p className="text-sm txt-muted text-center py-6">Nenhum pedido no mural.</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {pedidos.map(pedido => (
              <div
                key={pedido.id}
                className={`rounded-xl p-4 border transition ${
                  pedido.tipo === 'testemunho'
                    ? 'bg-amber-500/10 border-amber-500/15'
                    : 'bg-surface border-subtle'
                }`}
              >
                {editingId === pedido.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={editTexto}
                      onChange={e => setEditTexto(e.target.value)}
                      className="w-full input-theme rounded-xl p-3 text-sm outline-none transition resize-none h-20"
                    />
                    <div className="flex justify-end gap-2">
                      <IconButton onClick={cancelarEdicao} label="Cancelar edição">
                        <X size={18} />
                      </IconButton>
                      <IconButton onClick={() => salvarEdicao(pedido.id)} disabled={!editTexto.trim() || operatingId === pedido.id} label="Salvar edição" className="!text-[var(--accent-primary)]">
                        <Check size={18} />
                      </IconButton>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-semibold txt-primary truncate">{pedido.autor}</span>
                        <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] txt-secondary">
                          {getTipoPublicacaoMeta(pedido.tipo).emoji} {getTipoPublicacaoMeta(pedido.tipo).shortLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                          <IconButton
                            onClick={() => alternarTipo(pedido)}
                            disabled={operatingId === pedido.id}
                            label="Alternar tipo"
                            className="!text-[var(--celebration)]"
                        >
                          <Edit3 size={16} />
                        </IconButton>
                        <IconButton
                          onClick={() => iniciarEdicao(pedido)}
                          label="Editar texto"
                          className="!text-[var(--accent-primary)]"
                        >
                          <Edit3 size={16} />
                        </IconButton>
                        {deletingId === pedido.id ? (
                          <div className="flex items-center gap-1">
                            <IconButton
                              onClick={() => confirmarExclusao(pedido.id)}
                              disabled={operatingId === pedido.id}
                              label="Confirmar exclusão"
                              className="!text-[var(--danger)]"
                            >
                              <Check size={16} />
                            </IconButton>
                            <IconButton
                              onClick={() => setDeletingId(null)}
                              label="Cancelar exclusão"
                            >
                              <X size={14} />
                            </IconButton>
                          </div>
                        ) : (
                          <IconButton
                            onClick={() => setDeletingId(pedido.id)}
                            label="Excluir pedido"
                            className="!text-[var(--danger)]"
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        )}
                      </div>
                    </div>
                    <p className="text-xs txt-tertiary leading-relaxed">{pedido.texto}</p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] txt-muted">
                      <span className="txt-tertiary">{pedido.contagem_intercessores} intercessão(ões)</span>
                      <span className="txt-muted">{new Date(pedido.criado_em).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
      </>}
    </div>
  );
}
