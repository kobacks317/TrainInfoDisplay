// モック路線・駅マスタデータの簡易バリデーション
// 参照: docs/01_requirements.md §7.2, src/types/station.js, src/types/common.js

import { describe, expect, it } from 'vitest';
import {
  lineStations,
  lineSymbols,
  lines,
  operators,
  platformFacilities,
  platforms,
  stationNumbers,
  stations,
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
