import { ROUTES } from './constants';

const AUTH_PATHS = new Set(['/login', '/register', '/verify-otp', '/recuperar-senha']);

export function getNavigationFallback(pathname: string): string {
  if (pathname.startsWith('/chat/')) return ROUTES.MENSAGENS;
  if (pathname.startsWith('/perfil/')) return ROUTES.COMUNIDADE;
  if (pathname.startsWith('/admin/')) return ROUTES.ADMIN;
  if (pathname === ROUTES.MENSAGENS) return ROUTES.HOME;
  if (pathname === ROUTES.COMUNIDADE) return ROUTES.HOME;
  if (pathname === ROUTES.CARTEIRA) return ROUTES.HOME;
  if (pathname === ROUTES.EBD) return ROUTES.HOME;
  if (pathname === ROUTES.LOJA) return ROUTES.HOME;
  if (pathname === ROUTES.MURAL) return ROUTES.HOME;
  if (pathname === ROUTES.RANKING) return ROUTES.HOME;
  if (pathname === ROUTES.PERFIL) return ROUTES.HOME;
  if (pathname === ROUTES.ADMIN) return ROUTES.HOME;
  return pathname;
}

export function resolveBackTarget(pathname: string, stack: string[]): { target: string; nextStack: string[] } {
  const normalized = stack.filter(Boolean);
  if (normalized.length > 1) {
    const nextStack = normalized.slice(0, -1);
    const candidate = nextStack[nextStack.length - 1];
    return {
      target: AUTH_PATHS.has(candidate) ? '/' : candidate,
      nextStack,
    };
  }

  const fallback = getNavigationFallback(pathname);
  return {
    target: fallback === pathname || AUTH_PATHS.has(fallback) ? '/' : fallback,
    nextStack: ['/'],
  };
}
