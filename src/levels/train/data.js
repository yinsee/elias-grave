// Level 7, "The Last Train" (docs/levels/07-last-train.md): the level's data. Level id `train`.
// The plan's 3600 px strip is folded into the engine's 2800 x 320 world, as Pier 9, Line Zero and St. Cecilia fold theirs. Each car
// is a camera group; walls (the car ends) part them; doors, the roof hatch, the window and the ladders (↑ by one) join them. The boss
// roof is the game's "club" (x 2436-2800). The workshop (the last car's inside) sits before the club wall: after the boss the hero
// goes through the last car's door and the level leaves the club for it.
//   roof_front 0-300 · baggage 308-556 · dining 564-880 · sleepers 888-1140 · roof_mid 1148-1750 · dome 1758-2040 · vault 2048-2200
//   workshop 2208-2414 · roof_boss (club) 2436-2800
// The strip's x grows toward the REAR of the train; the train runs toward -x, so the backdrop scrolls toward +x and the wind blows +x.
// All arrays "by difficulty" are [Easy, Medium, Hard, Wicked].

export const GROUND = 280;
const hy = h => GROUND - h;

// ---- the map ----
// out: outdoors (rain, wind, sweepers); amb: ambient [r, g, b]; g: the camera group; win: window rects [x0, x1, y0, y1] (the scroll
// shows through them); flash: lightning every [a, b] s
export const SECTIONS = [
  { id: 'roof_front', x0: -99, x1: 304, out: true, amb: [0.4, 0.44, 0.62], g: 0, flash: [6, 10] },
  { id: 'baggage', x0: 304, x1: 560, amb: [0.42, 0.4, 0.36], g: 1, flash: [8, 12] },
  { id: 'dining', x0: 560, x1: 884, amb: [0.42, 0.33, 0.25], g: 2, flash: [8, 12] },
  { id: 'sleepers', x0: 884, x1: 1144, amb: [0.28, 0.32, 0.45], g: 3, flash: [8, 12] },
  { id: 'roof_mid', x0: 1144, x1: 1754, out: true, amb: [0.38, 0.42, 0.6], g: 4, flash: [5, 9] },
  { id: 'dome', x0: 1754, x1: 2044, amb: [0.36, 0.4, 0.52], g: 5, flash: [5, 9], glass: true },
  { id: 'vault', x0: 2044, x1: 2204, amb: [0.3, 0.4, 0.32], g: 6, flash: null },
  { id: 'workshop', x0: 2204, x1: 2420, amb: [0.62, 0.48, 0.32], g: 7, flash: null },
  { id: 'roof_boss', x0: 2420, x1: 2900, out: true, amb: [0.38, 0.42, 0.6], g: 8, flash: [6, 10] },
];
export const GROUPS = [[0, 300], [308, 556], [564, 880], [888, 1140], [1148, 1750], [1758, 2040], [2048, 2200], [2208, 2414], [2436, 2800]];
export const CEIL = hy(100);   // interiors: the car's ceiling (y 180)
export const ROOF_Y = GROUND;  // roofs: the roof surface is the floor line

