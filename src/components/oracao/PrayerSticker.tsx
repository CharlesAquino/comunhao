import essencialSprite from '../../assets/stickers/comunhao-essencial-v1.png';
import vibranteSprite from '../../assets/stickers/comunhao-vibrante-v1.png';
import type { PrayerStickerDefinition, PrayerStickerPack } from '../../services/prayerStickerService';

interface PrayerStickerProps {
  sticker: PrayerStickerDefinition;
  pack: PrayerStickerPack;
  className?: string;
}

export default function PrayerSticker({ sticker, pack, className = '' }: PrayerStickerProps) {
  return (
    <span className={`prayer-sticker ${className}`} role="img" aria-label={sticker.label}>
      <img
        src={pack === 'essencial' ? essencialSprite : vibranteSprite}
        alt=""
        aria-hidden="true"
        style={{ left: `${sticker.column * -100}%`, top: `${sticker.row * -100}%` }}
      />
    </span>
  );
}
