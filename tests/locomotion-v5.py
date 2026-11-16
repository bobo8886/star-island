"""Real UI locomotion samples: pace continuity, settling and obstacle safety.
Use --diagnose to record the old behaviour without asserting the new jitter budget.
"""
import json
import math
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
diagnose='--diagnose' in sys.argv
errors=[]

def summarize(rows):
    moving=[r for r in rows if r['pw']>0]
    switches=sum((a['sw']>0)!=(b['sw']>0) for a,b in zip(moving,moving[1:]))
    changes=sum(a['sd']!=b['sd'] for a,b in zip(moving,moving[1:]))
    speeds=[]
    for a,b in zip(rows,rows[1:]):
        dt=(b['t']-a['t'])/1000
        if dt>.001:speeds.append(math.hypot(b['sx']-a['sx'],b['sy']-a['sy'])/dt)
    return {'frames':len(rows),'movingFrames':len(moving),'companionIdleWhilePlayerMoves':sum(r['sw']==0 for r in moving),
            'walkIdleTransitions':switches,'directionChanges':changes,'maxCompanionSpeed':max(speeds,default=0),
            'illegalPlayerFrames':sum(not r['pLegal'] for r in rows),'illegalCompanionFrames':sum(not r['sLegal'] for r in rows)}

with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1440,'height':900})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:4173')
    page.wait_for_function('window.starIsland && starIsland.snapshot().world.ready',timeout=30000)
    page.locator('#start-button').click();page.locator('#dialogue-next').click()
    page.locator('#character-button').click();page.locator('[data-companion="boy"]').click();page.locator('#character-back').click()
    page.evaluate('''() => {
      window.motionRows=[];window.motionSampling=false;
      function sample(t){if(motionSampling){const w=starIsland.snapshot().world,p=w.player,s=w.spirit,nav=IslandNavigation.forRegion(w.region);motionRows.push({t,px:p.x,py:p.y,pw:p.walk,sx:s.x,sy:s.y,sw:s.walk,sd:s.direction,activity:w.activity?.id||null,progress:w.activity?.progress||0,pLegal:nav.walkable(p.x,p.y),sLegal:nav.walkable(s.x,s.y)});}requestAnimationFrame(sample);}requestAnimationFrame(sample);
    }''')
    page.locator('#activities-button').click();page.locator('[data-activity-route="stroll"]').click()
    page.wait_for_function('starIsland.snapshot().world.activity?.id === "stroll"',timeout=20000)
    page.evaluate('motionRows=[];motionSampling=true')
    page.wait_for_function('starIsland.snapshot().world.activity.progress>=1',timeout=18000)
    page.wait_for_timeout(600)
    page.evaluate('motionSampling=false')
    strollRows=page.evaluate('motionRows')
    page.locator('#activity-leave').click();page.wait_for_timeout(1300)
    # Real navigation around the coast's rock and ruin obstacles.
    page.locator('#map-button').click();page.locator('.map-destination[data-id="lighthouse_stone"]').click()
    page.evaluate('motionRows=[];motionSampling=true')
    page.wait_for_function('starIsland.snapshot().screen === "adventure"',timeout=18000)
    page.evaluate('motionSampling=false')
    followRows=page.evaluate('motionRows')
    page.locator('#story-dismiss').click();page.wait_for_timeout(2300)
    page.evaluate('motionRows=[];motionSampling=true');page.wait_for_timeout(1100);page.evaluate('motionSampling=false')
    settled=page.evaluate('motionRows')
    drift=max((math.hypot(r['sx']-settled[0]['sx'],r['sy']-settled[0]['sy']) for r in settled),default=0)
    result={'stroll':summarize(strollRows),'ordinaryFollow':summarize(followRows),'settled':{'maxDisplacement':drift,'walkFrames':sum(r['sw']>0 for r in settled),'directionChanges':sum(a['sd']!=b['sd'] for a,b in zip(settled,settled[1:]))},'browserErrors':errors}
    label='before' if diagnose else 'after'
    (ROOT/f'output/locomotion-v5-{label}-samples.json').write_text(json.dumps({'stroll':strollRows,'follow':followRows,'settled':settled}),encoding='utf-8')
    (ROOT/f'output/locomotion-v5-{label}.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps(result))
    assert not errors,errors
    assert result['stroll']['illegalPlayerFrames']==0
    assert result['stroll']['illegalCompanionFrames']==0
    assert result['ordinaryFollow']['illegalCompanionFrames']==0
    if not diagnose:
        assert result['stroll']['walkIdleTransitions']<=8,result
        assert result['stroll']['companionIdleWhilePlayerMoves']/max(1,result['stroll']['movingFrames'])<.06,result
        assert result['stroll']['maxCompanionSpeed']<180,result
        assert drift<1 and result['settled']['walkFrames']==0,result
    browser.close()
