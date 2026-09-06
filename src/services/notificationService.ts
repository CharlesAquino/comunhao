import { supabase } from './supabaseClient';
import {
  contarNotificacoesUnicasNaoLidas,
  deduplicarNotificacoes,
  obterIdentificadoresNotificacao,
} from './notificationDeduplication';

let permissionGranted = false;
const notificacoesExibidasRecentemente = new Map<string, number>();
const JANELA_DEDUPLICACAO_MS = 30_000;
const JANELA_DEDUPLICACAO_REALTIME_MS = 5 * 60_000;
const ATRASO_ENCERRAMENTO_CANAL_MS = 300;

export interface AppNotification {
  id: string;
  usuario_id: string;
  tipo: string;
  titulo: string;
  corpo: string;
  url?: string | null;
  dados?: Record<string, unknown>;
  evento_chave?: string | null;
  lida: boolean;
  criada_em: string;
}

type NotificationListener = (notification: AppNotification) => void;
type RealtimeChannel = ReturnType<typeof supabase.channel>;

type SharedNotificationSubscription = {
  channel: RealtimeChannel;
  listeners: Set<NotificationListener>;
  notificacoesRecebidas: Map<string, number>;
  teardownTimer?: ReturnType<typeof setTimeout>;
};

const sharedSubscriptions = new Map<string, SharedNotificationSubscription>();

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') {
    permissionGranted = true;
    return true;
  }
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  permissionGranted = result === 'granted';
  return permissionGranted;
}

export type AppNotificationOptions = NotificationOptions & {
  renotify?: boolean;
  vibrate?: number[];
  actions?: Array<{ action: string; title: string; icon?: string }>;
};

export async function showNotification(title: string, options?: AppNotificationOptions): Promise<void> {
  if (!('Notification' in window)) return;
  if (!permissionGranted && Notification.permission !== 'granted') return;

  const notificationOptions: AppNotificationOptions = {
    icon: '/pwa-192x192.png',
    badge: '/favicon.svg',
    silent: false,
    renotify: false,
    vibrate: [180, 120, 220],
    ...options,
  };

  const tag = notificationOptions.tag;
  if (tag && notificacaoFoiExibidaRecentemente(tag)) return;

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (tag) {
        const existentes = await registration.getNotifications({ tag });
        if (existentes.length > 0) return;
      }

      registrarNotificacaoExibida(tag);
      await registration.showNotification(title, notificationOptions);
      return;
    }

    registrarNotificacaoExibida(tag);
    const notification = new Notification(title, notificationOptions);
    emitirFeedbackNotificacao();
    notification.onclick = () => {
      const url = (notificationOptions.data as { url?: string } | undefined)?.url || '/';
      window.focus();
      window.location.assign(url);
      notification.close();
    };
  } catch {
    // Notificações são complementares e nunca devem interromper o app.
  }
}

function notificacaoFoiExibidaRecentemente(tag: string): boolean {
  const agora = Date.now();
  const ultimaExibicao = notificacoesExibidasRecentemente.get(tag);

  for (const [chave, exibidaEm] of notificacoesExibidasRecentemente) {
    if (agora - exibidaEm > JANELA_DEDUPLICACAO_MS) {
      notificacoesExibidasRecentemente.delete(chave);
    }
  }

  return ultimaExibicao !== undefined && agora - ultimaExibicao <= JANELA_DEDUPLICACAO_MS;
}

function registrarNotificacaoExibida(tag?: string): void {
  if (tag) notificacoesExibidasRecentemente.set(tag, Date.now());
}

function emitirFeedbackNotificacao(): void {
  try {
    if ('vibrate' in navigator) navigator.vibrate([180, 120, 220]);
    playNotificationTone();
  } catch {
    // Vibração e áudio podem ser bloqueados pelo sistema sem prejudicar o alerta.
  }
}

export async function setupPushSubscriptions(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
      if (!publicKey) return;
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as string,
      });
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const keyP256dh = sub.getKey('p256dh');
    const keyAuth = sub.getKey('auth');
    if (!keyP256dh || !keyAuth) return;
    await supabase.from('push_subscriptions').upsert({
      usuario_id: user.id,
      endpoint: sub.endpoint,
      p256dh: bufferToBase64Url(keyP256dh),
      auth: bufferToBase64Url(keyAuth),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'usuario_id' });
  } catch {
  }
}

