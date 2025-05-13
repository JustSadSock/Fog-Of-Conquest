// js/map.js
// ---------------------------------------------------
// Константы карты и генерация ландшафта
// ---------------------------------------------------

// размеры сетки (можно менять — рендер подстроится)
export const ROWS = 20;
export const COLS = 20;
export const TILE_SIZE = 32;              // px

// типы тайлов (enum)
export const TERRAIN = {
  PLAIN : 0,
  FOREST: 1,
  HILL  : 2,
  WATER : 3,
};

// стоимость хода по тайлу для ИИ/логики
export const TERR_COST = {
  [TERRAIN.PLAIN] : 1,
  [TERRAIN.FOREST]: 2,
  [TERRAIN.HILL]  : 2,
  [TERRAIN.WATER] : Infinity,            // нельзя пройти
};

// бонус защиты (пример: +DEF при битве)
export const TERR_DEF = {
  [TERRAIN.PLAIN] : 0,
  [TERRAIN.FOREST]: 1,
  [TERRAIN.HILL]  : 2,
  [TERRAIN.WATER] : 0,
};

// сама карта (2‑D массив ROWS × COLS)
export let map = [];

/**
 * Генерирует новую карту случайным образом и кидает её
 * и в export, и в window.map (для старого кода, если вдруг понадобился)
 */
export function generateMap () {
  map = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => randomTerrain())
  );

  // ← legacy: пусть старый код тоже видит карту
  window.map = map;
}

// ---------------------------------------------------
// Вспомогалка — случайный тайл по простым вероятностям
// ---------------------------------------------------
function randomTerrain () {
  const r = Math.random();
  if (r < 0.60) return TERRAIN.PLAIN;   // 60 %
  if (r < 0.80) return TERRAIN.FOREST;  // 20 %
  if (r < 0.95) return TERRAIN.HILL;    // 15 %
  return TERRAIN.WATER;                 // 5 %
}