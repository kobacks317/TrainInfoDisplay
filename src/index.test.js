import { describe, expect, it } from 'vitest';

describe('テスト環境の疎通確認', () => {
  it('jsdom環境でDOM APIが利用できる', () => {
    const el = document.createElement('div');
    el.textContent = 'test';
    expect(el.textContent).toBe('test');
  });

  it('ブラウザ間通信に使うBroadcastChannelが利用できる', () => {
    expect(typeof BroadcastChannel).toBe('function');
  });
});

describe('エントリポイント', () => {
  it('#appが存在する場合、ルーターを起動しready状態にする', async () => {
    document.body.innerHTML = '<div id="app"></div>';
    window.location.hash = '';

    // hashchange は同期・非同期どちらで発火する実装でも取りこぼさないよう、
    // import前にリスナーを登録しておく。
    const hashChanged = new Promise((resolve) => {
      window.addEventListener('hashchange', resolve, { once: true });
    });

    await import('./index.js');
    await hashChanged;

    const appEl = document.querySelector('#app');
    expect(appEl.dataset.ready).toBe('true');
    expect(window.location.hash).toBe('#/login');
  });
});