export async function listarNotificacoes(limit = 30): Promise<AppNotification[]> {
  const limiteConsulta = Math.max(limit * 2, limit);
  const { data, error } = await supabase
    .from('app_notificacoes')
    .select('*')
    .order('criada_em', { ascending: false })
    .limit(limiteConsulta);

  if (error) throw error;
  const notificacoesDoSininho = ((data ?? []) as AppNotification[])
    .filter(notificacao => notificacao.tipo !== 'nova_mensagem');

  return deduplicarNotificacoes(notificacoesDoSininho).slice(0, limit);
}

export async function contarNotificacoesNaoLidas(): Promise<number> {
  const { data, error } = await supabase
    .from('app_notificacoes')
    .select('id,evento_chave,lida,tipo')
    .eq('lida', false)
    .neq('tipo', 'nova_mensagem')
    .limit(1000);

  if (error) throw error;
  return contarNotificacoesUnicasNaoLidas(
    (data ?? []) as Array<Pick<AppNotification, 'id' | 'evento_chave' | 'lida'>>,
  );
}

export async function marcarNotificacaoComoLida(id: string): Promise<void> {
  const { error } = await supabase
    .from('app_notificacoes')
    .update({ lida: true })
    .eq('id', id);

  if (error) throw error;
}

export async function marcarTodasNotificacoesComoLidas(): Promise<void> {
  const { error } = await supabase
    .from('app_notificacoes')
    .update({ lida: true })
    .eq('lida', false)
    .neq('tipo', 'nova_mensagem');

  if (error) throw error;
}

function limparEventosRealtimeAntigos(eventos: Map<string, number>, agora: number): void {
  for (const [chave, recebidoEm] of eventos) {
    if (agora - recebidoEm > JANELA_DEDUPLICACAO_REALTIME_MS) {
      eventos.delete(chave);
    }
  }
}

function registrarEventoRealtimeUnico(
  notificacoesRecebidas: Map<string, number>,
  notification: AppNotification,
): boolean {
  const agora = Date.now();
  limparEventosRealtimeAntigos(notificacoesRecebidas, agora);

  const identificadores = obterIdentificadoresNotificacao(notification);
  const jaRecebida = identificadores.some(identificador => {
    const recebidaEm = notificacoesRecebidas.get(identificador);
    return recebidaEm !== undefined && agora - recebidaEm <= JANELA_DEDUPLICACAO_REALTIME_MS;
  });

  if (jaRecebida) return false;

  identificadores.forEach(identificador => {
    notificacoesRecebidas.set(identificador, agora);
  });
  return true;
}

function criarSharedSubscription(usuarioId: string): SharedNotificationSubscription {
  const listeners = new Set<NotificationListener>();
  const notificacoesRecebidas = new Map<string, number>();

  const channel = supabase
    .channel(`app_notificacoes_${usuarioId}`)
    .on(
      'postgres_changes' as never,
      {
        event: 'INSERT',
        schema: 'public',
        table: 'app_notificacoes',
        filter: `usuario_id=eq.${usuarioId}`,
      } as never,
      (payload: { new: unknown }) => {
        const notification = payload.new as AppNotification;
        if (!registrarEventoRealtimeUnico(notificacoesRecebidas, notification)) return;

        for (const listener of [...listeners]) {
          listener(notification);
        }
      },
    )
    .subscribe();

  return {
    channel,
    listeners,
    notificacoesRecebidas,
  };
}

export function subscribeToAppNotifications(
  usuarioId: string,
  callback: NotificationListener,
): () => void {
  let subscription = sharedSubscriptions.get(usuarioId);

  if (!subscription) {
    subscription = criarSharedSubscription(usuarioId);
    sharedSubscriptions.set(usuarioId, subscription);
  }

  if (subscription.teardownTimer) {
    clearTimeout(subscription.teardownTimer);
    subscription.teardownTimer = undefined;
  }

  subscription.listeners.add(callback);

  return () => {
    const atual = sharedSubscriptions.get(usuarioId);
    if (!atual) return;

    atual.listeners.delete(callback);
    if (atual.listeners.size > 0) return;

    atual.teardownTimer = setTimeout(() => {
      const aindaAtual = sharedSubscriptions.get(usuarioId);
      if (aindaAtual !== atual || atual.listeners.size > 0) return;

      sharedSubscriptions.delete(usuarioId);
      void supabase.removeChannel(atual.channel);
    }, ATRASO_ENCERRAMENTO_CANAL_MS);
  };
}

function playNotificationTone(): void {
  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;

  const ctx = new AudioContextCtor();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.24);
  oscillator.onended = () => {
    ctx.close().catch(() => undefined);
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    arr[i] = rawData.charCodeAt(i);
  }
  return arr;
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
