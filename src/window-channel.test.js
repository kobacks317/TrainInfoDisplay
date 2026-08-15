import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createWindowChannel,
  getChannelName,
  isBroadcastChannelSupported,
  MESSAGE_TYPES,
  respondToPings,
  startHeartbeatMonitor,
} from './window-channel.js';

/** postMessageフォールバックの検証用に、互いに`message`イベントで繋がる2つの疑似ウィンドウを作る。 */
function createLinkedFakeWindows() {
  function createFakeWindow() {
    const target = new EventTarget();
    target.postMessage = (data) => {
      queueMicrotask(() => target.dispatchEvent(new MessageEvent('message', { data })));
    };
    return target;
  }
  return [createFakeWindow(), createFakeWindow()];
}

function waitFor(handler) {
  return new Promise((resolve) => {
    handler(resolve);
  });
}

const openChannels = [];

function openChannel(options) {
  const channel = createWindowChannel(options);
  openChannels.push(channel);
  return channel;
}

afterEach(() => {
  while (openChannels.length > 0) {
    openChannels.pop().close();
  }
  vi.restoreAllMocks();
});

describe('getChannelName', () => {
  it('rail-guide:{session_token} の形式でチャネル名を生成する', () => {
    expect(getChannelName('abc123')).toBe('rail-guide:abc123');
  });

  it('sessionTokenが未指定だとエラーになる', () => {
    expect(() => getChannelName()).toThrow();
  });
});

describe('isBroadcastChannelSupported', () => {
  it('テスト環境（jsdom/Node）ではtrueを返す', () => {
    expect(isBroadcastChannelSupported()).toBe(true);
  });
});

