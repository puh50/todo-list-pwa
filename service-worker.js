// Конфигурация кэша
const CACHE_NAME = 'todo-app-v3.0';
const urlsToCache = [
  '/todo-list-pwa/',
  '/todo-list-pwa/index.html',
  '/todo-list-pwa/manifest.json',
  '/todo-list-pwa/service-worker.js',
  '/todo-list-pwa/icons/icon-192x192.svg',
  '/todo-list-pwa/icons/icon-512x512.svg',
  '/todo-list-pwa/icons/add-icon.svg',
  '/todo-list-pwa/icons/active-icon.svg'
];

// Установка Service Worker
self.addEventListener('install', event => {
  console.log('📦 Service Worker: Установка');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Service Worker: Кэш открыт');
        // Используем cache.add для каждого ресурса отдельно для лучшей обработки ошибок
        return Promise.all(
          urlsToCache.map(url => {
            return cache.add(url).catch(error => {
              console.warn(`⚠️ Не удалось закэшировать ${url}:`, error);
              return Promise.resolve(); // Продолжаем несмотря на ошибки
            });
          })
        );
      })
      .then(() => {
        console.log('🎯 Service Worker: Ресурсы закэшированы');
        return self.skipWaiting();
      })
  );
});

// Активация и очистка старых кэшей
self.addEventListener('activate', event => {
  console.log('🔧 Service Worker: Активация');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log(`🗑️ Service Worker: Удаляем старый кэш ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker: Активирован и готов');
      return self.clients.claim();
    })
  );
});

// Стратегия кэширования: Сначала сеть, потом кэш
self.addEventListener('fetch', event => {
  // Пропускаем non-GET запросы
  if (event.request.method !== 'GET') return;
  
  // Пропускаем chrome-extension запросы
  if (event.request.url.startsWith('chrome-extension://')) return;
  
  // Для CDN ресурсов используем только кэш
  if (event.request.url.includes('cdn.jsdelivr.net') || 
      event.request.url.includes('unpkg.com')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
    return;
  }
  
  // Для остальных ресурсов: сначала сеть, потом кэш
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Клонируем ответ для кэширования
        const responseClone = response.clone();
        
        // Кэшируем только успешные ответы и локальные ресурсы
        if (response.status === 200 && 
            event.request.url.startsWith(self.location.origin)) {
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseClone))
            .catch(error => console.warn('Не удалось добавить в кэш:', error));
        }
        
        return response;
      })
      .catch(error => {
        console.log('🌐 Сеть недоступна, используем кэш:', error);
        
        // Для навигационных запросов возвращаем главную страницу
        if (event.request.mode === 'navigate') {
          return caches.match('/todo-list-pwa/')
                 .then(response => response || caches.match('/todo-list-pwa/index.html'));
        }
        
        // Для остальных запросов ищем в кэше
        return caches.match(event.request)
          .then(response => {
            if (response) {
              return response;
            }
            
            // Если файл не найден в кэше и это SVG/изображение, возвращаем fallback
            if (event.request.url.match(/\.(svg|png|jpg|jpeg|gif)$/)) {
              return caches.match('/todo-list-pwa/icons/icon-192x192.svg');
            }
            
            // Для других типов возвращаем null
            return null;
          });
      })
  );
});