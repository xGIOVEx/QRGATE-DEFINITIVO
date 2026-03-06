const CACHE_NAME = 'qrgate-media-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

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
        })
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Non cacciare API o conversazioni (solo media e assets statici scelti)
    if (url.pathname.includes('/api/v1/visitor/conversation')) {
        return;
    }

    if (url.pathname.endsWith('.mp3') || url.pathname.endsWith('.webp') || url.pathname.endsWith('.jpg') || url.pathname.endsWith('.svg')) {
        event.respondWith(
            caches.match(event.request).then((response) => {
                // Cache hit - return response
                if (response) return response;

                // Non in cache, fetch and maybe cache it (if we want automatic caching on intercept)
                return fetch(event.request).then((networkResponse) => {
                    // Don't cache if not valid
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }

                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                    return networkResponse;
                });
            })
        );
    }
});
