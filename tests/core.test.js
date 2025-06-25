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
});
