// hero move tables: attack key frames, transitions, dodge, hit-stop (pure: no world, no state)
import { smooth, lerpA } from '../../core/math.js';
import { mod, IDLE, GUARD, AIR, FLY_OUT, SQUAT, K } from './poses.js';

export const CLIMB = { reach: 54, edge: 7, hang: 0.12, up: 0.36, over: 0.3 };   // reach: hands above the feet at full stretch; edge: how far off the edge a grab still holds; the three phases (s): catch and hang, pull up, knee over and stand

// kick frames use placeholders: kx/ky = kicking foot, kxh = offset from its guard spot, kxp = offset from the hips, rs = hips over the support foot
export function kickKeys(frames, L) {
  const S = 1 - L, home = GUARD[4 + L * 2], rs = GUARD[4 + S * 2] * 0.4;
  return frames.map(([t, o, ez]) => {
    const r = {};
    for (const k in o) {
      if (k === 'kx') r[`f${L}x`] = o.kx;
      else if (k === 'kxh') r[`f${L}x`] = home + o.kxh;
      else if (k === 'ky') r[`f${L}y`] = o.ky;
      else if (k === 'rs') r.rx = rs + o.rs;
      else if (k !== 'kxp') r[k] = o[k];
    }
    if ('kxp' in o) r[`f${L}x`] = (r.rx ?? GUARD[0]) + o.kxp;
    return K(t, r, GUARD, ez);
  });
}
export const LK_OUT = { rs: 0, lean: -0.55, head: 0.25, kx: 11, ky: 26, a0s: -0.9, a0e: 0.4, a1s: 1.1, a1e: 2.1 };   // a snapping high kick: the foot at head height
export const LIGHT_KICK = [[0, {}],
  [0.06, { rs: 0, lean: -0.2, kxh: 4, ky: 14 }],                 // knee comes up and turns over
  [0.12, LK_OUT, 'in'], [0.2, { ...LK_OUT, kx: 10.6 }],                 // snap and hold
  [0.27, { rs: 0, lean: -0.2, kxh: 4, ky: 12 }, 'out'], [0.34, {}]];    // rechamber, back to guard
// the target sits past the leg's reach at hip height, so the leg locks fully straight, level to the front
export const HK_OUT = { rs: -1, lean: -0.9, head: 0.4, ry: 16.6, kxp: 16, ky: 30, a0s: -1.3, a0e: 0.2, a1s: 1.0, a1e: 2.2 };   // the heel drives out at head height
export const HEAVY_KICK = [[0, {}],
  [0.12, { rs: 0, ry: 15, lean: -0.1, a0s: -0.3, a0e: 0.8 }],     // load onto the support leg
  [0.22, { rs: 0, lean: -0.5, ry: 15.8, kxp: 4, ky: 20, a0s: -0.6, a0e: 0.5, a1s: 1.2, a1e: 2.1 }],   // knee to the chest
  [0.28, HK_OUT, 'in'], [0.44, { ...HK_OUT, kxp: 15.5 }],              // heel drives out to full extension and holds
  [0.62, { rs: 0, lean: -0.3, kxp: 5, ky: 9, a0s: -0.4, a0e: 0.6 }, 'out'], [0.88, {}]];   // heavy, slow recovery
