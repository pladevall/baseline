const CACHE_NAME = 'bia-tracker-v1';
const SHARE_CACHE = 'shared-files';

// Install service worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate and clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== SHARE_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch handler
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle share target POST requests
  if (url.pathname === '/share' && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request));
    return;
  }

  // For GET requests, use network-first strategy
  if (event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  }
});

// Handle incoming shared files
async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('image');

    if (file && file instanceof File) {
      // Store the shared file in cache for the share page to pick up
      const cache = await caches.open(SHARE_CACHE);

      // Clear any existing shared files
      const keys = await cache.keys();
      for (const key of keys) {
        await cache.delete(key);
      }

      // Store the new file
      const response = new Response(file, {
        headers: { 'Content-Type': file.type }
      });
      await cache.put('/shared-image', response);
    }

    // Redirect to the share page to process
    return Response.redirect('/share', 303);
  } catch (error) {
    console.error('Share target error:', error);
    return Response.redirect('/?error=share', 303);
  }
}
