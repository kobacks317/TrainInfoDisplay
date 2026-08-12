// エントリポイント
// メインウィンドウ(M系)のSPAルーターを起動する。
// 参照: docs/02_screen_design.md §1, §3

import { Router } from './router.js';
import { ROUTES } from './routes.js';
import { createUnsavedChangesGuard } from './unsaved-changes.js';

const appEl = document.querySelector('#app');

if (appEl) {
  const router = new Router({ routes: ROUTES, root: appEl, defaultPath: '/login' });
  router.addEventListener('beforenavigate', createUnsavedChangesGuard());
  router.start();
  appEl.dataset.ready = 'true';
}
