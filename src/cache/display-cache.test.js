import { describe, expect, it, vi } from 'vitest';
import { createDisplayCache, loadCacheFirst, handleConfigUpdate } from './display-cache.js';
import { createMemoryIndexedDb } from './memory-indexed-db.js';
import { openCacheDatabase, idbPut } from './idb-driver.js';

function setupCache(overrides = {}) {
  const idbFactory = createMemoryIndexedDb();
  const cache = createDisplayCache({ idbFactory, dbName: 'test-display-cache', ...overrides });
  return { idbFactory, cache };
}

describe('createDisplayCache: マスタデータ・画面定義・現在状態の保存/取得', () => {
  it('マスタデータを保存/取得できる', async () => {
    const { cache } = setupCache();
    const masterData = { stations: [{ stationId: 1 }] };

    await cache.saveMasterData(masterData);

    expect(await cache.getMasterData()).toEqual(masterData);
  });

  it('画面定義を保存/取得できる', async () => {
    const { cache } = setupCache();
    const screenDefinitions = { slideshows: [{ slideshowId: 1 }] };

    await cache.saveScreenDefinitions(screenDefinitions);

    expect(await cache.getScreenDefinitions()).toEqual(screenDefinitions);
  });

  it('現在状態を保存/取得できる', async () => {
    const { cache } = setupCache();
    const currentState = { trainRunId: 100, trainStatus: 'RUNNING' };

    await cache.saveCurrentState(currentState);

    expect(await cache.getCurrentState()).toEqual(currentState);
  });

  it('未保存のデータはundefinedを返す', async () => {
    const { cache } = setupCache();

    expect(await cache.getMasterData()).toBeUndefined();
    expect(await cache.getScreenDefinitions()).toBeUndefined();
    expect(await cache.getCurrentState()).toBeUndefined();
  });

  it('保存のたびに上書きされる（履歴は残らない）', async () => {
    const { cache } = setupCache();

    await cache.saveCurrentState({ trainStatus: 'RUNNING' });
    await cache.saveCurrentState({ trainStatus: 'STOPPED' });

    expect(await cache.getCurrentState()).toEqual({ trainStatus: 'STOPPED' });
  });
});

describe('createDisplayCache: invalidateScreenDefinitions / clearAll', () => {
  it('invalidateScreenDefinitionsは画面定義のみを破棄する', async () => {
    const { cache } = setupCache();
    await cache.saveMasterData({ a: 1 });
    await cache.saveScreenDefinitions({ b: 2 });

    await cache.invalidateScreenDefinitions();

    expect(await cache.getScreenDefinitions()).toBeUndefined();
    expect(await cache.getMasterData()).toEqual({ a: 1 });
  });

  it('clearAllは全てのキャッシュを破棄する', async () => {
    const { cache } = setupCache();
    await cache.saveMasterData({ a: 1 });
    await cache.saveScreenDefinitions({ b: 2 });
    await cache.saveCurrentState({ c: 3 });

    await cache.clearAll();

    expect(await cache.getMasterData()).toBeUndefined();
    expect(await cache.getScreenDefinitions()).toBeUndefined();
    expect(await cache.getCurrentState()).toBeUndefined();
  });
});

describe('createDisplayCache: スキーマバージョニング', () => {
  it('保存時とスキーマバージョンが異なるレコードは無効なキャッシュとして扱われる', async () => {
    const idbFactory = createMemoryIndexedDb();
    const dbName = 'test-display-cache-version-mismatch';

    // 通常のAPIでは常に現在のschemaVersionで保存されるため、意図的に古いバージョンのレコードを
    // 低レベルAPIで直接書き込み、schemaVersionチェックのガードを検証する
    const db = await openCacheDatabase({
      idbFactory,
      dbName,
      version: 1,
      storeNames: ['cacheEntries'],
    });
    await idbPut(db, 'cacheEntries', 'masterData', {
      data: { stale: true },
      schemaVersion: 0,
      cachedAt: 't0',
    });

    const cache = createDisplayCache({ idbFactory, dbName, schemaVersion: 1 });

    expect(await cache.getMasterData()).toBeUndefined();
  });

  it('バージョンアップすると旧データは破棄される', async () => {
    const idbFactory = createMemoryIndexedDb();
    const dbName = 'test-display-cache-upgrade';

    const cacheV1 = createDisplayCache({ idbFactory, dbName, schemaVersion: 1 });
    await cacheV1.saveMasterData({ old: true });

    const cacheV2 = createDisplayCache({ idbFactory, dbName, schemaVersion: 2 });

    expect(await cacheV2.getMasterData()).toBeUndefined();
  });
});

