const CACHE = "lombardia-v27-attraction-guides";
const LOCAL = [
  "./", "index.html", "styles.css", "app.js", "manifest.webmanifest",
  "assets/bergamo.webp", "assets/como.webp", "assets/milano.webp", "assets/logo-martyna.png", "assets/logo-martyna.webp", "assets/app-icon.svg",
  "data/destinations.json", "data/points.json", "data/routes.json", "data/restaurants.json", "data/budget.json",
  "data/tips.json", "data/transport.json", "data/glossary.json", "data/food.json", "data/sources.json", "data/emergency.json", "data/attractions.json", "data/routes.geojson",
  "qr/d1-a.svg", "qr/d1-b.svg", "qr/d1-c.svg", "qr/d2-a.svg", "qr/d2-b.svg", "qr/d2-c.svg", "qr/d2-d.svg",
  "qr/d3-a.svg", "qr/d3-b.svg", "qr/d3-c.svg", "qr/d4-a.svg", "qr/d4-b.svg", "qr/d4-c.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(LOCAL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || !event.request.url.startsWith(self.location.origin)) return;
  const url = new URL(event.request.url);
  const networkFirst = event.request.mode === "navigate" || ["index.html", "styles.css", "app.js"].some(file => url.pathname.endsWith(file));
  if (networkFirst) {
    event.respondWith(fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request.mode === "navigate" ? "index.html" : event.request, copy));
      return response;
    }).catch(() => caches.match(event.request).then(cached => cached || caches.match("index.html"))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match("index.html"))));
});
