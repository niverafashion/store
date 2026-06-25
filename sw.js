console.log("NIVRA SW Loaded");

self.addEventListener("install", (event) => {
  console.log("SW install");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("SW activate");

  event.waitUntil(
    self.clients.claim()
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});