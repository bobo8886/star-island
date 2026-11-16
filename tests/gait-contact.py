"""Pixel contact QA: body/leg connectivity and sole contact, not frame hashes.

Run --baseline --label before to retain evidence of the former broken rig.
Screenshots and reports are written even when assertions fail.
"""
import argparse
import base64
import io
import json
import hashlib
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
FONT=ImageFont.load_default_imagefont()
parser = argparse.ArgumentParser()
parser.add_argument('--baseline', action='store_true')
parser.add_argument('--label', default='after')
args = parser.parse_args()
OUT = ROOT / 'output'
OUT.mkdir(exist_ok=True)
source = (OUT / 'gait-contact-before-source.js' if args.baseline else ROOT / 'src/character.js').read_text(encoding='utf-8')
source_hash = hashlib.sha256(source.encode()).hexdigest()
# Expose the unchanged source crop for diagnostic guides, without modifying the module on disk.
source = source.replace('window.IslandCharacter={draw,', 'window.IslandCharacter={rawSource:sourceFrame,draw,')
errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width':1440,'height':1000}, device_scale_factor=2)
    page.route('**/src/character.js', lambda route: route.fulfill(status=200, content_type='text/javascript', body=source))
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:4173/assets/characters-preview.html')
    page.wait_for_function('IslandCharacter.isReady()')
    data = page.evaluate('''() => {
      const frames=[],draws=[],sources=[];
      for(const variant of ['girl','boy']){
        if(IslandCharacter.rawSource)for(const index of [0,1,3])sources.push({variant,index,png:IslandCharacter.rawSource(variant,index).toDataURL()});
        for(const direction of ['down','right','up','left'])for(let beat=0;beat<9;beat++){
          const pose=beat===8?'idle':'walk',index=beat===8?0:beat,key=variant+'/'+direction+'/'+(beat===8?'idle':beat);
          frames.push({key,variant,direction,pose,index,png:IslandCharacter.frame(direction,pose,index,false,variant).toDataURL()});
          for(const dpr of [1,2])for(const zoom of [.7,1,1.6]){
            const factor=dpr*zoom,c=document.createElement('canvas');c.width=Math.ceil(200*factor);c.height=Math.ceil(220*factor);const g=c.getContext('2d');g.setTransform(factor,0,0,factor,0,0);const ellipses=[],ellipse=g.ellipse.bind(g);g.ellipse=(...args)=>{ellipses.push(args.slice(0,4));ellipse(...args);};
            IslandCharacter.draw(g,{x:100,y:200,direction,walk:pose==='walk'?index/1.25+.001:0,jump:0},{variant,time:.923,pose,phase:'day'});
            const scale=100/176;
            draws.push({key,dpr,zoom,factor,scale:scale*factor,anchorX:100*factor,anchorY:200*factor,originX:(100-80*scale)*factor,originY:(200-184*scale)*factor,shadow:ellipses[0],png:c.toDataURL()});
          }
        }
      }
      return {frames,draws,sources};
    }''')
    browser.close()

def decode(item):
    return Image.open(io.BytesIO(base64.b64decode(item.pop('png').split(',')[1]))).convert('RGBA')

def connected_alpha(mask):
    """Small run-length, 8-connected labeler; no optional native CV dependency."""
    labels=np.zeros(mask.shape,dtype=np.int32);parents=[0];previous=[]
    def root(value):
        while parents[value]!=value:
            parents[value]=parents[parents[value]];value=parents[value]
        return value
    for y,row in enumerate(mask):
        edges=np.diff(np.pad(row.astype(np.int8),(1,1)))
        starts=np.where(edges==1)[0];ends=np.where(edges==-1)[0]-1;current=[]
        for start,end in zip(starts,ends):
            overlaps=[root(label) for lo,hi,label in previous if hi>=start-1 and lo<=end+1]
            if overlaps:
                label=min(overlaps)
                for other in overlaps:parents[root(other)]=label
            else:label=len(parents);parents.append(label)
            labels[y,start:end+1]=label;current.append((start,end,label))
        previous=current
    lookup=np.array([root(i) for i in range(len(parents))])
    return lookup[labels]

