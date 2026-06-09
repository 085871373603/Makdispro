// Ingat: Ubah angka/nama versi ini SETIAP KALI kamu update kode HTML, CSS, JS, atau logo
// Contoh: app-V2.3, app-V2.4, dst.
const CACHE_NAME = 'app-V3.6.26'; 
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './logo-makdis.png'
  // Jangan lupa tambahkan file lain seperti pps.html, so.html, dll jika perlu cache offline
];

// 1. Install & Download cache baru (Bypass HTTP Cache agar unduh file paling baru)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Memaksa fetch dari server, bukan dari memori sementara browser
      return Promise.all(
        urlsToCache.map(url => {
          return fetch(url, { cache: 'reload' }).then(response => {
            if (!response.ok) throw new Error(`Fetch gagal untuk: ${url}`);
            return cache.put(url, response);
          });
        })
      );
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
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          // Jika nama cache tidak sama dengan CACHE_NAME saat ini, HAPUS!
          if (cache !== CACHE_NAME) {
            console.log('Menghapus cache versi lama:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      // Segera ambil alih kontrol tab browser tanpa perlu reload manual 2 kali
      return self.clients.claim(); 
    })
  );
});

// 4. Strategi Fetch: Stale-While-Revalidate (Cepat & Selalu Up-to-date)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Selalu coba ambil dari jaringan di latar belakang
      const fetchPromise = fetch(event.request).then(networkResponse => {
        // Jika berhasil ambil dari jaringan, update cache dengan file terbaru
        if (networkResponse && networkResponse.status === 200) {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(err => {
        console.log('Mode Offline: Menggunakan cache yang ada', err);
      });

      // Kembalikan cache SECARA INSTAN jika ada (biar super cepat), 
      // jika belum ada di cache sama sekali, tunggu hasil download dari jaringan (fetchPromise)
      return cachedResponse || fetchPromise;
    })
  );
});
