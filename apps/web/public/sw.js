/**
 * Yojana Sahayak Service Worker (PWA & Offline Shell)
 *
 * Enforces Blueprint Section 0.1 & Phase 9 Gate:
 * - App shell and static assets cached for offline usage.
 * - Saved schemes and checklists load offline from cache/IndexedDB.
 * - Live Chat and Live Eligibility remain strictly network-only.
 * - Returns explicit informative offline JSON for network-dependent API calls.
 */

const CACHE_NAME = 'yojana-sahayak-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons.svg'
];

// Install: Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Purge stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Strategic routing
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Network-Only for Live AI & Eligibility Evaluation (Blueprint Gate Rule)
  if (
    url.pathname.includes('/api/v1/chat') ||
    url.pathname.includes('/api/v1/eligibility/evaluate')
  ) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({
            ok: false,
            error: {
              code: 'NETWORK_OFFLINE',
              message_en: 'Live AI chat and eligibility evaluation require an active internet connection. Your saved schemes and checklists remain accessible offline.',
              message_hi: 'एआई चैट और लाइव पात्रता जांच के लिए इंटरनेट कनेक्शन आवश्यक है। आपकी सहेजी गई योजनाएं और चेकलिस्ट ऑफ़लाइन उपलब्ध हैं।'
            }
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // 2. Cache-First for static assets (images, fonts, scripts, styles)
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // 3. Network-First with Cache Fallback for Navigation Requests (SPA)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // 4. Default: fetch with cache fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

