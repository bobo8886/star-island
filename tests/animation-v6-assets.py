"""Read-only source analysis for complete generated walk drawings (no PNG edits)."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
def components(mask):
    h,w=mask.shape;pending=bytearray(mask.tobytes());groups=[]
    for start in range(w*h):
        if not pending[start]:continue
        pending[start]=0;stack=[start];pixels=[];x0=w;y0=h;x1=y1=0
        while stack:
            q=stack.pop();pixels.append(q);y,x=divmod(q,w);x0=min(x0,x);y0=min(y0,y);x1=max(x1,x+1);y1=max(y1,y+1)
            for yy in range(max(0,y-1),min(h,y+2)):
                for xx in range(max(0,x-1),min(w,x+2)):
                    z=yy*w+xx
                    if pending[z]:pending[z]=0;stack.append(z)
        groups.append({'pixels':pixels,'area':len(pixels),'box':[x0,y0,x1,y1]})
    return sorted(groups,key=lambda c:c['area'],reverse=True)
ROOT=Path(__file__).resolve().parents[1]
result={}
for name in ['character','companion']:
    for direction in ['side','front','back']:
        path=ROOT/f'assets/{name}-walk-{direction}-v6.png'
        im=Image.open(path);rgba=np.array(im);w,h=im.size;assert im.mode=='RGBA';assert w%4==0 and h%2==0
        cw,ch=w//4,h//2;frames=[]
        for i in range(8):
            x,y=i%4*cw,i//4*ch;p=rgba[y:y+ch,x:x+cw];mask=(p[:,:,3]>=180)&~((p[:,:,0]>180)&(p[:,:,1]<55)&(p[:,:,2]<55))
            groups=components(mask);main=groups[0];body=np.zeros(mask.shape,dtype=bool);body.ravel()[main['pixels']]=True
            ys,xs=np.where(body);box=[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]
            head=body.copy();head[box[1]+int((box[3]-box[1])*.36):,:]=False
            hy,hx=np.where(head);head_box=[int(hx.min()),int(hy.min()),int(hx.max()+1),int(hy.max()+1)]
            unwanted=[]
            for group in groups[1:]:
                if group['area']<8:continue
                unwanted.append({'area':group['area'],'box':group['box']})
            frames.append({'box':box,'headBox':head_box,'headX':(head_box[0]+head_box[2])/2,'groundY':box[3],'height':box[3]-box[1],'pixels':main['area'],'otherComponents':unwanted})
        result[name+'/'+direction]={'path':path.relative_to(ROOT).as_posix(),'width':w,'height':h,'cell':[cw,ch],'frames':frames}
target=ROOT/'output/animation-v6-assets.json';target.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:{'height':[f['height'] for f in v['frames']],'headX':[f['headX'] for f in v['frames']],'otherComponents':[f['otherComponents'] for f in v['frames']]} for k,v in result.items()}))