describe('loadCacheFirst', () => {
  it('キャッシュが無い場合、最新データ取得後にonUpdateが1回呼ばれ、キャッシュへ保存される', async () => {
    const getCached = vi.fn().mockResolvedValue(undefined);
    const saveCache = vi.fn().mockResolvedValue(undefined);
    const fetchFresh = vi.fn().mockResolvedValue({ fresh: true });
    const onUpdate = vi.fn();

    const result = await loadCacheFirst({ getCached, saveCache, fetchFresh, onUpdate });

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith({ fresh: true }, { fromCache: false });
    expect(saveCache).toHaveBeenCalledWith({ fresh: true });
    expect(result).toEqual({ usedCache: false, fresh: { fresh: true } });
  });

  it('キャッシュがある場合、まずキャッシュで反映し、続けて最新データで反映・保存する', async () => {
    const getCached = vi.fn().mockResolvedValue({ cached: true });
    const saveCache = vi.fn().mockResolvedValue(undefined);
    const fetchFresh = vi.fn().mockResolvedValue({ fresh: true });
    const onUpdate = vi.fn();

    const result = await loadCacheFirst({ getCached, saveCache, fetchFresh, onUpdate });

    expect(onUpdate).toHaveBeenNthCalledWith(1, { cached: true }, { fromCache: true });
    expect(onUpdate).toHaveBeenNthCalledWith(2, { fresh: true }, { fromCache: false });
    expect(saveCache).toHaveBeenCalledWith({ fresh: true });
    expect(result).toEqual({ usedCache: true, fresh: { fresh: true } });
  });

  it('最新データ取得に失敗してもキャッシュがあれば例外を投げず、キャッシュ表示のまま継続する', async () => {
    const getCached = vi.fn().mockResolvedValue({ cached: true });
    const saveCache = vi.fn();
    const fetchFresh = vi.fn().mockRejectedValue(new Error('network error'));
    const onUpdate = vi.fn();

    const result = await loadCacheFirst({ getCached, saveCache, fetchFresh, onUpdate });

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith({ cached: true }, { fromCache: true });
    expect(saveCache).not.toHaveBeenCalled();
    expect(result).toEqual({ usedCache: true, fresh: undefined });
  });

  it('キャッシュも無く最新データ取得にも失敗した場合は例外を投げる', async () => {
    const getCached = vi.fn().mockResolvedValue(undefined);
    const saveCache = vi.fn();
    const fetchFresh = vi.fn().mockRejectedValue(new Error('network error'));
    const onUpdate = vi.fn();

    await expect(loadCacheFirst({ getCached, saveCache, fetchFresh, onUpdate })).rejects.toThrow(
      'network error',
    );
    expect(onUpdate).not.toHaveBeenCalled();
  });
});

describe('handleConfigUpdate', () => {
  it('画面定義キャッシュを破棄してから最新の画面定義を取得し、キャッシュへ保存する', async () => {
    const { cache } = setupCache();
    await cache.saveScreenDefinitions({ old: true });
    const fetchScreenDefinitions = vi.fn().mockResolvedValue({ fresh: true });

    const result = await handleConfigUpdate(cache, fetchScreenDefinitions);

    expect(fetchScreenDefinitions).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ fresh: true });
    expect(await cache.getScreenDefinitions()).toEqual({ fresh: true });
  });
});
