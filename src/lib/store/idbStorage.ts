import type { StateStorage } from "zustand/middleware";

/**
 * IndexedDB-backed key/value storage for the Zustand persist middleware.
 *
 * Projects embed their media (images / video / audio) as data URLs, which easily
 * blow past `localStorage`'s ~5 MB quota (the "exceeded the quota" crash). IndexedDB
 * has a far larger quota (typically hundreds of MB to GBs, disk-based), so users can
 * save unlimited scenes/media and export freely.
 *
 * A minimal single-store wrapper — no external dependency. Falls back gracefully to
 * `localStorage` (and to a no-op on the server) when IndexedDB is unavailable, and
 * migrates any project library previously saved in `localStorage`.
 */
const DB_NAME = "nvg-db";
const STORE = "keyval";

const hasIDB = () => typeof indexedDB !== "undefined";
const hasLS = () => {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
};

function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => {
        resolve(req.result as T);
        db.close();
      };
      tx.onerror = () => {
        reject(tx.error);
        db.close();
      };
      tx.onabort = () => {
        reject(tx.error);
        db.close();
      };
    };
  });
}

export const idbStorage: StateStorage = {
  getItem: async (name) => {
    if (hasIDB()) {
      try {
        const v = await withStore<string | undefined>("readonly", (s) => s.get(name));
        if (v != null) return v;
      } catch {
        /* fall through to localStorage */
      }
    }
    // One-time migration / fallback: read any value from the old localStorage store.
    if (hasLS()) {
      try {
        return localStorage.getItem(name);
      } catch {
        /* ignore */
      }
    }
    return null;
  },

  setItem: async (name, value) => {
    if (hasIDB()) {
      try {
        await withStore("readwrite", (s) => s.put(value, name));
        // Once safely in IndexedDB, drop the (limited) localStorage copy to free space.
        if (hasLS()) {
          try {
            localStorage.removeItem(name);
          } catch {
            /* ignore */
          }
        }
        return;
      } catch (err) {
        // Never let a storage failure crash the app / block export.
        console.warn("[nvg] IndexedDB write failed:", err);
      }
    }
    // Last-resort fallback; guarded so a quota error can't throw to the UI.
    if (hasLS()) {
      try {
        localStorage.setItem(name, value);
      } catch (err) {
        console.warn("[nvg] localStorage write failed (quota?):", err);
      }
    }
  },

  removeItem: async (name) => {
    if (hasIDB()) {
      try {
        await withStore("readwrite", (s) => s.delete(name));
      } catch {
        /* ignore */
      }
    }
    if (hasLS()) {
      try {
        localStorage.removeItem(name);
      } catch {
        /* ignore */
      }
    }
  },
};
