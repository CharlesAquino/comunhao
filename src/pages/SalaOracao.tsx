import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Room, RoomEvent, Track } from 'livekit-client';
import { Capacitor } from '@capacitor/core';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Volume2, Loader2, UserPlus, Sparkles } from 'lucide-react';
import { obterTokenLiveKit, finalizarSalaOracao } from '../services/prayerRoomService';
import { convidarParaSalaOracao } from '../services/conviteService';
import { listPrayerAvailablePeople, type AvailablePrayerPerson } from '../services/prayerAvailabilityService';
import { creditarXp } from '../services/kesefService';
import { XP_ACOES } from '../services/patente';
import { ROUTES } from '../services/constants';
import { useToast } from '../contexts/ToastContext';
import Button from '../components/ui/Button';
import IconButton from '../components/ui/IconButton';
import { ErrorState, LoadingState } from '../components/ui/FeedbackState';
import PrayerPreJoin from '../components/oracao/PrayerPreJoin';
import RoomInvitePicker from '../components/oracao/RoomInvitePicker';
import PrayerStickerPicker from '../components/oracao/PrayerStickerPicker';
import PrayerSticker from '../components/oracao/PrayerSticker';
import {
  decodePrayerSticker,
  encodePrayerSticker,
  PRAYER_STICKERS,
  PRAYER_STICKER_TOPIC,
  type PrayerStickerDefinition,
  type PrayerStickerMessage,
  type PrayerStickerPack,
} from '../services/prayerStickerService';

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL?.trim() as string | undefined;

interface ParticipanteInfo {
  identity: string;
  nome: string;
  isLocal: boolean;
  temVideo: boolean;
  falando: boolean;
}

interface ActivePrayerSticker extends PrayerStickerMessage {
  senderName: string;
  renderKey: number;
}

