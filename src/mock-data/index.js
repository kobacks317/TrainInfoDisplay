// 路線・駅マスタのモックデータをまとめて参照するためのエントリポイント
// 参照: docs/01_requirements.md §7.2, src/types/station.js, src/types/common.js

import languages from './languages.json';
import textKeys from './text-keys.json';
import localizedTexts from './localized-texts.json';
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
import formations from './formations.json';
import cars from './cars.json';
import carFacilities from './car-facilities.json';

export {
  languages,
  textKeys,
  localizedTexts,
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
  formations,
  cars,
  carFacilities,
};
