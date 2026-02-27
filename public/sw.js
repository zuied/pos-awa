const CACHE_NAME = "pos-cache-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
  // simple network first
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});