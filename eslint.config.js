// @ts-check
import js from '@eslint/js';
import json from '@eslint/json';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  {
    files: ['**/*.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      // 未使用変数はエラー（アンダースコア始まりは許容）
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // ウィンドウ間通信メッセージ等でconsoleは許容するが、デバッグ用のlogは警告
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Node.jsで実行する開発用スクリプト（npm scripts経由）
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.json'],
    ignores: ['package-lock.json'],
    plugins: { json },
    language: 'json/json',
    ...json.configs.recommended,
  },
  eslintConfigPrettier,
];
