"""Real UI coverage for companion preferences, four activities, photo and save migration."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output'
OUT.mkdir(exist_ok=True)
errors=[]
checks=[]
with sync_playwright() as playwright:
    browser=playwright.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900},accept_downloads=True)
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto('http://127.0.0.1:4173/');page.wait_for_load_state('networkidle')
    def state(): return page.evaluate('starIsland.snapshot().state')
    def route(activity):
        page.locator('#activities-button').click()
        page.locator(f'[data-activity-route="{activity}"]').click()
        page.wait_for_function("starIsland.snapshot().screen==='activity'",timeout=20000)
        expect(page.locator('.activity-panel')).to_have_attribute('data-activity',activity)
        assert page.evaluate('document.body.classList.contains("doing-activity")')
    try:
        assert state()['settings']['companion']=='spirit'
        assert state()['activities']=={'sandcastle':0,'completed':[],'photos':0,'gardenStage':0,'boats':0,'lastBoatWish':'','bestSkips':0,'stoneThrows':0,'windmillTurns':0}
        migrated=page.evaluate('IslandStore.normalize({version:1,collected:["first"],settings:{time:"night"}})')
        assert migrated['settings']['companion']=='spirit' and migrated['activities']['sandcastle']==0
        invalid=page.evaluate('IslandStore.normalize({activities:{sandcastle:1,photos:0,completed:["sandcastle","photo","unknown"]},settings:{companion:"invalid"}})')
        assert invalid['activities']['completed']==[] and invalid['settings']['companion']=='spirit'
        checks.append('old-save and malformed-activity normalization')
        page.locator('#start-button').click();page.locator('#dialogue-next').click()
        page.locator('#character-button').click()
        page.locator('[data-character-variant="boy"]').click()
        page.locator('[data-companion="boy"]').click()
        expect(page.locator('[data-companion="boy"]')).to_have_attribute('aria-pressed','true')
        for pose in ['idle','walk','sit','look','jump']:
            page.locator(f'[data-character-pose="{pose}"]').click();page.wait_for_timeout(80)
        page.screenshot(path=str(OUT/'together-character.png'))
        page.locator('#character-back').click()
        assert state()['settings']['companion']=='boy'
        page.reload();page.wait_for_load_state('networkidle')
        assert state()['settings']['companion']=='boy'
        checks.append('male companion and five poses, persisted on reload')
        route('swing');page.locator('#activity-push').click();page.wait_for_timeout(900)
        assert 'swing' in state()['activities']['completed']
        page.screenshot(path=str(OUT/'together-swing.png'))
        page.locator('#activity-leave').click()
        assert not page.evaluate('document.body.classList.contains("doing-activity")')
        assert page.evaluate('starIsland.snapshot().world.activity') is None
        checks.append('swing push and safe exit')
        route('sandcastle')
        for step in [1,2,3]:
            page.locator('#activity-build').click()
            assert state()['activities']['sandcastle']==step
        assert 'sandcastle' in state()['activities']['completed']
        page.wait_for_timeout(500);page.screenshot(path=str(OUT/'together-sandcastle.png'))
        page.locator('#activity-build').click()
        assert state()['activities']['sandcastle']==0 and 'sandcastle' not in state()['activities']['completed']
        for step in [1,2,3]: page.locator('#activity-build').click()
        page.locator('#activity-leave').click();page.reload();page.wait_for_load_state('networkidle')
        assert state()['activities']['sandcastle']==3
        checks.append('three sandcastle stages, rebuild and reload persistence')
        route('stroll')
        page.wait_for_function('starIsland.snapshot().state.activities.completed.includes("stroll")',timeout=30000)
        page.screenshot(path=str(OUT/'together-stroll.png'))
        page.locator('#activity-photo').click()
        expect(page.locator('#photo-preview')).to_be_visible()
        page.wait_for_function('document.querySelector("#photo-preview").naturalWidth>0')
        with page.expect_download() as pending:
            page.locator('#photo-download').click()
        pending.value.save_as(str(OUT/'together-postcard.png'))
        assert (OUT/'together-postcard.png').read_bytes().startswith(b'\x89PNG\r\n\x1a\n')
        assert set(state()['activities']['completed'])=={'swing','sandcastle','stroll','photo'}
        assert state()['activities']['photos']==1
        page.screenshot(path=str(OUT/'together-photo.png'));page.locator('#photo-back').click()
        checks.append('stroll completes through animated route and actual PNG photo download')
        route('photo');page.locator('#activity-shutter').click()
        assert state()['activities']['photos']==2
        page.locator('#photo-back').click()
        page.locator('#settings-button').click();page.locator('[data-companion="none"]').click()
        page.locator('#modal-close').click()
        assert state()['settings']['companion']=='none'
        page.locator('#settings-button').click();page.locator('[data-companion="spirit"]').click()
        with page.expect_download() as pending:page.locator('#export-button').click()
        backup=OUT/'together-backup.json';pending.value.save_as(str(backup))
        page.locator('#reset-button').click();page.locator('#confirm-reset').click()
        assert state()['activities']=={'sandcastle':0,'completed':[],'photos':0,'gardenStage':0,'boats':0,'lastBoatWish':'','bestSkips':0,'stoneThrows':0,'windmillTurns':0}
        assert state()['settings']['companion']=='spirit'
        page.locator('#settings-button').click();page.locator('#import-file').set_input_files(str(backup))
        page.locator('#confirm-import').click()
        page.wait_for_function('starIsland.snapshot().state.activities.photos===2')
        assert state()['activities']['sandcastle']==3
        checks.append('fixed photo spot, companion off/default, backup/reset/restore')
        page.set_viewport_size({'width':390,'height':844})
        route('sandcastle');page.wait_for_timeout(500)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        bounds=page.locator('#activity-build').bounding_box()
        assert bounds and bounds['y']>=0 and bounds['y']+bounds['height']<=844
        page.screenshot(path=str(OUT/'together-mobile.png'))
        checks.append('390x844 activity layout keeps primary action on screen')
        assert not errors,errors
        report={'passed':checks,'activities':state()['activities'],'browserErrors':errors}
        (OUT/'together-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps(report,ensure_ascii=False))
    except Exception:
        page.screenshot(path=str(OUT/'together-failure.png'))
        print(json.dumps({'checks':checks,'state':state(),'screen':page.evaluate('starIsland.snapshot().screen'),'errors':errors},ensure_ascii=False))
        raise
    finally:browser.close()
