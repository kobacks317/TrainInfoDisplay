// IndexedDBの薄いPromiseラッパー
// 表示ウィンドウのキャッシュ層（マスタ/画面定義/現在状態）が共通で使う低レベルI/O。
// 参照: docs/01_requirements.md §5（可用性）

/**
 * キャッシュ用データベースを開く。渡した`version`が既存のデータベースより大きい場合、
 * `onupgradeneeded`内で既存の全オブジェクトストアを削除し、`storeNames`のストアを作り直す
 * （スキーマバージョニング。バージョンを上げると旧データは破棄される）。
 *
 * @param {Object} params
 * @param {IDBFactory} params.idbFactory - `indexedDB`実装（本番は`globalThis.indexedDB`、テストは差し替え可能）
 * @param {string} params.dbName
 * @param {number} params.version - アプリのキャッシュスキーマバージョン
 * @param {string[]} params.storeNames - 作成するオブジェクトストア名の一覧
 * @returns {Promise<IDBDatabase>}
 */
export function openCacheDatabase({ idbFactory, dbName, version, storeNames }) {
  return new Promise((resolve, reject) => {
    const request = idbFactory.open(dbName, version);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of Array.from(db.objectStoreNames)) {
        db.deleteObjectStore(name);
      }
      for (const name of storeNames) {
        db.createObjectStore(name);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      // 他のタブ／表示ウィンドウが上位バージョンで開こうとした際、この接続を開いたままだと
      // versionchangeがブロックされ相手の open() が永久に解決しなくなる。
      // IndexedDBの標準的な作法として、versionchange通知を受けたら自接続を閉じる。
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * 単一ストアに対して1つの操作を行い、トランザクションの完了を待って結果を返す。
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {IDBTransactionMode} mode
 * @param {(store: IDBObjectStore) => IDBRequest | undefined} operation
 * @returns {Promise<any>}
 */
function withStore(db, storeName, mode, operation) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;
    const request = operation(store);
    if (request) {
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => reject(request.error);
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDBトランザクションが中断されました'));
  });
}

/** @param {IDBDatabase} db @param {string} storeName @param {string} key @returns {Promise<any>} */
export function idbGet(db, storeName, key) {
  return withStore(db, storeName, 'readonly', (store) => store.get(key));
}

/** @param {IDBDatabase} db @param {string} storeName @returns {Promise<any[]>} */
export function idbGetAll(db, storeName) {
  return withStore(db, storeName, 'readonly', (store) => store.getAll());
}

/**
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {string} key
 * @param {any} value
 * @returns {Promise<void>}
 */
export function idbPut(db, storeName, key, value) {
  return withStore(db, storeName, 'readwrite', (store) => store.put(value, key));
}

/**
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @param {string} key
 * @returns {Promise<void>}
 */
export function idbDelete(db, storeName, key) {
  return withStore(db, storeName, 'readwrite', (store) => store.delete(key));
}

/** @param {IDBDatabase} db @param {string} storeName @returns {Promise<void>} */
export function idbClear(db, storeName) {
  return withStore(db, storeName, 'readwrite', (store) => store.clear());
}
