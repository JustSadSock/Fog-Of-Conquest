// js/main.js
// ---------------------------------------------------
// Старт приложения: меню, холст, события
// ---------------------------------------------------

import './globals.js';                             // ← заглушки window.*
import { generateMap }            from './map.js';
import {
  initRendering, toggleFog, toggleStart
} from './rendering.js';
import {
  newGame, handleCanvasClick, endTurnBtn
} from './gameLogic.js';

// ---------- DOM ----------
const twoBtn    = document.getElementById('twoBtn');     // «2 игрока»
const betaBtn   = document.getElementById('betaBtn');    // «2 игрока (β)»
const revealBtn = document.getElementById('revealBtn'); // открыть туман
const passBtn   = document.getElementById('endTurnBtn'); // передать ход
const canvas    = document.getElementById('canvas');

// ---------------------------------------------------
// boot
// ---------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  // 1) пустая карта → первый redraw не упадёт
  generateMap();

  // 2) канвас + первый кадр
  initRendering();

  // 3) показать стартовое меню
  toggleStart(true);

  // --- меню режима ---
  twoBtn .addEventListener('click', () => newGame(false)); // AI
  betaBtn.addEventListener('click', () => newGame(true));  // локальный 2P

  // --- игровое UI ---
  revealBtn.addEventListener('click', toggleFog);
  passBtn  .addEventListener('click', endTurnBtn);
  canvas   .addEventListener('click', handleCanvasClick);
});