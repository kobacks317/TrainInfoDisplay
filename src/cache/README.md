# 表示ウィンドウ用IndexedDBキャッシュ層

表示ウィンドウ（D系）がマスタデータ・画面定義（テンプレート/レイアウト/スライドショー）・現在状態をIndexedDBへ永続化し、通信断でも直前のキャッシュから継続表示できるようにするための永続化層です。
参照: `docs/01_requirements.md` §5（可用性）, §8.1 / `docs/02_screen_design.md` §5.7（D-01）, §7.2（`CONFIG_UPDATE`）

## ファイル構成

| ファイル | 役割 |
|---|---|
| `idb-driver.js` | IndexedDBの薄いPromiseラッパー（open・get・put・delete・clear・getAll） |
| `display-cache.js` | 公開API。マスタデータ／画面定義／現在状態の保存・取得、スキーマバージョニング、キャッシュ優先表示フロー、`CONFIG_UPDATE`時の再取得 |

## 使い方

```js
import { createDisplayCache, loadCacheFirst, handleConfigUpdate } from './cache/display-cache.js';

const cache = createDisplayCache(); // 本番は globalThis.indexedDB を使用

// 起動時: キャッシュがあればまず表示し、最新データ取得後に更新する
await loadCacheFirst({
  getCached: cache.getMasterData,
  saveCache: cache.saveMasterData,
  fetchFresh: () => fetchMasterDataFromServer(),
  onUpdate: (masterData, { fromCache }) => render(masterData, fromCache),
});

// CONFIG_UPDATE 受信時: 画面定義キャッシュを破棄して再取得する
await handleConfigUpdate(cache, () => fetchScreenDefinitionsFromServer());
```

`saveMasterData` / `getMasterData`、`saveScreenDefinitions` / `getScreenDefinitions`、`saveCurrentState` / `getCurrentState` はそれぞれ独立したキーで保存され、`invalidateScreenDefinitions` で画面定義キャッシュのみを破棄できます。

## スキーマバージョニング

`createDisplayCache({ schemaVersion })` に渡した値がIndexedDBの`version`としてそのまま使われます。`CACHE_SCHEMA_VERSION`（`display-cache.js`）を上げてデプロイすると、次回オープン時に`onupgradeneeded`で全オブジェクトストアが作り直され、旧バージョンのキャッシュは破棄されます。保存レコードにも`schemaVersion`を埋め込んでおり、万一DBバージョンを上げ忘れた場合でも読み出し時にバージョン不一致を検出して無効なキャッシュとして扱います。

## テストについて

単体テストは`fake-indexeddb`（`IDBFactory`）を使用し、テストごとに新しいインスタンスを生成することでデータベースの状態を分離しています。
