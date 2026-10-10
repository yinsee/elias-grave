// Level 5, "St. Cecilia": the art. Every pixel is painted in code (like Pier 9 and Line Zero).
//   paint(api)             once: the static world layer (stat), the props mask, the puddle mask
//   drawWorld(R, S)        per frame, on the wall behind everyone: the monitor, the vent, drawers, doors, levers, the clock, signs
//   drawFx(R, S)           per frame, over the lit scene (unlit): glass panes, curtains, sheets, eyes and glints in the dark, arcs,
//                          floor tells (the defib ring, a bed's path, a lightning ring, Code Blue), the sedation vignette
//   drawBed(R, b), drawGurney(R, g)   the movers (2D: behind the fight lane; 3D: models from the same pixels)
// R: { plot, line1, blendPlot, cam, t } (world coordinates); S: the run state (src/levels/hospital/run.js)
import { C } from '../../core/color.js';
import { text } from '../metro/paint.js';
import * as D from './data.js';

const GROUND = D.GROUND, H = 320, STREET = 14;
const shade = (c, k) => { const f = v => Math.max(0, Math.min(255, Math.round(v * k))); return (255 << 24 | f(c >> 16 & 255) << 16 | f(c >> 8 & 255) << 8 | f(c & 255)) >>> 0; };
const mix = (a, b, k) => { const m = sh => Math.round((a >> sh & 255) * (1 - k) + (b >> sh & 255) * k); return (0xff000000 | m(16) << 16 | m(8) << 8 | m(0)) >>> 0; };
const noise2 = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; };

export const HC = {
  out: C('#14121c'), ceil: C('#161a1c'), ceilL: C('#20262a'),
  gtile: C('#5e7a6a'), gtileD: C('#52705e'), ggrout: C('#3a4a40'), cream: C('#b8b4a0'), creamD: C('#9c9886'), deco: C('#2a3a34'), decoL: C('#c8a050'),
  sheet: C('#7c8a86'), sheetD: C('#66746f'), haz: C('#c8a020'), hazD: C('#2a2a2a'),
  steel: C('#7c848e'), steelD: C('#4c525a'), steelL: C('#a8b0ba'), btile: C('#4a5a68'), btileD: C('#3e4c58'), bgrout: C('#2a343e'),
  pale: C('#a8b8c4'), paleD: C('#8c9ca8'), wtile: C('#c8d4cc'), wtileD: C('#b0beb4'), wgrout: C('#8a988e'),
  glassD: C('#141c24'), glassL: C('#2a3a4a'), white: C('#e8ece8'), sheetW: C('#dce2dc'), blanket: C('#7a9ab0'), mags: C('#3a2418'),
  wood: C('#6a4a30'), woodD: C('#4e3622'), red: C('#a83228'), redD: C('#6a1e18'), yel: C('#d8b020'),
  conc: C('#5a5c62'), concD: C('#46484e'), concL: C('#6e7076'), asph: C('#2a2c32'), asphL: C('#34363e'),
  sky0: C('#0c0e18'), sky1: C('#1a1e30'), cloud: C('#262a3c'), cloudL: C('#323850'), far: C('#14161e'), farL: C('#1c1f2a'), river: C('#10141e'),
  lino: C('#6e7e74'), linoD: C('#627268'), linoL: C('#7e8e84'), mtile: C('#38485a'), mtileD: C('#2e3c4c'),
  amb: C('#e4e4dc'), ambD: C('#b8b8ae'), ambR: C('#c02a2a'),
  // these glow (src/legacy.js EMIT): the red exit signs, the monitor's green
  exit: C('#ff3c2c'), mon: C('#62ff8e'),
};

