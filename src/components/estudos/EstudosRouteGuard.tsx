import { Link, Outlet } from 'react-router-dom';
import { BookOpen, Sparkles, ArrowLeft } from 'lucide-react';
import { useAdmin } from '../../contexts/AdminContext';
import Card from '../ui/Card';

export default function EstudosRouteGuard() {
  const { checking, isAdmin, can, hasAdminAccess } = useAdmin();

  if (checking) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <div className="size-9 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
      </div>
    );
  }

  const hasAccess = isAdmin || can('estudos.manage') || can('estudos.review') || hasAdminAccess;

  if (!hasAccess) {
    return (
      <main className="container-theme mx-auto max-w-lg px-4 py-12">
        <Card className="spatial-section spatial-section--raised relic-surface p-6 sm:p-8 text-center space-y-5">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-primary)]">
            <BookOpen size={30} />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-primary)]">
              <Sparkles size={13} />
              Em preparação editorial
            </span>
            <h1 className="font-display text-2xl font-bold txt-primary sm:text-3xl">
              Estudos Bíblicos
            </h1>
            <p className="text-sm leading-relaxed txt-secondary max-w-sm mx-auto">
              Este conteúdo está em fase de estruturação e modelo editorial. O acesso completo aos módulos e aulas será liberado em breve para toda a comunidade.
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/"
              className="button-primary inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold"
            >
              <ArrowLeft size={16} />
              Voltar ao Início
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  return <Outlet />;
}
