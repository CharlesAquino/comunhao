import { supabase } from './supabaseClient';

export type NotificationCategory =
  | 'oracao'
  | 'mensagens'
  | 'dupla_semanal'
  | 'tesouro'
  | 'ebd'
  | 'comunidade';

export interface NotificationPreferences {
  oracao: boolean;
  mensagens: boolean;
  dupla_semanal: boolean;
  tesouro: boolean;
  ebd: boolean;
  comunidade: boolean;
  silencio_ativo: boolean;
  silencio_inicio: string;
  silencio_fim: string;
  fuso_horario: string;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  oracao: true,
  mensagens: true,
  dupla_semanal: true,
  tesouro: true,
  ebd: true,
  comunidade: true,
  silencio_ativo: false,
  silencio_inicio: '22:00',
  silencio_fim: '07:00',
  fuso_horario: 'America/Sao_Paulo',
};

const PRAYER_TYPES = new Set([
  'convite_oracao', 'convite_aceito', 'convite_recusado', 'convite_expirado',
  'mao_levantada', 'mao_aceita', 'orando_com', 'acompanhamento_oracao',
  'pedido_oracao_acolhido', 'intercessao_confirmada',
]);
const STORE_TYPES = new Set([
  'loja_pedido_novo', 'loja_pedido_aprovado', 'loja_pedido_rejeitado', 'loja_pedido_logistica_atualizada', 'loja_pedido_disponivel',
  'loja_pedido_entregue', 'estoque_baixo',
]);
const EBD_TYPES = new Set(['nova_licao', 'lembrete_ebd', 'ebd_publicada']);
const PAIRING_TYPES = new Set(['nova_dupla_semanal', 'dupla_semanal', 'sorteio_circulo']);

export function notificationCategoryForType(type: string): NotificationCategory {
  if (type === 'nova_mensagem') return 'mensagens';
  if (PRAYER_TYPES.has(type)) return 'oracao';
  if (STORE_TYPES.has(type)) return 'tesouro';
  if (EBD_TYPES.has(type)) return 'ebd';
  if (PAIRING_TYPES.has(type)) return 'dupla_semanal';
  return 'comunidade';
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const { data, error } = await supabase.rpc('obter_preferencias_notificacao');
  if (error) throw error;
  const row = data as Partial<NotificationPreferences> | null;
  return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(row || {}) };
}

export async function saveNotificationPreferences(
  preferences: NotificationPreferences,
): Promise<NotificationPreferences> {
  const { data, error } = await supabase.rpc('salvar_preferencias_notificacao', {
    p_preferencias: preferences,
  });
  if (error) throw error;
  return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(data as Partial<NotificationPreferences> | null || {}) };
}

function minuteOfDay(value: string): number {
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function isQuietTime(preferences: NotificationPreferences, now = new Date()): boolean {
  if (!preferences.silencio_ativo) return false;
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: preferences.fuso_horario,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const current = Number(parts.find(part => part.type === 'hour')?.value || 0) * 60
    + Number(parts.find(part => part.type === 'minute')?.value || 0);
  const start = minuteOfDay(preferences.silencio_inicio);
  const end = minuteOfDay(preferences.silencio_fim);
  return start === end || (start < end ? current >= start && current < end : current >= start || current < end);
}

export function canAlertForType(
  preferences: NotificationPreferences,
  type: string,
  now = new Date(),
): boolean {
  return preferences[notificationCategoryForType(type)] && !isQuietTime(preferences, now);
}
