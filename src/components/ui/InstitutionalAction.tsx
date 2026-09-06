import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface InstitutionalActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  to?: string;
  children: ReactNode;
}

export default function InstitutionalAction({ icon, to, children, className = '', disabled, type = 'button', ...props }: InstitutionalActionProps) {
  const content = <><span className="institutional-action__seal" aria-hidden="true">{icon}</span><span>{children}</span></>;
  const classes = `institutional-action ${className}`;

  if (to) {
    return <Link to={to} className={classes} aria-disabled={disabled || undefined} onClick={disabled ? event => event.preventDefault() : undefined}>{content}</Link>;
  }

  return <button type={type} className={classes} disabled={disabled} {...props}>{content}</button>;
}
