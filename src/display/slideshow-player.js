// D-01案内表示画面のスライドショー再生エンジン
// `SLIDESHOW_ITEM`を表示順に評価し、`SLIDESHOW_ITEM_STATUS`に現在の列車状態を含み、
// かつ表示データが揃っているスライドのみを、指定秒数・ループ設定に従って自動再生する。
// 参照: docs/01_requirements.md FR-21, FR-22, §7.2（SLIDESHOW/SLIDESHOW_ITEM/SLIDESHOW_ITEM_STATUS）
// docs/02_screen_design.md §5.7（D-01 表示ロジック）
//
// スライドの実際の描画（`SCREEN_LAYOUT`の反映や切替効果のCSS適用）は本エンジンのスコープ外とし、
// `onChange`フックへ委譲する（`src/display/template-renderer.js`と同様の設計方針）。

/** @typedef {import('../types/screen.js').Slideshow} Slideshow */
/** @typedef {import('../types/screen.js').SlideshowItem} SlideshowItem */
/** @typedef {import('../types/screen.js').SlideshowItemStatus} SlideshowItemStatus */
/** @typedef {import('../types/train.js').TrainStatus} TrainStatus */

/**
 * `slideshowItemId`ごとに対象列車状態のSetをまとめる。
 * @param {SlideshowItemStatus[]} itemStatuses
 * @returns {Map<number, Set<TrainStatus>>}
 */
function groupStatusesByItem(itemStatuses) {
  const statusesByItem = new Map();
  for (const { slideshowItemId, trainStatus } of itemStatuses) {
    if (!statusesByItem.has(slideshowItemId)) statusesByItem.set(slideshowItemId, new Set());
    statusesByItem.get(slideshowItemId).add(trainStatus);
  }
  return statusesByItem;
}

/**
 * 現在の列車状態・表示データの有無をもとに、再生対象となるスライドを表示順に抽出する。
 * FR-22「現在の列車状態が対象外のスライドはスキップする」、
 * 受け入れ条件「`skip_if_no_data`が真の場合、表示データが無いスライドをスキップする」に対応。
 *
 * @param {Object} params
 * @param {SlideshowItem[]} params.items - 対象スライドショーの`SLIDESHOW_ITEM`一覧
 * @param {SlideshowItemStatus[]} params.itemStatuses - `SLIDESHOW_ITEM_STATUS`一覧（他スライドショー分が混在していてもよい）
 * @param {TrainStatus} params.trainStatus - 現在の列車状態
 * @param {(item: SlideshowItem) => boolean} [params.hasData] - スライドに表示すべきデータがあるか。省略時は常にありとみなす
 * @returns {SlideshowItem[]} `displayOrder`昇順の再生対象スライド
 */