// ---- the static layer ----
// api: { W, H, GROUND, LAMP_GLASS, WIN_A, WIN_B, WIN_C, FWIN_A, FWIN_B, NEON_C, NEON_Y, SPARK }
export function paint(api) {
  const { W, LAMP_GLASS, WIN_A, WIN_B, WIN_C } = api, FWIN_A = api.FWIN_A || WIN_B, FWIN_B = api.FWIN_B || WIN_A;
  const b = new Uint32Array(W * H), props = new Uint8Array(W * H), pud = new Uint8Array((STREET + 1) * W);
  const put = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < W && y < H) b[y * W + x] = c; };
  const rect = (x0, y0, x1, y1, f) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = f(x, y); if (c) put(x, y, c); } };
  const O = HC.out;

  // ---- the back wall, section by section ----
  for (let x = 0; x < W; x++) for (let y = 0; y < GROUND; y++) {
    let c;
    if (x < 396) {   // the ward: a dark ceiling, cream upper wall with an Art Deco band, green tiles below
      if (y < 64) c = (y + x) % 17 === 0 ? HC.ceilL : HC.ceil;
      else if (y < 112) c = (x + y) % 23 === 0 ? HC.creamD : HC.cream;
      else if (y < 118) { c = HC.deco; if (y === 114 && (x % 12 === 0 || x % 12 === 6)) c = HC.decoL; if (y === 115 && x % 12 === 3) c = HC.decoL; }
      else { const ty = y - 118, row = Math.floor(ty / 6), tx = (x + (row % 2) * 4) % 8; c = ty % 6 === 5 || tx === 0 ? HC.ggrout : (row * 5 + Math.floor((x + (row % 2) * 4) / 8)) % 7 === 0 ? HC.gtileD : HC.gtile; if (y > GROUND - 8) c = shade(c, 0.7); }
    } else if (x < 1004) {   // the closed wing: grey-green plaster, a skylight strip, hazard bands
      if (y < 38) c = HC.ceil;
      else if (y < 58) c = x >= 420 && x < 990 ? ((x >> 4) % 2 ? HC.glassD : HC.glassL) : HC.ceil;   // the skylight
      else if (y < 64) c = HC.deco;
      else { c = noise2(x >> 1, y >> 1) < 0.05 ? HC.sheetD : HC.sheet; if (y >= 160 && y < 166) c = ((x + y) >> 2) % 2 ? HC.haz : HC.hazD; if (y > GROUND - 10) c = shade(HC.sheet, 0.7); }
    } else if (x < 1488) {   // the morgue: steel-blue tiles, a low concrete ceiling
      if (y < 70) c = (x + y) % 19 === 0 ? HC.concD : shade(HC.conc, 0.6);
      else { const ty = y - 70, row = Math.floor(ty / 7), tx = x % 9; c = ty % 7 === 6 || tx === 0 ? HC.bgrout : (row + Math.floor(x / 9)) % 5 === 0 ? HC.btileD : HC.btile; if (y > GROUND - 8) c = shade(c, 0.75); }
    } else if (x < 1822) {   // the ER: pale blue walls, a white band
      if (y < 60) c = HC.ceil;
      else if (y < 150) c = (x * 3 + y) % 29 === 0 ? HC.paleD : HC.pale;
      else if (y < 156) c = HC.white;
      else c = y > GROUND - 10 ? HC.paleD : (x + y) % 31 === 0 ? HC.paleD : shade(HC.pale, 0.92);
    } else if (x < 2066) {   // the bay: a storm sky over the street; the hospital's flank on the right
      if (x >= 2040) c = y < 120 ? HC.concD : (x + y) % 13 === 0 ? HC.concD : HC.conc;
      else if (y < 150) { const n = noise2(x >> 3, y >> 3) * 0.6 + noise2(x >> 4, y >> 2) * 0.4; c = n > 0.72 ? HC.cloudL : n > 0.5 ? HC.cloud : mix(HC.sky0, HC.sky1, y / 150); }
      else { c = HC.far; const bx = Math.floor((x - 1822) / 18), top = 150 + Math.floor(noise2(bx, 3) * 50); if (y < top) c = mix(HC.sky0, HC.sky1, y / 150); else if ((x % 18) > 4 && (x % 18) < 9 && (y - top) % 9 === 3 && y < 236 && noise2(x >> 3, y >> 3) < 0.18) c = noise2(x >> 2, y) < 0.5 ? C('#6a5430') : C('#4e4026'); else if (y >= 236) c = shade(HC.far, 0.7); }
    } else if (x < 2420) {   // the theatre: white-green tiles, clerestory windows high on the back wall
      if (y < 60) c = HC.ceil;
      else { const ty = y - 60, row = Math.floor(ty / 6), tx = (x + (row % 2) * 3) % 7; c = ty % 6 === 5 || tx === 0 ? HC.wgrout : (row * 3 + Math.floor(x / 7)) % 9 === 0 ? HC.wtileD : HC.wtile; if (y > GROUND - 8) c = shade(c, 0.8); }
      if (x >= D.CLERESTORY.x0 && x <= D.CLERESTORY.x1 && y >= D.CLERESTORY.y0 && y <= D.CLERESTORY.y1) c = (x - D.CLERESTORY.x0) % 26 < 2 || y === D.CLERESTORY.y0 || y === D.CLERESTORY.y1 ? HC.steelD : HC.glassD;
    } else {   // the roof: the storm sky, the city far below, police HQ across the river
      const n = noise2(x >> 3, y >> 3) * 0.6 + noise2(x >> 4, y >> 2) * 0.4;
      c = n > 0.7 ? HC.cloudL : n > 0.48 ? HC.cloud : mix(HC.sky0, HC.sky1, y / 200);
      if (y > 200) { c = HC.river; if (y < 214) { const bx = Math.floor(x / 10), top = 200 + Math.floor(noise2(bx, 9) * 12); if (y >= top) c = HC.far; } }
      if (y > 150 && y <= 200) { const bx = Math.floor(x / 14), top = 150 + Math.floor(noise2(bx, 7) * 40); if (y >= top) { c = (x % 14) === 0 ? HC.far : HC.farL; if ((x % 14) > 3 && (x % 14) < 8 && (y - top) % 8 === 2 && noise2(x >> 3, y >> 3) < 0.2) c = noise2(x >> 2, y + 1) < 0.5 ? C('#6a5430') : C('#4e4026'); } }
      // police HQ: a tall block with a lit crown (L6's hook)
      if (x >= 2600 && x <= 2640 && y >= 120 && y <= 200) { c = (x === 2600 || x === 2640) ? HC.far : HC.farL; if ((x - 2602) % 6 < 3 && (y - 124) % 7 < 3 && y > 128) c = noise2(x, y) < 0.6 ? WIN_C : FWIN_A; if (y < 128) c = api.NEON_C || WIN_C; }
    }
    b[y * W + x] = c;
  }
  // the walls between the floors: thick concrete
  for (const wx of D.WALLS) rect(wx - 4, 0, wx + 3, GROUND - 1, (x, y) => x === wx - 4 || x === wx + 3 ? O : (y + x) % 11 === 0 ? HC.concD : HC.conc);
  // ward windows: rain-dark glass, the city's lights behind
  for (const wx of D.WARD_WIN) rect(wx - 16, 136, wx + 16, 196, (x, y) => x === wx - 16 || x === wx + 16 || y === 136 || y === 196 || x === wx ? HC.deco : y > 180 && (x * 7 + y) % 11 === 0 ? FWIN_A : (x + y * 3) % 17 === 0 ? HC.glassL : HC.glassD);
  // the bay's hospital flank: windows up the wall
  for (let wy = 30; wy < 110; wy += 26) rect(2044, wy, 2062, wy + 14, (x, y) => x === 2044 || y === wy ? O : (x + y) % 5 === 0 ? WIN_C : HC.glassD);

  // doors: the stair doors (steel, a wired window) under red EXIT signs; the east doorway; the dead lift; the trauma lift
  const stairDoor = (dx) => {
    rect(dx - 11, GROUND - 58, dx + 11, GROUND - 1, (x, y) => x === dx - 11 || x === dx + 11 || y === GROUND - 58 ? O : x === dx - 10 || x === dx + 10 ? HC.steelD : y > GROUND - 50 && y < GROUND - 36 && x > dx - 5 && x < dx + 5 ? ((x + y) % 3 ? HC.glassD : HC.steelL) : HC.steel);
    rect(dx + 6, GROUND - 30, dx + 8, GROUND - 28, () => HC.steelL);   // the push bar
    rect(dx - 9, GROUND - 70, dx + 9, GROUND - 63, (x, y) => x === dx - 9 || x === dx + 9 || y === GROUND - 70 || y === GROUND - 63 ? O : HC.redD);
    text((x, y, c) => put(x, y, c), 'EXIT', dx - 7, GROUND - 69, HC.exit);
  };
  for (const dx of [D.WARD_STAIR, D.ISO_STAIR, D.MORGUE_STAIR, D.ER_STAIR, D.ROOF_STAIR]) stairDoor(dx);
  rect(D.EAST_DOOR - 8, GROUND - 62, D.EAST_DOOR + 8, GROUND - 1, (x, y) => x <= D.EAST_DOOR - 6 || x >= D.EAST_DOOR + 6 || y <= GROUND - 60 ? HC.wood : shade(HC.sheet, 0.45));   // the open east doorway into the closed wing
  // the dead service lift: brushed doors, an OUT OF ORDER card
  rect(D.SHAFT - 10, GROUND - 60, D.SHAFT + 10, GROUND - 1, (x, y) => x === D.SHAFT - 10 || x === D.SHAFT + 10 || y === GROUND - 60 || x === D.SHAFT ? O : (x + y) % 9 === 0 ? HC.steelD : HC.steel);
  rect(D.SHAFT - 7, GROUND - 44, D.SHAFT - 1, GROUND - 38, () => HC.white);
  rect(D.LIFT - 11, GROUND - 62, D.LIFT + 11, GROUND - 1, (x, y) => x === D.LIFT - 11 || x === D.LIFT + 11 || y === GROUND - 62 || x === D.LIFT ? O : (x + y) % 9 === 0 ? HC.steelD : HC.steel);
  text((x, y, c) => put(x, y, c), 'LIFT', D.LIFT - 7, GROUND - 70, HC.white);

  // ---- the ward ----
  text((x, y, c) => put(x, y, c), 'WARD 3', 40, 80, HC.deco, 2);
  // Room 314: the partition posts and its glass top, the plate
  for (const px of [D.ROOM314.x0, D.ROOM314.x1]) rect(px - 1, 186, px + 1, GROUND - 1, (x) => x === px ? HC.steelL : HC.steelD);
  rect(D.ROOM314.x0, 186, D.ROOM314.x1, 188, () => HC.steelD);
  rect(D.ROOM314.x1 - 26, 192, D.ROOM314.x1 - 6, 200, (x, y) => x === D.ROOM314.x1 - 26 || x === D.ROOM314.x1 - 6 || y === 192 || y === 200 ? O : HC.white);
  text((x, y, c) => put(x, y, c), '314', D.ROOM314.x1 - 22, 194, HC.deco);
  // the payphone on the wall
  rect(D.PAYPHONE - 7, GROUND - 74, D.PAYPHONE + 7, GROUND - 46, (x, y) => x === D.PAYPHONE - 7 || x === D.PAYPHONE + 7 || y === GROUND - 74 || y === GROUND - 46 ? O : y < GROUND - 66 ? HC.red : HC.steelD);
  for (let y = GROUND - 64; y < GROUND - 50; y += 3) for (let x = D.PAYPHONE - 3; x <= D.PAYPHONE + 3; x += 2) put(x, y, HC.steelL);
  // the vent in the ceiling over the bed (Orderlies drop from it)
  rect(D.VENT.x - 12, D.VENT.y - 3, D.VENT.x + 12, D.VENT.y + 3, (x, y) => y === D.VENT.y - 3 || y === D.VENT.y + 3 || x === D.VENT.x - 12 || x === D.VENT.x + 12 ? O : (x % 3 === 0 ? HC.steelD : HC.steel));

  // ---- the closed wing ----
  text((x, y, c) => put(x, y, c), 'ISOLATION', 440, 80, HC.red, 2);
  text((x, y, c) => put(x, y, c), 'NO ENTRY', 610, 100, HC.redD);
  for (const sx of [470, 860]) { for (let k = 0; k < 9; k++) for (let j = -k; j <= k; j++) put(sx + j, 120 + k, k === 8 || Math.abs(j) === k ? O : HC.yel); put(sx, 124, O); put(sx, 125, O); put(sx, 127, O); }   // biohazard triangles
  // the fishbowl: a dark room behind each pane, a bed in it
  for (const f of D.FISH) rect(f.x0, D.FISH_Y[0], f.x1, D.FISH_Y[1], (x, y) => y > D.FISH_Y[1] - 18 && y < D.FISH_Y[1] - 10 && x > f.x0 + 6 && x < f.x0 + 30 ? HC.sheetW : C('#0e1418'));
  // Ward 5: its room beyond the glass wall, three beds
  rect(D.WARD5.room[0], 190, D.WARD5.room[1], GROUND - 1, (x, y) => (x + y) % 23 === 0 ? C('#202a2c') : C('#1a2224'));
  text((x, y, c) => put(x, y, c), 'WARD 5', 892, 178, HC.white);

  // ---- the morgue ----
  text((x, y, c) => put(x, y, c), 'B1  MORGUE', 1040, 86, HC.steelL);
  text((x, y, c) => put(x, y, c), 'COLD ROOM', 1254, 196, HC.steelL);
  // pipes along the generator hall
  for (const py of [92, 98]) for (let x = 1280; x < 1484; x++) { put(x, py, HC.steelD); put(x, py + 1, HC.steel); put(x, py + 2, HC.steelD); }
  for (let y = 100; y < 220; y++) { put(1390, y, HC.steelD); put(1391, y, HC.steel); }

  // ---- the ER ----
  text((x, y, c) => put(x, y, c), 'EMERGENCY', 1540, 80, HC.red, 2);
  rect(1610, 110, 1650, 136, (x, y) => x === 1610 || x === 1650 || y === 110 || y === 136 ? O : C('#1a2a3a'));   // the TV (its glow is drawn live)
  for (let x = 1676; x <= 1768; x++) { put(x, 190, HC.steelD); put(x, 191, HC.steel); }   // the curtain rail
  // the security office: a block wall, a window, lockers
  rect(D.SEC.x0 - 6, 200, D.SEC.x1 + 4, GROUND - 1, (x, y) => (y - 200) % 10 === 0 || (x + Math.floor((y - 200) / 10) * 5) % 14 === 0 ? HC.paleD : C('#7a8a96'));
  rect(D.SEC.x0 + 4, 214, D.SEC.x0 + 14, GROUND - 1, (x, y) => x === D.SEC.x0 + 4 || x === D.SEC.x0 + 14 ? O : HC.steelD);
  text((x, y, c) => put(x, y, c), 'SECURITY', D.SEC.x0 - 4, 204, HC.white);

  // ---- the bay: the canopy's sign, the street kerb in the backdrop ----
  text((x, y, c) => put(x, y, c), 'AMBULANCE', 1850, 186, HC.white);

  // ---- the theatre ----
  text((x, y, c) => put(x, y, c), 'THEATRE 1', 2250, 80, HC.deco, 2);
  // the scrub sinks under the clock
  rect(2076, GROUND - 46, 2110, GROUND - 40, (x, y) => y === GROUND - 46 ? HC.white : HC.steelL);
  for (const sx of [2084, 2100]) { for (let y = GROUND - 56; y < GROUND - 46; y++) put(sx, y, HC.steel); put(sx + 1, GROUND - 56, HC.steel); put(sx + 2, GROUND - 55, HC.steel); }
  // the Bell & Sons clock (its hands are drawn live: they stopped at 3:17)
  { const { x, y } = D.CLOCK; for (let yy = -9; yy <= 9; yy++) for (let xx = -9; xx <= 9; xx++) { const r = Math.hypot(xx, yy); if (r <= 9) put(x + xx, y + yy, r > 8 ? O : r > 7 ? HC.wood : C('#e8e0c8')); } text((xx, yy, c) => put(xx, yy, c), 'BELL', x - 7, y + 12, HC.woodD); }

  const pre = b.slice();   // everything after this is a solid prop (blood sticks to it; the 3D view makes blocks of it)

  // ---- props ----
  // Mags's bed: a steel frame, white sheets, a blanket over her, her dark hair on the pillow
  { const { x0, x1, top } = D.BED;
    rect(x0, top, x1, GROUND - 1, (x, y) => {
      if (y >= GROUND - 4) return x === x0 + 2 || x === x1 - 2 ? O : 0;   // the legs
      if (y > top + 14) return y === top + 15 ? O : x === x0 + 1 || x === x1 - 1 ? HC.steelD : 0;
      if (y === top) return O;
      if (y < top + 8) return x < x0 + 12 ? (y < top + 5 && x > x0 + 3 && x < x0 + 10 ? HC.mags : HC.sheetW) : (y < top + 3 ? HC.blanket : shade(HC.blanket, 0.85));
      return y < top + 12 ? HC.sheetW : HC.steel;
    });
    for (let y = top - 10; y < top + 14; y++) { put(x0 - 1, y, HC.steelD); put(x0, y, HC.steel); } }   // the headboard
  // the monitor on its stand
  { const { x, y } = D.MONITOR; rect(x - 9, y - 7, x + 9, y + 7, (xx, yy) => xx === x - 9 || xx === x + 9 || yy === y - 7 || yy === y + 7 ? O : HC.steelD); for (let yy = y + 8; yy < GROUND; yy++) put(x, yy, HC.steelD); rect(x - 5, GROUND - 2, x + 5, GROUND - 1, () => HC.steelD); }
  // the nurse station: a counter with a white top and a lamp
  { const { x0, x1, top } = D.NURSE;
    rect(x0, top, x1, GROUND - 1, (x, y) => x === x0 || x === x1 || y === top ? O : y < top + 3 ? HC.white : (x - x0) % 15 === 0 ? HC.woodD : HC.wood);
    text((x, y, c) => put(x, y, c), 'NURSES', x0 + 8, top + 8, C('#e8dcb8'));
    for (let y = top - 14; y < top; y++) put(x1 - 12, y, HC.steelD); rect(x1 - 16, top - 18, x1 - 8, top - 14, (x, y) => y === top - 18 ? O : LAMP_GLASS); }

  // the closed wing: the walkway (grating, rail, hangers), the supply cabinet, the cubicle frames, the corridor's door frames
  { const { x0, x1, y } = D.WALKWAY;
    rect(x0, y, x1, y + 4, (x, yy) => yy === y || yy === y + 4 ? HC.steelD : (x % 3 === 0 ? O : HC.steel));
    for (let x = x0; x <= x1; x++) put(x, y - 10, HC.steelL); for (let x = x0; x <= x1; x += 12) for (let yy = y - 10; yy < y; yy++) put(x, yy, HC.steelD);
    for (const hx of [x0 + 10, x1 - 10]) for (let yy = 64; yy < y; yy++) put(hx, yy, HC.steelD); }
  { const { x0, x1, top } = D.CAB; rect(x0, top, x1, GROUND - 1, (x, y) => x === x0 || x === x1 || y === top ? O : y === top + 1 ? HC.white : (y - top) % 12 === 0 ? HC.steelD : C('#8a9890')); }
  for (const f of D.FISH) { rect(f.x0 - 3, D.FISH_Y[0] - 3, f.x1 + 3, D.FISH_Y[0] - 1, () => HC.steelD); for (const px of [f.x0 - 3, f.x1 + 1]) rect(px, D.FISH_Y[0], px + 2, GROUND - 1, () => HC.steelD); }
  for (let y = 186; y < GROUND; y++) { put(D.WARD5.x - 3, y, HC.steelD); put(D.WARD5.x + 3, y, HC.steelD); }   // Ward 5's glass wall frame
  for (let x = D.WARD5.x - 3; x <= D.WARD5.x + 3; x++) { put(x, 186, O); put(x, 187, HC.steelD); }
  for (const bx of D.WARD5.row) rect(bx - 10, GROUND - 16, bx + 10, GROUND - 1, (x, y) => y === GROUND - 16 ? O : y < GROUND - 11 ? HC.sheetW : y > GROUND - 4 ? (x === bx - 9 || x === bx + 9 ? HC.steelD : 0) : HC.steel);

  // the morgue: the drawer wall (3 x 6), the autopsy tables, the axe case, the cold room door, the generator
  { const Dw = D.DRAWERS, cw = (Dw.x1 - Dw.x0) / Dw.cols, ch = (Dw.y1 - Dw.y0) / Dw.rows;
    rect(Dw.x0, Dw.y0, Dw.x1, Dw.y1, (x, y) => { const cx = (x - Dw.x0) % cw, cy = (y - Dw.y0) % ch; return x === Dw.x0 || x === Dw.x1 || y === Dw.y0 || y === Dw.y1 || cx < 1 || cy < 1 ? O : cy > ch / 2 - 1 && cy < ch / 2 + 1 && cx > cw / 2 - 4 && cx < cw / 2 + 4 ? HC.steelL : (cx + cy) % 11 === 0 ? HC.steelD : HC.steel; });
    rect(Dw.x0, Dw.y1 + 1, Dw.x1, GROUND - 1, (x, y) => x === Dw.x0 || x === Dw.x1 ? O : HC.steelD); }
  for (const t of D.TABLES) {
    rect(t.x0, D.TABLE_TOP, t.x1, D.TABLE_TOP + 3, (x, y) => y === D.TABLE_TOP ? HC.steelL : y === D.TABLE_TOP + 3 ? O : HC.steel);
    const cx = (t.x0 + t.x1) >> 1; rect(cx - 2, D.TABLE_TOP + 4, cx + 2, GROUND - 2, (x) => x === cx - 2 || x === cx + 2 ? O : HC.steelD); rect(cx - 7, GROUND - 2, cx + 7, GROUND - 1, () => HC.steelD);
  }
  { const { x, w, h } = D.AXE_CASE; rect(x - w / 2 - 2, GROUND - h - 10, x + w / 2 + 2, GROUND - 6, (xx, y) => xx === x - w / 2 - 2 || xx === x + w / 2 + 2 || y === GROUND - h - 10 || y === GROUND - 6 ? O : y < GROUND - h - 6 || y > GROUND - 10 || xx < x - w / 2 || xx > x + w / 2 ? HC.red : C('#2a0e0c')); text((xx, yy, c) => put(xx, yy, c), 'FIRE', x - 7, GROUND - h - 18, HC.red); }
  rect(D.COLD_DOOR - 10, GROUND - 60, D.COLD_DOOR + 10, GROUND - 1, (x, y) => x === D.COLD_DOOR - 10 || x === D.COLD_DOOR + 10 || y === GROUND - 60 ? O : (x * 5 + y * 3) % 13 === 0 ? C('#d8e8f0') : C('#7a909c'));
  { const { x0, x1 } = D.GENERATOR, top = GROUND - 54;
    rect(x0, top, x1, GROUND - 1, (x, y) => x === x0 || x === x1 || y === top ? O : y < top + 6 ? C('#c8a020') : (y - top) % 8 === 0 ? C('#6a5a20') : (x - x0) % 14 < 2 ? C('#4a4a40') : C('#8a7a30'));
    rect(x0 + 8, top + 12, x0 + 24, top + 24, (x, y) => x === x0 + 8 || x === x1 || y === top + 12 || y === top + 24 ? O : C('#2a2a2a'));
    for (let y = top - 30; y < top; y++) { put(x1 - 8, y, HC.steelD); put(x1 - 7, y, HC.steel); }   // the exhaust stack
    text((x, y, c) => put(x, y, c), 'DIESEL', x0 + 28, top + 14, HC.out); }
  rect(D.LEVER - 4, GROUND - 40, D.LEVER + 4, GROUND - 1, (x, y) => x === D.LEVER - 4 || x === D.LEVER + 4 || y === GROUND - 40 ? O : HC.steelD);   // the lever's box

  // the ER: the triage desk, the curtain bays' frames, the sliding doors' frame
  { const { x0, x1, top } = D.TRIAGE;
    rect(x0, top, x1, GROUND - 1, (x, y) => x === x0 || x === x1 || y === top ? O : y < top + 3 ? HC.white : (x - x0) % 20 === 0 ? HC.paleD : C('#d8dcd4'));
    text((x, y, c) => put(x, y, c), 'TRIAGE', x0 + 8, top + 8, HC.red); }
  for (const cb of D.CURTAINS) for (const px of [cb.x0, cb.x1]) for (let y = 192; y < GROUND; y++) put(px, y, HC.steelD);
  for (let y = 206; y < GROUND; y++) { put(D.SLIDE - 4, y, HC.steelD); put(D.SLIDE + 4, y, HC.steelD); }
  for (let x = D.SLIDE - 4; x <= D.SLIDE + 4; x++) { put(x, 205, O); put(x, 206, HC.steelD); }

  // the bay: the canopy on its posts, the neon cross, the ambulance
  { const { x0, x1, y } = D.CANOPY;
    rect(x0, y - 6, x1, y, (x, yy) => yy === y - 6 || yy === y ? O : yy === y - 1 ? HC.concD : HC.concL);
    for (const px of [x0 + 6, x1 - 6]) rect(px - 2, y + 1, px + 2, GROUND - 1, (x) => x === px - 2 || x === px + 2 ? O : HC.conc); }
  { const { x, y } = D.CROSS;
    for (let yy = -16; yy <= 16; yy++) for (let xx = -16; xx <= 16; xx++) { const arm = (Math.abs(xx) <= 5 && Math.abs(yy) <= 16) || (Math.abs(yy) <= 5 && Math.abs(xx) <= 16); if (arm) put(x + xx, y + yy, Math.abs(xx) === 5 || Math.abs(yy) === 5 || Math.abs(xx) === 16 || Math.abs(yy) === 16 ? HC.redD : HC.exit); }
    text((xx, yy, c) => put(xx, yy, c), 'ST CECILIA', x - 19, y + 20, HC.exit); }
  { const { x0, x1, top } = D.AMB;
    rect(x0, top, x1, GROUND - 6, (x, y) => x === x0 || x === x1 || y === top ? O : y === top + 1 ? HC.amb : y > top + 18 && y < top + 22 ? HC.ambR : x > x1 - 22 && y > top + 4 && y < top + 16 ? (x > x1 - 20 && x < x1 - 3 ? HC.glassD : HC.ambD) : (x - x0) % 30 === 0 ? HC.ambD : HC.amb);
    for (const wx of [x0 + 12, x1 - 14]) for (let yy = GROUND - 9; yy < GROUND; yy++) for (let xx = wx - 5; xx <= wx + 5; xx++) if (Math.hypot(xx - wx, yy - (GROUND - 5)) <= 5) put(xx, yy, Math.hypot(xx - wx, yy - (GROUND - 5)) < 2 ? HC.steelL : O);
    rect(x0 + 24, top + 6, x0 + 30, top + 14, (x, y) => (x === x0 + 27 || y === top + 10) ? HC.ambR : HC.amb); }

  // the theatre: the scrub cabinet, the gallery (slab, rail, window posts), the operating table, the round lamp, the breaker box
  { const { x0, x1, top } = D.SCRUB_CAB; rect(x0, top, x1, GROUND - 1, (x, y) => x === x0 || x === x1 || y === top ? O : (y - top) % 13 === 0 ? HC.steelD : HC.steel); }
  { const { x0, x1, y } = D.GALLERY;
    rect(x0, y, x1, y + 6, (x, yy) => yy === y ? HC.concL : yy === y + 6 ? O : HC.conc);
    for (let x = x0; x <= x1; x++) put(x, y - 12, HC.steelL); for (let x = x0; x <= x1; x += 14) for (let yy = y - 12; yy < y; yy++) put(x, yy, HC.steelD);
    for (let yy = D.GALLERY_PANE.y0 - 4; yy < y; yy++) { put(D.GALLERY_PANE.x - 3, yy, HC.steelD); put(D.GALLERY_PANE.x + 3, yy, HC.steelD); }
    for (let x = D.GALLERY_PANE.x - 3; x <= D.GALLERY_PANE.x + 3; x++) put(x, D.GALLERY_PANE.y0 - 4, O);
    for (let x = x0; x <= x1; x += 2) for (let yy = y + 7; yy < y + 9; yy++) put(x, yy, HC.concD); }
  { const { x0, x1, top } = D.OR_TABLE, cx = (x0 + x1) >> 1;
    rect(x0, top, x1, top + 4, (x, y) => y === top ? HC.sheetW : y === top + 4 ? O : HC.steel);
    rect(cx - 3, top + 5, cx + 3, GROUND - 3, (x) => x === cx - 3 || x === cx + 3 ? O : HC.steelD); rect(cx - 10, GROUND - 3, cx + 10, GROUND - 1, () => HC.steelD); }
  { const { x, y } = D.OR_LAMP; for (let yy = 60; yy < y - 6; yy++) put(x, yy, HC.steelD);
    for (let yy = -6; yy <= 2; yy++) for (let xx = -14; xx <= 14; xx++) if ((xx / 14) ** 2 + ((yy + 2) / 8) ** 2 <= 1) put(x + xx, y + yy, yy === 2 || Math.abs(xx) > 12 ? O : yy > -1 ? LAMP_GLASS : HC.steelL); }
  { const { x, y } = D.BREAKER; rect(x - 6, y - 10, x + 4, y + 10, (xx, yy) => xx === x - 6 || xx === x + 4 || yy === y - 10 || yy === y + 10 ? O : HC.steelD); for (let k = 0; k < 7; k++) put(x - 4 + k, y - 12, HC.yel); }

  // the roof: the stair hut, the parapets, the mast and its dais
  { const { x0, x1, top } = D.HUT;
    rect(x0, top, x1, GROUND - 1, (x, y) => x === x0 || x === x1 || y === top ? O : y < top + 3 ? HC.concL : (x + y) % 13 === 0 ? HC.concD : HC.conc);
    rect(x1 - 26, GROUND - 46, x1 - 8, GROUND - 1, (x, y) => x === x1 - 26 || x === x1 - 8 || y === GROUND - 46 ? O : HC.steelD);
    rect(x1 - 22, GROUND - 56, x1 - 12, GROUND - 50, (x, y) => x === x1 - 22 || x === x1 - 12 || y === GROUND - 56 || y === GROUND - 50 ? O : HC.redD); }
  rect(2788, GROUND - 18, 2799, GROUND - 1, (x, y) => y === GROUND - 18 || x === 2788 ? O : (x + y) % 9 === 0 ? HC.concD : HC.conc);
  { const { x, dais } = D.MAST;
    rect(dais.x0, dais.top, dais.x1, GROUND - 1, (xx, y) => y === dais.top || xx === dais.x0 || xx === dais.x1 ? O : HC.concL);
    for (let y = 150; y < dais.top; y++) { put(x - 1, y, O); put(x, y, (y >> 2) % 2 ? HC.ambR : HC.white); put(x + 1, y, O); }
    for (const [ax, ay] of [[-1, 0], [1, 0]]) for (let k = 0; k < 14; k++) put(x + ax * k, 170 + Math.round(k * 0.4) + ay, HC.steelD); }

  // ---- the floor band ----
  const out = { winl: [] };
  for (let x = 0; x < W; x++) {
    const wa = D.WATER.find(w => x >= w.x0 && x <= w.x1);
    for (let y = GROUND; y < H; y++) {
      const d = y - GROUND; let c;
      if (x < 1004) c = d === 0 ? HC.linoL : ((x >> 3) + (d >> 2)) % 2 ? HC.lino : HC.linoD;   // lino in a check
      else if (x < 1488) c = d === 0 ? HC.steelL : (x % 8 === 0 || d % 5 === 0) ? HC.bgrout : HC.mtile;   // wet tiles
      else if (x < 1822) c = d === 0 ? HC.linoL : ((x >> 4) + (d >> 2)) % 2 ? HC.lino : HC.linoD;
      else if (x < 2040) { c = d === 0 ? HC.concL : d < 3 ? HC.conc : noise2(x, d) < 0.5 ? HC.asph : HC.asphL; if (d > 2 && d < STREET && noise2(x >> 3, d) < 0.3) { c = mix(c, C('#1a2030'), 0.6); pud[d * W + x] = 1; } }   // the bay's wet asphalt
      else if (x < 2066) c = d === 0 ? HC.concL : HC.concD;
      else if (x < 2420) c = d === 0 ? HC.wtile : (x % 7 === 0 || d % 4 === 0) ? HC.wgrout : HC.wtileD;
      else {   // the roof: concrete, the helipad's ring and H, puddles
        c = d === 0 ? HC.concL : noise2(x, d) < 0.5 ? HC.conc : HC.concD;
        if (x >= D.PAD.x0 && x <= D.PAD.x1) { const k = (x - D.PAD.x0) / (D.PAD.x1 - D.PAD.x0); if (d > 1 && d < STREET && (Math.abs(k - 0.08) < 0.012 || Math.abs(k - 0.92) < 0.012)) c = HC.yel; if (d > 3 && d < 12 && ((Math.abs(k - 0.42) < 0.02 || Math.abs(k - 0.58) < 0.02) || (d === 7 && k > 0.42 && k < 0.58))) c = HC.white; }
      }
      if (wa && d > 0 && d < STREET) { c = (d % 4 === 1 && (x + d * 5) % 9 < 3) ? C('#4a5a6e') : mix(c, C('#16202c'), 0.7); pud[d * W + x] = 1; }
      b[y * W + x] = c;
    }
  }
  for (let i = 0; i < b.length; i++) if (b[i] !== pre[i] && i < GROUND * W) props[i] = 1;
  return { b, props, bg: pre, pud, ...out };
}

