# 路線・駅マスタ モックデータ

`docs/01_requirements.md` §7.2 のER図に対応する、路線・駅マスタのモックJSONデータです。
各ファイルは対応する型定義（`src/types/station.js`, `src/types/common.js`）の1テーブル＝1配列に対応します。

## ファイル構成

| ファイル | 対応する型 (`src/types/`) |
|---|---|
| `operators.json` | `station.js` の `Operator` |
| `lines.json` | `station.js` の `Line` |
| `line-symbols.json` | `common.js` の `LineSymbol` |
| `stations.json` | `station.js` の `Station` |
| `line-stations.json` | `station.js` の `LineStation` |
| `station-numbers.json` | `common.js` の `StationNumber` |
| `transfer-info.json` | `station.js` の `TransferInfo` |
| `platforms.json` | `station.js` の `Platform` |
| `platform-facilities.json` | `station.js` の `PlatformFacility` |

`index.js` から全ファイルをまとめてimportできます。

## モデル構成（サンプルの路線網）

2事業者・3路線・9駅からなる、直通運転と乗換を含む架空の路線網です。

```
東央鉄道(TOU)                        みらい高速鉄道(MRT)
├─ 東央本線(TOU-MAIN) 青              └─ みらい1号線(MRT-1) 橙
│   中央駅 ─ 東央駅 ─ 港駅 ─ 桜台駅          中央駅 ─ 港駅 ─ 波止場駅 ─ みらい浜駅
└─ 東央支線(TOU-BRANCH) 緑
    中央駅 ─ 緑丘駅 ─ 桜並木駅 ─ 花見台駅
```

- **中央駅**：東央本線・東央支線・みらい1号線の3路線が乗り入れるハブ駅（`LINE_STATION` に3レコード）。
- **港駅**：東央本線とみらい1号線が乗り入れる乗換駅。
- 直通運転を表現するため、中央駅（東央本線側 `lineStationId=1`）には `STATION_NUMBER` を2件保持させ、自社番号（`TO-01`）とみらい1号線側の番号（`MR-01`）を併記している。

## `TRANSFER_INFO` のサンプル

| transferId | 乗換元 | `toLineId` | 内容 |
|---|---|---|---|
| 1 | 中央駅（東央本線） | 2（東央支線） | 自社線内の乗換 |
| 2 | 中央駅（東央本線） | 3（みらい1号線） | DB内に存在する他事業者路線への乗換 |
| 3 | 港駅（東央本線） | 3（みらい1号線） | 同上 |
| 4 | 港駅（みらい1号線） | 未設定 | 自社DBに存在しない他社線（臨海高速鉄道）への乗換 |
| 5 | みらい浜駅（みらい1号線） | 未設定 | 自社DBに存在しない他社線への乗換 |

## `*TextKeyId` について

このモックデータの `nameTextKeyId` 等はすべて `TEXT_KEY`/`LOCALIZED_TEXT`（多言語テキスト管理）のモックが別Issueで整備されることを前提としたプレースホルダーIDです。本データ内では以下の対応で採番しています（実データは未整備）。

| ID範囲 | 用途 |
|---|---|
| 9001-9099 | 事業者名 (`OPERATOR.nameTextKeyId`) |
| 9101-9199 | 路線名 (`LINE.nameTextKeyId`) |
| 9201-9299 | 駅名 (`STATION.nameTextKeyId`) |
| 9301-9399 | 乗換先路線名・事業者名・備考 (`TRANSFER_INFO.*TextKeyId`) |
| 9401-9499 | ホーム方面表記 (`PLATFORM.directionTextKeyId`) |
| 9501-9599 | ホーム設備名称 (`PLATFORM_FACILITY.labelTextKeyId`) |

同様に `symbolDesignId`（`SYMBOL_DESIGN`）も別Issueで整備される想定のプレースホルダー参照です。

## バリデーション

`mock-data.test.js` で以下を確認しています。

- 各レコードが型定義の必須プロパティを備えていること
- 外部キーが対応するテーブルの主キーに存在すること（参照整合性）
- 受け入れ条件（2事業者以上・3路線以上、各路線4駅以上、`TRANSFER_INFO` の自社線／他社線サンプル、`STATION_NUMBER` の1駅複数番号サンプル）を満たすこと
