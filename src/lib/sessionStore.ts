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
 *
 * The database itself is shared with the keyword store; see lib/idb.ts.
 */

import { SESSION_STORE, withStore } from './idb';

const KEY = 'current';

export interface StoredSession {
  fileName: string;
  bytes: Uint8Array;
}

/** Persistence is a convenience, never a requirement — any failure (private
 *  browsing, quota, disabled storage) is swallowed so it can't block editing. */
export async function saveSession(session: StoredSession): Promise<void> {
  try {
    await withStore(SESSION_STORE, 'readwrite', (os) => os.put(session, KEY));
  } catch {
    // ignore
  }
}

export async function loadSession(): Promise<StoredSession | null> {
  try {
    return await withStore<StoredSession>(SESSION_STORE, 'readonly', (os) => os.get(KEY));
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    await withStore(SESSION_STORE, 'readwrite', (os) => os.delete(KEY));
  } catch {
    // ignore
  }
}
