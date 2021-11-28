let cacheName = 'v1',
    filesToCache = ['index.html']

self.addEventListener('install', (evt) => {
    evt.waitUntil(
        caches.open(cacheName).then((cache) => {
            filesToCache.map((offlineCache) => {
                cache.add(offlineCache)
            })
        })
    )
})

self.addEventListener('fetch', (evt) => {
    evt.respondWith(
        caches.open(cacheName).then((cache) => {
            return cache.match(evt.request).then((response) => {
                let fetchPromise = fetch(evt.request).then(
                    (networkResponse) => {
                        if (evt.request.url.startsWith('https://'))
                            cache.put(evt.request, networkResponse.clone())

                        return networkResponse
                    }
                )
                return response || fetchPromise
            })
        })
    )
})

self.addEventListener('activate', (evt) => {
    const cacheWhitelist = [cacheName]

    evt.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName)
                    }
                })
            )
        })
    )
})
