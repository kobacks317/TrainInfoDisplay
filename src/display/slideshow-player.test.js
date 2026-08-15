import { describe, expect, it, vi } from 'vitest';
import { createSlideshowPlayer, getEligibleItems, resolveDurationMs } from './slideshow-player.js';
import { slideshowItemStatuses, slideshowItems, slideshows } from '../mock-data/index.js';

const slideshow1 = slideshows.find((s) => s.slideshowId === 1); // loopEnabled: true
const slideshow2 = slideshows.find((s) => s.slideshowId === 2); // loopEnabled: false
const items1 = slideshowItems.filter((i) => i.slideshowId === 1);
const items2 = slideshowItems.filter((i) => i.slideshowId === 2);

/** テスト用のスライド定義（表示順・秒数・状態・skipIfNoDataを直接制御する）。 */
function makeItem(overrides) {
  return {
    slideshowItemId: 1,
    slideshowId: 1,
    layoutId: 1,
    displayOrder: 1,
    durationSec: null,
    transition: 'none',
    skipIfNoData: false,
    ...overrides,
  };
}

function makeStatus(slideshowItemId, trainStatus) {
  return { itemStatusId: `${slideshowItemId}-${trainStatus}`, slideshowItemId, trainStatus };
}

describe('getEligibleItems', () => {
  it('モックデータ: RUNNING時は走行・接近向けと常時表示のスライドのみを表示順で返す', () => {
    const eligible = getEligibleItems({
      items: items1,
      itemStatuses: slideshowItemStatuses,
      trainStatus: 'RUNNING',
    });
    expect(eligible.map((i) => i.slideshowItemId)).toEqual([1, 3, 4]);
  });

  it('モックデータ: STOPPED時は停車向けと常時表示のスライドのみを表示順で返す', () => {
    const eligible = getEligibleItems({
      items: items1,
      itemStatuses: slideshowItemStatuses,
      trainStatus: 'STOPPED',
    });
    expect(eligible.map((i) => i.slideshowItemId)).toEqual([1, 2, 4]);
  });

  it('現在の列車状態が対象外のスライドは除外する', () => {
    const items = [
      makeItem({ slideshowItemId: 1, displayOrder: 1 }),
      makeItem({ slideshowItemId: 2, displayOrder: 2 }),
    ];
    const itemStatuses = [makeStatus(1, 'RUNNING'), makeStatus(2, 'STOPPED')];

    expect(
      getEligibleItems({ items, itemStatuses, trainStatus: 'RUNNING' }).map((i) => i.slideshowItemId),
    ).toEqual([1]);
  });

  it('displayOrderの昇順に並べ替える（入力順に依存しない）', () => {
    const items = [
      makeItem({ slideshowItemId: 1, displayOrder: 3 }),
      makeItem({ slideshowItemId: 2, displayOrder: 1 }),
      makeItem({ slideshowItemId: 3, displayOrder: 2 }),
    ];
    const itemStatuses = items.map((i) => makeStatus(i.slideshowItemId, 'RUNNING'));

    expect(
      getEligibleItems({ items, itemStatuses, trainStatus: 'RUNNING' }).map((i) => i.slideshowItemId),
    ).toEqual([2, 3, 1]);
  });

  it('skipIfNoDataが真でhasDataが偽を返すスライドは除外する', () => {
    const items = [
      makeItem({ slideshowItemId: 1, displayOrder: 1, skipIfNoData: true }),
      makeItem({ slideshowItemId: 2, displayOrder: 2, skipIfNoData: false }),
    ];
    const itemStatuses = items.map((i) => makeStatus(i.slideshowItemId, 'RUNNING'));
    const hasData = (item) => item.slideshowItemId !== 1;

    expect(
      getEligibleItems({ items, itemStatuses, trainStatus: 'RUNNING', hasData }).map(
        (i) => i.slideshowItemId,
      ),
    ).toEqual([2]);
  });

  it('hasData未指定時は常にデータありとみなす', () => {
    const items = [makeItem({ slideshowItemId: 1, displayOrder: 1, skipIfNoData: true })];
    const itemStatuses = [makeStatus(1, 'RUNNING')];

    expect(
      getEligibleItems({ items, itemStatuses, trainStatus: 'RUNNING' }).map((i) => i.slideshowItemId),
    ).toEqual([1]);
  });
});

