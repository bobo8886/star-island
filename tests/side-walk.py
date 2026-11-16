"""A walk changes the boots while preserving head proportions and clean alpha.

Natural head/body sway is allowed; exact upper-body pixel equality is not a
biological requirement. tests/gait-contact.py separately verifies limb joints
and grounded soles, which changing frame hashes alone cannot establish.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1480,'height':950})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:4173/assets/characters-preview.html')
    page.wait_for_function('IslandCharacter.isReady()')
    report=page.evaluate('''() => {
      const output={};const raw=c=>c.getContext('2d').getImageData(0,0,160,192).data;
      const hash=(d,lo,hi)=>{let h=2166136261;for(let i=lo*160*4;i<hi*160*4;i++)h=Math.imul(h^d[i],16777619)>>>0;return h;};
      for(const v of ['girl','boy'])for(const dir of ['right','left']){
        const frames=Array.from({length:8},(_,i)=>raw(IslandCharacter.frame(dir,'walk',i,false,v))),idle=raw(IslandCharacter.frame(dir,'idle',0,false,v));
        let upperDifference=0,partial=0,border=0;const widths=[],counts=[],headCenters=[];
        for(const d of frames){let min=160,max=0,count=0;for(let y=0;y<192;y++)for(let x=0;x<160;x++){const i=(y*160+x)*4;if(y<120)for(let k=0;k<4;k++)if(d[i+k]!==idle[i+k])upperDifference++;if(d[i+3]&&d[i+3]!==255)partial++;if(d[i+3]&&(x===0||x===159||y===0||y===191))border++;if(y>=160&&d[i+3]){min=Math.min(min,x);max=Math.max(max,x);count++;}}widths.push(max-min);counts.push(count);}
        for(const d of frames){let n=0,sx=0,sy=0;for(let y=0;y<90;y++)for(let x=0;x<160;x++)if(d[(y*160+x)*4+3]){n++;sx+=x;sy+=y;}headCenters.push({x:sx/n,y:sy/n,pixels:n});}
        const headCenterSpan=Math.max(...headCenters.map(a=>Math.max(...headCenters.map(b=>Math.hypot(a.x-b.x,a.y-b.y))))),headAreaRatio=Math.max(...headCenters.map(p=>p.pixels))/Math.min(...headCenters.map(p=>p.pixels));
        let oppositeDifference=0;for(let i=150*160*4;i<190*160*4;i++)if(frames[2][i]!==frames[6][i])oppositeDifference++;
        const drawHeads=new Set();for(let i=0;i<8;i++){const c=document.createElement('canvas');c.width=160;c.height=192;IslandCharacter.draw(c.getContext('2d'),{x:80,y:184,direction:dir,walk:i/1.25+.001},{variant:v,time:i*.8,phase:'day',scale:1,shadow:false});drawHeads.add(hash(raw(c),0,120));}
        output[v+'/'+dir]={upperDifference,drawHeadFrames:drawHeads.size,headCenterSpan,headAreaRatio,partial,border,footFrames:new Set(frames.map(d=>hash(d,150,190))).size,oppositeDifference,footWidths:widths,minFootPixels:Math.min(...counts),idleFootPixels:(()=>{let n=0;for(let i=150*160*4+3;i<190*160*4;i+=4)if(idle[i])n++;return n;})()};
      }
      document.body.style='margin:0;padding:15px;background:#22364a';document.body.insertAdjacentHTML('afterbegin','<canvas id="sheet" width="1440" height="860"></canvas>');
      const c=document.getElementById('sheet'),g=c.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#22364a';g.fillRect(0,0,c.width,c.height);
      let row=0;for(const v of ['girl','boy'])for(const dir of ['right','left']){for(let i=0;i<9;i++){g.drawImage(IslandCharacter.frame(dir,i===8?'idle':'walk',i,false,v),i*160,row*215+18);g.fillStyle='#f4dfba';g.font='12px sans-serif';g.fillText(i===8?v+' / '+dir+' / REST':'STEP '+i,i*160+35,row*215+14);g.fillStyle='#bbd2db55';g.fillRect(i*160+25,row*215+203,110,1);}row++;}
      return output;
    }''')
    for name, item in report.items():
        assert item['partial']==item['border']==0,(name,item)
        assert item['headCenterSpan']<=5 and item['headAreaRatio']<=1.1,(name,item)
        assert item['footFrames']==8,(name,item)
        assert item['oppositeDifference']>400,(name,item)
        assert max(item['footWidths'])-min(item['footWidths'])>=15,(name,item)
        assert item['minFootPixels']>100 and item['idleFootPixels']>100,(name,item)
    page.screenshot(path=str(ROOT/'output/side-walk-frames.png'))
    assert not errors,errors
    result={'variants':report,'browserErrors':errors}
    (ROOT/'output/side-walk-report.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps(result));browser.close()
