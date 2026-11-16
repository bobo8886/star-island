(() => {
  'use strict';
  const l10n=window.IslandI18n?.t||((text)=>text);
  const suffix = ISLAND_CONTENT.giftId ? '-' + ISLAND_CONTENT.giftId : '';
  const KEY = 'star-island-v1' + suffix;
  let available = true;
  function normalizeTreeLetter(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const limits={to:60,from:60,title:80,date:40,body:6000},letter={version:1};
    for(const [key,limit] of Object.entries(limits)){
      const source=typeof value[key]==='string'?value[key]:'';
      const text=source.replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
      letter[key]=Array.from(key==='body'?text:text.replace(/\s+/g,' ')).slice(0,limit).join('');
    }
    letter.theme=['petal','starlight','meadow'].includes(value.theme)?value.theme:'petal';
    letter.updatedAt=typeof value.updatedAt==='number'&&Number.isFinite(value.updatedAt)?Math.max(0,Math.floor(value.updatedAt)):0;
    return letter;
  }
  function normalize(data) {
    const ids = ISLAND_CONTENT.memories.map(m => m.id);
    const collected = [...new Set((Array.isArray(data?.collected) ? data.collected : []).filter(id => ids.includes(id)))];
    const allowedTimes = ['auto', 'night', 'day', 'dusk'];
    const objects = window.ISLAND_ADVENTURE || [];
    const storyIds = new Set(objects.map(item => item.id));
    const found = [...new Set((Array.isArray(data?.exploration?.found) ? data.exploration.found : []).filter(id => storyIds.has(id)))];
    const questDefs = window.ISLAND_QUESTS || [];
    const completed = [...new Set((Array.isArray(data?.exploration?.completed) ? data.exploration.completed : []).filter(id => questDefs.some(q => q.id === id && found.includes(q.target) && q.requires.every(required => found.includes(required)))) )];
    const choices = {};
    for (const object of objects) if (object.choices?.some(c => c.id === data?.exploration?.choices?.[object.id])) choices[object.id] = data.exploration.choices[object.id];
    const regions = (window.ISLAND_REGIONS?.length ? window.ISLAND_REGIONS.map(region=>region.id) : ['home','forest','coast']);
    const region = regions.includes(data?.region) ? data.region : 'home';
    const visitedRegions = [...new Set(['home',...(Array.isArray(data?.visitedRegions)?data.visitedRegions:[]).filter(id=>regions.includes(id)),region])];
    const bounded=(value,max)=>Number.isFinite(Number(value))?Math.max(0,Math.min(max,Math.floor(Number(value)))):0;
    const sandcastle=bounded(data?.activities?.sandcastle,3),photos=bounded(data?.activities?.photos,9999);
    const gardenStage=bounded(data?.activities?.gardenStage,2),boats=bounded(data?.activities?.boats,9999);
    const wishes=window.ISLAND_ACTIVITIES?.find(item=>item.id==='paper_boat')?.wishes?.map(wish=>wish.id)||['peace','courage','together'];
    const lastBoatWish=wishes.includes(data?.activities?.lastBoatWish)?data.activities.lastBoatWish:'';
    const rawBest=bounded(data?.activities?.bestSkips,5),bestSkips=rawBest>=2?rawBest:0;
    const stoneThrows=bounded(data?.activities?.stoneThrows,9999),windmillTurns=bounded(data?.activities?.windmillTurns,9999);
    const activityIds=window.ISLAND_ACTIVITIES?.map(item=>item.id)||['swing','sandcastle','stroll','photo'];
    const consistent=id=>id==='sandcastle'?sandcastle===3:id==='photo'?photos>0:id==='flower_garden'?gardenStage===2:id==='paper_boat'?boats>0&&!!lastBoatWish:id==='stone_skip'?bestSkips>=2&&stoneThrows>0:id==='windmill'?windmillTurns>0:true;
    const activityCompleted=[...new Set((Array.isArray(data?.activities?.completed)?data.activities.completed:[]).filter(id=>activityIds.includes(id)&&consistent(id)))];
    const companionOptions=['spirit','boy','none'];
    const companion=companionOptions.includes(data?.settings?.companion)?data.settings.companion:companionOptions.includes(ISLAND_CONTENT.defaultCompanion)?ISLAND_CONTENT.defaultCompanion:'spirit';
    let custom = {};
    const raw = data?.custom || {};
    for (const key of ['recipient', 'sender', 'letter', 'giftTitle', 'giftDescription']) {
      if (typeof raw[key] === 'string') custom[key] = raw[key].slice(0, key === 'letter' ? 12000 : 2000);
    }
    if (Array.isArray(raw.memories)) custom.memories = ids.map((id, i) => ({
      title: typeof raw.memories[i]?.title === 'string' ? raw.memories[i].title.slice(0, 150) : ISLAND_CONTENT.memories[i].title,
      text: typeof raw.memories[i]?.text === 'string' ? raw.memories[i].text.slice(0, 5000) : ISLAND_CONTENT.memories[i].text
    }));
    if(window.IslandPersonalization)custom=IslandPersonalization.normalize(raw);
    const level=(key,fallback)=>{const value=data?.settings?.levels?.[key]??ISLAND_CONTENT.defaultLevels?.[key];return typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(1,value)):fallback;};
    return { version: 1, started: !!data?.started, collected, finished: !!data?.finished && collected.length === 5,
      campfireSeen: !!data?.campfireSeen, nightSeen: !!data?.nightSeen, region, visitedRegions,
      exploration: {found,completed,choices},
      activities: {sandcastle,completed:activityCompleted,photos,gardenStage,boats,lastBoatWish,bestSkips,stoneThrows,windmillTurns},
      settings: { time: allowedTimes.includes(data?.settings?.time) ? data.settings.time : 'auto', sound: !!data?.settings?.sound,
        companion,
        levels:{music:level('music',.72),sfx:level('sfx',.8),voice:level('voice',1)},
        reducedMotion: typeof data?.settings?.reducedMotion === 'boolean' ? data.settings.reducedMotion : matchMedia('(prefers-reduced-motion: reduce)').matches },
      custom,treeLetter:normalizeTreeLetter(data?.treeLetter) };
  }
  function load() { try { const raw=JSON.parse(localStorage.getItem(KEY)||'{}'),result=normalize(raw);if(window.IslandPersonalization&&raw?.custom&&(raw.custom.schemaVersion!==2||raw.custom.treeCopyVersion!==1)){try{localStorage.setItem(KEY,JSON.stringify(result));}catch{available=false;}}return result;} catch { available = false; return normalize({}); } }
  function save(state) { try { localStorage.setItem(KEY, JSON.stringify(state)); available = true; return true; } catch { available = false; return false; } }
  let dbPromise;
  function database() {
    if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error(l10n("当前浏览器不支持保存照片和语音。")));
      const request = indexedDB.open('star-island-media' + suffix, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('media');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(l10n("无法保存媒体，请尝试普通浏览模式。")));
    });
    return dbPromise;
  }
  async function mediaAll() {
    try {
      const db = await database();
      return await new Promise((resolve, reject) => {
        const result = {}; const tx = db.transaction('media', 'readonly'); const req = tx.objectStore('media').openCursor();
        req.onsuccess = () => { const c = req.result; if (c) { result[c.key] = c.value; c.continue(); } };
        tx.oncomplete = () => resolve(result); tx.onerror = () => reject(tx.error);
      });
    } catch { return {}; }
  }
  async function putMedia(key, value) {
    const db = await database();
    return new Promise((resolve, reject) => { const tx = db.transaction('media', 'readwrite');
      if (value) tx.objectStore('media').put(value, key); else tx.objectStore('media').delete(key);
      tx.oncomplete = resolve; tx.onerror = () => reject(new Error(l10n("媒体保存失败，存储空间可能不足。"))); });
  }
  async function replaceMedia(media) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('media', 'readwrite'); const store = tx.objectStore('media'); store.clear();
      Object.entries(media).forEach(([key, value]) => store.put(value, key));
      tx.oncomplete = resolve; tx.onerror = () => reject(new Error(l10n("恢复媒体失败，原存档尚未修改。")));
    });
  }
  window.IslandStore = { load, save, normalize, normalizeTreeLetter, mediaAll, putMedia, replaceMedia, get available() { return available; } };
})();
