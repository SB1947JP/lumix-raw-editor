/**
 * Persists the last-opened RAW file's bytes across page reloads, via
 * IndexedDB — the file can be tens to hundreds of megabytes, well past
 * localStorage's ~5-10MB quota, and IndexedDB's async API doesn't block the
 * main thread the way localStorage's synchronous one would for a blob this size.
 *
 * A single slot ("current") is all this app needs — reopening a different
 * file naturally overwrites it, which is the same "resume where I left off"
 * semantics as the edit-params/crop-tool state persisted via zustand's
 * `persist` middleware (see state/editParams.ts, state/cropTool.ts).
 */

const DB_NAME = 'lumix-raw-editor';
const STORE_NAME = 'session';
const DB_VERSION = 1;
const KEY = 'current';

export interface StoredSession {
  fileName: string;
  bytes: Uint8Array;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Persistence is a convenience, never a requirement — any failure (private
 *  browsing, quota, disabled storage) is swallowed so it can't block editing. */
export async function saveSession(session: StoredSession): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(session, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore
  }
}

export async function loadSession(): Promise<StoredSession | null> {
  try {
    const db = await openDb();
    const result = await new Promise<StoredSession | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore
  }
}
