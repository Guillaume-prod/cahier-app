const CACHE_NAME = 'cahier-mlh-v10'; // Incrémenter cette version force le rechargement
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
