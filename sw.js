/* SpinLav — service worker
   - Arquivos do site: rede primeiro (sempre pega a versão nova), cache como reserva offline.
   - Fontes e supabase-js (CDN): cache com atualização em segundo plano.
   - Supabase (API/login): nunca passa pelo cache. */
const VERSION = 'spinlav-v1';
const SHELL = [
  '/',
  '/index.html',
  '/assets/style.css',
  '/assets/spa.js',
  '/assets/config.js',
  '/assets/img/logo.jpg',
  '/assets/img/toalhas.svg',
  '/assets/img/sobre.jpg',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/manifest.webmanifest'
];

self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(VERSION).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const CDN = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Supabase e qualquer outro domínio desconhecido: direto na rede
  if (url.origin !== location.origin && !CDN.includes(url.hostname)) return;

  // CDN/fontes: usa o cache e atualiza em segundo plano
  if (url.origin !== location.origin) {
    ev.respondWith(
      caches.open(VERSION).then(async c => {
        const hit = await c.match(req);
        const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  // Páginas (navegação): rede primeiro; offline cai no index.html
  if (req.mode === 'navigate') {
    ev.respondWith(
      fetch(req).catch(() => caches.match('/index.html').then(r => r || caches.match('/')))
    );
    return;
  }

  // Arquivos do próprio site: rede primeiro, cache como reserva
  ev.respondWith(
    fetch(req)
      .then(r => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return r; })
      .catch(() => caches.match(req))
  );
});
