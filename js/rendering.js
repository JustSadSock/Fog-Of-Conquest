// js/rendering.js

import { ROWS, COLS, TERRAIN, TERR_COL } from './map.js';

let canvas, ctx, cellW, cellH;

/**
 * Инициализация canvas и resize-обработчика.
 */
export function initRendering() {
  canvas = document.getElementById('canvas');
  ctx    = canvas.getContext('2d');
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
}

/**
 * Меняет размеры canvas и пересчитывает размеры ячеек.
 */
function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  cellW = canvas.width  / COLS;
  cellH = canvas.height / ROWS;
  redraw();
}

/**
 * Отрисовывает всю сцену: terrain, туман, здания, юнитов, подсветки.
 */
export function redraw() {
  if (!canvas) return;
  const p = window.state.currentPlayer;
  const fog = window.state.fog[p];
  const seen = window.state.seen[p];

  // Terrain + fog layer
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * cellW, y = r * cellH;
      if (!seen[r][c]) {
        ctx.fillStyle = '#000';
        ctx.fillRect(x, y, cellW, cellH);
      } else {
        ctx.fillStyle = TERR_COL[window.map[r][c]];
        ctx.fillRect(x, y, cellW, cellH);
        if (fog[r][c]) {
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(x, y, cellW, cellH);
        }
      }
    }
  }

  // Buildings
  window.buildings.forEach(b => {
    if (!seen[b.r][b.c] || fog[b.r][b.c]) return;
    let col = b.owner === 1 ? '#f80' : b.owner === 2 ? '#08f' : '#666';
    ctx.fillStyle = col;
    ctx.fillRect(b.c * cellW + cellW*0.1, b.r * cellH + cellH*0.1, cellW*0.8, cellH*0.8);
    ctx.fillStyle = '#fff';
    ctx.fillText(window.BUILD_LABELS[b.type], b.c*cellW + cellW*0.15, b.r*cellH + cellH*0.6);
  });

  // Units + HP bars
  window.units.forEach(u => {
    if (!seen[u.r][u.c] || fog[u.r][u.c]) return;
    const cx = u.c*cellW + cellW/2;
    const cy = u.r*cellH + cellH/2;
    const rad = Math.min(cellW,cellH)/3;
    ctx.fillStyle = window.UNIT_TYPES[u.type].color;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, 2*Math.PI);
    ctx.fill();

    // HP bar
    const w = cellW*0.6, h = cellH*0.1;
    const bx = u.c*cellW + (cellW-w)/2, by = u.r*cellH + cellH*0.1;
    ctx.fillStyle = '#600';
    ctx.fillRect(bx, by, w, h);
    const frac = u.hp / window.UNIT_TYPES[u.type].hpMax;
    ctx.fillStyle = u.owner === window.state.currentPlayer ? '#0f0' : '#f00';
    ctx.fillRect(bx, by, w*frac, h);
  });

  // Selection highlight
  const sel = window.sel;
  if (sel) {
    ctx.strokeStyle = 'yellow';
    ctx.lineWidth = 2;
    ctx.strokeRect(sel.c*cellW+2, sel.r*cellH+2, cellW-4, cellH-4);
  }
}

/**
 * Обновляет туман войны (state.fog, state.seen) для текущего игрока.
 */
export function updateFog() {
  const p = window.state.currentPlayer;
  const F = window.state.fog[p], S = window.state.seen[p];
  // reset fog
  for (let r=0; r<ROWS; r++) for (let c=0; c<COLS; c++) F[r][c]=true;
  // reveal around units/buildings
  [...window.buildings.filter(b=>b.owner===p), ...window.units.filter(u=>u.owner===p)]
    .forEach(o=>{
      const rad = window.map[o.r][o.c]===TERRAIN.FOREST ? 2 : 3;
      for (let dr=-rad; dr<=rad; dr++) for (let dc=-rad; dc<=rad; dc++){
        const rr=o.r+dr, cc=o.c+dc;
        if (rr<0||rr>=ROWS||cc<0||cc>=COLS) continue;
        if (Math.abs(dr)+Math.abs(dc)<=rad && hasLOS(o.r,o.c,rr,cc)) {
          F[rr][cc]=false;
          S[rr][cc]=true;
        }
      }
    });
}

// Простой Bresenham для линии видимости
function hasLOS(r0,c0,r1,c1){
  let dx = Math.abs(c1-c0), sx = c0<c1?1:-1;
  let dy = Math.abs(r1-r0), sy = r0<r1?1:-1;
  let err = dx-dy, e2;
  let x=c0, y=r0;
  while(true){
    if(window.map[y][x]===TERRAIN.MOUNTAIN && !(x===c0&&y===r0) && !(x===c1&&y===r1))
      return false;
    if(x===c1&&y===r1) break;
    e2 = err*2;
    if(e2>-dy){ err -= dy; x += sx; }
    if(e2< dx){ err += dx; y += sy; }
  }
  return true;
}
