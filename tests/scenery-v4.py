"""Real canvas motion/mask checks. The timings are CPU submission, not device FPS."""
import base64
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width':1536,'height':1024})
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:4173')
    page.wait_for_load_state('networkidle')
    if not page.evaluate('!!window.IslandScenery'):
        page.add_script_tag(url='http://127.0.0.1:4173/src/scenery.js')
    result = page.evaluate('''async () => {
      const images={};for(const [id,file] of [['home','island'],['forest','forest'],['coast','coast']]){const image=new Image();image.src='/assets/'+file+'.png';await image.decode();images[id]=image;}
      const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=1024;const ctx=canvas.getContext('2d',{willReadFrequently:true});
      const world={ready:true,regionId:'home',image:images.home,phase:'night',elapsed:1,state:{settings:{reducedMotion:false}}};
      const scenery=new IslandScenery(world),result={};
      const render=(time,waterOnly=false)=>{ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#142435';ctx.fillRect(0,0,1536,1024);ctx.drawImage(world.image,0,0);if(waterOnly){scenery.ensureWater();scenery.drawWater(ctx,time);}else{scenery.draw(ctx,time,'ground');scenery.draw(ctx,time,'air');}return ctx.getImageData(0,0,1536,1024).data;};
      const diff=(a,b,box)=>{let changed=0;const [x,y,w,h]=box;for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const i=(yy*1536+xx)*4;if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>15)changed++;}return changed;};
      for(const id of ['home','forest','coast']){world.regionId=id;world.image=images[id];const a=render(1),b=render(2.2),waterA=render(1,true),waterB=render(2.2,true);const readbacks=scenery.stats.readbacks;
        render(2.2);const picture=canvas.toDataURL('image/png');
        world.state.settings.reducedMotion=true;const stillA=render(8),stillB=render(20);world.state.settings.reducedMotion=false;
        const samples=[];for(let n=0;n<90;n++){const start=performance.now();scenery.draw(ctx,n/60,'ground');scenery.draw(ctx,n/60,'air');samples.push(performance.now()-start);}samples.sort((a,b)=>a-b);
        const waterBox=id==='home'?[326,240,410,660]:id==='forest'?[420,395,195,85]:[310,599,1185,210];
        result[id]={changedPixels:diff(a,b,[0,0,1536,1024]),waterChangedPixels:diff(waterA,waterB,waterBox),bridgeUnchanged:id!=='home'||diff(waterA,waterB,[558,438,165,52])===0,treePetalChange:id==='home'?diff(a,b,[730,190,430,350]):null,reducedMotionChangedPixels:diff(stillA,stillB,[0,0,1536,1024]),readbacksStable:scenery.stats.readbacks===readbacks,cpuDrawMeanMs:samples.reduce((a,b)=>a+b,0)/samples.length,cpuDrawP95Ms:samples[Math.floor(samples.length*.95)],picture};
      }
      world.regionId='home';world.image=images.home;world.elapsed=21;scenery.react({id:'tree',x:966,y:498});result.interactionCrownBirths=scenery.gustBirths.length;result.interactionParticles=scenery.events.length;
      world.state.settings.reducedMotion=true;const count=scenery.events.length,gustCount=scenery.gustBirths.length;scenery.react({id:'tree',x:966,y:498});scenery.step({x:966,y:498});result.reducedMotionSuppressesNewParticles=scenery.events.length===count&&scenery.gustBirths.length===gustCount;
      result.cacheCount=scenery.waterCaches.size;return result;
    }''')
    for region in ['home','forest','coast']:
        item = result[region]
        (ROOT / f'output/scenery-{region}-v4.png').write_bytes(base64.b64decode(item.pop('picture').split(',')[1]))
        assert item['changedPixels'] > 1000, item
        assert item['waterChangedPixels'] > 150, item
        assert item['bridgeUnchanged'], item
        assert item['reducedMotionChangedPixels'] == 0, item
        assert item['readbacksStable'], item
    assert result['interactionCrownBirths'] == 18 and result['interactionParticles'] == 0
    assert result['reducedMotionSuppressesNewParticles']
    assert result['cacheCount'] == 3
    assert not errors, errors
    browser.close()
result['browserErrors'] = errors
(ROOT / 'output/scenery-v4-report.json').write_text(json.dumps(result,indent=2), encoding='utf-8')
print(json.dumps(result))