export function getEligibleItems({ items, itemStatuses, trainStatus, hasData = () => true }) {
  const statusesByItem = groupStatusesByItem(itemStatuses);
  return items
    .filter((item) => statusesByItem.get(item.slideshowItemId)?.has(trainStatus))
    .filter((item) => !item.skipIfNoData || hasData(item))
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * スライドの表示秒数(ミリ秒)を求める。`durationSec`未指定時はスライドショーの既定秒数を使う。
 * @param {SlideshowItem} item
 * @param {Slideshow} slideshow
 * @returns {number}
 */
export function resolveDurationMs(item, slideshow) {
  const seconds = item.durationSec ?? slideshow.defaultDurationSec;
  return seconds * 1000;
}

/**
 * @typedef {Object} SlideshowPlayerState
 * @property {SlideshowItem[]} eligibleItems - 現在の列車状態・データ状況で再生対象となっているスライド一覧（表示順）
 * @property {number} currentIndex - `eligibleItems`内の再生中インデックス（対象が0件の場合は-1）
 * @property {SlideshowItem | undefined} currentItem - 現在表示中のスライド
 * @property {boolean} playing - 自動送りタイマーが動作中かどうか
 */

/**
 * スライドショー再生エンジンを生成する。
 *
 * 表示順・表示秒数（`resolveDurationMs`）に従って自動送りし、対象外になったスライドは
 * `getEligibleItems`でスキップする。`loopEnabled`が偽の場合は最後のスライドで再生を終える。
 * `setTrainStatus`で列車状態の変更を受けると、現在の再生を打ち切り、再評価した対象の先頭から
 * 再生し直す（docs/02_screen_design.md §5.7 表示ロジック5.「状態変更を受信したら、現在のスライドの
 * 再生を打ち切り、再評価した先頭から再生する」）。
 *
 * @param {Object} options
 * @param {Slideshow} options.slideshow
 * @param {SlideshowItem[]} options.items
 * @param {SlideshowItemStatus[]} options.itemStatuses
 * @param {(item: SlideshowItem) => boolean} [options.hasData] - スライドに表示すべきデータがあるかどうか
 * @param {(state: SlideshowPlayerState) => void} [options.onChange] - 表示スライドが切り替わるたびに呼ばれる
 * @param {typeof setTimeout} [options.setTimeoutFn] - タイマー生成関数（テスト用に差し替え可能）
 * @param {typeof clearTimeout} [options.clearTimeoutFn] - タイマー解除関数（テスト用に差し替え可能）
 * @returns {{
 *   start: (trainStatus: TrainStatus) => void,
 *   stop: () => void,
 *   setTrainStatus: (trainStatus: TrainStatus) => void,
 *   refresh: () => void,
 *   getState: () => SlideshowPlayerState,
 * }}
 */
export function createSlideshowPlayer({
  slideshow,
  items,
  itemStatuses,
  hasData = () => true,
  onChange = () => {},
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
}) {
  let trainStatus;
  let eligibleItems = [];
  let currentIndex = -1;
  let playing = false;
  let timerHandle = null;

  function getState() {
    return {
      eligibleItems,
      currentIndex,
      currentItem: currentIndex >= 0 ? eligibleItems[currentIndex] : undefined,
      playing,
    };
  }

  function clearTimer() {
    if (timerHandle !== null) {
      clearTimeoutFn(timerHandle);
      timerHandle = null;
    }
  }

  function showCurrentAndSchedule() {
    onChange(getState());
    clearTimer();
    const currentItem = eligibleItems[currentIndex];
    if (!playing || !currentItem) return;
    timerHandle = setTimeoutFn(() => advance(), resolveDurationMs(currentItem, slideshow));
  }

  function advance() {
    timerHandle = null;
    if (eligibleItems.length === 0) return;

    const isLast = currentIndex >= eligibleItems.length - 1;
    if (isLast && !slideshow.loopEnabled) {
      playing = false;
      onChange(getState());
      return;
    }
    currentIndex = isLast ? 0 : currentIndex + 1;
    showCurrentAndSchedule();
  }

  function resetToEligibleFirst() {
    eligibleItems = getEligibleItems({ items, itemStatuses, trainStatus, hasData });
    currentIndex = eligibleItems.length > 0 ? 0 : -1;
  }

  /** 再生を開始する。@param {TrainStatus} initialTrainStatus */
  function start(initialTrainStatus) {
    trainStatus = initialTrainStatus;
    playing = true;
    resetToEligibleFirst();
    showCurrentAndSchedule();
  }

  /** 自動送りを停止する（現在のスライドはそのまま表示され続ける）。 */
  function stop() {
    playing = false;
    clearTimer();
  }

  /**
   * 列車状態の変更を反映し、再生対象を再評価した先頭から再生し直す。
   * @param {TrainStatus} newTrainStatus
   */
  function setTrainStatus(newTrainStatus) {
    trainStatus = newTrainStatus;
    resetToEligibleFirst();
    showCurrentAndSchedule();
  }

  /** 列車状態は変えずに、`hasData`の判定結果の変化などを反映して再評価する。 */
  function refresh() {
    resetToEligibleFirst();
    showCurrentAndSchedule();
  }

  return { start, stop, setTrainStatus, refresh, getState };
}
