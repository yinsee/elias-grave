// Level 4, "The Leviathan" (docs/levels/04-leviathan.md): the level's data. Level id `aquarium`.
// The plan's 3600 px strip is folded into the engine's 2800 x 320 world, as Pier 9 and Line Zero fold theirs: the boss arena (the
// glass shark tunnel and the catwalks over the Ocean Tank) sits where the club is (x 2436-2800), behind the watertight door at the
// street's end wall (x 2414).
//   lobby 0-466 · reef 466-1062 · jelly 1062-1458 · pumps 1462-1884 · dock 1884-2414 (Teague's arena: the dock floor) · tunnel 2436-2800
// All arrays "by difficulty" are [Easy, Medium, Hard, Wicked].

export const GROUND = 280, W = 2800;
const hy = h => GROUND - h;

// ---- the map ----
export const SECTIONS = [   // amb: the ambient light [r, g, b]; red: after a flood the room's lamps go red
  { id: 'lobby', name: 'The lobby', x0: -99, x1: 466, amb: [0.34, 0.38, 0.5] },
  { id: 'reef', name: 'The reef gallery', x0: 466, x1: 1062, amb: [0.28, 0.42, 0.58] },
  { id: 'jelly', name: 'The jellyfish rotunda', x0: 1062, x1: 1460, amb: [0.22, 0.17, 0.34], red: [0.42, 0.2, 0.22] },
  { id: 'pumps', name: 'The pump hall', x0: 1460, x1: 1886, amb: [0.3, 0.38, 0.32] },
  { id: 'dock', name: "Kalt's dock", x0: 1886, x1: 2430, amb: [0.42, 0.35, 0.28] },
  { id: 'tunnel', name: 'The shark tunnel', x0: 2430, x1: 2900, amb: [0.2, 0.32, 0.52], top: [0.3, 0.38, 0.5] },
];
export const START_X = 40;
// doors the hero cannot pass while they are shut (x; y1: they block only below this line: the pump hall's shutter leaves the hatch open)
export const DOORS = {
  reef: { x: 466 },             // the staff door out of the gift shop: open when the gift-shop wave is down
  jellyL: { x: 1064 },          // the rotunda's left door: open when the divers of the big tank are down; shut behind him in the rotunda
  jellyR: { x: 1456 },          // its right door: open after the bloom
  pumpIn: { x: 1464 },          // the stair door into the pump hall: shut behind him
  shutter: { x: 1884, y1: 140 },// the steel shutter to the dock: the only way on is the hatch over it (y <= 140)
  dock: { x: 2414 },            // the watertight door to the shark tunnel: open when Teague is down (then a walk through it is the club door)
};
// ---- the lobby ----
export const KIOSK = { x0: 96, x1: 132 };                   // the snack kiosk (cans and bottles)
export const BENCH_K = { x: 70 };                           // the bench with the katana in its glass case
export const TURNSTILES = [150, 166, 182];
export const PAYPHONE = { x: 232, y: hy(50) };
export const SHELVES = { x0: 296, x1: 370 };                // plush sharks and snow globes on the gift-shop shelves
export const COUNTER = { x0: 396, x1: 456, y: hy(30) };     // the gift-shop counter (its top is a ledge)
export const WHALE = { x0: 40, x1: 380, y: 64 };            // the whale skeleton hanging from the ceiling
export const SKYLIGHT = { x0: 120, x1: 340, y: 18 };
// ---- the reef gallery ----
export const GANTRY = { x0: 560, x1: 846, y: hy(112) };     // the maintenance gantry over the wall tanks (one-way)
export const STEP_HI = { x0: 846, x1: 868, y: hy(74) };     // crates stacked by the big tank: the way up to the gantry
export const STEP_LO = { x0: 868, x1: 892, y: hy(40) };
export const DEAD_GUARD = 742;                               // a dead guard with a machine gun in his hand
// ---- the rotunda ----
export const CYL = { x: 1260, x0: 1240, x1: 1280, y0: 104 };// the moon-jelly cylinder (floor to ceiling)
export const BAL_L = { x0: 1080, x1: 1160, y: hy(62) };     // balconies (the back lane)
export const BAL_R = { x0: 1360, x1: 1440, y: hy(62) };
export const BENCHES = [1196, 1324];
// ---- the pump hall ----
export const SEA_GATE = 1474;
export const FILT = [{ x0: 1500, x1: 1550, y: hy(54) }, { x0: 1580, x1: 1630, y: hy(54) }];
export const RACK = { x0: 1650, x1: 1772, y: hy(96) };
export const PGANTRY = { x0: 1760, x1: 1886, y: hy(144) };  // the gantry and the hatch at its end (on through the wall into the dive locker)
export const JBOX = { x: 1702, y: 240 };                    // the electric junction box (it sparks when the water reaches it)
export const PORTHOLE = { x: 1590, y: 150 };
export const PUMP = { x0: 1462, x1: 1884, stages: [{ to: 250, v: 20, at: 3 }, { to: 200, v: 12, hold: 20 }, { to: 128, v: [4, 5, 6, 7], hold: 20 }] };
// ---- the dock ----
export const MEZZ = { x0: 1886, x1: 2010, y: hy(144) };     // the dive locker on its mezzanine (the hatch leads straight onto it)
export const MANIFEST = { x: 1984 };                         // the waterproof manifest on the desk (stand by it)
export const CHANNEL = { x0: 2140, x1: 2232 };              // the sea channel (deep water at the dock floor)
export const BOAT = { x0: 2146, x1: 2226, y: hy(18) };      // the moored boat's deck
export const DOCK_CRATES = { x0: 2280, x1: 2312, y: hy(36) };
export const HOIST = { x0: 2070, x1: 2330, y: 108, box: 2050, T: 8, w: 40, dmg: 40, back: 6 };   // the cargo hoist: a pallet on a loop; a heavy blow on its control box drops it
export const TEAGUE_ARENA = { x0: 1890, x1: 2410 };
// ---- the shark tunnel (the club: x 2436-2800) ----
export const TUN = { x0: 2440, x1: 2796, roofY: 192, roofB: 204, tankY: 112 };   // the tunnel; its glass roof; the tank's surface over it
export const ROOF = [0, 1, 2, 3, 4].map(i => ({ id: `t${i + 1}`, x0: 2452 + i * 68, x1: 2520 + i * 68 }));
export const SHAFT = { x: 2786, top: hy(184) };              // the service shaft's ladder (locked in phase 1), up to the feeding platform
export const CLOCK = { x: 2766, y: 226 };                    // Bell & Sons, stopped at 3:17
export const CATWALKS = [   // y 96; B and C hang on two chains each (a shot chain drops the section)
  { id: 'cwA', x0: 2440, x1: 2520, y: hy(184) },
  { id: 'cwB', x0: 2540, x1: 2620, y: hy(184), chains: [2546, 2614] },
  { id: 'cwC', x0: 2640, x1: 2720, y: hy(184), chains: [2646, 2714] },
  { id: 'cwD', x0: 2740, x1: 2800, y: hy(184) },
];
export const TANK_FLOOR = 128;                               // in phases 2-3 a swimmer treads water here (feet), head and shoulders over the surface (y 112)
export const TANK_LADDERS = [2450, 2680, 2756];              // ladders out of the water onto cwA, cwC, cwD
export const CRANE = { y: 24, x0: 2520, x1: 2740, T: 6, cageY: 74 };
export const ENTRY = 2450;                                    // the entry bulkhead: the boss's crew comes through it

