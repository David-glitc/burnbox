import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {products,root} from './config.mjs';
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'};
const port=Number(process.env.BOT_PREVIEW_PORT||8771);
for(const [index,p] of products.entries()){
 const dir=fileURLToPath(new URL(`dist/${p.slug}/`,root));
 http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname;let file=path.resolve(dir,'.'+name);if(name.endsWith('/'))file=path.join(file,'index.html');
  if(!file.startsWith(dir)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404,{'Content-Type':'text/html'});fs.createReadStream(path.join(dir,'404.html')).pipe(res);return;}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
 }).listen(port+index,'127.0.0.1',()=>console.log(`${p.name}: http://127.0.0.1:${port+index}`));
}
