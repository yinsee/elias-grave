// Level 4, "The Leviathan": the art. Every pixel is painted in code (like src/levels/metro/paint.js).
//   paint(api)              once: the static world layer (stat), the props mask, the puddle mask
//   drawWorld(R, S)         per frame, behind the fighters, on the wall: the glass (tanks, cases, the cylinder, the tunnel roof) with
//                           its fish and cracks, the whale skeleton, the skylight's rain, the doors, the sharks, the hoist's rail
//   drawGround(R, S)        per frame, lit, on the floor: wet sheen, puddles, floor jellyfish, flopping fish, floor tells
//   drawFx(R, S)            per frame, over the lit scene (unlit): water bodies and surfaces, sprays, burst waves, water columns,
//                           bubble trails, fins, the anchor and its chain, Teague's helmet, chum, the bait cage drop
//   drawCatwalk(R, c)       a hanging catwalk section (flat, tilted on one chain, or gone): 2D on the platform lane, 3D as a model
//   drawPallet(R, h)        the hoist's pallet; drawCage(R, c) the bait cage
// R: { plot, line1, blendPlot, cam, t } (world coordinates); S: the level's run state (src/levels/aquarium/run.js)
import { C } from '../../core/color.js';
import * as D from './data.js';
import { TEAGUE } from '../../bosses/teague.js';

const GROUND = D.GROUND, H = 320, STREET = 14;

// ---- a 3 x 5 pixel font for painted signs ----
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100',
  G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111', M: '101111111101101',
  N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001', 5: '111100110001110', 6: '011100111101111',
  7: '111001010010010', 8: '111101111101111', 9: '111101111001111', ' ': '000000000000000', '-': '000000111000000', '.': '000000000000010', ':': '000010000010000', '&': '010101010101011',
};
export function text(put, s, x, y, c, k = 1) {
  for (const ch of s.toUpperCase()) {
    const g = FONT[ch] || FONT[' '];
    for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (g[r * 3 + q] === '1') for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) put(x + q * k + a, y + r * k + b, c);
    x += 4 * k;
  }
  return x;
}
const shade = (c, k) => { const f = v => Math.max(0, Math.min(255, Math.round(v * k))); return (255 << 24 | f(c >> 16 & 255) << 16 | f(c >> 8 & 255) << 8 | f(c & 255)) >>> 0; };
const mix = (a, b, k) => { const m = sh => Math.round((a >> sh & 255) * (1 - k) + (b >> sh & 255) * k); return (0xff000000 | m(16) << 16 | m(8) << 8 | m(0)) >>> 0; };
const noise2 = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; };
const hashS = s => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };

// colours shared by the static layer and the dynamic painters (the glowing ones are the engine's EMIT colours: NEON_C, NEON_P, LAMP_GLASS)
export const AC = {
  out: C('#14121c'), ceil: C('#0e1016'), plaster: C('#2c3c40'), plasterD: C('#22302f'), plasterL: C('#38494c'), rib: C('#1c2628'),
  wood: C('#4a3424'), woodD: C('#36261a'), brass: C('#b08a3a'), brassD: C('#7a5e26'), brassL: C('#e0c070'),
  marble: C('#c8c4b8'), marbleD: C('#9a968c'), marbleV: C('#7a766e'), tileK: C('#2a2a30'),
  deep: C('#0a1a2a'), deepL: C('#123048'), water: C('#174a6a'), waterL: C('#2a6a8a'), waterH: C('#5ab0c8'), foam: C('#d0e8f0'),
  glass: C('#9ad0e0'), glassD: C('#4a7890'), crack: C('#e8f6ff'), frame: C('#2a3038'), frameL: C('#5a6470'),
  uv: C('#1a1030'), uvD: C('#120a24'), uvDot: C('#6a4aa8'),
  conc: C('#4a5250'), concD: C('#3a4240'), concL: C('#5e6866'), pipe: C('#5a6a5a'), pipeD: C('#3e4a3e'), pipeL: C('#7a8a7a'),
  steel: C('#5a5e66'), steelD: C('#3a3e46'), steelL: C('#8a8e98'), rust: C('#6a3a24'), rustD: C('#4a2818'),
  brick: C('#3e3028'), brickD: C('#32261f'), mortar: C('#1e1814'), yel: C('#d8b020'), yelD: C('#8a7014'),
  bone: C('#d8ccb0'), boneD: C('#a89c84'), red: C('#c02a2a'), redD: C('#7a1c1c'), green: C('#3ac060'), cream: C('#e8dcb8'),
  rubber: C('#24262a'), rubberL: C('#34373c'), sea: C('#0c1820'), seaL: C('#24404e'),
  neonC: C('#3ff0ff'), neonP: C('#ff3fa4'), lamp: C('#ffd77a'), spark: C('#fff8f0'),
  shark: C('#3a4a58'), sharkD: C('#26323c'), sharkB: C('#8a9aa6'), jelly: C('#e8c8f0'), jellyD: C('#b090c8'),
  fish: [C('#ffb040'), C('#ff6a3a'), C('#ffe060'), C('#60d0ff'), C('#ff70b0'), C('#a0ff80')],
};

