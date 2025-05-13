// js/map.js  — константы + генерация ландшафта
import { randChoice } from './utils.js';

// размеры сетки берём как в core.js
export const ROWS = 30;
export const COLS = 20;

// типы рельефа 1‑к‑1
export const TERRAIN   = { PLAIN:0, WATER:1, FOREST:2, HILL:3, MOUNTAIN:4 };
export const TERR_COL  = ['#8a8','#58a','#292','#aa2','#666'];
export const TERR_COST = [1, 2, 1, 2, 999];
export const TERR_DEF  = [0,-1, 1, 2,   0];

// игровая карта (2‑D массив)
export let map = [];

/** генерируем случайную карту точно по старому алгоритму */
export function generateMap () {
  map = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => {
      const r = Math.random();
      return r < 0.65 ? TERRAIN.PLAIN :
             r < 0.75 ? TERRAIN.WATER :
             r < 0.90 ? TERRAIN.FOREST :
             r < 0.97 ? TERRAIN.HILL   :
                         TERRAIN.MOUNTAIN;
    })
  );
}