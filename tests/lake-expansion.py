"""Play the new rituals and nonlinear lake story through real controls, then reload."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output'
errors=[]
checks=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900},accept_downloads=True)
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:4173/?check=lake')
    page.wait_for_function('window.starIsland && starIsland.snapshot().world.ready')
    def state():return page.evaluate('starIsland.snapshot().state')
    def activity(id):
        if page.locator('#modal').is_visible():page.locator('#modal-close').click()
        page.locator('#activities-button').click()
        page.locator(f'[data-activity-route="{id}"]').click()
        page.wait_for_function('(id)=>starIsland.snapshot().world.activity?.id===id',arg=id,timeout=20000)
    def story(id):
        if page.locator('#modal').is_visible():page.locator('#modal-close').click()
        page.locator('#map-button').click();page.locator('.region-tab[data-region="lake"]').click()
        page.locator(f'.map-destination[data-id="{id}"]').click()
        page.wait_for_function('starIsland.snapshot().screen==="adventure"',timeout=20000)
    try:
        assert page.evaluate('ISLAND_REGIONS.length')==4
        assert page.evaluate('ISLAND_ACTIVITIES.length')==8
        page.locator('#start-button').click();page.locator('#dialogue-next').click()
        page.locator('#character-button').click();page.locator('[data-companion="boy"]').click();page.locator('#character-back').click()
        activity('flower_garden')
        assert state()['region']=='lake'
        page.locator('#activity-garden').click()
        assert state()['activities']['gardenStage']==1
        expect(page.locator('#activity-garden')).to_be_disabled()
        page.locator('#activity-garden').click()
        assert state()['activities']['gardenStage']==2
        assert 'flower_garden' in state()['activities']['completed']
        page.wait_for_timeout(400);page.screenshot(path=str(OUT/'lake-garden.png'))
        page.wait_for_function('!starIsland.snapshot().world.activity.busy')
        checks.append('new lake route, sowing, watering, visible bloom and busy guard')
        activity('paper_boat')
        expect(page.locator('#activity-launch')).to_be_disabled()
        page.locator('[data-boat-wish="together"]').click();page.locator('#activity-launch').click()
        assert state()['activities']['boats']==1 and state()['activities']['lastBoatWish']=='together'
        expect(page.locator('#activity-launch')).to_be_disabled()
        page.wait_for_timeout(1700);page.screenshot(path=str(OUT/'lake-paper-boat.png'))
        checks.append('wish choice, actual boat release and cooldown')
        activity('windmill')
        for _ in range(4):page.locator('#activity-turn').click()
        assert state()['activities']['windmillTurns']==4
        assert 'windmill' in state()['activities']['completed']
        page.wait_for_timeout(300);page.screenshot(path=str(OUT/'lake-windmill.png'))
        checks.append('four hand turns drive rotor and complete wind ritual')
        activity('stone_skip')
        page.locator('#activity-throw').click()
        page.wait_for_function('starIsland.snapshot().world.activity.charge>.75 && starIsland.snapshot().world.activity.charge<.9',timeout=5000)
        page.locator('#activity-throw').click()
        assert 2<=state()['activities']['bestSkips']<=5 and state()['activities']['stoneThrows']==1
        assert 'stone_skip' in state()['activities']['completed']
        expect(page.locator('#activity-throw')).to_be_disabled()
        page.wait_for_timeout(900);page.screenshot(path=str(OUT/'coast-stone-skip.png'))
        checks.append('timed charge, throw, successive water bounces and saved best score')
        # Meet the quest before either material, then collect in freely chosen order.
        objects=page.evaluate('ISLAND_ADVENTURE.filter(i=>i.region==="lake")')
        assert len(objects)==5
        quest=page.evaluate('ISLAND_QUESTS.find(q=>ISLAND_ADVENTURE.some(i=>i.id===q.target&&i.region==="lake"))')
        story(quest['target']);assert page.locator('#complete-quest').count()==0
        page.locator('#story-dismiss').click()
        for id in reversed(quest['requires']):
            story(id);assert id in state()['exploration']['found'];page.locator('#story-dismiss').click()
        story(quest['target']);page.locator('#complete-quest').click();page.locator('#story-dismiss').click()
        for item in objects:
            if item['id'] in state()['exploration']['found']:continue
            story(item['id'])
            if item.get('choices'):page.locator('[data-story-choice]').first.click()
            page.locator('#story-dismiss').click()
        assert all(i['id'] in state()['exploration']['found'] for i in objects)
        assert quest['id'] in state()['exploration']['completed']
        page.screenshot(path=str(OUT/'lake-exploration.png'))
        checks.append('five free-order lake discoveries and material-gated side quest')
        saved=state();page.reload();page.wait_for_function('starIsland.snapshot().world.ready')
        assert state()['region']=='lake' and state()['activities']==saved['activities']
        assert state()['exploration']==saved['exploration'] and state()['settings']['companion']=='boy'
        checks.append('new region, garden, wishes, scores, choices and companion persist')
        for width,height in [(375,667),(844,390)]:
            page.set_viewport_size({'width':width,'height':height})
            for id,button in [('flower_garden','activity-garden'),('paper_boat','activity-launch'),('stone_skip','activity-throw'),('windmill','activity-turn')]:
                activity(id);page.wait_for_timeout(300)
                bounds=page.locator('#'+button).bounding_box()
                assert bounds and bounds['y']>=0 and bounds['y']+bounds['height']<=height,(id,width,bounds)
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                page.screenshot(path=str(OUT/f'lake-{id}-{width}.png'))
        checks.append('all new action buttons visible at 375x667 and 844x390')
        assert not errors,errors
        report={'checks':checks,'activities':state()['activities'],'lakeFound':[i['id'] for i in objects],'browserErrors':errors}
        (OUT/'lake-expansion-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps(report,ensure_ascii=False))
    except Exception:
        page.screenshot(path=str(OUT/'lake-expansion-failure.png'))
        print(json.dumps({'checks':checks,'state':state(),'errors':errors},ensure_ascii=False))
        raise
    finally:browser.close()
