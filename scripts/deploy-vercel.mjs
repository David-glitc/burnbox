// Deploy each built site (dist/<slug>) to Vercel as a static production deployment at https://<vercel>.vercel.app.
// Usage: npm run build && node scripts/deploy-vercel.mjs [slug ...]. Uses the logged-in Vercel CLI and VERCEL_SCOPE.
// To deploy as another Vercel account, set VERCEL_TOKEN_FILE to a file holding that account's token (never printed) and
// VERCEL_SCOPE to that account's team slug.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {root,products,siteURL,stringify,suffix} from './config.mjs';
if(process.env.BOT_BUILD_LOCAL==='1')throw Error('Refusing to publish a local fork build');
const base=fileURLToPath(root),scope=process.env.VERCEL_SCOPE||'davidglitcs-projects',only=process.argv.slice(2),output=[];
const token=process.env.VERCEL_TOKEN_FILE?fs.readFileSync(process.env.VERCEL_TOKEN_FILE,'utf8').trim():null;
if(process.env.VERCEL_TOKEN_FILE&&!process.env.VERCEL_SCOPE)throw Error('Set VERCEL_SCOPE to the other account\'s team slug');
const vercel=(args,cwd)=>{const r=spawnSync('vercel',[...args,'--scope',scope],{cwd,encoding:'utf8',env:{...process.env,NO_COLOR:'1',...(token?{VERCEL_TOKEN:token}:{})},maxBuffer:8*1024*1024});return {...r,text:(r.stdout||'')+(r.stderr||'')};};
for(const p of products.filter(p=>!only.length||only.includes(p.slug))){
 const deployment=JSON.parse(fs.readFileSync(path.join(base,'dist',p.slug,'deployment.json')));
 if(deployment.local)throw Error('Refusing to publish local contract addresses');
 const dir=path.join(base,'sites/vercel',p.vercel);
 for(const e of fs.existsSync(dir)?fs.readdirSync(dir):[])if(e!=='.vercel')fs.rmSync(path.join(dir,e),{recursive:true,force:true});
 fs.mkdirSync(dir,{recursive:true});fs.cpSync(path.join(base,'dist',p.slug),dir,{recursive:true});fs.rmSync(path.join(dir,'_headers'),{force:true});
 fs.writeFileSync(path.join(dir,'vercel.json'),stringify({trailingSlash:true,headers:[{source:'/(.*)',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'X-Frame-Options',value:'DENY'},{key:'Cache-Control',value:'public, max-age=60'}]}]}));
 if(!fs.existsSync(path.join(dir,'.vercel/project.json'))){
  const add=vercel(['project','add',p.vercel],dir);if(add.status!==0&&!/already exists/i.test(add.text)){console.error(add.text);process.exit(1);}
  const link=vercel(['link','--yes','--project',p.vercel],dir);if(link.status!==0){console.error(link.text);process.exit(1);}
 }
 const r=vercel(['deploy','--prod','--yes'],dir);
 if(r.status!==0){console.error(r.text);process.exit(r.status||1);}
 console.log(`${p.name}: ${siteURL(p)}`);output.push({product:p.name,project:p.vercel,url:siteURL(p),deployment:(r.stdout||'').trim().split('\n').pop()});
}
if(output.length)fs.writeFileSync(path.join(base,`deployments/vercel${suffix}.json`),stringify(output));
