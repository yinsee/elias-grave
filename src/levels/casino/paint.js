// Level 3, "House Always Wins": the art. Every pixel is painted in code (like Line Zero).
//   paint(api)            once: the static world layer (stat), the props mask, the puddle mask
//   drawWorld(R, S, G)    per frame, on the wall behind the fighters: doors, cases, card tables, chandeliers, mirrors (with the
//                         reflections of who stands before them), pillars, the cashier glass, the alarm, the dealer, the salon
//   drawFloor(R, S)       per frame, the roulette wheel's floor (2D: after the wall; 3D: the club's floor layer)
//   drawGround(R, S, G)   per frame, floor tells: the called pockets, card-rain marks, the real Count's shadow, falling shadows
//   drawFx(R, S)          per frame, over the lit scene (unlit): fire on the range, the flare, crystal, the ball, sparks
// R: { plot, line1, blendPlot, cam, t } (world coordinates); S: the level's run state (src/levels/casino/run.js)
import { C } from '../../core/color.js';
import { text } from '../metro/paint.js';
import * as D from './data.js';

const GROUND = D.GROUND, H = 320, STREET = 14;
const shade = (c, k) => { const f = v => Math.max(0, Math.min(255, Math.round(v * k))); return (255 << 24 | f(c >> 16 & 255) << 16 | f(c >> 8 & 255) << 8 | f(c & 255)) >>> 0; };
const mix = (a, b, k) => { const m = sh => Math.round((a >> sh & 255) * (1 - k) + (b >> sh & 255) * k); return (0xff000000 | m(16) << 16 | m(8) << 8 | m(0)) >>> 0; };
const noise2 = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; };

// colours shared by the static layer and the dynamic painters
export const CC = {
  out: C('#1b1226'), black: C('#0c0b10'),
  velvet: C('#6a1420'), velvetD: C('#521018'), velvetL: C('#7e1c28'), damask: C('#5a1220'),
  gold: C('#d8b04a'), goldD: C('#9a7428'), goldL: C('#f4dc8a'), brass: C('#b8903a'),
  wood: C('#4a2a1a'), woodD: C('#341c10'), woodL: C('#6a4026'),
  felt: C('#1e6a3a'), feltD: C('#145030'), feltL: C('#2a8a4c'),
  cream: C('#e8dcb8'), white: C('#f2eee4'),
  tile: C('#dcdcd4'), tileD: C('#c4c4bc'), grout: C('#9a9a94'), steel: C('#8a8e98'), steelD: C('#5a5e66'), steelL: C('#b8bcc6'),
  stone: C('#6a6a72'), stoneD: C('#4e4e56'), stoneL: C('#86868e'),
  sky0: C('#0a0c1a'), sky1: C('#1a1e34'), river: C('#0e1a2a'), riverL: C('#1e2e44'),
  conc: C('#3e4a42'), concD: C('#2e3832'), concL: C('#56645a'), cage: C('#6a7068'),
  marble: C('#d6d0c4'), marbleD: C('#b4ac9e'), marbleV: C('#9a9284'), black2: C('#16141a'),
  mirror: C('#9aa6b8'), mirrorD: C('#6a7688'), mirrorL: C('#cad4e2'), frame: C('#b8903a'),
  red: C('#b0202a'), redL: C('#e04048'), blk: C('#141218'), green: C('#1a8a4a'),
  neonR: C('#ff4a5a'), neonG: C('#ffd060'), neonC: C('#60e0ff'),
  glass: C('#3a5068'), glassL: C('#8ab0c8'),
};

