import type { DashboardData } from '../types';

const DASHBOARD_CACHE_KEY = 'comunhao:dashboard-cache:v1';
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000;

interface DashboardCacheEntry {
  savedAt: number;
  data: DashboardData;
}

function isDashboardData(value: unknown): value is DashboardData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DashboardData>;
  return Boolean(
    candidate.usuario?.id
    && candidate.usuario.nome
    && candidate.missaoAtual
    && candidate.parceiroSustentador
    && Array.isArray(candidate.mocidade),
  );
}

export function readDashboardCache(storage: Storage = window.localStorage): DashboardData | null {
  try {
    const raw = storage.getItem(DASHBOARD_CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Partial<DashboardCacheEntry>;
    if (!entry.savedAt || Date.now() - entry.savedAt > MAX_CACHE_AGE_MS || !isDashboardData(entry.data)) {
      storage.removeItem(DASHBOARD_CACHE_KEY);
      return null;
    }
    return entry.data;
  } catch {
    storage.removeItem(DASHBOARD_CACHE_KEY);
    return null;
  }
}

export function writeDashboardCache(data: DashboardData, storage: Storage = window.localStorage): void {
  try {
    const entry: DashboardCacheEntry = { savedAt: Date.now(), data };
    storage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // O cache é uma otimização; o aplicativo continua funcional sem armazenamento local.
  }
}

export function clearDashboardCache(storage: Storage = window.localStorage): void {
  try {
    storage.removeItem(DASHBOARD_CACHE_KEY);
  } catch {
    // Nada a limpar quando o armazenamento está indisponível.
  }
}
