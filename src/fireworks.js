/* The birthday keeps going after the letter is opened. Screen-space rendering;
 * no timers/listeners, no frame readbacks, and draw never advances simulation. */
(() => {
  'use strict';
  const l10n=window.IslandI18n?.t||((text)=>text);
  const TAU=Math.PI*2,PERIOD=7,MAX_PARTICLES=560,MAX_TEXT_POINTS=280;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const ease=n=>1-Math.pow(1-clamp(n,0,1),3);
  const themes={
    home:{name:l10n("桃金心愿"),colors:['#ff9dbb','#ffd991','#fff0d8'],shapes:['heart','star','heart','flower'],text:'#ffadc8'},
    forest:{name:l10n("花间流萤"),colors:['#dfb5ff','#bdf1bf','#ffdb9b'],shapes:['flower','flower','star','flower'],text:'#e5c4ff'},
    coast:{name:l10n("潮汐星愿"),colors:['#8de8ed','#ffdb87','#ffb5bc'],shapes:['star','ring','star','heart'],text:'#a8f0ed'},
    lake:{name:l10n("月下莲光"),colors:['#a7cfff','#d7bcff','#fff1c2'],shapes:['lotus','star','heart','lotus'],text:'#c8d6ff'}
  };
  const schedule=[.08,1.18,3.15,4.82];
  const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=Math.ceil(w);c.height=Math.ceil(h);return c;};
  function shapePoint(shape,t){
    if(shape==='heart')return [Math.pow(Math.sin(t),3),-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))/17];
    if(shape==='star'){
      const f=t/TAU*10,i=Math.floor(f),k=f-i,a=i*Math.PI/5-Math.PI/2,b=(i+1)*Math.PI/5-Math.PI/2;
      const ra=i%2?.43:1,rb=i%2?1:.43;return [Math.cos(a)*ra*(1-k)+Math.cos(b)*rb*k,Math.sin(a)*ra*(1-k)+Math.sin(b)*rb*k];
    }
    const r=shape==='flower'?.65+.35*Math.cos(t*5):shape==='lotus'?.68+.32*Math.cos(t*6):1;
    return [Math.cos(t)*r,Math.sin(t)*r*(shape==='lotus'?.7:1)];
  }
  class IslandFireworks{
    constructor(world){
      this.world=world;this.active=false;this.reduced=false;this.region='';this.time=0;this.cycle=0;this.phase=0;this.mask=0;
      this.particles=[];this.rockets=[];this.blooms=[];this.layouts=new Map();this.glows=new Map();this.outlines=new Map();this.currentLayout=null;this.text=l10n("生日快乐!");
      this.births=0;this.bursts=0;this.peakParticles=0;this.seed=71377;this.glyphBuilds=0;this.hiddenSkips=0;
    }
    random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
    eligible(){return !!(this.world.started&&this.world.state?.finished);}
    readText(){
      let value;try{value=window.IslandPersonalization?.text('ending.fireworkText');}catch{}
      return typeof value==='string'&&value.trim()&&value!=='ending.fireworkText'?Array.from(value.trim().replace(/\s+/g,' ')).slice(0,64).join(''):l10n("生日快乐!");
    }
    reset(){this.time=0;this.phase=0;this.cycle=0;this.mask=0;this.particles.length=0;this.rockets.length=0;this.blooms.length=0;}
    sync(){
      const enabled=this.eligible(),region=themes[this.world.regionId]?this.world.regionId:'home',reduced=!!this.world.state?.settings?.reducedMotion;
      if(!enabled){if(this.active)this.reset();this.active=false;this.region=region;this.reduced=reduced;return false;}
      if(!this.active){this.reset();this.active=true;}
      if(this.region&&region!==this.region){
        this.particles.length=0;this.rockets.length=0;this.blooms.length=0;
        // Keep the seven-second clock across travel. New sky colors appear at
        // once, without carrying old-region sparks or replaying missed bursts.
        this.mask=schedule.reduce((mask,t,i)=>mask|(this.phase>=t?1<<i:0),0);
        if(!reduced)this.launch(0,region);
      }
      if(reduced!==this.reduced){this.particles.length=0;this.rockets.length=0;this.blooms.length=0;if(!reduced){this.phase=0;this.mask=0;}}
      this.region=region;this.reduced=reduced;this.text=this.readText();
      this.currentLayout=this.layout(false);return true;
    }
    update(dt){
      if(!this.sync())return;
      if(document.hidden){this.hiddenSkips++;return;}
      if(this.reduced)return;
      const step=clamp(Number.isFinite(dt)?dt:0,0,.05);if(!step)return;
      this.time+=step;this.phase+=step;
      if(this.phase>=PERIOD){this.phase-=PERIOD;this.cycle++;this.mask=0;}
      for(let i=0;i<schedule.length;i++)if(this.phase>=schedule[i]&&!(this.mask&(1<<i))){this.mask|=1<<i;this.launch(i);}
      for(let i=this.rockets.length-1;i>=0;i--){const r=this.rockets[i];r.age+=step;if(r.age>=r.duration){this.explode(r);this.rockets.splice(i,1);}}
      let write=0;for(const p of this.particles){p.age+=step;if(p.age<p.life)this.particles[write++]=p;}this.particles.length=write;
      write=0;for(const bloom of this.blooms){bloom.age+=step;if(bloom.age<2.9)this.blooms[write++]=bloom;}this.blooms.length=write;
      this.peakParticles=Math.max(this.peakParticles,this.particles.length);
    }
    replay(){if(!this.sync())return false;this.reset();return true;}
    launch(index,region=this.region){
      if(this.rockets.length>=5)return;const w=this.world.width||innerWidth,h=this.world.height||innerHeight;
      const portrait=w<620&&h>w,landscape=h<500&&w>h,positions=portrait?[[.19,.32],[.81,.39],[.24,.23],[.76,.28]]:[[.2,.25],[.83,.31],[.34,.2],[.7,.22]];
      const pos=positions[(index+this.cycle)%4],radius=Math.min(portrait?62:108,w*.16,h*(landscape?.19:.16));
      this.rockets.push({x:pos[0],y:pos[1],fromX:pos[0]+(index%2?-.055:.055),fromY:Math.min(.76,pos[1]+.36),radius,
        age:0,duration:.66+index*.055,color:themes[region].colors[index%3],shape:themes[region].shapes[(index+this.cycle)%4],region,index});
    }
    explode(r){
      const theme=themes[r.region],count=r.shape==='ring'?72:104;
      if(this.blooms.length<8)this.blooms.push({x:r.x,y:r.y,radius:r.radius,shape:r.shape,color:r.color,age:0});
      for(let i=0;i<count&&this.particles.length<MAX_PARTICLES;i++){
        const t=i/count*TAU,[x,y]=shapePoint(r.shape,t),inner=i%4===0?.64:1,color=theme.colors[i%9===0?2:r.index%3];
        this.particles.push({x:r.x,y:r.y,dx:x*r.radius*inner,dy:y*r.radius*inner,age:0,life:2.35+this.random()*.65,
          gravity:4+this.random()*4,wind:(this.random()-.5)*5,size:i%7===0?3.1:2.15,color,seed:this.random()*TAU,shape:r.shape});
      }
      // A few softer falling embers give the outline depth without making a fog.
      for(let i=0;i<12&&this.particles.length<MAX_PARTICLES;i++){
        const a=this.random()*TAU,d=r.radius*(.2+this.random()*.75);
        this.particles.push({x:r.x,y:r.y,dx:Math.cos(a)*d,dy:Math.sin(a)*d,age:0,life:1.4+this.random(),gravity:15,
          wind:(this.random()-.5)*8,size:1,color:theme.colors[2],seed:this.random()*TAU,shape:'ember'});
      }
      this.births+=count+12;this.bursts++;
    }
    glow(color){
      if(this.glows.has(color))return this.glows.get(color);
      const c=canvas(32,32),g=c.getContext('2d'),paint=g.createRadialGradient(16,16,0,16,16,16);
      paint.addColorStop(0,'#ffffff');paint.addColorStop(.1,color);paint.addColorStop(.27,color+'ac');paint.addColorStop(1,color+'00');g.fillStyle=paint;g.fillRect(0,0,32,32);
      // Cache the keyline and sharp white core with the glow. Each live spark
      // then needs one image blit instead of four separate drawing operations.
      g.fillStyle='#30253f6b';g.fillRect(12,12,8,8);g.fillStyle=color;g.fillRect(14,14,4,4);g.fillStyle='#fff9e7';g.fillRect(15,15,2,2);
      this.glows.set(color,c);return c;
    }
    outline(shape,color){
      const key=shape+color;if(this.outlines.has(key))return this.outlines.get(key);
      const c=canvas(256,256),g=c.getContext('2d'),shade=g.createRadialGradient(128,128,10,128,128,126);
      shade.addColorStop(0,'#101a3d4d');shade.addColorStop(.65,'#101a3d32');shade.addColorStop(1,'#101a3d00');g.fillStyle=shade;g.fillRect(0,0,256,256);
      g.beginPath();for(let i=0;i<=120;i++){const [x,y]=shapePoint(shape,i/120*TAU);if(i)g.lineTo(128+x*100,128+y*100);else g.moveTo(128+x*100,128+y*100);}
      g.shadowColor=color;g.shadowBlur=8;g.strokeStyle=color;g.lineWidth=1.3;g.globalAlpha=.58;g.stroke();
      this.outlines.set(key,c);while(this.outlines.size>16)this.outlines.delete(this.outlines.keys().next().value);return c;
    }
    layout(capturing){
      const w=this.world.width||innerWidth,h=this.world.height||innerHeight,region=this.region||'home';
      const key=[w,h,this.text,region,!!capturing].join('|');if(this.layouts.has(key))return this.layouts.get(key);
      const portrait=w<620&&h>w,landscape=h<=540&&w>h;
      // The landscape camera puts the traveller at 60% of screen width. Keep
      // the full greeting (including 32px of halo/scatter) in a right-hand bay.
      const maxWidth=landscape?Math.max(100,w*.4-110):Math.min(w-36,w*(portrait?.92:.76));
      let font=Math.round(Math.min(portrait?56:landscape?52:100,portrait?w*.12:landscape?h*.14:w*.074));font=Math.max(22,font);
      const measure=canvas(1,1).getContext('2d'),fontName='900 '+font+'px "Microsoft YaHei","PingFang SC",sans-serif';measure.font=fontName;
      let lines=[this.text];
      if(landscape&&Array.from(this.text).length<=8)while(font>24&&measure.measureText(this.text).width>maxWidth){font--;measure.font='900 '+font+'px "Microsoft YaHei","PingFang SC",sans-serif';}
      while(font>18&&measure.measureText(this.text).width>maxWidth*1.95){font-=2;measure.font='900 '+font+'px "Microsoft YaHei","PingFang SC",sans-serif';}
      if(measure.measureText(this.text).width>maxWidth){
        if(/^[\x20-\x7e]+$/.test(this.text)&&this.text.includes(' ')){
          const words=this.text.split(/\s+/);while(font>18&&words.some(word=>measure.measureText(word).width>maxWidth)){font--;measure.font='900 '+font+'px "Microsoft YaHei","PingFang SC",sans-serif';}
          lines=[''];for(const word of words){const next=lines.at(-1)?lines.at(-1)+' '+word:word;if(lines.at(-1)&&measure.measureText(next).width>maxWidth)lines.push(word);else lines[lines.length-1]=next;}
        }else{lines=[''];for(const char of Array.from(this.text)){if(measure.measureText(lines.at(-1)+char).width>maxWidth)lines.push(char);else lines[lines.length-1]+=char;}}
      }
      const textWidth=Math.max(...lines.map(line=>measure.measureText(line).width)),lineHeight=font*1.22,textHeight=lineHeight*lines.length;
      const centerX=landscape?w-24-textWidth/2:portrait?w*.5:w*.56;
      let top=capturing?Math.max(70,h*.12):landscape?90:portrait?Math.max(116,h*.14):Math.max(112,h*.14);
      if(!capturing){for(const selector of ['.topbar','#quest-panel','#world-label','.scene-chip']){const node=document.querySelector(selector);if(!node||node.hidden)continue;const r=node.getBoundingClientRect();
        if(r.width&&r.height&&r.top<h*.43&&r.left<centerX+textWidth/2+12&&r.right>centerX-textWidth/2-12)top=Math.max(top,r.bottom+18);}}
      // Short portrait screens still keep the lettering below the journal.
      // A proportional upper-band clamp would put it back underneath that HUD.
      top=Math.min(top,Math.max(50,h-textHeight-80));
      const pad=32,ratio=2,graphic=canvas((textWidth+pad*2)*ratio,(textHeight+pad*2)*ratio),g=graphic.getContext('2d');
      g.scale(ratio,ratio);g.font=measure.font;g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';
      const theme=themes[region];for(let i=0;i<lines.length;i++){
        const x=textWidth/2+pad,y=pad+lineHeight*(i+.5);g.shadowColor=theme.text;g.shadowBlur=18;g.strokeStyle=theme.text;g.lineWidth=5;g.strokeText(lines[i],x,y);
        g.shadowBlur=0;g.strokeStyle='#392c58';g.lineWidth=2.4;g.strokeText(lines[i],x,y);
        const fill=g.createLinearGradient(0,y-font/2,0,y+font/2);fill.addColorStop(0,'#ffffff');fill.addColorStop(.57,'#fff8df');fill.addColorStop(1,theme.text);g.fillStyle=fill;g.fillText(lines[i],x,y);
      }
      // Only glyph construction reads pixels. Sample the solid white mask rather
      // than glow alpha, so gathering sparks resolve into letters, not a box.
      const mask=canvas(textWidth+2,textHeight+2),m=mask.getContext('2d',{willReadFrequently:true});m.font=measure.font;m.textAlign='center';m.textBaseline='middle';m.fillStyle='#fff';
      lines.forEach((line,i)=>m.fillText(line,textWidth/2,lineHeight*(i+.5)));const data=m.getImageData(0,0,mask.width,mask.height).data,points=[];
      for(let y=2;y<mask.height;y+=4)for(let x=2;x<mask.width;x+=4)if(data[(y*mask.width+x)*4+3]>160)points.push({x:x-textWidth/2,y:y-textHeight/2});
      const stride=Math.max(1,Math.ceil(points.length/MAX_TEXT_POINTS)),selected=points.filter((_,i)=>i%stride===0);
      const result={w,h,centerX,centerY:top+textHeight/2,top,font,textWidth,textHeight,graphic,pad,points:selected,lines,maxWidth};
      this.glyphBuilds++;this.layouts.set(key,result);while(this.layouts.size>4)this.layouts.delete(this.layouts.keys().next().value);return result;
    }
    spark(ctx,x,y,size,color,alpha,glow=1){
      if(alpha<=0)return;ctx.globalAlpha=alpha;const r=size*(glow?7:4);ctx.drawImage(this.glow(color),x-r/2,y-r/2,r,r);
    }
    draw(ctx,layer='sky'){
      if(!this.eligible())return;const reduced=!!this.world.state.settings?.reducedMotion;
      const layout=this.layout(!!this.world.capturing),w=layout.w,h=layout.h,theme=themes[this.region||'home'];ctx.save();
      if(layer==='sky'){
        if(reduced){
          for(let i=0;i<8;i++){const x=w*(.12+i*.11),y=h*(.18+(i%3)*.045);this.star(ctx,x,y,i%2?3:4,theme.colors[i%3],.55);}
        }else{
          for(const bloom of this.blooms){const grow=1-Math.exp(-bloom.age*4.1),size=bloom.radius*2.56*grow;ctx.globalAlpha=clamp((2.9-bloom.age)/1.5,0,1)*.78;ctx.drawImage(this.outline(bloom.shape,bloom.color),bloom.x*w-size/2,bloom.y*h-size/2+bloom.age*bloom.age*3,size,size);}
          for(const r of this.rockets){const f=clamp(r.age/r.duration,0,1);for(let i=13;i>=0;i--){const q=clamp(f-i*.017,0,1),curve=ease(q),x=(r.fromX+(r.x-r.fromX)*q)*w,y=(r.fromY+(r.y-r.fromY)*curve)*h;
            this.spark(ctx,x,y,i===0?2.7:1.3,r.color,(1-i/15)*(i===0?1:.5),1);}}
          for(const p of this.particles){const expansion=1-Math.exp(-p.age*4.1),x=p.x*w+p.dx*expansion+p.wind*p.age,y=p.y*h+p.dy*expansion+p.gravity*p.age*p.age*.5;
            const fade=clamp((p.life-p.age)/1.3,0,1),shimmer=.84+.16*Math.sin(p.age*10+p.seed);
            // Tiny downward tail, drawn underneath the bright point.
            if(p.age>.3&&p.age<1.9){ctx.globalAlpha=fade*.17;ctx.strokeStyle=p.color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-p.wind*.15,y-3-p.age*3);ctx.stroke();}
            this.spark(ctx,x,y,p.size,p.color,fade*shimmer,1);
          }
        }
      }else if(layer==='text')this.drawText(ctx,layout,theme,reduced);
      ctx.restore();
    }
    star(ctx,x,y,r,color,alpha){ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r*.24,y-r*.24);ctx.lineTo(x+r,y);ctx.lineTo(x+r*.24,y+r*.24);ctx.lineTo(x,y+r);ctx.lineTo(x-r*.24,y+r*.24);ctx.lineTo(x-r,y);ctx.lineTo(x-r*.24,y-r*.24);ctx.closePath();ctx.fill();}
    drawText(ctx,l,theme,reduced){
      const t=this.phase,alpha=reduced?.83:t<.8?0:t<1.2?(t-.8)/.4:t<3.6?1:t<4.7?(4.7-t)/1.1:0;
      if(alpha>0){ctx.globalAlpha=alpha;ctx.drawImage(l.graphic,l.centerX-l.textWidth/2-l.pad,l.centerY-l.textHeight/2-l.pad,l.graphic.width/2,l.graphic.height/2);}
      if(reduced){this.star(ctx,l.centerX-l.textWidth/2-14,l.centerY,6,theme.colors[1],.75);this.star(ctx,l.centerX+l.textWidth/2+14,l.centerY,6,theme.colors[1],.75);return;}
      if(t>.15&&t<4.9){
        for(let i=0;i<l.points.length;i++){
          if(t>=1.2&&t<3.65&&i%11!==0)continue;
          const point=l.points[i],delay=(i%19)/95,arrival=ease((t-.18-delay)/.85),scatter=clamp((t-3.65)/1.2,0,1);
          const sourceX=l.centerX+Math.sin(i*2.4)*l.textWidth*.42,sourceY=l.centerY+l.textHeight*.8+48+(i%11)*3;
          const x=sourceX*(1-arrival)+(l.centerX+point.x)*arrival+Math.sin(i*3.1)*scatter*32;
          const y=sourceY*(1-arrival)+(l.centerY+point.y)*arrival+scatter*scatter*(22+i%23);
          const opacity=t<1.2?clamp((t-.15-delay)*4,0,1):t<3.65?(i%11===0?.7:.12):Math.max(0,1-scatter)*.75;
          this.spark(ctx,x,y,i%17===0?2.3:1.3,theme.colors[i%3],opacity,1);
        }
      }
      if(alpha>.1){const span=l.textWidth/2+22;for(let i=0;i<6;i++){const a=i*TAU/6+t*.14;this.star(ctx,l.centerX+Math.cos(a)*span,l.centerY+Math.sin(a)*(l.textHeight*.55+14),i%2?3:5,theme.colors[i%3],alpha*(.55+.15*Math.sin(t*3+i)));}}
    }
    snapshot(){
      const l=this.currentLayout;return {enabled:this.eligible(),active:this.active,reducedMotion:this.reduced,region:this.region,theme:themes[this.region||'home'].name,
        time:this.time,cycle:this.cycle,phase:this.phase,period:PERIOD,text:this.text,particleCount:this.particles.length,rocketCount:this.rockets.length,
        maxParticles:MAX_PARTICLES,peakParticles:this.peakParticles,bursts:this.bursts,births:this.births,glyphBuilds:this.glyphBuilds,layoutCacheSize:this.layouts.size,
        glowCacheSize:this.glows.size,outlineCacheSize:this.outlines.size,bloomCount:this.blooms.length,textPointCount:l?.points.length||0,hiddenSkips:this.hiddenSkips,
        textBounds:l?{x:l.centerX-l.textWidth/2,y:l.top,width:l.textWidth,height:l.textHeight,font:l.font}:null,
        shapes:[...new Set(this.particles.filter(p=>p.shape!=='ember').map(p=>p.shape))]};
    }
  }
  window.IslandFireworks=IslandFireworks;
})();
