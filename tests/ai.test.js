// tests/ai.test.js
const { aiTakeTurn, computeDistanceMap } = require('../js/ai.js');

describe('AI module exports', () => {
  test('functions are exported', () => {
    expect(typeof aiTakeTurn).toBe('function');
    expect(typeof computeDistanceMap).toBe('function');
  });
});

describe('computeDistanceMap basic', () => {
  beforeEach(() => {
    global.TERRAIN = { PLAIN:0, WATER:1, FOREST:2, HILL:3, MOUNTAIN:4 };
    global.TERR_COST = [1,2,2,2,999];
    global.map = [
      [0,0],
      [0,0]
    ];
  });

  test('returns manhattan distance on plain', () => {
    const dist = computeDistanceMap([{r:0,c:0}]);
    expect(dist[1][1]).toBe(2);
  });
});
