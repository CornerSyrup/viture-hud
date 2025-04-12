// This is the service worker with the Workbox API

// Use a try-catch to avoid errors in browsers that don't support importScripts
try {
  importScripts("https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js")

  // Only continue if Workbox is available
  if (workbox) {
    console.log("Workbox is loaded")

    // Set workbox config
    workbox.setConfig({
      debug: true, // Enable debug mode for development
    })

    // Precache and route assets
    workbox.precaching.precacheAndRoute([
      { url: "/", revision: "1" },
      { url: "/index.html", revision: "1" },
      { url: "/manifest.json", revision: "1" },
      { url: "/icon-192x192.png", revision: "1" },
      { url: "/icon-512x512.png", revision: "1" },
      { url: "/apple-icon-180x180.png", revision: "1" },
      { url: "/offline.html", revision: "1" },
      // Add component SVG files
      { url: "/reticle.svg", revision: "1" },
    ])

    // Cache the Google Fonts stylesheets with a stale-while-revalidate strategy
    workbox.routing.registerRoute(
      /^https:\/\/fonts\.googleapis\.com/,
      new workbox.strategies.StaleWhileRevalidate({
        cacheName: "google-fonts-stylesheets",
      }),
    )

    // Cache the underlying font files with a cache-first strategy for 1 year
    workbox.routing.registerRoute(
      /^https:\/\/fonts\.gstatic\.com/,
      new workbox.strategies.CacheFirst({
        cacheName: "google-fonts-webfonts",
        plugins: [
          new workbox.cacheableResponse.CacheableResponsePlugin({
            statuses: [0, 200],
          }),
          new workbox.expiration.ExpirationPlugin({
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
            maxEntries: 30,
          }),
        ],
      }),
    )

    // Cache images with a cache-first strategy
    workbox.routing.registerRoute(
      /\.(?:png|gif|jpg|jpeg|svg)$/,
      new workbox.strategies.CacheFirst({
        cacheName: "images",
        plugins: [
          new workbox.expiration.ExpirationPlugin({
            maxEntries: 60,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
          }),
        ],
      }),
    )

    // Cache JS and CSS with a stale-while-revalidate strategy
    workbox.routing.registerRoute(
      /\.(?:js|css)$/,
      new workbox.strategies.StaleWhileRevalidate({
        cacheName: "static-resources",
      }),
    )

      // Cache API calls with a network-first strategy
    workbox.routing.registerRoute(
      /^https:\/\/api\.open-meteo\.com/,
      new workbox.strategies.NetworkFirst({
        cacheName: "api-responses",
        plugins: [
          new workbox.expiration.ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 30 * 60, // 30 minutes
          }),
        ],
      }),
    )

    // Cache OpenStreetMap API calls
    workbox.routing.registerRoute(
      /^https:\/\/(?:nominatim|overpass-api)\.openstreetmap\.org/,
      new workbox.strategies.NetworkFirst({
        cacheName: "map-api-responses",
        plugins: [
          new workbox.expiration.ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 60 * 60, // 1 hour
          }),
        ],
      }),
    )

    // Default fallback for navigation requests
    workbox.routing.registerRoute(
      ({ request }) => request.mode === "navigate",
      new workbox.strategies.NetworkFirst({
        cacheName: "pages",
        plugins: [
          new workbox.expiration.ExpirationPlugin({
            maxEntries: 50,
          }),
        ],
      }),
    )

    // Handle offline fallbacks
    workbox.routing.setCatchHandler(({ event }) => {
      if (event.request.destination === "document") {
        return workbox.precaching.matchPrecache("/offline.html")
      }
      return Response.error()
    })

    // Listen for messages from clients
    self.addEventListener("message", (event) => {
      if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting()
      }
    })

    // Add install event handler for PWA installation
    self.addEventListener("install", (event) => {
      console.log("Service worker installing")
      self.skipWaiting()
    })

    // Add activate event handler
    self.addEventListener("activate", (event) => {
      console.log("Service worker activating")
      event.waitUntil(clients.claim())
    })
  } else {
    console.log("Workbox could not be loaded. Using fallback.")
  }
} catch (e) {
  console.error("Error loading Workbox:", e)
}

// Simple fallback for browsers that don't support Workbox
self.addEventListener("install", (event) => {
  console.log("Service worker installing (fallback)")
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  console.log("Service worker activating (fallback)")
  event.waitUntil(clients.claim())
})

self.addEventListener("fetch", (event) => {
  // Simple fetch handler for browsers without Workbox
  event.respondWith(
    fetch(event.request).catch(() => {
      if (event.request.mode === "navigate") {
        return caches.match("/offline.html")
      }
      return caches.match(event.request)
    }),
  )
})
