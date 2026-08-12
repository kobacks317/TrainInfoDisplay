import { afterEach, describe, expect, it } from 'vitest';
import { getCurrentRole, hasPermission, ROLES, setCurrentRole } from './roles.js';

describe('getCurrentRole / setCurrentRole', () => {
  afterEach(() => {
    setCurrentRole(ROLES.VIEWER);
  });

  it('既定は閲覧者ロールを返す', () => {
    expect(getCurrentRole()).toBe(ROLES.VIEWER);
  });

  it('設定したロールを取得できる', () => {
    setCurrentRole(ROLES.ADMIN);
    expect(getCurrentRole()).toBe(ROLES.ADMIN);
  });

  it('未定義のロールを設定するとエラーになる', () => {
    expect(() => setCurrentRole('super-admin')).toThrow();
  });
});

describe('hasPermission', () => {
  it('必要ロールが未指定の場合は誰でもアクセス可能', () => {
    expect(hasPermission(ROLES.VIEWER, null)).toBe(true);
    expect(hasPermission(ROLES.VIEWER, undefined)).toBe(true);
  });

  it('同じロールならアクセス可能', () => {
    expect(hasPermission(ROLES.OPERATOR, ROLES.OPERATOR)).toBe(true);
  });

  it('上位ロールは下位ロール要件を満たす（管理者は運用者要件を満たす）', () => {
    expect(hasPermission(ROLES.ADMIN, ROLES.OPERATOR)).toBe(true);
    expect(hasPermission(ROLES.ADMIN, ROLES.VIEWER)).toBe(true);
  });

  it('下位ロールは上位ロール要件を満たさない（閲覧者は運用者要件を満たさない）', () => {
    expect(hasPermission(ROLES.VIEWER, ROLES.OPERATOR)).toBe(false);
    expect(hasPermission(ROLES.OPERATOR, ROLES.ADMIN)).toBe(false);
  });
});
