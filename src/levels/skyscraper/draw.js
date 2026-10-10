// Level 8, "The Spire": the per-frame painters (both views; the 3D view draws them on its wall and front layers).
//   drawWorld(R, S)   on the wall behind everyone: the lift's facade scroll, the twin car, the cradle, the chandelier, the mirrors and
//                     their reflections, the cases, the guests, the piano, the glass floor, the gears, the pendulum, the bells, the
//                     clock face and its hands, the hanging Conductor in the ending, the vestry's clock, soup and pipe
//   drawFx(R, S)      in front: glass, forks, the falling bodies, floor tells (rings, marks, the laser sweep, the peal), the prompt ring
// R: { plot, line1, blendPlot, cam, t } (world coordinates); S: the run state (src/levels/skyscraper/run.js)
import { C } from '../../core/color.js';
import { SC } from './paint.js';
import * as D from './data.js';

const GROUND = D.GROUND;
const mix = (a, b, k) => { const m = sh => Math.round((a >> sh & 255) * (1 - k) + (b >> sh & 255) * k); return (0xff000000 | m(16) << 16 | m(8) << 8 | m(0)) >>> 0; };
const SKIN = C('#e0c0a0'), BELL_COLS = [C('#5a4632'), C('#d8bca0'), C('#2a2622')];

// a small figure for the bodies the engine does not hold (the falling, the guests, the hanging Conductor): head, torso, limbs
export function figure(R, x, y, k, cols, arms = 0, s = 1) {
  const { plot, line1 } = R, [top, skin, leg] = cols, sx = Math.round(x), sy = Math.round(y);
  const hy = sy - Math.round(34 * s), sh = sy - Math.round(28 * s), hip = sy - Math.round(14 * s);
  for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) if (dx * dx + dy * dy <= 5) plot(sx + dx, hy + dy, dx * dx + dy * dy > 3 ? SC.out : skin);
  for (let yy = sh; yy <= hip; yy++) for (let dx = -2; dx <= 2; dx++) plot(sx + dx, yy, Math.abs(dx) === 2 ? SC.out : top);
  line1(sx - 2, sh + 1, sx - 4 - Math.round(3 * arms), sh + 10 - Math.round(20 * arms), top); line1(sx + 2, sh + 1, sx + 4 + Math.round(3 * arms), sh + 10 - Math.round(20 * arms), top);
  line1(sx - 1, hip, sx - 3 - Math.round(k * 2), sy, leg); line1(sx + 1, hip, sx + 3 + Math.round(k * 2), sy, leg);
}
function clock317(R, x, y) {   // a Bell & Sons clock stopped at 3:17 (the bible's rule: one in every boss lair)
  const { plot, line1 } = R;
  for (let dx = -8; dx <= 8; dx++) for (let dy = -8; dy <= 8; dy++) { const r2 = dx * dx + dy * dy; if (r2 <= 64) plot(x + dx, y + dy, r2 > 49 ? SC.brass : SC.dial); }
  line1(x, y, x + 4, y + 1, SC.black);
  const a = 17 / 60 * Math.PI * 2; line1(x, y, Math.round(x + Math.sin(a) * 7), Math.round(y - Math.cos(a) * 7), SC.black);
}