// roof_front: the locomotive's tender (a wall), the vents, the hatch into the baggage car
export const TENDER = 18;
export const HATCH = 284;
// baggage: the open side door (an eject zone in the front lane), the axe bracket, the crate mezzanine, the gangway door
export const SIDE_DOOR = { x0: 424, x1: 462 };
export const CRATE_DECK = { x0: 494, x1: 546, y: hy(40) };
export const BAG_DOOR = 550;
// dining: the aisle, the chandeliers, six windows, the trolley, the galley (the cleaver rack, the steam valve), the galley door
export const CHANDELIERS = [640, 712, 784];
export const CHAND_Y = 196;
export const DIN_WIN = [596, 640, 684, 728, 772, 816];   // window centres (24 px wide, y 214-246)
export const GALLEY = { x0: 806, x1: 880 };
export const STEAM = { x: 864, y: hy(30) };
export const DIN_DOOR = 874;
export const TABLES = [{ x0: 604, x1: 628 }, { x0: 676, x1: 700 }, { x0: 748, x1: 772 }];
export const TABLE_TOP = hy(16);
// sleepers: the corridor, six compartment doors (wall lane), the Gunner's luggage trolley, the emergency cabinet, the end window
export const COMPS = [912, 948, 984, 1020, 1056, 1092];
export const NERO_COMP = 984;      // Nero scratches at compartment 3: a bandage and a Choir coin inside
export const TROLLEY = { x0: 1098, x1: 1112, top: hy(18) };
export const END_WIN = 1132;
// roof_mid: two sleeper roofs, the fixed car gap, the coupling, the tail stub (a mover)
export const CARA = { x0: 1150, x1: 1368 };
export const GAP1 = { x0: 1368, x1: 1396 };
export const CARB = { x0: 1396, x1: 1540 };
export const STUB = { x0: 1560, w: 84, gap0: 20, gapMax: [100, 120, 120, 120], t: [6, 5, 5, 5] };   // its front edge at CARB.x1 + gap
export const LADDERS_MID = [1364, 1400, 1536];
export const DECOUPLE_AT = 1500;
// dome: twelve glass panes overhead, the bar (the Board behind it), Bell & Sons clock, the rear door
export const DOME_PANES = Array.from({ length: 12 }, (_, i) => ({ id: 'dome' + i, x0: 1766 + i * 22, x1: 1784 + i * 22, y0: 150, y1: 172, hp: 15 }));
export const BAR = { x0: 1966, x1: 2026, top: hy(26) };
export const BOARD = [{ id: 'mayor', x: 1978 }, { id: 'kern', x: 1996 }, { id: 'aldane', x: 2014 }];
export const DOME_CLOCK = { x: 1996, y: 196 };
export const DOME_DOOR = 2034;
export const GRAU_ARENA = { x0: 1764, x1: 2034 };
// vault: the safe (the ledger), the katana stand, the shotgun rack, the ladder up
export const SAFE = { x: 2124, y: hy(40) };
export const VAULT_CLOCK = { x: 2124, y: hy(58) };
export const VAULT_LADDER = 2192;
// the workshop: the bench, the clocks, the gramophone (a tripwire), the window on the valley
export const WORK_IN = 2226;
export const GRAMO = { x: 2338, trip: 2318 };
export const BENCH = { x0: 2280, x1: 2380, top: hy(30) };
// roof_boss (the club): the vault roof, the gangway plate, the last car (a mover in phase 3), the lantern and the metronome, the rear
// platform and the brake wheel, the ladders (crew)
export const ARENA = { x0: 2442, x1: 2790 };
export const VROOF = { x0: 2436, x1: 2560 };
export const PLATE = { x0: 2560, x1: 2590 };
export const LAST = { x1: 2752, gap: [[30, 80], [30, 100], [30, 110], [30, 120]] };   // phase 3: front edge at VROOF.x1 + gap
export const LANTERN = { x: 2724, y: hy(18) };
export const PLATFORM = { x0: 2752, x1: 2790 };
export const BRAKE = 2770;
export const REAR_DOOR = 2758;
export const BOSS_LADDERS = [2446, 2786];
export const BOSS_VENTS = [2490, 2536];

// cover: low props that stop shots at their height (crouch behind one)
export const COVER = [
  { x0: 116, x1: 130, top: hy(14) }, { x0: 216, x1: 230, top: hy(14) },
  { x0: 1256, x1: 1270, top: hy(14) }, { x0: 1466, x1: 1480, top: hy(14) },
  { x0: 2484, x1: 2498, top: hy(14) }, { x0: 2530, x1: 2544, top: hy(14) },
  { x0: TROLLEY.x0, x1: TROLLEY.x1, top: TROLLEY.top },
];

