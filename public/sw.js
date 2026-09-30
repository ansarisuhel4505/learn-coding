/* ============================================================
   CodeMaster PWA Service Worker — Production Ready
============================================================ */

const CACHE_VERSION = 'codemaster-v1.0.0';
const CACHE_NAME = `${CACHE_VERSION}-static`;

// Files that will be cached for offline use
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/compiler.html',
    '/login.html',
    '/signup.html',
    '/dashboard.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    '/favicon.svg',
    '/suhel.jpeg'
];

// CDN resources to cache (fonts, libraries)
const CDN_CACHE = 'codemaster-v1.0.0-cdn';
const CDN_URLS = [
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

/* ============================================================
   INSTALL EVENT — Precache all static files
============================================================ */
self.addEventListener('install', (event) => {
    console.log('[CodeMaster SW] Installing v' + CACHE_VERSION);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[CodeMaster SW] Precaching static assets');
                // Use individual addAll with catch so one failed file doesn't kill install
                return Promise.allSettled(
                    PRECACHE_URLS.map(url =>
                        cache.add(url).catch(err => console.warn('[SW] Skip:', url, err.message))
                    )
                );
            })
            .then(() => caches.open(CDN_CACHE))
            .then(cache => Promise.allSettled(
                CDN_URLS.map(url => cache.add(url).catch(() => {}))
            ))
            .then(() => {
                console.log('[CodeMaster SW] Install complete');
                return self.skipWaiting(); // Activate immediately
            })
    );
});

/* ============================================================
   ACTIVATE EVENT — Cleanup old caches
============================================================ */
self.addEventListener('activate', (event) => {
    console.log('[CodeMaster SW] Activating');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name.startsWith('codemaster-') && name !== CACHE_NAME && name !== CDN_CACHE)
                    .map(name => {
                        console.log('[CodeMaster SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim()) // Take control immediately
    );
});

/* ============================================================
   FETCH EVENT — Smart caching strategy
============================================================ */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // ✅ Skip non-GET requests (POST, PUT, DELETE)
    if (request.method !== 'GET') return;

    // ✅ Skip API calls — always network (never cache)
    if (url.pathname.startsWith('/api/')) return;

    // ✅ Skip auth routes
    if (url.pathname.startsWith('/auth/')) return;

    // ✅ Skip cross-origin (except CDN)
    if (url.origin !== location.origin && !CDN_URLS.some(u => url.href.startsWith(u.split('?')[0]))) {
        return;
    }

    // ✅ Strategy 1: Network-first for HTML (so updates work)
    const isHTML = request.headers.get('accept')?.includes('text/html') ||
                   url.pathname.endsWith('.html') ||
                   url.pathname === '/';

    if (isHTML) {
        event.respondWith(networkFirst(request, CACHE_NAME));
        return;
    }

    // ✅ Strategy 2: Cache-first for static assets (CSS, JS, images, fonts)
    const isStatic = url.pathname.match(/\.(css|js|svg|png|jpg|jpeg|webp|woff2?|ttf|eot)$/i) ||
                     url.origin !== location.origin; // CDN assets

    if (isStatic) {
        event.respondWith(cacheFirst(request, url.origin === location.origin ? CACHE_NAME : CDN_CACHE));
        return;
    }

    // ✅ Default: try network, fallback to cache
    event.respondWith(
        fetch(request).catch(() => caches.match(request))
    );
});

/* ============================================================
   Strategy: Network-first (for HTML)
============================================================ */
async function networkFirst(request, cacheName) {
    try {
        const networkRes = await fetch(request);
        // Cache successful responses
        if (networkRes.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkRes.clone());
        }
        return networkRes;
    } catch (err) {
        // Offline: try cache
        const cached = await caches.match(request);
        if (cached) return cached;
        // Fallback to compiler.html for navigation requests
        if (request.mode === 'navigate') {
            return caches.match('/compiler.html');
        }
        return new Response('Offline — resource not cached', { status: 503 });
    }
}

/* ============================================================
   Strategy: Cache-first (for static assets)
============================================================ */
async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const networkRes = await fetch(request);
        if (networkRes.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkRes.clone());
        }
        return networkRes;
    } catch (err) {
        return new Response('Offline — asset not cached', { status: 503 });
    }
}

/* ============================================================
   MESSAGE HANDLER — Allow page to trigger skipWaiting
============================================================ */
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))));
    }
});

console.log('[CodeMaster SW] Loaded v' + CACHE_VERSION);
