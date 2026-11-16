'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
let stored=null,failSave=false;
const context={console,structuredClone,matchMedia:()=>({matches:false}),CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},dispatchEvent:()=>{},localStorage:{getItem:()=>stored,setItem:(_key,value)=>{if(failSave)throw new Error('quota');stored=value;}}};
context.window=context;vm.createContext(context);
for(const name of ['content','regions','adventure','activities','personalization','storage'])vm.runInContext(fs.readFileSync('src/'+name+'.js','utf8'),context,{filename:name+'.js'});
const S=context.IslandStore,P=context.IslandPersonalization,json=value=>JSON.parse(JSON.stringify(value));
const initial=S.normalize({custom:{schemaVersion:2,letter:'这是结局长信。'}});
assert.equal(initial.treeLetter,null);assert.equal(initial.custom.letter,'这是结局长信。');
for(const invalid of [null,undefined,0,1,'letter',[],true])assert.equal(S.normalizeTreeLetter(invalid),null);
const draft={to:'收信人',from:'写信人',title:'树下的一封信',date:'2026年11月16日',body:'你好，朋友。\r\n\r\n花开了🌸\u0000\u001f',theme:'starlight',updatedAt:1234.9,unknown:'should not persist'};
const normalized=S.normalizeTreeLetter(draft);
assert.equal(normalized.body,'你好，朋友。\n\n花开了🌸');assert.equal(normalized.updatedAt,1234);assert.equal(normalized.version,1);assert(!('unknown' in normalized));
for(const [key,limit] of Object.entries({to:60,from:60,title:80,date:40,body:6000})){
  const bounded=S.normalizeTreeLetter({[key]:'🌸'.repeat(limit+10)});
  assert.equal([...bounded[key]].length,limit);assert(!/[\ud800-\udfff]/u.test(bounded[key]));
}
assert.equal(S.normalizeTreeLetter({theme:'__proto__',updatedAt:Infinity}).theme,'petal');
assert.equal(S.normalizeTreeLetter({updatedAt:-10,to:'A\n B\tC'}).updatedAt,0);
assert.equal(S.normalizeTreeLetter({to:'A\n B\tC'}).to,'A B C');
const state=S.normalize({...initial,treeLetter:draft});assert(S.save(state));
assert.deepEqual(json(S.load().treeLetter),json(normalized));
assert.equal(S.load().custom.letter,'这是结局长信。');assert.equal(S.load().finished,false);assert.deepEqual(json(S.load().collected),[]);
const restored=S.normalize(JSON.parse(JSON.stringify(state)));assert.deepEqual(json(restored.treeLetter),json(normalized));
failSave=true;assert.equal(S.save({...state,treeLetter:{...normalized,body:'未写入的新正文'}}),false);assert.equal(S.available,false);assert.equal(S.load().treeLetter.body,normalized.body);failSave=false;
const old={
 'scene.treeTitle':'每一份心意，都有回响',
 'scene.treeReadyTitle':'你的愿望，快要发光了',
 'scene.treeText':'树叶轻轻晃了晃，像是在说：\n「还差 {{remaining}} 束微光。那些平凡而珍贵的瞬间，会让这座岛慢慢亮起来。」',
 'scene.treeReadyText':'五段时光已经相遇。去观星台，把它们按照故事的顺序连起来吧。\n\n树下的最后一份礼物，正在等你。'
};
const migrated=P.normalize({schemaVersion:2,narrative:old});
for(const [id,value] of Object.entries(old))assert.notEqual(migrated.narrative[id],value,id);
assert.equal(migrated.treeCopyVersion,1);
stored=JSON.stringify({custom:{schemaVersion:2,narrative:old}});S.load();assert.equal(JSON.parse(stored).custom.treeCopyVersion,1);
const sameOldWords=P.fromValues({...P.values({}),...old});
for(const [id,value] of Object.entries(old)){assert.equal(sameOldWords.narrative[id],value);assert.equal(P.normalize(sameOldWords).narrative[id],value);}
const exportedWords=P.export(sameOldWords);assert.equal(exportedWords.treeCopyVersion,1);
const giftContext={console,CustomEvent:context.CustomEvent,dispatchEvent:()=>{}};giftContext.window=giftContext;vm.createContext(giftContext);
for(const name of ['content','regions','adventure','activities'])vm.runInContext(fs.readFileSync('src/'+name+'.js','utf8'),giftContext);
giftContext.ISLAND_CONTENT=json(exportedWords);giftContext.ISLAND_TEMPLATE_CONTENT=json(P.templateContent);
vm.runInContext(fs.readFileSync('src/personalization.js','utf8'),giftContext);
for(const [id,value] of Object.entries(old))assert.equal(giftContext.IslandPersonalization.text(id),value,'Newly authored old words must survive gift opening: '+id);
const ownCopy=P.normalize({schemaVersion:2,narrative:{'scene.treeText':'给朋友准备的自定义导语'}});assert.equal(ownCopy.narrative['scene.treeText'],'给朋友准备的自定义导语');
assert.equal(P.registry().length,301);
const gift=P.export({...state.custom,treeLetter:state.treeLetter});assert(!('treeLetter' in gift));assert(!JSON.stringify(gift).includes('花开了🌸'));
const report={legacyDraftNull:true,endingLetterIndependent:true,unicodeLimits:true,controlsAndNewlines:true,unknownFieldsRejected:true,saveLoad:true,backupRestore:true,saveFailureHonest:true,oldTreeDefaultsMigrated:true,migrationPersistedOnce:true,userTreeCopyPreserved:true,newlyAuthoredOldWordsPreservedInGift:true,registryFields:301,giftExcludesPrivateDraft:true};
fs.mkdirSync('output/tree-letter-v62',{recursive:true});fs.writeFileSync('output/tree-letter-v62/storage-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
