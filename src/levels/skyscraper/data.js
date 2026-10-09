// Level 8, "The Spire" (docs/levels/08-the-spire.md): the level's data. Level id `skyscraper`. The final level.
// The plan's 3800 px climb is folded into the engine's 2800 x 320 world, as the other levels fold theirs. Walls part the sections;
// each join is a fade (the lift doors, the gondola, the service lift, the vestry door, the hatch, the ladder). The clock face
// (boss phase 3) is the game's "club", behind the dial wall the Conductor smashes (x 2420).
//   lobby 0-520 · glass lift 540-820 · sky garden 840-1340 · penthouse 1360-1700 · vestry 1720-1840
//   gear room 1860-2140 (boss P1) · pendulum hall 2160-2420 (boss P2) · the face 2436-2800 (boss P3, the club)
// All arrays "by difficulty" are [Easy, Medium, Hard, Wicked].

export const GROUND = 280;
const hy = h => GROUND - h;

// ---- the map ----
// amb: ambient light [r, g, b]; out: outdoors (rain, wind); g: the camera group (walls part the groups)
export const SECTIONS = [
  { id: 'lobby', x0: -99, x1: 530, amb: [0.55, 0.48, 0.38], g: 0, flash: [8, 14] },
  { id: 'lift', x0: 530, x1: 830, amb: [0.35, 0.4, 0.55], out: true, g: 1, flash: [6, 12] },
  { id: 'garden', x0: 830, x1: 1350, amb: [0.32, 0.4, 0.38], out: true, g: 2, flash: [6, 12] },
  { id: 'penthouse', x0: 1350, x1: 1710, amb: [0.5, 0.52, 0.6], g: 3, flash: [8, 16] },
  { id: 'vestry', x0: 1710, x1: 1850, amb: [0.55, 0.42, 0.3], g: 4, flash: null },
  { id: 'gears', x0: 1850, x1: 2150, amb: [0.6, 0.45, 0.28], g: 5, flash: null },
  { id: 'pendulum', x0: 2150, x1: 2430, amb: [0.42, 0.34, 0.25], g: 6, flash: null },
  { id: 'face', x0: 2430, x1: 2900, amb: [0.3, 0.32, 0.42], out: true, g: 7, flash: [8, 14] },
];
export const GROUPS = [[0, 520], [540, 820], [840, 1340], [1360, 1700], [1720, 1840], [1860, 2140], [2160, 2424], [2436, 2800]];
export const SEC_NAMES = ['The lobby · floor 1', 'The glass lift', 'The sky garden · floor 75', 'The penthouse · floor 90', 'The vestry', 'The crown · the gear room', 'The crown · the pendulum hall', 'The crown · the face'];

// the lobby (floor 1): the revolving door, the grand stair, the mezzanine, the reception desk, the mirrors, the chandelier, the cases
export const REVOLVE = 14;
export const STAIR = { x0: 96, n: 21, step: 4 };                       // the grand stair up to the mezzanine (rises to the right)
export const MEZZ = { x0: 180, x1: 396, y: hy(84) };                  // y 196, one-way
export const DESK = { x0: 226, x1: 266, top: hy(30) };
export const CHAND = { x: 300, y: 64, chainHp: 70, r: 50, dmg: 60, slip: [270, 330], slipT: 30 };
export const KATANA_CASE = { x: 330, w: 14, h: 26, hp: 20 };
export const LOBBY_MIRRORS = [[30, 84], [104, 158], [276, 326]];       // back-wall mirrors below the mezzanine: x0, x1 (y 206-272)
export const LYS_ARENA = { x0: 366, x1: 514 };
export const LYS_MIRRORS = [[372, 400], [406, 434], [440, 468], [474, 502]];   // the four panes that each hold a decoy (y 190-272)
export const AXE_CASE = { x: 512, w: 10, h: 26, hp: 20 };
export const LIFT_DOORS = 506;                                         // ↑ by them once Lys is down (Beat 4: "Stay.")

