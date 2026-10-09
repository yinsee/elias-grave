// Level 7, "The Last Train": the art. Every pixel is painted in code (like Pier 9, Line Zero and St. Cecilia).
//   paint(api)              once: the static layer (the cars' insides, the roofs' car bodies, the floor band), the props mask
//   drawWorld(R, S, M)      per frame, on the wall behind everyone: the moving backdrop (sky, mountains, the Vargas Dam, poles, the
//                           valley and the Spire) on the roofs and through every window, the roof props, the moving cars (the tail
//                           stub, the last car), chandeliers, doors, the Board, the key, the metronome, the brake wheel
//   drawFx(R, S, M)         per frame, over the lit scene: gantry beams, tunnel mouths and their low roof, the warning stripes, the
//                           Gunner's red lane, glass (cracks, holes), shard rings, the steam jet, the sabre's glint
// R: { plot, line1, blendPlot, cam, t } (world coordinates); S: the run state (src/levels/train/run.js)
import { C } from '../../core/color.js';
import { text } from '../metro/paint.js';
import * as D from './data.js';

const GROUND = D.GROUND, H = 320;
const shade = (c, k) => { const f = v => Math.max(0, Math.min(255, Math.round(v * k))); return (255 << 24 | f(c >> 16 & 255) << 16 | f(c >> 8 & 255) << 8 | f(c & 255)) >>> 0; };
const mix = (a, b, k) => { const m = sh => Math.round((a >> sh & 255) * (1 - k) + (b >> sh & 255) * k); return (0xff000000 | m(16) << 16 | m(8) << 8 | m(0)) >>> 0; };
const noise2 = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; };
const n1 = i => noise2(i, 17);
const smooth1 = x => { const i = Math.floor(x), f = x - i, k = f * f * (3 - 2 * f); return n1(i) * (1 - k) + n1(i + 1) * k; };

export const TC = {
  out: C('#0e0c12'), black: C('#16151a'), body: C('#1e1d24'), bodyL: C('#2c2a34'), gold: C('#c8a040'), goldD: C('#8a6a28'), rivet: C('#4a4854'),
  roof: C('#3a3a44'), roofL: C('#4c4c58'), roofD: C('#2a2a32'), steel: C('#6a6e78'), steelD: C('#44474f'), steelL: C('#9aa0aa'),
  void: C('#06060a'), ballast: C('#2a2620'), sleeper: C('#3a2a1e'), rail: C('#8a8e96'),
  wood: C('#5a3a22'), woodD: C('#3e2716'), woodL: C('#7a5232'), crate: C('#7a5a34'), plank: C('#4a3a2a'),
  wine: C('#6a1e26'), wineD: C('#4a141a'), cream: C('#d8ccb0'), creamD: C('#b0a488'), brass: C('#c8a050'), brassD: C('#8a6a30'),
  blue: C('#28324a'), blueD: C('#1c2436'), blueL: C('#3a4662'), carpet: C('#5a1a22'), carpetL: C('#7a2a30'),
  green: C('#1e3a2a'), greenL: C('#2e5a40'), vaultW: C('#3a3e44'), vaultD: C('#2a2e34'),
  sky0: C('#070a16'), sky1: C('#1a2038'), cloud: C('#262c44'), cloudL: C('#343c58'), mount: C('#10131e'), mountL: C('#181c2a'),
  dam: C('#4a4e58'), damD: C('#363a44'), damL: C('#5e6270'), water: C('#0c1424'), spill: C('#9ab0c8'), lit: C('#e8c070'), pole: C('#1a1a22'),
  valley: C('#121820'), spire: C('#1a1e2a'), spireL: C('#f0d890'), red: C('#c02020'), white: C('#ece8e0'), glass: C('#8ab0c8'),
};

