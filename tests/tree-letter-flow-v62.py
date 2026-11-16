"""Independent actual-UI QA for the wishing-tree letter desk.

No game state, clock or renderer shortcuts. All drafts are entered through inputs;
save restoration uses downloaded JSON through the actual file chooser. A test-only
Canvas observer records fillText calls and exported Blob hashes without changing
their drawing, linking terminal text evidence to each really downloaded PNG.
Fake navigator.share covers UI branches only: it never sends a real message.

Run after production freeze: python tests/tree-letter-flow-v62.py
Final file:// pass: python tests/tree-letter-flow-v62.py --offline-only
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'output/tree-letter-v62';OUT.mkdir(parents=True,exist_ok=True)
parser=argparse.ArgumentParser(description=__doc__);mode=parser.add_mutually_exclusive_group();mode.add_argument('--offline-only',action='store_true');mode.add_argument('--storage-failure',action='store_true');args=parser.parse_args()
URL=(ROOT/'星屿寻迹.html').as_uri() if args.offline_only else 'http://127.0.0.1:4173/'
END='末段终点·星屿QA62·愿你所愿皆可期🌙'
SECRET='TREE_DRAFT_SECRET_QA62_只属于这台设备'
EVIL='<script>window.__treeAttack=true</script><img src=x onerror="window.__treeAttack=true">'
LONG='\n\n'.join(['这是认真写给你的信。HTML应原样印在纸上：'+EVIL,'ABCDEFGHIJKLMNOPQRSTUVWXYZ'*12+' 🌙✨👩‍🚀❤️',*[f'第{i:02d}段·把沿途的温柔留给你。'+'愿我们记得好好吃饭，也记得停下来看看天空。那些细小的光，会陪着我们走过很长很长的路。'*2 for i in range(1,39)],END])
assert len(LONG)<6000
SHORT='今天，我在许愿树下写了一句话。\n\n'+SECRET+'\n\n刚刚改完的最新正文·LATEST_QA62🌙'
FIELDS={'to':'姐姐·QA62','from':'阿屿 A Yu 🌙','title':'写给 亲爱的你 · QA62','date':'2026年11月16日'}
report={'checks':[],'browserErrors':[],'exports':[],'viewports':[],'shareBranches':[],'network':[],'mode':'storage-failure' if args.storage_failure else 'offline' if args.offline_only else 'online'}
source_names=['src/tree-letter.js','tree-letter.css','src/letter-art.js','src/storage.js','src/game.js','src/personalization.js']
report['sourceHashes']={name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in source_names if (ROOT/name).is_file()}

OBSERVER=r'''(()=>{
  const qa=window.__treeLetterQA={exports:[],shares:[]},draws=new WeakMap();
  const fill=CanvasRenderingContext2D.prototype.fillText,blob=HTMLCanvasElement.prototype.toBlob;
  CanvasRenderingContext2D.prototype.fillText=function(...args){if(this.canvas.width>=1000&&this.canvas.width<=1400&&this.canvas.height>=800){let row=draws.get(this.canvas);if(!row){row=[];draws.set(this.canvas,row);}row.push(String(args[0]));}return fill.apply(this,args);};
  HTMLCanvasElement.prototype.toBlob=function(callback,...args){const text=[...(draws.get(this)||[])],width=this.width,height=this.height;return blob.call(this,value=>{if(value&&text.length){value.arrayBuffer().then(data=>crypto.subtle.digest('SHA-256',data)).then(hash=>qa.exports.push({sha:[...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join(''),text,width,height}));}callback(value);},...args);};
})();'''

def check(label,details=True):report['checks'].append({'name':label,'details':details});print(label,flush=True)
def snapshot(page):return page.evaluate('starIsland.snapshot()')
def invariants(page):
    s=snapshot(page)['state'];return {'custom':s['custom'],'collected':s['collected'],'finished':s['finished'],'endingLetter':page.evaluate('IslandPersonalization.current.letter')}
def new_context(browser,width=1440,height=900,share='unsupported'):
    ctx=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=2 if width<1100 else 1,is_mobile=width<1100,has_touch=width<1100,accept_downloads=True,timezone_id='Asia/Shanghai')
    ctx.add_init_script(OBSERVER)
    if share=='unsupported':ctx.add_init_script("Object.defineProperty(navigator,'share',{configurable:true,value:undefined});Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false});")
    else:
        ctx.add_init_script("""(()=>{const mode=%s;Object.defineProperty(navigator,'canShare',{configurable:true,value:data=>!!data.files?.length});Object.defineProperty(navigator,'share',{configurable:true,value:data=>{window.__treeLetterQA.shares.push({mode,title:data.title,files:data.files.map(f=>({name:f.name,type:f.type,size:f.size}))});return mode==='success'?Promise.resolve():mode==='cancel'?Promise.reject(new DOMException('QA cancel','AbortError')):Promise.reject(new Error('QA share unavailable'));}});})();"""%json.dumps(share))
    page=ctx.new_page();page.on('pageerror',lambda e:report['browserErrors'].append(str(e)));page.on('request',lambda r:report['network'].append(r.url));return ctx,page
def boot(page,url=URL):
    page.goto(url);page.wait_for_load_state('networkidle');page.wait_for_function('window.starIsland && starIsland.snapshot().world.ready',timeout=60000)
    assert page.evaluate('typeof IslandTreeLetter?.open==="function" && typeof IslandLetterArt?.render==="function"')
def start(page):
    page.locator('#start-button').click();page.locator('#dialogue-next').click();page.wait_for_function('!starIsland.snapshot().world.paused')
def open_tree(page):
    page.locator('#map-button').click();page.locator('.region-tab[data-region="home"]').click();page.locator('.map-pin[data-id="tree"]').click()
    page.wait_for_function('starIsland.snapshot().screen==="tree-letter"',timeout=30000)
    expect(page.locator('.tree-letter')).to_be_visible()
def close(page):page.locator('#modal-close').click();page.wait_for_function('!document.getElementById("modal").open')
def field(page,name):return page.locator('#tree-letter-'+name)
def action(page,name):return page.locator(f'[data-letter-action="{name}"]')
def fill(page,body,theme='petal'):
    for key,value in FIELDS.items():field(page,key).fill(value)
    field(page,'body').fill(body);page.locator(f'[data-letter-theme="{theme}"]').click()
def preview_ready(page):
    page.wait_for_function('''()=>{const img=document.querySelector('.tl-paper-image'),s=document.getElementById('tree-letter-preview-state');return img?.complete&&img.naturalWidth>0&&s&&!s.textContent.includes('更新')&&!s.textContent.includes('准备');}''',timeout=60000)
def generate(page):
    action(page,'generate').click();page.wait_for_selector('.tree-letter.is-export',timeout=60000)
    page.wait_for_function('document.querySelector(".tree-letter")?.getAttribute("aria-busy")==="false"')
    preview_ready(page)
def png_hash(page):
    return page.evaluate('''async()=>{const img=document.querySelector('.tl-paper-image'),blob=await(await fetch(img.src)).blob(),hash=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');}''')
def download_png(page,stem,page_index=0):
    tabs=page.locator('[data-letter-page]')
    if tabs.count():page.locator(f'[data-letter-page="{page_index}"]').click();preview_ready(page)
    expected=png_hash(page)
    with page.expect_download() as wait:action(page,'download').click()
    path=OUT/f'{stem}-{page_index+1:02d}.png';wait.value.save_as(str(path));data=path.read_bytes();actual=hashlib.sha256(data).hexdigest()
    assert actual==expected,'The downloaded PNG differs from the actual preview Blob'
    page.wait_for_function('sha=>__treeLetterQA.exports.some(row=>row.sha===sha)',arg=actual,timeout=10000)
    observed=page.evaluate('sha=>__treeLetterQA.exports.find(row=>row.sha===sha)',actual)
    with Image.open(path) as image:
        assert image.format=='PNG' and image.width==1080 and 800<=image.height<=3600,(image.format,image.size)
        observed['pngSize']=list(image.size)
    observed.update({'file':str(path.relative_to(ROOT)),'suggestedName':wait.value.suggested_filename})
    report['exports'].append(observed);return observed
def download_txt(page,stem):
    with page.expect_download() as wait:action(page,'txt').click()
    path=OUT/(stem+'.txt');wait.value.save_as(str(path));return path.read_text(encoding='utf-8-sig')
def backup(page,stem):
    page.locator('#settings-button').click()
    with page.expect_download() as wait:page.locator('#export-button').click()
    path=OUT/(stem+'.json');wait.value.save_as(str(path));close(page);return path
def restore(page,path):
    page.locator('#settings-button').click()
    with page.expect_file_chooser() as wait:page.locator('#import-button').click()
    wait.value.set_files(str(path));expect(page.locator('#confirm-import')).to_be_visible();page.locator('#confirm-import').click()
    page.wait_for_function('!document.getElementById("modal").open && starIsland.snapshot().state.started')
def layout(page,label,exporting=False):
    selectors=['#modal','.tree-letter','.tl-footer']+(['[data-letter-action="download"]','[data-letter-action="txt"]'] if exporting else ['[data-letter-action="generate"]','[data-letter-action="save"]'])
    metrics=[]
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert page.locator('#modal').evaluate('(el)=>el.scrollWidth<=el.clientWidth+1')
    for selector in selectors:
        node=page.locator(selector);expect(node).to_be_visible();node.scroll_into_view_if_needed();rect=node.bounding_box();metrics.append({'selector':selector,'rect':rect})
        assert rect['x']>=-1 and rect['x']+rect['width']<=page.viewport_size['width']+1,(label,selector,rect)
        if selector.startswith('[data-'):assert rect['y']>=-1 and rect['y']+rect['height']<=page.viewport_size['height']+1,(label,selector,rect)
    page.screenshot(path=str(OUT/(label+'.png')));report['viewports'].append({'label':label,'viewport':page.viewport_size,'metrics':metrics})
def gift_privacy(page,browser,stem,secret):
    page.locator('#settings-button').click()
    with page.expect_download() as wait:page.locator('#export-gift').click()
    gift=OUT/(stem+'.html');wait.value.save_as(str(gift));close(page)
    assert secret not in gift.read_text(encoding='utf-8'),'Tree-letter draft leaked into exported gift HTML'
    ctx,fresh=new_context(browser);boot(fresh,gift.as_uri())
    assert snapshot(fresh)['state']['treeLetter'] is None and not snapshot(fresh)['state']['started']
    ctx.close();return {'file':str(gift.relative_to(ROOT)),'bytes':gift.stat().st_size,'draftAbsent':True}

with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='msedge',headless=True);context=None;page=None
    try:
        context,page=new_context(browser);boot(page);start(page);original=invariants(page);open_tree(page)
        if args.storage_failure:
            before=snapshot(page)['state']['treeLetter'];text='仅保留在内存里的树信·SAVE_FAILURE_QA62🌙'
            page.evaluate('''()=>{window.__treeSaveFault=true;const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(window.__treeSaveFault&&String(key).startsWith('star-island-v1'))throw new DOMException('QA storage quota','QuotaExceededError');return original.call(this,key,value);};}''')
            fill(page,text,'meadow');action(page,'save').click();expect(page.locator('#tree-letter-status')).to_have_attribute('data-kind','error')
            assert snapshot(page)['state']['treeLetter']==before,'Failed save changed the canonical draft'
            close(page);open_tree(page);expect(field(page,'body')).to_have_value(text)
            reopened=page.locator('#tree-letter-status').inner_text()
            assert '未保存' in reopened and '已保存在本机' not in reopened,reopened
            assert snapshot(page)['state']['treeLetter']==before
            action(page,'save').click();expect(page.locator('#tree-letter-status')).to_have_attribute('data-kind','error')
            page.screenshot(path=str(OUT/'save-failed-reopened.png'))
            page.evaluate('window.__treeSaveFault=false');action(page,'save').click();expect(page.locator('#tree-letter-status')).to_have_attribute('data-kind','saved')
            assert snapshot(page)['state']['treeLetter']['body']==text
            close(page);page.reload();page.wait_for_load_state('networkidle');page.wait_for_function('starIsland.snapshot().world.ready',timeout=60000);open_tree(page)
            expect(field(page,'body')).to_have_value(text);expect(page.locator('[data-letter-theme="meadow"]')).to_have_attribute('aria-pressed','true')
            assert invariants(page)==original
            page.screenshot(path=str(OUT/'save-recovered-after-refresh.png'))
            check('Real UI storage failure rolls back canonical draft, preserves unsaved input through close/reopen, and persists after retry and refresh',{'reopenedStatus':reopened,'fault':'Only this fresh test context temporarily throws QuotaExceededError for star-island save keys'})
            assert not report['browserErrors'],report['browserErrors']
            assert report['sourceHashes']=={name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in report['sourceHashes']}
            report['passed']=True;print(json.dumps({'passed':True,'storageFailureRecovery':True,'browserErrors':[]}));sys.exit(0)
        expect(action(page,'generate')).to_be_disabled();assert not snapshot(page)['state']['finished']
        check('Actual map tree opens the letter desk before any birthday progress; empty draft cannot generate')
        for key,prefix,suffix in [('from','阿屿 ','A Yu 🌙'),('title','写给 ','亲爱的你 · QA62')]:
            field(page,key).fill('');field(page,key).press_sequentially(prefix,delay=12)
            expect(field(page,key)).to_have_value(prefix)
            field(page,key).press_sequentially(suffix,delay=12);expect(field(page,key)).to_have_value(prefix+suffix)
        check('Real character-by-character title and signature typing preserves intermediate spaces and emoji')
        if not args.offline_only:
            fill(page,LONG,'starlight');preview_ready(page)
            assert page.evaluate('window.__treeAttack') is None
            assert page.locator('#modal-content script,#modal-content img[src="x"]').count()==0
            live_hash=png_hash(page);page.screenshot(path=str(OUT/'desktop-live-long-letter.png'))
            generate(page);assert page.locator('[data-letter-action="share"]').count()==0
            count=max(1,page.locator('[data-letter-page]').count());assert count>=2,count
            pages=[download_png(page,'long-letter',i) for i in range(count)]
            all_drawn=''.join(''.join(row['text']) for row in pages)
            assert END in all_drawn and 'window.__treeAttack' in all_drawn and 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' in all_drawn
            assert pages[0]['sha']==live_hash,'Stable live preview was not the exported first page'
            text=download_txt(page,'long-letter');assert LONG in text and END in text
            layout(page,'desktop-long-export',True)
            check('Live preview equals real multipage PNG downloads; Canvas-observed exported text retains final paragraph, literal HTML, long English and emoji; TXT is complete',{'pages':count,'bodyCharacters':len(LONG)})
            action(page,'edit').click()
        # Change theme and input immediately before Generate; the 550ms preview
        # debounce must not cause the old long letter to be downloaded instead.
        fill(page,SHORT,'meadow');generate(page);latest=download_png(page,'offline-latest' if args.offline_only else 'latest')
        drawn=''.join(latest['text']);assert SECRET in drawn and END not in drawn
        assert SHORT in download_txt(page,'offline-latest' if args.offline_only else 'latest')
        assert snapshot(page)['state']['treeLetter']['theme']=='meadow'
        assert invariants(page)==original
        check('Immediate theme/input→Generate exports the latest short draft and leaves birthday letter, crystals and completion untouched')
        action(page,'edit').click();escaped=SHORT+'\nESC最后一笔✨';field(page,'body').fill(escaped);page.keyboard.press('Escape')
        page.wait_for_function('!document.getElementById("modal").open');assert snapshot(page)['state']['treeLetter']['body']==escaped
        open_tree(page);refreshed=escaped+'\n刷新前最后字符🌙';field(page,'body').fill(refreshed);page.reload()
        page.wait_for_load_state('networkidle');page.wait_for_function('starIsland.snapshot().world.ready',timeout=60000)
        assert snapshot(page)['state']['treeLetter']['body']==refreshed
        open_tree(page);expect(field(page,'body')).to_have_value(refreshed)
        closed=refreshed+'\n关闭前最后字符❤';field(page,'body').fill(closed);close(page)
        assert snapshot(page)['state']['treeLetter']['body']==closed and invariants(page)==original
        check('Esc, immediate refresh and close all flush the final characters before debounce')
        saved=backup(page,'offline-draft-backup' if args.offline_only else 'authored-draft-backup')
        payload=json.loads(saved.read_text(encoding='utf-8'));assert payload['state']['treeLetter']['body']==closed
        gift=gift_privacy(page,browser,'offline-private-gift' if args.offline_only else 'private-gift',SECRET)
        check('Full backup includes the private tree draft; exported playable gift contains no secret draft and starts with treeLetter=null',gift)
        restored_context,restored=new_context(browser);boot(restored);restore(restored,saved);open_tree(restored)
        expect(field(restored,'body')).to_have_value(closed);assert snapshot(restored)['state']['treeLetter']==payload['state']['treeLetter']
        restored_context.close();check('Downloaded full backup restores every tree-letter field through the real file chooser')
        if not args.offline_only:
            # Reuse the prior independently completed birthday backup. This is a
            # real UI import, not a finished=true mutation or repeated mainline.
            complete=ROOT/'output/festival-v61/completed-birthday-backup.json';assert complete.is_file()
            restore(page,complete);finished=invariants(page);assert finished['finished']
            open_tree(page);fill(page,'完成生日之后，也能在树下继续写信。POST_FINISHED_QA62','petal');generate(page)
            assert 'POST_FINISHED_QA62' in ''.join(download_png(page,'post-finished')['text'])
            close(page);assert invariants(page)==finished
            page.locator('#journal-button').click();page.locator('#reread-letter').click();page.wait_for_function('starIsland.snapshot().screen==="letter"')
            assert finished['endingLetter'].split('\n')[0] in page.locator('.letter-body').inner_text();close(page)
            check('The tree still writes after completion; the original birthday ending remains readable through the journal')
            for width,height in [(1440,900),(375,667),(390,844),(844,390)]:
                ctx,mobile=new_context(browser,width,height);boot(mobile);restore(mobile,saved);open_tree(mobile)
                layout(mobile,f'editor-{width}x{height}')
                if action(mobile,'preview-tab').is_visible():
                    action(mobile,'preview-tab').click();preview_ready(mobile);expect(mobile.locator('.tl-paper-image')).to_be_visible();mobile.screenshot(path=str(OUT/f'preview-{width}x{height}.png'));action(mobile,'edit-tab').click()
                else:
                    preview_ready(mobile);expect(mobile.locator('.tl-paper-image')).to_be_visible();mobile.screenshot(path=str(OUT/f'preview-{width}x{height}.png'))
                generate(mobile);layout(mobile,f'export-{width}x{height}',True);download_png(mobile,f'viewport-{width}x{height}')
                ctx.close()
            check('Desktop, two portrait phones and landscape retain reachable editor, actual image preview and export buttons without horizontal overflow')
            for mode in ['success','cancel','error']:
                ctx,shared=new_context(browser,share=mode);boot(shared);restore(shared,saved);open_tree(shared);generate(shared)
                button=action(shared,'share');expect(button).to_be_visible();before=shared.locator('#tree-letter-status').inner_text();button.click();shared.wait_for_function('__treeLetterQA.shares.length===1')
                expect(button).to_be_enabled();status=shared.locator('#tree-letter-status').inner_text();call=shared.evaluate('__treeLetterQA.shares[0]')
                assert all(f['type']=='image/png' and f['size']>1000 for f in call['files'])
                if mode=='success':assert '已交给系统分享' in status
                elif mode=='cancel':assert status==before and shared.locator('#tree-letter-status').get_attribute('data-kind')!='error'
                else:assert '仍可下载图片' in status and shared.locator('#tree-letter-status').get_attribute('data-kind')=='error'
                report['shareBranches'].append({'mode':mode,'observedCall':call,'status':status,'realExternalSend':False});ctx.close()
            check('Fake system-share success/cancel/error UI branches behave correctly; no actual message or WeChat send was performed')
        else:
            assert not any(url.startswith(('http://','https://')) for url in report['network']),report['network']
            check('Final file:// version writes, previews, downloads complete PNG/TXT, persists, backs up and exports a private gift without HTTP requests')
        assert not report['browserErrors'],report['browserErrors']
        assert report['sourceHashes']=={name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in report['sourceHashes']},'Frozen production code changed during QA'
        report['passed']=True
    except Exception as error:
        report['passed']=False;report['error']=repr(error)
        if page:
            try:page.screenshot(path=str(OUT/('offline-failure.png' if args.offline_only else 'failure.png')));report['failureSnapshot']=snapshot(page)
            except Exception:pass
        raise
    finally:
        (OUT/('save-failure-report.json' if args.storage_failure else 'offline-report.json' if args.offline_only else 'report.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        if context:context.close()
        browser.close()
print(json.dumps({'passed':report['passed'],'checks':len(report['checks']),'pngDownloads':len(report['exports']),'browserErrors':report['browserErrors']},ensure_ascii=False))
