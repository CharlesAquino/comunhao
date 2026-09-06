import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type GraphicsPreference = 'auto' | 'economy' | 'premium' | 'ultra';
export type GraphicsQuality = Exclude<GraphicsPreference, 'auto'>;

interface GraphicsContextType {
  preference: GraphicsPreference;
  quality: GraphicsQuality;
  setPreference: (preference: GraphicsPreference) => void;
}

interface NavigatorWithDeviceHints extends Navigator {
  deviceMemory?: number;
  connection?: {
    saveData?: boolean;
  };
  getBattery?: () => Promise<{
    charging: boolean;
    level: number;
    addEventListener: (type: 'chargingchange' | 'levelchange', listener: () => void) => void;
    removeEventListener: (type: 'chargingchange' | 'levelchange', listener: () => void) => void;
  }>;
}

const STORAGE_KEY = 'app-graphics-quality';
const GraphicsContext = createContext<GraphicsContextType | undefined>(undefined);

function readPreference(): GraphicsPreference {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'economy' || saved === 'premium' || saved === 'ultra' ? saved : 'auto';
}

function detectQuality(lowBattery = false): GraphicsQuality {
  const hints = navigator as NavigatorWithDeviceHints;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cores = hints.hardwareConcurrency ?? 4;
  const memory = hints.deviceMemory ?? 4;
  const density = window.devicePixelRatio || 1;

  if (reducedMotion || hints.connection?.saveData || lowBattery || cores <= 4 || memory <= 3) {
    return 'economy';
  }

  if (cores >= 8 && memory >= 6 && density >= 2) {
    return 'ultra';
  }

  return 'premium';
}

export function GraphicsProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<GraphicsPreference>(readPreference);
  const [automaticQuality, setAutomaticQuality] = useState<GraphicsQuality>(() => detectQuality());

  const setPreference = useCallback((next: GraphicsPreference) => {
    localStorage.setItem(STORAGE_KEY, next);
    setPreferenceState(next);
  }, []);

  const quality = preference === 'auto' ? automaticQuality : preference;

  useEffect(() => {
    const hints = navigator as NavigatorWithDeviceHints;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const refresh = () => setAutomaticQuality(detectQuality());

    media.addEventListener('change', refresh);
    window.addEventListener('resize', refresh);

    let cleanupBattery: (() => void) | undefined;
    if (hints.getBattery) {
      hints.getBattery().then(battery => {
        const refreshBattery = () => {
          setAutomaticQuality(detectQuality(!battery.charging && battery.level <= 0.2));
        };
        refreshBattery();
        battery.addEventListener('chargingchange', refreshBattery);
        battery.addEventListener('levelchange', refreshBattery);
        cleanupBattery = () => {
          battery.removeEventListener('chargingchange', refreshBattery);
          battery.removeEventListener('levelchange', refreshBattery);
        };
      }).catch(() => undefined);
    }

    return () => {
      media.removeEventListener('change', refresh);
      window.removeEventListener('resize', refresh);
      cleanupBattery?.();
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-graphics', quality);
    root.setAttribute('data-graphics-preference', preference);
    root.style.setProperty('--device-pixel-ratio', String(Math.min(window.devicePixelRatio || 1, 3)));
  }, [preference, quality]);

  const value = useMemo(
    () => ({ preference, quality, setPreference }),
    [preference, quality, setPreference],
  );

  return <GraphicsContext.Provider value={value}>{children}</GraphicsContext.Provider>;
}

export function useGraphics() {
  const context = useContext(GraphicsContext);
  if (!context) throw new Error('useGraphics must be used within GraphicsProvider');
  return context;
}
