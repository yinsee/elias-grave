// Level 3, "House Always Wins" (docs/levels/03-house-always-wins.md): the level's data. Level id `casino`.
// The plan's 3600 px strip is folded into the engine's 2800 x 320 world, as Pier 9 and Line Zero fold theirs. The hall of mirrors
// (boss phase 1) is the last room of the street part; its far mirror wall is the street's end wall (x 2414). Brask smashes it at the
// phase shift, and the roulette salon (phases 2 and 3) is the game's "club" behind it (x 2436-2800).
//   floor 0-740 · kitchen 740-1100 · terrace 1100-1300 · vault 1300-1760 (the Cooler 1526-1750) · lobby 1760-2140 · hall 2140-2414
//   · roulette (the club) 2436-2800
// All arrays "by difficulty" are [Easy, Medium, Hard, Wicked].

export const GROUND = 280;
const hy = h => GROUND - h;

// ---- the map ----
export const SECTIONS = [   // amb: the ambient light [r, g, b]; out: outdoors (rain)
  { id: 'floor', name: 'The gaming floor', x0: -99, x1: 740, amb: [0.62, 0.5, 0.36] },
  { id: 'kitchen', name: 'The kitchens', x0: 740, x1: 1100, amb: [0.5, 0.58, 0.55] },
  { id: 'terrace', name: 'The river terrace', x0: 1100, x1: 1300, amb: [0.35, 0.4, 0.6], out: true },
  { id: 'vault', name: 'The counting house', x0: 1300, x1: 1760, amb: [0.4, 0.45, 0.42] },
  { id: 'lobby', name: 'The Salon Privé', x0: 1760, x1: 2140, amb: [0.6, 0.52, 0.42] },
  { id: 'hall', name: 'The hall of mirrors', x0: 2140, x1: 2420, amb: [0.55, 0.58, 0.66] },
  { id: 'roulette', name: 'The roulette salon', x0: 2420, x1: 2900, amb: [0.5, 0.3, 0.3] },
];
export const START_X = 262;                                   // by the roulette table with the fork on red 17
// the gaming floor
export const BAR = { x0: 20, x1: 120, y: hy(30) };            // the bar (a step to the mezzanine)
export const MEZZ = { x0: 140, x1: 470, y: hy(84) };          // the mezzanine (one-way), the Pit Bosses' gunline
export const ROULETTE_T = [230, 362];                         // roulette tables (painted, the back of the fight lane)
export const CRAPS = { x0: 580, x1: 660, y: hy(26) };         // the craps table: the dive pad
export const SLOTS = { x0: 640, x1: 730, y: hy(68) };         // the slot row's tops (a card sharp keeps to them)
export const CAGE = { x0: 676, x1: 736, door: 712 };          // the cashier cage
export const CHAND_FLOOR = [                                  // chandeliers over the floor: x, the chain's anchor on the mezzanine rail (or none)
  { id: 'c1', x: 286, y: 112, anchor: { x: 286, y: MEZZ.y - 9 } }, { id: 'c2', x: 420, y: 112, anchor: { x: 420, y: MEZZ.y - 9 } }, { id: 'c3', x: 612, y: 120, anchor: null },
];
// the kitchens
export const COUNTER_A = { x0: 780, x1: 860, y: hy(32) };
export const COUNTER_B = { x0: 950, x1: 1030, y: hy(32) };
export const PASS = { x0: 890, x1: 970, y: hy(84) };          // the pass shelf (one-way)
export const RANGE = { x0: 878, x1: 934, top: hy(16) };       // the gas range: a low hot island; anyone on it or knocked onto it burns
export const HOODS = [820, 906, 990];
// the river terrace
export const AWNING = { x0: 1150, x1: 1250, y: hy(66) };      // the striped awning (one-way): a bottle cache on top
export const CAFE = { x: 1262 };                              // a café table: a bandage and an ammo box
export const DEALER_X = 1206;                                 // the frightened dealer smokes under the awning
export const AXE_CASE = { x: 1284, w: 12, h: 26, hp: 10 };    // the fire axe in a glass case on the wall
export const SERVICE_DOOR = 1298;                             // locked: the brass key card opens it
export const LANTERN_X = 1124;
// the vault corridor and the counting room
export const GUARD_BOX = { x0: 1318, x1: 1336, y: hy(40) };   // the guard post's locker: the step to the cage catwalk
export const CATWALK = { x0: 1340, x1: 1474, y: hy(84) };     // the cage catwalk (one-way); its end is the hatch into the booth
export const BOOTH = { x0: 1440, x1: 1516, glass: 1440 };      // the cashier booth: bulletproof panes on its front (x 1440), Pit Bosses inside
export const PANES = [{ id: 'p1', y0: hy(80), y1: hy(42) }, { id: 'p2', y0: hy(42), y1: hy(2) }];   // two stacked panes; a firing slot between them
export const PANE_HP = 100;
export const INNER_GATE = 1520;
export const COOLER_ARENA = { x0: 1526, x1: 1748 };
export const VAULT_DOOR = 1752;                               // the round vault door: the wall the Cooler charges into
export const LOCKER_X = 1716;                                 // the weapon locker (the machine gun, after the Cooler)
export const ALARM = { x: 1600, y: 150 };
// the mirrored lobby of the Salon Privé
export const LOBBY_MIRRORS = [1774, 1816, 1858, 1900, 1942, 1984, 2026, 2068, 2110].map((x, i) => ({ id: 'lm' + (i + 1), x0: x, x1: x + 30, y0: 120, y1: hy(12) }));
export const PILLARS = [1880, 1980, 2076];                    // mirror pillars in the fight lane: cover until they break
export const STAIR = { x0: 1808, n: 23, step: 4 };            // the grand stair: 23 treads, rising to the right
export const GALLERY = { x0: 1900, x1: 2122, y: hy((STAIR.n + 1) * STAIR.step) };   // the gallery (one-way)
export const GREAT = { x: 2010, y: 104, tie: { x: 2112, y: GALLERY.y - 9 } };      // the great chandelier, its rope tied off on the gallery rail
export const LOBBY_EXIT = 2136;
// the hall of mirrors (boss phase 1)
export const HALL = { x0: 2146, x1: 2410 };
export const HALL_MIRRORS = [2152, 2184, 2216, 2248, 2304, 2336, 2368, 2394].map((x, i) => ({ id: 'hm' + (i + 1), x0: x, x1: x + 22, y0: 150, y1: hy(12) }));
export const SWIVELS = [{ id: 'hs1', x: 2204 }, { id: 'hs2', x: 2350 }];   // swivel mirrors on stands in the fight lane (they stop cards and bullets)
export const CLOCK = { x: 2287, y: 168 };                    // Bell & Sons, stopped at 3:17
export const END_WALL = 2414;
// the roulette salon (the club: boss phases 2 and 3)
export const WHEEL = { x0: 2446, x1: 2794, pw: 16, n: 37 };   // the wheel floor: 37 pockets 16 px wide, scrolling with the spin
export const HUB = { x0: 2600, x1: 2640, y: hy(32) };         // the raised hub (it does not turn)
export const BALCONIES = [{ x0: 2452, x1: 2492, y: hy(90) }, { x0: 2748, x1: 2790, y: hy(90) }];   // the private balcony doors (crew in phase 3)
export const SALON_CHAND = { x: 2620, y: 116, anchor: { x: 2620, y: hy(58) } };   // the salon chandelier: its chain anchor on the spindle top
export const RIM = [2450, 2790];                              // the rim lips: Rake croupiers come in over them; the ball drops in at one