// ---- the static layer ----
// api: { W, H, GROUND, PAL, LAMP_GLASS, WIN_A, WIN_B, WIN_C }
export function paint(api) {
  const { W } = api;
  const b = new Uint32Array(W * H), props = new Uint8Array(W * H), pud = new Uint8Array((STREET + 1) * W);
  const put = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < W && y < H) b[y * W + x] = c; };
  const rect = (x0, y0, x1, y1, f) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = f(x, y); if (c) put(x, y, c); } };
  const O = CC.out;
  const out = { winl: [] };

  // ---- the back wall, section by section ----
  for (let x = 0; x < W; x++) for (let y = 0; y < GROUND; y++) {
    let c;
    if (x < 740) {   // the gaming floor: red velvet with a damask diamond, a gold cornice, a dark wood wainscot
      const dx = (x % 16) - 8, dy = (y % 20) - 10;
      c = Math.abs(dx) / 8 + Math.abs(dy) / 10 < 0.5 ? CC.damask : (x + y) % 9 === 0 ? CC.velvetD : CC.velvet;
      if (y < 22) c = y < 8 ? CC.black2 : y % 4 === 0 ? CC.goldD : CC.gold;
      else if (y < 26) c = CC.woodD;
      if (y > GROUND - 30) c = y === GROUND - 30 ? CC.goldD : (x % 24 === 0 ? CC.woodD : (y > GROUND - 4 ? CC.woodD : CC.wood));
    } else if (x < 1100) {   // the kitchens: white tiles, a grey band, steel at the bottom
      const row = Math.floor(y / 6), tx = (x + (row % 2) * 5) % 10;
      c = y % 6 === 5 || tx === 0 ? CC.grout : (row * 5 + Math.floor((x + (row % 2) * 5) / 10)) % 9 === 0 ? CC.tileD : CC.tile;
      if (y < 40) c = shade(CC.tileD, 0.6 + 0.4 * y / 40);
      if (y > GROUND - 24) c = y === GROUND - 24 ? CC.steelD : CC.steel;
      if (noise2(x >> 1, y >> 1) < 0.03 && y > 120) c = shade(c, 0.85);
    } else if (x < 1300) {   // the river terrace: night sky, the far bank, the river, the stone balustrade
      if (x < 1110) { c = (y % 8 === 0) ? CC.velvetD : CC.velvet; if (y > GROUND - 30) c = CC.woodD; }   // the casino's side wall (the kitchen door)
      else if (x >= 1290) { c = (y % 10 === 0 || x === 1290) ? CC.stoneD : CC.stone; }                       // the stone pier with the service door
      else if (y < 150) c = mix(CC.sky0, CC.sky1, y / 150);
      else if (y < 222) {   // the far bank: low buildings, lit windows, neon
        const bx = Math.floor((x - 1110) / 18), top = 170 + Math.round(noise2(bx, 3) * 30);
        c = y < top ? mix(CC.sky0, CC.sky1, y / 150) : (y > top + 4 && (x % 6 < 2) && (y % 7 < 2) && noise2(x >> 1, y) < 0.4 ? api.WIN_B : C('#14141e'));
      } else if (y < 262) {   // the river: dark water, neon smeared on it
        c = (y % 3 === 0 && noise2(x >> 2, y) < 0.35) ? CC.riverL : CC.river;
        if (Math.abs(x - 1170) < 6 && (y + (x >> 1)) % 4 < 2) c = shade(CC.neonR, 0.7); if (Math.abs(x - 1236) < 5 && (y + (x >> 1)) % 4 < 2) c = shade(CC.neonG, 0.7);
      } else { c = (x % 14 < 2 || y === 262) ? CC.stoneD : y < 266 ? CC.stoneL : CC.stone; if (y > 266 && x % 14 > 3 && x % 14 < 11 && y < 278) c = C('#2a2a32'); }   // balusters
    } else if (x < 1760) {   // the counting house: green-painted concrete, a darker band
      c = (x - 1300) % 40 === 0 || y % 30 === 0 ? CC.concD : noise2(x >> 1, y >> 1) < 0.05 ? CC.concD : CC.conc;
      if (y < 40) c = shade(c, 0.5 + 0.5 * y / 40);
      if (y > GROUND - 30) c = y === GROUND - 30 ? CC.concL : C('#2a3430');
    } else if (x < 2140) {   // the mirrored lobby: cream marble with veins, gold pilasters
      c = noise2(x >> 2, y >> 1) < 0.08 || ((x * 3 + y * 7) % 61 === 0) ? CC.marbleV : (y % 32 === 0 ? CC.marbleD : CC.marble);
      if (y < 30) c = y % 5 === 0 ? CC.goldD : CC.gold;
      if (y > GROUND - 20) c = y === GROUND - 20 ? CC.goldD : CC.marbleD;
    } else if (x < 2436) {   // the hall of mirrors: black and white marble panels
      const pnl = Math.floor((x - 2140) / 16) % 2;
      c = pnl ? CC.black2 : C('#2a2830'); if (noise2(x >> 1, y >> 2) < 0.06) c = C('#3a3840');
      if (y < 30) c = y % 5 === 0 ? CC.goldD : CC.black2;
      if (y > GROUND - 20) c = y === GROUND - 20 ? CC.goldD : C('#1e1c22');
      if (x > D.END_WALL - 2) c = C('#08080a');
    } else {   // the roulette salon: red lacquer and black, a gold frieze
      const pnl = Math.floor((x - 2436) / 28) % 2;
      c = pnl ? C('#5a0e14') : C('#1a0e12'); if ((x - 2436) % 28 === 0) c = CC.goldD;
      if (y < 34) c = y % 6 === 0 ? CC.goldD : CC.black2;
      if (y > GROUND - 22) c = y === GROUND - 22 ? CC.gold : C('#120a0e');
    }
    b[y * W + x] = c;
  }
  // the gaming floor's tall arched windows (rain and river neon drawn live over them)
  for (const ax of [56, 236, 416, 596]) {
    for (let y = 34; y < 150; y++) for (let x = ax - 22; x <= ax + 22; x++) {
      const top = 56 - Math.round(Math.sqrt(Math.max(0, 22 * 22 - (x - ax) ** 2)));
      if (y < top) continue;
      const edge = y === top || Math.abs(x - ax) >= 21 || y === 149, mull = x === ax || y === 100;
      put(x, y, edge ? CC.goldD : mull ? CC.woodD : mix(C('#141a30'), C('#24203a'), (y - 34) / 116));
    }
    out.winl.push([ax, 96, 30]);
  }
  // the lobby's arched niches between mirrors are drawn live (mirrors); the hall's clock: Bell & Sons, stopped at 3:17 (red rim: a Choir sign)
  { const { x: cx, y: cy } = D.CLOCK;
    rect(cx - 9, cy - 9, cx + 9, cy + 22, (x, y) => x === cx - 9 || x === cx + 9 || y === cy + 22 ? O : y > cy + 8 ? CC.woodD : 0);
    for (let yy = -8; yy <= 8; yy++) for (let xx = -8; xx <= 8; xx++) { const d = Math.hypot(xx, yy); if (d <= 8.4) put(cx + xx, cy + yy, d > 7.2 ? C('#b02a2a') : d > 6.4 ? CC.gold : C('#e4ead0')); }
    for (let k = 0; k <= 4; k++) put(cx + Math.round(k * 0.35), cy - k, O);   // the hour hand: past 3 ... (17 past: the minute hand)
    for (let k = 0; k <= 6; k++) put(cx + Math.round(k * 0.95), cy + Math.round(k * 0.35), O);
    for (let k = 0; k < 3; k++) put(cx + k - 1, cy + 14, CC.goldL);   // the pendulum, still
    text(put, 'BELL', cx - 7, cy + 16, CC.gold); }
  // signs
  text(put, 'ORFEO', 270, 176, CC.goldL, 2);
  text(put, 'CAISSE', CAGE_X() + 4, 186, CC.goldL);
  text(put, 'CUISINE', 744, 160, CC.steelD);
  text(put, 'SERVICE', 1300, 150, CC.cream);
  text(put, 'SALLE DES COMPTES', 1534, 120, CC.cream);
  text(put, 'SALON PRIVE', 1880, 40, CC.black2, 1);
  text(put, 'ROULETTE', 2580, 46, CC.goldL);
  // the far bank's neon (static) and the rain on the windows is live
  text(put, 'BAR', 1160, 176, CC.neonR); text(put, 'HOTEL', 1220, 182, CC.neonG);
  // the roulette salon: a ring of bulb sockets (lit live), the balconies' doors
  for (const B of D.BALCONIES) rect(B.x0 + 6, B.y - 34, B.x1 - 6, B.y - 1, (x, y) => x === B.x0 + 6 || x === B.x1 - 6 || y === B.y - 34 ? CC.gold : (x + y) % 9 === 0 ? C('#2a1418') : C('#3a1a20'));

  const pre = b.slice();   // everything after this is a solid prop (blood sticks to it; the 3D view makes blocks of it)

  // ---- props ----
  // the bar: dark wood with a brass rail; a mirror of bottles behind it
  rect(D.BAR.x0, D.BAR.y, D.BAR.x1, GROUND - 1, (x, y) => x === D.BAR.x0 || x === D.BAR.x1 || y === D.BAR.y ? O : y === D.BAR.y + 1 ? CC.brass : y > GROUND - 6 ? CC.woodD : (x - D.BAR.x0) % 20 === 0 ? CC.woodD : CC.wood);
  for (let x = D.BAR.x0 + 4; x < D.BAR.x1 - 4; x += 5) for (let y = 206; y < 216; y++) put(x, y, y < 209 ? C('#2a5a3a') : (x % 3 ? C('#3a7a4a') : C('#8a6a2a')));   // bottles on the back shelf
  for (let x = D.BAR.x0 + 2; x < D.BAR.x1 - 2; x++) put(x, 217, CC.woodD);
  // the mezzanine: a dark slab, a gold rail, posts
  { const { x0, x1, y } = D.MEZZ;
    rect(x0, y, x1, y + 9, (x, yy) => yy === y ? CC.goldL : yy === y + 9 || x === x1 || x === x0 ? O : yy < y + 3 ? CC.gold : CC.woodD);
    for (let x = x0; x <= x1; x++) put(x, y - 9, CC.gold);
    for (let x = x0; x <= x1; x += 12) for (let yy = y - 8; yy < y; yy++) put(x, yy, CC.goldD);
    for (const px of [x0 + 20, x1 - 20]) for (let yy = y + 10; yy < GROUND; yy++) { put(px, yy, CC.gold); put(px + 1, yy, CC.goldD); put(px + 2, yy, O); } }
  // roulette tables (the back of the fight lane): green felt, a little wheel, wood legs
  for (const tx of D.ROULETTE_T) {
    rect(tx - 20, GROUND - 24, tx + 20, GROUND - 20, (x, y) => y === GROUND - 24 ? CC.feltL : x === tx - 20 || x === tx + 20 || y === GROUND - 20 ? CC.woodD : CC.felt);
    for (let yy = -3; yy <= 0; yy++) for (let xx = -5; xx <= 5; xx++) if (xx * xx / 25 + yy * yy / 4 <= 1) put(tx + 10 + xx, GROUND - 25 + yy, (xx + 5) % 2 ? CC.red : CC.blk);
    for (const lx of [tx - 16, tx + 16]) for (let y = GROUND - 19; y < GROUND; y++) put(lx, y, CC.woodD);
  }
  // the craps table (the dive pad): a deep tub of green felt in a wood rail; the dealer's drawer at its near end
  { const { x0, x1, y } = D.CRAPS;
    rect(x0, y, x1, GROUND - 1, (x, yy) => x === x0 || x === x1 || yy === y ? O : yy === y + 1 ? CC.woodL : yy < y + 4 ? CC.wood : yy > GROUND - 4 ? CC.woodD : (x - x0) % 16 === 0 ? CC.woodD : CC.wood);
    for (let x = x0 + 3; x < x1 - 3; x++) put(x, y + 2, CC.felt); text(put, 'CRAPS', x0 + 30, y + 7, CC.goldL); }
  // the slot row on the back wall: four machines, their screens lit live
  for (let sx = D.SLOTS.x0; sx < D.SLOTS.x1; sx += 23) rect(sx, D.SLOTS.y, sx + 20, GROUND - 1, (x, y) => x === sx || x === sx + 20 || y === D.SLOTS.y ? O : y < D.SLOTS.y + 4 ? CC.gold : y > D.SLOTS.y + 8 && y < D.SLOTS.y + 20 && x > sx + 3 && x < sx + 17 ? C('#101820') : y > GROUND - 8 ? CC.woodD : CC.red);
  // the cashier cage: brass bars over a counter
  { const { x0, x1 } = D.CAGE, x0b = Math.max(x0, D.SLOTS.x1 + 1);
    rect(x0b, 150, x1, GROUND - 1, (x, y) => y === 150 || y === 151 ? CC.gold : y > GROUND - 34 ? (y === GROUND - 34 ? CC.goldL : CC.woodD) : (x - x0b) % 5 === 0 ? CC.brass : 0); }
  // the kitchens: steel hoods, the pot rail with pots and ladles, counters, the pass shelf, the range
  for (const hx of D.HOODS) { rect(hx - 22, 70, hx + 22, 92, (x, y) => { const w = 22 - Math.round((92 - y) * 0.4); return Math.abs(x - hx) > w ? 0 : Math.abs(x - hx) === w || y === 92 ? O : y > 88 ? CC.steelL : CC.steel; }); for (let y = 30; y < 70; y++) { put(hx - 4, y, CC.steelD); put(hx + 4, y, CC.steelD); } }
  for (let x = 760; x < 1080; x++) put(x, 132, CC.steelD);
  for (let px = 772; px < 1080; px += 26) { for (let y = 133; y < 140; y++) put(px, y, CC.steelD); rect(px - 5, 140, px + 5, 148, (x, y) => y === 140 || Math.abs(x - px) === 5 ? O : (px % 52 === 0 ? C('#b06a3a') : CC.steelL)); }   // copper and steel pots
  for (const K of [D.COUNTER_A, D.COUNTER_B]) rect(K.x0, K.y, K.x1, GROUND - 1, (x, y) => x === K.x0 || x === K.x1 || y === K.y ? O : y === K.y + 1 ? CC.steelL : y > K.y + 8 && (x - K.x0) % 20 === 10 ? CC.steelD : y === K.y + 7 ? CC.steelD : CC.steel);
  { const { x0, x1, y } = D.PASS; for (let x = x0; x <= x1; x++) { put(x, y, CC.steelL); put(x, y + 1, CC.steel); put(x, y + 2, O); } for (const lx of [x0 + 4, x1 - 4]) for (let yy = y + 3; yy < y + 12; yy++) put(lx, yy, CC.steelD); }
  { const { x0, x1, top } = D.RANGE; rect(x0, top, x1, GROUND - 1, (x, y) => x === x0 || x === x1 || y === top ? O : y === top + 1 ? C('#2a2a30') : y > top + 5 && (x - x0) % 14 > 3 && (x - x0) % 14 < 10 ? C('#3a3a42') : C('#1a1a20')); }
  // the swinging doors (kitchen in and out): steel panels with round windows
  for (const dx of [744, 1094]) rect(dx - 5, GROUND - 44, dx + 5, GROUND - 1, (x, y) => Math.abs(x - dx) === 5 || y === GROUND - 44 ? O : Math.hypot(x - dx, y - (GROUND - 34)) < 3 ? CC.glassL : CC.steel);
  // the terrace: the awning (red and white stripes) on its iron frame, the café table, the wall lantern's bracket
  { const { x0, x1, y } = D.AWNING;
    for (let x = x0; x <= x1; x++) for (let yy = y; yy < y + 7; yy++) put(x, yy, yy === y ? O : yy === y + 6 ? ((x >> 2) % 2 ? CC.red : CC.white) : (Math.floor((x - x0) / 8) % 2 ? CC.red : CC.white));
    for (let x = x0; x <= x1; x += 6) put(x, y + 7, Math.floor((x - x0) / 8) % 2 ? CC.red : CC.white);
    for (const px of [x0 + 2, x1 - 2]) for (let yy = y + 7; yy < GROUND; yy++) put(px, yy, C('#2a2a30')); }
  rect(D.CAFE.x - 8, GROUND - 14, D.CAFE.x + 8, GROUND - 12, (x, y) => y === GROUND - 14 ? CC.white : C('#c8c4ba')); for (let y = GROUND - 11; y < GROUND; y++) put(D.CAFE.x, y, C('#2a2a30'));
  for (let y = 186; y < 192; y++) put(D.LANTERN_X - 4, y, C('#2a2a30'));
  // the service door in the stone pier (its lock is live)
  rect(D.SERVICE_DOOR - 8, GROUND - 46, D.SERVICE_DOOR + 1, GROUND - 1, (x, y) => x === D.SERVICE_DOOR - 8 || y === GROUND - 46 ? O : C('#3a3a42'));
  // the counting house: the guard post's locker, the cage of mesh, the catwalk, the booth's counter, the counting machines, the vault door
  { const { x0, x1, y } = D.GUARD_BOX; rect(x0, y, x1, GROUND - 1, (x, yy) => x === x0 || x === x1 || yy === y ? O : yy === y + 1 ? CC.steelL : (yy - y) % 8 === 4 ? CC.steelD : C('#4a5a50')); }
  for (let x = 1340; x <= 1436; x++) for (let y = 120; y < GROUND - 1; y++) if ((x + y) % 6 === 0 || (x - y + 600) % 6 === 0) { if (noise2(x, y) < 0.7) put(x, y, CC.cage); }   // the mesh cage behind (cash carts inside)
  for (const [cx, cy] of [[1356, GROUND - 16], [1392, GROUND - 16]]) rect(cx - 8, cy, cx + 8, cy + 10, (x, y) => x === cx - 8 || x === cx + 8 || y === cy ? O : (x + y) % 4 ? C('#3a6a3a') : C('#5a8a4a'));   // money bales in the cage
  { const { x0, x1, y } = D.CATWALK;
    for (let x = x0; x <= x1; x++) { put(x, y, CC.steelL); put(x, y + 1, CC.steel); put(x, y + 2, x % 4 === 0 ? O : CC.steelD); put(x, y + 3, O); }
    for (let x = x0; x <= x1 - 10; x++) put(x, y - 9, CC.steel); for (let x = x0; x <= x1 - 10; x += 16) for (let yy = y - 8; yy < y; yy++) put(x, yy, CC.steelD);
    for (let x = x1 - 8; x <= x1; x++) put(x, y, C('#d8b020')); }   // the hatch at its end (yellow edge)
  { const { x0, x1 } = D.BOOTH;   // the booth: a frame round the glass, a counter inside, a till
    for (let y = 150; y < GROUND; y++) { put(x0 - 1, y, O); put(x1, y, O); }
    for (let x = x0 - 1; x <= x1; x++) { put(x, 150, CC.steelD); put(x, 151, O); }
    rect(x0 + 34, GROUND - 22, x1 - 2, GROUND - 1, (x, y) => y === GROUND - 22 ? CC.woodL : x === x0 + 34 ? O : CC.wood);
    rect(x0 + 40, GROUND - 30, x0 + 52, GROUND - 23, (x, y) => y === GROUND - 30 || x === x0 + 40 || x === x0 + 52 ? O : C('#5a5e66')); }
  for (const mx of [1580, 1640]) rect(mx - 12, GROUND - 26, mx + 12, GROUND - 1, (x, y) => Math.abs(x - mx) === 12 || y === GROUND - 26 ? O : y < GROUND - 18 ? (y === GROUND - 22 ? C('#1a1a20') : C('#6a7a70')) : (x - mx + 12) % 6 === 0 ? CC.steelD : CC.steel);   // money-counting machines
  { const vx = D.VAULT_DOOR - 32, vy = GROUND - 40;   // the round vault door (its face is drawn live: it rolls open)
    for (let yy = -40; yy <= 40; yy++) for (let xx = -40; xx <= 40; xx++) { const d = Math.hypot(xx, yy); if (d <= 40 && vy + yy < GROUND && vx + xx < D.VAULT_DOOR + 8) put(vx + xx, vy + yy, d > 37 ? CC.steelD : d > 34 ? CC.steelL : 0); } }
  rect(D.LOCKER_X - 9, GROUND - 46, D.LOCKER_X + 9, GROUND - 1, (x, y) => Math.abs(x - D.LOCKER_X) === 9 || y === GROUND - 46 ? O : x === D.LOCKER_X ? CC.steelD : (y - GROUND + 46) % 6 === 2 && Math.abs(x - D.LOCKER_X) > 3 ? C('#2a3430') : C('#4a5a50'));
  // the lobby: the gallery slab and its gold rail, the grand stair (red carpet), a doorway at each end
  { const { x0, x1, y } = D.GALLERY;
    rect(x0, y, x1, y + 9, (x, yy) => yy === y ? CC.goldL : yy === y + 9 || x === x1 ? O : yy < y + 3 ? CC.gold : CC.marbleD);
    for (let x = x0; x <= x1; x++) put(x, y - 9, CC.gold); for (let x = x0; x <= x1; x += 10) for (let yy = y - 8; yy < y; yy++) put(x, yy, CC.goldD);
    for (const px of [x0 + 60, x1 - 4]) for (let yy = y + 10; yy < GROUND; yy++) { put(px, yy, CC.marbleD); put(px + 1, yy, CC.marbleV); put(px + 2, yy, O); } }
  { const S = D.STAIR;
    for (let i = 0; i < S.n; i++) { const x0 = S.x0 + i * S.step, ty = GROUND - (i + 1) * S.step; for (let x = x0; x <= x0 + S.step - 1; x++) { put(x, ty, CC.redL); put(x, ty + 1, CC.red); put(x, ty + 2, shade(CC.red, 0.7)); put(x, ty + 3, shade(CC.red, 0.6)); } for (let y = ty + 1; y < ty + S.step; y++) put(x0 + S.step - 1, y, shade(CC.red, 0.55)); }
    for (let x = S.x0; x < S.x0 + S.n * S.step; x++) { const i = Math.floor((x - S.x0) / S.step), ty = GROUND - (i + 1) * S.step; for (let y = ty + 4; y < GROUND; y++) put(x, y, y === ty + 4 ? CC.goldD : (x - S.x0) % 24 === 0 ? CC.goldD : y > GROUND - 3 ? C('#2a1014') : (x + y) % 13 === 0 ? C('#4a1218') : C('#3a0e14')); put(x, ty - 12, CC.gold); if ((x - S.x0) % 12 === 0) for (let y = ty - 11; y < ty; y++) put(x, y, CC.goldD); }   // the stair's marble flank under the treads, the banister and its balusters
  }
  for (const dx of [1766, 2130]) rect(dx - 7, GROUND - 52, dx + 7, GROUND - 1, (x, y) => Math.abs(x - dx) === 7 || y === GROUND - 52 ? CC.goldD : C('#2a1a14'));
  // the hall: the entry door frame; the salon: the hub and its spindle
  rect(2142, GROUND - 56, 2150, GROUND - 1, (x, y) => x === 2142 || y === GROUND - 56 ? CC.goldD : C('#1a1416'));
  { const { x0, x1, y } = D.HUB, cx = (x0 + x1) / 2;
    rect(x0, y, x1, GROUND - 1, (x, yy) => x === x0 || x === x1 || yy === y ? O : yy === y + 1 ? CC.goldL : yy < y + 5 ? CC.gold : (x - x0) % 10 === 5 ? CC.goldD : CC.wood);
    for (let yy = D.SALON_CHAND.anchor.y; yy < y; yy++) { put(cx - 1, yy, CC.goldD); put(cx, yy, CC.goldL); put(cx + 1, yy, CC.goldD); }   // the spindle
    for (const hx of [-12, 12]) for (let k = 0; k < 10; k++) put(cx + Math.sign(hx) * k, y - 22, CC.gold);   // its cross-handles
    rect(cx - 3, D.SALON_CHAND.anchor.y - 3, cx + 3, D.SALON_CHAND.anchor.y + 1, (x, yy) => Math.abs(x - cx) === 3 || yy === D.SALON_CHAND.anchor.y - 3 ? O : CC.goldL); }
  for (const B of D.BALCONIES) { for (let x = B.x0; x <= B.x1; x++) { put(x, B.y, CC.goldL); put(x, B.y + 1, CC.gold); put(x, B.y + 2, O); put(x, B.y - 8, CC.gold); } for (let x = B.x0; x <= B.x1; x += 6) for (let yy = B.y - 7; yy < B.y; yy++) put(x, yy, CC.goldD); for (let yy = B.y + 3; yy < B.y + 12; yy++) put((B.x0 + B.x1) >> 1, yy, CC.goldD); }

  // ---- the floor band ----
  for (let x = 0; x < W; x++) {
    const sec = x < 740 ? 0 : x < 1100 ? 1 : x < 1300 ? 2 : x < 1760 ? 3 : x < 2140 ? 4 : x < 2436 ? 5 : 6;
    for (let y = GROUND; y < H; y++) {
      const d = y - GROUND; let c;
      if (sec === 0) { const dx = (x % 12) - 6, dd = (d % 8) - 4; c = d === 0 ? CC.goldD : Math.abs(dx) + Math.abs(dd) * 1.5 < 3 ? CC.goldD : (x + d) % 11 === 0 ? CC.velvetD : C('#5a0e18'); }
      else if (sec === 1) c = d === 0 ? CC.steelD : ((Math.floor(x / 6) + Math.floor(d / 3)) % 2 ? C('#e0dcd0') : C('#2a2a30'));
      else if (sec === 2) { c = d === 0 ? CC.stoneL : (x % 18 === 0 || d % 6 === 0) ? CC.stoneD : CC.stone; if (d > 2 && d <= STREET && noise2(x >> 3, d >> 1) < 0.35) { pud[d * W + x] = 1; c = shade(c, 0.7); } }
      else if (sec === 3) c = d === 0 ? CC.concL : (x % 24 === 0 || d % 7 === 0) ? CC.concD : C('#46524a');
      else if (sec === 4) { const ck = (Math.floor(x / 10) + Math.floor(d / 5)) % 2; c = d === 0 ? CC.goldD : ck ? CC.marble : CC.marbleD; if ((x * 7 + d * 3) % 37 === 0) c = CC.marbleV; }
      else if (sec === 5) { const ck = (Math.floor(x / 8) + Math.floor(d / 4)) % 2; c = d === 0 ? C('#4a4850') : ck ? C('#e8e4dc') : C('#18161c'); }
      else c = d === 0 ? CC.gold : (d % 5 === 0 ? CC.woodD : (x + d * 3) % 17 === 0 ? CC.woodD : CC.wood);   // the salon's parquet round the wheel (the wheel is live)
      b[y * W + x] = c;
    }
  }
  for (let i = 0; i < b.length; i++) if (b[i] !== pre[i] && i < GROUND * W) props[i] = 1;
  return { b, props, bg: pre, pud, ...out };
}
const CAGE_X = () => D.CAGE.x0;

