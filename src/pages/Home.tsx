import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Hand, Award, Heart, LoaderCircle } from 'lucide-react';
import { LamparinaIcon } from '../components/icons/SanctuaryIcons';
import MocidadeGrid from '../components/MocidadeGrid';
import SessaoAbertaModal from '../components/SessaoAbertaModal';
import { getCurrentUserId, getDashboardData, subscribeToDataChanges, toggleUserAvailability } from '../services/dataService';
import { enviarConviteOracao, responderConviteOracao, cancelarConvite, getConvitesPendentes, getConviteEnviadoEmAndamento, subscribeToConvites } from '../services/conviteService';
import { mensagemErroConvite } from '../services/conviteErrors';
import { entrarSessaoGrupo, listarSessoesGrupoAbertas, subscribeToSessaoGrupo } from '../services/oracaoAbertaService';
import { ROUTES } from '../services/constants';
import type { DashboardData } from '../types';
import type { ConviteComRemetente, ConviteOracao } from '../services/conviteService';
import { useToast } from '../contexts/ToastContext';
import SectionHeader from '../components/ui/SectionHeader';
import Button from '../components/ui/Button';
import SealIcon from '../components/ui/SealIcon';
import { deveEncaminharAceiteNovo, obterDestinoConviteAceito, obterModoConviteAceito } from '../services/conviteRouting';
import { getResumablePrayerJourney, type PrayerJourney } from '../services/prayerJourneyService';
import InstitutionalCrest from '../components/InstitutionalCrest';
import { useSpatialSurface } from '../hooks/useSpatialSurface';
import IncomingPrayerCall from '../components/oracao/IncomingPrayerCall';
import PrayerPartnerCard from '../components/home/PrayerPartnerCard';
import LivePrayerRoomCard from '../components/home/LivePrayerRoomCard';
import { getPublishedEditorialLesson } from '../services/ebdEditorialService';
import { getCachedEditorialLesson, cacheEditorialLesson } from '../services/ebdProgressService';
import type { EbdEditorialLesson } from '../types/ebdEditorial';
import { readDashboardCache } from '../services/dashboardCache';
import { useAdmin } from '../contexts/AdminContext';
import ComunhaoEstudosCard from '../components/home/ComunhaoEstudosCard';
import DailyEbdCard from '../components/home/DailyEbdCard';
import HomeJourneySurface from '../components/home/HomeJourneySurface';
import '../styles/home-editorial.css';

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(() => readDashboardCache());
  const [loading, setLoading] = useState(() => readDashboardCache() === null);
  const [criandoSala, setCriandoSala] = useState(false);
  const [confirmandoConviteDupla, setConfirmandoConviteDupla] = useState(false);
  const [convitesPendentes, setConvitesPendentes] = useState<ConviteComRemetente[]>([]);
  const [conviteEnviado, setConviteEnviado] = useState<ConviteOracao | null>(null);
  const [respondendo, setRespondendo] = useState<string | null>(null);
  const [sessoesAbertas, setSessoesAbertas] = useState<Record<string, string>>({});
  const [nomesSessoesAbertas, setNomesSessoesAbertas] = useState<Record<string, string>>({});
  const [sessaoAtiva, setSessaoAtiva] = useState<{ sessaoId: string; anfitriaoId: string } | null>(null);
  const [entrandoSessaoId, setEntrandoSessaoId] = useState<string | null>(null);
  const [jornadaRetomavel, setJornadaRetomavel] = useState<PrayerJourney | null>(null);
  const [editorialLesson, setEditorialLesson] = useState<EbdEditorialLesson | null>(() => getCachedEditorialLesson());

  const ultimoDestinoConviteRef = useRef<string | null>(null);
  const statusConviteEnviadoRef = useRef<ConviteOracao['status'] | null>(null);
  const conviteDialogRef = useRef<HTMLElement | null>(null);
  const conviteTriggerRef = useRef<HTMLElement | null>(null);
  const conviteDialogWasOpenRef = useRef(false);
  const homeSpatialRef = useSpatialSurface<HTMLDivElement>({ maxTilt: 0, pointerRange: 0 });

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const { can: canAdmin, isAdmin, hasAdminAccess } = useAdmin();
  const hasEstudosAccess = isAdmin || canAdmin('estudos.manage') || canAdmin('estudos.review') || hasAdminAccess;
  const sessaoConviteId = searchParams.get('orar_com');

  useEffect(() => {
    if (!confirmandoConviteDupla) {
      if (conviteDialogWasOpenRef.current) {
        conviteDialogWasOpenRef.current = false;
        const trigger = conviteTriggerRef.current;
        window.requestAnimationFrame(() => trigger?.focus());
      }
      return;
    }

    conviteDialogWasOpenRef.current = true;
    const frame = window.requestAnimationFrame(() => {
      conviteDialogRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [confirmandoConviteDupla]);

  useEffect(() => {
    if (!confirmandoConviteDupla) return;

    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (criandoSala) return;
        event.preventDefault();
        setConfirmandoConviteDupla(false);
        return;
      }

      if (event.key !== 'Tab') return;

      const dialog = conviteDialogRef.current;
      if (!dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(element => !element.hasAttribute('hidden'));

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleDialogKeyDown);
    return () => document.removeEventListener('keydown', handleDialogKeyDown);
  }, [confirmandoConviteDupla, criandoSala]);

  const loadDashboardData = useCallback(async () => {
    try {
      const result = await getDashboardData();
      setData(result);
    } catch (error) {
      if (error instanceof Error && error.message === "USER_NOT_AUTHENTICATED") {
        navigate(ROUTES.LOGIN);
      } else {
        toast.error(error instanceof Error ? error.message : 'Erro ao carregar dados do dashboard');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, toast]);

  useEffect(() => {
    loadDashboardData();
    getResumablePrayerJourney().then(setJornadaRetomavel).catch(() => undefined);
    getPublishedEditorialLesson()
      .then(lesson => {
        setEditorialLesson(lesson);
        if (lesson) cacheEditorialLesson(lesson);
      })
      .catch(() => undefined);
    const unsubData = subscribeToDataChanges(() => loadDashboardData());
    
    const handleAvailabilityChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ disponivel: boolean }>;
      setData(current => current ? {
        ...current,
        usuario: { ...current.usuario, status_anel: customEvent.detail.disponivel ? 'disponivel' : 'offline' },
      } : current);
    };
    window.addEventListener('user-availability-changed', handleAvailabilityChanged);

    return () => { 
      unsubData(); 
      window.removeEventListener('user-availability-changed', handleAvailabilityChanged);
    };
  }, [loadDashboardData]);

  const carregarConvites = useCallback(async (encaminharAceiteNovo = false) => {
    try {
      const [pendentes, enviado] = await Promise.all([
        getConvitesPendentes().catch(() => []),
        getConviteEnviadoEmAndamento().catch(() => null),
      ]);
      setConvitesPendentes(pendentes);
      const destino = enviado ? obterDestinoConviteAceito(enviado) : null;
      const deveEncaminhar = deveEncaminharAceiteNovo(
        statusConviteEnviadoRef.current,
        enviado?.status ?? null,
        encaminharAceiteNovo,
      );
      const conviteJaEncaminhado = enviado ? window.sessionStorage.getItem('comunhao:convite-encaminhado') === enviado.id : false;
      statusConviteEnviadoRef.current = enviado?.status ?? null;
      if (
        destino
        && enviado
        && deveEncaminhar
        && !conviteJaEncaminhado
        && ultimoDestinoConviteRef.current !== destino
      ) {
        ultimoDestinoConviteRef.current = destino;
        window.sessionStorage.setItem('comunhao:convite-encaminhado', enviado.id);
        const modo = obterModoConviteAceito(enviado);
        navigate(`${destino}?modo=${modo}&preparar=1`);
        return;
      }
      setConviteEnviado(enviado?.status === 'pendente' ? enviado : null);
    } catch { /* silent */ }
  }, [navigate]);

  useEffect(() => {
    carregarConvites();
    let ativo = true;
    let unsubConvite: (() => void) | undefined;

    getCurrentUserId()
      .then(userId => {
        if (!ativo) return;
        unsubConvite = subscribeToConvites(userId, payload => {
          void carregarConvites(payload?.status === 'aceito');
        });
      })
      .catch(() => {});

    return () => {
      ativo = false;
      unsubConvite?.();
    };
  }, [carregarConvites, navigate]);

  useEffect(() => {
    const interval = window.setInterval(() => { void carregarConvites(); }, 4000);
    return () => window.clearInterval(interval);
  }, [carregarConvites]);

  const carregarSessoes = useCallback(async () => {
    try {
      const sessoes = await listarSessoesGrupoAbertas();
      const sessoesPorAnfitriao: Record<string, string> = {};
      const nomesPorSessao: Record<string, string> = {};
      for (const sessao of sessoes) {
        sessoesPorAnfitriao[sessao.anfitriao_id] = sessao.sessao_id;
        nomesPorSessao[sessao.sessao_id] = sessao.anfitriao_nome;
      }
      setSessoesAbertas(sessoesPorAnfitriao);
      setNomesSessoesAbertas(nomesPorSessao);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    carregarSessoes();
    const interval = setInterval(carregarSessoes, 3000);
    return () => clearInterval(interval);
  }, [carregarSessoes]);

  const limparConviteMaoUrl = useCallback(() => {
    const novosParametros = new URLSearchParams(searchParams);
    novosParametros.delete('orar_com');
    setSearchParams(novosParametros, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleJuntarSessao = async (sessaoId: string) => {
    if (entrandoSessaoId) return;
    setEntrandoSessaoId(sessaoId);

    try {
      const sessao = await entrarSessaoGrupo(sessaoId);
      const anfitriaoNome = nomesSessoesAbertas[sessaoId] || 'essa pessoa';
      toast.success(`Orando com ${anfitriaoNome} 🙏`);
      setSessaoAtiva({ sessaoId, anfitriaoId: sessao.anfitriao_id ?? '' });
      limparConviteMaoUrl();
      await carregarSessoes();
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : '';
      if (mensagem.includes('SESSAO_JA_ACEITA')) {
        toast.info('Outra pessoa já aceitou esse momento de oração.');
        limparConviteMaoUrl();
        await carregarSessoes();
      } else if (mensagem.includes('SESSAO_ENCERRADA') || mensagem.includes('SESSAO_NAO_ENCONTRADA')) {
        toast.info('Esse pedido de oração não está mais disponível.');
        limparConviteMaoUrl();
        await carregarSessoes();
      } else {
        toast.error(mensagem || 'Erro ao entrar na oração');
      }
    } finally {
      setEntrandoSessaoId(null);
    }
  };

  const handleOrarAgora = async () => {
    if (!data?.missaoAtual.id || criandoSala) return;
    setCriandoSala(true);
    try {
      await enviarConviteOracao(data.missaoAtual.id, 'voz', 'dupla_semana');
      setConfirmandoConviteDupla(false);
      await carregarConvites();
    } catch (error) {
      toast.error(mensagemErroConvite(error));
    } finally {
      setCriandoSala(false);
    }
  };

  const handleCancelarConvite = async () => {
    if (!conviteEnviado) return;
    try {
      await cancelarConvite(conviteEnviado.id);
      setConviteEnviado(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao cancelar');
    }
  };


  const handleResponderConvite = async (conviteId: string, resposta: 'aceito' | 'recusado', tipo: 'aceite' | 'voz' | 'video') => {
    setRespondendo(conviteId);
    try {
      const result = await responderConviteOracao(conviteId, resposta, tipo);
      if (result.status === 'aceito') {
        const mode = tipo === 'voz' ? 'voz' : tipo === 'video' ? 'video' : 'silencio';
        const destination = result.sala_id ? `/sala/${result.sala_id}` : `/timer/${conviteId}`;
        navigate(`${destination}?modo=${mode}&preparar=1`);
      }
      await carregarConvites();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao responder');
    } finally {
      setRespondendo(null);
    }
  };

  const sessaoAtivaId = sessaoAtiva?.sessaoId;
  useEffect(() => {
    if (!sessaoAtivaId) return;

    const cancelar = subscribeToSessaoGrupo(sessaoAtivaId, {
      onSessaoEncerrada: () => {
        setSessaoAtiva(null);
        carregarSessoes().catch(() => undefined);
      },
      onAnfitriaoAlterado: novoId => {
        setSessaoAtiva(atual => atual ? { ...atual, anfitriaoId: novoId } : null);
      },
    });

    return cancelar;
  }, [sessaoAtivaId, carregarSessoes]);


  if (loading) {
    return (
      <div className="relic-state flex h-screen flex-col items-center justify-center bg-transparent txt-tertiary">
        <div className="w-8 h-8 border-4 border-[var(--accent-solid)] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Carregando...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="relic-state flex h-screen items-center justify-center bg-transparent p-6 text-center font-medium txt-rose">
        Erro ao carregar dados. Recarregue a página.
      </div>
    );
  }

  const isAvailable = data.usuario.status_anel === "disponivel";

  return (
    <div ref={homeSpatialRef} className="home-editorial relic-home relative z-10 flex min-h-full flex-col gap-[var(--relic-section-gap)] px-5 pb-4 pt-[calc(var(--safe-area-top)+4rem)] max-[360px]:px-4">
      <header className="spatial-section spatial-section--quiet flex items-center gap-4 max-[360px]:gap-3">
        <Link
          to={ROUTES.PERFIL}
          aria-label="Abrir meu perfil"
          className="spatial-person relic-avatar relic-interaction group relative z-0 flex size-[7rem] shrink-0 items-center justify-center rounded-full border-[3px] border-[var(--surface-elevated)] bg-[var(--surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] max-[360px]:size-24 transition-all duration-700"
        >
          {isAvailable && (
            <>
              {/* Efeito de Chama Verde Oliva (Giro Lento) */}
              <div className="pointer-events-none absolute -inset-[8px] z-[-1] rounded-full bg-gradient-to-tr from-[#9b9f67] via-[#BEC092] to-[#e4e6c3] blur-md animate-[spin_4s_linear_infinite] opacity-60 mix-blend-screen" />
              {/* Efeito de Calor Verde Oliva (Pulso Rápido) */}
              <div className="pointer-events-none absolute -inset-[4px] z-[-1] rounded-full bg-gradient-to-bl from-[#e4e6c3] via-[#BEC092] to-[#9b9f67] blur-sm animate-pulse opacity-70 mix-blend-screen" />
              {/* Anel Sólido Verde Oliva */}
              <div className="pointer-events-none absolute -inset-0.5 z-[1] rounded-full border-[3px] border-[#BEC092] shadow-[0_0_12px_rgba(190,192,146,0.8),inset_0_0_8px_rgba(190,192,146,0.5)]" />
            </>
          )}
          {data.usuario.avatar ? (
            <img
              src={data.usuario.avatar}
              alt={`Foto de perfil de ${data.usuario.nome}`}
              className="size-full rounded-full object-cover"
            />
          ) : (
            <span className="font-display text-3xl font-semibold uppercase text-[var(--text-primary)]">
              {data.usuario.nome?.[0] || '?'}
            </span>
          )}
          {data.usuario.brasaoInstitucional && (
            <span className="absolute -bottom-2 -left-3 z-10">
              <InstitutionalCrest kind={data.usuario.brasaoInstitucional} size={30} />
            </span>
          )}
        </Link>
        <div className="min-w-0 flex-1 py-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] txt-green mb-1.5">Comunhão</p>
          <h1 className={`font-display text-lg font-medium leading-tight tracking-tight [overflow-wrap:anywhere] max-[360px]:text-base transition-colors duration-700 ${
            isAvailable 
              ? 'home-greeting-illuminated' 
              : 'txt-secondary'
          }`}>
            A paz do Senhor,<br />
            <span className="text-3xl font-bold max-[360px]:text-2xl mt-0.5 block home-user-name transition-all duration-700">
              {data.usuario.nome?.split(' ')[0] || data.usuario.nome}
            </span>
          </h1>
          <p className={`mt-1 text-sm transition-colors duration-700 ${
            isAvailable 
              ? 'home-subtitle-illuminated' 
              : 'txt-tertiary'
          }`}>
            Seu altar de comunhão e intercessão
          </p>
        </div>
      </header>

      {jornadaRetomavel && (
        <section className="spatial-section spatial-section--raised relic-surface rounded-2xl border border-[var(--celebration-border)] bg-[var(--surface-highlighted)] p-5 card-enter">
          <div className="flex items-start gap-3">
            <SealIcon Icon={Heart} size="lg" active />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold txt-primary">Seu momento de oração foi interrompido</p>
              <p className="mt-1 text-xs leading-relaxed txt-tertiary">
                Retome no modo {jornadaRetomavel.modalidade}. Sua intenção continua privada.
              </p>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => navigate(`/timer/${jornadaRetomavel.referencia_id}`)} className="flex-1 text-xs">
                  Retomar oração
                </Button>
                <Button onClick={() => setJornadaRetomavel(null)} variant="ghost" className="text-xs">
                  Agora não
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Chamada Recebida em Tempo Real */}
      {convitesPendentes[0] && (
        <IncomingPrayerCall
          nome={convitesPendentes[0].remetente_nome}
          fotoUrl={convitesPendentes[0].remetente_foto}
          origem={convitesPendentes[0].origem === 'sala_oracao' ? 'SALA DE ORAÇÃO' : 'DUPLA DA SEMANA'}
          tipoConexao={convitesPendentes[0].tipo_conexao_remetente}
          processando={respondendo === convitesPendentes[0].id}
          onAcceptVideo={() => handleResponderConvite(convitesPendentes[0].id, 'aceito', 'video')}
          onAcceptAudio={() => handleResponderConvite(convitesPendentes[0].id, 'aceito', 'voz')}
          onDecline={() => handleResponderConvite(convitesPendentes[0].id, 'recusado', 'aceite')}
        />
      )}

      {/* Alguém levantou a mão */}
      {sessaoConviteId && !sessaoAtiva && (
        <section className="spatial-section spatial-section--raised relic-surface rounded-2xl border border-[var(--care-border)] bg-[var(--surface)] p-5 card-enter">
          <div className="flex items-start gap-3">
            <SealIcon Icon={Hand} size="lg" active />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold txt-primary">
                {nomesSessoesAbertas[sessaoConviteId] || 'Alguém'} levantou a mão
              </p>
              <p className="mt-1 text-xs leading-relaxed txt-tertiary">
                Essa pessoa quer companhia para orar agora. A sala compartilhada só começa quando alguém aceitar.
              </p>
              <div className="mt-4 flex gap-2">
                <Button
                  onClick={() => handleJuntarSessao(sessaoConviteId)}
                  disabled={entrandoSessaoId === sessaoConviteId}
                  className="flex-1 text-xs"
                >
                  <Heart size={15} />
                  {entrandoSessaoId === sessaoConviteId ? 'Entrando...' : 'Aceito orar'}
                </Button>
                <Button
                  onClick={limparConviteMaoUrl}
                  variant="ghost"
                  className="text-xs"
                >
                  Agora não
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Portal da Sala de Oração */}
      <div className="spatial-section spatial-section--quiet mb-6 card-enter">
        <LivePrayerRoomCard
          sessoesAbertasCount={Object.keys(sessoesAbertas).length}
          mocidadeOnlineCount={data.mocidade.filter(j => j.status_anel === 'disponivel').length}
          onEntrar={() => navigate('/oracao')}
        />
      </div>

      {/* Missão da Semana: carro-chefe com intercessão e acesso à Sala de Oração */}
      <HomeJourneySurface mission={data.missaoAtual && (
        <PrayerPartnerCard
          missaoAtual={data.missaoAtual}
          parceiroSustentador={data.parceiroSustentador}
          conviteEnviado={conviteEnviado}
          criandoSala={criandoSala}
          onConvidar={() => {
            if (!data.missaoAtual.id) return;
            conviteTriggerRef.current = document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
            setConfirmandoConviteDupla(true);
          }}
          onCancelarConvite={handleCancelarConvite}
        />
      )}>

      <div className="home-formation">
        <DailyEbdCard editorialLesson={editorialLesson} onAbrir={() => navigate('/ebd')} />
        <ComunhaoEstudosCard hasEstudosAccess={hasEstudosAccess} onAcessar={() => navigate('/estudos')} />
      </div>

      {confirmandoConviteDupla && createPortal(
        <div
          className="app-modal-layer fixed inset-0 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          role="presentation"
          onClick={() => !criandoSala && setConfirmandoConviteDupla(false)}
        >
          <section
            ref={conviteDialogRef}
            role="dialog"
            tabIndex={-1}
            aria-modal="true"
            aria-labelledby="confirmar-dupla-title"
            aria-describedby="confirmar-dupla-description"
            className="w-full max-w-sm rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--celebration)]">
              Dupla da semana
            </p>
            <h2 id="confirmar-dupla-title" className="mt-2 font-display text-2xl font-semibold txt-primary">
              Convidar {data.missaoAtual.nome}?
            </h2>
            <p id="confirmar-dupla-description" className="mt-2 text-sm leading-relaxed txt-tertiary">
              Este convite pertence ao compromisso semanal. Ele não é uma chamada da Sala de Oração.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button
                variant="ghost"
                onClick={() => setConfirmandoConviteDupla(false)}
                disabled={criandoSala}
              >
                Cancelar
              </Button>
              <Button onClick={handleOrarAgora} disabled={criandoSala}>
                {criandoSala ? 'Enviando…' : 'Enviar convite'}
              </Button>
            </div>
          </section>
        </div>,
        document.body,
      )}

      {/* Mocidade */}
      <section className="home-community spatial-section spatial-section--quiet space-y-3">
        <SectionHeader
          title="Nossa comunidade"
          eyebrow=""
          action={<Link to="/comunidade" className="text-xs font-semibold text-[var(--accent-primary)] hover:underline">Ver todos</Link>}
        />
        <div className="community-presence-card card-enter">
          <MocidadeGrid
            compact
            jovens={data.mocidade}
            sessoesAbertas={sessoesAbertas}
            onJuntarSessao={handleJuntarSessao}
          />
        </div>
      </section>

      </HomeJourneySurface>

      {/* Footer */}
      <div className="spatial-section spatial-section--quiet text-center pt-2 pb-4">
        <Link to="/guia" className="inline-flex items-center gap-2 txt-tertiary hover:txt-primary text-xs font-medium transition px-4 py-2 rounded-full">
          <Award size={13} />
          Jornada de Serviço — como funciona
        </Link>
      </div>

      {sessaoAtiva && (
        <SessaoAbertaModal
          sessaoId={sessaoAtiva.sessaoId}
          anfitriaoId={sessaoAtiva.anfitriaoId}
          meuId={data.usuario.id}
          onClose={() => {
            setSessaoAtiva(null);
            carregarSessoes();
          }}
        />
      )}
    </div>
  );
}
