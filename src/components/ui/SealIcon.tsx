import type { LucideIcon } from 'lucide-react';

interface SealIconProps {
  Icon: LucideIcon;
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'seal-icon--sm',
  md: 'seal-icon--md',
  lg: 'seal-icon--lg',
} as const;

export default function SealIcon({ Icon, active = false, size = 'md', className = '' }: SealIconProps) {
  return (
    <span
      className={`seal-icon ${sizes[size]} ${active ? 'seal-icon--active' : ''} ${className}`}
      aria-hidden="true"
    >
      <Icon className="seal-icon__glyph" />
    </span>
  );
}
