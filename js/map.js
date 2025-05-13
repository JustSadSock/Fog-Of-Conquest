// js/map.js
// ---------------------------------------------------
// Константы карты + генерация ландшафта
// ---------------------------------------------------

// --- размеры сетки ---
export const ROWS = 30;
export const COLS = 20;

// --- размер одного тайла в пикселях (использует rendering.js) ---
export const TILE_SIZE = 28;          // если нужно крупнее / мельче — поменяй тут

// --- типы рельефа ---
export const TERRAIN = {
  PLAIN   : 0,
  WATER   : 1,
  FOREST  : 2,
  HILL    : 3,
  MOUNTAIN: 4
};

// --- цвет каждого тайла (для fast‑рендера) ---
export const TERR_COL = [
  '#8a8',   // PLAIN
  '#58a',   // WATER
  '#295',   // FOREST
  '#aa2',   // HILL
  '#666'    // MOUNTAIN
];

// --- «стоимость прохода» (999 = непроходимо) ---
export const TERR_COST = [
  1,   // PLAIN
  2,   // WATER
  1,   // FOREST
  2,   // HILL
  999  // MOUNTAIN
];

// --- бонус защиты (пока не используется, но был в core.js) ---
export const TERR_DEF = [
  0,  // PLAIN
 -1,  // WATER
  1,  // FOREST
  2,  // HILL
  0   // MOUNTAIN
];

// --- сама карта (2‑D массив ROWS × COLS) ---
export let map = [];

/**
 * Сгенерировать новую карту по тому же алгоритму,
 * что был в старом core.js (проценты рельефов сохранены)
 */
export function generateMap () {
  map = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => {
      const r = Math.random();
      return r < 0.65 ? TERRAIN.PLAIN    :   // 65 %
             r < 0.75 ? TERRAIN.WATER    :   // 10 %
             r < 0.90 ? TERRAIN.FOREST   :   // 15 %
             r < 0.97 ? TERRAIN.HILL     :   // 7 %
                         TERRAIN.MOUNTAIN;   // 3 %
    })
  );

  // пробрасываем в window для рендера (как было в core.js)
  window.map = map;
}