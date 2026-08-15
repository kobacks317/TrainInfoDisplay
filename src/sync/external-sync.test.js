// 外部DB同期スタブのテスト
// 参照: docs/01_requirements.md §3（決定事項No.1）, §5（同期）

import { describe, expect, it } from 'vitest';
import { applySync, diffRecords, runExternalSync } from './external-sync.js';
import mirrorSnapshot from './fixtures/mirror-snapshot.json';
import externalSnapshot from './fixtures/external-snapshot.json';
import operators from '../mock-data/operators.json';

const FIXED_NOW = '2026-08-15T09:00:00+09:00';
const fixedNow = () => FIXED_NOW;

describe('diffRecords', () => {
  const mirror = [
    { id: 1, name: 'A', color: 'red' },
    { id: 2, name: 'B', color: 'blue' },
    { id: 3, name: 'C', color: 'green' },
  ];

  it('外部システム側にのみ存在するレコードをaddedとして検出する', () => {
    const incoming = [...mirror, { id: 4, name: 'D', color: 'yellow' }];
    const diff = diffRecords(mirror, incoming, 'id');
    expect(diff.added).toEqual([{ id: 4, name: 'D', color: 'yellow' }]);
  });

  it('値が変化したレコードをupdatedとして検出し、変化したフィールド名を含む', () => {
    const incoming = [mirror[0], { id: 2, name: 'B2', color: 'blue' }, mirror[2]];
    const diff = diffRecords(mirror, incoming, 'id');
    expect(diff.updated).toEqual([
      { id: 2, before: mirror[1], after: incoming[1], changedFields: ['name'] },
    ]);
  });

  it('ミラー側にのみ存在するレコードをdeletedとして検出する', () => {
    const incoming = mirror.filter((record) => record.id !== 3);
    const diff = diffRecords(mirror, incoming, 'id');
    expect(diff.deleted).toEqual([mirror[2]]);
  });

  it('値が変化していないレコードはunchangedとして検出する', () => {
    const incoming = mirror.map((record) => ({ ...record }));
    const diff = diffRecords(mirror, incoming, 'id');
    expect(diff.added).toEqual([]);
    expect(diff.updated).toEqual([]);
    expect(diff.deleted).toEqual([]);
    expect(diff.unchanged).toHaveLength(3);
  });

  it('sourceSystem/sourceUpdatedAt/syncedAtの差異は内容の変化とみなさない', () => {
    const incoming = [
      { ...mirror[0], sourceSystem: 'external-mock', syncedAt: '2026-08-15T00:00:00+09:00' },
      mirror[1],
      mirror[2],
    ];
    const diff = diffRecords(mirror, incoming, 'id');
    expect(diff.updated).toEqual([]);
    expect(diff.unchanged).toHaveLength(3);
  });
});

describe('applySync', () => {
  const mirror = [
    {
      id: 1,
      name: 'A',
      sourceSystem: 'mock',
      sourceUpdatedAt: '2026-08-01T00:00:00+09:00',
      syncedAt: '2026-08-01T00:00:00+09:00',
    },
    {
      id: 2,
      name: 'B',
      sourceSystem: 'mock',
      sourceUpdatedAt: '2026-08-01T00:00:00+09:00',
      syncedAt: '2026-08-01T00:00:00+09:00',
    },
  ];

  it('追加・更新・変更なしの全レコードにsyncedAtを同期実行時刻で付与する', () => {
    const incoming = [
      { id: 1, name: 'A' },
      { id: 2, name: 'B2', sourceUpdatedAt: '2026-08-14T00:00:00+09:00' },
      { id: 3, name: 'C' },
    ];
    const { records } = applySync(mirror, incoming, 'id', { now: fixedNow });
    expect(records.every((record) => record.syncedAt === FIXED_NOW)).toBe(true);
  });

  it('外部システム側のsourceSystem/sourceUpdatedAtを優先して採用する', () => {
    const incoming = [
      {
        id: 1,
        name: 'A',
        sourceSystem: 'external-mock',
        sourceUpdatedAt: '2026-08-14T00:00:00+09:00',
      },
    ];
    const { records } = applySync([mirror[0]], incoming, 'id', { now: fixedNow });
    expect(records[0]).toMatchObject({
      sourceSystem: 'external-mock',
      sourceUpdatedAt: '2026-08-14T00:00:00+09:00',
    });
  });

  it('外部システム側にsourceSystem/sourceUpdatedAtが無ければミラー側の値を引き継ぐ', () => {
    const incoming = [{ id: 1, name: 'A' }];
    const { records } = applySync([mirror[0]], incoming, 'id', { now: fixedNow });
    expect(records[0]).toMatchObject({
      sourceSystem: 'mock',
      sourceUpdatedAt: '2026-08-01T00:00:00+09:00',
    });
  });

  it('どちらにも値が無い新規レコードは既定のsourceSystemとsyncedAtを使う', () => {
    const incoming = [{ id: 5, name: 'E' }];
    const { records } = applySync([], incoming, 'id', { now: fixedNow });
    expect(records[0]).toMatchObject({
      sourceSystem: 'external-mock',
      sourceUpdatedAt: FIXED_NOW,
      syncedAt: FIXED_NOW,
    });
  });

  it('削除されたレコードは結果に含まれない', () => {
    const incoming = [{ id: 1, name: 'A' }];
    const { records, diff } = applySync(mirror, incoming, 'id', { now: fixedNow });
    expect(records.map((r) => r.id)).toEqual([1]);
    expect(diff.deleted).toEqual([mirror[1]]);
  });
});

