import { describe, expect, it } from 'vitest';
import { normalizeMuralMediaRelation, type MuralMediaRow } from '../services/muralSocial';

const media: MuralMediaRow = {
  id: 'media-1',
  storage_path: 'usuario/publicacao/feed.webp',
  mime_type: 'image/webp',
  largura: 1080,
  altura: 1350,
  tamanho_bytes: 240000,
  texto_alternativo: null,
};

describe('relação de mídia do Mural', () => {
  it('aceita relação um-para-um retornada como objeto pelo PostgREST', () => {
    expect(normalizeMuralMediaRelation(media)).toEqual(media);
  });

  it('mantém compatibilidade com relação retornada como array', () => {
    expect(normalizeMuralMediaRelation([media])).toEqual(media);
    expect(normalizeMuralMediaRelation([])).toBeNull();
  });
});
