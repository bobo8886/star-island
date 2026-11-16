/* Living scenery. Water is sampled once into small transparent textures; effects never
 * alter collision or read back the screen during play. Coordinates match the original art. */
(() => {
  'use strict';
  const TAU=Math.PI*2, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const polygon=points=>{const p=new Path2D();points.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));p.closePath();return p;};
  const AREAS={
    home:[
      [[637,239],[689,247],[693,291],[650,319],[611,331],[593,348],[625,364],[684,375],[714,396],[707,428],[633,435],[625,409],[641,398],[608,385],[574,367],[563,345],[579,322],[620,304],[641,294]],
      [[590,490],[654,491],[642,533],[612,552],[542,572],[486,593],[428,610],[419,643],[337,657],[345,617],[375,589],[421,567],[498,544],[568,520]],
      [[336,637],[415,645],[420,878],[393,896],[335,884],[326,853]],
      [[886,697],[944,669],[998,649],[1039,636],[1074,644],[1121,661],[1204,649],[1243,628],[1270,639],[1256,664],[1200,692],[1115,714],[1036,722],[1009,707],[957,728],[896,720]]
    ],
    forest:[[[425,427],[441,410],[479,399],[530,394],[570,401],[609,419],[609,441],[583,461],[537,475],[481,467],[448,456],[424,442]]],
    coast:[
      [[59,339],[107,345],[145,365],[196,383],[240,404],[265,427],[267,453],[237,478],[197,503],[188,529],[214,549],[212,579],[179,603],[126,594],[100,567],[64,554],[38,527],[13,513],[25,482],[44,456],[45,431],[34,408],[45,376]],
      [[307,719],[345,724],[399,704],[467,680],[523,681],[588,706],[649,729],[715,729],[776,713],[843,688],[907,666],[981,639],[1040,620],[1110,609],[1165,599],[1222,596],[1275,609],[1337,595],[1404,581],[1469,560],[1499,580],[1484,613],[1431,635],[1367,660],[1270,684],[1176,717],[1099,742],[1036,746],[957,772],[887,786],[818,792],[750,806],[676,804],[617,791],[554,783],[493,786],[427,775],[368,759],[319,744]]
    ]
  };
  const STREAM=[[665,291],[628,320],[593,344],[620,371],[679,391],[670,421]];
  const LOWER=[[622,502],[604,530],[558,552],[495,572],[426,598],[382,637]];
  const SHORE=[[329,737],[413,715],[476,698],[552,716],[638,748],[721,750],[803,722],[878,699],[955,670],[1037,641],[1111,633],[1186,618],[1258,629],[1334,614],[1413,597],[1476,585]];
  const CROWN_CLUSTERS=[{x:917,y:209,rx:99,ry:31},{x:820,y:269,rx:74,ry:36},{x:1031,y:280,rx:83,ry:38},{x:761,y:332,rx:34,ry:18},{x:1106,y:334,rx:35,ry:21},{x:934,y:321,rx:66,ry:23}];
  const CROWN_OUTLINE=[[706,337],[735,288],[782,234],[833,216],[845,177],[914,153],[988,166],[1070,191],[1104,236],[1096,271],[1142,291],[1163,337],[1137,365],[1060,378],[1026,403],[1007,452],[957,477],[908,462],[885,411],[838,377],[775,378],[732,363]];
  const LIGHTS={home:[[414,276,25],[800,385,26],[844,367,28],[883,397,25],[1018,401,26],[1068,391,24],[615,408,19],[1280,220,43]],forest:[[358,258,37],[465,191,26],[1218,171,26],[1351,173,26],[1301,301,24],[672,584,23],[863,583,23],[1312,413,23]],coast:[[297,96,72],[196,207,23],[371,230,21],[902,377,19]]};
  function seeded(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
  function linePoint(points,t){const span=(points.length-1)*clamp(t,0,.99999),i=Math.floor(span),f=span-i,a=points[i],b=points[i+1];return{x:a[0]+(b[0]-a[0])*f,y:a[1]+(b[1]-a[1])*f,dx:b[0]-a[0],dy:b[1]-a[1]};}
  const makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  class IslandScenery {
    constructor(world){
      this.world=world;this.waterCaches=new Map();this.events=[];this.clock=0;this.windUntil=0;this.drops=0;this.stepCount=0;
      this.petals=[];this.petalTime=0;this.petalInput=null;this.nextPetal=0;this.gustBirths=[];this.petalSerial=0;
      this.random=seeded(470921);this.leaves={};
      for(const region of ['home','forest','coast'])this.leaves[region]=Array.from({length:region==='home'?62:region==='forest'?43:21},(_,i)=>({phase:this.random(),x:this.random(),y:this.random(),speed:8+this.random()*7,size:4+this.random()*5,drift:18+this.random()*30,seed:this.random()*TAU,kind:i%4}));
      this.leafSprites={pink:this.makeLeaves(['#a84a70','#ef9cae','#ffd0cc','#f8b9b3']),green:this.makeLeaves(['#597845','#acbf66','#dbe89a','#c4d179']),white:this.makeLeaves(['#8ebfbd','#bde8dd','#ffffff','#daf5eb'])};
      this.petalSprites=this.makePetals();this.petalBackClip=new Path2D();this.petalBackClip.rect(0,0,1536,1024);this.petalBackClip.addPath(polygon(CROWN_OUTLINE));
      this.light=makeCanvas(96,96);const g=this.light.getContext('2d'),glow=g.createRadialGradient(48,48,0,48,48,48);glow.addColorStop(0,'#ffe4a177');glow.addColorStop(.2,'#ffd77b35');glow.addColorStop(1,'#ffd77b00');g.fillStyle=glow;g.fillRect(0,0,96,96);
      this.beam=makeCanvas(192,80);const beam=this.beam.getContext('2d'),fade=beam.createLinearGradient(0,0,190,0);fade.addColorStop(0,'#ffe5a94d');fade.addColorStop(.35,'#ffe5a921');fade.addColorStop(1,'#ffe5a900');beam.fillStyle=fade;beam.beginPath();beam.moveTo(0,36);beam.lineTo(190,8);beam.lineTo(190,70);beam.lineTo(0,44);beam.closePath();beam.fill();
      this.stats={cachedRegions:0,readbacks:0,leaves:0,events:0};
    }
    makePetals(){
      // Small asymmetric cherry petals: indented crown, rounded shoulders and a tapered tip.
      const shapes=[[[11,5],[8,3],[5,4],[3,8],[4,13],[8,18],[12,22],[16,17],[20,11],[20,6],[17,3],[14,3],[12,6]],[[8,3],[13,3],[17,6],[18,10],[15,15],[10,21],[7,18],[4,13],[3,9],[5,5]],[[7,4],[12,3],[17,6],[20,10],[16,13],[12,16],[9,21],[6,17],[4,11],[4,7]],[[9,3],[14,5],[17,9],[16,13],[13,18],[9,21],[7,16],[6,11],[6,6]]];
      const inside=(x,y,points)=>{let yes=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
      return shapes.map((points,kind)=>{const source=makeCanvas(24,26),g=source.getContext('2d');for(let y=1;y<25;y++)for(let x=1;x<23;x++){if(!inside(x+.5,y+.5,points))continue;const edge=!inside(x-1+.5,y+.5,points)||!inside(x+1+.5,y+.5,points)||!inside(x+.5,y+1+.5,points);g.fillStyle=edge?'#c9708c':x<11&&y<13?'#f6bdc4':y>15?'#df8ca4':'#eba0b4';g.fillRect(x,y,1,1);}g.fillStyle='#f8cdd0';g.fillRect(7+kind%2,7,2,3);g.fillStyle='#d4809c';g.fillRect(11,12,1,5);return source;});
    }
    emitPetal(born,gust=false){
      const cluster=CROWN_CLUSTERS[Math.floor(this.random()*CROWN_CLUSTERS.length)],angle=this.random()*TAU,radius=Math.sqrt(this.random())*.85;
      const originX=cluster.x+Math.cos(angle)*cluster.rx*radius,originY=cluster.y+Math.sin(angle)*cluster.ry*radius,drift=12+this.random()*35+(gust?15:0);
      const groundY=474+Math.pow((originX-935)/240,2)*17+this.random()*28;
      const petal={id:++this.petalSerial,born,originX,originY,groundY,drift,flight:8+this.random()*5,hold:2+this.random()*2,fade:2.4+this.random()*1.8,size:14+this.random()*7,phase:this.random()*TAU,spin:(this.random()-.5)*1.8,flutter:7+this.random()*11,layer:this.random()<.32?'back':'front',kind:Math.floor(this.random()*4),gust};
      this.petals.push(petal);return petal;
    }
    samplePetal(p,t){
      const age=t-p.born;if(age<0)return{phase:'unborn',x:p.originX,y:p.originY,alpha:0};const u=clamp(age/p.flight,0,1),falling=age<p.flight;
      const x=p.originX+p.drift*u+Math.sin(age*1.4+p.phase)*Math.sin(Math.PI*u)*p.flutter,y=p.originY+(p.groundY-p.originY)*Math.pow(u,1.08);
      const landedAge=Math.max(0,age-p.flight),opacity=falling?Math.min(1,age/.65)*(p.layer==='back'?.63:.88):.76*clamp(1-Math.max(0,landedAge-p.hold)/p.fade,0,1);
      return{phase:falling?'fall':landedAge<p.hold?'hold':landedAge<p.hold+p.fade?'fade':'dead',x,y,alpha:opacity,angle:p.phase+p.spin*Math.min(age,p.flight)+Math.sin(Math.min(age,p.flight)*1.3)*.22,flip:falling?.38+Math.abs(Math.sin(age*1.05+p.phase))*.62:1,groundScale:falling?1:.38};
    }
    advancePetals(input,reduced){
      if(reduced){this.petalInput=null;return;}
      if(this.petalInput!==null)this.petalTime+=Math.max(0,input-this.petalInput);this.petalInput=input;
      if(this.world.regionId!=='home')return;
      while(this.nextPetal<=this.petalTime){this.emitPetal(this.nextPetal);this.nextPetal+=.37+this.random()*.46;}
      for(let i=this.gustBirths.length-1;i>=0;i--)if(this.gustBirths[i]<=this.petalTime){this.emitPetal(this.gustBirths[i],true);this.gustBirths.splice(i,1);}
      for(let i=this.petals.length-1;i>=0;i--)if(this.samplePetal(this.petals[i],this.petalTime).phase==='dead')this.petals.splice(i,1);
      if(this.petals.length>96)this.petals.splice(0,this.petals.length-96);
    }
    drawPetals(c,layer){
      if(this.world.regionId!=='home')return;const time=this.petalTime;
      for(const p of this.petals){const s=this.samplePetal(p,time);if(s.alpha<=0)continue;const falling=s.phase==='fall';if(layer==='ground'&&falling&&p.layer!=='back'||layer==='air'&&(!falling||p.layer!=='front'))continue;
        c.save();if(falling&&p.layer==='back')c.clip(this.petalBackClip,'evenodd');c.globalAlpha=s.alpha;c.translate(Math.round(s.x),Math.round(s.y));c.rotate(s.angle);c.scale(s.flip,s.groundScale);const size=p.size*(p.layer==='back'&&falling?.82:1);c.drawImage(this.petalSprites[p.kind],-size*.5,-size*.5,size,size*26/24);c.restore();
      }
      let airborne=0;for(const p of this.petals)if(this.samplePetal(p,time).phase==='fall')airborne++;this.stats.leaves=airborne;
    }
    makeLeaves(colors){return [0,1,2,3].map(kind=>{const c=makeCanvas(16,16),g=c.getContext('2d');const r=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};if(kind===0){r(6,3,4,2,colors[0]);r(4,5,7,6,colors[1]);r(6,10,4,3,colors[1]);r(5,5,3,2,colors[2]);r(8,7,3,3,colors[3]);}else if(kind===1){r(3,6,8,3,colors[0]);r(5,4,6,6,colors[1]);r(9,3,3,4,colors[1]);r(5,5,5,2,colors[2]);r(8,8,3,2,colors[3]);}else if(kind===2){r(4,4,6,2,colors[0]);r(3,6,9,4,colors[1]);r(6,9,4,3,colors[1]);r(4,6,4,2,colors[2]);r(9,6,2,2,colors[3]);}else{r(7,2,2,10,colors[0]);r(4,4,7,6,colors[1]);r(6,3,4,9,colors[1]);r(5,4,3,4,colors[2]);r(8,8,2,3,colors[3]);}return c;});}
    get water(){return this.waterCaches.get(this.world.regionId);}
    ensureWater(){const w=this.world,id=w.regionId,image=w.image;if(this.waterCaches.has(id)||!image?.complete||!image.naturalWidth)return;const polygons=AREAS[id]||w.region?.sceneryWater||[];if(!polygons.length)return;
      const points=polygons.flat(),x=Math.floor(Math.min(...points.map(p=>p[0]))),y=Math.floor(Math.min(...points.map(p=>p[1]))),right=Math.ceil(Math.max(...points.map(p=>p[0]))),bottom=Math.ceil(Math.max(...points.map(p=>p[1])));const width=right-x,height=bottom-y;
      const texture=makeCanvas(width,height),g=texture.getContext('2d',{willReadFrequently:true});g.imageSmoothingEnabled=false;g.drawImage(image,x,y,width,height,0,0,width,height);const path=new Path2D();polygons.forEach(poly=>path.addPath(polygon(poly)));
      const localPath=new Path2D();localPath.addPath(path,new DOMMatrix().translate(-x,-y));g.globalCompositeOperation='destination-in';g.fillStyle='#fff';g.fill(localPath);g.globalCompositeOperation='source-over';
      let accurate=true;try{const pixels=g.getImageData(0,0,width,height),d=pixels.data;this.stats.readbacks++;for(let i=0;i<d.length;i+=4){const r=d[i],green=d[i+1],b=d[i+2];const cyan=green>r*1.12&&b>r*1.12&&green>72&&b>70;const foam=r>176&&green>210&&b>205&&green>=r;d[i+3]=(cyan||foam)?d[i+3]:0;}g.putImageData(pixels,0,0);}catch{accurate=false;g.clearRect(0,0,width,height);}
      const surface=makeCanvas(width,height);this.waterCaches.set(id,{texture,surface,path,x,y,width,height,accurate,polygons});this.stats.cachedRegions=this.waterCaches.size;
    }
    draw(ctx,time,layer='ground'){
      const reduced=!!this.world.state.settings.reducedMotion;this.clock=reduced?0:time;this.stats.leaves=0;this.stats.events=this.events.length;
      if(this.lastRegion!==this.world.regionId){this.lastRegion=this.world.regionId;this.events.length=0;this.windUntil=0;this.petals.length=0;this.gustBirths.length=0;this.petalTime=0;this.petalInput=time;this.nextPetal=0;}
      this.advancePetals(time,reduced);
      if(!this.world.ready)return;ctx.save();ctx.imageSmoothingEnabled=false;
      if(layer==='ground'){this.ensureWater();if(!reduced)this.drawWater(ctx,time);this.drawLights(ctx,reduced?0:time);if(!reduced){this.drawProps(ctx,time);this.drawPetals(ctx,'ground');}}
      else if(!reduced){if(this.world.regionId==='home')this.drawPetals(ctx,'air');else this.drawLeaves(ctx,time);this.drawReactions(ctx,time);if(this.world.regionId==='home')this.drawWaterfallMist(ctx,time);if(this.world.regionId==='coast')this.drawSeaSpray(ctx,time);if(this.world.regionId==='lake')this.drawLakeFireflies(ctx,time);}
      ctx.restore();
    }
    drawWater(c,t){const water=this.water;if(!water)return;const layer=water.surface.getContext('2d');layer.setTransform(1,0,0,1,0,0);layer.clearRect(0,0,water.width,water.height);layer.save();layer.translate(-water.x,-water.y);this.renderWater(layer,t);layer.restore();if(water.accurate){layer.globalCompositeOperation='destination-in';layer.drawImage(water.texture,0,0);layer.globalCompositeOperation='source-over';}c.drawImage(water.surface,water.x,water.y);}
    renderWater(c,t){const water=this.water;if(!water)return;const id=this.world.regionId;c.save();c.clip(water.path);c.globalAlpha=id==='forest'?.5:.56;
      // Small independently moving strips produce refraction while retaining the painted detail.
      if(water.accurate){const step=id==='forest'?7:12;for(let row=0;row<water.height;row+=step){const height=Math.min(step,water.height-row),offset=Math.round(Math.sin(row*.047+t*(id==='coast'?1.5:2.1))*2.5);c.drawImage(water.texture,0,row,water.width,height,water.x+offset,water.y+row,water.width,height);}}
      c.globalAlpha=1;
      if(id==='home'){
        this.stream(c,STREAM,t,24);this.stream(c,LOWER,t,31);
        for(const fall of [{x:646,y:253,w:38,h:52},{x:337,y:657,w:75,h:220}]){c.save();c.beginPath();c.rect(fall.x,fall.y,fall.w,fall.h);c.clip();for(let i=0;i<19;i++){const x=fall.x+3+(i*19)%fall.w,y=fall.y+((i*29+t*(134+i%4*19))%fall.h);c.fillStyle=i%3===0?'#edffffb0':'#8deee78a';c.fillRect(Math.round(x+Math.sin(t*2+i)),Math.round(y),i%3===0?2:1,10+i%4*5);}c.restore();}
        this.waves(c,[[894,709],[952,687],[1009,671],[1086,687],[1166,685],[1248,653]],t,3,15);
      }else if(id==='forest'){
        for(let i=0;i<6;i++){const phase=(t*.21+i*.163)%1,x=451+i*26,y=425+(i%2)*17;c.strokeStyle=`rgba(210,255,238,${Math.sin(phase*Math.PI)*.44})`;c.lineWidth=1.5;c.beginPath();c.ellipse(x,y,8+phase*24,3+phase*7,0,.15,5.3);c.stroke();}
        for(let i=0;i<18;i++){const x=434+(i*31)%163,y=411+(i*17)%47;const a=Math.max(0,Math.sin(t*1.6+i)*.65);c.fillStyle=`rgba(240,255,226,${a})`;c.fillRect(x+Math.round(Math.sin(t+i)*3),y,3+i%3,1);}
      }else if(id==='coast'){
        this.waves(c,SHORE,t,5,24);this.waves(c,[[83,391],[172,413],[228,444],[165,476],[82,502],[129,554]],t+.8,4,17);
        for(let i=0;i<36;i++){const p=linePoint(SHORE,(i/36+t*.008)%1);c.fillStyle=`rgba(212,255,246,${.18+Math.max(0,Math.sin(t*1.9+i))*.39})`;c.fillRect(Math.round(p.x+Math.sin(i*3)*13),Math.round(p.y+8+(i%3)*9),4+i%5*2,1);}
      }else if(id==='lake'){
        const ripples=this.world.region?.sceneryRipples||[];
        for(let i=0;i<ripples.length;i++){const [x,y,rx,ry]=ripples[i];for(let ring=0;ring<2;ring++){const phase=(t*.13+i*.29+ring*.5)%1;c.strokeStyle=`rgba(202,251,234,${Math.sin(phase*Math.PI)*.34})`;c.lineWidth=1;c.beginPath();c.ellipse(x,y,rx*(.45+phase),ry*(.45+phase),0,.3,5.7);c.stroke();}}
        for(let i=0;i<19;i++){const x=592+(i*41)%350,y=378+(i*29)%140,a=Math.max(0,Math.sin(t*1.3+i*2.1))*.38;c.fillStyle=`rgba(223,255,235,${a})`;c.fillRect(Math.round(x+Math.sin(t*.7+i)*3),y,4+i%4,1);}
      }
      c.restore();
    }
    stream(c,points,t,count){for(let i=0;i<count;i++){const phase=(i/count+t*.13)%1,p=linePoint(points,phase),normalX=-p.dy,normalY=p.dx,len=Math.hypot(normalX,normalY),offset=Math.sin(i*7.3)*12,x=p.x+normalX/len*offset,y=p.y+normalY/len*offset;const a=Math.sin(phase*Math.PI)*.72;c.strokeStyle=`rgba(218,255,248,${a})`;c.lineWidth=i%3===0?2:1;c.beginPath();c.moveTo(Math.round(x),Math.round(y));c.lineTo(Math.round(x+p.dx/len*(5+i%4)),Math.round(y+p.dy/len*(5+i%4)));c.stroke();}}
    waves(c,points,t,count,depth){for(let i=0;i<count;i++){const phase=(t*.23+i/count)%1,offset=(1-phase)*depth,alpha=Math.sin(phase*Math.PI)*.55;c.strokeStyle=`rgba(218,255,245,${alpha})`;c.lineWidth=i%2?1.3:2;c.beginPath();for(let j=0;j<=70;j++){const p=linePoint(points,j/70),x=p.x+Math.sin(j*.7+t*.9+i)*2,y=p.y+offset+Math.sin(j*.55+t+i)*2;j?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y));}c.stroke();}}
    drawLights(c,t){const night=this.world.phase==='day'?.38:1;for(const [x,y,r] of LIGHTS[this.world.regionId]||this.world.region?.sceneryLights||[]){c.globalAlpha=(.45+Math.sin(t*2.2+x)*.13)*night;c.drawImage(this.light,x-r,y-r,r*2,r*2);}c.globalAlpha=1;}
    drawProps(c,t){const id=this.world.regionId;
      if(id==='home'){
        // Canvas tent pennant, window glints and the wishing tree's small suspended lights.
        c.fillStyle='#f3ca8d';for(let i=0;i<8;i++){const x=293+i*10,y=256+Math.round(Math.sin(t*2.2+i*.5)*2);c.fillRect(x,y,8,2);}
        for(const [x,y] of [[800,386],[845,370],[884,399],[1018,405],[1069,394]]){const sway=Math.sin(t*1.3+x)*1.5;c.fillStyle='#ffe9aeaa';c.fillRect(Math.round(x+sway),y-7,2,6);}
      }else if(id==='forest'){
        // Wind-chime rods swing around their original canopy anchor.
        for(let i=0;i<4;i++){const x=1280+i*6,dx=Math.round(Math.sin(t*2+i*.5)*2);c.fillStyle='#d5d9b4';c.fillRect(x+dx,170,2,19+(i%3)*6);c.fillStyle='#fff5c5';c.fillRect(x+dx,174,1,12);}
        for(let i=0;i<12;i++){const x=620+(i*83)%650,y=337+(i*47)%230,phase=t*6+i*2;this.butterfly(c,x+Math.sin(t*.5+i)*27,y+Math.cos(t*.7+i)*12,phase,i%3);}
      }else if(id==='coast'){
        // Lighthouse beam is a quiet rotating reflection, not a full-screen strobe.
        c.save();c.translate(295,104);c.rotate(Math.sin(t*.25)*.42-.1);c.globalAlpha=this.world.phase==='day'?.32:.7;c.drawImage(this.beam,0,-40);c.restore();
        c.save();c.translate(902,378);c.rotate(Math.sin(t*1.8)*.025);c.strokeStyle='#f6d38a';c.lineWidth=2;c.beginPath();c.arc(0,0,15,.2,2.7);c.stroke();c.restore();
      }
    }
    butterfly(c,x,y,t,kind){const palette=['#f3c9df','#f8e6ad','#b6dfea'],wing=Math.abs(Math.sin(t))>.45?5:2;c.fillStyle=palette[kind];c.fillRect(Math.round(x)-wing-1,Math.round(y)-2,wing,3);c.fillRect(Math.round(x)+1,Math.round(y)-2,wing,3);c.fillStyle='#786572';c.fillRect(Math.round(x),Math.round(y)-2,1,4);}
    drawLeaves(c,t){const region=this.world.regionId,leaves=this.leaves[region]||[],sprites=this.leafSprites[region==='home'?'pink':region==='forest'?'green':'white'];for(let i=0;i<leaves.length;i++){const p=leaves[i],phase=(p.phase+t/p.speed*.17)%1;let x,y,size=p.size,opacity;
        if(region==='home'){const startY=190+p.y*130;x=738+p.x*365+Math.sin(t*.7+p.seed)*p.drift+phase*38;y=startY+phase*(500-startY);opacity=Math.min(1,phase*6)*Math.min(1,(1-phase)*5)*.94;}
        else if(region==='forest'){x=565+p.x*620+Math.sin(t*.5+p.seed)*p.drift;y=80+p.y*100+phase*270;opacity=Math.min(1,phase*5)*Math.min(1,(1-phase)*6)*.78;}
        else{const point=linePoint(SHORE,p.x);x=point.x+Math.sin(t*.6+p.seed)*20;y=point.y+18-Math.sin(phase*Math.PI)*28;size*=.5;opacity=Math.sin(phase*Math.PI)*.55;}
        const gust=this.windUntil>t?(this.windUntil-t)*4:0;x+=gust*Math.sin(p.seed);const flip=.35+Math.abs(Math.sin(t*1.1+p.seed))*.65;
        c.globalAlpha=opacity;c.drawImage(sprites[p.kind],Math.round(x-size*flip),Math.round(y-size),Math.round(size*2*flip),Math.round(size*2));this.stats.leaves++;
      }c.globalAlpha=1;
    }
    drawLakeFireflies(c,t){const points=this.world.region?.fireflyPoints||[];for(let i=0;i<points.length;i++){const [px,py]=points[i],x=px+Math.sin(t*.7+i*2.3)*13,y=py+Math.cos(t*.55+i)*8,alpha=(.25+.5*(Math.sin(t*1.2+i)*.5+.5))*(this.world.phase==='day'?.3:1);c.globalAlpha=alpha*.45;c.drawImage(this.light,x-9,y-9,18,18);c.globalAlpha=alpha;c.fillStyle='#e2edb6';c.fillRect(Math.round(x),Math.round(y),2,2);}c.globalAlpha=1;
    }
    drawWaterfallMist(c,t){for(const fall of [{x:660,y:304,w:34,count:9},{x:374,y:883,w:70,count:24}])for(let i=0;i<fall.count;i++){const phase=(t*.7+i/fall.count)%1,x=fall.x+Math.sin(i*13)*fall.w*.58+Math.cos(t+i)*4,y=fall.y-phase*13;c.fillStyle=`rgba(218,255,248,${Math.sin(phase*Math.PI)*.65})`;const size=i%4===0?3:2;c.fillRect(Math.round(x),Math.round(y),size,size);}}
    drawSeaSpray(c,t){for(let i=0;i<16;i++){const p=linePoint(SHORE,(i*.113)%1),phase=(t*.4+i*.21)%1,x=p.x+Math.sin(i*5)*14,y=p.y+11-Math.sin(phase*Math.PI)*12;c.globalAlpha=Math.sin(phase*Math.PI)*.65;c.fillStyle='#dcfff7';c.fillRect(Math.round(x),Math.round(y),2,2);}c.globalAlpha=1;}
    react(item){if(this.world.state.settings.reducedMotion||!item)return;const now=this.world.elapsed||this.clock;if(item.id==='tree'){this.windUntil=this.petalTime+3;for(let i=0;i<18&&this.gustBirths.length<36;i++)this.gustBirths.push(this.petalTime+.12+i*.11+this.random()*.12);return;}
      const count=item.type==='portal'?16:12,color=this.world.regionId==='forest'?'green':'white';for(let i=0;i<count&&this.events.length<128;i++){const a=this.random()*TAU;this.events.push({x:item.x+(this.random()-.5)*20,y:item.y-25,vx:Math.cos(a)*(14+this.random()*34),vy:-18-this.random()*30,born:now,life:1.1+this.random()*1.1,size:4,kind:i%4,color});}}
    step(player){if(this.world.state.settings.reducedMotion||!player||++this.stepCount%2)return;const now=this.world.elapsed||this.clock,region=this.world.regionId;if(region==='home')return;for(let i=0;i<3&&this.events.length<128;i++)this.events.push({x:player.x+(this.random()-.5)*16,y:player.y+2,vx:(this.random()-.5)*24,vy:-12-this.random()*15,born:now,life:.4+this.random()*.2,size:region==='coast'?3:4,kind:i%4,color:region==='forest'?'green':'white'});}
    drawReactions(c,t){for(let i=this.events.length-1;i>=0;i--){const p=this.events[i],age=t-p.born;if(age>p.life||age<0){this.events[i]=this.events[this.events.length-1];this.events.pop();continue;}const x=p.x+p.vx*age,y=p.y+p.vy*age+age*age*19;c.globalAlpha=Math.min(1,(p.life-age)*2);c.drawImage(this.leafSprites[p.color][p.kind],Math.round(x),Math.round(y),p.size*2,p.size*2);}c.globalAlpha=1;}
    snapshot(){let airborne=0,grounded=0;for(const p of this.petals){const s=this.samplePetal(p,this.petalTime);if(s.phase==='fall')airborne++;else if(s.phase==='hold'||s.phase==='fade')grounded++;}return{...this.stats,readbacks:this.stats.readbacks,waterReady:!!this.water,waterAccurate:!!this.water?.accurate,reducedMotion:!!this.world.state.settings.reducedMotion,petals:{airborne,grounded,queued:this.gustBirths.length,time:this.petalTime}};}
  }
  window.IslandScenery=IslandScenery;
})();
