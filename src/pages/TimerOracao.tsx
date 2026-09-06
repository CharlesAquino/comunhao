import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Heart, Check, AlertCircle } from 'lucide-react';
import { finalizarSessaoTimer, getEstadoSessaoTimer, verificarTimerParceiro } from '../services/conviteService';
import { creditarKesef, creditarXp } from '../services/kesefService';
import { KESEF_VALORES } from '../services/kesefConstants';
import { XP_ACOES } from '../services/patente';
import { ROUTES } from '../services/constants';
import { useToast } from '../contexts/ToastContext';
import Button from '../components/ui/Button';
import {
  completePrayerJourney,
  heartbeatPrayerJourney,
  interruptPrayerJourney,
  startPrayerJourney,
} from '../services/prayerJourneyService';

export default function TimerOracao() {
  const { conviteId } = useParams<{ conviteId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const [segundos, setSegundos] = useState(0);
  const [ambosPresentes, setAmbosPresentes] = useState(false);
  const [validando, setValidando] = useState(true);
  const [erroSessao, setErroSessao] = useState('');
  const [finalizando, setFinalizando] = useState(false);
  const [estadoFinal, setEstadoFinal] = useState<'orando' | 'aguardando_parceiro' | 'finalizado'>('orando');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const journeyCompletedRef = useRef(false);

  useEffect(() => {
    let active = true;
    if (!conviteId) {
      setErroSessao('Convite inválido.');
      setValidando(false);
      return;
    }

    getEstadoSessaoTimer(conviteId)
      .then(async () => {
        if (!active) return;
        const requestedMode = searchParams.get('modo');
        const mode = requestedMode === 'texto' || requestedMode === 'voz' || requestedMode === 'video'
          ? requestedMode
          : 'silencio';
        const privateIntention = (location.state as { intencaoPrivada?: string | null } | null)?.intencaoPrivada || undefined;
        await startPrayerJourney(conviteId, mode, privateIntention);
        if (!active) return;
        setAmbosPresentes(true);
        intervalRef.current = setInterval(() => {
          setSegundos((s) => s + 1);
        }, 1000);
      })
      .catch(() => {
        if (!active) return;
        setErroSessao('Este convite não existe, expirou ou não pertence à sua conta.');
      })
      .finally(() => {
        if (active) setValidando(false);
      });

    return () => {
      active = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (!journeyCompletedRef.current) void interruptPrayerJourney(conviteId).catch(() => undefined);
    };
  }, [conviteId, location.state, searchParams]);

  useEffect(() => {
    if (!conviteId || validando || erroSessao || estadoFinal === 'finalizado') return;
    const heartbeat = setInterval(() => {
      void heartbeatPrayerJourney(conviteId).catch(() => undefined);
    }, 20_000);
    return () => clearInterval(heartbeat);
  }, [conviteId, validando, erroSessao, estadoFinal]);

  useEffect(() => {
    if (!conviteId || estadoFinal !== 'aguardando_parceiro') {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const data = await verificarTimerParceiro(conviteId);
        if (data.ambos_finalizaram) {
          await completePrayerJourney(conviteId);
          journeyCompletedRef.current = true;
          setEstadoFinal('finalizado');
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch {
        setErroSessao('Não foi possível acompanhar a finalização do parceiro.');
      }
    }, 2000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [conviteId, estadoFinal]);

  const handleAmem = async () => {
    if (!conviteId || finalizando) return;
    setFinalizando(true);
    try {
      const result = await finalizarSessaoTimer(conviteId);

      if (result.status === 'finalizado') {
        const duracao = result.duracao_segundos ?? segundos;
        if (duracao >= 60) {
          await Promise.all([
            creditarKesef('oracao', KESEF_VALORES.ORACAO_CONFIRMADA, conviteId),
            creditarXp(XP_ACOES.ORAR, conviteId),
          ]);
          toast.success(`Amém! Oração concluída 🙏 +10 Kesef +5 XP`);
        }
        await completePrayerJourney(conviteId);
        journeyCompletedRef.current = true;
        setEstadoFinal('finalizado');
      } else {
        setEstadoFinal('aguardando_parceiro');
      }
    } catch (erro) {
      const msg = erro instanceof Error ? erro.message : typeof erro === 'string' ? erro : JSON.stringify(erro);
      console.error('[Timer] handleAmem error:', msg, erro);
      toast.error(msg || 'Erro ao finalizar');
    } finally {
      setFinalizando(false);
    }
  };

  const formatarTempo = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  if (validando) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[var(--body-bg)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-solid)] border-t-transparent" aria-label="Validando convite" />
      </div>
    );
  }

  if (erroSessao) {
    return (
      <div className="flex h-[100dvh] max-w-md mx-auto items-center justify-center px-6" style={{ background: 'var(--body-bg)' }}>
        <div className="glass w-full rounded-2xl p-6 text-center">
          <AlertCircle className="mx-auto mb-4 text-rose-400" size={36} aria-hidden="true" />
          <h1 className="font-display text-xl txt-primary">Sessão indisponível</h1>
          <p className="mt-2 text-sm txt-tertiary">{erroSessao}</p>
          <Button onClick={() => navigate(ROUTES.HOME)} className="mt-6 w-full min-h-12">
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] max-w-md mx-auto relative overflow-hidden items-center justify-center px-6" style={{ background: 'var(--body-bg)' }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[40%] rounded-full blur-[100px]" style={{ background: 'var(--aurora-blob1)' }} />
        <div className="absolute bottom-[-10%] right-[-15%] w-[50%] h-[40%] bg-amber-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 w-full">
        {!ambosPresentes && (
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm txt-tertiary">Aguardando seu parceiro entrar...</p>
          </div>
        )}

        <div className="w-20 h-20 rounded-full bg-elevated border-2 border-amber-400/30 flex items-center justify-center">
          <Heart size={36} className="txt-rose" />
        </div>

        <p className="font-display text-xl txt-primary text-center">
          {estadoFinal === 'finalizado'
            ? 'Oração Concluída 🙏'
            : estadoFinal === 'aguardando_parceiro'
            ? 'Aguardando seu parceiro finalizar...'
            : 'Em Oração Silenciosa'}
        </p>

        <p className="text-5xl font-black txt-primary tracking-tight tabular-nums" style={{ fontFamily: 'ui-monospace, monospace' }}>
          {formatarTempo(segundos)}
        </p>

        <p className="text-xs txt-tertiary uppercase tracking-[0.15em] font-bold">de comunhão</p>

        {estadoFinal === 'finalizado' ? (
          <Button
            onClick={() => navigate(ROUTES.HOME)}
            className="w-full min-h-14 text-lg"
          >
            Voltar ao Início
          </Button>
        ) : (
          <Button
            onClick={handleAmem}
            disabled={finalizando || estadoFinal === 'aguardando_parceiro'}
            className="w-full min-h-14 text-lg"
          >
            <Check size={22} />
            {finalizando ? 'Finalizando...' : estadoFinal === 'aguardando_parceiro' ? 'Aguardando...' : 'Amém'}
          </Button>
        )}
      </div>
    </div>
  );
}