def analyze(image, *, scale=1, anchor_y=184, origin_x=0, origin_y=0):
    """8-connected alpha graph; only lower central limbs count as detached legs.

    A lantern/hand outside the foot corridor cannot produce a leg failure.
    Ground uses the lower contour, not the shadow and not the whole-canvas bbox.
    """
    a = np.asarray(image)[:,:,3] >= 128
    h,w = a.shape
    ys,xs = np.indices(a.shape)
    sx=(xs-origin_x)/scale; sy=(ys-origin_y)/scale
    foot_corridor=(sx>=42)&(sx<=118)&(sy>=164)&(sy<190)
    torso=(sx>=52)&(sx<=108)&(sy>=88)&(sy<=139)
    labels=connected_alpha(a)
    torso_labels=labels[torso&a]
    if len(torso_labels):
        body=int(np.bincount(torso_labels).argmax())
    else:
        body=-1
    detached=[]
    ids=np.unique(labels[foot_corridor&a]);ids=ids[ids!=0]
    for label in ids:
        component=labels==label
        lower_count=int((component&foot_corridor).sum())
        if label==body or lower_count<max(3,6*scale*scale):
            continue
        cy,cx=np.where(component)
        detached.append({'pixels':int(component.sum()),'lowerPixels':lower_count,'bbox':[int(cx.min()),int(cy.min()),int(cx.max()),int(cy.max())]})
    feet=a&foot_corridor
    fy,fx=np.where(feet)
    foot_bottom=int(fy.max())+1 if len(fy) else -1
    gap=anchor_y-foot_bottom
    # A one-device-pixel allowance covers nearest-neighbour raster rounding.
    tolerance=1.05
    # Measure the sole's own final two rows. Comparing row centres against the
    # anchor would incorrectly reject a sole edge exactly one pixel above it.
    near_ground=feet&(ys>=foot_bottom-max(2,2*scale))&(ys<foot_bottom)
    contact_columns=np.where(near_ground.any(axis=0))[0]
    longest=0;run=0;last=-2
    for x in contact_columns:
        run=run+1 if x==last+1 else 1;longest=max(longest,run);last=x
    # Restrict horizontal seams to the actual occupied leg corridor. Existing gaps
    # between the two legs are vertical and should never be mistaken for a cut.
    rows=[]
    for y in range(max(1,int(origin_y+140*scale)),min(h-1,int(origin_y+180*scale))):
        cols=(sx[y]>=49)&(sx[y]<=111)
        before=a[y-1]&cols;after=a[y+1]&cols
        shared=before&after
        holes=shared&~a[y]
        if holes.sum()>=max(3,4*scale) and holes.sum()>=shared.sum()*.65:
            rows.append({'y':y,'missingPixels':int(holes.sum())})
    return {'detachedLegs':detached,'horizontalSeams':rows,'groundGapPixels':round(float(gap),3),'groundGapSourcePixels':round(float(gap/scale),3),'contactRunPixels':int(longest),'contactRunSourcePixels':round(float(longest/scale),3),'groundTolerancePixels':round(tolerance,3),'hasSupport':bool(foot_bottom>=0 and -tolerance<=gap<=tolerance and longest>=max(1,int(scale*2))), 'bodyLabel':body}

def card(image, title, metric=None, crop=False):
    view=image.crop((32,110,132,192)) if crop else image
    magnify=4 if crop else 2
    out=Image.new('RGB',(view.width*magnify+52,view.height*magnify+40),'#213347')
    pixels=view.resize((view.width*magnify,view.height*magnify),Image.Resampling.NEAREST)
    out.paste(pixels,(38,25),pixels)
    d=ImageDraw.Draw(out);d.text((6,5),title,fill='#ffffff',font=FONT)
    start_y=110 if crop else 0
    for y in range(120 if crop else 0,193,4 if crop else 16):
        py=25+(y-start_y)*magnify
        if py<25 or py>=out.height:continue
        color='#ffb86b' if y==184 else '#6b7c8f'
        d.line((30,py,out.width-8,py),fill=color,width=1);d.text((2,py-5),str(y),fill=color,font=FONT)
    if metric:
        for comp in metric['detachedLegs']:
            x1,y1,x2,y2=comp['bbox'];xoff=32 if crop else 0
            d.rectangle((38+(x1-xoff)*magnify,25+(y1-start_y)*magnify,38+(x2+1-xoff)*magnify,25+(y2+1-start_y)*magnify),outline='#ff6d77',width=2)
    return out

def detector_checks():
    """Prove the QA catches a severed limb and two airborne feet, not a lantern."""
    good=Image.new('RGBA',(160,192));d=ImageDraw.Draw(good)
    d.rectangle((58,60,103,149),fill='#71804aff')
    d.rectangle((63,146,76,183),fill='#936148ff');d.rectangle((86,146,99,183),fill='#936148ff')
    # Separate carried object near the bottom, deliberately outside leg corridor.
    d.rectangle((29,155,39,174),fill='#f6d28aff')
    normal=analyze(good)
    severed=good.copy();ImageDraw.Draw(severed).rectangle((58,160,104,163),fill=(0,0,0,0));cut=analyze(severed)
    floating=Image.new('RGBA',(160,192));floating.paste(good,(0,-6));air=analyze(floating)
    return {'validFeetAndIndependentLantern':not normal['detachedLegs'] and normal['hasSupport'],'severedLowerLegDetected':len(cut['detachedLegs'])==2,'bothFeetFloatingDetected':not air['hasSupport'] and air['groundGapPixels']==6}

