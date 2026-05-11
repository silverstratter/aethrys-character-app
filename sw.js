const CACHE = 'aethrys-mobile-v4';
const ASSETS = [
  './', './index.html', './style.css', './app.js', './manifest.json', './icon-192.svg', './icon-512.svg',
  './characters_player.json', './relationships_player.json', './houses.json', './factions.json', './regions.json'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
});
self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
