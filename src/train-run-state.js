// 運行（TRAIN_RUN）と現在状態（TRAIN_RUN_STATE）をインメモリで管理するモジュール
// 参照: docs/01_requirements.md §3（決定事項No.8）, §6, §7.2 / docs/02_screen_design.md §5.1

/** @typedef {import('./types/train.js').TrainRun} TrainRun */
/** @typedef {import('./types/train.js').TrainRunState} TrainRunState */
/** @typedef {import('./types/train.js').TrainStatus} TrainStatus */
/** @typedef {import('./types/train.js').TrainStop} TrainStop */

export const TRAIN_STATUSES = ['RUNNING', 'APPROACHING', 'STOPPED', 'DEPARTING'];

// 停車中／発車中は、現在地が停車駅（stopType='STOP'）でなければ設定できない
const STATUSES_REQUIRING_STOP_STATION = new Set(['STOPPED', 'DEPARTING']);

const trainRuns = new Map();
const trainRunStates = new Map();

/**
 * 運行（TRAIN_RUN）を登録する。
 * @param {TrainRun} trainRun
 * @returns {TrainRun}
 */
export function registerTrainRun(trainRun) {
  if (typeof trainRun?.trainRunId !== 'number' || typeof trainRun?.trainId !== 'number') {
    throw new Error('trainRunId と trainId は数値である必要があります');
  }
  const stored = { ...trainRun };
  trainRuns.set(stored.trainRunId, stored);
  return stored;
}

/** @param {number} trainRunId */
export function getTrainRun(trainRunId) {
  return trainRuns.get(trainRunId);
}

export function listTrainRuns() {
  return Array.from(trainRuns.values());
}

/** @param {number} trainRunId */
export function getTrainRunState(trainRunId) {
  return trainRunStates.get(trainRunId);
}

export function listTrainRunStates() {
  return Array.from(trainRunStates.values());
}

/** テスト等でストアを初期化するためのユーティリティ。 */
export function resetTrainRunStore() {
  trainRuns.clear();
  trainRunStates.clear();
}

/**
 * 指定駅が、指定列車にとって停車駅（stopType === 'STOP'）かどうかを判定する。
 * @param {TrainStop[]} trainStops
 * @param {number} trainId
 * @param {number} stationId
 * @returns {boolean}
 */
export function isStopStation(trainStops, trainId, stationId) {
  return trainStops.some(
    (stop) => stop.trainId === trainId && stop.stationId === stationId && stop.stopType === 'STOP',
  );
}

/**
 * 現在駅から、次の停車駅・次の通過駅を算出する。
 * `TRAIN_STOP` は通過駅も含めて `sequence` で順序管理されているため、
 * 現在駅より後ろのレコードの中から、停車駅（STOP）・通過駅（PASS）それぞれ最初の1件を返す。
 *
 * @param {TrainStop[]} trainStops - 対象列車の経由駅（順不同で可。他列車のレコードが混在していてもよい）
 * @param {number} trainId
 * @param {number} currentStationId - 現在駅（走行中・接近中は直前に発車した駅）
 * @returns {{ nextStopStationId?: number, nextPassStationId?: number }}
 */
export function computeNextStops(trainStops, trainId, currentStationId) {
  const stops = trainStops
    .filter((stop) => stop.trainId === trainId)
    .sort((a, b) => a.sequence - b.sequence);

  const currentIndex = stops.findIndex((stop) => stop.stationId === currentStationId);
  if (currentIndex === -1) {
    throw new Error(
      `列車(trainId=${trainId})の経由駅に現在駅(stationId=${currentStationId})が見つかりません`,
    );
  }

  const upcoming = stops.slice(currentIndex + 1);
  const nextStop = upcoming.find((stop) => stop.stopType === 'STOP');
  const nextPass = upcoming.find((stop) => stop.stopType === 'PASS');

  return {
    nextStopStationId: nextStop?.stationId,
    nextPassStationId: nextPass?.stationId,
  };
}

/**
 * 列車状態設定の妥当性を検証する。
 * 参照: docs/02_screen_design.md §5.1「『停車中』『発車中』は、現在地が停車駅でなければ設定不可」
 *
 * @param {TrainStatus} trainStatus
 * @param {TrainStop[]} trainStops
 * @param {number} trainId
 * @param {number} [currentStationId]
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateTrainStatus(trainStatus, trainStops, trainId, currentStationId) {
  if (!TRAIN_STATUSES.includes(trainStatus)) {
    return { valid: false, reason: `未定義の列車状態です: ${trainStatus}` };
  }
  if (STATUSES_REQUIRING_STOP_STATION.has(trainStatus)) {
    if (currentStationId == null || !isStopStation(trainStops, trainId, currentStationId)) {
      return {
        valid: false,
        reason: '「停車中」「発車中」は現在地が停車駅（stopType=STOP）でなければ設定できません',
      };
    }
  }
  return { valid: true };
}

/**
 * `TRAIN_RUN_STATE` を上書き更新する（履歴を持たない、1運行1レコード）。
 * 状態の妥当性検証を行い、現在駅が指定されていれば次の停車駅・次の通過駅を自動算出して保存する。
 *
 * @param {number} trainRunId
 * @param {Partial<TrainRunState> & { trainId?: number }} patch - 差分。`trainId` は次駅算出用で、状態には保存しない
 * @param {TrainStop[]} trainStops - 次駅算出・妥当性検証に使用する経由駅データ
 * @param {() => string} [now] - 更新時刻の生成関数（テスト用に差し替え可能）
 * @returns {TrainRunState}
 */
export function updateTrainRunState(
  trainRunId,
  patch,
  trainStops,
  now = () => new Date().toISOString(),
) {
  const trainRun = trainRuns.get(trainRunId);
  if (!trainRun) {
    throw new Error(`未登録の運行です: trainRunId=${trainRunId}`);
  }

  const { trainId: patchTrainId, ...statePatch } = patch;
  const trainId = patchTrainId ?? trainRun.trainId;
  const previous = trainRunStates.get(trainRunId);
  const merged = { ...previous, ...statePatch, trainRunId };

  const validation = validateTrainStatus(
    merged.trainStatus,
    trainStops,
    trainId,
    merged.currentStationId,
  );
  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  if (merged.currentStationId != null) {
    const { nextStopStationId, nextPassStationId } = computeNextStops(
      trainStops,
      trainId,
      merged.currentStationId,
    );
    merged.nextStopStationId = nextStopStationId;
    merged.nextPassStationId = nextPassStationId;
  }

  merged.updatedAt = now();

  trainRunStates.set(trainRunId, merged);
  return merged;
}
