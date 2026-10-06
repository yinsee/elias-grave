// Level 1, "Pier 9" (docs/levels/01-pier9.md): a playable vertical slice.
// The plan's 3600 px strip is folded into the engine's 2800 x 320 world, so the boss arena sits where the tutorial's club is
// (x 2436-2800): quay 0-1150, container yard 1150-1780, crane and reefer truck 1780-2100, the fish market front 2100-2414,
// the market hall (boss arena) 2436-2800.
//
// The module holds data and art only. The game (src/legacy.js) calls:
//   PIER9.paint(api)          once: the static world layer (stat), the props mask and the level's lists (surfaces, lamps, doors...)
//   PIER9.drawSky(R)          per frame, outdoors: dawn sky, far fog, ships and cranes, harbour water
//   PIER9.drawHall(R)         per frame, indoors: the hall wall behind the stat props
//   PIER9.drawHallFloor(R)    per frame, indoors: the floor band
//   PIER9.drawHallProps(R, g) per frame, indoors: the conveyor, its tuna, the red lamp (g: the gimmick state)
//   PIER9.drawFront(R, s)     per frame, outdoors: the market shutter (s: 0 shut .. 1 open)
//   PIER9.drawFxTop(R)        per frame, after the light pass: the drum fire, lamp glints
// R: { buf, CW, cam, plot, plotV, line1, blendPlot, t (sim time), W, H, GROUND, rainK, C }

import { C } from '../core/color.js';
import { rng } from '../core/rng.js';

const GROUND = 280, hy = h => GROUND - h;

// ---- the level's data ----
export const HALL_X = 2436;
export const CRATE_U = 57;   // one container is 2.6 m tall
export const STACKS = [   // container stacks: [x0, x1, units, colours bottom-up, spawn door x or null]
  [1180, 1312, 1, ['rust'], 1291],
  [1330, 1462, 2, ['blue', 'rust'], 1351],
  [1490, 1622, 3, ['green', 'ochre', 'blue'], null],
  [1640, 1772, 2, ['grey', 'rust'], 1661],
];
export const TRAILER = { x0: 1882, x1: 2038, y: hy(62) };
export const LAMPS = [120, 470, 840, 1120, 1840, 2090];
export const DRUM_X = 420;
export const WARE = { x0: 600, x1: 1120, top: hy(128), doors: [700, 980] };
export const MARKET = { x0: 2100, x1: 2414, top: hy(160), door: 2160, shutter: [2352, 2410] };
export const HALL_DOORS = [2496, 2726];   // the crew doors in the hall's back wall
export const HALL_LAMPS = [2490, 2610, 2730];
export const ICE = [[2540, 2590], [2680, 2730]];
export const CONVEYOR_Y = hy(170);         // the rail
export const TUNA = { top: hy(78), bottom: hy(34) };
export const HOOK_COVER = [[2553, 2577, hy(27)], [2612, 2648, hy(32)]];   // hall props tall enough to stop Marchetti's hook (the 3-high fish crates, the podium): [x0, x1, top]   // a hanging tuna in the swing lane: crouch top (y 252) passes under 246

export const SALT_LOOKS = {   // Saltmen outfits (src/sim/enemies/roster.js LOOK format, plus hat / boots / apron)
  oilskin: { build: 'tall', top: 'coat', hair: ['souwester'], beards: ['full', 'stubble', 'stache', 'chin'], cols: [['#d8b02a', '#a8841c'], ['#cfa024', '#9c7618']], pants: ['#2e3038'], boots: '#17171c', hat: '#e0b828' },
  waders: { build: 'stocky', top: 'jacket', hair: ['cap'], beards: ['full', 'stubble', 'chin'], cols: [['#5a6268', '#444a50'], ['#4e5a52', '#3a443e']], pants: ['#4a5236'], boots: '#202418' },
  apron: { build: 'lean', top: 'vest', hair: ['souwester', 'short'], beards: ['stubble', 'goatee', 'stache'], cols: [['#d8d4c8', '#aaa69a']], pants: ['#c8a02a'], boots: '#17171c', hat: '#d0a824' },
  jersey: { build: 'lean', top: 'jacket', hair: ['cap'], beards: ['full', 'stubble', 'chin'], cols: [['#2a3450', '#1e2640']], pants: ['#3e3e4e'], boots: '#17171c' },
  storeman: { build: 'tall', top: 'coat', hair: ['short'], beards: ['stache', 'goatee'], cols: [['#6a4a2e', '#4e3622']], pants: ['#30303c'] },
  marchetti: { build: 'buff', top: 'tank', hair: ['bald'], beards: ['stubble'], cols: [['#d4ccb4', '#aaa28c']], pants: ['#24242c'], boots: '#141418', apron: '#bdb8aa', neck: true },
};
// variant -> base role (src/sim/enemies/roster.js ROLE) and look; `R` overrides the role's weapon data
export const SALTMEN = {
  deckhand: { role: 'brawler', look: 'oilskin' },
  pipeman: { role: 'pipe', look: 'waders' },
  filleter: { role: 'knife', look: 'apron' },
  gaffer: { role: 'machete', look: 'oilskin', R: { w: 'gaff', len: 12, reach: 25 } },
  hookthrower: { role: 'thrower', look: 'jersey' },
  tallyman: { role: 'pistol', look: 'storeman' },
};
// waves: trigger x, spawn sources, the roster by difficulty (E, M, H, W); `then` follows when half of this wave is down
export const WAVES = [
  { id: 'w1', at: 280, from: [{ kind: 'door', x: 700 }, { kind: 'door', x: 980 }, { kind: 'fog', x: 1 }],
    roster: [['deckhand', 'filleter', 'deckhand', 'pipeman'], ['deckhand', 'filleter', 'pipeman', 'deckhand', 'pipeman', 'gaffer'],
      ['deckhand', 'filleter', 'pipeman', 'deckhand', 'pipeman', 'gaffer', 'filleter'], ['deckhand', 'filleter', 'pipeman', 'deckhand', 'pipeman', 'gaffer', 'filleter', 'gaffer']] },
  { id: 'w2', at: 1150, from: [{ kind: 'cdoor', x: 1291 }, { kind: 'cdoor', x: 1351 }, { kind: 'cdoor', x: 1661 }],
    roster: [['deckhand', 'pipeman'], ['deckhand', 'pipeman', 'gaffer'], ['gaffer', 'pipeman', 'deckhand'], ['gaffer', 'pipeman', 'deckhand', 'gaffer']],
    then: 'w2b' },
  { id: 'w2b', perch: true, from: [{ kind: 'top', x: 1556, y: hy(171) }, { kind: 'top', x: 1720, y: hy(114) }, { kind: 'cdoor', x: 1661 }],
    roster: [['hookthrower'], ['hookthrower', 'tallyman'], ['hookthrower', 'tallyman', 'filleter'], ['hookthrower', 'tallyman', 'filleter']] },
  { id: 'w3', at: 1860, from: [{ kind: 'cdoor', x: 1892 }, { kind: 'door', x: 2160 }, { kind: 'fog', x: 1 }],
    roster: [['filleter', 'gaffer', 'deckhand'], ['filleter', 'gaffer', 'deckhand', 'hookthrower'], ['filleter', 'gaffer', 'deckhand', 'hookthrower', 'pipeman'],
      ['filleter', 'gaffer', 'deckhand', 'hookthrower', 'pipeman', 'gaffer']] },
];
// Sal "the Scale" Marchetti (docs/levels/01-pier9.md 5): stats per difficulty, his moves' numbers
// (tells scale in the game by t / A^0.25; times in s, speeds in px/s; arrays are by difficulty E, M, H, W)
export const MARCHETTI = {
  name: 'Sal "the Scale" Marchetti', title: 'Tenor of the Choir · Pier 9', look: 'marchetti',
  hp: [800, 1050, 1250, 1450], s: 1.3, m: 7, speed: 24, reach: 25, dmg: 16, heavyDmg: 28, poise: 34, windup: 0.4, cd: [0.8, 1.5],
  R: { w: 'cleaver', len: 9, off: -1.1, reach: 25 },
  combos: [['chop'], ['chop', 'chop'], ['jab', 'chop'], ['chop', 'hchop']],
  // the hook: mash = presses to break free of the pull
  hook: { windup: 0.65, fogWindup: 0.8, range: [120, 150, 160, 175], v: 330, pull: 280, cd: [5, 8], mash: [3, 4, 5, 6] },
  // the shoulder charge: knock-down, unblockable; a wall or a loose prop stuns him (stun s); on the ice he slides on 0.4 s more
  shoulder: { windup: 0.7, v: 190, maxT: 1.1, dmg: 22, stun: 1.6, cd: [6, 9] },
  // phase 2: a tuna off the rail (swing up close, lob from range); the ice smash (a quake, a new patch w px wide for life s, max by difficulty)
  tunaBat: { windup: 0.6, swing: 24, throw: 20, back: 35, swingRec: 0.8, throwRec: 0.5, cd: [5, 8] },
  ice: { windup: 0.55, dmg: 10, hitDmg: 18, w: 40, life: 12, max: [1, 2, 2, 3], rec: 0.7, cd: [8, 12] },
  ph2: { below: 0.65, speed: 26, cd: [0.6, 1.2], windup: 0.36, line: "Market's closing, Sandman! Everything must go!" },
  ph3: { below: 0.35, speed: 28, cd: [0.7, 1.3], line: "Let's see how a story keeps on ice." },
  lever: { walk: 70, pull: 0.8 },
  // the freezer fog (phase 3): density in the cold half (x >= split) by difficulty, half of it in the warm half; the clear bubble round
  // the hero; fill s; he goes back to the lever `back` s after the hero clears it
  fog: { dense: [0.6, 0.85, 0.9, 0.95], warm: 0.6, split: 2640, bubble: [90, 60, 50, 40], fill: 6, clear: 2, back: 4,
    barks: ['Cold, Grave?', 'I can hear you breathe.', 'Nobody sleeps in my freezer.'] },
  tuna: { warn: 1.0, v: 210, dmg: [8, 14, 18, 24], every: [6, 9], bossDmg: 40 },
  // his crew: none in phase 1; phase 2 at most `alive`, one per `every` s; phase 3 none (Wicked: two filleters at its start)
  crew: { ph2: { every: 6, alive: [1, 2, 2, 2] }, max: [3, 5, 6, 8], ph3Wicked: ['filleter', 'filleter'],
    ph2Roles: ['gaffer', 'filleter', 'deckhand', 'pipeman'] },
};
export const LEVERS = { speed: 2738, freezer: 2748 };   // on the wall left of the freezer door: the conveyor's speed, the freezer fog