// ---- a little figure of plotted lines (the dealer on the terrace, the croupier at the wheel): head, body, arms, legs ----
export function figure(R, x0, y0, f, pose, col, k = 1.5) {   // pose: 'stand' | 'hands' (hands up) | 'run' | 'spin' (a hand out on the wheel); k: its scale
  const O = CC.out, t = R.t, x = 0, y = 0;
  const plot = (px, py, c) => { const X = Math.round(x0 + px * k), Y = Math.round(y0 + py * k); for (let a = 0; a < Math.ceil(k); a++) for (let b = 0; b < Math.ceil(k); b++) R.plot(X + a, Y - b, c); };
  const line1 = (ax, ay, bx, by, c) => { const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay))); for (let i = 0; i <= n; i++) plot(ax + (bx - ax) * i / n, ay + (by - ay) * i / n, c); };
  const leg = pose === 'run' ? Math.sin(t * 14) * 3 : 0;
  line1(x, y - 10, x - 1 - leg, y, col.pants); line1(x + 1, y - 10, x + 2 + leg, y, col.pants);
  for (let yy = y - 20; yy <= y - 10; yy++) { plot(x, yy, col.top); plot(x + 1, yy, col.top); plot(x - 1, yy, yy % 3 ? col.top : O); }
  if (col.vest) for (let yy = y - 19; yy <= y - 12; yy++) plot(x + f, yy, col.vest);
  if (pose === 'hands') { line1(x - 1, y - 18, x - 4, y - 26, col.top); line1(x + 1, y - 18, x + 4, y - 26, col.top); plot(x - 4, y - 27, col.skin); plot(x + 4, y - 27, col.skin); }
  else if (pose === 'spin') { line1(x, y - 18, x + f * 6, y - 14, col.top); plot(x + f * 7, y - 14, col.skin); }
  else { line1(x, y - 18, x + f * 2, y - 11 + (pose === 'run' ? leg : 0), col.top); plot(x + f * 2, y - 10, col.skin); }
  for (let yy = y - 25; yy <= y - 21; yy++) for (let xx = -2; xx <= 2; xx++) plot(x + xx, yy, Math.abs(xx) === 2 && yy < y - 23 ? col.hair : yy === y - 25 ? col.hair : col.skin);
  plot(x + f * 2, y - 23, O);
  if (col.bow) { plot(x - 1, y - 20, col.bow); plot(x + 1, y - 20, col.bow); plot(x, y - 20, col.bow); }
}
const DEALER = { top: C('#f0ece0'), vest: C('#a8242a'), pants: C('#1a1a20'), skin: C('#d8b08a'), hair: C('#3a2a1e'), bow: C('#101014') };
const CROUP = { top: C('#f0ece0'), vest: C('#1a1a20'), pants: C('#1a1a20'), skin: C('#c89a78'), hair: C('#1a1410'), bow: C('#a8242a') };

