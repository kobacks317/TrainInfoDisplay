# 型定義（JSDoc typedef）

`docs/01_requirements.md` §7 のER図に登場する全テーブルに対応する型を、JSDoc `@typedef` として定義したファイル群です。TypeScriptは導入せず、プレーンなJavaScript（`checkJs`によるエディタ上の型補完のみ）で運用します。

## ファイル構成

| ファイル | 対応するER図の区分 | 主な型 |
|---|---|---|
| `common.js` | §7.1 多言語・シンボルデザイン（共通基盤） | `Language`, `TextKey`, `LocalizedText`, `SymbolDesign`, `LineSymbol`, `StationNumber`, `TransferSymbol` |
| `station.js` | §7.2 路線・駅マスタ、路線図 | `Operator`, `Line`, `Station`, `LineStation`, `TransferInfo`, `Platform`, `PlatformFacility`, `RouteMap`, `RouteMapNode`, `RouteMapEdge` |
| `train.js` | §7.2 列車・編成・運行・お知らせ | `TrainType`, `Train`, `TrainLineSegment`, `TrainStop`, `Formation`, `Car`, `CarFacility`, `TrainRun`, `TrainRunState`, `Notice`, `NoticeTarget` |
| `screen.js` | §7.2 画面定義・スライドショー・ウィンドウ／セッション | `ScreenTemplate`, `TemplateArea`, `ContentComponent`, `ComponentOption`, `ScreenLayout`, `LayoutAreaAssign`, `Slideshow`, `SlideshowItem`, `SlideshowItemStatus`, `AppUser`, `ControlSession`, `DisplayWindow` |

各テーブルの1レコード＝1つの型（オブジェクト）に対応します。カラム名はDB上の`snake_case`から、JS慣習に合わせて`camelCase`に変換しています。

## 使い方

これらのファイルは実行時の値をエクスポートしません（`export {}`のみ）。他のJS/JSDocファイルから型として参照する場合は、動的importの型構文を使用します。

```js
/**
 * @param {import('./types/station.js').Line} line
 * @returns {string}
 */
function formatLineName(line) {
  // ...
}
```

複数の型を1つのJSDocコメントで使う場合も、都度 `import('./types/xxx.js').TypeName` の形式で参照してください。

## エディタでの型補完

リポジトリルートの `jsconfig.json` で `checkJs` を有効にしているため、VSCodeでは追加設定なしにこれらの型に基づく補完・型チェックが有効になります。
