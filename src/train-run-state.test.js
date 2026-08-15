import { afterEach, describe, expect, it } from 'vitest';
import {
  computeNextStops,
  getTrainRun,
  getTrainRunState,
  isStopStation,
  listTrainRuns,
  listTrainRunStates,
  registerTrainRun,
  resetTrainRunStore,
  TRAIN_STATUSES,
  updateTrainRunState,
  validateTrainStatus,
} from './train-run-state.js';

// trainId=1: 全駅停車（4駅とも stopType='STOP'）
// trainId=2: 2駅目（stationId=20）が通過駅（stopType='PASS'）
const trainStops = [
  { trainStopId: 1, trainId: 1, lineId: 1, stationId: 10, sequence: 1, stopType: 'STOP' },
  { trainStopId: 2, trainId: 1, lineId: 1, stationId: 11, sequence: 2, stopType: 'STOP' },
  { trainStopId: 3, trainId: 1, lineId: 1, stationId: 12, sequence: 3, stopType: 'STOP' },
  { trainStopId: 4, trainId: 1, lineId: 1, stationId: 13, sequence: 4, stopType: 'STOP' },
  { trainStopId: 5, trainId: 2, lineId: 1, stationId: 10, sequence: 1, stopType: 'STOP' },
  { trainStopId: 6, trainId: 2, lineId: 1, stationId: 20, sequence: 2, stopType: 'PASS' },
  { trainStopId: 7, trainId: 2, lineId: 1, stationId: 12, sequence: 3, stopType: 'STOP' },
  { trainStopId: 8, trainId: 2, lineId: 1, stationId: 13, sequence: 4, stopType: 'STOP' },
];

afterEach(() => {
  resetTrainRunStore();
});

describe('registerTrainRun / getTrainRun / listTrainRuns', () => {
  it('登録した運行を取得できる', () => {
    const trainRun = registerTrainRun({
      trainRunId: 100,
      trainId: 1,
      formationId: 1,
      serviceDate: '2026-08-14',
      runStatus: '通常',
    });

    expect(getTrainRun(100)).toEqual(trainRun);
    expect(listTrainRuns()).toEqual([trainRun]);
  });

  it('trainRunId・trainIdが数値でない場合はエラーになる', () => {
    expect(() => registerTrainRun({ trainRunId: '100', trainId: 1 })).toThrow();
    expect(() => registerTrainRun({ trainRunId: 100 })).toThrow();
  });
});

describe('isStopStation', () => {
  it('停車駅であればtrueを返す', () => {
    expect(isStopStation(trainStops, 2, 10)).toBe(true);
  });

  it('通過駅であればfalseを返す', () => {
    expect(isStopStation(trainStops, 2, 20)).toBe(false);
  });

  it('経由しない駅であればfalseを返す', () => {
    expect(isStopStation(trainStops, 2, 999)).toBe(false);
  });
});

describe('computeNextStops', () => {
  it('全駅停車列車では、次の停車駅=直後の駅、次の通過駅=なし', () => {
    expect(computeNextStops(trainStops, 1, 10)).toEqual({
      nextStopStationId: 11,
      nextPassStationId: undefined,
    });
  });

  it('通過駅を挟む場合、次の停車駅は通過駅を飛ばして算出される', () => {
    expect(computeNextStops(trainStops, 2, 10)).toEqual({
      nextStopStationId: 12,
      nextPassStationId: 20,
    });
  });

  it('通過駅通過後は、次の通過駅がなくなる', () => {
    expect(computeNextStops(trainStops, 2, 20)).toEqual({
      nextStopStationId: 12,
      nextPassStationId: undefined,
    });
  });

  it('終着駅では、次の停車駅・通過駅ともになし', () => {
    expect(computeNextStops(trainStops, 1, 13)).toEqual({
      nextStopStationId: undefined,
      nextPassStationId: undefined,
    });
  });

  it('現在駅が経由駅に含まれない場合はエラーになる', () => {
    expect(() => computeNextStops(trainStops, 1, 999)).toThrow();
  });
});

describe('validateTrainStatus', () => {
  it('未定義の状態はエラーになる', () => {
    expect(validateTrainStatus('UNKNOWN', trainStops, 1, 10)).toEqual({
      valid: false,
      reason: expect.any(String),
    });
  });

  it.each(['RUNNING', 'APPROACHING'])('%sは現在駅が通過駅でも許可される', (status) => {
    expect(validateTrainStatus(status, trainStops, 2, 20)).toEqual({ valid: true });
  });

  it.each(['STOPPED', 'DEPARTING'])('%sは現在駅が停車駅であれば許可される', (status) => {
    expect(validateTrainStatus(status, trainStops, 1, 10)).toEqual({ valid: true });
  });

  it.each(['STOPPED', 'DEPARTING'])('%sは現在駅が通過駅の場合は許可されない', (status) => {
    expect(validateTrainStatus(status, trainStops, 2, 20)).toEqual({
      valid: false,
      reason: expect.any(String),
    });
  });

  it.each(['STOPPED', 'DEPARTING'])('%sは現在駅が未指定の場合は許可されない', (status) => {
    expect(validateTrainStatus(status, trainStops, 1, undefined)).toEqual({
      valid: false,
      reason: expect.any(String),
    });
  });

  it('全ての状態区分を網羅している', () => {
    expect(TRAIN_STATUSES).toEqual(['RUNNING', 'APPROACHING', 'STOPPED', 'DEPARTING']);
  });
});

