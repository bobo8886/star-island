"""Real movement/contact/F checks and visual checks for the expanded edition."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    def boot(mobile=False):
        page=browser.new_page(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 900},has_touch=mobile,is_mobile=mobile)
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto('http://127.0.0.1:4173');page.wait_for_load_state('networkidle')
        page.locator('#start-button').click();page.locator('#dialogue-next').click();page.wait_for_timeout(1250)
        return page
    page=boot()
    page.keyboard.down('ArrowLeft');page.wait_for_timeout(240);page.keyboard.up('ArrowLeft');page.wait_for_timeout(150)
    assert page.evaluate('starIsland.snapshot().screen')==''
    page.keyboard.press('KeyF');page.wait_for_function("starIsland.snapshot().screen==='memory'")
    assert page.evaluate('starIsland.snapshot().state.collected')==['first']
    page.locator('#modal-close').click();page.wait_for_timeout(1200)
    assert page.evaluate('starIsland.snapshot().screen')==''
    page.close()
    page=boot()
    page.keyboard.down('ArrowLeft');page.wait_for_function("starIsland.snapshot().screen==='memory'",timeout=6000);page.keyboard.up('ArrowLeft')
    assert page.evaluate('starIsland.snapshot().state.collected')==['first']
    page.locator('#modal-close').click();page.wait_for_timeout(1100)
    assert page.evaluate('starIsland.snapshot().screen')==''
    page.close()
    distances=[]
    for sprint in [False,True]:
        page=boot()
        before=page.evaluate('starIsland.snapshot().world.player.y')
        if sprint:page.keyboard.down('ShiftLeft')
        page.keyboard.down('ArrowUp');page.wait_for_timeout(260);page.keyboard.up('ArrowUp');page.keyboard.up('ShiftLeft');page.wait_for_timeout(150)
        distances.append(before-page.evaluate('starIsland.snapshot().world.player.y'));page.close()
    assert distances[1]>distances[0]*1.25,distances
    page=boot()
    page.locator('#time-button').click()
    page.wait_for_timeout(4300)
    page.screenshot(path=str(ROOT/'output/expansion-home.png'))
    old=page.evaluate('starIsland.snapshot().world.zoom')
    page.mouse.move(950,450);page.mouse.wheel(0,-200);page.wait_for_timeout(400)
    assert page.evaluate('starIsland.snapshot().world.zoom')>old
    page.locator('#character-button').click();page.wait_for_timeout(400)
    for pose in ['idle','walk','sit','look','jump']:
        page.locator(f'[data-character-pose="{pose}"]').click();page.wait_for_timeout(120)
    page.screenshot(path=str(ROOT/'output/expansion-character.png'))
    page.locator('#character-back').click()
    for region,destination in [('forest','tea_table'),('coast','lighthouse_stone')]:
        page.locator('#map-button').click();page.locator(f'.region-tab[data-region="{region}"]').click()
        page.locator(f'.map-destination[data-id="{destination}"]').click()
        page.wait_for_function("starIsland.snapshot().screen==='adventure'",timeout=15000)
        page.locator('#story-dismiss').click();page.wait_for_timeout(4500)
        assert page.evaluate('starIsland.snapshot().world.region')==region
        page.screenshot(path=str(ROOT/f'output/expansion-{region}.png'))
    page.close()
    mobile=boot(True)
    box=mobile.locator('#run-button').bounding_box()
    mobile.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);mobile.mouse.down();mobile.wait_for_timeout(180)
    assert mobile.evaluate('starIsland.snapshot().world.sprinting')
    mobile.mouse.up();mobile.wait_for_timeout(100)
    assert not mobile.evaluate('starIsland.snapshot().world.sprinting')
    mobile.locator('#map-button').tap();mobile.locator('.region-tab[data-region="forest"]').tap()
    mobile.locator('.map-destination[data-id="seed_pouch"]').tap()
    mobile.wait_for_function("starIsland.snapshot().screen==='adventure'",timeout=15000)
    mobile.locator('#story-dismiss').tap();mobile.wait_for_timeout(4300)
    mobile.screenshot(path=str(ROOT/'output/expansion-mobile.png'))
    assert mobile.evaluate('document.documentElement.scrollWidth<=innerWidth')
    mobile.close()
    assert not errors,errors
    result={'passed':['first pickup with F','manual touch pickup','no repeated dialog after dismissal','sprint faster than walk','wheel zoom','five character poses','forest and coast real navigation','mobile sprint and travel'],'walkAndSprintDistance':distances,'browserErrors':errors}
    (ROOT/'output/expansion-input-report.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps(result));browser.close()
