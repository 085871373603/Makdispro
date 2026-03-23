// Ingat: Ubah angka v6 ini menjadi v7, v8, dst SETIAP KALI kamu update kode/logo
const CACHE_NAME = 'maxdisplay-v1.1.2026'; 
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './logo-makdis.png' // Pastikan nama ini sesuai dengan file di GitHub kamu
];

// 1. Install & Download cache baru (TAPI JANGAN LANGSUNG AKTIF)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// 2. Jika ada perintah 'SKIP_WAITING' dari tombol Popup, paksa aktif!
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 3. Saat aktif, hapus memori versi lama secara permanen
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Menghapus cache versi lama:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 4. Strategi Cache First (Biar super cepat buka offline)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).then(fetchRes => {
          return caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, fetchRes.clone());
              return fetchRes;
          });
      });
    })
  );
});
