import { describe, expect, it } from 'vitest';
import { getProfileCover, normalizeProfileCover, PROFILE_COVERS, PROFILE_COVER_IDS } from '../services/profileCovers';

describe('capas públicas de perfil', () => {
  it('mantém o catálogo e os identificadores sincronizados', () => {
    expect(PROFILE_COVERS.map(option => option.id)).toEqual(PROFILE_COVER_IDS);
  });

  it('preserva uma capa válida', () => {
    expect(normalizeProfileCover('ensino')).toBe('ensino');
    expect(getProfileCover('ensino').imageUrl).toBe('/profile-covers/ensino.webp');
    expect(getProfileCover('ensino').lightImageUrl).toBe('/profile-covers/ensino-light.webp');
  });

  it('oferece pares claro e escuro para as novas capas', () => {
    for (const id of [
      'oliveira', 'vitral', 'aguas-tranquilas', 'refugio', 'vigilia',
      'caminho', 'luz-serena', 'adoracao', 'louvor-acustico', 'devocional',
    ] as const) {
      expect(getProfileCover(id).imageUrl).toBe(`/profile-covers/${id}.webp`);
      expect(getProfileCover(id).lightImageUrl).toBe(`/profile-covers/${id}-light.webp`);
    }
  });

  it('usa a identidade essencial para valores ausentes ou desconhecidos', () => {
    expect(normalizeProfileCover(null)).toBe('neutro');
    expect(normalizeProfileCover('administrador')).toBe('neutro');
    expect(getProfileCover('administrador').imageUrl).toBeNull();
    expect(getProfileCover('administrador').lightImageUrl).toBeNull();
  });
});
