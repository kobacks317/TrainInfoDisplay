import { describe, expect, it, vi } from 'vitest';
import { buildTemplateStage, mountScreenLayout, renderScreenLayout } from './template-renderer.js';
import {
  contentComponents,
  layoutAreaAssigns,
  screenLayouts,
  screenTemplates,
  templateAreas,
} from '../mock-data/index.js';

const template16x9 = screenTemplates.find((t) => t.templateCode === 'TPL-16X9-BASIC');
const templateVertical = screenTemplates.find((t) => t.templateCode === 'TPL-VERTICAL-BASIC');
const layout16x9 = screenLayouts.find((l) => l.templateId === template16x9.templateId);
const layoutVertical = screenLayouts.find((l) => l.templateId === templateVertical.templateId);

describe('buildTemplateStage', () => {
  it('対象テンプレートの領域のみを％指定の絶対配置divとして生成する', () => {
    const { stageElement, areaElements, areasByTemplate } = buildTemplateStage(
      template16x9,
      templateAreas,
    );

    expect(areasByTemplate).toHaveLength(
      templateAreas.filter((a) => a.templateId === template16x9.templateId).length,
    );
    expect(stageElement.querySelectorAll('.template-area')).toHaveLength(areasByTemplate.length);

    const header = [...areaElements.values()].find((el) => el.dataset.areaCode === 'header');
    expect(header.style.position).toBe('absolute');
    expect(header.style.left).toBe('0%');
    expect(header.style.top).toBe('0%');
    expect(header.style.width).toBe('100%');
    expect(header.style.height).toBe('15%');
    expect(header.style.zIndex).toBe('1');
  });

  it('割込表示用領域のような高いz-indexも保持する', () => {
    const { areaElements } = buildTemplateStage(template16x9, templateAreas);
    const interrupt = [...areaElements.values()].find((el) => el.dataset.areaCode === 'interrupt');
    expect(interrupt.style.zIndex).toBe('10');
  });
});

describe('renderScreenLayout', () => {
  it('SCREEN_LAYOUT→LAYOUT_AREA_ASSIGNを辿り、各領域へコンポーネントを描画する', () => {
    const rendered = [];
    const { stageElement, unassignedAreas } = renderScreenLayout({
      template: template16x9,
      areas: templateAreas,
      layout: layout16x9,
      assigns: layoutAreaAssigns,
      components: contentComponents,
      renderComponent: (areaElement, ctx) => {
        rendered.push(ctx.component.componentCode);
        areaElement.textContent = ctx.component.name;
      },
    });

    const headerArea = stageElement.querySelector('[data-area-code="header"]');
    expect(headerArea.dataset.componentCode).toBe('current_next_station');
    expect(headerArea.textContent).toBe('現在／次駅');

    const mapArea = stageElement.querySelector('[data-area-code="main-map"]');
    expect(mapArea.dataset.componentCode).toBe('route_map');

    expect(rendered).toEqual(
      expect.arrayContaining(['current_next_station', 'route_map', 'transfer', 'notice']),
    );

    // interrupt領域は通常のレイアウトでは未割当のまま（NOTICE_INTERRUPT受信時にのみ使用）
    expect(unassignedAreas.map((a) => a.areaCode)).toEqual(['interrupt']);
  });

  it('renderComponentを省略した場合はコンポーネントコードのプレースホルダーを描画する', () => {
    const { stageElement } = renderScreenLayout({
      template: template16x9,
      areas: templateAreas,
      layout: layout16x9,
      assigns: layoutAreaAssigns,
      components: contentComponents,
    });

    const headerArea = stageElement.querySelector('[data-area-code="header"]');
    expect(headerArea.textContent).toBe('current_next_station');
  });

  it('レイアウトへ渡す割当データにoptionValuesを含め、renderComponentへそのまま渡す', () => {
    const seenOptionValues = [];
    renderScreenLayout({
      template: template16x9,
      areas: templateAreas,
      layout: layout16x9,
      assigns: layoutAreaAssigns,
      components: contentComponents,
      renderComponent: (_el, ctx) => seenOptionValues.push(ctx.assign.optionValues),
    });

    expect(seenOptionValues).toContainEqual({ stationNumberVisible: true });
  });

  it('縦型テンプレートでもレイアウト・領域・コンポーネントの対応関係が正しく描画される', () => {
    const { stageElement, unassignedAreas } = renderScreenLayout({
      template: templateVertical,
      areas: templateAreas,
      layout: layoutVertical,
      assigns: layoutAreaAssigns,
      components: contentComponents,
    });

    expect(stageElement.dataset.orientation).toBe('縦');
    expect(unassignedAreas).toHaveLength(0);
    const footerArea = stageElement.querySelector('[data-area-code="footer"]');
    expect(footerArea.dataset.componentCode).toBe('door_side');
  });

  it('このテンプレートに存在しない領域IDを指す割当や未定義のコンポーネントIDを指す割当は無視する', () => {
    const { stageElement, unassignedAreas } = renderScreenLayout({
      template: template16x9,
      areas: templateAreas,
      layout: layout16x9,
      assigns: [
        ...layoutAreaAssigns,
        { assignId: 999, layoutId: layout16x9.layoutId, areaId: 9999, componentId: 1, optionValues: {} },
        { assignId: 1000, layoutId: layout16x9.layoutId, areaId: 4, componentId: 9999, optionValues: {} },
      ],
      components: contentComponents,
    });

    // footer(areaId=4)は不正な割当(componentId=9999)のみが後から追加されているが、
    // 正規の割当(assignId=4)が先に有効なコンポーネントを描画しているため上書きされない
    const footerArea = stageElement.querySelector('[data-area-code="footer"]');
    expect(footerArea.dataset.componentCode).toBe('notice');
    expect(unassignedAreas.map((a) => a.areaCode)).toEqual(['interrupt']);
  });

  it('レイアウトが指すテンプレートと異なるテンプレートを渡すと例外を投げる', () => {
    expect(() =>
      renderScreenLayout({
        template: templateVertical,
        areas: templateAreas,
        layout: layout16x9,
        assigns: layoutAreaAssigns,
        components: contentComponents,
      }),
    ).toThrow();
  });
});

describe('mountScreenLayout', () => {
  it('コンテナへビューポート・ステージを構築し、スケーリングを適用したうえでunmount関数を返す', () => {
    const container = document.createElement('div');
    vi.stubGlobal('ResizeObserver', undefined);
    const rect = { width: 1920, height: 1080 };
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(() => rect);

    const { viewportElement, stageElement, unmount } = mountScreenLayout(container, {
      template: template16x9,
      areas: templateAreas,
      layout: layout16x9,
      assigns: layoutAreaAssigns,
      components: contentComponents,
    });

    expect(container.contains(viewportElement)).toBe(true);
    expect(viewportElement.contains(stageElement)).toBe(true);
    expect(stageElement.style.width).toBe('1920px');
    expect(stageElement.style.transform).toBe('translate(0px, 0px) scale(1)');

    unmount();
    rectSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('既存の内容がある場合はマウント前にクリアする', () => {
    const container = document.createElement('div');
    container.innerHTML = '<p>旧コンテンツ</p>';
    vi.stubGlobal('ResizeObserver', undefined);
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ width: 1920, height: 1080 });

    mountScreenLayout(container, {
      template: template16x9,
      areas: templateAreas,
      layout: layout16x9,
      assigns: layoutAreaAssigns,
      components: contentComponents,
    });

    expect(container.querySelector('p')).toBeNull();
    rectSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});
