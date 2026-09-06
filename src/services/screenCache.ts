const CACHE_PREFIX = 'comunhao:screen-cache:';

interface CacheEnvelope<T> {
  savedAt: number;
  value: T;
}

export const SCREEN_CACHE_KEYS = {
  PROFILE: 'profile:v1',
  EBD: 'ebd:v1',
  TREASURE: 'treasure:v1',
  CANTEEN: 'canteen:v1',
  WALLET: 'wallet:v1',
} as const;

export function readScreenCache<T>(key: string, maxAgeMs: number, storage: Storage = window.localStorage): T | null {
  const storageKey = `${CACHE_PREFIX}${key}`;
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as Partial<CacheEnvelope<T>>;
    if (!envelope.savedAt || Date.now() - envelope.savedAt > maxAgeMs || envelope.value === undefined) {
      storage.removeItem(storageKey);
      return null;
    }
    return envelope.value;
  } catch {
    storage.removeItem(storageKey);
    return null;
  }
}

export function writeScreenCache<T>(key: string, value: T, storage: Storage = window.localStorage): void {
  try {
    const envelope: CacheEnvelope<T> = { savedAt: Date.now(), value };
    storage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(envelope));
  } catch {
    // Cache opcional.
  }
}

export function clearScreenCaches(storage: Storage = window.localStorage): void {
  try {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter((key): key is string => Boolean(key));
    keys.filter(key => key.startsWith(CACHE_PREFIX)).forEach(key => storage.removeItem(key));
  } catch {
    // Nada a limpar.
  }
}