export const HP_OUT = { rx: 3.5, lean: 0.5, ry: 15.4, head: -0.25, f0x: -4, f0y: 1.5, a0s: 1.7, a0e: 0, a1s: 0.5, a1e: 2.4 };
// up = how much a hit lifts a loose object
export const MOVES = {
  // light punches: quick, each press uses the other hand
  lp1: { dur: 0.22, win: [0.09, 0.14], limb: 6, power: 90, up: 0.25, keys: [
    K(0, {}), K(0.05, { a1s: 0.9, a1e: 2.2, lean: 0.06 }),
    K(0.09, { a1s: 1.6, a1e: 0.05, lean: 0.2, rx: 1.2, head: -0.1 }, GUARD, 'in'),
    K(0.13, { a1s: 1.58, a1e: 0.1, lean: 0.18, rx: 1.2, head: -0.1 }), K(0.22, {}, GUARD, 'out')] },
  lp0: { dur: 0.24, win: [0.1, 0.15], limb: 4, power: 100, up: 0.25, keys: [
    K(0, {}), K(0.05, { a0s: 0.5, a0e: 2.3 }),
    K(0.1, { a0s: 1.62, a0e: 0.05, lean: 0.3, rx: 1.8, head: -0.12, f0y: 0.8, a1s: 0.75, a1e: 2.4 }, GUARD, 'in'),
    K(0.14, { a0s: 1.6, a0e: 0.1, lean: 0.28, rx: 1.8, head: -0.12, f0y: 0.8, a1s: 0.75, a1e: 2.4 }), K(0.24, {}, GUARD, 'out')] },
  // heavy punch: coil back, then the whole body lunges behind the rear fist; long recovery
  hp: { dur: 0.8, win: [0.22, 0.34], limb: 4, power: 280, up: 0.3, keys: [
    K(0, {}), K(0.14, { rx: -1.5, lean: -0.1, ry: 15, head: 0.05, a0s: 0.1, a0e: 2.5, a1s: 1.3, a1e: 1.6 }),
    K(0.22, HP_OUT, GUARD, 'in'), K(0.34, { ...HP_OUT, rx: 3.8, lean: 0.55 }),
    K(0.55, { rx: 2.5, lean: 0.35, ry: 15.2, f0x: -4.5, a0s: 1.3, a0e: 0.6, a1s: 0.7, a1e: 2.2 }, GUARD, 'out'), K(0.8, {})] },
  lk0: { dur: 0.34, win: [0.12, 0.22], limb: 8, power: 110, up: 0.7, keys: kickKeys(LIGHT_KICK, 0) },
  lk1: { dur: 0.34, win: [0.12, 0.22], limb: 10, power: 110, up: 0.7, keys: kickKeys(LIGHT_KICK, 1) },
  hk0: { dur: 0.88, win: [0.28, 0.44], limb: 8, power: 260, up: 0.3, keys: kickKeys(HEAVY_KICK, 0) },
  hk1: { dur: 0.88, win: [0.28, 0.44], limb: 10, power: 260, up: 0.3, keys: kickKeys(HEAVY_KICK, 1) },
  // flying side kick, only while airborne
  airkick: { dur: 0.45, win: [0.12, 0.36], limb: 10, power: 210, up: 0.15, keys: [
    K(0, {}, AIR), K(0.07, { lean: -0.2, f1x: 4, f1y: 10, f0x: -4, f0y: 7, a0s: -0.4 }, AIR),
    K(0.13, FLY_OUT, AIR, 'in'), K(0.35, { ...FLY_OUT, f1x: 13.5 }, AIR), K(0.45, {}, AIR)] },
};
// weapon moves: blade = hit with the held weapon instead of a fist or foot
Object.assign(MOVES, {
  // katana: quick slashes alternate down and up; the heavy is a two-hand overhead cut with a lunge
  // katana: quick horizontal cuts, forehand then backhand. Seen from the side, the blade swings through depth:
  // it starts behind the body, shortens as it passes the flank, and lengthens as it sweeps out in front.
  ks0: { dur: 0.26, win: [0.11, 0.19], blade: true, power: 150, up: 0.3, keys: [
    K(0, {}), K(0.06, { a1s: 0.9, a1e: 1.9, wr: 1.1, yw: 3.0, lean: -0.08, rx: -0.5, a0s: 0.3, a0e: 1.0 }),
    K(0.12, { a1s: 1.45, a1e: 0.15, wr: 1.1, yw: 0, lean: 0.25, rx: 1.8, head: -0.1, a0s: -0.5, a0e: 0.6 }, GUARD, 'in'),
    K(0.18, { a1s: 1.3, a1e: 0.3, wr: 1.1, yw: -1.0, lean: 0.22, rx: 1.8, a0s: -0.5, a0e: 0.6 }, GUARD, 'out'), K(0.26, {})] },
  ks1: { dur: 0.26, win: [0.11, 0.19], blade: true, power: 150, up: 0.3, keys: [
    K(0, {}), K(0.06, { a1s: 1.1, a1e: 1.5, wr: 1.2, yw: -2.6, lean: -0.05, ry: 15.2, a0s: -0.3, a0e: 0.6 }),
    K(0.12, { a1s: 1.4, a1e: 0.15, wr: 1.2, yw: 0, lean: 0.22, rx: 1.8, ry: 15.2, head: -0.1, a0s: 0.4, a0e: 1.1 }, GUARD, 'in'),
    K(0.18, { a1s: 1.25, a1e: 0.3, wr: 1.2, yw: 1.0, lean: 0.2, rx: 1.8, ry: 15.2, a0s: 0.4, a0e: 1.1 }, GUARD, 'out'), K(0.26, {})] },
  // third cut of the combo: the blade passes to the back hand, which cuts down across the body on a step (hand 0 = back hand)
  ks2: { dur: 0.32, win: [0.12, 0.21], blade: true, power: 165, up: 0.2, hand: 0, swapAt: 0.035, keys: [
    K(0, {}), K(0.035, { a0s: 1.25, a0e: 1.3, a1s: 1.25, a1e: 1.3, wr: 0.8, yw: 1.2 }), K(0.08, { a0s: 2.7, a0e: 0.9, wr: 0.6, yw: 2.4, lean: -0.12, rx: -0.6, a1s: 0.6, a1e: 1.3 }),
    K(0.13, { a0s: 1.0, a0e: 0.1, wr: 0.4, yw: 0, lean: 0.32, rx: 2.2, head: -0.1, a1s: 0.2, a1e: 0.8 }, GUARD, 'in'),
    K(0.2, { a0s: 0.55, a0e: 0.2, wr: 0.3, yw: -0.8, lean: 0.3, rx: 2.2, a1s: 0.2, a1e: 0.8 }, GUARD, 'out'), K(0.32, {})] },
  // a hold from neutral: a wide two-hand cut, the blade sweeping through depth from behind to in front
  kw: { dur: 0.62, win: [0.24, 0.35], blade: true, power: 245, up: 0.25, keys: [
    K(0, {}), K(0.18, { a1s: 1.0, a1e: 1.6, a0s: 0.9, a0e: 1.7, wr: 1.1, yw: 3.0, lean: -0.22, rx: -1.2, ry: 15 }),
    K(0.26, { a1s: 1.5, a1e: 0.1, a0s: 1.42, a0e: 0.25, wr: 1.1, yw: 0, lean: 0.38, rx: 3, ry: 14.5, f0x: -6, head: -0.1 }, GUARD, 'in'),
    K(0.36, { a1s: 1.3, a1e: 0.25, a0s: 1.25, a0e: 0.35, wr: 1.1, yw: -0.8, lean: 0.34, rx: 3, ry: 14.5, f0x: -6 }, GUARD, 'out'), K(0.62, {})] },
  // the finisher: a hold during the combo (or right after it) is a two-hand overhead cut, top to bottom
  kh: { dur: 0.72, win: [0.25, 0.36], blade: true, power: 270, up: 0.1, keys: [
    K(0, {}), K(0.18, { a1s: 3.1, a1e: 0.35, a0s: 2.9, a0e: 0.5, lean: -0.2, rx: -1, ry: 15, wr: 0.2 }),
    K(0.26, { a1s: 1.0, a1e: 0.1, a0s: 0.95, a0e: 0.25, lean: 0.55, rx: 4, ry: 14.2, f0x: -7.5, wr: -0.3, head: -0.25 }, GUARD, 'in'),
    K(0.4, { a1s: 0.9, a1e: 0.1, a0s: 0.85, a0e: 0.25, lean: 0.5, rx: 4, ry: 14.2, f0x: -7.5, wr: -0.35, head: -0.25 }), K(0.72, {}, GUARD, 'out')] },
  // katana in the air: a jump slash, the blade from overhead down through the arc (no somersault: the body stays upright)
  kair: { dur: 0.42, win: [0.06, 0.36], blade: true, power: 190, up: 0.5, keys: [
    K(0, {}, AIR), K(0.06, { a1s: 2.8, a1e: 0.4, wr: 0.5, lean: 0.2, f0y: 8, f1y: 9 }, AIR),
    K(0.3, { a1s: 0.3, a1e: 0.15, wr: -0.5, lean: 0.4, f0y: 8, f1y: 9 }, AIR), K(0.42, {}, AIR)] },
  // axe: one-hand chop; heavy two-hand chop from behind the head that slams the ground
  al: { dur: 0.36, win: [0.18, 0.25], blade: true, power: 160, up: 0.3, keys: [
    K(0, {}), K(0.12, { a1s: 2.9, a1e: 0.5, lean: -0.1, wr: 0.2, a0s: 0.5 }),
    K(0.19, { a1s: 0.7, a1e: 0.05, lean: 0.32, rx: 1.8, a0s: -0.3 }, GUARD, 'in'), K(0.26, { a1s: 0.6, a1e: 0.05, lean: 0.3, rx: 1.8, a0s: -0.3 }), K(0.36, {}, GUARD, 'out')] },
  // second chop: the axe changes to the back hand, which chops down across on a step
  al1: { dur: 0.4, win: [0.19, 0.27], blade: true, power: 170, up: 0.2, hand: 0, swapAt: 0.05, keys: [
    K(0, {}), K(0.05, { a0s: 1.4, a0e: 1.2, a1s: 1.4, a1e: 1.2, wr: 0.2 }), K(0.13, { a0s: 2.9, a0e: 0.5, lean: -0.12, wr: 0.2, rx: -0.6, a1s: 0.5, a1e: 1.2 }),
    K(0.2, { a0s: 0.75, a0e: 0.05, lean: 0.38, rx: 2.4, head: -0.1, a1s: 0.1, a1e: 0.7 }, GUARD, 'in'),
    K(0.28, { a0s: 0.62, a0e: 0.05, lean: 0.35, rx: 2.4, a1s: 0.1, a1e: 0.7 }), K(0.4, {}, GUARD, 'out')] },
  // a hold from neutral: a two-hand side swing at waist height, a big wind-up behind the back
  aw: { dur: 0.8, win: [0.31, 0.41], blade: true, power: 285, up: 0.35, keys: [
    K(0, {}), K(0.24, { a1s: 0.8, a1e: 1.5, a0s: 0.7, a0e: 1.6, wr: 0.9, yw: 3.0, lean: -0.32, rx: -1.6, ry: 15.2 }),
    K(0.32, { a1s: 1.55, a1e: 0.1, a0s: 1.5, a0e: 0.2, wr: 0.9, yw: 0, lean: 0.45, rx: 3.2, ry: 14.4, f0x: -7, head: -0.15 }, GUARD, 'in'),
    K(0.45, { a1s: 1.35, a1e: 0.3, a0s: 1.3, a0e: 0.4, wr: 0.9, yw: -0.8, lean: 0.4, rx: 3, ry: 14.4, f0x: -7 }, GUARD, 'out'), K(0.8, {})] },
  // the finisher: a hold during the combo (or right after it) is the overhead chop that slams the ground, top to bottom
  // push = share of the shove that goes sideways (an overhead chop drives the target down, not away)
  ah: { dur: 0.95, win: [0.37, 0.46], blade: true, power: 320, up: -0.2, push: 0.5, keys: [
    K(0, {}), K(0.3, { a1s: 3.3, a1e: 0.4, a0s: 3.1, a0e: 0.5, lean: -0.3, ry: 15.8, rx: -1.5 }),
    K(0.38, { a1s: 0.45, a1e: 0, a0s: 0.4, a0e: 0.2, lean: 0.75, ry: 12.5, rx: 3.5, f0x: -7, head: -0.3 }, GUARD, 'in'),
    K(0.65, { a1s: 0.45, a1e: 0, a0s: 0.4, a0e: 0.2, lean: 0.72, ry: 12.5, rx: 3.5, f0x: -7, head: -0.3 }), K(0.95, {}, GUARD, 'out')] },
  // from a squat: a low jab, a leg sweep that knocks the feet out, a low blade cut
  slp: { dur: 0.26, win: [0.08, 0.15], limb: 6, power: 85, up: 0.15, keys: [
    K(0, {}, SQUAT), K(0.08, { a1s: 1.6, a1e: 0.1, lean: 0.7, rx: 1.5 }, SQUAT, 'in'), K(0.14, { a1s: 1.6, a1e: 0.05, lean: 0.75, rx: 2 }, SQUAT), K(0.26, {}, SQUAT, 'out')] },
  sweep: { dur: 0.5, win: [0.12, 0.3], limb: 10, power: 160, up: 1.0, keys: [
    K(0, {}, SQUAT), K(0.1, { ry: 5.5, f1x: 9, f1y: 0, lean: 0.3, a0s: 0.4, a0e: 0.6, a1s: 0.5, a1e: 0.6 }, SQUAT, 'in'),
    K(0.22, { ry: 5.5, f1x: 14, f1y: 1, lean: 0.15, rx: -1, a0s: 0.3, a1s: 0.3 }, SQUAT, 'out'), K(0.5, {}, SQUAT)] },
  // a low heavy body blow (the fist drives up from the squat) and a quick low kick at the shins; neither stands him up
  shp: { dur: 0.46, win: [0.16, 0.27], limb: 6, power: 215, up: 0.45, keys: [
    K(0, {}, SQUAT), K(0.12, { a1s: 0.25, a1e: 1.9, lean: 0.1, rx: -1.2, a0s: 1.3, a0e: 1.5 }, SQUAT),
    K(0.18, { a1s: 1.8, a1e: 0.05, lean: 0.85, rx: 2.6, a0s: 0.2, a0e: 1.6, head: -0.1 }, SQUAT, 'in'),
    K(0.3, { a1s: 1.75, a1e: 0.08, lean: 0.8, rx: 2.4, a0s: 0.2, a0e: 1.6, head: -0.1 }, SQUAT), K(0.46, {}, SQUAT, 'out')] },
  slk: { dur: 0.32, win: [0.08, 0.19], limb: 10, power: 105, up: 0.2, keys: [
    K(0, {}, SQUAT), K(0.08, { ry: 6.5, f1x: 11, f1y: 3, lean: -0.12, a0s: 0.5, a1s: 1.3 }, SQUAT, 'in'),
    K(0.17, { ry: 6.5, f1x: 12, f1y: 3, lean: -0.15, a0s: 0.5, a1s: 1.3 }, SQUAT), K(0.32, {}, SQUAT, 'out')] },
  sslash: { dur: 0.34, win: [0.17, 0.26], blade: true, power: 140, up: 0.3, keys: [
    K(0, {}, SQUAT), K(0.09, { a1s: 2.6, a1e: 0.4, lean: 0.4, rx: -0.5 }, SQUAT), K(0.17, { a1s: 1.0, a1e: 0.05, lean: 0.8, rx: 2.2 }, SQUAT, 'in'), K(0.34, {}, SQUAT, 'out')] },
  // throw the blade: wind the front arm back overhead, whip it forward, let go at 0.2 s
  tw: { dur: 0.5, win: [9, 9], limb: 6, power: 0, up: 0, keys: [
    K(0, {}), K(0.15, { a1s: 3.2, a1e: 0.5, a0s: 1.2, a0e: 1.2, lean: -0.3, ry: 15.6, rx: -1.8, f0x: 2 }),
    K(0.22, { a1s: 1.4, a1e: 0, a0s: 0.3, a0e: 0.6, lean: 0.5, ry: 14, rx: 2.5, f0x: -5 }, GUARD, 'in'),
    K(0.32, { a1s: 0.6, a1e: 0.1, a0s: 0.2, a0e: 0.6, lean: 0.6, ry: 13.5, rx: 3, f0x: -6, head: -0.15 }), K(0.5, {})] },
  // axe in the air: raise, then plunge straight down and chop the ground on landing
  aair: { dur: 1.6, win: [0.17, 1.6], blade: true, power: 260, up: -0.2, push: 0.5, keys: [
    K(0, {}, AIR), K(0.1, { a1s: 3.2, a1e: 0.4, a0s: 3.0, a0e: 0.5, lean: -0.25 }, AIR),
    K(0.18, { a1s: 0.55, a1e: 0.1, a0s: 0.5, a0e: 0.2, lean: 0.5, f0x: -3, f0y: 5, f1x: 3, f1y: 5 }, AIR, 'in'),
    K(1.6, { a1s: 0.55, a1e: 0.1, a0s: 0.5, a0e: 0.2, lean: 0.5, f0x: -3, f0y: 5, f1x: 3, f1y: 5 }, AIR)] },
  // gun-butt strike: pull back and ram the weapon forward
  gb: { dur: 0.5, win: [0.16, 0.27], blade: true, power: 180, up: 0.3, keys: [
    K(0, { a0s: 1.35, a0e: 0.3, a1s: 1.25, a1e: 0.32 }), K(0.1, { a1s: 0.9, a1e: 1.2, a0s: 1.0, a0e: 1.2, rx: -1, lean: -0.05 }),
    K(0.17, { a1s: 1.5, a1e: 0.05, a0s: 1.55, a0e: 0.1, rx: 3, lean: 0.35 }, GUARD, 'in'), K(0.26, { a1s: 1.5, a1e: 0.05, a0s: 1.55, a0e: 0.1, rx: 3, lean: 0.33 }),
    K(0.5, { a0s: 1.35, a0e: 0.3, a1s: 1.25, a1e: 0.32 })] },
});
// pre = start of the strike segment (the key before contact): from here a foe in reach is marked for the hit
export const strikeFrom = m => { let pre = m.win[0]; for (const [t] of m.keys) if (t < m.win[0] - 0.005) pre = t; return pre; };
for (const k in MOVES) MOVES[k].pre = strikeFrom(MOVES[k]);
export function keyAt(keys, t) {
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [t0, a] = keys[i - 1], [t1, b, ez] = keys[i], u = (t - t0) / (t1 - t0);
    return lerpA(a, b, ez === 'in' ? u * u * u : ez === 'out' ? 1 - (1 - u) ** 3 : smooth(u));
  }
  return keys[keys.length - 1][1].slice();
}

