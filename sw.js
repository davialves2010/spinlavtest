// service worker do SpinLav
// arquivos do site: rede primeiro, cache so se estiver offline
// fontes e supabase-js (cdn): cache com atualizacao por tras
// supabase (api e login): nunca passa pelo cache
const VERSAO = 'spinlav-v3';

const ARQUIVOS = [
  '/', '/index.html',
  '/assets/style.css', '/assets/spa.js', '/assets/config.js', '/assets/negocio.js',
  '/assets/util.js', '/assets/supabase.js', '/assets/estado.js', '/assets/navegacao.js',
  '/assets/layout.js', '/assets/router.js', '/assets/disponibilidade.js',
  '/assets/views/comum.js', '/assets/views/publico.js', '/assets/views/conta.js', '/assets/views/pedidos.js',
  '/assets/views/admin/index.js', '/assets/views/admin/comum.js', '/assets/views/admin/mfa.js',
  '/assets/views/admin/agenda.js', '/assets/views/admin/pedidos.js', '/assets/views/admin/clientes.js',
  '/assets/views/admin/servicos.js', '/assets/views/admin/frete.js', '/assets/views/admin/bloqueios.js',
  '/assets/views/admin/equipe.js', '/assets/views/admin/registro.js',
  '/assets/pwa.js', '/assets/settings.js',
  '/assets/img/logo.jpg', '/assets/img/toalhas.svg', '/assets/img/sobre.jpg',
  '/assets/icons/icon-192.png', '/assets/icons/icon-512.png',
  '/manifest.webmanifest'
];

const EXTERNOS = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(VERSAO)
      .then(cache => Promise.allSettled(ARQUIVOS.map(url => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(
        chaves.filter(c => c !== VERSAO).map(c => caches.delete(c))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const mesmoSite = url.origin === location.origin;

  // supabase e outros dominios vao direto pra rede
  if (!mesmoSite && !EXTERNOS.includes(url.hostname)) return;

  if (!mesmoSite) {
    ev.respondWith(
      caches.open(VERSAO).then(async cache => {
        const guardado = await cache.match(req);
        const rede = fetch(req)
          .then(res => {
            if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
            return res;
          })
          .catch(() => guardado);
        return guardado || rede;
      })
    );
    return;
  }

  // navegacao: se estiver offline cai no index
  if (req.mode === 'navigate') {
    ev.respondWith(fetch(req).catch(() => caches.match('/index.html')));
    return;
  }

  ev.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          const copia = res.clone();
          caches.open(VERSAO).then(cache => cache.put(req, copia));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
