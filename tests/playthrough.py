"""End-to-end playthrough using real UI inputs, without mutation shortcuts.
Run with a local server on port 4173: python tests/playthrough.py
Uses installed Microsoft Edge through Playwright.
"""
import json
import math
import re
import wave
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output"
URL = "http://127.0.0.1:4173"
OUT.mkdir(exist_ok=True)
errors = []
checks = []
LONG_LETTER = '\n\n'.join([
    '亲爱的{{recipient}}：',
    '这是安全显示测试：<script>window.__letterInjected = true</script> 与 <img src=x onerror="window.__letterInjected=true"> 都应该作为普通文字留在纸上。',
    *[f'第 {i:02d} 段 · 我想把这一段安静的时光写给你。' + '愿我们记得沿途的微光，也记得为喜欢的事留一点时间。' * 4 for i in range(1,17)],
    '最后一段 · 星光会记住这封长信的结尾。\n愿你平安，也愿你自由。'
])


def snapshot(page):
    return page.evaluate("starIsland.snapshot()")


def boot(page):
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(URL)
    page.wait_for_load_state("networkidle")
    page.wait_for_function("window.starIsland && starIsland.snapshot().world.ready")


def screen(page, name):
    page.wait_for_function("name => starIsland.snapshot().screen === name", arg=name, timeout=20000)
    page.wait_for_timeout(300)


def go(page, destination, expected):
    page.locator("#map-button").click()
    page.locator(f'.map-pin[data-id="{destination}"]').click()
    screen(page, expected)
    assert snapshot(page)["world"]["walkable"], destination


def close(page):
    page.locator("#modal-close").click()
    page.wait_for_function("!document.getElementById('modal').open")


def start(page):
    page.locator("#start-button").click()
    page.locator("#dialogue-next").click()
    page.wait_for_function("!starIsland.snapshot().world.paused")


def letter_card(page, browser, stem, expected_letter):
    """Save through the actual ending button, then open the self-contained result."""
    with page.expect_download() as pending:
        page.locator('#save-letter-card').click()
    path=OUT/f'{stem}.html';pending.value.save_as(path)
    assert pending.value.suggested_filename.endswith('.html')
    card_context=browser.new_context(viewport={'width':900,'height':1000})
    card=card_context.new_page();requests=[]
    card.on('request',lambda request:requests.append(request.url))
    card.on('pageerror',lambda error:errors.append(str(error)))
    card.goto(path.as_uri());card.wait_for_load_state('networkidle')
    paragraphs=re.split(r'\n[\t ]*\n',expected_letter.replace('\r\n','\n'))
    assert card.locator('.letter-body p').all_text_contents()==paragraphs
    assert card.locator('.letter-body script,.letter-body img').count()==0
    assert card.evaluate('window.__letterInjected') is None
    assert not any(url.startswith('http') for url in requests),requests
    assert card.evaluate('document.documentElement.scrollWidth<=innerWidth')
    card.screenshot(path=str(OUT/f'{stem}.png'),full_page=True)
    card.set_viewport_size({'width':390,'height':844})
    card.locator('.letter-body p').last.scroll_into_view_if_needed()
    expect(card.locator('.letter-body p').last).to_be_visible()
    assert card.evaluate('document.documentElement.scrollWidth<=innerWidth')
    card.screenshot(path=str(OUT/f'{stem}-mobile-end.png'))
    card_context.close()


def route_activity(page,activity,region):
    page.locator('#activities-button').click()
    page.locator(f'[data-activity-route="{activity}"]').click()
    screen(page,'activity')
    assert snapshot(page)['world']['region']==region
    assert snapshot(page)['world']['walkable']