// ---- the static layer ----
// api: { W, H, GROUND, PAL }
export function paint(api) {
  const { W } = api;
  const b = new Uint32Array(W * H), props = new Uint8Array(W * H), pud = new Uint8Array((STREET + 1) * W);
  const put = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < W && y < H) b[y * W + x] = c; };
  const rect = (x0, y0, x1, y1, f) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = f(x, y); if (c) put(x, y, c); } };
  const O = AC.out;

  // ---- the back wall, section by section ----
  for (let x = 0; x < W; x++) for (let y = 0; y < GROUND; y++) {
    let c;
    if (x < 466) {   // the lobby: a 1930s hall, teal plaster between deco ribs, a dark wood wainscot
      if (y < 46) c = (x + y) % 17 === 0 ? AC.rib : AC.ceil;
      else if (y < 50) c = AC.brassD;
      else if (y > 226) c = (x % 24 === 0 || y === 227) ? AC.woodD : (y - 227) % 9 === 0 ? AC.woodD : AC.wood;
      else { const px = x % 40; c = px < 3 ? AC.rib : px === 3 ? AC.plasterL : (y % 30 === 0 ? AC.plasterD : AC.plaster); if (noise2(x >> 2, y >> 2) < 0.06) c = AC.plasterD; }
    } else if (x < 1062) {   // the reef gallery: a long dark corridor; the tanks are set into it
      if (y < 60) c = AC.ceil;
      else { const px = (x - 466) % 96; c = px < 4 ? AC.rib : y > 266 ? AC.frame : (noise2(x >> 2, y >> 2) < 0.08 ? C('#0e1a24') : C('#122230')); }
    } else if (x < 1460) {   // the rotunda: a round dark room, UV dots like stars
      const n = noise2(x, y);
      c = y < 50 ? AC.uvD : n < 0.012 ? AC.uvDot : n < 0.02 ? C('#3a2a6a') : AC.uv;
      if (((x - 1062) % 66) < 3 && y > 50) c = C('#221636');
    } else if (x < 1886) {   // the pump hall: green-grey concrete, pipe runs
      const px = (x - 1460) % 48, py = y % 36; c = px === 0 || py === 0 ? AC.concD : (noise2(x >> 1, y >> 1) < 0.05 ? AC.concD : AC.conc);
      if (y < 40) c = shade(c, 0.5 + 0.5 * y / 40);
    } else if (x < 2436) {   // the dock: a brick basement
      const row = Math.floor(y / 4), bx = (x + (row % 2) * 5) % 10;
      c = y % 4 === 3 || bx === 0 ? AC.mortar : (noise2(Math.floor((x + (row % 2) * 5) / 10), row) < 0.3 ? AC.brickD : AC.brick);
      if (y < 60) c = shade(c, 0.5 + 0.5 * y / 60);
    } else {   // the tank: the dark roof, the water over the tunnel, the glass arch of the tunnel's back wall
      if (y < D.TUN.tankY) { c = y < 30 ? C('#0a0c12') : (noise2(x >> 2, y >> 2) < 0.1 ? C('#12161e') : C('#0e1218')); }
      else { const k = (y - D.TUN.tankY) / (GROUND - D.TUN.tankY); c = mix(C('#1e5a7a'), C('#061424'), Math.min(1, k * 1.2)); if (noise2(x >> 3, (y >> 3) + 7) < 0.08) c = shade(c, 1.15); }
    }
    b[y * W + x] = c;
  }
  // light shafts in the Ocean Tank (static: the water itself moves in drawWorld)
  for (const sx of [2480, 2580, 2700]) for (let y = D.TUN.tankY; y < GROUND; y++) for (let x = sx - 10; x <= sx + 10; x++) { const k = (1 - Math.abs(x - sx) / 11) * (1 - (y - D.TUN.tankY) / 170); if (k > 0) b[y * W + x] = mix(b[y * W + x], C('#5aa8c8'), 0.18 * k); }
  // the lobby: THE LEVIATHAN in brass letters; the skylight's frame; exit signs (cyan glow)
  text(put, 'THE LEVIATHAN', 150, 70, AC.brass, 2);
  for (const ex of [16, 430]) { rect(ex, 150, ex + 18, 158, (x, y) => x === ex || x === ex + 18 || y === 150 || y === 158 ? O : AC.neonC); text(put, 'EXIT', ex + 2, 152, O); }
  // the reef gallery: brass plaques under the tanks
  for (let i = 0; i < 4; i++) rect(510 + i * 96, 268, 540 + i * 96, 273, (x, y) => y === 268 || y === 273 ? O : AC.brass);
  text(put, 'REEF', 920, 136, AC.brass); text(put, 'GALLERY', 950, 136, AC.brass);
  // the pump hall: big pipes, gauges, the porthole's ring
  for (const py of [70, 84]) for (let x = 1462; x < 1884; x++) { put(x, py, AC.pipeL); for (let k = 1; k < 8; k++) put(x, py + k, k > 5 ? AC.pipeD : AC.pipe); put(x, py + 8, O); }
  for (const gx of [1612, 1660, 1840]) { for (let yy = -4; yy <= 4; yy++) for (let xx = -4; xx <= 4; xx++) { const d = Math.hypot(xx, yy); if (d <= 4.4) put(gx + xx, 112 + yy, d > 3.5 ? O : C('#e8e4d4')); } put(gx + 1, 111, AC.red); put(gx + 2, 110, AC.red); }
  { const { x, y } = D.PORTHOLE; for (let yy = -16; yy <= 16; yy++) for (let xx = -16; xx <= 16; xx++) { const d = Math.hypot(xx, yy); if (d <= 16.5 && d > 13) put(x + xx, y + yy, d > 15.5 ? O : AC.brassD); } }
  text(put, 'SEA GATE', 1462, 180, AC.yel);
  // the dock: the sea doors at the back (storm light leaks round them)
  rect(2120, 150, 2252, 270, (x, y) => x === 2120 || x === 2252 || y === 150 ? O : x === 2186 ? O : (y - 150) % 20 === 0 ? AC.steelD : ((x - 2120) % 22 === 0 ? AC.steelD : AC.steel));
  for (let y = 151; y < 270; y++) { put(2186, y, C('#8ab0c8')); }
  text(put, 'LOADING 3', 2140, 140, AC.yel);
  // the tunnel: the roof lamps and the crane rail over the tank (phases 2-3)
  for (let x = D.CRANE.x0 - 20; x <= D.CRANE.x1 + 20; x++) { put(x, D.CRANE.y, AC.steelL); put(x, D.CRANE.y + 1, AC.steel); put(x, D.CRANE.y + 2, O); }
  for (const lx of [2470, 2590, 2710]) rect(lx - 5, 4, lx + 5, 8, (x, y) => y === 4 || x === lx - 5 || x === lx + 5 ? O : y === 8 ? AC.lamp : AC.steelD);
  // the tank's surface line and the tunnel's steel arch ribs (the glass between them is drawn live)
  for (let x = 2436; x < W; x++) { put(x, D.TUN.tankY, C('#6ab8d0')); put(x, D.TUN.tankY + 1, C('#3a8aaa')); }
  for (let i = 0; i <= 5; i++) { const rx = 2452 + i * 68; for (let y = D.TUN.roofY - 2; y < GROUND; y++) { put(rx - 1, y, O); put(rx, y, AC.steelD); put(rx + 1, y, AC.steel); } }
  // the Bell & Sons clock in the shaft, stopped at 3:17 (red-tinted: a Choir sign)
  { const { x: cx, y: cy } = D.CLOCK;
    for (let yy = -6; yy <= 6; yy++) for (let xx = -6; xx <= 6; xx++) { const d = Math.hypot(xx, yy); if (d <= 6.4) put(cx + xx, cy + yy, d > 5.4 ? C('#b02a2a') : C('#d0dce8')); }
    for (let k = 0; k <= 4; k++) put(cx + k, cy, O); for (let k = 0; k <= 3; k++) put(cx + Math.round(k * 0.7), cy + k, O);
    text(put, 'BELL', cx - 7, cy + 9, AC.brass); }

  const pre = b.slice();   // everything after this is a solid prop (blood sticks to it; the 3D view makes blocks of it)

  // ---- props ----
  // the lobby: the snack kiosk, the turnstiles, the payphone, the katana bench, the gift-shop shelves and counter
  rect(D.KIOSK.x0, 236, D.KIOSK.x1, GROUND - 1, (x, y) => x === D.KIOSK.x0 || x === D.KIOSK.x1 || y === 236 ? O : y < 244 ? AC.red : y === 244 ? O : (x - D.KIOSK.x0) % 6 === 0 ? AC.woodD : AC.wood);
  text(put, 'SNACK', D.KIOSK.x0 + 6, 238, AC.cream);
  for (const tx of D.TURNSTILES) { rect(tx - 2, GROUND - 22, tx + 2, GROUND - 1, (x, y) => x === tx - 2 || x === tx + 2 || y === GROUND - 22 ? O : AC.brass); for (let k = 0; k < 7; k++) put(tx + 3 + k, GROUND - 14, AC.steelL); }
  { const { x, y } = D.PAYPHONE; rect(x - 5, y - 10, x + 5, y + 10, (xx, yy) => xx === x - 5 || xx === x + 5 || yy === y - 10 || yy === y + 10 ? O : yy < y - 6 ? AC.brass : AC.steelD); rect(x - 7, y - 4, x - 6, y + 4, () => AC.out); }
  rect(D.BENCH_K.x - 14, GROUND - 9, D.BENCH_K.x + 14, GROUND - 7, (x, y) => y === GROUND - 9 ? AC.brassD : AC.wood); for (const lx of [D.BENCH_K.x - 12, D.BENCH_K.x + 12]) for (let y = GROUND - 6; y < GROUND; y++) put(lx, y, O);
  for (const sy of [196, 214, 232]) { for (let x = D.SHELVES.x0; x <= D.SHELVES.x1; x++) { put(x, sy, AC.woodD); put(x, sy + 1, O); } for (let x = D.SHELVES.x0 + 4; x < D.SHELVES.x1 - 4; x += 11) { rect(x, sy - 5, x + 6, sy - 1, (xx, yy) => (xx + yy) % 5 === 0 ? C('#d8e0e8') : C('#6a8aa8')); put(x + 7, sy - 3, C('#6a8aa8')); } }   // plush sharks
  { const { x0, x1, y } = D.COUNTER; rect(x0, y, x1, GROUND - 1, (x, yy) => x === x0 || x === x1 || yy === y ? O : yy === y + 1 ? AC.brassL : (yy - y) % 10 === 5 ? AC.woodD : AC.wood); text(put, 'GIFTS', x0 + 18, y + 8, AC.brass); }
  // the reef gallery: the gantry (one-way grating), its railing and hangers, the ladder, the crates, the dead guard, the axe rack
  { const { x0, x1, y } = D.GANTRY;
    for (let x = x0; x <= x1; x++) { put(x, y, AC.steelL); put(x, y + 1, x % 3 ? AC.steel : O); put(x, y + 2, O); put(x, y - 9, AC.steel); }
    for (let x = x0; x <= x1; x += 18) for (let yy = y - 9; yy < y; yy++) put(x, yy, AC.steelD);
    for (let x = x0 + 12; x <= x1; x += 80) for (let yy = 60; yy < y; yy++) put(x, yy, C('#2a2a30')); }
  { const L = D.LADDERS[0]; for (let yy = L.y0; yy < GROUND; yy++) { put(L.x - 4, yy, AC.steelD); put(L.x + 4, yy, AC.steelD); if ((yy - L.y0) % 6 === 0) for (let x = L.x - 4; x <= L.x + 4; x++) put(x, yy, AC.steel); } }
  for (const s of [D.STEP_HI, D.STEP_LO]) rect(s.x0, s.y, s.x1, GROUND - 1, (x, y) => x === s.x0 || x === s.x1 || y === s.y || (y - s.y) % 17 === 0 ? O : (x + y) % 9 === 0 ? C('#6a4a2e') : C('#8a6a44'));
  { const x = D.DEAD_GUARD; rect(x - 10, GROUND - 5, x + 8, GROUND - 1, (xx, yy) => yy === GROUND - 5 ? O : xx < x - 5 ? C('#c8a080') : C('#2a3a5a')); }   // a dead guard slumped against the wall
  for (let x = 1036; x <= 1060; x++) put(x, GROUND - 22, AC.redD);
  // the rotunda: the balconies on their posts with railings; the cylinder's brass base and cap; benches
  for (const s of [D.BAL_L, D.BAL_R]) {
    for (let x = s.x0; x <= s.x1; x++) { put(x, s.y, AC.brassL); put(x, s.y + 1, AC.brass); put(x, s.y + 2, AC.brassD); put(x, s.y + 3, O); put(x, s.y - 9, AC.brass); }
    for (let x = s.x0; x <= s.x1; x += 10) for (let yy = s.y - 9; yy < s.y; yy++) put(x, yy, AC.brassD);
    for (const px of [s.x0 + 4, s.x1 - 4]) for (let yy = s.y + 4; yy < GROUND; yy++) { put(px, yy, AC.brassD); put(px + 1, yy, O); }
  }
  rect(D.CYL.x0 - 6, GROUND - 8, D.CYL.x1 + 6, GROUND - 1, (x, y) => y === GROUND - 8 || x === D.CYL.x0 - 6 || x === D.CYL.x1 + 6 ? O : y === GROUND - 7 ? AC.brassL : AC.brass);
  rect(D.CYL.x0 - 6, D.CYL.y0 - 8, D.CYL.x1 + 6, D.CYL.y0 - 1, (x, y) => y === D.CYL.y0 - 1 || x === D.CYL.x0 - 6 || x === D.CYL.x1 + 6 ? O : AC.brass);
  for (const bx of D.BENCHES) { rect(bx - 12, GROUND - 8, bx + 12, GROUND - 6, (x, y) => y === GROUND - 8 ? C('#6a5a8a') : C('#3a2a5a')); for (const lx of [bx - 10, bx + 10]) for (let y = GROUND - 5; y < GROUND; y++) put(lx, y, O); }
  // the pump hall: the filter tanks, the pipe rack, the gantry and the hatch, the sea gate's wheel, the junction box, the shutter
  for (const f of D.FILT) rect(f.x0, f.y, f.x1, GROUND - 1, (x, y) => { const e = Math.min(x - f.x0, f.x1 - x); return e === 0 || y === f.y ? O : y === f.y + 1 ? AC.pipeL : e < 4 ? AC.pipeD : (y - f.y) % 16 === 0 ? AC.pipeD : AC.pipe; });
  { const { x0, x1, y } = D.RACK; for (let x = x0; x <= x1; x++) { put(x, y, AC.steelL); put(x, y + 1, AC.steel); put(x, y + 2, O); for (let k = 0; k < 4; k++) put(x, y + 6 + k * 5, k % 2 ? AC.pipeD : AC.pipe); } for (const px of [x0 + 4, x1 - 4]) for (let yy = y + 3; yy < GROUND; yy++) { put(px, yy, AC.steelD); put(px + 1, yy, O); } }
  { const { x0, x1, y } = D.PGANTRY; for (let x = x0; x <= x1; x++) { put(x, y, AC.steelL); put(x, y + 1, x % 3 ? AC.steel : O); put(x, y + 2, O); put(x, y - 9, AC.yel); } for (let x = x0; x <= x1; x += 14) for (let yy = y - 9; yy < y; yy++) put(x, yy, AC.yelD); for (let yy = y + 3; yy < GROUND; yy++) { put(x0 + 4, yy, AC.steelD); put(x0 + 5, yy, O); } }
  { const gx = D.SEA_GATE, gy = 236; for (let yy = -14; yy <= 14; yy++) for (let xx = -14; xx <= 14; xx++) { const d = Math.hypot(xx, yy); if ((d <= 14.5 && d > 12) || (d < 12 && (Math.abs(xx) < 2 || Math.abs(yy) < 2))) put(gx + xx, gy + yy, d > 13.8 ? O : AC.red); } }
  { const { x, y } = D.JBOX; rect(x - 8, y - 10, x + 8, y + 8, (xx, yy) => xx === x - 8 || xx === x + 8 || yy === y - 10 || yy === y + 8 ? O : yy === y - 9 ? AC.steelL : AC.steel); text(put, 'HV', x - 3, y - 6, AC.yel); for (let yy = y + 9; yy < GROUND; yy++) put(x, yy, AC.steelD); }
  rect(1880, D.DOORS.shutter.y1 + 1, 1886, GROUND - 1, (x, y) => x === 1880 ? O : ((y >> 2) % 2 ? AC.steel : AC.steelD));   // the steel shutter (the hatch over it is open)
  // the dock: the mezzanine and the dive locker (wetsuits, tanks, the desk), the hoist's I-beam, its control box, the boat, the crates
  { const { x0, x1, y } = D.MEZZ;
    for (let x = x0; x <= x1; x++) { put(x, y, AC.steelL); put(x, y + 1, AC.steel); put(x, y + 2, AC.steelD); put(x, y + 3, O); }
    for (let x = x1 - 1; x <= x1; x++) for (let yy = y + 4; yy < GROUND; yy++) put(x, yy, AC.steelD);
    rect(x0 + 2, y - 46, x1 - 4, y - 1, (x, yy) => yy === y - 46 || x === x0 + 2 ? O : 0);
    for (const hx of [1898, 1912, 1926]) { for (let yy = y - 34; yy < y - 12; yy++) for (let xx = hx - 3; xx <= hx + 3; xx++) put(xx, yy, Math.abs(xx - hx) === 3 ? O : C('#14161a')); put(hx, y - 36, AC.steelL); }   // wetsuits on hooks
    rect(D.MANIFEST.x - 10, y - 12, D.MANIFEST.x + 10, y - 1, (x, yy) => yy === y - 12 ? O : yy === y - 11 ? AC.wood : x === D.MANIFEST.x - 9 || x === D.MANIFEST.x + 9 ? AC.woodD : 0);
    rect(D.MANIFEST.x - 4, y - 15, D.MANIFEST.x + 3, y - 13, () => AC.cream); put(D.MANIFEST.x + 1, y - 14, AC.red);   // the manifest under a dive lamp
    rect(2004, y - 40, 2010, y - 8, (x, yy) => x === 2004 || yy === y - 40 || yy === y - 8 ? O : C('#4a6a7a')); }
  for (let x = D.HOIST.x0 - 10; x <= D.HOIST.x1 + 10; x++) { put(x, D.HOIST.y - 2, O); put(x, D.HOIST.y - 1, AC.yelD); put(x, D.HOIST.y, AC.yel); put(x, D.HOIST.y + 1, AC.yelD); put(x, D.HOIST.y + 2, O); }
  rect(D.HOIST.box - 6, GROUND - 26, D.HOIST.box + 6, GROUND - 10, (x, y) => x === D.HOIST.box - 6 || x === D.HOIST.box + 6 || y === GROUND - 26 || y === GROUND - 10 ? O : y === GROUND - 22 ? AC.red : AC.yel);
  for (let y = GROUND - 9; y < GROUND; y++) put(D.HOIST.box, y, AC.steelD);
  { const { x0, x1, y } = D.BOAT; rect(x0 - 4, y, x1 + 4, GROUND + 4, (x, yy) => { const e = Math.min(x - x0 + 4, x1 + 4 - x); if (yy > y + 2 && e < (yy - y) * 0.6) return 0; return yy === y || e === 0 ? O : yy === y + 1 ? AC.cream : yy < y + 8 ? C('#3a5a6a') : C('#2a3a44'); });
    rect(x0 + 30, y - 20, x0 + 56, y - 1, (x, yy) => x === x0 + 30 || x === x0 + 56 || yy === y - 20 ? O : yy < y - 14 && (x - x0) % 8 > 2 ? C('#1a2830') : AC.cream); }
  rect(D.DOCK_CRATES.x0, D.DOCK_CRATES.y, D.DOCK_CRATES.x1, GROUND - 1, (x, y) => x === D.DOCK_CRATES.x0 || x === D.DOCK_CRATES.x1 || y === D.DOCK_CRATES.y || (y - D.DOCK_CRATES.y) % 18 === 0 ? O : (x + y) % 9 === 0 ? C('#6a4a2e') : C('#8a6a44'));
  rect(2392, 196, 2414, GROUND - 1, (x, y) => x === 2392 || x === 2414 || y === 196 ? O : y < 202 || x < 2395 || x > 2411 ? AC.steelD : Math.hypot(x - 2403, y - 230) < 6 ? AC.steelL : AC.steel);   // the watertight door
  // the tunnel: the catwalks A and D (B and C hang on chains: drawn live), the shaft and its ladder, the tank ladders
  for (const cw of [D.CATWALKS[0], D.CATWALKS[3]]) { for (let x = cw.x0; x <= Math.min(cw.x1, W - 1); x++) { put(x, cw.y, AC.steelL); put(x, cw.y + 1, x % 3 ? AC.steel : O); put(x, cw.y + 2, AC.steelD); put(x, cw.y + 3, O); put(x, cw.y - 9, AC.yel); } for (let x = cw.x0; x <= cw.x1; x += 16) for (let yy = cw.y - 9; yy < cw.y; yy++) put(x, yy, AC.yelD); for (let yy = 4; yy < cw.y - 9; yy += 1) put(cw.x0 + 30, yy, C('#2a2a30')); }
  { const x = D.SHAFT.x; for (let yy = D.CATWALKS[3].y + 4; yy < GROUND; yy++) { put(x - 4, yy, AC.steelD); put(x + 4, yy, AC.steelD); if (yy % 6 === 0) for (let k = x - 4; k <= x + 4; k++) put(k, yy, AC.steel); } }
  for (const lx of D.TANK_LADDERS) for (let yy = D.CATWALKS[0].y + 4; yy < D.TANK_FLOOR + 2; yy++) { put(lx - 3, yy, AC.steelD); put(lx + 3, yy, AC.steelD); if (yy % 6 === 0) for (let k = lx - 3; k <= lx + 3; k++) put(k, yy, AC.steel); }

  // ---- the floor band: marble, rubber mats, wet concrete, the dock's planks and its channel, the tunnel's walkway ----
  for (let x = 0; x < W; x++) {
    const ch = x >= D.CHANNEL.x0 && x <= D.CHANNEL.x1;
    for (let y = GROUND; y < H; y++) {
      const d = y - GROUND; let c;
      if (x < 466) c = d === 0 ? AC.marble : d <= STREET ? (((x >> 3) + (d >> 2)) % 2 ? AC.marble : AC.tileK) : AC.tileK;
      else if (x < 1062) c = d === 0 ? C('#3a4a5a') : d <= STREET ? ((x + d * 3) % 13 === 0 ? C('#16202a') : C('#1e2a36')) : C('#10161e');
      else if (x < 1460) c = d === 0 ? C('#4a3a6a') : d <= STREET ? ((Math.hypot((x - 1260) * 0.5, d * 4) | 0) % 9 === 0 ? C('#3a2a5a') : C('#241a3a')) : C('#140e22');
      else if (x < 1886) c = d === 0 ? AC.concL : d <= STREET ? ((x % 20 === 0 || d % 7 === 0) ? AC.concD : AC.conc) : AC.concD;
      else if (x < 2436) c = ch ? (d === 0 ? C('#4a8aa0') : d <= STREET ? ((x * 3 + d * 7) % 11 < 2 ? AC.seaL : AC.sea) : AC.sea) : d === 0 ? C('#8a6a44') : d <= STREET ? ((x % 16 === 0) ? C('#3a2a1c') : (d % 5 === 0 ? C('#5a4430') : C('#6a5038'))) : C('#2a1e14');
      else c = d === 0 ? AC.rubberL : d <= STREET ? (d % 3 === 0 ? AC.rubber : AC.rubberL) : C('#101216');
      if ((ch || x < 466 || (x >= 1062 && x < 1460)) && d >= 1 && d <= STREET) pud[d * W + x] = 1;
      b[y * W + x] = c;
    }
  }

  for (let i = 0; i < b.length; i++) if (b[i] !== pre[i] && i < GROUND * W) props[i] = 1;
  return { b, props, bg: pre, pud, winl: [] };
}

