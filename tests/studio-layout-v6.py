"""Real gift-editor layout and stationery review at desktop/mobile sizes."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/studio-v6'
OUT.mkdir(parents=True,exist_ok=True)
errors=[]
checks=[]
letter='亲爱的星星：\n\n想把今天的好天气，和这座小岛一起送给你。\n这里留给我们真实的回忆。\n\n愿你走向喜欢的生活，也随时有停下来休息的自由。\n\n新的一岁，愿小小的期待都慢慢开花。\n\n生日快乐。'
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    for width,height in [(1440,900),(390,844),(375,667),(844,390)]:
        context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=2 if width<500 else 1)
        page=context.new_page()
        page.on('pageerror',lambda err:errors.append(str(err)))
        page.goto('http://127.0.0.1:4173/?qa=studio-layout-v6')
        page.wait_for_function('window.starIsland && starIsland.snapshot().world.ready')
        page.locator('#open-studio').click()
        page.locator('#gift-studio').wait_for()
        page.wait_for_timeout(300)
        page.locator('[data-studio-field="basic.recipient"]').fill('星星')
        page.locator('[data-studio-field="basic.sender"]').fill('小雨')
        page.locator('[data-studio-field="basic.birthday"]').fill('10月8日')
        page.screenshot(path=str(OUT/f'basic-{width}x{height}.png'))
        dims=page.locator('#modal').evaluate('(el)=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,scroll:el.scrollWidth,client:el.clientWidth})')
        assert dims['width']<=width and dims['height']<=height,dims
        assert dims['scroll']<=dims['client']+1,dims
        for selector in ['#save-custom','#studio-preview','#studio-export-gift','#modal-close']:
            box=page.locator(selector).bounding_box()
            assert box and box['x']>=0 and box['y']>=0 and box['x']+box['width']<=width+1 and box['y']+box['height']<=height+1,(width,height,selector,box)
        page.locator('[data-studio-section="exploration"]').click()
        page.locator('#studio-group-select').wait_for()
        assert page.locator('#studio-group-select option').count()>25
        page.locator('#studio-search').fill('纸船')
        assert page.locator('.studio-field').count()>0
        page.screenshot(path=str(OUT/f'exploration-{width}x{height}.png'))
        page.locator('[data-studio-section="ending"]').click()
        page.locator('[data-studio-field="core.letter"]').fill(letter)
        if width<=1100:page.locator('#studio-preview').click()
        assert '这里留给我们真实的回忆' in page.locator('.studio-preview .letter-body').inner_text()
        page.screenshot(path=str(OUT/f'letter-{width}x{height}.png'))
        page.locator('#save-custom').click()
        page.wait_for_function('document.querySelector(".studio-status").dataset.dirty==="false"')
        data=page.evaluate('IslandPersonalization.resolve(starIsland.snapshot().state.custom)')
        assert data['recipient']=='星星' and data['sender']=='小雨' and data['letter']==letter
        if width==1440:
            html=page.evaluate('(c)=>IslandStationery.document(c)',data)
            (OUT/'letter-example.html').write_text(html,encoding='utf-8')
            doc=context.new_page()
            doc.set_content(html)
            doc.screenshot(path=str(OUT/'letter-document-desktop.png'),full_page=True)
            doc.set_viewport_size({'width':390,'height':844})
            doc.screenshot(path=str(OUT/'letter-document-mobile.png'),full_page=True)
            assert doc.evaluate('document.documentElement.scrollWidth<=innerWidth')
            doc.close()
        checks.append({'size':[width,height],'noOverflow':True,'saveControlsVisible':True,'groups':True,'liveLetter':True,'saved':True})
        context.close()
    browser.close()
assert not errors,errors
report={'checks':checks,'browserErrors':errors}
(OUT/'layout-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
