"""Record the actual renderer's continuous walk and stop transitions, not a synthetic movie."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'output/walk-v6';OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    b=p.chromium.launch(channel='msedge',headless=True)
    ctx=b.new_context(viewport={'width':1150,'height':1100},record_video_dir=str(OUT),record_video_size={'width':1150,'height':1100})
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:4173/assets/walk-v6-preview.html')
    page.wait_for_function('window.walkV6PreviewReady')
    for direction in ['right','left','down','up']:
        page.locator('#direction').select_option(direction)
        page.wait_for_timeout(2500)
        page.screenshot(path=str(OUT/f'{direction}-moving.png'))
        page.locator('#idle').click();page.wait_for_timeout(800)
        page.screenshot(path=str(OUT/f'{direction}-idle.png'))
        page.locator('#idle').click();page.wait_for_timeout(1200)
    video=page.video;ctx.close();video.save_as(str(OUT/'complete-pose-loop.webm'))
    assert not errors,errors
    (OUT/'record-report.json').write_text(json.dumps({'browserErrors':errors,'directions':['right','left','down','up'],'includes':'Normal/slow eight full drawings, stop, restart for both characters','video':'complete-pose-loop.webm'},indent=2))
    b.close();print('Recorded four directions, stop and restart, zero browser errors: output/walk-v6/complete-pose-loop.webm')
