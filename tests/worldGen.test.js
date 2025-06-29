const { generateWorld } = require('../js/worldGen.js');
require('../js/data.js');
require('../js/gameState.js');

describe('world generation balance', () => {
  beforeEach(() => {
    generateWorld();
  });

  test('starting areas are mirrored', () => {
    const rad = 5;
    for(let dr=-rad; dr<=rad; dr++){
      for(let dc=-rad; dc<=rad; dc++){
        const r1 = 1 + dr, c1 = 1 + dc;
        const r2 = global.ROWS - 2 - dr, c2 = global.COLS - 2 - dc;
        if(r1>=0 && r1<global.ROWS && c1>=0 && c1<global.COLS &&
           r2>=0 && r2<global.ROWS && c2>=0 && c2<global.COLS){
          expect(global.map[r1][c1]).toBe(global.map[r2][c2]);
        }
      }
    }
  });

  test('map not completely symmetrical', () => {
    let sym=0,total=0;
    for(let r=0;r<global.ROWS;r++){
      for(let c=0;c<global.COLS;c++){
        const rr=global.ROWS-1-r, cc=global.COLS-1-c;
        if(r>rr || (r===rr && c>cc)) continue;
        total++;
        if(global.map[r][c]===global.map[rr][cc]) sym++;
      }
    }
    expect(sym).toBeLessThan(total);
  });
});
