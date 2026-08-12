# src/shared/mock

開発用のモックデータ（外部DBミラーを模したダミーデータ）を扱う。

- `fixtures.js`：路線・駅・列車などの最小限のダミーデータ
- `buildSeedData.js`：`fixtures.js` を集約したモックデータセットを組み立てる
- `data/seed.json`：`npm run seed` の出力先（`scripts/seed.js` が生成する）

## 使い方

```sh
npm run seed
```

`src/shared/mock/data/seed.json` にモックデータが書き出される。開発中はメインウィンドウ・表示ウィンドウからこのファイルを `fetch` して仮データとして利用する想定。

本番相当のデータモデル（ER図: [docs/01_requirements.md](../../../docs/01_requirements.md) §7）に基づく設計・実装は今後のIssueで対応する。
