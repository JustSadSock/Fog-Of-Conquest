// js/map.js

export const ROWS = 30;
export const COLS = 20;

export const TERRAIN = {
  PLAIN:    0,
  WATER:    1,
  FOREST:   2,
  HILL:     3,
  MOUNTAIN: 4
};

export const TERR_COL = ['#888','#58a','#292','#aa2','#666'];
export const TERR_COST = [1,2,1,2,999];
export const TERR_DEF  = [0,-1,0,1,0];

/**
 * Генерирует карту terrain и начальные здания.
 * Ставит воду, лес, холмы, горы, потом базы и ресурсные здания.
 * Массив `window.map` будет заполняться типами TERRAIN, а `window.buildings` — объектами {r,c,owner,type}.
 */
export function generateMap() {
  // Инициализируем массив карты
  window.map = Array.from({ length: ROWS }, () => Array(COLS).fill(TERRAIN.PLAIN));
  window.buildings = [];
  window.units = [];

  // Вспомогательная функция для рисования пятен местности
  function add(type, count, sizeMin = 6, sizeMax = 12) {
    for (let k = 0; k < count; k++) {
      const stack = [];
      const r0 = Math.floor(Math.random() * ROWS);
      const c0 = Math.floor(Math.random() * COLS);
      stack.push([r0, c0]);
      let s = sizeMin + Math.floor(Math.random() * (sizeMax - sizeMin));
      while (s-- > 0 && stack.length) {
        const [r, c] = stack.pop();
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
        if (window.map[r][c] !== TERRAIN.PLAIN) continue;
        window.map[r][c] = type;
        stack.push([r+1,c],[r-1,c],[r,c+1],[r,c-1]);
      }
    }
  }

  // Расставляем природные объекты
  add(TERRAIN.WATER,    4);
  add(TERRAIN.FOREST,   5);
  add(TERRAIN.HILL,     4);
  add(TERRAIN.MOUNTAIN, 3);

  // Вспомогалка поиска свободной клетки
  function freeCell() {
    for (let i = 0; i < 500; i++) {
      const r = 2 + Math.floor(Math.random()*(ROWS-4));
      const c = 2 + Math.floor(Math.random()*(COLS-4));
      if (window.map[r][c] === TERRAIN.PLAIN &&
        !window.buildings.find(b => b.r === r && b.c === c) &&
        !window.units.find(u => u.r === r && u.c === c)) {
        return { r, c };
      }
    }
    return null;
  }

  // Ставим стартовые базы игроков
  window.buildings.push({ r:1, c:1, owner:1, type:'base' });
  window.buildings.push({ r:ROWS-2, c:COLS-2, owner:2, type:'base' });

  // Ставим по одной ресурсной постройке рядом с каждой стартовой базой
  window.buildings.push({ r:1, c:2, owner:1, type:'mine' });
  window.buildings.push({ r:ROWS-2, c:COLS-3, owner:2, type:'lumber' });

  // Случайно размещаем ещё по 2 казармы, конюшни и магические башни на нейтральных клетках
  ['barracks','stable','mageTower','fort'].forEach(type => {
    for (let i = 0; i < (type === 'fort' ? 4 : 2); i++) {
      const p = freeCell();
      if (p) window.buildings.push({ r:p.r, c:p.c, owner:0, type });
    }
  });
}
