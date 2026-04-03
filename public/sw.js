const CACHE_NAME = 'prorun-lb-v10';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// Instalação: Cacheia os assets estáticos iniciais
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Ativação: Limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estratégia de Fetch: Stale-While-Revalidate para assets do app
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Apenas cacheia requisições do mesmo domínio (assets do app)
  // Ignora chamadas de API (Supabase, Google AI) para garantir dados frescos
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchedResponse = fetch(event.request).then((networkResponse) => {
            // Cacheia a nova versão para a próxima vez
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse); // Se falhar a rede, usa o cache

          return cachedResponse || fetchedResponse;
        });
      })
    );
  } else {
    // Para chamadas externas (Supabase), usa apenas rede
    event.respondWith(fetch(event.request));
  }
});
