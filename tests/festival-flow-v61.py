"""Independent real-UI birthday/festival regression; no state or clock injection.

Run only after the production modules are frozen:
  python tests/festival-flow-v61.py
  python tests/festival-flow-v61.py --offline-only --offline 星屿寻迹.html

Fresh Playwright contexts are used; the user's browser profile is never opened.
The offline pass restores the backup downloaded by the completed real playthrough.
"""
import argparse
import hashlib
import json
import statistics
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/festival-v61';OUT.mkdir(parents=True,exist_ok=True)
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--url',default='http://127.0.0.1:4173/')
parser.add_argument('--offline',default='星屿寻迹.html')
parser.add_argument('--offline-only',action='store_true')
args=parser.parse_args()
report={'checks':[],'regions':{},'viewports':{},'browserErrors':[],'samples':{},'mapPins':{},'performance':{}}
sources=['src/fireworks.js','src/waypoints.js','src/world.js','src/game.js']
report['sourceHashes']={name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in sources}

def snap(page):return page.evaluate('starIsland.snapshot()')
def sky(page):return snap(page)['world']['visuals']['fireworks']
def check(name,details=True):
    report['checks'].append({'name':name,'details':details})
    print(name,flush=True)
def boot(page,url):
    page.on('pageerror',lambda e:report['browserErrors'].append(str(e)))
    page.goto(url);page.wait_for_load_state('networkidle')
    page.wait_for_function('window.starIsland && starIsland.snapshot().world.ready',timeout=60000)
    assert page.evaluate('typeof IslandFireworks==="function" && typeof IslandWaypoints==="function"')
    assert sky(page) is not None
def screen(page,name):page.wait_for_function('name=>starIsland.snapshot().screen===name',arg=name,timeout=30000)
def close(page):
    page.locator('#modal-close').click()
    page.wait_for_function('!document.getElementById("modal").open')
def start(page):
    page.locator('#start-button').click();page.locator('#dialogue-next').click()
    page.wait_for_function('!starIsland.snapshot().world.paused')
def go(page,region,item,expected,kind='pin'):
    page.locator('#map-button').click()
    page.locator(f'.region-tab[data-region="{region}"]').click()
    page.locator(f'.map-{kind}[data-id="{item}"]').click()
    screen(page,expected)
    assert snap(page)['world']['region']==region and snap(page)['world']['walkable'],(region,item,snap(page))
def assert_off(page,label):
    f=sky(page)
    assert not f['enabled'] and not f['active'] and f['particleCount']==f['rocketCount']==0,(label,f)
def check_map(page,region,screenshot=False):
    page.locator('#map-button').click();page.locator(f'.region-tab[data-region="{region}"]').click()
    page.wait_for_timeout(160)
    rows=page.evaluate('''()=>({pins:[...document.querySelectorAll('.map-pin')].map(el=>({id:el.dataset.id,number:el.querySelector('b')?.textContent,name:el.querySelector('.pin-caption')?.textContent,label:el.getAttribute('aria-label'),type:el.className})),list:[...document.querySelectorAll('.map-destination')].map(el=>({id:el.dataset.id,number:el.querySelector('.destination-index')?.textContent,name:el.querySelector('strong')?.textContent}))})''')
    assert len(rows['pins'])==len(rows['list']) and rows['pins'],rows
    for i,(pin,item) in enumerate(zip(rows['pins'],rows['list'])):
        assert pin['id']==item['id'] and pin['name']==item['name'] and pin['number']==item['number']==str(i+1),(pin,item)
        assert pin['name'] in pin['label']
    assert any('story' in p['type'] for p in rows['pins']) and any('activity' in p['type'] for p in rows['pins'])
    report['mapPins'][region]=rows
    if screenshot:
        size=page.viewport_size;page.screenshot(path=str(OUT/f'map-{region}-{size["width"]}x{size["height"]}.png'))
    close(page)
def sample(page,label,seconds):
    begin=time.monotonic();rows=[]
    while time.monotonic()-begin<seconds:
        world=snap(page)['world'];f=world['visuals']['fireworks'];rows.append({'wall':time.monotonic()-begin,'cpuMs':world['performance']['cpuMs'],**f});page.wait_for_timeout(250)
    report['samples'][label]=rows
    cpu=[r['cpuMs'] for r in rows];report['performance'][label]={'medianCpuMs':statistics.median(cpu),'maxCpuMs':max(cpu),'samples':len(cpu),'note':'Observed on this local browser; no machine-independent threshold asserted.'}
    assert all(r['enabled'] and r['active'] and r['period']==7 for r in rows),label
    assert max(r['particleCount'] for r in rows)>0,label
    assert max(r['particleCount'] for r in rows)<=rows[0]['maxParticles'],label
    return rows
