// 表示ウィンドウ用IndexedDBキャッシュ層
// マスタデータ・画面定義（テンプレート/レイアウト/スライドショー）・現在状態をIndexedDBへ永続化し、
// 通信断でも直前のキャッシュから継続表示できるようにする（可用性）。
// 参照: docs/01_requirements.md §5（可用性）, §8.1
// docs/02_screen_design.md §5.7（D-01）, §7.2（CONFIG_UPDATE）

import { openCacheDatabase, idbGet, idbPut, idbDelete, idbClear } from './idb-driver.js';

/** キャッシュのスキーマバージョン。保存データの構造を変える場合はこれを上げる（既存キャッシュは破棄される）。 */
export const CACHE_SCHEMA_VERSION = 1;

export const DEFAULT_DB_NAME = 'rail-guide-display-cache';

const STORE_NAME = 'cacheEntries';

/** キャッシュ内で保存/取得できる3種類のデータの保存キー。 */
export const CACHE_KEYS = Object.freeze({
  MASTER_DATA: 'masterData',
  SCREEN_DEFINITIONS: 'screenDefinitions',
  CURRENT_STATE: 'currentState',
});

/**
 * 表示ウィンドウ用のIndexedDBキャッシュを生成する。
 *
 * @param {Object} [options]
 * @param {IDBFactory} [options.idbFactory] - `indexedDB`実装。省略時は`globalThis.indexedDB`（テストでは差し替える）
 * @param {string} [options.dbName] - データベース名
 * @param {number} [options.schemaVersion] - キャッシュのスキーマバージョン
 * @param {() => string} [options.now] - 保存時刻の生成関数（テスト用に差し替え可能）
 */
export function createDisplayCache({
  idbFactory = globalThis.indexedDB,
  dbName = DEFAULT_DB_NAME,
  schemaVersion = CACHE_SCHEMA_VERSION,
  now = () => new Date().toISOString(),
} = {}) {
  let dbPromise = null;

  function getDb() {
    if (!dbPromise) {
      dbPromise = openCacheDatabase({
        idbFactory,
        dbName,
        version: schemaVersion,
        storeNames: [STORE_NAME],
      });
    }
    return dbPromise;
  }

  async function save(key, data) {
    const db = await getDb();
    await idbPut(db, STORE_NAME, key, { data, schemaVersion, cachedAt: now() });
  }

  async function load(key) {
    const db = await getDb();
    const entry = await idbGet(db, STORE_NAME, key);
    if (!entry) return undefined;
    // データベースのバージョンは同一でも、レコード保存時と現在でスキーマバージョンが異なる場合
    // （schemaVersion定数の変更漏れ等）は無効なキャッシュとして扱う
    if (entry.schemaVersion !== schemaVersion) return undefined;
    return entry.data;
  }

  return {
    /** @param {any} data @returns {Promise<void>} */
    saveMasterData: (data) => save(CACHE_KEYS.MASTER_DATA, data),
    /** @returns {Promise<any | undefined>} */
    getMasterData: () => load(CACHE_KEYS.MASTER_DATA),

    /** @param {any} data @returns {Promise<void>} */
    saveScreenDefinitions: (data) => save(CACHE_KEYS.SCREEN_DEFINITIONS, data),
    /** @returns {Promise<any | undefined>} */
    getScreenDefinitions: () => load(CACHE_KEYS.SCREEN_DEFINITIONS),

    /** @param {any} state @returns {Promise<void>} */
    saveCurrentState: (state) => save(CACHE_KEYS.CURRENT_STATE, state),
    /** @returns {Promise<any | undefined>} */
    getCurrentState: () => load(CACHE_KEYS.CURRENT_STATE),

    /**
     * 画面定義キャッシュのみを破棄する。`CONFIG_UPDATE`受信時に使用する。
     * @returns {Promise<void>}
     */
    invalidateScreenDefinitions: async () => {
      const db = await getDb();
      await idbDelete(db, STORE_NAME, CACHE_KEYS.SCREEN_DEFINITIONS);
    },

    /** キャッシュを全て破棄する。 @returns {Promise<void>} */
    clearAll: async () => {
      const db = await getDb();
      await idbClear(db, STORE_NAME);
    },

    /** データベース接続を閉じる（テストの後始末等で使用）。 @returns {Promise<void>} */
    close: async () => {
      if (!dbPromise) return;
      const db = await dbPromise;
      db.close();
      dbPromise = null;
    },
  };
}

/**
 * 起動時のキャッシュ優先表示フロー（docs/01_requirements.md §5「起動時にキャッシュがあれば
 * まず表示し、最新データ取得後に更新する」/ §8.1 手順4）。
 *
 * キャッシュがあれば即座に`onUpdate(cached, { fromCache: true })`で反映し、続けて
 * `fetchFresh`で最新データを取得できればキャッシュを更新し`onUpdate(fresh, { fromCache: false })`で反映する。
 * `fetchFresh`が失敗しても、キャッシュがあれば例外を投げず直前のキャッシュ表示を継続する
 * （通信断時もキャッシュで継続表示するという可用性要件に対応）。キャッシュも取得もできない場合のみ例外を投げる。
 *
 * @param {Object} params
 * @param {() => Promise<any | undefined>} params.getCached
 * @param {(data: any) => Promise<void>} params.saveCache
 * @param {() => Promise<any>} params.fetchFresh
 * @param {(data: any, meta: { fromCache: boolean }) => void} params.onUpdate
 * @returns {Promise<{ usedCache: boolean, fresh: any | undefined }>}
 */
export async function loadCacheFirst({ getCached, saveCache, fetchFresh, onUpdate }) {
  const cached = await getCached();
  const usedCache = cached !== undefined;
  if (usedCache) {
    onUpdate(cached, { fromCache: true });
  }

  let fresh;
  try {
    fresh = await fetchFresh();
  } catch (error) {
    if (!usedCache) throw error;
    return { usedCache, fresh: undefined };
  }

  await saveCache(fresh);
  onUpdate(fresh, { fromCache: false });
  return { usedCache, fresh };
}

/**
 * `CONFIG_UPDATE`受信時のキャッシュ再取得（docs/02_screen_design.md §7.2）。
 * 画面定義キャッシュを破棄してから最新の画面定義を取得し、キャッシュへ保存する。
 *
 * @param {ReturnType<typeof createDisplayCache>} cache
 * @param {() => Promise<any>} fetchScreenDefinitions
 * @returns {Promise<any>}
 */
export async function handleConfigUpdate(cache, fetchScreenDefinitions) {
  await cache.invalidateScreenDefinitions();
  const fresh = await fetchScreenDefinitions();
  await cache.saveScreenDefinitions(fresh);
  return fresh;
}
