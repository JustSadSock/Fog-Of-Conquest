// tests/core.test.js

/**
 * Базовые юнит-тесты для core.js
 * Для запуска: установите Jest и выполните `jest tests/core.test.js`
 */

const fs = require('fs');
const { JSDOM } = require('jsdom');

describe('Fog of Conquest core', () => {
  let document, window, coreScript;

  beforeAll(async () => {
    const html = fs.readFileSync('index.html', 'utf8');
    const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable" });
    document = dom.window.document;
    window = dom.window;

    // Ждём загрузки core.js
    await new Promise(res => {
      document.addEventListener('DOMContentLoaded', () => {
        res();
      });
    });
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
});