describe('updateTrainRunState', () => {
  function setup() {
    return registerTrainRun({
      trainRunId: 200,
      trainId: 1,
      formationId: 1,
      serviceDate: '2026-08-14',
      runStatus: '通常',
    });
  }

  it('未登録の運行を更新しようとするとエラーになる', () => {
    expect(() => updateTrainRunState(999, { trainStatus: 'RUNNING' }, trainStops)).toThrow();
  });

  it('現在駅から次の停車駅・通過駅を自動算出して保存する', () => {
    setup();
    const fixedNow = () => '2026-08-14T10:00:00+09:00';

    const state = updateTrainRunState(
      200,
      { trainStatus: 'APPROACHING', currentLineId: 1, currentStationId: 10 },
      trainStops,
      fixedNow,
    );

    expect(state).toEqual({
      trainRunId: 200,
      trainStatus: 'APPROACHING',
      currentLineId: 1,
      currentStationId: 10,
      nextStopStationId: 11,
      nextPassStationId: undefined,
      updatedAt: '2026-08-14T10:00:00+09:00',
    });
    expect(getTrainRunState(200)).toEqual(state);
    expect(listTrainRunStates()).toEqual([state]);
  });

  it('停車中は停車駅でなければ設定できず、ストアは変更されない', () => {
    setup();
    updateTrainRunState(
      200,
      { trainStatus: 'RUNNING', currentLineId: 1, currentStationId: 10 },
      trainStops,
      () => 't1',
    );

    expect(() =>
      updateTrainRunState(
        200,
        { trainStatus: 'STOPPED', currentStationId: 999 },
        trainStops,
        () => 't2',
      ),
    ).toThrow();

    // 直前の正常な状態が保持されていること（上書きされていないこと）
    expect(getTrainRunState(200)).toMatchObject({ trainStatus: 'RUNNING', currentStationId: 10 });
  });

  it('2度目の更新は履歴を残さず1レコードを上書きする', () => {
    setup();
    updateTrainRunState(
      200,
      { trainStatus: 'RUNNING', currentLineId: 1, currentStationId: 10 },
      trainStops,
      () => 't1',
    );
    updateTrainRunState(
      200,
      { trainStatus: 'STOPPED', currentStationId: 11 },
      trainStops,
      () => 't2',
    );

    expect(listTrainRunStates()).toHaveLength(1);
    expect(getTrainRunState(200)).toMatchObject({
      trainStatus: 'STOPPED',
      currentStationId: 11,
      nextStopStationId: 12,
      updatedAt: 't2',
    });
  });

  it('trainIdを明示指定した場合はそちらの経由駅情報を用いる（直通運転想定）', () => {
    setup();
    const state = updateTrainRunState(
      200,
      { trainId: 2, trainStatus: 'APPROACHING', currentLineId: 1, currentStationId: 10 },
      trainStops,
      () => 't1',
    );

    // trainId=2の経由駅では次の通過駅(20)が算出される一方、状態には保存されない
    expect(state.nextPassStationId).toBe(20);
    expect(state).not.toHaveProperty('trainId');
  });

  it('currentLineIdが未設定の場合はエラーになり、ストアは変更されない', () => {
    setup();
    expect(() =>
      updateTrainRunState(
        200,
        { trainStatus: 'RUNNING', currentStationId: 10 },
        trainStops,
        () => 't1',
      ),
    ).toThrow('currentLineId');
    expect(getTrainRunState(200)).toBeUndefined();
  });

  it.each([-0.1, 1.1, Number.NaN])(
    'progressRatioが0〜1の範囲外（%s）の場合はエラーになる',
    (progressRatio) => {
      setup();
      expect(() =>
        updateTrainRunState(
          200,
          { trainStatus: 'RUNNING', currentLineId: 1, currentStationId: 10, progressRatio },
          trainStops,
          () => 't1',
        ),
      ).toThrow('progressRatio');
    },
  );

  it('progressRatioが0〜1の範囲内であれば許可される', () => {
    setup();
    const state = updateTrainRunState(
      200,
      { trainStatus: 'RUNNING', currentLineId: 1, currentStationId: 10, progressRatio: 0.5 },
      trainStops,
      () => 't1',
    );
    expect(state.progressRatio).toBe(0.5);
  });

  it.each([-1, 1000])('delayMinutesが0〜999の範囲外（%s）の場合はエラーになる', (delayMinutes) => {
    setup();
    expect(() =>
      updateTrainRunState(
        200,
        { trainStatus: 'RUNNING', currentLineId: 1, currentStationId: 10, delayMinutes },
        trainStops,
        () => 't1',
      ),
    ).toThrow('delayMinutes');
  });

  it('currentStationIdが明示的にnullへ更新された場合、次駅情報を持ち越さない', () => {
    setup();
    updateTrainRunState(
      200,
      { trainStatus: 'RUNNING', currentLineId: 1, currentStationId: 10 },
      trainStops,
      () => 't1',
    );
    const state = updateTrainRunState(
      200,
      { trainStatus: 'RUNNING', currentStationId: null },
      trainStops,
      () => 't2',
    );

    expect(state.nextStopStationId).toBeUndefined();
    expect(state.nextPassStationId).toBeUndefined();
  });
});
