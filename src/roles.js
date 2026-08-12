// 権限（ロール）の定義とチェックユーティリティ
// 参照: docs/02_screen_design.md §4.3

export const ROLES = {
  ADMIN: 'admin',
  OPERATOR: 'operator',
  VIEWER: 'viewer',
};

// 数値が大きいほど強い権限を持つ（管理者 > 運用者 > 閲覧者）
const ROLE_RANK = {
  [ROLES.VIEWER]: 1,
  [ROLES.OPERATOR]: 2,
  [ROLES.ADMIN]: 3,
};

let currentRole = ROLES.VIEWER;

/**
 * 現在ログイン中とみなすロールを取得する。
 * 認証機能の実装までの暫定的な保持先としてモジュール内変数を使用する。
 */
export function getCurrentRole() {
  return currentRole;
}

/**
 * 現在のロールを設定する（ログイン処理などから呼び出す想定）。
 */
export function setCurrentRole(role) {
  if (!(role in ROLE_RANK)) {
    throw new Error(`未定義のロールです: ${role}`);
  }
  currentRole = role;
}

/**
 * `role` が `requiredRole` 以上の権限を持つかどうかを判定する。
 * `requiredRole` が未指定（null/undefined）の場合は誰でもアクセス可能とする。
 */
export function hasPermission(role, requiredRole) {
  if (!requiredRole) return true;
  return (ROLE_RANK[role] ?? 0) >= (ROLE_RANK[requiredRole] ?? Infinity);
}
