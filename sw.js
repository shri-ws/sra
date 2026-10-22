/**
 * Shri Ramji Astro Service Worker
 * Enables PWA native installability and offline caching
 */

const CACHE_NAME = 'sra-patrika-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/patrika.html',
  '/manifest.json',
  '/theme.js',
  '/rashmiReportsService.js',
  '/mangalDoshaService.js',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('PWA caching non-fatal warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(k => {
          if (k !== CACHE_NAME) {
            return caches.delete(k);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Network first with cache fallback
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
