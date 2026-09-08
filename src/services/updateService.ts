import { Capacitor, registerPlugin } from '@capacitor/core';

export type UpdateChannel = 'production' | 'testing';

export interface UpdateManifest {
  versionCode: number;
  versionName: string;
  minimumVersionCode: number;
  mandatory: boolean;
  channel: UpdateChannel;
  apkUrl: string;
  sha256: string;
  size: number;
  releaseDate: string;
  releaseTitle?: string;
  testerMessage?: string;
  releaseNotes: string[];
}

export interface InstalledVersionInfo {
  packageName: string;
  versionName: string;
  versionCode: number;
}

interface DownloadResult {
  filePath: string;
  sha256: string;
  size: number;
}

interface ApkUpdaterPlugin {
  getInstalledVersion(): Promise<InstalledVersionInfo>;
  canInstallPackages(): Promise<{ granted: boolean }>;
  openInstallSettings(): Promise<void>;
  downloadApk(options: { url: string; fileName?: string; sha256?: string }): Promise<DownloadResult>;
  installApk(options: { filePath: string }): Promise<void>;
  addListener(
    eventName: 'downloadProgress',
    listener: (event: { receivedBytes: number; totalBytes: number; percent?: number }) => void,
  ): Promise<{ remove: () => Promise<void> }>;
}

const apkUpdater = registerPlugin<ApkUpdaterPlugin>('ApkUpdater');

export interface UpdateCheckResult {
  enabled: boolean;
  channel: UpdateChannel;
  current?: InstalledVersionInfo;
  remote?: UpdateManifest;
  updateAvailable: boolean;
  mandatory: boolean;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('O manifesto de atualização possui formato inválido.');
  }
  return value as Record<string, unknown>;
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`O manifesto de atualização não contém ${key}.`);
  }
  return value.trim();
}

function requiredNumber(record: Record<string, unknown>, key: string): number {
  const value = Number(record[key]);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`O manifesto de atualização contém ${key} inválido.`);
  }
  return value;
}

function normalizeChannel(value: unknown): UpdateChannel {
  return value === 'testing' ? 'testing' : 'production';
}

function validateHttpsUrl(value: string, label: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} possui uma URL inválida.`);
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`${label} deve usar HTTPS.`);
  }

  return parsed.toString();
}

export function normalizeUpdateManifest(value: unknown): UpdateManifest {
  const record = asRecord(value);
  const releaseNotes = Array.isArray(record.releaseNotes)
    ? record.releaseNotes
      .filter((note): note is string => typeof note === 'string')
      .map(note => note.trim())
      .filter(Boolean)
      .slice(0, 8)
    : [];

  const sha256 = requiredString(record, 'sha256').toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(sha256)) {
    throw new Error('O manifesto contém um SHA-256 inválido.');
  }

  return {
    versionCode: requiredNumber(record, 'versionCode'),
    versionName: requiredString(record, 'versionName'),
    minimumVersionCode: requiredNumber(record, 'minimumVersionCode'),
    mandatory: record.mandatory === true,
    channel: normalizeChannel(record.channel),
    apkUrl: validateHttpsUrl(requiredString(record, 'apkUrl'), 'O endereço do APK'),
    sha256,
    size: requiredNumber(record, 'size'),
    releaseDate: requiredString(record, 'releaseDate'),
    releaseTitle: typeof record.releaseTitle === 'string' && record.releaseTitle.trim()
      ? record.releaseTitle.trim()
      : undefined,
    testerMessage: typeof record.testerMessage === 'string' && record.testerMessage.trim()
      ? record.testerMessage.trim()
      : undefined,
    releaseNotes,
  };
}

export function getUpdateChannel(): UpdateChannel {
  return import.meta.env.VITE_UPDATE_CHANNEL === 'testing' ? 'testing' : 'production';
}

export function isTestingUpdateChannel(): boolean {
  return getUpdateChannel() === 'testing';
}

export function getUpdateManifestUrl(): string | null {
  const url = import.meta.env.VITE_UPDATE_MANIFEST_URL?.trim();
  return url ? url : null;
}

export function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function getInstalledAppVersion(): Promise<InstalledVersionInfo | null> {
  if (!isNativeAndroid()) return null;
  return apkUpdater.getInstalledVersion();
}

export async function fetchUpdateManifest(): Promise<UpdateManifest> {
  const manifestUrl = getUpdateManifestUrl();
  if (!manifestUrl) {
    throw new Error('VITE_UPDATE_MANIFEST_URL não está configurada.');
  }

  const requestUrl = new URL(validateHttpsUrl(manifestUrl, 'O endereço do manifesto'));
  requestUrl.searchParams.set('_check', Date.now().toString());

  const response = await fetch(requestUrl, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Não foi possível consultar atualizações. HTTP ${response.status}.`);
  }

  const manifest = normalizeUpdateManifest(await response.json());
  const expectedChannel = getUpdateChannel();

  if (manifest.channel !== expectedChannel) {
    throw new Error(
      `O manifesto pertence ao canal ${manifest.channel}, mas este aplicativo usa o canal ${expectedChannel}.`,
    );
  }

  return manifest;
}

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  const channel = getUpdateChannel();

  if (!isNativeAndroid()) {
    return { enabled: false, channel, updateAvailable: false, mandatory: false };
  }

  const manifestUrl = getUpdateManifestUrl();
  if (!manifestUrl) {
    return { enabled: false, channel, updateAvailable: false, mandatory: false };
  }

  const [current, remote] = await Promise.all([
    apkUpdater.getInstalledVersion(),
    fetchUpdateManifest(),
  ]);

  const updateAvailable = remote.versionCode > current.versionCode;
  const mandatory = updateAvailable
    && (current.versionCode < remote.minimumVersionCode || remote.mandatory);

  return {
    enabled: true,
    channel,
    current,
    remote,
    updateAvailable,
    mandatory,
  };
}

export async function ensureInstallPermission(): Promise<boolean> {
  const result = await apkUpdater.canInstallPackages();
  if (result.granted) {
    return true;
  }

  await apkUpdater.openInstallSettings();
  return false;
}

export async function downloadAndInstallUpdate(
  remote: UpdateManifest,
  onProgress?: (event: { receivedBytes: number; totalBytes: number; percent?: number }) => void,
): Promise<void> {
  const permissionGranted = await ensureInstallPermission();
  if (!permissionGranted) {
    throw new Error('Autorize a instalação de aplicativos desta fonte e tente novamente.');
  }

  const listener = await apkUpdater.addListener('downloadProgress', event => {
    onProgress?.(event);
  });

  try {
    const fileName = `comunhao-${remote.versionName}.apk`;
    const result = await apkUpdater.downloadApk({
      url: remote.apkUrl,
      fileName,
      sha256: remote.sha256,
    });

    if (remote.size > 0 && Number(result.size) !== remote.size) {
      throw new Error('O tamanho do APK baixado não corresponde ao manifesto.');
    }

    await apkUpdater.installApk({ filePath: result.filePath });
  } finally {
    await listener.remove();
  }
}
