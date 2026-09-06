import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NotificationActivityCard from './NotificationActivityCard';
import {
  contarNotificacoesNaoLidas,
  listarNotificacoes,
  marcarNotificacaoComoLida,
  marcarTodasNotificacoesComoLidas,
  subscribeToAppNotifications,
  type AppNotification,
} from '../services/notificationService';
import { obterDestinoNotificacao } from '../services/notificationRouting';
import {
  deduplicarNotificacoes,
  mesclarNotificacaoUnica,
  obterIdentificadoresNotificacao,
  ordenarNotificacoesMaisRecentes,
} from '../services/notificationDeduplication';
import { getCurrentUserId } from '../services/dataService';
import {
  atividadePertenceAoFiltro,
  type AcaoAtividade,
  type FiltroAtividade,
} from '../services/notificationActivity';
import { calcularLayoutPainelNotificacoes } from '../services/notificationPanelLayout';

const FILTROS: Array<{ valor: FiltroAtividade; label: string }> = [
  { valor: 'todas', label: 'Todas' },
  { valor: 'oracoes', label: 'Orações' },
  { valor: 'mural', label: 'Mural' },
  { valor: 'ebd', label: 'EBD' },
];

function formatarTempo(data: string): string {
  const timestamp = new Date(data).getTime();
  if (Number.isNaN(timestamp)) return '';
  const minutos = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(timestamp));
}

