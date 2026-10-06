import { clamp, lerp, smooth, norm, snap, lerpA, segDist, smoothDamp } from './core/math.js';
import { C, eShade } from './core/color.js';
import { rng } from './core/rng.js';
import { WEAPONS } from './sim/weapons/defs.js';
import { KINDS, LIFTABLE, TOSS, FLOOR_BREAK, PUSH_BREAK } from './sim/objects/kinds.js';
import { EPAL, BUILD, LOOK, ROLE, ZROLES, AROLES, AMIX, ETYPE } from './sim/enemies/roster.js';
import { DIFFS } from './core/difficulty.js';
import { PAL } from './assets/palettes/base.js';
import { mod, IDLE, GUARD, SQUAT, RISE, SITUP, PUSHUP, GU_T, fitPose, getupPose, K, AIR, teeterPose } from './sim/hero/poses.js';
import { CLIMB, MOVES, keyAt, TRN, DASH, STOP } from './sim/hero/moves.js';
import { initRaster, pickArt, plot, plotV, disc, seg, line1, withView } from './render2d/raster.js';
import { bus } from './core/events.js';
import { gameAudio } from './audio/game.js';
import { playPanels } from './cutscene/panels.js';
import { playDialog } from './cutscene/dialog.js';
import * as P9 from './levels/pier9.js';

(() => {
  'use strict';
  // ---- test harness (migration step 0): ?seed=N makes the sim's random numbers (simRand) repeat; ?fixed steps the clock by exactly 1/60 s a frame;
  // ?autotest=demo|boss&frames=N runs N frames headless (fixed clock, seed 1 unless given) and puts hashes of the game state
  // and of the 2D frame in the page title and in window.__autotest. A refactor that keeps both hashes changed nothing.
  const QS = new URLSearchParams(location.search), AUTOTEST = QS.get('autotest'), MANUAL = QS.has('manual'), FIXED = QS.has('fixed') || !!AUTOTEST || MANUAL;
  // ?manual: no requestAnimationFrame; a test drives the clock with window.__step(n) (1/60 s per frame) and reads window.__peek() (background tabs get no rAF)
  const SEED = QS.has('seed') ? +QS.get('seed') >>> 0 : AUTOTEST ? 1 : null;
  // the simulation's own random numbers (never Math.random: three.js and the audio use that, and must not shift the sim's sequence)
  const simRand = SEED != null ? rng(SEED) : Math.random;   // (mulberry32: the same seed gives the same run)
  // the event bus (core/events.js, docs/architecture.md 2.5): the sim emits, synchronously; UI, audio and lessons listen.
  // Listeners outside the sim must not change sim state (the autotest hashes stay the same with or without them).
  const emit = bus.emit;
  const W = 2800, H = 320, GROUND = 280;      // world size and ground line, in world pixels
  // canvas: 640 px wide (25% zoom shows world pixels 1:1, 100% shows 160 px at 4x); its height follows the stage's shape; world scale 22 px = 1 m
  const CW = 640, CHMAX = 480;
  let CH = 192;
  const DT = 1 / 120, G = 196, DAMP = 0.998, ITER = 14, BOUNCE = 0.3, FRIC = 0.9;
  const PX_PER_M = 22, WALK = 64, RUN = 128;   // a brisk walk; the run is twice that   // 22 px = 1 m: the hero is 1.9 m, a storey 3 m, a door 2.2 m
  // hero jump: floaty rise while the button is held, a sharp cut when released, a heavy fall
  const HI_JUMP = { t0: 0.09, t1: 0.3, v: 118, cap: 60 };   // a held jump: from t0 to t1 s after take-off the rise holds v, up to cap px (a tap rises ~30 px)
  // a real jump (22 px = 1 m): a standing jump lifts the body about 0.7 m; gravity a little over 1 g so it does not float.
  // Anything higher is reached the way a person does it: jump, grab the edge, pull up (CLIMB)
  const JUMP_V = 92, DOUBLE_V = 100, G_UP = 280, G_CUT = 900, G_FALL = 330, MAX_AIR = 16, SUPER_V = 176;
  // the mattress pile (a trampoline in the physics): every bounce is stronger than the landing that made it, up to a cap; holding jump adds a kick
  const TRAMP_GAIN = 1.12, TRAMP_ADD = 15, TRAMP_MIN = 170, TRAMP_MAX = 330, TRAMP_HOLD = 40;
  const L = { torso: 14, neck: 6, ua: 7, fa: 6.5, th: 9, sh: 9 };

  const cv = document.getElementById('stage-canvas');
  const stage = document.getElementById('stage');
  const ctx = cv.getContext('2d');
  cv.width = CW; cv.height = CH;
  ctx.imageSmoothingEnabled = false;
  const off = document.createElement('canvas');
  off.width = CW; off.height = CHMAX;
  const octx = off.getContext('2d');
  const img = octx.createImageData(CW, CHMAX);
  const buf = new Uint32Array(img.data.buffer);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DEV = typeof location !== 'undefined' && /[?&]dev\b/.test(location.search);   // ?dev: the sandbox panel, readouts, skeleton, 12 fps, skip to boss, the drag cursor
  let jumpEnd = typeof location !== 'undefined' && /[?&]ending\b/.test(location.search);   // ?ending: start at the boss, drop him at once, and play the ending (to test it)
  if (DEV) document.body?.classList.add('dev');


  // ---------- camera and pixel helpers (all drawing takes world coordinates) ----------
  // cam: x, y = the view's top-left corner in whole world pixels; vw, vh = the view size; zoom (1 = 160 px across);
  // xf, yf = the smooth camera position; v = the smoothDamp velocities; shake = shake time left (s); kick = the directional kick (world px)
  const cam = { x: 0, y: GROUND - 60, vw: 160, vh: 96, zoom: 1, xf: 0, yf: GROUND - 60, v: { x: 0, y: 0, z: 0 }, shake: 0, kick: { x: 0, y: 0 } };
  initRaster(buf, CW, CHMAX, cam);
  // audio (src/audio/game.js): a bus listener only. It starts on the first key or pointer press; the autotest never presses one
  // (?autotest&audio unlocks it at once, to prove the hashes do not depend on it). Pan: where x sits across the view.
  gameAudio.configure({ panOf: x => (x - cam.x) / (cam.vw / 2) - 1 });
  if (!AUTOTEST) gameAudio.install(); else if (QS.has('audio')) gameAudio.unlock();   // the 2D frame draws what the camera sees (render2d/raster.js: plot, disc, seg, line1, pickArt, withView)

  // ---------- level: a long tutorial yard, left to right ----------
  // zones: 1 moving (0-520), 2 bare hands (520-900), 3 katana, 4 axe, 5 shotgun, 6 machine gun, 7 the mattress pile and the club roof (2150-2400)
  const BAG_X = -400;   // the old punching bag is parked off the map (it does not belong on a city street)
  const GROUND_S = { x0: -99, x1: W + 99, y: GROUND };
  const hy = h => GROUND - h;   // ledge top at a height above the ground
  let GOAL = { x0: 2160, x1: 2374, y: hy(170) };   // (let: Pier 9 swaps in a surface off the map, see loadLevel)
  // the level being played: the tutorial street (this file's own painter and data) or Pier 9 (src/levels/pier9.js). loadLevel() swaps
  // the level lists below in place, so every function that reads them sees the new level.
  let LV = { id: 'street', title: 'The Street', startX: 60 };
  const isP9 = () => LV.id === 'pier9';
  const KIOSK_X = GOAL.x1 - 70;   // the left wall of the rooftop kiosk: the club's side door is in it, facing the roof   // the flat roof of the club building; the club door is in the kiosk at its right end
  const PLATS = [
    { x0: 190, x1: 240, y: hy(26) },     // the sports car: a jump and a short pull-up
    { x0: 270, x1: 320, y: hy(66) },     // the bar roof (3 m): a full-stretch grab from the street, or an easy climb from the car
    { x0: 380, x1: 440, y: hy(38) },     // the scaffold deck: jump, grab, climb
    { x0: 1150, x1: 1210, y: hy(30) },
    { x0: 1440, x1: 1520, y: hy(38) },   // axe plunge from here
    { x0: 2010, x1: 2080, y: hy(40) },
    { x0: 2175, x1: 2215, y: hy(60) },
    GOAL,                                 // the club roof: the fire escape climbs to it
  ];
  const TRAMPS = [];   // (the old mattress pile is gone: a fire escape climbs to the club roof)
  // the fire escape: five flights of 17 treads (4 px deep, 2 px high) zig-zagging up the club front, with iron landings between
  const STAIR_X0 = 2224, STAIR_X1 = 2308, STEPS = [], RAIL_H = 7, END_H = 16;   // END_H: the gate rail across a landing's open end   // the guard rails are waist high: they stop a walk, a jump clears them
  for (let k = 0, y = GROUND; k < 5; k++) {
    const dir = k % 2 ? -1 : 1;
    for (let i = 0; i < 17; i++) { const x0 = dir > 0 ? STAIR_X0 + i * 4 : STAIR_X1 - (i + 1) * 4; STEPS.push({ x0, x1: x0 + 3, y: y - 2 * (i + 1), step: true, dir, k }); }
    y -= 34;
    if (k < 4) STEPS.push(dir > 0 ? { x0: STAIR_X1 - 16, x1: STAIR_X1, y, landing: true, next: -1 } : { x0: STAIR_X0, x1: STAIR_X0 + 16, y, landing: true, next: 1 });
  }
  const nearStairs = x => x > STAIR_X0 - 6 && x < STAIR_X1 + 6;
  function railTop(side, from) {   // the top of the rail at one end of the fire escape, for a jump from 'from': the landing gate at or above it
    let L = null;
    for (const s of STEPS) if (s.landing && (side > 0 ? s.x1 === STAIR_X1 : s.x0 === STAIR_X0) && s.y <= from.y + 2 && (!L || s.y > L.y)) L = s;
    return L ? L.y - END_H : from.y - RAIL_H;
  }
  const PEDESTALS = [940, 1290, 1640, 1940];   // weapon pickups 1-4 stand on these
  const SIGNS = [[40, 1], [540, 2], [915, 3], [1265, 4], [1615, 5], [1915, 6], [2160, 7]];
  const SURF = [GROUND_S, ...PLATS, ...TRAMPS];
  let ignoreS = null, ignoreT = 0;   // the ledge the fighter is dropping through
  // highest surface under x that a body of radius r at height y is still above (ledges are one-way)
  function floorBelow(x, y, r, fighter) {
    let best = GROUND_S;
    for (const s of SURF) if (s !== GROUND_S && !(fighter && s === ignoreS) && x >= s.x0 && x <= s.x1 && y + r <= s.y + 0.5 && s.y < best.y) best = s;
    if (nearStairs(x)) for (const s of STEPS) if (x >= s.x0 && x <= s.x1 && y + r <= s.y + 0.5 && s.y < best.y) best = s;
    return best;
  }
  function supportAt(x, footY) {
    for (const s of SURF) if (s !== ignoreS && x >= s.x0 - 2 && x <= s.x1 + 2 && Math.abs(s.y - (footY + 2)) < 0.8) return s;
    if (nearStairs(x)) for (const s of STEPS) if (x >= s.x0 - 0.5 && x <= s.x1 + 0.5 && Math.abs(s.y - (footY + 2)) < 0.8) return s;
    return null;
  }
  // depth lanes, from the wall out: the building; the platforms (vehicles, scaffolds, the bar, the fire escape, the club roof);
  // the fight lane (the hero, the goons, the weapons); the front (the dog, the street clutter). Both views use them:
  // the 2D view draws the lanes back to front, the 3D view puts each lane at its own depth.
  // A body takes the lane of the surface under it, so a jump onto a car roof or the stairs moves it to the platform lane.
  const LANE = { BUILD: 0, PLAT: 1, FIGHT: 2, FRONT: 3 };
  function laneOf(s, fighter) {
    if (s === GROUND_S) return fighter ? LANE.FIGHT : LANE.FRONT;
    for (const o of objs) if (o.surf === s) return o.lane ?? LANE.FRONT;   // on a crate: the crate's lane
    return LANE.PLAT;
  }
  // where a throwable is drawn: the front lane, so nothing hides it; one up on a roof stays on the roof (its own lane still decides what it touches)
  const objLane = o => !o.carried && o.lane !== LANE.PLAT && (o.pocket || LIFTABLE.has(o.kind)) ? LANE.FRONT : o.lane;
  const offPlat = (o, lane) => o.lane === LANE.PLAT && lane !== LANE.PLAT;   // an object up on a platform does not touch a fighter who is not up there
  const laneAt = (x, footY, fighter) => laneOf(floorBelow(x, footY - 0.5, 0), fighter);
  const footOf = J => { let f = -1e9; for (const p of J) f = Math.max(f, p.y); return f; };
  function laneTick() {
    // things in flight keep their lane on the way up, and take the new one as they come down (no swerve under every car)
    for (const o of objs) { const l = laneAt(o.x, o.y + o.r, false); if (o.carried) o.lane = ctl.lane ?? LANE.FIGHT; else if (o.lane == null || o.vy >= -5) o.lane = l; }   // (one in his hand goes where he goes)
    // a ragdoll lies where its pelvis lies (as bodyFloor decides), not where a dangling foot hangs
    ctl.lane = hero.act === 'climb' && ctl.climb ? laneOf(ctl.climb.s, true) : hero.mode === 'anim' && !ctl.air ? laneOf(ctl.surf, true) : hero.mode !== 'anim' ? laneAt(P[2].x, P[2].y + P[2].r, true) : laneOf(floorBelow(P[2].x, footOf(P) - 0.5, 0, true), true);
    for (const e of enemies) { const J = e.dead ? e.pts : e.J; e.lane = !J ? LANE.FIGHT : e.dead ? laneAt(J[2].x, J[2].y + 3, true) : laneAt(J[2].x, footOf(J), true); }
    for (const t of thrown) { let l = laneAt(t.x, t.y + 1, true); if (t.stuck && l === LANE.FIGHT) l = LANE.FRONT; if (t.lane == null || t.stuck || t.vy >= 0) t.lane = l; }   // a weapon lying in the street: the front lane, where nothing hides it
    for (const b of ammoBoxes) b.lane = LANE.FRONT;   // ammo and bandages: always in the front lane, where nothing hides them
    for (const b of boards) b.lane = laneAt(b.x, b.y + 1, false);   // splinters: with the crate they came from
    for (const b of eshots) b.lane = laneAt(b.x, b.y + 1, true);
  }
  // the climb: both hands on the ledge (a 2-bone IK from the shoulder, elbows out away from the wall), held while he pulls up and
  // presses over, let go as he stands
  function climbArms(joints) {
    const C = ctl.climb, f = ctl.face, t = hero.actT, end = CLIMB.hang + CLIMB.up + CLIMB.over, w = 1 - smooth(clamp((t - (end - CLIMB.over * 0.35)) / (CLIMB.over * 0.35), 0, 1));
    if (w <= 0) return;
    const sh = joints[1], grip = smooth(clamp(t / 0.06, 0, 1));   // the hands reach the edge in the first frames
    for (const [ei, hi, off] of [[3, 4, 3.2], [5, 6, 1.0]]) {
      const tx = C.ex + f * off, ty = C.s.y - 0.6, a = L.ua, b = L.fa;
      let dx = tx - sh[0], dy = ty - sh[1], d = Math.hypot(dx, dy) || 1e-6;
      const dd = clamp(d, 0.5, a + b - 0.05), k = dd / d; dx *= k; dy *= k;
      const base = Math.atan2(dy, dx), A = Math.acos(clamp((a * a + dd * dd - b * b) / (2 * a * dd), -1, 1));
      const c1 = [sh[0] + Math.cos(base - A) * a, sh[1] + Math.sin(base - A) * a], c2 = [sh[0] + Math.cos(base + A) * a, sh[1] + Math.sin(base + A) * a];
      const el = (c1[0] - sh[0]) * f < (c2[0] - sh[0]) * f ? c1 : c2;   // the elbow away from the wall
      const hand = [sh[0] + dx, sh[1] + dy], e = w * grip;
      joints[ei] = [lerp(joints[ei][0], el[0], e), lerp(joints[ei][1], el[1], e)];
      joints[hi] = [lerp(joints[hi][0], hand[0], e), lerp(joints[hi][1], hand[1], e)];
    }
  }
  // a ragdoll part rests on a ledge only when the pelvis is up there too: no head caught on a car roof with the body hanging below
  function bodyFloor(x, y, r, py) {
    let best = GROUND_S;
    for (const s of SURF) if (s !== GROUND_S && py <= s.y + 2 && x >= s.x0 && x <= s.x1 && y + r <= s.y + 0.5 && s.y < best.y) best = s;
    if (nearStairs(x)) for (const s of STEPS) if (py <= s.y + 2 && x >= s.x0 && x <= s.x1 && y + r <= s.y + 0.5 && s.y < best.y) best = s;
    return best;
  }
  // walking on the stairs: step up onto a tread just ahead, step down onto one just below instead of falling
  function stairStep(x, feet, up, mv) {   // mv: the way he walks; a tread is climbed only in the direction its flight rises (not from under it)
    let best = null;
    for (const s of STEPS) if (x >= s.x0 - 0.5 && x <= s.x1 + 0.5 && (up ? s.y < feet - 0.4 && s.y >= feet - 5.5 && (!s.step || !mv || s.dir === mv) : s.y > feet + 0.4 && s.y <= feet + 6) && (!best || (up ? s.y > best.y : s.y < best.y))) best = s;
    if (!up && !best && feet >= GROUND - 6 && feet < GROUND) best = GROUND_S;
    if (!up && !best && GOAL && x >= GOAL.x0 && x <= GOAL.x1 && GOAL.y > feet + 0.4 && GOAL.y <= feet + 6) best = GOAL;
    return best;
  }

  // old-town street: lamps, cobbles and puddles
  const LAMPS = [96, 350, 560, 790, 1010, 1310, 1580, 1860, 1990, 2140, 2400];   // none stands in a parked vehicle
  const WINL = [];   // lit ground-floor windows and door lanterns: [x, y, radius], they light the street in lightPass
  const FEAT = [];   // facade parts that stand out of the wall in 3D: cornices, fascias, awnings, pilasters, door steps, lanterns (2D: just paint)
  const VPARTS = [];   // the 3D shape of the street props: car wheels and cabins, scaffold decks (2D: just paint)
  const HOUSEWIN = [];   // lit house windows: people move behind them, and they switch the light off when a fight starts outside
  const DOORS = [], ALLEYS = [], CARDOORS = [];   // where goons come from: facade doors (x, x0, x1, y0), alley gaps between the houses, parked-car doors
  const CLUB_DOORS = [2512, 2793];   // dark staff doorways in the club's back wall: past the speaker stack at the entrance, and behind the far stack
  const CLUB_X = 2436, DOOR_X = 2446, STREET_END = 2414;   // the street ends at a wall; the boss waits in the club behind it
  const NEON_P = C('#ff3fa4'), NEON_C = C('#3ff0ff'), NEON_V = C('#b45cff'), NEON_Y = C('#ffe14f'), SPARK = C('#fff8f0');
  const LAMP_IRON = C('#2b2a36'), LAMP_GLASS = C('#ffd77a'), WIN_A = C('#f2bf55'), WIN_B = C('#d9913a'), WIN_C = C('#ffe3a0');
  const FWIN_A = C('#b8893c'), FWIN_B = C('#9a6428'), FWIN_C = C('#c4a060');   // far-city windows: one step darker than the near ones
  const EMIT = new Set([LAMP_GLASS, WIN_A, WIN_B, WIN_C, FWIN_A, FWIN_B, FWIN_C, NEON_P, NEON_C, NEON_V, NEON_Y, SPARK]);   // these glow: the lighting pass leaves them bright
  const STREET = 14;   // rows of wet street below the curb that reflect the scene
  const PUDDLE = (() => {   // puddle mask over the street band: flat ellipses, wider at the back row
    const m = new Uint8Array((STREET + 1) * W), r = rng(23);
    for (let x = 30; x < W - 30; x += 50 + Math.floor(r() * 90)) {
      const w = 12 + Math.floor(r() * 30), d0 = 1 + Math.floor(r() * 3), dh = 3 + Math.floor(r() * 5);
      for (let d = d0; d < Math.min(STREET, d0 + dh); d++) {
        const k = (d - d0 + 0.5) / dh, half = w / 2 * Math.sqrt(1 - (2 * k - 1) ** 2) * (0.8 + 0.4 * k);
        for (let xx = Math.round(x - half); xx <= Math.round(x + half); xx++) if (xx >= 0 && xx < W) m[d * W + xx] = 1;
      }
    }
    return m;
  })();

  // static world layer: street, facades, vehicles, lamps, the mattress pile (0 = see-through)
  const PROPS = new Uint8Array(W * H);   // pixels of solid street props (vehicles, scaffold, balcony, lamps) that blood sticks to
  let STAT_BG = null;   // the street before the props were drawn on it: the 3D view's wall behind a lamp post or a vehicle
  const stat = (() => {
    const b = new Uint32Array(W * H);
    const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) b[y * W + x] = c; };
    const r = rng(7);
    // wet cobblestone street: a shiny curb line, rows of cobbles (shrinking toward the back), puddles, then the foundation
    const curb = C('#8e8ca0'), cob = [C('#5a5868'), C('#535161'), C('#4d4b5b')], mortar = C('#2c2b38'), found = C('#1f1e29'), foundL = C('#282736'), pud = C('#26304a');
    for (let x = 0; x < W; x++) {
      put(x, GROUND, curb);
      for (let y = GROUND + 1; y < H; y++) {
        const d = y - GROUND;
        if (d <= STREET) {
          const rowH = d < 4 ? 2 : d < 9 ? 3 : 4, row = d < 4 ? Math.floor((d - 1) / 2) : d < 9 ? 2 + Math.floor((d - 4) / 3) : 4 + Math.floor((d - 9) / 4);
          const top = d < 4 ? 1 + row * 2 : d < 9 ? 4 + (row - 2) * 3 : 9 + (row - 4) * 4, cw = 3 + rowH, off = (row * 3) % cw;
          const edge = d === top || (x + off) % cw === 0;
          put(x, y, PUDDLE[d * W + x] ? pud : edge ? mortar : cob[(Math.floor((x + off) / cw) * 7 + row * 3) % 3]);
        } else put(x, y, (x + (y >> 2) * 5) % 9 === 0 || y % 4 === 0 ? found : foundL);
      }
    }
    // street-name plates: small brass plates screwed to the walls at the start of some blocks (no numbers: the street tells its own way)
    const brass = C('#a8863a'), brassL = C('#d4b060'), brassD = C('#6a5020');
    for (const [sx] of SIGNS.slice(1, 6)) {
      for (let y = GROUND - 73; y <= GROUND - 66; y++) for (let x = sx - 8; x <= sx + 8; x++)
        put(x, y, y === GROUND - 73 || y === GROUND - 66 || x === sx - 8 || x === sx + 8 ? PAL.out : y === GROUND - 72 || x === sx - 7 ? brassL : y === GROUND - 67 || x === sx + 7 ? brassD : (y === GROUND - 70 || y === GROUND - 68) && (x - sx + 6) % 3 !== 2 && Math.abs(x - sx) < 6 ? brassD : brass);
    }
    // weapon pickups 1-4 lie on iron park benches with green slats
    const slat = C('#3e5a3a'), slatD = C('#2a3e28');
    for (const px_ of PEDESTALS) {
      for (const lx of [px_ - 5, px_ + 5]) for (let y = GROUND - 5; y < GROUND; y++) { put(lx, y, PAL.out); put(lx + 1, y, LAMP_IRON); }
      for (let x = px_ - 8; x <= px_ + 8; x++) { put(x, GROUND - 7, PAL.out); put(x, GROUND - 6, slat); put(x, GROUND - 5, (x - px_) % 6 === 0 ? PAL.out : slatD); put(x, GROUND - 4, PAL.out); put(x, GROUND - 3, slat); put(x, GROUND - 2, PAL.out); }
    }

    // bag stand
    const px = BAG_X + 13, beamY = GROUND - 52;
    for (let y = beamY; y < GROUND; y++) { put(px, y, PAL.out); put(px + 1, y, PAL.wood); put(px + 2, y, PAL.woodD); put(px + 3, y, PAL.out); }
    for (let x = BAG_X - 3; x <= px + 3; x++) { put(x, beamY, PAL.out); put(x, beamY + 1, PAL.wood); put(x, beamY + 2, PAL.woodD); put(x, beamY + 3, PAL.out); }
    put(BAG_X - 3, beamY + 1, PAL.out); put(BAG_X - 3, beamY + 2, PAL.out);
    for (let x = px - 3; x <= px + 6; x++) { put(x, GROUND - 1, PAL.woodD); put(x, GROUND - 2, PAL.out); }
    // full-size town houses close behind the street at 22 px = 1 m: 3 m storeys (3.6 m ground floor), 2.2 m doors; the street has no gaps
    const stL = C('#9a98aa'), st = C('#6d6a7c'), stD = C('#4a4757');
    const mix = (a, c, k) => (255 << 24 | Math.round((a >> 16 & 255) * (1 - k) + (c >> 16 & 255) * k) << 16 | Math.round((a >> 8 & 255) * (1 - k) + (c >> 8 & 255) * k) << 8 | Math.round((a & 255) * (1 - k) + (c & 255) * k)) >>> 0;
    // x0, x1, storeys, ground floor: 0 = a town house with an arched door, 1 = a shop front with a lit window and an awning
    const FACADES = [[4, 156, 2, 1], [166, 350, 3, 0], [360, 462, 2, 1], [472, 640, 3, 0], [650, 812, 2, 1], [822, 1000, 3, 0], [1010, 1114, 2, 1], [1124, 1238, 3, 0],
      [1250, 1400, 2, 1], [1410, 1550, 3, 0], [1562, 1722, 2, 1], [1732, 1862, 3, 0], [1872, 1972, 2, 1], [1982, 2108, 3, 0], [2156, 2384, 3, 0]];
    const CLUB_F = FACADES.length - 1;   // the last facade is the club building: a flat roof (the GOAL) over three storeys
    const WALLS = [[C('#6a6172'), C('#4f4858')], [C('#5e4852'), C('#57434c')], [C('#6e6874'), C('#55505d')]];
    const sillC = C('#8a8496'), slate = C('#2c2d3d'), slateL = C('#3a3b4e'), winD = C('#1d1c2a'), doorC = C('#3b2a22'), doorD = C('#2a1d18'), shut = C('#2f3a33');
    const FASC = [C('#2a3a5a'), C('#4a1e2a'), C('#1e4a3a'), C('#4a3a1e')], AWN = [[C('#a01c2c'), C('#d8d0c4')], [C('#1e4a3a'), C('#d8d0c4')], [C('#2a3a5a'), C('#c8c0b4')]];
    const fm = new Uint8Array(W * H);   // pixels that belong to a facade
    const rb = rng(41), emp = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (!b[y * W + x] || fm[y * W + x]);
    const putE = (x, y, c) => { if (emp(x, y)) { put(x, y, c); fm[y * W + x] = 1; } };
    const spill = (x0, x1, y0, c) => {   // warm light from a lit window falls on the wall under the sill and on the kerb
      for (let dy = 1; dy <= 7; dy++) for (let x = x0 - dy; x <= x1 + dy; x++) { const i = (y0 + dy) * W + x; if (fm[i] && ((x + dy * 3) % 3 !== 0 || dy < 3)) putE(x, y0 + dy, mix(b[i], c, 0.42 * (1 - dy / 8))); }
      if (y0 > GROUND - 60) for (let x = x0 - 4; x <= x1 + 4; x++) { put(x, GROUND, mix(b[GROUND * W + x], c, 0.45)); for (let d = 1; d <= 3; d++) if ((x + d) % 2) put(x, GROUND + d, mix(b[(GROUND + d) * W + x], c, 0.25 - d * 0.06)); }
    };
    for (let i = 0; i + 1 < FACADES.length; i++) ALLEYS.push({ x: Math.round((FACADES[i][1] + FACADES[i + 1][0]) / 2) });
    FACADES.forEach(([fx0, fx1, floors, shop], fi) => {
      const clubB = fi === CLUB_F, GF = clubB ? 62 : 80, FH = clubB ? 54 : 66, top = GROUND - GF - (floors - 1) * FH, [wa, wb] = WALLS[fi % 3], brickWall = fi % 3 === 1;
      for (let y = top; y < GROUND; y++) for (let x = fx0; x <= fx1; x++) {
        const edge = x === fx0 || x === fx1, pil = x - fx0 < 4 || fx1 - x < 4, row = Math.floor((y - top) / 3);
        const brow = Math.floor((y - top) / 8), plinth = y > GROUND - 9;
        const c = edge ? PAL.out : pil ? ((y >> 2) % 2 ? sillC : stD) : plinth ? (y === GROUND - 8 ? sillC : (x + 3 * (y % 2)) % 10 === 0 ? PAL.out : stD)
          : brickWall ? ((y - top) % 3 === 0 || (x + (row % 2) * 4) % 8 === 0 ? stD : (x * 7 + row) % 3 ? wa : wb)
          : (y - top) % 8 === 7 || (x - fx0 + (brow % 2) * 10) % 20 === 0 ? wb : (x * 13 + y * 7) % 17 === 0 ? wb : wa;   // dressed stone blocks
        putE(x, y, c);
      }
      // string courses between floors and a heavy cornice under the roof
      for (let f = 1; f < floors; f++) { const y = GROUND - GF - (f - 1) * FH; for (let x = fx0 - 1; x <= fx1 + 1; x++) { putE(x, y, sillC); putE(x, y + 1, stD); } }
      for (let k = 0; k < 4; k++) for (let x = fx0 - 3 + (k > 1 ? 1 : 0); x <= fx1 + 3 - (k > 1 ? 1 : 0); x++) putE(x, top - 1 - k, k === 3 ? PAL.out : k === 0 ? stD : sillC);
      FEAT.push({ x0: fx0 - 3, x1: fx1 + 3, y0: top - 4, y1: top - 1, d: 4 }, { x0: fx0, x1: fx0 + 3, y0: top, y1: GROUND - 1, d: 1.5 }, { x0: fx1 - 3, x1: fx1, y0: top, y1: GROUND - 1, d: 1.5 });   // the cornice, the corner pilasters
      // steep slate roof with a dormer and chimneys (the club building has a flat roof instead)
      const rh = 24, w = fx1 - fx0;
      if (!clubB) {
      for (let k = 0; k < rh; k++) { const inset = Math.round(k * 0.55 * Math.min(1, 60 / w) + k * 0.25); for (let x = fx0 + inset; x <= fx1 - inset; x++) putE(x, top - 5 - k, x === fx0 + inset || x === fx1 - inset || k === rh - 1 ? PAL.out : k % 4 === 0 ? slateL : slate); }
      for (const cx of [fx0 + 10 + Math.floor(rb() * 10), fx1 - 14 - Math.floor(rb() * 10)]) for (let y = top - 5 - rh - 6; y < top - 5 - rh + 8; y++) for (let x = cx; x < cx + 5; x++) putE(x, y, x === cx || x === cx + 4 || y === top - 5 - rh - 6 ? PAL.out : brickWall ? wa : stD);
      const dx0 = Math.round((fx0 + fx1) / 2) - 5, dlit = rb() < 0.4;
      for (let y = top - 20; y < top - 5; y++) for (let x = dx0; x < dx0 + 11; x++) putE(x, y, x === dx0 || x === dx0 + 10 || y === top - 20 ? PAL.out : x > dx0 + 2 && x < dx0 + 8 && y > top - 17 && y < top - 7 ? (dlit ? WIN_B : winD) : stD);
      }
      // windows: tall arched ones in each bay, some lit, with shutters and a stone sill
      const bays = Math.max(2, Math.floor((w - 8) / 30)), bw = (w - 8) / bays;
      for (let f = 0; f < floors; f++) {
        const fy = GROUND - GF - (f - 1) * FH;   // floor line under this storey (ground floor: the street)
        if (f === 0 && shop) {   // a shop front: fascia board with a lamp strip, striped awning, a big display window, a glazed door at the right
          const lit = rb() < 0.7, fasc = FASC[fi % 4], [aw1, aw2] = AWN[fi % 3], d0 = fx1 - 30, d1 = fx1 - 9, wx0 = fx0 + 7, wx1 = d0 - 5, wy0 = GROUND - 44, wy1 = GROUND - 10;
          for (let y = GROUND - 60; y <= GROUND - 48; y++) for (let x = fx0 + 3; x <= fx1 - 3; x++) putE(x, y, y === GROUND - 60 || y === GROUND - 48 || x === fx0 + 3 || x === fx1 - 3 ? PAL.out : fasc);
          for (let x = fx0 + 9; x <= fx1 - 9; x++) if (x % 7 < 4) putE(x, GROUND - 54, lit ? WIN_C : C('#6a6050'));   // the name board glows
          for (let k = 0; k < 5; k++) for (let x = wx0 - 3 - k; x <= wx1 + 3; x++) putE(x, GROUND - 47 + k, k === 4 ? PAL.out : Math.floor((x - fx0) / 5) % 2 ? aw2 : aw1);
          FEAT.push({ x0: fx0 + 3, x1: fx1 - 3, y0: GROUND - 60, y1: GROUND - 48, d: 2 }, { x0: wx0 - 7, x1: wx1 + 3, y0: GROUND - 47, y1: GROUND - 43, awn: 11, col: (x, k) => k === 4 ? PAL.out : Math.floor((x - fx0) / 5) % 2 ? aw2 : aw1, xs: k => wx0 - 3 - k });   // the fascia, the awning
          for (let y = wy0 - 1; y <= wy1 + 1; y++) for (let x = wx0 - 1; x <= wx1 + 1; x++) {
            const frame = x === wx0 - 1 || x === wx1 + 1 || y === wy0 - 1 || y === wy1 + 1 || (x - wx0) % 14 === 13 || y === wy0 + 9;
            putE(x, y, frame ? PAL.out : !lit ? winD : y > wy1 - 9 ? ((x + y) % 5 === 0 ? PAL.out : WIN_B) : (x * 3 + y) % 11 === 0 ? WIN_B : WIN_A);   // shelves in the lower pane
          }
          for (let x = wx0 - 2; x <= wx1 + 2; x++) putE(x, wy1 + 2, sillC);
          for (let y = GROUND - 46; y < GROUND; y++) for (let x = d0; x <= d1; x++) putE(x, y, x === d0 || x === d1 || y === GROUND - 46 ? PAL.out : y < GROUND - 26 && x > d0 + 2 && x < d1 - 2 && y > GROUND - 43 ? (lit ? WIN_B : winD) : (x + y) % 5 === 0 ? doorD : doorC);
          putE(d0 + 4, GROUND - 22, C('#c9a24a'));
          if (lit) { spill(wx0, wx1, wy1 + 2, WIN_A); spill(d0, d1, GROUND - 28, WIN_B); WINL.push([(wx0 + wx1) / 2, wy1 - 6, (wx1 - wx0) / 2 + 16]); }
          DOORS.push({ x: (d0 + d1) / 2, x0: d0 + 1, x1: d1 - 1, y0: GROUND - 45 });
          if (lit) HOUSEWIN.push({ x0: wx0, x1: wx1, y0: wy0, y1: wy1, cx: (wx0 + wx1) / 2, who: rb() < 0.6 ? 1 : 0, ph: rb() * 6.3, delay: 0.8 + rb() * 2.2, off: false, t: 0, wl: WINL[WINL.length - 1], wr: (wx1 - wx0) / 2 + 16, keep: rb() < 0.34, peek: false });   // the shop: a shopkeeper, and the lights go off too
          continue;
        }
        const bayX = k => Math.round(fx0 + 4 + bw * (k + 0.5)), underStairs = k => bayX(k) > STAIR_X0 - 14 && bayX(k) < STAIR_X1 + 14;
        let doorK = Math.floor(bays / 2);   // the front door goes in the middle bay, or the nearest bay clear of the fire escape
        if (underStairs(doorK)) { let best = -1; for (let k = 0; k < bays; k++) if (!underStairs(k) && (best < 0 || Math.abs(k - doorK) < Math.abs(best - doorK))) best = k; if (best >= 0) doorK = best; }
        for (let k = 0; k < bays; k++) {
          const cx = bayX(k);
          if (f === 0 && k === doorK) {   // the front door: an arched oak door, 2.2 m, with a fanlight and two steps
            for (let y = GROUND - 48; y < GROUND; y++) for (let x = cx - 10; x <= cx + 10; x++) {
              const arch = y < GROUND - 38 && Math.abs(x - cx) > Math.sqrt(Math.max(0, 100 - (y - (GROUND - 38)) ** 2 * 1.0));
              if (arch) continue;
              putE(x, y, Math.abs(x - cx) === 10 || y === GROUND - 48 || y === GROUND - 38 ? PAL.out : y < GROUND - 38 ? (Math.abs(x - cx) % 4 === 0 ? PAL.out : winD) : x === cx ? PAL.out : (x + y) % 5 === 0 ? doorD : doorC);
            }
            for (let x = cx - 12; x <= cx + 12; x++) { putE(x, GROUND - 2, stD); putE(x, GROUND - 1, stD); putE(x, GROUND - 3, sillC); }
            FEAT.push({ x0: cx - 12, x1: cx + 12, y0: GROUND - 3, y1: GROUND - 1, d: 5 }, { x0: cx - 4, x1: cx + 4, y0: GROUND - 56, y1: GROUND - 51, d: 3 });   // the door step, the lantern
            putE(cx + 3, GROUND - 22, C('#c9a24a')); putE(cx - 3, GROUND - 22, C('#c9a24a'));
            for (let x = cx - 4; x <= cx + 4; x++) for (let y = GROUND - 56; y < GROUND - 50; y++) putE(x, y, Math.abs(x - cx) === 4 || y === GROUND - 56 ? PAL.out : LAMP_GLASS);   // a lantern over the door
            WINL.push([cx, GROUND - 44, 20]);
            DOORS.push({ x: cx, x0: cx - 9, x1: cx + 9, y0: GROUND - 37 });
            continue;
          }
          const ww = f === 0 ? 16 : 12, wh = f === 0 ? 30 : 28, wy = f === 0 ? GROUND - 48 : fy - FH + 16;
          const lit = rb() < (f === 0 ? 0.5 : 0.3), c = lit ? (rb() < 0.6 ? WIN_A : WIN_B) : winD, x0 = cx - Math.floor(ww / 2);
          for (let y = wy - 2; y <= wy + wh + 1; y++) for (let x = x0 - 1; x <= x0 + ww; x++) {
            const ry = y - (wy + 3), arch = ry < 0 && Math.abs(x + 0.5 - cx) > Math.sqrt(Math.max(0, (ww / 2 + 1) ** 2 - ry * ry * 2.2));
            if (arch) continue;
            const frame = x === x0 - 1 || x === x0 + ww || y === wy + wh + 1 || (ry < 0 && Math.abs(x + 0.5 - cx) > Math.sqrt(Math.max(0, (ww / 2) ** 2 - ry * ry * 2.2)) - 1);
            const curtain = lit && f === 0 && (Math.abs(x + 0.5 - cx) > ww / 2 - 3 || y > wy + wh - 6);   // half curtains and a dark sill line in the lit rooms
            putE(x, y, frame ? PAL.out : x === cx || y === wy + Math.floor(wh / 2) || (f > 0 && y === wy + 6) ? PAL.out : curtain ? WIN_B : c);
          }
          for (let x = x0 - 2; x <= x0 + ww + 1; x++) putE(x, wy + wh + 2, sillC);
          if (f > 0) for (const sx of [x0 - 5, x0 + ww + 2]) for (let y = wy; y <= wy + wh; y++) for (let x = sx; x < sx + 3; x++) putE(x, y, x === sx || x === sx + 2 ? PAL.out : y % 4 === 0 ? PAL.out : shut);
          if (lit && f === 0) { spill(x0, x0 + ww, wy + wh + 2, c); WINL.push([cx, wy + wh / 2, 22]); }
          if (lit) HOUSEWIN.push({ x0, x1: x0 + ww - 1, y0: wy - 3, y1: wy + wh, cx, who: rb() < 0.7 ? 1 + Math.floor(rb() * 3) : 0, ph: rb() * 6.3, delay: 0.8 + rb() * 2.2, off: false, t: 0, wl: f === 0 ? WINL[WINL.length - 1] : null, keep: rb() < 0.34, peek: false });
        }
      }
    });
    // the street ends at a blind brick wall up to the roofs
    for (let y = 30; y < GROUND; y++) for (let x = 2385; x < CLUB_X; x++) putE(x, y, x === 2385 || y === 30 ? PAL.out : (y % 4 === 0 || (x + (Math.floor(y / 4) % 2) * 4) % 8 === 0) ? C('#2a2230') : C('#3a2f3c'));
    // rooftop: the club's stair kiosk (3.2 m) with a wide neon-framed double door (2.2 m), a marquee canopy, the steel masts of the big sign, a red carpet and velvet rope
    const kx0 = GOAL.x1 - 70, kx1 = GOAL.x1 + 10, ky = GOAL.y - 70;
    for (let y = ky; y < GOAL.y; y++) for (let x = kx0; x <= kx1; x++) put(x, y, x === kx0 || x === kx1 || y === ky ? PAL.out : y < ky + 4 ? (y === ky + 3 ? PAL.out : C('#4a4458')) : (y % 4 === 0 || (x + (Math.floor(y / 4) % 2) * 4) % 8 === 0) ? C('#2a2230') : C('#3e3244'));
    // the door seen from the side: a lit doorway in the left wall with the door leaf swung open toward the roof
    const dy0 = GOAL.y - 48;
    for (let y = dy0; y < GOAL.y; y++) {
      put(kx0, y, y === dy0 ? NEON_C : NEON_C); put(kx0 + 1, y, LAMP_GLASS); put(kx0 + 2, y, WIN_B); put(kx0 + 3, y, PAL.out);   // neon jamb and the warm light of the open door
      const leaf = Math.round((y - dy0) * 0.12);   // the leaf, edge-on, opened outward
      put(kx0 - 2 - leaf, y, PAL.out); put(kx0 - 1 - leaf, y, C('#2a1424'));
      if ((y - dy0) % 12 === 6) put(kx0 - 1 - leaf, y, C('#c9a24a'));   // brass push bar
    }
    for (let y = dy0 - 2; y < dy0; y++) for (let x = kx0 - 2; x <= kx0 + 3; x++) put(x, y, PAL.out);
    // the canopy in profile: a slab sticking out over the door, bulbs along its underside, held by a tie rod
    for (let x = kx0 - 26; x <= kx0; x++) { put(x, dy0 - 7, PAL.out); put(x, dy0 - 6, NEON_P); put(x, dy0 - 5, C('#5a1a3c')); put(x, dy0 - 4, PAL.out); if ((x - kx0) % 4 === 0) put(x, dy0 - 3, NEON_Y); }
    for (let k = 0; k < 18; k++) put(kx0 - 24 + Math.round(k * 24 / 18), dy0 - 7 - Math.round((18 - k) * 0.9), C('#4a4e5c'));   // tie rod up to the wall
    for (const sx of [kx0 + 12, kx0 + 40]) for (let y = GOAL.y - 44; y < GOAL.y - 38; y++) for (let x = sx - 2; x <= sx + 2; x++) put(x, y, Math.abs(x - sx) === 2 || y === GOAL.y - 44 ? PAL.out : LAMP_GLASS);   // wall lanterns on the front
    const mast = C('#6a6e7c'), mastD = C('#4a4e5c');
    for (const lx of [2196, 2310]) for (let y = GOAL.y - 60; y < GOAL.y; y++) {   // 5-px steel lattice masts with cross braces
      put(lx - 3, y, PAL.out); put(lx + 3, y, PAL.out); put(lx - 2, y, mast); put(lx + 2, y, mast);
      const k = (GOAL.y - 1 - y) % 8; if (k < 5) { put(lx - 2 + k, y, mastD); put(lx + 2 - k, y, mastD); } else put(lx, y, C('#2a2a36'));
    }
    for (let x = 2190; x <= 2316; x++) { put(x, GOAL.y - 60, PAL.out); put(x, GOAL.y - 61, mast); }   // the cross beam the sign sits on
    for (const sx of [KIOSK_X - 46, KIOSK_X - 24]) for (let y = GOAL.y - 9; y < GOAL.y; y++) { put(sx, y, y === GOAL.y - 9 ? C('#ffe08a') : C('#c9a24a')); put(sx + 1, y, PAL.out); }
    for (let x = KIOSK_X - 45; x < KIOSK_X - 24; x++) put(x, GOAL.y - 7 + Math.round(Math.sin((x - (KIOSK_X - 45)) / 21 * Math.PI) * 2), C('#a01830'));   // velvet rope along the carpet
    // club props: speaker stacks by the door and at the back, the bar counter
    const spk = (x0) => { for (let y = GROUND - 40; y < GROUND; y++) for (let x = x0; x < x0 + 14; x++) { const cy = (y - (GROUND - 40)) % 13, r = Math.hypot(x - x0 - 6.5, cy - 6.5); put(x, y, x === x0 || x === x0 + 13 || cy === 0 ? PAL.out : r < 4.5 ? (r < 1.5 ? C('#5a5a6a') : C('#1a1a22')) : C('#2a2a33')); } };
    spk(2462); spk(2772);
    for (let y = GROUND - 20; y < GROUND; y++) for (let x = 2680; x < 2760; x++) put(x, y, y === GROUND - 20 ? C('#c8ccd8') : x === 2680 || x === 2759 || y === GROUND - 19 ? PAL.out : (x - 2680) % 10 === 0 ? C('#2c1b2e') : C('#3d2638'));
    for (let x = 2683; x < 2758; x += 6) { put(x, GROUND - 21, NEON_C); put(x + 2, GROUND - 22, NEON_Y); put(x + 2, GROUND - 21, NEON_Y); }   // glasses on the bar
    const pre = STAT_BG = b.slice();   // everything drawn from here on is a solid prop (the fire escape is drawn after the vehicles below)
    // street platforms at true scale (22 px = 1 m, the fighter is 1.9 m): cars, a van, a pickup, two scaffolds, a one-storey bar
    const glass = C('#26304a'), glassL = C('#4a5878'), chrome = C('#b8bccb'), tyre = C('#16151c'), hub = C('#8a8c99'), tail = C('#c0302a');
    const vfill = (x0, x1, y0, y1, f) => { for (let y = Math.round(y0); y < Math.round(y1); y++) for (let x = Math.round(x0); x < Math.round(x1); x++) { const c = f(x, y); if (c) putE(x, y, c); } };
    const shade = (c, k) => { const r = (c & 255) * k, g = (c >> 8 & 255) * k, bl = (c >> 16 & 255) * k; return (255 << 24 | Math.min(255, bl) << 16 | Math.min(255, g) << 8 | Math.min(255, r)) >>> 0; };
    const wheel = (cx, r) => { for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) { const d = Math.hypot(x, y); if (d <= r + 0.5) put(cx + x, GROUND - r - 1 + y, d > r - 0.7 ? PAL.out : d < r * 0.42 ? (d < r * 0.2 ? tyre : hub) : tyre); } };
    function line1s(x0, y0, x1, y1, c) { const n = Math.max(1, Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) putE(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), c); }
    // a side-view motor body facing right: rear end L, nose R, glasshouse cx0..cx1 under a roof at roofY, waist at beltY (o.box: a flat roof over the whole body behind the cab)
    function body(L, R, cx0, cx1, roofY, beltY, col, o = {}) {
      const sill = GROUND - (o.sill || 5), wr = o.wr || 7, hi = shade(col, 1.25), lo = shade(col, 0.68), ws = o.ws || 9, rs = o.rs || 7;
      const top = x => o.box && x < cx0 ? roofY + (x - L < 3 ? 3 - (x - L) : 0) : x < cx0 - rs ? beltY + (x - L < 3 ? 3 - (x - L) : 0) : x < cx0 ? roofY + (cx0 - x) * (beltY - roofY) / rs : x <= cx1 ? roofY + (Math.min(x - cx0, cx1 - x) < 2 ? 1 : 0)
        : x <= cx1 + ws ? roofY + (x - cx1) * (beltY - roofY) / ws : beltY + Math.max(0, (x - (R - 6)) * 0.6) + (o.hoodDrop || 0) * (x - cx1 - ws) / Math.max(1, R - cx1 - ws);
      const w1 = o.w1 != null ? o.w1 : L + wr + 6, w2 = o.w2 != null ? o.w2 : R - wr - 7;
      for (let x = L; x <= R; x++) {
        const t = Math.round(top(x));
        for (let y = t; y < sill; y++) {
          const arch = [w1, w2].some(wx => Math.hypot(x - wx, y - (GROUND - wr - 1)) < wr + 2.2);
          if (arch) { if ([w1, w2].some(wx => Math.hypot(x - wx, y - (GROUND - wr - 1)) > wr + 1.3)) putE(x, y, PAL.out); continue; }
          const glassZone = y > roofY + 1 && y < beltY - 1 && x > cx0 - (o.box ? 0 : rs) + (y - roofY) * (o.box ? 0 : rs) / (beltY - roofY) + 1 && x < cx1 + ws - (y - roofY) * ws / (beltY - roofY) - 1 && Math.abs(x - (o.pillar || (cx0 + cx1) / 2)) > 1;
          putE(x, y, y === t || x === L || x === R || y === sill - 1 ? PAL.out : glassZone ? ((x + y) % 7 === 0 ? glassL : glass) : y === t + 1 ? hi : y === beltY + 1 ? shade(col, 0.85) : y > sill - 4 ? lo : col);
        }
      }
      for (let x = L - 1; x <= L + 5; x++) { putE(x, sill - 3, chrome); putE(x, sill - 2, chrome); }   // bumpers
      for (let x = R - 5; x <= R + 1; x++) { putE(x, sill - 3, chrome); putE(x, sill - 2, chrome); }
      putE(R - 1, beltY + 3, LAMP_GLASS); putE(R - 2, beltY + 3, LAMP_GLASS); putE(L + 1, beltY + 3, tail);
      const dx = Math.round(o.pillar || (cx0 + cx1) / 2);
      CARDOORS.push({ x: dx + 4, x0: dx + 1, x1: dx + 8, y0: beltY + 2, y1: sill - 3, col: shade(col, 1.1) });
      for (let y = beltY + 2; y < sill - 3; y++) putE(dx, y, shade(col, 0.6));   // door shut line and handle
      putE(dx + 3, beltY + 4, chrome);
      if (o.box) {   // van: a sliding side door with its rail, a dark side panel with a stripe (the firm's livery)
        const sd = cx0 - 26; for (let y = roofY + 4; y < sill - 3; y++) { putE(sd, y, shade(col, 0.6)); putE(cx0 - 2, y, shade(col, 0.6)); }
        for (let x = sd; x < cx0 - 2; x++) putE(x, roofY + 4, shade(col, 0.6));
        for (let y = roofY + 7; y < beltY; y++) for (let x = L + 5; x < sd - 3; x++) putE(x, y, y === roofY + 7 || y === beltY - 1 || x === L + 5 || x === sd - 4 ? shade(col, 0.5) : (y - roofY - 7) % 5 === 2 ? C('#a01c2c') : shade(col, 0.72));
        putE(sd + 4, beltY + 4, chrome);
      }
      wheel(w1, wr); wheel(w2, wr);
      VPARTS.push({ x0: L - 1, x1: R + 1, beltY, cab: [cx0 - (o.box ? 0 : rs), cx1 + ws], wheels: [[w1, wr], [w2, wr]],
        car: { L, R, cx0, cx1, roofY, beltY, sill, ws, rs, box: !!o.box, col, top, pillar: dx, wheels: w1 === w2 ? [[w1, wr]] : [[w1, wr], [w2, wr]] } });   // the 3D view builds the real car from this
    }
    // sports car (1.2 m roof): long bonnet, short boot
    const sports = (q, col) => body(q.x0 - 22, q.x1 + 36, q.x0 + 4, q.x1 - 6, q.y, GROUND - 15, col, { ws: 11, rs: 9, hoodDrop: 2 });
    // saloon (1.36 m)
    const saloon = (q, col) => body(q.x0 - 24, q.x1 + 28, q.x0 + 5, q.x1 - 7, q.y, GROUND - 16, col, { ws: 10, rs: 8 });
    // panel van (1.75 m): a box with glass only in the cab and a short sloping nose
    const van = (q, col) => body(q.x0 - 2, q.x1 + 14, q.x1 - 18, q.x1 - 2, q.y, GROUND - 18, col, { ws: 10, rs: 1, w1: q.x0 + 12, w2: q.x1 + 2, pillar: q.x1 - 12, box: true });
    // pickup with a hooped canvas tilt over the bed (the tilt is the ledge), a tailgate and tie-down loops; the cab stands apart in front
    function pickup(q, col, tilt) {
      const cab0 = q.x1 + 3, cabR = q.x1 + 38, bedTop = GROUND - 22;
      body(cab0 - 2, cabR, cab0 + 2, cab0 + 14, GROUND - 37, GROUND - 19, col, { ws: 9, rs: 2, w1: cabR - 12, w2: cabR - 12, pillar: cab0 + 8 });   // one front wheel; the rear wheel sits under the bed
      vfill(q.x0 - 2, q.x1 + 1, bedTop, GROUND - 5, (x, y) => y === bedTop || x === q.x0 - 2 || x === q.x1 || y === GROUND - 6 ? PAL.out : y === bedTop + 1 ? shade(col, 1.2) : x < q.x0 + 1 ? shade(col, 0.6) : y > GROUND - 9 ? shade(col, 0.68) : col);   // the steel bed, tailgate at the rear
      for (let x = q.x0 + 4; x < q.x1 - 2; x += 10) { putE(x, bedTop + 3, chrome); putE(x + 1, bedTop + 3, chrome); putE(x, bedTop + 4, chrome); putE(x + 1, bedTop + 4, chrome); }   // tie-down loops
      vfill(q.x0 - 1, q.x1 + 1, q.y, bedTop, (x, y) => { const r = y - q.y, e = Math.min(x - q.x0 + 1, q.x1 - x); if (r < 3 && e < 3 - r) return 0; return e === 0 || y === q.y || (r < 3 && e === 3 - r) ? PAL.out : (x - q.x0) % 10 === 0 ? shade(tilt, 0.66) : r === 1 ? shade(tilt, 1.2) : (x - q.x0) % 10 === 5 && r > 3 ? shade(tilt, 0.9) : tilt; });   // canvas over hoops
      wheel(q.x0 + 14, 7); VPARTS.push({ x0: q.x0 - 3, x1: q.x1 + 1, wheels: [[q.x0 + 14, 7]], bed: { x0: q.x0 - 2, x1: q.x1, top: bedTop, tilt: q.y, col, tc: tilt, wheel: [q.x0 + 14, 7] } });
      for (let x = q.x0 - 3; x <= q.x0 + 2; x++) { putE(x, GROUND - 8, chrome); putE(x, GROUND - 7, chrome); }   // rear bumper
    }
    function scaffold(x0, x1, top) {   // construction scaffold: steel poles, cross braces, a guard rail, a plank deck
      const pole = C('#8a8e9c'), poleD = C('#5a5e6c'), plank = C('#a8784a'), plankD = C('#6e4a2c');
      const xs = []; for (let x = x0; x < x1; x += 18) xs.push(x); xs.push(x1);
      for (const px of xs) for (let y = top - 14; y < GROUND; y++) { putE(px - 1, y, PAL.out); putE(px, y, (y >> 1) % 6 ? pole : poleD); putE(px + 1, y, PAL.out); }
      for (let k = 0; k + 1 < xs.length; k++) { line1s(xs[k], top - 8, xs[k + 1], top - 8, pole); for (let lv = top + 4; lv < GROUND - 8; lv += 18) line1s(xs[k], lv, xs[k + 1], Math.min(GROUND - 2, lv + 18), poleD); }
      for (let x = x0 - 2; x <= x1 + 2; x++) { put(x, top, plank); put(x, top + 1, (x - x0) % 9 === 8 ? plankD : plank); put(x, top + 2, plankD); put(x, top - 1, PAL.out); put(x, top + 3, PAL.out); }
      for (let x = x0 - 2; x <= x1 + 2; x++) putE(x, GROUND - 1, poleD);
      VPARTS.push({ x0: x0 - 2, x1: x1 + 2, deck: top });
    }
    function bar(q) {   // a one-storey corner bar (3 m): its flat roof is the ledge; lit window with a half curtain and bottles, door, striped awning, a neon BAR sign
      const L = q.x0 - 8, R = q.x1 + 8, top = q.y;
      for (let y = top; y < GROUND; y++) for (let x = L; x <= R; x++) putE(x, y, x === L || x === R ? PAL.out : y < top + 4 ? (y === top ? stL : y === top + 3 ? PAL.out : st) : (y % 5 === 0 || (x + (Math.floor(y / 5) % 2) * 5) % 10 === 0) ? C('#3d3040') : C('#5a4450'));
      for (let y = top + 22; y < GROUND - 8; y++) for (let x = L + 5; x < L + 32; x++) {
        const fr = x === L + 5 || x === L + 31 || y === top + 22 || y === GROUND - 9 || (x - L) % 9 === 5;
        const cur = y > GROUND - 22, shelf = y === top + 30 || y === top + 36, bottle = y < top + 36 && y > top + 26 && (x - L) % 3 === 1 && y > (((x - L) * 7) % 5) + top + 27;
        putE(x, y, fr ? PAL.out : cur ? ((x + y) % 4 ? C('#7a2a3a') : C('#8a3a46')) : shelf ? C('#3b2a22') : bottle ? C('#2a4a3a') : WIN_A);
      }
      for (let y = top + 22; y < GROUND; y++) for (let x = R - 18; x < R - 6; x++) putE(x, y, x === R - 18 || x === R - 7 || y === top + 22 ? PAL.out : y < top + 34 && x > R - 16 && x < R - 9 ? WIN_B : C('#3b2a22'));
      for (let k = 0; k < 6; k++) for (let x = L - 2 - k; x <= R + 2 + k; x++) putE(x, top + 14 + k, k === 5 ? PAL.out : (Math.floor((x - L) / 4)) % 2 ? C('#d8d0c4') : C('#a01c2c'));   // awning
      const gl = { B: [[0,0,0,9],[0,0,5,0],[5,0,6,1],[6,1,6,3],[6,3,5,4],[5,4,0,4],[5,4,6,5],[6,5,6,8],[6,8,5,9],[5,9,0,9]], A: [[0,9,0,2],[0,2,3,0],[3,0,6,2],[6,2,6,9],[0,5,6,5]], R: [[0,9,0,0],[0,0,6,0],[6,0,6,4],[6,4,0,4],[2,4,6,9]] };
      ['B', 'A', 'R'].forEach((ch, i) => { for (const [a, b2, c2, d] of gl[ch]) line1s(L + 18 + i * 9 + a, top + 4 + b2 * 0.95, L + 18 + i * 9 + c2, top + 4 + d * 0.95, NEON_Y); });
      WINL.push([L + 18, GROUND - 24, 24]);
    }
    const VSPEC = [q => sports(q, C('#8a2a2c')), q => bar(q), q => scaffold(q.x0, q.x1, q.y), q => saloon(q, C('#2f5a42')), q => van(q, C('#c4b48a')),
      q => pickup(q, C('#2d3d66'), C('#6b6a4a')), q => scaffold(q.x0, q.x1, q.y)];
    PLATS.forEach((q, i) => { if (VSPEC[i]) VSPEC[i](q); });
    for (const s of PLATS) {
      if (s !== GOAL) continue;   // only the goal is a stone balcony; the rest are vehicle roofs
      for (let x = s.x0 - 1; x <= s.x1 + 1; x++) { put(x, s.y - 1, PAL.out); put(x, s.y + 4, PAL.out); }
      for (let x = s.x0; x <= s.x1; x++) {   // the roof parapet, with a red carpet to the club door
        const seam = (x - s.x0) % 12 === 11, carpet = x > KIOSK_X - 64 && x < KIOSK_X;
        put(x, s.y, carpet ? C('#b0203a') : stL); put(x, s.y + 1, carpet ? C('#7a1428') : seam ? stD : st); put(x, s.y + 2, seam ? stD : st); put(x, s.y + 3, stD);
      }
      for (let y = s.y; y <= s.y + 3; y++) { put(s.x0 - 1, y, PAL.out); put(s.x1 + 1, y, PAL.out); }
    }
    // street lamps (3.6 m): a fluted iron post, a short curved arm, a hanging glass lantern
    for (const lx of LAMPS) {
      for (let y = GROUND - 78; y < GROUND; y++) { put(lx - 1, y, PAL.out); put(lx, y, y % 9 === 4 ? C('#3e3d4a') : LAMP_IRON); put(lx + 1, y, PAL.out); }
      for (let y = GROUND - 6; y < GROUND; y++) for (let x = lx - 2; x <= lx + 2; x++) put(x, y, Math.abs(x - lx) === 2 || y === GROUND - 6 ? PAL.out : LAMP_IRON);   // base
      for (let x = lx - 2; x <= lx + 2; x++) put(x, GROUND - 60, PAL.out);   // a collar
      for (let k = 0; k <= 7; k++) { const y = GROUND - 79 - Math.round(Math.sin(k / 7 * Math.PI / 2) * 3); put(lx + k, y - 1, PAL.out); put(lx + k, y, LAMP_IRON); put(lx + k, y + 1, PAL.out); }   // the arm
      const ax = lx + 7;
      for (let y = GROUND - 81; y >= GROUND - 83; y--) { put(ax - 1, y, PAL.out); put(ax, y, LAMP_IRON); put(ax + 1, y, PAL.out); }   // the hook
      for (let y = GROUND - 80; y <= GROUND - 70; y++) for (let x = ax - 4; x <= ax + 4; x++) {   // a 10-px lantern: glass with iron ribs and a pointed foot
        const w = y > GROUND - 72 ? GROUND - 68 - y : 4;
        if (Math.abs(x - ax) > w) continue;
        put(x, y, Math.abs(x - ax) === w || y === GROUND - 80 || y === GROUND - 70 ? PAL.out : x === ax || Math.abs(x - ax) === 3 ? LAMP_IRON : LAMP_GLASS);
      }
      for (let k = 0; k < 3; k++) for (let x = ax - 3 + k; x <= ax + 3 - k; x++) put(x, GROUND - 81 - k, k === 2 ? LAMP_IRON : PAL.out);   // cap
    }
    // the fire escape: black iron, treads with a lit nosing, a stringer under each flight, hand rails, landings on posts and wall brackets
    const iron = C('#2e2e3a'), ironL = C('#8e8ea6'), rail = C('#4a4a60');
    for (const st of STEPS) {
      if (st.step) {
        for (let x = st.x0; x <= st.x1; x++) { put(x, st.y, ironL); put(x, st.y + 1, iron); }
        const sx = st.dir > 0 ? st.x0 : st.x1;
        for (let k = 0; k < 4; k++) put(sx + st.dir * k, st.y + 2 + Math.round(k * 0.5), PAL.out);   // the stringer under the tread
        for (let k = 0; k < 2; k++) put(sx + st.dir * k, st.y - RAIL_H - Math.round(k * 0.5), rail);   // the guard rail runs parallel, waist high
        if ((st.x0 - STAIR_X0) % 16 === 0) for (let y = st.y - RAIL_H + 1; y < st.y; y++) put(sx, y, rail);   // balusters
      } else {
        for (let x = st.x0 - 1; x <= st.x1 + 1; x++) { put(x, st.y, ironL); put(x, st.y + 1, iron); put(x, st.y + 2, (x & 1) ? iron : PAL.out); put(x, st.y + 3, PAL.out); put(x, st.y - RAIL_H, rail); }   // a solid grated plate
        for (let x = st.x0; x <= st.x1; x += 4) for (let y = st.y - RAIL_H + 1; y < st.y; y++) put(x, y, rail);
        { const ex = st.next < 0 ? st.x1 + 1 : st.x0 - 1; for (let y = st.y - END_H; y < st.y; y++) put(ex, y, y === st.y - END_H ? ironL : rail); for (let k = 1; k <= 2; k++) put(ex - st.next * 0 + (st.next < 0 ? -k : k), st.y - END_H, rail); }   // the gate rail on the open side
        const post = st.next < 0 ? st.x1 : st.x0;
        for (let y = st.y + 3; y < GROUND; y++) if (!b[y * W + post] || fm[y * W + post]) put(post, y, y % 6 === 0 ? PAL.out : iron);   // a post down to the street
      }
    }
    // the mattress pile under the club (the bouncy surface): two striped ticking mattresses on a wooden pallet
    const tick = C('#cfc6b0'), tickB = C('#6a7a9a'), tickD = C('#9a9280');
    for (const T of TRAMPS) {
      for (let y = T.y + 1; y < GROUND; y++) for (let x = T.x0 - 1; x <= T.x1 + 1; x++) {
        const r = y - T.y;
        put(x, y, x === T.x0 - 1 || x === T.x1 + 1 || r === 3 || r === 5 ? PAL.out : r > 3 && r < 5 ? ((x - T.x0) % 4 === 1 ? tickB : tick) : r > 4 ? ((x - T.x0) % 5 === 0 ? PAL.out : PAL.woodD) : (x - T.x0) % 4 === 1 ? tickB : r === 2 ? tickD : tick);
      }
    }
    for (let i = 0; i < b.length; i++) if (b[i] !== pre[i]) PROPS[i] = 1;
    return b;
  })();

  // parallax backdrop: a night sky with a veiled moon, then three rows of old gothic town: spires, gables, lit windows
  const SKY = ['#151729', '#1b1d35', '#23243f', '#2d2b48', '#3a3352'].map(C);
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const STARS = (() => { const r = rng(11), s = []; for (let i = 0; i < 60; i++) s.push([Math.floor(r() * 460), Math.floor(r() * 120), r() < 0.3 ? C('#b8b0c8') : C('#5d5878')]); return s; })();
  function cityLayer(seed, period, h, o) {
    const r = rng(seed), px = new Uint32Array(period * h);
    const put = (x, y, c) => { if (y >= 0 && y < h && x >= 0 && x < period) px[y * period + x] = c; };
    const fill = (x0, x1, y0, y1, c) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) put(x, y, c); };
    let x = 0;
    while (x < period - o.wMin) {
      const bw = Math.min(period - x, Math.round(o.wMin + r() * (o.wMax - o.wMin))), bh = Math.round(o.hMin + r() * (o.hMax - o.hMin)), top = h - bh, cx = x + bw / 2, kind = r();
      const body = r() < 0.5 ? o.body : o.body2;
      fill(x, x + bw, top, h, body);
      if (kind < o.spire) {   // church tower and needle spire
        const tw = Math.max(4, Math.round(bw * 0.42)), tx = Math.round(cx - tw / 2), th = Math.round(10 + r() * 18), sh = Math.round(tw * 2.2 + r() * 14);
        fill(tx, tx + tw, top - th, top, body);
        for (let k = 0; k < sh; k++) { const half = tw / 2 * (1 - k / sh); fill(Math.round(cx - half), Math.round(cx + half), top - th - k - 1, top - th - k, body); }
        put(Math.floor(cx), top - th - sh - 1, body); put(Math.floor(cx), top - th - sh - 2, body);
        if (tw >= 6) {   // a lit rose window or belfry slit
          const wy = top - th + 4;
          for (let yy = 0; yy < 4; yy++) for (let xx = -1; xx <= 1; xx++) if (Math.abs(xx) + Math.abs(yy - 1.5) < 2.6) put(Math.floor(cx) + xx, wy + yy, r() < 0.7 ? FWIN_B : FWIN_A);
        }
      } else if (kind < o.spire + 0.35) {   // steep gable
        const rh = Math.round(bw * (0.45 + r() * 0.35));
        for (let k = 0; k < rh; k++) { const half = bw / 2 * (1 - k / rh); fill(Math.round(cx - half), Math.round(cx + half), top - k - 1, top - k, body); }
      } else if (kind < o.spire + 0.6) {   // stepped gable
        const steps = 3 + Math.floor(r() * 2), sw = bw / (2 * steps + 1), shh = Math.max(2, Math.round(bw / 7));
        for (let k = 0; k < steps; k++) fill(Math.round(x + sw * (k + 1)), Math.round(x + bw - sw * (k + 1)), top - shh * (k + 1), top - shh * k, body);
      } else {   // parapet with chimneys and a little turret
        for (let n = 1 + Math.floor(r() * 2), k = 0; k < n; k++) { const chx = Math.round(x + 2 + r() * (bw - 6)), chh = 3 + Math.floor(r() * 5); fill(chx, chx + 2 + (o.ww > 1 ? 1 : 0), top - chh, top, body); }
        if (r() < 0.4 && bw > 14) { const tx = x + bw - 5; fill(tx, tx + 4, top - 6, top, body); for (let k = 0; k < 6; k++) fill(tx + Math.floor(k / 3), tx + 4 - Math.floor(k / 3), top - 7 - k, top - 6 - k, body); }
      }
      // windows: a grid, some lit (warm), the rest dark; tall pointed ones on the near row
      const mx = Math.max(2, Math.floor((bw - Math.floor((bw - 4) / o.ws) * o.ws) / 2) + 1);
      for (let wy = top + 3; wy + o.wh < h - 2; wy += o.hs) for (let wx = x + mx; wx + o.ww <= x + bw - 2; wx += o.ws) {
        const lit = r() < o.lit, c = lit ? (r() < 0.6 ? FWIN_A : r() < 0.5 ? FWIN_B : FWIN_C) : o.dark;
        fill(wx, wx + o.ww, wy, wy + o.wh, c);
        if (o.ww >= 2) put(wx + (r() < 0.5 ? 0 : o.ww - 1), wy - 1, c);   // pointed top
        if (lit && o.ww >= 2) fill(wx, wx + o.ww, wy + Math.floor(o.wh / 2), wy + Math.floor(o.wh / 2) + 1, o.dark);   // a cross bar in the frame
      }
      x += bw + (r() < 0.25 ? 2 + Math.floor(r() * 5) : 0);
    }
    for (let xx = 0; xx < period; xx++) for (let y = 0; y < h; y++) if (px[y * period + xx]) { if (!EMIT.has(px[y * period + xx])) px[y * period + xx] = o.rim; break; }   // moonlit roof edge
    return { w: period, h, px };
  }
  const LAYERS = [
    { f: 0.15, body: C('#2b2b45'), img: cityLayer(31, 700, 110, { wMin: 14, wMax: 34, hMin: 30, hMax: 66, spire: 0.3, ws: 4, hs: 5, ww: 1, wh: 2, lit: 0.08, body: C('#2b2b45'), body2: C('#2e2c47'), dark: C('#232339'), rim: C('#3d3b5c') }) },
    { f: 0.35, body: C('#212036'), img: cityLayer(57, 820, 120, { wMin: 18, wMax: 40, hMin: 24, hMax: 58, spire: 0.16, ws: 5, hs: 7, ww: 1, wh: 3, lit: 0.12, body: C('#212036'), body2: C('#24223a'), dark: C('#19182a'), rim: C('#33304d') }) },
    { f: 0.6, body: C('#181727'), img: cityLayer(83, 960, 140, { wMin: 26, wMax: 54, hMin: 26, hMax: 70, spire: 0.08, ws: 7, hs: 10, ww: 2, wh: 5, lit: 0.16, body: C('#181727'), body2: C('#1c1a2c'), dark: C('#121120'), rim: C('#2a2840') }) },
  ];
  // the club: dark panelled walls, a cyan neon strip, the NOIR sign, a disco ball, a lit dance floor
  const NOIR = [[0,0,0,10],[0,0,6,10],[6,10,6,0],[10,0,16,0],[16,0,16,10],[16,10,10,10],[10,10,10,0],[20,0,20,10],[24,0,24,10],[24,0,30,0],[30,0,30,5],[30,5,24,5],[24,5,30,10]];
  function drawClub() {
    const t = simTime, ceil = GROUND - 150;
    for (let vy = 0; vy < cam.vh; vy++) {
      const wy = vy + cam.y, row = vy * CW;
      for (let vx = 0; vx < cam.vw; vx++) {
        const wx = vx + cam.x;
        // the wall: panels above, a darker band from head height down behind the fight plane (so the fighters read against it), a dado at the bottom
        buf[row + vx] = wy < ceil ? C('#0d0913') : wy === ceil || wy === ceil + 1 ? C('#3a3a48') : wy > GROUND - 25 ? ((wx >> 3) % 2 ? C('#150e1d') : C('#181021')) : wy > GROUND - 64 ? ((wx - CLUB_X) % 24 === 0 ? C('#0f0a15') : C('#1a1225')) : (wx - CLUB_X) % 24 === 0 ? C('#160f1f') : C('#251a33');
      }
    }
    // the staff doorways in the back wall (goons and the boss come through them): dark openings with a red tube over each
    for (const dx of CLUB_DOORS) {
      for (let y = GROUND - 50; y < GROUND - 7; y++) for (let x = dx - 6; x <= dx + 5; x++) plot(x, y, x === dx - 6 || x === dx + 5 || y === GROUND - 50 ? C('#3a3a48') : y > GROUND - 14 ? C('#0a070d') : C('#07050a'));
      for (let x = dx - 4; x <= dx + 3; x++) plot(x, GROUND - 52, C('#c0302a'));
    }
    // the back dais the crowd dances on (6 px up): a cyan tube along its lip, a lit riser with footlights under it, a second tube at the ceiling line
    for (let y = GROUND - 7; y < GROUND; y++) for (let x = CLUB_X + 26; x < W; x++) plot(x, y, y === GROUND - 7 ? NEON_C : y === GROUND - 1 ? C('#2a1e36') : y === GROUND - 4 && (x - CLUB_X) % 10 === 4 ? SPARK : y === GROUND - 6 ? C('#7a6288') : C('#5c4a6c'));
    for (let y = GROUND - 7; y < GROUND; y++) plot(CLUB_X + 26, y, PAL.out);
    for (let x = CLUB_X; x < W; x++) if ((x >> 2) % 3) plot(x, ceil + 3, NEON_C);
    for (let x = CLUB_X + 20; x < W; x += 120) { for (let y = ceil + 2; y < ceil + 6; y++) for (let dx = -2; dx <= 2; dx++) plot(x + dx, y, C('#4a4a58')); plot(x, ceil + 6, SPARK); }   // spot fixtures
    const nx = 2575, ny = GROUND - 110, flick = Math.sin(t * 23) > -0.95;
    for (const [a, b2, c2, d] of NOIR) line1(nx + a, ny + b2, nx + c2, ny + d, flick ? NEON_P : C('#5a1a3c'));
    for (const [a, b2, c2, d] of [[0,0,10,0],[0,0,5,6],[10,0,5,6],[5,6,5,11],[2,11,8,11]]) line1(2700 + a, GROUND - 112 + b2, 2700 + c2, GROUND - 112 + d, NEON_C);   // cocktail glass
    plot(2706, GROUND - 110, NEON_Y);
    // disco ball on a wire, glinting
    const bx = 2620, by = ceil + 22;
    line1(bx, ceil + 2, bx, by - 6, C('#4a4a58'));
    for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) { const r = Math.hypot(x, y); if (r <= 6) plot(bx + x, by + y, r > 5.4 ? PAL.out : ((x + y + Math.floor(t * 8)) & 3) === 0 ? SPARK : (x + y) % 2 ? C('#9aa0b5') : C('#cfd3e0')); }
    for (let i = 0; i < 26; i++) {   // mirror flecks swim over the walls
      const a = i * 2.39 + t * 0.6, rr = 30 + (i * 37) % 130;
      plot(Math.round(bx + Math.cos(a) * rr * 1.6), Math.round(by + 20 + Math.sin(a) * rr * 0.5), i % 3 ? SPARK : NEON_V);
    }
  }
  function drawClubFloor() {   // dance floor tiles that light up in moving patterns
    const t = Math.floor(simTime * 4), cols = [NEON_P, NEON_C, NEON_V, NEON_Y];
    for (let d = 0; d <= STREET; d++) {
      const vy = GROUND + d - cam.y; if (vy < 0 || vy >= cam.vh) continue;
      const tr = Math.floor((d - 1) / 4), row = vy * CW;
      for (let vx = 0; vx < cam.vw; vx++) {
        const wx = vx + cam.x, tc = Math.floor((wx - CLUB_X) / 12);
        if (d === 0) { buf[row + vx] = C('#c8ccd8'); continue; }
        const edge = (d - 1) % 4 === 3 || (wx - CLUB_X) % 12 === 0, h = ((tc * 73 + tr * 151 + t * 37) ^ (tc * t)) & 7;
        buf[row + vx] = edge ? C('#0d0913') : h < 2 ? cols[(tc + tr + t) & 3] : C('#1a1424');
      }
    }
  }
  function drawBackdrop() {
    if (flags.club) {
      if (isP9()) P9.drawHall(R9); else {
      drawClub();
      drawDancers();   // the crowd at the back: bar, speakers and fighters are all in front of it
      }
      for (let vy = 0; vy < cam.vh; vy++) {
        const wy = vy + cam.y; if (wy < 0 || wy >= H) continue;
        const srow = wy * W + cam.x, row = vy * CW;
        for (let vx = 0; vx < cam.vw; vx++) { const c = GORE[srow + vx] || (wy < GROUND ? stat[srow + vx] : 0); if (c) buf[row + vx] = c; }
      }
      if (isP9()) P9.drawHallFloor(R9); else drawClubFloor();
      for (let vy = 0; vy < cam.vh; vy++) { const wy = vy + cam.y; if (wy < GROUND || wy >= H) continue; const srow = wy * W + cam.x, row = vy * CW; for (let vx = 0; vx < cam.vw; vx++) if (GORE[srow + vx]) buf[row + vx] = GORE[srow + vx]; }
      if (isP9()) P9.drawHallProps(R9, { ph: enc.boss && !enc.boss.dead ? enc.boss.ph : 0, hz: p9.tuna });
      return;
    }
    if (isP9()) P9.drawSky(R9); else drawSky();
    for (let vy = 0; vy < cam.vh; vy++) {
      const wy = vy + cam.y; if (wy < 0 || wy >= H) continue;
      const srow = wy * W + cam.x, row = vy * CW;
      for (let vx = 0; vx < cam.vw; vx++) { const c = GORE[srow + vx] || stat[srow + vx]; if (c) buf[row + vx] = c; }
    }
    if (isP9()) P9.drawFront(R9, p9.shutter);
    glassMask.fill(0);
    drawHouseWindows();
    drawGlass();
  }
  function drawSky() {   // everything far behind the street: the sky, stars, moon, clouds, the far town and its fog (view space, parallax)
    for (let vy = 0; vy < cam.vh; vy++) {
      const t = clamp((cam.y + vy) / GROUND, 0, 1) * (SKY.length - 1), i = Math.floor(t), th = (t - i) * 16;
      const c0 = SKY[i], c1 = SKY[Math.min(i + 1, SKY.length - 1)], row = vy * CW, by = ((vy + cam.y) & 3) * 4;
      for (let vx = 0; vx < cam.vw; vx++) buf[row + vx] = th > BAYER[by + ((vx + cam.x) & 3)] ? c1 : c0;
    }
    const sx = Math.round(cam.x * 0.05), sy = Math.round(cam.y * 0.05);
    if (rain.k < 0.5) for (const [x, y, c] of STARS) plotV(x - sx, y - sy, c);
    // a pale moon with a soft ring, veiled by passing cloud bands
    const mx = Math.round(250 - cam.x * 0.04), my = Math.round(30 - cam.y * 0.04), moon = C('#e6dcc4'), moonD = C('#c9bea6'), halo = C('#2f2f4e');
    for (let y = -14; y <= 14; y++) for (let x = -14; x <= 14; x++) {
      const d2 = (x + 0.5) ** 2 + (y + 0.5) ** 2;
      if (d2 <= 42) plotV(mx + x, my + y, (x - 1.5) ** 2 + (y + 1.5) ** 2 > 30 ? moonD : moon);
      else if (d2 <= 150 && (x + y + 64) % 2 === 0) plotV(mx + x, my + y, halo);
    }
    const cloud = C('#20203a'), cloud2 = C('#282742'), drift = simTime * 3;
    for (let k = 0; k < 3; k++) {
      const cy = 18 + k * 13 - Math.round(cam.y * 0.03), ox = cam.x * 0.06 + drift * (1 + k * 0.4);
      for (let vx = 0; vx < cam.vw; vx++) {
        const t = (vx + ox) * 0.03 + k * 7, th = Math.sin(t) * 2.2 + Math.sin(t * 2.7 + k) * 1.4 + 1.5;
        if (th <= 0) continue;
        for (let dy = -Math.ceil(th); dy <= Math.ceil(th * 0.6); dy++) { const vy = cy + dy; if (vy >= 0 && vy < cam.vh) buf[vy * CW + vx] = dy < -th + 1 ? cloud2 : cloud; }
      }
    }
    // each layer's own street line slides between a fixed screen line (far away) and the real ground (f = 1)
    const gRow = GROUND - cam.y, K = cam.vh * 0.66;
    for (const L_ of LAYERS) {
      const im = L_.img, ox = Math.round(cam.x * L_.f), bottom = Math.round(gRow * L_.f + K * (1 - L_.f)), top = bottom - im.h;
      for (let vy = Math.max(0, top); vy < cam.vh; vy++) {
        const row = vy * CW;
        if (vy >= bottom) { for (let vx = 0; vx < cam.vw; vx++) buf[row + vx] = L_.body; continue; }
        const irow = (vy - top) * im.w;
        for (let vx = 0; vx < cam.vw; vx++) { const c = im.px[irow + (vx + ox) % im.w]; if (c) buf[row + vx] = c; }
      }
    }
    // a thin fog band low over the far town, so the facades stand off it
    for (let vy = 0; vy < cam.vh; vy++) {
      const wy = vy + cam.y, k = wy < GROUND - 110 || wy > GROUND ? 0 : wy < GROUND - 50 ? (wy - (GROUND - 110)) / 60 : 1 - (wy - (GROUND - 50)) / 50; if (k <= 0) continue;
      const a = 0.3 * k * (1 + rain.k * 0.5), row = vy * CW, fr = 0x1b * a, fg = 0x1d * a, fb = 0x35 * a;
      for (let vx = 0; vx < cam.vw; vx++) { const c = buf[row + vx]; if (EMIT.has(c)) continue; buf[row + vx] = (255 << 24 | Math.round((c >> 16 & 255) * (1 - a) + fb) << 16 | Math.round((c >> 8 & 255) * (1 - a) + fg) << 8 | Math.round((c & 255) * (1 - a) + fr)) >>> 0; }
    }
  }
  // people reflect in the glass behind them: a faint, cool ghost, shifted a little as if seen at an angle
  const bgSnap = new Uint32Array(CW * CHMAX), GK = [1, 4, 6, 4, 1];   // binomial weights ~ a gaussian
  const refSrc = new Uint32Array(CW * CHMAX);   // the frame with the people in it, read while the glass is written
  function glassReflect() {
    const mid = cam.vw / 2;
    refSrc.set(buf);
    for (let vy = 0; vy < cam.vh; vy++) {
      const wy = vy + cam.y; if (wy < 0 || wy >= GROUND) continue;
      const row = vy * CW, srow = wy * W;
      for (let vx = 0; vx < cam.vw; vx++) {
        const i = row + vx;
        if (!glassMask[i] || refSrc[i] !== bgSnap[i]) continue;   // glass that no one stands in front of
        const off = Math.round(12 + (vx - mid) * 0.1), sx = vx - off, sy = vy + 1;
        // a soft (gaussian 5x5) sample of whatever stands in front, so the reflection reads as blurred glass
        let wr = 0, wg = 0, wb = 0, wsum = 0, cover = 0;
        for (let ky = -2; ky <= 2; ky++) for (let kx = -2; kx <= 2; kx++) {
          const qx = sx + kx, qy = sy + ky, wgt = GK[ky + 2] * GK[kx + 2];
          wsum += wgt;
          if (qx < 0 || qy < 0 || qx >= cam.vw || qy >= cam.vh) continue;
          const j = qy * CW + qx, c = refSrc[j];
          if (c === bgSnap[j]) continue;   // the scene itself: only people (and what they carry) reflect, also where they stand in front of the glass
          wr += (c & 255) * wgt; wg += (c >> 8 & 255) * wgt; wb += (c >> 16 & 255) * wgt; cover += wgt;
        }
        if (cover < wsum * 0.06) continue;   // nothing in front: plain glass
        // lighten only: where the figure is brighter than the glass (face, hands, shirt, lit edges) it shows, dimmed and cooled by the glass;
        // where it is darker (the suit) the glass stays as it is, so nothing glows
        const g = buf[i], a = 0.5 * cover / wsum, lit = (v, c, k) => Math.round(v + Math.max(0, (c * 0.7 + 8) * k - v) * a);
        const r = lit(g & 255, wr / cover, 0.82), gg = lit(g >> 8 & 255, wg / cover, 0.9), b = lit(g >> 16 & 255, wb / cover, 1.0);
        buf[i] = (255 << 24 | b << 16 | gg << 8 | r) >>> 0;
      }
    }
  }
  // glass reflects: a diagonal sheen that slides with the camera, and the warm glow of a street lamp nearby
  const GLASS_C = new Set([C('#26304a'), C('#4a5878'), C('#1d1c2a'), C('#17151f')]);
  const glassMask = new Uint8Array(CW * CHMAX);   // this frame's glass pixels (static glass, and lit windows switched off)
  function drawGlass() {
    const lamps = LAMPS.filter(lx => lx > cam.x - 60 && lx < cam.x + cam.vw + 60);
    for (let vy = 0; vy < cam.vh; vy++) {
      const wy = vy + cam.y; if (wy < 0 || wy >= GROUND) continue;
      const row = vy * CW, srow = wy * W;
      for (let vx = 0; vx < cam.vw; vx++) {
        const wx = vx + cam.x, sc = stat[srow + wx];
        if (GLASS_C.has(sc) && buf[row + vx] === sc) glassMask[row + vx] = 1;
        if (!glassMask[row + vx]) continue;
        const base = buf[row + vx];
        const band = ((wx * 0.8 + wy - cam.x * 0.35) % 34 + 34) % 34, sheen = band < 2 ? 60 : band < 4 ? 26 : 0;
        let warm = 0;
        for (const lx of lamps) { const d = Math.hypot(wx - lx - 7, (wy - (GROUND - 75)) * 0.6); if (d < 46) warm += (1 - d / 46) * 70; }
        if (!sheen && !warm) continue;
        const r = Math.min(255, (base & 255) + sheen + warm), g = Math.min(255, (base >> 8 & 255) + sheen + warm * 0.75), bl = Math.min(255, (base >> 16 & 255) + sheen * 1.1 + warm * 0.35);
        buf[row + vx] = (255 << 24 | bl << 16 | g << 8 | r) >>> 0;
      }
    }
  }
  // people at their windows: a silhouette moves behind each lit pane; a fight in the street outside (a hit, a goon's swing, a shot)
  // sends them dark. The light fades out, and fades back in a while after it is over (w.lv: 0 dark .. 1 lit; both views read it).
  let fightX = -999, fightT = -99;
  const noise = (x, loud) => { fightX = x; fightT = simTime; emit('noise', { x, loud: !!loud }); };   // the neighbours notice
  const WIN_OUT = 2.2, WIN_IN = 0.8, WIN_PEEK = 0.45;   // fade speeds (per s): off in about half a second, on in about 1.2 s; a peeker dims to 45 %
  function houseWinStep(dt) {
    const near = x => (simTime - fightT < 3.5 && Math.abs(fightX - x) < 180) || enemies.some(e => !e.dead && e.zone !== 'arena' && Math.abs(e.x - x) < 150 && Math.abs(e.x - P[2].x) < 120);
    for (const w of HOUSEWIN) {
      if (w.cx < cam.x - 200 || w.cx > cam.x + cam.vw + 200) continue;
      const lane = w.wl && Math.abs(P[2].x - w.cx) < (w.wr || 22);   // its light falls on the hero's lane: that one stays on
      const danger = !flags.club && near(w.cx) && !lane;
      if (w.keep) {   // about one in three only dims the light: a curious neighbour pulls the curtain aside to watch
        if (danger !== w.peek) { if ((w.t += dt) > (w.peek ? w.delay + 2.5 : w.delay)) { w.peek = danger; w.t = 0; } } else w.t = 0;
        continue;
      }
      if (danger !== w.off) { if ((w.t += dt) > (w.off ? w.delay + 2.5 : w.delay)) { w.off = danger; w.t = 0; } }   // a beat later the switch clicks
      else w.t = 0;
    }
    for (const w of HOUSEWIN) {   // the light fades to where the switch is; out of sight it is simply there
      const tg = w.off ? 0 : w.peek ? WIN_PEEK : 1, lv = w.lv ?? 1, far = w.cx < cam.x - 200 || w.cx > cam.x + cam.vw + 200;
      w.lv = far ? tg : tg < lv ? Math.max(tg, lv - WIN_OUT * dt) : Math.min(tg, lv + WIN_IN * dt);
      if (w.wl) w.wl[2] = (w.wr || 22) * w.lv * w.lv;   // its light on the street goes with it
    }
  }
  function drawHouseWindows() {
    const dark = C('#17151f'), sil = C('#2b1d16');
    for (const w of HOUSEWIN) {
      if (w.x1 < cam.x || w.x0 > cam.x + cam.vw || w.y1 < cam.y || w.y0 > cam.y + cam.vh) continue;
      const glass = (x, y) => EMIT.has(stat[y * W + x]);
      const lv = w.lv ?? 1, dim = c => { const m = sh => Math.round((dark >> sh & 255) + ((c >> sh & 255) - (dark >> sh & 255)) * lv); return (255 << 24 | m(16) << 16 | m(8) << 8 | m(0)) >>> 0; };
      if (lv < 1) {   // the light going (or coming back): the pane fades toward dark glass, which reflects the street once it is mostly dark
        for (let y = w.y0; y <= w.y1; y++) for (let x = w.x0; x <= w.x1; x++) if (glass(x, y)) {
          plot(x, y, dim(stat[y * W + x]));
          const vx = x - cam.x, vy = y - cam.y; if (lv < 0.4 && !w.peek && vx >= 0 && vy >= 0 && vx < cam.vw && vy < cam.vh) glassMask[vy * CW + vx] = 1;   // (a peeker's pane is a lit room, not a mirror)
        }
        if (lv < 0.5 && !w.peek) continue;   // too dark to see anyone (the peeker at the curtain still shows)
      }
      const ww = w.x1 - w.x0;
      if (w.peek) {   // the curtain pulled across half the pane, a face at its edge
        const cur = dim(C('#8a6030')), curD = dim(C('#7a5028'));   // the curtain dims with the room
        for (let y = w.y0; y <= w.y1; y++) for (let x = w.cx + 1; x <= w.x1; x++) if (glass(x, y)) plot(x, y, (x + y) % 4 ? cur : curD);
      } else if (!w.who) continue;
      // a head and shoulders behind the glass, drifting across the room now and then (the peeker stands still at the curtain's edge)
      const px = w.peek ? w.cx - 2.5 : w.cx + Math.sin(simTime * 0.35 + w.ph) * ww * 0.3, hy = w.y1 - 13 + (w.who === 3 ? 3 : 0);
      for (let y = hy - 3; y <= w.y1; y++) for (let x = w.x0; x <= w.x1; x++) {
        if (!glass(x, y)) continue;
        const head = (x + 0.5 - px) ** 2 + (y + 0.5 - hy) ** 2 <= 6.5, body = y > hy + 2 && Math.abs(x + 0.5 - px) < 3.5 + (y - hy - 2) * 0.5;
        if (head || body) plot(x, y, sil);
      }
    }
  }

  // ---------- skeleton & kinematics ----------
  // joints: 0 head, 1 neck, 2 pelvis, 3 elbowB, 4 handB, 5 elbowF, 6 handF, 7 kneeB, 8 footB, 9 kneeF, 10 footF
  // pose params: rx, ry (pelvis height), lean, head, f0x, f0y, f1x, f1y (feet: forward, lift), a0s, a0e, a1s, a1e (arm swing, elbow bend), wr (wrist turn of a held blade), yw (blade swing through depth: 0 = in the picture, pi/2 = pointing at the viewer)

  function ik(h, t, face) {
    let dx = t[0] - h[0], dy = t[1] - h[1], d = Math.hypot(dx, dy) || 1e-6;
    const a = L.th, b = L.sh, max = a + b - 0.02, min = 0.5;
    if (d > max || d < min) { const k = (d > max ? max : min) / d; t = [h[0] + dx * k, h[1] + dy * k]; dx *= k; dy *= k; d = Math.hypot(dx, dy); }
    const base = Math.atan2(dy, dx), A = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
    let k = [h[0] + Math.cos(base - A) * a, h[1] + Math.sin(base - A) * a];
    const cr = (k[0] - h[0]) * (t[1] - k[1]) - (k[1] - h[1]) * (t[0] - k[0]);
    if (cr * face < 0) k = [h[0] + Math.cos(base + A) * a, h[1] + Math.sin(base + A) * a];
    return [k, t];
  }
  // footY: world y of the foot joints when they stand on something
  function fk(q, x0, footY, face) {
    const pel = [x0 + q[0] * face, footY - q[1]];
    const lean = q[2];
    const neck = [pel[0] + Math.sin(lean) * L.torso * face, pel[1] - Math.cos(lean) * L.torso];
    const ha = lean + q[3];
    const head = [neck[0] + Math.sin(ha) * L.neck * face, neck[1] - Math.cos(ha) * L.neck];
    const arm = (s, e) => {
      const el = [neck[0] + Math.sin(s) * L.ua * face, neck[1] + Math.cos(s) * L.ua];
      return [el, [el[0] + Math.sin(s + e) * L.fa * face, el[1] + Math.cos(s + e) * L.fa]];
    };
    const [eB, hB] = arm(q[8], q[9]), [eF, hF] = arm(q[10], q[11]);
    const leg = (fx, fy) => { const x = x0 + fx * face; return ik(pel, [x, footY - fy + (fy < 1 ? footDrop(x, footY) : 0)], face); };
    const [kB, fB] = leg(q[4], q[5]), [kF, fF] = leg(q[6], q[7]);
    return [head, neck, pel, eB, hB, eF, hF, kB, fB, kF, fF];
  }

  function makeGetup(J, x0, fy, f) {   // res = what the fit misses; it fades out over the first 0.2 s so the first frame matches the body
    const down = (J[0][0] - J[2][0]) * f > 0, A = down ? PUSHUP : SITUP, q0 = fitPose(J, x0, fy, f);
    for (const i of [2, 3, 8, 9, 10, 11]) q0[i] = A[i] + wrapA(q0[i] - A[i]);
    const k = fk(q0, x0, fy, f);
    return { t: 0, q0, down, res: J.map((j, i) => [j[0] - k[i][0], j[1] - k[i][1]]) };
  }
  function getupJoints(g, x0, fy, f) {
    const k = fk(getupPose(g), x0, fy, f), r = 1 - smooth(clamp(g.t / 0.2, 0, 1));
    return k.map(([x, y], i) => [x + g.res[i][0] * r, y + g.res[i][1] * r]);
  }

  // gait: stance feet move backward at exactly body speed, so planted feet never slide
  const gaitFreq = s => s <= WALK ? lerp(0.8, 1.9, s / WALK) : lerp(1.9, 2.35, clamp((s - WALK) / (RUN - WALK), 0, 1));   // strides stay within the leg's reach
  function catmull(pts, u) {
    const n = pts.length - 1, t = clamp(u, 0, 1) * n, i = Math.min(n - 1, Math.floor(t)), s = t - i;
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
    const f = (a, b, c, d) => 0.5 * (2 * b + (c - a) * s + (2 * a - 5 * b + 4 * c - d) * s * s + (3 * b - a - 3 * c + d) * s * s * s);
    return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
  }
  function gait() {
    const s = ctl.spd, w = clamp(s / WALK, 0, 1), r = clamp((s - WALK) / (RUN - WALK), 0, 1);
    const f = gaitFreq(s), sf = lerp(0.6, 0.28, r), stance = s * sf / f, half = stance / 2;
    const lift = 2.2 * w, fwd = lerp(0.5, 1.0, r) * w;
    // sprint: the foot lands almost under the hips and does its work behind the body.
    // stance runs from just ahead of the pelvis to far behind it (the leg runs out of reach there,
    // so the foot peels off the ground like a toe push-off), then the heel folds up under the hip,
    // the knee drives forward high, and the foot claws back down to land under the body again.
    const c0 = 1.5, toe = c0 - stance;
    // (the heel stays a few pixels below the hip: a foot passing right by the hip joint makes the knee flip sides)
    const runPath = [[toe, 0.5], [toe + 1.5, 6.5], [-3, 11.5], [4, 11], [5.5, 4], [c0, 0]];   // heel snaps up under the hip, knee drives high and forward, foot claws down
    const q = IDLE.slice(), fx = [0, 0];
    for (let i = 0; i < 2; i++) {
      const ph = (ctl.phase + i * 0.5) % 1;
      let wx, x, y;
      if (ph < sf) {
        const u = ph / sf;
        wx = half - stance * u;
        x = lerp(wx + fwd, c0 - stance * u, r); y = 0;
      } else {
        const u = (ph - sf) / (1 - sf);
        wx = -half + stance * smooth(u);
        const [rx, ry] = catmull(runPath, u);
        x = lerp(wx + fwd, rx, r); y = lerp(lift * Math.sin(Math.PI * u), ry, r);
      }
      q[4 + i * 2] = x + (1 - w) * (i ? 2 : -2);
      q[5 + i * 2] = y;
      fx[i] = half > 0.01 ? clamp(wx / half, -1, 1) : 0;
    }
    const bob = Math.cos(4 * Math.PI * (ctl.phase - sf / 2));   // +1 at each midstance
    q[0] = 0.3 * Math.sin(simTime * 0.7) * (1 - w) + 1.0 * r;   // hips ride ahead of the feet when sprinting
    q[1] = lerp(17.4, 15.6, w) - 0.6 * r + 0.9 * w * (1 - r) * bob - 1.8 * r * bob + 0.3 * (1 - w) * Math.sin(simTime * 2.4);
    q[2] = 0.05 * w + 0.5 * r + clamp(ctl.accS / 350, -0.3, 0.22);   // a sprinter's forward lean; lean into a start, back into a stop
    q[3] = -0.5 * q[2];
    const br = Math.sin(simTime * 2.4) * (1 - w);   // idle breathing: chest lifts the shoulders, the head settles against it
    q[3] -= 0.03 * br; q[2] -= 0.015 * br;
    const amp = 0.3 * w;
    for (let i = 0; i < 2; i++) {
      const sw = -fx[i];   // walk: arm swings against the leg on its own side
      const sr = -Math.cos(2 * Math.PI * ((ctl.phase + i * 0.5 + 0.05) % 1));   // sprint: arm is back as its leg drives forward
      // sprint arms drive hard behind the body and stop short in front
      q[8 + i * 2] = lerp(0.05 + amp * sw, sr > 0 ? 0.1 + 0.85 * sr : 0.1 + 1.7 * sr, r);   // hands punch up to the chin, elbows drive far back
      q[9 + i * 2] = lerp(0.18 + 0.3 * Math.max(0, sw) * w, 1.55 + 0.25 * sr, r);
      q[8 + i * 2] += 0.04 * br; q[9 + i * 2] += 0.03 * br;
    }
    return q;
  }

  // ---------- ragdoll ----------
  const IM = [0.7, 1, 0.8, 1.2, 1.4, 1.2, 1.4, 1, 1.2, 1, 1.2];
  const RAD = [4.8, 2.4, 3.2, 2, 2, 2, 2, 2, 2, 2, 2];
  const START_X = 60;
  let openT = -1;   // the opening scene's clock (-1: not playing)
  let endPh = null, endT = 0, endCam = null, dog = null;   // the ending: its phase, the phase clock, a locked shot, the dog on the street
  const P = fk(IDLE, START_X, GROUND - 2, 1).map(([x, y], i) => ({ x, y, px: x, py: y, im: IM[i], r: RAD[i], grab: false, fl: GROUND - RAD[i], fs: GROUND_S }));
  const REST = fk(IDLE, 80, GROUND - 2, 1);
  const len = (a, b) => Math.hypot(REST[a][0] - REST[b][0], REST[a][1] - REST[b][1]);
  const STICKS = [[0, 1, L.neck], [1, 2, L.torso], [1, 3, L.ua], [3, 4, L.fa], [1, 5, L.ua], [5, 6, L.fa], [2, 7, L.th], [7, 8, L.sh], [2, 9, L.th], [9, 10, L.sh]]
    .map(([a, b, l]) => [a, b, l, l]);
  const RANGES = [[0, 2, 0.92, 1.0], [1, 7, 0.5, 1.1], [1, 9, 0.5, 1.1], [2, 8, 0.45, 1.0], [2, 10, 0.45, 1.0], [1, 4, 0.3, 1.0], [1, 6, 0.3, 1.0]]
    .map(([a, b, lo, hi]) => [a, b, len(a, b) * lo, len(a, b) * hi]);
  const HINGES = [[2, 7, 8, 1], [2, 9, 10, 1], [1, 3, 4, -1], [1, 5, 6, -1]]; // knees bend back, elbows bend forward
  const CONSTRAINTS = STICKS.concat(RANGES);

  function solveDist(a, b, min, max) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-6;
    let t; if (d < min) t = min; else if (d > max) t = max; else return;
    const wa = a.grab ? 0 : a.im, wb = b.grab ? 0 : b.im, w = wa + wb; if (!w) return;
    const k = (d - t) / d / w;
    a.x += dx * k * wa; a.y += dy * k * wa; b.x -= dx * k * wb; b.y -= dy * k * wb;
  }
  function hinge(a, b, c, sgn) {
    const cr = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (cr * sgn >= 0) return;
    const ex = c.x - a.x, ey = c.y - a.y, Lq = ex * ex + ey * ey || 1e-6;
    const t = ((b.x - a.x) * ex + (b.y - a.y) * ey) / Lq;
    const mx = (a.x + ex * t - b.x) * 0.5, my = (a.y + ey * t - b.y) * 0.5;
    if (!b.grab) { b.x += mx; b.y += my; }
    if (!a.grab) { a.x -= mx * 0.5; a.y -= my * 0.5; }
    if (!c.grab) { c.x -= mx * 0.5; c.y -= my * 0.5; }
  }
  const clampP = p => {
    if (p.y > p.fl) p.y = p.fl;
    if (p.y < -200) p.y = -200;
    if (p.x < p.r) p.x = p.r; else if (p.x > W - p.r) p.x = W - p.r;
    if (enc.arena && p.x < enc.arena.x0 - 4) p.x = enc.arena.x0 - 4;   // the shut gate holds a ragdoll in too
  };

  // ---------- punching bag ----------
  const BAG_R = 4.6;
  const BAG_START = [[0, GROUND - 48], [0, GROUND - 42], [0, GROUND - 37], [0, GROUND - 14]];
  const bag = BAG_START.map(([dx, y], i) => ({ x: BAG_X + dx, y, px: BAG_X + dx, py: y, fixed: i === 0 }));
  const BAG_STICKS = [[0, 1, 6], [1, 2, 5], [2, 3, 23]];
  function bagStep(dt) {
    for (const p of bag) {
      if (p.fixed) continue;
      const vx = (p.x - p.px) * 0.996, vy = (p.y - p.py) * 0.996;
      p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + G * dt * dt;
    }
    for (let k = 0; k < 8; k++) for (const [a, b, l] of BAG_STICKS) {
      const A = bag[a], B = bag[b], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1e-6;
      const wa = A.fixed ? 0 : 1, wb = B.fixed ? 0 : 1, kk = (d - l) / d / (wa + wb);
      A.x += dx * kk * wa; A.y += dy * kk * wa; B.x -= dx * kk * wb; B.y -= dy * kk * wb;
    }
  }
  function bagProj(x, y) {
    const T = bag[2], B = bag[3], ex = B.x - T.x, ey = B.y - T.y;
    const t = clamp(((x - T.x) * ex + (y - T.y) * ey) / (ex * ex + ey * ey), 0, 1);
    return { t, d: Math.hypot(x - (T.x + ex * t), y - (T.y + ey * t)) };
  }
  const bagTouch = (x, y) => bagProj(x, y).d < BAG_R + 1.8;
  function hitFx(power) {
    noise(P[2].x);   // the neighbours notice
    crowdReact(P[2].x, power);
    const st = hitCtx && STOP[hitCtx];   // [feel] the fighter's own hits: hit-stop tuned per move, camera kicked along the blow
    hitStop = Math.max(hitStop, st || (power >= 250 ? 0.13 : power > 180 ? 0.09 : 0.045));   // brief freeze sells the impact
    if (hitCtx) { kickCam(ctl.face, /^(al|ah|aair|kh)$/.test(hitCtx) ? 0.8 : -0.2, clamp(power / 130, 0.7, 2.2)); hairKick(ctl.face * power * 0.25, -power * 0.08); }   // the hair flies on with the blow
    if (power >= 250) shakeIt(0.2, 2);
    else if (power > 160) shakeIt(0.12, 1);
  }
  function bagHit(x, y, dir, power, quiet) {
    const { t } = bagProj(x, y), T = bag[2], B = bag[3], v = dir * power;
    T.px -= v * DT * (1.2 - t); B.px -= v * DT * (0.2 + t);
    landed++;
    if (quiet) { puff(x, y); bagFlash = Math.max(bagFlash, 0.03); return; }
    sparks.push({ x, y, t: 0 }); bagFlash = 0.07;
    emit('hit', { by: 'melee', target: 'bag', x, y, dir, power: power / 200, force: power, dmg: 0, blade: false, weapon: hero.weapon });
    hitFx(power);
  }

  const OBJ_START = [
    ['stack', 700, GROUND], ['crate', 770, GROUND], ['bin', 824, GROUND], ['cone', 850, GROUND], ['can', 872, GROUND], ['bottle', 884, GROUND],
    ['bag', 1024, GROUND], ['bin', 1046, GROUND], ['crate', 1180, hy(30)],
    ['crate', 1470, hy(38)], ['cone', 1500, hy(38)], ['crate', 1552, GROUND],
    ['bin', 1760, GROUND], ['crate', 1790, GROUND], ['chair', 1838, GROUND], ['bin', 1884, GROUND],
    ['crate', 2110, GROUND], ['bag', 2130, GROUND]]   // (a few crates, one stack: the street is not a warehouse)
  const objs = [], boards = [];
  const syncSurf = o => { o.surf.x0 = o.x - o.hw; o.surf.x1 = o.x + o.hw; o.surf.y = o.y - o.r; };
  function makeObj(kind, x, y) {
    const o = { kind, ...KINDS[kind], maxHp: KINDS[kind].hp || 0, x, y, vx: 0, vy: 0, a: 0, av: 0, hitBy: -1, flash: 0, safeT: 0 };
    if (o.hw) { o.surf = { x0: 0, x1: 0, y: 0, box: true }; syncSurf(o); SURF.push(o.surf); }
    objs.push(o);
    return o;
  }
  function removeObj(o) {
    objs.splice(objs.indexOf(o), 1);
    if (o.surf) SURF.splice(SURF.indexOf(o.surf), 1);
  }
  function resetObjs() {
    boards.length = 0;
    while (objs.length) removeObj(objs[0]);
    for (const [kind, x, top] of OBJ_START) makeObj(kind, x, top - KINDS[kind].r);
  }
  resetObjs();
  // point to object surface: distance (negative inside) and the outward normal toward the point
  function objNear(o, x, y) {
    const dx = x - o.x, dy = y - o.y;
    if (!o.hw) { const d = Math.hypot(dx, dy) || 1e-6; return { d: d - o.r, nx: dx / d, ny: dy / d }; }
    const qx = Math.abs(dx) - o.hw, qy = Math.abs(dy) - o.r;
    if (qx > 0 || qy > 0) { const ox = Math.max(qx, 0), oy = Math.max(qy, 0), d = Math.hypot(ox, oy) || 1e-6; return { d, nx: Math.sign(dx) * ox / d, ny: Math.sign(dy) * oy / d }; }
    return qx > qy ? { d: qx, nx: Math.sign(dx) || 1, ny: 0 } : { d: qy, nx: 0, ny: Math.sign(dy) || 1 };
  }
  // does the segment a-b pass within pad of the object?
  function segHitsObj(ax, ay, bx, by, o, pad) {
    if (!o.hw) return segDist(ax, ay, bx, by, o.x, o.y) < o.r + pad;
    for (let i = 0; i <= 6; i++) if (objNear(o, ax + (bx - ax) * i / 6, ay + (by - ay) * i / 6).d < pad) return true;
    return false;
  }
  // a heavy blow knocks the stack apart into two big crates
  function splitStack(o, dirx, power) {
    removeObj(o); emit('feat', 'split'); emit('object:break', { o, kind: o.kind, x: o.x, y: o.y, split: true });
    const k = power / 3 * 1.6;
    const lo = makeObj('bigcrate', o.x, o.y + 6), hi = makeObj('bigcrate', o.x, o.y - 6);
    lo.vx = o.vx + dirx * k * 0.45; lo.vy = -40;
    hi.vx = o.vx + dirx * k * 0.9; hi.vy = -k * 0.5 - 60; hi.av = dirx * 9;
    for (const c of [lo, hi]) { c.flash = 0.06; c.safeT = 0.5; }
    dust(o.x, o.y + o.r - 1, 6);
  }
  // wooden boxes take damage, crack, then burst into boards and splinters
  function damageObj(o, dmg, dirx) {
    if (!o.maxHp || !objs.includes(o)) return false;
    o.hp -= dmg;
    if (o.hp > 0) {   // still whole: chips of what it is made of fly off the struck side
      const cols = objCols(o);
      for (let i = 0; i < 3 + Math.round(3 * (1 - o.hp / o.maxHp)); i++) particles.push({ x: o.x - dirx * (o.hw || o.r) * 0.6, y: o.y - o.r * 0.4 + (simRand() - 0.5) * o.r,
        vx: -dirx * (20 + simRand() * 50) + (simRand() - 0.5) * 40, vy: -40 - simRand() * 70, life: 0.35 + simRand() * 0.3, c: cols[i % 2] });
      return false;
    }
    if (o.kind === 'stack') { splitStack(o, dirx, 250); return true; }
    shatterObj(o, dirx);   // wood into boards, the rest into its own pieces
    return true;
  }
  const objCols = o => o.kind === 'bin' ? [PAL.bin, PAL.binL, PAL.out] : o.kind === 'cone' ? [PAL.cone, PAL.coneL, PAL.cone] : o.kind === 'bag' ? [PAL.bag, PAL.bagS, C('#6a6a50')]
    : o.kind === 'can' ? [C('#c0302a'), C('#c8ccd8'), C('#e04a3a')] : o.kind === 'bottle' ? [C('#2f7a3e'), C('#b8e0c0'), C('#2f7a3e')] : o.kind === 'knife' ? [C('#d8dee8'), C('#3a2230'), C('#d8dee8')]
    : o.kind === 'ball' ? [PAL.ball, PAL.white, PAL.ball] : o.kind === 'barrel' ? [PAL.barrel, PAL.hoop, PAL.barrelL] : [PAL.crate, PAL.crateD, PAL.plankL];
  // a carried object used as a weapon breaks on its first hit, into pieces of what it is made of
  function shatterObj(o, dirx) {
    if (!objs.includes(o)) return;
    o.carried = false; o.thrown = 0;
    if (o.kind === 'crate' || o.kind === 'bigcrate' || o.kind === 'stack' || o.kind === 'chair') { o.vx *= 0.3; breakObj(o, dirx); return; }   // wood: boards and splinters
    removeObj(o); emit('feat', 'smash'); emit(o.kind === 'bottle' ? 'glass:break' : 'object:break', { o, kind: o.kind, x: o.x, y: o.y });   // (a bottle is glass)
    hitStop = Math.max(hitStop, 0.06); sparks.push({ x: o.x, y: o.y, t: 0.04 });
    const cols = objCols(o);
    for (let i = 0; i < 16; i++) particles.push({ x: o.x + (simRand() - 0.5) * o.r * 2, y: o.y + (simRand() - 0.5) * o.r * 2,
      vx: dirx * simRand() * 130 + (simRand() - 0.5) * 90, vy: -30 - simRand() * 120, life: 0.45 + simRand() * 0.5, c: cols[i % 3] });
    dust(o.x, o.y + o.r - 1, 6);
    if (!reduceMotion) cam.shake = Math.max(cam.shake, 0.08);
  }
  function breakObj(o, dirx) {
    removeObj(o); emit('feat', 'smash'); emit('object:break', { o, kind: o.kind, x: o.x, y: o.y });
    hitStop = Math.max(hitStop, 0.07); sparks.push({ x: o.x, y: o.y, t: 0.04 });
    const n = o.kind === 'bigcrate' ? 7 : 5;
    for (let i = 0; i < n; i++) boards.push({ x: o.x + (simRand() - 0.5) * o.r, y: o.y + (simRand() - 0.5) * o.r,
      vx: o.vx * 0.5 + dirx * (40 + simRand() * 90) + (simRand() - 0.5) * 70, vy: -60 - simRand() * 120,
      a: simRand() * Math.PI, av: (simRand() - 0.5) * 30, len: 3 + simRand() * (o.r - 2), life: 2.5 + simRand() });
    for (let i = 0; i < 14; i++) particles.push({ x: o.x + (simRand() - 0.5) * o.r * 2, y: o.y + (simRand() - 0.5) * o.r * 2,
      vx: dirx * simRand() * 120 + (simRand() - 0.5) * 80, vy: -30 - simRand() * 110, life: 0.4 + simRand() * 0.4,
      c: [PAL.crate, PAL.crateD, PAL.plankL][i % 3] });
    dust(o.x, o.y + o.r - 1, 8);
    if (!reduceMotion) cam.shake = Math.max(cam.shake, 0.1);
    if ((o.kind === 'crate' || o.kind === 'bigcrate') && simRand() < 0.5) {   // something was packed inside: a can, a bottle or a knife pops out
      const k = simRand() < 0.3 ? 'knife' : simRand() < 0.5 ? 'bottle' : 'can', q = makeObj(k, o.x, o.y - 2);
      q.vx = dirx * 30 + (simRand() - 0.5) * 50; q.vy = -110; q.av = (simRand() - 0.5) * 20; q.safeT = 0.35;
    }
  }
  function boardStep(dt) {
    for (let i = boards.length - 1; i >= 0; i--) {
      const b = boards[i];
      b.life -= dt; if (b.life <= 0) { boards.splice(i, 1); continue; }
      b.vy += G * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.av * dt;
      const fl = floorBelow(b.x, b.y - 2, 0);
      if (b.y > fl.y - 1 && b.vy > 0) {
        b.y = fl.y - 1; b.vy *= -0.3; b.vx *= 0.6; b.av *= 0.5;
        if (Math.abs(b.vy) < 15) { b.vy = 0; b.av = 0; b.a = Math.round(b.a / Math.PI) * Math.PI; b.vx *= 0.8; }   // settle flat
      }
    }
  }
  function drawBoards(L) {
    for (const b of boards) {
      if (L != null && b.lane !== L) continue;
      if (b.life < 0.6 && Math.floor(b.life * 16) % 2) continue;   // blink out
      const dx = Math.cos(b.a) * b.len / 2, dy = Math.sin(b.a) * b.len / 2;
      line1(b.x - dx, b.y - dy + 1, b.x + dx, b.y + dy + 1, PAL.crateD);
      line1(b.x - dx, b.y - dy, b.x + dx, b.y + dy, PAL.crate);
    }
  }
  // squat beside a loose object with empty hands to pick it up in one hand; a tap swings it, a hold throws it. It is not built for
  // fighting: the first goon it hits, it breaks on (shatterObj)
  function carryStep(dt) {
    let c = ctl.carry;
    if (c && (!objs.includes(c) || hero.mode !== 'anim')) { if (objs.includes(c)) { c.carried = false; c.vx = (simRand() - 0.5) * 40; c.vy = -40; } ctl.carry = c = null; }   // knocked down: he drops it
    if (!c && hero.mode === 'anim' && hero.act === 'squat' && !hero.weapon && !ctl.air && !demoSmash) {
      let best = null;
      for (const o of objs) if (LIFTABLE.has(o.kind) && !o.carried && Math.abs(o.x - ctl.x) < o.r + 9 && Math.abs(o.y + o.r - (ctl.y + 2)) < 6 && Math.hypot(o.vx, o.vy) < 40 && (!best || Math.abs(o.x - ctl.x) < Math.abs(best.x - ctl.x))) best = o;
      if (best) { ctl.carry = c = best; ctl.bashT = 0; best.carried = true; best.a = 0; best.av = 0; best.liftT = 0.15; best.lx = best.x; best.ly = best.y; emit('feat', 'lift'); dust(best.x, GROUND - 1, 2); }
    }
    if (c && ctl.bashT > 0) {   // a bash: at the bottom of the swing it hits the first goon in front
      ctl.bashT -= dt;
      if (!ctl.bashHit && ctl.bashT < CBASH * 0.5) {
        ctl.bashHit = true;
        const e = enemies.find(e => !e.dead && !e.down && (e.x - ctl.x) * ctl.face > 0 && (e.x - ctl.x) * ctl.face < 22 + c.r && Math.abs(e.y - ctl.y) < 16);
        if (e) { killBy = 5; damageEnemy(e, Math.round(6 + c.m * 4), ctl.face, 150 + c.m * 30, 0.2, c.x + ctl.face * c.r, c.y, false); killBy = null; hitFx(150 + c.m * 20); emit('feat', 'bash'); ctl.carry = null; shatterObj(c, ctl.face); return; }   // one blow and it is in pieces
      }
      if (ctl.bashT <= 0) ctl.bashT = 0;
    }
    if (c) {   // held in the front hand, at his side; [feel] the first 0.15 s it is swung up from where it lay to the hand
      const hx = P[6].x + ctl.face * c.r * 0.55, hy = P[6].y + c.r * 0.25;
      if (c.liftT > 0) { c.liftT -= dt; const k = smooth(1 - Math.max(0, c.liftT) / 0.15); c.x = lerp(c.lx, hx, k); c.y = lerp(c.ly, hy, k); }
      else { c.x = hx; c.y = hy; }
      c.vx = c.vy = 0; c.a = 0; if (c.surf) syncSurf(c);
    }
  }
  function throwCarry() {
    const o = ctl.carry; if (!o) return false;
    ctl.carry = null; o.carried = false; o.thrown = 0.9; o.hitIds = new Set();
    const f = ctl.face, k = 1 / Math.sqrt(o.m);
    const aim = aimAt(o.x, o.y, 160 + 110 * k + Math.max(0, ctl.spd) * 0.4, G);
    o.vx = aim.vx; o.vy = aim.vy; o.av = f * 9; o.safeT = 0.3;
    emit('feat', 'toss'); if (!reduceMotion) cam.shake = Math.max(cam.shake, 0.05);
    hero.act = 'tw'; hero.actT = 0.2; hitDone = true; hero.atkId++;   // the throwing arm follows through
    return true;
  }
  function thrownObjStep(dt) {   // a thrown object hits the first goon in its way
    for (const o of objs) {
      if (!(o.thrown > 0)) continue;
      o.thrown -= dt;
      if (Math.hypot(o.vx, o.vy) < 60) { o.thrown = 0; continue; }
      for (const e of enemies) {
        if (e.dead || o.hitIds.has(e) || offPlat(o, e.lane)) continue;
        const [ax, ay, bx, by] = capsule(e.J);
        if (segDist(ax, ay, bx, by, o.x, o.y) < o.r + 4 * e.s) {
          o.hitIds.add(e); const d = Math.sign(o.vx) || 1;
          killBy = 5; damageEnemy(e, Math.round(8 + o.m * 6), d, 140 + o.m * 40, 0.3, o.x, o.y, false); killBy = null;
          hitFx(160 + o.m * 30); emit('feat', 'tosshit');
          o.vx *= -0.3; o.vy = -60;
          shatterObj(o, d);   // it breaks on him
          break;
        }
      }
    }
  }
  // ---------- the club crowd throws things in: cans, bottles, knives to use on the boss ----------
  const pocket = [];   // up to 3 small throwables carried in the coat
  let crowdTossT = 4;
  const tossed = [];
  function crowdToss(dt) {
    if (isP9()) return;
    if (!flags.club || !enc.boss || enc.boss.dead || !slamDone) return;
    if ((crowdTossT -= dt) > 0) return;
    crowdTossT = 6 + simRand() * 5;
    if (objs.filter(o => o.pocket).length >= 3) return;
    const d = dancers[Math.floor(simRand() * dancers.length)];
    const kind = simRand() < 0.35 ? 'knife' : simRand() < 0.5 ? 'bottle' : 'can';
    const tx = clamp(ctl.x + (simRand() - 0.5) * 90, CLUB_X + 20, W - 20);
    const o = makeObj(kind, d.x, GROUND - 30);
    const T = 0.9; o.vx = (tx - d.x) / T; o.vy = -G * T / 2 - 10; o.av = (simRand() - 0.5) * 20; o.safeT = 0.5;
    d.mood = 'cheer'; d.t = 1.2;
  }
  function pocketStep(dt) {
    for (const o of objs.slice()) {
      if (!o.pocket || o.safeT > 0 || hero.mode !== 'anim' || pocket.length >= 3) continue;
      if (!endPh && hero.act === 'squat' && Math.abs(o.x - ctl.x) < 9 && Math.abs(o.y - ctl.y) < 14) { pocket.push(o.kind); removeObj(o); emit('feat', 'pocket'); emit('pickup', { kind: o.kind, pocket: true, x: o.x, y: o.y }); sparks.push({ x: o.x, y: o.y - 3, t: 0.1 }); }   // squat by it to pocket it (walking into it kicks it along)
    }
    for (let i = tossed.length - 1; i >= 0; i--) {   // pocket throws fly until they hit someone or land
      const q = tossed[i], T = TOSS[q.k];
      q.vy += G * (q.k === 'knife' ? 0.15 : 0.7) * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.a += q.av * dt;
      let gone = q.y >= floorBelow(q.x, q.y - 3, 0).y - 1 || q.x < 0 || q.x > W;
      if (!gone) for (const e of enemies) {
        if (e.dead) continue;
        const [ax, ay, bx, by] = capsule(e.J);
        if (segDist(ax, ay, bx, by, q.x, q.y) < 4 * e.s + 2) {
          killBy = q.k === 'knife' ? 1 : 5;
          damageEnemy(e, T.dmg, Math.sign(q.vx) || 1, T.power, 0.2, q.x, q.y, q.k === 'knife'); killBy = null;
          hitFx(T.power); emit('feat', 'pockethit');
          if (q.k === 'bottle') for (let k = 0; k < 8; k++) particles.push({ x: q.x, y: q.y, vx: (simRand() - 0.5) * 120, vy: -30 - simRand() * 80, life: 0.4, c: k % 2 ? C('#2f7a3e') : C('#b8e0c0') });
          gone = true; break;
        }
      }
      if (gone) { if (q.k === 'bottle') puff(q.x, q.y); tossed.splice(i, 1); }
    }
  }
  function throwPocket() {
    const k = pocket.shift(); if (!k) return false;
    // [feel] the arm winds back first; the can leaves the hand at the release key (see tossRelease), not from the belt
    hero.act = 'tw'; hero.actT = 0.06; hitDone = true; hero.atkId++; ctl.toss = k;
    return true;
  }
  function tossRelease() {
    const k = ctl.toss; if (!k) return;
    if (hero.act !== 'tw') { pocket.unshift(k); ctl.toss = null; return; }   // cut short: it stays in the pocket
    if (hero.actT < 0.22) return;
    const T = TOSS[k], f = ctl.face, h = P[6];
    const aim = aimAt(h.x, h.y, T.v, G * (k === 'knife' ? 0.15 : 0.7));
    tossed.push({ k, x: h.x, y: h.y, vx: aim.vx, vy: aim.vy, a: 0, av: f * T.spin });
    ctl.toss = null;
  }
  function drawTossed() {
    for (const q of tossed) {
      const dx = Math.cos(q.a), dy = Math.sin(q.a);
      if (q.k === 'knife') { line1(q.x - q.vx * 0.01, q.y - q.vy * 0.01, q.x, q.y, C('#d8dee8')); continue; }
      plot(Math.floor(q.x), Math.floor(q.y), q.k === 'can' ? C('#e04a3a') : C('#2f7a3e'));
      plot(Math.floor(q.x + dx), Math.floor(q.y + dy), q.k === 'can' ? C('#c8ccd8') : C('#c9a24a'));
    }
  }
  // floor objects are not built to travel: pushed or knocked along the ground for PUSH_BREAK px they come apart, and they break on
  // anything they run into at speed (another object; a goon, who goes down a little hurt)
  function objStep(dt) {
    boardStep(dt);
    crowdToss(dt);
    pocketStep(dt);
    carryStep(dt);
    thrownObjStep(dt);
    const brk = new Set();
    for (const o of objs) {
      if (o.carried) continue;
      const fl = floorBelow(o.x, o.y, o.r);
      o.vy += G * dt; o.vx *= 0.999;
      o.x += o.vx * dt; o.y += o.vy * dt; o.a += o.av * dt;
      if (o.y > fl.y - o.r) {
        o.y = fl.y - o.r;
        if (o.vy > 0) {
          if (fl.bouncy && o.vy > 60) { o.vy = -o.vy * 0.9; fl.squish = 0.15; }   // objects lose a little each bounce and come to rest
          else { if (o.vy > 70) dust(o.x, fl.y - 1, 2); o.vy = o.vy > 25 ? -o.vy * o.e : 0; }
        }
        if (o.vy === 0) {   // resting on something
          if (o.hw) o.vx *= 0.8;
          else if (o.roll) { o.vx *= o.kind === 'ball' ? 0.996 : 0.985; o.av = o.vx / o.r; }
          else { o.vx *= 0.86; const t = Math.round(o.a / (Math.PI / 2)) * Math.PI / 2; o.a += (t - o.a) * 0.25; o.av *= 0.6; }
        }
      }
      const hw = o.hw || o.r;
      if (o.x < hw) { o.x = hw; o.vx = Math.abs(o.vx) * 0.5; } else if (o.x > W - hw) { o.x = W - hw; o.vx = -Math.abs(o.vx) * 0.5; }
      if (o.hw) { o.a = 0; o.av = 0; }
      if (o.y < -60) { o.y = -60; o.vy = Math.abs(o.vy) * 0.3; }
      o.av *= 0.995;
      const sp = Math.hypot(o.vx, o.vy); if (sp > 420) { o.vx *= 420 / sp; o.vy *= 420 / sp; }
      if (o.flash > 0) o.flash -= dt;
      if (o.safeT > 0) o.safeT -= dt;
      if (o.surf) syncSurf(o);
    }
    // objects knock into each other
    for (let i = 0; i < objs.length; i++) for (let j = i + 1; j < objs.length; j++) {
      const a = objs[i], b = objs[j];
      let nx, ny, pen;
      if (a.hw && b.hw) continue;
      if (a.hw || b.hw) {   // box against a round object: normal from a to b
        const box = a.hw ? a : b, rnd = a.hw ? b : a, q = objNear(box, rnd.x, rnd.y), sg = a.hw ? 1 : -1;
        pen = rnd.r - q.d; nx = q.nx * sg; ny = q.ny * sg;
      } else {
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d === 0) continue;
        pen = a.r + b.r - d; nx = dx / d; ny = dy / d;
      }
      if (pen <= 0) continue;
      const ia = 1 / a.m, ib = 1 / b.m, s = pen / (ia + ib);
      a.x -= nx * s * ia; a.y -= ny * s * ia; b.x += nx * s * ib; b.y += ny * s * ib;
      const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (vn < 0) {
        if (vn < -60) for (const q of [a, b]) if (FLOOR_BREAK.has(q.kind) && !q.carried && Math.hypot(q.vx, q.vy) > 40) brk.add(q);   // a hard knock: it breaks
        const jn = -1.3 * vn / (ia + ib);
        a.vx -= jn * nx * ia; a.vy -= jn * ny * ia; b.vx += jn * nx * ib; b.vy += jn * ny * ib;
        const tang = (b.vx - a.vx) * -ny + (b.vy - a.vy) * nx;
        a.av -= tang * 0.02; b.av += tang * 0.02;
      }
    }
    // objects against the fighter
    for (const o of objs) {
      if (o.carried || offPlat(o, ctl.lane)) continue;
      if (hero.mode === 'rag') {
        for (const p of P) {
          const dx = o.x - p.x, dy = o.y - p.y, d = Math.hypot(dx, dy), rr = o.r + p.r * 0.8;
          if (d >= rr || d === 0) continue;
          const nx = dx / d, ny = dy / d, ov = rr - d;
          o.x += nx * ov * 0.5; o.y += ny * ov * 0.5;
          if (!p.grab) { p.x -= nx * ov * 0.5; p.y -= ny * ov * 0.5; }
          const vn = (o.vx - (p.x - p.px) / dt) * nx + (o.vy - (p.y - p.py) / dt) * ny;
          if (vn < 0) {
            const jn = -1.2 * vn / (1 / o.m + 1);
            o.vx += jn * nx / o.m; o.vy += jn * ny / o.m;
            if (!p.grab) { p.px += jn * nx * dt; p.py += jn * ny * dt; }
          }
        }
      } else {
        // the standing body is a capsule from the head down to between the feet
        const A = P[0], bx = (P[8].x + P[10].x) / 2, by = (P[8].y + P[10].y) / 2;
        const ex = bx - A.x, ey = by - A.y, t = clamp(((o.x - A.x) * ex + (o.y - A.y) * ey) / (ex * ex + ey * ey || 1), 0, 1);
        const cx = A.x + ex * t, cy = A.y + ey * t, q = objNear(o, cx, cy);
        if (q.d >= 4) continue;
        let nx = -q.nx, ny = -q.ny;
        if (o.hw) ny = 0;   // standing on or pressing down on the stack does not move it
        o.x += nx * (4 - q.d); o.y += ny * (4 - q.d);
        const fvx = (P[2].x - P[2].px) / dt, fvy = (P[2].y - P[2].py) / dt;
        const vn = (o.vx - fvx) * nx + (o.vy - fvy) * ny;
        if (o.vx * nx + o.vy * ny < -170 && o.safeT <= 0 && hero.mode === 'anim') {   // an object flying into the fighter knocks them down
          const ivx = o.vx * 0.5, ivy = o.vy * 0.5;
          toRag();
          for (const p of P) { const f = clamp(1 - Math.hypot(p.x - o.x, p.y - o.y) / 20, 0.2, 1); p.px -= ivx * f * dt; p.py -= ivy * f * dt; }
          o.vx *= -0.3; o.vy *= -0.3;
          sparks.push({ x: cx, y: cy, t: 0 }); hits++; hitFx(200);
        } else {
          const on = o.vx * nx + o.vy * ny;
          if (on < -80 && o.safeT <= 0 && hero.mode === 'anim' && flinch(o.x, o.y, clamp((-on - 60) / 110, 0.35, 1), cx, cy)) o.safeT = 0.2;   // [G3] moderate hit: flinch
          if (vn < 0) {
            o.vx -= nx * vn * 1.1; o.vy -= ny * vn * 1.1;
            if (o.m < 1 && !ctl.air && hero.mode === 'anim' && Math.abs(fvx) > 15 && o.y > P[2].y) {   // a can, a bottle, a cone at his feet: kicked skittering along
              o.vx = fvx * (1.3 + simRand() * 0.5) + nx * 15; o.vy = -25 - simRand() * 45 * Math.min(1, Math.abs(fvx) / 120); o.av += (simRand() - 0.5) * 20; o.safeT = 0.15;
            }
          }
        }
      }
    }
    for (const o of objs) {   // a pile-up or a shove never presses a box into the ground or out of the world
      const hw = o.hw || o.r;
      if (o.y > GROUND - o.r) { o.y = GROUND - o.r; if (o.vy > 0) o.vy = 0; }
      o.x = clamp(o.x, hw, W - hw);
      if (o.surf) syncSurf(o);
    }
    for (const o of objs) {
      if (!FLOOR_BREAK.has(o.kind) || o.carried) continue;
      const sp = Math.abs(o.vx);
      if (sp > 12 && Math.abs(o.vy) < 1) { o.pushD = (o.pushD || 0) + sp * dt; if (o.pushD > PUSH_BREAK) brk.add(o); }   // sliding along the ground
      else if (sp < 3) o.pushD = 0;
      if (Math.hypot(o.vx, o.vy) > 70 && !(o.thrown > 0) && !brk.has(o)) for (const e of enemies) {   // knocked into a goon: he goes down
        if (e.dead || e.down || !e.J || offPlat(o, e.lane)) continue;
        const [ax, ay, bx, by] = capsule(e.J);
        if (segDist(ax, ay, bx, by, o.x, o.y) < (o.hw || o.r) + 3 * e.s) {
          const d = Math.sign(o.vx) || 1;
          killBy = 5; damageEnemy(e, 5, d, 60, 0.2, o.x, o.y, false); killBy = null;
          if (!e.dead && !e.down) knockDown(e, d, 160, 'hp');
          brk.add(o); break;
        }
      }
    }
    for (const o of brk) shatterObj(o, Math.sign(o.vx) || 1);
  }
  function launchObj(o, x, y, dirx, power, up) {
    if (o.kind === 'stack' && power >= 250) { splitStack(o, dirx, power); sparks.push({ x, y, t: 0 }); landed++; hitFx(power); return; }
    if (damageObj(o, power, dirx)) { sparks.push({ x, y, t: 0 }); landed++; hitFx(power); return; }
    const pw = power / o.m * 1.6;
    o.vx += dirx * pw * 0.9; o.vy -= pw * up + 30; o.av += dirx * pw * 0.06;
    o.flash = 0.06; o.safeT = 0.5;
    sparks.push({ x, y, t: 0 });
    landed++;
    hitFx(power);
  }

  // ---------- weapons ----------
  // a blade sits in the front hand, pointed by the forearm (plus the blade angle, wrist turn and swing through depth).
  // a gun is held at the shoulder: x, y is the butt of the stock and the hands grip it (see holdGun)
  const wBack = () => hero.mode === 'anim' && !!WEAPONS[hero.weapon].melee && !!MOVES[hero.act] && MOVES[hero.act].hand === 0 && hero.actT >= (MOVES[hero.act].swapAt || 0) && hero.actT < MOVES[hero.act].dur - 0.04;   // passed hand to hand where the grips meet   // the blade is in the back hand
  function weaponGeom() {
    const Wp = WEAPONS[hero.weapon]; if (!Wp.len) return null;
    const f = faceNow();
    if (Wp.gun && gunPose && hero.mode !== 'rag') {
      const { bx, by, dx, dy } = gunPose;
      return { x: bx, y: by, dx, dy, len: Wp.len, tx: bx + dx * Wp.len, ty: by + dy * Wp.len, s: f };
    }
    const bh = wBack(), e = P[bh ? 3 : 5], h = P[bh ? 4 : 6];
    let a = Math.atan2(h.y - e.y, h.x - e.x);
    if (Wp.melee) a += (Wp.off + ctl.wr) * f;
    const k = Wp.melee ? Math.cos(ctl.yw) : 1;   // foreshortening; negative when the blade points behind
    const dx = Math.cos(a) * k, dy = Math.sin(a) * k;
    if (Wp.gun) { const bx = h.x - dx * Wp.forend, by = h.y - dy * Wp.forend; return { x: bx, y: by, dx, dy, len: Wp.len, tx: bx + dx * Wp.len, ty: by + dy * Wp.len, s: f }; }
    return { x: h.x, y: h.y, dx, dy, len: Wp.len, tx: h.x + dx * Wp.len, ty: h.y + dy * Wp.len, s: f };
  }
  // two-bone arm from the shoulder to a hand target; the elbow hangs below the line
  function armIK(sh, t) {
    let dx = t[0] - sh[0], dy = t[1] - sh[1], d = Math.hypot(dx, dy) || 1e-6;
    const a = L.ua, b = L.fa, max = a + b - 0.05;
    if (d > max) { t = [sh[0] + dx / d * max, sh[1] + dy / d * max]; dx = t[0] - sh[0]; dy = t[1] - sh[1]; d = max; }
    const base = Math.atan2(dy, dx), A = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
    const e1 = [sh[0] + Math.cos(base + A) * a, sh[1] + Math.sin(base + A) * a], e2 = [sh[0] + Math.cos(base - A) * a, sh[1] + Math.sin(base - A) * a];
    return [(e1[0] - e2[0]) * armDn[0] + (e1[1] - e2[1]) * armDn[1] > 0 ? e1 : e2, t];   // [feel] "below" turns with the body in a flip
  }
  const armDn = [0, 1];
  // shoulder the gun: stock in the shoulder pocket, trigger hand on the grip, support hand on the forend.
  // aiming raises the muzzle from low carry to level; recoil drives the stock back and lifts the muzzle.
  function holdGun(j) {
    const Wp = WEAPONS[hero.weapon], f = ctl.face, r = gun.recoil, nk = j[1];
    let th = hero.act === 'gb' ? 0 : lerp(0.65, 0, gun.aimW) - Wp.lift * r - gun.climb;   // radians below level
    let dx = Math.cos(th) * f, dy = Math.sin(th);
    if (ctl.spin) { const a = ctl.spin * f, c = Math.cos(a), sn = Math.sin(a); [dx, dy] = [dx * c - dy * sn, dx * sn + dy * c]; }
    const thrust = hero.act === 'gb' ? 4 * Math.sin(Math.PI * clamp((hero.actT - 0.08) / 0.3, 0, 1)) : 0;
    const back = Wp.kick * r - thrust;
    const sa = Math.sin(ctl.spin * f), ca = Math.cos(ctl.spin * f);   // [feel] the shoulder pocket turns with the body in a flip
    const bx = nk[0] + f * 1.5 * ca - 2.5 * sa - dx * back, by = nk[1] + f * 1.5 * sa + 2.5 * ca - dy * back;
    gunPose = { bx, by, dx, dy };
    const ux = -dy * f, uy = dx * f;   // the underside of the gun
    const pumpK = gun.pumpT >= 0.3 ? Math.sin(Math.PI * (gun.pumpT - 0.3) / 0.7) : 0;
    const fd = Wp.forend - 3 * pumpK;
    const [eB, hB] = armIK(nk, [bx + dx * 3.5 + ux * 1.5, by + dy * 3.5 + uy * 1.5]);
    const [eF, hF] = armIK(nk, [bx + dx * fd + ux * 1.2, by + dy * fd + uy * 1.2]);
    j[3] = eB; j[4] = hB; j[5] = eF; j[6] = hF;
  }
  function puff(x, y) {
    for (let k = 0; k < 3; k++) particles.push({ x, y, vx: (simRand() - 0.5) * 80, vy: -simRand() * 60, life: 0.12 + simRand() * 0.1, c: k ? PAL.accent : PAL.white });
  }
  // with a gun up, recoil rocks the upper body: hips shove back, the torso leans back, the head jolts
  function gunBody(q, dt) {
    gun.aimW += ((gun.aimT > 0 || hero.act === 'gb' ? 1 : 0) - gun.aimW) * (1 - Math.exp(-20 * dt));
    const k = gun.recoil * WEAPONS[hero.weapon].body, o = q.slice();
    o[0] -= 1.8 * k; o[2] -= 0.25 * k; o[3] += 0.15 * k;   // hips and torso only: the feet keep their spots
    return o;
  }
  function fire(Wp) {
    const g = weaponGeom(); if (!g) return;
    if (Wp.ammo) {
      if (charge[hero.weapon] <= 0) {   // empty: hurl the gun at the nearest enemy instead
        gun.want = false; gun.cd = 0.3;
        let foe = null;
        for (const e of enemies) if (!e.dead && Math.abs(e.x - ctl.x) < 180 && Math.abs(e.y - ctl.y) < 30 && (!foe || Math.abs(e.x - ctl.x) < Math.abs(foe.x - ctl.x))) foe = e;
        if (foe) ctl.face = Math.sign(foe.x - ctl.x) || ctl.face;
        ctl.flipT = -1; ctl.spin = 0; startAttack('tw');
        return;
      }
      charge[hero.weapon]--;
    }
    // the machine gun sprays around a level line ahead, so kick never walks the stream upward
    const base = Wp.auto && !ctl.spin ? (ctl.face > 0 ? 0 : Math.PI) : Math.atan2(g.dy, g.dx);
    for (let i = 0; i < Wp.pellets; i++) {
      const a = base + (simRand() * 2 - 1) * Wp.spread, sp = Wp.speed * (0.9 + simRand() * 0.2);
      const b = { x: g.x, y: g.y, px: g.x, py: g.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: Wp.life * (0.8 + simRand() * 0.4), power: Wp.power };
      let hit = false;   // point blank: a foe between the hand and the muzzle takes the shot
      for (let k = 1, n = Math.ceil(g.len / 3); k <= n && !hit; k++) { b.px = b.x; b.py = b.y; b.x = g.x + (g.tx - g.x) * k / n; b.y = g.y + (g.ty - g.y) * k / n; hit = bulletHitsEnemy(b); }
      if (!hit) { b.px = b.x = g.tx; b.py = b.y = g.ty; bullets.push(b); }
    }
    flashes.push({ x: g.tx, y: g.ty, dx: g.dx, dy: g.dy, t: 0, big: Wp.pellets > 1 }); noise(g.tx, true);
    emit('shot', { by: 'hero', weapon: hero.weapon, w: Wp.id, x: g.tx, y: g.ty, dir: ctl.face, pellets: Wp.pellets, auto: !!Wp.auto });   // a shot: every window near goes dark
    particles.push({ x: g.x, y: g.y - 1, vx: -ctl.face * (25 + simRand() * 30), vy: -50 - simRand() * 40, life: 0.7, c: PAL.gold });   // spent shell
    // recoil: the gun kicks, the muzzle climbs (the machine gun keeps climbing while you hold), the body is pushed back
    if (Wp.auto) { if ((gun.burst = (gun.burst || 0) + 1) >= 6) emit('feat', 'burst'); if (ctl.air) emit('feat', 'airfire'); }
    else { emit('feat', 'fire3'); if (!ctl.air && ctl.spd > WALK + 10) emit('feat', 'runfire'); }
    gun.cd = Wp.cd; gun.recoil = Wp.auto ? 0.7 + simRand() * 0.3 : 1;
    gun.climb = Math.min(0.2, gun.climb + Wp.climb);
    if (ctl.air && !Wp.auto) ctl.push = Math.min(ctl.push + Wp.push, 90);   // feet stay planted on the ground; only a shotgun blast shoves you in the air
    if (ctl.air && Wp.pellets > 1) ctl.vu += 25;
    if (Wp.pellets > 1) { gun.pumpT = 0; if (!reduceMotion) cam.shake = Math.max(cam.shake, 0.1); }
    else if (!reduceMotion) cam.shake = Math.max(cam.shake, 0.025);
    if (Wp.ammo && charge[hero.weapon] <= 0) outOfAmmo();
  }
  function bulletStep(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.px = b.x; b.py = b.y; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      let dead = b.life <= 0 || b.x < 0 || b.x > W || b.y < -40;
      if (!dead) for (const s of SURF) {   // a box's top is no ledge for a bullet: the box itself takes the hit below
        if (!s.box && b.x >= s.x0 && b.x <= s.x1 && ((b.py < s.y && b.y >= s.y) || (s !== GROUND_S && b.y >= s.y && b.y <= s.y + 4))) { dead = true; puff(b.x, s.y - 1); break; }
      }
      if (!dead && bulletHitsEnemy(b)) dead = true;
      if (!dead) for (const o of objs) {
        if (segHitsObj(b.px, b.py, b.x, b.y, o, 1)) {
          const sp = Math.hypot(b.vx, b.vy), k = b.power / o.m * 1.3;
          o.vx += b.vx / sp * k; o.vy += b.vy / sp * k - 25; o.av += (b.vx > 0 ? 1 : -1) * k * 0.05; o.flash = 0.04; o.safeT = 0.3;
          landed++; puff(b.x, b.y); dead = true; damageObj(o, b.power, b.vx > 0 ? 1 : -1); break;
        }
      }
      if (!dead && bagTouch(b.x, b.y)) { bagHit(b.x, b.y, b.vx > 0 ? 1 : -1, b.power * 1.3, true); dead = true; }
      if (dead) bullets.splice(i, 1);
    }
  }
  // a weapon hitting the ground: shockwave, dust, and loose objects nearby jump
  function slam(x, y, radius, k) {
    for (const e of enemies) if (!e.dead && !e.down && Math.abs(e.x - x) < radius && Math.abs(e.y + 2 - y) < 8) damageEnemy(e, Math.round(18 * k), Math.sign(e.x - x) || 1, 160 * k, 0.8, e.x, e.y - 8 * e.s, false);
    waves.push({ x, y: y - 1, t: 0 });
    dust(x - 4, y - 1, 6); dust(x + 4, y - 1, 6);
    hitStop = Math.max(hitStop, 0.06);
    shakeIt(0.15 * k, 3);
    for (const o of objs) {
      const dx = o.x - x;
      if (Math.abs(dx) < radius && Math.abs(o.y + o.r - y) < 6) {
        o.vy -= 140 * k / Math.sqrt(o.m); o.vx += Math.sign(dx || 1) * 70 * k / Math.sqrt(o.m); o.av += Math.sign(dx) * 6; o.flash = 0.05; o.safeT = 0.5; landed++;
      }
    }
  }

  // ---------- enemies: goons in each stage, a boss at the far end; blood on every hit ----------
  const GORE = new Uint32Array(W * H);   // blood stains painted onto the world
  const BLOOD = [C('#b3122a'), C('#7d0d1e'), C('#e02a3c')], BLOOD_D = C('#5a0a14'), STAIN_L = C('#6e3a42');   // STAIN_L: the faint trail a run of blood leaves
  const BCW = (W >> 4) + 1, BCAP = new Uint8Array(BCW * ((H >> 4) + 1));   // stains per 16-px cell on props: capped so a car does not turn into paint
  const VEH = [[166, 278], [1124, 1240], [1436, 1536], [2006, 2120]], VCAP = new Uint8Array(8);   // the parked vehicles: at most 12 single dark pixels of blood on each
  const vehAt = x => { for (let i = 0; i < VEH.length; i++) if (x >= VEH[i][0] && x <= VEH[i][1]) return i; return -1; };
  // blood that reaches the street smears down the wet stones and runs into the puddles, staining them red
  // blood in water puddles (per column); blood pooling on dry stones: a field over the street, row d (0 at the wall... STREET at the
  // front edge) by column, so a pool spreads across all the lanes as well as along the street
  const PUD_COL = new Uint8Array(W), PUD_BLOOD = new Float32Array(W), BPOOL = new Float32Array(W * (STREET + 1));
  for (let d = 0; d <= STREET; d++) for (let x = 0; x < W; x++) if (PUDDLE[d * W + x]) PUD_COL[x] = 1;
  function stain(x, y) {
    x = Math.floor(x); y = Math.floor(y);
    if (y >= GROUND - 2 && y <= GROUND + 1 && x > 10 && x < W - 11) {   // the street: no dots, the blood goes into a pool
      let wet = false;
      for (let k = -2; k <= 2; k++) if (PUD_COL[x + k]) { PUD_BLOOD[x + k] = Math.min(0.85, PUD_BLOOD[x + k] + 0.06); wet = true; }
      if (wet) return;
      // the drop lands somewhere across the street's depth (mostly mid-street, where the fighting is) and runs into a pool nearby
      const d = clamp(Math.round(STREET / 2 + (simRand() + simRand() + simRand() - 1.5) * STREET * 0.55), 1, STREET), row = d * W;
      let best = x;
      for (let k = 1; k <= 8; k++) { if (BPOOL[row + x - k] > 0.04) { best = x - k + 1; break; } if (BPOOL[row + x + k] > 0.04) { best = x + k - 1; break; } }
      BPOOL[row + best] = Math.min(1.2, BPOOL[row + best] + 0.06);
      return;
    }
    if (x >= 0 && y >= 0 && x < W && y < H) {
      const i = y * W + x;
      const v = PROPS[i] && !flags.club ? vehAt(x) : -1;
      if (v >= 0) { if (VCAP[v] >= 12) return; VCAP[v]++; gore(i, BLOOD_D); return; }   // a vehicle: single pixels of the darkest blood, no runs, 12 at most
      if (flags.club && !PROPS[i]) { const ci = (y >> 4) * BCW + (x >> 4); if (BCAP[ci] >= 14) return; BCAP[ci]++; gore(i, BLOOD_D); return; }   // the club: a few dark spots
      // walls, lamp posts and the scaffold: dark splashes, never bright paint; many run down to the street, leaving a light stain
      gore(i, simRand() < 0.5 ? BLOOD[1] : BLOOD_D);
      if (simRand() < 0.45 && drips.length < 900) drips.push({ x, y, a: 0, vol: 0.5 + simRand() * 0.9, wall: !PROPS[i] });
    }
  }
  // stains on the walls, the vehicles, the lamp posts fade: fresh for a while, then they blend into what is under them and are gone
  // (GORE_FADE s after they were made). Each stained pixel keeps its colour and its time; a sweep a few times a second fades them.
  const GORE_FADE = 30, GORE_HOLD = 0.35, gTime = new Float32Array(W * GROUND), gCol = new Uint32Array(W * GROUND), gList = [], gIn = new Uint8Array(W * GROUND);
  let gSweepT = 0;
  function gore(i, c) {
    GORE[i] = c;
    if (i >= W * GROUND) return;   // (the street's blood is the pool, not paint)
    gTime[i] = simTime; gCol[i] = c;
    if (!gIn[i]) { gIn[i] = 1; gList.push(i); }
  }
  function goreFade(dt) {
    if ((gSweepT -= dt) > 0) return;
    gSweepT = 0.25;
    for (const e of enemies) bodyStainFade(e, 0.25);
    const wash = 0.25 * rain.k * 2.8;   // rain washes the stains off faster: in a downpour they are gone in about a quarter of the time
    for (let k = gList.length - 1; k >= 0; k--) {
      const i = gList[k];
      if (wash > 0) gTime[i] -= wash;
      const age = simTime - gTime[i], f = (age / GORE_FADE - GORE_HOLD) / (1 - GORE_HOLD);
      if (f <= 0) continue;
      if (f >= 1 || !stat[i]) {   // gone: the vehicle and club caps free a place again
        GORE[i] = 0; gIn[i] = 0; gList[k] = gList[gList.length - 1]; gList.pop();
        const x = i % W, y = (i - x) / W, v = PROPS[i] && !flags.club ? vehAt(x) : -1;
        if (v >= 0) VCAP[v] = Math.max(0, VCAP[v] - 1); else if (flags.club && !PROPS[i]) { const ci = (y >> 4) * BCW + (x >> 4); BCAP[ci] = Math.max(0, BCAP[ci] - 1); }
        continue;
      }
      const a = gCol[i], b = stat[i];   // blend the stain toward the surface under it
      const r = (a & 255) + ((b & 255) - (a & 255)) * f, g = (a >> 8 & 255) + ((b >> 8 & 255) - (a >> 8 & 255)) * f, bl = (a >> 16 & 255) + ((b >> 16 & 255) - (a >> 16 & 255)) * f;
      GORE[i] = (255 << 24 | Math.round(bl) << 16 | Math.round(g) << 8 | Math.round(r)) >>> 0;
    }
  }
  // blood on props runs down slowly, leaving a streak; rain thins it and makes it run faster; off an edge it drips to the street
  const drips = [];
  function dripStep(dt) {
    const sp = 2.5 + rain.k * 22;
    for (let i = drips.length - 1; i >= 0; i--) {
      const d = drips[i];
      d.a += sp * dt * (0.6 + d.vol * 0.6);
      while (d.a >= 1) {
        d.a -= 1;
        const i0 = d.y * W + d.x, ny = d.y + 1;
        if (d.wall) {   // down the wall: a light stain where it ran, the wet drop below; at the foot of the wall it joins a pool in the street
          if (ny >= GROUND - 1) { stain(d.x, GROUND); d.vol = 0; break; }
          gore(i0, STAIN_L); gore(ny * W + d.x, BLOOD[1]); d.y = ny; d.vol -= 0.012 * (1 - rain.k * 0.6);
          if (d.vol <= 0) break;
          continue;
        }
        gore(i0, STAIN_L);   // down a lamp post or a pole: the same light stain where it ran
        if (ny < H && PROPS[ny * W + d.x]) { d.y = ny; gore(ny * W + d.x, BLOOD[1]); d.vol -= 0.025 * (1 - rain.k * 0.6); }
        else {   // over the edge: a drop falls to the street and joins the pool
          particles.push({ x: d.x + 0.5, y: d.y + 1, vx: 0, vy: 10, life: 1.6, c: BLOOD[1], blood: true });
          d.vol = 0; break;
        }
        if (d.vol <= 0) break;
      }
      if (d.vol <= 0) drips.splice(i, 1);
    }
  }
  function bloodFlow(dt) {   // red spreads through each puddle and slowly thins in the rain
    const k = Math.min(0.5, 3 * dt), thin = 1 - 0.01 * rain.k * dt;
    for (let x = 1; x < W - 1; x++) {
      if (!PUD_COL[x]) continue;
      if (PUD_COL[x + 1]) { const f = (PUD_BLOOD[x] - PUD_BLOOD[x + 1]) * k * 0.5; PUD_BLOOD[x] -= f; PUD_BLOOD[x + 1] += f; }
      PUD_BLOOD[x] *= thin;
    }
    // a blood pool runs outward while it is deep (along the street and across its lanes), joins pools beside it, and drains into a
    // water puddle it reaches
    for (let d = 1; d <= STREET; d++) for (let x = 1; x < W - 1; x++) {
      const i = d * W + x, v = BPOOL[i]; if (v < 0.02) continue;
      for (const n of [i - 1, i + 1, d > 1 ? i - W : -1, d < STREET ? i + W : -1]) {
        if (n < 0) continue;
        if (PUDDLE[n]) { const f = v * k * 0.3; BPOOL[i] -= f; PUD_BLOOD[n % W] = Math.min(0.85, PUD_BLOOD[n % W] + f * 0.6); continue; }
        const dd = BPOOL[i] - BPOOL[n]; if (dd > 0.04) { const f = (dd - 0.04) * k * 0.3; BPOOL[i] -= f; BPOOL[n] += f; }
      }
      if (rain.k > 0.2) BPOOL[i] *= 1 - 0.004 * rain.k * dt;
    }
    for (let x = 0; x < W; x++) BPOOL[x] = BPOOL[W + x];   // the kerb's lip shows the first row
  }
  // flags: noBleed = the opening's body (no blood in the air); wasted = Wicked: knocked out, the run is over; demo = the demo drives the fighter;
  // club = the fight is inside Club Noir; attract = the title screen's attract demo
  const flags = { noBleed: false, wasted: false, demo: false, club: false, attract: false };
  function bleed(x, y, dirx, n, force = 1) {
    if (flags.noBleed) return;
    for (let i = 0; i < n; i++) particles.push({ x, y, vx: dirx * (30 + simRand() * 110) * force + (simRand() - 0.5) * 60, vy: -20 - simRand() * 100 * force,
      life: 1.6, c: BLOOD[Math.floor(simRand() * 3)], blood: true });
    for (let i = 0; i < n * 0.5 * force; i++) {   // the spray that reaches the wall behind: a splash of dark drops, flung outward
      const sx = x + dirx * (3 + simRand() * 20) + (simRand() - 0.5) * 6, sy = y - 4 + (simRand() - 0.4) * 18;
      if (sy < GROUND - 3) stain(sx, sy);
    }
  }
  // blood that sticks to a goon: spots pinned to a limb (segment a-b, at t along it, o across it). They fade like the wall stains
  // (GORE_HOLD, GORE_FADE, washed faster in the rain), thinning out spot by spot. Both views draw them.
  const BSEG = [[1, 2, 1], [1, 5, 0.5], [5, 6, 0.5], [2, 9, 0.6], [9, 10, 0.6]], BS_MAX = 48;   // [a, b, half-width / tw]: the torso and the near limbs (the far ones are behind him)
  function bodyStain(e, x, y, n) {
    const J = e.dead ? e.pts : e.J; if (!J || flags.noBleed) return;
    e.bs ??= [];
    for (let k = 0; k < n; k++) {
      const px = x + (simRand() - 0.5) * 6 * e.s, py = y + (simRand() - 0.3) * 8 * e.s;
      let best = null, bd = 1e9;
      for (const sg of BSEG) {
        const A = J[sg[0]], B = J[sg[1]], dx = B.x - A.x, dy = B.y - A.y, l2 = dx * dx + dy * dy || 1, t = clamp(((px - A.x) * dx + (py - A.y) * dy) / l2, 0, 1);
        const d = Math.hypot(A.x + dx * t - px, A.y + dy * t - py); if (d < bd) { bd = d; best = { a: sg[0], b: sg[1], t, w: sg[2] }; }
      }
      best.o = (simRand() - 0.5) * 1.6; best.c = BLOOD[Math.floor(simRand() * 3)]; best.t0 = simTime; best.k = simRand();
      if (e.bs.length >= BS_MAX) e.bs.shift();
      e.bs.push(best);
    }
  }
  function bodyStainFade(e, dt) {   // the same clock as goreFade: hold, then fade; the rain moves the clock on
    if (!e.bs) return;
    const wash = rain.k * 2.8 * dt;
    for (let i = e.bs.length - 1; i >= 0; i--) {
      const b = e.bs[i]; if (wash > 0) b.t0 -= wash;
      if ((simTime - b.t0) / GORE_FADE > GORE_HOLD + (1 - GORE_HOLD) * b.k) e.bs.splice(i, 1);   // each spot goes at its own point in the fade
    }
  }
  function bodyStainAt(e, J, b) {   // where a spot is now, and the limb's direction
    const A = J[b.a], B = J[b.b], [ux, uy] = norm(B.x - A.x, B.y - A.y), hw = (b.a === 1 && b.b === 2 ? 2.6 * e.bw : 1.2) * e.s * b.o * b.w;
    return [A.x + (B.x - A.x) * b.t - uy * hw, A.y + (B.y - A.y) * b.t + ux * hw];
  }
  // enemy looks: mid-tone colors that still read under the night lighting; every head is a box with a flat top and a square jaw
  const pick = a => a[Math.floor(simRand() * a.length)];
  // lunge = a dash from mid range that ends in the heavy punch; w = the strike lands with the held weapon's tip
  const THR = { a1s: 3.5, a1e: 1.2, lean: -0.15, rx: -1, a0s: 1.2, a0e: 0.4 }, THR_OUT = { a1s: 1.5, a1e: 0.1, lean: 0.3, rx: 1.6, a0s: -0.4, a0e: 0.5 };
  const AIMP = { a1s: 1.57, a1e: 0, a0s: 1.3, a0e: 0.4, rx: -0.3, head: 0.05, lean: 0.02 };
  const EMOVES = { jab: { ...MOVES.lp1, limb: 6 }, punch: { ...MOVES.hp, limb: 4, heavy: true }, slam: { ...MOVES.ah, limb: 6, heavy: true },
    lunge: { ...MOVES.hp, limb: 4, heavy: true },
    stab: { ...MOVES.lp1, limb: 6, w: true }, slash: { ...MOVES.ks0, limb: 6, w: true }, chop: { ...MOVES.al, limb: 6, w: true }, hchop: { ...MOVES.kh, limb: 6, w: true, heavy: true },
    throw: { dur: 0.36, win: [9, 9], keys: [K(0, THR), K(0.07, THR_OUT), K(0.16, THR_OUT), K(0.36, {})] },
    shoot: { dur: 0.4, win: [9, 9], keys: [K(0, AIMP), K(0.04, { ...AIMP, a1s: 1.95, a1e: 0.25, lean: -0.08 }), K(0.22, AIMP), K(0.4, {})] } };
  const EHURT = mod(GUARD, { lean: -0.35, head: 0.35, rx: -2, a0s: -0.5, a0e: 0.6, a1s: 0.3, a1e: 0.5 });
  // AI poses: every committed move has a readable tell
  const EP = {
    wind: mod(GUARD, { lean: -0.28, rx: -2.2, ry: 14.8, a1s: -0.3, a1e: 2.4 }),                                // rock back, front fist cocked by the ear
    lungeW: mod(GUARD, { ry: 13.2, lean: 0.5, head: -0.3, rx: -1.5, f0x: -8, f1x: 5, a0s: 0.1, a0e: 2.4, a1s: 1.3, a1e: 1.6 }),   // coil low
    raise: mod(GUARD, { a1s: 2.9, a1e: 0.5, lean: -0.12, rx: -0.8, ry: 15.2, a0s: 0.6 }),                       // weapon up over the head
    raise2: mod(GUARD, { a1s: 3.1, a1e: 0.35, a0s: 2.9, a0e: 0.5, lean: -0.2, rx: -1, ry: 15 }),                // two-hand overhead
    throwW: mod(GUARD, THR), aim: mod(GUARD, AIMP),
    guard: mod(GUARD, { ry: 15.1, lean: 0.04, head: 0.12, a0s: 1.2, a0e: 2.55, a1s: 1.45, a1e: 2.3 }),        // fists up at the face
    hop: mod(GUARD, { ry: 12.4, lean: 0.4, head: -0.2, f0x: -5, f1x: 4, a0s: -0.6, a0e: 0.5, a1s: -0.3, a1e: 0.6 }),   // squat before a jump
    tired: mod(IDLE, { ry: 14.2, lean: 0.6, head: -0.15, f0x: -5, f1x: 5, a0s: 0.25, a0e: 0.2, a1s: 0.35, a1e: 0.3 }), // gasping: punish now
    roar: mod(IDLE, { ry: 16.4, lean: -0.25, head: -0.45, f0x: -7, f1x: 6, a0s: -2.4, a0e: -0.5, a1s: 2.4, a1e: 0.5 }),
    chargeW: mod(GUARD, { ry: 12.6, lean: 0.75, head: -0.45, rx: -2, f0x: -10, f1x: 4, a0s: -0.5, a0e: 0.8, a1s: 0.9, a1e: 1.8 }),
    jumpW: mod(IDLE, { ry: 10.5, lean: 0.35, head: -0.25, f0x: -6, f1x: 5, a0s: 2.7, a0e: 0.35, a1s: 2.8, a1e: 0.3 }),   // arms overhead, deep squat
    jumpA: mod(AIR, { a0s: 2.9, a0e: 0.2, a1s: 3.0, a1e: 0.2, f0y: 8, f1y: 8 }),
  };
  const EWIND = { lunge: EP.lungeW, chop: EP.raise, hchop: EP.raise2, throw: EP.throwW, shoot: EP.aim,
    punch: mod(MOVES.hp.keys[1][1], { lean: -0.28, rx: -2.2, ry: 14.8, a0s: -0.3, a0e: 2.4 }),   // rear fist cocked way back
    slam: MOVES.ah.keys[1][1], slash: MOVES.ks0.keys[1][1] };
  // [feel] the held wind pose IS the anticipation: each strike starts there and goes straight to contact (no second wind-up).
  // The keys are cut at the one before the contact key and shifted to start at 0; t0 = how much was cut
  function eTrim(name) {
    const M = EMOVES[name], ks = M.keys; let i = 1;
    while (i < ks.length - 1 && ks[i][2] !== 'in') i++;
    const t0 = ks[i - 1][0], sh = t => Math.max(0, +(t - t0).toFixed(4));
    EMOVES[name] = { ...M, t0, pre: 0, dur: sh(M.dur), win: [sh(M.win[0]), sh(M.win[1])],
      keys: [[0, (EWIND[name] || EP.wind).slice()], ...ks.slice(i).map(k => [sh(k[0]), k[1], k[2]])] };
  }
  for (const n of ['jab', 'stab', 'punch', 'slam', 'slash', 'chop', 'hchop']) eTrim(n);
  // the lunge dashes in its coil, then strikes: the coil is held through the dash
  EMOVES.lunge = { ...EMOVES.lunge, t0: 0, pre: 0.14, keys: [[0, EP.lungeW.slice()], [0.14, EP.lungeW.slice()], ...MOVES.hp.keys.slice(2)] };
  const CMB = ROLE.brawler.cmb;   // goon strings
  const EFX = { sweat: C('#9fd3ff'), steam: C('#c9c4d4') };
  // difficulty: the goons' aggression doubles at each step (A = 1, 2, 4, 8). They rest 1/A as long between attacks, more of them
  // swing at once, they close in faster and back off less. The regen drops with it; on Wicked a K.O. ends the run. The demo plays Hard.
  let diffSel = 1;
  const DIF = () => DIFFS[flags.demo ? 2 : diffSel], dLv = () => Math.log2(DIF().A);   // dLv: 0 .. 3
  // enc: the encounter. eTokN / eTokMax / eShotN = melee / ranged attack tokens in use; eSideT = side re-plan timer; eHitKind: 1 = melee hit, 2 = bullet;
  // boss, bossBeaten; arena = the boss arena; spawnT, arenaSpawned = the arena's spawn clock and count; introT = seconds since the boss entrance's lights cut (-1: none)
  const enc = { eTokN: 0, eTokMax: 2, eShotN: 0, eSideT: 0, eHitKind: 0, boss: null, bossBeaten: false, arena: null, spawnT: 0, arenaSpawned: 0, introT: -1 };
  const enemies = [], zoneAlive = {}, zoneN = {}, eshots = [], spawnFx = [];   // spawnFx: a door that just opened for a goon (kind, x, t)
  // hero: the fighter's own state. hp; invT = time hits still miss; mode = 'anim' | 'rag' | 'getup'; ko; act / actT = the move or
  // transition playing and its clock; atkId = a count of attacks (one hit per enemy per attack); weapon = index into WEAPONS; bandT = bandage regen time left
  const hero = { hp: 100, invT: 0, mode: 'anim', ko: false, act: null, actT: 0, atkId: 0, weapon: 0, bandT: 0 };
  const capsule = J => [J[0].x, J[0].y, (J[8].x + J[10].x) / 2, (J[8].y + J[10].y) / 2];
  // every goon gets a gangster name; the boss's name never changes
  const NM_FIRST = ['Vinnie', 'Sal', 'Tony', 'Paulie', 'Carmine', 'Frankie', 'Nicky', 'Joey', 'Lou', 'Rocco', 'Mickey', 'Benny', 'Dino', 'Gino', 'Sonny', 'Luca', 'Enzo', 'Bruno', 'Sergei', 'Viktor', 'Dmitri', 'Klaus', 'Jacques', 'Fritz', 'Seamus', 'Eddie', 'Marcel', 'Otto'];
  const NM_NICK = ['Knuckles', 'Two-Teeth', 'The Rat', 'Slick', 'Fat Sal', 'Scarface', 'Hammer', 'Mad Dog', 'Lucky', 'Weasel', 'Ironjaw', 'Tommy', 'Snake', 'Red', 'Spider', 'The Bull', 'Ice', 'Smokes', 'Pipes', 'Priest', 'Brass'];
  const NM_LAST = ['Russo', 'Moretti', 'Romano', 'Bianchi', 'Esposito', 'Costa', 'Volkov', 'Kowalski', 'Dubois', 'Brenner', 'Kelly', 'Novak', 'Petrov', 'Marino', 'Greco', 'De Luca', 'Rossi', 'Sorrento', 'Lemaire', 'Haas'];
  const pickN = a => a[Math.floor(simRand() * a.length)];
  const BOSS_NAME = 'Don Lucien Malaspina';   // 20 characters, the same every time
  const gangName = () => {   // at most 10 characters: a first and last name when they fit, else a nickname
    const full = `${pickN(NM_FIRST)} ${pickN(NM_LAST)}`;
    return full.length <= 10 && simRand() < 0.6 ? full : pickN(NM_NICK);
  };
  let hudTarget = null, hudTargetT = 0;
  const BODY_MAX = 99;
  const LOOK_X = { ...LOOK, ...P9.SALT_LOOKS };   // the street's outfits and Pier 9's Saltmen
  // opts (Pier 9): { role, look, R: role overrides } for a Saltman; { boss: P9.MARCHETTI } for a level boss. The street passes none.
  function spawnEnemy(type, x, zone, opts) {
    const T = ETYPE[type];
    const e = { type, ...T, x, y: GROUND - 2, vx: 0, vy: 0, air: false, face: x > P[2].x ? -1 : 1, hp: T.hp, maxHp: T.hp, zone,
      q: GUARD.slice(), phase: simRand(), act: null, actT: 0, cdT: (0.6 + simRand()) / DIF().A, hurtT: 0, flash: 0, hitBy: -1, struck: false, slammed: false,
      fight: false, dead: false, deadT: 0, pts: null, J: null, pal: null };
    // brain: agg 0 = cautious (keeps far, blocks a lot), 1 = aggressive (pushes in, long strings, lunges)
    Object.assign(e, { agg: type === 'boss' ? 1 : 1 - (1 - simRand()) * 0.65 ** dLv(), seed: simRand(), tok: false, tokT: 0, side: e.face > 0 ? -1 : 1, slot: 0, flankT: 0,
      tx: null, run: 1, guardT: 0, react: null, reactT: 0, seenAtk: -1, punId: -1, punish: 0, aimT: 0, dodgeCd: 0, jumpCd: 0, crouchT: 0, jvx: 0, jvy: 0,
      combo: null, ci: 0, feint: false, fled: false, retreatT: 0, sp: null, spT: 0, recT: 0, stunT: 0, leapt: false, jx: 0, hitP: false, ph: 1, bigCd: 2.5, mark: 0, ay: 0, muz: 0, blockN: 0,
      fkX: 0, fkV: 0, slide: 0, down: false, downT: 0, gu: null, pendH: null, pendAtk: -1 });
    // role and look: zone and spawn order pick the role, the role picks an outfit; build, colors and facial hair vary per goon
    const n = zone != null ? (zoneN[zone] = (zoneN[zone] || 0) + 1) - 1 : 0;
    const role = opts && opts.role ? opts.role : type === 'boss' ? 'brawler' : zone === 'arena' ? (n < AROLES.length ? AROLES[n] : pick(AMIX)) : ZROLES[zone] ? ZROLES[zone][n % ZROLES[zone].length] : 'brawler';
    const R = opts && opts.boss ? { ...ROLE.machete, ...opts.boss.R } : opts && opts.R ? { ...ROLE[role], ...opts.R } : ROLE[role];
    const lk = opts && opts.boss ? LOOK_X[opts.boss.look] : opts && opts.look ? LOOK_X[opts.look] : type === 'boss' ? LOOK.boss : LOOK[pick(R.looks)], B = BUILD[lk.build];
    e.role = role; e.R = R; e.look = lk; e.bw = B.bw; e.hk = B.hk;
    e.hair = pick(lk.hair); e.beard = pick(lk.beards); e.scar = type === 'boss' || simRand() < 0.3; e.gloves = type === 'boss' || lk.top === 'coat' || simRand() < 0.25;
    const sk = type === 'boss' ? ['#a68a72', '#7a6250'] : pick(EPAL.skins), tc = pick(lk.cols), pc = pick(lk.pants), hc = type === 'boss' ? '#4a3020' : pick(EPAL.hair);
    e.pal = { skin: C(sk[0]), skinB: C(sk[1]), top: C(tc[0]), topB: C(tc[1]), pants: C(pc), pantsB: eShade(C(pc), 0.72),
      hair: C(hc), loud: C(pick(EPAL.loud)), shoe: C(lk.boots || EPAL.shoe), glove: C(EPAL.glove), belt: type === 'boss' ? C('#e8b43a') : C('#2a2228') };
    if (lk.hat) { e.pal.hat = C(lk.hat); e.pal.hatB = eShade(e.pal.hat, 0.72); }
    if (lk.apron) e.pal.apron = C(lk.apron);
    if (type === 'goon') {
      if (zone === 'arena') e.agg = Math.min(1, e.agg * 0.7 + n * 0.04);   // later arena help is bolder
      Object.assign(e, { reach: R.reach * B.s, dmg: R.dmg, heavyDmg: R.heavyDmg, windup: R.windup, hp: Math.round(R.hp * B.hp), s: B.s });
      e.maxHp = e.hp; e.speed = T.speed * B.spd * (0.9 + 0.25 * e.agg); e.stance = e.reach + (16 + 16 * (1 - e.agg)) / (1 + 0.6 * dLv());
    } else e.s = B.s;
    if (opts && opts.boss) {   // a level boss: its own stats (hp by difficulty), size and name
      const Bd = opts.boss;
      Object.assign(e, { hp: Bd.hp[diffSel], maxHp: Bd.hp[diffSel], s: Bd.s, m: Bd.m, speed: Bd.speed, reach: Bd.reach, dmg: Bd.dmg, heavyDmg: Bd.heavyDmg, poise: Bd.poise,
        windup: Bd.windup, cd: Bd.cd.slice(), kind: 'marchetti', hookCd: 3.5, hook: null });
    }
    e.cons = CONSTRAINTS.map(([a, b, lo, hi]) => [a, b, lo * e.s, hi * e.s]);
    poseEnemy(e, 0);
    enemies.push(e);
    if (zone != null) zoneAlive[zone] = (zoneAlive[zone] || 0) + 1;
    e.name = opts && opts.boss ? opts.boss.name : type === 'boss' ? BOSS_NAME : gangName();
    if (typeof zone === 'number' && zone >= 3) { const k = 1 + 0.15 * (zone - 2); e.dmg = Math.round(e.dmg * k); e.heavyDmg = Math.round(e.heavyDmg * k); }   // later stages hit harder: a ramp up to the boss
    emit('spawn', { enemy: e, type, source: zone, x });
    return e;
  }
  // pose: attack keyframes, a stagger, or a walk that turns into a guard up close; then scale the skeleton about the feet
  function poseEnemy(e, dt) {
    let t, air = e.air;
    if (e.act && e.actT >= 0) t = keyAt(EMOVES[e.act].keys, e.actT);
    else if (e.act) {   // wind-up: rock back, coil low, raise the weapon, cock the arm or aim; a held tell trembles with the load
      t = (EWIND[e.act] || EP.wind).slice();
      if (e.actT < -0.08) { t[0] += 0.35 * Math.sin(simTime * 47 + e.seed * 9); t[2] += 0.025 * Math.sin(simTime * 39 + e.seed * 5); }
    }
    else if (e.hurtT > 0) {   // stagger: the back foot reaches back to catch the shove, the front one drags
      const sl = clamp(Math.abs(e.vx) / 80, 0, 1); t = lerpA(GUARD, EHURT, e.hurtK || 1);   // a jab only rocks the head back t[4] -= 3 * sl; t[7] += 1.2 * sl;
      if (!e.air && sl > 0.4 && simRand() < 0.3) dust(e.x - e.face * 2, e.y + 1, 1);
    }
    else if (e.sp === 'roar') t = EP.roar;
    else if (e.sp === 'charge' && e.spT < 0) t = EP.chargeW;
    else if (e.sp === 'jslam') { t = e.leapt ? EP.jumpA : EP.jumpW; air = false; }
    else if (e.recT > 0) { t = EP.tired.slice(); t[1] += 0.5 * Math.sin(simTime * 9); }
    else if (e.crouchT > 0) t = EP.hop;
    else if (e.guardT > 0) t = EP.guard;
    else {
      const w = clamp(Math.abs(e.vx) / e.speed, 0, 1), ph = e.phase * 2 * Math.PI, sn = Math.sin(ph), near = e.fight;
      t = mod(near ? GUARD : IDLE, {
        f0x: (near ? -6 : -2) * (1 - w) + 6 * w * sn, f0y: 2.5 * w * Math.max(0, Math.cos(ph)),
        f1x: (near ? 4 : 2) * (1 - w) - 6 * w * sn, f1y: 2.5 * w * Math.max(0, -Math.cos(ph)),
        ry: (near ? 15.6 : 17.2) - 0.5 * w + 0.6 * w * Math.cos(2 * ph), lean: (near ? 0.1 : 0) + 0.1 * w });
      if (!near) { t[8] = 0.05 + 0.45 * w * sn; t[10] = 0.05 - 0.45 * w * sn; t[9] = t[11] = 0.3; }
      if (e.sp === 'charge') { t[2] = 0.7; t[3] = -0.4; t[8] = -0.6; t[10] = 1.35; t[11] = 1.3; }   // head down, shoulder first
    }
    if (air) t = mod(t, { f0y: 6, f1y: 5, a0s: 1.2, a1s: 1.6 });
    // the tell is reached in ~0.06 s and the strike tracks its keys closely; everything else blends softer
    // [feel] just up off the floor: settle out of the rise pose slowly, no snap to the stance
    if (e.riseT > 0) e.riseT -= dt;
    const rate = e.act ? (e.actT < 0 ? 50 : 60) : e.riseT > 0 ? 12 * Math.min(1, 0.3 + (0.35 - e.riseT) / 0.12) : 25;   // eased in, so the first frame does not jump either
    e.q = dt ? lerpA(e.q, t, 1 - Math.exp(-rate * dt)) : t.slice();
    // [feel] flinch spring on top of any pose: every landed hit snaps the body back (the boss too, when his poise soaks the stagger)
    if (dt && (e.fkX || e.fkV)) { e.fkV -= (900 * e.fkX + 24 * e.fkV) * dt; e.fkX += e.fkV * dt; if (Math.abs(e.fkX) < 1e-3 && Math.abs(e.fkV) < 0.02) e.fkX = e.fkV = 0; }
    let q = e.q;
    if (e.fkX) {
      const x = e.fkX; q = q.slice();
      if (e.fkZone === 'head') { q[0] -= 0.8 * x; q[2] -= 0.7 * x; q[3] += 1.2 * x; q[8] -= 0.7 * x; q[10] -= 0.7 * x; }   // head snapped back, arms fly up
      else if (e.fkZone === 'legs') { q[1] -= 7 * x; q[2] += 0.35 * x; q[4] -= 2.5 * x; q[6] += 1.5 * x; q[8] += 0.4 * x; q[10] -= 0.3 * x; }   // knees buckle, he drops and stumbles
      else { q[0] -= 2.2 * x; q[2] += 1.1 * x; q[3] -= 0.35 * x; q[8] += 0.45 * x; q[10] += 0.45 * x; }   // winded: folds over the gut, hips pushed back
    }
    const s = e.s;
    e.J = fk(q, e.x, e.y, e.face).map(([x, y]) => ({ x: e.x + (x - e.x) * s, y: e.y + (y - e.y) * s }));
  }
  // knocked down by a sweep, a heavy punch or an overhead chop: a ragdoll that lands, lies still a beat, then gets up through pose params
  const KD_MOVES = /^(sweep|hp|ah|kh|aw|aair)$/;
  function knockDown(e, dirx, power, ctx) {
    crowdReact(e.x, 300, true);   // a goon taken off his feet: the crowd cheers
    e.down = true; e.downT = 0; e.gu = null; e.act = null; e.hurtT = 0; e.guardT = 0; e.crouchT = 0; e.react = null; e.feint = false; e.fkX = e.fkV = 0;
    eRelease(e); e.face = -dirx || e.face; e.cdT = Math.max(e.cdT, 0.6);
    const chop = ctx !== 'sweep' && ctx !== 'hp', sweep = ctx === 'sweep', k = Math.min(power, 320) / e.m * 0.6;   // (taken off his feet, not launched)
    // sweep: the feet pop up and out, he goes over backward onto his back; punch: blown back off his feet; chop: crumples where he stands
    const bv = sweep ? [dirx * 0.1 * k, -0.03 * k] : chop ? [dirx * 0.08 * k, 0.1 * k] : [dirx * 0.26 * k, -0.04 * k];
    e.pts = e.J.map((j, i) => {
      let vx = bv[0], vy = bv[1];
      if (sweep && i >= 7) { vx -= dirx * (i === 8 || i === 10 ? 0.4 : 0.22) * k; vy -= (i === 8 || i === 10 ? 0.5 : 0.25) * k; }   // [feel] the feet pop up and out (knee high, not over his head)
      if (sweep && i === 2) vy += 0.2 * k;   // and the seat drops straight down
      if (sweep && i <= 1) { vx += dirx * 0.3 * k; vy += 0.1 * k; }
      if (!sweep && !chop && i <= 1) vx += dirx * 0.22 * k;
      if (chop && i <= 1) { vy += 0.35 * k; vx -= dirx * 0.05 * k; }
      if (chop && (i === 7 || i === 9)) vx -= dirx * 0.2 * k;   // the knees buckle
      return { x: j.x, y: j.y, px: j.x - vx * DT, py: j.y - vy * DT, im: IM[i], r: RAD[i] * e.s, fl: GROUND };
    });
    e.J = e.pts; e.vx = e.vy = 0;
  }
  function eDownStep(e, dt) {
    e.downT += dt;
    if (!e.gu) {
      eRagStep(e, dt);
      const Q = e.pts; let mv = 0;
      for (const p of Q) if (p.y >= p.fl - 0.6) p.px = p.x - (p.x - p.px) * Math.exp(-9 * dt);   // the body scrapes to a stop on the floor
      for (const p of Q) mv = Math.max(mv, Math.hypot(p.x - p.px, p.y - p.py) / dt);
      e.x = clamp(Q[2].x, enc.arena && e.zone === 'arena' || e === enc.boss ? 2440 : 8, W - 10); e.y = floorBelow(e.x, Q[2].y, 0).y - 2; e.J = Q;
      if ((e.downT > 0.9 && mv < 15) || e.downT > 2.2) {   // settled: fit the pose (unscaled about the feet) and get up
        const s = e.s; e.gu = makeGetup(Q.map(p => [e.x + (p.x - e.x) / s, e.y + (p.y - e.y) / s]), e.x, e.y, e.face);
      }
      return;
    }
    e.gu.t += dt;
    const s = e.s;
    e.J = getupJoints(e.gu, e.x, e.y, e.face).map(([x, y]) => ({ x: e.x + (x - e.x) * s, y: e.y + (y - e.y) * s }));
    if (e.gu.t >= GU_T[2]) { e.down = false; e.gu = null; e.pts = null; e.q = RISE.slice(); e.riseT = 0.35; e.vx = e.vy = 0; e.air = false; e.cdT = Math.max(e.cdT, 0.4); }
  }
  function hitsPlayer(x, y, r) {
    if (hero.mode !== 'anim' || hero.invT > 0) return false;
    const [ax, ay, bx, by] = capsule(P);
    return segDist(ax, ay, bx, by, x, y) < 4 + r;
  }
  // how a hit lands on the player: the blow, plus how fast he was moving into it, airborne or braced.
  // a light one makes him stutter back, a solid one knocks him off his feet, a big one (or a K.O.) sends him flying
  function hurtPlayer(dmg, x, y, dirx, heavy, impK = 1) {   // impK scales how hard the blow moves him (not the damage)
    if (hero.mode !== 'anim' || hero.invT > 0) return;
    hero.hp = Math.max(0, hero.hp - dmg); hero.invT = 0.45;
    const vx = ctl.air ? ctl.face * ctl.spd : ctl.face * ctl.spd, into = Math.max(0, -dirx * vx);
    const braced = hero.act === 'squat' || hero.act === 'guard' ? 0.7 : 1;
    const impact = dmg * impK * (heavy ? 1.7 : 1) * (1 + into / 55) * (ctl.air ? 1.35 : 1) * braced;
    emit('hurt', { dmg, x, y, dir: dirx, heavy: !!heavy || impact >= 18, outcome: hero.hp <= 0 ? 'ko' : impact >= 40 ? 'flying' : impact >= 18 ? 'down' : 'stagger' });
    bleed(x, y, dirx, 6 + Math.round(dmg / 2), 1 + Math.min(1, impact / 40));
    hitFx(Math.min(320, 90 + impact * 7));
    if (hero.hp <= 0 || impact >= 40) {   // sent flying
      toRag(); hits++;
      if (hero.hp <= 0) { hero.ko = true; emit('ko', { perma: !!DIF().perma }); }
      // [feel] a short, heavy arc (~0.7 s, ~100 px): readable, and the camera does not have to chase it
      const fx = dirx * Math.min(170, 110 + impact * 1.4 + into * 0.4), fy = Math.min(140, 80 + impact);
      ragG = 0.9; ragGk = 1.7;
      crowdReact(P[2].x, 0, true);   // the hero sent flying: the crowd loves it
      for (const p of P) { p.px -= fx * DT; p.py += fy * DT; }
      if (!reduceMotion) cam.shake = Math.max(cam.shake, 0.22);
    } else if (impact >= 18) {   // knocked off his feet: the legs go out from under him, he falls and gets up
      toRag(); hits++;
      const fx = dirx * (45 + into * 0.6 + impact);
      crowdReact(P[2].x, 300);
      for (const p of P) { p.px -= fx * DT; p.py += 25 * DT; }
      for (const i of [7, 8, 9, 10]) P[i].px += dirx * 60 * DT;   // feet swept the other way: he topples
      for (const i of [7, 9]) { P[i].px += dirx * 45 * DT; P[i].py += 20 * DT; }   // [feel] the knees buckle toward the hitter and the hips drop: he folds, not a plank
      P[2].py -= 60 * DT; P[1].py -= 20 * DT;
      P[0].px -= dirx * 40 * DT;
      ragG = 0.35; ragGk = 1.8; ragKD = true;   // and he hits the floor fast; a knock-down is never a K.O.
    } else {   // a stutter: he turns to the blow, is shoved back a step, and whatever he was doing is cut short
      const fk0 = clamp(impact / 12, 0.4, 1);
      if (flinch(x, y, fk0, x, y)) {   // [feel] readable stutter: the hips dip and the back foot steps back to catch the shove
        const g = FL_W / 0.52 * fk0; flV[1] -= 1.8 * g; flV[4] -= 4.5 * g; flV[2] -= 0.15 * g;
        dust(P[8].x - dirx * 2, ctl.y + 1, 1);
      }
      ctl.face = -dirx || ctl.face; ctl.spd = 0; ctl.push = 40 + impact * 3; ctl.pushK = 14;   // a sharp shove that stops quickly
      if (MOVES[hero.act] && impact >= 9 && hero.act !== 'tw') { hero.act = ctl.air ? 'air' : null; hero.actT = 0; queued = null; }
    }
  }
  function damageEnemy(e, dmg, dirx, power, up, x, y, blade) {
    if (e === enc.boss) dmg = Math.max(1, Math.round(dmg * (enc.eHitKind === 2 ? 0.8 : 0.75)));   // the boss shrugs off part of every hit (guns no worse than fists)
    emit('hit', { by: enc.eHitKind === 2 ? 'shot' : enc.eHitKind === 1 ? 'melee' : 'other', target: e, x, y, dir: dirx, power: power / 200, force: power, dmg, blade: !!blade,
      weapon: killBy != null ? killBy : hero.weapon, isBoss: e === enc.boss });   // power: 1 = a solid blow (audio: > 1 sounds heavy)
    // a raised guard stops light melee from the front: chip damage, a spark, no stagger, and often a counter
    if (e.guardT > 0 && enc.eHitKind === 1 && power < 250 && e.face === -dirx && !e.act && !e.air && hitCtx !== 'sweep' && hitCtx !== 'slk') {   // (a low kick goes under the guard)
      dmg = Math.max(1, Math.round(dmg * 0.25)); e.hp -= dmg; e.flash = 0.04; landed++;
      sparks.push({ x, y, t: 0 }); hitStop = Math.max(hitStop, 0.05);
      e.vx += dirx * power / e.m * 0.25; e.guardT = Math.max(e.guardT, 0.35);
      if (e.hp <= 0) { killEnemy(e, dirx, power, up, x, y); return; }
      if (++e.blockN >= 3) { e.blockN = 0; e.guardT = 0; e.hurtT = 0.55; eRelease(e); e.face = -dirx; sparks.push({ x, y: y - 3, t: 0.05 }); return; }   // third block in a row: the guard cracks
      if (simRand() < 0.3 + 0.35 * e.agg) e.punish = 0.6;
      return;
    }
    // jab spam: a goon reads a string of light hits; the 4th quick one in a row he catches on his guard, shoves off and often counters.
    // (heavies break the guard, low kicks go under it, blades and guns are not light hits)
    if (enc.eHitKind === 1 && e.type !== 'boss' && !e.air && !e.down) {
      const light = power < 200 && !blade && hitCtx !== 'slk' && hitCtx !== 'sweep';
      e.lightN = light && simTime - (e.lightT || -9) < 0.8 ? (e.lightN || 0) + 1 : light ? 1 : 0; e.lightT = simTime;
      if (e.lightN >= 4) {
        e.lightN = 0; e.face = -dirx; e.act = null; e.hurtT = 0; e.guardT = 0.9; e.fkV += 20;
        e.hp -= 1; e.flash = 0.04; sparks.push({ x, y, t: 0 }); hitStop = Math.max(hitStop, 0.06);
        e.vx += dirx * 30; ctl.push = Math.max(ctl.push, 70); ctl.pushK = 10;   // both are shoved apart
        if (simRand() < 0.5 + 0.4 * e.agg) e.punish = 0.45;
        return;
      }
    }
    const broke = e.guardT > 0 && enc.eHitKind === 1 && power >= 250;   // a heavy smashes the guard open
    if (e.recT > 0) dmg = Math.round(dmg * 1.3);   // gassed after a big move: hits land harder
    // where it landed: the head snaps back and hurts more, the body doubles over, the legs buckle and slow him
    const zone = !e.J ? 'body' : y < e.J[1].y + 1 ? 'head' : y > e.J[2].y + 2 ? 'legs' : 'body';
    e.fkZone = zone;
    if (zone === 'head') dmg = Math.round(dmg * 1.35); else if (zone === 'legs') { dmg = Math.max(1, Math.round(dmg * 0.8)); e.limpT = 0.8; }
    e.hp -= dmg; e.flash = 0.08; landed++;
    const bare = !blade && enc.eHitKind === 1 && !hero.weapon;   // a punch or a kick only splits the skin
    bleed(x, y, dirx, bare ? Math.round(1 + dmg / 10) : Math.round(4 + dmg / (blade ? 2 : 3)), blade ? 1.3 : bare ? 0.6 : 1);
    bodyStain(e, x, y, bare ? 1 : Math.round(2 + dmg / (blade ? 4 : 6)));
    if (e.hp <= 0) { killEnemy(e, dirx, power, up, x, y); return; }
    const stag = !e.sp && !(e.ctrArmor > 0 && power < 200) && (broke || dmg >= (e.recT > 0 ? e.poise * 0.4 : e.poise));   // big moves have armor; so does a counter against light hits
    const ctx = enc.eHitKind === 1 && hitCtx, mv = ctx && MOVES[ctx], pushK = (mv && mv.push) || 1;
    e.fkV += 48 * clamp(power / 260, 0.3, 1.1) * (e.type === 'boss' ? 0.8 : 1);   // the flinch spring
    if ((stag || (ctx === 'sweep' && !e.sp)) && e.type !== 'boss' && ctx && KD_MOVES.test(ctx)) { knockDown(e, dirx, power * pushK, ctx); return; }   // a sweep always takes the legs out
    if (stag) {
      e.hurtT = broke ? 0.6 : e.type === 'boss' ? 0.2 : 0.35; e.act = null; e.face = -dirx; e.hurtK = broke ? 1 : clamp(power / 220, 0.4, 1);
      e.guardT = 0; eRelease(e); e.feint = false; e.crouchT = 0; e.react = null;
      if (broke) sparks.push({ x, y, t: 0 });
    }
    // light hits barely shove, so a string of jabs stays in reach
    e.vx += dirx * power / e.m * (e.sp ? 0.15 : power < 130 ? 0.25 : 0.6) * pushK;
    if (!stag && power >= 120 && !e.air) { e.slide += dirx * 2.5; dust(e.x - dirx * 4 * e.s, e.y + 1, 2); }   // soaked by poise: still driven back a step
    if (stag && power >= 130) e.vy = Math.max(-35, e.vy - power * up / e.m * 0.5);   // a stagger hops, never floats; a light one stays on its feet
  }
  // the kill feed: who went down and with what (a thrown weapon or object sets killBy for its hit)
  const kills = []; let killBy = null, feedDirty = true;
  function killEnemy(e, dirx, power, up, hx, hy) {
    crowdReact(e.x, 0, true);   // somebody goes down: the crowd roars
    emit('kill', { enemy: e, weapon: killBy != null ? killBy : hero.weapon, zone: e.zone, isBoss: e === enc.boss, x: e.x, y: e.y });   // (the kill feed listens)
    e.dead = true; e.deadT = 0; e.act = null; e.down = false; e.diedAt = simTime;
    // the blow drives the body from where it landed: that part moves most (a head shot snaps the head back, a leg shot takes
    // the legs), the feet keep their grip on the floor, so he topples back over them; the strength sets how hard (1-3.5 m/s),
    // and only a rising blow lifts him, a little. No flight.
    const cx = hx ?? e.J[1].x, cy = hy ?? (e.J[1].y + e.J[2].y) / 2, P0 = Math.min(power, 360) / e.m;
    const v = clamp(P0 * 0.22, 18, 80), lift = up > 0 ? Math.min(40, P0 * up * 0.15) : 0, rs = 10 * e.s;
    e.pts = e.J.map((j, i) => {
      const w = 0.3 + 0.7 * Math.exp(-((j.x - cx) ** 2 + (j.y - cy) ** 2) / (2 * rs * rs)), foot = i === 8 || i === 10, knee = i === 7 || i === 9;
      const vx = e.vx * 0.5 + dirx * v * w * (foot ? 0.12 : knee ? 0.5 : 1), vy = Math.min(0, e.vy) * 0.5 - lift * w * (foot ? 0.3 : 1);
      return { x: j.x, y: j.y, px: j.x - vx * DT, py: j.y - vy * DT, im: IM[i], r: RAD[i] * e.s, fl: GROUND };
    });
    bleed(e.J[1].x, e.J[1].y, dirx, e.type === 'boss' ? 60 : !hero.weapon && killBy == null && enc.eHitKind === 1 ? 7 : 24, 1.4);   // beaten down with fists: less blood
    bodyStain(e, hx ?? e.J[1].x, hy ?? e.J[1].y + 3, !hero.weapon && killBy == null && enc.eHitKind === 1 ? 4 : 10);
    // sometimes an enemy drops an ammo box; you have to walk over it to load it
    const nBox = e === enc.boss ? 3 : simRand() < (WEAPONS[hero.weapon].ammo ? 0.55 : 0.35) ? 1 : 0;
    for (let i = 0; i < nBox; i++) ammoBoxes.push({ x: e.x, y: e.y - 12 * e.s, vx: dirx * 30 + (simRand() - 0.5) * 70, vy: -110 - simRand() * 50, life: 30 });
    if ((e === enc.boss || simRand() < BAND_P) && ammoBoxes.filter(b => b.band).length < BAND_MAX)   // and a bandage now and then: walk over it for 30 s of regen
      ammoBoxes.push({ band: true, x: e.x, y: e.y - 12 * e.s, vx: -dirx * 20 + (simRand() - 0.5) * 60, vy: -120 - simRand() * 40, life: 30 });
    if (e !== enc.boss && simRand() < DROP_P) dropWeapon(e);   // and often a weapon, lying by the body
    if (e.zone != null && --zoneAlive[e.zone] === 0 && typeof e.zone === 'number') emit('feat', 'kill' + e.zone);
    if (e === enc.boss) {
      enc.bossBeaten = true; enc.arena = null; emit('feat', 'boss'); crowdReact(e.x, 0, 'big');
      emit('boss:defeated', { boss: e, x: e.x });
      for (const g of enemies) if (!g.dead && g.zone === 'arena') killEnemy(g, Math.sign(g.x - e.x) || 1, 200, 0.5);
    }
  }
  // the player's attack window: fists and feet use the limb, weapons their whole length
  // pre = the strike is still travelling to its contact key: a foe it reaches now is marked and takes the hit on that key,
  // so the freeze always lands on the extended pose, even on a foe standing too close for the full reach
  function hitEnemies(m, wg, p, pre) {
    let any = null;
    for (const e of enemies) {
      if (e.dead || e.down || e.hitBy === hero.atkId) continue;
      const [ax, ay, bx, by] = capsule(e.J), rr = 4 * e.s;
      let hx = p.x, hy = p.y, hit = false;
      if (wg) for (let i = 0; i <= 5 && !hit; i++) { hx = wg.x + (wg.tx - wg.x) * i / 5; hy = wg.y + (wg.ty - wg.y) * i / 5; hit = segDist(ax, ay, bx, by, hx, hy) < rr + 1.5; }
      else hit = segDist(ax, ay, bx, by, p.x, p.y) < rr + 3;
      if (pre) { if (hit && e.pendAtk !== hero.atkId && (e.x - ctl.x) * ctl.face > -2) { e.pendAtk = hero.atkId; e.pendX = hx; e.pendY = hy; } continue; }
      if (!hit && e.pendAtk === hero.atkId) { hit = true; hx = e.pendX; hy = e.pendY; }
      if (!hit) continue;
      e.hitBy = hero.atkId; any = any || { x: hx, y: hy };
      enc.eHitKind = 1; damageEnemy(e, Math.round(m.power / 10 * (wg ? 1.4 : 1)), ctl.face, m.power, m.up, hx, hy, !!wg); enc.eHitKind = 0;
    }
    if (any) hitFx(m.power);
    return any;
  }
  const bHit = { n: 0, x: 0, y: 0, d: 1, cd: 0 };   // bullet hits this step: one shared hit-stop, spark and camera kick
  function bulletHitsEnemy(b) {
    for (const e of enemies) {
      if (e.dead || e.down) continue;
      const [ax, ay, bx, by] = capsule(e.J), rr = 4 * e.s + 1;
      if (segDist(ax, ay, bx, by, b.x, b.y) < rr || segDist(ax, ay, bx, by, (b.x + b.px) / 2, (b.y + b.py) / 2) < rr) {
        bHit.n++; bHit.x = b.x; bHit.y = b.y; bHit.d = b.vx > 0 ? 1 : -1;
        enc.eHitKind = 2; damageEnemy(e, Math.round(b.power / 9), b.vx > 0 ? 1 : -1, b.power * 0.8, 0.15, b.x, b.y, false); enc.eHitKind = 0;
        return true;
      }
    }
    return false;
  }
  function eRagStep(e, dt) {
    const Q = e.pts;
    for (const p of Q) p.fl = bodyFloor(p.x, p.y, p.r, Q[2].y).y - p.r;   // (bodies pass through one another: each lies on the street or a ledge)
    const gk = e.down && e.downT < 0.4 ? 1.6 : 1;   // [feel] a knock-down slams to the floor, it does not float
    for (const p of Q) { const vx = (p.x - p.px) * DAMP, vy = (p.y - p.py) * DAMP; p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + G * gk * dt * dt; }
    for (let k = 0; k < 8; k++) {
      for (const [a, b, lo, hi] of e.cons) solveDist(Q[a], Q[b], lo, hi);
      for (const [a, b, c, sg] of HINGES) hinge(Q[a], Q[b], Q[c], sg * e.face);
      for (const p of Q) { if (p.y > p.fl) p.y = p.fl; if (p.x < p.r) p.x = p.r; else if (p.x > W - p.r) p.x = W - p.r; }
    }
    for (const p of Q) {
      const vx = p.x - p.px, vy = p.y - p.py;
      if (p.y >= p.fl - 0.01 && vy > 0) { if (vy / dt > 90) dust(p.x, p.fl + p.r - 1, 1); p.py = p.y + vy * BOUNCE; p.px = p.x - vx * FRIC; }
      if (p.y >= p.fl - 0.6) p.px = p.x - (p.x - p.px) * Math.exp(-4 * dt);   // [feel] lying on the floor, the body scrapes to a stop (no endless glide)
    }
    if (e.dead) {   // a body at rest for a moment stops simulating (it stays where it lies)
      let mv = 0; for (const p of Q) mv = Math.max(mv, Math.abs(p.x - p.px) + Math.abs(p.y - p.py));
      e.restT = mv < 0.04 ? (e.restT || 0) + dt : 0;
      if (e.deadT > 3.5 && e.restT > 0.6) e.still = true;   // (after its blood pool has spread)
    }
    if (e.deadT > 0.6 && e.deadT < 3.5 && simRand() < 0.6) {   // a pool of blood spreads under the body
      const c = Q[2], w = (e.deadT - 0.6) * 3 * e.s, x = c.x + (simRand() * 2 - 1) * w, fs = floorBelow(x, c.y, 0);
      if (!fs.box && fs.y - c.y < 14) stain(x, fs.y);   // only on the floor right under the body
    }
  }
  // ---------- enemy brains: spacing, attack tokens, flanking, reactions; the boss has two phases ----------
  const BCMB = [['punch'], ['slam'], ['punch', 'slam'], ['punch', 'punch']];
  function eStart(e, a, windup) {
    if (e.zone !== 'arena') noise(e.x);   // a goon swings or fires out in the street
    if (e.type === 'goon') windup /= DIF().A ** 0.2;   // harder: a quicker wind-up (Medium 0.87, Hard 0.76, Wicked 0.66 of it)
    e.act = a; e.actT = -windup; e.struck = false; e.slammed = false; e.guardT = 0; e.pendH = null;
    e.face = Math.sign(P[2].x - e.x) || e.face;
    if (EMOVES[a].heavy) e.mark = windup;   // heavy moves flash a '!' over the head
  }
  function eHop(e, vx, vy) { e.vx = vx; e.vy = vy; e.air = true; dust(e.x, e.y + 1, 3); }
  function eRelease(e, cd) { if (e.tok) enc.eTokN--; e.tok = false; e.tokT = 0; e.combo = null; e.punish = 0; if (cd != null) e.cdT = cd; }
  // balance goons on both sides of the player; slot = place in the queue on that side, so they never stack
  function ePlanSides(px, py) {
    let nL = 0, nR = 0;
    for (const e of enemies) {
      if (e.dead || e.type !== 'goon' || Math.abs(e.x - px) > 150 || Math.abs(py - e.y) > 14) continue;
      if (e.flankT <= 0) e.side = Math.sign(e.x - px) || 1;
      if (e.side < 0) nL++; else nR++;
    }
    if (Math.abs(nL - nR) >= 2 || (nL + nR >= 2 && nL * nR === 0)) {   // one side crowded: the boldest free goon goes round
      const crowd = nL > nR ? -1 : 1; let best = null, bs = -1;
      for (const e of enemies) {
        if (e.dead || e.type !== 'goon' || e.side !== crowd || e.tok || e.retreatT > 0 || e.flankT > 0 || Math.abs(e.x - px) > 150 || Math.abs(py - e.y) > 14) continue;
        const sc = e.agg + simRand() * 0.5;
        if (sc > bs) { bs = sc; best = e; }
      }
      if (best) { best.side = -crowd; best.flankT = 3; }
    }
    for (const e of enemies) {
      if (e.dead || e.type !== 'goon') continue;
      e.slot = 0;
      for (const f of enemies) if (f !== e && !f.dead && f.type === 'goon' && !f.tok && f.side === e.side && Math.abs(f.x - px) < Math.abs(e.x - px)) e.slot++;
    }
  }
  function goonThink(e, dt, px, dx, adx, level, aggro, pm) {
    const dir = Math.sign(dx) || 1;
    if (e.guardT > 0) e.guardT -= dt; else e.blockN = 0;
    if (e.dodgeCd > 0) e.dodgeCd -= dt;
    if (e.jumpCd > 0) e.jumpCd -= dt;
    if (e.flankT > 0) e.flankT -= dt;
    if (e.punish > 0) e.punish -= dt;
    if (e.ctrArmor > 0) e.ctrArmor -= dt;
    if (e.tok) e.tokT += dt;
    e.tx = null; e.run = 1;
    if (!aggro) { eRelease(e); return; }
    if (e.hurtT > 0 || e.air || e.crouchT > 0 || e.act) return;
    e.cdT -= dt;
    // reactions, after a human-like delay: guard a light hit, hop back from a heavy wind-up
    if (e.react && (e.reactT -= dt) <= 0) {
      if (e.react === 'dodge') { eHop(e, -dir * 95, -95); e.dodgeCd = 1.4; e.react = null; return; }
      e.guardT = 0.5; e.react = null;
    }
    if (pm && hero.atkId !== e.seenAtk && level && adx < 48 && Math.sign(e.x - ctl.x) === ctl.face && !e.react) {
      e.seenAtk = hero.atkId;
      const fear = 1 - e.agg + (e.retreatT > 0 ? 0.5 : 0);
      if (pm.power >= 250) { if (e.dodgeCd <= 0 && simRand() < 0.25 + 0.4 * fear) { e.react = 'dodge'; e.reactT = 0.06 + simRand() * 0.1; } }
      else if (simRand() < 0.1 + 0.35 * fear) { e.react = 'guard'; e.reactT = 0.02 + simRand() * 0.08; }
    }
    // a gun pointed at it: after a beat, jump over the stream and land close
    if (WEAPONS[hero.weapon].gun && hero.mode === 'anim' && gun.aimW > 0.6 && level && adx > 22 && adx < 170 && Math.sign(e.x - ctl.x) === ctl.face && e.dodgeCd <= 0) {
      if ((e.aimT += dt) > 0.25 + 0.35 * (1 - e.agg)) {
        e.aimT = 0; e.dodgeCd = 2 + simRand() * 1.5;
        if (simRand() < 0.35 + 0.4 * e.agg) { e.crouchT = 0.1; e.jvx = dir * (60 + 50 * e.agg); e.jvy = -135; e.face = dir; return; }
      }
    } else e.aimT = Math.max(0, e.aimT - dt);
    // the player is up on a ledge: walk to its nearer edge, crouch, jump up
    const s = ctl.surf;
    if (hero.mode === 'anim' && !ctl.air && s && s !== GROUND_S && !s.bouncy && s.y < e.y - 6 && !(e.R.ranged && e.y - s.y < 34)) {
      const h = e.y + 2 - s.y;
      if (h > 75 || adx > 180) { e.tx = px - dir * 30; e.run = 0.6; return; }   // too high: wait below
      const ex = Math.abs(e.x - s.x0) < Math.abs(e.x - s.x1) ? s.x0 - 12 : s.x1 + 12, into = ex < s.x0 ? 1 : -1;
      if (Math.abs(e.x - ex) > 4) e.tx = ex;
      else if (e.jumpCd <= 0) { e.face = into; e.crouchT = 0.16; e.jvx = into * 42; e.jvy = -Math.sqrt(2 * G * 1.3 * (h + 9)); e.jumpCd = 1.3; }
      return;
    }
    // this goon is up on a roof or ledge and the player is down below: walk off the edge on the player's side and drop
    if (!e.R.ranged && hero.mode === 'anim' && !ctl.air && ctl.y > e.y + 8) {
      const es = floorBelow(e.x, e.y + 1.5, 0);
      if (es !== GROUND_S && !es.box) {
        const ex = px < es.x0 ? es.x0 - 10 : px > es.x1 ? es.x1 + 10 : (e.x - es.x0 < es.x1 - e.x ? es.x0 - 10 : es.x1 + 10);
        e.tx = ex; e.run = 1; return;
      }
    }
    if (e.R.ranged) { if (e.tok) eRelease(e); rangedThink(e, dt, px, dx, adx, level); return; }
    // badly hurt: a cautious goon backs off with the guard ready, catches a breath, then comes back meaner (once)
    if (!e.fled && e.hp < e.maxHp * 0.3) { e.fled = true; if (simRand() < 0.9 - e.agg - 0.3 * dLv()) { e.retreatT = 1.0 + simRand() * 0.8; eRelease(e); } }
    if (e.retreatT > 0) {
      if ((e.retreatT -= dt) > 0) { if (e.tok) eRelease(e); e.tx = px - dir * (e.reach + 70); e.run = 0.8; return; }
      e.agg = Math.min(1, e.agg + 0.35); e.mark = 0.4; e.cdT = 0;
    }
    // the player is stuck in a long recovery: step in and punish
    if (pm && pm.dur >= 0.7 && hero.actT > pm.win[1] && e.punId !== hero.atkId && level && adx < e.reach + 40) {
      e.punId = hero.atkId;
      if (simRand() < 0.45 + 0.45 * e.agg) e.punish = 0.5;
    }
    let free = enc.eTokN < enc.eTokMax;   // a few attackers per side (by difficulty): pressure from both ways, never a pile-up
    if (free && enc.eTokN) { let n = 0; for (const f of enemies) if (f.tok && !f.dead && f !== e && Math.sign(f.x - px) === Math.sign(e.x - px)) n++; if (n >= DIF().side) free = false; }
    if (!e.tok && (e.punish > 0 || (e.cdT <= 0 && free))) { e.tok = true; e.tokT = 0; enc.eTokN++; }
    if (e.tok && e.tokT > 3 / Math.sqrt(DIF().A) && e.punish <= 0) eRelease(e, 0.6 / DIF().A);   // could not land it: let another goon try
    if (e.tok) {
      const canHit = level && !ctl.air && hero.mode === 'anim';
      if (canHit && e.role === 'brawler' && e.punish <= 0 && adx > e.reach + 10 && adx < e.reach + 55 && simRand() < dt * (0.1 + 0.9 * e.agg) * Math.sqrt(DIF().A)) { eStart(e, 'lunge', 0.36); return; }
      if (adx > e.reach + 1) { e.tx = px - dir * e.reach * 0.6; e.run = e.punish > 0 ? 2.2 : 1 + 0.15 * dLv(); return; }
      e.face = dir;
      if (canHit) {
        const r = simRand(), A = e.agg, pun = e.punish > 0, L = e.R.cmb;
        if (e.role === 'brawler') e.combo = pun ? CMB[r < 0.5 ? 1 : 3] : CMB[r < 0.15 + 0.3 * A ? 4 : r < 0.35 + 0.3 * A ? 3 : r < 0.55 + 0.2 * A ? 2 : r < 0.85 ? 0 : 1];
        else e.combo = L[pun ? 0 : Math.min(L.length - 1, Math.floor((r * 0.7 + A * 0.3) * L.length))];   // bolder goons pick the longer strings
        e.ci = 0; e.feint = !pun && simRand() < 0.1 + 0.2 * (1 - A);
        const a = e.combo[0];
        eStart(e, a, pun ? e.windup * 0.45 : EMOVES[a].heavy ? e.windup * 1.3 : e.windup);
        if (pun) e.ctrArmor = 0.6;   // a counter rides through light hits: jab spam gets punished
        e.punish = 0;
      }
      return;
    }
    // no token: hold a stance on the assigned side and drift in and out of range (footsies)
    const st = e.stance + e.slot * 14 + 5 * Math.sin(simTime * 1.7 + e.seed * 9);
    e.tx = px + e.side * st; e.run = 0.8;
    if (Math.sign(e.x - px) !== e.side) {   // flanking: walk up, then hop over the player
      e.run = 1;
      if (adx < 30 && level && e.jumpCd <= 0) { e.crouchT = 0.14; e.jvx = e.side * 78; e.jvy = -128; e.jumpCd = 2; e.face = e.side; }
    }
  }
  // pistols and knife throwers: keep their range on their side, one shooter at a time, a long readable tell
  function rangedThink(e, dt, px, dx, adx, level) {
    const [r0, r1] = e.R.ranged, side = Math.sign(e.x - px) || e.side, dyl = Math.abs(ctl.y - e.y);
    const want = r0 + (r1 - r0) * (0.25 + 0.5 * (1 - e.agg)) + 8 * Math.sin(simTime * 1.3 + e.seed * 7);
    e.tx = px + side * want; e.run = adx < r0 * 0.7 ? 1.15 : 0.7;
    const lo = enc.arena && e.zone === 'arena' ? 2450 : 18, cornered = (side < 0 && e.x < lo + 4) || (side > 0 && e.x > W - 22);
    if (adx < e.reach + 1 && level && !ctl.air && hero.mode === 'anim' && (cornered || e.cdT <= 0)) {   // pressed close: a pistol-whip or an elbow
      e.combo = CMB[0]; e.ci = 0; eStart(e, 'jab', e.windup); return;
    }
    if (e.cdT <= 0 && enc.eShotN < (DIF().A >= 4 ? 2 : 1) && dyl < (e.perch > 0 ? 200 : 34) && adx > 28 && adx < 175 && hero.mode === 'anim') {
      enc.eShotN++; e.combo = null; e.ci = 0; eStart(e, e.R.w === 'pistol' ? 'shoot' : 'throw', e.R.aim); if (e.R.w === 'pistol') e.mark = e.R.aim;   // (no tell for a knife throw) e.ay = P[1].y + 1;
    }
  }
  // a throwing knife arcs to where the player stood at release; a pistol shot flies straight at the height locked during the aim
  function eFire(e) {
    const h = e.J[6], dir = e.face, px = P[2].x, d = Math.max(20, Math.abs(px - h.x));
    if (e.act === 'shoot') {
      const mx = h.x + dir * 4 * e.s, my = h.y, sp = 230;
      emit('shot', { by: 'enemy', enemy: e, w: 'pistol', x: mx, y: my, dir, pellets: 1, auto: false });
      const vl = e.perch > 0 ? 260 : 50;   // (a Pier 9 shooter up on a container fires down at him)
      eshots.push({ k: 'b', x: mx, y: my, px: mx, py: my, vx: dir * sp, vy: clamp((e.ay - my) / (d / sp), -vl, vl), life: 1, dmg: e.R.shot, t: 0 });
      e.muz = 0.07; dust(mx, my, 1); if (!reduceMotion) cam.shake = Math.max(cam.shake, 0.03);
    } else {
      const T = clamp(d / 170, 0.3, 0.75), ty = P[1].y + 5, g = 260;
      eshots.push({ k: 'k', x: h.x, y: h.y, px: h.x, py: h.y, vx: (px - h.x) / T, vy: (ty - h.y - 0.5 * g * T * T) / T, life: 1.6, dmg: e.R.shot, t: 0 });
    }
  }
  function eShotStep(dt) {
    for (let i = eshots.length - 1; i >= 0; i--) {
      const b = eshots[i]; b.px = b.x; b.py = b.y; b.t += dt;
      if (b.k === 'k') b.vy += 260 * dt;
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      let dead = b.life <= 0 || b.x < 0 || b.x > W || b.y > GROUND + 2;
      if (!dead) for (const s of SURF) if (b.x >= s.x0 && b.x <= s.x1 && b.py < s.y && b.y >= s.y) { dead = true; puff(b.x, s.y - 1); break; }
      // a bullet coming at him: half the time he reads it and ducks under it
      // [feel] the duck starts by time to impact (fast shots too), early enough to be down when the bullet arrives
      if (b.k === 'b' && b.duck === undefined && hero.mode === 'anim' && Math.sign(P[2].x - b.x) === Math.sign(b.vx) && Math.abs(P[2].x - b.x) / Math.max(1, Math.abs(b.vx)) < 0.24 && Math.abs(P[2].y - b.y) < 30) {
        b.duck = flags.demo && !ctl.air && !MOVES[hero.act] && hero.act !== 'dash' && simRand() < 0.5;   // only the demo ducks by itself; a player ducks with S
        if (b.duck) ctl.duckT = 0.5;
      }
      if (!dead && !b.duck && (hitsPlayer(b.x, b.y, 1) || hitsPlayer((b.x + b.px) / 2, (b.y + b.py) / 2, 1))) { hurtPlayer(b.dmg, b.x, b.y, Math.sign(b.vx) || 1, false); dead = true; }
      if (dead) eshots.splice(i, 1);
    }
  }
  function bossThink(e, dt, px, dx, adx, level, aggro) {
    const dir = Math.sign(dx) || 1;
    e.tx = null; e.run = 1;
    if (e.stunT > 0) e.stunT -= dt;
    if (e.recT > 0) { e.recT -= dt; if (simRand() < dt * 5) particles.push({ x: e.J[0].x + e.face * 4, y: e.J[0].y, vx: e.face * 15, vy: -40, life: 0.5, c: EFX.sweat }); return; }
    if (e.ph === 2 && simRand() < dt * 5) particles.push({ x: e.J[0].x + (simRand() - 0.5) * 6, y: e.J[0].y - 7, vx: (simRand() - 0.5) * 12, vy: -55, life: 0.3, c: EFX.steam });
    if (!aggro || e.sp || e.act || e.hurtT > 0 || e.air) return;
    if (e.ph === 1 && e.hp < e.maxHp * 0.5) {   // phase 2: a roar, then faster, with a charge and a jump slam
      e.ph = 2; e.sp = 'roar'; e.spT = 0; e.speed = 31; e.cd = [0.5, 1.0]; e.windup = 0.3; e.bigCd = 1.8; e.mark = 1;
      emit('boss:phase', { boss: e, phase: 2 }); emit('boss:telegraph', { boss: e, move: 'roar', t: 0.25, x: e.x });
      return;
    }
    if (e.ph === 2 && (e.bigCd -= dt) <= 0 && level && hero.mode === 'anim' && adx > 60 && adx < 200) {
      e.bigCd = 4.5 + simRand() * 2.5;
      e.sp = simRand() < 0.5 ? 'charge' : 'jslam'; e.spT = e.sp === 'charge' ? -0.7 : -0.55;
      e.leapt = false; e.hitP = false; e.face = dir; e.jx = px; e.mark = -e.spT;
      emit('boss:telegraph', { boss: e, move: e.sp, t: -e.spT, x: e.x, mark: px });   // the wind-up: t s to the strike
      return;
    }
    if (adx > e.reach + 1) { e.tx = px - dir * e.reach * 0.65; return; }
    e.face = dir;
    if (level && !ctl.air && hero.mode === 'anim' && (e.cdT -= dt) <= 0) {
      const r = simRand();
      e.combo = e.ph === 2 ? BCMB[r < 0.3 ? 2 : r < 0.5 ? 3 : r < 0.75 ? 0 : 1] : BCMB[r < 0.35 ? 1 : 0];
      e.ci = 0; eStart(e, e.combo[0], e.windup);
    }
  }
  // Sal Marchetti (Pier 9): cleaver strings and a meat hook on a chain that pulls the hero in for a free chop; at half health he roars,
  // speeds up, and the hall's conveyor starts swinging frozen tuna across the arena (p9Step), while his crew comes in.
  // Telegraphs scale with the difficulty: t / A^0.25.
  let hookPull = false;   // the hook has the hero: no input until the pull lands
  function marchettiThink(e, dt, px, dx, adx, level, aggro) {
    const M = P9.MARCHETTI, dir = Math.sign(dx) || 1, A = DIF().A;
    e.tx = null; e.run = 1;
    if (e.stunT > 0) e.stunT -= dt;
    if (e.recT > 0) { e.recT -= dt; if (simRand() < dt * 5) particles.push({ x: e.J[0].x + e.face * 4, y: e.J[0].y, vx: e.face * 15, vy: -40, life: 0.5, c: EFX.sweat }); return; }
    if (simRand() < dt * (e.ph === 2 ? 5 : 1.5)) particles.push({ x: e.J[0].x + e.face * 5, y: e.J[0].y + 1, vx: e.face * 14, vy: -18, life: 0.45, c: EFX.steam });   // breath in the cold
    if (!aggro || e.sp || e.act || e.hurtT > 0 || e.air) return;
    if (e.ph === 1 && e.hp < e.maxHp * M.ph2.below) {   // phase 2: a roar, then faster, and the conveyor swings
      e.ph = 2; e.sp = 'roar'; e.spT = 0; e.speed = M.ph2.speed; e.cd = M.ph2.cd.slice(); e.windup = M.ph2.windup; e.mark = 1; e.hookCd = Math.min(e.hookCd, 3);
      emit('boss:phase', { boss: e, phase: 2 }); emit('boss:telegraph', { boss: e, move: 'roar', t: 0.25, x: e.x });
      bark(e, "Market's closing, Sandman! Everything must go!");
      return;
    }
    e.hookCd -= dt;
    if (e.hookCd <= 0 && level && hero.mode === 'anim' && !ctl.air && adx > 45 && adx < M.hook.range[diffSel]) {   // the meat hook: the chain spins, a red line on the floor, then it flies
      e.hookCd = (M.hook.cd[0] + simRand() * (M.hook.cd[1] - M.hook.cd[0])) * (e.ph === 2 ? 0.75 : 1);
      e.sp = 'hook'; e.spT = -M.hook.windup / A ** 0.25; e.face = dir; e.hook = null; e.hookTx = px; e.mark = -e.spT;
      emit('boss:telegraph', { boss: e, move: 'hook', t: -e.spT, x: e.x, mark: px });
      return;
    }
    if (adx > e.reach + 1) { e.tx = px - dir * e.reach * 0.65; return; }
    e.face = dir;
    if (level && !ctl.air && hero.mode === 'anim' && (e.cdT -= dt) <= 0) {
      const r = simRand(), Cb = M.combos;
      e.combo = e.ph === 2 ? Cb[r < 0.3 ? 3 : r < 0.55 ? 1 : r < 0.8 ? 2 : 0] : Cb[r < 0.4 ? 0 : r < 0.7 ? 2 : r < 0.88 ? 1 : 3];
      e.ci = 0; eStart(e, e.combo[0], e.windup);
    }
  }
  function hookStep(e, dt, px) {   // the hook in flight, the pull, the reel-in after a miss (a 1.2 s punish window)
    const M = P9.MARCHETTI.hook;
    e.spT += dt;
    if (e.spT < 0) { if (e.spT < -0.2) { e.face = Math.sign(px - e.x) || e.face; e.hookTx = px; } return; }
    if (!e.hook) { e.hook = { x: e.x + e.face * 8 * e.s, y: GROUND - 24, st: 'fly', d: 0 }; emit('sfx', { name: 'dodge_whoosh', x: e.x, vol: 0.8, pitch: 0.6 }); }
    const k = e.hook;
    if (k.st === 'fly') {
      k.x += e.face * M.v * dt; k.d += M.v * dt;
      if (hitsPlayer(k.x, k.y, 2) || hitsPlayer(k.x, k.y - 8, 2)) {
        k.st = 'pull'; hookPull = true; hero.act = null; queued = null; ctl.spd = 0;
        sparks.push({ x: k.x, y: k.y, t: 0 }); shakeIt(0.15, 2); bark(e, 'On the scale!');
        emit('hit', { by: 'enemy', target: 'hero', x: k.x, y: k.y, dir: -e.face, power: 0.6, force: 120, dmg: 0, blade: false, weapon: 0, isBoss: true });
      } else if (k.d > M.range[diffSel] || k.x < 2442 || k.x > W - 10) k.st = 'back';
    } else if (k.st === 'pull') {
      const tx = e.x + e.face * 24, d = tx - ctl.x;
      if (hero.mode !== 'anim') { k.st = 'back'; hookPull = false; }
      else if (Math.abs(d) < 3) {   // landed at his feet: a free heavy chop, unless he rolls away in time
        hookPull = false; e.sp = null; e.hook = null; e.face = Math.sign(ctl.x - e.x) || e.face;
        e.combo = ['hchop']; e.ci = 0; eStart(e, 'hchop', 0.3 / DIF().A ** 0.25);
      } else { ctl.x += Math.sign(d) * Math.min(Math.abs(d), M.pull * dt); ctl.spd = 0; ctl.face = -e.face; k.x = ctl.x - e.face * 3; }
    } else {
      const d = e.x - k.x;
      if (Math.abs(d) < 8) { e.sp = null; e.hook = null; e.recT = 1.2; }
      else k.x += Math.sign(d) * 260 * dt;
    }
  }
  function drawHookMarks(e, J) {   // the hook spinning in his hand, the red line on the floor, the chain out to the hook
    const h = J[4], chain = C('#5a5a66'), steel = ECOL.steel;
    if (e.sp === 'hook' && e.spT < 0) {
      const a = simTime * 18, hx = h.x + Math.cos(a) * 5 * e.s, hyy = h.y - 4 + Math.sin(a) * 5 * e.s;
      line1(h.x, h.y, hx, hyy, chain); plot(Math.floor(hx), Math.floor(hyy), steel); plot(Math.floor(hx) + 1, Math.floor(hyy), steel);
      if (Math.floor(simTime * 12) % 2) for (let x = Math.min(e.x, e.hookTx); x <= Math.max(e.x, e.hookTx); x += 4) { plot(Math.floor(x), GROUND - 1, BLOOD[2]); plot(Math.floor(x) + 1, GROUND - 1, BLOOD[2]); }
    }
    if (e.hook) {
      const k = e.hook; line1(h.x, h.y, k.x, k.y, chain);
      const f = e.face * (k.st === 'back' ? -1 : 1);
      plot(Math.floor(k.x), Math.floor(k.y), steel); plot(Math.floor(k.x + f), Math.floor(k.y), steel); plot(Math.floor(k.x + f * 2), Math.floor(k.y + 1), steel); plot(Math.floor(k.x + f * 2), Math.floor(k.y + 2), steel); plot(Math.floor(k.x + f), Math.floor(k.y + 3), steel);
    }
  }
  // committed big moves; runs before the body moves (the charge sets its own speed)
  function bossSpecial(e, dt, px) {
    if (e.sp === 'hook') { hookStep(e, dt, px); return; }
    const t0 = e.spT; e.spT += dt;
    if (e.sp === 'roar') {
      if (t0 < 0.25 && e.spT >= 0.25) { if (!reduceMotion) cam.shake = Math.max(cam.shake, 0.4); waves.push({ x: e.x, y: e.y + 1, t: 0 }); dust(e.x - 8, e.y + 1, 6); dust(e.x + 8, e.y + 1, 6); }
      if (e.spT >= 1.1) e.sp = null;
    } else if (e.sp === 'charge') {
      if (e.spT < 0) {   // tracks the player, then locks on and paws the ground
        if (e.spT < -0.3) e.face = Math.sign(px - e.x) || e.face;
        if (simRand() < dt * 14) dust(e.x - e.face * 7 * e.s, e.y + 1, 1);
        return;
      }
      e.vx = e.face * 215;
      if (simRand() < dt * 30) dust(e.x - e.face * 5, e.y + 1, 1);
      if (!e.hitP && hero.mode === 'anim' && !ctl.air && Math.abs(P[2].x - e.x) < 9 * e.s && Math.abs(ctl.y - e.y) < 12) {   // any jump clears it
        e.hitP = true; hurtPlayer(e.heavyDmg, P[2].x, P[2].y, e.face, true);
      }
      const wall = (e.face < 0 && e.x <= 2441) || (e.face > 0 && e.x >= W - 11);
      if (wall || e.spT > 1.1 || (e.spT > 0.25 && (px - e.x) * e.face < -40)) {
        e.sp = null; e.vx *= wall ? -0.3 : 0.3; e.recT = wall ? 1.5 : 0.9;
        if (wall) { e.stunT = 1.5; if (!reduceMotion) cam.shake = Math.max(cam.shake, 0.3); dust(e.x + e.face * 8, e.y - 12, 8); hitStop = Math.max(hitStop, 0.08); }
      }
    } else if (e.sp === 'jslam') {
      if (e.spT < 0) { if (e.spT < -0.2) e.jx = clamp(px, 2450, W - 20); return; }   // the landing spot is marked, then locked
      if (!e.leapt) {
        e.leapt = true; const T = 2 * 190 / (G * 1.3);
        eHop(e, clamp((e.jx - e.x) / T, -150, 150), -190);
      }
    }
  }
  function enemyStep(dt) {
    if (hero.invT > 0) hero.invT -= dt;
    if (!isP9() && enc.boss && !enc.boss.dead && enc.arena && enc.arenaSpawned < 10 && (enc.spawnT -= dt) <= 0) {   // the boss calls in his crew: one every 3 s (4.5 s once enraged), 10 in all
      enc.spawnT = enc.boss.ph > 1 ? 4.5 : 3;
      if (enemies.filter(g => !g.dead && g.zone === 'arena').length < 4) {
        enc.arenaSpawned++;
        const dx = CLUB_DOORS[enc.arenaSpawned % 2];   // out of a staff doorway in the back wall: by the entrance speaker stack, or behind the far one
        const g = spawnEnemy('goon', clamp(dx, enc.arena.x0 + 6, enc.arena.x1 - 4), 'arena');
        g.cdT = Math.max(g.cdT, 0.8); spawnFx.push({ kind: 'club', x: dx, t: 0 });
      }
    }
    const px = P[2].x, py = hero.mode === 'anim' ? ctl.y : P[2].y + 15, pm = hero.mode === 'anim' ? MOVES[hero.act] : null;
    enc.eTokN = 0; enc.eShotN = 0; for (const e of enemies) if (!e.dead) { if (e.tok) enc.eTokN++; if (e.act === 'shoot' || e.act === 'throw') enc.eShotN++; }
    eShotStep(dt);
    enc.eTokMax = enc.boss && !enc.boss.dead && Math.abs(enc.boss.x - px) < 160 ? (DIF().A >= 4 ? 2 : 1) : DIF().tok;   // with the boss close, fewer goons swing at once
    if ((enc.eSideT -= dt) <= 0) { enc.eSideT = 0.5; ePlanSides(px, py); }
    {   // the street keeps its dead, up to BODY_MAX: past that the oldest body is cleared away (first in, first out)
      let nDead = 0, oi = -1;
      for (let i = 0; i < enemies.length; i++) { const e = enemies[i]; if (!e.dead || e === enc.boss) continue; nDead++; if (oi < 0 || e.diedAt < enemies[oi].diedAt) oi = i; }
      if (nDead > BODY_MAX) enemies.splice(oi, 1);
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.dead) { e.deadT += dt; if (!e.still) eRagStep(e, dt); continue; }   // the dead stay where they fall (up to BODY_MAX: then the oldest goes)
      if (e.flash > 0) e.flash -= dt;
      if (e.hurtT > 0) e.hurtT = e.air ? Math.max(0.06, e.hurtT - dt) : e.hurtT - dt;   // a stagger lasts until the feet are down
      if (e.mark > 0) e.mark -= dt;
      if (e.muz > 0) e.muz -= dt;
      if (e.down) { eDownStep(e, dt); continue; }
      const dx = px - e.x, adx = Math.abs(dx), dy = Math.abs(P[2].y - (e.y - 16 * e.s));
      const aggro = (adx < 200 || (e.kind === 'marchetti' && flags.club)) && dy < (e.perch > 0 ? 200 : 80) * e.s && hero.mode !== 'getup', level = Math.abs(py - e.y) < 14;
      e.fight = aggro && adx < 60 * e.s && !e.intro;
      if (e.intro) { e.act = null; e.sp = null; e.tx = e.introX; e.run = e.kind === 'marchetti' ? 1 : 0.5; e.cdT = Math.max(e.cdT, 0.8); if (Math.abs(e.introX - e.x) <= 3) e.face = -1; }   // the entrance: a slow walk to his mark under the spot, nothing else
      else if (e.kind === 'marchetti') marchettiThink(e, dt, px, dx, adx, level, aggro);
      else if (e.type === 'boss') bossThink(e, dt, px, dx, adx, level, aggro); else goonThink(e, dt, px, dx, adx, level, aggro, pm);
      if (!e.air) {
        if (e.crouchT > 0) { e.vx *= 0.7; if ((e.crouchT -= dt) <= 0) eHop(e, e.jvx, e.jvy); }
        else if (e.hurtT > 0 || e.act || e.sp || e.recT > 0 || e.tx == null) e.vx *= 0.8;
        else {
          const err = e.tx - e.x;
          if (Math.abs(err) > 3) e.vx = Math.sign(err) * e.speed * (e.type === 'goon' ? 1 + 0.35 * dLv() : 1) * e.run * (Math.abs(err) < (e.tok ? 6 : 16) ? 0.6 : 1) * (e.guardT > 0 ? 0.5 : 1) * (e.limpT > 0 ? 0.55 : 1);   // a leg hit makes him limp for a moment
          if (e.limpT > 0) e.limpT -= dt;
          else e.vx *= 0.8;
        }
        if (!e.act && !e.sp && e.hurtT <= 0 && e.crouchT <= 0) {   // face the player while spacing (walks backward too)
          if (aggro && adx < 140 && !e.intro) e.face = Math.sign(dx) || e.face; else if (Math.abs(e.vx) > 5) e.face = Math.sign(e.vx);
        }
        if (!e.sp && !e.tok) for (const f of enemies) if (f !== e && !f.dead && !f.tok && Math.abs(f.x - e.x) < 9 * Math.max(e.s, f.s)) e.vx += Math.sign(e.x - f.x || 1) * 20;   // the attacker steps through the line
        e.phase = (e.phase + Math.abs(e.vx) / 24 * dt) % 1;
      }
      if (e.sp) bossSpecial(e, dt, px);
      if (e.act === 'lunge' && e.actT >= 0 && e.actT < 0.24 && !e.air && adx > e.reach * 0.6) {   // the dash
        e.vx = e.face * 165; if (simRand() < dt * 30) dust(e.x - e.face * 3, e.y + 1, 1);
      }
      const pf = e.y + 2;
      if (e.air && e.hurtT > 0) e.vx *= Math.exp(-3 * dt);   // air drag on a knocked-back body
      if (e.slide) { const d = e.slide * (1 - Math.exp(-30 * dt)); e.x += d; e.slide -= d; if (Math.abs(e.slide) < 0.05) e.slide = 0; }
      e.vy += G * 1.3 * dt; e.x += e.vx * dt; e.y += e.vy * dt;
      const fl = floorBelow(e.x, pf - 0.5, 0);
      if (e.y + 2 >= fl.y) { if (e.vy > 120) dust(e.x, fl.y - 1, 3); e.y = fl.y - 2; e.vy = 0; e.air = false; } else e.air = true;
      e.x = clamp(e.x, enc.arena && e.zone === 'arena' || e === enc.boss ? 2440 : 8, W - 10);
      if (e.sp === 'jslam' && e.leapt && !e.air && e.spT > 0.1) {   // landing: a shockwave both ways, then a long gasp
        e.sp = null; e.recT = 0.9; e.vx = 0;
        waves.push({ x: e.x - 8, y: e.y + 1, t: 0 }); waves.push({ x: e.x + 8, y: e.y + 1, t: 0 });
        dust(e.x - 10, e.y + 1, 10); dust(e.x + 10, e.y + 1, 10); hitStop = Math.max(hitStop, 0.06);
        if (!reduceMotion) cam.shake = Math.max(cam.shake, 0.35);
        const d = Math.abs(P[2].x - e.x);
        if (hero.mode === 'anim' && !ctl.air && d < 16 && Math.abs(ctl.y - e.y) < 10) hurtPlayer(e.heavyDmg, P[2].x, P[2].y + 10, Math.sign(P[2].x - e.x) || 1, true);   // right under him: the full weight
        for (const dir of [-1, 1]) quakes.push({ x: e.x + dir * 10, y: e.y + 2, dir, t: 0, hit: false });   // then a shockwave rolls out each way
      }
      if (e.act) {
        const M = EMOVES[e.act];
        e.actT += dt * (e.type === 'boss' && e.ph === 1 ? 0.85 : 1);
        if (e.feint && e.actT >= -0.05) {   // feint: the wind-up was a bluff; skip back and go again
          e.feint = false; e.act = null; e.combo = null; e.vx = -e.face * 45; e.cdT = 0.3;
          poseEnemy(e, dt); continue;
        }
        if (!e.struck && e.actT >= (M.pre ?? M.win[0]) && e.actT <= M.win[1] && e.act !== 'slam') {
          let h = e.J[M.limb], hit = false;
          if (M.w && e.R.len) {   // weapons hit along the blade: the tip and the middle
            const g = eWeapon(e, e.J); h = { x: g.tx, y: g.ty };
            hit = hitsPlayer(g.tx, g.ty, 1.5 * e.s) || hitsPlayer((g.x + g.tx) / 2, (g.y + g.ty) / 2, 1.5 * e.s);
          } else hit = hitsPlayer(h.x, h.y, 2 * e.s);
          if (hit && e.actT < M.win[0]) e.pendH = { x: h.x, y: h.y };   // reached early: the blow lands on the contact key
          else if (hit || (e.pendH && e.actT >= M.win[0])) { if (!hit) h = e.pendH; e.struck = true; hurtPlayer(M.heavy ? e.heavyDmg : e.dmg, h.x, h.y, e.face, e.type === 'boss' && M.heavy, e.type === 'boss' && !M.heavy ? 0.7 : 1); }   // a boss jab staggers, it does not floor you
        }
        if ((e.act === 'shoot' || e.act === 'throw') && !e.struck && e.actT >= (e.act === 'shoot' ? 0 : 0.06)) { e.struck = true; eFire(e); }
        else if (e.act === 'shoot' && e.actT < -0.15) e.ay = P[1].y + 1;   // tracks the target, then holds still for the last beat
        if (e.act === 'slam' && !e.slammed && e.actT >= 0.38 - M.t0) {   // both fists hit the ground: a shockwave you have to jump
          e.slammed = true;
          const sx = e.x + e.face * 20 * e.s;
          waves.push({ x: sx, y: GROUND - 1, t: 0 }); dust(sx - 6, GROUND - 1, 8); dust(sx + 6, GROUND - 1, 8);
          if (!reduceMotion) cam.shake = Math.max(cam.shake, 0.25);
          if (hero.mode === 'anim' && !ctl.air && Math.abs(P[2].x - sx) < 95) hurtPlayer(20, P[2].x, P[2].y + 10, Math.sign(P[2].x - sx) || 1, true);
        }
        if (e.actT >= M.dur) {
          const was = e.act; e.act = null;
          const dl = Math.abs(P[2].x - e.x);
          if (e.combo && ++e.ci < e.combo.length && hero.mode === 'anim' && dl < e.reach + 10 && Math.abs(py - e.y) < 14) eStart(e, e.combo[e.ci], e.type === 'boss' ? 0.2 : 0.08);   // the string goes on
          else {
            if (e.type === 'boss') { e.combo = null; if (was === 'slam' || (was === 'hchop' && e.kind === 'marchetti')) e.recT = 0.6; e.cdT = (e.cd[0] + simRand() * (e.cd[1] - e.cd[0])) / Math.sqrt(DIF().A); }   // (the boss: half the steps, his moves are big)
            else eRelease(e, (e.R.ranged ? 1.4 + simRand() * 1.2 : (e.cd[0] + simRand() * (e.cd[1] - e.cd[0])) * (1.3 - 0.6 * e.agg)) / DIF().A);
          }
        }
      }
      poseEnemy(e, dt);
    }
  }
  const ECOL = { steel: C(EPAL.steel), steelD: C(EPAL.steelD), grip: C(EPAL.grip), iron: C(EPAL.iron), gun: C(EPAL.gun), scar: C(EPAL.scar) };
  const EW = { x: 0, y: 0, tx: 0, ty: 0, dx: 0, dy: 0 };   // reused: the held weapon from the front hand
  function eWeapon(e, J) {
    const el = J[5], h = J[6], a = Math.atan2(h.y - el.y, h.x - el.x) + e.R.off * e.face;
    EW.dx = Math.cos(a); EW.dy = Math.sin(a); EW.x = h.x; EW.y = h.y; EW.tx = h.x + EW.dx * e.R.len * e.s; EW.ty = h.y + EW.dy * e.R.len * e.s;
    return EW;
  }
  // head in its own frame: fw toward the face, up toward the crown; a box with a flat top and a square jaw, plus hair, hat and beard
  function eHeadPx(e, fw, up, par) {
    const k = e.hk * e.s, HW = 3.6 * k, HU = 4.6 * k, HD = 4.0 * k, p = e.pal, hair = e.hair, bd = e.beard;
    if (Math.abs(fw) > HW || up > HU || up < -HD) {   // outside the box: mohawk, cap brim, hood, beard below the jaw, handlebar ends
      if (hair === 'mohawk' && up > HU && up <= HU + 2.4 * k && fw > -2.6 * k && fw < k) return p.loud;
      if (hair === 'cap' && fw > HW && fw <= HW + 2.2 * k && up > 1.4 * k && up <= 2.4 * k) return p.topB;
      if (hair === 'souwester') {   // a sou'wester: a wide brim all round, a long flap down the back of the neck
        if (up > 1.5 * k && up <= 2.5 * k && Math.abs(fw) <= HW + 1.8 * k) return p.hatB;
        if (fw < -HW && fw >= -HW - 1.4 * k && up > -2 * k && up <= 2.5 * k) return p.hat;
      }
      if (hair === 'hood' && fw < -HW && fw >= -HW - k && up > -k && up < HU - 0.5 * k) return p.top;
      if (bd === 'huge' && up < -HD && up >= -HD - 3.4 * k && fw > -1.6 * k && fw <= HW + 0.5 - (-up - HD) * 0.45) return p.hair;
      if (bd === 'full' && up < -HD && up >= -HD - 1.2 * k && fw > -0.6 * k && fw < HW - 0.4 * k) return p.hair;
      if ((bd === 'stache' || bd === 'huge') && fw > HW && fw <= HW + 1.1 * k && up > -2.8 * k && up < -1.1 * k) return p.hair;
      return 0;
    }
    if (hair === 'hood') { if (up > 1.8 * k || fw < -0.4 * k) return fw > -0.4 * k && fw < 0.8 * k && up < HU - 0.8 * k ? p.topB : p.top; }   // the rim shades the face
    else if (hair === 'cap') { if (up > 2.3 * k) return up < 3 * k ? p.topB : p.top; if (fw < -1.4 * k && up > 0.5 * k) return p.hair; }
    else if (hair === 'short') { if (up > 2.6 * k - Math.max(0, -fw) * 0.6 || fw < -1.4 * k || (fw < 0.4 * k && up > 1.2 * k)) return p.hair; }
    else if (hair === 'souwester') { if (up > 2.0 * k) return up < 2.6 * k ? p.hatB : p.hat; if (fw < -1.4 * k && up > 0) return p.hair; }
    else if (hair === 'mohawk') { if (up > HU - k && fw > -2.6 * k && fw < k) return p.loud; if (fw < -1.4 * k && up > 0 && par) return p.skinB; }   // shaved sides
    const mouth = fw > 1.4 * k && up > -2.1 * k && up < -1.5 * k;
    switch (bd) {   // facial hair: full, huge, goatee, chin strap, big mustache, stubble
      case 'full': if ((up < -1.0 * k && fw > -1.8 * k) || (fw < -0.4 * k && fw > -1.8 * k && up < 1.4 * k)) return mouth ? PAL.out : p.hair; break;
      case 'huge': if ((up < -0.6 * k && fw > -2.2 * k) || (fw < -0.2 * k && fw > -2.2 * k && up < 1.8 * k)) return mouth ? PAL.out : p.hair; break;
      case 'goatee': if ((fw > 0.8 * k && up < -2.3 * k) || (fw > 1.0 * k && up > -1.7 * k && up < -0.9 * k)) return p.hair; break;
      case 'chin': if (up < -HD + 1.1 * k || (fw > -1.6 * k && fw < -0.7 * k && up < 1.2 * k)) return p.hair; break;
      case 'stache': if (fw > 0.6 * k && up > -2.1 * k && up < -0.9 * k) return p.hair; if (fw > 1.2 * k && up < -2.8 * k && par) return p.skinB; break;
      case 'stubble': if (up < -1.2 * k && fw > -1.6 * k && par) return p.skinB; break;
    }
    if (e.scar && fw > 0.5 * k && fw < 2.6 * k && Math.abs(up - (fw - 1.6 * k) * 0.9 - 0.6 * k) < 0.5) return ECOL.scar;
    return p.skin;
  }
  function eHead(e, hd, nk, f, fl) {
    const cx = snap(hd.x), cy = snap(hd.y), [dx, dy] = norm(nk.x - hd.x, nk.y - hd.y), fx = dy * f, fy = -dx * f, ux = -dx, uy = -dy, R = Math.ceil(9.5 * e.hk * e.s);
    const at = (x, y) => { const rx = x + 0.5 - cx, ry = y + 0.5 - cy; return eHeadPx(e, rx * fx + ry * fy, rx * ux + ry * uy, (x + y) & 1); };
    const k0 = e.hk * e.s, FW = 6.6 * k0, UT = 8.2 * k0, UB = -8.6 * k0;   // loose bounds of everything a head can carry
    for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
      const rx = x + 0.5 - cx, ry = y + 0.5 - cy, fw = rx * fx + ry * fy, up = rx * ux + ry * uy;
      if (fw > FW || fw < -FW || up > UT || up < UB) continue;
      const c = at(x, y);
      if (c) plot(x, y, fl ? PAL.white : c);
      else if (at(x + 1, y) || at(x - 1, y) || at(x, y + 1) || at(x, y - 1)) plot(x, y, PAL.out);
    }
    const k = e.hk * e.s, ex = Math.floor(cx + fx * 2.2 * k + ux * 0.6 * k), ey = Math.floor(cy + fy * 2.2 * k + uy * 0.6 * k);
    if (!fl) plot(Math.floor(cx + fx * 2.2 * k + ux * 1.7 * k), Math.floor(cy + fy * 2.2 * k + uy * 1.7 * k), e.hair === 'bald' ? e.pal.skinB : e.pal.hair);   // brow
    return [ex, ey];
  }
  function eDrawWeapon(e, J, fl) {
    const w = e.R.w; if (!w || (w === 'tknife' && !(e.act === 'throw' && e.actT < 0.06))) return;   // a throwing knife shows only in the cocked hand
    const g = eWeapon(e, J), s = e.s, O = PAL.out, c = x => fl ? PAL.white : x;
    if (w === 'pistol') {
      seg(g.x, g.y, g.tx, g.ty, 1.5 * s, O); seg(g.x, g.y, g.tx, g.ty, 0.7 * s, c(ECOL.gun));
      if (e.muz > 0) for (let d = 1; d <= 4; d++) plot(Math.floor(g.tx + g.dx * d), Math.floor(g.ty + g.dy * d), d < 3 ? PAL.white : PAL.accent);   // muzzle flash
      else if (e.act === 'shoot' && e.actT < 0 && Math.floor(simTime * 14) % 2) plot(Math.floor(g.tx + g.dx), Math.floor(g.ty + g.dy), PAL.white);   // glint on the aim
    } else if (w === 'pipe') { seg(g.x, g.y, g.tx, g.ty, 1.7 * s, O); seg(g.x, g.y, g.tx, g.ty, 0.9 * s, c(ECOL.iron)); }
    else if (w === 'machete') {
      const hx = g.x + g.dx * 2.5 * s, hy = g.y + g.dy * 2.5 * s;
      seg(g.x, g.y, g.tx, g.ty, 1.4 * s, O); seg(hx, hy, g.tx, g.ty, 2.0 * s, O);
      seg(g.x, g.y, hx, hy, 0.6 * s, c(ECOL.grip)); seg(hx, hy, g.tx, g.ty, 1.1 * s, c(ECOL.steelD)); line1(hx, hy, g.tx, g.ty, c(ECOL.steel));
    } else if (w === 'gaff') {   // a long wooden pole with a steel hook at the end
      seg(g.x - g.dx * 3 * s, g.y - g.dy * 3 * s, g.tx, g.ty, 1.2 * s, O); line1(g.x - g.dx * 3 * s, g.y - g.dy * 3 * s, g.tx, g.ty, c(PAL.wood));
      const hx = g.tx - g.dy * e.face * 2.5 * s, hy = g.ty + g.dx * e.face * 2.5 * s;
      line1(g.tx, g.ty, g.tx + g.dx * 2 * s, g.ty + g.dy * 2 * s, c(ECOL.steel)); line1(g.tx + g.dx * 2 * s, g.ty + g.dy * 2 * s, hx, hy, c(ECOL.steel)); plot(Math.floor(hx), Math.floor(hy), O);
    } else if (w === 'cleaver') {   // a heavy square cleaver: a short grip, a deep blade
      const hx = g.x + g.dx * 2.5 * s, hy = g.y + g.dy * 2.5 * s, ox = -g.dy * e.face * 1.4 * s, oy = g.dx * e.face * 1.4 * s;
      seg(g.x, g.y, hx, hy, 1.2 * s, O); seg(g.x, g.y, hx, hy, 0.6 * s, c(ECOL.grip));
      seg(hx + ox, hy + oy, g.tx + ox, g.ty + oy, 2.4 * s, O); seg(hx + ox, hy + oy, g.tx + ox, g.ty + oy, 1.6 * s, c(ECOL.steelD));
      line1(hx + ox * 2, hy + oy * 2, g.tx + ox * 2, g.ty + oy * 2, c(ECOL.steel));
    } else { seg(g.x, g.y, g.tx, g.ty, 1.2 * s, O); line1(g.x, g.y, g.tx, g.ty, c(ECOL.steel)); }   // knife
  }
  function drawEnemy(e) {
    const J = e.dead ? e.pts : e.J, s = e.s, f = e.face, pal = e.pal, fl = false, O = PAL.out, top = e.look.top;   // no white hit flash: blood, sparks and the knock carry the hit
    const bw = e.bw, lw = 0.75 + 0.25 * bw, col = c => fl ? PAL.white : c;
    const [hd, nk, pl, eB, hB, eF, hF, kB, fB, kF, fF] = J;
    const bare = top === 'vest' || top === 'tank';   // sleeveless: arms show skin
    const leg = (h, k, ft, c) => {
      const [dx, dy] = norm(ft.x - k.x, ft.y - k.y), tx = ft.x + dy * 2.5 * s * f + dx * 0.5, ty = ft.y - dx * 2.5 * s * f + dy * 0.5;
      seg(h.x, h.y, k.x, k.y, 2.5 * s * lw, O); seg(k.x, k.y, ft.x, ft.y, 2.5 * s * lw, O); seg(ft.x, ft.y, tx, ty, 2.5 * s, O);
      seg(h.x, h.y, k.x, k.y, 1.5 * s * lw, col(c)); seg(k.x, k.y, ft.x, ft.y, 1.5 * s * lw, col(e.look.boots ? pal.shoe : c)); seg(ft.x, ft.y, tx, ty, 1.5 * s, col(pal.shoe));   // (rubber boots to the knee)
    };
    const arm = (sh, el, h, cu, cl, ch) => {
      seg(sh.x, sh.y, el.x, el.y, 2.2 * s * bw, O); seg(el.x, el.y, h.x, h.y, 2.2 * s * Math.min(bw, 1.3), O);
      seg(sh.x, sh.y, el.x, el.y, 1.2 * s * bw, col(cu)); seg(el.x, el.y, h.x, h.y, 1.2 * s * Math.min(bw, 1.3), col(cl)); disc(snap(h.x), snap(h.y), 1.6 * s * (0.8 + 0.2 * bw), col(ch));
    };
    const tail = (k, c) => {   // long coat: the skirt hangs past the knee
      const tx = pl.x + (k.x - pl.x) * 1.25, ty = pl.y + (k.y - pl.y) * 1.25;
      seg(pl.x, pl.y, tx, ty, 2.9 * s, O); seg(pl.x, pl.y, tx, ty, 1.9 * s, col(c));
    };
    leg(pl, kB, fB, pal.pantsB); if (top === 'coat') tail(kB, pal.topB);
    arm(nk, eB, hB, bare ? pal.skinB : pal.topB, bare ? pal.skinB : pal.topB, e.gloves ? pal.glove : pal.skinB);
    // torso: outline, top, then pants; vest open at the front, tank with a neckline, belt on the bare-armed builds
    const [tx, ty] = norm(pl.x - nk.x, pl.y - nk.y), nx = ty * f, ny = -tx * f, tw = 2.6 * s * bw;
    seg(nk.x, nk.y, pl.x, pl.y, tw + s, O);
    const cut = top === 'coat' ? 1 : 0.7, mx = nk.x + (pl.x - nk.x) * cut, my = nk.y + (pl.y - nk.y) * cut;
    seg(nk.x, nk.y, mx, my, tw, col(pal.top)); if (cut < 1) seg(mx, my, pl.x, pl.y, tw, col(pal.pants));
    if (!fl) {
      if (top === 'vest') seg(nk.x + nx * tw * 0.55, nk.y + ny * tw * 0.55, mx + nx * tw * 0.45, my + ny * tw * 0.45, 0.6 * s, pal.skin);
      if (top === 'tank') disc(snap(nk.x + nx * 0.6 * s), snap(nk.y + 1.2 * s), 1.1 * s * bw, pal.skin);
      if (top === 'jacket' || top === 'coat') seg(nk.x - nx * 0.8 * s, nk.y, nk.x + nx * 1.2 * s, nk.y + 1.4 * s, 0.9 * s, pal.topB);   // collar
      if (top === 'hood') { plot(Math.floor(nk.x + nx * tw * 0.6), Math.floor(nk.y + 2 * s), PAL.white); plot(Math.floor(nk.x + nx * tw * 0.6), Math.floor(nk.y + 3 * s), PAL.white); }   // drawstrings
      if (bare || e.type === 'boss') seg(mx - nx * tw * 0.8, my - ny * tw * 0.8, mx + nx * tw * 0.8, my + ny * tw * 0.8, 0.7 * s, pal.belt);
      if (e.role === 'thrower') for (let i = 1; i <= 3; i++) plot(Math.floor(nk.x + (mx - nk.x) * i / 4 + nx * (1.5 - i) * s), Math.floor(nk.y + (my - nk.y) * i / 4), ECOL.steel);   // knives on the chest strap
    }
    leg(pl, kF, fF, pal.pants); if (top === 'coat') tail(kF, pal.top);
    if (pal.apron) {   // a rubber apron from the chest to the knees, with old stains
      const ax = (kB.x + kF.x) / 2, ay = (kB.y + kF.y) / 2, sx0 = nk.x + (pl.x - nk.x) * 0.3, sy0 = nk.y + (pl.y - nk.y) * 0.3, bx = pl.x + (ax - pl.x) * 0.8, by = pl.y + (ay - pl.y) * 0.8;
      seg(sx0, sy0, bx, by, tw * 0.75 + 0.6, O); seg(sx0, sy0, bx, by, tw * 0.75 - 0.4, pal.apron);
      plot(Math.floor(pl.x + nx), Math.floor(pl.y - 1), BLOOD[1]); plot(Math.floor((sx0 + pl.x) / 2), Math.floor((sy0 + pl.y) / 2), BLOOD_D);
    }
    if (e.look.neck) for (let i = -1; i <= 1; i++) plot(Math.floor(nk.x + nx * 1.2 * s + i), Math.floor(nk.y + 2 * s - Math.abs(i) * 0.5), Math.floor(simTime * 2 + i) % 5 === 0 ? PAL.white : PAL.gold);   // the gold fish-scale chain glints
    const [ex, ey] = eHead(e, hd, nk, f, fl);
    if (e.dead) { plot(ex, ey, O); plot(ex - 1, ey - 1, O); plot(ex + 1, ey + 1, O); plot(ex + 1, ey - 1, O); plot(ex - 1, ey + 1, O); }
    else {
      const glow = (e.act && e.actT < 0) || e.sp || e.ph === 2;   // eyes flash on every wind-up; the enraged boss keeps them lit
      plot(ex, ey, glow ? BLOOD[2] : O); if (e.type === 'boss' && glow) plot(ex - f, ey, BLOOD[2]);
    }
    eDrawWeapon(e, J, fl);
    arm(nk, eF, hF, bare ? pal.skin : pal.top, bare ? pal.skin : pal.top, e.gloves ? pal.glove : pal.skin);
    if (e.bs) for (const b of e.bs) { const [x, y] = bodyStainAt(e, J, b); plot(Math.floor(x), Math.floor(y), b.c); }   // blood on him
    drawEnemyMarks(e);
  }
  // over the head: a health bar on a hurt goon, the '!' tell, the slam target, dizzy stars, a sweat drop
  function drawEnemyMarks(e) {
    const J = e.dead ? e.pts : e.J; if (!J) return;
    const hd = J[0], s = e.s, f = e.face, O = PAL.out, r = 4.6 * e.hk * s;
    if (!e.dead && e.type !== 'boss' && e.hp < e.maxHp) {   // small health bar over a hurt goon
      const x0 = Math.floor(e.x - 6), y0 = Math.floor(hd.y - r - 6);
      for (let i = 0; i < 12; i++) { plot(x0 + i, y0, O); plot(x0 + i, y0 + 1, i < 12 * e.hp / e.maxHp ? BLOOD[2] : C('#3a2230')); plot(x0 + i, y0 + 2, O); }
    }
    if (e.dead) return;
    const blink = Math.floor(simTime * 14) % 2;
    if (e.mark > 0) {   // '!' tell over the head: a heavy, committed or ranged move is coming
      const mx = Math.floor(hd.x), my = Math.floor(hd.y - r - (e.type === 'boss' ? 13 : 12)), mc = blink ? PAL.white : BLOOD[2], w = e.type === 'boss' ? 2 : 1;
      for (let k = 0; k < w; k++) { for (let y = 0; y < 4; y++) plot(mx + k, my + y, mc); plot(mx + k, my + 5, mc); }
    }
    if (e.sp === 'jslam') {   // the landing spot: red marks on the ground, tighter once it is locked
      const gy = GROUND - 1, sp = e.spT < -0.2 ? 10 : 7;
      if (blink || e.leapt) for (const k of [-2, -1, 1, 2]) { plot(Math.floor(e.jx + k * sp), gy, BLOOD[2]); plot(Math.floor(e.jx + k * sp) + 1, gy, BLOOD[2]); }
    }
    if (e.kind === 'marchetti') drawHookMarks(e, J);
    if (e.stunT > 0) for (let k = 0; k < 3; k++) {   // dizzy stars after a charge into the wall
      const a = simTime * 6 + k * 2.1;
      plot(Math.floor(hd.x + Math.cos(a) * 7 * s), Math.floor(hd.y - r - 3 + Math.sin(a) * 2), PAL.accent);
    }
    if (e.retreatT > 0 && blink) plot(Math.floor(hd.x - f * (r + 1)), Math.floor(hd.y - r + 1), EFX.sweat);   // scared: a sweat drop
  }
  function drawEnemies(L) {   // the goons in lane L (all of them when L is not given)
    const inL = e => L == null || (e.lane ?? LANE.FIGHT) === L;
    for (const e of enemies) if (e.dead && inL(e)) drawEnemy(e);
    for (const e of enemies) if (!e.dead && inL(e)) drawEnemy(e);
  }
  function drawGate() { if (enc.arena) for (let y = GROUND - 44; y < GROUND; y += 3) { plot(2429, y, BLOOD[2]); plot(2429, y + 1, BLOOD[1]); } }   // the gate is shut
  function drawEShots(knives = true) {
    for (const b of eshots) {   // enemy shots: red tracers, spinning knives
      if (b.k === 'b') { line1(b.x - b.vx * 0.025, b.y - b.vy * 0.025, b.x, b.y, BLOOD[2]); plot(Math.floor(b.x), Math.floor(b.y), PAL.white); }
      else if (knives) { const a = b.t * 22, cx = Math.cos(a) * 2, sy = Math.sin(a) * 2; line1(b.x - cx, b.y - sy, b.x + cx, b.y + sy, ECOL.steel); plot(Math.floor(b.x - cx), Math.floor(b.y - sy), ECOL.grip); }
    }
  }
  function clearEnemies() {
    enemies.length = 0; eshots.length = 0; for (const k in zoneAlive) delete zoneAlive[k]; for (const k in zoneN) delete zoneN[k];
    enc.boss = null; enc.bossBeaten = false; enc.arena = null; hero.hp = 100; hero.invT = 0;
    GORE.fill(0); PUD_BLOOD.fill(0); BPOOL.fill(0); drips.length = 0; for (const i of gList) gIn[i] = 0; gList.length = 0; BCAP.fill(0); VCAP.fill(0); spawnFx.length = 0;
  }

  // ---------- state ----------
  let hits = 0, landed = 0, timeScale = 1, showSkel = false, ragFace = 1, settleT = 0, gu = null;
  const ctl = { stOff: 0, combo: 0, comboEnd: -9, x: START_X, y: GROUND - 2, face: 1, spd: 0, phase: 0, air: false, vu: 0, accS: 0, jumps: 0, flipT: -1, spin: 0, landDip: 4, landDur: 0.22, baseY: GROUND - 2, cap: MAX_AIR, surf: GROUND_S, squatT: 0, squatEnd: -9, charged: false, wr: 0, yw: 0, slam: false, push: 0 };
  let queued = null, hitDone = false, wAct = 0, apSm = IDLE.slice(), lastHand = 0, kickLeg = 1;
  let hitStop = 0, bagFlash = 0, ragT = 0;
  let ragG = 0, ragGk = 1, ragKD = false;   // extra fall gravity: seconds left, factor; the fall is a knock-down (no K.O. from it)
  const input = { dir: 0, run: false, jump: false, jumpHeld: false, downHeld: false, fireHeld: false, attack: null, dashHeld: false };
  let grabIdx = -1, target = { x: 0, y: 0 }, pv = { x: 0, y: 0 }, lastMove = 0, lastPtr = null;
  let headSpeed = 0, simTime = 0;
  // shake amplitude in world px (1 light, 2 heavy, 3 slams); it decays over the shake time. Sites that only set shake get one from its length
  let shakeAmp = 0, shakeDur = 0, shakePrev = 0, shakeSet = false;
  function shakeIt(t, a) {
    if (reduceMotion) return;
    const cur = shakeDur > 0 ? shakeAmp * Math.max(0, cam.shake) / shakeDur : 0;
    cam.shake = Math.max(cam.shake, t); shakeSet = true;
    if (a >= cur) { shakeAmp = a; shakeDur = cam.shake; }
  }
  const particles = [], sparks = [], waves = [], bullets = [], flashes = [];
  const quakes = [];   // the boss's jump slam: shockwaves that roll along the ground; jump them
  const QUAKE = { v: 165, life: 1.25, dmg: 16, w: 5 };
  // ammo for guns, durability (hits left) for blades; fists never run out
  const charge = [0, 0, 0, 0, 0], fullCharge = w => WEAPONS[w].ammo || Math.round((WEAPONS[w].dura || 0) * DIF().dura);   // blades wear out faster on a harder level
  let wornId = -1, ammoFlash = 0;
  const ammoBoxes = [];   // ammo boxes and bandages (band: true)
  const BAND_P = 0.25, BAND_MAX = 3, BAND_T = 30, BAND_REGEN = 2.5;   // a bandage: drop chance, most on the ground, how long it heals, HP/s
  function ammoStep(dt) {
    const Wp = WEAPONS[hero.weapon];
    for (let i = ammoBoxes.length - 1; i >= 0; i--) {
      const b = ammoBoxes[i];
      if ((b.life -= dt) <= 0) { ammoBoxes.splice(i, 1); continue; }
      b.vy += G * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (enc.arena) b.x = clamp(b.x, enc.arena.x0 + 4, enc.arena.x1 - 4);
      const fl = floorBelow(b.x, b.y - 3, 0);
      if (b.vy > 0 && b.y >= fl.y - 2) { b.y = fl.y - 2; b.vy = Math.abs(b.vy) > 60 ? -b.vy * 0.35 : 0; b.vx *= 0.6; }
      if (b.band) {   // a bandage: walk over it, 30 s of regen (a new one starts the clock again)
        if (hero.mode === 'anim' && Math.abs(ctl.x - b.x) < 9 && Math.abs(ctl.y - b.y) < 16) {
          hero.bandT = BAND_T; ammoBoxes.splice(i, 1);
          for (let k = 0; k < 5; k++) particles.push({ x: b.x, y: b.y - 2, vx: (simRand() - 0.5) * 50, vy: -50 - simRand() * 40, life: 0.45, c: PAL.white });
          emit('pickup', { kind: 'bandage', x: b.x, y: b.y });
        }
        continue;
      }
      // walk over it: only a gun that is not full takes it, and it fills the gun
      if (hero.mode === 'anim' && Wp.ammo && charge[hero.weapon] < Wp.ammo && Math.abs(ctl.x - b.x) < 9 && Math.abs(ctl.y - b.y) < 16) {
        charge[hero.weapon] = Wp.ammo; ammoFlash = 0.6; ammoBoxes.splice(i, 1); emit('feat', 'ammo'); emit('pickup', { kind: 'ammo', w: hero.weapon, x: b.x, y: b.y });
        for (let k = 0; k < 5; k++) particles.push({ x: b.x, y: b.y - 2, vx: (simRand() - 0.5) * 50, vy: -50 - simRand() * 40, life: 0.45, c: PAL.gold });
      }
    }
  }
  const BAND_W = C('#e8e2d4'), BAND_R = C('#c8323a'), AMMO_G = C('#4f6b3a');
  const ammoPx = (x, y) => x === 0 || x === 6 || y === 0 || y === 4 ? PAL.out : y === 2 ? PAL.gold : AMMO_G;   // 7 x 5: a green box with a brass band
  const bandPx = (x, y) => x === 0 || x === 6 || y === 0 || y === 4 ? PAL.out : (x === 3 || (y === 2 && x >= 2 && x <= 4)) ? BAND_R : BAND_W;   // a white roll with a red cross
  function drawAmmo(L) {
    for (const b of ammoBoxes) {
      if (L != null && b.lane !== L) continue;
      if (b.life < 3 && Math.floor(b.life * 8) % 2) continue;   // blink before it goes
      const x0 = Math.floor(b.x) - 3, y0 = Math.floor(b.y) - 3;
      for (let y = 0; y < 5; y++) for (let x = 0; x < 7; x++) plot(x0 + x, y0 + y, (b.band ? bandPx : ammoPx)(x, y));
      if (Math.floor(simTime * 4 + b.x) % 5 === 0) plot(x0 + 5, y0 - 1, PAL.white);
    }
  }
  // you carry one weapon: picking up another drops the one in your hands
  const WEAPON_REST = q => q === GROUND_S || q === GOAL || q === PLATS[2] || q === PLATS[6];   // street, the two scaffolds, the club roof
  function dropHeld() {
    if (!hero.weapon) return;
    const fl = floorBelow(ctl.x, ctl.y - 4, 0), f = ctl.face, Wp = WEAPONS[hero.weapon], ok = WEAPON_REST(fl);
    // dropped on a car roof it slides off and falls to the street; elsewhere it lies where he stood
    thrown.push({ w: hero.weapon, ch: charge[hero.weapon], x: ctl.x - f * 6, y: ok ? fl.y : ctl.y - 6, vx: ok ? 0 : -f * 40, vy: ok ? 0 : -20, a: Wp.gun ? (f > 0 ? 0 : Math.PI) : Math.PI / 2 + f * 0.35,
      av: ok ? 0 : -f * 6, g: 0.8, len: Wp.len, face: f, stuck: ok, flat: !!Wp.gun, armed: false, hit: true, ids: new Set(), t: 0 });
    if (ok) puff(ctl.x - f * 6, fl.y - 1);
  }
  function equip(w, ch) {
    if (hero.weapon && hero.weapon !== w) dropHeld();
    setWeapon(w); charge[w] = ch;
  }
  function wear() {   // a blade loses one point per swing that connects
    const Wp = WEAPONS[hero.weapon]; if (!Wp.dura || wornId === hero.atkId) return;
    wornId = hero.atkId;
    if (--charge[hero.weapon] > 0) return;
    const g = weaponGeom(), w = hero.weapon;
    if (g) for (let i = 0; i < 12; i++) particles.push({ x: g.x + g.dx * g.len * simRand(), y: g.y + g.dy * g.len * simRand(),
      vx: (simRand() - 0.5) * 140, vy: -40 - simRand() * 90, life: 0.5 + simRand() * 0.4, c: i % 2 ? PAL.blade : PAL.bladeD });
    if (!reduceMotion) cam.shake = Math.max(cam.shake, 0.12);
    for (const k of pickups) if (k.w === w) k.taken = false;   // a fresh one waits on its pedestal
    toast(`${Wp.name} broke`, 'Fight on bare-handed, or fetch a new one: it lies on a bench', true);
    setWeapon(0);
  }
  // weapons in the world: thrown ones spin through the air, hit the first enemy or object, then lie on the floor;
  // dropped ones lie where you swapped them. Walk over one to take it (it swaps with the one in your hands)
  const thrown = [];
  // aim a throw at the nearest enemy in front (similar height, within 220 px): the speed it needs to arrive at his chest
  function aimAt(x, y, vx0, g) {
    const f = ctl.face; let foe = null;
    for (const e of enemies) { if (e.dead || e.down) continue; const dx = (e.x - x) * f; if (dx > 8 && dx < 220 && Math.abs(e.y - ctl.y) < 50 && (!foe || dx < (foe.x - x) * f)) foe = e; }
    if (!foe) return { vx: f * vx0, vy: -18 };   // nobody there: a flat throw
    const tx = foe.x, ty = foe.y - 18 * foe.s, T = Math.abs(tx - x) / vx0;
    return { vx: f * vx0, vy: clamp((ty - y - 0.5 * g * T * T) / T, -160, 60) };
  }
  function releaseThrow() {
    const w = hero.weapon, Wp = WEAPONS[w]; if (!w) return;
    const f = ctl.face, h = P[6], fast = Wp.id === 'katana', heavy = !fast;
    const aim = aimAt(h.x, h.y, (fast ? 215 : 175) + Math.max(0, ctl.spd) * 0.3, G * (heavy ? 0.85 : 0.55));
    thrown.push({ w, ch: charge[w], x: h.x, y: h.y, vx: aim.vx, vy: aim.vy, a: f > 0 ? -1.2 : Math.PI + 1.2,
      av: f * (fast ? 26 : Wp.gun ? 12 : 18), g: heavy ? 0.85 : 0.55, len: Wp.len, face: f, stuck: false, flat: !!Wp.gun, armed: true, hit: false, ids: new Set(), t: 0 });
    setWeapon(0); if (Wp.gun) emit('feat', 'hurl');
    if (!reduceMotion) cam.shake = Math.max(cam.shake, 0.05);
  }
  // a goon's body leaves a random weapon by it (a gun part-loaded): walk over it with empty hands, or squat on it to swap.
  // At most DROP_MAX of them lie about: the oldest goes
  const DROP_P = 0.5, DROP_MAX = 5;
  function dropWeapon(e) {
    const w = 1 + Math.floor(simRand() * 4), Wp = WEAPONS[w], x = clamp(e.x + (simRand() - 0.5) * 16, 20, W - 20), fl = floorBelow(x, e.y - 4, 0);
    const ch = Wp.ammo ? Math.max(1, Math.round(Wp.ammo * (0.3 + simRand() * 0.4))) : fullCharge(w);
    thrown.push({ w, ch, x, y: fl.y, vx: 0, vy: 0, a: simRand() < 0.5 ? 0 : Math.PI, av: 0, g: 0.6, len: Wp.len, face: 1, stuck: true, flat: true, armed: true, hit: false, ids: new Set(), t: 1, drop: true });
    const drops = thrown.filter(t => t.drop);
    if (drops.length > DROP_MAX) thrown.splice(thrown.indexOf(drops[0]), 1);
  }
  // a hurled (empty) gun is spent: it breaks apart where it lands
  function gunBreak(t, i) {
    thrown.splice(i, 1);
    for (let k = 0; k < 12; k++) particles.push({ x: t.x, y: t.y - 1, vx: (simRand() - 0.5) * 120, vy: -40 - simRand() * 80, life: 0.45 + simRand() * 0.35, c: k % 3 ? PAL.gunD : PAL.gunM });
    dust(t.x, t.y - 1, 3);
  }
  function thrownBreak(t, i) {
    thrown.splice(i, 1);
    for (let k = 0; k < 12; k++) particles.push({ x: t.x, y: t.y, vx: (simRand() - 0.5) * 140, vy: -40 - simRand() * 90, life: 0.5 + simRand() * 0.4, c: k % 2 ? PAL.blade : PAL.bladeD });
    for (const k of pickups) if (k.w === t.w) k.taken = false;
    toast(`${WEAPONS[t.w].name} broke`, 'A new one lies on a bench', true);
  }
  function throwStep(dt) {
    for (let i = thrown.length - 1; i >= 0; i--) {
      const t = thrown[i];
      if (t.stuck) {   // empty hands: walk over it to take it. Holding a weapon: squat (S) on it to swap
        const near = hero.mode === 'anim' && Math.abs(ctl.x - t.x) < (t.hit && !hero.weapon ? 22 : 10) && Math.abs(ctl.y - t.y) < 16;   // a blade that bounced back off a goon: in reach, bare hands take it
        if (near && t.hit && !hero.weapon && !ctl.carry) t.armed = true;
        t.near = near && t.armed;
        if (!near) t.armed = true;   // a weapon you just dropped waits until you step away
        else if (t.armed && !ctl.carry && (!hero.weapon || input.downHeld)) {
          const had = hero.weapon; thrown.splice(i, 1); equip(t.w, t.ch); emit('feat', had ? 'swap' : 'catch'); emit('pickup', { kind: 'weapon', w: t.w, source: 'ground', x: t.x, y: t.y });
          sparks.push({ x: t.x, y: t.y - 4, t: 0.05 });
        }
        continue;
      }
      t.t += dt; t.vy += G * t.g * dt; t.x += t.vx * dt; t.y += t.vy * dt; t.a += t.av * dt;
      if (!hero.weapon && !ctl.carry && hero.mode === 'anim' && t.t > 0.2 && !(WEAPONS[t.w].gun && !t.drop) && Math.abs(t.x - ctl.x) < 14 && t.y > ctl.y - 56 && t.y < ctl.y + 4) {   // (a hand reaches up over the head too)   // it bounced back to him: bare hands snatch it out of the air
        thrown.splice(i, 1); equip(t.w, t.ch); emit('feat', 'catch'); emit('pickup', { kind: 'weapon', w: t.w, source: 'ground', x: t.x, y: t.y }); sparks.push({ x: t.x, y: t.y, t: 0.05 }); continue;
      }
      const tipx = t.x + Math.cos(t.a) * t.len * 0.5, tipy = t.y + Math.sin(t.a) * t.len * 0.5;
      let gone = false;
      if (!t.hit) for (const e of enemies) {   // the first enemy in the path takes the blade
        if (e.dead || e.down) continue;
        const [ax, ay, bx, by] = capsule(e.J);
        if (segDist(ax, ay, bx, by, t.x, t.y) < 4 * e.s + 4 || segDist(ax, ay, bx, by, tipx, tipy) < 4 * e.s + 2) {
          const id = WEAPONS[t.w].id, d = Math.sign(t.vx) || t.face, blade = !WEAPONS[t.w].gun;
          killBy = t.w;
          damageEnemy(e, id === 'axe' ? 45 : id === 'katana' ? 32 : 18, d, id === 'axe' ? 300 : blade ? 220 : 200, 0.35, t.x, t.y, blade);
          killBy = null; hitCtx = 'tw'; hitFx(id === 'axe' ? 300 : 220); hitCtx = null; emit('feat', 'throwhit');
          t.hit = true; t.vx *= -0.2; t.vy = -70; t.av *= 0.4;
          if (blade && (t.ch -= 2) <= 0) { thrownBreak(t, i); gone = true; }
          break;
        }
      }
      if (gone) continue;
      if (!t.hit) for (const o of objs.slice()) {
        if (t.ids.has(o) || objNear(o, t.x, t.y).d > 2) continue;
        t.ids.add(o); launchObj(o, t.x, t.y, Math.sign(t.vx) || 1, 200, 0.3);
        t.vx *= 0.5; t.av *= 0.6;
        if (!WEAPONS[t.w].gun && --t.ch <= 0) { thrownBreak(t, i); gone = true; break; }
      }
      if (gone) continue;
      if (!t.hit && bagTouch(t.x, t.y)) { bagHit(t.x, t.y, Math.sign(t.vx) || 1, 200); t.hit = true; t.vx *= -0.2; }
      const lo = enc.arena ? enc.arena.x0 + 4 : 4, hi = enc.arena ? enc.arena.x1 - 4 : W - 4;
      if (t.x < lo || t.x > hi) { t.x = clamp(t.x, lo, hi); t.vx *= -0.3; t.hit = true; }
      let fl = GROUND_S;   // weapons come to rest only on the street, a scaffold deck or the club roof: never on a car, a van or a crate
      for (const q of SURF) if (WEAPON_REST(q) && t.x >= q.x0 && t.x <= q.x1 && t.y - 4 <= q.y + 0.5 && q.y < fl.y) fl = q;
      if (t.vy > 0 && t.y >= fl.y - 2) {   // bite into the floor, point first
        t.y = fl.y;
        if (WEAPONS[t.w].gun && !t.drop) { gunBreak(t, i); continue; }   // a hurled gun does not come back
        t.stuck = true; t.a = t.flat ? (t.vx >= 0 ? 0 : Math.PI) : Math.PI / 2 - Math.sign(t.vx || t.face) * 0.35;
        dust(t.x, fl.y - 1, 3); puff(t.x, fl.y - 1);
      }
    }
  }
  function drawThrown(L) {   // L: a lane (weapons in flight), or 'lying' (every weapon on the ground, drawn over everything)
    for (const t of thrown) {
      if (L === 'lying' ? !t.stuck : t.stuck || (L != null && t.lane !== L)) continue;
      const dx = Math.cos(t.a), dy = Math.sin(t.a), id = WEAPONS[t.w].id;
      // stuck: the tip sits a little in the floor; flying: spin about the middle
      const k = t.stuck && !t.flat ? 0.85 : 0.5, g = { x: t.x - dx * t.len * k, y: t.y - dy * t.len * k - (t.stuck && t.flat ? 2 : 0), dx, dy, s: t.face, len: t.len };
      drawWeaponShape(id, g, 0);
    }
  }
  function outOfAmmo() {
    const Wp = WEAPONS[hero.weapon];
    for (const k of pickups) if (k.w === hero.weapon) k.taken = false;   // the pedestal has a loaded one again
    toast(`${Wp.name}: out of ammo`, 'Fire again to hurl it at them, or find an ammo box', true);
    gun.want = false;
  }
  const gun = { cd: 0, aimT: 0, aimW: 0, recoil: 0, climb: 0, pumpT: -1, want: false };
  let gunPose = null;

  function dust(x, y, n) {
    for (let k = 0; k < n; k++) particles.push({ x, y, vx: (simRand() - 0.5) * 60, vy: -20 - simRand() * 40, life: 0.35 + simRand() * 0.25, c: simRand() < 0.5 ? PAL.dust1 : PAL.dust2 });
  }
  function setJoints(j) { P.forEach((p, i) => { p.px = p.x; p.py = p.y; p.x = j[i][0]; p.y = j[i][1]; }); }

  const WSWING = /^(ks[0-2]|al1?)$/;   // the light blade swings that build a combo
  function startAttack(a) {
    // light kicks repeat with the current leg; a heavy kick switches to the other leg, which then stays current
    const Wp = WEAPONS[hero.weapon];
    // blades: taps run a combo (katana: forehand, backhand, back-hand cut; axe: front-hand chop, back-hand chop);
    // a hold inside the combo is the top-to-bottom finisher, a hold from neutral a wide two-hand swing
    const combo = MOVES[hero.act] && WSWING.test(hero.act) || simTime - ctl.comboEnd < 0.45;
    if (a === 'lp') {
      if (Wp.melee) { const n = Wp.id === 'katana' ? 3 : 2; ctl.combo = combo ? (ctl.combo + 1) % n : 0; a = Wp.id === 'katana' ? 'ks' + ctl.combo : ctl.combo ? 'al1' : 'al'; }
      else { lastHand ^= 1; a = 'lp' + lastHand; }
    } else if (a === 'hp') {
      a = Wp.melee ? (Wp.id === 'katana' ? (combo ? 'kh' : 'kw') : combo ? 'ah' : 'aw') : Wp.gun ? 'tw' : 'hp';   // (guns are never clubs: an empty gun is thrown, a loaded one fires, see tryAttack)
      ctl.comboEnd = -9; ctl.combo = 0;
    }
    else if (a === 'lk') a += kickLeg;
    else if (a === 'hk') { kickLeg ^= 1; a += kickLeg; }
    hero.act = a; hero.actT = 0; hitDone = false; hero.atkId++; ctl.slam = false;
    emit('swing', { move: a, weapon: hero.weapon, w: Wp.id, blade: !!Wp.melee, heavy: /^(hp|hk|kw|kh|aw|ah|shp|sweep)/.test(a), x: ctl.x, y: ctl.y, dir: ctl.face });
    emit('feat', a.replace(/[0-9]$/, ''));
  }
  function startFall() {
    ctl.air = true; ctl.vu = 0; ctl.jumps = Math.max(ctl.jumps, 1); ctl.baseY = ctl.y; ctl.cap = MAX_AIR;
    if (!MOVES[hero.act] && !rollingNow()) { hero.act = 'air'; hero.actT = 0; }   // a roll off a ledge keeps rolling through the drop
  }
  const rollingNow = () => hero.act === 'dash' && ctl.dashK === 'roll';
  function landOn(s, fv) {
    ctl.y = s.y - 2; ctl.airDash = false; coyT = 0;
    if (s.bouncy && !input.downHeld) {   // trampoline: each bounce beats the landing that made it; hold S to stop
      const v = Math.min(TRAMP_MAX, Math.max(TRAMP_MIN, fv * TRAMP_GAIN + TRAMP_ADD) + (input.jumpHeld ? TRAMP_HOLD : 0));
      s.squish = 0.18;
      ctl.bounces = (ctl.bounces || 0) + 1; emit('feat', 'bounce'); if (ctl.bounces >= 3) emit('feat', 'bounce3');
      if (!reduceMotion && v > 280) cam.shake = Math.max(cam.shake, 0.06);
      {
        ctl.vu = v; ctl.jumps = 1; ctl.baseY = ctl.y; ctl.cap = 999; ctl.tramp = true;
        if (hero.act !== 'air') { hero.act = 'air'; hero.actT = 0; }
        ibuf.jump = 0;   // the held jump already adds its kick to the bounce
        sparks.push({ x: ctl.x, y: s.y - 1, t: 0.1 });
        return;
      }
    }
    if (s.bouncy) s.squish = 0.18;
    ctl.bounces = 0; ctl.tramp = false;
    emit('land', { x: ctl.x, y: s.y, v: fv, heavy: fv >= TRN.heavy, surface: s === GROUND_S ? 'ground' : 'ledge' });
    if (s === GOAL) emit('feat', 'top');
    const plunge = hero.act === 'aair';
    if (plunge) slam(ctl.x + 9 * ctl.face, s.y, 40, 1.6);   // axe plunge lands
    ctl.air = false; ctl.jumps = 0; ctl.flipT = -1; ctl.spin = 0; ctl.surf = s;
    if (!input.dir && hero.act !== 'dash') ctl.spd *= 0.35;   // [feel] the feet grip on landing: no long slide off a ledge
    if (rollingNow()) { dust(ctl.x - 3, s.y - 1, 3); dust(ctl.x + 3, s.y - 1, 3); return; }   // rolled off a ledge: it lands still rolling and rolls on
    hero.act = 'land'; hero.actT = 0; queued = null;
    ctl.landDip = clamp(fv / 30, 3, 7); ctl.landDur = fv > 150 ? 0.3 : 0.22;
    if (fv < TRN.soft) { ctl.landDip = clamp(fv / 60, 0.8, 2); ctl.landDur = 0.14; }   // hop: small dip
    else if (fv >= TRN.heavy && !plunge) {   // heavy: a hero landing from a stand, a deep knee bend that runs on when moving
      if (ctl.spd > TRN.rollV) { ctl.landDip = 7; ctl.landDur = 0.32; } else hero.act = 'hero';
    }
    const n = fv < TRN.soft ? 1 : fv > 150 ? (hero.act === 'roll' ? 4 : 6) : 3;
    dust(ctl.x - 3, s.y - 1, n); dust(ctl.x + 3, s.y - 1, n);
    if (fv > 150 && hero.act !== 'roll') { waves.push({ x: ctl.x, y: s.y - 1, t: 0 }); if (!reduceMotion) cam.shake = Math.max(cam.shake, hero.act === 'hero' ? 0.16 : 0.12); }
  }

  // ===== [G2] transitions =====
  // ----- feel: input buffer, coyote time, cancels, dodge, pose blending -----
  // BUF: a press waits this long for the fighter to be free; COYOTE: a ground jump still works this long after walking off a ledge
  const BUF = 0.12, COYOTE = 0.1;
  const ibuf = { jump: 0, atk: null, atkT: 0, dash: 0 };
  let dashCd = 0, atkHit = false, hitAtk = -1, hitCtx = null, coyT = 0, gunArmW = 0, gunArms = null;
  const isLight = m => m.dur < 0.5;
  // a queued attack starts here: the rest of the recovery is cut, the pose blend hides the cut
  const chainAt = m => m.win ? m.win[1] + (isLight(m) ? 0.35 : 0.55) * (m.dur - m.win[1]) : m.dur;
  // jump or dodge out of an attack: a light one as soon as it connects, a heavy one after its active window; any once the chain point passes
  const cancelOK = () => { const m = MOVES[hero.act]; return !!m && !ctl.air && ((atkHit && m.win && hero.actT >= (isLight(m) ? m.win[0] : m.win[1])) || hero.actT >= chainAt(m)); };
  function hitSpark(x, y, dir, power, blade) {   // crisp single pixels thrown along the hit, plus the star
    const n = 3 + Math.round(power / 60);
    for (let k = 0; k < n; k++) {
      const a = (simRand() - 0.5) * (blade ? 0.5 : 1.1) - (blade ? 0.35 : 0.15), sp = 90 + simRand() * 120 + power * 0.3;
      particles.push({ x, y, vx: dir * Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.08 + simRand() * 0.12, c: k % 3 ? PAL.white : PAL.accent });
    }
    sparks.push({ x, y, t: power >= 250 ? 0 : 0.05 });
  }
  const kickDir = { x: 1, y: 0 };
  function kickCam(dx, dy, k) { if (reduceMotion) return; kickDir.x = dx; kickDir.y = dy; cam.kick.x = clamp(cam.kick.x + dx * k, -3, 3); cam.kick.y = clamp(cam.kick.y + dy * k, -3, 3); }
  let rollCd = 0;
  const ROLL_CD = 1.0;   // the rest after a roll before the next one (no roll spam)
  const ROLL_MAX = 1;   // rolls in one chain while U is held
  function startRoll(d) {
    ctl.rollN = (hero.act === 'dash' && ctl.dashK === 'roll' && ctl.chainRoll ? ctl.rollN : 0) + 1;
    ctl.face = d; ctl.spd = Math.max(ctl.spd, DASH.v); ctl.dashK = 'roll'; ctl.chainRoll = true; ctl.flipT = -1; queued = null;
    hero.act = 'dash'; hero.actT = 0; hero.invT = Math.max(hero.invT, DASH.dur + 0.03);   // the whole roll dodges
    rollCd = DASH.dur + ROLL_CD;   // counted from the start: a roll cut short by an attack gets no early next roll
    dust(ctl.x - d * 3, ctl.y + 1, 3); emit('feat', 'roll'); emit('roll', { x: ctl.x, y: ctl.y, dir: d });
  }
  function tryDash() {
    if (dashCd > 0 || hero.mode !== 'anim' || hero.act === 'dash' || hero.act === 'hero' || hero.act === 'rise' || hero.act === 'crouch' || hero.act === 'climb') return false;
    if (MOVES[hero.act] && !(ctl.air ? hero.actT > (MOVES[hero.act].win || [0, MOVES[hero.act].dur])[1] && hero.act !== 'aair' : cancelOK())) return false;
    const d = input.dir;
    queued = null; ctl.slam = false; ctl.flipT = -1;
    if (ctl.air) {
      if (ctl.airDash) return false;
      ctl.airDash = true; ctl.dashK = 'air';
      if (d) ctl.face = d;
      ctl.spd = DASH.air; ctl.vu = Math.max(ctl.vu, 0);
      emit('roll', { x: ctl.x, y: ctl.y, dir: ctl.face, air: true });
      sparks.push({ x: P[2].x - ctl.face * 4, y: P[2].y, t: 0.1 });
    } else {   // on the ground the dodge is always a roll: toward the held direction, or the way he faces
      if (rollCd > 0) return false;
      hero.act = null; startRoll(d || ctl.face); dashCd = DASH.cd; return true;
    }
    hero.act = 'dash'; hero.actT = 0; dashCd = DASH.cd;
    hero.invT = Math.max(hero.invT, DASH.inv);
    return true;
  }
  // from a squat: a tap punch jabs low, a held one drives a low body blow; a tap kick hits the shins, a held one sweeps the legs (he goes down)
  const LOW = { lp: 'slp', hp: 'shp', lk: 'slk', hk: 'sweep' }, LOW_RE = /^(slp|shp|slk|sweep|sslash)$/;
  const lowOf = (a, Wp) => a === 'tw' ? 'tw' : Wp.gun ? 'tw' : Wp.melee && (a === 'lp' || a === 'hp') ? 'sslash' : LOW[a] || a;
  const CBASH = 0.36;   // a bash with a lifted object: it comes down in front of him and back up
  function tryAttack(a) {   // true when the press is used up
    if (hero.act === 'climb') return false;
    if (ctl.carry) {   // a bin or a crate in one hand: a tap swings it, a hold throws it; kicks wait
      if (MOVES[hero.act] || hero.act === 'rise') return false;
      if (a === 'lp') { if (!(ctl.bashT > 0)) { ctl.bashT = CBASH; ctl.bashHit = false; } return true; }
      if (a === 'lk' || a === 'hk') return true;
      if (ctl.bashT > 0) return false;
      throwCarry(); return true;
    }
    const Wp = WEAPONS[hero.weapon];
    if (a === 'tw' && pocket.length) {   // something in the pocket: a long punch hold throws that first
      if (MOVES[hero.act] || hero.act === 'rise' || hero.act === 'roll' || hero.act === 'crouch' || hero.act === 'hero' || hero.act === 'dash') return false;
      throwPocket(); return true;
    }
    if (a === 'tw') {   // throw the weapon in hand once the fighter is free
      if (!hero.weapon) return true;
      if (MOVES[hero.act] || hero.act === 'rise' || hero.act === 'roll' || hero.act === 'crouch' || hero.act === 'hero' || hero.act === 'dash') return false;
      ctl.flipT = -1; ctl.spin = 0; startAttack('tw'); return true;
    }
    if (Wp.gun && (a === 'lp' || (a === 'hp' && charge[hero.weapon] > 0))) { gun.want = true; if (Wp.auto) gun.tapT = 0.28; return true; }   // no gun bash: a held punch fires too   // a tap on the machine gun fires a short burst
    if (ctl.air) {
      if (hero.act !== 'air' && !(hero.act === 'dash' && hero.actT > DASH.airDur * 0.5)) return false;
      const air = a === 'lk' || a === 'hk' ? 'airkick' : Wp.id === 'katana' ? 'kair' : Wp.id === 'axe' ? 'aair' : null;
      if (air) { ctl.flipT = -1; ctl.spin = 0; startAttack(air); }
      return true;
    }
    if (hero.act === 'crouch' || hero.act === 'hero' || hero.act === 'rise') return false;
    if (hero.act === 'roll' || hero.act === 'dash') { if (hero.actT < (hero.act === 'roll' ? TRN.roll : DASH.dur) * 0.55) return false; startAttack(a); return true; }
    const m = MOVES[hero.act], low = input.downHeld && (hero.act === 'squat' || LOW_RE.test(hero.act || ''));   // attacks from a squat stay low, and so does a chain of them
    if (m) { if (hero.actT < m.dur * 0.3) return false; queued = low ? lowOf(a, Wp) : a; return true; }
    if (low) { startAttack(lowOf(a, Wp)); return true; }
    if (input.dir === -ctl.face) { ctl.face = input.dir; ctl.spd = 0; }   // attack the way the stick points: turn on the spot
    startAttack(a); return true;
  }
  // a step into the blow: grounded heavy strikes slide the fighter forward over the last moment before contact
  function lunge(m, dt) {
    if (ctl.air || !m.keys || !m.win || isLight(m)) return;
    const d = 4.5, t0 = m.win[0] - 0.08, t1 = m.win[0] + 0.03;
    if (hero.actT <= t0 || hero.actT > t1 || ((BAG_X - ctl.x) * ctl.face > -4 && (BAG_X - ctl.x) * ctl.face < 16)) return;
    for (const e of enemies) { const ahead = (e.x - ctl.x) * ctl.face; if (!e.dead && ahead > -4 && ahead < 14 + 6 * e.s && Math.abs(e.y - ctl.y) < 20) return; }   // never step into a foe
    ctl.x += ctl.face * d / (t1 - t0) * dt;
  }
  // pose blending by inertialization: when the target pose jumps (a new action, a weapon swap, a cut flip),
  // the gap between the shown pose and the new target becomes an offset that a critically damped spring
  // runs to zero, starting at the pose's current velocity. Keyframes play at full snap; nothing pops.
  const NP = 15;   // pose params plus the body spin
  const INR = { out: null, v: new Float64Array(NP), off: new Float64Array(NP), ov: new Float64Array(NP), tp: null, act: null, w: -1, om: 30 };
  const JMP = [2, 2, 0.3, 0.3, 2, 2, 2, 2, 0.35, 0.35, 0.35, 0.35, 0.3, 0.4, 0.6];
  const wrapA = a => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));
  function inertia(tp, dt) {
    if (!INR.out) { INR.out = tp.slice(); INR.tp = tp.slice(); INR.act = hero.act; INR.w = hero.weapon; INR.v.fill(0); INR.off.fill(0); INR.ov.fill(0); return tp.slice(); }
    const dif = (a, b, i) => i === 14 ? wrapA(a - b) : a - b;
    let ev = hero.act !== INR.act || hero.weapon !== INR.w;
    // [feel] inside one attack the keys are continuous: a fast strike plays at full snap, it is no jump to smooth over
    if (!(MOVES[hero.act] && hero.act === INR.act)) for (let i = 0; i < NP && !ev; i++) if (Math.abs(dif(tp[i], INR.tp[i], i)) > JMP[i]) ev = true;
    if (ev) {
      for (let i = 0; i < NP; i++) { INR.off[i] = dif(INR.out[i], tp[i], i); INR.ov[i] = INR.v[i]; }
      // the first strike out of a stance or a walk eases in a little softer than a chained one, so the arms do not pop
      INR.om = MOVES[hero.act] ? (MOVES[INR.act] ? 42 : 28) : hero.act === 'dash' ? 38 : hero.act === 'land' || hero.act === 'hero' ? 26 : 30;
    }
    const w = INR.om, out = tp.slice();
    for (let i = 0; i < NP; i++) {
      INR.ov[i] += (-w * w * INR.off[i] - 2 * w * INR.ov[i]) * dt; INR.off[i] += INR.ov[i] * dt;
      out[i] = tp[i] + INR.off[i];
      INR.v[i] = dif(out[i], INR.out[i], i) / dt;
    }
    INR.out = out; INR.tp = tp.slice(); INR.act = hero.act; INR.w = hero.weapon;
    return out;
  }
  // ===== [/G2] =====
  function animStep(dt) {
    if (hero.mode === 'getup') {
      gu.t += dt;
      setJoints(getupJoints(gu, ctl.x, ctl.y, ctl.face));
      if (gu.t >= GU_T[2]) { hero.mode = 'anim'; hero.ko = false; hero.act = 'rise'; hero.actT = 0; apSm = RISE.slice(); wAct = 1; INR.out = null; }
      return;
    }
    if (hero.atkId !== hitAtk) { hitAtk = hero.atkId; atkHit = false; }
    dashCd -= dt; coyT -= dt; rollCd -= dt; if (ctl.duckT > 0) ctl.duckT -= dt;
    const atk = !!MOVES[hero.act], locked = atk || hero.act === 'rise' || hero.act === 'roll' || hero.act === 'hero' || hero.act === 'dash' || hero.act === 'climb';
    if (hero.act === 'teeter' && (input.dir || ctl.air)) hero.act = null;
    const free = hero.act === null || hero.act === 'guard' || hero.act === 'land' || hero.act === 'settle' || hero.act === 'start' || hero.act === 'pivot' || hero.act === 'teeter';
    let tgt = 0;
    if (!ctl.air && !locked && input.dir !== 0) {
      if (input.dir !== ctl.face) {   // fast: skid, then pivot; slow: brake, then a small pivot
        if (hero.act !== 'skid' && free && ctl.spd > TRN.skidV) { hero.act = 'skid'; hero.actT = 0; }
        if (ctl.spd < 4) { const sk = hero.act === 'skid'; ctl.face = input.dir; if (sk || free) { hero.act = 'pivot'; hero.actT = 0; ctl.pivT = sk ? 0.12 : 0.08; } }
      } else {
        if (hero.act === 'skid') hero.act = null;   // changed your mind: run on
        if (!input.downHeld) {   // no walking while squatting, but you can turn
          tgt = input.run ? RUN : WALK;
          if (hero.act === null && ctl.spd < 1) { hero.act = 'start'; hero.actT = 0; }   // anticipation dip
        }
      }
      if (hero.act === 'guard') hero.act = null;
    } else if (!ctl.air && !locked && input.dir === 0 && hero.act === null) {
      if (ctl.spd > TRN.stopV) { hero.act = 'skid'; hero.actT = 0; }   // let go of a sprint: skid to a stop
      else if (ctl.spd < 1 && !input.downHeld && ctl.surf !== GROUND_S && !ctl.surf.bouncy && !ctl.surf.step && !ctl.surf.landing) {   // idle on a ledge end: teeter (not on the fire escape: its treads are narrow and its rails hold you)
        const e = ctl.surf.x1 - ctl.x < TRN.edge ? 1 : ctl.x - ctl.surf.x0 < TRN.edge ? -1 : 0;
        if (e) { hero.act = 'teeter'; hero.actT = 0; ctl.edge = e; }
      }
    }
    if (hero.act === 'roll' || hero.act === 'dash') tgt = ctl.spd;   // the roll keeps its momentum; the dodge sets its own speed
    // squat while down is held; a squat held long enough charges a higher jump
    // squat pressed at a run: a dodge roll (like U), the way he is running; at a walk or standing, a plain squat
    const downEdge = input.downHeld && !ctl.downPrev; ctl.downPrev = input.downHeld;
    if (downEdge && !ctl.air && hero.mode === 'anim' && ctl.spd > WALK + 10 && hero.act !== 'squat' && tryDash()) { ibuf.dash = 0; emit('feat', 'squatroll'); }
    const ducking = input.downHeld || ctl.duckT > 0;   // held down, or an automatic duck under a bullet
    if (!ctl.air && ducking && !locked && hero.act !== 'dash' && (free || ctl.duckT > 0) && hero.act !== 'pivot' && hero.act !== 'squat') { hero.act = 'squat'; hero.actT = 0; ctl.squatT = 0; }
    else if (hero.act === 'squat' && (!ducking || ctl.air)) { hero.act = null; ctl.squatEnd = simTime; }
    const prevSpd = ctl.spd;
    if (!ctl.air) {
      const rate = tgt > ctl.spd ? (tgt > WALK ? 230 : 180) : (hero.act === 'skid' ? (input.dir === -ctl.face ? TRN.skidDec * 1.7 : TRN.skidDec) : hero.act === 'squat' ? 520 : locked ? 260 : input.dir === -ctl.face ? 400 : 150);   // a squat at a run plants the feet: he stops in a stride or two, no slide
      ctl.spd += clamp(tgt - ctl.spd, -rate * dt, rate * dt);
    }
    ctl.accS += ((ctl.spd - prevSpd) / dt - ctl.accS) * (1 - Math.exp(-10 * dt));
    if (!ctl.air && ctl.accS < -100 && ctl.spd > 25 && simRand() < 0.25) dust(P[10].x, ctl.y + 1, 1);   // skid
    if (hero.act === 'skid' && ctl.spd > 6 && simRand() < 0.45) dust(P[simRand() < 0.6 ? 10 : 8].x, ctl.y + 1, 1);
    const xPrev = ctl.x;
    ctl.x += ctl.face * ctl.spd * dt;
    if (ctl.push > 0.5) { ctl.x -= ctl.face * ctl.push * dt; ctl.push *= Math.exp(-(ctl.pushK || 9) * dt); } else { ctl.push = 0; ctl.pushK = 0; }
    if ((ctl.x < 10 && openT < 0) || ctl.x > W - 10) { ctl.x = clamp(ctl.x, 10, W - 10); ctl.spd = 0; }
    if (enc.arena && (ctl.x < enc.arena.x0 || ctl.x > enc.arena.x1)) { ctl.x = clamp(ctl.x, enc.arena.x0, enc.arena.x1); ctl.spd = 0; }
    if (!flags.club && ctl.y < GOAL.y + 4 && ctl.x > KIOSK_X - 2 && ctl.x < GOAL.x1 + 30) { ctl.x = KIOSK_X - 2; ctl.spd = 0; }   // the kiosk wall: nobody walks off the roof's right end
    if (ctl.surf && (ctl.surf.landing || (ctl.surf.step && ctl.surf.y < GROUND - 6)) && (ctl.x < STAIR_X0 || ctl.x > STAIR_X1) && xPrev >= STAIR_X0 && xPrev <= STAIR_X1 && (!ctl.air || ctl.y + 2 > railTop(ctl.x > STAIR_X1 ? 1 : -1, ctl.surf))) {   // the rails: they stop a walk; a jump goes over once the feet clear the rail top; once outside, nothing pulls him back
      ctl.x = clamp(ctl.x, STAIR_X0, STAIR_X1); if (!ctl.air) ctl.spd = 0;
    }
    if (!ctl.air) {
      if (nearStairs(ctl.x)) { const up = stairStep(ctl.x, ctl.y + 2, true, ctl.spd > 1 ? ctl.face : 0); if (up) { ctl.stOff += ctl.y - (up.y - 2); ctl.y = up.y - 2; ctl.surf = up; emit('feat', 'stairs'); } }
      let s = supportAt(ctl.x, ctl.y);
      if (!s && nearStairs(ctl.x)) { const dn = stairStep(ctl.x, ctl.y + 2, false); if (dn) { ctl.stOff += ctl.y - (dn.y - 2); ctl.y = dn.y - 2; s = dn; } }
      if (!s) { startFall(); coyT = COYOTE; }   // walked off a ledge: a jump still counts as a ground jump for a moment
      else { ctl.surf = s; if (s === GOAL) emit('feat', 'top'); }
    }
    {   // [feel] on a flight the body is drawn on the slope through the tread centres (2 px up per 4 px), so a climb reads as one smooth line;
        // each 2 px step is added to the offset when it happens and the offset eases back, also through a take-off (no pop)
      const sf = !ctl.air && ctl.surf && ctl.surf.step ? ctl.surf : null, want = sf ? clamp(-(ctl.x - sf.x0 - 1.5) * sf.dir * 0.5, -1, 1) : 0;
      ctl.stOff += (want - ctl.stOff) * (1 - Math.exp(-(sf ? 30 : 10) * dt));
    }
    if (ignoreS && (ignoreT -= dt) <= 0) ignoreS = null;
    if (!ctl.air) {
      const prev = ctl.phase;
      ctl.phase = (ctl.phase + gaitFreq(ctl.spd) * dt) % 1;
      for (let i = 0; i < 2; i++) if ((ctl.phase + i * 0.5) % 1 < (prev + i * 0.5) % 1) {   // a foot strikes the ground
        if (ctl.spd > 45) dust(P[i ? 10 : 8].x, ctl.y + 1, 2);
        if (ctl.spd > 5) emit('step', { x: P[i ? 10 : 8].x, y: ctl.y, foot: i, run: ctl.spd > WALK + 8, wet: !flags.club });
      }
    }
    const g = gait();

    // presses wait in a short buffer until the fighter can act on them
    if (input.jump) { input.jump = false; if (hero.act !== 'crouch') ibuf.jump = BUF; }   // a press during the take-off squat is the same jump
    if (!flags.demo && enc.introT < 0 && !hookPull) btnTick(dt);   // (the boss entrance and the hook pull lock the controls: a held Q or W does not go off there)
    if (input.attack) { ibuf.atk = input.attack; ibuf.atkT = BUF; input.attack = null; }
    if (input.dash) { input.dash = false; ibuf.dash = BUF; }
    if (ibuf.dash > 0 && input.downHeld && !ctl.air && ctl.surf !== GROUND_S && !ctl.surf.box && (!locked || cancelOK())) {   // squat + Space up on a ledge: drop through it
      ignoreS = ctl.surf; ignoreT = 0.35; startFall(); emit('feat', 'drop'); ibuf.dash = 0;
    }
    if (ibuf.dash > 0) { if (tryDash()) { ibuf.dash = 0; ibuf.jump = 0; } else ibuf.dash -= dt; }   // (on the ground it is the roll)
    if (ibuf.jump > 0) {
      const free = !locked || cancelOK();
      let used = true;
      if (hero.act === 'climb') used = false;
      else if (!ctl.air && free && hero.act !== 'crouch') {
        ctl.charged = false;   // (no charged or held high jump: high places are climbed, CLIMB)
        hero.act = 'crouch'; hero.actT = 0; queued = null; ctl.spin = 0;
      } else if (ctl.air && coyT > 0 && hero.act === 'air' && ctl.jumps <= 1) {   // coyote time: just walked off, a full ground jump
        hero.act = 'crouch'; hero.actT = 9; ctl.air = false; ctl.charged = false; coyT = 0;
      } else if (false) {   // (no double jump: a person cannot push off the air; high places are climbed)
        ctl.jumps = 2; ctl.vu = DOUBLE_V; ctl.flipT = 0; emit('feat', 'double'); emit('jump', { x: ctl.x, y: ctl.y, double: true }); hero.act = 'air'; hero.actT = 0;
        if (input.dir === ctl.face) ctl.spd = Math.max(ctl.spd, 50);
        sparks.push({ x: P[2].x, y: P[2].y + 8, t: 0.08 });
      } else used = false;
      ibuf.jump = used ? 0 : ibuf.jump - dt;
    }
    if (ibuf.atk) { if (tryAttack(ibuf.atk) || (ibuf.atkT -= dt) <= 0) ibuf.atk = null; }
    const Wg = WEAPONS[hero.weapon];
    if (Wg.gun) {   // guns fire on top of any movement: run, jump, squat
      gun.cd -= dt; gun.aimT -= dt; gun.recoil *= Math.exp(-12 * dt);
      if (!(Wg.auto && input.fireHeld)) gun.climb *= Math.exp(-5 * dt);
      if (gun.pumpT >= 0 && (gun.pumpT += dt / 0.4) >= 1) gun.pumpT = -1;
      if (gun.tapT > 0) gun.tapT -= dt;
      if (Wg.auto && (input.fireHeld || gun.tapT > 0)) gun.want = true; else gun.burst = 0;
      const busy = !!MOVES[hero.act] || hero.act === 'rise' || hero.act === 'roll' || hero.act === 'hero' || hero.act === 'dash';
      if (gun.want && !busy) {
        gun.aimT = Math.max(gun.aimT, 0.5);
        if (gun.aimW > 0.75 && gun.cd <= 0) { fire(Wg); if (!(Wg.auto && input.fireHeld)) gun.want = false; }
      } else if (busy) gun.want = false;
    }
    hero.actT += dt;
    if (ctl.air && hero.act === 'air' && !ctl.tramp) {   // in the air near a ledge too high to land on: the hands catch its edge and he pulls up
      const feet = ctl.y + 2;
      for (const s of SURF) {
        if (s === GROUND_S || s === ignoreS || s.bouncy || s.box || s.y >= feet - 1 || s.y < feet - CLIMB.reach) continue;   // (never up a crate)
        const toward = ctl.face > 0 ? ctl.x >= s.x0 - CLIMB.edge && ctl.x <= s.x0 + 10 : ctl.x <= s.x1 + CLIMB.edge && ctl.x >= s.x1 - 10, under = ctl.x > s.x0 && ctl.x < s.x1;
        if (!input.jumpHeld || !(toward || under)) continue;   // only a held jump grabs (a quick press is just a jump): at the edge, or up under the ledge
        const ex = toward ? (ctl.face > 0 ? s.x0 : s.x1) : ctl.x;
        ctl.climb = { s, x0: ctl.x, y0: ctl.y, ex, x1: toward ? ex + ctl.face * 6 : ctl.x, y1: s.y - 2 };
        hero.act = 'climb'; hero.actT = 0; ctl.vu = 0; ctl.spd = 0; queued = null; ctl.flipT = -1; ctl.spin = 0; emit('feat', 'charge');
        break;
      }
    }
    if (hero.act === 'climb') {   // the hands catch the edge and the body swings in under them, pulls up until the hips reach the ledge, then a knee over and stand
      const C = ctl.climb, f = ctl.face, wx = C.ex - f * 3.5, t = hero.actT;
      const h = clamp(t / CLIMB.hang, 0, 1), u = clamp((t - CLIMB.hang) / CLIMB.up, 0, 1), v = clamp((t - CLIMB.hang - CLIMB.up) / CLIMB.over, 0, 1);
      ctl.spd = 0;
      // the catch: a last lunge brings the hands to the edge (arms at full stretch ~43 px over the feet), with a small sag as they take
      // the weight; the pull brings the hips level with the ledge; then over and up
      const y0 = Math.min(C.y0, C.y1 + 2 + 41), yHang = lerp(C.y0, y0, smooth(h)) + 1.2 * Math.sin(Math.PI * h), yPull = Math.min(y0, C.y1 + 14);
      if (v <= 0) { ctl.x = lerp(C.x0, wx, smooth(h)); ctl.y = u > 0 ? lerp(y0, yPull, smooth(u)) : yHang; }
      else { ctl.x = lerp(wx, C.x1, smooth(v)); ctl.y = lerp(yPull, C.y1, smooth(v)); }
      if (t >= CLIMB.hang + CLIMB.up + CLIMB.over) { ctl.x = C.x1; ctl.climb = null; hero.act = 'air'; hero.actT = 0; landOn(C.s, 12); }
    }
    if (ctl.air && hero.act !== 'climb') {
      let gAir = ctl.vu > 0 ? G_UP : G_FALL;   // a tap rises fully: the jump height does not depend on a quick release
      ctl.hiT = -1;   // (no held high jump: a person cannot jump higher by holding on)
      if (hero.act === 'dash' && !rollingNow()) { gAir = hero.actT < DASH.airDur * 0.7 ? 0 : G_FALL * 0.5; if (gAir === 0) ctl.vu = Math.max(0, ctl.vu * 0.8); }   // (the air dash hangs; a roll off a ledge falls)
      const prevFoot = ctl.y + 2;
      ctl.y -= ctl.vu * dt; ctl.vu -= gAir * dt;
      if (ctl.baseY - ctl.y > ctl.cap && ctl.vu > 0) ctl.vu = 0;
      // air control: push on toward the facing side, or brake and turn around
      if (hero.act === 'dash') {}
      else if (input.dir === ctl.face) ctl.spd = Math.max(ctl.spd, Math.min(WALK * 1.25, ctl.spd + 50 * dt));   // little steering in the air: the take-off sets the arc
      else if (input.dir === -ctl.face) { ctl.spd -= 120 * dt; if (ctl.spd < 0) { ctl.spd = -ctl.spd; ctl.face = input.dir; } }
      else if (!input.dir && !ctl.tramp) ctl.spd *= Math.exp(-2.6 * dt);   // no direction held: the drift dies off, so a jump lands near where it was aimed
      if (ctl.vu < 0) {
        let land = null;
        for (const s of SURF) if (s !== ignoreS && ctl.x >= s.x0 - 2 && ctl.x <= s.x1 + 2 && prevFoot <= s.y + 0.01 && ctl.y + 2 >= s.y && (!land || s.y < land.y)) land = s;
        if (nearStairs(ctl.x)) for (const s of STEPS) if (ctl.x >= s.x0 - 0.5 && ctl.x <= s.x1 + 0.5 && prevFoot <= s.y + 0.01 && ctl.y + 2 >= s.y && (!land || s.y < land.y)) land = s;   // the fire escape catches a jump too
        if (land) landOn(land, -ctl.vu);
      }
    }
    let ap = null;
    if (ctl.rollS && hero.act !== 'roll') { ctl.rollS = false; if (ctl.flipT < 0 && hero.act !== 'kair') ctl.spin = 0; }
    if (ctl.dashK && hero.act !== 'dash') { ctl.dashK = null; if (ctl.flipT < 0 && hero.act !== 'kair') ctl.spin = 0; }   // [feel] a dodge cut short
    if (hero.act === 'crouch') {
      const dur = ctl.spd > WALK + 5 ? 0.07 : 0.11, e = Math.min(1, hero.actT / dur);
      ap = mod(g, { ry: g[1] - 5 * e, lean: g[2] + 0.3 * e, a0s: -0.8, a0e: 0.3, a1s: -0.7, a1e: 0.3 });
      if (hero.actT >= dur) {
        hero.act = 'air'; hero.actT = 0; ctl.air = true; ctl.jumps = 1; ctl.baseY = ctl.y;
        ctl.vu = JUMP_V; ctl.cap = MAX_AIR; ctl.hiT = -1;   // one real jump, tap or hold alike
        emit('feat', 'jump'); emit('jump', { x: ctl.x, y: ctl.y, double: false });
        if (input.dir === ctl.face) ctl.spd = clamp(ctl.spd * 1.1, 45, input.run ? 115 : WALK * 1.25);   // a walking jump carries a walk's worth, a running one more
        dust(ctl.x - 3, ctl.y + 1, 4); dust(ctl.x + 3, ctl.y + 1, 4);
      }
    } else if (hero.act === 'air') {
      const k = smooth(clamp(0.5 - ctl.vu / 200, 0, 1)), rr = clamp(ctl.spd / RUN, 0, 1), ry = 17;
      // rising: lead knee drives up, fist punches the sky; falling: legs reach for the ground, arms out
      const rise = mod(IDLE, { ry, lean: 0.1 + 0.1 * rr, head: -0.1, f1x: 4, f1y: ry - 9, f0x: -4 - 3 * rr, f0y: ry - 17.4, a1s: 3.0, a1e: 0.15, a0s: -0.6, a0e: 0.4 });
      const fall = mod(IDLE, { ry, lean: 0.05, f1x: 3, f1y: ry - 15, f0x: -3, f0y: ry - 16.5, a1s: 1.7, a1e: 0.3, a0s: 1.3, a0e: 0.3 });
      ap = lerpA(rise, fall, k);
      if (ctl.flipT >= 0) {
        ctl.flipT += dt;
        const u = ctl.flipT / 0.5;
        if (u >= 1) { ctl.flipT = -1; ctl.spin = 0; }
        else {
          const tuck = mod(IDLE, { ry, lean: 0.6, head: 0.2, f1x: 4, f1y: ry - 7, f0x: 3, f0y: ry - 7.5, a1s: 1.0, a1e: 1.2, a0s: 0.9, a0e: 1.3 });
          ap = lerpA(ap, tuck, Math.sqrt(Math.sin(Math.PI * u)));
          ctl.spin = 2 * Math.PI * smooth(u);
        }
      }
    } else if (hero.act === 'climb') {   // (the arms are set on the edge by IK after the pose: climbArms)
      const t = hero.actT, u = clamp((t - CLIMB.hang) / CLIMB.up, 0, 1), v = clamp((t - CLIMB.hang - CLIMB.up) / CLIMB.over, 0, 1), sc = Math.sin(t * 30);
      const hang = mod(IDLE, { ry: 18.5, lean: -0.05, head: -0.35, f0x: -1.5, f0y: 1.5, f1x: 1, f1y: 2.5, a0s: 3.0, a0e: 0.1, a1s: 3.0, a1e: 0.1 });   // hanging: legs loose, the head tipped up to the edge
      const pull = mod(IDLE, { ry: 15.5, lean: 0.25 + 0.15 * u, head: 0.05, f0x: 2 + sc, f0y: 6 + 2.5 * sc, f1x: 3.5 - sc, f1y: 9 - 2.5 * sc, a0s: 2.4, a0e: 1.4, a1s: 2.4, a1e: 1.4 });   // pulling: the feet scrabble on the wall
      const over = mod(IDLE, { ry: 11, lean: 0.75, head: 0.2, f0x: -4, f0y: 3, f1x: 5, f1y: 9, a0s: 0.3, a0e: 0.4, a1s: 0.3, a1e: 0.4 });   // the front knee up on the ledge, pressing down on the hands
      const stand = mod(IDLE, { lean: 0.15, f1x: 3, f1y: 1 });
      ap = v > 0 ? (v < 0.6 ? lerpA(pull, over, smooth(v / 0.6)) : lerpA(over, stand, smooth((v - 0.6) / 0.4))) : u > 0 ? lerpA(hang, pull, smooth(Math.min(1, u * 1.6))) : hang;
    } else if (hero.act === 'land') {
      const e = Math.min(1, hero.actT / ctl.landDur), s = Math.sin(Math.PI * e);
      ap = mod(g, { ry: g[1] - ctl.landDip * Math.pow(s, 0.7), lean: g[2] + 0.25 * s, a0s: 0.5, a0e: 0.6, a1s: 0.6, a1e: 0.6 });
      if (hero.actT >= ctl.landDur) hero.act = null;
    } else if (MOVES[hero.act]) {   // (not atk: a cancel may have just replaced the attack)
      const m = MOVES[hero.act];
      ap = keyAt(m.keys, hero.actT);
      if (!WEAPONS[hero.weapon].gun) lunge(m, dt);
      if (hero.act === 'ah' && !ctl.slam && hero.actT >= 0.38) { ctl.slam = true; const wg = weaponGeom(); slam(wg ? wg.tx : ctl.x + 14 * ctl.face, ctl.y + 2, 26, 1); }
      if (hero.act === 'aair' && !ctl.slam && hero.actT >= 0.16) { ctl.slam = true; ctl.vu = Math.min(ctl.vu, -250); }
      if (queued && !ctl.air && hero.actT >= chainAt(m)) { const q = queued; queued = null; ctl.spin = 0; startAttack(q); }
      else if (hero.actT >= m.dur) { if (WSWING.test(hero.act)) ctl.comboEnd = simTime; ctl.spin = 0; queued = null; hero.act = ctl.air ? 'air' : input.downHeld && LOW_RE.test(hero.act) ? 'squat' : 'guard'; hero.actT = 0; }
    } else if (hero.act === 'grab') {   // the ending: reach over the bar for a bottle
      ap = lerpA(g, mod(IDLE, { a1s: 1.2, a1e: 0.25, lean: 0.28, head: 0.12, a0s: 0.3 }), smooth(Math.min(1, hero.actT / 0.3)));
    } else if (hero.act === 'drink') {   // bottle up, head back, a couple of swallows
      ap = lerpA(g, mod(IDLE, { a1s: 2.5 + 0.05 * Math.sin(hero.actT * 9), a1e: 2.7, head: -0.5, lean: -0.14, a0s: 0.15 }), smooth(Math.min(1, hero.actT / 0.35)));
    } else if (hero.act === 'pet') {   // by the dog, the hand stroking its head
      ap = lerpA(g, mod(IDLE, { a1s: 0.95 + 0.15 * Math.max(0, Math.sin(hero.actT * 9)), a1e: 0.12, lean: 0.48, head: 0.4, a0s: 0.15, ry: IDLE[1] - 1.5 }), smooth(Math.min(1, hero.actT / 0.3)));   // a tall dog: he bends a little and strokes its head
    } else if (hero.act === 'squat') {
      ctl.squatT += dt;
      ap = ctl.duckT > 0 && !input.downHeld ? TRN.DUCK : SQUAT;
    } else if (hero.act === 'guard') {
      const br = Math.sin(simTime * 3.1);   // fighting stance breathes harder than idle
      ap = mod(GUARD, { ry: GUARD[1] + 0.3 * br, head: GUARD[3] - 0.03 * br, a0s: GUARD[8] + 0.05 * br, a1s: GUARD[10] + 0.05 * br });
      if (hero.actT > 1.4) hero.act = null;
    } else if (hero.act === 'rise') {
      ap = lerpA(RISE, g, smooth(Math.min(1, hero.actT / 0.4)));
      if (hero.actT >= 0.4) hero.act = null;
    } else if (hero.act === 'skid') {
      ap = lerpA(g, TRN.SKID, clamp(0.5 + ctl.spd / 80, 0.5, 1));
      if (ctl.spd < 4) {
        if (input.dir === -ctl.face) { ctl.face = input.dir; hero.act = 'pivot'; ctl.pivT = 0.12; } else hero.act = 'settle';
        hero.actT = 0;
      }
    } else if (hero.act === 'pivot') {
      const e = Math.min(1, hero.actT / ctl.pivT), big = ctl.pivT > 0.1;
      ap = lerpA(g, TRN.PIVOT, big ? 1 - smooth(e) * 0.7 : 0.45 * Math.sin(Math.PI * e));
      if (hero.actT >= ctl.pivT) hero.act = null;
    } else if (hero.act === 'start' || hero.act === 'settle') {   // anticipation dip / small rock after a stop
      const d = hero.act === 'start' ? TRN.start : TRN.settle, s = Math.sin(Math.PI * Math.min(1, hero.actT / d));
      ap = mod(g, { ry: g[1] - 1.8 * s, lean: g[2] + 0.14 * s, a0s: g[8] + 0.2 * s, a1s: g[10] + 0.2 * s });
      if (hero.actT >= d) hero.act = null;
    } else if (hero.act === 'hero') {
      ap = lerpA(TRN.HERO, g, smooth(clamp((hero.actT - TRN.hero) / TRN.heroUp, 0, 1)));
      if (hero.actT >= TRN.hero + TRN.heroUp) hero.act = null;
    } else if (hero.act === 'roll') {
      const u = Math.min(1, hero.actT / TRN.roll);
      ap = lerpA(g, TRN.TUCK, Math.sqrt(Math.sin(Math.PI * u)));
      ctl.spin = 2 * Math.PI * smooth(Math.min(1, hero.actT / (TRN.roll * 0.85)));
      if (u >= 1) { ctl.spin = 0; ctl.rollS = false; hero.act = null; }
    } else if (hero.act === 'dash') {
      const k = ctl.dashK, dur = k === 'air' ? DASH.airDur : k === 'back' ? DASH.backDur : DASH.dur, u = Math.min(1, hero.actT / dur);
      if (k === 'roll') {   // dodge roll: tuck and turn over once, fast out of the gate, easing into a run or a stop
        // [feel] tuck in fast on the first roll, stay balled through a chain, unfold over the last 30% of the last roll
        const tin = ctl.rollN > 1 ? 1 : smooth(clamp(u / 0.2, 0, 1)), tout = input.dashHeld && ctl.rollN < ROLL_MAX ? 1 : 1 - smooth(clamp((u - 0.7) / 0.3, 0, 1));
        ap = lerpA(g, TRN.TUCK, Math.min(tin, tout));
        ctl.spin = 2 * Math.PI * smooth(Math.min(1, u / 0.9));
        const chain = ctl.chainRoll && input.dashHeld && ctl.rollN < ROLL_MAX;
        const out = chain ? DASH.v : input.dir === ctl.face ? (input.run ? RUN : WALK) : 0;
        ctl.spd = lerp(DASH.v, out, smooth(u));
        if (simRand() < 0.3) dust(ctl.x - ctl.face * 2, ctl.y + 1, 1);
      } else if (k === 'back') {   // step back: a low hop away, eyes and guard kept on the front
        const s = Math.sin(Math.PI * u);
        ap = mod(TRN.BACK, { ry: TRN.BACK[1] + 2.5 * s, f0y: 2.5 * s, f1y: 2.5 * s + 0.8 * s });
      } else ap = lerpA(TRN.ADASH, mod(AIR, {}), smooth(clamp((u - 0.6) / 0.4, 0, 1)));   // air dash: body flat, arms and legs swept back
      if (u >= 1) {
        ctl.spin = 0;
        hero.act = ctl.air ? 'air' : null; hero.actT = 0;
        if (k === 'roll' && ctl.chainRoll) {
          if (!ctl.air && input.dashHeld && ctl.rollN < ROLL_MAX) { hero.act = 'dash'; ctl.dashK = 'roll'; startRoll(input.dir || ctl.face); }   // keep rolling while U is held
          else ctl.chainRoll = false;
        }
      }
    } else if (hero.act === 'teeter') {
      ap = teeterPose(hero.actT, ctl.edge * ctl.face);
      if (ctl.spd > 1 || ctl.surf === GROUND_S) hero.act = null;
    }

    // [feel] the action pose (or the gait) and the body spin go through the pose blender
    const tp = (ap || g).slice(); tp[14] = ctl.spin;
    const fo = inertia(tp, dt), spin = fo[14];
    let fin = fo.slice(0, 14);
    const hasGun = WEAPONS[hero.weapon].gun;
    if (hasGun) fin = gunBody(fin, dt); else gun.aimW = 0;
    fin = secondaryMotion(fin, dt);   // [G1] weight, overlap, follow-through
    fin = worldPose(fin, dt);         // [G3] head look, hit flinch, pushing
    ctl.wr = fin[12]; ctl.yw = fin[13];
    let joints = fk(fin, ctl.x, ctl.y + ctl.stOff, ctl.face);
    const rolling = hero.act === 'dash' && ctl.dashK === 'roll';
    if (Math.abs(wrapA(spin)) > 1e-3 || (rolling && !ctl.air)) {   // rotate the whole body around the belly for the flip (a roll keeps its ground contact at the 2pi seam too)
      const a = spin * ctl.face, ca = Math.cos(a), sa = Math.sin(a);
      // a roll turns about the centre of the whole balled body, so it tumbles like a wheel; a flip turns about the belly
      let cx = (joints[1][0] + joints[2][0]) / 2, cy = (joints[1][1] + joints[2][1]) / 2;
      if (rolling || hero.act === 'roll') { cx = 0; cy = 0; for (const j of joints) { cx += j[0] / joints.length; cy += j[1] / joints.length; } }
      joints = joints.map(([x, y]) => [cx + (x - cx) * ca - (y - cy) * sa, cy + (x - cx) * sa + (y - cy) * ca]);
      if (!ctl.air) {   // [feel] a flip finishing on the ground stays above it; a roll stays down on the ground, tumbling over it
        const low = Math.max(...joints.map(j => j[1])) - ctl.y;
        if (low > 0 || rolling) joints = joints.map(([x, y]) => [x, y - low + (rolling ? 1 : 0)]);
      }
    }
    // a gun is held by arm IK; fade the arms between that and the posed arms over a weapon swap
    gunArmW += ((hasGun ? 1 : 0) - gunArmW) * (1 - Math.exp(-18 * dt));
    if (hasGun) {
      const pre = joints.slice(3, 7);
      const sp0 = ctl.spin; ctl.spin = spin; armDn[0] = -Math.sin(spin * ctl.face); armDn[1] = Math.cos(spin * ctl.face);
      holdGun(joints); ctl.spin = sp0; armDn[0] = 0; armDn[1] = 1;   // the gun turns with the shown (blended) spin
      const nk = joints[1]; gunArms = joints.slice(3, 7).map(([x, y]) => [(x - nk[0]) * ctl.face, y - nk[1]]);
      if (gunArmW < 0.99) for (let k = 0; k < 4; k++) joints[3 + k] = [lerp(pre[k][0], joints[3 + k][0], smooth(gunArmW)), lerp(pre[k][1], joints[3 + k][1], smooth(gunArmW))];
    } else {
      gunPose = null;
      if (gunArms && gunArmW > 0.01) { const nk = joints[1], e = smooth(gunArmW); for (let k = 0; k < 4; k++) joints[3 + k] = [lerp(joints[3 + k][0], nk[0] + gunArms[k][0] * ctl.face, e), lerp(joints[3 + k][1], nk[1] + gunArms[k][1], e)]; }
    }
    if (hero.act === 'climb' && ctl.climb) climbArms(joints);
    setJoints(joints);
    tossRelease();

    const m = MOVES[hero.act];
    if (m) {
      const wg = m.blade ? weaponGeom() : null;
      const p = wg ? { x: wg.tx, y: wg.ty } : P[m.limb];
      const mid = wg ? { x: wg.x + wg.dx * wg.len * 0.45, y: wg.y + wg.dy * wg.len * 0.45 } : null;
      if (hero.act === 'tw' && !hitDone && hero.actT >= 0.2) { hitDone = true; releaseThrow(); }
      if (hero.actT >= m.win[0] && hero.actT <= m.win[1]) {
        hitCtx = hero.act;
        if (!hitDone && (bagTouch(p.x, p.y) || (mid && bagTouch(mid.x, mid.y)))) { hitDone = true; atkHit = true; bagHit(p.x, p.y, ctl.face, m.power); if (wg) wear(); }
        for (const o of objs.slice()) {
          if (o.hitBy === hero.atkId || offPlat(o, ctl.lane)) continue;
          // a weapon hits along its whole length; a fist or foot uses a strike box that reaches a little low for kicks
          const hit = wg ? segHitsObj(wg.x, wg.y, wg.tx, wg.ty, o, 1.5)
            : Math.abs(o.x - p.x) < (o.hw || o.r) + 4 && o.y - o.r < p.y + 9 && o.y + o.r > p.y - 5;
          if (hit) { o.hitBy = hero.atkId; atkHit = true; launchObj(o, clamp(p.x, o.x - o.r, o.x + o.r), clamp(p.y, o.y - o.r, o.y + o.r), ctl.face, m.power, m.up); if (wg) wear(); }
        }
        const hp = hitEnemies(m, wg, p);
        if (hp) { atkHit = true; hitSpark(wg ? (hp.x + wg.x + (wg.tx - wg.x) * 0.7) / 2 : hp.x, wg ? (hp.y + wg.y + (wg.ty - wg.y) * 0.7) / 2 : hp.y, ctl.face, m.power, !!wg); if (wg) wear(); }
        hitCtx = null;
      } else if (hero.actT >= m.pre && hero.actT < m.win[0]) hitEnemies(m, wg, p, true);
    }
  }

  function impact(i, p, v) {
    if (v > 60) dust(p.x, p.fl + p.r - 1, Math.min(6, Math.floor(v / 40)));
    if (!ragKD && ((i === 0 && v > 85) || (i === 2 && v > 170))) hero.ko = true;
    if (v > 160 && !reduceMotion) cam.shake = Math.max(cam.shake, 0.18);
  }
  function ragStep(dt) {
    for (const p of P) { const s = bodyFloor(p.x, p.y, p.r, P[2].y); p.fl = s.y - p.r; p.fs = s; }
    // [feel] a knock-down falls fast for a moment; a thrown body loses its sideways speed in the air
    const gk = ragG > 0 && grabIdx < 0 ? ragGk : 1; ragG -= dt;
    const airK = grabIdx < 0 && P[2].fl - P[2].y > 3 && P[0].fl - P[0].y > 3 ? Math.exp(-1.5 * dt) : 1;
    for (const p of P) {
      if (p.grab) { p.x = target.x; p.y = target.y; continue; }
      const vx = (p.x - p.px) * DAMP * airK, vy = (p.y - p.py) * DAMP;
      p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + G * gk * dt * dt;
    }
    for (let k = 0; k < ITER; k++) {
      for (const [a, b, lo, hi] of CONSTRAINTS) solveDist(P[a], P[b], lo, hi);
      for (const [a, b, c, s] of HINGES) hinge(P[a], P[b], P[c], s * ragFace);
      for (const p of P) { if (p.grab) { p.x = target.x; p.y = target.y; } clampP(p); }
    }
    let mv = 0;
    P.forEach((p, i) => {
      if (p.grab) { p.px = p.x - pv.x * dt; p.py = p.y - pv.y * dt; return; }
      const vx = p.x - p.px, vy = p.y - p.py;
      if (p.y >= p.fl - 0.01 && vy > 0) {
        if (p.fs.bouncy && vy / dt > 60) { p.py = p.y + Math.max(vy, 170 * dt); p.fs.squish = 0.15; }   // slow contact rests, so a ragdoll can settle on it
        else { impact(i, p, vy / dt); p.py = p.y + vy * BOUNCE; p.px = p.x - vx * FRIC; }
      }
      if ((p.x <= p.r + 0.01 && vx < 0) || (p.x >= W - p.r - 0.01 && vx > 0)) {
        p.px = p.x + vx * BOUNCE;
        if (Math.abs(vx / dt) > 160 && !reduceMotion) cam.shake = Math.max(cam.shake, 0.12);
      }
      if (!p.fs.bouncy && grabIdx < 0 && p.y >= p.fl - 0.6) p.px = p.x - (p.x - p.px) * Math.exp(-9 * dt);   // [feel] the body scrapes to a stop on the floor
      mv = Math.max(mv, Math.hypot(p.x - p.px, p.y - p.py) / dt);
    });
    settleT = grabIdx < 0 && mv < 20 ? settleT + dt : 0;
    ragT = grabIdx < 0 ? ragT + dt : 0;
    if (settleT > (hero.ko ? 1.8 : 0.45) || (ragT > 5 && mv < 80)) {   // something jiggling on the body must not keep it down
      if (hero.hp <= 0 && DIF().perma) { if (!flags.wasted) showWasted(); } else startGetup();   // Wicked: no getting up after a real K.O. (ko alone is also a hard knock to the head)
    }
  }

  // ===== [G1] secondary motion: weight, overlap, follow-through (owned by G1) =====
  // damped springs (x, v) on top of the pose: w = stiffness (rad/s), z = damping ratio
  const spr = (w, z) => ({ x: 0, v: 0, w, z });
  const sprStep = (s, f, dt) => { s.v += (f - s.w * s.w * s.x - 2 * s.z * s.w * s.v) * dt; s.x += s.v * dt; };
  const sBob = spr(20, 0.3), sLean = spr(16, 0.4), sHead = spr(18, 0.4), sArmB = spr(13, 0.35), sArmF = spr(15, 0.35);
  const SPRS = [sBob, sLean, sHead, sArmB, sArmF];
  let smAir = false, smVu = 0, smHs = 0, smAccL = 0;
  function secondaryMotion(q, dt) {
    const atk = !!MOVES[hero.act], gun = WEAPONS[hero.weapon].gun;
    const kA = (atk ? 0.3 : 1) * (gun ? 0.25 : 1), kH = (atk ? 0.4 : 1) * (gun ? 0.7 : 1);
    const o = q.slice();
    o[1] += clamp(sBob.x, -2, 2);
    o[2] += clamp(sLean.x, -0.08, 0.08);
    o[3] += clamp(sHead.x, -0.25, 0.25) * kH;
    o[8] += clamp(sArmB.x, -0.25, 0.25) * kA;
    o[10] += clamp(sArmF.x, -0.25, 0.25) * kA;
    return o;
  }
  // belt tails: two cloth strips knotted at the back of the waist
  const BELT = C('#2a2236'), BELT_T = C('#463a5e');
  let tails = null;
  function beltAt() {
    const nk = P[1], pl = P[2], f = hero.mode === 'rag' ? ragFace : ctl.face, [ux, uy] = norm(nk.x - pl.x, nk.y - pl.y);
    const wx = nk.x + (pl.x - nk.x) * 0.72, wy = nk.y + (pl.y - nk.y) * 0.72;
    return { wx, wy, bx: -uy * f, by: ux * f };   // waist point and the unit vector toward the front
  }
  function tailAnchor(k) { const b = beltAt(); return [b.wx - b.bx * 2.6, b.wy - b.by * 2.6 + k]; }
  function secondaryStep(dt) {
    // springs: drive in anim mode, fade out otherwise
    if (hero.mode === 'anim') {
      smAccL += (ctl.accS - smAccL) * (1 - Math.exp(-4 * dt));
      const a = ctl.accS, hp = a - smAccL;   // hips speeding up in the facing direction: head and arms lag behind
      sprStep(sHead, -a * 0.2, dt); sprStep(sArmB, -a * 0.2, dt); sprStep(sArmF, -a * 0.24, dt);
      sprStep(sLean, -hp * 0.25, dt); sprStep(sBob, 0, dt);
      if (smAir && !ctl.air) {   // landed: pelvis dips then overshoots, chest, head and arms follow through
        const v = clamp(-smVu, 0, 320);
        sBob.v -= v * 0.12; sLean.v += v * 0.006; sHead.v += v * 0.012; sArmB.v += v * 0.014; sArmF.v += v * 0.012;
      } else if (ctl.air && smAir && smVu < -40 && ctl.vu > 0) {   // trampoline rebound
        const v = clamp(-smVu, 0, 320);
        sBob.v -= v * 0.08; sHead.v += v * 0.01;
      } else if (ctl.air && !smAir && ctl.vu > 0) sHead.v += ctl.vu * 0.008;   // take-off: head nods as the hips shoot up
      if (hitStop > smHs + 0.01 && hitStop >= 0.06) {   // heavy hit or slam: the body absorbs the shock
        const k = clamp(hitStop / 0.13, 0, 1);
        sBob.v -= 22 * k; sLean.v -= 0.9 * k; sHead.v += 1.6 * k;
      }
    } else for (const s of SPRS) { s.x *= Math.exp(-20 * dt); s.v = 0; }
    smAir = hero.mode === 'anim' && ctl.air; if (smAir) smVu = ctl.vu; smHs = hitStop;
    // belt tails: verlet ropes like the headband ribbon, heavier and with less drag
    if (!tails) tails = [4, 3].map((n, k) => Array.from({ length: n }, () => { const [x, y] = tailAnchor(k); return { x, y, px: x, py: y }; }));
    tails.forEach((t, k) => {
      const [ax, ay] = tailAnchor(k);
      t[0].x = ax; t[0].y = ay;
      for (let i = 1; i < t.length; i++) {
        const p = t[i], vx = (p.x - p.px) * 0.95, vy = (p.y - p.py) * 0.95;
        p.px = p.x; p.py = p.y;
        p.x += vx; p.y += vy + G * dt * dt + Math.sin(simTime * 19 + i * 1.3 + k * 2) * 0.004 * i;
      }
      for (let r = 0; r < 4; r++) for (let i = 1; i < t.length; i++) {
        const a = t[i - 1], b = t[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-6;
        if (d <= 2) continue;
        const kk = (d - 2) / d;
        if (i === 1) { b.x -= dx * kk; b.y -= dy * kk; }
        else { a.x += dx * kk * 0.5; a.y += dy * kk * 0.5; b.x -= dx * kk * 0.5; b.y -= dy * kk * 0.5; }
      }
      for (const p of t) if (p.y > GROUND - 1) p.y = GROUND - 1;
    });
  }
  function drawSecondary(face) {
    const b = beltAt(), ox = D[2].x - P[2].x, oy = D[2].y - P[2].y;   // follow the drawn pose (squash, 12 fps)
    // suit front: white shirt in a V under the lapels, black tie down the middle
    const [ux, uy] = norm(D[1].x - D[2].x, D[1].y - D[2].y), nx = D[1].x, ny = D[1].y;
    const L = Math.hypot(D[1].x - D[2].x, D[1].y - D[2].y) * 0.72;
    for (let t = 0; t <= L * 0.58; t += 0.5) {
      const w = 2.2 - t / (L * 0.58) * 1.9, cx = nx - ux * t + b.bx * 1.3, cy = ny - uy * t + b.by * 1.3;
      for (let o = -w; o <= w; o += 0.5) plot(Math.floor(cx + b.bx * o), Math.floor(cy + b.by * o), PAL.collar);
    }
    line1(nx + b.bx * 1.3, ny + b.by * 1.3, nx - ux * L * 0.62 + b.bx * 1.6, ny - uy * L * 0.62 + b.by * 1.6, PAL.tie);
    plot(Math.floor(nx + b.bx * 2.4 - ux * 0.5), Math.floor(ny + b.by * 2.4 - uy * 0.5), PAL.collarD);   // collar tip
  }
  // ===== [/G1] =====

  // ===== [G3] world response: foot placement, head look, hit flinch, pushing (owned by G3) =====
  const FL_W = 16, FL_Z = 0.55;   // flinch spring: stiffness (rad/s) and damping ratio, settles in ~0.4 s
  const flX = new Float64Array(12), flV = new Float64Array(12);
  let lookSm = 0, flCd = 0;
  let carryW = 0;   // 0..1: how far the arms are up holding a carried object
  // how far a planted foot at x hangs below the foot line: it rolls off a ledge edge toward the surface below
  function footDrop(x, footY) {
    let st = null;
    for (const s of SURF) if (s !== ignoreS && Math.abs(s.y - footY - 2) < 0.8 && x >= s.x0 - 12 && x <= s.x1 + 12) { st = s; break; }
    if (!st) return 0;
    const out = x < st.x0 - 1 ? st.x0 - 1 - x : x > st.x1 + 1 ? x - st.x1 - 1 : 0;
    if (out <= 0) return 0;
    return clamp(Math.min(floorBelow(x, footY + 1.5, 0).y - 2 - footY, out * 1.5), 0, 6);
  }
  // a weak hit from (x, y): kick the pose spring so the body snaps away; k = 0..1, spark at (sx, sy)
  function flinch(x, y, k, sx, sy) {
    if (flCd > 0) return false;
    const s = Math.sign((x - P[2].x) * ctl.face) || 1, hi = y < P[1].y + 4 ? 1 : 0.5, g = FL_W / 0.52 * k;   // s = +1: hit from the front
    const kick = [-2.2 * s, -1.2, -0.42 * s, -0.4 * s * hi, 0, 0, 0, 0, -0.5 * s, 0.5, -0.4 * s, 0.4];
    for (let i = 0; i < 12; i++) flV[i] += kick[i] * g;
    flCd = 0.12; hits++; sparks.push({ x: sx, y: sy, t: 0.1 });
    hairKick(-s * ctl.face * 40 * k, -25 * k);   // [feel] the hair whips away from the blow
    return true;
  }
  function worldPose(q, dt) {
    const o = q.slice(), f = ctl.face, atk = !!MOVES[hero.act];
    if (hero.act === 'rise' && hero.actT <= dt * 1.5) { flX.fill(0); flV.fill(0); }   // fresh after a fall
    flCd -= dt;
    // head look: the nearest live enemy in front, eye to eye; else the nearest object or the bag bottom
    const hd = P[0], ey0 = hd.x + f * 2.2, eyY = hd.y; let best = 70, tgt = 0, foe = false, fBest = 220;
    for (const e of enemies) {
      if (e.dead || !e.J) continue;
      const eh = e.J[0], en = e.J[1], [dx0, dy0] = norm(en.x - eh.x, en.y - eh.y);
      const ex = eh.x + dy0 * e.face * 2.2 * e.s, ey = eh.y - dx0 * e.face * 2.2 * e.s;   // the enemy's eye
      const dx = (ex - ey0) * f, dy = ey - eyY, d = Math.hypot(dx, dy);
      if (dx > 2 && d < fBest) { fBest = d; tgt = Math.atan2(dy, dx); foe = true; }
    }
    const see = (x, y) => { const dx = (x - hd.x) * f, dy = y - hd.y, d = Math.hypot(dx, dy); if (dx > 3 && d < best) { best = d; tgt = Math.atan2(dy, dx); } };
    if (!foe) { for (const b of objs) see(b.x, b.y); see(bag[3].x, bag[3].y); }
    tgt = ctl.spin ? 0 : foe ? clamp(tgt, -0.6, 0.5) : clamp(tgt, -0.35, 0.35) * (atk ? 0.3 : 1);
    lookSm += (tgt - lookSm) * (1 - Math.exp(-6 * dt));
    o[3] += lookSm;
    // flinch spring
    for (let i = 0; i < 12; i++) {
      flV[i] -= (FL_W * FL_W * flX[i] + 2 * FL_Z * FL_W * flV[i]) * dt; flX[i] += flV[i] * dt;
      o[i] += flX[i];
    }
    // the front hand carries the object at his side; a bash is a one-handed overhand swing; [feel] blended in on the pick-up and out through the throw
    const cOn = !!ctl.carry && hero.mode === 'anim';
    carryW += ((cOn ? 1 : 0) - carryW) * (1 - Math.exp(-(cOn ? 14 : hero.act === 'tw' ? 6 : 14) * dt));
    if (hero.mode !== 'anim') carryW = 0;
    if (carryW > 0.005) {
      const w = carryW, u = ctl.bashT > 0 ? 1 - ctl.bashT / CBASH : -1;   // the swing: up and back over the shoulder, then down through the front
      const a1s = u < 0 ? 0.55 : u < 0.4 ? lerp(0.55, 2.8, smooth(u / 0.4)) : lerp(2.8, 1.0, smooth((u - 0.4) / 0.6)), a1e = u < 0 ? 0.35 : 0.2;
      o[10] = lerp(o[10], a1s, w); o[11] = lerp(o[11], a1e, w);
      if (u >= 0.4) o[2] += 0.3 * Math.sin(Math.PI * (u - 0.4) / 0.6) * w;   // he leans into the blow
    }
    return o;
  }
  // ===== [/G3] =====

  // long hair: three verlet strands rooted along the back of the head; they trail and float with movement
  const faceNow = () => hero.mode === 'rag' ? ragFace : ctl.face;
  // shoulder-length straight hair: four locks from the crown down the back of the head, all cut level at the shoulders
  const HAIR = [{ up: 3.8, back: 2.0, n: 4, len: 2.3 }, { up: 2.6, back: 3.0, n: 4, len: 2.3 }, { up: 1.2, back: 3.5, n: 4, len: 2.1 }, { up: -0.2, back: 3.5, n: 3, len: 2.0 }];   // (straight, to the jaw and the nape)
  function hairAnchor(k) {
    const hd = P[0], nk = P[1], [dx, dy] = norm(nk.x - hd.x, nk.y - hd.y), f = faceNow(), h = HAIR[k];
    return [hd.x - dy * f * h.back - dx * h.up, hd.y + dx * f * h.back - dy * h.up];   // back of the skull, h.up above the centre
  }
  const hair = HAIR.map((h, k) => Array.from({ length: h.n }, () => { const [x, y] = hairAnchor(k); return { x, y, px: x, py: y }; }));
  function hairKick(vx, vy) {   // [feel] add velocity to the loose hair and jacket (world px/s)
    for (const st of hair) st.forEach((p, i) => { if (i) { p.px -= vx * DT * i / st.length; p.py -= vy * DT * i / st.length; } });
    if (tails) for (const t of tails) t.forEach((p, i) => { if (i) { p.px -= vx * DT * 0.6; p.py -= vy * DT * 0.6; } });
  }
  function hairStep(dt) {
    hair.forEach((st, k) => {
      const [ax, ay] = hairAnchor(k), h = HAIR[k];
      st[0].x = ax; st[0].y = ay;
      for (let i = 1; i < st.length; i++) {
        const p = st[i], vx = (p.x - p.px) * 0.86, vy = (p.y - p.py) * 0.86;
        p.px = p.x; p.py = p.y;
        p.x += vx; p.y += vy + G * 1.1 * dt * dt;
        // straight hair is springy: each node is pulled back toward hanging straight down from its root (a touch behind)
        const rx = ax - faceNow() * 0.35 * i, ry = ay + h.len * i;
        p.x += (rx - p.x) * 0.06; p.y += (ry - p.y) * 0.06;
      }
      for (let r = 0; r < 5; r++) for (let i = 1; i < st.length; i++) {
        const a = st[i - 1], b = st[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-6;
        if (d <= h.len) continue;
        const kk = (d - h.len) / d;
        if (i === 1) { b.x -= dx * kk; b.y -= dy * kk; }
        else { a.x += dx * kk * 0.5; a.y += dy * kk * 0.5; b.x -= dx * kk * 0.5; b.y -= dy * kk * 0.5; }
      }
      // keep the hair off the face: push nodes behind the head plane
      const hd = P[0], nk = P[1], [ux, uy] = norm(hd.x - nk.x, hd.y - nk.y), f = faceNow(), fx = -uy * f, fy = ux * f;
      for (let i = 1; i < st.length; i++) {
        const p = st[i], fw = (p.x - hd.x) * fx + (p.y - hd.y) * fy;
        if (fw > -2.5) { p.x -= fx * (fw + 2.5); p.y -= fy * (fw + 2.5); }
      }
      for (const p of st) if (p.y > GROUND - 1) p.y = GROUND - 1;
    });
  }

  function step(dt) {
    bagStep(dt);
    if (hero.mode === 'rag') { input.jump = false; input.attack = null; ragStep(dt); }
    else animStep(dt);
    objStep(dt);
    enemyStep(dt);
    if (isP9()) p9Step(dt);
    bulletStep(dt);
    bHit.cd -= dt;
    if (bHit.n) {   // [feel] bullets that land: a short freeze (longer for a shotgun blast), a spark and a kick along the shot
      const big = bHit.n >= 3;
      if (big || bHit.cd <= 0) { hitStop = Math.max(hitStop, big ? 0.06 : 0.03); bHit.cd = 0.12; }   // a long burst freezes every few hits, not on each
      hitSpark(bHit.x, bHit.y, bHit.d, big ? 200 : 70, false); kickCam(bHit.d, 0, big ? 1.4 : 0.5);
      if (big) shakeIt(0.12, 2);
      bHit.n = 0;
    }
    throwStep(dt);
    ammoStep(dt);
    hairStep(dt);
    secondaryStep(dt);
    for (const T of TRAMPS) if (T.squish > 0) T.squish -= dt;
    weatherStep(dt);
    bloodFlow(dt);
    houseWinStep(dt);
    dripStep(dt); goreFade(dt);
    crowdStep(dt);
    // the street ends at the wall; the club's left wall is its shut door
    if (!flags.club) { if (ctl.x > STREET_END) { ctl.x = STREET_END; ctl.spd = Math.min(ctl.spd, 0); } for (const p of P) if (p.x > STREET_END + 6) p.x = STREET_END + 6; }
    else { if (ctl.x < DOOR_X + 6) { ctl.x = DOOR_X + 6; ctl.spd = Math.max(ctl.spd, 0); } for (const p of P) if (p.x < DOOR_X + 2) p.x = DOOR_X + 2; }
    pickupStep();
    quakeStep(dt);
    regenStep(dt);
    laneTick();   // last: every body takes the lane of the surface it ended the step on
  }

  function toRag() {
    if (hero.mode === 'rag') return;
    hero.mode = 'rag'; ragFace = ctl.face; settleT = 0; ragT = 0; ragKD = false; hero.act = null; queued = null; gun.want = false; gun.aimT = 0;
    ctl.air = false; ctl.spd = 0; ctl.jumps = 0; ctl.flipT = -1; ctl.spin = 0;
  }
  function startGetup() {
    hero.mode = 'getup';
    gunPose = null;   // the gun rides in the hand until the fighter is up
    ctl.x = clamp(P[2].x, 12, W - 12); ctl.face = ragFace; ctl.spd = 0; ctl.air = false; ctl.vu = 0;
    ctl.surf = floorBelow(ctl.x, P[2].y, 0); ctl.y = ctl.surf.y - 2;
    gu = makeGetup(P.map(p => [p.x, p.y]), ctl.x, ctl.y, ctl.face);   // the knees bend the ragdoll's way: face stays ragFace
    hero.act = null; queued = null;
  }
  function punchAt(x, y, power = 1) {
    const R = 22; let hit = false, top = 0;
    for (const p of P) top = Math.max(top, (1 - Math.hypot(p.x - x, p.y - y) / R) * power);
    if (top > 0 && top < 0.45 && hero.mode === 'anim') { flinch(x, y, top / 0.45, x, y); return true; }   // [G3] weak hit: flinch
    for (const p of P) {
      const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy);
      if (d >= R) continue;
      if (!hit) { toRag(); hit = true; }
      const f = (1 - d / R) * 330 * power;
      const nx = d > 0.5 ? dx / d : 0, ny = d > 0.5 ? dy / d : -1;
      p.px -= nx * f * DT; p.py -= (ny * f - 90 * (1 - d / R) * power) * DT;
    }
    if (hit) { sparks.push({ x, y, t: 0 }); hits++; settleT = 0; if (!reduceMotion) cam.shake = Math.max(cam.shake, 0.1); }
    return hit;
  }
  function knockOver() {
    const f = hero.mode === 'rag' ? ragFace : ctl.face, h = P[0];
    punchAt(clamp(h.x + 7 * f, 0, W - 1), h.y + 1, 1.3);
  }
  function drop() {
    releaseGrab();
    hero.mode = 'rag'; hero.ko = false; settleT = 0; ragT = 0; hero.act = null; ragFace = simRand() < 0.5 ? -1 : 1;
    const pose = fk(IDLE, cam.x + cam.vw * (0.3 + simRand() * 0.4), GROUND - 2, ragFace);
    const cx = pose[2][0], cy = pose[2][1], a = (simRand() * 2 - 1) * Math.PI, ca = Math.cos(a), sa = Math.sin(a);
    const rot = pose.map(([x, y]) => [cx + (x - cx) * ca - (y - cy) * sa, cy + (x - cx) * sa + (y - cy) * ca]);
    const dy = cam.y + 30 - Math.max(...rot.map(q => q[1]));
    const wv = (simRand() * 2 - 1) * 5;
    P.forEach((p, i) => {
      p.x = rot[i][0]; p.y = rot[i][1] + dy;
      p.px = p.x + wv * (p.y - (cy + dy)) * DT; p.py = p.y - wv * (p.x - cx) * DT;
    });
  }
  function reset() {
    if (!flags.attract) gameAudio.playMusic('docks_explore', { volume: isP9() ? 0.6 : 0.45 });   // a game: the calm street track, low (the title screen plays the title theme)
    if (openT >= 0) endOpening();
    endPh = null; endT = 0; endCam = null; dog = null; ctl.bottle = false; jumpEnd = false;
    releaseGrab();
    hero.mode = 'anim'; hero.ko = false; flags.wasted = false; hero.bandT = 0; hero.act = null; queued = null; wAct = 0; settleT = 0; ignoreS = null;
    Object.assign(ctl, { x: START_X, y: GROUND - 2, face: 1, spd: 0, air: false, vu: 0, jumps: 0, flipT: -1, spin: 0, surf: GROUND_S });
    const j = fk(IDLE, ctl.x, ctl.y, 1);
    P.forEach((p, i) => { p.x = p.px = j[i][0]; p.y = p.py = j[i][1]; });
    bag.forEach((p, i) => { p.x = p.px = BAG_X + BAG_START[i][0]; p.y = p.py = BAG_START[i][1]; });
    resetObjs();
    particles.length = 0; sparks.length = 0; waves.length = 0; quakes.length = 0;
    ctl.bounces = 0; ctl.tramp = false; ctl.carry = null; pocket.length = 0; tossed.length = 0; crowdTossT = 4;
    flags.club = false; clubT = 0; fade = 0; fadeDir = 0; slamDone = false;
    cam.xf = START_X - 80; cam.yf = GROUND - 60; cam.v.x = cam.v.y = cam.v.z = 0; cam.zoom = 1;   // [feel] a restart cuts to the start, it does not fly the camera back
    resetTutorial();
    if (isP9()) p9Reset();
  }

  // ---------- tutorial: zones, lessons, weapon pickups ----------
  // the tutorial: every mechanic of the game, stage by stage, left to right
  const ZONES = [
    { x0: -99, title: '1 · Move', tasks: [['walk', 'Walk: ← →'], ['run', 'Run: hold Shift (the menu can make running the default)'],
      ['jump', 'Get onto the car roof: jump (↑) at its side and keep ↑ held; you grab the edge and pull up'], ['charge', 'Climb higher: hold ↑ as you jump at the bar roof or a scaffold'],
      ['drop', 'Drop through a roof: hold ↓ and press Space'], ['roll', 'Dodge roll: Space (nothing hits you mid-roll)'], ['squatroll', 'Roll out of a run: press ↓ while running']] },
    { x0: 520, title: '2 · Bare hands', tasks: [['lp', 'Jab: tap Q (twice = both hands)'], ['hp', 'Heavy punch: hold Q'], ['lk', 'Kick: tap W'], ['hk', 'Heavy kick: hold W (switches legs)'],
      ['slp', 'Low jab: squat (↓), then tap Q'], ['slk', 'Low kick: squat (↓), then tap W'], ['sweep', 'Leg sweep: squat (↓), then hold W'], ['airkick', 'Flying kick: jump, then W'],
      ['smash', 'Smash a crate to pieces (it cracks first)'], ['split', 'Break the crate stack with a heavy hit'],
      ['lift', 'Pick up the dustbin: squat beside it with empty hands'], ['bash', 'Hit a goon with it: tap Q (it breaks on him)'], ['toss', 'Pick up another and throw it: hold Q with no goon in reach'],
      ['pocket', 'Squat (↓) by a can or a bottle to pocket it (walk into one and you kick it)'], ['pockethit', 'Throw it at a goon: hold Q with no goon in reach'], ['kill1', 'Beat the 2 goons (they hit back)']] },
    { x0: 900, title: '3 · Katana', tasks: [['pick1', 'Pick up the katana'], ['ks', 'Slash: tap Q'], ['kw', 'Heavy slash: hold Q close to a goon'], ['kh', 'Overhead finisher: tap Q, then hold Q'],
      ['sslash', 'Low cut: squat (↓), then Q'], ['kair', 'Jump slash: jump, then Q'], ['tw', 'Throw the blade: hold Q with no goon in reach'], ['catch', 'Walk over the blade to pick it up'], ['kill2', 'Cut down the 3 goons']] },
    { x0: 1250, title: '4 · Axe', tasks: [['pick2', 'Pick up the axe (your katana drops by the bench)'], ['al', 'Chop combo: tap Q (it switches hands)'], ['aw', 'Heavy chop: hold Q close to a goon'],
      ['ah', 'Ground-slam finisher: tap Q, then hold Q close to a goon'], ['aair', 'Plunge: climb onto the van, jump off, then Q'], ['throwhit', 'Hit a goon with a thrown blade'],
      ['swap', 'Swap weapons: squat (↓) on a weapon lying on the ground'], ['kill3', 'Chop down the 3 goons']] },
    { x0: 1600, title: '5 · Shotgun', tasks: [['pick3', 'Pick up the shotgun'], ['fire3', 'Fire: Q'], ['runfire', 'Fire while running'], ['ammo', 'Load up: walk over an ammo box a goon drops'], ['kill4', 'Blast the 4 goons']] },
    { x0: 1900, title: '6 · Machine gun', tasks: [['pick4', 'Pick up the machine gun'], ['burst', 'Hold Q to fire a burst (a tap fires a short one)'], ['airfire', 'Fire in the air'],
      ['hurl', 'Out of ammo: press Q to hurl the gun'], ['kill5', 'Mow down the 4 goons']] },
    { x0: 2150, title: '7 · The club roof', tasks: [['stairs', 'Walk up the fire escape'], ['top', 'Climb all the way to the club roof']] },
    { x0: 2420, title: '8 · Boss', tasks: [['enter', 'Walk the red carpet into the club'], ['boss', 'Defeat the boss (his crew joins in; jump over the shockwave of his ground slam)']] },
  ];
  const TOTAL = ZONES.reduce((n, z) => n + z.tasks.length, 0);
  const TUTKEYS = new Set(ZONES.flatMap(z => z.tasks.map(([k]) => k)));   // only these count: side events (tosshit, pocket, ammo...) are not lessons
  const done = new Set();
  const REST_LOW = { katana: 1, axe: 6, shotgun: 2, mg: 6 };   // how far each weapon's shape reaches below its grip line (px): it rests on the seat at GROUND - 7
  const restY = w => GROUND - 8 - REST_LOW[WEAPONS[w].id];
  const pickups = PEDESTALS.map((x, i) => ({ w: i + 1, x, y: restY(i + 1), taken: false }));
  pickups.push({ w: 4, x: 2486, y: restY(4), taken: false, rack: true });   // a loaded machine gun lying on the dais inside the club door
  const WAVES = { 1: [770, 815], 2: [1060, 1120, 1190], 3: [1340, 1410, 1570], 4: [1720, 1790, 1850, 1880], 5: [1990, 2060, 2110, 2135] };
  const spawned = new Set(), zoneTs = {};   // the stages whose goons are out; the time spent in each stage
  const tutEl = document.getElementById('tut'), toastEl = document.getElementById('toast');
  let tutZone = -1, tutDirty = true, toastT = 0;
  const toastQ = [], cleared = new Set(), pickToasted = new Set(), wavePend = new Set();
  let toastSoft = false, softT = -9;
  function tut(ev) { if (openT >= 0) return; if (TUTKEYS.has(ev) && !done.has(ev)) { done.add(ev); tutDirty = true; } }
  bus.on('feat', tut);   // a feat (roll, sweep, pick1 ...) ticks its lesson
  // UI listeners: toasts and the kill feed (DOM and UI state only)
  bus.on('pickup', p => {
    if (p.kind === 'weapon' && p.source === 'bench' && !pickToasted.has(p.w)) {
      const Wp = WEAPONS[p.w]; pickToasted.add(p.w);
      toast(`${Wp.name} acquired`, Wp.gun ? 'Q fire · empty: Q throws it' : `tap Q ${Wp.labels[0].toLowerCase()} · hold Q ${Wp.labels[1].toLowerCase()}`, true);
    } else if (p.kind === 'bandage' && !pickToasted.has('band')) { pickToasted.add('band'); toast('Bandage', `Regen for ${BAND_T} s`, true); }
  });
  bus.on('ko', p => { if (!p.perma) toast('K.O.', 'You get back up with full health'); });
  bus.on('kill', p => { if (!p.isBoss) { kills.push({ name: p.enemy.name, w: p.weapon, t: simTime }); feedDirty = true; } });
  bus.on('boss:defeated', () => isP9() ? toast('Marchetti is down', 'The collector has been collected.') : toast('Boss defeated', 'Club Noir is yours. The street is yours.'));
  bus.on('boss:intro', () => isP9() ? gameAudio.playMusic('boss_marchetti', { volume: 0.85 }) : gameAudio.playMusic('docks_explore', { volume: 0.85 }));   // the street: the same track, up
  bus.on('run:over', p => { if (p.result === 'wasted') gameAudio.stopMusic(2); });
  bus.on('boss:phase', p => { if (p.phase === 2 && isP9()) toast('Market close', 'The conveyor swings frozen tuna: watch the red lamp, then duck or roll under it.'); else if (p.phase === 2) toast('Boss enraged', 'Watch for the charge. Jump the shockwave of his slam. Punish the recovery.'); });
  // the gate: a stage's lessons must all be done before the street opens on to the next one (the demo walks free).
  // A lesson that cannot be done any more is made possible again: a sparring goon when the stage's goons are down,
  // a fresh crate, stack, bin, can or bottle when the stage has none left.
  const GOON_TASKS = new Set(['bash', 'pockethit', 'kw', 'kh', 'aw', 'ah', 'throwhit']);   // these need a goon in reach
  const PROP_TASKS = { smash: ['crate', 'bigcrate'], split: ['stack'], lift: [...LIFTABLE], toss: [...LIFTABLE], pocket: ['can', 'bottle'], pockethit: ['can', 'bottle'] };
  let gateT = 0, gateToastT = -9;
  const stageDone = i => ZONES[i].tasks.every(([k]) => done.has(k));
  const openStage = () => { for (let i = 0; i < ZONES.length; i++) if (!stageDone(i)) return i; return ZONES.length - 1; };
  function tutGate(rdt) {
    if (flags.demo || flags.attract || endPh || openT >= 0) return;
    const i = openStage(); if (i + 1 >= ZONES.length) return;
    const wall = ZONES[i + 1].x0 - 6;
    if (P[2].x > wall) {   // pushed back to the stage line (walking, or flying there as a ragdoll)
      const dx = wall - P[2].x;
      for (const p of P) { p.x += dx; p.px = Math.min(p.px + dx, p.x); }
      if (hero.mode === 'anim') { ctl.x += dx; ctl.spd = Math.min(ctl.spd, 0); }
      if (simTime - gateToastT > 6) { gateToastT = simTime; toast(`Stage ${i + 1} is not done`, 'Finish every lesson on the list to go on', true); }
    }
    if ((gateT += rdt) < 1) return;
    gateT = 0;
    const Z = ZONES[i], x1 = ZONES[i + 1].x0, todo = Z.tasks.map(([k]) => k).filter(k => !done.has(k));
    if (P[2].x < Z.x0 || hero.mode !== 'anim') return;   // (only while he is in the stage)
    if (WAVES[i] && spawned.has(i) && !(zoneAlive[i] > 0) && todo.some(k => GOON_TASKS.has(k))) {
      const x = clamp(P[2].x + 110, Z.x0 + 20, x1 - 20), g = spawnEnemy('goon', x, i); g.cdT = Math.max(g.cdT, 1.5);
      toast('A sparring partner', 'Another goon to practise on', true);
    }
    for (const k of todo) {
      const kinds = PROP_TASKS[k]; if (!kinds) continue;
      if (k === 'pockethit' && pocket.length) continue;
      if (objs.some(o => kinds.includes(o.kind) && o.x >= Z.x0 && o.x < x1) || (ctl.carry && kinds.includes(ctl.carry.kind))) continue;
      const src = OBJ_START.filter(([kind, x]) => kinds.includes(kind) && x >= Z.x0 && x < x1);
      for (const [kind, x, top] of src.length ? src : [[kinds[0], clamp(P[2].x + 40, Z.x0 + 10, x1 - 10), GROUND]]) {
        const o = makeObj(kind, x, top - KINDS[kind].r - 12); o.safeT = 0.5;   // it drops in from just above
        puff(x, top - 1);
      }
    }
  }
  // toasts: a soft one (pickups, goons coming, ammo) shows only when nothing else is up, at most one per 4 s, and is never queued;
  // a hard one (stage clear, K.O., boss states) replaces a soft one at once, and waits its turn behind another hard one that only just came up
  function toast(title, sub, soft) {
    if (openT >= 0 || (endPh && endPh !== 'done')) return;   // the opening and the ending play without captions
    if (soft) { if (toastT > 0 || simTime - softT < 4 || enc.introT >= 0 || flags.attract) return; softT = simTime; }
    else if (toastT > 1.8 && !toastSoft) { if (toastQ.length < 4 && !toastQ.some(q => q[0] === title)) toastQ.push([title, sub]); return; }
    toastEl.innerHTML = `${title}<small>${sub}</small>`; toastEl.hidden = false; toastT = 2.6; toastSoft = !!soft;
    return true;
  }
  // this run: time, kills, damage taken, knock-outs; shown on a results card after the boss
  const resultsEl = document.getElementById('results');
  let kos = 0;
  const runS = { t: 0, kills: 0, dmg: 0, hp: 100, down: false, streak: 0, seen: new WeakSet(), endT: -1, prevMode: 'anim', koUp: false };
  function resetRun() {
    Object.assign(runS, { t: 0, kills: 0, dmg: 0, hp: 100, down: false, streak: 0, seen: new WeakSet(), endT: -1, koUp: false });
    kos = 0; toastQ.length = 0; cleared.clear(); pickToasted.clear(); wavePend.clear(); resultsEl.hidden = true;
    kills.length = 0; landed = 0; feedDirty = true;   // (the demo's or the last run's kills do not carry over)
  }
  function showWasted() {
    flags.wasted = true;
    emit('run:over', { result: 'wasted' });
    const t = Math.round(runS.t), mm = Math.floor(t / 60), ss = String(t % 60).padStart(2, '0');
    resultsEl.innerHTML = `<h2>Wasted</h2><dl><dt>Difficulty</dt><dd>${DIF().name}</dd><dt>Time</dt><dd>${mm}:${ss}</dd><dt>Kills</dt><dd>${runS.kills}</dd>`
      + `<dt>Hits landed</dt><dd>${landed}</dd></dl><small>Enter or R to play again · Esc for the menu</small>`;
    resultsEl.hidden = false; toastEl.hidden = true; toastT = 0; toastQ.length = 0;
  }
  function showResults() {
    if (flags.attract) return;
    emit('run:over', { result: 'cleared' });
    const t = Math.round(runS.t), mm = Math.floor(t / 60), ss = String(t % 60).padStart(2, '0');
    const rank = kos === 0 && runS.dmg < 60 ? 'S' : kos === 0 && runS.dmg < 160 ? 'A' : kos <= 2 ? 'B' : 'C';
    resultsEl.innerHTML = `<h2>Club cleared</h2><dl><dt>Difficulty</dt><dd>${DIF().name}</dd><dt>Time</dt><dd>${mm}:${ss}</dd><dt>Kills</dt><dd>${runS.kills}</dd>`
      + `<dt>Damage taken</dt><dd>${Math.round(runS.dmg)}</dd><dt>Knock-outs</dt><dd>${kos}</dd><dt>Lessons</dt><dd>${done.size} / ${TOTAL}</dd></dl>`
      + `<div class="rank">Rank<b>${rank}</b></div><small>R to play again</small>`;
    resultsEl.hidden = false; toastEl.hidden = true; toastT = 0; toastQ.length = 0;
  }
  // knocked out: you get up with full health, and the fighters around you are thrown back so you are not hit again at once.
  // a second knock-out in a row in the boss arena clears its goons and staggers the boss
  function secondWind() {
    hero.invT = Math.max(hero.invT, 1.2);
    waves.push({ x: ctl.x, y: ctl.y + 1, t: 0 }); dust(ctl.x - 4, ctl.y + 1, 6); dust(ctl.x + 4, ctl.y + 1, 6);
    for (const e of enemies) if (!e.dead && Math.abs(e.x - ctl.x) < 60 && Math.abs(e.y - ctl.y) < 30) {
      const d = Math.sign(e.x - ctl.x) || 1;
      e.act = null; e.hurtT = e === enc.boss ? 0.5 : 0.6; e.vx = d * (e === enc.boss ? 90 : 160); e.cdT = Math.max(e.cdT, 0.8);
    }
    if (enc.arena && enc.boss && !enc.boss.dead && runS.streak >= 2) {
      enc.spawnT = Math.max(enc.spawnT, 8);   // and a breather before his crew comes again
      runS.streak = 0;
      for (const g of enemies) if (!g.dead && g.zone === 'arena') killEnemy(g, Math.sign(g.x - ctl.x) || 1, 200, 0.5);
      enc.boss.act = null; enc.boss.hurtT = 1; enc.boss.vx = (Math.sign(enc.boss.x - ctl.x) || 1) * 160; enc.boss.cdT = 1.5;
      toast('Second wind', 'The goons are down. Catch your breath and go again.');
    }
  }
  function runTick(rdt) {
    if (!enc.bossBeaten) runS.t += rdt * timeScale;
    for (const e of enemies) if (e.dead && !runS.seen.has(e)) { runS.seen.add(e); if (e !== enc.boss) runS.kills++; }
    if (hero.hp < runS.hp) runS.dmg += runS.hp - hero.hp;
    runS.hp = hero.hp;
    if (hero.hp <= 0 && !runS.down && hero.mode === 'rag') { runS.down = true; kos++; runS.streak++; runS.koUp = true; }
    if (hero.mode !== 'rag') runS.down = false;
    if (hero.mode === 'getup' && runS.prevMode !== 'getup' && runS.koUp) { runS.koUp = false; secondWind(); }
    runS.prevMode = hero.mode;
    if (enc.bossBeaten && endPh === null && !flags.wasted) { endPh = isP9() ? 'p9wait' : 'wait'; endT = 0; }   // the boss is down: the ending plays, then the card (not after a Wicked K.O.)
    if (enc.bossBeaten && runS.endT < 0 && endPh === 'done' && !flags.wasted && !isP9()) runS.endT = 0.4;   // (Pier 9 shows its own card after the outro)
    if (runS.endT > 0 && (runS.endT -= rdt) <= 0) showResults();
  }
  function tutTick(rdt) {
    if (cardT > 0 && (cardT -= rdt) <= 0) cardEl.hidden = true;
    if (toastT > 0 && (toastT -= rdt) <= 0) {
      toastEl.hidden = true;
      if (toastQ.length) { const [a, b] = toastQ.shift(); toast(a, b); }
    }
    runTick(rdt);
    if (isP9()) { p9Tick(rdt); return; }
    if (hero.mode === 'anim') {
      if (ctl.spd > 5 && ctl.spd < WALK + 6) emit('feat', 'walk');
      if (ctl.spd > WALK + 20 && !ctl.air) emit('feat', 'run');
      }
    // the stage panel switches with hysteresis: 24 px past a stage line going right, 24 px back over it going left, and never while the old stage's goons stand
    let zc = 0; while (zc + 1 < ZONES.length && P[2].x >= ZONES[zc + 1].x0) zc++;
    const onRoof = ctl.surf === GOAL && stageDone(ZONES.length - 2);   // up on the club roof with stage 7 done: the red carpet is stage 8
    if (onRoof) zc = ZONES.length - 1;
    let z = tutZone < 0 ? zc : onRoof ? zc : tutZone;
    if (tutZone >= 0 && zc !== tutZone && !(zoneAlive[tutZone] > 0)) {
      if (zc > tutZone && P[2].x >= ZONES[zc].x0 + 24) z = zc;
      else if (zc < tutZone && P[2].x < ZONES[tutZone].x0 - 24) z = zc;
    }
    if (z !== tutZone) { tutZone = z; tutDirty = true; }
    for (const i of wavePend) if (enemies.some(e => !e.dead && e.zone === i && e.x > cam.x - 4 && e.x < cam.x + cam.vw + 4) && toast('Here they come', `Beat the ${WAVES[i].length} goons`, true)) wavePend.delete(i);
    // each stage's goons come out by where the hero really is (not by the stage panel, which waits while goons stand):
    // once its moves are learned (so each is taught in peace first), after 30 s in it, past its middle, near its exit, or at once
    // if he runs in (skipping the lessons: he wants a fight). A runner meets them ahead of him, not behind.
    if (hero.mode === 'anim' && !flags.club && !flags.demo) for (const key in WAVES) {
      const i = +key; if (spawned.has(i) || P[2].x < ZONES[i].x0) continue;
      zoneTs[i] = (zoneTs[i] || 0) + (zc === i ? rdt * timeScale : 0);
      const learned = ZONES[i].tasks.every(([k]) => k.startsWith('kill') || done.has(k)), x1 = ZONES[i + 1].x0, mid = (ZONES[i].x0 + x1) / 2;
      const rushing = !flags.demo && ctl.spd > WALK + 10 && ctl.face > 0, go = learned || zoneTs[i] > 30 || (!flags.demo && P[2].x > mid) || P[2].x > x1 - (flags.demo ? 50 : 120) || rushing || zc > i;   // (the demo keeps to the lessons-first order)
      if (!go || zoneTs[i] < 0.3 && !(zc > i)) continue;
      spawned.add(i); wavePend.add(i);
      const used = new Set(), hx = P[2].x;
      WAVES[i].forEach((w0, n) => {
        const x0 = w0 < hx + 40 ? hx + 70 + n * 26 : w0;   // a spot he has already passed: the goon comes out ahead of him instead
        // each goon steps out of the nearest unused house door, alley gap or parked-car door; with none near (or too close to you) he walks in from off screen
        let src = null, best = 46;
        for (const [kind, list] of [['door', DOORS], ['alley', ALLEYS], ['car', CARDOORS]]) for (const d of list) {
          const dd = Math.abs(d.x - x0); if (dd < best && !used.has(d) && Math.abs(d.x - hx) > 40) { best = dd; src = { kind, d }; }
        }
        let x;
        if (src) { used.add(src.d); x = src.d.x; spawnFx.push({ kind: src.kind, d: src.d, x, t: 0 }); }
        else x = clamp(x0 >= hx ? Math.max(x0, cam.x + cam.vw + 14) : Math.min(x0, cam.x - 14), 12, Math.min(W, STREET_END) - 20);
        const g = spawnEnemy('goon', x, i);
        g.cdT = Math.max(g.cdT, 0.9);
      });
    }
    if (!enc.boss && !enc.bossBeaten && hero.mode === 'anim' && flags.club && slamDone) {   // inside the club, the door shut: the entrance
      // the room goes dark but for one white spot; the crowd flinches back; the boss walks out of the far doorway to his mark under the light
      enc.arena = { x0: 2440, x1: W - 12 }; enc.spawnT = 6; enc.arenaSpawned = 0;
      enc.boss = spawnEnemy('boss', CLUB_DOORS[0], 'boss'); enc.boss.intro = true; enc.boss.introX = CLUB_DOORS[0] + 56; enc.boss.face = 1;
      enc.introT = 0; bossBarK = 0; spawnFx.push({ kind: 'club', x: CLUB_DOORS[0], t: 0 });
      emit('boss:intro', { boss: enc.boss, name: BOSS_NAME });
      for (const d of dancers) { d.mood = 'shock'; d.t = 2.6; d.home0 = d.home; d.home = clamp(d.home + (d.home > enc.boss.introX ? 18 : -18), CLUB_X + 34, W - 24); }
      toastEl.hidden = true; toastT = 0; toastQ.length = 0;
    }
    tutGate(rdt);
    if (!tutDirty) return;
    tutDirty = false;
    ZONES.forEach((Zc, i) => {   // a stage with every lesson done: say so, and point on
      if (cleared.has(i) || zoneAlive[i] > 0 || !Zc.tasks.every(([k]) => done.has(k))) return;
      cleared.add(i); runS.streak = 0;
      if (i + 1 < ZONES.length) toast(`Stage ${i + 1} clear`, `Next: ${ZONES[i + 1].title.replace(/^\d+ · /, '')} →`);
    });
    // the stage's whole lesson list: done ones struck through; the way on stays shut until all are done
    const Z = ZONES[z], left = Z.tasks.filter(([k]) => !done.has(k)).length;
    const next = done.has('boss') ? 'The street is yours.' : left ? '' : z + 1 < ZONES.length ? 'All done here. Keep going right →' : '';
    const shut = left && z + 1 < ZONES.length ? `<div class="gate">Finish every lesson to open stage ${z + 2}</div>` : '';
    tutEl.innerHTML = `<span class="count">${done.size}/${TOTAL}</span><span class="stage-n">Stage ${z + 1} of ${ZONES.length} · ${Z.tasks.length - left}/${Z.tasks.length} done</span><h2>${Z.title}</h2>`
      + `<ul>${Z.tasks.map(([k, t]) => `<li${done.has(k) ? ' class="done"' : ''}>${t}</li>`).join('')}</ul>${shut}${next ? `<div class="next">${next}</div>` : ''}`;
  }
  // the bench weapons: walk into one to take it (walking back past a lesser weapon keeps yours; squat to swap). Runs in the fixed step.
  function pickupStep() {
    if (hero.mode !== 'anim') return;
    for (const k of pickups) if (!endPh && !k.taken && !ctl.carry && (!hero.weapon || k.w >= hero.weapon || input.downHeld) && Math.abs(ctl.x - k.x) < 9 && ctl.y > GROUND - 12) {
      k.taken = true; equip(k.w, fullCharge(k.w)); emit('feat', 'pick' + k.w);
      sparks.push({ x: k.x, y: k.y, t: 0 }); waves.push({ x: k.x, y: GROUND - 1, t: 0 });
      emit('pickup', { kind: 'weapon', w: k.w, source: 'bench', x: k.x, y: k.y });
    }
  }
  // the boss's slam shockwaves roll along the ground; one that passes under him while he stands knocks him down. Runs in the fixed step.
  function quakeStep(dt) {
    for (let i = quakes.length - 1; i >= 0; i--) {
      const q = quakes[i]; q.t += dt; q.x += q.dir * QUAKE.v * dt;
      if (q.t > QUAKE.life || q.x < (enc.arena ? enc.arena.x0 - 4 : 0) || q.x > (enc.arena ? enc.arena.x1 + 4 : W)) { quakes.splice(i, 1); continue; }
      particles.push({ x: q.x + (simRand() - 0.5) * 4, y: q.y - 1, vx: q.dir * (20 + simRand() * 40), vy: -60 - simRand() * 70, life: 0.25 + simRand() * 0.2, c: simRand() < 0.5 ? PAL.dust1 : PAL.out });   // (one per step: two per 60 Hz frame, as before)
      const k = 1 - q.t / QUAKE.life;   // it fades as it runs out
      if (!q.hit && hero.mode === 'anim' && !ctl.air && Math.abs(ctl.y + 2 - q.y) < 6 && Math.abs(ctl.x - q.x) < QUAKE.w) {
        q.hit = true; hurtPlayer(Math.round(QUAKE.dmg * (0.6 + 0.4 * k)), ctl.x, ctl.y - 2, q.dir, true, 1.2);
      }
    }
  }
  // health: back up to full after a K.O.; the regen by difficulty, more with a bandage on. Runs in the fixed step.
  function regenStep(dt) {
    if (hero.bandT > 0) hero.bandT = Math.max(0, hero.bandT - dt);
    if (hero.mode === 'anim') hero.hp = hero.hp <= 0 ? 100 : Math.min(100, hero.hp + (DIF().regen + (hero.bandT > 0 ? BAND_REGEN : 0)) * dt);
  }
  // a soft gold ring round every pickable: a bright 1-px edge and a faint second ring, pulsing (added on top of the light pass)
  const PICK_GLOW = [255, 205, 110], PICK_Z = 9;   // PICK_Z: in 3D, pickables lying in the street stand this far in front of the front lane (past its crates)
  function pickGlow() {
    if (pickArt.x1 < 0) return;
    const x0 = Math.max(0, pickArt.x0 - 2), x1 = Math.min(cam.vw - 1, pickArt.x1 + 2), y0 = Math.max(0, pickArt.y0 - 2), y1 = Math.min(cam.vh - 1, pickArt.y1 + 2), M = pickArt.mask;
    const a = 0.55 + 0.25 * Math.sin(simTime * 5);
    const at = (x, y) => x >= 0 && y >= 0 && x < cam.vw && y < cam.vh && M[y * CW + x] === 1;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * CW + x; if (M[i]) continue;
      const k = at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1) ? a
        : at(x - 2, y) || at(x + 2, y) || at(x, y - 2) || at(x, y + 2) || at(x - 1, y - 1) || at(x + 1, y - 1) || at(x - 1, y + 1) || at(x + 1, y + 1) ? a * 0.35 : 0;
      if (!k) continue;
      const c = buf[i], add = (v, sh) => Math.min(255, (c >> sh & 255) + v * k);
      buf[i] = (255 << 24 | add(PICK_GLOW[2], 16) << 16 | add(PICK_GLOW[1], 8) << 8 | add(PICK_GLOW[0], 0)) >>> 0;
    }
    for (let y = Math.max(0, pickArt.y0); y <= Math.min(cam.vh - 1, pickArt.y1); y++) M.fill(0, y * CW + Math.max(0, pickArt.x0), y * CW + Math.min(cam.vw - 1, pickArt.x1) + 1);
    pickArt.x0 = pickArt.y0 = 1e9; pickArt.x1 = pickArt.y1 = -1;
  }
  function drawPickups() {
    for (const k of pickups) {
      if (k.taken) continue;
      const bob = -Math.round(Math.abs(Math.sin(simTime * 1.5 + k.w)) * 1.5), y = k.y + bob, id = WEAPONS[k.w].id;   // (it lifts off the seat and settles back)
      if (Math.floor(simTime * 6 + k.w) % 3 === 0) plot(k.x + ((k.w * 7 + Math.floor(simTime * 6)) % 13) - 6, y - 6, PAL.white);   // glint
      const len = WEAPONS[k.w].len, g = { x: k.x - len / 2 + (id === 'katana' || id === 'axe' ? 2 : 0), y, dx: 1, dy: 0, s: 1, len };
      drawWeaponShape(id, g, 0);
    }
  }
  function resetTutorial() {
    done.clear(); tutDirty = true; tutZone = -1; spawned.clear(); for (const k in zoneTs) delete zoneTs[k]; clearEnemies(); resetRun();
    charge.fill(0); thrown.length = 0; ammoBoxes.length = 0;
    for (const k of pickups) k.taken = false;
    weaponBtns.forEach(b => { b.disabled = +b.dataset.w !== 0; });
    setWeapon(0);
  }

  // ---------- demo: an autopilot that plays the tutorial from start to finish, then starts again ----------
  // each step holds inputs (dir, run, jump, down, fire) until `until` is true or `dur`/`max` runs out;
  // jump and attack fire when the step starts (again while the fighter is too busy to take them); `fn` runs once at the start.
  // to: walk to an x (a number or a function); face: then turn that way; tick(sdt): a step that drives the inputs itself.
  // LES(lesson, steps): a group that is skipped when the lesson is done and played again (up to 4 times) when it is not.
  const landed_ = () => !ctl.air && hero.act !== 'air' && hero.act !== 'crouch';
  const climbed_ = () => dT > 0.25 && landed_() && hero.act !== 'climb';   // a held jump step: keep W down from the take-off until he stands again (up on the ledge)
  const has = w => () => hero.weapon === w;
  const LES = (need, seq) => ({ need, seq });
  const ATBAG = { to: 598, face: 1 };
  // the closest loose object of some kinds on the fighter's level
  function demoObj(kinds, range) {
    let best = null;
    for (const o of objs) if (kinds.includes(o.kind) && Math.abs(o.x - ctl.x) < range && Math.abs(o.y + o.r - (ctl.y + 2)) < 5 && (!best || Math.abs(o.x - ctl.x) < Math.abs(best.x - ctl.x))) best = o;
    return best;
  }
  // walk up to a box, face it and hit it hard (a heavy kick for a low box); done once the hit is thrown
  // break every crate in a stage before moving on: walk up to the nearest one on the street and hit it until it bursts
  let demoSmash = false;   // the demo is breaking crates: a squat is for a sweep, not for lifting
  const smashAll = (x0, x1) => sdt => {
    demoSmash = true;
    let o = null;
    for (const q of objs) if (q.maxHp && q.x > x0 && q.x < x1 && q.y + q.r > GROUND - 6 && (!o || Math.abs(q.x - ctl.x) < Math.abs(o.x - ctl.x))) o = q;
    if (!o) return true;
    const Wp = WEAPONS[hero.weapon], shoot = Wp.gun && charge[hero.weapon] > 0, dx = o.x - ctl.x, side = Math.sign(dx) || 1, gap = shoot ? 34 : (o.hw || o.r) + (Wp.melee ? 12 : 8);
    if (Wp.gun) return true;   // bullets fly over a box on the street: keep the ammo for the goons
    const low = !Wp.melee && !o.hw && !(Wp.gun && !shoot);   // a low box: sweep it from a squat, or shoot it from a squat (standing, the shots fly over it)
    if (MOVES[hero.act]) { input.dir = 0; input.downHeld = low && LOW_RE.test(hero.act); return false; }
    if (Math.abs(dx) > gap + 3) { input.dir = side; input.run = Math.abs(dx) > 50; input.fireHeld = false; input.downHeld = false; return false; }
    if (ctl.face !== side) { input.dir = side; input.downHeld = false; return false; }
    input.dir = 0;
    if (ctl.spd > 4) return false;
    if (shoot) { input.downHeld = true; input.fireHeld = !!Wp.auto; if ((demoAtkT -= sdt) <= 0) { input.attack = 'lp'; demoAtkT = 0.2; } return false; }
    if (Wp.gun) { input.attack = 'tw'; return false; }   // an empty gun: hurl it at the box
    if (low) { input.downHeld = true; if (hero.act === 'squat' && (demoAtkT -= sdt) <= 0) { input.attack = 'hk'; demoAtkT = 0.35; } return false; }   // squat (held), then a leg sweep
    if ((demoAtkT -= sdt) <= 0) { input.attack = Wp.melee ? (simRand() < 0.5 ? 'hp' : 'lp') : 'hp'; demoAtkT = 0.45; }
    return false;
  };
  // climb the fire escape: follow each flight's direction, turn at every landing, stop on the roof
  function climbTick() {
    const s = ctl.surf;
    if (s === GOAL && !ctl.air) return true;
    input.run = false; input.downHeld = false;
    if (s && s.landing) {   // cross the landing to its far end, where the next flight starts, then turn
      const end = s.next < 0 ? s.x1 - 1 : s.x0 + 1;
      input.dir = Math.abs(ctl.x - end) > 1.5 ? Math.sign(end - ctl.x) : s.next;
    } else input.dir = s && s.step ? s.dir : ctl.x < STAIR_X0 + 2 ? 1 : -1;
    return false;
  }
  // walk up to the nearest liftable object on the street and squat beside it
  function liftTick() {
    if (ctl.carry) return true;
    let o = null;
    for (const q of objs) if (LIFTABLE.has(q.kind) && !q.carried && q.y + q.r > GROUND - 4 && Math.abs(q.x - ctl.x) < 300 && (!o || Math.abs(q.x - ctl.x) < Math.abs(o.x - ctl.x))) o = q;
    if (!o) return true;
    const dx = o.x - ctl.x;
    if (Math.abs(dx) > o.r + 6) { input.dir = Math.sign(dx); input.run = false; return false; }
    input.dir = 0; input.downHeld = true;
    return false;
  }
  const hitBox = (kinds, a, low) => sdt => {
    const o = demoObj(kinds, 260);
    if (!o) return true;
    if (low && !MOVES[hero.act]) input.downHeld = Math.abs(o.x - ctl.x) <= (o.hw || o.r) + 14 && ctl.face === (Math.sign(o.x - ctl.x) || 1);   // in reach and facing it: squat, then sweep
    const dx = o.x - ctl.x, side = Math.sign(dx) || 1, gap = (o.hw || o.r) + 11;
    if (MOVES[hero.act]) { input.dir = 0; return false; }
    if (Math.abs(dx) > gap + 3) { input.dir = side; input.run = Math.abs(dx) > 60; return false; }
    if (ctl.face !== side) { input.dir = side; return false; }
    input.dir = 0;
    if (ctl.spd < 4 && (!low || hero.act === 'squat')) { input.attack = a; return true; }
    return false;
  };
  // walk to the nearest goon of a stage that is still standing (the fight code takes over in range); hop up to one on a ledge
  const hunt = z => () => {
    if (!spawned.has(z)) { const into = ZONES[z].x0 + 40 - ctl.x; input.dir = into > 0 ? 1 : 0; input.run = into > 60; return false; }   // the stage's goons have not come yet: walk into the stage to bring them
    let foe = null;
    for (const e of enemies) if (!e.dead && e.zone === z && (!foe || Math.abs(e.x - ctl.x) < Math.abs(foe.x - ctl.x))) foe = e;
    if (!foe) return true;
    const dx = foe.x - ctl.x;
    input.dir = Math.abs(dx) > 4 ? Math.sign(dx) : 0; input.run = Math.abs(dx) > 50;
    if (input.dir && !ctl.air && !MOVES[hero.act]) for (const o of objs) {   // a box between him and the goon: hop it, do not shove it down the street
      const ahead = (o.x - ctl.x) * input.dir - (o.hw || o.r);
      if (o.kind !== 'ball' && !o.carried && ahead > -3 && ahead < 12 && Math.abs(o.x - ctl.x) < Math.abs(dx) && Math.abs(o.y + o.r - (ctl.y + 2)) < 4) { ctl.face = input.dir; input.jump = true; break; }
    }
    if (foe.y < ctl.y - 8) {   // a goon up on a ledge
      if (!foe.R || !foe.R.ranged) { input.dir = Math.abs(dx) > 50 ? Math.sign(dx) : 0; input.run = false; return false; }   // a brawler comes down: wait below
      const es = floorBelow(foe.x, foe.y + 1.5, 0), into = ctl.x < es.x0 ? 1 : ctl.x > es.x1 ? -1 : 0;   // a shooter stays up: take a run-up and jump on
      if (into) {
        const spot = (into > 0 ? es.x0 : es.x1) - into * 16;
        if (!ctl.air && Math.abs(ctl.x - spot) > 4) { input.dir = Math.sign(spot - ctl.x); input.run = false; return false; }
        if (!ctl.air) { input.dir = into; input.jump = true; input.jumpHeld = true; demoJ2 = GROUND - es.y > 32 ? 0.28 : -1; }
      }
    }
    if (ctl.air) { input.jumpHeld = true; if (demoJ2 >= 0 && (demoJ2 -= 1 / 60) < 0) input.jump = true; }
    return false;
  };
  const DEMO = [
    { fn: () => { reset(); startOpening(); }, until: () => openT < 0, max: 9 }, { dur: 0.3 },   // every demo lap opens with the scene
    // 1 · move
    { dir: 1, until: () => ctl.x >= 120 }, { dir: 1, run: true, until: () => ctl.x >= 150 }, { dir: 1, until: () => ctl.x >= 166 }, { dur: 0.25 },
    { dir: 1, jump: true, until: climbed_, max: 3 },                                                        // a held jump: grab the car roof and climb
    { dir: 1, until: () => ctl.x >= 226 }, { dur: 0.25 }, { dir: 1, jump: true, until: climbed_, max: 3 },   // a held jump: climb up to the bar roof
    { dur: 0.4 }, { down: true, dur: 0.15 }, { down: true, dash: true, dur: 0.15 }, { until: landed_, max: 3 },   // drop through: squat + Space
    LES('roll', [{ dash: true, dir: 1, dur: 0.7 }, { dur: 0.5 }]),
    LES('charge', [{ to: 362 }, { dur: 0.3 }, { dir: 1, jump: true, until: climbed_, max: 3 }, { dur: 0.5 }]),   // a climb onto the scaffold
    // 2 · bare hands
    { dir: 1, run: true, until: () => ctl.x >= 590, max: 10 },
    LES('lp', [ATBAG, { dur: 0.3 }, { attack: 'lp', dur: 0.35 }, { attack: 'lp', dur: 0.6 }]),
    LES('hp', [ATBAG, { attack: 'hp', dur: 1.0 }]),
    LES('lk', [ATBAG, { attack: 'lk', dur: 0.6 }]),
    LES('hk', [ATBAG, { attack: 'hk', dur: 1.1 }]),
    LES('sweep', [ATBAG, { down: true, dur: 0.3 }, { down: true, attack: 'hk', dur: 0.7 }]),
    LES('airkick', [ATBAG, { jump: true, until: () => ctl.air && hero.act === 'air', max: 1 }, { attack: 'lk', dur: 0.1 }, { until: landed_, max: 3 }]),
    LES('split', [{ tick: hitBox(['stack'], 'hp'), max: 8 }, { dur: 1.0 }]),                                         // break the stack
    LES('smash', [{ tick: hitBox(['crate', 'bigcrate'], 'lk', true), max: 8 }, { dur: 0.9 }]),
    LES('lift', [{ tick: liftTick, max: 10 }, { dur: 0.4 }]),
    LES('toss', [{ tick: () => { if (!ctl.carry) return true; input.dir = 0; if (!MOVES[hero.act]) input.attack = 'hp'; return false; }, max: 3 }, { dur: 0.5 }]),                             // then smash a box
    LES('kill1', [{ tick: hunt(1), max: 20 }]), { tick: smashAll(520, 900), max: 12 },   // clear the stage's crates
    // 3 · katana
    { dir: 1, run: true, until: has(1), max: 12 }, { dur: 0.5 },
    LES('ks', [{ attack: 'lp', dur: 0.4 }, { attack: 'lp', dur: 0.5 }]),
    LES('kh', [{ attack: 'lp', dur: 0.12 }, { attack: 'hp', dur: 1.0 }]),
    LES('sslash', [{ down: true, dur: 0.3 }, { down: true, attack: 'lp', dur: 0.6 }]),
    LES('kair', [{ jump: true, until: () => ctl.air && hero.act === 'air', max: 1 }, { attack: 'lp', dur: 0.1 }, { until: landed_, max: 3 }, { dur: 0.3 }]),
    LES('tw', [{ attack: 'tw', fn: () => { demoLost = 1; }, dur: 0.7 }, { seek: 1, run: true, until: has(1), max: 8 }]),   // throw, then fetch it
    LES('catch', [{ seek: 1, run: true, until: has(1), max: 8 }]),
    LES('kill2', [{ tick: hunt(2), max: 20 }]), { tick: smashAll(900, 1250), max: 12 },   // clear the stage's crates
    // 4 · axe
    { dir: 1, run: true, until: has(2), max: 12 }, { dur: 0.5 },
    LES('al', [{ attack: 'lp', dur: 0.5 }]),
    LES('ah', [{ attack: 'lp', dur: 0.15 }, { attack: 'hp', dur: 1.2 }]),
    LES('aair', [{ dir: 1, until: () => ctl.x >= 1425 }, { dur: 0.2 }, { dir: 1, jump: true, until: climbed_, max: 3 },   // climb up onto the van
      { dir: 1, until: () => ctl.x >= 1512 || ctl.air, max: 3 }, { dir: 1, jump: true, until: () => ctl.air && hero.act === 'air', max: 1 }, { dir: 1, attack: 'lp', dur: 0.1 },
      { until: landed_, max: 3 }, { dur: 0.5 }]),                                                         // plunge
    LES('kill3', [{ tick: hunt(3), max: 20 }]), { tick: smashAll(1250, 1600), max: 12 },   // clear the stage's crates
    // 5 · shotgun
    { dir: 1, run: true, until: has(3), max: 12 }, { dur: 0.5 },
    LES('fire3', [{ attack: 'lp', dur: 0.8 }]),
    LES('runfire', [{ dir: 1, run: true, dur: 0.7 }, { dir: 1, run: true, attack: 'lp', dur: 0.8 }, { dur: 0.4 }]),
    LES('kill4', [{ tick: hunt(4), max: 20 }]), { tick: smashAll(1600, 1900), max: 12 },   // clear the stage's crates
    // 6 · machine gun
    { dir: 1, run: true, until: has(4), max: 12 }, { dur: 0.5 },
    LES('burst', [{ fire: true, attack: 'lp', dur: 1.0 }]),
    LES('airfire', [{ fire: true, jump: true, dur: 0.4 }, { fire: true, until: landed_, max: 3 }]),
    LES('kill5', [{ tick: hunt(5), max: 20 }]), { tick: smashAll(1900, 2150), max: 12 },   // clear the stage's crates
    // 7 · trampoline, then onto the flag ledge
    LES('top', [{ to: STAIR_X0 - 4, run: true, max: 14 }, { tick: climbTick, max: 40 }, { dur: 0.6 }]),
    // 8 · boss
    { tag: 'club', dir: 1, until: () => flags.club, max: 8 }, { until: () => slamDone, max: 3 },
    { dir: 1, until: () => ctl.x >= 2490, max: 12 }, { dir: 1, until: () => enc.bossBeaten, max: 170 },
    { until: () => endPh === 'done', max: 45 }, { dur: 4 },   // the ending plays out, then the card
  ];
  let di = 0, dk = 0, dTry = 0, dT = 0, dStarted = false, demoAtkT = 0, dAtk0 = 0;
  function demoAttack(sdt, Wp) {
    if (Wp.auto) { input.fireHeld = true; if (!gun.want) input.attack = 'lp'; return; }
    if ((demoAtkT -= sdt) > 0) return;
    const pool = Wp.gun ? ['lp'] : Wp.melee ? ['lp', 'lp', 'hp'] : ['lp', 'lp', 'hp', 'lk', 'hk'];
    input.attack = pool[Math.floor(simRand() * pool.length)]; demoAtkT = 0.3 + simRand() * 0.25; input.fireHeld = false;
  }
  const demoShoots = Wp => Wp.gun && charge[hero.weapon] > 0;   // an empty gun is a club: bash with it
  // shoot or hit one foe: face it, then attack; guns from range
  function demoEngage(sdt, foe, Wp, quick) {
    const shoot = demoShoots(Wp), dx = foe.x - ctl.x, dir = Math.sign(dx) || 1, reach = shoot ? 105 : (Wp.len ? 19 : 13) + 4 * foe.s;
    if (ctl.face !== dir || Math.abs(dx) > reach) { input.dir = dir; input.run = Math.abs(dx) > 70; input.fireHeld = false; return; }
    input.dir = 0; input.run = false;
    if (Wp.gun && !shoot) { input.fireHeld = false; if ((demoAtkT -= sdt) <= 0 && !MOVES[hero.act]) { input.attack = 'lp'; demoAtkT = 0.15; } return; }   // empty: fire to hurl the gun
    if (quick && !Wp.gun) { if ((demoAtkT -= sdt) <= 0) { input.attack = 'lp'; demoAtkT = 0.24; } return; }   // quick hits only: never stuck in a long recovery
    demoAttack(sdt, Wp);
  }
  // the street demo fights hard: runs in (now and then with a jump attack), strings combos (low ones too), and gets out of the way
  // of a wind-up or a shot with a roll through or away, or a jump over the top
  let demoCombo = null, demoCi = 0, demoStepT = 0, demoEvT = 0;
  const DCOMBO = { fists: [['lp', 'lp', 'hp'], ['lp', 'lk', 'hk'], ['lk', 'lk', 'hk'], ['lp', 'lp', 'd:hk'], ['d:lp', 'd:lk', 'hp'], ['lp', 'hp'], ['lk', 'lp', 'lp', 'hk']],
    blade: [['lp', 'lp', 'lp'], ['lp', 'hp'], ['lp', 'lp', 'hp'], ['d:lp', 'lp', 'lp'], ['lp', 'd:lp', 'hp']] };
  function demoBrawl(sdt, foe, Wp) {
    const dx = foe.x - ctl.x, adx = Math.abs(dx), dir = Math.sign(dx) || 1;
    demoEvT -= sdt;
    if (ctl.air) {   // in the air: strike as he comes down on him
      input.dir = dir; input.jumpHeld = false; input.downHeld = false;
      if (adx < 28 && !MOVES[hero.act] && !Wp.gun) input.attack = Wp.melee ? 'lp' : 'lk';
      return;
    }
    // a wind-up close by, or a shot on its way: roll through him or away, or jump over it
    const threat = enemies.find(e => !e.dead && !e.down && Math.abs(e.x - ctl.x) < (e.reach || 17) + 18 && Math.abs(e.y - ctl.y) < 16 && ((e.act && e.actT < 0 && e.actT > -0.3) || e.mark > 0));
    const shot = eshots.find(b => Math.abs(b.x - ctl.x) < 60 && Math.sign(b.vx) === Math.sign(ctl.x - b.x));
    if ((threat || shot) && demoEvT <= 0 && !MOVES[hero.act]) {
      demoEvT = 0.7 + simRand() * 0.4; demoCombo = null; input.downHeld = false;
      const r = simRand();
      if (shot || r < 0.33) { input.dir = shot ? 0 : dir; input.jump = true; input.jumpHeld = false; return; }   // over it
      input.dir = r < 0.66 ? dir : -dir; input.dash = true; return;   // roll past him, or back out of reach
    }
    if (demoShoots(Wp)) {   // a gun: shoot from range, roll away when one gets close
      input.downHeld = false;
      if (adx < 24 && demoEvT <= 0) { input.dir = -dir; input.dash = true; demoEvT = 0.8; return; }
      demoEngage(sdt, foe, Wp, false); return;
    }
    if (Wp.gun) { input.downHeld = false; demoEngage(sdt, foe, Wp, false); return; }   // empty: hurl it
    const reach = (Wp.len ? 19 : 13) + 4 * foe.s;
    if (ctl.face !== dir || adx > reach) {   // close in at a run; between 30 and 60 px out, sometimes a jump attack
      demoCombo = null; input.downHeld = false;
      input.dir = dir; input.run = adx > 36;
      if (adx > 30 && adx < 60 && !MOVES[hero.act] && simRand() < sdt * 1.2) input.jump = true;
      return;
    }
    input.dir = 0; input.run = false;
    if (!demoCombo) { const pool = Wp.melee ? DCOMBO.blade : DCOMBO.fists; demoCombo = pool[Math.floor(simRand() * pool.length)]; demoCi = 0; demoStepT = 0; }
    const prev = demoCombo[demoCi - 1];
    if ((demoStepT -= sdt) > 0) { input.downHeld = !!(prev && prev.startsWith('d:')); return; }
    if (demoCi >= demoCombo.length) { demoCombo = null; demoStepT = 0.22 + simRand() * 0.25; input.downHeld = false; return; }   // a breath between strings
    const a = demoCombo[demoCi], low = a.startsWith('d:');
    if (low && hero.act !== 'squat' && !MOVES[hero.act]) { input.downHeld = true; demoStepT = 0.05; return; }   // drop into the squat first
    demoCi++; input.downHeld = low; input.attack = low ? a.slice(2) : a; demoStepT = 0.17;   // the next hit goes in on the chain
  }
  // boss arena: read the wind-ups, jump the ground slam, keep a gun at range, and clear the goons that come close first
  let demoKite = false, demoJ2 = -1;
  function demoBoss(sdt) {
    const B = enc.boss;
    input.downHeld = false;
    const Wp = WEAPONS[hero.weapon], shoot = demoShoots(Wp), sameLevel = e => Math.abs(e.y - ctl.y) < 14 * e.s;
    if (ctl.air) {   // airborne: second jump on the way over, keep shooting what is in front
      input.jumpHeld = true;
      if (demoJ2 >= 0 && (demoJ2 -= sdt) < 0) input.jump = true;
      input.fireHeld = false;
      if (shoot && enemies.some(e => !e.dead && Math.sign(e.x - ctl.x) === ctl.face && Math.abs(e.x - ctl.x) < 110)) { input.fireHeld = !!Wp.auto; if (!gun.want) input.attack = 'lp'; }
      return true;
    }
    demoJ2 = -1; input.jumpHeld = false;
    const bd = B.x - ctl.x, abd = Math.abs(bd), toward = Math.sign(bd) || ctl.face, away = -toward;
    const wall = away < 0 ? ctl.x - enc.arena.x0 : enc.arena.x1 - ctl.x;
    const hop = (dir, over) => { input.dir = dir; input.run = true; input.jump = true; input.jumpHeld = true; input.fireHeld = false; demoJ2 = over ? 0.2 : -1; demoKite = false; return true; };
    const locked = !!MOVES[hero.act] || hero.act === 'rise' || hero.act === 'hero' || hero.act === 'roll';
    // 1 · the ground slam hurts anyone standing near it: be in the air when the fists land
    if (B.act === 'slam' && !B.slammed) {
      const tHit = (0.38 - B.actT) / 0.85, sx = B.x + B.face * 20 * B.s;
      if (Math.abs(ctl.x - sx) < 120) {
        if (tHit < 0.42 && !locked) return hop(wall > 40 ? away : toward, wall <= 40);
        input.dir = 0; input.run = false;
        if (shoot && ctl.face === toward) { input.fireHeld = !!Wp.auto; if (!gun.want) input.attack = 'lp'; } else input.fireHeld = false;
        return true;
      }
    }
    // the charge and the jump-slam landing: be in the air
    if (!locked && ((B.sp === 'charge' && B.spT > 0 && Math.sign(ctl.x - B.x) === B.face && abd < 48) ||
        (B.sp === 'jslam' && B.leapt && B.vy > 0 && GROUND - B.y < 40 && Math.abs(ctl.x - (B.jx ?? B.x)) < 22))) return hop(away, false);
    if (!locked && !ctl.air && quakes.some(q => (ctl.x - q.x) * q.dir > 0 && (ctl.x - q.x) * q.dir < 26)) { input.dir = 0; input.jump = true; input.jumpHeld = true; return true; }   // a shockwave rolling in: jump it
    // 2 · a swing or its wind-up close by: back off, or go over the top when the wall is behind
    const swingR = B.reach + 18;
    if (B.act && B.act !== 'slam' && abd < swingR && !locked) {
      if (wall > 30) { input.dir = away; input.run = true; input.fireHeld = false; demoKite = true; return true; }
      if (B.actT < -0.1) return hop(toward, true);   // early in the wind-up there is time to go over the top
      input.dir = 0; input.jump = true; input.jumpHeld = true; return true;   // too late: jump straight up over the fist
    }
    // 3 · goons close by come first
    let foe = null;
    for (const e of enemies) if (!e.dead && e !== B && sameLevel(e) && Math.abs(e.x - ctl.x) < (shoot ? 75 : 55) && (!foe || Math.abs(e.x - ctl.x) < Math.abs(foe.x - ctl.x))) foe = e;
    if (foe) { demoKite = false; demoEngage(sdt, foe, Wp, false); return true; }
    // 4 · the boss: guns keep it at range, blades and fists close in for quick hits
    if (shoot) { if (abd < 52) demoKite = true; else if (abd > 88) demoKite = false; }
    else { if (B.act && abd < swingR) demoKite = true; else if (!B.act) demoKite = false; }
    if (demoKite) {
      if (wall < 45 && !B.act) return hop(toward, true);   // cornered: run at the boss and double-jump over it
      input.dir = away; input.run = true; input.fireHeld = false; return true;
    }
    if (shoot && abd > 100) { input.dir = toward; input.run = abd > 140; input.fireHeld = false; return true; }
    demoEngage(sdt, B, Wp, true);
    return true;
  }
  let demoLost = 0, demoChase = null, demoChaseT = 0;   // the weapon the demo threw and wants back; what it is walking to, and for how long
  const demoGaveUp = new WeakSet();
  function chase(o, sdt) {   // walk to a box or weapon on the floor; give up after 4 s (blocked or out of reach)
    if (demoChase !== o) { demoChase = o; demoChaseT = 0; }
    if ((demoChaseT += sdt) > 4) { demoGaveUp.add(o); demoChase = null; return false; }
    input.dir = Math.sign(o.x - ctl.x) || 1; input.run = true; input.fireHeld = false; return true;
  }
  function demoFight(sdt) {
    const Wh = WEAPONS[hero.weapon], bossOn = enc.boss && !enc.boss.dead && enc.arena;
    if (demoLost && hero.weapon === demoLost) demoLost = 0;
    if (!ctl.air && hero.mode === 'anim' && !MOVES[hero.act]) {
      const safe = x => !bossOn || Math.abs(x - enc.boss.x) > 40 * enc.boss.s / 1.75;
      const band = hero.hp < 70 && ammoBoxes.find(b => b.band && !demoGaveUp.has(b) && Math.abs(b.x - ctl.x) < 120 && Math.abs(b.y - ctl.y) < 14 && safe(b.x));
      if (band && chase(band, sdt)) return true;   // hurt: go for a bandage
      const box = ammoBoxes.find(b => !b.band && !demoGaveUp.has(b) && Math.abs(b.x - ctl.x) < (bossOn ? 220 : 90) && Math.abs(b.y - ctl.y) < 14 && safe(b.x));
      if (Wh.ammo && box && charge[hero.weapon] < Wh.ammo * (bossOn ? 0.8 : 0.6) && chase(box, sdt)) return true;   // grab ammo
      const it = demoLost && !hero.weapon && thrown.find(t => !demoGaveUp.has(t) && t.stuck && t.w === demoLost && Math.abs(t.y - ctl.y) < 14 && safe(t.x));
      const close = enemies.some(e => !e.dead && Math.abs(e.x - ctl.x) < 30 && Math.abs(e.y - ctl.y) < 14);
      if (it && !close && chase(it, sdt)) return true;   // fetch the thrown weapon
      const foe = !bossOn && hero.weapon === 1 && !done.has('throwhit') && done.has('tw') && enemies.find(e => !e.dead && Math.abs(e.y - ctl.y) < 12 && (e.x - ctl.x) * ctl.face > 35 && (e.x - ctl.x) * ctl.face < 100);
      if (foe) { input.dir = 0; input.attack = 'tw'; demoLost = 1; return true; }   // show off a throw at a goon
    }
    if (bossOn && !ctl.air && hero.mode === 'anim' && !MOVES[hero.act]) {
      const it = pocket.length < 3 && objs.find(o => o.pocket && o.safeT <= 0 && !demoGaveUp.has(o) && Math.abs(o.x - ctl.x) < 110 && Math.abs(o.x - enc.boss.x) > 40 * enc.boss.s / 1.75);
      if (it && chase(it, sdt)) return true;   // pick up what the crowd threw
      const bd = enc.boss.x - ctl.x;
      if (pocket.length && Math.abs(bd) < 150 && Math.abs(bd) > 30) { if (ctl.face !== Math.sign(bd)) { input.dir = Math.sign(bd); return true; } input.dir = 0; input.attack = 'tw'; return true; }
    }
    if (bossOn) return demoBoss(sdt);
    const Wp = WEAPONS[hero.weapon], range = demoShoots(Wp) ? 130 : 110;
    let foe = null;
    for (const e of enemies) if (!e.dead && Math.abs(e.x - ctl.x) < range && Math.abs(e.y - ctl.y) < 12 && (!foe || Math.abs(e.x - ctl.x) < Math.abs(foe.x - ctl.x))) foe = e;
    if (!foe) return false;
    demoBrawl(sdt, foe, Wp);
    return true;
  }
  // running: hop over a box or barrel in the way instead of shoving it down the level (not next to a weapon pickup)
  let demoHopT = 0;
  function demoHurdle(sdt) {
    if (demoHopT > 0) { demoHopT -= sdt; input.jumpHeld = true; return; }
    if (ctl.air || ctl.spd < 60 || MOVES[hero.act] || pickups.some(k => !k.taken && (k.x - ctl.x) * ctl.face > -20 && (k.x - ctl.x) * ctl.face < 150)) return;
    for (const o of objs) {
      const ahead = (o.x - ctl.x) * ctl.face - (o.hw || o.r);
      if (o.kind !== 'ball' && ahead > -3 && ahead < 20 && Math.abs(o.y + o.r - (ctl.y + 2)) < 4) { input.jump = true; input.jumpHeld = true; demoHopT = 0.3; return; }
    }
  }
  const demoBtn = document.getElementById('b-demo');
  function setDemo(on) {
    flags.demo = on; di = 0; dk = 0; dTry = 0; dStarted = false; demoBtn.setAttribute('aria-pressed', String(on));
    if (!on) { input.dir = 0; input.run = false; input.jumpHeld = false; input.downHeld = false; input.fireHeld = false; }
  }
  let demoWdX = 0, demoWdT = 0;   // watchdog: stuck in one spot with nobody near, move on to the next step
  // the demo (behind the title menu): he wanders the street back and forth, walking or running; goons drop in now and then and he
  // fights them with whatever he picks up on the way. It never goes up to the club roof, so there is no boss fight.
  let demoGoalX = 420, demoRunning = false, demoPauseT = 0, demoSpawnT = 2.5;
  function demoTick(sdt) {
    demoSmash = false;
    if (!flags.demo) return;
    if (hero.mode !== 'anim') { input.dir = 0; input.fireHeld = false; return; }   // knocked down: wait until the fighter is up again
    if ((demoSpawnT -= sdt) <= 0) {   // a goon or two now and then, from off screen on either side
      demoSpawnT = 3 + simRand() * 5;
      if (!flags.club && enemies.filter(e => !e.dead).length < 3) for (let k = 0, n = simRand() < 0.4 ? 2 : 1; k < n; k++) {
        const side = simRand() < 0.5 ? -1 : 1, x = clamp(ctl.x + side * (cam.vw / 2 + 20 + k * 18), 40, STREET_END - 60);
        const g = spawnEnemy('goon', x, 1 + Math.floor(simRand() * 5)); g.cdT = Math.max(g.cdT, 0.8);
      }
    }
    if (ctl.carry && !MOVES[hero.act] && hero.act !== 'rise') { input.dir = 0; input.attack = 'hp'; return; }   // something in hand: throw it
    if (demoFight(sdt)) return;   // a goon close by: deal with him first
    input.jumpHeld = false; input.downHeld = false; input.fireHeld = false;
    const dx = demoGoalX - ctl.x;
    if (Math.abs(dx) < 8 || (demoPauseT > 0)) {   // there: look about for a moment, then pick the next spot along the street
      input.dir = 0;
      if ((demoPauseT += sdt) > 0.8) { demoPauseT = 0; demoGoalX = 140 + simRand() * (2100 - 140); demoRunning = simRand() < 0.5; }
      return;
    }
    input.dir = Math.sign(dx); input.run = demoRunning && Math.abs(dx) > 40;
    if (input.run) demoHurdle(sdt);   // hop what is in the way at a run
  }


  // ---------- rendering ----------
  // ===== [G4] pixel style =====
  // the fighter is drawn from D, not P: per-joint hysteresis, squash and stretch, smears, optional 12 fps hold. Visual only.
  const HYST = 0.6, TELE = 30, SQ_Y = 0.035, SQ_X = 0.1, T_UP = 0.12, T_LAND = 0.1, SMEAR_V = 180, SMEAR_L = 8, BLADE_V = 240, LOFI = 1 / 12;
  const D = P.map(p => ({ x: p.x, y: p.y })), Dh = P.map(p => ({ x: p.x, y: p.y })), Dp = P.map(p => ({ x: p.x, y: p.y }));
  let Dg = null, Dlook = 'ok', Dface = 1, dT0 = -1, dAir = false, sqT = -9, sqK = 0, smear = null, bSmear = null, lofi = false;
  const lofiBtn = document.getElementById('b-lofi');
  const toggleLofi = () => { lofi = !lofi; lofiBtn.setAttribute('aria-pressed', String(lofi)); };
  function geomAt(J) {   // weaponGeom with the hand (and a held gun) moved onto the drawn pose; P is restored
    const ei = wBack() ? 3 : 5, hi = ei + 1, e = P[ei], h = P[hi], sv = [e.x, e.y, h.x, h.y], gp = gunPose, gs = gp && [gp.bx, gp.by];
    if (gp) { gp.bx += J[6].x - h.x; gp.by += J[6].y - h.y; }
    e.x = J[ei].x; e.y = J[ei].y; h.x = J[hi].x; h.y = J[hi].y;
    const g = weaponGeom();
    [e.x, e.y, h.x, h.y] = sv; if (gp) [gp.bx, gp.by] = gs;
    return g;
  }
  function poseTick(look, face) {   // called once per render; returns the held look and face
    if (lofi && dT0 >= 0 && simTime - dT0 < LOFI) return [Dlook, Dface];
    const dt = dT0 < 0 ? 0 : simTime - dT0; dT0 = simTime;
    let tele = false; const tl = TELE + 600 * dt;   // a jump this far is a teleport or reset: no hysteresis, no smear
    for (let i = 0; i < P.length; i++) if (Math.abs(P[i].x - Dh[i].x) > tl || Math.abs(P[i].y - Dh[i].y) > tl) tele = true;
    for (let i = 0; i < P.length; i++) {   // a joint's drawn position moves only when physics leaves it by > HYST px
      const p = P[i], q = Dh[i];
      if (tele || Math.abs(p.x - q.x) > HYST) q.x = p.x;
      if (tele || Math.abs(p.y - q.y) > HYST) q.y = p.y;
    }
    if (hero.mode !== 'anim' || tele) sqT = -9;
    else if (ctl.air !== dAir && (!ctl.air || ctl.vu > 0)) { sqT = simTime; sqK = ctl.air ? 1 : -1; }   // takeoff stretch, landing squash
    dAir = ctl.air;
    const u = simTime - sqT, T = sqK > 0 ? T_UP : T_LAND, e = hero.mode === 'anim' && u < T ? 1 - u / T : 0;
    const sy = 1 + sqK * SQ_Y * e, sx = 1 - sqK * SQ_X * e, cx = Dh[2].x, fy = ctl.y;
    for (let i = 0; i < P.length; i++) { D[i].x = cx + (Dh[i].x - cx) * sx; D[i].y = fy + (Dh[i].y - fy) * sy; }
    const g = geomAt(D), m = hero.mode === 'anim' && !tele && dt > 0 && MOVES[hero.act];
    smear = bSmear = null;
    if (m && hero.actT < m.win[1] + 0.06 && hero.actT >= m.win[0] - 0.05) {   // only the strike itself smears, not the wind-up
      if (m.limb) {   // fast hand/foot: stretch it back toward where it was drawn last
        const li = m.limb, a = D[li], b = Dp[li], d = Math.hypot(b.x - a.x, b.y - a.y), q = P[li];
        if (d > 1.5 && Math.max(d / dt, Math.hypot(q.x - q.px, q.y - q.py) / DT) > SMEAR_V) { const k = Math.min(1, SMEAR_L / d); smear = { li, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }; }
      } else if (m.blade && WEAPONS[hero.weapon].melee && g && Dg) {   // fast blade: a wedge from the last tip to this one
        const d = Math.hypot(g.tx - Dg.tx, g.ty - Dg.ty);
        if (d / dt > BLADE_V && d < 60) bSmear = { x: g.x, y: g.y, ax: Dg.tx, ay: Dg.ty, bx: g.tx, by: g.ty, len: g.len };
      }
    }
    for (let i = 0; i < P.length; i++) { Dp[i].x = D[i].x; Dp[i].y = D[i].y; }
    Dg = g; Dlook = look; Dface = face;
    return [look, face];
  }
  function smearAt(li, r, c) {   // tapered stretch from the joint to the smear tail: outline pass before the limb, fill pass after
    if (!smear || smear.li !== li) return;
    const a = D[li], n = Math.max(1, Math.ceil(Math.hypot(smear.x - a.x, smear.y - a.y)));
    for (let i = n; i >= 0; i--) { const t = i / n; disc(snap(a.x + (smear.x - a.x) * t), snap(a.y + (smear.y - a.y) * t), r * (1 - 0.5 * t), c); }
  }
  function bladeSmear() {   // filled wedge hand, last tip, tip; only its outer part, so it reads as the swept edge
    const w = bSmear; if (!w) return;
    const xs = [w.x, w.ax, w.bx], ys = [w.y, w.ay, w.by];
    const ed = (x0, y0, x1, y1, x, y) => (x1 - x0) * (y - y0) - (y1 - y0) * (x - x0);
    const ar = ed(w.x, w.y, w.ax, w.ay, w.bx, w.by); if (Math.abs(ar) < 1) return;
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++)
      for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
        const px = x + 0.5, py = y + 0.5;
        const e0 = ed(w.x, w.y, w.ax, w.ay, px, py) * ar, e1 = ed(w.ax, w.ay, w.bx, w.by, px, py) * ar, e2 = ed(w.bx, w.by, w.x, w.y, px, py) * ar;
        if (e0 < 0 || e1 < 0 || e2 < 0) continue;
        const r = Math.hypot(px - w.x, py - w.y);
        if (r > w.len * 0.5) plot(x, y, r > w.len * 0.8 ? PAL.blade : PAL.bladeD);
      }
  }
  // ===== [/G4] =====
  function drawLeg(h, k, f, pc, face) {
    const [dx, dy] = norm(f.x - k.x, f.y - k.y);
    const tx = f.x + dy * 2.5 * face + dx * 0.5, ty = f.y - dx * 2.5 * face + dy * 0.5;
    seg(h.x, h.y, k.x, k.y, 2.5, PAL.out); seg(k.x, k.y, f.x, f.y, 2.5, PAL.out); seg(f.x, f.y, tx, ty, 2.5, PAL.out);
    seg(h.x, h.y, k.x, k.y, 1.5, pc); seg(k.x, k.y, f.x, f.y, 1.5, pc); seg(f.x, f.y, tx, ty, 1.5, PAL.shoe);
  }
  function drawArm(s, e, h, upc, lowc, handc = lowc) {
    seg(s.x, s.y, e.x, e.y, 2.2, PAL.out); seg(e.x, e.y, h.x, h.y, 2.2, PAL.out);
    seg(s.x, s.y, e.x, e.y, 1.2, upc); seg(e.x, e.y, h.x, h.y, 1.2, lowc);
    if (handc !== lowc) plot(Math.floor(e.x + (h.x - e.x) * 0.78), Math.floor(e.y + (h.y - e.y) * 0.78), PAL.collar);   // shirt cuff
    disc(snap(h.x), snap(h.y), 1.5, handc);
  }
  function drawHead(hd, nk, face, look) {
    const cx = snap(hd.x), cy = snap(hd.y);
    const [dx, dy] = norm(nk.x - hd.x, nk.y - hd.y);
    const fx = dy * face, fy = -dx * face, ux = -dx, uy = -dy;
    // rectangular head in its own frame: fw toward the face, up toward the crown; square jaw, flat top
    const HW = 3.6, HU = 4.6, HD = 4.0, R = 6;
    for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++)
      for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
        const rx = x + 0.5 - cx, ry = y + 0.5 - cy, up = rx * ux + ry * uy, fw = rx * fx + ry * fy;
        if (Math.abs(fw) > HW + 1 || up > HU + 1 || up < -HD - 1) continue;
        if (Math.abs(fw) > HW || up > HU || up < -HD) { plot(x, y, PAL.out); continue; }
        // a man's head: dark hair swept back off the brow, a square jaw with short stubble, a thin mustache, sideburns into the stubble
        const hairy = up > 2.9 - Math.max(0, -fw) * 0.7 || fw < -1.6 || (fw < 0.2 && up > 1.4);
        const stache = fw > 1.5 && up > -1.6 && up < -0.8;
        const burn = fw < -0.4 && up < 1.4 && up > -1.4;
        const stub = up < -2.3 || (fw < 0.2 && up < -1.2);   // stubble along the jaw line and the chin only
        plot(x, y, hairy ? (up > 3.9 && fw > -1.2 ? PAL.hairL : PAL.hair) : stache ? PAL.hairD : burn ? PAL.hair : stub ? ((x + y) & 1 ? PAL.stub : PAL.skinB) : PAL.skin);
      }
    const ex = Math.floor(cx + fx * 2.2 + ux * 0.6), ey = Math.floor(cy + fy * 2.2 + uy * 0.6);
    plot(ex, ey, PAL.out);
    plot(Math.floor(cx + fx * 2.2 + ux * 1.7), Math.floor(cy + fy * 2.2 + uy * 1.7), PAL.hairD); plot(Math.floor(cx + fx * 3.1 + ux * 1.6), Math.floor(cy + fy * 3.1 + uy * 1.6), PAL.hairD);   // a heavy brow
    plot(Math.floor(cx + fx * 3.9 + ux * 0.3), Math.floor(cy + fy * 3.9 + uy * 0.3), PAL.skinB);   // the nose
    if (look === 'ko') { plot(ex - 1, ey - 1, PAL.out); plot(ex + 1, ey + 1, PAL.out); plot(ex + 1, ey - 1, PAL.out); plot(ex - 1, ey + 1, PAL.out); }
    if (look !== 'ok') plot(Math.floor(cx + fx * 2 - ux * 3), Math.floor(cy + fy * 2 - uy * 3), PAL.out);
  }
  function drawCharacter(look, face) {
    const [hd, nk, pl, eB, hB, eF, hF, kB, fB, kF, fF] = D;
    smearAt(8, 2.5, PAL.out); drawLeg(pl, kB, fB, PAL.pantsB, face); smearAt(8, 1.5, PAL.shoe);
    smearAt(4, 2.2, PAL.out); drawArm(nk, eB, hB, PAL.shirtB, PAL.shirtB, PAL.skinB); smearAt(4, 1.2, PAL.shirtB);
    const bw = wBack(); if (bw) drawWeapon();   // a blade in the back hand passes behind the body
    if (tails) {   // [feel] suit-jacket flaps: the cloth strips at the back of the waist, drawn as the jacket hem
      const ox = D[2].x - P[2].x, oy = D[2].y - P[2].y;
      for (const pass of [0, 1]) for (const t of tails) for (let i = 1; i < t.length; i++)
        seg(t[i - 1].x + ox, t[i - 1].y + oy, t[i].x + ox, t[i].y + oy, (pass ? 1.1 : 2.1) - i * 0.25, pass ? PAL.shirt : PAL.out);
    }
    const mx = nk.x + (pl.x - nk.x) * 0.72, my = nk.y + (pl.y - nk.y) * 0.72, sx = nk.x + (pl.x - nk.x) * 0.3, sy = nk.y + (pl.y - nk.y) * 0.3;
    seg(nk.x, nk.y, sx, sy, 4.0, PAL.out); seg(sx, sy, pl.x, pl.y, 3.4, PAL.out);   // a man's build: broad in the shoulders, narrow in the hips
    seg(nk.x, nk.y, sx, sy, 3.0, PAL.shirt); seg(sx, sy, mx, my, 2.5, PAL.shirt); seg(mx, my, pl.x, pl.y, 2.3, PAL.pants);
    {   // a 1-px warm rim on the side of the suit that faces the nearest light (a street lamp, or a club spot)
      const lxs = flags.club ? clubSpots().map(q => q.x) : LAMPS; let lx = lxs[0]; for (const q of lxs) if (Math.abs(q - nk.x) < Math.abs(lx - nk.x)) lx = q;
      const rd = lx > nk.x ? 1 : -1, [tx, ty] = norm(pl.x - nk.x, pl.y - nk.y), ox = ty * rd * 1.5, oy = -tx * rd * 1.5;
      seg(nk.x + ox, nk.y + oy + 1, mx + ox, my + oy, 0.8, PAL.shirtL); seg(mx + ox, my + oy, pl.x + ox * 0.8, pl.y + oy * 0.8, 0.6, PAL.rim);
    }
    smearAt(10, 2.5, PAL.out); drawLeg(pl, kF, fF, PAL.pants, face); smearAt(10, 1.5, PAL.shoe);
    drawSecondary(face);
    const ox = hd.x - P[0].x, oy = hd.y - P[0].y;   // keep the hair rooted to the drawn head
    for (const st of hair) for (let i = 1; i < st.length; i++) seg(st[i - 1].x + ox, st[i - 1].y + oy, st[i].x + ox, st[i].y + oy, 2.3, PAL.out);
    hair.forEach((st, k) => { for (let i = 1; i < st.length; i++) seg(st[i - 1].x + ox, st[i - 1].y + oy, st[i].x + ox, st[i].y + oy, 1.4, k === 0 ? PAL.hairL : PAL.hair); });
    drawHead(hd, nk, face, look);
    if (!bw) drawWeapon();
    smearAt(6, 2.2, PAL.out); drawArm(nk, eF, hF, PAL.shirt, PAL.shirt, PAL.skin); smearAt(6, 1.2, PAL.shirt);
  }
  function drawWeapon() {
    const g = Dg; if (!g || !WEAPONS[hero.weapon].len) return;
    bladeSmear();
    drawWeaponShape(WEAPONS[hero.weapon].id, g, gun.pumpT >= 0.3 ? Math.sin(Math.PI * (gun.pumpT - 0.3) / 0.7) : 0);
  }
  function drawWeaponShape(id, g, pumpK) {
    const { x, y, dx, dy, s } = g, px = -dy * s, py = dx * s;   // px/py: the edge side, or "below" for guns
    const at = (d, o = 0) => [x + dx * d + px * o, y + dy * d + py * o];
    const S = (a, b, r, c) => seg(a[0], a[1], b[0], b[1], r, c), Ln = (a, b, c) => line1(a[0], a[1], b[0], b[1], c);
    if (id === 'katana') {
      if (Math.hypot(dx, dy) < 0.3) { disc(snap(x), snap(y), 1.2, PAL.out); plot(Math.floor(x), Math.floor(y) - 1, PAL.white); return; }   // edge-on: a glint
      S(at(-3), at(g.len), 1.4, PAL.out);
      Ln(at(-3), at(0), PAL.hilt); Ln(at(1), at(g.len), PAL.blade); Ln(at(3, 0.8), at(g.len - 1, 0.8), PAL.bladeD);
      Ln(at(0.8, -1.3), at(0.8, 1.3), PAL.gold);
    } else if (id === 'axe') {
      S(at(-2), at(g.len), 1.3, PAL.out); Ln(at(-2), at(g.len), PAL.wood);
      S(at(g.len - 2.5, 1), at(g.len - 2.5, 4.5), 2.1, PAL.out);
      S(at(g.len - 2.5, 1), at(g.len - 2.5, 4), 1.2, PAL.steel);
      Ln(at(g.len - 4.5, 5), at(g.len - 0.5, 5), PAL.blade);
    } else if (id === 'shotgun') {   // x, y is the butt of the stock
      const pump = WEAPONS[3].forend - 3 * pumpK;
      S(at(0, 0.4), at(g.len), 1.8, PAL.out);
      S(at(0, 0.6), at(4.5, 0.2), 1.3, PAL.wood); S(at(4.5), at(7.5), 1.2, PAL.gunM); Ln(at(7.5, -0.3), at(g.len, -0.3), PAL.gunD);
      S(at(pump - 1.8, 1.2), at(pump + 1.8, 1.2), 1, PAL.wood); plot(Math.floor(at(4, 1.8)[0]), Math.floor(at(4, 1.8)[1]), PAL.out);
    } else {
      S(at(0, 0.4), at(g.len), 1.9, PAL.out); S(at(7.5, 1.5), at(8.5, 5.2), 1.9, PAL.out);
      S(at(0, 0.5), at(4), 1.2, PAL.gunD); S(at(4), at(12), 1.4, PAL.gunM); Ln(at(12), at(g.len), PAL.gunD);
      S(at(7.5, 1.5), at(8.5, 4.6), 1, PAL.gunD); Ln(at(5, -1.4), at(11, -1.4), PAL.steel); plot(Math.floor(at(g.len, -0.8)[0]), Math.floor(at(g.len, -0.8)[1]), PAL.steel);
    }
  }
  function drawBag() {
    const [A, Cn, T, B] = bag;
    line1(A.x, A.y, Cn.x, Cn.y, PAL.chain); line1(Cn.x, Cn.y, T.x, T.y, PAL.chain);
    const [dx, dy] = norm(B.x - T.x, B.y - T.y);
    seg(T.x, T.y, B.x, B.y, BAG_R, PAL.out);
    seg(T.x, T.y, B.x, B.y, BAG_R - 1, bagFlash > 0 ? PAL.white : PAL.bag);
    if (bagFlash > 0) return;
    seg(T.x, T.y, T.x + dx * 2, T.y + dy * 2, BAG_R - 1, PAL.bagD);
    seg(B.x - dx * 2, B.y - dy * 2, B.x, B.y, BAG_R - 1, PAL.bagD);
    line1(T.x + dx * 4 - dy * 2, T.y + dy * 4 + dx * 2, B.x - dx * 4 - dy * 2, B.y - dy * 4 + dx * 2, PAL.bagL);
  }
  function drawTramp() {
    for (const T of TRAMPS) {
      const d = T.squish > 0 ? 3 * Math.sin(Math.PI * T.squish / 0.18) : 0;
      for (let x = T.x0; x <= T.x1; x++) {
        const y = Math.round(T.y + d * Math.sin(Math.PI * (x - T.x0) / (T.x1 - T.x0)));
        plot(x, y - 1, PAL.out); plot(x, y, (x - T.x0) % 4 === 1 ? C('#6a7a9a') : C('#cfc6b0')); plot(x, y + 1, (x - T.x0) % 4 === 1 ? C('#55638a') : C('#9a9280'));
      }
    }
  }
  function crack(o, lx, ly) {   // jagged cracks grow as the box loses hit points
    const dmg = o.maxHp ? 1 - o.hp / o.maxHp : 0;
    if (dmg > 0.3 && Math.abs(lx + 1 - Math.abs(ly - 1) * 0.8 + (ly > 2 ? 1 : 0)) < 0.5 && ly < 1 + dmg * 4) return true;
    if (dmg > 0.6 && Math.abs(ly - 1.5 + Math.abs(lx + 0.5) * 0.7) < 0.5 && lx > -1) return true;
    return false;
  }
  function drawObj(o) {
    const ca = Math.cos(o.a), sa = Math.sin(o.a), R = Math.ceil(o.r + 2), cx = Math.floor(o.x), cy = Math.floor(o.y);
    for (let y = cy - R; y <= cy + R; y++) for (let x = cx - R; x <= cx + R; x++) {
      const dx = x + 0.5 - o.x, dy = y + 0.5 - o.y;
      const lx = dx * ca + dy * sa, ly = -dx * sa + dy * ca;   // pixel in the object's own frame
      let c;
      if (o.kind === 'stack') {
        const top = ly < 0, cy2 = ly + (top ? 6 : -6), m = Math.max(Math.abs(lx), Math.abs(cy2));
        if (Math.abs(lx) > o.hw + 0.5 || Math.abs(ly) > o.r + 0.5) continue;
        c = m > 5.5 ? PAL.out : crack(o, lx, cy2) ? PAL.out : m > 4.3 || Math.abs(top ? lx - cy2 : lx + cy2) < 0.9 ? PAL.crateD : PAL.crate;
      } else if (o.kind === 'crate' || o.kind === 'bigcrate') {
        const hs = o.r + 0.5, m = Math.max(Math.abs(lx), Math.abs(ly));
        if (m > hs) continue;
        c = m > hs - 1 ? PAL.out : crack(o, lx, ly) ? PAL.out : m > hs - 2.2 || Math.abs(lx - ly) < 0.9 ? PAL.crateD : PAL.crate;
      } else if (o.kind === 'can') {
        if (Math.abs(lx) > 1.5 || Math.abs(ly) > 2.5) continue;
        c = Math.abs(ly) > 1.6 ? C('#c8ccd8') : lx < 0 ? C('#c0302a') : C('#e04a3a');
      } else if (o.kind === 'bottle') {
        if (Math.abs(lx) > (ly < -1 ? 0.6 : 1.4) || Math.abs(ly) > 3.5) continue;
        c = ly < -2.5 ? C('#c9a24a') : C('#2f7a3e');
      } else if (o.kind === 'knife') {
        if (Math.abs(ly) > 0.6 || Math.abs(lx) > 3.5) continue;
        c = lx > -0.8 ? C('#d8dee8') : C('#3a2230');
      } else if (o.kind === 'barrel') {
        if (Math.abs(lx) > 4.5 || Math.abs(ly) > 5.5) continue;
        c = Math.abs(lx) > 3.5 || Math.abs(ly) > 4.5 ? PAL.out : Math.abs(Math.abs(ly) - 2.6) < 0.6 ? PAL.hoop : lx < -1.8 ? PAL.barrelL : PAL.barrel;
      } else if (o.kind === 'bin') {   // a galvanised dustbin with a domed lid and ribs
        const lid = ly < -3.2 && Math.abs(lx) <= 5 - (ly < -4.5 ? 1 : 0);
        if (Math.abs(lx) > 4.5 && !lid || Math.abs(ly) > 5.5) continue;
        c = Math.abs(ly) > 4.5 || (!lid && Math.abs(lx) > 3.5) || (lid && (Math.abs(lx) > 4 || ly < -5)) ? PAL.out : lid ? (Math.abs(lx) < 0.7 && ly < -4 ? PAL.out : PAL.binL) : ly < -2.5 ? PAL.out : ((Math.floor(lx + 4) % 2) ? PAL.bin : PAL.binL);
      } else if (o.kind === 'bag') {   // a pile of black bin bags: a lumpy blob with a knot and a few shiny folds
        const e = (lx / 4.8) ** 2 + ((ly + 0.3) / 4.2) ** 2, knot = Math.abs(lx - 1) < 1 && ly < -3.6 && ly > -5.4;
        if (e > 1.2 && !knot) continue;
        c = e > 0.82 || knot && ly < -4.8 ? PAL.out : ((Math.floor(lx + ly * 0.5) + 8) % 4 === 0 && ly < 0.5 ? PAL.bagS : PAL.bag);
      } else if (o.kind === 'chair') {   // a bentwood cafe chair: seat, back, two legs (drawn with a 1-px outline test)
        const shp = (ax, ay) => Math.abs(ax) <= 4.2 && Math.abs(ay + 0.5) <= 1 ? PAL.chairL : ax > 2.6 && ax <= 4.2 && ay < -0.5 && ay > -5.2 || ax > 0.5 && ay < -4 && ay > -5.2 ? PAL.chair : Math.abs(Math.abs(ax) - 3.5) < 0.7 && ay > 0.5 && ay <= 5 ? PAL.chair : 0;
        c = shp(lx, ly);
        if (!c) { if (shp(lx + 1, ly) || shp(lx - 1, ly) || shp(lx, ly + 1) || shp(lx, ly - 1)) c = PAL.out; else continue; }
      } else if (o.kind === 'cone') {   // a traffic cone with a white band
        const tri = ly >= -4.5 && ly <= 3 && Math.abs(lx) <= (ly + 4.5) * 0.5 + 0.8, base = ly > 3 && ly <= 4.5 && Math.abs(lx) <= 4.5;
        if (!tri && !base) continue;
        c = base ? (ly > 3.6 || Math.abs(lx) > 3.5 ? PAL.out : PAL.cone) : Math.abs(lx) > (ly + 4.5) * 0.5 - 0.2 || ly < -3.8 ? PAL.out : Math.abs(ly + 0.5) < 1 ? PAL.coneL : PAL.cone;
      } else {
        const d2 = dx * dx + dy * dy;
        if (d2 > (o.r + 0.8) ** 2) continue;
        c = d2 > (o.r - 0.3) ** 2 ? PAL.out : Math.abs(ly) < 0.8 ? PAL.white : PAL.ball;
      }
      plot(x, y, o.flash > 0 && c !== PAL.out ? PAL.white : c);
    }
  }
  // a goon or the boss off the edge of the view: a small arrow on that edge, at its height
  function drawOffscreen() {
    for (const e of enemies) {
      if (e.dead) continue;
      const sx = e.x - cam.x, side = sx < 0 ? -1 : sx >= cam.vw ? 1 : 0;
      if (!side || Math.abs(sx - cam.vw / 2) > 380) continue;
      const tip = side < 0 ? 0 : cam.vw - 1, vy = Math.round(clamp(e.y - 14 * e.s - cam.y, 4, cam.vh - 5)), c = e === enc.boss ? PAL.gold : BLOOD[2];
      for (let k = 0; k < 4; k++) for (let j = -k; j <= k; j++) {
        const vx = tip - side * (k + 1);
        plotV(vx, vy + j, k === 3 || Math.abs(j) === k ? PAL.out : c);
      }
    }
  }
  function drawShadow() {
    const s = floorBelow(D[2].x, D[2].y, 0), h = s.y - D[2].y; if (h > 170) return;   // the shadow follows him up high jumps, shrinking
    let lo = W, hi = 0; for (const p of D) { lo = Math.min(lo, p.x); hi = Math.max(hi, p.x); }
    const shrink = Math.min(1, h / 140) * (hi - lo) / 2 * 0.85, y = s === GROUND_S ? GROUND + 1 : s.y + 1, c = s === GROUND_S ? PAL.shadow : PAL.plankD;
    for (let x = Math.max(Math.floor(lo - 2 + shrink), s.x0); x <= Math.min(Math.ceil(hi + 2 - shrink), s.x1); x++) plot(x, y, c);
  }
  // ---------- the club: balcony door, fade, door slam ----------
  let clubT = 0, fade = 0, fadeDir = 0, slamDone = false;
  let bossBarK = 1, cardT = 0;   // the boss bar's fill, the name card's time left
  const cardEl = document.getElementById('card');
  function enterClub() {
    const dx = DOOR_X + 16 - ctl.x, dy = GROUND - 2 - ctl.y;
    flags.club = true; clubT = 0; slamDone = false;
    Object.assign(ctl, { x: ctl.x + dx, y: ctl.y + dy, face: 1, spd: 0, air: false, vu: 0, jumps: 0, flipT: -1, spin: 0, surf: GROUND_S, bounces: 0, tramp: false });
    hero.act = null; queued = null;
    for (const p of P) { p.x += dx; p.px += dx; p.y += dy; p.py += dy; }
    for (const st of hair) for (const p of st) { p.x += dx; p.px += dx; p.y += dy; p.py += dy; }
    if (tails) for (const t of tails) for (const p of t) { p.x += dx; p.px += dx; p.y += dy; p.py += dy; }
    cam.xf = CLUB_X; cam.yf = GROUND - 120; cam.v.x = cam.v.y = cam.v.z = 0;
    rain.drops.length = 0; rain.splash.length = 0;
    emit('section:enter', isP9() ? { from: 'bay', to: 'hall' } : { from: 'street', to: 'club' });
  }
  function clubTick(rdt) {
    if (isP9() && !flags.club && fadeDir === 0 && hero.mode === 'anim' && p9.shutter >= 1 && !ctl.air && ctl.x >= P9.MARKET.shutter[0] + 26) fadeDir = 1;   // through the open shutter into the hall
    if (!flags.club && fadeDir === 0 && hero.mode === 'anim' && ctl.surf === GOAL && !ctl.air && ctl.x >= KIOSK_X - 4 && (flags.demo || stageDone(ZONES.length - 2))) { fadeDir = 1; emit('feat', 'enter'); }   // walk through the side door (once stage 7 is done)
    if (fadeDir === 1) { input.dir = 1; if ((fade += rdt * 2.2) >= 1) { fade = 1; enterClub(); fadeDir = -1; } }
    else if (fadeDir === -1 && (fade -= rdt * 1.6) <= 0) { fade = 0; fadeDir = 0; }
    if (flags.club) {
      clubT += rdt;
      if (!slamDone && clubT > 0.75) {   // the door slams shut behind him
        slamDone = true; if (!reduceMotion) cam.shake = Math.max(cam.shake, 0.3);
        dust(DOOR_X + 4, GROUND - 1, 8); sparks.push({ x: DOOR_X + 8, y: GROUND - 20, t: 0.05 });
      }
      if (enc.introT >= 0) {   // the entrance, 1.7 s: spot and walk, the name card at 0.5 s, the boss bar fills from 0.7 s, then the fight
        if (!menuShown) enc.introT += rdt;   // (the pause menu stops the entrance's clock too)
        if (enc.introT > 0.5 && cardT <= 0 && cardEl.hidden && !(isP9() && p9.bossDlg)) { cardEl.innerHTML = isP9() ? `<b>${P9.MARCHETTI.name}</b><small>${P9.MARCHETTI.title}</small>` : `<b>${BOSS_NAME}</b><small>Owner of Club Noir</small>`; cardEl.hidden = false; cardT = 3.2; toastEl.hidden = true; toastT = 0; }
        // Pier 9: he walks out to his mark (at most 4.5 s), the portrait dialog plays, and the fight starts when it closes
        if (isP9() && !p9.bossDlg && !menuShown && enc.boss && (Math.abs(enc.boss.x - enc.boss.introX) <= 3 || enc.introT > 4.5)) {
          p9.bossDlg = true; cardEl.hidden = true; cardT = 0;
          playScene('dialog', 'marchetti_intro').then(() => { if (p9.bossDlg) p9.dlgDone = true; });
        }
        bossBarK = clamp((enc.introT - 0.7) / 1, 0, 1);
        if ((isP9() ? p9.dlgDone : enc.introT >= 1.7) || !enc.boss || enc.boss.dead) {
          enc.introT = -1; bossBarK = 1; enc.spawnT = 3;
          if (enc.boss) { enc.boss.intro = false; enc.boss.cdT = 0.6; }
          for (const d of dancers) if (d.home0 != null) { d.home = d.home0; d.home0 = null; }
        }
      }
    }
  }
  // a door a goon just came through: a house door open on a lit hall with light on the pavement, a car door swung open, a lit staff doorway in the club
  function drawSpawnFx() {
    // the door is in the wall: anything parked or standing in front of it (a van, a lamp post, the scaffold) stays in front
    const front = (x, y) => x >= 0 && y >= 0 && x < W && y < H && PROPS[y * W + x];
    const plotB = (x, y, c) => { if (!front(x, y)) plot(x, y, c); }, blendB = (x, y, r, g, b, a) => { if (!front(x, y)) blendPlot(x, y, r, g, b, a); };
    for (const f of spawnFx) {
      if (f.t > 0.4) continue;
      const warm = WIN_B;
      if (f.kind === 'door') {
        const d = f.d;
        for (let y = d.y0; y < GROUND; y++) for (let x = d.x0; x <= d.x1; x++) plotB(x, y, x === d.x0 || x === d.x1 ? C('#2a1a12') : (x + y) % 7 === 0 ? WIN_A : warm);
        for (let k = 0; k <= 5; k++) for (let x = d.x0 - k; x <= d.x1 + k; x++) blendB(x, GROUND + k, 240, 180, 90, 0.4 * (1 - k / 6));
      } else if (f.kind === 'car') {
        const d = f.d;
        for (let y = d.y0; y < d.y1; y++) for (let x = d.x0; x <= d.x1; x++) plot(x, y, x === d.x1 || y === d.y0 || y === d.y1 - 1 ? PAL.out : d.col);
        for (let y = d.y0 + 1; y < d.y1 - 1; y++) plot(d.x0 - 1, y, C('#3a2e22'));   // the dark cabin behind the open door
      } else if (f.kind === 'club') {
        for (let y = GROUND - 50; y < GROUND - 7; y++) for (let x = f.x - 6; x <= f.x + 5; x++) plot(x, y, x === f.x - 6 || x === f.x + 5 || y === GROUND - 50 ? PAL.out : (x + y) % 5 === 0 ? C('#e0803a') : C('#b05a28'));
        for (let k = 0; k <= 4; k++) for (let x = f.x - 6 - k; x <= f.x + 5 + k; x++) blendPlot(x, GROUND - 7 + k, 230, 130, 60, 0.35 * (1 - k / 5));
      }
    }
  }
  function drawDoor() {
    if (!flags.club) return;
    if (isP9()) {   // the market's shutter, seen from the hall: it rolls down behind him
      const k = clamp((clubT - 0.45) / 0.3, 0, 1), y1 = GROUND - 50 + Math.round(50 * k);
      for (let y = GROUND - 50; y < GROUND; y++) for (let x = DOOR_X - 12; x < DOOR_X; x++) plot(x, y, y < y1 ? ((y - (GROUND - 50)) % 3 === 0 ? C('#4e4a46') : C('#76706a')) : x === DOOR_X - 12 ? PAL.out : C('#8a8c92'));
      for (let x = DOOR_X - 14; x <= DOOR_X + 1; x++) plot(x, GROUND - 52, C('#3a3c44'));
      return;
    }
    const k = clamp((clubT - 0.45) / 0.3, 0, 1), w = Math.round(2 + 10 * k * k);   // the panel swings shut toward us
    for (let y = GROUND - 36; y < GROUND; y++) for (let x = DOOR_X - 10; x < DOOR_X; x++) plot(x, y, x === DOOR_X - 10 ? PAL.out : C('#120c18'));   // the dark doorway
    for (let y = GROUND - 36; y < GROUND; y++) for (let x = DOOR_X - w; x < DOOR_X; x++)
      plot(x, y, x === DOOR_X - w || x === DOOR_X - 1 || y === GROUND - 36 ? PAL.out : y === GROUND - 20 ? C('#8a8c99') : C('#4a2e2a'));
    for (let x = DOOR_X - 12; x <= DOOR_X + 1; x++) plot(x, GROUND - 38, NEON_V);   // EXIT-style tube over the door
  }

  // ---------- the rooftop sign: CLUB NOIR in neon tubes, a border of chasing bulbs, searchlights ----------
  const GLYPH = {
    C: [[6,0,0,0],[0,0,0,9],[0,9,6,9]], L: [[0,0,0,9],[0,9,6,9]], U: [[0,0,0,9],[0,9,6,9],[6,9,6,0]],
    B: [[0,0,0,9],[0,0,5,0],[5,0,6,1],[6,1,6,3],[6,3,5,4],[5,4,0,4],[5,4,6,5],[6,5,6,8],[6,8,5,9],[5,9,0,9]],
    N: [[0,9,0,0],[0,0,6,9],[6,9,6,0]], O: [[0,0,6,0],[6,0,6,9],[6,9,0,9],[0,9,0,0]], I: [[3,0,3,9],[1,0,5,0],[1,9,5,9]], R: [[0,9,0,0],[0,0,6,0],[6,0,6,4],[6,4,0,4],[2,4,6,9]],
  };
  const SIGN = { x0: 2176, x1: 2330, y0: GOAL.y - 100, y1: GOAL.y - 60 };   // 2.7 m clear above the roof: the hero walks under it
  function drawSign() {
    if (isP9()) return;
    if (flags.club || cam.x > SIGN.x1 + 40 || cam.x + cam.vw < SIGN.x0 - 40) return;
    const t = simTime, { x0, x1, y0, y1 } = SIGN;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) plot(x, y, x === x0 || x === x1 || y === y0 || y === y1 ? PAL.out : x === x0 + 1 || x === x1 - 1 || y === y0 + 1 || y === y1 - 1 ? C('#3a3a48') : C('#160d1c'));
    let k = 0;   // chasing bulbs round the frame
    const bulb = (x, y) => { plot(x, y, (k++ + Math.floor(t * 10)) % 3 === 0 ? NEON_Y : C('#5a4a22')); };
    for (let x = x0 + 3; x <= x1 - 3; x += 4) bulb(x, y0 + 3);
    for (let y = y0 + 7; y <= y1 - 3; y += 4) bulb(x1 - 3, y);
    for (let x = x1 - 7; x >= x0 + 3; x -= 4) bulb(x, y1 - 3);
    for (let y = y1 - 7; y >= y0 + 7; y -= 4) bulb(x0 + 3, y);
    const word = (str, x, y, c, sc, flick) => {
      [...str].forEach((ch, i) => {
        if (ch === ' ' || !GLYPH[ch]) return;
        const on = !(flick && ch === 'N' && Math.sin(t * 17) > 0.6 && Math.sin(t * 3.1) > 0);   // the N buzzes and drops out now and then
        for (const [a, b2, c2, d] of GLYPH[ch]) for (const o of [0, 1]) line1(x + i * (6 * sc + 5) + a * sc + o, y + b2 * sc, x + i * (6 * sc + 5) + c2 * sc + o, y + d * sc, on ? c : C('#4a1830'));
      });
    };
    word('CLUB', x0 + 10, y0 + 9, NEON_C, 2, false);
    word('NOIR', x0 + 80, y0 + 9, NEON_P, 2, true);
    for (let x = x0 + 10; x <= x1 - 10; x++) plot(x, y1 - 7, (x + Math.floor(t * 30)) % 12 < 6 ? NEON_V : C('#3a1a4a'));   // a running stripe under the words
    // a big pink arrow on the roof, pointing right at the entrance, its chevrons running toward the door
    const ay = GOAL.y - 34, ax = KIOSK_X - 70;   // a free-standing neon arrow on a post, pointing at the side door
    for (let y = ay + 6; y < GOAL.y; y++) plot(ax + 7, y, C('#4a4e5c'));
    for (let c = 0; c < 3; c++) {
      const on = (Math.floor(t * 6) - c + 30) % 3 === 0, col = on ? NEON_P : C('#4a1830'), cx = ax + c * 7;
      for (let k2 = 0; k2 < 5; k2++) { plot(cx + k2, ay - 5 + k2, col); plot(cx + k2, ay + 5 - k2, col); plot(cx + k2 + 1, ay - 5 + k2, col); plot(cx + k2 + 1, ay + 5 - k2, col); }
    }
  }
  // at the foot of the fire escape: a blade sign (a neon cocktail over NOIR) hangs off the corner of the club, and three chevrons on the wall climb toward the roof
  const BLADE = { x0: 2163, x1: 2179, y0: 116, y1: 194 }, CHEV_X = STAIR_X0 + 10;
  function drawStairSign() {
    if (isP9()) return;
    if (flags.club || cam.x > STAIR_X0 + 60 || cam.x + cam.vw < BLADE.x0 - 20) return;
    const t = simTime, { x0, x1, y0, y1 } = BLADE, iron = C('#2a2a34'), ironL = C('#4a4a58');
    // two iron arms hold the blade off the wall
    for (const ay of [y0 + 6, y1 - 6]) { for (let x = x0 - 4; x < x0; x++) { plot(x, ay, iron); plot(x, ay + 1, ironL); } plot(x0 - 4, ay - 1, iron); plot(x0 - 4, ay + 2, iron); }
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) plot(x, y, x === x0 || x === x1 || y === y0 || y === y1 ? PAL.out : x === x0 + 1 || x === x1 - 1 || y === y0 + 1 || y === y1 - 1 ? C('#3a3a48') : C('#140b1a'));
    plot(x0 + 1, y0 + 1, C('#6a6a78')); plot(x1 - 1, y0 + 1, C('#6a6a78'));   // the cap catches the street light
    let k = 0;   // bulbs chase round the frame
    const bulb = (x, y) => plot(x, y, (k++ + Math.floor(t * 9)) % 3 === 0 ? NEON_Y : C('#5a4a22'));
    for (let x = x0 + 3; x <= x1 - 3; x += 4) bulb(x, y0 + 3);
    for (let y = y0 + 7; y <= y1 - 3; y += 4) bulb(x1 - 3, y);
    for (let x = x1 - 7; x >= x0 + 3; x -= 4) bulb(x, y1 - 3);
    for (let y = y1 - 7; y >= y0 + 7; y -= 4) bulb(x0 + 3, y);
    // the cocktail: a cyan martini glass, a pink drink that fills and drains, an olive on a pick
    const gx = (x0 + x1) >> 1, gy = y0 + 8, glassOn = !(Math.sin(t * 11) > 0.9 && Math.sin(t * 1.7) > 0.5);
    const gc = glassOn ? NEON_C : C('#1f4a52'), fill = 1 + Math.floor((Math.sin(t * 1.4) * 0.5 + 0.5) * 4);
    for (let i = 0; i <= 5; i++) { plot(gx - 5 + i, gy + i, gc); plot(gx + 5 - i, gy + i, gc); }   // the bowl
    for (let i = 0; i < 5; i++) for (let x = gx - 4 + i + 1; x <= gx + 4 - i - 1; x++) if (i >= 5 - fill - 1 && glassOn) plot(x, gy + i + 1, NEON_P);   // the drink
    for (let x = gx - 5; x <= gx + 5; x++) plot(x, gy, gc);   // the rim
    for (let y = gy + 6; y <= gy + 10; y++) plot(gx, y, gc);   // the stem
    for (let x = gx - 3; x <= gx + 3; x++) plot(x, gy + 11, gc);   // the foot
    line1(gx + 1, gy + 3, gx + 4, gy - 3, NEON_Y); plot(gx + 1, gy + 2, glassOn ? NEON_V : C('#3a1a4a')); plot(gx + 2, gy + 2, glassOn ? NEON_V : C('#3a1a4a'));   // the pick and the olive
    // NOIR down the blade, pink; the R buzzes and drops out now and then
    [...'NOIR'].forEach((ch, i) => {
      const on = !(ch === 'R' && Math.sin(t * 17) > 0.6 && Math.sin(t * 2.9) > 0.2), lx = x0 + 5, ly = y0 + 25 + i * 13;
      for (const [a, b2, c2, d] of GLYPH[ch]) line1(lx + a, ly + b2, lx + c2, ly + d, on ? NEON_P : C('#4a1830'));
    });
    // the chevrons: three on the wall between the first two flights; they light in turn from the bottom, flash together, then go dark
    const ph = Math.floor(t * 5) % 5;
    {   // a black lightbox screwed to the wall carries the tubes
      const bx0 = CHEV_X - 9, bx1 = CHEV_X + 9, by0 = GROUND - 56, by1 = GROUND - 22;
      for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) plot(x, y, x === bx0 || x === bx1 || y === by0 || y === by1 ? PAL.out : C('#120d18'));
      for (const [x, y] of [[bx0 + 2, by0 + 2], [bx1 - 2, by0 + 2], [bx0 + 2, by1 - 2], [bx1 - 2, by1 - 2]]) plot(x, y, C('#4a4a58'));   // the screws
    }
    for (let c = 0; c < 3; c++) {
      const on = ph === 3 || ph === c, cy = GROUND - 30 - c * 9, col = on ? NEON_C : C('#1f4a52'), core = on ? SPARK : C('#1f4a52');
      for (let k2 = 0; k2 <= 6; k2++) { plot(CHEV_X - 6 + k2, cy - k2, col); plot(CHEV_X + 6 - k2, cy - k2, col); plot(CHEV_X - 6 + k2, cy - k2 + 1, k2 === 6 ? core : col); plot(CHEV_X + 6 - k2, cy - k2 + 1, col); }
    }
  }
  // the fire escape's outer rail passes in front of whoever is on it (treads and the far rail are in the wall layer behind)
  const RAILSEG = (() => {
    const out = []; let run = [];
    const flush = () => { if (run.length) { const a = run[0], b = run[run.length - 1], ax = a.dir > 0 ? a.x0 : a.x1, bx = b.dir > 0 ? b.x1 : b.x0; out.push([ax, a.y - RAIL_H, bx, b.y - RAIL_H, run]); run = []; } };
    for (const st of STEPS) { if (st.step) run.push(st); else { flush(); out.push([st.x0 - 1, st.y - RAIL_H, st.x1 + 1, st.y - RAIL_H, null]); } }
    flush(); return out;
  })();
  function drawStairRails() {
    if (isP9()) return;
    if (flags.club || cam.x > STAIR_X1 + 20 || cam.x + cam.vw < STAIR_X0 - 20) return;
    const top = C('#7c7c96'), post = C('#34343f');
    for (const [ax, ay, bx, by, run] of RAILSEG) {
      if (run) run.forEach((st, i) => { if (i % 4 === 0 && i) { const px = st.dir > 0 ? st.x0 : st.x1; for (let y = st.y - RAIL_H + 1; y < st.y; y++) plot(px, y, post); } });   // a post on every 4th tread
      line1(ax, ay, bx, by, top);
    }
  }
  function drawSearchlights() {   // two beams from the roof corners sweep the sky
    if (flags.club || cam.x > GOAL.x1 + 60 || cam.x + cam.vw < GOAL.x0 - 60) return;
    for (const [bx, ph, by] of [[GOAL.x0 + 8, 0, GOAL.y - 2], [GOAL.x1 - 8, 2.2, GOAL.y - 70]]) {   // one on the parapet, one on the kiosk roof
      const a = Math.sin(simTime * 0.5 + ph) * 0.5;
      for (let y = by; y > by - 220; y--) {
        const k = (by - y) / 220, cx = bx + Math.tan(a) * (by - y), hw = 1 + k * 12, vy = y - cam.y; if (vy < 0 || vy >= cam.vh) continue;
        for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
          const vx = x - cam.x; if (vx < 0 || vx >= cam.vw || (x + y) & 1) continue;
          const i = vy * CW + vx, c = buf[i], add = 34 * (1 - k);
          buf[i] = (255 << 24 | Math.min(255, (c >> 16 & 255) + add) << 16 | Math.min(255, (c >> 8 & 255) + add * 0.95) << 8 | Math.min(255, (c & 255) + add * 0.9)) >>> 0;
        }
      }
    }
  }

  // ---------- the crowd in the club: they dance at the back and react to the fight ----------
  // crowd colours: 30 % less saturated and a step darker than the fighters, so the dancers read as depth
  const dimC = h => { const n = parseInt(h.slice(1), 16); const v = [n >> 16, n >> 8 & 255, n & 255], l = (v[0] + v[1] + v[2]) / 3; return (255 << 24 | v.map(c => Math.round((c * 0.6 + l * 0.4) * 0.45)).reduce((a, c, i) => a | c << (i * 8), 0)) >>> 0; };
  const DCOL = ['#c23b7a', '#3bb3c2', '#e0c040', '#7a4bd0', '#d06a2a', '#2f9e6a', '#e8e0f0', '#b03030', '#4060d0'].map(dimC);
  const DSKIN = ['#e8b48a', '#c48a62', '#8a5a3a', '#f0c8a0', '#a8724a'].map(dimC);
  const DHAIR = ['#1a1418', '#5a3020', '#d8b050', '#2a2030', '#b03a20', '#e0e0e8'].map(dimC);
  const dkC = c => (255 << 24 | Math.round((c >> 16 & 255) * 0.68) << 16 | Math.round((c >> 8 & 255) * 0.68) << 8 | Math.round((c & 255) * 0.68)) >>> 0;
  const dancers = Array.from({ length: 9 }, (_, i) => ({ home: CLUB_X + 70 + i * 32 + (i * 17) % 11, x: CLUB_X + 70 + i * 32, style: i % 4, ph: i * 0.37,
    top: DCOL[i % DCOL.length], legs: DCOL[(i * 4 + 2) % DCOL.length], skin: DSKIN[i % DSKIN.length], hairC: DHAIR[(i * 5) % DHAIR.length], long: i % 3 === 1, h: 0.94 + (i % 3) * 0.05, mood: 'dance', t: 0 }));
  function crowdReact(x, power, all) {
    if (!flags.club) return;
    for (const d of dancers) {
      const dist = Math.abs(d.x - x);
      if (all) { d.mood = 'cheer'; d.t = (all === 'big' ? 4 : 1.6) + simRand(); continue; }   // a death or a big knock: the whole room cheers
      if (power >= 220) { if (simRand() < 0.85) { d.mood = 'cheer'; d.t = 1.2 + simRand() * 0.8; } continue; }   // a hard hit: most of them cheer
      if (dist > 150 || simRand() < 0.5) continue;
      d.mood = simRand() < 0.5 ? 'cheer' : 'shock'; d.t = 0.6 + simRand() * 0.8;
    }
  }
  function crowdStep(dt) {
    if (!flags.club) return;
    const fighters = [P[2].x, ...enemies.filter(e => !e.dead).map(e => e.x)];
    for (const d of dancers) {
      if ((d.t -= dt) <= 0) d.mood = 'dance';
      const near = fighters.find(fx => Math.abs(fx - d.x) < 26);
      if (near != null) d.x += Math.sign(d.x - near || 1) * 34 * dt;   // make room for the fight
      else d.x += clamp(d.home - d.x, -1, 1) * 10 * dt;
      d.x = clamp(d.x, CLUB_X + 34, W - 24);
    }
    for (let it = 0; it < 2; it++) for (let i = 0; i < dancers.length; i++) for (let j = i + 1; j < dancers.length; j++) {   // keep a little room between dancers
      const a = dancers[i], b = dancers[j], d = b.x - a.x, gap = 15;
      if (Math.abs(d) < gap) { const push = (gap - Math.abs(d)) / 2, sg = Math.sign(d) || 1; a.x -= sg * push; b.x += sg * push; }
    }
    for (const d of dancers) d.x = clamp(d.x, CLUB_X + 34, W - 24);
  }
  function drawDancers() {   // the crowd on the back dais: 1.7-1.8 m figures with a shaded side, round heads, hair, hands; posed by mood and dance style
    if (!flags.club) return;
    const beat = simTime * 2.1 * Math.PI * 2;
    for (const d of dancers) {
      const s = d.h, gy = GROUND - 8, ph = beat + d.ph * 6, hop = d.mood === 'cheer' || d.style === 2 ? Math.max(0, Math.sin(ph)) * 3 * s : 0;
      const bob = d.mood === 'cower' ? 8 * s : Math.abs(Math.sin(ph)) * 1.8 * s, sway = d.style === 1 ? Math.sin(ph / 2) * 2.5 : 0;
      const px = d.x + sway, py = gy - 17 * s + bob - hop, lean = d.mood === 'shock' ? -2 : d.mood === 'cower' ? 1.5 : Math.sin(ph / 2) * 0.6;
      const nx = px + lean, ny = py - 13 * s, topD = dkC(d.top), legD = dkC(d.legs), skinD = dkC(d.skin);
      const line = (ax, ay, bx2, by2, c, w = 1) => { seg(ax, ay, bx2, by2, (1.9 + w) * s, PAL.out); seg(ax, ay, bx2, by2, (1 + w) * s, c); };
      for (const side of [-1, 1]) {   // legs: knees push out as they bob; the far leg is darker
        const fx = d.x + side * 3.2 * s, fy = gy - hop, hx = px + side * 1.4 * s, kx = (hx + fx) / 2 + side * (1 + bob * 0.5), ky = (py + fy) / 2 + 1, c = side < 0 ? legD : d.legs;
        line(hx, py + 1, kx, ky, c, 0.5); line(kx, ky, fx, fy, c, 0.4);
        seg(fx - 1, fy, fx + 1.5 * side, fy, 1.6 * s, PAL.out); seg(fx - 1, fy, fx + 1.5 * side, fy, 0.9 * s, PAL.shoe);
      }
      line(px, py, nx, ny, d.top, 1.9);   // torso, with a shoulder bar and the shaded side
      seg(nx - 3.2 * s, ny + 1.5, nx + 3.2 * s, ny + 1.5, 2.6 * s, PAL.out); seg(nx - 3 * s, ny + 1.5, nx + 3 * s, ny + 1.5, 1.7 * s, d.top);
      seg(px - 1.5 * s, py - 1, nx - 1.5 * s, ny + 1, 1.1 * s, topD); seg(nx - 2.8 * s, ny + 1.5, nx - 1.2 * s, ny + 1.5, 1.4 * s, topD);
      for (const side of [-1, 1]) {   // arms by mood and dance style
        const up = Math.sin(ph + (side > 0 ? 0 : Math.PI)) > 0;
        let ex, ey, hx, hy2;
        if (d.mood === 'cheer' || d.style === 2) { ex = nx + side * 4.5 * s; ey = ny - 4 * s; hx = nx + side * 5 * s + Math.sin(ph * 2) * side; hy2 = ny - 11 * s; }
        else if (d.mood === 'cower' || d.mood === 'shock') { ex = nx + side * 5 * s; ey = ny - 1; hx = nx + side * 1.5; hy2 = ny - 7 * s; }
        else if (d.style === 0) { ex = nx + side * 4 * s; ey = up ? ny - 3 * s : ny + 4 * s; hx = nx + side * 4.5 * s; hy2 = up ? ny - 10 * s : ny + 1; }
        else if (d.style === 3) { ex = nx + side * 4 * s; ey = ny - (up ? 3 : -3) * s; hx = nx + side * (up ? 6 : 2.5) * s; hy2 = ny + (up ? -9 : 7) * s; }
        else { ex = nx + side * 5 * s; ey = ny + 4 * s; hx = nx + side * (6 + Math.sin(ph) * 2) * s; hy2 = ny + 7 * s; }
        const c = side < 0 ? topD : d.top, sk = side < 0 ? skinD : d.skin;
        line(nx + side * 2.5 * s, ny + 1.5, ex, ey, c, 0.3); line(ex, ey, hx, hy2, c, 0.15);
        disc(snap(hx), snap(hy2), 1.8 * s, PAL.out); disc(snap(hx), snap(hy2), 1.1 * s, sk);
      }
      // a round head: hair cap, face, two dark eyes; long hair falls past the shoulders
      const hcx = nx + lean * 0.4, hcy = ny - 5.2 * s, hr = 3.4 * s;
      disc(snap(hcx), snap(hcy), hr + 1, PAL.out);
      disc(snap(hcx), snap(hcy + 0.3 * s), hr, d.skin);
      for (let y = Math.floor(hcy - hr - 1); y <= Math.ceil(hcy + hr); y++) for (let x = Math.floor(hcx - hr - 1); x <= Math.ceil(hcx + hr + 1); x++) {
        const rx = x + 0.5 - hcx, ry = y + 0.5 - (hcy - 0.6 * s), rr = Math.hypot(rx, ry);
        if (rr <= hr && (ry < -0.8 * s || Math.abs(rx) > hr - 1.2 * s && ry < 1.5 * s)) plot(x, y, d.hairC);
        else if (rr <= hr && rx < -0.5 * s && ry > 0.5 * s) plot(x, y, skinD);   // the shaded cheek
      }
      if (d.long) for (let y = 0; y < 7 * s; y++) { plot(Math.round(hcx - hr - 0.5), Math.round(hcy + y), d.hairC); plot(Math.round(hcx + hr - 0.5), Math.round(hcy + y), d.hairC); plot(Math.round(hcx - hr - 1.5), Math.round(hcy + y), PAL.out); plot(Math.round(hcx + hr + 0.5), Math.round(hcy + y), PAL.out); }
      plot(Math.round(hcx - 1.4 * s - 0.5), Math.round(hcy + 0.2 * s), PAL.out); plot(Math.round(hcx + 1.4 * s - 0.5), Math.round(hcy + 0.2 * s), PAL.out);
      if (d.mood === 'shock') plot(Math.round(hcx - 0.5), Math.round(hcy + 2 * s), PAL.out);   // an open mouth
    }
  }

  // ---------- night lighting, wet street reflections and rain ----------
  const rain = { k: 0, goal: 0, t: 14, drops: [], splash: [], rip: [], flash: 0 };
  function weatherStep(dt) {
    if (isP9()) { sleetStep(dt); return; }
    if ((rain.t -= dt) <= 0) { rain.goal = rain.goal ? 0 : 0.6 + simRand() * 0.4; rain.t = rain.goal ? 25 + simRand() * 25 : 30 + simRand() * 40; }
    rain.k += (rain.goal - rain.k) * (1 - Math.exp(-0.4 * dt));
    if (rain.flash > 0) rain.flash -= dt;
    else if (rain.k > 0.55 && simRand() < dt * 0.05) rain.flash = 0.3;   // lightning over the roofs
    const want = flags.club ? 0 : Math.round(rain.k * 170);
    while (rain.drops.length < want) rain.drops.push({ x: cam.x + simRand() * (cam.vw + 60), y: cam.y - simRand() * cam.vh, v: 250 + simRand() * 90 });
    if (rain.drops.length > want) rain.drops.length = want;
    for (const d of rain.drops) {
      d.x -= 45 * dt; d.y += d.v * dt;
      const fl = d.y > cam.y + 10 ? floorBelow(d.x, d.y - 6, 0).y : 1e9;
      if (d.y >= fl || d.y > cam.y + cam.vh + 10 || d.x < cam.x - 30) {
        if (d.y >= fl && d.y < cam.y + cam.vh) {
          rain.splash.push({ x: d.x, y: fl - 1, t: 0 });
          if (fl === GROUND && simRand() < 0.5) rain.rip.push({ x: d.x, d: 1 + Math.floor(simRand() * (STREET - 2)), t: 0 });
        }
        d.x = cam.x + simRand() * (cam.vw + 60); d.y = cam.y - simRand() * 30; d.v = 250 + simRand() * 90;
      }
    }
    for (let i = rain.splash.length - 1; i >= 0; i--) if ((rain.splash[i].t += dt) > 0.12) rain.splash.splice(i, 1);
    for (let i = rain.rip.length - 1; i >= 0; i--) if ((rain.rip[i].t += dt) > 0.45) rain.rip.splice(i, 1);
  }
  // every pixel takes a cold ambient light, plus warm pools from the street lamps; windows and lamp glass glow on their own
  const LROW = { r: new Float32Array(CW), g: new Float32Array(CW), b: new Float32Array(CW), w: new Float32Array(CW) };
  function lightPass() {
    const [aR, aG, aB, ls] = lightList(), Lr = LROW.r, Lg = LROW.g, Lb = LROW.b, Gw = LROW.w;
    for (let vy = 0; vy < cam.vh; vy++) {
      const row = vy * CW;
      Lr.fill(0, 0, cam.vw); Lg.fill(0, 0, cam.vw); Lb.fill(0, 0, cam.vw); Gw.fill(0, 0, cam.vw);
      for (let i = 0; i < ls.length; i++) {   // each pool adds its light along the part of this row it reaches
        const q = ls[i], dy = vy - q[1], dyy = dy * dy * (dy < 0 ? 2.2 : 0.75);
        if (dyy >= q[2]) continue;
        const span = Math.sqrt(q[2] - dyy), x0 = Math.max(0, Math.ceil(q[0] - span)), x1 = Math.min(cam.vw - 1, Math.floor(q[0] + span));
        for (let vx = x0; vx <= x1; vx++) {
          const dx = vx - q[0], d2 = dx * dx + dyy;
          if (d2 < q[2]) { const k = 1 - d2 / q[2], kk = k * k; Lr[vx] += kk * q[3]; Lg[vx] += kk * q[4]; Lb[vx] += kk * q[5]; if (q[6] && d2 < 90) Gw[vx] += (1 - d2 / 90) * q[6]; }
        }
      }
      for (let vx = 0; vx < cam.vw; vx++) {
        const c = buf[row + vx];
        if (!c || EMIT.has(c)) continue;   // (an empty pixel only happens in a 3D view layer)
        const glow = Gw[vx], r = (c & 255) * (aR + Lr[vx]) + glow, g = (c >> 8 & 255) * (aG + Lg[vx]) + glow * 0.78, b = (c >> 16 & 255) * (aB + Lb[vx]) + glow * 0.35;
        buf[row + vx] = (255 << 24 | Math.min(255, b) << 16 | Math.min(255, g) << 8 | Math.min(255, r)) >>> 0;
      }
    }
  }
  // the scene's light: an ambient tint, and pools [x, y (view), radius², r, g, b weights, glow] from lamps, lit windows, signs, club spots
  function lightList() {
    if (isP9()) return p9Lights();
    const strobe = flags.club && !reduceMotion && enc.boss && !enc.boss.dead && enc.introT < 0 && (simTime * 6 % 1) < 0.12 && Math.floor(simTime * 6) % 4 === 0 ? 1.7 : 1;
    const cut = flags.club && enc.introT >= 0 ? 1 - 0.72 * clamp(enc.introT / 0.25, 0, 1) : 1;   // the entrance: the house lights drop to a quarter
    const fl = flags.club ? strobe : rain.flash > 0 ? 1 + Math.max(0, Math.sin(rain.flash * 40)) * 0.9 * (rain.flash / 0.3) : 1, dim = flags.club ? cut : 1 - rain.k * 0.12;
    const aR = (flags.club ? 0.52 : 0.5) * dim * fl, aG = (flags.club ? 0.44 : 0.54) * dim * fl, aB = (flags.club ? 0.66 : 0.7) * dim * fl;
    const ls = [];   // x, y (view), radius², r, g, b weights, glow
    if (!flags.club) {
      for (const lx of LAMPS) if (lx > cam.x - 100 && lx < cam.x + cam.vw + 100) ls.push([lx + 7 - cam.x, GROUND - 75 - cam.y, 100 * 100, 1.5, 1.18, 0.6, 55]);
      for (const [wx, wy, wr] of WINL) if (wx > cam.x - wr && wx < cam.x + cam.vw + wr) ls.push([wx - cam.x, wy - cam.y, wr * wr, 0.55, 0.4, 0.14, 0]);   // window spill
      if (cam.x < SIGN.x1 + 120 && cam.x + cam.vw > SIGN.x0 - 120) ls.push([(SIGN.x0 + SIGN.x1) / 2 - cam.x, SIGN.y1 - cam.y, 120 * 120, 1.0, 0.4, 0.95, 0], [GOAL.x1 - 8 - cam.x, GOAL.y - 20 - cam.y, 50 * 50, 0.3, 1.0, 1.1, 0]);   // the sign bathes the roof pink, the door glows cyan
      if (!flags.club && cam.x < STAIR_X0 + 120 && cam.x + cam.vw > BLADE.x0 - 120) ls.push([(BLADE.x0 + BLADE.x1) / 2 - cam.x, (BLADE.y0 + BLADE.y1) / 2 - cam.y, 46 * 46, 1.0, 0.35, 0.8, 0], [CHEV_X - cam.x, GROUND - 40 - cam.y, 30 * 30, 0.3, 0.95, 1.1, 0]);   // the blade sign glows pink on the wall, the chevrons cyan
    }
    else {
      for (const sp of clubSpots()) ls.push([sp.x - cam.x, GROUND - 14 - cam.y, 64 * 64, sp.c[0], sp.c[1], sp.c[2], 0]);
      if (enc.introT < 0) ls.push([2600 - cam.x, GROUND - 105 - cam.y, 70 * 70, 0.9, 0.2, 0.6, 0], [2706 - cam.x, GROUND - 106 - cam.y, 50 * 50, 0.2, 0.8, 0.9, 0], [2720 - cam.x, GROUND - 30 - cam.y, 50 * 50, 0.8, 0.6, 0.3, 0]);
      { const k = 0.5 * Math.max(cut, 0.6); ls.push([P[2].x - cam.x, P[2].y - 12 - cam.y, 46 * 46, k, k, k, 0]); }   // a steady white key light on the hero, so he reads under the colour
    }
    return [aR, aG, aB, ls];
  }
  // moving spotlights: pools that sweep the dance floor, each from a ceiling fixture, cycling colours
  const SPOT_COL = [[1.3, 0.3, 0.9], [0.3, 1.1, 1.3], [0.9, 0.4, 1.4], [1.3, 1.1, 0.3]];
  function clubSpots() {
    const t = simTime, out = [];
    if (isP9()) return P9.HALL_LAMPS.map(x => ({ fx: x, x, c: [1.1, 1.0, 0.85] }));
    if (enc.introT >= 0 && enc.boss) return [{ fx: enc.boss.x, x: enc.boss.x, c: [1.5, 1.5, 1.5] }];   // the entrance: one white spot follows the boss
    for (let i = 0; i < 3; i++) out.push({ fx: CLUB_X + 20 + i * 120, x: CLUB_X + 80 + i * 120 + Math.sin(t * 0.8 + i * 2.1) * 60, c: SPOT_COL[(i + Math.floor(t / 2)) & 3] });
    return out;
  }
  function drawBeams() {   // light cones from the fixtures to the pools, added on top
    if (!flags.club || isP9()) return;
    for (const sp of clubSpots()) {
      const y0 = GROUND - 144, y1 = GROUND - 2, cr = sp.c[0] * 40, cg = sp.c[1] * 40, cb = sp.c[2] * 40;
      for (let y = y0; y < y1; y++) {
        const k = (y - y0) / (y1 - y0), cx = sp.fx + (sp.x - sp.fx) * k, hw = 1 + k * 13, vy = y - cam.y; if (vy < 0 || vy >= cam.vh) continue;
        for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
          const vx = x - cam.x; if (vx < 0 || vx >= cam.vw || (x + y) & 1) continue;
          const i = vy * CW + vx, c = buf[i];
          buf[i] = (255 << 24 | Math.min(255, (c >> 16 & 255) + cb) << 16 | Math.min(255, (c >> 8 & 255) + cg) << 8 | Math.min(255, (c & 255) + cr)) >>> 0;
        }
      }
    }
  }
  // the wet street mirrors the scene, squashed 3x; puddles mirror it clearly, rain ripples break it up
  // wet-street highlights (the 3D floor shader runs the same numbers): each light draws a streak down the stones in front of it,
  // stronger toward the kerb and in the rain; the dark joints between stones stay dry; stepped in quarters with a 2 x 2 dither
  const WET = { w: 0.1, k0: 0.18, kRain: 0.3, kClub: 0.5, step: 0.055, dry: [0.08, 0.25] };
  function reflectPass() {
    const t = simTime, rk = rain.k, ls = lightList()[3], wk = flags.club ? WET.kClub : WET.k0 + rk * WET.kRain;
    { const vy = GROUND - cam.y; if (vy >= 0 && vy < cam.vh) for (let vx = 0; vx < cam.vw; vx++) { const bp = BPOOL[vx + cam.x]; if (bp > 0.025) buf[vy * CW + vx] = bp > 0.2 ? C('#8a1420') : C('#6a1018'); } }   // a pool's lip on the curb
    for (let d = 1; d <= STREET; d++) {
      const vy = GROUND + d - cam.y; if (vy < 0 || vy >= cam.vh) continue;
      const svy = GROUND - 1 - d * 3 - cam.y, row = vy * CW, mrow = d * W;
      for (let vx = 0; vx < cam.vw; vx++) {
        const wx = vx + cam.x, bp = BPOOL[mrow + wx], bpool = bp > 0.025, pud = PUDDLE[mrow + wx] || bpool;
        const a = flags.club ? 0.38 * (1 - d / (STREET + 6)) : pud ? 0.75 : 0.32 * (0.6 + rk * 0.6) * (1 - d / (STREET + 4));
        if (svy < 0) continue;
        const sx = vx + (pud && !flags.club ? Math.round(Math.sin(d * 1.9 + t * (3 + rk * 8) + wx * 0.21) * (0.4 + rk * 1.3)) : 0);
        if (sx < 0 || sx >= cam.vw) continue;
        const sc = buf[svy * CW + sx], c = buf[row + vx];
        let r = (c & 255) * (1 - a) + (sc & 255) * a * 0.92, g = (c >> 8 & 255) * (1 - a) + (sc >> 8 & 255) * a * 0.94, b = (c >> 16 & 255) * (1 - a) + Math.min(255, (sc >> 16 & 255) * a * 1.05 + a * 10);
        const bk = (bpool ? Math.min(0.95, 0.6 + bp * 0.4) : pud && !flags.club ? PUD_BLOOD[wx] : 0) * (flags.club ? 0.5 : 1);   // the mirrored club floor keeps half the red
        if (bk > 0.01) { r = Math.min(255, r * (1 - bk * 0.4) + 70 * bk); g *= 1 - bk * 0.85; b *= 1 - bk * 0.8; }   // a bloody puddle: the reflection turns red
        {
          let sr = 0, sg = 0, sb = 0;
          for (const q of ls) { if (q[2] <= 0) continue; const w = Math.sqrt(q[2]) * WET.w, dx = Math.abs(vx - q[0]); if (dx < w) { const k = (1 - dx / w) * (0.35 + 0.65 * d / (STREET + 1)); sr += q[3] * k; sg += q[4] * k; sb += q[5] * k; } }
          if (sr + sg + sb > 0) {
            const sc0 = stat[(GROUND + d) * W + wx] || 0, lum = ((sc0 & 255) + (sc0 >> 8 & 255) + (sc0 >> 16 & 255)) / 765, t2 = clamp((lum - WET.dry[0]) / (WET.dry[1] - WET.dry[0]), 0, 1), st = t2 * t2 * (3 - 2 * t2);
            const th = (wx & 1) * 0.5 + (d & 1) * 0.25, q4 = v => Math.floor(v * st * wk * 4 + th) * WET.step * 255;
            r = Math.min(255, r + q4(sr)); g = Math.min(255, g + q4(sg)); b = Math.min(255, b + q4(sb));
          }
        }
        buf[row + vx] = (255 << 24 | b << 16 | g << 8 | r) >>> 0;
      }
    }
    const rc = C('#9aa6c4');
    if (!flags.club) for (const p of rain.rip) {   // rings on the wet stones
      const w = 1 + p.t * 12, y = GROUND + p.d, x = Math.floor(p.x);
      if (PUDDLE[p.d * W + x] || p.t < 0.15) { plot(Math.floor(p.x - w), y, rc); plot(Math.floor(p.x + w), y, rc); }
    }
  }
  function blendPlot(x, y, r, g, b, a) {   // see-through pixel (world coordinates)
    x -= cam.x; y -= cam.y; if (x < 0 || y < 0 || x >= cam.vw || y >= cam.vh) return;
    const i = y * CW + x, c = buf[i];
    if (!c) { buf[i] = (Math.round(a * 255) << 24 | b << 16 | g << 8 | r) >>> 0; return; }   // an empty pixel (a 3D view layer): keep the see-through
    buf[i] = (255 << 24 | ((c >> 16 & 255) * (1 - a) + b * a) << 16 | ((c >> 8 & 255) * (1 - a) + g * a) << 8 | ((c & 255) * (1 - a) + r * a)) >>> 0;
  }
  function drawRain() {
    if (!rain.drops.length || flags.club) return;
    if (isP9()) {   // sleet: heavier, slower, whiter streaks on a steeper slant, and wet flakes
      for (const d of rain.drops) {
        const x = Math.floor(d.x), y = Math.floor(d.y), far = d.v < 150, n = far ? 3 : 5;
        for (let k = 0; k < n; k++) blendPlot(x + Math.floor(k / 2), y - k, 226, 232, 240, far ? 0.2 : k ? 0.34 : 0.6);
        if (d.flake) blendPlot(x + 1, y + 1, 240, 244, 250, 0.7);
      }
      for (const s of rain.splash) { const k = s.t / 0.12, a = 0.45 * (1 - k); blendPlot(Math.floor(s.x - 1 - k * 2), Math.floor(s.y - 1 - k), 220, 228, 238, a); blendPlot(Math.floor(s.x + 1 + k * 2), Math.floor(s.y - 1 - k), 220, 228, 238, a); }
      return;
    }
    for (const d of rain.drops) {   // thin, see-through slanted streaks; the slower ones are farther away and fainter
      const x = Math.floor(d.x), y = Math.floor(d.y), far = d.v < 290, n = far ? 3 : 5;
      for (let k = 0; k < n; k++) blendPlot(x + Math.floor(k / 3), y - k, 170, 185, 220, far ? 0.14 : k ? 0.26 : 0.42);
    }
    for (const s of rain.splash) { const k = s.t / 0.12, a = 0.4 * (1 - k); blendPlot(Math.floor(s.x - 1 - k * 2), Math.floor(s.y - 1 - k * 2), 180, 195, 225, a); blendPlot(Math.floor(s.x + 1 + k * 2), Math.floor(s.y - 1 - k * 2), 180, 195, 225, a); }
  }
  function render(look, face) {   // the 2D view: draws only (the lanes are set in step(), the drawn pose in poseTick())
    drawBackdrop();   // (the club crowd is drawn inside it, behind the bar and speakers)
    drawSpawnFx();
    if (!flags.club) bgSnap.set(buf);   // the scene without people, to find them again for the glass reflections
    drawSign();
    drawStairSign();
    drawTramp();
    drawBag();
    drawDoor();   // the club door is in the wall behind everyone
    drawGate();
    for (const L of [LANE.PLAT, LANE.FIGHT, LANE.FRONT]) {   // the lanes, back to front
      if (L === LANE.FRONT) drawTossed();   // pocket throws in flight: the front lane
      drawThrown(L); drawBoards(L);
      for (const o of objs) if (objLane(o) === L) { pickArt.on = !!o.pocket && !o.carried; drawObj(o); pickArt.on = false; }
      if (ctl.lane === L) drawShadow();
      drawEnemies(L);
      if (L === LANE.FIGHT) drawEShots();
      if (L === LANE.FRONT) drawDog();
      if (ctl.lane === L) { drawCharacter(look, face); drawBottle(); }
      if (L === LANE.FRONT) drawDogHeart();
      if (L === LANE.PLAT) drawStairRails();   // the fire escape's outer rail: in front of anyone on the stairs, behind the street
    }
    if (isP9() && flags.club) P9.drawTunaHazard(R9, p9.tuna);   // the swinging tuna: in front of everyone it can hit
    pickArt.on = true; drawPickups(); drawThrown('lying'); drawAmmo(); pickArt.on = false;   // weapons, ammo and bandages waiting to be picked up: on top, always in sight
    if (!flags.club) glassReflect();
    drawGroundFx();
    lightPass();
    reflectPass();
    pickGlow();   // over the lit scene: the pickables stand out
    drawBeams();
    drawSearchlights();
    if (isP9() && !flags.club) P9.drawFxTop(R9, p9.open);
    drawFx();
    drawRain();
    drawOffscreen();   // markers sit on top, unlit
    postPass();
    if (showSkel) {
      for (const [a, b] of STICKS) line1(P[a].x, P[a].y, P[b].x, P[b].y, PAL.accent);
      for (const p of P) plot(Math.floor(p.x), Math.floor(p.y), PAL.white);
    }
    if (fade > 0) {   // fade through black on the way into the club
      const k = 1 - clamp(fade, 0, 1);
      for (let vy = 0; vy < cam.vh; vy++) for (let vx = 0, row = vy * CW; vx < cam.vw; vx++) { const c = buf[row + vx]; buf[row + vx] = (255 << 24 | ((c >> 16 & 255) * k) << 16 | ((c >> 8 & 255) * k) << 8 | (c & 255) * k) >>> 0; }
    }
    octx.putImageData(img, 0, 0);
    ctx.drawImage(off, 0, 0, cam.vw, cam.vh, 0, 0, CW, CH);
  }
  // the finish, the same in both views (the 3D view runs it as a shader with these numbers): bloom on bright pixels,
  // a colour grade (a little more saturation, cool shadows, warm highlights) and a vignette. The bloom is found on a grid
  // of 4 x 4 view pixels and spread back smoothly over the crisp pixels.
  const GRADE = { bloomT: 0.8, bloom: 0.55, sat: 1.12, vig: 0.28, W: [0.227, 0.195, 0.122, 0.054, 0.016] };
  const postB = { w: 0, h: 0 };
  function postPass() {
    const gw = Math.ceil(cam.vw / 4), gh = Math.ceil(cam.vh / 4), n = gw * gh;
    if (postB.w !== gw || postB.h !== gh) { Object.assign(postB, { w: gw, h: gh, a: new Float32Array(n * 3), b: new Float32Array(n * 3) }); }
    const A = postB.a, B = postB.b, Wt = GRADE.W;
    A.fill(0);
    for (let vy = 0; vy < cam.vh; vy++) for (let vx = 0, row = vy * CW; vx < cam.vw; vx++) {   // bright pass, averaged over each cell
      const c = buf[row + vx], r = (c & 255) / 255, g = (c >> 8 & 255) / 255, b = (c >> 16 & 255) / 255, m = Math.max(r, g, b);
      if (m <= GRADE.bloomT) continue;
      const t = Math.min(1, (m - GRADE.bloomT) / (1 - GRADE.bloomT)), k = t * t * (3 - 2 * t) / 16, o = ((vy >> 2) * gw + (vx >> 2)) * 3;
      A[o] += r * k; A[o + 1] += g * k; A[o + 2] += b * k;
    }
    for (const [S, D, dx, dy] of [[A, B, 1, 0], [B, A, 0, 1]]) for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {   // 9-tap blur, across then down
      let r = 0, g = 0, b = 0;
      for (let k = -4; k <= 4; k++) { const xx = clamp(x + dx * k, 0, gw - 1), yy = clamp(y + dy * k, 0, gh - 1), o = (yy * gw + xx) * 3, w = Wt[Math.abs(k)]; r += S[o] * w; g += S[o + 1] * w; b += S[o + 2] * w; }
      const o = (y * gw + x) * 3; D[o] = r; D[o + 1] = g; D[o + 2] = b;
    }
    const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    // the bloom grid spread smoothly over the pixels: per column and per row, the two cells to blend and the weight (built once)
    if (postB.cw !== cam.vw || postB.chh !== cam.vh) {
      const col = n => { const i0 = new Int32Array(n), i1 = new Int32Array(n), t = new Float32Array(n), g = Math.ceil(n / 4); for (let v = 0; v < n; v++) { const f = clamp((v + 0.5) / 4 - 0.5, 0, g - 1), a = Math.floor(f); i0[v] = a; i1[v] = Math.min(g - 1, a + 1); t[v] = f - a; } return { i0, i1, t }; };
      const vg = new Float32Array(cam.vw * cam.vh);   // the vignette, per pixel
      for (let y = 0; y < cam.vh; y++) for (let x = 0; x < cam.vw; x++) { const d2 = ((x + 0.5) / cam.vw * 2 - 1) ** 2 + ((y + 0.5) / cam.vh * 2 - 1) ** 2; vg[y * cam.vw + x] = d2 <= 0.35 ? 1 : 1 - GRADE.vig * ss(0.35, 1.25, d2); }
      Object.assign(postB, { cw: cam.vw, chh: cam.vh, cx: col(cam.vw), cy: col(cam.vh), vg });
    }
    const CX = postB.cx, CY = postB.cy, bloom = GRADE.bloom, sat = GRADE.sat;
    const Sm = postB.sm && postB.sm.length === gw * gh ? postB.sm : (postB.sm = new Float32Array(gw * gh));
    for (let i = 0; i < gw * gh; i++) Sm[i] = A[i * 3] + A[i * 3 + 1] + A[i * 3 + 2];   // a cell with no glow near it skips the spread
    for (let vy = 0; vy < cam.vh; vy++) {
      const ra = CY.i0[vy] * gw * 3, rb = CY.i1[vy] * gw * 3, ty = CY.t[vy], row = vy * CW, vrow = vy * cam.vw, VG = postB.vg;
      for (let vx = 0; vx < cam.vw; vx++) {
        const a = CX.i0[vx] * 3, b2 = CX.i1[vx] * 3;
        let br = 0, bg = 0, bb = 0;
        if (Sm[(ra + a) / 3] + Sm[(ra + b2) / 3] + Sm[(rb + a) / 3] + Sm[(rb + b2) / 3] > 1e-4) {
          const tx = CX.t[vx], w00 = (1 - tx) * (1 - ty), w10 = tx * (1 - ty), w01 = (1 - tx) * ty, w11 = tx * ty;
          br = A[ra + a] * w00 + A[ra + b2] * w10 + A[rb + a] * w01 + A[rb + b2] * w11;
          bg = A[ra + a + 1] * w00 + A[ra + b2 + 1] * w10 + A[rb + a + 1] * w01 + A[rb + b2 + 1] * w11;
          bb = A[ra + a + 2] * w00 + A[ra + b2 + 2] * w10 + A[rb + a + 2] * w01 + A[rb + b2 + 2] * w11;
        }
        const vg = VG[vrow + vx];
        const c = buf[row + vx];
        let r = (c & 255) / 255 + br * bloom, g = (c >> 8 & 255) / 255 + bg * bloom, b = (c >> 16 & 255) / 255 + bb * bloom;
        const l = r * 0.299 + g * 0.587 + b * 0.114, t = l <= 0.2 ? 0 : l >= 0.8 ? 1 : ((l - 0.2) / 0.6) ** 2 * (3 - 2 * (l - 0.2) / 0.6);
        r = (l + (r - l) * sat + (-0.01 + 0.04 * t)) * vg; g = (l + (g - l) * sat + 0.015 * t) * vg; b = (l + (b - l) * sat + (0.035 - 0.055 * t)) * vg;
        buf[row + vx] = (255 << 24 | (b <= 0 ? 0 : b >= 1 ? 255 : (b * 255 + 0.5) | 0) << 16 | (g <= 0 ? 0 : g >= 1 ? 255 : (g * 255 + 0.5) | 0) << 8 | (r <= 0 ? 0 : r >= 1 ? 255 : (r * 255 + 0.5) | 0)) >>> 0;
      }
    }
  }
  function drawGroundFx() {   // lit like the scene: the slam's shockwaves, the landing waves
    for (const q of quakes) {   // the slam's shockwave: a crest of heaved paving with a bright leading edge
      const k = 1 - q.t / QUAKE.life, h = Math.round(2 + 6 * k), x = Math.floor(q.x), y = Math.floor(q.y);
      for (let j = 0; j < 9; j++) {
        const xx = x - q.dir * j, hh = Math.max(0, Math.round(h * (1 - j / 9) * (j === 0 ? 0.7 : 1) * (0.85 + 0.15 * Math.sin(simTime * 40 + j))));
        for (let yy = 0; yy <= hh; yy++) plot(xx, y - 1 - yy, yy === hh ? (j < 2 ? PAL.white : PAL.dust1) : PAL.out);
      }
      plot(x + q.dir, y - 1, PAL.dust1);
    }
    for (const w of waves) {   // landing shockwave running along the ground
      const r = w.t * 120, c = w.t < 0.1 ? PAL.white : PAL.dust1;
      for (const sx of [-1, 1]) { plot(Math.floor(w.x + sx * r), w.y, c); plot(Math.floor(w.x + sx * (r - 2)), w.y, c); plot(Math.floor(w.x + sx * (r - 1)), w.y - 1, c); }
    }
  }
  function drawFx() {   // unlit, over the lit scene: tracers, muzzle flashes, particles, impact sparks
    for (const b of bullets) { line1(b.x - b.vx * 0.012, b.y - b.vy * 0.012, b.x, b.y, PAL.accent); plot(Math.floor(b.x), Math.floor(b.y), PAL.white); }
    for (const f of flashes) {   // muzzle flash: a short star along the barrel
      const n = f.big ? 7 : 4;
      for (let d = 0; d <= n; d++) plot(Math.floor(f.x + f.dx * d), Math.floor(f.y + f.dy * d), d < n / 2 ? PAL.white : PAL.accent);
      for (const o of f.big ? [-2, -1, 1, 2] : [-1, 1]) plot(Math.floor(f.x + f.dx * 2 - f.dy * o), Math.floor(f.y + f.dy * 2 + f.dx * o), PAL.accent);
    }
    for (const q of particles) plot(Math.floor(q.x), Math.floor(q.y), q.c);
    for (const s of sparks) {
      const k = s.t / 0.22, rad = 2 + k * 7, c = k < 0.5 ? PAL.white : PAL.accent;
      if (k < 0.35) disc(snap(s.x), snap(s.y), 1.5, PAL.white);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4, cx = Math.cos(a), cy = Math.sin(a);
        plot(Math.floor(s.x + cx * rad), Math.floor(s.y + cy * rad), c);
        plot(Math.floor(s.x + cx * (rad + 1)), Math.floor(s.y + cy * (rad + 1)), c);
      }
    }
  }

  // ---------- camera: follows the fighter, zooms out for speed, height and flying objects ----------
  let zoomGoal = 1, zoomMode = 'auto';
  cam.xf = START_X - 80;   // (START_X is set above this point, not at cam's birth)
  // the box around the fighter and everything fighting near him: enemies, fresh bodies, enemy shots, thrown weapons
  let sBox = null;
  function sceneBox() {
    const cx = P[2].x;
    let x0 = cx - 24, x1 = cx + 24, y0 = Math.min(P[0].y, P[2].y) - 14, y1 = Math.max(P[8].y, P[10].y) + 4;
    const add = (x, y, m) => { x0 = Math.min(x0, x - m); x1 = Math.max(x1, x + m); y0 = Math.min(y0, y - m); y1 = Math.max(y1, y + m * 0.4); };
    for (const e of enemies) {   // [feel] only the ones fighting close by widen the shot; bystanders and bodies do not pull the camera out
      if (Math.abs(e.x - cx) > 150 || e.dead || !(e.fight || e.act || e.down || e.hurtT > 0)) continue;
      const J = e.dead ? e.pts : e.J; if (!J) continue;
      add(J[0].x, J[0].y, 10 * e.s); add(J[2].x, J[2].y, 10 * e.s);
    }
    if (typeof eshots !== 'undefined') for (const b of eshots) if (Math.abs(b.x - cx) < 230) add(b.x, b.y, 8);
    for (const t of thrown) if (!t.stuck && Math.abs(t.x - cx) < 230) add(t.x, t.y, 10);
    return sBox = { x0, x1, y0, y1 };
  }
  // the auto zoom (1 = 100 %: 160 world px across): a fight sits between 100 % and 75 %, framed to fit everyone in it;
  // otherwise 75 % walking (or standing), out to 50 % at a full run to see further ahead. (Further out the fighters turn into
  // specks; the menu still offers a fixed 25 %.)
  // the auto camera: cinematics close (100 %), a fight framed at 40-60 %, walking 40 % out to 25 % at a full run
  const cinematic = () => openT >= 0 || !!endPh || !!(enc.boss && enc.boss.intro);   // the opening, the ending, the boss's entrance
  function autoZoom() {
    if (cinematic()) return 1;
    const px = P[2].x, fight = flags.club || enemies.some(e => !e.dead && Math.abs(e.x - px) < 190 && e.zone !== 'arena' || (!e.dead && e === enc.boss && Math.abs(e.x - px) < 260));
    if (fight) {
      const bx = sceneBox();
      return clamp(Math.min(1, 160 / (bx.x1 - bx.x0 + 24), 160 * CH / CW / (bx.y1 - bx.y0 + 20)), 0.4, 0.6);
    }
    const run = hero.mode === 'anim' ? clamp((Math.abs(ctl.spd) - WALK) / (RUN - WALK), 0, 1) : 0;
    return 0.4 - 0.15 * run;
  }
  function updateCamera(rdt) {
    const want = zoomMode === 'auto' ? autoZoom() : zoomMode;
    // the zoom glides: out over about a second, back in a little slower so it never pumps (it eases on the scale, so 100 -> 25 % feels even)
    const cx0 = cam.xf + cam.vw / 2, cy0 = cam.yf + cam.vh / 2;   // zoom about the view centre
    const lz = smoothDamp(Math.log(cam.zoom), Math.log(want), cam.v, 'z', want < cam.zoom ? 0.9 : zoomMode === 'auto' && cinematic() ? 0.35 : 1.3, rdt);   // (a cinematic is short: it closes in fast)
    cam.zoom = clamp(Math.exp(lz), 0.25, 1);
    // [feel] even view sizes: the centre stays on the same pixel as the view grows, so a zoom never jitters by 1 px
    cam.vw = Math.min(CW, 2 * Math.round(80 / cam.zoom)); cam.vh = Math.min(CHMAX, 2 * Math.round(cam.vw * CH / CW / 2));   // (taller than the world when far out: the sky fills the top)
    if (endCam) { cam.xf = endCam.x - cam.vw / 2; cam.yf = clamp(GROUND - 14 - cam.vh * 0.6, 0, H - cam.vh); cam.v.x = cam.v.y = 0; cam.x = Math.round(cam.xf); cam.y = Math.round(cam.yf); return; }   // the ending's street shot
    if (openT >= 0) { cam.xf = OPEN.camX; cam.yf = clamp(GROUND - 14 - cam.vh * 0.6, 0, H - cam.vh); cam.v.x = cam.v.y = 0; cam.x = Math.round(cam.xf); cam.y = Math.round(cam.yf); return; }   // the opening: a locked shot
    const look = hero.mode === 'anim' ? ctl.face * ctl.spd * 0.35 : 0;
    // follow the fighter, but slide so the whole fight stays in view (worked out for the view centre)
    let tx = P[2].x + look, ty = P[2].y + 17 - cam.vh * 0.22;   // his feet about 72 % of the way down the view: more street and roofs, less sky
    const bx = sceneBox();
    tx = bx.x1 - bx.x0 <= cam.vw - 16 ? clamp(tx, bx.x1 - cam.vw / 2 + 8, bx.x0 + cam.vw / 2 - 8) : (bx.x0 + bx.x1) / 2;
    if (isP9() && enc.boss && enc.boss.intro) tx = enc.boss.x - 24;   // Pier 9: the entrance frames him as he walks out of the cold store
    ty = bx.y1 - bx.y0 <= cam.vh - 10 ? clamp(ty, bx.y1 - cam.vh / 2 + 5, bx.y0 + cam.vh / 2 - 5) : (bx.y0 + bx.y1) / 2;
    let cx = smoothDamp(cx0, tx, cam.v, 'x', 0.32, rdt), cy = smoothDamp(cy0, ty, cam.v, 'y', 0.4, rdt);
    cam.xf = cx - cam.vw / 2; cam.yf = cy - cam.vh / 2;
    const lo = flags.club ? CLUB_X : 0, hi = flags.club ? W - cam.vw : Math.min(W, CLUB_X) - cam.vw;
    if (cam.xf < lo || cam.xf > hi) { cam.xf = clamp(cam.xf, lo, hi); cam.v.x *= 0.5; }
    if (cam.vh >= H) { cam.yf = H - cam.vh; cam.v.y = 0; }
    else if (cam.yf < 0 || cam.yf > H - cam.vh) { cam.yf = clamp(cam.yf, 0, H - cam.vh); cam.v.y *= 0.5; }
    cam.x = Math.round(cam.xf); cam.y = Math.round(cam.yf);
  }


  // ---------- canvas sizing ----------
  // the view fills the stage's width; its height fits the window, and the canvas takes that shape
  let scale = 3;
  let Three3D = null;   // filled in below; declared here so fit()'s initial call (before that point) can safely no-op
  function fit() {   // the view fills the window; a window too tall or too wide for it gets black bars
    const vw = AUTOTEST ? 960 : innerWidth || 960, vh = AUTOTEST ? 540 : innerHeight || 540;   // (the autotest frames a fixed 16:9 view)
    const ch = clamp(Math.round(CW * vh / vw), 240, CHMAX);
    if (ch !== CH) { CH = ch; cv.height = CH; ctx.imageSmoothingEnabled = false; }
    let w = vw, h = w * CH / CW; if (h > vh) { h = vh; w = h * CW / CH; }
    Object.assign(stage.style, { width: `${w}px`, height: `${h}px`, left: `${(vw - w) / 2}px`, top: `${(vh - h) / 2}px` });
    scale = w / CW;
    cv.style.height = `${h}px`;
    if (Three3D) Three3D.resize();
  }
  addEventListener('resize', fit); document.addEventListener('fullscreenchange', () => { fit(); if (menuShown) drawMenu(); }); fit();

  // ---------- Three3D: the same game, drawn in 3D ----------
  // The 2D frame stays the source of truth. This view reads the same state and re-uses the 2D art:
  //  - far sky and town: drawSky() + lightPass() into a screen-space background (the 2D parallax, unchanged)
  //  - the street: the stat pixel buffer as the wall and the street floor; the street props (lamps, cars, scaffold) as voxel models
  //  - fighters: slim outlined 3D limbs posed from the same joints; heads are the 2D head pixels extruded into voxels
  //  - objects (crates, barrels, weapons, ammo, the dog...): their own 2D pixels, drawn upright once and made solid
  //    (extruded into voxels, or turned on a lathe for the round ones), then moved and turned like the 2D object
  //  - light: lightList() evaluated per pixel in the shader, so colours match the 2D lightPass
  //  - reflections: the scene mirrored through the wall (for the glass) and through the ground (for the wet street,
  //    puddles and blood pools), blended the way glassReflect() and reflectPass() blend them
  // three.js X = world x, Y = -world y, Z = depth toward the camera (0 = the fight lane).
  // ZF: the wall; ZS: the street's front edge; STAIR, GOAL: how far the fire escape and the roof balcony stand out of the wall (the fight lane is z = 0)
  const T3 = { ZF: -34, ZS: 34, STAIR: 14, GOAL: 12, FOV: 20, PITCH: 16 * Math.PI / 180, PIX: 1, NL: 16 };
  const T3_GROUND = GROUND - 0.5;   // the street surface (feet stand on it)
  // Pier 9's 3D-only numbers: the bollards (as pier9.js paints them), the depth of the conveyor rail and the hall lamps, the chain colour
  const T3P9 = { BOLL: [30, 220, 300, 560, 1150, 1850, 2060], RZ: -8, LZ: -12, CHAIN: C('#4a4a52') };
  const t3rgb = c => new THREE.Color((c & 255) / 255, (c >> 8 & 255) / 255, (c >> 16 & 255) / 255);
  const t3flag = (c, a) => ((c & 0xffffff) | (a << 24)) >>> 0;   // alpha 254: glows (no light); 253: glass or puddle (reflects)
  const t3glow = c => EMIT.has(c) ? t3flag(c, 254) : c;
  const t3L = (o, ...ls) => { o.layers.set(ls[0]); for (const l of ls.slice(1)) o.layers.enable(l); return o; };   // 1: seen in the glass, 2: seen in the street
  const T3U = {   // uniforms shared by every lit 3D material
    amb: { value: new THREE.Vector3(0.5, 0.54, 0.7) },
    lp: { value: Array.from({ length: T3.NL }, () => new THREE.Vector4()) },   // pool centre x, y (world), radius², glow
    lc: { value: Array.from({ length: T3.NL }, () => new THREE.Vector3()) },
    mir: { value: 0 },   // > 0 while drawing the street reflection: the mirror line (world y), so light falls where it would on the real thing
    win: { value: null }, flr: { value: null }, blood: { value: null },
    res: { value: new THREE.Vector2(1, 1) },
    cam: { value: new THREE.Vector4() },   // camX, rain, club, time
    view: { value: 160 },
    lz: { value: new Array(T3.NL).fill(0) },   // each light's depth: a lamp at the kerb, window spill and signs at the wall
  };
  function t3tex(u32, w, h) {
    const t = new THREE.DataTexture(new Uint8Array(u32.buffer, u32.byteOffset, w * h * 4), w, h, THREE.RGBAFormat);
    t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
    return t;
  }
  // a MeshBasicMaterial lit by the lightPass formula; shade adds soft form from the normal; kind 'glass' or 'floor' adds the reflections
  function t3mat(opts, shade, kind = '') {
    const m = new THREE.MeshBasicMaterial(opts);
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, { t3LZ: T3U.lz, t3Amb: T3U.amb, t3LP: T3U.lp, t3LC: T3U.lc, t3Mir: T3U.mir, t3Res: T3U.res, t3Cam: T3U.cam, t3View: T3U.view });
      if (kind === 'glass') sh.uniforms.t3Win = T3U.win;
      if (kind === 'floor') Object.assign(sh.uniforms, { t3Flr: T3U.flr, t3Blood: T3U.blood });
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vT3W;\nvarying vec3 vT3N;')
        .replace('#include <project_vertex>', `#include <project_vertex>
          vec4 t3p = vec4(transformed, 1.0); vec3 t3n = normal;
          #ifdef USE_INSTANCING
            t3p = instanceMatrix * t3p; t3n = mat3(instanceMatrix) * t3n;
          #endif
          vT3W = (modelMatrix * t3p).xyz; vT3N = mat3(modelMatrix) * t3n;`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vT3W; varying vec3 vT3N;
          uniform vec3 t3Amb; uniform vec4 t3LP[${T3.NL}]; uniform vec3 t3LC[${T3.NL}]; uniform float t3LZ[${T3.NL}];
          uniform float t3Mir; uniform vec2 t3Res; uniform vec4 t3Cam; uniform float t3View;
          ${kind === 'glass' ? 'uniform sampler2D t3Win;' : ''}
          ${kind === 'floor' ? 'uniform sampler2D t3Flr; uniform sampler2D t3Blood;' : ''}`)
        .replace('#include <alphatest_fragment>', `#include <alphatest_fragment>
          {
            float t3a = 1.0;
            #ifdef USE_MAP
              t3a = texture2D(map, vMapUv).a;
            #endif
            #ifdef USE_COLOR_ALPHA
              t3a = vColor.a; diffuseColor.a = 1.0;
            #endif
            bool t3g = t3a > 0.99 && t3a < 0.994;   // glass / puddle
            vec2 wp = vec2(vT3W.x, -vT3W.y);
            if (t3Mir > 0.0) wp.y = 2.0 * t3Mir - wp.y;
            ${kind === 'floor' ? `wp.y += clamp((vT3W.z - (${T3.ZF.toFixed(1)})) / ${(T3.ZS - T3.ZF).toFixed(1)}, 0.0, 1.0) * ${(STREET + 1).toFixed(1)};   // row d of the street is lit at GROUND + d, as in 2D` : ''}
            if (t3a > 0.999 || t3g) {
              ${kind === 'glass' ? `if (t3g) {   // drawGlass: a sheen band that slides with the camera, warm light from a lamp nearby
                float band = mod(wp.x * 0.8 + wp.y - t3Cam.x * 0.35, 34.0), sheen = band < 2.0 ? 60.0 : band < 4.0 ? 26.0 : 0.0, warm = 0.0;
                for (int i = 0; i < ${T3.NL}; i++) { vec4 q = t3LP[i]; if (q.w <= 0.0) continue; float d = length(vec2(wp.x - q.x, (wp.y - q.y) * 0.6)); if (d < 46.0) warm += (1.0 - d / 46.0) * 70.0; }
                diffuseColor.rgb = min(diffuseColor.rgb + vec3(sheen + warm, sheen + warm * 0.75, sheen * 1.1 + warm * 0.35) / 255.0, vec3(1.0));
              }` : ''}
              vec3 L = t3Amb; float glow = 0.0;
              for (int i = 0; i < ${T3.NL}; i++) {
                vec4 q = t3LP[i];
                if (q.z <= 0.0) continue;
                vec2 d = wp - q.xy; float d2 = d.x * d.x + d.y * d.y * (d.y < 0.0 ? 2.2 : 0.75), dz = vT3W.z - t3LZ[i];
                if (t3Mir <= 0.0) d2 += dz * dz * 0.6;   // the pool falls off in depth too
                if (d2 < q.z) { float k = 1.0 - d2 / q.z; L += k * k * t3LC[i]; if (q.w > 0.0 && d2 < 90.0) glow += (1.0 - d2 / 90.0) * q.w; }
              }
              ${shade ? 'L *= 0.72 + 0.42 * max(dot(normalize(vT3N), vec3(0.28, 0.56, 0.78)), 0.0);' : ''}
              diffuseColor.rgb = min(diffuseColor.rgb * L + glow / 255.0 * vec3(1.0, 0.78, 0.35), vec3(1.0));
              ${shade === 2 ? `{   // rim light: the edges facing a lamp or a neon sign catch its colour, in two hard steps (pixel-art banding)
                vec3 N = normalize(vT3N), V = normalize(cameraPosition - vT3W); float f = 1.0 - max(dot(N, V), 0.0); f = step(0.45, f) * (0.5 + 0.5 * step(0.7, f));
                vec3 rim = vec3(0.0);
                for (int i = 0; i < ${T3.NL}; i++) { vec4 q = t3LP[i]; if (q.z <= 0.0) continue; vec2 dd = q.xy - wp; float d2 = dot(dd, dd); if (d2 < q.z) rim += t3LC[i] * (1.0 - d2 / q.z) * max(dot(N, normalize(vec3(dd.x, -dd.y, 12.0))), 0.0); }
                diffuseColor.rgb = min(diffuseColor.rgb + f * rim * 0.35, vec3(1.0));
              }` : ''}
              ${kind === 'glass' ? `if (t3g) {   // glassReflect: whatever stands in front shows in the glass, blurred, dimmed and cooled (lighten only)
                vec2 su = gl_FragCoord.xy / t3Res, px = 2.0 / t3Res;
                vec4 r = (texture2D(t3Win, su) * 4.0 + texture2D(t3Win, su + vec2(px.x, 0.0)) + texture2D(t3Win, su - vec2(px.x, 0.0)) + texture2D(t3Win, su + vec2(0.0, px.y)) + texture2D(t3Win, su - vec2(0.0, px.y))) / 8.0;
                if (r.a > 0.06) { float a = 0.5 * r.a; vec3 rc = r.rgb / r.a; diffuseColor.rgb += max(vec3(0.0), (rc * 0.7 + 8.0 / 255.0) * vec3(0.82, 0.9, 1.0) - diffuseColor.rgb) * a; }
              }` : ''}
              ${kind === 'floor' ? `{   // reflectPass: the wet stones mirror the scene faintly, puddles and blood pools clearly; blood turns a reflection red
                float S = ${STREET.toFixed(1)}, d = floor((vT3W.z - (${T3.ZF.toFixed(1)})) / ${(T3.ZS - T3.ZF).toFixed(1)} * (S + 1.0));
                vec2 bu = vec2((mod(wp.x, 1024.0) + 0.5) / 1024.0, (floor(wp.x / 1024.0) * (S + 1.0) + clamp(d, 0.0, S) + 0.5) / (3.0 * (S + 1.0)));
                vec4 bl = texture2D(t3Blood, bu); float bp = bl.r, pb = bl.g, rk = t3Cam.y; bool club = t3Cam.z > 0.5;
                if (d < 0.5) { if (bp > 0.025) diffuseColor.rgb = bp > 0.2 ? vec3(0.541, 0.078, 0.125) : vec3(0.416, 0.063, 0.094); }   // a pool's lip on the curb
                else {
                  bool pud = t3g && !club, bpool = bp > 0.025;
                  float a = club ? 0.38 * (1.0 - d / (S + 6.0)) : (pud || bpool) ? 0.75 : 0.32 * (0.6 + rk * 0.6) * (1.0 - d / (S + 4.0));
                  vec2 su = gl_FragCoord.xy / t3Res;
                  if (pud && !club) su.x += floor(sin(d * 1.9 + t3Cam.w * (3.0 + rk * 8.0) + wp.x * 0.21) * (0.4 + rk * 1.3) + 0.5) / t3View;   // ripples
                  vec4 r = texture2D(t3Flr, su);
                  a *= r.a; vec3 rc = r.a > 0.0 ? r.rgb / r.a : vec3(0.0);
                  vec3 c = diffuseColor.rgb * (1.0 - a) + rc * a * vec3(0.92, 0.94, 1.05) + vec3(0.0, 0.0, a * 10.0 / 255.0);
                  float bk = (bpool ? min(0.95, 0.6 + bp * 0.4) : pud ? pb : 0.0) * (club ? 0.5 : 1.0);
                  if (bk > 0.01) { c.r = c.r * (1.0 - bk * 0.4) + 70.0 / 255.0 * bk; c.g *= 1.0 - bk * 0.85; c.b *= 1.0 - bk * 0.8; }
                  {   // wet-street highlights (WET in the 2D view)
                    vec3 sp = vec3(0.0);
                    for (int i = 0; i < ${T3.NL}; i++) { vec4 q = t3LP[i]; if (q.z <= 0.0) continue; float w = sqrt(q.z) * ${WET.w.toFixed(3)}, dx = abs(wp.x - q.x); if (dx < w) sp += t3LC[i] * (1.0 - dx / w) * (0.35 + 0.65 * d / (S + 1.0)); }
                    float lum = dot(texture2D(map, vMapUv).rgb, vec3(1.0 / 3.0)), st = smoothstep(${WET.dry[0].toFixed(2)}, ${WET.dry[1].toFixed(2)}, lum);
                    float wk = club ? ${WET.kClub.toFixed(2)} : ${WET.k0.toFixed(2)} + rk * ${WET.kRain.toFixed(2)}, th = mod(floor(wp.x), 2.0) * 0.5 + mod(d, 2.0) * 0.25;
                    c += floor(sp * st * wk * 4.0 + th) * ${WET.step.toFixed(3)};
                  }
                  diffuseColor.rgb = min(c, vec3(1.0));
                }
              }` : ''}
            }
          }`);
    };
    m.customProgramCacheKey = () => 't3' + (shade | 0) + kind;
    return m;
  }
  // an upright rectangle in world coordinates (y down), uv v0 = top row, v1 = bottom row
  function t3quad(x0, y0, x1, y1, z, u0, v0, u1, v1) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([x0, -y0, z, x1, -y0, z, x0, -y1, z, x1, -y1, z], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, v0, u1, v0, u0, v1, u1, v1], 2));
    g.setIndex([0, 2, 1, 1, 2, 3]);
    return g;
  }
  // a flat rectangle at height y, from depth z0 (back, uv v0) to z1 (front, uv v1)
  function t3flat(x0, x1, y, z0, z1, u0, v0, u1, v1) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([x0, -y, z0, x1, -y, z0, x0, -y, z1, x1, -y, z1], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([u0, v0, u1, v0, u0, v1, u1, v1], 2));
    g.setIndex([0, 2, 1, 1, 2, 3]);
    return g;
  }
  function t3geo(pos, nor, col, idx) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
    g.setIndex(idx);
    return g;
  }
  const t3rgba = c => [(c & 255) / 255, (c >> 8 & 255) / 255, (c >> 16 & 255) / 255, (c >>> 24) / 255];
  // pixels -> a solid voxel model: every opaque pixel a 1 x 1 column, d deep, centred on (cx, cy); faces merged into runs of one colour
  // skin: an outline pixel keeps its black on the front and back only; its top, bottom and side walls take the colour just inside it
  // (so a tilted model shows no black lid)
  function t3voxels(px, w, h, cx, cy, d, skin = false) {
    const pos = [], nor = [], col = [], idx = [], z0 = -d / 2, z1 = d / 2;
    const at = (i, j) => i >= 0 && j >= 0 && i < w && j < h ? px[j * w + i] : 0;
    const wall = (i, j, ii, jj) => { const c = at(i, j); if (!skin || c !== PAL.out) return c; const n = at(ii, jj); return n && n !== PAL.out ? n : c; };
    const quad = (a, b, c2, e, n, c) => { const v = pos.length / 3, rgba = t3rgba(c); pos.push(...a, ...b, ...c2, ...e); for (let k = 0; k < 4; k++) { nor.push(...n); col.push(...rgba); } idx.push(v, v + 1, v + 2, v, v + 2, v + 3); };
    for (let j = 0; j < h; j++) {
      const yT = cy - j, yB = yT - 1;
      for (let face = 0; face < 3; face++) {   // the front and back as runs along the row; the top and bottom edges as runs too
        const ok = face === 0 ? () => true : face === 1 ? i => !at(i, j - 1) : i => !at(i, j + 1);
        const cf = face === 0 ? i => px[j * w + i] : face === 1 ? i => wall(i, j, i, j + 1) : i => wall(i, j, i, j - 1);
        for (let i = 0; i < w;) {
          const c = cf(i);
          if (!c || !ok(i)) { i++; continue; }
          let k = i + 1; while (k < w && cf(k) === c && ok(k)) k++;
          const x0 = i - cx, x1 = k - cx;
          if (face === 0) { quad([x0, yB, z1], [x1, yB, z1], [x1, yT, z1], [x0, yT, z1], [0, 0, 1], c); quad([x1, yB, z0], [x0, yB, z0], [x0, yT, z0], [x1, yT, z0], [0, 0, -1], c); }
          else if (face === 1) quad([x0, yT, z1], [x1, yT, z1], [x1, yT, z0], [x0, yT, z0], [0, 1, 0], c);
          else quad([x0, yB, z0], [x1, yB, z0], [x1, yB, z1], [x0, yB, z1], [0, -1, 0], c);
          i = k;
        }
      }
    }
    for (let i = 0; i < w; i++) {   // the left and right edges as runs down the column
      const x0 = i - cx, x1 = x0 + 1;
      for (const sd of [-1, 1]) for (let j = 0; j < h;) {
        const c = wall(i, j, i - sd, j);
        if (!c || at(i + sd, j)) { j++; continue; }
        let k = j + 1; while (k < h && wall(i, k, i - sd, k) === c && !at(i + sd, k)) k++;
        const yT = cy - j, yB = cy - k;
        if (sd < 0) quad([x0, yB, z0], [x0, yB, z1], [x0, yT, z1], [x0, yT, z0], [-1, 0, 0], c);
        else quad([x1, yB, z1], [x1, yB, z0], [x1, yT, z0], [x1, yT, z1], [1, 0, 0], c);
        j = k;
      }
    }
    return t3geo(pos, nor, col, idx);
  }
  // pixels -> a round model: each row turned about the vertical axis through cx, its radius the row's half width, its colour the row's middle pixel
  function t3lathe(px, w, h, cx, cy, N = 14) {
    const pos = [], nor = [], col = [], idx = [], rows = [];
    for (let j = 0; j < h; j++) {
      let i0 = -1, i1 = -1;
      for (let i = 0; i < w; i++) if (px[j * w + i]) { if (i0 < 0) i0 = i; i1 = i; }
      rows.push(i0 < 0 ? null : { r: Math.max(cx - i0, i1 + 1 - cx), c: px[j * w + clamp(Math.floor(cx), i0, i1)] || px[j * w + i0] });
    }
    const ring = (rA, yA, rB, yB, ny, c, flipN) => {   // a band between two circles; ny: the normal's y (0: a side wall)
      const rgba = t3rgba(c), v0 = pos.length / 3;
      for (let k = 0; k <= N; k++) {
        const t = k / N * Math.PI * 2, cs = Math.cos(t), sn = Math.sin(t);
        pos.push(rA * cs, yA, rA * sn, rB * cs, yB, rB * sn);
        const nx = ny ? 0 : cs, nz = ny ? 0 : sn;
        nor.push(nx, ny, nz, nx, ny, nz); col.push(...rgba, ...rgba);
      }
      for (let k = 0; k < N; k++) { const a = v0 + k * 2, b = a + 1, c2 = a + 2, d = a + 3; if (flipN) idx.push(a, c2, b, b, c2, d); else idx.push(a, b, c2, b, d, c2); }
    };
    for (let j = 0; j < h; j++) {
      const R = rows[j]; if (!R) continue;
      const yT = cy - j, yB = yT - 1, up = rows[j - 1], dn = rows[j + 1];
      ring(R.r, yT, R.r, yB, 0, R.c, false);
      if (!up || up.r < R.r) ring(up ? up.r : 0, yT, R.r, yT, 1, R.c, true);
      if (!dn || dn.r < R.r) ring(dn ? dn.r : 0, yB, R.r, yB, -1, R.c, false);
    }
    return t3geo(pos, nor, col, idx);
  }
  // a turned model from a profile: each band runs from (r0, y0) to (r1, y1) (y up), coloured c or c(k) per facet k of N;
  // a black shell (out wide, faces turned in) gives it the 2D outline
  function t3turn(bands, N = 20, ph = 0, out = 0.45) {
    const pos = [], nor = [], col = [], idx = [], P = (r, y, t) => [r * Math.cos(t), y, r * Math.sin(t)];
    const pass = shell => {
      for (const B of bands) {
        const dr = B.r1 - B.r0, dy = B.y1 - B.y0, L = Math.hypot(dr, dy) || 1;
        let nr = dy / L, ny = -dr / L;
        if (B.n) { nr = 0; ny = B.n; } else if (nr < 0 || (nr === 0 && ny * (B.y0 + B.y1) < 0)) { nr = -nr; ny = -ny; }
        const g = shell ? out : 0, r0 = B.r0 + (B.r0 || B.n ? g : 0), r1 = B.r1 + (B.r1 || B.n ? g : 0), y0 = B.y0 + (B.n ? B.n * g : 0), y1 = B.y1 + (B.n ? B.n * g : 0);
        for (let k = 0; k < N; k++) {
          const ta = ph + k / N * Math.PI * 2, tb = ph + (k + 1) / N * Math.PI * 2, tm = (ta + tb) / 2;
          const rgba = t3rgba(shell ? PAL.out : typeof B.c === 'function' ? B.c(k) : B.c), v = pos.length / 3;
          const a = P(r0, y0, ta), b = P(r0, y0, tb), c = P(r1, y1, tb), d = P(r1, y1, ta);
          pos.push(...a, ...b, ...c, ...d);
          for (const t of [ta, tb, tb, ta]) { const s = B.flat ? tm : t; nor.push(nr * Math.cos(s), ny, nr * Math.sin(s)); col.push(...rgba); }
          const n = [nr * Math.cos(tm), ny, nr * Math.sin(tm)], e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
          const e = Math.abs(e1[0]) + Math.abs(e1[2]) < 1e-6 ? [d[0] - a[0], d[1] - a[1], d[2] - a[2]] : e1, f = e === e1 ? e2 : [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
          const cx = e[1] * f[2] - e[2] * f[1], cy = e[2] * f[0] - e[0] * f[2], cz = e[0] * f[1] - e[1] * f[0];
          const outw = (cx * n[0] + cy * n[1] + cz * n[2] > 0) !== shell;
          if (outw) idx.push(v, v + 1, v + 2, v, v + 2, v + 3); else idx.push(v, v + 2, v + 1, v, v + 3, v + 2);
        }
      }
    };
    pass(false); if (out) pass(true);
    return t3geo(pos, nor, col, idx);
  }
  function t3merge(a, b) {   // two t3geo models as one
    const at = (g, k) => Array.from(g.attributes[k].array), n = a.attributes.position.count;
    return t3geo([...at(a, 'position'), ...at(b, 'position')], [...at(a, 'normal'), ...at(b, 'normal')], [...at(a, 'color'), ...at(b, 'color')], [...Array.from(a.index.array), ...Array.from(b.index.array).map(i => i + n)]);
  }

  // ----- heads: a sculpted skull (a rounded box, flat on top, square at the jaw) in the head's own frame: x toward the face (fw),
  // y up, z across. col(fw, up, z, par) paints it, the 2D colour rules seen from the side (hair, stubble, beard...) carried round
  // the skull, with the eyes, brows and mouth placed on the front. Flat-shaded faces keep a pixel-art read; a black shell outlines it.
  function t3skull(o) {
    const NV = 20, NU = 32, pos = [], nor = [], col = [], idx = [];
    const sp = (c, e) => Math.sign(c) * Math.pow(Math.abs(c), e);
    const P = (v, u, g) => {   // g: grow (the outline shell)
      const cv = Math.cos(v), sv = Math.sin(v), jaw = v < 0 ? 1 - 0.2 * Math.pow(-sv, 1.5) : 1;
      return [(o.HW + g) * sp(cv, 0.55) * sp(Math.cos(u), 0.7) * (v < 0 ? 1 - 0.08 * -sv : 1), (v > 0 ? o.HU + g : o.HD + g) * sp(sv, 0.55), (o.W + g) * jaw * sp(cv, 0.55) * sp(Math.sin(u), 0.7)];
    };
    const pass = g => {
      for (let i = 0; i < NV; i++) for (let j = 0; j < NU; j++) {
        const v0 = -Math.PI / 2 + i / NV * Math.PI, v1 = v0 + Math.PI / NV, u0 = -Math.PI + j / NU * 2 * Math.PI, u1 = u0 + 2 * Math.PI / NU;
        const a = P(v0, u0, g), b = P(v0, u1, g), c = P(v1, u1, g), d = P(v1, u0, g);
        const m = P((v0 + v1) / 2, (u0 + u1) / 2, 0), color = g ? PAL.out : o.col(m[0], m[1], m[2], (i + j) & 1);
        let n = [(b[1] - a[1]) * (d[2] - a[2]) - (b[2] - a[2]) * (d[1] - a[1]), (b[2] - a[2]) * (d[0] - a[0]) - (b[0] - a[0]) * (d[2] - a[2]), (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0])];
        if (Math.hypot(...n) < 1e-9) n = [(c[1] - b[1]) * (d[2] - b[2]) - (c[2] - b[2]) * (d[1] - b[1]), (c[2] - b[2]) * (d[0] - b[0]) - (c[0] - b[0]) * (d[2] - b[2]), (c[0] - b[0]) * (d[1] - b[1]) - (c[1] - b[1]) * (d[0] - b[0])];
        let L = Math.hypot(...n) || 1; n = n.map(q => q / L);
        if (n[0] * m[0] + n[1] * m[1] + n[2] * m[2] < 0) n = n.map(q => -q);   // outward
        const rgba = t3rgba(color), k = pos.length / 3;
        for (const p of [a, b, c, d]) { pos.push(...p); nor.push(...(g ? n.map(q => -q) : n)); col.push(...rgba); }
        const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
        const ccw = cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] >= 0;
        if (ccw !== !!g) idx.push(k, k + 1, k + 2, k, k + 2, k + 3); else idx.push(k, k + 2, k + 1, k, k + 3, k + 2);
      }
    };
    pass(0); pass(o.ow);
    let geo = t3geo(pos, nor, col, idx);
    for (const x of o.parts || []) geo = t3merge(geo, x);
    return geo;
  }
  // the features every head shares: the nose and two ears (k: the head's scale)
  const t3face = (o, k, skin, skinB) => [
    t3box(o.HW - 0.4 * k, -0.9 * k, -0.45 * k, o.HW + 0.8 * k, 0.5 * k, 0.45 * k, skinB, 0.22),                       // the nose
    t3box(-0.9 * k, -1.5 * k, o.W - 0.3 * k, 0.3 * k, 0.6 * k, o.W + 0.35 * k, skin, 0.22),                          // the ears
    t3box(-0.9 * k, -1.5 * k, -o.W - 0.35 * k, 0.3 * k, 0.6 * k, -o.W + 0.3 * k, skin, 0.22),
  ];
  // the hero: dark hair swept back off the brow, a square jaw with stubble, a thin mustache, sideburns (drawHead's rules)
  function t3heroHead(look) {
    const o = { HW: 3.6, HU: 4.6, HD: 4.0, W: 2.9, ow: 0.45 };
    o.col = (fw, up, z, par) => {
      const front = fw > 2.4, az = Math.abs(z);
      if (front && up > 0.1 && up < 1.1 && az > 0.55 && az < 1.6) return look === 'ko' ? PAL.out : (az > 1.25 ? PAL.white : PAL.out);   // the eyes
      if (front && up >= 1.3 && up < 2.0 && az > 0.4 && az < 1.8) return PAL.hairD;                                             // the brows
      if (look !== 'ok' && front && up > -3.3 && up < -2.4 && az < 0.9) return PAL.out;                                          // a mouth open in pain
      const hairy = up > 2.9 - Math.max(0, -fw) * 0.7 || fw < -1.6 || (fw < 0.2 && up > 1.4);
      if (hairy) return up > 3.9 && fw > -1.2 ? PAL.hairL : PAL.hair;
      if (fw > 1.5 && up > -1.6 && up < -0.8 && az < 1.7) return PAL.hairD;   // the mustache
      if (fw < -0.4 && up < 1.4 && up > -1.4) return PAL.hair;                // the sideburns
      if (up < -2.3 || (fw < 0.2 && up < -1.2)) return par ? PAL.stub : PAL.skinB;   // stubble on the jaw and chin
      return PAL.skin;
    };
    o.parts = t3face(o, 1, PAL.skin, PAL.skinB);
    return t3skull(o);
  }
  // a goon: the same skull at his scale, painted by eHeadPx (hair, cap, hood, beard, scar); the parts that stand off it built solid
  function t3goonHead(e, glow, dead) {
    const k = e.hk * e.s, p = e.pal, o = { HW: 3.6 * k, HU: 4.6 * k, HD: 4.0 * k, W: 2.9 * k, ow: 0.45 };
    o.col = (fw, up, z, par) => {
      const front = fw > 2.4 * k, az = Math.abs(z);
      if (front && up > 0.1 * k && up < 1.1 * k && az > 0.55 * k && az < 1.6 * k) return dead ? PAL.out : glow ? BLOOD[2] : PAL.out;   // the eyes (red when he winds up)
      if (front && up >= 1.3 * k && up < 2.0 * k && az > 0.4 * k && az < 1.8 * k) return e.hair === 'bald' ? p.skinB : p.hair;          // the brows
      const c = eHeadPx(e, clamp(fw, -o.HW + 0.01, o.HW - 0.01), clamp(up, -o.HD + 0.01, o.HU - 0.01), par);
      return c || p.skin;
    };
    const X = [], hair = e.hair, bd = e.beard, HW = o.HW, HU = o.HU, HD = o.HD, W = o.W;
    if (hair === 'mohawk') X.push(t3box(-2.6 * k, HU - 0.4, -0.6 * k, k, HU + 2.4 * k, 0.6 * k, p.loud, 0.3));
    if (hair === 'cap') X.push(t3box(HW - 0.3, 1.4 * k, -W * 0.9, HW + 2.2 * k, 2.2 * k, W * 0.9, p.topB, 0.3));   // the brim
    if (hair === 'souwester') X.push(t3box(-HW - 1.2 * k, 1.5 * k, -W - 1.6 * k, HW + 1.8 * k, 2.3 * k, W + 1.6 * k, p.hatB, 0.3), t3box(-HW - 1.4 * k, -2 * k, -W * 0.95, -HW + 0.4, 2.4 * k, W * 0.95, p.hat, 0.3));   // the sou'wester's brim all round, the flap down the back
    if (hair === 'hood') X.push(t3box(-HW - k, -k, -W - 0.7 * k, -HW + 1.2 * k, HU - 0.3 * k, W + 0.7 * k, p.top, 0.3), t3box(-HW, HU - 0.6 * k, -W - 0.7 * k, 0.8 * k, HU + 0.4 * k, W + 0.7 * k, p.top, 0.3));
    if (bd === 'huge') X.push(t3box(-1.6 * k, -HD - 3.4 * k, -W * 0.75, HW + 0.4, -HD + 0.6 * k, W * 0.75, p.hair, 0.3));
    if (bd === 'full') X.push(t3box(-0.6 * k, -HD - 1.2 * k, -W * 0.8, HW - 0.4 * k, -HD + 0.6 * k, W * 0.8, p.hair, 0.3));
    if (bd === 'stache' || bd === 'huge') X.push(t3box(HW - 0.4 * k, -2.8 * k, -1.5 * k, HW + 1.1 * k, -1.1 * k, 1.5 * k, p.hair, 0.25));
    o.parts = [...t3face(o, k, p.skin, p.skinB), ...X];
    return t3skull(o);
  }
  // a box (three.js coordinates) with a black shell ow thicker, its faces turned in (the 2D outline)
  function t3box(x0, y0, z0, x1, y1, z1, c, ow = 0.3) {
    const pos = [], nor = [], col = [], idx = [];
    const add = (a, b, cc, out) => {
      const [X0, Y0, Z0] = a, [X1, Y1, Z1] = b, rgba = t3rgba(cc);
      const F = [[[X0, Y0, Z1], [X1, Y0, Z1], [X1, Y1, Z1], [X0, Y1, Z1], [0, 0, 1]], [[X1, Y0, Z0], [X0, Y0, Z0], [X0, Y1, Z0], [X1, Y1, Z0], [0, 0, -1]],
        [[X0, Y1, Z1], [X1, Y1, Z1], [X1, Y1, Z0], [X0, Y1, Z0], [0, 1, 0]], [[X0, Y0, Z0], [X1, Y0, Z0], [X1, Y0, Z1], [X0, Y0, Z1], [0, -1, 0]],
        [[X1, Y0, Z1], [X1, Y0, Z0], [X1, Y1, Z0], [X1, Y1, Z1], [1, 0, 0]], [[X0, Y0, Z0], [X0, Y0, Z1], [X0, Y1, Z1], [X0, Y1, Z0], [-1, 0, 0]]];
      for (const [p0, p1, p2, p3, n] of F) {
        const v = pos.length / 3; pos.push(...p0, ...p1, ...p2, ...p3);
        for (let k = 0; k < 4; k++) { nor.push(...n); col.push(...rgba); }
        if (out) idx.push(v, v + 2, v + 1, v, v + 3, v + 2); else idx.push(v, v + 1, v + 2, v, v + 2, v + 3);
      }
    };
    add([x0, y0, z0], [x1, y1, z1], c, false);
    if (ow) add([x0 - ow, y0 - ow, z0 - ow], [x1 + ow, y1 + ow, z1 + ow], PAL.out, true);
    return t3geo(pos, nor, col, idx);
  }
  // a rod along +x from a to b, radius r, N facets, coloured c (or c(k) per facet), with an outline shell
  const t3rod = (a, b, r, c, N = 8, y = 0, z = 0, ow = 0.3) => t3turn([{ r0: r, y0: a, r1: r, y1: b, c, flat: N < 7 ? 1 : 0 }, { r0: 0, y0: a, r1: r, y1: a, n: -1, c: typeof c === 'function' ? c(0) : c }, { r0: 0, y0: b, r1: r, y1: b, n: 1, c: typeof c === 'function' ? c(0) : c }], N, 0, ow).rotateZ(-Math.PI / 2).translate(0, y, z);
  const t3all = parts => parts.reduce((a, b) => t3merge(a, b));
  // the weapons, built by hand to the 2D shapes (drawWeaponShape, eDrawWeapon): the grip (or the butt) at the origin, +x along the
  // weapon, -y its edge side (or underneath, for a gun); L: the length in px for a goon's weapon
  function t3weaponGeo(id, pk = 0, L = 0) {
    if (id === 'katana') {
      const len = WEAPONS[1].len;
      return t3all([
        t3rod(-3.2, 0, 0.7, k => k % 2 ? PAL.hilt : PAL.out, 6),           // the wrapped grip
        t3rod(-3.6, -3.2, 0.75, PAL.gold, 6),                              // the pommel cap
        t3rod(0.3, 0.9, 1.6, PAL.gold, 10),                                // the tsuba
        t3box(0.9, -0.15, -0.22, len - 1.5, 0.5, 0.22, PAL.blade, 0.25),   // the blade's back
        t3box(0.9, -0.55, -0.14, len - 1.5, -0.15, 0.14, PAL.bladeD, 0.25), // its bright edge
        t3box(len - 1.5, -0.4, -0.16, len, 0.25, 0.16, PAL.blade, 0.25),   // the kissaki
      ]);
    }
    if (id === 'axe') {
      const len = WEAPONS[2].len;
      return t3all([
        t3rod(-2, len, 0.6, PAL.wood, 8),
        t3box(len - 4, -4.3, -0.8, len - 1, 0.6, 0.8, PAL.steel, 0.3),     // the head
        t3box(len - 4.7, -5.4, -0.3, len - 0.3, -4.3, 0.3, PAL.blade, 0.3), // the flared edge
        t3box(len - 3.2, 0.6, -0.6, len - 1.8, 1.6, 0.6, PAL.steel, 0.3),  // the poll
      ]);
    }
    if (id === 'shotgun') {
      const len = WEAPONS[3].len, pump = WEAPONS[3].forend - 3 * pk;
      return t3all([
        t3box(0, -1.9, -0.75, 4.5, 0.5, 0.75, PAL.wood, 0.3),               // the stock
        t3box(4.5, -1.2, -0.85, 7.5, 1.0, 0.85, PAL.gunM, 0.3),             // the receiver
        t3rod(7.5, len, 0.55, PAL.gunD, 8, 0.3),                            // the barrel
        t3rod(7.5, len - 1, 0.45, PAL.gunD, 8, -0.7),                       // the magazine tube
        t3box(pump - 1.8, -1.9, -0.8, pump + 1.8, -0.3, 0.8, PAL.wood, 0.3), // the pump
        t3box(5, -2.2, -0.2, 6.2, -1.2, 0.2, PAL.out, 0),                   // the trigger guard
      ]);
    }
    if (id === 'mg') {
      const len = WEAPONS[4].len;
      return t3all([
        t3box(0, -1.4, -0.7, 4, 0.4, 0.7, PAL.gunD, 0.3),                   // the stock
        t3box(4, -1.4, -0.9, 12, 1.2, 0.9, PAL.gunM, 0.3),                  // the body
        t3box(5, 1.2, -0.25, 11, 1.7, 0.25, PAL.steel, 0.25),               // the top rail
        t3rod(12, len, 0.5, PAL.gunD, 8, 0.1),                              // the barrel
        t3rod(len - 1.2, len, 0.75, PAL.gunD, 8, 0.1),                      // the muzzle brake
        t3box(7.2, -5.2, -0.55, 8.8, -1.4, 0.55, PAL.gunD, 0.3),            // the magazine
      ]);
    }
    if (id === 'pistol') return t3all([t3box(0, -0.6, -0.5, L, 0.7, 0.5, ECOL.gun, 0.3), t3box(-0.3, -3, -0.45, 1.4, -0.6, 0.45, ECOL.gun, 0.3)]);   // slide and grip
    if (id === 'pipe') return t3rod(0, L, 0.9, ECOL.iron, 8);
    if (id === 'cleaver') return t3all([t3rod(0, 2.5, 0.6, ECOL.grip, 6), t3box(2.5, -3.0, -0.22, L, 0.2, 0.22, ECOL.steelD, 0.3), t3box(2.5, -3.4, -0.12, L, -3.0, 0.12, ECOL.steel, 0.2)]);   // a square cleaver: a deep blade under the grip line
    if (id === 'gaff') return t3all([t3rod(-3, L, 0.5, PAL.wood, 6), t3rod(L, L + 2, 0.4, ECOL.steel, 6), t3box(L + 1.6, -2.5, -0.3, L + 2.2, 0, 0.3, ECOL.steel, 0.2), t3box(L + 0.6, -2.9, -0.3, L + 2.2, -2.3, 0.3, ECOL.steel, 0.2)]);   // a pole with a steel hook
    if (id === 'machete') return t3all([t3rod(0, 2.5, 0.6, ECOL.grip, 6), t3box(2.5, -1.1, -0.18, L, 0.9, 0.18, ECOL.steelD, 0.3), t3box(2.5, -1.5, -0.12, L - 0.5, -1.1, 0.12, ECOL.steel, 0.25)]);
    return t3all([t3rod(0, 1.8, 0.5, ECOL.grip, 6), t3box(1.8, -0.5, -0.12, L, 0.4, 0.12, ECOL.steel, 0.25)]);   // a knife
  }
  // ----- the vehicles, modelled from the 2D side profile (VPARTS): a lofted body with a rounded shoulder, a narrower glasshouse
  // with real glass, tyres, bumpers, lights, door lines, mirrors and an interior. Built in world x, y (y down) and z.
  function t3mb() {   // a small mesh builder: quads with a colour each (alpha 254 = glows), outward faces wound from the normal
    const pos = [], nor = [], col = [], idx = [], B = {};
    B.quad = (a, b, c, d, color, n) => {
      const P = [a, b, c, d].map(p => [p[0], -p[1], p[2]]), v = pos.length / 3, rgba = t3rgba(color);
      const e1 = [P[1][0] - P[0][0], P[1][1] - P[0][1], P[1][2] - P[0][2]], e2 = [P[3][0] - P[0][0], P[3][1] - P[0][1], P[3][2] - P[0][2]];
      let N = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]], L = Math.hypot(...N);
      if (L < 1e-9) { const e3 = [P[2][0] - P[1][0], P[2][1] - P[1][1], P[2][2] - P[1][2]]; N = [e3[1] * e2[2] - e3[2] * e2[1], e3[2] * e2[0] - e3[0] * e2[2], e3[0] * e2[1] - e3[1] * e2[0]]; L = Math.hypot(...N); }
      if (L < 1e-9) return;
      N = N.map(q => q / L);
      const flip = n && N[0] * n[0] + N[1] * -n[1] + N[2] * n[2] < 0;   // n: the wanted outward direction (world, y down)
      if (flip) N = N.map(q => -q);
      for (const p of P) { pos.push(...p); nor.push(...N); col.push(...rgba); }
      if (flip) idx.push(v, v + 3, v + 2, v, v + 2, v + 1); else idx.push(v, v + 1, v + 2, v, v + 2, v + 3);
    };
    B.box = (x0, y0, z0, x1, y1, z1, c) => {
      B.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], c, [0, 0, 1]); B.quad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], c, [0, 0, -1]);
      B.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], c, [0, -1, 0]); B.quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], c, [0, 1, 0]);
      B.quad([x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1], c, [-1, 0, 0]); B.quad([x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], c, [1, 0, 0]);
    };
    B.geo = () => pos.length ? t3geo(pos, nor, col, idx) : null;
    return B;
  }
  const t3sh = (c, k) => { const r = Math.min(255, (c & 255) * k), g = Math.min(255, (c >> 8 & 255) * k), b = Math.min(255, (c >> 16 & 255) * k); return (255 << 24 | b << 16 | g << 8 | r) >>> 0; };
  // a tyre and its wheel, axle along z, centred at (x, y world, z): tread, sidewalls, a rim with spokes, the hub
  function t3wheel(x, y, z, r, wd) {
    const tyre = C('#16151c'), wall = C('#24232c'), rim = C('#8a8c99'), hub = C('#c8ccd8');
    const g = t3turn([
      { r0: r, y0: -wd / 2, r1: r, y1: wd / 2, c: k => k % 2 ? tyre : C('#1d1c24'), flat: 1 },
      { r0: r * 0.62, y0: wd / 2, r1: r, y1: wd / 2, n: 1, c: wall }, { r0: r * 0.62, y0: -wd / 2, r1: r, y1: -wd / 2, n: -1, c: wall },
      { r0: r * 0.22, y0: wd / 2 - 0.3, r1: r * 0.62, y1: wd / 2 - 0.3, n: 1, c: k => k % 3 ? rim : C('#4a4c58') },   // the rim and its spokes, set in
      { r0: 0, y0: wd / 2 - 0.1, r1: r * 0.22, y1: wd / 2 - 0.1, n: 1, c: hub },
      { r0: r * 0.62, y0: wd / 2 - 0.3, r1: r * 0.62, y1: wd / 2, c: C('#3a3a46') },
    ], 16, 0, 0.35);
    return g.rotateX(Math.PI / 2).translate(x, -y, z);
  }
  // returns { body, glass } geometries for one VPARTS entry, between depths z0 (the wall side) and z1 (the street side)
  function t3vehicle(V, z0, z1) {
    const B = t3mb(), G = t3mb(), zc = (z0 + z1) / 2, hw = (z1 - z0) / 2 - 0.5, under = C('#121118'), inner = C('#1a1820'), seat = C('#2a2430'), chrome = C('#b8bccb');
    const parts = [];
    if (V.car) {
      const c = V.car, col = c.col, hi = t3sh(col, 1.25), lo = t3sh(col, 0.68), g0 = c.box ? c.cx0 : c.cx0 - c.rs, g1 = c.cx1 + c.ws;
      const cabin = x => x >= g0 && x <= g1, lowTop = x => cabin(x) ? c.beltY : c.top(x);
      const ch = 1.6;   // the rounded shoulder: the side turns in this far over the top
      // the underside: the sill, arched over each wheel, but never up through the bonnet (a low bonnet keeps a strip of wing over the tyre)
      const bot = x => { let y = c.sill; for (const [wx, wr] of c.wheels) { const dx = x - wx; if (Math.abs(dx) < wr + 2.2) y = Math.min(y, GROUND - wr - 1 - Math.sqrt(Math.max(0, (wr + 2.2) ** 2 - dx * dx))); } return Math.max(y, lowTop(x) + ch + 0.8); };
      for (let x = c.L; x < c.R; x++) {
        const xa = x, xb = x + 1, ta = lowTop(xa), tb = lowTop(xb), ba = bot(xa), bb = bot(xb);
        for (const sd of [1, -1]) {
          const zs = zc + sd * hw, zi = zc + sd * (hw - ch), n = [0, 0, sd];
          const rk = c.sill - 4;   // the rocker below this line is darker
          if (Math.min(ba, bb) > rk) B.quad([xa, ba, zs], [xb, bb, zs], [xb, Math.min(bb, rk), zs], [xa, Math.min(ba, rk), zs], lo, n);
          else B.quad([xa, Math.min(ba, rk), zs], [xb, Math.min(bb, rk), zs], [xb, Math.min(bb, rk), zs], [xa, Math.min(ba, rk), zs], lo, n);
          if (Math.max(ta, tb) + ch < rk) B.quad([xa, Math.min(ba, rk), zs], [xb, Math.min(bb, rk), zs], [xb, tb + ch, zs], [xa, ta + ch, zs], col, n);
          B.quad([xa, ta + ch, zs], [xb, tb + ch, zs], [xb, tb, zi], [xa, ta, zi], hi, [0, -1, sd]);   // the shoulder
          B.quad([xa, ba, zs], [xb, bb, zs], [xb, bb, zc], [xa, ba, zc], under, [0, 1, 0]);             // underneath (seen in the arches)
        }
        B.quad([xa, ta, zc - hw + ch], [xb, tb, zc - hw + ch], [xb, tb, zc + hw - ch], [xa, ta, zc + hw - ch], cabin(x + 0.5) ? inner : col, [0, -1, 0]);   // the bonnet, the boot, or the cabin floor
      }
      for (const [x, sd] of [[c.L, -1], [c.R, 1]]) {   // the two ends
        const t = lowTop(x), b = bot(x);
        B.quad([x, b, zc - hw], [x, b, zc + hw], [x, t + ch, zc + hw], [x, t + ch, zc - hw], lo, [sd, 0, 0]);
        B.quad([x, t + ch, zc - hw], [x, t + ch, zc + hw], [x, t, zc + hw - ch], [x, t, zc - hw + ch], col, [sd, -1, 0]);
      }
      // the glasshouse: tumblehome from the belt to the roof; glass in the openings, the roof and the pillars in the body colour
      const gw0 = hw - ch, gw1 = hw - 4.6, inGlass = x => x > g0 + 1 && x < g1 - 1 && Math.abs(x + 0.5 - c.pillar) > 1.2;
      for (let x = g0; x < g1; x++) {
        const ra = c.top(x), rb = c.top(x + 1), flat = x >= c.cx0 && x + 1 <= c.cx1;
        for (const sd of [1, -1]) {
          const a = [x, c.beltY, zc + sd * gw0], b = [x + 1, c.beltY, zc + sd * gw0], cc = [x + 1, rb + 0.8, zc + sd * gw1], d = [x, ra + 0.8, zc + sd * gw1];
          (inGlass(x) ? G : B).quad(a, b, cc, d, inGlass(x) ? 0xff000000 : col, [0, 0, sd]);
          B.quad(d, cc, [x + 1, rb, zc + sd * (gw1 - 0.6)], [x, ra, zc + sd * (gw1 - 0.6)], col, [0, -1, sd]);   // the rain gutter along the roof
        }
        (flat ? B : G).quad([x, ra, zc - gw1 + 0.6], [x + 1, rb, zc - gw1 + 0.6], [x + 1, rb, zc + gw1 - 0.6], [x, ra, zc + gw1 - 0.6], flat ? hi : 0xff000000, [x < c.cx0 ? -1 : x >= c.cx1 ? 1 : 0, -1, 0]);   // the roof, or the windscreen and the rear window
      }
      // inside, fitted out: the car faces +x, so the front seats are ahead of the door pillar and the back bench behind it;
      // the dashboard under the screen with its gauges, the steering wheel on its column, a console, door panels, a parcel shelf
      const sx = c.pillar, dash = g1 - c.ws, trim = C('#3a3038'), seatL = C('#3a3240'), rd = t3sh(col, 0.45);
      const seatAt = (x0, z0, z1) => {   // a bucket seat facing forward: cushion, back (leaning back), headrest
        B.box(x0, c.beltY - 2.5, Math.min(z0, z1), x0 + 5.5, c.beltY + 0.5, Math.max(z0, z1), seat);
        B.box(x0 - 0.2, c.beltY - 10, Math.min(z0, z1) + 0.3, x0 + 1.4, c.beltY - 2.5, Math.max(z0, z1) - 0.3, seatL);
        B.box(x0 + 0.1, c.beltY - 13, Math.min(z0, z1) + 1.2, x0 + 1.2, c.beltY - 10, Math.max(z0, z1) - 1.2, seat);
      };
      for (const sz of [-1, 1]) seatAt(sx + 1, zc + sz * 0.9, zc + sz * (gw1 - 0.6));
      if (!c.box && sx - g0 > 9) {   // the back bench and the shelf under the rear window
        const bx = Math.max(g0 + 1, sx - 9);
        B.box(bx + 1.5, c.beltY - 2.5, zc - gw1 + 0.6, sx - 1.5, c.beltY + 0.5, zc + gw1 - 0.6, seat);
        B.box(bx, c.beltY - 9, zc - gw1 + 0.6, bx + 1.6, c.beltY - 2.5, zc + gw1 - 0.6, seatL);
        B.box(g0, c.beltY - 1, zc - gw1, bx, c.beltY + 0.2, zc + gw1, trim);
      }
      B.box(dash - 1, c.beltY - 3, zc - gw0 + 0.4, dash + 3, c.beltY + 0.5, zc + gw0 - 0.4, inner);   // the dashboard
      B.box(dash - 1.3, c.beltY - 3.6, zc + gw1 * 0.15, dash - 0.9, c.beltY - 2.4, zc + gw1 * 0.75, t3flag(C('#c08a3a'), 254));   // its gauges, lit
      B.box(dash - 1.2, c.beltY - 3.4, zc - gw1 * 0.6, dash - 0.9, c.beltY - 2.6, zc - gw1 * 0.2, t3flag(C('#3a8a9a'), 254));     // the radio
      B.box(sx + 7, c.beltY - 1.5, zc - 1.2, dash - 1, c.beltY + 0.4, zc + 1.2, trim);   // the console
      B.box(sx + 8, c.beltY - 4, zc - 0.3, sx + 8.6, c.beltY - 1.5, zc + 0.3, C('#0e0d12'));   // the gear lever
      for (const sd of [1, -1]) {   // the door panels and the sill trim inside the glass
        B.box(g0 + 1, c.beltY - 2.2, Math.min(zc + sd * (gw0 - 0.9), zc + sd * (gw0 - 0.2)), g1 - 1, c.beltY + 0.2, Math.max(zc + sd * (gw0 - 0.9), zc + sd * (gw0 - 0.2)), trim);
        B.box(g0 + 1, c.beltY - 2.6, Math.min(zc + sd * (gw0 - 0.5), zc + sd * gw0), g1 - 1, c.beltY - 2.2, Math.max(zc + sd * (gw0 - 0.5), zc + sd * gw0), rd);
      }
      const wz = zc + gw1 * 0.45;   // the steering wheel and its column, on the street side
      B.box(dash - 3, c.beltY - 3.2, wz - 0.3, dash - 0.8, c.beltY - 2.6, wz + 0.3, C('#0e0d12'));
      parts.push(t3turn([{ r0: 1.7, y0: -0.25, r1: 1.7, y1: 0.25, c: C('#0e0d12') }, { r0: 0.4, y0: 0.25, r1: 1.7, y1: 0.25, n: 1, c: C('#1c1a22') }, { r0: 0, y0: 0.3, r1: 0.4, y1: 0.3, n: 1, c: C('#5a5866') }], 12, 0, 0).rotateZ(Math.PI / 2 - 0.5).translate(dash - 3.3, -(c.beltY - 4.5), wz));
      // bumpers, lights, the grille, door lines and handles, the mirrors
      for (const [x0, x1] of [[c.L - 1.5, c.L + 5], [c.R - 5, c.R + 1.5]]) B.box(x0, c.sill - 3.2, zc - hw - 0.6, x1, c.sill - 1.2, zc + hw + 0.6, chrome);
      for (const sz of [-1, 1]) {
        B.box(c.R - 1.2, c.beltY + 2, zc + sz * (hw - 4.5), c.R + 0.4, c.beltY + 4, zc + sz * (hw - 1), t3flag(LAMP_GLASS, 254));   // headlights
        B.box(c.L - 0.4, c.beltY + 2, zc + sz * (hw - 4), c.L + 1, c.beltY + 4.5, zc + sz * (hw - 0.8), t3flag(C('#d02a2a'), 254));   // tail lights
      }
      B.box(c.R - 0.6, c.beltY + 4.5, zc - hw + 5, c.R + 0.5, c.sill - 4, zc + hw - 5, C('#1c1b24'));   // the grille
      for (const sd of [1, -1]) {
        const zs = zc + sd * (hw + 0.05), zt = zc + sd * (hw + 0.25);
        B.box(c.pillar - 0.3, c.beltY + 2, Math.min(zs, zt), c.pillar + 0.3, c.sill - 3, Math.max(zs, zt), t3sh(col, 0.55));
        B.box(c.pillar + 2.5, c.beltY + 3.5, Math.min(zs, zt + sd * 0.3), c.pillar + 4, c.beltY + 4.3, Math.max(zs, zt + sd * 0.3), chrome);
        const mx = g1 - c.ws + 1;
        B.box(mx, c.beltY - 3, Math.min(zc + sd * hw, zc + sd * (hw + 1.8)), mx + 2.2, c.beltY - 0.8, Math.max(zc + sd * hw, zc + sd * (hw + 1.8)), col);   // a wing mirror
        if (c.box) {   // the van: the sliding door's lines and the firm's red stripe
          const sd0 = c.cx0 - 26, zz = [Math.min(zs, zt), Math.max(zs, zt)];
          B.box(sd0 - 0.3, c.roofY + 4, zz[0], sd0 + 0.3, c.sill - 3, zz[1], t3sh(col, 0.6));
          B.box(c.L + 5, c.roofY + 9, zz[0], sd0 - 3, c.roofY + 11, zz[1], C('#a01c2c'));
        }
      }
      for (const [wx, wr] of c.wheels) {
        for (const sd of [1, -1]) parts.push(t3wheel(wx, GROUND - wr - 1, zc + sd * (hw - 2), wr, 3.4));
        let lt = GROUND - 2 * wr - 3.5; for (let x = wx - wr - 2; x <= wx + wr + 2; x++) lt = Math.max(lt, lowTop(x) + ch + 0.8);
        B.box(wx - wr - 2, lt, zc - hw + 4, wx + wr + 2, c.sill, zc + hw - 4, under);   // the wheel well's liner and the axle, under the bonnet: no seeing through the arch
      }
    }
    if (V.bed) {   // the pickup's bed under its canvas tilt
      const b = V.bed, lo = t3sh(b.col, 0.68);
      const [bwx, bwr] = b.wheel, ax0 = bwx - bwr - 2, ax1 = bwx + bwr + 2, archTop = GROUND - 2 * bwr - 3;
      B.box(b.x0, b.top, zc - hw, b.x1, archTop, zc + hw, b.col);   // the bed above the wheel, then the sides around the wheel arch
      for (const [x0, x1] of [[b.x0, ax0], [ax1, b.x1]]) if (x1 > x0) { B.box(x0, archTop, zc - hw, x1, GROUND - 9, zc + hw, b.col); B.box(x0 - 0.4, GROUND - 9, zc - hw - 0.1, x1 + 0.4, GROUND - 5, zc + hw + 0.1, lo); }
      B.box(ax0, archTop, zc - hw + 4, ax1, GROUND - 5, zc + hw - 4, under);   // the wheel well
      B.box(b.x0 - 1, GROUND - 8, zc - hw - 0.6, b.x0 + 4, GROUND - 6, zc + hw + 0.6, chrome);
      const R0 = 3;   // the tilt: straight sides, a rounded top over the hoops
      for (let x = b.x0 + 1; x < b.x1; x++) {
        const c0 = (x - b.x0) % 10 === 0 ? t3sh(b.tc, 0.66) : b.tc, h = b.top - b.tilt;
        for (const sd of [1, -1]) {
          B.quad([x, b.top, zc + sd * (hw - 0.5)], [x + 1, b.top, zc + sd * (hw - 0.5)], [x + 1, b.tilt + R0, zc + sd * (hw - 0.5)], [x, b.tilt + R0, zc + sd * (hw - 0.5)], c0, [0, 0, sd]);
          const segs = 4;
          for (let k = 0; k < segs; k++) {
            const a0 = k / segs * Math.PI / 2, a1 = (k + 1) / segs * Math.PI / 2, y0 = b.tilt + R0 - Math.sin(a0) * R0, y1 = b.tilt + R0 - Math.sin(a1) * R0, z0_ = zc + sd * (hw - 0.5 - R0 + Math.cos(a0) * R0), z1_ = zc + sd * (hw - 0.5 - R0 + Math.cos(a1) * R0);
            B.quad([x, y0, z0_], [x + 1, y0, z0_], [x + 1, y1, z1_], [x, y1, z1_], k === segs - 1 ? t3sh(c0, 1.15) : c0, [0, -Math.sin((a0 + a1) / 2), sd * Math.cos((a0 + a1) / 2)]);
          }
        }
        B.quad([x, b.tilt, zc - (hw - 0.5 - R0)], [x + 1, b.tilt, zc - (hw - 0.5 - R0)], [x + 1, b.tilt, zc + (hw - 0.5 - R0)], [x, b.tilt, zc + (hw - 0.5 - R0)], t3sh(c0, 1.15), [0, -1, 0]);
        void h;
      }
      for (const [x, sd] of [[b.x0 + 1, -1], [b.x1, 1]]) B.box(x - 0.3, b.tilt + 0.5, zc - hw + 0.5, x + 0.3, b.top, zc + hw - 0.5, t3sh(b.tc, 0.8));   // the tilt's end flaps
      parts.push(t3wheel(b.wheel[0], GROUND - b.wheel[1] - 1, zc + (hw - 2), b.wheel[1], 3.4), t3wheel(b.wheel[0], GROUND - b.wheel[1] - 1, zc - (hw - 2), b.wheel[1], 3.4));
    }
    const body = B.geo();
    return { body: [body, ...parts].filter(Boolean).reduce((a, b2) => t3merge(a, b2)), glass: G.geo() };
  }
  // the galvanised dustbin: a slightly tapered ribbed body with two pressed hoops, a foot ring, a domed lid with a lip and a handle
  function t3binGeo(fl) {
    const w = c => fl ? PAL.white : c, rib = k => w(k % 2 ? PAL.bin : PAL.binL), hoop = w(C('#5c6070')), dark = w(C('#1c1d26'));
    return t3turn([
      { r0: 3.9, y0: -5.5, r1: 3.9, y1: -4.6, c: dark },          // foot ring
      { r0: 0, y0: -5.5, r1: 3.9, y1: -5.5, n: -1, c: dark },
      { r0: 3.7, y0: -4.6, r1: 3.8, y1: -2.2, c: rib },
      { r0: 4.15, y0: -2.2, r1: 4.15, y1: -1.4, c: hoop, flat: 1 }, // lower hoop
      { r0: 3.85, y0: -1.4, r1: 3.95, y1: 0.8, c: rib },
      { r0: 4.25, y0: 0.8, r1: 4.25, y1: 1.6, c: hoop, flat: 1 },   // upper hoop
      { r0: 3.95, y0: 1.6, r1: 4.05, y1: 3.2, c: rib },
      { r0: 4.05, y0: 3.2, r1: 4.8, y1: 3.3, c: w(PAL.binL) },      // the lid's lip
      { r0: 4.8, y0: 3.3, r1: 4.8, y1: 3.8, c: w(PAL.binL) },
      { r0: 4.8, y0: 3.8, r1: 3.6, y1: 4.5, c: w(PAL.binL) },       // the dome
      { r0: 3.6, y0: 4.5, r1: 1.4, y1: 5.0, c: w(PAL.bin) },
      { r0: 1.4, y0: 5.0, r1: 0, y1: 5.1, c: w(PAL.bin) },
      { r0: 0.55, y0: 5.0, r1: 0.55, y1: 5.5, c: dark },             // handle post
      { r0: 0, y0: 5.5, r1: 0.55, y1: 5.5, n: 1, c: dark },
    ], 20);
  }
  // the traffic cone: a square rubber base with a chamfer, a cone with a white reflective band, a dark tip
  function t3coneGeo(fl) {
    const w = c => fl ? PAL.white : c, base = w(C('#1e1a1c')), or = w(PAL.cone), sh = w(C('#b84414'));
    const sq = t3turn([
      { r0: 6.2, y0: -4.5, r1: 6.2, y1: -3.6, c: base, flat: 1 },
      { r0: 6.2, y0: -3.6, r1: 5.2, y1: -3.0, c: base, flat: 1 },
      { r0: 0, y0: -4.5, r1: 6.2, y1: -4.5, n: -1, c: base },
      { r0: 0, y0: -3.0, r1: 5.2, y1: -3.0, n: 1, c: base },
    ], 4, Math.PI / 4, 0.4);
    const body = t3turn([
      { r0: 3.2, y0: -3.0, r1: 2.75, y1: -1.2, c: k => k % 6 < 2 ? sh : or },
      { r0: 2.75, y0: -1.2, r1: 2.3, y1: 0.6, c: w(PAL.coneL) },     // the reflective band
      { r0: 2.3, y0: 0.6, r1: 1.2, y1: 3.4, c: k => k % 6 < 2 ? sh : or },
      { r0: 1.2, y0: 3.4, r1: 0.7, y1: 4.5, c: or },
      { r0: 0, y0: 4.5, r1: 0.7, y1: 4.5, n: 1, c: w(C('#2a2226')) },
    ], 18);
    return t3merge(sq, body);
  }
  // draw with the 2D code into a size x size scratch window of buf whose top-left is world (ox, oy), and copy it out
  function t3capture(size, draw, ox = 0, oy = 0) {
    withView({ x: ox, y: oy, vw: size, vh: size }, draw);
    const out = new Uint32Array(size * size);
    for (let y = 0; y < size; y++) out.set(buf.subarray(y * CW, y * CW + size), y * size);
    return out;
  }
  const t3hash = a => { let h = 2166136261; for (let i = 0; i < a.length; i++) h = Math.imul(h ^ a[i], 16777619); return h >>> 0; };
  const T3_ROUND = new Set(['barrel', 'bin', 'cone', 'can', 'bottle', 'bag', 'ball']);

  Three3D = {
    renderer: null,
    init() {
      THREE.ColorManagement.enabled = false;   // colours are used as given, like the 2D buffer (no sRGB round trip)
      this.canvas = document.getElementById('three-canvas');
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false });
      this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
      this.renderer.setPixelRatio(1);
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(T3.FOV, CW / CH, 1, 4000);
      this.bgData = new Uint32Array(CW * CHMAX);
      this.bgTex = t3tex(this.bgData, CW, CHMAX);
      this.scene.background = this.bgTex;
      this.M = new THREE.Matrix4(); this.Q = new THREE.Quaternion(); this.V = new THREE.Vector3(); this.S = new THREE.Vector3();
      this.UP = new THREE.Vector3(0, 1, 0); this.DIR = new THREE.Vector3(); this.Q0 = new THREE.Quaternion(); this.X = new THREE.Vector3(); this.Y = new THREE.Vector3(); this.Z = new THREE.Vector3();
      this.buildReflections();
      this.buildWorld();
      this.buildWindows();
      this.buildFighters();
      this.buildModels();
      this.buildLayers();
      this.buildFx();
      this.buildPost();
      this.resize();
    },
    resize() {
      if (!this.renderer) return;
      const w = CW * T3.PIX, h = CH * T3.PIX;
      this.renderer.setSize(w, h, false);   // the 2D canvas resolution (x PIX), scaled up with crisp pixels
      this.rtWin.setSize(w, h); this.rtFlr.setSize(w, h); if (this.rtMain) this.rtMain.setSize(w, h); T3U.res.value.set(w, h);
      this.camera.aspect = CW / CH; this.camera.updateProjectionMatrix();
    },

    // ----- reflections: the scene mirrored through the wall and through the ground, each into its own image -----
    buildReflections() {
      const rt = () => new THREE.WebGLRenderTarget(4, 4, { depthBuffer: true });
      this.rtWin = rt(); this.rtFlr = rt();
      T3U.win.value = this.rtWin.texture; T3U.flr.value = this.rtFlr.texture;
      this.clipWin = new THREE.Plane(new THREE.Vector3(0, 0, -1), T3.ZF);        // keep what lies behind the glass
      this.clipFlr = new THREE.Plane(new THREE.Vector3(0, -1, 0), -T3_GROUND);   // keep what lies under the street
      this.bloodData = new Uint32Array(1024 * 3 * (STREET + 1));   // 3 chunks of 1024 columns, each STREET + 1 rows (the pool field)
      T3U.blood.value = this.bloodTex = t3tex(this.bloodData, 1024, 3 * (STREET + 1));
    },
    reflect() {
      const r = this.renderer, s = this.scene, cam = this.camera, bg = s.background;
      for (let d = 0; d <= STREET; d++) for (let x = 0; x < W; x++) this.bloodData[((x >> 10) * (STREET + 1) + d) * 1024 + (x & 1023)] = (255 << 24 | Math.round(Math.min(1, PUD_BLOOD[x]) * 255) << 8 | Math.round(Math.min(1, BPOOL[d * W + x]) * 255)) >>> 0;
      this.bloodTex.needsUpdate = true;
      s.background = null; r.setClearColor(0x000000, 0);
      s.position.set(12, 0, 2 * T3.ZF); s.scale.set(1, 1, -1);   // the glass: people and objects, mirrored behind the wall (shifted 12 px as in glassReflect, as if seen at an angle)
      r.clippingPlanes = [this.clipWin]; cam.layers.set(1);
      r.setRenderTarget(this.rtWin); r.clear(); r.render(s, cam);
      s.position.set(0, -2 * T3_GROUND, 0); s.scale.set(1, -1, 1); T3U.mir.value = T3_GROUND;   // the street: everything above it, mirrored below
      r.clippingPlanes = [this.clipFlr]; cam.layers.set(2);
      r.setRenderTarget(this.rtFlr); r.clear(); r.render(s, cam);
      s.position.set(0, 0, 0); s.scale.set(1, 1, 1); T3U.mir.value = 0;
      r.clippingPlanes = []; cam.layers.set(0); r.setRenderTarget(null); s.background = bg; r.setClearColor(0x000000, 1);
    },

    // ----- the street: the wall, the street floor, the solid props (with the depth of every surface on them), signs -----
    buildWorld() {
      const g = this.world = new THREE.Group(); this.scene.add(g);
      const add = (mesh, ...ls) => { g.add(t3L(mesh, ...(ls.length ? ls : [0, 2]))); return mesh; };
      const { ZF, ZS } = T3, CHUNK = 1024, NF = H - GROUND - STREET - 1;
      const p9 = isP9(); this.builtFor = LV.id;   // (frame() rebuilds the world when the level changes)
      for (const v of VPARTS) v.built = false;
      // the props stand out of the wall at their own depth: each object is one block, found as a connected group of prop pixels.
      // Every block holds the platform lane (laneZ), so a body up on one stands inside its depth.
      const ZD = [28, 20, 16, 28, 30, 28, 16];   // PLATS 0-6 from the wall: sports car, corner bar, scaffold, saloon, van, pickup, scaffold
      const zone = new Int16Array(W * H).fill(-1), LIFT = new Uint8Array(W * H);
      this.zones = []; this.zoneOf = zone;
      this.frontZ = new Map([[GOAL, ZF + T3.GOAL]]);   // the front face of each platform's block: a climber hangs on it
      const mkZone = (z0, z1) => { this.zones.push({ z0, z1, x0: W, x1: -1, y0: H, y1: -1 }); return this.zones.length - 1; };
      // the fire escape: the landings take its whole depth; the flights alternate between a back and a front band, so a body
      // climbing one flight is not hidden inside the flight above it
      const zStairs = mkZone(ZF, ZF + T3.STAIR), zGoal = mkZone(ZF, ZF + T3.GOAL), zFl = [mkZone(ZF, ZF + T3.STAIR / 2), mkZone(ZF + T3.STAIR / 2, ZF + T3.STAIR)];
      const flightAt = (x, y) => { let best = null; for (const s of STEPS) if (x >= s.x0 - 1 && x <= s.x1 + 1 && s.y <= y + 1 && (!best || s.y > best.y)) best = s; return best; };
      for (let y = 0; y < GROUND; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; if (!PROPS[i] || !stat[i]) continue;
        LIFT[i] = 1;
        if (p9) continue;   // (Pier 9: its blocks are named by p9Zones below)
        if (y >= GOAL.y - 1 && y <= GOAL.y + 4 && x >= GOAL.x0 - 1 && x <= GOAL.x1 + 1) zone[i] = zGoal;
        else if (x >= STAIR_X0 - 3 && x <= STAIR_X1 + 3 && y > GOAL.y + 4) { const s = flightAt(x, y); zone[i] = s && s.step ? zFl[s.k % 2] : zStairs; }
      }
      if (p9) this.p9Zones(zone, LIFT, mkZone);
      const stack = [];
      for (let y = 0; y < GROUND; y++) for (let x = 0; x < W; x++) {   // the other props: one block per connected group
        const i0 = y * W + x; if (!LIFT[i0] || zone[i0] >= 0) continue;
        const id = mkZone(0, 0), Z = this.zones[id];
        zone[i0] = id; stack.push(i0);
        while (stack.length) {
          const i = stack.pop(), px = i % W, py = (i - px) / W;
          Z.x0 = Math.min(Z.x0, px); Z.x1 = Math.max(Z.x1, px); Z.y0 = Math.min(Z.y0, py); Z.y1 = Math.max(Z.y1, py);
          for (const j of [i - 1, i + 1, i - W, i + W, i - W - 1, i - W + 1, i + W - 1, i + W + 1]) if (j >= 0 && j < W * GROUND && Math.abs((j % W) - px) <= 1 && LIFT[j] && zone[j] < 0) { zone[j] = id; stack.push(j); }   // (8 ways: a diagonal brace stays with its scaffold)
        }
        let k = p9 ? -1 : PLATS.findIndex((s, n) => n < ZD.length && s.x0 <= Z.x1 && s.x1 >= Z.x0 && s.y >= Z.y0 && s.y <= Z.y1);
        if (k < 0 && !p9 && Z.x1 - Z.x0 > 14 && Z.y1 > GROUND - 45) k = PLATS.findIndex((s, n) => n < ZD.length && s.x0 - 40 <= Z.x1 && s.x1 + 40 >= Z.x0);   // a pickup's cab beside its bed
        if (Z.x1 - Z.x0 <= 14 && Z.y1 - Z.y0 >= 40) { Z.z0 = -12; Z.z1 = -8; }   // a street lamp: a tall thin post at the kerb
        else if (k >= 0) { Z.z0 = ZF; Z.z1 = ZF + ZD[k]; }
        else { Z.z0 = ZF; Z.z1 = ZF + 8; }
        for (const s of PLATS) if (s !== GOAL && s.x0 <= Z.x1 && s.x1 >= Z.x0 && s.y >= Z.y0 - 1 && s.y <= Z.y1) this.frontZ.set(s, Math.max(this.frontZ.get(s) ?? -99, Z.z1));   // every ledge on this block
      }
      if (!p9) for (const px_ of PEDESTALS) {   // the iron benches the weapons wait on, out on the pavement
        const id = mkZone(-8, -2);
        const bench = (x, y) => (y >= GROUND - 7 && y <= GROUND - 2 && x >= px_ - 8 && x <= px_ + 8) || ((x === px_ - 5 || x === px_ - 4 || x === px_ + 5 || x === px_ + 6) && y >= GROUND - 5);   // slats and legs, as stat draws them
        for (let y = GROUND - 8; y < GROUND; y++) for (let x = px_ - 9; x <= px_ + 9; x++) { const i = y * W + x; if (stat[i] && !LIFT[i] && bench(x, y)) { LIFT[i] = 1; zone[i] = id; } }
      }
      this.benchZ = -5;   // the weapons on them: at the back of the fight lane
      const propMat = this.propMat || (this.propMat = t3mat({ vertexColors: true }, 1));
      // the facade's relief: cornices, fascias, pilasters, door steps and lanterns stand out of the wall; awnings slope out over the pavement
      for (const F of p9 ? this.p9Feat() : FEAT) {
        if (F.awn) {
          const w = F.x1 - F.x0 + 1, h = F.y1 - F.y0 + 1, px = new Uint32Array(w * h);
          for (let k = 0; k < h; k++) for (let x = F.xs(k); x <= F.x1; x++) {   // its own stripes (the shop window's top is painted over them in 2D)
            const c = F.col(x, k), i = (F.y0 + k) * W + x; px[k * w + x - F.x0] = c;
            if (stat[i] === c && !LIFT[i]) LIFT[i] = 1;
          }
          const g = new THREE.BufferGeometry(), z1 = ZF + F.awn, n = new THREE.Vector3(0, F.awn, h).normalize();
          g.setAttribute('position', new THREE.Float32BufferAttribute([F.x0, -F.y0, ZF, F.x0 + w, -F.y0, ZF, F.x0, -(F.y0 + h), z1, F.x0 + w, -(F.y0 + h), z1], 3));
          g.setAttribute('normal', new THREE.Float32BufferAttribute([0, n.y, n.z, 0, n.y, n.z, 0, n.y, n.z, 0, n.y, n.z], 3));
          g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2)); g.setIndex([0, 2, 1, 1, 2, 3]);
          add(new THREE.Mesh(g, t3mat({ map: t3tex(px, w, h), alphaTest: 0.5, side: THREE.DoubleSide }, 1)), 0, 1, 2);
          continue;
        }
        const id = mkZone(ZF, ZF + F.d), Z = this.zones[id];
        Object.assign(Z, { x0: F.x0, x1: F.x1, y0: F.y0, y1: F.y1 });
        for (let y = F.y0; y <= F.y1; y++) for (let x = F.x0; x <= F.x1; x++) { const i = y * W + x; if (stat[i] && !LIFT[i]) { LIFT[i] = 1; zone[i] = id; } }
      }
      // a vehicle or a scaffold is not one slab: wheels are tyres at its two sides, the cabin is narrower than the body,
      // a scaffold is two open frames with the deck between them (VPARTS, recorded as the street was drawn)
      const parts = (Z, px, w, h) => {
        const V = Z.z0 === ZF && Z.z1 - Z.z0 > 10 ? VPARTS.filter(v => v.x0 <= Z.x1 && v.x1 >= Z.x0) : [];
        const d = Z.z1 - Z.z0, zc = (Z.z0 + Z.z1) / 2;
        if (!V.length) return [{ px, d, z: zc }];
        const full = new Uint32Array(w * h), cab = new Uint32Array(w * h), wheel = new Uint32Array(w * h), frame = new Uint32Array(w * h), low = new Uint32Array(w * h);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const c = px[y * w + x]; if (!c) continue;
          const wx = Z.x0 + x, wy = Z.y0 + y, o = y * w + x;
          let t = full;
          for (const v of V) {
            if (wx < v.x0 || wx > v.x1) continue;
            if (v.wheels && v.wheels.some(([cx, r]) => Math.hypot(wx - cx, wy - (GROUND - r - 1)) <= r + 0.5)) { t = wheel; break; }
            if (v.deck != null) { if (wy > v.deck + 3) low[o] = c; t = wy >= v.deck - 1 && wy <= v.deck + 3 ? full : frame; break; }   // below the deck: on both frames
            if (v.cab && wx >= v.cab[0] && wx <= v.cab[1] && wy < v.beltY) { t = cab; break; }
          }
          t[o] = c;
        }
        return [{ px: full, d, z: zc }, { px: cab, d: d - 6, z: zc }, { px: wheel, d: 4.5, z: Z.z0 + 2.75 }, { px: wheel, d: 4.5, z: Z.z1 - 2.75 }, { px: frame, d: 2, z: Z.z0 + 1.2 }, { px: low, d: 2, z: Z.z1 - 1.2 }];   // the guard rail and the upper poles only at the back: the deck's front edge is open, as the 2D view shows a body on it
      };
      // each block: its own pixels extruded through its depth, and a sheet for the blood that lands on its front
      this.zones.forEach((Z, id) => {
        if (Z.x1 < 0) { for (let i = 0; i < W * GROUND; i++) if (zone[i] === id) { const x = i % W, y = (i - x) / W; Z.x0 = Math.min(Z.x0, x); Z.x1 = Math.max(Z.x1, x); Z.y0 = Math.min(Z.y0, y); Z.y1 = Math.max(Z.y1, y); } }
        if (Z.x1 < 0) return;
        const w = Z.x1 - Z.x0 + 1, h = Z.y1 - Z.y0 + 1, px = new Uint32Array(w * h);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (Z.y0 + y) * W + Z.x0 + x; if (zone[i] === id) px[y * w + x] = t3glow(stat[i]); }
        // the vehicles in this block get their real model (t3vehicle); their pixels leave the extrusion, the rest of the block
        // (a bar a car is parked against) is extruded as before
        const cars = Z.z0 === ZF && Z.z1 - Z.z0 > 10 ? VPARTS.filter(v => (v.car || v.bed) && v.x0 <= Z.x1 && v.x1 >= Z.x0) : [];
        const owns = (v, x, y) => v.car ? x >= v.car.L - 2 && x <= v.car.R + 2 && y >= v.car.top(x) - 1 : x >= v.bed.x0 - 2 && x <= v.bed.x1 + 1 && y >= v.bed.tilt - 1;
        for (const v of cars) {
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (px[y * w + x] && owns(v, Z.x0 + x, Z.y0 + y)) px[y * w + x] = 0;
          if (v.built) continue; v.built = true;
          const m = t3vehicle(v, Z.z0, Z.z1);
          add(new THREE.Mesh(m.body, propMat), 0, 1, 2);
          if (m.glass) { const gm = add(new THREE.Mesh(m.glass, this.carGlassMat()), 0); gm.renderOrder = 4; }
        }
        let ZR = Z;
        if (cars.length) {   // what is left of a block a vehicle shared (a bar it is parked against) keeps that building's own depth, behind the car's nose
          const k2 = PLATS.findIndex((s, n) => n < ZD.length && s.x0 <= Z.x1 && s.x1 >= Z.x0 && !VPARTS.some(v => (v.car || v.bed) && s.x0 >= v.x0 - 3 && s.x1 <= v.x1 + 3));
          if (k2 >= 0) { ZR = { ...Z, z1: ZF + ZD[k2] }; this.frontZ.set(PLATS[k2], ZR.z1); }
        }
        if (Z.custom) Z.custom(px, w, h, Z, add, propMat);   // (Pier 9: a model of its own, built from the block's pixels)
        else for (const P of parts(ZR, px, w, h)) {
          if (!P.px.some(Boolean)) continue;
          const m = add(new THREE.Mesh(t3voxels(P.px, w, h, 0, 0, P.d, !!Z.skin), propMat), 0, 1, 2);
          m.position.set(Z.x0, -Z.y0, P.z);
        }
        Z.w = w; Z.h = h; Z.gore = new Uint32Array(w * h); Z.tex = t3tex(Z.gore, w, h);
        add(new THREE.Mesh(t3quad(Z.x0, Z.y0, Z.x0 + w, Z.y0 + h, Z.z1 + 0.1, 0, 0, 1, 1), t3mat({ map: Z.tex, alphaTest: 0.5 }, 0)));
      });
      this.findWindows(LIFT);
      this.gore = [];
      for (let x0 = 0; x0 < W; x0 += CHUNK) {
        const x1 = Math.min(W, x0 + CHUNK), cw = x1 - x0;
        // the facades (the dark glass flagged to reflect); the wall is filled in behind each prop lifted off it
        const wall = new Uint32Array(cw * GROUND);
        for (let y = 0; y < GROUND; y++) {
          let last = 0;
          for (let x = x0; x < x1; x++) {
            const i = y * W + x, c = PROPS[i] ? STAT_BG[i] : stat[i], o = y * cw + x - x0;   // behind a prop: the wall as it was drawn before it
            if (!c) { last = 0; continue; }
            if (this.winG[i]) continue;   // a window: a hole, with its room behind (buildWindows)
            wall[o] = LIFT[i] && !PROPS[i] ? last : (last = EMIT.has(c) ? t3flag(c, 254) : GLASS_C.has(c) ? t3flag(c, 253) : c);
          }
        }
        add(new THREE.Mesh(t3quad(x0, 0, x1, GROUND, ZF, 0, 0, 1, 1), t3mat({ map: t3tex(wall, cw, GROUND), alphaTest: 0.5 }, 0, 'glass')));
        // the street: the rows under the curb lie flat from the wall to the front edge (puddles flagged); the foundation rows are its front face
        const fl = new Uint32Array(cw * (STREET + 1)), fd = new Uint32Array(cw * NF);
        for (let d = 0; d <= STREET; d++) for (let x = x0; x < x1; x++) { const c = stat[(GROUND + d) * W + x] || 0xff000000; fl[d * cw + x - x0] = PUDDLE[d * W + x] ? t3flag(c, 253) : t3glow(c); }
        for (let d = 0; d < NF; d++) for (let x = x0; x < x1; x++) fd[d * cw + x - x0] = stat[(GROUND + STREET + 1 + d) * W + x] || 0xff000000;
        add(new THREE.Mesh(t3flat(x0, x1, T3_GROUND, ZF, ZS, 0, 0, 1, 1), t3mat({ map: t3tex(fl, cw, STREET + 1) }, 0, 'floor')), 0);
        add(new THREE.Mesh(t3quad(x0, T3_GROUND, x1, T3_GROUND + NF, ZS, 0, 0, 1, 1), t3mat({ map: t3tex(fd, cw, NF) }, 0)), 0);
        // blood stains on the wall and on the street; copied from GORE near the camera now and then
        const gw = new Uint32Array(cw * GROUND), gf = new Uint32Array(cw * (STREET + 1));
        const tw = t3tex(gw, cw, GROUND), tf = t3tex(gf, cw, STREET + 1);
        add(new THREE.Mesh(t3quad(x0, 0, x1, GROUND, ZF + 0.1, 0, 0, 1, 1), t3mat({ map: tw, alphaTest: 0.5 }, 0)));
        add(new THREE.Mesh(t3flat(x0, x1, T3_GROUND - 0.1, ZF, ZS, 0, 0, 1, 1), t3mat({ map: tf, alphaTest: 0.5 }, 0)), 0);
        this.gore.push({ x0, x1, cw, gw, gf, tw, tf });
      }
      this.lift = LIFT; this.goreT = 0;
      if (p9) { this.p9Build(add); return; }
      // the neon signs: a dark box off the wall; their animated faces are layers on its front (buildLayers)
      const box =(x0, y0, x1, y1, z0, z1, c) => { const m = add(new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), t3mat({ color: t3rgb(c) }, 1))); m.position.set((x0 + x1) / 2, -(y0 + y1) / 2, (z0 + z1) / 2); };
      box(SIGN.x0, SIGN.y0, SIGN.x1 + 1, SIGN.y1 + 1, ZF, ZF + 5, C('#160d1c'));
      box(BLADE.x0, BLADE.y0, BLADE.x1 + 1, BLADE.y1 + 1, ZF, ZF + 4, C('#140b1a'));
      box(CHEV_X - 9, GROUND - 56, CHEV_X + 10, GROUND - 21, ZF, ZF + 4, C('#120d18'));
    },
    updateGore(rdt) {
      if ((this.goreT -= rdt) > 0) return;
      this.goreT = 0.2;
      const inView = (x0, x1) => x1 >= cam.x - 40 && x0 <= cam.x + cam.vw + 40;
      for (const c of this.gore) {
        if (!inView(c.x0, c.x1)) continue;
        for (let y = 0; y < GROUND; y++) for (let x = c.x0; x < c.x1; x++) { const i = y * W + x; c.gw[y * c.cw + x - c.x0] = this.lift[i] ? 0 : GORE[i]; }
        for (let d = 0; d <= STREET; d++) c.gf.set(GORE.subarray((GROUND + d) * W + c.x0, (GROUND + d) * W + c.x1), d * c.cw);
        c.tw.needsUpdate = c.tf.needsUpdate = true;
      }
      this.zones.forEach((Z, id) => {
        if (!Z.tex || !inView(Z.x0, Z.x1)) return;
        for (let y = 0; y < Z.h; y++) for (let x = 0; x < Z.w; x++) { const i = (Z.y0 + y) * W + Z.x0 + x; Z.gore[y * Z.w + x] = this.zoneOf[i] === id ? GORE[i] : 0; }
        Z.tex.needsUpdate = true;
      });
    },
    // ----- a new level: the old world (street or Pier 9) goes, with every geometry, material and texture it made; the new one is built -----
    rebuildWorld() {
      const keep = new Set([this.propMat, this.cgm]), seen = new Set();
      const free = m => {
        if (!m || keep.has(m) || seen.has(m)) return; seen.add(m);
        if (m.map) m.map.dispose();
        if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u && u.value && u.value.isTexture && u.value !== T3U.win.value && u.value !== T3U.flr.value && u.value !== T3U.blood.value) u.value.dispose();
        m.dispose();
      };
      this.scene.remove(this.world);
      this.world.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(free); });
      if (this.p9s) { for (const g of this.p9s.shut.values()) g.dispose(); this.p9s = null; }
      this.roomTex.dispose();
      this.world = null; this.zones = this.gore = this.people = this.peeks = null;
      this.buildWorld();
      this.buildWindows();
    },

    // ----- Pier 9 (src/levels/pier9.js): every block named, with its own depth and, where it pays, its own model -----
    // the containers stand deep against the back (their tops are the platform lane), the crane is a lattice with its cab and its
    // hanging container, the reefer truck has wheels, the lamps stand at the kerb, the drum is turned round; in the hall the ice
    // crates, the podium, the counter and the freezer door stand off the wall
    p9Zones(zone, LIFT, mkZone) {
      const { ZF } = T3, Zs = this.zones, zc = ZF + 12;
      const claim = (id, x0, y0, x1, y1, test, wall) => {
        const Z = Zs[id];
        for (let y = Math.max(0, y0); y <= Math.min(GROUND - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) {
          const i = y * W + x; if (!stat[i] || zone[i] >= 0 || (!PROPS[i] && !wall)) continue;
          if (test && !test(x, y, stat[i])) continue;
          LIFT[i] = 1; zone[i] = id;
          if (x < Z.x0) Z.x0 = x; if (x > Z.x1) Z.x1 = x; if (y < Z.y0) Z.y0 = y; if (y > Z.y1) Z.y1 = y;
        }
        return Z;
      };
      const block = (z0, z1, o = {}) => { const id = mkZone(z0, z1); Object.assign(Zs[id], o); return id; };
      const plat = x0 => PLATS.find(s => s.x0 === x0);
      for (const lx of P9.LAMPS) claim(block(-12, -8), lx - 2, GROUND - 84, lx + 13, GROUND - 1, (x, y) => y <= GROUND - 80 || Math.abs(x - lx) <= (y >= GROUND - 5 ? 2 : 1));
      for (const bx of T3P9.BOLL) claim(block(-11, -6, { skin: true }), bx - 3, GROUND - 9, bx + 3, GROUND - 1);
      const chain = C('#3a3a44');
      for (let i = 0; i + 1 < T3P9.BOLL.length; i++) { const a = T3P9.BOLL[i], c = T3P9.BOLL[i + 1]; if (c - a <= 300) claim(block(-9, -8), a + 3, GROUND - 8, c - 3, GROUND - 2, (x, y, k) => k === chain); }
      claim(block(-20, -8, { custom: (px, w, h, Z, add, mat) => { const m = add(new THREE.Mesh(t3lathe(px, w, h, P9.DRUM_X - Z.x0 + 0.5, 0, 16), mat), 0, 1, 2); m.position.set(P9.DRUM_X + 0.5, -Z.y0, -14); } }), P9.DRUM_X - 6, GROUND - 15, P9.DRUM_X + 6, GROUND - 1);
      for (const k of P9.PICKUPS) claim(block(-8, -2), k.x - 9, GROUND - 7, k.x + 9, GROUND - 1);   // the trestles the weapons lie on
      claim(block(ZF, ZF + 2), 872, GROUND - 40, 888, GROUND - 16);   // the empty fire-axe case on the wall
      // the crane
      claim(block(zc - 4, zc + 4, { custom: this.p9Lattice(16, [0, 8]) }), 1700, 43, 2200, 53);
      claim(block(zc - 6, zc + 6, { skin: true }), 1702, 32, 1730, 42);
      claim(block(zc - 7, zc + 7, { custom: this.p9Lattice(18, null) }), 1790, 54, 1808, GROUND - 1);
      claim(block(zc - 6, zc + 6, { skin: true }), 1810, 54, 1836, 74);
      claim(block(zc - 5, zc + 5, { custom: (px, w, h, Z, add, mat) => { const B = t3mb(); for (const x of [1870, 1910]) for (const z of [zc - 5, zc + 5]) B.box(x, 54, z - 0.3, x + 1, 124, z + 0.3, C('#2a2a30')); add(new THREE.Mesh(B.geo(), mat), 0, 2); } }), 1870, 54, 1910, 123, x => x === 1870 || x === 1910);
      claim(block(zc - 11, zc + 11, { skin: true }), 1850, 124, 1930, 166);
      // the container stacks: deep boxes; a body on a stack stands inside its depth (the platform lane)
      for (const [x0, x1, n] of P9.STACKS) { claim(block(ZF, ZF + 28, { skin: true }), x0, GROUND - n * P9.CRATE_U, x1, GROUND - 1); const s = plat(x0); if (s) this.frontZ.set(s, ZF + 28); }
      // the reefer truck: the trailer and the cab extruded, real tyres at both sides
      const T = P9.TRAILER;
      claim(block(ZF + 2, ZF + 22, { custom: (px, w, h, Z, add, mat) => {
        const wheels = [[T.x0 + 24, 7], [T.x0 + 40, 7], [T.x1 + 40, 7]], tr = new Uint32Array(w * h), cab = new Uint32Array(w * h), zm = (Z.z0 + Z.z1) / 2;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const c = px[y * w + x], X = Z.x0 + x, Y = Z.y0 + y; if (!c || wheels.some(([cx, r]) => Math.hypot(X - cx, Y - (GROUND - r - 1)) <= r + 1.2)) continue;
          (X >= T.x1 + 4 ? cab : tr)[y * w + x] = c;
        }
        const parts = [t3voxels(tr, w, h, 0, 0, 20, true).translate(Z.x0, -Z.y0, zm), t3voxels(cab, w, h, 0, 0, 18, true).translate(Z.x0, -Z.y0, zm)];
        for (const [cx, r] of wheels) for (const sd of [-1, 1]) parts.push(t3wheel(cx, GROUND - r - 1, zm + sd * 8.5, r, 3.4));
        add(new THREE.Mesh(parts.reduce((a, b) => t3merge(a, b)), mat), 0, 1, 2);
      } }), T.x0, T.y, T.x1 + 54, GROUND - 1);
      { const s = plat(T.x0); if (s) this.frontZ.set(s, ZF + 22); }
      // the hall's furniture (painted on the wall layer in 2D): ice crates, the auctioneer's podium, the counter, the freezer door
      for (const [cx, n] of [[2565, 3], [2700, 2], [2452, 2]]) claim(block(ZF, ZF + 20, { skin: true }), cx - 12, GROUND - n * 9, cx + 12, GROUND - 1, null, true);
      claim(block(ZF, ZF + 16, { skin: true }), 2612, GROUND - 32, 2648, GROUND - 1, null, true);
      claim(block(ZF, ZF + 14, { skin: true }), 2466, GROUND - 10, 2500, GROUND - 1, null, true);
      claim(block(ZF, ZF + 3, { skin: true }), 2756, GROUND - 58, 2798, GROUND - 1, null, true);
    },
    // a lattice girder (the crane's tower or jib): its painted side as two thin frames, front and back, and struts between them
    // every `step` px along it (rows `chords` of the block for the jib; the two side columns for the tower)
    p9Lattice(step, chords) {
      return (px, w, h, Z, add, mat) => {
        const zm = (Z.z0 + Z.z1) / 2, hd = (Z.z1 - Z.z0) / 2 - 0.8, yel = C('#c8a030'), B = t3mb();
        const g = [t3voxels(px, w, h, 0, 0, 1.6, true).translate(Z.x0, -Z.y0, zm - hd), t3voxels(px, w, h, 0, 0, 1.6, true).translate(Z.x0, -Z.y0, zm + hd)];
        if (chords) for (let x = Z.x0 + 1; x < Z.x1; x += step) for (const cy of chords) B.box(x, Z.y0 + cy + 0.2, zm - hd, x + 1.2, Z.y0 + cy + 1.4, zm + hd, yel);
        else for (let y = Z.y0; y < Z.y1; y += step) for (const x of [Z.x0 + 1, Z.x1 - 2]) B.box(x, y, zm - hd, x + 1.2, y + 1.2, zm + hd, yel);
        g.push(B.geo());
        add(new THREE.Mesh(g.reduce((a, b) => t3merge(a, b)), mat), 0, 1, 2);
      };
    },
    // the market's awning slopes out over the pavement (as the street's awnings do)
    p9Feat() {
      const [s0] = P9.MARKET.shutter, x0 = P9.MARKET.x0 + 8, x1 = s0 - 8, y0 = GROUND - 64;
      return [{ awn: 12, x0: x0 - 5, x1: x1 + 5, y0, y1: y0 + 5, xs: k => x0 - k, col: (x, k) => x <= x1 + k ? stat[(y0 + k) * W + x] : 0 }];
    },
    // the parts with no 2D block: the hall (its back wall, roof beams, the conveyor rail, the lamps, the warning lamp), the shutter,
    // the hatch lamp, the crane's beacon, the harbour water in front of the quay
    p9Build(add) {
      const { ZF, ZS } = T3, mat = this.propMat, S = this.p9s = { shut: new Map() }, HX = P9.HALL_X, ceil = GROUND - 184, rz = T3P9.RZ;
      const grp = () => { const g = new THREE.Group(); this.world.add(g); return g; };
      S.hall = grp(); S.out = grp();
      const put = (g, mesh, ...ls) => { g.add(t3L(mesh, ...(ls.length ? ls : [0, 2]))); return mesh; };
      {   // the hall's back wall: drawHall without what stands off it (the doors and the stopped clock stay painted)
        const w = W - HX, h = GROUND, door = (x, y) => y >= GROUND - 50 && P9.HALL_DOORS.some(d => Math.abs(x - d) <= 7), clock = (x, y) => Math.hypot(x - 2620, y - (GROUND - 140)) <= 9.6;
        const R = { buf, CW, cam, plot: (x, y, c) => { if (door(x, y) || clock(x, y)) plot(x, y, c); }, line1: (a, b, c, d, col) => { if (clock(a, b)) line1(a, b, c, d, col); } };
        withView({ x: HX, y: 0, vw: w, vh: h }, () => P9.drawHall(R));
        const px = new Uint32Array(w * h); for (let y = 0; y < h; y++) px.set(buf.subarray(y * CW, y * CW + w), y * w);
        put(S.hall, new THREE.Mesh(t3quad(HX, 0, W, GROUND, ZF - 0.6, 0, 0, 1, 1), t3mat({ map: t3tex(px, w, h) }, 0)));
        const cp = new Uint32Array(21 * 21); for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) { const wx = 2610 + x, wy = GROUND - 150 + y; if (clock(wx, wy)) cp[y * 21 + x] = px[wy * w + wx - HX]; }
        put(S.hall, new THREE.Mesh(t3voxels(cp, 21, 21, 0, 0, 1.4, true), mat)).position.set(2610, -(GROUND - 150), ZF + 0.1);   // the clock stands proud of the wall
      }
      {   // roof beams across the hall, the hangers and the conveyor rail, the enamel lamps on their cords
        const B = t3mb(), truss = C('#2a2e36'), shades = [];
        for (let x = HX + 20; x < W; x += 60) { B.box(x - 1.5, ceil - 3, ZF, x + 1.5, ceil, ZS - 8, truss); B.box(x - 0.4, ceil, rz - 0.4, x + 0.4, P9.CONVEYOR_Y - 2, rz + 0.4, truss); }
        B.box(HX, P9.CONVEYOR_Y - 2, rz - 1.6, W, P9.CONVEYOR_Y + 1, rz + 1.6, C('#6a7078'));
        B.box(HX, P9.CONVEYOR_Y - 2.4, rz - 1.7, W, P9.CONVEYOR_Y - 1.8, rz + 1.7, C('#9aa0a8'));
        for (const lx of P9.HALL_LAMPS) {
          const lz = T3P9.LZ;
          B.box(lx - 0.25, ceil, lz - 0.25, lx + 0.25, GROUND - 124, lz + 0.25, truss);
          B.box(lx - 1.4, GROUND - 121.5, lz - 1.4, lx + 1.4, GROUND - 119.6, lz + 1.4, t3flag(C('#fff4dc'), 254));   // the bulb
          shades.push(t3turn([{ r0: 1.2, y0: 0, r1: 6.5, y1: -4.6, c: C('#2a5a4a') }, { r0: 0, y0: 0, r1: 1.2, y1: 0, n: 1, c: C('#2a5a4a') }], 16, 0, 0.4).translate(lx, -(GROUND - 124), lz));
        }
        put(S.hall, new THREE.Mesh([B.geo(), ...shades].reduce((a, b) => t3merge(a, b)), mat));
        S.warn = put(S.hall, new THREE.Mesh(new THREE.BoxGeometry(7, 6, 2), new THREE.MeshBasicMaterial({ color: 0x000000 })), 0);
        S.warn.position.set(2452, -(GROUND - 177), ZF + 1);
      }
      {   // outdoors: the shutter (rebuilt as it rolls), its box, the hatch lamp, the crane's beacon
        const [s0, s1] = P9.MARKET.shutter, B = t3mb();
        B.box(s0 - 3, GROUND - 61, ZF, s1 + 4, GROUND - 56, ZF + 4.5, C('#3a3c44'));
        put(S.out, new THREE.Mesh(B.geo(), mat));
        S.shutM = put(S.out, new THREE.Mesh(new THREE.BufferGeometry(), mat)); S.shutM.position.set(s0, -(GROUND - 56), ZF + 1.2);
        S.hatch = put(S.out, new THREE.Mesh(new THREE.BoxGeometry(13, 3, 2), new THREE.MeshBasicMaterial({ color: 0x000000 })), 0); S.hatch.position.set(s0 + 29.5, -(GROUND - 63.5), ZF + 1.5);
        S.beacon = put(S.out, new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), new THREE.MeshBasicMaterial({ color: 0x000000 })), 0); S.beacon.position.set(1824, -53, ZF + 12);
      }
      {   // the harbour, in front of the quay wall: dark slate with slow light bands and glints, fading into the fog
        const g = new THREE.PlaneGeometry(W + 800, 320).rotateX(-Math.PI / 2).translate(W / 2, -(H - 4), ZS + 160);
        const m = new THREE.ShaderMaterial({
          uniforms: { t3Cam: T3U.cam },
          vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
          fragmentShader: `uniform vec4 t3Cam; varying vec3 vW;
            void main() {
              float d = vW.z - ${ZS.toFixed(1)}, t = t3Cam.w, x = floor(vW.x), r = floor(d / 2.0);
              float s = sin(x * 0.09 + r * 1.7 + t * 0.8) + sin(x * 0.031 - t * 0.5);
              vec3 c = d < 2.0 ? vec3(0.54, 0.57, 0.64) : s > 1.55 ? vec3(0.48, 0.52, 0.59) : (s > 0.9 && mod(r, 2.0) > 0.5) ? vec3(0.24, 0.3, 0.37) : vec3(0.16, 0.21, 0.27);
              c = mix(c, vec3(0.6, 0.64, 0.69), clamp(d / 300.0, 0.0, 1.0) * 0.6);
              gl_FragColor = vec4(c, 1.0);
            }`,
        });
        put(S.out, new THREE.Mesh(g, m), 0);
      }
    },
    // the shutter with `open` rows rolled up (drawFront's slats)
    p9ShutGeo(open) {
      const [s0, s1] = P9.MARKET.shutter, w = s1 - s0 + 1, h = 56 - open, px = new Uint32Array(w * Math.max(1, h));
      for (let j = 0; j < h; j++) for (let x = 0; x < w; x++) px[j * w + x] = j % 3 === 0 ? 0xff4e4a46 : j === h - 1 ? 0xff1b1226 : 0xff76706a;
      return t3voxels(px, w, h, 0, 0, 1.2, true);
    },
    p9Frame() {
      const S = this.p9s; if (!S) return;
      const club = flags.club; S.hall.visible = club; S.out.visible = !club;
      if (club) { S.warn.material.color.copy(this.col(p9.tuna.st === 'warn' && Math.floor(simTime * 8) % 2 === 0 ? 0xff313bff : 0xff201a60)); return; }
      const open = Math.round(56 * clamp(p9.shutter, 0, 1));
      if (open >= 56) S.shutM.visible = false;
      else { let g = S.shut.get(open); if (!g) S.shut.set(open, g = this.p9ShutGeo(open)); S.shutM.geometry = g; S.shutM.visible = true; }
      S.hatch.material.color.copy(this.col(p9.open ? 0xff40d060 : 0xff3030e0));
      S.beacon.material.color.copy(this.col(Math.floor(simTime * 1.2) % 2 ? 0xff3030ff : 0xff1e1e26));
    },
    // the conveyor's tuna, where drawHallProps and drawTunaHazard put them: { x, top (the tail), len, a (the swing), z, chain from (cx, cy) }
    p9TunaList() {
      const out = [], t = simTime, B = enc.boss, ph = B && !B.dead ? B.ph : 0, hz = p9.tuna, sp = ph >= 2 ? 30 : 16, low = ph >= 2;
      for (let i = 0; i < 4; i++) {
        const x = P9.HALL_X + ((i * 95 + t * sp) % 380) - 10, chain = low ? 52 : 26;
        if (x < P9.HALL_X + 4 || x > 2796 || (hz.st === 'swing' && Math.abs(x - hz.x) < 30)) continue;
        out.push({ x, top: P9.CONVEYOR_Y + chain, len: 40, a: Math.sin(t * 1.3 + i) * (low ? 0.08 : 0.03), z: T3P9.RZ, cx: x, cy: P9.CONVEYOR_Y + 2, cz: T3P9.RZ });
      }
      if (hz.st === 'swing') { const pv = P9.TUNA.top - 6; out.push({ x: hz.x, top: pv, len: P9.TUNA.bottom - pv, a: hz.a, z: 0, cx: hz.x - Math.sin(hz.a) * 40, cy: P9.CONVEYOR_Y, cz: -4, hz: true }); }
      return out;
    },
    p9Rig() {   // (in updateFighters) the tuna's chains, the swinging one's shadow
      if (!isP9() || !flags.club) return;
      this.bz = 0;
      for (const q of this.p9TunaList()) {
        this.seg(q.cx, q.cy, q.x, q.top, q.cz, 0.35, 0.25, T3P9.CHAIN);
        if (q.hz) this.shadow(q.x, P9.TUNA.bottom, 8);
      }
    },
    p9Models() {   // (in updateModels) the tuna themselves
      if (!isP9() || !flags.club) return;
      for (const q of this.p9TunaList()) { const m = this.model(this.geo('tuna' + q.len, () => this.p9TunaGeo(q.len))); m.position.set(q.x, -q.top, q.z); m.rotation.set(0, 0, q.a); }
    },
    // a frozen tuna hanging nose down from its tail (tunaAt's shape, turned round): blue-grey back, silver side, pale belly, frost
    p9TunaGeo(len) {
      const back = C('#3e5874'), side = C('#74808e'), belly = C('#aab2ba'), frost = C('#d8e0e6'), N = 14;   // (a touch darker than tunaAt's: the 3D shading adds a rim light)
      const wd = dy => (dy < 5 ? 1 + dy * 0.3 : 6 * Math.sin(Math.PI * Math.min(1, (dy / len - 0.08) / 0.92)) + 1) * 0.9;
      const tone = b => k => { const x = Math.cos((k + 0.5) / N * Math.PI * 2); return (k * 7 + b * 3) % 13 === 0 ? frost : x < -0.3 ? back : x > 0.4 ? belly : side; };
      const bands = [{ r0: 0, y0: 0, r1: wd(0), y1: 0, n: 1, c: back }];
      for (let dy = 0, b = 0; dy < len; dy += 2, b++) { const d1 = Math.min(len, dy + 2); bands.push({ r0: wd(dy), y0: -dy, r1: wd(d1), y1: -d1, c: tone(b) }); }
      bands.push({ r0: 0, y0: -len, r1: wd(len), y1: -len, n: -1, c: side });
      const parts = [t3turn(bands, N)];
      for (let k = 0; k < 4; k++) for (const sd of [-1, 1]) parts.push(t3box(sd * (3 - k) - 0.55, -k - 0.55, -0.35, sd * (3 - k) + 0.55, -k + 0.55, 0.35, back, 0.25));   // the tail fork
      return parts.reduce((a, b) => t3merge(a, b));
    },

    // ----- the windows: holes in the facade, a real room behind each (walls, furniture, a lamp, the people), 3D frames and sills, a glass pane -----
    findWindows(LIFT) {
      const G = this.winG = new Uint8Array(W * GROUND), GC = new Set([WIN_A, WIN_B, C('#1d1c2a')]);
      if (isP9()) GC.add(C('#1d2028'));   // the net loft's dark panes
      const wc = this.wallC = i => PROPS[i] ? STAT_BG[i] : LIFT[i] ? -1 : stat[i];   // the wall's own pixel (behind a prop: as it was before the prop), -1 for the facade relief
      for (let y = 1; y < GROUND - 1; y++) for (let x = 1; x < STREET_END; x++) { const i = y * W + x; if (GC.has(wc(i))) G[i] = 1; }
      for (let y = 1; y < GROUND - 1; y++) for (let x = 1; x < STREET_END; x++) {   // the shop's shelf dots: glass all round, so glass too
        const i = y * W + x; if (G[i] || wc(i) < 0) continue;
        if ((G[i - 1] === 1) + (G[i + 1] === 1) + (G[i - W] === 1) + (G[i + W] === 1) >= 3) G[i] = 2;
      }
      const seen = new Uint8Array(W * GROUND), st = [], cells = [];
      this.wins = []; this.winId = new Int16Array(W * GROUND).fill(-1);
      for (let i0 = 0; i0 < W * GROUND; i0++) {   // one window per group of panes (a 1-px mullion does not split it)
        if (!G[i0] || seen[i0]) continue;
        const R = { x0: W, x1: 0, y0: H, y1: 0, n: 0, lit: 0 };
        seen[i0] = 1; st.push(i0);
        while (st.length) {
          const i = st.pop(), x = i % W, y = (i - x) / W;
          cells.push(i);
          R.x0 = Math.min(R.x0, x); R.x1 = Math.max(R.x1, x); R.y0 = Math.min(R.y0, y); R.y1 = Math.max(R.y1, y); R.n++;
          if (wc(i) === WIN_A || wc(i) === WIN_B) R.lit++;
          for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const j = i + dy * W + dx; if (j >= 0 && j < W * GROUND && G[j] && !seen[j]) { seen[j] = 1; st.push(j); } }
        }
        if (R.n < 6) { for (let y = R.y0; y <= R.y1; y++) for (let x = R.x0; x <= R.x1; x++) G[y * W + x] = 0; cells.length = 0; continue; }
        R.hw = HOUSEWIN.find(w => w.x0 <= R.x1 && w.x1 >= R.x0 && w.y1 >= R.y0 && w.y0 <= R.y1) || null;
        const S = R.hw && this.wins.find(o => o.hw === R.hw);   // a lamp post in front splits a shop window: still one window, one room
        if (S) { S.x0 = Math.min(S.x0, R.x0); S.x1 = Math.max(S.x1, R.x1); S.y0 = Math.min(S.y0, R.y0); S.y1 = Math.max(S.y1, R.y1); S.n += R.n; S.lit += R.lit; }
        else this.wins.push(R);
        const id = this.wins.indexOf(S || R); for (const c of cells) this.winId[c] = id; cells.length = 0;
      }
      for (const R of this.wins) R.lit = R.lit > R.n / 2 ? 1 : 0;
    },
    buildWindows() {
      const { ZF } = T3, CHUNK = 1024, G = this.winG, wc = this.wallC, n = this.wins.length;
      this.roomState = new Uint8Array(Math.max(1, n) * 4); this.roomTex = new THREE.DataTexture(this.roomState, Math.max(1, n), 1, THREE.RGBAFormat);
      this.roomTex.magFilter = this.roomTex.minFilter = THREE.NearestFilter; this.roomTex.needsUpdate = true;
      // the frames: every wall pixel that touches the glass, extruded from inside the reveal to just proud of the wall
      // the sills and string courses: long runs of sill stone, a ledge out of the wall
      const sillC = C('#8a8496');
      for (let x0 = 0; x0 < STREET_END; x0 += CHUNK) {
        const x1 = Math.min(STREET_END, x0 + CHUNK), cw = x1 - x0, ring = new Uint32Array(cw * GROUND), sill = new Uint32Array(cw * GROUND);
        for (let y = 1; y < GROUND - 1; y++) {
          for (let x = x0; x < x1;) {
            if (wc(y * W + x) !== sillC) { x++; continue; }
            let k = x; while (k < x1 && wc(y * W + k) === sillC) k++;
            if (k - x >= 8) for (let j = x; j < k; j++) sill[y * cw + j - x0] = sillC;
            x = k;
          }
          for (let x = Math.max(1, x0); x < x1; x++) {
            const i = y * W + x, c = wc(i); if (G[i] || c <= 0 || sill[y * cw + x - x0]) continue;
            let near = false; for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (G[i + dy * W + dx]) { near = true; break; }
            if (near) ring[y * cw + x - x0] = t3glow(c);
          }
        }
        const mat = this.propMat || (this.propMat = t3mat({ vertexColors: true }, 1));
        const rm = new THREE.Mesh(t3voxels(ring, cw, GROUND, 0, 0, 3.7), mat); rm.position.set(x0, 0, ZF - 3 + 1.85); this.world.add(t3L(rm, 0, 2));
        const sm = new THREE.Mesh(t3voxels(sill, cw, GROUND, 0, 0, 3), mat); sm.position.set(x0, 0, ZF + 1); this.world.add(t3L(sm, 0, 2));
        // the glass: one pane over every window hole of the chunk, a little inside the frame
        const mask = new Uint32Array(cw * GROUND);
        for (let y = 0; y < GROUND; y++) for (let x = x0; x < x1; x++) if (G[y * W + x]) { const id = this.winId[y * W + x] + 1; mask[y * cw + x - x0] = (0xff000000 | (id >> 8) << 8 | (id & 255)) >>> 0; }   // the pane's room, for its light
        const gm = new THREE.Mesh(t3quad(x0, 0, x1, GROUND, ZF - 1.5, 0, 0, 1, 1), this.glassMat(t3tex(mask, cw, GROUND)));
        gm.renderOrder = 3; this.world.add(t3L(gm, 0));
      }
      // the rooms: one merged model; each vertex knows its room (for the light switch) and where that room's lamp hangs
      const S = this.roomStore();
      this.roomMat = this.makeRoomMat();
      this.people = []; this.peeks = [];
      const WP = ['#f0c078', '#e8b070', '#ecc890', '#e0b484', '#d8aa88', '#d0c090', '#e8a888'].map(C), PIC = ['#4a6a8a', '#8a4a3a', '#5a7a4a', '#c8a050', '#6a4a7a'].map(C);
      const wood = C('#5a3a24'), woodD = C('#3a2416'), rbx = rng(97);
      this.wins.forEach((R, id) => {
        const shop = !!(R.hw && R.hw.wr), w = R.x1 - R.x0 + 1, RD = shop ? 26 : 20;
        const rx0 = R.x0 - 6, rx1 = R.x1 + 7, ry0 = R.y0 - 10, ry1 = R.y1 + 18, zf = ZF - 3, zb = zf - RD, cx = (R.x0 + R.x1 + 1) / 2;
        R.rx0 = rx0; R.rx1 = rx1; R.floor = ry1; R.zb = zb; R.zf = zf; R.id = id;
        R.tv = !R.lit && !R.hw && w >= 10 && rbx() < 0.22;
        const lamp = R.tv ? [cx + (rbx() - 0.5) * 6, -(ry1 - 8), zb + 4] : [cx, -(R.y0 + 4), zb + RD * 0.55];
        S.room = id; S.lamp = lamp;
        const wallC = WP[Math.floor(rbx() * WP.length)];
        // the shell, seen from inside
        S.quad([rx0, ry0, zb], [rx1, ry0, zb], [rx1, ry1, zb], [rx0, ry1, zb], [0, 0, 1], wallC, 0.5);
        S.quad([rx0, ry0, zf], [rx0, ry0, zb], [rx0, ry1, zb], [rx0, ry1, zf], [1, 0, 0], wallC, 0.5);
        S.quad([rx1, ry0, zb], [rx1, ry0, zf], [rx1, ry1, zf], [rx1, ry1, zb], [-1, 0, 0], wallC, 0.5);
        S.quad([rx0, ry1, zb], [rx1, ry1, zb], [rx1, ry1, zf], [rx0, ry1, zf], [0, 1, 0], C('#6a4a30'), 0.25);
        S.quad([rx0, ry0, zf], [rx1, ry0, zf], [rx1, ry0, zb], [rx0, ry0, zb], [0, -1, 0], C('#d8ccb0'), 1);
        S.box(rx0, ry1 - 2, zb, rx1, ry1, zb + 0.6, woodD, 1);   // skirting
        S.box(rx0, ry0, zb, rx1, ry0 + 1.5, zb + 0.6, C('#e8dcc0'), 1);   // cornice
        if (w < 10) return;   // a dormer or a fanlight: just the room
        if (R.tv) {   // a dark room with the television on: a cabinet, the set, its screen
          const tx = lamp[0];
          S.box(tx - 6, ry1 - 7, zb + 1, tx + 6, ry1, zb + 6, wood, 1);
          S.box(tx - 4.5, ry1 - 14, zb + 1.5, tx + 4.5, ry1 - 7, zb + 5.5, C('#1a1a20'), 1);
          S.box(tx - 3.5, ry1 - 13, zb + 5.5, tx + 3.5, ry1 - 8, zb + 5.7, C('#9ab8ff'), 0.75);
          S.box(cx - 8, ry1 - 8, zf - 7, cx + 8, ry1 - 3, zf - 3, C('#5a3a3a'), 1);   // a sofa back toward the window
        }
        if (shop) {   // shelves of goods along the back wall, a counter, two lamps
          for (let k = 0; k < 4; k++) {
            const sy = R.y0 + 6 + k * 8;
            S.box(rx0, sy, zb, rx1, sy + 1, zb + 5, wood, 1);
            for (let x = rx0 + 1; x < rx1 - 3;) { const iw = 2 + Math.floor(rbx() * 3), ih = 3 + Math.floor(rbx() * 4); S.box(x, sy - ih, zb + 0.8, x + iw, sy, zb + 4, C(['#c0302a', '#e0c050', '#4a8a5a', '#3a6aa8', '#e8e0d0', '#8a4a8a'][Math.floor(rbx() * 6)]), 1); x += iw + 0.5 + rbx() * 1.5; }
          }
          S.box(R.x1 - 18, R.y1 - 6, zb + 9, R.x1 + 4, ry1, zb + 16, woodD, 1);   // the counter
          S.box(R.x1 - 18, R.y1 - 7, zb + 8.5, R.x1 + 4, R.y1 - 6, zb + 16.5, C('#8a6a4a'), 1);
          for (const lx of [R.x0 + w * 0.3, R.x0 + w * 0.7]) { S.box(lx - 0.3, ry0, zb + RD * 0.55 - 0.3, lx + 0.3, R.y0 + 2, zb + RD * 0.55 + 0.3, woodD, 1); S.box(lx - 2.5, R.y0 + 2, zb + RD * 0.55 - 2.5, lx + 2.5, R.y0 + 4, zb + RD * 0.55 + 2.5, C('#2a3a2a'), 1); S.box(lx - 1, R.y0 + 4, zb + RD * 0.55 - 1, lx + 1, R.y0 + 5, zb + RD * 0.55 + 1, C('#fff0c0'), 0.75); }
        } else if (!R.tv) {
          // a pendant lamp over the room
          const lz = lamp[2], ly = -lamp[1];
          S.box(cx - 0.25, ry0, lz - 0.25, cx + 0.25, ly - 2, lz + 0.25, woodD, 1);
          S.turn(cx, ly - 2, lz, [[0.6, 0], [3.2, 2.4]], C('#7a3a24'), 10);
          S.box(cx - 1, ly + 0.2, lz - 1, cx + 1, ly + 1.4, lz + 1, C('#fff0c0'), 0.75);
          // a picture on the back wall, and a sideboard or a bookcase
          const pw = Math.min(8, w * 0.45), px = R.x0 + 2 + rbx() * Math.max(0, w - pw - 4), py = R.y0 + 5 + rbx() * 4;
          S.box(px - 0.7, py - 0.7, zb, px + pw + 0.7, py + pw * 0.75 + 0.7, zb + 0.6, C('#2a1a12'), 1);
          S.box(px, py, zb + 0.6, px + pw, py + pw * 0.75, zb + 0.8, PIC[Math.floor(rbx() * PIC.length)], 1);
          if (rbx() < 0.5) { S.box(rx0 + 2, ry1 - 9, zb, rx1 - 2, ry1, zb + 5, wood, 1); S.box(rx0 + 1.5, ry1 - 9.6, zb, rx1 - 1.5, ry1 - 9, zb + 5.5, C('#7a5234'), 1); }
          else {
            const bx = rbx() < 0.5 ? rx0 + 1 : rx1 - 9;
            S.box(bx, R.y0 - 2, zb, bx + 8, ry1, zb + 5, woodD, 1);
            for (let sy = R.y0 + 3; sy < ry1 - 2; sy += 7) { S.box(bx + 0.5, sy, zb + 0.5, bx + 7.5, sy + 0.8, zb + 5, wood, 1); for (let x = bx + 1; x < bx + 7;) { const bw2 = 0.8 + rbx() * 0.8; S.box(x, sy - 4 - rbx() * 1.5, zb + 1, x + bw2, sy, zb + 4.5, C(['#7a2a2a', '#2a4a6a', '#5a6a3a', '#8a7a4a', '#4a3a5a'][Math.floor(rbx() * 5)]), 1); x += bw2 + 0.15; } }
          }
          if (rbx() < 0.5) { const qx = rbx() < 0.5 ? rx0 + 4 : rx1 - 4, qz = zf - 4; S.turn(qx, ry1 - 4, qz, [[1.6, 0], [2.0, 4]], C('#8a4a2a'), 8); for (let k = 0; k < 6; k++) { const a = k * 1.05, r = 1 + k % 3; S.box(qx + Math.cos(a) * r - 1.2, ry1 - 9 - k % 3 * 2, qz + Math.sin(a) * r - 1.2, qx + Math.cos(a) * r + 1.2, ry1 - 4 - k % 2, qz + Math.sin(a) * r + 1.2, C(k % 2 ? '#3a6a3a' : '#4a7a3a'), 1); } }   // a pot plant
        }
        const hw = R.hw;
        if (hw && hw.wl && !hw.wr) {   // the lit ground-floor rooms: folded curtains at the sides, a cafe curtain at the sill
          const fab = C('#b0703a');
          S.fold(R.x0 - 1, R.x0 + 3.5, R.y0 - 1, R.y1 + 1, zf - 1.2, fab);
          S.fold(R.x1 - 2.5, R.x1 + 2, R.y0 - 1, R.y1 + 1, zf - 1.2, fab);
          S.fold(R.x0 - 1, R.x1 + 2, R.y1 - 6, R.y1 + 1, zf - 1.6, fab);
        }
        if (hw && hw.keep) {   // the curious neighbour's curtain: drawn across half the pane when the fight starts
          const P2 = this.roomStore(); P2.room = id; P2.lamp = lamp;
          const cw2 = R.x1 + 2 - hw.cx; P2.fold(-cw2, 0, R.y0 - 1, R.y1 + 1, 0, C('#8a6030'));
          const m = new THREE.Mesh(P2.geo(), this.roomMat); m.position.set(R.x1 + 2, 0, zf - 2); m.scale.x = 0.04; m.frustumCulled = false;
          this.world.add(t3L(m, 0, 2)); this.peeks.push({ m, w: hw, k: 0 });
        }
        if (hw && hw.who) {   // the people: a whole body, lit from behind by the room's lamp
          const P3 = this.roomStore(); P3.room = id; P3.lamp = lamp;
          this.person(P3, shop ? 1 : hw.who, rbx);
          const m = new THREE.Mesh(P3.geo(), this.roomMat); m.frustumCulled = false; this.world.add(t3L(m, 0, 2));
          this.people.push({ m, w: hw, R, x: hw.cx, kid: hw.who === 3 });
        }
      });
      const rooms = new THREE.Mesh(S.geo(), this.roomMat); this.world.add(t3L(rooms, 0, 2));
      this.roomLit = this.wins.map(R => R.lit);
    },
    // a builder for the room model: quads, boxes, turned shapes, folded cloth; every vertex tagged with its room and lamp
    roomStore() {
      const pos = [], nor = [], col = [], lamp = [], room = [], idx = [], S = { room: 0, lamp: [0, 0, 0] };
      const rgba = (c, k) => [(c & 255) / 255, (c >> 8 & 255) / 255, (c >> 16 & 255) / 255, k];
      // world coordinates (y down) in, three.js out; the winding follows the normal n
      S.quad = (a, b, c, d, n, color, k, ns) => {
        const v = pos.length / 3, P = [a, b, c, d].map(p => [p[0], -p[1], p[2]]), N = [n[0], -n[1], n[2]];
        for (let q = 0; q < 4; q++) { pos.push(...P[q]); const m = ns ? [ns[q][0], -ns[q][1], ns[q][2]] : N; nor.push(...m); col.push(...rgba(color, k)); lamp.push(...S.lamp); room.push(S.room); }
        const e1 = [P[1][0] - P[0][0], P[1][1] - P[0][1], P[1][2] - P[0][2]], e2 = [P[2][0] - P[0][0], P[2][1] - P[0][1], P[2][2] - P[0][2]];
        const dt = (e1[1] * e2[2] - e1[2] * e2[1]) * N[0] + (e1[2] * e2[0] - e1[0] * e2[2]) * N[1] + (e1[0] * e2[1] - e1[1] * e2[0]) * N[2];
        if (dt >= 0) idx.push(v, v + 1, v + 2, v, v + 2, v + 3); else idx.push(v, v + 2, v + 1, v, v + 3, v + 2);
      };
      S.box = (x0, y0, z0, x1, y1, z1, c, k) => {
        S.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], c, k);
        S.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], c, k);
        S.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], c, k);
        S.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], c, k);
        S.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], c, k);
        S.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], c, k);
      };
      // a turned shape at (x, y top, z): profile [[r, down], ...]
      S.turn = (x, y, z, prof, c, N, k = 1) => {
        for (let p = 0; p + 1 < prof.length; p++) {
          const [ra, da] = prof[p], [rb2, db] = prof[p + 1], L = Math.hypot(rb2 - ra, db - da) || 1, nr = (db - da) / L, ny = -(rb2 - ra) / L;
          for (let q = 0; q < N; q++) {
            const t0 = q / N * 6.2832, t1 = (q + 1) / N * 6.2832, tm = (t0 + t1) / 2;
            S.quad([x + ra * Math.cos(t0), y + da, z + ra * Math.sin(t0)], [x + ra * Math.cos(t1), y + da, z + ra * Math.sin(t1)], [x + rb2 * Math.cos(t1), y + db, z + rb2 * Math.sin(t1)], [x + rb2 * Math.cos(t0), y + db, z + rb2 * Math.sin(t0)], [nr * Math.cos(tm), ny, nr * Math.sin(tm)], c, k);
          }
        }
      };
      // hanging cloth from x0 to x1, y0 to y1, folded in and out around depth z
      S.fold = (x0, x1, y0, y1, z, c) => {
        const dk = (0xff000000 | Math.round((c >> 16 & 255) * 0.78) << 16 | Math.round((c >> 8 & 255) * 0.78) << 8 | Math.round((c & 255) * 0.78)) >>> 0;   // the folds in shadow
        const n = Math.max(2, Math.round((x1 - x0) / 0.9));
        for (let q = 0; q < n; q++) {
          const xa = x0 + (x1 - x0) * q / n, xb = x0 + (x1 - x0) * (q + 1) / n, za = z + (q % 2 ? 0.5 : -0.5), zb2 = z + (q % 2 ? -0.5 : 0.5), nx = (q % 2 ? 1 : -1) * 0.7;
          S.quad([xa, y0, za], [xb, y0, zb2], [xb, y1, zb2], [xa, y1, za], [nx, 0, 0.7], q % 2 ? c : dk, 1);
        }
      };
      // any three.js geometry, placed by matrix m (three.js coordinates)
      S.mesh = (g, m, c, k = 1) => {
        g = g.index ? g.toNonIndexed() : g; g.applyMatrix4(m);
        const p = g.attributes.position.array, nn = g.attributes.normal.array, v0 = pos.length / 3;
        for (let i = 0; i < p.length / 3; i++) { pos.push(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]); nor.push(nn[i * 3], nn[i * 3 + 1], nn[i * 3 + 2]); col.push(...rgba(c, k)); lamp.push(...S.lamp); room.push(S.room); idx.push(v0 + i); }
      };
      S.geo = () => {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
        g.setAttribute('aCol', new THREE.Float32BufferAttribute(col, 4));
        g.setAttribute('aLamp', new THREE.Float32BufferAttribute(lamp, 3));
        g.setAttribute('aRoom', new THREE.Float32BufferAttribute(room, 1));
        g.setIndex(idx);
        return g;
      };
      return S;
    },
    // a person, feet at the origin, facing the street (+z): legs, coat, arms, neck, head with hair (who: 1 a man, 2 a woman, 3 a child)
    person(S, who, rnd) {
      const M = new THREE.Matrix4(), s = who === 3 ? 0.78 : 1, coat = C(['#3a2a26', '#2a3040', '#4a2a30', '#30382a'][Math.floor(rnd() * 4)]), skin = C('#b0846a'), hair = C(who === 2 ? '#3a2014' : '#1e1612');
      const at = (x, y, z, sx = 1, sy = 1, sz = 1) => M.makeScale(sx * s, sy * s, sz * s).setPosition(x * s, y * s, z * s);
      const cyl = (rt, rb2, h) => new THREE.CylinderGeometry(rt, rb2, h, 10);
      for (const lx of [-1.6, 1.6]) S.mesh(cyl(1.3, 1.1, 15), at(lx, 7.5, 0), C('#1e1c22'));
      if (who === 2) S.mesh(cyl(2.6, 4.4, 12), at(0, 13, 0), coat);   // a skirt
      S.mesh(cyl(3.6, 3, 13), at(0, 21.5, 0, 1, 1, 0.62), coat);
      S.mesh(new THREE.SphereGeometry(1, 10, 6), at(0, 28, 0, 3.6, 1.4, 2.3), coat);   // shoulders
      for (const sx of [-1, 1]) { const g = cyl(1.1, 0.95, 12); g.rotateZ(sx * 0.12); S.mesh(g, at(sx * 4.2, 22.5, 0.3), coat); S.mesh(new THREE.SphereGeometry(1, 8, 6), at(sx * 4.9, 16.4, 0.4), skin); }
      S.mesh(cyl(0.9, 1.1, 2.2), at(0, 29.6, 0), skin);
      S.mesh(new THREE.SphereGeometry(1, 12, 9), at(0, 32.6, 0.2, 2.6, 3, 2.7), skin);
      S.mesh(new THREE.SphereGeometry(1, 12, 9, 0, 6.2832, 0, 1.7), at(0, 33.1, -0.2, 2.8, 3.1, 2.9), hair);
      if (who === 2) S.mesh(new THREE.SphereGeometry(1, 8, 6), at(0, 34, -2.6, 1.6, 1.6, 1.6), hair);   // a bun
    },
    makeRoomMat() {
      const ZF = T3.ZF.toFixed(1);
      return new THREE.ShaderMaterial({
        uniforms: { uState: { value: this.roomTex }, uN: { value: Math.max(1, this.wins.length) }, t3Cam: T3U.cam, t3Mir: T3U.mir },
        clipping: true,
        vertexShader: `
          #include <clipping_planes_pars_vertex>
          attribute vec4 aCol; attribute vec3 aLamp; attribute float aRoom;
          varying vec4 vC; varying vec3 vW; varying vec3 vN; varying vec3 vL; varying float vR;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vW = w.xyz; vN = mat3(modelMatrix) * normal; vC = aCol; vL = aLamp; vR = aRoom;
            vec4 mvPosition = viewMatrix * w;
            gl_Position = projectionMatrix * mvPosition;
            #include <clipping_planes_vertex>
          }`,
        fragmentShader: `
          #include <clipping_planes_pars_fragment>
          uniform sampler2D uState; uniform float uN; uniform vec4 t3Cam; uniform float t3Mir;
          varying vec4 vC; varying vec3 vW; varying vec3 vN; varying vec3 vL; varying float vR;
          void main() {
            #include <clipping_planes_fragment>
            vec3 P = vW, N = normalize(vN);
            if (t3Mir > 0.0) { P.y = -2.0 * t3Mir - P.y; N.y = -N.y; }   // the street's mirror image: light it where the real one stands
            vec4 st = texture2D(uState, vec2((vR + 0.5) / uN, 0.5));
            float lit = st.r, tv = st.g * (0.6 + 0.4 * sin(t3Cam.w * 11.0 + vR * 3.1) * sin(t3Cam.w * 4.3 + vR));
            vec3 c = vC.rgb; float k = vC.a;
            if (abs(k - 0.5) < 0.05) c *= mod(floor(P.x * 0.5), 2.0) < 1.0 ? 1.0 : 0.9;                          // striped wallpaper
            else if (abs(k - 0.25) < 0.05) c *= mod(P.x + floor(P.z / 3.0) * 5.0, 12.0) < 1.0 ? 0.62 : 1.0;      // floorboards
            if (abs(k - 0.75) < 0.05) { gl_FragColor = vec4(mix(c * 0.12, min(c * 1.25, vec3(1.0)), max(lit, tv)), 1.0); return; }   // the bulb, the screen
            vec3 d = vL - P; float dist = max(length(d), 0.001), lam = max(dot(N, d / dist), 0.0), fall = 1.0 / (1.0 + dist * dist * 0.0032);
            float street = clamp(1.0 + (P.z - (${ZF})) / 14.0, 0.0, 1.0);   // the street's light, a little way in from the window
            vec3 L = vec3(0.1, 0.105, 0.16) + vec3(0.12, 0.13, 0.2) * street * max(N.z, 0.3);
            L += lit * vec3(1.25, 0.95, 0.6) * (0.65 + 1.5 * fall) * (0.55 + 0.45 * lam);
            L += tv * vec3(0.3, 0.45, 0.95) * (0.12 + 1.3 * fall) * (0.35 + 0.65 * lam);
            vec3 x = c * L; x = mix(x, 0.75 + (x - 0.75) / (1.0 + (x - 0.75) * 2.5), step(0.75, x));   // a soft shoulder: bright rooms keep their detail
            gl_FragColor = vec4(min(x, vec3(1.0)), 1.0);
          }`,
      });
    },
    // a car's glass: tinted and see-through (the seats show), with the street mirrored in it, the sky on the sloped screens, a sheen
    carGlassMat() {
      if (this.cgm) return this.cgm;
      return this.cgm = new THREE.ShaderMaterial({
        uniforms: { t3Win: T3U.win, t3Res: T3U.res, t3Cam: T3U.cam, t3LP: T3U.lp, t3LC: T3U.lc },
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
        blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation,
        vertexShader: `varying vec3 vW; varying vec3 vN;
          void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: `uniform sampler2D t3Win; uniform vec2 t3Res; uniform vec4 t3Cam; uniform vec4 t3LP[${T3.NL}]; uniform vec3 t3LC[${T3.NL}];
          varying vec3 vW; varying vec3 vN;
          void main() {
            vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
            vec2 wp = vec2(vW.x, -vW.y), su = gl_FragCoord.xy / t3Res, px = 2.0 / t3Res;
            vec4 r = (texture2D(t3Win, su) * 4.0 + texture2D(t3Win, su + vec2(px.x, 0.0)) + texture2D(t3Win, su - vec2(px.x, 0.0)) + texture2D(t3Win, su + vec2(0.0, px.y)) + texture2D(t3Win, su - vec2(0.0, px.y))) / 8.0;
            float up = max(N.y, 0.0), band = mod(wp.x * 0.9 + wp.y * 1.2 - t3Cam.x * 0.4, 30.0), sheen = band < 1.5 ? 0.22 : band < 3.0 ? 0.08 : 0.0;
            vec3 lamp = vec3(0.0);
            for (int i = 0; i < ${T3.NL}; i++) { vec4 q = t3LP[i]; if (q.z <= 0.0) continue; vec2 d = wp - q.xy; float k = 1.0 - dot(d, d) / q.z; if (k > 0.0) lamp += t3LC[i] * k * k; }
            float R = 0.42 + 0.25 * up;   // the screens catch the sky more than the side windows
            vec3 col = vec3(0.05, 0.06, 0.1) * R + vec3(0.14, 0.18, 0.3) * up * 0.5 + r.rgb * 0.55 * vec3(0.85, 0.92, 1.0) + vec3(sheen) + lamp * 0.12;
            if (t3Cam.y > 0.05 && t3Cam.z < 0.5) { float h = fract(sin(floor(wp.x) * 12.9898) * 43758.5453), s = fract(wp.y * 0.05 - t3Cam.w * (0.3 + h * 0.5) + h * 7.0); if (h > 0.6 && s < 0.1) col += vec3(0.08, 0.1, 0.13) * t3Cam.y; }   // rain on the glass
            gl_FragColor = vec4(min(col, vec3(1.0)), clamp(R + sheen * 0.5 + r.a * 0.2, 0.0, 0.9));
          }`,
      });
    },
    // the glass: lets the room through, and reflects the street (the same mirror image the old dark glass used), a sheen, the rain
    glassMat(mask) {
      const m = new THREE.ShaderMaterial({
        uniforms: { tMask: { value: mask }, uState: { value: this.roomTex }, uN: { value: Math.max(1, this.wins.length) }, t3Win: T3U.win, t3Res: T3U.res, t3Cam: T3U.cam, t3LP: T3U.lp },
        transparent: true, depthWrite: false,
        blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation,
        vertexShader: `
          varying vec2 vUv; varying vec3 vW;
          void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: `
          uniform sampler2D tMask, uState; uniform float uN; uniform sampler2D t3Win; uniform vec2 t3Res; uniform vec4 t3Cam; uniform vec4 t3LP[${T3.NL}];
          varying vec2 vUv; varying vec3 vW;
          void main() {
            vec4 mk = texture2D(tMask, vUv); if (mk.a < 0.5) discard;
            float rid = floor(mk.r * 255.0 + 0.5) + floor(mk.g * 255.0 + 0.5) * 256.0 - 1.0, lit = rid < 0.0 ? 0.0 : texture2D(uState, vec2((rid + 0.5) / uN, 0.5)).r;
            vec2 wp = vec2(vW.x, -vW.y), su = gl_FragCoord.xy / t3Res, px = 2.0 / t3Res;
            vec4 r = (texture2D(t3Win, su) * 4.0 + texture2D(t3Win, su + vec2(px.x, 0.0)) + texture2D(t3Win, su - vec2(px.x, 0.0)) + texture2D(t3Win, su + vec2(0.0, px.y)) + texture2D(t3Win, su - vec2(0.0, px.y))) / 8.0;
            float band = mod(wp.x * 0.8 + wp.y - t3Cam.x * 0.35, 34.0), sheen = band < 2.0 ? 0.2 : band < 4.0 ? 0.08 : 0.0, warm = 0.0;
            for (int i = 0; i < ${T3.NL}; i++) { vec4 q = t3LP[i]; if (q.w <= 0.0) continue; float d = length(vec2(wp.x - q.x, (wp.y - q.y) * 0.6)); if (d < 46.0) warm += (1.0 - d / 46.0) * 0.22; }
            float R = mix(0.26, 0.1, lit), rk = mix(0.62, 0.28, lit);   // a lit room shows through; a dark pane is a mirror
            vec3 col = vec3(0.075, 0.095, 0.17) * R + r.rgb * rk * vec3(0.84, 0.92, 1.0) + vec3(sheen) * vec3(0.9, 0.95, 1.0) + warm * vec3(1.0, 0.78, 0.42);
            if (t3Cam.y > 0.05 && t3Cam.z < 0.5) {   // rain running down the pane
              float h = fract(sin(floor(wp.x) * 12.9898) * 43758.5453), s = fract(wp.y * 0.035 - t3Cam.w * (0.25 + h * 0.6) + h * 7.0);
              if (h > 0.55 && s < 0.1) col += vec3(0.1, 0.12, 0.16) * t3Cam.y * (1.0 - s * 8.0);
            }
            gl_FragColor = vec4(col, clamp(R + sheen * 0.6 + r.a * 0.22 * (1.0 - 0.6 * lit), 0.0, 0.85));
          }`,
      });
      return m;
    },
    updateWindows(rdt) {
      const S = this.roomState;
      this.wins.forEach((R, i) => {
        const v = R.hw ? R.hw.lv ?? 1 : R.lit ? 1 : 0;   // a resident's light fades as the 2D view fades it (houseWinStep)
        this.roomLit[i] = v;
        S[i * 4] = Math.round(v * 255); S[i * 4 + 1] = R.tv ? 255 : 0; S[i * 4 + 3] = 255;
      });
      this.roomTex.needsUpdate = true;
      const vis = (x0, x1) => x1 > cam.x - 60 && x0 < cam.x + cam.vw + 60;
      for (const p of this.peeks) {   // the curtain slides across, and back when it is over
        p.m.visible = vis(p.w.x0, p.w.x1);
        p.k += ((p.w.peek ? 1 : 0.04) - p.k) * Math.min(1, rdt * 5); p.m.scale.x = p.k;
      }
      for (const p of this.people) {
        const w = p.w, R = p.R; p.m.visible = vis(R.rx0, R.rx1); if (!p.m.visible) continue;
        const ww = w.x1 - w.x0, tx = w.peek ? w.cx - 2.5 : w.cx + Math.sin(simTime * 0.35 + w.ph) * ww * 0.3;
        const vx = (tx - p.x) / Math.max(rdt, 1e-3); p.x = tx;
        const walk = clamp(vx / 3, -1, 1);
        p.m.position.set(p.x, -R.floor + Math.abs(Math.sin(simTime * 6 + w.ph)) * 0.5 * Math.abs(walk), R.zf - (w.peek ? 4 : 7));
        p.m.rotation.y = w.peek ? 0.25 : walk * 1.2;
      }
    },
    // the depth a body or object stands at: that of the surface under it (the street lane, a car roof, a stair tread...), eased so a jump onto a roof carries it back
    laneZ: [T3.ZF, T3.ZF + 8, 0, 14],   // LANE.BUILD, PLAT (inside every vehicle, scaffold, stair and roof block), FIGHT, FRONT
    // a body's depth: its lane's, except on a stair flight, which stands in its own band (buildWorld)
    bodyZ(lane, surf) { return surf && surf.step ? T3.ZF + (surf.k % 2 ? 0.75 : 0.25) * T3.STAIR : this.laneZ[lane ?? LANE.FIGHT]; },
    ease(key, target) {
      const z0 = this.zw.get(key), z = z0 === undefined ? target : z0 + (target - z0) * (1 - Math.exp(-12 * this.rdt));
      this.zw.set(key, z); return z;
    },

    // ----- fighters: instanced limbs (fill + black outline shell), voxel heads, the shirt front, shadows -----
    buildFighters() {
      const cyl = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true), sph = new THREE.SphereGeometry(1, 10, 8);
      const fill = t3mat({}, 2), out = t3mat({ color: t3rgb(PAL.out), side: THREE.BackSide }, 1);
      const inst = (geo, mat, n) => { const m = new THREE.InstancedMesh(geo, mat, n); m.frustumCulled = false; m.count = 0; this.scene.add(t3L(m, 0, 1, 2)); return m; };
      this.cylF = inst(cyl, fill, 1200); this.cylO = inst(cyl, out, 1200);
      this.sphF = inst(sph, fill, 2400); this.sphO = inst(sph, out, 2400);
      const bx = new THREE.BoxGeometry(1, 1, 1); this.boxF = inst(bx, fill, 300); this.boxO = inst(bx, out, 300); this.XA = new THREE.Vector3(1, 0, 0);
      this.cylF.setColorAt(0, new THREE.Color()); this.sphF.setColorAt(0, new THREE.Color()); this.boxF.setColorAt(0, new THREE.Color());
      this.modelMat = t3mat({ vertexColors: true }, 2);
      this.heads = new Map();   // owner -> { mesh, key }
      this.shadowGeo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
      this.shadowMat = new THREE.MeshBasicMaterial({ color: t3rgb(PAL.shadow), transparent: true, opacity: 0.55, depthWrite: false });
      this.shadows = [];
      const quadMesh = c => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3)); g.setIndex([0, 1, 2, 0, 2, 3]); const m = new THREE.Mesh(g, t3mat({ color: t3rgb(c), side: THREE.DoubleSide }, 0)); m.frustumCulled = false; this.scene.add(t3L(m, 0, 1, 2)); return m; };
      this.shirtV = quadMesh(PAL.collar); this.tie = quadMesh(PAL.tie);
      this.cols = new Map();   // ARGB -> THREE.Color
      this.zw = new WeakMap(); this.hero = {}; this.bz = 0; this.rdt = 0;   // each body's and object's eased depth
    },
    col(c) { let k = this.cols.get(c); if (!k) this.cols.set(c, k = t3rgb(c)); return k; },
    // a limb segment: a cylinder of radius r with round ends, inside a black shell ow thicker (the 2D outline); zs widens it in depth
    seg(ax, ay, bx, by, z, r, ow, c, zs = 1) {
      const { M, Q, V, S, DIR } = this, dx = bx - ax, dy = ay - by, len = Math.hypot(dx, dy);
      if (len > 1e-4) { DIR.set(dx / len, dy / len, 0); Q.setFromUnitVectors(this.UP, DIR); } else Q.identity();
      V.set((ax + bx) / 2, -(ay + by) / 2, z + this.bz);
      const n = this.nC++;
      if (n < 1200) {
        M.compose(V, Q, S.set(r, len, r * zs)); this.cylF.setMatrixAt(n, M); this.cylF.setColorAt(n, this.col(c));
        M.compose(V, Q, S.set(r + ow, len, (r + ow) * zs)); this.cylO.setMatrixAt(n, M);
      }
      this.ball(ax, ay, z, r, ow, c, zs); this.ball(bx, by, z, r, ow, c, zs);
    },
    ball(x, y, z, r, ow, c, zs = 1) {
      const { M, V, S } = this, n = this.nS++;
      if (n >= 2400) return;
      V.set(x, -y, z + this.bz);
      M.compose(V, this.Q0, S.set(r, r, r * zs)); this.sphF.setMatrixAt(n, M); this.sphF.setColorAt(n, this.col(c));
      M.compose(V, this.Q0, S.set(r + ow, r + ow, (r + ow) * zs)); this.sphO.setMatrixAt(n, M);
    },
    // a shoe: a box from the heel a to the toe b, hh high, hd deep, flat underneath, in a black shell ow thicker
    shoe(ax, ay, bx, by, z, hh, hd, ow, c) {
      const { M, Q, V, S, DIR } = this, dx = bx - ax, dy = ay - by, len = Math.hypot(dx, dy) || 1e-3, n = this.nB++;
      if (n >= 300) return;
      DIR.set(dx / len, dy / len, 0); Q.setFromUnitVectors(this.XA, DIR);
      const ux = -DIR.y, uy = DIR.x, up = uy >= 0 ? 1 : -1;   // the side of the foot line that is up: the shoe rises from its sole
      V.set((ax + bx) / 2 + ux * up * hh * 0.55, -(ay + by) / 2 + uy * up * hh * 0.55, z + this.bz);
      M.compose(V, Q, S.set(len + hh * 1.2, hh * 2, hd * 2)); this.boxF.setMatrixAt(n, M); this.boxF.setColorAt(n, this.col(c));
      M.compose(V, Q, S.set(len + hh * 1.2 + ow * 2, hh * 2 + ow * 2, hd * 2 + ow * 2)); this.boxO.setMatrixAt(n, M);
    },
    // the 2D head (hair, face, outline) drawn upright, extruded into voxels; rebuilt only when its pixels change
    // the sculpted head (t3heroHead / t3goonHead), rebuilt only when what shows on it changes (key)
    head(owner, hd, nk, face, key, build) {
      let h = this.heads.get(owner);
      if (!h) { h = { mesh: new THREE.Mesh(new THREE.BufferGeometry(), this.modelMat), key: -1 }; h.mesh.frustumCulled = false; this.scene.add(t3L(h.mesh, 0, 1, 2)); this.heads.set(owner, h); }
      if (h.key !== key) { h.mesh.geometry.dispose(); h.mesh.geometry = build(); h.key = key; }
      const [dx, dy] = norm(nk.x - hd.x, nk.y - hd.y);
      h.mesh.position.set(hd.x, -hd.y, this.bz);
      h.mesh.rotation.set(0, 0, Math.atan2(-dy, dx) + Math.PI / 2);
      h.mesh.scale.set(face, 1, 1);
      h.mesh.visible = true; h.used = true;
    },
    shadow(x, y, half) {
      const s = floorBelow(x, y, 0), hgt = s.y - y; if (hgt > 170) return;
      let m = this.shadows[this.nSh];
      if (!m) { m = new THREE.Mesh(this.shadowGeo, this.shadowMat); m.renderOrder = -2; this.scene.add(m); this.shadows.push(m); }
      this.nSh++;
      const k = Math.max(0.25, 1 - hgt / 140);
      m.position.set(x, -(s.y - 0.7), this.bz); m.scale.set(half * k + 1.5, 1, 4.5 * k); m.visible = true;
    },
    playerRig() {
      const [hd, nk, pl, eB, hB, eF, hF, kB, fB, kF, fF] = D, f = Dface, ZL = 2.2, ZA = 5.2, TZ = 1.5;
      {   // the depth of what he stands on: the surface under his feet when standing, else the one he will land on
        let tz = this.bodyZ(ctl.lane, hero.mode === 'anim' && !ctl.air ? ctl.surf : null);
        if (hero.act === 'climb' && ctl.climb) {   // climbing: on the block's front face while he hangs and pulls, then in over the top
          const C = ctl.climb, face = (C.s.step || C.s.landing ? T3.ZF + T3.STAIR : this.frontZ.get(C.s) ?? tz) + 3.5;
          tz = lerp(face, tz, smooth(clamp((hero.actT - CLIMB.hang - CLIMB.up) / CLIMB.over, 0, 1)));
        }
        this.bz = this.ease(this.hero, tz);
      }
      const leg = (h, k, ft, c, z) => {
        const [dx, dy] = norm(ft.x - k.x, ft.y - k.y);
        this.seg(h.x, h.y, k.x, k.y, z, 1.5, 1, c); this.seg(k.x, k.y, ft.x, ft.y, z, 1.5, 1, c);
        this.ball(ft.x, ft.y, z, 1.4, 1, PAL.shoe);   // the ankle
        this.shoe(ft.x - dy * 0.6 * f, ft.y + dx * 0.6 * f, ft.x + dy * 2.8 * f + dx * 0.6, ft.y - dx * 2.8 * f + dy * 0.6, z, 1.15, 1.45, 1, PAL.shoe);
      };
      const arm = (s, e, h, cu, cl, ch, z) => { this.seg(s.x, s.y, e.x, e.y, z, 1.2, 1, cu); this.seg(e.x, e.y, h.x, h.y, z, 1.2, 1, cl); this.ball(h.x, h.y, z, 1.5, 0.7, ch); };
      leg(pl, kB, fB, PAL.pantsB, -ZL);
      arm(nk, eB, hB, PAL.shirtB, PAL.shirtB, PAL.skinB, -ZA);
      if (tails) {   // the suit-jacket flaps at the back of the waist
        const ox = D[2].x - P[2].x, oy = D[2].y - P[2].y;
        for (const t of tails) for (let i = 1; i < t.length; i++) this.seg(t[i - 1].x + ox, t[i - 1].y + oy, t[i].x + ox, t[i].y + oy, -1, Math.max(0.5, 1.1 - i * 0.25), 1, PAL.shirt, 1.6);
      }
      const at = k => ({ x: nk.x + (pl.x - nk.x) * k, y: nk.y + (pl.y - nk.y) * k }), sx = at(0.3), mx = at(0.72);
      this.seg(nk.x, nk.y, sx.x, sx.y, 0, 3.0, 1.0, PAL.shirt, TZ);   // broad in the shoulders
      this.seg(sx.x, sx.y, mx.x, mx.y, 0, 2.5, 0.9, PAL.shirt, TZ);
      this.seg(mx.x, mx.y, pl.x, pl.y, 0, 2.3, 1.1, PAL.pants, TZ);   // narrow in the hips
      leg(pl, kF, fF, PAL.pants, ZL);
      {   // the shirt front: a white V under the lapels and the black tie, on the chest (drawSecondary)
        const [ux, uy] = norm(nk.x - pl.x, nk.y - pl.y), bx = -uy * f, by = ux * f, L = Math.hypot(nk.x - pl.x, nk.y - pl.y) * 0.72, T = L * 0.58, z = 3.0 * TZ + 0.06 + this.bz;
        const c0x = nk.x + bx * 1.3, c0y = nk.y + by * 1.3, cTx = nk.x - ux * T + bx * 1.3, cTy = nk.y - uy * T + by * 1.3;
        const zl = 2.5 * TZ + 0.06 + this.bz, setQ = (m, p, zz) => { const a = m.geometry.attributes.position; for (let i = 0; i < 4; i++) a.setXYZ(i, p[i][0], -p[i][1], i < 2 ? zz : zl + (zz - z)); a.needsUpdate = true; m.visible = true; };   // the lower end lies on the narrower chest
        setQ(this.shirtV, [[c0x - bx * 2.2, c0y - by * 2.2], [c0x + bx * 2.2, c0y + by * 2.2], [cTx + bx * 0.3, cTy + by * 0.3], [cTx - bx * 0.3, cTy - by * 0.3]], z);
        const t0x = nk.x + bx * 1.3, t0y = nk.y + by * 1.3, t1x = nk.x - ux * L * 0.62 + bx * 1.6, t1y = nk.y - uy * L * 0.62 + by * 1.6, [px, py] = norm(t1y - t0y, -(t1x - t0x));
        setQ(this.tie, [[t0x - px * 0.45, t0y - py * 0.45], [t0x + px * 0.45, t0y + py * 0.45], [t1x + px * 0.45, t1y + py * 0.45], [t1x - px * 0.45, t1y - py * 0.45]], z + 0.08);
      }
      {   // the loose hair locks, behind the head
        const ox = hd.x - P[0].x, oy = hd.y - P[0].y;
        hair.forEach((st, k) => { for (let i = 1; i < st.length; i++) this.seg(st[i - 1].x + ox, st[i - 1].y + oy, st[i].x + ox, st[i].y + oy, 0, 1.4, 0.9, k === 0 ? PAL.hairL : PAL.hair, 1.4); });
      }
      this.head('hero', hd, nk, f, 'h' + Dlook, () => t3heroHead(Dlook));
      arm(nk, eF, hF, PAL.shirt, PAL.shirt, PAL.skin, ZA);
      if (Dg && WEAPONS[hero.weapon].len) this.weapon(WEAPONS[hero.weapon].id, Dg, gun.pumpT >= 0.3 ? Math.sin(Math.PI * (gun.pumpT - 0.3) / 0.7) : 0, (wBack() ? -ZA : ZA) + this.bz, WEAPONS[hero.weapon].melee ? ctl.yw : 0);
      if (ctl.bottle && hero.mode === 'anim') { const h = D[6], ox = Math.floor(h.x) - 12, oy = Math.floor(h.y) - 12; this.sprite(24, ox, oy, drawBottle, 2.4, ZA + this.bz, 'bottle'); }
      let lo = W, hi = 0; for (const p of D) { lo = Math.min(lo, p.x); hi = Math.max(hi, p.x); }
      this.shadow(D[2].x, D[2].y, (hi - lo) / 2);
    },
    enemyRig(e) {
      const J = e.dead ? e.pts : e.J; if (!J) return;
      const s = e.s, f = e.face, pal = e.pal, top = e.look.top, bw = e.bw, lw = 0.75 + 0.25 * bw, bare = top === 'vest' || top === 'tank';
      const [hd, nk, pl, eB, hB, eF, hF, kB, fB, kF, fF] = J, ZL = 2.2 * s, ZA = 5.2 * s, TZ = 1.45;
      this.bz = this.ease(e, this.bodyZ(e.lane, null));
      const leg = (h, k, ft, c, z) => {
        const [dx, dy] = norm(ft.x - k.x, ft.y - k.y);
        this.seg(h.x, h.y, k.x, k.y, z, 1.5 * s * lw, s * lw, c); this.seg(k.x, k.y, ft.x, ft.y, z, 1.5 * s * lw, s * lw, e.look.boots ? pal.shoe : c);   // (rubber boots to the knee)
        this.ball(ft.x, ft.y, z, 1.4 * s, s, pal.shoe);
        this.shoe(ft.x - dy * 0.6 * s * f, ft.y + dx * 0.6 * s * f, ft.x + dy * 2.8 * s * f + dx * 0.6, ft.y - dx * 2.8 * s * f + dy * 0.6, z, 1.15 * s, 1.45 * s, s, pal.shoe);
      };
      const arm = (sh, el, h, cu, cl, ch, z) => {
        const b2 = Math.min(bw, 1.3);
        this.seg(sh.x, sh.y, el.x, el.y, z, 1.2 * s * bw, s * bw, cu); this.seg(el.x, el.y, h.x, h.y, z, 1.2 * s * b2, s * b2, cl);
        this.ball(h.x, h.y, z, 1.6 * s * (0.8 + 0.2 * bw), 0.6 * s, ch);
      };
      const tail = (k, c, z) => this.seg(pl.x, pl.y, pl.x + (k.x - pl.x) * 1.25, pl.y + (k.y - pl.y) * 1.25, z, 1.9 * s, s, c, 1.3);   // long coat skirt
      leg(pl, kB, fB, pal.pantsB, -ZL); if (top === 'coat') tail(kB, pal.topB, -ZL);
      arm(nk, eB, hB, bare ? pal.skinB : pal.topB, bare ? pal.skinB : pal.topB, e.gloves ? pal.glove : pal.skinB, -ZA);
      const tw = 2.6 * s * bw, cut = top === 'coat' ? 1 : 0.7, mx = { x: nk.x + (pl.x - nk.x) * cut, y: nk.y + (pl.y - nk.y) * cut };
      this.seg(nk.x, nk.y, mx.x, mx.y, 0, tw, s, pal.top, TZ);
      if (cut < 1) this.seg(mx.x, mx.y, pl.x, pl.y, 0, tw, s, pal.pants, TZ);
      if (bare || e.type === 'boss') { const [ux, uy] = norm(pl.x - nk.x, pl.y - nk.y); this.seg(mx.x - ux * 0.35 * s, mx.y - uy * 0.35 * s, mx.x + ux * 0.35 * s, mx.y + uy * 0.35 * s, 0, tw + 0.15, 0, pal.belt, TZ); }   // the belt: a thin line, as drawEnemy draws it
      {   // the chest: the vest's open front, the jacket's collar, the tank's neckline (as drawEnemy draws them)
        const [tx, ty] = norm(pl.x - nk.x, pl.y - nk.y), nx = ty * f, ny = -tx * f, fz = tw * TZ * 0.85;
        if (top === 'vest') this.seg(nk.x + nx * tw * 0.55, nk.y + ny * tw * 0.55, mx.x + nx * tw * 0.45, mx.y + ny * tw * 0.45, fz, 0.6 * s, 0, pal.skin, 0.4);
        if (top === 'jacket' || top === 'coat') this.seg(nk.x - nx * 0.8 * s, nk.y, nk.x + nx * 1.2 * s, nk.y + 1.4 * s, fz, 0.9 * s, 0, pal.topB, 0.4);
        if (top === 'tank') this.ball(nk.x + nx * 0.6 * s, nk.y + 1.2 * s, fz, 1.1 * s * bw, 0, pal.skin, 0.4);
        if (e.role === 'thrower') for (let i = 1; i <= 3; i++) this.ball(nk.x + (mx.x - nk.x) * i / 4 + nx * (1.5 - i) * s, nk.y + (mx.y - nk.y) * i / 4, fz, 0.5, 0, ECOL.steel);   // knives on the chest strap
      }
      leg(pl, kF, fF, pal.pants, ZL); if (top === 'coat') tail(kF, pal.top, ZL);
      if (pal.apron) {   // the rubber apron from the chest to the knees (drawEnemy), wrapped over the body and both legs
        const ax = (kB.x + kF.x) / 2, ay = (kB.y + kF.y) / 2, sx0 = nk.x + (pl.x - nk.x) * 0.3, sy0 = nk.y + (pl.y - nk.y) * 0.3;
        this.seg(sx0, sy0, pl.x + (ax - pl.x) * 0.8, pl.y + (ay - pl.y) * 0.8, 0, tw * 0.8, 0.6 * s, pal.apron, Math.max(TZ, (ZL + 1.5 * s * lw) / (tw * 0.8)) * 1.08);
      }
      if (e.look.neck) { const [tx, ty] = norm(pl.x - nk.x, pl.y - nk.y), nx = ty * f; for (let i = -1; i <= 1; i++) this.ball(nk.x + nx * 1.2 * s + i, nk.y + 2 * s - Math.abs(i) * 0.5, tw * TZ * 0.85, 0.45, 0, Math.floor(simTime * 2 + i) % 5 === 0 ? PAL.white : PAL.gold); }   // the gold chain
      if (e.kind === 'marchetti' && e.hook) {   // the meat hook on its chain, from his back hand (drawHookMarks)
        const q = e.hook, h = J[4], d = e.face * (q.st === 'back' ? -1 : 1), st = ECOL.steel;
        this.seg(h.x, h.y, q.x, q.y, -ZA * 0.5, 0.35, 0.25, T3P9.CHAIN);
        this.seg(q.x, q.y, q.x + d * 1.6, q.y, -ZA * 0.5, 0.45, 0.25, st); this.seg(q.x + d * 1.6, q.y, q.x + d * 2.4, q.y + 1.6, -ZA * 0.5, 0.45, 0.25, st); this.seg(q.x + d * 2.4, q.y + 1.6, q.x + d, q.y + 3.2, -ZA * 0.5, 0.45, 0.25, st);
      }
      const k = e.hk * s;
      { const glow = !e.dead && !!((e.act && e.actT < 0) || e.sp || e.ph === 2); this.head(e, hd, nk, f, (e.dead ? 'd' : glow ? 'g' : 'n') + k, () => t3goonHead(e, glow, e.dead)); }
      arm(nk, eF, hF, bare ? pal.skin : pal.top, bare ? pal.skin : pal.top, e.gloves ? pal.glove : pal.skin, ZA);
      if (e.bs) for (const b of e.bs) {   // blood on him (as drawEnemy draws it): on the near face of the limb
        const [x, y] = bodyStainAt(e, J, b), torso = b.a === 1 && b.b === 2, z = torso ? tw * TZ * 0.9 : (b.b === 5 || b.b === 6 ? ZA : ZL) + 1.1 * s;
        this.ball(x, y, z, 0.55, 0, b.c, 0.4);
      }
      const w = e.R.w;
      if (w && !(w === 'tknife' && !(e.act === 'throw' && e.actT < 0.06))) {   // the goon's weapon in his front hand
        const g = eWeapon(e, J), L = e.R.len * s, geo = this.geo('E' + w + Math.round(L * 4), () => t3weaponGeo(w === 'tknife' ? 'knife' : w, 0, L));
        this.place(geo, g.x, g.y, g.dx, g.dy, g.dx >= 0 ? 1 : -1, ZA + this.bz, 0);   // mirrored so the pistol's grip hangs down either way
      }
      if (!e.dead) { let lo = W, hi = 0; for (const p of J) { lo = Math.min(lo, p.x); hi = Math.max(hi, p.x); } this.shadow(J[2].x, J[2].y, (hi - lo) / 2); }
    },
    // the dog: the 2D skeleton (dogPose, dogLeg, its tail and ears) dressed in rounded limbs; far legs behind, near legs in front
    dogRig() {
      const P = dogPose(dog), f = P.f, H = P.hip, S = P.sh, N = P.neck, HD = P.head, SN = P.snout, er = P.earRoot;
      const TAN = C('#b97a3c'), TANL = C('#d9a05e'), TAND = C('#7a4e24'), BLK = C('#1c171a'), EYE = C('#0a0809');
      const at = (p, dx, dy) => [p[0] + dx * f, p[1] + dy], sg = (a, b, z, r, ow, c, zs = 1) => this.seg(a[0], a[1], b[0], b[1], z, r, ow, c, zs), bl = (a, z, r, ow, c, zs = 1) => this.ball(a[0], a[1], z, r, ow, c, zs);
      this.bz = this.ease(dog, this.laneZ[LANE.FRONT]);
      const leg = (pw, z) => {
        const L = dogLeg(P, pw), far = z < 0, c = far ? TAND : TAN, cl = far ? TAND : TANL;
        sg(L.root, L.mid, z, L.hind ? 1.55 : 1.3, 0.5, c); sg(L.mid, L.low, z, L.hind ? 0.85 : 0.8, 0.5, L.hind ? c : cl);
        sg(L.low, L.toe, z, 0.65, 0.5, cl); bl([L.paw[0] + 0.5 * f, L.paw[1] - 0.4], z + 0.2, 0.8, 0.45, cl, 1.2);
      };
      for (const pw of P.paws) if (pw.far) leg(pw, -2.1);
      // the tail: a bushy brush, tan beneath, black along the top
      for (let i = 1; i < dog.tail.length; i++) { const a = dog.tail[i - 1], q = dog.tail[i]; this.seg(a.x, a.y + 0.3, q.x, q.y + 0.3, 0, Math.max(0.6, 1.5 - i * 0.2), 0.5, TAN); this.seg(a.x, a.y - 0.4, q.x, q.y - 0.4, 0, Math.max(0.4, 0.9 - i * 0.12), 0, BLK); }
      // the body: a deep chest, a tucked belly, the croup; the black saddle along the back
      sg(at(H, -0.4, 0.4), at(S, 0.4, 0.6), 0, 2.7, 0.55, TAN, 0.78);
      bl(at(S, 0.9, 0.9), 0, 3.2, 0.55, TAN, 0.72); bl(at(H, 0, 0.6), 0, 2.8, 0.55, TAN, 0.8);
      sg(at(H, -1.2, -1.2), at(S, -1.0, -2.3), 0, 1.6, 0, BLK, 1.25);
      bl([H[0] + 0.3 * f, H[1] + 1.2], 1.4, 2.4, 0, TAN, 0.6);   // the near thigh
      // the neck and head
      sg(at(S, 1.0, -1.2), N, 0, 1.75, 0.5, TAN, 0.85); sg(at(S, -0.4, -2.8), at(N, -0.9, -1.0), 0, 0.9, 0, BLK, 1.3);
      bl(HD, 0, 2.35, 0.5, TAN, 0.9);
      sg(at(HD, 1.0, 0.4), at(SN, 0, 0.5), 0, 1.25, 0.45, TAN, 0.85);   // the muzzle
      sg(at(HD, 2.2, -0.4), at(SN, 0.2, 0.1), 0, 0.85, 0, BLK, 1.05);
      bl(at(SN, 0.7, 0), 0, 0.6, 0, BLK);   // the nose
      for (const z of [-1.5, 1.5]) bl(at(HD, 1.1, -0.8), z, 0.42, 0, EYE);
      if (dog.wag > 1.5) bl(at(SN, -0.8, 2.0), 0, 0.6, 0, C('#d0506a'));   // panting
      {   // the ears: tall points, pricked forward; the trot tips them back a touch
        const tilt = clamp((dog.ear[1].x - dog.ear[0].x) * f * 0.2, -0.8, 0.8), tip = at(er, -0.6 - tilt, -3.4);
        for (const z of [-1.2, 1.2]) { sg(at(er, -0.2, 0.3), tip, z, 0.85, 0.35, BLK, 0.45); bl(tip, z, 0.35, 0.3, BLK, 0.6); }
      }
      for (const pw of P.paws) if (!pw.far) leg(pw, 2.1);
      this.shadow(dog.x, GROUND - 3, 9);
    },
    updateFighters() {
      this.nC = 0; this.nS = 0; this.nSh = 0; this.nB = 0;
      for (const h of this.heads.values()) h.used = false;
      this.shirtV.visible = this.tie.visible = false;
      for (const e of enemies) if (e.dead) this.enemyRig(e);
      for (const e of enemies) if (!e.dead) this.enemyRig(e);
      this.playerRig();
      if (dog && !flags.club) this.dogRig();
      this.p9Rig();
      const nC = Math.min(this.nC, 1200), nS = Math.min(this.nS, 2400);
      for (const m of [this.cylF, this.cylO]) { m.count = nC; m.instanceMatrix.needsUpdate = true; }
      for (const m of [this.sphF, this.sphO]) { m.count = nS; m.instanceMatrix.needsUpdate = true; }
      for (const m of [this.boxF, this.boxO]) { m.count = Math.min(this.nB, 300); m.instanceMatrix.needsUpdate = true; }
      this.cylF.instanceColor.needsUpdate = this.sphF.instanceColor.needsUpdate = this.boxF.instanceColor.needsUpdate = true;
      for (const [owner, h] of this.heads) {
        if (h.used) continue;
        if (owner !== 'hero' && !enemies.includes(owner)) { this.scene.remove(h.mesh); h.mesh.geometry.dispose(); this.heads.delete(owner); }
        else h.mesh.visible = false;
      }
      for (let i = this.nSh; i < this.shadows.length; i++) this.shadows[i].visible = false;
    },

    // ----- objects: solid models made from their own 2D pixels -----
    buildModels() {
      this.mpool = []; this.geoCache = new Map();
      const ammo = new Uint32Array(7 * 5), band = new Uint32Array(7 * 5);   // the ammo box and the bandage, as drawAmmo draws them
      for (let y = 0; y < 5; y++) for (let x = 0; x < 7; x++) { ammo[y * 7 + x] = ammoPx(x, y); band[y * 7 + x] = bandPx(x, y); }
      this.ammoGeo = t3voxels(ammo, 7, 5, 3.5, 2.5, 5); this.bandGeo = t3voxels(band, 7, 5, 3.5, 2.5, 4);
      const kn = Uint32Array.from([ECOL.grip, ECOL.steel, ECOL.steel, ECOL.steel, ECOL.steel]);   // an enemy's thrown knife
      this.knifeGeo = t3voxels(kn, 5, 1, 2.5, 0.5, 1);
    },
    geo(key, make) {
      let g = this.geoCache.get(key);
      if (!g) {
        if (this.geoCache.size > 500) { for (const v of this.geoCache.values()) { v.dispose(); this.gcache?.get(v)?.dispose(); } this.geoCache.clear(); }   // (shapes that only lived for a few frames)
        this.geoCache.set(key, g = make());
      }
      return g;
    },
    glowGeo(geo) {   // the model grown 0.7 out from its centre on every axis (voxel faces keep their shape), made once per shape
      const C = this.gcache ||= new WeakMap();
      let g = C.get(geo); if (g) return g;
      geo.computeBoundingBox(); const c = geo.boundingBox.getCenter(new THREE.Vector3());
      g = geo.index ? geo.toNonIndexed() : geo.clone(); const a = g.attributes.position, d = 0.7, sg = v => v > 1e-4 ? 1 : v < -1e-4 ? -1 : 0;
      for (let i = 0; i < a.count; i++) a.setXYZ(i, a.getX(i) + sg(a.getX(i) - c.x) * d, a.getY(i) + sg(a.getY(i) - c.y) * d, a.getZ(i) + sg(a.getZ(i) - c.z) * d);
      // some models wind their outline shells inward: turn every triangle to face away from the centre (the shell shows its back faces)
      const A = new THREE.Vector3(), B = new THREE.Vector3(), Cc = new THREE.Vector3(), N = new THREE.Vector3(), M = new THREE.Vector3();
      for (let t = 0; t + 2 < a.count; t += 3) {
        A.fromBufferAttribute(a, t); B.fromBufferAttribute(a, t + 1); Cc.fromBufferAttribute(a, t + 2);
        N.subVectors(B, A).cross(M.subVectors(Cc, A)); M.copy(A).add(B).add(Cc).divideScalar(3).sub(c);
        if (N.dot(M) < 0) { const bx = B.x, by = B.y, bz = B.z; a.setXYZ(t + 1, Cc.x, Cc.y, Cc.z); a.setXYZ(t + 2, bx, by, bz); }
      }
      g.deleteAttribute('normal'); g.deleteAttribute('color'); g.computeVertexNormals();
      C.set(geo, g); return g;
    },
    glow(m) {   // a gold shell round a pickable's model, as the 2D view rings it (its back faces, added on top)
      if (!this.glowMat) {
        this.glowMat = new THREE.MeshBasicMaterial({ color: 0xffcd6e, side: THREE.BackSide, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
        this.gpool = [];
      }
      let g = this.gpool[this.nG];
      if (!g) { g = new THREE.Mesh(m.geometry, this.glowMat); g.frustumCulled = false; g.renderOrder = 2; this.scene.add(t3L(g, 0)); this.gpool.push(g); }
      this.nG++;
      g.geometry = this.glowGeo(m.geometry); g.visible = true; g.position.copy(m.position); g.quaternion.copy(m.quaternion); g.scale.copy(m.scale);
    },
    model(geo) {
      let m = this.mpool[this.nM];
      if (!m) { m = new THREE.Mesh(geo, this.modelMat); m.frustumCulled = false; this.scene.add(t3L(m, 0, 1, 2)); this.mpool.push(m); }
      this.nM++;
      m.geometry = geo; m.visible = true; m.quaternion.identity(); m.scale.set(1, 1, 1);
      return m;
    },
    // a model at (x, y, z), its +x along (dx, dy); a short (dx, dy) means it points through depth (toward the viewer for yw >= 0); s mirrors its edge side
    place(geo, x, y, dx, dy, s, z, yw) {
      const m = this.model(geo), { X, Y, Z } = this, L2 = Math.hypot(dx, dy);
      X.set(dx, -dy, L2 < 0.999 ? Math.sqrt(Math.max(0, 1 - L2 * L2)) * (yw < 0 ? -1 : 1) : 0).normalize();
      Y.set(-X.y, X.x, 0); if (Y.lengthSq() < 1e-6) Y.set(0, 1, 0); Y.normalize();
      Z.crossVectors(X, Y);
      this.M.makeBasis(X, Y, Z); m.quaternion.setFromRotationMatrix(this.M);
      m.position.set(x, -y, z); m.scale.set(1, s || 1, 1);
      return m;
    },
    // a weapon drawn by drawWeaponShape pointing right, extruded; placed like the 2D geometry g (x, y = grip or butt, dx, dy, s)
    weapon(id, g, pumpK, z, yw) {
      const pk = Math.round(pumpK * 6) / 6;
      const geo = this.geo('w' + id + pk, () => t3weaponGeo(id, pk));
      return this.place(geo, g.x, g.y, g.dx, g.dy, g.s, z, yw);
    },
    // whatever a 2D draw call paints in a size x size window at (ox, oy), extruded where it stands (for things posed in their own drawing)
    // slot: a model of its own, rebuilt in place when its pixels change (for things that change every frame: the dog, the bottle)
    sprite(size, ox, oy, draw, depth, z, slot) {
      const px = t3capture(size, draw, ox, oy);
      for (let i = 0; i < px.length; i++) if ((px[i] >>> 24) < 250) px[i] = 0;   // half-blended pixels (a soft shadow) are not solid
      let m;
      if (slot) {
        let h = (this.slots ||= new Map()).get(slot);
        if (!h) { h = { mesh: new THREE.Mesh(new THREE.BufferGeometry(), this.modelMat), key: -1 }; h.mesh.frustumCulled = false; this.scene.add(t3L(h.mesh, 0, 1, 2)); this.slots.set(slot, h); }
        const key = t3hash(px) ^ size ^ (depth * 977 | 0);
        if (h.key !== key) { h.mesh.geometry.dispose(); h.mesh.geometry = t3voxels(px, size, size, size / 2, size / 2, depth, true); h.key = key; }
        m = h.mesh; m.visible = true; h.used = true;
      } else {
        const key = 's' + size + '|' + depth + '|' + t3hash(px);
        m = this.model(this.geo(key, () => t3voxels(px, size, size, size / 2, size / 2, depth, true)));
      }
      m.position.set(ox + size / 2, -(oy + size / 2), z);
    },
    obj(o, x, y, a, z, scale) {   // a loose object drawn upright by drawObj, then made solid: round ones turned, the rest extruded
      if (o.kind === 'bin' || o.kind === 'cone') {   // modelled by hand: the profile of the 2D sprite, turned in the round
        const fl = o.flash > 0, m = this.model(this.geo(o.kind + (fl ? 'F' : ''), () => o.kind === 'bin' ? t3binGeo(fl) : t3coneGeo(fl)));
        m.position.set(x, -y, z); m.rotation.set(0, 0.4, -a, 'ZYX'); m.scale.setScalar(scale);
        return m;
      }
      const px = t3capture(40, () => drawObj({ ...o, x: 20.5, y: 20.5, a: 0 })), round = T3_ROUND.has(o.kind) || !['stack', 'crate', 'bigcrate', 'chair', 'knife'].includes(o.kind);
      const dep = o.kind === 'stack' ? o.hw * 2 + 1 : o.kind === 'crate' || o.kind === 'bigcrate' ? o.r * 2 + 1 : o.kind === 'chair' ? 9 : 1.2;
      const geo = this.geo('o' + (round ? 'L' : 'V' + dep) + t3hash(px), () => round ? t3lathe(px, 40, 40, 20.5, 20.5) : t3voxels(px, 40, 40, 20.5, 20.5, dep, true));
      const m = this.model(geo);
      m.position.set(x, -y, z); m.rotation.set(0, 0, -a); m.scale.setScalar(scale);
      return m;
    },
    updateModels() {   // (after updateFighters, which already placed the weapons in hand: nM counts on from there)
      this.bz = 0;
      this.nG = 0; if (this.glowMat) this.glowMat.opacity = 0.6 + 0.25 * Math.sin(simTime * 5);
      for (const o of objs) { const m = this.obj(o, o.x, o.y, o.a, this.ease(o, this.laneZ[objLane(o) ?? LANE.FRONT]), 1); if (o.pocket && !o.carried) this.glow(m); }
      for (const k of pickups) {   // the weapons waiting on the benches
        if (k.taken) continue;
        const bob = -Math.round(Math.abs(Math.sin(simTime * 1.5 + k.w)) * 1.5), id = WEAPONS[k.w].id, len = WEAPONS[k.w].len;   // (as drawPickups bobs it)
        this.glow(this.weapon(id, { x: k.x - len / 2 + (id === 'katana' || id === 'axe' ? 2 : 0), y: k.y + bob, dx: 1, dy: 0, s: 1 }, 0, this.benchZ, 0));
      }
      for (const t of thrown) {   // thrown or dropped weapons: spinning, stuck in the floor, or lying flat
        const dx = Math.cos(t.a), dy = Math.sin(t.a), k = t.stuck && !t.flat ? 0.85 : 0.5;
        const m = this.weapon(WEAPONS[t.w].id, { x: t.x - dx * t.len * k, y: t.y - dy * t.len * k - (t.stuck && t.flat ? 2 : 0), dx, dy, s: t.face }, 0, t.stuck ? this.ease(t, this.laneZ[LANE.FRONT] + PICK_Z) : this.ease(t, this.laneZ[t.lane ?? LANE.FIGHT]), 0);
        if (t.stuck) this.glow(m);   // lying there to pick up
      }
      for (const q of tossed) this.obj({ kind: q.k, r: 3, flash: 0 }, q.x, q.y, q.a, this.laneZ[LANE.FRONT], 0.6);   // cans and bottles the crowd throws (the front lane, as the 2D view draws them)
      for (const b of ammoBoxes) {
        if (b.life < 3 && Math.floor(b.life * 8) % 2) continue;   // blink before it goes
        const m = this.model(b.band ? this.bandGeo : this.ammoGeo); m.position.set(Math.floor(b.x) - 3 + 3.5, -(Math.floor(b.y) - 3 + 2.5), this.ease(b, this.laneZ[LANE.FRONT] + PICK_Z)); this.glow(m);
      }
      for (const b of boards) {   // splinters off a broken crate
        if (b.life < 0.6 && Math.floor(b.life * 16) % 2) continue;
        const n = Math.max(2, Math.round(b.len)), geo = this.geo('board' + n, () => { const px = new Uint32Array(n * 2); for (let i = 0; i < n; i++) { px[i] = PAL.crate; px[n + i] = PAL.crateD; } return t3voxels(px, n, 2, n / 2, 1, 3); });
        const m = this.model(geo); m.position.set(b.x, -(b.y + 0.5), this.ease(b, this.laneZ[b.lane ?? LANE.FRONT])); m.rotation.set(0, 0, -b.a);
      }
      for (const b of eshots) if (b.k !== 'b') { const m = this.model(this.knifeGeo); m.position.set(b.x, -b.y, this.ease(b, this.laneZ[b.lane ?? LANE.FIGHT])); m.rotation.set(0, 0, -(b.t * 22)); }
      this.p9Models();
      for (let i = this.nM; i < this.mpool.length; i++) this.mpool[i].visible = false;
      if (this.gpool) for (let i = this.nG; i < this.gpool.length; i++) this.gpool[i].visible = false;
    },

    // ----- 2D layers: the same draw calls, into textures on planes -----
    buildLayers() {
      // a layer at depth (z < 0) needs a bigger window than the view: the camera sees more of a plane further away
      const mk = (lit, order, dt, kind, ...ls) => {
        const deep = order === 0, dw = deep ? Math.ceil(CW * 1.4) : CW, dh = deep ? Math.ceil(CHMAX * 1.4) : CHMAX;
        const data = new Uint32Array(dw * dh), tex = t3tex(data, dw, dh);
        const opts = { map: tex, alphaTest: 0.5, depthWrite: false, depthTest: dt, side: THREE.DoubleSide };
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(8), 2));
        g.setIndex([0, 2, 1, 1, 2, 3]);
        const mesh = new THREE.Mesh(g, lit ? t3mat(opts, 0, kind) : new THREE.MeshBasicMaterial(opts));
        mesh.renderOrder = order; mesh.frustumCulled = false; this.scene.add(t3L(mesh, ...ls));
        return { data, tex, mesh, kind, dw, dh };
      };
      this.lWall = mk(true, 0, true, 'glass', 0, 2);   // on the facades: lit windows with people (or dark glass), a door a goon came through, the club door
      this.lSign = mk(true, 0, true, '', 0, 2);        // the roof sign's face, on its box
      this.lBlade = mk(true, 0, true, '', 0, 2);       // the blade sign and the chevrons, on their boxes
      this.lRail = mk(true, 0, true, '', 0, 2);        // the fire escape's outer rail, at its front edge
      this.lClub = mk(true, 0, true, '', 0, 2);        // the club's back wall and the crowd, on the wall (not a screen-space backdrop)
      // the club's dance floor: one fixed sheet over the whole club (not the camera window), so its edges stay out of the view
      const fw = 512, fx0 = W + 64 - fw, fd = new Uint32Array(fw * (STREET + 1)), ft = t3tex(fd, fw, STREET + 1);
      const fm = new THREE.Mesh(t3flat(fx0, fx0 + fw, T3_GROUND - 0.05, T3.ZF, T3.ZS, 0, 0, 1, 1), t3mat({ map: ft }, 0, 'floor'));
      fm.visible = false; this.scene.add(t3L(fm, 0));
      this.lFloor = { data: fd, tex: ft, mesh: fm, x0: fx0, w: fw };
      this.lMid = mk(true, 5, true, '', 0);            // on the ground behind the fighters: shockwaves
      this.lFront = mk(true, 20, false, '', 0, 2);     // over the fighters: enemy marks and shots, the swap marker
      this.lFx = mk(false, 21, false, '', 0);          // over everything, unlit: tracers, flashes, particles, sparks, edge markers
      this.lFire = mk(false, 6, true, '', 0);          // Pier 9: the fire in the drum, at the drum's depth
      this.lCar = mk(true, 6, true, '', 0, 2);         // Pier 9: a container's (or the truck's) door swung open, on its front face
    },
    // draw into buf and copy into the layer's texture; a layer at depth z gets the window the camera sees at that depth
    // (wider, and shifted down by the lens shift), drawn in tiles of the buffer's size
    layer(L, draw, { glow = false, z = 0 } = {}) {
      const sx = cam.x, sy = cam.y, sw = cam.vw, sh = cam.vh, t = Math.tan(T3.FOV * Math.PI / 360), D = (sh / 2) / t, h = D * Math.tan(T3.PITCH);
      const k = z < 0 ? (D - z) / D * 1.03 : 1, TW = Math.min(L.dw, Math.ceil(sw * k) + (z < 0 ? 4 : 0)), TH = Math.min(L.dh, Math.ceil(sh * k) + (z < 0 ? 4 : 0));
      const x0 = Math.round(sx + sw / 2 - TW / 2), y0 = Math.round(sy + sh / 2 - h * Math.min(z, 0) / D - TH / 2), gl = L.kind === 'glass';
      let any = false;
      for (let oy = 0; oy < TH; oy += CHMAX) for (let ox = 0; ox < TW; ox += CW) {
        const tw = Math.min(CW, TW - ox), th = Math.min(CHMAX, TH - oy);
        withView({ x: x0 + ox, y: y0 + oy, vw: tw, vh: th }, draw);
        for (let y = 0; y < th; y++) for (let x = 0, r = y * CW, o = (oy + y) * L.dw + ox; x < tw; x++) {
          const c = buf[r + x];
          if (c) any = true;
          L.data[o + x] = !glow || !c ? c : EMIT.has(c) ? t3flag(c, 254) : gl && GLASS_C.has(c) ? t3flag(c, 253) : c;
        }
      }
      if (!any) { L.mesh.visible = false; return; }   // nothing drawn: no upload, no plane
      L.tex.needsUpdate = true;
      const p = L.mesh.geometry.attributes.position, uv = L.mesh.geometry.attributes.uv;
      p.setXYZ(0, x0, -y0, z); p.setXYZ(1, x0 + TW, -y0, z); p.setXYZ(2, x0, -(y0 + TH), z); p.setXYZ(3, x0 + TW, -(y0 + TH), z);
      uv.setXY(0, 0, 0); uv.setXY(1, TW / L.dw, 0); uv.setXY(2, 0, TH / L.dh); uv.setXY(3, TW / L.dw, TH / L.dh);
      p.needsUpdate = uv.needsUpdate = true;
      L.mesh.visible = true;
    },
    updateLayers() {
      const { ZF } = T3;
      if (flags.club && !isP9()) this.layer(this.lClub, () => { drawClub(); drawDancers(); }, { glow: true, z: ZF - 0.6 }); else this.lClub.mesh.visible = false;   // (the hall's wall is a mesh: p9Build)
      this.layer(this.lWall, () => { drawSpawnFx(); drawDoor(); }, { glow: true, z: flags.club ? ZF - 0.3 : ZF + 0.3 });
      this.layer(this.lSign, drawSign, { glow: true, z: ZF + 5.05 });
      this.layer(this.lBlade, drawStairSign, { glow: true, z: ZF + 4.05 });
      if (!flags.club && cam.x < STAIR_X1 + 160 && cam.x + cam.vw > STAIR_X0 - 160) this.layer(this.lRail, drawStairRails, { z: ZF + T3.STAIR + 0.4 }); else this.lRail.mesh.visible = false;
      this.lFloor.mesh.visible = flags.club;
      if (flags.club) {   // drawClubFloor in camera-sized strips across the sheet
        const F = this.lFloor, S = STREET + 1, step = 256;
        for (let ox = 0; ox < F.w; ox += step) {
          withView({ x: F.x0 + ox, y: GROUND, vw: step, vh: S }, isP9() ? () => P9.drawHallFloor(R9) : drawClubFloor);
          for (let y = 0; y < S; y++) for (let x = 0; x < step; x++) { const c = buf[y * CW + x]; F.data[y * F.w + ox + x] = t3glow(c); }
        }
        F.tex.needsUpdate = true;
      }
      this.layer(this.lMid, () => { drawTramp(); drawBag(); drawGroundFx(); if (isP9() && flags.club && p9.tuna.st === 'warn') P9.drawTunaHazard(R9, p9.tuna); });   // (the swing's red band on the floor; the tuna itself is a model)
      this.p9Layers();
      this.layer(this.lFront, () => {
        // the marks of a body at depth: drawn where that body shows on this plane (z = 0), seen from the camera
        const t = Math.tan(T3.FOV * Math.PI / 360), D = (cam.vh / 2) / t, ccx = cam.x + cam.vw / 2, ccy = cam.y + cam.vh / 2 - D * Math.tan(T3.PITCH);
        for (const e of enemies) {
          const J = e.dead ? e.pts : e.J, bz = this.zw.get(e) ?? 0, sx = cam.x, sy = cam.y;
          if (J && Math.abs(bz) > 0.5) { const k = D / (D - bz); cam.x -= Math.round((J[2].x - ccx) * (k - 1)); cam.y -= Math.round((J[2].y - ccy) * (k - 1)); }
          const hk = e.hook; if (hk) e.hook = null;   // (Marchetti's flying hook and chain are a model: enemyRig)
          drawEnemyMarks(e);
          if (hk) e.hook = hk;
          cam.x = sx; cam.y = sy;
        }
        drawEShots(false);
      });
      this.layer(this.lFx, () => {
        drawFx(); drawDogHeart(); drawOffscreen();
        for (const e of enemies) {   // a goon's muzzle flash
          const J = e.dead ? e.pts : e.J; if (!J || e.R.w !== 'pistol' || !(e.muz > 0)) continue;
          const g = eWeapon(e, J); for (let d = 1; d <= 4; d++) plot(Math.floor(g.tx + g.dx * d), Math.floor(g.ty + g.dy * d), d < 3 ? PAL.white : PAL.accent);
        }
        if (showSkel) for (const [a, b] of STICKS) line1(P[a].x, P[a].y, P[b].x, P[b].y, PAL.accent);
      });
    },
    // Pier 9's extra layers: the drum fire (drawFxTop's flames only) at the drum's depth, and the doors that swing open on a
    // container's or the truck's front face (drawSpawnFx draws them on the wall, behind the block)
    p9Layers() {
      const fireOn = isP9() && !flags.club && P9.DRUM_X > cam.x - 30 && P9.DRUM_X < cam.x + cam.vw + 30;
      if (fireOn) {
        const near = (x, y) => Math.abs(x - P9.DRUM_X) <= 12 && y > GROUND - 70 && y < GROUND;
        const R = { cam, get t() { return simTime; }, plot: (x, y, c) => { if (near(x, y)) plot(x, y, c); }, blendPlot: (x, y, r, g, b, a) => { if (near(x, y)) blendPlot(x, y, r, g, b, a); } };
        this.layer(this.lFire, () => P9.drawFxTop(R, p9.open), { z: -14 });
      } else this.lFire.mesh.visible = false;
      const cars = isP9() && !flags.club ? spawnFx.filter(f => f.kind === 'car' && f.t <= 0.4) : [];
      const carZ = cars.length && cars[0].d.x0 >= P9.TRAILER.x0 - 2 ? T3.ZF + 22.2 : T3.ZF + 28.2;   // the truck's front face, or a container's
      if (cars.length) this.layer(this.lCar, () => {
        for (const f of cars) {   // as drawSpawnFx draws a car door
          const d = f.d;
          for (let y = d.y0; y < d.y1; y++) for (let x = d.x0; x <= d.x1; x++) plot(x, y, x === d.x1 || y === d.y0 || y === d.y1 - 1 ? PAL.out : d.col);
          for (let y = d.y0 + 1; y < d.y1 - 1; y++) plot(d.x0 - 1, y, C('#3a2e22'));
        }
      }, { glow: true, z: carZ });
      else this.lCar.mesh.visible = false;
    },
    // the far scene, exactly as the 2D view draws it (sky, moon, clouds, far town, or the club's back wall and crowd), lit the same way
    updateBackground() {
      if (flags.club) { this.scene.background = isP9() ? this.hallBg || (this.hallBg = t3rgb(C('#101218'))) : this.clubBg || (this.clubBg = t3rgb(C('#0d0913'))); return; }   // the club's wall is a layer in the world (updateLayers); the hall's is a mesh (p9Build)
      this.scene.background = this.bgTex;
      buf.fill(0);
      if (isP9()) P9.drawSky(R9); else drawSky();
      lightPass();
      this.bgData.set(buf);
      const t = this.bgTex; t.needsUpdate = true;
      t.repeat.set(cam.vw / CW, -cam.vh / CHMAX); t.offset.set(0, cam.vh / CHMAX);
    },

    // ----- rain, club light beams, roof searchlights -----
    buildFx() {
      this.rainMax = 600;
      const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(this.rainMax * 6), 3));
      this.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: new THREE.Color(170 / 255, 185 / 255, 220 / 255), transparent: true, opacity: 0.35, depthWrite: false }));
      this.rain.frustumCulled = false; this.rain.renderOrder = 15; this.scene.add(this.rain);
      const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(this.rainMax * 3), 3));   // Pier 9: the sleet's wet flakes
      this.flakes = new THREE.Points(fg, new THREE.PointsMaterial({ color: new THREE.Color(240 / 255, 244 / 255, 250 / 255), size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.7, depthWrite: false }));
      this.flakes.frustumCulled = false; this.flakes.renderOrder = 15; this.scene.add(this.flakes);
      const cone = new THREE.CylinderGeometry(1 / 13, 1, 1, 18, 1, true);   // narrow end (+y) at the source, 13x wider at the far end
      this.beams = Array.from({ length: 5 }, () => {
        const m = new THREE.Mesh(cone, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        m.frustumCulled = false; m.renderOrder = 14; m.visible = false; this.scene.add(m); return m;
      });
    },
    beam(i, x0, y0, x1, y1, r1, z, rgb, op) {   // a light cone from its source (x0, y0) to (x1, y1), r1 wide there
      const m = this.beams[i], dx = x1 - x0, dy = y0 - y1, len = Math.hypot(dx, dy);
      m.position.set((x0 + x1) / 2, -(y0 + y1) / 2, z);
      this.DIR.set(-dx / len, -dy / len, 0); m.quaternion.setFromUnitVectors(this.UP, this.DIR);
      m.scale.set(r1, len, r1); m.material.color.setRGB(...rgb); m.material.opacity = op; m.visible = true;
    },
    updateFx() {
      const p = this.rain.geometry.attributes.position, n = flags.club ? 0 : Math.min(rain.drops.length, this.rainMax), sleet = isP9();
      if (this.rainSleet !== sleet) { this.rainSleet = sleet; const m = this.rain.material; if (sleet) { m.color.setRGB(226 / 255, 232 / 255, 240 / 255); m.opacity = 0.5; } else { m.color.setRGB(170 / 255, 185 / 255, 220 / 255); m.opacity = 0.35; } }   // Pier 9: sleet, whiter and steeper
      for (let i = 0; i < n; i++) {
        const d = rain.drops[i], far = d.v < (sleet ? 150 : 290), l = far ? 3 : 5, onProp = floorBelow(d.x, d.y, 0) !== GROUND_S;
        const z = onProp ? T3.ZF + 2 + (i * 7 % 15) : far ? -10 - (i * 7 % 9) : (i * 37 % 41) - 12;   // over a car or a scaffold: the drops fall onto it, not in front of it
        p.setXYZ(i * 2, d.x, -d.y, z); p.setXYZ(i * 2 + 1, d.x + (sleet ? l / 2 : l / 3), -(d.y - l), z);
      }
      p.needsUpdate = true; this.rain.geometry.setDrawRange(0, n * 2);
      let nf = 0;
      if (sleet) { const fp = this.flakes.geometry.attributes.position; for (let i = 0; i < n; i++) { const d = rain.drops[i]; if (d.flake) fp.setXYZ(nf++, d.x + 1, -(d.y + 1), d.v < 150 ? -10 - (i * 7 % 9) : (i * 37 % 41) - 12); } fp.needsUpdate = true; }
      this.flakes.geometry.setDrawRange(0, nf);
      for (const b of this.beams) b.visible = false;
      if (flags.club && !isP9()) clubSpots().forEach((sp, i) => this.beam(i, sp.fx, GROUND - 144, sp.x, GROUND - 2, 13, -3, sp.c.map(v => Math.min(1, v / 1.4)), 0.13));
      else if (cam.x < GOAL.x1 + 60 && cam.x + cam.vw > GOAL.x0 - 60) [[GOAL.x0 + 8, 0, GOAL.y - 2], [GOAL.x1 - 8, 2.2, GOAL.y - 70]].forEach(([bx, ph, by], i) => {
        const a = Math.sin(simTime * 0.5 + ph) * 0.5;
        this.beam(i, bx, by, bx + Math.tan(a) * 220, by - 220, 13, T3.ZF + 2, [0.55, 0.55, 0.5], 0.09);
      });
    },

    // ----- light and camera -----
    updateLights() {
      const [aR, aG, aB, ls] = lightList();
      T3U.amb.value.set(aR, aG, aB);
      for (let i = 0; i < T3.NL; i++) {
        const q = ls[i];
        if (q) {
          T3U.lp.value[i].set(q[0] + cam.x, q[1] + cam.y, q[2], q[6]); T3U.lc.value[i].set(q[3], q[4], q[5]);
          const key = Math.abs(q[0] + cam.x - P[2].x) < 0.01 && Math.abs(q[1] + cam.y - (P[2].y - 12)) < 0.01;   // the key light follows the hero
          T3U.lz.value[i] = key ? (this.zw.get(this.hero) ?? 0) : flags.club ? 0 : q[6] > 0 ? -10 : T3.ZF + 2;
        }
        else T3U.lp.value[i].set(0, 0, 0, 0);
      }
      T3U.cam.value.set(cam.x, rain.k, flags.club ? 1 : 0, simTime); T3U.view.value = cam.vw;
    },
    updateCamera() {
      // a shifted lens instead of a tilt: the camera stands above the view and looks straight at the wall, so verticals stay
      // vertical and the fight lane (z = 0) maps 1:1 onto the 2D pixels; the tops of things below eye level still show
      const cam3 = this.camera, cx = cam.x + cam.vw / 2, cy = cam.y + cam.vh / 2, t = Math.tan(T3.FOV * Math.PI / 360), D = (cam.vh / 2) / t, h = D * Math.tan(T3.PITCH);
      cam3.position.set(cx, -cy + h, D); cam3.rotation.set(0, 0, 0);
      cam3.updateProjectionMatrix(); cam3.projectionMatrix.elements[9] = -h / (D * t); cam3.projectionMatrixInverse.copy(cam3.projectionMatrix).invert();
    },
    frame(rdt) {
      if (!this.renderer) return;
      if (this.builtFor !== LV.id) this.rebuildWorld();   // the level changed (street <-> Pier 9)
      this.rdt = rdt;
      this.updateCamera();
      this.updateLights();
      this.updateBackground();
      this.updateLayers();
      this.updateWindows(rdt);
      this.p9Frame();
      this.nM = 0;
      if (this.slots) for (const h of this.slots.values()) h.used = false;
      this.updateFighters();
      this.updateModels();
      if (this.slots) for (const h of this.slots.values()) if (!h.used) h.mesh.visible = false;
      this.updateGore(rdt);
      this.updateFx();
      this.reflect();
      this.post();
    },
    // the finish: postPass() of the 2D view, as shaders (bright pass and blur on a grid of 4 x 4 view pixels, then the grade, the vignette, the fade)
    buildPost() {
      const rt = (f, d) => new THREE.WebGLRenderTarget(4, 4, { minFilter: f, magFilter: f, depthBuffer: d });
      this.rtMain = rt(THREE.NearestFilter, true); this.rtA = rt(THREE.LinearFilter, false); this.rtB = rt(THREE.LinearFilter, false);
      this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this.postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); this.postScene = new THREE.Scene(); this.postScene.add(this.postQuad);
      const G = GRADE, f = v => v.toFixed(4), vs = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
      const U = { tSrc: { value: null }, tBloom: { value: null }, gp: { value: new THREE.Vector2(1, 1) }, view: { value: new THREE.Vector2(1, 1) }, dir: { value: new THREE.Vector2(1, 0) }, fade: { value: 1 } };
      const mk = fs => new THREE.ShaderMaterial({ uniforms: U, vertexShader: vs, fragmentShader: fs, depthTest: false, depthWrite: false });
      this.postU = U;
      // view: the part of the render that the view fills (uv); gp: the grid size in cells
      this.mBright = mk(`uniform sampler2D tSrc; uniform vec2 gp, view; varying vec2 vUv;
        vec3 T(vec2 o) { vec3 c = texture2D(tSrc, (vUv + o * 0.25 / gp) * view).rgb; return c * smoothstep(${f(G.bloomT)}, 1.0, max(c.r, max(c.g, c.b))); }
        void main() { gl_FragColor = vec4((T(vec2(-1.0, -1.0)) + T(vec2(1.0, -1.0)) + T(vec2(-1.0, 1.0)) + T(vec2(1.0, 1.0))) * 0.25, 1.0); }`);
      this.mBlur = mk(`uniform sampler2D tSrc; uniform vec2 gp, dir; varying vec2 vUv;
        void main() { float w[5]; w[0] = ${f(G.W[0])}; w[1] = ${f(G.W[1])}; w[2] = ${f(G.W[2])}; w[3] = ${f(G.W[3])}; w[4] = ${f(G.W[4])};
          vec2 g = floor(vUv * gp); vec3 c = vec3(0.0);
          for (int k = -4; k <= 4; k++) { vec2 q = clamp(g + dir * float(k), vec2(0.0), gp - 1.0); c += texture2D(tSrc, (q + 0.5) / gp).rgb * w[k < 0 ? -k : k]; }
          gl_FragColor = vec4(c, 1.0); }`);
      this.mComp = mk(`uniform sampler2D tSrc, tBloom; uniform vec2 gp, view; uniform float fade; varying vec2 vUv;
        void main() {
          vec2 gu = vUv;
          vec3 c = texture2D(tSrc, vUv * view).rgb, b = texture2D(tBloom, vUv).rgb;
          c += b * ${f(G.bloom)};
          float l = dot(c, vec3(0.299, 0.587, 0.114)), k = smoothstep(0.2, 0.8, l);
          c = vec3(l) + (c - vec3(l)) * ${f(G.sat)} + vec3(-0.01 + 0.04 * k, 0.015 * k, 0.035 - 0.055 * k);
          vec2 v = gu * 2.0 - 1.0; float vg = 1.0 - ${f(G.vig)} * smoothstep(0.35, 1.25, dot(v, v));
          gl_FragColor = vec4(clamp(c * vg, 0.0, 1.0) * fade, 1.0);
        }`);
    },
    post() {
      const r = this.renderer, U = this.postU, gw = Math.ceil(cam.vw / 4), gh = Math.ceil(cam.vh / 4), q = this.postQuad;
      if (this.rtA.width !== gw || this.rtA.height !== gh) { this.rtA.setSize(gw, gh); this.rtB.setSize(gw, gh); }
      U.gp.value.set(gw, gh); U.view.value.set(1, 1); U.fade.value = 1 - clamp(fade, 0, 1);
      r.setRenderTarget(this.rtMain); r.render(this.scene, this.camera);
      const pass = (m, src, dst) => { q.material = m; U.tSrc.value = src; r.setRenderTarget(dst); r.render(this.postScene, this.postCam); };
      pass(this.mBright, this.rtMain.texture, this.rtA);
      U.dir.value.set(1, 0); pass(this.mBlur, this.rtA.texture, this.rtB);
      U.dir.value.set(0, 1); pass(this.mBlur, this.rtB.texture, this.rtA);
      U.tBloom.value = this.rtA.texture; pass(this.mComp, this.rtMain.texture, null);
    },
  };

  // ---- mode switch: the 3D canvas covers the 2D one (which still runs underneath and takes the pointer) ----
  let mode3D = false;
  const threeCanvas = document.getElementById('three-canvas');
  const b3d = document.getElementById('b-3d');
  function setMode3D(on) {
    mode3D = on;
    threeCanvas.classList.toggle('hidden', !on);
    if (b3d) { b3d.setAttribute('aria-pressed', on ? 'true' : 'false'); b3d.textContent = on ? '2D view' : '3D view'; }
    if (on && !Three3D.renderer) Three3D.init();
    if (on) Three3D.resize();
  }
  b3d?.addEventListener('click', () => setMode3D(!mode3D));

  // ---------- pointer: drag and hit ----------
  const toWorld = e => { const r = cv.getBoundingClientRect(); return { x: cam.x + (e.clientX - r.left) / r.width * cam.vw, y: cam.y + (e.clientY - r.top) / r.height * cam.vh }; };
  function nearest(pos) {
    let best = -1, bd = Infinity;
    P.forEach((p, i) => { const d = Math.hypot(p.x - pos.x, p.y - pos.y) - p.r; if (d < bd) { bd = d; best = i; } });
    return bd < 4 ? best : -1;
  }
  function releaseGrab() {
    if (grabIdx >= 0) P[grabIdx].grab = false;
    grabIdx = -1; cv.classList.remove('grabbing');
  }
  cv.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (flags.attract) return;   // (the title screen starts from its menu)
    const pos = toWorld(e), i = nearest(pos);
    if (i >= 0) {
      toRag();
      grabIdx = i; P[i].grab = true; target = pos; pv = { x: 0, y: 0 }; lastPtr = { ...pos, t: performance.now() };
      cv.setPointerCapture(e.pointerId); cv.classList.add('grabbing');
      return;
    }
    if (punchAt(pos.x, pos.y)) return;
    if (bagTouch(pos.x, pos.y)) { bagHit(pos.x, pos.y, pos.x < bag[3].x ? 1 : -1, 140); return; }
    for (const o of objs) {
      if (objNear(o, pos.x, pos.y).d < 4) { launchObj(o, pos.x, pos.y, o.x >= pos.x ? 1 : -1, 150, 0.5); return; }
    }
  });
  cv.addEventListener('pointermove', e => {
    const pos = toWorld(e);
    if (grabIdx < 0) { cv.classList.toggle('can-grab', nearest(pos) >= 0); return; }
    const now = performance.now(), dt = Math.max(0.004, (now - lastPtr.t) / 1000);
    pv.x = pv.x * 0.5 + (pos.x - lastPtr.x) / dt * 0.5; pv.y = pv.y * 0.5 + (pos.y - lastPtr.y) / dt * 0.5;
    const sp = Math.hypot(pv.x, pv.y); if (sp > 600) { pv.x *= 600 / sp; pv.y *= 600 / sp; }
    target = { x: clamp(pos.x, 1, W - 1), y: Math.min(GROUND - 2, pos.y) };
    lastPtr = { ...pos, t: now }; lastMove = now;
  });
  cv.addEventListener('pointerup', releaseGrab);
  cv.addEventListener('pointercancel', releaseGrab);

  // ---------- keyboard and buttons ----------
  const keys = { left: false, right: false, shift: false }, touch = { left: false, right: false };
  let runToggle = false;
  const runBtn = document.getElementById('c-run'), slowBtn = document.getElementById('b-slow'), skelBtn = document.getElementById('b-skel');
  const zoomBtns = [...document.querySelectorAll('.zoom')];
  const takeOver = () => { if (flags.attract) endAttract(); else if (flags.demo) setDemo(false); };
  const doJump = () => { takeOver(); input.jump = true; };
  const doAttack = a => { takeOver(); input.attack = a; };
  // one button punches (or swings the weapon), one kicks. A tap (let go before HOLD_T) is the light move. Held to HOLD_T the
  // move goes off by itself: the heavy one when a goon is in reach (within two arm's lengths in front), else a throw when there
  // is something to throw (a melee weapon, a pocket item, a lifted object); with nothing to throw, the heavy one anyway.
  // A lifted object bashes on a tap. A loaded gun fires on the press (hold the machine gun for a stream), an empty one is thrown at once
  const HOLD_T = 0.3;
  const btn = { p: { down: false, t: 0, done: false }, k: { down: false, t: 0, done: false } };
  const holdCanThrow = () => !!(ctl.carry || pocket.length || WEAPONS[hero.weapon].melee);
  const foeInReach = () => { const r = 2 * (L.ua + L.fa); return enemies.some(e => !e.dead && Math.abs(e.x - ctl.x) <= r && (e.x - ctl.x) * ctl.face > -6 && Math.abs(e.y - ctl.y) < 24); };
  const holdThrows = k => k === 'p' && holdCanThrow() && !foeInReach();   // what a full hold will do: throw (true) or the heavy move
  function pressBtn(k) {
    const b = btn[k]; if (b.down) return;
    takeOver(); b.down = true; b.t = 0; b.done = false;
    if (k === 'p') { input.fireHeld = true; const Wp = WEAPONS[hero.weapon]; if (Wp.gun && !ctl.carry) { b.done = true; doAttack(charge[hero.weapon] > 0 ? 'lp' : 'tw'); } }
  }
  function releaseBtn(k) {
    const b = btn[k]; if (!b.down) return;
    b.down = false; if (k === 'p') input.fireHeld = false;
    if (!b.done) { b.done = true; doAttack(k === 'p' ? 'lp' : 'lk'); }   // let go early: the light move
  }
  function btnTick(dt) {
    for (const k of ['p', 'k']) {
      const b = btn[k]; if (!b.down || b.done) continue;
      b.t += dt;
      if (b.t < HOLD_T) continue;
      b.done = true;   // held long enough: it goes off now, without waiting for the release
      if (k === 'k') doAttack('hk');
      else if (holdThrows('p')) doAttack('tw');
      else doAttack(ctl.carry ? 'lp' : 'hp');   // a goon in reach: the heavy blow (a lifted object: a bash)
    }
  }
  const toggleRun = () => { takeOver(); runToggle = !runToggle; runBtn.setAttribute('aria-pressed', String(runToggle)); };
  const toggleSlow = () => { timeScale = timeScale === 1 ? 0.25 : 1; slowBtn.setAttribute('aria-pressed', String(timeScale !== 1)); emit(timeScale !== 1 ? 'slowmo:start' : 'slowmo:end', { scale: timeScale }); };
  const toggleSkel = () => { showSkel = !showSkel; skelBtn.setAttribute('aria-pressed', String(showSkel)); };
  function setZoom(z) {
    zoomMode = z === 'auto' ? 'auto' : +z;
    zoomBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.zoom === String(z))));
  }
  const cycleZoom = (dir = 1) => { const order = ['auto', '1', '0.75', '0.5', '0.25'], i = order.indexOf(String(zoomMode)); setZoom(order[(i + dir + order.length) % order.length]); saveSettings(); };

  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const c = e.code;
    if (sceneOn) return;   // a cutscene is loading or playing: its own controller has the keys (Escape must not open the menu between scenes)
    if (menuKey(e)) { e.preventDefault(); return; }   // the menu has the keys while it is open (the title screen, or Esc in a game)
    if (openT >= 0) { if ((c === 'Escape' || c === 'Enter') && !e.repeat) endOpening(); return; }
    if (isP9() && endPh === 'done' && !flags.wasted) { if (c === 'Enter' && !e.repeat && !resultsEl.hidden) quitToTitle(); return; }   // Pier 9 cleared: Enter goes back to the menu
    if (flags.wasted || (endPh === 'done' && !resultsEl.hidden)) { if ((c === 'Enter' || c === 'KeyR') && !e.repeat) reset(); return; }   // the Wasted or Club cleared card: only a restart (Esc opens the menu above)
    if (endPh && endPh !== 'done') { if ((c === 'Escape' || c === 'Enter') && !e.repeat) { if (isP9()) p9Outro(); else endFinish(); } return; }   // the ending: Esc or Enter jumps to the card
    // the keys: arrows move (up jumps, down squats), Q punches, W kicks, Space rolls, Shift runs
    if (c === 'ArrowLeft') { keys.left = true; takeOver(); }
    else if (c === 'ArrowRight') { keys.right = true; takeOver(); }
    else if (c === 'ArrowDown') { takeOver(); input.downHeld = true; }
    else if (c === 'ShiftLeft' || c === 'ShiftRight') { takeOver(); keys.shift = true; }
    else if (c === 'ArrowUp') { takeOver(); input.jumpHeld = true; if (!e.repeat) doJump(); }
    else if (c === 'KeyQ') { if (!e.repeat) pressBtn('p'); }
    else if (c === 'KeyW') { if (!e.repeat) pressBtn('k'); }
    else if (c === 'Space') { takeOver(); input.dashHeld = true; if (!e.repeat) input.dash = true; }
    else if (c === 'KeyM') { if (!e.repeat) toggleDemo(); }
    else if (!DEV) return;   // the sandbox keys below need ?dev
    else if (c === 'KeyX') knockOver();
    else if (c === 'KeyB') drop();
    else if (c === 'KeyG') { if (!e.repeat) { takeOver(); skipToBoss(); } }
    else if (c === 'KeyT') toggleSlow();
    else if (c === 'KeyF') toggleLofi();
    else if (c === 'KeyV') toggleSkel();
    else return;
    if (c.startsWith('Arrow') || c === 'Space') e.preventDefault();
  });
  addEventListener('keyup', e => {
    const c = e.code;
    if (c === 'ArrowLeft') keys.left = false;
    else if (c === 'ArrowRight') keys.right = false;
    else if (c === 'ShiftLeft' || c === 'ShiftRight') keys.shift = false;
    else if (c === 'ArrowDown') input.downHeld = false;
    else if (c === 'KeyQ') releaseBtn('p');
    else if (c === 'KeyW') releaseBtn('k');
    else if (c === 'Space') input.dashHeld = false;
    else if (c === 'ArrowUp') { if (!flags.demo) input.jumpHeld = false; }
  });
  addEventListener('blur', () => { btn.p.down = btn.k.down = false; input.fireHeld = false; keys.left = keys.right = keys.shift = false; touch.left = touch.right = false; input.downHeld = false; });

  for (const [id, side] of [['c-left', 'left'], ['c-right', 'right']]) {
    const b = document.getElementById(id);
    const on = e => { e.preventDefault(); takeOver(); touch[side] = true; b.classList.add('held'); b.setPointerCapture?.(e.pointerId); };
    const off = () => { touch[side] = false; b.classList.remove('held'); };
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
  }
  runBtn.addEventListener('click', toggleRun);
  {
    const b = document.getElementById('c-jump');
    const off = () => { input.jumpHeld = false; b.classList.remove('held'); };
    b.addEventListener('pointerdown', e => { e.preventDefault(); input.jumpHeld = true; doJump(); b.classList.add('held'); b.setPointerCapture?.(e.pointerId); });
    b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
    b.addEventListener('keydown', e => { if (e.key === 'Enter') { input.jumpHeld = true; doJump(); setTimeout(off, 250); } });
  }
  {
    const b = document.getElementById('c-down');
    const off = () => { input.downHeld = false; b.classList.remove('held'); };
    b.addEventListener('pointerdown', e => { e.preventDefault(); takeOver(); input.downHeld = true; b.classList.add('held'); b.setPointerCapture?.(e.pointerId); });
    b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
  }
  { const b = document.getElementById('c-dash');
    b.addEventListener('pointerdown', e => { e.preventDefault(); takeOver(); input.dash = true; input.dashHeld = true; b.setPointerCapture?.(e.pointerId); });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, () => { input.dashHeld = false; }); }
  for (const [id, k] of [['c-lp', 'p'], ['c-lk', 'k']]) {   // punch and kick buttons: tap or hold, like J and K
    const b = document.getElementById(id);
    const off = () => { releaseBtn(k); b.classList.remove('held'); };
    b.addEventListener('pointerdown', e => { e.preventDefault(); pressBtn(k); b.classList.add('held'); b.setPointerCapture?.(e.pointerId); });
    b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
    b.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.repeat) pressBtn(k); });
    b.addEventListener('keyup', e => { if (e.key === 'Enter') off(); });
  }
  const weaponBtns = [...document.querySelectorAll('.weapon')];
  const lpLabel = document.getElementById('c-lp').querySelector('span');
  const weaponEl = document.getElementById('r-weapon');
  function setWeapon(i) {
    if (i === hero.weapon) return;
    hero.weapon = i;
    if (MOVES[hero.act] && !/^(lk|hk|airkick|tw)/.test(hero.act)) { hero.act = ctl.air ? 'air' : null; ctl.spin = 0; }
    Object.assign(gun, { cd: 0, aimT: 0, aimW: 0, recoil: 0, climb: 0, pumpT: -1, want: false });
    weaponBtns.forEach(b => { b.setAttribute('aria-pressed', String(+b.dataset.w === i)); b.disabled = +b.dataset.w !== i; });   // a display: you hold one weapon
    lpLabel.textContent = WEAPONS[i].labels[0];
    weaponEl.textContent = WEAPONS[i].name;
    sparks.push({ x: P[6].x, y: P[6].y, t: 0.12 });   // a glint on the swap
  }
  zoomBtns.forEach(b => b.addEventListener('click', () => setZoom(b.dataset.zoom)));
  document.getElementById('b-knock').addEventListener('click', knockOver);
  document.getElementById('b-drop').addEventListener('click', drop);
  document.getElementById('b-reset').addEventListener('click', () => { takeOver(); reset(); });
  // test the boss level: the earlier stages count as done, a loaded machine gun, start on the club roof and walk in
  let autoWalk = false;
  function skipToBoss() {
    if (isP9()) { p9SkipToBoss(); return; }
    reset();
    for (const Z of ZONES.slice(0, ZONES.length - 1)) for (const [k] of Z.tasks) done.add(k);
    for (const k in WAVES) { spawned.add(+k); cleared.add(+k); }   // the street's goons are behind him: their waves do not come out now
    tutDirty = true;
    for (const k of pickups) k.taken = !k.rack;
    equip(4, WEAPONS[4].ammo);
    const dx = GOAL.x0 + 110 - ctl.x, dy = GOAL.y - 2 - ctl.y;
    Object.assign(ctl, { x: ctl.x + dx, y: ctl.y + dy, surf: GOAL, air: false, vu: 0, face: 1 });
    for (const p of P) { p.x += dx; p.px += dx; p.y += dy; p.py += dy; }
    for (const st of hair) for (const p of st) { p.x += dx; p.px += dx; p.y += dy; p.py += dy; }
    if (tails) for (const t of tails) for (const p of t) { p.x += dx; p.px += dx; p.y += dy; p.py += dy; }
    cam.xf = ctl.x - 80; cam.yf = ctl.y - 60; cam.v.x = cam.v.y = cam.v.z = 0;
    if (flags.demo) { di = Math.max(0, DEMO.findIndex(st => st.tag === 'club')); dk = 0; dTry = 0; dStarted = false; }
    else autoWalk = true;
  }
  function toggleDemo() { if (isP9()) return; if (flags.demo) setDemo(false); else { setDemo(true); } }
  // ---------- the opening: a dead goon flies in from the left and hits the street; he walks in after it and asks for his dog ----------
  const OPEN = { camX: 40, enter: 18, walkAt: 0.85, throwP: 150, line: 'Where is my dog?', sayFor: 3.4 };
  let openBody = null, openStopT = -1, openBled = false;
  const sayEl = document.getElementById('say');
  function startOpening() {
    openT = 0; openStopT = -1;
    const dx = OPEN.enter - ctl.x;   // he waits just off the left edge of the shot
    ctl.x += dx; for (const p of P) { p.x += dx; p.px += dx; }
    for (const st of hair) for (const p of st) { p.x += dx; p.px += dx; }
    if (tails) for (const t of tails) for (const p of t) { p.x += dx; p.px += dx; }
    const e = spawnEnemy('goon', OPEN.enter + 14, null);   // thrown from off screen: he comes in limp, lands, and lies still
    const k0 = kills.length, a0 = ammoBoxes.length, t0 = thrown.length;
    flags.noBleed = true; killEnemy(e, 1, OPEN.throwP, 0.7); flags.noBleed = false;   // he was beaten elsewhere: no spray in the air, only a pool where he lands
    { const vx = OPEN.throwP * 0.5 / e.m, vy = -OPEN.throwP * 0.7 * 0.4 / e.m - 60; for (const p of e.pts) { p.px = p.x - vx * DT; p.py = p.y - vy * DT; } }   // (thrown in from off screen: a long toss, unlike a blow)
    kills.length = k0; ammoBoxes.length = a0; thrown.length = t0; feedDirty = true;   // not one of yours on the kill list, and nothing to pick up (no ammo, bandage or weapon)
    e.pts.forEach((p, i) => { const k = i <= 1 ? 90 : i >= 7 ? -70 : 0; p.px -= k * DT; p.py += (i >= 7 ? 40 : 0) * DT; });   // the head leads, the feet trail: he tumbles through the air
    openBody = e; openBled = false;
  }
  // ---------- the ending: a drink at the bar, the bottle smashed, out of the club; the dog waits on the street ----------
  const END = { bar: 2694, door: DOOR_X + 8, out: STAIR_X0 + 10, dogX: 2384, mid: 2318 };   // on the street he comes down off the fire escape; the dog waits under the lamp by the wall
  function endGo(ph) { endPh = ph; endT = 0; }
  function endFinish() { endGo('done'); endCam = null; fade = 1; hero.act = null; ctl.bottle = false; }
  function endStreet() {   // cut to the street outside the club: the dog sits waiting by the wall
    flags.club = false; ctl.bottle = false;
    for (let i = enemies.length - 1; i >= 0; i--) if (!enemies[i].dead) enemies.splice(i, 1);   // the street is quiet now
    const dx = END.out - ctl.x, dy = GROUND - 2 - ctl.y;
    Object.assign(ctl, { x: END.out, y: GROUND - 2, face: 1, spd: 0, air: false, vu: 0, surf: GROUND_S }); hero.act = null;
    for (const p of P) { p.x += dx; p.px += dx; p.y += dy; p.py += dy; }
    for (const st of hair) for (const p of st) { p.x += dx; p.px += dx; p.y += dy; p.py += dy; }
    if (tails) for (const t of tails) for (const p of t) { p.x += dx; p.px += dx; p.y += dy; p.py += dy; }
    dog = makeDog(END.dogX, -1);
    endCam = { x: END.mid };
  }
  function endTick(rdt) {
    if (isP9()) { p9EndTick(rdt); return; }
    endT += rdt;
    for (const k of ['jump', 'jumpHeld', 'attack', 'fireHeld', 'dash', 'dashHeld', 'downHeld']) input[k] = k === 'attack' ? null : false;
    input.dir = 0; input.run = false;
    const walkTo = (x, face) => { const d = x - ctl.x; if (Math.abs(d) > 2) { input.dir = Math.sign(d); if (Math.abs(d) < 26) ctl.spd = Math.min(ctl.spd, TRN.stopV - 2); return false; } if (ctl.spd < 2) { ctl.face = face; return true; } return false; };   // a walk, eased in at the end so it stops without a skid
    if (endPh === 'wait') { if (endT > 1.8 && hero.mode === 'anim' && !ctl.air) { if (hero.weapon) setWeapon(0); pocket.length = 0; endGo('tobar'); } }
    else if (endPh === 'tobar') { if (walkTo(END.bar, 1) || endT > 12) { endGo('grab'); hero.act = 'grab'; hero.actT = 0; } }
    else if (endPh === 'grab') { hero.act = 'grab'; if (endT > 0.35) ctl.bottle = true; if (endT > 0.7) { endGo('drink'); hero.act = 'drink'; hero.actT = 0; } }
    else if (endPh === 'drink') { hero.act = 'drink'; if (endT > 1.7) { endGo('throw'); hero.act = null; ctl.face = -1; } }
    else if (endPh === 'throw') {
      if (endT > 0.25 && hero.act !== 'tw' && ctl.bottle) { ctl.bottle = false; pocket.unshift('bottle'); throwPocket(); }   // over the shoulder, across the room: it smashes
      if (endT > 1.1) endGo('out');
    }
    else if (endPh === 'out') {
      input.dir = ctl.x > END.door ? -1 : 0;
      if (ctl.x < END.door + 40 || endT > 10) { fade = Math.min(1, fade + rdt * 1.1); if (fade >= 1) { endStreet(); endGo('street'); } }
    }
    else if (endPh === 'street') { fade = Math.max(0, fade - rdt * 1.2); if (endT > 0.6) endGo('meet'); }
    else if (endPh === 'meet') {
      fade = Math.max(0, fade - rdt * 1.2);
      if (dog.x - ctl.x < 50) { dog.st = 'stand'; dog.wag = 1; }
      if (walkTo(dog.x - 34, 1) || endT > 8) { endGo('pet'); hero.act = 'pet'; hero.actT = 0; dog.heart = 0; }
    }
    else if (endPh === 'pet') { hero.act = 'pet'; dog.wag = 2; if (endT > 2.6) { hero.act = null; endGo('leave'); } }
    else if (endPh === 'leave') {
      input.dir = -1; ctl.face = -1; ctl.spd = Math.min(ctl.spd, WALK * 0.8);
      dog.st = 'walk'; dog.face = -1; dog.wag = 1;
      if (endT > 2.4) { fade = Math.min(1, fade + rdt * 0.7); if (fade >= 1) endFinish(); }
    }
    if (dog) {   // the dog walks at heel once they leave: it keeps a little ahead of him and matches his pace
      if (dog.st === 'walk') { const tx = ctl.x - 25, want = clamp((tx - dog.x) * 3, -75, 75); dog.vx += (want - dog.vx) * (1 - Math.exp(-6 * rdt)); dog.x += dog.vx * rdt; }
      else dog.vx = 0;
      dog.headDip = endPh === 'pet' ? 2 + Math.sin(endT * 9) * 0.6 : 0;   // leans its head into the hand
      dogStep(dog, rdt);
      if (dog.heart >= 0) dog.heart += rdt;
    }
  }
  // the dog: a German Shepherd, black saddle over tan, black muzzle, upright ears, a low bushy tail; waist high on him (15 px at the shoulder). A small skeleton: hips and shoulders on a spine,
  // a neck and head, four legs placed by two-bone IK on paw targets from a walk cycle (each paw plants and the body passes over it,
  // then it swings forward in an arc), and a verlet tail and ears that swing with the motion and wag.
  const DOG = { stride: 20, hipX: -10, shX: 8, hipH: 14, shH: 15, thigh: 6.5, shin: 6.2, upper: 6.2, fore: 6.2 };   // longer than tall, as a shepherd is
  function ik2(ax, ay, tx, ty, l1, l2, bend) {   // the middle joint of a two-bone limb; bend +1/-1 picks the side it folds to
    let dx = tx - ax, dy = ty - ay, d = Math.hypot(dx, dy) || 1e-6; const m = l1 + l2 - 0.01;
    if (d > m) { tx = ax + dx / d * m; ty = ay + dy / d * m; dx = tx - ax; dy = ty - ay; d = m; }
    const a = Math.atan2(dy, dx), c = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)) * bend;
    return [ax + Math.cos(a + c) * l1, ay + Math.sin(a + c) * l1, tx, ty];
  }
  function makeDog(x, face) {
    const d = { x, face, st: 'sit', ph: 0, up: 0, wag: 0.3, heart: -1, vx: 0, tail: [], ear: [] };
    for (let i = 0; i < 5; i++) d.tail.push({ x, y: GROUND - 18, px: x, py: GROUND - 18 });
    for (let i = 0; i < 2; i++) d.ear.push({ x, y: GROUND - 26, px: x, py: GROUND - 26 });
    return d;
  }
  function dogStep(d, dt) {
    d.up += ((d.st === 'sit' ? 0 : 1) - d.up) * (1 - Math.exp(-5 * dt));   // stands up (and sits) smoothly
    if (d.st === 'walk') d.ph += Math.abs(d.vx) * dt / DOG.stride;   // the cycle follows the ground covered: no skating paws
    else d.ph += (Math.round(d.ph * 2) / 2 - d.ph) * (1 - Math.exp(-6 * dt));   // stopping: the paws settle under him
    const P = dogPose(d), f = d.face;
    // tail: a verlet chain from the croup; it hangs and curls down, the wag swings it fore and aft, and it lags behind the body
    const root = P.tailRoot, wagA = Math.sin(simTime * (d.wag > 1.5 ? 22 : d.wag > 0.5 ? 14 : 4)) * (d.wag > 0.5 ? 0.9 : 0.3);
    d.tail[0].x = root[0]; d.tail[0].y = root[1];
    for (let i = 1; i < d.tail.length; i++) {
      const q = d.tail[i], vx = (q.x - q.px) * 0.9, vy = (q.y - q.py) * 0.9; q.px = q.x; q.py = q.y;
      const el = 0.1 - 0.42 * i, side = 0.55 + 0.45 * Math.cos(wagA * 2.2);   // up and back from the croup, drooping toward the tip; a side-to-side wag reads as the tail swinging in depth
      const tx = d.tail[i - 1].x - f * Math.cos(el) * 3 * side, ty = d.tail[i - 1].y - Math.sin(el) * 3 + wagA * 0.6 * (i > 2 ? 1 : 0);
      q.x += vx + (tx - q.x) * 0.25; q.y += vy + (ty - q.y) * 0.25 + 30 * dt * dt;
    }
    for (let r = 0; r < 3; r++) for (let i = 1; i < d.tail.length; i++) { const a = d.tail[i - 1], b = d.tail[i], dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1e-6; b.x = a.x + dx / l * 3; b.y = a.y + dy / l * 3; }
    // ears: a short floppy flap that bounces with the head
    d.ear[0].x = P.earRoot[0]; d.ear[0].y = P.earRoot[1];
    { const q = d.ear[1], vx = (q.x - q.px) * 0.8, vy = (q.y - q.py) * 0.8; q.px = q.x; q.py = q.y; q.x += vx - f * 6 * dt; q.y += vy + 180 * dt * dt;
      const a = d.ear[0], dx = q.x - a.x, dy = q.y - a.y, l = Math.hypot(dx, dy) || 1e-6; q.x = a.x + dx / l * 4; q.y = a.y + dy / l * 4; }
  }
  function dogPose(d) {   // world points of the skeleton for this frame
    const f = d.face, x0 = d.x, g = GROUND - 1, up = d.up, walk = d.st === 'walk' ? 1 : 0;
    const bob = walk * 0.7 * Math.sin(d.ph * Math.PI * 4), sitDrop = (1 - up);
    // sitting: the rump on the ground and the body steep, the shoulders a little back over straight forelegs
    const hip = [x0 + (DOG.hipX + 3.5 * sitDrop) * f, g - DOG.hipH * up - 4 * sitDrop + bob], sh = [x0 + (DOG.shX - 2.5 * sitDrop) * f, g - DOG.shH - bob * 0.6 - 1 * sitDrop];
    const neck = [sh[0] + 3.5 * f, sh[1] - 4.5 - 1.5 * sitDrop + bob * 0.5 + (d.headDip || 0)], head = [neck[0] + 2.5 * f, neck[1] - 1];
    const snout = [head[0] + 4.5 * f, head[1] + 1.8], earRoot = [head[0] - 1 * f, head[1] - 2.5];
    // paw targets: lateral walk, each paw 60 % planted and 40 % swinging; order hind-L, fore-L, hind-R, fore-R
    const paws = [];
    for (const [k, base, off, far] of [[0, DOG.hipX, 0, 1], [1, DOG.shX, 0.25, 1], [2, DOG.hipX, 0.5, 0], [3, DOG.shX, 0.75, 0]]) {
      const p = ((d.ph + off) % 1 + 1) % 1, st = DOG.stride;
      let dx = 0, lift = 0;
      if (walk) { if (p < 0.6) dx = st * (0.3 - p / 0.6 * 0.6); else { const s = (p - 0.6) / 0.4; dx = st * (-0.3 + 0.6 * smooth(s)); lift = Math.sin(Math.PI * s) * (k % 2 ? 3.5 : 3); } }
      paws.push({ k, far, x: x0 + (base + dx * 0.9) * f + (k % 2 ? 1 : -1) * f * 0.5, y: g - lift });
    }
    return { hip, sh, neck, head, snout, earRoot, paws, tailRoot: [hip[0] - 2 * f, hip[1] - 1], f, sitDrop };
  }
  // one leg's joints (shared by the 2D and the 3D dog): root (hip or shoulder), the knee or elbow, the hock or wrist, the toe, the paw
  function dogLeg(P, pw) {
    const f = P.f, sit = P.sitDrop;
    if (pw.k % 2 === 0) {   // a hind leg: on a sit the paw comes forward under the rump
      const paw = sit > 0.5 ? [P.hip[0] + 5 * f, GROUND - 1] : [pw.x, pw.y], hock = [paw[0] - 2.5 * f, paw[1] - 4.5 + 3.5 * sit];
      const root = [P.hip[0], P.hip[1] + 1], [kx, ky] = ik2(root[0], root[1], hock[0], hock[1], DOG.thigh, DOG.shin, -f);
      return { hind: true, root, mid: [kx, ky], low: hock, toe: [paw[0] + 0.5 * f, paw[1] - 0.6], paw };
    }
    const paw = [pw.x, pw.y], wrist = [paw[0] - 0.3 * f, paw[1] - 2.5], root = [P.sh[0], P.sh[1] + 1];
    const [ex, ey] = ik2(root[0], root[1], wrist[0], wrist[1], DOG.upper, DOG.fore, f);
    return { hind: false, root, mid: [ex, ey], low: wrist, toe: [paw[0] + 0.5 * f, paw[1] - 0.6], paw };
  }
  function drawDog() {
    if (!dog || flags.club) return;
    const P = dogPose(dog), f = P.f, px = new Map();
    const TAN = C('#b97a3c'), TANL = C('#d9a05e'), TAND = C('#7a4e24'), BLK = C('#1c171a'), BLKL = C('#3b3238'), EYE = C('#0a0809');
    const put = (x, y, c) => px.set(Math.round(x) + ',' + Math.round(y), c);
    const at = (p, dx, dy) => [p[0] + dx * f, p[1] + dy];
    const poly = (pts, c) => {   // scanline fill of a closed outline
      let y0 = Infinity, y1 = -Infinity; for (const q of pts) { y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
      for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
        const yy = y + 0.5, xs = [];
        for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= yy) !== (b[1] <= yy)) xs.push(a[0] + (yy - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
        xs.sort((p, q) => p - q);
        for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) put(x, y, c);
      }
    };
    const blob = (cx, cy, r, c) => { for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) if (dx * dx + dy * dy <= r * r + 0.3) put(cx + dx, cy + dy, c); };
    const limb = (a, b, r0, r1, c) => { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2) + 1; for (let i = 0; i <= n; i++) { const t = i / n; blob(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, r0 + (r1 - r0) * t, c); } };
    const leg = (pw, far) => {   // tapered: a muscled top, a fine lower leg, a small paw
      const c = far ? TAND : TAN, cl = far ? TAND : TANL, L = dogLeg(P, pw);
      if (L.hind) { limb(L.root, L.mid, 1.9, 1.2, c); limb(L.mid, L.low, 1.0, 0.7, c); }
      else { limb(L.root, L.mid, 1.6, 1.0, c); limb(L.mid, L.low, 0.9, 0.7, cl); }
      limb(L.low, L.toe, 0.7, 0.6, cl);
      put(L.paw[0], L.paw[1], cl); put(L.paw[0] + f, L.paw[1], cl);
    };
    for (const pw of P.paws) if (pw.far) leg(pw, true);
    // the tail: bushy, black on top, tan beneath
    for (let i = 1; i < dog.tail.length; i++) { const a = dog.tail[i - 1], q = dog.tail[i], r0 = 1.6 - (i - 1) * 0.2, r1 = 1.6 - i * 0.2; limb([a.x, a.y + 0.3], [q.x, q.y + 0.3], r0, r1, TAN); }
    for (let i = 1; i < dog.tail.length; i++) { const a = dog.tail[i - 1], q = dog.tail[i]; limb([a.x, a.y - 0.5], [q.x, q.y - 0.5], 0.9 - i * 0.1, 0.8 - i * 0.1, BLK); }   // one smooth brush: black over tan
    // the body: a sloping back (withers above the croup), a deep chest, a tucked belly
    const H = P.hip, S = P.sh, M = [(H[0] + S[0]) / 2, (H[1] + S[1]) / 2];
    poly([at(H, -2.6, -2.0), at(M, 0, -3.3), at(S, -1.5, -4.0), at(S, 2.6, -1.8), at(S, 3.1, 1.8), at(S, 0.6, 4.6), at(M, 1, 3.4), at(H, 4, 2.0), at(H, 0, 3.4), at(H, -3.4, 1.2)], TAN);
    poly([at(H, -2.6, -2.0), at(M, 0, -3.3), at(S, -1.5, -4.0), at(S, 0.2, -1.6), at(M, 0, -0.6), at(H, 0.5, -0.4)], BLK);   // the black saddle
    limb(at(H, -1, -1.6), at(S, -1.5, -3.3), 0.4, 0.4, BLKL);   // a sheen along the saddle
    blob(H[0] + 0.3 * f, H[1] + 1.2, 2.9, TAN);   // the near thigh, the big driving muscle
    // the neck and head
    const N = P.neck, HD = P.head, SN = P.snout;
    poly([at(S, -1.4, -3.6), at(N, -1.6, -1.2), at(N, 1.6, 1.9), at(S, 2.8, -0.6)], TAN);
    limb(at(S, -0.6, -3.4), at(N, -1.0, -1.2), 1.0, 0.9, BLK);   // dark down the back of the neck
    blob(HD[0], HD[1], 2.4, TAN);   // the skull
    poly([at(HD, 0.6, -1.9), at(SN, 0.6, -0.5), at(SN, 0.7, 0.7), at(SN, -0.6, 1.5), at(HD, 0.6, 2.0)], TAN);   // the wedge of the muzzle
    limb(at(HD, 2.2, -0.4), at(SN, 0.2, 0.2), 0.9, 0.8, BLK);   // the black muzzle
    put(SN[0] + 0.8 * f, SN[1], BLK); put(HD[0] + 1.1 * f, HD[1] - 0.8, EYE); put(HD[0] + 0.4 * f, HD[1] - 1.9, TANL);   // nose, eye, brow
    if (dog.wag > 1.5) { put(SN[0] - 0.6 * f, SN[1] + 2, C('#d0506a')); put(SN[0] - 1.2 * f, SN[1] + 2.2, C('#d0506a')); }   // panting
    {   // ears: tall points, pricked forward; the trot tips them back a touch
      const er = P.earRoot, tilt = clamp((dog.ear[1].x - dog.ear[0].x) * f * 0.2, -0.8, 0.8);
      poly([at(er, -1.6, 0.6), at(er, 1.0, 0.6), at(er, -0.6 - tilt, -3.6)], BLK);
      put(er[0] - 0.2 * f, er[1] - 0.6, TAND);
    }
    for (const pw of P.paws) if (!pw.far) leg(pw, false);
    // a rim of light along the top line (the lamp is overhead), then one clean outline round the whole dog
    const cols = new Map(); for (const k of px.keys()) { const [x, y] = k.split(',').map(Number); if (!cols.has(x) || y < cols.get(x)) cols.set(x, y); }
    for (const [x, y] of cols) { const c = px.get(x + ',' + y); px.set(x + ',' + y, c === BLK ? BLKL : c === TAN ? TANL : c); }
    for (let x = Math.round(Math.min(P.paws[0].x, P.paws[3].x)) - 6; x <= Math.round(Math.max(P.paws[0].x, P.paws[3].x)) + 6; x++) blendPlot(x, GROUND, 0, 0, 0, 0.35);   // its shadow on the pavement
    const out = [];
    for (const k of px.keys()) { const [x, y] = k.split(',').map(Number); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const kk = (x + dx) + ',' + (y + dy); if (!px.has(kk) && y + dy <= GROUND - 1) out.push([x + dx, y + dy]); } }
    for (const [x, y] of out) plot(x, y, PAL.out);
    for (const [k, c] of px) { const [x, y] = k.split(',').map(Number); plot(x, y, c); }
  }
  function drawDogHeart() {   // a small heart floats up over the dog while he pets it (drawn over everyone)
    if (!dog || flags.club || !(dog.heart >= 0 && dog.heart < 1.8)) return;
    const ry = GROUND - 24 - Math.round(dog.heart * 7), rx = Math.round(dog.x) + dog.face * 4, pink = C('#ff5a8a');
    for (const [x, y] of [[-1, -1], [0, -1], [2, -1], [3, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [-1, 1], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2], [2, 2], [1, 3]]) plot(rx + x, ry + y, pink);
    plot(rx - 1, ry - 1, C('#ffd0dc'));
  }
  function drawBottle() {   // the bottle in his hand at the bar: dark green glass along the forearm, a bright edge
    if (!ctl.bottle || hero.mode !== 'anim') return;
    const h = D[6], f = faceNow(), drink = hero.act === 'drink';
    const [ux, uy] = drink ? norm(-f * 0.55, 0.85) : [0, -1];   // from the base to the neck: upright, or tipped up (base high, neck down at his lips)
    const bx = drink ? h.x + f * 3.3 : h.x, by = drink ? h.y - 5 : h.y + 1;   // he grips the body; drinking, the base is up and out in front
    const glass = C('#2f6a44'), hi = C('#8ad0a0'), lab = C('#e8dcc0');
    for (let i = 0; i <= 6; i++) {
      const x = bx + ux * i, y = by + uy * i, w = i < 4 ? 1 : 0;   // a fat body, then a thin neck
      plot(Math.floor(x), Math.floor(y), i === 2 ? lab : i === 6 ? C('#c9a24a') : glass);
      if (w) plot(Math.floor(x - uy * f), Math.floor(y + ux * f), i === 1 ? hi : glass);
    }
  }
  function endOpening() { openT = -1; openBody = null; sayEl.hidden = true; }
  function openTick(rdt) {   // runs after the keys are read: the opening drives the input
    openT += rdt;
    for (const k of ['jump', 'jumpHeld', 'attack', 'fireHeld', 'dash', 'dashHeld', 'downHeld']) input[k] = k === 'attack' ? null : false;
    input.run = false; input.dir = 0;
    const pts = openBody && openBody.pts, bx = pts ? Math.min(...pts.map(p => p.x)) : OPEN.enter + 90;   // the body's nearest part (his feet trail)
    if (pts && !openBled && openT > 1.3) { openBled = true; bleed(pts[1].x, pts[1].y + 1, 1, 5, 0.25); }   // a small pool spreads from the head
    if (openStopT < 0) {
      if (openT > OPEN.walkAt) { input.dir = 1; ctl.spd = Math.min(ctl.spd, TRN.stopV - 2); }   // walks in after the body, no hurry (slow enough to stop without a skid)
      if (openT > OPEN.walkAt && (ctl.x >= bx - 14 || openT > 5)) openStopT = openT;   // stops a step short of the body
    }
    const st = openStopT < 0 ? -1 : openT - openStopT - 0.35;
    if (st >= 0) {   // stops over the body, then the line types itself out
      const n = Math.min(OPEN.line.length, Math.floor(st * 30));
      sayEl.hidden = false; sayEl.textContent = OPEN.line.slice(0, Math.max(1, n));
      const k = cv.clientWidth / cam.vw, hd = D[0];
      sayEl.style.left = `${(hd.x - cam.x) * k}px`; sayEl.style.top = `${(hd.y - cam.y - 6) * k}px`;
      if (st > OPEN.sayFor) endOpening();
    }
  }
  // ---------- levels: the tutorial street and Pier 9 (src/levels/pier9.js) ----------
  // loadLevel swaps the level lists in place (surfaces, lamps, doors, props, pickups, the static layer). The street's own lists are
  // kept in a snapshot the first time it is left, so going back restores them exactly. The caller then calls reset().
  const STREET_LV = LV, PIER9_LV = { id: 'pier9', title: 'Pier 9', startX: 60 };
  const LEVEL_LISTS = { PLATS, STEPS, LAMPS, WINL, FEAT, VPARTS, HOUSEWIN, DOORS, ALLEYS, CARDOORS, CLUB_DOORS, OBJ_START, pickups, VEH };
  let streetSnap = null, p9Data = null;
  function loadLevel(id) {
    if (LV.id === id) return;
    boards.length = 0; while (objs.length) removeObj(objs[0]);
    if (!streetSnap) { streetSnap = { stat: stat.slice(), PROPS: PROPS.slice(), STAT_BG, GOAL }; for (const k in LEVEL_LISTS) streetSnap[k] = LEVEL_LISTS[k].slice(); }
    let d;
    if (id === 'pier9') {
      if (!p9Data) {
        const pt = P9.paint({ W, H, PAL, PUDDLE, STREET, LAMP_GLASS, WIN_A, WIN_B, WIN_C, LAMP_IRON });
        p9Data = { stat: pt.b, PROPS: pt.props, STAT_BG: pt.bg, GOAL: { x0: -999, x1: -998, y: -999 }, PLATS: P9.surfaces(), STEPS: [], LAMPS: pt.lamps, WINL: pt.winl, FEAT: [], VPARTS: [],
          HOUSEWIN: pt.housewin, DOORS: pt.doors, ALLEYS: [], CARDOORS: pt.cdoors, CLUB_DOORS: P9.HALL_DOORS, OBJ_START: P9.OBJ_START, VEH: pt.veh,
          pickups: P9.PICKUPS.map(k => ({ w: k.w, x: k.x, y: restY(k.w) + (k.yOff || 0), taken: false, rack: !!k.rack })) };
      }
      d = p9Data; LV = PIER9_LV;
    } else { d = streetSnap; LV = STREET_LV; }
    for (const k in LEVEL_LISTS) { LEVEL_LISTS[k].length = 0; LEVEL_LISTS[k].push(...d[k]); }
    stat.set(d.stat); PROPS.set(d.PROPS); STAT_BG = d.STAT_BG; GOAL = d.GOAL;
    SURF.length = 0; SURF.push(GROUND_S, ...PLATS, ...TRAMPS);
    for (const w of HOUSEWIN) { w.off = false; w.peek = false; w.t = 0; w.lv = 1; }
  }
  // the Pier 9 run: waves along the quay, the shutter, the boss in the hall, the conveyor's tuna, the ending
  const p9 = { w: {}, queue: [], shutter: 0, open: false, bossDlg: false, dlgDone: false, crewT: 0, obj: '', tuna: { st: 'off', t: 0, x: 0, dir: 1, a: 0, hit: null } };
  const R9 = { buf, CW, cam, plot, plotV, line1, blendPlot: (x, y, r, g, b, a) => blendPlot(x, y, r, g, b, a), get t() { return simTime; } };
  function p9Reset() {
    p9.w = {}; for (const w of P9.WAVES) p9.w[w.id] = { out: false, n: 0 };
    p9.queue.length = 0; p9.shutter = 0; p9.open = false; p9.bossDlg = false; p9.dlgDone = false; p9.crewT = 0; p9.obj = '';
    Object.assign(p9.tuna, { st: 'off', t: 0, hit: null }); hookPull = false; barkT = 0; sayEl.hidden = true;
    rain.k = rain.goal = 0.8; rain.drops.length = 0;
    setObjective('Pier 9', 'Find the collector');
  }
  function setObjective(h, sub) {
    const html = `<span class="stage-n">Level 1 · Dawn</span><h2>${h}</h2>${sub ? `<div class="next">${sub}</div>` : ''}`;
    if (p9.obj !== html) { p9.obj = html; tutEl.innerHTML = html; }
  }
  const saltOpts = v => { const S = P9.SALTMEN[v]; return { role: S.role, look: S.look, R: S.R || null }; };
  function p9Wave(W_) {   // a wave: each Saltman steps out of a door, a container or the fog, one after another
    const st = p9.w[W_.id]; if (st.out) return;
    const roster = W_.roster[diffSel]; st.out = true; st.n = roster.length;
    roster.forEach((v, i) => p9.queue.push({ v, wave: W_.id, src: W_.from[i % W_.from.length], t: 0.15 + i * 0.5 }));
    toast('Saltmen', `${roster.length} of them`, true);
  }
  function p9SpawnOne(q) {
    const src = q.src;
    let x = src.x;
    if (src.kind === 'fog') x = clamp(cam.x + cam.vw + 14, 20, STREET_END - 20);   // out of the sleet beyond the edge of the view
    const e = spawnEnemy('goon', x, q.wave, saltOpts(q.v));
    if (src.kind === 'top') { e.y = src.y - 2; e.perch = 14; dust(x, src.y - 1, 4); }   // a perched shooter: fires down from a stack top, then climbs down
    else if (src.kind === 'door') { const d = DOORS.find(d => d.x === src.x); if (d) spawnFx.push({ kind: 'door', d, x, t: 0 }); }
    else if (src.kind === 'cdoor') { const d = CARDOORS.find(d => d.x === src.x); if (d) spawnFx.push({ kind: 'car', d, x, t: 0 }); }
    e.cdT = Math.max(e.cdT, 0.9);
  }
  let barkT = 0, barkE = null;
  function bark(e, text) { barkE = e; barkT = 2.2; sayEl.textContent = text; sayEl.hidden = false; }
  function p9Tick(rdt) {   // per frame (UI clock): waves, the shutter, the boss start, the objective line, barks
    const dt = rdt * timeScale;
    if (barkT > 0) {
      barkT -= rdt;
      const J = barkE && (barkE.dead ? barkE.pts : barkE.J);
      if (barkT <= 0 || !J) { barkT = 0; sayEl.hidden = true; }
      else { const k = cv.clientWidth / cam.vw; sayEl.style.left = `${(J[0].x - cam.x) * k}px`; sayEl.style.top = `${(J[0].y - cam.y - 8) * k}px`; }
    }
    if (endPh) return;
    if (hero.mode === 'anim' && !flags.club) for (const W_ of P9.WAVES) if (W_.at != null && P[2].x >= W_.at) p9Wave(W_);
    for (const W_ of P9.WAVES) if (W_.then && p9.w[W_.id].out && !p9.w[W_.then].out && !p9.queue.some(q => q.wave === W_.id) && (zoneAlive[W_.id] || 0) <= p9.w[W_.id].n / 2) p9Wave(P9.WAVES.find(w => w.id === W_.then));
    for (let i = p9.queue.length - 1; i >= 0; i--) { const q = p9.queue[i]; if ((q.t -= dt) <= 0) { p9.queue.splice(i, 1); p9SpawnOne(q); } }
    if (!p9.open && P9.WAVES.every(w => p9.w[w.id].out && !(zoneAlive[w.id] > 0)) && !p9.queue.length) {
      p9.open = true; toast('The shutter rolls up', 'The fish market is open. The collector is inside.');
      emit('sfx', { name: 'crate_break', x: P9.MARKET.shutter[0], vol: 0.5, pitch: 0.5 });
    }
    if (p9.open) p9.shutter = Math.min(1, p9.shutter + dt * 0.6);
    if (!enc.boss && !enc.bossBeaten && hero.mode === 'anim' && flags.club && slamDone) startMarchetti();
    const left = P9.WAVES.reduce((n, w) => n + (zoneAlive[w.id] || 0), 0) + p9.queue.length;
    if (flags.club) setObjective('The fish market', enc.boss && !enc.boss.dead ? `Defeat ${P9.MARCHETTI.name}` : 'Find the collector');
    else if (p9.open) setObjective('Pier 9', 'Find the collector · into the fish market →');
    else setObjective('Pier 9', left ? `Find the collector · Saltmen: ${left}` : 'Find the collector');
  }
  function startMarchetti() {   // the hatch slams; he walks out of the cold-store door; the portrait dialog; the fight
    enc.arena = { x0: 2440, x1: W - 12 }; enc.spawnT = 99; enc.arenaSpawned = 0; p9.crewT = 0;
    const dx = CLUB_DOORS[1];
    enc.boss = spawnEnemy('boss', dx, 'boss', { boss: P9.MARCHETTI });
    enc.boss.intro = true; enc.boss.introX = dx - 70; enc.boss.face = -1;
    enc.introT = 0; bossBarK = 0; spawnFx.push({ kind: 'club', x: dx, t: 0 });
    emit('boss:intro', { boss: enc.boss, name: enc.boss.name });
    toastEl.hidden = true; toastT = 0; toastQ.length = 0;
  }
  function p9Step(dt) {   // fixed step: the boss's crew, the conveyor's swinging tuna
    const B = enc.boss, M = P9.MARCHETTI, A = DIF().A;
    if (!B || B.dead) hookPull = false;
    for (const e of enemies) {   // perched shooters: after a while (or once he is up with them) they come down off the stack
      if (!(e.perch > 0) || e.dead) continue;
      if ((e.perch -= dt) > 0 && Math.abs(ctl.y - e.y) > 6) continue;
      const level = e.perch > 0; e.perch = 0;
      if (level) continue;   // he climbed up to them: they fight him up there
      const s = floorBelow(e.x, e.y + 1.5, 0);
      if (s !== GROUND_S) e.dropTo = P[2].x < (s.x0 + s.x1) / 2 ? s.x0 - 8 : s.x1 + 8;
    }
    for (const e of enemies) if (e.dropTo != null) { if (e.dead || (!e.air && e.y > GROUND - 6)) e.dropTo = null; else if (!e.down && !e.act) { e.x += Math.sign(e.dropTo - e.x) * 40 * dt; e.face = Math.sign(e.dropTo - e.x) || e.face; } }
    if (B && !B.dead && enc.arena && enc.introT < 0 && flags.club) {   // the crew comes through the hall doors
      const Cw = M.crew, ph2 = B.ph >= 2, cfg = ph2 ? Cw.ph2 : Cw.ph1, alive = enemies.filter(g => !g.dead && g.zone === 'arena').length;
      p9.crewT += dt;
      if ((ph2 || p9.crewT > Cw.ph1.delay) && enc.arenaSpawned < Cw.max[diffSel] && alive < cfg.alive[diffSel] && (enc.spawnT = Math.min(enc.spawnT, cfg.every) - dt) <= 0) {
        enc.spawnT = cfg.every; enc.arenaSpawned++;
        const roles = ph2 ? Cw.ph2Roles : Cw.ph1Roles, dx = CLUB_DOORS[enc.arenaSpawned % 2];
        const g = spawnEnemy('goon', clamp(dx, enc.arena.x0 + 6, enc.arena.x1 - 4), 'arena', saltOpts(roles[enc.arenaSpawned % roles.length]));
        g.cdT = Math.max(g.cdT, 0.8); spawnFx.push({ kind: 'club', x: dx, t: 0 });
        if (simRand() < 0.5) bark(g, ['For Sal!', 'Is that really him?', "Don't look at his eyes."][Math.floor(simRand() * 3)]);
      }
    }
    const T = p9.tuna, TM = M.tuna;
    if (!(B && !B.dead && B.ph >= 2 && flags.club)) { T.st = 'off'; return; }
    if (T.st === 'off') { T.st = 'idle'; T.t = 2.5; }
    if (T.st === 'idle') { if ((T.t -= dt) <= 0) { T.st = 'warn'; T.t = Math.max(0.7, TM.warn / A ** 0.25); T.dir = simRand() < 0.5 ? 1 : -1; emit('boss:telegraph', { boss: B, move: 'tuna', t: T.t, x: T.dir > 0 ? 2440 : W - 10 }); } }
    else if (T.st === 'warn') { if ((T.t -= dt) <= 0) { T.st = 'swing'; T.x = T.dir > 0 ? 2428 : W + 6; T.hit = new Set(); emit('sfx', { name: 'dodge_whoosh', x: T.x, vol: 1, pitch: 0.45 }); } }
    else if (T.st === 'swing') {   // a frozen tuna on its hook sweeps the arena at chest height: crouch or roll under it; it floors anyone it hits
      T.x += T.dir * TM.v * dt; T.a = -T.dir * (0.25 + 0.1 * Math.sin(simTime * 6));
      const top = P9.TUNA.top - 4, bot = P9.TUNA.bottom;
      if (!T.hit.has('hero') && hero.mode === 'anim' && hero.invT <= 0 && Math.abs(P[2].x - T.x) < 9 && P[0].y < bot && P[0].y > top - 40) {
        T.hit.add('hero'); hurtPlayer(TM.dmg[diffSel], T.x, P[1].y, T.dir, true, 1.6);
      }
      for (const e of enemies) {
        if (e.dead || e.down || !e.J || T.hit.has(e) || Math.abs(e.x - T.x) > 8 * e.s || e.J[0].y > bot) continue;
        T.hit.add(e); enc.eHitKind = 0;
        if (e === B) {   // the boss takes it hard: a stagger and a free second
          damageEnemy(e, TM.bossDmg, T.dir, 300, 0.3, e.x, e.J[1].y, false);
          if (!e.dead) { e.sp = null; e.hook = null; hookPull = false; e.act = null; e.combo = null; e.stunT = 1; e.recT = 1; e.vx = T.dir * 60; }
        } else { damageEnemy(e, 14, T.dir, 300, 0.3, e.x, e.J[1].y, false); if (!e.dead && !e.down) knockDown(e, T.dir, 300, 'hp'); }
        sparks.push({ x: T.x, y: e.J[1].y, t: 0 }); shakeIt(0.12, 2);
      }
      if (T.x < 2420 || T.x > W + 14) { T.st = 'idle'; T.t = (TM.every[0] + simRand() * (TM.every[1] - TM.every[0])) / Math.sqrt(A); }
    }
  }
  function sleetStep(dt) {   // Pier 9 weather: steady sleet outdoors (the rain system, slower and heavier), none in the hall
    rain.k += (0.8 - rain.k) * (1 - Math.exp(-0.4 * dt)); rain.flash = 0;
    const want = flags.club ? 0 : Math.round(rain.k * 150);
    while (rain.drops.length < want) rain.drops.push({ x: cam.x + simRand() * (cam.vw + 90), y: cam.y - simRand() * cam.vh, v: 110 + simRand() * 70, flake: simRand() < 0.3 });
    if (rain.drops.length > want) rain.drops.length = want;
    for (const d of rain.drops) {
      d.x -= 62 * dt; d.y += d.v * dt;
      const fl = d.y > cam.y + 10 ? floorBelow(d.x, d.y - 6, 0).y : 1e9;
      if (d.y >= fl || d.y > cam.y + cam.vh + 10 || d.x < cam.x - 40) {
        if (d.y >= fl && d.y < cam.y + cam.vh) { rain.splash.push({ x: d.x, y: fl - 1, t: 0 }); if (fl === GROUND && simRand() < 0.4) rain.rip.push({ x: d.x, d: 1 + Math.floor(simRand() * (STREET - 2)), t: 0 }); }
        d.x = cam.x + simRand() * (cam.vw + 90); d.y = cam.y - simRand() * 30; d.v = 110 + simRand() * 70;
      }
    }
    for (let i = rain.splash.length - 1; i >= 0; i--) if ((rain.splash[i].t += dt) > 0.12) rain.splash.splice(i, 1);
    for (let i = rain.rip.length - 1; i >= 0; i--) if ((rain.rip[i].t += dt) > 0.45) rain.rip.splice(i, 1);
  }
  function p9Lights() {   // dawn: a grey-blue ambient, sodium pools, the drum's red flicker; the hall: cold light under enamel lamps
    const ls = [];
    if (!flags.club) {
      const dim = 1 - rain.k * 0.08, aR = 0.5 * dim, aG = 0.55 * dim, aB = 0.7 * dim;
      for (const lx of LAMPS) if (lx > cam.x - 100 && lx < cam.x + cam.vw + 100) ls.push([lx + 8 - cam.x, GROUND - 78 - cam.y, 95 * 95, 1.45, 1.05, 0.45, 50]);
      for (const [wx, wy, wr] of WINL) if (wr > 0 && wx > cam.x - wr && wx < cam.x + cam.vw + wr) ls.push([wx - cam.x, wy - cam.y, wr * wr, 0.55, 0.4, 0.14, 0]);
      const fl = 0.85 + 0.15 * Math.sin(simTime * 17) * Math.sin(simTime * 5.3);
      if (Math.abs(P9.DRUM_X - cam.x - cam.vw / 2) < cam.vw) ls.push([P9.DRUM_X - cam.x, GROUND - 22 - cam.y, 72 * 72, 1.6 * fl, 0.6 * fl, 0.25 * fl, 30]);
      ls.push([1823 - cam.x, 64 - cam.y, 40 * 40, 1.0, 0.75, 0.35, 0], [P9.MARKET.shutter[0] + 29 - cam.x, GROUND - 64 - cam.y, 34 * 34, p9.open ? 0.3 : 1.3, p9.open ? 1.1 : 0.2, 0.2, 0]);
      return [aR, aG, aB, ls];
    }
    const cut = enc.introT >= 0 ? 1 - 0.5 * clamp(enc.introT / 0.25, 0, 1) : 1;
    for (const lx of P9.HALL_LAMPS) ls.push([lx - cam.x, GROUND - 116 - cam.y, 90 * 90, 1.15 * cut, 1.05 * cut, 0.85 * cut, 40]);
    ls.push([2790 - cam.x, GROUND - 36 - cam.y, 60 * 60, 0.2, 0.45, 0.7, 0]);   // the freezer's cold glow
    if (p9.tuna.st === 'warn' && Math.floor(simTime * 8) % 2 === 0) ls.push([2452 - cam.x, GROUND - 177 - cam.y, 130 * 130, 1.6, 0.15, 0.15, 40]);
    if (enc.introT >= 0 && enc.boss) ls.push([enc.boss.x - cam.x, GROUND - 30 - cam.y, 50 * 50, 1.2, 1.2, 1.2, 0]);
    ls.push([P[2].x - cam.x, P[2].y - 12 - cam.y, 46 * 46, 0.4, 0.4, 0.45, 0]);
    return [0.44 * cut, 0.47 * cut, 0.6 * cut, ls];
  }
  function p9SkipToBoss() {   // test: the quay is cleared, the shutter open, he walks into the hall
    reset();
    for (const w of P9.WAVES) p9.w[w.id] = { out: true, n: 0 };
    p9.open = true; p9.shutter = 1;
    const dx = P9.MARKET.shutter[0] - 10 - ctl.x;
    ctl.x += dx; for (const p of P) { p.x += dx; p.px += dx; }
    for (const st of hair) for (const p of st) { p.x += dx; p.px += dx; }
    if (tails) for (const t of tails) for (const p of t) { p.x += dx; p.px += dx; }
    cam.xf = ctl.x - 80; cam.v.x = 0;
    autoWalk = true;
  }
  // the ending: he stands over the boss a moment, then the outro panels, then the card
  function p9EndTick(rdt) {
    endT += rdt;
    for (const k of ['jump', 'jumpHeld', 'attack', 'fireHeld', 'dash', 'dashHeld', 'downHeld']) input[k] = k === 'attack' ? null : false;
    input.dir = 0; input.run = false;
    if (endPh === 'p9wait' && endT > 2.4) p9Outro();
  }
  async function p9Outro() {
    if (endPh !== 'p9wait') return;
    endPh = 'p9scene'; toastEl.hidden = true; toastT = 0; toastQ.length = 0;
    await playScene('panels', 'docks_outro');
    endPh = 'done';
    emit('run:over', { result: 'cleared' });
    const t = Math.round(runS.t), mm = Math.floor(t / 60), ss = String(t % 60).padStart(2, '0');
    resultsEl.innerHTML = `<h2>Pier 9 cleared</h2><dl><dt>Difficulty</dt><dd>${DIF().name}</dd><dt>Time</dt><dd>${mm}:${ss}</dd><dt>Kills</dt><dd>${runS.kills}</dd>`
      + `<dt>Knock-outs</dt><dd>${kos}</dd></dl><small>Enter: back to the menu</small>`;
    resultsEl.hidden = false; toastEl.hidden = true;
  }
  // cutscenes: the comic-panel and dialog players over the stage; the game waits (frame() does nothing) while one plays
  let sceneOn = false;
  const csAudio = {
    music: { play: (id, o = {}) => gameAudio.playMusic(id, { loop: o.loop !== false }), stop: f => gameAudio.stopMusic(f) },
    voice: { play: id => gameAudio.voice(id), stop: () => gameAudio.stopVoice() },
    sfx: { play: (n, o) => gameAudio.sfx(n, o || {}) },
  };
  const scripts = {};
  const loadScript = id => scripts[id] || (scripts[id] = fetch(`assets/cutscenes/${id}.json`).then(r => { if (!r.ok) throw new Error(`${r.status} ${id}`); return r.json(); }));
  async function playScene(kind, id) {
    sceneOn = true; toastEl.hidden = true; sayEl.hidden = true;
    keys.left = keys.right = keys.shift = false; btn.p.down = btn.k.down = false; Object.assign(input, { dir: 0, run: false, jump: false, jumpHeld: false, downHeld: false, fireHeld: false, attack: null, dash: false, dashHeld: false });
    try { const sc = await loadScript(id); return await (kind === 'dialog' ? playDialog : playPanels)(sc, { root: stage, audio: csAudio, bus }); }
    catch (err) { console.warn('cutscene failed:', id, err); return { id, skipped: true }; }
    finally { sceneOn = false; last = FIXED ? fixedT : performance.now(); keys.left = keys.right = keys.shift = false; input.dir = 0; }
  }
  // Chapter: Prologue + Pier 9. The prologue's two scenes (Escape on the first skips both), the docks intro, then the level
  async function startChapter1() {
    if (sceneOn) return;
    leaveTitle(); setDemo(false); hideMenu();
    loadLevel('pier9'); reset();
    sceneOn = true;   // (the level waits behind the panels)
    const a = await playScene('panels', 'prologue_intro');
    if (!a.skipped) await playScene('panels', 'prologue_outro');
    await playScene('panels', 'docks_intro');
    gameAudio.playMusic('docks_explore', { volume: 0.6 });
    toast('Pier 9', 'Dawn. Sleet. Find the collector.');
  }
  function startTutorial() { if (isP9()) loadLevel('street'); if (flags.attract) endAttract(); else { hideMenu(); setDemo(false); reset(); startOpening(); } }
  function quitToTitle() { hideMenu(); if (isP9()) loadLevel('street'); reset(); startAttract(); }
  // ---- the menu: a console-style list down the left. It stays up on the title screen while the demo plays; in a game, Esc opens
  // it and pauses. Settings (view, run, camera) are remembered in this browser.
  let runAlways = false, menuShown = false, menuSel = 0, menuPauseTS = null;
  const menuEl = document.getElementById('menu'), menuList = document.getElementById('menu-list'), ccEl = document.getElementById('controls-card');
  const SETKEY = 'clubnoir.settings';
  function saveSettings() { try { localStorage.setItem(SETKEY, JSON.stringify({ view3d: mode3D, runAlways, zoom: zoomMode, diff: diffSel, vol: gameAudio.getVolume() })); } catch (err) {} }
  function loadSettings() {
    let st = null; try { st = JSON.parse(localStorage.getItem(SETKEY) || 'null'); } catch (err) {}
    if (!st) return;
    runAlways = !!st.runAlways;
    if (typeof st.vol === 'number') gameAudio.setVolume(st.vol);
    if (st.diff >= 0 && st.diff < DIFFS.length) diffSel = st.diff;
    if (st.zoom != null) setZoom(String(st.zoom));
    if (st.view3d && typeof THREE !== 'undefined') setMode3D(true);
  }
  const toggleFull = () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (err) {} };
  let menuPage = 'main';   // 'main' or 'chapter' (the chapter list)
  function menuItems() {
    if (menuPage === 'chapter') return [
      { label: 'Tutorial: The Street', act: () => { menuPage = 'main'; startTutorial(); } },
      { label: 'Prologue + Pier 9', act: () => { menuPage = 'main'; startChapter1(); } },
      { label: 'Back', act: () => { menuPage = 'main'; menuSel = 0; } },
    ];
    const items = [
      { label: flags.attract ? 'Start game' : 'Resume', act: () => flags.attract ? endAttract() : hideMenu() },
      { label: 'Chapter', value: () => isP9() && !flags.attract ? 'Pier 9' : 'Choose', act: () => { menuPage = 'chapter'; menuSel = isP9() ? 1 : 0; } },
      { label: 'Difficulty', value: () => DIFFS[diffSel].name, change: d => { diffSel = (diffSel + d + DIFFS.length) % DIFFS.length; charge.forEach((c, w) => { charge[w] = Math.min(c, fullCharge(w)); }); saveSettings(); } },
      { label: 'View', value: () => mode3D ? '3D' : '2D', change: () => { setMode3D(!mode3D); saveSettings(); } },
      { label: 'Shift', value: () => runAlways ? 'to walk' : 'to run', change: () => { runAlways = !runAlways; saveSettings(); } },
      { label: 'Camera', value: () => zoomMode === 'auto' ? 'Auto' : `${Math.round(zoomMode * 100)}%`, change: d => cycleZoom(d) },
      { label: 'Volume', value: () => `${Math.round(gameAudio.getVolume() * 100)}%`, change: d => {   // master volume in 10 % steps (a click past 100 % goes to 0 %)
        const v = Math.round(gameAudio.getVolume() * 10) + (d < 0 ? -1 : 1);
        gameAudio.setVolume((v > 10 ? 0 : v < 0 ? 10 : v) / 10); gameAudio.sfx('ui_blip', { vol: 0.6 }); saveSettings(); } },
      { label: 'Full screen', value: () => document.fullscreenElement ? 'On' : 'Off', change: toggleFull },
      { label: 'Controls', act: () => { document.getElementById('cc-run').textContent = runAlways ? 'walk (you run by default)' : 'run'; ccEl.hidden = false; } },
    ];
    if (!flags.attract) items.push({ label: 'Restart', act: () => { hideMenu(); reset(); } }, { label: 'Quit to title', act: () => { hideMenu(); reset(); startAttract(); } });
    return items;
  }
  function drawMenu() {
    const items = menuItems(); menuSel = clamp(menuSel, 0, items.length - 1);
    menuList.innerHTML = '';
    items.forEach((it, i) => {
      const li = document.createElement('li'), b = document.createElement('button');
      b.className = i === menuSel ? 'sel' : ''; b.type = 'button';
      b.innerHTML = `<span>${it.label}</span>${it.value ? `<span class="v">${it.value()}</span>` : ''}`;
      b.addEventListener('mouseenter', () => { if (menuSel !== i) { menuSel = i; drawMenu(); } });
      b.addEventListener('click', e => { e.preventDefault(); menuSel = i; menuDo(0); b.blur(); });
      li.appendChild(b); menuList.appendChild(li);
    });
  }
  function menuDo(dir) {   // dir 0: select; -1 / 1: change a setting
    const it = menuItems()[menuSel]; if (!it) return;
    if (!dir && it.act) gameAudio.sfx('ui_confirm', { vol: 0.5 });
    if (it.change) it.change(dir || 1); else if (!dir && it.act) it.act();
    else if (dir && it.act && menuPage === 'main' && it.label === 'Chapter') it.act();
    if (menuShown) drawMenu();
  }
  function showMenu(title) {
    menuShown = true; menuEl.hidden = false; menuSel = 0; ccEl.hidden = true; menuPage = 'main';
    if (!title && !flags.attract && menuPauseTS === null) { menuPauseTS = timeScale; timeScale = 0; }   // a game pauses under the menu
    drawMenu();
  }
  function hideMenu() {
    menuShown = false; menuEl.hidden = true; ccEl.hidden = true;
    if (menuPauseTS !== null) { timeScale = menuPauseTS; menuPauseTS = null; }
  }
  function menuKey(e) {   // true: the key was the menu's
    const c = e.code;
    if (!menuShown) {
      if (c === 'Escape' && !e.repeat && !flags.attract && openT < 0 && !(endPh && endPh !== 'done')) { showMenu(false); return true; }
      return false;
    }
    if (!ccEl.hidden) { if (c === 'Escape' || c === 'Enter' || c === 'Space') ccEl.hidden = true; return true; }
    const n = menuItems().length;
    if (c === 'ArrowUp') { menuSel = (menuSel - 1 + n) % n; drawMenu(); gameAudio.sfx('ui_blip', { vol: 0.35 }); }
    else if (c === 'ArrowDown') { menuSel = (menuSel + 1) % n; drawMenu(); gameAudio.sfx('ui_blip', { vol: 0.35 }); }
    else if (c === 'ArrowLeft') menuDo(-1);
    else if (c === 'ArrowRight') menuDo(1);
    else if ((c === 'Enter' || c === 'Space') && !e.repeat) menuDo(0);
    else if (c === 'Escape' && menuPage !== 'main' && !e.repeat) { menuPage = 'main'; menuSel = 1; drawMenu(); }
    else if (c === 'Escape' && !flags.attract && !e.repeat) hideMenu();
    return true;
  }
  // attract mode: the page opens on the demo playing from the street start under a title card and the menu; Start game begins at lesson 1
  const titleEl = document.getElementById('title');
  let titleFadeT = null;
  function startAttract() {
    if (isP9()) { loadLevel('street'); reset(); }
    flags.attract = true; gameAudio.playMusic('title'); showMenu(true); titleEl.hidden = false; titleEl.classList.remove('faded'); document.body?.classList.add('attract'); setDemo(true);
    clearTimeout(titleFadeT); titleFadeT = setTimeout(() => { if (flags.attract) titleEl.classList.add('faded'); }, 2500);   // the card fades out after 2.5 s; the demo plays on
  }
  function endAttract() { hideMenu(); flags.attract = false; clearTimeout(titleFadeT); titleEl.classList.remove('faded'); titleEl.hidden = true; document.body?.classList.remove('attract'); setDemo(false); reset(); startOpening(); }
  demoBtn.addEventListener('click', toggleDemo);
  document.getElementById('b-boss').addEventListener('click', () => { takeOver(); skipToBoss(); });
  // the scenes: play the opening again, or jump to the ending (the boss drops as the fight starts; ?ending in the address)
  function leaveTitle() { hideMenu(); flags.attract = false; clearTimeout(titleFadeT); titleEl.classList.remove('faded'); titleEl.hidden = true; document.body?.classList.remove('attract'); }
  function playEnding() { leaveTitle(); setDemo(false); skipToBoss(); autoWalk = true; jumpEnd = true; }
  function playOpening() { leaveTitle(); setDemo(false); reset(); startOpening(); }
  slowBtn.addEventListener('click', toggleSlow);
  skelBtn.addEventListener('click', toggleSkel);
  lofiBtn.addEventListener('click', toggleLofi);

  // ---------- loop ----------
  const LABELS = { squat: 'Squatting', idle: 'Idle', walk: 'Walking', run: 'Running', jump: 'Jumping', fight: 'Fighting', air: 'Airborne', rag: 'Ragdoll', ko: 'Knocked out', getup: 'Getting up' };
  const statusEl = document.getElementById('status'), speedEl = document.getElementById('r-speed'), hitsEl = document.getElementById('r-hits'), bagEl = document.getElementById('r-bag'), zoomEl = document.getElementById('r-zoom');
  let acc = 0, last = FIXED ? 0 : performance.now(), shown = {}, fixedT = 0;
  // pixel icons for the HUD weapon badge, painted once on a 16x16 canvas each
  const WICON = (() => {
    const out = [];
    const paint = fn => { try { const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'); fn((px, py, col) => { x.fillStyle = col; x.fillRect(px, py, 1, 1); }); return c.toDataURL(); } catch (e) { return ''; } };
    const K = '#120c18', ST = '#e4ebf2', SD = '#8f9bb0', WD = '#8a5a34', WL = '#b07a48', GD = '#e8b43a', SK = '#f2b48a', SKD = '#c98463', GM = '#4a4f5e', GL = '#7a8090';
    out[0] = paint(p => {   // a fist
      const m = ['....kkkkkk....', '...kaakaakak...', '..kaakaakaakk..', '..kaaaaaaaaak..', '..kaaaaaaaabk..', '..kbaaaaaabk...', '...kbaaaabbk...', '....kbbbbbk....', '....kbbbbk.....', '.....kkkk......'];
      m.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') p(x + 1, y + 3, ch === 'k' ? K : ch === 'a' ? SK : SKD); }));
    });
    out[1] = paint(p => {   // katana
      for (let t = 0; t < 11; t++) { p(4 + t, 11 - t, ST); p(4 + t, 12 - t, SD); p(3 + t, 11 - t, K); }
      p(3, 12, GD); p(4, 13, GD); p(2, 11, GD); p(5, 12, GD); p(2, 13, WD); p(1, 14, WD); p(3, 14, K); p(0, 15, K);
    });
    out[2] = paint(p => {   // axe
      for (let t = 0; t < 11; t++) { p(3 + t, 14 - t, t % 2 ? WD : WL); p(2 + t, 14 - t, K); }
      for (let y = 1; y < 8; y++) for (let x = 9; x < 15; x++) { const e = x - 9 + Math.abs(y - 4) * 0.6; if (e < 5.5) p(x, y, x >= 13 || e > 4.5 ? SD : ST); }
    });
    out[3] = paint(p => {   // shotgun
      for (let x = 3; x < 16; x++) { p(x, 5, K); p(x, 6, GL); p(x, 7, GM); }
      for (let x = 8; x < 12; x++) p(x, 8, WL);
      for (let y = 7; y < 12; y++) for (let x = 0; x < 6 - (y - 7) * 0.4; x++) p(x + (y - 7) * 0.3 | 0, y, x === 0 ? K : WD);
    });
    out[4] = paint(p => {   // machine gun
      for (let x = 0; x < 16; x++) p(x, 6, x > 9 ? GL : GM);
      for (let y = 4; y < 9; y++) for (let x = 4; x < 11; x++) p(x, y, y === 4 ? K : GM);
      for (let y = 9; y < 14; y++) { p(7, y, K); p(8, y, GD); }
      for (let y = 6; y < 10; y++) for (let x = 0; x < 4; x++) p(x, y, WD);
    });
    out[5] = paint(p => {   // a thrown crate or bin
      for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) p(x, y, x === 3 || x === 12 || y === 3 || y === 12 ? K : x - 3 === y - 3 || x - 3 === 12 - y ? WD : WL);
    });
    return out;
  })();
  const wIconEl = document.getElementById('w-icon'), pocketEl = document.getElementById('pocket');
  const PICON = (() => {   // 12 px pixel icons for the throwables in the pocket
    const paint = rows => { try { const c = document.createElement('canvas'); c.width = c.height = 12; const x = c.getContext('2d');
      const col = { k: '#120c18', r: '#c8323a', s: '#e4ebf2', g: '#2f7a4a', l: '#8ad0a0', w: '#e8dcc0', y: '#c9a24a', b: '#5a3a24', m: '#8f9bb0' };
      rows.forEach((r, y) => [...r].forEach((ch, i) => { if (ch !== '.') { x.fillStyle = col[ch]; x.fillRect(i, y, 1, 1); } })); return c.toDataURL(); } catch (e) { return ''; } };
    return {
      can: paint(['............', '....kkkk....', '...kmmmmk...', '...kssssk...', '...krrrrk...', '...krsrrk...', '...krrrrk...', '...krrrrk...', '...kssssk...', '...kmmmmk...', '....kkkk....', '............']),
      bottle: paint(['.....kk.....', '.....yy.....', '....kggk....', '....kglk....', '...kgglgk...', '...kgglgk...', '...kwwwwk...', '...kwwwwk...', '...kgglgk...', '...kgggk....', '....kkkk....', '............']),
      knife: paint(['..........k.', '.........ksk', '........ksmk', '.......ksmk.', '......ksmk..', '.....ksmk...', '....kssk....', '...kbkk.....', '..kbbk......', '.kbbk.......', '.kkk........', '............']),
    };
  })();
  const wNameEl = document.getElementById('w-name'), bossNameEl = document.getElementById('boss-name'), feedEl = document.getElementById('feed');
  const regenEl = document.getElementById('regen');
  const ammoEl = document.getElementById('ammo'), hpFill = document.getElementById('hp-fill'), bossBar = document.getElementById('bossbar'), bossFill = document.getElementById('boss-fill');
  function show(key, el, v) { if (shown[key] !== v) { shown[key] = v; el.textContent = v; } }
  function frame(now) {
    if (FIXED) now = (fixedT += 1000 / 60);   // (test harness: the same clock every run)
    if (sceneOn) { last = now; if (!AUTOTEST && !MANUAL) requestAnimationFrame(frame); return; }   // a cutscene plays over the stage: the game waits
    const rdt = clamp((now - last) / 1000, 0, 0.05); last = now;   // (never negative: a clock that steps back would poison the easing)
    const sdt = rdt * timeScale; simTime += sdt;
    if (!flags.demo) { input.dir = (keys.right || touch.right ? 1 : 0) - (keys.left || touch.left ? 1 : 0); input.run = (runAlways ? !keys.shift : keys.shift) || runToggle; }   // (the menu can make running the default: Shift walks)
    if (autoWalk) { if (flags.club || input.dir) autoWalk = false; else input.dir = 1; }   // skip-to-boss: walk the carpet in
    demoTick(sdt);
    if (openT >= 0) openTick(rdt);
    if (endPh && endPh !== 'done') endTick(rdt);
    if (jumpEnd && enc.boss && !enc.boss.dead && enc.introT < 0 && enc.boss.hp > 0) { enc.boss.hp = 1; enc.eHitKind = 1; damageEnemy(enc.boss, 60, 1, 300, 0.5, enc.boss.x, enc.boss.y - 20, false); enc.eHitKind = 0; }   // ?ending: the boss drops as the fight starts
    if (enc.introT >= 0 || hookPull) { input.dir = 0; input.run = false; input.jump = false; input.jumpHeld = false; input.attack = null; input.fireHeld = false; input.dash = false; input.dashHeld = false; input.downHeld = false; }   // the boss entrance: no input
    for (let i = spawnFx.length - 1; i >= 0; i--) if ((spawnFx[i].t += sdt) > 0.45) spawnFx.splice(i, 1);
    if (grabIdx >= 0 && now - lastMove > 40) { pv.x *= 0.7; pv.y *= 0.7; }
    if (hitStop > 0) hitStop -= rdt; else acc += sdt;
    if (bagFlash > 0) bagFlash -= rdt;
    let n = 0; while (acc >= DT && n < 24) { step(DT); acc -= DT; n++; }
    if (n === 24) acc = 0;
    const h = P[0];
    headSpeed = headSpeed * 0.8 + Math.hypot(h.x - h.px, h.y - h.py) / DT * 0.2;
    for (let i = particles.length - 1; i >= 0; i--) {
      const q = particles[i]; q.life -= sdt;
      if (q.life <= 0 && !q.blood) { particles.splice(i, 1); continue; }
      if (q.life < -3) { particles.splice(i, 1); continue; }
      const fs = floorBelow(q.x, q.y, 0), fy = fs.y;
      q.vy += G * sdt; q.x += q.vx * sdt; q.y += q.vy * sdt;
      if (q.blood) {
        const px = Math.floor(q.x), py = Math.floor(q.y);
        if (px >= 0 && py >= 0 && px < W && py < GROUND && PROPS[py * W + px]) {   // splashes onto a car, a lamp post, the scaffold
          stain(px, py); if (simRand() < 0.4) stain(px, py + 1); particles.splice(i, 1); continue;
        }
      }
      if (q.y >= fy) {
        if (q.blood) {
          if (!fs.box) { stain(q.x, fy); const nx = q.x + (simRand() < 0.5 ? -1 : 1); if (simRand() < 0.5 && nx >= fs.x0 && nx <= fs.x1) stain(nx, fy); }   // a loose crate's top moves away: no stain left in the air
          particles.splice(i, 1); continue;
        }
        q.y = fy - 1; q.vx *= 0.5; q.vy = 0;
      }
    }
    for (let i = waves.length - 1; i >= 0; i--) { waves[i].t += sdt; if (waves[i].t > 0.25) waves.splice(i, 1); }
    for (let i = sparks.length - 1; i >= 0; i--) { sparks[i].t += sdt; if (sparks[i].t > 0.22) sparks.splice(i, 1); }
    for (let i = flashes.length - 1; i >= 0; i--) { flashes[i].t += sdt; if (flashes[i].t > 0.05) flashes.splice(i, 1); }

    clubTick(rdt);
    updateCamera(rdt);
    tutTick(rdt);
    // present: the drawn pose (shared by both views), then one view draws it
    const [look, face] = poseTick(hero.mode === 'anim' ? 'ok' : hero.ko ? 'ko' : headSpeed > 120 ? 'shock' : 'ok', hero.mode === 'rag' ? ragFace : ctl.face);
    if (mode3D) Three3D.frame(rdt); else render(look, face);

    {   // [feel] screen shake: a random jitter plus a directional kick that springs back, both in whole world pixels
      if (cam.shake > shakePrev + 1e-4 && !shakeSet) {   // set without an amplitude: take one from its length
        const a = cam.shake >= 0.25 ? 3 : cam.shake >= 0.15 ? 2 : 1, cur = shakeDur > 0 ? shakeAmp * shakePrev / shakeDur : 0;
        if (a >= cur) { shakeAmp = a; shakeDur = cam.shake; }
      }
      shakeSet = false;
      if (cam.shake > 0) cam.shake -= rdt;
      shakePrev = cam.shake;
      // the jitter decays with the time left and leans along the last camera kick
      const kx = Math.round(cam.kick.x), ky = Math.round(cam.kick.y), j = cam.shake > 0 && shakeDur > 0 ? shakeAmp * Math.min(1, cam.shake / shakeDur) : 0;
      if (cam.shake <= 0) shakeAmp = shakeDur = 0;
      cam.kick.x *= Math.exp(-18 * rdt); cam.kick.y *= Math.exp(-18 * rdt);
      const r0 = simRand() * 2 - 1, kd = Math.hypot(kickDir.x, kickDir.y) || 1, bx = kickDir.x / kd, by = kickDir.y / kd;
      const jx = j * (0.5 * (simRand() * 2 - 1) + 0.6 * r0 * bx), jy = j * (0.5 * (simRand() * 2 - 1) + 0.6 * r0 * by);
      const sx = (Math.round(jx) + kx) * scale, sy = (Math.round(jy) + ky) * scale;
      const tr = sx || sy ? `translate(${sx}px, ${sy}px)` : '';
      if (cv.style.transform !== tr) { cv.style.transform = tr; threeCanvas.style.transform = tr; }
    }

    const airborne = P.every(p => p.y < p.fl - 1.5);
    const state = hero.mode === 'rag' ? (hero.ko ? 'ko' : airborne ? 'air' : 'rag')
      : hero.mode === 'getup' || hero.act === 'rise' ? 'getup'
      : ctl.air || hero.act === 'crouch' || hero.act === 'land' ? 'jump'
      : hero.act === 'squat' ? 'squat'
      : MOVES[hero.act] || hero.act === 'guard' ? 'fight'
      : ctl.spd > WALK + 8 ? 'run' : ctl.spd > 2 ? 'walk' : 'idle';
    if (shown.state !== state) { shown.state = state; statusEl.dataset.state = state; statusEl.textContent = LABELS[state]; }
    show('speed', speedEl, ((hero.mode === 'anim' ? ctl.spd : headSpeed) / PX_PER_M).toFixed(1));
    show('hits', hitsEl, hits);
    show('bag', bagEl, landed);
    show('zoom', zoomEl, Math.round(cam.zoom * 100));
    if (ammoFlash > 0) ammoFlash -= rdt;
    { const Wp = WEAPONS[hero.weapon], full = fullCharge(hero.weapon), c = charge[hero.weapon];
      show('wname', wNameEl, Wp.name.toUpperCase());
      { const key = pocket.join(','); if (shown.pocket !== key) { shown.pocket = key; pocketEl.innerHTML = pocket.map(k => `<img src="${PICON[k]}" alt="${k}" title="${k}: hold Q to throw">`).join(''); } }   // the throwables, as icons
      if (shown.wicon !== hero.weapon) { shown.wicon = hero.weapon; if (WICON[hero.weapon]) wIconEl.src = WICON[hero.weapon]; }
      show('ammo', ammoEl, !full ? '' : Wp.ammo ? `${c} / ${full}` : `${'▮'.repeat(Math.min(6, Math.ceil(c / full * 6)))}${'▯'.repeat(Math.max(0, 6 - Math.ceil(c / full * 6)))}`);
      ammoEl.className = 'ammo' + (ammoFlash > 0 ? ' gain' : full && c / full < 0.25 ? ' low' : ''); }
    { const on = hero.bandT > 0; if (regenEl.hidden === on) regenEl.hidden = !on; if (on) regenEl.style.setProperty('--p', (hero.bandT / BAND_T).toFixed(3)); }   // the bandage ring
    hpFill.style.width = hero.hp.toFixed(0) + '%'; hpFill.style.background = hero.hp < 30 ? 'var(--ko)' : hero.hp < 60 ? 'var(--accent)' : 'var(--ok)';
    // kill feed: the last 5 kills from the last 30 s; older lines fade out
    while (kills.length && (simTime - kills[0].t > 30 || kills.length > 8)) { kills.shift(); feedDirty = true; }
    if (feedDirty || Math.floor(simTime * 4) !== shown.feedT) {
      shown.feedT = Math.floor(simTime * 4); feedDirty = false;
      const last = kills.slice(-5);
      feedEl.innerHTML = last.map((k, i) => { const age = simTime - k.t, op = Math.min(1, (30 - age) / 6) * (i < last.length - 4 ? 0.55 : 1); return `<div class="kf" style="opacity:${Math.max(0, op).toFixed(2)}">${WICON[k.w] ? `<img src="${WICON[k.w]}" alt="">` : ''}<span><b>✕</b> ${k.name}</span></div>`; }).join('');
    }
    bossBar.hidden = !(enc.boss && !enc.boss.dead);
    { const top = bossBar.hidden ? '8px' : '42px'; if (shown.tutTop !== top) { shown.tutTop = top; tutEl.style.top = top; } }   // the mission panel steps down under the boss bar
    { const hide = isP9() ? !!endPh : done.has('enter'); if (shown.tutHide !== hide) { shown.tutHide = hide; tutEl.hidden = hide; } }   // inside the club the lesson panel goes: the boss bar and the card carry the fight
    if (enc.boss) { bossFill.style.width = (Math.max(0, enc.boss.hp / enc.boss.maxHp * 100) * bossBarK).toFixed(1) + '%'; show('bname', bossNameEl, enc.boss.name.toUpperCase()); }
    const tgt = null;
    if (tgt && false) { show('tname', tNameEl, tgt.dead ? tgt.name + ' — down' : tgt.name); tFill.style.width = Math.max(0, tgt.hp / tgt.maxHp * 100).toFixed(0) + '%'; }
    if (!AUTOTEST && !MANUAL) requestAnimationFrame(frame);
  }
  // the autotest: run the frames in chunks (the page stays responsive), then hash what the simulation and the 2D view hold
  function runAutotest(kind, frames) {
    const fnv = () => { let h = 0x811c9dc5; return { add(v) { h = Math.imul(h ^ (v | 0), 0x01000193) >>> 0; }, get hex() { return h.toString(16).padStart(8, '0'); } }; };
    const q = v => Math.round(v * 1000);   // (positions to 1/1000 px)
    let n = 0;
    const chunk = () => {
      for (let k = 0; k < 200 && n < frames; k++, n++) frame(0);
      document.title = `AUTOTEST ${kind} ${n}/${frames}`;
      if (n < frames) { setTimeout(chunk, 0); return; }
      const st = fnv(), bf = fnv();
      st.add(q(ctl.x)); st.add(q(ctl.y)); st.add(q(hero.hp)); for (const p of P) { st.add(q(p.x)); st.add(q(p.y)); }
      for (const e of enemies) { st.add(q(e.x)); st.add(q(e.y)); st.add(q(e.hp)); st.add(e.dead ? 1 : 0); }
      for (const o of objs) { st.add(q(o.x)); st.add(q(o.y)); }
      st.add(kills.length); st.add(q(simTime));
      let g = 0; for (let i = 0; i < GORE.length; i += 7) g = (g + (GORE[i] & 0xffffff)) >>> 0; st.add(g);
      for (let i = 0; i < buf.length; i++) bf.add(buf[i]);
      let l3 = '';   // ?view3d: the run plays in the 3D view; hash the 2D art the 3D layers hold (CPU side, so it does not depend on the GPU)
      if (mode3D) { const h = fnv(); for (const k of ['lWall', 'lSign', 'lBlade', 'lRail', 'lClub', 'lFloor', 'lMid', 'lFront', 'lFx']) { const d = Three3D[k].data; for (let i = 0; i < d.length; i++) h.add(d[i]); } l3 = h.hex; }
      window.__autotest = { kind, frames, seed: SEED, state: st.hex, buf: bf.hex, l3, hero: Math.round(ctl.x), enemies: enemies.length, kills: kills.length };
      document.title = `AUTOTEST ${kind} f=${frames} seed=${SEED} state=${st.hex} buf=${bf.hex}` + (l3 ? ` l3=${l3}` : '');
      console.log('[autotest]', JSON.stringify(window.__autotest));
    };
    setTimeout(chunk, 0);
  }
  if (AUTOTEST) {   // (no saved settings: the run must not depend on this browser's choices)
    if (AUTOTEST === 'boss') { setDemo(true); skipToBoss(); } else startAttract();
    if (QS.has('view3d')) setMode3D(true);
    runAutotest(AUTOTEST, +QS.get('frames') || 1800);
    return;
  }
  loadSettings();   // the view, run and camera choices from last time
  if (DEV) { setDemo(true); skipToBoss(); }   // ?dev: open on the boss level, to test it
  else if (jumpEnd) playEnding();
  else startAttract();   // the page opens on the demo from the street start, under the title card and the menu
  if (MANUAL) {
    window.__step = (n = 1) => { for (let i = 0; i < n; i++) frame(0); };
    window.__peek = () => ({ x: Math.round(ctl.x), y: Math.round(ctl.y), lane: ctl.lane, surf: ctl.surf === GROUND_S ? 'ground' : ctl.surf === GOAL ? 'roof' : 'plat', air: ctl.air, mode: hero.mode, act: hero.act, hp: Math.round(hero.hp), bandT: +hero.bandT.toFixed(2), weapon: hero.weapon,
      club: flags.club, boss: enc.boss ? Math.round(enc.boss.hp) : null, quakes: quakes.length, enemies: enemies.filter(e => !e.dead).map(e => [Math.round(e.x), e.lane, Math.round(e.hp)]), kills: kills.length, lessons: done.size,
      pickups: pickups.map(k => k.taken ? 1 : 0).join(''), demo: flags.demo, attract: flags.attract });
    window.__skipToBoss = () => { leaveTitle(); setDemo(false); skipToBoss(); };
    // Pier 9 (tests): start the chapter (with its cutscenes) or the level at once; read its state; skip to the hall
    window.__pier9 = { chapter: () => startChapter1(), start: () => { leaveTitle(); setDemo(false); hideMenu(); loadLevel('pier9'); reset(); }, toBoss: () => { leaveTitle(); setDemo(false); hideMenu(); loadLevel('pier9'); p9SkipToBoss(); },
      peek: () => ({ level: LV.id, scene: sceneOn, x: Math.round(ctl.x), y: Math.round(ctl.y), mode: hero.mode, hp: Math.round(hero.hp), club: flags.club, open: p9.open, shutter: +p9.shutter.toFixed(2), waves: Object.fromEntries(Object.entries(p9.w).map(([k, v]) => [k, [v.out, zoneAlive[k] || 0]])), queue: p9.queue.length,
        boss: enc.boss ? { hp: Math.round(enc.boss.hp), max: enc.boss.maxHp, ph: enc.boss.ph, sp: enc.boss.sp, act: enc.boss.act, x: Math.round(enc.boss.x), dead: enc.boss.dead, intro: !!enc.boss.intro } : null, tuna: p9.tuna.st, hookPull, endPh, kills: runS.kills, kos, wasted: flags.wasted,
        enemies: enemies.filter(e => !e.dead).map(e => [e.role, Math.round(e.x), Math.round(e.y), Math.round(e.hp), e.zone, e.down ? 'down' : '']) }),
      tp: x => { const dx = x - ctl.x; ctl.x += dx; for (const p of P) { p.x += dx; p.px += dx; } for (const st of hair) for (const p of st) { p.x += dx; p.px += dx; } if (tails) for (const t of tails) for (const p of t) { p.x += dx; p.px += dx; } cam.xf += dx; },
      street: () => { leaveTitle(); setDemo(false); hideMenu(); loadLevel('street'); reset(); },   // back to the tutorial street
      t3mem: () => Three3D.renderer ? { ...Three3D.renderer.info.memory, programs: Three3D.renderer.info.programs.length } : null,   // the 3D view's GPU objects (a level switch must not leak them)
      hurtBoss: n => { if (enc.boss) { enc.boss.hp = Math.max(1, enc.boss.hp - n); } }, hurtHero: n => { hero.hp = Math.max(1, hero.hp - n); }, setDiff: i => { diffSel = i; }, kill: () => { for (const e of enemies) if (!e.dead && e !== enc.boss) killEnemy(e, 1, 200, 0.3); } };
  } else requestAnimationFrame(frame);
})();