// ---- surfaces (ledges: the back lane) ----
export function surfaces() {
  return [
    { ...CRATE_DECK, oneWay: true },
    ...TABLES.map(t => ({ x0: t.x0, x1: t.x1, y: TABLE_TOP, oneWay: true })),
    { x0: TROLLEY.x0, x1: TROLLEY.x1, y: TROLLEY.top },
    { x0: BAR.x0, x1: BAR.x1, y: BAR.top },
    { x0: BENCH.x0, x1: BENCH.x1, y: BENCH.top, oneWay: true },
  ];
}

// ---- props and pickups ----
// crate: a crate; bigcrate: an iron ledger box (heavy: 30 dmg thrown); bag: a mail sack; bottle; chair: an armchair, the dessert
// trolley (it rolls); barrel: a galley pot; can: the coal shovel's coal
export const OBJ_START = [
  ['can', 34, GROUND], ['can', 40, GROUND],
  ['bag', 330, GROUND], ['bag', 360, GROUND], ['bag', 404, GROUND], ['crate', 480, GROUND], ['crate', 500, GROUND], ['bigcrate', 520, GROUND],
  ['bigcrate', 392, GROUND], ['crate', 510, CRATE_DECK.y], ['bigcrate', 538, GROUND],
  ['bottle', 612, TABLE_TOP], ['bottle', 620, TABLE_TOP], ['bottle', 684, TABLE_TOP], ['bottle', 692, TABLE_TOP], ['bottle', 756, TABLE_TOP], ['chair', 712, GROUND],
  ['barrel', 826, GROUND], ['knife', 840, GROUND], ['bottle', 800, GROUND],
  ['bag', 930, GROUND], ['crate', 1000, GROUND], ['bag', 1040, GROUND],
  ['chair', 1790, GROUND], ['chair', 1850, GROUND], ['chair', 1910, GROUND], ['bottle', 1972, BAR.top], ['bottle', 2010, BAR.top],
];
// weapons on racks: w = 1 katana, 2 axe, 3 shotgun, 4 machine gun. hidden: until a flag of the run clears it
export const PICKUPS = [
  { w: 2, x: 372, rack: true },                 // the fire axe on its bracket ("In case of fire")
  { w: 1, x: 846, rack: true },                 // the galley's cleaver rack (the katana stands in for the long cleaver)
  { w: 3, x: 1126, rack: true },                // the conductor's emergency cabinet
  { w: 3, x: 1508, hidden: 'noShotgun' },       // a second shotgun on sleeper B's roof, only if he has none
  { w: 1, x: 2096, rack: true },                // the Choir's ceremonial blade on its stand
  { w: 3, x: 2172, rack: true },                // the vault's wall rack
];
// small things of the level's own: walk over them (band/ammo: the engine's boxes; key, ledger, coin: objectives)
export const ITEMS = [
  { id: 'band1', x: 336, band: true, diff: [0, 1] }, { id: 'ammo1', x: 532, ammo: true },
  { id: 'ammo2', x: 800, ammo: true }, { id: 'band2', x: 872, band: true },
  { id: 'ammo3', x: 1118, ammo: true },
  { id: 'ammo4', x: 1474, ammo: true },
  { id: 'band3', x: 1772, band: true },
  { id: 'band4', x: 2060, band: true }, { id: 'band5', x: 2186, band: true }, { id: 'ammo5', x: 2080, ammo: true }, { id: 'ammo6', x: 2150, ammo: true },
];
export const KEY = { x: 1990, y: BAR.top };     // the vault key Aldane slides across the bar
export const LEDGER = { x: SAFE.x, y: GROUND }; // the Silent Night ledger in the open safe

