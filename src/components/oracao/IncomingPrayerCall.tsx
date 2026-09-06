import { PhoneOff, ShieldCheck, Video, VideoOff } from 'lucide-react';
import { createPortal } from 'react-dom';
import comunhaoEmblem from '../../assets/brand/luz-compartilhada-emblem.webp';

interface IncomingPrayerCallProps {
  nome: string;
  fotoUrl?: string | null;
  origem?: string;
  tipoConexao?: 'aceite' | 'voz' | 'video' | null;
  processando?: boolean;
  onAcceptVideo: () => void;
  onAcceptAudio: () => void;
  onDecline: () => void;
}

export default function IncomingPrayerCall({
  nome,
  fotoUrl,
  origem = 'DUPLA DA SEMANA',
  tipoConexao = 'video',
  processando = false,
  onAcceptVideo,
  onAcceptAudio,
  onDecline,
}: IncomingPrayerCallProps) {
  const dialog = (
    <section className="prayer-incoming" role="dialog" aria-modal="true" aria-labelledby="prayer-incoming-title">
      <div className="prayer-incoming__content">
        <img className="prayer-incoming__emblem" src={comunhaoEmblem} alt="Comunhão" />

        <div className="prayer-incoming__portrait" aria-hidden={!fotoUrl}>
          {fotoUrl
            ? <img src={fotoUrl} alt={`Foto de ${nome}`} />
            : <span>{nome.trim().charAt(0).toUpperCase()}</span>}
        </div>

        <div className="prayer-incoming__copy">
          <p className="prayer-incoming__eyebrow">{origem}</p>
          <h1 id="prayer-incoming-title">{nome}</h1>
          <p className="prayer-incoming__invitation">
            convidou você para {tipoConexao === 'video' ? 'uma oração por vídeo' : tipoConexao === 'voz' ? 'uma oração por voz' : 'orar em conjunto'}
          </p>
          <p className="prayer-incoming__privacy">
            <ShieldCheck aria-hidden="true" size={19} />
            Sua câmera só será ativada após sua confirmação.
          </p>
          <p className="prayer-incoming__status"><span aria-hidden="true" />Chamando agora</p>
        </div>

        <div className="prayer-incoming__actions">
          <button type="button" className="prayer-incoming__action prayer-incoming__action--decline" onClick={onDecline} disabled={processando}>
            <span><PhoneOff size={22} /></span>
            Recusar
          </button>
          <button type="button" className="prayer-incoming__action prayer-incoming__action--primary" onClick={onAcceptVideo} disabled={processando}>
            <span><Video size={22} /></span>
            {processando ? 'Preparando…' : 'Aceitar com vídeo'}
          </button>
          <button type="button" className="prayer-incoming__action prayer-incoming__action--audio" onClick={onAcceptAudio} disabled={processando}>
            <span><VideoOff size={22} /></span>
            Entrar sem câmera
          </button>
        </div>
      </div>
    </section>
  );

  // A Home possui superfícies espaciais com transform. Um elemento fixed dentro
  // delas cria um bloco de contenção local e pode ficar preso atrás da navegação
  // global. O portal posiciona a chamada na camada modal real do aplicativo.
  return createPortal(dialog, document.body);
}
