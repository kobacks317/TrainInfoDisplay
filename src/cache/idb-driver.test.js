import { describe, expect, it } from 'vitest';
import { openCacheDatabase, idbGet, idbGetAll, idbPut, idbDelete, idbClear } from './idb-driver.js';
import { createMemoryIndexedDb } from './memory-indexed-db.js';

function openTestDb(idbFactory, { dbName = 'test-db', version = 1, storeNames = ['items'] } = {}) {
  return openCacheDatabase({ idbFactory, dbName, version, storeNames });
}

describe('openCacheDatabase / idbGet / idbPut', () => {
  it('保存した値を取得できる', async () => {
    const idbFactory = createMemoryIndexedDb();
    const db = await openTestDb(idbFactory);

    await idbPut(db, 'items', 'a', { value: 1 });

    expect(await idbGet(db, 'items', 'a')).toEqual({ value: 1 });
  });

  it('未保存のキーはundefinedを返す', async () => {
    const idbFactory = createMemoryIndexedDb();
    const db = await openTestDb(idbFactory);

    expect(await idbGet(db, 'items', 'missing')).toBeUndefined();
  });

  it('同じキーへのputは上書きする', async () => {
    const idbFactory = createMemoryIndexedDb();
    const db = await openTestDb(idbFactory);

    await idbPut(db, 'items', 'a', { value: 1 });
    await idbPut(db, 'items', 'a', { value: 2 });

    expect(await idbGet(db, 'items', 'a')).toEqual({ value: 2 });
  });
});

describe('idbGetAll', () => {
  it('ストア内の全ての値を返す', async () => {
    const idbFactory = createMemoryIndexedDb();
    const db = await openTestDb(idbFactory);

    await idbPut(db, 'items', 'a', { value: 1 });
    await idbPut(db, 'items', 'b', { value: 2 });

    expect(await idbGetAll(db, 'items')).toEqual(
      expect.arrayContaining([{ value: 1 }, { value: 2 }]),
    );
  });
});

describe('idbDelete / idbClear', () => {
  it('idbDeleteは指定キーのみ削除する', async () => {
    const idbFactory = createMemoryIndexedDb();
    const db = await openTestDb(idbFactory);
    await idbPut(db, 'items', 'a', 1);
    await idbPut(db, 'items', 'b', 2);

    await idbDelete(db, 'items', 'a');

    expect(await idbGet(db, 'items', 'a')).toBeUndefined();
    expect(await idbGet(db, 'items', 'b')).toBe(2);
  });

  it('idbClearはストア内の全レコードを削除する', async () => {
    const idbFactory = createMemoryIndexedDb();
    const db = await openTestDb(idbFactory);
    await idbPut(db, 'items', 'a', 1);
    await idbPut(db, 'items', 'b', 2);

    await idbClear(db, 'items');

    expect(await idbGetAll(db, 'items')).toEqual([]);
  });
});

describe('スキーマバージョニング', () => {
  it('同じバージョンで再度開いてもデータは保持される', async () => {
    const idbFactory = createMemoryIndexedDb();
    let db = await openTestDb(idbFactory, { version: 1 });
    await idbPut(db, 'items', 'a', { value: 1 });

    db = await openTestDb(idbFactory, { version: 1 });

    expect(await idbGet(db, 'items', 'a')).toEqual({ value: 1 });
  });

  it('より大きいバージョンで開くと、全オブジェクトストアが作り直され旧データは破棄される', async () => {
    const idbFactory = createMemoryIndexedDb();
    let db = await openTestDb(idbFactory, { version: 1, storeNames: ['items'] });
    await idbPut(db, 'items', 'a', { value: 1 });

    db = await openTestDb(idbFactory, { version: 2, storeNames: ['items', 'meta'] });

    expect(await idbGet(db, 'items', 'a')).toBeUndefined();
    expect(await idbGetAll(db, 'meta')).toEqual([]);
  });
});