def visible_sky(page,label):
    page.wait_for_function('''()=>{const v=starIsland.snapshot().world.visuals,f=v.fireworks;return f.active&&f.phase>1.65&&f.phase<2.2&&f.particleCount>0&&v.waypoints?.enabled;}''',timeout=15000)
    f=sky(page);bounds=f['textBounds'];viewport=page.viewport_size
    assert f['text']=='生日快乐!' and bounds and bounds['font']>=22,f
    assert bounds['x']>=0 and bounds['y']>=0 and bounds['x']+bounds['width']<=viewport['width'] and bounds['y']+bounds['height']<=viewport['height'],(bounds,viewport)
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    hud=page.evaluate('''()=>[...document.querySelectorAll('.topbar,#quest-panel,#world-label,.bottom-bar,#joystick,.touch-actions')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'&&getComputedStyle(el).display!=='none').map(el=>{const r=el.getBoundingClientRect();return {id:el.id||el.className,x:r.left,y:r.top,width:r.width,height:r.height};})''')
    overlap=[]
    for item in hud:
        dx=min(bounds['x']+bounds['width'],item['x']+item['width'])-max(bounds['x'],item['x'])
        dy=min(bounds['y']+bounds['height'],item['y']+item['height'])-max(bounds['y'],item['y'])
        if dx>0 and dy>0:overlap.append({'id':item['id'],'area':dx*dy})
    markers=snap(page)['world']['visuals']['waypoints']
    report['viewports'][label]={'size':viewport,'fireworks':f,'hud':hud,'textHudOverlap':overlap,'waypoints':markers}
    assert markers and markers['enabled'],(label,markers)
    page.screenshot(path=str(OUT/f'{label}.png'))
    page.locator('#world').screenshot(path=str(OUT/f'{label}-canvas.png'))
    assert not overlap,(label,'Birthday text overlaps visible HUD',overlap)
    return f
def restore(page,backup):
    page.locator('#settings-button').click()
    with page.expect_file_chooser() as chosen:page.locator('#import-button').click()
    chosen.value.set_files(str(backup));expect(page.locator('#confirm-import')).to_be_visible()
    page.locator('#confirm-import').click()
    page.wait_for_function('starIsland.snapshot().state.finished && !starIsland.snapshot().world.paused')
    page.wait_for_function('starIsland.snapshot().world.visuals.fireworks.active')

