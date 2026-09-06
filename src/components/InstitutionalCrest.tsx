import { useId } from 'react';
import { INSTITUTIONAL_CREST_LABELS, type InstitutionalCrestKind } from '../services/institutionalCrestRules';

interface InstitutionalCrestProps {
  kind: InstitutionalCrestKind;
  size?: number;
  className?: string;
}

export default function InstitutionalCrest({ kind, size = 44, className = '' }: InstitutionalCrestProps) {
  const label = INSTITUTIONAL_CREST_LABELS[kind];
  const id = useId().replace(/:/g, '');
  const metalId = `${id}-metal`;
  const fieldId = `${id}-field`;
  const enamelId = `${id}-enamel`;
  const glowId = `${id}-glow`;
  const haloId = `${id}-halo`;
  const pastoral = kind === 'pastoral';
  const colors = kind === 'administrador'
    ? {
        metalLight: '#fff0b8', metalMid: '#c99a3d', metalBright: '#f7d77e', metalDark: '#765017', metalEnd: '#d8ae55',
        fieldLight: '#4d3276', fieldMid: '#251842', enamelLight: '#68458f', enamelMid: '#382457',
        glow: '#c69cff', symbol: '#fff2c7', accent: '#f0c969',
      }
    : pastoral
      ? {
          metalLight: '#ffe7dc', metalMid: '#b97767', metalBright: '#efb8a5', metalDark: '#6f382f', metalEnd: '#cf8f7d',
          fieldLight: '#742f43', fieldMid: '#3d1726', enamelLight: '#934159', enamelMid: '#572238',
          glow: '#ff9fbd', symbol: '#fff0e9', accent: '#f1ad9c',
        }
      : {
          metalLight: '#edf5ff', metalMid: '#8099b4', metalBright: '#cbd9e8', metalDark: '#43586e', metalEnd: '#9db1c5',
          fieldLight: '#254e78', fieldMid: '#142b49', enamelLight: '#356a99', enamelMid: '#1c4269',
          glow: '#82c5ff', symbol: '#edf7ff', accent: '#9dc8ea',
        };

  return (
    <svg
      viewBox="0 0 64 72"
      width={size}
      height={Math.round(size * 1.125)}
      role="img"
      aria-label={label}
      className={`institutional-crest institutional-crest--${kind} ${className}`}
    >
      <title>{label}</title>
      <defs>
        <linearGradient id={metalId} x1="8" y1="8" x2="55" y2="61" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={colors.metalLight} />
          <stop offset="0.2" stopColor={colors.metalMid} />
          <stop offset="0.46" stopColor={colors.metalBright} />
          <stop offset="0.72" stopColor={colors.metalDark} />
          <stop offset="1" stopColor={colors.metalEnd} />
        </linearGradient>
        <linearGradient id={fieldId} x1="17" y1="14" x2="48" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor={colors.fieldLight} />
          <stop offset="0.5" stopColor={colors.fieldMid} />
          <stop offset="1" stopColor="#0b0912" />
        </linearGradient>
        <radialGradient id={enamelId} cx="0" cy="0" r="1" gradientTransform="translate(27 25) rotate(61) scale(34 25)" gradientUnits="userSpaceOnUse">
          <stop stopColor={colors.enamelLight} />
          <stop offset="0.62" stopColor={colors.enamelMid} />
          <stop offset="1" stopColor="#0d0a14" />
        </radialGradient>
        <radialGradient id={glowId} cx="32" cy="34" r="19" gradientUnits="userSpaceOnUse">
          <stop stopColor={colors.glow} stopOpacity="0.3" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={haloId} cx="32" cy="36" r="42" gradientUnits="userSpaceOnUse">
          <stop stopColor={colors.glow} stopOpacity="0.92" />
          <stop offset="0.34" stopColor={colors.glow} stopOpacity="0.52" />
          <stop offset="0.7" stopColor={colors.glow} stopOpacity="0.16" />
          <stop offset="1" stopColor={colors.glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse className="institutional-crest__aura" cx="32" cy="36" rx="39" ry="42" fill={`url(#${haloId})`} />
      <ellipse className="institutional-crest__halo" cx="32" cy="35" rx="28" ry="31" fill={`url(#${haloId})`} />
      <path className="institutional-crest__shadow" d="M32 2 58 12v22c0 17-10.7 29.6-26 36C16.7 63.6 6 51 6 34V12L32 2Z" />
      <path className="institutional-crest__rim" style={{ fill: `url(#${metalId})` }} d="M32 5.5 54.5 14v20c0 14.5-8.7 25.8-22.5 32.1C18.2 59.8 9.5 48.5 9.5 34V14L32 5.5Z" />
      <path className="institutional-crest__bevel" d="M32 8.3 52 15.8v18.1c0 13.1-7.7 23.4-20 29.4-12.3-6-20-16.3-20-29.4V15.8L32 8.3Z" />
      <path className="institutional-crest__field" style={{ fill: `url(#${fieldId})` }} d="M32 10 50 16.8v17c0 11.8-6.7 21.2-18 27-11.3-5.8-18-15.2-18-27v-17L32 10Z" />
      <path className="institutional-crest__inner" style={{ fill: `url(#${enamelId})` }} d="M32 14.5 46 19.8v13.6c0 9.4-5 17-14 22.1-9-5.1-14-12.7-14-22.1V19.8L32 14.5Z" />
      <path fill={`url(#${glowId})`} d="M32 14.5 46 19.8v13.6c0 9.4-5 17-14 22.1-9-5.1-14-12.7-14-22.1V19.8L32 14.5Z" />
      <path className="institutional-crest__shine" d="M16.7 19.5 32 13.7l5.5 2.1c-9.7 2.3-15.7 8-18.6 17.2V21.2l-2.2-1.7Z" />
      <g className="institutional-crest__rivets" style={{ fill: colors.accent, stroke: colors.metalDark }}>
        <circle cx="15.3" cy="19" r="1" /><circle cx="48.7" cy="19" r="1" />
        <circle cx="13.6" cy="35" r="1" /><circle cx="50.4" cy="35" r="1" />
      </g>

      {kind === 'administrador' && (
        <g>
          <g className="institutional-crest__laurel" style={{ stroke: colors.accent }}>
            <path d="M19.5 49c-3.6-5.8-4.2-12-2-18.6M44.5 49c3.6-5.8 4.2-12 2-18.6" />
            <path d="m17.4 43-3-2m3.3-4.3-2.7-2.4m3.8-3.5-2.1-2.7M46.6 43l3-2m-3.3-4.3 2.7-2.4m-3.8-3.5 2.1-2.7" />
          </g>
          <g className="institutional-crest__symbol" style={{ stroke: colors.symbol }}>
          <path d="M22 26.2c3.5-4 6.8-6 10-6s6.5 2 10 6" />
          <path d="M24.5 46.5V30.7M39.5 46.5V30.7M21.5 46.5h21" />
          <path d="M22.5 29.5h19M27 30v16M37 30v16" opacity=".55" />
          <path className="institutional-crest__flame" style={{ fill: colors.accent, stroke: colors.symbol }} d="M32 27c.9 4-3.8 5.7-3.8 10.2a3.8 3.8 0 0 0 7.6 0c0-2.3-1.2-4-2.3-5.3.1 2-1.2 2.8-1.2 2.8.9-3.8-.3-7.7-.3-7.7Z" />
          </g>
        </g>
      )}

      {kind === 'pastoral' && (
        <g className="institutional-crest__symbol" style={{ stroke: colors.symbol }}>
          <path d="M37 20.5c6.4 0 8 8.2 2.3 11.1-2.2 1.1-5 .4-6.1-1.7" />
          <path d="M33.5 20.5v27.5M36 21v27" />
          <path d="M22 25.5c2.3-2 4.7-3.2 7-3.5M21 45c2.2 1.7 4.5 2.8 7 3.2" opacity=".55" />
          <path className="institutional-crest__flame" style={{ fill: colors.accent, stroke: colors.symbol }} d="M30.5 43.5c-6.8-4.2-9.7-7.7-9.7-11.3 0-4.8 6.1-6.6 9.7-2.3 3.6-4.3 9.7-2.5 9.7 2.3 0 3.6-2.9 7.1-9.7 11.3Z" />
          <path d="m27.5 35 2 2 4-5" strokeWidth="1.4" />
        </g>
      )}

      {kind === 'equipe' && (
        <g className="institutional-crest__symbol" style={{ stroke: colors.symbol }}>
          <path d="M21 26h22M23.5 26v20M40.5 26v20M20 46h24M21.5 23.5 32 19l10.5 4.5" />
          <path d="M27 27v18M37 27v18" opacity=".55" />
          <path className="institutional-crest__flame" style={{ fill: colors.accent, stroke: colors.symbol }} d="m32 29 5.5 5.5L32 40l-5.5-5.5L32 29Zm0 4-1.5 1.5L32 36l1.5-1.5L32 33Z" />
        </g>
      )}

      <path className="institutional-crest__banner" style={{ fill: `url(#${metalId})` }} d="M23 55.5c5.8 2 12.2 2 18 0l-1.3 6.2c-5.1 2.1-10.3 2.1-15.4 0L23 55.5Z" />
      <circle className="institutional-crest__seal" style={{ fill: colors.accent, stroke: colors.metalDark }} cx="32" cy="59.2" r="2.2" />
      <path className="institutional-crest__seal-mark" style={{ stroke: colors.fieldMid }} d="m30.8 59.2.8.8 1.7-2" />
    </svg>
  );
}
