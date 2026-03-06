// QRGate Scanner PWA Service Worker v2 - Offline Support
const CACHE_NAME = 'qrgate-scanner-v2';
const OFFLINE_DB_NAME = 'qrgate-offline';
const OFFLINE_DB_VERSION = 1;

// Assets to cache for offline use
const STATIC_ASSETS = [
  '/scanner',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// IndexedDB helper
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Store for pending scans to sync when online
      if (!db.objectStoreNames.contains('pendingScans')) {
        const pendingStore = db.createObjectStore('pendingScans', { keyPath: 'id', autoIncrement: true });
        pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // Store for cached valid QR tokens (for offline validation)
      if (!db.objectStoreNames.contains('validTokens')) {
        const tokensStore = db.createObjectStore('validTokens', { keyPath: 'token' });
        tokensStore.createIndex('venueId', 'venueId', { unique: false });
        tokensStore.createIndex('expiresAt', 'expiresAt', { unique: false });
      }
      
      // Store for already scanned tokens (prevent double-scan offline)
      if (!db.objectStoreNames.contains('scannedTokens')) {
        const scannedStore = db.createObjectStore('scannedTokens', { keyPath: 'token' });
        scannedStore.createIndex('scannedAt', 'scannedAt', { unique: false });
      }
    };
  });
}

// Save pending scan to IndexedDB
async function savePendingScan(scanData) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingScans'], 'readwrite');
    const store = transaction.objectStore('pendingScans');
    const request = store.add({
      ...scanData,
      timestamp: Date.now()
    });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get all pending scans
async function getPendingScans() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingScans'], 'readonly');
    const store = transaction.objectStore('pendingScans');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Clear synced scan
async function clearPendingScan(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingScans'], 'readwrite');
    const store = transaction.objectStore('pendingScans');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Mark token as scanned offline
async function markTokenScanned(token, scanResult) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['scannedTokens'], 'readwrite');
    const store = transaction.objectStore('scannedTokens');
    const request = store.put({
      token,
      scannedAt: new Date().toISOString(),
      result: scanResult
    });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Check if token was already scanned offline
async function isTokenScannedOffline(token) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['scannedTokens'], 'readonly');
    const store = transaction.objectStore('scannedTokens');
    const request = store.get(token);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Cache valid tokens for offline use (called from frontend)
async function cacheValidToken(tokenData) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['validTokens'], 'readwrite');
    const store = transaction.objectStore('validTokens');
    const request = store.put({
      ...tokenData,
      cachedAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24h expiry
    });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Get cached token for offline validation
async function getCachedToken(token) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['validTokens'], 'readonly');
    const store = transaction.objectStore('validTokens');
    const request = store.get(token);
    request.onsuccess = () => {
      const data = request.result;
      if (data && data.expiresAt > Date.now()) {
        resolve(data);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing QRGate Scanner PWA v2');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating QRGate Scanner PWA v2');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first with cache fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle scan API requests specially
  if (url.pathname === '/api/scan/verify' && event.request.method === 'POST') {
    event.respondWith(handleScanRequest(event.request));
    return;
  }
  
  // For navigation requests (pages), use network first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/scanner') || caches.match('/index.html');
        })
    );
    return;
  }
  
  // For other requests, network first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
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
});

// Handle scan verification with offline support
async function handleScanRequest(request) {
  try {
    // Try network first
    const response = await fetch(request.clone());
    return response;
  } catch (error) {
    console.log('[SW] Offline - handling scan request locally');
    
    // Parse request body
    const body = await request.json();
    const token = body.token;
    
    // Check if already scanned offline
    const scannedOffline = await isTokenScannedOffline(token);
    if (scannedOffline) {
      return new Response(JSON.stringify({
        result: 'ALREADY_USED',
        message: `Scansionato offline il ${scannedOffline.scannedAt.slice(0, 16)}`,
        offline: true
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check cached tokens
    const cachedToken = await getCachedToken(token);
    if (cachedToken) {
      // Mark as scanned and save for sync
      await markTokenScanned(token, 'valid');
      await savePendingScan({
        token,
        staff_id: body.staff_id,
        result: 'valid'
      });
      
      return new Response(JSON.stringify({
        result: 'VALID',
        ticket_type: cachedToken.ticket_type || 'Biglietto',
        venue_name: cachedToken.venue_name || '',
        scanned_at: new Date().toISOString().slice(0, 16),
        offline: true,
        sync_pending: true
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Unknown token offline - can't validate
    return new Response(JSON.stringify({
      result: 'OFFLINE_UNKNOWN',
      message: 'Connessione assente. QR non verificabile offline.',
      offline: true
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Background sync for pending scans
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-scans') {
    console.log('[SW] Background sync: syncing pending scans');
    event.waitUntil(syncPendingScans());
  }
});

async function syncPendingScans() {
  const pendingScans = await getPendingScans();
  console.log(`[SW] Syncing ${pendingScans.length} pending scans`);
  
  for (const scan of pendingScans) {
    try {
      const response = await fetch('/api/scan/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: scan.token,
          staff_id: scan.staff_id,
          offline_timestamp: scan.timestamp
        })
      });
      
      if (response.ok) {
        await clearPendingScan(scan.id);
        console.log(`[SW] Synced scan for token: ${scan.token.slice(0, 8)}...`);
      }
    } catch (error) {
      console.log(`[SW] Failed to sync scan: ${error.message}`);
    }
  }
}

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'CACHE_TOKEN':
      cacheValidToken(data).then(() => {
        event.ports[0].postMessage({ success: true });
      }).catch((error) => {
        event.ports[0].postMessage({ success: false, error: error.message });
      });
      break;
      
    case 'GET_PENDING_SCANS_COUNT':
      getPendingScans().then((scans) => {
        event.ports[0].postMessage({ count: scans.length });
      });
      break;
      
    case 'SYNC_NOW':
      syncPendingScans().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
  }
});

console.log('[SW] QRGate Scanner Service Worker v2 loaded');
