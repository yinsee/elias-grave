// Level 2, "Line Zero": the art. Every pixel is painted in code (like src/levels/pier9.js).
//   paint(api)              once: the static world layer (stat), the props mask, the level's lists (lamps, doors...), the puddle mask
//   drawWorld(R, S)         per frame, behind the fighters, on the wall: stash boards, lamps on or off, signal heads, levers, the blast door
//   drawFx(R, S)            per frame, over the lit scene (unlit): fire, sparks, eye glints in the dark, the waterfall's spray
//   carPx(type, dir)        a train car's pixels (shared by the 2D draw and the 3D model): { w, h, px }
//   drawTrain(R, T)         a train, clipped to its section
//   drawHandcar(R, h)       Switch's red handcar
// R: { plot, line1, blendPlot, cam, t } (world coordinates); S: the level's run state (src/levels/metro/run.js)
import { C } from '../../core/color.js';
import { rng } from '../../core/rng.js';
import * as D from './data.js';

const GROUND = D.GROUND, H = 320, STREET = 14;

// ---- a 3 x 5 pixel font for painted signs ----
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100',
  G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111', M: '101111111101101',
  N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001', 5: '111100110001110', 6: '011100111101111',
  7: '111001010010010', 8: '111101111101111', 9: '111101111001111', ' ': '000000000000000', '-': '000000111000000', '.': '000000000000010', ':': '000010000010000', "'": '010010000000000', 'É': '111100110100111',
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

// colours shared by the static layer and the dynamic painters
export const MC = {
  void: C('#0b0c10'), vault: C('#14151b'), vaultL: C('#1c1e26'),
  tile: C('#c4bca4'), tileD: C('#b0a890'), grout: C('#7e786a'), trim: C('#1a1a1e'),
  gtile: C('#5a6a60'), gtileD: C('#4e5e54'), ggrout: C('#36423c'),
  brick: C('#3a302a'), brickD: C('#30282a'), mortar: C('#1e1a18'),
  rock: C('#2c2830'), rockD: C('#221f26'), rockL: C('#38323c'),
  conc: C('#4a4c52'), concD: C('#3a3c42'), concL: C('#5c5e66'),
  steel: C('#5a5e66'), steelD: C('#3a3e46'), steelL: C('#8a8e98'),
  rail: C('#8a8e98'), railD: C('#3c3e44'), sleeper: C('#2e2620'), ballast: C('#3a3630'), ballast2: C('#332f2a'),
  water: C('#18242e'), waterL: C('#2a3e4a'), waterG: C('#4a6676'),
  oil1: C('#4a3a5a'), oil2: C('#3a5a4a'), oil3: C('#5a4a2a'),
  out: C('#1b1226'), red: C('#a83228'), redD: C('#7a2018'), cream: C('#e8dcb8'), blue: C('#24406a'),
  rust: C('#6a3424'), rustD: C('#4e2418'), rustL: C('#8a4a30'),
  yel: C('#d8b020'), yelD: C('#8a7014'),
};

