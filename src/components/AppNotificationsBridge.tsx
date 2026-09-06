import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUserId } from '../services/dataService';
import {
  requestNotificationPermission,
  setupPushSubscriptions,
  showNotification,
  subscribeToAppNotifications,
} from '../services/notificationService';
import { obterDestinoNotificacao, obterTagNotificacao } from '../services/notificationRouting';
import {
  nativePushEstaAtivo,
  setupNativePushNotifications,
} from '../services/nativePushService';
import { canAlertForType, getNotificationPreferences } from '../services/notificationPreferencesService';

export default function AppNotificationsBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    let ativo = true;
    let cancelarRealtime: (() => void) | undefined;
    let cancelarPushNativo: (() => void) | undefined;

    const iniciar = async () => {
      try {
        const userId = await getCurrentUserId();
        const preferences = await getNotificationPreferences();
        if (!ativo) return;

        const pushNativo = await setupNativePushNotifications(userId, url => {
          navigate(url);
        });
        cancelarPushNativo = pushNativo.cleanup;

        if (!pushNativo.ativo) {
          await requestNotificationPermission();
          await setupPushSubscriptions();
        }

        if (!ativo) return;
        cancelarRealtime = subscribeToAppNotifications(userId, notificacao => {
          // No APK, o FCM é responsável pelo alerta de sistema. O Realtime
          // continua atualizando o sino, mas não cria uma segunda notificação.
          if (nativePushEstaAtivo()) return;
          if (!canAlertForType(preferences, notificacao.tipo)) return;

          const isMaoLevantada = notificacao.tipo === 'mao_levantada';
          void showNotification(notificacao.titulo, {
            body: notificacao.corpo,
            tag: obterTagNotificacao(notificacao),
            actions: isMaoLevantada
              ? [{ action: 'orar-junto', title: 'Aceito orar' }]
              : undefined,
            data: {
              url: obterDestinoNotificacao(notificacao),
              notificationId: notificacao.id,
            },
          });
        });
      } catch {
        // Notificações são complementares; não bloqueiam a experiência principal.
      }
    };

    void iniciar();
    return () => {
      ativo = false;
      cancelarRealtime?.();
      cancelarPushNativo?.();
    };
  }, [navigate]);

  return null;
}
