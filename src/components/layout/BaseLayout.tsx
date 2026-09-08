import { useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, MessageCircle, UserRound, BookOpen, ShoppingBag, ShieldCheck } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import KesefDisplay from '../KesefDisplay';
import { useAdmin } from '../../contexts/AdminContext';
import SealIcon from '../ui/SealIcon';
import MessageInboxButton from '../MessageInboxButton';
import NotificationCenterButton from '../NotificationCenterButton';
import PageHelp from '../guides/PageHelp';
import LamparinaDock from './LamparinaDock';

const NAV_ITEMS = [
  { to: '/', label: 'Início', Icon: Home },
  { to: '/mural', label: 'Mural', Icon: MessageCircle },
  { to: '/ebd', label: 'EBD', Icon: BookOpen },
  { to: '/loja', label: 'Tesouro', Icon: ShoppingBag },
  { to: '/perfil', label: 'Perfil', Icon: UserRound },
] as const;

const ENVIRONMENT_ROUTES = new Set([
  '/',
  '/mural',
  '/ebd',
  '/loja',
  '/perfil',
  '/configuracoes',
  '/oracao',
  '/mensagens',
  '/carteira',
]);

export default function BaseLayout() {
  useEffect(() => {
    const root = document.documentElement;
    const updateViewport = () => {
      const viewport = window.visualViewport;
      const height = viewport?.height ?? window.innerHeight;
      const offsetTop = viewport?.offsetTop ?? 0;
      root.style.setProperty('--app-viewport-height', `${Math.round(height)}px`);
      root.style.setProperty('--app-viewport-offset-top', `${Math.round(offsetTop)}px`);
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    window.visualViewport?.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('scroll', updateViewport);

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      window.visualViewport?.removeEventListener('resize', updateViewport);
      window.visualViewport?.removeEventListener('scroll', updateViewport);
    };
  }, []);
  const location = useLocation();
  const { hasAdminAccess } = useAdmin();
  const hasSharedEnvironment = ENVIRONMENT_ROUTES.has(location.pathname)
    || location.pathname.startsWith('/perfil/');

  useEffect(() => {
    const prefetchPrimaryRoutes = () => {
      void Promise.allSettled([
        import('../../pages/Home'),
        import('../../pages/Mural'),
        import('../../pages/EBD'),
        import('../../pages/ComunhaoEstudos'),
        import('../../pages/Loja'),
        import('../../pages/Perfil'),
        import('../../pages/Configuracoes'),
        import('../../pages/PerfilUsuario'),
        import('../../pages/CentralOracao'),
        import('../../pages/Mensagens'),
        import('../../pages/Carteira'),
      ]);
    };
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const idleId = idleWindow.requestIdleCallback?.(prefetchPrimaryRoutes, { timeout: 1200 });
    const timeoutId = idleId === undefined ? window.setTimeout(prefetchPrimaryRoutes, 250) : undefined;

    return () => {
      if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  const isActive = (path: string): boolean => location.pathname === path;

  return (
    <div className={`app-shell ${location.pathname === '/' ? 'app-shell--home' : ''} premium-viewport relative mx-auto flex flex-col overflow-hidden font-sans ${hasSharedEnvironment ? 'bg-transparent' : 'material-app-canvas'}`}>
      
      {/* Atmosfera visual compartilhada pelos dois temas */}
      {!hasSharedEnvironment && (
        <div className="premium-atmosphere pointer-events-none absolute inset-0 -z-10 bg-[var(--canvas)]">
          <div className="premium-atmosphere__light premium-atmosphere__light--primary" />
          <div className="premium-atmosphere__light premium-atmosphere__light--secondary" />
          <div className="premium-atmosphere__vignette" />
        </div>
      )}

      {hasSharedEnvironment && (
        <div className="shared-louvor-environment" aria-hidden="true" />
      )}

      {/* Aurora Espiritual Dinâmica — Santuário Contemporâneo */}
      <div className="sanctuary-spiritual-aurora" aria-hidden="true">
        <div className="sanctuary-spiritual-aurora__glow sanctuary-spiritual-aurora__glow--amber" />
        <div className="sanctuary-spiritual-aurora__glow sanctuary-spiritual-aurora__glow--emerald" />
      </div>

      {/* Container Principal com animação de entrada */}
      {/* Não crie um stacking context aqui: dialogs das rotas precisam ficar
          acima da navegação persistente conforme a hierarquia do DS. */}
      <main className="app-shell__main scrollbar-hidden flex-1 overflow-y-auto page-enter">
        <Outlet />
        <PageHelp />
      </main>

      {/* Alternador de Tema + Carteira (pílula unificada) */}
      <LamparinaDock />
      <div className="app-shell__utility absolute z-[70]">
        <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-1.5 py-1">
          {hasAdminAccess && (
            <Link to="/admin" aria-label="Painel de administração" className="flex size-9 items-center justify-center rounded-lg hover:bg-[var(--surface-elevated)]" title="Painel de Administração">
              <ShieldCheck size={16} className="text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
            </Link>
          )}
          <Link to="/carteira" aria-label="Abrir carteira" className="button-quiet flex h-9 items-center justify-center rounded-lg">
            <KesefDisplay />
          </Link>
          <MessageInboxButton />
          <NotificationCenterButton />
          <div className="h-5 w-px bg-[var(--border)]" />
          <ThemeToggle />
        </div>
      </div>

      <div className="app-shell__bottom-nav absolute bottom-0 z-[80] w-full pointer-events-none pb-[calc(0.5rem+var(--safe-area-bottom))] px-3">
        <nav aria-label="Navegação principal" className="sanctuary-nav sanctuary-floating-dock app-shell__nav pointer-events-auto relative mx-auto grid grid-cols-5 items-center px-1.5 py-1">
          {NAV_ITEMS.map(({ to, label, Icon }) => {
            const active = isActive(to);
            return (
              <Link
                key={to}
                to={to}
                onClick={() => {
                  if (!active && 'vibrate' in navigator) {
                    navigator.vibrate?.(12);
                  }
                }}
                aria-current={active ? 'page' : undefined}
                className={`sanctuary-nav__item relative min-w-0 min-h-14 flex flex-col items-center justify-center gap-1 transition-all duration-500 ${
                  active 
                    ? 'text-[#BEC092] drop-shadow-[0_0_6px_rgba(190,192,146,0.4)]' 
                    : 'txt-tertiary hover:txt-secondary'
                }`}
              >
                {active && (
                  <div className="pointer-events-none absolute inset-0.5 z-[-1] rounded-[1.15rem] bg-gradient-to-b from-[#BEC092]/15 to-transparent border-t border-[#BEC092]/30 shadow-[inset_0_1px_6px_rgba(190,192,146,0.1)]" />
                )}
                <SealIcon Icon={Icon} size="sm" />
                <span className="text-[10px] font-semibold leading-none truncate max-w-full px-1">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