// the glass lift: the car (its side panes block until broken; the void outside), the roof, the twin car, the cradle
export const CAR = { x0: 600, x1: 760, ceil: hy(68), roof: hy(70), hatch: [664, 696] };   // roof y 210 (one-way)
export const CAR_VOIDS = [[540, 598], [762, 820]];
export const CRADLE = { x0: 774, x1: 816, y: hy(16), from: -60 };      // the window-cleaning cradle (a surface) at the cable snap
export const FLOORS = { start: 1, twin: 30, rope: 55, snap: 72, top: 75, rate: 3.2 };   // floors; floors per second while the car moves
export const AXE_CAR = { x: 748, w: 10, h: 22 };

// the sky garden (floor 75): the pergola, planters, the koi pool, the bench, the pavilion, the gap and its beam, the helideck,
// the windbreak (glass; beyond it the drop), the service lift
export const PERGOLA = { x0: 900, x1: 980, y: hy(66) };
export const PLANTERS = [{ x0: 994, x1: 1014 }, { x0: 1064, x1: 1086 }, { x0: 1166, x1: 1186 }];
export const PLANTER_TOP = hy(26);
export const KOI = { x0: 1100, x1: 1150, slow: 0.6, down: 1 };
export const BENCH = 1046;
export const PAVILION = 1130;
export const KESSEL_ARENA = { x0: 1190, x1: 1318 };
export const GAP = { x0: 1236, x1: 1268 };
export const BEAM = { x0: 1236, x1: 1268, y: hy(10) };
export const WINDBREAK = { x: 1322, y0: hy(62), hp: 60 };
export const GARDEN_VOID = [1326, 1342];
export const SERVICE_LIFT = 1296;
export const NERO_DOOR = 860;                                          // a stairwell door: a muffled bark behind it (the first hint)

// the penthouse (floor 90): the glass floor (three tiles, steel mullions), the piano, the bar, the mezzanine with the MG nest, the rail
export const TILES = [{ id: 'gf1', x0: 1420, x1: 1494 }, { id: 'gf2', x0: 1500, x1: 1574 }, { id: 'gf3', x0: 1580, x1: 1654 }];
export const TILE = { hp: 100, stages: [35, 70, 100], slow: 0.9 };
export const PH_MEZZ = { x0: 1612, x1: 1700, y: hy(66) };
export const RAIL = { x0: 1654, x1: 1668, y: hy(40) };                 // the stair rail (the dive's target)
export const PIANO = { x: 1450, w: 40, top: hy(24), v: 32, dmg: 40 };
export const BAR = { x0: 1366, x1: 1402, top: hy(34) };
export const VESTRY_DOOR = 1696;
export const GUESTS = [1430, 1452, 1478, 1520, 1548, 1590];

// the vestry: the old Choir katana on a rack, the 3:17 clock, the bench (soup, the pipe), the hatch
export const VESTRY = { rack: 1772, clock: [1744, 196], bench: 1800, hatch: 1832, scarf: 1786 };