// ---- a reflection in a mirror: a ghost of a figure (joints J), seen at an angle, dimmed and cooled, clipped to the glass ----
function ghost(R, J, pal, m, off, k) {
  const { plot } = R, cx = J[2].x;
  const px = (x, y, c) => { const xx = Math.round(2 * cx - x + off), yy = Math.round(y); if (xx >= m.x0 + 1 && xx <= m.x1 - 1 && yy >= m.y0 + 1 && yy <= m.y1 - 1) plot(xx, yy, mix(CC.mirror, c, k)); };
  const seg = (a, b, c, w) => { const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y))); for (let i = 0; i <= n; i++) { const x = a.x + (b.x - a.x) * i / n, y = a.y + (b.y - a.y) * i / n; for (let dx = -w; dx <= w; dx++) px(x + dx, y, c); } };
  const [hd, nk, pl, eB, hB, eF, hF, kB, fB, kF, fF] = J;
  seg(pl, kB, pal.pants, 1); seg(kB, fB, pal.pants, 1); seg(pl, kF, pal.pants, 1); seg(kF, fF, pal.pants, 1);
  seg(nk, pl, pal.top, 2); seg(nk, eB, pal.top, 1); seg(eB, hB, pal.top, 0); seg(nk, eF, pal.top, 1); seg(eF, hF, pal.top, 0);
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (dx * dx + dy * dy <= 9) px(hd.x + dx, hd.y + dy, dy < -1 ? pal.hair : pal.skin);
}
const HERO_PAL = { top: C('#2a2a32'), pants: C('#22222a'), skin: C('#d8b08a'), hair: C('#2a1e18') };

