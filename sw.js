const CACHE_VERSION = 'cache-v2026.08.22.02';
const CACHE_NAME = CACHE_VERSION;

/*
 * =========================================================
 * TIMER MAXDIS - SERVICE WORKER
 * =========================================================
 *
 * Fungsi:
 * 1. Cache aplikasi agar tetap bisa digunakan offline.
 * 2. Saat versi CACHE_VERSION berubah, cache lama dihapus.
 * 3. Cache baru diunduh saat perangkat online.
 * 4. HTML menggunakan Network First.
 * 5. Asset menggunakan Cache First.
 * 6. sw.js selalu dicek dari network, bukan cache browser.
 * 7. Service Worker baru langsung mengambil alih.
 *
 * PENTING:
 * Setiap ada update aplikasi, ubah:
 *
 * const CACHE_VERSION = 'maxdis-cache-v2026.08.22.02';
 *
 * menjadi versi baru, contoh:
 *
 * const CACHE_VERSION = 'maxdis-cache-v2026.08.22.03';
 *
 * =========================================================
 */


/* =========================================================
   FILE YANG AKAN DI-CACHE
   ========================================================= */

const APP_SHELL = [
    './',
    './index.html',
    './manifest.json',

    // Tambahkan file aplikasi lainnya di sini jika ada.
    // Contoh:
    // './menu.html',
    // './timer.html',
    // './setting.html',

    './a.png'
];


/* =========================================================
   INSTALL
   ========================================================= */

self.addEventListener('install', event => {
    console.log(
        '[SW] Installing:',
        CACHE_VERSION
    );

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log(
                    '[SW] Downloading application cache...'
                );

                /*
                 * cache.addAll akan mengunduh semua file
                 * ketika perangkat sedang online.
                 */
                return cache.addAll(APP_SHELL);
            })
            .then(() => {
                console.log(
                    '[SW] Application cache downloaded.'
                );

                /*
                 * Service Worker baru langsung dipasang.
                 */
                return self.skipWaiting();
            })
            .catch(error => {
                console.error(
                    '[SW] Cache installation failed:',
                    error
                );
            })
    );
});


/* =========================================================
   ACTIVATE
   ========================================================= */

self.addEventListener('activate', event => {
    console.log(
        '[SW] Activating:',
        CACHE_VERSION
    );

    event.waitUntil(
        caches.keys()
            .then(cacheNames => {

                /*
                 * Hapus semua cache lama yang bukan
                 * CACHE_NAME saat ini.
                 */
                return Promise.all(
                    cacheNames.map(cacheName => {

                        if (
                            cacheName.startsWith('maxdis-cache-') &&
                            cacheName !== CACHE_NAME
                        ) {
                            console.log(
                                '[SW] Deleting old cache:',
                                cacheName
                            );

                            return caches.delete(cacheName);
                        }

                        return Promise.resolve(false);
                    })
                );
            })
            .then(() => {

                console.log(
                    '[SW] Old cache cleaned.'
                );

                /*
                 * Service Worker baru langsung
                 * mengontrol seluruh halaman.
                 */
                return self.clients.claim();
            })
    );
});


/* =========================================================
   FETCH
   ========================================================= */

