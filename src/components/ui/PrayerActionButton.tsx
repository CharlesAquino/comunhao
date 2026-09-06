import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { PrayerTogetherIcon, RaisedPrayerIcon } from '../icons/SanctuaryIcons';

interface PrayerActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: 'prayer' | 'care';
  label: ReactNode;
  detail?: ReactNode;
  busy?: boolean;
}

export default function PrayerActionButton({
  tone = 'prayer',
  label,
  detail,
  busy = false,
  className = '',
  type = 'button',
  ...props
}: PrayerActionButtonProps) {
  const ActionIcon = tone === 'prayer' ? PrayerTogetherIcon : RaisedPrayerIcon;

  return (
    <button
      type={type}
      className={`prayer-action prayer-action--${tone} ${className}`}
      aria-busy={busy}
      {...props}
    >
      <span className="prayer-action__notch" aria-hidden="true" />
      <span className="prayer-action__mark" aria-hidden="true">
        <ActionIcon />
      </span>
      <span className="prayer-action__copy">
        <span className="prayer-action__label">{label}</span>
        {detail && <span className="prayer-action__detail">{detail}</span>}
      </span>
      <span className="prayer-action__ray" aria-hidden="true" />
    </button>
  );
}
