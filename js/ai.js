// js/ai.js
(function(global){
  function computeDistanceMap(targets){
    const map = global.map;
    const TERRAIN = global.TERRAIN;
    const TERR_COST = global.TERR_COST;
    if(!map) return [];
    const ROWS = map.length, COLS = map[0].length;
    const dist=Array.from({length:ROWS},()=>Array(COLS).fill(Infinity));
    const q=[];
    targets.forEach(t=>{ dist[t.r][t.c]=0; q.push({r:t.r,c:t.c,d:0}); });
    while(q.length){
      q.sort((a,b)=>a.d-b.d);
      const o=q.shift();
      const d=dist[o.r][o.c];
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc])=>{
        const rr=o.r+dr, cc=o.c+dc;
        if(rr<0||rr>=ROWS||cc<0||cc>=COLS) return;
        if(map[rr][cc]===TERRAIN.MOUNTAIN) return;
        const nd=d+TERR_COST[map[rr][cc]];
        if(nd<dist[rr][cc]){ dist[rr][cc]=nd; q.push({r:rr,c:cc,d:nd}); }
      });
    }
    return dist;
  }

  function aiTakeTurn(){
    const {state, units, buildings, BUILD_TYPES, UNIT_TYPES, map, TERRAIN, aiLevel} = global;
    if(!map) return;
    const ROWS = map.length, COLS = map[0].length;
    const p=2,
          F=state.fog[p];
    const enemyUnits=units.filter(u=>u.owner===1 && !F[u.r][u.c]);
    const enemyBuildings=buildings.filter(b=>b.owner===1 && !F[b.r][b.c]);
    const enemyBases=enemyBuildings.filter(b=>BUILD_TYPES[b.type].gen===0);
    const baseDist=enemyBases.length?computeDistanceMap(enemyBases):null;
    const buildDist=enemyBuildings.length?computeDistanceMap(enemyBuildings):null;
    const unitDist=enemyUnits.length?computeDistanceMap(enemyUnits):null;
    const allEnemies=[...enemyUnits,...enemyBuildings];
    const allDist=allEnemies.length?computeDistanceMap(allEnemies):null;
    const enemyCounts={};
    enemyUnits.forEach(u=>enemyCounts[u.type]=(enemyCounts[u.type]||0)+1);
    buildings.filter(b=>b.owner===p && BUILD_TYPES[b.type].spawn.length).forEach(b=>{
      const avail=BUILD_TYPES[b.type].spawn.filter(t=>UNIT_TYPES[t].cost<=state.gold[p]);
      const zones=[{r:b.r-1,c:b.c},{r:b.r+1,c:b.c},{r:b.r,c:b.c-1},{r:b.r,c:b.c+1}]
        .filter(z=>z.r>=0&&z.r<ROWS&&z.c>=0&&z.c<COLS&&
               map[z.r][z.c]!==TERRAIN.MOUNTAIN&&
               !units.find(u=>u.r===z.r&&u.c===z.c));
      if(avail.length&&zones.length){
        let best=null,bestScore=-Infinity;
        avail.forEach(t=>{
          const info=UNIT_TYPES[t];
          const base=info.atk+info.def+info.range;
          const goldFactor=state.gold[p]/info.cost;
          const compFactor=(enemyCounts[t]||0)*2;
          const score=base+goldFactor+compFactor;
          if(score>bestScore){ bestScore=score; best=t; }
        });
        const type=best;
        const z=zones[Math.random()*zones.length|0];
        units.push({id:global.nextUnitId++,r:z.r,c:z.c,owner:p,type,hp:UNIT_TYPES[type].hpMax,mp:0,startR:z.r,startC:z.c});
        state.gold[p]-=UNIT_TYPES[type].cost;
        global.addReplay && global.addReplay({type:'spawn',unit:units[units.length-1]});
        global.recordEvent && global.recordEvent(`Создан ${global.UNIT_LABELS[type]}`);
      }
    });

    units.filter(u=>u.owner===p).forEach(u=>{
      while(u.mp>0){
        const enemy=units.find(t=>t.owner===1 && !F[t.r][t.c] &&
          Math.abs(t.r-u.r)+Math.abs(t.c-u.c)<=UNIT_TYPES[u.type].range &&
          global.hasLOS(u.r,u.c,t.r,t.c,{forestBlock:false}));
        if(enemy){
          if(map[u.r][u.c]!==TERRAIN.WATER){
            const res=global.doAttack(u,enemy);
            global.addReplay && global.addReplay({type:'attack',target:enemy});
            global.recordEvent && global.recordEvent(`${global.UNIT_LABELS[u.type]} атаковал ${global.UNIT_LABELS[enemy.type]}`);
            if(res.killed && UNIT_TYPES[u.type].range===1){
              global.addReplay && global.addReplay({type:'move',unit:u,from:{r:u.r,c:u.c},to:{r:enemy.r,c:enemy.c}});
              u.r=enemy.r; u.c=enemy.c;
            }
          }
          u.mp=0;
          break;
        }
        const cz=global.computeZone(u);
        if(!cz.list.length) break;
        let target=null;
        if(aiLevel===1){
          target=cz.list[Math.random()*cz.list.length|0];
        }else if(aiLevel===2){
          if(allDist){
            target=cz.list.sort((a,b)=>allDist[a.r][a.c]-allDist[b.r][b.c])[0];
          } else target=cz.list[0];
        }else{
          let best=null,bestScore=-Infinity;
          cz.list.forEach(pos=>{
            let score=0;
            if(baseDist) score-= (baseDist[pos.r][pos.c]||100)*3;
            if(buildDist) score-= (buildDist[pos.r][pos.c]||100);
            if(unitDist) score-= (unitDist[pos.r][pos.c]||100)*2;
            const bld=buildings.find(b=>b.r===pos.r&&b.c===pos.c&&b.owner===1);
            if(bld){
              score+=BUILD_TYPES[bld.type].gen===0?50:20;
            }
            if(baseDist && baseDist[pos.r][pos.c]<=UNIT_TYPES[u.type].move*5){
              score+=10;
            }
            if(score>bestScore){ bestScore=score; best=pos; }
          });
          if(aiLevel===3 && Math.random()<0.3){
            target=cz.list[Math.random()*cz.list.length|0];
          }else{
            target=best||cz.list[0];
          }
        }
        if(target){
          u.mp=cz.rem[target.r][target.c];
          let bb=buildings.find(b=>b.r===target.r&&b.c===target.c&&b.owner!==p);
          if(bb){
            bb.owner=p;
            global.addReplay && global.addReplay({type:'capture',building:bb});
            global.recordEvent && global.recordEvent(`Захвачено ${global.BUILD_LABELS[bb.type]}`);
          }
          global.addReplay && global.addReplay({type:'move',unit:u,from:{r:u.r,c:u.c},to:{r:target.r,c:target.c}});
          global.recordEvent && global.recordEvent(`${global.UNIT_LABELS[u.type]} переместился`);
          u.r=target.r; u.c=target.c;
        } else break;
      }
    });

    global.updateFog();
    global.nextTurn();
  }

  if(typeof module !== 'undefined' && module.exports){
    module.exports = { aiTakeTurn, computeDistanceMap };
  }
  if(global){
    global.aiTakeTurn = aiTakeTurn;
    global.computeDistanceMap = computeDistanceMap;
  }
})(typeof window !== 'undefined' ? window : global);