// ---- per frame, on the wall behind everyone (both views: in 3D on the wall layer) ----
const inView = (R, x0, x1) => x1 >= R.cam.x - 2 && x0 <= R.cam.x + R.cam.vw + 2;
// (3D: R.glass3d: the glass, its cracks, sheen and flash are the pane models of three.js; the painters leave them out)
export function cracks(R, p, st) {   // a pane's cracks: rays from where it was hit, longer and more of them each stage; rings from stage 2
  if (st <= 0) return;
  const seed = hashS(p.id), cx = p.hx ?? (p.x0 + p.x1) / 2, cy = p.hy ?? (p.y0 + p.y1) / 2, n = st === 1 ? 3 : st === 2 ? 6 : 9, L = (st === 1 ? 10 : st === 2 ? 22 : 40) * Math.min(1, (p.x1 - p.x0) / 50 + 0.4);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + ((seed >> (i % 16)) & 7) * 0.13, l = L * (0.6 + (((seed >> i) & 3) * 0.15));
    let x = cx, y = cy;
    for (let s = 1; s <= 4; s++) {
      const nx = cx + Math.cos(a + ((seed >> (i + s)) & 1 ? 0.15 : -0.15)) * l * s / 4, ny = cy + Math.sin(a) * l * s / 4;
      const qx = Math.max(p.x0 + 1, Math.min(p.x1 - 1, nx)), qy = Math.max(p.y0 + 1, Math.min(p.y1 - 1, ny));
      R.line1(x, y, qx, qy, AC.crack); x = qx; y = qy;
    }
  }
  if (st >= 2) for (const rr of st === 3 ? [6, 12] : [6]) for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; const x = Math.round(cx + Math.cos(a) * rr), y = Math.round(cy + Math.sin(a) * rr * 0.8); if (x > p.x0 && x < p.x1 && y > p.y0 && y < p.y1) R.blendPlot(x, y, 232, 246, 255, 0.7); }
}
function fishIn(R, p, t, n, kinds) {   // schools of reef fish swimming back and forth in a tank (they scatter from a crack)
  const w = p.x1 - p.x0 - 6, h = p.y1 - p.y0 - 10, seed = hashS(p.id), scat = p.flash > 0 ? 1 : 0;
  for (let i = 0; i < n; i++) {
    const sp = 0.25 + ((seed >> i) & 7) * 0.05, ph = ((seed * (i + 3)) % 1000) / 1000, u = (t * sp * 0.4 + ph) % 2, k = u < 1 ? u : 2 - u, dir = u < 1 ? 1 : -1;
    const x = Math.round(p.x0 + 3 + k * w), y = Math.round(p.y0 + 6 + (((seed >> (i + 2)) % 97) / 97) * h + Math.sin(t * 1.4 + i) * 2 + scat * ((i % 3) - 1) * 4);
    const c = AC.fish[(i + (seed & 3)) % AC.fish.length];
    if (kinds === 'jelly') { R.blendPlot(x, y, 232, 200, 240, 0.8); R.blendPlot(x + 1, y, 232, 200, 240, 0.6); R.blendPlot(x, y + 1 + (Math.floor(t * 3 + i) & 1), 200, 160, 230, 0.5); continue; }
    R.plot(x, y, c); R.plot(x - dir, y, c); R.plot(x - dir * 2, y, shade(c, 0.7)); R.plot(x - dir * 3, y - 1, shade(c, 0.7)); R.plot(x - dir * 3, y + 1, shade(c, 0.7));
  }
}
function tankPane(R, p, S) {
  const t = R.t, st = D.paneStage(p);
  if (!inView(R, p.x0 - 3, p.x1 + 3)) return;
  const fr = (x, y) => x === p.x0 - 2 || x === p.x1 + 2 || y === p.y0 - 2 || y === p.y1 + 2 ? AC.out : AC.frame;
  for (let y = p.y0 - 2; y <= p.y1 + 2; y++) for (let x = p.x0 - 2; x <= p.x1 + 2; x++) if (x < p.x0 || x > p.x1 || y < p.y0 || y > p.y1) R.plot(x, y, fr(x, y));
  if (p.burst) {   // an empty, dripping box with glass teeth round its rim
    for (let y = p.y0; y <= p.y1; y++) for (let x = p.x0; x <= p.x1; x++) R.plot(x, y, y > p.y1 - 6 ? ((x * 13) % 7 < 2 ? C('#8a7a5a') : C('#2a3a3a')) : (x + y) % 11 === 0 ? C('#14262e') : C('#10202a'));
    for (let x = p.x0; x <= p.x1; x += 3) { const tl = 2 + ((x * 7) % 5); for (let k = 0; k < tl; k++) { R.plot(x, p.y0 + k, AC.glassD); R.plot(x + 1, p.y1 - k, AC.glassD); } }
    return;
  }
  const lv = p.y0 + (st >= 3 ? 6 : st >= 2 ? 3 : 0);   // a cracked tank loses water: its line drops
  for (let y = p.y0; y <= p.y1; y++) {
    const k = (y - p.y0) / (p.y1 - p.y0), base = y < lv ? C('#0c1a24') : mix(C('#2a7a9a'), C('#0a2a40'), k);
    for (let x = p.x0; x <= p.x1; x++) {
      let c = base;
      if (y >= lv && y < lv + 6 && Math.sin(x * 0.4 + t * 3 + y) > 0.75) c = shade(base, 1.4);   // caustic ripples under the line
      if (y > p.y1 - 6 && ((x * 13) % 7 < 2)) c = C('#c8b080');   // sand and rocks
      if (y > p.y1 - 14 && Math.abs(Math.sin(x * 0.21)) < 0.12) c = (x & 1) ? C('#3a8a4a') : C('#2a6a3a');   // weed
      R.plot(x, y, c);
    }
  }
  for (let x = p.x0; x <= p.x1; x++) R.plot(x, lv, AC.waterH);
  if (p.fish) fishIn(R, p, t, p.fish === 'reefSmall' ? 5 : 9, p.fish);
  if (p.id === 'reefBig' && !p.burst) for (const [i, dx] of [[0, 34], [1, 96]]) {   // two Undertow divers inside the big tank, watching
    const k = S.b4 ? Math.min(1, S.b4.t / 0.5) : 0, x = Math.round(p.x0 + dx + Math.sin(t * 0.7 + i * 2) * 10 * (1 - k)), y = Math.round(p.y0 + 40 + Math.sin(t * 1.1 + i) * 6 + k * 28);
    for (let yy = -6; yy <= 6; yy++) for (let xx = -3; xx <= 3; xx++) if (Math.abs(xx) + Math.abs(yy) * 0.5 < 4) R.plot(x + xx, y + yy, C('#121418'));
    R.plot(x, y - 6, C('#c8a080')); R.plot(x + 1, y - 7, C('#5a7a8a')); if (k > 0.6) { R.plot(x - 4, y - 2, AC.steelL); R.plot(x - 5, y - 2, AC.steelL); }
  }
  // the glass: a pale sheen down one side, the cracks, a flash where it was hit; a leak spurts from a stage-2 crack
  if (!R.glass3d) {
    for (let y = p.y0; y <= p.y1; y++) R.blendPlot(p.x0 + 2, y, 200, 240, 255, 0.25);
    cracks(R, p, st);
    if (p.flash > 0) for (let y = p.y0; y <= p.y1; y += 2) for (let x = p.x0; x <= p.x1; x += 2) R.blendPlot(x, y, 255, 255, 255, 0.25);
  }
  if (p.glow > 0) for (let y = p.y0; y <= p.y1; y++) { R.blendPlot(p.x0, y, 255, 240, 160, 0.7 * p.glow); R.blendPlot(p.x1, y, 255, 240, 160, 0.7 * p.glow); }
}
function casePane(R, p) {
  if (!inView(R, p.x0 - 2, p.x1 + 2)) return;
  for (let x = p.x0 - 1; x <= p.x1 + 1; x++) { R.plot(x, p.y1 + 1, AC.out); R.plot(x, p.y1, AC.brassD); }
  if (p.burst) { for (let x = p.x0; x <= p.x1; x += 2) R.plot(x, p.y1 - 1 - ((x * 3) % 3), AC.glassD); return; }
  for (let y = p.y0; y < p.y1; y++) for (let x = p.x0; x <= p.x1; x++) { const edge = x === p.x0 || x === p.x1 || y === p.y0; if (edge) R.plot(x, y, AC.frameL); else if ((x + y) % 7 === 0 && !R.glass3d) R.blendPlot(x, y, 220, 240, 255, 0.35); }
  if (p.id !== 'katanaCase') for (let k = 0; k < 3; k++) R.plot(p.x0 + 4 + k * 5, p.y1 - 3, k % 2 ? C('#e8e0f0') : C('#a0c0e0'));   // snow globes and trinkets
  if (!R.glass3d) cracks(R, p, D.paneStage(p));
}
function cylPane(R, p, S) {   // the moon-jelly cylinder (and the small wall columns): a magenta-cyan glow that pulses every 4 s
  if (!inView(R, p.x0 - 3, p.x1 + 3)) return;
  const t = R.t, st = D.paneStage(p), big = p.kind === 'cyl';
  if (p.burst) {
    for (let x = p.x0; x <= p.x1; x += 2) { const tl = 3 + ((x * 7) % (big ? 14 : 6)); for (let k = 0; k < tl; k++) { R.plot(x, p.y1 - 9 - k, AC.glassD); if (big) R.plot(x + 1, p.y0 + k, AC.glassD); } }
    return;
  }
  const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 / 4);
  for (let y = p.y0; y <= p.y1 - (big ? 9 : 0); y++) for (let x = p.x0; x <= p.x1; x++) {
    const u = (x - p.x0) / (p.x1 - p.x0), r = Math.abs(u - 0.5) * 2, k = (y - p.y0) / (p.y1 - p.y0);
    let c = mix(mix(C('#3a1a5a'), C('#1a5a7a'), k), C('#8a3aa0'), (1 - r) * 0.5 * pulse);
    if (r > 0.86) c = shade(c, 0.6);
    if (r < 0.2 && ((y + Math.floor(t * 8)) % 9 === 0)) c = shade(c, 1.3);
    R.plot(x, y, c);
  }
  // moon jellies drifting up
  const n = big ? 14 : 3, h = p.y1 - p.y0;
  for (let i = 0; i < n; i++) {
    const x = Math.round(p.x0 + 4 + ((i * 37) % (p.x1 - p.x0 - 8)) + Math.sin(t * 0.8 + i) * 3), y = Math.round(p.y1 - 12 - ((t * (6 + (i % 4)) + i * 23) % (h - 16))), bell = Math.floor(t * 2 + i) & 1;
    for (let xx = -2 - bell; xx <= 2 + bell; xx++) R.blendPlot(x + xx, y, 240, 210, 250, 0.75);
    for (let xx = -1; xx <= 1; xx++) R.blendPlot(x + xx, y - 1, 250, 230, 255, 0.85);
    for (const xx of [-1, 1]) R.blendPlot(x + xx, y + 2, 220, 180, 240, 0.5);
  }
  if (!R.glass3d) { for (let y = p.y0; y <= p.y1; y++) R.blendPlot(p.x0 + 2, y, 230, 200, 255, 0.3); cracks(R, p, st); }
  if (p.armed && big && !p.burst) {   // the glass is ready: a glint runs up the crack
    const gy = Math.round(p.y1 - ((t * 120) % (p.y1 - p.y0)));
    for (let k = -2; k <= 2; k++) R.blendPlot(p.x0 + 12 + k, gy + k, 255, 255, 255, 0.9 - Math.abs(k) * 0.2);
  }
  if (p.flash > 0 && !R.glass3d) for (let y = p.y0; y <= p.y1; y += 2) for (let x = p.x0; x <= p.x1; x += 2) R.blendPlot(x, y, 255, 255, 255, 0.3);
}
function roofPane(R, p) {   // the tunnel roof: a band of thick glass with the tank over it
  if (!inView(R, p.x0, p.x1)) return;
  if (p.burst) { for (let x = p.x0 + 2; x < p.x1 - 1; x++) for (let y = p.y0; y <= p.y1; y++) R.plot(x, y, (x + y) % 5 ? C('#0e3a54') : C('#1a5a7a')); for (let x = p.x0 + 2; x < p.x1 - 1; x += 3) R.plot(x, p.y1 + ((x * 3) % 3), AC.glassD); return; }
  if (!R.glass3d) {
    for (let x = p.x0 + 2; x < p.x1 - 1; x++) for (let y = p.y0; y <= p.y1; y++) R.blendPlot(x, y, 170, 220, 240, y === p.y1 ? 0.6 : 0.25);
    cracks(R, { ...p, hy: p.hy ?? p.y1 - 2 }, D.paneStage(p));
  }
  if (p.glow > 0) for (let x = p.x0 + 2; x < p.x1 - 1; x++) R.blendPlot(x, p.y1, 255, 220, 120, p.glow);
  if (p.flash > 0 && !R.glass3d) for (let x = p.x0 + 2; x < p.x1 - 1; x += 2) R.blendPlot(x, p.y0 + 4, 255, 255, 255, 0.6);
}
function shark(R, s, k = 1) {   // a great white in silhouette: a long body, a high fin, a crescent tail; k: the size
  const L = Math.round(46 * k), x0 = Math.round(s.x), y0 = Math.round(s.y), d = s.dir;
  for (let i = 0; i <= L; i++) {
    const u = i / L, half = Math.round((u < 0.25 ? u / 0.25 : 1 - (u - 0.25) / 0.85) * 6 * k), x = x0 - d * i;
    for (let yy = -half; yy <= half; yy++) R.plot(x, y0 + yy, yy > half * 0.3 ? AC.sharkB : yy < -half * 0.4 ? AC.sharkD : AC.shark);
  }
  for (let j = 0; j < 9 * k; j++) R.plot(x0 - d * Math.round(14 * k + j * 0.6), y0 - Math.round(6 * k) - j, AC.sharkD);   // the dorsal fin
  for (let j = 0; j < 7 * k; j++) { R.plot(x0 - d * (L + 2), y0 - j, AC.sharkD); R.plot(x0 - d * (L + 1), y0 + j * 0.6, AC.sharkD); }   // the tail
  R.plot(x0 - d * Math.round(4 * k), y0 - 1, C('#0a0a0e'));   // the eye
}
export function drawWorld(R, S) {
  const { plot, line1, blendPlot } = R, t = R.t, O = AC.out;
  // past the world's right end (the shark tunnel's back wall): solid dark, not the start of the next row of the static layer
  if (R.cam.x + R.cam.vw > D.W) for (let y = R.cam.y; y < R.cam.y + R.cam.vh; y++) for (let x = D.W; x < R.cam.x + R.cam.vw; x++) plot(x, y, C('#05070a'));
  // the whale skeleton sways on every storm boom
  if (inView(R, D.WHALE.x0, D.WHALE.x1)) {
    const sw = Math.sin(t * 1.3) * 0.6 + (S.storm ? S.storm.k * Math.sin(t * 6) * 2 : 0), wy = D.WHALE.y;
    for (const hx of [80, 220, 340]) for (let y = 46; y < wy; y++) plot(hx + Math.round(sw * (y - 46) / (wy - 46)), y, C('#3a3a40'));   // its cables
    for (let x = D.WHALE.x0 + 30; x < D.WHALE.x1 - 20; x++) { const u = (x - D.WHALE.x0) / (D.WHALE.x1 - D.WHALE.x0), y = Math.round(wy + Math.sin(u * Math.PI) * -6 + sw); plot(x + Math.round(sw), y, AC.bone); plot(x + Math.round(sw), y + 1, AC.boneD);
      if ((x - D.WHALE.x0) % 9 === 0 && u > 0.2 && u < 0.85) { const rl = Math.round(16 * Math.sin(u * Math.PI)); for (let k = 2; k < rl; k++) plot(x + Math.round(sw) + (k > rl / 2 ? 1 : 0), y + k, k % 2 ? AC.boneD : AC.bone); } }
    for (let yy = -8; yy <= 8; yy++) for (let xx = 0; xx <= 34; xx++) if ((xx / 34) ** 2 + (yy / (8 - xx * 0.12)) ** 2 < 1 && (xx < 4 || yy > 2 || xx % 6 < 3)) plot(D.WHALE.x1 - 20 + xx + Math.round(sw), wy + 2 + yy, xx > 26 && yy > 0 ? AC.boneD : AC.bone);   // the skull
  }
  // the skylight: rain on the glass, a flash of lightning
  if (inView(R, D.SKYLIGHT.x0, D.SKYLIGHT.x1)) {
    const { x0, x1, y } = D.SKYLIGHT, fl = S.flash > 0;
    for (let yy = y; yy < y + 22; yy++) for (let x = x0; x <= x1; x++) plot(x, yy, x === x0 || x === x1 || yy === y || yy === y + 21 || (x - x0) % 22 === 0 ? AC.frame : fl ? C('#c8d8f0') : (yy - y + Math.floor(x / 3)) % 9 === 0 ? C('#1a2434') : C('#0c121c'));
    for (let i = 0; i < 26; i++) { const x = x0 + 2 + ((i * 53) % (x1 - x0 - 4)), yy = y + 1 + Math.floor((t * 60 + i * 17) % 19); blendPlot(x, yy, 160, 180, 220, 0.6); blendPlot(x, yy + 1, 160, 180, 220, 0.4); }
  }
  // the glass
  for (const id in S.panes) {
    const p = S.panes[id];
    if (p.club && !S.club) continue;
    if (p.kind === 'tank') tankPane(R, p, S);
    else if (p.kind === 'case') casePane(R, p);
    else if (p.kind === 'cyl' || p.kind === 'col') cylPane(R, p, S);
  }
  // the doors: shut (a steel door in its frame) or open (a dark doorway, lit when goons come through)
  for (const k in D.DOORS) {
    const dd = D.DOORS[k]; if (k === 'shutter' || !inView(R, dd.x - 8, dd.x + 8)) continue;
    const open = S.open[k], y0 = GROUND - 48, lit = S.doorFx.find(f => Math.abs(f.x - dd.x) < 14);
    if (k === 'dock') {   // the watertight door swings open
      const kk = S.door; if (kk > 0) for (let y = 197; y < GROUND; y++) for (let x = 2393; x < 2414; x++) { const w = Math.round(21 * (1 - kk)); plot(x, y, x < 2393 + w ? AC.steel : C('#06080c')); }
      continue;
    }
    for (let y = y0; y < GROUND; y++) for (let x = dd.x - 6; x <= dd.x + 6; x++) {
      const edge = x === dd.x - 6 || x === dd.x + 6 || y === y0;
      plot(x, y, edge ? O : open ? (lit ? ((x + y) % 5 ? C('#5a8a9a') : C('#9ad0e0')) : C('#06080c')) : (y - y0) % 12 === 0 ? AC.steelD : x === dd.x + 3 && y === GROUND - 24 ? AC.brassL : AC.steel);
    }
    if (!open) for (let x = dd.x - 6; x <= dd.x + 6; x++) plot(x, y0 - 3, (Math.floor(t * 2) % 2 && k !== 'pumpIn') ? AC.red : AC.redD);
  }
  // the pump hall: the sea through the porthole (storm waves), the junction box's buzz
  { const { x, y } = D.PORTHOLE; if (inView(R, x - 14, x + 14)) for (let yy = -12; yy <= 12; yy++) for (let xx = -12; xx <= 12; xx++) { if (xx * xx + yy * yy > 144) continue; const wv = Math.sin(xx * 0.4 + t * 2) * 3 + (S.storm ? S.storm.k * 6 : 0); plot(x + xx, y + yy, yy > wv ? (((xx + yy + Math.floor(t * 5)) % 7) === 0 ? AC.foam : AC.seaL) : C('#1a2430')); } }
  if (S.jbox && S.jbox.st === 'tell' && Math.floor(t * 14) % 2) { const { x, y } = D.JBOX; for (let k = 0; k < 4; k++) plot(x - 6 + ((k * 5 + Math.floor(t * 30)) % 12), y - 12 - (k & 1), AC.spark); }
  // the hatch over the shutter: a dark square hole in the wall, the gantry running through it
  if (inView(R, 1878, 1890)) for (let y = 100; y < 134; y++) for (let x = 1880; x <= 1888; x++) plot(x, y, x === 1880 || y === 100 ? O : C('#0a0c10'));
  // the tunnel (the club): the Ocean Tank's water moving, its moon jellies and the sharks behind the glass; the roof; the hatch
  if (S.club && inView(R, 2436, 2800)) {
    for (let i = 0; i < 18; i++) { const x = 2440 + ((i * 89 + Math.floor(t * 6)) % 360), y = 120 + ((i * 41) % 140); blendPlot(x, y, 200, 220, 255, 0.35); blendPlot(x + 1, y, 200, 220, 255, 0.25); }
    for (let i = 0; i < 8; i++) { const x = Math.round(2450 + ((i * 47 + t * 3) % 340)), y = Math.round(230 - ((t * 4 + i * 31) % 110)); for (let xx = -2; xx <= 2; xx++) blendPlot(x + xx, y, 230, 200, 250, 0.4); blendPlot(x, y - 1, 240, 220, 255, 0.5); }
    for (const s of S.sharks) if (!s.surf) shark(R, s, s.k || 1);
    for (const id in S.panes) { const p = S.panes[id]; if (p.kind === 'roof') roofPane(R, p); }
    { const x = D.SHAFT.x, ok = S.hatch; for (let y = GROUND - 30; y < GROUND; y++) for (let xx = x - 7; xx <= x + 7; xx++) if (!ok) plot(xx, y, xx === x - 7 || xx === x + 7 || y === GROUND - 30 ? O : (y % 6 === 0 ? AC.steelD : AC.steel)); plot(x, GROUND - 34, ok ? AC.green : AC.red); plot(x + 1, GROUND - 34, ok ? AC.green : AC.red); }
  }
  // harpoon bolts stuck in the walls
  for (const bt of S.bolts) { if (!inView(R, bt.x - 8, bt.x + 8)) continue; line1(bt.x - bt.d * 6, bt.y, bt.x, bt.y, AC.steelL); plot(Math.round(bt.x), Math.round(bt.y), AC.out); }
}

