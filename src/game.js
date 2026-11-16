(() => {
  'use strict';
  const l10n=window.IslandI18n?.t||((text)=>text);
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state = IslandStore.load();
  const personalization=window.IslandPersonalization;
  const tr=(key,vars={})=>personalization.text(key,vars);
  personalization.apply(state.custom);
  let media = {}, activeScreen = '', toastTimer, modalAfterClose = null, currentAudio = null, queuedDestination = null;
  let activityTimer = null, characterPreviewToken = 0, lastPhoto = null;
  const mediaReady = IslandStore.mediaAll().then(result=>{media=result;});
  const modal = $('modal'), panel = $('modal-content');
  function content() {
    return personalization.resolve(state.custom);
  }
  const world = new IslandWorld($('world'),{state,toast,interact:interactWith,nearby:updateNearby,map:openMap,journal:openJournal,onReady:refreshLoadState,regionChanged:id=>{state.region=id;if(!state.visitedRegions.includes(id))state.visitedRegions.push(id);persist();}});
  function refreshLoadState(){const button=$('start-button');button.disabled=!world.ready;button.setAttribute('aria-busy',String(!world.ready&&!world.assetError));button.innerHTML=world.ready?l10n("开启这场奇遇 <span>↗</span>"):world.assetError?l10n("素材加载失败，请刷新页面"):l10n("正在铺好星光… <span>✧</span>");}
  function persist() { const ok=IslandStore.save(state);updateUI();if(!ok)toast(l10n("浏览器未能保存进度，请在设置中导出备份。"));return ok; }
  function toast(message) { clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,4100); }
  function updateUI() {
    refreshLoadState();
    const c=content();document.querySelector('.intro-panel h1').textContent=c.welcomeTitle;document.querySelector('.intro-copy').textContent=c.welcomeSubtitle;document.querySelector('.intro-footnote').textContent='✧ '+c.welcomeNote;
    const currentRegion=(window.ISLAND_REGIONS||[]).find(r=>r.id===state.region);if(currentRegion)$('world-label').innerHTML='<span class="tiny-cross">✧</span> '+esc(currentRegion.name)+' · '+esc(currentRegion.subtitle)+'<span class="label-line"></span>';
    document.body.classList.toggle('started',state.started);document.body.classList.toggle('sound-on',state.settings.sound);document.body.classList.toggle('reduced-motion',state.settings.reducedMotion);
    document.body.classList.toggle('celebrating',state.started&&state.finished);
    world.started=state.started;$('touch-controls').hidden=!state.started;$('sound-button').setAttribute('aria-label',state.settings.sound?l10n("关闭声音"):l10n("开启声音"));$('sound-button').title=state.settings.sound?l10n("关闭声音"):l10n("开启声音");
    $('memory-progress').setAttribute('aria-label',`${l10n("已收集 ")}${state.collected.length}${l10n(" 枚，共 5 枚")}`);$('progress-count').innerHTML=`${state.collected.length} <i>/ 5</i>`;
    [...$('memory-progress').querySelectorAll('span')].forEach((el,i)=>{const m=ISLAND_CONTENT.memories[i];el.classList.toggle('lit',state.collected.includes(m.id));el.style.setProperty('--crystal',m.color);el.textContent=state.collected.includes(m.id)?'◆':'◇';el.title=m.theme;});
    const all=state.collected.length===5;
    $('chapter-badge').textContent=state.finished?l10n("终章 · 星愿"):all?l10n("第三章 · 盛典"):state.started?l10n("第二章 · 拾忆"):l10n("序章 · 抵达");
    const chapter=state.finished?'done':all?'ready':state.started?'started':'before';$('quest-title').textContent=tr('hud.'+chapter+'Title');$('quest-description').textContent=tr('hud.'+chapter+'Text');
    $('save-status').textContent=!state.started?l10n("故事从这里开始"):IslandStore.available?l10n("进度已记在这台设备"):l10n("请导出备份保存进度");
    updateExplorationHUD();
    if(state.started){document.querySelector('.intro-panel>.eyebrow').innerHTML=l10n("<span></span> 给你的时光盲盒");document.querySelector('.chapter-line span:last-child').textContent=state.finished||all?'03 / 03':'02 / 03';document.querySelector('.chapter-line span:first-child').textContent=state.finished?'FOREVER':all?'THE WISH':'MEMORIES';}
  }
  function updateNearby(item) {const el=$('interact-hint');el.hidden=!item||!state.started||modal.open;if(item)el.querySelector('span').textContent=item.id==='tree'?item.name+l10n(" · 写一封信"):item.type==='memory'?(state.collected.includes(item.id)?l10n("重温 · "):l10n("拾起 · "))+item.theme:item.name;}
  function stopVoice(){if(currentAudio){currentAudio.pause();currentAudio=null;}IslandAudio.duck(false);}
  function show(html,screen='default',afterClose=null){stopVoice();if(activeScreen==='activity'&&screen!=='activity'){world.stopActivity?.();clearInterval(activityTimer);}document.body.classList.toggle('doing-activity',screen==='activity');activeScreen=screen;modalAfterClose=afterClose;world.setPaused(true);$('interact-hint').hidden=true;panel.innerHTML=html;const heading=panel.querySelector('h2,h3');if(heading){heading.id='modal-title';modal.setAttribute('aria-labelledby','modal-title');}else modal.setAttribute('aria-label',l10n("星屿对话"));modal.className='modal '+screen+'-modal';if(!modal.open)modal.showModal();modal.scrollTop=0;requestAnimationFrame(()=>{const focus=panel.querySelector('[autofocus],.primary-button,button,select,input');if(focus)focus.focus({preventScroll:true});});wireAudio();}
  function finishClose(){stopVoice();clearInterval(activityTimer);world.stopActivity?.();document.body.classList.remove('doing-activity');world.setPaused(false);activeScreen='';const cb=modalAfterClose;modalAfterClose=null;cb?.();$('world').focus({preventScroll:true});}
  function closeModal(){if(modal.open){modal.close();finishClose();}}
  modal.addEventListener('close',()=>{if(!modal.open)finishClose();});
  $('modal-close').addEventListener('click',closeModal);
  modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
  function wireVoice(audio){IslandAudio.attachVoice?.(audio);audio.addEventListener('play',()=>{if(currentAudio&&currentAudio!==audio)currentAudio.pause();currentAudio=audio;IslandAudio.duck(true);});audio.addEventListener('pause',()=>IslandAudio.duck(false));audio.addEventListener('ended',()=>IslandAudio.duck(false));audio.addEventListener('error',()=>toast(l10n("这段语音未能播放，可以先读文字，或在布置中重新选择音频。")));}
  function wireAudio(){panel.querySelectorAll('audio').forEach(wireVoice);}
  function mediaUrl(key,fallback=''){return Object.prototype.hasOwnProperty.call(media,key)?media[key]||'':fallback;}
  function audioHTML(url){return url?`<audio class="audio-message" controls preload="metadata" src="${esc(url)}${l10n("\" aria-label=\"播放留给你的语音\"></audio>")}`:'';}
  function openDialogue(lines,{name=companionName(),subtitle=tr('scene.dialogueSubtitle'),onFinish,pose}={}){
    let page=0;
    function render(){show(`<div class="dialogue-header"><div class="spirit-portrait">✦</div><div><h3>${esc(name)}</h3><div class="fine-print">${esc(subtitle)}</div></div></div><p class="dialogue-copy">${esc(lines[page])}</p><div class="modal-footer"><div class="page-dots">${lines.map((_,i)=>`<i class="${i===page?'current':''}"></i>`).join('')}</div><button class="primary-button" id="dialogue-next">${page===lines.length-1?l10n("把这句话收好"):l10n("再听一句")} <span>→</span></button></div>`,'dialogue');if(pose==='sit')world.sitting=true;
      $('dialogue-next').onclick=()=>{IslandAudio.dialogue?.();if(page<lines.length-1){page++;render();}else{closeModal();onFinish?.();}};
    }render();
  }
  function start(){if(!world.ready){toast(l10n("星屿还在准备，等角色和风景亮起来就能出发。"));return;}state.started=true;updateUI();persist();if(state.settings.sound)IslandAudio.set(true);openDialogue([content().intro],{subtitle:tr('scene.introSubtitle'),onFinish:()=>{toast(l10n("WASD / 方向键移动，Shift 快走；触碰物件或按 F 拾取。所有岛屿都可以自由探索。"));if(queuedDestination){const destination=queuedDestination;queuedDestination=null;visitDestination(destination.id||destination,destination.region||'home');}}});}
  $('start-button').onclick=start;
  document.querySelector('.brand').onclick=e=>{e.preventDefault();if(state.started)openJournal();else $('start-button').focus();};
  function interactWith(item){if(item.type==='activity'){openActivity(item);return;}if(item.type==='portal'){world.travel(item.toRegion);return;}if(item.type==='story'){openStory(item);return;}if(item.type==='memory')openMemory(item.id);else if(item.id==='campfire')openCampfire();else if(item.id==='tent')openTent();else if(item.id==='observatory')openObservatory();else if(item.id==='tree')openTree();}
  function openMemory(id,review=false){const m=content().memories.find(m=>m.id===id),index=content().memories.indexOf(m),collected=state.collected.includes(id),photo=mediaUrl(id+'-photo',m.photo),audio=mediaUrl(id+'-audio',m.audio);
    if(!collected&&!review){state.collected.push(id);world.collect(m);IslandAudio.chime();persist();}
    show(`<div style="--memory-color:${m.color}"><div class="memory-art">${photo?`<img src="${esc(photo)}" alt="${esc(m.theme)}${l10n("的回忆照片\">")}`:'<div class="large-crystal"></div>'}</div><div class="memory-meta"><span>MEMORY ${String(ISLAND_CONTENT.memories.findIndex(x=>x.id===id)+1).padStart(2,'0')} · ${esc(m.theme)}</span><span>${esc(m.location)}</span></div><h2>${esc(m.title)}</h2><div class="memory-quote"><p>${esc(m.text)}</p></div>${audioHTML(audio)}<div class="fine-print">${esc(tr(collected?'scene.memoryAgain':'scene.memoryNew'))}</div><button class="primary-button" id="collect-memory">${collected?l10n("让回忆再亮一会儿"):l10n("收好这段回忆")} <span>✦</span></button></div>`,'memory');
    const photoEl=panel.querySelector('.memory-art img');if(photoEl)photoEl.onerror=()=>{photoEl.replaceWith(Object.assign(document.createElement('div'),{className:'large-crystal'}));toast(l10n("照片未能打开，回忆文字仍在这里。"));};
    $('collect-memory').onclick=()=>{if(!collected&&!state.collected.includes(id)){state.collected.push(id);world.collect(m);IslandAudio.chime();persist();}closeModal();if(state.collected.length===5&&!collected)toast(tr('scene.allMemories'));else if(!collected)toast(`${l10n("已拾起「")}${m.theme}」 · ${state.collected.length} / 5`);};
  }
  function openCampfire(){world.spirit.x=451;world.spirit.y=508;openDialogue(content().campfire,{subtitle:tr('scene.campfireSubtitle'),pose:'sit',onFinish:()=>{state.campfireSeen=true;persist();toast(tr('scene.campfireAfter'));}});}
  function clockParts(){return new Intl.DateTimeFormat('en-GB',{timeZone:ISLAND_CONTENT.timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());}
  function currentHour(){return Number(clockParts().find(p=>p.type==='hour').value);}
  function openTent(){const hour=currentHour(),late=hour>=23||hour<5,secret=late&&!state.nightSeen;
    show(`<div class="tent-interior"><div class="tent-wall"></div><div class="tent-lamp"></div></div><div class="eyebrow">MOONLIT TENT</div><h2>${esc(tr(late?'scene.tentNightTitle':'scene.tentDayTitle'))}</h2><p>${esc(late?content().goodnight:tr('scene.tentDayText'))}</p>${late?audioHTML(mediaUrl('goodnight-audio',content().goodnightAudio)):''}<p class="fine-print" style="margin-top:18px">${late?esc(tr(secret?'scene.tentSecret':'scene.tentNightAgain')):l10n("现实时间 23:00—05:00 来访，会遇见另一张小纸条。")}</p><button id="leave-tent" class="primary-button">${late?l10n("收下这句晚安"):l10n("带着暖意，继续出发")} <span>↗</span></button>`,'tent');
    $('leave-tent').onclick=()=>{if(late){state.nightSeen=true;persist();}closeModal();};
  }
  function openTree(){const c=content();
    IslandTreeLetter.open({draft:state.treeLetter,defaults:{to:c.recipient===l10n("收礼人")?l10n("亲爱的你"):c.recipient,from:c.sender===l10n("赠送者")?l10n("我"):c.sender,title:tr('scene.treeReadyTitle'),body:'',theme:'petal',heading:tr('scene.treeTitle'),intro:tr('scene.treeText'),example:tr('scene.treeReadyText')},show,close:closeModal,toast,
      save:draft=>{const previous=state.treeLetter;state.treeLetter={...IslandStore.normalizeTreeLetter(draft),updatedAt:Date.now()};const saved=persist();if(!saved)state.treeLetter=previous;return saved;}});
  }
  function openJournal(){show(`${l10n("<div class=\"eyebrow\">ISLAND JOURNAL · 星屿手记</div><h2>")}${esc(tr('scene.journalTitle'))}</h2><p class="fine-print">${state.collected.length}${l10n(" / 5 段时光已点亮 · ")}${state.campfireSeen?l10n("篝火夜话已收藏"):esc(tr('scene.journalUnheard'))}${state.nightSeen?l10n(" · 已发现晚安彩蛋"):''}</p><div class="journal-list">${content().memories.map((m,i)=>{const lit=state.collected.includes(m.id);return`<button class="journal-entry ${lit?'':'locked'}" data-memory="${m.id}" style="--memory-color:${m.color}"><span class="journal-icon">${lit?'◆':'◇'}</span><div><h3>${lit?esc(m.title):esc(tr('scene.memoryLocked'))}</h3><p>${String(i+1).padStart(2,'0')} · ${esc(m.theme)} / ${esc(m.location)}</p></div><span class="entry-arrow">${lit?'↗':'⌁'}</span></button>`;}).join('')}${l10n("</div><div class=\"journal-actions\"><button class=\"secondary-button\" id=\"journal-map\">岛屿地图</button><button class=\"secondary-button\" id=\"open-exploration\">探索背包</button>")}${state.finished?l10n("<button class=\"secondary-button\" id=\"reread-letter\">重读那封信</button>"):''}</div>`,'journal');
    panel.querySelectorAll('[data-memory]').forEach(btn=>btn.onclick=()=>{const id=btn.dataset.memory;if(state.collected.includes(id))openMemory(id,true);else{closeModal();if(!state.started){queuedDestination={id,region:'home'};start();}else{visitDestination(id,'home');toast(tr('scene.memoryRoute'));}}});
    $('journal-map').onclick=()=>openMap();$('open-exploration').onclick=openInventory;if($('reread-letter'))$('reread-letter').onclick=openLetter;
  }
  $('journal-button').onclick=openJournal;
  function updateExplorationHUD(){
    let button=$('exploration-summary');
    if(!button){button=document.createElement('button');button.id='exploration-summary';button.className='exploration-summary';button.onclick=openInventory;$('quest-panel').append(button);}
    button.textContent=`${l10n("探索背包  ")}${state.exploration.found.length} / ${(window.ISLAND_ADVENTURE||[]).length}${l10n(" · 心愿 ")}${state.exploration.completed.length} / ${(window.ISLAND_QUESTS||[]).length} ↗`;
    button.hidden=!state.started;
    const label=$('region-label');if(label)label.textContent=regionName(world.regionId||'home');
  }
  function storyObject(id){return (window.ISLAND_ADVENTURE||[]).find(item=>item.id===id);}
  function markFound(item){
    if(state.exploration.found.includes(item.id))return false;
    state.exploration.found.push(item.id);persist();world.collect?.(item);IslandAudio.chime();return true;
  }
  function openStory(item,review=false){
    if(!item)return;
    const quest=(window.ISLAND_QUESTS||[]).find(q=>q.id===item.questId);
    const foundBefore=state.exploration.found.includes(item.id);
    // Picking up an object is the interaction itself, never a second confirmation dialog.
    if(!review&&(item.kind!=='lore'||!item.choices))markFound(item);
    const selected=item.choices?.find(choice=>choice.id===state.exploration.choices[item.id]);
    const done=quest&&state.exploration.completed.includes(quest.id);
    const ready=quest&&quest.requires.every(id=>state.exploration.found.includes(id));
    const near=(world.regionId||'home')===item.region&&Math.hypot(world.player.x-item.x,world.player.y-item.y)<110;
    const afterGoal=item.goal&&state.exploration.found.includes(item.goal)&&item.afterGoal;
    let text=done?item.completeText:selected?selected.result:item.text;
    if(afterGoal&&!foundBefore)text+='\n\n'+afterGoal;
    const requirements=quest?`<div class="quest-requirements">${quest.requires.map(id=>{const target=storyObject(id);const has=state.exploration.found.includes(id);return `<div class="${has?'ready':'missing'}"><span>${has?'◆':'◇'}</span> ${esc(target.itemName||target.name)} <small>${has?l10n("已放进背包"):esc(regionName(target.region))+l10n(" · 尚未发现")}</small></div>`;}).join('')}</div>`:'';
    const choiceHTML=item.choices&&!selected?`<div class="story-choices">${item.choices.map(choice=>`<button class="secondary-button" data-story-choice="${choice.id}">${esc(choice.label)}</button>`).join('')}</div>`:'';
    const action=quest&&!done?(ready?`<button id="complete-quest" class="primary-button">${near?l10n("把这份心意放好"):l10n("前往这里，完成心愿")} <span>✦</span></button>`:l10n("<button id=\"quest-clue\" class=\"secondary-button\">看看还缺的线索 ↗</button>")):'';
    show(`<div class="adventure-header" style="--story-color:${item.color}"><span class="adventure-symbol">${item.icon}</span><div><div class="eyebrow">${esc(regionName(item.region))} · ${item.kind==='quest'?l10n("一份小小的心愿"):item.kind==='pickup'?l10n("放进口袋的发现"):l10n("路上的小故事")}</div><p class="fine-print">${esc(item.name)}</p></div></div><h2>${esc(item.title)}</h2><p>${esc(text)}</p>${requirements}${done?`${l10n("<div class=\"quest-reward\">✦ 已获得 ")}${esc(quest.reward)}<p class="fine-print">${esc(quest.effect)}</p></div>`:''}${item.kind==='pickup'?`<p class="fine-print" style="margin-top:16px">◆ ${esc(item.itemName)} ${foundBefore?l10n("一直好好收在探索背包里"):l10n("已拾取，放进探索背包")}</p>`:''}${choiceHTML}${action}<button class="${action?'secondary-button':'primary-button'}" id="story-dismiss">${item.choices&&!selected?l10n("先不打扰，继续走走"):l10n("把这一刻收好")} <span>↗</span></button>`,'adventure');
    $('story-dismiss').onclick=()=>{closeModal();if(!foundBefore&&item.kind==='pickup')toast(`${l10n("已拾取「")}${item.itemName}${l10n("」 · 探索背包 ")}${state.exploration.found.length} / ${(window.ISLAND_ADVENTURE||[]).length}`);};
    panel.querySelectorAll('[data-story-choice]').forEach(button=>button.onclick=()=>{state.exploration.choices[item.id]=button.dataset.storyChoice;markFound(item);persist();openStory(item,true);});
    if($('quest-clue'))$('quest-clue').onclick=()=>{const missing=quest.requires.find(id=>!state.exploration.found.includes(id));const clue=storyObject(missing);openMap(clue.region);};
    if($('complete-quest'))$('complete-quest').onclick=()=>{
      if(!near){visitDestination(item.id,item.region);return;}
      if(!quest.requires.every(id=>state.exploration.found.includes(id))||state.exploration.completed.includes(quest.id))return;
      markFound(item);state.exploration.completed.push(quest.id);persist();world.burst?.(item.x,item.y-25,quest.color);IslandAudio.chime('finale');openStory(item,true);
    };
  }
  function openInventory(){
    const found=state.exploration.found,complete=state.exploration.completed;
    show(`<div class="eyebrow">POCKETFUL OF LITTLE WONDERS</div><h2>${esc(tr('scene.inventoryTitle'))}</h2><p class="fine-print">${found.length} / ${(window.ISLAND_ADVENTURE||[]).length}${l10n(" 个发现 · ")}${complete.length} / ${(window.ISLAND_QUESTS||[]).length}${l10n(" 份心愿 · ")}${state.visitedRegions.length} / ${regions().length}${l10n(" 区域。它们没有固定顺序，也不会挡住生日主线。</p><div class=\"adventure-quests\">")}${(window.ISLAND_QUESTS||[]).map(quest=>{const done=complete.includes(quest.id),ready=quest.requires.every(id=>found.includes(id));return `<section class="quest-card"><div><span style="color:${quest.color}">${quest.icon}</span><h3>${esc(quest.name)}</h3><small>${done?l10n("已完成"):ready?l10n("可以送达"):l10n("慢慢寻找")}</small></div><p class="fine-print">${esc(done?quest.effect:quest.description)}</p><div class="quest-requirements">${quest.requires.map(id=>`<span class="${found.includes(id)?'ready':'missing'}">${found.includes(id)?'◆':'◇'} ${esc(storyObject(id).itemName)}</span>`).join('')}</div><button class="secondary-button" data-quest-route="${quest.id}">${done?l10n("去看看留下的变化"):ready?l10n("带着心意去送达"):l10n("沿着线索出发")} ↗</button>${done?`<div class="quest-reward">✦ ${esc(quest.reward)}</div>`:''}</section>`;}).join('')}${l10n("</div><h3 style=\"margin:24px 0 12px\">旅途收藏</h3><div class=\"inventory-grid\">")}${(window.ISLAND_ADVENTURE||[]).map(item=>`<button class="inventory-item ${found.includes(item.id)?'found':'locked'}" data-discovery="${item.id}" ${!found.includes(item.id)?'disabled':''}><span style="color:${item.color}">${found.includes(item.id)?item.icon:'◇'}</span><strong>${found.includes(item.id)?esc(item.itemName||item.name):l10n("尚未发现")}</strong><small>${esc(regionName(item.region))}</small></button>`).join('')}</div>${complete.length>0&&complete.length===(window.ISLAND_QUESTS||[]).length?`<div class="quest-reward"><h3>${esc(tr('ending.bonusTitle'))}</h3><p>${esc(tr('ending.bonusText'))}</p></div>`:''}${l10n("<div class=\"journal-actions\"><button class=\"secondary-button\" id=\"inventory-map\">摊开探索地图</button><button class=\"secondary-button\" id=\"inventory-memories\">回忆手记</button></div>")}`,'inventory');
    panel.querySelectorAll('[data-discovery]').forEach(button=>button.onclick=()=>openStory(storyObject(button.dataset.discovery),true));
    panel.querySelectorAll('[data-quest-route]').forEach(button=>button.onclick=()=>{const quest=ISLAND_QUESTS.find(q=>q.id===button.dataset.questRoute);const next=quest.requires.find(id=>!found.includes(id))||quest.target;const target=storyObject(next);visitDestination(target.id,target.region);});
    $('inventory-map').onclick=()=>openMap();$('inventory-memories').onclick=openJournal;
  }
  function companionName(){return state.settings.companion==='boy'?content().boyName+' · '+tr('character.boySubtitle'):state.settings.companion==='none'?tr('character.noneSubtitle'):content().guideName+' · '+tr('character.guideSubtitle');}
  function companionOptions(){return `${l10n("<div class=\"companion-options\" aria-label=\"选择陪伴角色\">")}${[['spirit','✦',content().guideName,tr('character.spiritOption')],['boy','♡',content().boyName,tr('character.boyOption')],['none','☾',l10n("独自探索"),tr('character.aloneOption')]].map(([id,icon,label,description])=>`<button type="button" data-companion="${id}" aria-pressed="${state.settings.companion===id}"><span>${icon}</span><strong>${esc(label)}</strong><small>${esc(description)}</small></button>`).join('')}</div>`;}
  function wireCompanionOptions(){panel.querySelectorAll('[data-companion]').forEach(button=>button.onclick=()=>{state.settings.companion=button.dataset.companion;persist();panel.querySelectorAll('[data-companion]').forEach(el=>el.setAttribute('aria-pressed',el.dataset.companion===state.settings.companion));toast(tr(state.settings.companion==='boy'?'character.boyJoined':state.settings.companion==='none'?'character.alone':'character.guideJoined'));});}
  function openCharacter(variant='girl'){
    if(typeof variant!=='string')variant='girl';
    const boy=variant==='boy',source=window.IslandCharacter?.designImage?.(variant)||(boy?(window.ISLAND_ASSETS?.['assets/companion-design.png']||'assets/companion-design.png'):(window.ISLAND_CHARACTER_ART||'assets/character-design.png'));
    show(`<div class="eyebrow">TWO LITTLE TRAVELERS</div><h2>${esc(boy?content().boyName:content().girlName)}${l10n("</h2><div class=\"character-tabs\" role=\"tablist\" aria-label=\"查看角色\"><button class=\"secondary-button\" data-character-variant=\"girl\" role=\"tab\" aria-selected=\"")}${!boy}">${esc(content().girlName)}${l10n(" · 主角</button><button class=\"secondary-button\" data-character-variant=\"boy\" role=\"tab\" aria-selected=\"")}${boy}">${esc(content().boyName)}${l10n(" · 旅伴</button></div><img class=\"character-design-image\" src=\"")}${esc(source)}" alt="${boy?l10n("原创男性旅行者的四视角色设计图"):l10n("原创主角的四视像素设计图")}${l10n("\"><p class=\"fine-print character-live-caption\">实际游戏角色 · 下方动作与地图使用同一套贴图</p><div class=\"character-preview\"><canvas id=\"character-preview-canvas\" width=\"240\" height=\"180\" aria-label=\"角色动作预览\"></canvas><div class=\"character-pose-buttons\">")}${[['idle',l10n("站立")],['walk',l10n("行走")],['sit',l10n("坐下")],['look',l10n("仰望")],['jump',l10n("跳跃")],['wave',l10n("挥手")],['photo',l10n("拍照")],['build',l10n("筑沙")]].map(([id,label])=>`<button class="secondary-button" data-character-pose="${id}" aria-pressed="${id==='idle'}">${label}</button>`).join('')}</div></div><p>${esc(tr(boy?'character.boyDescription':'character.girlDescription'))}${l10n("</p><h3 class=\"companion-heading\">这次，想和谁一起出发？</h3>")}${companionOptions()}${l10n("<p class=\"fine-print\" style=\"margin-top:16px\">WASD / 方向键移动 · Shift 快走 · 空格跳跃<br>触碰物件或 F 互动 · M 地图 · J 手记</p><button class=\"primary-button\" id=\"character-back\">带上好心情，继续出发 ↗</button>")}`,'character');
    wireCompanionOptions();panel.querySelectorAll('[data-character-variant]').forEach(button=>button.onclick=()=>openCharacter(button.dataset.characterVariant));
    $('character-back').onclick=closeModal;let pose='idle';panel.querySelectorAll('[data-character-pose]').forEach(button=>button.onclick=()=>{pose=button.dataset.characterPose;panel.querySelectorAll('[data-character-pose]').forEach(el=>el.setAttribute('aria-pressed',el.dataset.characterPose===pose));});const previewStart=performance.now(),token=++characterPreviewToken;const animate=now=>{if(activeScreen!=='character'||token!==characterPreviewToken)return;window.IslandCharacter?.drawPreview?.($('character-preview-canvas'),{pose,variant,direction:'down',time:state.settings.reducedMotion?0:(now-previewStart)/1000});requestAnimationFrame(animate);};requestAnimationFrame(animate);
  }
  window.addEventListener('island:character',()=>openCharacter());
  function activityDefs(){return window.ISLAND_ACTIVITIES||[];}
  function markActivity(id){if(!state.activities.completed.includes(id)){state.activities.completed.push(id);persist();}}
  function openActivities(){
    show(`<div class="eyebrow">LITTLE MOMENTS, TOGETHER</div><h2>${esc(tr('scene.activitiesTitle'))}</h2><p class="fine-print">${esc(tr('scene.activitiesIntro'))}</p><div class="activity-cards">${activityDefs().map(item=>{const region=regions().find(r=>r.id===item.region),image=window.ISLAND_ASSETS?.[region.art]||region.art,done=state.activities.completed.includes(item.id);return `<button class="activity-card" data-activity-route="${item.id}"><img class="activity-card-art" src="${esc(image)}" alt=""><div class="activity-card-body"><span class="activity-card-tag">${esc(region.name)}${done?l10n(" · 已留下回忆"):''}</span><h3>${esc(item.name)}</h3><p>${esc(item.description)}</p><span class="activity-card-go">${done?l10n("再去一次"):l10n("一起出发")} ↗</span></div></button>`;}).join('')}</div><div class="activity-hub-footer"><span class="fine-print">${state.activities.completed.length} / ${activityDefs().length}${l10n(" 种小日常 · ")}${state.activities.photos}${l10n(" 张纪念照</span><button class=\"secondary-button\" id=\"activity-characters\">选择旅伴 ♡</button>")}${state.started?l10n("<button class=\"secondary-button\" id=\"quick-photo\">随手拍一张 ▣</button>"):''}${lastPhoto?l10n("<button class=\"secondary-button\" id=\"view-last-photo\">看看刚才的照片 ▣</button>"):''}</div>`,'activities');
    panel.querySelectorAll('[data-activity-route]').forEach(button=>button.onclick=()=>{const item=activityDefs().find(x=>x.id===button.dataset.activityRoute);visitDestination(item.id,item.region);});$('activity-characters').onclick=()=>openCharacter('boy');if($('quick-photo'))$('quick-photo').onclick=takePhoto;if($('view-last-photo'))$('view-last-photo').onclick=()=>openPhoto(lastPhoto);
  }
  function activityCompanionText(){return tr(state.settings.companion==='boy'?'character.activityBoy':state.settings.companion==='none'?'character.activityAlone':'character.activityGuide');}
  function activityStatus(id){return personalization.activityStatus(id,state.activities,world.activity||{});}
  function activityExtras(item){
    const saved=state.activities;
    if(item.id==='sandcastle')return `${l10n("<div class=\"sandcastle-steps\" aria-label=\"沙堡进度 ")}${saved.sandcastle}/3">${[l10n("沙丘"),l10n("双塔"),l10n("星旗")].map((label,i)=>`<span class="${saved.sandcastle>i?'done':''}">${saved.sandcastle>i?'◆':'◇'} ${label}</span>`).join('')}</div>`;
    if(item.id==='flower_garden')return `${l10n("<div class=\"sandcastle-steps\" aria-label=\"花园进度 ")}${saved.gardenStage}/2">${[l10n("播种"),l10n("浇水"),l10n("花开")].map((label,i)=>`<span class="${saved.gardenStage===2||saved.gardenStage>i?'done':''}">${saved.gardenStage===2||saved.gardenStage>i?'◆':'◇'} ${label}</span>`).join('')}</div>`;
    if(item.id==='paper_boat')return `${l10n("<div class=\"activity-wishes\" aria-label=\"为纸船选择一个心愿\">")}${item.wishes.map(wish=>`<button class="secondary-button" data-boat-wish="${wish.id}" aria-pressed="${saved.lastBoatWish===wish.id}">${esc(wish.text)}</button>`).join('')}</div>`;
    if(item.id==='stone_skip')return l10n("<div class=\"activity-meter\"><label for=\"activity-charge\">出手力度 <span id=\"activity-charge-value\">准备好小石头</span></label><progress class=\"activity-progress\" id=\"activity-charge\" max=\"1\" value=\"0\"></progress></div>");
    if(item.id==='windmill')return l10n("<div class=\"activity-meter\"><label for=\"activity-wind\">攒起一阵风 <span id=\"activity-wind-value\">轻轻拨动叶片</span></label><progress class=\"activity-progress\" id=\"activity-wind\" max=\"1\" value=\"0\"></progress></div>");
    return '';
  }
  function updateActivityControls(item){
    if(activeScreen!=='activity'||world.activity?.id!==item.id)return;
    const a=world.activity,el=$('activity-status'),message=activityStatus(item.id);if(el&&el.textContent!==message)el.textContent=message;
    if(item.id==='stroll'&&a.progress>=1)markActivity(item.id);
    if(item.id==='flower_garden')$('activity-garden').disabled=!!a.busy;
    if(item.id==='paper_boat'){
      $('activity-launch').disabled=!!a.busy||!state.activities.lastBoatWish;
      panel.querySelectorAll('[data-boat-wish]').forEach(button=>button.disabled=!!a.busy);
    }
    if(item.id==='stone_skip'){
      const charge=Math.max(0,Math.min(1,Number(a.charge)||0));$('activity-charge').value=charge;
      $('activity-charge-value').textContent=a.charging?Math.round(charge*100)+'%':a.busy?l10n("水花还在跳…"):l10n("准备好小石头");
      $('activity-throw').textContent=a.charging?l10n("现在出手 ↗"):a.busy?l10n("等水花落下…"):l10n("开始蓄力 ≈");$('activity-throw').disabled=!!a.busy&&!a.charging;
    }
    if(item.id==='windmill'){
      const power=Math.max(0,Math.min(1,Number(a.power)||0));$('activity-wind').value=power;$('activity-wind-value').textContent=Math.round(power*100)+'%';$('activity-turn').disabled=!!a.busy;if(a.progress>=1||power>=1)markActivity(item.id);
    }
  }
  function openActivity(item){
    const same=activeScreen==='activity'&&world.activity?.id===item.id;
    if(!same&&$('toast').textContent.startsWith(l10n("抵达 "))){clearTimeout(toastTimer);$('toast').hidden=true;}
    const buttons=item.id==='swing'?l10n("<button class=\"primary-button\" id=\"activity-push\">轻轻推一下 ⌁</button>"):item.id==='sandcastle'?`<button class="primary-button" id="activity-build">${[l10n("堆起沙丘"),l10n("筑起两座塔"),l10n("插上星星旗"),l10n("重新堆一个")][state.activities.sandcastle]} ♜</button>`:item.id==='stroll'?l10n("<button class=\"secondary-button\" id=\"activity-walk-again\">再走一小段 ≈</button>"):item.id==='flower_garden'?`<button class="primary-button" id="activity-garden">${[l10n("播下一颗种子"),l10n("给种子浇水"),l10n("再种一片花")][state.activities.gardenStage]} ❀</button>`:item.id==='paper_boat'?l10n("<button class=\"primary-button\" id=\"activity-launch\">放出小纸船 ⌁</button>"):item.id==='stone_skip'?l10n("<button class=\"primary-button\" id=\"activity-throw\">开始蓄力 ≈</button>"):item.id==='windmill'?l10n("<button class=\"primary-button\" id=\"activity-turn\">轻轻拨一下 ✥</button>"):l10n("<button class=\"primary-button\" id=\"activity-shutter\">拍下这一刻 ▣</button>");
    show(`<section class="activity-panel" data-activity="${item.id}"><div class="activity-heading"><div><div class="eyebrow">${esc(item.eyebrow)}</div><h2>${esc(item.name)}</h2></div><span class="activity-companion-note">${esc(activityCompanionText())}</span></div><p class="activity-status" id="activity-status" role="status">${esc(activityStatus(item.id))}</p>${activityExtras(item)}<div class="activity-controls">${buttons}${item.id!=='photo'?l10n("<button class=\"secondary-button\" id=\"activity-photo\">留张纪念照 ▣</button>"):''}${l10n("<button class=\"secondary-button\" id=\"activity-leave\">再走走 ↗</button></div></section>")}`,'activity');
    if(!same){world.startActivity?.(item.id);if(item.id==='stroll'){world.activityAction?.('start');IslandAudio.activity?.('stroll');}}
    clearInterval(activityTimer);if(['stroll','flower_garden','paper_boat','stone_skip','windmill'].includes(item.id))activityTimer=setInterval(()=>updateActivityControls(item),100);
    $('activity-leave').onclick=closeModal;
    if($('activity-push'))$('activity-push').onclick=()=>{world.activityAction?.('push');markActivity('swing');IslandAudio.activity?.('swing');$('activity-status').textContent=tr('activity.swing.pushed');};
    if($('activity-build'))$('activity-build').onclick=()=>{const reset=state.activities.sandcastle===3;state.activities.sandcastle=reset?0:state.activities.sandcastle+1;if(reset)state.activities.completed=state.activities.completed.filter(id=>id!=='sandcastle');world.activityAction?.(reset?'reset':'build');if(state.activities.sandcastle===3)markActivity('sandcastle');persist();IslandAudio.activity?.('build');if(state.activities.sandcastle===3)IslandAudio.chime();openActivity(item);};
    if($('activity-walk-again'))$('activity-walk-again').onclick=()=>{world.activityAction?.('start');IslandAudio.activity?.('stroll');$('activity-status').textContent=tr('activity.stroll.again');};
    if($('activity-garden'))$('activity-garden').onclick=()=>{
      if(world.activity?.busy)return;const old=state.activities.gardenStage,action=old===0?'plant':old===1?'water':'reset';state.activities.gardenStage=old===2?0:old+1;
      const result=world.activityAction?.(action);if(!result||result.accepted===false){state.activities.gardenStage=old;return;}if(state.activities.gardenStage===2)markActivity(item.id);else if(action==='reset')state.activities.completed=state.activities.completed.filter(id=>id!==item.id);
      persist();openActivity(item);
    };
    panel.querySelectorAll('[data-boat-wish]').forEach(button=>button.onclick=()=>{if(world.activity?.busy)return;state.activities.lastBoatWish=button.dataset.boatWish;persist();panel.querySelectorAll('[data-boat-wish]').forEach(choice=>choice.setAttribute('aria-pressed',choice===button));updateActivityControls(item);});
    if($('activity-launch'))$('activity-launch').onclick=()=>{
      if(!state.activities.lastBoatWish||world.activity?.busy)return;const result=world.activityAction?.('launch');if(!result||result.accepted===false)return;
      state.activities.boats=Math.min(9999,state.activities.boats+1);markActivity(item.id);persist();updateActivityControls(item);
    };
    if($('activity-throw'))$('activity-throw').onclick=()=>{
      const a=world.activity;if(!a||a.busy&&!a.charging)return;
      if(!a.charging){world.activityAction?.('charge');updateActivityControls(item);return;}
      const result=world.activityAction?.('throw');if(!result||result.accepted===false)return;
      const skips=Math.floor(Number(result.skips));if(skips>=2&&skips<=5){state.activities.bestSkips=Math.max(state.activities.bestSkips,skips);state.activities.stoneThrows=Math.min(9999,state.activities.stoneThrows+1);markActivity(item.id);persist();}updateActivityControls(item);
    };
    if($('activity-turn'))$('activity-turn').onclick=()=>{
      if(world.activity?.busy)return;const result=world.activityAction?.('turn');if(!result||result.accepted===false)return;
      state.activities.windmillTurns=Math.min(9999,state.activities.windmillTurns+1);if(result.power>=1||result.progress>=1)markActivity(item.id);persist();updateActivityControls(item);
    };
    if($('activity-shutter'))$('activity-shutter').onclick=takePhoto;if($('activity-photo'))$('activity-photo').onclick=takePhoto;
    updateActivityControls(item);
  }
  function takePhoto(){
    try{const data=world.capturePhoto?.();if(!data||!data.startsWith('data:image/png'))throw new Error(l10n("照片还没有准备好，稍等一下再试。"));state.activities.photos=Math.min(9999,state.activities.photos+1);markActivity('photo');persist();lastPhoto={data,region:regionName(world.regionId),time:new Intl.DateTimeFormat(window.IslandI18n?.locale||'zh-CN',{timeZone:ISLAND_CONTENT.timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date()),number:state.activities.photos};IslandAudio.activity?.('shutter');openPhoto(lastPhoto);}catch(err){toast(err.message||l10n("拍照暂时失败，请再试一次。"));}
  }
  function openPhoto(photo){show(`<div class="eyebrow">A POSTCARD FROM OUR LITTLE WORLD</div><h2>${esc(tr('scene.photoTitle'))}</h2><figure class="photo-print"><img id="photo-preview" src="${photo.data}" alt="${esc(photo.region)}${l10n("的游戏纪念照\"><figcaption><strong>")}${esc(photo.region)}</strong><span>${esc(photo.time)} · NO. ${String(photo.number).padStart(3,'0')}${l10n("</span></figcaption></figure><p class=\"fine-print\">保存图片，就可以把这一刻放进口袋。关闭页面前记得下载喜欢的照片。</p><div class=\"photo-actions\"><a class=\"primary-button\" id=\"photo-download\" href=\"")}${photo.data}${l10n("\" download=\"星屿纪念照-")}${photo.number}${l10n(".png\">保存纪念照 ↓</a><button class=\"secondary-button\" id=\"photo-back\">回到风景里 ↗</button></div>")}`,'photo');$('photo-back').onclick=closeModal;}
  window.addEventListener('island:activities',openActivities);
  window.addEventListener('island:photo',()=>{if(!state.started){openActivities();return;}takePhoto();});

  window.addEventListener('island:inventory',openInventory);
  function regions(){return window.ISLAND_REGIONS||[{id:'home',name:l10n("星愿营地"),art:'assets/island.png',landmarks:IslandNavigation.landmarks}];}
  function regionName(id){return regions().find(r=>r.id===id)?.name||l10n("星愿营地");}
  function visitDestination(id,region='home'){
    closeModal();
    if(!state.started){queuedDestination={id,region};start();return;}
    if((world.regionId||'home')!==region){if(world.travel(region)===false)return;}
    world.navigate(id);
  }
  function mapKind(item){return item.type==='letter'?{key:'letter',name:l10n("树下写信"),color:'#f4c5cf'}:item.type==='portal'?{key:'portal',name:l10n("区域出口"),color:'#e7cc94'}:item.type==='activity'?{key:'activity',name:l10n("一起互动"),color:'#f0b6c4'}:item.type==='memory'?{key:'memory',name:l10n("记忆水晶"),color:item.color||'#bfb1eb'}:item.type==='story'?{key:'story',name:item.kind==='pickup'?l10n("故事 · 可拾取"):l10n("故事 · 可互动"),color:'#a5d7ce'}:{key:'landmark',name:l10n("主线地点"),color:'#e7cc94'};}
  function arrangeMapPins(){
    const map=panel.querySelector('.island-map'),svg=map?.querySelector('.map-connectors');if(!map||!svg)return;
    const box=map.getBoundingClientRect(),placed=[],radius=box.width<500?17:19,gap=radius*2+4;
    svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);svg.replaceChildren();
    for(const button of map.querySelectorAll('.numbered')){
      const tx=Number(button.dataset.x)/1536*box.width,ty=Number(button.dataset.y)/1024*box.height,candidates=[];
      for(let ring=0;ring<=4;ring++)for(let step=0;step<(ring?12:1);step++){
        const a=step/12*Math.PI*2,x=Math.max(radius+3,Math.min(box.width-radius-3,tx+Math.cos(a)*ring*gap)),y=Math.max(radius+3,Math.min(box.height-radius-3,ty+Math.sin(a)*ring*gap));
        if(placed.every(p=>Math.hypot(p.x-x,p.y-y)>=gap))candidates.push({x,y,cost:Math.hypot(x-tx,y-ty)});
      }
      candidates.sort((a,b)=>a.cost-b.cost);const p=candidates[0]||{x:tx,y:ty};placed.push(p);button.style.left=p.x/box.width*100+'%';button.style.top=p.y/box.height*100+'%';
      if(Math.hypot(p.x-tx,p.y-ty)>3){const line=document.createElementNS('http://www.w3.org/2000/svg','line');for(const [key,value]of Object.entries({x1:tx,y1:ty,x2:p.x,y2:p.y}))line.setAttribute(key,value);svg.append(line);}
    }
  }
  function openMap(selectedRegion){
    const id=typeof selectedRegion==='string'?selectedRegion:(world.regionId||'home');
    const region=regions().find(r=>r.id===id)||regions()[0];
    const memories=content().memories.filter(m=>(m.region||'home')===region.id).map(m=>({...m,name:m.theme,type:'memory'}));
    const objects=[...memories,...(region.landmarks||[]),...(window.ISLAND_ADVENTURE||[]).filter(m=>m.region===region.id),...activityDefs().filter(m=>m.region===region.id)];
    const source=window.ISLAND_ASSETS?.[region.art]||(region.id==='home'?(window.ISLAND_ART||region.art):region.art);
    const isFound=m=>m.type==='memory'?state.collected.includes(m.id):m.type==='activity'?state.activities.completed.includes(m.id):state.exploration.found.includes(m.id);
    show(`<div class="eyebrow">A WIDER WORLD, MORE LITTLE WONDERS</div><h2>${esc(region.name)}</h2><p class="fine-print">${esc(tr('scene.mapIntro'))}${l10n("</p><div class=\"region-tabs\" role=\"tablist\" aria-label=\"选择区域\">")}${regions().map(r=>`<button class="region-tab" data-region="${r.id}" role="tab" aria-selected="${r.id===region.id}">${esc(r.name)}${r.id===(world.regionId||'home')?l10n(" · 此处"):''}</button>`).join('')}${l10n("</div><div class=\"map-key\"><span>◆ 故事与拾取</span><span>♡ 一起互动</span><span>↗ 区域出口</span></div><div class=\"map-content\"><div class=\"map-chart\"><div class=\"island-map\"><img src=\"")}${source}" alt="${esc(region.name)}${l10n("的探索地图\"><svg class=\"map-connectors\" aria-hidden=\"true\"></svg>")}${objects.map((m,i)=>{const kind=mapKind(m);return `<button class="map-pin numbered ${kind.key}${isFound(m)?' found':''}" data-id="${m.id}" data-region="${region.id}" data-x="${m.x}" data-y="${m.y}" style="left:${m.x/1536*100}%;top:${m.y/1024*100}%;--memory-color:${kind.color}" aria-label="${i+1}${l10n(" · 前往")}${esc(m.name)} · ${kind.name}" title="${esc(m.name)} · ${kind.name}"><b>${i+1}</b>${isFound(m)?'<i aria-hidden="true">✓</i>':''}<span class="pin-caption">${esc(m.name)}</span></button>`;}).join('')}</div><p class="map-number-note">${objects.length}${l10n(" 个可到达地点 · 图上编号对应下方清单，点击即可出发</p></div><div class=\"map-destinations\">")}${objects.map((m,i)=>{const kind=mapKind(m);return `<button class="map-destination" data-id="${m.id}" data-region="${region.id}"><span class="destination-index" style="--pin-color:${kind.color}">${i+1}</span><span class="destination-copy"><strong>${esc(m.name)}</strong><small>${kind.name}${isFound(m)?l10n(" · 已发现，可重访"):''}</small></span><em>${m.type==='portal'?l10n("出发"):isFound(m)?l10n("重访"):l10n("前往")} ↗</em></button>`;}).join('')}</div></div><p class="fine-print">${state.visitedRegions.length} / ${regions().length}${l10n(" 区域已到访 · ")}${state.exploration.found.length} / ${(window.ISLAND_ADVENTURE||[]).length}${l10n(" 个小故事已发现</p>")}`,'map');
    requestAnimationFrame(arrangeMapPins);
    panel.querySelectorAll('.region-tab').forEach(button=>button.onclick=()=>openMap(button.dataset.region));
    panel.querySelectorAll('[data-id]').forEach(button=>button.onclick=()=>visitDestination(button.dataset.id,button.dataset.region));
  }
  $('map-button').onclick=openMap;
  window.addEventListener('resize',()=>{if(activeScreen==='map')requestAnimationFrame(arrangeMapPins);});
  function openObservatory(){if(state.collected.length<5){show(`<div class="eyebrow">THE OBSERVATORY</div><h2>${esc(tr('scene.observatoryTitle'))}</h2><p>${esc(tr('scene.observatoryText',{remaining:5-state.collected.length}))}${l10n("</p><button class=\"primary-button\" id=\"find-more\">看看剩下的微光 <span>↗</span></button>")}`);$('find-more').onclick=openMap;return;}openConstellation();}
  const starPositions=[[17,55],[35,23],[54,46],[79,25],[75,79]];
  function openConstellation(){let progress=0;const names=content().memories.map(m=>m.theme);
    show(`${l10n("<div class=\"eyebrow\">CHAPTER III · 把回忆连成星座</div><h2>")}${esc(tr('scene.constellationTitle'))}</h2><p class="fine-print">${esc(tr('scene.constellationHint'))}<br>${names.map(esc).join(' → ')}</p><div class="star-field"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline id="star-line" points="" fill="none" stroke="#ead0a2" stroke-width=".45" vector-effect="non-scaling-stroke" style="stroke-width:1.5px"/></svg>${names.map((n,i)=>`<button class="star-node" data-star="${i}" aria-label="${esc(n)}${l10n("之星\" style=\"left:")}${starPositions[i][0]}%;top:${starPositions[i][1]}%">✦<small>${esc(n)}</small></button>`).join('')}</div><div id="constellation-progress" class="constellation-progress" role="status">0 / 5 · ${esc(tr('scene.constellationStart'))}${l10n("</div><button id=\"star-hint\" class=\"hint-button\">给我一点点提示</button>")}`,'constellation');world.looking=true;
    panel.querySelectorAll('[data-star]').forEach(btn=>btn.onclick=()=>{const i=Number(btn.dataset.star);if(i!==progress){IslandAudio.chime('wrong');$('constellation-progress').textContent=tr('scene.constellationNext',{theme:names[progress]});$('constellation-progress').classList.add('star-error');return;}btn.classList.add('lit');btn.classList.remove('hint');btn.disabled=true;progress++;IslandAudio.chime();$('star-line').setAttribute('points',starPositions.slice(0,progress).map(p=>p.join(',')).join(' '));$('constellation-progress').classList.remove('star-error');$('constellation-progress').textContent=progress<5?`${progress} / 5 · ${tr('scene.constellationProgress')}`:'5 / 5 · '+tr('scene.constellationDone');if(progress===5){state.finished=true;persist();world.celebrate();IslandAudio.chime('finale');$('star-hint').disabled=true;setTimeout(()=>{if(activeScreen==='constellation')openFinale();},900);}});
    $('star-hint').onclick=()=>{const btn=panel.querySelector(`[data-star="${progress}"]`);btn?.classList.add('hint');$('constellation-progress').textContent=tr('scene.constellationHelp',{theme:names[progress]});};
  }
  function openFinale(){const c=content();show(`<div class="eyebrow">ALL THESE LITTLE LIGHTS, FOR YOU</div><h2>${esc(c.finaleTitle)}</h2><p>${esc(c.finaleText)}</p><div class="gift-visual"><div class="pixel-gift"><i></i></div></div><p class="fine-print">${esc(c.finaleNote)}${l10n("</p><button class=\"primary-button\" id=\"open-gift\">拆开时光盲盒 <span>✦</span></button>")}`,'finale');$('open-gift').onclick=()=>{IslandAudio.chime('finale');openLetter();};}
  function openLetter(){if(!state.finished)return;const c=content();show(`${IslandStationery.render(c)}${l10n("<div class=\"journal-actions\"><button id=\"save-letter\" class=\"secondary-button\">保存文字 ↓</button><button id=\"save-letter-card\" class=\"secondary-button\">保存信纸 ↓</button><button id=\"replay-sky\" class=\"secondary-button\">再看一次星光 ✧</button></div><button class=\"primary-button\" id=\"back-island\">再在岛上，走一走 <span>↗</span></button>")}`,'letter');$('back-island').onclick=closeModal;$('replay-sky').onclick=()=>{closeModal();world.celebrate();toast(tr('ending.replayWish'));};$('save-letter').onclick=()=>download(`${c.letter}\n\n—— ${c.sender}\n\n${c.giftTitle}\n${c.giftDescription}`,l10n("星屿来信.txt"),'text/plain;charset=utf-8');$('save-letter-card').onclick=()=>download(IslandStationery.document(c),l10n("星屿来信.html"),'text/html;charset=utf-8');}
  function actualPhase(){const h=currentHour();return h>=6&&h<17?'day':h>=17&&h<19?'dusk':'night';}
  function updateTime(){const phase=state.settings.time==='auto'?actualPhase():state.settings.time;world.setPhase(phase);IslandAudio.setPhase?.(phase);const labels={day:l10n("晨光"),night:l10n("星夜"),dusk:l10n("暮色")};$('time-icon').textContent=phase==='day'?'☼':phase==='dusk'?'◒':'☾';$('time-label').textContent=(state.settings.time==='auto'?l10n("此刻 · "):'')+labels[phase];$('time-button').title=l10n("岛屿时光：")+(state.settings.time==='auto'?l10n("跟随北京时间"):labels[phase])+l10n("，点击切换");$('clock').textContent=clockParts().map(p=>p.value).join('');$('ambience-label').textContent=tr('hud.'+phase);}
  $('time-button').onclick=()=>{const choices=['auto','night','day','dusk'];state.settings.time=choices[(choices.indexOf(state.settings.time)+1)%choices.length];updateTime();persist();toast(state.settings.time==='auto'?l10n("岛屿正在跟随你此刻的真实时间。"):`${l10n("已换成")}${{night:l10n("星夜"),day:l10n("晨光"),dusk:l10n("暮色")}[state.settings.time]}${l10n("，好好享受这一刻。")}`);};
  function toggleSound(on){const requested=on??!state.settings.sound;state.settings.sound=IslandAudio.set(requested);if(requested&&!state.settings.sound)toast(l10n("声音暂时无法开启，仍可完整体验文字故事。"));persist();}
  $('sound-button').onclick=()=>toggleSound();
  function openSettings(){show(`${l10n("<div class=\"eyebrow\">MAKE YOURSELF AT HOME</div><h2>让星屿，更像你的心意。</h2><div class=\"setting-row\"><div><label for=\"setting-time\">岛屿时光</label><small>跟随北京时间，或停留在喜欢的时刻</small></div><select id=\"setting-time\"><option value=\"auto\">跟随现实</option><option value=\"night\">静谧星夜</option><option value=\"day\">晴朗晨光</option><option value=\"dusk\">温柔暮色</option></select></div><div class=\"setting-row\"><div><label for=\"setting-sound\">星屿的声音</label><small>原创轻音乐与拾忆音效</small></div><input id=\"setting-sound\" type=\"checkbox\" ")}${state.settings.sound?'checked':''}${l10n("></div><fieldset class=\"audio-levels\"><legend>声音层次</legend>")}${[['music',l10n("背景音乐")],['sfx',l10n("环境与交互")],['voice',l10n("留言语音")]].map(([key,label])=>`<div class="setting-row audio-level-row"><label for="setting-${key}">${label}</label><input type="range" id="setting-${key}" data-volume="${key}" min="0" max="100" step="1" value="${Math.round(state.settings.levels[key]*100)}"><output for="setting-${key}" data-volume-output="${key}">${Math.round(state.settings.levels[key]*100)}%</output></div>`).join('')}${l10n("</fieldset><div class=\"setting-row\"><div><label for=\"setting-motion\">减少动态效果</label><small>让流水、花叶与环境粒子保持静止</small></div><input id=\"setting-motion\" type=\"checkbox\" ")}${state.settings.reducedMotion?'checked':''}${l10n("></div><h3 class=\"companion-heading\">和谁一起出发</h3>")}${companionOptions()}${l10n("<div class=\"settings-buttons\"><button class=\"secondary-button wide\" id=\"customize-button\">✧ 布置这座岛 · 留下你的话、照片和语音</button><button class=\"secondary-button\" id=\"export-button\">导出时光备份 ↓</button><button class=\"secondary-button\" id=\"import-button\">恢复时光备份 ↑</button></div><p class=\"fine-print\">进度、布置和上传的照片语音保存在当前浏览器。清理网站数据会移除它们；导出备份可以保留并在其他设备恢复。此原型尚未连接云端账号。</p><button class=\"danger-button\" id=\"reset-button\">重新开始这场奇遇</button>")}`,'settings');
    if(window.ISLAND_STANDALONE||/^https?:$/.test(location.protocol)){const button=document.createElement('button');button.className='secondary-button wide';button.id='export-gift';button.textContent=l10n("导出专属礼物 HTML · 连同照片语音一起带走");button.onclick=exportGift;panel.querySelector('.settings-buttons').append(button);}
    panel.querySelectorAll('[data-volume]').forEach(input=>input.oninput=()=>{const key=input.dataset.volume;state.settings.levels[key]=Number(input.value)/100;panel.querySelector(`[data-volume-output="${key}"]`).textContent=input.value+'%';IslandAudio.setLevels?.(state.settings.levels);persist();});
    const languageRow=document.createElement('div');languageRow.className='setting-row';const languageLabel=document.createElement('label');languageLabel.htmlFor='setting-language';languageLabel.textContent=window.IslandI18n?.locale==='en'?'Language':'语言';const languageButton=document.createElement('button');languageButton.id='setting-language';languageButton.className='secondary-button';languageButton.textContent=window.IslandI18n?.locale==='en'?'English · Change':'简体中文 · 切换';languageButton.onclick=()=>window.IslandI18n.open();languageRow.append(languageLabel,languageButton);panel.querySelector('h2').after(languageRow);
    wireCompanionOptions();$('setting-time').value=state.settings.time;$('setting-time').onchange=e=>{state.settings.time=e.target.value;updateTime();persist();};$('setting-sound').onchange=e=>{toggleSound(e.target.checked);e.target.checked=state.settings.sound;};$('setting-motion').onchange=e=>{state.settings.reducedMotion=e.target.checked;persist();};$('customize-button').onclick=openCustomize;$('export-button').onclick=exportBackup;$('import-button').onclick=()=>$('import-file').click();$('reset-button').onclick=confirmReset;
  }
  $('settings-button').onclick=openSettings;
  function confirmReset(){show(`${l10n("<div class=\"eyebrow\">ONE MORE LITTLE ADVENTURE</div><h2>再一次，初见。</h2><p>重新开始会清空水晶、探索背包、支线、沙堡、活动、星座和夜话记录。你写下的文字、照片、语音和设置会保留。</p><div class=\"modal-footer\"><button id=\"cancel-reset\" class=\"secondary-button\">继续这段旅程</button><button id=\"confirm-reset\" class=\"primary-button\">重新出发</button></div>")}`);$('cancel-reset').onclick=openSettings;$('confirm-reset').onclick=()=>{state.collected=[];state.finished=false;state.started=false;state.campfireSeen=false;state.nightSeen=false;state.exploration={found:[],completed:[],choices:{}};state.activities=IslandStore.normalize({settings:state.settings}).activities;lastPhoto=null;state.visitedRegions=['home'];state.region='home';world.travel?.('home');world.finale=0;world.effects=[];world.player.x=978;world.player.y=636;world.player.jump=0;world.spirit.x=1039;world.spirit.y=654;persist();closeModal();document.querySelector('.intro-panel>.eyebrow').innerHTML=l10n("<span></span> 为你封存的，小小宇宙");toast(l10n("星屿已经准备好，再与你相遇一次。"));};}
  async function openCustomize(){await mediaReady;IslandStudio.open({custom:state.custom,media,show,readDataUrl,exportGift,attachVoice:wireVoice,stopVoice,save:async(custom,pending)=>{const updated={...media,...pending};if(Object.values(updated).reduce((n,value)=>n+String(value||'').length,0)>40*1024*1024)throw new Error(l10n("照片和语音合计超过 40 MB，请使用更小的文件。"));if(Object.keys(pending).length){await IslandStore.replaceMedia(updated);media=updated;}state.custom=personalization.normalize(custom);personalization.apply(state.custom);world.itemCache?.clear();const ok=persist();updateTime();return ok;}});}
  window.addEventListener('island:studio',openCustomize);
  function readDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});}
  function download(text,name,type){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function exportGift(){
    const button=$('export-gift');if(button)button.disabled=true;
    try{
      await mediaReady;
      let doc;
      if(window.ISLAND_STANDALONE)doc=document.documentElement.cloneNode(true);
      else{const response=await fetch('星屿寻迹.html');if(!response.ok)throw new Error(l10n("请先运行 npm run build 生成单文件版本，再导出礼物。"));doc=new DOMParser().parseFromString(await response.text(),'text/html').documentElement;}
      const script=doc.querySelector('#island-content');if(!script)throw new Error(l10n("单文件模板不完整，请重新生成。"));
      const personalized=personalization.export(state.custom);personalized.memories=personalized.memories.map(m=>({...m,photo:mediaUrl(m.id+'-photo',m.photo),audio:mediaUrl(m.id+'-audio',m.audio)}));personalized.goodnightAudio=mediaUrl('goodnight-audio',personalized.goodnightAudio);
      personalized.defaultCompanion=state.settings.companion;
      personalized.defaultLevels={...state.settings.levels};
      personalized.giftId=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
      script.textContent='window.ISLAND_TEMPLATE_CONTENT = '+JSON.stringify(personalization.templateContent).replace(/</g,'\\u003c')+';\nwindow.ISLAND_CONTENT = '+JSON.stringify(personalized).replace(/</g,'\\u003c')+';';
      doc.querySelector('#language-dialog')?.remove();doc.querySelector('body').className='';doc.querySelector('title').textContent=l10n("星屿寻迹 · 给")+personalized.recipient+l10n("的时光盲盒");
      doc.querySelector('#modal').removeAttribute('open');doc.querySelector('#modal-content').innerHTML='';doc.querySelector('#modal').className='modal';doc.querySelector('#toast').hidden=true;doc.querySelector('#interact-hint').hidden=true;doc.querySelector('#touch-controls').hidden=true;
      doc.querySelector('.intro-panel>.eyebrow').innerHTML=l10n("<span></span> 为你封存的，小小宇宙");doc.querySelector('.chapter-line span:first-child').textContent='PROLOGUE';doc.querySelector('.chapter-line span:last-child').textContent='01 / 03';
      download('<!doctype html>\n'+doc.outerHTML,l10n("给")+personalized.recipient.replace(/[\\/:*?"<>|]/g,'')+l10n("的星屿.html"),'text/html;charset=utf-8');
      toast(l10n("专属星屿已打包。收礼人打开时，会从全新的旅程开始。"));
    }catch(err){toast(err.message||l10n("礼物打包失败，请重试。"));}finally{if(button&&button.isConnected)button.disabled=false;}
  }
  async function exportBackup(){try{await mediaReady;const c=content(),custom=personalization.fromValues(personalization.values(state.custom));const backupMedia={...media};for(const m of c.memories)for(const type of ['photo','audio']){const value=mediaUrl(m.id+'-'+type,m[type]);if(value.startsWith('data:'))backupMedia[m.id+'-'+type]=value;}const goodnight=mediaUrl('goodnight-audio',c.goodnightAudio);if(goodnight.startsWith('data:'))backupMedia['goodnight-audio']=goodnight;const backup={format:'star-island',version:1,savedAt:new Date().toISOString(),state:{...state,custom},media:backupMedia};download(JSON.stringify(backup,null,2),l10n("星屿时光备份.json"),'application/json');toast(l10n("备份已准备好，包含进度、文字、照片和语音。"));}catch{toast(l10n("备份生成失败，请重试。"));}}
  $('import-file').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(file.size>50*1024*1024)throw new Error(l10n("备份超过 50 MB，请选择较小的备份。"));const data=JSON.parse(await file.text());if(data.format!=='star-island'||data.version!==1||!data.state||data.state.version!==1)throw new Error(l10n("这不是星屿支持的备份文件。"));const validKeys=new Set([...ISLAND_CONTENT.memories.flatMap(m=>[m.id+'-photo',m.id+'-audio']),'goodnight-audio']);const importedMedia={};for(const [key,value] of Object.entries(data.media||{})){const photo=key.endsWith('-photo'),pattern=photo?/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=\r\n]+$/:/^data:audio\/[\w.+-]+;base64,[A-Za-z0-9+/=\r\n]+$/;if(!validKeys.has(key)||typeof value!=='string'||(value!==''&&!pattern.test(value))||value.length>(photo?6:12)*1024*1024)throw new Error(l10n("备份中的照片或语音格式不受支持。"));importedMedia[key]=value;}const restored=IslandStore.normalize(data.state);
      show(`${l10n("<div class=\"eyebrow\">WELCOME BACK TO YOUR ISLAND</div><h2>接住之前的时光。</h2><p>这份备份已点亮 ")}${restored.collected.length}${l10n(" / 5 枚水晶，发现 ")}${restored.exploration.found.length}${l10n(" 个小故事，完成 ")}${restored.exploration.completed.length}${l10n(" 份心愿，包含 ")}${Object.keys(importedMedia).length}${l10n(" 份照片或语音。\n\n恢复将替换当前设备上的探索进度与布置。建议先导出当前备份。</p><div class=\"modal-footer\"><button id=\"cancel-import\" class=\"secondary-button\">先保留现在的</button><button id=\"confirm-import\" class=\"primary-button\">确认恢复</button></div><p id=\"import-status\" class=\"fine-print\"></p>")}`);
      $('cancel-import').onclick=openSettings;$('confirm-import').onclick=async()=>{const button=$('confirm-import');button.disabled=true;try{if(Object.keys(importedMedia).length||Object.keys(media).length)await IslandStore.replaceMedia(importedMedia);media=importedMedia;Object.assign(state,restored);personalization.apply(state.custom);world.itemCache?.clear();IslandAudio.setLevels?.(state.settings.levels);world.travel?.(state.region);if(state.region==='home'){world.player.x=978;world.player.y=636;world.spirit.x=1039;world.spirit.y=654;}updateTime();const ok=persist();IslandAudio.set(state.settings.sound);closeModal();toast(ok?l10n("时光已恢复。欢迎回到你的星屿。"):l10n("备份已载入本次会话，浏览器未能持久保存，请保留备份文件。"));}catch(err){$('import-status').textContent=err.message;button.disabled=false;}};
    }catch(err){toast(err instanceof SyntaxError?l10n("备份文件无法读取，请选择完整的 JSON 备份。"):err.message);}};
  $('interact-inline').onclick=()=>world.interact();$('touch-interact').onclick=()=>world.interact();$('jump-button').onclick=()=>world.jump();
  const joystick=$('joystick'),knob=$('joystick-knob');let joystickPointer=null;
  function moveJoystick(e){const r=joystick.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,d=Math.hypot(x,y),max=28,factor=d>max?max/d:1;world.joystick={x:x*factor/max,y:y*factor/max};knob.style.transform=`translate(${x*factor}px,${y*factor}px)`;}
  joystick.addEventListener('pointerdown',e=>{if(world.paused)return;joystickPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);moveJoystick(e);});joystick.addEventListener('pointermove',e=>{if(e.pointerId===joystickPointer)moveJoystick(e);});
  function releaseJoystick(){joystickPointer=null;world.joystick={x:0,y:0};knob.style.transform='';}joystick.addEventListener('pointerup',releaseJoystick);joystick.addEventListener('pointercancel',releaseJoystick);joystick.addEventListener('lostpointercapture',releaseJoystick);window.addEventListener('blur',releaseJoystick);
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!window.IslandI18n?.open&&!modal.open&&state.started)openSettings();});
  document.addEventListener('click',event=>{const button=event.target.closest('button');if(button&&!button.disabled&&!button.matches('#dialogue-next,[data-star],[data-story-choice],#complete-quest,#collect-memory,#open-gift,#activity-push,#activity-build,#activity-garden,#activity-launch,#activity-throw,#activity-turn,#activity-shutter,#activity-photo,#activity-walk-again'))IslandAudio.ui?.();});
  IslandAudio.setLevels?.(state.settings.levels);updateUI();updateTime();IslandAudio.setRegion?.(state.region);setInterval(updateTime,30000);
  if(state.started){setTimeout(()=>toast(tr('scene.returnWelcome')),800);}
  if(state.settings.sound){const unlock=()=>{IslandAudio.set(true);document.removeEventListener('pointerdown',unlock);};document.addEventListener('pointerdown',unlock,{once:true});}
  // Read-only diagnostics for local playtesting. No state-changing shortcuts.
  window.starIsland={snapshot:()=>({world:world.snapshot(),state:JSON.parse(JSON.stringify(state)),screen:activeScreen}),screenPoint:(x,y)=>world.toScreen(x,y)};
  $('language-button').onclick=()=>window.IslandI18n.open();
  window.IslandI18n?.init({save:()=>IslandStore.save(state),pause:paused=>{world.setPaused(paused||modal.open);}});
})();
