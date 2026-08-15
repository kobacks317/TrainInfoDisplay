// SYMBOL_DESIGN（形状・枠線・配色の定義）から、ラインシンボル・駅ナンバリング等のSVGを生成するユーティリティ
// 参照: docs/01_requirements.md §3（追加の修正点）, §7.1 / docs/02_screen_design.md §5.5（M-21）

/** @typedef {import('./types/common.js').SymbolDesign} SymbolDesign */
/** @typedef {import('./types/common.js').LineSymbol} LineSymbol */
/** @typedef {import('./types/common.js').StationNumber} StationNumber */
/** @typedef {import('./types/common.js').TransferSymbol} TransferSymbol */

/** SYMBOL_DESIGN.shape として対応する5形状。 */
export const SYMBOL_SHAPES = ['circle', 'rounded_square', 'square', 'hexagon', 'ellipse'];

const VIEWBOX_BASE = 100;
// 枠線が描画領域からはみ出さないための余白
const SHAPE_INSET = 4;

const XML_ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

function escapeXmlText(value) {
  return String(value).replace(/[&<>]/g, (char) => XML_ESCAPE_MAP[char]);
}

function escapeXmlAttr(value) {
  return escapeXmlText(value).replace(/"/g, '&quot;');
}

/**
 * aspectRatio（横/縦）から描画領域のサイズを算出する。1.0で正円・正方形になる。
 * @param {number} aspectRatio
 */
function resolveDimensions(aspectRatio) {
  const ratio = aspectRatio ?? 1;
  if (typeof ratio !== 'number' || !Number.isFinite(ratio) || ratio <= 0) {
    throw new Error(`aspectRatioは正の数である必要があります: ${ratio}`);
  }
  return ratio >= 1
    ? { width: VIEWBOX_BASE * ratio, height: VIEWBOX_BASE }
    : { width: VIEWBOX_BASE, height: VIEWBOX_BASE / ratio };
}

function buildHexagonPoints(width, height) {
  const left = SHAPE_INSET;
  const right = width - SHAPE_INSET;
  const top = SHAPE_INSET;
  const bottom = height - SHAPE_INSET;
  const notchX1 = left + (right - left) * 0.25;
  const notchX2 = left + (right - left) * 0.75;
  const midY = (top + bottom) / 2;
  return [
    [notchX1, top],
    [notchX2, top],
    [right, midY],
    [notchX2, bottom],
    [notchX1, bottom],
    [left, midY],
  ]
    .map(([x, y]) => `${round(x)},${round(y)}`)
    .join(' ');
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

/**
 * 形状本体（背景）のSVG要素を生成する。
 * @param {string} shape
 * @param {number} width
 * @param {number} height
 * @param {string} fillColor
 * @param {string} strokeAttrs
 */
function buildShapeMarkup(shape, width, height, fillColor, strokeAttrs) {
  const fill = `fill="${escapeXmlAttr(fillColor)}"`;
  switch (shape) {
    case 'circle': {
      const r = round(Math.min(width, height) / 2 - SHAPE_INSET);
      return `<circle cx="${round(width / 2)}" cy="${round(height / 2)}" r="${r}" ${fill} ${strokeAttrs}/>`;
    }
    case 'ellipse': {
      const rx = round(width / 2 - SHAPE_INSET);
      const ry = round(height / 2 - SHAPE_INSET);
      return `<ellipse cx="${round(width / 2)}" cy="${round(height / 2)}" rx="${rx}" ry="${ry}" ${fill} ${strokeAttrs}/>`;
    }
    case 'square': {
      const w = round(width - SHAPE_INSET * 2);
      const h = round(height - SHAPE_INSET * 2);
      return `<rect x="${SHAPE_INSET}" y="${SHAPE_INSET}" width="${w}" height="${h}" ${fill} ${strokeAttrs}/>`;
    }
    case 'rounded_square': {
      const w = round(width - SHAPE_INSET * 2);
      const h = round(height - SHAPE_INSET * 2);
      const radius = round(Math.min(w, h) * 0.2);
      return `<rect x="${SHAPE_INSET}" y="${SHAPE_INSET}" width="${w}" height="${h}" rx="${radius}" ry="${radius}" ${fill} ${strokeAttrs}/>`;
    }
    case 'hexagon': {
      return `<polygon points="${buildHexagonPoints(width, height)}" ${fill} ${strokeAttrs}/>`;
    }
    default:
      throw new Error(`未対応の形状です: ${shape}`);
  }
}

/**
 * 枠線（stroke）のSVG属性文字列を生成する。枠線色は文字色に合わせる。
 * @param {string} [borderStyle]
 * @param {number} [borderWidth]
 * @param {string} strokeColor
 */
function buildStrokeAttrs(borderStyle, borderWidth, strokeColor) {
  if (!borderWidth || borderStyle === 'none') {
    return 'stroke="none"';
  }
  const dasharray =
    borderStyle === 'dashed'
      ? `stroke-dasharray="${borderWidth * 2},${borderWidth}"`
      : borderStyle === 'dotted'
        ? `stroke-dasharray="${borderWidth},${borderWidth}"`
        : '';
  return `stroke="${escapeXmlAttr(strokeColor)}" stroke-width="${borderWidth}" ${dasharray}`.trim();
}

/**
 * svgTemplate内のプレースホルダーを実値に置換する。
 * 対応トークン: {{text}} {{bgColor}} {{textColor}} {{width}} {{height}} {{fontFamily}} {{fontSize}}
 */
function renderSvgTemplate(template, values) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
}

/**
 * SYMBOL_DESIGN定義と表示内容（テキスト・配色）からSVGマークアップを生成する。
 * `content`に`bgColor`/`textColor`が指定されない場合は、`symbolDesign`の既定配色を使用する
 * （個別指定色による既定配色の上書き）。
 *
 * @param {SymbolDesign} symbolDesign
 * @param {{ text?: string, bgColor?: string, textColor?: string }} [content]
 * @returns {string} SVGマークアップ文字列
 */
export function generateSymbolSvg(symbolDesign, content = {}) {
  if (!symbolDesign || typeof symbolDesign.shape !== 'string') {
    throw new Error('symbolDesign.shapeが必要です');
  }
  if (!SYMBOL_SHAPES.includes(symbolDesign.shape)) {
    throw new Error(
      `未対応の形状です: ${symbolDesign.shape}（対応形状: ${SYMBOL_SHAPES.join(', ')}）`,
    );
  }

  const text = content.text ?? '';
  const bgColor = content.bgColor ?? symbolDesign.defaultBgColor;
  const textColor = content.textColor ?? symbolDesign.defaultTextColor;
  if (!bgColor || !textColor) {
    throw new Error(
      '背景色・文字色を決定できません（defaultBgColor/defaultTextColorが未設定です）',
    );
  }

  const { width, height } = resolveDimensions(symbolDesign.aspectRatio);
  const fontFamily = symbolDesign.fontFamily || 'sans-serif';
  const fontSize = round(Math.min(width, height) * 0.42);

  if (symbolDesign.svgTemplate) {
    return renderSvgTemplate(symbolDesign.svgTemplate, {
      text: escapeXmlText(text),
      bgColor: escapeXmlAttr(bgColor),
      textColor: escapeXmlAttr(textColor),
      width,
      height,
      fontFamily: escapeXmlAttr(fontFamily),
      fontSize,
    });
  }

  const strokeAttrs = buildStrokeAttrs(
    symbolDesign.borderStyle,
    symbolDesign.borderWidth,
    textColor,
  );
  const shapeMarkup = buildShapeMarkup(symbolDesign.shape, width, height, bgColor, strokeAttrs);
  const textMarkup = `<text x="${round(width / 2)}" y="${round(height / 2)}" fill="${escapeXmlAttr(textColor)}" font-family="${escapeXmlAttr(fontFamily)}" font-size="${fontSize}" text-anchor="middle" dominant-baseline="central">${escapeXmlText(text)}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${round(width)} ${round(height)}" role="img" aria-label="${escapeXmlAttr(text)}">${shapeMarkup}${textMarkup}</svg>`;
}

/**
 * LINE_SYMBOLの実値からSVGを生成する。`lineColor`/`textColor`がSYMBOL_DESIGNの既定配色を上書きする。
 * @param {SymbolDesign} symbolDesign
 * @param {LineSymbol} lineSymbol
 */
export function generateLineSymbolSvg(symbolDesign, lineSymbol) {
  return generateSymbolSvg(symbolDesign, {
    text: lineSymbol.symbolText,
    bgColor: lineSymbol.lineColor,
    textColor: lineSymbol.textColor,
  });
}

/**
 * STATION_NUMBERの実値からSVGを生成する。表示テキストは`prefix`と`number`を連結する。
 * `textColor`はSTATION_NUMBERに存在しないため、SYMBOL_DESIGNの既定文字色を使用する。
 * @param {SymbolDesign} symbolDesign
 * @param {StationNumber} stationNumber
 */
export function generateStationNumberSvg(symbolDesign, stationNumber) {
  return generateSymbolSvg(symbolDesign, {
    text: `${stationNumber.prefix}-${stationNumber.number}`,
    bgColor: stationNumber.lineColor,
  });
}

/**
 * TRANSFER_SYMBOLの実値からSVGを生成する。`lineColor`/`textColor`がSYMBOL_DESIGNの既定配色を上書きする。
 * @param {SymbolDesign} symbolDesign
 * @param {TransferSymbol} transferSymbol
 */
export function generateTransferSymbolSvg(symbolDesign, transferSymbol) {
  return generateSymbolSvg(symbolDesign, {
    text: transferSymbol.symbolText,
    bgColor: transferSymbol.lineColor,
    textColor: transferSymbol.textColor,
  });
}
