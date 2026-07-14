self.importScripts('/scramjet.codecs.js');
self.importScripts('/scramjet.worker.js');

const scramjetWorker = new ScramjetWorker({
    prefix: '/__scramjet__/',
    codec: ScramjetCodecs.base64,
    config: {
        wisp: 'wss://wisp-js-production-d77e.up.railway.app',
        ws: true,
        logger: false
    }
});

self.addEventListener('install', event => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
    // Intercept both proxy paths and sub-assets matching the Scramjet namespace
    if (event.request.url.includes('/__scramjet__') || event.request.url.includes('?__scramjet__')) {
        event.respondWith(scramjetWorker.fetch(event));
    }
});
