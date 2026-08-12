import { describe, expect, it } from 'vitest';
import { ROLES } from './roles.js';
import { ROUTES } from './routes.js';

describe('ROUTES', () => {
  it('docs/02_screen_design.md §2.1 のM系画面が一通り定義されている', () => {
    const ids = ROUTES.map((route) => route.id);
    expect(ids).toEqual([
      'M-01',
      'M-02',
      'M-03',
      'M-04',
      'M-10',
      'M-11',
      'M-12',
      'M-13',
      'M-20',
      'M-21',
      'M-22',
      'M-23',
      'M-24',
      'M-25',
      'M-26',
      'M-30',
      'M-31',
    ]);
  });

  it('パスが重複しない', () => {
    const paths = ROUTES.map((route) => route.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('リンク先のパスは全て定義済みのルートを指す', () => {
    const knownPaths = new Set(ROUTES.map((route) => route.path));
    for (const route of ROUTES) {
      for (const link of route.links) {
        expect(knownPaths.has(link.path), `${route.id}のリンク先 ${link.path} が未定義`).toBe(
          true,
        );
      }
    }
  });

  it('§4.3の権限表通りにrequiredRoleが設定されている', () => {
    const byId = Object.fromEntries(ROUTES.map((route) => [route.id, route.requiredRole]));
    expect(byId['M-01']).toBe(null);
    expect(byId['M-02']).toBe(ROLES.OPERATOR);
    expect(byId['M-03']).toBe(ROLES.OPERATOR);
    expect(byId['M-04']).toBe(ROLES.VIEWER);
    expect(byId['M-10']).toBe(ROLES.OPERATOR);
    expect(byId['M-11']).toBe(ROLES.ADMIN);
    expect(byId['M-26']).toBe(ROLES.OPERATOR);
    expect(byId['M-30']).toBe(ROLES.ADMIN);
    expect(byId['M-31']).toBe(ROLES.ADMIN);
  });

  it('各ルートはrender関数を持つ', () => {
    for (const route of ROUTES) {
      expect(typeof route.render).toBe('function');
    }
  });
});
