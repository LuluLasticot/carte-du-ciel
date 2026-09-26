// Accès minimal à IndexedDB : une base, un magasin clé → valeur.

const DB_NAME = 'carte-du-ciel';
const STORE = 'kv';
let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB indisponible'));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('IndexedDB bloquée'));
    });
    dbPromise.catch(() => { dbPromise = null; });
  }
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then((db) => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

export function idbGet<T>(key: string): Promise<T | undefined> { return run('readonly', (s) => s.get(key)); }
export function idbSet(key: string, value: unknown): Promise<void> { return run('readwrite', (s) => s.put(value, key)).then(() => undefined); }
/** Pour les tests : oublie la connexion ouverte. */
export function resetIdbConnection() { dbPromise = null; }