// skidV: skid-turn above this speed; stopV: releasing a sprint skids to a stop; heavy: fall speed for a hero landing or roll
export const TRN = { skidV: 40, stopV: 50, skidDec: 320, soft: 120, heavy: 175, rollV: 40, hero: 0.45, heroUp: 0.2, roll: 0.45, start: 0.1, settle: 0.2, edge: 3 };
// skid: hips back, lead foot braced ahead, arms thrown out for balance
TRN.SKID = mod(IDLE, { rx: -2, ry: 14.6, lean: -0.38, head: 0.28, f0x: -3, f0y: 0, f1x: 8, f1y: 0, a0s: -1.1, a0e: 0.5, a1s: 1.75, a1e: 0.35 });
// pivot: crouched push-off, chest into the new direction
TRN.PIVOT = mod(IDLE, { rx: 1, ry: 13.8, lean: 0.45, head: -0.25, f0x: -6, f1x: 3, a0s: 1.0, a0e: 0.9, a1s: -0.6, a1e: 0.5 });
// hero landing: rear knee on the ground, front fist planted, rear arm swept back
TRN.HERO = mod(IDLE, { rx: -1, ry: 9.5, lean: 1.15, head: -0.8, f0x: -11, f0y: 1.5, f1x: 5, f1y: 0, a0s: -1.7, a0e: 0.3, a1s: 0.1, a1e: 0.15 });
TRN.TUCK = mod(IDLE, { ry: 13.5, lean: 0.95, head: 1.2, f0x: 6.5, f0y: 7.5, f1x: 8.5, f1y: 8.5, a0s: -0.95, a0e: 1.45, a1s: -0.75, a1e: 1.5 });   // ball: chin down, knees to the chest, arms wrapped to the shins
// duck under a bullet: hips dropped lower than a squat, chest kept fairly upright, chin tucked hard, fists up by the face
TRN.DUCK = mod(IDLE, { rx: -2.5, ry: 4.2, lean: 0.55, head: 1.0, f0x: -6, f1x: 5, a0s: 1.0, a0e: 1.5, a1s: 1.2, a1e: 1.4 });
TRN.BACK = mod(GUARD, { rx: -2.2, ry: 15.2, lean: -0.22, head: 0.18, f0x: -8, f1x: 1, a0s: 0.9, a0e: 2.0, a1s: 1.3, a1e: 1.6 });
TRN.ADASH = mod(AIR, { lean: 0.5, head: -0.35, f0x: -8, f0y: 9, f1x: -3, f1y: 8, a0s: -1.5, a0e: 0.3, a1s: -1.1, a1e: 0.5 });