// the crown: the gear room (P1), the pendulum hall (P2), the face (P3)
export const GEARS = [{ cx: 1930, cy: 176, r: 44, T: 9, dir: 1 }, { cx: 2010, cy: 146, r: 36, T: 7.5, dir: -1 }, { cx: 2084, cy: 182, r: 40, T: 9, dir: 1 }];
export const TOOTH_W = 20;
export const MESH = [{ x: 1970, y: 162 }, { x: 2046, y: 166 }];        // crush points between the gears
export const GEAR_ARENA = { x0: 1868, x1: 2132, bell: [2000, 40], ladder: 2130, clock: [1884, 120] };
export const PEND = { pivot: [2290, -10], len: 250, amp: 34, period: [4.2, 4.2, 3.8, 3.4], r: 22, dmg: 30, bossDmg: 60, bossStun: 2.0, fast: 0.75, fastT: 8 };
export const PEND_ARENA = { x0: 2168, x1: 2416, bell: [2290, 30], dial: 2420 };
export const BALCONIES = [{ x0: 2170, x1: 2224, y: hy(66) }, { x0: 2356, x1: 2410, y: hy(66) }];
export const FACE = { cx: 2730, cy: 200, r: 80, cornice: [2450, 2720], void: [2722, 2800], hatch: 2470, bell: [2730, 30] };
export const FACE_ARENA = { x0: 2446, x1: 2796 };
// the numeral ledges (one-way, 26 wide) on the face's left half (the right half hangs over the drop: I only)
export const NUMERALS = [['IX', 9], ['VIII', 8], ['VII', 7], ['X', 10], ['XI', 11], ['I', 1]].map(([id, h]) => {
  const a = h / 12 * Math.PI * 2; return { id, x: Math.round(FACE.cx + Math.sin(a) * FACE.r), y: Math.round(FACE.cy - Math.cos(a) * FACE.r) };
});
export const HAND = { len: 80, walkMax: 30, slideMax: 50, slide: 40 };

// ---- surfaces (ledges) ----
export function surfaces() {
  return [
    { ...MEZZ, oneWay: true },
    { x0: DESK.x0, x1: DESK.x1, y: DESK.top },
    { x0: CAR.x0, x1: CAR.x1, y: CAR.roof, oneWay: true },
    { ...PERGOLA, oneWay: true },
    ...PLANTERS.map(p => ({ x0: p.x0, x1: p.x1, y: PLANTER_TOP })),
    { ...BEAM, oneWay: true },
    { x0: BAR.x0, x1: BAR.x1, y: BAR.top },
    { ...PH_MEZZ, oneWay: true },
    { ...RAIL },
    ...BALCONIES.map(b => ({ ...b, oneWay: true })),
    ...NUMERALS.map(n => ({ x0: n.x - 13, x1: n.x + 13, y: n.y, oneWay: true })),
  ];
}
export function steps() {
  const out = [];
  for (let i = 0; i < STAIR.n; i++) { const x0 = STAIR.x0 + i * STAIR.step; out.push({ x0, x1: x0 + STAIR.step - 1, y: GROUND - (i + 1) * STAIR.step, step: true, dir: 1, k: 0 }); }
  return out;
}
export const STAIR_RANGE = { x0: STAIR.x0, x1: STAIR.x0 + STAIR.n * STAIR.step };

// ---- glass (x0..x1: a vertical pane is 4 px wide; y0..y1; hp; blocks: a wall until broken; back: on the back wall; mirror) ----
export const PANES = [
  ...LOBBY_MIRRORS.map(([x0, x1], i) => ({ id: 'mir' + i, x0, x1, y0: 206, y1: 272, hp: 30, back: true, mirror: true })),
  ...LYS_MIRRORS.map(([x0, x1], i) => ({ id: 'lys' + i, x0, x1, y0: 190, y1: 272, hp: 30, back: true, mirror: true, lys: true })),
  { id: 'katanaCase', x0: KATANA_CASE.x - 7, x1: KATANA_CASE.x + 7, y0: hy(KATANA_CASE.h), y1: GROUND - 1, hp: KATANA_CASE.hp, back: true, cased: 1 },
  { id: 'axeCase', x0: AXE_CASE.x - 5, x1: AXE_CASE.x + 5, y0: hy(40), y1: hy(14), hp: AXE_CASE.hp, back: true, cased: 2 },
  { id: 'carL', x0: CAR.x0 - 2, x1: CAR.x0 + 2, y0: CAR.ceil, y1: GROUND - 1, hp: 80, blocks: true, car: true },
  { id: 'carR', x0: CAR.x1 - 2, x1: CAR.x1 + 2, y0: CAR.ceil, y1: GROUND - 1, hp: 80, blocks: true, car: true },
  { id: 'carBack', x0: CAR.x0 + 4, x1: CAR.x1 - 4, y0: CAR.ceil, y1: GROUND - 1, hp: 30, back: true, car: true },
  { id: 'axeCar', x0: AXE_CAR.x - 5, x1: AXE_CAR.x + 5, y0: hy(38), y1: hy(16), hp: 15, back: true, cased: 2 },
  { id: 'windbreak', x0: WINDBREAK.x - 2, x1: WINDBREAK.x + 2, y0: WINDBREAK.y0, y1: GROUND - 1, hp: WINDBREAK.hp, blocks: true },
];

