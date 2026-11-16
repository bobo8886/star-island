/* Local, synchronous localization. Only authored literals pass through t();
 * player input and uploaded media never pass through a DOM translation observer. */
(() => {
  'use strict';
  const KEY='star-island-language',dictionary={...(window.ISLAND_EN||{})},cache=new Map();
  // Narrative registration replaces the original character names with tokens.
  // Keep both spellings of the built-in template recognizable across languages.
  for(const [zh,en] of Object.entries(dictionary))if(zh.length>3&&(zh.includes('阿屿')||zh.includes('小满')))dictionary[zh.replaceAll('阿屿','{{guide}}').replaceAll('小满','{{girl}}')]=en;
  const escaped=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const keys=Object.keys(dictionary).sort((a,b)=>b.length-a.length);
  const pattern=new RegExp(keys.map(escaped).join('|'),'g');
  const reverse=new Map(Object.entries(dictionary).filter(([zh,en])=>zh!==en&&en).map(([zh,en])=>[en,zh]));
  let locale='zh-CN',confirmed=false;
  try{locale=localStorage.getItem(KEY)==='en'?'en':'zh-CN';confirmed=!!localStorage.getItem(KEY);}catch{}
  const requested=new URL(location.href).searchParams.get('language');
  const query=['zh-CN','en'].includes(requested)?requested:null;
  if(query)locale=query;
  const english=text=>{text=String(text??'');if(cache.has(text))return cache.get(text);const out=Object.prototype.hasOwnProperty.call(dictionary,text)?dictionary[text]:text.replace(pattern,key=>dictionary[key]);cache.set(text,out);return out;};
  const t=text=>locale==='en'?english(text):String(text??'');
  const template=text=>locale==='en'?english(text):(reverse.get(text)??text);
  const sameTemplate=(value,reference)=>typeof value==='string'&&(value===reference||english(value)===english(reference));
  const templateObject=value=>Array.isArray(value)?value.map(templateObject):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,templateObject(v)])):typeof value==='string'?template(value):value;
  document.documentElement.lang=locale;
  // Translate only the initial, static document, before game modules add any user text.
  if(locale==='en'){
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
    while((node=walker.nextNode()))if(!node.parentElement.closest('script,style'))node.nodeValue=t(node.nodeValue);
    for(const element of document.querySelectorAll('[aria-label],[title],[placeholder],meta[name="description"]'))for(const attr of ['aria-label','title','placeholder','content'])if(element.hasAttribute(attr))element.setAttribute(attr,t(element.getAttribute(attr)));
    document.title=t(document.title);
  }
  document.getElementById('language-dialog')?.remove();
  const dialog=document.createElement('dialog');dialog.id='language-dialog';dialog.className='language-dialog';
  let hooks=null,pending=locale;
  const copy=()=>pending==='en'?{eyebrow:'A LITTLE ISLAND, IN YOUR WORDS',title:'Your journey starts here.',intro:'Choose the language for your little universe.',hint:'Stories, letters and birthday wishes will follow your choice. Your own words stay just as you wrote them.',start:'Enter the island',saved:'You can change this in Settings anytime.',close:'Cancel'}:{eyebrow:'A LITTLE ISLAND, IN YOUR WORDS',title:'用熟悉的语言，开启奇遇。',intro:'为这座小小的宇宙，选择一种语言。',hint:'故事、信件与生日祝福都会随之切换。你亲手写下的内容，会保留原样。',start:'走进星屿',saved:'之后也可以在设置中随时切换。',close:'暂不切换'};
  function render(canClose){const c=copy();dialog.innerHTML=`<div class="language-art" aria-hidden="true"><span class="language-orbit"></span><span class="language-spark spark-one">✦</span><span class="language-spark spark-two">✧</span><span class="language-envelope">♡</span><small>STAR ISLAND</small></div><div class="language-content"><span class="language-eyebrow">${c.eyebrow}</span><h1 id="language-title">${c.title}</h1><p class="language-intro">${c.intro}</p><fieldset class="language-options"><legend class="sr-only">Language / 语言</legend><label class="language-option"><input type="radio" name="island-language" value="zh-CN" ${pending==='zh-CN'?'checked':''}><span class="language-monogram">中</span><span><strong>简体中文</strong><small>把时光，藏进星光里。</small></span><span class="language-check">✓</span></label><label class="language-option"><input type="radio" name="island-language" value="en" ${pending==='en'?'checked':''}><span class="language-monogram">En</span><span><strong>English</strong><small>A little island, all for you.</small></span><span class="language-check">✓</span></label></fieldset><p class="language-note">${c.hint}</p><button type="button" id="language-confirm" class="language-confirm">${c.start}<span aria-hidden="true">↗</span></button><p class="language-footnote">${c.saved}</p>${canClose?`<button type="button" id="language-cancel" class="language-cancel">${c.close}</button>`:''}</div>`;
    dialog.querySelectorAll('input').forEach(input=>input.onchange=()=>{pending=input.value;render(canClose);dialog.querySelector(`input[value="${pending}"]`).focus();});
    dialog.querySelector('#language-confirm').onclick=()=>commit();dialog.querySelector('#language-cancel')?.addEventListener('click',()=>dialog.close());
  }
  function open(canClose=true){pending=locale;render(canClose);dialog.setAttribute('aria-labelledby','language-title');dialog.dataset.dismissible=String(canClose);hooks?.pause(true);if(!dialog.open)dialog.showModal();dialog.querySelector('input:checked').focus();}
  function commit(){
    const changed=pending!==locale;
    try{localStorage.setItem(KEY,pending);}catch{}
    confirmed=true;
    if(changed){hooks?.save();const url=new URL(location.href);url.hash='';url.searchParams.set('language',pending);location.replace(url.href);return;}
    dialog.close();
  }
  // Query parameter also makes language switching work when browser storage is disabled.
  dialog.addEventListener('cancel',event=>{if(dialog.dataset.dismissible!=='true')event.preventDefault();});
  dialog.addEventListener('close',()=>hooks?.pause(false));
  document.addEventListener('keydown',event=>{if(dialog.open&&!['Tab','Enter',' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Escape'].includes(event.key))event.stopPropagation();},true);
  document.body.append(dialog);
  window.IslandI18n={t,english,template,templateObject,sameTemplate,get locale(){return locale;},get open(){return dialog.open;},open,
    init(options){hooks=options;if(!confirmed&&!query)open(false);},
    date:()=>new Intl.DateTimeFormat(locale==='en'?'en-US':'zh-CN',{year:'numeric',month:'long',day:'numeric'}).format(new Date())};
})();
