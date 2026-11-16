"""Keep new activity controls visible on compact portrait and landscape screens."""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
errors=[];checks=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    sizes=[(844,390)] if '--landscape' in sys.argv else [(375,667),(844,390)]
    for width,height in sizes:
        page=browser.new_page(viewport={'width':width,'height':height},has_touch=True)
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto('http://127.0.0.1:4173');page.wait_for_function('window.starIsland && starIsland.snapshot().world.ready')
        page.locator('#start-button').click();page.locator('#dialogue-next').click()
        page.locator('#character-button').click();page.locator('[data-companion="boy"]').click();page.locator('#character-back').click()
        for activity,button in [('flower_garden','activity-garden'),('paper_boat','activity-launch'),('stone_skip','activity-throw'),('windmill','activity-turn')]:
            page.locator('#activities-button').click();page.locator(f'[data-activity-route="{activity}"]').click()
            page.wait_for_function('(id)=>starIsland.snapshot().world.activity?.id===id',arg=activity,timeout=20000)
            page.wait_for_timeout(300)
            bounds=page.locator('#'+button).bounding_box()
            assert bounds and bounds['x']>=0 and bounds['y']>=0 and bounds['x']+bounds['width']<=width and bounds['y']+bounds['height']<=height,(activity,bounds)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            assert page.locator('#modal').evaluate('(el)=>el.scrollHeight<=el.clientHeight+1'),(activity,width,height)
            page.screenshot(path=str(ROOT/f'output/pastime-{activity}-{width}x{height}.png'))
            checks.append({'viewport':[width,height],'activity':activity,'primaryControlVisible':True,'dockNeedsNoScroll':True})
            page.locator('#activity-leave').click()
        page.close()
    browser.close()
assert not errors,errors
result={'layouts':checks,'browserErrors':errors}
report_name='pastimes-landscape-report.json' if '--landscape' in sys.argv else 'pastimes-layout-report.json'
(ROOT/'output'/report_name).write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result))
