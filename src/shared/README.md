# src/shared（共通データ層）

メインウィンドウ（M系）・表示ウィンドウ（D系）の双方から参照する共通コード。

## 責務（今後拡張予定）

- データモデル・型定義（[docs/01_requirements.md](../../docs/01_requirements.md) §7 のER図に対応するモデル）
- ウィンドウ間通信（`BroadcastChannel` のメッセージ定義・送受信ラッパー。§7章のメッセージ仕様を参照）
- 多言語（i18n）：`LANGUAGE` / `TEXT_KEY` / `LOCALIZED_TEXT` に基づくテキスト解決
- 共通スタイル（`styles.css`）
- 開発用モックデータ（`mock/`）

## 現状

- `styles.css`：両ウィンドウで読み込む最小限の共通スタイル
- `environment.test.js`：テスト環境（jsdom / BroadcastChannel）の疎通確認
- `mock/`：`npm run seed` で生成する開発用モックデータ（詳細は [`mock/README.md`](./mock/README.md)）

データモデル・通信層・i18nの実装は今後のIssueで追加する。
