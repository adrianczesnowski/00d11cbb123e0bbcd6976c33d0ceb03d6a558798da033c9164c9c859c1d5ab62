const CACHE_NAME = 'fajne-notatki-cahe-v2';
const OFFLINE_URL = './index.html';
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css',
    './js/app.js',
    './js/db.js',
    './js/auth.js',
    './js/speech.js',
    './assets/icon-192.png',
    './assets/icon-256.png',
    './assets/icon-512.png'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .catch(err => {
                console.error('Failed to cache assets during install:', err);
            })
    );
    self.skipWaiting();
});

self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
    if (e.request.mode === 'navigate') {
        e.respondWith(
            fetch(e.request).catch(() => caches.match(OFFLINE_URL))
        );
        return;
    }
    e.respondWith(
        caches.match(e.request).then(cached => {
            return cached || fetch(e.request).then(res => {
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(e.request, res.clone());
                    return res;
                });
            });
        })
    );
});