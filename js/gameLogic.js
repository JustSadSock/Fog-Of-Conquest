// js/gameLogic.js
// ---------------------------------------------------
// Игровой state, обработка кликов, спавн, ИИ, победа
// ---------------------------------------------------

import { ROWS, COLS, TERRAIN, TERR_COST, generateMap } from './map.js';
import {
  redraw, updateFog, writeStats,
  pushLog, askYesNo, toggleStart
} from './rendering.js';
import { randChoice, abs } from './utils.js';

// ————————————————————————————————————————————————
// 0. Константы юнитов и зданий
// ————————————————————————————————————————————————
const UNITS = {
  INF : { hp: 3, move: 3, rng: 1, atk: 1, cost: 2 },
  CAV : { hp: 3, move: 5, rng: 1, atk: 1, cost: 3 },
  ART : { hp: 2, move: 2, rng: 3, atk: 2, cost: 4 },
};

const START_GOLD = 10;
const BASE_HP    = 10;

// ————————————————————————————————————————————————
// 1. Глобальный state (экспортируем частично)
// ————————————————————————————————————————————————
let units      = [];     // все боевые юниты
let buildings  = [];     // {id,owner,r,c,hp}
let turn       = 1;
let current    = 1;      // 1 – человек, 2 – AI
let gold       = { 1: START_GOLD, 2: START_GOLD };

let selected   = null;   // выбранный юнит
let modeBeta   = false;  // «2 игрока бета»

// ---------------------------------------------------
// Экспортируемое API (main.js пользуется)
// ---------------------------------------------------
export function newGame (beta = false) {
  modeBeta = beta;
  resetState();
  toggleStart(false);                  // спрятать стартовое меню
  pushLog('Новая игра началась!');
  drawEverything();
}

export function handleCanvasClick (evt) {
  const { r, c } = cellFromEvent(evt);
  if (r === null) return;

  const u = units.find(x => x.r === r && x.c === c && x.owner === current);

  if (selected) {
    if (u) { selected = u; drawEverything(); return; }
    doAction(selected, r, c);
    selected = null;
    endPhaseIfNeeded();
  } else {
    if (u) selected = u;
  }
  drawEverything();
}

export function endTurnBtn () {
  askYesNo('Передать ход ИИ?', endTurn);
}

// ————————————————————————————————————————————————
// 2. Служебные функции — инициализация и перерисовка
// ————————————————————————————————————————————————
function resetState () {
  generateMap();                       // новая карта

  // базы по углам
  buildings = [
    { id: 1, owner: 1, r: 1,       c: 1,       hp: BASE_HP },
    { id: 2, owner: 2, r: ROWS-2,  c: COLS-2,  hp: BASE_HP },
  ];

  // стартовые отряды
  units = [
    { id: 1, owner: 1, type:'INF', r: 2,        c: 1, hp: UNITS.INF.hp },
    { id: 2, owner: 1, type:'CAV', r: 2,        c: 2, hp: UNITS.CAV.hp },
    { id: 3, owner: 2, type:'INF', r: ROWS-3,   c: COLS-2, hp: UNITS.INF.hp },
    { id: 4, owner: 2, type:'ART', r: ROWS-4,   c: COLS-3, hp: UNITS.ART.hp },
  ];

  gold = { 1: START_GOLD, 2: START_GOLD };
  turn = 1;
  current = 1;
  selected = null;

  // сделать доступным для rendering.js
  Object.assign(window, { units, buildings });
  updateFog(units);
}

function drawEverything () {
  writeStats(turn, current, units);
  redraw();
}

// клетка из события клика
function cellFromEvent (evt) {
  const rect = evt.currentTarget.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;
  if (x < 0 || y < 0) return { r:null, c:null };
  const c = Math.floor(x / 28);
  const r = Math.floor(y / 28);
  return (r >= ROWS || c >= COLS) ? { r:null, c:null } : { r, c };
}

