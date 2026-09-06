export const PRAYER_STICKER_TOPIC = 'comunhao.prayer-sticker.v1';

export type PrayerStickerPack = 'essencial' | 'vibrante';

export interface PrayerStickerDefinition {
  id: string;
  label: string;
  column: number;
  row: number;
}

export interface PrayerStickerMessage {
  type: 'prayer-sticker';
  version: 1;
  stickerId: string;
  pack: PrayerStickerPack;
  sentAt: number;
}

export const PRAYER_STICKERS: PrayerStickerDefinition[] = [
  { id: 'eita-gloria', label: 'Eita glória!', column: 0, row: 0 },
  { id: 'aleluia', label: 'Aleluia!', column: 1, row: 0 },
  { id: 'amem', label: 'Amém!', column: 2, row: 0 },
  { id: 'paz-do-senhor', label: 'A paz do Senhor', column: 3, row: 0 },
  { id: 'deus-e-fiel', label: 'Deus é fiel', column: 0, row: 1 },
  { id: 'estou-orando', label: 'Estou orando', column: 1, row: 1 },
  { id: 'conte-comigo', label: 'Conte comigo', column: 2, row: 1 },
  { id: 'recebo', label: 'Recebo!', column: 3, row: 1 },
  { id: 'fogo-santo', label: 'Fogo Santo', column: 0, row: 2 },
  { id: 'renovo', label: 'Renovo', column: 1, row: 2 },
  { id: 'avivamento', label: 'Avivamento', column: 2, row: 2 },
  { id: 'marchando-em-fe', label: 'Marchando em fé', column: 3, row: 2 },
  { id: 'vitoria', label: 'Vitória!', column: 0, row: 3 },
  { id: 'gloria-a-deus', label: 'Glória a Deus!', column: 1, row: 3 },
  { id: 'de-joelhos', label: 'De joelhos', column: 2, row: 3 },
  { id: 'juntos-em-oracao', label: 'Juntos em oração', column: 3, row: 3 },
];

export function encodePrayerSticker(message: PrayerStickerMessage): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(JSON.stringify(message));
}

export function decodePrayerSticker(payload: Uint8Array): PrayerStickerMessage | null {
  try {
    const candidate = JSON.parse(new TextDecoder().decode(payload)) as Partial<PrayerStickerMessage>;
    const knownSticker = PRAYER_STICKERS.some(sticker => sticker.id === candidate.stickerId);
    if (candidate.type !== 'prayer-sticker' || candidate.version !== 1 || !knownSticker) return null;
    if (candidate.pack !== 'essencial' && candidate.pack !== 'vibrante') return null;
    if (typeof candidate.sentAt !== 'number') return null;
    return candidate as PrayerStickerMessage;
  } catch {
    return null;
  }
}