// ---- the static layer ----
// api: { W, H, GROUND, PAL, LAMP_GLASS, WIN_A, WIN_B, WIN_C }
export function paint(api) {
  const { W, LAMP_GLASS, WIN_A, WIN_B } = api;
  const b = new Uint32Array(W * H), props = new Uint8Array(W * H), pud = new Uint8Array((STREET + 1) * W);
  const put = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < W && y < H) b[y * W + x] = c; };
  const rect = (x0, y0, x1, y1, f) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = f(x, y); if (c) put(x, y, c); } };
  const r = rng(202);
  const O = MC.out;
  const out = { lamps: [], winl: [], doors: [], cdoors: [] };

  // ---- the back wall, section by section ----
  const noise2 = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; };
  for (let x = 0; x < W; x++) for (let y = 0; y < GROUND; y++) {
    let c;
    if (x < 300) {   // the ticket hall: cream tiles under a black vault, a black trim band
      if (y < 60) c = (y + x) % 13 === 0 ? MC.vaultL : MC.vault;
      else if (y < 64) c = MC.trim;
      else { const ty = y - 64, row = Math.floor(ty / 5), tx = (x + (row % 2) * 4) % 8; c = ty % 5 === 4 || tx === 0 ? MC.grout : (row * 7 + Math.floor((x + (row % 2) * 4) / 8)) % 5 === 0 ? MC.tileD : MC.tile; if (y >= 146 && y < 150) c = MC.trim; if (y > GROUND - 22) c = ty % 5 === 4 || tx === 0 ? MC.grout : shade(MC.tile, 0.72); }
    } else if (x < 1000) {   // the platform: green-grey tiles, a black vault with tile ribs, a black band
      if (y < 92) { c = MC.vault; if ((x - 300) % 64 < 3 && y > 40) c = MC.vaultL; }
      else if (y < 96) c = MC.trim;
      else { const ty = y - 96, row = Math.floor(ty / 5), tx = (x + (row % 2) * 4) % 8; c = ty % 5 === 4 || tx === 0 ? MC.ggrout : (row * 3 + Math.floor((x + (row % 2) * 4) / 8)) % 7 === 0 ? MC.gtileD : MC.gtile; if (y >= 118 && y < 121) c = MC.trim; if (y > GROUND - 20) c = ty % 5 === 4 || tx === 0 ? MC.ggrout : shade(MC.gtile, 0.7); }
      if (y > 140 && noise2(x >> 1, y >> 1) < 0.04) c = shade(c, 0.8);   // grime
    } else if (x < 1640) {   // the service tunnel: a brick vault
      const ty = y, row = Math.floor(ty / 4), bx = (x + (row % 2) * 5) % 10;
      c = ty % 4 === 3 || bx === 0 ? MC.mortar : (noise2(Math.floor((x + (row % 2) * 5) / 10), row) < 0.3 ? MC.brickD : MC.brick);
      if (y < 70) c = shade(c, 0.55 + 0.45 * y / 70);
    } else if (x < 2436) {   // the train graveyard: a cavern
      const n = noise2(x >> 2, y >> 2) * 0.6 + noise2(x >> 3, y >> 3) * 0.4;
      c = n < 0.3 ? MC.rockD : n > 0.78 ? MC.rockL : MC.rock;
      if (y < 90) c = shade(c, 0.5 + 0.5 * y / 90);
    } else {   // the junction: a tall cavern over a concrete retaining wall
      if (y < 176) { const n = noise2(x >> 2, y >> 2) * 0.6 + noise2(x >> 3, y >> 3) * 0.4; c = n < 0.3 ? MC.rockD : n > 0.8 ? MC.rockL : MC.rock; if (y < 80) c = shade(c, 0.5 + 0.5 * y / 80); }
      else { const px = (x - 2436) % 40, py = (y - 176) % 26; c = px === 0 || py === 0 ? MC.concD : (noise2(x >> 1, y >> 1) < 0.05 ? MC.concD : MC.conc); if (y < 179) c = MC.concL; }
    }
    b[y * W + x] = c;
  }
  // street grates and vent shafts: a lit column of rain light on the wall under each
  for (const gx of [...D.GRATES, D.WATERFALL.x, ...D.VENTS]) {
    for (let y = 30; y < GROUND; y++) for (let x = gx - 9; x <= gx + 9; x++) { const k = 1 - Math.abs(x - gx) / 10; b[y * W + x] = mix(b[y * W + x], C('#8aa0b8'), 0.22 * k * (0.6 + 0.4 * (1 - y / GROUND))); }
    rect(gx - 8, 30, gx + 8, 34, (x, y) => y === 30 || y === 34 || x % 3 === 0 ? MC.steelD : C('#9ab0c8'));   // the grate's bars against the street light
  }
  // the tunnel mouth: an arch of black brick from the platform into the tunnel, and the far end into the yard
  for (const ax of [1000, 1640]) for (let y = 60; y < GROUND; y++) for (let x = ax - 10; x <= ax + 10; x++) { if (y < 90 && Math.hypot(x - ax, y - 90) > 10) continue; put(x, y, Math.abs(x - ax) > 7 ? MC.trim : C('#22201e')); }

  // ---- the ticket hall: the mezzanine and its turnstiles, the stair flight, a poster ----
  const pre0 = null;
  // the poster on its plywood board (Nero's first bark): a torn 1950s ad, "LIGNE 0 - LA VILLE SOUS LA VILLE"; the hole behind is dark
  { const s = D.STASHES[0], x0 = s.x - s.w / 2, y0 = GROUND - s.h - 6;
    rect(x0, y0, x0 + s.w, y0 + s.h, (x, y) => x === x0 || x === x0 + s.w || y === y0 || y === y0 + s.h ? MC.trim : C('#0c0c0e')); }
  rect(232, 168, 262, 206, (x, y) => x === 232 || x === 262 || y === 168 || y === 206 ? MC.trim : y < 180 ? C('#c8a050') : C('#4a6a8a'));   // a second poster: a smiling family on a metro car
  text(put, 'LIGNE 0', 235, 171, MC.redD); for (let x = 238; x < 258; x++) put(x, 196, C('#2a2a30'));
  text(put, 'SORTIE', 20, 120, MC.cream);   // the exit sign over the mezzanine
  rect(16, 116, 44, 128, (x, y) => x === 16 || x === 44 || y === 116 || y === 128 ? MC.trim : 0);
  // ---- the platform: name plates, adverts, the crowned rat ----
  for (const nx of [440, 800]) { rect(nx, 150, nx + 62, 162, (x, y) => x === nx || x === nx + 62 || y === 150 || y === 162 ? MC.cream : MC.blue); text(put, 'ST-AMBROSE', nx + 3, 154, MC.cream); }
  for (const ax of [600, 920]) { rect(ax, 128, ax + 40, 148, (x, y) => x === ax || x === ax + 40 || y === 128 || y === 148 ? MC.trim : (x + y) % 7 === 0 ? C('#6a4a3a') : C('#8a6a4a')); }   // faded advert frames
  { const gx = 690, gy = 196, rd = MC.red;   // the crowned rat, sprayed red
    for (let x = -10; x <= 10; x++) for (let y = -4; y <= 4; y++) if ((x / 10) ** 2 + (y / 4) ** 2 < 1 && (x * 7 + y * 3) % 5) put(gx + x, gy + y, rd);
    for (let k = 0; k < 8; k++) put(gx + 10 + k, gy + 2 + (k >> 2), rd);   // the tail
    for (const [dx, dy] of [[-6, -6], [-3, -9], [0, -6], [3, -9], [6, -6]]) { put(gx + dx, gy + dy, rd); put(gx + dx, gy + dy + 1, rd); }   // the crown
    for (let x = -7; x <= 7; x++) put(gx + x, gy - 5, rd); put(gx - 8, gy - 1, C('#e0d0c0')); }
  text(put, 'RATS', 652, 214, MC.red, 2);
  // ---- the tunnel: cable runs, DANGER plates, the dead-blue emergency lamps ----
  for (const cy of [196, 200, 204]) for (let x = 1012; x < 1630; x++) { const sag = Math.round(2 * Math.sin(((x - 1012) % 80) / 80 * Math.PI)); put(x, cy + sag, C('#151414')); }
  for (const dx of [1150, 1452]) { rect(dx, 214, dx + 46, 226, (x, y) => x === dx || x === dx + 46 || y === 214 || y === 226 ? MC.trim : MC.redD); text(put, 'DANGER', dx + 3, 216, MC.cream); text(put, '750 V', dx + 26, 216, MC.yel); }
  // ---- the yard: far dead cars in the dark, the gantry crane, the vent's pool ----
  for (const [fx0, fx1] of [[1650, 1760], [1790, 1880], [2080, 2200]]) rect(fx0, 214, fx1, 250, (x, y) => y === 214 ? C('#26222a') : (x - fx0) % 14 < 9 && y > 220 && y < 232 ? C('#1a181e') : C('#242028'));
  { const cx = D.CRANE_X, yel = C('#8a6a1e'), yelD = C('#5a4614');   // a dead gantry crane: a lattice tower, the jib, a hook on its chain
    for (let y = 40; y < GROUND; y++) { put(cx - 7, y, O); put(cx - 6, y, yel); put(cx + 6, y, yel); put(cx + 7, y, O); const k = (y - 40) % 14; put(cx - 6 + k, y, yelD); put(cx + 6 - k, y, yelD); }
    for (let x = cx - 80; x <= cx + 60; x++) { put(x, 40, O); put(x, 41, yel); put(x, 47, yel); put(x, 48, O); const k = (x - cx + 80) % 12; put(x, 41 + (k < 6 ? k : 12 - k), yelD); }
    for (let y = 49; y < 148; y++) put(cx - 40, y, C('#2a2a30'));
    rect(cx - 44, 148, cx - 36, 156, (x, y) => (x === cx - 44 || y === 156) ? O : x > cx - 39 && y < 152 ? 0 : C('#5a5e66')); }
  // ---- the junction: the portals, the signal box's cabin, the Bell & Sons clock ----
  for (const px of D.PORTALS) for (let y = 186; y < GROUND; y++) for (let x = px - 10; x <= px + 10; x++) { if (x < 2436 || x > W - 1) continue; const top = 196 - Math.round(Math.sqrt(Math.max(0, 100 - (x - px) ** 2))); if (y < top) continue; put(x, y, y === top || Math.abs(x - px) === 10 ? MC.trim : C('#060608')); }
  text(put, 'VOIE 1', 2600, 186, MC.yel); text(put, 'VOIE 2', 2700, 186, C('#58c0d8'));

  const pre = b.slice();   // everything after this is a solid prop (blood sticks to it; the 3D view makes blocks of it)

  // ---- props ----
  // the mezzanine: a concrete slab on a black girder, turnstiles on it
  rect(D.MEZZ.x0, D.MEZZ.y, D.MEZZ.x1, D.MEZZ.y + 8, (x, y) => y === D.MEZZ.y ? MC.concL : y === D.MEZZ.y + 8 || x === D.MEZZ.x1 ? O : y > D.MEZZ.y + 5 ? MC.trim : MC.conc);
  for (const tx of [22, 50, 78]) { rect(tx - 2, D.MEZZ.y - 14, tx + 2, D.MEZZ.y - 1, (x, y) => x === tx - 2 || x === tx + 2 || y === D.MEZZ.y - 14 ? O : MC.steel); for (let k = 0; k < 8; k++) put(tx + 3 + k, D.MEZZ.y - 9, MC.steelL); }
  // the stair flight: treads with a light nose, a steel stringer under them, a handrail above
  { const S = D.STAIR, y0 = D.MEZZ.y;
    for (let i = 0; i < S.n; i++) {
      const x0 = S.x0 + i * S.step, ty = y0 + (i + 1) * S.step;
      for (let x = x0; x <= x0 + S.step - 1; x++) { put(x, ty, MC.concL); put(x, ty + 1, MC.conc); put(x, ty + 2, MC.concD); put(x, ty + 3, MC.concD); }
      for (let y = ty - S.step + 1; y < ty; y++) put(x0, y, MC.concD);   // the riser
    }
    for (let x = S.x0; x < S.x0 + S.n * S.step; x++) { const sy = y0 + (x - S.x0) + S.step + 3; for (let k = 0; k < 5; k++) put(x, sy + k, k === 4 ? O : MC.trim); }   // the stringer
    for (let x = S.x0; x < S.x0 + S.n * S.step; x++) put(x, y0 - 12 + (x - S.x0), C('#6a6e78'));   // the handrail
  }
  // the ticket booth: cream panels, a dark glass window, a flat roof (a ledge)
  { const { x0, x1, top } = D.BOOTH;
    rect(x0, top, x1, GROUND - 1, (x, y) => x === x0 || x === x1 || y === top ? O : y === top + 1 ? MC.cream : y > top + 6 && y < top + 22 && x > x0 + 4 && x < x1 - 4 ? (x === Math.round((x0 + x1) / 2) ? O : C('#1d2028')) : (y - top) % 9 === 0 ? MC.tileD : MC.tile);
    text(put, 'BILLETS', x0 + 7, top + 26, MC.blue); }
  // a bench, the breaker box, the relay hut, the catwalk with its hangers and rail, the ladder
  rect(462, GROUND - 9, 494, GROUND - 7, (x, y) => y === GROUND - 9 ? C('#8a6a44') : C('#5a4028')); for (const lx of [465, 491]) for (let y = GROUND - 6; y < GROUND; y++) put(lx, y, MC.trim);
  { const { x, y } = D.BREAKER; rect(x - 7, y - 10, x + 7, y + 8, (xx, yy) => xx === x - 7 || xx === x + 7 || yy === y - 10 || yy === y + 8 ? O : yy === y - 9 ? MC.steelL : MC.steel); for (let yy = y + 9; yy < GROUND; yy++) put(x, yy, MC.steelD); text(put, 'EDF', x - 5, y - 7, MC.yel); }
  { const { x0, x1, top } = D.HUT; rect(x0, top, x1, GROUND - 1, (x, y) => x === x0 || x === x1 || y === top ? O : y === top + 1 ? MC.steelL : x > x0 + 10 && x < x0 + 22 && y > top + 10 ? (x === x0 + 11 || y === top + 11 ? O : MC.steelD) : (x - x0) % 5 === 0 ? MC.steelD : MC.steel); }
  { const { x0, x1, y } = D.CATWALK;
    for (let x = x0; x <= x1; x++) { put(x, y, MC.steelL); put(x, y + 1, MC.steel); put(x, y + 2, x % 4 === 0 ? O : MC.steelD); put(x, y + 3, O); }
    for (let x = x0; x <= x1; x += 22) for (let yy = y - 9; yy < y; yy++) put(x, yy, MC.steelD);
    for (let x = x0; x <= x1; x++) put(x, y - 9, MC.steel);
    for (let x = x0 + 10; x <= x1; x += 74) for (let yy = 92; yy < y; yy++) put(x, yy, C('#2a2a30'));   // hangers to the vault
    for (let yy = y + 4; yy < GROUND; yy++) { put(652, yy, MC.steelD); put(658, yy, MC.steelD); if ((yy - y) % 6 === 0) for (let x = 652; x <= 658; x++) put(x, yy, MC.steel); }   // the ladder
  }
  // the work lamp's stand and the sodium tubes' housings (their glass is drawn live: drawWorld)
  { const x = D.GREEN_LAMP; for (let y = GROUND - 66; y < GROUND; y++) put(x, y, MC.trim); rect(x - 4, GROUND - 74, x + 4, GROUND - 66, (xx, yy) => xx === x - 4 || xx === x + 4 || yy === GROUND - 74 || yy === GROUND - 66 ? O : MC.steelD); }
  for (const tx of D.TUBES) rect(tx - 14, 100, tx + 14, 103, (x, y) => y === 100 || x === tx - 14 || x === tx + 14 ? O : MC.steelD);
  { const { x, y } = D.LANTERN; for (let yy = 92; yy < y - 4; yy++) put(x, yy, C('#2a2a30')); }   // the lantern's wire
  // ---- the tunnel: the niches, the cable catwalk, the emergency lamps, the far ledge and track 2 ----
  for (const n of D.NICHES) {
    const x0 = n.x - n.w / 2, x1 = n.x + n.w / 2, top = GROUND - 52;
    for (let y = top - 6; y < GROUND; y++) for (let x = x0 - 3; x <= x1 + 3; x++) {
      const arch = top + 6 - Math.round(Math.sqrt(Math.max(0, (n.w / 2) ** 2 - (x - n.x) ** 2)) * 0.5);
      const inner = x >= x0 && x <= x1 && y >= arch, frame = !inner && y >= arch - 3 && x >= x0 - 3 && x <= x1 + 3;
      if (inner) b[y * W + x] = mix(C('#08080a'), C('#1a1a20'), (y - arch) / (GROUND - arch) * 0.6);
      else if (frame) b[y * W + x] = n.arena ? MC.concL : C('#4a3e36');
    }
  }
  { const { x0, x1, y } = D.WALL_CW; for (let x = x0; x <= x1; x++) { put(x, y, MC.steelL); put(x, y + 1, MC.steel); put(x, y + 2, O); } for (let x = x0 + 6; x < x1; x += 30) for (let k = 0; k < 8; k++) put(x + (k >> 1), y + 3 + k, MC.steelD); }
  for (const ex of D.EMERGENCY) rect(ex - 3, 186, ex + 3, 191, (x, y) => x === ex - 3 || x === ex + 3 || y === 186 || y === 191 ? O : C('#3a5aa0'));
  { const { x0, x1, y } = D.FAR_LEDGE; rect(x0, y, x1, GROUND - 1, (x, yy) => yy === y ? MC.concL : x === x0 || x === x1 ? O : (x - x0) % 20 === 0 ? MC.concD : yy > GROUND - 8 ? MC.concD : MC.conc); }
  for (let x = D.TRACK2.x0; x < D.TRACK2.x1; x++) { put(x, GROUND - 3, MC.rail); put(x, GROUND - 2, MC.railD); }   // track 2's near rail, at the back of the floor
  // ---- the yard: the camp car, the old car, the oil-drum fires, the blast door ----
  const metroCar = (x0, x1, top, base, col, colD, colL, lit) => {
    const bot = GROUND - 9;
    for (let x = x0; x <= x1; x++) for (let y = top; y <= bot; y++) {
      const ex = Math.min(x - x0, x1 - x), round = ex < 4 && y - top < 4 - ex;
      if (round) continue;
      let c = x === x0 || x === x1 || y === top || y === bot ? O : y === top + 1 ? colL : y > top + 12 && y < top + 30 && (x - x0) % 26 > 4 && (x - x0) % 26 < 20 ? (lit && (x - x0) % 52 < 26 ? WIN_B : C('#14141a')) : y === top + 31 || y === top + 11 ? colD : (x - x0) % 26 === 2 ? colD : col;
      if (c === col && noise2(x >> 1, y >> 1) < 0.12) c = MC.rustD;
      put(x, y, c);
    }
    for (const bx of [x0 + 26, x1 - 26]) for (let y = bot + 1; y < GROUND; y++) for (let x = bx - 12; x <= bx + 12; x++) put(x, y, Math.abs(x - bx) > 10 || y === bot + 1 ? O : (Math.hypot(x - bx + 6, y - (GROUND - 4)) < 3.5 || Math.hypot(x - bx - 6, y - (GROUND - 4)) < 3.5) ? C('#1a1a20') : MC.steelD);   // the bogies
    if (lit) for (let x = x0 + 4; x < x1 - 4; x += 7) out.winl.push(...((x - x0) % 28 === 4 ? [[x, top + 4, 16]] : []));
  };
  metroCar(D.CAR_A.x0, D.CAR_A.x1, D.CAR_A.y, GROUND - 9, MC.rust, MC.rustD, MC.rustL, true);
  metroCar(D.CAR_B.x0, D.CAR_B.x1, D.CAR_B.y, GROUND - 9, C('#3e4a46'), C('#2c3634'), C('#56625e'), false);
  // the chalk job board on the camp car, the trophy shelf with Bell's brass door bell, the radio, the axe rack
  rect(D.JOB_BOARD - 18, D.CAR_A.y + 34, D.JOB_BOARD + 18, D.CAR_A.y + 52, (x, y) => x === D.JOB_BOARD - 18 || x === D.JOB_BOARD + 18 || y === D.CAR_A.y + 34 || y === D.CAR_A.y + 52 ? C('#5a3a22') : C('#1c2420'));
  text(put, 'HORLOGER', D.JOB_BOARD - 16, D.CAR_A.y + 36, C('#d8d4c8')); text(put, '4 BIDONS', D.JOB_BOARD - 16, D.CAR_A.y + 42, C('#d8d4c8')); text(put, '03:00', D.JOB_BOARD - 16, D.CAR_A.y + 47, MC.red);
  rect(D.DOOR_BELL - 9, D.CAR_A.y + 44, D.DOOR_BELL + 9, D.CAR_A.y + 45, () => C('#6a4428')); rect(D.DOOR_BELL - 2, D.CAR_A.y + 40, D.DOOR_BELL + 2, D.CAR_A.y + 43, (x, y) => y === D.CAR_A.y + 40 ? C('#f0d070') : C('#c89a30'));
  rect(D.RADIO - 6, D.CAR_A.y + 46, D.RADIO + 6, D.CAR_A.y + 53, (x, y) => x === D.RADIO - 6 || x === D.RADIO + 6 || y === D.CAR_A.y + 46 || y === D.CAR_A.y + 53 ? O : x < D.RADIO ? C('#8a6a44') : (x + y) % 2 ? C('#3a3028') : C('#c8a060'));
  for (let x = 1782; x <= 1802; x++) put(x, GROUND - 8, C('#5a4028'));   // the rack the axe rests on
  for (const fx of [1664, 2124]) rect(fx - 6, GROUND - 15, fx + 6, GROUND - 1, (x, y) => Math.abs(x - fx) === 6 || y === GROUND - 15 ? O : y === GROUND - 11 || y === GROUND - 5 ? MC.rustD : x < fx - 3 ? MC.rustL : MC.rust);
  for (let x = D.CAR_A.x0; x <= D.CAR_A.x1; x += 9) { put(x, D.CAR_A.y - 2, x % 18 ? WIN_A : C('#e05040')); put(x + 4, D.CAR_A.y - 1, C('#2a2a2a')); }   // a string of lights along the roof
  { const dx = D.BLAST_DOOR;   // the blast door: a steel slab in a frame, yellow and black stripes
    rect(dx - 22, 196, dx, GROUND - 1, (x, y) => x === dx - 22 || x === dx || y === 196 ? O : y < 202 || x < dx - 19 || x > dx - 3 ? MC.steelD : ((x + y) >> 3) % 2 ? MC.yel : C('#1a1a1a'));
    out.blast = { x0: dx - 21, x1: dx - 1, y0: 197 }; }
  // ---- the junction: the signal box on its stilts, the cabinets, the gantry, the lever frame, the signal heads ----
  { const { x0, x1, y } = D.BALCONY, cy0 = y - 70, red = C('#5a2a24'), redD = C('#42201c');
    rect(x0 + 4, cy0, x1 - 4, y - 1, (x, yy) => x === x0 + 4 || x === x1 - 4 || yy === cy0 ? O : yy < cy0 + 4 ? C('#2a2a30') : yy > cy0 + 18 && yy < cy0 + 46 && x > x0 + 12 && x < x1 - 12 ? (x === Math.round((x0 + x1) / 2) || yy === cy0 + 32 ? O : C('#22303a')) : (yy - cy0) % 5 === 0 ? redD : red);
    for (let x = x0; x <= x1; x++) { put(x, y, MC.steelL); put(x, y + 1, MC.steel); put(x, y + 2, O); put(x, y - 8, MC.steel); }
    for (let x = x0; x <= x1; x += 12) for (let yy = y - 8; yy < y; yy++) put(x, yy, MC.steelD);
    for (const lx of [x0 + 6, x1 - 6]) for (let yy = y + 3; yy < GROUND; yy++) { put(lx, yy, MC.steelD); put(lx + 1, yy, O); }
    text(put, 'POSTE', x0 + 26, cy0 + 8, MC.cream);
    // the Bell & Sons clock in the window, stopped at 3:17 (red-tinted: a Choir sign)
    const { x: cx, y: cyy } = D.CLOCK;
    for (let yy = -6; yy <= 6; yy++) for (let xx = -6; xx <= 6; xx++) { const d = Math.hypot(xx, yy); if (d <= 6.4) put(cx + xx, cyy + yy, d > 5.4 ? C('#b02a2a') : C('#d0dce8')); }
    for (let k = 0; k <= 4; k++) put(cx + k, cyy, O); for (let k = 0; k <= 3; k++) put(cx + Math.round(k * 0.7), cyy + k, O);
    // lever A's frame on the balcony
    rect(D.LEVER_A - 3, y - 7, D.LEVER_A + 3, y - 1, (x, yy) => x === D.LEVER_A - 3 || x === D.LEVER_A + 3 || yy === y - 7 ? O : MC.steelD);
  }
  for (const cab of [D.CAB_A, D.CAB_B]) rect(cab.x0, cab.top, cab.x1, GROUND - 1, (x, y) => x === cab.x0 || x === cab.x1 || y === cab.top ? O : y === cab.top + 1 ? MC.steelL : (y - cab.top) % 10 === 5 ? MC.steelD : (x - cab.x0) % 8 === 4 && y > cab.top + 3 ? C('#c0a020') : C('#4a5260'));
  { const { x0, x1, y } = D.GANTRY;
    for (let x = x0; x <= x1; x++) { put(x, y, MC.steelL); put(x, y + 1, MC.yelD); put(x, y + 2, MC.yel); put(x, y + 3, O); const k = (x - x0) % 12; put(x, y + 4 + (k < 6 ? k : 12 - k), MC.yelD); put(x, y + 10, MC.yelD); }
    for (const lx of [x0 + 2, x1 - 2]) for (let yy = y + 4; yy < GROUND; yy++) { put(lx, yy, MC.yelD); put(lx + 1, yy, O); }
    for (let x = x0; x <= x1; x++) put(x, y - 8, MC.steel); for (let x = x0; x <= x1; x += 13) for (let yy = y - 8; yy < y; yy++) put(x, yy, MC.steelD);
  }
  rect(D.LEVER_B - 4, GROUND - 12, D.LEVER_B + 4, GROUND - 1, (x, y) => x === D.LEVER_B - 4 || x === D.LEVER_B + 4 || y === GROUND - 12 ? O : MC.steelD);   // lever B's ground frame
  for (const sx of D.SIGNALS) { rect(sx - 4, 140, sx + 4, 160, (x, y) => x === sx - 4 || x === sx + 4 || y === 140 || y === 160 ? O : C('#14141a')); for (let y = 161; y < 186; y++) put(sx, y, MC.steelD); }

  // ---- the floor band: ballast and rails, flooded water with an oil sheen, the third rail's guard boards ----
  const waterAt = x => D.WATER.find(w => x >= w.x0 && x <= w.x1 && !w.wet && !w.oil) || null, oilAt = x => D.WATER.find(w => w.oil && x >= w.x0 && x <= w.x1) || null, wetAt = x => D.WATER.find(w => w.wet && x >= w.x0 && x <= w.x1) || null;
  for (let x = 0; x < W; x++) {
    const wa = waterAt(x), oil = oilAt(x), wet = wetAt(x), hall = x < 300 || (x >= 1000 && x < 1004);
    for (let y = GROUND; y < H; y++) {
      const d = y - GROUND; let c;
      if (d === 0) c = hall ? MC.concL : C('#5a564e');
      else if (d <= STREET) {
        if (hall) c = (x + (d >> 2) * 7) % 22 === 0 || d % 5 === 0 ? MC.concD : MC.conc;   // the hall's floor: concrete slabs
        else {
          const rail = d === 5 || d === 11, railS = d === 6 || d === 12, sleeper = (x % 11 < 4) && d > 3 && d < 14;
          c = rail ? MC.rail : railS ? MC.railD : sleeper ? MC.sleeper : noise2(x, d) < 0.5 ? MC.ballast : MC.ballast2;
          if (wa || oil || wet) {   // water over the bed: dark, the rails dull under it, a pale ripple line; the slick's rainbow
            c = rail || railS ? mix(c, MC.water, 0.6) : (d % 4 === 1 && (x + d * 5) % 9 < 3) ? MC.waterL : MC.water;
            if (oil && d > 1 && d < 12 && ((x >> 2) + d) % 6 < 2) c = [MC.oil1, MC.oil2, MC.oil3][((x >> 3) + d) % 3];
            pud[d * W + x] = 1;
          }
        }
      } else c = hall ? (y % 5 === 0 || (x + (Math.floor(y / 5) % 2) * 7) % 14 === 0 ? MC.trim : MC.concD) : (y % 4 === 0 || (x + (Math.floor(y / 4) % 2) * 5) % 10 === 0 ? MC.mortar : MC.brickD);
      b[y * W + x] = c;
    }
  }
  for (const [a, z] of D.THIRD_RAIL) for (let x = a; x <= z; x++) { put(x, GROUND + 2, MC.yel); put(x, GROUND + 3, MC.yelD); put(x, GROUND + 4, MC.steelL); put(x, GROUND + 5, MC.steelD); }   // the third rail under its yellow guard board

  for (let i = 0; i < b.length; i++) if (b[i] !== pre[i] && i < GROUND * W) props[i] = 1;
  void pre0; void r;
  return { b, props, bg: pre, pud, ...out };
}

