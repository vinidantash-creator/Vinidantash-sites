const CACHE_NAME = 'ecobairro-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './icon.png'
];

// Passo 1: Instalação - O celular baixa e guarda os arquivos do site
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Passo 2: Interceptação - O celular tenta carregar o cache primeiro
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Retorna o que está no cache ou busca na internet
      return response || fetch(event.request);
    })
  );
});
