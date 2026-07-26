const CACHE_NAME = "langes-super-kast-v16-fixed-20260727";
const CORE = [
  "./",
  "./index.html?v=16",
  "./style.css?v=16",
  "./script.js?v=16",
  "./manifest.webmanifest?v=16",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE)));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if(event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const isCore = url.origin === self.location.origin &&
    (url.pathname.endsWith("/") ||
     url.pathname.endsWith("/index.html") ||
     url.pathname.endsWith("/style.css") ||
     url.pathname.endsWith("/script.js") ||
     url.pathname.endsWith("/manifest.webmanifest"));

  if(isCore){
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then(r => r || caches.match("./index.html?v=16")))
    );
  } else {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
  }
});
