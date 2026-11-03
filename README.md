# Burnbox

**Fund the fire. Watch supply fall.** Public buyback-and-burn vaults for any BDEX token on BOT Chain. Anyone adds BOT, anyone stokes, and every token bought goes to the dead address.

**Officially launched on BOT Chain Mainnet** on 2026-11-03.

- Website and app: https://burnboxbot.vercel.app (app at [`/app/`](https://burnboxbot.vercel.app/app/))
- Network: BOT Chain mainnet, chain ID 677 · [BOT Chain](https://www.botchain.ai/) · [BOTScan](https://scan.botchain.ai/)

![Burnbox landing page](docs/burnbox-landing-1280.png)

## How it works

1. **Light a box.** Pick a BDEX token. Burnbox finds its route, then you set the most BOT per stoke, a price ceiling and a cooldown.
2. **Anyone adds fuel.** Holders, teams and fans send BOT to the box. It can only ever leave as burned tokens.
3. **Anyone stokes it.** When the cooldown ends, any wallet stokes the box: it buys on BDEX, burns everything, and earns a 0.3% tip.

## Features

- **One-way fire.** There is no withdraw function. Fuel turns into burned tokens or the stoker's tip, nothing else.
- **Price ceiling.** Every stoke refuses to pay above the box's ceiling, so pumping the pool before a stoke cannot drain it.
- **Measured burns.** Burns are counted as the dead address's balance change, so the odometer is exactly what BOTScan shows.
- **Keeper-free.** Nobody runs a bot. The 0.3% tip pays whoever stokes the box first after its cooldown.

## Contracts

| Contract | BOT Chain mainnet |
|---|---|
| `Burnbox` | [`0x37b746fa129d6bec0a2c0850c30ed272cecf0c10`](https://scan.botchain.ai/address/0x37b746fa129d6bec0a2c0850c30ed272cecf0c10) |

BOT Chain infrastructure used: USDT `0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C`, WBOT `0xD5452816194a3784dBa983426cCe7c122F4abd30`, BDEX router `0x07032d47A1b9f8460cBeE9dC17c1d3E438693929`, BDEX QuoterV2 `0x034A705b36067cff99ABf5C662Be881cBd8d0176`.

Source: [`contracts/src`](contracts/src). Tests: [`contracts/test`](contracts/test). The contracts are unaudited; use small amounts.

## Develop

Requires Node 20+, [Foundry](https://getfoundry.sh) and Python 3.

```bash
git clone --recursive https://github.com/David-glitc/burnbox.git
cd burnbox
npm ci
npm test              # forge test
npm run build         # landing page + app into dist/burnbox
npm run preview       # http://127.0.0.1:8771
```

`npm run build` writes `dist/burnbox/index.html` (landing page), `dist/burnbox/app/` (the dApp) and a Cloudflare Workers bundle under `sites/`.

### Wallets

The app discovers installed wallets with EIP-6963 (BO Wallet, MetaMask, OKX, Rabby and others) and falls back to `window.ethereum`. It switches or adds BOT Chain (chain ID `0x2a5`, RPC `https://rpc.botchain.ai`) before any transaction, and simulates every call before asking for a signature.

### Rehearse on a mainnet fork

```bash
anvil --fork-url https://rpc.botchain.ai --port 8677 --chain-id 677
export BOT_RPC_URL=http://127.0.0.1:8677
node scripts/deploy.mjs && node scripts/fork-check.mjs
```

### Deploy

`scripts/deploy.mjs` reads the deployer key from `BOT_SIGNER_FILE` (default `~/.config/botchain-wave1/deployer.env`, never committed), refuses to broadcast on mainnet without `BOT_MAX_GAS_BOT`, and journals every transaction to `deployments/mainnet.json` so it can resume. `npm run publish` deploys the built site to Vercel as a static production deployment.

## License

MIT. Built on [BOT Chain](https://www.botchain.ai/).