// ---- surfaces (ledges) ----
export function surfaces() {
  return [
    { ...BAR }, { ...MEZZ, oneWay: true }, { ...CRAPS }, { ...SLOTS },
    { ...COUNTER_A }, { ...PASS, oneWay: true }, { ...COUNTER_B },
    { ...AWNING, oneWay: true },
    { ...GUARD_BOX }, { ...CATWALK, oneWay: true },
    { ...GALLERY, oneWay: true },
    { ...HUB }, { ...BALCONIES[0] }, { ...BALCONIES[1] },
  ];
}
// the grand stair: treads 4 px wide and 4 px high, rising to the right (dir 1); the engine's stair walk climbs them
export function steps() {
  const out = [];
  for (let i = 0; i < STAIR.n; i++) { const x0 = STAIR.x0 + i * STAIR.step; out.push({ x0, x1: x0 + STAIR.step - 1, y: GROUND - (i + 1) * STAIR.step, step: true, dir: 1, k: 0 }); }
  return out;
}
export const STAIR_RANGE = { x0: STAIR.x0, x1: STAIR.x0 + STAIR.n * STAIR.step };

// ---- props and pickups ----
// (the engine's own kinds: chairs, bottles (champagne), bins, barrels (the cooking-oil barrel), crates (cash crates and counting tables))
export const OBJ_START = [
  ['chair', 196, GROUND], ['chair', 316, GROUND], ['chair', 452, GROUND], ['chair', 520, GROUND],
  ['bottle', 40, BAR.y], ['bottle', 62, BAR.y], ['bottle', 84, BAR.y], ['bottle', 104, BAR.y], ['bottle', 300, GROUND], ['bottle', 540, GROUND],
  ['bin', 760, GROUND], ['bin', 1080, GROUND], ['barrel', 1046, GROUND], ['bin', 866, GROUND], ['crate', 1010, GROUND],
  ['chair', 1188, GROUND], ['bottle', 1172, AWNING.y], ['bottle', 1196, AWNING.y], ['bottle', 1226, AWNING.y],
  ['bigcrate', 1360, GROUND], ['bigcrate', 1406, GROUND], ['crate', 1580, GROUND], ['crate', 1662, GROUND], ['bin', 1700, GROUND],
  ['chair', 1840, GROUND], ['chair', 2050, GROUND], ['chair', 2100, GALLERY.y], ['bottle', 1950, GALLERY.y],
];
// weapons waiting on stands; `hidden`: in a case or a locker until it is broken open
export const PICKUPS = [
  { w: 1, x: 452, hidden: 'kcase' },          // the katana: the Count's collection, in a glass case under the mezzanine
  { w: 3, x: 592, hidden: 'drawer' },         // a shotgun in the dealer's drawer of the craps table (the plan's akimbo pistols, folded)
  { w: 2, x: AXE_CASE.x, hidden: 'acase' },   // the fire axe in the glass case on the terrace wall
  { w: 4, x: LOCKER_X, hidden: 'locker' },    // the machine gun in the weapon locker (it opens when the Cooler is down)
];
// cases: glass (hit it, or shoot it) or wood (the drawer: a hit); give: what is inside ('w' = the hidden pickup, 'ammo', 'band')
export const CASES = [
  { id: 'kcase', x: 452, w: 14, h: 22, hp: 10, kind: 'glass', give: ['w'] },
  { id: 'drawer', x: 592, w: 14, h: 8, hp: 12, kind: 'drawer', give: ['w', 'ammo'] },
  { id: 'acase', x: AXE_CASE.x, w: AXE_CASE.w, h: AXE_CASE.h, hp: AXE_CASE.hp, kind: 'glass', give: ['w'] },
];
// bandages and ammo boxes placed in the level ([x, y, band])
export const SUPPLIES = [[930, PASS.y, true], [CAFE.x, GROUND, true], [CAFE.x + 8, GROUND, false], [1420, CATWALK.y, false], [1912, GALLERY.y, true]];
export const EASY_BANDS = [[70, BAR.y], [2128, GROUND]];

