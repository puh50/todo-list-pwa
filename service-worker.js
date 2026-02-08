// Конфигурация кэша
const CACHE_NAME = 'todo-app-v2.0';
const OFFLINE_URL = '/offline.html';
const urlsToCache = [
  '/todo-list-pwa/',                 // Главная страница с именем репозитория
  '/todo-list-pwa/index.html',       // Альтернативный путь
  '/todo-list-pwa/manifest.json',
  '/todo-list-pwa/icons/icon-192.png',
  '/todo-list-pwa/icons/icon-512.png'
  // CDN ресурсы кэшируются динамически
];

// Установка Service Worker
self.addEventListener('install', event => {
  console.log('📦 Service Worker: Установка');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Service Worker: Кэш открыт');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('🎯 Service Worker: Все ресурсы закэшированы');
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
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Клонируем ответ
        const responseToCache = response.clone();
        
        // Кэшируем успешные ответы
        if (response.status === 200) {
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
        }
        
        return response;
      })
      .catch(error => {
        console.log('🌐 Service Worker: Сеть недоступна, используем кэш', error);
        
        // Для навигационных запросов возвращаем кэшированную страницу
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        
        // Для остальных запросов ищем в кэше
        return caches.match(event.request);
      })
  );
});

// Фоновая синхронизация
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  console.log('🔄 Service Worker: Фоновая синхронизация');
  // Здесь можно добавить логику синхронизации данных
}