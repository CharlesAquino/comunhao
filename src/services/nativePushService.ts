import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import {
  PushNotifications,
  type ActionPerformed,
  type Token,
} from '@capacitor/push-notifications';
import { supabase } from './supabaseClient';
import { marcarNotificacaoComoLida } from './notificationService';
import {
  obterIdNotificacaoPush,
  obterRotaPush,
  PUSH_CHANNELS,
} from './pushNotificationConfig';

export type NativePushRouteHandler = (url: string) => void;

const routeHandlers = new Set<NativePushRouteHandler>();
let listenersInstalados = false;
let listenerHandles: PluginListenerHandle[] = [];
let usuarioAtualId: string | null = null;
let registroAtivo = false;
let registroEmAndamento: Promise<boolean> | null = null;

function pushNativoPodeSerIniciado(): boolean {
  // O APK DEV não recebe google-services.json por segurança/isolamento.
  // Sem Firebase configurado, PushNotifications.register() pode encerrar o
  // processo Android ao montar a primeira rota autenticada.
  const canal = (import.meta.env.VITE_APP_CHANNEL || import.meta.env.MODE) as string | undefined;
  const habilitado = import.meta.env.VITE_ENABLE_NATIVE_PUSH as string | undefined;
  if (canal === 'development' && habilitado !== 'true') return false;
  return true;
}

function dadosDaAcao(action: ActionPerformed): Record<string, unknown> {
  const data = action.notification.data;
  return data && typeof data === 'object'
    ? data as Record<string, unknown>
    : {};
}

async function registrarTokenNoBanco(token: Token): Promise<void> {
  if (!usuarioAtualId || !token.value) return;

  const { error } = await supabase.rpc('registrar_push_dispositivo', {
    p_token: token.value,
    p_plataforma: Capacitor.getPlatform(),
    p_dispositivo: navigator.userAgent.slice(0, 250),
    p_app_version: null,
  });

  if (error) throw error;
  registroAtivo = true;
}

async function criarCanaisAndroid(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;

  await Promise.all([
    PushNotifications.createChannel({
      id: PUSH_CHANNELS.MENSAGENS,
      name: 'Mensagens',
      description: 'Mensagens privadas da mocidade',
      importance: 4,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: '#8B5CF6',
    }),
    PushNotifications.createChannel({
      id: PUSH_CHANNELS.ORACAO,
      name: 'Oração',
      description: 'Convites, mãos levantadas e momentos de oração',
      importance: 4,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: '#F59E0B',
    }),
    PushNotifications.createChannel({
      id: PUSH_CHANNELS.AVISOS,
      name: 'Avisos da mocidade',
      description: 'Sorteios e comunicados do Comunhão',
      importance: 3,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: '#22C55E',
    }),
  ]);
}

async function instalarListeners(): Promise<void> {
  if (listenersInstalados) return;
  listenersInstalados = true;

  const registration = await PushNotifications.addListener('registration', (token: Token) => {
    void registrarTokenNoBanco(token).catch(() => {
      registroAtivo = false;
    });
  });

  const registrationError = await PushNotifications.addListener('registrationError', () => {
    registroAtivo = false;
  });

  const actionPerformed = await PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (action: ActionPerformed) => {
      const dados = dadosDaAcao(action);
      const notificationId = obterIdNotificacaoPush(dados);
      if (notificationId) {
        void marcarNotificacaoComoLida(notificationId).catch(() => undefined);
      }

      const url = obterRotaPush(dados);
      for (const handler of [...routeHandlers]) handler(url);
    },
  );

  listenerHandles = [registration, registrationError, actionPerformed];
}

async function solicitarPermissaoNativa(): Promise<boolean> {
  const atual = await PushNotifications.checkPermissions();
  if (atual.receive === 'granted') return true;
  if (atual.receive === 'denied') return false;

  const solicitada = await PushNotifications.requestPermissions();
  return solicitada.receive === 'granted';
}

async function iniciarRegistro(usuarioId: string): Promise<boolean> {
  usuarioAtualId = usuarioId;
  registroAtivo = false;

  await instalarListeners();
  await criarCanaisAndroid();

  const permitido = await solicitarPermissaoNativa();
  if (!permitido) return false;

  await PushNotifications.register();

  const limite = Date.now() + 12_000;
  while (!registroAtivo && Date.now() < limite) {
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  return registroAtivo;
}

export async function setupNativePushNotifications(
  usuarioId: string,
  onOpenRoute: NativePushRouteHandler,
): Promise<{ ativo: boolean; cleanup: () => void }> {
  routeHandlers.add(onOpenRoute);

  if (!Capacitor.isNativePlatform() || !pushNativoPodeSerIniciado()) {
    return {
      ativo: false,
      cleanup: () => routeHandlers.delete(onOpenRoute),
    };
  }

  if (!registroEmAndamento || usuarioAtualId !== usuarioId) {
    registroEmAndamento = iniciarRegistro(usuarioId).catch(() => false);
  }

  const ativo = await registroEmAndamento;
  return {
    ativo,
    cleanup: () => routeHandlers.delete(onOpenRoute),
  };
}

export function nativePushEstaAtivo(): boolean {
  return Capacitor.isNativePlatform() && registroAtivo;
}

export async function teardownNativePushListeners(): Promise<void> {
  for (const handle of listenerHandles) await handle.remove();
  listenerHandles = [];
  listenersInstalados = false;
  registroAtivo = false;
  registroEmAndamento = null;
  usuarioAtualId = null;
  routeHandlers.clear();
}
