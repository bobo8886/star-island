"""Language selection and gift content on real standalone file:// pages."""
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
import json
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'output/language';OUT.mkdir(exist_ok=True)
report={'errors':[],'checks':[]}
with sync_playwright() as p:
 b=p.chromium.launch(channel='msedge',headless=True)
 def boot(url,blocked=False):
  ctx=b.new_context(viewport={'width':1280,'height':900},accept_downloads=True)
  if blocked:ctx.add_init_script("Storage.prototype.getItem=function(){throw new Error('disabled')};Storage.prototype.setItem=function(){throw new Error('disabled')}")
  page=ctx.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)));page.goto(url);page.wait_for_function('window.starIsland && starIsland.snapshot().world.ready',timeout=60000);return ctx,page
 def choose(page,lang):
  page.locator(f'input[value="{lang}"]').check();page.locator('#language-confirm').click();page.wait_for_function('l=>document.documentElement.lang===l && window.starIsland && starIsland.snapshot().world.ready',arg=lang,timeout=60000)
 try:
  ctx,page=boot((ROOT/'星屿寻迹.html').as_uri());choose(page,'en')
  page.locator('#open-studio').click();page.locator('[data-studio-field="basic.recipient"]').fill('小鹿')
  page.locator('#studio-search').fill('final letter');page.locator('[data-studio-field="core.letter"]').fill('我亲手写的信，保留中文。')
  page.locator('#save-custom').click();page.wait_for_timeout(200);page.locator('#modal-close').click();page.locator('#settings-button').click()
  with page.expect_download(timeout=60000) as wait:page.locator('#export-gift').click()
  gift=OUT/'bilingual-gift.html';wait.value.save_as(str(gift));ctx.close();report['checks'].append('English standalone creates a real gift with custom Chinese text')
  ctx,page=boot(gift.as_uri());expect(page.locator('#language-dialog')).to_be_visible();choose(page,'zh-CN')
  assert page.evaluate('IslandPersonalization.text("basic.recipient")')=='小鹿'
  assert page.evaluate('IslandPersonalization.text("core.letter")')=='我亲手写的信，保留中文。'
  assert page.evaluate('IslandPersonalization.text("ending.fireworkText")')=='生日快乐!'
  page.locator('#language-button').click();choose(page,'en');assert page.evaluate('IslandPersonalization.text("ending.fireworkText")')=='Happy Birthday!';assert page.evaluate('IslandPersonalization.text("core.letter")')=='我亲手写的信，保留中文。';assert page.locator('#language-dialog').count()==1
  page.screenshot(path=str(OUT/'offline-gift.png'));report['checks'].append('Gift supports both languages and preserves custom text; one selector only');ctx.close()
  ctx,page=boot('http://127.0.0.1:4173',blocked=True);choose(page,'en');assert page.locator('#start-button').inner_text().startswith('Begin');page.locator('#start-button').click();assert 'Welcome to Star Island' in page.locator('.dialogue-copy').inner_text();report['checks'].append('Language works when browser storage is unavailable');ctx.close()
  assert not report['errors'],report['errors']
 finally:
  (OUT/'offline-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report,ensure_ascii=False));b.close()
