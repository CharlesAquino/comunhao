import { forwardRef, type ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';

export function createSanctuaryIcon(name: string, paths: ReactNode) {
  const Icon = forwardRef<SVGSVGElement, LucideProps>(({
    color = 'currentColor',
    size = 24,
    strokeWidth = 1.7,
    absoluteStrokeWidth,
    ...props
  }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {paths}
    </svg>
  ));
  Icon.displayName = name;
  return Icon;
}