// ---- the moving backdrop: a column of sky, clouds, mountains, the dam (on the roof over the viaduct), poles, the valley and the
// Spire (phase 3); x is the world column, sc the train's travel (px), set: 'mid' (the dam) | 'ph1' | 'ph2' | 'ph3' | 'plain'
function backPix(x, y, sc, set, y0) {
  const T = TC;
  const sy = (y - y0) / Math.max(1, GROUND - y0);
  let c = mix(T.sky0, T.sky1, Math.min(1, Math.max(0, (y - 60) / 200)));
  const cx = x - sc * 0.01, cl = noise2(Math.floor(cx / 7), Math.floor(y / 5)) * 0.5 + smooth1(cx / 40 + y / 30) * 0.5;
  if (cl > 0.72) c = T.cloudL; else if (cl > 0.55) c = T.cloud;
  if (set === 'ph3') {   // the valley floor: the Spire on the horizon, its clock lit
    const sx = 2690 - sc * 0.002 * 0;   // (the Spire barely moves)
    if (Math.abs(x - sx) < 3 + Math.max(0, (y - 150) / 18) && y > 120 && y < 236) c = Math.abs(x - sx) < 2 && y > 150 && y < 160 ? T.spireL : T.spire;
  }
  // the mountains (k 0.08)
  const mx = x - sc * 0.08, mh = 190 + smooth1(mx / 70) * 40 + smooth1(mx / 23) * 10;
  if (y > mh) c = (y - mh) < 2 ? T.mountL : T.mount;
  // the Vargas Dam (k 0.2): a curved concrete wall, the spillway, the lit turbine house far below
  if (set === 'mid' || set === 'ph1') {
    const dx = ((x - sc * 0.2) % 900 + 900) % 900;
    if (dx < 420) {
      const top = 200 + Math.sin(dx / 420 * Math.PI) * -12;
      if (y > top && y < 262) { c = (y + dx) % 9 === 0 ? T.damD : mix(T.dam, T.damD, (y - top) / 70); if (dx % 60 < 6 && y > top + 6) c = noise2(dx, y) < 0.6 ? T.spill : T.damL; if (y > 250 && dx > 180 && dx < 230 && (dx + y) % 5 === 0) c = T.lit; }
      if (y >= 262) c = T.water;
    }
  }
  if (set === 'ph3') { if (y > 236) c = mix(T.valley, T.mount, 0.5); }
  // poles and rocks (k 0.5): telegraph poles, a wire between them
  const px = ((x - sc * 0.5) % 110 + 110) % 110;
  if (px < 2 && y > 196) c = T.pole;
  if (y === 202 + Math.round(Math.abs(px - 55) / 14) && set !== 'ph3') c = T.pole;
  void sy;
  return c;
}
export function backSet(S) {
  if (S.grp === 4) return 'mid';
  if (S.grp === 8) { const e = S.lenz; return !e ? 'ph1' : e.ph >= 3 || e.dead ? 'ph3' : e.ph === 2 ? 'ph2' : 'ph1'; }
  if (S.grp === 7) return 'ph3';
  return 'plain';
}
// a rect of the backdrop (a window, the roof's sky), clipped to the view
export function drawBack(R, x0, x1, y0, y1, S, set) {
  const cam = R.cam, ax = Math.max(x0, cam.x), bx = Math.min(x1, cam.x + cam.vw - 1), ay = Math.max(y0, cam.y), by = Math.min(y1, cam.y + cam.vh - 1);
  if (ax > bx || ay > by) return;
  const sc = S.sc;
  for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) R.plot(x, y, backPix(x, y, sc, set, y0));
}