// ---- the Ushers (docs/levels/07-last-train.md 4) ----
// looks: src/sim/enemies/roster.js LOOK format
export const LOOKS = {
  usher: { build: 'lean', top: 'coat', hair: ['short'], beards: ['none', 'stache'], cols: [['#7a7e86', '#5c6068']], pants: ['#5a5e66'], boots: '#141418' },
  roofUsher: { build: 'lean', top: 'coat', hair: ['cap'], beards: ['none', 'stubble'], cols: [['#6a6e76', '#4e525a']], pants: ['#4a4e56'], hairC: '#2a2c30', boots: '#141418' },
  gunner: { build: 'stocky', top: 'vest', hair: ['short', 'bald'], beards: ['stubble', 'full'], cols: [['#80848c', '#60646c']], pants: ['#4a4e56'], boots: '#141418' },
  doorman: { build: 'buff', top: 'coat', hair: ['bald', 'short'], beards: ['none', 'stache'], cols: [['#8a8e96', '#6a6e76']], pants: ['#5a5e66'], boots: '#141418' },
  steward: { build: 'lean', top: 'jacket', hair: ['short'], beards: ['none', 'stache'], cols: [['#e8e4da', '#c4c0b6']], pants: ['#5a5e66'], boots: '#141418' },
  grau: { build: 'buff', top: 'coat', hair: ['short'], beards: ['full'], cols: [['#70747c', '#54585e']], pants: ['#4a4e56'], hairC: '#b0b0a8', boots: '#141418' },
  lenz: { build: 'tall', top: 'coat', hair: ['short'], beards: ['none'], cols: [['#e6e4dc', '#c2c0b8']], pants: ['#d8d6ce'], hairC: '#d8c890', boots: '#e8e4d8', skin: ['#ecd6c4', '#c8b09c'] },
};
// variant -> base role and look; the behaviour row (each one needs a different answer):
//   usher: paired shots from 75-135 px; a vent between you and him stops his shots          -> crouch behind cover, then close in
//   gunner: plants his feet (1.2 s drum rattle, a red stripe down the lane), a 10-round sweep low to high, then 2.2 s reload
//            -> a heavy blow or a thrown thing in the wind-up cancels it; roll through the sweep; punish the reload
//   doorman: a reach for a bear hug, then he throws you down; near the open side door he throws you out of it (you catch the frame)
//            -> dodge the reach; do not fight with your back to the door
//   steward: quick knife lunges (dining car and galley only)                                  -> spacing; hit him after the lunge
//   plates: a Steward who throws plates (8 dmg, they break)                                   -> close in; plates break on any blow
//   roofUsher: climbs the car-end ladders; ducks gantries by chance (E 40 %, M 60 %, H 80 %, W 95 %) -> knock him into a gantry's path
export const USHERS = {
  usher: { role: 'pistol', look: 'usher', type: 'Usher', weapon: 'pistol', pair: true, drop: 0.15 },
  roofUsher: { role: 'pistol', look: 'roofUsher', type: 'Usher', weapon: 'pistol', pair: true, roof: true, drop: 0.15 },
  gunner: { role: 'pistol', look: 'gunner', type: 'Gunner', weapon: 'pistol', R: { w: 'pistol', len: 9, ranged: [110, 200] }, gunner: true, hpK: 1.4, spdK: 0.6 },
  doorman: { role: 'brawler', look: 'doorman', type: 'Doorman', weapon: null, hpK: 1.5, grab: { windup: 0.55, cd: [3.5, 5], reach: 22, dmg: 14, door: 15 } },
  steward: { role: 'knife', look: 'steward', type: 'Steward', weapon: 'knife', spdK: 1.15 },
  plates: { role: 'thrower', look: 'steward', type: 'Steward', weapon: 'tknife', plate: true, shot: 8 },
};
export const NAMES = ['Brandt', 'Keller', 'Novak', 'Halm', 'Ostrander', 'Weil', 'Fenn', 'Rask', 'Lund', 'Marr', 'Sieber', 'Tamm', 'Voss', 'Arden', 'Kohl', 'Prell'];
export const LINES = ['Sandman. Car two.', "He's on the roof.", 'Seat him.', 'Members only.', 'The Board is not receiving.'];
// the Gunner's burst (docs 4.1): wind-up by difficulty, rounds, length, damage, the reload
export const GUN = { windup: [1.6, 1.2, 1.2, 1.0], n: 10, t: 1.0, dmg: 7, reload: 2.2, cd: [3, 5], v: 300 };
// fire tokens (docs 4.2 rule 1): ranged enemies that may fire in the same 1 s window; a Gunner costs 2
export const TOKENS = [1, 2, 3, 4];
// goons on a ledge (the crate mezzanine, the bar, a trolley) come down (the ledge rule): a melee goon after 1.5 s, a shooter after 3
// shots or 8 s, anyone at once when hit or when the hero climbs up
export const PERCH = { throws: 3, time: 8, melee: 1.5 };

