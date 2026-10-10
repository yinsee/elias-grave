// Level 6, "The Palm House": the art. Every pixel is painted in code (like the other levels).
//   paint(api)        once: the static world layer (stat), the props mask, the puddle mask
//   drawWorld(R, S)   per frame, on the wall behind everyone: guests, the waiter, chandeliers, champagne towers, statues, misting pipes,
//                     doors, the desk, the phone, the clock, Hale's office, the lantern, a dropped shield
//   drawFx(R, S)      per frame, over the lit scene (unlit): glass and roof panes, the floor mist, steam, sniper dots and their lasers,
//                     floor tells (shards, a chandelier's shadow, the lantern, a charge's path, wet zones before a shock), slip sheen
// R: { plot, line1, blendPlot, cam, t } (world coordinates); S: the run state (src/levels/palmhouse/run.js)
import { C } from '../../core/color.js';
import { text } from '../metro/paint.js';
import * as D from './data.js';

const GROUND = D.GROUND, H = 320, STREET = 14;
const shade = (c, k) => { const f = v => Math.max(0, Math.min(255, Math.round(v * k))); return (255 << 24 | f(c >> 16 & 255) << 16 | f(c >> 8 & 255) << 8 | f(c & 255)) >>> 0; };
const mix = (a, b, k) => { const m = sh => Math.round((a >> sh & 255) * (1 - k) + (b >> sh & 255) * k); return (0xff000000 | m(16) << 16 | m(8) << 8 | m(0)) >>> 0; };
const noise2 = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; };

export const PC = {
  out: C('#14121c'),
  sky0: C('#0a0e1c'), sky1: C('#1c2640'), cloud: C('#283250'), far: C('#141a28'), farL: C('#1e2638'), river: C('#0e1422'),
  snow: C('#dce6f2'), snowD: C('#b4c2d6'), snowL: C('#f4f8fc'), hedge: C('#1e3a2a'), hedgeD: C('#142a1e'),
  red: C('#9a1e22'), redD: C('#6a1216'), gold: C('#d8a840'), goldD: C('#a07a28'), goldL: C('#f0d080'),
  cream: C('#d8ccb0'), creamD: C('#c0b296'), panel: C('#b8a888'), parq: C('#7a5030'), parqD: C('#5e3c22'), parqL: C('#8e6038'),
  glass: C('#1c3438'), glassL: C('#2e5050'), leaf: C('#2e6a3a'), leafD: C('#1e4a28'), leafL: C('#4a8a4a'), terra: C('#a85a34'), terraD: C('#7a3e22'),
  tile: C('#4a5a50'), tileD: C('#3a4840'), wood: C('#5a3a22'), woodD: C('#3e2716'), woodL: C('#7a5232'), green: C('#2a5a3a'),
  brick: C('#6a3a2c'), brickD: C('#4e2a20'), iron: C('#2a2e36'), ironL: C('#4a505c'), ironD: C('#16181e'), coal: C('#1a1a1e'),
  navy: C('#28345a'), van: C('#2a3450'), vanL: C('#3e4a6c'), white: C('#ece8e0'), stone: C('#a8a49a'), stoneD: C('#8a867c'), stoneL: C('#c4c0b4'),
  water: C('#2a4a5a'), waterL: C('#4a7a8a'), carpet: C('#4a2028'), carpetD: C('#3a161e'),
  // these glow (src/legacy.js EMIT): warm windows, the lamp's green
  winW: C('#ffd890'), lampG: C('#7aff9a'),
};