// ---- a mirror pane: silver glass with a sheen, cracks, or a broken frame; the reflections of who stands before it ----
function drawMirror(R, m, S, G, frameC) {
  const { plot } = R, t = R.t, cam = R.cam;
  if (m.x1 < cam.x - 2 || m.x0 > cam.x + cam.vw + 2) return;
  const broken = m.hp <= 0, crack = m.hp < m.maxHp;
  for (let y = m.y0; y <= m.y1; y++) for (let x = m.x0; x <= m.x1; x++) {
    const edge = x === m.x0 || x === m.x1 || y === m.y0 || y === m.y1;
    if (edge) { plot(x, y, frameC); continue; }
    if (R.glass3d && !broken) continue;   // (3D: the silver, its reflections and cracks are a mirror pane, three.js)
    if (broken) { const sh = noise2(x, y) < 0.18 && y > m.y1 - 18 ? CC.mirrorD : (noise2(x >> 1, y >> 1) < 0.06 ? CC.mirrorD : C('#141418')); plot(x, y, sh); continue; }
    const band = ((x * 0.8 + y - cam.x * 0.3) % 30 + 30) % 30;
    let c = band < 2 ? CC.mirrorL : (y - m.y0) / (m.y1 - m.y0) > 0.75 ? CC.mirrorD : CC.mirror;
    if (m.ripple > 0 && Math.abs(((y - m.y0) - (1 - m.ripple / 0.6) * (m.y1 - m.y0))) < 3) c = C('#f0f6ff');
    plot(x, y, c);
  }
  if (broken || R.glass3d) return;
  // who stands before it: the hero and every goon (a decoy has no reflection: the real Count does)
  const off = Math.round(((m.x0 + m.x1) / 2 - (cam.x + cam.vw / 2)) * 0.08);
  const near = q => q > m.x0 - 22 && q < m.x1 + 22;
  if (G.hero.mode === 'anim' && near(G.P[2].x)) ghost(R, G.P, HERO_PAL, m, off, 0.55);
  for (const e of G.enemies) {
    if (e.dead || e.decoy || !e.J || !near(e.x)) continue;
    ghost(R, e.J, { top: e.pal.top, pants: e.pal.pants, skin: e.pal.skin, hair: e.pal.hair }, m, off, 0.55);
  }
  if (crack) mirrorCracks(R, m);
  void t;
}
export function mirrorCracks(R, m) {   // cracks: lines from a hit point (3D: on the mirror pane)
  const n = m.hp < m.maxHp * 0.5 ? 6 : 3, cx = (m.x0 + m.x1) >> 1, cy = m.y0 + ((m.y1 - m.y0) * 0.45 | 0);
  for (let k = 0; k < n; k++) { const a = k * 2.1 + m.x0, L = 6 + (k * 7) % 12; for (let i = 0; i < L; i++) R.plot(Math.round(cx + Math.cos(a) * i), Math.round(cy + Math.sin(a) * i * 1.4), C('#e8f0ff')); }
}
// the mirrors as the 3D view models them (three.js): every mirror pane in view, with its own box (the frame stays painted)
export function mirrorList(S, vis) {
  const out = [];
  for (const p of S.pillars) if (p.hp > 0 && vis(p.x - 8, p.x + 8)) out.push({ x0: p.x - D.PILLAR.w, x1: p.x + D.PILLAR.w, y0: GROUND - D.PILLAR.h, y1: GROUND - 1, hp: p.hp, maxHp: p.maxHp, ripple: 0, id: 'pl' + p.x });
  for (const sw of S.swivels) if (sw.hp > 0 && vis(sw.x - 10, sw.x + 10)) out.push({ x0: sw.x - 7, x1: sw.x + 7, y0: GROUND - 44, y1: GROUND - 11, hp: sw.hp, maxHp: sw.maxHp, ripple: S.ripple || 0, id: 'sw' + sw.x });
  for (const m of S.mirrors) if (m.hp > 0 && vis(m.x0, m.x1)) out.push({ ...m, id: m.id });
  return out;
}

