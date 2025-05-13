// js/main.js
// ---------------------------------------------------
// ЕДИНАЯ ТОЧКА ВХОДА: импортирует и связывает все модули
// ---------------------------------------------------

import { generateMap } from './map.js';

import {
  initRendering,
  redraw,
  updateFog,
  drawStats
} from './rendering.js';

import {
  initGameLogic,
  handleCanvasClick,
  endTurn,
  toggleFog
} from './gameLogic.js';

// ---------------------------------------------------
// DOMContentLoaded: готовим всё и навешиваем обработчики
// ---------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {

  // 1. Генерируем карту и стартовые объекты
  generateMap();

  // 2. Инициализируем игровую логику (state, клики, UI, ИИ)
  initGameLogic();

  // 3. Настраиваем canvas‑рендер и первый кадр
  initRendering();
  updateFog();
  redraw();
  drawStats();

  // ---------- кнопки, клики, UI ----------
  const canvas       = document.getElementById('canvas');
  const endTurnBtn   = document.getElementById('endTurnBtn');
  const fogToggleBtn = document.getElementById('fogToggleBtn');

  // клик по карте
  canvas.addEventListener('click', handleCanvasClick);

  // «Конец хода»
  endTurnBtn.addEventListener('click', () => {
    endTurn();
    updateFog();
    redraw();
    drawStats();
  });

  // переключатель тумана войны
  fogToggleBtn.addEventListener('click', () => {
    toggleFog();
    redraw();
  });

  // ресайз окна → перерисовать всё
  window.addEventListener('resize', () => {
    redraw();
    drawStats();
  });
});