// short dodge (Space): forward = a slip in under the blow; back = TRN.BACK. Block: forearms up at the face; parry: the front arm knocks the blow aside; gbreak: guard smashed open
TRN.SLIP = mod(GUARD, { rx: 1.5, ry: 13.8, lean: 0.55, head: -0.3, f0x: -9, f1x: 5, a0s: 1.1, a0e: 2.3, a1s: 1.3, a1e: 2.0 });
TRN.BLOCK = mod(GUARD, { rx: -0.8, ry: 15.0, lean: 0.12, head: 0.25, f0x: -7, f1x: 4.5, a0s: 1.35, a0e: 2.1, a1s: 1.6, a1e: 1.85 });
TRN.PARRY = mod(GUARD, { rx: -1, ry: 15.2, lean: -0.05, head: 0.15, a0s: 1.2, a0e: 2.3, a1s: 2.3, a1e: 0.9 });
TRN.GBREAK = mod(GUARD, { rx: -2.5, ry: 14.6, lean: -0.4, head: 0.4, f0x: -9, f1x: 2, a0s: 0.2, a0e: 0.8, a1s: 2.2, a1e: 0.4 });

// dodge: v/dur = the long roll (↓ at a run), air/airDur = air dash; inv = time attacks miss
export const DASH = { v: 300, dur: 0.66, inv: 0.26, cd: 0.4, back: 160, backDur: 0.26, air: 155, airDur: 0.2 };
// combat tuning (shared by both views: all of it is sim)
// heavyT: a held Q/W turns its light into the heavy; throwT: a hold that throws. step: the short dodge (d px in t s, inv = i-frames, atk = attack-cancel from).
// pd: perfect dodge = a dodge started within win s of a hit's contact: slow-mo (x slow for slowT real s), the attacker exposed (counter window).
// parry: a block tap within win s before contact (lock: no parry again for a press this soon after the last); the attacker reels stag s.
// block: chip = share of a light hit that gets through. wake: i-frames after a get-up; floor: most time on the floor; tech: window (s on the floor) for a tech-roll.
// str: the hero's string (hits within gap s): rep = per repeat of the same move, lone = a heavy that opens, ender = a heavy after 2+ hits, ctr = a counter-hit
export const DEF = {
  heavyT: 0.18, throwT: 0.3,
  step: { d: 36, t: 0.25, inv: 0.14, atk: 0.15 },
  pd: { win: 0.1, slow: 0.3, slowT: 0.5, expose: 0.8 },
  parry: { win: 0.125, lock: 0.3, stag: 0.6, stop: 0.12 },
  block: { chip: 0.2, inv: 0.12, push: 70 },
  wake: 0.5, floor: 1.2, tech: [0.05, 0.9],
  str: { gap: 0.9, rep: 0.65, lone: 0.6, ender: 1.2, ctr: 1.25 },
};
// hit-stop per move (seconds the world freezes when it connects); moves not listed use their power
export const STOP = { lp0: 0.05, lp1: 0.05, hp: 0.12, lk0: 0.06, lk1: 0.06, hk0: 0.12, hk1: 0.12, airkick: 0.08, ks0: 0.06, ks1: 0.06, kh: 0.12, kair: 0.07, al: 0.08, al1: 0.08, aw: 0.13, ks2: 0.05, kw: 0.1, ah: 0.15, aair: 0.1, gb: 0.08,
  slp: 0.04, sweep: 0.09, sslash: 0.06, tw: 0.08, lpl: 0.1, lpw: 0.12, stomp: 0.08, knee: 0.07, gslam: 0.1 };
