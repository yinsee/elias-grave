// Level 2, "Line Zero" (docs/levels/02-line-zero.md): the level's data. Level id `metro`.
// The plan's 3600 px strip is folded into the engine's 2800 x 320 world, as Pier 9 folds its own: the boss arena (the rail
// junction) sits where the club is (x 2436-2800), behind the blast door at the street's end wall (x 2414).
//   stairs 0-300 · platform 300-1000 · tunnel 1000-1640 · yard 1640-2414 (Tinder's arena 2100-2414) · junction 2436-2800
// All arrays "by difficulty" are [Easy, Medium, Hard, Wicked].

export const GROUND = 280;
const hy = h => GROUND - h;

// ---- the map ----
export const SECTIONS = [   // amb: the ambient light [r, g, b]; dark: the hero's coat lamp lights the way
  { id: 'stairs', x0: -99, x1: 300, amb: [0.42, 0.44, 0.52] },
  { id: 'platform', x0: 300, x1: 1000, amb: [0.2, 0.22, 0.25], lit: [0.48, 0.47, 0.42], dark: true },   // dark until the breaker is hit (lit)
  { id: 'tunnel', x0: 1000, x1: 1640, amb: [0.16, 0.17, 0.2], dark: true },
  { id: 'yard', x0: 1640, x1: 2420, amb: [0.34, 0.31, 0.36] },
  { id: 'junction', x0: 2420, x1: 2900, amb: [0.38, 0.38, 0.46] },
];
export const MEZZ = { x0: 0, x1: 120, y: 170 };           // the mezzanine (the hero starts on it)
export const STAIR = { x0: 120, n: 27, step: 4 };         // the stair flight down to the platform: n treads, 4 px wide and 4 px high
export const GRATES = [56, 262];                          // street grates in the ceiling: rain falls through them in lit columns
export const BOOTH = { x0: 330, x1: 372, top: hy(44) };   // the ticket booth (its roof is a ledge)
export const HUT = { x0: 598, x1: 634, top: hy(52) };     // a relay hut under the catwalk: the step up to it
export const CATWALK = { x0: 640, x1: 862, y: hy(110) };  // the maintenance catwalk (one-way)
export const GREEN_LAMP = 420;                            // the green work lamp the knife kills
export const TUBES = [360, 520, 700, 880];                 // the sodium tubes the breaker brings back
export const BREAKER = { x: 560, y: hy(44) };
export const BRAZIER_X = 762;                             // a burning oil drum on the flooded floor: tip it into the slick
export const LANTERN = { x: 912, y: hy(84) };             // a work lantern over the slick: hit it with a bottle or a shot
export const WATER = [                                    // flooded floor: slow = move speed factor; oil: the slick (it burns)
  { x0: 300, x1: 1000, slow: 0.9 },
  { x0: 780, x1: 990, slow: 0.75, oil: 'slick' },
  { x0: 2200, x1: 2290, slow: 0.9, oil: 'pool' },          // Tinder's fuel pool
  { x0: 2596, x1: 2764, slow: 0.95, wet: true },           // the junction's wet zone (live when a train on track 2 arcs the rail)
];
export const TUNNEL = { x0: 1000, x1: 1640 };              // trains on the tunnel tracks run between these portals
export const WALL_CW = { x0: 1048, x1: 1182, y: hy(84) };  // the cable catwalk on the tunnel wall
export const NICHES = [                                    // refuge niches in the wall: ↑ steps in (a train passes in front)
  { x: 1120, w: 24 }, { x: 1222, w: 24, board: 'n3' }, { x: 1320, w: 24 },
  { x: 2600, w: 22, arena: true }, { x: 2690, w: 22, arena: true },
];
export const DRAINS = [450, 1270, 1372];                   // crawlers rise out of these
export const EMERGENCY = [1060, 1290, 1530];               // dead-blue emergency lamps in the tunnel
export const FAR_LEDGE = { x0: 1462, x1: 1622, y: hy(40) }; // the far service ledge behind track 2 (the back lane)
export const TRACK2 = { x0: 1430, x1: 1640 };              // where track 2 runs in the tunnel
export const CAR_A = { x0: 1684, x1: 1904, y: hy(76) };    // the Rats' camp car (its roof is a ledge)
export const CAR_B = { x0: 1950, x1: 2062, y: hy(70) };
export const JOB_BOARD = 1772;                             // the chalk job board in the camp car
export const DOOR_BELL = 1846;                             // Bell's brass door bell on the trophy shelf
export const RADIO = 1720;
export const TINDER_ARENA = { x0: 2104, x1: 2410 };
export const WATERFALL = { x: 2338, w: 14 };               // the vent shaft's waterfall: it puts out fire (Tinder's flare too)
export const CRANE_X = 2246;
export const BLAST_DOOR = 2414;
// the junction (the boss arena)
export const BALCONY = { x0: 2450, x1: 2532, y: hy(90) };  // the signal box balcony (lever A on it)
export const LEVER_A = 2476;
export const CAB_A = { x0: 2538, x1: 2562, top: hy(44) };  // relay cabinets: the steps up to the balcony and the gantry
export const CAB_B = { x0: 2772, x1: 2796, top: hy(50) };
export const GANTRY = { x0: 2642, x1: 2772, y: hy(98) };
export const LEVER_B = 2770;                              // the ground lever frame: Q by it throws it (the next train runs on track 1)
export const THIRD_RAIL = [[2610, 2660], [2712, 2750]];
export const VENTS = [2632, 2732];
export const SIGNALS = [2446, 2790];                       // signal heads over the two portals
export const PORTALS = [2440, 2796];
export const CLOCK = { x: 2490, y: hy(122) };              // Bell & Sons, stopped at 3:17, in the signal box window
export const CREW_DOORS = [2452, 2788];                    // the crew comes out of the portals

