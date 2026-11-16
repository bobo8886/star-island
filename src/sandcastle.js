/* Original four-stage raster sandcastle; reference and prompt recorded in assets/.
 * Frames are isolated and alpha-cleaned once, then shared by all renders/photos.
 */
(() => {
  'use strict';
  const l10n=window.IslandI18n?.t||((text)=>text);
  const PATH='assets/sandcastle-stages.png', SIZE=576, SCALE=.31;
  const BOUNDS=[[86,282,563,505],[60,255,551,506],[60,214,568,561],[33,14,565,563]];
  const frames=[],bases=[],flags=[];
  const flagRect={x:300,y:18,w:102,h:71};
  const img=new Image(); let loaded=false,error=null,cleanedPixels=0;
  const canvas=(w=SIZE,h=SIZE)=>{const el=document.createElement('canvas');el.width=w;el.height=h;return el;};
  function cleanAlpha(c){
    const g=c.getContext('2d'),data=g.getImageData(0,0,SIZE,SIZE),d=data.data;
    const mask=new Uint8Array(SIZE*SIZE),visited=new Uint8Array(mask.length),queue=new Int32Array(mask.length);
    for(let i=0;i<mask.length;i++){const a=d[i*4+3];if(a>=200)mask[i]=1;else if(a){d[i*4+3]=0;cleanedPixels++;}}
    // Remove tiny isolated alpha specks without erasing connected sand or shell details.
    for(let start=0;start<mask.length;start++){
      if(!mask[start]||visited[start])continue;
      let head=0,tail=1;queue[0]=start;visited[start]=1;
      while(head<tail){const cur=queue[head++],x=cur%SIZE,y=(cur/SIZE)|0;
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=SIZE||yy>=SIZE)continue;const next=yy*SIZE+xx;if(mask[next]&&!visited[next]){visited[next]=1;queue[tail++]=next;}}
      }
      if(tail<48){for(let j=0;j<tail;j++){d[queue[j]*4+3]=0;cleanedPixels++;}}
      else for(let j=0;j<tail;j++)d[queue[j]*4+3]=255;
    }
    g.putImageData(data,0,0);
  }
  const ready=new Promise(resolve=>{
    img.onload=()=>{
      try{
        const cw=img.naturalWidth/2,ch=img.naturalHeight/2;
        for(let stage=0;stage<4;stage++){
          const c=canvas(),g=c.getContext('2d'),[l,t,r,b]=BOUNDS[stage],w=r-l,h=b-t;
          g.imageSmoothingEnabled=false;
          g.drawImage(img,stage%2*cw+l,Math.floor(stage/2)*ch+t,w,h,Math.round(SIZE/2-w/2),560-h,w,h);
          try{cleanAlpha(c);}catch(e){/* file:// source mode can forbid pixel reads; embedded HTML remains cleanable. */}
          frames.push(c);
          if(stage===3){const base=canvas(),bg=base.getContext('2d');bg.drawImage(c,0,0);const f=flagRect;bg.clearRect(f.x,f.y,f.w,f.h);bases.push(base);const flag=canvas(f.w,f.h);flag.getContext('2d').drawImage(c,f.x,f.y,f.w,f.h,0,0,f.w,f.h);flags.push(flag);}
          else{bases.push(c);flags.push(null);}
        }
        loaded=true;
      }catch(e){error=String(e);}
      resolve(loaded);
    };
    img.onerror=()=>{error=l10n("沙堡素材未能加载");resolve(false);};
    img.src=window.ISLAND_ASSETS?.[PATH]||PATH;
  });
  function draw(ctx,options={}){
    if(!loaded)return false;
    const stage=Math.max(0,Math.min(3,Math.floor(Number(options.stage)||0))),scale=options.scale||SCALE;
    const x=Math.round(options.x||0),y=Math.round(options.y||0),still=!!options.reducedMotion,t=still?0:Number(options.time)||0;
    ctx.save();ctx.translate(x,y);ctx.imageSmoothingEnabled=false;
    const left=-SIZE/2*scale,top=-540*scale;
    ctx.drawImage(bases[stage],left,top,SIZE*scale,SIZE*scale);
    if(stage===3){
      const f=flagRect,flag=flags[stage];
      if(still)ctx.drawImage(flag,left+f.x*scale,top+f.y*scale,f.w*scale,f.h*scale);
      else for(let sx=0;sx<f.w;sx+=3){const sw=Math.min(3,f.w-sx),wave=Math.sin(t*3.7-sx*.075)*Math.min(6,sx*.075);ctx.drawImage(flag,sx,0,sw,f.h,left+(f.x+sx)*scale,top+(f.y+wave)*scale,sw*scale,f.h*scale);}
    }
    // Tiny moving highlights trace the moat and polished shell inlays.
    if(stage>0&&!still){
      for(let i=0;i<9;i++){const a=t*.55+i*.698,x=Math.cos(a)*57,y=Math.sin(a)*12-8;ctx.globalAlpha=.24+.25*Math.max(0,Math.sin(t*2+i));ctx.fillStyle=i%2?'#fff1c6':'#bbf5e7';ctx.fillRect(Math.round(x),Math.round(y),3,1);}
      if(stage===3&&options.active){for(let i=0;i<4;i++){const alpha=Math.max(0,Math.sin(t*1.8+i*1.7));ctx.globalAlpha=alpha*.65;const px=[-37,25,52,-12][i],py=[-72,-106,-54,-27][i];ctx.fillStyle='#fff7d2';ctx.fillRect(px-2,py,5,1);ctx.fillRect(px,py-2,1,5);}}
    }
    if(options.building&&!still){for(let i=0;i<18;i++){const phase=(t*1.7+i*.137)%1;ctx.globalAlpha=(1-phase)*.8;ctx.fillStyle=i%3?'#f4d391':'#fff0bd';ctx.fillRect(Math.round((i%2?1:-1)*(24+phase*27)),Math.round(-28+phase*35+Math.sin(i)*8),i%3?1:2,2);}}
    ctx.restore();return true;
  }
  window.IslandSandcastle={draw,ready,frame:stage=>frames[Math.max(0,Math.min(3,stage|0))],get loaded(){return loaded;},get error(){return error;},get cleanedPixels(){return cleanedPixels;},assetPath:PATH,size:SIZE,scale:SCALE};
})();
