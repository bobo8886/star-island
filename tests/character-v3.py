"""Render every character frame and exercise both new and backwards-compatible APIs."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':1120},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:4173/assets/characters-preview.html')
    page.wait_for_load_state('networkidle')
    result=page.evaluate('''() => {
      const result={};
      for(const variant of ['girl','boy']){
        const colors=new Set(); let frames=0, antialiasedPixels=0, emptyFrames=0, topEdgePixels=0;
        for(const direction of ['down','right','up','left'])for(const pose of ['idle','walk','sit','look','jump','wave','photo','build'])for(let i=0;i<(pose==='walk'?8:2);i++){
          const c=IslandCharacter.frame(direction,pose,i,i%2===1,variant),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let pixels=0;
          for(let j=0;j<d.length;j+=4){if(d[j+3]){pixels++;colors.add(d.slice(j,j+4).join(','));if(j<c.width*4)topEdgePixels++;if(d[j+3]!==255)antialiasedPixels++;}}
          if(!pixels)emptyFrames++;frames++;
          const preview=document.createElement('canvas');preview.width=240;preview.height=300;IslandCharacter.drawPreview(preview,{variant,pose,direction,time:2.3});
        }
        result[variant]={frames,colors:colors.size,antialiasedPixels,emptyFrames,topEdgePixels};
      }
      const original=IslandCharacter.frame();result.originalAPI=original.width===40&&original.height===52;
      return result;
    }''')
    for variant in ['girl','boy']:
        assert result[variant]['frames']==88
        assert result[variant]['antialiasedPixels']==0
        assert result[variant]['emptyFrames']==0
        assert result[variant]['topEdgePixels']==0
    assert result['originalAPI']
    page.locator('[data-pose="wave"]').click();page.wait_for_timeout(250)
    page.screenshot(path=str(ROOT/'assets/characters-v3-review.png'))
    assert not errors,errors
    result['browserErrors']=errors
    (ROOT/'output/character-v3-report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result));browser.close()
