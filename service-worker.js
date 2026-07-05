/* Service worker de Horas Extras — instalación offline + actualizaciones fiables.
   Estrategia:
   - HTML (navegación) y version.json: RED primero (para detectar versiones nuevas), con copia en caché de respaldo.
   - Resto de recursos (iconos, etc.): caché primero.
   El nombre de caché lleva versión: al cambiarla se limpia lo viejo. */
const VERSION = 'v7';
const CACHE = 'horas-extras-' + VERSION;
const ASSETS = ['.', 'index.html', 'calendario.html', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

function isHtml(req) {
  return req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
}
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // No interceptar llamadas a Firebase/Google (sincronización en la nube)
  if (url.origin !== self.location.origin) return;

  const netFirst = isHtml(req) || url.pathname.endsWith('version.json');
  if (netFirst) {
    e.respondWith(
      fetch(req).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return resp;
      }).catch(() => caches.match(req).then((c) => c || caches.match('index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return resp;
      }).catch(() => null)
    )
  );
});
