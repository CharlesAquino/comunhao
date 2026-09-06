import servoFielUrl from '../assets/badges/ServoFiel.svg';
import guardiaoUrl from '../assets/badges/Guardiao.svg';
import intercessorUrl from '../assets/badges/Intercessor.svg';
import atalaiaUrl from '../assets/badges/Atalaia.svg';
import discipuladorUrl from '../assets/badges/Discipulador.svg';
import missionarioUrl from '../assets/badges/Missionario.svg';
import conselheiroUrl from '../assets/badges/Conselheiro.svg';
import pacificadorUrl from '../assets/badges/Pacificador.svg';
import { BADGE_TOKENS, type BadgeRankName, type BadgeSize } from '../assets/badges/badgeTokens';

export type { BadgeRankName } from '../assets/badges/badgeTokens';

interface BadgeRankProps {
  rank: BadgeRankName;
  size?: BadgeSize;
  animated?: boolean;
  className?: string;
}

const BADGES: Record<BadgeRankName, { src: string; label: string }> = {
  'servo-fiel': {
    src: servoFielUrl,
    label: 'Insígnia Servo Fiel',
  },
  guardiao: {
    src: guardiaoUrl,
    label: 'Insígnia Guardião',
  },
  intercessor: {
    src: intercessorUrl,
    label: 'Insígnia Intercessor',
  },
  atalaia: {
    src: atalaiaUrl,
    label: 'Insígnia Atalaia',
  },
  discipulador: {
    src: discipuladorUrl,
    label: 'Insígnia Discipulador',
  },
  missionario: {
    src: missionarioUrl,
    label: 'Insígnia Missionário',
  },
  conselheiro: {
    src: conselheiroUrl,
    label: 'Insígnia Conselheiro',
  },
  pacificador: {
    src: pacificadorUrl,
    label: 'Insígnia Pacificador',
  },
};

function resolveSize(size: BadgeSize): number {
  return typeof size === 'number' ? size : BADGE_TOKENS.sizes[size];
}

export default function BadgeRank({ rank, size = 'standard', animated = false, className = '' }: BadgeRankProps) {
  const badge = BADGES[rank];
  const resolvedSize = resolveSize(size);

  return (
    <img
      src={badge.src}
      width={resolvedSize}
      height={resolvedSize}
      alt={badge.label}
      draggable={false}
      className={`badge-rank ${animated ? 'badge-rank--animated' : ''} ${className}`}
    />
  );
}
