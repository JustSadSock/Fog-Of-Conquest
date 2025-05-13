// js/gameLogic.js
// ---------------------------------------------------
// Игровой state, клики, ход, ИИ‑оппонент
// ---------------------------------------------------

import {
  ROWS, COLS, TILE_SIZE,
  TERRAIN, TERR_COST, map          // данные карты
} from './map.js';

import {
  redraw, updateFog, drawStats     // функции рендера
} from './rendering.js';

// ---------- глобальный state (экспортируем для других модулей) ----------
export let units      = [];        // все юниты на карте
export let buildings  = [];        // здания (пока не используются)
export let turn       = 1;
export let currentPlayer = 1;      // 1 – человек, 2 – AI

// ---------- настройки юнитов ----------
const UNIT_TYPES = {
  INF : { move: 3, hpMax: 3, atk: 1, rng: 1 },   // пехота
  CAV : { move: 5, hpMax: 3, atk: 1, rng: 1 },   // кавалерия
  ART : { move: 2, hpMax: 2, atk: 2, rng: 3 },   // артиллерия
};

// ---------- служебные переменные ----------
let selected = null;   // юнит, на котором сейчас курсор
let fogEnabled = true; // переключатель тумана

// ---------------------------------------------------
// 1. Инициализация начального состояния
// ---------------------------------------------------
export function initGameLogic () {

  // два отряда игрока‑1
  units = [
    { id: 1, owner: 1, type: 'INF', hp: 3, r:  1,        c: 1 },
    { id: 2, owner: 1, type: 'CAV', hp: 3, r:  2,        c: 1 },

    // два отряда AI (игрок‑2)
    { id: 3, owner: 2, type: 'INF', hp: 3, r: ROWS - 2,  c: COLS - 2 },
    { id: 4, owner: 2, type: 'ART', hp: 2, r: ROWS - 3,  c: COLS - 2 },
  ];

  buildings = []; // пока пусто
  turn = 1;
  currentPlayer = 1;

  // пробрасываем важное в window — старый код может к ним обращаться
  Object.assign(window, { units, buildings, turn, currentPlayer });

  // пересчёт тумана и отрисовка
  updateFog();
}

/* -------------------------------------------------- *
 * 2. Обработка кликов по карте (canvas.onclick)      *
 * -------------------------------------------------- */
export function handleCanvasClick (evt) {
  // координата клетки
  const rect = evt.currentTarget.getBoundingClientRect();
  const c = Math.floor((evt.clientX - rect.left) / TILE_SIZE);
  const r = Math.floor((evt.clientY - rect.top ) / TILE_SIZE);
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;

  const clickedUnit = units.find(u => u.r === r && u.c === c);

  if (selected) {
    // 2‑й клик → попытка действия
    //   — если кликнули по своему — просто пере‑select
    if (clickedUnit && clickedUnit.owner === currentPlayer) {
      selected = clickedUnit;
      return;
    }

    //   — иначе двигаемся/атакуем
    attemptAction(selected, r, c);
    selected = null;

    redraw();
    drawStats();

  } else {
    // 1‑й клик → если это наш юнит — выбираем
    if (clickedUnit && clickedUnit.owner === currentPlayer) {
      selected = clickedUnit;
    }
  }
}

/* -------------------------------------------------- *
 * 3. Конец хода игрока‑1 + AI‑ход                    *
 * -------------------------------------------------- */
export function endTurn () {
  // ► смена игрока
  currentPlayer = currentPlayer === 1 ? 2 : 1;
  window.currentPlayer = currentPlayer;
  turn += 1;
  window.turn = turn;

  healUnits();      // лёгкий авто‑реген

  if (currentPlayer === 2) {   // очередь AI
    aiTurn();
    // сразу же передаём ход обратно человеку
    currentPlayer = 1;
    window.currentPlayer = 1;
    turn += 1;
    window.turn = turn;
  }

  updateFog();
  redraw();
  drawStats();
}

/* -------------------------------------------------- *
 * 4. Переключатель тумана войны                      *
 * -------------------------------------------------- */
export function toggleFog () {
  fogEnabled = !fogEnabled;
  window.fogEnabled = fogEnabled;   // вдруг понадобится в других модулях
  redraw();
}

/* -------------------------------------------------- *
 * 5. Внутренние функции                              *
 * -------------------------------------------------- */

/** Проверка проходного тайла */
function passable (r, c) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
  return TERR_COST[map[r][c]] < Infinity && !units.find(u => u.r === r && u.c === c);
}

/** Пытаемся передвинуться или атаковать */
function attemptAction (unit, r, c) {

  const cfg  = UNIT_TYPES[unit.type];
  const dist = Math.abs(unit.r - r) + Math.abs(unit.c - c);

  // ------ Атака ------
  const target = units.find(u => u.owner !== currentPlayer && u.r === r && u.c === c);
  if (target && dist <= cfg.rng) {
    target.hp -= cfg.atk;
    if (target.hp <= 0) {
      units = units.filter(u => u.id !== target.id);
      window.units = units;
    }
    return;
  }

  // ------ Движение ------
  if (dist <= cfg.move && passable(r, c)) {
    unit.r = r;
    unit.c = c;
  }
}

/** Простой «рест/починка» в конце хода */
function healUnits () {
  units.forEach(u => {
    const cfg = UNIT_TYPES[u.type];
    if (u.hp < cfg.hpMax) u.hp += 1;
  });
}

/* -------------------------------------------------- *
 * 6. Черновой AI‑ход                                 *
 * -------------------------------------------------- */
function aiTurn () {

  const myUnits  = units.filter(u => u.owner === 2);
  const enemies  = units.filter(u => u.owner === 1);

  myUnits.forEach(me => {
    // --- выбор ближайшего врага ---
    let best = null, bestDist = Infinity;
    enemies.forEach(en => {
      const d = Math.abs(me.r - en.r) + Math.abs(me.c - en.c);
      if (d < bestDist) { bestDist = d; best = en; }
    });
    if (!best) return;

    const cfg = UNIT_TYPES[me.type];

    /* 1) Если можем стрелять — стрелять */
    if (bestDist <= cfg.rng) {
      best.hp -= cfg.atk;
      if (best.hp <= 0) {
        units = units.filter(u => u.id !== best.id);
        window.units = units;
        return; // цель уничтожена
      }
    }

    /* 2) Иначе идём ближе (до cfg.move клеток) */
    const dr = Math.sign(best.r - me.r);
    const dc = Math.sign(best.c - me.c);

    let newR = me.r;
    let newC = me.c;
    for (let step = 0; step < cfg.move; step++) {
      const tryR = newR + (dr !== 0 ? dr : 0);
      const tryC = newC + (dc !== 0 ? dc : 0);
      if (passable(tryR, tryC)) {
        newR = tryR;
        newC = tryC;
      }
    }
    me.r = newR;
    me.c = newC;
  });
}

/* -------------------------------------------------- *
 * 7. Экспорт для main.js                             *
 * -------------------------------------------------- */
export {
  attemptAction as _attemptAction // (если захочется покрутить тесты)
};