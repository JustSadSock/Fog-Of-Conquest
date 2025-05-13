// js/main.js
// ---------------------------------------------------
// Связываем всё вместе: меню, рендер, логика игры
// ---------------------------------------------------

import { initRendering, toggleFog }          from './rendering.js';
import { newGame, handleCanvasClick, endTurnBtn } from './gameLogic.js';

// ————————————————————————————————————————————————
// DOM‑элементы (берём один раз)
// ————————————————————————————————————————————————
const twoBtn     = document.getElementById('twoBtn');
const betaBtn    = document.getElementById('betaBtn');
const revealBtn  = document.getElementById('revealBtn');
const endTurnUI  = document.getElementById('endTurnBtn');
const canvas     = document.getElementById('canvas');

// ————————————————————————————————————————————————
// 1. Инициализация: только рендер + меню
// ————————————————————————————————————————————————
window.addEventListener('DOMContentLoaded', () => {

  // подготовить канвас (размер, первое отрисовывание пустой карты)
  initRendering();

  // показать стартовое меню (оно скрывается внутри newGame())
  document.getElementById('startPanel').style.display = 'flex';

  // ——— кнопки выбора режима ———
  twoBtn .addEventListener('click', () => newGame(false));  // человек + AI
  betaBtn.addEventListener('click', () => newGame(true));   // «2 игрока β» (локал)

  // ——— гейм‑UI ———
  revealBtn.addEventListener('click', toggleFog);      // показать/скрыть туман
  endTurnUI.addEventListener('click', endTurnBtn);     // передать ход
  canvas.addEventListener('click', handleCanvasClick); // выбор/движение/атака
});