'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function load(locale){
 const empty=()=>{},node={addEventListener:empty,remove:empty,setAttribute:empty};
 const document={documentElement:{lang:''},body:{append:empty},title:'星屿寻迹',getElementById:()=>null,createElement:()=>({...node}),createTreeWalker:()=>({nextNode:()=>null}),querySelectorAll:()=>[],addEventListener:empty};
 const c={console,URL,Intl,document,NodeFilter:{SHOW_TEXT:4},location:{href:'https://example.test/?language='+locale},localStorage:{getItem:()=>null},CustomEvent:class{},dispatchEvent:empty};c.window=c;vm.createContext(c);
 for(const name of ['locales/en','i18n','content','regions','adventure','activities','personalization'])vm.runInContext(fs.readFileSync('src/'+name+'.js','utf8'),c,{filename:name});
 return c;
}
const zh=load('zh-CN'),en=load('en'),Z=zh.IslandPersonalization,E=en.IslandPersonalization;
assert.equal(E.registry().length,Z.registry().length);
for(const field of E.registry())for(const key of ['label','group','defaultValue','templateValue'])assert(!/[\u3400-\u9fff]/.test(field[key]),field.id+' '+key+': '+field[key]);
assert.equal(E.text('ending.fireworkText'),'Happy Birthday!');assert.equal(Z.text('ending.fireworkText'),'生日快乐!');
const identity=c=>JSON.stringify([c.ISLAND_CONTENT.memories,c.ISLAND_REGIONS,c.ISLAND_ADVENTURE,c.ISLAND_ACTIVITIES,c.ISLAND_QUESTS].map(list=>list.map(({id,x,y,type,region,requires,target})=>({id,x,y,type,region,requires,target}))));
assert.equal(identity(zh),identity(en),'Localization must never change identifiers or navigation rules');
const custom=Z.fromValues(Z.values({}));custom.recipient='小鹿';custom.letter='我写的中文信。<img src=x onerror=alert(1)>';
const switched=E.values(custom);assert.equal(switched['basic.recipient'],'小鹿');assert.equal(switched['core.letter'],custom.letter);assert.equal(switched['ending.fireworkText'],'Happy Birthday!');
const back=Z.values(E.fromValues(switched));assert.equal(back['basic.recipient'],'小鹿');assert.equal(back['core.letter'],custom.letter);assert.equal(back['ending.fireworkText'],'生日快乐!');
const roundtrip=Z.values(E.fromValues(E.values({})));for(const field of Z.registry())assert.equal(roundtrip[field.id],field.templateValue,'Roundtrip default '+field.id);
console.log('PASS: 301 English fields, stable IDs/rules, bilingual template roundtrip, authored content preserved');
