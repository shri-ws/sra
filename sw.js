/**
 * Shri Ramji Astro Service Worker
 * Enables PWA native installability and offline caching
 */

const CACHE_NAME = 'sra-patrika-v24';
const ASSETS_TO_CACHE = [
  '/',
  '/patrika.html',
  '/manifest.json',
  '/theme.js',
  '/sra-elegance.css',
  '/sra-ui.js', '/sra-nav.js', '/sra-translate.js', '/sra-auth.js', '/sra-config.js',
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

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
