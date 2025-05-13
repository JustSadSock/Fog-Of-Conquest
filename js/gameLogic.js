// js/gameLogic.js

import { ROWS, COLS, TERRAIN, TERR_COST, TERR_DEF, generateMap } from './map.js';
import { initRendering, redraw, updateFog }                       from './rendering.js';

// Типы юнитов
export const UNIT_TYPES = {
  swordsman: { move:2, atk:2, def:1, range:1, hpMax:5, cost:3, color:'#a00' },
  archer:    { move:2, atk:3, def:0, range:2, hpMax:4, cost:3, color:'#0a0' },
  heavy:     { move:1, atk:3, def:2, range:1, hpMax:6, cost:5, color:'#000' },
  cavalry:   { move:3, atk:3, def:1, range:1, hpMax:6, cost:6, color:'#08a' },
  mage:      { move:2, atk:0, def:0, range:0, hpMax:4, cost:7, color:'#88f' },
  bog:       { move:0, atk:2, def:1, range:1, hpMax:1000, cost:0, color:'#fff' }
};

// Типы зданий
export const BUILD_TYPES = {
  base:      { spawn:['swordsman','archer','bog'], gen:0 },
  barracks:  { spawn:['heavy'], gen:0 },
  stable:    { spawn:['cavalry'], gen:0 },
  mageTower: { spawn:['mage'], gen:0 },
  mine:      { spawn:[], gen:1 },
  lumber:    { spawn:[], gen:1 },
  fort:      { spawn:[], gen:0, def:+2 }
};

// Короткие метки зданий
export const BUILD_LABELS = {
  base:'баз', barracks:'каз', stable:'кон', mageTower:'баш',
  mine:'руд', lumber:'лес', fort:'форт'
};

// Глобальное состояние
window.state = {
  currentPlayer: 1,
  gold:           {1:5,2:5},
  fog:            {},
  seen:           {},
  turn:           1
};
window.buildings = [];
window.units     = [];
window.sel       = null;
window.zoneMap   = null;
window.zoneList  = [];
window.spawnB    = null;
let continueAfterOverlay;

// Инициализация игры (генерация карты + подготовка fog/seen)
export function initGame() {
  generateMap();
  [1,2].forEach(p=>{
    window.state.fog[p]  = Array.from({length:ROWS},()=>Array(COLS).fill(true));
    window.state.seen[p] = Array.from({length:ROWS},()=>Array(COLS).fill(false));
  });
  window.units.forEach(u => u.mp = UNIT_TYPES[u.type].move);
  prepareTurn(1);
}

// Подготовка хода игрока p
function prepareTurn(p) {
  window.state.currentPlayer = p;
  window.units.filter(u=>u.owner===p).forEach(u=>u.mp = UNIT_TYPES[u.type].move);
  updateFog();
  redraw();
  drawStats();
}

// Отрисовка статистики
function drawStats() {
  const s = window.state;
  document.getElementById('stats').textContent =
    `Ход ${s.turn} | Игрок ${s.currentPlayer} | Золото: ${s.gold[s.currentPlayer]}`;
}

// Передача хода
function nextTurn() {
  document.getElementById('overlayMessage').textContent =
    `Передать ход игроку ${window.state.currentPlayer===1?2:1}?`;
  document.getElementById('overlay').style.display = 'flex';
  continueAfterOverlay = () => {
    window.sel = null;
    window.zoneMap = null;
    window.zoneList = [];
    window.spawnB = null;
    if (window.state.currentPlayer === 1) {
      window.state.turn++;
      prepareTurn(2);
    } else {
      prepareTurn(1);
    }
  };
}

// Расчёт зоны передвижения
function computeZone(u) {
  const rem = Array.from({length:ROWS},()=>Array(COLS).fill(-1));
  const q = [{r:u.r,c:u.c,mp:u.mp}];
  rem[u.r][u.c] = u.mp;
  while(q.length){
    const {r,c,mp} = q.shift();
    if(mp<=0) continue;
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc])=>{
      const rr = r+dr, cc = c+dc;
      if(rr<0||rr>=ROWS||cc<0||cc>=COLS) return;
      const cost = TERR_COST[window.map[rr][cc]];
      if(cost>mp) return;
      const left = mp-cost;
      if(left>rem[rr][cc]){
        rem[rr][cc] = left;
        q.push({r:rr,c:cc,mp:left});
      }
    });
  }
  const list = [];
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    if(rem[r][c]>=0 && !(r===u.r&&c===u.c)) list.push({r,c});
  }
  return {rem, list};
}

// Проверка безопасности для ближнего боя
function safeForMelee(att, def) {
  const defVal = UNIT_TYPES[def.type].def + TERR_DEF[window.map[att.r][att.c]];
  let ret = UNIT_TYPES[def.type].atk - defVal;
  return att.hp > (ret<1?1:ret);
}

