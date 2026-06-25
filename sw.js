self.addEventListener("install", (event) => {
  console.log("SW installing...");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
  console.log("SW activated");
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});