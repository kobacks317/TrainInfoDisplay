// モック路線・駅マスタデータの簡易バリデーション
// 参照: docs/01_requirements.md §7.2, src/types/station.js, src/types/common.js

import { describe, expect, it } from 'vitest';
import {
  carFacilities,
  cars,
  formations,
  lineStations,
  lineSymbols,
  lines,
  operators,
  platformFacilities,
  platforms,
  stationNumbers,
  stations,
  trainLineSegments,
  trainStops,
  trainTypes,
  trains,
  transferInfo,
} from './index.js';

/**
 * 各レコードが必須プロパティを備え、型が一致することを検証する。
 * @param {Array<Object>} records
 * @param {Object.<string, 'string'|'number'|'boolean'>} requiredFields
 */
function expectRequiredFields(records, requiredFields) {
  for (const record of records) {
    for (const [field, type] of Object.entries(requiredFields)) {
      expect(record, `record ${JSON.stringify(record)} に ${field} が必要`).toHaveProperty(field);
      expect(typeof record[field], `${field} は ${type} 型である必要がある: ${JSON.stringify(record)}`).toBe(type);
    }
  }
}

/**
 * 一意な主キーを持つことを検証する。
 * @param {Array<Object>} records
 * @param {string} idField
 */
function expectUniquePrimaryKey(records, idField) {
  const ids = records.map((r) => r[idField]);
  expect(new Set(ids).size).toBe(ids.length);
}

/**
 * 外部キーが参照先テーブルの主キーに存在することを検証する。
 * @param {Array<Object>} records
 * @param {string} fkField
 * @param {Array<Object>} targetRecords
 * @param {string} targetIdField
 * @param {boolean} [optional]
 */
function expectForeignKey(records, fkField, targetRecords, targetIdField, optional = false) {
  const targetIds = new Set(targetRecords.map((r) => r[targetIdField]));
  for (const record of records) {
    const value = record[fkField];
    if (optional && (value === undefined || value === null)) continue;
    expect(targetIds.has(value), `${fkField}=${value} が ${targetIdField} に存在しない: ${JSON.stringify(record)}`).toBe(true);
  }
}

describe('OPERATOR', () => {
  it('必須プロパティを備える', () => {
    expectRequiredFields(operators, { operatorId: 'number', operatorCode: 'string', nameTextKeyId: 'number' });
  });

  it('operatorIdが一意である', () => {
    expectUniquePrimaryKey(operators, 'operatorId');
  });

  it('2事業者以上のサンプルを含む', () => {
    expect(operators.length).toBeGreaterThanOrEqual(2);
  });
});

describe('LINE', () => {
  it('必須プロパティを備える', () => {
    expectRequiredFields(lines, {
      lineId: 'number',
      operatorId: 'number',
      lineCode: 'string',
      nameTextKeyId: 'number',
      primaryColor: 'string',
      displayOrder: 'number',
    });
  });

  it('lineIdが一意である', () => {
    expectUniquePrimaryKey(lines, 'lineId');
  });

  it('operatorIdがOPERATORに存在する', () => {
    expectForeignKey(lines, 'operatorId', operators, 'operatorId');
  });

  it('3路線以上のサンプルを含む', () => {
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });
});

describe('LINE_SYMBOL', () => {
  it('必須プロパティを備える', () => {
    expectRequiredFields(lineSymbols, {
      lineSymbolId: 'number',
      lineId: 'number',
      symbolDesignId: 'number',
      symbolText: 'string',
      lineColor: 'string',
      textColor: 'string',
      displayOrder: 'number',
    });
  });

  it('lineIdがLINEに存在する', () => {
    expectForeignKey(lineSymbols, 'lineId', lines, 'lineId');
  });
});

describe('STATION', () => {
  it('必須プロパティを備える', () => {
    expectRequiredFields(stations, { stationId: 'number', stationCode: 'string', nameTextKeyId: 'number' });
  });

  it('stationIdが一意である', () => {
    expectUniquePrimaryKey(stations, 'stationId');
  });
});

