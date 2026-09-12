import { DefectItem, ProjectMeta } from '../types.ts';

const DB_NAME = 'IllusionDefectTrackerDB';
const DB_VERSION = 1;
const STORES = {
  DEFECTS: 'defects_store',
  PROJECT: 'project_store'
};

/**
 * Open or upgrade the IndexedDB database instance
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.DEFECTS)) {
        db.createObjectStore(STORES.DEFECTS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.PROJECT)) {
        db.createObjectStore(STORES.PROJECT, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Asynchronously save full defects list (including full PNG screenshots) into IndexedDB
 */
export async function idbSaveDefects(defects: DefectItem[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.DEFECTS, 'readwrite');
      const store = transaction.objectStore(STORES.DEFECTS);
      const request = store.put({ key: 'all_defects', data: defects, updatedAt: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB save defects notice:', err);
  }
}

/**
 * Asynchronously retrieve full defects list from IndexedDB
 */
export async function idbGetDefects(): Promise<DefectItem[] | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.DEFECTS, 'readonly');
      const store = transaction.objectStore(STORES.DEFECTS);
      const request = store.get('all_defects');

      request.onsuccess = () => {
        if (request.result && Array.isArray(request.result.data)) {
          resolve(request.result.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB get defects notice:', err);
    return null;
  }
}

/**
 * Clear defects from IndexedDB
 */
export async function idbClearDefects(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.DEFECTS, 'readwrite');
      const store = transaction.objectStore(STORES.DEFECTS);
      const request = store.delete('all_defects');

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB clear defects notice:', err);
  }
}

/**
 * Save project meta into IndexedDB
 */
export async function idbSaveProject(project: ProjectMeta): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.PROJECT, 'readwrite');
      const store = transaction.objectStore(STORES.PROJECT);
      const request = store.put({ key: 'project_meta', data: project, updatedAt: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB save project notice:', err);
  }
}

/**
 * Retrieve project meta from IndexedDB
 */
export async function idbGetProject(): Promise<ProjectMeta | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.PROJECT, 'readonly');
      const store = transaction.objectStore(STORES.PROJECT);
      const request = store.get('project_meta');

      request.onsuccess = () => {
        if (request.result && request.result.data) {
          resolve(request.result.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB get project notice:', err);
    return null;
  }
}
