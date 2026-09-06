import { describe, expect, it } from 'vitest';
import { decodePrayerSticker, encodePrayerSticker, PRAYER_STICKERS, type PrayerStickerMessage } from '../services/prayerStickerService';

describe('prayerStickerService', () => {
  it('codifica e valida uma figurinha conhecida', () => {
    const message: PrayerStickerMessage = { type: 'prayer-sticker', version: 1, stickerId: 'amem', pack: 'vibrante', sentAt: 123 };
    expect(decodePrayerSticker(encodePrayerSticker(message))).toEqual(message);
  });

  it('rejeita pacotes adulterados ou figurinhas desconhecidas', () => {
    expect(decodePrayerSticker(new TextEncoder().encode('{"type":"prayer-sticker","version":1,"stickerId":"x","pack":"vibrante","sentAt":1}'))).toBeNull();
    expect(decodePrayerSticker(new Uint8Array([255]))).toBeNull();
  });

  it('mantém as dezesseis reações aprovadas', () => {
    expect(PRAYER_STICKERS).toHaveLength(16);
  });
});
