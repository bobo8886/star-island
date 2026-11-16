/* Original, self-contained letter stationery. No network assets, editor chrome,
 * or hidden HTML are included in the PNGs. Preview and download share one Blob. */
(() => {
  'use strict';
  const l10n=window.IslandI18n?.t||((text)=>text);
  const THEMES=Object.freeze([
    Object.freeze({id:'petal',name:l10n("樱花来信"),color:'#cf8798',description:l10n("奶油信纸、轻盈花瓣与一枚温柔的蜡封。")}),
    Object.freeze({id:'starlight',name:l10n("寄给星月"),color:'#b7a3e2',description:l10n("在深蓝夜色里，把心事交给月亮和金色星光。")}),
    Object.freeze({id:'meadow',name:l10n("风里的心愿"),color:'#8cab92',description:l10n("鼠尾草绿、细叶与蝴蝶，收藏一封会呼吸的信。")})
  ]);
  const PALETTES={
    petal:{paper:'#fff9f0',paper2:'#f9ece8',ink:'#5b4248',muted:'#997c7c',accent:'#bc7289',light:'#efc4ca',line:'#dbb6b7',leaf:'#9da68c',seal:'#ba6d83'},
    starlight:{paper:'#192840',paper2:'#263451',ink:'#efe8dc',muted:'#b9b4cd',accent:'#e3c99a',light:'#b7a5da',line:'#796e97',leaf:'#aab4d5',seal:'#8d7fb5'},
    meadow:{paper:'#f6f7ec',paper2:'#e8efdf',ink:'#42594e',muted:'#7d9181',accent:'#7d9e84',light:'#c1d1b3',line:'#b6c8ae',leaf:'#7c9b80',seal:'#789d84'}
  };
  const FONT='"Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif';
  const HAND=window.IslandI18n?.locale==='en'?'Georgia,serif':'"KaiTi","STKaiti","Kaiti SC","SimSun",serif';
  const BODY_SIZE=34,LINE_HEIGHT=58,MARGIN=132,CONTENT_WIDTH=1080-MARGIN*2;
  const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter('zh',{granularity:'grapheme'}):null;
  const ornamentCache=new Map();
  const limit=(text,max)=>Array.from(text).slice(0,max).join('');
  function clean(value,max,multiline=false){
    if(typeof value!=='string')return '';
    let text=value.replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').replace(/\t/g,'    ');
    // normalize is also used on every editor keystroke: preserve a trailing
    // space so typing "Jane Doe" is possible before the next letter arrives.
    if(!multiline)text=text.replace(/\s+/g,' ');return limit(text,max);
  }
  function normalize(raw={}){
    const source=raw&&typeof raw==='object'?raw:{};
    return {to:clean(source.to,60),from:clean(source.from,60),title:clean(source.title,80),date:clean(source.date,40),body:clean(source.body,6000,true),theme:THEMES.some(t=>t.id===source.theme)?source.theme:'petal'};
  }
  function canvas(width,height){const c=document.createElement('canvas');c.width=Math.ceil(width);c.height=Math.ceil(height);return c;}
  function graphemes(text){return segmenter?Array.from(segmenter.segment(text),part=>part.segment):Array.from(text);}
  function wrap(ctx,text,width){
    const rows=[];
    for(const paragraph of text.split('\n')){
      let line='';
      for(const char of graphemes(paragraph)){
        if(!line||ctx.measureText(line+char).width<=width){line+=char;continue;}
        const space=line.lastIndexOf(' ');
        if(space>line.length*.4){rows.push(line.slice(0,space+1));line=line.slice(space+1)+char;}
        else{rows.push(line);line=char;}
      }
      rows.push(line);
    }
    return rows;
  }
  function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
  function heart(ctx,x,y,size,color){ctx.save();ctx.translate(x,y);ctx.scale(size,size);ctx.beginPath();ctx.moveTo(0,.45);ctx.bezierCurveTo(-1,-.2,-.65,-1,0,-.42);ctx.bezierCurveTo(.65,-1,1,-.2,0,.45);ctx.fillStyle=color;ctx.fill();ctx.restore();}
  function star(ctx,x,y,r,color,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4-Math.PI/2,rr=i%2?r*.27:r;i?ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr):ctx.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}ctx.closePath();ctx.fill();ctx.restore();}
  function petal(ctx,x,y,size,angle,color){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,size*.65);ctx.bezierCurveTo(-size*.8,0,-size*.6,-size*.7,0,-size*.45);ctx.bezierCurveTo(size*.6,-size*.7,size*.8,0,0,size*.65);ctx.fill();ctx.restore();}
  function flower(ctx,x,y,r,p){
    ctx.save();for(let i=0;i<5;i++){const a=i*Math.PI*2/5;petal(ctx,x+Math.sin(a)*r*.38,y+Math.cos(a)*r*.38,r*.7,-a,p.light);}ctx.fillStyle=p.accent;ctx.beginPath();ctx.arc(x,y,r*.17,0,Math.PI*2);ctx.fill();
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.fillStyle='#e8c78f';ctx.beginPath();ctx.arc(x+Math.sin(a)*r*.24,y+Math.cos(a)*r*.24,1.4,0,Math.PI*2);ctx.fill();}ctx.restore();
  }
  function leaf(ctx,x,y,size,angle,p){
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle=p.leaf;ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(-size*.65,-size*.5,-size*.42,-size,0,-size);ctx.bezierCurveTo(size*.44,-size*.6,size*.36,-size*.1,0,0);ctx.fill();ctx.strokeStyle=p.paper;ctx.globalAlpha=.55;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-2);ctx.lineTo(0,-size*.82);ctx.stroke();ctx.restore();
  }
  function branch(ctx,x,y,scale,p,floral=false){
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.strokeStyle=p.leaf;ctx.lineWidth=2.1;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,145);ctx.bezierCurveTo(18,105,-10,48,24,4);ctx.stroke();
    for(let i=0;i<6;i++){const yy=18+i*21,xx=12-Math.sin(i)*8;leaf(ctx,xx,yy+25,23+i%2*8,(i%2?1:-1)*.75,p);if(floral&&i%2===0)flower(ctx,xx+(i%4?24:-23),yy+12,15,p);}
    ctx.restore();
  }
  function butterfly(ctx,x,y,size,p){
    ctx.save();ctx.translate(x,y);ctx.rotate(-.2);ctx.fillStyle=p.light;
    for(const side of [-1,1]){ctx.save();ctx.scale(side,1);ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(size*.25,-size*.8,size*1.1,-size*.65,size*.82,-size*.04);ctx.bezierCurveTo(size*1.1,size*.55,size*.1,size*.55,0,0);ctx.fill();ctx.restore();}
    ctx.strokeStyle=p.accent;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-size*.18);ctx.lineTo(0,size*.3);ctx.moveTo(0,-size*.18);ctx.quadraticCurveTo(-size*.1,-size*.45,-size*.27,-size*.46);ctx.moveTo(0,-size*.18);ctx.quadraticCurveTo(size*.1,-size*.45,size*.27,-size*.46);ctx.stroke();ctx.restore();
  }
  function seal(ctx,x,y,r,p){
    ctx.save();ctx.translate(x,y);ctx.fillStyle='#1c233414';ctx.beginPath();ctx.ellipse(3,r*.82,r*1.04,r*.28,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();for(let i=0;i<36;i++){const a=i*Math.PI*2/36,rr=r*(1+.045*Math.sin(i*3.7));i?ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):ctx.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}ctx.closePath();ctx.fillStyle=p.seal;ctx.fill();
    ctx.strokeStyle=p.light;ctx.lineWidth=1.8;ctx.globalAlpha=.7;ctx.beginPath();ctx.arc(0,0,r*.74,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;heart(ctx,0,2,r*.4,p.paper);ctx.restore();
  }
  function envelope(ctx,x,y,scale,p){
    ctx.save();ctx.translate(x,y);ctx.rotate(-.1);ctx.scale(scale,scale);ctx.fillStyle=p.paper2;ctx.strokeStyle=p.line;ctx.lineWidth=1.7;rounded(ctx,-80,-50,160,100,6);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(-77,46);ctx.lineTo(-13,-2);ctx.moveTo(77,46);ctx.lineTo(13,-2);ctx.stroke();ctx.beginPath();ctx.moveTo(-78,-47);ctx.lineTo(0,13);ctx.lineTo(78,-47);ctx.stroke();seal(ctx,0,14,17,p);ctx.restore();
  }
  function ornament(theme,where){
    const key=theme+'/'+where;if(ornamentCache.has(key))return ornamentCache.get(key);
    const c=canvas(1080,300),g=c.getContext('2d'),p=PALETTES[theme];
    if(where==='top'){
      if(theme==='starlight'){
        for(let i=0;i<35;i++){const x=44+(i*193)%994,y=25+(i*71)%160;star(g,x,y,i%4===0?5:2,p.accent,.25+(i%5)*.12);}
        g.save();g.translate(170,104);g.rotate(-.28);g.fillStyle=p.accent;g.beginPath();g.arc(0,0,45,0,Math.PI*2);g.fill();g.globalCompositeOperation='destination-out';g.beginPath();g.arc(20,-13,40,0,Math.PI*2);g.fill();g.restore();
        g.strokeStyle=p.line;g.globalAlpha=.65;g.lineWidth=1.2;g.beginPath();[[350,77],[418,49],[483,103],[572,65],[651,113]].forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();g.globalAlpha=1;[[350,77],[418,49],[483,103],[572,65],[651,113]].forEach(([x,y])=>star(g,x,y,5,p.accent,.8));
      }else{
        branch(g,78,40,1.2,p,theme==='petal');branch(g,235,10,.6,p,theme==='petal');
        if(theme==='petal')for(let i=0;i<10;i++)petal(g,170+i*55,35+(i*37)%100,5+i%3,(i-.4)*.8,p.light);
        else{butterfly(g,410,96,24,p);branch(g,565,30,.6,p,false);}
      }
      envelope(g,887,113,1,p);
      g.strokeStyle=p.line;g.lineWidth=1.2;g.setLineDash([3,6]);rounded(g,961,56,62,78,3);g.stroke();g.setLineDash([]);
      if(theme==='starlight')star(g,992,95,17,p.accent,.8);else if(theme==='petal')flower(g,992,96,19,p);else leaf(g,991,112,32,.2,p);
      g.strokeStyle=p.line;g.lineWidth=1;for(let i=0;i<3;i++){g.beginPath();g.moveTo(807,35+i*6);g.bezierCurveTo(837,20+i*6,850,45+i*6,878,30+i*6);g.stroke();}
    }else{
      branch(g,900,88,.9,p,theme==='petal');branch(g,1003,95,.7,p,theme==='petal');
      if(theme==='starlight')for(let i=0;i<13;i++)star(g,795+i*16,90+(i*31)%118,i%3?2:5,p.accent,.55);
      else if(theme==='meadow'){butterfly(g,882,72,21,p);butterfly(g,971,38,13,p);}
      else for(let i=0;i<9;i++)petal(g,750+i*28,90+(i*27)%97,5+i%4,i*.7,p.light);
      g.strokeStyle=p.line;g.globalAlpha=.6;g.lineWidth=1;g.beginPath();g.moveTo(132,240);g.lineTo(455,240);g.moveTo(625,240);g.lineTo(948,240);g.stroke();g.globalAlpha=1;
    }
    ornamentCache.set(key,c);return c;
  }
  function paper(ctx,height,theme,index){
    const p=PALETTES[theme],base=ctx.createLinearGradient(0,0,1080,height);base.addColorStop(0,p.paper);base.addColorStop(1,p.paper2);ctx.fillStyle=base;ctx.fillRect(0,0,1080,height);
    const bloom=ctx.createRadialGradient(70,130,10,70,130,640);bloom.addColorStop(0,theme==='starlight'?'#9081bf1b':'#ecc3b522');bloom.addColorStop(1,'#ffffff00');ctx.fillStyle=bloom;ctx.fillRect(0,0,1080,Math.min(height,950));
    let seed=7919+index*157;ctx.fillStyle=theme==='starlight'?'#d9d4df0a':'#8b78630b';for(let i=0;i<Math.ceil(height*.8);i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%1080;seed=(Math.imul(seed,1664525)+1013904223)>>>0;ctx.fillRect(x,seed%Math.ceil(height),1,1);}
    ctx.strokeStyle=p.line;ctx.lineWidth=1.3;ctx.globalAlpha=.7;rounded(ctx,43,43,994,height-86,16);ctx.stroke();ctx.globalAlpha=.38;rounded(ctx,53,53,974,height-106,12);ctx.stroke();ctx.globalAlpha=1;
    ctx.drawImage(ornament(theme,'top'),0,0);ctx.drawImage(ornament(theme,'bottom'),0,height-300);
  }
  function plain(d){return [d.to?(l10n("致 ")+d.to):'',d.title,d.date,d.body,d.from?('—— '+d.from):''].filter(part=>part!=='').join('\n\n');}
  async function render(raw,options={}){
    if(document.fonts?.ready)await document.fonts.ready;
    const draft=normalize(raw),width=Math.round(Math.max(320,Math.min(2160,Number(options.width)||1080))),scale=width/1080;
    const maxHeight=Math.floor(Math.min(3600,Number(options.maxHeight)||3600));
    if(maxHeight<1000*scale)throw new RangeError(l10n("信纸高度至少需要 ")+Math.ceil(1000*scale)+l10n(" 像素。"));
    const maxLogical=Math.floor(maxHeight/scale),measure=canvas(1,1).getContext('2d'),p=PALETTES[draft.theme];
    let titleSize=64;measure.font=titleSize+'px '+HAND;
    if(graphemes(draft.title).length<=17)while(titleSize>46&&measure.measureText(draft.title).width>CONTENT_WIDTH){titleSize--;measure.font=titleSize+'px '+HAND;}
    const titleWidth=measure.measureText(draft.title).width,titleCount=Math.max(1,Math.ceil(titleWidth/CONTENT_WIDTH));
    const titleRows=draft.title?wrap(measure,draft.title,Math.min(CONTENT_WIDTH,titleWidth/titleCount+titleSize*.2)):[],titleLine=titleSize*1.28;
    measure.font='600 32px '+FONT;const toRows=draft.to?wrap(measure,l10n("致 ")+draft.to,CONTENT_WIDTH):[];
    measure.font='38px '+HAND;const fromRows=draft.from?wrap(measure,draft.from,480):[];
    measure.font=BODY_SIZE+'px '+FONT;const bodyRows=draft.body===''?[]:wrap(measure,draft.body,CONTENT_WIDTH);
    const header=260+(titleRows.length?titleRows.length*titleLine+52:0)+(toRows.length?toRows.length*50+36:0);
    const footer=208+fromRows.length*48,plans=[];let offset=0;
    do{
      const start=plans.length?240:header,capacity=Math.floor((maxLogical-start-footer)/LINE_HEIGHT);
      if(capacity<1)throw new RangeError(l10n("这封信的抬头较长，请使用更高的信纸。"));
      const rows=bodyRows.slice(offset,offset+capacity);offset+=rows.length;
      const height=Math.min(maxLogical,Math.max(1440,start+rows.length*LINE_HEIGHT+footer));plans.push({start,rows,height});
      if(plans.length>40)throw new RangeError(l10n("分页数量过多，请提高信纸的最大高度。"));
    }while(offset<bodyRows.length);
    const pages=[],urls=[];
    try{
      for(let i=0;i<plans.length;i++){
        const plan=plans[i],height=Math.min(maxHeight,Math.ceil(plan.height*scale)),c=canvas(width,height),g=c.getContext('2d');g.scale(scale,scale);paper(g,plan.height,draft.theme,i);
        g.textBaseline='alphabetic';
        if(i===0){
          if(draft.date){g.font='23px '+FONT;g.textAlign='right';g.fillStyle=p.muted;const dateRows=wrap(g,draft.date,CONTENT_WIDTH);dateRows.forEach((row,j)=>g.fillText(row,948,206+j*31));}
          let y=260;
          if(titleRows.length){g.font=titleSize+'px '+HAND;g.textAlign='center';g.fillStyle=p.ink;titleRows.forEach(row=>{g.fillText(row,540,y+titleSize*.95);y+=titleLine;});g.strokeStyle=p.line;g.lineWidth=1.5;g.beginPath();g.moveTo(492,y+19);g.lineTo(588,y+19);g.stroke();heart(g,540,y+20,5,p.accent);y+=52;}
          if(toRows.length){g.font='600 32px '+FONT;g.textAlign='left';g.fillStyle=p.accent;toRows.forEach(row=>{g.fillText(row,MARGIN,y+34);y+=50;});}
        }else{
          g.fillStyle=p.accent;g.globalAlpha=.65;star(g,540,197,8,p.accent);g.globalAlpha=1;
        }
        g.font=BODY_SIZE+'px '+FONT;g.textAlign='left';g.fillStyle=p.ink;
        plan.rows.forEach((row,j)=>g.fillText(row,MARGIN,plan.start+BODY_SIZE+j*LINE_HEIGHT));
        if(i===plans.length-1){
          const bodyEnd=plan.start+plan.rows.length*LINE_HEIGHT;
          const signatureTop=Math.max(bodyEnd+72,plan.height-180-fromRows.length*48);
          if(fromRows.length){g.textAlign='right';g.font='38px '+HAND;g.fillStyle=p.ink;fromRows.forEach((row,j)=>g.fillText(row,848,signatureTop+38+j*48));}
          seal(g,174,plan.height-166,31,p);g.strokeStyle=p.line;g.lineWidth=1.2;g.beginPath();g.moveTo(209,plan.height-166);g.bezierCurveTo(240,plan.height-187,269,plan.height-145,300,plan.height-167);g.stroke();
        }
        g.font='22px '+FONT;g.textAlign='center';g.fillStyle=p.muted;g.fillText((i+1)+' / '+plans.length,540,plan.height-54);
        const blob=await new Promise((resolve,reject)=>c.toBlob(result=>result?resolve(result):reject(new Error(l10n("PNG 信纸生成失败，请稍后重试。"))),'image/png'));
        const url=URL.createObjectURL(blob);urls.push(url);pages.push(Object.freeze({canvas:c,blob,url,width:c.width,height:c.height,index:i+1,total:plans.length,bodyLines:Object.freeze([...plan.rows])}));
        // Yield after each encoded page; typing or a close action can invalidate
        // the UI request while a long letter is being rendered.
        if(i+1<plans.length)await new Promise(resolve=>setTimeout(resolve,0));
      }
    }catch(error){urls.forEach(url=>URL.revokeObjectURL(url));throw error;}
    let disposed=false;
    return {pages:Object.freeze(pages),plainText:plain(draft),dispose(){if(disposed)return;disposed=true;urls.forEach(url=>URL.revokeObjectURL(url));}};
  }
  window.IslandLetterArt=Object.freeze({themes:THEMES,normalize,render});
})();
