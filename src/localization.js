// 多言語基盤（LANGUAGE/TEXT_KEY/LOCALIZED_TEXT）の翻訳取得・検証ユーティリティ
// 参照: docs/01_requirements.md §3（決定事項No.3）, §6, §7.1

/** @typedef {import('./types/common.js').Language} Language */
/** @typedef {import('./types/common.js').TextKey} TextKey */
/** @typedef {import('./types/common.js').LocalizedText} LocalizedText */

/**
 * 有効な言語（isActive=true）を巡回表示順（sortOrder昇順）で返す。
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
 * 既定言語（isDefault=true）を返す。
 * @param {Language[]} languages
 * @returns {Language}
 * @throws {Error} 既定言語が設定されていない場合
 */
export function getDefaultLanguage(languages) {
  const defaultLanguage = languages.find((language) => language.isDefault);
  if (!defaultLanguage) {
    throw new Error('既定言語（isDefault=true）が設定されていません');
  }
  return defaultLanguage;
}

/**
 * 巡回表示における次の言語コードを返す（sortOrder順、末尾の次は先頭に戻る）。
 * @param {Language[]} languages
 * @param {string} currentLanguageCode
 * @returns {string}
 * @throws {Error} 有効な言語が1件も無い場合
 */
export function getNextLanguageCode(languages, currentLanguageCode) {
  const active = listActiveLanguages(languages);
  if (active.length === 0) {
    throw new Error('有効な言語（isActive=true）がありません');
  }
  const currentIndex = active.findIndex((language) => language.languageCode === currentLanguageCode);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % active.length;
  return active[nextIndex].languageCode;
}

/**
 * 巡回表示用の言語コードイテレータを作成する。
 * 呼び出すたびに次の言語コードを返す（初回は開始言語自身を返す）。
 * @param {Language[]} languages
 * @param {string} [startLanguageCode] - 開始言語コード（省略時は既定言語）
 * @returns {() => string}
 */
export function createLanguageRotator(languages, startLanguageCode) {
  let current = startLanguageCode ?? getDefaultLanguage(languages).languageCode;
  let isFirstCall = true;
  return () => {
    if (isFirstCall) {
      isFirstCall = false;
      return current;
    }
    current = getNextLanguageCode(languages, current);
    return current;
  };
}

/**
 * textKeyIdとlanguageCodeから訳文を取得する。
 * 指定言語の訳文が無い場合は既定言語にフォールバックし、既定言語の訳文も無い場合はkeyCodeを返す。
 *
 * @param {number} textKeyId
 * @param {string} languageCode
 * @param {TextKey[]} textKeys
 * @param {LocalizedText[]} localizedTexts
 * @param {Language[]} languages
 * @param {{ onFallback?: (info: { textKeyId: number, requestedLanguageCode: string, usedLanguageCode: string | null }) => void }} [options]
 * @returns {string}
 * @throws {Error} textKeyIdが未定義の場合
 */
export function t(textKeyId, languageCode, textKeys, localizedTexts, languages, options = {}) {
  const textKey = textKeys.find((key) => key.textKeyId === textKeyId);
  if (!textKey) {
    throw new Error(`未定義のtextKeyIdです: ${textKeyId}`);
  }

  const direct = localizedTexts.find(
    (localizedText) => localizedText.textKeyId === textKeyId && localizedText.languageCode === languageCode,
  );
  if (direct) {
    return direct.textValue;
  }

  const defaultLanguage = getDefaultLanguage(languages);
  if (defaultLanguage.languageCode !== languageCode) {
    const fallback = localizedTexts.find(
      (localizedText) =>
        localizedText.textKeyId === textKeyId && localizedText.languageCode === defaultLanguage.languageCode,
    );
    if (fallback) {
      options.onFallback?.({
        textKeyId,
        requestedLanguageCode: languageCode,
        usedLanguageCode: defaultLanguage.languageCode,
      });
      return fallback.textValue;
    }
  }

  options.onFallback?.({ textKeyId, requestedLanguageCode: languageCode, usedLanguageCode: null });
  return textKey.keyCode;
}

/**
 * 既定言語の訳文が存在しないテキストキーを抽出する。
 * @param {TextKey[]} textKeys
 * @param {LocalizedText[]} localizedTexts
 * @param {Language[]} languages
 * @returns {TextKey[]}
 */
export function findMissingDefaultTranslations(textKeys, localizedTexts, languages) {
  const defaultLanguage = getDefaultLanguage(languages);
  return findUntranslatedKeys(textKeys, localizedTexts, defaultLanguage.languageCode);
}

/**
 * 既定言語の訳文が全テキストキーに存在することを検証する。
 * 受け入れ条件「既定言語の訳文が無いキーはエラーになる」に対応する。
 *
 * @param {TextKey[]} textKeys
 * @param {LocalizedText[]} localizedTexts
 * @param {Language[]} languages
 * @throws {Error} 既定言語の訳文が無いテキストキーがある場合
 */
export function assertDefaultTranslationsComplete(textKeys, localizedTexts, languages) {
  const missing = findMissingDefaultTranslations(textKeys, localizedTexts, languages);
  if (missing.length > 0) {
    const codes = missing.map((key) => key.keyCode).join(', ');
    throw new Error(`既定言語の訳文が無いテキストキーがあります: ${codes}`);
  }
}

/**
 * 指定言語について、訳文が無い（未翻訳の）テキストキーを抽出する。
 * M-30 多言語テキスト管理「未翻訳の抽出」に対応する。
 *
 * @param {TextKey[]} textKeys
 * @param {LocalizedText[]} localizedTexts
 * @param {string} languageCode
 * @returns {TextKey[]}
 */
export function findUntranslatedKeys(textKeys, localizedTexts, languageCode) {
  const translatedIds = new Set(
    localizedTexts
      .filter((localizedText) => localizedText.languageCode === languageCode)
      .map((localizedText) => localizedText.textKeyId),
  );
  return textKeys.filter((key) => !translatedIds.has(key.textKeyId));
}
