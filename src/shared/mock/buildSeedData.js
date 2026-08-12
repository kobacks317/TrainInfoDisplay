import { lines, stations, trainRunState, trains } from './fixtures.js';

export function buildSeedData() {
  return {
    stations,
    lines,
    trains,
    trainRunState,
  };
}