// ---- the static layer ----
export function paint(api) {
  const { W, LAMP_GLASS, WIN_A, WIN_B, WIN_C } = api;
  const b = new Uint32Array(W * H), props = new Uint8Array(W * H), pud = new Uint8Array((STREET + 1) * W);
  const put = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < W && y < H) b[y * W + x] = c; };
  const rect = (x0, y0, x1, y1, f) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = f(x, y); if (c) put(x, y, c); } };
  const O = PC.out, T = (s, x, y, c, k) => text((xx, yy, cc) => put(xx, yy, cc), s, x, y, c, k);
  const sky = (x, y) => {   // a snowy night: clouds, the city across the river, police HQ, far lights
    const n = noise2(x >> 3, y >> 3) * 0.6 + noise2(x >> 4, y >> 2) * 0.4;
    let c = n > 0.74 ? PC.cloud : mix(PC.sky0, PC.sky1, y / 220);
    if (y > 190) { c = PC.river; if ((x * 7 + y * 3) % 23 === 0 && y < 214) c = WIN_C; }
    else if (y > 150) { const bx = Math.floor(x / 13), top = 150 + Math.floor(noise2(bx, 5) * 34); if (y >= top) { c = x % 13 === 0 ? PC.far : PC.farL; if ((x % 13) > 3 && (x % 13) < 8 && (y - top) % 8 === 2 && noise2(x >> 3, y >> 3) < 0.25) c = noise2(x >> 2, y) < 0.5 ? WIN_B : WIN_C; } }
    return c;
  };

  // ---- the back wall, room by room ----
  for (let x = 0; x < W; x++) for (let y = 0; y < GROUND; y++) {
    let c;
    if (x < 524) {   // the park: the sky, the police HQ across the river, the gold dome far off, bare trees with lights, snow banks
      c = sky(x, y);
      if (x >= 60 && x <= 96 && y >= 96 && y <= 190) { c = x === 60 || x === 96 ? PC.far : PC.farL; if ((x - 62) % 6 < 3 && (y - 100) % 7 < 3 && y > 106) c = noise2(x, y) < 0.6 ? WIN_C : WIN_A; if (y < 104) c = C('#5a7ad8'); }   // police HQ
      const dx = x - 430, dy = y - 150; if (dx * dx / 6400 + dy * dy / 3600 < 1 && y < 150) c = (Math.abs(dx) % 14 < 2 || y % 12 === 0) ? PC.goldD : (noise2(x, y) < 0.4 ? PC.goldL : PC.gold);   // the palm house's dome, gold, far right
      if (y >= 150 && y < 190 && x > 360 && x < 500) c = (x % 10 < 2) ? PC.goldD : mix(PC.gold, PC.sky1, 0.3);
      if (y > 236) c = y > 262 ? PC.snowD : mix(PC.snowD, PC.sky1, (262 - y) / 40);
    } else if (x < 1154) {   // the ballroom: cream and gold, tall windows on the snowy park, a gold cornice
      if (y < 40) c = (x + y) % 9 === 0 ? PC.goldD : PC.creamD;
      else if (y < 48) c = y === 44 ? PC.goldL : PC.gold;
      else c = (x * 3 + y) % 31 === 0 ? PC.creamD : PC.cream;
      if (y > GROUND - 14) c = y === GROUND - 14 ? PC.goldD : PC.panel;
      const wx = (x - 560) % 120;
      if (wx >= 0 && wx < 34 && y > 70 && y < 186 && !(x > 880 && x < 920) && !(x > 630 && x < 670)) {   // tall windows: the park in the snow
        c = wx < 2 || wx > 31 || y < 72 || y > 183 || wx === 16 || (y - 70) % 28 === 0 ? PC.goldD : sky(x, y + 40);
        if (y > 168 && wx > 1 && wx < 32) c = PC.snowD;
      }
    } else if (x < 1504) {   // the orchid rooms: a low glass house, green panes, the iron frame
      if (y < 60) c = PC.ironD;
      else if (y < 150) c = (x - 1154) % 26 < 2 || (y - 60) % 30 === 0 ? PC.iron : noise2(x >> 2, y >> 2) < 0.15 ? PC.glassL : PC.glass;
      else c = (x - 1154) % 26 < 2 ? PC.iron : noise2(x >> 1, y >> 1) < 0.08 ? PC.leafD : mix(PC.glass, PC.leafD, 0.5);
      if (y > GROUND - 10) c = PC.tileD;
    } else if (x < 1604) {   // the curator's office: dark wood panels, a frosted window
      c = y < 50 ? PC.woodD : ((x - 1504) % 20 < 1 || (y - 50) % 60 === 0) ? PC.woodD : (x + y) % 17 === 0 ? PC.woodL : PC.wood;
      if (x > 1540 && x < 1580 && y > 110 && y < 190) c = x === 1541 || x === 1579 || y === 111 || y === 189 || x === 1560 ? PC.woodD : mix(PC.snowD, C('#5a6a80'), noise2(x >> 1, y >> 1) * 0.5);
    } else if (x < 1880) {   // the boiler yard: the night sky, snow; the nave's lit glass flank on the right
      c = sky(x, y);
      if (x >= 1856) c = (x - 1856) % 12 < 2 || y % 24 === 0 ? PC.ironL : mix(PC.gold, PC.glass, 0.45 + 0.2 * noise2(x >> 2, y >> 2));
      if (y > 250 && x < 1856) c = PC.snowD;
    } else if (x < 2420) {   // the nave: snow sky over the roof line; under the glass, warm air, iron columns, palm fronds on the back wall
      if (y < D.ROOF_Y - 4) c = sky(x, y);
      else { c = mix(C('#6a6a48'), C('#3a4a32'), noise2(x >> 3, y >> 3) * 0.6); if ((x - 1880) % 54 < 4) c = PC.ironL; if ((x - 1880) % 54 === 4) c = PC.ironD; }
      if (y > GROUND - 8 && y >= D.ROOF_Y) c = PC.tileD;
    } else {   // the great dome: the sky beyond the ribs; gold walls; iron ribs curve up
      if (y < 106) { c = sky(x, y + 60); const cx = 2618, r = Math.hypot((x - cx) * 0.6, (y - 120) * 1.6); if (Math.abs(r - 105) < 2 || (x - 2446) % 34 < 2) c = PC.iron; }
      else c = (x * 3 + y) % 37 === 0 ? PC.goldD : mix(PC.cream, PC.gold, 0.35);
      if (y >= 106 && (x - 2446) % 60 < 3) c = PC.ironL;
      if (y > GROUND - 12 && y >= 106) c = PC.panel;
    }
    b[y * W + x] = c;
  }
  // the room walls (the boiler/nave wall stops at the roof line)
  for (const wx of D.WALLS) rect(wx - 4, wx === 1880 ? D.ROOF_Y : 0, wx + 3, GROUND - 1, (x, y) => x === wx - 4 || x === wx + 3 ? O : wx === 1604 || wx === 524 ? ((y >> 3) + (x >> 2)) % 2 ? PC.brick : PC.brickD : (y + x) % 11 === 0 ? PC.ironD : PC.iron);
  // the doors in them (shut; the run draws one open as it opens)
  for (const d of D.DOORS) rect(d.x - 6, GROUND - 56, d.x + 5, GROUND - 1, (x, y) => x === d.x - 6 || x === d.x + 5 || y === GROUND - 56 ? O : (x + y) % 9 === 0 ? PC.woodD : PC.wood);
  T('PRIVATE', D.PRIVATE - 15, GROUND - 66, PC.goldL);

  // ---- the park ----
  // the portico: columns, the lit doorway the guests go in by, a canopy
  rect(D.PORTICO - 22, 150, D.PORTICO + 22, GROUND - 1, (x, y) => y < 158 ? (y === 150 ? O : PC.stoneL) : Math.abs(x - D.PORTICO) > 18 ? (x % 4 ? PC.stone : PC.stoneD) : Math.abs(x - D.PORTICO) < 10 && y > 196 ? (y % 6 === 0 ? PC.goldD : PC.winW) : 0);
  T('PALM HOUSE', D.PORTICO - 20, 140, PC.goldL);
  // the hedge and its service gate
  rect(D.HEDGE - 12, 196, D.HEDGE + 12, GROUND - 1, (x, y) => Math.abs(x - D.HEDGE) < 4 && y > 214 ? (y % 5 === 0 ? PC.ironL : PC.ironD) : y < 200 ? PC.snow : noise2(x, y) < 0.3 ? PC.hedgeD : PC.hedge);
  // lamp posts with globes
  for (const lx of D.LAMPS_PARK) { for (let y = 196; y < GROUND; y++) { put(lx, y, PC.ironD); put(lx + 1, y, PC.iron); } rect(lx - 3, 189, lx + 4, 196, (x, y) => (x - lx) ** 2 + (y - 192) ** 2 < 14 ? LAMP_GLASS : 0); }

  // palms on the back wall of the nave and the dome (behind everyone): a ringed trunk, a crown of fronds
  const palm = (px, top, k = 1) => {
    for (let y = top; y < GROUND; y++) { const w = 3 + (y - top) / 60, sx = px + Math.sin((y - top) / 40) * 3 * k; for (let x = Math.round(sx - w); x <= sx + w; x++) put(x, y, (y % 6 === 0) ? PC.woodD : x < sx ? PC.wood : PC.woodL); }
    for (let f = 0; f < 9; f++) { const a = -Math.PI / 2 + (f - 4) * 0.42, L = (34 + (f % 3) * 8) * k; for (let s = 0; s < L; s++) { const x = px + Math.cos(a) * s, y = top + Math.sin(a) * s * 0.55 + (s / L) ** 2 * 22 * k; for (let w = -2; w <= 2; w++) if (Math.abs(w) < 3 - s / L * 2) put(Math.round(x), Math.round(y + w), (s + w) % 4 === 0 ? PC.leafD : s > L * 0.7 ? PC.leafL : PC.leaf); } }
  };
  for (const px of [1950, 2066, 2230, 2340]) palm(px, 176);
  palm(2620, 132, 1.3);
  const pre = b.slice();   // everything after this is a solid prop (blood sticks to it; the 3D view makes blocks of it)

  // the yard: the snowy botanist, the riot vans, the shed with its axe rack
  { const { x, w, top } = D.STATUE_YARD;
    rect(x - w / 2 - 4, GROUND - 12, x + w / 2 + 4, GROUND - 1, (xx, y) => y === GROUND - 12 ? PC.snow : PC.stoneD);
    rect(x - 5, top, x + 5, GROUND - 13, (xx, y) => y < top + 3 ? PC.snow : (y - top) < 10 && Math.abs(xx - x) > 3 ? 0 : xx === x - 5 || xx === x + 5 ? PC.stoneD : PC.stone); }
  for (const v of [D.VAN1, D.VAN2]) {
    rect(v.x0, v.top, v.x1, GROUND - 6, (x, y) => x === v.x0 || x === v.x1 || y === v.top ? O : y < v.top + 3 ? PC.snow : y > v.top + 8 && y < v.top + 18 && x > v.x0 + 4 && x < v.x0 + 16 ? PC.glass : y === v.top + 22 ? C('#d0d4dc') : (x - v.x0) % 24 === 0 ? PC.van : PC.vanL);
    T('POLICE', v.x0 + 18, v.top + 24, PC.white);
    for (const wx of [v.x0 + 10, v.x1 - 10]) for (let yy = GROUND - 9; yy < GROUND; yy++) for (let xx = wx - 5; xx <= wx + 5; xx++) if (Math.hypot(xx - wx, yy - (GROUND - 5)) <= 5) put(xx, yy, Math.hypot(xx - wx, yy - (GROUND - 5)) < 2 ? PC.ironL : O);
  }
  { const { x0, x1 } = D.SHED; rect(x0, 210, x1, GROUND - 1, (x, y) => x === x0 || x === x1 || y === 210 ? O : y < 214 ? PC.snow : (x - x0) % 6 === 0 ? PC.woodD : PC.wood); rect(x0 + 8, 222, x1 - 8, 228, (x, y) => y === 222 || y === 228 ? O : PC.woodL); }
  // ---- the ballroom ----
  { const { x0, x1, top } = D.BUFFET_W; rect(x0, top, x1, GROUND - 1, (x, y) => y === top ? O : y < top + 8 ? PC.white : y < top + 10 ? PC.goldD : x === x0 + 2 || x === x1 - 2 ? PC.woodD : 0); }
  { const { x0, x1, top } = D.BUFFET_E; rect(x0, top, x1, GROUND - 1, (x, y) => y === top ? O : y < top + 8 ? PC.white : y < top + 10 ? PC.goldD : x === x0 + 2 || x === x1 - 2 ? PC.woodD : 0); }
  { const { x0, x1, top } = D.CAKE; rect(x0, top, x1, GROUND - 1, (x, y) => y === top ? O : y < top + 10 ? PC.white : x === x0 + 3 || x === x1 - 3 ? PC.woodD : 0); rect(x0 + 6, top - 12, x1 - 6, top - 1, (x, y) => (y - top) % 4 === 0 ? PC.goldL : PC.white); }
  { const { x0, x1, y } = D.BALCONY; rect(x0, y, x1, y + 8, (x, yy) => yy === y ? PC.goldL : yy === y + 8 ? O : PC.cream);
    for (let x = x0; x <= x1; x++) put(x, y - 12, PC.gold); for (let x = x0; x <= x1; x += 6) for (let yy = y - 12; yy < y; yy++) put(x, yy, PC.goldD);
    for (const px of [x0 + 20, x1 - 20]) rect(px - 3, y + 9, px + 3, GROUND - 1, (x) => x === px - 3 || x === px + 3 ? PC.creamD : PC.cream); }
  { const { x0, x1, top } = D.PIANO; rect(x0, top, x1, GROUND - 1, (x, y) => y === top ? O : y < top + 12 ? (y === top + 10 && (x % 3) ? PC.white : C('#0e0e10')) : (x === x0 + 4 || x === x1 - 4) ? C('#0e0e10') : 0); rect(x0 - 6, top - 22, x0 + 18, top - 1, (x, y) => (x - x0 + 6) + (top - y) * 1.1 < 24 ? C('#141418') : 0); }
  // the honour guard: a rack and a plaque
  rect(D.HONOUR - 10, GROUND - 40, D.HONOUR + 10, GROUND - 36, (x, y) => y === GROUND - 40 ? O : PC.woodL); T('HONOUR', D.HONOUR - 12, GROUND - 50, PC.goldD);
  // the back-wall doors: the portico door, the main doors (the riot squad's)
  for (const [dx, w] of [[D.PORTICO_IN, 10], [D.MAIN_DOORS, 16]]) rect(dx - w, GROUND - 64, dx + w, GROUND - 1, (x, y) => x === dx - w || x === dx + w || y === GROUND - 64 || x === dx ? PC.goldD : (x + y) % 7 === 0 ? PC.woodD : PC.wood);
  // the bandstand
  rect(990, GROUND - 4, 1060, GROUND - 1, (x, y) => y === GROUND - 4 ? PC.goldL : PC.carpetD);
  // ---- the orchid rooms ----
  for (const bn of D.BENCHES) rect(bn.x0, D.BENCH_TOP, bn.x1, GROUND - 1, (x, y) => y === D.BENCH_TOP ? O : y < D.BENCH_TOP + 4 ? PC.woodL : x === bn.x0 + 2 || x === bn.x1 - 2 ? PC.woodD : y > GROUND - 14 && y < GROUND - 11 ? PC.wood : 0);
  for (const bn of D.BENCHES) for (let k = 0; k < 3; k++) { const px = bn.x0 + 6 + k * 12; rect(px - 3, D.BENCH_TOP - 6, px + 3, D.BENCH_TOP - 1, (x, y) => y === D.BENCH_TOP - 6 ? PC.terraD : PC.terra); for (let j = 0; j < 6; j++) put(px - 3 + j, D.BENCH_TOP - 8 - (j % 3), j % 2 ? C('#d870c8') : PC.leafL); }
  { const { x0, x1, y } = D.WALKWAY; rect(x0, y, x1, y + 3, (x, yy) => yy === y || yy === y + 3 ? PC.ironD : x % 3 ? PC.iron : O); for (const hx of [x0 + 8, x1 - 8]) for (let yy = 60; yy < y; yy++) put(hx, yy, PC.ironD); for (let x = x0; x <= x1; x++) put(x, y - 9, PC.ironL); }
  for (let x = 1180; x < 1490; x += 38) { for (let yy = 60; yy < 120; yy++) put(x, yy, PC.ironD); rect(x - 7, 120, x + 7, 128, (xx, yy) => yy === 120 ? PC.terraD : (xx + yy) % 3 ? PC.leaf : PC.leafL); }   // hanging baskets
  rect(D.FIREBOX - 8, GROUND - 46, D.FIREBOX + 8, GROUND - 18, (x, y) => x === D.FIREBOX - 8 || x === D.FIREBOX + 8 || y === GROUND - 46 || y === GROUND - 18 ? O : y < GROUND - 40 ? PC.red : C('#2a0e0c'));
  // ---- the office ----
  { const { x0, x1, top } = D.DESK; rect(x0, top, x1, GROUND - 1, (x, y) => y === top ? O : y < top + 3 ? PC.green : x === x0 || x === x1 ? PC.woodD : (x - x0) % 10 === 0 ? PC.woodD : PC.wood); }
  rect(1508, 186, 1524, GROUND - 1, (x, y) => x === 1508 || y === 186 ? O : (y - 186) % 16 === 0 ? PC.woodD : PC.woodL);   // a bookcase
  rect(D.GUNCAB.x - 10, D.GUNCAB.y0 - 3, D.GUNCAB.x + 10, D.GUNCAB.y1 + 3, (x, y) => x === D.GUNCAB.x - 10 || x === D.GUNCAB.x + 10 || y === D.GUNCAB.y0 - 3 || y === D.GUNCAB.y1 + 3 ? O : x < D.GUNCAB.x - 8 || x > D.GUNCAB.x + 8 ? PC.woodD : C('#1a1410'));
  for (let y = D.GUNCAB.y1 + 4; y < GROUND; y++) { put(D.GUNCAB.x - 8, y, PC.woodD); put(D.GUNCAB.x + 8, y, PC.woodD); }
  T('PRIVATE', 1530, 70, PC.goldD);
  // ---- the boiler yard: the boiler house, its overhang, the chimney, the coal heap, the iron stairs ----
  { const { x0, x1, over } = D.BOILER;
    rect(x0, over, x1, GROUND - 1, (x, y) => x === x0 || x === x1 || y === over ? O : y < over + 4 ? PC.snow : ((y >> 2) + ((x >> 3) % 2)) % 2 ? PC.brick : PC.brickD);
    rect(x0 - 6, over - 3, x1 + 8, over + 1, (x, y) => y === over - 3 ? PC.snowL : PC.ironD);
    rect(x0 + 34, GROUND - 30, x0 + 50, GROUND - 10, (x, y) => x === x0 + 34 || x === x0 + 50 || y === GROUND - 30 ? O : C('#3a1a0a'));
    rect(x0 + 8, 60, x0 + 20, over - 4, (x, y) => x === x0 + 8 || x === x0 + 20 ? O : ((y >> 2) + ((x >> 2) % 2)) % 2 ? PC.brick : PC.brickD); }
  { const { x0, x1, top } = D.COAL; for (let x = x0; x <= x1; x++) { const h = Math.round((GROUND - top) * Math.sin((x - x0) / (x1 - x0) * Math.PI) ** 0.6); for (let y = GROUND - h; y < GROUND; y++) put(x, y, y === GROUND - h ? PC.snow : noise2(x, y) < 0.3 ? PC.ironD : PC.coal); } }
  { const St = D.STAIR;
    for (let i = 0; i < St.n; i++) { const x0 = St.x0 + i * St.step, y = GROUND - (i + 1) * St.step; for (let x = x0; x < x0 + St.step; x++) { put(x, y, PC.snow); put(x, y + 1, PC.ironL); put(x, y + 2, PC.iron); } }
    for (let i = 0; i < St.n; i += 2) { const x = St.x0 + i * St.step + 2, y = GROUND - (i + 1) * St.step; for (let yy = y - 10; yy < y; yy++) put(x, yy, PC.ironL); }
    for (let x = St.x0; x < St.x0 + St.n * St.step; x++) put(x, GROUND - Math.round((x - St.x0) / St.step + 1) * St.step - 10, PC.ironL);
    for (const px of [St.x0 + 40, St.x0 + 90]) for (let y = GROUND - Math.round((px - St.x0) / St.step) * St.step; y < GROUND; y++) put(px, y, PC.ironD); }
  { const { x0, x1, y } = D.GANTRY; rect(x0, y, x1, y + 4, (x, yy) => yy === y ? PC.snowL : yy === y + 4 ? O : x % 3 ? PC.iron : PC.ironD); for (let x = x0; x <= x1; x++) put(x, y - 10, PC.ironL); for (let x = x0; x <= x1; x += 10) for (let yy = y - 10; yy < y; yy++) put(x, yy, PC.ironD); }
  rect(D.ROOF_DOOR - 6, D.GANTRY.y - 34, D.ROOF_DOOR - 1, D.GANTRY.y - 1, (x, y) => x === D.ROOF_DOOR - 6 || y === D.GANTRY.y - 34 ? O : PC.ironL);
  // ---- the nave: the koi bridge, the gallery and its step, the gate frame ----
  { const { x0, x1, y } = D.BRIDGE; for (let x = x0; x <= x1; x++) { const a = Math.round(Math.sin((x - x0) / (x1 - x0) * Math.PI) * 3); for (let yy = y - a; yy < y - a + 3; yy++) put(x, yy, yy === y - a ? PC.woodL : PC.wood); } rect(x0 - 6, GROUND - 6, x1 + 6, GROUND - 1, (x, yy) => (x + yy) % 5 ? PC.water : PC.waterL); }
  { const { x0, x1, top } = D.GSTEP; rect(x0, top, x1, GROUND - 1, (x, y) => x === x0 || x === x1 || y === top ? O : (y - top) % 9 === 0 ? PC.woodD : PC.woodL); }
  { const { x0, x1, y } = D.NGALLERY; rect(x0, y, x1, y + 6, (x, yy) => yy === y ? PC.ironL : yy === y + 6 ? O : x % 4 ? PC.iron : PC.ironD); for (let x = x0; x <= x1; x++) put(x, y - 11, PC.ironL); for (let x = x0; x <= x1; x += 8) for (let yy = y - 11; yy < y; yy++) put(x, yy, PC.ironD);
    for (const px of [x0 + 10, x1 - 10]) rect(px - 2, y + 7, px + 2, GROUND - 1, (x) => x === px - 2 || x === px + 2 ? PC.ironD : PC.iron); }
  rect(D.GATE + 2, 160, D.GATE + 9, GROUND - 1, (x, y) => (x + y) % 9 === 0 ? PC.ironD : PC.iron);
  // ---- the dome: galleries, planters, columns, the fountain basin, the doors ----
  for (const g of [D.DGAL_W, D.DGAL_E]) { rect(g.x0, g.y, g.x1, g.y + 6, (x, yy) => yy === g.y ? PC.goldL : yy === g.y + 6 ? O : x % 4 ? PC.iron : PC.ironD); for (let x = g.x0; x <= g.x1; x++) put(x, g.y - 11, PC.gold); for (let x = g.x0; x <= g.x1; x += 8) for (let yy = g.y - 11; yy < g.y; yy++) put(x, yy, PC.goldD); }
  for (const p of D.DPLANT) { rect(p.x0, p.top, p.x1, GROUND - 1, (x, y) => x === p.x0 || x === p.x1 || y === p.top ? O : (y - p.top) % 8 === 0 ? PC.terraD : PC.terra); for (let k = 0; k < 18; k++) put(p.x0 + (k * 7) % 18, p.top - 1 - (k % 5), k % 2 ? PC.leaf : PC.leafL); }
  for (const cx of D.COLUMNS) rect(cx - 4, 122, cx + 4, GROUND - 1, (x, y) => x === cx - 4 || x === cx + 4 ? PC.ironD : (y % 30 < 3) ? PC.goldD : PC.iron);
  { const F = D.FOUNTAIN; rect(F.x0, F.top, F.x1, GROUND - 1, (x, y) => y === F.top ? PC.stoneL : x === F.x0 || x === F.x1 ? PC.stoneD : y < F.top + 4 ? PC.waterL : PC.stone);
    const cx = (F.x0 + F.x1) >> 1; rect(cx - 2, F.top - 26, cx + 2, F.top - 1, (x) => x === cx - 2 || x === cx + 2 ? PC.stoneD : PC.stone); rect(cx - 9, F.top - 30, cx + 9, F.top - 26, (x, y) => y === F.top - 30 ? PC.stoneL : PC.stone); }
  for (const dx of D.DOME_DOORS) rect(dx - 8, GROUND - 62, dx + 8, GROUND - 1, (x, y) => x === dx - 8 || x === dx + 8 || y === GROUND - 62 ? O : (x + y) % 8 === 0 ? PC.ironD : PC.iron);
  // Hale's office: its frame (the glass, the lamp, the man on the phone are drawn live)
  { const h = D.HALE; rect(h.x0 - 2, h.y0 - 2, h.x1 + 2, h.y0, () => PC.ironD); for (let y = h.y0; y <= GROUND - 1; y++) { put(h.x0 - 2, y, PC.ironD); put(h.x1 + 2, y, PC.ironD); }
    rect(h.x0, h.y0 + 1, h.x1, GROUND - 1, (x, y) => (x + y) % 19 === 0 ? C('#1a1a1e') : C('#121216')); rect(h.x0 + 26, GROUND - 22, h.x1 - 4, GROUND - 18, () => PC.woodD); }
  T('HALE', D.HALE.x0 + 16, D.HALE.y0 - 10, PC.goldD);
  // the Bell & Sons clock on the east gallery rail (its hands, stopped at 3:17, are drawn live)
  { const { x, y } = D.CLOCK; for (let yy = -8; yy <= 8; yy++) for (let xx = -8; xx <= 8; xx++) { const r = Math.hypot(xx, yy); if (r <= 8) put(x + xx, y + yy, r > 7 ? O : r > 6 ? PC.wood : C('#e8e0c8')); } }

  // ---- the floor band ----
  const out = { winl: [] };
  for (let x = 0; x < W; x++) for (let y = GROUND; y < H; y++) {
    const d = y - GROUND; let c;
    if (x < 524 || (x >= 1604 && x < 1880)) { c = d === 0 ? PC.snowL : noise2(x, d) < 0.4 ? PC.snowD : PC.snow; if (x >= D.CARPET.x0 && x < D.CARPET.x1 && d > 1 && d < 12) c = d === 2 || d === 11 ? PC.goldD : (x + d) % 9 === 0 ? PC.redD : PC.red; }
    else if (x < 1154) c = d === 0 ? PC.parqL : ((x >> 3) + (d >> 2)) % 2 ? PC.parq : PC.parqD;
    else if (x < 1504) { c = d === 0 ? PC.tile : (x % 9 === 0 || d % 5 === 0) ? PC.tileD : mix(PC.tile, PC.leafD, 0.3); if (d > 2 && d < STREET && noise2(x >> 2, d) < 0.2) pud[d * W + x] = 1; }
    else if (x < 1604) c = d === 0 ? PC.carpet : (x + d) % 7 === 0 ? PC.carpetD : PC.carpet;
    else if (x < 2420) c = d === 0 ? PC.tile : ((x >> 3) + (d >> 2)) % 2 ? PC.tile : PC.tileD;
    else { c = d === 0 ? PC.goldL : ((x >> 4) + (d >> 2)) % 2 ? PC.stone : PC.stoneD; if (x >= D.FOUNTAIN.wet[0] && x <= D.FOUNTAIN.wet[1] && d > 0 && d < STREET) { c = mix(c, PC.water, 0.6); pud[d * W + x] = 1; } }
    b[y * W + x] = c;
  }
  for (let i = 0; i < b.length; i++) if (b[i] !== pre[i] && i < GROUND * W) props[i] = 1;
  return { b, props, bg: pre, pud, ...out };
}

