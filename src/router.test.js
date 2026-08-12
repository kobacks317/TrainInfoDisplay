import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getCurrentRole, ROLES, setCurrentRole } from './roles.js';
import { Router } from './router.js';

function waitForEvent(target, eventName) {
  return new Promise((resolve) => {
    target.addEventListener(eventName, resolve, { once: true });
  });
}

function waitForHashChanges(count) {
  return new Promise((resolve) => {
    let remaining = count;
    function handler() {
      remaining -= 1;
      if (remaining <= 0) {
        window.removeEventListener('hashchange', handler);
        resolve();
      }
    }
    window.addEventListener('hashchange', handler);
  });
}

function makeRoutes() {
  return [
    {
      id: 'M-01',
      name: 'ログイン',
      path: '/login',
      requiredRole: null,
      links: [],
      render(container) {
        container.textContent = 'login-screen';
      },
    },
    {
      id: 'M-02',
      name: '運行コントロール',
      path: '/control',
      requiredRole: ROLES.OPERATOR,
      links: [],
      render(container) {
        container.textContent = 'control-screen';
      },
    },
  ];
}

describe('Router', () => {
  let root;
  let router;

  beforeEach(() => {
    window.location.hash = '';
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => {
    router?.stop();
    root.remove();
    window.location.hash = '';
    setCurrentRole(ROLES.VIEWER);
  });

  it('起動時にdefaultPathの画面を表示する', async () => {
    router = new Router({ routes: makeRoutes(), root, defaultPath: '/login' });
    const navigated = waitForEvent(router, 'navigate');
    router.start();
    await navigated;

    expect(root.textContent).toBe('login-screen');
    expect(router.currentPath).toBe('/login');
  });

  it('ハッシュの変更に応じて画面を切り替える', async () => {
    setCurrentRole(ROLES.ADMIN);
    router = new Router({ routes: makeRoutes(), root, defaultPath: '/login' });
    router.start();
    await waitForEvent(router, 'navigate');

    const navigated = waitForEvent(router, 'navigate');
    router.navigate('/control');
    await navigated;

    expect(root.textContent).toBe('control-screen');
    expect(router.currentPath).toBe('/control');
  });

  it('未定義のパスは見つからない旨を表示する', async () => {
    router = new Router({ routes: makeRoutes(), root, defaultPath: '/login' });
    router.start();
    await waitForEvent(router, 'navigate');

    const changed = waitForHashChanges(1);
    window.location.hash = '/unknown';
    await changed;

    expect(root.querySelector('.router-not-found')).not.toBeNull();
  });

  it('権限不足の画面へ遷移しようとするとaccessdeniedを発火しアクセス拒否画面を表示する', async () => {
    setCurrentRole(ROLES.VIEWER);
    router = new Router({ routes: makeRoutes(), root, defaultPath: '/login' });
    router.start();
    await waitForEvent(router, 'navigate');

    const denied = waitForEvent(router, 'accessdenied');
    router.navigate('/control');
    const detail = (await denied).detail;

    expect(detail.path).toBe('/control');
    expect(detail.role).toBe(ROLES.VIEWER);
    expect(root.querySelector('.router-access-denied')).not.toBeNull();
    expect(getCurrentRole()).toBe(ROLES.VIEWER);
  });

  it('beforenavigateでpreventDefaultすると遷移をキャンセルし直前の画面のままになる', async () => {
    setCurrentRole(ROLES.ADMIN);
    router = new Router({ routes: makeRoutes(), root, defaultPath: '/login' });
    router.start();
    await waitForEvent(router, 'navigate');

    let capturedDetail;
    router.addEventListener('beforenavigate', (event) => {
      capturedDetail = event.detail;
      event.preventDefault();
    });

    // 1回目: /control への変更、2回目: ガードによる /login への差し戻し
    const changed = waitForHashChanges(2);
    router.navigate('/control');
    await changed;

    expect(capturedDetail).toEqual({ from: '/login', to: '/control' });
    expect(root.textContent).toBe('login-screen');
    expect(router.currentPath).toBe('/login');
  });

  it('現在と同じパスへのnavigateは再遷移として即座に描画される', async () => {
    setCurrentRole(ROLES.ADMIN);
    router = new Router({ routes: makeRoutes(), root, defaultPath: '/login' });
    router.start();
    await waitForEvent(router, 'navigate');

    root.textContent = '';
    router.navigate('/login');

    expect(root.textContent).toBe('login-screen');
  });

  it('findRouteはIDでなくパスでルートを検索する', () => {
    router = new Router({ routes: makeRoutes(), root, defaultPath: '/login' });
    expect(router.findRoute('/control').id).toBe('M-02');
    expect(router.findRoute('/nope')).toBeUndefined();
  });
});