// ---- the House (docs/levels/03-house-always-wins.md 4) ----
// looks: src/sim/enemies/roster.js LOOK format, plus hairC / boots / apron / neck (a gold chain that glints)
export const HOUSE_LOOKS = {
  tux: { build: 'tall', top: 'jacket', hair: ['short'], beards: ['none', 'stubble'], cols: [['#1c1c22', '#121216']], pants: ['#1c1c22'], hairC: '#1a1410', boots: '#0c0c10' },
  croupier: { build: 'lean', top: 'vest', hair: ['short'], beards: ['none', 'stache'], cols: [['#a8242a', '#7a1a1e']], pants: ['#1a1a20'], boots: '#0c0c10' },
  rake: { build: 'tall', top: 'vest', hair: ['short', 'bald'], beards: ['stache', 'none'], cols: [['#8a2a2e', '#621e22']], pants: ['#1a1a20'], boots: '#0c0c10' },
  sharp: { build: 'lean', top: 'jacket', hair: ['short'], beards: ['stubble', 'goatee'], cols: [['#6a6a72', '#4e4e56']], pants: ['#4e4e56'] },
  pitboss: { build: 'stocky', top: 'jacket', hair: ['short', 'bald'], beards: ['stache', 'full'], cols: [['#5a1a24', '#421218']], pants: ['#1c1c22'], neck: true },
  cook: { build: 'stocky', top: 'tank', hair: ['bald', 'short'], beards: ['stubble', 'chin'], cols: [['#e8e6e0', '#c8c6c0']], pants: ['#3a3a40'], apron: '#d8d2c4' },
  cooler: { build: 'buff', top: 'jacket', hair: ['bald'], beards: ['none'], cols: [['#18181e', '#0e0e12']], pants: ['#18181e'], boots: '#0a0a0e' },
  brask: { build: 'tall', top: 'jacket', hair: ['short'], beards: ['none'], cols: [['#ece8de', '#c8c2b4']], pants: ['#e2ddd0'], hairC: '#c8ccd4', boots: '#1a1a1e', neck: true },
};
// variant -> base role and look; the behaviour row (each one needs a different answer):
//   tux: polite: a raised hand before his first blow (s); shove: a two-hand push (no damage) toward the range or a table when the hero is
//        cornered -> fight in the open, or hit him in the push's wind-up
//   croupier: dealIn: one thrown card (dmg) from [near, far] px before he closes in -> jump or duck the card, then meet the knife
//   rake: low: share of his swings that are the low rake sweep (it knocks down) -> jump or roll it; he never climbs to a ledge
//   sharp: proj 'card' (flat, fast; it sticks); fan: cards per throw by difficulty; perch: he keeps to a ledge -> climb to him or wait out his deck
//   pitboss: cover: he walks behind the nearest cover (a flipped table, a pillar, the cashier glass) and fires from there; radio: alive
//        this long (s), the next wave of the section comes 30 % sooner -> flank the cover or flip it; kill him early
//   cook: kitchen only; he will not step onto the gas range -> knock him onto it
export const HOUSE = {
  tux: { role: 'brawler', look: 'tux', type: 'Floor Man', hpK: 1.2, polite: 0.3, shove: { windup: 0.35, push: 210, cd: 4 } },
  croupier: { role: 'knife', look: 'croupier', type: 'Croupier', weapon: 'knife', windK: 0.8, dealIn: { dmg: 4, near: 40, far: 80 } },
  rake: { role: 'pipe', look: 'rake', type: 'Rake', weapon: 'pipe', R: { w: 'pipe', len: 14, reach: 30 }, windup: 0.34, low: 0.45, noClimb: true },
  sharp: { role: 'thrower', look: 'sharp', type: 'Card Sharp', weapon: 'tknife', proj: 'card', fan: [1, 1, 3, 3], perch: true },
  pitboss: { role: 'pistol', look: 'pitboss', type: 'Pit Boss', weapon: 'pistol', hpK: 55 / 45, cover: true, radio: 8, max: [2, 2, 2, 3] },
  cook: { role: 'machete', look: 'cook', type: 'Kitchen Hand', weapon: 'machete', avoidFire: true },
};
export const HOUSE_NAMES = ['Anton', 'Basile', 'Cyril', 'Dorian', 'Emile', 'Fabien', 'Gaspard', 'Hugo', 'Ivo', 'Jules', 'Lazare', 'Marius', 'Noel', 'Octave', 'Pascal', 'Remy', 'Sacha', 'Theo', 'Victor', 'Yves'];
export const CARD = { v: 300, dmg: 5, deal: 4, spread: 0.07 };   // a card in flight: speed, damage (a sharp's; a croupier's deal-in)
export const PERCH = { cards: 3, time: 8, melee: 1.5 };         // a goon on a ledge: a thrower's throws before he comes down, s up there at most; a melee goon's s

