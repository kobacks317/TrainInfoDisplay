# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


## 仕様書
@docs/01_requirements.md
@docs/02_screen_design.md

## 使用技術
Javascript, HTML, css, json

ビルドツール（Vite等）は導入せず、ブラウザネイティブの ES Modules のみで構成する。詳細・理由は [src/README.md](./src/README.md) を参照。

## ディレクトリ構成

- `index.html` / `src/main`：メインウィンドウ（M系）。設定・操作用SPA
- `display.html` / `src/display`：表示ウィンドウ（D系）。案内表示用ポップアップ
- `src/shared`：両ウィンドウ共通のデータモデル・通信・i18n・開発用モックデータ

各ディレクトリの責務は [src/README.md](./src/README.md) およびディレクトリ配下の各READMEを参照。

## npm scripts

- `npm run lint` / `npm run lint:fix`：ESLint（JS/JSON）＋ Stylelint（CSS）
- `npm run format` / `npm run format:check`：Prettier
- `npm test` / `npm run test:watch` / `npm run test:coverage`：Vitest
- `npm run seed`：開発用モックデータを `src/shared/mock/data/seed.json` に生成（詳細は [src/shared/mock/README.md](./src/shared/mock/README.md)）