// ---- a chandelier: tiers of crystal on a gold frame; or falling; or a heap of crystal on the floor ----
export function chandelier(R, c, big, chain = true) {   // (chain: false for the 3D model, whose chain is a rod)
  const { plot, line1 } = R, t = R.t, w = big ? 26 : 16, x = c.x, y = c.y;
  if (c.st === 'gone') {   // the wreck on the floor
    for (let k = -w; k <= w; k += 2) { plot(Math.round(x + k), GROUND - 1 - ((k * 7) & 1), k % 4 ? CC.mirrorL : CC.gold); if (k % 6 === 0) plot(Math.round(x + k), GROUND - 2, CC.goldD); }
    return;
  }
  if (chain && (c.st === 'hang' || c.st === 'warn')) line1(x, 30, x, y - 8, CC.goldD);   // the chain (it shakes in the warning)
  const sw = c.st === 'warn' ? Math.sin(t * 40) * 1.2 : Math.sin(t * 0.8 + x) * 0.5;
  const cx = x + sw;
  for (let tier = 0; tier < 3; tier++) {
    const ww = w - tier * (big ? 7 : 5), ty = y - 6 + tier * 6;
    for (let k = -ww; k <= ww; k++) { plot(Math.round(cx + k), Math.round(ty), CC.gold); if (k % 3 === 0) { plot(Math.round(cx + k), Math.round(ty + 1), CC.mirrorL); plot(Math.round(cx + k), Math.round(ty + 2), Math.floor(t * 3 + k) % 4 ? CC.mirrorL : C('#ffffff')); } }
  }
  for (let k = -2; k <= 2; k++) plot(Math.round(cx + k), Math.round(y + 12), CC.goldL);
}

export function drawTable(R, tb) {   // a flippable card table: upright (a round green top on a pedestal), flipped (the top faces one way: cover)
  const { plot } = R, t = R.t, O = CC.out, x = Math.round(tb.x);
  if (!tb.flipped) {
    for (let k = -10; k <= 10; k++) { plot(x + k, GROUND - 15, k === -10 || k === 10 ? O : CC.feltL); plot(x + k, GROUND - 14, CC.felt); plot(x + k, GROUND - 13, CC.woodD); }
    for (let y = GROUND - 12; y < GROUND; y++) { plot(x, y, CC.woodD); plot(x + 1, y, CC.wood); }
    for (let k = -4; k <= 4; k++) plot(x + k, GROUND - 1, CC.woodD);
    for (let k = 0; k < 3; k++) plot(x - 4 + k * 3, GROUND - 16, (k + Math.floor(t)) % 3 ? CC.cream : CC.red);   // cards and chips on it
  } else {
    const f = tb.side;   // the top faces this way (the cover is on the other side)
    for (let y = GROUND - 22; y < GROUND; y++) for (let k = 0; k < 4; k++) plot(x + f * k, y, k === 0 ? (y === GROUND - 22 ? O : CC.woodD) : k === 3 ? O : (tb.hp < 30 && (y * 3 + k) % 7 === 0 ? CC.woodD : CC.felt));
    for (let k = 1; k < 6; k++) plot(x - f * k, GROUND - 12 + (k >> 1), CC.woodD);   // the pedestal sticking out
  }
}