// ---- a 3 x 5 pixel font for painted signs ----
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100',
  G: '011100101101011', H: '101101111101101', I: '111010010010111', K: '101101110101101', L: '100100100100111', M: '101111111101101',
  N: '110101101101101', O: '010101101101010', P: '110101110100100', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', Y: '101101010010010', 9: '111101111001111', 1: '010110010010111',
  0: '111101101101111', 2: '110001010100111', 3: '110001010001110', 7: '111001010010010', ' ': '000000000000000', '-': '000000111000000', '.': '000000000000010',
};
function text(put, s, x, y, c, k = 1) {   // k: pixel scale
  for (const ch of s.toUpperCase()) {
    const g = FONT[ch] || FONT[' '];
    for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (g[r * 3 + q] === '1') for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) put(x + q * k + a, y + r * k + b, c);
    x += 4 * k;
  }
  return x;
}

// ---- the static layer ----
// api: { W, H, GROUND, C, PAL, PUDDLE, STREET, LAMP_GLASS, WIN_A, WIN_B, WIN_C, LAMP_IRON }
export function paint(api) {
  const { W, H, PAL, PUDDLE, STREET, LAMP_GLASS, WIN_A, WIN_B, LAMP_IRON } = api;
  const b = new Uint32Array(W * H), props = new Uint8Array(W * H);
  const put = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < W && y < H) b[y * W + x] = c; };
  const rect = (x0, y0, x1, y1, f) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = f(x, y); if (c) put(x, y, c); } };
  const r = rng(91);
  const O = PAL.out;
  const out = { lamps: LAMPS.slice(), winl: [], housewin: [], doors: [], cdoors: [], alleys: [], veh: [] };

  // the quay floor: a painted edge line, wet concrete slabs, two crane rails, puddles; under it the quay wall
  const edge = C('#8a8c90'), paint = C('#c8a830'), slab = [C('#5a5c62'), C('#55575d'), C('#505258')], joint = C('#34363c'), pud = C('#2a3448'),
    railC = C('#7a7e88'), railD = C('#3a3c42'), wall0 = C('#24262e'), wall1 = C('#2c2e36'), algae = C('#2a3a30');
  for (let x = 0; x < W; x++) {
    put(x, GROUND, x < HALL_X && (x >> 3) % 3 === 0 ? paint : edge);
    for (let y = GROUND + 1; y < H; y++) {
      const d = y - GROUND;
      if (d <= STREET) {
        const row = d < 5 ? 0 : d < 10 ? 1 : 2, sw = 36 + row * 6, off = row * 13;
        const j = (x + off) % sw === 0 || d === 5 || d === 10;
        const rail = d === 7 || d === 12;
        put(x, y, PUDDLE[d * W + x] ? pud : rail ? railC : d === 8 || d === 13 ? railD : j ? joint : slab[(Math.floor((x + off) / sw) * 5 + row) % 3]);
      } else put(x, y, y > H - 4 ? algae : ((x + (Math.floor(y / 5) % 2) * 7) % 14 === 0 || y % 5 === 0) ? wall0 : wall1);
    }
  }

  // ---- buildings (the wall layer) ----
  // the net loft: a two-storey corrugated warehouse with two big sliding doors and a lit office upstairs
  {
    const { x0, x1, top } = WARE, w0 = C('#56605c'), wr = C('#434c49'), wl = C('#68726e'), rust = C('#6a4a36'), roof = C('#33363c'), roofL = C('#44474e');
    rect(x0, top, x1, GROUND - 1, (x, y) => x === x0 || x === x1 ? O : (x - x0) % 4 === 0 ? wr : (x - x0) % 4 === 1 ? wl : (r() < 0.012 || ((x * 7) % 23 === 0 && y > top + 70 && y < top + 96)) ? rust : w0);
    for (let k = 0; k < 16; k++) { const inset = Math.round(k * (x1 - x0) / 2 / 16); for (let x = x0 - 3 + inset; x <= x1 + 3 - inset; x++) put(x, top - 1 - k, k === 15 || x === x0 - 3 + inset || x === x1 + 3 - inset ? O : k % 3 === 0 ? roofL : roof); }
    for (let x = x0; x <= x1; x++) { put(x, GROUND - 66, O); put(x, GROUND - 65, C('#3a3e44')); put(x, GROUND - 64, O); }   // the floor girder
    text(put, 'NET LOFT', x0 + 150, top + 6, C('#b8bcb4'), 2);
    text(put, 'PIER 9', x0 + 30, top + 8, C('#a83228'), 2);
    for (let wx = x0 + 30; wx < x1 - 30; wx += 64) {   // upstairs windows: steel frames, a few lit
      const lit = wx > x1 - 110 || r() < 0.35, c = lit ? (wx > x1 - 110 ? WIN_A : WIN_B) : C('#1d2028');
      rect(wx, GROUND - 106, wx + 22, GROUND - 84, (x, y) => x === wx || x === wx + 22 || y === GROUND - 106 || y === GROUND - 84 || (x - wx) % 8 === 0 || y === GROUND - 95 ? O : c);
      if (lit) out.housewin.push({ x0: wx + 1, x1: wx + 21, y0: GROUND - 105, y1: GROUND - 85, cx: wx + 11, who: r() < 0.7 ? 1 : 0, ph: r() * 6.3, delay: 0.8 + r() * 2, off: false, t: 0, wl: null, keep: r() < 0.4, peek: false });
    }
    for (const dx of WARE.doors) {   // big sliding doors on a top rail
      const d0 = dx - 18, d1 = dx + 18, dy0 = GROUND - 54, door = C('#5a3428'), doorD = C('#44261e');
      rect(d0 - 2, dy0 - 4, d1 + 40, dy0 - 3, () => C('#2a2c32'));
      rect(d0, dy0, d1, GROUND - 1, (x, y) => x === d0 || x === d1 || y === dy0 ? O : Math.abs((x - d0) - (y - dy0) * 36 / 54) < 1 || Math.abs((d1 - x) - (y - dy0) * 36 / 54) < 1 ? doorD : (x - d0) % 4 === 0 ? doorD : door);
      out.doors.push({ x: dx, x0: d0 + 1, x1: d1 - 1, y0: dy0 + 1 });
    }
    // a personnel door with a caged lantern, and the fire-axe trestle
    rect(836, GROUND - 40, 850, GROUND - 1, (x, y) => x === 836 || x === 850 || y === GROUND - 40 ? O : C('#3a3226'));
    rect(840, GROUND - 47, 846, GROUND - 42, (x, y) => x === 840 || x === 846 || y === GROUND - 47 ? O : LAMP_GLASS);
    out.winl.push([843, GROUND - 40, 20]);
    rect(1050, GROUND - 106, 1072, GROUND - 84, (x, y) => x === 1050 || x === 1072 || y === GROUND - 106 || y === GROUND - 84 ? O : WIN_A);
  }
  // the fish market front: weathered stucco, the painted sign, bunkhouse windows upstairs, an awning, the side door, the shutter
  {
    const { x0, x1, top } = MARKET, st = C('#8a8a80'), stD = C('#76766c'), stL = C('#9a9a90'), board = C('#1e3a32'), cream = C('#e8dcb8');
    rect(x0, top, x1, GROUND - 1, (x, y) => x === x0 || x === x1 ? O : y > GROUND - 9 ? (y === GROUND - 8 ? stL : stD) : ((x * 13 + y * 7) % 29 === 0 || (y - top) % 22 === 21) ? stD : st);
    for (let k = 0; k < 4; k++) for (let x = x0 - 3; x <= x1 + 3; x++) put(x, top - 1 - k, k === 3 ? O : k === 0 ? stD : stL);
    rect(x0 + 16, GROUND - 120, x1 - 16, GROUND - 100, (x, y) => x === x0 + 16 || x === x1 - 16 || y === GROUND - 120 || y === GROUND - 100 ? O : board);
    text(put, 'MARCHE DE LA MAREE', x0 + 24, GROUND - 116, cream, 2);
    text(put, 'PIER 9', x1 - 70, GROUND - 116, C('#d84a3a'), 2);
    for (let wx = x0 + 18; wx < x1 - 24; wx += 40) {
      const lit = r() < 0.7, c = lit ? (r() < 0.5 ? WIN_A : WIN_B) : C('#1d1c2a');
      rect(wx, GROUND - 152, wx + 16, GROUND - 128, (x, y) => x === wx || x === wx + 16 || y === GROUND - 152 || y === GROUND - 128 || x === wx + 8 || y === GROUND - 140 ? O : c);
      for (let x = wx - 1; x <= wx + 17; x++) put(x, GROUND - 127, stL);
      if (lit) out.housewin.push({ x0: wx + 1, x1: wx + 15, y0: GROUND - 151, y1: GROUND - 129, cx: wx + 8, who: r() < 0.7 ? 1 + Math.floor(r() * 3) : 0, ph: r() * 6.3, delay: 0.8 + r() * 2.2, off: false, t: 0, wl: null, keep: r() < 0.34, peek: false });
    }
    const aw = C('#5a5e66'), awD = C('#44484e');
    for (let k = 0; k < 6; k++) for (let x = x0 + 8 - k; x <= MARKET.shutter[0] - 8 + k; x++) put(x, GROUND - 64 + k, k === 5 ? O : (x >> 1) % 2 ? aw : awD);
    // the side door (crew), a chalkboard, the shutter's frame and the dark hall behind it
    const sd = MARKET.door;
    rect(sd - 10, GROUND - 46, sd + 10, GROUND - 1, (x, y) => Math.abs(x - sd) === 10 || y === GROUND - 46 ? O : (x + y) % 6 === 0 ? C('#2a2018') : C('#3a2c20'));
    out.doors.push({ x: sd, x0: sd - 9, x1: sd + 9, y0: GROUND - 45 });
    rect(2210, GROUND - 46, 2240, GROUND - 24, (x, y) => x === 2210 || x === 2240 || y === GROUND - 46 || y === GROUND - 24 ? C('#5a3a24') : C('#20262a'));
    text(put, 'BELL', 2213, GROUND - 43, C('#c0302a')); text(put, 'CLOSED', 2213, GROUND - 35, C('#c8c4b8'));
    const [s0, s1] = MARKET.shutter;
    rect(s0 - 3, GROUND - 60, s1 + 3, GROUND - 1, (x, y) => x < s0 || x > s1 || y < GROUND - 56 ? (x === s0 - 3 || x === s1 + 3 || y === GROUND - 60 ? O : C('#3a3c44')) : (y > GROUND - 16 ? C('#2a3036') : C('#14161c')));
    rect(s0 + 22, GROUND - 66, s0 + 36, GROUND - 62, (x, y) => y === GROUND - 66 || x === s0 + 22 || x === s0 + 36 ? O : C('#8a2018'));   // the hatch lamp (it glows red in the fx pass)
    rect(x1 + 1, top - 20, HALL_X - 1, GROUND - 1, (x, y) => (y % 4 === 0 || (x + (Math.floor(y / 4) % 2) * 4) % 8 === 0) ? C('#22242c') : C('#2e3038'));   // the hall's end wall
  }
  // ---- the hall interior props (stat, over the hall wall that drawHall paints) ----
  {
    const blue = C('#2a5a8a'), blueD = C('#1e4064'), ice = C('#cfe6f0');
    for (const [cx, n] of [[2565, 3], [2700, 2], [2452, 2]]) for (let k = 0; k < n; k++) {
      const y1 = GROUND - 1 - k * 9, y0 = y1 - 8;
      rect(cx - 12, y0, cx + 12, y1, (x, y) => x === cx - 12 || x === cx + 12 || y === y0 || y === y1 ? O : y === y0 + 1 ? ice : (x - cx) % 6 === 0 ? blueD : blue);
    }
    const wd = C('#6a4428'), wdD = C('#4a2e1a');   // the auctioneer's podium with a brass scale
    rect(2612, GROUND - 32, 2648, GROUND - 1, (x, y) => x === 2612 || x === 2648 || y === GROUND - 32 ? O : y === GROUND - 31 ? C('#8a5a34') : (x - 2612) % 9 === 0 ? wdD : wd);
    for (const [x, y] of [[2630, GROUND - 24], [2626, GROUND - 22], [2634, GROUND - 22], [2630, GROUND - 23], [2630, GROUND - 21], [2625, GROUND - 21], [2635, GROUND - 21]]) put(x, y, PAL.gold);
    rect(2756, GROUND - 58, 2798, GROUND - 1, (x, y) => x === 2756 || y === GROUND - 58 ? O : y > GROUND - 10 ? ice : (x - 2756) % 10 === 0 ? C('#7a848c') : C('#9aa4ac'));   // the freezer door
    text(put, 'FROID', 2765, GROUND - 50, C('#2a4a6a'));
    rect(2760, GROUND - 32, 2764, GROUND - 28, () => C('#b02020'));
    // the counter with the shotgun on it
    rect(2466, GROUND - 10, 2500, GROUND - 1, (x, y) => x === 2466 || x === 2500 || y === GROUND - 10 ? O : y === GROUND - 9 ? C('#c8ccd0') : C('#7a8088'));
  }
  const pre = b.slice();   // everything after this is a solid prop (blood sticks to it)

  // ---- props: containers, the crane, the reefer truck, lamps, bollards, the drum ----
  const CCOL = { rust: '#8a3a2a', blue: '#2a4a6a', green: '#3a5a3a', ochre: '#a07a2a', grey: '#5a5e66' };
  const LOGO = ['SALT', 'MARE', 'NORD', 'CHOIR'];
  STACKS.forEach(([x0, x1, n, cols, door], si) => {
    for (let u = 0; u < n; u++) {
      const y1 = GROUND - 1 - u * CRATE_U, y0 = y1 - CRATE_U + 1, base = C(CCOL[cols[u]]), hi = C(eshade(CCOL[cols[u]], 1.25)), lo = C(eshade(CCOL[cols[u]], 0.7));
      rect(x0, y0, x1, y1, (x, y) => {
        if (x === x0 || x === x1 || y === y0 || y === y1) return O;
        if (y < y0 + 3) return hi; if (y > y1 - 3) return lo;
        if (x < x0 + 4 || x > x1 - 4) return lo;
        const rib = (x - x0) % 6; return rib === 0 ? lo : rib === 1 ? hi : base;
      });
      if (u === 0 && door != null) {   // the doors: two leaves with lock bars, at the end the spawn uses
        const d0 = door - 19, d1 = door + 19;
        rect(d0, y0 + 4, d1, y1 - 4, (x, y) => x === d0 || x === d1 || x === door ? O : (x - d0) % 9 === 4 ? C('#b8bcc4') : (x - d0) % 3 === 0 ? lo : base);
        out.cdoors.push({ x: door, x0: d0 + 1, x1: d1 - 1, y0: y0 + 5, y1: y1 - 4, col: base });
      } else text(put, LOGO[(si + u) % LOGO.length], x0 + 40, y0 + 18, C('#d8d4c8'), 2);
      put(x0 + 2, y0 + 2, C('#c8ccd0')); put(x1 - 2, y0 + 2, C('#c8ccd0')); put(x0 + 2, y1 - 2, C('#c8ccd0')); put(x1 - 2, y1 - 2, C('#c8ccd0'));
    }
    out.veh.push([x0, x1]);
  });
  // the crane: a yellow lattice tower, the jib over the slip, a lit cab, a container hanging on its cables
  {
    const yel = C('#c8a030'), yelD = C('#8a6a1e'), tx0 = 1790, tx1 = 1808, ty = 44;
    for (let y = ty; y < GROUND; y++) { put(tx0, y, O); put(tx0 + 1, y, yel); put(tx1 - 1, y, yel); put(tx1, y, O); const k = (y - ty) % 18; put(tx0 + 1 + k, y, yelD); put(tx1 - 1 - k, y, yelD); }
    for (let x = 1700; x <= 2200; x++) { put(x, ty - 1, O); put(x, ty, yel); put(x, ty + 8, yel); put(x, ty + 9, O); const k = (x - 1700) % 16; if (k < 8) put(x, ty + 1 + k, yelD); else put(x, ty + 16 - k, yelD); }
    rect(1702, ty - 12, 1730, ty - 1, (x, y) => x === 1702 || x === 1730 || y === ty - 12 ? O : C('#6a6a70'));   // the counterweight
    rect(1810, ty + 10, 1836, ty + 30, (x, y) => x === 1810 || x === 1836 || y === ty + 10 || y === ty + 30 ? O : y < ty + 22 && x > 1813 && x < 1834 ? WIN_A : yel);
    const hx = 1890; for (let y = ty + 10; y < 124; y++) { put(hx - 20, y, C('#2a2a30')); put(hx + 20, y, C('#2a2a30')); }
    rect(hx - 40, 124, hx + 40, 166, (x, y) => x === hx - 40 || x === hx + 40 || y === 124 || y === 166 ? O : (x - hx) % 6 === 0 ? C('#5a2a22') : C('#7a3626'));
    text(put, 'CHOIR', hx - 19, 138, C('#d8d4c8'), 2);
    out.winl.push([1823, ty + 20, 0]);
  }
  // the reefer truck: a white insulated trailer (its roof is a ledge), the reefer unit, a red cab
  {
    const { x0, x1, y } = TRAILER, wh = C('#c8ccd0'), whD = C('#9aa0a6'), blue = C('#2a4a7a'), red = C('#8a2a2a');
    rect(x0, y, x1, GROUND - 13, (x, yy) => x === x0 || x === x1 || yy === y || yy === GROUND - 13 ? O : (x - x0) % 8 === 0 ? whD : yy === y + 1 ? C('#e0e4e8') : wh);
    text(put, 'FRIGO', x0 + 50, y + 16, blue, 3);
    rect(x0 + 1, y + 2, x0 + 20, GROUND - 14, (x, yy) => x === x0 + 10 || x === x0 + 20 ? O : (x - x0) % 5 === 2 && yy > y + 8 ? C('#8a8e96') : whD);   // the rear doors
    out.cdoors.push({ x: x0 + 10, x0: x0 + 1, x1: x0 + 19, y0: y + 3, y1: GROUND - 14, col: wh });
    rect(x1 - 8, y + 4, x1 + 2, y + 28, (x, yy) => x === x1 - 8 || x === x1 + 2 || yy === y + 4 || yy === y + 28 ? O : (yy - y) % 3 ? C('#4a4e56') : C('#2a2c32'));
    rect(x0, GROUND - 13, x1 - 30, GROUND - 10, () => C('#2a2a30'));
    rect(x1 + 4, GROUND - 52, x1 + 54, GROUND - 8, (x, yy) => x === x1 + 4 || x === x1 + 54 || yy === GROUND - 52 ? O : yy < GROUND - 34 && x > x1 + 34 ? C('#26304a') : yy === GROUND - 51 ? C('#b04040') : red);
    const wheel = (cx, rr) => { for (let yy = -rr - 1; yy <= rr + 1; yy++) for (let xx = -rr - 1; xx <= rr + 1; xx++) { const d = Math.hypot(xx, yy); if (d <= rr + 0.5) put(cx + xx, GROUND - rr - 1 + yy, d > rr - 0.7 ? O : d < rr * 0.42 ? C('#8a8c99') : C('#16151c')); } };
    wheel(x0 + 24, 7); wheel(x0 + 40, 7); wheel(x1 + 40, 7);
    put(x0 + 1, GROUND - 18, C('#c0302a')); put(x0 + 1, GROUND - 19, C('#c0302a')); put(x1 + 53, GROUND - 24, LAMP_GLASS);
    out.veh.push([x0, x1 + 54]);
  }
  // sodium street lamps: a tall steel pole, a cobra head with an amber lens
  for (const lx of LAMPS) {
    for (let y = GROUND - 82; y < GROUND; y++) { put(lx - 1, y, O); put(lx, y, LAMP_IRON); put(lx + 1, y, O); }
    for (let y = GROUND - 5; y < GROUND; y++) for (let x = lx - 2; x <= lx + 2; x++) put(x, y, Math.abs(x - lx) === 2 || y === GROUND - 5 ? O : LAMP_IRON);
    for (let x = lx; x <= lx + 12; x++) { put(x, GROUND - 84, O); put(x, GROUND - 83, LAMP_IRON); put(x, GROUND - 82, x > lx + 4 ? O : LAMP_IRON); }
    for (let x = lx + 4; x <= lx + 13; x++) { put(x, GROUND - 81, x === lx + 4 || x === lx + 13 ? O : WIN_A); put(x, GROUND - 80, O); }
  }
  // bollards and mooring chains along the open quay, fish crates by the market, the burning drum
  const bol = C('#2a2a32'), bolL = C('#4a4a56'), chain = C('#3a3a44');
  const bollards = [30, 220, 300, 560, 1150, 1850, 2060];
  for (const bx of bollards) rect(bx - 3, GROUND - 9, bx + 3, GROUND - 1, (x, y) => y === GROUND - 9 || Math.abs(x - bx) === 3 ? O : y === GROUND - 8 ? bolL : (y < GROUND - 6 && Math.abs(x - bx) < 3) ? bolL : bol);
  for (let i = 0; i + 1 < bollards.length; i++) {
    const a = bollards[i], c = bollards[i + 1]; if (c - a > 300) continue;
    for (let x = a + 3; x < c - 3; x++) { const t = (x - a) / (c - a); put(x, GROUND - 7 + Math.round(Math.sin(t * Math.PI) * 4), chain); }
  }
  {
    const dr = C('#6a3a22'), drD = C('#4a2818'), drL = C('#8a4e2e');
    rect(DRUM_X - 6, GROUND - 15, DRUM_X + 6, GROUND - 1, (x, y) => Math.abs(x - DRUM_X) === 6 || y === GROUND - 15 ? O : y === GROUND - 11 || y === GROUND - 5 ? drD : x < DRUM_X - 3 ? drL : (x * 7 + y * 3) % 11 === 0 ? C('#2a1a12') : dr);
  }
  // the weapon trestles (the pickups rest on them), the empty fire-axe case
  {
    for (const px_ of [880, 2252]) {
      for (const lx of [px_ - 6, px_ + 6]) for (let y = GROUND - 6; y < GROUND; y++) put(lx, y, PAL.woodD);
      for (let x = px_ - 9; x <= px_ + 9; x++) { put(x, GROUND - 7, O); put(x, GROUND - 6, PAL.plank); }
    }
    rect(872, GROUND - 40, 888, GROUND - 16, (x, y) => x === 872 || x === 888 || y === GROUND - 40 || y === GROUND - 16 ? C('#a01c1c') : C('#2a2e3a'));   // the empty red case on the wall
  }
  for (let i = 0; i < b.length; i++) if (b[i] !== pre[i]) props[i] = 1;
  return { b, props, bg: pre, ...out };
}
function eshade(hex, k) { const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0'); return '#' + f(n >> 16) + f(n >> 8 & 255) + f(n & 255); }

// ---- the platforms, props and pickups ----
export function surfaces() {
  const S = STACKS.map(([x0, x1, n]) => ({ x0, x1, y: GROUND - n * CRATE_U }));
  S.push({ x0: TRAILER.x0, x1: TRAILER.x1, y: TRAILER.y });
  return S;
}
export const OBJ_START = [
  ['crate', 140, GROUND], ['crate', 200, GROUND], ['bag', 236, GROUND], ['barrel', 330, GROUND], ['crate', 362, GROUND], ['bottle', 404, GROUND], ['bottle', 436, GROUND],
  ['barrel', 520, GROUND], ['crate', 610, GROUND], ['bin', 760, GROUND], ['crate', 1040, GROUND], ['stack', 1080, GROUND],
  ['barrel', 1400, GROUND - 2 * CRATE_U], ['barrel', 1440, GROUND - 2 * CRATE_U], ['can', 1560, GROUND - 3 * CRATE_U], ['can', 1580, GROUND - 3 * CRATE_U],
  ['crate', 1480, GROUND], ['bigcrate', 1630, GROUND], ['crate', 1860, GROUND], ['barrel', 2070, GROUND], ['crate', 2200, GROUND], ['bag', 2290, GROUND],
  ['crate', 2540, GROUND], ['barrel', 2600, GROUND], ['bottle', 2640, GROUND], ['bottle', 2660, GROUND], ['barrel', 2740, GROUND],
];
export const PICKUPS = [{ w: 2, x: 880 }, { w: 3, x: 2252 }];   // the fire axe in the net loft; a shotgun on a trestle under the market awning

// ---- per-frame drawing ----
const SKY = ['#1e2638', '#28324a', '#36425c', '#4e5a76', '#727c94', '#a49ca4', '#c4a898'];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
let skyC = null, farL = null;
function farLayer() {   // ships at anchor and harbour cranes in the fog: one strip, tiled with parallax
  const w = 900, h = 70, px = new Uint32Array(w * h), r = rng(17), body = C('#3e4658'), lit = C('#d8a050');
  const fill = (x0, y0, x1, y1) => { for (let y = Math.max(0, y0); y < Math.min(h, y1); y++) for (let x = Math.max(0, x0); x < Math.min(w, x1); x++) px[y * w + x] = body; };
  let x = 10;
  while (x < w - 80) {
    if (r() < 0.55) {   // a freighter: hull, deckhouse, a funnel, a few lit portholes
      const L = 60 + Math.floor(r() * 70); fill(x, h - 10, x + L, h); for (let k = 0; k < 6; k++) fill(x + k, h - 10 - k, x + L - k * 2, h - 10);
      fill(x + L - 26, h - 26, x + L - 8, h - 14); fill(x + L - 20, h - 34, x + L - 14, h - 26); fill(x + 10, h - 20, x + 13, h - 14);
      for (let k = 0; k < 4; k++) if (r() < 0.6) px[(h - 7) * w + x + 8 + k * 9] = lit;
      x += L + 20 + Math.floor(r() * 40);
    } else {   // a gantry crane
      fill(x, h - 50, x + 2, h); fill(x + 24, h - 50, x + 26, h); fill(x - 18, h - 52, x + 50, h - 48);
      for (let k = 0; k < 24; k++) px[(h - 48 + Math.floor(k * 46 / 24)) * w + x + k] = body;
      x += 70 + Math.floor(r() * 40);
    }
  }
  return { w, h, px };
}
export function drawSky(R) {
  const { buf, CW, cam } = R;
  if (!skyC) { skyC = SKY.map(C); farL = farLayer(); }
  const hz = Math.round((GROUND - 46 - cam.y) * 0.7 + cam.vh * 0.62 * 0.3);   // the horizon line (view y)
  for (let vy = 0; vy < cam.vh; vy++) {
    const row = vy * CW;
    if (vy >= hz) {   // harbour water: dark slate, with slow light bands and sleet rings
      const d = vy - hz, base = d < 2 ? C('#8a92a2') : C('#2a3646'), band = C('#3e4c5e'), glint = C('#7a8496');
      for (let vx = 0; vx < cam.vw; vx++) {
        const wx = vx + Math.round(cam.x * 0.5), s = Math.sin(wx * 0.09 + d * 1.7 + R.t * 0.8) + Math.sin(wx * 0.031 - R.t * 0.5);
        buf[row + vx] = d < 2 ? base : s > 1.55 ? glint : s > 0.9 && d % 2 ? band : base;
      }
      continue;
    }
    const t = clamp01(vy / Math.max(1, hz)) * (skyC.length - 1), i = Math.floor(t), th = (t - i) * 16, c0 = skyC[i], c1 = skyC[Math.min(i + 1, skyC.length - 1)], by = (vy & 3) * 4;
    for (let vx = 0; vx < cam.vw; vx++) buf[row + vx] = th > BAYER[by + ((vx + cam.x) & 3)] ? c1 : c0;
  }
  // the low dawn sun behind the fog: a pale disc, then the far ships and cranes
  const sx = Math.round(330 - cam.x * 0.04), sy = hz - 14, sun = C('#e8d0b8'), halo = C('#b8a8a4');
  for (let y = -10; y <= 10; y++) for (let x = -10; x <= 10; x++) { const d2 = x * x + y * y; if (sy + y >= hz) continue; if (d2 <= 30) R.plotV(sx + x, sy + y, sun); else if (d2 <= 90 && (x + y) & 1) R.plotV(sx + x, sy + y, halo); }
  const ox = Math.round(cam.x * 0.12), top = hz - farL.h + 1;
  for (let y = 0; y < farL.h; y++) { const vy = top + y; if (vy < 0 || vy >= cam.vh) continue; for (let vx = 0; vx < cam.vw; vx++) { const c = farL.px[y * farL.w + (vx + ox) % farL.w]; if (c) buf[vy * CW + vx] = c; } }
  // fog: a soft grey veil, densest at the horizon
  for (let vy = Math.max(0, hz - 40); vy < Math.min(cam.vh, hz + 12); vy++) {
    const k = vy < hz ? 1 - (hz - vy) / 40 : 1 - (vy - hz) / 12, a = 0.45 * k * k, row = vy * CW;
    for (let vx = 0; vx < cam.vw; vx++) { const c = buf[row + vx]; buf[row + vx] = mixc(c, 0x9a, 0xa2, 0xb0, a); }
  }
}
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
function mixc(c, r, g, b, a) { return (255 << 24 | Math.round((c >> 16 & 255) * (1 - a) + b * a) << 16 | Math.round((c >> 8 & 255) * (1 - a) + g * a) << 8 | Math.round((c & 255) * (1 - a) + r * a)) >>> 0; }

// the hall: tiled lower wall, grey painted brick, roof trusses, the conveyor rail, the clock stopped at 3:17, crew doors, lamps
let HC = null;
export function drawHall(R) {
  const { buf, CW, cam, plot, line1 } = R;
  if (!HC) HC = { voidC: C('#101218'), truss: C('#2a2e36'), brick: C('#5c626a'), brick2: C('#545a62'), mortar: C('#464b53'), tile: C('#c4c8cc'), tile2: C('#bcc0c6'), grout: C('#8e949a'), dirt: C('#9aa0a4'), stripe: C('#8a2a2a'), beam: C('#6a7078'), beamL: C('#9aa0a8') };
  const ceil = GROUND - 184;
  for (let vy = 0; vy < cam.vh; vy++) {
    const wy = vy + cam.y, row = vy * CW;
    for (let vx = 0; vx < cam.vw; vx++) {
      const wx = vx + cam.x, lx = wx - HALL_X;
      let c;
      if (wy < ceil) { const ty = wy - (ceil - 30); c = ty >= 0 && (ty === 0 || ty === 29 || Math.abs(((lx % 48) + 48) % 48 - 24) === Math.round(ty * 24 / 29)) ? HC.truss : HC.voidC; }
      else if (wy < GROUND - 44) c = (wy - ceil) % 5 === 0 || (lx + (Math.floor((wy - ceil) / 5) % 2) * 5) % 10 === 0 ? HC.mortar : (lx * 7 + wy) % 13 ? HC.brick : HC.brick2;
      else if (wy < GROUND - 42) c = HC.stripe;
      else c = (wy - (GROUND - 42)) % 6 === 0 || lx % 7 === 0 ? HC.grout : wy > GROUND - 7 ? HC.dirt : (lx >> 3) % 3 ? HC.tile : HC.tile2;
      buf[row + vx] = c;
    }
  }
  for (let x = HALL_X; x < 2800; x++) { plot(x, CONVEYOR_Y - 2, HC.beamL); plot(x, CONVEYOR_Y - 1, HC.beam); plot(x, CONVEYOR_Y, HC.beam); plot(x, CONVEYOR_Y + 1, 0xff1b1226); }
  for (let x = HALL_X + 20; x < 2800; x += 60) line1(x, ceil, x, CONVEYOR_Y - 3, HC.truss);
  for (const dx of HALL_DOORS) {   // crew doors: dark openings with a strip curtain
    for (let y = GROUND - 50; y < GROUND; y++) for (let x = dx - 7; x <= dx + 7; x++) plot(x, y, Math.abs(x - dx) === 7 || y === GROUND - 50 ? HC.truss : (x - dx + 7) % 3 === 0 ? 0xff5a6a72 : 0xff0c0a08);
  }
  // the Bell & Sons clock, stopped at 3:17 (red-tinted: a Choir sign)
  const cx = 2620, cy = GROUND - 140;
  for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++) { const d = Math.hypot(x, y); if (d <= 9.4) plot(cx + x, cy + y, d > 8.4 ? 0xff2a2ab0 : d > 7.6 ? 0xff1b1226 : 0xffd0dce8); }
  line1(cx, cy, cx + 5, cy + 1, 0xff1b1226); line1(cx, cy, cx + 6, cy + 5, 0xff1b1226);
  for (const lx of HALL_LAMPS) {   // enamel shades on long cords
    line1(lx, ceil, lx, GROUND - 124, HC.truss);
    for (let k = 0; k < 5; k++) for (let x = lx - 2 - k; x <= lx + 2 + k; x++) plot(x, GROUND - 124 + k, k === 4 ? 0xff1b1226 : 0xff4a5a2a);
  }
}
export function drawHallFloor(R, more = null) {   // more: Marchetti's smashed-in ice patches ({ x0, x1, t } each)
  const { buf, CW, cam } = R, t = R.t;
  for (let d = 0; d <= 14; d++) {
    const vy = GROUND + d - cam.y; if (vy < 0 || vy >= cam.vh) continue;
    const row = vy * CW;
    for (let vx = 0; vx < cam.vw; vx++) {
      const wx = vx + cam.x;
      if (d === 0) { buf[row + vx] = 0xffa8a09a; continue; }
      const iceZ = d >= 2 && d <= 12 && (ICE.some(([a, b]) => wx >= a && wx <= b) || (more && more.some(z => wx >= z.x0 + (d & 1) && wx <= z.x1 - (d & 1) && (z.t > 1.5 || (wx + d) % 3))));   // (a patch thins out as it melts)
      if (iceZ) { const s = ((wx + d * 3 - Math.floor(t * 6)) % 23 + 23) % 23; buf[row + vx] = s < 2 ? 0xfffff8f0 : (wx * 5 + d) % 7 === 0 ? 0xffe8dcc4 : 0xfff0e6cf; continue; }
      buf[row + vx] = (wx - HALL_X) % 30 === 0 || d === 7 ? 0xff463e3a : (wx * 3 + d * 5) % 17 === 0 ? 0xff6a625c : 0xff68605a;
    }
  }
}
// the conveyor's tuna. g: { ph, t, hz } from the game: ph = boss phase (0 = no fight), hz = the swing hazard ({ st, x, dir, a } or null)
function tunaAt(plot, x, top, len, a, hi) {   // a frozen tuna hanging nose down from its tail: silver-blue back, pale belly, frost
  const back = 0xff8a6a4a, side = 0xffa8988a, belly = 0xffd8d0c8, frost = 0xfff8f4ee, O = 0xff1b1226;
  for (let dy = 0; dy <= len; dy++) {
    const k = dy / len, w = dy < 5 ? 1 + dy * 0.3 : 6 * Math.sin(Math.PI * Math.min(1, (k - 0.08) / 0.92)) + 1, cx = x + Math.sin(a) * dy;
    for (let dx = -Math.ceil(w); dx <= Math.ceil(w); dx++) {
      const e = Math.abs(dx) > w - 1;
      plot(Math.round(cx + dx), top + Math.round(dy * Math.cos(a)), e ? O : dx < -w * 0.3 ? back : dx > w * 0.4 ? belly : (dx * 7 + dy * 3) % 13 === 0 ? frost : side);
    }
    if (dy < 4) { plot(Math.round(cx - 3 + dy), top + dy, O); plot(Math.round(cx + 3 - dy), top + dy, O); }   // the tail fork
  }
  if (hi) plot(Math.round(x + Math.sin(a) * len * 0.5) - 2, top + Math.round(len * 0.5), 0xffffffff);
}
// a frozen tuna seen from the side, in its own frame: u along the body (0 = the tail fork, len = the nose), v across (back < 0 < belly).
// Its pixel colour, or 0 outside. (The held, lobbed and dropped tuna: the game rotates into this frame.)
export function tunaPx(u, v, len) {
  if (u < 0 || u > len) return 0;
  const k = u / len, w = u < 4 ? 3.2 - u * 0.6 : 3.6 * Math.sin(Math.PI * Math.min(1, (k - 0.08) / 0.92)) + 0.6;
  if (u < 4 && Math.abs(Math.abs(v) - (3.2 - u * 0.6)) < 0.9) return 0xff1b1226;   // the tail fork
  if (Math.abs(v) > w + 0.6) return 0;
  if (Math.abs(v) > w - 0.4) return 0xff1b1226;
  if (u > len - 3 && Math.abs(v + 0.8) < 0.6) return 0xffffffff;   // the eye
  return v < -w * 0.3 ? 0xff8a6a4a : v > w * 0.4 ? 0xffd8d0c8 : ((u * 7 + v * 3) | 0) % 13 === 0 ? 0xfff8f4ee : 0xffa8988a;
}
export function drawTunaAt(R, cx, cy, ang, len = 22) {   // a tuna centred at (cx, cy), its nose toward ang
  const ca = Math.cos(ang), sa = Math.sin(ang), r = Math.ceil(len / 2 + 5);
  for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, c = tunaPx(dx * ca + dy * sa + len / 2, -dx * sa + dy * ca, len);
    if (c) R.plot(x, y, c);
  }
}
// the levers on the wall by the freezer door: a steel box, a red handle; k = how far it is pulled (0 up .. 1 down)
export function drawLever(R, x, k, lit) {
  const { plot, line1 } = R, y0 = GROUND - 36;
  for (let y = y0; y < y0 + 10; y++) for (let xx = x - 3; xx <= x + 3; xx++) plot(xx, y, xx === x - 3 || xx === x + 3 || y === y0 || y === y0 + 9 ? 0xff1b1226 : 0xff6a7078);
  const a = -1.1 + 2.2 * k, hx = x + Math.sin(a) * 9, hy = y0 + 4 - Math.cos(a) * 9;
  line1(x, y0 + 4, hx, hy, 0xff9aa0a8);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) plot(Math.round(hx) + dx, Math.round(hy) + dy, lit ? 0xff4040ff : 0xff2020b0);
}
// the freezer fog: d(x) = its density over world column x; a clear bubble round the hero (hx, hy, rad).
// dither: opaque pixels in an ordered pattern instead of see-through ones (the 3D view's layers are cut-outs)
export function drawFog(R, d, hx, hy, rad, dither = false) {
  const { cam } = R, t = R.t, y0 = Math.max(cam.y, GROUND - 150), y1 = Math.min(cam.y + cam.vh - 1, GROUND + 14);
  for (let vx = 0; vx < cam.vw; vx++) {
    const wx = vx + cam.x, dd = d(wx); if (dd <= 0.02) continue;
    for (let wy = y0; wy <= y1; wy++) {
      const h = clamp01((GROUND + 14 - wy) / 164), low = 1 - 0.5 * h, wisp = 0.85 + 0.15 * Math.sin(wx * 0.07 + t * 0.6 + wy * 0.11) * Math.sin(wx * 0.023 - t * 0.4);
      const b = Math.hypot(wx - hx, (wy - hy) * 1.4), clear = clamp01((b - rad * 0.6) / (rad * 0.5));
      const a = dd * low * wisp * clear * 0.85;
      if (a <= 0.03) continue;
      if (!dither) R.blendPlot(wx, wy, 196, 212, 222, Math.min(0.92, a));
      else if (a * 0.55 > (BAYER[(wy & 3) * 4 + (wx & 3)] + 0.5) / 16) R.plot(wx, wy, (wx + wy) & 1 ? 0xffded4c4 : 0xffe8e0d4);
    }
  }
}
export function drawHallProps(R, g) {
  const { plot, line1 } = R, t = R.t;
  if (g.lev) { drawLever(R, LEVERS.speed, g.lev.speed, g.lev.hot === 'speed'); drawLever(R, LEVERS.freezer, g.lev.freezer, g.lev.hot === 'freezer'); }
  // the conveyor's loaded hooks run along the rail; raised high in phase 1, lowered for the swing once he pulls the speed lever
  const sp = g.ph >= 2 ? 30 : 16, low = g.ph >= 2;
  for (let i = 0; i < 4; i++) {
    const x = HALL_X + ((i * 95 + t * sp) % 380) - 10, chain = low ? 52 : 26;
    if (x < HALL_X + 4 || x > 2796) continue;
    if (g.hz && g.hz.st === 'swing' && Math.abs(x - g.hz.x) < 30) continue;
    line1(x, CONVEYOR_Y + 2, x, CONVEYOR_Y + chain, 0xff4a4a52);
    tunaAt(plot, x, CONVEYOR_Y + chain, 40, Math.sin(t * 1.3 + i) * (low ? 0.08 : 0.03), false);
  }
  // the red warning lamp over the hatch: blinks while a swing is coming
  const warn = g.hz && g.hz.st === 'warn' && Math.floor(t * 8) % 2 === 0;
  for (let y = GROUND - 180; y < GROUND - 174; y++) for (let x = 2449; x < 2456; x++) plot(x, y, x === 2449 || x === 2455 || y === GROUND - 180 ? 0xff1b1226 : warn ? 0xff313bff : 0xff201a60);
}
// the hazard tuna (drawn in front of the fighters) and its telegraph on the floor
export function drawTunaHazard(R, hz) {
  if (!hz || hz.st === 'idle') return;
  const { plot, line1 } = R, t = R.t;
  if (hz.st === 'warn') {   // a red dashed band along the swing path, blinking
    if (Math.floor(t * 10) % 2) for (let x = HALL_X + 6; x < 2794; x += 6) { plot(x, GROUND - 1, 0xff313bff); plot(x + 1, GROUND - 1, 0xff313bff); plot(x, GROUND - 2, 0xff2020b0); }
    const ex = hz.dir > 0 ? HALL_X + 12 : 2788;
    for (let y = 0; y < 5; y++) plot(ex, GROUND - 200 + y, 0xff313bff); plot(ex, GROUND - 193, 0xff313bff);
    return;
  }
  const pivotY = TUNA.top - 6;
  line1(hz.x - Math.sin(hz.a) * 40, CONVEYOR_Y, hz.x, pivotY, 0xff4a4a52);
  tunaAt(plot, hz.x, pivotY, TUNA.bottom - pivotY, hz.a, true);
  for (let x = hz.x - 8; x <= hz.x + 8; x++) R.blendPlot(Math.round(x), GROUND, 0, 0, 0, 0.35);   // its shadow
}
// the market shutter from outside (s: 0 shut, 1 fully open)
export function drawFront(R, s) {
  const { plot } = R, [s0, s1] = MARKET.shutter, h = 56, open = Math.round(h * s);
  for (let y = GROUND - h; y < GROUND - open; y++) for (let x = s0; x <= s1; x++) plot(x, y, (y - (GROUND - h)) % 3 === 0 ? 0xff4e4a46 : y === GROUND - open - 1 ? 0xff1b1226 : 0xff76706a);
}
// over the lit scene: the fire in the drum, the hatch lamp, the crane cab's beacon
export function drawFxTop(R, hallOpen) {
  const { plot, cam } = R, t = R.t;
  if (DRUM_X > cam.x - 20 && DRUM_X < cam.x + cam.vw + 20) {
    const cols = [0xff60d0ff, 0xff2088ff, 0xff1040e0];
    for (let i = 0; i < 26; i++) {
      const ph = (i * 0.137 + t * 2.3) % 1, x = DRUM_X - 5 + ((i * 7) % 11) + Math.round(Math.sin(t * 9 + i) * 1.2), y = GROUND - 16 - Math.round(ph * (10 + (i % 4) * 2));
      plot(x, y, cols[Math.min(2, Math.floor(ph * 3))]);
    }
    for (let i = 0; i < 5; i++) { const ph = (i * 0.21 + t * 0.4) % 1; R.blendPlot(DRUM_X - 2 + Math.round(Math.sin(t + i) * 3 + ph * 4), GROUND - 30 - Math.round(ph * 30), 60, 60, 66, 0.35 * (1 - ph)); }
  }
  if (Math.floor(t * 1.2) % 2) plot(1823, 52, 0xff3030ff);   // the crane's red beacon
  const lamp = hallOpen ? 0xff40d060 : 0xff3030e0;            // the hatch lamp: red, green once open
  for (let x = MARKET.shutter[0] + 23; x < MARKET.shutter[0] + 36; x++) for (let y = GROUND - 65; y < GROUND - 62; y++) plot(x, y, lamp);
}
