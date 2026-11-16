(() => {
  'use strict';
  const l10n=window.IslandI18n?.t||((text)=>text);
  const W = 1536, H = 1024, GRID = 16, COLS = 96, ROWS = 64;
  const homeBoundary = [[113,422],[181,389],[240,374],[440,335],[539,292],[590,259],[691,260],[744,332],[790,373],[1115,379],[1191,342],[1180,278],[1234,257],[1390,260],[1437,288],[1390,360],[1429,404],[1442,452],[1367,507],[1240,547],[1192,596],[1195,661],[1083,699],[956,705],[873,681],[761,655],[653,643],[524,603],[425,587],[338,579],[264,553],[183,518],[142,470]];
  const homeRiver = [[627,262],[681,272],[674,308],[630,332],[614,348],[660,366],[702,394],[702,420],[674,449],[655,487],[648,516],[612,545],[554,568],[474,591],[415,623],[335,655],[330,601],[407,566],[495,542],[567,521],[600,490],[601,453],[631,423],[651,401],[609,382],[566,361],[571,331],[603,301]];
  const homeObstacles = [
    {x:326,y:327,rx:101,ry:40}, {x:938,y:456,rx:55,ry:25}, {x:379,y:469,rx:47,ry:26},
    {x:1276,y:242,rx:78,ry:36}, {x:1097,y:624,rx:65,ry:33}, {x:829,y:629,rx:32,ry:18}
  ];
  const homeLandmarks = [
    {id:'campfire',name:l10n("篝火夜话"),x:403,y:504,icon:'♬'},
    {id:'tent',name:l10n("月光帐篷"),x:353,y:377,icon:'⌂'},
    {id:'observatory',name:l10n("观星台"),x:1318,y:301,icon:'✧'},
    {id:'tree',name:l10n("许愿树"),x:966,y:498,icon:'✿'}
  ];
  function inside(x,y,poly) { let hit=false; for(let i=0,j=poly.length-1;i<poly.length;j=i++) { const a=poly[i],b=poly[j]; if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) hit=!hit; } return hit; }
  const regionDefs=window.ISLAND_REGIONS||[{id:'home',name:l10n("拾光星屿"),art:'assets/island.png',spawn:{x:978,y:636},landmarks:homeLandmarks}];
  const homeRegion=regionDefs.find(r=>r.id==='home');
  Object.assign(homeRegion,{boundary:homeBoundary,river:homeRiver,obstacles:homeObstacles});
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function makeNavigation(region){
    const boundary=region.boundary,river=region.river||[],obstacles=region.obstacles||[];
  function walkable(x,y) {
    if(!inside(x,y,boundary)) return false;
    const onBridge=region.id==='home'&&x>548&&x<727&&y>446&&y<494;
    if(!onBridge&&inside(x,y,river)) return false;
    return !obstacles.some(o=>((x-o.x)/(o.rx+4))**2+((y-o.y)/(o.ry+4))**2<1);
  }
  const grid = new Uint8Array(COLS*ROWS);
  for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++) grid[y*COLS+x]=walkable(x*GRID+8,y*GRID+8)?1:0;
  const cell=(x,y)=>Math.floor(y/GRID)*COLS+Math.floor(x/GRID);
  const point=i=>({x:(i%COLS)*GRID+8,y:Math.floor(i/COLS)*GRID+8});
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function nearest(x,y) {
    let best=-1,score=Infinity;
    const cx=Math.floor(x/GRID),cy=Math.floor(y/GRID);
    for(let dy=-8;dy<=8;dy++) for(let dx=-8;dx<=8;dx++) { const xx=cx+dx,yy=cy+dy; if(xx<0||yy<0||xx>=COLS||yy>=ROWS) continue; const i=yy*COLS+xx; if(!grid[i])continue;const p=point(i),d=(p.x-x)**2+(p.y-y)**2;if(d<score){score=d;best=i;} }
    return best;
  }
  class Heap {
    constructor(){this.a=[];}
    push(id,score){const a=this.a;let i=a.length;const node={id,score};a.push(node);while(i>0){const p=(i-1)>>1;if(a[p].score<=score)break;a[i]=a[p];i=p;}a[i]=node;}
    pop(){const a=this.a,root=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].score<a[c].score)c++;if(a[c].score>=last.score)break;a[i]=a[c];i=c;}a[i]=last;}return root.id;}
  }
  function lineClear(a,b) { const d=dist(a,b),steps=Math.ceil(d);for(let i=1;i<=steps;i++){const t=i/steps;if(!walkable(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t))return false;}return true; }
  function pathfind(from,to) {
    const start=nearest(from.x,from.y),end=nearest(to.x,to.y);
    if(start<0||end<0)return [];
    if(start===end)return [point(end)];
    const open=new Heap(),scores=new Float32Array(grid.length).fill(Infinity),prev=new Int32Array(grid.length).fill(-1),closed=new Uint8Array(grid.length);
    const endP=point(end);scores[start]=0;open.push(start,0);
    while(open.a.length){const cur=open.pop();if(closed[cur])continue;if(cur===end){const out=[];let n=cur;while(n!==start){out.push(point(n));n=prev[n];}out.reverse();const simplified=[];let anchor=from,i=0;while(i<out.length){let far=i;while(far+1<out.length&&lineClear(anchor,out[far+1]))far++;simplified.push(out[far]);anchor=out[far];i=far+1;}return simplified;}
      closed[cur]=1;const cx=cur%COLS,cy=Math.floor(cur/COLS);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const x=cx+dx,y=cy+dy;if(x<0||x>=COLS||y<0||y>=ROWS)continue;const next=y*COLS+x;if(!grid[next]||closed[next])continue;if(dx&&dy&&(!grid[cy*COLS+x]||!grid[y*COLS+cx]))continue;if(!lineClear(point(cur),point(next)))continue;const g=scores[cur]+(dx&&dy?22.627:16);if(g<scores[next]){scores[next]=g;prev[next]=cur;open.push(next,g+dist(point(next),endP));}}
    }return [];
  }
    return {walkable,pathfind,nearest,point,lineClear,boundary,river,obstacles,landmarks:region.landmarks,grid};
  }
  const navigations=new Map();
  function forRegion(id='home'){if(!navigations.has(id)){const def=regionDefs.find(r=>r.id===id);if(!def)return null;navigations.set(id,makeNavigation(def));}return navigations.get(id);}
  const {walkable,pathfind,nearest,point,lineClear,boundary,river,landmarks}=forRegion('home');
  function seeded(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
  const rand=seeded(20261116);
  class IslandWorld {
    constructor(canvas,callbacks){
      this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.cb=callbacks;this.state=callbacks.state;this.started=this.state.started;this.paused=false;
      this.regionId=regionDefs.some(r=>r.id===this.state.region)?this.state.region:'home';this.region=regionDefs.find(r=>r.id===this.regionId);this.nav=forRegion(this.regionId);this.zoom=1;this.objectSprites={};this.touchSprint=false;this.touchLatch=new Set();this.touchCooldown=1;this.stepTimer=0;this.vx=0;this.vy=0;this.player={...this.region.spawn,walk:0,face:1,direction:'down',jump:0,pose:'idle'};this.spirit={x:this.player.x+42,y:this.player.y+16};this.path=[];this.npcPath=[];this.npcTimer=0;this.pending=null;this.keys=new Set();this.joystick={x:0,y:0};this.elapsed=0;this.last=0;this.phase='night';this.camera={x:0,y:0,scale:1};this.ready=false;this.sitting=false;this.looking=false;this.finale=0;this.effects=[];this.footsteps=[];
      this.itemCache=new Map();this.glowCache=new Map();this.activity=null;this.nearbyId=undefined;this.profile={cpu:0,frames:0};this.spirit.direction='down';this.spirit.walk=0;
      this.scenery=window.IslandScenery?new IslandScenery(this):null;this.assetsReady=false;
      this.pastimes=window.IslandPastimes?new IslandPastimes(this):null;
      this.fireworks=window.IslandFireworks?new IslandFireworks(this):null;
      this.waypoints=window.IslandWaypoints?new IslandWaypoints(this):null;
      Promise.allSettled([window.IslandCharacter?.ready,window.IslandSandcastle?.ready,window.IslandPastimes?.ready].filter(Boolean)).then(results=>{const failed=results.some(result=>result.status==='rejected'||result.value===false||(Array.isArray(result.value)&&result.value.includes(false)));this.assetError=failed?l10n("部分精细素材未能载入，请刷新后重试。"):'';this.assetsReady=!failed;this.checkReady();if(failed){this.cb.onReady?.(false);this.cb.toast(this.assetError);}});
      this.stars=Array.from({length:150},()=>({x:rand(),y:rand(),size:rand()>.85?2:1,phase:rand()*6.28,speed:.4+rand()}));
      this.flies=Array.from({length:32},()=>({x:170+rand()*1230,y:315+rand()*325,p:rand()*6.28,s:.3+rand()*.8}));
      this.particles=Array.from({length:23},()=>({x:740+rand()*365,y:170+rand()*300,p:rand()*8,s:8+rand()*12}));
      this.images={};for(const region of regionDefs){const image=new Image();this.images[region.id]=image;image.onload=()=>{if(this.regionId===region.id)this.checkReady();};image.onerror=()=>this.cb.toast(region.name+l10n("的图片未加载，请确认素材完整。"));image.src=(region.id==='home'&&window.ISLAND_ART)||window.ISLAND_ASSETS?.[region.art]||region.art;}this.image=this.images[this.regionId];
      canvas.addEventListener('wheel',e=>{if(!this.started||this.paused)return;e.preventDefault();this.zoom=Math.max(.7,Math.min(1.6,this.zoom-e.deltaY*.001));},{passive:false});
      const run=document.getElementById('run-button');if(run){run.addEventListener('pointerdown',e=>{this.touchSprint=true;run.setPointerCapture(e.pointerId);});const stop=()=>this.touchSprint=false;run.addEventListener('pointerup',stop);run.addEventListener('pointercancel',stop);run.addEventListener('lostpointercapture',stop);}
      this.resize();window.addEventListener('resize',()=>this.resize());
      canvas.addEventListener('pointerdown',e=>{this.pointerDown={x:e.clientX,y:e.clientY};});
      canvas.addEventListener('pointerup',e=>{if(!this.pointerDown||Math.hypot(e.clientX-this.pointerDown.x,e.clientY-this.pointerDown.y)>10)return;this.click(e.clientX,e.clientY);this.pointerDown=null;});
      window.addEventListener('keydown',e=>this.keydown(e));window.addEventListener('keyup',e=>this.keys.delete(e.code));window.addEventListener('blur',()=>this.clearInput());
      document.addEventListener('visibilitychange',()=>{this.clearInput();this.last=0;});
      requestAnimationFrame(t=>this.frame(t));
    }
    get companion(){return this.state.settings.companion||'spirit';}
    checkReady(){const ready=!!(this.assetsReady&&this.image?.complete&&this.image.naturalWidth);if(ready!==this.ready){this.ready=ready;this.cb.onReady?.(ready);}return this.ready;}
    get items(){if(!this.itemCache.has(this.regionId))this.itemCache.set(this.regionId,[...ISLAND_CONTENT.memories.filter(m=>(m.region||'home')===this.regionId).map(m=>({...m,name:m.theme,type:'memory'})),...this.region.landmarks,...(window.ISLAND_ADVENTURE||[]).filter(item=>item.region===this.regionId),...(window.ISLAND_ACTIVITIES||[]).filter(item=>item.region===this.regionId)]);return this.itemCache.get(this.regionId);}
    travel(id){const region=regionDefs.find(r=>r.id===id);if(!region)return false;this.regionId=id;this.region=region;this.nav=forRegion(id);this.image=this.images[id];this.checkReady();this.path=[];this.pending=null;this.npcPath=[];this.clearInput();this.vx=0;this.vy=0;Object.assign(this.player,region.spawn,{jump:0,walk:0,direction:'down'});const companion=this.nav.point(this.nav.nearest(this.player.x+42,this.player.y+15));Object.assign(this.spirit,companion);this.touchLatch.clear();this.touchCooldown=1.2;this.effects=[];if(this.scenery){this.scenery.events.length=0;this.scenery.windUntil=0;}this.state.region=id;window.IslandAudio?.setRegion?.(id);this.cb.regionChanged?.(id);this.updateCamera(1,true);this.cb.toast(l10n("抵达 ")+region.name+' · '+(region.subtitle||l10n("慢慢探索吧")));return true;}
    trigger(item){this.touchLatch.add(item.id);this.touchCooldown=.6;this.path=[];this.pending=null;this.vx=0;this.vy=0;this.player.actionUntil=this.elapsed+.35;this.scenery?.react(item);if(item.type==='portal'){this.travel(item.toRegion);return;}this.cb.interact(item);}
    seen(item){return item.type==='memory'?this.state.collected.includes(item.id):item.type==='story'?(this.state.exploration?.found||[]).includes(item.id):item.type==='activity'?(this.state.activities?.completed||[]).includes(item.id):false;}
    resize(){this.width=innerWidth;this.height=innerHeight;this.landscape=this.height<=540&&this.width<=1100&&this.width>760;this.mobile=this.width<=760||this.landscape;this.dpr=Math.min(2,devicePixelRatio||1);this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);this.ctx.imageSmoothingEnabled=false;this.skyCache=null;this.updateCamera(1,true);}
    updateCamera(dt,instant=false){let s,x,y;
      if(this.started&&!this.mobile){s=Math.max(.82,Math.min(1.12,this.height/830))*this.zoom;x=this.width*.60-this.player.x*s;y=this.height*.56-this.player.y*s;}
      else if(this.mobile&&this.started){s=(this.landscape?.78:Math.max(.82,Math.min(1,this.width/420)))*this.zoom;x=this.width*(this.landscape?.6:.5)-this.player.x*s;y=this.height*.51-this.player.y*s;}
      else if(this.landscape){s=Math.min((this.width-290)/W,(this.height-95)/H);x=270+(this.width-290-W*s)/2;y=75+(this.height-95-H*s)/2;}
      else if(this.mobile){s=(this.width+120)/W;x=(this.width-W*s)/2;y=this.height*.50-H*s/2;}
      else {const left=this.width<1100?190:240,available=this.width-left-20;s=Math.min(available/W,(this.height-165)/940);x=left+(available-W*s)/2;y=100+(this.height-165-H*s)/2;}
      if(this.activity){s=(this.mobile?.95:1.3)*this.zoom;const focus=this.activity.id==='stroll'?{x:this.companion==='none'?this.player.x:(this.player.x+this.spirit.x)/2,y:this.player.y}:this.activity.item;x=this.width*(this.landscape?.30:.5)-focus.x*s;y=this.height*(this.mobile?.38:.45)-focus.y*s;}
      if(this.started&&!this.mobile&&W*s>this.width&&!this.activity)x=Math.max(this.width-W*s,Math.min(0,x));
      const speed=instant?1:1-Math.exp(-dt*8);this.camera.x+=(x-this.camera.x)*speed;this.camera.y+=(y-this.camera.y)*speed;this.camera.scale+=(s-this.camera.scale)*speed;
    }
    toWorld(x,y){return{x:(x-this.camera.x)/this.camera.scale,y:(y-this.camera.y)/this.camera.scale};}
    toScreen(x,y){return{x:x*this.camera.scale+this.camera.x,y:y*this.camera.scale+this.camera.y};}
    clearInput(){this.keys.clear();this.joystick={x:0,y:0};this.touchSprint=false;}
    keydown(e){if(this.paused||!this.started||e.target.matches('input,textarea,select')||(e.target.closest('button')&&e.code==='Space'))return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','Space','KeyE','KeyF','KeyM','KeyJ','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();this.canvas.focus({preventScroll:true});if(!e.repeat){if(e.code==='Space')this.jump();else if(e.code==='KeyE'||e.code==='KeyF')this.interact();else if(e.code==='KeyM')this.cb.map();else if(e.code==='KeyJ')this.cb.journal();}this.keys.add(e.code);}}
    jump(){if(!this.paused&&this.started&&!this.player.jump&&!this.sitting){this.player.jump=.001;window.IslandAudio?.jump?.();}}
    nearestItem(){let best=null,score=82;for(const item of this.items){const d=dist(this.player,item);if(d<score){score=d;best=item;}}return best;}
    interact(){if(!this.started||this.paused)return;const item=this.nearestItem();if(item){this.path=[];this.pending=null;this.trigger(item);}else this.cb.toast(window.IslandPersonalization?.text('scene.navClose')||l10n("再靠近一点点，就能听见它的故事。"));}
    navigate(id){const item=this.items.find(i=>i.id===id);if(!item)return false;return this.go(item,item);}
    go(target,item=null){if(!this.started||this.paused)return false;if(item&&dist(this.player,item)<76){this.trigger(item);return true;}const end=this.nav.nearest(target.x,target.y);if(end<0){this.cb.toast(window.IslandPersonalization?.text('scene.navEdge')||l10n("那里是岛屿边缘，沿着小路走吧。"));return false;}const path=this.nav.pathfind(this.player,this.nav.point(end));if(!path.length){this.cb.toast(window.IslandPersonalization?.text('scene.navBlocked')||l10n("试着从木桥绕过去，星光会为你引路。"));return false;}this.path=path;this.pending=item;this.sitting=false;return true;}
    click(x,y){if(this.paused||!this.started)return;this.canvas.focus({preventScroll:true});const marker=this.waypoints?.hitTest(x,y);if(marker){this.go(marker,marker);return;}const p=this.toWorld(x,y);let selected=null,best=46;for(const item of this.items){const target={x:item.x,y:item.y-(item.type==='memory'?24:0)},d=dist(p,target);if(d<best){best=d;selected=item;}}if(selected)this.go(selected,selected);else if(inside(p.x,p.y,this.nav.boundary))this.go(p);}
    move(actor,dx,dy){const nx=actor.x+dx,ny=actor.y+dy;if(this.nav.walkable(nx,ny)){actor.x=nx;actor.y=ny;return true;}let moved=false;if(this.nav.walkable(nx,actor.y)){actor.x=nx;moved=true;}if(this.nav.walkable(actor.x,ny)){actor.y=ny;moved=true;}return moved;}
    faceMotion(actor,dx,dy){
      if(Math.hypot(dx,dy)<.001)return;
      const horizontal=actor.direction==='left'||actor.direction==='right',ax=Math.abs(dx),ay=Math.abs(dy);
      // Keep the current axis near a diagonal instead of flipping at every tiny correction.
      const side=horizontal?ax*1.25>=ay:ax>ay*1.25;
      actor.direction=side?(dx<0?'left':'right'):(dy<0?'up':'down');
      if(ax>.001)actor.face=dx<0?-1:1;
    }
    advanceGait(actor,distance,dt){
      actor.speed=dt>0?distance/dt:0;
      if(distance>.001){actor.gait=((actor.gait||0)+distance/20)%6400;actor.walk=actor.gait||.0001;}else actor.walk=0;
    }
    followPath(actor,path,speed,dt){
      const old={x:actor.x,y:actor.y};let remaining=Math.max(0,speed*dt);
      while(path.length&&remaining>.0001){
        const p=path[0],d=dist(actor,p);
        if(d<.0001){path.shift();continue;}
        const step=Math.min(d,remaining),x=actor.x,y=actor.y;
        this.move(actor,(p.x-x)/d*step,(p.y-y)/d*step);
        const travelled=Math.hypot(actor.x-x,actor.y-y);remaining-=step;
        if(dist(actor,p)<.0001)path.shift();
        if(travelled<step-.001)break;
      }
      this.faceMotion(actor,actor.x-old.x,actor.y-old.y);
      return dist(actor,old)>.001;
    }
    setPaused(value){this.paused=value;this.clearInput();if(value){this.path=[];this.pending=null;}else{this.sitting=false;this.looking=false;this.nearbyId=undefined;}}
    setPhase(phase){this.phase=phase;}
    celebrate(){this.finale=0;this.fireworks?.replay();}
    burst(x,y,color='#f1c794'){if(this.state.settings.reducedMotion)return;for(let i=0;i<40;i++){const a=i/40*Math.PI*2,v=60+rand()*130;this.effects.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1.2+rand(),max:2.2,color,size:2+rand()*3});}}
    collect(item){this.burst(item.x,item.y-24,item.color);}
    frame(timestamp){const dt=this.last?Math.max(0,Math.min((timestamp-this.last)/1000,.04)):.016;this.last=timestamp;if(!document.hidden){const began=performance.now();this.update(dt);this.draw();this.profile.cpu+=(performance.now()-began-this.profile.cpu)*.04;this.profile.frames++;}requestAnimationFrame(t=>this.frame(t));}
    update(dt){this.elapsed+=dt;const p=this.player;this.touchCooldown=Math.max(0,this.touchCooldown-dt);
      if(this.started&&!this.paused&&this.ready&&!this.activity){const old={x:p.x,y:p.y};let dx=(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0)+this.joystick.x;let dy=(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0)-(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0)+this.joystick.y;
        const mag=Math.hypot(dx,dy),manual=mag>.12;this.sprinting=this.touchSprint||this.keys.has('ShiftLeft')||this.keys.has('ShiftRight');const speed=this.sprinting?340:220;let moving=false;
        if(manual){this.path=[];this.pending=null;this.sitting=false;const n=Math.max(1,mag),ease=1-Math.exp(-dt*20);this.vx+=(dx/n*speed-this.vx)*ease;this.vy+=(dy/n*speed-this.vy)*ease;moving=this.move(p,this.vx*dt,this.vy*dt);if(Math.abs(dx)>.1)p.face=dx<0?-1:1;p.back=dy<-.3;p.direction=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');}
        else if(this.path.length){this.vx=0;this.vy=0;const next=this.path[0];p.back=next.y<p.y-3;moving=this.followPath(p,this.path,speed,dt);if(!moving){this.path=[];this.pending=null;}}
        else {this.vx*=Math.exp(-dt*24);this.vy*=Math.exp(-dt*24);if(Math.hypot(this.vx,this.vy)>3)moving=this.move(p,this.vx*dt,this.vy*dt);}
        const travelled=dist(p,old);this.advanceGait(p,travelled,dt);
        if(travelled>.001){p.stepDistance=(p.stepDistance||0)+travelled;if(p.stepDistance>=32){p.stepDistance%=32;if(!p.jump){window.IslandAudio?.footstep?.();this.dust(p.x,p.y,3);this.scenery?.step(p);}}}
        if(!this.path.length&&this.pending){const item=this.pending;this.pending=null;if(dist(p,item)<104)this.trigger(item);}
        if(!this.paused&&manual&&!p.jump){for(const item of this.items){const d=dist(p,item);if(d>65)this.touchLatch.delete(item.id);if(d<25&&!this.touchLatch.has(item.id)&&!this.seen(item)&&this.touchCooldown===0){this.trigger(item);break;}}}
        this.followCompanion(dt);
        const near=this.nearestItem();if(near?.id!==this.nearbyId){this.nearbyId=near?.id;this.cb.nearby(near);}
      }else {p.walk=0;p.speed=0;this.spirit.walk=0;this.spirit.speed=0;this.vx=0;this.vy=0;}
      if(p.jump>0){p.jump+=dt;if(p.jump>=.64){p.jump=0;window.IslandAudio?.land?.();this.dust(p.x,p.y,9);}}
      if(this.activity)this.updateActivity(dt);
      this.pastimes?.update(dt);
      let alive=0;for(const e of this.effects){e.life-=dt;e.x+=e.vx*dt;e.y+=e.vy*dt;e.vy+=(e.dust?-12:45)*dt;if(e.life>0)this.effects[alive++]=e;}this.effects.length=alive;
      this.fireworks?.update(dt);
      this.updateCamera(dt);
    }
    dust(x,y,count){if(this.state.settings.reducedMotion)return;for(let i=0;i<count;i++)this.effects.push({x:x+(rand()-.5)*18,y:y+2,vx:(rand()-.5)*26,vy:-7-rand()*13,life:.25+rand()*.2,max:.6,color:this.regionId==='coast'?'#e8d1ae':'#c9c7a0',size:2+Math.floor(rand()*2),dust:true});}
    followCompanion(dt){
      const p=this.player,s=this.spirit,old={x:s.x,y:s.y};
      if(this.companion==='none'){this.npcFollowing=false;this.advanceGait(s,0,dt);return;}
      const separation=dist(s,p);this.npcTimer-=dt;
      if(!this.npcFollowing&&separation>84)this.npcFollowing=true;
      if(this.npcFollowing&&separation<=70.15&&(p.speed||0)<3){this.npcFollowing=false;this.npcPath=[];}
      if(this.npcFollowing&&separation>70){
        const direct=this.nav.lineClear(s,p);
        // A visible player is a live destination; never chase a stale waypoint behind them.
        if(direct)this.npcPath=[{x:p.x,y:p.y}];
        else if(this.npcTimer<=0||!this.npcPath.length){this.npcPath=this.nav.pathfind(s,p);this.npcTimer=.35;}
        const speed=Math.min(this.sprinting?370:245,Math.max(0,(p.speed||0)+(separation-70)*6),(separation-70)/Math.max(dt,.001));
        this.followPath(s,this.npcPath,speed,dt);
      }
      this.advanceGait(s,dist(s,old),dt);
    }
    glow(x,y,r,color,alpha=1){const c=this.ctx,key=color+'|'+r;let sprite=this.glowCache.get(key);if(!sprite){sprite=document.createElement('canvas');sprite.width=sprite.height=Math.max(2,Math.ceil(r*2));const g=sprite.getContext('2d'),gradient=g.createRadialGradient(r,r,1,r,r,r);gradient.addColorStop(0,color);gradient.addColorStop(1,'transparent');g.fillStyle=gradient;g.fillRect(0,0,sprite.width,sprite.height);this.glowCache.set(key,sprite);}c.save();c.globalAlpha=alpha;c.drawImage(sprite,x-r,y-r,r*2,r*2);c.restore();}
    draw(){const c=this.ctx,t=this.state.settings.reducedMotion?0:this.elapsed;
      c.setTransform(this.dpr,0,0,this.dpr,0,0);if(!this.skyCache||this.skyCache.phase!==this.phase){const sky=c.createLinearGradient(0,0,0,this.height),colors=this.phase==='day'?['#294455','#64828b']:this.phase==='dusk'?['#282a49','#4b3e57']:['#0b1526','#14243a'];sky.addColorStop(0,colors[0]);sky.addColorStop(1,colors[1]);this.skyCache={phase:this.phase,paint:sky};}c.fillStyle=this.skyCache.paint;c.fillRect(0,0,this.width,this.height);
      this.glow(this.width*.66,this.height*.5,this.width*.48,this.phase==='day'?'#c2d9bd18':'#56619a18');
      if(this.phase!=='day'){for(const s of this.stars){const a=(.25+.5*(.5+.5*Math.sin(t*s.speed+s.phase)))*(this.phase==='dusk'?.5:1);c.globalAlpha=a;c.fillStyle=s.size===2?'#ddcbaa':'#a0bfdc';const x=Math.round(s.x*this.width),y=Math.round(s.y*this.height);c.fillRect(x,y,s.size,s.size);if(s.size===2&&s.phase<1.5){c.globalAlpha=a*.45;c.fillRect(x-2,y+1,6,1);c.fillRect(x+1,y-2,1,6);}}c.globalAlpha=1;}
      else{c.fillStyle='#dee7de14';for(let i=0;i<5;i++){const x=((this.width*(i*.23)+t*3)%(this.width+300))-150,y=130+i*60;c.fillRect(x,y,180,12);c.fillRect(x+30,y-10,90,10);}}
      // A faint orbit gives the island a place in its own little universe.
      c.save();c.strokeStyle='#829bba12';c.lineWidth=1;c.setLineDash([2,9]);c.beginPath();c.ellipse(this.width*.6,this.height*.72,this.width*.35,this.height*.13,-.05,0,Math.PI*2);c.stroke();c.restore();
      const cam=this.camera;c.save();c.translate(Math.round(cam.x),Math.round(cam.y));c.scale(cam.scale,cam.scale);c.imageSmoothingEnabled=false;
      if(this.ready)c.drawImage(this.image,0,0,W,H);else{c.fillStyle='#a7bbcf';c.font='18px sans-serif';c.textAlign='center';c.fillText(this.assetError||l10n("正在点亮你的星屿…"),W/2,500);}
      if(!this.ready){c.restore();return;}
      c.save();c.setTransform(this.dpr,0,0,this.dpr,0,0);this.fireworks?.draw(c,'sky');c.restore();
      if(this.phase==='day'){c.save();c.globalCompositeOperation='screen';this.glow(910,330,570,'#e6c282',.10);c.restore();}
      const light=this.phase==='day'?.4:1;c.save();if(this.regionId==='home'){c.globalCompositeOperation='screen';this.glow(379,453,80,'#ed9854',(.17+Math.sin(t*7)*.025)*light);this.glow(350,345,65,'#e9ae62',.15*light);this.glow(938,320,210,'#e29bb4',(this.state.finished?.18:.05)*light);}c.restore();
      if(this.ready&&this.scenery)this.scenery.draw(c,t,'ground');
      if(this.regionId==='home'){if(!this.scenery)this.water(t);this.fire(t);}else if(!this.scenery)this.regionEffects(t);this.drawPath(t);for(const item of this.items){if(item.type==='portal'||item.type==='story')this.drawObject(item,t);if(item.type==='activity')this.activityProp(item,t);}
      for(const m of ISLAND_CONTENT.memories.filter(m=>(m.region||'home')===this.regionId))this.crystal(m,t);
      // The scene uses the character foot position as its sorting anchor.
      if(this.player.y<this.spirit.y){this.character(t);this.guide(t);}else{this.guide(t);this.character(t);}if(this.activity?.id==='swing')this.swingFront(t);
      this.pastimes?.drawEffects(c);
      if(this.regionId==='home'&&this.ready&&(this.player.y<473||(this.companion!=='none'&&this.spirit.y<473))){c.save();c.beginPath();const shape=[[729,306],[788,215],[888,158],[1078,208],[1155,324],[1088,366],[1021,414],[1020,451],[958,471],[905,461],[889,414],[843,375],[767,366]];shape.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.clip();c.drawImage(this.image,0,0,W,H);c.restore();}
      if(this.phase!=='day'&&!this.state.settings.reducedMotion)for(const f of this.flies){const x=f.x+Math.sin(t*f.s+f.p)*17,y=f.y+Math.cos(t*f.s*.8+f.p)*13,a=.25+.6*(.5+.5*Math.sin(t+f.p));this.glow(x,y,11,'#dcf4b5',a*.18);c.fillStyle=`rgba(227,243,183,${a})`;c.fillRect(Math.round(x),Math.round(y),2,2);}
      if(this.ready&&this.scenery)this.scenery.draw(c,t,'air');
      else if(this.regionId==='home'&&!this.state.settings.reducedMotion)for(const p of this.particles){const x=p.x+Math.sin(t*.3+p.p)*35,y=190+((p.y-190+t*p.s)%300);c.fillStyle=this.state.finished?'#ffe1ad99':'#e6a3b56b';c.fillRect(Math.round(x),Math.round(y),4,2);}
      for(const e of this.effects){c.globalAlpha=Math.max(0,e.life/e.max);c.fillStyle=e.color;c.fillRect(Math.round(e.x),Math.round(e.y),e.size,e.size);}c.globalAlpha=1;
      if(!this.waypoints&&this.started&&!this.paused&&!this.capturing)this.landmarkLabels();
      c.restore();
      this.fireworks?.draw(c,'text');
      this.waypoints?.draw(c);
    }
    startActivity(id){const item=this.items.find(i=>i.id===id&&i.type==='activity');if(!item)return false;this.stopActivity();this.clearInput();this.path=[];this.pending=null;this.activity={id,item,time:0,power:0,progress:0,route:[],running:false,origin:{x:this.player.x,y:this.player.y},companionOrigin:{x:this.spirit.x,y:this.spirit.y}};this.vx=this.vy=0;this.player.walk=0;this.player.jump=0;this.spirit.walk=0;this.player.direction='down';this.spirit.direction='down';
      const offset=id==='swing'?24:id==='sandcastle'?88:id==='flower_garden'?96:['windmill','paper_boat'].includes(id)?55:30;const y=item.y+(id==='flower_garden'?25:0);Object.assign(this.player,{x:item.x-offset,y});Object.assign(this.spirit,id==='stroll'?{x:this.player.x+42,y:this.player.y+13}:{x:item.x+offset,y:y+2});this.npcFollowing=false;this.npcPath=[];this.npcTimer=0;this.sitting=id==='swing';this.looking=false;if(id!=='swing'){for(const actor of [this.player,this.spirit])if(!this.nav.walkable(actor.x,actor.y))Object.assign(actor,this.nav.point(this.nav.nearest(actor.x,actor.y)));}this.updateCamera(1,true);return true;}
    activityAction(action){const a=this.activity;if(!a)return null;if(this.pastimes?.handles(a.id))return this.pastimes.action(a,action);if(a.id==='swing'&&action==='push'){a.power=Math.min(1,a.power+.45);a.progress=1;this.dust(a.item.x,a.item.y,6);}
      if(a.id==='sandcastle'&&action==='build'){a.progress=(this.state.activities?.sandcastle||0)/3;a.buildUntil=a.time+1.2;this.dust(a.item.x,a.item.y+14,22);if(a.progress>=1)this.burst(a.item.x,a.item.y-42,'#ffe3a2');}
      if(a.id==='sandcastle'&&action==='reset'){a.progress=0;this.dust(a.item.x,a.item.y,12);}
      if(a.id==='stroll'&&action==='start'){a.running=true;a.progress=0;a.distance=0;a.route=[];let from={x:this.player.x,y:this.player.y};for(const target of [{x:840,y:623},{x:920,y:602},{x:1016,y:578},{x:1120,y:540}]){const part=this.nav.pathfind(from,target);a.route.push(...part);if(part.length)from=part[part.length-1];}a.total=0;from=this.player;for(const p of a.route){a.total+=dist(from,p);from=p;}a.originalRoute=a.route.map(p=>({...p}));}
      return {id:a.id,progress:a.progress};}
    stopActivity(){const a=this.activity;if(!a)return;Object.assign(this.player,a.origin,{walk:0,jump:0,direction:'down'});Object.assign(this.spirit,a.companionOrigin,{walk:0,direction:'down'});this.activity=null;this.sitting=false;this.looking=false;this.touchCooldown=1.5;this.touchLatch.add(a.id);this.npcPath=[];this.npcTimer=0;this.clearInput();this.updateCamera(.1);}
    followBeside(dt,previousPlayer){
      const p=this.player,s=this.spirit,old={x:s.x,y:s.y},beside={x:p.x+42,y:p.y+13};
      if(this.companion==='none'){this.advanceGait(s,0,dt);return;}
      this.npcTimer-=dt;
      if(this.nav.walkable(beside.x,beside.y)&&this.nav.lineClear(s,beside)){
        // Share the leader's displacement, then gently close formation error. No catch/stop loop.
        const dx=p.x-previousPlayer.x,dy=p.y-previousPlayer.y,blend=1-Math.exp(-dt*6);
        let mx=dx+(beside.x-s.x-dx)*blend,my=dy+(beside.y-s.y-dy)*blend;
        const amount=Math.hypot(mx,my),limit=130*dt;
        if(amount>limit){mx*=limit/amount;my*=limit/amount;}
        if(amount>.001)this.move(s,mx,my);
        this.npcPath=[];
      }else{
        if(this.npcTimer<=0||!this.npcPath.length){this.npcPath=this.nav.pathfind(s,beside);this.npcTimer=.3;}
        this.followPath(s,this.npcPath,Math.min(110,76+dist(s,beside)*2),dt);
      }
      this.faceMotion(s,s.x-old.x,s.y-old.y);this.advanceGait(s,dist(s,old),dt);
    }
    updateActivity(dt){const a=this.activity;a.time+=dt;if(a.id!=='stroll'||!a.running){this.player.walk=0;this.spirit.walk=0;}
      if(a.id==='swing'){this.sitting=true;const reduced=this.state.settings.reducedMotion,angle=reduced?0:Math.sin(a.time*1.9)*(.12+a.power*.34),offset=Math.sin(angle)*67,lift=(1-Math.cos(angle))*67;a.power=Math.max(0,a.power-dt*.025);this.player.x=a.item.x-24+offset;this.player.y=a.item.y-lift;this.spirit.x=a.item.x+28+offset;this.spirit.y=a.item.y-lift+1;}
      if(a.id==='sandcastle'){this.sitting=a.buildUntil>a.time;this.player.direction='right';this.spirit.direction='left';if(a.buildUntil>a.time&&Math.floor(a.time*15)%3===0&&!this.state.settings.reducedMotion)this.dust(a.item.x,a.item.y+5,1);}
      if(a.id==='stroll'&&a.running){const old={x:this.player.x,y:this.player.y};this.followPath(this.player,a.route,76,dt);const travelled=dist(old,this.player);a.distance+=travelled;a.progress=a.total?Math.min(1,a.distance/a.total):1;this.advanceGait(this.player,travelled,dt);this.followBeside(dt,old);if(!a.route.length){a.progress=1;a.running=false;this.player.walk=0;this.spirit.walk=0;}}
    }
    activityProp(item,t){if(this.pastimes?.drawProp(this.ctx,item,t))return;const active=this.activity?.id===item.id,near=dist(this.player,item)<110;if(item.id==='sandcastle'&&window.IslandSandcastle){IslandSandcastle.draw(this.ctx,{x:item.x,y:item.y,stage:this.state.activities?.sandcastle||0,time:t,reducedMotion:this.state.settings.reducedMotion,active,building:active&&this.activity.buildUntil>this.activity.time});if(near&&!active&&!this.capturing&&dist(this.player,item)>70)this.label(item.x,item.y-110,item.name+' · F','#f5dca7');return;}const key='activity:'+item.id+':'+(item.id==='sandcastle'?(this.state.activities?.sandcastle||0):item.id==='swing'?active:0);let sprite=this.objectSprites[key];if(!sprite){sprite=document.createElement('canvas');sprite.width=240;sprite.height=220;const c=sprite.getContext('2d');c.save();c.translate(120,180);const r=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
      if(item.id==='swing'){
        c.fillStyle='#12252440';c.beginPath();c.ellipse(0,7,88,14,0,0,Math.PI*2);c.fill();
        // Paired garden swing: mortised cedar, brass joints and climbing blossoms.
        r(-79,-137,158,11,'#493d43');r(-76,-136,152,6,'#ae8260');r(-74,-136,148,2,'#e2b282');r(-82,-142,164,6,'#765744');r(-79,-142,158,2,'#c69a6a');
        for(const x of [-72,66]){r(x-3,-130,11,139,'#443b3f');r(x,-130,6,136,'#9b7356');r(x,-129,2,134,'#d0a47a');r(x-8,6,21,5,'#675a55');r(x+1,-123,3,3,'#f5d89d');}
        for(let i=0;i<12;i++){const x=-68+i*12,y=-140+(i%3)*2;r(x,y,7,4,'#5d8057');r(x+3,y-3,5,3,'#9eb775');if(i%2===0){r(x+3,y-5,6,5,i%4?'#e9a3b5':'#f4dca2');r(x+5,y-3,2,2,'#fff0cf');}}
        for(let i=0;i<8;i++){const x=i%2?-71:69,y=-115+i*15;r(x,y,5,7,'#6a9362');r(x-3,y+2,8,3,'#a3b97b');if(i%3===0){r(x-2,y,7,5,'#e4a1b1');r(x,y+1,2,2,'#ffe8ad');}}
        if(!active){for(const x of [-24,28]){r(x-19,-129,2,120,'#d9c59b');r(x+17,-129,2,120,'#c0ad8e');r(x-22,-10,44,6,'#6d4b40');r(x-20,-10,40,2,'#d2a174');r(x-19,-7,38,3,'#9e775b');}}
      }else if(item.id==='sandcastle'){
        const stage=this.state.activities?.sandcastle||0;r(-48,10,96,6,'#cfa66b');r(-40,16,80,5,'#b88e5b');r(-44,8,88,5,'#efce8d');
        if(stage){r(-31,-8,62,23,'#b68b57');r(-29,-8,58,19,'#e7c282');r(-30,-8,60,3,'#ffdc9b');r(-24,-2,48,1,'#d7ad70');r(-24,6,48,1,'#d7ad70');r(-5,-3,10,18,'#a67c56');r(-3,-5,6,3,'#a67c56');r(-3,0,6,15,'#715e51');}
        if(stage>=2){for(const x of [-32,20]){r(x,-29,14,43,'#bd925c');r(x+2,-29,10,40,'#f0ce8d');r(x+2,-27,2,37,'#ffe2a6');r(x-2,-34,18,7,'#d3ab70');for(let k=0;k<3;k++)r(x-2+k*7,-38,4,8,'#f5d799');r(x+5,-18,4,7,'#ad8357');}r(-13,-30,26,22,'#dfb777');r(-11,-30,22,3,'#ffe0a0');r(-6,-23,12,9,'#b88f60');r(-4,-23,8,2,'#f8d697');}
        if(stage>=3){r(-1,-61,2,31,'#826b57');r(1,-59,20,11,'#d58b9f');r(1,-59,20,2,'#f4bfbd');r(17,-57,6,7,'#d58b9f');r(19,-55,7,3,'#d58b9f');r(8,-56,3,5,'#ffe8b2');r(6,-54,7,1,'#ffe8b2');for(const [x,y]of[[-38,18],[30,20],[44,9]]){r(x,y,7,3,'#fbe4c1');r(x+1,y-2,5,3,'#e2a8a2');r(x+3,y-3,1,4,'#fff1cd');}}
        r(47,2,13,14,'#668c9b');r(49,4,9,10,'#94c7cc');r(46,0,15,3,'#cee5d6');r(50,-6,7,2,'#f3d5a8');r(49,-4,2,5,'#b48f63');r(56,-4,2,5,'#b48f63');r(-55,2,3,17,'#a48361');r(-59,15,11,7,'#89a4a3');r(-57,21,7,3,'#6d8c8b');
      }else if(item.id==='photo'){r(-3,-44,5,44,'#7d6d62');for(let i=0;i<8;i++){r(-3-i*2,-24+i*3,4,4,'#544b4b');r(i*2,-24+i*3,4,4,'#938171');}r(-17,-58,34,22,'#3e4650');r(-15,-56,30,17,'#7c998e');r(-15,-56,30,3,'#acc4a7');r(-11,-61,10,4,'#5d706b');r(3,-54,12,12,'#303b4d');r(5,-52,8,8,'#a4d5d9');r(7,-52,4,3,'#eff4d5');r(-12,-52,5,4,'#ead8a6');r(12,-57,3,2,'#e8b2a3');
      }else {r(-20,-34,4,38,'#8d7058');r(-32,-35,34,16,'#e8cda0');r(-30,-33,30,12,'#b28e67');r(-26,-29,20,2,'#f6dfb1');r(-10,-32,2,7,'#f6dfb1');for(let i=0;i<4;i++){r(10+i*7,-4+i%2*4,4,2,'#d7b48b');r(12+i*7,-7+i%2*4,2,2,'#ead2ac');}}
      c.restore();this.objectSprites[key]=sprite;}this.ctx.drawImage(sprite,Math.round(item.x)-120,Math.round(item.y)-180);if(near&&!active&&!this.capturing&&dist(this.player,item)>70)this.label(item.x,item.y-(item.id==='swing'?162:85),item.name+' · F','#f5dca7');}
    swingFront(t){const a=this.activity,c=this.ctx;for(const actor of [this.player,...(this.companion==='none'?[]:[this.spirit])]){const anchor=actor===this.player?a.item.x-24:a.item.x+28;c.save();c.strokeStyle='#d7c7a0';c.lineWidth=2;c.beginPath();c.moveTo(anchor-20,a.item.y-128);c.lineTo(actor.x-20,actor.y-10);c.moveTo(anchor+20,a.item.y-128);c.lineTo(actor.x+20,actor.y-10);c.stroke();c.fillStyle='#714e43';c.fillRect(Math.round(actor.x-23),Math.round(actor.y-10),46,7);c.fillStyle='#d7ac78';c.fillRect(Math.round(actor.x-21),Math.round(actor.y-10),42,2);c.restore();}}
    capturePhoto(){const old={ctx:this.ctx,canvas:this.canvas,width:this.width,height:this.height,dpr:this.dpr,camera:this.camera,skyCache:this.skyCache,capturing:this.capturing};const shot=document.createElement('canvas');shot.width=1600;shot.height=1080;try{this.canvas=shot;this.ctx=shot.getContext('2d',{alpha:false});this.width=1600;this.height=950;this.dpr=1;this.skyCache=null;this.capturing=true;const middleX=this.companion==='none'?this.player.x:(this.player.x+this.spirit.x)/2;this.camera={scale:1.6,x:800-middleX*1.6,y:550-this.player.y*1.6};this.draw();const c=this.ctx;c.setTransform(1,0,0,1,0,0);c.fillStyle='#f6eedb';c.fillRect(0,950,1600,130);c.strokeStyle='#f6eedb';c.lineWidth=28;c.strokeRect(14,14,1572,1052);c.fillStyle='#43505a';c.font='bold 30px "Microsoft YaHei",sans-serif';c.fillText(l10n("星屿寻迹 · ")+this.region.name,55,1007);c.font='18px "Microsoft YaHei",sans-serif';c.fillStyle='#8b7b68';c.fillText(window.IslandPersonalization?.text(this.companion==='boy'?'scene.photoBoy':this.companion==='none'?'scene.photoAlone':'scene.photoGuide')||l10n("把此刻好好收藏。"),55,1044);c.textAlign='right';c.fillText(new Date().toLocaleDateString(window.IslandI18n?.locale||'zh-CN',{timeZone:'Asia/Shanghai'}),1540,1044);return shot.toDataURL('image/png');}finally{Object.assign(this,old);}}
    regionEffects(t){const c=this.ctx;c.save();if(this.regionId==='forest'){
      c.strokeStyle='#b9f1d73b';c.lineWidth=1;for(let i=0;i<3;i++){c.beginPath();c.ellipse(520,435,24+((t*8+i*21)%60),8+((t*3+i*8)%20),-.1,0,Math.PI*2);c.stroke();}
      this.glow(356,258,72,'#efb770',.10);this.glow(1282,199,72,'#efc58a',.12);
      if(!this.state.settings.reducedMotion)for(let i=0;i<9;i++){const x=710+i*47+Math.sin(t*.6+i)*35,y=365+Math.cos(t*.7+i*2)*70;c.fillStyle=['#ecb3d5','#e9dc9d','#b5d7ef'][i%3];const wing=Math.sin(t*8+i)>0?4:2;c.fillRect(Math.round(x)-wing,Math.round(y),wing,3);c.fillRect(Math.round(x)+1,Math.round(y)-1,wing,3);}
    }else if(this.regionId==='coast'){
      this.glow(298,95,110,'#efc780',.16);this.glow(1215,257,99,'#8ad8ed',.12);c.fillStyle='#d9fbf3';
      for(let i=0;i<25;i++){const x=400+i*35,y=730-Math.sin(i/25*Math.PI)*35+Math.sin(t*1.4+i)*6;c.globalAlpha=.15+.15*Math.sin(t+i);c.fillRect(Math.round(x),Math.round(y),8+(i%3)*4,1);}
    }c.restore();}
    drawObject(item,t){const c=this.ctx,seen=this.seen(item),done=item.questId&&(this.state.exploration?.completed||[]).includes(item.questId),near=dist(this.player,item)<86,color=item.color||'#d8c495';
      if(item.type==='portal'){let sprite=this.objectSprites['gate-'+item.toRegion];if(!sprite){sprite=document.createElement('canvas');sprite.width=64;sprite.height=76;const g=sprite.getContext('2d'),r=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};r(27,29,8,42,'#514640');r(29,30,4,40,'#a58260');r(29,37,1,29,'#d0ac7a');r(31,46,2,6,'#7d604b');r(23,69,17,4,'#7c7861');r(20,68,5,3,'#bac28c');r(38,65,3,7,'#89a36b');r(40,67,3,4,'#abc689');r(8,11,44,26,'#50443e');r(6,15,48,18,'#50443e');r(9,13,41,20,'#a7825a');r(10,13,39,3,'#ddba82');r(9,29,41,4,'#815b46');r(12,18,36,1,'#b99265');r(12,26,36,1,'#b99265');r(13,20,6,1,'#846647');r(41,23,7,1,'#846647');r(11,16,2,2,'#e1c793');r(46,16,2,2,'#e1c793');r(12,29,2,2,'#604c40');r(46,29,2,2,'#604c40');const tint=item.toRegion==='coast'?'#a5dedb':item.toRegion==='forest'?'#cfdd99':'#f2d3ac';if(item.toRegion==='forest'){r(27,18,3,11,tint);r(22,20,5,3,tint);r(30,23,5,3,tint);}else if(item.toRegion==='coast'){for(let i=0;i<3;i++){r(20+i*7,22,7,2,tint);r(24+i*7,20,4,2,tint);}}else{r(24,22,12,8,tint);r(26,19,8,3,tint);r(28,17,4,2,tint);r(29,25,3,5,'#946e50');}r(53,19,3,23,'#665347');r(50,41,9,3,'#c4a16b');r(51,44,7,9,'#65594c');r(53,45,3,6,'#ffe5a6');r(50,53,9,2,'#8c7055');this.objectSprites['gate-'+item.toRegion]=sprite;}c.save();c.fillStyle='#14201c30';c.beginPath();c.ellipse(item.x,item.y+2,22,6,0,0,Math.PI*2);c.fill();c.drawImage(sprite,Math.round(item.x)-32,Math.round(item.y)-70);this.glow(item.x+22,item.y-20,18,'#f8d493',.14);c.restore();if(near&&dist(this.player,item)>70)this.label(item.x,item.y-80,item.name+' · F','#e5d6b2');return;}
      if(seen&&item.kind==='pickup'){c.save();c.strokeStyle=color+'66';c.lineWidth=1;c.beginPath();c.ellipse(item.x,item.y,13,5,0,0,Math.PI*2);c.stroke();c.fillStyle=color+'99';c.fillRect(item.x-2,item.y-5,4,4);c.restore();if(near&&dist(this.player,item)>70)this.label(item.x,item.y-34,item.name+l10n(" · 已拾取"),color);return;}
      c.save();c.fillStyle='#0b182b55';c.beginPath();c.ellipse(item.x,item.y+1,18,7,0,0,Math.PI*2);c.fill();if(near||done)this.glow(item.x,item.y-18,42,color,done?.18:.1);
      const cacheKey=item.id+'-'+!!done;let sprite=this.objectSprites[cacheKey];if(!sprite){const raw=document.createElement('canvas');raw.width=48;raw.height=48;const pixel=raw.getContext('2d');pixel.translate(24,40);const r=(x,y,w,h,col)=>{pixel.fillStyle=col;pixel.fillRect(x,y,w,h);};
      if(item.id==='flower_bed'){r(-16,-5,32,7,'#786052');r(-14,-3,28,3,'#a1805b');for(let i=0;i<5;i++){const x=-11+i*5,h=done?8+i%3:4;r(x,-h-2,1,h,'#719c62');r(x-2,-h+1,3,1,'#99c97d');if(done){r(x-2,-h-4,5,3,['#ecabc8','#f3d694','#c3b8ed'][i%3]);r(x,-h-4,1,2,'#faf2d1');}}}
      else if(item.id==='postbox'){r(-2,-9,4,11,'#87644f');r(-9,-23,18,14,'#ad6f66');r(-7,-25,14,3,'#d3987a');r(-6,-18,12,2,'#423f4d');r(7,-23,2,8,'#e8bb81');r(9,-23,5,4,done?'#ffe0a1':'#8daba4');if(done){r(-2,-8,4,3,'#f3d79b');}}
      else if(item.id==='music_box'){r(-11,-11,22,10,'#9b7156');r(-9,-10,18,6,'#ca9c70');r(-11,-16,22,5,'#d8b889');r(-8,-14,16,1,'#edce96');r(-2,-8,4,4,'#efc46d');if(done){r(3,-27,1,8,'#d8e2f0');r(0,-20,4,2,'#d8e2f0');r(4,-27,4,1,'#d8e2f0');r(-4,-32,1,7,'#e6bdd2');r(-7,-26,4,2,'#e6bdd2');}}
      else if(item.id==='wind_chime'){r(-6,-28,12,2,'#ae8f69');r(-1,-33,1,5,'#cab392');for(let i=0;i<3;i++){const x=-5+i*5;r(x,-26,1,10+i*2,'#c5d5e2');r(x-1,-17+i*2,3,5,['#e6cf91','#a5dfe1','#dcc2e2'][i]);}r(-4,-5,8,3,'#907a69');}
      else if(item.id==='bottle_letter'){r(-3,-21,6,4,'#be9967');r(-2,-17,4,4,'#8cc8d5');r(-6,-13,12,11,'#629fb4');r(-4,-12,8,9,'#b1e1dd');r(-2,-11,4,7,'#f1d4a5');r(-5,-10,1,5,'#e4fbf0');r(-4,-2,8,2,'#628b9c');}
      else if(item.id==='white_shell'){r(-9,-9,18,8,'#edc5c1');r(-7,-13,14,4,'#f4dcd2');r(-4,-15,8,2,'#fff0dc');for(let x=-6;x<=6;x+=3)r(x,-11,1,8,'#c88eac');r(-2,-3,4,3,'#f9e4b9');}
      else if(item.id==='seed_pouch'){r(-6,-18,12,3,'#c59573');r(-8,-15,16,13,'#be8874');r(-6,-14,12,10,'#e4b993');r(-4,-21,8,3,'#ebd1a6');r(-5,-17,10,2,'#84665b');r(-3,-10,6,4,'#f6deaa');r(-1,-12,2,7,'#8ca36d');}
      else if(item.id==='pressed_leaf'){r(-1,-19,2,18,'#bda66e');r(-5,-17,4,5,'#7aab75');r(1,-14,5,5,'#b0cc83');r(-6,-9,5,4,'#91bd7c');r(1,-6,4,3,'#d2cc8c');}
      else if(item.id==='old_note'){r(-9,-14,18,13,'#a68164');r(-8,-16,16,14,'#ead7b3');r(-5,-12,9,1,'#9a8d86');r(-5,-9,6,1,'#9a8d86');r(2,-6,3,2,'#c48a9b');}
      else if(item.id==='greenhouse_journal'){r(-12,-18,24,19,'#496c70');r(-10,-17,20,15,'#93b3a0');r(-9,-16,2,14,'#d4cda6');r(-6,-12,14,1,'#d7dfbf');r(-3,-9,9,1,'#d7dfbf');r(1,-15,1,12,'#547e5c');r(-2,-13,3,2,'#dbe7a6');r(2,-10,3,2,'#dbe7a6');r(-11,-1,23,2,'#eedfc3');r(6,0,2,5,'#d6a1a8');}
      else if(item.id==='moon_thread'){r(-7,-20,14,3,'#b7906c');r(-4,-17,8,14,'#d0c9e2');for(let y=-16;y<-3;y+=3)r(-4,y,8,1,'#f6e9de');r(-7,-4,14,4,'#c29d73');r(-5,-3,10,1,'#ebca94');r(5,-10,8,1,'#e6dcf1');r(12,-10,1,8,'#e6dcf1');r(9,-3,4,1,'#e6dcf1');}
      else if(item.id==='silver_paper'){r(-11,-19,22,19,'#9880a9');r(-10,-21,20,19,'#d2c3e9');r(-9,-20,17,2,'#f1e6f6');r(5,-20,3,5,'#ac94bf');r(8,-17,2,3,'#f2e4f4');r(-4,-15,6,8,'#f0dfb1');r(-2,-16,5,6,'#d2c3e9');r(-7,-5,13,1,'#ab94bb');}
      else if(item.id==='moon_kite'){r(-10,-2,20,3,'#a58864');r(-2,-33,3,33,'#bd9d74');r(-13,-22,27,2,'#e4cc97');if(done){for(let row=0;row<15;row++){const width=14-Math.abs(row-7)*2;r(-Math.max(1,width)/2,-32+row,Math.max(1,width),1,row<7?'#d7b7e6':'#eeb7b6');}r(0,-32,1,15,'#f8e6bd');r(-7,-25,15,1,'#f8e6bd');for(let y=-15;y<-4;y+=4){r(-1,y,2,3,'#c7d5d1');r(-3,y,2,2,'#edc89e');r(1,y+1,3,2,'#d4bde4');}}else{r(-8,-28,1,15,'#d2bd8d');r(8,-28,1,15,'#d2bd8d');}}
      else if(item.id==='lakeside_blanket'){r(-17,-13,34,14,'#bc8594');r(-16,-12,32,12,'#e6b7b3');for(let x=-14;x<16;x+=7)r(x,-12,2,12,'#f4d9bf');for(let y=-11;y<1;y+=5)r(-16,y,32,1,'#f4d9bf');r(-8,-20,12,10,'#947458');r(-6,-19,8,7,'#d0a773');r(6,-11,6,6,'#eadfc4');r(7,-12,4,2,'#9d7b60');r(12,-9,2,3,'#dad9c0');}
      else if(item.id==='tea_table'){r(-12,-6,24,4,'#b18b6c');r(-10,-2,3,5,'#705e50');r(7,-2,3,5,'#705e50');r(-4,-13,8,6,'#e2d4b4');r(4,-12,3,4,'#bfc6bf');r(-3,-14,6,2,'#866c57');r(-2,-20,1,3,'#d4d9d1');r(1,-24,1,3,'#d4d9d1');}
      else if(item.id==='fox_trail'){for(let i=0;i<3;i++){const x=-7+i*6,y=-3-i*6;r(x,y,4,3,'#c99b7a');r(x-1,y-3,2,2,'#c99b7a');r(x+3,y-3,2,2,'#c99b7a');}}
      else if(item.id==='tide_clock'){r(-10,-7,20,7,'#7897ad');r(-7,-10,14,3,'#a3bdc7');r(-6,-7,12,4,'#79b8cc');r(-1,-9,2,8,'#e4d2a4');r(-5,-5,10,1,'#e4d2a4');}
      else if(item.id==='lighthouse_stone'){r(-8,-17,16,18,'#728ca6');r(-6,-20,12,4,'#a2b4be');r(-5,-16,10,12,'#b8c5c8');r(-1,-14,2,8,'#e6c890');r(-4,-11,8,2,'#e6c890');}
      else {r(-12,-7,24,8,'#967761');r(-10,-9,20,3,'#c2a17a');r(-6,-6,14,1,'#6e6559');r(-3,-15,9,7,'#e2ceb1');r(-1,-12,5,1,'#8d929b');}
      // Small material accents stay baked into the cached sprites: paper folds,
      // wood grain, stitched fabric, carved stone and tiny specular edges.
      if(item.id==='old_note'){r(-8,-16,16,1,'#fff0ce');r(-8,-15,1,12,'#f4dfb4');r(5,-16,3,4,'#c7a77f');r(5,-16,1,3,'#fff0ce');r(-5,-6,4,1,'#b5a18b');r(-5,-4,7,1,'#c1ab90');r(2,-8,5,5,'#aa6578');r(3,-7,3,3,'#d5939b');r(4,-7,1,2,'#f0bbac');r(-10,-2,3,1,'#725849');}
      if(['music_box','tea_table','postbox'].includes(item.id)){r(-8,-5,5,1,'#80604d');r(3,-3,4,1,'#e5bd86');r(-8,-8,2,1,'#f2d5a5');if(item.id==='music_box'){r(-8,-15,2,1,'#fff0b9');r(7,-15,2,1,'#fff0b9');r(-10,-8,1,4,'#efc48b');r(9,-8,1,4,'#724f46');r(-5,-12,10,1,'#754e41');}}
      if(item.id==='seed_pouch'){r(-6,-11,1,6,'#f3d5aa');r(-4,-3,9,1,'#a6715f');r(-7,-16,2,3,'#ead0aa');r(4,-17,2,4,'#78564c');r(-1,-17,2,1,'#e8dab7');}
      if(item.id==='lighthouse_stone'){r(-6,-19,10,1,'#d6d9cc');r(-6,-16,1,13,'#e2dfcc');r(5,-16,1,15,'#71899a');r(-4,-4,8,1,'#8199a5');r(-3,-2,4,1,'#c9cdbd');r(-5,-8,2,1,'#8b9ca7');r(3,-14,2,1,'#91a6b2');}
      if(item.id==='tide_clock'){r(-7,-9,14,1,'#d6d9c3');r(-8,-6,1,3,'#bdd9d4');for(let k=0;k<4;k++)r(-4+k*3,-6,1,1,'#d9e6d7');r(4,-4,2,1,'#426d88');}
      if(item.id==='white_shell'){r(-6,-12,2,1,'#fff1dd');r(-2,-14,2,1,'#fff9e8');r(-8,-5,1,2,'#fbe5ce');r(5,-3,2,1,'#d495aa');}
      if(item.id==='bottle_letter'){r(-3,-20,6,1,'#e3bd87');r(-5,-9,1,5,'#f4fff2');r(3,-9,1,5,'#83bcbf');r(0,-10,1,4,'#b99b78');r(-3,-2,7,1,'#8bc3c9');}
      const outline=document.createElement('canvas');outline.width=48;outline.height=48;const ink=outline.getContext('2d');ink.drawImage(raw,0,0);ink.globalCompositeOperation='source-in';ink.fillStyle='#453d49';ink.fillRect(0,0,48,48);sprite=document.createElement('canvas');sprite.width=50;sprite.height=50;const out=sprite.getContext('2d');for(const [x,y] of [[0,1],[2,1],[1,0],[1,2]])out.drawImage(outline,x,y);out.drawImage(raw,1,1);this.objectSprites[cacheKey]=sprite;}
      c.drawImage(sprite,Math.round(item.x)-50,Math.round(item.y)-82,100,100);c.restore();if(done&&!this.state.settings.reducedMotion){for(let i=0;i<3;i++){const angle=t*.7+i*2.1;c.fillStyle=color+'99';c.fillRect(Math.round(item.x+Math.sin(angle)*24),Math.round(item.y-30-(t*12+i*13)%36),2,3);}}if(!seen&&!done){const y=item.y-44+Math.sin(t*2+item.x)*3;c.fillStyle=color;c.fillRect(item.x-1,y,2,6);c.fillRect(item.x-3,y+2,6,2);}if(near&&dist(this.player,item)>70)this.label(item.x,item.y-67,item.name+' · F',color);
    }
    water(t){const c=this.ctx;c.save();c.globalAlpha=.35;c.fillStyle='#c8fff4';for(let i=0;i<16;i++){const x=348+(i%5)*11,y=644+((i*47+t*112)%236);c.fillRect(Math.round(x),Math.round(y),2,10+(i%4)*4);}for(let i=0;i<8;i++){const x=568+Math.sin(i*2.3)*28,y=332+i*22+Math.sin(t*1.7+i)*3;if(y>447&&y<495)continue;c.fillRect(Math.round(x),Math.round(y),8,1);}c.restore();}
    fire(t){const c=this.ctx;c.save();c.translate(377,457);const frame=Math.floor(t*9)%3;c.fillStyle='#f3a246';c.beginPath();c.moveTo(-14,7);c.lineTo(-14,-8);c.lineTo(-8,-11);c.lineTo(-7,-29-frame*2);c.lineTo(-1,-19);c.lineTo(3,-40+frame*3);c.lineTo(9,-22);c.lineTo(12,-24);c.lineTo(16,-8);c.lineTo(11,7);c.closePath();c.fill();c.fillStyle='#f8d77e';c.fillRect(-6,-14,11,19);c.fillRect(-2,-24+frame*3,5,12);c.fillStyle='#fff0b3';c.fillRect(-2,-8,5,11);for(let i=0;i<4;i++){const yy=-20-((t*30+i*19)%60);c.globalAlpha=1+yy/90;c.fillRect(Math.round(Math.sin(t+i)*14),Math.round(yy),2,3);}c.restore();}
    drawPath(t){if(!this.path.length)return;const c=this.ctx;c.save();c.strokeStyle='#f6deb366';c.lineWidth=2;c.setLineDash([2,11]);c.beginPath();c.moveTo(this.player.x,this.player.y);this.path.forEach(p=>c.lineTo(p.x,p.y));c.stroke();const end=this.path[this.path.length-1];c.strokeStyle='#f0d3a2aa';c.setLineDash([]);c.beginPath();c.ellipse(end.x,end.y,11+Math.sin(t*4)*2,5,0,0,Math.PI*2);c.stroke();c.restore();}
    crystal(m,t){const c=this.ctx,lit=this.state.collected.includes(m.id),bob=Math.sin(t*1.9+ISLAND_CONTENT.memories.indexOf(m))*4,y=m.y-28+bob;
      c.save();c.fillStyle='#091a2c70';c.beginPath();c.ellipse(m.x,m.y,15,6,0,0,Math.PI*2);c.fill();if(lit){c.strokeStyle=m.color+'66';c.lineWidth=1;c.beginPath();c.ellipse(m.x,m.y,17,7,0,0,Math.PI*2);c.stroke();}
      this.glow(m.x,y,lit?25:39,m.color,lit?.12:.24);c.globalAlpha=lit?.42:1;c.fillStyle=m.color;c.beginPath();c.moveTo(m.x,y-17);c.lineTo(m.x+10,y-4);c.lineTo(m.x+8,y+9);c.lineTo(m.x,y+17);c.lineTo(m.x-9,y+7);c.lineTo(m.x-10,y-4);c.closePath();c.fill();c.fillStyle='#ffffff75';c.beginPath();c.moveTo(m.x,y-17);c.lineTo(m.x-2,y-2);c.lineTo(m.x-10,y-4);c.closePath();c.fill();c.fillStyle='#15294a42';c.beginPath();c.moveTo(m.x,y+17);c.lineTo(m.x+10,y-4);c.lineTo(m.x-2,y-2);c.closePath();c.fill();c.globalAlpha=1;
      if(!lit){c.fillStyle=m.color;c.fillRect(m.x+17,Math.round(y-13+Math.sin(t*2)*5),2,5);c.fillRect(m.x+15,Math.round(y-11+Math.sin(t*2)*5),6,1);}
      if(this.started&&dist(this.player,m)<115)this.label(m.x,m.y+26,lit?m.theme+l10n(" · 已点亮"):m.theme+l10n(" · 记忆碎片"),m.color);c.restore();
    }
    activityPose(){if(this.pastimes?.handles(this.activity?.id)&&this.activity.workUntil>this.activity.time)return this.activity.id==='flower_garden'?'build':'wave';return this.activity?.id==='photo'?'photo':this.activity?.id==='sandcastle'&&this.activity.buildUntil>this.activity.time?'build':this.activity?.id==='swing'?'sit':undefined;}
    character(t){if(window.IslandCharacter){window.IslandCharacter.draw(this.ctx,this.player,{time:t,phase:this.phase,pose:this.activityPose(),shadow:this.activity?.id!=='swing',sitting:this.sitting,looking:this.looking,reducedMotion:this.state.settings.reducedMotion});if(!this.started)this.label(this.player.x,this.player.y-120,window.IslandPersonalization?.text('basic.girlName')||l10n("旅人"),'#f0d3b5','actor');return;}const c=this.ctx,p=this.player,hop=p.jump?Math.sin(p.jump/.64*Math.PI)*38:0,sit=this.sitting,bob=p.walk?Math.abs(Math.sin(p.walk))*2:0;
      c.save();c.fillStyle='#09182c80';c.beginPath();c.ellipse(p.x,p.y+2,17-hop*.08,7-hop*.03,0,0,Math.PI*2);c.fill();if(this.started){c.strokeStyle='#f6d8a58c';c.lineWidth=1;c.beginPath();c.ellipse(p.x,p.y+2,23,10,0,0,Math.PI*2);c.stroke();}
      const lantern={x:p.x+(p.face*24),y:p.y-20-hop};if(this.phase!=='day')this.glow(lantern.x,lantern.y,66,'#f1ca7c',.12);
      c.translate(Math.round(p.x),Math.round(p.y-hop-bob));c.scale(p.face*2.2,2.2);c.translate(-10,-26+(sit?6:0));
      // Original grid-authored 20 x 28 pixel character, with four animation poses.
      const r=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
      const leg=p.walk?Math.round(Math.sin(p.walk)*2):0;
      r(5,5,11,14,'#222336');r(4,7,2,11,'#28263b');r(15,7,2,11,'#28263b');
      if(!sit){r(6,21,4,4+leg,'#8a6572');r(12,21,4,4-leg,'#8a6572');r(5,25+leg,5,2,'#33314b');r(12,25-leg,5,2,'#33314b');}else{r(5,20,9,3,'#776478');r(13,20,6,2,'#38354c');}
      r(6,14,9,8,'#e2c6a1');r(7,14,7,3,'#f3ddba');r(5,20,11,2,'#cda280');r(9,16,2,5,'#c4a485');r(3,15,3,7,'#d7b28e');r(15,15,3,6,'#edd0a4');r(3,21,3,2,'#e7b9a5');r(16,20,2,2,'#e8b6a1');
      r(6,5,9,8,'#efc6ae');r(5,3,10,5,'#332b3b');r(4,5,3,4,'#332b3b');r(13,6,3,4,'#332b3b');r(6,2,7,2,'#473247');r(7,2,4,1,'#604454');r(5,8,2,5,'#3b2d3e');r(14,9,2,4,'#3b2d3e');
      if(p.back||this.looking){r(6,6,9,7,'#3b2d3e');r(7,12,7,2,'#574051');}else{r(8,9,1,2,'#3a3144');r(12,9,1,2,'#3a3144');r(7,11,2,1,'#d68e8e');r(12,11,2,1,'#d68e8e');r(10,12,1,1,'#bb827a');}
      r(5,5,3,2,'#edb3c3');r(4,5,1,1,'#efd4d4');r(18,18,1,3,'#aa8555');r(17,21,4,5,'#a67c43');r(18,22,2,3,'#ffe4a1');r(17,26,4,1,'#725b42');c.restore();
      if(!this.started||(!p.walk&&!this.paused))this.label(p.x,p.y-74-hop,l10n("你"),'#ead9ba','actor');
    }
    guide(t){if(this.companion==='none')return;const c=this.ctx,s=this.spirit;if(this.companion==='boy'&&window.IslandCharacter){IslandCharacter.draw(c,s,{time:t,phase:this.phase,variant:'boy',pose:this.activityPose(),shadow:this.activity?.id!=='swing',sitting:this.sitting,looking:this.looking,reducedMotion:this.state.settings.reducedMotion});if(!this.activity&&!this.capturing&&Math.floor(t/6)%4===0&&dist(s,this.player)<95)this.label(s.x,s.y-122,'♡','#ebbdc0','actor');return;}const y=s.y-27-Math.sin(t*2)*5;this.glow(s.x,y,35,'#abd4ed',.13);c.save();c.fillStyle='#07172733';c.beginPath();c.ellipse(s.x,s.y,12,5,0,0,Math.PI*2);c.fill();c.translate(Math.round(s.x),Math.round(y));c.scale(2,2);c.fillStyle='#7c9cc9';c.fillRect(-6,-6,12,11);c.fillRect(-8,-3,16,8);c.fillRect(-4,-9,8,3);c.fillStyle='#b9d7ed';c.fillRect(-5,-5,10,9);c.fillRect(-7,-2,14,5);c.fillRect(-3,-7,6,3);c.fillStyle='#e0edf0';c.fillRect(-3,-5,6,3);c.fillStyle='#374a72';c.fillRect(-3,-1,1,2);c.fillRect(2,-1,1,2);c.fillStyle='#dfb0cb';c.fillRect(-5,1,2,1);c.fillRect(4,1,2,1);c.fillStyle='#96b6db';c.fillRect(-5,5,3,3);c.fillRect(2,5,3,3);c.restore();
      if(!this.capturing&&(Math.floor(t/5)%3===0||this.sitting||this.looking)){const symbol=this.sitting?'♪':this.looking?'✦':dist(s,this.player)<90?'♡':'✧';this.label(s.x+16,y-33,symbol,'#d6c5e6','actor');}
    }
    label(x,y,text,color,kind='place'){if(this.capturing||(this.waypoints&&this.started&&kind==='place'))return;const c=this.ctx;c.save();c.font='13px "Microsoft YaHei",sans-serif';c.textAlign='center';c.textBaseline='middle';const w=c.measureText(text).width+18;c.fillStyle='#0b192ce8';c.fillRect(Math.round(x-w/2),Math.round(y-12),w,24);c.strokeStyle='#9fb3cc30';c.lineWidth=1;c.strokeRect(Math.round(x-w/2),Math.round(y-12),w,24);c.fillStyle=color;c.fillText(text,Math.round(x),Math.round(y));c.restore();}
    landmarkLabels(){for(const l of this.region.landmarks.filter(l=>l.type!=='portal'))if(dist(this.player,l)<105&&dist(this.player,l)>70)this.label(l.x,l.y-65,l.name,'#e1c99f');}
    snapshot(){return {player:{x:this.player.x,y:this.player.y,jump:this.player.jump,direction:this.player.direction,walk:this.player.walk},spirit:{x:this.spirit.x,y:this.spirit.y,direction:this.spirit.direction,walk:this.spirit.walk},companion:this.companion,activity:this.activity?{id:this.activity.id,time:this.activity.time,progress:this.activity.progress,charge:this.activity.charge||0,charging:!!this.activity.charging,busy:!!this.activity.busy,lastSkips:this.activity.lastSkips||0,power:this.activity.power||0}:null,performance:{cpuMs:this.profile.cpu,frames:this.profile.frames,dpr:this.dpr},visuals:{character:window.IslandCharacter?.rendering||"legacy",characterReady:window.IslandCharacter?.isReady?.()??true,sandcastleReady:window.IslandSandcastle?.loaded??false,scenery:this.scenery?.snapshot?.()||null,fireworks:this.fireworks?.snapshot?.()||null,waypoints:this.waypoints?.snapshot?.()||null},pathLength:this.path.length,paused:this.paused,ready:this.ready,phase:this.phase,camera:{...this.camera},nearby:this.nearestItem()?.id||null,walkable:this.nav.walkable(this.player.x,this.player.y),region:this.regionId,sprinting:this.sprinting,zoom:this.zoom};}
  }
  window.IslandWorld=IslandWorld;
  window.IslandNavigation={walkable,pathfind,landmarks,boundary,river,forRegion,regions:regionDefs};
})();
