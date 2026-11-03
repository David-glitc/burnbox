import fs from 'node:fs';
import {defineChain,createPublicClient,http} from 'viem';
import wave1 from './products/index.mjs';
import wave2 from './products/wave2.mjs';
import wave3 from './products/wave3.mjs';
export const root=new URL('../',import.meta.url);
// Networks the products deploy to. BOT_NETWORK picks one; mainnet is live (October 2026), testnet stays available.
export const networks={
 mainnet:{key:'mainnet',id:677,name:'BOT Chain',label:'BOT Chain Mainnet',rpc:'https://rpc.botchain.ai',explorer:'https://scan.botchain.ai',explorerName:'BOTScan',
  infrastructure:{USDT:'0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C',WBOT:'0xD5452816194a3784dBa983426cCe7c122F4abd30',router:'0x07032d47A1b9f8460cBeE9dC17c1d3E438693929',quoter:'0x034A705b36067cff99ABf5C662Be881cBd8d0176',fee:3000}},
 testnet:{key:'testnet',id:968,name:'BOT Chain Testnet',label:'BOT Chain Testnet',rpc:'https://rpc.bohr.life',explorer:'https://scan.bohr.life',explorerName:'BOT Chain Testnet explorer',faucet:'https://faucet.botchain.ai/en/basic',
  infrastructure:{USDT:'0x75edC9335175Fc0552D51D48439F229c10420fe3',WBOT:'0xD5452816194a3784dBa983426cCe7c122F4abd30',router:'0x07032d47A1b9f8460cBeE9dC17c1d3E438693929',quoter:'0x034A705b36067cff99ABf5C662Be881cBd8d0176',fee:3000}},
};
// BOT_WAVE picks the product set. Waves 2 and 3 keep their own journals (deployments/<network>-wave<N>.json) so wave 1 records never change.
export const wave=process.env.BOT_WAVE||'1';
const list={'1':wave1,'2':wave2,'3':wave3}[wave];
if(!list)throw Error(`Unknown BOT_WAVE ${wave}; use 1, 2 or 3`);
export const suffix=wave==='1'?'':`-wave${wave}`;
export const network=networks[process.env.BOT_NETWORK||'mainnet'];
if(!network)throw Error(`Unknown BOT_NETWORK ${process.env.BOT_NETWORK}; use testnet or mainnet`);
export const rpc=process.env.BOT_RPC_URL||network.rpc;
export const local=/^http:\/\/(127\.0\.0\.1|localhost):/.test(rpc);
export const chain=defineChain({id:network.id,name:network.name,nativeCurrency:{name:'BOT',symbol:'BOT',decimals:18},rpcUrls:{default:{http:[rpc]}},blockExplorers:{default:{name:network.explorerName,url:network.explorer}}});
export const publicClient=createPublicClient({chain,transport:http(rpc,{timeout:30000,retryCount:2})});
export const infrastructure=network.infrastructure;
export const products=list;
/** A product's token list on this network (Hedgerow basket tokens). */
export const tokensFor=p=>p.tokens?.[network.key]||[];
/** Asset keys a product links on its site; 'TOKENS' expands to its basket tokens on this network. */
export const assetKeys=p=>(p.assets||[]).flatMap(k=>k==='TOKENS'?tokensFor(p).map(t=>t.symbol):[k]);
/** Public site for a product: https://<vercel>.vercel.app */
export const siteURL=p=>`https://${p.vercel}.vercel.app`;
/** BOT Chain assets the sites link to. BOT is the native coin, so it links to BOT Chain itself. */
const X=network.explorer;
export const assetLinks={
 BOT:{label:'BOT',name:network.key==='testnet'?'BOT (testnet coin)':'BOT (native coin)',href:'https://www.botchain.ai/'},
 WBOT:{label:'WBOT',name:'Wrapped BOT',href:`${X}/token/${infrastructure.WBOT}`},
 USDT:{label:'USDT',name:`Tether USD on ${network.label}`,href:`${X}/token/${infrastructure.USDT}`},
 BDEX:{label:'BDEX router',name:'BDEX V3 router',href:`${X}/address/${infrastructure.router}`},
 QUOTER:{label:'BDEX QuoterV2',name:'BDEX QuoterV2',href:`${X}/address/${infrastructure.quoter}`},
};
// Product-specific tokens (for example Hedgerow basket tokens) on this network.
for(const p of list)for(const t of (p.tokens?.[network.key]||[]))if(!t.cash&&!assetLinks[t.symbol])assetLinks[t.symbol]={label:t.symbol,name:t.name,href:`${X}/token/${t.address}`};
// Links shown on every site. Fill in X handles once the official accounts exist.
export const site={owner:'David-glitc',x:JSON.parse(fs.existsSync(new URL('social.json',root))?fs.readFileSync(new URL('social.json',root)):'{}')};
const sources=Object.assign({},...list.map(p=>p.artifacts||{}));
export const artifact=name=>JSON.parse(fs.readFileSync(new URL(`contracts/out/${sources[name]||name}.sol/${name}.json`,root)));
export const journalURL=new URL(`deployments/${local?'local':network.key}${suffix}.json`,root);
export const readJournal=()=>fs.existsSync(journalURL)?JSON.parse(fs.readFileSync(journalURL)):null;
export const stringify=value=>JSON.stringify(value,(_,v)=>typeof v==='bigint'?v.toString():v,2)+'\n';
/** Contract names a product deploys, found by dry-running its deploy step. */
export async function deployedNames(p){const names=[];await p.deploy({deploy:async n=>{names.push(n);return '0x'+'0'.repeat(40);},configure:async()=>{},account:{address:'0x'+'0'.repeat(40)},i:infrastructure});return names;}
