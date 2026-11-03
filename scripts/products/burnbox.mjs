import {parseEther,encodePacked} from 'viem';
import {wave3Tokens} from './wave3-tokens.mjs';
export {wave3Tokens};
export default {
 slug:'burnbox',liveLabel:true,scripts:['products/wave3-tokens.mjs'],vercel:'burnboxbot',assets:['TOKENS','BDEX','QUOTER'],name:'Burnbox',repo:'burnbox',contract:'Burnbox',color:'#FF6B2C',eyebrow:'BUYBACK & BURN',symbol:'▲',
 line:'Fund the fire. Watch supply fall.',
 app:{title:'The furnace floor',line:'Every box buys its token on BDEX and burns it. Fuel one, stoke one, or light your own.',layout:'board'},
 description:'Public buyback-and-burn vaults for any BDEX token on BOT Chain. Anyone adds BOT, anyone stokes, and every token bought goes to the dead address.',
 abis:['Burnbox'],
 contracts:['src/Burnbox.sol','src/interfaces/IBotV3Router.sol'],tests:['test/Burnbox.t.sol'],
 tokens:wave3Tokens,
 landing:{
  steps:[['Light a box','Pick a BDEX token. Burnbox finds its route, then you set the most BOT per stoke, a price ceiling and a cooldown.'],['Anyone adds fuel','Holders, teams and fans send BOT to the box. It can only ever leave as burned tokens.'],['Anyone stokes it','When the cooldown ends, any wallet stokes the box: it buys on BDEX, burns everything, and earns a 0.3% tip.']],
  features:[['One-way fire','There is no withdraw function. Fuel turns into burned tokens or the stoker\'s tip, nothing else.'],['Price ceiling','Every stoke refuses to pay above the box\'s ceiling, so pumping the pool before a stoke cannot drain it.'],['Measured burns','Burns are counted as the dead address\'s balance change, so the odometer is exactly what BOTScan shows.'],['Keeper-free','Nobody runs a bot. The 0.3% tip pays whoever stokes the box first after its cooldown.']],
  faq:[['Who can take BOT out of a box?','Nobody. Fuel only leaves through stokes: 99.7% buys the token and burns it, 0.3% tips the stoker.'],['What does the creator control?','The route, the most BOT per stoke, the price ceiling and the cooldown. Every change is a public event, shown on the box.'],['Why a price ceiling?','A stoke is a market buy. The ceiling caps what it will pay per token, so a sandwich around a stoke can only push the price to the ceiling.'],['Which tokens work?','Any token with a BDEX V3 pool against WBOT, or a two-hop route through USDT. Fee-on-transfer tokens may fail to stoke.'],['What if the pool dries up?','Stokes fail until the creator sets a new route. Fuel waits in the box; it is never refunded.']],
 },
 async deploy({deploy,i}){await deploy('Burnbox',[i.router,i.WBOT]);},
 async fork({write,read,net,parseEther:pe=parseEther}){
  if(net!=='mainnet')return {flow:'skipped: needs a mainnet BDEX pool'};
  const W=wave3Tokens.mainnet[1].address,CA=wave3Tokens.mainnet[2].address;
  await write('Burnbox','open',[CA,encodePacked(['address','uint24','address'],[W,10000,CA]),pe('0.01'),pe('1000'),600,'Fork furnace'],pe('0.02'));
  const id=await read('Burnbox','boxCount')-1n;await write('Burnbox','burn',[id,0n]);
  return {flow:'light box → stoke (BDEX buy → burn)',burned:String((await read('Burnbox','getBox',[id])).burned)};
 },
};
