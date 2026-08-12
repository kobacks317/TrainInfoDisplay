import { describe, expect, it } from 'vitest';
import { renderPlaceholderScreen } from './placeholder.js';

describe('renderPlaceholderScreen', () => {
  it('画面IDと名称を見出しとして描画する', () => {
    const container = document.createElement('div');
    renderPlaceholderScreen(container, { id: 'M-02', name: '運行コントロール', links: [] });

    const heading = container.querySelector('h1');
    expect(heading.textContent).toBe('M-02 運行コントロール');
    expect(container.querySelector('.screen-placeholder').dataset.screenId).toBe('M-02');
  });

  it('linksに指定した遷移先をハッシュリンクとして描画する', () => {
    const container = document.createElement('div');
    renderPlaceholderScreen(container, {
      id: 'M-02',
      name: '運行コントロール',
      links: [{ path: '/control', label: 'M-02へ' }],
    });

    const anchor = container.querySelector('a');
    expect(anchor.getAttribute('href')).toBe('#/control');
    expect(anchor.textContent).toBe('M-02へ');
  });

  it('linksが空の場合はナビゲーションを描画しない', () => {
    const container = document.createElement('div');
    renderPlaceholderScreen(container, { id: 'M-01', name: 'ログイン', links: [] });

    expect(container.querySelector('nav')).toBeNull();
  });
});