// ---- per frame, on the wall behind everyone (both views: in 3D on the wall layer) ----
export function drawWorld(R, S, G) {
  const { plot, line1, blendPlot } = R, t = R.t, O = CC.out, cam = R.cam;
  const vis = (x0, x1) => x1 > cam.x - 8 && x0 < cam.x + cam.vw + 8;
  // rain on the gaming floor's windows: streaks running down the dark glass, the river's neon blinking
  if (vis(0, 740)) for (const ax of [56, 236, 416, 596]) {
    if (!vis(ax - 22, ax + 22)) continue;
    for (let i = 0; i < 14; i++) { const x = ax - 19 + ((i * 11) % 38), y = 40 + ((t * 60 + i * 37) % 100); if (x !== ax) { plot(x, Math.round(y), C('#5a6a8a')); plot(x, Math.round(y) + 1, C('#3a4a6a')); } }
    const on = Math.floor(t * 1.5 + ax) % 5 !== 0;
    if (on) for (let k = -6; k <= 6; k++) plot(ax + k, 128, (ax / 180 | 0) % 2 ? CC.neonR : CC.neonG);
  }
  // slot screens flicker (cyan, amber)
  if (vis(D.SLOTS.x0, D.SLOTS.x1)) for (let sx = D.SLOTS.x0; sx < D.SLOTS.x1; sx += 23) {
    const broken = S.slotBroke && S.slotBroke.has(sx);
    for (let y = D.SLOTS.y + 9; y < D.SLOTS.y + 20; y++) for (let x = sx + 4; x < sx + 17; x++) plot(x, y, broken ? ((x + y) % 3 ? C('#101014') : C('#3a3a40')) : (Math.floor(t * 6 + sx) % 7 === 0 ? C('#ffd060') : ((x - sx) % 5 === 0 ? C('#0a3040') : ((x + y + Math.floor(t * 4)) % 9 === 0 ? CC.neonC : C('#18606a')))));
  }
  // cases: the katana's glass case, the dealer's drawer, the axe's case on the terrace wall
  for (const c of S.cases) {
    if (!vis(c.x - 10, c.x + 10)) continue;
    const x0 = Math.round(c.x - c.w / 2), x1 = x0 + c.w, y1 = c.kind === 'drawer' ? D.CRAPS.y + 12 : GROUND - (c.id === 'acase' ? 22 : 1), y0 = y1 - c.h;
    if (c.kind === 'drawer') { if (!c.broken) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) plot(x, y, x === x0 || x === x1 || y === y0 || y === y1 ? O : y === y0 + 3 ? CC.brass : CC.woodL); continue; }
    if (c.id === 'kcase') for (let y = y1 - 3; y <= y1; y++) for (let x = x0 - 2; x <= x1 + 2; x++) plot(x, y, y === y1 - 3 ? CC.goldL : CC.woodD);   // its plinth
    for (let y = y0; y <= y1 - (c.id === 'kcase' ? 4 : 0); y++) for (let x = x0; x <= x1; x++) {
      const edge = x === x0 || x === x1 || y === y0;
      if (c.broken) { if (edge && noise2(x, y) < 0.5) plot(x, y, CC.steelD); continue; }
      plot(x, y, edge ? (c.id === 'acase' ? CC.red : CC.goldD) : ((x + y) % 7 === 0 ? CC.glassL : C('#2a3a4a')));
    }
    if (!c.broken && c.flash > 0) for (let x = x0; x <= x1; x++) plot(x, y0 + 2, C('#ffffff'));
  }
  // flippable card tables: upright (a round green top on a pedestal), flipped (the top faces one way: cover), or broken
  if (!R.models3d) for (const tb of S.tables) if (vis(tb.x - 12, tb.x + 12) && !tb.broken) drawTable(R, tb);   // (3D: models, three.js)
  // gates between sections (shut: a door panel; open: nothing)
  for (const g of S.gates) {
    if (g.open >= 1 || !vis(g.x - 8, g.x + 8)) continue;
    const h = Math.round(52 * (1 - g.open)), x0 = g.x - 4;
    for (let y = GROUND - h; y < GROUND; y++) for (let x = x0; x <= g.x + 2; x++) plot(x, y, x === x0 || x === g.x + 2 || y === GROUND - h ? O : g.id === 'inner' ? ((x + y) % 4 === 0 ? CC.steelL : CC.steelD) : g.id === 'vault' ? CC.steel : (y - GROUND + h) % 10 === 5 ? CC.goldD : CC.woodL);
    if (g.id === 'service' && !S.keyCard) plot(g.x - 2, GROUND - 28, Math.floor(t * 3) % 2 ? C('#ff3030') : C('#601010'));   // the lock's red lamp
    if (g.id === 'service' && S.keyCard) plot(g.x - 2, GROUND - 28, C('#30ff60'));
  }
  // the vault door's face: a round steel slab with a wheel; it rolls aside when the Cooler is down
  if (vis(D.VAULT_DOOR - 80, D.VAULT_DOOR + 10)) {
    const vx = D.VAULT_DOOR - 32 - Math.round(S.vaultOpen * 64), vy = GROUND - 40;
    for (let yy = -33; yy <= 33; yy++) for (let xx = -33; xx <= 33; xx++) { const d = Math.hypot(xx, yy); if (d <= 33 && vy + yy < GROUND) plot(vx + xx, vy + yy, d > 31 ? O : d < 6 ? CC.steelL : (Math.abs(xx) < 2 || Math.abs(yy) < 2) && d < 16 ? CC.steelD : (d > 22 && d < 24) ? CC.steelD : CC.steel); }
    if (S.vaultRing > 0) for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; plot(Math.round(vx + Math.cos(a) * (35 + (1 - S.vaultRing) * 10)), Math.round(vy + Math.sin(a) * (35 + (1 - S.vaultRing) * 10)), C('#fff4c0')); }
    if (S.vaultOpen > 0.5) for (let y = vy - 30; y < GROUND; y++) for (let x = D.VAULT_DOOR - 28; x < D.VAULT_DOOR - 4; x++) if (Math.hypot(x - (D.VAULT_DOOR - 32), y - vy) < 30) plot(x, y, C('#2a2618'));
  }
  // the weapon locker's door (open after the Cooler)
  if (vis(D.LOCKER_X - 10, D.LOCKER_X + 10) && S.lockerOpen) for (let y = GROUND - 45; y < GROUND - 1; y++) plot(D.LOCKER_X + 10, y, C('#4a5a50'));
  // the cashier glass: two panes with three crack stages; the firing slot between them
  if (vis(D.BOOTH.x0 - 4, D.BOOTH.x0 + 4)) for (const p of S.panes) {
    for (let y = p.y0; y <= p.y1; y++) for (let x = D.BOOTH.x0; x <= D.BOOTH.x0 + 5; x++) {
      if (p.hp > 0 && (x === D.BOOTH.x0 || x === D.BOOTH.x0 + 5)) { plot(x, y, CC.steelD); continue; }   // the frame
      if (p.hp > 0 && R.glass3d) continue;   // (3D: the glass is a pane, three.js)
      if (p.hp <= 0) { if (noise2(x, y) < 0.12) plot(x, y, CC.glassL); continue; }
      const st = p.hp > 66 ? 0 : p.hp > 33 ? 1 : 2;
      plot(x, y, (st >= 1 && (y * 7 + x * 3) % (st === 2 ? 4 : 9) === 0) ? C('#f0f8ff') : ((y + x * 2) % 13 < 2 ? CC.glassL : CC.glass));
    }
    if (p.flash > 0 && !R.glass3d) for (let y = p.y0; y <= p.y1; y += 2) plot(D.BOOTH.x0 + 1, y, C('#ffffff'));
  }
  // mirror pillars in the lobby; swivel mirrors in the hall
  for (const p of S.pillars) {
    if (!vis(p.x - 8, p.x + 8)) continue;
    const m = { x0: p.x - D.PILLAR.w, x1: p.x + D.PILLAR.w, y0: GROUND - D.PILLAR.h, y1: GROUND - 1, hp: p.hp, maxHp: p.maxHp, ripple: 0 };
    if (p.hp <= 0) { for (let y = GROUND - 12; y < GROUND; y++) for (let x = m.x0; x <= m.x1; x++) plot(x, y, y === GROUND - 12 ? CC.goldD : CC.marbleD); for (let k = 0; k < 5; k++) plot(p.x - 6 + k * 3, GROUND - 13 - (k & 1), CC.mirrorL); continue; }
    drawMirror(R, m, S, G, CC.gold);
  }
  for (const sw of S.swivels) {
    if (!vis(sw.x - 10, sw.x + 10)) continue;
    for (let y = GROUND - 10; y < GROUND; y++) plot(sw.x, y, CC.goldD);
    for (let k = -4; k <= 4; k++) plot(sw.x + k, GROUND - 1, CC.goldD);
    const m = { x0: sw.x - 7, x1: sw.x + 7, y0: GROUND - 44, y1: GROUND - 11, hp: sw.hp, maxHp: sw.maxHp, ripple: S.ripple || 0 };
    drawMirror(R, m, S, G, CC.gold);
  }
  // the back-wall mirrors of the lobby and the hall
  for (const m of S.mirrors) drawMirror(R, m, S, G, m.hall ? CC.goldL : CC.gold);
  // the hall's end wall: a wall of mirror panes (shattered at the phase shift: a dark doorway to the salon)
  if (vis(D.END_WALL - 14, D.END_WALL + 2)) {
    for (let y = 40; y < GROUND; y++) for (let x = D.END_WALL - 12; x <= D.END_WALL; x++) {
      if (S.wallBroken) { plot(x, y, y > 120 ? (noise2(x, y) < 0.1 ? CC.mirrorD : C('#2a0a10')) : (noise2(x, y) < 0.3 ? CC.mirrorD : C('#0a0a0c'))); continue; }
      if (x === D.END_WALL - 12 || (y - 40) % 40 === 0) plot(x, y, CC.goldL);
      else if (!R.glass3d) plot(x, y, ((x * 0.8 + y - cam.x * 0.3) % 30 + 30) % 30 < 2 ? CC.mirrorL : CC.mirror);   // (3D: a mirror pane, three.js)
    }
  }
  // chandeliers (hanging, shaking, falling, wrecked)
  if (!R.models3d) for (const c of S.chands) if (vis(c.x - 30, c.x + 30)) chandelier(R, c, c.id === 'great' || c.id === 'salon');   // (3D: models, three.js)
  // chain anchors: a gold ring on the rail (a target)
  for (const c of S.chands) if (c.anchor && c.st === 'hang' && c.armed !== false && vis(c.anchor.x - 4, c.anchor.x + 4)) { const { x, y } = c.anchor; plot(x - 1, y, CC.goldL); plot(x + 1, y, CC.goldL); plot(x, y - 1, CC.goldL); plot(x, y + 1, CC.goldL); if (c.hit > 0) plot(x, y, C('#ffffff')); }
  // the alarm light over the counting house: a red lamp that spins when the alarm is on
  if (vis(D.ALARM.x - 6, D.ALARM.x + 6)) { const on = S.alarm && Math.floor(t * 6) % 2; for (let yy = -3; yy <= 0; yy++) for (let xx = -3; xx <= 3; xx++) plot(D.ALARM.x + xx, D.ALARM.y + yy, yy === -3 || Math.abs(xx) === 3 ? O : on ? C('#ff3030') : C('#601818')); }
  // the dealer on the terrace (the breather): he smokes, raises his hands, hands over the key card, and runs
  if (S.dealer && S.dealer.st !== 'gone' && vis(S.dealer.x - 8, S.dealer.x + 8)) {
    const d = S.dealer, pose = d.st === 'hands' || d.st === 'give' ? 'hands' : d.st === 'run' ? 'run' : 'stand';
    figure(R, Math.round(d.x), GROUND - 1, d.face, pose, DEALER);
    if (d.st === 'smoke') { plot(Math.round(d.x) + 3, GROUND - 13, Math.floor(t * 2) % 2 ? C('#ff6020') : C('#a03010')); for (let i = 0; i < 3; i++) { const ph = (t * 0.5 + i / 3) % 1, x = d.x + 3 + Math.sin(t + i) * 2, y = GROUND - 16 - ph * 14; if (R.soft) R.soft(x, y, 1.5 + ph * 3, 200, 200, 210, 0.35 * (1 - ph)); else blendPlot(Math.round(x), Math.round(y), 200, 200, 210, 0.4 * (1 - ph)); } }
    if (d.st === 'give') for (let k = 0; k < 3; k++) plot(Math.round(d.x) + d.face * (4 + k), GROUND - 18, CC.goldL);   // the brass key card
  }
  // across the river: a green coupé's headlights flash twice (Mags)
  if (S.coupe > 0 && vis(1180, 1260)) { const on = (S.coupe > 1.2 && S.coupe < 1.5) || (S.coupe > 0.6 && S.coupe < 0.9); for (let k = 0; k < 3; k++) { plot(1238 + k, 214, on ? C('#fff8d0') : C('#2a4a30')); } for (let k = 0; k < 12; k++) plot(1232 + k, 216, C('#1e3a24')); }
  // the salon: the ring of bulbs over the wheel chases in the spin's direction; the croupier at the wheel; the ball on the rim
  if (G.flags.club) {
    const W_ = D.WHEEL, dir = S.wheel ? Math.sign(S.wheel.v) || 1 : 1, ph = S.wheel ? S.wheel.ph : 0;
    for (let x = W_.x0; x <= W_.x1; x += 8) { const on = ((Math.floor((x - W_.x0) / 8) - Math.floor(ph * dir)) % 4 + 4) % 4 === 0; const rev = S.wheel && S.wheel.rev > 0; plot(x, 236, on ? (rev ? C('#60e0ff') : C('#fff0a0')) : CC.goldD); plot(x, 237, CC.goldD); }
    if (S.croupier) figure(R, D.WHEEL.x1 - 6, 236, -1, S.wheel && Math.abs(S.wheel.v) > 1 ? 'spin' : 'stand', CROUP);
    const B = S.ball; if (B && B.st === 'rim') { const bx = Math.round(B.x); for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) plot(bx + xx, 233 + yy, xx * xx + yy * yy > 1 ? CC.steelD : C('#f0f0f4')); }
    // the wheel's back rim (a red-black band along the floor's far edge)
    for (let x = W_.x0; x <= W_.x1; x++) { plot(x, GROUND - 2, CC.goldD); plot(x, GROUND - 1, CC.gold); }
  }
  void line1;
}

