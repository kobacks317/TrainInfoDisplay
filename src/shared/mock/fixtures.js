// 開発用のモックデータ（外部DBミラーを模した最小限のダミーデータ）。
// 本実装のデータモデルは docs/01_requirements.md §7 のER図を参照。

export const stations = [
  { stationId: 1, stationCode: 'ST01', name: '中央駅' },
  { stationId: 2, stationCode: 'ST02', name: '新町' },
  { stationId: 3, stationCode: 'ST03', name: '緑が丘' },
  { stationId: 4, stationCode: 'ST04', name: '港南' },
];

export const lines = [{ lineId: 1, lineCode: 'L01', name: '中央線', primaryColor: '#0072bc' }];

export const trains = [
  {
    trainId: 1,
    trainNumber: '1234M',
    trainTypeName: '快速',
    destinationStationId: 4,
  },
];

export const trainRunState = {
  trainRunId: 1,
  trainId: 1,
  currentLineId: 1,
  currentStationId: 2,
  nextStopStationId: 3,
  trainStatus: 'APPROACHING',
  progressRatio: 0.6,
  etaSeconds: 90,
  delayMinutes: 0,
};