// ---- small figure painter: a standing guest, waiter or musician (2D silhouettes on the wall layer) ----
const GUEST = [[C('#141418'), C('#e8e4dc')], [C('#6a1a2a'), C('#d8b080')], [C('#2a2a3a'), C('#e8e4dc')], [C('#4a3a5a'), C('#c0a080')], [C('#8a7a5a'), C('#e0c8a8')]];
function drawGuest(plot, g, t) {
  const x = Math.round(g.x), f = g.vx < 0 ? -1 : 1, run = g.st === 'flee', ph = Math.sin(t * (run ? 14 : 6) + g.seed * 7) * (Math.abs(g.vx) > 2 ? 1 : 0);
  const [coat, skin] = GUEST[g.kind % GUEST.length], gown = g.kind % 2 === 1, waiter = g.kind === 9;
  const top = GROUND - (gown ? 30 : 32);
  for (let y = top + 6; y < GROUND - 1; y++) {   // the body, a gown flares at the hem
    const w = gown ? 2 + Math.max(0, (y - (top + 14)) / 4) : 2;
    for (let k = -Math.ceil(w); k <= Math.ceil(w); k++) plot(x + k, y, waiter && y < top + 16 ? C('#e8e4dc') : coat);
  }
  if (!gown) { plot(x - 1 + Math.round(ph), GROUND - 1, C('#0c0c10')); plot(x + 1 - Math.round(ph), GROUND - 1, C('#0c0c10')); }
  for (let y = top; y < top + 6; y++) for (let k = -2; k <= 2; k++) if (k * k + (y - top - 3) ** 2 < 8) plot(x + k, y, skin);
  if (gown) plot(x + f * 2, top + 1, C('#e8c040'));
  if (run) { plot(x + f * 3, top + 8 - 3, skin); plot(x - f * 3, top + 9, skin); }
  if (waiter && g.tray) { for (let k = 0; k < 7; k++) plot(x + f * 2 + k * f, top + 9, C('#c0c4cc')); plot(x + f * 5, top + 7, C('#e8d070')); plot(x + f * 7, top + 7, C('#e8d070')); }
}