// ---- the static layer ----
export function paint(api) {
  const { W } = api;
  const b = new Uint32Array(W * H), props = new Uint8Array(W * H), pud = new Uint8Array(15 * W);
  const put = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < W && y < H) b[y * W + x] = c; };
  const rect = (x0, y0, x1, y1, f) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = f(x, y); if (c) put(x, y, c); } };
  const T = TC, O = T.out, CE = D.CEIL;
  const inG = (x, g) => x >= D.GROUPS[g][0] - 4 && x <= D.GROUPS[g][1] + 4;
  const winHole = new Set();   // window panes the backdrop shows through (left 0 in the static layer)

  // ---- interiors: a ceiling, the walls by car ----
  const interior = (g, f) => { const [x0, x1] = D.GROUPS[g]; for (let x = x0 - 4; x <= x1 + 4; x++) for (let y = 0; y < GROUND; y++) { let c; if (y < CE - 30) c = T.void; else if (y < CE) c = mix(T.black, T.bodyL, (y - (CE - 30)) / 30); else c = f(x, y); put(x, y, c); } };
  // baggage: plank walls, a caged lamp, the open side door (the night rushes by: backdrop)
  interior(1, (x, y) => (x % 9 === 0 ? T.woodD : (y % 23 === 0 ? T.plank : (noise2(x, y >> 2) < 0.08 ? T.woodD : T.wood))));
  // dining: wine-red wainscot under cream panels, brass rails
  interior(2, (x, y) => y > 246 ? ((x % 14 === 0) ? T.wineD : T.wine) : y > 242 ? T.brass : (x % 44 === 0 ? T.creamD : T.cream));
  // sleepers: blue lacquer panels
  interior(3, (x, y) => (x % 36 === 0 || y % 34 === 0) ? T.blueD : (y > 250 ? T.blueD : T.blue));
  // dome: a low wall under curved glass; the bar; armchairs are objects
  interior(5, (x, y) => y < 200 ? 0 : y < 204 ? T.brass : (x % 22 === 0 ? T.blueD : T.blueL));
  // vault: riveted steel
  interior(6, (x, y) => (x % 16 === 0 || y % 20 === 0) ? T.vaultD : ((x + y) % 7 === 0 ? T.rivet : T.vaultW));
  // workshop: warm wood, shelves of clocks
  interior(7, (x, y) => (y % 30 === 0 && y > 190) ? T.woodD : (x % 18 === 0 ? T.woodD : T.woodL));
  // the dome's glass: the backdrop shows through (0 here); steel ribs are drawn live
  for (let x = D.GROUPS[5][0]; x <= D.GROUPS[5][1]; x++) for (let y = 120; y < 200; y++) b[y * W + x] = 0;
  // the car ends between interiors: a gangway door frame
  for (const g of [1, 2, 3, 5, 6, 7]) for (const ex of [D.GROUPS[g][0] - 4, D.GROUPS[g][1] + 4]) rect(ex - 3, CE, ex + 3, GROUND - 1, (x, y) => x === ex - 3 || x === ex + 3 ? O : T.body);

  // windows: frames, the pane holes (the scroll shows through)
  const window_ = (cx, y0, y1, w, frame) => { for (let y = y0; y <= y1; y++) for (let x = cx - w; x <= cx + w; x++) { const edge = x === cx - w || x === cx + w || y === y0 || y === y1; if (edge) put(x, y, frame); else { b[y * W + x] = 0; winHole.add(y * W + x); } } };
  for (const x of [340, 520]) window_(x, 206, 232, 9, T.steelD);   // the baggage car's barred windows
  for (const x of D.DIN_WIN) window_(x, 214, 246, 12, T.brass);
  for (let x = 900; x < 1130; x += 36) window_(x + 18, 204, 226, 8, T.steelD);   // the sleeper corridor's windows (the compartments' doors are in the wall below them? no: the corridor runs along the windows)
  window_(2318, 196, 236, 22, T.woodD);   // the workshop's window on the valley
  // the baggage car's side door: open on the night (a hole)
  for (let y = 200; y < GROUND; y++) for (let x = D.SIDE_DOOR.x0; x <= D.SIDE_DOOR.x1; x++) { b[y * W + x] = 0; winHole.add(y * W + x); }
  rect(D.SIDE_DOOR.x0 - 3, 198, D.SIDE_DOOR.x0 - 1, GROUND - 1, () => T.steelD); rect(D.SIDE_DOOR.x1 + 1, 198, D.SIDE_DOOR.x1 + 3, GROUND - 1, () => T.steelD);
  const pre = b.slice();   // from here on: solid props (3D blocks)

  // ---- props inside the cars ----
  // baggage: the axe's bracket, the crate mezzanine, the sign
  text(put, 'IN CASE OF FIRE', 352, 214, T.red);
  rect(D.CRATE_DECK.x0, D.CRATE_DECK.y, D.CRATE_DECK.x1, GROUND - 1, (x, y) => y === D.CRATE_DECK.y || x === D.CRATE_DECK.x0 || x === D.CRATE_DECK.x1 ? O : ((x - D.CRATE_DECK.x0) % 13 === 0 || (y - D.CRATE_DECK.y) % 13 === 0) ? T.woodD : T.crate);
  // dining: tables with white cloths
  for (const t of D.TABLES) { rect(t.x0, D.TABLE_TOP, t.x1, D.TABLE_TOP + 3, (x, y) => y === D.TABLE_TOP ? T.white : T.creamD); for (const lx of [t.x0 + 3, t.x1 - 3]) rect(lx, D.TABLE_TOP + 4, lx + 1, GROUND - 1, () => T.woodD); }
  // the galley: a stove, the cleaver rack, the steam valve, a pass-through
  rect(D.GALLEY.x0 + 4, GROUND - 26, D.GALLEY.x0 + 30, GROUND - 1, (x, y) => y === GROUND - 26 || x === D.GALLEY.x0 + 4 ? O : (x + y) % 6 === 0 ? T.steelD : T.steel);
  rect(840, 222, 852, 224, () => T.woodD);
  rect(D.STEAM.x - 3, D.STEAM.y - 3, D.STEAM.x + 3, D.STEAM.y + 3, (x, y) => Math.hypot(x - D.STEAM.x, y - D.STEAM.y) > 3 ? 0 : Math.hypot(x - D.STEAM.x, y - D.STEAM.y) > 2 ? O : T.red);
  for (let y = 190; y < D.STEAM.y; y++) { put(D.STEAM.x - 1, y, T.steelD); put(D.STEAM.x, y, T.steel); }
  // sleepers: the compartment doors (wall lane), the luggage trolley, the emergency cabinet
  for (const cx of D.COMPS) { rect(cx - 9, 228, cx + 9, GROUND - 1, (x, y) => x === cx - 9 || x === cx + 9 || y === 228 ? O : (x === cx - 7 || x === cx + 7) ? T.woodD : T.wood); put(cx + 6, 256, T.brass); }
  text(put, '3', D.NERO_COMP - 1, 232, T.brass);
  rect(D.TROLLEY.x0, D.TROLLEY.top, D.TROLLEY.x1, GROUND - 1, (x, y) => y === D.TROLLEY.top || x === D.TROLLEY.x0 || x === D.TROLLEY.x1 ? O : (y - D.TROLLEY.top) % 6 === 0 ? T.steelD : T.crate);
  rect(1120, 214, 1134, 240, (x, y) => x === 1120 || x === 1134 || y === 214 || y === 240 ? O : y < 220 ? T.red : T.steelD);
  // dome: the bar (the Board cowers behind it), the clock over it
  rect(D.BAR.x0, D.BAR.top, D.BAR.x1, GROUND - 1, (x, y) => y === D.BAR.top || x === D.BAR.x0 ? O : y < D.BAR.top + 3 ? T.brass : (x % 12 === 0 ? T.woodD : T.wood));
  for (let x = D.BAR.x0 + 4; x < D.BAR.x1; x += 7) rect(x, D.BAR.top - 30, x + 2, D.BAR.top - 22, (xx, y) => y === D.BAR.top - 30 ? T.white : T.greenL);   // bottles on a shelf
  // vault: the safe, the katana stand, the rack
  rect(D.SAFE.x - 14, D.SAFE.y - 30, D.SAFE.x + 14, GROUND - 1, (x, y) => x === D.SAFE.x - 14 || x === D.SAFE.x + 14 || y === D.SAFE.y - 30 ? O : x > D.SAFE.x - 10 && x < D.SAFE.x + 10 && y > D.SAFE.y - 26 && y < GROUND - 4 ? T.black : T.steelD);
  rect(D.SAFE.x + 15, D.SAFE.y - 28, D.SAFE.x + 26, GROUND - 3, (x, y) => x === D.SAFE.x + 26 ? O : T.steel);   // its open door
  rect(D.VAULT_LADDER - 4, CE - 20, D.VAULT_LADDER + 4, GROUND - 1, (x, y) => x === D.VAULT_LADDER - 4 || x === D.VAULT_LADDER + 4 ? T.steelL : y % 7 === 0 ? T.steel : 0);
  // workshop: the bench, clocks on the wall
  rect(D.BENCH.x0, D.BENCH.top, D.BENCH.x1, GROUND - 1, (x, y) => y === D.BENCH.top ? O : y < D.BENCH.top + 4 ? T.woodL : (x === D.BENCH.x0 + 3 || x === D.BENCH.x1 - 3) ? T.woodD : 0);
  text(put, 'BELL & SONS', 2232, 192, T.brass);
  // ---- clocks (Bell & Sons, every one stopped at 3:17): the dome over the bar, the safe door, the workshop's wall ----
  const clock = (cx, cy, r) => {
    rect(cx - r, cy - r, cx + r, cy + r, (x, y) => { const d = Math.hypot(x - cx, y - cy); return d > r + 0.4 ? 0 : d > r - 1 ? T.brassD : T.cream; });
    const hand = (a, l) => { for (let k = 0; k <= l; k++) put(cx + Math.round(Math.sin(a) * k), cy - Math.round(Math.cos(a) * k), O); };
    hand((3 + 17 / 60) / 12 * Math.PI * 2, r * 0.5); hand(17 / 60 * Math.PI * 2, r * 0.8);
  };
  clock(D.DOME_CLOCK.x, D.DOME_CLOCK.y, 6); clock(D.VAULT_CLOCK.x, D.VAULT_CLOCK.y, 5);
  for (const [cx, cy, r] of [[2236, 214, 5], [2256, 208, 6], [2276, 216, 4], [2372, 210, 6], [2392, 220, 5], [2400, 200, 4]]) clock(cx, cy, r);

  // ---- the floor band: the car floors inside; outside, the car roofs (riveted plates) over the black car bodies with gold trim ----
  const roofX = x => (x >= 0 && x <= 300) || (x >= D.CARA.x0 && x <= D.CARA.x1) || (x >= D.CARB.x0 && x <= D.CARB.x1) || (x >= D.VROOF.x0 && x < D.VROOF.x1) || (x >= D.PLATFORM.x0 - 2 && x < W);
  const roofSec = x => inG(x, 0) || inG(x, 4) || x >= 2420;
  for (let x = 0; x < W; x++) for (let y = GROUND; y < H; y++) {
    const d = y - GROUND; let c;
    if (roofSec(x)) {
      if (roofX(x)) c = d === 0 ? T.roofL : d < 4 ? ((x % 24 === 0) ? T.rivet : T.roof) : d < 6 ? T.goldD : d < 8 ? T.gold : (d > 20 && d < 30 && (x % 40) > 6 && (x % 40) < 30) ? (d === 21 || d === 29 ? T.goldD : T.black) : T.body;
      else c = d < 20 ? T.void : d < 24 ? T.ballast : (x % 8 < 3 ? T.sleeper : T.ballast);   // the gap: the track far below
      if (x >= D.PLATFORM.x0 - 2 && d < 3) c = T.steelD;
    } else c = inG(x, 1) ? (d === 0 ? T.woodL : (x >> 3) % 2 ? T.wood : T.woodD) : inG(x, 2) ? (d === 0 ? T.brass : ((x >> 2) + d) % 5 === 0 ? T.carpetL : T.carpet) : inG(x, 3) ? (d === 0 ? T.steel : d % 6 === 0 ? T.blueD : T.carpet)
      : inG(x, 5) ? (d === 0 ? T.brass : (x + d) % 11 === 0 ? T.blueD : T.blue) : inG(x, 6) ? (d === 0 ? T.steelL : (x % 10 === 0 || d % 5 === 0) ? T.vaultD : T.steelD) : (d === 0 ? T.woodL : (x >> 4) % 2 ? T.wood : T.woodD);
    b[y * W + x] = c;
  }
  // the roof sections above the roof line stay 0: the backdrop is drawn live
  for (let x = 0; x < W; x++) if (roofSec(x)) for (let y = 0; y < GROUND; y++) b[y * W + x] = 0;
  for (let i = 0; i < b.length; i++) if (b[i] !== pre[i] && i < GROUND * W && b[i]) props[i] = 1;
  return { b, props, bg: pre, pud, winl: [], holes: winHole };
}

