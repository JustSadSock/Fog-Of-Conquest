// tests/core.test.js

/**
 * Базовые юнит-тесты для core.js
 * Для запуска: выполните `npm install` и затем `npm test`
 */

const fs = require('fs');
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const { JSDOM } = require('jsdom');
HTMLCanvasElement.prototype.getContext = () => {
  return {
    fillRect:()=>{}, clearRect:()=>{}, beginPath:()=>{}, arc:()=>{}, fill:()=>{},
    stroke:()=>{}, strokeRect:()=>{}, setLineDash:()=>{}, fillText:()=>{},
    moveTo:()=>{}, lineTo:()=>{}, createPattern:()=>{}, drawImage:()=>{}
  };
};

describe('Fog of Conquest core', () => {
  let document, window, coreScript;

  beforeAll(async () => {
    const html = fs.readFileSync('index.html', 'utf8');
    const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", url: `file://${process.cwd()}/index.html` });
    document = dom.window.document;
    window = dom.window;
    global.requestAnimationFrame = cb => setTimeout(cb,0);
    global.cancelAnimationFrame = id => clearTimeout(id);
    window.requestAnimationFrame = global.requestAnimationFrame;
    window.cancelAnimationFrame = global.cancelAnimationFrame;
    window.HTMLCanvasElement.prototype.getContext = () => ({
      fillRect:()=>{}, clearRect:()=>{}, beginPath:()=>{}, arc:()=>{}, fill:()=>{},
      stroke:()=>{}, strokeRect:()=>{}, setLineDash:()=>{}, fillText:()=>{},
      moveTo:()=>{}, lineTo:()=>{}, createPattern:()=>{}, drawImage:()=>{}
    });

    await new Promise(res => {
      document.addEventListener('DOMContentLoaded', () => {
        res();
      });
    });
    // запускаем новую игру
    document.getElementById('twoBtn').click();
  });

  test('canvas существует и имеет правильные размеры', () => {
    const canvas = document.getElementById('canvas');
    expect(canvas).toBeTruthy();
    expect(canvas.width).toBeGreaterThan(0);
    expect(canvas.height).toBeGreaterThan(0);
  });

  test('при инициализации создаются две базы', () => {
    const buildings = window.buildings;
    const bases = buildings.filter(b => b.type === 'base');
    expect(bases.length).toBe(2);
  });

  test('постройки имеют HP по умолчанию', () => {
    const { buildings, BUILD_TYPES } = window;
    buildings.forEach(b => {
      expect(b.hp).toBe(BUILD_TYPES[b.type].hpMax);
    });
  });

  test('юниты имеют корректные HP и MP после инициализации', () => {
    const units = window.units;
    units.forEach(u => {
      const info = window.UNIT_TYPES[u.type];
      expect(u.hp).toBe(info.hpMax);
      expect(u.mp).toBe(info.move);
    });
  });

  test('спавнер не помещает юнитов в горы', () => {
    const spawnZones = window.spawnZones;
    spawnZones.forEach(z => {
      expect(window.map[z.r][z.c]).not.toBe(window.TERRAIN.MOUNTAIN);
    });
  });

  test('freeCell returns null on a nearly full map', () => {
    const { map, TERRAIN, freeCell } = window;
    for(let r=0; r<map.length; r++){
      for(let c=0; c<map[r].length; c++){
        map[r][c] = TERRAIN.MOUNTAIN;
      }
    }
    expect(freeCell(1)).toBeNull();
  });

  test('AI ignores units hidden by fog', () => {
    const { state, units, aiTakeTurn, UNIT_TYPES } = window;
    const aiUnit = units.find(u => u.owner === 2);
    const enemy = units.find(u => u.owner === 1);
    enemy.r = aiUnit.r;
    enemy.c = aiUnit.c + 1;

    if(!state.fog[2]){
      const rows = window.map.length;
      const cols = window.map[0].length;
      state.fog[2]  = Array.from({length:rows},()=>Array(cols).fill(true));
      state.seen[2] = Array.from({length:rows},()=>Array(cols).fill(false));
    }
    state.fog[2].forEach((row, r) => row.forEach((_, c) => {
      state.fog[2][r][c] = true;
      state.seen[2][r][c] = false;
    }));
    state.fog[2][aiUnit.r][aiUnit.c] = false;

    const hpBefore = enemy.hp;
    aiTakeTurn();
    expect(enemy.hp).toBe(hpBefore);
  });

  test('AI spawns counter unit based on enemy composition', () => {
    const { state, units, aiTakeTurn } = window;
    document.getElementById('twoBtn').click();
    state.currentPlayer = 2;
    state.gold[2] = 4;
    const rows = window.map.length, cols = window.map[0].length;
    state.fog[2] = Array.from({length:rows},()=>Array(cols).fill(false));
    state.seen[2] = Array.from({length:rows},()=>Array(cols).fill(true));
    units.filter(u=>u.owner===2).forEach(u=>units.splice(units.indexOf(u),1));
    units.filter(u=>u.owner===1 && u.type==='swordsman').forEach(u=>units.splice(units.indexOf(u),1));
    const countBefore = units.length;
    aiTakeTurn();
    const spawned = units.find((u,i)=>i>=countBefore && u.owner===2);
    expect(spawned.type).toBe('archer');
  });

  test('AI prefers expensive unit when affordable', () => {
    const { state, units, BUILD_TYPES, aiTakeTurn, UNIT_TYPES } = window;
    document.getElementById('twoBtn').click();
    const original = [...BUILD_TYPES.base.spawn];
    BUILD_TYPES.base.spawn = ['swordsman','heavy'];
    const enemy = units.find(u=>u.owner===1);
    enemy.type = 'heavy';
    enemy.hp = UNIT_TYPES.heavy.hpMax;
    enemy.mp = UNIT_TYPES.heavy.move;
    units.filter(u=>u.owner===2).forEach(u=>units.splice(units.indexOf(u),1));
    state.currentPlayer = 2;
    state.gold[2] = 5;
    const rows = window.map.length, cols = window.map[0].length;
    state.fog[2] = Array.from({length:rows},()=>Array(cols).fill(false));
    state.seen[2] = Array.from({length:rows},()=>Array(cols).fill(true));
    const countBefore = units.length;
    aiTakeTurn();
    const spawned = units.find((u,i)=>i>=countBefore && u.owner===2);
    expect(spawned.type).toBe('heavy');
    BUILD_TYPES.base.spawn = original;
  });

  test('computeDistanceMap accounts for terrain cost', () => {
    const { map, TERRAIN, computeDistanceMap } = window;
    document.getElementById('twoBtn').click();
    for(let r=0;r<2;r++)for(let c=0;c<5;c++) map[r][c]=TERRAIN.PLAIN;
    map[0][1]=TERRAIN.WATER;
    map[0][2]=TERRAIN.WATER;
    map[0][3]=TERRAIN.WATER;
    const dist = computeDistanceMap([{r:0,c:4}]);
    expect(dist[0][0]).toBe(6);
  });

  test('AI avoids high-cost terrain when possible', () => {
    const { map, TERRAIN, units, buildings, state, aiTakeTurn, UNIT_TYPES } = window;
    document.getElementById('twoBtn').click();
    units.length = 0;
    buildings.length = 0;
    for(let r=0;r<2;r++)for(let c=0;c<5;c++) map[r][c]=TERRAIN.PLAIN;
    map[0][1]=TERRAIN.WATER;
    map[0][2]=TERRAIN.WATER;
    map[0][3]=TERRAIN.WATER;
    buildings.push({r:0,c:4,owner:1,type:'base'});
    units.push({id:1,r:0,c:0,owner:2,type:'swordsman',hp:UNIT_TYPES.swordsman.hpMax,mp:UNIT_TYPES.swordsman.move,startR:0,startC:0});
    state.currentPlayer = 2;
    const rows = map.length, cols = map[0].length;
    state.fog[2] = Array.from({length:rows},()=>Array(cols).fill(false));
    state.seen[2] = Array.from({length:rows},()=>Array(cols).fill(true));
    const u = units[0];
    aiTakeTurn();
    expect(u.r).toBe(1);
    expect(u.c).toBe(1);
  });

  test('nextTurn applies per-building income', () => {
    const { buildings, state, nextTurn } = window;
    document.getElementById('twoBtn').click();
    const mine = buildings.find(b => b.owner === 2 && b.type === 'mine');
    mine.gen = 2;
    state.gold[2] = 5;
    state.currentPlayer = 1;
    nextTurn();
    expect(state.gold[2]).toBe(7);
  });

  test('building takes damage and is captured after repeated occupation', () => {
    const { map, TERRAIN, buildings, units, state, BUILD_TYPES, UNIT_TYPES } = window;
    document.getElementById('twoBtn').click();
    units.length = 0;
    buildings.length = 0;
    for(let r=0;r<3;r++)for(let c=0;c<3;c++) map[r][c]=TERRAIN.PLAIN;
    buildings.push({r:0,c:1,owner:1,type:'base',gen:BUILD_TYPES.base.gen,hp:BUILD_TYPES.base.hpMax});
    units.push({id:1,r:0,c:0,owner:2,type:'swordsman',hp:UNIT_TYPES.swordsman.hpMax,mp:UNIT_TYPES.swordsman.move,startR:0,startC:0});
    units.push({id:2,r:0,c:1,owner:1,type:'swordsman',hp:1,mp:UNIT_TYPES.swordsman.move,startR:0,startC:1});
    state.currentPlayer = 2;
    const canvas = document.getElementById('canvas');
    canvas.getBoundingClientRect = () => ({left:0,top:0,width:canvas.width,height:canvas.height});
    const cellW = canvas.width / map[0].length;
    const cellH = canvas.height / map.length;
    function clickCell(r,c){
      canvas.dispatchEvent(new window.MouseEvent('click',{clientX:(c+0.5)*cellW,clientY:(r+0.5)*cellH}));
    }
    // kill defender and move onto building (damage)
    clickCell(0,0);
    clickCell(0,1);
    expect(buildings[0].owner).toBe(1);
    expect(buildings[0].hp).toBe(BUILD_TYPES.base.hpMax-1);
    for(let i=1;i<BUILD_TYPES.base.hpMax;i++){
      window.damageBuilding(buildings[0],2);
    }
    expect(buildings[0].owner).toBe(1);
    expect(buildings[0].hp).toBe(0);
    window.attemptCapture(units[0], buildings[0]);
    expect(buildings[0].owner).toBe(2);
    expect(buildings[0].hp).toBe(BUILD_TYPES.base.hpMax);
  });

  test('archer damages building from range', () => {
    const { map, TERRAIN, buildings, units, state, BUILD_TYPES, UNIT_TYPES, doAttackBuilding } = window;
    document.getElementById('twoBtn').click();
    units.length = 0;
    buildings.length = 0;
    for(let r=0;r<3;r++)for(let c=0;c<3;c++) map[r][c]=TERRAIN.PLAIN;
    buildings.push({r:0,c:1,owner:1,type:'base',gen:BUILD_TYPES.base.gen,hp:BUILD_TYPES.base.hpMax});
    units.push({id:1,r:0,c:0,owner:2,type:'archer',hp:UNIT_TYPES.archer.hpMax,mp:UNIT_TYPES.archer.move,startR:0,startC:0});
    state.currentPlayer = 2;
    const archer = units[0];
    const base = buildings[0];
    const res = doAttackBuilding(archer, base);
    expect(res.dmg).toBe(2);
    expect(base.hp).toBe(BUILD_TYPES.base.hpMax - 2);
    expect(base.owner).toBe(1);
    doAttackBuilding(archer, base);
    expect(base.owner).toBe(1);
    expect(base.hp).toBe(0);
    // move archer onto the building and capture
    archer.r = base.r;
    archer.c = base.c;
    window.attemptCapture(archer, base);
    expect(base.owner).toBe(2);
    expect(base.hp).toBe(BUILD_TYPES.base.hpMax);
  });

  test('mage highlights adjacent injured allies', async () => {
    const draws = [];
    HTMLCanvasElement.prototype.getContext = () => {
      return {
        strokeStyle:'', lineWidth:0,
        setLineDash:()=>{},
        strokeRect:()=>{},
        drawImage:function(img,x,y,w,h){draws.push({img,x,y,w,h});},
        fillRect:()=>{}, clearRect:()=>{}, beginPath:()=>{}, arc:()=>{}, fill:()=>{},
        stroke:()=>{}, fillText:()=>{}, moveTo:()=>{}, lineTo:()=>{}, closePath:()=>{}, createPattern:()=>{}
      };
    };
    const html = fs.readFileSync('index.html','utf8');
    const dom = new JSDOM(html,{runScripts:'dangerously',resources:'usable',url:`file://${process.cwd()}/index.html`});
    const win = dom.window;
    const { document } = win;
    win.requestAnimationFrame = cb => cb();
    win.cancelAnimationFrame = () => {};
    win.HTMLCanvasElement.prototype.getContext = HTMLCanvasElement.prototype.getContext;
    await new Promise(res=>document.addEventListener('DOMContentLoaded',res));
    document.getElementById('betaBtn').click();
    const { units, map, TERRAIN, UNIT_TYPES } = win;
    units.length = 0;
    map[5][5]=TERRAIN.PLAIN; map[5][6]=TERRAIN.PLAIN;
    units.push({id:1,r:5,c:5,owner:1,type:'mage',hp:UNIT_TYPES.mage.hpMax,mp:UNIT_TYPES.mage.move,startR:5,startC:5});
    units.push({id:2,r:5,c:6,owner:1,type:'swordsman',hp:UNIT_TYPES.swordsman.hpMax-1,mp:UNIT_TYPES.swordsman.move,startR:5,startC:6});
    document.getElementById('revealBtn').click();
    draws.length=0;
    const canvas=document.getElementById('canvas');
    canvas.getBoundingClientRect=()=>({left:0,top:0,width:canvas.width,height:canvas.height});
    const cellW=canvas.width/map[0].length, cellH=canvas.height/map.length;
    canvas.dispatchEvent(new win.MouseEvent('click',{clientX:(5.5)*cellW,clientY:(5.5)*cellH}));
    const highlight=draws.find(d=>d.img && /green_selection/.test(d.img.src));
    expect(highlight).toBeDefined();
    expect(highlight.x).toBeCloseTo(6*cellW);
    expect(highlight.y).toBeCloseTo(5*cellH);
  });

  test('beta mode initialization enables bog spawn and reveal toggling', async () => {
    const strokes = [];
    HTMLCanvasElement.prototype.getContext = () => {
      return {
        fillRect:()=>{}, clearRect:()=>{}, beginPath:()=>{}, arc:()=>{}, fill:()=>{},
        stroke:()=>{}, strokeRect:()=>{}, setLineDash:()=>{}, fillText:()=>{},
        moveTo:()=>{}, lineTo:()=>{}, closePath:()=>{}, createPattern:()=>{}, drawImage:()=>{}
      };
    };
    const html = fs.readFileSync('index.html','utf8');
    const dom = new JSDOM(html,{runScripts:'dangerously',resources:'usable',url:`file://${process.cwd()}/index.html`});
    const win = dom.window;
    const { document } = win;
    win.requestAnimationFrame = cb => cb();
    win.cancelAnimationFrame = () => {};
    win.HTMLCanvasElement.prototype.getContext = HTMLCanvasElement.prototype.getContext;
    await new Promise(res=>document.addEventListener('DOMContentLoaded',res));
    document.getElementById('betaBtn').click();

    expect(win.BUILD_TYPES.base.spawn).toContain('bog');
    expect(win.units.some(u => u.type === 'bog')).toBe(true);
    const reveal=document.getElementById('revealBtn');
    expect(reveal.style.display).not.toBe('none');

    const beforeText=reveal.textContent;
    reveal.click();
    const afterText=reveal.textContent;
    expect(beforeText).toBe('Показать карту');
    expect(afterText).toBe('Скрыть карту');
  });

  test('combat and capture work in beta mode', () => {
    const { map, TERRAIN, buildings, units, state, BUILD_TYPES, UNIT_TYPES } = window;
    document.getElementById('betaBtn').click();
    document.getElementById('revealBtn').click();
    units.length = 0;
    buildings.length = 0;
    for(let r=0;r<3;r++)for(let c=0;c<3;c++) map[r][c] = TERRAIN.PLAIN;
    buildings.push({ r:0, c:1, owner:1, type:'base', gen:BUILD_TYPES.base.gen, hp:BUILD_TYPES.base.hpMax });
    units.push({ id:1, r:0, c:0, owner:2, type:'swordsman', hp:UNIT_TYPES.swordsman.hpMax, mp:UNIT_TYPES.swordsman.move, startR:0, startC:0 });
    units.push({ id:2, r:0, c:1, owner:1, type:'swordsman', hp:1, mp:UNIT_TYPES.swordsman.move, startR:0, startC:1 });
    state.currentPlayer = 2;
    const canvas = document.getElementById('canvas');
    canvas.getBoundingClientRect = () => ({left:0,top:0,width:canvas.width,height:canvas.height});
    const cellW = canvas.width / map[0].length;
    const cellH = canvas.height / map.length;
    const click = (r,c) => canvas.dispatchEvent(new window.MouseEvent('click', {clientX:(c+0.5)*cellW, clientY:(r+0.5)*cellH}));
    click(0,0); // select attacker
    click(0,1); // attack and move onto building
    expect(buildings[0].owner).toBe(1);
    expect(buildings[0].hp).toBe(BUILD_TYPES.base.hpMax - 1);
    for(let i=1;i<BUILD_TYPES.base.hpMax;i++) window.damageBuilding(buildings[0],2);
    expect(buildings[0].owner).toBe(1);
    expect(buildings[0].hp).toBe(0);
    window.attemptCapture(units[0], buildings[0]);
    expect(buildings[0].owner).toBe(2);
    expect(buildings[0].hp).toBe(BUILD_TYPES.base.hpMax);
  });

  test('unit spawning works in beta mode', () => {
    const { map, TERRAIN, buildings, units, state, BUILD_TYPES } = window;
    document.getElementById('betaBtn').click();
    document.getElementById('revealBtn').click();
    units.length = 0;
    buildings.length = 0;
    for(let r=0;r<3;r++)for(let c=0;c<3;c++) map[r][c] = TERRAIN.PLAIN;
    buildings.push({ r:1, c:1, owner:1, type:'base', gen:BUILD_TYPES.base.gen, hp:BUILD_TYPES.base.hpMax });
    state.currentPlayer = 1;
    const canvas = document.getElementById('canvas');
    canvas.getBoundingClientRect = () => ({left:0,top:0,width:canvas.width,height:canvas.height});
    const cellW = canvas.width / map[0].length;
    const cellH = canvas.height / map.length;
    const click = (r,c) => canvas.dispatchEvent(new window.MouseEvent('click', {clientX:(c+0.5)*cellW, clientY:(r+0.5)*cellH}));
    click(1,1); // select base
    document.getElementById('spawnPanel').querySelector('button').click();
    click(0,1); // spawn above base
    const spawned = units.find(u => u.owner === 1 && u.r === 0 && u.c === 1 && u.type === 'swordsman');
    expect(spawned).toBeDefined();
  });

  test('starting a new match resets fog after resizing', () => {
    const { state } = window;
    state.seen[1][0][0] = true;
    state.fog[1][0][0] = false;
    document.getElementById('mapSizeSelect').value = 'large';
    document.getElementById('twoBtn').click();
    const rows = window.map.length, cols = window.map[0].length;
    const r = Math.floor(rows/2), c = Math.floor(cols/2);
    expect(state.seen[1].length).toBe(rows);
    expect(state.seen[1][0].length).toBe(cols);
    expect(state.seen[1][r][c]).toBe(false);
    expect(state.fog[1][r][c]).toBe(true);
  });

  test('resetState fully reinitializes fog and clears snapshot', () => {
    const { state, resetState } = window;
    document.getElementById('twoBtn').click();
    state.fog[1][0][0] = false;
    state.seen[1][0][0] = true;
    state.fog[2][0][0] = false;
    state.seen[2][0][0] = true;
    window.fogSnapshot = [[false]];
    resetState();
    const rows = window.map.length, cols = window.map[0].length;
    [1,2].forEach(p=>{
      expect(state.fog[p].length).toBe(rows);
      expect(state.fog[p][0].length).toBe(cols);
      expect(state.fog[p].every(row=>row.every(v=>v===true))).toBe(true);
      expect(state.seen[p].every(row=>row.every(v=>v===false))).toBe(true);
    });
    expect(window.fogSnapshot).toBeNull();
  });

  test('terrain distribution is balanced and clustered', () => {
    document.getElementById('twoBtn').click();
    const { map, TERRAIN } = window;
    const rows = map.length, cols = map[0].length;
    const counts = {0:0,1:0,2:0,3:0,4:0};
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++) counts[map[r][c]]++;
    [TERRAIN.WATER,TERRAIN.FOREST,TERRAIN.HILL,TERRAIN.MOUNTAIN].forEach(t=>{
      expect(counts[t]).toBeGreaterThan(0);
    });

    const isolated = {1:0,2:0,3:0,4:0};
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      const t=map[r][c];
      if(t===TERRAIN.PLAIN) continue;
      const neighbours=[[1,0],[-1,0],[0,1],[0,-1]]
        .some(([dr,dc])=>{
          const rr=r+dr, cc=c+dc;
          return rr>=0&&rr<rows&&cc>=0&&cc<cols && map[rr][cc]===t;
        });
      if(!neighbours) isolated[t]++;
    }
    [TERRAIN.WATER,TERRAIN.FOREST,TERRAIN.HILL,TERRAIN.MOUNTAIN].forEach(t=>{
      const ratio=isolated[t]/counts[t];
      expect(ratio).toBeLessThan(0.6);
    });
  });
});
