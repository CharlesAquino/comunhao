import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const LEGACY_INLINE_THEME_TOKENS = [
  '--txt-primary', '--txt-secondary', '--txt-tertiary', '--txt-muted', '--txt-shadow',
  '--bg-surface', '--bg-elevated', '--bg-solid', '--border-subtle',
  '--green-light', '--green-mid', '--amber-light', '--amber-mid', '--rose-light', '--rose-mid',
  '--glass-bg', '--glass-border', '--glass-strong-bg', '--glass-strong-border',
  '--input-bg', '--input-border', '--input-placeholder', '--body-bg',
  '--glow-green', '--glow-rose', '--aurora-green', '--aurora-teal',
  '--nav-shield', '--nav-active', '--nav-active-glow',
  '--glass-shadow', '--glass-strong-shadow', '--card-3d-shadow',
  '--aurora-blob1', '--aurora-blob2', '--aurora-blob3',
  '--accent-solid', '--accent-solid2', '--accent-soft',
  '--cover-gradient', '--cover-overlay', '--font-sans', '--font-display',
] as const;

function clearLegacyInlineTheme() {
  const root = document.documentElement;
  LEGACY_INLINE_THEME_TOKENS.forEach(token => root.style.removeProperty(token));
}

async function updateStatusBar(theme: Theme) {
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    const canvas = getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim();
    // A arte pode ocupar a área da barra; o layout reserva os safe-area insets.
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({
      style: theme === 'dark' ? Style.Dark : Style.Light,
    });
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', canvas);
  } catch {
    // Não está em ambiente nativo (web) — ignora
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('app-theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  useEffect(() => {
    clearLegacyInlineTheme();
    localStorage.setItem('app-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    updateStatusBar(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
