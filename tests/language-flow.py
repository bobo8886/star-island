"""Real UI bilingual journey, template preservation, exports and mobile layout."""
from pathlib import Path
import json,re
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'output/language';OUT.mkdir(parents=True,exist_ok=True)
report={'errors':[],'checks':[],'screens':[]}
def check(name):report['checks'].append(name);print(name,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(channel='msedge',headless=True);ctx=b.new_context(viewport={'width':1440,'height':900},accept_downloads=True);page=ctx.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
 def snap():return page.evaluate('starIsland.snapshot()')
 def shot(name):page.wait_for_timeout(250);page.screenshot(path=str(OUT/(name+'.png')));report['screens'].append(name)
 def clean(name):
  text=page.locator('body').inner_text();text=text.replace('中 / EN','')
  han=re.findall(r'[\u3400-\u9fff]+',text)
  assert not han,(name,han,text)
 def close():page.locator('#modal-close').click()
 def go(region,item,screen):
  page.locator('#map-button').click();page.locator(f'.region-tab[data-region="{region}"]').click();page.locator(f'.map-pin[data-id="{item}"]').click();page.wait_for_function('s=>starIsland.snapshot().screen===s',arg=screen,timeout=45000)
 try:
  page.goto('http://127.0.0.1:4173');page.wait_for_function('window.starIsland && starIsland.snapshot().world.ready')
  expect(page.locator('#language-dialog')).to_be_visible();expect(page.locator('input[value="zh-CN"]')).to_be_checked();shot('choose-desktop');check('First visit: Chinese selected, language dialog visible')
  page.locator('input[value="en"]').check();page.locator('#language-confirm').click();page.wait_for_function('document.documentElement.lang==="en" && window.starIsland && starIsland.snapshot().world.ready');clean('welcome');shot('english-welcome')
  check('English selected via real UI and remembered')
  page.locator('#start-button').click();clean('intro');page.locator('#dialogue-next').click()
  for i,item in enumerate(['first','know','daily','heal','future']):
   go('home',item,'memory');clean(item)
   if i==0:shot('english-memory')
   page.locator('#collect-memory').click();page.wait_for_function('n=>starIsland.snapshot().state.collected.length===n',arg=i+1)
  go('home','observatory','constellation');clean('constellation')
  for i in range(5):page.locator(f'[data-star="{i}"]').click()
  page.wait_for_function('starIsland.snapshot().screen==="finale"');clean('finale');shot('english-finale');page.locator('#open-gift').click();clean('ending-letter');shot('english-ending');page.locator('#back-island').click();page.wait_for_timeout(1500)
  assert snap()['world']['visuals']['fireworks']['text']=='Happy Birthday!';check('Five English memories, constellation, finale, letter and fireworks')
  for region,item in [('forest','tea_table'),('coast','tide_clock'),('lake','greenhouse_journal')]:
   go(region,item,'adventure');clean(region);shot('english-'+region);page.locator('#story-dismiss').click()
  page.locator('#activities-button').click();clean('activities');page.locator('[data-activity-route="sandcastle"]').click();page.wait_for_function('starIsland.snapshot().screen==="activity"');clean('sandcastle');page.locator('#activity-build').click();page.locator('#activity-leave').click();check('English regional stories and activity controls')
  go('home','tree','tree-letter');clean('tree-letter');page.locator('[data-letter-action="sample"]').click();shot('english-tree')
  page.locator('[data-letter-action="generate"]').click();page.wait_for_selector('.tree-letter.is-export');page.wait_for_function('document.querySelector(".tree-letter").getAttribute("aria-busy")==="false"');clean('tree-export')
  with page.expect_download() as dl:page.locator('[data-letter-action="download"]').click()
  dl.value.save_as(str(OUT/'english-letter.png'));close();check('English wishing-tree letter and actual PNG download')
  page.locator('#settings-button').click();clean('settings');page.locator('#customize-button').click();clean('studio');shot('english-studio')
  page.locator('[data-studio-field="basic.recipient"]').fill('My special friend');page.locator('#save-custom').click();page.wait_for_timeout(300);close()
  before=snap()['state'];page.locator('#language-button').click();page.locator('input[value="zh-CN"]').check();page.locator('#language-confirm').click();page.wait_for_function('document.documentElement.lang==="zh-CN" && window.starIsland && starIsland.snapshot().world.ready')
  after=snap()['state'];assert after['collected']==before['collected'] and after['finished'] and after['custom']['recipient']=='My special friend';assert page.evaluate('IslandPersonalization.text("ending.fireworkText")')=='生日快乐!';check('Switch back preserves progress and custom recipient, restores Chinese templates')
  page.locator('#language-button').click();page.set_viewport_size({'width':390,'height':844});shot('choose-mobile');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.locator('input[value="en"]').check();page.locator('#language-confirm').click();page.wait_for_function('document.documentElement.lang==="en" && window.starIsland && starIsland.snapshot().world.ready');page.locator('#settings-button').click();shot('english-mobile-settings');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');check('390px language selector and English settings fit')
  assert not report['errors'],report['errors']
 except Exception:
  shot('failure');raise
 finally:
  (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');b.close()
