const CACHE_NAME = "gas-station-cache-v5"; // ⚠️ CAMBIA QUESTO NUMERO AD OGNI AGGIORNAMENTO
const urlsToCache = [
  "./",
  "./index.html",
  "./config.html",
  "./summary.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
];

// Installa il nuovo Service Worker e forza l'attivazione immediata
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)),
  );
});

// Pulisci le cache vecchie e prendi il controllo della pagina
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              console.log("Rimozione vecchia cache:", cache);
              return caches.delete(cache);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Strategia: NETWORK FIRST (Rete prima, Cache se offline)
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Se c'è internet e la risposta è valida, aggiorna la cache silenziosamente
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Se la fetch fallisce (sei offline), pesca dalla cache
        return caches.match(event.request);
      }),
  );
});