// ————————————————————————————————————————————————
// 3. Движение / атака
// ————————————————————————————————————————————————
function doAction (unit, r, c) {
  const cfg   = UNITS[unit.type];
  const dist  = abs(unit.r - r) + abs(unit.c - c);

  const target = units.find(x => x.r === r && x.c === c && x.owner !== unit.owner);
  const base   = buildings.find(b => b.r === r && b.c === c && b.owner !== unit.owner);

  // атака
  if ((target || base) && dist <= cfg.rng) {
    if (target) {
      target.hp -= cfg.atk;
      pushLog(`${typeName(unit)} атакует ${typeName(target)}!`);
      if (target.hp <= 0) killUnit(target);
    } else if (base) {
      base.hp -= cfg.atk;
      pushLog(`${typeName(unit)} бьёт вражескую базу!`);
      if (base.hp <= 0) gameOver(unit.owner);
    }
    return;
  }

  // движение
  if (dist <= cfg.move && passable(r, c)) {
    unit.r = r;
    unit.c = c;
    pushLog(`${typeName(unit)} перемещается.`);
  }
}

function passable (r, c) {
  if (r < 0 || c < 0 || r >= ROWS || c >= COLS) return false;
  if (TERR_COST[window.map[r][c]] >= 999) return false;
  if (units.find(x => x.r === r && x.c === c)) return false;
  return true;
}

function killUnit (u) {
  units = units.filter(x => x.id !== u.id);
  window.units = units;
  pushLog(`${typeName(u)} уничтожен!`, true);
}

// ————————————————————————————————————————————————
// 4. Ход / ИИ
// ————————————————————————————————————————————————
function endTurn () {
  current = current === 1 ? 2 : 1;
  turn += 1;

  regenUnits();
  gold[current] += 2;                   // маленький доход за ход

  if (current === 2 && !modeBeta) aiTurn();
  updateFog(units);
  selected = null;
  drawEverything();
}

function regenUnits () {
  units.forEach(u => {
    const max = UNITS[u.type].hp;
    if (u.hp < max) u.hp += 1;
  });
}

function aiTurn () {
  // супер‑просто: каждый юнит идёт к ближайшему врагу или базе
  units.filter(u => u.owner === 2).forEach(me => {
    const target = nearestEnemyOrBase(me);
    if (!target) return;
    const cfg = UNITS[me.type];
    const dist = abs(me.r - target.r) + abs(me.c - target.c);

    // если можем стрелять — стреляем
    if (dist <= cfg.rng) { doAction(me, target.r, target.c); return; }

    // иначе шагаем ближе
    const step = bestStepTowards(me, target, cfg.move);
    if (step) doAction(me, step.r, step.c);
  });
}

function nearestEnemyOrBase (me) {
  const enemies = units.filter(u => u.owner === 1);
  const bases   = buildings.filter(b => b.owner === 1);
  return [...enemies, ...bases].reduce((best, cur) => {
    const d = abs(me.r-cur.r)+abs(me.c-cur.c);
    return (!best || d < best.d) ? { ...cur, d } : best;
  }, null);
}

function bestStepTowards (me, target, steps) {
  const queue = [{ r: me.r, c: me.c, s:0 }];
  const seen  = new Set([`${me.r}|${me.c}`]);

  while (queue.length) {
    const { r, c, s } = queue.shift();
    if (s >= steps) continue;
    const dirs = [ [1,0], [-1,0], [0,1], [0,-1] ]
      .sort(() => Math.random() - 0.5);         // рандомим порядок
    for (const [dr,dc] of dirs) {
      const nr = r+dr, nc = c+dc;
      const key = `${nr}|${nc}`;
      if (!passable(nr,nc) || seen.has(key)) continue;
      if (abs(nr-target.r)+abs(nc-target.c) < abs(me.r-target.r)+abs(me.c-target.c)) return { r:nr,c:nc };
      seen.add(key);
      queue.push({ r:nr, c:nc, s:s+1 });
    }
  }
  return null;
}

// ————————————————————————————————————————————————
// 5. Победа / поражение
// ————————————————————————————————————————————————
function gameOver (winner) {
  pushLog(winner === 1 ? 'Вы победили!' : 'Поражение…', true);
  askYesNo('Сыграть ещё раз?', () => newGame(modeBeta));
}

// ————————————————————————————————————————————————
// 6. Вспомогалки
// ————————————————————————————————————————————————
function typeName (u) {
  const names = { INF:'Пехота', CAV:'Кавалерия', ART:'Артиллерия' };
  return `${names[u.type]} #${u.id}`;
}

// ————————————————————————————————————————————————
// 7. Экспорт для main.js
// ————————————————————————————————————————————————
export {
  units, buildings, turn, current, gold,
  endTurn
};