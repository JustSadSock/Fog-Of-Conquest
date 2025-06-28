(function(global){
  const BASE_ROWS = 20, BASE_COLS = 30;
  let ROWS = BASE_ROWS, COLS = BASE_COLS;
  let mapSize = 'medium';
  const TERRAIN = { PLAIN:0, WATER:1, FOREST:2, HILL:3, MOUNTAIN:4 };
  const TERR_COL  = ['#a6d88c','#6db6f8','#2e8b3d','#d4b55c','#8d8d8d'];
  const TERR_COST = [1,2,2,2,999];
  const TERR_DEF  = [0,-1,1,2,0];
  let TERR_LABELS = [];
  const TILE_IMAGES = {
    grass:['tiles/grass1'],
    water:['tiles/water'],
    pond:['tiles/pound','tiles/pound2','tiles/pound3'],
    hill:['tiles/hill'],
    mountain:['tiles/mountains3'],
    forest:['tiles/trees1']
  };
  const UNIT_IMG_MAP = {
    swordsman:'militia',
    archer:'archer',
    heavy:'heavy',
    cavalry:'horseman',
    mage:'healer',
    bog:'militia'
  };
  const UNIT_TYPES = {
    swordsman:{move:2,atk:2,def:1,range:1,hpMax:5,cost:3,color:'#e74c3c'},
    archer:   {move:2,atk:3,def:0,range:2,hpMax:4,cost:4,color:'#2ecc71'},
    heavy:    {move:1,atk:3,def:2,range:1,hpMax:6,cost:5,color:'#2c3e50'},
    cavalry:  {move:3,atk:3,def:1,range:1,hpMax:5,cost:7,color:'#3498db'},
    mage:     {move:2,atk:0,def:0,range:1,hpMax:4,cost:7,color:'#9b59b6'},
    bog:      {move:1000,atk:2,def:1,range:1,hpMax:1000,cost:0,color:'#f1c40f'}
  };
  const BUILD_TYPES = {
    base:      {spawn:['swordsman','archer'],gen:0,def:1,hpMax:4},
    barracks:  {spawn:['heavy'],gen:0,def:0,hpMax:3},
    stable:    {spawn:['cavalry'],gen:0,def:0,hpMax:3},
    mageTower: {spawn:['mage'],gen:0,def:0,hpMax:3},
    mill:      {spawn:[],gen:1,genUp:2,def:0,hpMax:2},
    fort:      {spawn:[],gen:0,def:2,hpMax:4}
  };
  const BASE_SPAWN_DEFAULT = [...BUILD_TYPES.base.spawn];
  const map = [];
  const buildings = [];
  const units = [];
  const state = {
    currentPlayer:1,
    turn:0,
    gold:{1:5,2:5},
    fog:{}, seen:{},
    grace:{1:null,2:null},
    log:{1:[],2:[]}
  };
  let nextUnitId = 1;
  Object.assign(global,{
    BASE_ROWS,BASE_COLS,ROWS,COLS,mapSize,
    TERRAIN,TERR_COL,TERR_COST,TERR_DEF,TERR_LABELS,
    TILE_IMAGES,UNIT_IMG_MAP,UNIT_TYPES,BUILD_TYPES,
    BASE_SPAWN_DEFAULT,map,buildings,units,state,nextUnitId
  });
})(typeof window!=='undefined'?window:this);
