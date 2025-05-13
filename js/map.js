// js/map.js
// ---------------------------------------------------
// Константы карты + генерация ландшафта (1-к-1 как в core.js)
// ---------------------------------------------------

// ── размеры сетки ───────────────────────────────────
export const ROWS = 30;
export const COLS = 20;

// ── размер одного тайла (px) ────────────────────────
export const TILE_SIZE = 32;

// ── enum типов рельефа ──────────────────────────────
export const TERRAIN = {
  PLAIN   : 0,
  WATER   : 1,
  FOREST  : 2,
  HILL    : 3,
  MOUNTAIN: 4,
};

// ── цвета для fast-рендера (совпадают с main) ───────
export const TERR_COL = [
  '#9db359',  // PLAIN
  '#3a72a5',  // WATER
  '#2f7d32',  // FOREST
  '#b79f58',  // HILL
  '#666666',  // MOUNTAIN
];

// ── «стоимость прохода» для логики (999 = непроходимо) ─
export const TERR_COST = [
  1,    // PLAIN
  2,    // WATER
  1,    // FOREST
  2,    // HILL
  999,  // MOUNTAIN
];

// ── бонус защиты (не используется, но был в core.js) ─
export const TERR_DEF = [ 0, -1, 1, 2, 0 ];

// ── сама карта (2-D массив ROWS × COLS) ─────────────
export let map = [];

/**
 * Генерирует новую карту тем же алгоритмом, что в core.js:
 *  • 65 % равнины, 10 % вода, 15 % лес, 7 % холмы, 3 % горы.
 */
export function generateMap() {
  map = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => {
      const r = Math.random();
      return r < 0.65    ? TERRAIN.PLAIN    :
             r < 0.75    ? TERRAIN.WATER    :
             r < 0.90    ? TERRAIN.FOREST   :
             r < 0.97    ? TERRAIN.HILL     :
                           TERRAIN.MOUNTAIN;
    })
  );

  // делаем карту доступной глобально (старый код так ожидал)
  window.map = map;
}