// ---- surfaces (ledges; all one-way: a body comes up through one from below) ----
export function surfaces() {
  return [
    { ...COUNTER }, { ...GANTRY }, { ...STEP_HI }, { ...STEP_LO },
    { ...BAL_L, back: true }, { ...BAL_R, back: true },
    { ...FILT[0] }, { ...FILT[1] }, { ...RACK }, { ...PGANTRY },
    { ...MEZZ }, { ...BOAT }, { ...DOCK_CRATES },
    ...CATWALKS.map(c => ({ x0: c.x0, x1: c.x1, y: c.y })),
  ];
}

// ladders: ↑ by one climbs it (x; from the floor y1 up to the top y0); `lock`: shut until that flag
export const LADDERS = [
  { id: 'reef', x: 548, y0: GANTRY.y, y1: GROUND },
  { id: 'shaft', x: SHAFT.x, y0: hy(184), y1: GROUND, lock: 'hatch', club: true },
  ...TANK_LADDERS.map((x, i) => ({ id: 'tank' + i, x, y0: hy(184), y1: TANK_FLOOR, club: true, tank: true })),
];

// ---- glass: panes with crack stages (docs/levels/04-leviathan.md 8.1) ----
// hp; hpMin: a lock (it cannot go lower until a script arms it); leakAt: from this hp it leaks (a spray, a wet floor under it);
// onBreak: what breaking does ('flood': a burst wave, 'shards'); vol: the wave's size; fish: what swims in it
export const PANES = [
  { id: 'katanaCase', x0: 60, x1: 80, y0: hy(28), y1: hy(10), hp: 10, kind: 'case', onBreak: 'shards', hides: 'katana' },
  { id: 'lobbyTank', x0: 380, x1: 450, y0: 186, y1: 240, hp: 40, hpMin: 1, kind: 'tank', fish: 'reefSmall' },
  { id: 'case1', x0: 316, x1: 334, y0: hy(32), y1: hy(8), hp: 30, kind: 'case', onBreak: 'shards' },
  { id: 'case2', x0: 344, x1: 362, y0: hy(32), y1: hy(8), hp: 30, kind: 'case', onBreak: 'shards' },
  ...[0, 1, 2, 3].map(i => ({ id: `reef${i + 1}`, x0: 484 + i * 96, x1: 570 + i * 96, y0: 160, y1: 266, hp: 100, hpMin: 10, leakAt: 66, kind: 'tank', fish: 'reef' })),
  { id: 'reefBig', x0: 904, x1: 1044, y0: 150, y1: 270, hp: 60, hpMin: 1, kind: 'tank', onBreak: 'flood', vol: 'small', fish: 'reef', divers: 2 },
  { id: 'cylinder', x0: CYL.x0, x1: CYL.x1, y0: CYL.y0, y1: GROUND, hp: 120, hpMin: 30, kind: 'cyl', onBreak: 'flood', vol: 'large', fish: 'jelly' },
  ...[1180, 1214, 1306, 1340].map((x, i) => ({ id: `jcol${i + 1}`, x0: x - 8, x1: x + 8, y0: 196, y1: 268, hp: 40, kind: 'col', onBreak: 'shards', fish: 'jellySmall' })),
  ...ROOF.map(r => ({ id: r.id, x0: r.x0, x1: r.x1, y0: TUN.roofY, y1: TUN.roofB, hp: 100, leakAt: 66, kind: 'roof', onBreak: 'flood', club: true })),
];
// stage: 0 whole; 1 hairline (< 100 %); 2 spiderweb (<= 66 %: it leaks); 3 bulging (<= 33 %); 4 burst
export const paneStage = p => p.hp <= 0 ? 4 : p.hp <= p.max * 0.33 ? 3 : p.hp <= p.max * 0.66 ? 2 : p.hp < p.max ? 1 : 0;
export const GLASS = {
  wave: { small: { r: 140, v: 300, dmg: 10, t: 15 }, large: { r: 300, v: 380, dmg: 25, heroDmg: 15, safe: 120, t: 4 } },   // a burst wave (t: s the floor stays deep)
  leakW: [0, 0, 60, 90], wetF: 0.45,   // the wet zone under a leak, by stage; friction
  arm: { near: 160, goons: 3, fallback: 40 },   // the bloom: armed when j2 is out, the cylinder cracked to stage 2 and 3 goons are near it
  slowT: 1.8,                                     // the bloom's slow motion (real s)
  jelly: { n: [8, 9, 10, 10], sting: 4, kick: 6, life: 60 },
  roof: { harpoon: 34, pin: 50, shot: 10, mg: 3, thrown: 10, ram: 20 },   // damage to a tunnel roof pane by source
  column: { w: 60, dmg: 12, t: 1.2 },             // the water column out of a burst roof pane
};
// floor water after a burst (the depth over the floor, px) and how long it takes to drain
export const FLOODS = { reef: { x0: 900, x1: 1060, deep: 8, hold: 15 }, jelly: { x0: 1064, x1: 1456, deep: 14, hold: 4, then: [6, 16] } };

