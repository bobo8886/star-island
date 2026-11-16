const assert=require('node:assert/strict');
global.window=global;
require('../src/content.js');require('../src/regions.js');require('../src/adventure.js');require('../src/world.js');
let count=0;
const surfaces={};
for(const region of ISLAND_REGIONS){
  const nav=IslandNavigation.forRegion(region.id);
  const locations=[region.spawn,...region.landmarks,...ISLAND_CONTENT.memories.filter(m=>(m.region||'home')===region.id),...ISLAND_ADVENTURE.filter(m=>m.region===region.id)];
  assert(nav.walkable(region.spawn.x,region.spawn.y),'Spawn blocked: '+region.id);
  surfaces[region.id]=[...nav.grid].filter(Boolean).length*16*16;
  for(const from of locations)for(const to of locations){
    const route=nav.pathfind(from,to);assert(route.length,`No route in ${region.id}: ${from.id} → ${to.id}`);
    let previous=from;
    for(const point of route){assert(nav.walkable(point.x,point.y));if(nav.walkable(previous.x,previous.y))assert(nav.lineClear(previous,point),`Crosses obstacle: ${region.id}/${to.id}`);previous=point;}
    assert(Math.hypot(previous.x-to.x,previous.y-to.y)<64,`Too far to interact: ${region.id}/${to.id}`);count++;
  }
  for(const gate of region.landmarks.filter(l=>l.type==='portal'))assert(ISLAND_REGIONS.some(r=>r.id===gate.toRegion),'Invalid portal');
}
assert(!IslandNavigation.forRegion('forest').walkable(517,433),'Pond is not walkable');
assert(!IslandNavigation.forRegion('coast').walkable(100,700),'Sea edge is not walkable');
assert(surfaces.forest>surfaces.home,'Forest should be genuinely spacious');
console.log(JSON.stringify({routes:count,walkablePixels:surfaces,totalAreaRatio:(Object.values(surfaces).reduce((a,b)=>a+b,0)/surfaces.home).toFixed(2)}));
