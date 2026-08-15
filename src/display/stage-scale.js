// 表示ウィンドウの基準サイズ（viewBox相当）からの等比スケーリング
// 参照: docs/01_requirements.md §5（表示環境：横長16:9・32:9、縦型に対応）
// docs/02_screen_design.md §4.2（表示領域はviewBox相当の基準サイズで設計し、ウィンドウサイズに合わせて等比スケーリングする）

/**
 * 基準サイズ（`SCREEN_TEMPLATE.baseWidth`/`baseHeight`）を、実際の表示領域サイズへ
 * アスペクト比を保ったまま収める（contain）スケール値と、中央寄せのためのオフセットを計算する。
 *
 * @param {Object} params
 * @param {number} params.baseWidth
 * @param {number} params.baseHeight
 * @param {number} params.viewportWidth
 * @param {number} params.viewportHeight
 * @returns {{ scale: number, offsetX: number, offsetY: number }}
 */
export function computeStageScale({ baseWidth, baseHeight, viewportWidth, viewportHeight }) {
  if (baseWidth <= 0 || baseHeight <= 0) {
    throw new Error('baseWidth/baseHeight は正の数で指定してください');
  }
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return { scale: 0, offsetX: 0, offsetY: 0 };
  }

  const scale = Math.min(viewportWidth / baseWidth, viewportHeight / baseHeight);
  const offsetX = (viewportWidth - baseWidth * scale) / 2;
  const offsetY = (viewportHeight - baseHeight * scale) / 2;
  return { scale, offsetX, offsetY };
}

/**
 * ステージ要素のサイズを基準サイズ（px換算）に固定する。実際の見た目の大きさは
 * `applyStagePlacement`のCSS transformで制御するため、このサイズ自体は変化しない。
 *
 * @param {HTMLElement} stageElement
 * @param {{ baseWidth: number, baseHeight: number }} baseSize
 */
export function setStageBaseSize(stageElement, { baseWidth, baseHeight }) {
  stageElement.style.position = 'absolute';
  stageElement.style.top = '0';
  stageElement.style.left = '0';
  stageElement.style.width = `${baseWidth}px`;
  stageElement.style.height = `${baseHeight}px`;
}

/**
 * `computeStageScale`で求めたスケール・オフセットをステージ要素へCSSとして適用する。
 * @param {HTMLElement} stageElement
 * @param {{ scale: number, offsetX: number, offsetY: number }} placement
 */
export function applyStagePlacement(stageElement, { scale, offsetX, offsetY }) {
  stageElement.style.transformOrigin = 'top left';
  stageElement.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}

/**
 * 表示領域（ビューポート）のサイズ変化に追従して、ステージの配置を自動更新する。
 * `ResizeObserver`が利用可能な環境ではそれを使用し、無ければ`window`の`resize`イベントに
 * フォールバックする。
 *
 * @param {HTMLElement} viewportElement - サイズ変化を監視する要素（表示領域のルート）
 * @param {HTMLElement} stageElement - スケーリング対象のステージ要素
 * @param {{ baseWidth: number, baseHeight: number }} baseSize
 * @returns {() => void} 監視を停止する関数
 */
export function observeStageScale(viewportElement, stageElement, { baseWidth, baseHeight }) {
  setStageBaseSize(stageElement, { baseWidth, baseHeight });

  function update() {
    const { width, height } = viewportElement.getBoundingClientRect();
    applyStagePlacement(
      stageElement,
      computeStageScale({
        baseWidth,
        baseHeight,
        viewportWidth: width,
        viewportHeight: height,
      }),
    );
  }

  update();

  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(update);
    observer.observe(viewportElement);
    return () => observer.disconnect();
  }

  globalThis.addEventListener?.('resize', update);
  return () => globalThis.removeEventListener?.('resize', update);
}
