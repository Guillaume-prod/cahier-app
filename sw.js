const CACHE_NAME = 'cahier-mlh-v22'; // Incrémenter cette version force le rechargement
const urlsToCache = [
  '/cahier-app/',
  '/cahier-app/index.html',
  '/cahier-app/cahier-app.html'
];

// Forcer la prise en main immédiate
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data && e.data.type === 'SCHEDULE_NOTIF') {
    // Reprogrammer la notification
    const { delay } = e.data;
    setTimeout(() => {
      self.clients.matchAll().then(clients => {
        clients.forEach(c => c.postMessage({ type: 'RESCHEDULE' }));
      });
    }, delay);
  }
  if (e.data && e.data.type === 'STOP_NOTIF') {
    // Rien à faire côté SW pour arrêter
  }
});

self.addEventListener('install', e => {
  self.skipWaiting(); // Prendre le contrôle immédiatement
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)).catch(() => {})
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim()) // Prendre le contrôle de tous les onglets ouverts
  );
});

self.addEventListener('fetch', e => {
  // Ne pas cacher les requêtes Supabase — toujours réseau
  if (e.request.url.includes('supabase')) {
    e.respondWith(fetch(e.request));
    return;
  }
  // Pour les autres : réseau d'abord, cache en fallback
  e.respondWith(
    fetch(e.request).then(res => {
      if (res && res.status === 200) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});

// Clic sur une notification : ouvrir / ramener l'application au premier plan sur l'onglet Colis
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      for (const c of cs) { if ('focus' in c) return c.focus(); }
      return self.clients.openWindow('/cahier-app/');
    })
  );
});

// Réception d'un rappel envoyé par le serveur (fonctionne application fermée)
self.addEventListener('push', e => {
  let d = { title: '📦 Rappel relevé colis', body: 'Pense à saisir le relevé colis !' };
  try { if (e.data) d = Object.assign(d, e.data.json()); } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body,
    icon: 'https://guillaume-prod.github.io/cahier-app/favicon.png',
    badge: 'https://guillaume-prod.github.io/cahier-app/favicon.png',
    tag: 'rappel-colis', renotify: true, vibrate: [250, 120, 250]
  }));
});
