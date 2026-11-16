"""Read-only atlas QA: generated alpha, safe crops, identical plant-bed footprint."""
import json
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
meta=json.loads((ROOT/'assets/lake-props.json').read_text(encoding='utf-8'))
image=Image.open(ROOT/meta['art'])
assert image.mode=='RGBA' and image.size==(meta['width'],meta['height'])
alpha=image.getchannel('A')
# The untouched generated alpha has occasional 1/255 background residue.
assert max(alpha.getpixel((0,0)),alpha.getpixel((1253,1253)))<=3
bounds=[]
for row in range(2):
    for col in range(2):
        cell=alpha.crop((col*627,row*627,(col+1)*627,(row+1)*627))
        box=cell.point(lambda a:255 if a>100 else 0).getbbox()
        assert box and box[0]>20 and box[1]>20 and box[2]<607 and box[3]<607
        bounds.append(box)
assert bounds[0]==bounds[1], 'The empty and blooming frame must not shift the footprint'
for name,frame in meta['frames'].items():
    x,y,w,h=frame['source'];crop=alpha.crop((x,y,x+w,y+h))
    edges=[crop.crop((0,0,w,1)),crop.crop((0,h-1,w,h)),crop.crop((0,0,1,h)),crop.crop((w-1,0,w,h))]
    assert all(e.getextrema()[1]<100 for e in edges),name+' cropped an opaque edge'
for key in ['tower','rotor']:
    x,y=meta['absolutePivots'][key];assert alpha.getpixel((x,y))>240,key+' axle must be opaque'
print(json.dumps({'size':image.size,'alpha':alpha.getextrema(),'localBounds':bounds,'safeFrames':list(meta['frames']),'absolutePivots':meta['absolutePivots']}))
