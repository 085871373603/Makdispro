// GANTI ANGKA VERSI INI SETIAP KALI KAMU MENGUBAH KODE (contoh: v3, v4, dst)
const CACHE_NAME = 'maxdisplay-v3'; 
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './logo-makdis.png' // Sesuaikan dengan nama logo kamu
];

self.addEventListener('install', event => {
  // PAKSA SW BARU UNTUK LANGSUNG AKTIF (Tidak perlu nunggu aplikasi ditutup)
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('activate', event => {
  // PAKSA SW BARU MENGAMBIL ALIH SEMUA HALAMAN YANG SEDANG TERBUKA
  event.waitUntil(self.clients.claim());
  
  // Hapus cache versi lama secara otomatis
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Menghapus cache lama:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
