// 画面定義・スライドショー・ウィンドウ／セッションの型定義
// 参照: docs/01_requirements.md §7.2

/**
 * 画面テンプレート（領域分割パターン）。
 * @typedef {Object} ScreenTemplate
 * @property {number} templateId - PK
 * @property {string} templateCode - テンプレートコード（UK）
 * @property {string} name - テンプレート名
 * @property {string} orientation - 横/縦
 * @property {number} baseWidth - 基準幅
 * @property {number} baseHeight - 基準高さ
 * @property {string} [thumbnailUrl] - サムネイル
 */

/**
 * テンプレート内の領域。
 * @typedef {Object} TemplateArea
 * @property {number} areaId - PK
 * @property {number} templateId - FK -> ScreenTemplate.templateId
 * @property {string} areaCode - 領域コード
 * @property {number} posX - X座標（％）
 * @property {number} posY - Y座標（％）
 * @property {number} width - 幅（％）
 * @property {number} height - 高さ（％）
 * @property {number} zIndex - 重なり順
 */

/**
 * 案内コンポーネント（次駅表示・路線図等、案内の1部品）。
 * @typedef {Object} ContentComponent
 * @property {number} componentId - PK
 * @property {string} componentCode - コンポーネントコード（UK） next_station等
 * @property {string} name - コンポーネント名
 * @property {string} category - 案内種別
 * @property {string} htmlPath - デザインHTMLのパス
 * @property {string} [minSize] - 最小推奨サイズ
 */

/**
 * コンポーネントの設定項目定義。
 * @typedef {Object} ComponentOption
 * @property {number} optionId - PK
 * @property {number} componentId - FK -> ContentComponent.componentId
 * @property {string} optionKey - 設定キー
 * @property {string} valueType - 値型
 * @property {string} [defaultValue] - 既定値
 * @property {string} [description] - 説明
 */

/**
 * 画面レイアウト（テンプレートの各領域にコンポーネントを割り当てた1画面）。
 * @typedef {Object} ScreenLayout
 * @property {number} layoutId - PK
 * @property {number} templateId - FK -> ScreenTemplate.templateId
 * @property {string} name - レイアウト名
 * @property {string} theme - 配色テーマ
 * @property {boolean} isActive - 有効フラグ
 */

/**
 * レイアウトの領域へのコンポーネント割当。
 * @typedef {Object} LayoutAreaAssign
 * @property {number} assignId - PK
 * @property {number} layoutId - FK -> ScreenLayout.layoutId
 * @property {number} areaId - FK -> TemplateArea.areaId
 * @property {number} componentId - FK -> ContentComponent.componentId
 * @property {Object.<string, *>} optionValues - コンポーネント設定値
 */

/**
 * スライドショー（レイアウトを順序・秒数付きで並べた再生リスト）。
 * @typedef {Object} Slideshow
 * @property {number} slideshowId - PK
 * @property {string} name - スライドショー名
 * @property {boolean} loopEnabled - ループ有無
 * @property {number} defaultDurationSec - 既定表示秒数
 * @property {boolean} isActive - 有効フラグ
 */

/**
 * スライドショーの1スライド。
 * @typedef {Object} SlideshowItem
 * @property {number} slideshowItemId - PK
 * @property {number} slideshowId - FK -> Slideshow.slideshowId
 * @property {number} layoutId - FK -> ScreenLayout.layoutId
 * @property {number} displayOrder - 表示順
 * @property {number} [durationSec] - 表示秒数（未指定時はスライドショーの既定値）
 * @property {string} transition - 切替効果
 * @property {boolean} skipIfNoData - データ無し時スキップ
 */

/**
 * スライドの表示対象となる列車状態（唯一の表示条件）。
 * @typedef {Object} SlideshowItemStatus
 * @property {number} itemStatusId - PK
 * @property {number} slideshowItemId - FK -> SlideshowItem.slideshowItemId
 * @property {import('./train.js').TrainStatus} trainStatus - 対象の列車状態
 */

/**
 * ユーザーの役割（権限）。
 * @typedef {'admin' | 'operator' | 'viewer'} AppUserRole
 */

/**
 * メインウィンドウの利用者。
 * @typedef {Object} AppUser
 * @property {number} userId - PK
 * @property {string} loginId - ログインID（UK）
 * @property {string} displayName - 表示名
 * @property {AppUserRole} role - 管理者/運用者/閲覧者
 * @property {boolean} isActive - 有効フラグ
 */

/**
 * メインウィンドウの操作セッション（運行の操作単位）。
 * @typedef {Object} ControlSession
 * @property {number} sessionId - PK
 * @property {number} userId - FK -> AppUser.userId
 * @property {number} trainRunId - 操作対象の運行 FK -> import('./train.js').TrainRun.trainRunId
 * @property {string} channelName - BroadcastChannel名
 * @property {string} sessionToken - ウィンドウ認可トークン
 * @property {boolean} autoAdvance - 自動進行モード
 * @property {string} startedAt - 開始時刻（ISO日時文字列）
 * @property {string} [endedAt] - 終了時刻（ISO日時文字列）
 */

/**
 * 表示ウィンドウ（案内表示用ポップアップ）。
 * @typedef {Object} DisplayWindow
 * @property {number} displayWindowId - PK
 * @property {number} sessionId - FK -> ControlSession.sessionId
 * @property {number} slideshowId - FK -> Slideshow.slideshowId
 * @property {number} carId - 割当号車 FK -> import('./train.js').Car.carId
 * @property {string} languageCode - 表示言語 FK -> import('./common.js').Language.languageCode
 * @property {string} windowName - ウィンドウ名
 * @property {number} windowWidth - ウィンドウ幅
 * @property {number} windowHeight - ウィンドウ高さ
 * @property {string} orientation - 画面向き
 * @property {boolean} rotateLanguage - 言語巡回表示
 * @property {string} openedAt - 起動時刻（ISO日時文字列）
 * @property {string} [lastPingAt] - 最終応答時刻（ISO日時文字列）
 */

// このファイルはJSDoc型定義のみを提供する（実行時の値はエクスポートしない）。
// 他ファイルからは `import('./screen.js').Slideshow` の形式で参照する。
export {};
