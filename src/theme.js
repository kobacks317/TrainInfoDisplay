// 配色テーマ・路線カラーの切替ユーティリティ
// メインウィンドウ・表示ウィンドウの双方から、共通のCSS変数（src/styles/tokens.css）を
// 操作するために使用する。

import { pickReadableTextColor } from './color-contrast.js';

export const THEME_ATTRIBUTE = 'data-theme';
export const THEMES = ['light', 'dark'];
export const DEFAULT_THEME = 'light';

const LINE_COLOR_PROPERTY = '--line-color';
const LINE_COLOR_TEXT_PROPERTY = '--line-color-text';
const HEX_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * ライト／ダークのテーマを切り替える。`data-theme` 属性を対象要素に設定する。
 */
export function setTheme(theme, target = document.documentElement) {
  if (!THEMES.includes(theme)) {
    throw new Error(`未対応のテーマです: ${theme}`);
  }
  target.setAttribute(THEME_ATTRIBUTE, theme);
}

/**
 * 現在設定されているテーマを取得する。未設定の場合は既定テーマを返す。
 */
export function getTheme(target = document.documentElement) {
  return target.getAttribute(THEME_ATTRIBUTE) || DEFAULT_THEME;
}

/**
 * 路線カラーをCSS変数（--line-color）として動的に注入する。
 * 併せて、その路線カラーの上に重ねる文字色（--line-color-text）を
 * コントラスト比が高くなる白／黒から自動選択して設定する。
 */
export function setLineColor(colorHex, target = document.documentElement) {
  if (!HEX_PATTERN.test(colorHex)) {
    throw new Error(`不正なカラーコードです: ${colorHex}`);
  }
  target.style.setProperty(LINE_COLOR_PROPERTY, colorHex);
  target.style.setProperty(LINE_COLOR_TEXT_PROPERTY, pickReadableTextColor(colorHex));
}

/**
 * 動的に注入した路線カラーを解除し、CSS変数の既定値（トークン側の定義）に戻す。
 */
export function clearLineColor(target = document.documentElement) {
  target.style.removeProperty(LINE_COLOR_PROPERTY);
  target.style.removeProperty(LINE_COLOR_TEXT_PROPERTY);
}
