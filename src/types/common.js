// 共通基盤（多言語・シンボルデザイン）の型定義
// 参照: docs/01_requirements.md §7.1

/**
 * 表示言語。
 * @typedef {Object} Language
 * @property {string} languageCode - 言語コード（PK） ja/en/zh-Hans等
 * @property {string} displayName - 言語名
 * @property {number} sortOrder - 巡回表示順
 * @property {boolean} isDefault - 既定言語フラグ
 * @property {boolean} isActive - 有効フラグ
 */

/**
 * 多言語化対象の文言を識別するキー。
 * @typedef {Object} TextKey
 * @property {number} textKeyId - PK
 * @property {string} keyCode - キーコード（UK） station.name.shinjuku等
 * @property {string} category - 分類
 * @property {string} [note] - 用途メモ
 */

/**
 * テキストキーごとの言語別訳文。
 * @typedef {Object} LocalizedText
 * @property {number} localizedTextId - PK
 * @property {number} textKeyId - FK -> TextKey.textKeyId
 * @property {string} languageCode - FK -> Language.languageCode
 * @property {string} textValue - 表示文言
 * @property {string} [reading] - よみ/発音
 * @property {boolean} isReviewed - 翻訳確認済フラグ
 */

/**
 * シンボルデザインの種別。
 * @typedef {'LINE_SYMBOL' | 'STATION_NUMBER'} SymbolDesignType
 */

/**
 * ラインシンボル・駅ナンバリングの見た目（形状・枠線・配色）の定義。
 * @typedef {Object} SymbolDesign
 * @property {number} symbolDesignId - PK
 * @property {string} designCode - デザインコード（UK）
 * @property {SymbolDesignType} designType - LINE_SYMBOL/STATION_NUMBER
 * @property {string} name - デザイン名
 * @property {string} shape - circle/rounded_square/hexagon等
 * @property {string} borderStyle - 枠線スタイル
 * @property {number} borderWidth - 枠線太さ
 * @property {string} defaultTextColor - 既定文字色
 * @property {string} defaultBgColor - 既定背景色
 * @property {string} fontFamily - フォント
 * @property {number} aspectRatio - 縦横比
 * @property {string} [svgTemplate] - SVGテンプレート
 */

/**
 * 路線に紐づくラインシンボルの実値（記号・配色）。
 * @typedef {Object} LineSymbol
 * @property {number} lineSymbolId - PK
 * @property {number} lineId - FK -> Line.lineId
 * @property {number} symbolDesignId - FK -> SymbolDesign.symbolDesignId
 * @property {string} symbolText - JY等の記号
 * @property {string} lineColor - 路線カラー
 * @property {string} textColor - 文字色
 * @property {number} displayOrder - 表示順
 * @property {string} [note] - 用途メモ
 */

/**
 * 路線内駅に紐づく駅番号の実値。
 * @typedef {Object} StationNumber
 * @property {number} stationNumberId - PK
 * @property {number} lineStationId - FK -> LineStation.lineStationId
 * @property {number} symbolDesignId - FK -> SymbolDesign.symbolDesignId
 * @property {string} prefix - 路線記号部
 * @property {string} number - 番号部
 * @property {string} lineColor - 配色
 * @property {number} displayOrder - 表示順
 */

/**
 * 乗換案内で表示するシンボル（自社線流用または独自定義）。
 * @typedef {Object} TransferSymbol
 * @property {number} transferSymbolId - PK
 * @property {number} transferId - FK -> TransferInfo.transferId
 * @property {number} symbolDesignId - FK -> SymbolDesign.symbolDesignId
 * @property {number} [lineSymbolId] - 自社線の場合の参照元 FK -> LineSymbol.lineSymbolId
 * @property {string} symbolText - 記号
 * @property {string} lineColor - 路線カラー
 * @property {string} textColor - 文字色
 * @property {number} displayOrder - 表示順
 */

// このファイルはJSDoc型定義のみを提供する（実行時の値はエクスポートしない）。
// 他ファイルからは `import('./common.js').Language` の形式で参照する。
export {};
