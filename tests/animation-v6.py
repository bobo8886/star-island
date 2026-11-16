"""Full-pose atlas QA. Source PNGs stay unchanged; renderer imports their full drawings."""
import base64,json,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output';OUT.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':1000})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:4173/assets/gait-frame-review.html')
    page.wait_for_function('window.gaitReviewReady',timeout=60000)
    report=page.evaluate('''()=>{const C=IslandCharacter,result={ready:C.isReady(),errors:C.errors,mode:C.motionRendering,info:C.getAnimationInfo(),frames:[]};
      for(const variant of ['girl','boy'])for(const direction of ['down','right','up','left'])for(let beat=0;beat<9;beat++){
        const c=C.frame(direction,beat===8?'idle':'walk',beat,false,variant),p=c.getContext('2d').getImageData(0,0,160,192).data;let x0=160,y0=192,x1=0,y1=0,pixels=0,border=0,contact=0;
        for(let y=0;y<192;y++)for(let x=0;x<160;x++)if(p[(y*160+x)*4+3]){pixels++;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x+1);y1=Math.max(y1,y+1);if(x===0||x===159||y===0||y===191)border++;if(y===183)contact++;}
        result.frames.push({variant,direction,beat,box:[x0,y0,x1,y1],pixels,border,contact});
      }
      result.poseChange=[];
      for(const variant of ['girl','boy'])for(const direction of ['down','right','up']){
        const widths=[],upperChange=[],unique=new Set();
        for(let beat=0;beat<8;beat++){
          const c=C.frame(direction,'walk',beat,false,variant),p=c.getContext('2d').getImageData(0,0,160,192).data,next=C.frame(direction,'walk',(beat+1)%8,false,variant).getContext('2d').getImageData(0,0,160,192).data;let left=160,right=0,changed=0;
          for(let y=147;y<184;y++)for(let x=0;x<160;x++)if(p[(y*160+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x+1);}
          for(let y=60;y<130;y++)for(let x=0;x<160;x++){const n=(y*160+x)*4;if(p[n]!==next[n]||p[n+1]!==next[n+1]||p[n+2]!==next[n+2]||p[n+3]!==next[n+3])changed++;}
          widths.push(right-left);upperChange.push(changed);unique.add(c.toDataURL());
        }
        result.poseChange.push({variant,direction,lowerSilhouetteWidth:widths,upperBodyChangedPixels:upperChange,uniqueFullDrawings:unique.size});
      }return result;}''')
    for variant in ['girl','boy']:
        data=page.locator('#'+variant).evaluate('(c)=>c.toDataURL().split(",")[1]')
        (OUT/f'walk-v6-{variant}-full.png').write_bytes(base64.b64decode(data))
    report['sourceHash']=hashlib.sha256((ROOT/'src/character.js').read_bytes()).hexdigest()
    report['browserErrors']=errors
    (OUT/'animation-v6-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    assert report['ready'] and report['mode']=='full-pose-atlas-v6',report
    assert not report['errors'] and not errors,(report['errors'],errors)
    assert len(report['frames'])==72
    for frame in report['frames']:
        assert frame['pixels']>4000 and frame['border']==0 and frame['box'][3]==184 and frame['contact']>=3,frame
    assert len(report['info']['sets'])==6
    for poses in report['poseChange']:
        assert poses['uniqueFullDrawings']==8 and min(poses['upperBodyChangedPixels'])>250,poses
        if poses['direction']=='right':
            assert poses['lowerSilhouetteWidth'][0]>poses['lowerSilhouetteWidth'][2]*1.8,poses
    print(json.dumps({'ready':True,'mode':report['mode'],'frames':72,'grounded':72,'browserErrors':errors,'sourceHash':report['sourceHash']}))
    browser.close()
