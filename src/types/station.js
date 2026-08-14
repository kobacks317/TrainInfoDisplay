// 路線・駅マスタ、路線図の型定義
// 参照: docs/01_requirements.md §7.2

/**
 * 鉄道事業者。
 * @typedef {Object} Operator
 * @property {number} operatorId - PK
 * @property {string} operatorCode - 事業者コード（UK）
 * @property {number} nameTextKeyId - 事業者名 FK -> TextKey.textKeyId
 * @property {string} [sourceSystem] - 同期元
 * @property {string} [syncedAt] - 同期日時（ISO日時文字列）
 */

/**
 * 路線。
 * @typedef {Object} Line
 * @property {number} lineId - PK
 * @property {number} operatorId - FK -> Operator.operatorId
 * @property {string} lineCode - 路線コード（UK）
 * @property {number} nameTextKeyId - 路線名 FK -> TextKey.textKeyId
 * @property {string} primaryColor - 代表カラー
 * @property {number} displayOrder - 表示順
 * @property {string} [sourceSystem] - 同期元
 * @property {string} [syncedAt] - 同期日時（ISO日時文字列）
 */

/**
 * 駅。
 * @typedef {Object} Station
 * @property {number} stationId - PK
 * @property {string} stationCode - 駅コード（UK）
 * @property {number} nameTextKeyId - 駅名 FK -> TextKey.textKeyId
 * @property {number} [latitude] - 緯度
 * @property {number} [longitude] - 経度
 * @property {string} [sourceSystem] - 同期元
 * @property {string} [syncedAt] - 同期日時（ISO日時文字列）
 */

/**
 * 路線内の駅順（1駅は複数路線に所属しうる）。
 * @typedef {Object} LineStation
 * @property {number} lineStationId - PK
 * @property {number} lineId - FK -> Line.lineId
 * @property {number} stationId - FK -> Station.stationId
 * @property {number} stationOrder - 路線内の駅順
 * @property {number} distanceKm - 起点からのキロ程
 * @property {number} standardMinutesFromPrev - 前駅からの標準所要分
 */

/**
 * 乗換案内情報。乗換先が自社線に無い場合も表示名・事業者名を直接保持できる。
 * @typedef {Object} TransferInfo
 * @property {number} transferId - PK
 * @property {number} lineStationId - 乗換元の路線内駅 FK -> LineStation.lineStationId
 * @property {number} [toLineId] - 自社線の場合のみ設定 FK -> Line.lineId
 * @property {number} displayNameTextKeyId - 乗換先路線名 FK -> TextKey.textKeyId
 * @property {number} operatorNameTextKeyId - 乗換先事業者名 FK -> TextKey.textKeyId
 * @property {number} [noteTextKeyId] - 備考 FK -> TextKey.textKeyId
 * @property {string} primaryColor - 代表カラー
 * @property {number} walkMinutes - 徒歩所要分
 * @property {number} [recommendedCarNo] - 便利な号車
 * @property {number} displayOrder - 表示順
 */

/**
 * 駅のホーム（番線）。
 * @typedef {Object} Platform
 * @property {number} platformId - PK
 * @property {number} stationId - FK -> Station.stationId
 * @property {string} platformNo - 番線
 * @property {number} [directionTextKeyId] - 方面表記 FK -> TextKey.textKeyId
 * @property {boolean} hasPlatformDoor - ホームドア有無
 * @property {number} carPositions - 停車位置数
 */

/**
 * ホーム設備（出口・階段・EV・ES・トイレ・改札等）。
 * @typedef {Object} PlatformFacility
 * @property {number} facilityId - PK
 * @property {number} platformId - FK -> Platform.platformId
 * @property {string} facilityType - 出口/階段/EV/ES/トイレ/改札
 * @property {number} labelTextKeyId - 名称 FK -> TextKey.textKeyId
 * @property {number} [nearCarNo] - 最寄り号車
 * @property {number} [nearDoorNo] - 最寄りドア番号
 * @property {number} posX - ホーム図上X
 * @property {number} posY - ホーム図上Y
 * @property {boolean} barrierFree - バリアフリー対応
 */

/**
 * 路線図（方向別・SVG描画の基準定義）。
 * @typedef {Object} RouteMap
 * @property {number} routeMapId - PK
 * @property {number} lineId - FK -> Line.lineId
 * @property {string} direction - 上り/下り
 * @property {number} viewboxWidth - SVG幅
 * @property {number} viewboxHeight - SVG高さ
 * @property {string} [backgroundImageUrl] - 背景画像
 * @property {number} [backgroundOpacity] - 背景不透明度
 * @property {Object} [styleJson] - 描画スタイル定義
 * @property {string} [validFrom] - 適用開始日（ISO日付文字列）
 * @property {string} [validTo] - 適用終了日（ISO日付文字列）
 */

/**
 * 路線図上の駅ノード。
 * @typedef {Object} RouteMapNode
 * @property {number} nodeId - PK
 * @property {number} routeMapId - FK -> RouteMap.routeMapId
 * @property {number} lineStationId - FK -> LineStation.lineStationId
 * @property {number} posX - X座標
 * @property {number} posY - Y座標
 * @property {string} labelPosition - ラベル位置
 * @property {number} labelAngle - ラベル角度
 * @property {string} nodeShape - ノード形状
 * @property {boolean} showStationNumber - 駅番号表示有無
 * @property {boolean} showTransfer - 乗換シンボル表示有無
 */

/**
 * 路線図上のノード間の線形（SVGパス）。
 * @typedef {Object} RouteMapEdge
 * @property {number} edgeId - PK
 * @property {number} routeMapId - FK -> RouteMap.routeMapId
 * @property {number} fromNodeId - FK -> RouteMapNode.nodeId
 * @property {number} toNodeId - FK -> RouteMapNode.nodeId
 * @property {string} pathD - SVGパス定義
 * @property {string} strokeColor - 線色
 * @property {number} strokeWidth - 線幅
 * @property {string} strokeStyle - 実線/破線
 */

// このファイルはJSDoc型定義のみを提供する（実行時の値はエクスポートしない）。
// 他ファイルからは `import('./station.js').Line` の形式で参照する。
export {};
