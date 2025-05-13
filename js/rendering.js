// js/rendering.js
// ---------------------------------------------------
// Канвас, меню, панель справа, туман войны, события
// ---------------------------------------------------

import {
  ROWS, COLS, TERRAIN, TERR_COL, TILE_SIZE   // TILE_SIZE возьмём из utils
} from './map.js';

import { abs } from './utils.js';

// ————————————————————————————————————————————————
// DOM‑элементы (получаем один раз при загрузке)
// ————————————————————————————————————————————————
const canvas        = document.getElementById('canvas');
const ctx           = canvas.getContext('2d');
const startPanel    = document.getElementById('startPanel');
const spawnPanel    = document.getElementById('spawnPanel');
const leftStats     = document.getElementById('leftStats');
const rightLog      = document.getElementById('rightLog');
const overlay       = document.getElementById('overlay');
const overlayMsg    = document.getElementById('overlayMessage');

export const TILE = 28;                           // px — чуть меньше старого
canvas.style.imageRendering = 'pixelated';

// ————————————————————————————————————————————————
// Локальный state (не путать с gameLogic.js)
// ————————————————————————————————————————————————
let fogMask = [];           // true → закрыто
let fogVisible = true;      // переключается из main.js

// ————————————————————————————————————————————————
// 1. Публичный API
// ————————————————————————————————————————————————
export function initRendering () {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

export function redraw () {
  drawTerrain();
  drawUnits();
  drawBuildings();
  if (fogVisible) drawFog();
}

/** пересчитываем видимость по массиву юнитов (owner === 1) */
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

/** записываем строку в лог событий (справа внизу) */
export function pushLog (txt, isWarning = false) {
  const line = document.createElement('div');
  line.textContent = txt;
  if (isWarning) line.style.color = '#f66';
  rightLog.append(line);
  rightLog.scrollTop = rightLog.scrollHeight;
}

/** инфо‑панель (число юнитов, ход и т.д.) */
export function writeStats (turn, currentPlayer, units) {
  const p1 = units.filter(u => u.owner === 1).length;
  const p2 = units.filter(u => u.owner === 2).length;
  leftStats.textContent =
    `Ход ${turn} | Очередь: ${currentPlayer === 1 ? 'Игрок' : 'ИИ'} | Юнитов ${p1} vs ${p2}`;
}

/** включить / выключить стартовое меню */
export function toggleStart (show = false) {
  startPanel.style.display = show ? 'flex' : 'none';
}

/** оверлей «Да/Нет» (используется для подтверждений) */
export function askYesNo (msg, cbYes) {
  overlayMsg.textContent = msg;
  overlay.style.display = 'flex';
  const yes = document.getElementById('yesBtn');
  const no  = document.getElementById('noBtn');

  const clear = () => { overlay.style.display = 'none'; yes.onclick = no.onclick = null; };
  yes.onclick = () => { clear(); cbYes(); };
  no.onclick  = () => { clear(); };
}

/** показать или спрятать туман */
export function toggleFog () {
  fogVisible = !fogVisible;
  redraw();
}

// ————————————————————————————————————————————————
// 2. Частные функции (canvas)
// ————————————————————————————————————————————————
function resizeCanvas () {
  canvas.width  = COLS * TILE;
  canvas.height = ROWS * TILE;
  redraw();
}

function drawTerrain () {
  const { map } = window;              // карта лежит глобально из map.js

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = TERR_COL[map[r][c]];
      ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
    }
  }
}

function drawUnits () {
  const { units } = window;
  ctx.font = `${TILE * 0.6}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  units.forEach(u => {
    // скрываем противника за туманом
    if (fogVisible && fogMask[u.r][u.c] && u.owner !== 1) return;

    ctx.fillStyle = u.owner === 1 ? '#fff8' : '#0008';
    ctx.beginPath();
    ctx.arc(u.c * TILE + TILE / 2, u.r * TILE + TILE / 2, TILE * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = u.owner === 1 ? '#000' : '#fff';
    ctx.fillText(u.type[0], u.c * TILE + TILE / 2, u.r * TILE + TILE / 2);
  });
}

function drawBuildings () {
  const { buildings } = window;
  buildings.forEach(b => {
    // здания видны даже в тумане (можно поменять)
    ctx.fillStyle = b.owner === 1 ? '#77c' : '#c77';
    ctx.fillRect(
      b.c * TILE + TILE * 0.15,
      b.r * TILE + TILE * 0.15,
      TILE * 0.7,
      TILE * 0.7
    );
  });
}

/** полупрозрачные квадраты поверх закрытых клеток */
function drawFog () {
  ctx.fillStyle = '#000a';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (fogMask[r][c]) {
        ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
      }
    }
  }
}