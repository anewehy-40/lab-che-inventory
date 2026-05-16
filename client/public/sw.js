const CACHE_NAME = "lab-inventory-v1";
const STATIC_ASSETS = ["/", "/manifest.json"];

// Install: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Always go network-first for API calls
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: "Offline" }), {
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    return;
  }

  // Cache-first for static assets, fallback to network
  event.respondWith(
    caches.match(event.request).then(
      (cached) => cached || fetch(event.request).then((response) => {
        if (response.ok && event.request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
    )
  );
});