describe('resolveDurationMs', () => {
  it('durationSecが指定されていればそれをミリ秒に変換する', () => {
    expect(resolveDurationMs(makeItem({ durationSec: 10 }), slideshow1)).toBe(10_000);
  });

  it('durationSec未指定時はスライドショーの既定秒数を使う', () => {
    expect(resolveDurationMs(makeItem({ durationSec: null }), slideshow1)).toBe(
      slideshow1.defaultDurationSec * 1000,
    );
  });
});

/** `setTimeoutFn`/`clearTimeoutFn`をモックし、タイマーを手動で進められるプレイヤーを作る。 */
function createTestPlayer(options) {
  let nextHandle = 1;
  const scheduled = new Map();
  const setTimeoutFn = vi.fn((fn, ms) => {
    const handle = nextHandle++;
    scheduled.set(handle, { fn, ms });
    return handle;
  });
  const clearTimeoutFn = vi.fn((handle) => {
    scheduled.delete(handle);
  });
  const onChange = vi.fn();

  const player = createSlideshowPlayer({ onChange, setTimeoutFn, clearTimeoutFn, ...options });

  return {
    player,
    onChange,
    setTimeoutFn,
    clearTimeoutFn,
    /** 現在スケジュールされている唯一のタイマーを実行する。 */
    tick() {
      expect(scheduled.size).toBe(1);
      const [[handle, { fn }]] = scheduled;
      scheduled.delete(handle);
      fn();
    },
    pendingCount() {
      return scheduled.size;
    },
    pendingMs() {
      const [[, { ms }]] = scheduled;
      return ms;
    },
  };
}

