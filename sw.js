// Service Worker de MultiMedia by MagazaTecno
// Cachea el "shell" de la app (este mismo HTML) para que abra sin conexión
// después de la primera visita. Los recursos externos (motor FFmpeg y
// modelos de transcripción Whisper) los cachean sus propias librerías en el
// navegador; este service worker no interfiere con ellos.

const CACHE_NAME = 'multimedia-magazatecno-v1';
const APP_SHELL = ['./', './index.html'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  // Solo controlamos el shell de la app (mismo origen). Los recursos de
  // FFmpeg/Whisper (jsdelivr, huggingface) los maneja el navegador o las
  // propias librerías con su caché interna.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
