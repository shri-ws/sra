/**
 * Shri Ramji Astro Service Worker
 * Enables PWA native installability and offline caching
 */

const CACHE_NAME = 'sra-patrika-v35';
const ASSETS_TO_CACHE = [
  '/',
  '/patrika.html',
  '/manifest.json',
  '/theme.js',
  '/sra-elegance.css',
  '/sra-ui.js?v=32', '/sra-nav.js', '/sra-translate.js', '/sra-auth.js', '/sra-records.js', '/sra-config.js',
  '/sra-i18n.js',
  '/sra-i18n/common.js',
  '/rashmiReportsService.js',
  '/mangalDoshaService.js',
  '/dhanaYogaService.js',
  '/dhan-yoga-calculator.html',
  '/html2pdf.bundle.min.js',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('PWA caching non-fatal warning:', err);
      });
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(k => {
          if (k !== CACHE_NAME) {
            console.log('[SRA PWA] Deleting old cache:', k);
            return caches.delete(k);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Always force network-first with cache-busting for HTML navigation pages
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // our own scripts and styles: always check with the server first, so a phone never keeps
  // running an old copy from the browser cache (GitHub Pages lets browsers keep files 10 minutes)
  const url = new URL(event.request.url);
  const ownCode = url.origin === self.location.origin && /\.(js|css)$/.test(url.pathname);
  event.respondWith(
    fetch(event.request, ownCode ? { cache: 'no-cache' } : undefined).catch(() => caches.match(event.request))
  );
});

// DAILY PERSONALIZED PANCHANG PUSH NOTIFICATION HANDLERS
self.addEventListener('push', event => {
  let data = { title: 'दैनिक पर्सनलाइज्ड पंचांग', body: 'आज का फलादेश उपलब्ध है।' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }

  const title = data.title || (data.notification && data.notification.title) || 'दैनिक पर्सनलाइज्ड पंचांग';
  const body = data.body || (data.notification && data.notification.body) || 'आज का फलादेश उपलब्ध है।';

  const options = {
    body: body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data.data || {},
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('patrika.html') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/patrika.html?domain=panchang');
      }
    })
  );
});
