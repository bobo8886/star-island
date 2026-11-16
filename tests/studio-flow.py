"""Real UI editing, draft recovery, safe narratives, media, backup and gift export."""
import base64
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'output';errors=[];checks=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':1000},accept_downloads=True)
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto('http://127.0.0.1:4173');page.wait_for_function('window.starIsland && starIsland.snapshot().world.ready')
    def state():return page.evaluate('starIsland.snapshot().state')
    def studio():
        if not page.locator('#gift-studio').is_visible():
            if page.locator('#modal').is_visible():page.locator('#modal-close').click()
            page.locator('#settings-button').click();page.locator('#customize-button').click();page.wait_for_selector('#gift-studio')
    def field(key):
        label=page.evaluate('(id)=>IslandPersonalization.registry().find(f=>f.id===id).label',key)
        page.locator('#studio-search').fill(label)
        return page.locator(f'[data-studio-field="{key}"]')
    def save():
        page.locator('#save-custom').click();expect(page.locator('.studio-status')).to_have_text('已保存到这座星屿')
    try:
        page.locator('#open-studio').click();page.wait_for_selector('#gift-studio')
        assert page.locator('[data-studio-section]').count()==5
        for key,value in {'basic.recipient':'朋友甲','basic.sender':'朋友乙','basic.birthday':'10月8日','basic.girlName':'晴','basic.boyName':'川','basic.guideName':'萤'}.items():field(key).fill(value)
        field('basic.welcomeTitle').fill('给{{recipient}}的小小宇宙')
        field('core.intro').fill('{{recipient}}，{{guide}}在这里等你。')
        field('memory.first.theme').fill('第一束光')
        field('memory.first.text').fill('想对{{recipient}}说的一段真实回忆。')
        field('story.old_note.text').fill('<img src=x onerror="window.injected=true"> {{guide}}替{{recipient}}留了一页谱。')
        field('quest.sky_music.reward').fill('专属旋律')
        field('activity.swing.start').fill('<img src=x onerror="window.injected=true"> {{boy}}轻轻推一下。')
        field('activity.paper_boat.wishes.together.text').fill('陪{{recipient}}慢慢走')
        field('ending.letterHeading').fill('给{{recipient}}的信')
        letter='亲爱的{{recipient}}：\n\n这是一封没有固定收件人的信。\n\n来自{{sender}}。'
        field('core.letter').fill(letter)
        page.locator('#modal-close').click();studio();expect(field('core.letter')).to_have_value(letter)
        assert state()['custom'].get('recipient')!='朋友甲'
        checks.append('unsaved draft survives close and reopen')
        page.locator('[data-studio-section="memories"]').click()
        page.locator('[data-media="first-photo"]').set_input_files({'name':'memory.png','mimeType':'image/png','buffer':base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=')})
        page.locator('[data-studio-section="ending"]').click()
        page.wait_for_function('!document.querySelector("#save-custom").disabled')
        save();checks.append('media survives navigation during upload')
        assert state()['custom']['recipient']=='朋友甲' and state()['custom']['schemaVersion']==2
        assert page.evaluate('ISLAND_ADVENTURE.find(i=>i.id==="old_note").text').endswith('萤替朋友甲留了一页谱。')
        assert page.evaluate('ISLAND_QUESTS.find(i=>i.id==="sky_music").reward')=='专属旋律'
        page.locator('#studio-preview').click();expect(page.locator('.letter-heading')).to_have_text('给朋友甲的信')
        assert page.locator('.studio-preview img').count()==0
        page.screenshot(path=str(OUT/'studio-editor-ending.png'))
        page.locator('#modal-close').click();expect(page.locator('.intro-panel h1')).to_have_text('给朋友甲的小小宇宙')
        page.locator('#start-button').click();expect(page.locator('.dialogue-copy')).to_have_text('朋友甲，萤在这里等你。');page.locator('#dialogue-next').click()
        page.locator('#map-button').click();page.locator('.map-destination[data-id="old_note"]').click();page.wait_for_function('starIsland.snapshot().screen==="adventure"',timeout=20000)
        expect(page.locator('#modal-content')).to_contain_text('<img src=x onerror="window.injected=true"> 萤替朋友甲留了一页谱。')
        assert not page.evaluate('window.injected||false');assert page.locator('#modal-content img').count()==0
        page.locator('#story-dismiss').click();page.locator('#activities-button').click();page.locator('[data-activity-route="swing"]').click();page.wait_for_function('starIsland.snapshot().world.activity?.id==="swing"',timeout=20000)
        expect(page.locator('#activity-status')).to_have_text('<img src=x onerror="window.injected=true"> 川轻轻推一下。')
        assert page.locator('.activity-panel img').count()==0 and not page.evaluate('window.injected||false')
        page.locator('#activity-leave').click();checks.append('edited story/activity/token text renders safely in actual game')
        page.locator('#settings-button').click();page.locator('#setting-music').focus();page.keyboard.press('Home');page.keyboard.press('ArrowRight')
        assert state()['settings']['levels']['music']==.01
        with page.expect_download() as dl:page.locator('#export-button').click()
        backup=OUT/'studio-backup.json';dl.value.save_as(backup);data=json.loads(backup.read_text(encoding='utf-8'))
        assert data['state']['custom']['narrative']['story.old_note.text'].endswith('{{guide}}替{{recipient}}留了一页谱。')
        assert len(data['state']['custom']['narrative'])>200 and data['media']['first-photo'].startswith('data:image/png')
        checks.append('full registry/media/audio levels backed up')
        page.reload();page.wait_for_function('window.starIsland && starIsland.snapshot().world.ready');assert state()['settings']['levels']['music']==.01
        studio();page.locator('#studio-restore').click();page.locator('#studio-cancel-restore').click();assert state()['custom']['recipient']=='朋友甲'
        page.locator('#studio-restore').click();page.locator('#studio-confirm-restore').click();assert state()['custom']['recipient']=='朋友甲';save();assert state()['custom']['recipient']=='收礼人'
        assert page.evaluate('ISLAND_ADVENTURE.find(i=>i.id==="old_note").text').find('onerror')<0
        page.locator('#modal-close').click();page.locator('#settings-button').click();page.locator('#import-file').set_input_files(str(backup));page.locator('#confirm-import').click();page.wait_for_function('starIsland.snapshot().state.custom.recipient==="朋友甲"')
        assert page.evaluate('ISLAND_QUESTS.find(i=>i.id==="sky_music").reward')=='专属旋律'
        checks.append('confirmed template restore and complete backup restore')
        if '--gift' in sys.argv:
            page.locator('#settings-button').click()
            with page.expect_download(timeout=60000) as dl:page.locator('#export-gift').click()
            gift=OUT/'studio-personalized.html';dl.value.save_as(gift)
            exported=browser.new_page(viewport={'width':1440,'height':1000});exported.on('pageerror',lambda error:errors.append(str(error)));exported.goto(gift.as_uri());exported.wait_for_function('window.starIsland && starIsland.snapshot().world.ready',timeout=60000)
            fresh=exported.evaluate('starIsland.snapshot().state');assert not fresh['started'] and fresh['collected']==[] and fresh['exploration']['found']==[]
            assert exported.evaluate('IslandPersonalization.current.recipient')=='朋友甲'
            assert exported.evaluate('ISLAND_ADVENTURE.find(i=>i.id==="old_note").text').endswith('萤替朋友甲留了一页谱。')
            exported.locator('#open-studio').click();exported.wait_for_selector('#gift-studio');assert exported.locator('[name="recipient"]').input_value()=='朋友甲'
            exported.locator('[name="recipient"]').fill('下一位朋友');exported.locator('#save-custom').click();expect(exported.locator('.studio-status')).to_have_text('已保存到这座星屿')
            assert exported.evaluate('ISLAND_ADVENTURE.find(i=>i.id==="old_note").text').endswith('萤替下一位朋友留了一页谱。')
            exported.locator('#studio-restore').click();exported.locator('#studio-confirm-restore').click();exported.locator('#save-custom').click();expect(exported.locator('.studio-status')).to_have_text('已保存到这座星屿')
            assert exported.evaluate('IslandPersonalization.current.recipient')=='收礼人'
            assert exported.evaluate('IslandPersonalization.current.birthday')==''
            cleared=exported.evaluate('IslandStore.mediaAll()');assert len(cleared)==11 and not any(cleared.values())
            exported.close()
            checks.append('offline gift retains all editable narratives and media with fresh progress')
        assert not errors,errors
        result={'passed':checks,'registryFields':page.evaluate('IslandPersonalization.registry().length'),'browserErrors':errors};(OUT/'studio-flow-report.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result))
    except Exception:
        page.screenshot(path=str(OUT/'studio-flow-failure.png'));print(json.dumps({'errors':errors,'screen':page.evaluate('window.starIsland?.snapshot().screen')}));raise
    finally:browser.close()
