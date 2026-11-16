"""Final artifact and input-focus regression checks, plus the night preview."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900})
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto('http://127.0.0.1:4173');page.wait_for_load_state('networkidle')
    page.locator('#time-button').click()
    assert page.evaluate('starIsland.snapshot().world.phase')=='night'
    page.wait_for_timeout(4300)
    page.screenshot(path=str(root/'output/preview.png'))
    page.locator('#start-button').click();page.locator('#dialogue-next').click()
    page.locator('#sound-button').click()
    before=page.evaluate('starIsland.snapshot().world.player.x')
    page.keyboard.down('ArrowLeft');page.wait_for_timeout(280);page.keyboard.up('ArrowLeft')
    assert page.evaluate('starIsland.snapshot().world.player.x')<before-30
    page.keyboard.press('KeyE')
    page.wait_for_function("starIsland.snapshot().screen==='memory'")
    assert page.locator('#modal').get_attribute('aria-labelledby')=='modal-title'
    page.keyboard.press('Escape')
    page.wait_for_function('!starIsland.snapshot().world.paused')
    requests=[]
    offline=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    offline.on('pageerror',lambda error:errors.append(str(error)))
    offline.on('request',lambda request:requests.append(request.url))
    offline.goto((root/'星屿寻迹.html').as_uri());offline.wait_for_load_state('networkidle')
    offline.wait_for_function('window.starIsland && starIsland.snapshot().world.ready')
    assert not any(url.startswith('http') for url in requests)
    assert offline.locator('#start-button').is_visible()
    offline.locator('#time-button').tap();offline.wait_for_timeout(4300)
    offline.screenshot(path=str(root/'output/preview-mobile.png'))
    assert not errors,errors
    result={'browser':browser.version,'passed':['WASD after toolbar focus','E interaction and Escape','named accessible dialog','final single-file offline boot','no HTTP dependencies in single file'],'browserErrors':errors}
    (root/'output/delivery-check.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result,ensure_ascii=True))
    browser.close()