// ---- per frame, on the wall behind everyone (both views: in 3D on the wall layer) ----
export function drawWorld(R, S) {
  const { plot, line1 } = R, t = R.t, O = HC.out;
  // the heart monitor: a green trace (red and fast in a defend, a flat line at the end)
  { const { x, y } = D.MONITOR, inj = S.injK || 0, mk = Math.max(inj, S.monK || 0), dead = S.flat > 0, col = dead || inj > 0 ? C('#ff4040') : mk > 0 ? (Math.floor(t * 4) % 2 ? C('#ffb040') : HC.mon) : HC.mon, sp = 30 + mk * 60;
    for (let xx = -7; xx <= 7; xx++) { const ph = ((xx + 7) / 14 + t * sp / 40) % 1, beat = !dead && ph > 0.45 && ph < 0.55 ? Math.round(Math.sin((ph - 0.45) * 62) * 4) : 0; plot(x + xx, y + 2 - beat, col); }
    for (let xx = -8; xx <= 8; xx++) for (let yy = -6; yy <= 6; yy++) if ((xx + yy + Math.floor(t * 2)) % 9 === 0) plot(x + xx, y + yy, C('#0e2a18')); }
  // the vent: it rattles before a drop (its grille hangs open after)
  { const v = D.VENT, k = S.ventT > 0 ? Math.round(Math.sin(t * 60)) : 0;
    for (let x = v.x - 10; x <= v.x + 10; x += 2) plot(x, v.y + 1 + k, S.ventOpen ? O : HC.steelL);
    if (S.ventOpen) line1(v.x - 12, v.y + 3, v.x - 16, v.y + 18, HC.steel); }
  // the torch on the counter
  if (!S.torch) { const x = D.TORCH_X, y = D.NURSE.top - 2; for (let k = -3; k <= 3; k++) plot(x + k, y, k > 1 ? C('#ffe8a0') : C('#2a2a30')); plot(x + 3, y - 1, C('#ffe8a0')); }
  // the level's own small pickups: adrenaline (a yellow pen), bandages and ammo boxes the level places
  for (const it of S.items) {
    if (it.taken || it.id === 'torch') continue;
    const x = Math.round(it.x), y = Math.round(it.y) - 2;
    if (it.id === 'adren') { for (let k = -3; k <= 3; k++) { plot(x + k, y, k === 3 ? C('#ff4040') : C('#e8c020')); plot(x + k, y - 1, k === 3 ? O : C('#c8a018')); } }
  }
  // the payphone rings: the receiver shakes on its hook
  { const x = D.PAYPHONE, ring = S.phone === 'ring' && Math.floor(t * 10) % 4 < 2, k = ring ? (Math.floor(t * 30) % 2 ? 1 : -1) : 0;
    for (let y = GROUND - 66; y < GROUND - 52; y++) { plot(x - 5 + k, y, O); plot(x - 4 + k, y, C('#202024')); } }
  // the quarantine sheets behind which the closed wing waits (the sheets themselves hang in front: drawFx)
  // the drawers: one slides out before a goon sits up
  for (const dr of S.drawers) {
    if (!(dr.t > 0)) continue;
    const k = Math.min(1, dr.t / 0.8), y0 = D.DRAWERS.y1 - 20, len = Math.round(26 * k);
    for (let y = y0; y < y0 + 10; y++) for (let x = dr.x - 10; x <= dr.x + 10; x++) plot(x + (len > 0 ? 0 : 0), y + Math.round(len / 6), y === y0 || x === dr.x - 10 || x === dr.x + 10 ? O : HC.steelL);
    for (let x = dr.x - 9; x <= dr.x + 9; x++) plot(x, y0 + 4 + Math.round(len / 6), C('#c8c8c0'));   // the body bag
  }
  // the generator lever, the beacons and the sodium lamps the generator brings back
  { const x = D.LEVER, y = GROUND - 30, k = S.lever || 0, ang = -0.9 + 1.8 * k, hx = x + Math.sin(ang) * 10, hy = y - Math.cos(ang) * 10;
    line1(x, y, hx, hy, HC.steelL); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) plot(Math.round(hx) + a, Math.round(hy) + b, S.leverArmed && Math.floor(t * 4) % 2 ? C('#ff6040') : C('#c02020')); }
  if (S.gen >= 1) for (const bx of [1300, 1380, 1460]) { const on = S.gen >= 2 || Math.floor(t * 6 + bx) % 2; for (let k = -2; k <= 2; k++) plot(bx + k, 104, on ? C('#ffa030') : C('#3a2a14')); }
  // the TV's glow on the ER wall (storm news)
  if (!S.erDark) for (let y = 112; y < 135; y++) for (let x = 1612; x < 1649; x++) plot(x, y, (x + y + Math.floor(t * 8)) % 7 === 0 ? C('#d0e0f0') : y < 118 ? C('#c03030') : C('#5a7a9a'));
  // the security office's machine gun rack is a pickup; the ambulance's rear doors swing open for the bay wave; its light bar turns
  { const a = D.AMB, open = S.ambOpen || 0; if (open > 0) for (let y = a.top + 4; y < GROUND - 8; y++) for (let k = 0; k < Math.round(12 * open); k++) plot(a.x0 - k, y, k === Math.round(12 * open) - 1 || y === a.top + 4 ? O : HC.ambD);
    const ph = Math.floor(t * 6) % 2; for (let k = 0; k < 6; k++) { plot(a.x0 + 30 + k, a.top - 2, ph ? C('#ff3030') : C('#3060ff')); plot(a.x0 + 40 + k, a.top - 2, ph ? C('#3060ff') : C('#ff3030')); } }
  // the neon cross flickers in the storm (its glow is in the light list)
  // the trauma lift: its doors open once the bay is clear
  if (S.liftOpen) for (let y = GROUND - 61; y < GROUND; y++) for (let x = D.LIFT - 10; x <= D.LIFT + 10; x++) plot(x, y, Math.abs(x - D.LIFT) > 7 ? HC.steelD : C('#e8e4c0'));
  // the Bell & Sons clock: stopped at 3:17 (it ticks once as he steps out of the lift)
  { const { x, y } = D.CLOCK, tick = S.clockT > 0 ? 0.03 : 0;
    const hand = (a, len, c) => line1(x, y, x + Math.sin(a) * len, y - Math.cos(a) * len, c);
    hand((3 + 17 / 60) / 12 * Math.PI * 2, 4, O); hand((17 / 60 + tick) * Math.PI * 2, 7, O); plot(x, y, C('#b02a2a')); }
  // the breaker box: its handle up (lights on) or down (Krieg pulled it); a red lamp when the hero can throw it back
  { const { x, y } = D.BREAKER, up = !S.breakerDown, ready = S.breakerDown && S.breakerCd <= 0;
    for (let k = 0; k < 6; k++) plot(x - 1, y + (up ? -k : k), HC.steelL); plot(x - 2, y + (up ? -6 : 6), C('#c02020'));
    if (ready && Math.floor(t * 4) % 2) plot(x + 2, y - 7, C('#ff4040')); }
  // the door lamps over each stair door and lift: green where it goes somewhere now (blinking on the way on), red where it is shut
  for (const L of S.lamps || []) {
    const lift = L.x === D.SHAFT || L.x === D.LIFT, y = lift ? GROUND - 66 : GROUND - 75, on = !L.way || Math.floor(t * 3) % 2;
    const c = L.ok ? (on ? C('#60ff88') : C('#2a9a44')) : C('#ff3030'), w = L.way ? 3 : 1;
    for (let a = -w; a <= w; a++) for (let b = 0; b < (L.way ? 3 : 2); b++) plot(L.x + a, y - (L.way ? 1 : 0) + b, c);
  }
  // the dead lift: hazard tape across its doors while it is shut; pried open (a dark gap) once he has gone down
  if (!S.d2done) for (let k = -9; k <= 9; k++) { for (const yy of [GROUND - 52 + Math.round(k * 2.4), GROUND - 52 - Math.round(k * 2.4)]) { if (yy > GROUND - 59 && yy < GROUND - 2) { plot(D.SHAFT + k, yy, (k >> 1) % 2 ? HC.yel : O); plot(D.SHAFT + k, yy + 1, (k >> 1) % 2 ? HC.yel : O); } } }
  else if (S.shaftUsed) for (let y = GROUND - 59; y < GROUND; y++) for (let x = D.SHAFT - 4; x <= D.SHAFT + 4; x++) plot(x, y, C('#050506'));
  // the stair doors: open a beat as someone uses one
  for (const dd of S.doorFx) { if (dd.t > 0.5) continue; for (let y = GROUND - 57; y < GROUND; y++) for (let x = dd.x - 10; x <= dd.x + 10; x++) plot(x, y, Math.abs(x - dd.x) > 7 ? HC.steelD : C('#0a0a0c')); }
  // the windsock: it swings to show the wind a second before a gust
  if (S.roof) { const { x, y } = D.WINDSOCK, dir = S.wind ? S.wind.dir : 1, k = S.wind ? Math.min(1, S.wind.show) : 0.2;
    for (let i = 0; i < 12; i++) { const sx = x - dir * i * (0.4 + 0.6 * k), sy = y + i * (1 - k) * 0.8 + Math.sin(t * 9 + i) * k; plot(Math.round(sx), Math.round(sy), (i >> 2) % 2 ? HC.white : C('#ff6020')); plot(Math.round(sx), Math.round(sy) + 1, (i >> 2) % 2 ? HC.white : C('#ff6020')); }
    for (let yy = y; yy < GROUND - 18; yy++) plot(x + 1, yy, HC.steelD); }
}