// ---- train cars: one painter for the 2D draw and the 3D model ----
const carCache = new Map();
export function carPx(type, dir = 1) {
  const ck = type + (dir < 0 ? 'L' : 'R');
  if (carCache.has(ck)) return carCache.get(ck);
  const spec = D.CAR[type], w = spec.len, h = spec.h + 8, px = new Uint32Array(w * h), O = MC.out;
  const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < w && y < h) px[y * w + x] = c; };
  const body = { loco: [C('#1e2a26'), C('#141c1a'), C('#2e3e38')], box: [C('#5a3424'), C('#42261a'), C('#744a34')], flat: [C('#3a3a40'), C('#2a2a30'), C('#4a4a52')],
    tank: [C('#5a5e66'), C('#3e424a'), C('#7a7e88')], empty: [C('#3a4a5a'), C('#2a3644'), C('#56687a')] }[type];
  const top = h - 8 - spec.h, bot = h - 9;
  for (let x = 0; x < w; x++) for (let y = top; y <= bot; y++) {
    let c = x === 0 || x === w - 1 || y === top || y === bot ? O : y === top + 1 ? body[2] : body[0];
    if (type === 'box' && (x % 8 === 0)) c = body[1];
    if (type === 'box' && x > w / 2 - 10 && x < w / 2 + 10 && y > top + 8) c = x === Math.round(w / 2) ? O : body[1];   // the sliding door
    if (type === 'flat') { if (y < bot - 4) c = (x > 8 && x < w - 8 && y > top + 2 && (x - 8) % 12 < 9) ? (y === top + 3 ? C('#8a6a44') : C('#6a4a2e')) : 0; }   // crates lashed on the deck
    if (type === 'tank') { const e = ((y - (top + bot) / 2) / ((bot - top) / 2)) ** 2; if (e > 1) c = 0; else if (e > 0.82) c = O; else if (y < (top + bot) / 2 - 4) c = body[2]; }
    if (type === 'empty' && y > top + 10 && y < top + 30 && x % 14 > 2 && x % 14 < 12) c = C('#101820');
    if (type === 'loco') {
      if (x > w - 20 && y > top + 6 && y < top + 22) c = x === w - 20 || y === top + 6 ? O : C('#1a2430');   // the cab window
      if (y > bot - 12 && y < bot - 4 && ((x >> 2) % 2)) c = MC.yel;   // the warning stripes
      if (x >= w - 3 && y > bot - 18 && y < bot - 12) c = C('#fff4c0');   // the headlight
    }
    if (c) put(x, y, c);
  }
  if (dir < 0) for (let y = 0; y < h; y++) px.subarray(y * w, y * w + w).reverse();   // facing left: the body mirrored, the lettering not
  if (type === 'box') text(put, 'FRET', 6, top + 10, C('#c8b8a0'));
  if (type === 'loco') text(put, 'L0', dir < 0 ? w - 14 : 6, top + 8, MC.yel);
  for (const bx of [10, w - 11]) for (let y = bot + 1; y < h; y++) for (let x = bx - 8; x <= bx + 8; x++) {   // the bogies (the same both ways)
    const wh = Math.hypot(x - bx + 4, y - (h - 4)) < 3.6 || Math.hypot(x - bx - 4, y - (h - 4)) < 3.6;
    put(x, y, wh ? C('#1a1a20') : y === bot + 1 || Math.abs(x - bx) === 8 ? O : MC.steelD);
  }
  for (let x = 0; x < w; x++) put(x, bot + 1, O);
  const r = { w, h, px };
  carCache.set(ck, r);
  return r;
}
// where each car of a train is: [{ type, x0, x1 }] in world x (x0 < x1). T: { cars, x (the front), dir, gap }
export function trainCars(T) {
  const out = []; let f = T.x;
  for (const type of T.cars) { const L = D.CAR[type].len; out.push(T.dir > 0 ? { type, x0: f - L, x1: f } : { type, x0: f, x1: f + L }); f -= T.dir * (L + T.gap); }
  return out;
}
export function drawTrain(R, T) {
  const { plot, blendPlot } = R, [c0, c1] = T.clip, yb = GROUND - (T.track === 2 ? 3 : 0);
  for (const car of trainCars(T)) {
    if (car.x1 < c0 || car.x0 > c1 || car.x1 < R.cam.x - 4 || car.x0 > R.cam.x + R.cam.vw + 4) continue;
    const I = carPx(car.type, T.dir);
    for (let y = 0; y < I.h; y++) for (let x = 0; x < I.w; x++) {
      const c = I.px[y * I.w + x]; if (!c) continue;
      const wx = Math.round(car.x0) + x; if (wx < c0 || wx > c1) continue;
      plot(wx, yb - I.h + y + 1, T.track === 2 ? shade(c, 0.72) : c);
    }
    // sparks under the wheels
    if (Math.floor(R.t * 30 + car.x0) % 3 === 0) for (let k = 0; k < 2; k++) { const sx = Math.round(car.x0 + 6 + ((R.t * 97 + k * 31) % (I.w - 12))); if (sx >= c0 && sx <= c1) plot(sx, yb - 1, k ? C('#ffe080') : C('#fff8f0')); }
    void blendPlot;
  }
}
export function drawHandcar(R, h) {
  const { plot } = R, x0 = Math.round(h.x) - 15, y0 = GROUND - 14, O = MC.out, red = C('#b02424'), redD = C('#7a1818');
  for (let x = 0; x <= 30; x++) for (let y = 0; y < 8; y++) plot(x0 + x, y0 + y, x === 0 || x === 30 || y === 0 || y === 7 ? O : y === 1 ? C('#d84040') : (x % 6 === 0 ? redD : red));
  for (const wx of [x0 + 7, x0 + 23]) for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 10) plot(wx + x, GROUND - 4 + y, x * x + y * y > 6 ? O : C('#2a2a30'));
  const a = Math.sin(h.pump || 0) * 0.5, px = x0 + (h.dir > 0 ? 6 : 24), py = y0;   // the pump lever on its post (at the back: the rider stands mid-car)
  for (let y = 0; y < 8; y++) plot(px, py - y, O);
  for (let k = -8; k <= 8; k++) plot(Math.round(px + Math.cos(a) * k), Math.round(py - 8 + Math.sin(a) * k), C('#8a8e98'));
  if (h.lamp) for (let y = -2; y <= 0; y++) plot(x0 + (h.dir > 0 ? 30 : 0), y0 + 3 + y, C('#fff4c0'));
}