// ---- the roulette wheel's floor: 37 pockets (red, black, the green zero) scrolling with the drift; the called colour glows ----
export function pocketAt(S, x) {   // the pocket under world x: 0 = the green zero, odd = red, even = black
  const W_ = D.WHEEL, off = S.wheel ? S.wheel.off : 0, L = W_.pw * W_.n;
  const u = (((x - W_.x0 - off) % L) + L) % L;
  return Math.floor(u / W_.pw);
}
export const pocketCol = n => n === 0 ? 'green' : n % 2 ? 'red' : 'black';
export function drawFloor(R, S) {
  const { plot } = R, cam = R.cam, W_ = D.WHEEL, t = R.t;
  const call = S.call, glow = call && call.t < call.T, zap = call && call.t >= call.T && call.t < call.T + 0.25;
  for (let x = Math.max(W_.x0, cam.x - 2); x <= Math.min(W_.x1, cam.x + cam.vw + 2); x++) {
    const n = pocketAt(S, x), col = pocketCol(n), u = (((x - W_.x0 - (S.wheel ? S.wheel.off : 0)) % W_.pw) + W_.pw) % W_.pw;
    const lit = (glow || zap) && call && col === call.col;
    for (let d = 1; d <= STREET; d++) {
      const y = GROUND + d;
      let c = col === 'green' ? CC.green : col === 'red' ? CC.red : CC.blk;
      if (u === 0 || d === 1 || d === STREET) c = CC.gold;   // the frets
      else if (d > 4 && d < 10 && u > 5 && u < 10 && (n % 10 === 7 || n === 17)) c = CC.cream;   // a number plate here and there (17: red)
      if (lit && u !== 0 && d > 1 && d < STREET) c = zap ? (Math.floor(t * 40 + x) % 2 ? C('#fffcf0') : C('#a0e8ff')) : (Math.floor(t * 10) % 2 ? (col === 'red' ? CC.redL : C('#4a4a5a')) : c);
      if (S.stains) { const st = S.stains.get(((x - W_.x0 - Math.round(S.wheel ? S.wheel.off : 0)) % (W_.pw * W_.n) + W_.pw * W_.n) % (W_.pw * W_.n) * 16 + d); if (st) c = st; }
      plot(x, y, c);
    }
  }
}

// ---- floor tells (both views): the called pockets' hum, card-rain marks, the real Count's floor shadow, a falling chandelier's shadow ----
export function drawGround(R, S, G) {
  const { plot, blendPlot } = R, t = R.t;
  for (const m of S.marks) { const on = Math.floor(t * 10) % 2 || m.t > 0.5; if (!on) continue; const x = Math.round(m.x); plot(x, GROUND - 1, C('#ff3030')); plot(x - 1, GROUND, C('#ff3030')); plot(x + 1, GROUND, C('#ff3030')); plot(x, GROUND + 1, C('#ff3030')); }
  // a falling chandelier's shadow: a dark ellipse that grows as it comes
  for (const c of S.chands) if (c.st === 'warn' || c.st === 'fall') {
    const k = c.st === 'warn' ? 0.5 : 0.5 + 0.5 * Math.min(1, (c.y - c.y0) / Math.max(1, GROUND - c.y0)), r = c.r * k;
    for (let x = Math.round(c.x - r); x <= Math.round(c.x + r); x++) for (let d = 0; d <= 3; d++) blendPlot(x, GROUND - 1 + d, 10, 4, 8, 0.45);
  }
  // only the real Count casts a shadow under the mirrors' edge lights
  const B = S.brask; if (B && !B.dead && B.J && !B.air) for (let x = Math.round(B.x - 7); x <= Math.round(B.x + 7); x++) blendPlot(x, GROUND, 6, 4, 10, 0.55);
  // shards on the floor
  for (const sh of S.shards) for (let x = Math.round(sh.x0); x <= sh.x1; x += 3) plot(x, GROUND - ((x * 7) & 1), (x * 13) % 5 ? CC.mirrorL : C('#ffffff'));
  void G;
}

// ---- over the lit scene, unlit: fire on the range, the oil flare, the ball rolling, crystal ----
const FIREC = [C('#fff0b0'), C('#ffc040'), C('#ff7a20'), C('#c03010')];
export function flame(R, x, y, w, h, seed) {
  const t = R.t;
  for (let i = 0; i < w * 1.6; i++) {
    const ph = (i * 0.137 + t * 2.6 + seed) % 1, xx = x - w / 2 + ((i * 7.3 + seed * 13) % w) + Math.sin(t * 9 + i) * 1.2, yy = y - ph * h * (0.6 + 0.4 * ((i * 5) % 3) / 2);
    R.plot(Math.round(xx), Math.round(yy), FIREC[Math.min(3, Math.floor(ph * 4))]);
  }
}
export function drawFx(R, S) {
  const { plot } = R, t = R.t;
  // the range's burners: blue gas flames; the flare when the oil goes up
  if (R.cam.x < D.RANGE.x1 + 10 && R.cam.x + R.cam.vw > D.RANGE.x0 - 10) {
    for (let x = D.RANGE.x0 + 4; x < D.RANGE.x1 - 2; x += 7) for (let k = 0; k < 3; k++) { const ph = (t * 3 + k * 0.33 + x * 0.1) % 1; plot(x + k - 1, D.RANGE.top - 1 - Math.round(ph * 3), ph < 0.5 ? C('#a0d0ff') : C('#4080ff')); }
    if (S.flare > 0) for (let x = D.RANGE.x0 - 20; x <= D.RANGE.x1 + 20; x += 3) flame(R, x, GROUND - 2, 5, 26 * Math.min(1, S.flare), x * 0.3);
  }
  for (const b of S.burners) flame(R, b.x, b.y, b.w || 6, b.h || 10, b.x * 0.1);
  // the roulette ball rolling across the fight lane
  const B = S.ball; if (B && B.st === 'roll') { const bx = Math.round(B.x), by = Math.round(B.y); for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) { const d = xx * xx + yy * yy; if (d <= 9) plot(bx + xx, by + yy, d > 6 ? CC.steelD : (xx < 0 && yy < 0 ? C('#ffffff') : C('#d0d4dc'))); } }
}
