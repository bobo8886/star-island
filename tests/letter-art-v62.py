"""Pure renderer QA: PNG evidence, complete measured text, paging and URL cleanup."""
import base64
import json
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/letter-art-v62'
OUT.mkdir(parents=True,exist_ok=True)
report={'themes':{},'errors':[]}

def save_pages(result,prefix):
    for page in result['pages']:
        path=OUT/f'{prefix}-{page["index"]}.png'
        path.write_bytes(base64.b64decode(page.pop('data')))
        with Image.open(path) as im:
            assert im.format=='PNG' and im.size==(page['width'],page['height'])
            assert im.width==1080 and im.height<=3600

with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    context=browser.new_context(viewport={'width':1200,'height':900})
    page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
    page.goto('http://127.0.0.1:4173/src/letter-art.js')
    page.set_content('<!doctype html><meta charset="utf-8"><body style="margin:0;background:#dedbd3"></body>')
    page.add_script_tag(url='http://127.0.0.1:4173/src/letter-art.js')
    page.evaluate(r'''() => {
      window.drawn=[];window.revoked=[];window.created=[];
      const fill=CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...rest){drawn.push({text,font:this.font,x,y,width:this.measureText(text).width,canvas:this.canvas});return fill.call(this,text,x,y,...rest)};
      const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
      URL.createObjectURL=blob=>{const url=create(blob);created.push(url);return url};URL.revokeObjectURL=url=>{revoked.push(url);revoke(url)};
      window.renderQA=async(draft,options={})=>{
        drawn.length=0;const start=performance.now(),result=await IslandLetterArt.render(draft,options),elapsed=performance.now()-start;
        const normalized=IslandLetterArt.normalize(draft),rows=result.pages.flatMap(p=>p.bodyLines);
        if(rows.join('')!==normalized.body.replace(/\n/g,''))throw Error('Body characters lost while wrapping/paging');
        const bodyInk=drawn.filter(r=>r.font.startsWith('34px '));
        if(bodyInk.map(r=>r.text).join('')!==normalized.body.replace(/\n/g,''))throw Error('Body characters not actually drawn');
        for(const line of bodyInk){if(line.width>816.01||line.x+line.width>948.01)throw Error('Body line overflow');if(line.y>line.canvas.height-100||line.y<100)throw Error('Body line outside page');}
        const pages=[];
        for(const item of result.pages){
          const buffer=await item.blob.arrayBuffer();let binary='';for(const byte of new Uint8Array(buffer))binary+=String.fromCharCode(byte);
          const image=await createImageBitmap(item.blob);if(image.width!==item.width||image.height!==item.height)throw Error('PNG dimensions differ');image.close();
          const actualPageInk=drawn.filter(r=>r.canvas===item.canvas);
          if(!actualPageInk.some(r=>r.text===item.index+' / '+item.total))throw Error('Missing drawn page number');
          pages.push({index:item.index,total:item.total,width:item.width,height:item.height,bytes:item.blob.size,mime:item.blob.type,firstLine:item.bodyLines[0]||'',lastLine:item.bodyLines.at(-1)||'',blankLines:item.bodyLines.filter(t=>t==='').length,lineCount:item.bodyLines.length,data:btoa(binary)});
        }
        const urlCount=revoked.length;result.dispose();result.dispose();if(revoked.length-urlCount!==result.pages.length)throw Error('Object URL disposal not exactly once');
        return {pages,elapsedMs:elapsed,bodyCharacters:Array.from(normalized.body).length,drawnBodyLines:bodyInk.length,plainText:result.plainText,allCharactersActuallyDrawn:true,measuredNoOverflow:true,pageNumbersActuallyDrawn:true,urlsDisposedExactlyOnce:true};
      };
    }''')
    sample={
      'to':'亲爱的姐姐','from':'一直陪你看星星的我','title':'有一封春天，想寄给你','date':'2026 年 11 月 16 日',
      'body':'今天想郑重地告诉你：\n认识你，是我生活里一件很明亮的事。\n\n那些并肩走过的小路、说到一半就笑起来的话，还有一起看过的晚霞，我都悄悄收藏着。它们并不喧闹，却让我觉得，每一个普通的日子都很值得。\n\n愿新的一岁，你有热爱的事情，有放心撒娇的人，也有说走就走的勇气。累的时候，就慢一点；开心的时候，要笑得再大声一点。\n\n这封信没有截止日期。无论什么时候打开，我的祝福都在这里。\n生日快乐，愿你一直被温柔以待。🌸'
    }
    for theme in ['petal','starlight','meadow']:
        sample['theme']=theme
        result=page.evaluate('([draft,options])=>renderQA(draft,options)',[sample,{}]);save_pages(result,theme)
        assert len(result['pages'])==1
        report['themes'][theme]=result
    normalization=page.evaluate(r'''() => {const d=IslandLetterArt.normalize({to:'  姐姐\r\n你好\u0000 ',from:'😀'.repeat(80),title:'题'.repeat(100),date:'日'.repeat(60),body:'开头\r\n\r\n中间\t空格\u0000\n最后\n',theme:'bad'});return {draft:d,limits:[...['to','from','title','date','body'].map(k=>Array.from(d[k]).length)],empty:IslandLetterArt.normalize(null)};}''')
    assert normalization['draft']['theme']=='petal' and normalization['draft']['to']==' 姐姐 你好 '
    assert normalization['limits'][1:4]==[60,80,40]
    assert normalization['draft']['body']=='开头\n\n中间    空格\n最后\n'
    assert normalization['empty']=={'to':'','from':'','title':'','date':'','body':'','theme':'petal'}
    report['normalization']=normalization
    typed=page.evaluate("() => {let value='';for(const char of 'Jane Doe')value=IslandLetterArt.normalize({to:value+char}).to;let title='';for(const char of 'A Letter For You')title=IslandLetterArt.normalize({title:title+char}).title;return {value,title,trailing:IslandLetterArt.normalize({to:'Jane '}).to};}")
    assert typed=={'value':'Jane Doe','title':'A Letter For You','trailing':'Jane '}
    report['keystrokeSpacesPreserved']=typed
    body_limit=page.evaluate("() => {const body=IslandLetterArt.normalize({body:'💌'.repeat(6100)}).body;return {characters:Array.from(body).length,first:body.slice(0,2),last:body.slice(-2),replacement:body.includes('\\ufffd')};}")
    assert body_limit=={'characters':6000,'first':'💌','last':'💌','replacement':False}
    report['unicodeBodyLimit']=body_limit
    paragraph='这是一段长信正文。每一行都应该留下，不截断、不遗漏。英文也要清楚：May every ordinary day carry a little light. 👩‍❤️‍👨🌷\n\n'
    prefix='长信开始标记甲乙丙\n\n'
    long_body=(prefix+paragraph*80)[:5700]+'\n\n'+('https://example.com/'+('long-continuous-path-'*12))+'\n\n最后一段：终点标记——星光已经送达。'
    assert len(long_body)<=6000
    long_draft={**sample,'theme':'starlight','title':'把慢慢说的话，一页一页留给你','body':long_body}
    result=page.evaluate('([draft,options])=>renderQA(draft,options)',[long_draft,{}]);save_pages(result,'long-letter')
    assert len(result['pages'])>=4 and result['pages'][-1]['lastLine'].endswith('星光已经送达。')
    assert sum(p['blankLines'] for p in result['pages'])>=long_body.count('\n\n')
    report['longLetter']=result
    stress={**sample,'theme':'meadow','body':'网址：'+('W'*650)+'\n\n'+('家庭：👩‍👩‍👧‍👦'*12)+'\n\n终点：所有连续字符完整。'}
    result=page.evaluate('([draft,options])=>renderQA(draft,options)',[stress,{'maxHeight':1800}]);save_pages(result,'continuous')
    assert result['pages'][-1]['lastLine'].endswith('所有连续字符完整。')
    report['continuousAndEmoji']=result
    maximal={key:char*limit for key,char,limit in [('to','收',60),('from','寄',60),('title','题',80),('date','日',40)]}
    maximal.update(body='正文末端，完整。',theme='petal')
    result=page.evaluate('([draft,options])=>renderQA(draft,options)',[maximal,{}]);save_pages(result,'max-fields');report['maxFields']=result
    empty=page.evaluate('([draft,options])=>renderQA(draft,options)',[{},{}]);save_pages(empty,'empty')
    assert empty['plainText']=='' and empty['drawnBodyLines']==0
    report['emptyHasNoPlaceholder']=True
    report['noURLLeaks']=page.evaluate('created.length===revoked.length&&new Set(created).size===new Set(revoked).size')
    assert report['noURLLeaks'] and not report['errors']
    (OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    context.close();browser.close()
print(json.dumps({'themes':list(report['themes']),'longPages':len(report['longLetter']['pages']),'maxPageHeight':max(p['height'] for p in report['longLetter']['pages']),'urlLeaks':not report['noURLLeaks'],'errors':report['errors']}))
