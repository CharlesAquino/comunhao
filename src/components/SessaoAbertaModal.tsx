import { useState, useEffect, useRef } from 'react';
import { Heart, Check, X, UserPlus, UserMinus, Crown } from 'lucide-react';
import { finalizarSessaoGrupo, listarParticipantesAtivos, obterNomeUsuario, sairSessaoGrupo, subscribeToSessaoGrupo } from '../services/oracaoAbertaService';
import { creditarKesef, creditarXp } from '../services/kesefService';
import { KESEF_VALORES } from '../services/kesefConstants';
import { XP_ACOES } from '../services/patente';
import { useToast } from '../contexts/ToastContext';
import type { SessaoGrupoParticipanteInfo } from '../types';
import Button from './ui/Button';
import IconButton from './ui/IconButton';

interface Props {
  sessaoId: string;
  anfitriaoId: string;
  meuId: string;
  onClose: () => void;
}

interface EventoEntradaSaida {
  tipo: 'entrou' | 'saiu' | 'novo_anfitriao';
  nome: string;
}

export default function SessaoAbertaModal({ sessaoId, anfitriaoId: anfitriaoIdInicial, meuId, onClose }: Props) {
  const [segundos, setSegundos] = useState(0);
  const [participantes, setParticipantes] = useState<SessaoGrupoParticipanteInfo[]>([]);
  const [eventos, setEventos] = useState<EventoEntradaSaida[]>([]);
  const [anfitriaoId, setAnfitriaoId] = useState(anfitriaoIdInicial);
  const [finalizada, setFinalizada] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const toast = useToast();
  const isAnfitriao = meuId === anfitriaoId;
  const eventosRef = useRef<HTMLDivElement>(null);
  const finalizadaRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    finalizadaRef.current = false;

    listarParticipantesAtivos(sessaoId).then(setParticipantes).catch(() => setParticipantes([]));

    const unsub = subscribeToSessaoGrupo(sessaoId, {
      onParticipanteEntrou: (p) => {
        setParticipantes((prev) => {
          if (prev.some((x) => x.usuario_id === p.usuario_id)) return prev;
          return [...prev, p];
        });
        if (!finalizadaRef.current) {
          setEventos((prev) => [...prev, { tipo: 'entrou', nome: p.nome }]);
        }
      },
      onParticipanteSaiu: (p) => {
        setParticipantes((prev) => prev.filter((x) => x.usuario_id !== p.usuario_id));
        if (!finalizadaRef.current) {
          setEventos((prev) => [...prev, { tipo: 'saiu', nome: p.nome }]);
        }
      },
      onSessaoEncerrada: () => {
        finalizadaRef.current = true;
        setFinalizada(true);
      },
      onAnfitriaoAlterado: async (novoAnfitriaoId) => {
        setAnfitriaoId(novoAnfitriaoId);
        const nome = await obterNomeUsuario(novoAnfitriaoId) ?? 'Alguém';
        setEventos((prev) => [...prev, { tipo: 'novo_anfitriao', nome }]);
      },
    });
    return unsub;
  }, [sessaoId]);

  useEffect(() => {
    if (eventosRef.current) {
      eventosRef.current.scrollTop = eventosRef.current.scrollHeight;
    }
  }, [eventos]);

  const handleSair = async () => {
    setSaindo(true);
    try {
      await sairSessaoGrupo(sessaoId);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao sair');
    } finally {
      setSaindo(false);
    }
  };

  const handleAmem = async () => {
    if (finalizando) return;
    setFinalizando(true);
    finalizadaRef.current = true;
    try {
      await finalizarSessaoGrupo(sessaoId);
      if (segundos >= 60) {
        await Promise.all([
          creditarKesef('oracao', KESEF_VALORES.INTERCEDER, sessaoId),
          creditarXp(XP_ACOES.INTERCEDER, sessaoId),
        ]);
        toast.success(`Amém! Oração concluída 🙏 +1 Kesef +1 XP`);
      } else {
        toast.success('Amém! 🙏');
      }
      setFinalizada(true);
    } catch (e) {
      finalizadaRef.current = false;
      toast.error(e instanceof Error ? e.message : 'Erro ao finalizar');
    } finally {
      setFinalizando(false);
    }
  };


  const parceiro = participantes.find((participante) => participante.usuario_id !== meuId);
  const tituloSessao = finalizada
    ? 'Oração Encerrada 🙏'
    : parceiro
      ? isAnfitriao
        ? `${parceiro.nome} está orando com você`
        : `Orando com ${parceiro.nome}`
      : isAnfitriao
        ? 'Aguardando alguém entrar na oração'
        : 'Oração em Grupo';

  const formatarTempo = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sessao-oracao-titulo"
        className="w-full max-w-sm card-surface rounded-2xl p-6 relative max-h-[90vh] overflow-y-auto"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[30%] rounded-full blur-[80px]" style={{ background: 'var(--aurora-blob1)' }} />
          <div className="absolute bottom-[-10%] right-[-15%] w-[40%] h-[30%] bg-amber-500/10 rounded-full blur-[80px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-4">
          {!finalizada && !isAnfitriao && (
            <IconButton
              onClick={handleSair}
              disabled={saindo}
              label="Sair da oração"
              className="absolute right-0 top-0 !text-[var(--danger)]"
            >
              <X size={18} />
            </IconButton>
          )}

          <div className="w-16 h-16 rounded-full bg-elevated border-2 border-amber-400/30 flex items-center justify-center">
            <Heart size={30} className="txt-rose" />
          </div>

          <p id="sessao-oracao-titulo" className="font-display text-lg txt-primary text-center">
            {tituloSessao}
          </p>

          <p className="text-4xl font-black txt-primary tracking-tight tabular-nums" style={{ fontFamily: 'ui-monospace, monospace' }}>
            {formatarTempo(segundos)}
          </p>
          <p className="text-xs txt-tertiary uppercase tracking-[0.15em] font-bold -mt-2">de comunhão</p>

          {/* Participantes */}
          {participantes.length > 0 && (
            <div className="w-full">
              <p className="text-xs txt-tertiary font-semibold mb-2">
                Participantes ({participantes.length})
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {participantes.map((p) => (
                  <div key={p.usuario_id} className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-full border border-subtle">
                    <div className="w-6 h-6 rounded-full bg-elevated flex items-center justify-center text-[10px] font-bold txt-primary uppercase overflow-hidden shrink-0">
                      {p.foto_url ? (
                        <img src={p.foto_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        p.nome[0]
                      )}
                    </div>
                    <span className="text-xs txt-secondary font-medium">{p.nome}</span>
                    {p.usuario_id === anfitriaoId && (
                      <Crown size={10} className="txt-amber" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Eventos de entrada/saída */}
          {eventos.length > 0 && (
            <div
              ref={eventosRef}
              className="w-full max-h-24 overflow-y-auto space-y-1 bg-surface/50 rounded-xl p-3"
            >
              {eventos.map((ev, i) => (
                <div key={`ev-${i}-${ev.tipo}`} className="flex items-center gap-2 text-xs">
                  {ev.tipo === 'entrou' ? (
                    <UserPlus size={12} className="txt-green shrink-0" />
                  ) : ev.tipo === 'saiu' ? (
                    <UserMinus size={12} className="txt-rose shrink-0" />
                  ) : (
                    <Crown size={12} className="txt-amber shrink-0" />
                  )}
                  <span className={
                    ev.tipo === 'entrou' ? 'txt-green' :
                    ev.tipo === 'saiu' ? 'txt-rose' :
                    'txt-amber'
                  }>
                    {ev.tipo === 'entrou' && `${ev.nome} entrou`}
                    {ev.tipo === 'saiu' && `${ev.nome} saiu`}
                    {ev.tipo === 'novo_anfitriao' && `${ev.nome} agora é o(a) novo(a) anfitrião(ã)`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {finalizada ? (
            <Button
              onClick={onClose}
              className="w-full min-h-12 text-base"
            >
              Fechar
            </Button>
          ) : isAnfitriao ? (
            <Button
              onClick={handleAmem}
              disabled={finalizando}
              className="w-full min-h-12 text-base"
            >
              <Check size={20} />
              {finalizando ? 'Finalizando...' : 'Amém'}
            </Button>
          ) : (
            <Button
              onClick={handleSair}
              disabled={saindo}
              variant="danger"
              className="w-full min-h-12 text-base"
            >
              <X size={18} />
              {saindo ? 'Saindo...' : 'Sair da Oração'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
