import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {root,products,artifact,infrastructure,site,deployedNames,assetLinks,siteURL,network,tokensFor,assetKeys,stringify,suffix} from './config.mjs';
const base=fileURLToPath(root);
// BOT_JOURNAL_FILE points a preview build at a journal kept outside deployments/ (for example a local anvil rehearsal).
const journalPath=process.env.BOT_JOURNAL_FILE?new URL(`file://${path.resolve(process.env.BOT_JOURNAL_FILE)}`):new URL(`deployments/${process.env.BOT_BUILD_LOCAL==='1'?'local':network.key}${suffix}.json`,root);
const journal=fs.existsSync(journalPath)?JSON.parse(fs.readFileSync(journalPath)):{chainId:network.id,contracts:{},ready:false};
const testnet=network.key==='testnet',X=network.explorer;
const net={key:network.key,id:network.id,name:network.name,label:network.label,rpc:network.rpc,explorer:X,explorerName:network.explorerName,faucet:network.faucet||null};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ext=(href,label)=>`<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
const scan=a=>`${X}/address/${a}`;
const web=file=>fs.readFileSync(path.join(base,'web',file),'utf8');
// Each product has its own design system: web/themes/<slug>/{theme.css,logo.svg,hero.svg}. See DESIGN.md.
const theme=slug=>{const dir=path.join(base,'web/themes',slug),css=fs.readFileSync(path.join(dir,'theme.css'),'utf8');
 const imports=css.split('\n').filter(l=>l.startsWith('@import')).join('\n'),rules=css.split('\n').filter(l=>!l.startsWith('@import')).join('\n');
 const tok=n=>(css.match(new RegExp(`--${n}:([^;]+);`))||[])[1];
 return {style:`${imports}\n${fs.readFileSync(path.join(base,'web/base.css'),'utf8')}\n${rules}\n`,logo:fs.readFileSync(path.join(dir,'logo.svg'),'utf8').trim(),hero:fs.readFileSync(path.join(dir,'hero.svg'),'utf8').trim(),light:tok('scheme')==='light',bg:tok('bg')};};
for(const p of products){
 const dir=path.join(base,'dist',p.slug);fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(path.join(dir,'app'),{recursive:true});
 const repoURL=`https://github.com/${site.owner}/${p.repo}`,x=site.x[p.slug];
 const address=journal.contracts[p.contract],launched=journal.ready&&journal.launched?.[p.slug];
 // liveLabel (owner's choice for wave 3): label the site live on mainnet before its contracts land; contract slots stay pending.
 const labelLive=!launched&&!testnet&&(p.liveLabel||process.env.BOT_LIVE_LABEL==='1');
 const config={slug:p.slug,name:p.name,contract:p.contract,tokens:tokensFor(p),assetLinks,net,chainId:network.id,rpc:journal.local?'http://127.0.0.1:8677':network.rpc,contracts:journal.contracts,infrastructure,ready:journal.ready,local:!!journal.local};
 const abis=Object.fromEntries(p.abis.map(n=>[n,artifact(n).abi]));
 await build({stdin:{contents:`import './products/${p.slug}.js';`,resolveDir:path.join(base,'web'),sourcefile:'entry.js'},outfile:path.join(dir,'app.js'),bundle:true,minify:true,format:'esm',target:'es2022',define:{APP:JSON.stringify(config),ABIS:JSON.stringify(abis)}});
 const th=theme(p.slug),chainLogo=th.light?'botchain-dark.svg':'botchain.svg';
 const proof=`<section class="proof" aria-labelledby="proof-title"><h2 id="proof-title">Proof on ${testnet?'BOT Chain Testnet':'BOT Chain Mainnet'}</h2><dl><div><dt>Chain ID</dt><dd>${network.id}</dd></div><div><dt>Contract</dt><dd>${address?ext(scan(address),address):'Published at launch'}</dd></div></dl><p class="proof-links">${ext('https://www.botchain.ai/','BOT Chain Website ↗')}${ext('https://scan.botchain.ai/','BOTScan Explorer ↗')}</p></section>`;
 const footer=`<footer class="site-footer">${proof}<div><a class="built" href="https://www.botchain.ai/" target="_blank" rel="noopener noreferrer"><span>Built on</span><img src="/${chainLogo}" alt="BOT Chain" width="150" height="30"></a></div><div><h2>BOT Chain</h2><nav aria-label="BOT Chain">${testnet?ext(`${X}/`,'Testnet explorer')+ext(network.faucet,'Testnet faucet'):''}${address?ext(scan(address),`${p.name} contract`):'<a href="/#contracts">Contracts (at launch)</a>'}${ext('https://dex.botchain.ai/','BDEX')}</nav></div><div><h2>${esc(p.name)}</h2><nav aria-label="${esc(p.name)}"><a href="/app/">Launch app</a>${ext(repoURL,'GitHub')}${x?ext(`https://x.com/${x.replace(/^@/,'')}`,`X ${x.startsWith('@')?x:'@'+x}`):''}<a href="/deployment.json">Deployment record</a></nav></div><p class="legal">${esc(p.name)} · BOT Chain edition · ${esc(network.label)} · chain ID ${network.id}. Smart contracts are open source and unaudited; use small amounts.</p></footer>`;
 const chip=launched?`<span class="hero-chip">Live on ${esc(network.label)}${testnet?' · Mainnet coming soon':''}</span>`:labelLive?`<span class="hero-chip">Live on ${esc(network.label)}</span>`:'<span class="hero-chip pending">Mainnet coming soon</span>';
 const tickerItems=['Built on BOT Chain',network.label,...p.landing.features.map(([t])=>t),'Open source · MIT','Non-custodial'];
 const ticker=[...tickerItems,...tickerItems].map(t=>`<span>${esc(t)}</span>`).join('');
 const fill=(html,extra={})=>{for(const [k,v] of Object.entries({HERO_CHIP:chip,TICKER:ticker,EXPLORER:esc(network.key==='testnet'?'the testnet explorer':'BOTScan'),EXPLORER_LONG:esc(network.key==='testnet'?'the BOT Chain Testnet explorer':'BOTScan, the BOT Chain explorer'),LOGO:th.logo.replace('<svg ','<svg class="logo" aria-hidden="true" focusable="false" ').replace(/ role="img" aria-label="[^"]*"/,''),HERO_ART:th.hero,THEME_COLOR:th.bg,BOTCHAIN_LOGO:chainLogo,NETWORK:esc(network.label),NETWORK_UPPER:esc(network.label.toUpperCase()),CHAIN_ID:String(network.id),FAUCET:testnet?`<a href="${esc(network.faucet)}" target="_blank" rel="noopener noreferrer">get test BOT</a> · `:'',NAME:esc(p.name),DESCRIPTION:esc(p.description),LINE:esc(p.line),EYEBROW:esc(p.eyebrow),SYMBOL:esc(p.symbol),REPO_URL:esc(repoURL),FOOTER:footer,...extra}))html=html.replaceAll(`__${k}__`,v);return html;};
 const facts=[['Network',`${network.label} · ${network.id}${testnet?' · mainnet coming soon':''}`],['App contract',address?ext(scan(address),address):'Deploying soon'],['Explorer',ext(`${X}/`,X.replace('https://',''))],['Source code',ext(repoURL,`github.com/${site.owner}/${p.repo}`)],['Launch',launched?(testnet?`Live on BOT Chain Testnet since ${new Date(launched).toISOString().slice(0,10)} · Mainnet coming soon`:`Officially launched on BOT Chain Mainnet · ${new Date(launched).toISOString().slice(0,10)}`):labelLive?'Live on BOT Chain Mainnet':'Mainnet coming soon'],['Wallets','BO Wallet, MetaMask, any EVM wallet']];
 const launch=launched&&testnet?`<aside class="launch" aria-label="Launch status"><strong>Live on BOT Chain Testnet · Mainnet coming soon</strong><span>Try it free with test BOT from the ${ext(network.faucet,'BOT Chain faucet')} · ${ext(scan(address),'View contract')}</span></aside>`
  :launched?`<aside class="launch" aria-label="Launch announcement"><strong>Officially launched on BOT Chain Mainnet</strong><span>${new Date(launched).toISOString().slice(0,10)} · ${ext(scan(address),'View contract')}</span></aside>`
  :labelLive?`<aside class="launch" aria-label="Launch status"><strong>Live on BOT Chain Mainnet</strong><span>Contract addresses appear below as each one is verified on BOTScan.</span></aside>`
  :`<aside class="launch pending" aria-label="Launch status"><strong>Mainnet coming soon</strong><span>Contracts are tested and deploy soon. The app unlocks when they are live.</span></aside>`;
 const names=await deployedNames(p);
 const contractRows=names.map(n=>{const a=journal.contracts[n];return `<div class="contract"><strong>${esc(n)}</strong>${a?ext(scan(a),a):'<span class="pending">Address appears here at launch</span>'}</div>`;}).join('');
 const assetRows=assetKeys(p).map(k=>assetLinks[k]).filter(Boolean).map(a=>`<li><a href="${esc(a.href)}" target="_blank" rel="noopener noreferrer" title="${esc(a.name)}">${esc(a.label)} ↗</a></li>`).join('');
 const L=p.landing;
 fs.writeFileSync(path.join(dir,'index.html'),fill(web('landing.html'),{
  LAUNCH:launch,
  STEPS:L.steps.map(([t,d])=>`<li><h3>${esc(t)}</h3><p>${esc(d)}</p></li>`).join(''),
  FEATURES:L.features.map(([t,d])=>`<div><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join(''),
  FACTS:facts.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${v.startsWith('<a')?v:esc(v)}</dd></div>`).join(''),
  FAQ:L.faq.map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join(''),
  CONTRACTS:contractRows,ASSETS:assetRows,
 }));
 fs.writeFileSync(path.join(dir,'app','index.html'),fill(web('app.html'),{CONTRACTS:contractRows,ASSETS:assetRows,APP_TITLE:esc(p.app.title),APP_LINE:esc(p.app.line),APP_LAYOUT:esc(p.app.layout)}));
 fs.writeFileSync(path.join(dir,'404.html'),fill(web('landing.html').replace(/<main id="main">[\s\S]*<\/main>/,'<main id="main" class="band"><h1>Page not found</h1><p><a href="/">Back to __NAME__</a></p></main>'),{LAUNCH:'',CONTRACTS:'',ASSETS:''}));
 fs.writeFileSync(path.join(dir,'style.css'),th.style);
 fs.copyFileSync(path.join(base,'web/botchain.svg'),path.join(dir,'botchain.svg'));fs.copyFileSync(path.join(base,'web/botchain-dark.svg'),path.join(dir,'botchain-dark.svg'));
 fs.writeFileSync(path.join(dir,'icon.svg'),th.logo);
 fs.writeFileSync(path.join(dir,'deployment.json'),stringify({product:p.name,chainId:network.id,network:network.key,ready:journal.ready,launched:launched||null,contracts:Object.fromEntries((await deployedNames(p)).filter(n=>journal.contracts[n]).map(n=>[n,journal.contracts[n]])),infrastructure,local:!!journal.local,source:repoURL}));
 fs.writeFileSync(path.join(dir,'_headers'),'/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n  Cache-Control: public, max-age=60\n');
 const out=path.join(base,'sites',p.slug,'.cloudflare/output/v0');fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(path.join(out,'workers/default'),{recursive:true});
 fs.cpSync(dir,path.join(out,'workers/default/assets'),{recursive:true});
 fs.writeFileSync(path.join(out,'config.json'),stringify({buildContext:{isPreview:false,mode:'production'}}));
 fs.writeFileSync(path.join(out,'workers/default/worker.config.json'),stringify({name:`${p.slug}-botchain`,compatibilityDate:'2026-10-07',workersDev:true,domains:[],observability:{enabled:false},assets:{htmlHandling:'auto-trailing-slash',notFoundHandling:'404-page'}}));
 console.log(`${p.name}: built for ${network.label} (${journal.ready?'contracts configured':'awaiting deployment'})`);
}
