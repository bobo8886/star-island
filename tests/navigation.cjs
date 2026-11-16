const assert = require('node:assert/strict');
global.window = global;
require('../src/content.js');
require('../src/world.js');
const {walkable,pathfind,landmarks}=IslandNavigation;
const origin={x:978,y:636};
const locations=[origin,...ISLAND_CONTENT.memories,...landmarks];
assert(walkable(origin.x,origin.y),'Arrival must be walkable');
for(const from of locations) for(const to of locations) {
  const route=pathfind(from,to);
  assert(route.length,`No route from ${from.id||'arrival'} to ${to.id||'arrival'}`);
  let previous=from;
  for(const p of route){
    assert(walkable(p.x,p.y),'Route enters blocked terrain');
    if(walkable(previous.x,previous.y)){
      const distance=Math.hypot(p.x-previous.x,p.y-previous.y);
      for(let i=1;i<=Math.ceil(distance);i++){
        const t=i/Math.ceil(distance);
        assert(walkable(previous.x+(p.x-previous.x)*t,previous.y+(p.y-previous.y)*t),`Route crosses a collider: ${from.id} → ${to.id}`);
      }
    }
    previous=p;
  }
  assert(Math.hypot(previous.x-to.x,previous.y-to.y)<82,`Cannot interact with ${to.id}`);
}
assert(!walkable(20,200),'Cliff boundary must block walking');
assert(!walkable(938,456),'Tree trunk must block walking');
assert(!walkable(379,469),'Fire must block walking');
assert(!walkable(600,350),'River must block walking');
assert(walkable(641,471),'Bridge must be traversable');
console.log(`Passed: ${locations.length**2} routes, obstacles, river and bridge.`);
