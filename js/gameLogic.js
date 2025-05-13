// js/gameLogic.js
// ---------------------------------------------------
// Игровой state, клики, AI, победа, финансы
// ---------------------------------------------------

import {
  ROWS, COLS, TERRAIN, TERR_COST, generateMap
} from './map.js';

import {
  redraw, updateFog, writeStats,
  pushLog, askYesNo, toggleStart
} from './rendering.js';

// ────────────────────────────────────────────────────
// 1. Константы юнитов
// ────────────────────────────────────────────────────
const UNITS = {
  INF : { hp:3, move:3, rng:1, atk:1, cost:2 },
  CAV : { hp:3, move:5, rng:1, atk:1, cost:3 },
  ART : { hp:2, move:2, rng:3, atk:2, cost:4 },
};

const START_GOLD = 10;
const BASE_HP    = 12;      // чуть толще, как в core.js

// ────────────────────────────────────────────────────
// 2. Глобальный state
// ────────────────────────────────────────────────────
export let units      = [];
export let buildings  = [];
export let turn       = 1;
export let current    = 1;          // 1 – человек, 2 – AI
export let gold       = { 1: START_GOLD, 2: START_GOLD };

let selected  = null;
let modeBeta  = false;              // «2 игрока β» — без AI

// делаем доступным рендеру через window.*
Object.assign(window, { units, buildings });

// ────────────────────────────────────────────────────
// 3. API для main.js
// ────────────────────────────────────────────────────
export function newGame (beta = false) {
  modeBeta = beta;
  resetState();
  toggleStart(false);
  pushLog('Новая партия!');
  drawAll();
}

export function handleCanvasClick (evt) {
  const { r,c } = cellFromEvent(evt);
  if (r === null) return;

  const u = units.find(x => x.r === r && x.c === c && x.owner === current);

  if (selected) {
    if (u) { selected = u; drawAll(); return; }
    doAction(selected, r, c);
    endPhaseIfNeeded();
    selected = null;
    drawAll();
  } else {
    if (u) { selected = u; drawAll(); }
  }
}

export function endTurnBtn () { askYesNo('Закончить ход?', endTurn); }

// ────────────────────────────────────────────────────
// 4. Инициализация партии
// ────────────────────────────────────────────────────
function resetState () {
  generateMap();

  buildings = [
    { id:1, owner:1, r:1,       c:1,       hp:BASE_HP },
    { id:2, owner:2, r:1,       c:COLS-2,  hp:BASE_HP },
    { id:3, owner:2, r:ROWS-2,  c:COLS-2,  hp:BASE_HP },
    { id:4, owner:1, r:ROWS-2,  c:1,       hp:BASE_HP },
  ];

  units = [
    { id:1, owner:1, type:'INF', r:2, c:1,      hp:3, movesLeft:3 },
    { id:2, owner:1, type:'CAV', r:2, c:2,      hp:3, movesLeft:5 },
    { id:3, owner:2, type:'INF', r:ROWS-3, c:COLS-2, hp:3, movesLeft:3 },
    { id:4, owner:2, type:'ART', r:ROWS-4, c:COLS-3, hp:2, movesLeft:2 },
  ];

  gold   = { 1: START_GOLD, 2: START_GOLD };
  turn   = 1;
  current= 1;
  selected = null;

  Object.assign(window, { units, buildings });

  updateFog(units);
}

function drawAll () {
  writeStats(turn, current, units);
  redraw();
}

// ────────────────────────────────────────────────────
// 5. Клик → движение / атака
// ────────────────────────────────────────────────────
function doAction (unit, r, c) {
  const cfg  = UNITS[unit.type];
  const dist = Math.abs(unit.r - r) + Math.abs(unit.c - c);

  const target = units.find(x => x.r===r && x.c===c && x.owner!==unit.owner);
  const base   = buildings.find(b => b.r===r && b.c===c && b.owner!==unit.owner);

  // атака
  if ((target || base) && dist <= cfg.rng) {
    if (target) {
      target.hp -= cfg.atk;
      pushLog(`${typeName(unit)} атакует ${typeName(target)}.`);
      if (target.hp <= 0) killUnit(target);
    } else {
      base.hp -= cfg.atk;
      pushLog(`${typeName(unit)} бьёт вражескую базу!`);
      if (base.hp <= 0) gameOver(unit.owner);
    }
    unit.movesLeft = 0;
    return;
  }

  // движение
  if (dist <= unit.movesLeft && passable(r,c)) {
    unit.r = r; unit.c = c;
    unit.movesLeft -= dist;
    pushLog(`${typeName(unit)} перемещается.`);
  }
}

