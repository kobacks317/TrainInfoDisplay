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
