/* Replayable little rituals: persistent results, transient water/air effects. */
(() => {
  'use strict';
  const IDS=new Set(['flower_garden','paper_boat','stone_skip','windmill']);
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const mix=(a,b,t)=>a+(b-a)*t;
  const artParts=[],artPath='assets/lake-props.png';let artLoaded=false;
  const artBase=document.currentScript?.src?new URL('../',document.currentScript.src):new URL('./',location.href);
  const artReady=new Promise(resolve=>{
    const image=new Image();image.onerror=()=>resolve(false);image.onload=()=>{
      for(const [x,y,width,height] of [[60,190,510,290],[687,190,510,290],[150,642,325,579],[690,675,500,510]]){
        const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const g=canvas.getContext('2d',{willReadFrequently:true});g.imageSmoothingEnabled=false;g.drawImage(image,x,y,width,height,0,0,width,height);
        try{const data=g.getImageData(0,0,width,height),p=data.data;for(let i=0;i<p.length;i+=4)p[i+3]=p[i+3]>=180&&!(p[i]>180&&p[i+1]<55&&p[i+2]<55)?255:0;g.putImageData(data,0,0);}catch{}
        artParts.push(canvas);
      }
      artLoaded=true;resolve(true);
    };image.src=window.ISLAND_ASSETS?.[artPath]||new URL(artPath,artBase).href;
  });
  class IslandPastimes {
    constructor(world){this.world=world;this.events=[];this.rotor=0;this.rotorSpeed=.13;}
    handles(id){return IDS.has(id);}
    action(a,action){
      if(!this.handles(a.id))return null;
      const w=this.world,s=w.state.activities,now=w.elapsed;
      if(a.busy)return {accepted:false,busy:true};
      const add=(kind,duration,extra={})=>this.events.push({kind,region:w.regionId,start:now,duration,item:{...a.item},...extra});
      if(a.id==='flower_garden'&&['plant','water','reset'].includes(action)){
        a.workUntil=a.time+(action==='water'?1.8:1.1);a.busyUntil=a.workUntil;a.progress=(s.gardenStage||0)/2;
        if(action!=='reset')add(action,action==='water'?2.2:1.2);
        if(action==='water')add('bloom',3.5);
        IslandAudio?.activity(action==='water'?'water':'plant');
      }else if(a.id==='paper_boat'&&action==='launch'){
        add('boat',10,{wish:s.lastBoatWish||'peace'});a.busyUntil=a.time+1.3;a.workUntil=a.time+.75;a.progress=1;
        IslandAudio?.activity('paper_boat');
      }else if(a.id==='stone_skip'&&action==='charge'){
        a.charging=true;a.chargeStart=a.time;a.charge=0;a.progress=0;
      }else if(a.id==='stone_skip'&&action==='throw'){
        if(!a.charging)return {accepted:false};
        a.charging=false;const precision=clamp(1-Math.abs((a.charge||0)-.8)/.8,0,1);
        a.lastSkips=2+Math.round(precision*3);a.busyUntil=a.time+.65+a.lastSkips*.42;a.progress=1;
        add('skip',.65+a.lastSkips*.42,{skips:a.lastSkips,from:{x:w.player.x+20,y:w.player.y-35}});
        a.workUntil=a.time+.65;IslandAudio?.activity('skip');
      }else if(a.id==='windmill'&&action==='turn'){
        a.power=clamp((a.power||0)+.28,0,1);a.progress=a.power;a.busyUntil=a.time+.22;this.rotorSpeed=Math.min(6,this.rotorSpeed+1.25);
        a.workUntil=a.time+.4;IslandAudio?.activity('windmill');
        if(a.power>=1&&!a.rewarded){a.rewarded=true;add('ribbons',4);}
      }else return {accepted:false};
      a.busy=(a.busyUntil||0)>a.time;
      return {accepted:true,busy:a.busy,progress:a.progress,power:a.power||0,skips:a.lastSkips||0};
    }
    update(dt){
      const w=this.world,a=w.activity;
      this.rotorSpeed+=(.13-this.rotorSpeed)*(1-Math.exp(-dt*.28));
      if(!w.state.settings.reducedMotion)this.rotor=(this.rotor+dt*this.rotorSpeed)%(Math.PI*2);
      if(a&&this.handles(a.id)){
        a.busy=(a.busyUntil||0)>a.time;
        if(a.charging)a.charge=(1-Math.cos((a.time-a.chargeStart)*Math.PI/1.1))/2;
      }
      this.events=this.events.filter(e=>w.elapsed-e.start<e.duration&&e.region===w.regionId);
    }
    drawProp(c,item,t){
      if(!this.handles(item.id))return false;
      const w=this.world,active=w.activity?.id===item.id,near=Math.hypot(w.player.x-item.x,w.player.y-item.y)<110;
      c.save();c.translate(Math.round(item.x),Math.round(item.y));c.imageSmoothingEnabled=false;
      c.fillStyle='#182b2c25';c.beginPath();c.ellipse(0,7,item.id==='flower_garden'?80:38,11,0,0,Math.PI*2);c.fill();
      if(item.id==='flower_garden')this.garden(c,w.state.activities.gardenStage||0,t);
      else if(item.id==='windmill')this.mill(c);
      else if(item.id==='paper_boat')this.boatDesk(c);
      else this.stones(c);
      c.restore();
      if(near&&!active&&!w.capturing&&Math.hypot(w.player.x-item.x,w.player.y-item.y)>70)w.label(item.x,item.y-(item.id==='windmill'?135:75),item.name+' · F',item.color);
      return true;
    }
    garden(c,stage,t){
      const bloom=this.events.findLast(e=>e.kind==='bloom'&&e.region===this.world.regionId),growth=bloom&&!this.world.state.settings.reducedMotion?clamp((this.world.elapsed-bloom.start)/1.8,0,1):1;
      if(artLoaded){
        c.drawImage(artParts[0],-95,-93,190,108);
        if(stage===1){for(let i=0;i<7;i++){const x=-57+i*16,y=-32+(i%2)*10;c.fillStyle='#679951';c.fillRect(x,y-6,2,7);c.fillStyle='#b7d982';c.fillRect(x-3,y-6,4,3);c.fillRect(x+1,y-8,4,3);}}
        if(stage===2){c.save();c.globalAlpha=growth;c.drawImage(artParts[1],-95,-93,190,108);c.restore();}
        return;
      }
      const r=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
      r(-75,-35,150,50,'#634b47');r(-72,-34,144,42,'#a17b5e');r(-70,-31,140,32,'#72564a');
      r(-75,4,150,8,'#c9a27c');r(-72,12,144,5,'#80624f');r(-75,-36,150,4,'#e3c095');
      for(let row=0;row<3;row++)for(let j=0;j<8;j++){
        const x=-60+j*17+(row%2?3:0),y=-24+row*12;
        r(x-3,y+2,8,2,'#543f3d');r(x,y,4,2,'#ae805a');
        if(stage){const h=stage===2?Math.round(5+(9+(j*7+row*3)%13)*growth):5;r(x,y-h,2,h,'#5c8d58');r(x-4,y-6,5,3,'#86ad68');r(x+2,y-10,5,3,'#b0cb7d');
          if(stage===2&&growth>.5){const sway=this.world.state.settings.reducedMotion?0:Math.round(Math.sin(t*1.7+j+row)*1.2),palette=['#e9a6ba','#d0c1ee','#f3d187'],color=palette[(j+row)%3],px=x+sway,py=y-h;
            r(px-5,py-4,11,5,'#866c7a');r(px-4,py-6,9,8,color);r(px-6,py-3,13,4,color);r(px-2,py-5,4,2,'#fff0d1');r(px-1,py-2,3,3,'#e8bc68');}
        }
      }
      // A real watering can, seed packet and a little wood label remain beside the bed.
      r(80,-10,20,20,'#6d9397');r(82,-8,15,16,'#a0c3b5');r(96,-5,14,4,'#769c9d');r(105,-9,6,6,'#c5ded0');
      c.strokeStyle='#496e7a';c.lineWidth=3;c.strokeRect(76,-15,12,14);r(80,-10,20,3,'#d2e5ca');
      r(-92,-17,12,15,'#e1ba8c');r(-90,-15,8,2,'#f7deb0');r(-88,-10,4,5,'#88ab71');
      r(-58,-50,3,16,'#89664d');r(-67,-57,22,11,'#e6c89a');r(-62,-53,12,2,'#a0805d');
    }
    mill(c){
      if(artLoaded){
        const scale=.23;c.drawImage(artParts[2],-164*scale,8-573*scale,325*scale,579*scale);
        c.save();c.translate(0,8+(256-573)*scale);c.rotate(this.rotor);c.drawImage(artParts[3],-250*scale,-250*scale,500*scale,510*scale);c.restore();return;
      }
      const r=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
      r(-22,-14,44,21,'#79665b');r(-18,-74,36,65,'#bda384');r(-15,-70,28,56,'#e4cfaa');r(-15,-70,5,56,'#f4e2bc');
      for(let j=0;j<6;j++){r(-14,-65+j*8,27,1,'#b49c83');r(j%2?-3:5,-64+j*8,1,7,'#b49c83');}
      r(-8,-30,16,20,'#715d53');r(-5,-28,10,17,'#9a8063');r(1,-22,2,2,'#edcf84');
      c.fillStyle='#695868';c.beginPath();c.moveTo(-26,-74);c.lineTo(0,-103);c.lineTo(26,-74);c.closePath();c.fill();
      c.fillStyle='#9b8191';c.beginPath();c.moveTo(-21,-77);c.lineTo(0,-98);c.lineTo(19,-77);c.closePath();c.fill();
      c.save();c.translate(0,-76);c.rotate(this.rotor);
      for(let i=0;i<4;i++){c.rotate(Math.PI/2);r(-2,-49,4,49,'#745b4e');r(2,-47,13,32,'#a98a6b');r(3,-46,10,29,'#f2dcb1');for(let j=0;j<5;j++)r(3,-43+j*6,10,1,'#c4a47e');r(7,-47,1,32,'#c4a47e');}
      c.restore();r(-5,-81,10,10,'#755841');r(-3,-79,6,6,'#f1cc7b');
      r(26,-15,17,3,'#90745a');r(40,-19,4,12,'#cdaa79');r(25,-18,4,11,'#6f5e50');
      r(-30,7,60,3,'#d1be9b');
    }
    boat(c,x=0,y=0,scale=1,wish='peace'){
      c.save();c.translate(x,y);c.scale(scale,scale);c.lineWidth=1.5;
      c.fillStyle='#d6bf97';c.beginPath();c.moveTo(-20,-1);c.lineTo(20,-1);c.lineTo(12,10);c.lineTo(-11,10);c.closePath();c.fill();
      c.fillStyle='#fff1d2';c.beginPath();c.moveTo(-21,-2);c.lineTo(1,-17);c.lineTo(19,-2);c.lineTo(10,6);c.lineTo(-11,6);c.closePath();c.fill();
      c.strokeStyle='#ba9f7b';c.beginPath();c.moveTo(-20,-2);c.lineTo(0,1);c.lineTo(1,-16);c.moveTo(0,1);c.lineTo(18,-2);c.stroke();
      c.fillStyle=wish==='courage'?'#e6af78':wish==='together'?'#dda1b9':'#9dbacb';c.fillRect(-3,-1,7,3);c.restore();
    }
    boatDesk(c){
      c.fillStyle='#826352';c.fillRect(-28,-15,56,8);c.fillStyle='#c7a279';c.fillRect(-28,-17,56,5);c.fillStyle='#655549';c.fillRect(-23,-7,4,16);c.fillRect(19,-7,4,16);
      c.fillStyle='#e4d7b7';c.fillRect(8,-23,15,5);c.fillStyle='#fff1d2';c.fillRect(10,-25,12,3);this.boat(c,-11,-22,.65);
    }
    stones(c){
      c.strokeStyle='#aa8368';c.lineWidth=3;c.beginPath();c.ellipse(0,-2,25,11,0,0,Math.PI*2);c.stroke();
      for(let i=0;i<9;i++){const x=-17+(i%4)*12,y=-5+Math.floor(i/4)*5;c.fillStyle=['#819eaa','#bdd0cd','#9caeab'][i%3];c.beginPath();c.ellipse(x,y,8,4,-.2,0,Math.PI*2);c.fill();c.fillStyle='#e5e6cf';c.fillRect(x-3,y-2,4,1);}
      c.fillStyle='#a78b66';c.fillRect(31,-28,3,33);c.fillStyle='#e8cf9e';c.fillRect(22,-34,24,13);c.fillStyle='#779b9b';c.fillRect(27,-29,14,2);
    }
    ring(c,x,y,r,alpha){c.strokeStyle=`rgba(217,255,244,${clamp(alpha,0,1)})`;c.lineWidth=1.5;c.beginPath();c.ellipse(x,y,r,r*.33,0,0,Math.PI*2);c.stroke();}
    drawEffects(c){
      const w=this.world,reduced=w.state.settings.reducedMotion;
      for(const e of this.events){if(e.region!==w.regionId)continue;const age=w.elapsed-e.start,q=clamp(age/e.duration,0,1),p=e.item;
        c.save();c.imageSmoothingEnabled=false;
        if(e.kind==='boat'){
          const from=p.waterStart||{x:p.x-35,y:p.y-36},to=p.waterEnd||{x:p.x-155,y:p.y-105},u=reduced?.2:q;
          const x=mix(from.x,to.x,u),y=mix(from.y,to.y,u)+(reduced?0:Math.sin(age*2)*1.5);
          c.globalAlpha=q>.8?(1-q)*5:1;
          if(!reduced){for(let i=0;i<4;i++)this.ring(c,x+(to.x>from.x?-1:1)*i*7,y+7+i*2,7+i*5,.34-i*.065);}
          this.boat(c,x,y,.8,e.wish);
        }else if(e.kind==='skip'){
          const start=p.waterStart||{x:p.x+15,y:p.y+63},end=p.waterEnd||{x:p.x+123,y:p.y+110};
          if(reduced){this.ring(c,start.x,start.y,14,.7);}
          else {
            const flight=.65,span=.42;let x,y,lift;
            if(age<flight){const u=age/flight;x=mix(e.from.x,start.x,u);y=mix(e.from.y,start.y,u);lift=Math.sin(u*Math.PI)*25;}
            else{const u=clamp((age-flight)/(e.skips*span),0,1),bounce=Math.min(e.skips-1,Math.floor((age-flight)/span)),phase=((age-flight)/span)%1;x=mix(start.x,end.x,u);y=mix(start.y,end.y,u);lift=Math.sin(phase*Math.PI)*(20-bounce*3);}
            c.fillStyle='#e8ded0';c.fillRect(Math.round(x)-3,Math.round(y-lift)-2,6,3);
            for(let i=0;i<e.skips;i++){const since=age-flight-i*span;if(since>=0&&since<1.1){const u=i/e.skips,px=mix(start.x,end.x,u),py=mix(start.y,end.y,u);this.ring(c,px,py,4+since*25,(1-since/1.1)*.85);if(since<.25)for(let k=0;k<4;k++){c.fillStyle='#e3fff4';c.fillRect(px+(k-1.5)*7,py-Math.sin(since/.25*Math.PI)*(6+k%2*5),2,3);}}}
          }
        }else if(e.kind==='water'&&!reduced){
          for(let i=0;i<26;i++){const u=(age*1.4+i/26)%1,x=mix(p.x+88,p.x-55+(i*29)%110,u),y=mix(p.y-18,p.y-20+(i%3)*12,u)-Math.sin(u*Math.PI)*28;c.fillStyle=i%3?'#aee2ddcc':'#effff5';c.fillRect(Math.round(x),Math.round(y),2,4);}
        }else if(e.kind==='plant'&&!reduced){
          for(let i=0;i<8;i++){const u=clamp(age*1.5-i*.08,0,1);c.fillStyle='#e4cd90';c.fillRect(p.x-50+i*14,p.y-40+u*28,3,2);}
        }else if((e.kind==='bloom'||e.kind==='ribbons')&&!reduced){
          for(let i=0;i<18;i++){const x=p.x+Math.sin(i*19)*65+Math.sin(age+i)*9,y=p.y-18-age*(15+i%5*3),a=Math.sin(q*Math.PI)*.7;c.globalAlpha=a;c.fillStyle=['#f7dca0','#d9bde9','#afdcc2','#f0b1c2'][i%4];c.save();c.translate(x,y);c.rotate(age*(i%2?1:-1));c.fillRect(-2,-2,e.kind==='ribbons'?7:3,3);c.restore();}
        }
        c.restore();
      }
    }
    snapshot(){return {events:this.events.length,rotor:this.rotor};}
  }
  window.IslandPastimes=IslandPastimes;
  IslandPastimes.ready=artReady;
  IslandPastimes.art=()=>({loaded:artLoaded,path:artPath,parts:artParts});
})();
