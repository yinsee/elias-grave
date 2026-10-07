// ---------- loose objects: crates, bins and chairs slide and settle flat, kegs and balls roll ----------
export const KINDS = {
  crate: { r: 5, m: 2, e: 0.2, roll: false, hp: 260 },
  barrel: { r: 5, m: 3, e: 0.15, roll: true, hp: 300 },
  ball: { r: 3.5, m: 0.6, e: 0.7, roll: true, hp: 80 },
  bigcrate: { r: 6, m: 3, e: 0.2, roll: false, hp: 420 },
  // two big crates stacked: a box (hw = half width, r = half height) that slides but never tips; its top is a surface
  stack: { r: 12, hw: 6, m: 12, e: 0.1, roll: false, hp: 700 },
  // city clutter: a steel dustbin, a pile of bin bags, a cafe chair, a traffic cone
  // every object takes hits like a crate: it cracks (chips fly) and breaks when its hp runs out
  bin: { r: 5.5, m: 3, e: 0.15, roll: false, hp: 240 },
  bag: { r: 4.5, m: 1.5, e: 0.05, roll: false, hp: 120 },
  chair: { r: 5, m: 1, e: 0.3, roll: false, hp: 150 },
  cone: { r: 4, m: 0.8, e: 0.25, roll: false, hp: 120 },
  // tossed in by the club crowd during the boss fight: squat by one to pocket it, a Q hold with no goon in reach throws it (one use)
  can: { r: 2, m: 0.3, e: 0.4, roll: true, pocket: true, hp: 40 },
  bottle: { r: 2.5, m: 0.4, e: 0.2, roll: true, pocket: true, hp: 40 },
  knife: { r: 2.5, m: 0.2, e: 0.1, roll: false, pocket: true, hp: 60 },
  // Pier 9: a frozen tuna Marchetti tore off the conveyor (r = half its height; it lies on its side, 22 px long)
  tuna: { r: 4, m: 4, e: 0.1, roll: false, hp: 260 },
};
// what can be lifted and carried; what a pocket throw does; what breaks when pushed too far or knocked hard
export const LIFTABLE = new Set(['crate', 'bin', 'bag', 'chair', 'cone', 'barrel', 'bigcrate', 'tuna']);
export const TOSS = { can: { dmg: 10, power: 120, v: 230, up: 70, spin: 22 }, bottle: { dmg: 14, power: 150, v: 220, up: 80, spin: 18 }, knife: { dmg: 20, power: 170, v: 320, up: 20, spin: 0 } };
export const FLOOR_BREAK = new Set(['crate', 'bigcrate', 'stack', 'bin', 'cone', 'chair', 'barrel', 'bag', 'can', 'bottle', 'knife', 'ball']), PUSH_BREAK = 64;   // (every object)
// small things a walk or a run kicks along: they skitter and roll on (no PUSH_BREAK); a hard knock or a goon still breaks them
export const KICKS = new Set(['can', 'bottle', 'ball', 'cone']);