// waves: roster by difficulty; from: spawn sources ({ kind: 'door' x | 'comp' (a compartment) | 'ladder' x | 'placed' x | 'seat' x |
// 'edge' dir }); a source is used in turn. reinf: more on Hard and Wicked when half are down
export const WAVES = {
  r1: { from: [{ kind: 'ladder', x: 260 }, { kind: 'ladder', x: 180 }, { kind: 'ladder', x: 290 }], roster: [['roofUsher'], ['roofUsher', 'roofUsher'], ['roofUsher', 'roofUsher'], ['roofUsher', 'roofUsher', 'roofUsher', 'doorman']] },
  b1: { from: [{ kind: 'placed', x: 420 }, { kind: 'placed', x: 470 }, { kind: 'placed', x: 520 }, { kind: 'placed', x: 540 }], roster: [['doorman', 'usher'], ['doorman', 'doorman', 'usher'], ['doorman', 'doorman', 'usher', 'usher'], ['doorman', 'doorman', 'usher', 'usher']], then: 'b2' },
  b2: { reinf: true, half: true, from: [{ kind: 'door', x: BAG_DOOR }], roster: [['doorman'], ['usher'], ['usher', 'doorman'], ['usher', 'usher', 'doorman']] },
  d1: { seated: true, from: [{ kind: 'seat', x: 616 }, { kind: 'seat', x: 664 }, { kind: 'seat', x: 712 }, { kind: 'seat', x: 742 }, { kind: 'seat', x: 690 }, { kind: 'seat', x: 790 }],
    roster: [['usher', 'usher', 'usher'], ['usher', 'usher', 'usher', 'usher'], ['usher', 'usher', 'usher', 'usher', 'usher'], ['usher', 'usher', 'usher', 'usher', 'usher', 'usher']] },
  d2: { from: [{ kind: 'door', x: DIN_DOOR }], roster: [['steward'], ['steward', 'steward'], ['steward', 'steward', 'plates'], ['steward', 'steward', 'steward', 'plates']] },
  s1: { from: [{ kind: 'placed', x: 1120 }], roster: [['gunner'], ['gunner'], ['gunner'], ['gunner']] },
  s2: { from: [{ kind: 'comp' }], roster: [['usher', 'usher'], ['usher', 'usher', 'doorman'], ['usher', 'usher', 'usher', 'doorman'], ['usher', 'usher', 'usher', 'doorman', 'doorman']] },
  s3: { from: [{ kind: 'door', x: 1092 }], roster: [[], [], [], ['gunner']] },
  rm1: { from: [{ kind: 'ladder', x: 1364 }, { kind: 'ladder', x: 1400 }, { kind: 'ladder', x: 1536 }, { kind: 'placed', x: 1520 }],
    roster: [['roofUsher', 'roofUsher'], ['roofUsher', 'roofUsher', 'roofUsher', 'gunner'], ['roofUsher', 'roofUsher', 'roofUsher', 'roofUsher', 'gunner', 'doorman'], ['roofUsher', 'roofUsher', 'roofUsher', 'roofUsher', 'roofUsher', 'gunner', 'doorman']], then: 'rm2' },
  rm2: { reinf: true, half: true, from: [{ kind: 'ladder', x: 1364 }, { kind: 'ladder', x: 1400 }], roster: [[], [], ['roofUsher'], ['roofUsher', 'doorman']] },
  cut: { stub: true, roster: [['roofUsher', 'roofUsher'], ['roofUsher', 'roofUsher'], ['roofUsher', 'roofUsher', 'gunner'], ['roofUsher', 'roofUsher', 'roofUsher', 'gunner']] },
  gcrew: { from: [{ kind: 'door', x: DOME_DOOR }], roster: [[], [], [], []] },   // Grau's crew (the run sends them: every 8 s, alive by difficulty)
  lcrew: { from: [{ kind: 'ladder', x: 2446 }, { kind: 'ladder', x: 2786 }], roster: [[], [], [], []] },   // Lenz's stragglers (phase 2)
};
export const GRAU_CREW = { every: 8, alive: [1, 2, 2, 3], max: 8 };
export const LENZ_CREW = { bars: 4, alive: [0, 1, 2, 2], max: 6 };
// drops (docs/drops.md): an Usher's pistol stands for the shotgun; a Gunner always leaves his machine gun (the run drops it)
export const DROPS = {
  carry: { pistol: ['shotgun'] },
  tier: { b1: ['axe'], b2: ['axe'], d1: ['shotgun'], d2: ['katana'], s2: ['shotgun', 'mg'], rm1: ['shotgun', 'mg'], rm2: ['shotgun', 'mg'], cut: ['shotgun', 'mg'], gcrew: ['shotgun', 'mg'], lcrew: ['shotgun', 'katana'] },
};

