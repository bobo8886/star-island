"""Targeted real-UI layout follow-up after the already-passed birthday playthrough.
Restores its downloaded finished backup in fresh browser contexts. No state/clock injection.
"""
import argparse,hashlib,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'output/festival-v61';BACKUP=OUT/'completed-birthday-backup.json'
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--offline',action='store_true')
args=parser.parse_args()
label='offline-layout' if args.offline else 'layout'
report={'mode':label,'checks':[],'browserErrors':[],'sourceSHA':hashlib.sha256((ROOT/'src/fireworks.js').read_bytes()).hexdigest(),'sourceHashes':{name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in ['src/fireworks.js','src/game.js','style.css']}}
def overlap(a,b):
    dx=min(a['x']+a['width'],b['x']+b['width'])-max(a['x'],b['x']);dy=min(a['y']+a['height'],b['y']+b['height'])-max(a['y'],b['y'])
    return max(0,dx)*max(0,dy)
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    try:
        for width,height in [(844,390),(1024,500),(390,844),(1440,900),(375,667)]:
            context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=2 if width<1100 else 1,is_mobile=width<1100,has_touch=width<1100,timezone_id='Asia/Shanghai')
            page=context.new_page();requests=[];page.on('pageerror',lambda e:report['browserErrors'].append(str(e)));page.on('request',lambda req:requests.append(req.url))
            page.goto((ROOT/'星屿寻迹.html').as_uri() if args.offline else 'http://127.0.0.1:4173/')
            page.wait_for_load_state('networkidle');page.wait_for_function('window.starIsland && starIsland.snapshot().world.ready',timeout=60000)
            page.locator('#settings-button').click()
            with page.expect_file_chooser() as chosen:page.locator('#import-button').click()
            chosen.value.set_files(str(BACKUP));expect(page.locator('#confirm-import')).to_be_visible();page.locator('#confirm-import').click()
            page.wait_for_function('starIsland.snapshot().state.finished && !starIsland.snapshot().world.paused')
            # Test the actual two-character configuration, also keeping the guide
            # from being mistaken for an empty area beside the main character.
            page.locator('#settings-button').click();page.locator('[data-companion="boy"]').click();page.locator('#modal-close').click()
            page.wait_for_timeout(700)
            page.wait_for_function('''()=>{const v=starIsland.snapshot().world.visuals,f=v.fireworks;return f.active&&f.phase>1.65&&f.phase<2.2&&f.particleCount>0&&v.waypoints.enabled;}''',timeout=15000)
            evidence=page.evaluate('''()=>{const w=starIsland.snapshot().world,f=w.visuals.fireworks,s=w.camera.scale;return {fireworks:f,camera:w.camera,heads:[['girl',w.player],['boy',w.spirit]].map(([name,a])=>{const p=starIsland.screenPoint(a.x,a.y);return {name,x:p.x-28*s,y:p.y-105*s,width:56*s,height:51*s,foot:p};}),hud:[...document.querySelectorAll('.topbar,#quest-panel,#world-label,#toast,.bottom-bar,#joystick,.touch-actions')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'&&getComputedStyle(el).display!=='none'&&Number(getComputedStyle(el).opacity)>0).map(el=>{const r=el.getBoundingClientRect();return {id:el.id||el.className,x:r.left,y:r.top,width:r.width,height:r.height};})};}''')
            title=evidence['fireworks']['textBounds'];evidence['viewport']={'width':width,'height':height};evidence['headOverlap']=[{**r,'area':overlap(title,r)} for r in evidence['heads'] if overlap(title,r)>0];evidence['hudOverlap']=[{**r,'area':overlap(title,r)} for r in evidence['hud'] if overlap(title,r)>0]
            stem=f'{label}-{width}x{height}';page.screenshot(path=str(OUT/f'{stem}.png'));evidence['screenshot']=stem+'.png';report['checks'].append(evidence)
            assert title['x']>=0 and title['y']>=0 and title['x']+title['width']<=width and title['y']+title['height']<=height,evidence
            assert not evidence['headOverlap'] and not evidence['hudOverlap'],evidence
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            if (width,height)==(375,667):
                expect(page.locator('#journal-button')).to_be_visible();page.locator('#journal-button').click()
                page.wait_for_function('starIsland.snapshot().screen==="journal"')
                assert page.locator('.journal-entry:not(.locked)').count()==5
                page.locator('#modal-close').click();page.locator('#settings-button').click();page.locator('#reset-button').click();page.locator('#confirm-reset').click()
                page.wait_for_function('!starIsland.snapshot().state.finished && !starIsland.snapshot().world.visuals.fireworks.active')
                assert page.evaluate('!document.body.classList.contains("celebrating")')
                evidence['compactHudJournalAndReset']=True
            if args.offline:assert not any(url.startswith(('http://','https://')) for url in requests),requests
            context.close();print(f'{stem}: title inside screen, two head regions and visible HUD clear',flush=True)
        if args.offline:
            online=json.loads((OUT/'layout-report.json').read_text(encoding='utf-8'))
            assert online['passed'] and online['sourceSHA']==report['sourceSHA'],online
            for actual,expected in zip(report['checks'],online['checks']):
                assert actual['viewport']==expected['viewport']
                a=actual['fireworks']['textBounds'];b=expected['fireworks']['textBounds']
                assert all(abs(a[key]-b[key])<=.5 for key in ['x','y','width','height','font']),(a,b)
            report['onlineOfflineLayoutMatch']=True
        assert not report['browserErrors'],report['browserErrors'];report['passed']=True
        assert report['sourceSHA']==hashlib.sha256((ROOT/'src/fireworks.js').read_bytes()).hexdigest()
        assert report['sourceHashes']=={name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in report['sourceHashes']}
    except Exception as error:report['passed']=False;report['error']=repr(error);raise
    finally:
        (OUT/f'{label}-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        browser.close()
print(json.dumps({'passed':True,'sizes':len(report['checks']),'browserErrors':report['browserErrors']}))

