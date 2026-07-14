importScripts('https://jsdelivr.net');
importScripts('https://jsdelivr.net');

const scramjetWorker = new ScramjetWorker({
    prefix: '/__scramjet__/',
    codec: ScramjetCodecs.base64,
    config: {
        wisp: 'wss://wisp-js-production-d77e.up.railway.app',
        ws: true,
        logger: false
    }
});

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
    // request intercepter
    if (event.request.url.includes('/__scramjet__/')) {
        event.respondWith(scramjetWorker.fetch(event));
    }
});
