// Service Worker — Rastreador de Gastos
const CACHE_NAME = 'rastreador-v1';

// Arquivos para guardar no cache (funcionam offline)
const STATIC_FILES = [
  '/',
  '/index.html',
  '/login.html',
  '/css/style.css',
  '/css/login.css',
  '/js/app.js',
  '/js/auth.js',
  '/js/dashboard.js',
  '/js/alertas.js',
  '/js/sugestoes.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Instala o service worker e guarda arquivos no cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_FILES))
      .then(() => self.skipWaiting())
  );
});

// Ativa e remove caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Intercepta requisições
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Chamadas de API → sempre vai para a rede (dados sempre atualizados)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(
          JSON.stringify({ error: 'Sem conexão com a internet.' }),
          { headers: { 'Content-Type': 'application/json' }, status: 503 }
        )
      )
    );
    return;
  }

  // Arquivos estáticos → cache primeiro, rede como fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Guarda no cache para próxima vez
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
