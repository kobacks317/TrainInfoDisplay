// 画面テンプレート領域描画エンジン（D-01案内表示画面の中核）
// `SCREEN_TEMPLATE`/`TEMPLATE_AREA`の定義（％指定の座標・サイズ・z-index）に従いdiv領域を動的生成し、
// `SCREEN_LAYOUT`→`LAYOUT_AREA_ASSIGN`を辿って各領域へコンポーネントを描画する。
// 参照: docs/02_screen_design.md §5.7（D-01）, §4.2, docs/01_requirements.md §7.2
//
// 個々の案内コンポーネント（現在／次駅・路線図等13種、docs/02_screen_design.md §6）のHTML描画は
// 本エンジンのスコープ外とし、`renderComponent`フックへ委譲する（別Issueで実装予定）。

import { observeStageScale } from './stage-scale.js';

/**
 * `TEMPLATE_AREA`の1領域を、％指定の絶対配置divとして生成する。
 * @param {import('../types/screen.js').TemplateArea} area
 * @returns {HTMLElement}
 */
function createAreaElement(area) {
  const el = document.createElement('div');
  el.className = 'template-area';
  el.dataset.areaCode = area.areaCode;
  el.dataset.areaId = String(area.areaId);
  Object.assign(el.style, {
    position: 'absolute',
    left: `${area.posX}%`,
    top: `${area.posY}%`,
    width: `${area.width}%`,
    height: `${area.height}%`,
    zIndex: String(area.zIndex),
  });
  return el;
}

/**
 * `SCREEN_TEMPLATE`＋`TEMPLATE_AREA`の定義から、領域divを動的生成した「ステージ」要素を組み立てる。
 * ステージは基準座標系（`template.baseWidth`×`template.baseHeight`）上の相対配置のみを持ち、
 * 実サイズへのスケーリングは`src/display/stage-scale.js`が担当する。
 *
 * @param {import('../types/screen.js').ScreenTemplate} template
 * @param {import('../types/screen.js').TemplateArea[]} areas
 * @returns {{ stageElement: HTMLElement, areaElements: Map<number, HTMLElement>, areasByTemplate: import('../types/screen.js').TemplateArea[] }}
 */
export function buildTemplateStage(template, areas) {
  const stageElement = document.createElement('div');
  stageElement.className = 'template-stage';
  stageElement.dataset.templateCode = template.templateCode;
  stageElement.dataset.orientation = template.orientation;

  const areasByTemplate = areas.filter((area) => area.templateId === template.templateId);
  const areaElements = new Map();
  for (const area of areasByTemplate) {
    const areaElement = createAreaElement(area);
    stageElement.appendChild(areaElement);
    areaElements.set(area.areaId, areaElement);
  }

  return { stageElement, areaElements, areasByTemplate };
}

function renderComponentPlaceholder(areaElement, { component }) {
  areaElement.textContent = component.componentCode;
}

/**
 * `SCREEN_LAYOUT`→`LAYOUT_AREA_ASSIGN`を辿り、テンプレートの各領域へコンポーネントを描画する。
 *
 * @param {Object} params
 * @param {import('../types/screen.js').ScreenTemplate} params.template
 * @param {import('../types/screen.js').TemplateArea[]} params.areas
 * @param {import('../types/screen.js').ScreenLayout} params.layout
 * @param {import('../types/screen.js').LayoutAreaAssign[]} params.assigns
 * @param {import('../types/screen.js').ContentComponent[]} params.components
 * @param {(areaElement: HTMLElement, ctx: { area: import('../types/screen.js').TemplateArea, component: import('../types/screen.js').ContentComponent, assign: import('../types/screen.js').LayoutAreaAssign }) => void} [params.renderComponent]
 *   領域へコンポーネントを描画するコールバック。省略時はコンポーネントコードのプレースホルダーを描画する
 * @returns {{ stageElement: HTMLElement, areaElements: Map<number, HTMLElement>, unassignedAreas: import('../types/screen.js').TemplateArea[] }}
 */
export function renderScreenLayout({
  template,
  areas,
  layout,
  assigns,
  components,
  renderComponent = renderComponentPlaceholder,
}) {
  if (layout.templateId !== template.templateId) {
    throw new Error(
      `レイアウト(layoutId=${layout.layoutId})はこのテンプレート(templateId=${template.templateId})に属していません`,
    );
  }

  const { stageElement, areaElements, areasByTemplate } = buildTemplateStage(template, areas);
  stageElement.dataset.layoutId = String(layout.layoutId);
  if (layout.theme) {
    stageElement.dataset.theme = layout.theme;
  }

  const areasById = new Map(areasByTemplate.map((area) => [area.areaId, area]));
  const componentsById = new Map(components.map((component) => [component.componentId, component]));
  const assignedAreaIds = new Set();

  const ownAssigns = assigns.filter((assign) => assign.layoutId === layout.layoutId);
  for (const assign of ownAssigns) {
    const area = areasById.get(assign.areaId);
    const areaElement = areaElements.get(assign.areaId);
    const component = componentsById.get(assign.componentId);
    // このテンプレートに存在しない領域・未定義のコンポーネントを指す割当はスキップする
    if (!area || !areaElement || !component) continue;

    areaElement.dataset.componentCode = component.componentCode;
    assignedAreaIds.add(assign.areaId);
    renderComponent(areaElement, { area, component, assign });
  }

  const unassignedAreas = areasByTemplate.filter((area) => !assignedAreaIds.has(area.areaId));

  return { stageElement, areaElements, unassignedAreas };
}

/**
 * D-01案内表示画面のルート要素へ、レイアウトをスケーリング込みでマウントする。
 * `container`直下に等比スケーリング用のビューポートを作成し、その中にテンプレートの
 * ステージ（基準座標系での領域配置）を配置したうえで、ビューポートのリサイズに追従させる。
 *
 * @param {HTMLElement} container
 * @param {Object} params 同名のプロパティは`renderScreenLayout`と共通
 * @param {import('../types/screen.js').ScreenTemplate} params.template
 * @param {import('../types/screen.js').TemplateArea[]} params.areas
 * @param {import('../types/screen.js').ScreenLayout} params.layout
 * @param {import('../types/screen.js').LayoutAreaAssign[]} params.assigns
 * @param {import('../types/screen.js').ContentComponent[]} params.components
 * @param {(areaElement: HTMLElement, ctx: Object) => void} [params.renderComponent]
 * @returns {{ viewportElement: HTMLElement, stageElement: HTMLElement, areaElements: Map<number, HTMLElement>, unassignedAreas: import('../types/screen.js').TemplateArea[], unmount: () => void }}
 */
export function mountScreenLayout(container, params) {
  container.innerHTML = '';

  const viewportElement = document.createElement('div');
  viewportElement.className = 'template-viewport';
  Object.assign(viewportElement.style, {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  });
  container.appendChild(viewportElement);

  const { stageElement, areaElements, unassignedAreas } = renderScreenLayout(params);
  viewportElement.appendChild(stageElement);

  const stopObserving = observeStageScale(viewportElement, stageElement, {
    baseWidth: params.template.baseWidth,
    baseHeight: params.template.baseHeight,
  });

  return {
    viewportElement,
    stageElement,
    areaElements,
    unassignedAreas,
    unmount: stopObserving,
  };
}
