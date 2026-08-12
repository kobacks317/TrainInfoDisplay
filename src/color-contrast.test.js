import { describe, expect, it } from 'vitest';
import { getContrastRatio, meetsContrastAA, pickReadableTextColor } from './color-contrast.js';

describe('getContrastRatio', () => {
  it('白と黒のコントラスト比は21:1になる', () => {
    expect(getContrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 0);
  });

  it('同色同士のコントラスト比は1:1になる', () => {
    expect(getContrastRatio('#336699', '#336699')).toBeCloseTo(1, 5);
  });

  it('3桁・6桁いずれのカラーコードも計算できる', () => {
    const shorthand = getContrastRatio('#fff', '#000');
    const full = getContrastRatio('#ffffff', '#000000');
    expect(shorthand).toBeCloseTo(full, 5);
  });

  it('不正なカラーコードはエラーになる', () => {
    expect(() => getContrastRatio('red', '#000000')).toThrow();
  });
});

describe('meetsContrastAA', () => {
  it('既定閾値4.5以上のとき true を返す', () => {
    expect(meetsContrastAA('#ffffff', '#000000')).toBe(true);
  });

  it('閾値未満のとき false を返す', () => {
    expect(meetsContrastAA('#ffffff', '#f0f0f0')).toBe(false);
  });
});

describe('pickReadableTextColor', () => {
  it('明るい背景には黒文字を選ぶ', () => {
    expect(pickReadableTextColor('#ffe000')).toBe('#000000');
  });

  it('暗い背景には白文字を選ぶ', () => {
    expect(pickReadableTextColor('#0a0a2a')).toBe('#ffffff');
  });
});

describe('デザイントークンの既定パレット', () => {
  // src/styles/tokens.css の値と一致させること
  const LIGHT = {
    bg: '#ffffff',
    surface: '#f5f5f7',
    text: '#1a1a1a',
    textSecondary: '#4b4b4b',
    accent: '#1d4ed8',
    onAccent: '#ffffff',
    danger: '#b3261e',
    onDanger: '#ffffff',
    success: '#166534',
    onSuccess: '#ffffff',
  };
  const DARK = {
    bg: '#121212',
    surface: '#1e1e1e',
    text: '#f5f5f5',
    textSecondary: '#c7c7c7',
    accent: '#6ea8fe',
    onAccent: '#0b1220',
    danger: '#ff8a80',
    onDanger: '#2a0a08',
    success: '#7fd894',
    onSuccess: '#06210c',
  };

  it.each([
    ['light bg/text', LIGHT.bg, LIGHT.text],
    ['light bg/text-secondary', LIGHT.bg, LIGHT.textSecondary],
    ['light surface/text', LIGHT.surface, LIGHT.text],
    ['light accent/on-accent', LIGHT.accent, LIGHT.onAccent],
    ['light danger/on-danger', LIGHT.danger, LIGHT.onDanger],
    ['light success/on-success', LIGHT.success, LIGHT.onSuccess],
    ['dark bg/text', DARK.bg, DARK.text],
    ['dark bg/text-secondary', DARK.bg, DARK.textSecondary],
    ['dark surface/text', DARK.surface, DARK.text],
    ['dark accent/on-accent', DARK.accent, DARK.onAccent],
    ['dark danger/on-danger', DARK.danger, DARK.onDanger],
    ['dark success/on-success', DARK.success, DARK.onSuccess],
  ])('%s のコントラスト比が4.5:1以上である', (_label, a, b) => {
    expect(getContrastRatio(a, b)).toBeGreaterThanOrEqual(4.5);
  });
});
