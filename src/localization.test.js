// 多言語基盤（LANGUAGE/TEXT_KEY/LOCALIZED_TEXT）ユーティリティの単体テスト
// 参照: docs/01_requirements.md §3（決定事項No.3）, §6, §7.1

import { describe, expect, it, vi } from 'vitest';
import {
  assertDefaultTranslationsComplete,
  createLanguageRotator,
  findMissingDefaultTranslations,
  findUntranslatedKeys,
  getDefaultLanguage,
  getNextLanguageCode,
  listActiveLanguages,
  t,
} from './localization.js';

const languages = [
  { languageCode: 'ja', displayName: '日本語', sortOrder: 1, isDefault: true, isActive: true },
  { languageCode: 'en', displayName: 'English', sortOrder: 2, isDefault: false, isActive: true },
  { languageCode: 'fr', displayName: 'Français', sortOrder: 3, isDefault: false, isActive: false },
];

const textKeys = [
  { textKeyId: 1, keyCode: 'station.name.chuo', category: 'station_name' },
  { textKeyId: 2, keyCode: 'station.name.tou', category: 'station_name' },
  { textKeyId: 3, keyCode: 'station.name.no_translation', category: 'station_name' },
];

const localizedTexts = [
  { localizedTextId: 1, textKeyId: 1, languageCode: 'ja', textValue: '中央駅', isReviewed: true },
  { localizedTextId: 2, textKeyId: 1, languageCode: 'en', textValue: 'Chuo Station', isReviewed: true },
  { localizedTextId: 3, textKeyId: 2, languageCode: 'ja', textValue: '東央駅', isReviewed: true },
  // textKeyId=2 は en の訳文が無い（既定言語 ja へのフォールバックを検証する）
  // textKeyId=3 は ja/en いずれの訳文も無い（keyCodeへのフォールバックを検証する）
];

describe('listActiveLanguages', () => {
  it('isActive=trueの言語のみをsortOrder昇順で返す', () => {
    expect(listActiveLanguages(languages).map((l) => l.languageCode)).toEqual(['ja', 'en']);
  });
});

describe('getDefaultLanguage', () => {
  it('isDefault=trueの言語を返す', () => {
    expect(getDefaultLanguage(languages).languageCode).toBe('ja');
  });

  it('既定言語が無い場合はエラーを投げる', () => {
    expect(() => getDefaultLanguage([{ languageCode: 'ja', isDefault: false, isActive: true, sortOrder: 1 }])).toThrow(
      /既定言語/,
    );
  });
});

describe('getNextLanguageCode', () => {
  it('sortOrder順で次の言語コードを返す', () => {
    expect(getNextLanguageCode(languages, 'ja')).toBe('en');
  });

  it('末尾の次は先頭に戻る', () => {
    expect(getNextLanguageCode(languages, 'en')).toBe('ja');
  });

  it('現在言語が無効・未知の場合は先頭に戻る', () => {
    expect(getNextLanguageCode(languages, 'fr')).toBe('ja');
  });

  it('有効な言語が無い場合はエラーを投げる', () => {
    const allInactive = languages.map((l) => ({ ...l, isActive: false }));
    expect(() => getNextLanguageCode(allInactive, 'ja')).toThrow(/有効な言語/);
  });
});

describe('createLanguageRotator', () => {
  it('既定言語から開始し、呼び出すたびに巡回する', () => {
    const rotate = createLanguageRotator(languages);
    expect(rotate()).toBe('ja');
    expect(rotate()).toBe('en');
    expect(rotate()).toBe('ja');
  });

  it('開始言語を指定できる', () => {
    const rotate = createLanguageRotator(languages, 'en');
    expect(rotate()).toBe('en');
    expect(rotate()).toBe('ja');
  });
});

describe('t', () => {
  it('指定言語の訳文が存在すればそれを返す', () => {
    expect(t(1, 'en', textKeys, localizedTexts, languages)).toBe('Chuo Station');
  });

  it('指定言語の訳文が無ければ既定言語にフォールバックする', () => {
    expect(t(2, 'en', textKeys, localizedTexts, languages)).toBe('東央駅');
  });

  it('フォールバック時にonFallbackが呼ばれる', () => {
    const onFallback = vi.fn();
    t(2, 'en', textKeys, localizedTexts, languages, { onFallback });
    expect(onFallback).toHaveBeenCalledWith({
      textKeyId: 2,
      requestedLanguageCode: 'en',
      usedLanguageCode: 'ja',
    });
  });

  it('既定言語の訳文も無ければkeyCodeを返す', () => {
    expect(t(3, 'en', textKeys, localizedTexts, languages)).toBe('station.name.no_translation');
  });

  it('keyCodeへのフォールバック時はusedLanguageCode=nullでonFallbackが呼ばれる', () => {
    const onFallback = vi.fn();
    t(3, 'ja', textKeys, localizedTexts, languages, { onFallback });
    expect(onFallback).toHaveBeenCalledWith({
      textKeyId: 3,
      requestedLanguageCode: 'ja',
      usedLanguageCode: null,
    });
  });

  it('未定義のtextKeyIdはエラーを投げる', () => {
    expect(() => t(999, 'ja', textKeys, localizedTexts, languages)).toThrow(/未定義のtextKeyId/);
  });
});

describe('findUntranslatedKeys', () => {
  it('指定言語の訳文が無いテキストキーを抽出する', () => {
    const missing = findUntranslatedKeys(textKeys, localizedTexts, 'en');
    expect(missing.map((k) => k.textKeyId)).toEqual([2, 3]);
  });

  it('全キーに訳文がある言語では空配列を返す', () => {
    expect(findUntranslatedKeys(textKeys, localizedTexts, 'ja')).toEqual([
      { textKeyId: 3, keyCode: 'station.name.no_translation', category: 'station_name' },
    ]);
  });
});

describe('findMissingDefaultTranslations', () => {
  it('既定言語の訳文が無いテキストキーを抽出する', () => {
    const missing = findMissingDefaultTranslations(textKeys, localizedTexts, languages);
    expect(missing.map((k) => k.textKeyId)).toEqual([3]);
  });
});

describe('assertDefaultTranslationsComplete', () => {
  it('既定言語の訳文が無いキーがある場合はエラーを投げる', () => {
    expect(() => assertDefaultTranslationsComplete(textKeys, localizedTexts, languages)).toThrow(
      /station\.name\.no_translation/,
    );
  });

  it('全キーに既定言語の訳文がある場合はエラーを投げない', () => {
    const completeTextKeys = textKeys.filter((k) => k.textKeyId !== 3);
    expect(() =>
      assertDefaultTranslationsComplete(completeTextKeys, localizedTexts, languages),
    ).not.toThrow();
  });
});
