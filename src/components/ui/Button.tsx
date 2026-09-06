import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'button-seal--primary',
  secondary: 'button-seal--secondary',
  ghost: 'button-seal--ghost',
  danger: 'button-seal--danger',
  icon: 'button-seal--icon',
};

export default function Button({ variant = 'primary', className = '', children, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`button-seal inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold transition-premium disabled:pointer-events-none ${variants[variant]} ${variant === 'icon' ? 'min-w-11 px-0' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
