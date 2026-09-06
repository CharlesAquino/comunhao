import { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, Download, FlaskConical, HardDrive, RefreshCw, ShieldAlert } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';
import { useToast } from '../contexts/ToastContext';
import {
  checkForUpdates,
  downloadAndInstallUpdate,
  getUpdateChannel,
  isNativeAndroid,
  type InstalledVersionInfo,
  type UpdateManifest,
} from '../services/updateService';

interface ProgressState {
  receivedBytes: number;
  totalBytes: number;
  percent?: number;
}

function formatBytes(value: number): string {
  if (value >= 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }
  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${value} B`;
}

function formatReleaseDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
}

export default function UpdateDialog() {
  const toast = useToast();
  const [current, setCurrent] = useState<InstalledVersionInfo | null>(null);
  const [remote, setRemote] = useState<UpdateManifest | null>(null);
  const [mandatory, setMandatory] = useState(false);
  const [checking, setChecking] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [dismissedVersionCode, setDismissedVersionCode] = useState<number | null>(null);
  const [progress, setProgress] = useState<ProgressState | null>(null);

  useEffect(() => {
    if (!isNativeAndroid()) {
      setChecking(false);
      return;
    }

    let active = true;

    const run = async () => {
      try {
        const result = await checkForUpdates();
        if (!active || !result.enabled || !result.updateAvailable || !result.remote) {
          return;
        }

        if (!result.mandatory && dismissedVersionCode === result.remote.versionCode) {
          return;
        }

        setCurrent(result.current ?? null);
        setRemote(result.remote);
        setMandatory(result.mandatory);
      } catch (error) {
        if (active) {
          console.error('[UpdateDialog] Falha ao verificar atualização', error);
        }
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [dismissedVersionCode]);

  useEffect(() => {
    if (!remote) return;
    const handleBack = (event: Event) => {
      event.preventDefault();
      if (!mandatory && !downloading) {
        setDismissedVersionCode(remote.versionCode);
        setRemote(null);
      }
    };
    window.addEventListener('comunhao:back-request', handleBack);
    return () => window.removeEventListener('comunhao:back-request', handleBack);
  }, [downloading, mandatory, remote]);

  if (checking || !remote) {
    return null;
  }

  const testing = remote.channel === 'testing' || getUpdateChannel() === 'testing';
  const percent = progress?.percent ?? (progress && progress.totalBytes > 0
    ? Math.round((progress.receivedBytes * 100) / progress.totalBytes)
    : 0);

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <Card className="max-h-[calc(100dvh-2rem)] w-full max-w-sm space-y-4 overflow-y-auto p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-primary)]">
            {mandatory ? <ShieldAlert size={21} /> : testing ? <FlaskConical size={21} /> : <RefreshCw size={21} />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--celebration)]">
                Atualização do app
              </p>
              {testing && (
                <span className="rounded-full border border-amber-400/35 bg-amber-400/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-amber-300">
                  Canal de testes
                </span>
              )}
            </div>

            <h2 className="mt-1 font-display text-xl leading-tight text-[var(--text-primary)]">
              {remote.releaseTitle ?? `Comunhão ${remote.versionName}`}
            </h2>

            <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
              {mandatory
                ? 'Esta atualização é obrigatória para continuar usando o aplicativo.'
                : testing
                  ? 'Versão candidata para testes reais. Use normalmente e registre qualquer comportamento inesperado.'
                  : 'Baixe a versão mais recente para receber correções e melhorias.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-highlighted)] p-3">
          <span className="min-w-0 flex-1 text-center">
            <span className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Instalada</span>
            <span className="block truncate font-mono text-sm font-bold text-[var(--text-secondary)]">
              {current?.versionName ?? '—'}
            </span>
          </span>
          <ArrowRight size={16} className="shrink-0 text-[var(--accent-primary)]" />
          <span className="min-w-0 flex-1 text-center">
            <span className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Nova</span>
            <span className="block truncate font-mono text-sm font-bold text-[var(--accent-primary)]">
              {remote.versionName}
            </span>
          </span>
        </div>

        {remote.releaseNotes.length > 0 && (
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-highlighted)] p-4">
            {remote.releaseNotes.slice(0, 6).map(note => (
              <p key={note} className="text-sm leading-relaxed text-[var(--text-secondary)]">• {note}</p>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-2 px-1 text-[11px] text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={13} />
            {formatReleaseDate(remote.releaseDate)}
          </span>
          {remote.size > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <HardDrive size={13} />
              {formatBytes(remote.size)}
            </span>
          )}
        </div>

        {testing && remote.testerMessage && (
          <p className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs leading-relaxed text-amber-100">
            {remote.testerMessage}
          </p>
        )}

        {downloading && (
          <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-highlighted)] p-4">
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>Baixando atualização</span>
              <span>{percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--surface)]">
              <div className="h-full bg-[var(--accent-primary)] transition-all" style={{ width: `${percent}%` }} />
            </div>
            {progress && (
              <p className="text-xs text-[var(--text-muted)]">
                {formatBytes(progress.receivedBytes)} de {formatBytes(progress.totalBytes || remote.size)}
              </p>
            )}
          </div>
        )}

        <div className={mandatory ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-[0.9fr_1.1fr] gap-2'}>
          {!mandatory && (
            <Button
              variant="ghost"
              className="whitespace-nowrap !px-2.5 !text-xs"
              onClick={() => {
                setDismissedVersionCode(remote.versionCode);
                setRemote(null);
              }}
              disabled={downloading}
            >
              Agora não
            </Button>
          )}
          <Button
            className="whitespace-nowrap !px-2.5 !text-xs"
            disabled={downloading}
            onClick={async () => {
              setDownloading(true);
              setProgress(null);
              try {
                await downloadAndInstallUpdate(remote, event => setProgress(event));
                toast.info('O instalador do Android foi aberto.');
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Não foi possível iniciar a atualização.');
              } finally {
                setDownloading(false);
              }
            }}
          >
            {downloading ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
            {testing ? 'Instalar teste' : 'Atualizar'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
