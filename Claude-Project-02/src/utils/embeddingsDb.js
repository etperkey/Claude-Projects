/**
 * IndexedDB utilities for storing embeddings
 * Embeddings are too large for localStorage, so we use IndexedDB
 */

const DB_NAME = 'research-dashboard-embeddings';
const DB_VERSION = 1;
const STORE_NAME = 'embeddings';

let dbInstance = null;

/**
 * Initialize and open the IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
export async function initDatabase() {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create embeddings store with indexes
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('contentType', 'contentType', { unique: false });
        store.createIndex('contentId', 'contentId', { unique: false });
        store.createIndex('projectId', 'projectId', { unique: false });
        store.createIndex('lastUpdated', 'lastUpdated', { unique: false });
      }
    };
  });
}

/**
 * Store an embedding in the database
 * @param {object} embedding - Embedding object with id, contentType, contentId, embedding, etc.
 * @returns {Promise<void>}
 */
export async function storeEmbedding(embedding) {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.put({
      ...embedding,
      lastUpdated: new Date().toISOString()
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Store multiple embeddings in batch
 * @param {object[]} embeddings - Array of embedding objects
 * @returns {Promise<void>}
 */
export async function storeEmbeddingsBatch(embeddings) {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const timestamp = new Date().toISOString();

    embeddings.forEach(embedding => {
      store.put({
        ...embedding,
        lastUpdated: timestamp
      });
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Get an embedding by ID
 * @param {string} id - Embedding ID
 * @returns {Promise<object|null>}
 */
export async function getEmbedding(id) {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all embeddings
 * @returns {Promise<object[]>}
 */
export async function getAllEmbeddings() {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get embeddings by content type
 * @param {string} contentType - The content type to filter by
 * @returns {Promise<object[]>}
 */
export async function getEmbeddingsByType(contentType) {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('contentType');
    const request = index.getAll(contentType);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get embeddings by project ID
 * @param {string} projectId - The project ID to filter by
 * @returns {Promise<object[]>}
 */
export async function getEmbeddingsByProject(projectId) {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('projectId');
    const request = index.getAll(projectId);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete an embedding by ID
 * @param {string} id - Embedding ID
 * @returns {Promise<void>}
 */
export async function deleteEmbedding(id) {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete embeddings by content ID
 * @param {string} contentId - Content ID to delete
 * @returns {Promise<void>}
 */
export async function deleteEmbeddingsByContentId(contentId) {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('contentId');
    const request = index.openCursor(contentId);

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Clear all embeddings from the database
 * @returns {Promise<void>}
 */
export async function clearAllEmbeddings() {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get count of embeddings
 * @returns {Promise<number>}
 */
export async function getEmbeddingsCount() {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get metadata about stored embeddings (without the actual vectors)
 * @returns {Promise<object>}
 */
export async function getEmbeddingsMetadata() {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const embeddings = request.result || [];
      const metadata = {
        totalCount: embeddings.length,
        byType: {},
        lastUpdated: null
      };

      embeddings.forEach(e => {
        // Count by type
        metadata.byType[e.contentType] = (metadata.byType[e.contentType] || 0) + 1;

        // Track latest update
        if (!metadata.lastUpdated || e.lastUpdated > metadata.lastUpdated) {
          metadata.lastUpdated = e.lastUpdated;
        }
      });

      resolve(metadata);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Check if an embedding exists and has the same checksum
 * @param {string} id - Embedding ID
 * @param {string} checksum - Checksum to compare
 * @returns {Promise<boolean>} - True if exists with same checksum
 */
export async function hasValidEmbedding(id, checksum) {
  const existing = await getEmbedding(id);
  return existing && existing.checksum === checksum;
}
