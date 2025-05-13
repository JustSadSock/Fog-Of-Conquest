// js/rendering.js
// ---------------------------------------------------
// Канвас, старт‑меню, туман, лог, статистика
// ---------------------------------------------------

import {
  ROWS, COLS, TERRAIN, TERR_COL, TILE_SIZE
} from './map.js';

// ---------- DOM ----------
const canvas     = document.getElementById('canvas');
const ctx        = canvas.getContext('2d');
const startPanel = document.getElementById('startPanel');
const leftStats  = document.getElementById('leftStats');
const rightLog   = document.getElementById('rightLog');
const overlay    = document.getElementById('overlay');
const overlayMsg = document.getElementById('overlayMessage');

// ---------- локальный state ----------
let fogMask    = [];               // [][]bool — закрыто/открыто
let fogVisible = true;             // переключатель
const TILE = TILE_SIZE;            // псевдоним

// ===================================================
// 1. Публичный API
// ===================================================

export function initRendering () {
  // создаём пустую маску, чтобы drawFog() не упал первым кадром
  fogMask = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

export function redraw () {
  drawTerrain();
  drawUnits();
  drawBuildings();
  if (fogVisible) drawFog();
}

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

export function writeStats (turn, currentPlayer, units) {
  const p1 = units.filter(u => u.owner === 1).length;
  const p2 = units.filter(u => u.owner === 2).length;
  leftStats.textContent =
    `Ход ${turn} | Очередь: ${currentPlayer === 1 ? 'Игрок' : 'ИИ'} | Юнитов ${p1} vs ${p2}`;
}

export function pushLog (txt, warn = false) {
  const line = document.createElement('div');
  line.textContent = txt;
  if (warn) line.style.color = '#f66';
  rightLog.append(line);
  rightLog.scrollTop = rightLog.scrollHeight;
}

export const toggleStart = show => { startPanel.style.display = show ? 'flex' : 'none'; };

export function askYesNo (msg, cbYes) {
  overlayMsg.textContent = msg;
  overlay.style.display  = 'flex';
  const yes = document.getElementById('yesBtn');
  const no  = document.getElementById('noBtn');
  const clear = () => { overlay.style.display = 'none'; yes.onclick = no.onclick = null; };
  yes.onclick = () => { clear(); cbYes(); };
  no.onclick  = clear;
}

export function toggleFog () { fogVisible = !fogVisible; redraw(); }

// ===================================================
// 2. Внутренние функции: canvas‑рендер
// ===================================================

function resizeCanvas () {
  canvas.width  = COLS * TILE;
  canvas.height = ROWS * TILE;
  redraw();
}

function drawTerrain () {
  const { map } = window;                  // глобал из map.js
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = TERR_COL[map[r][c]];
      ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
    }
  }
}

function drawUnits () {
  const { units } = window;

  ctx.font = `600 ${TILE * 0.65}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  units.forEach(u => {
    if (fogVisible && fogMask[u.r][u.c] && u.owner !== 1) return; // враг в тумане

    // фон‑круг
    ctx.fillStyle = u.owner === 1 ? '#fff9' : '#0009';
    ctx.beginPath();
    ctx.arc(u.c * TILE + TILE / 2, u.r * TILE + TILE / 2, TILE * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // контур
    ctx.lineWidth = 2;
    ctx.strokeStyle = u.owner === 1 ? '#000' : '#fff';
    ctx.beginPath();
    ctx.arc(u.c * TILE + TILE / 2, u.r * TILE + TILE / 2, TILE * 0.4, 0, Math.PI * 2);
    ctx.stroke();

    // буква типа
    ctx.fillStyle = u.owner === 1 ? '#000' : '#fff';
    ctx.fillText(u.type[0], u.c * TILE + TILE / 2, u.r * TILE + TILE / 2);
  });
}

function drawBuildings () {
  const { buildings } = window;
  buildings.forEach(b => {
    const x = b.c * TILE + TILE * 0.15;
    const y = b.r * TILE + TILE * 0.15;
    const s = TILE * 0.7;

    ctx.fillStyle   = b.owner === 1 ? '#77c' : '#c77';
    ctx.fillRect(x, y, s, s);

    ctx.lineWidth   = 2;
    ctx.strokeStyle = '#000';
    ctx.strokeRect(x, y, s, s);
  });
}

function drawFog () {
  ctx.fillStyle = '#000a';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (fogMask[r][c]) ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
    }
  }
}