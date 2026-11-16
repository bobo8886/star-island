"""Layout and real art checks for the together edition, including compact screens."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
errors = []
checks = []
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    for width, height in [(1440, 900), (390, 844), (375, 667), (844, 390)]:
        density = 3 if width == 390 else 1
        page = browser.new_page(viewport={'width': width, 'height': height}, has_touch=width < 900, device_scale_factor=density)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto('http://127.0.0.1:4173/?test=together-layout')
        page.wait_for_load_state('networkidle')
        page.locator('#start-button').click()
        page.locator('#dialogue-next').click()
        page.wait_for_timeout(350)
        assert page.locator('#world').evaluate('(canvas) => canvas.width === Math.round(innerWidth * Math.min(devicePixelRatio, 2))')
        page.locator('#activities-button').click()
        page.wait_for_timeout(350)
        expected_cards = page.evaluate('ISLAND_ACTIVITIES.length')
        assert expected_cards >= 8
        assert page.locator('.activity-card').count() == expected_cards
        assert page.locator('.activity-card-art').evaluate_all('(images) => images.every(img => img.complete && img.naturalWidth > 0)')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert page.locator('#modal').evaluate('(el) => el.scrollWidth <= el.clientWidth + 1')
        page.screenshot(path=str(ROOT / f'output/together-hub-{width}x{height}.png'))
        page.locator('#modal-close').click()
        page.locator('#character-button').click()
        page.locator('[data-character-variant="boy"]').click()
        page.wait_for_function('document.querySelector(".character-design-image").naturalWidth > 0')
        assert page.locator('[data-companion]').count() == 3
        page.locator('[data-companion="boy"]').click()
        assert page.locator('[data-companion="boy"]').get_attribute('aria-pressed') == 'true'
        page.screenshot(path=str(ROOT / f'output/together-character-{width}x{height}.png'))
        page.locator('#character-back').click()
        page.wait_for_timeout(900)
        page.screenshot(path=str(ROOT / f'output/together-world-{width}x{height}.png'))
        checks.append({'viewport': [width, height], 'devicePixelRatio': density, 'canvasDensityCap': min(density, 2), 'hubCards': expected_cards, 'artLoaded': True, 'noOverflow': True, 'companionControls': True})
        page.close()
    browser.close()
assert not errors, errors
result = {'layouts': checks, 'browserErrors': errors}
(ROOT / 'output/together-layout-report.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
print(json.dumps(result))