export default function SalaOracao() {
  const { salaId } = useParams<{ salaId: string }>();
  const [searchParams] = useSearchParams();
  const modoInicial = searchParams.get('modo') === 'video' ? 'video' : 'voz';
  const exigePreparacao = searchParams.get('preparar') === '1';
  const navigate = useNavigate();
  const toast = useToast();

  const [room, setRoom] = useState<Room | null>(null);
  const [conectando, setConectando] = useState(true);
  const [erro, setErro] = useState('');
  const [mutado, setMutado] = useState(false);
  const [videoAtivo, setVideoAtivo] = useState(false);
  const [participantes, setParticipantes] = useState<ParticipanteInfo[]>([]);
  const [segundos, setSegundos] = useState(0);
  const [finalizando, setFinalizando] = useState(false);
  const [entrouNaSala, setEntrouNaSala] = useState(!exigePreparacao);
  const [configuracaoEntrada, setConfiguracaoEntrada] = useState({
    microphone: true,
    camera: modoInicial === 'video',
  });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [availablePeople, setAvailablePeople] = useState<AvailablePrayerPerson[]>([]);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [stickerPack, setStickerPack] = useState<PrayerStickerPack>('essencial');
  const [stickerSending, setStickerSending] = useState(false);
  const [activeSticker, setActiveSticker] = useState<ActivePrayerSticker | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoElements = useRef<Map<string, HTMLVideoElement>>(new Map());
  const stickerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSticker = useCallback((message: PrayerStickerMessage, senderName: string) => {
    if (stickerTimeoutRef.current) clearTimeout(stickerTimeoutRef.current);
    setActiveSticker({ ...message, senderName, renderKey: Date.now() });
    stickerTimeoutRef.current = setTimeout(() => setActiveSticker(null), 3200);
  }, []);

  const atualizarParticipantes = useCallback((r: Room) => {
    const porIdentidade = new Map<string, ParticipanteInfo>();
    const adicionar = (participant: {
      identity: string;
      name?: string;
      isSpeaking: boolean;
      trackPublications: Map<string, { track?: { kind: string } }>;
    }, isLocal: boolean) => {
      let temVideo = false;
      participant.trackPublications.forEach((pub) => {
        if (pub.track?.kind === Track.Kind.Video) temVideo = true;
      });
      porIdentidade.set(participant.identity, {
        identity: participant.identity,
        nome: participant.name || (isLocal ? 'Você' : 'Irmão(ã)'),
        isLocal,
        temVideo,
        falando: participant.isSpeaking,
      });
    };
    adicionar(r.localParticipant, true);
    r.remoteParticipants.forEach(p => adicionar(p, false));
    setParticipantes([...porIdentidade.values()]);
  }, []);

  useEffect(() => {
    if (!salaId || !entrouNaSala) return;
    let ativo = true;
    const r = new Room({ adaptiveStream: true, dynacast: true });

    async function conectar() {
      try {
        if (!LIVEKIT_URL || !/^wss:\/\//i.test(LIVEKIT_URL)) {
          throw new Error('O serviço de áudio da sala não está configurado neste ambiente.');
        }
        const ambienteNativo = Capacitor.isNativePlatform();
        if (!ambienteNativo && !window.isSecureContext) {
          throw new Error('Câmera e microfone exigem uma conexão segura. Neste computador, abra o app por localhost ou HTTPS.');
        }
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(ambienteNativo
            ? 'Este aparelho não disponibilizou o microfone e a câmera ao aplicativo. Atualize o Android System WebView e tente novamente.'
            : 'Este navegador não disponibiliza acesso ao microfone e à câmera.');
        }
        const { token } = await obterTokenLiveKit(salaId!);
        if (!ativo) return;

        r.on(RoomEvent.ParticipantConnected, () => atualizarParticipantes(r));
        r.on(RoomEvent.ParticipantDisconnected, () => atualizarParticipantes(r));
        r.on(RoomEvent.ActiveSpeakersChanged, () => atualizarParticipantes(r));
        r.on(RoomEvent.DataReceived, (payload, participant, _kind, topic) => {
          if (topic !== PRAYER_STICKER_TOPIC) return;
          const message = decodePrayerSticker(payload);
          if (message) showSticker(message, participant?.name || 'Alguém na sala');
        });

        r.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
          if (track.kind === Track.Kind.Video) {
            const el = videoElements.current.get(participant.identity);
            if (el) {
              track.attach(el);
            }
          }
          if (track.kind === Track.Kind.Audio) {
            track.attach();
          }
          atualizarParticipantes(r);
        });

        r.on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach();
          atualizarParticipantes(r);
        });

        r.on(RoomEvent.Disconnected, () => {
          if (ativo) navigate(ROUTES.HOME);
        });

        await r.connect(LIVEKIT_URL, token);
        await r.localParticipant.setMicrophoneEnabled(configuracaoEntrada.microphone);
        if (configuracaoEntrada.camera) {
          await r.localParticipant.setCameraEnabled(true);
        }

        if (!ativo) return;
        setRoom(r);
        setMutado(!configuracaoEntrada.microphone);
        setVideoAtivo(configuracaoEntrada.camera);
        atualizarParticipantes(r);
        setConectando(false);

        intervalRef.current = setInterval(() => setSegundos((s) => s + 1), 1000);
      } catch (e) {
        if (!ativo) return;
        const mensagem = e instanceof Error ? e.message : 'Erro ao conectar na sala';
        if (/permission|permission denied|notallowederror/i.test(mensagem)) {
          setErro('Permita o uso do microfone e da câmera nas configurações do navegador.');
        } else {
          setErro(mensagem);
        }
        setConectando(false);
      }
    }

    conectar();

    return () => {
      ativo = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (stickerTimeoutRef.current) clearTimeout(stickerTimeoutRef.current);
      r.disconnect();
    };
  }, [salaId, navigate, atualizarParticipantes, entrouNaSala, configuracaoEntrada, showSticker]);

  const toggleMudo = async () => {
    if (!room) return;
    const novoEstado = !mutado;
    await room.localParticipant.setMicrophoneEnabled(!novoEstado);
    setMutado(novoEstado);
  };

  const toggleVideo = async () => {
    if (!room) return;
    const novoEstado = !videoAtivo;
    try {
      await room.localParticipant.setCameraEnabled(novoEstado);
      setVideoAtivo(novoEstado);
    } catch (error) {
      toast.error(error instanceof Error && /permission|notallowed/i.test(error.message)
        ? 'Permita o uso da câmera nas configurações do aplicativo.'
        : 'Não foi possível alterar a câmera.');
    }
  };

  const handleAmem = async () => {
    if (!salaId || finalizando) return;
    setFinalizando(true);
    try {
      const resultados = await finalizarSalaOracao(salaId);
      const creditos = resultados.filter(r => r.creditado).length;
      const duracao = resultados.find(r => r.motivo === 'DURACAO_INSUFICIENTE');
      const cap = resultados.find(r => r.motivo === 'CAP_DIARIO_ATINGIDO');
      if (creditos > 0) {
        await creditarXp(XP_ACOES.ORAR, salaId).catch(() => {});
        toast.success(`Amém! +10 Kesef pela oração 🙏`);
      } else if (duracao) {
        toast.error('Oração muito curta (mínimo 1 minuto)');
      } else if (cap) {
        toast.info('Limite diário de Kesef atingido');
      }
      room?.disconnect();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao finalizar oração');
      room?.disconnect();
    }
  };

  const formatarTempo = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const openInvitePicker = async () => {
    setInviteOpen(true);
    setInviteLoading(true);
    try {
      setAvailablePeople(await listPrayerAvailablePeople());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível buscar pessoas disponíveis.');
    } finally {
      setInviteLoading(false);
    }
  };

  const invitePerson = async (person: AvailablePrayerPerson) => {
    if (!salaId) return;
    await convidarParaSalaOracao(salaId, person.usuario_id);
    toast.success(`Convite enviado para ${person.nome}.`);
    setInviteOpen(false);
  };

  const sendSticker = async (sticker: PrayerStickerDefinition) => {
    if (!room || stickerSending) return;
    const message: PrayerStickerMessage = {
      type: 'prayer-sticker',
      version: 1,
      stickerId: sticker.id,
      pack: stickerPack,
      sentAt: Date.now(),
    };
    setStickerSending(true);
    try {
      await room.localParticipant.publishData(encodePrayerSticker(message), {
        reliable: true,
        topic: PRAYER_STICKER_TOPIC,
      });
      showSticker(message, 'Você');
      setStickerPickerOpen(false);
    } catch {
      toast.error('Não foi possível enviar a figurinha.');
    } finally {
      setStickerSending(false);
    }
  };

  const invitePicker = <RoomInvitePicker open={inviteOpen} people={availablePeople} loading={inviteLoading} participantIds={participantes.map(person => person.identity)} onClose={() => setInviteOpen(false)} onInvite={invitePerson} />;

  const remote = participantes.find(p => !p.isLocal);
  if (!entrouNaSala) {
    return (
      <>
      <PrayerPreJoin
        initialVideo={modoInicial === 'video'}
        onBack={() => navigate(ROUTES.HOME)}
        onInvite={openInvitePicker}
        onEnter={settings => {
          setConfiguracaoEntrada(settings);
          setEntrouNaSala(true);
        }}
      />
      {invitePicker}
      </>
    );
  }
  if (conectando) {
    return <div className="min-h-screen bg-[var(--canvas)]"><LoadingState label="Preparando o ambiente de comunhão..." /></div>;
  }

  if (erro) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[var(--canvas)] p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center mb-4">
          <PhoneOff size={24} className="txt-rose" />
        </div>
        <ErrorState message={`Conexão interrompida. ${erro}`} />
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
          <Button onClick={() => navigate(ROUTES.HOME)} variant="secondary">
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate flex h-[100dvh] flex-col overflow-hidden bg-transparent">
      <div className="shared-louvor-environment" aria-hidden="true" />

      {/* Fundo com glow sutil */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[35%] rounded-full blur-[120px]" style={{ background: 'var(--aurora-blob1)' }} />
      </div>

      {/* Top Bar */}
      <header className="relative z-10 flex items-center justify-between border-b border-[var(--border)] px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3 min-w-0">
          {remote && (
            <>
              <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--accent-primary)] bg-[var(--surface-elevated)] text-sm font-bold text-[var(--text-primary)]">
                {remote.nome[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold txt-primary truncate">{remote.nome}</p>
                <p className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                  <span className="size-2 rounded-full bg-[var(--success)]" />
                  presente na oração
                </p>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <IconButton onClick={openInvitePicker} label="Convidar alguém para esta sala"><UserPlus size={18} /></IconButton>
          {segundos >= 60 && (
            <span className="rounded-full bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text-muted)]">
              {Math.floor(segundos / 60)}min
            </span>
          )}
          <span className="font-display text-xl font-semibold tabular-nums text-[var(--text-primary)]">
            {formatarTempo(segundos)}
          </span>
        </div>
      </header>

      {/* Grid de Vídeo */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 pb-2">
        {participantes.length === 0 ? (
          <div className="flex flex-col items-center gap-3 animate-fade-in">
            <Loader2 size={24} className="txt-amber animate-spin" />
            <p className="text-sm txt-tertiary">Conectando participantes...</p>
          </div>
        ) : (
          <div className={`prayer-room-grid grid gap-3 w-full h-full items-center justify-items-center ${participantes.length === 1 ? 'grid-cols-1' : participantes.length > 4 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}
            style={{ maxHeight: 'calc(100% - 8px)' }}>
            {participantes.map((p, i) => (
              <div
                key={p.identity}
                className={`relative w-full overflow-hidden rounded-[1.25rem] border bg-[var(--surface)] transition-premium animate-scale-fade
                  ${p.falando ? 'border-[var(--accent-primary)]' : 'border-[var(--border)]'}
                  ${p.isLocal && participantes.length <= 2 ? 'max-w-[180px] md:max-w-[220px] aspect-video self-end justify-self-end' : 'aspect-video max-h-full'}`}
                style={{ animationDelay: `${i * 150}ms` }}
              >
                {/* Video element */}
                <video
                  ref={(el) => {
                    if (el) {
                      videoElements.current.set(p.identity, el);
                      // Re-attach track if element is re-created
                      const participant = p.isLocal
                        ? room?.localParticipant
                        : room?.remoteParticipants.get(p.identity);
                      if (participant) {
                        participant.trackPublications.forEach((pub) => {
                          if (pub.track?.kind === Track.Kind.Video) {
                            (pub.track as unknown as { attach: (el: HTMLVideoElement) => void }).attach(el);
                          }
                        });
                      }
                    } else {
                      videoElements.current.delete(p.identity);
                    }
                  }}
                  autoPlay playsInline
                  muted={p.isLocal}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${p.temVideo ? 'opacity-100' : 'opacity-0'}`}
                />

                {/* Fallback avatar quando sem video */}
                {!p.temVideo && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--surface)]">
                    <div className={`flex size-20 items-center justify-center rounded-full border-2 bg-[var(--surface-elevated)] text-3xl font-semibold text-[var(--text-primary)] transition-premium
                      ${p.falando ? 'border-[var(--accent-primary)]' : 'border-[var(--border)]'}`}>
                      {p.nome[0]?.toUpperCase()}
                    </div>
                    {p.falando && (
                      <div className="flex items-center gap-1.5">
                        <Volume2 size={12} className="text-[var(--accent-primary)]" />
                        <span className="text-xs font-medium text-[var(--accent-primary)]">Falando</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Overlay gradient na parte inferior */}
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />

                {/* Nome do participante */}
                <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/90 drop-shadow-lg">
                    {p.isLocal ? 'Você' : p.nome}
                  </span>
                  {p.falando && p.temVideo && (
                    <Volume2 size={12} className="txt-green animate-pulse drop-shadow-lg" />
                  )}
                </div>

                {/* Indicador de mute no tile local */}
                {p.isLocal && mutado && (
                  <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-rose-500/40 flex items-center justify-center backdrop-blur-sm">
                    <MicOff size={12} className="text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {activeSticker && (() => {
        const sticker = PRAYER_STICKERS.find(item => item.id === activeSticker.stickerId);
        return sticker ? (
          <div key={activeSticker.renderKey} className="prayer-sticker-reaction" role="status" aria-live="polite">
            <PrayerSticker sticker={sticker} pack={activeSticker.pack} />
            <span>{activeSticker.senderName}</span>
          </div>
        ) : null;
      })()}

      <PrayerStickerPicker
        open={stickerPickerOpen}
        pack={stickerPack}
        sending={stickerSending}
        onPackChange={setStickerPack}
        onClose={() => setStickerPickerOpen(false)}
        onSelect={sendSticker}
      />

      {/* Control Bar */}
      <div className="relative z-20 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto flex max-w-sm items-center justify-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2">
          {/* Mute */}
          <IconButton
            onClick={toggleMudo}
            label={mutado ? 'Ativar microfone' : 'Desativar microfone'}
            aria-pressed={mutado}
            className={mutado ? '!bg-[var(--care-soft)] !text-[var(--care)]' : ''}
          >
            {mutado ? <MicOff size={18} /> : <Mic size={18} />}
          </IconButton>

          {/* Câmera */}
          <IconButton
            onClick={toggleVideo}
            label={videoAtivo ? 'Desativar câmera' : 'Ativar câmera'}
            aria-pressed={videoAtivo}
            className={!videoAtivo ? '!bg-[var(--care-soft)] !text-[var(--care)]' : ''}
          >
            {videoAtivo ? <Video size={18} /> : <VideoOff size={18} />}
          </IconButton>

          <IconButton
            onClick={() => setStickerPickerOpen(open => !open)}
            label="Enviar figurinha"
            aria-expanded={stickerPickerOpen}
            className={stickerPickerOpen ? '!bg-[var(--celebration-soft)] !text-[var(--celebration)]' : ''}
          >
            <Sparkles size={18} />
          </IconButton>

          {/* Amém - Encerrar */}
          <Button
            onClick={handleAmem}
            disabled={finalizando}
            variant="danger"
            className="flex-1"
          >
            <PhoneOff size={18} />
            <span>{finalizando ? 'Encerrando...' : 'Encerrar com Amém'}</span>
          </Button>
      </div>
      {invitePicker}
    </div>

      <style>{`
        @keyframes scale-fade {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-fade {
          animation: scale-fade 0.4s ease-out both;
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out both;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