// lights painted into the wall (EMIT colours) and lit in the light pass
export const LAMPS = [];

// ---- surfaces (ledges) ----
export function surfaces() {
  return [
    { ...MEZZ },
    { x0: BOOTH.x0, x1: BOOTH.x1, y: BOOTH.top },
    { x0: HUT.x0, x1: HUT.x1, y: HUT.top },
    { ...CATWALK, oneWay: true },
    { ...WALL_CW },
    { ...FAR_LEDGE, back: true },
    { x0: CAR_A.x0, x1: CAR_A.x1, y: CAR_A.y },
    { x0: CAR_B.x0, x1: CAR_B.x1, y: CAR_B.y },
    { ...BALCONY },
    { x0: CAB_A.x0, x1: CAB_A.x1, y: CAB_A.top },
    { ...GANTRY },
    { x0: CAB_B.x0, x1: CAB_B.x1, y: CAB_B.top },
  ];
}
// the stair flight: treads 4 px wide and 4 px high, rising to the left (dir -1); the engine's stair walk climbs them
export function steps() {
  const out = [];
  for (let i = 0; i < STAIR.n; i++) { const x0 = STAIR.x0 + i * STAIR.step; out.push({ x0, x1: x0 + STAIR.step - 1, y: MEZZ.y + (i + 1) * STAIR.step, step: true, dir: -1, k: 0 }); }
  return out;
}
export const STAIR_RANGE = { x0: STAIR.x0, x1: STAIR.x0 + STAIR.n * STAIR.step };

// ---- props and pickups ----
export const OBJ_START = [
  ['bin', 384, GROUND], ['chair', 400, GROUND], ['crate', 520, GROUND], ['bottle', 476, GROUND], ['crate', 700, GROUND], ['crate', 740, GROUND],
  ['barrel', BRAZIER_X, GROUND], ['crate', 1010, GROUND],
  ['barrel', 1236, GROUND], ['crate', 1300, GROUND], ['bottle', 1180, GROUND],
  ['crate', 1700, GROUND], ['barrel', 1760, GROUND], ['chair', 1810, GROUND], ['chair', 1834, GROUND], ['crate', 1980, GROUND], ['barrel', 2040, GROUND], ['bottle', 1900, GROUND],
  ['barrel', 2150, GROUND], ['barrel', 2190, GROUND], ['barrel', 2300, GROUND], ['barrel', 2380, GROUND],
  ['crate', 2580, GROUND], ['barrel', 2680, GROUND], ['crate', 2740, GROUND],
];
// weapons waiting on stands; `hidden`: behind a board or in a stash until it is broken open (a bark spot)
export const PICKUPS = [
  { w: 2, x: 1792, rack: true },              // the fire axe on the camp car's wall
  { w: 3, x: 1222, hidden: 'n3' },            // the shotgun in the boarded niche
  { w: 4, x: 1402, hidden: 'n4' },            // the machine gun in the Choir's toolbox (stolen hardware)
];
// bark spots: Nero barks at what hides a stash. A board is planks over a hole in the wall (hit it to break it);
// a box is a toolbox on the floor. give: what is inside ('w' = the hidden pickup, 'ammo', 'band', 'bottle')
export const STASHES = [
  { id: 'n1', x: 288, w: 22, h: 46, hp: 20, kind: 'board', give: ['band', 'bottle', 'bottle'] },
  { id: 'n3', x: 1222, w: 26, h: 50, hp: 40, kind: 'board', give: ['w', 'ammo', 'band'] },
  { id: 'n4', x: 1402, w: 20, h: 12, hp: 30, kind: 'box', give: ['w', 'ammo'] },
];

