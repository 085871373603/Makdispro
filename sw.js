const CACHE_NAME = 'maxdisplay-v5'; // Ingat: Angka ini tetap harus diubah tiap kali kamu update kode HTML
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './logo-makdis.png'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Paksa SW baru langsung aktif
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
  // Hapus semua cache versi lama secara brutal
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  // STRATEGI BARU: NETWORK FIRST (Cek internet dulu, baru jatuh ke cache kalau offline)
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Jika internet nyala dan berhasil ambil file terbaru, simpan ke cache
        const resClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
        return response;
      })
      .catch(() => {
        // Jika internet mati (offline), baru gunakan file dari cache
        return caches.match(event.request);
      })
  );
});
