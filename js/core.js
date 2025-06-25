// js/core.js

window.addEventListener('DOMContentLoaded',()=>{
  // === Утилиты ===
  const abs = Math.abs,
        randChoice = arr => arr[Math.random()*arr.length|0];

  // === DOM-элементы ===
  const startPanel = document.getElementById('startPanel'),
        twoBtn      = document.getElementById('twoBtn'),
        aiBtn       = document.getElementById('aiBtn'),
        betaBtn     = document.getElementById('betaBtn'),
        overlay     = document.getElementById('overlay'),
        overlayMsg  = document.getElementById('overlayMessage'),
        yesBtn      = document.getElementById('yesBtn'),
        noBtn       = document.getElementById('noBtn'),
        canvas      = document.getElementById('canvas'),
        ctx         = canvas.getContext('2d'),
        spawnPanel  = document.getElementById('spawnPanel'),
        revealBtn   = document.getElementById('revealBtn'),
        endTurnBtn  = document.getElementById('endTurnBtn'),
        leftStats   = document.getElementById('leftStats'),
        rightLog    = document.getElementById('rightLog'),
        menuBgm     = document.getElementById('menuBgm'),
        mapSizeSel  = document.getElementById('mapSizeSelect'),
        aiLevelSel  = document.getElementById('aiLevelSelect'),
        aiPanel     = document.getElementById('aiPanel'),
        aiStartBtn  = document.getElementById('aiStartBtn'),
        waitOverlay = document.getElementById('waitOverlay');

  menuBgm.volume = 0.5;
  menuBgm.play().catch(()=>{});

  // === Константы ===
  const BASE_ROWS = 30, BASE_COLS = 20;
  let ROWS = BASE_ROWS, COLS = BASE_COLS;
  let mapSize = 'medium';
  let aiMode = false, aiLevel = 2;
  const TERRAIN = { PLAIN:0, WATER:1, FOREST:2, HILL:3, MOUNTAIN:4 };
  const TERR_COL  = ['#a6d88c','#6db6f8','#2e8b3d','#d4b55c','#8d8d8d'];
  const TERR_COST = [1,2,1,2,999];
  const TERR_DEF  = [0,-1,1,2,0];

  const TERR_PAT = [];

  function makePatterns(){
    function pat(base, draw){
      const c = document.createElement('canvas');
      c.width = c.height = 32;
      const g = c.getContext('2d');
      g.fillStyle = base;
      g.fillRect(0,0,32,32);
      draw(g);
      return ctx.createPattern(c,'repeat');
    }
    TERR_PAT[TERRAIN.PLAIN] = pat('#b5e6a0', g=>{
      g.strokeStyle = 'rgba(140,200,120,0.4)';
      g.lineWidth = 0.5;
      for(let i=-32;i<32;i+=8){
        g.beginPath();
        g.moveTo(i,0); g.lineTo(i+32,32);
        g.stroke();
      }
    });
    TERR_PAT[TERRAIN.WATER] = pat('#5da9e9', g=>{
      g.strokeStyle = 'rgba(255,255,255,0.3)';
      g.lineWidth = 1;
      for(let y=4;y<32;y+=8){
        g.beginPath();
        g.arc(16,y,12,0,Math.PI,false);
        g.stroke();
      }
      g.strokeStyle = 'rgba(0,0,60,0.3)';
      for(let y=8;y<32;y+=8){
        g.beginPath();
        g.arc(16,y+2,12,0,Math.PI,false);
        g.stroke();
      }
    });
    TERR_PAT[TERRAIN.FOREST] = pat('#2c7534', g=>{
      g.fillStyle = 'rgba(20,50,20,0.6)';
      for(let x=0;x<32;x+=8){
        g.beginPath();
        g.moveTo(x+4,4);
        g.lineTo(x,16);
        g.lineTo(x+8,16);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(x+4,12);
        g.lineTo(x-2,24);
        g.lineTo(x+10,24);
        g.closePath();
        g.fill();
      }
    });
    TERR_PAT[TERRAIN.HILL] = pat('#e0c778', g=>{
      g.strokeStyle = 'rgba(195,170,85,0.6)';
      g.lineWidth = 0.8;
      for(let i=-32;i<32;i+=8){
        g.beginPath();
        g.moveTo(i,32); g.lineTo(i+32,0);
        g.stroke();
      }
    });
    TERR_PAT[TERRAIN.MOUNTAIN] = pat('#787878', g=>{
      g.fillStyle = 'rgba(130,130,130,0.7)';
      for(let x=0;x<32;x+=16){
        g.beginPath();
        g.moveTo(x+8,4);
        g.lineTo(x,32);
        g.lineTo(x+16,32);
        g.closePath();
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.3)';
        g.beginPath();
        g.moveTo(x+8,4);
        g.lineTo(x+4,16);
        g.lineTo(x+12,16);
        g.closePath();
        g.fill();
        g.fillStyle = 'rgba(130,130,130,0.7)';
      }
    });
  }

  const UNIT_TYPES = {
    swordsman:{move:2,atk:2,def:1,range:1,hpMax:5,cost:3,color:'#e74c3c'},
    archer:   {move:2,atk:3,def:0,range:2,hpMax:4,cost:3,color:'#2ecc71'},
    heavy:    {move:1,atk:3,def:2,range:1,hpMax:6,cost:5,color:'#2c3e50'},
    cavalry:  {move:3,atk:3,def:1,range:1,hpMax:5,cost:7,color:'#3498db'},
    mage:     {move:2,atk:0,def:0,range:1,hpMax:4,cost:7,color:'#9b59b6'},
    bog:      {move:1000,atk:2,def:1,range:1,hpMax:1000,cost:0,color:'#f1c40f'}
  };

  const BUILD_TYPES = {
    base:      {spawn:['swordsman','archer'],gen:0,def:1},
    barracks:  {spawn:['heavy'],gen:0,def:0},
    stable:    {spawn:['cavalry'],gen:0,def:0},
    mageTower: {spawn:['mage'],gen:0,def:0},
    mine:      {spawn:[],gen:1,def:0},
    lumber:    {spawn:[],gen:1,def:0},
    fort:      {spawn:[],gen:0,def:2}
  };

  const UNIT_LABELS = {
    swordsman:'Рубака',
    archer:'Стрелок',
    heavy:'Щитоносец',
    cavalry:'Всадник',
    mage:'Чародей',
    bog:'Бог'
  };
  const BUILD_LABELS = {
    base:'🏰',
    barracks:'⚔',
    stable:'🐴',
    mageTower:'🔮',
    mine:'⛏',
    lumber:'🪓',
    fort:'🏯'
  };

  // === Состояние ===
  let modeBeta = false,
      revealAll = false,
      gameOver = false,
      sel = null,
      zoneMap = null, zoneList = [],
      spawnMode = false, spawnType = null, spawnZones = [],
      continueAfter = null,
      fogSnapshot = null,
      aiReplay = [];

  Object.assign(window, { spawnZones });

  const state = {
    currentPlayer:1,
    turn:0,
    gold:{1:5,2:5},
    fog:{}, seen:{},
    grace:{1:null,2:null},
    log:{1:[],2:[]}
  };

  const map = [];
  const buildings = [], units = [];
  let nextUnitId = 1;

  // expose for tests
  Object.assign(window, { map, buildings, units, TERRAIN, UNIT_TYPES, BUILD_TYPES });

  let cellW, cellH;

  // === Лог событий ===
  function recordEvent(txt){
    const p = state.currentPlayer;
    state.log[p].push(txt);
    renderLog();
  }
  function recordTurn(){
    const p = state.currentPlayer;
    state.log[p].push(`--- Ход ${state.turn+1} ---`);
    renderLog();
  }
  function renderLog(){
    rightLog.innerHTML = '';
    state.log[state.currentPlayer].forEach(line => {
      const d = document.createElement('div');
      d.textContent = line;
      rightLog.appendChild(d);
    });
    rightLog.scrollTop = rightLog.scrollHeight;
  }

  function addReplay(evt,r,c){
    if(fogSnapshot && !fogSnapshot[r][c]) aiReplay.push(evt);
  }

  function animateMove(u,fr,fc,tr,tc,dur=400){
    u.animMove={fr,fc,tr,tc,start:Date.now(),dur};
    requestAnimationFrame(redraw);
  }
  function animateShake(u,dur=200){
    u.animShake={start:Date.now(),dur};
    requestAnimationFrame(redraw);
  }

  // === Resize & Fog init ===
  window.addEventListener('resize',()=>{
    const infoH = document.getElementById('infoPanel').offsetHeight;
    const size = Math.floor(Math.min(
      window.innerWidth / COLS,
      (window.innerHeight - infoH) / ROWS
    ));
    cellW = cellH = size;
    canvas.width  = cellW * COLS;
    canvas.height = cellH * ROWS;
    [1,2].forEach(p=>{
      state.fog[p]  = Array.from({length:ROWS},()=>Array(COLS).fill(true));
      state.seen[p] = Array.from({length:ROWS},()=>Array(COLS).fill(false));
    });
    updateAll();
  });

  // === Сброс перед новой игрой ===
  function resetState(){
    gameOver = false;
    revealAll = false;
    sel = null;
    zoneMap = null; zoneList = [];
    spawnMode = false; spawnType = null; spawnZones = [];
    window.spawnZones = spawnZones;
    continueAfter = null;
    state.currentPlayer = 1;
    state.turn = 0;
    state.gold = {1:5,2:5};
    state.grace = {1:null,2:null};
    state.log   = {1:[],2:[]};
    overlay.style.display = 'none';
    spawnPanel.style.display = 'none';
  }

  // === Генерация карты ===
  function generateMap(){
    buildings.length = 0;
    units.length     = 0;
    map.length = 0;
    for(let r=0;r<ROWS;r++){
      map[r] = Array(COLS).fill(TERRAIN.PLAIN);
    }

    const scale = ROWS / BASE_ROWS;

    function blob(type,count){
      for(let i=0;i<count;i++){
        let r=Math.random()*ROWS|0, c=Math.random()*COLS|0;
        for(let k=0;k<15;k++){
          map[r][c]=type;
          r=Math.max(1,Math.min(ROWS-2, r+[1,-1,0,0][Math.random()*4|0]));
          c=Math.max(1,Math.min(COLS-2, c+[0,0,1,-1][Math.random()*4|0]));
        }
      }
    }
    blob(TERRAIN.WATER,Math.max(1,Math.round(4*scale)));
    blob(TERRAIN.FOREST,Math.max(1,Math.round(5*scale)));
    blob(TERRAIN.HILL,Math.max(1,Math.round(4*scale)));
    blob(TERRAIN.MOUNTAIN,Math.max(1,Math.round(3*scale)));
    // keep mountains away from bases
    [[1,1],[ROWS-2,COLS-2]].forEach(([br,bc])=>{
      for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
        let rr=br+dr, cc=bc+dc;
        if(rr>=0&&rr<ROWS&&cc>=0&&cc<COLS && map[rr][cc]===TERRAIN.MOUNTAIN)
          map[rr][cc]=TERRAIN.PLAIN;
      }
    });

    // базы
    buildings.push({r:1,c:1,owner:1,type:'base'});
    buildings.push({r:ROWS-2,c:COLS-2,owner:2,type:'base'});

    function addRes(owner,type){
      const b=buildings.find(x=>x.owner===owner&&x.type==='base');
      [[1,0],[-1,0],[0,1],[0,-1]].some(([dr,dc])=>{
        let rr=b.r+dr, cc=b.c+dc;
        if(rr>=0&&rr<ROWS&&cc>=0&&cc<COLS&&map[rr][cc]===TERRAIN.PLAIN){
          buildings.push({r:rr,c:cc,owner,type});
          return true;
        }
      });
    }
    addRes(1,'mine');
    addRes(2,'mine');

    [['mine',2],['lumber',2],['barracks',2],
     ['stable',2],['mageTower',1],['fort',4]]
      .forEach(([type,count])=>{
        count = Math.max(1,Math.round(count*scale));
        let half=count/2|0;
        for(let i=0;i<half;i++){
          const p=freeCell(1);
          if(p) buildings.push({r:p.r,c:p.c,owner:0,type});
        }
        for(let i=0;i<count-half;i++){
          const p=freeCell(2);
          if(p) buildings.push({r:p.r,c:p.c,owner:0,type});
        }
      });

    units.push({id:nextUnitId++,r:1,c:2,owner:1,type:'swordsman',hp:5,mp:2,startR:1,startC:2});
    units.push({id:nextUnitId++,r:2,c:1,owner:1,type:'archer',   hp:4,mp:2,startR:2,startC:1});
    units.push({id:nextUnitId++,r:ROWS-2,c:COLS-3,owner:2,type:'swordsman',hp:5,mp:2,startR:ROWS-2,startC:COLS-3});
    units.push({id:nextUnitId++,r:ROWS-3,c:COLS-2,owner:2,type:'archer',   hp:4,mp:2,startR:ROWS-3,startC:COLS-2});
    if(modeBeta){
      units.push({id:nextUnitId++,r:5,c:5,owner:1,type:'bog',hp:1000,mp:1000,startR:5,startC:5});
      units.push({id:nextUnitId++,r:ROWS-6,c:COLS-6,owner:2,type:'bog',hp:1000,mp:1000,startR:ROWS-6,startC:COLS-6});
    }
  }

  function freeCell(side){
    for(let i=0;i<500;i++){
      let r=2+Math.random()*(ROWS-4)|0,
          c=2+Math.random()*(COLS-4)|0;
      if(side===1&&c>=COLS/2) continue;
      if(side===2&&c<COLS/2)  continue;
      if(map[r][c]!==TERRAIN.PLAIN) continue;
      if(units.some(u=>u.r===r&&u.c===c)) continue;
      if(buildings.some(b=>abs(b.r-r)+abs(b.c-c)<7)) continue;
      return {r,c};
    }
  }

  // === LOS ===
  function hasLOS(r0,c0,r1,c1){
    let dx=abs(c1-c0), dy=abs(r1-r0),
        sx=c0<c1?1:-1, sy=r0<r1?1:-1, err=dx-dy;
    while(true){
      if(map[r0][c0]===TERRAIN.MOUNTAIN&&(r0!==r1||c0!==c1)) return false;
      if(r0===r1&&c0===c1) break;
      let e2=err*2;
      if(e2>-dy){ err-=dy; c0+=sx }
      if(e2< dx){ err+=dx; r0+=sy }
    }
    return true;
  }

  // === Fog ===
  function updateFog(){
    if(!modeBeta && !revealAll){
      const p=state.currentPlayer, F=state.fog[p], S=state.seen[p];
      for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)F[r][c]=true;
      [...buildings.filter(b=>b.owner===p),
        ...units.filter(u=>u.owner===p)].forEach(o=>{
        let rad = map[o.r][o.c]===TERRAIN.FOREST?2:
                  map[o.r][o.c]===TERRAIN.HILL?4:3;
        for(let dr=-rad;dr<=rad;dr++)for(let dc=-rad;dc<=rad;dc++){
          let rr=o.r+dr, cc=o.c+dc;
          if(rr<0||rr>=ROWS||cc<0||cc>=COLS) continue;
          if(abs(dr)+abs(dc)<=rad && hasLOS(o.r,o.c,rr,cc)){
            F[rr][cc]=false; S[rr][cc]=true;
          }
        }
      });
    }
  }

  // === Draw ===
  function redraw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const p=state.currentPlayer, F=state.fog[p], S=state.seen[p];

    // terrain
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      let x=c*cellW, y=r*cellH;
      if(!S[r][c]&&!revealAll){
        ctx.fillStyle='#000'; ctx.fillRect(x,y,cellW,cellH);
      } else {
        ctx.fillStyle=TERR_PAT[map[r][c]] || TERR_COL[map[r][c]];
        ctx.fillRect(x,y,cellW,cellH);
        if(!revealAll&&F[r][c]){
          ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(x,y,cellW,cellH);
        }
      }
    }

    // move zone
    if(sel&&sel.mp>0){
      ctx.strokeStyle='white';
      ctx.lineWidth=2;
      ctx.setLineDash([4,4]);
      zoneList.forEach(z=>ctx.strokeRect(z.c*cellW,z.r*cellH,cellW,cellH));
      ctx.setLineDash([]);

      // attackable enemies
      units.filter(u=>u.owner!==sel.owner &&
          Math.abs(u.r-sel.r)+Math.abs(u.c-sel.c)<=UNIT_TYPES[sel.type].range)
        .forEach(u=>{
          ctx.strokeStyle='red';
          ctx.setLineDash([4,4]);
          ctx.strokeRect(u.c*cellW,u.r*cellH,cellW,cellH);
          ctx.setLineDash([]);
        });
    }

    // spawn zone
    if(spawnMode){
      ctx.fillStyle='rgba(0,200,200,0.3)';
      spawnZones.forEach(z=>ctx.fillRect(z.c*cellW,z.r*cellH,cellW,cellH));
    }

    // buildings
    buildings.forEach(b=>{
      if((!F[b.r][b.c]||S[b.r][b.c]||revealAll)){
        let col = BUILD_TYPES[b.type].gen? '#fc0'
                : b.type==='fort'? '#666'
                : b.owner===1? '#f80'
                : b.owner===2? '#08f':'#888';
        ctx.fillStyle=col;
        ctx.fillRect(b.c*cellW+cellW*0.1,b.r*cellH+cellH*0.1,cellW*0.8,cellH*0.8);
        ctx.fillStyle='#000';
        ctx.font=`${cellH*0.5}px sans-serif`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(BUILD_LABELS[b.type],b.c*cellW+cellW/2,b.r*cellH+cellH/2);
        if(BUILD_TYPES[b.type].gen>0||BUILD_TYPES[b.type].def>0){
          ctx.strokeStyle=b.owner===1?'#f80':b.owner===2?'#08f':'#888';
          ctx.lineWidth=2; ctx.setLineDash([4,4]);
          ctx.strokeRect(b.c*cellW,b.r*cellH,cellW,cellH);
          ctx.setLineDash([]);
        }
      }
    });

    // units + HP + shields
    let animRunning=false;
    units.forEach(u=>{
      if((!F[u.r][u.c]||revealAll)&&S[u.r][u.c]){
        let rad=Math.min(cellW,cellH)/3;
        let cx=u.c*cellW+cellW/2, cy=u.r*cellH+cellH/2;
        if(u.animMove){
          let t=Math.min(1,(Date.now()-u.animMove.start)/u.animMove.dur);
          cx=(u.animMove.fr+(u.animMove.tr-u.animMove.fr)*t)*cellW+cellW/2;
          cy=(u.animMove.fc+(u.animMove.tc-u.animMove.fc)*t)*cellH+cellH/2;
          if(t<1) animRunning=true; else delete u.animMove;
        }
        if(u.animShake){
          let t=(Date.now()-u.animShake.start)/u.animShake.dur;
          if(t<1){
            let amp=2;
            cx+=(Math.random()*2-1)*amp;
            cy+=(Math.random()*2-1)*amp;
            animRunning=true;
          } else delete u.animShake;
        }
        ctx.fillStyle=UNIT_TYPES[u.type].color;
        ctx.shadowColor='rgba(0,0,0,0.4)';
        ctx.shadowBlur=4;
        ctx.beginPath();
        ctx.arc(cx,cy,rad,0,2*Math.PI);
        ctx.fill();
        ctx.shadowBlur=0;
        ctx.strokeStyle=u.owner===p?'#fff':'#000';
        ctx.lineWidth=2; ctx.setLineDash([4,4]); ctx.stroke(); ctx.setLineDash([]);

        let bld=buildings.find(b=>b.r===u.r&&b.c===u.c&&b.owner===u.owner),
            bonus=bld?BUILD_TYPES[bld.type].def:0;
        for(let k=0;k<bonus;k++){
          ctx.font=`${cellH*0.35}px sans-serif`;
          ctx.fillStyle='#ffd700'; ctx.textAlign='center';
          ctx.fillText('🛡',cx+(k-(bonus-1)/2)*(cellW*0.4),cy-rad-2);
        }

        let w=cellW*0.6,h=cellH*0.1,
            bx=u.c*cellW+(cellW-w)/2,
            by=u.r*cellH+cellH*0.1;
        ctx.fillStyle='#600'; ctx.fillRect(bx,by,w,h);
        let frac=u.hp/UNIT_TYPES[u.type].hpMax;
        ctx.fillStyle=u.owner===p?'#0f0':'#f00';
        ctx.fillRect(bx,by,w*frac,h);
        if(u.mp>0){
          ctx.fillStyle='rgba(0,0,255,0.7)';
          ctx.beginPath();
          ctx.arc(cx,cy,rad*0.3,0,2*Math.PI);
          ctx.fill();
        }
      }
    });

    // selection
    if(sel){
      ctx.strokeStyle='yellow'; ctx.lineWidth=2; ctx.setLineDash([]);
      ctx.strokeRect(sel.c*cellW+2,sel.r*cellH+2,cellW-4,cellH-4);
    }

    // map border
    ctx.strokeStyle = '#777';
    ctx.lineWidth = 1;
    ctx.strokeRect(0,0,canvas.width,canvas.height);
    if(animRunning) requestAnimationFrame(redraw);
  }

  // === computeZone ===
  function computeZone(u){
    const rem=Array.from({length:ROWS},()=>Array(COLS).fill(-1)),
          q=[{r:u.r,c:u.c,mp:u.mp}];
    rem[u.r][u.c]=u.mp;
    while(q.length){
      let o=q.shift();
      if(o.mp<=0) continue;
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(d=>{
        let rr=o.r+d[0], cc=o.c+d[1];
        if(rr<0||rr>=ROWS||cc<0||cc>=COLS) return;
        if(units.some(us=>us.r===rr&&us.c===cc&&us!==u)) return;
        let cost=TERR_COST[map[rr][cc]];
        if(cost>o.mp) return;
        let left=o.mp-cost;
        if(left>rem[rr][cc]){
          rem[rr][cc]=left; q.push({r:rr,c:cc,mp:left});
        }
      });
    }
    const list=[];
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      if(rem[r][c]>=0&&(r!==u.r||c!==u.c) && !units.find(us=>us.r===r&&us.c===c)) list.push({r,c});
    }
    return {rem,list};
  }

  // === doAttack ===
  function doAttack(att,def){
    if(att.type==='mage') return {dmg:0,rdmg:0};
    const info=UNIT_TYPES[att.type];
    let atk=info.atk;
    if(att.type==='cavalry'){
      let cellDef=(BUILD_TYPES[(buildings.find(b=>b.r===def.r&&b.c===def.c&&b.owner===def.owner)||{}).type]?.def)||0;
      if(cellDef>0) atk--;
    }
    let defV=UNIT_TYPES[def.type].def+TERR_DEF[map[def.r][def.c]];
    let dmg=Math.max(1,atk-defV);
    if(def.type!=='bog') def.hp-=dmg;
    let rdmg=0;
    if(info.range===1&&def.hp>0){
      let attD=UNIT_TYPES[att.type].def+TERR_DEF[map[att.r][att.c]];
      rdmg=Math.max(1,UNIT_TYPES[def.type].atk-attD);
      if(att.type!=='bog') att.hp-=rdmg;
    }
    let killed=false;
    if(def.hp<=0&&def.type!=='bog'){ units.splice(units.indexOf(def),1); killed=true; }
    if(att.hp<=0&&att.type!=='bog') units.splice(units.indexOf(att),1);
    return {dmg,rdmg,killed};
  }

  // === spawn ===
  function spawn(type,r,c){
    const p=state.currentPlayer, cost=UNIT_TYPES[type].cost;
    if(state.gold[p]<cost) return;
    units.push({id:nextUnitId++,r,c,owner:p,type,hp:UNIT_TYPES[type].hpMax,mp:0,startR:r,startC:c});
    state.gold[p]-=cost;
    recordEvent(`${UNIT_LABELS[type]} создан`);
    spawnMode=false; spawnZones=[]; window.spawnZones = spawnZones;
    updateAll();
  }

  // === checkVictory ===
  function checkVictory(){
    if(state.turn===0) return;      // не проверяем до первого хода
    if(gameOver) return;
    [1,2].forEach(p=>{
      let bases=buildings.filter(b=>b.owner===p&&BUILD_TYPES[b.type].gen===0).length,
          unts=units.filter(u=>u.owner===p).length,
          other=p===1?2:1;
      if(bases===0&&unts===0) endGame(other);
      else if(bases===0&&unts>0){
        if(state.grace[p]===null) state.grace[p]=5;
        else if(--state.grace[p]<=0) endGame(other);
      } else state.grace[p]=null;
    });
  }

  function endGame(w){
    gameOver=true;
    setTimeout(()=>alert(`Игрок ${w} победил!`),100);
  }

  // === updateLeft ===
  function updateLeft(){
    const p=state.currentPlayer;
    let income=buildings.filter(b=>b.owner===p&&BUILD_TYPES[b.type].gen>0)
                        .reduce((s,b)=>s+BUILD_TYPES[b.type].gen,0),
        mbases=buildings.filter(b=>b.owner===p&&BUILD_TYPES[b.type].gen===0).length,
        mres=buildings.filter(b=>b.owner===p&&BUILD_TYPES[b.type].gen>0).length;
    let counts={};
    units.filter(u=>u.owner===p).forEach(u=>counts[u.type]=(counts[u.type]||0)+1);
    let selInfo=sel
      ? sel.type==='mage'
        ? `Выбран: ${UNIT_LABELS[sel.type]} MP:${sel.mp}/${UNIT_TYPES[sel.type].move}`
        : `Выбран: ${UNIT_LABELS[sel.type]} HP:${sel.hp}/${UNIT_TYPES[sel.type].hpMax} MP:${sel.mp}/${UNIT_TYPES[sel.type].move}`
      : 'Объект не выбран';
    leftStats.innerHTML=
      `<div>Ход: ${state.turn} — Игрок ${p}</div>
       <div>Золото: ${state.gold[p]} (+${income}/ход)</div>
       <div>Военные базы: ${mbases}</div>
       <div>Ресурсы: ${mres}</div>
       <div>Юнитов:</div>
       ${Object.entries(counts).map(([t,c])=>`<div style="margin-left:10px;">${UNIT_LABELS[t]}: ${c}</div>`).join('')}
       <div style="margin-top:8px;">${selInfo}</div>`;
  }

  // === updateAll ===
  function updateAll(){
    updateFog(); redraw(); updateLeft(); checkVictory(); renderLog();
  }

  function aiTakeTurn(){
    const p=2;
    // спавн
    buildings.filter(b=>b.owner===p && BUILD_TYPES[b.type].spawn.length).forEach(b=>{
      const avail=BUILD_TYPES[b.type].spawn.filter(t=>UNIT_TYPES[t].cost<=state.gold[p]);
      const zones=[{r:b.r-1,c:b.c},{r:b.r+1,c:b.c},{r:b.r,c:b.c-1},{r:b.r,c:b.c+1}]
        .filter(z=>z.r>=0&&z.r<ROWS&&z.c>=0&&z.c<COLS&&
               map[z.r][z.c]!==TERRAIN.MOUNTAIN&&
               !units.find(u=>u.r===z.r&&u.c===z.c));
      if(avail.length&&zones.length){
        const type=avail[0];
        const z=zones[Math.random()*zones.length|0];
        units.push({id:nextUnitId++,r:z.r,c:z.c,owner:p,type,hp:UNIT_TYPES[type].hpMax,mp:0,startR:z.r,startC:z.c});
        state.gold[p]-=UNIT_TYPES[type].cost;
        addReplay({type:'spawn',unit:units[units.length-1]}, z.r, z.c);
      }
    });

    units.filter(u=>u.owner===p).forEach(u=>{
      while(u.mp>0){
        const enemy=units.find(t=>t.owner===1 && Math.abs(t.r-u.r)+Math.abs(t.c-u.c)<=UNIT_TYPES[u.type].range);
        if(enemy){
          if(map[u.r][u.c]!==TERRAIN.WATER){
            const res=doAttack(u,enemy);
            addReplay({type:'attack',target:enemy}, enemy.r, enemy.c);
            if(res.killed && UNIT_TYPES[u.type].range===1){
              addReplay({type:'move',unit:u,from:{r:u.r,c:u.c},to:{r:enemy.r,c:enemy.c}}, enemy.r, enemy.c);
              u.r=enemy.r; u.c=enemy.c;
            }
          }
          u.mp=0;
          break;
        }
        const cz=computeZone(u);
        if(!cz.list.length) break;
        let target=null;
        if(aiLevel===1){
          target=cz.list[Math.random()*cz.list.length|0];
        }else{
          const enemies=[...units.filter(e=>e.owner===1),...buildings.filter(b=>b.owner===1)];
          if(enemies.length){
            const trg=enemies.reduce((a,b)=>{
              const da=Math.abs(a.r-u.r)+Math.abs(a.c-u.c);
              const db=Math.abs(b.r-u.r)+Math.abs(b.c-u.c);
              return da<db?a:b;
            });
            target=cz.list.sort((a,b)=>{
              const da=Math.abs(a.r-trg.r)+Math.abs(a.c-trg.c);
              const db=Math.abs(b.r-trg.r)+Math.abs(b.c-trg.c);
              return da-db;
            })[0];
          } else target=cz.list[0];
        }
        if(target){
          u.mp=cz.rem[target.r][target.c];
          let bb=buildings.find(b=>b.r===target.r&&b.c===target.c&&b.owner!==p);
          if(bb){ bb.owner=p; addReplay({type:'capture',building:bb}, target.r, target.c); }
          addReplay({type:'move',unit:u,from:{r:u.r,c:u.c},to:{r:target.r,c:target.c}}, target.r, target.c);
          u.r=target.r; u.c=target.c;
        } else break;
      }
    });

    nextTurn();
  }

  // === click handler ===
  canvas.addEventListener('click',e=>{
    if(gameOver) return;
    const rect=canvas.getBoundingClientRect(),
          x=Math.floor((e.clientX-rect.left)/cellW),
          y=Math.floor((e.clientY-rect.top)/cellH),
          p=state.currentPlayer;

    if(spawnMode){
      let z=spawnZones.find(z=>z.r===y&&z.c===x);
      if(z) spawn(spawnType,y,x);
      else { spawnMode=false; spawnZones=[]; window.spawnZones = spawnZones; updateAll(); }
      return;
    }
    if(spawnPanel.style.display==='block'){ spawnPanel.style.display='none'; return; }
    if(overlay.style.display==='flex') return;

    if(sel&&sel.type==='mage'&&sel.mp>0){
      let tgt=units.find(u=>u.r===y&&u.c===x&&u.owner===p&&u.hp<UNIT_TYPES[u.type].hpMax);
      if(tgt&&abs(tgt.r-sel.r)+abs(tgt.c-sel.c)<=1){
        sel.mp=0; tgt.hp=Math.min(UNIT_TYPES[tgt.type].hpMax,tgt.hp+2);
        recordEvent(`Чародей восстановил ${UNIT_LABELS[tgt.type]} на 2 HP`);
        sel=null; zoneMap=null; zoneList=[]; updateAll(); return;
      }
    }

    if(sel){
      let bd=buildings.find(b=>b.r===y&&b.c===x&&b.owner===p&&BUILD_TYPES[b.type].spawn.length);
      if(bd&&sel.r===y&&sel.c===x){
        spawnPanel.innerHTML=`<strong>${BUILD_LABELS[bd.type]}</strong>`;
        BUILD_TYPES[bd.type].spawn
          .filter(t=>t!=='bog'||modeBeta)
          .forEach(t=>{
            let btn=document.createElement('button');
            btn.textContent=`${UNIT_LABELS[t]} (${UNIT_TYPES[t].cost} зол.)`;
            btn.onclick=()=>{
              spawnType=t;
              spawnZones=[
                {r:bd.r-1,c:bd.c},{r:bd.r+1,c:bd.c},
                {r:bd.r,c:bd.c-1},{r:bd.r,c:bd.c+1}
              ].filter(z=>
                z.r>=0&&z.r<ROWS&&z.c>=0&&z.c<COLS&&
                map[z.r][z.c]!==TERRAIN.MOUNTAIN&&
                !units.find(u=>u.r===z.r&&u.c===z.c)
              );
              window.spawnZones = spawnZones;
              spawnMode=true; spawnPanel.style.display='none'; updateAll();
            };
            spawnPanel.appendChild(btn);
          });
        spawnPanel.style.display='block';
        sel=null; zoneMap=null; zoneList=[]; return;
      }
      if(sel.mp>0){
        const info=UNIT_TYPES[sel.type];
        const dist=abs(y-sel.r)+abs(x-sel.c);
        const tgt=units.find(u=>u.r===y&&u.c===x&&u.owner!==p);
        if(tgt&&dist<=info.range){
          if(map[sel.r][sel.c]===TERRAIN.WATER){
            recordEvent('Нельзя атаковать из воды');
            sel=null; zoneMap=null; zoneList=[]; updateAll(); return;
          }
          sel.mp=0;
          const {dmg,rdmg,killed}=doAttack(sel,tgt);
          animateShake(tgt);
          if(killed && UNIT_TYPES[sel.type].range===1){
            animateMove(sel,sel.r,sel.c,tgt.r,tgt.c);
            sel.r=tgt.r; sel.c=tgt.c;
          }
          recordEvent(`${UNIT_LABELS[sel.type]} атаковал ${UNIT_LABELS[tgt.type]} за ${dmg}`+
                      (rdmg?`, получил ${rdmg}`:''));
          sel=null; zoneMap=null; zoneList=[]; updateAll(); return;
        }
        if(zoneMap.rem[y][x]>=0 && !units.find(u=>u.r===y&&u.c===x)){
          sel.mp=zoneMap.rem[y][x];
          let moved = (y!==sel.r || x!==sel.c);
          let bb=buildings.find(b=>b.r===y&&b.c===x&&b.owner!==p);
          if(bb){
            recordEvent(BUILD_TYPES[bb.type].gen===0
              ? `Захвачена база`
              : `Захвачена добыча (${BUILD_LABELS[bb.type]})`);
            bb.owner=p;
          }
          animateMove(sel,sel.r,sel.c,y,x);
          sel.r=y; sel.c=x;
          if(moved) recordEvent(`Перемещён ${UNIT_LABELS[sel.type]}`);
          sel=null; zoneMap=null; zoneList=[]; updateAll(); return;
        }
      }
      sel=null; zoneMap=null; zoneList=[]; updateAll(); return;
    }

    let u=units.find(u=>u.owner===p&&u.r===y&&u.c===x);
    if(u){ sel=u; 
      if(u.mp>0){ let cz=computeZone(u); zoneMap=cz; zoneList=cz.list; }
      else { zoneMap=null; zoneList=[]; }
      updateAll(); return;
    }

    let bld=buildings.find(b=>b.owner===p&&BUILD_TYPES[b.type].spawn.length&&b.r===y&&b.c===x);
    if(bld){
      spawnPanel.innerHTML=`<strong>${BUILD_LABELS[bld.type]}</strong>`;
      BUILD_TYPES[bld.type].spawn
        .filter(t=>t!=='bog'||modeBeta)
        .forEach(t=>{
          let btn=document.createElement('button');
          btn.textContent=`${UNIT_LABELS[t]} (${UNIT_TYPES[t].cost} зол.)`;
          if(state.gold[p] < UNIT_TYPES[t].cost) btn.style.color='red';
          if(state.gold[p] < UNIT_TYPES[t].cost) btn.style.color='red';
          btn.onclick=()=>{
            spawnType=t;
            spawnZones=[
              {r:bld.r-1,c:bld.c},{r:bld.r+1,c:bld.c},
              {r:bld.r,c:bld.c-1},{r:bld.r,c:bld.c+1}
            ].filter(z=>
              z.r>=0&&z.r<ROWS&&z.c>=0&&z.c<COLS&&
              map[z.r][z.c]!==TERRAIN.MOUNTAIN&&
              !units.find(u=>u.r===z.r&&u.c===z.c)
            );
            window.spawnZones = spawnZones;
            spawnMode=true; spawnPanel.style.display='none'; updateAll();
          };
          spawnPanel.appendChild(btn);
        });
      spawnPanel.style.display='block';
    }
  });

  // === right-click cancels selection ===
  canvas.addEventListener('contextmenu',e=>{
    e.preventDefault();
    if(spawnMode){
      spawnMode=false; spawnZones=[]; window.spawnZones = spawnZones; spawnPanel.style.display='none';
    } else if(sel){
      sel=null; zoneMap=null; zoneList=[];
    }
    updateAll();
  });

  // === Передача хода ===
  endTurnBtn.addEventListener('click',()=>{
    if(gameOver) return;
    spawnMode=false; spawnZones=[]; window.spawnZones = spawnZones; spawnPanel.style.display='none';
    overlayMsg.textContent = `Ход переходит игроку ${state.currentPlayer===1?2:1}. Продолжить?`;
    overlay.style.display = 'flex';
    continueAfter = ()=>{
      overlay.style.display='none';
      if(aiMode){
        fogSnapshot = state.fog[1].map(r=>r.slice());
        waitOverlay.style.display='flex';
        nextTurn();
        aiTakeTurn();
        replayAI();
      } else {
        nextTurn();
      }
    };
  });
  yesBtn.addEventListener('click',()=>{ overlay.style.display='none'; continueAfter&&continueAfter(); });
  noBtn.addEventListener('click',()=>{ overlay.style.display='none'; });

  // === Туман войны (бета) ===
  revealBtn.addEventListener('click',()=>{
    if(!modeBeta) return;
    revealAll = !revealAll;
    revealBtn.textContent = revealAll?'Скрыть карту':'Показать карту';
    updateAll();
  });

  // === Стартовые кнопки ===
  function setMapSize(size){
    mapSize=size;
    if(size==='small'){
      ROWS=Math.round(BASE_ROWS*0.5);
      COLS=Math.round(BASE_COLS*0.5);
    }else if(size==='large'){
      ROWS=BASE_ROWS;
      COLS=BASE_COLS*2;
    }else{
      ROWS=BASE_ROWS; COLS=BASE_COLS;
    }
    window.dispatchEvent(new Event('resize'));
  }

  function nextTurn(){
    const prev=state.currentPlayer;
    sel=null; zoneMap=null; zoneList=[];
    // heal units that didn't move
    units.filter(u=>u.owner===prev).forEach(u=>{
      if(u.r===u.startR && u.c===u.startC){
        u.hp=Math.min(UNIT_TYPES[u.type].hpMax,u.hp+1);
      }
    });

    state.turn++;
    state.currentPlayer = prev===1?2:1;
    state.gold[state.currentPlayer] += buildings
      .filter(b=>b.owner===state.currentPlayer&&BUILD_TYPES[b.type].gen>0)
      .reduce((s,b)=>s+BUILD_TYPES[b.type].gen,0);
    units.filter(u=>u.owner===state.currentPlayer).forEach(u=>{
      u.mp=UNIT_TYPES[u.type].move; u.startR=u.r; u.startC=u.c;
    });
    recordTurn(); updateAll();
  }

  function replayAI(){
    let i=0;
    const run=()=>{
      if(i>=aiReplay.length){
        aiReplay=[];
        waitOverlay.style.display='none';
        waitOverlay.textContent='Подождите...';
        updateAll();
        return;
      }
      const ev=aiReplay[i++];
      if(ev.type==='move'){
        animateMove(ev.unit,ev.from.r,ev.from.c,ev.to.r,ev.to.c);
        setTimeout(run,400);
      }else if(ev.type==='attack'){
        animateShake(ev.target);
        setTimeout(run,200);
      }else{
        setTimeout(run,300);
      }
      redraw();
    };
    run();
  }

  twoBtn.addEventListener('click',()=>{
    menuBgm.pause();
    resetState();
    modeBeta=false; revealBtn.style.display='none';
    aiMode=false;
    setMapSize(mapSizeSel.value);
    startPanel.style.display='none';
    generateMap();
    recordTurn(); updateAll();
  });

  aiBtn.addEventListener('click',()=>{
    startPanel.style.display='none';
    aiPanel.style.display='flex';
  });

  aiStartBtn.addEventListener('click',()=>{
    menuBgm.pause();
    resetState();
    modeBeta=false; revealBtn.style.display='none';
    aiMode=true;
    aiLevel=parseInt(aiLevelSel.value,10);
    setMapSize(mapSizeSel.value);
    aiPanel.style.display='none';
    generateMap();
    recordTurn(); updateAll();
  });

  betaBtn.addEventListener('click',()=>{
    menuBgm.pause();
    resetState();
    modeBeta=true; revealBtn.style.display='inline-block';
    aiMode=false;
    setMapSize(mapSizeSel.value);
    startPanel.style.display='none';
    generateMap();
    recordTurn(); updateAll();
  });

  // === Инициализация ===
  makePatterns();
  window.dispatchEvent(new Event('resize'));
});
