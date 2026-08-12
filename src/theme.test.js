import { afterEach, describe, expect, it } from 'vitest';
import { clearLineColor, DEFAULT_THEME, getTheme, setLineColor, setTheme } from './theme.js';

describe('setTheme / getTheme', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  it('data-theme 属性にテーマ名を設定する', () => {
    setTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('属性未設定時は既定テーマを返す', () => {
    expect(getTheme()).toBe(DEFAULT_THEME);
  });

  it('設定済みのテーマを取得できる', () => {
    setTheme('dark');
    expect(getTheme()).toBe('dark');
  });

  it('未対応のテーマを指定するとエラーになる', () => {
    expect(() => setTheme('sepia')).toThrow();
  });

  it('任意の要素に対してテーマを設定できる', () => {
    const el = document.createElement('div');
    setTheme('dark', el);
    expect(el.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});

describe('setLineColor / clearLineColor', () => {
  afterEach(() => {
    clearLineColor();
  });

  it('--line-color にカラーコードを設定する', () => {
    setLineColor('#ff9900');
    expect(document.documentElement.style.getPropertyValue('--line-color')).toBe('#ff9900');
  });

  it('コントラストの高い文字色を --line-color-text に設定する', () => {
    setLineColor('#ffe000');
    expect(document.documentElement.style.getPropertyValue('--line-color-text')).toBe('#000000');

    setLineColor('#0a0a2a');
    expect(document.documentElement.style.getPropertyValue('--line-color-text')).toBe('#ffffff');
  });

  it('不正なカラーコードはエラーになる', () => {
    expect(() => setLineColor('orange')).toThrow();
  });

  it('clearLineColor でCSS変数を解除する', () => {
    setLineColor('#ff9900');
    clearLineColor();
    expect(document.documentElement.style.getPropertyValue('--line-color')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--line-color-text')).toBe('');
  });

  it('任意の要素に対して路線カラーを設定できる', () => {
    const el = document.createElement('div');
    setLineColor('#00aa55', el);
    expect(el.style.getPropertyValue('--line-color')).toBe('#00aa55');
    expect(document.documentElement.style.getPropertyValue('--line-color')).toBe('');
  });
});
