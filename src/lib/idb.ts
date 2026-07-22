/**
 * Shared IndexedDB handle for everything this app persists locally.
 *
 * Both the session slot (the last-opened RAW's bytes) and the keyword tags
 * live in one database, because a single IndexedDB name can only be open at
 * one version at a time — two modules each calling indexedDB.open() with their
 * own version number would deadlock the moment the second one tried to upgrade.
 *
 * The database name is deliberately still the original 'lumix-raw-editor'
 * despite the project rename: changing it would orphan every existing user's
 * stored session behind a name nothing reads any more.
 */

const DB_NAME = 'lumix-raw-editor';
// v1 = session store only. v2 adds keywords; the upgrade path below creates
// whichever stores are missing, so a v1 database upgrades in place without
// touching the session already in it.
const DB_VERSION = 2;

export const SESSION_STORE = 'session';
export const KEYWORD_STORE = 'keywords';

export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // Guarded by contains() so this is safe from any prior version — a fresh
      // install creates both, an existing v1 gains only the keyword store.
      if (!db.objectStoreNames.contains(SESSION_STORE)) db.createObjectStore(SESSION_STORE);
      if (!db.objectStoreNames.contains(KEYWORD_STORE)) db.createObjectStore(KEYWORD_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Runs one transaction against `store` and resolves with the request's result.
 *  Persistence here is always a convenience, never a requirement, so every
 *  caller treats a rejection as "no stored data" rather than an error to show. */
export async function withStore<T>(
  store: string,
  mode: IDBTransactionMode,
  run: (os: IDBObjectStore) => IDBRequest | null,
): Promise<T | null> {
  const db = await openDb();
  try {
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const req = run(tx.objectStore(store));
      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => resolve((req?.result as T) ?? null);
    });
  } finally {
    db.close();
  }
}
