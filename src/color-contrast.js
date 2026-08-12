// WCAG 2.x のコントラスト比計算ユーティリティ
// 参照: https://www.w3.org/TR/WCAG21/#contrast-minimum

const HEX_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function hexToRgb(hex) {
  if (!HEX_PATTERN.test(hex)) {
    throw new Error(`不正なカラーコードです: ${hex}`);
  }
  let normalized = hex.slice(1);
  if (normalized.length === 3) {
    normalized = normalized
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(normalized, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function toLinear(channel) {
  const s = channel / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance([r, g, b]) {
  const [R, G, B] = [r, g, b].map(toLinear);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * 2色間のコントラスト比（1〜21）を算出する。
 */
export function getContrastRatio(hexA, hexB) {
  const lumA = relativeLuminance(hexToRgb(hexA));
  const lumB = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * 通常テキストのAA基準（4.5:1）を満たすかどうか。
 */
export function meetsContrastAA(hexA, hexB, ratio = 4.5) {
  return getContrastRatio(hexA, hexB) >= ratio;
}

/**
 * 任意の背景色に対して、白／黒のうち読みやすい方の文字色を返す。
 * 路線カラーのように動的に決まる背景色へ、案内表示側で文字色を対応させるために使う。
 */
export function pickReadableTextColor(
  backgroundHex,
  { light = '#ffffff', dark = '#000000' } = {},
) {
  const lightRatio = getContrastRatio(backgroundHex, light);
  const darkRatio = getContrastRatio(backgroundHex, dark);
  return lightRatio >= darkRatio ? light : dark;
}