// ---- per frame, on the wall behind everyone (both views: in 3D on the wall layer) ----
export function drawWorld(R, S) {
  const { plot, line1 } = R, t = R.t, O = MC.out;
  // stash boards (planks over a hole) and the Choir's toolbox
  for (const st of S.stashes) {
    if (st.broken) continue;
    const x0 = Math.round(st.x - st.w / 2), x1 = x0 + st.w, y0 = GROUND - st.h - (st.kind === 'box' ? 0 : 6), y1 = GROUND - (st.kind === 'box' ? 1 : 6);
    const dmg = st.maxHp ? 1 - st.hp / st.maxHp : 0, fl = st.flash > 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      let c;
      if (st.kind === 'box') c = x === x0 || x === x1 || y === y0 || y === y1 ? O : y === y0 + 1 ? C('#c03030') : y === y0 + 4 ? C('#202024') : C('#8a1e1e');
      else { const plank = Math.floor((x - x0) / 6); c = x === x0 || x === x1 || y === y0 || y === y1 ? O : (x - x0) % 6 === 0 ? C('#4a3420') : (plank + y) % 13 === 0 ? C('#6a4a2c') : C('#8a6a44'); if (dmg > 0.4 && (x * 7 + y * 3) % 11 === 0) c = O; }
      if (st.id === 'n1' && y > y0 + 3 && y < y0 + 30 && x > x0 + 2 && x < x1 - 2) c = y < y0 + 12 ? C('#c8a050') : (x + y) % 5 === 0 ? C('#e8dcb8') : C('#a83228');   // the torn poster on the board
      plot(x, y, fl && c !== O ? C('#f0e8d8') : c);
    }
    if (st.id === 'n1') { const put = (x, y, c) => plot(x, y, c); text(put, 'LIGNE', x0 + 2, y0 + 5, MC.redD); text(put, '0', x0 + 9, y0 + 12 + 3, MC.redD); }
  }
  // the green work lamp, the sodium tubes, the breaker's lamp
  { const x = D.GREEN_LAMP; if (!S.greenDead) { for (let y = GROUND - 73; y < GROUND - 66; y++) for (let xx = x - 3; xx <= x + 3; xx++) plot(xx, y, (xx + y) % 2 ? C('#80ff9a') : C('#50d070')); } else plot(x, GROUND - 70, C('#3a4a3a')); }
  for (const tx of D.TUBES) { const on = S.tubes > 0 && (S.tubes >= 1 || Math.sin(t * 40 + tx) > 0) && !(tx === 700 && Math.sin(t * 7) > 0.92); for (let x = tx - 12; x <= tx + 12; x++) plot(x, 104, on ? C('#ffe0a0') : C('#3a3a40')); }
  if (S.breakerArmed && !S.breakerHit) { const { x, y } = D.BREAKER; if (Math.floor(t * 4) % 2) for (let k = -1; k <= 1; k++) plot(x + k, y + 4, C('#ff4040')); }
  // the hanging lantern (or where it fell)
  if (!S.lantern.fallen) { const { x, y } = D.LANTERN; for (let yy = y - 4; yy <= y + 2; yy++) for (let xx = x - 2; xx <= x + 2; xx++) plot(xx, yy, Math.abs(xx - x) === 2 || yy === y - 4 ? O : C('#ffc860')); }
  // the blast door slides up as it opens
  { const k = S.door, dx = D.BLAST_DOOR; if (k > 0) for (let y = 197; y < GROUND; y++) for (let x = dx - 21; x < dx; x++) { const yy = y + Math.round(k * 84); plot(x, y, yy >= GROUND ? C('#060608') : ((x + yy) >> 3) % 2 ? MC.yel : C('#1a1a1a')); } }
  // the junction: the signal heads (amber over track 1, cyan over track 2), the levers, the fallen clock
  if (S.junction) {
    for (const sx of D.SIGNALS) {
      const sig = S.signal; // { track, flip }
      const a = sig && sig.track === 1 && (Math.floor(t * 6) % 2 || sig.steady), c = sig && sig.track === 2 && (Math.floor(t * 6) % 2 || sig.steady);
      for (let y = 143; y <= 147; y++) for (let x = sx - 2; x <= sx + 2; x++) plot(x, y, a ? C('#ffb040') : C('#3a2a14'));
      for (let y = 152; y <= 156; y++) for (let x = sx - 2; x <= sx + 2; x++) plot(x, y, c ? C('#60e0ff') : C('#14303a'));
    }
    const lever = (x, y, k, hot) => { const ang = -1.0 + 2.0 * k, hx = x + Math.sin(ang) * 9, hy = y - Math.cos(ang) * 9; line1(x, y, hx, hy, C('#9aa0a8')); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) plot(Math.round(hx) + dx, Math.round(hy) + dy, hot ? C('#ff4040') : C('#b02020')); };
    lever(D.LEVER_A, D.BALCONY.y - 4, S.leverA, S.leverA > 0.5);
    lever(D.LEVER_B, GROUND - 6, S.leverB, S.leverB > 0.5);
    if (S.jam) for (let k = 0; k < 6; k++) plot(D.LEVER_A - 3 + k, D.BALCONY.y - 6 + (k & 1), C('#9aa0a8'));   // her chain round the frame
  }
  if (S.clockFell) { const cx = D.CLOCK.x + 8, cy = D.BALCONY.y - 3; for (let x = -5; x <= 5; x++) plot(cx + x, cy, x === -5 || x === 5 ? O : C('#d0dce8')); plot(cx, cy - 1, C('#b02a2a')); }
}