describe('LINE_STATION', () => {
  it('必須プロパティを備える', () => {
    expectRequiredFields(lineStations, {
      lineStationId: 'number',
      lineId: 'number',
      stationId: 'number',
      stationOrder: 'number',
      distanceKm: 'number',
      standardMinutesFromPrev: 'number',
    });
  });

  it('lineStationIdが一意である', () => {
    expectUniquePrimaryKey(lineStations, 'lineStationId');
  });

  it('lineId/stationIdがそれぞれLINE/STATIONに存在する', () => {
    expectForeignKey(lineStations, 'lineId', lines, 'lineId');
    expectForeignKey(lineStations, 'stationId', stations, 'stationId');
  });

  it('各路線に4駅以上のサンプルを含む', () => {
    for (const line of lines) {
      const count = lineStations.filter((ls) => ls.lineId === line.lineId).length;
      expect(count, `lineId=${line.lineId} の駅数`).toBeGreaterThanOrEqual(4);
    }
  });

  it('乗換のある駅（複数路線に所属する駅）のサンプルを含む', () => {
    const stationLineCounts = new Map();
    for (const ls of lineStations) {
      stationLineCounts.set(ls.stationId, (stationLineCounts.get(ls.stationId) ?? 0) + 1);
    }
    const transferStations = [...stationLineCounts.values()].filter((count) => count >= 2);
    expect(transferStations.length).toBeGreaterThanOrEqual(1);
  });
});