// ---- props and pickups ----
// cone: the brass queue stanchion (carry, throw); crate: the luggage trolley, a ledger box; bottle: champagne (pocket); bin: a stone lantern
export const OBJ_START = [
  ['cone', 120, GROUND], ['crate', 200, GROUND], ['bottle', 242, DESK.top], ['bottle', 250, DESK.top], ['bottle', 258, DESK.top],
  ['bin', 960, GROUND], ['bin', 1124, GROUND], ['bottle', 1374, BAR.top], ['bottle', 1384, BAR.top], ['bottle', 1394, BAR.top],
  ['crate', 2180, BALCONIES[0].y], ['crate', 2200, BALCONIES[0].y], ['crate', 2370, BALCONIES[1].y], ['crate', 2392, BALCONIES[1].y],
];
// weapons on stands (w: 1 katana, 2 axe, 3 shotgun, 4 machine gun); hidden: behind glass until it breaks
export const PICKUPS = [
  { w: 1, x: KATANA_CASE.x, hidden: 'katanaCase' },
  { w: 2, x: AXE_CASE.x, hidden: 'axeCase' },
  { w: 2, x: AXE_CAR.x, hidden: 'axeCar' },
  { w: 2, x: BENCH },
  { w: 4, x: 1386, rack: true },              // the machine gun on the bar (once per checkpoint: the checkpoint keeps its taken state)
  { w: 1, x: VESTRY.rack, rack: true },        // Elias's old Choir katana (same blade; a tuning-fork mark on the guard)
];
// bandages and ammo boxes by place: n by difficulty
export const ITEMS = [
  { band: true, x: 300, n: [3, 2, 2, 1] }, { ammo: true, x: 248, n: [1, 1, 1, 1] }, { ammo: true, x: 386, n: [1, 1, 1, 1] },
  { band: true, x: 614, n: [1, 1, 1, 1] },
  { band: true, x: PAVILION, n: [2, 2, 2, 2] },
  { ammo: true, x: 1372, n: [1, 1, 1, 1] },
  { band: true, x: 1784, n: [3, 2, 2, 1] }, { ammo: true, x: 1808, n: [1, 1, 1, 1] },
];

