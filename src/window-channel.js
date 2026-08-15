// メインウィンドウ⇔表示ウィンドウ間の通信レイヤー
// `BroadcastChannel`を主、`window.postMessage`をフォールバックとする。
// 参照: docs/01_requirements.md §3（決定事項No.2）, §5（ウィンドウ間通信）
// docs/02_screen_design.md §7（ウィンドウ間通信仕様）

/** ウィンドウ間で送受信するメッセージ型（docs/02_screen_design.md §7.2）。 */
export const MESSAGE_TYPES = Object.freeze({
  WINDOW_READY: 'WINDOW_READY',
  STATE_SNAPSHOT: 'STATE_SNAPSHOT',
  STATE_UPDATE: 'STATE_UPDATE',
  CONFIG_UPDATE: 'CONFIG_UPDATE',
  NOTICE_INTERRUPT: 'NOTICE_INTERRUPT',
  PING: 'PING',
  PONG: 'PONG',
  WINDOW_CLOSE: 'WINDOW_CLOSE',
});

const MESSAGE_TYPE_VALUES = new Set(Object.values(MESSAGE_TYPES));

/**
 * `CONTROL_SESSION.sessionToken` からチャネル名を生成する。
 * 参照: docs/02_screen_design.md §7.1「チャネル名：`rail-guide:{session_token}`」
 * @param {string} sessionToken
 * @returns {string}
 */
export function getChannelName(sessionToken) {
  if (!sessionToken) {
    throw new Error('sessionToken を指定してください');
  }
  return `rail-guide:${sessionToken}`;
}

/** 実行環境が`BroadcastChannel`に対応しているかどうか。 */
export function isBroadcastChannelSupported() {
  return typeof BroadcastChannel !== 'undefined';
}

/** @param {string} channelName */
function createBroadcastTransport(channelName) {
  const bc = new BroadcastChannel(channelName);
  return {
    send(message) {
      bc.postMessage(message);
    },
    subscribe(handler) {
      const listener = (event) => handler(event.data);
      bc.addEventListener('message', listener);
      return () => bc.removeEventListener('message', listener);
    },
    close() {
      bc.close();
    },
  };
}

/**
 * `BroadcastChannel`未対応環境向けの`postMessage`フォールバック。
 * 表示ウィンドウはポップアップのため、メインウィンドウ側は`window.open`の戻り値を、
 * 表示ウィンドウ側は`window.opener`を`targetWindows`に指定する。
 *
 * @param {Object} params
 * @param {string} params.channelName
 * @param {Window[]} params.targetWindows - 送信先ウィンドウ（複数の表示ウィンドウを想定）
 * @param {Window} params.sourceWindow - 受信を待ち受ける自ウィンドウ
 */
function createPostMessageTransport({ channelName, targetWindows, sourceWindow }) {
  if (!sourceWindow) {
    throw new Error('postMessageフォールバックには sourceWindow の指定が必要です');
  }
  return {
    send(message) {
      const envelope = { __channel: channelName, message };
      for (const target of targetWindows) {
        try {
          target.postMessage(envelope, '*');
        } catch {
          // 閉じられたウィンドウ等への送信失敗は無視する（他の宛先への送信は継続）
        }
      }
    },
    subscribe(handler) {
      const listener = (event) => {
        const envelope = event.data;
        if (!envelope || envelope.__channel !== channelName) return;
        handler(envelope.message);
      };
      sourceWindow.addEventListener('message', listener);
      return () => sourceWindow.removeEventListener('message', listener);
    },
    close() {},
  };
}

/**
 * メインウィンドウ⇔表示ウィンドウ間のチャネルを生成する。
 * `BroadcastChannel`が使用できる環境では`BroadcastChannel`を、そうでなければ
 * `window.postMessage`によるフォールバックを使用する。
 *
 * @param {Object} [options]
 * @param {string} [options.sessionToken] - `channelName`省略時にこれから生成する
 * @param {string} [options.channelName] - チャネル名を直接指定する場合
 * @param {boolean} [options.useBroadcastChannel] - 省略時は環境の対応状況から自動判定
 * @param {Window[]} [options.targetWindows] - postMessageフォールバック時の送信先
 * @param {Window} [options.sourceWindow] - postMessageフォールバック時の受信元（既定は`window`）
 * @param {() => string} [options.now] - 送信時刻の生成関数（テスト用に差し替え可能）
 */