// ---- the movers (shared by the 2D draw and the 3D model): a rolling hospital bed, the gurney ----
export function drawBed(R, b) {
  const { plot } = R, O = HC.out, x0 = Math.round(b.x - b.w / 2), x1 = x0 + b.w, top = Math.round(b.top);
  if (b.tipped) {   // knocked onto its side: a low frame
    for (let y = GROUND - 12; y < GROUND; y++) for (let x = x0; x <= x1; x++) plot(x, y, y === GROUND - 12 || x === x0 || x === x1 ? O : (x - x0) % 8 === 0 ? HC.steelD : HC.steel);
    return;
  }
  for (let y = top; y < GROUND; y++) for (let x = x0; x <= x1; x++) {
    let c = 0;
    if (y === top) c = O;
    else if (y < top + 6) c = HC.sheetW;
    else if (y < top + 9) c = HC.steel;
    else if (y === top + 9) c = O;
    else if (y >= GROUND - 5) { const wx = x < x0 + 8 ? x0 + 4 : x > x1 - 8 ? x1 - 4 : null; if (wx != null && Math.hypot(x - wx, y - (GROUND - 3)) <= 2.5) c = O; }
    else if (x === x0 + 3 || x === x1 - 3) c = HC.steelD;
    if (c) plot(x, y, c);
  }
  if (b.flash > 0) for (let x = x0; x <= x1; x++) plot(x, top + 1, C('#ffffff'));
}
export function drawGurney(R, g) {
  const { plot } = R, O = HC.out, x0 = Math.round(g.x - D.GURNEY.w / 2), x1 = x0 + D.GURNEY.w, top = D.GURNEY.top;
  for (let y = top; y < GROUND; y++) for (let x = x0; x <= x1; x++) {
    let c = 0;
    if (y === top) c = O; else if (y < top + 4) c = HC.sheetW; else if (y < top + 6) c = HC.steelL; else if (y === top + 6) c = O;
    else if (y >= GROUND - 4) { const wx = x < x0 + 6 ? x0 + 3 : x > x1 - 6 ? x1 - 3 : null; if (wx != null && Math.hypot(x - wx, y - (GROUND - 2)) <= 2) c = O; }
    else if (x === x0 + 2 || x === x1 - 2 || (x - x0) === (y - top) + 4) c = HC.steelD;
    if (c) plot(x, y, c);
  }
}

