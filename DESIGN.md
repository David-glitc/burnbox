# Design systems

Six products share one HTML structure and one app runtime, but each has its own brand. The structure lives in `web/base.css`; every color, font, radius, border and shadow comes from the product's theme in `web/themes/<slug>/`:

- `theme.css`: font import, tokens, and the product's signature rules
- `logo.svg`: the mark (header and favicon)
- `hero.svg`: the landing illustration

`scripts/build.mjs` compiles each site's `style.css` as theme fonts, then `base.css`, then the theme's rules. Never put a raw color in `base.css`; add or reuse a token.

## Tokens every theme defines

| Token | Role |
|---|---|
| `--scheme` | `light` or `dark` (also picks the BOT Chain logo variant) |
| `--bg`, `--surface`, `--surface-2`, `--input-bg`, `--tile` | Page, cards, inset surfaces, form fields, game tiles |
| `--ink`, `--ink-2` | Primary and secondary text |
| `--line`, `--line-strong` | Dividers; form and control borders (≥ 3:1 on bg) |
| `--accent`, `--accent-hover`, `--accent-ink` | Brand color, its hover, and text on it |
| `--accent-text`, `--link` | Accent and link colors that pass 4.5:1 as text on bg |
| `--focus` | Focus ring (≥ 3:1 on bg and surface) |
| `--danger`, `--danger-bg`, `--danger-text` | Error border, error background, error text |
| `--scrim` | Dialog backdrop |
| `--radius-sm/md/lg/btn/pill`, `--border-w` | Shape |
| `--shadow-1`, `--shadow-2`, `--shadow-btn` | Elevation |
| `--font-display/body/label/mono` | Type families |
| `--display-weight`, `--display-tracking`, `--display-case`, `--label-tracking` | Display and label treatment |

## The six identities

