// js/main.js
import { initRendering, toggleFog }               from './rendering.js';
import { newGame, handleCanvasClick, endTurnBtn } from './gameLogic.js';
import { generateMap }                            from './map.js';

const twoBtn     = document.getElementById('twoBtn');
const betaBtn    = document.getElementById('betaBtn');
const revealBtn  = document.getElementById('revealBtn');
const endTurnUI  = document.getElementById('endTurnBtn');
const canvas     = document.getElementById('canvas');
const startPanel = document.getElementById('startPanel');

window.addEventListener('DOMContentLoaded', () => {

  // 🔸 заглушки, чтобы drawUnits()/drawBuildings() не падали
  window.units     = [];
  window.buildings = [];

  // карта уже есть до первой перерисовки
  generateMap();

  // канвас подгоняется по размеру и сразу рисуется
  initRendering();

  // показываем меню режима
  startPanel.style.display = 'flex';

  // ——— выбор режима ———
  twoBtn .addEventListener('click', () => newGame(false));
  betaBtn.addEventListener('click', () => newGame(true));

  // ——— игровое UI ———
  revealBtn.addEventListener('click', toggleFog);
  endTurnUI.addEventListener('click', endTurnBtn);
  canvas.addEventListener('click', handleCanvasClick);
});