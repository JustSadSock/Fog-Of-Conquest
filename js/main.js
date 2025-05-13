// js/main.js
// ---------------------------------------------------
// Связываем всё: меню, рендер, логика игры
// ---------------------------------------------------

import { initRendering, toggleFog }               from './rendering.js';
import { newGame, handleCanvasClick, endTurnBtn } from './gameLogic.js';
import { generateMap }                            from './map.js';      // ⬅️ добавили

// ———————————————————————————————————————————
// DOM‑элементы
// ———————————————————————————————————————————
const twoBtn     = document.getElementById('twoBtn');
const betaBtn    = document.getElementById('betaBtn');
const revealBtn  = document.getElementById('revealBtn');
const endTurnUI  = document.getElementById('endTurnBtn');
const canvas     = document.getElementById('canvas');
const startPanel = document.getElementById('startPanel');

// ———————————————————————————————————————————
// Инициализация
// ———————————————————————————————————————————
window.addEventListener('DOMContentLoaded', () => {

  // 1) Создаём пустую карту, чтобы рендер мог сразу отрисовать фон
  generateMap();

  // 2) Настраиваем канвас (resize + первый redraw)
  initRendering();

  // 3) Показываем стартовое меню
  startPanel.style.display = 'flex';

  // ——— кнопки меню ———
  twoBtn .addEventListener('click', () => newGame(false)); // человек + AI
  betaBtn.addEventListener('click', () => newGame(true));  // «2 игрока β» (локально)

  // ——— игровое UI ———
  revealBtn.addEventListener('click', toggleFog);      // показать / скрыть туман
  endTurnUI.addEventListener('click', endTurnBtn);     // передать ход
  canvas.addEventListener('click', handleCanvasClick); // клик по карте
});