// ---- the train ----
// speed: the near layer's scroll (px/s); joint: a rail-joint clack each s; lurch: every [a, b] s indoors, loose things slide +x
export const TRAIN = { speed: 600, joint: 0.43, lurch: { every: [25, 40], push: [12, 20] }, brake: 6, bossSpeed: [690, 690, 780] };
// sweepers: gantries (a steel beam at y 236-262, it sweeps the roof toward +x at the scroll speed) and tunnels (a low ceiling for
// `len` s). warn: the signal bell (gantry) or the whistle (tunnel) that long before; at: s after the section starts (after: after
// another one passed)
export const SWEEP = {
  gantry: { band: [236, 262], dmg: 14, warn: 1.5 },
  tunnel: { ceil: 250, dmg: 10, warn: 1.5, every: 1.0 },
  duck: [0.4, 0.6, 0.8, 0.95],   // a goon's chance to duck one
  roof_front: [{ kind: 'gantry', at: 6 }, { kind: 'gantry', at: 20 }],
  roof_mid: [{ kind: 'tunnel', at: 3, len: 3.5 }, { kind: 'gantry', at: 18.5 }, { kind: 'gantry', at: 32.5 }, { kind: 'gantry', at: 48 }],
  dining: [{ kind: 'dark', at: 40, len: 2.5 }],
};
// the wind on the roofs: a steady push toward +x, gusts (a howl 0.8 s first) double it
export const WIND = { push: 10, gust: 26, every: [6, 10], warn: 0.8, t: 1.5 };
// falls: a gap in the roof. Easy and Medium: damage and back to the near edge; Hard and Wicked: the last checkpoint
export const FALL = { dmg: [30, 30, 35, 35], perma: [false, false, true, true] };   // perma (Hard, Wicked): the game's fall rule (G.fallOut)
// the dining car's slow motion (s of sim time) and the leap's
export const SLOW = { aisle: 1.6, leap: 1.2, landing: 0.6 };
// lightning: the flash and its afterglow; thunder comes 0.3-2 s after
export const LIGHTNING = { flash: 0.15, glow: 0.6, thunder: [0.3, 2] };
// the chandelier: a shot or a thrown thing drops it (25 dmg and a knock-down within 20 px); the steam valve (a blow): a 2 s jet
export const CHAND = { r: 20, dmg: 25 };
export const STEAM_JET = { t: 2, tick: 0.25, dmg: 6, len: 40 };
// dome glass: a broken pane drops shards (a 0.5 s floor ring, 6 dmg); rising shots break panes
export const SHARDS = { warn: 0.5, dmg: 6, r: 12 };
