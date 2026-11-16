"""Independent end-to-end side-story flow; no game-state mutation shortcuts."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output'
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900},accept_downloads=True)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:4173');page.wait_for_load_state('networkidle')
    def state(): return page.evaluate('starIsland.snapshot().state')
    def go(id,region):
        if page.locator('#modal').is_visible(): page.locator('#modal-close').click()
        page.locator('#map-button').click()
        page.locator(f'.region-tab[data-region="{region}"]').click()
        page.locator(f'.map-destination[data-id="{id}"]').click()
        page.wait_for_function("starIsland.snapshot().screen==='adventure'",timeout=20000)
    try:
        old=page.evaluate("IslandStore.normalize({version:1,started:true,collected:['first'],settings:{time:'night'}})")
        assert old['region']=='home' and old['exploration']=={'found':[],'completed':[],'choices':{}}
        page.locator('#start-button').click();page.locator('#dialogue-next').click()
        go('flower_bed','forest')
        assert page.locator('#complete-quest').count()==0
        assert 'flower_bed' in state()['exploration']['found']
        page.locator('#story-dismiss').click()
        page.wait_for_timeout(900)
        assert not page.locator('#modal').is_visible(), 'Dismissed contact must not reopen'
        page.keyboard.press('KeyF')
        page.wait_for_function("starIsland.snapshot().screen==='adventure'")
        page.locator('#story-dismiss').click()
        for id,region in [('old_note','home'),('pressed_leaf','forest')]:
            go(id,region)
            assert id in state()['exploration']['found'], 'Interaction must pick up immediately'
            page.locator('#story-dismiss').click()
        go('music_box','home');page.locator('#complete-quest').click()
        assert state()['exploration']['completed']==['sky_music']
        page.locator('#story-dismiss').click()
        for id,region in [('white_shell','coast'),('bottle_letter','coast')]:
            go(id,region);page.locator('#story-dismiss').click()
        go('postbox','home');page.locator('#complete-quest').click();page.locator('#story-dismiss').click()
        for id,region in [('seed_pouch','forest'),('wind_chime','home')]:
            go(id,region);page.locator('#story-dismiss').click()
        go('flower_bed','forest');page.locator('#complete-quest').click();page.locator('#story-dismiss').click()
        assert len(state()['exploration']['completed'])==3
        for id,region,choice in [('fox_trail','forest','leave'),('tea_table','forest',None),('tide_clock','coast','future'),('lighthouse_stone','coast',None),('driftwood','coast',None)]:
            go(id,region)
            if choice: page.locator(f'[data-story-choice="{choice}"]').click()
            page.locator('#story-dismiss').click()
        assert len(state()['exploration']['found'])==14
        assert state()['exploration']['choices']=={'fox_trail':'leave','tide_clock':'future'}
        # Extend the existing trip with the new lake quest and both choice stories.
        go('moon_kite','lake')
        assert page.locator('#complete-quest').count()==0
        page.locator('#story-dismiss').click()
        for id in ['silver_paper','moon_thread']:
            go(id,'lake')
            assert id in state()['exploration']['found']
            page.locator('#story-dismiss').click()
        go('moon_kite','lake');page.locator('#complete-quest').click();page.locator('#story-dismiss').click()
        for id,choice in [('greenhouse_journal','water'),('lakeside_blanket','quiet')]:
            go(id,'lake');page.locator(f'[data-story-choice="{choice}"]').click();page.locator('#story-dismiss').click()
        assert len(state()['exploration']['found'])==19
        assert len(state()['exploration']['completed'])==4
        assert state()['exploration']['choices']=={'fox_trail':'leave','tide_clock':'future','greenhouse_journal':'water','lakeside_blanket':'quiet'}
        page.locator('#exploration-summary').click()
        expect(page.locator('#modal-content')).to_contain_text('阿屿留给你的小纸条')
        assert page.locator('.inventory-item.found').count()==19
        page.screenshot(path=str(OUT/'narrative-inventory.png'))
        page.locator('#modal-close').click()
        page.reload();page.wait_for_load_state('networkidle')
        assert len(state()['exploration']['completed'])==4 and state()['region']=='lake'
        page.locator('#settings-button').click()
        with page.expect_download() as downloaded: page.locator('#export-button').click()
        backup=OUT/'narrative-backup.json';downloaded.value.save_as(backup)
        decoded=json.loads(backup.read_text(encoding='utf-8'))
        assert len(decoded['state']['exploration']['found'])==19
        assert len(decoded['state']['exploration']['completed'])==4
        page.locator('#reset-button').click();page.locator('#confirm-reset').click()
        assert state()['exploration']=={'found':[],'completed':[],'choices':{}}
        page.locator('#import-file').set_input_files(str(backup));page.locator('#confirm-import').click()
        page.wait_for_function('starIsland.snapshot().state.exploration.completed.length===4')
        assert state()['region']=='lake'
        assert state()['exploration']['choices']=={'fox_trail':'leave','tide_clock':'future','greenhouse_journal':'water','lakeside_blanket':'quiet'}
        assert not errors,errors
        report={'found':len(state()['exploration']['found']),'completed':state()['exploration']['completed'],'oldSaveMigration':True,'FRevisit':True,'backupRestore':True,'errors':errors}
        (OUT/'narrative-flow-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
        print(json.dumps(report))
    except Exception:
        page.screenshot(path=str(OUT/'narrative-failure.png'))
        print(json.dumps({'state':state(),'screen':page.evaluate('starIsland.snapshot().screen'),'errors':errors}))
        raise
    finally: browser.close()
