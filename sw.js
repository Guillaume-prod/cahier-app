// Service Worker — Cahier de Vacation MLH
const CACHE_NAME = 'cahier-mlh-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

// Recevoir un message pour programmer une notification
self.addEventListener('message', e => {
  if(e.data && e.data.type === 'SCHEDULE_NOTIF'){
    // Programmer la notification à l'heure demandée
    const delay = e.data.delay;
    setTimeout(()=>{
      self.registration.showNotification('📦 Rappel relevé colis', {
        body: 'Pense à saisir le relevé colis dans le cahier de vacation !',
        icon: '/cahier-app/icon.png',
        badge: '/cahier-app/icon.png',
        tag: 'rappel-colis',
        renotify: true,
        data: { url: '/cahier-app/?onglet=colis' }
      });
      // Reprogrammer pour la prochaine heure
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({type: 'RESCHEDULE'}));
      });
    }, delay);
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.openWindow('/cahier-app/')
  );
});