// the window holes the backdrop shows through: [x0, x1, y0, y1, group]
export const WINDOWS = [
  [332, 348, 207, 231, 1], [512, 528, 207, 231, 1], [D.SIDE_DOOR.x0, D.SIDE_DOOR.x1, 200, GROUND - 1, 1],
  ...D.DIN_WIN.map(x => [x - 11, x + 11, 215, 245, 2]),
  ...Array.from({ length: 7 }, (_, i) => [900 + i * 36 + 11, 900 + i * 36 + 25, 205, 225, 3]).filter(w => w[1] < 1140),
  [D.GROUPS[5][0] - 4, D.GROUPS[5][1] + 4, 120, 199, 5],
  [2297, 2339, 197, 235, 7],
];

// ---- per frame: the wall layer ----
export function drawWorld(R, S, M) {
  const { plot, line1, cam } = R, t = R.t, T = TC, O = T.out;
  const vx0 = cam.x - 8, vx1 = cam.x + cam.vw + 8, inView = (a, b) => b >= vx0 && a <= vx1;
  const set = backSet(S);
  const rect = (x0, y0, x1, y1, f) => { for (let y = y0; y <= y1; y++) for (let x = Math.max(x0, vx0); x <= Math.min(x1, vx1); x++) { const c = f(x, y); if (c) plot(x, y, c); } };
  // the backdrop: the roofs' sky, every window (the tunnel's wall when the train is in one)
  const tunnel = S.sweeps.find(sw => sw.kind === 'tunnel');
  const back = (x0, x1, y0, y1) => {
    drawBack(R, x0, x1, y0, y1, S, set);
    if (tunnel || S.dark > 0) rect(x0, y0, x1, y1, (x, y) => { const inside = S.dark > 0 || (x <= tunnel.x && (tunnel.exit == null || x > tunnel.exit)); return inside ? ((x + Math.floor(S.sc)) % 23 === 0 || y % 9 === 0 ? C('#1a1614') : C('#0c0a0a')) : 0; });
  };
  const roof = g => { const [a, b] = D.GROUPS[g]; if (inView(a - 8, b + 8)) back(Math.max(a - 8, vx0), Math.min(b + 8, vx1), Math.max(0, cam.y), GROUND - 1); };
  if (S.grp === 0) roof(0); if (S.grp === 4) roof(4); if (S.grp === 8) back(Math.max(2420, vx0), vx1, Math.max(0, cam.y), GROUND - 1);
  for (const w of WINDOWS) if (w[4] === S.grp && inView(w[0], w[1])) back(w[0], w[1], w[2], w[3]);
  if (S.grp === 1) for (const w of WINDOWS.slice(0, 2)) for (let x = w[0] + 3; x < w[1]; x += 4) line1(x, w[2], x, w[3], T.steelD);   // the bars
  if (S.grp === 5) for (let x = D.GROUPS[5][0]; x <= D.GROUPS[5][1]; x += 22) if (inView(x, x)) { line1(x, 120, x, 199, T.steelD); line1(x + 1, 120, x + 1, 199, T.steel); }   // the dome's ribs
  if (S.grp === 5) for (const y of [150, 172, 199]) line1(Math.max(D.GROUPS[5][0], vx0), y, Math.min(D.GROUPS[5][1], vx1), y, T.steelD);

  // ---- roof_front: the tender (a wall of coal), the firebox's glow, the vents, the hatch ----
  if (S.grp === 0) {
    rect(0, 220, D.TENDER, GROUND - 1, (x, y) => x === D.TENDER ? O : noise2(x, y) < 0.3 ? C('#2a2a30') : C('#121216'));
    for (let k = 0; k < 6; k++) plot(4 + ((k * 7 + Math.floor(t * 12)) % 12), 216 - (Math.floor(t * 30 + k * 5) % 16), C('#ff8a30'));
  }
  const vent = x => rect(x, GROUND - 14, x + 14, GROUND - 1, (xx, y) => xx === x || xx === x + 14 || y === GROUND - 14 ? O : (y % 3 === 0 ? T.steelD : T.steel));
  for (const c of D.COVER.slice(0, 6)) if (grpOf(c.x0) === S.grp && inView(c.x0, c.x1)) vent(c.x0);
  if (S.grp === 0) { const open = S.w.r1 && S.w.r1.out && !M.queued('r1') && !(R && 0); rect(D.HATCH - 9, GROUND - 3, D.HATCH + 9, GROUND - 1, (x, y) => y === GROUND - 3 ? O : open ? T.steelL : T.steelD); }
  // ladders at the car ends (roof_mid, the boss roof)
  const ladder = x => { for (let y = GROUND - 8; y < GROUND + 18; y++) { plot(x - 3, y, T.steelL); plot(x + 3, y, T.steelL); if (y % 4 === 0) line1(x - 3, y, x + 3, y, T.steel); } };
  if (S.grp === 4) for (const x of D.LADDERS_MID) ladder(x);
  if (S.grp === 8) for (const x of D.BOSS_LADDERS) ladder(x);
  // ---- roof_mid: the coupling; the tail stub (the dome car's front, a mover) ----
  if (S.grp === 4) {
    const sx = M.stubX();
    roofBand(R, sx, D.GROUPS[4][1] + 8, cam, true);
    // the dome's glass rising behind the stub (it cracks under him at the end)
    rect(sx + 30, GROUND - 16, D.GROUPS[4][1] + 8, GROUND - 1, (x, y) => (x - sx) % 18 === 0 || y === GROUND - 16 ? T.steelD : S.crack ? (noise2(x, y + Math.floor(t * 20)) < 0.2 ? T.white : T.glass) : T.glass);
    if (S.stub.st === 'idle') { rect(D.CARB.x1, GROUND + 6, sx, GROUND + 10, (x, y) => y === GROUND + 6 ? O : T.steelD); plot(D.CARB.x1 + 10, GROUND + 4, T.brass); }
    else for (let k = 0; k <= 6; k++) plot(D.CARB.x1 + Math.round(k * (sx - D.CARB.x1) / 6), GROUND + 12 + Math.round(Math.sin(k / 6 * Math.PI) * 6), T.steel);   // the cut chain hangs
  }
  // ---- the boss roof: the gangway plate, the last car (its front edge breathes in phase 3), the lantern, the metronome, the platform ----
  if (S.grp === 8) {
    const lx = D.VROOF.x1 + (S.plate ? 0 : S.lgap);
    roofBand(R, S.plate ? D.PLATE.x1 : lx, D.PLATFORM.x0, cam, false);
    if (S.plate) rect(D.PLATE.x0, GROUND, D.PLATE.x1, GROUND + 3, (x, y) => y === GROUND ? T.steelL : T.steelD);
    else { const n = 8, sag = Math.max(0, 14 - S.lgap / 8); for (let k = 0; k <= n; k++) plot(D.VROOF.x1 + Math.round(k * S.lgap / n), GROUND + 10 + Math.round(Math.sin(k / n * Math.PI) * sag), (k % 2) ? T.steelL : T.steel); }
    // the lantern: Bell & Sons' clock behind its glass (3:17), the brass metronome on top, its pendulum on the beat
    const L = D.LANTERN, lxx = L.x;
    rect(lxx - 8, L.y, lxx + 8, GROUND - 1, (x, y) => x === lxx - 8 || x === lxx + 8 || y === L.y ? O : T.brassD);
    rect(lxx - 6, L.y + 2, lxx + 6, L.y + 12, () => C('#f0d090'));
    { const cx = lxx, cy = L.y + 7; plot(cx, cy, O); line1(cx, cy, cx + 2, cy - 2, O); line1(cx, cy, cx + 3, cy + 1, O); }
    const bc = S.bc, ph = S.lenz && !S.lenz.hold && !(bc.silent > 0) && !(S.end) ? ((bc.n + (bc.t * bc.bpm / 60)) % 2) : 0.5;
    const ang = (S.end ? 0 : Math.sin(ph * Math.PI) * 0.6 * (ph < 1 ? 1 : -1)), mx = lxx, my = L.y - 1;
    rect(mx - 4, my - 10, mx + 4, my, (x, y) => (Math.abs(x - mx) <= (y - (my - 10)) * 0.4 + 1) ? T.brass : 0);
    line1(mx, my - 2, mx + Math.round(Math.sin(ang) * 9), my - 2 - Math.round(Math.cos(ang) * 9), O);
    // the rear platform: the brake wheel; the last car's door (open at the end)
    rect(D.PLATFORM.x0, GROUND - 30, D.PLATFORM.x0 + 2, GROUND - 1, () => T.steelD);
    { const bx = D.BRAKE, by = GROUND - 22, a = S.end && S.end.ph === 'brake' ? t * 6 : 0; for (let k = 0; k < 16; k++) { const q = k / 16 * Math.PI * 2; plot(bx + Math.round(Math.cos(q) * 6), by + Math.round(Math.sin(q) * 6), T.steelL); } for (let k = 0; k < 3; k++) { const q = a + k * 2.1; line1(bx, by, bx + Math.round(Math.cos(q) * 6), by + Math.round(Math.sin(q) * 6), T.steel); } line1(bx, by, bx, GROUND - 1, T.steelD); }
    rect(D.REAR_DOOR - 8, GROUND - 40, D.REAR_DOOR + 2, GROUND - 1, (x, y) => S.doorOpen ? (x === D.REAR_DOOR - 8 ? O : C('#f0b060')) : (x === D.REAR_DOOR - 8 || x === D.REAR_DOOR + 2 || y === GROUND - 40 ? O : T.body));
  }
  // ---- inside: doors that open (a spawn, a passage), the chandeliers, compartment 3, the dome's Board, the key, the ledger ----
  for (const d of S.doors) { if (!inView(d.x - 10, d.x + 10)) continue; const k = 1 - Math.min(1, d.t / 0.8); if (k <= 0) continue; for (let y = GROUND - 44; y < GROUND; y++) for (let x = d.x - 6; x <= d.x + 6; x++) R.blendPlot(x, y, 240, 190, 120, 0.5 * k); }
  if (S.grp === 2) for (const c of S.chand) {
    const x = Math.round(c.x + (c.st === 'up' ? c.sw : 0)), y = Math.round(c.y);
    if (c.st === 'up') line1(Math.round(c.x), D.CEIL, x, y - 4, T.brassD);
    if (c.st === 'down') { for (let k = -8; k <= 8; k++) plot(x + k, GROUND - 2 - (Math.abs(k) % 3), k % 2 ? T.brass : T.white); continue; }
    for (let k = -6; k <= 6; k++) { plot(x + k, y, T.brass); if (k % 3 === 0) { plot(x + k, y + 1, C('#fff0c0')); plot(x + k, y + 2, C('#fff0c0')); } }
    line1(x - 4, y - 3, x + 4, y - 3, T.brass);
  }
  if (S.grp === 3 && S.comp3) rect(D.NERO_COMP - 8, 229, D.NERO_COMP + 8, GROUND - 1, () => C('#3a2a1a'));
  if (S.grp === 5) {   // the Board behind the bar: three heads that duck and peek
    for (const [i, p] of D.BOARD.entries()) {
      const peek = S.board === 'talk' || S.board === 'done' ? 0 : S.board === 'scream' ? -2 : Math.round(Math.max(0, Math.sin(t * 1.3 + i * 2)) * 4);
      const hx = p.x, hy = D.BAR.top - 5 - peek;
      for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 9) plot(hx + x, hy + y, y < -1 ? (p.id === 'kern' ? C('#d0c8c0') : p.id === 'mayor' ? C('#3a2a20') : C('#8a8a8a')) : C('#d8b898'));
      if (p.id === 'aldane') { plot(hx - 1, hy, O); plot(hx + 1, hy, O); }   // his glasses
      if (p.id === 'kern') for (let x = -5; x <= 5; x++) plot(hx + x, hy + 4, C('#e8e0d0'));   // her fur
    }
    if (S.keyOut && !S.keyTaken) { const kx = D.KEY.x, ky = D.KEY.y - 2; for (let x = 0; x < 6; x++) plot(kx + x, ky, T.brass); plot(kx, ky - 1, T.brass); plot(kx + 5, ky + 1, T.brass); }
  }
  if (S.grp === 6 && !S.ledger) rect(D.LEDGER.x - 5, GROUND - 9, D.LEDGER.x + 5, GROUND - 4, (x, y) => y === GROUND - 9 ? O : C('#6a1a1a'));
  if (S.grp === 7) {   // the gramophone's horn on the bench, a pipe that still smokes
    const g = D.GRAMO; rect(g.x - 6, D.BENCH.top - 6, g.x + 6, D.BENCH.top - 1, (x, y) => y === D.BENCH.top - 6 ? O : T.woodD);
    for (let k = 0; k < 12; k++) { const r = 1 + k * 0.5; plot(g.x + 3 + k, D.BENCH.top - 8 - k, T.brass); plot(g.x + 3 + k, D.BENCH.top - 8 - k - Math.round(r), T.brass); }
    if (S.needle) plot(g.x, D.BENCH.top - 7, T.white);
    rect(2296, D.BENCH.top - 2, 2304, D.BENCH.top - 1, () => C('#3a2210'));
    for (let k = 0; k < 6; k++) R.blendPlot(2300 + Math.round(Math.sin(t * 1.5 + k) * 2), D.BENCH.top - 4 - k * 3 - Math.floor(t * 6) % 3, 200, 200, 200, 0.25);
  }
}
const grpOf = x => D.GROUPS.findIndex(g => x >= g[0] - 4 && x <= g[1] + 4);
// a car roof drawn live (the tail stub, the last car): the roof plates over the black body with its gold trim
function roofBand(R, x0, x1, cam, glass) {
  const T = TC, O = T.out;
  for (let x = Math.max(Math.round(x0), cam.x - 4); x <= Math.min(x1, cam.x + cam.vw + 4); x++) for (let d = 0; d < 40; d++) {
    const c = x === Math.round(x0) ? O : d === 0 ? T.roofL : d < 4 ? (x % 24 === 0 ? T.rivet : T.roof) : d < 6 ? T.goldD : d < 8 ? T.gold : (glass && d > 14 && d < 30 && (x % 30) > 4) ? (d === 15 ? T.goldD : C('#c8a050')) : T.body;
    R.plot(x, GROUND + d, c);
  }
}

