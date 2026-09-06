export type AppUsageArea = 'inicio' | 'mural' | 'ebd' | 'tesouro' | 'carteira' | 'comunidade' | 'mensagens' | 'oracao' | 'jornada' | 'perfil' | 'administracao';

export function areaForPath(pathname: string): AppUsageArea | null {
  if (pathname.startsWith('/admin')) return 'administracao';
  if (pathname === '/') return 'inicio';
  if (pathname.startsWith('/mural')) return 'mural';
  if (pathname.startsWith('/ebd')) return 'ebd';
  if (pathname.startsWith('/loja')) return 'tesouro';
  if (pathname.startsWith('/carteira')) return 'carteira';
  if (pathname.startsWith('/comunidade')) return 'comunidade';
  if (pathname.startsWith('/mensagens') || pathname.startsWith('/chat/')) return 'mensagens';
  if (pathname.startsWith('/oracao') || pathname.startsWith('/sala/') || pathname.startsWith('/timer/')) return 'oracao';
  if (pathname.startsWith('/ranking') || pathname.startsWith('/guia')) return 'jornada';
  if (pathname.startsWith('/perfil')) return 'perfil';
  return null;
}
