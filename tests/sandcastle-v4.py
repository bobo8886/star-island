"""Actual raster model, alpha isolation, stable anchoring and dynamic/reduced-motion checks."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1280,'height':570})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:4173/assets/sandcastle-preview.html')
    page.wait_for_function('window.IslandSandcastle && IslandSandcastle.loaded')
    result=page.evaluate('''() => {
      const model=IslandSandcastle,frames=[];
      for(let stage=0;stage<4;stage++){
        const c=model.frame(stage),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
        let count=0,left=c.width,right=0,top=c.height,bottom=0,edge=0,partialAlpha=0;
        for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const a=d[(y*c.width+x)*4+3];if(a){count++;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);if(!x||!y||x===c.width-1||y===c.height-1)edge++;if(a!==255)partialAlpha++;}}
        frames.push({stage,width:c.width,height:c.height,pixels:count,bounds:[left,top,right,bottom],edge,partialAlpha});
      }
      function render(time,reducedMotion){const c=document.createElement('canvas');c.width=300;c.height=260;model.draw(c.getContext('2d'),{x:150,y:225,stage:3,time,reducedMotion,active:true,scale:.4});return c.getContext('2d').getImageData(0,0,c.width,c.height).data;}
      const a=render(.3,false),b=render(1.6,false),c=render(.3,true),d=render(1.6,true);let animatedDiff=0,reducedDiff=0;
      for(let i=0;i<a.length;i++){if(a[i]!==b[i])animatedDiff++;if(c[i]!==d[i])reducedDiff++;}
      return {frames,cleanedPixels:model.cleanedPixels,animatedDiff,reducedDiff,error:model.error};
    }''')
    for frame in result['frames']:
        assert frame['pixels']>20000
        assert frame['edge']==0
        assert frame['partialAlpha']==0
        assert frame['bounds'][3] in range(555,561),frame
    assert result['frames'][3]['bounds'][1] < result['frames'][2]['bounds'][1] < result['frames'][1]['bounds'][1]
    assert result['animatedDiff']>300
    assert result['reducedDiff']==0
    assert result['cleanedPixels']>0
    page.wait_for_timeout(100)
    page.screenshot(path=str(ROOT/'output/sandcastle-v4-review.png'))
    assert not errors,errors
    result['browserErrors']=errors
    (ROOT/'output/sandcastle-v4-report.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps(result));browser.close()
