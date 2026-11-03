import fs from 'node:fs';
import {formatEther,parseAbi} from 'viem';
import {root,network,publicClient,infrastructure,artifact,products,deployedNames,stringify,suffix} from './config.mjs';
const {address}=JSON.parse(fs.readFileSync(new URL('deployments/deployer.json',root)));
if(await publicClient.getChainId()!==network.id)throw Error(`Wrong chain; expected ${network.label} (${network.id})`);
const result={chainId:network.id,network:network.key,deployer:address,balanceBOT:formatEther(await publicClient.getBalance({address})),gasPriceWei:(await publicClient.getGasPrice()).toString(),infrastructure:{},bytecode:{}};
for(const [name,address] of Object.entries(infrastructure).filter(([,v])=>typeof v==='string')){
 const code=await publicClient.getCode({address});if(!code||code==='0x')throw Error(`${name} missing bytecode`);
 result.infrastructure[name]={address,bytes:(code.length-2)/2};
}
const abi=parseAbi(['function decimals() view returns(uint8)']);
for(const [name,expected] of [['USDT',6],['WBOT',18]])if(await publicClient.readContract({address:infrastructure[name],abi,functionName:'decimals'})!==expected)throw Error(`${name} decimals mismatch`);
for(const p of products)for(const name of await deployedNames(p)){
 const size=(artifact(name).deployedBytecode.object.length-2)/2;
 if(size>24576)throw Error(`${name}: runtime ${size} exceeds EIP-170`);
 result.bytecode[name]=size;
}
fs.writeFileSync(new URL(`deployments/preflight-${network.key}${suffix}.json`,root),stringify(result));console.log(stringify(result));