export function drawWorld(R, S) {
  const { plot, line1, blendPlot } = R, t = R.t, O = SC.out, cam = R.cam;
  const vis = (x0, x1) => x1 > cam.x - 10 && x0 < cam.x + cam.vw + 10;
  // the lift: the facade scrolls past the car (it rises; after the snap it falls); the clouds; the twin car; the cradle
  if (vis(530, 830) && S.lift) {
    const L = S.lift, off = ((Math.floor(L.floor * 64) % 64) + 64) % 64;
    for (let y = 0; y < GROUND; y++) {
      const fy = (y + off) % 64, row = Math.floor((y + off) / 64);
      for (const [x0, x1] of [[540, 594], [766, 820]]) for (let x = x0; x <= x1; x++) {
        if (fy < 3) plot(x, y, SC.steelD);
        else if (fy > 8 && fy < 52 && (x % 14) > 2 && ((x >> 3) * 7 + row * 13) % 5 === 0) plot(x, y, SC.cityL);
      }
    }
    if (L.floor > 55 && L.floor < 73) for (let y = 0; y < 220; y += 2) for (let x = 540; x < 820; x += 2) if (((x * 7 + y * 3 + Math.floor(t * 20)) % 9) === 0) blendPlot(x, y, 180, 190, 210, 0.25);
    const T = L.twin;
    if (T && T.on) {
      const ty = Math.round(T.y);
      for (let y = Math.max(0, ty + D.CAR.ceil); y < ty + GROUND; y++) for (let x = D.CAR.x0 + 10; x <= D.CAR.x1 - 10; x++) { if (x === D.CAR.x0 + 10 || x === D.CAR.x1 - 10 || y === ty + D.CAR.ceil || y === ty + GROUND - 1) plot(x, y, SC.steelD); else if ((x + y) % 4 === 0) plot(x, y, SC.glass); }
    }
    if (L.cradle && L.cradle.on) {
      const cy = Math.round(L.cradle.y);
      for (let x = D.CRADLE.x0; x <= D.CRADLE.x1; x++) { plot(x, cy, SC.steelL); plot(x, cy + 1, SC.steelD); if (x % 6 === 0) for (let y = cy - 14; y < cy; y++) plot(x, y, SC.steel); plot(x, cy - 14, SC.steel); }
      line1(D.CRADLE.x0 + 4, cy - 14, D.CRADLE.x0 + 4, 0, SC.steelD); line1(D.CRADLE.x1 - 4, cy - 14, D.CRADLE.x1 - 4, 0, SC.steelD);
    }
    if (!L.gone) { for (let x = D.CAR.x0; x <= D.CAR.x1; x++) { plot(x, D.CAR.ceil, SC.steelL); plot(x, D.CAR.ceil + 1, SC.steelD); } if (!L.snapped) line1(680, D.CAR.ceil, 680, 0, SC.steelD); for (let x = D.CAR.hatch[0]; x <= D.CAR.hatch[1]; x++) plot(x, D.CAR.ceil + 2, SC.steel); }
  }
  // the chandelier: crystal on a chain; it falls; then a glittering slip patch
  if (S.chand && vis(250, 350)) {
    const c = S.chand, x = D.CHAND.x, y = Math.round(c.y);
    if (c.st !== 'down') {
      if (c.st === 'hang') line1(x, 40, x, y - 10, SC.goldD);
      for (let k = -16; k <= 16; k++) { const yy = y + Math.round(Math.abs(k) * 0.3); plot(x + k, yy, SC.gold); if (k % 4 === 0) for (let d = 1; d < 6; d++) plot(x + k, yy + d, d === 5 ? SC.lamp : SC.whiteD); }
      for (let k = -8; k <= 8; k++) plot(x + k, y - 6 + Math.round(Math.abs(k) * 0.5), SC.goldL);
    }
  }
  if (S.slip && S.slip.t > 0) for (let x = S.slip.x0; x <= S.slip.x1; x += 2) if (((x + Math.floor(t * 3)) % 5) < 2) plot(x, GROUND - 1, (x % 4) ? SC.white : SC.goldL);
  // mirrors: glass, cracks, and the reflections of everyone in front of them (never the real Lys: she has no reflection)
  for (const p of S.panes || []) {
    if (!p.def.mirror || !vis(p.x0, p.x1)) continue;
    for (let y = p.y0; y <= p.y1; y++) for (let x = p.x0; x <= p.x1; x++) {
      if (p.broken) { if ((x * 3 + y * 7) % 11 === 0) plot(x, y, SC.mirrorD); else if (y > p.y1 - 3 && (x + y) % 3 === 0) plot(x, y, SC.mirrorL); continue; }
      plot(x, y, (x + y * 2) % 23 === 0 ? SC.mirrorL : y < p.y0 + 6 ? mix(SC.mirror, SC.mirrorL, 0.4) : SC.mirror);
    }
    if (p.broken) continue;
    for (const f of S.reflect || []) if (f.x >= p.x0 - 2 && f.x <= p.x1 + 2) for (let y = Math.round(f.y - f.h); y <= Math.min(p.y1, Math.round(f.y)); y++) for (let dx = -2; dx <= 2; dx++) { const x = Math.round(f.x) + dx; if (x >= p.x0 && x <= p.x1 && y >= p.y0) plot(x, y, Math.abs(dx) === 2 ? SC.mirrorD : f.c); }
    for (const c of p.cracks) { line1(c.x, c.y, c.x + c.dx * 6, c.y + Math.round(c.dy * 8), SC.white); line1(c.x, c.y, c.x - c.dx * 4, c.y - 5, SC.whiteD); }
    if (p.ripple > 0) for (let y = p.y0; y <= p.y1; y += 3) plot(p.x0 + Math.floor((y + t * 60) % (p.x1 - p.x0 + 1)), y, SC.white);
  }
  for (const p of S.panes || []) if (p.def.cased && vis(p.x0, p.x1)) for (let x = p.x0 - 1; x <= p.x1 + 1; x++) { plot(x, p.y0 - 1, SC.gold); plot(x, p.y1 + 1, SC.goldD); }
  // the penthouse guests: they flee to the service door
  for (const g of S.guests || []) if (!g.gone && vis(g.x - 4, g.x + 4)) figure(R, g.x, GROUND - 1, g.run ? Math.sin(t * 16 + g.x) : 0, [g.dress, SKIN, g.dress], g.run ? 0.9 : 0.1, 0.95);
  // the grand piano: a pushable heavy; when its tile goes, it falls with a last chord
  if (S.piano && !S.piano.gone && vis(S.piano.x - 24, S.piano.x + 24)) {
    const x = Math.round(S.piano.x), y = Math.round(S.piano.y ?? GROUND);
    for (let yy = y - 24; yy < y - 8; yy++) for (let xx = x - 20; xx <= x + 20; xx++) plot(xx, yy, yy === y - 24 || xx === x - 20 || xx === x + 20 ? O : (xx + yy) % 13 === 0 ? SC.blackL : SC.black);
    for (let xx = x - 18; xx <= x - 2; xx++) plot(xx, y - 13, xx % 2 ? SC.white : SC.blackL);
    for (const lx of [x - 17, x + 17]) for (let yy = y - 8; yy < y; yy++) plot(lx, yy, SC.blackL);
    line1(x + 4, y - 24, x + 18, y - 34, SC.blackL);   // the open lid
  }
  // the glass floor over ninety floors: cracks by stage; a broken tile is the drop
  for (const g of S.tiles || []) {
    if (!vis(g.x0, g.x1)) continue;
    for (let x = g.x0; x <= g.x1; x++) for (let y = GROUND; y < GROUND + 8; y++) {
      if (g.broken) { plot(x, y, (x * 5 + y * 3) % 13 === 0 ? SC.cityL : SC.city); continue; }
      plot(x, y, y === GROUND ? SC.glassL : (x * 7 + y * 5) % 17 === 0 ? SC.cityL : mix(SC.glass, SC.city, 0.5));
    }
    if (!g.broken && g.stage >= 1) for (let k = 0; k < (g.stage >= 2 ? 9 : 4); k++) { const cx = g.x0 + 8 + ((k * 37) % (g.x1 - g.x0 - 16)); line1(cx, GROUND, cx + ((k % 3) - 1) * 9, GROUND + 4, SC.white); }
  }
  // the bells: the hammer lifts before a peal; the bell swings with it
  const bell = (bx, by) => {
    const pl = S.peal, sw = pl ? Math.round(Math.sin(pl.swing * 9) * 4 * pl.k) : 0;
    line1(bx, by - 30, bx, by - 14, SC.brassD);
    for (let y = by - 14; y <= by + 8; y++) { const w = 4 + Math.round((y - by + 14) * 0.45); for (let x = -w; x <= w; x++) plot(bx + x + Math.round(sw * (y - by + 14) / 22), y, Math.abs(x) === w || y === by + 8 ? O : x < -w + 2 ? SC.brassL : SC.brass); }
    if (pl && pl.lift > 0) { const hy = by + 10 - Math.round(pl.lift * 10); line1(bx + 12, hy, bx + 22, hy - 6, SC.steelL); line1(bx + 12, hy + 1, bx + 22, hy - 5, SC.steelD); }
  };
  if (vis(1860, 2140)) {
    bell(...D.GEAR_ARENA.bell);
    D.GEARS.forEach((g, gi) => {
      const a0 = (S.gearA && S.gearA[gi]) || 0;
      for (let k = 0; k < 72; k++) { const a = k / 72 * Math.PI * 2; plot(Math.round(g.cx + Math.cos(a) * g.r), Math.round(g.cy + Math.sin(a) * g.r), SC.brassL); plot(Math.round(g.cx + Math.cos(a) * (g.r - 3)), Math.round(g.cy + Math.sin(a) * (g.r - 3)), SC.brassD); }
      for (let s = 0; s < 6; s++) { const a = a0 + s / 6 * Math.PI * 2; line1(g.cx, g.cy, Math.round(g.cx + Math.cos(a) * (g.r - 3)), Math.round(g.cy + Math.sin(a) * (g.r - 3)), SC.brassD); }
      for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) if (dx * dx + dy * dy < 10) plot(g.cx + dx, g.cy + dy, SC.brassL);
    });
    for (const th of S.teeth || []) { const s = th.s, y0 = Math.round(s.y); for (let x = Math.round(s.x0); x <= Math.round(s.x1); x++) for (let y = y0; y < y0 + 5; y++) plot(x, y, y === y0 ? SC.brassL : x === Math.round(s.x0) || x === Math.round(s.x1) ? O : SC.brass); }
    for (const m of D.MESH) for (let k = -1; k <= 1; k++) plot(m.x + k, m.y, Math.floor(t * 6) % 2 ? C('#ff4030') : SC.redD);
    clock317(R, ...D.GEAR_ARENA.clock);
  }
  if (vis(2160, 2430)) {
    bell(...D.PEND_ARENA.bell);
    if (S.pend) {
      const p = S.pend, [px, py] = D.PEND.pivot, bx = Math.round(p.x), by = Math.round(p.y), r = D.PEND.r;
      line1(px, Math.max(0, py), bx, by, SC.brassD); line1(px + 1, Math.max(0, py), bx + 1, by, SC.brass);
      for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) { const r2 = dx * dx + dy * dy; if (r2 <= r * r) plot(bx + dx, by + dy, r2 > (r - 2) ** 2 ? O : r2 < 20 ? SC.lamp : (dx + dy) % 7 === 0 ? SC.brassL : SC.brass); }
    }
    if (S.dialBroken) for (let y = 30; y < GROUND; y += 2) for (let x = D.PEND_ARENA.dial - 2; x <= D.PEND_ARENA.dial + 2; x++) if ((x + y) % 5 === 0) plot(x, y, SC.sky1);
    if (S.clutch > 0) for (let k = 0; k < 6; k++) blendPlot(2290 + Math.round(Math.sin(t * 9 + k) * 6), 130 - k * 6, 230, 230, 230, 0.4);
  }
  // the face: the lit dial, the numeral ledges, the hour hand at XII, the minute hand, the bell above, the beacon, Nero's hatch
  if (vis(2436, 2800)) {
    const F = D.FACE;
    for (let dy = -F.r; dy <= F.r; dy++) for (let dx = -F.r; dx <= F.r; dx++) { const r2 = dx * dx + dy * dy; if (r2 > F.r * F.r) continue; const x = F.cx + dx, y = F.cy + dy; if (y >= GROUND - 6) continue; plot(x, y, r2 > (F.r - 3) ** 2 ? SC.brass : (dx * 3 + dy * 5) % 29 === 0 ? SC.amber : mix(SC.dial, SC.amber, 0.25 + 0.2 * Math.sin((dx + dy) * 0.05))); }
    for (let h = 1; h <= 12; h++) { const a = h / 12 * Math.PI * 2, x = Math.round(F.cx + Math.sin(a) * (F.r - 10)), y = Math.round(F.cy - Math.cos(a) * (F.r - 10)); if (y < GROUND - 6) for (let k = -2; k <= 2; k++) plot(x + k, y, SC.black); }
    for (const n of D.NUMERALS) for (let k = -13; k <= 13; k++) { plot(n.x + k, n.y, SC.brassL); plot(n.x + k, n.y + 1, SC.brassD); }
    line1(F.cx, F.cy, F.cx, F.cy - 50, SC.black); line1(F.cx + 1, F.cy, F.cx + 1, F.cy - 50, SC.black);
    if (S.hand) { const h = S.hand; for (let w = -1; w <= 1; w++) line1(F.cx, F.cy + w, Math.round(h.tx), Math.round(h.ty) + w, w ? SC.black : SC.blackL); }
    for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) if (dx * dx + dy * dy < 10) plot(F.cx + dx, F.cy + dy, SC.brassL);
    bell(...F.bell);
    if (Math.floor(t * 1.5) % 2) for (let k = -1; k <= 1; k++) plot(F.cx + k, 6, SC.beacon);
    if (S.hatchOpen) for (let y = GROUND - 39; y < GROUND - 7; y++) for (let x = F.hatch - 7; x <= F.hatch + 7; x++) plot(x, y, SC.out);
    const hg = S.hang;
    if (hg && !hg.gone) {
      const x = Math.round(hg.x), y = Math.round(hg.y);
      figure(R, x - hg.slip, y + 40, Math.sin(t * 1.3) * 0.4, BELL_COLS, 1, 1.05);
      if (!hg.watchGone) { line1(x - 4, y + 14, x - 8, y + 26, SC.gold); plot(x - 8, y + 27, SC.goldL); }
    }
  }
  if (vis(1720, 1840)) {
    clock317(R, ...D.VESTRY.clock);
    const bx = D.VESTRY.bench;
    for (let k = -3; k <= 3; k++) plot(bx - 6 + k, GROUND - 14, C('#e0e0d8')); plot(bx - 6, GROUND - 15, C('#c08040'));
    for (let k = 0; k < 4; k++) blendPlot(bx - 6 + Math.round(Math.sin(t * 2 + k) * 2), GROUND - 17 - k * 3, 220, 220, 220, 0.25);   // the soup, still warm
    line1(bx + 4, GROUND - 13, bx + 10, GROUND - 13, C('#7a3a20'));
    for (let k = 0; k < 5; k++) blendPlot(bx + 10 + Math.round(Math.sin(t * 1.5 + k * 0.8) * 2), GROUND - 15 - k * 3, 200, 200, 210, 0.3);   // the cherry-wood pipe, still smoking
  }
}

