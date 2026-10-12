/* AI Prompt Hub service worker — network-first for pages (always fresh), cache-first for assets */
const CACHE = 'aiphub-v2';
const CORE = ['./', 'index.html', 'about.html', 'privacy.html', 'terms.html',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon.ico'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isPage = url.origin === location.origin && (e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/'));
  if (isPage) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match(e.request, {ignoreSearch: true}).then(hit => hit || caches.match('index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request, {ignoreSearch: true}).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok && url.origin === location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match('index.html')))
  );
});