// ---- over the lit scene, unlit (both views: in 3D on the fx layer) ----
const GLASS = [C('#a8c8e0'), C('#d8ecf8')];
export function paneCracks(R, p) { if (p.cracks) for (const ck of p.cracks) { let x = ck.x, y = ck.y; for (let k = 0; k < 8; k++) { const nx = x + ck.dx * 2 + (k % 2 ? 1 : -1), ny = y + ck.dy * 2; R.line1(x, y, nx, ny, GLASS[1]); x = nx; y = ny; } } }
export function drawFx(R, S) {
  const { plot, blendPlot, line1 } = R, t = R.t, cam = R.cam, vis = (x0, x1) => x1 > cam.x - 8 && x0 < cam.x + cam.vw + 8;
  // glass: intact panes as a faint sheen with a highlight; cracks; the fishbowl's silhouettes show in a flash
  for (const p of S.panes) {
    if (p.broken || !vis(p.x0, p.x1)) continue;
    const back = !!p.def.back, lit = S.lightNear(p.x0, p.x1) ? 1 : 0.35, fl = S.flash || 0, a = (back ? 0.07 : 0.1) * lit, h = 0.2 * lit;
    if (!R.glass3d) for (let y = p.y0; y <= p.y1; y++) for (let x = p.x0; x <= p.x1; x++) {   // (3D: the glass is a pane, three.js)
      const hl = ((x - p.x0) + (p.y1 - y)) % 23 === 0 || ((x - p.x0) + (p.y1 - y)) % 23 === 1;
      blendPlot(x, y, 170, 200, 220, (hl ? h : a) + fl * 0.3);
    }
    if (p.def.id.startsWith('fish') && p.who && p.who.length && (fl > 0.2 || S.lightNear(p.x0, p.x1))) {   // figures behind the glass: seen only in light
      p.who.forEach((v, i) => { const fx = p.x0 + 14 + i * 20; for (let y = GROUND - 30; y < GROUND - 4; y++) for (let x = fx - 3; x <= fx + 3; x++) if (y > GROUND - 26 || Math.abs(x - fx) < 2) blendPlot(x, y, 10, 12, 14, 0.85); });
    }
    if (!R.glass3d) paneCracks(R, p);
  }
  // the quarantine sheets: hanging plastic, swaying; a bulge before a goon pushes through; torn after
  for (const sh of S.sheets) {
    if (!vis(sh.x - 10, sh.x + 10)) continue;
    const bulge = sh.t > 0 ? Math.sin(Math.min(1, sh.t / 0.8) * Math.PI) * 4 : 0;
    for (let y = 66; y < GROUND; y++) for (let k = -9; k <= 9; k++) {
      if (sh.torn && y > 150 && Math.abs(k) < 4 + (y - 150) / 20) continue;
      const sw = Math.sin(t * 1.3 + y * 0.05 + sh.x) * 1.2 + (y > 200 ? bulge * Math.sin((y - 200) / 80 * Math.PI) : 0);
      blendPlot(Math.round(sh.x + k + sw), y, 190, 205, 200, (k + 9) % 6 === 0 ? 0.42 : 0.26);
    }
  }
  // the ER's curtains: they hide whoever is behind them, and swing when someone passes
  for (const cb of S.curtains) {
    if (!vis(cb.x0, cb.x1)) continue;
    for (let x = cb.x0 + 1; x < cb.x1; x++) for (let y = 193; y < GROUND - 2; y++) { const sw = Math.sin(t * 6 + x * 0.6) * cb.sway; plot(Math.round(x + sw * (y - 193) / 80), y, (x - cb.x0) % 5 === 0 ? C('#6a9a8a') : C('#86b4a2')); }
  }
  // eyes in the dark: two pale points; the strike glint before every blow (light or dark); penlights and headlamps
  for (const g of S.glints) { plot(g.x, g.y, C('#e8e0a0')); plot(g.x + g.f * 2, g.y, C('#e8e0a0')); }
  for (const g of S.strike) { const s = 2 + Math.round(2 * Math.sin(g.k * Math.PI)); for (let k = -s; k <= s; k++) { plot(g.x + k, g.y, C('#ffffff')); plot(g.x, g.y + k, C('#ffffff')); } }
  // arcs: the defib's paddles, a live puddle, the lightning bolt
  for (const a of S.arcs) {
    if (a.kind === 'zone') for (let k = 0; k < 6; k++) { const x = Math.round(a.x0 + ((t * 260 + k * 37 + a.x0) % Math.max(1, a.x1 - a.x0))); plot(x, GROUND + 1 + (k % 3), C('#e0f8ff')); plot(x + 1, GROUND - 1 - (k & 1) * (a.live ? 3 : 1), C('#60d0ff')); }
    else if (a.kind === 'paddle') for (let k = 0; k < 3; k++) { const x = a.x + Math.round(Math.sin(t * 50 + k) * 3), y = a.y + Math.round(Math.cos(t * 43 + k * 2) * 3); line1(a.x, a.y, x, y, k ? C('#a0e8ff') : C('#ffffff')); }
    else if (a.kind === 'needle') {   // a syringe held high over the bed, needle down, a glint on its tip
      for (let k = 0; k < 6; k++) plot(a.x, a.y - 1 + k, k < 1 ? C('#c8c8c8') : k < 4 ? C('#f0e060') : C('#e8f0f0'));
      plot(a.x - 1, a.y + 4, C('#e8f0f0')); plot(a.x + 1, a.y + 4, C('#e8f0f0')); for (let k = 6; k < 9; k++) plot(a.x, a.y + k, C('#d0d8e0'));
      if (Math.floor(t * 8) % 2) plot(a.x, a.y + 9, C('#ffffff'));
    }
    else if (a.kind === 'bolt') { let x = a.x, y = 0; while (y < GROUND) { const nx = x + Math.round((Math.sin(y * 0.7 + a.seed) * 5)), ny = y + 12; line1(x, y, nx, ny, C('#ffffff')); line1(x + 1, y, nx + 1, ny, C('#c0e0ff')); x = nx; y = ny; } }
  }
  // floor tells: the defib's ring, a bed's path, a lightning ring, the Code Blue glow over every puddle
  for (const f of S.tells) {
    if (f.kind === 'ring') { const n = 40; for (let i = 0; i < n; i++) { if ((i + Math.floor(t * 12)) % 3 === 0) continue; const a = i / n * Math.PI * 2, x = f.x + Math.cos(a) * f.r, y = GROUND + 4 + Math.sin(a) * 3; plot(Math.round(x), Math.round(y), f.c || C('#80e0ff')); } }
    else if (f.kind === 'path') { for (let x = Math.min(f.x0, f.x1); x <= Math.max(f.x0, f.x1); x += 4) if (Math.floor(t * 10) % 2) { plot(x, GROUND + 2, C('#ffd060')); plot(x + 1, GROUND + 2, C('#ffd060')); } }
    else if (f.kind === 'bed') {   // Mags's bed: a dim red ring while they come for it; it fills bright red as a needle goes in
      const n = 64, r = 36; for (let i = 0; i < n; i++) { const fill = i / n < f.k, a = i / n * Math.PI * 2 - Math.PI / 2; if (!fill && (i + Math.floor(t * 6)) % 3 === 0) continue; const x = Math.round(f.x + Math.cos(a) * r), y = Math.round(GROUND + 5 + Math.sin(a) * 4); plot(x, y, fill ? C('#ff2020') : C('#8a1a1a')); plot(x + 1, y, fill ? C('#ff6050') : C('#6a1414')); }
    }
    else if (f.kind === 'zone') { for (let x = f.x0; x <= f.x1; x++) if ((x + Math.floor(t * 20)) % 3 === 0) blendPlot(x, GROUND + 3 + (x % 5), 120, 220, 255, 0.7); }
  }
  // the way on: green chevrons on the floor before the door that goes somewhere now
  for (const L of S.lamps || []) if (L.way && L.ok && vis(L.x - 12, L.x + 12)) for (let k = 0; k < 3; k++) { if ((k + Math.floor(t * 4)) % 3 === 0) continue; const x = L.x - 10 + k * 8; for (let j = 0; j < 3; j++) { blendPlot(x + j, GROUND + 3 + j, 90, 255, 130, 0.8); blendPlot(x + j, GROUND + 9 - j, 90, 255, 130, 0.8); } }
  // Krieg's dart volley tell: a cyan glint on each needle; smoke from his canister
  for (const p of S.puffs) for (let i = 0; i < 6; i++) {
    const ph = (p.t * 0.8 + i / 6) % 1, x = p.x + Math.sin(i * 2.1 + p.t) * 10 * ph, y = p.y - ph * 30;
    if (R.soft) R.soft(x, y, 2 + ph * 5, 220, 220, 220, 0.4 * (1 - ph)); else blendPlot(Math.round(x), Math.round(y), 220, 220, 220, 0.5 * (1 - ph));   // (3D: a soft puff)
  }
  // sedation: the edges of the view darken and cool, stronger with each stack
  if (S.sedK > 0) {
    const k = S.sedK, x0 = cam.x, y0 = cam.y, w = cam.vw, h = cam.vh;
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
      const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2), r = dx * dx + dy * dy;
      if (r < 0.55) continue;
      const a = Math.min(0.6, (r - 0.55) * 0.9 * k);
      blendPlot(x0 + x, y0 + y, 20, 30, 60, a); blendPlot(x0 + x + 1, y0 + y, 20, 30, 60, a); blendPlot(x0 + x, y0 + y + 1, 20, 30, 60, a); blendPlot(x0 + x + 1, y0 + y + 1, 20, 30, 60, a);
    }
  }
}
