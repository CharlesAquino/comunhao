import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Gauge,
  KeyRound,
  LogOut,
  RefreshCw,
  Settings,
  Sparkles,
  Trash2,
} from 'lucide-react';
import AppBrandMark from '../components/ui/AppBrandMark';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import SealIcon from '../components/ui/SealIcon';
import NotificationPreferencesCard from '../components/NotificationPreferencesCard';
import LegalCenterDialog from '../components/legal/LegalCenterDialog';
import ChangePasswordDialog from '../components/profile/ChangePasswordDialog';
import DeleteAccountDialog from '../components/profile/DeleteAccountDialog';
import { useGraphics, type GraphicsPreference } from '../contexts/GraphicsContext';
import { useToast } from '../contexts/ToastContext';
import { CURRENT_RELEASE, OPEN_WHATS_NEW_EVENT } from '../config/releaseInfo';
import { requestAccountDeletion, signOut } from '../services/authService';
import { ROUTES } from '../services/constants';
import {
  checkForUpdates,
  downloadAndInstallUpdate,
  getInstalledAppVersion,
  getUpdateChannel,
  isNativeAndroid,
  type InstalledVersionInfo,
} from '../services/updateService';

const GRAPHICS_OPTIONS: Array<{ value: GraphicsPreference; label: string; detail: string }> = [
  { value: 'auto', label: 'Automático', detail: 'Equilibra qualidade, bateria e desempenho' },
  { value: 'economy', label: 'Econômico', detail: 'Menos efeitos e maior autonomia' },
  { value: 'premium', label: 'Premium', detail: 'Profundidade e iluminação suaves' },
  { value: 'ultra', label: 'Ultra', detail: 'Máxima definição e acabamento visual' },
];

