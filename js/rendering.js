// js/rendering.js
// ---------------------------------------------------
// Работа с canvas + быстрая отрисовка карты / юнитов
// ---------------------------------------------------

import {
  ROWS, COLS, TILE_SIZE,
  TERRAIN
} from './map.js';

// -------- локальные переменные --------
let canvas, ctx;
let fogMask = [];              // двумерный массив true/false

// ---------------------------------------------------
// Публичные функции
// ---------------------------------------------------

/** Подготовка канваса под размер сетки */
export function initRendering () {
  canvas = document.getElementById('canvas');
  ctx     = canvas.getContext('2d');

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

/** Полная перерисовка всего кадра */
export function redraw () {
  drawTerrain();
  drawUnits();
  drawBuildings();
  drawFog();
}

/** Пересчитать зону видимости (просто радиус 2 клетки от всех юнитов игрока‑1) */
export function updateFog () {
  const { units } = window;              // глобальный массив, создан в gameLogic.js
  fogMask = Array.from({ length: ROWS }, () => Array(COLS).fill(true)); // всё закрыто

  units
    .filter(u => u.owner === 1)          // видимость только для игрока‑1
    .forEach(u => {
      for (let r = u.r - 2; r <= u.r + 2; r++) {
        for (let c = u.c - 2; c <= u.c + 2; c++) {
          if (r >= 0 && r < ROWS && c >= 0 && c < COLS) fogMask[r][c] = false;
        }
      }
    });
}

/** Вывод быстрого текста статистики снизу */
export function drawStats () {
  const el = document.getElementById('stats');
  const { turn, currentPlayer, units } = window;
  const total1 = units.filter(u => u.owner === 1).length;
  const total2 = units.filter(u => u.owner === 2).length;

  el.textContent =
    `Ход: ${turn} | Очередь игрока #${currentPlayer} | Юнитов: ${total1} vs ${total2}`;
}

// ---------------------------------------------------
// Внутренние функции отрисовки
// ---------------------------------------------------

function resizeCanvas () {
  canvas.width  = COLS * TILE_SIZE;
  canvas.height = ROWS * TILE_SIZE;
  redraw();
}

function drawTerrain () {
  const { map } = window;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = terrainColor(map[r][c]);
      ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }
}

function drawUnits () {
  const { units } = window;
  ctx.font = `${TILE_SIZE * 0.6}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  units.forEach(u => {
    // фон кружочком
    ctx.fillStyle = u.owner === 1 ? '#ffffffaa' : '#000000aa';
    ctx.beginPath();
    ctx.arc(
      u.c * TILE_SIZE + TILE_SIZE / 2,
      u.r * TILE_SIZE + TILE_SIZE / 2,
      TILE_SIZE * 0.4,
      0, Math.PI * 2
    );
    ctx.fill();

    // буква типа
    ctx.fillStyle = u.owner === 1 ? '#000' : '#fff';
    ctx.fillText(u.type[0],                       // первая буква
      u.c * TILE_SIZE + TILE_SIZE / 2,
      u.r * TILE_SIZE + TILE_SIZE / 2
    );
  });
}

function drawBuildings () {
  const { buildings } = window;
  buildings.forEach(b => {
    ctx.fillStyle = b.owner === 1 ? '#88c' : '#c88';
    ctx.fillRect(
      b.c * TILE_SIZE + TILE_SIZE * 0.15,
      b.r * TILE_SIZE + TILE_SIZE * 0.15,
      TILE_SIZE * 0.7,
      TILE_SIZE * 0.7
    );
  });
}

function drawFog () {
  ctx.fillStyle = '#00000099';               // полупрозрачный чёрный
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (fogMask[r][c]) {
        ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }
}

function terrainColor (t) {
  switch (t) {
    case TERRAIN.PLAIN :  return '#9db359';
    case TERRAIN.FOREST:  return '#2f7d32';
    case TERRAIN.HILL  :  return '#b79f58';
    case TERRAIN.WATER :  return '#3a72a5';
    default           :  return '#555';
  }
}