// ---- the Choir Proper (docs/levels/08-the-spire.md 4): black tie, white gloves, a silver tuning-fork pin ----
export const LOOKS = {
  choirTux: { build: 'tall', top: 'coat', hair: ['short'], beards: ['none', 'stubble', 'stache'], cols: [['#18181e', '#0e0e12']], pants: ['#141418'], hairC: '#1a1410', boots: '#0a0a0e', neck: true },
  choirLean: { build: 'lean', top: 'jacket', hair: ['short'], beards: ['none', 'goatee'], cols: [['#1c1c24', '#121218']], pants: ['#141418'], boots: '#0a0a0e', neck: true },
  choirBig: { build: 'buff', top: 'coat', hair: ['bald', 'short'], beards: ['full', 'stubble'], cols: [['#16161c', '#0c0c10']], pants: ['#141418'], boots: '#0a0a0e', neck: true },
  choirUsher: { build: 'stocky', top: 'jacket', hair: ['short'], beards: ['none', 'stache'], cols: [['#3a3c44', '#2a2c32']], pants: ['#26282e'], boots: '#0a0a0e', neck: true },
  lys: { build: 'lean', top: 'jacket', hair: ['short'], beards: ['none'], cols: [['#eeeae2', '#c8c2b6']], pants: ['#121216'], hairC: '#2a1a14', boots: '#0a0a0e', neck: true, skin: ['#ecd2bc', '#c4a690'] },
  kessel: { build: 'buff', top: 'vest', hair: ['bald'], beards: ['full'], cols: [['#141418', '#0a0a0e']], pants: ['#141418'], boots: '#0a0a0e' },
  bell: { build: 'tall', top: 'vest', hair: ['short'], beards: ['stache'], cols: [['#5a4632', '#3e3022']], pants: ['#2a2622'], hairC: '#d8d8d0', boots: '#1a1410', skin: ['#d8bca0', '#b09478'] },
};
// variant -> base role and look; the behaviour row (each one needs a different answer):
//   chorister: close harmony: two near the hero attack on alternating beats (0.4 s apart)    -> break the pair: fight them from one side
//   stiletto: lunges from 90 px; after a hit he backs off 40 px                              -> wait for the back-off, then step in
//   cane: turns aside a HEAVY attack (parry %) and strikes back after a 1.0 s cane spin      -> light strings break his stance
//   sabreur: a 3-beat string on a metronome tick; the third beat is a lunge                   -> dodge beat 3: 1.0 s open after it
//   forker: steel tuning forks (they ring; a miss sticks 4 s; 6 damage to a glass tile)       -> close in; he comes down after 3 throws
//   soloist: pearl-grip pistol, 2-shot bursts 1.4 s apart, from high ground                   -> rush him in the 1.4 s
//   bass: sawn-off shotgun: 1.2 s tell (he breaks it open), 5 pellets at 90 px, knockback      -> stay out of 90 px, or hit him in the tell
//   usher: machine gun: a laser sweep (1.5 s), then 8 rounds; he stays high                   -> get under the sweep (squat) or out of line
//   cantor (any melee + a red pocket square): with 3+ Choir alive, they hum: +10 % speed, 0.8x cooldowns -> kill him first
export const CHOIR = {
  chorister: { role: 'brawler', look: 'choirTux', type: 'Chorister', weapon: null, harmony: 0.4 },
  stiletto: { role: 'knife', look: 'choirLean', type: 'Stiletto', weapon: 'knife', lunge: { from: 90, v: 220, t: 0.3, back: 40, cd: [2.5, 4] } },
  cane: { role: 'pipe', look: 'choirTux', type: 'Cane', weapon: 'pipe', R: { w: 'cane', len: 12, off: -0.35 }, parry: [0.15, 0.25, 0.35, 0.45], riposte: { windup: 1.0, dmg: 14 } },
  sabreur: { role: 'machete', look: 'choirLean', type: 'Sabreur', weapon: 'machete', R: { cmb: [['slash', 'slash', 'clunge']] }, tick: 0.42, punish: 1.0 },
  forker: { role: 'thrower', look: 'choirLean', type: 'Forker', weapon: 'tknife', proj: 'fork', ranged: true, perch: true },
  soloist: { role: 'pistol', look: 'choirTux', type: 'Soloist', weapon: 'pistol', clip: 2, reload: 1.4, ranged: true, perch: true },
  bass: { role: 'pistol', look: 'choirBig', type: 'Bass', weapon: 'pistol', R: { ranged: [40, 90], aim: 1.2 }, proj: 'buck', spdK: 0.8, hpK: 1.3, pellets: 5, range: 90, dmg: 6, ranged: true, heavy: true, drop: 3 },
  usher: { role: 'pistol', look: 'choirUsher', type: 'Usher', weapon: 'pistol', R: { ranged: [90, 170], aim: 1.5 }, proj: 'burst', rounds: 8, gap: 0.09, dmg: 5, ranged: true, perch: true, heavy: true, drop: 4, cost: 2 },
};
export const ELITE = { hpK: 1.25, poiseK: 1.2 };                      // every Choir Proper: +25 % hp, +20 % poise
export const HUM = { need: 3, speed: 1.1, cd: 0.8 };
export const RANGED_CAP = [2, 2, 3, 3];                                // ranged elites alive at once (an Usher counts as 2)
export const NAMES = ['Aurel', 'Bastien', 'Corvin', 'Dorian', 'Emeric', 'Fabien', 'Gaspard', 'Hadrien', 'Ignace', 'Jules', 'Lucien', 'Marius', 'Octave', 'Philippe', 'Remy', 'Severin', 'Tobias', 'Valery'];
export const LINES = ['The Sandman. On time.', 'All voices. Now.', 'He reaches the crown, we all hang.', 'For the Conductor.', 'Mind the glass.'];
// perch rule (a goon on a ledge comes down): a ranged one after 3 shots or 8 s, a melee one after 1.5 s, anyone when hit
export const PERCH = { shots: 3, time: 8, melee: 1.5 };

