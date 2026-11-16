"""Isolated real-renderer letter UI layout, local-save failures and stale-result cleanup."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
R=Path(__file__).resolve().parents[1];O=R/'output/tree-letter-ui';O.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
HTML='''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/tree-letter.css"></head><body><dialog id="modal" class="modal"><button id="modal-close" class="modal-close" aria-label="关闭">×</button><div id="modal-content"></div></dialog><script src="/src/letter-art.js"></script><script src="/src/tree-letter.js"></script><script>
window.record={saves:[],toasts:[],fail:false,disposed:0};let afterClose;
const modal=document.getElementById('modal'),panel=document.getElementById('modal-content');
modal.addEventListener('close',()=>{const cb=afterClose;afterClose=null;cb?.();});document.getElementById('modal-close').onclick=()=>modal.close();
window.openLetter=(draft=null,defaults={})=>{window.controller=IslandTreeLetter.open({draft,defaults,show:(html,screen,cb)=>{panel.innerHTML=html;modal.className='modal '+screen+'-modal';afterClose=cb;if(!modal.open)modal.showModal();},close:()=>modal.close(),save:d=>{record.saves.push(d);if(record.fail)return false;localStorage.setItem('tree-letter-qa',JSON.stringify(d));return true;},toast:s=>record.toasts.push(s)});};
</script></body></html>'''
with sync_playwright() as p:
 b=p.chromium.launch(channel='msedge',headless=True)
 page=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1,accept_downloads=True)
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('**/letter-ui-harness',lambda route:route.fulfill(status=200,content_type='text/html',body=HTML))
 page.goto('http://127.0.0.1:4173/letter-ui-harness');page.wait_for_function('window.IslandTreeLetter && window.IslandLetterArt')
 try:
  page.evaluate('openLetter(null,{heading:"树下邮局 · 测试",intro:"一封新的问候",example:"这是作者提供的示例。",body:"不能默认放进正文"})')
  expect(page.locator('#tree-letter-body')).to_have_value('');expect(page.locator('[data-letter-action="generate"]')).to_be_disabled();page.wait_for_selector('.tl-paper-image')
  checks.append('empty body by default, custom header, actual renderer PNG preview and empty export guard')
  page.locator('#tree-letter-title').fill('');page.locator('#tree-letter-title').press_sequentially('A letter for Jane Doe',delay=8);page.locator('#tree-letter-from').fill('');page.locator('#tree-letter-from').press_sequentially('Jane Doe ',delay=8);expect(page.locator('#tree-letter-title')).to_have_value('A letter for Jane Doe');expect(page.locator('#tree-letter-from')).to_have_value('Jane Doe ')
  page.evaluate('''()=>{const e=document.getElementById('tree-letter-body');e.value='中'.repeat(6001);e.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));e.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true,inputType:'insertCompositionText'}));}''');assert len(page.locator('#tree-letter-body').input_value())==6001;page.locator('#tree-letter-body').dispatch_event('compositionend');assert len(page.locator('#tree-letter-body').input_value())==6000;checks.append('sequential keyboard input preserves spaces; IME draft is not rewritten until compositionend')
  page.locator('#tree-letter-body').fill('我自己写的正文');page.locator('[data-letter-action="sample"]').click();expect(page.locator('#tree-letter-confirm')).to_be_visible();page.locator('[data-letter-action="cancel-sample"]').click();expect(page.locator('#tree-letter-body')).to_have_value('我自己写的正文');page.locator('[data-letter-action="sample"]').click();page.locator('[data-letter-action="confirm-sample"]').click();expect(page.locator('#tree-letter-body')).to_have_value('这是作者提供的示例。');checks.append('sample explicitly confirmed before overwriting user text')
  page.locator('#tree-letter-body').fill('你好，<img src=x onerror=alert(1)>。\n\n保留换行。');page.wait_for_timeout(850);assert page.locator('.tl-editor img').count()==0;assert '<img' in page.evaluate('JSON.parse(localStorage.getItem("tree-letter-qa")).body')
  page.evaluate('record.fail=true');page.locator('#tree-letter-body').fill('保存失败也不能丢掉的长句。');page.locator('[data-letter-action="save"]').click();expect(page.locator('#tree-letter-status')).to_have_attribute('data-kind','error');saved=page.evaluate('JSON.parse(localStorage.getItem("tree-letter-qa"))');page.keyboard.press('Escape');page.wait_for_timeout(50);page.evaluate('(draft)=>openLetter(draft)',saved);expect(page.locator('#tree-letter-body')).to_have_value('保存失败也不能丢掉的长句。');page.evaluate('record.fail=false');page.locator('[data-letter-action="save"]').click();checks.append('plain text HTML safety, real failed-save message, and failed draft survives close/reopen')
  for width,height in [(1440,900),(390,844),(375,667),(844,390)]:
   page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(200)
   if width<=760:page.locator('[data-letter-action="edit-tab"]').click();page.wait_for_timeout(230)
   button=page.locator('[data-letter-action="generate"]');r=button.bounding_box();assert r and 0<=r['y'] and r['y']+r['height']<=height,(width,r)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   page.screenshot(path=str(O/f'editor-{width}.png'))
   if width<=760:page.locator('[data-letter-action="preview-tab"]').click();page.wait_for_timeout(230);page.screenshot(path=str(O/f'preview-{width}.png'))
  checks.append('desktop, 390/375 portrait and 844 landscape: save/generate always visible, no page overflow')
  page.set_viewport_size({'width':390,'height':844});page.locator('[data-letter-action="generate"]').click();page.wait_for_selector('.tree-letter.is-export');page.wait_for_selector('.tl-paper-image');supported=page.evaluate('!!(navigator.share && navigator.canShare?.({files:[new File(["png"],"letter.png",{type:"image/png"})]}))');assert bool(page.locator('[data-letter-action="share"]').count())==supported
  for width,height in [(1440,900),(390,844),(375,667),(844,390)]:
   page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(150);r=page.locator('[data-letter-action="download"]').bounding_box();assert r and r['y']+r['height']<=height;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(O/f'export-{width}.png'))
  checks.append('real generated export views at four sizes; PNG download visible and no fake share button')
  page.locator('[data-letter-action="edit"]').click();page.locator('#tree-letter-body').fill('最后输入立即关闭');page.keyboard.press('Escape');page.wait_for_timeout(50);assert page.evaluate('JSON.parse(localStorage.getItem("tree-letter-qa")).body')=='最后输入立即关闭';checks.append('Escape immediately flushes before debounce')
  # Artificially delay only the production renderer result to exercise stale URL disposal.
  page.evaluate('''()=>{const original=IslandLetterArt;window.IslandLetterArt={...original,render:async(...args)=>{const r=await original.render(...args),dispose=r.dispose; r.dispose=()=>{record.disposed++;dispose();};await new Promise(ok=>setTimeout(ok,650));return r;}};openLetter(null); }''')
  page.wait_for_timeout(650);page.locator('#modal-close').click();page.wait_for_timeout(1400);assert page.evaluate('record.disposed')>=1;checks.append('closing with async preview in flight disposes the late result')
  assert not errors,errors
  report={'checks':checks,'browserErrors':errors};(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(report,ensure_ascii=False))
 except Exception:
  page.screenshot(path=str(O/'failure.png'));raise
 finally:b.close()
