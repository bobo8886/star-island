"""Actual world/input gait review, with raw canvas crops and a playable WebM.

The game is moved only with its map, keyboard, pointer and activity controls.
The injected observer only reads snapshots and the already-rendered world canvas;
it never calls a character renderer or changes actors, gait, time or game state.
"""
import base64
import argparse
import hashlib
import io
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',default='output/gait-world',help='Evidence directory; relative paths resolve from the project root.')
parser.add_argument('--resume',action='store_true',help='Add the unoccluded front view to existing desktop evidence, then repeat mobile.')
parser.add_argument('--expect-sha256',help='Refuse to run against a different character.js than the approved frozen version.')
parser.add_argument('--expect-motion',help='Required IslandCharacter.motionRendering mode, if supplied.')
args=parser.parse_args()
OUT=Path(args.output)
if not OUT.is_absolute():OUT=ROOT/OUT
OUT.mkdir(parents=True, exist_ok=True)
errors = []
checks = []
character_sha256 = hashlib.sha256((ROOT/'src/character.js').read_bytes()).hexdigest()
if args.expect_sha256:assert character_sha256.lower()==args.expect_sha256.lower(),'Character source is not the approved frozen version'
motion_assets={str(path.relative_to(ROOT)):hashlib.sha256(path.read_bytes()).hexdigest() for path in [*sorted((ROOT/'assets').glob('*-walk-*-v6.png')),ROOT/'assets/character-idle-v6.png'] if path.is_file()}
motion_metadata={}
# Avoid the installed Python 3.14 FreeType extension, which crashes natively while
# labeling contact sheets; this built-in bitmap font never loads that extension.
label_font = ImageFont.load_default_imagefont()
observer = r'''() => {
  const qa=window.__worldGaitQA={active:false,label:'',direction:'',rows:[],images:{},pairs:{},stops:{}};
  function crop(source,w,box){
    const dpr=source.width/innerWidth, s=w.camera.scale;
    const c=document.createElement('canvas');c.width=Math.ceil(box.width*s*dpr);c.height=Math.ceil(box.height*s*dpr);
    const g=c.getContext('2d');g.imageSmoothingEnabled=false;
    g.drawImage(source,(w.camera.x+box.x*s)*dpr,(w.camera.y+box.y*s)*dpr,c.width,c.height,0,0,c.width,c.height);
    return c.toDataURL('image/png');
  }
  qa.captureStop=()=>{const w=starIsland.snapshot().world,source=document.getElementById('world');qa.stops[qa.label]={};for(const [variant,actor] of [['girl',w.player],['boy',w.spirit]])qa.stops[qa.label][variant]={image:crop(source,w,{x:actor.x-54,y:actor.y-116,width:108,height:136}),actor,scale:w.camera.scale};};
  function sample(t){
    if(qa.active){
      const w=starIsland.snapshot().world,nav=IslandNavigation.forRegion(w.region),source=document.getElementById('world');
      qa.rows.push({t,label:qa.label,player:w.player,spirit:w.spirit,camera:w.camera,zoom:w.zoom,dpr:w.performance.dpr,
        sprinting:w.sprinting,activity:w.activity?.id||null,pLegal:nav.walkable(w.player.x,w.player.y),sLegal:nav.walkable(w.spirit.x,w.spirit.y)});
      for(const [variant,actor] of [['girl',w.player],['boy',w.spirit]]){
        if(actor.walk>0&&!actor.jump&&(!qa.direction||actor.direction===qa.direction)){
          const beat=Math.floor(actor.walk*1.25)%8,key=[qa.label,variant,actor.direction,beat].join('__');
          const other=variant==='girl'?w.spirit:w.player;
          const overlap=other.y>actor.y?Math.max(0,50-Math.abs(other.x-actor.x))*Math.max(0,108-(other.y-actor.y)):0;
          const score=overlap+(qa.direction&&other.direction!==qa.direction?10000:0);
          if(!qa.images[key]||score<qa.images[key].occlusionScore)qa.images[key]={variant,direction:actor.direction,beat,label:qa.label,occlusionScore:score,
            image:crop(source,w,{x:actor.x-54,y:actor.y-116,width:108,height:136}),actor,scale:w.camera.scale};
        }
      }
      if(w.player.walk>0&&w.spirit.walk>0&&!w.player.jump&&!qa.pairs[qa.label]
        &&(!qa.direction||(w.player.direction===qa.direction&&w.spirit.direction===qa.direction))
        &&Math.floor(w.player.walk*1.25)%8===2){
        const p=w.player,s=w.spirit,minX=Math.min(p.x,s.x)-58,minY=Math.min(p.y,s.y)-120;
        qa.pairs[qa.label]={image:crop(source,w,{x:minX,y:minY,width:Math.abs(p.x-s.x)+116,height:Math.abs(p.y-s.y)+144}),player:p,spirit:s};
      }
    }
    requestAnimationFrame(sample);
  }
  requestAnimationFrame(sample);
}'''


