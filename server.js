// Zero-dependency local server. For a phone on the same LAN: node server.js --host 0.0.0.0
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const flag = process.argv.indexOf('--host');
const host = flag >= 0 ? process.argv[flag + 1] : '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json; charset=utf-8','.mp3':'audio/mpeg','.wav':'audio/wav','.txt':'text/plain; charset=utf-8'};
http.createServer((req,res)=>{
  let pathname;try { pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch { res.writeHead(400).end('Bad request');return; }
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end('Forbidden');return;}
  fs.stat(file,(error,stat)=>{if(error||!stat.isFile()){res.writeHead(404).end('Not found');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD'){res.end();return;}const stream=fs.createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res);
  });
}).listen(port,host,()=>console.log(`Star Island is ready: http://${host}:${port}`));