export function drawFx(R, S) {
  const { plot, line1, blendPlot } = R, t = R.t;
  for (const p of S.panes || []) {
    if (p.def.mirror || p.broken) continue;
    const front = !p.def.back || p.def.car;
    for (let y = p.y0; y <= p.y1; y++) for (let x = p.x0; x <= p.x1; x++) if ((x + y) % (front ? 5 : 7) === 0) blendPlot(x, y, 170, 200, 230, front ? 0.22 : 0.3);
    for (const c of p.cracks) { line1(c.x, c.y, c.x + c.dx * 5, c.y + Math.round(c.dy * 7), SC.white); line1(c.x, c.y, c.x - c.dx * 3, c.y - 4, SC.whiteD); }
  }
  for (const f of S.forks || []) {
    const x = Math.round(f.x), y = Math.round(f.y);
    line1(x, y, x, y - 5, SC.silver); plot(x - 1, y - 6, SC.silver); plot(x + 1, y - 6, SC.silver);
    if (f.ring > 0) for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28, r = 8 - f.ring * 8; plot(Math.round(x + Math.cos(a) * r), Math.round(y - 3 + Math.sin(a) * r), SC.white); }
  }
  for (const f of S.fallers || []) figure(R, f.x, f.y, Math.sin(f.t * 8), f.cols, Math.sin(f.t * 5) * 0.5 + 0.5, Math.max(0.4, 1 - f.t * 0.25));
  for (const r of S.ropes || []) line1(Math.round(r.x), 0, Math.round(r.x), Math.round(r.y), SC.steelL);
  for (const tl of S.tells || []) {
    if (tl.kind === 'ring') for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2; plot(Math.round(tl.x + Math.cos(a) * tl.r), Math.round((tl.y ?? GROUND - 1) + Math.sin(a) * tl.r * 0.25), tl.c || 0xff4060ff); }
    else if (tl.kind === 'line') { line1(Math.round(tl.x0), Math.round(tl.y0), Math.round(tl.x1), Math.round(tl.y1), SC.goldD); for (let k = -1; k <= 1; k++) plot(Math.round(tl.x1) + k, Math.round(tl.y1), SC.goldL); }
    else if (tl.kind === 'mark') for (let k = -6; k <= 6; k++) plot(Math.round(tl.x) + k, GROUND - 1, k % 2 ? 0xff3030ff : 0xffffffff);
    else if (tl.kind === 'laser') { line1(Math.round(tl.x0), Math.round(tl.y0), Math.round(tl.x1), GROUND - 1, 0xff2020ff); plot(Math.round(tl.x1), GROUND - 2, 0xffffffff); }
    else if (tl.kind === 'peal') for (let k = 0; k < 48; k++) { const a = k / 48 * Math.PI * 2; blendPlot(Math.round(tl.x + Math.cos(a) * tl.r), Math.round(tl.y + Math.sin(a) * tl.r * 0.5), 240, 220, 170, 0.6 * (1 - tl.k)); }
  }
  const P = S.prompt;
  if (P) { const k = 0.5 + 0.5 * Math.sin(t * 10); for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2; blendPlot(Math.round(P.x + Math.cos(a) * P.r), Math.round(P.y + Math.sin(a) * P.r * 0.5), 255, 220, 120, 0.5 + 0.4 * k); } }
  for (const pg of S.pages || []) { const x = Math.round(pg.x), y = Math.round(pg.y); for (let k = 0; k < 3; k++) plot(x + k, y + (Math.sin(pg.t * 4 + k) > 0 ? 0 : 1), 0xffe8f0f0); }
}
