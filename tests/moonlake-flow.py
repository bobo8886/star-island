"""Original lake art alignment plus real UI optional-quest and return-portal playthrough."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1536,'height':1080})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:4173/assets/moonlake-layout.html')
    page.wait_for_function('window.layoutReady')
    page.screenshot(path=str(ROOT/'output/moonlake-layout.png'))
    page.locator('#geo').check()
    page.screenshot(path=str(ROOT/'output/moonlake-collision.png'))
    page.set_viewport_size({'width':1440,'height':900})
    page.goto('http://127.0.0.1:4173')
    page.wait_for_load_state('networkidle')
    page.locator('#start-button').click();page.locator('#dialogue-next').click()
    def destination(region,target,screen='adventure'):
        page.locator('#map-button').click()
        page.locator(f'.region-tab[data-region="{region}"]').click()
        page.locator(f'.map-destination[data-id="{target}"]').click()
        if screen:
            page.wait_for_function(f"starIsland.snapshot().screen==='{screen}'",timeout=20000)
    def dismiss():
        page.locator('#story-dismiss').click()
        page.wait_for_function("starIsland.snapshot().screen===''")
    destination('lake','moon_kite')
    assert page.locator('#quest-clue').is_visible()
    assert not page.evaluate("starIsland.snapshot().state.exploration.completed.includes('moon_kite')")
    dismiss()
    page.wait_for_timeout(1100)
    page.screenshot(path=str(ROOT/'output/moonlake-ingame.png'))
    for target in ['moon_thread','silver_paper']:
        destination('lake',target)
        assert page.evaluate(f"starIsland.snapshot().state.exploration.found.includes('{target}')")
        dismiss()
    destination('lake','moon_kite');page.locator('#complete-quest').click()
    assert page.evaluate("starIsland.snapshot().state.exploration.completed.includes('moon_kite')")
    assert '月见风筝徽记' in page.locator('.quest-reward').inner_text()
    dismiss()
    for target,choice in [('greenhouse_journal','draw'),('lakeside_blanket','quiet')]:
        destination('lake',target)
        page.locator(f'[data-story-choice="{choice}"]').click()
        assert page.evaluate(f"starIsland.snapshot().state.exploration.choices['{target}']==='{choice}'")
        dismiss()
    # No birthday crystal was needed to enter the fourth region or complete its side quest.
    assert page.evaluate('starIsland.snapshot().state.collected')==[]
    page.reload();page.wait_for_load_state('networkidle')
    assert page.evaluate('starIsland.snapshot().world.region')=='lake'
    assert page.evaluate("starIsland.snapshot().state.exploration.completed.includes('moon_kite')")
    destination('lake','lake-forest',None)
    page.wait_for_function("starIsland.snapshot().world.region==='forest'",timeout=20000)
    destination('forest','forest-lake',None)
    page.wait_for_function("starIsland.snapshot().world.region==='lake'",timeout=20000)
    assert not errors,errors
    report={'passed':['original alpha map layout screenshot','art-aligned collision screenshot','target before materials','two real pickups','optional kite quest','two saved narrative choices','birthday core untouched','lake and side-quest persist after reload','physical forest return and outbound portals'],'browserErrors':errors}
    (ROOT/'output/moonlake-flow-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False));browser.close()