// Выполнение атаки
function doAttack(att, def) {
  const info = UNIT_TYPES[att.type];
  let defVal = UNIT_TYPES[def.type].def + TERR_DEF[window.map[def.r][def.c]];
  let dmg = info.atk - defVal; if(dmg<1) dmg=1;
  if(def.type!=='bog') def.hp -= dmg;
  if(info.range===1 && def.hp>0){
    let attDef = UNIT_TYPES[att.type].def + TERR_DEF[window.map[att.r][att.c]];
    let rdmg = UNIT_TYPES[def.type].atk - attDef; if(rdmg<1) rdmg=1;
    if(att.type!=='bog') att.hp -= rdmg;
  }
  if(def.hp<=0 && def.type!=='bog') window.units.splice(window.units.indexOf(def),1);
  if(att.hp<=0 && att.type!=='bog') window.units.splice(window.units.indexOf(att),1);
}

// Спавн юнита
function spawn(type) {
  const p = window.state.currentPlayer;
  const cost = UNIT_TYPES[type].cost;
  if(window.state.gold[p]<cost) return alert('Не хватает золота');
  [[-1,0],[1,0],[0,-1],[0,1]].some(([dy,dx])=>{
    const rr=window.spawnB.r+dy, cc=window.spawnB.c+dx;
    if(rr<0||rr>=ROWS||cc<0||cc>=COLS) return false;
    if(window.buildings.find(b=>b.r===rr&&b.c===cc)||window.units.find(u=>u.r===rr&&u.c===cc))
      return false;
    window.units.push({r:rr,c:cc,owner:p,type,hp:UNIT_TYPES[type].hpMax,mp:0});
    window.state.gold[p] -= cost;
    document.getElementById('spawnPanel')?.remove();
    updateFog(); redraw(); drawStats();
    return true;
  });
}

// Логика кликов по canvas
document.getElementById('canvas').addEventListener('click', e => {
  const rect = document.getElementById('canvas').getBoundingClientRect();
  const c = Math.floor((e.clientX-rect.left) / (canvas.width/COLS));
  const r = Math.floor((e.clientY-rect.top) / (canvas.height/ROWS));
  const p = window.state.currentPlayer;

  // Возможности телепорта bog
  if(window.sel && window.sel.type==='bog'){
    if(!window.units.find(u=>u.r===r&&u.c===c) && window.map[r][c]!==TERRAIN.MOUNTAIN){
      window.sel.r=r; window.sel.c=c; window.sel.mp=0;
      window.sel=null; window.zoneMap=null; window.zoneList=[];
      updateFog(); redraw(); return;
    }
  }

  // Авто-атака
  let tgt = window.units.find(u=>u.r===r&&u.c===c&&u.owner!==p);
  if(tgt){
    let best=null, bestD=Infinity;
    window.units.filter(u=>u.owner===p&&u.mp>0).forEach(u=>{
      const info=UNIT_TYPES[u.type];
      const {rem,list}=computeZone(u);
      const d0=Math.abs(u.r-tgt.r)+Math.abs(u.c-tgt.c);
      if(d0<=info.range){
        if(d0<bestD){ best={u,cell:{r:u.r,c:u.c}}; bestD=d0; }
      } else {
        list.forEach(z=>{
          const d1=Math.abs(z.r-tgt.r)+Math.abs(z.c-tgt.c);
          if(d1<=info.range && d1<bestD){
            best={u,cell:z}; bestD=d1;
          }
        });
      }
    });
    if(best){
      const u=best.u, z=best.cell;
      u.r=z.r; u.c=z.c; u.mp=0;
      doAttack(u, tgt);
      window.sel=null; window.zoneMap=null; window.zoneList=[];
      updateFog(); redraw(); return;
    }
  }

  // ... здесь остальной код выбора/движения/спавна, аналогично монолиту ...

  redraw();
});

// Первичная инициализация обработчиков и рендера
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('oneBtn').onclick = () => {};
  document.getElementById('twoBtn').onclick = () => {
    document.getElementById('startPanel').style.display = 'none';
    initGame();
  };
  document.getElementById('toggleFogBtn').onclick = () => {
    const btn = document.getElementById('toggleFogBtn');
    btn.textContent = btn.textContent==='Скрыть туман'?'Показать туман':'Скрыть туман';
    redraw();
  };
  document.getElementById('endTurnBtn').onclick = nextTurn;
  document.getElementById('confirmBtn').onclick = () => {
    document.getElementById('overlay').style.display = 'none';
    continueAfterOverlay();
  };

  initRendering();
  updateFog();
  redraw();
  drawStats();
});