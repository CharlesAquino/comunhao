import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpenCheck, Gauge, Menu, ShieldCheck, Store, UsersRound, X } from 'lucide-react';
import { ACTIVE_ADMIN_MODULES } from '../../admin/adminModules';
import { useAdmin } from '../../contexts/AdminContext';
import { getCurrentUserProfile } from '../../services/dataService';
import type { Usuario } from '../../types';
import { corAvatar, corTextoAvatar } from '../../utils/avatarColor';
import ThemeToggle from '../ThemeToggle';
import PageHelp from '../guides/PageHelp';
import AppBrandMark from '../ui/AppBrandMark';

const GROUP_LABELS = {
  supervisao: 'Supervisão',
  conteudo: 'Conteúdo',
  operacao: 'Operação',
  governanca: 'Governança',
} as const;

export default function AdminShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState<Pick<Usuario, 'nome' | 'foto_url' | 'status_anel'> | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { can, roles } = useAdmin();

  const modules = useMemo(() => ACTIVE_ADMIN_MODULES.filter(module => can(module.permission)), [can]);
  const current = [...modules]
    .sort((a, b) => b.to.length - a.to.length)
    .find(module => module.to === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(module.to));

  useEffect(() => {
    let active = true;
    getCurrentUserProfile().then(user => {
      if (active && user) setProfile({ nome: user.nome, foto_url: user.foto_url, status_anel: user.status_anel });
    });
    return () => { active = false; };
  }, []);

  const goBack = () => {
    setMenuOpen(false);
    navigate(location.pathname === '/admin' ? '/' : '/admin');
  };

  const sidebar = (
    <>
      <div className="shrink-0 pt-[var(--safe-area-top)]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <Link to="/admin" className="flex min-w-0 items-center gap-3" onClick={() => setMenuOpen(false)}>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)]">
              <ShieldCheck size={21} className="txt-green" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-base txt-primary">Comunhão Admin</p>
              <p className="truncate text-[11px] txt-muted">Supervisão e governança</p>
            </div>
          </Link>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-xl hover:bg-[var(--surface-elevated)] lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu administrativo"
          >
            <X size={19} />
          </button>
        </div>
      </div>

      <nav className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4" aria-label="Módulos administrativos">
        {(Object.keys(GROUP_LABELS) as Array<keyof typeof GROUP_LABELS>).map(group => {
          const items = modules.filter(module => module.group === group);
          if (!items.length) return null;
          return (
            <section key={group} className="mb-5">
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] txt-muted">
                {GROUP_LABELS[group]}
              </p>
              <div className="space-y-1">
                {items.map(({ to, label, description, Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/admin'}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) => `group flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 transition-premium ${
                      isActive
                        ? 'bg-[var(--accent-soft)] txt-primary ring-1 ring-[var(--green-subtle)]'
                        : 'txt-tertiary hover:bg-[var(--surface-elevated)] hover:txt-primary'
                    }`}
                  >
                    <Icon size={18} className="shrink-0" />
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{label}</span>
                      <span className="hidden truncate text-[10px] txt-muted xl:block">{description}</span>
                    </div>
                  </NavLink>
                ))}
              </div>
            </section>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-[var(--border)] p-3 pb-[calc(0.75rem+var(--safe-area-bottom))]">
        <button
          type="button"
          onClick={goBack}
          className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold txt-tertiary hover:bg-[var(--surface-elevated)] hover:txt-primary"
        >
          <ArrowLeft size={18} /> {location.pathname === '/admin' ? 'Voltar ao aplicativo' : 'Voltar à visão geral'}
        </button>
        <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider txt-muted">Acessos ativos</p>
          <p className="mt-1 truncate text-xs font-semibold txt-primary">
            {roles.length ? roles.join(' · ') : 'Sem papel administrativo'}
          </p>
        </div>
      </div>
    </>
  );

  return (
    <div className="material-app-canvas premium-viewport relative h-[100dvh] min-h-0 overflow-hidden bg-[var(--canvas)] font-sans">
      <div className="premium-atmosphere pointer-events-none fixed inset-0 -z-10 bg-[var(--canvas)]">
        <div className="premium-atmosphere__light premium-atmosphere__light--primary" />
        <div className="premium-atmosphere__light premium-atmosphere__light--secondary" />
        <div className="premium-atmosphere__vignette" />
      </div>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 min-h-0 flex-col border-r border-[var(--border)] bg-[color:var(--surface)/0.96] backdrop-blur-xl lg:flex">
        {sidebar}
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu"
          />
          <aside className="absolute inset-y-0 left-0 flex max-h-[100dvh] w-[min(88vw,21rem)] min-h-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex h-[100dvh] min-h-0 flex-col lg:pl-72">
        <header className="sticky top-0 z-30 shrink-0 border-b border-[var(--border)] bg-[color:var(--canvas)/0.94] pt-[var(--safe-area-top)] backdrop-blur-xl">
          <div className="flex min-h-[4.5rem] items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-2">
              {location.pathname === '/admin' ? (
                <Link to="/" className="shrink-0 rounded-full" aria-label="Voltar ao Comunhão">
                  <AppBrandMark size="sm" className="drop-shadow-none" />
                </Link>
              ) : (
                <button
                  type="button"
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)]"
                  onClick={goBack}
                  aria-label="Voltar à visão geral"
                >
                  <ArrowLeft size={19} />
                </button>
              )}
              <button
                type="button"
                className="button-quiet flex size-10 shrink-0 items-center justify-center rounded-xl lg:hidden"
                onClick={() => setMenuOpen(true)}
                aria-label="Abrir menu administrativo"
              >
                <Menu size={19} />
              </button>
              {location.pathname === '/admin' ? (
                <div className="min-w-0">
                  <p className="truncate text-[10px] txt-tertiary">Boa tarde,</p>
                  <h1 className="truncate font-display text-sm font-semibold txt-primary min-[370px]:text-base sm:text-lg">{profile?.nome ?? 'Administração'}</h1>
                </div>
              ) : (
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] txt-muted sm:text-xs">Administração</p>
                  <h1 className="truncate font-display text-base txt-primary sm:text-lg">{current?.label ?? 'Comunhão'}</h1>
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {location.pathname === '/admin' && profile && (
                <div className="relative block" aria-label={`Perfil de ${profile.nome}`}>
                  <div
                    className="flex size-10 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--celebration)] text-sm font-bold uppercase sm:size-11"
                    style={{ backgroundColor: corAvatar(profile.nome), color: corTextoAvatar() }}
                  >
                    {profile.foto_url ? <img src={profile.foto_url} alt="" className="size-full object-cover" /> : profile.nome.charAt(0)}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-[var(--canvas)] ${profile.status_anel === 'disponivel' ? 'bg-[var(--success)]' : profile.status_anel === 'orando' ? 'bg-[var(--care)]' : 'bg-[var(--text-muted)]'}`} />
                </div>
              )}
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-[96rem] px-4 py-5 pb-3 page-enter sm:px-6 sm:py-7 lg:px-8">
            <Outlet />
            <PageHelp />
          </div>

          {location.pathname !== '/admin/ebd' && <div className="sticky bottom-0 z-20 mt-6 hidden border-t border-[var(--border)] bg-[color:var(--canvas)/0.94] px-4 pt-3 pb-[calc(0.75rem+var(--safe-area-bottom))] backdrop-blur-xl sm:px-6 lg:block lg:px-8">
            <button
              type="button"
              onClick={goBack}
              className="mx-auto flex min-h-12 w-full max-w-[96rem] items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold txt-primary active:scale-[0.99]"
            >
              <ArrowLeft size={18} /> {location.pathname === '/admin' ? 'Voltar ao aplicativo' : 'Voltar à visão geral'}
            </button>
          </div>}
        </main>

        <nav className="sanctuary-nav z-30 grid shrink-0 grid-cols-5 border-t border-[var(--nav-border)] bg-[var(--nav-surface)] px-2 pt-1.5 pb-[calc(0.375rem+var(--safe-area-bottom))] lg:hidden" aria-label="Navegação administrativa">
          {[
            { to: '/admin', label: 'Resumo', Icon: Gauge, end: true },
            { to: '/admin/pessoas', label: 'Pessoas', Icon: UsersRound },
            { to: '/admin/ebd', label: 'Publicar', Icon: BookOpenCheck },
            { to: '/admin/cantina', label: 'Operação', Icon: Store },
          ].map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-semibold transition-premium ${isActive ? 'bg-[var(--nav-active-bg)] text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'}`}>
              <Icon size={18} aria-hidden="true" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
          <button type="button" onClick={() => setMenuOpen(true)} className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-semibold text-[var(--text-secondary)]">
            <Menu size={18} aria-hidden="true" />
            <span>Mais</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
