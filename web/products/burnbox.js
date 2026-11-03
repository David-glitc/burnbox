import {$,config,abis,state,esc,fmt,link,form,field,read,tx,mine,start,button} from '../core.js';
import {ZERO,meta,nice,units,picked,tokenPicker,wirePickers,bestRoute,quote,describePath,countdown,tick,optional,many} from '../w3kit.js';
const TIP_BPS=30n;
const tally={boxes:0,fuel:0n,stokes:0};
const COOLDOWNS=[[600,'10 min'],[3600,'1 hour'],[21600,'6 hours'],[86400,'24 hours']];
let scouted=null,timers=[];
const select=(name,list,value)=>`<select id="${name}" name="${name}">${list.map(([v,l])=>`<option value="${v}" ${v===value?'selected':''}>${l}</option>`).join('')}</select>`;
/** Price of one whole token in BOT wei, from a quote of `botIn` → `out`. */
const priceOf=(botIn,out,dec)=>out>0n?botIn*10n**BigInt(dec)/out:0n;

async function scout(f,where){
 const token=picked(f,'token'),t=await meta(token),probe=units(f.max||'1');
 const r=await bestRoute(t.address,probe);
 if(!r)throw Error(`No BDEX route from WBOT to ${t.symbol} yet. A box needs a pool to buy from.`);
 const price=priceOf(probe,r.out,t.decimals);scouted={token:t.address,path:r.path,price};
 $(where).innerHTML=`<div class="route-card"><span class="sub">Route found</span><p class="route">${describePath(r.path)}</p><p class="tiny">${nice(probe)} BOT buys ≈ <b>${nice(r.out,t.decimals)} ${esc(t.symbol)}</b> · market ≈ ${nice(price,18,8)} BOT per ${esc(t.symbol)}</p></div>`;
 return scouted;
}
function controls(){
 $('list-title').textContent='Furnaces';
 const ca=(config.tokens||[]).find(t=>t.symbol==='CA')?.address||ZERO;
 $('controls').innerHTML='<div class="kiln-head"><span class="eyebrow">New box</span><h2>Light a furnace</h2><p>Burnbox routes BOT into your token on BDEX and burns every token it buys.</p></div>'
  +form('light',tokenPicker('token','Token to burn',ca,true)
   +`<div class="two"><div>${field('max','Max BOT per stoke','1','text','inputmode="decimal"')}</div><div><label for="cooldown">Cooldown</label>${select('cooldown',COOLDOWNS,3600)}</div></div>`
   +`<div class="ceiling"><div>${field('ceiling','Price ceiling (BOT per token)','','text','inputmode="decimal" placeholder="Scout to suggest"')}</div><button type="button" class="quiet" id="scout">Scout route</button></div>`
   +'<div id="route-preview" aria-live="polite"></div>'
   +optional(field('label','Name','','text','maxlength="60" placeholder="CA community furnace"'))
   +optional(field('fuel','Opening fuel (BOT, optional)','','text','inputmode="decimal" placeholder="0.5"')),
   'Light the box',async f=>{
    const token=picked(f,'token');if(!scouted||scouted.token.toLowerCase()!==token.toLowerCase())await scout(f,'route-preview');
    const t=await meta(token),max=units(f.max),ceiling=units(f.ceiling||'',18),fuel=f.fuel?units(f.fuel):0n;
    await tx('Burnbox','open',[t.address,scouted.path,max,ceiling,Number(f.cooldown),f.label||`${t.symbol} furnace`],fuel);
   });
 $('rules').innerHTML='<ul><li>Fuel never leaves a box except as burned tokens and the 0.3% stoker tip.</li><li>Each stoke spends at most the box\'s per-stoke limit, then waits out the cooldown.</li><li>A stoke never pays more than the price ceiling per token; above it, the buy reverts.</li><li>Tokens go to <span class="mono">0x…dEaD</span>. The odometer is the measured balance change.</li><li>Anyone can stoke. No keeper, no fee.</li></ul>';
 wirePickers($('controls'));
 // Suggest a ceiling 50% above the market so normal moves still burn, while a pumped pool does not.
 $('controls').addEventListener('click',async e=>{
  if(e.target.id!=='scout')return;const f=Object.fromEntries(new FormData(e.target.form));
  try{const s=await scout(f,'route-preview');$('ceiling').value=(Number(s.price)*1.5/1e18).toPrecision(4);}catch(err){$('route-preview').innerHTML=`<p class="hint error">${esc(err.shortMessage||err.message)}</p>`;}
 });
 document.addEventListener('click',e=>{const b=e.target.closest('[data-fill]');if(!b)return;const i=$(b.dataset.target);if(i){i.value=b.dataset.fill;i.focus();}});
}
const heatOf=(bal,max)=>bal===0n?0:bal<max?1:bal<max*5n?2:3;
const HEAT=['Cold','Embers','Burning','Roaring'];
function odometer(n,dec){const s=nice(n,dec,2);return `<span class="odo" aria-label="${esc(s)} burned">${[...s].map(c=>`<b${/\d/.test(c)?'':' class="sep"'}>${esc(c)}</b>`).join('')}</span>`;}
const flame=`<svg class="flame" viewBox="0 0 120 140" aria-hidden="true"><path class="f1" d="M60 6c16 22 40 40 40 74a40 40 0 0 1-80 0c0-20 10-32 18-44 3 12 8 20 16 24 0-20-2-36 6-54z"/><path class="f2" d="M60 46c10 14 24 24 24 44a24 24 0 0 1-48 0c0-12 6-20 11-27 2 7 5 12 10 14 0-12-1-20 3-31z"/><path class="f3" d="M60 84c6 8 12 13 12 22a12 12 0 0 1-24 0c0-7 4-11 7-15 1 4 3 6 5 7 0-6 0-9 0-14z"/></svg>`;
async function card(id,b,left){
 const t=await meta(b.token),spendable=b.balance<b.maxPerBurn?b.balance:b.maxPerBurn,tip=spendable*TIP_BPS/10000n,spend=spendable-tip;
 const heat=heatOf(b.balance,b.maxPerBurn),creator=mine(b.creator);
 let out=0n,market=0n;if(spend>0n){out=await quote(b.path,spend).catch(()=>0n);market=priceOf(spend,out,t.decimals);}
 const tooHot=out>0n&&market>b.maxPrice,cooling=left>0;
 if(cooling)timers.push({id,at:Date.now()/1000+left});
 const can=state.account&&spend>0n&&out>0n&&!tooHot&&!cooling;
 const minOut=out*98n/100n;
 const why=spend===0n?'Add fuel to stoke':out===0n?'No liquidity on this route right now':tooHot?'Market is above the ceiling':cooling?`Cools down in <span data-cool="${id}">${countdown(left)}</span>`:!state.account?'Connect a wallet to stoke':'';
 const fuelPct=b.maxPerBurn>0n?Math.min(100,Number(b.balance*100n/(b.maxPerBurn*5n))):0;
 const ceilPct=b.maxPrice>0n&&market>0n?Math.min(100,Number(market*100n/b.maxPrice)):0;
 return `<article class="furnace" id="box-${id}" data-heat="${heat}">
  <header class="furnace-head"><div><span class="tiny mono">BOX ${String(id).padStart(3,'0')}</span><h3>${esc(b.label)||`${esc(t.symbol)} furnace`}</h3><span class="tiny">Burns ${link(b.token,t.symbol)} · lit by ${mine(b.creator)?'you':link(b.creator)}</span></div><span class="badge heat-badge">${HEAT[heat]}</span></header>
  <div class="firebox">${flame}<div class="grate" aria-hidden="true"></div><div class="burned"><span class="sub">Burned forever</span>${odometer(b.burned,t.decimals)}<span class="tiny">${esc(t.symbol)} · ${b.burns} stoke${b.burns===1?'':'s'}</span></div></div>
  <dl class="gauges">
   <div><dt>Fuel</dt><dd>${nice(b.balance)} BOT</dd><div class="meter" aria-hidden="true"><i style="width:${fuelPct}%"></i></div></div>
   <div><dt>Next stoke</dt><dd>${nice(spend)} BOT${out>0n?` → ${nice(out,t.decimals)} ${esc(t.symbol)}`:''}</dd></div>
   <div><dt>Market vs ceiling</dt><dd>${market>0n?`${nice(market,18,8)} / ${nice(b.maxPrice,18,8)}`:`ceiling ${nice(b.maxPrice,18,8)}`}</dd><div class="meter ceil${tooHot?' over':''}" aria-hidden="true"><i style="width:${ceilPct}%"></i></div></div>
   <div><dt>Cooldown</dt><dd>${countdown(b.cooldown)}${cooling?' · cooling':' · ready'}</dd></div>
  </dl>
  <div class="stoke">${button(`Stoke${out>0n?` · burn ≈ ${nice(out,t.decimals)} ${t.symbol}`:''}`,async()=>{if(!can)throw Error(why.replace(/<[^>]+>/g,'')||'This box cannot be stoked right now.');await tx('Burnbox','burn',[BigInt(id),minOut]);},true).replace('<button',`<button ${can?'':'aria-disabled="true"'}`)}<p class="tiny">${why||`You earn ${nice(tip,18,6)} BOT for stoking.`}</p></div>
  ${form(`fuel-${id}`,`<label for="fuel-${id}-amt">Add fuel</label><div class="fuel-row"><input id="fuel-${id}-amt" name="amt" inputmode="decimal" placeholder="BOT" required><span class="chips">${['0.1','0.5','1'].map(v=>`<button type="button" class="quiet" data-fill="${v}" data-target="fuel-${id}-amt">${v}</button>`).join('')}</span></div>`,'Add fuel',async f=>tx('Burnbox','fund',[BigInt(id)],units(f.amt)))}
  <details><summary>Route, totals${creator?' and settings':''}</summary><p class="route">${describePath(b.path)}</p><dl class="figs"><div><dt>Fuel added</dt><dd>${nice(b.funded)} BOT</dd></div><div><dt>Spent</dt><dd>${nice(b.spent)} BOT</dd></div><div><dt>Per stoke</dt><dd>${nice(b.maxPerBurn)} BOT</dd></div><div><dt>Share</dt><dd><a href="#box-${id}">#box-${id}</a></dd></div></dl>
   ${creator?form(`route-${id}`,`<div class="two"><div>${field(`max-${id}`,'Max BOT per stoke',fmt(b.maxPerBurn),'text','inputmode="decimal"').replace(`name="max-${id}"`,'name="max"')}</div><div>${field(`ceil-${id}`,'Ceiling (BOT/token)',fmt(b.maxPrice),'text','inputmode="decimal"').replace(`name="ceil-${id}"`,'name="ceiling"')}</div></div><label for="cd-${id}">Cooldown</label>${select(`cd-${id}`,COOLDOWNS,b.cooldown).replace(`name="cd-${id}"`,'name="cooldown"')}<p class="hint">Re-scouts the best BDEX route for ${esc(t.symbol)} before saving.</p>`,'Save settings',async f=>{const r=await bestRoute(b.token,units(f.max));if(!r)throw Error('No BDEX route found.');await tx('Burnbox','setRoute',[BigInt(id),r.path,units(f.max),units(f.ceiling),Number(f.cooldown)]);}):''}
  </details>
 </article>`;
}
async function render(){
 const count=Number(await read('Burnbox','boxCount'));Object.assign(tally,{boxes:count,fuel:0n,stokes:0});timers=[];
 if(!count)return '<div class="empty cold"><p>No furnaces yet.</p><p class="tiny">Light the first one for any BDEX token.</p></div>';
 const ids=[...Array(Math.min(count,24)).keys()].map(k=>count-1-k);
 const [boxes,lefts]=await Promise.all([Promise.all(ids.map(id=>read('Burnbox','getBox',[BigInt(id)]))),many(ids.map(id=>({address:config.contracts.Burnbox,abi:abis.Burnbox,functionName:'cooldownLeft',args:[BigInt(id)]})))]);
 for(const b of boxes){tally.fuel+=b.balance;tally.stokes+=b.burns;}
 // Hottest boxes first: the ones ready to stoke, then by fuel.
 const order=ids.map((id,k)=>({id,b:boxes[k],left:Number(lefts[k]||0n)})).sort((x,y)=>(x.left>0)-(y.left>0)||(y.b.balance>x.b.balance?1:-1));
 const cards=await Promise.all(order.map(o=>card(o.id,o.b,o.left)));
 return `<div class="furnaces">${cards.join('')}</div>`;
}
function after(){
 tick(()=>{const now=Date.now()/1000;let done=false;for(const t of timers){const el=document.querySelector(`[data-cool="${t.id}"]`);if(!el)continue;const s=t.at-now;if(s<=0)done=true;el.textContent=countdown(s);}if(done){timers=[];$('refresh').click();}});
 const want=location.hash.slice(1);if(want)document.getElementById(want)?.scrollIntoView({block:'center'});
}
function stats(empty){return [['Furnaces',empty?'—':String(tally.boxes)],['BOT on the fire',empty?'—':nice(tally.fuel)],['Stokes',empty?'—':String(tally.stokes)]];}
start({controls,render,stats,after});
