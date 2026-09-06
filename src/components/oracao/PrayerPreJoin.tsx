import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Mic, MicOff, ShieldCheck, UserPlus, Video, VideoOff } from 'lucide-react';
import comunhaoEmblem from '../../assets/brand/luz-compartilhada-emblem.webp';
import Button from '../ui/Button';

interface PrayerPreJoinProps {
  initialVideo: boolean;
  onBack: () => void;
  onEnter: (settings: { microphone: boolean; camera: boolean }) => void;
  onInvite?: () => void;
}

export default function PrayerPreJoin({ initialVideo, onBack, onEnter, onInvite }: PrayerPreJoinProps) {
  const [camera, setCamera] = useState(initialVideo);
  const [microphone, setMicrophone] = useState(true);
  const [error, setError] = useState('');
  const [preparing, setPreparing] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let active = true;
    async function prepare() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: initialVideo });
        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (cause) {
        setCamera(false);
        setMicrophone(false);
        setError(cause instanceof Error && /permission|notallowed/i.test(cause.message)
          ? 'Autorize microfone e câmera para revisar sua entrada.'
          : 'Não foi possível preparar a prévia neste aparelho.');
      } finally {
        if (active) setPreparing(false);
      }
    }
    void prepare();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [initialVideo]);

  const toggleCamera = async () => {
    const stream = streamRef.current;
    if (!stream) return;
    const currentTrack = stream.getVideoTracks()[0];
    if (currentTrack) {
      currentTrack.enabled = !camera;
      setCamera(!camera);
      return;
    }
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const track = videoStream.getVideoTracks()[0];
      stream.addTrack(track);
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCamera(true);
      setError('');
    } catch {
      setError('Permita o uso da câmera nas configurações do aplicativo.');
    }
  };

  const toggleMicrophone = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !microphone;
    setMicrophone(!microphone);
  };

  const enter = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    onEnter({ microphone, camera });
  };

  return (
    <main className="prayer-prejoin">
      <div className="prayer-prejoin__topbar">
        <button type="button" onClick={onBack} aria-label="Voltar"><ArrowLeft size={20} /></button>
        <img src={comunhaoEmblem} alt="Comunhão" />
        <span />
      </div>

      <section className="prayer-prejoin__body" aria-labelledby="prejoin-title">
        <div className="prayer-prejoin__preview">
          <video ref={videoRef} autoPlay muted playsInline className={camera ? '' : 'is-hidden'} />
          {!camera && <div className="prayer-prejoin__camera-off"><VideoOff size={34} /><span>Câmera desligada</span></div>}
          {preparing && <div className="prayer-prejoin__preparing">Preparando dispositivos…</div>}
        </div>

        <div className="prayer-prejoin__controls" aria-label="Controles de entrada">
          <button type="button" onClick={toggleMicrophone} aria-pressed={!microphone}>
            {microphone ? <Mic size={21} /> : <MicOff size={21} />}
            <span>{microphone ? 'Microfone ligado' : 'Microfone desligado'}</span>
          </button>
          <button type="button" onClick={toggleCamera} aria-pressed={!camera}>
            {camera ? <Video size={21} /> : <VideoOff size={21} />}
            <span>{camera ? 'Câmera ligada' : 'Câmera desligada'}</span>
          </button>
        </div>

        <div className="prayer-prejoin__copy">
          <p>ANTES DE ENTRAR</p>
          <h1 id="prejoin-title">Tudo pronto para orar?</h1>
          <span><ShieldCheck size={17} /> Você controla o que deseja compartilhar.</span>
          {error && <strong role="alert">{error}</strong>}
        </div>

        <Button className="prayer-prejoin__enter" onClick={enter} disabled={preparing || (!microphone && !camera)}>
          Entrar na oração
        </Button>
        {onInvite && <Button variant="secondary" className="w-full" onClick={onInvite}><UserPlus size={18} /> Convidar alguém</Button>}
      </section>
    </main>
  );
}
