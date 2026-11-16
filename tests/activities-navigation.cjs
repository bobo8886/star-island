const assert = require('node:assert/strict');
global.window=global;
require('../src/content.js');require('../src/regions.js');require('../src/adventure.js');require('../src/activities.js');require('../src/world.js');
let routes=0;
for(const activity of ISLAND_ACTIVITIES){
  const nav=IslandNavigation.forRegion(activity.region),region=ISLAND_REGIONS.find(r=>r.id===activity.region);
  assert(nav.walkable(activity.x,activity.y),activity.id+' is not on walkable ground');
  for(const from of [region.spawn,...region.landmarks,...ISLAND_ADVENTURE.filter(i=>i.region===activity.region)]){
    const path=nav.pathfind(from,activity);assert(path.length,activity.id+' unreachable from '+from.id);
    let last=from;for(const step of path){assert(nav.walkable(step.x,step.y));if(nav.walkable(last.x,last.y))assert(nav.lineClear(last,step));last=step;}
    assert(Math.hypot(last.x-activity.x,last.y-activity.y)<35);routes++;
  }
}
const coast=IslandNavigation.forRegion('coast');let previous={x:753,y:623};
for(const point of [{x:840,y:623},{x:920,y:602},{x:1016,y:578},{x:1120,y:540}]){const path=coast.pathfind(previous,point);assert(path.length);for(const step of path){assert(coast.lineClear(previous,step));previous=step;}routes++;}
console.log(JSON.stringify({activities:ISLAND_ACTIVITIES.length,approachAndStrollRoutes:routes,collisionSafe:true}));
