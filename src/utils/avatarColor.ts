const PALETA_AVATAR = [
  '#4a7c6a',
  '#c9974a',
  '#8a5c4a',
  '#5c6f8a',
  '#7a5c8a',
  '#8a7a4a',
  '#4a8a7c',
  '#8a4a5c',
] as const;

export function corAvatar(identificador: string): string {
  let hash = 0;
  for (let i = 0; i < identificador.length; i++) {
    hash = identificador.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETA_AVATAR[Math.abs(hash) % PALETA_AVATAR.length];
}

export function corTextoAvatar(): string {
  return '#f5f1e8';
}
