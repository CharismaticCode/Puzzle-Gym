// Offline cache. Bump VERSION whenever any file changes so players get the update.
const VERSION = 'pg-v3';
const FILES = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest',
  'js/core/common.js', 'js/core/zip.js', 'js/core/queens.js', 'js/core/tango.js', 'js/core/dispatch.js',
  'js/app/sound.js', 'js/app/shell.js', 'js/app/main.js', 'js/worker.js',
  'js/games/zip.js', 'js/games/queens.js', 'js/games/tango.js', 'js/games/dispatch.js',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first (so updates arrive), cache as the fallback when offline.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