// ---- per frame, on the floor (lit) ----
export function drawGround(R, S) {
  const { plot, blendPlot } = R, t = R.t;
  for (const z of S.wetShow) {   // wet floor: a sheen that catches the light
    const x0 = Math.max(Math.ceil(z.x0), R.cam.x - 2), x1 = Math.min(Math.floor(z.x1), R.cam.x + R.cam.vw + 2);
    for (let x = x0; x <= x1; x++) { const k = ((x * 7 + Math.floor(t * 4)) % 11) / 11; blendPlot(x, z.y, 150, 200, 230, 0.35 + 0.25 * k); if ((x + Math.floor(t * 3)) % 6 === 0) blendPlot(x, z.y + 1, 190, 230, 250, 0.4); }
  }
  for (const j of S.jellies) {   // stranded moon jellies on the floor (step on one: it stings; kick it: it flies)
    const x = Math.round(j.x), y = Math.round(j.y);
    for (let xx = -2; xx <= 2; xx++) blendPlot(x + xx, y, 230, 200, 245, 0.85); for (let xx = -1; xx <= 1; xx++) blendPlot(x + xx, y - 1, 245, 225, 255, 0.9);
  }
  for (const f of S.flop) { const x = Math.round(f.x), y = Math.round(f.y - Math.abs(Math.sin(t * 9 + f.x)) * 2), c = AC.fish[f.c]; plot(x, y, c); plot(x + f.d, y, c); plot(x + 2 * f.d, y - 1, c); }
  for (const tl of S.tells) {   // floor tells: the drip circle under a pane she aims at, the anchor's line, the dunk's edge
    if (!(Math.floor(t * 8) % 2)) continue;
    if (tl.kind === 'drip') for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; blendPlot(Math.round(tl.x + Math.cos(a) * tl.r), Math.round(GROUND - 1 + Math.sin(a) * 2), 255, 60, 50, 0.8); }
    else if (tl.kind === 'line') for (let x = Math.min(tl.x0, tl.x1); x <= Math.max(tl.x0, tl.x1); x += 4) { plot(x, tl.y, C('#ff4a3a')); plot(x + 1, tl.y, C('#ff4a3a')); }
    else if (tl.kind === 'ring') for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2; blendPlot(Math.round(tl.x + Math.cos(a) * tl.r), Math.round(tl.y + Math.sin(a) * 3), 255, 220, 120, 0.7); }
  }
}

