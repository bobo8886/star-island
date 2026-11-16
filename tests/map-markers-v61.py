"""All interactions appear in the map chart; numbered pins remain legible."""
import json, math
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/map-markers-v61';OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    for width,height in [(1440,900),(390,844),(844,390)]:
        context=browser.new_context(viewport={'width':width,'height':height})
        page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto('http://127.0.0.1:4173/?qa=map-markers-v61')
        page.wait_for_function('window.starIsland && starIsland.snapshot().world.ready')
        page.locator('#start-button').click();page.locator('#dialogue-next').click()
        page.locator('#map-button').click()
        for region in ['home','forest','coast','lake']:
            page.locator(f'.region-tab[data-region="{region}"]').click()
            page.wait_for_timeout(180)
            report=page.evaluate('''() => {
              const map=document.querySelector('.island-map'),r=map.getBoundingClientRect(),pins=[...map.querySelectorAll('.map-pin')],list=[...document.querySelectorAll('.map-destination')],modal=document.querySelector('#modal');
              return {pins:pins.map((pin,i)=>{const b=pin.getBoundingClientRect();return {id:pin.dataset.id,number:pin.querySelector('b').textContent,label:pin.getAttribute('aria-label'),x:b.x-r.x+b.width/2,y:b.y-r.y+b.height/2,width:b.width,height:b.height,listNumber:list[i].querySelector('.destination-index').textContent,listName:list[i].querySelector('strong').textContent,listId:list[i].dataset.id}}),count:list.length,map:{width:r.width,height:r.height},scrollWidth:modal.scrollWidth,clientWidth:modal.clientWidth};
            }''')
            assert report['count']==len(report['pins']) and report['count']>=6,report
            assert report['scrollWidth']<=report['clientWidth']+1,report
            for i,pin in enumerate(report['pins']):
                assert pin['number']==pin['listNumber']==str(i+1)
                assert pin['id']==pin['listId'] and pin['listName'] in pin['label']
                assert pin['width']>=32 and pin['height']>=32
                assert pin['width']/2<=pin['x']<=report['map']['width']-pin['width']/2
                assert pin['height']/2<=pin['y']<=report['map']['height']-pin['height']/2
                for other in report['pins'][:i]:
                    assert math.hypot(pin['x']-other['x'],pin['y']-other['y'])>=(pin['width']+other['width'])/2-1,(region,width,pin,other)
            page.locator('.island-map').scroll_into_view_if_needed();page.mouse.move(1,1)
            page.screenshot(path=str(OUT/f'{region}-{width}x{height}.png'))
            checks.append({'region':region,'size':[width,height],'locations':report['count'],'noOverlaps':True,'allNamesMapped':True,'noHorizontalOverflow':True})
        context.close()
    browser.close()
assert not errors,errors
result={'checks':checks,'browserErrors':errors}
(OUT/'report.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result))
