// 路線・駅マスタのモックデータをまとめて参照するためのエントリポイント
// 参照: docs/01_requirements.md §7.2, src/types/station.js, src/types/common.js

import operators from './operators.json';
import lines from './lines.json';
import lineSymbols from './line-symbols.json';
import stations from './stations.json';
import lineStations from './line-stations.json';
import stationNumbers from './station-numbers.json';
import transferInfo from './transfer-info.json';
import platforms from './platforms.json';
import platformFacilities from './platform-facilities.json';
import trainTypes from './train-types.json';
import trains from './trains.json';
import trainLineSegments from './train-line-segments.json';
import trainStops from './train-stops.json';

export {
  operators,
  lines,
  lineSymbols,
  stations,
  lineStations,
  stationNumbers,
  transferInfo,
  platforms,
  platformFacilities,
  trainTypes,
  trains,
  trainLineSegments,
  trainStops,
};