function passable (r,c) {
  if (r<0||c<0||r>=ROWS||c>=COLS) return false;
  if (TERR_COST[window.map[r][c]]>=999) return false;
  if (units.find(u=>u.r===r&&u.c===c)) return false;
  return true;
}

function killUnit (u) {
  units = units.filter(x => x.id !== u.id);
  window.units = units;
  pushLog(`${typeName(u)} уничтожен!`, true);
}

// ────────────────────────────────────────────────────
// 6. Ход / фаза / AI
// ────────────────────────────────────────────────────
function endTurn () {
  current       = current===1 ? 2 : 1;
  window.currentPlayer = current;
  turn         += 1;
  window.turn   = turn;

  regenUnits();
  gold[current] += 2;

  if (current===2 && !modeBeta) aiTurn();
  updateFog(units);
  drawAll();
}

function regenUnits () {
  units.forEach(u=>{
    const max = UNITS[u.type].hp;
    if (u.hp < max) u.hp += 1;
    u.movesLeft = UNITS[u.type].move;
  });
}

function endPhaseIfNeeded () {
  if (current !== 1) return;
  const canMove = units.some(u=>u.owner===1 && u.movesLeft>0);
  if (!canMove) endTurn();
}

// ── AI (ближайшая цель) ─────────────────────────────
function aiTurn () {
  units.filter(u=>u.owner===2).forEach(me=>{
    const target = nearestEnemyOrBase(me);
    if (!target) return;

    const cfg  = UNITS[me.type];
    const dist = manhattan(me, target);

    if (dist<=cfg.rng) { doAction(me,target.r,target.c); return; }

    const step = bestStepTowards(me, target, cfg.move);
    if (step) doAction(me, step.r, step.c);
  });
}

function nearestEnemyOrBase (me) {
  const list = [...units.filter(u=>u.owner===1), ...buildings.filter(b=>b.owner===1)];
  return list.reduce((best,cur)=>{
    const d = manhattan(me,cur);
    return !best || d<best.d ? {...cur,d} : best;
  }, null);
}

function bestStepTowards (me, target, steps) {
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  for (const [dr,dc] of dirs.sort(()=>Math.random()-0.5)) {
    const nr = me.r+dr, nc = me.c+dc;
    if (!passable(nr,nc)) continue;
    if (manhattan({r:nr,c:nc},target)<manhattan(me,target)) return {r:nr,c:nc};
  }
  return null;
}

const manhattan = (a,b)=>Math.abs(a.r-b.r)+Math.abs(a.c-b.c);

// ────────────────────────────────────────────────────
// 7. Победа / утилиты
// ────────────────────────────────────────────────────
function gameOver (winner) {
  pushLog(winner===1?'Вы победили!':'Поражение…', true);
  askYesNo('Сыграть ещё раз?', ()=>newGame(modeBeta));
}

function typeName (u) {
  const names={INF:'Пехота',CAV:'Кавалерия',ART:'Артиллерия'};
  return `${names[u.type]} #${u.id}`;
}

function cellFromEvent (evt) {
  const rect = canvas.getBoundingClientRect();
  const x = evt.clientX-rect.left, y = evt.clientY-rect.top;
  if (x<0||y<0) return {r:null,c:null};
  const c = Math.floor(x/TILE_SIZE), r = Math.floor(y/TILE_SIZE);
  if (r>=ROWS||c>=COLS) return {r:null,c:null};
  return {r,c};
}

// ────────────────────────────────────────────────────
// 8. Экспорт
// ────────────────────────────────────────────────────
export { endTurn };