// ---- per frame, on the wall behind everyone ----
export function drawWorld(R, S) {
  const { plot, line1 } = R, t = R.t, O = PC.out, cam = R.cam, vis = (x0, x1) => x1 > cam.x - 20 && x0 < cam.x + cam.vw + 20;
  for (const g of S.guests) if (g.st !== 'gone' && vis(g.x - 6, g.x + 6)) drawGuest(plot, g, t);
  // the doors as they open: a dark gap (a warm one indoors)
  for (const d of D.DOORS) if (S.open[d.id]) { for (let y = GROUND - 55; y < GROUND; y++) for (let x = d.x - 5; x <= d.x + 4; x++) plot(x, y, x === d.x + 4 ? PC.woodD : C('#3a2a1a')); }
  for (const dd of S.doorFx) { if (dd.t > 0.6) continue; const w = dd.w || 8; for (let y = GROUND - 60; y < GROUND; y++) for (let x = dd.x - w; x <= dd.x + w; x++) plot(x, y, dd.blue && Math.floor(t * 12) % 2 ? C('#4a7aff') : C('#0c0c12')); }
  // champagne towers
  for (const tw of S.towers) {
    if (!vis(tw.x - 12, tw.x + 12)) continue;
    rect2(plot, tw.x - 10, GROUND - 22, tw.x + 10, GROUND - 1, (x, y) => y === GROUND - 22 ? O : y < GROUND - 19 ? PC.white : x === tw.x - 9 || x === tw.x + 9 ? PC.woodD : 0);
    if (!tw.broken) for (let row = 0; row < 5; row++) { const n = 5 - row, y = GROUND - 25 - row * 4; for (let k = 0; k < n; k++) { const gx = tw.x - (n - 1) * 2 + k * 4; plot(gx, y, C('#f8f0c0')); plot(gx, y - 1, C('#e8d070')); plot(gx - 1, y - 2, C('#c0d0e0')); plot(gx + 1, y - 2, C('#c0d0e0')); } }
    else for (let k = 0; k < 6; k++) plot(tw.x - 8 + k * 3, GROUND - 23, C('#c0d0e0'));
  }
  // chandeliers: hanging (a chain to the ceiling), falling, or a wreck on the floor
  for (const ch of S.chands) {
    if (!vis(ch.x - 20, ch.x + 20)) continue;
    const y = ch.st === 'down' ? GROUND - 8 : ch.st === 'fall' ? D.CHAND_Y + (GROUND - 8 - D.CHAND_Y) * Math.min(1, ch.t / 0.35) ** 2 : D.CHAND_Y;
    if (ch.st === 'hang' || ch.st === 'warn') for (let yy = 40; yy < y - 10; yy++) plot(ch.x, yy, (yy >> 1) % 2 ? PC.goldD : PC.gold);
    if (ch.st === 'down') { for (let k = -18; k <= 18; k++) { plot(ch.x + k, GROUND - 2 - (Math.abs(k) % 5), k % 3 ? PC.gold : C('#d8e8f8')); plot(ch.x + k, GROUND - 1, PC.goldD); } continue; }
    for (let yy = -10; yy <= 6; yy++) for (let k = -16; k <= 16; k++) { const r = (k / 16) ** 2 + ((yy - 2) / 8) ** 2; if (r < 1 && (yy < -6 ? Math.abs(k) < 4 : true) && (r > 0.6 || yy === 2)) plot(ch.x + k, y + yy, (k + yy + Math.floor(t * 3)) % 5 === 0 ? C('#ffffff') : (k % 4 === 0 ? C('#d8e8f8') : PC.gold)); }
    for (let k = -14; k <= 14; k += 4) plot(ch.x + k, y + 8, C('#fff0c0'));
  }
  // statues: standing (cover; a wall), falling, fallen (low cover)
  for (const st of S.statues) {
    if (!vis(st.x - 80, st.x + 80)) continue;
    if (st.st === 'up') { rect2(plot, st.x - 7, GROUND - 10, st.x + 7, GROUND - 1, (x, y) => y === GROUND - 10 ? PC.stoneL : PC.stoneD); rect2(plot, st.x - 4, GROUND - 52, st.x + 4, GROUND - 11, (x, y) => y < GROUND - 46 ? (Math.hypot(x - st.x, y - (GROUND - 49)) < 3.5 ? PC.stoneL : 0) : x === st.x - 4 || x === st.x + 4 ? PC.stoneD : PC.stone); plot(st.x + 5, GROUND - 40, PC.stone); plot(st.x + 6, GROUND - 41, PC.stone); }
    else { const k = st.st === 'fall' ? Math.min(1, st.t / 0.5) : 1, a = k * Math.PI / 2 * st.dir; for (let s = 0; s < 52; s++) { const x = st.x + Math.sin(a) * s, y = GROUND - 10 - Math.cos(a) * s; for (let w = -3; w <= 3; w++) plot(Math.round(x + Math.cos(a) * w), Math.round(y + Math.sin(a) * w * (st.dir)), s > 46 ? PC.stoneL : PC.stone); } rect2(plot, st.x - 7, GROUND - 10, st.x + 7, GROUND - 1, () => PC.stoneD); }
  }
  // the misting pipes: a valve; burst, it hangs open
  for (const p of S.pipes) { if (!vis(p.x - 12, p.x + 12)) continue; for (let x = p.x - 30; x <= p.x + 30; x++) { plot(x, p.y, PC.ironL); plot(x, p.y + 1, PC.iron); } for (let yy = p.y; yy < GROUND; yy++) plot(p.x + 30, yy, PC.iron); rect2(plot, p.x - 3, p.y - 3, p.x + 3, p.y + 4, (x, y) => p.burst ? (x === p.x ? O : PC.ironD) : (x + y) % 2 ? C('#c03030') : PC.iron); }
  // the waiter's tray, the desk things: the folder, the ashtray, the lamp, the phone (it shakes when it rings)
  { const Dk = D.DESK; if (vis(Dk.x0, Dk.x1)) {
    if (!S.dossier) for (let k = 0; k < 8; k++) { plot(Dk.dossier - 4 + k, Dk.top - 1, C('#c8b070')); plot(Dk.dossier - 4 + k, Dk.top - 2, k === 3 ? C('#c02020') : C('#d8c080')); }
    plot(Dk.dossier + 8, Dk.top - 1, C('#a0a8b0')); plot(Dk.dossier + 9, Dk.top - 1, C('#a0a8b0')); plot(Dk.dossier + 8, Dk.top - 2, C('#5a4a40'));
    if (Math.floor(t * 2) % 3 === 0) plot(Dk.dossier + 9, Dk.top - 4 - Math.floor(t * 4) % 3, C('#8a8a90'));   // the still-warm pipe ash: a thread of smoke
    for (let yy = Dk.top - 12; yy < Dk.top; yy++) plot(Dk.x0 + 4, yy, PC.goldD); for (let k = -3; k <= 3; k++) plot(Dk.x0 + 4 + k, Dk.top - 12, PC.lampG);
    const ring = S.phone === 'ring' && Math.floor(t * 10) % 4 < 2, k = ring ? (Math.floor(t * 30) % 2 ? 1 : -1) : 0;
    for (let j = -3; j <= 3; j++) { plot(Dk.phone + j, Dk.top - 2 + (Math.abs(j) === 3 ? -1 : 0) + (S.phone === 'done' ? 0 : k * (Math.abs(j) === 3 ? 1 : 0)), C('#141414')); plot(Dk.phone + j, Dk.top - 1, C('#202024')); }
  } }
  // the Bell & Sons clock (3:17), Hale's office (the lamp, a man in a hat on the phone), the lantern, the dropped shield, the gate
  { const { x, y } = D.CLOCK; const hand = (a, len) => line1(x, y, x + Math.sin(a) * len, y - Math.cos(a) * len, O); hand((3 + 17 / 60) / 12 * Math.PI * 2, 4); hand(17 / 60 * Math.PI * 2, 6); plot(x, y, C('#b02a2a')); }
  if (S.haleLight) { const h = D.HALE; for (let yy = h.y0 + 2; yy < GROUND; yy++) for (let xx = h.x0 + 1; xx < h.x1; xx++) if ((xx - h.x0 - 30) ** 2 / 900 + (yy - h.y0 - 20) ** 2 / 2500 < 1) plot(xx, yy, mix(C('#5a4a2a'), C('#2a2218'), (yy - h.y0) / 80)); rect2(plot, h.x0 + 34, h.y0 + 16, h.x0 + 40, h.y0 + 20, () => C('#ffe0a0'));
    if (!S.haleGone) { const hx = h.x0 + 18; rect2(plot, hx - 4, GROUND - 40, hx + 4, GROUND - 1, () => C('#0c0c10')); rect2(plot, hx - 3, GROUND - 48, hx + 3, GROUND - 41, () => C('#0c0c10')); rect2(plot, hx - 6, GROUND - 49, hx + 6, GROUND - 48, () => C('#0c0c10')); plot(hx + 4, GROUND - 44, C('#0c0c10')); plot(hx + 5, GROUND - 45, C('#0c0c10')); } }
  if (S.lantern && S.lantern.st !== 'gone') {
    const L = S.lantern, ly = L.st === 'down' ? GROUND - 18 : L.st === 'fall' ? 150 + (GROUND - 18 - 150) * Math.min(1, L.t / 0.4) ** 2 : 150;
    if (L.st === 'hang' || L.st === 'warn') for (let yy = D.LANTERN.chainY; yy < ly - 8; yy++) plot(D.LANTERN.x, yy, (yy >> 1) % 2 ? PC.iron : PC.ironL);
    rect2(plot, D.LANTERN.x - 9, ly - 8, D.LANTERN.x + 9, ly + 17, (x, y) => x === D.LANTERN.x - 9 || x === D.LANTERN.x + 9 || y === ly - 8 || y === ly + 17 ? O : (x + y) % 4 === 0 ? PC.ironL : y < ly + 4 ? C('#e8c070') : PC.iron);
  }
  if (S.shieldDrop) { const sx = Math.round(S.shieldDrop.x); for (let k = -10; k <= 10; k++) { plot(sx + k, GROUND - 2, C('#9ab8d8')); plot(sx + k, GROUND - 3, Math.abs(k) === 10 ? O : C('#c8e0f0')); } }
  if (!S.gateOpen) for (let y = 164; y < GROUND; y += 3) for (let x = D.GATE + 3; x <= D.GATE + 8; x++) plot(x, y, x % 2 ? PC.ironL : PC.ironD);
}
function rect2(plot, x0, y0, x1, y1, f) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = f(x, y); if (c) plot(x, y, c); } }

