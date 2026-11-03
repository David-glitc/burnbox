import fs from 'node:fs';
import {createWalletClient,http,parseEther,formatEther,keccak256,encodeDeployData,encodeFunctionData} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {root,rpc,local,chain,network,publicClient as c,infrastructure as i,products,artifact,journalURL,readJournal,stringify} from './config.mjs';
if(await c.getChainId()!==network.id)throw Error(`Wrong chain; expected ${network.label} (${network.id})`);
const keyFile=process.env.BOT_SIGNER_FILE||`${process.env.HOME}/.config/botchain-wave1/deployer.env`;
const key=fs.readFileSync(keyFile,'utf8').match(/^DEPLOYER_PRIVATE_KEY=(.*)$/m)?.[1];
const account=privateKeyToAccount(key);const wallet=createWalletClient({account,chain,transport:http(rpc)});
const expected=JSON.parse(fs.readFileSync(new URL('deployments/deployer.json',root))).address;
if(account.address.toLowerCase()!==expected.toLowerCase())throw Error('Wrong deployer');
// Mainnet spends real BOT, so it needs an explicit, user-authorized budget. Testnet BOT is free from the faucet.
if(!local&&network.key==='mainnet'&&!process.env.BOT_MAX_GAS_BOT)throw Error('Set BOT_MAX_GAS_BOT to the user-authorized TOTAL gas budget before broadcasting');
const budget=parseEther(local?'100':process.env.BOT_MAX_GAS_BOT||'5');
const state=readJournal()||{chainId:network.id,network:network.key,deployer:account.address,local,contracts:{},actions:{},gasSpentWei:'0',ready:false,infrastructure:i};
if(state.chainId!==network.id||state.deployer!==account.address||state.local!==local)throw Error('Journal mismatch');
const save=()=>fs.writeFileSync(journalURL,stringify(state));
async function send(id,params){
 let action=state.actions[id];
 if(action?.receipt)return action.receipt;
 if(!action){
  const gasPrice=await c.getGasPrice();const gas=(await c.estimateGas({...params,account:account.address}))*120n/100n;
  const maxCost=gas*gasPrice;
  if(BigInt(state.gasSpentWei)+maxCost>budget)throw Error(`Budget exceeded before ${id}`);
  if(await c.getBalance({address:account.address})<maxCost)throw Error(`Fund ${account.address}; ${id} needs at most ${formatEther(maxCost)} BOT gas`);
  const hash=await wallet.sendTransaction({...params,gas,gasPrice});
  state.actions[id]={hash};save();action=state.actions[id];console.log('Sent',id,hash);
 }
 const r=await c.waitForTransactionReceipt({hash:action.hash,timeout:180000});
 if(r.status!=='success')throw Error(`${id} reverted: ${action.hash}`);
 action.receipt={transactionHash:r.transactionHash,contractAddress:r.contractAddress,blockNumber:String(r.blockNumber),gasUsed:String(r.gasUsed),gasPrice:String(r.effectiveGasPrice)};
 state.gasSpentWei=String(BigInt(state.gasSpentWei)+r.gasUsed*r.effectiveGasPrice);save();return action.receipt;
}
async function deploy(name,args=[]){
 const a=artifact(name);if((a.deployedBytecode.object.length-2)/2>24576)throw Error(`${name} exceeds EIP-170`);
 if(state.contracts[name]){if(!await c.getCode({address:state.contracts[name]}))throw Error(`Missing ${name}`);return state.contracts[name];}
 const r=await send(`deploy:${name}`,{data:encodeDeployData({abi:a.abi,bytecode:a.bytecode.object,args})});
 state.contracts[name]=r.contractAddress;state.sourceHashes??={};state.sourceHashes[name]=keccak256(a.bytecode.object);save();return r.contractAddress;
}
async function configure(name,fn,args){return send(`${name}:${fn}:${stringify(args).trim()}`,{to:state.contracts[name],data:encodeFunctionData({abi:artifact(name).abi,functionName:fn,args})});}
for(const address of [i.USDT,i.WBOT,i.router])if(!await c.getCode({address}))throw Error(`Missing BOT infrastructure ${address}`);
state.launched??={};
for(const p of products){await p.deploy({deploy,configure,account,i});state.launched[p.slug]??=new Date().toISOString();save();console.log(`${p.name}: deployed and configured`);}
state.ready=true;save();console.log(`Deployed and configured. Gas spent ${formatEther(BigInt(state.gasSpentWei))} BOT.`);
