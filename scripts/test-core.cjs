'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
fs.mkdirSync(path.join(root,'output'),{recursive:true});
const suites=['navigation','regions-navigation','moonlake-navigation','pastimes-storage','personalization','tree-letter-storage','waypoints','locomotion-timestep-v5','i18n'];
for(const suite of suites){
  console.log('\nRunning '+suite);
  const result=spawnSync(process.execPath,[path.join(root,'tests',suite+'.cjs')],{cwd:root,stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status||1);
}
console.log('\nAll '+suites.length+' core suites passed. Browser tests are documented in docs/DEVELOPMENT.md.');