describe('createWindowChannel（BroadcastChannel経由）', () => {
  it('全メッセージ型を送受信できる', async () => {
    const channelName = `test-${Math.random()}`;
    const main = openChannel({ channelName });
    const display = openChannel({ channelName });

    for (const type of Object.values(MESSAGE_TYPES)) {
      const received = waitFor((resolve) => display.on(type, resolve));
      main.send(type, { foo: type });
      const message = await received;
      expect(message.type).toBe(type);
      expect(message.foo).toBe(type);
      expect(typeof message.sentAt).toBe('string');
    }
  });

  it('sessionTokenからチャネル名を解決する', () => {
    const channel = openChannel({ sessionToken: 'tok-1' });
    expect(channel.channelName).toBe('rail-guide:tok-1');
  });

  it('ショートハンド送信関数が正しい型でメッセージを送る', async () => {
    const channelName = `test-${Math.random()}`;
    const main = openChannel({ channelName });
    const display = openChannel({ channelName });

    const received = waitFor((resolve) => display.on(MESSAGE_TYPES.STATE_UPDATE, resolve));
    main.sendStateUpdate({
      trainRunId: 10234,
      state: { trainStatus: 'APPROACHING' },
      context: { activeNoticeIds: [77] },
    });
    const message = await received;

    expect(message).toMatchObject({
      type: MESSAGE_TYPES.STATE_UPDATE,
      trainRunId: 10234,
      state: { trainStatus: 'APPROACHING' },
      context: { activeNoticeIds: [77] },
    });
  });

  it('未定義のメッセージ型はsendでエラーになる', () => {
    const channel = openChannel({ channelName: `test-${Math.random()}` });
    expect(() => channel.send('UNKNOWN')).toThrow();
  });

  it('未定義のメッセージ型はonでエラーになる', () => {
    const channel = openChannel({ channelName: `test-${Math.random()}` });
    expect(() => channel.on('UNKNOWN', () => {})).toThrow();
  });

  it('未知の型のメッセージは無視される', async () => {
    const channelName = `test-${Math.random()}`;
    const main = openChannel({ channelName });
    const display = openChannel({ channelName });
    const handler = vi.fn();
    display.on(MESSAGE_TYPES.PING, handler);

    // BroadcastChannelへ直接、未知の型のメッセージを送る
    const raw = new BroadcastChannel(channelName);
    raw.postMessage({ type: 'SOMETHING_ELSE' });
    raw.close();

    // 追ってPINGを送り、SOMETHING_ELSEにより処理が壊れていないことを確認する
    const received = waitFor((resolve) => {
      const off = display.on(MESSAGE_TYPES.PING, (message) => {
        off();
        resolve(message);
      });
    });
    main.sendPing();
    await received;

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('closeすると以降のメッセージを受信しない', async () => {
    const channelName = `test-${Math.random()}`;
    const main = openChannel({ channelName });
    const display = createWindowChannel({ channelName });
    const handler = vi.fn();
    display.on(MESSAGE_TYPES.PING, handler);
    display.close();

    main.sendPing();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(handler).not.toHaveBeenCalled();
  });

  it('onの戻り値を呼ぶとそのハンドラだけ登録解除される', async () => {
    const channelName = `test-${Math.random()}`;
    const main = openChannel({ channelName });
    const display = openChannel({ channelName });
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const off1 = display.on(MESSAGE_TYPES.PING, handler1);
    display.on(MESSAGE_TYPES.PING, handler2);
    off1();

    main.sendPing();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledTimes(1);
  });
});

describe('createWindowChannel（postMessageフォールバック）', () => {
  it('BroadcastChannel未対応環境でもpostMessage経由で送受信できる', async () => {
    const channelName = `test-${Math.random()}`;
    const [mainWin, displayWin] = createLinkedFakeWindows();

    const main = openChannel({
      channelName,
      useBroadcastChannel: false,
      sourceWindow: mainWin,
      targetWindows: [displayWin],
    });
    const display = openChannel({
      channelName,
      useBroadcastChannel: false,
      sourceWindow: displayWin,
      targetWindows: [mainWin],
    });

    const received = waitFor((resolve) => display.on(MESSAGE_TYPES.WINDOW_READY, resolve));
    main.sendWindowReady({ carId: 3, languageCode: 'ja' });
    const message = await received;

    expect(message).toMatchObject({
      type: MESSAGE_TYPES.WINDOW_READY,
      carId: 3,
      languageCode: 'ja',
    });
  });

  it('異なるチャネル名宛のメッセージは受信しない', async () => {
    const [mainWin, displayWin] = createLinkedFakeWindows();

    const main = openChannel({
      channelName: 'rail-guide:session-a',
      useBroadcastChannel: false,
      sourceWindow: mainWin,
      targetWindows: [displayWin],
    });
    const otherDisplay = openChannel({
      channelName: 'rail-guide:session-b',
      useBroadcastChannel: false,
      sourceWindow: displayWin,
      targetWindows: [mainWin],
    });
    const handler = vi.fn();
    otherDisplay.on(MESSAGE_TYPES.PING, handler);

    main.sendPing();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(handler).not.toHaveBeenCalled();
  });

  it('sourceWindow未指定だとエラーになる', () => {
    // 明示的に`undefined`を渡すとデフォルト引数（`window`）が採用されてしまうため、`null`で検証する
    expect(() =>
      openChannel({ channelName: 'x', useBroadcastChannel: false, sourceWindow: null }),
    ).toThrow();
  });
});

describe('startHeartbeatMonitor / respondToPings（PING/PONG死活監視）', () => {
  it('5秒間隔でPINGを送信する', () => {
    const sendPing = vi.fn();
    const channel = { on: vi.fn(() => () => {}), sendPing };
    let tick;
    const setIntervalFn = vi.fn((fn, ms) => {
      tick = fn;
      expect(ms).toBe(5000);
      return 'handle';
    });
    const clearIntervalFn = vi.fn();

    const stop = startHeartbeatMonitor(channel, { setIntervalFn, clearIntervalFn });
    tick();
    tick();

    expect(sendPing).toHaveBeenCalledTimes(2);

    stop();
    expect(clearIntervalFn).toHaveBeenCalledWith('handle');
  });

  it('PONGが一定時間内に届けばタイムアウトしない', () => {
    const handlers = {};
    const channel = {
      on: vi.fn((type, handler) => {
        handlers[type] = handler;
        return () => {};
      }),
      sendPing: vi.fn(),
    };
    let now = 0;
    let tick;
    const setIntervalFn = (fn) => {
      tick = fn;
      return 'handle';
    };
    const onTimeout = vi.fn();

    startHeartbeatMonitor(channel, {
      intervalMs: 5000,
      nowMs: () => now,
      setIntervalFn,
      clearIntervalFn: () => {},
      onTimeout,
    });

    now = 5000;
    handlers[MESSAGE_TYPES.PONG]({ type: MESSAGE_TYPES.PONG });
    tick();

    now = 9000; // 直近PONGから4秒経過（timeoutMs=10000未満）
    tick();

    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('PONGの応答が途絶するとonTimeoutが呼ばれる', () => {
    const handlers = {};
    const channel = {
      on: vi.fn((type, handler) => {
        handlers[type] = handler;
        return () => {};
      }),
      sendPing: vi.fn(),
    };
    let now = 0;
    let tick;
    const setIntervalFn = (fn) => {
      tick = fn;
      return 'handle';
    };
    const onTimeout = vi.fn();

    startHeartbeatMonitor(channel, {
      intervalMs: 5000,
      nowMs: () => now,
      setIntervalFn,
      clearIntervalFn: () => {},
      onTimeout,
    });

    now = 5000;
    handlers[MESSAGE_TYPES.PONG]({ type: MESSAGE_TYPES.PONG });
    tick();

    now = 20000; // 直近PONG(5000)から15秒経過（既定timeoutMs=10000を超過）
    tick();

    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(onTimeout).toHaveBeenCalledWith({ lastPongAt: 5000 });

    // 一度通知した後は、タイムアウトしたままでも連続通知しない
    now = 25000;
    tick();
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('respondToPingsはPING受信時にPONGを返す', async () => {
    const channelName = `test-${Math.random()}`;
    const main = openChannel({ channelName });
    const display = openChannel({ channelName });
    respondToPings(display, { carId: 5 });

    const received = waitFor((resolve) => main.on(MESSAGE_TYPES.PONG, resolve));
    main.sendPing();
    const message = await received;

    expect(message).toMatchObject({ type: MESSAGE_TYPES.PONG, carId: 5 });
  });

  it('respondToPingsのextraPayloadは関数でも指定できる', async () => {
    const channelName = `test-${Math.random()}`;
    const main = openChannel({ channelName });
    const display = openChannel({ channelName });
    let carId = 1;
    respondToPings(display, () => ({ carId }));
    carId = 7;

    const received = waitFor((resolve) => main.on(MESSAGE_TYPES.PONG, resolve));
    main.sendPing();
    const message = await received;

    expect(message).toMatchObject({ type: MESSAGE_TYPES.PONG, carId: 7 });
  });
});

describe('状態変化から表示ウィンドウへの反映速度（非機能要件: 1秒以内）', () => {
  it('STATE_UPDATE送信から受信までが1秒未満で完了する', async () => {
    const channelName = `test-${Math.random()}`;
    const main = openChannel({ channelName });
    const display = openChannel({ channelName });

    const startedAt = performance.now();
    const received = waitFor((resolve) => display.on(MESSAGE_TYPES.STATE_UPDATE, resolve));
    main.sendStateUpdate({ trainRunId: 1, state: { trainStatus: 'RUNNING' } });
    await received;
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(1000);
  });
});
