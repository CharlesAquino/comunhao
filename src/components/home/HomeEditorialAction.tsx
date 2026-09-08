import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface HomeEditorialActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: ReactNode;
}

/**
 * CTA editorial compacto.
 * Mantém a mesma linguagem visual do botão "Orar com ..." da Missão,
 * reduzindo apenas escala, ícone e espaçamento para EBD/Estudos.
 */
export default function HomeEditorialAction({
  icon,
  label,
  className = '',
  type = 'button',
  ...props
}: HomeEditorialActionProps) {
  return (
    <button
      type={type}
      className={`prayer-action prayer-action--prayer home-editorial-action ${className}`}
      {...props}
    >
      <span className="prayer-action__notch" aria-hidden="true" />
      <span className="prayer-action__mark" aria-hidden="true">
        {icon}
      </span>
      <span className="prayer-action__copy">
        <span className="prayer-action__label">{label}</span>
      </span>
      <span className="prayer-action__ray" aria-hidden="true" />
    </button>
  );
}
