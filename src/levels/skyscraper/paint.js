// Level 8, "The Spire": the art. Every pixel is painted in code (like the other levels).
//   paint(api)        once: the static world layer, the props mask, the puddle mask
//   drawWorld(R, S)   per frame, on the wall behind everyone: the lift's facade scroll, the twin car, the cradle, the chandelier, the
//                     mirrors' reflections, the cases, the guests, the piano, the glass floor's cracks, the gears, the pendulum,
//                     the clock hands and the bell, Nero's hatch, the hanging Conductor in the ending
//   drawFx(R, S)      per frame, over the lit scene: glass fronts, forks, the falling bodies, floor tells (rings, marks, the laser
//                     sweep, the peal's rings), the prompt rings, the lift's floor seams
// R: { plot, line1, blendPlot, cam, t } (world coordinates); S: the run state (src/levels/skyscraper/run.js)
import { C } from '../../core/color.js';
import { text } from '../metro/paint.js';
import * as D from './data.js';

const GROUND = D.GROUND, H = 320, STREET = 14;
const shade = (c, k) => { const f = v => Math.max(0, Math.min(255, Math.round(v * k))); return (255 << 24 | f(c >> 16 & 255) << 16 | f(c >> 8 & 255) << 8 | f(c & 255)) >>> 0; };
const mix = (a, b, k) => { const m = sh => Math.round((a >> sh & 255) * (1 - k) + (b >> sh & 255) * k); return (0xff000000 | m(16) << 16 | m(8) << 8 | m(0)) >>> 0; };
const noise2 = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; };

export const SC = {
  out: C('#100e14'), marble: C('#2a2420'), marbleL: C('#3a322a'), vein: C('#6a5838'), gold: C('#c8a050'), goldD: C('#8a6a30'), goldL: C('#f0d080'),
  black: C('#141216'), blackL: C('#24222a'), mirror: C('#3a4450'), mirrorL: C('#6a7888'), mirrorD: C('#262e38'), red: C('#8a1a22'), redD: C('#5a1016'),
  sky0: C('#080a14'), sky1: C('#1a1e30'), cloud: C('#262a3c'), cloudL: C('#3a3f58'), city: C('#0e1018'), cityL: C('#e0b060'), cityC: C('#60a0d0'),
  glass: C('#1a2a38'), glassL: C('#4a6a80'), steel: C('#6a727c'), steelD: C('#3a4048'), steelL: C('#a0a8b2'),
  leaf: C('#2a4a2a'), leafD: C('#1a321c'), leafL: C('#4a7040'), stone: C('#7a766a'), stoneD: C('#5a564c'), wood: C('#6a4a30'), woodD: C('#4a3220'), water: C('#203a44'), waterL: C('#4a7a84'),
  white: C('#e8e8ec'), whiteD: C('#c0c2c8'), silver: C('#9aa0aa'), brick: C('#5a3022'), brickD: C('#40221a'), brass: C('#b08840'), brassD: C('#7a5a28'), brassL: C('#e0c070'),
  amber: C('#ffb050'), amberD: C('#a06020'), dial: C('#f0d8a0'), lamp: C('#ffe0a0'), beacon: C('#ff3030'),
};