// ---- the Tunnel Rats (docs/levels/02-line-zero.md 4) ----
// looks: src/sim/enemies/roster.js LOOK format, plus hat / boots / gear
export const RAT_LOOKS = {
  ratHood: { build: 'lean', top: 'hood', hair: ['hood'], beards: ['none', 'stubble'], cols: [['#3e3a44', '#2c2932'], ['#4a3e36', '#352c26'], ['#2e3a3a', '#212b2b']], pants: ['#2e3040', '#3a3428'], boots: '#141418' },
  ratVest: { build: 'stocky', top: 'vest', hair: ['short', 'mohawk'], beards: ['stubble', 'chin'], cols: [['#e07020', '#a8521a']], pants: ['#2e3040'], boots: '#1a1a1e' },      // an orange rail-crew vest
  ratCoat: { build: 'tall', top: 'coat', hair: ['cap'], beards: ['none', 'stubble'], cols: [['#3a3a2e', '#2a2a22']], pants: ['#2a2a30'], hairC: '#2a2a2a', gear: 'spikes' }, // a long coat, a bandolier of rail spikes
  ratSkin: { build: 'lean', top: 'tank', hair: ['bald', 'short'], beards: ['stubble', 'none'], cols: [['#3a4a3e', '#2a362e']], pants: ['#2a2e2a'], boots: '#141418' },     // wet, an oilskin over a bare chest
  ratMask: { build: 'stocky', top: 'jacket', hair: ['short'], beards: ['none'], cols: [['#5a4a3a', '#43372b']], pants: ['#2e2e36'], boots: '#1a1a1e', gear: 'mask' },     // a gas mask, welder's gloves
  ratCape: { build: 'tall', top: 'coat', hair: ['hood'], beards: ['stubble', 'none'], cols: [['#5a2a2a', '#421e1e']], pants: ['#2e3040'], boots: '#141418' },            // a rain cape
  tinder: { build: 'lean', top: 'vest', hair: ['short'], beards: ['stubble'], cols: [['#6a5a44', '#4e4232']], pants: ['#2a2826'], boots: '#141418', apron: '#5a4a38', gear: 'goggles' },
  switch: { build: 'lean', top: 'coat', hair: ['short'], beards: ['none'], cols: [['#c0242a', '#8a1a1e']], pants: ['#1e1e24'], boots: '#141418', hairC: '#1a1418', gear: 'goggles', skin: ['#e8c0a0', '#c09878'] },
};
// variant -> base role and look; the behaviour row (each one needs a different answer):
//   lurk: in a dark place it waits still (eyes glint) until the hero is within `near` px or turns his back -> watch Nero, light it, turn to it
//   shove: during a train warning it shoves the hero toward the track (a 0.4 s wind-up) -> dodge or hit it in the wind-up
//   knockK: its heavy hits throw the hero further
//   proj: what it throws ('spike' flat and fast 8 dmg, 'firebottle' an arc that leaves fire, 'flare' a slow arc that burns and lights)
//   perch: it keeps to raised surfaces and jumps down when the hero climbs up -> climb to it, or hit it off
//   rise: it rises out of a drain (s) and opens with a low slash -> watch the drain, jump the slash
//   clip / reload: shots before a reload, the reload window (s) -> rush it while it reloads
export const RATS = {
  shiv: { role: 'knife', look: 'ratHood', type: 'Shiv Rat', weapon: 'knife', hpK: 0.85, spdK: 1.1, lurk: { near: 70 }, low: 0.15 },
  lineman: { role: 'pipe', look: 'ratVest', type: 'Lineman', weapon: 'pipe', R: { w: 'wrench', len: 9, reach: 24 }, shove: { windup: 0.4, push: 230 }, knockK: 1.3, heavy: 0.3 },
  ratcatcher: { role: 'thrower', look: 'ratCoat', type: 'Ratcatcher', weapon: 'tknife', proj: 'spike', cdK: 0.8, perch: true },
  crawler: { role: 'knife', look: 'ratSkin', type: 'Crawler', weapon: 'knife', hpK: 0.75, rise: 0.6, low: 1, R: { w: 'hook', len: 6, reach: 21 } },
  firebug: { role: 'thrower', look: 'ratMask', type: 'Firebug', weapon: 'tknife', proj: 'firebottle', max: 1 },
  flare: { role: 'pistol', look: 'ratCape', type: 'Flare Rat', weapon: 'pistol', R: { w: 'flaregun' }, proj: 'flare', clip: 2, reload: 3, gap: 0.7, max: 2 },
};
export const RAT_NAMES = ['Gutter', 'Wick', 'Soot', 'Tallow', 'Pike', 'Rivet', 'Sparks', 'Ash', 'Moth', 'Coil', 'Spit', 'Tick', 'Ferret', 'Grub', 'Cinder', 'Nail', 'Flint', 'Rust', 'Skink', 'Lamp'];