// ---- over the lit scene, unlit ----
const GLASS = [C('#a8c8e0'), C('#d8ecf8')];
export function drawFx(R, S) {
  const { plot, blendPlot, line1 } = R, t = R.t, cam = R.cam, vis = (x0, x1) => x1 > cam.x - 8 && x0 < cam.x + cam.vw + 8;
  // glass: panes (a sheen and a highlight), cracks; roof panes (cracks; broken ones leave a jagged frame)
  for (const p of [...S.panes, ...S.roof]) {
    if (!vis(p.x0, p.x1)) continue;
    if (p.broken) { if (p.roof) for (let x = Math.round(p.x0); x <= p.x1; x += 3) plot(x, Math.round(p.y0) + (x % 2), GLASS[0]); continue; }
    const a = p.def && p.def.back ? 0.08 : p.roof ? 0.16 : 0.12;
    for (let y = Math.round(p.y0); y <= p.y1; y++) for (let x = Math.round(p.x0); x <= p.x1; x++) { const hl = ((x - Math.round(p.x0)) + (Math.round(p.y1) - y)) % 23 < 2; blendPlot(x, y, 170, 210, 230, hl ? 0.32 : a); }
    if (p.roof) { for (let x = Math.round(p.x0); x <= p.x1; x++) plot(x, Math.round(p.y1) + 1, C('#2a2e36')); plot(Math.round(p.x0), Math.round(p.y0), C('#2a2e36')); }
    for (const ck of p.cracks) { let x = ck.x, y = ck.y; for (let k = 0; k < 7; k++) { const nx = x + ck.dx * 3 + (k % 2 ? 1 : -1), ny = y + ck.dy * 2 + (p.roof ? 0 : 0); line1(x, y, nx, ny, GLASS[1]); x = nx; y = ny; } }
  }
  // the floor mist in the orchid rooms (it hides feet; weapon glints still show over it)
  if (vis(1154, 1504)) for (let x = Math.max(1158, Math.floor(cam.x)); x < Math.min(1500, cam.x + cam.vw); x++) for (let y = GROUND - 12; y < GROUND + 2; y++) { const n = Math.sin(x * 0.05 + t * 0.7) * 0.5 + Math.sin(x * 0.13 - t * 1.1) * 0.5; blendPlot(x, y, 210, 228, 220, Math.max(0, 0.42 - (GROUND - y) * 0.028 + n * 0.08)); }
  // steam from a burst pipe
  for (const p of S.pipes) if (p.t > 0) for (let i = 0; i < 22; i++) { const ph = (t * 0.9 + i / 22) % 1, x = p.x + Math.sin(i * 2.3 + t * 2) * D.STEAM.r * ph, y = p.y + ph * (GROUND - p.y); blendPlot(Math.round(x), Math.round(y), 235, 240, 240, 0.5 * Math.min(1, p.t)); blendPlot(Math.round(x) + 1, Math.round(y), 235, 240, 240, 0.4 * Math.min(1, p.t)); }
  // slip zones: spilt champagne and glass
  for (const z of S.slips) for (let x = z.x0; x <= z.x1; x += 2) if ((x * 7) % 5 < 2) plot(x, GROUND + 1, (x + Math.floor(t * 8)) % 9 === 0 ? C('#ffffff') : C('#e8e0a0'));
  // floor tells: falling shards' frost marks, a chandelier's shadow, the lantern's mark, a charge's path, the wet zones before a shock
  for (const s of S.shards) if (s.t > 0) { const k = 1 - s.t / D.SHARD.warn; for (let x = Math.round(s.x0); x <= s.x1; x++) if ((x + Math.floor(t * 14)) % 3) blendPlot(x, GROUND + 2, 230, 245, 255, 0.4 + 0.5 * k); }
  for (const ch of S.chands) if (ch.st === 'warn') for (let x = ch.x - D.CHAND.r; x <= ch.x + D.CHAND.r; x++) blendPlot(x, GROUND + 2, 20, 10, 10, 0.6);
  if (S.lantern && S.lantern.st === 'warn') for (let x = D.LANTERN.x - 30; x <= D.LANTERN.x + 30; x++) if ((x + Math.floor(t * 12)) % 3) blendPlot(x, GROUND + 2, 255, 200, 120, 0.7);
  for (const f of S.tells) { if (f.kind === 'path') for (let x = Math.min(f.x0, f.x1); x <= Math.max(f.x0, f.x1); x += 4) if (Math.floor(t * 10) % 2) { plot(x, GROUND + 2, C('#ffd060')); plot(x + 1, GROUND + 2, C('#ffd060')); } }
  if (S.shockWarn || S.zapT > 0) for (const z of S.wetZones()) for (let x = z.x0; x <= z.x1; x++) if ((x + Math.floor(t * 20)) % 3 === 0) blendPlot(x, GROUND + 2 + (x % 4), 120, 200, 255, S.zapT > 0 ? 0.95 : 0.6);
  if (S.zapT > 0) for (const z of S.wetZones()) for (let k = 0; k < 6; k++) { const x = Math.round(z.x0 + ((t * 300 + k * 37) % Math.max(1, z.x1 - z.x0))); line1(x, GROUND - 1, x + 2, GROUND - 8, C('#e0f8ff')); }
  // sniper dots: a thin red line down from the sky (in the snow and the mist), the dot (bright on a lock)
  for (const d of S.dots) {
    if (d.st === 'off' || d.st === 'cd' || !vis(d.x - 4, d.x + 4)) continue;
    const lock = d.st === 'lock', a = lock ? 0.45 : d.blocked ? 0.08 : 0.18, k = (d.y - cam.y + 40) / 260;
    for (let s = 0; s < 1; s += 0.004) { const y = cam.y - 40 + s * (d.y - cam.y + 40), x = d.x + (d.nest.x - d.x) * (1 - s) * k * 0.15; if (((y | 0) + Math.floor(t * 30)) % 4) blendPlot(Math.round(x), Math.round(y), 255, 30, 30, a); }
    const r = lock ? 1 + (Math.floor(t * 16) % 2) : d.blocked ? (Math.floor(t * 20) % 2 ? 0 : 1) : 1, c = lock ? C('#ff4040') : C('#c01818');
    for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r + 1) plot(Math.round(d.x) + xx, Math.round(d.y) + yy, c);
  }
  // the revolver's tell: a click and a glint at the muzzle (never a red dot)
  for (const g of S.glints) { for (let k = -3; k <= 3; k++) { plot(g.x + k, g.y, C('#ffffff')); plot(g.x, g.y + k, C('#ffffff')); } }
  // a room narrower than the view: past its walls, the dark (the camera keeps it in the middle)
  if (S.dark) { const [a, b] = S.dark, y0 = Math.floor(cam.y), y1 = Math.ceil(cam.y + cam.vh); for (let x = Math.floor(cam.x); x < cam.x + cam.vw; x++) { if (x >= a - 4 && x <= b + 4) continue; const k = Math.min(1, (x < a ? a - 4 - x : x - b - 4) / 10); for (let y = y0; y < y1; y++) blendPlot(x, y, 6, 6, 10, 0.55 + 0.4 * k); } }
}