// waves: trigger x (at; null: by a script), after: waits for these waves to be down; from: spawn sources ({ kind: 'door' x (a door in the
// wall: off the view if it is too close to him), 'edge' (off the view, dir 1 = right), 'ledge' x (a surface top), 'booth' x (inside the
// cashier booth) }); roster by difficulty; alive: at most this many out at once; reinf: more on Hard and Wicked when half are down (then);
// sec: the section it belongs to (its doors stay shut until it is done)
export const WAVES = [
  { id: 'w1', at: null, sec: 'floor', alive: [3, 3, 4, 5], from: [{ kind: 'door', x: 8 }, { kind: 'door', x: 100 }],
    roster: [['tux', 'tux', 'croupier'], ['tux', 'tux', 'croupier', 'croupier'], ['tux', 'tux', 'tux', 'croupier', 'croupier'], ['tux', 'tux', 'tux', 'croupier', 'croupier', 'croupier']], then: 'w1r',
    line: 'Monsieur. The house asks you to leave.' },
  { id: 'w1r', reinf: true, sec: 'floor', from: [{ kind: 'door', x: 8 }], roster: [[], [], ['tux'], ['tux', 'croupier']] },
  { id: 'w2a', at: 430, after: 'w1', sec: 'floor', from: [{ kind: 'ledge', x: 300 }, { kind: 'ledge', x: 440 }, { kind: 'ledge', x: 200 }, { kind: 'ledge', x: 370 }],
    roster: [['pitboss'], ['pitboss', 'sharp'], ['pitboss', 'pitboss', 'sharp'], ['pitboss', 'pitboss', 'sharp', 'sharp']], line: 'Up here, Sandman!' },
  { id: 'w2b', at: null, sec: 'floor', from: [{ kind: 'door', x: 8 }, { kind: 'edge', dir: 1 }],
    roster: [['tux'], ['tux', 'tux', 'rake'], ['tux', 'tux', 'rake'], ['tux', 'tux', 'tux', 'rake']] },
  { id: 'w3', at: 566, after: ['w2a', 'w2b'], sec: 'floor', alive: [4, 4, 6, 7], from: [{ kind: 'door', x: CAGE.door }, { kind: 'door', x: CAGE.door }, { kind: 'ledge', x: 690 }, { kind: 'door', x: CAGE.door }],
    roster: [['pitboss', 'pitboss', 'sharp', 'tux'], ['pitboss', 'pitboss', 'sharp', 'tux'], ['pitboss', 'pitboss', 'sharp', 'pitboss', 'tux', 'sharp', 'tux'], ['pitboss', 'pitboss', 'sharp', 'pitboss', 'tux', 'sharp', 'tux', 'tux']],
    line: 'Cover the cage!' },
  { id: 'w4a', at: 770, sec: 'kitchen', ckpt: 'the kitchens', from: [{ kind: 'door', x: 1092 }],
    roster: [['cook', 'cook'], ['cook', 'cook', 'tux'], ['cook', 'cook', 'cook', 'tux'], ['cook', 'cook', 'cook', 'tux', 'tux']], half: 'w4b', line: 'Out of my kitchen!' },
  { id: 'w4b', at: null, sec: 'kitchen', from: [{ kind: 'ledge', x: 940 }, { kind: 'door', x: 1092 }, { kind: 'ledge', x: 910 }, { kind: 'door', x: 748 }],
    roster: [['sharp', 'croupier'], ['sharp', 'croupier'], ['sharp', 'croupier', 'sharp'], ['sharp', 'croupier', 'sharp', 'croupier']] },
  { id: 'w6', at: 1312, sec: 'vault', from: [{ kind: 'booth', x: 1474 }, { kind: 'booth', x: 1500 }, { kind: 'door', x: 1424 }, { kind: 'ledge', x: 1400 }, { kind: 'door', x: 1424 }],
    roster: [['pitboss', 'pitboss', 'tux'], ['pitboss', 'pitboss', 'tux', 'tux'], ['pitboss', 'pitboss', 'tux', 'sharp', 'tux'], ['pitboss', 'pitboss', 'tux', 'sharp', 'tux', 'pitboss', 'tux']],
    line: 'Alarm! The counting house!' },
  { id: 'w8', at: 1772, sec: 'lobby', from: [{ kind: 'door', x: 1892 }, { kind: 'door', x: 2128 }, { kind: 'door', x: 1992 }, { kind: 'door', x: 1766 }],
    roster: [['pitboss', 'tux', 'tux'], ['pitboss', 'tux', 'tux', 'croupier'], ['pitboss', 'tux', 'pitboss', 'tux', 'tux', 'croupier'], ['pitboss', 'tux', 'pitboss', 'tux', 'tux', 'croupier', 'croupier']], then: 'w8r',
    line: 'Keep him off the stair!' },
  { id: 'w8r', reinf: true, sec: 'lobby', from: [{ kind: 'door', x: 2128 }], roster: [[], [], ['tux'], ['tux', 'croupier']] },
  { id: 'w9a', at: 1960, after: ['w8', 'w8r'], sec: 'lobby', from: [{ kind: 'ledge', x: 2010 }, { kind: 'ledge', x: 2100 }, { kind: 'ledge', x: 1960 }, { kind: 'ledge', x: 2060 }, { kind: 'ledge', x: 1930 }],
    roster: [['sharp'], ['sharp', 'sharp', 'pitboss'], ['sharp', 'sharp', 'pitboss'], ['sharp', 'sharp', 'sharp', 'pitboss', 'pitboss']], delayB: 5 },
  { id: 'w9b', at: null, sec: 'lobby', from: [{ kind: 'door', x: 2128 }, { kind: 'door', x: 1766 }],
    roster: [['tux', 'tux', 'rake'], ['tux', 'tux', 'tux', 'rake'], ['tux', 'tux', 'tux', 'rake', 'rake'], ['tux', 'tux', 'tux', 'tux', 'rake', 'rake']], line: 'Up the stair! Take him!' },
];
// the gates between sections: shut until the waves of the section are down (the terrace's door: until he has the key card)
export const GATES = [
  { id: 'floor', x: 738, waves: ['w1', 'w1r', 'w2a', 'w2b', 'w3'] },
  { id: 'kitchen', x: 1098, waves: ['w4a', 'w4b'] },
  { id: 'service', x: SERVICE_DOOR, key: true },
  { id: 'inner', x: INNER_GATE, waves: ['w6'] },
  { id: 'vault', x: VAULT_DOOR + 6, cooler: true },
  { id: 'lobby', x: LOBBY_EXIT, waves: ['w8', 'w8r', 'w9a', 'w9b'] },
];
// drops (docs/drops.md): a goon leaves the hero weapon that stands for his own; the tier opens by his wave
export const DROPS = {
  carry: { knife: ['katana'], pipe: ['axe'], machete: ['katana', 'axe'], pistol: ['shotgun'] },
  tier: { w1: ['katana'], w1r: ['katana'], w2a: ['katana', 'shotgun'], w2b: ['katana', 'axe'], w3: ['katana', 'axe', 'shotgun'], w4a: ['katana', 'axe'], w4b: ['katana', 'axe', 'shotgun'],
    w6: ['katana', 'axe', 'shotgun'], w8: ['katana', 'axe', 'shotgun', 'mg'], w8r: ['katana', 'axe', 'shotgun', 'mg'], w9a: ['katana', 'axe', 'shotgun', 'mg'], w9b: ['katana', 'axe', 'shotgun', 'mg'],
    cooler: ['katana', 'axe', 'shotgun'], arena: ['katana', 'axe', 'shotgun', 'mg'] },
};

