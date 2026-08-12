// メインウィンドウ(M系)向けの軽量ハッシュルーター
// 参照: docs/02_screen_design.md §1, §3, §4.3

import { getCurrentRole, hasPermission } from './roles.js';

/**
 * `#/control` のようなハッシュ文字列を、先頭 `/` 付きのパスへ正規化する。
 */
function normalizePath(path) {
  if (!path) return '/';
  const withoutHash = path.startsWith('#') ? path.slice(1) : path;
  return withoutHash.startsWith('/') ? withoutHash : `/${withoutHash}`;
}

/**
 * URLハッシュに応じて画面コンポーネントを切り替えるSPAルーター。
 *
 * 発火するイベント：
 * - `beforenavigate`（キャンセル可能）: 遷移直前に発火する。未保存の変更がある場合、
 *   リスナー内で確認ダイアログを表示し、遷移を中止したいときは `event.preventDefault()` を呼ぶ
 *   （docs/02_screen_design.md §4.1 の未保存確認ダイアログのためのフック）。
 * - `navigate`: 遷移が確定し画面が切り替わった後に発火する。
 * - `accessdenied`: 現在のロールでは対象画面の閲覧権限が無く、表示を拒否したときに発火する
 *   （docs/02_screen_design.md §4.3 の権限ガードの土台）。
 */
export class Router extends EventTarget {
  constructor({ routes, root, defaultPath = '/' } = {}) {
    super();
    this.routes = routes;
    this.root = root;
    this.defaultPath = normalizePath(defaultPath);
    this.currentPath = null;
    this._handleHashChange = this._handleHashChange.bind(this);
  }

  /** ルーターを開始し、現在のハッシュに対応する画面を表示する。 */
  start() {
    window.addEventListener('hashchange', this._handleHashChange);
    if (!window.location.hash) {
      window.location.hash = this.defaultPath;
    } else {
      this._render(this._currentHashPath());
    }
  }

  /** ルーターを停止する（テストや表示ウィンドウの終了処理などで使用）。 */
  stop() {
    window.removeEventListener('hashchange', this._handleHashChange);
  }

  /** パスに対応するルート定義を取得する。見つからない場合は `undefined`。 */
  findRoute(path) {
    return this.routes.find((route) => route.path === normalizePath(path));
  }

  /**
   * 指定パスへの遷移を試みる。実体はURLハッシュの変更であり、
   * `beforenavigate` ガードは `hashchange` 経由で通常の遷移と同じ経路を通る。
   */
  navigate(path) {
    const target = normalizePath(path);
    if (target === this._currentHashPath()) {
      this._render(target);
      return;
    }
    window.location.hash = target;
  }

  _currentHashPath() {
    return normalizePath(window.location.hash || this.defaultPath);
  }

  _handleHashChange() {
    const target = this._currentHashPath();
    if (target === this.currentPath) return;

    if (!this._fireBeforeNavigate(this.currentPath, target)) {
      // 遷移がキャンセルされた場合、直前のパスへハッシュを戻す
      if (this.currentPath !== null) {
        window.location.hash = this.currentPath;
      }
      return;
    }
    this._render(target);
  }

  _fireBeforeNavigate(from, to) {
    if (from === null) return true; // 初回表示はガード対象外
    const event = new CustomEvent('beforenavigate', {
      cancelable: true,
      detail: { from, to },
    });
    return this.dispatchEvent(event);
  }

  _render(path) {
    const route = this.findRoute(path);
    this.currentPath = path;

    if (!route) {
      this._renderNotFound(path);
      return;
    }

    if (!hasPermission(getCurrentRole(), route.requiredRole)) {
      this.dispatchEvent(
        new CustomEvent('accessdenied', {
          detail: { path, route, role: getCurrentRole() },
        }),
      );
      this._renderAccessDenied(route);
      return;
    }

    if (this.root) {
      this.root.innerHTML = '';
      route.render(this.root, { router: this });
    }

    this.dispatchEvent(new CustomEvent('navigate', { detail: { path, route } }));
  }

  _renderNotFound(path) {
    if (!this.root) return;
    this.root.innerHTML = '';
    const el = document.createElement('p');
    el.className = 'router-not-found';
    el.textContent = `画面が見つかりません: ${path}`;
    this.root.appendChild(el);
  }

  _renderAccessDenied(route) {
    if (!this.root) return;
    this.root.innerHTML = '';
    const el = document.createElement('p');
    el.className = 'router-access-denied';
    el.textContent = `この画面（${route.id} ${route.name}）を表示する権限がありません。`;
    this.root.appendChild(el);
  }
}
