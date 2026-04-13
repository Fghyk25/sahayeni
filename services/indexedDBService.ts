// IndexedDB Service for offline caching and pending operations queue

const DB_NAME = 'atssaha_db';
const DB_VERSION = 1;

interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  data: any;
  timestamp: number;
  retries: number;
}

class IndexedDBService {
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Cache store
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Pending operations queue
        if (!db.objectStoreNames.contains('pending_ops')) {
          const opsStore = db.createObjectStore('pending_ops', { keyPath: 'id' });
          opsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Reports store (for offline viewing)
        if (!db.objectStoreNames.contains('reports')) {
          db.createObjectStore('reports', { keyPath: 'id' });
        }

        // Modem reports store
        if (!db.objectStoreNames.contains('modem_reports')) {
          db.createObjectStore('modem_reports', { keyPath: 'id' });
        }

        // Announcements store
        if (!db.objectStoreNames.contains('announcements')) {
          db.createObjectStore('announcements', { keyPath: 'id' });
        }
      };
    });
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    if (!this.db) await this.initialize();
    const transaction = this.db!.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // ==================== CACHE OPERATIONS ====================

  async setCache(key: string, data: any, ttlMs: number = 5 * 60 * 1000): Promise<void> {
    const store = await this.getStore('cache', 'readwrite');
    const expiresAt = Date.now() + ttlMs;
    
    return new Promise((resolve, reject) => {
      const request = store.put({ key, data, timestamp: Date.now(), expiresAt });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCache<T>(key: string): Promise<T | null> {
    const store = await this.getStore('cache');
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }
        // Check if expired
        if (result.expiresAt < Date.now()) {
          this.deleteCache(key);
          resolve(null);
          return;
        }
        resolve(result.data as T);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteCache(key: string): Promise<void> {
    const store = await this.getStore('cache', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearExpiredCache(): Promise<void> {
    const store = await this.getStore('cache', 'readwrite');
    const index = store.index('timestamp');
    const now = Date.now();

    return new Promise((resolve, reject) => {
      const request = index.openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          if (cursor.value.expiresAt < now) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== PENDING OPERATIONS QUEUE ====================

  async addPendingOperation(op: Omit<PendingOperation, 'id' | 'timestamp' | 'retries'>): Promise<string> {
    const store = await this.getStore('pending_ops', 'readwrite');
    const id = crypto.randomUUID();
    const operation: PendingOperation = {
      ...op,
      id,
      timestamp: Date.now(),
      retries: 0,
    };

    return new Promise((resolve, reject) => {
      const request = store.add(operation);
      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingOperations(): Promise<PendingOperation[]> {
    const store = await this.getStore('pending_ops');
    const index = store.index('timestamp');

    return new Promise((resolve, reject) => {
      const request = index.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async removePendingOperation(id: string): Promise<void> {
    const store = await this.getStore('pending_ops', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updatePendingOperation(id: string, updates: Partial<PendingOperation>): Promise<void> {
    const store = await this.getStore('pending_ops', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const op = getRequest.result;
        if (!op) {
          reject(new Error('Operation not found'));
          return;
        }
        const updated = { ...op, ...updates };
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // ==================== DATA STORES (Reports, Announcements, etc.) ====================

  async saveRecords<T extends { id: string }>(storeName: string, records: T[]): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    
    return new Promise((resolve, reject) => {
      const transaction = store.transaction;
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        let pending = records.length;
        if (pending === 0) {
          resolve();
          return;
        }
        
        records.forEach(record => {
          const request = store.add(record);
          request.onsuccess = () => {
            pending--;
            if (pending === 0) resolve();
          };
          request.onerror = () => reject(request.error);
        });
      };
      clearRequest.onerror = () => reject(clearRequest.error);
    });
  }

  async getRecords<T>(storeName: string): Promise<T[]> {
    const store = await this.getStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getRecord<T>(storeName: string, id: string): Promise<T | null> {
    const store = await this.getStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async addRecord<T extends { id: string }>(storeName: string, record: T): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.add(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateRecord<T extends { id: string }>(storeName: string, record: T): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteRecord(storeName: string, id: string): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== UTILITY ====================

  async clearAllData(): Promise<void> {
    const stores = ['cache', 'pending_ops', 'reports', 'modem_reports', 'announcements'];
    
    for (const storeName of stores) {
      const store = await this.getStore(storeName, 'readwrite');
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  async getPendingCount(): Promise<number> {
    const ops = await this.getPendingOperations();
    return ops.length;
  }
}

export const indexedDBService = new IndexedDBService();
