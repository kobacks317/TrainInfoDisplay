import { describe, expect, it } from 'vitest';
import { buildSeedData } from './buildSeedData.js';

describe('buildSeedData', () => {
  it('駅・路線・列車・在線状態を含むモックデータを組み立てる', () => {
    const data = buildSeedData();

    expect(Array.isArray(data.stations)).toBe(true);
    expect(data.stations.length).toBeGreaterThan(0);
    expect(Array.isArray(data.lines)).toBe(true);
    expect(Array.isArray(data.trains)).toBe(true);
    expect(data.trainRunState).toMatchObject({
      trainRunId: expect.any(Number),
      trainStatus: expect.any(String),
    });
  });
});
