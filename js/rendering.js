// js/rendering.js
// ---------------------------------------------------
// Канвас, меню, панель, туман войны, события/статистика
// ---------------------------------------------------

import {
  ROWS, COLS, TERRAIN, TERR_COL, TILE_SIZE
} from './map.js';
import { abs } from './utils.js';

// ---------- DOM ----------
const canvas     = document.getElementById('canvas');
const ctx        = canvas.getContext('2d');
const startPanel = document.getElementById('startPanel');
const leftStats  = document.getElementById('leftStats');
const rightLog   = document.getElementById('rightLog');
const overlay    = document.getElementById('overlay');
const overlayMsg = document.getElementById('overlayMessage');

// ---------- локальный state ----------
let fogMask    = [];           // двумерный массив boolean
let fogVisible = true;         // переключатель показа тумана
const TILE = TILE_SIZE;        // для краткости в коде

// ===================================================
// 1. Публичный API
// ===================================================

/** готовит canvas, вешает ресайз, ставит пустую маску тумана */
export function initRendering () {
  resizeCanvas();

  // заглушка: карта полностью видима, пока updateFog() не пересчитает маску
  fogMask = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

  window.addEventListener('resize', resizeCanvas);
}

/** полная перерисовка кадра */
export function redraw () {
  drawTerrain();
  drawUnits();
  drawBuildings();
  if (fogVisible) drawFog();
}

/** пересчёт тумана по юнитам игрока‑1 */
export function updateFog (units) {
  fogMask = Array.from({ length: ROWS }, () => Array(COLS).fill(true));
  units.filter(u => u.owner === 1).forEach(u => {
    for (let r = u.r - 2; r <= u.r + 2; r++) {
      for (let c = u.c - 2; c <= u.c + 2; c++) {
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) fogMask[r][c] = false;
      }
    }
  });
}

/** выводит статистику в левый блок панели */
export function writeStats (turn, currentPlayer, units) {
  const p1 = units.filter(u => u.owner === 1).length;
  const p2 = units.filter(u => u.owner === 2).length;
  leftStats.textContent =
    `Ход ${turn} | Очередь: ${currentPlayer === 1 ? 'Игрок' : 'ИИ'} | Юнитов ${p1} vs ${p2}`;
}

/** добавляет строку в правый лог */
export function pushLog (txt, warn = false) {
  const line = document.createElement('div');
  line.textContent = txt;
  if (warn) line.style.color = '#f66';
  rightLog.append(line);
  rightLog.scrollTop = rightLog.scrollHeight;
}

/** показать / скрыть стартовое меню */
export const toggleStart = show => { startPanel.style.display = show ? 'flex' : 'none'; };

/** модальное «Да/Нет» */
export function askYesNo (msg, cbYes) {
  overlayMsg.textContent = msg;
  overlay.style.display = 'flex';
  const yes = document.getElementById('yesBtn');
  const no  = document.getElementById('noBtn');
  const clear = () => { overlay.style.display = 'none'; yes.onclick = no.onclick = null; };
  yes.onclick = () => { clear(); cbYes(); };
  no.onclick  = clear;
}

/** переключить видимость тумана */
export function toggleFog () { fogVisible = !fogVisible; redraw(); }

// ===================================================
// 2. Внутренние функции: canvas‑рендер
// ===================================================

/** подгоняем размер canvas под сетку */
function resizeCanvas () {
  canvas.width  = COLS * TILE;
  canvas.height = ROWS * TILE;
  redraw();
}

/** фон карты */
function drawTerrain () {
  const { map } = window;                       // глобал из map.js
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = TERR_COL[map[r][c]];
      ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
    }
  }
}

/** юниты (скрываем противника в тумане) */
function drawUnits () {
  const { units } = window;
  ctx.font = `${TILE * 0.6}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  units.forEach(u => {
    if (fogVisible && fogMask[u.r][u.c] && u.owner !== 1) return; // враг в тумане — не рисуем

    // фон‑кружок
    ctx.fillStyle = u.owner === 1 ? '#fff8' : '#0008';
    ctx.beginPath();
    ctx.arc(
      u.c * TILE + TILE / 2,
      u.r * TILE + TILE / 2,
      TILE * 0.4,
      0, Math.PI * 2
    );
    ctx.fill();

    // буква типа
    ctx.fillStyle = u.owner === 1 ? '#000' : '#fff';
    ctx.fillText(u.type[0],
      u.c * TILE + TILE / 2,
      u.r * TILE + TILE / 2
    );
  });
}

/** здания (видны всегда) */
function drawBuildings () {
  const { buildings } = window;
  buildings.forEach(b => {
    ctx.fillStyle = b.owner === 1 ? '#77c' : '#c77';
    ctx.fillRect(
      b.c * TILE + TILE * 0.15,
      b.r * TILE + TILE * 0.15,
      TILE * 0.7,
      TILE * 0.7
    );
  });
}

/** полупрозрачные квадраты тумана */
function drawFog () {
  ctx.fillStyle = '#000a';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (fogMask[r][c]) ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
    }
  }
}