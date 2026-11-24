/* Service Worker del laboratorio (alcance: lab-jquery/). Caché primero, red como respaldo. */
const CACHE_NAME = 'vc-lab-v2.0.0';
const IMGS = ['blazer-crema','blusa-satinada','bolso-negro','bolso-camel'];
const ASSETS_TO_CACHE = ['./', './index.html', './styles.css', './script.js', './manifest.json', '../vendor/jquery-3.6.0.min.js', '../data/products.json', '../icons/icon-192.png', '../icons/icon-512.png', ...IMGS.map((n) => `../assets/images/${n}.webp`)];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS_TO_CACHE)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('vc-lab-') && k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => { if (r.ok) { const c = r.clone(); caches.open(CACHE_NAME).then((k) => k.put(e.request, c)); } return r; }).catch(() => e.request.mode === 'navigate' ? caches.match('./index.html') : new Response('Sin conexión', { status: 503 }))));
});
