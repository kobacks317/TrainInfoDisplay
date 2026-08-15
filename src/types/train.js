// 列車・運行・編成・お知らせの型定義
// 参照: docs/01_requirements.md §7.2

/**
 * 列車状態の4区分。
 * @typedef {'RUNNING' | 'APPROACHING' | 'STOPPED' | 'DEPARTING'} TrainStatus
 */

/**
 * 停車駅／通過駅の区別。
 * @typedef {'STOP' | 'PASS'} StopType
 */

/**
 * 列車種別（各社の種別マスタ）。
 * @typedef {Object} TrainType
 * @property {number} trainTypeId - PK
 * @property {number} operatorId - FK -> Operator.operatorId
 * @property {string} typeCode - 種別コード
 * @property {number} nameTextKeyId - 種別名 FK -> TextKey.textKeyId
 * @property {string} typeColor - 種別カラー
 * @property {string} textColor - 文字色
 * @property {number} priority - 優先度
 */

/**
 * 列車（ダイヤ上の1本の列車。列車番号で識別される静的な定義）。
 * @typedef {Object} Train
 * @property {number} trainId - PK
 * @property {number} operatorId - FK -> Operator.operatorId
 * @property {number} trainTypeId - 基本種別 FK -> TrainType.trainTypeId
 * @property {number} destinationStationId - 行先 FK -> Station.stationId
 * @property {string} trainNumber - 列車番号（UK）
 * @property {number} [viaTextKeyId] - 経由表記 FK -> TextKey.textKeyId
 * @property {string} operationDays - 運転日パターン
 * @property {string} [sourceSystem] - 同期元
 * @property {string} [sourceUpdatedAt] - 外部システム側の最終更新日時（ISO日時文字列）
 * @property {string} [syncedAt] - 同期日時（ISO日時文字列）
 */

/**
 * 直通運転を表す、列車の路線区間。1列車が複数路線にまたがる場合に区間ごとに持つ。
 * @typedef {Object} TrainLineSegment
 * @property {number} segmentId - PK
 * @property {number} trainId - FK -> Train.trainId
 * @property {number} lineId - FK -> Line.lineId
 * @property {number} trainTypeId - 区間ごとの種別 FK -> TrainType.trainTypeId
 * @property {number} segmentOrder - 区間順
 * @property {number} fromStationId - 区間開始駅 FK -> Station.stationId
 * @property {number} toStationId - 区間終了駅 FK -> Station.stationId
 * @property {string} direction - 上り/下り
 * @property {boolean} isThroughService - 直通区間フラグ
 */

/**
 * 列車の経由駅（停車・通過を問わず順序付きで保持）。
 * @typedef {Object} TrainStop
 * @property {number} trainStopId - PK
 * @property {number} trainId - FK -> Train.trainId
 * @property {number} lineId - 在線路線 FK -> Line.lineId
 * @property {number} stationId - FK -> Station.stationId
 * @property {number} [platformId] - 発着番線 FK -> Platform.platformId
 * @property {number} sequence - 通過順（通過駅含む）
 * @property {StopType} stopType - STOP=停車 PASS=通過
 * @property {string} [arrivalTime] - 着時刻（HH:mm等の文字列）
 * @property {string} [departureTime] - 発時刻（HH:mm等の文字列）
 * @property {string} [doorSide] - 開扉方向 左/右/両
 * @property {string} [stopPosition] - 停車位置
 */

/**
 * 編成。
 * @typedef {Object} Formation
 * @property {number} formationId - PK
 * @property {string} formationCode - 編成番号（UK）
 * @property {number} carCount - 両数
 * @property {number} [seriesTextKeyId] - 形式名 FK -> TextKey.textKeyId
 * @property {string} [sourceSystem] - 同期元
 * @property {string} [sourceUpdatedAt] - 外部システム側の最終更新日時（ISO日時文字列）
 * @property {string} [syncedAt] - 同期日時（ISO日時文字列）
 */

/**
 * 号車。
 * @typedef {Object} Car
 * @property {number} carId - PK
 * @property {number} formationId - FK -> Formation.formationId
 * @property {number} carNo - 号車番号
 * @property {number} sequence - 編成内の位置
 * @property {number} doorCount - 片側ドア数
 * @property {boolean} hasPrioritySeat - 優先席有無
 * @property {boolean} isWomenOnly - 女性専用車
 * @property {boolean} isWeakAc - 弱冷房車
 */

/**
 * 号車設備（トイレ・車椅子スペース・WiFi等）。
 * @typedef {Object} CarFacility
 * @property {number} carFacilityId - PK
 * @property {number} carId - FK -> Car.carId
 * @property {string} facilityType - トイレ/車椅子スペース/WiFi等
 * @property {number} labelTextKeyId - 表示名 FK -> TextKey.textKeyId
 */

/**
 * ある日付における列車の運行インスタンス。
 * @typedef {Object} TrainRun
 * @property {number} trainRunId - PK
 * @property {number} trainId - FK -> Train.trainId
 * @property {number} formationId - FK -> Formation.formationId
 * @property {string} serviceDate - 運行日（ISO日付文字列）
 * @property {string} runStatus - 通常/運休/臨時
 * @property {string} [startedAt] - 運行開始時刻（ISO日時文字列）
 */

/**
 * 運行の現在状態（履歴を持たず1運行につき1レコードで上書き更新）。
 * @typedef {Object} TrainRunState
 * @property {number} trainRunId - PK, FK -> TrainRun.trainRunId
 * @property {number} currentLineId - 在線路線 FK -> Line.lineId
 * @property {number} [currentStationId] - 現在駅または直前駅 FK -> Station.stationId
 * @property {number} [nextStopStationId] - 次の停車駅 FK -> Station.stationId
 * @property {number} [nextPassStationId] - 次の通過駅 FK -> Station.stationId
 * @property {TrainStatus} trainStatus - RUNNING/APPROACHING/STOPPED/DEPARTING
 * @property {number} progressRatio - 駅間の進捗率（0〜1）
 * @property {number} [etaSeconds] - 次停車駅までの見込み秒数
 * @property {number} delayMinutes - 遅延分
 * @property {number} [delayReasonTextKeyId] - 遅延理由 FK -> TextKey.textKeyId
 * @property {string} updatedAt - 更新時刻（ISO日時文字列）
 */

/**
 * お知らせ。
 * @typedef {Object} Notice
 * @property {number} noticeId - PK
 * @property {string} category - 運行情報/マナー/臨時/工事
 * @property {number} severity - 重要度
 * @property {number} titleTextKeyId - 件名 FK -> TextKey.textKeyId
 * @property {number} bodyTextKeyId - 本文 FK -> TextKey.textKeyId
 * @property {string} [mediaUrl] - 画像動画URL
 * @property {string} displayFrom - 掲出開始（ISO日時文字列）
 * @property {string} displayTo - 掲出終了（ISO日時文字列）
 * @property {boolean} isInterrupt - 割込表示フラグ
 */

/**
 * お知らせの適用対象。
 * @typedef {Object} NoticeTarget
 * @property {number} noticeTargetId - PK
 * @property {number} noticeId - FK -> Notice.noticeId
 * @property {'LINE' | 'STATION' | 'TRAIN' | 'ALL'} targetType - 対象種別
 * @property {number} [lineId] - FK -> Line.lineId
 * @property {number} [stationId] - FK -> Station.stationId
 * @property {number} [trainId] - FK -> Train.trainId
 */

// このファイルはJSDoc型定義のみを提供する（実行時の値はエクスポートしない）。
// 他ファイルからは `import('./train.js').Train` の形式で参照する。
export {};