def snapshot(page):
    return page.evaluate('starIsland.snapshot().world')


def set_zoom(page, value):
    old = snapshot(page)['zoom']
    page.mouse.move(page.viewport_size['width'] * .36, page.viewport_size['height'] * .64)
    page.mouse.wheel(0, 3000 if value==.7 else -3000 if value==1.6 else (old-value)*1000)
    page.wait_for_function('(value)=>Math.abs(starIsland.snapshot().world.zoom-value)<.001', arg=value)
    page.wait_for_timeout(450)


def walk_to(page, target):
    """Click visible intermediate ground positions; no actor-position injection."""
    for _ in range(20):
        w = snapshot(page)
        dx, dy = target[0] - w['player']['x'], target[1] - w['player']['y']
        distance = math.hypot(dx, dy)
        if distance < 16:
            page.wait_for_timeout(700)
            return
        step = min(1, min(page.viewport_size['width'] * .24, page.viewport_size['height'] * .21) / w['camera']['scale'] / distance)
        goal = [w['player']['x'] + dx * step, w['player']['y'] + dy * step]
        point = page.evaluate('([x,y])=>starIsland.screenPoint(x,y)', goal)
        page.mouse.click(point['x'], point['y'])
        page.wait_for_timeout(150)
        page.wait_for_function('starIsland.snapshot().world.pathLength===0', timeout=15000)
        assert page.evaluate('starIsland.snapshot().screen') == '', 'Ground route unexpectedly opened an interaction'
    raise AssertionError(('Could not walk to ground point', target, snapshot(page)['player']))


