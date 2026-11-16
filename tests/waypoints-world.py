"""Actual waypoint layout and click QA; source stays unmodified."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'output/waypoints';OUT.mkdir(parents=True,exist_ok=True)
errors=[];checks=[];layouts=[]
def overlap(a,b,pad=0):return a['x']<b['x']+b['w']-pad and a['x']+a['w']>b['x']+pad and a['y']<b['y']+b['h']-pad and a['y']+a['h']>b['y']+pad
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge',headless=True)
 context=browser.new_context(viewport={'width':1440,'height':900},device_scale_factor=2)
 page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:4173/?qa=waypoints')
 def seed(region,width=1440,height=900):
  page.set_viewport_size({'width':width,'height':height})
  page.evaluate('(region)=>localStorage.setItem("star-island-v1",JSON.stringify({started:true,region,settings:{time:"day",companion:"boy",reducedMotion:true}}))',region)
  page.reload();page.wait_for_function('window.starIsland && starIsland.snapshot().world.ready && starIsland.snapshot().world.visuals.waypoints?.enabled');page.wait_for_timeout(5000);page.wait_for_function('document.getElementById("toast").hidden');page.wait_for_timeout(400)
 def snap():return page.evaluate('starIsland.snapshot().world.visuals.waypoints')
 def capture(name):
  s=snap();width=page.viewport_size['width'];height=page.viewport_size['height']
  assert s['enabled']
  for item in s['visible']:
   assert 0<item['screenX']<width and 0<item['screenY']<height,(name,item)
  for label in s['labels']:
   r=label['rect'];assert r['x']>=8 and r['y']>=8 and r['x']+r['w']<=width-8 and r['y']+r['h']<=height-8,(name,label)
   assert not any(overlap(r,a,1) for a in s['actors']),(name,label,'actor')
   assert not any(overlap(r,a,1) for a in s['hud']),(name,label,'HUD')
  for i,a in enumerate(s['labels']):
   assert not any(overlap(a['rect'],b['rect'],1) for b in s['labels'][i+1:]),(name,'label collision')
  if s['list']:
   assert not any(overlap(s['list']['rect'],a,1) for a in s['actors']+s['hud']),(name,'list collision')
  (OUT/f'{name}.json').write_text(json.dumps(s,ensure_ascii=False,indent=2),encoding='utf8');page.screenshot(path=str(OUT/f'{name}.png'))
  layouts.append({'name':name,'width':width,'height':height,'visible':len(s['visible']),'labels':len(s['labels']),'listed':s['list']['ids'] if s['list'] else [],'fontPx':s['fontPx']})
  return s
 try:
  for width,height in [(1440,900),(390,844),(375,667),(844,390)]:
   for region in ['home','forest','coast','lake']:
    seed(region,width,height);capture(f'{region}-{width}')
  checks.append('16 actual region/viewport layouts at DPR2; no label-label, actor, HUD or viewport collision')
  seed('coast');s=snap();hit=next(h for h in s['hitRegions'] if h['id']=='white_shell' and h['kind']=='label');r=hit['rect'];page.mouse.click(r['x']+r['w']/2,r['y']+r['h']/2)
  page.wait_for_function('starIsland.snapshot().screen==="adventure"',timeout=20000)
  assert 'white_shell' in page.evaluate('starIsland.snapshot().state.exploration.found');assert not snap()['enabled'];page.locator('#story-dismiss').click();page.wait_for_timeout(500);s=capture('coast-read-story')
  assert next(p for p in s['visible'] if p['id']=='white_shell')['seen'];checks.append('click a nameplate routes to its exact story, opens real dialogue, and preserves checked/re-readable marker')
  page.locator('#map-button').click();page.wait_for_timeout(100);assert not snap()['enabled'];page.locator('#modal-close').click();page.wait_for_timeout(300);assert snap()['enabled'];checks.append('modal pause hides markers and restores them on close')
  for value,delta in [(.7,3000),(1.6,-3000)]:
   page.mouse.move(710,650);page.mouse.wheel(0,delta);page.wait_for_function('(value)=>Math.abs(starIsland.snapshot().world.zoom-value)<.001',arg=value);page.wait_for_timeout(550);s=capture(f'coast-zoom-{value}');assert s['fontPx']==12
  checks.append('zoom 0.7 / 1.6 keeps 12 CSS pixel text and accurate visible positions')
  seed('coast',390,844);s=capture('coast-mobile-route');h=next(h for h in s['hitRegions'] if h['id']=='coast-home' and h['kind'] in ['label','list']);r=h['rect'];page.mouse.click(r['x']+r['w']/2,r['y']+r['h']/2);page.wait_for_function('starIsland.snapshot().world.region==="home"',timeout=20000);checks.append('mobile exit name/list click travels to the next region')
  assert not errors,errors
  report={'checks':checks,'layouts':layouts,'browserErrors':errors,'manualReview':'pending'}
  (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(report,ensure_ascii=False))
 except Exception:
  page.screenshot(path=str(OUT/'failure.png'));(OUT/'failure.json').write_text(json.dumps({'checks':checks,'layouts':layouts,'errors':errors,'snapshot':snap()},ensure_ascii=False,indent=2),encoding='utf8');raise
 finally:browser.close()