with sync_playwright() as pw:
    browser = pw.chromium.launch(channel="msedge", headless=True)
    context = browser.new_context(viewport={"width":1440,"height":900}, device_scale_factor=1, timezone_id="Asia/Shanghai", accept_downloads=True)
    page = context.new_page()
    try:
        boot(page)
        page.screenshot(path=str(OUT / "desktop-initial.png"))
        assert snapshot(page)["state"]["collected"] == []
        start(page)
        page.wait_for_timeout(300)
        before = snapshot(page)["world"]["player"]
        page.keyboard.down("ArrowLeft")
        page.wait_for_timeout(320)
        page.keyboard.up("ArrowLeft")
        after = snapshot(page)["world"]["player"]
        assert after["x"] < before["x"] - 30, "Keyboard walking"
        page.keyboard.press("Space")
        page.wait_for_timeout(120)
        assert snapshot(page)["world"]["player"]["jump"] > 0, "Jump animation"
        page.wait_for_timeout(650)
        assert snapshot(page)["world"]["player"]["jump"] == 0
        checks.append("keyboard walking, jump and landing")
        page.locator("#sound-button").click()
        assert snapshot(page)["state"]["settings"]["sound"]
        page.locator("#sound-button").click()
        checks.append("audio toggle")
        # A collision stress check: walk into the southern edge and remain on land.
        page.keyboard.down("ArrowDown")
        page.wait_for_timeout(1400)
        page.keyboard.up("ArrowDown")
        assert snapshot(page)["world"]["walkable"]
        checks.append("island boundary collision")
        # The gate cannot reveal the ending early.
        go(page, "observatory", "default")
        assert "5" in page.locator("#modal-content").inner_text()
        assert not snapshot(page)["state"]["finished"]
        close(page)
        checks.append("observatory gated before all five memories")

        for i, memory in enumerate(["first","know","daily","heal","future"]):
            go(page, memory, "memory")
            if i == 0:
                page.screenshot(path=str(OUT / "memory-dialog.png"))
            page.locator("#collect-memory").click()
            page.wait_for_function("count => starIsland.snapshot().state.collected.length === count", arg=i+1)
        checks.append("all five memories collected by actual cross-island navigation")
        page.screenshot(path=str(OUT / "desktop-exploring.png"))

        go(page, "campfire", "dialogue")
        for _ in range(4):
            page.locator("#dialogue-next").click()
        assert snapshot(page)["state"]["campfireSeen"]
        checks.append("four-page seated campfire conversation")
        # Override calendar time only. Playwright's clock installer also changes
        # rAF's timestamp origin, which is unrelated to the late-night story.
        page.evaluate("""()=>{const OriginalDate=Date,fixed=Date.parse('2026-11-16T16:30:00Z');window.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}};}""")
        go(page, "tent", "tent")
        assert "晚安" in page.locator("#modal-content").inner_text()
        page.locator("#leave-tent").click()
        assert snapshot(page)["state"]["nightSeen"]
        checks.append("tent interior and 00:30 Beijing goodnight secret")

        go(page, "observatory", "constellation")
        page.locator('[data-star="3"]').click()
        assert not snapshot(page)["state"]["finished"]
        expect(page.locator("#constellation-progress")).to_contain_text(page.evaluate('IslandPersonalization.current.memories[0].theme'))
        page.locator("#star-hint").click()
        expect(page.locator('[data-star="0"]')).to_have_class("star-node hint")
        page.screenshot(path=str(OUT / "constellation.png"))
        for i in range(5):
            page.locator(f'[data-star="{i}"]').click()
        screen(page, "finale")
        page.screenshot(path=str(OUT / "birthday-finale.png"))
        page.locator("#open-gift").click()
        screen(page, "letter")
        expected=page.evaluate('IslandPersonalization.current')
        expect(page.locator(".keepsake-ticket h3")).to_have_text(expected['giftTitle'])
        expect(page.locator('.letter-addressee strong')).to_have_text(expected['recipient'])
        assert page.locator('.letter-body p').count()>=5
        camera=snapshot(page)['world']['camera']
        assert all(math.isfinite(value) and abs(value)<10000 for value in camera.values()),camera
        page.screenshot(path=str(OUT/'birthday-letter-final.png'))
        with page.expect_download() as letter:
            page.locator("#save-letter").click()
        assert expected['letter'] in Path(letter.value.path()).read_text(encoding="utf-8")
        letter_card(page,browser,'birthday-letter-card',expected['letter'])
        close(page)
        checks.append("wrong-star feedback, hint, constellation, birthday, new stationery, text and offline HTML letter downloads")

        page.reload()
        page.wait_for_load_state("networkidle")
        assert snapshot(page)["state"]["finished"]
        assert len(snapshot(page)["state"]["collected"]) == 5
        page.locator("#journal-button").click()
        assert page.locator(".journal-entry.locked").count() == 0
        close(page)
        checks.append("refresh persistence and memory journal")

        page.locator("#settings-button").click()
        page.locator("#setting-time").select_option("day")
        assert snapshot(page)["world"]["phase"] == "day"
        page.locator("#setting-time").select_option("night")
        page.locator("#setting-motion").check()
        assert snapshot(page)["state"]["settings"]["reducedMotion"]
        page.locator("#customize-button").click()
        page.locator('[name="recipient"]').fill("姐姐测试")
        page.locator('[data-studio-section="memories"]').click()
        page.locator('[name="title-0"]').fill("我们的第一颗星")
        page.locator('[name="text-0"]').fill("这是一段通过界面写入、保存并恢复的真实测试回忆。")
        page.locator('[data-media="first-photo"]').set_input_files(str(ROOT / "assets/island.png"))
        with wave.open(str(OUT / "test-voice.wav"), "wb") as wav:
            wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(8000); wav.writeframes(b"\0\0"*1600)
        page.locator('[data-media="first-audio"]').set_input_files(str(OUT / "test-voice.wav"))
        expect(page.locator("#save-custom")).to_be_enabled()
        page.locator('[data-studio-section="ending"]').click()
        page.locator('[data-studio-field="core.letter"]').fill(LONG_LETTER)
        page.locator("#save-custom").click()
        page.wait_for_function("letter=>starIsland.snapshot().state.custom.letter===letter",arg=LONG_LETTER)
        expect(page.locator('.studio-status')).to_have_attribute('data-dirty','false')
        close(page)
        page.locator("#journal-button").click()
        page.locator('[data-memory="first"]').click()
        expect(page.locator("#modal h2")).to_have_text("我们的第一颗星")
        assert page.locator(".memory-art img").count() == 1
        assert page.locator("audio").count() == 1
        close(page)
        page.reload(); page.wait_for_load_state("networkidle")
        page.locator("#journal-button").click(); page.locator('[data-memory="first"]').click()
        expect(page.locator("#modal h2")).to_have_text("我们的第一颗星")
        assert page.locator(".memory-art img").count() == 1
        close(page)
        checks.append("custom messages, recipient, photo and voice survive refresh")
        page.locator('#journal-button').click();page.locator('#reread-letter').click()
        rendered_letter=LONG_LETTER.replace('{{recipient}}','姐姐测试')
        assert page.locator('.letter-body p').all_text_contents()==re.split(r'\n[\t ]*\n',rendered_letter)
        assert page.locator('.letter-body script,.letter-body img').count()==0
        assert page.evaluate('window.__letterInjected') is None
        assert page.locator('.letter-body').evaluate("el=>getComputedStyle(el).maxHeight==='none'&&getComputedStyle(el).overflowY==='visible'")
        page.locator('.letter-body p').last.scroll_into_view_if_needed()
        expect(page.locator('.letter-body p').last).to_be_visible()
        assert page.locator('#modal').evaluate('el=>el.scrollWidth<=el.clientWidth+1')
        letter_card(page,browser,'birthday-long-letter-safe',rendered_letter)
        with page.expect_download() as long_text:page.locator('#save-letter').click()
        assert rendered_letter in Path(long_text.value.path()).read_text(encoding='utf-8')
        close(page)
        checks.append('long multi-paragraph letter saved through studio, HTML escaped, last paragraph reachable, safe standalone card/mobile download')
        page.locator("#settings-button").click()
        with page.expect_download() as backup:
            page.locator("#export-button").click()
        backup_path = OUT / "test-backup.json"
        backup.value.save_as(backup_path)
        saved = json.loads(backup_path.read_text(encoding="utf-8"))
        assert saved["state"]["custom"]["recipient"] == "姐姐测试"
        assert len(saved["media"]) == 2
        # Export a personalized playable gift; its recipient starts with no collected memories.
        with page.expect_download() as gift:
            page.locator("#export-gift").click()
        gift_path = OUT / "test-gift.html"
        gift.value.save_as(gift_path)
        gift_context = browser.new_context(viewport={"width":1280,"height":800})
        gift_page = gift_context.new_page()
        gift_requests = []
        gift_page.on("pageerror", lambda error: errors.append(str(error)))
        gift_page.on("request", lambda request: gift_requests.append(request.url))
        gift_page.goto(gift_path.as_uri()); gift_page.wait_for_load_state("networkidle")
        gift_page.wait_for_function("window.starIsland && starIsland.snapshot().world.ready")
        assert not snapshot(gift_page)["state"]["started"]
        assert snapshot(gift_page)["state"]["collected"] == []
        assert gift_page.evaluate("ISLAND_CONTENT.recipient") == "姐姐测试"
        assert not any(url.startswith("http") for url in gift_requests)
        start(gift_page);go(gift_page,"first","memory")
        expect(gift_page.locator("#modal h2")).to_have_text("我们的第一颗星")
        assert gift_page.locator(".memory-art img").count() == 1
        assert gift_page.locator("audio").count() == 1
        gift_page.locator("#collect-memory").click()
        gift_page.locator("#settings-button").click()
        with gift_page.expect_download() as second_gift:
            gift_page.locator("#export-gift").click()
        assert Path(second_gift.value.path()).stat().st_size > 3000000
        gift_context.close()
        checks.append("personalized single HTML: offline, photos/voice embedded, fresh recipient progress, re-export")
        page.locator("#reset-button").click();page.locator("#confirm-reset").click()
        assert not snapshot(page)["state"]["started"]
        assert snapshot(page)["state"]["custom"]["recipient"] == "姐姐测试"
        page.locator("#import-file").set_input_files(str(backup_path))
        page.locator("#confirm-import").click()
        page.wait_for_function("starIsland.snapshot().state.finished")
        assert len(snapshot(page)["state"]["collected"]) == 5
        checks.append("complete export, reset retaining personalization, backup restore")
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")

        # Sample one original activity in every region after completing/restoring
        # the birthday story. Navigation and completion use actual visible controls.
        route_activity(page,'photo','home');page.locator('#activity-shutter').click();screen(page,'photo')
        assert snapshot(page)['state']['activities']['photos']>0
        page.locator('#photo-back').click()
        route_activity(page,'swing','forest');page.locator('#activity-push').click()
        assert 'swing' in snapshot(page)['state']['activities']['completed']
        page.locator('#activity-leave').click()
        route_activity(page,'sandcastle','coast')
        for stage in [1,2,3]:
            page.locator('#activity-build').click()
            assert snapshot(page)['state']['activities']['sandcastle']==stage
        page.locator('#activity-leave').click()
        route_activity(page,'flower_garden','lake')
        page.locator('#activity-garden').click();page.wait_for_timeout(900)
        assert snapshot(page)['state']['activities']['gardenStage']==1
        page.locator('#activity-garden').click();page.wait_for_timeout(900)
        assert snapshot(page)['state']['activities']['gardenStage']==2
        page.locator('#activity-leave').click()
        assert set(snapshot(page)['state']['visitedRegions'])=={'home','forest','coast','lake'}
        page.screenshot(path=str(OUT/'birthday-four-region-after.png'))
        checks.append('post-ending four-region real navigation and home photo, forest swing, coast sandcastle, lake flower garden')

        # Mobile starts clean and uses actual pointer events on the virtual joystick.
        mobile_context = browser.new_context(viewport={"width":390,"height":844},device_scale_factor=2,is_mobile=True,has_touch=True,timezone_id="Asia/Shanghai")
        mobile = mobile_context.new_page()
        boot(mobile)
        mobile.screenshot(path=str(OUT / "mobile-initial.png"))
        start(mobile);mobile.wait_for_timeout(800)
        initial = snapshot(mobile)["world"]["player"]
        box = mobile.locator("#joystick").bounding_box()
        x,y=box["x"]+box["width"]/2,box["y"]+box["height"]/2
        mobile.mouse.move(x,y);mobile.mouse.down();mobile.mouse.move(x-25,y);mobile.wait_for_timeout(400);mobile.mouse.up()
        assert snapshot(mobile)["world"]["player"]["x"] < initial["x"]-20
        mobile.locator("#jump-button").tap();mobile.wait_for_timeout(120)
        assert snapshot(mobile)["world"]["player"]["jump"] > 0
        mobile.wait_for_timeout(600)
        mobile.screenshot(path=str(OUT / "mobile-exploring.png"))
        go(mobile,"first","memory")
        mobile.locator("#collect-memory").tap()
        assert snapshot(mobile)["state"]["collected"] == ["first"]
        for width,height in [(375,667),(844,390)]:
            mobile.set_viewport_size({"width":width,"height":height})
            mobile.wait_for_timeout(300)
            assert mobile.evaluate("document.documentElement.scrollWidth <= innerWidth")
            mobile.locator("#settings-button").tap()
            expect(mobile.locator("#customize-button")).to_be_visible()
            close(mobile)
            mobile.screenshot(path=str(OUT / f"mobile-{width}x{height}.png"))
        checks.append("390x844 touch joystick, jump, memory; 375x667 and 844x390 responsive dialogs")
        mobile_context.close()

        # The standalone file must also boot without a web server or network dependencies.
        offline = context.new_page()
        offline.goto((ROOT/"index.html").as_uri())
        offline.wait_for_load_state("networkidle")
        offline.wait_for_function("window.starIsland && starIsland.snapshot().world.ready")
        assert offline.title().startswith("星屿寻迹")
        offline.close()
        checks.append("file:// standalone offline boot")
        assert not errors, errors
        report={"passed":checks,"browserErrors":errors,"isolatedBrowserContext":True,"longLetterCharacters":len(LONG_LETTER),"longLetterParagraphs":len(re.split(r'\n[\t ]*\n',LONG_LETTER)),"endingScreenshots":["birthday-finale.png","birthday-letter-final.png","birthday-letter-card.png","birthday-long-letter-safe.png","birthday-long-letter-safe-mobile-end.png"]}
        (OUT/"verification.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
        (OUT/"birthday-mainline-v6-report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
        print(json.dumps({"passed":len(checks),"browserErrors":errors},ensure_ascii=True))
    except Exception:
        page.screenshot(path=str(OUT/"failure.png"))
        print(json.dumps({"completed":checks,"errors":errors,"snapshot":snapshot(page)},ensure_ascii=True))
        raise
    finally:
        context.close()
        browser.close()