detector=detector_checks()
assert all(detector.values()),detector
reports=[];frame_images={};bad=[]
for item in data['frames']:
    image=decode(item);frame_images[item['key']]=image
    metric=analyze(image);report={**item,**metric};reports.append(report)
    if metric['detachedLegs'] or metric['horizontalSeams'] or not metric['hasSupport']:
        bad.append({'kind':'cached','key':item['key'],'detached':len(metric['detachedLegs']),'seams':len(metric['horizontalSeams']),'groundGap':metric['groundGapPixels'],'contactRun':metric['contactRunPixels']})

draw_reports=[];draw_images={}
for item in data['draws']:
    image=decode(item)
    metric=analyze(image,scale=item['scale'],anchor_y=item['anchorY'],origin_x=item['originX'],origin_y=item['originY'])
    shadow=item.get('shadow')
    metric['overlapsGroundShadow']=bool(shadow and (shadow[1]-shadow[3])*item['factor']-1 <= item['anchorY']-metric['groundGapPixels'] <= (shadow[1]+shadow[3])*item['factor']+1)
    draw_reports.append({**item,**metric});draw_images[(item['key'],item['dpr'],item['zoom'])]=image
    if metric['detachedLegs'] or metric['horizontalSeams'] or not metric['hasSupport'] or not metric['overlapsGroundShadow']:
        bad.append({'kind':'draw','key':item['key'],'dpr':item['dpr'],'zoom':item['zoom'],'detached':len(metric['detachedLegs']),'seams':len(metric['horizontalSeams']),'groundGap':metric['groundGapPixels'],'contactRun':metric['contactRunPixels']})

# Complete canonical frame contact sheet, plus leg enlargement with orange anchor line.
for variant in ['girl','boy']:
    cards=[card(frame_images[r['key']],r['key'],r,crop=True) for r in reports if r['variant']==variant]
    cw,ch=cards[0].size;sheet=Image.new('RGB',(cw*9,ch*4),'#172638')
    for i,c in enumerate(cards):sheet.paste(c,((i%9)*cw,(i//9)*ch))
    sheet.save(OUT/f'gait-contact-{args.label}-{variant}-legs.png')
guides=[card(decode(item),item['variant']+'/SOURCE '+str(item['index']),crop=True) for item in data['sources']]
if guides:
    cw,ch=guides[0].size;guide=Image.new('RGB',(cw*3,ch*2),'#172638')
    for i,c in enumerate(guides):guide.paste(c,((i%3)*cw,(i//3)*ch))
    guide.save(OUT/f'gait-source-guide-{args.label}.png')

# Preserve actual draw output under every requested DPR/zoom; nearest enlargement
# keeps device pixels visible rather than concealing seams with screenshot filtering.
tiles=[]
for variant in ['girl','boy']:
    for dpr in [1,2]:
        for zoom in [.7,1,1.6]:
            key=variant+'/right/2';im=draw_images[(key,dpr,zoom)]
            factor=dpr*zoom;x0=int(65*factor);y0=int(155*factor);x1=int(135*factor);y1=int(206*factor)
            clip=im.crop((x0,y0,x1,y1));enlarge=max(1,round(4/factor));clip=clip.resize((clip.width*enlarge,clip.height*enlarge),Image.Resampling.NEAREST)
            tile=Image.new('RGB',(320,270),'#213347');tile.paste(clip,(10,35),clip);d=ImageDraw.Draw(tile);d.text((8,8),f'{key} DPR {dpr} ZOOM {zoom}',fill='white',font=FONT);ground=35+(200*factor-y0)*enlarge;d.line((5,ground,310,ground),fill='#ffb86b',width=1);tiles.append(tile)
sheet=Image.new('RGB',(320*6,270*2),'#172638')
for i,tile in enumerate(tiles):sheet.paste(tile,((i%6)*320,(i//6)*270))
sheet.save(OUT/f'gait-contact-{args.label}-draw-scales.png')

summary={'label':args.label,'sourceHash':source_hash,'detectorChecks':detector,'cachedFrameCount':len(reports),'actualDrawCount':len(draw_reports),'cachedFailures':sum(f['kind']=='cached' for f in bad),'actualDrawFailures':sum(f['kind']=='draw' for f in bad),'failures':bad,'browserErrors':errors,'frames':reports,'draws':draw_reports}
(OUT/f'gait-contact-{args.label}-report.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in summary.items() if k not in ['frames','draws','failures']}))
print(json.dumps(bad[:12]))
assert not errors,errors
assert not bad,f'{len(bad)} body/sole contact failures; see output/gait-contact-{args.label}-report.json'
