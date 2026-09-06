import type { PedidoMural } from '../types';

const MURAL_CACHE_KEY = 'comunhao:mural-cache:v1';
// As imagens usam URLs assinadas por uma hora; o cache expira antes delas.
const MAX_CACHE_AGE_MS = 30 * 60 * 1000;

interface MuralCacheEntry {
  savedAt: number;
  posts: PedidoMural[];
}

function isMuralFeed(value: unknown): value is PedidoMural[] {
  return Array.isArray(value) && value.every(post => (
    post
    && typeof post === 'object'
    && typeof (post as PedidoMural).id === 'string'
    && typeof (post as PedidoMural).texto === 'string'
  ));
}

export function readMuralCache(storage: Storage = window.localStorage): PedidoMural[] | null {
  try {
    const raw = storage.getItem(MURAL_CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Partial<MuralCacheEntry>;
    if (!entry.savedAt || Date.now() - entry.savedAt > MAX_CACHE_AGE_MS || !isMuralFeed(entry.posts)) {
      storage.removeItem(MURAL_CACHE_KEY);
      return null;
    }
    return entry.posts;
  } catch {
    storage.removeItem(MURAL_CACHE_KEY);
    return null;
  }
}

export function writeMuralCache(posts: PedidoMural[], storage: Storage = window.localStorage): void {
  try {
    const entry: MuralCacheEntry = { savedAt: Date.now(), posts };
    storage.setItem(MURAL_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // O feed remoto continua funcionando quando o armazenamento está indisponível.
  }
}

export function clearMuralCache(storage: Storage = window.localStorage): void {
  try {
    storage.removeItem(MURAL_CACHE_KEY);
  } catch {
    // Nada a limpar.
  }
}
