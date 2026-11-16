"""Check actual atlas-backed frames, direction changes, and world/portrait consistency."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':1000})
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto('http://127.0.0.1:4173/assets/characters-preview.html')
    page.wait_for_function('IslandCharacter.isReady()')
    result=page.evaluate('''() => {
      const result={rendering:IslandCharacter.rendering,size:IslandCharacter.size,variants:{}};
      for(const variant of ['girl','boy']){
        let count=0,empty=0,border=0,partialAlpha=0,redMatte=0;const colors=new Set(),walkHashes={};
        for(const direction of ['down','right','up','left'])for(const pose of ['idle','walk','sit','look','jump','wave','photo','build'])for(let frame=0;frame<(pose==='walk'?8:2);frame++){
          const c=IslandCharacter.frame(direction,pose,frame,false,variant),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let pixels=0,hash=0;
          for(let i=0;i<d.length;i+=4){if(d[i+3]){pixels++;colors.add([d[i],d[i+1],d[i+2]].join(','));const n=i/4,x=n%c.width,y=Math.floor(n/c.width);if(x===0||x===c.width-1||y===0||y===c.height-1)border++;if(d[i+3]!==255)partialAlpha++;if(d[i]>180&&d[i+1]<55&&d[i+2]<55)redMatte++;hash=(hash+d[i]*3+d[i+1]*5+d[i+2]*7+n)>>>0;}}
          if(!pixels)empty++;if(pose==='walk')(walkHashes[direction]??=new Set()).add(hash);count++;
        }
        result.variants[variant]={count,empty,border,partialAlpha,redMatte,colors:colors.size,distinctWalkFrames:Object.fromEntries(Object.entries(walkHashes).map(([k,v])=>[k,v.size]))};
      }return result;
    }''')
    assert result['rendering']=='reference-atlas'
    assert result['size']['width']==160 and result['size']['height']==192
    for variant in result['variants'].values():
        assert variant['count']==88
        assert variant['empty']==variant['border']==variant['partialAlpha']==variant['redMatte']==0,variant
        assert variant['colors']>500,variant
        assert all(v>=2 for v in variant['distinctWalkFrames'].values())
    page.evaluate('''() => {for(const variant of ['girl','boy']){const a=IslandCharacter.atlas(variant),p=document.getElementById(variant);p.width=a.width;p.height=a.height;p.getContext('2d').drawImage(a,0,0);}}''')
    page.screenshot(path=str(ROOT/'output/characters-v4-contact.png'))
    page.goto('http://127.0.0.1:4173/?art=v4')
    page.wait_for_function('window.starIsland && starIsland.snapshot().world.ready')
    page.locator('#start-button').click();page.locator('#dialogue-next').click()
    page.locator('#character-button').click();page.locator('[data-companion="boy"]').click();page.locator('#character-back').click()
    page.wait_for_timeout(1800)
    page.screenshot(path=str(ROOT/'output/characters-v4-world.png'))
    assert page.evaluate('IslandCharacter.isReady() && IslandCharacter.rendering === "reference-atlas"')
    page.locator('#character-button').click();page.wait_for_timeout(300)
    page.screenshot(path=str(ROOT/'output/characters-v4-portrait.png'))
    assert not errors,errors
    result['browserErrors']=errors
    (ROOT/'output/character-v4-report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result));browser.close()