def boot(browser, mobile=False):
    size = {'width':390,'height':844} if mobile else {'width':1440,'height':900}
    context = browser.new_context(viewport=size, device_scale_factor=2 if mobile else 1,
        has_touch=mobile, is_mobile=mobile, record_video_dir=str(OUT/'videos'), record_video_size=size)
    page = context.new_page()
    page.on('pageerror', lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:4173/?qa=gait-world')
    page.wait_for_load_state('networkidle')
    page.wait_for_function('window.starIsland && starIsland.snapshot().world.ready')
    meta=page.evaluate('({version:IslandCharacter.animationVersion||null,mode:IslandCharacter.motionRendering||null,files:IslandCharacter.walkFiles||null,idle:IslandCharacter.idleFile||null})')
    if args.expect_motion:assert meta['mode']==args.expect_motion,meta
    motion_metadata.update(meta)
    page.locator('#start-button').click();page.locator('#dialogue-next').click()
    page.locator('#settings-button').click();page.locator('#setting-time').select_option('day')
    page.locator('[data-companion="boy"]').click();page.locator('#modal-close').click()
    page.locator('#map-button').click();page.locator('.region-tab[data-region="lake"]').click()
    page.locator('.map-destination[data-id="silver_paper"]').click()
    page.wait_for_function("starIsland.snapshot().screen==='adventure'",timeout=20000)
    page.locator('#story-dismiss').click();page.wait_for_timeout(1000)
    page.evaluate(observer)
    return context, page


def start_sample(page, label, direction=''):
    page.evaluate('([label,direction])=>Object.assign(__worldGaitQA,{active:true,label,direction})',[label,direction])


def stop_sample(page):
    page.evaluate('if(__worldGaitQA.active)__worldGaitQA.captureStop();__worldGaitQA.active=false')


def move(page, direction, sprint, label, distance, touch=False, extra_key=None):
    start = snapshot(page)['player']
    start_sample(page,label,direction)
    key = {'right':'ArrowRight','left':'ArrowLeft','up':'ArrowUp','down':'ArrowDown'}[direction]
    if sprint: page.keyboard.down('ShiftLeft')
    if touch:
        box = page.locator('#joystick').bounding_box()
        x,y=box['x']+box['width']/2,box['y']+box['height']/2
        dx,dy={'right':(28,0),'left':(-28,0),'up':(0,-28),'down':(0,28)}[direction]
        page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+dx,y+dy)
    else:
        page.keyboard.down(key)
        if extra_key:page.keyboard.down(extra_key)
    try:
        page.wait_for_function('([x,y,d])=>Math.hypot(starIsland.snapshot().world.player.x-x,starIsland.snapshot().world.player.y-y)>=d',
            arg=[start['x'],start['y'],distance],timeout=7000)
    finally:
        if touch:page.mouse.up()
        else:page.keyboard.up(key)
        if extra_key:page.keyboard.up(extra_key)
        page.keyboard.up('ShiftLeft')
    page.wait_for_timeout(1100)
    end=snapshot(page)
    stop_sample(page)
    assert end['player']['walk']==0 and end['spirit']['walk']==0,(label,'Actors did not settle',end)
    assert not end['player']['jump'],(label,'Unrequested jump')
    rows=page.evaluate('(label)=>__worldGaitQA.rows.filter(r=>r.label===label)',label)
    images=page.evaluate('(label)=>Object.values(__worldGaitQA.images).filter(i=>i.label===label).map(({image,...rest})=>rest)',label)
    assert not any(not r['pLegal'] or not r['sLegal'] for r in rows),label
    assert all(r['player']['jump']==0 for r in rows),label
    coverage={v:sorted({i['beat'] for i in images if i['variant']==v and i['direction']==direction}) for v in ['girl','boy']}
    for variant,beats in coverage.items():assert len(beats)==8,(label,variant,beats)
    checks.append({'label':label,'direction':direction,'run':sprint,'input':'joystick pointer' if touch else 'keyboard',
        'zoom':end['zoom'],'dpr':end['performance']['dpr'],'capturedBeats':coverage,'settled':True,'jumpFrames':0,
        'legalFrames':len(rows),'distance':math.hypot(end['player']['x']-start['x'],end['player']['y']-start['y'])})
    print(json.dumps({'checked':label,'capturedBeats':coverage}),flush=True)
    page.screenshot(path=str(OUT/(label+'-stopped.png')))


