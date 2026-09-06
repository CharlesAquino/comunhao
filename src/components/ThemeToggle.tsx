import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import SealIcon from './ui/SealIcon';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="button-quiet flex size-9 items-center justify-center rounded-lg transition-premium txt-tertiary hover:txt-primary"
      aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
    >
      <SealIcon Icon={theme === 'dark' ? Sun : Moon} size="sm" />
    </button>
  );
}