self.addEventListener('fetch', event => {

    const request = event.request;

    /*
     * Hanya tangani GET.
     */
    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);

    /*
     * Jangan mengambil request dari domain lain
     * menggunakan strategi cache aplikasi.
     *
     * Ini penting untuk CDN seperti PyScript.
     */
    if (url.origin !== self.location.origin) {
        return;
    }


    /* =====================================================
       HTML / NAVIGATION
       NETWORK FIRST
       ===================================================== */

    if (request.mode === 'navigate') {

        event.respondWith(
            fetch(request)
                .then(networkResponse => {

                    /*
                     * Simpan versi HTML terbaru
                     * ke cache.
                     */
                    if (
                        networkResponse &&
                        networkResponse.status === 200
                    ) {
                        const responseClone =
                            networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(
                                    request,
                                    responseClone
                                );
                            });
                    }

                    return networkResponse;
                })
                .catch(() => {

                    /*
                     * Jika offline, gunakan HTML dari cache.
                     */
                    return caches.match(request)
                        .then(cachedResponse => {

                            if (cachedResponse) {
                                return cachedResponse;
                            }

                            /*
                             * Fallback ke index.html.
                             */
                            return caches.match(
                                './index.html'
                            );
                        });
                })
        );

        return;
    }


    /* =====================================================
       ASSET
       CACHE FIRST
       ===================================================== */

    event.respondWith(

        caches.match(request)
            .then(cachedResponse => {

                /*
                 * Jika sudah ada cache,
                 * langsung gunakan cache.
                 */
                if (cachedResponse) {

                    /*
                     * Background update:
                     * ketika online, ambil versi terbaru
                     * tanpa membuat aplikasi menunggu.
                     */
                    fetch(request)
                        .then(networkResponse => {

                            if (
                                networkResponse &&
                                networkResponse.status === 200
                            ) {

                                caches.open(CACHE_NAME)
                                    .then(cache => {

                                        cache.put(
                                            request,
                                            networkResponse.clone()
                                        );

                                    });
                            }

                        })
                        .catch(() => {
                            /*
                             * Offline.
                             * Tidak perlu melakukan apa-apa.
                             */
                        });

                    return cachedResponse;
                }


                /* =========================================
                   BELUM ADA CACHE
                   ========================================= */

                return fetch(request)
                    .then(networkResponse => {

                        if (
                            !networkResponse ||
                            networkResponse.status !== 200
                        ) {
                            return networkResponse;
                        }

                        const responseClone =
                            networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {

                                cache.put(
                                    request,
                                    responseClone
                                );

                            });

                        return networkResponse;
                    })
                    .catch(() => {

                        /*
                         * Tidak ada network dan tidak ada cache.
                         */
                        return new Response(
                            'Aplikasi sedang offline dan file ini belum tersedia di cache.',
                            {
                                status: 503,
                                statusText: 'Offline'
                            }
                        );
                    });

            })
    );
});


/* =========================================================
   MESSAGE HANDLER
   ========================================================= */

self.addEventListener('message', event => {

    if (!event.data) {
        return;
    }


    /* =====================================================
       SKIP WAITING
       ===================================================== */

    if (event.data.type === 'SKIP_WAITING') {

        console.log(
            '[SW] Skip waiting requested.'
        );

        self.skipWaiting();
    }


    /* =====================================================
       CLEAR CACHE
       ===================================================== */

    if (event.data.type === 'CLEAR_CACHE') {

        event.waitUntil(

            caches.keys()
                .then(cacheNames => {

                    return Promise.all(

                        cacheNames.map(cacheName => {

                            if (
                                cacheName.startsWith(
                                    'maxdis-cache-'
                                )
                            ) {

                                console.log(
                                    '[SW] Clearing:',
                                    cacheName
                                );

                                return caches.delete(
                                    cacheName
                                );
                            }

                            return Promise.resolve(false);
                        })

                    );

                })

        );
    }


    /* =====================================================
       CACHE APPLICATION
       ===================================================== */

    if (event.data.type === 'CACHE_APP') {

        event.waitUntil(

            caches.open(CACHE_NAME)
                .then(cache => {

                    return cache.addAll(APP_SHELL);

                })
                .then(() => {

                    console.log(
                        '[SW] Application cached successfully.'
                    );

                })
                .catch(error => {

                    console.error(
                        '[SW] Failed caching application:',
                        error
                    );

                })

        );
    }

});


/* =========================================================
   PERIODIC ONLINE CACHE REFRESH
   ========================================================= */

self.addEventListener('sync', event => {

    if (event.tag === 'maxdis-cache-refresh') {

        event.waitUntil(

            caches.open(CACHE_NAME)
                .then(cache => {

                    return cache.addAll(APP_SHELL);

                })
                .catch(() => {

                    /*
                     * Tidak masalah jika sedang offline.
                     */
                })

        );

    }

});
