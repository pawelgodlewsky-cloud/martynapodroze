const CACHE = "lombardia-v34-day-one-curiosities";
const LOCAL = [
  "./", "index.html", "styles.css", "app.js", "manifest.webmanifest",
  "assets/bergamo.webp", "assets/como.webp", "assets/milano.webp", "assets/logo-martyna.png", "assets/logo-martyna.webp", "assets/app-icon.svg",
  "assets/places/bgy-airport.webp", "assets/places/bergamo-airport-bus.webp", "assets/places/stazione-bergamo.webp",
  "assets/places/borgo-pignolo-cafe.webp", "assets/places/borgo-san-bernardino.webp", "assets/places/accademia-carrara.webp",
  "assets/places/gamec.webp", "assets/places/parco-suardi.webp",
  "assets/places/porta-nuova-generated.webp", "assets/places/funicolare-citta-alta-generated.webp", "assets/places/piazza-mercato-scarpe-generated.webp",
  "assets/places/piazza-vecchia-generated.webp", "assets/places/santa-maria-colleoni-generated.webp", "assets/places/campanone-generated.webp",
  "assets/places/colle-aperto-food-generated.webp", "assets/places/castello-san-vigilio-generated.webp", "assets/places/porta-san-giacomo-generated.webp",
  "assets/places/bergamo-rail-replacement-generated.webp", "assets/places/ponte-san-pietro-transfer-generated.webp", "assets/places/lecco-station-transfer-generated.webp",
  "assets/places/varenna-esino-generated.webp", "assets/places/passeggiata-innamorati-generated.webp", "assets/places/piazza-san-giorgio-varenna-generated.webp",
  "assets/places/villa-monastero-generated.webp", "assets/places/varenna-imbarcadero-generated.webp", "assets/places/bellagio-ferry-generated.webp",
  "assets/places/salita-serbelloni-generated.webp", "assets/places/basilica-san-giacomo-bellagio-generated.webp", "assets/places/punta-spartivento-generated.webp",
  "assets/places/pescallo-generated.webp", "assets/places/return-ferry-varenna-generated.webp", "assets/places/milano-centrale-generated.webp",
  "assets/places/duomo-milano-generated.webp", "assets/places/san-satiro-generated.webp", "assets/places/galleria-vittorio-generated.webp",
  "assets/places/teatro-scala-generated.webp", "assets/places/brera-generated.webp", "assets/places/castello-sforzesco-generated.webp",
  "assets/places/parco-sempione-generated.webp", "assets/places/san-maurizio-generated.webp", "assets/places/santa-maria-grazie-generated.webp",
  "assets/places/colonne-san-lorenzo-generated.webp", "assets/places/navigli-generated.webp",
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