// ---- the Undertow (docs/levels/04-leviathan.md 4) ----
// looks: src/sim/enemies/roster.js LOOK format, plus hat / boots / apron / gear / skin
export const AQUA_LOOKS = {
  diverSuit: { build: 'lean', top: 'tank', hair: ['short', 'bald'], beards: ['none', 'stubble'], cols: [['#1c2026', '#121418']], pants: ['#15171b'], boots: '#0c0d10', hairC: '#1a1a1e', gear: 'mask' },   // a black wetsuit, the mask pushed up
  oilskinJ: { build: 'tall', top: 'coat', hair: ['cap'], beards: ['stubble', 'chin', 'none'], cols: [['#4a5236', '#363c27']], pants: ['#1c2026'], boots: '#141418', hairC: '#2a2a2e' },        // the harpooner: an olive oilskin over a wetsuit
  yellowCoat: { build: 'stocky', top: 'coat', hair: ['souwester', 'cap'], beards: ['full', 'stubble', 'chin'], cols: [['#d8b02a', '#a8841c']], pants: ['#2e3040'], boots: '#202024', hat: '#3a3a44' },   // the smuggler: a yellow oilskin, rubber boots, a wool cap
  bib: { build: 'stocky', top: 'tank', hair: ['bald', 'short'], beards: ['full', 'stubble'], cols: [['#5a4a36', '#433624']], pants: ['#2e3a44'], boots: '#1a1a1e', apron: '#2e3a44' },   // the hauler: bare forearms, an oilskin bib
  teague: { build: 'buff', top: 'jacket', hair: ['bald'], beards: ['none'], cols: [['#7a6644', '#5a4a30']], pants: ['#5a4a30'], boots: '#3a3a40', gear: 'helmet' },   // a canvas diving suit, lead boots, the brass helmet
  kalt: { build: 'tall', top: 'coat', hair: ['short'], beards: ['none'], cols: [['#2c302c', '#1c1f1c']], pants: ['#121418'], boots: '#0e0f12', hairC: '#c8bf9a' },   // a long open oilskin over a black wetsuit; grey-blonde hair slicked back
};
// variant -> base role and look; the behaviour row (each one needs a different answer):
//   smuggler: his machete rides through light hits (armor), but he slips on a wet floor (a 1.2 s fall)        -> fight him on the wet
//   diver: fast; he swims at full speed; in water knee-deep or more he dives for an ankle grab (a bubble trail, 0.6 s) -> keep out of deep water, or hit him in the trail
//   harpoon: one shot, a long glint, then a 2.4 s reload on one knee; a hit reels the hero in; a miss cracks the glass -> dodge the glint, rush the reload
//   hauler: lifts a crate, barrel or cash crate and throws it (22 dmg)                                      -> hit him while he carries it (he drops it), or clear the props
export const UNDERTOW = {
  smuggler: { role: 'machete', look: 'yellowCoat', type: 'Smuggler', weapon: 'machete', slip: true },
  hookman: { role: 'machete', look: 'yellowCoat', type: 'Smuggler', weapon: 'machete', slip: true, R: { w: 'gaff', len: 12, reach: 33 } },   // a boat hook: the same moves, 10 px more reach
  diver: { role: 'knife', look: 'diverSuit', type: 'Diver', weapon: 'knife', hpK: 0.9, spdK: 1.1, swim: true, grab: { r: 40, tell: 0.6, hold: [0.7, 1.0, 1.0, 1.2], dmg: 8, cd: 4, mash: 0.3 } },
  harpoon: { role: 'pistol', look: 'oilskinJ', type: 'Harpooner', weapon: 'pistol', R: { w: 'harpoon', len: 13, gun: true, aim: 0.7, ranged: [90, 190] }, proj: 'harpoon', clip: 1, reload: 2.4, perch: true, max: 2 },
  hauler: { role: 'brawler', look: 'bib', type: 'Hauler', weapon: null, hpK: 1.25, props: { near: [40, 140], seek: 200, cd: 5, aim: 0.6 }, max: 1 },
};
export const HARPOON = { v: [380, 420, 450, 480], arc: 0.07, dmg: 14, reel: 40, stagger: 0.4, aim: [0.9, 0.7, 0.6, 0.5], paneDmg: [25, 34] };
export const UNDERTOW_NAMES = ['Brine', 'Ketch', 'Halyard', 'Gaff', 'Mako', 'Skerry', 'Kelp', 'Barnacle', 'Fathom', 'Bilge', 'Sounder', 'Tarr', 'Wrack', 'Squall', 'Dory', 'Cutter', 'Jetsam', 'Shoal', 'Lugger', 'Riptide'];
export const BARKS = {   // faction whispers (the Sandman legend); a diver's line as he comes out of the water
  any: ["That's the Sandman.", "Kalt said he'd drown.", 'Keep him off the glass!'],
  diver: ["Water's ours."],
};