// ---- the static layer ----
export function paint(api) {
  const { W, WIN_A, WIN_C } = api;
  const b = new Uint32Array(W * H), props = new Uint8Array(W * H), pud = new Uint8Array((STREET + 1) * W);
  const put = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < W && y < H) b[y * W + x] = c; };
  const rect = (x0, y0, x1, y1, f) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = f(x, y); if (c) put(x, y, c); } };
  const O = SC.out;
  const storm = (x, y, top = 0) => { const n = noise2(x >> 3, y >> 3) * 0.6 + noise2(x >> 4, y >> 2) * 0.4; return n > 0.72 ? SC.cloudL : n > 0.5 ? SC.cloud : mix(SC.sky0, SC.sky1, Math.min(1, (y - top) / 200)); };
  const cityFar = (x, y, y0) => {   // the city far below: a dark grid with lit windows and street lamps
    if (y < y0) return null;
    const gx = x % 11, gy = (y - y0) % 9, far = Math.max(0, 1 - (y - y0) / 60) * 0.5;   // (a haze over the near rows)
    if (gx === 0 || gy === 0) return noise2(x >> 2, y) < 0.03 ? mix(SC.cityL, SC.sky0, 0.4 + far) : mix(SC.city, SC.sky1, far);
    return noise2(x, y) < 0.025 ? mix(noise2(x + 1, y) < 0.6 ? SC.cityL : SC.cityC, SC.sky0, 0.35 + far) : mix(SC.city, SC.sky0, 0.45 + far * 0.5);
  };

  for (let x = 0; x < W; x++) for (let y = 0; y < GROUND; y++) {
    let c;
    if (x < 530) {   // the lobby: black and gold marble, a coffered ceiling, high storm windows, a red runner on the mezzanine
      if (y < 40) c = (x % 24 < 2 || y % 20 < 2) ? SC.goldD : SC.black;
      else if (y < 90 && (x % 70) > 14 && (x % 70) < 56) c = (x % 70 === 35) ? SC.goldD : storm(x, y + 100);   // the high windows
      else { c = noise2(x >> 2, y >> 3) < 0.06 ? SC.vein : (x + y * 2) % 41 === 0 ? SC.marbleL : SC.marble; if (y > 196 && y < 200) c = SC.goldD; if (y > GROUND - 8) c = shade(c, 0.7); }
    } else if (x < 830) {   // the lift: the storm and the facade (the scroll itself is drawn live)
      c = storm(x, y);
    } else if (x < 1350) {   // the sky garden: the storm in layers, the crown lit above, the city through the gaps
      c = storm(x, y);
      if (y > 200) c = cityFar(x, y, 200) || c;
      if (x > 1060 && x < 1140 && y < 70) { const dx = x - 1100, dy = y - 40; if (dx * dx + dy * dy < 22 * 22) c = dx * dx + dy * dy > 19 * 19 ? SC.brass : SC.amberD; if (y > 60 && Math.abs(dx) < 10) c = SC.city; }   // the crown's face, far above
    } else if (x < 1710) {   // the penthouse: white walls, a window wall onto the storm
      if (y < 50) c = SC.whiteD;
      else if (y < 200 && (x - 1360) % 60 > 4) c = storm(x, y);
      else c = (x + y) % 37 === 0 ? SC.whiteD : SC.white;
      if (y >= 200 && y < 204) c = SC.silver;
    } else if (x < 1850) {   // the vestry: brick and brass, one warm lamp
      c = ((y >> 2) + ((x >> 3) & 1)) % 2 === 0 && (x % 8 === 0 || y % 4 === 0) ? SC.brickD : SC.brick;
      if (y < 60) c = SC.brickD;
    } else if (x < 2430) {   // the crown: brass ribs and dark timber; the back of the dial glows amber in the gear room
      c = (x % 30 < 3) ? SC.brassD : (y % 40 < 2) ? SC.woodD : noise2(x >> 2, y >> 2) < 0.1 ? SC.woodD : SC.wood;
      c = shade(c, 0.55);
      if (x >= 1880 && x < 2140 && y > 20 && y < 160) { const dx = x - 2000, dy = y - 90, r = Math.hypot(dx, dy); if (r < 70) c = r > 66 ? SC.brass : mix(SC.amber, SC.amberD, Math.min(1, r / 70 + noise2(x, y) * 0.2)); }
    } else {   // the face: the storm at its peak, the city far below
      c = storm(x, y);
      if (y > 230) c = cityFar(x, y, 230) || c;
    }
    b[y * W + x] = c;
  }
  // walls between sections
  for (const [a] of D.GROUPS.slice(1)) rect(a - 18, 0, a - 3, GROUND - 1, (x, y) => x === a - 18 || x === a - 3 ? O : (x + y) % 11 === 0 ? SC.steelD : SC.blackL);

  // ---- the lobby ----
  text((x, y, c) => put(x, y, c), 'MERIDIAN', 150, 100, SC.gold, 2);
  // the revolving door: glass wings and a brass drum, the street in the rain beyond
  rect(2, GROUND - 70, 28, GROUND - 1, (x, y) => x === 2 || x === 28 || y === GROUND - 70 ? SC.gold : x === 15 ? SC.goldD : (x + y) % 5 === 0 ? SC.glassL : SC.glass);
  // pillars
  for (const px of [92, 420]) rect(px - 6, 40, px + 6, GROUND - 1, (x, y) => x === px - 6 || x === px + 6 ? O : y < 48 || y > GROUND - 8 ? SC.gold : (x + y) % 9 === 0 ? SC.marbleL : SC.blackL);
  // the mezzanine: a slab with a gold rail
  rect(D.MEZZ.x0, D.MEZZ.y, D.MEZZ.x1, D.MEZZ.y + 6, (x, y) => y === D.MEZZ.y ? SC.red : y === D.MEZZ.y + 6 ? O : SC.blackL);
  for (let x = D.MEZZ.x0; x <= D.MEZZ.x1; x++) { put(x, D.MEZZ.y - 10, SC.gold); if (x % 8 === 0) for (let y = D.MEZZ.y - 9; y < D.MEZZ.y; y++) put(x, y, SC.goldD); }
  // the grand stair: a gold-edged flight
  for (let i = 0; i < D.STAIR.n; i++) { const x0 = D.STAIR.x0 + i * D.STAIR.step, y = GROUND - (i + 1) * D.STAIR.step; rect(x0, y, x0 + D.STAIR.step - 1, GROUND - 1, (x, yy) => yy === y ? SC.gold : yy === y + 1 ? SC.red : SC.blackL); }
  // the reception desk
  rect(D.DESK.x0, D.DESK.top, D.DESK.x1, GROUND - 1, (x, y) => x === D.DESK.x0 || x === D.DESK.x1 || y === D.DESK.top ? O : y < D.DESK.top + 3 ? SC.gold : (x % 10 === 0) ? SC.goldD : SC.black);
  text((x, y, c) => put(x, y, c), 'RECEPTION', 230, 256, SC.goldD);
  // the lift doors (brass, a floor dial above)
  rect(D.LIFT_DOORS - 10, GROUND - 60, D.LIFT_DOORS + 10, GROUND - 1, (x, y) => x === D.LIFT_DOORS - 10 || x === D.LIFT_DOORS + 10 || y === GROUND - 60 || x === D.LIFT_DOORS ? O : (x + y) % 7 === 0 ? SC.brassD : SC.brass);
  for (let k = 0; k <= 8; k++) put(D.LIFT_DOORS - 4 + k, GROUND - 66 - Math.round(Math.sin(k / 8 * Math.PI) * 4), SC.gold);
  // the frames of the mirrors
  for (const p of D.PANES) if (p.mirror) rect(p.x0 - 2, p.y0 - 2, p.x1 + 2, p.y1 + 2, (x, y) => (x < p.x0 || x > p.x1 || y < p.y0 || y > p.y1) ? SC.gold : 0);

  // ---- the glass lift: the guide rails on the facade; the parking stage of the cradle
  for (const gx of [596, 764]) for (let y = 0; y < GROUND; y++) { put(gx, y, SC.steelD); put(gx + 1, y, SC.steel); }

  // ---- the sky garden ----
  text((x, y, c) => put(x, y, c), 'SKY GARDEN 75', 870, 120, SC.amber);
  // the parapet behind, a hedge line
  rect(840, GROUND - 22, 1340, GROUND - 1, (x, y) => y === GROUND - 22 ? SC.stone : noise2(x >> 1, y >> 1) < 0.5 ? SC.leaf : SC.leafD);
  // the pergola: posts and a slatted top
  rect(D.PERGOLA.x0, D.PERGOLA.y, D.PERGOLA.x1, D.PERGOLA.y + 4, (x, y) => y === D.PERGOLA.y ? SC.woodD : (x % 6 < 2) ? SC.wood : 0);
  for (const px of [D.PERGOLA.x0 + 2, D.PERGOLA.x1 - 2]) rect(px - 2, D.PERGOLA.y, px + 2, GROUND - 1, (x) => x === px - 2 || x === px + 2 ? O : SC.wood);
  for (let x = D.PERGOLA.x0; x <= D.PERGOLA.x1; x++) for (let k = 0; k < 6; k++) if (noise2(x, k) < 0.5) put(x, D.PERGOLA.y - 1 - k + Math.round(noise2(x >> 2, 1) * 2), noise2(x, k + 9) < 0.5 ? SC.leaf : SC.leafL);
  // planters
  for (const p of D.PLANTERS) { rect(p.x0, D.PLANTER_TOP, p.x1, GROUND - 1, (x, y) => x === p.x0 || x === p.x1 || y === D.PLANTER_TOP ? O : (x + y) % 9 === 0 ? SC.stoneD : SC.stone); for (let x = p.x0 + 1; x < p.x1; x++) for (let k = 1; k < 10; k++) if (noise2(x, k) < 0.4 - k * 0.03) put(x, D.PLANTER_TOP - k, k % 2 ? SC.leafL : SC.leaf); }
  // the gardener's bench, the tea pavilion's roof
  rect(D.BENCH - 12, GROUND - 10, D.BENCH + 12, GROUND - 7, () => SC.wood);
  rect(D.PAVILION - 22, GROUND - 70, D.PAVILION + 22, GROUND - 64, (x, y) => y === GROUND - 70 ? O : SC.redD);
  for (const px of [D.PAVILION - 18, D.PAVILION + 18]) rect(px, GROUND - 64, px + 1, GROUND - 1, () => SC.redD);
  // the gap: nothing below the beam but the city
  for (let x = D.GAP.x0; x <= D.GAP.x1; x++) for (let y = 160; y < GROUND; y++) put(x, y, cityFar(x, y, 200) || storm(x, y));
  rect(D.BEAM.x0, D.BEAM.y, D.BEAM.x1, D.BEAM.y + 3, (x, y) => y === D.BEAM.y ? SC.steelL : y === D.BEAM.y + 3 ? O : SC.steelD);
  // the helideck: a yellow H
  text((x, y, c) => put(x, y, c), 'H', 1286, 240, C('#d8b020'), 3);
  // the windbreak's frame and the drop beyond it
  for (let y = D.WINDBREAK.y0 - 2; y < GROUND; y++) { put(D.WINDBREAK.x - 3, y, SC.steelD); put(D.WINDBREAK.x + 3, y, SC.steelD); }
  for (let x = D.GARDEN_VOID[0]; x < D.GARDEN_VOID[1] + 4; x++) for (let y = 180; y < GROUND; y++) put(x, y, cityFar(x, y, 200) || storm(x, y));
  // the stairwell door (Nero's bark), the service lift
  rect(D.NERO_DOOR - 9, GROUND - 56, D.NERO_DOOR + 9, GROUND - 1, (x, y) => x === D.NERO_DOOR - 9 || x === D.NERO_DOOR + 9 || y === GROUND - 56 ? O : SC.steelD);
  rect(D.SERVICE_LIFT - 10, GROUND - 58, D.SERVICE_LIFT + 10, GROUND - 1, (x, y) => x === D.SERVICE_LIFT - 10 || x === D.SERVICE_LIFT + 10 || y === GROUND - 58 || x === D.SERVICE_LIFT ? O : SC.steel);

  // ---- the penthouse ----
  text((x, y, c) => put(x, y, c), '90', 1372, 70, SC.silver, 3);
  rect(D.BAR.x0, D.BAR.top, D.BAR.x1, GROUND - 1, (x, y) => x === D.BAR.x0 || x === D.BAR.x1 || y === D.BAR.top ? O : y < D.BAR.top + 3 ? SC.gold : SC.black);
  rect(D.PH_MEZZ.x0, D.PH_MEZZ.y, D.PH_MEZZ.x1, D.PH_MEZZ.y + 5, (x, y) => y === D.PH_MEZZ.y ? SC.silver : y === D.PH_MEZZ.y + 5 ? O : SC.whiteD);
  for (let x = D.PH_MEZZ.x0; x <= D.PH_MEZZ.x1; x += 6) for (let y = D.PH_MEZZ.y - 9; y < D.PH_MEZZ.y; y++) put(x, y, SC.glassL);
  rect(D.RAIL.x0, D.RAIL.y, D.RAIL.x1, D.RAIL.y + 2, (x, y) => y === D.RAIL.y ? SC.silver : SC.steelD);
  for (let y = D.RAIL.y; y < GROUND; y++) put(D.RAIL.x0 + 1, y, SC.steel);
  rect(D.VESTRY_DOOR - 8, GROUND - 56, D.VESTRY_DOOR + 6, GROUND - 1, (x, y) => x === D.VESTRY_DOOR - 8 || y === GROUND - 56 ? O : SC.woodD);

  // ---- the vestry: the stair up the back wall, the rack, the bench, the hatch ----
  for (let i = 0; i < 12; i++) rect(1730 + i * 8, GROUND - 14 - i * 12, 1742 + i * 8, GROUND - 12 - i * 12, () => SC.brassD);
  rect(D.VESTRY.rack - 10, GROUND - 46, D.VESTRY.rack + 10, GROUND - 44, () => SC.woodD);
  rect(D.VESTRY.bench - 14, GROUND - 12, D.VESTRY.bench + 14, GROUND - 9, () => SC.wood);
  rect(D.VESTRY.hatch - 8, GROUND - 60, D.VESTRY.hatch + 8, GROUND - 1, (x, y) => x === D.VESTRY.hatch - 8 || x === D.VESTRY.hatch + 8 || y === GROUND - 60 ? O : (y % 6 === 0) ? SC.brassD : SC.brass);

  // ---- the crown ----
  text((x, y, c) => put(x, y, c), 'BELL & SONS', 1890, 250, SC.brassL);
  // the ladder out of the gear room; the dial wall at the end of the pendulum hall
  for (let y = 40; y < GROUND; y++) { put(D.GEAR_ARENA.ladder - 4, y, SC.brassD); put(D.GEAR_ARENA.ladder + 4, y, SC.brassD); if (y % 8 === 0) for (let x = -4; x <= 4; x++) put(D.GEAR_ARENA.ladder + x, y, SC.brass); }
  for (const bl of D.BALCONIES) { rect(bl.x0, bl.y, bl.x1, bl.y + 5, (x, y) => y === bl.y ? SC.brassL : y === bl.y + 5 ? O : SC.brassD); for (let x = bl.x0; x <= bl.x1; x += 5) for (let y = bl.y - 8; y < bl.y; y++) put(x, y, SC.brassD); }
  rect(D.PEND_ARENA.dial - 2, 20, D.PEND_ARENA.dial + 2, GROUND - 1, (x, y) => (y + x) % 7 === 0 ? SC.amber : SC.amberD);   // the back of the face's glass

  // ---- the face (outside): the cornice, the drop ----
  for (let x = D.FACE.void[0]; x < W; x++) for (let y = 200; y < GROUND; y++) put(x, y, cityFar(x, y, 230) || storm(x, y));
  for (let x = D.FACE.cornice[0] - 14; x <= D.FACE.cornice[1]; x++) for (let y = GROUND - 6; y < GROUND; y++) put(x, y, y === GROUND - 6 ? SC.stone : (x + y) % 9 === 0 ? SC.stoneD : shade(SC.stone, 0.8));
  rect(D.FACE.hatch - 8, GROUND - 40, D.FACE.hatch + 8, GROUND - 7, (x, y) => x === D.FACE.hatch - 8 || x === D.FACE.hatch + 8 || y === GROUND - 40 ? O : SC.steelD);

  const pre = b.slice();
  // ---- the floor band ----
  for (let x = 0; x < W; x++) for (let y = GROUND; y < H; y++) {
    const d = y - GROUND; let c;
    if (x < 530) c = d === 0 ? SC.gold : ((x >> 3) + (d >> 2)) % 2 ? SC.marble : SC.black;
    else if (x < 830) { c = x >= D.CAR.x0 && x <= D.CAR.x1 ? (d === 0 ? SC.steelL : d < 4 ? SC.steel : SC.glass) : (cityFar(x, y + 200, 0) || SC.sky0); }
    else if (x < 1350) { c = d === 0 ? SC.stone : noise2(x, d) < 0.5 ? SC.stoneD : shade(SC.stone, 0.7); if (d > 2 && d < STREET && noise2(x >> 3, d) < 0.3) { c = mix(c, C('#1a2030'), 0.5); pud[d * W + x] = 1; } if (x >= D.KOI.x0 && x <= D.KOI.x1 && d < STREET) { c = d % 3 === 0 && (x + d) % 7 < 2 ? SC.waterL : SC.water; pud[d * W + x] = 1; } }
    else if (x < 1710) c = d === 0 ? SC.silver : (x % 12 === 0 || d % 5 === 0) ? SC.whiteD : SC.white;
    else if (x < 1850) c = d === 0 ? SC.brassD : ((x >> 2) + d) % 3 ? SC.woodD : SC.wood;
    else if (x < 2430) c = d === 0 ? SC.brass : (x % 10 === 0) ? SC.woodD : shade(SC.wood, 0.7);
    else { c = d === 0 ? SC.stone : noise2(x, d) < 0.5 ? SC.stoneD : shade(SC.stone, 0.6); if (d > 2 && d < STREET && noise2(x >> 2, d) < 0.2) { c = mix(c, C('#1a2030'), 0.5); pud[d * W + x] = 1; } }
    if ((x >= D.GAP.x0 && x <= D.GAP.x1) || (x >= D.FACE.void[0]) || (x >= D.GARDEN_VOID[0] && x < 1340) || (x >= 540 && x < D.CAR.x0) || (x > D.CAR.x1 && x < 830)) c = cityFar(x, y + 120, 0) || SC.sky0;
    b[y * W + x] = c;
  }
  for (let i = 0; i < b.length; i++) if (b[i] !== pre[i] && i < GROUND * W) props[i] = 1;
  return { b, props, bg: pre, pud, winl: [] };
}
