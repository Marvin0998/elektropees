const CACHE_NAME = 'elektropees-v1';
const urlsToCache = ['/', '/manifest.json', '/logo.png'];

// Installation
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Aktivierung
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Netzwerk-First Strategie
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Push-Benachrichtigungen empfangen
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Elektro Pees', {
      body: data.body || 'Erinnerung!',
      icon: '/logo.png',
      badge: '/logo.png',
      vibrate: [200, 100, 200],
      data: { url: '/' }
    })
  );
});

// Klick auf Benachrichtigung
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow('/');
    })
  );
});

// Tägliche Erinnerung um 17:05 Uhr (lokale Zeit)
function scheduleDailyReminder() {
  const now = new Date();
  const target = new Date();
  target.setHours(17, 5, 0, 0);
  if (now > target) target.setDate(target.getDate() + 1);
  const delay = target - now;
  setTimeout(() => {
    // Nur Mo-Fr anzeigen
    const day = new Date().getDay();
    if (day >= 1 && day <= 5) {
      self.registration.showNotification('⏰ Stunden eintragen!', {
        body: 'Denk daran, deine heutigen Arbeitsstunden einzutragen.',
        icon: '/logo.png',
        badge: '/logo.png',
        vibrate: [200, 100, 200],
        tag: 'daily-reminder',
        data: { url: '/' }
      });
    }
    scheduleDailyReminder(); // nächsten Tag planen
  }, delay);
}

scheduleDailyReminder();
