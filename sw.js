/**
 * Shri Ramji Astro Service Worker
 * Enables PWA native installability and offline caching
 */

const CACHE_NAME = 'sra-patrika-v31';
const ASSETS_TO_CACHE = [
  '/',
  '/patrika.html',
  '/manifest.json',
  '/theme.js',
  '/sra-elegance.css',
  '/sra-ui.js?v=31', '/sra-nav.js', '/sra-translate.js', '/sra-auth.js', '/sra-records.js', '/sra-config.js',
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
