# 外部DB同期スタブ

外部システム（別DB）からのマスタ取込を模したスタブです。実際の外部接続は行わず、ローカルJSON（外部システムの最新スナップショットに見立てたデータ）を取り込み元として扱い、差分検出・ミラーへの反映・`synced_at`更新をシミュレートします。
参照: `docs/01_requirements.md` §3（決定事項No.1）, §5（同期）, §7.2

## ファイル構成

| ファイル | 役割 |
|---|---|
| `external-sync.js` | 公開API。差分検出（`diffRecords`）、ミラーへの反映（`applySync`）、同期実行のシミュレーション（`runExternalSync`） |
| `fixtures/mirror-snapshot.json` | デモ・テスト用の「同期前のミラー」サンプル（`OPERATOR`相当） |
| `fixtures/external-snapshot.json` | デモ・テスト用の「外部システムの最新スナップショット」サンプル。ミラーに対して追加・更新・削除の3パターンを含む |

## 使い方

```js
import { runExternalSync } from './sync/external-sync.js';
import currentOperators from './mock-data/operators.json';
import nextOperators from './sync/fixtures/external-snapshot.json'; // 実運用では外部DBからの取込結果に置き換える

const result = await runExternalSync({
  mirrorRecords: currentOperators,
  fetchIncoming: () => nextOperators, // ローカルJSON差し替えによる同期のシミュレーション
  idKey: 'operatorId',
});

if (result.status === 'success') {
  // result.records: 追加・更新・変更なしレコード（sourceSystem/sourceUpdatedAt/syncedAt付与済み）。削除分は除外済み
  // result.diff: 追加/更新/削除/変更なしの内訳
} else {
  // result.status === 'failed': 取込に失敗。result.records には同期前のミラーがそのまま入っており、運転を継続できる
}
```

## 差分検出の仕様

- `idKey`で指定した主キーでミラーと外部スナップショットを突き合わせ、`added`/`updated`/`deleted`/`unchanged`に分類する。
- 値の比較は`sourceSystem`/`sourceUpdatedAt`/`syncedAt`を除く全フィールドが対象（同期メタデータ自体の差異は内容の変化とみなさない）。
- `updated`には`before`/`after`に加え、実際に値が変化した`changedFields`を含む。

## 同期メタデータの更新規則

`applySync`は、外部システム側に存在するレコード（`added`/`updated`/`unchanged`）すべてに対して以下を行う。

- `syncedAt`: 同期実行のたびに現在時刻へ更新する（対象データが変化していなくても、同期が実行され最新であることを確認した事実を記録する）。
- `sourceSystem`/`sourceUpdatedAt`: 外部スナップショット側に値があればそれを優先し、無ければ同期前のミラー側の値、それも無ければ既定値（`sourceSystem`は`options.sourceSystem`、`sourceUpdatedAt`は今回の同期日時）を用いる。

`deleted`（外部システム側から無くなったレコード）はミラーから除外される。

## 同期失敗時の挙動

`runExternalSync`は`fetchIncoming`が例外を投げた場合・rejectした場合も例外を再送出せず、`{ status: 'failed', records: mirrorRecords, error }`を返す。呼び出し側は同期前のミラーで運転を継続できる（`docs/01_requirements.md` §5「同期失敗時も既存ミラーで運転継続可能とする」）。
