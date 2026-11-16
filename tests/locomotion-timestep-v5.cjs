// Reuse the production movement methods with deterministic steps; no rendering or state shortcuts.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
fs.mkdirSync('output',{recursive:true});
global.window=global;
require('../src/content.js');require('../src/regions.js');require('../src/adventure.js');require('../src/activities.js');require('../src/world.js');
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function worldAt(player,companion){const w=Object.create(IslandWorld.prototype);Object.assign(w,{state:{settings:{companion:'boy',reducedMotion:true}},nav:IslandNavigation.forRegion('coast'),player:{...player,gait:0,walk:0,direction:'right',speed:0},spirit:{...companion,gait:0,walk:0,direction:'right',speed:0},npcTimer:0,npcPath:[],npcFollowing:false,sprinting:false});assert(w.nav.walkable(player.x,player.y));assert(w.nav.walkable(companion.x,companion.y));return w;}
const results=[];
// A reset animation-clock origin must never feed negative time to camera/follow smoothing.
const timing=Object.create(IslandWorld.prototype),steps=[];
Object.assign(timing,{last:9000,profile:{cpu:0,frames:0},update:dt=>steps.push(dt),draw:()=>{}});
global.document={hidden:false};global.requestAnimationFrame=()=>{};
timing.frame(1000);timing.frame(1016);timing.frame(9016);
assert.deepEqual(steps,[0,.016,.04]);
for(const hz of [30,60,120]){
  const dt=1/hz,w=worldAt({x:753,y:623},{x:795,y:636});w.activity={id:'stroll',time:0};w.activityAction('start');let idle=0,toggles=0,last=null,maxSpeed=0,elapsed=0,atThree;
  for(let i=0;i<hz*10;i++){const old={...w.spirit};w.updateActivity(dt);elapsed+=dt;assert(w.nav.walkable(w.player.x,w.player.y));assert(w.nav.walkable(w.spirit.x,w.spirit.y));maxSpeed=Math.max(maxSpeed,distance(old,w.spirit)/dt);if(w.player.walk>0){if(!w.spirit.walk)idle++;const moving=w.spirit.walk>0;if(last!==null&&moving!==last)toggles++;last=moving;}if(i===hz*3-1)atThree={player:{...w.player},spirit:{...w.spirit}};if(!w.activity.running)break;}
  assert(w.activity.progress===1);assert(idle===0);assert(toggles===0);assert(maxSpeed<=130+.00001);const stopped={...w.spirit};for(let i=0;i<hz;i++)w.updateActivity(dt);assert(distance(stopped,w.spirit)===0);assert(w.spirit.walk===0);
  // A legal route crosses the rock band on the way to the lighthouse, forcing ordinary A* following.
  const f=worldAt({x:817,y:566},{x:859,y:579}),route=f.nav.pathfind(f.player,{x:413,y:357});let astarCalls=0;const realNav=f.nav;f.nav={...realNav,pathfind(...args){astarCalls++;return realNav.pathfind(...args);}};let followMaximum=0;
  for(let i=0;i<hz*8;i++){const oldP={...f.player},oldS={...f.spirit};f.followPath(f.player,route,220,dt);f.advanceGait(f.player,distance(oldP,f.player),dt);f.followCompanion(dt);assert(f.nav.walkable(f.player.x,f.player.y));assert(f.nav.walkable(f.spirit.x,f.spirit.y));followMaximum=Math.max(followMaximum,distance(oldS,f.spirit)/dt);}
  assert(route.length===0);assert(astarCalls>0,'ordinary follow must actually encounter an obstacle');assert(followMaximum<=245+.0001);const settled={...f.spirit};for(let i=0;i<hz;i++)f.followCompanion(dt);assert(distance(settled,f.spirit)<.01);assert(f.spirit.walk===0);
  // The desired side slot enters a rock. The companion must fall back to a safe route, not snap.
  const b=worldAt({x:420,y:420},{x:378,y:430}),besideRoute=b.nav.pathfind(b.player,{x:630,y:420});let blockedSteps=0,besideMaximum=0;
  for(let i=0;i<hz*5;i++){const oldP={...b.player},oldS={...b.spirit};b.followPath(b.player,besideRoute,76,dt);b.advanceGait(b.player,distance(oldP,b.player),dt);if(!b.nav.walkable(b.player.x+42,b.player.y+13))blockedSteps++;b.followBeside(dt,oldP);assert(b.nav.walkable(b.spirit.x,b.spirit.y));besideMaximum=Math.max(besideMaximum,distance(oldS,b.spirit)/dt);}
  assert(blockedSteps>0);assert(besideMaximum<=130+.0001);
  results.push({hz,stroll:{idleFrames:idle,walkIdleTransitions:toggles,maxSpeed,completionSeconds:elapsed,atThreeSeconds:atThree},ordinaryFollow:{astarCalls,maxSpeed:followMaximum,settledDistance:distance(f.player,f.spirit)},obstructedBeside:{blockedSteps,maxSpeed:besideMaximum,collisionSafe:true}});
}
const baseline=results[0].stroll.atThreeSeconds;
for(const item of results){assert(distance(item.stroll.atThreeSeconds.player,baseline.player)<.001);assert(distance(item.stroll.atThreeSeconds.spirit,baseline.spirit)<.01);}
fs.writeFileSync(path.join(__dirname,'../output/locomotion-timestep-v5.json'),JSON.stringify({results,equivalentThreeSecondPositions:true},null,2));
console.log(JSON.stringify({results:results.map(r=>({hz:r.hz,strollIdle:r.stroll.idleFrames,strollSwitches:r.stroll.walkIdleTransitions,strollMaxSpeed:r.stroll.maxSpeed,obstacleAStarCalls:r.ordinaryFollow.astarCalls,blockedBesideSteps:r.obstructedBeside.blockedSteps})),equivalentThreeSecondPositions:true}));