// ---- over the lit scene, unlit (both views: in 3D on the fx layer) ----
function waterBody(R, x0, x1, top, bottom, a = 0.32) {   // a body of water: see-through teal over what is in it, a bright moving line on top
  if (R.glass3d) return;   // (3D: a water volume, three.js)
  x0 = Math.max(Math.ceil(x0), R.cam.x - 1); x1 = Math.min(Math.floor(x1), R.cam.x + R.cam.vw + 1);
  const y0 = Math.max(Math.ceil(top), R.cam.y - 1), y1 = Math.min(bottom, R.cam.y + R.cam.vh + 1);
  for (let y = y0; y <= y1; y++) { const k = Math.min(1, (y - top) / 60); for (let x = x0; x <= x1; x++) R.blendPlot(x, y, 20, 70 + 20 * (1 - k), 100 + 20 * (1 - k), a + 0.2 * k); }
  const t = R.t;
  if (top >= R.cam.y - 2) for (let x = x0; x <= x1; x++) { const w = Math.sin(x * 0.35 + t * 3) + Math.sin(x * 0.13 - t * 1.7); R.blendPlot(x, Math.round(top + (w > 1.2 ? -1 : 0)), 200, 240, 255, w > 0.6 ? 0.85 : 0.5); }
}
export function drawFx(R, S) {
  const { plot, line1, blendPlot } = R, t = R.t;
  for (const w of S.waters) waterBody(R, w.x0, w.x1, w.y, w.y1 ?? GROUND + 2, w.a ?? 0.32);
  // leak sprays: a fan of drops from the crack down to the floor
  for (const sp of S.sprays) for (let i = 0; i < 6 + sp.st * 3; i++) {
    const ph = (t * 1.6 + i * 0.137) % 1, x = sp.x + Math.sin(i * 2.3) * (2 + sp.st * 2) * ph + sp.d * ph * 6, y = sp.y + ph * (sp.y1 - sp.y);
    blendPlot(Math.round(x), Math.round(y), 180, 220, 245, 0.7 * (1 - ph * 0.5));
  }
  // burst waves: a white crest running along the floor
  for (const s of S.surges) for (const d of s.dirs) {
    const x = s.x + d * s.r, h = s.big ? 18 : 10;
    for (let k = 0; k < 8; k++) for (let y = 0; y < h * (1 - k / 8); y++) blendPlot(Math.round(x - d * k * 2), GROUND - 1 - y, 220, 240, 255, 0.75 - k * 0.08);
  }
  // water columns out of a burst roof pane
  for (const c of S.columns) { const w = 10, k = Math.min(1, c.t / 0.2); for (let y = D.TUN.roofB; y < D.TUN.roofB + (GROUND - D.TUN.roofB) * k; y++) for (let x = c.x - w; x <= c.x + w; x++) blendPlot(x, y, 170, 220, 245, 0.45 + 0.3 * Math.sin(x + y * 0.3 + t * 20)); }
  // bubble trails: a diver's run at an ankle, Kalt's dive (and her decoy)
  for (const b of S.trails) { for (let k = 0; k < 6; k++) { const u = ((t * 2 + k / 6) % 1), x = b.x0 + (b.x - b.x0) * u; blendPlot(Math.round(x + Math.sin(t * 9 + k) * 2), Math.round(b.y - (k & 1)), 230, 250, 255, 0.8); } }
  // chum: a red slick on a catwalk, a pink cloud in the water
  for (const z of S.chum) for (let x = Math.round(z.x0); x <= z.x1; x += 2) blendPlot(x, Math.round(z.y + ((x * 3) % 3) - 1), 200, 40, 50, 0.6 * Math.min(1, z.t));
  // sharks at the surface: the dorsal fin cuts the water
  for (const s of S.sharks) if (s.surf) { const x = Math.round(s.x), y = D.TUN.tankY; for (let j = 0; j < 9; j++) for (let k = 0; k <= Math.floor((9 - j) * 0.6); k++) plot(x - s.dir * k, y - j, j < 2 ? C('#1a2228') : AC.sharkD); for (let k = 0; k < 6; k++) blendPlot(x - s.dir * (k + 4), y, 230, 250, 255, 0.7); }
  // Teague's anchor in flight and its chain back to his hand
  if (S.anchor) { const a = S.anchor, e = a.e, hx = e.J ? e.J[6].x : e.x, hy = e.J ? e.J[6].y : e.y - 20; line1(hx, hy, a.x, a.y, AC.steelD); for (const [dx, dy] of [[0, 0], [0, -1], [0, -2], [-1, -2], [1, -2], [-2, 1], [2, 1], [-1, 1], [1, 1], [0, 1], [-3, 0], [3, 0]]) plot(Math.round(a.x) + dx, Math.round(a.y) + dy, AC.steelL); }
  // Teague's brass helmet with its round faceplate (cracked, or broken and spilling)
  const T = S.teague; if (T && !T.dead && T.J) {
    const hd = T.J[0], cx = Math.round(hd.x), cy = Math.round(hd.y), f = T.face, r = 6;
    for (let yy = -r - 1; yy <= r + 1; yy++) for (let xx = -r - 1; xx <= r + 1; xx++) { const d = Math.hypot(xx, yy); if (d <= r + 0.5) plot(cx + xx, cy + yy, d > r - 0.6 ? AC.brassD : (xx * f > 1 && Math.hypot(xx - f * 2.5, yy) < 3.4) ? (S.plate.broken ? C('#1a1a20') : C('#6aa0b8')) : yy < -2 ? AC.brassL : AC.brass); }
    for (const k of [-1, 0, 1]) plot(cx + f * 2 + k, cy + r + 1, AC.brassD);
    if (!S.plate.broken) { const pk = S.plate.hp / TEAGUE.plate.hp, st = pk < 1 / 3 ? 3 : pk < 2 / 3 ? 2 : pk < 1 ? 1 : 0; for (let i = 0; i < st * 2; i++) plot(cx + f * (1 + (i % 3)), cy - 2 + i, AC.crack); }
    else if (S.plate.spill > 0) for (let i = 0; i < 4; i++) { const ph = (t * 3 + i * 0.25) % 1; blendPlot(Math.round(cx + f * (3 + ph * 4)), Math.round(cy + ph * 18), 180, 220, 245, 0.8); }
  }
  // the hero's breath under water: bubbles from his mouth
  if (S.breathShow) for (let i = 0; i < 3; i++) { const ph = (t * 1.2 + i / 3) % 1; blendPlot(Math.round(S.breathShow.x + Math.sin(t * 7 + i) * 2), Math.round(S.breathShow.y - ph * 24), 230, 250, 255, 0.8 * (1 - ph)); }
  // the bloom: jellyfish hang in the air in the slow motion
  for (const j of S.airJellies) { const x = Math.round(j.x), y = Math.round(j.y); for (let xx = -2; xx <= 2; xx++) blendPlot(x + xx, y, 240, 210, 250, 0.85); blendPlot(x, y - 1, 250, 230, 255, 0.9); blendPlot(x - 1, y + 2, 220, 180, 240, 0.6); blendPlot(x + 1, y + 2, 220, 180, 240, 0.6); }
  // the reel line from Kalt's gun to the hero
  if (S.reelLine) line1(S.reelLine[0], S.reelLine[1], S.reelLine[2], S.reelLine[3], C('#d8d0b0'));
  // her zip line up to the crane rail
  if (S.zipLine) line1(S.zipLine[0], S.zipLine[1], S.zipLine[2], S.zipLine[3], C('#c8c0a0'));
  // the pin shot going up, the chain glint
  for (const g of S.glints) { const L = 3; for (let k = -L; k <= L; k++) { blendPlot(g.x + k, g.y, 255, 255, 230, 0.9 - Math.abs(k) * 0.2); blendPlot(g.x, g.y + k, 255, 255, 230, 0.9 - Math.abs(k) * 0.2); } }
}

