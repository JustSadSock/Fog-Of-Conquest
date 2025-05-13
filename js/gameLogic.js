// js/gameLogic.js

import { ROWS, COLS, TERRAIN, TERR_COST, TERR_DEF, generateMap } from './map.js';
import { initRendering, redraw, updateFog }                       from './rendering.js';

// Константы и типы
export const UNIT_TYPES = {
  swordsman: { move:2, atk:2, def:1, range:1, hpMax:5, cost:3, color:'#a00' },
  archer:    { move:2, atk:3, def:0, range:2, hpMax:4, cost:3, color:'#0a0' },
  heavy:     { move:1, atk:3, def:2, range:1, hpMax:6, cost:5, color:'#000' },
  cavalry:   { move:3, atk:3, def:1, range:1, hpMax:6, cost:6, color:'#08a' },
  mage:      { move:2, atk:0, def:0, range:0, hpMax:4, cost:7, color:'#88f' },
  bog:       { move:0, atk:2, def:1, range:1, hpMax:1000, cost:0, color:'#fff' }
};
export const BUILD_TYPES = {
  base:      { spawn:['swordsman','archer','bog'], gen:0 },
  barracks:  { spawn:['heavy'], gen:0 },
  stable:    { spawn:['cavalry'], gen:0 },
  mageTower: { spawn:['mage'], gen:0 },
  mine:      { spawn:[], gen:1 },
  lumber:    { spawn:[], gen:1 },
  fort:      { spawn:[], gen:0, def:+2 }
};
export const BUILD_LABELS = {
  base:'баз', barracks:'каз', stable:'кон', mageTower:'баш',
  mine:'руд', lumber:'лес', fort:'форт'
};

// Глобальное состояние
window.state = {
  currentPlayer:1,
  gold:{1:5,2:5},
  fog:{}, seen:{}, turn:1
};
window.buildings = [];
window.units     = [];
window.sel       = null;
window.zoneMap   = null;
window.zoneList  = [];
window.spawnB    = null;

// Инициализация игры
export function initGame() {
  // сгенерировать карту + начальные объекты
  generateMap();

  // дать MP юнитам и init fog/seen
  [1,2].forEach(p=>{
    window.state.fog[p]  = Array.from({length:ROWS},()=>Array(COLS).fill(true));
    window.state.seen[p] = Array.from({length:ROWS},()=>Array(COLS).fill(false));
  });
  window.units.forEach(u => u.mp = UNIT_TYPES[u.type].move);

  // отрисовка и панель
  initRendering(); updateFog(); redraw(); drawStats();

  // навесить кнопки
  document.getElementById('twoBtn').onclick = () => startTurns();
  document.getElementById('toggleFogBtn').onclick = () => {
    const btn = document.getElementById('toggleFogBtn');
    btn.textContent = btn.textContent === 'Скрыть туман' ? 'Показать туман' : 'Скрыть туман';
    redraw();
  };
  document.getElementById('endTurnBtn').onclick = () => nextTurn();
  document.getElementById('confirmBtn').onclick = () => {
    document.getElementById('overlay').style.display = 'none';
    continueAfterOverlay();
  };
}

// Старт первого хода
function startTurns() {
  document.getElementById('startPanel').style.display = 'none';
  continueAfterOverlay = () => {}; // ни к чему
  prepareTurn(1);
}

// Подготовка хода игрока p
function prepareTurn(p) {
  window.state.currentPlayer = p;
  window.units.filter(u=>u.owner===p).forEach(u=>u.mp = UNIT_TYPES[u.type].move);
  updateFog(); redraw(); drawStats();
}

// Показать статистику
function drawStats() {
  const s = window.state;
  document.getElementById('stats').textContent =
    `Ход ${s.turn} | Игрок ${s.currentPlayer} | Золото: ${s.gold[s.currentPlayer]}`;
}

// Передать ход
let continueAfterOverlay;
function nextTurn() {
  document.getElementById('overlayMessage').textContent =
    `Передать ход игроку ${window.state.currentPlayer===1?2:1}?`;
  document.getElementById('overlay').style.display = 'flex';
  continueAfterOverlay = () => {
    window.sel = null; window.zoneMap = null; window.zoneList = [];
    window.spawnB = null;
    if (window.state.currentPlayer===1) {
      window.state.turn++;
      // AI-turn placeholder: сразу переключаем
      prepareTurn(2);
    } else {
      prepareTurn(1);
    }
  };
}

// Обработчик кликов по canvas
document.getElementById('canvas').addEventListener('click', e => {
  // рассчитываем клетку, клики по юнитам/движение/атаку/spawn…
  // [тут ваш существующий код кликов, перенесённый из монолита]
  redraw();
});

// Функции атаки, спавна, вычисления зоны и т.д.
// [тут весь остальной ваш код из gameLogic.js: computeZone, doAttack, spawn, aiTurn…]
