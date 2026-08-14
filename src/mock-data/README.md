# 路線・駅・列車マスタ モックデータ

`docs/01_requirements.md` §7.2 のER図に対応する、路線・駅・列車マスタのモックJSONデータです。
各ファイルは対応する型定義（`src/types/station.js`, `src/types/common.js`, `src/types/train.js`）の1テーブル＝1配列に対応します。

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
| `train-types.json` | `train.js` の `TrainType` |
| `trains.json` | `train.js` の `Train` |
| `train-line-segments.json` | `train.js` の `TrainLineSegment` |
| `train-stops.json` | `train.js` の `TrainStop` |
| `formations.json` | `train.js` の `Formation` |
| `cars.json` | `train.js` の `Car` |
| `car-facilities.json` | `train.js` の `CarFacility` |

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

## 列車マスタのサンプル（直通運転を含む）

`docs/01_requirements.md` §3（決定事項No.9）の直通運転対応を示すため、上記の路線網上に4本の列車を用意した。

| trainId | trainNumber | 運行区間（`TRAIN_LINE_SEGMENT`） | 種別の変化 | 通過駅 |
|---|---|---|---|---|
| 1 | 1001 | 東央本線のみ（中央駅→桜台駅） | 各停のみ・直通なし | なし |
| 2 | 5001 | 東央本線のみ（中央駅→桜台駅） | 急行のみ・直通なし | 東央駅を通過 |
| 3 | 3001A | 東央支線→東央本線→みらい1号線（花見台駅→みらい浜駅、3路線をまたぐ直通） | 各停（支線）→快速（本線）→急行（みらい1号線）と区間ごとに変化 | 東央駅・波止場駅を通過 |
| 4 | M-201 | みらい1号線→東央本線（みらい浜駅→中央駅、事業者をまたぐ直通） | 各停（みらい1号線）→各停（本線）※運行事業者はみらい高速鉄道 | なし |

- `TRAIN_LINE_SEGMENT.isThroughService` は、列車が自社の基準となる区間（先頭区間）を離れて他路線に乗り入れる区間で `true` としている。
- `TRAIN_STOP` は通過駅も含めて `sequence` で連続採番し、`stopType='PASS'` の行には `arrivalTime`/`departureTime`/`platformId` を設定していない（着発時刻表示の対象外のため）。

## `TRAIN_TYPE` のサンプル

| trainTypeId | 事業者 | typeCode | 用途 |
|---|---|---|---|
| 1 | 東央鉄道 | LOCAL | 各駅停車 |
| 2 | 東央鉄道 | RAPID | 快速（一部駅を通過） |
| 3 | 東央鉄道 | EXPRESS | 急行（列車5001で使用） |
| 4 | みらい高速鉄道 | LOCAL | 各駅停車 |
| 5 | みらい高速鉄道 | EXPRESS | 急行（列車3001Aのみらい1号線区間で使用） |

## 編成・号車マスタのサンプル

`docs/01_requirements.md` §7.2（`FORMATION`/`CAR`/`CAR_FACILITY`）に対応するモックデータ。両数の異なる2編成を用意した。

| formationId | formationCode | carCount | 用途 |
|---|---|---|---|
| 1 | TOU-8000-A | 8 | 東央鉄道の8両編成 |
| 2 | MRT-3000-B | 4 | みらい高速鉄道の4両編成 |

- `CAR` は各編成の号車ごとに `sequence`（編成内の位置）・`doorCount`（片側ドア数）を設定し、優先席（`hasPrioritySeat`）・女性専用車（`isWomenOnly`）・弱冷房車（`isWeakAc`）のサンプルをそれぞれ含む。
- `CAR_FACILITY` は一部の号車（各編成の先頭・中間・最後尾付近）にのみ、トイレ・車椅子スペース・WiFiを設定している。

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
| 9601-9699 | 列車種別名 (`TRAIN_TYPE.nameTextKeyId`) |
| 9701-9799 | 列車の経由表記 (`TRAIN.viaTextKeyId`) |
| 9801-9899 | 編成の形式名 (`FORMATION.seriesTextKeyId`) |
| 9901-9999 | 号車設備名称 (`CAR_FACILITY.labelTextKeyId`) |

同様に `symbolDesignId`（`SYMBOL_DESIGN`）も別Issueで整備される想定のプレースホルダー参照です。

## バリデーション

`mock-data.test.js` で以下を確認しています。

- 各レコードが型定義の必須プロパティを備えていること
- 外部キーが対応するテーブルの主キーに存在すること（参照整合性）
- 受け入れ条件（2事業者以上・3路線以上、各路線4駅以上、`TRANSFER_INFO` の自社線／他社線サンプル、`STATION_NUMBER` の1駅複数番号サンプル）を満たすこと
- 列車マスタの受け入れ条件（直通なし列車／2路線以上にまたがる直通列車の両方、`TRAIN_STOP` の `stop_type='PASS'` サンプル、`TRAIN_LINE_SEGMENT` の区間ごとの種別変化サンプル、`TRAIN_TYPE` 3種類以上）を満たすこと
- 編成・号車マスタの受け入れ条件（両数の異なる編成2種類以上、各号車の`sequence`/`doorCount`等の属性設定、一部号車への車両設備（トイレ／車椅子スペース／WiFi）設定）を満たすこと
