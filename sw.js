/* V&C Boutique — Service Worker (Guía PWA Offline-First §5)
   Install: precache de la app y de jQuery local · Fetch: caché primero, red de respaldo ·
   Runtime: guarda fuentes de Google cuando hay conexión · Sync: avisa a la página para verificar pedidos. */
const CACHE_NAME = 'vc-boutique-v2.1.0';
const IMAGES = ['blazer-crema','pantalon-sastre','blusa-satinada','jean-oscuro','sueter-beige','vestido-floral','camisa-blanca','cardigan-rosa','chaqueta-cuero','jean-claro','falda-satinada','top-marfil','bolso-camel','bolso-negro','aretes-dorados','zapatillas-blancas'];
const ASSETS_TO_CACHE = ['./', './index.html', './styles.css', './script.js', './manifest.json', './data/products.json',
  './vendor/jquery-3.6.0.min.js', './vendor/purify.min.js', './icons/icon-192.png', './icons/icon-512.png', ...IMAGES.map((n) => `./assets/images/${n}.webp`)];
const RUNTIME_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('vc-boutique-') && k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const request = event.request; const url = new URL(request.url);
  if (request.method !== 'GET') return;
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !RUNTIME_HOSTS.includes(url.hostname)) return;
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response && response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then((c) => c.put(request, copy)); }
    return response;
  }).catch(() => {
    if (request.mode === 'navigate') return caches.match('./index.html');
    return new Response('Recurso no disponible sin conexión.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })));
});
self.addEventListener('sync', (event) => { if (event.tag === 'vc-pending-orders') event.waitUntil(notifyClients('SYNC_AVAILABLE')); });
async function notifyClients(type) {
  const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  list.forEach((client) => client.postMessage({ type, note: 'Los registros permanecen guardados localmente hasta conectar un backend.' }));
}
self.addEventListener('message', (event) => { if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting(); });
