"""Independent deterministic fireworks harness: lifecycle, bounded work, and art.

Uses an ephemeral browser document and fake world; it never reads or writes a
real player's profile. Real-game integration is verified separately by root.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/fireworks-v7'
OUT.mkdir(parents=True,exist_ok=True)
errors=[]
report={}
HTML='''<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;background:#132338;overflow:hidden}canvas{display:block}
.topbar{position:absolute;top:18px;left:24px;right:24px;height:66px;border-bottom:1px solid #ccbd8d40;color:#fff3ce;font:700 25px "Microsoft YaHei";pointer-events:none}
.topbar small{float:right;font:14px "Microsoft YaHei";padding:15px;background:#10283b90;border-radius:12px}
#quest-panel{position:absolute;left:26px;bottom:70px;width:215px;height:210px;background:#112b3cce;border:1px solid #e9c99c45;border-radius:7px;color:#e7d6b9;padding:18px;box-sizing:border-box;font:14px/1.8 "Microsoft YaHei"}
#world-label{position:absolute;top:109px;left:50%;transform:translateX(-50%);height:38px;min-width:272px;padding:7px 13px;box-sizing:border-box;border:1px solid #a2b7cc38;border-radius:30px;background:#102235dc;color:#d0dce0;font:10px/22px "Microsoft YaHei";text-align:center;white-space:nowrap}
#actor-zone{display:none;position:absolute;left:calc(60% - 52px);top:calc(51% - 124px);width:104px;height:140px;box-sizing:border-box;border:1px dashed #ffeeaa88;background:#00152724;color:#ffeeaa88;font:10px "Microsoft YaHei";text-align:center;pointer-events:none}
@media(max-width:620px){.topbar{left:16px;right:16px;height:62px;font-size:18px}.topbar small{font-size:10px;padding:10px}#quest-panel{top:96px;bottom:auto;left:16px;right:16px;width:auto;height:134px;font-size:12px;padding:12px}#world-label{display:none}}
@media(max-height:540px) and (min-width:621px){#quest-panel{left:16px;top:96px;width:210px;height:150px;font-size:11px}.topbar{height:53px;font-size:18px}#world-label{display:none}#actor-zone{display:block}}
</style><canvas id="qa"></canvas><header class="topbar">✦ 星屿寻迹<small>星夜　✧　生日盛典</small></header><section id="quest-panel">星屿手记<br><strong>这座岛，永远为你亮着。</strong><p>五束微光已被珍藏。<br>带着祝福，再去看看风景吧。</p></section><div id="world-label">✧　拾光星屿 · 回忆与灯火停泊的地方</div><div id="actor-zone">人物保护区</div>'''
INIT=r'''async () => {
  window.personalText='生日快乐!';window.IslandPersonalization={text:()=>personalText};
  window.world={width:innerWidth,height:innerHeight,dpr:devicePixelRatio,regionId:'home',started:false,state:{finished:false,settings:{reducedMotion:false}},capturing:false};
  window.fx=new IslandFireworks(world);window.art={};
  for(const [id,file] of Object.entries({home:'island',forest:'forest',coast:'coast',lake:'moonlake'})){
    const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src='http://127.0.0.1:4173/assets/'+file+'.png';});art[id]=image;
  }
  window.advance=seconds=>{for(let elapsed=0;elapsed<seconds-1e-9;elapsed+=1/60)fx.update(Math.min(1/60,seconds-elapsed));};
  window.paint=()=>{const canvas=document.getElementById('qa');canvas.width=Math.round(world.width*world.dpr);canvas.height=Math.round(world.height*world.dpr);canvas.style.width=world.width+'px';canvas.style.height=world.height+'px';const c=canvas.getContext('2d',{willReadFrequently:true});c.setTransform(world.dpr,0,0,world.dpr,0,0);const g=c.createLinearGradient(0,0,0,world.height);g.addColorStop(0,'#0b1528');g.addColorStop(1,'#293b50');c.fillStyle=g;c.fillRect(0,0,world.width,world.height);let s=Math.min((world.width+80)/1536,(world.height-20)/1024)*1.12;if(world.width<620)s=.68;c.imageSmoothingEnabled=false;c.drawImage(art[world.regionId],(world.width-1536*s)/2,world.height*.54-512*s,1536*s,1024*s);fx.draw(c,'sky');fx.draw(c,'text');return fx.snapshot();};
  window.digest=()=>{const c=document.getElementById('qa'),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let h=2166136261;for(let i=0;i<p.length;i++)h=Math.imul(h^p[i],16777619);return h>>>0;};
}'''

with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    context=browser.new_context(viewport={'width':1440,'height':900},device_scale_factor=1)
    page=context.new_page()
    page.on('pageerror',lambda e:errors.append(str(e)))
    # A plain same-origin source document gives the isolated canvas permission
    # to inspect its local art pixels, without booting the real game's profile.
    page.goto('http://127.0.0.1:4173/src/fireworks.js')
    page.set_content(HTML)
    page.add_script_tag(url='http://127.0.0.1:4173/src/fireworks.js')
    page.evaluate(INIT)
    assert not page.evaluate('fx.snapshot().enabled')
    page.evaluate('advance(10)')
    assert page.evaluate('fx.snapshot().particleCount')==0
    report['inactiveNoParticles']=True
    page.evaluate('world.started=true;world.state.finished=true;advance(2.3);paint()')
    initial=page.evaluate('fx.snapshot()')
    assert initial['active'] and initial['bursts']>=2 and initial['textPointCount']>100
    assert initial['textPointCount']<=360
    report['completedRestoreActivates']=initial
    report['regions']={}
    for region in ['home','forest','coast','lake']:
        page.evaluate('(region)=>{world.regionId=region;fx.update(0);fx.replay();advance(2.3);paint();}',region)
        snap=page.evaluate('fx.snapshot()')
        page.screenshot(path=str(OUT/(region+'-celebration.png')))
        assert snap['region']==region and snap['particleCount']>100
        report['regions'][region]=snap
    # Preserve launch, gathering and fading evidence, not only the held headline.
    page.evaluate('world.regionId="home";fx.update(0);fx.replay()')
    previous=0
    report['cycleFrames']=[]
    for moment in [.4,.8,1.35,3.9,5.15,7.4]:
        page.evaluate('(seconds)=>{advance(seconds);paint();}',moment-previous)
        previous=moment
        page.screenshot(path=str(OUT/('cycle-'+str(moment).replace('.','_')+'s.png')))
        report['cycleFrames'].append(page.evaluate('fx.snapshot()'))
    assert report['cycleFrames'][-1]['cycle']==1
    # Drawing or saving the same frame must never tick physics/time.
    before=page.evaluate('({time:fx.time,phase:fx.phase,particles:JSON.stringify(fx.particles),rockets:JSON.stringify(fx.rockets)})')
    first=page.evaluate('paint();digest()')
    second=page.evaluate('paint();digest()')
    after=page.evaluate('({time:fx.time,phase:fx.phase,particles:JSON.stringify(fx.particles),rockets:JSON.stringify(fx.rockets)})')
    assert first==second and before==after
    page.evaluate('world.capturing=true;world.width=1600;world.height=950;paint();world.capturing=false;world.width=1440;world.height=900;paint()')
    assert page.evaluate('({time:fx.time,phase:fx.phase,particles:JSON.stringify(fx.particles),rockets:JSON.stringify(fx.rockets)})')==before
    report['drawAndCaptureDoNotAdvance']=True
    # Instrument only after caches are warm. The independent digest uses a
    # readback itself, so it deliberately runs outside this monitored section.
    report['renderCost']=page.evaluate('''() => {let reads=0;const original=CanvasRenderingContext2D.prototype.getImageData;CanvasRenderingContext2D.prototype.getImageData=function(...a){reads++;return original.apply(this,a)};const c=document.getElementById('qa').getContext('2d'),samples=[];for(let i=0;i<240;i++){const start=performance.now();fx.update(1/60);fx.draw(c,'sky');fx.draw(c,'text');samples.push(performance.now()-start)}CanvasRenderingContext2D.prototype.getImageData=original;samples.sort((a,b)=>a-b);return {frames:240,medianMs:samples[120],p95Ms:samples[228],perFrameReadbacks:reads};}''')
    assert report['renderCost']['perFrameReadbacks']==0
    # Five minutes of real 60 Hz steps; no long-dt catch-up shortcuts.
    page.evaluate('fx.replay();advance(300)')
    long=page.evaluate('fx.snapshot()')
    assert long['cycle']==42 and 5.9<long['phase']<6.1
    assert long['peakParticles']<=560 and long['particleCount']<=560 and long['rocketCount']<=5
    assert long['layoutCacheSize']<=4 and long['glowCacheSize']<=12
    report['fiveMinutesBounded']=long
    # Controlled hidden document exercises the actual production guard without
    # pretending headless tab switching is native visibility testing.
    old=page.evaluate('fx.time')
    page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});advance(30)")
    assert page.evaluate('fx.time')==old
    page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});advance(.2)")
    assert old+.19<page.evaluate('fx.time')<old+.21
    report['controlledHiddenGuard']=True
    # Reduced-motion mode is a static piece of light lettering and eight stars.
    page.evaluate('world.state.settings.reducedMotion=true;fx.update(1/60);paint()')
    static_a=page.evaluate('digest()');time_a=page.evaluate('fx.time')
    page.screenshot(path=str(OUT/'reduced-before.png'))
    page.evaluate('advance(20);paint()')
    page.screenshot(path=str(OUT/'reduced-after.png'))
    assert page.evaluate('digest()')==static_a and page.evaluate('fx.time')==time_a,{'beforeDigest':static_a,'afterDigest':page.evaluate('digest()'),'beforeTime':time_a,'afterTime':page.evaluate('fx.time'),'state':page.evaluate('fx.snapshot()')}
    assert page.evaluate('fx.particles.length+fx.rockets.length')==0
    page.screenshot(path=str(OUT/'reduced-motion-static.png'))
    report['reducedMotionIdenticalPixels']=True
    page.evaluate('world.state.finished=false;fx.update(1/60);paint()')
    assert not page.evaluate('fx.snapshot().active') and page.evaluate('fx.time')==0
    assert page.evaluate('fx.particles.length+fx.rockets.length')==0
    report['resetStopsAndClears']=True
    page.evaluate('world.state.settings.reducedMotion=false;world.state.finished=true;fx.update(0);advance(1.8);paint()')
    assert page.evaluate('fx.snapshot().active')
    report['resumeAfterReset']=True
    # Editable literal text must be visible and bounded without injecting HTML.
    page.evaluate("personalText='姐姐，愿每一天都有星光！';fx.update(0);fx.replay();advance(2);paint()")
    custom=page.evaluate('fx.snapshot()')
    assert custom['text']=='姐姐，愿每一天都有星光！' and custom['textBounds']['width']<1440
    page.screenshot(path=str(OUT/'personalized-text.png'))
    report['personalizedText']=custom['textBounds']
    report['layouts']=[]
    for width,height in [(390,844),(375,667),(844,390),(844,500),(960,540),(1440,900)]:
        page.set_viewport_size({'width':width,'height':height})
        page.evaluate('([w,h])=>{world.width=w;world.height=h;personalText="生日快乐!";fx.update(0);fx.replay();advance(2.3);paint();}',[width,height])
        bound=page.evaluate('fx.snapshot().textBounds')
        assert bound['x']>=0 and bound['x']+bound['width']<=width
        hud=page.locator('.topbar').bounding_box();quest=page.locator('#quest-panel').bounding_box();region_label=page.locator('#world-label').bounding_box()
        for r in [hud,quest,region_label]:
            if r is None:continue
            overlap=(bound['x']<r['x']+r['width'] and bound['x']+bound['width']>r['x'] and bound['y']<r['y']+r['height'] and bound['y']+bound['height']>r['y'])
            assert not overlap,('Text overlaps HUD',width,height,bound,r)
        actor_zone=page.locator('#actor-zone').bounding_box()
        if actor_zone:
            assert bound['x']-32>=actor_zone['x']+actor_zone['width'],('Greeting halo crosses the traveller',width,height,bound,actor_zone)
            assert bound['font']>=45,('Default short birthday greeting is too small',width,height,bound)
        report['layouts'].append({'width':width,'height':height,'textBounds':bound,'regionLabelBounds':region_label,'actorProtectedBounds':actor_zone,'noHUDOverlap':True})
        page.screenshot(path=str(OUT/f'layout-{width}x{height}.png'))
        if actor_zone:
            page.evaluate("personalText='姐姐生日快乐，愿我们一直并肩走过每一片星光';fx.update(0);paint()")
            long_bound=page.evaluate('fx.snapshot().textBounds')
            assert long_bound['x']-32>=actor_zone['x']+actor_zone['width'],('Long blessing crosses the traveller',width,height,long_bound,actor_zone)
            assert long_bound['x']+long_bound['width']<=width-24.0+.01
            report['layouts'][-1]['longTextBounds']=long_bound
            page.screenshot(path=str(OUT/f'layout-{width}x{height}-long.png'))
    assert not errors,errors
    report['browserErrors']=errors
    (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    context.close();browser.close()
print(json.dumps(report,ensure_ascii=True))
