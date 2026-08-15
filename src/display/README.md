# 画面テンプレート領域描画エンジン／スライドショー再生エンジン（D-01）

表示ウィンドウ（D系）のD-01案内表示画面が使用する、`SCREEN_TEMPLATE`/`TEMPLATE_AREA`の定義から領域divを動的生成し、`SCREEN_LAYOUT`→`LAYOUT_AREA_ASSIGN`を辿って各領域へコンポーネントを描画するための描画エンジンと、`SLIDESHOW`/`SLIDESHOW_ITEM`を表示順・列車状態に従って自動再生するエンジンです。
参照: `docs/02_screen_design.md` §5.7（D-01）, §4.2（表示ウィンドウ共通仕様） / `docs/01_requirements.md` FR-21, FR-22, §7.2（`SCREEN_TEMPLATE`/`TEMPLATE_AREA`/`SCREEN_LAYOUT`/`LAYOUT_AREA_ASSIGN`/`SLIDESHOW`/`SLIDESHOW_ITEM`/`SLIDESHOW_ITEM_STATUS`）

## ファイル構成

| ファイル | 役割 |
|---|---|
| `template-renderer.js` | 公開API。テンプレート領域のdiv生成（`buildTemplateStage`）、レイアウト割当の描画（`renderScreenLayout`）、コンテナへのマウント（`mountScreenLayout`） |
| `stage-scale.js` | 基準サイズ（`baseWidth`/`baseHeight`）から実際の表示領域サイズへの等比スケーリング計算・適用・リサイズ追従 |
| `slideshow-player.js` | 公開API。再生対象スライドの抽出（`getEligibleItems`）、表示秒数の解決（`resolveDurationMs`）、自動送り・ループ・状態変更への追従を行う再生エンジン（`createSlideshowPlayer`） |

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

## スライドショー再生エンジン（`slideshow-player.js`）

`SLIDESHOW_ITEM`を表示順（`displayOrder`）に評価し、`SLIDESHOW_ITEM_STATUS`に現在の列車状態を含み、かつ表示データが揃っているスライドのみを、指定秒数・ループ設定に従って自動再生する。

```js
import { createSlideshowPlayer } from './display/slideshow-player.js';
import { slideshows, slideshowItems, slideshowItemStatuses } from './mock-data/index.js';

const slideshow = slideshows.find((s) => s.slideshowId === 1);
const items = slideshowItems.filter((i) => i.slideshowId === slideshow.slideshowId);

const player = createSlideshowPlayer({
  slideshow,
  items,
  itemStatuses: slideshowItemStatuses,
  // 対象領域のコンポーネントに表示すべきデータがあるかどうか（skip_if_no_data用）
  hasData: (item) => true,
  onChange({ currentItem, playing }) {
    if (!currentItem) return; // 対象状態のスライドが1件も無い
    // currentItem.layoutId のレイアウトを、currentItem.transition の効果でマウントする
    // （実際のDOM描画はtemplate-renderer.jsのmountScreenLayoutへ委譲する）
  },
});

player.start('APPROACHING'); // TRAIN_RUN_STATE.trainStatus の初期値で再生開始

// STATE_UPDATE受信時：現在のスライドを打ち切り、再評価した先頭から再生し直す
player.setTrainStatus('STOPPED');

// 表示ウィンドウ終了時
player.stop();
```

- **抽出ロジック**：`getEligibleItems`が`SLIDESHOW_ITEM_STATUS`から対象列車状態を含むスライドを絞り込み、`skipIfNoData`が真のスライドは`hasData`コールバックが偽を返す間スキップし、残りを`displayOrder`昇順で返す。これを`createSlideshowPlayer`が内部で使用する。
- **表示秒数**：`resolveDurationMs`が`SLIDESHOW_ITEM.durationSec`（未指定時は`SLIDESHOW.defaultDurationSec`）をミリ秒に変換する。
- **ループ**：`SLIDESHOW.loopEnabled`が真なら最後のスライドの後に先頭へ戻り、偽なら最後のスライドで自動送りを終了する（表示自体は最後のスライドのまま維持される）。
- **状態変更への追従**：`setTrainStatus`を呼ぶと、現在の自動送りタイマーを破棄し、新しい列車状態で再評価した対象の先頭スライドから再生し直す（`docs/02_screen_design.md` §5.7 表示ロジック5.に対応）。
- **切替効果**：`SLIDESHOW_ITEM.transition`（なし／フェード／スライド）はそのまま`onChange`の`currentItem.transition`として渡す。実際のCSS適用・DOM描画は本エンジンのスコープ外とし、呼び出し側（`onChange`）へ委譲する（`template-renderer.js`と同様の設計方針）。
- **テスト容易性**：`setTimeoutFn`/`clearTimeoutFn`を注入可能にしており、実タイマーを使わずにテストできる（`src/window-channel.js`の`startHeartbeatMonitor`と同様の方式）。

### テスト用モックデータ

`src/mock-data/slideshows.json`（ループ有無の異なる2スライドショー）、`slideshow-items.json`、`slideshow-item-statuses.json`を用意しており、`src/mock-data/index.js`からまとめて参照できます。
