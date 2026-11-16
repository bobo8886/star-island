"""Cherry petals start in the crown, descend, settle, and fade without teleporting."""
import base64,json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:4173');page.wait_for_load_state('networkidle')
    if not page.evaluate('!!window.IslandScenery'):page.add_script_tag(url='/src/scenery.js')
    result=page.evaluate('''async()=>{
      const image=new Image();image.src='/assets/island.png';await image.decode();
      const world={image,ready:true,regionId:'home',region:{},phase:'night',elapsed:0,state:{settings:{reducedMotion:false}}};
      const scene=new IslandScenery(world),canvas=document.createElement('canvas');canvas.width=600;canvas.height=470;const g=canvas.getContext('2d');
      const render=t=>{world.elapsed=t;g.setTransform(1,0,0,1,0,0);g.fillStyle='#152537';g.fillRect(0,0,600,470);g.translate(-660,-125);g.drawImage(image,0,0);scene.draw(g,t,'ground');scene.draw(g,t,'air');return canvas.toDataURL('image/png');};
      render(0);const first=scene.petals[0];const points=[];for(let t=0;t<first.flight+first.hold+first.fade+1;t+=.1)points.push({t,...scene.samplePetal(first,t)});
      const oneSecond=render(1);const young=scene.petals.map(p=>({rise:scene.samplePetal(p,scene.petalTime).y-p.originY,age:scene.petalTime-p.born}));
      const pictures={};for(const t of [4,8,12,16])pictures[t]=render(t);
      const beforeShot=JSON.stringify(scene.petals),clockBefore=scene.petalTime;render(16);const captureStable=beforeShot===JSON.stringify(scene.petals)&&clockBefore===scene.petalTime;
      scene.react({id:'tree',x:966,y:498});const gustQueued=scene.gustBirths.length,upwardEvents=scene.events.length;render(17);render(18.5);pictures.gust=render(21);
      const gusts=scene.petals.filter(p=>p.gust).map(p=>({x:p.originX,y:p.originY,groundY:p.groundY,born:p.born,flight:p.flight}));
      world.state.settings.reducedMotion=true;const frozen=scene.petalTime;const stillA=render(22),stillB=render(26);scene.react({id:'tree',x:966,y:498});const reducedStill=stillA===stillB&&scene.petalTime===frozen;world.state.settings.reducedMotion=false;
      world.regionId='lake';world.region={};render(30);const unknownSafe=scene.petals.length===0&&scene.events.length===0;
      world.regionId='home';render(31);const freshVisit=scene.petals.every(p=>scene.samplePetal(p,scene.petalTime).y===p.originY);
      return{first,points,young,pictures,oneSecond,captureStable,gustQueued,upwardEvents,gusts,reducedStill,unknownSafe,freshVisit};
    }''')
    first=result.pop('first');points=result.pop('points');pictures=result.pop('pictures');pictures['birth']=result.pop('oneSecond')
    for name,data in pictures.items():(ROOT/f'output/petals-v5-{name}.png').write_bytes(base64.b64decode(data.split(',')[1]))
    falling=[p for p in points if p['phase']=='fall'];held=[p for p in points if p['phase']=='hold'];fading=[p for p in points if p['phase']=='fade']
    assert 700<first['originX']<1160 and 150<first['originY']<375
    assert all(b['y']>=a['y'] for a,b in zip(falling,falling[1:]))
    assert len(held)>=19 and all(abs(p['y']-first['groundY'])<.0001 for p in held)
    assert all(abs(p['x']-held[0]['x'])<.0001 for p in held)
    assert all(b['alpha']<=a['alpha'] for a,b in zip(fading,fading[1:])) and points[-1]['phase']=='dead'
    assert all(0<=p['rise']<45 for p in result['young'])
    assert result['captureStable'] and result['reducedStill'] and result['unknownSafe'] and result['freshVisit']
    assert result['gustQueued']==18 and result['upwardEvents']==0 and len(result['gusts'])==18
    assert all(700<p['x']<1160 and 150<p['y']<375 and p['groundY']>p['y'] for p in result['gusts'])
    assert not errors,errors
    browser.close()
result.update({'flightSeconds':first['flight'],'groundHoldSeconds':first['hold'],'fadeSeconds':first['fade'],'sampledTrajectory':{'start':[first['originX'],first['originY']],'ground':[held[0]['x'],held[0]['y']],'monotonicDescent':True,'stableGroundHold':True},'browserErrors':errors})
(ROOT/'output/petals-v5-report.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result))
