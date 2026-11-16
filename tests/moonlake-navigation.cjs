/* New lake: complete ring, reachable activities, optional story branch, safe water. */
const assert=require('node:assert/strict');
global.window=global;
require('../src/content.js');require('../src/regions.js');require('../src/adventure.js');require('../src/activities.js');require('../src/world.js');
const region=ISLAND_REGIONS.find(r=>r.id==='lake'),nav=IslandNavigation.forRegion('lake');
assert(region&&region.width===1536&&region.height===1024);
const stories=ISLAND_ADVENTURE.filter(s=>s.region==='lake'),activities=ISLAND_ACTIVITIES.filter(a=>a.region==='lake');
assert.equal(stories.length,5);assert.deepEqual(activities.map(a=>a.id).sort(),['flower_garden','paper_boat','windmill']);
const points=[{id:'spawn',...region.spawn},...region.landmarks,...stories,...activities];
let routes=0;
for(const from of points){
  assert(nav.walkable(from.x,from.y),'Blocked feet: '+from.id);
  for(const to of points){const route=nav.pathfind(from,to);assert(route.length,from.id+' → '+to.id);let last=from;for(const p of route){assert(nav.walkable(p.x,p.y));assert(nav.lineClear(last,p));last=p;}assert(Math.hypot(last.x-to.x,last.y-to.y)<48,to.id+' ends too far away');routes++;}
}
// The complete north/east/south/west loop must be open, without crossing the lake.
const ring=[{x:730,y:241},{x:1110,y:326},{x:1139,y:483},{x:1066,y:587},{x:754,y:593},{x:489,y:557},{x:461,y:427},{x:516,y:312}];
for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];assert(nav.walkable(a.x,a.y),'Ring point '+i);assert(nav.pathfind(a,b).length,'Ring leg '+i);}
for(const p of [{x:780,y:440},region.paperBoatWater.start,region.paperBoatWater.end])assert(!nav.walkable(p.x,p.y),'Lake water should not be walkable');
const forest=ISLAND_REGIONS.find(r=>r.id==='forest'),out=forest.landmarks.find(l=>l.toRegion==='lake'),back=region.landmarks.find(l=>l.toRegion==='forest');
assert(out&&back);assert(IslandNavigation.forRegion('forest').walkable(out.x,out.y));
const quest=ISLAND_QUESTS.find(q=>q.id==='moon_kite');assert.equal(quest.requires.length,2);
assert(stories.some(s=>s.id===quest.target&&s.kind==='quest'));
for(const id of quest.requires)assert(stories.some(s=>s.id===id&&s.kind==='pickup'&&s.goal===quest.target));
assert.equal(ISLAND_CONTENT.memories.length,5,'New optional stories must not change the birthday core');
const area=[...nav.grid].filter(Boolean).length*256,forestArea=[...IslandNavigation.forRegion('forest').grid].filter(Boolean).length*256;
assert(area>forestArea,'Lake should add a genuinely spacious region');
console.log(JSON.stringify({routes,storyCount:stories.length,activities:activities.map(a=>a.id),ringLegs:ring.length,walkablePixels:area,forestWalkablePixels:forestArea,birthdayMemories:ISLAND_CONTENT.memories.length,optionalQuest:quest.id}));
