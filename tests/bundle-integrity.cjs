'use strict';
// Compare the shipped offline document with the real development entry point.
const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8'),hash=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const index=read('index.html'),html=read('星屿寻迹.html'),entry=JSON.parse(read('package.json'));
const scripts=[...index.matchAll(/<script src="([^"]+)"[^>]*><\/script>/g)].map(m=>m[1]);
const styles=[...index.matchAll(/<link rel="stylesheet" href="([^"]+)"[^>]*>/g)].map(m=>m[1]);
const sourceHashes={};
for(const file of scripts){const original=read(file);assert(html.includes(original.replace(/<\/script/gi,'<\\/script')),file+' differs in offline bundle');sourceHashes[file]=hash(original);}
for(const file of styles)assert(html.includes('<style>\n'+read(file)+'\n</style>'),file+' differs in offline bundle');
for(const [id,files] of [['island-license',['LICENSE','NOTICE']],['island-notices',['THIRD_PARTY_NOTICES.md']]]){
  const match=html.match(new RegExp(`<script id="${id}" type="text/plain">([\\s\\S]*?)<\\/script>`));
  assert(match,'Missing license/notice in the offline file: '+id);
  assert.equal(match[1],'\n'+files.map(read).join('\n\n').replace(/<\/script/gi,'<\\/script')+'\n','Outdated license/notice: '+id);
}
assert(!/<script[^>]+src=/.test(html),'Unbundled script');assert(!/<link[^>]+rel="stylesheet"[^>]+href=/.test(html),'Unbundled stylesheet');
const assetMatch=html.match(/window\.ISLAND_ASSETS=(\{[\s\S]*?\});window\.ISLAND_ART=/);assert(assetMatch,'Missing image bundle');
const assets=JSON.parse(assetMatch[1]);
for(const [file,url] of Object.entries(assets)){assert(url.startsWith('data:image/'),file);assert(fs.readFileSync(path.join(root,file)).equals(Buffer.from(url.split(',')[1],'base64')),file+' differs in offline bundle');}
const report={version:entry.version,allSourceModulesMatch:scripts,sourceModuleCount:scripts.length,scriptTags:[...html.matchAll(/<script(?:\s[^>]*)?>/g)].length,allStylesMatch:styles,allEmbeddedAssetsMatch:Object.keys(assets).length,bytes:Buffer.byteLength(html),sourceHashes,htmlSha256:hash(html)};
const version=entry.version.split('.').slice(0,2).join('');fs.mkdirSync(path.join(root,'output'),{recursive:true});fs.writeFileSync(path.join(root,'output',`bundle-integrity-v${version}-report.json`),JSON.stringify(report,null,2));
console.log(JSON.stringify({version:entry.version,sourceModules:scripts.length,styles:styles.length,images:Object.keys(assets).length,bytes:report.bytes,htmlSha256:report.htmlSha256}));
