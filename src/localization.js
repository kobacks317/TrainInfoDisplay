// 多言語テキスト取得・フォールバック・巡回表示のユーティリティ
// 参照: docs/01_requirements.md §3（決定事項No.3）, §6, §7.1

/** @typedef {import('./types/common.js').Language} Language */
/** @typedef {import('./types/common.js').TextKey} TextKey */
/** @typedef {import('./types/common.js').LocalizedText} LocalizedText */

/**
 * 有効な言語（`isActive=true`）を巡回表示順（`sortOrder`昇順）で取得する。
 * @param {Language[]} languages
 * @returns {Language[]}
 */
export function listActiveLanguages(languages) {
  return languages
    .filter((language) => language.isActive)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * 既定言語（`isDefault=true`）を取得する。
 * @param {Language[]} languages
 * @returns {Language}
 */
export function getDefaultLanguage(languages) {
  const defaultLanguage = languages.find((language) => language.isDefault);
  if (!defaultLanguage) {
    throw new Error('既定言語（isDefault=true）が設定されていません');
  }
  return defaultLanguage;
}

/**
 * 指定言語の次に巡回表示すべき言語コードを返す。`sortOrder`順に進み、末尾は先頭へ折り返す。
 * @param {Language[]} languages
 * @param {string} currentLanguageCode
 * @returns {string}
 */
export function getNextLanguageCode(languages, currentLanguageCode) {
  const active = listActiveLanguages(languages);
  if (active.length === 0) {
    throw new Error('巡回表示可能な言語（isActive=true）がありません');
  }
  const currentIndex = active.findIndex((language) => language.languageCode === currentLanguageCode);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % active.length;
  return active[nextIndex].languageCode;
}

/**
 * 言語巡回表示の状態（現在の言語）を保持するユーティリティを生成する。
 * `next()`を呼ぶたびに`sortOrder`順で次の言語へ進み、末尾から先頭へ折り返す。
 * @param {Language[]} languages
 * @param {string} [initialLanguageCode] - 省略時は既定言語から開始する
 */
export function createLanguageRotator(languages, initialLanguageCode) {
  let current = initialLanguageCode ?? getDefaultLanguage(languages).languageCode;
  return {
    /** @returns {string} 現在の言語コード */
    current() {
      return current;
    },
    /** @returns {string} 次に進めた後の言語コード */
    next() {
      current = getNextLanguageCode(languages, current);
      return current;
    },
  };
}

/**
 * @param {number} textKeyId
 * @param {string} languageCode
 * @param {LocalizedText[]} localizedTexts
 * @returns {LocalizedText | undefined}
 */
function findLocalizedText(textKeyId, languageCode, localizedTexts) {
  return localizedTexts.find(
    (localizedText) =>
      localizedText.textKeyId === textKeyId && localizedText.languageCode === languageCode,
  );
}

/**
 * 訳文取得関数。指定言語の訳文があればそれを返し、無ければ既定言語へフォールバックする。
 * 既定言語にも訳文が無い場合は`keyCode`をそのまま返す（未整備時でも画面が壊れないようにするため）。
 *
 * @param {number} textKeyId
 * @param {string} languageCode
 * @param {TextKey[]} textKeys
 * @param {LocalizedText[]} localizedTexts
 * @param {Language[]} languages
 * @param {{ onFallback?: (info: { textKeyId: number, requestedLanguageCode: string, resolvedLanguageCode?: string }) => void }} [options]
 *   - `onFallback`: 要求した言語の訳文が見つからず、既定言語または`keyCode`にフォールバックした際に呼ばれる
 * @returns {string}
 */
export function t(textKeyId, languageCode, textKeys, localizedTexts, languages, options = {}) {
  const textKey = textKeys.find((key) => key.textKeyId === textKeyId);
  if (!textKey) {
    throw new Error(`未定義のtextKeyIdです: ${textKeyId}`);
  }

  const direct = findLocalizedText(textKeyId, languageCode, localizedTexts);
  if (direct) {
    return direct.textValue;
  }

  const defaultLanguage = getDefaultLanguage(languages);
  const fallback = findLocalizedText(textKeyId, defaultLanguage.languageCode, localizedTexts);
  if (fallback) {
    options.onFallback?.({
      textKeyId,
      requestedLanguageCode: languageCode,
      resolvedLanguageCode: defaultLanguage.languageCode,
    });
    return fallback.textValue;
  }

  options.onFallback?.({
    textKeyId,
    requestedLanguageCode: languageCode,
    resolvedLanguageCode: undefined,
  });
  return textKey.keyCode;
}

/**
 * 既定言語の訳文が存在しない`TEXT_KEY`を検出する。
 * @param {TextKey[]} textKeys
 * @param {LocalizedText[]} localizedTexts
 * @param {Language[]} languages
 * @returns {TextKey[]}
 */
export function findMissingDefaultTranslations(textKeys, localizedTexts, languages) {
  const defaultLanguage = getDefaultLanguage(languages);
  return textKeys.filter(
    (key) => !findLocalizedText(key.textKeyId, defaultLanguage.languageCode, localizedTexts),
  );
}

/**
 * 既定言語の訳文が無い`TEXT_KEY`があれば例外を投げる（受け入れ条件: 既定言語未翻訳キーの検出）。
 * @param {TextKey[]} textKeys
 * @param {LocalizedText[]} localizedTexts
 * @param {Language[]} languages
 */
export function assertDefaultTranslationsComplete(textKeys, localizedTexts, languages) {
  const missing = findMissingDefaultTranslations(textKeys, localizedTexts, languages);
  if (missing.length > 0) {
    const keyCodes = missing.map((key) => key.keyCode).join(', ');
    throw new Error(`既定言語の訳文が存在しないTEXT_KEYがあります: ${keyCodes}`);
  }
}

/**
 * 指定言語の訳文（`LOCALIZED_TEXT`）が存在しない`TEXT_KEY`を抽出する。
 * M-30「多言語テキスト管理」の未翻訳抽出機能（FR-44）に対応する。
 * @param {string} languageCode
 * @param {TextKey[]} textKeys
 * @param {LocalizedText[]} localizedTexts
 * @returns {TextKey[]}
 */
export function findUntranslatedKeys(languageCode, textKeys, localizedTexts) {
  return textKeys.filter((key) => !findLocalizedText(key.textKeyId, languageCode, localizedTexts));
}