// ---- set pieces ----
// chandeliers: the chain's hp (a shot, a blade or a thrown thing on the anchor or the chain), the shadow's warning (s), the crush
export const CHAND = { chainHp: 20, warn: 0.5, r: 30, dmg: 40, great: { hp: 15, warn: 1.2, r: 45, dmg: 60, mirrors: 3, slow: 0.8 }, salon: { hp: 15, warn: 0.6, r: 34, bossK: 0.12, stun: 3 } };
// flippable card tables: x; flipped, they stop bullets and cards (both ways) until broken; a Pit Boss takes cover behind one
export const TABLES = [{ x: 200 }, { x: 336 }, { x: 512 }, { x: 556 }, { x: 1932 }];
export const TABLE = { hp: 60, h: 14, w: 9 };
export const PILLAR = { hp: 60, h: 80, w: 6, stagger: 0.8, shardDmg: 4 };
export const MIRROR_HP = 40;
// the gas range: burning (dps to the hero by difficulty, to goons), the oil barrel's flare
export const FIRE = { heroDps: [5, 6, 7, 8], goonDps: 16, flare: { t: 1.5, r: 40, dmg: 20 } };
// the craps dive: a jump or a roll off the table with a gun: slow motion for `t` s real time (or until he lands); auto-aim cone (rad)
export const DIVE = { slow: 1.8, cone: 0.44, recharge: 8, chips: 40, cards: 20 };
// the Cooler (beat 7) and Count Brask (section 5): see src/bosses/cooler.js and src/bosses/brask.js
