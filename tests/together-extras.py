"""Small integration check for activity sounds, additional poses and a photo anywhere."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900})
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto('http://127.0.0.1:4173');page.wait_for_load_state('networkidle')
    page.locator('#start-button').click();page.locator('#dialogue-next').click()
    page.locator('#sound-button').click()
    assert page.evaluate('starIsland.snapshot().state.settings.sound')
    page.evaluate('''() => {window.heardActivitySounds=[];const originalActivitySound=IslandAudio.activity;
        IslandAudio.activity=function(kind){heardActivitySounds.push(kind);return originalActivitySound(kind);};}''')
    page.locator('#character-button').click()
    for variant in ['girl','boy']:
        page.locator(f'[data-character-variant="{variant}"]').click()
        for pose in ['wave','photo','build']:
            page.locator(f'[data-character-pose="{pose}"]').click()
            expect(page.locator(f'[data-character-pose="{pose}"]')).to_have_attribute('aria-pressed','true')
            page.wait_for_timeout(150)
    page.locator('#character-back').click()
    before=page.evaluate('starIsland.snapshot().world.player')
    page.locator('#activities-button').click();page.locator('#quick-photo').click()
    page.wait_for_function('document.querySelector("#photo-preview").naturalWidth===1600')
    assert page.evaluate('starIsland.snapshot().state.activities.photos')==1
    after=page.evaluate('starIsland.snapshot().world.player')
    assert before['x']==after['x'] and before['y']==after['y']
    page.locator('#photo-back').click()
    for activity,button in [('swing','#activity-push'),('sandcastle','#activity-build'),('stroll','#activity-walk-again')]:
        page.locator('#activities-button').click()
        page.locator(f'[data-activity-route="{activity}"]').click()
        page.wait_for_function("starIsland.snapshot().screen==='activity'",timeout=20000)
        page.locator(button).click();page.wait_for_timeout(300)
        page.locator('#activity-leave').click()
    calls=page.evaluate('heardActivitySounds')
    assert {'swing','build','shutter','stroll'}.issubset(calls),calls
    assert not errors,errors
    report={'additionalPoses':['wave','photo','build'],'variants':['girl','boy'],'quickPhotoAtSamePosition':True,'soundEnabled':True,'activitySoundCalls':calls,'browserErrors':errors}
    (ROOT/'output/together-extras-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report));browser.close()