// waves: trigger x (at), after: waits for these waves to be down; from: spawn sources ({ kind: 'edge' (off the view, dir 1 = right),
// 'drain' x, 'ledge' x (a surface top), 'niche' x }); roster by difficulty; reinf: more on Hard and Wicked when half are down;
// ckpt: a checkpoint as it starts; dark: it starts the lights-out script; t2: the train sent `t2` s after it starts
export const WAVES = [
  { id: 'w2', at: 330, dark: true, from: [{ kind: 'edge', dir: 1 }, { kind: 'edge', dir: 1 }, { kind: 'drain', x: 450 }],
    roster: [['shiv', 'shiv', 'lineman'], ['shiv', 'shiv', 'lineman', 'lineman'], ['shiv', 'shiv', 'lineman', 'lineman', 'crawler'], ['shiv', 'shiv', 'lineman', 'lineman', 'crawler', 'shiv']], line: "It's him! The Sandman's in the tunnels!" },
  { id: 'w3', at: 610, after: 'w2', from: [{ kind: 'ledge', x: 790 }, { kind: 'edge', dir: 1 }, { kind: 'ledge', x: 840 }, { kind: 'edge', dir: 1 }],
    roster: [['ratcatcher', 'shiv', 'shiv'], ['ratcatcher', 'shiv', 'ratcatcher', 'lineman'], ['ratcatcher', 'shiv', 'ratcatcher', 'lineman', 'shiv', 'flare'], ['ratcatcher', 'shiv', 'ratcatcher', 'lineman', 'shiv', 'flare', 'ratcatcher']] },
  { id: 'w4', at: 800, after: 'w3', whistle: true, from: [{ kind: 'edge', dir: 1 }, { kind: 'edge', dir: 1 }, { kind: 'edge', dir: 1 }],
    roster: [['shiv', 'lineman', 'shiv', 'lineman'], ['shiv', 'lineman', 'shiv', 'lineman', 'shiv', 'lineman'], ['firebug', 'shiv', 'lineman', 'shiv', 'lineman', 'shiv', 'lineman'], ['firebug', 'shiv', 'lineman', 'shiv', 'lineman', 'shiv', 'lineman', 'shiv']], then: 'w4b' },
  { id: 'w4b', reinf: true, from: [{ kind: 'edge', dir: 1 }, { kind: 'edge', dir: -1 }],
    roster: [[], [], ['shiv', 'lineman'], ['shiv', 'lineman', 'shiv']] },
  { id: 'w6', at: 1250, ckpt: 'the tunnel', t2: 25, from: [{ kind: 'edge', dir: 1 }, { kind: 'drain', x: 1372 }, { kind: 'edge', dir: 1 }, { kind: 'drain', x: 1270 }],
    roster: [['shiv', 'crawler', 'lineman', 'flare'], ['shiv', 'crawler', 'lineman', 'flare', 'lineman', 'crawler'], ['shiv', 'crawler', 'lineman', 'flare', 'lineman', 'crawler', 'shiv', 'flare'], ['shiv', 'crawler', 'lineman', 'flare', 'lineman', 'crawler', 'shiv', 'flare', 'crawler']], then: 'w6b' },
  { id: 'w6b', reinf: true, from: [{ kind: 'edge', dir: 1 }, { kind: 'edge', dir: -1 }],
    roster: [[], [], ['shiv', 'lineman'], ['shiv', 'lineman', 'shiv']] },
  { id: 'w7', at: 1436, after: ['w6', 'w6b'], far: true, line: 'Let the freight eat him!', from: [{ kind: 'ledge', x: 1500 }, { kind: 'ledge', x: 1560 }, { kind: 'ledge', x: 1600 }, { kind: 'edge', dir: 1 }],
    roster: [['ratcatcher', 'flare', 'shiv'], ['ratcatcher', 'flare', 'shiv', 'shiv'], ['ratcatcher', 'flare', 'shiv', 'shiv', 'shiv', 'shiv'], ['ratcatcher', 'flare', 'ratcatcher', 'shiv', 'flare', 'shiv', 'shiv']] },
  { id: 'w9', at: 1890, ckptAt: 1660, after: 'w7', from: [{ kind: 'edge', dir: 1 }, { kind: 'ledge', x: 2010 }, { kind: 'edge', dir: 1 }, { kind: 'edge', dir: -1 }],
    roster: [['shiv', 'ratcatcher', 'lineman', 'shiv'], ['shiv', 'ratcatcher', 'lineman', 'shiv', 'lineman'], ['shiv', 'ratcatcher', 'lineman', 'shiv', 'lineman', 'shiv'], ['shiv', 'ratcatcher', 'lineman', 'shiv', 'lineman', 'shiv', 'ratcatcher', 'shiv']], then: 'w9b' },
  { id: 'w9b', reinf: true, from: [{ kind: 'edge', dir: 1 }, { kind: 'edge', dir: -1 }],
    roster: [[], [], ['lineman', 'shiv'], ['lineman', 'shiv', 'shiv']] },
];
// drops (docs/drops.md): a Rat leaves the hero weapon that stands for his own; the tier opens by his wave.
// Melee only on the platform; the shotgun from the tunnel (the boarded niche holds one), the machine gun from the freight beat
export const DROPS = {
  carry: { knife: ['katana'], hook: ['katana'], pipe: ['axe'], wrench: ['axe'], pistol: ['shotgun'], flaregun: ['shotgun'] },
  tier: { w2: ['katana', 'axe'], w3: ['katana', 'axe'], w4: ['katana', 'axe'], w4b: ['katana', 'axe'], w6: ['katana', 'axe', 'shotgun'], w6b: ['katana', 'axe', 'shotgun'],
    w7: ['katana', 'axe', 'shotgun', 'mg'], w9: ['katana', 'axe', 'shotgun', 'mg'], w9b: ['katana', 'axe', 'shotgun', 'mg'], tinder: ['katana', 'axe', 'shotgun'], arena: ['katana', 'axe', 'shotgun', 'mg'] },
};

