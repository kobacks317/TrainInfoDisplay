import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyStagePlacement,
  computeStageScale,
  observeStageScale,
  setStageBaseSize,
} from './stage-scale.js';

describe('computeStageScale', () => {
  it('横長基準(16:9)を、より横長なビューポート(32:9相当)へ収めると高さ基準で縮小される', () => {
    const { scale, offsetX, offsetY } = computeStageScale({
      baseWidth: 1920,
      baseHeight: 1080,
      viewportWidth: 3840,
      viewportHeight: 1080,
    });

    expect(scale).toBeCloseTo(1);
    expect(offsetY).toBeCloseTo(0);
    expect(offsetX).toBeCloseTo((3840 - 1920) / 2);
  });

  it('横長基準を縦長のビューポートへ収めると幅基準で縮小され、上下に余白ができる', () => {
    const { scale, offsetX, offsetY } = computeStageScale({
      baseWidth: 1920,
      baseHeight: 1080,
      viewportWidth: 1080,
      viewportHeight: 1920,
    });

    expect(scale).toBeCloseTo(1080 / 1920);
    expect(offsetX).toBeCloseTo(0);
    expect(offsetY).toBeGreaterThan(0);
  });

  it('縦型基準(9:16)をワイドなビューポートへ収めると高さ基準で縮小され、左右に余白ができる', () => {
    const { scale, offsetX, offsetY } = computeStageScale({
      baseWidth: 1080,
      baseHeight: 1920,
      viewportWidth: 3840,
      viewportHeight: 1080,
    });

    expect(scale).toBeCloseTo(1080 / 1920);
    expect(offsetY).toBeCloseTo(0);
    expect(offsetX).toBeGreaterThan(0);
  });

  it('ビューポートサイズが0以下の場合はscale=0を返し、例外を投げない（起動直後のレイアウト未確定に対応）', () => {
    expect(
      computeStageScale({ baseWidth: 1920, baseHeight: 1080, viewportWidth: 0, viewportHeight: 0 }),
    ).toEqual({
      scale: 0,
      offsetX: 0,
      offsetY: 0,
    });
  });

  it('baseWidth/baseHeightが0以下の場合は例外を投げる', () => {
    expect(() =>
      computeStageScale({
        baseWidth: 0,
        baseHeight: 1080,
        viewportWidth: 100,
        viewportHeight: 100,
      }),
    ).toThrow();
  });
});

describe('setStageBaseSize / applyStagePlacement', () => {
  it('ステージ要素を基準サイズ(px)で固定し、スケール・オフセットをtransformとして適用する', () => {
    const stage = document.createElement('div');
    setStageBaseSize(stage, { baseWidth: 1920, baseHeight: 1080 });
    expect(stage.style.width).toBe('1920px');
    expect(stage.style.height).toBe('1080px');
    expect(stage.style.position).toBe('absolute');

    applyStagePlacement(stage, { scale: 0.5, offsetX: 10, offsetY: 20 });
    expect(stage.style.transform).toBe('translate(10px, 20px) scale(0.5)');
    expect(stage.style.transformOrigin).toBe('top left');
  });
});

describe('observeStageScale', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('ResizeObserverが利用可能な場合はそれで監視し、停止関数でdisconnectする', () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    class FakeResizeObserver {
      constructor(callback) {
        this.callback = callback;
      }
      observe(target) {
        observe(target);
      }
      disconnect() {
        disconnect();
      }
    }
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);

    const viewport = document.createElement('div');
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({ width: 1920, height: 1080 });
    const stage = document.createElement('div');

    const stop = observeStageScale(viewport, stage, { baseWidth: 1920, baseHeight: 1080 });

    expect(observe).toHaveBeenCalledWith(viewport);
    expect(stage.style.transform).toBe('translate(0px, 0px) scale(1)');

    stop();
    expect(disconnect).toHaveBeenCalled();
  });

  it('ResizeObserver未対応環境ではwindowのresizeイベントにフォールバックする', () => {
    vi.stubGlobal('ResizeObserver', undefined);

    const viewport = document.createElement('div');
    const rect = { width: 960, height: 540 };
    vi.spyOn(viewport, 'getBoundingClientRect').mockImplementation(() => rect);
    const stage = document.createElement('div');

    const stop = observeStageScale(viewport, stage, { baseWidth: 1920, baseHeight: 1080 });
    expect(stage.style.transform).toBe('translate(0px, 0px) scale(0.5)');

    rect.width = 1920;
    rect.height = 1080;
    window.dispatchEvent(new Event('resize'));
    expect(stage.style.transform).toBe('translate(0px, 0px) scale(1)');

    stop();
  });
});