export default function NotificationCenterButton() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const identificadoresConhecidosRef = useRef<Set<string>>(new Set());

  const [aberto, setAberto] = useState(false);
  const [notificacoes, setNotificacoes] = useState<AppNotification[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [filtro, setFiltro] = useState<FiltroAtividade>('todas');
  const [acaoProcessando, setAcaoProcessando] = useState<{ notificacaoId: string; acao: AcaoAtividade } | null>(null);
  const [painelLayout, setPainelLayout] = useState({ left: 8, top: 72, width: 344, maxHeight: 448 });

  const notificacoesFiltradas = useMemo(
    () => notificacoes.filter(notificacao => atividadePertenceAoFiltro(notificacao, filtro)),
    [notificacoes, filtro],
  );

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [lista, total] = await Promise.all([listarNotificacoes(), contarNotificacoesNaoLidas()]);
      const listaUnica = ordenarNotificacoesMaisRecentes(deduplicarNotificacoes(lista));
      setNotificacoes(atual => {
        const combinadas = ordenarNotificacoesMaisRecentes(
          deduplicarNotificacoes([...listaUnica, ...atual]),
        ).slice(0, 30);
        identificadoresConhecidosRef.current = new Set(combinadas.flatMap(obterIdentificadoresNotificacao));
        return combinadas;
      });
      setNaoLidas(atual => Math.max(atual, total));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar().catch(() => undefined);
    let ativo = true;
    let cancelar: (() => void) | undefined;

    void getCurrentUserId()
      .then(userId => {
        if (!ativo) return;
        cancelar = subscribeToAppNotifications(userId, notificacao => {
          if (notificacao.tipo === 'nova_mensagem') return;
          const identificadores = obterIdentificadoresNotificacao(notificacao);
          if (identificadores.some(id => identificadoresConhecidosRef.current.has(id))) return;
          identificadores.forEach(id => identificadoresConhecidosRef.current.add(id));
          setNotificacoes(atual => mesclarNotificacaoUnica(atual, notificacao).notificacoes);
          if (!notificacao.lida) setNaoLidas(total => total + 1);
        });
      })
      .catch(() => undefined);

    return () => {
      ativo = false;
      cancelar?.();
    };
  }, [carregar]);

  useLayoutEffect(() => {
    if (!aberto) return;

    const atualizarLayout = () => {
      const botao = buttonRef.current;
      if (!botao) return;
      const rect = botao.getBoundingClientRect();
      const visualViewport = window.visualViewport;
      setPainelLayout(calcularLayoutPainelNotificacoes(rect, {
        width: visualViewport?.width ?? window.innerWidth,
        height: visualViewport?.height ?? window.innerHeight,
        offsetLeft: visualViewport?.offsetLeft ?? 0,
        offsetTop: visualViewport?.offsetTop ?? 0,
      }));
    };

    atualizarLayout();
    window.addEventListener('resize', atualizarLayout);
    window.addEventListener('orientationchange', atualizarLayout);
    window.addEventListener('scroll', atualizarLayout, true);
    window.visualViewport?.addEventListener('resize', atualizarLayout);
    window.visualViewport?.addEventListener('scroll', atualizarLayout);

    return () => {
      window.removeEventListener('resize', atualizarLayout);
      window.removeEventListener('orientationchange', atualizarLayout);
      window.removeEventListener('scroll', atualizarLayout, true);
      window.visualViewport?.removeEventListener('resize', atualizarLayout);
      window.visualViewport?.removeEventListener('scroll', atualizarLayout);
    };
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const fecharAoClicarFora = (event: PointerEvent) => {
      const alvo = event.target as Node;
      if (containerRef.current?.contains(alvo) || panelRef.current?.contains(alvo)) return;
      setAberto(false);
    };
    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAberto(false);
    };
    document.addEventListener('pointerdown', fecharAoClicarFora);
    document.addEventListener('keydown', fecharComEscape);
    return () => {
      document.removeEventListener('pointerdown', fecharAoClicarFora);
      document.removeEventListener('keydown', fecharComEscape);
    };
  }, [aberto]);

  const marcarLidaLocalmente = async (notificacao: AppNotification) => {
    if (notificacao.lida) return;
    await marcarNotificacaoComoLida(notificacao.id).catch(() => undefined);
    setNotificacoes(atual => atual.map(item => item.id === notificacao.id ? { ...item, lida: true } : item));
    setNaoLidas(total => Math.max(0, total - 1));
  };

  const abrirNotificacao = async (notificacao: AppNotification) => {
    await marcarLidaLocalmente(notificacao);
    setAberto(false);
    navigate(obterDestinoNotificacao(notificacao));
  };

  const executarAcao = async (notificacao: AppNotification, acao: AcaoAtividade) => {
    if (acaoProcessando) return;
    setAcaoProcessando({ notificacaoId: notificacao.id, acao });
    try {
      await abrirNotificacao(notificacao);
    } finally {
      setAcaoProcessando(null);
    }
  };

  const marcarTodas = async () => {
    await marcarTodasNotificacoesComoLidas();
    setNotificacoes(atual => atual.map(item => ({ ...item, lida: true })));
    setNaoLidas(0);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setAberto(valor => !valor)}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        aria-label={naoLidas > 0 ? `${naoLidas} atividades não lidas` : 'Abrir atividades'}
        className="relative flex size-9 items-center justify-center rounded-lg hover:bg-[var(--surface-elevated)]"
      >
        <Bell size={17} className="txt-secondary" />
        {naoLidas > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-solid)] px-1 text-[9px] font-bold text-white shadow-[0_0_8px_var(--accent-solid)] animate-pulse">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && createPortal(
        <section
          ref={panelRef}
          role="dialog"
          aria-label="Central de atividades"
          className="fixed z-[120] flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
          style={{ left: painelLayout.left, top: painelLayout.top, width: painelLayout.width, maxHeight: painelLayout.maxHeight }}
        >
          <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <div>
              <h2 className="text-sm font-bold txt-primary">Atividades</h2>
              <p className="text-[11px] txt-tertiary">{naoLidas} não lida(s)</p>
            </div>
            {naoLidas > 0 && (
              <button type="button" onClick={() => void marcarTodas()} className="flex items-center gap-1 text-[11px] font-semibold txt-green">
                <CheckCheck size={14} /> Marcar todas
              </button>
            )}
          </header>

          <nav aria-label="Filtros de atividades" className="flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--border)] px-3 py-2">
            {FILTROS.map(item => {
              const ativo = filtro === item.valor;
              return (
                <button
                  key={item.valor}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setFiltro(item.valor)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold ${ativo ? 'bg-[var(--accent-solid)] text-white' : 'bg-[var(--surface-elevated)] txt-secondary'}`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {carregando && notificacoes.length === 0 ? (
              <p className="p-5 text-center text-sm txt-muted">Carregando...</p>
            ) : notificacoesFiltradas.length === 0 ? (
              <p className="p-5 text-center text-sm txt-muted">Nenhuma atividade nesta categoria.</p>
            ) : (
              notificacoesFiltradas.map(notificacao => (
                <NotificationActivityCard
                  key={notificacao.id}
                  notificacao={notificacao}
                  tempo={formatarTempo(notificacao.criada_em)}
                  acaoProcessando={acaoProcessando?.notificacaoId === notificacao.id ? acaoProcessando.acao : null}
                  onAbrir={abrirNotificacao}
                  onAcao={executarAcao}
                />
              ))
            )}
          </div>
        </section>,
        document.body,
      )}
    </div>
  );
}
