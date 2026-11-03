import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {products,deployedNames,siteURL,assetKeys,network,stringify,suffix} from './config.mjs';
// BOT_SITE_BASE=live checks the published sites; a template like https://{slug}.example.com checks another host; default is `npm run preview`.
const port=Number(process.env.BOT_PREVIEW_PORT||8771);
const base=(p,index)=>process.env.BOT_SITE_BASE==='live'?siteURL(p):process.env.BOT_SITE_BASE?process.env.BOT_SITE_BASE.replace('{slug}',p.slug):`http://127.0.0.1:${port+index}`;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
fs.mkdirSync('evidence',{recursive:true});const results=[];
try{
 for(const [index,product] of products.entries())for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const noOverflow=async where=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${product.name} ${where} overflows at ${width}`);
  // Landing page and the BOT Chain footer requirement.
  let response=await page.goto(base(product,index)+'/',{waitUntil:'networkidle'});assert.equal(response.status(),200);
  assert.equal(await page.locator('h1').textContent(),product.line);
  for(const id of ['how','features','onchain','faq'])assert(await page.locator(`#${id}`).count(),`${product.name} missing #${id}`);
  const footer=page.locator('footer');
  assert(await footer.locator('img[alt="BOT Chain"]').evaluate(img=>img.complete&&img.naturalWidth>0),'BOT Chain logo did not load');
  assert(await footer.locator('a[href="https://www.botchain.ai/"]').count()>=2,'BOT Chain website link missing');
  assert(await footer.locator('.proof a[href="https://scan.botchain.ai/"]').count()===1,'Explorer link missing');
  assert.equal(await footer.locator('.proof dd').first().textContent(),String(network.id),'proof chain ID');
  assert.equal(await footer.locator(`a[href^="https://github.com/"]`).count(),1,'GitHub link missing');
  // BOT Chain branding: header badge, contracts section, every asset link pointing at BOT Chain or BOTScan.
  assert(await page.locator('header a.chain-badge[href="https://www.botchain.ai/"] img[alt="BOT Chain"]').count(),'header BOT Chain badge missing');
  assert.equal(await page.locator('#contracts .contract').count(),(await deployedNames(product)).length,'contract slots');
  const assetHrefs=await page.locator('#contracts .assets a').evaluateAll(as=>as.map(a=>a.href));
  const hosts=['https://www.botchain.ai/',`${network.explorer}/`];
  assert(assetHrefs.length===assetKeys(product).length&&assetHrefs.every(h=>hosts.some(x=>h.startsWith(x))),`asset links: ${assetHrefs}`);
  await noOverflow('landing');await page.screenshot({path:`evidence/${product.slug}-landing-${width}.png`,fullPage:true});
  // App page.
  await page.locator('.hero a.button.primary').click();await page.waitForURL(/\/app\/$/);
  await page.locator('#status').filter({hasText:/Deployment pending|Connected to BOT Chain/}).waitFor();
  const pending=(await page.locator('#status').textContent()).includes('Deployment pending');
  if(pending){const submit=page.locator('button[type=submit]');for(let n=0;n<await submit.count();n++)assert(await submit.nth(n).isDisabled());}
  await page.getByRole('button',{name:'Connect wallet'}).click();await page.locator('#status').filter({hasText:'No wallet found'}).waitFor();
  assert(await page.locator('footer img[alt="BOT Chain"]').count());
  assert.equal(await page.locator('.contracts-panel .contract').count(),(await deployedNames(product)).length,'app contract slots');
  await noOverflow('app');await page.screenshot({path:`evidence/${product.slug}-app-${width}.png`,fullPage:true});
  assert.deepEqual(errors,[]);results.push({product:product.name,width,landing:200,app:true,botchainFooter:true,overflow:false,pageErrors:errors,pending,walletMissingHandled:true});await context.close();
 }
 fs.writeFileSync(`evidence/browser-check${suffix}.json`,stringify({checkedAt:new Date().toISOString(),base:process.env.BOT_SITE_BASE||'local preview',results}));console.log(`Passed ${results.length} browser checks.`);
}finally{await browser.close();}
