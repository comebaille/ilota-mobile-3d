const CACHE = 'ilota-v10-central-knowledge';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './assets/third-party/fox/Fox.glb',
  './assets/third-party/nature/Tree1.glb',
  './assets/third-party/nature/Tree3.glb',
  './assets/third-party/nature/Rock1.glb',
  './assets/third-party/nature/Bush2.glb',
  './assets/third-party/nature/Grass2.glb',
  './assets/third-party/kaykit-buildings/building_home_B_green.gltf',
  './assets/third-party/kaykit-buildings/building_home_B_green.bin',
  './assets/third-party/kaykit-buildings/building_lumbermill_green.gltf',
  './assets/third-party/kaykit-buildings/building_lumbermill_green.bin',
  './assets/third-party/kaykit-buildings/building_blacksmith_red.gltf',
  './assets/third-party/kaykit-buildings/building_blacksmith_red.bin',
  './assets/third-party/kaykit-buildings/building_tower_B_blue.gltf',
  './assets/third-party/kaykit-buildings/building_tower_B_blue.bin',
  './assets/third-party/kaykit-buildings/building_market_yellow.gltf',
  './assets/third-party/kaykit-buildings/building_market_yellow.bin',
  './assets/third-party/kaykit-buildings/building_tower_base_green.gltf',
  './assets/third-party/kaykit-buildings/building_tower_base_green.bin',
  './assets/third-party/kaykit-buildings/building_home_A_yellow.gltf',
  './assets/third-party/kaykit-buildings/building_home_A_yellow.bin',
  './assets/third-party/kaykit-buildings/building_lumbermill_yellow.gltf',
  './assets/third-party/kaykit-buildings/building_lumbermill_yellow.bin',
  './assets/third-party/kaykit-buildings/building_tower_A_green.gltf',
  './assets/third-party/kaykit-buildings/building_tower_A_green.bin',
  './assets/third-party/kaykit-buildings/building_home_A_blue.gltf',
  './assets/third-party/kaykit-buildings/building_home_A_blue.bin',
  './assets/third-party/kaykit-buildings/building_mine_red.gltf',
  './assets/third-party/kaykit-buildings/building_mine_red.bin',
  './assets/third-party/kaykit-buildings/building_archeryrange_red.gltf',
  './assets/third-party/kaykit-buildings/building_archeryrange_red.bin',
  './assets/third-party/kaykit-buildings/building_barracks_red.gltf',
  './assets/third-party/kaykit-buildings/building_barracks_red.bin',
  './assets/third-party/kaykit-buildings/building_tower_A_blue.gltf',
  './assets/third-party/kaykit-buildings/building_tower_A_blue.bin',
  './assets/third-party/kaykit-buildings/building_well_blue.gltf',
  './assets/third-party/kaykit-buildings/building_well_blue.bin',
  './assets/third-party/kaykit-buildings/building_tower_B_yellow.gltf',
  './assets/third-party/kaykit-buildings/building_tower_B_yellow.bin',
  './assets/third-party/kaykit-buildings/hexagons_medieval.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match('./index.html'))));
});