// combo depth (#5): the fist string's 4th press is the ender (lpl: a rising uppercut that launches him; lpw, → held: a lunging cross that
// sends him flying into a wall); a stomp on a goon on the floor; the clinch: knees (Q) and a throw (W)
// clinch: both hands on the back of his head, pulling him down onto the knee
TRN.CLINCH = mod(GUARD, { rx: 0.5, ry: 15.2, lean: 0.3, head: 0.15, f0x: -7, f1x: 3, a0s: 1.45, a0e: 0.75, a1s: 1.6, a1e: 0.5 });
// shoot-dodge (a dodge in Sandman time with a gun): a flat dive, belly down (DIVE) or back down with the feet toward the foe (DIVEB, a dive away)
TRN.DIVE = mod(IDLE, { rx: 0, ry: 5, lean: 1.5, head: -1.1, f0x: -15, f0y: 6, f1x: -14, f1y: 8, a0s: 1.6, a0e: 0.2, a1s: 1.6, a1e: 0.1 });
TRN.DIVEB = mod(IDLE, { rx: 0, ry: 5, lean: -1.45, head: 1.0, f0x: 14, f0y: 7, f1x: 15, f1y: 9, a0s: 1.5, a0e: 0.2, a1s: 1.6, a1e: 0.1 });
const LPW_OUT = { rx: 4.2, lean: 0.6, ry: 15.2, head: -0.3, f0x: -7, f0y: 2, a0s: 1.68, a0e: 0, a1s: 0.4, a1e: 2.4 };
const LPL_OUT = { ry: 16.8, lean: -0.12, rx: 2.2, head: -0.35, f0x: -4, a0s: 2.55, a0e: 0.55, a1s: 0.9, a1e: 2.1 };
const KNEE_OUT = { f1x: 7, f1y: 13, rx: 1, lean: 0.35, head: 0.1, a0s: 1.15, a0e: 1.0, a1s: 1.3, a1e: 0.8 };
const STOMP_OUT = { ry: 14.6, lean: 0.45, head: 0.5, f1x: 9, f1y: 0, a0s: 1.0, a0e: 1.5, a1s: 0.3, a1e: 0.8 };
Object.assign(MOVES, {
  // the launcher: dip, then the rear fist drives up through his chin and the body rises behind it
  lpl: { dur: 0.5, win: [0.12, 0.2], limb: 4, power: 250, up: 1.6, ender: true, lunge: 9, keys: [
    K(0, {}), K(0.07, { ry: 13.8, lean: 0.35, rx: 0.5, head: -0.2, a0s: 0.3, a0e: 2.0, a1s: 1.2, a1e: 2.0 }),
    K(0.13, LPL_OUT, GUARD, 'in'), K(0.22, { ...LPL_OUT, a0s: 2.65 }), K(0.5, {}, GUARD, 'out')] },
  // the wall-splat: a quick coil, then the whole body behind a straight rear cross
  lpw: { dur: 0.55, win: [0.12, 0.2], limb: 4, power: 280, up: 0.15, ender: true, lunge: 9, keys: [
    K(0, {}), K(0.07, { rx: -1.8, lean: -0.15, ry: 15, a0s: 0.1, a0e: 2.5, a1s: 1.4, a1e: 1.5 }),
    K(0.13, LPW_OUT, GUARD, 'in'), K(0.22, { ...LPW_OUT, rx: 4.4 }), K(0.55, {}, GUARD, 'out')] },
  // a stomp on a goon on the floor (↓ + W by him): the knee comes up high, the heel drives down
  stomp: { dur: 0.5, win: [0.2, 0.3], limb: 10, power: 200, up: 0.3, otg: true, keys: [
    K(0, {}), K(0.14, { ry: 16.6, lean: 0.3, head: 0.45, f1x: 7, f1y: 11, a0s: 0.9, a0e: 1.6, a1s: 0.5, a1e: 1.0 }),
    K(0.22, STOMP_OUT, GUARD, 'in'), K(0.3, STOMP_OUT), K(0.5, {}, GUARD, 'out')] },
  // in the clinch: a knee to the body as the hands pull his head down
  knee: { dur: 0.36, win: [0.14, 0.2], limb: 9, power: 200, up: 0.3, clinch: true, keys: [
    K(0, {}, TRN.CLINCH), K(0.1, { f1x: 5, f1y: 9, rx: 0, lean: 0.15, a0s: 1.3, a0e: 0.9, a1s: 1.4, a1e: 0.7 }, TRN.CLINCH),
    K(0.15, KNEE_OUT, TRN.CLINCH, 'in'), K(0.22, KNEE_OUT, TRN.CLINCH), K(0.36, {}, TRN.CLINCH, 'out')] },
  // the clinch throw: heave him back, then swing him round and let go at 0.2 s
  gtoss: { dur: 0.6, win: [9, 9], limb: 6, power: 0, up: 0, clinch: true, keys: [
    K(0, {}, TRN.CLINCH), K(0.12, { lean: -0.35, rx: -1.8, ry: 14.6, head: 0.2, f0x: -9, f1x: 3, a0s: 1.0, a0e: 0.5, a1s: 1.1, a1e: 0.4 }, TRN.CLINCH),
    K(0.2, { lean: 0.55, rx: 3, ry: 14.8, head: -0.2, f0x: -9, f1x: 6, a0s: 2.3, a0e: 0.2, a1s: 2.4, a1e: 0.15 }, TRN.CLINCH, 'in'),
    K(0.34, { lean: 0.5, rx: 3, ry: 14.8, head: -0.2, f0x: -9, f1x: 6, a0s: 2.2, a0e: 0.3, a1s: 2.3, a1e: 0.25 }, TRN.CLINCH), K(0.6, {}, GUARD, 'out')] },
  // the ground slam (in the clinch, ↓ + W; or F + ↓ on a goon at finisher health): dip under him, press him overhead, drive him down into the floor
  // (win: the impact, SLAM.down[1]; it sets the chain point, so a stomp can follow)
  gslam: { dur: 0.82, win: [0.46, 0.5], limb: 6, power: 0, up: 0, clinch: true, keys: [
    K(0, {}, TRN.CLINCH), K(0.1, { ry: 12.8, lean: 0.3, rx: 0.6, head: 0.25, f0x: -7, f1x: 5, a0s: 1.0, a0e: 0.6, a1s: 1.1, a1e: 0.5 }, TRN.CLINCH),   // under him
    K(0.3, { ry: 16.6, lean: -0.12, rx: 0, head: -0.4, f0x: -6, f1x: 5, a0s: 3.0, a0e: 0.25, a1s: 3.1, a1e: 0.2 }, GUARD, 'in'),   // pressed overhead
    K(0.38, { ry: 16.8, lean: -0.18, rx: -0.3, head: -0.45, f0x: -6, f1x: 5, a0s: 3.05, a0e: 0.2, a1s: 3.15, a1e: 0.15 }),
    K(0.46, { ry: 11.6, lean: 1.0, rx: 3.2, head: -0.3, f0x: -9, f1x: 7, a0s: 0.95, a0e: 0.15, a1s: 1.05, a1e: 0.1 }, GUARD, 'in'),   // driven down
    K(0.62, { ry: 11.8, lean: 0.95, rx: 3.2, head: -0.25, f0x: -9, f1x: 7, a0s: 0.9, a0e: 0.2, a1s: 1.0, a1e: 0.15 }), K(0.82, {}, GUARD, 'out')] },
});
for (const k of ['lpl', 'lpw', 'stomp', 'knee', 'gtoss', 'gslam']) MOVES[k].pre = strikeFrom(MOVES[k]);
// the finishers (#6), one per weapon class: f = fists, k = katana, a = axe, g = gun. gap: where he stands from the goon; hit: the killing blow (s);
// kneel: the goon drops to his knees for it. The gun's arms are held by the gun's IK (only the body moves)
export const FINS = {
  f: { dur: 0.75, hit: 0.3, gap: 13, power: 330, up: 0.5, keys: [K(0, {}),
    K(0.2, { rx: -2.2, lean: -0.35, ry: 15, head: 0.1, f0x: -8, a0s: -0.6, a0e: 2.4, a1s: 1.3, a1e: 1.7 }),   // the rear fist cocked far back over the shoulder
    K(0.3, { rx: 4, lean: 0.75, ry: 13.8, head: -0.35, f0x: -9, f0y: 1, f1x: 6, a0s: 2.0, a0e: 0.2, a1s: 0.4, a1e: 2.2 }, GUARD, 'in'),   // the overhand
    K(0.5, { rx: 4, lean: 0.8, ry: 13.6, head: -0.3, f0x: -9, f0y: 1, f1x: 6, a0s: 1.3, a0e: 0.4, a1s: 0.4, a1e: 2.2 }), K(0.75, {}, GUARD, 'out')] },
  k: { dur: 0.95, hit: 0.23, gap: 13, power: 300, up: 0.4, kneel: true, keys: [K(0, {}),
    K(0.15, { rx: 0.5, ry: 14.2, lean: 0.35, head: -0.1, f0x: -8, f1x: 6, a1s: 0.5, a1e: 0.4, wr: 0.2, a0s: 0.6, a0e: 1.2 }),   // low, the blade down and back
    K(0.24, { rx: 3.2, ry: 15.6, lean: -0.05, head: -0.25, f0x: -10, f1x: 7, a1s: 2.8, a1e: 0.1, wr: -0.2, a0s: 1.2, a0e: 1.4 }, GUARD, 'in'),   // the cut up through him
    K(0.65, { rx: 3.2, ry: 15.6, lean: -0.08, head: -0.2, f0x: -10, f1x: 7, a1s: 2.85, a1e: 0.1, wr: -0.25, a0s: 1.2, a0e: 1.4 }), K(0.95, {}, GUARD, 'out')] },   // and held: he does not look back
  a: { dur: 0.95, hit: 0.32, gap: 14, power: 340, up: -0.2, keys: [K(0, {}),
    K(0.22, { a1s: 3.3, a1e: 0.4, a0s: 3.1, a0e: 0.5, lean: -0.35, ry: 16, rx: -1.6, head: 0.2 }),   // two hands, high over the head
    K(0.32, { a1s: 0.5, a1e: 0, a0s: 0.45, a0e: 0.2, lean: 0.85, ry: 12, rx: 3.8, f0x: -8, head: -0.35 }, GUARD, 'in'),
    K(0.62, { a1s: 0.5, a1e: 0, a0s: 0.45, a0e: 0.2, lean: 0.82, ry: 12, rx: 3.8, f0x: -8, head: -0.3 }), K(0.95, {}, GUARD, 'out')] },
  g: { dur: 0.8, hit: 0.3, gap: 17, power: 300, up: 0.3, kneel: true, aim: 0.3, keys: [K(0, {}),
    K(0.14, { rx: 2.5, lean: 0.2, ry: 15, f0x: -7, f1x: 6, head: -0.1 }), K(0.6, { rx: 2.6, lean: 0.15, ry: 15.2, f0x: -7, f1x: 6, head: -0.05 }), K(0.8, {})] },
};
// combo depth tuning (sim). JUG: a launched goon is juggled while his hips are air px over the floor: each hit pops him pop px/s up (x popK per hit),
// his fall speeds up (gravity x g x (1 + gK per hit)); launch = the launcher's pop, a hit does dmgK per hit less; max hits, then he just drops (no infinite).
// SPLAT: the wall-splat flight (vx, vy px/s, fly s); a body that meets a wall, a vehicle or a crate in flight sticks for stick s (dmg to him);
// a body in flight hits the goons in its way for crowd dmg and floors them. GRAB: hold = s before he breaks free with no knee or throw;
// knees (Q) at most; knee dmg; the throw (W): v, vy px/s, fly s, self = dmg to the thrown goon; gap = px between the two in the clinch.
// OTG: stomp and point-blank shot damage; at most otgN extra beats on the floor. DIVE: the shoot-dodge: v px/s for t s, h px high, inv s; down s on the floor
export const JUG = { launch: 105, pop: 120, popK: 0.8, g: 1.2, gK: 0.35, dmgK: 0.88, max: 7, air: 5 };
export const SPLAT = { vx: 250, vy: -45, fly: 0.75, stick: 0.45, dmg: 10, crowd: 12 };
export const GRAB = { hold: 1.6, knees: 3, knee: 7, v: 235, vy: -100, fly: 0.9, self: 8, gap: 19 };
export const OTG = { stomp: 12, shot: 1.4, n: 2, reach: 22 };
export const DIVE = { v: 190, t: 0.55, h: 9, inv: 0.5, down: 0.3 };
// SLAM: the ground slam. up = he is overhead (s), down = driven into the floor (the impact, s); lift = px over the hero's feet at the top,
// fwd = px in front where he lands; dmg (no finisher); the shockwave floors the goons within r px (dy px up or down)
export const SLAM = { up: [0.1, 0.3], down: [0.38, 0.46], lift: 38, fwd: 15, dmg: 22, r: 40, dy: 10 };
// focus (#6), the Sandman's meter: 0..max; F starts Sandman time with at least min in it: dur s of world at slow x speed for a full meter (the hero
// at full speed), drained as it runs. gain: per varied hit (rep: a repeat), ender, counter, juggle hit, wall-splat, knee, clinch throw, parry,
// perfect dodge, kill, a bullet that lands, a stomp; none while it runs. fin: a finisher on a goon at <= hp of his max; stop = hit-stop (4 frames);
// cam = the punch-in time (s). last/boss: the auto slow-motion (real s) on the last kill of a wave and on the boss kill
export const FOCUS = { max: 100, min: 25, dur: 3, slow: 0.3, last: 0.6, boss: 1.2,
  gain: { hit: 4, rep: 1, ender: 8, ctr: 6, jug: 5, splat: 10, knee: 3, gthrow: 8, parry: 15, pdodge: 12, kill: 4, shot: 0.6, otg: 3, slam: 10 } };
export const FIN = { hp: 0.3, reach: 34, stop: 4 / 60, cam: 0.7 };
