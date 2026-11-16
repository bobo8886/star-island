/* Actual reference-conditioned artwork shared by world and portrait preview.
 * The source atlas is cropped, anchored and alpha-normalized once, never repainted as crude blocks.
 */
(() => {
  'use strict';
  const SIZE=Object.freeze({width:160,height:192,anchorX:80,anchorY:184});
  const DEFAULT_SCALE=100/176;
  const moduleBase=document.currentScript?.src?new URL('../',document.currentScript.src):new URL('./',location.href);
  const files={girl:'assets/character-atlas.png',boy:'assets/companion-atlas.png',idle:'assets/character-idle-v6.png'};
  for(const variant of ['girl','boy'])for(const direction of ['side','front','back'])files[variant+'-'+direction]='assets/'+(variant==='girl'?'character':'companion')+'-walk-'+direction+'-v6.png';
  // Measured opaque bounds, within each 362px atlas cell; no adjacent character enters the crop.
  const bounds={
    girl:[[120,13,275,340],[88,13,260,340],[90,13,263,340],[85,13,244,340],[118,9,282,338],[103,13,266,338],[77,36,277,325],[80,10,268,338],[104,8,282,339],[96,11,258,339],[49,53,295,326],[87,11,271,341]],
    boy:[[110,9,260,350],[103,9,269,349],[102,10,274,349],[107,9,251,351],[104,10,265,348],[104,10,264,350],[86,40,275,335],[100,10,258,349],[109,11,284,350],[105,11,259,350],[65,57,286,339],[105,11,261,350]]
  };
  const images={},bases=new Map(),cache=new Map(),errors=[];let prepared=false,lanternGlow;
  const make=()=>{const c=document.createElement('canvas');c.width=SIZE.width;c.height=SIZE.height;return c;};
  function sourceFrame(variant,index){
    const key=variant+'/'+index;if(bases.has(key))return bases.get(key);
    const canvas=make(),g=canvas.getContext('2d',{willReadFrequently:true}),img=images[variant];
    if(!img?.complete||!img.naturalWidth)return canvas;
    const [left,top,right,bottom]=bounds[variant][index],cw=img.naturalWidth/4,ch=img.naturalHeight/3;
    const ratio=176/(variant==='boy'?342:329),w=Math.round((right-left+4)*ratio),h=Math.round((bottom-top+4)*ratio);
    g.imageSmoothingEnabled=false;
    g.drawImage(img,index%4*cw+left-2,Math.floor(index/4)*ch+top-2,right-left+4,bottom-top+4,Math.round(SIZE.anchorX-w/2),SIZE.anchorY-h,w,h);
    // Source edge colors can contain low-alpha matte specks. Quantize only alpha, preserving facial color/detail.
    try{const data=g.getImageData(0,0,SIZE.width,SIZE.height),p=data.data;for(let i=0;i<p.length;i+=4)p[i+3]=p[i+3]>=180&&!(p[i]>180&&p[i+1]<55&&p[i+2]<55)?255:0;g.putImageData(data,0,0);}catch{/* file:// source images may be read-protected; standalone data URIs remain fully normalized. */}
    bases.set(key,canvas);return canvas;
  }
  const animationInfo={version:'full-pose-v6',frameCount:8,sets:{}};
  function normalizeAlpha(canvas){
    const g=canvas.getContext('2d'),data=g.getImageData(0,0,canvas.width,canvas.height),p=data.data;
    for(let i=0;i<p.length;i+=4)p[i+3]=p[i+3]>=128&&!(p[i]>180&&p[i+1]<55&&p[i+2]<55)?255:0;
    g.putImageData(data,0,0);return canvas;
  }
  function anchorSole(canvas){
    normalizeAlpha(canvas);const g=canvas.getContext('2d'),p=g.getImageData(0,0,160,192).data;let bottom=0;
    for(let y=130;y<192;y++)for(let x=0;x<160;x++)if(p[(y*160+x)*4+3])bottom=Math.max(bottom,y);
    if(bottom!==183){const copy=make();copy.getContext('2d').drawImage(canvas,0,0);g.clearRect(0,0,160,192);g.drawImage(copy,0,183-bottom);}return canvas;
  }
  function groundedSource(variant,index){
    const key='ground/'+variant+'/'+index;if(bases.has(key))return bases.get(key);
    const out=make();out.getContext('2d').drawImage(sourceFrame(variant,index),0,0);try{anchorSole(out);}catch{}bases.set(key,out);return out;
  }
  function extractPose(image,index,columns,rows){
    const w=image.naturalWidth/columns,h=image.naturalHeight/rows,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d',{willReadFrequently:true});
    g.imageSmoothingEnabled=false;g.drawImage(image,index%columns*w,Math.floor(index/columns)*h,w,h,0,0,w,h);
    const data=g.getImageData(0,0,w,h),p=data.data,mask=new Uint8Array(w*h),queue=new Int32Array(w*h);let total=0;
    for(let n=0;n<mask.length;n++){const i=n*4;mask[n]=p[i+3]>=180&&!(p[i]>180&&p[i+1]<55&&p[i+2]<55)?1:0;total+=mask[n];}
    // Import cleanup removes only isolated non-character matte debris. The whole
    // connected painted figure, including its arms, clothes and feet, stays intact.
    let main=new Int32Array(0);
    for(let seed=0;seed<mask.length;seed++){
      if(!mask[seed])continue;let read=0,write=1;queue[0]=seed;mask[seed]=0;
      while(read<write){const q=queue[read++],x=q%w,y=Math.floor(q/w);for(let yy=Math.max(0,y-1);yy<=Math.min(h-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(w-1,x+1);xx++){const next=yy*w+xx;if(mask[next]){mask[next]=0;queue[write++]=next;}}}
      if(write>main.length)main=queue.slice(0,write);
    }
    if(main.length<5000)throw new Error('角色动画帧不完整：'+index);
    let left=w,top=h,right=0,bottom=0;for(let i=3;i<p.length;i+=4)p[i]=0;
    for(const n of main){p[n*4+3]=255;const x=n%w,y=Math.floor(n/w);left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);}
    const headLimit=top+(bottom-top)*.36;let headLeft=w,headRight=0;
    for(const n of main)if(Math.floor(n/w)<headLimit){const x=n%w;headLeft=Math.min(headLeft,x);headRight=Math.max(headRight,x+1);}
    g.putImageData(data,0,0);return{canvas:c,box:[left,top,right,bottom],headX:(headLeft+headRight)/2,headWidth:headRight-headLeft,height:bottom-top,removedPixels:total-main.length};
  }
  function normalizePose(raw,scale){
    const out=make(),g=out.getContext('2d'),[left,top,right,bottom]=raw.box;g.imageSmoothingEnabled=false;
    // One uniform scale per eight-frame direction. Translate by head/shoulder axis
    // and sole, never by the overall swinging-lantern or outstretched-arm bounds.
    g.drawImage(raw.canvas,left,top,right-left,bottom-top,SIZE.anchorX-(raw.headX-left)*scale,SIZE.anchorY-(bottom-top)*scale,(right-left)*scale,(bottom-top)*scale);
    return anchorSole(out);
  }
  function prepareAnimation(){
    for(const variant of ['girl','boy'])for(const [direction,assetDirection]of [['down','front'],['right','side'],['up','back']]){
      const raw=Array.from({length:8},(_,i)=>extractPose(images[variant+'-'+assetDirection],i,4,2));
      const heights=raw.map(f=>f.height).sort((a,b)=>a-b),scale=176/((heights[3]+heights[4])/2),key=variant+'/'+direction;
      animationInfo.sets[key]={file:files[variant+'-'+assetDirection],sharedScale:scale,frames:raw.map(f=>({box:f.box,headX:f.headX,headWidth:f.headWidth,height:f.height,removedPixels:f.removedPixels}))};
      raw.forEach((pose,i)=>cache.set('pose/'+key+'/'+i,normalizePose(pose,scale)));
      const idleIndex=(variant==='boy'?3:0)+(direction==='down'?0:direction==='right'?1:2),idle=extractPose(images.idle,idleIndex,3,2),idleScale=176/idle.height;
      cache.set('pose/'+key+'/idle',normalizePose(idle,idleScale));animationInfo.sets[key].idle={file:files.idle,index:idleIndex,scale:idleScale,box:idle.box,headWidth:idle.headWidth};
    }
  }
  function frame(direction='down',pose='idle',frameIndex=0,blink=false,variant='girl'){
    variant=variant==='boy'?'boy':'girl';direction=['down','up','left','right'].includes(direction)?direction:'down';
    if(!prepared)return make();
    if(pose==='walk'||pose==='idle'||pose==='jump'){
      const beat=((Math.floor(frameIndex)%8)+8)%8,image=cache.get('pose/'+variant+'/'+(direction==='left'?'right':direction)+'/'+(pose==='walk'?beat:'idle'));if(direction!=='left')return image;
      const key='gait-mirror/'+variant+'/'+(pose==='walk'?beat:'rest');if(cache.has(key))return cache.get(key);
      const out=make(),g=out.getContext('2d');g.imageSmoothingEnabled=false;g.translate(SIZE.width,0);g.scale(-1,1);g.drawImage(image,0,0);cache.set(key,out);return out;
    }
    const fixed={sit:6,look:7,wave:8,photo:9,build:10};let index=fixed[pose];
    if(index===undefined)index=direction==='up'?3:0;
    const mirror=direction==='left'&&(pose==='sit'||pose==='build');
    const key=[variant,index,mirror].join('/');if(cache.has(key))return cache.get(key);if(!prepared)return make();
    const out=make(),g=out.getContext('2d');g.imageSmoothingEnabled=false;if(mirror){g.translate(SIZE.width,0);g.scale(-1,1);}g.drawImage(groundedSource(variant,index),0,0);
    cache.set(key,out);return out;
  }
  function draw(ctx,player,options={}){
    if(!prepared)return;
    const time=options.time||0,scale=options.scale||DEFAULT_SCALE,variant=options.variant==='boy'?'boy':'girl';
    let direction=player.direction||'down';const pose=options.pose||(options.sitting?'sit':options.looking?'look':player.jump?'jump':player.walk?'walk':'idle');
    if(['look','wave','photo'].includes(pose))direction='down';const index=pose==='walk'?Math.floor((player.walk||time*10)*1.25)%8:0;
    const hop=player.jump?Math.sin(Math.min(player.jump/.64,1)*Math.PI)*38:0;
    ctx.save();if(options.shadow!==false){ctx.fillStyle='#07172442';ctx.beginPath();ctx.ellipse(player.x,player.y+2,18-hop*.08,5-hop*.02,0,0,Math.PI*2);ctx.fill();}
    if(variant==='girl'&&options.phase!=='day'){
      if(!lanternGlow){lanternGlow=document.createElement('canvas');lanternGlow.width=128;lanternGlow.height=128;const g=lanternGlow.getContext('2d'),fill=g.createRadialGradient(64,64,2,64,64,64);fill.addColorStop(0,'#ffd99438');fill.addColorStop(1,'#ffd99400');g.fillStyle=fill;g.fillRect(0,0,128,128);}ctx.drawImage(lanternGlow,player.x+(direction==='left'?-25:direction==='right'?25:-24)-64,player.y-86-hop);
    }
    ctx.imageSmoothingEnabled=false;ctx.drawImage(frame(direction,pose,index,false,variant),player.x-SIZE.anchorX*scale,player.y-SIZE.anchorY*scale-hop,SIZE.width*scale,SIZE.height*scale);ctx.restore();
  }
  function drawPreview(target,options={}){const g=target.getContext('2d'),pose=options.pose||'idle',time=options.time||0;g.clearRect(0,0,target.width,target.height);g.fillStyle='#192a3d';g.fillRect(0,0,target.width,target.height);draw(g,{x:target.width/2,y:target.height*.92,direction:options.direction||'down',walk:pose==='walk'?time*11+1:0,jump:pose==='jump'?.26:0},{...options,time,phase:'night',scale:Math.min(target.height/205,target.width/170),pose});return target;}
  function atlas(variant='girl'){const sheet=document.createElement('canvas');sheet.width=SIZE.width*8;sheet.height=SIZE.height*5;const g=sheet.getContext('2d');g.imageSmoothingEnabled=false;['down','right','up','left'].forEach((dir,row)=>{for(let i=0;i<8;i++)g.drawImage(frame(dir,'walk',i,false,variant),i*SIZE.width,row*SIZE.height);});['idle','sit','look','jump','wave','photo','build'].forEach((pose,i)=>g.drawImage(frame('down',pose,0,false,variant),i*SIZE.width,SIZE.height*4));return sheet;}
  const ready=Promise.all(Object.entries(files).map(([variant,path])=>new Promise(resolve=>{const image=new Image();images[variant]=image;image.onload=()=>resolve(true);image.onerror=()=>{errors.push(path);resolve(false);};image.src=window.ISLAND_ASSETS?.[path]||new URL(path,moduleBase).href;}))).then(results=>{if(!results.every(Boolean))return false;try{prepareAnimation();prepared=true;return true;}catch(error){errors.push('角色动画预处理：'+error.message);return false;}});
  const designImage=(variant='girl')=>variant==='boy'?(window.ISLAND_ASSETS?.['assets/companion-design.png']||'assets/companion-design.png'):(window.ISLAND_CHARACTER_ART||'assets/character-design.png');
  window.IslandCharacter={draw,frame,atlas,drawPreview,ready,isReady:()=>prepared,size:SIZE,sourceFiles:files,errors,designImage,name:'拾光旅人 · 小满',description:'让原画里的笑容，真的陪你走进每一片风景。',companionName:'同行旅人 · 阿屿',companionDescription:'把风景装进相机，把温柔留在你身边。',rendering:'reference-atlas',animationVersion:'full-pose-v6',motionRendering:'full-pose-atlas-v6',walkFiles:Object.freeze(Object.fromEntries(Object.entries(files).filter(([key])=>key.includes('-')))),idleFile:files.idle,getAnimationInfo:()=>JSON.parse(JSON.stringify(animationInfo))};
})();
