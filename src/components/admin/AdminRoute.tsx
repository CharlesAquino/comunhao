import { Link, Outlet } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import type { AdminPermission } from '../../types/admin';

interface AdminRouteProps {
  permission?: AdminPermission;
}

export default function AdminRoute({ permission = 'admin.access' }: AdminRouteProps) {
  const { checking, can } = useAdmin();

  if (checking) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--canvas)]">
        <div className="size-9 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
      </div>
    );
  }

  if (!can(permission)) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--canvas)] px-5">
        <div className="card-surface elevation-2 w-full max-w-md p-7 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-rose-500/10">
            <ShieldAlert className="text-rose-400" size={24} />
          </div>
          <h1 className="font-display text-xl txt-primary">Acesso não autorizado</h1>
          <p className="mt-2 text-sm txt-tertiary">
            Seu perfil não possui a permissão <strong>{permission}</strong>.
          </p>
          <Link to="/" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--accent-primary)] px-5 text-sm font-bold text-white">Voltar ao aplicativo</Link>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
