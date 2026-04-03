const CACHE_NAME = 'prorun-lb-v8';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png?v=2'
];

// Instalação do Service Worker - Estratégia: Cache imediato
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Pre-caching assets');
      return cache.addAll(ASSETS);
    })
  );
});

// Ativação do Service Worker - Limpeza de caches antigos e claim de clientes
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estratégia de Fetch: Network First com fallback para Cache
// Isso garante que se o usuário estiver online, ele receberá a versão mais recente sem precisar de CTRL+F5.
self.addEventListener('fetch', (event) => {
  // Ignorar requisições que não sejam GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a rede estiver disponível, atualiza o cache e retorna a resposta
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Se a rede falhar, tenta buscar no cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;

          // Se não estiver no cache e a rede falhou, retorna erro
          return new Response('Network error occurred and no cache available.', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' },
          });
        });
      })
  );
});
