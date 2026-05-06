const VERSION = 'v24';
const CACHE_NAME = `prorun-lb-${VERSION}`;
const STATIC_CACHE = `static-${VERSION}`;
const DYNAMIC_CACHE = `dynamic-${VERSION}`;
const API_CACHE = `api-${VERSION}`;

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/prorunlb_pwa_192_with_text.png',
  '/prorunlb_pwa_512.png',
  '/prorunlb_maskable_with_text.png'
];

// Instalação: Cacheia os assets críticos e assume o controle imediatamente
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-caching critical assets');
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(asset => 
          fetch(asset).then(response => {
            if (!response.ok) throw new Error(`Fetch failed for ${asset}`);
            const contentType = response.headers.get('content-type');
            if (asset.endsWith('.png') && contentType && !contentType.includes('image')) {
               throw new Error(`Invalid content type for image: ${asset}`);
            }
            return cache.put(asset, response);
          }).catch(err => console.error(`[SW] Pre-cache failed: ${asset}`, err))
        )
      );
    })
  );
});

// Ativação: Limpa caches de versões anteriores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (![STATIC_CACHE, DYNAMIC_CACHE, API_CACHE].includes(key)) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estratégias de Fetch Diferenciadas
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Ignorar Chrome extensions e outros esquemas não suportados
  if (!url.protocol.startsWith('http')) return;

  // 2. Chamadas de API (Supabase / Google AI) -> Network First
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clonedRes = response.clone();
          caches.open(API_CACHE).then(cache => cache.put(request, clonedRes));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 3. Assets Estáticos (Vite hashes) -> Cache First (Stale-while-revalidate)
  const isStaticAsset = url.pathname.includes('/assets/') || url.pathname.includes('.png');
  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request).then((res) => {
          const clonedRes = res.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(request, clonedRes));
          return res;
        });
        return cached || networkFetch;
      })
    );
    return;
  }

  // 4. Navegação / Root -> Network First com fallback para index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // 5. Estratégia Padrão: Stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request).then((res) => {
        const clonedRes = res.clone();
        caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clonedRes));
        return res;
      }).catch(() => null);
      
      return cached || networkFetch;
    })
  );
});

// Suporte a Notificações Push
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'ProRun LB', body: 'Hora de treinar!' };
  
  const options = {
    body: data.body,
    icon: '/prorunlb_pwa_512.png',
    badge: '/prorunlb_pwa_192_with_text.png',
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