export function createWindowChannel({
  sessionToken,
  channelName,
  useBroadcastChannel = isBroadcastChannelSupported(),
  targetWindows = [],
  sourceWindow = typeof window !== 'undefined' ? window : undefined,
  now = () => new Date().toISOString(),
} = {}) {
  const resolvedChannelName = channelName ?? getChannelName(sessionToken);

  const transport = useBroadcastChannel
    ? createBroadcastTransport(resolvedChannelName)
    : createPostMessageTransport({ channelName: resolvedChannelName, targetWindows, sourceWindow });

  /** @type {Map<string, Set<(message: Object) => void>>} */
  const handlersByType = new Map();

  const unsubscribeTransport = transport.subscribe((message) => {
    if (!message || !MESSAGE_TYPE_VALUES.has(message.type)) return;
    const handlers = handlersByType.get(message.type);
    if (!handlers) return;
    for (const handler of handlers) handler(message);
  });

  /**
   * 指定した型のメッセージを送信する。
   * @param {string} type - `MESSAGE_TYPES`のいずれか
   * @param {Object} [payload] - メッセージ本体（`type`・`sentAt`以外のフィールド）
   * @returns {Object} 送信したメッセージ
   */
  function send(type, payload = {}) {
    if (!MESSAGE_TYPE_VALUES.has(type)) {
      throw new Error(`未定義のメッセージ型です: ${type}`);
    }
    const message = { type, sentAt: now(), ...payload };
    transport.send(message);
    return message;
  }

  /**
   * 指定した型のメッセージを受信するハンドラを登録する。
   * @param {string} type - `MESSAGE_TYPES`のいずれか
   * @param {(message: Object) => void} handler
   * @returns {() => void} 登録解除関数
   */
  function on(type, handler) {
    if (!MESSAGE_TYPE_VALUES.has(type)) {
      throw new Error(`未定義のメッセージ型です: ${type}`);
    }
    if (!handlersByType.has(type)) handlersByType.set(type, new Set());
    handlersByType.get(type).add(handler);
    return () => handlersByType.get(type)?.delete(handler);
  }

  /** チャネルを破棄する（購読解除・BroadcastChannelのclose）。 */
  function close() {
    unsubscribeTransport();
    transport.close();
    handlersByType.clear();
  }

  return {
    channelName: resolvedChannelName,
    send,
    on,
    close,
    sendWindowReady: (payload) => send(MESSAGE_TYPES.WINDOW_READY, payload),
    sendStateSnapshot: (payload) => send(MESSAGE_TYPES.STATE_SNAPSHOT, payload),
    sendStateUpdate: (payload) => send(MESSAGE_TYPES.STATE_UPDATE, payload),
    sendConfigUpdate: (payload) => send(MESSAGE_TYPES.CONFIG_UPDATE, payload),
    sendNoticeInterrupt: (payload) => send(MESSAGE_TYPES.NOTICE_INTERRUPT, payload),
    sendPing: (payload) => send(MESSAGE_TYPES.PING, payload),
    sendPong: (payload) => send(MESSAGE_TYPES.PONG, payload),
    sendWindowClose: (payload) => send(MESSAGE_TYPES.WINDOW_CLOSE, payload),
  };
}

/**
 * PING/PONGによる死活監視（メインウィンドウ側）。
 * 一定間隔で`PING`を送信し、直近の`PONG`受信から`timeoutMs`以上経過したら
 * `onTimeout`を呼び出す（応答途絶の検知）。
 * 参照: docs/02_screen_design.md §7.2「`PING`/`PONG` 死活監視。5秒間隔」
 *
 * @param {ReturnType<typeof createWindowChannel>} channel
 * @param {Object} [options]
 * @param {number} [options.intervalMs=5000] - PING送信間隔（ミリ秒）
 * @param {number} [options.timeoutMs] - 応答途絶とみなす経過時間（既定は`intervalMs`の2倍）
 * @param {(info: { lastPongAt: number | null }) => void} [options.onTimeout]
 * @param {() => number} [options.nowMs] - 現在時刻(ms)取得関数（テスト用）
 * @param {typeof setInterval} [options.setIntervalFn] - タイマー生成関数（テスト用）
 * @param {typeof clearInterval} [options.clearIntervalFn] - タイマー解除関数（テスト用）
 * @returns {() => void} 監視を停止する関数
 */
export function startHeartbeatMonitor(
  channel,
  {
    intervalMs = 5000,
    timeoutMs = intervalMs * 2,
    onTimeout,
    nowMs = () => Date.now(),
    setIntervalFn = setInterval,
    clearIntervalFn = clearInterval,
  } = {},
) {
  let lastPongAt = null;
  let timedOut = false;

  const unsubscribePong = channel.on(MESSAGE_TYPES.PONG, () => {
    lastPongAt = nowMs();
    timedOut = false;
  });

  const intervalHandle = setIntervalFn(() => {
    channel.sendPing();
    if (lastPongAt !== null && !timedOut && nowMs() - lastPongAt > timeoutMs) {
      timedOut = true;
      onTimeout?.({ lastPongAt });
    }
  }, intervalMs);

  return function stopHeartbeatMonitor() {
    clearIntervalFn(intervalHandle);
    unsubscribePong();
  };
}

/**
 * `PING`受信時に自動で`PONG`を返す（表示ウィンドウ側）。
 * @param {ReturnType<typeof createWindowChannel>} channel
 * @param {Object | (() => Object)} [extraPayload] - PONGに含める追加情報（固定値または関数）
 * @returns {() => void} 登録解除関数
 */
export function respondToPings(channel, extraPayload = {}) {
  return channel.on(MESSAGE_TYPES.PING, () => {
    channel.sendPong(typeof extraPayload === 'function' ? extraPayload() : extraPayload);
  });
}
