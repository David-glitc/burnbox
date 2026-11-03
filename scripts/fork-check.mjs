import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createWalletClient,http,parseEther,parseAbi,encodeFunctionData,toHex} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {root,rpc,local,chain,network,publicClient as c,artifact,readJournal,infrastructure as i,products,stringify,suffix} from './config.mjs';
if(!local)throw Error('This script ONLY runs on a local fork; never mainnet');
const j=readJournal();assert(j?.ready&&j.local);const contract=j.contracts;
const key=fs.readFileSync(process.env.BOT_SIGNER_FILE||`${process.env.HOME}/.config/botchain-wave1/deployer.env`,'utf8').match(/^DEPLOYER_PRIVATE_KEY=(.*)$/m)[1];
const owner=privateKeyToAccount(key),w=createWalletClient({account:owner,chain,transport:http(rpc)});
const abi=parseAbi(['function transfer(address,uint256) returns(bool)','function approve(address,uint256) returns(bool)','function balanceOf(address) view returns(uint256)','function deposit() payable']);
const read=(name,fn,args=[],address=contract[name])=>c.readContract({address,abi:artifact(name).abi,functionName:fn,args});
const receipts=[];
async function tx(abi,address,functionName,args=[],value=0n){const {request}=await c.simulateContract({abi,address,functionName,args,value,account:owner});const hash=await w.writeContract(request);const r=await c.waitForTransactionReceipt({hash});assert.equal(r.status,'success',`${functionName} reverted in ${hash}`);receipts.push({functionName,hash,gasUsed:String(r.gasUsed)});return r;}
const write=(name,fn,args=[],value=0n,address=contract[name])=>tx(artifact(name).abi,address,fn,args,value);
await c.request({method:'anvil_setBalance',params:[owner.address,toHex(parseEther('100'))]});
// Fork only: get USDT by swapping BOT through the real BDEX router, which works on any network's fork.
const swapAbi=parseAbi(['function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) payable returns(uint256)']);
async function fundUSDT(n){
 const before=await c.readContract({address:i.USDT,abi,functionName:'balanceOf',args:[owner.address]});
 const botIn=parseEther(String(Math.ceil(Number(n)/1e6/10)+1)); // generous: ~10+ USDT per BOT
 await tx(abi,i.WBOT,'deposit',[],botIn);await tx(abi,i.WBOT,'approve',[i.router,botIn]);
 await tx(swapAbi,i.router,'exactInputSingle',[{tokenIn:i.WBOT,tokenOut:i.USDT,fee:i.fee,recipient:owner.address,deadline:BigInt((await c.getBlock()).timestamp)+600n,amountIn:botIn,amountOutMinimum:1n,sqrtPriceLimitX96:0n}]);
 assert((await c.readContract({address:i.USDT,abi,functionName:'balanceOf',args:[owner.address]}))-before>=n,'USDT funding swap returned too little');}
const results={};const ctxArtifact=artifact;
for(const p of products)if(p.fork){results[p.slug]=await p.fork({c,abi,i,tx,write,read,contract,owner,fundUSDT,rpc,artifact:ctxArtifact,net:network.key});console.log(`${p.name}: fork flow passed`);}
fs.writeFileSync(new URL(`deployments/fork-verification${suffix}.json`,root),stringify({localOnly:true,chainId:network.id,network:network.key,checkedAt:new Date().toISOString(),...results,receipts}));console.log(`Fork checks passed on a ${network.label} fork. No live-network writes.`);
