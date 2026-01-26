/**
 * Service Worker för Södermalms Ortopedi PWA
 * 
 * Funktioner:
 * - Aktiverar PWA-installation
 * - Cache-first strategi för kritiska resurser
 * - Offline-stöd för grundläggande navigation
 * 
 * Version: 1.0.0
 */

const CACHE_NAME = 'so-ortopedi-v3';

// Resurser att cachelagra vid installation
const PRECACHE_URLS = [
  '/',
  '/favicons/site.webmanifest',
  '/favicons/web-app-manifest-192x192.png',
  '/favicons/web-app-manifest-512x512.png',
  '/favicons/apple-touch-icon.png',
  '/favicons/favicon.svg',
  '/images/branding/logo.svg'
];

// ============================================================================
// INSTALL EVENT - Cachea kritiska resurser
// ============================================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching critical resources');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        // Aktivera ny service worker direkt (skipWaiting)
        console.log('[SW] Skip waiting for immediate activation');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Install failed:', error);
      })
  );
});

// ============================================================================
// ACTIVATE EVENT - Rensa gamla cachar
// ============================================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Ta bort alla cachar som inte är den aktuella versionen
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Ta kontroll över alla öppna flikar direkt
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// ============================================================================
// FETCH EVENT - Cache-first med network fallback
// ============================================================================
self.addEventListener('fetch', (event) => {
  // Ignorera non-GET requests och externa resurser
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Ignorera Chrome extension requests
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  // Ignorera externa API-anrop och analytics
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Om vi har en cachad version, returnera den
        if (cachedResponse) {
          // Uppdatera cachen i bakgrunden (stale-while-revalidate)
          event.waitUntil(
            fetch(event.request)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  caches.open(CACHE_NAME)
                    .then((cache) => {
                      cache.put(event.request, networkResponse);
                    });
                }
              })
              .catch(() => {
                // Network failed, men vi har cache - allt är lugnt
              })
          );
          return cachedResponse;
        }

        // Inget i cache - hämta från nätverket
        return fetch(event.request)
          .then((networkResponse) => {
            // Cachea endast lyckade svar för HTML, CSS, JS, bilder
            if (networkResponse && networkResponse.status === 200) {
              const contentType = networkResponse.headers.get('content-type') || '';
              const shouldCache = 
                contentType.includes('text/html') ||
                contentType.includes('text/css') ||
                contentType.includes('application/javascript') ||
                contentType.includes('image/') ||
                contentType.includes('font/');
              
              if (shouldCache) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, responseToCache);
                  });
              }
            }
            return networkResponse;
          })
          .catch((error) => {
            console.log('[SW] Fetch failed:', error);
            // Returnera offline fallback om det finns
            // (kan utökas med en offline.html sida senare)
            return new Response('Offline - Kontrollera din internetanslutning', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
          });
      })
  );
});

// ============================================================================
// MESSAGE EVENT - Hantera meddelanden från klienten
// ============================================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received skip waiting message');
    self.skipWaiting();
  }
});
