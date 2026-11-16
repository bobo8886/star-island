// Bundle the complete game, including artwork, into one offline HTML document.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root,name),'utf8');
let html = read('index.html');
for(const [id,files] of [['island-license',['LICENSE','NOTICE']],['island-notices',['THIRD_PARTY_NOTICES.md']]]){
  const pattern=new RegExp(`<script id="${id}" type="text/plain">[\\s\\S]*?<\\/script>`);
  if(!pattern.test(html))throw new Error('Missing embedded notice placeholder: '+id);
  const notice=files.map(read).join('\n\n').replace(/<\/script/gi,'<\\/script');
  html=html.replace(pattern,()=>`<script id="${id}" type="text/plain">\n${notice}\n</script>`);
}
for(const file of ['style.css','studio.css','tree-letter.css'])html=html.replace(`<link rel="stylesheet" href="${file}">`,()=>'<style>\n'+read(file)+'\n</style>');
html = html.replace('href="assets/favicon.svg"',()=>`href="data:image/svg+xml;base64,${fs.readFileSync(path.join(root,'assets/favicon.svg')).toString('base64')}"`);
const assets = {};
for(const file of ['island.png','forest.png','coast.png','moonlake.png','lake-props.png','character-design.png','companion-design.png','character-atlas.png','companion-atlas.png','sandcastle-stages.png','character-idle-v6.png',...['character','companion'].flatMap(name=>['side','front','back'].map(direction=>`${name}-walk-${direction}-v6.png`))]){
  if(!/\.(png|webp)$/i.test(file))continue;
  const mime=/\.webp$/i.test(file)?'image/webp':'image/png';
  assets['assets/'+file]=`data:${mime};base64,`+fs.readFileSync(path.join(root,'assets',file)).toString('base64');
}
html = html.replace('<script src="src/content.js"></script>',()=>`<script>window.ISLAND_STANDALONE=true;window.ISLAND_ASSETS=${JSON.stringify(assets)};window.ISLAND_ART=ISLAND_ASSETS['assets/island.png'];window.ISLAND_CHARACTER_ART=ISLAND_ASSETS['assets/character-design.png'];</script>\n<script id="island-content">${read('src/content.js')}</script>`);
for(const name of ['regions','adventure','activities','personalization','storage','audio','character','sandcastle','scenery','pastimes','fireworks','waypoints','world','stationery','studio','letter-art','tree-letter','game'])html=html.replace(`<script src="src/${name}.js"></script>`,()=>`<script>\n${read('src/'+name+'.js').replace(/<\/script/gi,'<\\/script')}\n</script>`);
const output=path.join(root,'星屿寻迹.html');
fs.writeFileSync(output,html,'utf8');
console.log(`Standalone built: ${output} (${(Buffer.byteLength(html)/1024/1024).toFixed(2)} MB)`);
