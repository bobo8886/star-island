"""The final standalone must carry every new region and the character art."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
errors=[];requests=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1280,'height':800},accept_downloads=True)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:requests.append(r.url))
    page.goto((root/'星屿寻迹.html').as_uri());page.wait_for_load_state('networkidle')
    page.wait_for_function('window.starIsland && starIsland.snapshot().world.ready')
    page.locator('#start-button').click();page.locator('#dialogue-next').click()
    for region,item in [('forest','seed_pouch'),('coast','white_shell')]:
        page.locator('#map-button').click();page.locator(f'.region-tab[data-region="{region}"]').click()
        page.locator(f'.map-destination[data-id="{item}"]').click()
        page.wait_for_function("starIsland.snapshot().screen==='adventure'",timeout=15000)
        assert page.evaluate('starIsland.snapshot().world.ready')
        page.locator('#story-dismiss').click()
    page.locator('#character-button').click()
    assert page.locator('.character-design-image').evaluate('(img)=>img.complete&&img.naturalWidth===1536')
    page.locator('#character-back').click()
    page.locator('#settings-button').click()
    with page.expect_download() as gift:page.locator('#export-gift').click()
    exported=root/'output/expanded-test-gift.html';gift.value.save_as(exported)
    recipient=browser.new_page()
    recipient.on('pageerror',lambda e:errors.append(str(e)))
    recipient.goto(exported.as_uri());recipient.wait_for_load_state('networkidle')
    assert recipient.evaluate('starIsland.snapshot().state.exploration.found')==[]
    assert recipient.evaluate('starIsland.snapshot().state.region')=='home'
    assert recipient.evaluate("Boolean(ISLAND_ASSETS['assets/forest.png'] && ISLAND_ASSETS['assets/coast.png'])")
    assert not any(url.startswith('http') for url in requests),requests
    assert not errors,errors
    result={'offlineRegions':['home','forest','coast'],'characterArt':True,'freshGiftProgress':True,'httpRequests':0,'browserErrors':errors}
    (root/'output/expanded-offline-report.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps(result));browser.close()
