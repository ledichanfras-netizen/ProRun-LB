const CACHE_NAME = 'prorun-lb-v12'; // Incremented version
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/prorunlb_android_192.png'
];

const STATIC_CACHE = 'prorun-static-v1';
const DYNAMIC_CACHE = 'prorun-dynamic-v1';

// Instalação: Cacheia os assets estáticos iniciais
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-caching assets');
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
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('[SW] Removing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estratégia de Fetch: Stale-while-revalidate para assets, Network-first para o resto
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Ignora chamadas de API (Supabase, Google AI) - Sempre rede
  const isApiCall = url.origin !== self.location.origin || url.pathname.startsWith('/api');
  if (isApiCall) {
    return;
  }

  // Para assets do App (JS, CSS, Imagens)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchedResponse = fetch(event.request).then((networkResponse) => {
        // Cacheia apenas se for uma resposta válida do nosso domínio
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
         // Se falhar a rede e não houver cache
         if (event.request.mode === 'navigate') {
           return caches.match('/index.html');
         }
         return null;
      });

      return cachedResponse || fetchedResponse;
    })
  );
});

// Suporte a Notificações Push
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'ProRun LB', body: 'Hora de treinar!' };
  
  const options = {
    body: data.body,
    icon: '/prorunlb_android_192.png',
    badge: '/prorunlb_android_192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
