// テスト用の最小限のIndexedDB互換実装
//
// 本来はテストに`fake-indexeddb`等の実績あるパッケージを使うのが望ましいが、この環境では
// 新規npm依存の追加・インストールができないため、`idb-driver.js`が実際に使う範囲
// （open/onupgradeneeded/transaction/get/put/delete/clear/getAll）に限定した簡易フェイクを自前で用意する。
// 実ブラウザ（表示ウィンドウ）では本物の`globalThis.indexedDB`を使用し、このフェイクは使用しない。
// 依存追加が可能になった際は、これを`fake-indexeddb`に置き換えることを推奨する。

class FakeIDBRequest {
  result = undefined;
  error = undefined;
  onsuccess = null;
  onerror = null;
  _transaction = null;

  _succeed(result) {
    this.result = result;
    queueMicrotask(() => {
      this.onsuccess?.({ target: this });
      this._transaction?._requestSettled();
    });
  }
}

class FakeObjectStore {
  constructor(map, transaction) {
    this._map = map;
    this._transaction = transaction;
  }

  _request(result) {
    const request = new FakeIDBRequest();
    request._transaction = this._transaction;
    request._succeed(result);
    return request;
  }

  get(key) {
    return this._request(this._map.has(key) ? this._map.get(key) : undefined);
  }

  getAll() {
    return this._request(Array.from(this._map.values()));
  }

  put(value, key) {
    this._map.set(key, value);
    return this._request(key);
  }

  delete(key) {
    this._map.delete(key);
    return this._request(undefined);
  }

  clear() {
    this._map.clear();
    return this._request(undefined);
  }
}

class FakeTransaction {
  oncomplete = null;
  onerror = null;
  onabort = null;
  error = undefined;
  _settled = false;

  constructor(stores) {
    this._stores = stores;
  }

  objectStore(name) {
    if (!this._stores.has(name)) {
      throw new Error(`未定義のオブジェクトストアです: ${name}`);
    }
    return new FakeObjectStore(this._stores.get(name), this);
  }

  _requestSettled() {
    if (this._settled) return;
    this._settled = true;
    queueMicrotask(() => this.oncomplete?.());
  }
}

class FakeDatabase {
  constructor(stores) {
    this._stores = stores;
  }

  get objectStoreNames() {
    const stores = this._stores;
    return {
      contains: (name) => stores.has(name),
      [Symbol.iterator]() {
        return stores.keys();
      },
    };
  }

  createObjectStore(name) {
    this._stores.set(name, new Map());
  }

  deleteObjectStore(name) {
    this._stores.delete(name);
  }

  transaction(storeNames) {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    for (const name of names) {
      if (!this._stores.has(name)) {
        throw new Error(`未定義のオブジェクトストアです: ${name}`);
      }
    }
    return new FakeTransaction(new Map(names.map((name) => [name, this._stores.get(name)])));
  }

  close() {}
}

class FakeIDBOpenRequest extends FakeIDBRequest {
  onupgradeneeded = null;
}

/**
 * テスト用の最小限のIndexedDBファクトリ（`IDBFactory`互換）を生成する。
 * 生成したデータベースの中身は、このファクトリインスタンスの中でのみ保持される
 * （テストごとに`createMemoryIndexedDb()`し直せば、状態は共有されない）。
 * @returns {IDBFactory}
 */
export function createMemoryIndexedDb() {
  const databases = new Map();

  return {
    open(name, version) {
      const request = new FakeIDBOpenRequest();
      queueMicrotask(() => {
        const existing = databases.get(name);
        const previousVersion = existing?.version ?? 0;
        const stores = existing?.stores ?? new Map();
        const db = new FakeDatabase(stores);
        request.result = db;

        if (version > previousVersion) {
          request.onupgradeneeded?.({
            target: request,
            oldVersion: previousVersion,
            newVersion: version,
          });
        }
        databases.set(name, { version, stores });
        request._succeed(db);
      });
      return request;
    },
  };
}
