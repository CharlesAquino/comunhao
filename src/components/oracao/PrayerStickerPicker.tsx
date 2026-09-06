import { X } from 'lucide-react';
import { PRAYER_STICKERS, type PrayerStickerDefinition, type PrayerStickerPack } from '../../services/prayerStickerService';
import IconButton from '../ui/IconButton';
import PrayerSticker from './PrayerSticker';

interface PrayerStickerPickerProps {
  open: boolean;
  pack: PrayerStickerPack;
  sending: boolean;
  onPackChange: (pack: PrayerStickerPack) => void;
  onClose: () => void;
  onSelect: (sticker: PrayerStickerDefinition) => void;
  context?: 'room' | 'chat';
}

export default function PrayerStickerPicker({ open, pack, sending, onPackChange, onClose, onSelect, context = 'room' }: PrayerStickerPickerProps) {
  if (!open) return null;
  return (
    <section className="prayer-sticker-picker" aria-label="Figurinhas para a oração">
      <header>
        <div>
          <span>FIGURINHAS DA COMUNHÃO</span>
          <h2>{context === 'chat' ? 'Envie uma figurinha' : 'Expresse este momento'}</h2>
        </div>
        <IconButton onClick={onClose} label="Fechar figurinhas"><X size={18} /></IconButton>
      </header>
      <div className="prayer-sticker-picker__tabs" role="tablist" aria-label="Estilo das figurinhas">
        {(['essencial', 'vibrante'] as const).map(option => (
          <button key={option} type="button" role="tab" aria-selected={pack === option} onClick={() => onPackChange(option)}>
            {option === 'essencial' ? 'Essencial' : 'Vibrante'}
          </button>
        ))}
      </div>
      <div className="prayer-sticker-picker__grid">
        {PRAYER_STICKERS.map(sticker => (
          <button key={sticker.id} type="button" onClick={() => onSelect(sticker)} disabled={sending} aria-label={`Enviar ${sticker.label}`}>
            <PrayerSticker sticker={sticker} pack={pack} />
          </button>
        ))}
      </div>
      <p>{context === 'chat' ? 'A figurinha ficará salva nesta conversa.' : 'As reações aparecem somente durante esta chamada.'}</p>
    </section>
  );
}
