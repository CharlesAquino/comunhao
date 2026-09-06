import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

export default function IconButton({ label, children, className = '', type = 'button', ...props }: Props) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`button-seal button-seal--icon inline-flex size-11 items-center justify-center transition-premium ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
