import { useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

type SecureActionButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
  children: ReactNode;
  pendingLabel?: string;
  cooldownMs?: number;
  onSecureAction: () => Promise<void> | void;
};

/**
 * Barreira de UX contra cliques duplicados. Não substitui idempotência no servidor.
 */
export function SecureActionButton({
  children,
  pendingLabel = 'Processando…',
  cooldownMs = 800,
  onSecureAction,
  disabled,
  ...buttonProps
}: SecureActionButtonProps) {
  const [pending, setPending] = useState(false);
  const lastInvocationAt = useRef(0);

  const handleClick = async () => {
    const now = Date.now();
    if (pending || now - lastInvocationAt.current < cooldownMs) return;

    lastInvocationAt.current = now;
    setPending(true);
    try {
      await onSecureAction();
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      {...buttonProps}
      type={buttonProps.type ?? 'button'}
      disabled={disabled || pending}
      aria-busy={pending}
      data-security-state={pending ? 'processing' : 'ready'}
      onClick={handleClick}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
