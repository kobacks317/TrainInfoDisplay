// メインウィンドウ(M系)の画面ルーティング定義
// 参照: docs/02_screen_design.md §2.1（画面一覧）, §3（画面遷移図）, §4.3（権限）

import { ROLES } from './roles.js';
import { renderPlaceholderScreen } from './screens/placeholder.js';

function defineScreen(id, name, path, requiredRole, links = []) {
  return {
    id,
    name,
    path,
    requiredRole,
    links,
    render(container) {
      renderPlaceholderScreen(container, { id, name, links });
    },
  };
}

const BACK_TO_SETTINGS_TOP = { path: '/settings', label: 'M-10 設定トップへ戻る' };

export const ROUTES = [
  defineScreen('M-01', 'ログイン', '/login', null, [
    { path: '/control', label: 'M-02 運行コントロールへ' },
  ]),
  defineScreen('M-02', '運行コントロール', '/control', ROLES.OPERATOR, [
    { path: '/windows', label: 'M-03 表示ウィンドウ管理へ' },
    { path: '/preview', label: 'M-04 プレビューへ' },
    { path: '/settings', label: 'M-10 設定トップへ' },
  ]),
  defineScreen('M-03', '表示ウィンドウ管理', '/windows', ROLES.OPERATOR, [
    { path: '/control', label: 'M-02 運行コントロールへ戻る' },
  ]),
  defineScreen('M-04', 'プレビュー', '/preview', ROLES.VIEWER, [
    { path: '/control', label: 'M-02 運行コントロールへ戻る' },
  ]),
  defineScreen('M-10', '設定トップ', '/settings', ROLES.OPERATOR, [
    { path: '/settings/templates', label: 'M-11 テンプレート管理へ' },
    { path: '/settings/slideshows', label: 'M-13 スライドショー編集へ' },
    { path: '/settings/lines-stations', label: 'M-20 路線・駅マスタへ' },
    { path: '/settings/symbol-designs', label: 'M-21 シンボルデザイン管理へ' },
    { path: '/settings/route-map', label: 'M-22 路線図エディタへ' },
    { path: '/settings/platforms', label: 'M-23 ホーム・設備管理へ' },
    { path: '/settings/transfers', label: 'M-24 乗換情報管理へ' },
    { path: '/settings/formations', label: 'M-25 編成・号車管理へ' },
    { path: '/settings/notices', label: 'M-26 お知らせ管理へ' },
    { path: '/settings/i18n', label: 'M-30 多言語テキスト管理へ' },
    { path: '/settings/sync', label: 'M-31 外部DB同期管理へ' },
    { path: '/control', label: 'M-02 運行コントロールへ戻る' },
  ]),
  defineScreen('M-11', 'テンプレート管理', '/settings/templates', ROLES.ADMIN, [
    { path: '/settings/layouts', label: 'M-12 レイアウトエディタへ' },
    BACK_TO_SETTINGS_TOP,
  ]),
  defineScreen('M-12', 'レイアウトエディタ', '/settings/layouts', ROLES.ADMIN, [
    { path: '/preview', label: 'M-04 プレビューへ' },
    { path: '/settings/templates', label: 'M-11 テンプレート管理へ戻る' },
  ]),
  defineScreen('M-13', 'スライドショー編集', '/settings/slideshows', ROLES.ADMIN, [
    { path: '/preview', label: 'M-04 プレビューへ' },
    BACK_TO_SETTINGS_TOP,
  ]),
  defineScreen('M-20', '路線・駅マスタ', '/settings/lines-stations', ROLES.ADMIN, [
    BACK_TO_SETTINGS_TOP,
  ]),
  defineScreen('M-21', 'シンボルデザイン管理', '/settings/symbol-designs', ROLES.ADMIN, [
    BACK_TO_SETTINGS_TOP,
  ]),
  defineScreen('M-22', '路線図エディタ', '/settings/route-map', ROLES.ADMIN, [
    BACK_TO_SETTINGS_TOP,
  ]),
  defineScreen('M-23', 'ホーム・設備管理', '/settings/platforms', ROLES.ADMIN, [
    BACK_TO_SETTINGS_TOP,
  ]),
  defineScreen('M-24', '乗換情報管理', '/settings/transfers', ROLES.ADMIN, [
    BACK_TO_SETTINGS_TOP,
  ]),
  defineScreen('M-25', '編成・号車管理', '/settings/formations', ROLES.ADMIN, [
    BACK_TO_SETTINGS_TOP,
  ]),
  defineScreen('M-26', 'お知らせ管理', '/settings/notices', ROLES.OPERATOR, [
    BACK_TO_SETTINGS_TOP,
  ]),
  defineScreen('M-30', '多言語テキスト管理', '/settings/i18n', ROLES.ADMIN, [
    BACK_TO_SETTINGS_TOP,
  ]),
  defineScreen('M-31', '外部DB同期管理', '/settings/sync', ROLES.ADMIN, [BACK_TO_SETTINGS_TOP]),
];
