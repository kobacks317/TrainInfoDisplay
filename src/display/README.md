# 画面テンプレート領域描画エンジン（D-01）

表示ウィンドウ（D系）のD-01案内表示画面が使用する、`SCREEN_TEMPLATE`/`TEMPLATE_AREA`の定義から領域divを動的生成し、`SCREEN_LAYOUT`→`LAYOUT_AREA_ASSIGN`を辿って各領域へコンポーネントを描画するための描画エンジンです。
参照: `docs/02_screen_design.md` §5.7（D-01）, §4.2（表示ウィンドウ共通仕様） / `docs/01_requirements.md` §7.2（`SCREEN_TEMPLATE`/`TEMPLATE_AREA`/`SCREEN_LAYOUT`/`LAYOUT_AREA_ASSIGN`）

## ファイル構成

| ファイル | 役割 |
|---|---|
| `template-renderer.js` | 公開API。テンプレート領域のdiv生成（`buildTemplateStage`）、レイアウト割当の描画（`renderScreenLayout`）、コンテナへのマウント（`mountScreenLayout`） |
| `stage-scale.js` | 基準サイズ（`baseWidth`/`baseHeight`）から実際の表示領域サイズへの等比スケーリング計算・適用・リサイズ追従 |

## 使い方

```js
import { mountScreenLayout } from './display/template-renderer.js';
import {
  screenTemplates,
  templateAreas,
  screenLayouts,
  layoutAreaAssigns,
  contentComponents,
} from './mock-data/index.js';

const template = screenTemplates.find((t) => t.templateCode === 'TPL-16X9-BASIC');
const layout = screenLayouts.find((l) => l.templateId === template.templateId);

const { unmount } = mountScreenLayout(document.getElementById('display-root'), {
  template,
  areas: templateAreas,
  layout,
  assigns: layoutAreaAssigns,
  components: contentComponents,
  // 各コンポーネントHTMLの実描画は本エンジンのスコープ外のため、呼び出し側が委譲を受け取る
  renderComponent(areaElement, { component, assign }) {
    // 例: iframe/DOM埋め込みでcomponent.htmlPathを描画し、assign.optionValuesを渡す
  },
});

// 表示ウィンドウ終了時にリサイズ監視を停止する
unmount();
```

## 描画の考え方

- **領域の絶対配置**：`TEMPLATE_AREA.posX`/`posY`/`width`/`height`はすべて％指定であり、`buildTemplateStage`は各領域を`position: absolute`のdivとしてそのままCSSへ変換する。`zIndex`も併せて適用するため、`NOTICE_INTERRUPT`用の重なり領域（例: 割込表示エリア）も表現できる。
- **等比スケーリング**：`docs/02_screen_design.md` §4.2「表示領域は`viewBox`相当の基準サイズで設計し、ウィンドウサイズに合わせて等比スケーリングする」に対応し、ステージ要素を`template.baseWidth`×`template.baseHeight`（px換算）の固定サイズで構築したうえで、`stage-scale.js`がビューポート実サイズに収まる最大スケール（`contain`方式）をCSS `transform: scale()`で適用する。アスペクト比を変えないため、横長（16:9・32:9）・縦型のいずれのテンプレートでも表示が歪まない。
- **未割当領域**：`renderScreenLayout`は割当の無かった領域を`unassignedAreas`として返す。割込表示専用領域のように、通常のスライドショー中は意図的に未割当のままにしておく領域を呼び出し側が判別できる。
- **コンポーネント描画の委譲**：`LAYOUT_AREA_ASSIGN`が指す`CONTENT_COMPONENT`の実際のHTML描画（13種の案内コンポーネント、`docs/02_screen_design.md` §6）は本エンジンの責務ではなく、`renderComponent`コールバックへ委譲する。省略時はコンポーネントコードのプレースホルダーを描画する。
- **不正な参照の扱い**：このテンプレートに存在しない`areaId`や、マスタに存在しない`componentId`を指す割当は無視する（描画を止めない）。`layout.templateId`が渡された`template`と一致しない場合は呼び出し側の誤りとして例外を投げる。

## テスト用モックデータ

`src/mock-data/screen-templates.json`（横型16:9・横型32:9・縦型の3テンプレート）、`template-areas.json`、`content-components.json`（13種の案内コンポーネント）、`screen-layouts.json`、`layout-area-assigns.json`を用意しており、`src/mock-data/index.js`からまとめて参照できます。