// ---- trains (the shared hazard): cars and their lengths (px); the cue chain before every train (s before it arrives) ----
export const CAR = { loco: { len: 64, h: 70 }, box: { len: 56, h: 66 }, flat: { len: 50, h: 24 }, tank: { len: 52, h: 58 }, empty: { len: 56, h: 64 } };
export const CUES = { nero: 5, hum: 3.5, horn: 2.5, beam: 1.2 };
export const TRAIN_DMG = [30, 50, 70, 80];
export const TRAINS = {
  T1: { track: 1, from: 1, cars: ['loco', 'box', 'box', 'box'], v: 220, gap: 4 },
  T2: { track: 1, from: -1, cars: ['loco', 'box', 'box', 'flat', 'box'], v: 240, gap: 4 },
  T3: { track: 2, from: 1, cars: ['loco', 'box', 'flat', 'box', 'box', 'flat', 'box', 'box', 'box'], v: 160, gap: 40 },
  J1: { track: 1, from: 1, cars: ['loco', 'box', 'box', 'box'], v: 230, gap: 4 },
  J2: { track: 2, from: -1, cars: ['loco', 'box', 'flat', 'box'], v: 230, gap: 10 },
  F2310: { track: 1, from: 1, cars: ['loco', 'box', 'box', 'tank', 'box', 'flat', 'box', 'box', 'tank', 'box', 'box', 'box'], v: 160, gap: 4 },
  EMPTY: { track: 1, from: 1, cars: ['loco', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'], v: 170, gap: 4 },
};
// the dive through a gap of a passing freight on track 2 (↑ + Space, or Space in a jump): a gap this close is lined up; the slow motion
export const DIVE = { magnet: 60, t: 0.55, slow: 2.4, aim: 4 };

// fire (the oil slick, the fuel pool, a fire bottle's patch)
export const FIRE = { spread: 300, burn: [6, 5, 5, 4], goonDps: 25, heroDps: [10, 14, 18, 22], pool: 4, patch: 3, patchW: 40 };
// the third rail and the live wet zone: shock damage and the stun (s) by difficulty; the phase 1 cycle (s)
export const RAIL = { dmg: [8, 12, 16, 20], stun: [0.4, 0.6, 0.7, 0.8], live: 2, dead: 1.5, crackle: 0.5 };
// Nero: the hold's cooldown (s) by difficulty, how long he pins a goon
export const NERO = { holdCd: [15, 20, 20, 25], hold: 3, holdR: 120, bark: 140, warn: 5 };