// ---- over the lit scene, unlit: fire, sparks, arcs, eye glints, the waterfall's spray (both views: in 3D on the fx layer) ----
const FIREC = [C('#fff0b0'), C('#ffc040'), C('#ff7a20'), C('#c03010')];
export function flame(R, x, y, w, h, seed) {
  const t = R.t;
  for (let i = 0; i < w * 1.6; i++) {
    const ph = (i * 0.137 + t * 2.6 + seed) % 1, xx = x - w / 2 + ((i * 7.3 + seed * 13) % w) + Math.sin(t * 9 + i) * 1.2, yy = y - ph * h * (0.6 + 0.4 * ((i * 5) % 3) / 2);
    R.plot(Math.round(xx), Math.round(yy), FIREC[Math.min(3, Math.floor(ph * 4))]);
  }
}
export function drawFx(R, S) {
  const { plot, blendPlot } = R, t = R.t;
  for (const f of S.fires) {   // fire on the water or the fuel: a burning band, flames along it
    const x0 = Math.max(f.x0, R.cam.x - 4), x1 = Math.min(f.lit1 ?? f.x1, f.x1, R.cam.x + R.cam.vw + 4), k = f.t < 1 ? f.t : 1;
    for (let x = Math.ceil(x0); x <= x1; x += 3) flame(R, x, GROUND - 1, 4, (f.wall ? 26 : 12) * k + 2, x * 0.37);
  }
  for (const b of S.burners) flame(R, b.x, b.y, b.w || 8, b.h || 12, b.x * 0.1);   // the brazier, the oil-drum fires, burning goons
  for (const a of S.arcs) {   // third-rail arcs: a blue-white crackle along the rail, a zigzag up
    for (let k = 0; k < 4; k++) { const x = Math.round(a.x0 + ((t * 300 + k * 37 + a.x0) % Math.max(1, a.x1 - a.x0))); plot(x, GROUND + 1, C('#e0f8ff')); plot(x, GROUND - 1 - (k & 1), C('#60d0ff')); if (a.live) { plot(x + 1, GROUND - 3, C('#a0e8ff')); plot(x - 1, GROUND - 5, C('#60d0ff')); } }
  }
  for (const g of S.glints) {   // eyes in the dark: two pale points; a cigarette's ember below them
    plot(g.x, g.y, C('#e8e0a0')); plot(g.x + g.f * 2, g.y, C('#e8e0a0'));
    if (g.smoke && Math.floor(t * 2 + g.x) % 3) plot(g.x + g.f * 3, g.y + 3, C('#ff6020'));
  }
  for (const f of S.flares) {   // a flare burning on the floor: a red-white core, smoke
    plot(Math.round(f.x), Math.round(f.y), C('#fff0f0')); plot(Math.round(f.x) + 1, Math.round(f.y), C('#ff4040')); plot(Math.round(f.x), Math.round(f.y) - 1, C('#ff8080'));
    for (let i = 0; i < 3; i++) { const ph = (t * 0.6 + i * 0.33) % 1, x = f.x + Math.sin(t + i) * 3, y = f.y - 4 - ph * 20; if (R.soft) R.soft(x, y, 2 + ph * 5, 120, 60, 60, 0.3 * (1 - ph)); else blendPlot(Math.round(x), Math.round(y), 120, 60, 60, 0.3 * (1 - ph)); }   // (3D: soft puffs)
  }
  if (S.spray) { const x = D.WATERFALL.x; for (let i = 0; i < 10; i++) { const ph = (t * 1.7 + i * 0.1) % 1, sx = x - 8 + ((i * 37) % 16), sy = GROUND - 2 - ph * 10; if (R.soft) R.soft(sx, sy, 1.5 + ph * 3, 200, 220, 240, 0.35 * (1 - ph)); else blendPlot(Math.round(sx), Math.round(sy), 200, 220, 240, 0.4 * (1 - ph)); } }
}