// ---- waves: roster by difficulty; from: 'place' x (already in the room) | 'door' x | 'mezz' (on the mezzanine) | 'perch' surface |
// 'twin' (the twin car, across the broken back pane) | 'rope' x (rappellers drop from above) | 'edge' dir; cantor: one melee becomes a Cantor ----
export const WAVES = {
  l1: { from: [{ kind: 'place', x: 150 }, { kind: 'place', x: 210 }, { kind: 'place', x: 280 }, { kind: 'place', x: 330 }],
    roster: [['chorister', 'chorister'], ['chorister', 'chorister', 'chorister'], ['chorister', 'chorister', 'stiletto', 'chorister'], ['chorister', 'chorister', 'stiletto', 'chorister']] },
  l2a: { from: [{ kind: 'door', x: 60 }, { kind: 'door', x: 360 }, { kind: 'perch', x: 300 }], line: 'Gentlemen. Take the stair.',
    roster: [['cane', 'stiletto'], ['cane', 'cane', 'stiletto', 'soloist'], ['cane', 'cane', 'stiletto', 'stiletto', 'soloist'], ['cane', 'cane', 'cane', 'stiletto', 'stiletto', 'soloist']], cantor: [false, false, true, true] },
  l2b: { from: [{ kind: 'door', x: 360 }, { kind: 'perch', x: 250 }, { kind: 'door', x: 60 }],
    roster: [['forker', 'chorister'], ['forker', 'chorister', 'chorister'], ['forker', 'forker', 'chorister', 'chorister'], ['forker', 'forker', 'chorister', 'chorister', 'chorister']], cantor: [false, false, true, true] },
  lysCrew: { from: [{ kind: 'door', x: 360 }], roster: [[], [], ['stiletto'], ['stiletto']] },
  e1: { from: [{ kind: 'place', x: 640 }, { kind: 'place', x: 700 }, { kind: 'place', x: 724 }, { kind: 'place', x: 668 }],
    roster: [['chorister', 'chorister'], ['chorister', 'chorister', 'stiletto'], ['chorister', 'chorister', 'stiletto'], ['chorister', 'chorister', 'stiletto', 'chorister']], cantor: [false, false, true, true] },
  e2: { from: [{ kind: 'twin' }], roster: [['cane', 'stiletto'], ['cane', 'stiletto', 'cane'], ['cane', 'stiletto', 'cane', 'soloist'], ['cane', 'stiletto', 'cane', 'soloist']], pair: 2 },
  e3: { from: [{ kind: 'rope', x: 640 }, { kind: 'rope', x: 700 }, { kind: 'rope', x: 740 }, { kind: 'rope', x: 620 }, { kind: 'rope', x: 680 }],
    roster: [['sabreur', 'chorister', 'forker'], ['sabreur', 'chorister', 'sabreur', 'forker'], ['sabreur', 'chorister', 'sabreur', 'chorister', 'forker', 'forker'], ['sabreur', 'chorister', 'sabreur', 'chorister', 'chorister', 'forker', 'forker']], cantor: [false, false, true, true] },
  g1: { from: [{ kind: 'edge', dir: 1 }, { kind: 'edge', dir: -1 }, { kind: 'perch', x: 940 }],
    roster: [['chorister', 'chorister', 'cane', 'soloist'], ['chorister', 'chorister', 'cane', 'soloist'], ['chorister', 'chorister', 'chorister', 'cane', 'cane', 'soloist'], ['chorister', 'chorister', 'chorister', 'cane', 'cane', 'soloist', 'soloist']], cantor: [false, true, true, true] },
  g2: { from: [{ kind: 'edge', dir: 1 }, { kind: 'perch', x: 1176 }, { kind: 'edge', dir: 1 }],
    roster: [['sabreur', 'bass', 'chorister'], ['sabreur', 'bass', 'forker', 'chorister'], ['sabreur', 'sabreur', 'bass', 'forker', 'chorister'], ['sabreur', 'sabreur', 'bass', 'forker', 'forker', 'chorister']], cantor: [false, false, true, true] },
  kesselCrew: { from: [{ kind: 'edge', dir: -1 }], roster: [[], [], ['cane'], ['cane']] },
  p1: { from: [{ kind: 'door', x: 1366 }, { kind: 'door', x: 1690 }, { kind: 'perch', x: 1650 }],
    roster: [['chorister', 'cane', 'stiletto', 'forker'], ['chorister', 'cane', 'cane', 'stiletto', 'forker'], ['chorister', 'chorister', 'cane', 'stiletto', 'stiletto', 'forker', 'cane'], ['chorister', 'chorister', 'cane', 'cane', 'stiletto', 'stiletto', 'forker', 'forker']], cantor: [false, false, true, true] },
  p2: { from: [{ kind: 'perch', x: 1660 }, { kind: 'perch', x: 1690 }], roster: [['usher'], ['usher', 'soloist'], ['usher', 'usher', 'soloist'], ['usher', 'usher', 'soloist', 'soloist']] },
};
// reinforcements by difficulty: when half of a wave is down, these come (Hard and Wicked)
export const REINF = {
  l2a: [[], [], ['chorister'], ['chorister', 'cane']], g1: [[], [], ['chorister'], ['chorister', 'stiletto']],
  p1: [[], [], ['chorister'], ['chorister', 'cane']], e3: [[], [], [], ['sabreur']],
};
// drops (docs/drops.md): a goon's own weapon stands for a hero weapon; the Bass leaves his shotgun, the Usher his machine gun (always)
export const DROPS = {
  carry: { knife: ['katana'], cane: ['axe'], machete: ['katana'], pistol: ['shotgun'] },
  tier: Object.fromEntries(Object.keys(WAVES).map(k => [k, ['katana', 'axe', 'shotgun']])),
};

// ---- set pieces ----
export const LIFT = { holdTxt: 'The Choir holds the car', roofWind: [40, 50, 60, 70], snapSlow: 2.5, snapFail: [25, 25, 40, -1] };
export const WIND = { garden: [50, 60, 70, 80], face: [60, 70, 80, 95], every: [6, 9], faceEvery: [5, 8], warn: 1.0, t: 2.0 };
export const MG_SWEEP = { t: 2.0, slow: 2.2, grab: [40, 32, 24, 18], second: [true, true, false, false] };
export const VOID_FALL = { assist: [true, true, false, false], dmg: [15, 20, 0, 0] };
// lightning: the flash (s) and its afterglow; thunder comes 0.3-2 s after
export const LIGHTNING = { flash: 0.15, glow: 0.6, thunder: [0.3, 2] };
