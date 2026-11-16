"""Check every mobile map target is actually tappable and reachable."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True)
    page.goto('http://127.0.0.1:4173')
    page.wait_for_load_state('networkidle')
    page.locator('#start-button').tap()
    page.locator('#dialogue-next').tap()
    try:
        for memory in ['first','know','daily','heal','future']:
            page.locator('#map-button').tap()
            page.wait_for_timeout(300)
            page.screenshot(path=str(root / 'output/mobile-map.png'))
            page.locator(f'.map-pin[data-id="{memory}"]').tap(timeout=4000)
            page.wait_for_function("starIsland.snapshot().screen === 'memory'", timeout=15000)
            page.locator('#collect-memory').tap()
        assert page.evaluate('starIsland.snapshot().state.collected.length') == 5
        print('Passed: five mobile map destinations reached using touch.')
    except Exception:
        page.screenshot(path=str(root / 'output/mobile-map-failure.png'))
        raise
    finally:
        browser.close()