// waves: at (the hero's x), sec, after: waits for these waves to be down; from: spawn sources
//   { kind: 'pre' x (standing there, unaware until he is within `unaware` px or a fight breaks out), 'door' x (a lit staff door),
//   'edge' dir (off the view), 'ledge' x (a surface top: a harpooner's perch), 'water' x (a diver surfaces), 'pane' id (out of a burst pane) }
// roster by difficulty; ckpt: a checkpoint as it starts; script: started by the run, not by `at`
export const WAVES = [
  { id: 'l1', script: 'start', unaware: 140, from: [{ kind: 'pre', x: 236, line: '...the Sandman. Here. Tell Kalt.' }, { kind: 'pre', x: 288 }, { kind: 'pre', x: 330 }],
    roster: [['smuggler'], ['smuggler', 'smuggler'], ['smuggler', 'smuggler'], ['smuggler', 'smuggler', 'diver']] },
  { id: 'l2', at: 300, from: [{ kind: 'door', x: 458 }, { kind: 'edge', dir: -1 }, { kind: 'door', x: 458 }, { kind: 'door', x: 458 }, { kind: 'edge', dir: -1 }, { kind: 'door', x: 458 }],
    roster: [['smuggler', 'diver', 'smuggler'], ['smuggler', 'diver', 'smuggler', 'diver'], ['smuggler', 'diver', 'hauler', 'smuggler', 'diver'], ['smuggler', 'diver', 'hauler', 'smuggler', 'diver', 'hookman']] },
  { id: 'r1', at: 480, ckpt: 'the reef gallery', from: [{ kind: 'ledge', x: 800 }], roster: [['harpoon'], ['harpoon'], ['harpoon'], ['harpoon']] },
  { id: 'r2', at: 540, from: [{ kind: 'edge', dir: 1 }, { kind: 'door', x: 474 }, { kind: 'edge', dir: 1 }, { kind: 'door', x: 474 }, { kind: 'edge', dir: 1 }],
    roster: [['smuggler', 'diver'], ['smuggler', 'diver', 'hookman'], ['smuggler', 'diver', 'smuggler', 'diver'], ['smuggler', 'diver', 'hookman', 'diver', 'smuggler']] },
  { id: 'r3', script: 'r3', from: [{ kind: 'ledge', x: 600 }], roster: [[], [], ['harpoon'], ['harpoon']] },
  { id: 'b4', script: 'b4', from: [{ kind: 'pane', id: 'reefBig', x: 950 }, { kind: 'pane', id: 'reefBig', x: 1000 }, { kind: 'water', x: 1030 }, { kind: 'water', x: 930 }],
    roster: [['diver', 'diver'], ['diver', 'diver'], ['diver', 'diver', 'diver'], ['diver', 'diver', 'diver', 'diver']] },
  { id: 'j1', script: 'jelly', ckpt: 'the rotunda', from: [{ kind: 'ledge', x: 1404 }, { kind: 'door', x: 1070 }, { kind: 'door', x: 1450 }, { kind: 'door', x: 1070 }, { kind: 'door', x: 1450 }, { kind: 'door', x: 1070 }],
    roster: [['harpoon', 'smuggler', 'diver'], ['harpoon', 'smuggler', 'diver', 'smuggler'], ['harpoon', 'smuggler', 'diver', 'smuggler', 'diver'], ['harpoon', 'smuggler', 'diver', 'smuggler', 'diver', 'hookman']] },
  { id: 'j2', script: 'j2', from: [{ kind: 'door', x: 1070 }, { kind: 'door', x: 1450 }],
    roster: [['smuggler', 'diver'], ['smuggler', 'diver', 'hauler'], ['smuggler', 'diver', 'hauler', 'smuggler'], ['smuggler', 'diver', 'hauler', 'hookman', 'diver']] },
  { id: 'p1', script: 'p1', from: [{ kind: 'water', x: 1490 }, { kind: 'water', x: 1530 }, { kind: 'water', x: 1600 }, { kind: 'water', x: 1680 }],
    roster: [['diver', 'diver'], ['diver', 'diver'], ['diver', 'diver', 'diver'], ['diver', 'diver', 'diver', 'diver']] },
  { id: 'p2', script: 'p2', from: [{ kind: 'ledge', x: 1840 }, { kind: 'ledge', x: 1525 }, { kind: 'ledge', x: 1605 }, { kind: 'ledge', x: 1700 }],
    roster: [['smuggler'], ['harpoon', 'smuggler', 'smuggler'], ['harpoon', 'smuggler', 'smuggler'], ['harpoon', 'smuggler', 'smuggler', 'smuggler']] },
  { id: 'd0', script: 'dock', unaware: 120, from: [{ kind: 'pre', x: 2100 }, { kind: 'pre', x: 2268 }], roster: [['smuggler'], ['smuggler', 'smuggler'], ['smuggler', 'smuggler'], ['smuggler', 'smuggler']] },
  { id: 'd1', script: 'd1', ckpt: 'the dock', from: [{ kind: 'door', x: 2400 }, { kind: 'ledge', x: 2190 }, { kind: 'edge', dir: 1 }, { kind: 'door', x: 2400 }, { kind: 'edge', dir: -1 }],
    roster: [['hauler', 'smuggler', 'smuggler'], ['hauler', 'harpoon', 'smuggler'], ['hauler', 'harpoon', 'smuggler', 'hookman'], ['hauler', 'harpoon', 'smuggler', 'hookman', 'smuggler']] },
  { id: 'd2', script: 'd2', from: [{ kind: 'water', x: 2160 }, { kind: 'water', x: 2210 }, { kind: 'water', x: 2185 }],
    roster: [['diver', 'diver'], ['diver', 'diver', 'diver'], ['diver', 'diver', 'diver', 'diver'], ['diver', 'diver', 'diver', 'diver', 'diver']] },
];
// drops (docs/drops.md): a goon leaves the hero weapon that stands for his own; the tier opens by his wave.
// Melee only in the lobby; the machine gun lies in the reef (a dead guard's), the shotgun on the rotunda's balcony
export const DROPS = {
  carry: { knife: ['katana'], machete: ['axe'], gaff: ['axe'], harpoon: ['shotgun'], pistol: ['shotgun'] },
  tier: { l1: ['katana', 'axe'], l2: ['katana', 'axe'], r1: ['katana', 'axe', 'shotgun'], r2: ['katana', 'axe'], r3: ['katana', 'axe', 'shotgun'], b4: ['katana', 'axe'],
    j1: ['katana', 'axe', 'shotgun'], j2: ['katana', 'axe', 'shotgun'], p1: ['katana', 'axe'], p2: ['katana', 'axe', 'shotgun'],
    d0: ['katana', 'axe', 'shotgun', 'mg'], d1: ['katana', 'axe', 'shotgun', 'mg'], d2: ['katana', 'axe', 'shotgun', 'mg'], teague: ['katana', 'axe', 'shotgun'], arena: ['katana', 'axe', 'shotgun', 'mg'] },
};

