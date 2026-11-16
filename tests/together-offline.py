"""Verify new activities and real PNG export from the fully offline deliverable."""
import json
import struct
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
errors, requests = [], []
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900}, accept_downloads=True)
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: requests.append(request.url))
    page.goto((ROOT / '星屿寻迹.html').as_uri())
    page.wait_for_function('window.starIsland && starIsland.snapshot().world.ready')
    assert page.evaluate('starIsland.snapshot().world.visuals.character') == 'reference-atlas'
    assert page.evaluate('IslandCharacter.size.width') == 160
    assert page.evaluate('IslandCharacter.motionRendering') == 'full-pose-atlas-v6'
    assert page.evaluate('IslandPersonalization.registry().length') == 301
    assert page.evaluate('typeof IslandStationery.document') == 'function'
    assert page.evaluate('typeof IslandFireworks') == 'function'
    assert page.evaluate('typeof IslandWaypoints') == 'function'
    assert not page.evaluate('starIsland.snapshot().world.visuals.fireworks.enabled')
    assert page.locator('#open-studio').count() == 1
    expected_frames = ['character-idle-v6.png'] + [f'{person}-walk-{direction}-v6.png' for person in ['character', 'companion'] for direction in ['side', 'front', 'back']]
    assert page.evaluate('(names) => names.every(name => ISLAND_ASSETS["assets/"+name]?.startsWith("data:image/png"))', expected_frames)
    assert page.evaluate('Object.keys(ISLAND_ASSETS).length') == 17
    assert page.evaluate('IslandSandcastle.loaded')
    assert page.evaluate('starIsland.snapshot().state.settings.companion') == 'spirit'
    page.locator('#start-button').click()
    page.locator('#dialogue-next').click()
    page.locator('#character-button').click()
    page.locator('[data-character-variant="boy"]').click()
    page.wait_for_function('document.querySelector(".character-design-image").naturalWidth > 0')
    assert page.locator('.character-design-image').get_attribute('src').startswith('data:image/png')
    page.locator('[data-companion="boy"]').click()
    page.locator('#character-back').click()
    page.locator('#activities-button').click()
    page.locator('[data-activity-route="swing"]').click()
    page.wait_for_function('starIsland.snapshot().world.activity?.id === "swing"', timeout=20000)
    assert page.evaluate('starIsland.snapshot().world.visuals.scenery.waterAccurate')
    page.locator('#activity-push').click()
    page.wait_for_timeout(800)
    page.locator('#activity-photo').click()
    with page.expect_download() as captured:
        page.locator('#photo-download').click()
    postcard = ROOT / 'output/together-offline-postcard.png'
    captured.value.save_as(postcard)
    raw = postcard.read_bytes()
    assert raw[:8] == b'\x89PNG\r\n\x1a\n'
    dimensions = struct.unpack('>II', raw[16:24])
    assert dimensions == (1600, 1080), dimensions
    assert page.locator('#world').evaluate('(canvas) => canvas.width === innerWidth')
    page.locator('#photo-back').click()
    page.locator('#settings-button').click()
    with page.expect_download() as gift:
        page.locator('#export-gift').click()
    exported = ROOT / 'output/together-test-gift.html'
    gift.value.save_as(exported)
    recipient = browser.new_page(accept_downloads=True)
    recipient.on('pageerror', lambda error: errors.append(str(error)))
    recipient.on('request', lambda request: requests.append(request.url))
    recipient.goto(exported.as_uri())
    recipient.wait_for_function('window.starIsland && starIsland.snapshot().world.ready')
    assert recipient.evaluate('IslandCharacter.motionRendering') == 'full-pose-atlas-v6'
    assert recipient.evaluate('IslandPersonalization.registry().length') == 301
    assert recipient.evaluate('(names) => names.every(name => ISLAND_ASSETS["assets/"+name]?.startsWith("data:image/png"))', expected_frames)
    state = recipient.evaluate('starIsland.snapshot().state')
    assert state['settings']['companion'] == 'boy'
    assert state['activities'] == {'sandcastle':0,'completed':[],'photos':0,'gardenStage':0,'boats':0,'lastBoatWish':'','bestSkips':0,'stoneThrows':0,'windmillTurns':0}
    assert state['collected'] == [] and state['exploration']['found'] == []
    assert recipient.evaluate("['companion-design.png','character-atlas.png','companion-atlas.png','sandcastle-stages.png','forest.png','coast.png','moonlake.png','lake-props.png'].every(name => ISLAND_ASSETS['assets/'+name].startsWith('data:image/png'))")
    recipient.locator('#start-button').click()
    recipient.locator('#dialogue-next').click()
    recipient.locator('#activities-button').click()
    recipient.locator('[data-activity-route="sandcastle"]').click()
    recipient.wait_for_function('starIsland.snapshot().world.activity?.id === "sandcastle"', timeout=20000)
    assert recipient.evaluate('starIsland.snapshot().world.visuals.scenery.waterAccurate')
    for step in range(3):
        recipient.locator('#activity-build').click()
    assert recipient.evaluate('starIsland.snapshot().state.activities.sandcastle') == 3
    recipient.locator('#activity-leave').click()
    recipient.locator('#activities-button').click();recipient.locator('[data-activity-route="flower_garden"]').click()
    recipient.wait_for_function('starIsland.snapshot().world.activity?.id === "flower_garden"',timeout=20000)
    assert recipient.evaluate('IslandPastimes.art().loaded && IslandPastimes.art().parts.length === 4')
    assert recipient.evaluate('starIsland.snapshot().world.visuals.scenery.waterAccurate')
    recipient.locator('#activity-garden').click();recipient.locator('#activity-garden').click()
    assert recipient.evaluate('starIsland.snapshot().state.activities.gardenStage') == 2
    recipient.locator('#activity-leave').click()
    recipient.locator('#activities-button').click();recipient.locator('[data-activity-route="paper_boat"]').click()
    recipient.wait_for_function('starIsland.snapshot().world.activity?.id === "paper_boat"',timeout=20000)
    recipient.locator('[data-boat-wish="peace"]').click();recipient.locator('#activity-launch').click()
    assert recipient.evaluate('starIsland.snapshot().state.activities.boats') == 1
    assert not errors, errors
    assert not any(url.startswith('http') for url in requests)
    browser.close()
result = {'offlineActivities': ['swing', 'sandcastle', 'photo','flower_garden','paper_boat'], 'postcardDimensions': list(dimensions), 'boyArtEmbedded': True, 'referenceAtlasInWorld': True, 'motionRendering':'full-pose-atlas-v6', 'walkAndIdleAssetsEmbedded':expected_frames, 'totalEmbeddedAssets':17, 'editableFields':301, 'stationeryEmbedded':True, 'sandcastleAtlasEmbedded': True, 'moonlakeAndPropsEmbedded':True,'waterMasksReadableOffline': True, 'giftKeepsCompanion': True, 'freshGiftProgress': True, 'httpRequests': 0, 'browserErrors': errors}
(ROOT / 'output/together-offline-report.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
print(json.dumps(result))