describe('STATION_NUMBER', () => {
  it('必須プロパティを備える', () => {
    expectRequiredFields(stationNumbers, {
      stationNumberId: 'number',
      lineStationId: 'number',
      symbolDesignId: 'number',
      prefix: 'string',
      number: 'string',
      lineColor: 'string',
      displayOrder: 'number',
    });
  });

  it('lineStationIdがLINE_STATIONに存在する', () => {
    expectForeignKey(stationNumbers, 'lineStationId', lineStations, 'lineStationId');
  });

  it('1駅（1つのlineStationId）が複数番号を持つサンプルを含む（直通対応）', () => {
    const counts = new Map();
    for (const sn of stationNumbers) {
      counts.set(sn.lineStationId, (counts.get(sn.lineStationId) ?? 0) + 1);
    }
    const multiNumberStations = [...counts.values()].filter((count) => count >= 2);
    expect(multiNumberStations.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TRANSFER_INFO', () => {
  it('必須プロパティを備える', () => {
    expectRequiredFields(transferInfo, {
      transferId: 'number',
      lineStationId: 'number',
      displayNameTextKeyId: 'number',
      operatorNameTextKeyId: 'number',
      primaryColor: 'string',
      walkMinutes: 'number',
      displayOrder: 'number',
    });
  });

  it('lineStationIdがLINE_STATIONに存在する', () => {
    expectForeignKey(transferInfo, 'lineStationId', lineStations, 'lineStationId');
  });

  it('toLineIdが設定されている場合はLINEに存在する', () => {
    expectForeignKey(transferInfo, 'toLineId', lines, 'lineId', true);
  });

  it('自社線（toLineIdあり）のサンプルを含む', () => {
    expect(transferInfo.some((t) => t.toLineId !== undefined)).toBe(true);
  });

  it('他社線（toLineId未設定）のサンプルを含む', () => {
    expect(transferInfo.some((t) => t.toLineId === undefined)).toBe(true);
  });
});

describe('PLATFORM', () => {
  it('必須プロパティを備える', () => {
    expectRequiredFields(platforms, {
      platformId: 'number',
      stationId: 'number',
      platformNo: 'string',
      hasPlatformDoor: 'boolean',
      carPositions: 'number',
    });
  });

  it('stationIdがSTATIONに存在する', () => {
    expectForeignKey(platforms, 'stationId', stations, 'stationId');
  });
});

describe('PLATFORM_FACILITY', () => {
  it('必須プロパティを備える', () => {
    expectRequiredFields(platformFacilities, {
      facilityId: 'number',
      platformId: 'number',
      facilityType: 'string',
      labelTextKeyId: 'number',
      posX: 'number',
      posY: 'number',
      barrierFree: 'boolean',
    });
  });

  it('platformIdがPLATFORMに存在する', () => {
    expectForeignKey(platformFacilities, 'platformId', platforms, 'platformId');
  });
});

describe('TRAIN_TYPE', () => {
  it('必須プロパティを備える', () => {
    expectRequiredFields(trainTypes, {
      trainTypeId: 'number',
      operatorId: 'number',
      typeCode: 'string',
      nameTextKeyId: 'number',
      typeColor: 'string',
      textColor: 'string',
      priority: 'number',
    });
  });

  it('trainTypeIdが一意である', () => {
    expectUniquePrimaryKey(trainTypes, 'trainTypeId');
  });

  it('operatorIdがOPERATORに存在する', () => {
    expectForeignKey(trainTypes, 'operatorId', operators, 'operatorId');
  });

  it('3種類以上のサンプルを含み、種別カラーが設定されている', () => {
    expect(trainTypes.length).toBeGreaterThanOrEqual(3);
    for (const trainType of trainTypes) {
      expect(trainType.typeColor, `trainTypeId=${trainType.trainTypeId} のtypeColor`).toMatch(/^#/);
    }
  });
});

describe('TRAIN', () => {
  it('必須プロパティを備える', () => {
    expectRequiredFields(trains, {
      trainId: 'number',
      operatorId: 'number',
      trainTypeId: 'number',
      destinationStationId: 'number',
      trainNumber: 'string',
      operationDays: 'string',
    });
  });

  it('trainIdが一意である', () => {
    expectUniquePrimaryKey(trains, 'trainId');
  });

  it('trainNumberが一意である', () => {
    const numbers = trains.map((t) => t.trainNumber);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it('operatorId/trainTypeId/destinationStationIdがそれぞれ対応するテーブルに存在する', () => {
    expectForeignKey(trains, 'operatorId', operators, 'operatorId');
    expectForeignKey(trains, 'trainTypeId', trainTypes, 'trainTypeId');
    expectForeignKey(trains, 'destinationStationId', stations, 'stationId');
  });
});

describe('TRAIN_LINE_SEGMENT', () => {
  it('必須プロパティを備える', () => {
    expectRequiredFields(trainLineSegments, {
      segmentId: 'number',
      trainId: 'number',
      lineId: 'number',
      trainTypeId: 'number',
      segmentOrder: 'number',
      fromStationId: 'number',
      toStationId: 'number',
      direction: 'string',
      isThroughService: 'boolean',
    });
  });

  it('segmentIdが一意である', () => {
    expectUniquePrimaryKey(trainLineSegments, 'segmentId');
  });

  it('trainId/lineId/trainTypeId/fromStationId/toStationIdがそれぞれ対応するテーブルに存在する', () => {
    expectForeignKey(trainLineSegments, 'trainId', trains, 'trainId');
    expectForeignKey(trainLineSegments, 'lineId', lines, 'lineId');
    expectForeignKey(trainLineSegments, 'trainTypeId', trainTypes, 'trainTypeId');
    expectForeignKey(trainLineSegments, 'fromStationId', stations, 'stationId');
    expectForeignKey(trainLineSegments, 'toStationId', stations, 'stationId');
  });

  it('直通運転しない列車（区間1つ）のサンプルを含む', () => {
    const segmentCounts = new Map();
    for (const segment of trainLineSegments) {
      segmentCounts.set(segment.trainId, (segmentCounts.get(segment.trainId) ?? 0) + 1);
    }
    const nonThroughTrains = [...segmentCounts.values()].filter((count) => count === 1);
    expect(nonThroughTrains.length).toBeGreaterThanOrEqual(1);
  });

  it('2路線以上にまたがる直通列車のサンプルを含む', () => {
    const linesByTrain = new Map();
    for (const segment of trainLineSegments) {
      const lineIds = linesByTrain.get(segment.trainId) ?? new Set();
      lineIds.add(segment.lineId);
      linesByTrain.set(segment.trainId, lineIds);
    }
    const throughTrains = [...linesByTrain.values()].filter((lineIds) => lineIds.size >= 2);
    expect(throughTrains.length).toBeGreaterThanOrEqual(1);
  });

  it('同一列車内で区間ごとに種別が変わるサンプルを含む', () => {
    const typesByTrain = new Map();
    for (const segment of trainLineSegments) {
      const typeIds = typesByTrain.get(segment.trainId) ?? new Set();
      typeIds.add(segment.trainTypeId);
      typesByTrain.set(segment.trainId, typeIds);
    }
    const trainsWithTypeChange = [...typesByTrain.values()].filter((typeIds) => typeIds.size >= 2);
    expect(trainsWithTypeChange.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TRAIN_STOP', () => {
  it('必須プロパティを備える', () => {
    expectRequiredFields(trainStops, {
      trainStopId: 'number',
      trainId: 'number',
      lineId: 'number',
      stationId: 'number',
      sequence: 'number',
      stopType: 'string',
    });
  });

  it('trainStopIdが一意である', () => {
    expectUniquePrimaryKey(trainStops, 'trainStopId');
  });

  it('trainId/lineId/stationId/platformIdがそれぞれ対応するテーブルに存在する', () => {
    expectForeignKey(trainStops, 'trainId', trains, 'trainId');
    expectForeignKey(trainStops, 'lineId', lines, 'lineId');
    expectForeignKey(trainStops, 'stationId', stations, 'stationId');
    expectForeignKey(trainStops, 'platformId', platforms, 'platformId', true);
  });

  it('stopTypeはSTOPまたはPASSのいずれかである', () => {
    for (const stop of trainStops) {
      expect(['STOP', 'PASS']).toContain(stop.stopType);
    }
  });

  it("stop_type='PASS'（通過駅）のサンプルを含む", () => {
    expect(trainStops.some((stop) => stop.stopType === 'PASS')).toBe(true);
  });

  it('列車ごとにsequenceが重複なく連番である', () => {
    const stopsByTrain = new Map();
    for (const stop of trainStops) {
      const stops = stopsByTrain.get(stop.trainId) ?? [];
      stops.push(stop);
      stopsByTrain.set(stop.trainId, stops);
    }
    for (const [trainId, stops] of stopsByTrain) {
      const sequences = stops.map((s) => s.sequence).sort((a, b) => a - b);
      expect(sequences, `trainId=${trainId} のsequence`).toEqual(stops.map((_, i) => i + 1));
    }
  });
});

describe('FORMATION', () => {
  it('必須プロパティを備える', () => {
    expectRequiredFields(formations, {
      formationId: 'number',
      formationCode: 'string',
      carCount: 'number',
    });
  });

  it('formationIdが一意である', () => {
    expectUniquePrimaryKey(formations, 'formationId');
  });

  it('formationCodeが一意である', () => {
    const codes = formations.map((f) => f.formationCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('両数の異なる編成を2種類以上含む', () => {
    const carCounts = new Set(formations.map((f) => f.carCount));
    expect(formations.length).toBeGreaterThanOrEqual(2);
    expect(carCounts.size).toBeGreaterThanOrEqual(2);
  });
});

describe('CAR', () => {
  it('必須プロパティを備える', () => {
    expectRequiredFields(cars, {
      carId: 'number',
      formationId: 'number',
      carNo: 'number',
      sequence: 'number',
      doorCount: 'number',
      hasPrioritySeat: 'boolean',
      isWomenOnly: 'boolean',
      isWeakAc: 'boolean',
    });
  });

  it('carIdが一意である', () => {
    expectUniquePrimaryKey(cars, 'carId');
  });

  it('formationIdがFORMATIONに存在する', () => {
    expectForeignKey(cars, 'formationId', formations, 'formationId');
  });

  it('各編成の号車数がcarCountと一致し、sequenceが重複なく連番である', () => {
    for (const formation of formations) {
      const formationCars = cars.filter((c) => c.formationId === formation.formationId);
      expect(formationCars.length, `formationId=${formation.formationId} の号車数`).toBe(formation.carCount);

      const sequences = formationCars.map((c) => c.sequence).sort((a, b) => a - b);
      expect(sequences, `formationId=${formation.formationId} のsequence`).toEqual(
        formationCars.map((_, i) => i + 1),
      );
    }
  });

  it('優先席・女性専用車・弱冷房車のサンプルをそれぞれ含む', () => {
    expect(cars.some((c) => c.hasPrioritySeat)).toBe(true);
    expect(cars.some((c) => c.isWomenOnly)).toBe(true);
    expect(cars.some((c) => c.isWeakAc)).toBe(true);
  });
});

describe('CAR_FACILITY', () => {
  it('必須プロパティを備える', () => {
    expectRequiredFields(carFacilities, {
      carFacilityId: 'number',
      carId: 'number',
      facilityType: 'string',
      labelTextKeyId: 'number',
    });
  });

  it('carFacilityIdが一意である', () => {
    expectUniquePrimaryKey(carFacilities, 'carFacilityId');
  });

  it('carIdがCARに存在する', () => {
    expectForeignKey(carFacilities, 'carId', cars, 'carId');
  });

  it('一部の号車のみに設定されている（全号車ではない）', () => {
    const carIdsWithFacility = new Set(carFacilities.map((f) => f.carId));
    expect(carIdsWithFacility.size).toBeGreaterThanOrEqual(1);
    expect(carIdsWithFacility.size).toBeLessThan(cars.length);
  });

  it('トイレ／車椅子スペース／WiFiのサンプルをそれぞれ含む', () => {
    const types = new Set(carFacilities.map((f) => f.facilityType));
    expect(types.has('トイレ')).toBe(true);
    expect(types.has('車椅子スペース')).toBe(true);
    expect(types.has('WiFi')).toBe(true);
  });
});