with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='msedge',headless=True)
    context=None;page=None
    try:
        backup=OUT/'completed-birthday-backup.json'
        if not args.offline_only:
            context=browser.new_context(viewport={'width':1440,'height':900},device_scale_factor=1,timezone_id='Asia/Shanghai',accept_downloads=True)
            page=context.new_page();boot(page,args.url);assert_off(page,'before-start');start(page);assert_off(page,'after-start')
            page.locator('#settings-button').click();page.locator('#setting-time').select_option('night');close(page)
            for i,item in enumerate(['first','know','daily','heal','future']):
                go(page,'home',item,'memory');assert_off(page,item)
                page.locator('#collect-memory').click();page.wait_for_function('n=>starIsland.snapshot().state.collected.length===n',arg=i+1)
            check('Five memories reached and collected through real map pins; festival remains off')
            go(page,'home','observatory','constellation');assert_off(page,'before-stars')
            for i in range(5):page.locator(f'[data-star="{i}"]').click()
            screen(page,'finale');page.locator('#open-gift').click();screen(page,'letter')
            assert snap(page)['state']['finished'];page.locator('#back-island').click()
            page.wait_for_function('starIsland.snapshot().world.visuals.fireworks.active')
            visible_sky(page,'desktop-home-birthday')
            rows=sample(page,'home-16-seconds',16.2)
            assert rows[-1]['wall']>14 and rows[-1]['cycle']-rows[0]['cycle']>=2,rows[-1]
            check('Birthday letter opened; world festival continues for more than 14 seconds across two full cycles',{'startCycle':rows[0]['cycle'],'endCycle':rows[-1]['cycle'],'seconds':rows[-1]['wall']})
            report['regions']['home']={'theme':rows[-1]['theme'],'shapes':sorted({shape for row in rows for shape in row['shapes']})}
            for region,item,expected in [('home','wind_chime','adventure'),('forest','tea_table','adventure'),('coast','sandcastle','activity'),('lake','silver_paper','adventure')]:
                check_map(page,region,True)
                go(page,region,item,expected)
                if expected=='activity':page.locator('#activity-leave').click()
                else:page.locator('#story-dismiss').click()
                visible_sky(page,f'desktop-{region}-landmarks-birthday')
                rows=sample(page,region+'-travel',7.4)
                report['regions'][region]={'theme':rows[-1]['theme'],'shapes':sorted({shape for row in rows for shape in row['shapes']}),'cycles':[rows[0]['cycle'],rows[-1]['cycle']]}
            assert len({r['theme'] for r in report['regions'].values()})==4
            check('Four regions retain celebration with different themes; numbered story/activity pins match every destination and route correctly',report['regions'])
            page.reload();page.wait_for_load_state('networkidle');page.wait_for_function('starIsland.snapshot().world.ready && starIsland.snapshot().world.visuals.fireworks.active')
            assert snap(page)['state']['finished'];visible_sky(page,'desktop-after-refresh')
            check('Refresh preserves finished status and restarts the ongoing festival')
            page.locator('#settings-button').click();page.locator('#setting-motion').check();close(page)
            page.wait_for_timeout(100);before=sky(page);page.wait_for_timeout(1600);after=sky(page)
            assert before['reducedMotion'] and after['reducedMotion'] and after['particleCount']==after['rocketCount']==0
            assert before['phase']==after['phase'] and before['births']==after['births'],(before,after)
            page.screenshot(path=str(OUT/'reduced-motion-static.png'))
            page.locator('#settings-button').click();page.locator('#setting-motion').uncheck();close(page)
            visible_sky(page,'desktop-motion-restored');check('Reduced motion UI creates no new particles or phase advance; disabling resumes safely')
            page.locator('#settings-button').click()
            with page.expect_download() as pending:page.locator('#export-button').click()
            pending.value.save_as(str(backup));close(page)
            assert json.loads(backup.read_text(encoding='utf-8'))['state']['finished']
            for width,height in [(390,844),(844,390)]:
                mobile_context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=2,is_mobile=True,has_touch=True,timezone_id='Asia/Shanghai')
                mobile=mobile_context.new_page();boot(mobile,args.url);restore(mobile,backup)
                visible_sky(mobile,f'mobile-{width}x{height}')
                assert snap(mobile)['world']['performance']['dpr']==2
                check_map(mobile,'lake',True);mobile_context.close()
            check('Portrait 390×844 and landscape 844×390 show the actual large birthday text with HUD, DPR2, and a complete map')
            page.locator('#settings-button').click();page.locator('#reset-button').click();page.locator('#confirm-reset').click()
            page.wait_for_timeout(100);assert_off(page,'after-reset')
            assert not snap(page)['state']['finished'];page.screenshot(path=str(OUT/'after-reset.png'))
            check('Actual reset button disables celebration and clears finished status')
            context.close();context=None
        else:
            assert backup.is_file(),'Run the online real playthrough first to create the backup'
            offline=Path(args.offline);offline=offline if offline.is_absolute() else ROOT/offline
            context=browser.new_context(viewport={'width':1440,'height':900},device_scale_factor=1,accept_downloads=True)
            page=context.new_page();requests=[];page.on('request',lambda request:requests.append(request.url))
            boot(page,offline.as_uri());assert_off(page,'offline-fresh');restore(page,backup)
            visible_sky(page,'offline-restored-birthday');rows=sample(page,'offline-15-seconds',15.2)
            assert rows[-1]['cycle']-rows[0]['cycle']>=2
            page.reload();page.wait_for_function('window.starIsland && starIsland.snapshot().world.ready && starIsland.snapshot().world.visuals.fireworks.active',timeout=60000)
            assert snap(page)['state']['finished'];visible_sky(page,'offline-after-refresh')
            check_map(page,'forest');go(page,'forest','swing','activity');page.locator('#activity-leave').click()
            visible_sky(page,'offline-forest-birthday')
            assert not any(url.startswith(('http://','https://')) for url in requests),requests
            check('Offline HTML includes new modules, restores finished backup, continues multiple cycles, survives refresh and cross-map activity routing without network')
            report['offline']={'file':str(offline),'bytes':offline.stat().st_size,'networkRequests':requests}
        assert not report['browserErrors'],report['browserErrors']
        assert report['sourceHashes']=={name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in sources},'Production source changed during frozen QA'
        report['passed']=True
    except Exception as error:
        report['passed']=False;report['failure']=repr(error)
        if page:
            try:page.screenshot(path=str(OUT/('offline-failure.png' if args.offline_only else 'failure.png')));report['failureSnapshot']=snap(page)
            except Exception:pass
        raise
    finally:
        (OUT/('offline-report.json' if args.offline_only else 'report.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        evidence=['desktop-home-birthday','desktop-forest-landmarks-birthday','desktop-coast-landmarks-birthday','desktop-lake-landmarks-birthday','mobile-390x844','mobile-844x390','reduced-motion-static'] if not args.offline_only else ['offline-restored-birthday','offline-after-refresh','offline-forest-birthday']
        (OUT/('offline-review.html' if args.offline_only else 'review.html')).write_text('<!doctype html><meta charset="utf-8"><title>庆典 6.1 · 实景检查</title><style>body{margin:28px auto;max-width:1440px;padding:20px;background:#172839;color:#f5e2bb;font:16px system-ui}img{max-width:100%;display:block}section{margin:32px 0}a{color:#b9dfde}</style><h1>庆典 6.1 · 实际流程截图</h1><p>真实地图点击、收集、连星、开信及备份恢复；没有注入游戏进度或快进时钟。数值结果不能替代美术目测。</p>'+''.join(f'<section><h2>{label}</h2><a href="{label}.png"><img src="{label}.png"></a></section>' for label in evidence if (OUT/f'{label}.png').is_file()),encoding='utf-8')
        if context:context.close()
        browser.close()
print(json.dumps({'passed':report['passed'],'checks':len(report['checks']),'browserErrors':report['browserErrors']},ensure_ascii=False))
