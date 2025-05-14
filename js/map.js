// js/map.js

/**
 * Генерирует карту, расставляет рельеф, базы, ресурсы и стартовые юниты.
 * Использует глобальные переменные из core.js: ROWS, COLS, TERRAIN, map, buildings, units, modeBeta, freeCell.
 */
export function generateMap() {
  // очистим предыдущие данные
  buildings.length = 0;
  units.length     = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      map[r][c] = TERRAIN.PLAIN;
    }
  }

  // заливаем «кусками» разные типы рельефа
  function blob(type, count) {
    for (let i = 0; i < count; i++) {
      let r = Math.random() * ROWS | 0,
          c = Math.random() * COLS | 0;
      for (let k = 0; k < 15; k++) {
        map[r][c] = type;
        r = Math.max(1, Math.min(ROWS - 2, r + [1, -1, 0, 0][Math.random() * 4 | 0]));
        c = Math.max(1, Math.min(COLS - 2, c + [0, 0, 1, -1][Math.random() * 4 | 0]));
      }
    }
  }
  blob(TERRAIN.WATER,    4);
  blob(TERRAIN.FOREST,   5);
  blob(TERRAIN.HILL,     4);
  blob(TERRAIN.MOUNTAIN, 3);

  // стартовые базы
  buildings.push({ r: 1,       c: 1,        owner: 1, type: 'base' });
  buildings.push({ r: ROWS-2,  c: COLS-2,   owner: 2, type: 'base' });

  // ресурсы рядом с базами
  function addRes(owner, type) {
    const b = buildings.find(x => x.owner === owner && x.type === 'base');
    [[1,0],[-1,0],[0,1],[0,-1]].some(([dr,dc]) => {
      const rr = b.r + dr, cc = b.c + dc;
      if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && map[rr][cc] === TERRAIN.PLAIN) {
        buildings.push({ r: rr, c: cc, owner, type });
        return true;
      }
    });
  }
  addRes(1, 'mine');
  addRes(2, 'mine');

  // остальные постройки-ресурсы/казармы/стабли/и т.д.
  [
    ['mine',      2],
    ['lumber',    2],
    ['barracks',  2],
    ['stable',    2],
    ['mageTower', 1],
    ['fort',      4]
  ].forEach(([type, count]) => {
    const half = count / 2 | 0;
    for (let i = 0; i < half; i++) {
      const p = freeCell(1);
      if (p) buildings.push({ r: p.r, c: p.c, owner: 0, type });
    }
    for (let i = 0; i < count - half; i++) {
      const p = freeCell(2);
      if (p) buildings.push({ r: p.r, c: p.c, owner: 0, type });
    }
  });

  // стартовые юниты для игроков
  units.push({ r: 1,           c: 2,             owner: 1, type: 'swordsman', hp: 5,    mp: 2 });
  units.push({ r: 2,           c: 1,             owner: 1, type: 'archer',    hp: 4,    mp: 2 });
  units.push({ r: ROWS-2,      c: COLS-3,        owner: 2, type: 'swordsman', hp: 5,    mp: 2 });
  units.push({ r: ROWS-3,      c: COLS-2,        owner: 2, type: 'archer',    hp: 4,    mp: 2 });

  // «бол»–юниты для бета-режима
  if (modeBeta) {
    units.push({ r: 5,           c: 5,             owner: 1, type: 'bog', hp: 1000, mp: 1000 });
    units.push({ r: ROWS-6,      c: COLS-6,        owner: 2, type: 'bog', hp: 1000, mp: 1000 });
  }
}