// ---- the hanging catwalk sections, the hoist's pallet, the bait cage: 2D on their lane, 3D as models (src/levels/aquarium/three.js) ----
export function drawCatwalk(R, c) {   // c: { x0, x1, y, chains, st: 'up' | 'tilt' | 'gone', side (the chain that broke: -1 left, 1 right), k (0..1 of the tilt) }
  if (c.st === 'gone') return;
  const { plot } = R, O = AC.out, L = c.x1 - c.x0, a = c.st === 'tilt' ? (c.k || 0) * 0.9 : 0, px = c.side < 0 ? c.x1 : c.x0, sg = c.side < 0 ? -1 : 1;
  for (const cx of c.chains) { const broken = c.st === 'tilt' && ((c.side < 0 && cx < (c.x0 + c.x1) / 2) || (c.side > 0 && cx > (c.x0 + c.x1) / 2)); const top = broken ? c.y - 16 : 4; for (let y = top; y < c.y - (broken ? 0 : 0); y++) if (!broken || y < c.y - 8) plot(cx + ((y & 2) ? 1 : 0) * 0, y, (y & 1) ? AC.steelL : AC.steelD); }
  for (let i = 0; i <= L; i++) {   // the deck, turned about the chain that holds
    const d = (c.side < 0 ? L - i : i), x = Math.round(px + sg * Math.cos(a) * d), y = Math.round(c.y + Math.sin(a) * d);
    plot(x, y, AC.steelL); plot(x, y + 1, i % 3 ? AC.steel : O); plot(x, y + 2, AC.steelD); plot(x, y + 3, O); plot(x, y - 9 + Math.round(Math.sin(a) * 0), AC.yel);
    if (i % 16 === 0) for (let k = 1; k < 9; k++) plot(x, y - k, AC.yelD);
  }
}
export function drawPallet(R, h) {   // the hoist's trolley, its cables and the pallet of cash crates
  const { plot } = R, O = AC.out, x = Math.round(h.x), py = Math.round(h.py);
  for (let xx = -5; xx <= 5; xx++) for (let yy = -2; yy <= 3; yy++) plot(x + xx, D.HOIST.y + 3 + yy, yy === -2 || Math.abs(xx) === 5 ? O : AC.yelD);
  if (!h.drop) for (const dx of [-14, 14]) for (let y = D.HOIST.y + 6; y < py - 12; y++) plot(x + Math.round(dx * (y - D.HOIST.y) / (py - D.HOIST.y)), y, AC.steelD);
  for (let yy = -12; yy <= 0; yy++) for (let xx = -20; xx <= 20; xx++) plot(x + xx, py + yy, yy === -12 || Math.abs(xx) === 20 || yy === 0 ? O : yy > -3 ? C('#6a5038') : (xx + 20) % 10 === 0 ? O : (xx + yy) % 7 === 0 ? C('#4a7a4a') : C('#8a6a44'));
}
export function drawCage(R, c) {   // the bait cage hanging from the feeding crane
  const { plot } = R, O = AC.out, x = Math.round(c.x), y = Math.round(c.y), sh = c.shake ? Math.round(Math.sin(R.t * 40)) : 0;
  for (let xx = -3; xx <= 3; xx++) for (let yy = -2; yy <= 2; yy++) plot(x + xx, D.CRANE.y + 3 + yy, Math.abs(xx) === 3 ? O : AC.steelD);
  if (!c.drop) for (let yy = D.CRANE.y + 5; yy < y - 18; yy++) plot(x + sh, yy, AC.steelL);
  for (let yy = -18; yy <= 0; yy++) for (let xx = -10; xx <= 10; xx++) if (Math.abs(xx) === 10 || yy === -18 || yy === 0 || xx % 4 === 0) plot(x + xx + sh, y + yy, Math.abs(xx) === 10 || yy === 0 ? O : AC.steel);
  for (let k = 0; k < 4; k++) plot(x - 6 + k * 4 + sh, y - 3, C('#a83a3a'));   // bait
}