// ---- per frame: over the lit scene ----
export function drawFx(R, S, M) {
  const { plot, line1, blendPlot, cam } = R, t = R.t, T = TC, O = T.out;
  const vx0 = cam.x - 8, vx1 = cam.x + cam.vw + 8;
  // gantries: a steel truss (its legs off the train) with the beam at y 236-262; tunnels: the mouth, the low roof inside
  for (const sw of S.sweeps) {
    if (sw.kind === 'gantry') {
      const x = Math.round(sw.x);
      if (x < vx0 - 20 || x > vx1 + 20) continue;
      for (let y = Math.max(cam.y, 120); y < 262; y++) for (let k = -5; k <= 5; k++) { const beam = y >= 236; const c = beam ? (k === -5 || k === 5 || y === 236 || y === 261 ? O : ((y + k) % 6 === 0 ? T.steelD : T.steel)) : (Math.abs(k) === 5 || (y + k * 3) % 10 === 0 ? T.steelD : 0); if (c) plot(x + k, y, c); }
      for (let k = 0; k < 10; k++) blendPlot(x - 6 - k, 240 + (k * 7) % 20, 220, 220, 230, 0.12 * (1 - k / 10));   // a speed smear
    } else {
      const x1 = Math.min(Math.round(sw.x), vx1), x0 = Math.max(sw.exit == null ? vx0 : Math.round(sw.exit), vx0);
      for (let x = x0; x <= x1; x++) for (let y = Math.max(cam.y, 0); y < D.SWEEP.tunnel.ceil; y++) plot(x, y, (x + Math.floor(S.sc)) % 17 === 0 || y % 11 === 0 ? C('#241e1a') : C('#100c0a'));
      for (let y = Math.max(cam.y, 0); y < D.SWEEP.tunnel.ceil + 2; y++) for (let k = 0; k < 4; k++) plot(Math.round(sw.x) - k, y, k === 0 ? O : C('#3a322a'));   // the mouth's arch
    }
  }
  // the warning: the roof's front edge flashes red (the bell or the whistle), a stripe across the roof on Easy
  for (const w of S.warns) { const on = Math.floor(t * 8) % 2; if (!on) continue; const g = D.GROUPS[S.grp]; for (let y = GROUND - 1; y <= GROUND + 1; y++) for (let x = Math.max(g[0], vx0); x <= Math.min(g[0] + (M.G.diffSel === 0 ? (g[1] - g[0]) : 30), vx1); x += (M.G.diffSel === 0 ? 3 : 1)) plot(x, y, w.kind === 'gantry' ? T.red : C('#e0a020')); }
  // the Gunner's wind-up: a red stripe down the lane from his muzzle; the drum
  for (const w of S.gunWarn) { const e = w.e; if (e.dead || !e.J) continue; const h = e.J[6]; if (Math.floor(t * 12) % 2) for (let k = 8; k < 160; k += 3) plot(Math.round(h.x + e.face * k), GROUND - 1, T.red); }
  for (const e of M.G.enemies) if (!e.dead && e.J && (e.hv === 'gunner' || (e.kind === 'grau' && e.ph === 1))) { const h = e.J[6]; for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y <= 4) plot(Math.round(h.x + e.face * 3 + x), Math.round(h.y + 3 + y), x * x + y * y > 2 ? O : T.steelD); }
  // glass: cracks and holes (the dining windows, the dome's panes)
  for (const p of S.panes) {
    if ((p.kind === 'window') !== (S.grp === 2) && !(p.kind === 'roof' && S.grp === 5)) continue;
    if (p.broken) { for (let y = p.y0; y <= p.y1; y += 2) for (let x = p.x0; x <= p.x1; x += 3) if (noise2(x, y) < 0.15) plot(x, y, T.white); continue; }
    for (const c of p.cracks) for (let k = 0; k < 6; k++) { plot(c.x + k, c.y + Math.round(k * 0.5), C('#e0f0ff')); plot(c.x - k, c.y + Math.round(k * 0.3), C('#e0f0ff')); }
    if (p.kind === 'roof') for (let x = p.x0; x <= p.x1; x += 5) blendPlot(x, p.y0 + 2, 220, 240, 255, 0.25);
  }
  // shard rings and Grau's glass rings: a circle on the floor shrinking to the drop
  for (const s of [...S.shards, ...S.rings]) { const r = Math.round(s.r * (0.5 + 0.5 * Math.min(1, s.t / 0.6))); for (let k = 0; k < 24; k++) { const q = k / 24 * Math.PI * 2; plot(Math.round(s.x + Math.cos(q) * r), Math.round(GROUND + 1 + Math.sin(q) * r * 0.25), k % 2 ? C('#e0f0ff') : T.red); } }
  // the steam jet
  if (S.steam > 0 && S.grp === 2) for (let k = 0; k < 40; k++) blendPlot(D.STEAM.x - k, D.STEAM.y + Math.round(Math.sin(t * 30 + k) * (k / 10)), 240, 240, 240, 0.5 * (1 - k / 40));
  // the sabre's glint on beat 2 (a white line along the blade)
  if (S.glint && S.glint.e.J && !S.glint.e.dead) { const g = M.G.eWeapon(S.glint.e, S.glint.e.J), k = 1 - S.glint.t / 0.25; const x = g.x + (g.tx - g.x) * k, y = g.y + (g.ty - g.y) * k; plot(Math.round(x), Math.round(y), 0xffffffff); plot(Math.round(x) + 1, Math.round(y), 0xffffffff); }
}