All six are dark (web3 register, per the owner's direction). Each keeps its own hue family, type and shape so they stay distinct.

| Product | Scene | Palette | Type | Shape and signature |
|---|---|---|---|---|
| **Hedgerow** | A DAO treasury after dark; holders read baskets like a factsheet | Forest night `#09110D`, emerald `#7FD69A`, champagne `#E8C66B` | Fraunces / Public Sans / IBM Plex Mono | 2–8px radii, ruled factsheet steps, italic champagne numerals, dot texture |
| **Switchyard** | A trader swaps at night between other tabs | Steel `#0C0E10`, signal amber `#F2A93B`, cyan lamp `#5FD3E6` | Barlow Condensed (caps) / Barlow / JetBrains Mono | Square, hazard strip, amber ticker band, rail-grid texture, departure-board steps |
| **Lodestake** | A player grabs a round on a lunch break | Amethyst rock `#120E19`, gold ore `#F4BE48`, mint `#7DE0C3` | Bungee / Rubik / Space Mono | 8–18px radii, 2px borders, beveled glowing tiles, two-scale dot texture |
| **Showproof** | A night-out photo wall; proof snapped in a group chat | Ink `#110D14`, coral `#FF6A4D`, cobalt `#93A9FF` | Bricolage Grotesque / Figtree / DM Mono | Pill buttons with coral sticker shadow, paper polaroid steps, art-left hero |
| **Stepsale** | A launch at midnight; a founder sets careful terms | Navy `#070B1C`, electric blue `#5B7CFF`, mint `#3DDC97` | Sora / Manrope / IBM Plex Mono | 8–18px radii, rising timeline steps, fine grid texture |
| **Tradelock** | An after-hours deal desk; collectors want to see the lock | Carbon `#0C0C0A`, bone `#F4F2E8`, acid lime `#C5F23A` | Unbounded / Work Sans / JetBrains Mono | Zero radius, 2px bone borders, lime offset shadows, lime heading markers and ticker |

## Wave 2 identities

Built with `BOT_WAVE=2` (see `scripts/products/wave2.mjs`); same rules and token set.

| Product | Scene | Palette | Type | Shape and signature |
|---|---|---|---|---|
| **Tipjar** | A streamer's tip alert pops at 2 a.m. | Plum night `#150A12`, hot pink `#FF5FA2`, peach `#FFB27A` | Fredoka / Nunito Sans / Fira Code | 12–28px radii, bubbly cards, alert-toast steps with a pink edge and peach coin numerals, pink-dot feature markers |
| **Splitter** | A band settles up after the gig | Graphite green `#0A1110`, teal `#2DD4BF`, paper white `#F2EFE6` | Space Grotesk / Inter / Roboto Mono | 3–6px radii, ruled-ledger texture, steps joined into one ledger row with a 50/30/20 split bar, tabular numerals |
| **Vestvault** | A founder checks the unlock schedule | Slate `#0D0E14`, lavender `#B4A2FF`, brushed silver `#C9D2E3` | Instrument Serif / IBM Plex Sans / Red Hat Mono | 4–10px radii, concentric vault-dial texture, cliff-then-unlock line over the steps, quiet serif headlines |
| **Tickpay** (was Streampay) | A freelancer watches pay tick up by the second | Deep ocean `#060B16`, aqua `#3EE0F5`, violet `#8B7CFF` | Syne / DM Sans / Martian Mono | 10–26px radii, pill buttons, wave texture, a current line joining the steps, aqua/violet top-edged feature cards |
| **Pollbox** | A community call where everyone votes | Civic midnight `#0A0F1A`, sky `#6CB8FF`, cream ballot `#F5F1E6`, stamp gold `#F5D58A` | Archivo Black (caps) / Archivo / Courier Prime | 2–8px radii, 2px borders, cream ballot-slip steps with stamped check boxes, double-rule features, dashed CTA band |
| **Redpacket** | A giveaway dropped in the group chat | Lacquer `#130708`, packet red `#C8322A`, gold foil `#F2C14E` | Alfa Slab One / Noto Sans / Noto Sans Mono | 6–14px radii, red envelope-card steps with a flap and gold seal numerals, gold hairlines, coin-ring texture |

## Wave 3 identities

Built with `BOT_WAVE=3` (see `scripts/products/wave3.mjs`); same rules and token set. Wave 3 app components live in each theme's own rules (not `base.css`), so wave 1 and 2 builds stay byte-identical. Shared app helpers (token metadata, BDEX routes and quotes, countdowns) are in `web/w3kit.js`.

| Product | Scene | Palette | Type | Shape and signature |
|---|---|---|---|---|
| **Burnbox** | A foundry floor at night; holders feed a furnace and watch the counter climb | Charcoal `#0E0A09`, ember `#FF6B2C`, molten yellow `#FFC24B` | Big Shoulders Display (caps) / Instrument Sans / Azeret Mono | 4–12px radii, molten-edged grate steps, furnace cards with an animated flame sized by fuel, mechanical burn odometer, fuel and price-ceiling gauges |
| **Farmstand** | A night market of seed packets | Loam `#0F1411`, sprout `#7CDB6A`, packet paper `#F3EBD3`, wheat `#F0C75E`, terracotta | Young Serif / Karla / Overpass Mono | 6–18px radii, paper seed-packet steps and pool cards with a hanger hole, a 12-slot furrow whose sprouts grow with the season, per-second harvest counter |
| **Otcboard** | An after-hours OTC pit; deals chalked on slate and torn off as tickets | Slate `#0D1316`, chalk `#EEF1EA`, bid green `#57E39B`, ask pink `#FF95BD` | Oswald (caps) / Albert Sans / Fragment Mono | 3–10px radii, perforated tickets with notched stubs, fill slider with live cost, pair filter and depth ladder |
| **Holdrop** | A supply drop at night; parachutes float coins to every holder | Deep sky `#0A0D1C`, lemon canopy `#FFE066`, sky blue `#8FB8FF`, coral | Gabarito / Lexend / Sometype Mono | 8–24px radii, pill buttons, scalloped canopy tops on steps, numbered wizard, distribution bar, drifting parachute claim card |
| **Mintline** | Opening night at a small gallery | Gallery black `#0E0E11`, cream mat `#EDE7DA`, mint `#5CF2B8`, riso violet `#AB9DFF` | DM Serif Display / Schibsted Grotesk / Spline Sans Mono | 2–6px radii, black frames with cream mats and a spotlight, museum placards, quantity stepper; on-chain art previewed by a JS copy of the contract's `art()` (checked byte for byte) |
| **Hillking** | An arcade cabinet at midnight | Midnight violet `#0B0820`, coin yellow `#FFD400`, pixel purple `#BC94FF`, turf `#4BE07A` | Press Start 2P (caps) / Chivo / VT323 | Zero radius, 3px borders, hard pixel shadows, a pixel hill scene with the king's flag and earlier kings' pennants, segment clock that blinks red in the last minute |

## Hero tokens

`--hero-bg` (glow mesh), `--hero-pattern`, `--hero-pattern-size`, `--hero-pattern-opacity` (texture, masked to the hero centre), `--chip-bg`, `--live`, `--live-ring` (status chip), `--art-glow` (blur behind the hero art), `--ticker-bg` (scrolling band). The same mesh sits softly behind the app page header.

**Recorded override:** the UI guidelines list glow meshes as a generic default. They are used here deliberately at the owner's request for a web3 aesthetic, kept to the hero and app header, with all text on solid dark surfaces so contrast is verifiable.

## Rules

- Text pairs pass WCAG AA (4.5:1); borders, focus and state indicators pass 3:1. Check new colors with the contrast checker before shipping.
- Tradelock edges that must read are bone (`--ink`); lime marks state and emphasis.
- Theme layout overrides that change the hero grid must be wrapped in `@media(min-width:861px)` so the shared phone layout still applies.
- No emoji as icons and no gradient text. Glow is limited to the hero, app header, hero art and primary game buttons; body sections stay solid.
- Light themes use `web/botchain-dark.svg`; dark themes use `web/botchain.svg` (all six are currently dark).
- `prefers-reduced-motion` disables transitions, the ticker, the floating hero art, the status pulse and the Showproof card tilt.
