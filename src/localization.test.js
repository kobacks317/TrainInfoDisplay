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
  { languageCode: 'ko', displayName: '한국어', sortOrder: 3, isDefault: false, isActive: false },
];

const textKeys = [
  { textKeyId: 1, keyCode: 'station.name.shinjuku', category: 'station' },
  { textKeyId: 2, keyCode: 'station.name.shibuya', category: 'station' },
];

const localizedTexts = [
  { localizedTextId: 1, textKeyId: 1, languageCode: 'ja', textValue: '新宿', isReviewed: true },
  { localizedTextId: 2, textKeyId: 1, languageCode: 'en', textValue: 'Shinjuku', isReviewed: true },
  { localizedTextId: 3, textKeyId: 2, languageCode: 'ja', textValue: '渋谷', isReviewed: true },
];

describe('listActiveLanguages', () => {
  it('isActive=trueの言語のみをsortOrder順で返す', () => {
    expect(listActiveLanguages(languages).map((language) => language.languageCode)).toEqual([
      'ja',
      'en',
    ]);
  });
});

describe('getDefaultLanguage', () => {
  it('isDefault=trueの言語を返す', () => {
    expect(getDefaultLanguage(languages).languageCode).toBe('ja');
  });

  it('既定言語が無ければ例外を投げる', () => {
    const noDefault = [{ languageCode: 'en', displayName: 'English', sortOrder: 1, isDefault: false, isActive: true }];
    expect(() => getDefaultLanguage(noDefault)).toThrow();
  });
});

describe('getNextLanguageCode / createLanguageRotator', () => {
  it('sortOrder順に次の言語コードを返す', () => {
    expect(getNextLanguageCode(languages, 'ja')).toBe('en');
  });

  it('末尾の言語からは先頭へ折り返す', () => {
    expect(getNextLanguageCode(languages, 'en')).toBe('ja');
  });

  it('非アクティブな言語は巡回対象から除外される', () => {
    // 'ko' はisActive=falseのため、'en'の次は'ko'を飛ばして先頭の'ja'に戻る
    expect(getNextLanguageCode(languages, 'en')).toBe('ja');
  });

  it('巡回可能な言語が無ければ例外を投げる', () => {
    const allInactive = [
      { languageCode: 'ja', displayName: '日本語', sortOrder: 1, isDefault: true, isActive: false },
    ];
    expect(() => getNextLanguageCode(allInactive, 'ja')).toThrow();
  });

  it('createLanguageRotatorは既定言語から開始し、next()で巡回する', () => {
    const rotator = createLanguageRotator(languages);
    expect(rotator.current()).toBe('ja');
    expect(rotator.next()).toBe('en');
    expect(rotator.current()).toBe('en');
    expect(rotator.next()).toBe('ja');
  });

  it('createLanguageRotatorは初期言語を指定できる', () => {
    const rotator = createLanguageRotator(languages, 'en');
    expect(rotator.current()).toBe('en');
  });
});

describe('t', () => {
  it('指定言語の訳文があればそれを返す', () => {
    expect(t(1, 'en', textKeys, localizedTexts, languages)).toBe('Shinjuku');
  });

  it('指定言語の訳文が無ければ既定言語へフォールバックする', () => {
    const onFallback = vi.fn();
    expect(t(2, 'en', textKeys, localizedTexts, languages, { onFallback })).toBe('渋谷');
    expect(onFallback).toHaveBeenCalledWith({
      textKeyId: 2,
      requestedLanguageCode: 'en',
      resolvedLanguageCode: 'ja',
    });
  });

  it('既定言語の訳文も無ければkeyCodeを返す', () => {
    const onlyEnKeys = [{ textKeyId: 3, keyCode: 'notice.title.sample', category: 'notice' }];
    const onlyEnTexts = [
      { localizedTextId: 10, textKeyId: 3, languageCode: 'en', textValue: 'Sample', isReviewed: true },
    ];
    const onFallback = vi.fn();
    expect(t(3, 'fr', onlyEnKeys, onlyEnTexts, languages, { onFallback })).toBe(
      'notice.title.sample',
    );
    expect(onFallback).toHaveBeenCalledWith({
      textKeyId: 3,
      requestedLanguageCode: 'fr',
      resolvedLanguageCode: undefined,
    });
  });

  it('未定義のtextKeyIdを渡すと例外を投げる', () => {
    expect(() => t(999, 'ja', textKeys, localizedTexts, languages)).toThrow();
  });
});

describe('findMissingDefaultTranslations / assertDefaultTranslationsComplete', () => {
  const keysWithGap = [...textKeys, { textKeyId: 3, keyCode: 'notice.title.sample', category: 'notice' }];

  it('既定言語の訳文が無いキーを検出する', () => {
    const missing = findMissingDefaultTranslations(keysWithGap, localizedTexts, languages);
    expect(missing.map((key) => key.textKeyId)).toEqual([3]);
  });

  it('欠落が無ければassertDefaultTranslationsCompleteは例外を投げない', () => {
    expect(() => assertDefaultTranslationsComplete(textKeys, localizedTexts, languages)).not.toThrow();
  });

  it('欠落があればassertDefaultTranslationsCompleteは例外を投げる', () => {
    expect(() => assertDefaultTranslationsComplete(keysWithGap, localizedTexts, languages)).toThrow(
      /notice\.title\.sample/,
    );
  });
});

describe('findUntranslatedKeys', () => {
  it('指定言語のLOCALIZED_TEXTが存在しないキーを抽出する', () => {
    expect(findUntranslatedKeys('en', textKeys, localizedTexts).map((key) => key.textKeyId)).toEqual([
      2,
    ]);
  });

  it('全キーに訳文があれば空配列を返す', () => {
    expect(findUntranslatedKeys('ja', textKeys, localizedTexts)).toEqual([]);
  });
});
