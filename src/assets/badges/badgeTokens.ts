export const BADGE_TOKENS = {
  viewBox: '0 0 64 64',
  sizes: {
    compact: 24,
    standard: 32,
    featured: 48,
  },
  geometry: {
    outerStroke: 1.25,
    innerStroke: 1,
    symbolStroke: 2,
    shieldRadius: 8,
  },
  colors: {
    antiqueGoldLight: '#C3A067',
    antiqueGold: '#926B38',
    antiqueGoldDark: '#684725',
    sage: '#7F9A75',
    mossLight: '#314C3B',
    moss: '#1F382C',
    mossDark: '#172B22',
    copper: '#9B6540',
    amber: '#B1844D',
    ivory: '#FFF8E8',
    ivoryShade: '#D9D0B8',
    depth: '#0E1D17',
  },
  gradients: {
    base: ['#314C3B', '#1F382C', '#172B22'],
    border: ['#C3A067', '#926B38', '#684725'],
    symbol: ['#FFF8E8', '#D9D0B8'],
  },
  depth: {
    offsetY: 1.5,
    opacity: 0.72,
  },
  ranks: {
    'servo-fiel': { symbol: 'oliveira', secondary: '#B1844D' },
    guardiao: { symbol: 'escudo-e-cruz', secondary: '#7F9A75' },
    intercessor: { symbol: 'chama', secondary: '#9B6540' },
    atalaia: { symbol: 'trombeta', secondary: '#B1844D' },
    discipulador: { symbol: 'trigo', secondary: '#C3A067' },
    missionario: { symbol: 'estrela-direcional', secondary: '#D9D0B8' },
    conselheiro: { symbol: 'lampada', secondary: '#B1844D' },
    pacificador: { symbol: 'pomba', secondary: '#7F9A75' },
  },
} as const;

export type BadgeSize = keyof typeof BADGE_TOKENS.sizes | number;
export type BadgeRankName = keyof typeof BADGE_TOKENS.ranks;
