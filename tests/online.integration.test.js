/** @jest-environment node */
const fs = require('fs');
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const {JSDOM} = require('jsdom');
const { Server } = require('ws');
const WebSocket = require('ws');

function makeServer(){
  const wss = new Server({port:0});
  wss.on('connection', ws => {
    ws.on('message', data => {
      wss.clients.forEach(cl => {
        if(cl !== ws && cl.readyState === WebSocket.OPEN) cl.send(data);
      });
    });
  });
  return new Promise(res => wss.on('listening', () => res(wss)));
}

function createClient(port){
  const html = fs.readFileSync('index.html','utf8');
  const dom = new JSDOM(html, {
    runScripts:'dangerously',
    resources:'usable',
    url:`file://${process.cwd()}/index.html`,
    beforeParse(win){ win.WebSocket = WebSocket; }
  });
  const {window} = dom;
  window.requestAnimationFrame = cb => cb();
  window.cancelAnimationFrame = () => {};
  window.HTMLCanvasElement.prototype.getContext = () => ({
    fillRect:()=>{}, clearRect:()=>{}, beginPath:()=>{}, arc:()=>{}, fill:()=>{},
    stroke:()=>{}, strokeRect:()=>{}, setLineDash:()=>{}, fillText:()=>{},
    moveTo:()=>{}, lineTo:()=>{}, createPattern:()=>{}, drawImage:()=>{}
  });
  return new Promise(res => {
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        const conn = window.connect(`ws://localhost:${port}`);
        window.attachConnection(conn);
        res(window);
      }, 0);
    });
  });
}

describe.skip('online sync', () => {
  let server, port;
  beforeAll(async () => {
    server = await makeServer();
    port = server.address().port;
  });
  afterAll(() => server.close());

  test('move and end turn sync', async () => {
    const w1 = await createClient(port);
    const w2 = await createClient(port);
    w1.document.getElementById('twoBtn').click();
    w2.document.getElementById('twoBtn').click();
    const u1 = {id:1,r:0,c:0,owner:1,type:'swordsman',hp:w1.UNIT_TYPES.swordsman.hpMax,mp:w1.UNIT_TYPES.swordsman.move,startR:0,startC:0};
    const u2 = {id:2,r:1,c:0,owner:2,type:'swordsman',hp:w1.UNIT_TYPES.swordsman.hpMax,mp:w1.UNIT_TYPES.swordsman.move,startR:1,startC:0};
    w1.units.length = 0; w2.units.length = 0;
    w1.units.push({...u1},{...u2});
    w2.units.push({...u1},{...u2});
    w1.buildings.length=0; w2.buildings.length=0;
    const canvas1 = w1.document.getElementById('canvas');
    const canvas2 = w2.document.getElementById('canvas');
    canvas1.getBoundingClientRect = () => ({left:0,top:0,width:canvas1.width,height:canvas1.height});
    canvas2.getBoundingClientRect = () => ({left:0,top:0,width:canvas2.width,height:canvas2.height});
    const cellW = canvas1.width / w1.map[0].length;
    const cellH = canvas1.height / w1.map.length;
    function click(win,r,c){
      win.document.getElementById('canvas').dispatchEvent(
        new win.MouseEvent('click',{clientX:(c+0.5)*cellW,clientY:(r+0.5)*cellH})
      );
    }
    click(w1,0,0);
    click(w1,0,1);
    await new Promise(r=>setTimeout(r,50));
    expect(w2.units.find(u=>u.id===1).c).toBe(1);
    w1.document.getElementById('endTurnBtn').click();
    w1.document.getElementById('yesBtn').click();
    await new Promise(r=>setTimeout(r,50));
    expect(w2.state.currentPlayer).toBe(2);
    expect(w1.replayEvents).toEqual(w2.replayEvents);
  }, 10000);

  test('attack sync', async () => {
    const w1 = await createClient(port);
    const w2 = await createClient(port);
    w1.document.getElementById('twoBtn').click();
    w2.document.getElementById('twoBtn').click();
    const u1 = {id:1,r:0,c:0,owner:1,type:'swordsman',hp:w1.UNIT_TYPES.swordsman.hpMax,mp:w1.UNIT_TYPES.swordsman.move,startR:0,startC:0};
    const u2 = {id:2,r:0,c:1,owner:2,type:'swordsman',hp:1,mp:w1.UNIT_TYPES.swordsman.move,startR:0,startC:1};
    w1.units.length = 0; w2.units.length = 0;
    w1.units.push({...u1},{...u2});
    w2.units.push({...u1},{...u2});
    w1.buildings.length=0; w2.buildings.length=0;
    const canvas1 = w1.document.getElementById('canvas');
    const canvas2 = w2.document.getElementById('canvas');
    canvas1.getBoundingClientRect = () => ({left:0,top:0,width:canvas1.width,height:canvas1.height});
    canvas2.getBoundingClientRect = () => ({left:0,top:0,width:canvas2.width,height:canvas2.height});
    const cellW = canvas1.width / w1.map[0].length;
    const cellH = canvas1.height / w1.map.length;
    function click(win,r,c){
      win.document.getElementById('canvas').dispatchEvent(
        new win.MouseEvent('click',{clientX:(c+0.5)*cellW,clientY:(r+0.5)*cellH})
      );
    }
    click(w1,0,0);
    click(w1,0,1);
    await new Promise(r=>setTimeout(r,50));
    expect(w2.units.length).toBe(1);
    expect(w2.units[0].owner).toBe(1);
    expect(w1.replayEvents).toEqual(w2.replayEvents);
  }, 10000);
});
