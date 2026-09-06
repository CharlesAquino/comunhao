import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts',
  }),
);

self.addEventListener('push', function (event) {
  var data = event.data ? event.data.json() : { title: 'Comunhão', body: '' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/pwa-192x192.png',
      badge: '/favicon.svg',
      vibrate: [200, 100, 200],
      tag: data.tag || 'general',
      actions: data.actions || [],
      data: data.data || {},
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(function () {
            if ('navigate' in client) return client.navigate(url);
          });
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