function SettingsSection({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3" aria-labelledby={`settings-${eyebrow}`}>
      <div className="px-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--accent-primary)]">{eyebrow}</p>
        <h2 id={`settings-${eyebrow}`} className="mt-1 font-display text-xl font-semibold text-[var(--text-primary)]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function Configuracoes() {
  const navigate = useNavigate();
  const toast = useToast();
  const { preference, quality, setPreference } = useGraphics();
  const [appVersion, setAppVersion] = useState<InstalledVersionInfo | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [legalCenterOpen, setLegalCenterOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const updateChannel = getUpdateChannel();

  useEffect(() => {
    getInstalledAppVersion().then(setAppVersion).catch(() => setAppVersion(null));
  }, []);

  const verificarAtualizacoes = async () => {
    if (!isNativeAndroid()) {
      toast.info('As atualizações estão disponíveis no APK Android.');
      return;
    }
    setCheckingUpdate(true);
    try {
      const result = await checkForUpdates();
      if (!result.updateAvailable || !result.remote) {
        toast.success('Você já está usando a versão mais recente.');
        return;
      }
      const testingLabel = result.remote.channel === 'testing' ? ' de testes' : '';
      if (!window.confirm(`A versão${testingLabel} ${result.remote.versionName} está disponível. Deseja baixar agora?`)) return;
      await downloadAndInstallUpdate(result.remote);
      toast.info('Download concluído. O instalador do Android foi aberto.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível verificar atualizações.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const sair = async () => {
    await signOut();
    navigate(ROUTES.LOGIN);
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 px-4 pb-8 pt-6 sm:px-6">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(ROUTES.PERFIL)}
          aria-label="Voltar ao perfil"
          className="button-quiet flex size-11 shrink-0 items-center justify-center rounded-xl"
        >
          <ArrowLeft size={20} />
        </button>
        <AppBrandMark />
        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-primary)]">Sua experiência</p>
          <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)]">Configurações</h1>
        </div>
        <SealIcon Icon={Settings} size="md" className="ml-auto text-[var(--accent-primary)]" />
      </header>

      <SettingsSection eyebrow="Experiência" title="Visual e desempenho">
        <Card className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <SealIcon Icon={Sparkles} size="md" className="text-[var(--celebration)]" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--celebration)]">Qualidade visual</p>
              <h3 className="font-display text-lg text-[var(--text-primary)]">Renderização adaptativa</h3>
            </div>
            <span className="rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)]">{quality}</span>
          </div>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Qualidade gráfica">
            {GRAPHICS_OPTIONS.map(option => {
              const selected = preference === option.value;
              return (
                <button key={option.value} type="button" role="radio" aria-checked={selected} onClick={() => setPreference(option.value)} className={`graphics-option min-h-20 rounded-xl border p-3 text-left ${selected ? 'graphics-option--active' : ''}`}>
                  <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]"><Gauge size={15} aria-hidden="true" />{option.label}</span>
                  <span className="mt-1.5 block text-[11px] leading-snug text-[var(--text-muted)]">{option.detail}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs leading-relaxed text-[var(--text-muted)]">O modo automático reduz os efeitos quando o aparelho pede economia de bateria ou movimento.</p>
        </Card>
      </SettingsSection>

      <SettingsSection eyebrow="Notificações" title="O que merece chamar você">
        <NotificationPreferencesCard />
      </SettingsSection>

      <SettingsSection eyebrow="Conta" title="Segurança e privacidade">
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <button type="button" onClick={() => setChangePasswordOpen(true)} className="flex min-h-16 w-full items-center gap-3 border-b border-[var(--border)] px-4 text-left">
            <SealIcon Icon={KeyRound} size="sm" className="text-[var(--accent-primary)]" />
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[var(--text-primary)]">Alterar senha</span><span className="mt-1 block text-xs text-[var(--text-muted)]">Proteja sua conta com uma senha nova</span></span>
            <ChevronRight size={17} className="text-[var(--text-muted)]" />
          </button>
          <button type="button" onClick={() => setLegalCenterOpen(true)} className="flex min-h-16 w-full items-center gap-3 px-4 text-left">
            <SealIcon Icon={FileText} size="sm" className="text-[var(--accent-primary)]" />
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[var(--text-primary)]">Privacidade e documentos</span><span className="mt-1 block text-xs text-[var(--text-muted)]">Termos, diretrizes e registro do seu aceite</span></span>
            <ChevronRight size={17} className="text-[var(--text-muted)]" />
          </button>
        </div>
        <button type="button" onClick={() => setDeleteAccountOpen(true)} className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-[var(--danger)]/35 bg-[var(--danger)]/5 px-4 text-left">
          <SealIcon Icon={Trash2} size="sm" className="text-[var(--danger)]" />
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[var(--danger)]">Remover minha conta</span><span className="mt-1 block text-xs text-[var(--text-muted)]">Solicitar exclusão e anonimização dos seus dados</span></span>
          <ChevronRight size={17} className="text-[var(--danger)]" />
        </button>
      </SettingsSection>

      <SettingsSection eyebrow="Aplicativo" title="Versão e atualização">
        <Card className="flex items-start justify-between gap-4 p-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Comunhão</p>
            {updateChannel === 'testing' && <span className="mt-2 inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-amber-500">Canal de testes</span>}
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--text-muted)]">Versão instalada</p>
            <p className="mt-1 font-mono text-sm font-semibold text-[var(--accent-primary)]">{appVersion ? `${appVersion.versionName} (${appVersion.versionCode})` : 'Web / desenvolvimento'}</p>
            <Button variant="ghost" className="mt-2 !min-h-9 !px-2.5 text-xs" onClick={verificarAtualizacoes} disabled={checkingUpdate}>
              <RefreshCw size={14} className={checkingUpdate ? 'animate-spin' : ''} />{checkingUpdate ? 'Verificando...' : 'Verificar atualizações'}
            </Button>
            <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_WHATS_NEW_EVENT))} className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-[var(--accent-primary)]">
              <Sparkles size={14} />Novidades da {CURRENT_RELEASE.versionName}
            </button>
          </div>
        </Card>
      </SettingsSection>

      <Button variant="ghost" onClick={sair} className="w-full text-[var(--danger)]"><SealIcon Icon={LogOut} size="sm" />Sair da conta</Button>

      <LegalCenterDialog open={legalCenterOpen} onClose={() => setLegalCenterOpen(false)} />
      <ChangePasswordDialog open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} onSuccess={otherSessionsSignedOut => toast.success(otherSessionsSignedOut ? 'Senha alterada. As outras sessões foram encerradas.' : 'Senha alterada. Revise suas outras sessões por segurança.')} />
      <DeleteAccountDialog open={deleteAccountOpen} onClose={() => setDeleteAccountOpen(false)} onConfirm={async () => { await requestAccountDeletion(); await signOut(); navigate(ROUTES.LOGIN, { replace: true }); }} />
    </div>
  );
}