// ---- props and pickups ----
// (the plan's toy box is made of the engine's kinds: a plush shark is a bag, a snow globe a bottle, the register a crate, a diving
//  tank a barrel, a cash crate a big crate, the wet-floor sign a cone)
export const OBJ_START = [
  ['bin', 30, GROUND], ['cone', 200, GROUND], ['bag', 300, GROUND], ['bag', 320, GROUND], ['crate', 430, COUNTER.y], ['crate', 372, GROUND],
  ['barrel', 640, GROUND], ['crate', 880, GROUND], ['bin', 1050, GROUND],
  ['chair', 1190, GROUND], ['chair', 1330, GROUND],
  ['barrel', 1540, GROUND], ['barrel', 1720, GROUND], ['crate', 1700, RACK.y],
  ['barrel', 1950, MEZZ.y], ['barrel', 1964, MEZZ.y],
  ['bigcrate', 2060, GROUND], ['bigcrate', 2090, GROUND], ['crate', 2120, GROUND], ['barrel', 2250, GROUND], ['crate', 2340, GROUND], ['crate', 2360, GROUND], ['barrel', 2392, GROUND],
];
export const POCKETS = [['can', 108, 3], ['bottle', 120, 2], ['bottle', 352, 3], ['bottle', 2268, 2]];   // cans and bottles at the kiosk, snow globes at the shop
// weapons on stands; hidden: behind a pane until it breaks; y: up on a surface (it lies there to be taken)
export const PICKUPS = [
  { w: 1, x: BENCH_K.x, hidden: 'katanaCase' },   // the katana in its glass case on the lobby bench
  { w: 4, x: DEAD_GUARD },                         // the machine gun in a dead guard's hand
  { w: 2, x: 1048, rack: true },                   // the fire axe on its wall rack
];
export const LYING = [{ w: 3, x: 1096, y: BAL_L.y }, { w: 1, x: 1940, y: MEZZ.y }];   // the shotgun on the left balcony, a katana on the dive locker's rack
export const BOXES = [{ band: true, x: 432, y: GROUND }, { x: 1030, y: GROUND }, { band: true, x: 1520, y: FILT[0].y }, { band: true, x: 1902, y: MEZZ.y }, { x: 1918, y: MEZZ.y }];   // bandages and ammo boxes waiting

