/* Editable narrative registry. Object identity, navigation and quest rules are never editable. */
(() => {
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const base=clone(window.ISLAND_CONTENT),template=clone(window.ISLAND_TEMPLATE_CONTENT||window.ISLAND_CONTENT);
  const defs={story:window.ISLAND_ADVENTURE||[],quest:window.ISLAND_QUESTS||[],activity:window.ISLAND_ACTIVITIES||[],region:window.ISLAND_REGIONS||[]};
  const originals=Object.fromEntries(Object.entries(defs).map(([key,list])=>[key,clone(list)]));
  const fields=[],lookup=new Map();let active={},current,resolvedCurrent;
  const clean=value=>String(value??'').replaceAll('阿屿','{{guide}}').replaceAll('小满','{{girl}}');
  const copy={
    'basic.welcomeTitle':['欢迎标题','把时光，\n藏进星光里。'],
    'basic.welcomeSubtitle':['欢迎导语','四座星屿，和喜欢的人一起。\n沿着落花去看湖，种下明天的小期待。'],
    'basic.welcomeNote':['欢迎页小字','不必赶路，星光会等你。'],
    'ending.letterHeading':['信件标题','一封给你的信'],
    'ending.letterSubtitle':['信件副标题','把想说的话，轻轻写在这里。'],
    'ending.giftEyebrow':['兑换券眉题','一份小心愿'],
    'ending.finaleTitle':['庆典祝福','{{recipient}}，生日快乐！'],
    'ending.fireworkText':['天空烟花文字（每 7 秒绽放，建议 4–12 字）','生日快乐!'],
    'ending.finaleText':['庆典正文','原来岛上所有的星光，\n都是为了这一刻，与你相遇。'],
    'ending.finaleNote':['盲盒提示','这里，还有一份藏了很久的心意。'],
    'ending.replayWish':['重看星光祝福','{{recipient}}，生日快乐。愿你的世界，总有星光。'],
    'ending.bonusTitle':['全支线完成标题','{{guide}}留给你的小纸条'],
    'ending.bonusText':['全支线完成留言','你把别人的小心愿一件件放好，也别忘了照顾自己的。每片岛屿都会记得你来过：花开着，信寄出了，风也有了旋律。'],
    'scene.dialogueSubtitle':['对话副标题','有些话，想慢慢说给你听'],
    'scene.introSubtitle':['抵达篇章','第一章 · 星屿初见'],
    'scene.campfireSubtitle':['篝火副标题','篝火夜话 · 今晚，不必赶路'],
    'scene.campfireAfter':['篝火结束留言','篝火会一直暖着，想坐下时就回来。'],
    'scene.tentDayTitle':['帐篷白天标题','把世界的声音，调小一点'],
    'scene.tentNightTitle':['帐篷深夜标题','为你留一盏晚安的灯'],
    'scene.tentDayText':['帐篷白天纸条','这里有柔软的毯子，还有一盏不会催你出发的灯。\n\n枕边压着一张小纸条：「你不用每一天都闪闪发光。偶尔休息一下，也一样值得被喜欢。」'],
    'scene.tentSecret':['发现晚安彩蛋','你发现了星屿的深夜小秘密。'],
    'scene.tentNightAgain':['重访晚安彩蛋','这句晚安，每个深夜都为你留着。'],
    'scene.treeTitle':['树下写信页标题','许愿树下，写封信。'],
    'scene.treeReadyTitle':['树信默认标题','写给你的一封小信'],
    'scene.treeText':['树下写信页导语','把平时没说出口的话，轻轻放进信里。选一张喜欢的信纸，寄出今天的小小心意。'],
    'scene.treeReadyText':['树信示例正文','想把今天的一点好心情，放进这封小信里送给你。\n\n愿你慢慢靠近喜欢的生活，忙碌时也记得照顾自己。愿普通的日子里，总有让你微笑的小事。\n\n这里留给我们真正的故事。下一次见面，再一起把它写下去。'],
    'scene.observatoryTitle':['观星台等待标题','星星，还在等它的故事。'],
    'scene.observatoryText':['观星台等待留言','每一枚记忆水晶，都会唤醒一颗星。\n\n再找回 {{remaining}} 段回忆，就能把这片夜空连成只属于你的星座。'],
    'scene.constellationTitle':['连星标题','原来，我们也有自己的星空。'],
    'scene.constellationHint':['连星说明','按时光的顺序，轻点五颗星。'],
    'scene.memoryNew':['新回忆小字','这段时光，会成为夜空里的一颗星。'],
    'scene.memoryAgain':['重读回忆小字','这束微光，已经好好收在手记里。'],
    'scene.allMemories':['收齐回忆留言','五束微光都亮了。去观星台，把它们连成星座吧。'],
    'scene.journalTitle':['手记标题','把闪光的日常，收好。'],
    'scene.journalUnheard':['尚未听过篝火夜话','篝火旁，还有一段悄悄话'],
    'scene.memoryLocked':['尚未发现的回忆标题','还未抵达的时光'],
    'scene.memoryRoute':['前往未发现回忆的提示','沿着星光，去找这段回忆吧。'],
    'scene.navClose':['靠近物件的提示','再靠近一点点，就能听见它的故事。'],
    'scene.navBlocked':['绕路时的提示','试着从木桥绕过去，星光会为你引路。'],
    'scene.navEdge':['岛屿边缘提示','那里是岛屿边缘，沿着小路走吧。'],
    'scene.inventoryTitle':['探索背包标题','口袋里的，小小世界。'],
    'scene.returnWelcome':['再次来访留言','欢迎回来。你收藏的微光，一颗也没有少。'],
    'scene.mapIntro':['探索地图导语','所有岛屿始终开放。点选地点，{{girl}}会沿小路走过去。支线可以任意顺序发现。'],
    'scene.photoTitle':['纪念照标题','这一刻，有好好留下。'],
    'scene.constellationStart':['连星起点提示','从故事开始的地方出发'],
    'scene.constellationNext':['连星顺序提示','下一颗，是「{{theme}}」那段时光。'],
    'scene.constellationProgress':['连星进行提示','一点一点，靠近那个秘密'],
    'scene.constellationDone':['连星完成提示','星光已经收到你的心愿'],
    'scene.constellationHelp':['连星求助提示','找找「{{theme}}」之星，它正在为你闪烁。'],
    'character.activityBoy':['互动时男性陪伴留言','{{boy}}正陪在你身边'],
    'character.activityGuide':['互动时精灵陪伴留言','{{guide}}正陪在你身边'],
    'character.activityAlone':['互动时独行留言','一个人，也可以慢慢享受'],
    'character.girlDescription':['主角介绍','把小小的发现装进口袋：一片会唱歌的叶子、一枚温热的贝壳，还有一整天没说完的好心情。'],
    'character.boyDescription':['男性旅伴介绍','深蓝外套、暖暖的围巾，还有随时空出来牵你的那只手。风景很大，慢慢走也没关系。'],
    'character.guideSubtitle':['精灵身份','你的星屿向导'],
    'character.spiritOption':['精灵陪伴选项介绍','原来的小向导'],
    'character.boyOption':['男性陪伴选项介绍','让我的像素化身陪你'],
    'character.aloneOption':['独行选项介绍','给自己一段安静时光'],
    'character.boySubtitle':['旅伴身份','陪你看世界'],
    'character.noneSubtitle':['独行留言署名','{{guide}}留在岛上的话'],
    'character.boyJoined':['男性旅伴加入留言','这一次，由我陪你慢慢走。'],
    'character.guideJoined':['精灵加入留言','{{guide}}又飞回了你的身边。'],
    'character.alone':['独自探索留言','给自己一点安静的时光。'],
    'activity.sandcastle.stage0':['沙堡 · 开始','把小桶装满，开始筑起我们的城堡。'],
    'activity.sandcastle.stage1':['沙堡 · 沙丘','沙丘堆好了，再添两座小塔。'],
    'activity.sandcastle.stage2':['沙堡 · 双塔','最后，为城堡插上一面星星旗。'],
    'activity.sandcastle.stage3':['沙堡 · 完成','完成了！这座小城堡会留在海边等你。'],
    'activity.flower_garden.stage0':['花园 · 开始','选好了这一小片土地，先埋下一颗种子吧。'],
    'activity.flower_garden.stage1':['花园 · 播种','种子已经睡进土里，给它一点清水。'],
    'activity.flower_garden.stage2':['花园 · 花开','花开了！这片小花园会留在这里，等你再来。'],
    'activity.paper_boat.start':['纸船 · 开始','选一句温柔的心愿，再把纸船轻轻放进湖里。'],
    'activity.paper_boat.busy':['纸船 · 漂流','小纸船正带着心愿，慢慢漂向湖心。'],
    'activity.paper_boat.again':['纸船 · 再来','已经放出 {{count}} 艘小纸船。今天还有什么愿望？'],
    'activity.stone_skip.start':['水漂 · 开始','按一次开始蓄力，再按一次出手。'],
    'activity.stone_skip.charge':['水漂 · 蓄力','看准力度，再按一次出手。'],
    'activity.stone_skip.busy':['水漂 · 弹跳','小石头正在水面跳跃，等波纹慢慢散开。'],
    'activity.stone_skip.result':['水漂 · 结果','跳了 {{skips}} 下！最好的一次是 {{best}} 下。'],
    'activity.stone_skip.record':['水漂 · 纪录','最好记录：{{best}} 下。'],
    'activity.windmill.start':['风车 · 开始','一下、再一下，让小风车转起来。'],
    'activity.windmill.done':['风车 · 完成','风车已经收到这阵风。喜欢的话，就再轻轻拨一下。'],
    'activity.stroll.start':['散步 · 开始','脚步慢下来，心也会跟着松一口气。'],
    'activity.stroll.done':['散步 · 完成','海风替我们收好了一段并肩的时光。'],
    'activity.stroll.again':['散步 · 再来','好呀。再陪你走一小段。'],
    'activity.swing.start':['秋千 · 开始','轻轻推一下，风就会接住你。'],
    'activity.swing.pushed':['秋千 · 推动后','再高一点点——天空好像也近了一点。'],
    'activity.photo.start':['拍照 · 开始','把喜欢的风景，和此刻的自己一起留住。'],
    'scene.activitiesTitle':['活动册标题','今天，想一起做点什么？'],
    'scene.activitiesIntro':['活动册导语','不用收集钥匙，也不用等故事结束。走到这里，就能留下新的小回忆。'],
    'scene.photoBoy':['合照落款 · 男性旅伴','和你一起，把普通的一天收藏起来。'],
    'scene.photoAlone':['合照落款 · 独行','今天的风景，也值得被温柔收藏。'],
    'scene.photoGuide':['合照落款 · 精灵','沿途的小小微光，都是值得收藏的时刻。'],
    'hud.beforeTitle':['序章任务标题','有些美好，值得慢慢发现'],
    'hud.beforeText':['序章任务导语','那些藏在日常里的微光，\n都在这里，等你拾起。'],
    'hud.startedTitle':['拾忆任务标题','寻找散落的五束微光'],
    'hud.startedText':['拾忆任务导语','靠近发光水晶，按 F 拾取，或直接触碰物件。\n不用着急，我会一直陪着你。'],
    'hud.readyTitle':['盛典任务标题','让五段时光，连成星座'],
    'hud.readyText':['盛典任务导语','观星台的门已经打开。\n最后一个秘密，就藏在星空里。'],
    'hud.doneTitle':['结束任务标题','愿你的世界，总有星光'],
    'hud.doneText':['结束任务导语','这座岛，会一直为你亮着。\n随时回来，重温那些小小的美好。'],
    'hud.day':['晨光氛围','云很慢，今天也很可爱'],
    'hud.dusk':['暮色氛围','晚风路过，替我说想你'],
    'hud.night':['星夜氛围','风很轻，星星很近']
  };
  const previousTreeCopy={
    'scene.treeTitle':'每一份心意，都有回响',
    'scene.treeReadyTitle':'你的愿望，快要发光了',
    'scene.treeText':'树叶轻轻晃了晃，像是在说：\n「还差 {{remaining}} 束微光。那些平凡而珍贵的瞬间，会让这座岛慢慢亮起来。」',
    'scene.treeReadyText':'五段时光已经相遇。去观星台，把它们按照故事的顺序连起来吧。\n\n树下的最后一份礼物，正在等你。'
  };
  function add(id,section,group,label,value,options={}){
    const field={id,section,group,label,defaultValue:clean(value),templateValue:clean(value),maxLength:options.multiline===false?180:6000,multiline:options.multiline!==false,...options};
    if(typeof base.narrative?.[id]==='string'&&(base.treeCopyVersion===1||base.narrative[id]!==previousTreeCopy[id]))field.defaultValue=base.narrative[id];fields.push(field);lookup.set(id,field);return field;
  }
  const basicLabels={recipient:'收礼人的称呼',sender:'赠送者署名',birthday:'生日日期（可留空）',girlName:'主角名字',boyName:'男性旅伴名字',guideName:'精灵向导名字'};
  for(const [key,label] of Object.entries(basicLabels))add('basic.'+key,'basic','称呼与角色',label,template[key]??'',{multiline:false,maxLength:60,defaultValue:base[key]??template[key]??'',core:key});
  for(const [key,label,section,group] of [['intro','抵达时的第一段话','exploration','主线 · 抵达与篝火'],['goodnight','深夜晚安留言','sound','晚安语音'],['letter','盲盒里的长信','ending','长信与礼物'],['giftTitle','兑换券标题','ending','长信与礼物'],['giftDescription','兑换券内容','ending','长信与礼物']])add('core.'+key,section,group,label,template[key],{core:key,defaultValue:base[key],maxLength:key==='letter'?12000:6000,multiline:key!=='giftTitle'});
  template.campfire.forEach((value,i)=>add('campfire.'+i,'exploration','主线 · 抵达与篝火','篝火第 '+(i+1)+' 句话',value,{defaultValue:base.campfire?.[i]??value}));
  const labels={theme:'回忆主题',title:'标题',location:'地点名称',text:'正文',name:'名称',itemName:'背包物品名称',afterGoal:'发现目标后的补充',completeText:'完成后的剧情',label:'选项文字',result:'选择后的剧情',description:'介绍',reward:'奖励名称',effect:'完成后说明',hint:'交互提示',eyebrow:'英文眉题',subtitle:'副标题'};
  template.memories.forEach((memory,i)=>['theme','title','location','text'].forEach(key=>add('memory.'+memory.id+'.'+key,'memories',String(i+1).padStart(2,'0')+' · '+memory.theme,labels[key],memory[key],{defaultValue:base.memories[i]?.[key]??memory[key],multiline:key==='text',memoryIndex:i,memoryKey:key})));
  for(const [kind,list] of Object.entries(originals))for(const item of list){
    const group=(kind==='story'?'故事 · ':kind==='quest'?'心愿 · ':kind==='activity'?'互动 · ':'地图 · ')+item.name;
    for(const key of kind==='story'?['name','itemName','title','text','afterGoal','completeText']:kind==='quest'?['name','description','reward','effect']:kind==='activity'?['name','description','hint','eyebrow']:['name','subtitle'])if(typeof item[key]==='string')add(kind+'.'+item.id+'.'+key,'exploration',group,labels[key],item[key],{definition:{kind,id:item.id,path:[key]},multiline:['text','afterGoal','completeText','description','effect','hint'].includes(key)});
    for(const [array,keys] of [['choices',['label','result']],['wishes',['text']],['landmarks',['name']]])for(const choice of item[array]||[])for(const key of keys)if(typeof choice[key]==='string')add(kind+'.'+item.id+'.'+array+'.'+choice.id+'.'+key,'exploration',group,(array==='choices'?'选项 · ':array==='wishes'?'心愿 · ':'地标 · ')+(labels[key]||'文字'),choice[key],{definition:{kind,id:item.id,path:[array,choice.id,key]},multiline:key==='result'});
  }
  for(const [id,[label,value]] of Object.entries(copy)){
    const section=id.startsWith('basic.')?'basic':id.startsWith('ending.')?'ending':'exploration';
    const activity=id.startsWith('activity.')?originals.activity.find(item=>item.id===id.split('.')[1]):null;
    add(id,section,activity?'互动 · '+activity.name:id.startsWith('character.')?'人物介绍':section==='ending'?'长信与礼物':section==='basic'?'欢迎页':'主线 · 场景与提示',label,value,{multiline:id==='ending.fireworkText'?false:!/(Title|Heading|Eyebrow|Subtitle|Joined)$/.test(id),...(id==='ending.fireworkText'?{maxLength:64}:{})});
  }
  function normalize(raw={}){
    const result={schemaVersion:2,treeCopyVersion:1,narrative:{}};raw=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
    const oldSchema=raw.schemaVersion!==2,legacy=oldSchema&&raw.recipient==='美琪';
    const sanitize=(value,max)=>{let text=value.slice(0,max);if(legacy)text=text.replaceAll('美琪','{{recipient}}').replace(/9月16日?/g,'{{birthday}}');return text;};
    for(const key of Object.keys(basicLabels))if(typeof raw[key]==='string')result[key]=sanitize(raw[key],60);
    if(legacy)result.recipient=template.recipient;
    if(oldSchema&&['9月16','9月16日','09-16','9/16','09/16'].includes(raw.birthday))result.birthday='';
    for(const key of ['intro','goodnight','letter','giftTitle','giftDescription'])if(typeof raw[key]==='string')result[key]=sanitize(raw[key],key==='letter'?12000:6000);
    if(Array.isArray(raw.campfire))result.campfire=template.campfire.map((v,i)=>typeof raw.campfire[i]==='string'?sanitize(raw.campfire[i],6000):v);
    if(Array.isArray(raw.memories))result.memories=template.memories.map((m,i)=>Object.fromEntries(['theme','title','location','text'].filter(key=>typeof raw.memories[i]?.[key]==='string').map(key=>[key,sanitize(raw.memories[i][key],key==='text'?6000:180)])));
    if(raw.narrative&&typeof raw.narrative==='object'&&!Array.isArray(raw.narrative))for(const field of fields)if(typeof raw.narrative[field.id]==='string')result.narrative[field.id]=raw.treeCopyVersion!==1&&raw.narrative[field.id]===previousTreeCopy[field.id]?field.templateValue:sanitize(raw.narrative[field.id],field.maxLength);
    return result;
  }
  function values(custom={},useTemplate=false){
    const data=normalize(custom),out={};
    for(const field of fields){let value=useTemplate?field.templateValue:field.defaultValue;
      if(!useTemplate){if(field.core&&typeof data[field.core]==='string')value=data[field.core];if(field.memoryKey&&typeof data.memories?.[field.memoryIndex]?.[field.memoryKey]==='string')value=data.memories[field.memoryIndex][field.memoryKey];if(field.id.startsWith('campfire.')&&typeof data.campfire?.[+field.id.split('.')[1]]==='string')value=data.campfire[+field.id.split('.')[1]];if(typeof data.narrative[field.id]==='string')value=data.narrative[field.id];}
      out[field.id]=value;
    }return out;
  }
  function fromValues(input){const custom={schemaVersion:2,treeCopyVersion:1,narrative:{},memories:template.memories.map(()=>({})),campfire:[]};for(const field of fields){const value=String(input[field.id]??'').slice(0,field.maxLength);if(field.core)custom[field.core]=value;else if(field.memoryKey)custom.memories[field.memoryIndex][field.memoryKey]=value;else if(field.id.startsWith('campfire.'))custom.campfire[+field.id.split('.')[1]]=value;else custom.narrative[field.id]=value;}return normalize(custom);}
  function tokens(value,data,extra={}){const names={recipient:data['basic.recipient'],sender:data['basic.sender'],girl:data['basic.girlName'],boy:data['basic.boyName'],guide:data['basic.guideName'],birthday:data['basic.birthday'],...extra};return String(value??'').replace(/\{\{(\w+)\}\}/g,(whole,key)=>Object.prototype.hasOwnProperty.call(names,key)?String(names[key]??''):whole);}
  function text(key,extra={},custom){const data=custom===undefined?(current||(current=values(active))):values(custom);return tokens(data[key]??'',data,extra);}
  function resolve(custom=active,raw=false){const data=values(custom),result=clone(base),read=id=>raw?data[id]:tokens(data[id],data);
    for(const field of fields)if(field.core)result[field.core]=read(field.id);
    result.memories=base.memories.map((m,i)=>({...m,...Object.fromEntries(['theme','title','location','text'].map(key=>[key,read('memory.'+m.id+'.'+key)]))}));
    result.campfire=template.campfire.map((_,i)=>read('campfire.'+i));
    for(const key of ['welcomeTitle','welcomeSubtitle','welcomeNote'])result[key]=read('basic.'+key);
    for(const key of ['letterHeading','letterSubtitle','giftEyebrow','finaleTitle','finaleText','finaleNote'])result[key]=read('ending.'+key);
    result.narrative={...data};result.treeCopyVersion=1;return result;
  }
  function apply(custom){active=normalize(custom);current=values(active);const rendered=resolve(active);resolvedCurrent=rendered;for(const field of fields)if(field.definition){const {kind,id,path}=field.definition,target=defs[kind].find(item=>item.id===id);if(path.length===1)target[path[0]]=tokens(current[field.id],current);else target[path[0]].find(item=>item.id===path[1])[path[2]]=tokens(current[field.id],current);}
    for(let i=0;i<base.memories.length;i++)for(const key of ['theme','title','location','text'])ISLAND_CONTENT.memories[i][key]=rendered.memories[i][key];
    window.dispatchEvent(new CustomEvent('island:personalization',{detail:rendered}));return rendered;
  }
  function activityStatus(id,saved,a={}){const t=(key,vars)=>text('activity.'+id+'.'+key,vars);if(id==='sandcastle')return t('stage'+saved.sandcastle);if(id==='flower_garden')return t('stage'+saved.gardenStage);if(id==='paper_boat')return a.busy?t('busy'):saved.boats?t('again',{count:saved.boats}):t('start');if(id==='stone_skip')return a.charging?t('charge'):a.busy?t('busy'):a.lastSkips?t('result',{skips:a.lastSkips,best:saved.bestSkips}):t('start')+(saved.bestSkips?' '+t('record',{best:saved.bestSkips}):'');if(['windmill','stroll'].includes(id))return t(saved.completed.includes(id)?'done':'start');return t('start');}
  window.IslandPersonalization={registry:()=>fields.map(field=>({...field})),normalize,values,fromValues,tokens,resolve,apply,text,activityStatus,templateContent:template,export:custom=>resolve(custom,true),get current(){return resolvedCurrent||resolve(active);},get active(){return clone(active);}};
})();