def export_evidence(page, name):
    qa=page.evaluate('__worldGaitQA')
    (OUT/(name+'-checks.json')).write_text(json.dumps(checks,indent=2),encoding='utf-8')
    (OUT/(name+'-observations.json')).write_text(json.dumps(qa,indent=2),encoding='utf-8')
    labels={}
    for key,item in qa['images'].items():
        data=base64.b64decode(item.pop('image').split(',')[1]);(OUT/(key+'.png')).write_bytes(data)
        # A turn during an activity may contain more than one heading. Keep each
        # direction in its own sheet rather than overwriting the same phase tile.
        group=item['label'] if item['label']!='desktop-stroll' else item['label']+'-'+item['direction']
        labels.setdefault(group,[]).append((key,item,Image.open(io.BytesIO(data)).convert('RGB')))
    for label,items in labels.items():
        tile_w,tile_h=260,330
        sheet=Image.new('RGB',(tile_w*4,tile_h*4),'#1b2c3d');draw=ImageDraw.Draw(sheet)
        for key,item,img in items:
            row=(0 if item['variant']=='girl' else 2)+item['beat']//4;col=item['beat']%4
            factor=min(240/img.width,294/img.height)
            img=img.resize((round(img.width*factor),round(img.height*factor)),Image.Resampling.NEAREST)
            sheet.paste(img,(col*tile_w+(tile_w-img.width)//2,row*tile_h+28))
            draw.text((col*tile_w+8,row*tile_h+7),f"{item['variant']} {item['direction']} step {item['beat']}",fill='#f1d9ae',font=label_font)
        sheet.save(OUT/(label+'-contact-sheet.png'))
    for label,pair in qa['pairs'].items():
        data=base64.b64decode(pair.pop('image').split(',')[1]);(OUT/(label+'-pair.png')).write_bytes(data)
        img=Image.open(io.BytesIO(data));img.resize((img.width*3,img.height*3),Image.Resampling.NEAREST).save(OUT/(label+'-pair-3x.png'))
    for label,actors in qa.get('stops',{}).items():
        strip=Image.new('RGB',(600,390),'#1b2c3d');draw=ImageDraw.Draw(strip)
        for index,(variant,item) in enumerate(actors.items()):
            data=base64.b64decode(item.pop('image').split(',')[1]);(OUT/(label+'-'+variant+'-settled.png')).write_bytes(data)
            img=Image.open(io.BytesIO(data)).convert('RGB');factor=min(280/img.width,350/img.height);img=img.resize((round(img.width*factor),round(img.height*factor)),Image.Resampling.NEAREST);strip.paste(img,(index*300+(300-img.width)//2,30));draw.text((index*300+8,8),variant+' settled / '+item['actor']['direction'],fill='#f1d9ae',font=label_font)
        strip.save(OUT/(label+'-settled-contact.png'))
    (OUT/(name+'-observations.json')).write_text(json.dumps(qa,indent=2),encoding='utf-8')


with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    context,page=boot(browser)
    try:
        if args.resume:
            checks.extend(json.loads((OUT/'desktop-checks.json').read_text(encoding='utf-8')))
            # A diagonal down-facing stride separates their silhouettes naturally,
            # so the girl's head cannot cover the boy's front leg joints.
            set_zoom(page,.7);walk_to(page,(1120,400));set_zoom(page,1.6)
            start=snapshot(page)['player'];page.keyboard.down('ArrowDown')
            page.wait_for_function('(y)=>starIsland.snapshot().world.player.y-y>195',arg=start['y'])
            page.keyboard.up('ArrowDown');page.wait_for_timeout(700)
            move(page,'down',False,'desktop-down-unoccluded',225,extra_key='ArrowLeft')
            export_evidence(page,'desktop-down-detail')
        else:
            paths={'right':((620,650),440),'left':((1080,650),440),'up':((1120,700),300),'down':((1120,390),300)}
            for sprint in [False,True]:
                for direction,(origin,distance) in paths.items():
                    set_zoom(page,.7);walk_to(page,origin);set_zoom(page,1.6)
                    move(page,direction,sprint,f"desktop-{'run' if sprint else 'walk'}-{direction}",distance)
            set_zoom(page,.7);walk_to(page,(620,650))
            move(page,'right',False,'desktop-zoom07-right',440)
            page.locator('#activities-button').click();page.locator('[data-activity-route="stroll"]').click()
            page.wait_for_function('starIsland.snapshot().world.activity?.id==="stroll"',timeout=20000)
            start_sample(page,'desktop-stroll')
            page.wait_for_timeout(1100);page.screenshot(path=str(OUT/'desktop-stroll-full.png'))
            page.wait_for_function('starIsland.snapshot().world.activity.progress>=1',timeout=20000)
            page.wait_for_timeout(600);stop_sample(page)
            stroll=page.evaluate('__worldGaitQA.rows.filter(r=>r.label==="desktop-stroll")')
            assert all(r['player']['jump']==0 and r['pLegal'] and r['sLegal'] for r in stroll)
            assert snapshot(page)['player']['walk']==snapshot(page)['spirit']['walk']==0
            checks.append({'label':'desktop-stroll','realActivity':True,'legalFrames':len(stroll),'settled':True,'jumpFrames':0})
            export_evidence(page,'desktop')
    except Exception as error:
        stop_sample(page);page.screenshot(path=str(OUT/'desktop-failure.png'));export_evidence(page,'desktop-partial')
        (OUT/'failure.json').write_text(json.dumps({'error':str(error),'checks':checks,'browserErrors':errors,'world':snapshot(page)},indent=2),encoding='utf-8')
        raise
    finally:
        video=page.video;context.close();video.save_as(str(OUT/('gait-world-down-detail.webm' if args.resume else 'gait-world-desktop.webm')))
    context,page=boot(browser,True)
    try:
        # Same real world path, now rendered at DPR 2 and moved by the on-screen joystick.
        set_zoom(page,.7);walk_to(page,(620,650));set_zoom(page,1.6)
        move(page,'right',False,'mobile-dpr2-right',440,touch=True)
        page.screenshot(path=str(OUT/'mobile-dpr2-full.png'))
        assert snapshot(page)['performance']['dpr']==2
        assert page.locator('#world').evaluate('(c)=>c.width===780 && c.height===1688')
        export_evidence(page,'mobile')
    except Exception as error:
        stop_sample(page);page.screenshot(path=str(OUT/'mobile-failure.png'));export_evidence(page,'mobile-partial')
        (OUT/'failure.json').write_text(json.dumps({'error':str(error),'checks':checks,'browserErrors':errors,'world':snapshot(page)},indent=2),encoding='utf-8')
        raise
    finally:
        video=page.video;context.close();video.save_as(str(OUT/'gait-world-mobile.webm'))
    browser.close()
assert not errors,errors
assert hashlib.sha256((ROOT/'src/character.js').read_bytes()).hexdigest()==character_sha256,'Renderer changed during actual-world QA'
assert all(hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==digest for path,digest in motion_assets.items()),'Motion artwork changed during actual-world QA'
report={'checks':checks,'browserErrors':errors,'characterSHA256':character_sha256,'motionMetadata':motion_metadata,'motionAssetSHA256':motion_assets,'visualReview':'Raw world crops/contact sheets require human review; no alpha or hash result is claimed as visual approval.',
    'videos':[str(OUT/'gait-world-desktop.webm'),str(OUT/'gait-world-mobile.webm')]+([str(OUT/'gait-world-down-detail.webm')] if args.resume else [])}
(OUT/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
(OUT/'review.html').write_text('''<!doctype html><meta charset="utf-8"><title>World gait review</title>
<style>body{max-width:1120px;margin:32px auto;background:#172839;color:#eaddc7;font:16px system-ui}video,img{max-width:100%;background:#102030}a{color:#b9deee}section{margin:32px 0}video{width:100%}</style>
<h1>Actual world gait review</h1><p>Real keyboard, pointer and activity input. Crops come directly from the rendered world canvas.</p>
<section><h2>Desktop: four directions, walk / run / stop, two zoom levels and coast stroll</h2><video controls src="gait-world-desktop.webm"></video></section>
<section><h2>Mobile DPR 2: on-screen joystick</h2><video controls src="gait-world-mobile.webm"></video></section>
''' + ('<section><h2>Front view with both legs visible</h2><video controls src="gait-world-down-detail.webm"></video></section>' if args.resume else '')
    + ''.join(f'<section><h2>{check["label"]}</h2>'
        + ''.join(f'<a href="{sheet.name}"><img src="{sheet.name}" alt="Raw world phase captures"></a>' for sheet in sorted(OUT.glob(check['label']+'*-contact-sheet.png')))
        + f'<img src="{check["label"]}-settled-contact.png" alt="Actual settled character crops"></section>' for check in checks),encoding='utf-8')
print(json.dumps(report))