// ---- set pieces ----
export const STORM = { every: [8, 14], surge: 40 };            // a wave booms on the sea wall; on the dock a small surge wets the floor by the channel
export const JUNCTION = { r: 120, dmg: 10, stun: 0.6, tell: 1.5 };
export const BREATH = { t: [18, 12, 12, 9], dps: 6 };          // s under water before it hurts, then dmg/s
export const WADE = { knee: 10, waist: 22, chest: 34, k: [1, 0.62, 0.45, 0.34] };   // depth bands (px of water over the feet); run speed caps (x RUN)
export const SLIP = { v: 40, p: 0.4, cd: 2, down: 1.2 };          // a smuggler on a wet floor: above this speed, the chance he slips, his cooldown
export const DOCK_SURGE = { t: 6 };
// Nero waits in Mags's car (aquarium_intro: "Stay."): no dog in this level

// in-level lines (docs/levels/04-leviathan.md 6.2): a caption with the speaker's tag (the PA crackles: pa_click); voice ids = keys
export const LINES = {
  l1_payphone: { who: 'Smuggler', text: '...the Sandman. Here. Tell Kalt.' },
  reef_pa: { who: 'Kalt (PA)', text: 'Visitors, the aquarium is closed. Please mind the glass.', pa: true },
  jelly_pa: { who: 'Kalt (PA)', text: 'That was a forty-year-old bloom. Pay for it.', pa: true },
  pumps_pa: { who: 'Kalt (PA)', text: 'Open the sea gate. Let the tide meet our guest.', pa: true },
  pumps_pa2: { who: 'Kalt (PA)', text: 'Still climbing? Men always climb. The sea is patient.', pa: true },
  teague_bark: { who: 'Teague', text: 'Kalt says you float. Let\'s check.' },
  teague_dead: { who: 'Teague', text: '...told her... glass...' },
  kalt_taunt: { who: 'Kalt', text: 'You smell like the sea now.' },
  kalt_flood: { who: 'Kalt', text: 'Swim, Sandman.' },
};
