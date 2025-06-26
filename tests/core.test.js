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
    moveTo:()=>{}, lineTo:()=>{}
  };
};

describe('Fog of Conquest core', () => {
  let document, window, coreScript;

  beforeAll(async () => {
    const html = fs.readFileSync('index.html', 'utf8');
    const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", url: `file://${process.cwd()}/index.html` });
    document = dom.window.document;
    window = dom.window;
    window.HTMLCanvasElement.prototype.getContext = () => ({
      fillRect:()=>{}, clearRect:()=>{}, beginPath:()=>{}, arc:()=>{}, fill:()=>{},
      stroke:()=>{}, strokeRect:()=>{}, setLineDash:()=>{}, fillText:()=>{},
      moveTo:()=>{}, lineTo:()=>{}
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
});
