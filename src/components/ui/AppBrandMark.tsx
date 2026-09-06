type AppBrandMarkProps = {
  size?: 'sm' | 'md';
  className?: string;
};

const sizeClasses = {
  sm: 'size-10',
  md: 'size-11',
} as const;

export default function AppBrandMark({ size = 'md', className = '' }: AppBrandMarkProps) {
  return (
    <img
      src="/brand/favicon-64.png"
      alt=""
      aria-hidden="true"
      className={`${sizeClasses[size]} shrink-0 rounded-full object-cover drop-shadow-[0_5px_12px_rgba(0,0,0,0.38)] ${className}`}
    />
  );
}
