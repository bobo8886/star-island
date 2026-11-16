/* Screen-space discovery signs. Original item references stay intact for navigation. */
(() => {
  'use strict';
  const INK='#183f49', CREAM='#fff4d8';
  const TYPES={portal:{icon:'↗',color:'#f4d99d',name:'出口'},memory:{icon:'◇',color:'#e3bded',name:'回忆'},story:{icon:'✦',color:'#b9e0cc',name:'故事'},activity:{icon:'♡',color:'#fac4b7',name:'互动'},letter:{icon:'✉',color:'#f4c5cf',name:'写信'},landmark:{icon:'⌂',color:'#c1ddeb',name:'地点'}};
  const HUD='.topbar,#quest-panel,#world-label,.compass,#interact-hint,#toast,.bottom-bar,#joystick,.touch-actions';
  const overlaps=(a,b,p=0)=>a.x<b.x+b.w+p&&a.x+a.w>b.x-p&&a.y<b.y+b.h+p&&a.y+a.h>b.y-p;
  const contains=(r,x,y)=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h;
  const bounded=(r,w,h)=>r.x>=9&&r.y>=9&&r.x+r.w<=w-9&&r.y+r.h<=h-9;
  const rounded=(c,r,radius=7)=>{c.beginPath();if(c.roundRect)c.roundRect(r.x,r.y,r.w,r.h,radius);else c.rect(r.x,r.y,r.w,r.h);};
  const cloneRect=r=>({x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.w),h:Math.round(r.h)});
  class IslandWaypoints {
    constructor(world){this.world=world;this.points=[];this.hits=[];this.hud=[];this.actors=[];this.list=null;this.lastHud=-Infinity;this.previous=new Map();this.lastSnapshot={enabled:false,reason:'not-started',visible:[],labels:[],hitRegions:[]};}
    enabled(){const w=this.world;return !!(w.started&&!w.paused&&!w.capturing&&w.ready!==false&&!w.activity);}
    exclusions(now){
      const w=this.world,key=w.width+'x'+w.height;
      if(now-this.lastHud>300||this.hudKey!==key){
        this.lastHud=now;this.hudKey=key;this.hud=[];
        if(typeof document!=='undefined')for(const el of document.querySelectorAll(HUD)){
          if(el.hidden||el.closest('[hidden]'))continue;
          const style=getComputedStyle(el);if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)continue;
          const r=el.getBoundingClientRect();if(r.width>0&&r.height>0)this.hud.push({x:r.left-5,y:r.top-5,w:r.width+10,h:r.height+10});
        }
        const celebration=w.fireworks?.snapshot?.();
        if(celebration?.enabled&&celebration.textBounds){const r=celebration.textBounds;this.hud.push({x:r.x-10,y:r.y-10,w:r.width+20,h:r.height+20});}
      }
      const scale=w.camera?.scale||1,actor=(p,boy=false)=>{const s=w.toScreen(p.x,p.y),width=(boy?43:39)*scale+7;return{x:s.x-width,y:s.y-115*scale-8,w:width*2,h:126*scale+14};};
      this.actors=[actor(w.player)];
      if(w.companion==='boy'&&w.spirit)this.actors.push(actor(w.spirit,true));
      else if(w.companion!=='none'&&w.spirit){const s=w.toScreen(w.spirit.x,w.spirit.y);this.actors.push({x:s.x-25*scale,y:s.y-53*scale,w:50*scale,h:65*scale});}
    }
    direction(item){const p=this.world.player,dx=item.x-p.x,dy=item.y-p.y;if(Math.hypot(dx,dy)<82)return'出口';const a=Math.atan2(dy,dx);return ['东','东南','南','西南','西','西北','北','东北'][(Math.round(a/(Math.PI/4))+8)%8];}
    fitText(c,text,width){const value=String(text);if(c.measureText(value).width<=width)return value;let low=0,high=value.length;while(low<high){const middle=Math.ceil((low+high)/2);if(c.measureText(value.slice(0,middle)+'…').width<=width)low=middle;else high=middle-1;}return value.slice(0,low)+'…';}
    layout(c){
      const w=this.world,mobile=!!w.mobile,now=typeof performance!=='undefined'?performance.now():0;
      this.exclusions(now);this.points=[];this.hits=[];this.list=null;
      const offscreen=[],suppressed=[],occupied=[...this.hud,...this.actors];
      c.font=`600 ${mobile?11:12}px "Microsoft YaHei",sans-serif`;
      const items=w.items||[];
      for(let i=0;i<items.length;i++){
        const item=items[i],s=w.toScreen(item.x,item.y),type=TYPES[item.type]?item.type:'landmark';
        if(!Number.isFinite(s.x)||!Number.isFinite(s.y)||s.x<13||s.x>w.width-13||s.y<28||s.y>w.height-13){offscreen.push(item.id);continue;}
        const distance=Math.hypot(item.x-w.player.x,item.y-w.player.y),point={item,id:item.id,name:String(item.name||item.theme||'地点'),number:i+1,type,style:TYPES[type],x:s.x,y:s.y,near:distance<82,distance,seen:!!w.seen?.(item),marker:{x:s.x-13,y:s.y-38,w:26,h:26},label:null,listed:false};
        // A point behind a HUD panel is genuinely occluded, never moved to a false map position.
        if(this.hud.some(r=>overlaps(r,point.marker))){suppressed.push(item.id);continue;}
        point.markerVisible=!this.actors.some(r=>overlaps(r,point.marker));
        point.priority=(type==='portal'?10000:0)+(point.near?5000:0)-distance;
        this.points.push(point);
      }
      const ranked=[...this.points].sort((a,b)=>b.priority-a.priority||a.number-b.number);
      // Nearby object names remain readable even when an actor stands in front of its marker.
      const crowded=ranked.filter(p=>!p.markerVisible);
      if(mobile&&(this.points.length>5||crowded.length))crowded.push(...ranked.filter(p=>p.type==='portal'&&!crowded.includes(p)));
      crowded.sort((a,b)=>b.priority-a.priority||a.number-b.number);
      if(crowded.length){
        const entries=crowded.slice(0,mobile?2:3),width=Math.min(mobile?245:290,w.width-24),height=23+entries.length*32;
        const options=[];
        for(let y=78;y+height<w.height-30;y+=16)for(const x of [12,w.width-width-12,(w.width-width)/2]){
          const box={x,y,w:width,h:height};if(bounded(box,w.width,w.height)&&!occupied.some(r=>overlaps(box,r,8)))options.push(box);
        }
        const player=w.toScreen(w.player.x,w.player.y);
        options.sort((a,b)=>(Math.abs(a.y-player.y-24)+Math.abs(a.x+a.w/2-player.x)*.4)-(Math.abs(b.y-player.y-24)+Math.abs(b.x+b.w/2-player.x)*.4));
        if(options.length){this.list={rect:options[0],entries};occupied.push(this.list.rect);entries.forEach((p,i)=>{p.listed=true;this.hits.push({item:p.item,kind:'list',rect:{x:options[0].x,y:options[0].y+23+i*32,w:width,h:32}});});}
      }
      let labelCount=0;const maxLabels=mobile?(w.landscape?5:4):12;
      for(const p of ranked){
        const status=p.type==='letter'?(p.near?(mobile?'点此写信':'F 写信'):w.state.treeLetter?.body?'续写':'写信'):p.near?(mobile?(p.type==='portal'?'点此进入':'点此互动'):'F 互动'):p.seen?(p.type==='activity'?'✓ 再玩':'✓ 重读'):'';
        const prefix=p.type==='portal'?this.direction(p.item)+' · ':'';
        const maxText=mobile?155:218;
        p.text=this.fitText(c,prefix+p.name,maxText);p.status=status;
        const textWidth=c.measureText(p.text).width,chip=status?c.measureText(status).width+12:0;
        const labelWidth=Math.ceil(26+textWidth+(chip?chip+7:0)),height=mobile?28:29;
        if(p.listed||labelCount>=maxLabels)continue;
        const gap=22,candidates=[
          {x:p.x+gap,y:p.y-42,w:labelWidth,h:height},
          {x:p.x-gap-labelWidth,y:p.y-42,w:labelWidth,h:height},
          {x:p.x-labelWidth/2,y:p.y-75,w:labelWidth,h:height},
          {x:p.x-labelWidth/2,y:p.y+17,w:labelWidth,h:height},
          {x:p.x+gap,y:p.y-81,w:labelWidth,h:height},
          {x:p.x-gap-labelWidth,y:p.y-81,w:labelWidth,h:height},
          {x:p.x-labelWidth/2,y:p.y-108,w:labelWidth,h:height},
          {x:p.x-labelWidth/2,y:p.y+67,w:labelWidth,h:height},
          {x:p.x-labelWidth/2,y:p.y+102,w:labelWidth,h:height}
        ];
        for(const candidate of candidates)candidate.x=Math.max(10,Math.min(w.width-10-labelWidth,candidate.x));
        if(p.type==='portal'){
          const alternatives=[];
          for(let y=Math.max(80,p.y-120);y<Math.min(w.height-height-9,p.y+180);y+=14)for(const x of [10,w.width-labelWidth-10,Math.max(10,Math.min(w.width-10-labelWidth,p.x-labelWidth/2))])alternatives.push({x,y,w:labelWidth,h:height});
          alternatives.sort((a,b)=>Math.hypot(a.x+a.w/2-p.x,a.y+a.h/2-p.y)-Math.hypot(b.x+b.w/2-p.x,b.y+b.h/2-p.y));
          candidates.push(...alternatives);
        }
        // Keep a valid previous side to stop signs swapping places as the camera eases.
        const prev=this.previous.get(p.id);if(prev!==undefined&&candidates[prev])candidates.unshift({...candidates[prev],previous:prev});
        const chosen=candidates.find(r=>bounded(r,w.width,w.height)&&!occupied.some(o=>overlaps(r,o,5))&&!this.points.some(other=>other!==p&&other.markerVisible&&overlaps(r,other.marker,4)));
        if(chosen){p.label=chosen;occupied.push(chosen);labelCount++;this.previous.set(p.id,chosen.previous??(prev!==undefined?candidates.indexOf(chosen)-1:candidates.indexOf(chosen)));this.hits.push({item:p.item,kind:'label',rect:chosen});}
      }
      for(const p of this.points)if(p.markerVisible)this.hits.push({item:p.item,kind:'marker',rect:{x:p.marker.x-5,y:p.marker.y-5,w:p.marker.w+10,h:p.marker.h+10}});
      this.lastSnapshot={enabled:true,region:w.regionId,fontPx:mobile?11:12,visible:this.points.map(p=>({id:p.id,name:p.name,type:p.type,number:p.number,screenX:p.x,screenY:p.y,near:p.near,seen:p.seen,markerVisible:p.markerVisible,markerRect:cloneRect(p.marker),labelRect:p.label?cloneRect(p.label):null,listed:p.listed})),labels:this.points.filter(p=>p.label).map(p=>({id:p.id,text:p.text,status:p.status,rect:cloneRect(p.label)})),list:this.list?{rect:cloneRect(this.list.rect),ids:this.list.entries.map(p=>p.id)}:null,hitRegions:this.hits.map(h=>({id:h.item.id,kind:h.kind,rect:cloneRect(h.rect)})),offscreen,suppressedByHud:suppressed,actors:this.actors.map(cloneRect),hud:this.hud.map(cloneRect)};
    }
    draw(ctx){
      const w=this.world;
      if(!this.enabled()){this.hits=[];this.points=[];this.list=null;this.lastSnapshot={enabled:false,reason:!w.started?'not-started':w.capturing?'photo':w.activity?'activity':w.paused?'paused':'loading',visible:[],labels:[],hitRegions:[]};return;}
      ctx.save();ctx.setTransform(w.dpr||1,0,0,w.dpr||1,0,0);ctx.globalAlpha=1;ctx.textAlign='left';ctx.textBaseline='middle';
      this.layout(ctx);
      // Stationary map signs are deliberately independent of animation time/reduced-motion.
      for(const p of this.points){
        const c=ctx,color=p.style.color;
        if(p.markerVisible){
          c.lineWidth=3;c.strokeStyle=INK;c.beginPath();c.ellipse(p.x,p.y+1,14,5,0,0,Math.PI*2);c.stroke();c.strokeStyle=color;c.lineWidth=1.5;c.stroke();
          c.strokeStyle=CREAM;c.lineWidth=2;c.beginPath();c.moveTo(p.x,p.y-3);c.lineTo(p.x,p.y-13);c.stroke();
          c.fillStyle=INK;c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.arc(p.x,p.y-25,12,0,Math.PI*2);c.fill();c.stroke();
          c.font='700 11px "Microsoft YaHei",sans-serif';c.textAlign='center';c.fillStyle=CREAM;c.fillText(String(p.number),p.x,p.y-25);c.textAlign='left';
          if(p.seen){c.fillStyle='#c7edce';c.beginPath();c.arc(p.x+10,p.y-36,6,0,Math.PI*2);c.fill();c.fillStyle=INK;c.font='bold 9px sans-serif';c.fillText('✓',p.x+6.5,p.y-35.5);}
        }
        if(p.label){
          const r=p.label,nearX=Math.max(r.x,Math.min(p.x,r.x+r.w)),nearY=Math.max(r.y,Math.min(p.y-25,r.y+r.h)),dx=nearX-p.x,dy=nearY-(p.y-25),length=Math.max(1,Math.hypot(dx,dy));
          if(p.markerVisible){c.save();if(c.clip)for(const actor of this.actors){c.beginPath();c.rect(0,0,w.width,w.height);c.rect(actor.x,actor.y,actor.w,actor.h);c.clip('evenodd');}c.strokeStyle=INK;c.lineWidth=3;c.beginPath();c.moveTo(p.x+dx/length*14,p.y-25+dy/length*14);c.lineTo(nearX,nearY);c.stroke();c.strokeStyle=color;c.lineWidth=1;c.stroke();c.restore();}
          c.shadowColor='#0b202746';c.shadowBlur=5;c.shadowOffsetY=2;rounded(c,r);c.fillStyle=p.type==='portal'?CREAM:'#153c47f2';c.fill();c.shadowBlur=0;c.shadowOffsetY=0;c.strokeStyle=p.type==='portal'?'#dfbd79':color;c.lineWidth=1;c.stroke();
          const ink=p.type==='portal'?INK:CREAM;c.fillStyle=ink;c.font=`600 ${w.mobile?11:12}px "Microsoft YaHei",sans-serif`;c.fillText(p.style.icon,r.x+8,r.y+r.h/2);c.fillText(p.text,r.x+23,r.y+r.h/2);
          if(p.status){const tw=c.measureText(p.text).width,chip={x:r.x+29+tw,y:r.y+5,w:r.w-35-tw,h:r.h-10};rounded(c,chip,4);c.fillStyle=p.near?'#f6e4b8':'#bde1cd';c.fill();c.fillStyle=INK;c.font='600 10px "Microsoft YaHei",sans-serif';c.fillText(p.status,chip.x+5,r.y+r.h/2);}
        }
      }
      if(this.list){const {rect:r,entries}=this.list;rounded(ctx,r,9);ctx.fillStyle='#fff3daf5';ctx.fill();ctx.strokeStyle='#d7bd86';ctx.lineWidth=1;ctx.stroke();ctx.font='600 10px "Microsoft YaHei",sans-serif';ctx.fillStyle='#577270';ctx.fillText('附近地点 · 点名称前往',r.x+11,r.y+13);for(let i=0;i<entries.length;i++){const p=entries[i],y=r.y+23+i*32;ctx.fillStyle=INK;ctx.beginPath();ctx.arc(r.x+20,y+16,10,0,Math.PI*2);ctx.fill();ctx.fillStyle=CREAM;ctx.textAlign='center';ctx.font='bold 10px sans-serif';ctx.fillText(String(p.number),r.x+20,y+16);ctx.textAlign='left';ctx.font='600 11px "Microsoft YaHei",sans-serif';ctx.fillStyle=INK;ctx.fillText(this.fitText(ctx,p.name,r.w-75),r.x+39,y+16);ctx.fillStyle='#507f70';ctx.fillText(p.type==='portal'?'↗':p.seen?'✓':p.near&&!w.mobile?'F':'›',r.x+r.w-23,y+16);}}
      ctx.restore();
    }
    hitTest(x,y){if(!this.enabled()||this.lastSnapshot.region!==this.world.regionId||this.hud.some(r=>contains(r,x,y))||this.actors.some(r=>contains(r,x,y)))return null;for(const h of this.hits)if(contains(h.rect,x,y))return h.item;return null;}
    snapshot(){return JSON.parse(JSON.stringify(this.lastSnapshot));}
  }
  window.IslandWaypoints=IslandWaypoints;
})();
