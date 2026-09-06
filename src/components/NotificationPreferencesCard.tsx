import { useEffect, useState } from 'react';
import { Bell, Moon, Save } from 'lucide-react';
import Card from './ui/Card';
import InstitutionalAction from './ui/InstitutionalAction';
import SealIcon from './ui/SealIcon';
import { useToast } from '../contexts/ToastContext';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getNotificationPreferences,
  saveNotificationPreferences,
  type NotificationCategory,
  type NotificationPreferences,
} from '../services/notificationPreferencesService';

const CATEGORIES: Array<{ key: NotificationCategory; label: string; detail: string }> = [
  { key: 'oracao', label: 'Oração', detail: 'Convites, respostas e acompanhamento' },
  { key: 'mensagens', label: 'Mensagens', detail: 'Novas mensagens privadas' },
  { key: 'dupla_semanal', label: 'Dupla semanal', detail: 'Novo encontro sorteado' },
  { key: 'tesouro', label: 'Tesouro', detail: 'Resgates e retirada de produtos' },
  { key: 'ebd', label: 'EBD', detail: 'Lições e lembretes de estudo' },
  { key: 'comunidade', label: 'Comunidade', detail: 'Avisos e atividades gerais' },
];

export default function NotificationPreferencesCard() {
  const toast = useToast();
  const [preferences, setPreferences] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getNotificationPreferences()
      .then(setPreferences)
      .catch(() => toast.error('Não foi possível carregar as preferências de notificação.'))
      .finally(() => setLoading(false));
  }, [toast]);

  const update = <K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) => {
    setPreferences(current => ({ ...current, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    try {
      setPreferences(await saveNotificationPreferences(preferences));
      toast.success('Preferências de notificação salvas.');
    } catch {
      toast.error('Não foi possível salvar as preferências.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="space-y-4 p-5" aria-busy={loading}>
      <div className="flex items-center gap-3">
        <SealIcon Icon={Bell} size="md" className="text-[var(--accent-primary)]" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--accent-primary)]">Notificações</p>
          <h3 className="font-display text-lg text-[var(--text-primary)]">O que merece chamar você</h3>
        </div>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {CATEGORIES.map(category => (
          <label key={category.key} className="flex min-h-16 cursor-pointer items-center gap-3 py-3">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-[var(--text-primary)]">{category.label}</span>
              <span className="block text-xs text-[var(--text-muted)]">{category.detail}</span>
            </span>
            <input
              type="checkbox"
              checked={preferences[category.key]}
              disabled={loading || saving}
              onChange={event => update(category.key, event.target.checked)}
              className="size-5 accent-[var(--accent-primary)]"
            />
          </label>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
        <label className="flex cursor-pointer items-center gap-3">
          <Moon size={18} className="text-[var(--accent-primary)]" />
          <span className="flex-1 text-sm font-semibold text-[var(--text-primary)]">Horário silencioso</span>
          <input
            type="checkbox"
            checked={preferences.silencio_ativo}
            disabled={loading || saving}
            onChange={event => update('silencio_ativo', event.target.checked)}
            className="size-5 accent-[var(--accent-primary)]"
          />
        </label>
        {preferences.silencio_ativo && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-xs text-[var(--text-muted)]">
              Início
              <input type="time" value={preferences.silencio_inicio.slice(0, 5)} onChange={event => update('silencio_inicio', event.target.value)} className="input-theme mt-1 min-h-11 w-full rounded-xl border px-3 text-sm" />
            </label>
            <label className="text-xs text-[var(--text-muted)]">
              Fim
              <input type="time" value={preferences.silencio_fim.slice(0, 5)} onChange={event => update('silencio_fim', event.target.value)} className="input-theme mt-1 min-h-11 w-full rounded-xl border px-3 text-sm" />
            </label>
          </div>
        )}
      </div>

      <InstitutionalAction onClick={save} disabled={loading || saving} icon={<Save size={17} />}>
        {saving ? 'Salvando...' : 'Salvar notificações'}
      </InstitutionalAction>
    </Card>
  );
}
