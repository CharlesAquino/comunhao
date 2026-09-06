import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '../services/constants';
import { getNavigationFallback } from '../services/navigationRules';

const HISTORY_SEED_FLAG = 'oracao_app_history_seeded';
const ALWAYS_SEED_FALLBACK_ROUTES = new Set([
  ROUTES.MENSAGENS,
  '/chat/:userId',
  '/perfil/:userId',
]);

function matchesAlwaysSeedRoute(pathname: string): boolean {
  return ALWAYS_SEED_FALLBACK_ROUTES.has(pathname)
    || pathname.startsWith('/chat/')
    || pathname.startsWith('/perfil/')
    || pathname.startsWith('/admin/');
}

function isAuthRoute(pathname: string): boolean {
  return pathname === ROUTES.LOGIN
    || pathname === ROUTES.REGISTER
    || pathname === ROUTES.VERIFY_OTP
    || pathname === ROUTES.RECUPERAR_SENHA;
}

export default function NavigationHistoryGuard() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isAuthRoute(location.pathname)) return;

    const fallbackRoute = getNavigationFallback(location.pathname);
    if (fallbackRoute === location.pathname) return;

    const currentUrl = `${location.pathname}${location.search}${location.hash}`;
    const marker = `${fallbackRoute}=>${currentUrl}`;
    const alreadySeeded = sessionStorage.getItem(HISTORY_SEED_FLAG) === marker;
    const hasBackStack = window.history.length > 1;
    const shouldForceFallback = matchesAlwaysSeedRoute(location.pathname);

    if (alreadySeeded || (!shouldForceFallback && hasBackStack)) return;

    const currentState = window.history.state ?? {};
    window.history.replaceState(
      { ...currentState, __oracaoSeededFallback: fallbackRoute },
      '',
      fallbackRoute,
    );
    window.history.pushState(
      { ...currentState, __oracaoSeededCurrent: currentUrl },
      '',
      currentUrl,
    );
    sessionStorage.setItem(HISTORY_SEED_FLAG, marker);
  }, [location.hash, location.pathname, location.search]);

  return null;
}
