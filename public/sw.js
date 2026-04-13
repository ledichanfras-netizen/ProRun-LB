const CACHE_NAME = 'prorun-lb-v11';
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

// Estratégia de Fetch
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Ignora extensões de código fonte e chamadas de API
  const isCodeFile = url.pathname.match(/\.(tsx|ts|jsx|js)$/);
  const isApiCall = url.pathname.startsWith('/api') || url.origin !== self.location.origin;

  if (isCodeFile || isApiCall) {
    return; // Deixa o navegador/rede lidar normalmente
  }

  // Para assets estáticos conhecidos ou a raiz
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchedResponse = fetch(event.request).then((networkResponse) => {
          // Apenas cacheia se for uma resposta válida e não for código fonte
          if (networkResponse.status === 200 && !isCodeFile) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse || fetchedResponse;
      });
    })
  );
});
