/*
  Offline reading.

  Two caches with different rules, because the two kinds of thing fail
  differently:

  - The shell (HTML, JS, CSS, icons) is versioned by filename at build time, so
    it is safe to serve from the cache first and never go to the network.
  - The writing itself changes without any filename changing, so it is fetched
    from the network first and only falls back to the cache when the network is
    not there. A reader offline on a train sees what they read before rather
    than an error; a reader online always sees the current text.

  The backend also sleeps when idle, so this doubles as cover for a cold start:
  a second visit shows the last-known writing immediately while the request to
  a waking server is still in flight.
*/

const VERSION = "v1";
const SHELL = `shell-${VERSION}`;
const CONTENT = `content-${VERSION}`;

const PRECACHE = ["/", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== CONTENT).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isApiRequest = (url) => url.pathname.startsWith("/api/") || /\/api\//.test(url.href);

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // The writing: network first, cache as the safety net.
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CONTENT).then((c) => c.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // A navigation with no network still needs an app to boot into.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/")));
    return;
  }

  // Build assets carry a content hash in their name, so a hit is always current.
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.ok && url.pathname.startsWith("/static/")) {
            const copy = response.clone();
            caches.open(SHELL).then((c) => c.put(request, copy));
          }
          return response;
        })
    )
  );
});