describe('createSlideshowPlayer', () => {
  it('start時、対象状態の先頭スライドを表示し、表示秒数でタイマーを予約する', () => {
    const { player, onChange, pendingMs } = createTestPlayer({
      slideshow: slideshow1,
      items: items1,
      itemStatuses: slideshowItemStatuses,
    });

    player.start('RUNNING');

    expect(player.getState().currentItem.slideshowItemId).toBe(1);
    expect(player.getState().eligibleItems.map((i) => i.slideshowItemId)).toEqual([1, 3, 4]);
    expect(onChange).toHaveBeenCalledTimes(1);
    // item1のdurationSecはnullのため、スライドショーの既定秒数(8秒)が使われる
    expect(pendingMs()).toBe(8000);
  });

  it('表示秒数経過ごとに表示順で自動送りする', () => {
    const { player, tick } = createTestPlayer({
      slideshow: slideshow1,
      items: items1,
      itemStatuses: slideshowItemStatuses,
    });

    player.start('RUNNING');
    expect(player.getState().currentItem.slideshowItemId).toBe(1);

    tick();
    expect(player.getState().currentItem.slideshowItemId).toBe(3);

    tick();
    expect(player.getState().currentItem.slideshowItemId).toBe(4);
  });

  it('loopEnabled=trueの場合、最後のスライドの後は先頭へ戻る', () => {
    const { player, tick } = createTestPlayer({
      slideshow: slideshow1,
      items: items1,
      itemStatuses: slideshowItemStatuses,
    });

    player.start('RUNNING');
    tick(); // -> 3
    tick(); // -> 4 (最後)
    tick(); // -> 先頭(1)へループ

    expect(player.getState().currentItem.slideshowItemId).toBe(1);
    expect(player.getState().playing).toBe(true);
  });

  it('loopEnabled=falseの場合、最後のスライドで再生を終える', () => {
    const { player, tick, pendingCount } = createTestPlayer({
      slideshow: slideshow2,
      items: items2,
      itemStatuses: slideshowItemStatuses,
    });

    player.start('RUNNING');
    expect(player.getState().currentItem.slideshowItemId).toBe(5);

    tick(); // -> 6 (最後、loopEnabled=false)
    expect(player.getState().currentItem.slideshowItemId).toBe(6);
    expect(pendingCount()).toBe(1);

    tick(); // 最後のスライド終了 → 再生停止（表示は最後のスライドのまま）
    expect(player.getState().currentItem.slideshowItemId).toBe(6);
    expect(player.getState().playing).toBe(false);
    expect(pendingCount()).toBe(0);
  });

  it('skip_if_no_dataが真のスライドは、データが無い間スキップされる', () => {
    let hasNotice = false;
    const items = [
      makeItem({ slideshowItemId: 1, displayOrder: 1, skipIfNoData: false, durationSec: 5 }),
      makeItem({ slideshowItemId: 2, displayOrder: 2, skipIfNoData: true, durationSec: 5 }),
    ];
    const itemStatuses = items.map((i) => makeStatus(i.slideshowItemId, 'RUNNING'));
    const { player, tick } = createTestPlayer({
      slideshow: { defaultDurationSec: 5, loopEnabled: true },
      items,
      itemStatuses,
      hasData: (item) => (item.slideshowItemId === 2 ? hasNotice : true),
    });

    player.start('RUNNING');
    expect(player.getState().eligibleItems.map((i) => i.slideshowItemId)).toEqual([1]);

    tick(); // item1終了 → item2はskipIfNoData=trueかつデータ無しのため飛ばし、ループして再びitem1
    expect(player.getState().currentItem.slideshowItemId).toBe(1);

    hasNotice = true;
    player.refresh();
    expect(player.getState().eligibleItems.map((i) => i.slideshowItemId)).toEqual([1, 2]);
  });

  it('現在の列車状態が対象外のスライドはスキップして表示順を維持する', () => {
    const items = [
      makeItem({ slideshowItemId: 1, displayOrder: 1, durationSec: 5 }),
      makeItem({ slideshowItemId: 2, displayOrder: 2, durationSec: 5 }),
      makeItem({ slideshowItemId: 3, displayOrder: 3, durationSec: 5 }),
    ];
    const itemStatuses = [
      makeStatus(1, 'RUNNING'),
      makeStatus(2, 'STOPPED'), // RUNNING中はスキップされる
      makeStatus(3, 'RUNNING'),
    ];
    const { player, tick } = createTestPlayer({
      slideshow: { defaultDurationSec: 5, loopEnabled: true },
      items,
      itemStatuses,
    });

    player.start('RUNNING');
    expect(player.getState().currentItem.slideshowItemId).toBe(1);
    tick();
    expect(player.getState().currentItem.slideshowItemId).toBe(3);
  });

  it('setTrainStatusで状態が変わると、再生中のスライドを打ち切り再評価した先頭から再生し直す', () => {
    const { player, onChange, clearTimeoutFn, pendingMs } = createTestPlayer({
      slideshow: slideshow1,
      items: items1,
      itemStatuses: slideshowItemStatuses,
    });

    player.start('RUNNING');
    onChange.mockClear();

    player.setTrainStatus('STOPPED');

    expect(clearTimeoutFn).toHaveBeenCalled();
    expect(player.getState().eligibleItems.map((i) => i.slideshowItemId)).toEqual([1, 2, 4]);
    expect(player.getState().currentItem.slideshowItemId).toBe(1);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(pendingMs()).toBe(8000);
  });

  it('stopで自動送りタイマーを停止する（表示中のスライドは維持）', () => {
    const { player, clearTimeoutFn, pendingCount } = createTestPlayer({
      slideshow: slideshow1,
      items: items1,
      itemStatuses: slideshowItemStatuses,
    });

    player.start('RUNNING');
    player.stop();

    expect(clearTimeoutFn).toHaveBeenCalled();
    expect(pendingCount()).toBe(0);
    expect(player.getState().playing).toBe(false);
    expect(player.getState().currentItem.slideshowItemId).toBe(1);
  });

  it('対象スライドが0件の場合、currentItemはundefinedになりタイマーは予約されない', () => {
    const items = [makeItem({ slideshowItemId: 1, displayOrder: 1 })];
    const itemStatuses = [makeStatus(1, 'STOPPED')];
    const { player, pendingCount } = createTestPlayer({
      slideshow: { defaultDurationSec: 5, loopEnabled: true },
      items,
      itemStatuses,
    });

    player.start('RUNNING');

    expect(player.getState().eligibleItems).toEqual([]);
    expect(player.getState().currentItem).toBeUndefined();
    expect(pendingCount()).toBe(0);
  });
});
