import { describe, expect, it } from 'vitest';

describe('メインウィンドウ（M系）エントリポイント', () => {
  it('#app 要素に準備完了状態を設定する', async () => {
    document.body.innerHTML = '<div id="app"></div>';

    await import('./index.js');

    const appEl = document.querySelector('#app');
    expect(appEl.dataset.window).toBe('main');
    expect(appEl.dataset.ready).toBe('true');
  });
});