describe('runExternalSync', () => {
  it('取込に成功した場合、差分を反映したミラーとdiffを返す（ローカルJSON差し替えによるシミュレーション）', async () => {
    const result = await runExternalSync({
      mirrorRecords: mirrorSnapshot,
      fetchIncoming: () => externalSnapshot,
      idKey: 'operatorId',
      options: { now: fixedNow },
    });

    expect(result.status).toBe('success');
    expect(result.diff.added.map((r) => r.operatorId)).toEqual([3]);
    expect(result.diff.updated.map((u) => u.id)).toEqual([2]);
    expect(result.diff.deleted.map((r) => r.operatorId)).toEqual([9]);
    expect(result.records.map((r) => r.operatorId)).toEqual([1, 2, 3]);
    expect(result.records.every((r) => r.syncedAt === FIXED_NOW)).toBe(true);
  });

  it('取込に失敗した場合は既存ミラーをそのまま返し、例外を投げない（可用性要件）', async () => {
    const failingFetch = () => Promise.reject(new Error('外部システムに接続できません'));

    const result = await runExternalSync({
      mirrorRecords: mirrorSnapshot,
      fetchIncoming: failingFetch,
      idKey: 'operatorId',
    });

    expect(result.status).toBe('failed');
    expect(result.records).toBe(mirrorSnapshot);
    expect(result.error).toBeInstanceOf(Error);
  });

  it('fetchIncomingが同期的に例外を投げた場合も失敗として扱い、既存ミラーで継続できる', async () => {
    const throwingFetch = () => {
      throw new Error('タイムアウト');
    };

    const result = await runExternalSync({
      mirrorRecords: mirrorSnapshot,
      fetchIncoming: throwingFetch,
      idKey: 'operatorId',
    });

    expect(result.status).toBe('failed');
    expect(result.records).toEqual(mirrorSnapshot);
  });
});

describe('mock-dataのOPERATORへの適用（各マスタがsourceSystem/sourceUpdatedAt/syncedAtを保持し、同期実行で更新されることの確認）', () => {
  it('各レコードがsourceSystem/sourceUpdatedAt/syncedAtを保持する', () => {
    for (const operator of operators) {
      expect(operator).toHaveProperty('sourceSystem');
      expect(operator).toHaveProperty('sourceUpdatedAt');
      expect(operator).toHaveProperty('syncedAt');
    }
  });

  it('同期を実行するとsyncedAtが更新される', async () => {
    const result = await runExternalSync({
      mirrorRecords: operators,
      fetchIncoming: () => operators.map((operator) => ({ ...operator })),
      idKey: 'operatorId',
      options: { now: fixedNow },
    });

    expect(result.status).toBe('success');
    expect(result.records.every((record) => record.syncedAt === FIXED_NOW)).toBe(true);
    expect(operators.every((record) => record.syncedAt !== FIXED_NOW)).toBe(true);
  });
});
