import { Capacitor } from '@capacitor/core';

export const APP_VERSION_NAME = import.meta.env.VITE_APP_VERSION_NAME?.trim() || '1.4.0-dev.7';
const configuredVersionCode = Number(import.meta.env.VITE_APP_VERSION_CODE);
export const APP_VERSION_CODE = Number.isInteger(configuredVersionCode) && configuredVersionCode > 0
  ? configuredVersionCode
  : 14007;

const LAST_VERSION_CODE_KEY = 'comunhao:last-version-code';
const CACHE_CLEANED_CODE_KEY = 'comunhao:cache-cleaned-code';
const RELOAD_MARKER_KEY = 'comunhao:update-reload-code';
export const RELEASE_GUIDE_PENDING_KEY = 'comunhao:release-guide-pending';
export const FIRST_ACCESS_CANDIDATE_KEY = 'comunhao:first-access-candidate';

interface NativeBuildInfo {
  versionCode?: number;
  versionName?: string;
  updated?: boolean;
}

declare global {
  interface Window {
    __COMUNHAO_NATIVE_BUILD__?: NativeBuildInfo;
  }
}

export interface RuntimeUpgradeInput {
  storedVersionCode: number | null;
  currentVersionCode: number;
  nativeReportedUpdate: boolean;
  hasExistingUsage: boolean;
}

export function shouldRunUpgradeCleanup(input: RuntimeUpgradeInput): boolean {
  if (input.nativeReportedUpdate) return true;
  if (input.storedVersionCode !== null) {
    return input.storedVersionCode !== input.currentVersionCode;
  }
  return input.hasExistingUsage;
}

export function hasExistingAppUsage(storage: Storage = window.localStorage): boolean {
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index) ?? '';
    if (/^sb-.*-auth-token$/i.test(key)) return true;
    if (key.startsWith('ebd-progress:')) return true;
    if (key === 'graphics-quality') return true;
    if (key === 'oracao_app_user_id') return true;
  }
  return false;
}

async function unregisterServiceWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map(registration => registration.unregister()));
}

async function clearWebCaches(): Promise<void> {
  if (!('caches' in window)) return;
  const cacheNames = await window.caches.keys();
  await Promise.all(cacheNames.map(cacheName => window.caches.delete(cacheName)));
}

function currentBuildFromRuntime(): number {
  const search = new URLSearchParams(window.location.search);
  const queryBuild = Number(search.get('nativeBuild'));
  const nativeBuild = Number(window.__COMUNHAO_NATIVE_BUILD__?.versionCode);
  if (Number.isInteger(queryBuild) && queryBuild > 0) return queryBuild;
  if (Number.isInteger(nativeBuild) && nativeBuild > 0) return nativeBuild;
  return APP_VERSION_CODE;
}

function nativeReportedUpdate(): boolean {
  const search = new URLSearchParams(window.location.search);
  return search.get('upgraded') === '1' || window.__COMUNHAO_NATIVE_BUILD__?.updated === true;
}

export async function prepareAppRuntime(): Promise<'render' | 'reloading'> {
  const isNative = Capacitor.isNativePlatform();
  const currentVersionCode = currentBuildFromRuntime();
  const storedRaw = localStorage.getItem(LAST_VERSION_CODE_KEY);
  const storedVersionCode = storedRaw === null ? null : Number(storedRaw);
  const existingUsage = hasExistingAppUsage();

  if (!existingUsage && !localStorage.getItem(FIRST_ACCESS_CANDIDATE_KEY)) {
    localStorage.setItem(FIRST_ACCESS_CANDIDATE_KEY, '1');
  }

  if (import.meta.env.DEV) {
    // Um Service Worker de uma build anterior pode servir bundles obsoletos
    // sobre o Vite e esconder atualizações HMR.
    await unregisterServiceWorkers();
    await clearWebCaches();
  } else if (isNative) {
    // O app Android nunca deve manter um Service Worker da versão PWA.
    await unregisterServiceWorkers();
  }

  const needsCleanup = isNative && shouldRunUpgradeCleanup({
    storedVersionCode: Number.isFinite(storedVersionCode) ? storedVersionCode : null,
    currentVersionCode,
    nativeReportedUpdate: nativeReportedUpdate(),
    hasExistingUsage: existingUsage,
  });

  const cleanedForCode = Number(localStorage.getItem(CACHE_CLEANED_CODE_KEY));
  if (needsCleanup && cleanedForCode !== currentVersionCode) {
    await clearWebCaches();
    localStorage.setItem(CACHE_CLEANED_CODE_KEY, String(currentVersionCode));
    localStorage.setItem(RELEASE_GUIDE_PENDING_KEY, APP_VERSION_NAME);
  }

  localStorage.setItem(LAST_VERSION_CODE_KEY, String(currentVersionCode));

  if (needsCleanup && sessionStorage.getItem(RELOAD_MARKER_KEY) !== String(currentVersionCode)) {
    sessionStorage.setItem(RELOAD_MARKER_KEY, String(currentVersionCode));
    window.location.replace(`${window.location.origin}/`);
    return 'reloading';
  }

  return 'render';
}

export function registerWebPwa(): void {
  if (import.meta.env.DEV || Capacitor.isNativePlatform() || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // A versão web continua funcional mesmo se o navegador bloquear o PWA.
    });
  }, { once: true });
}
