"""The new lake uses its own water outline; the wood dock and lily pads remain still."""
import base64,json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1536,'height':1024})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:4173');page.wait_for_load_state('networkidle')
    result=page.evaluate('''async()=>{
      const region=ISLAND_REGIONS.find(r=>r.id==='lake'),image=new Image();image.src=region.art;await image.decode();
      const world={ready:true,regionId:'lake',region,image,phase:'night',elapsed:0,state:{settings:{reducedMotion:false}}},scene=new IslandScenery(world),canvas=document.createElement('canvas');canvas.width=1536;canvas.height=1024;const c=canvas.getContext('2d',{willReadFrequently:true});
      const draw=t=>{c.fillStyle='#142536';c.fillRect(0,0,1536,1024);c.drawImage(image,0,0);scene.ensureWater();scene.drawWater(c,t);return c.getImageData(0,0,1536,1024).data;};
      const a=draw(1),b=draw(3),diff=([x,y,w,h])=>{let n=0;for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){let p=(yy*1536+xx)*4;if(Math.abs(a[p]-b[p])+Math.abs(a[p+1]-b[p+1])+Math.abs(a[p+2]-b[p+2])>10)n++;}return n;};
      draw(3);scene.draw(c,3,'ground');scene.draw(c,3,'air');const picture=canvas.toDataURL('image/png');
      const reads=scene.stats.readbacks;for(let t=3;t<4;t+=.016)scene.draw(c,t,'ground');
      return {waterChangedPixels:diff([545,350,458,186]),dockChangedPixels:diff([914,477,111,47]),lilyChangedPixels:diff([663,381,14,10]),lilyPadChangedPixels:diff([634,393,9,7]),landChangedPixels:diff([1100,460,200,100]),waterAccurate:scene.water.accurate,readbacksStable:reads===scene.stats.readbacks,fireflyPoints:region.fireflyPoints.length,picture};
    }''')
    (ROOT/'output/lake-living-v5.png').write_bytes(base64.b64decode(result.pop('picture').split(',')[1]))
    assert result['waterChangedPixels']>500,result
    assert result['dockChangedPixels']==0 and result['landChangedPixels']==0,result
    assert result['lilyChangedPixels']==0 and result['lilyPadChangedPixels']==0,result
    assert result['waterAccurate'] and result['readbacksStable'] and result['fireflyPoints']>=7,result
    assert not errors,errors
    browser.close()
result['browserErrors']=errors
(ROOT/'output/lake-scenery-v5-report.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result))
