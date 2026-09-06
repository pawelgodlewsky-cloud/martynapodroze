const CACHE = "martyna-rome-v22";
const APP = [
  "./progression.js?v=22","./place-visuals.js?v=22","./place-cards.css?v=22","./route-rules.js?v=22","./trip-profile.js?v=22",
  ...["colosseum","colosseum-interior","colosseum-night","palatine","forum","campidoglio","st-peter-square","st-peter","vatican-museums","spanish-steps"].map(id => `./assets/places/${id}.jpg`),
  "./","./index.html","./styles.css?v=20","./design.css?v=22","./app.js?v=22","./manifest.webmanifest",
  "/assets/postcard-rome.jpg",
  "./data/guide.json?v=22","./data/days.json?v=22","./data/places.json?v=22","./data/restaurants.json?v=22",
  "./data/tickets.json?v=22","./data/transport.json?v=22","./data/phrases.json?v=22","./data/emergency.json?v=22","./data/alerts.json?v=22",
  "/guides/core/storage.js","/guides/core/geo.js"
];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("martyna-rome-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  if (url.hostname === "tile.openstreetmap.org" || url.hostname === "unpkg.com" || url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request, { cache:"no-store" }).then(response => response.ok ? response : Promise.reject()).catch(() => caches.match("./index.html")));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok && url.origin === self.location.origin) caches.open(CACHE).then(cache => cache.put(event.request,response.clone()));
    return response;
  })));
});
