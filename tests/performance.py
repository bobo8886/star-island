"""Repeatable Canvas CPU submission / rAF profile; not a physical-phone GPU benchmark."""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
label=sys.argv[1] if len(sys.argv)>1 else 'after'
result={'environment':'Microsoft Edge headless, 1440x900, DPR 1, home night, stationary; CPU submission timings, not GPU time', 'samples':[]}
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    for repeat in range(3):
        page=browser.new_page(viewport={'width':1440,'height':900})
        page.goto('http://127.0.0.1:4173');page.wait_for_load_state('networkidle')
        page.locator('#start-button').click();page.locator('#dialogue-next').click()
        page.evaluate('''() => {
          const proto=IslandWorld.prototype, update=proto.update, draw=proto.draw;
          window.samples={update:[],draw:[],interval:[]};let last=0;
          proto.update=function(dt){ this.phase='night';const t=performance.now();update.call(this,dt);samples.update.push(performance.now()-t);if(last)samples.interval.push(t-last);last=t;};
          proto.draw=function(){const t=performance.now();draw.call(this);samples.draw.push(performance.now()-t);};
        }''')
        page.wait_for_timeout(5000)
        stats=page.evaluate('''() => Object.fromEntries(Object.entries(samples).map(([key,a])=>{a=a.slice(30).sort((a,b)=>a-b);return [key,{count:a.length,mean:a.reduce((a,b)=>a+b,0)/a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)]}]}))''')
        result['samples'].append(stats);page.close()
    browser.close()
(ROOT/f'output/performance-{label}.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result))
