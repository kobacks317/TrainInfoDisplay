// 外部DB同期スタブ
// 実際の外部システム接続は行わず、ローカルJSON（外部システムの最新スナップショットを模したデータ）を
// 取り込み元として扱い、差分検出・ミラーへの反映・synced_at更新をシミュレートする。
// 参照: docs/01_requirements.md §3（決定事項No.1）, §5（同期）, §7.2

/**
 * @typedef {Object} SyncMetadata
 * @property {string} [sourceSystem] - 同期元
 * @property {string} [sourceUpdatedAt] - 外部システム側の最終更新日時（ISO日時文字列）
 * @property {string} [syncedAt] - このミラーへの同期日時（ISO日時文字列）
 */

/**
 * @typedef {Object} UpdatedRecordDiff
 * @property {number|string} id
 * @property {Object} before - 同期前（ミラー側）のレコード
 * @property {Object} after - 同期後（外部システム側）のレコード
 * @property {string[]} changedFields - 値が変化したフィールド名（sourceSystem/sourceUpdatedAt/syncedAtは除く）
 */

/**
 * @typedef {Object} UnchangedRecordDiff
 * @property {number|string} id
 * @property {Object} before
 * @property {Object} after
 */

/**
 * @typedef {Object} DiffResult
 * @property {Object[]} added - 外部システム側にのみ存在するレコード
 * @property {UpdatedRecordDiff[]} updated - 値が変化したレコード
 * @property {Object[]} deleted - ミラー側にのみ存在するレコード（外部システム側で削除された）
 * @property {UnchangedRecordDiff[]} unchanged - 値が変化していないレコード
 */

// 差分比較の対象から除外するフィールド（同期メタデータ自体は内容の変化とみなさない）
const METADATA_FIELDS = new Set(['sourceSystem', 'sourceUpdatedAt', 'syncedAt']);

/** @param {number|string} a @param {number|string} b @returns {number} */
function compareIds(a, b) {
  if (a === b) return 0;
  return a > b ? 1 : -1;
}

/** @param {Object} record @returns {Object} */
function stripMetadata(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([field]) => !METADATA_FIELDS.has(field)),
  );
}

/**
 * 2つのレコード（メタデータ除く）を比較し、値が変化したフィールド名を返す。
 * @param {Object} before
 * @param {Object} after
 * @returns {string[]}
 */
function diffFields(before, after) {
  const fields = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed = [];
  for (const field of fields) {
    if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
      changed.push(field);
    }
  }
  return changed;
}

/**
 * ミラー（現在のマスタ）と外部システムの最新スナップショットを比較し、
 * 追加／更新／削除／変更なしのレコードを検出する。
 *
 * @param {Object[]} mirrorRecords - 同期前のミラー（現在のマスタ）
 * @param {Object[]} incomingRecords - 外部システムの最新スナップショット（ローカルJSON差し替え相当）
 * @param {string} idKey - 主キーのフィールド名
 * @returns {DiffResult}
 */
export function diffRecords(mirrorRecords, incomingRecords, idKey) {
  const mirrorById = new Map(mirrorRecords.map((record) => [record[idKey], record]));
  const incomingById = new Map(incomingRecords.map((record) => [record[idKey], record]));

  const added = [];
  const updated = [];
  const unchanged = [];

  for (const [id, after] of incomingById) {
    const before = mirrorById.get(id);
    if (!before) {
      added.push(after);
      continue;
    }
    const changedFields = diffFields(stripMetadata(before), stripMetadata(after));
    if (changedFields.length > 0) {
      updated.push({ id, before, after, changedFields });
    } else {
      unchanged.push({ id, before, after });
    }
  }

  const deleted = mirrorRecords.filter((record) => !incomingById.has(record[idKey]));

  return { added, updated, deleted, unchanged };
}

/**
 * 差分をミラーへ反映する。外部システム側に存在するレコード（追加／更新／変更なし）は
 * `sourceSystem`/`sourceUpdatedAt`/`syncedAt`を付与して採用し、削除されたレコードはミラーから除外する。
 *
 * `syncedAt`は同期実行のたびに全レコードで更新される。`sourceSystem`/`sourceUpdatedAt`は
 * 外部システム側のレコードに含まれていればそれを優先し、無ければ同期前の値、それも無ければ
 * 今回の同期日時・既定の同期元を用いる。
 *
 * @param {Object[]} mirrorRecords
 * @param {Object[]} incomingRecords
 * @param {string} idKey
 * @param {Object} [options]
 * @param {() => string} [options.now] - 同期日時の生成関数（テスト用に差し替え可能）
 * @param {string} [options.sourceSystem] - `sourceSystem`が未設定の場合に使う既定値
 * @returns {{ records: Object[], diff: DiffResult, syncedAt: string }}
 */
export function applySync(mirrorRecords, incomingRecords, idKey, options = {}) {
  const {
    now = () => new Date().toISOString(),
    sourceSystem: defaultSourceSystem = 'external-mock',
  } = options;
  const diff = diffRecords(mirrorRecords, incomingRecords, idKey);
  const syncedAt = now();

  const stamp = (after, before) => ({
    ...after,
    sourceSystem: after.sourceSystem ?? before?.sourceSystem ?? defaultSourceSystem,
    sourceUpdatedAt: after.sourceUpdatedAt ?? before?.sourceUpdatedAt ?? syncedAt,
    syncedAt,
  });

  const records = [
    ...diff.added.map((after) => stamp(after, undefined)),
    ...diff.updated.map(({ before, after }) => stamp(after, before)),
    ...diff.unchanged.map(({ before, after }) => stamp(after, before)),
  ].sort((a, b) => compareIds(a[idKey], b[idKey]));

  return { records, diff, syncedAt };
}

/**
 * 外部システムとの同期実行をシミュレートする。
 *
 * `fetchIncoming`が例外／rejectした場合（外部システムへの接続失敗を模す）は、
 * 例外を再送出せず、既存のミラーをそのまま返す（可用性要件: 同期失敗時も既存ミラーで運転継続）。
 *
 * @param {Object} params
 * @param {Object[]} params.mirrorRecords - 同期前のミラー
 * @param {() => Promise<Object[]> | Object[]} params.fetchIncoming - 外部システムの最新スナップショットを取得する関数（ローカルJSON差し替えのシミュレーション）
 * @param {string} params.idKey - 主キーのフィールド名
 * @param {Object} [params.options] - {@link applySync}へ渡すオプション
 * @returns {Promise<{ status: 'success', records: Object[], diff: DiffResult, syncedAt: string } | { status: 'failed', records: Object[], error: Error }>}
 */
export async function runExternalSync({ mirrorRecords, fetchIncoming, idKey, options }) {
  try {
    const incomingRecords = await fetchIncoming();
    const { records, diff, syncedAt } = applySync(mirrorRecords, incomingRecords, idKey, options);
    return { status: 'success', records, diff, syncedAt };
  } catch (error) {
    return { status: 'failed', records: mirrorRecords, error };
  }
}
