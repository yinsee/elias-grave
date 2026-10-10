// Level 6, "The Palm House" (docs/levels/06-palm-house.md): the level's data. Level id `palmhouse`.
// The plan's 3600 px strip is folded into the engine's 2800 x 320 world, as the other levels fold theirs. Walls part the rooms; doors
// (walk through them once they open) join them. The great dome (the boss arena) is the game's "club", behind the nave's iron gate.
//   park 0-524 · ballroom 524-1154 · orchid rooms 1154-1504 · office 1504-1604 · boiler yard 1604-1880 · nave 1880-2414 · dome 2436-2800
// All arrays "by difficulty" are [Easy, Medium, Hard, Wicked].

export const GROUND = 280;
const hy = h => GROUND - h;

// ---- the map ----
// amb: ambient light; out: outdoors (snow falls); g: the camera group; mist: floor fog
export const SECTIONS = [
  { id: 'park', x0: -99, x1: 524, amb: [0.42, 0.5, 0.72], out: true, g: 0 },
  { id: 'ballroom', x0: 524, x1: 1154, amb: [0.78, 0.66, 0.48], g: 1 },
  { id: 'orchids', x0: 1154, x1: 1504, amb: [0.55, 0.66, 0.5], mist: true, g: 2 },
  { id: 'office', x0: 1504, x1: 1604, amb: [0.5, 0.4, 0.3], g: 3 },
  { id: 'boiler', x0: 1604, x1: 1880, amb: [0.4, 0.46, 0.66], out: true, g: 4 },
  { id: 'nave', x0: 1880, x1: 2420, amb: [0.66, 0.68, 0.52], g: 5 },
  { id: 'dome', x0: 2420, x1: 2900, amb: [0.7, 0.66, 0.5], g: 6 },
];
export const GROUPS = [[0, 520], [528, 1150], [1158, 1500], [1508, 1600], [1608, 1876], [1884, 2414], [2436, 2800]];
export const WALLS = [524, 1154, 1504, 1604, 1880];   // the room walls (the boiler/nave wall stops at the roof line: the gantry runs over it)
export const ROOF_Y = 160;                          // the nave's glass roof line (the boiler/nave wall reaches up to it)
// doors in the walls: walk into one once it is open (a fade); id, the wall's x, what opens it
export const DOORS = [
  { id: 'kitchen', x: 524, name: 'The kitchen door' },
  { id: 'private', x: 1154, name: 'The door marked Private' },
  { id: 'office', x: 1504, name: 'The curator\'s office' },
  { id: 'back', x: 1604, name: 'The back door' },
];

// the park: the red carpet, the portico (guests go in), the hedge gate, the service yard
export const CARPET = { x0: 0, x1: 150 };
export const PORTICO = 140;
export const WAITER = 88;
export const HEDGE = 172;
export const STATUE_YARD = { x: 236, w: 16, top: hy(48) };   // the snowy botanist: cover (sniper and gun)
export const VAN1 = { x0: 280, x1: 346, top: hy(44) };
export const CASH = [372, 386, 398];
export const SHED = { x0: 412, x1: 446, axe: 428 };
export const VAN2 = { x0: 454, x1: 516, top: hy(44), win: 508 };
export const LAMPS_PARK = [30, 200, 400];
// the ballroom: buffet, towers, chandeliers, balcony, piano, the honour guard, the doors in the back wall
export const KITCHEN_IN = 544;
export const BUFFET_W = { x0: 556, x1: 600, top: hy(28) };
export const CAKE = { x0: 712, x1: 738, top: hy(42) };            // the cake table: the step up to the balcony's west end
export const BALCONY = { x0: 740, x1: 990, y: hy(84) };
export const PIANO = { x0: 994, x1: 1052, top: hy(40) };          // the grand piano on the bandstand: the step to the east end
export const BUFFET_E = { x0: 1090, x1: 1130, top: hy(28) };
export const TOWERS = [632, 806, 1068];                            // champagne towers
export const CHANDS = [680, 920];                                  // chandeliers (the chains reach the ceiling at y 40)
export const CHAND_Y = 118;                                        // the chandelier's body hangs here; its chain runs up from it
export const HONOUR = 846;                                         // the dress sabre on the honour-guard rack (a katana)
export const PORTICO_IN = 650, MAIN_DOORS = 900, PRIVATE = 1146;   // doors in the back wall (guests out, the riot squad in)
// the orchid rooms: benches, the walkway, cabinets, misting pipes, the fire box
export const BENCHES = [{ x0: 1172, x1: 1210 }, { x0: 1282, x1: 1318 }, { x0: 1398, x1: 1428 }];
export const BENCH_TOP = hy(34);
export const WALKWAY = { x0: 1270, x1: 1490, y: hy(84) };
export const PIPES = [{ x: 1232, y: 228 }, { x: 1376, y: 228 }];
export const FIREBOX = 1440;
// the office: the desk (dossier), the phone, the gun cabinet
export const DESK = { x0: 1526, x1: 1566, top: hy(26), dossier: 1540, phone: 1560 };
export const GUNCAB = { x: 1588, y0: hy(56), y1: hy(16) };
// the boiler yard: the boiler house and its overhang, the coal heap, the iron stairs up to the gantry
export const BOILER = { x0: 1612, x1: 1690, over: hy(80) };       // the overhang is sniper cover for anyone under it
export const COAL = { x0: 1698, x1: 1738, top: hy(30) };
export const STAIR = { x0: 1744, n: 32, step: 4 };                 // 32 treads rising right: the top tread at x 1872, y 152
export const GANTRY = { x0: 1866, x1: 1990, y: GROUND - STAIR.n * STAIR.step };   // outside the glass, in the snow
export const SKY = { x0: 1990, x1: 2030 };                          // the skylight pane at the gantry's end (it holds a man, not a round)
export const ROOF_DOOR = 1878;                                      // the roof door at the top of the stairs (shut until the yard is clear)
// the nave: the koi bridge, the gallery, its step, the statue, palms, the Door's arena, the gate
export const BRIDGE = { x0: 2040, x1: 2090, y: hy(18) };
export const GSTEP = { x0: 2112, x1: 2128, top: hy(36) };
export const NGALLERY = { x0: 2130, x1: 2262, y: hy(66) };
export const PALMS = [1950, 2066, 2230];                             // palm canopies: a sniper takes twice as long to lock under one
export const BRANDT_ARENA = { x0: 2240, x1: 2410 };
export const GATE = 2404;                                           // the iron gate (the street's end): opens when the Door falls
// the dome (the club): galleries, planters, statues, columns, the fountain, the lantern, Hale's office, the clock, the doors
export const ARENA = { x0: 2446, x1: 2790 };
export const DGAL_W = { x0: 2448, x1: 2516, y: hy(84) };
export const DGAL_E = { x0: 2720, x1: 2788, y: hy(84) };
export const DPLANT = [{ x0: 2522, x1: 2540, top: hy(42) }, { x0: 2700, x1: 2718, top: hy(42) }];
export const DSTATUES = [2566, 2676];                               // Flora and Pomona: topple once each
export const COLUMNS = [2548, 2692];
export const FOUNTAIN = { x0: 2604, x1: 2640, top: hy(18), wet: [2584, 2660] };
export const LANTERN = { x: 2622, chainY: 70 };
export const HALE = { x0: 2730, x1: 2784, y0: 186, y1: 268 };        // Hale's glass office, in the back lane
export const CLOCK = { x: 2754, y: 176 };
export const DOME_DOORS = [2452, 2786];                              // the west gate and the east door: riot squads come in here

// ---- glass ----
// x0..x1, y0..y1; hp; blocks: a wall until broken; back: behind the fight lane (a blow near it, a shot or a throw breaks it); roof: a roof
// pane (2 cracks break it; its shards fall on a floor mark)
export const PANES = [
  { id: 'vanWin', x0: VAN2.win - 6, x1: VAN2.win + 6, y0: hy(40), y1: hy(22), hp: 20, back: true },
  { id: 'cab1', x0: 1246, x1: 1250, y0: hy(80), y1: GROUND - 1, hp: 30, blocks: true },
  { id: 'cab2', x0: 1346, x1: 1350, y0: hy(80), y1: GROUND - 1, hp: 30, blocks: true },
  { id: 'cab3', x0: 1456, x1: 1460, y0: hy(80), y1: GROUND - 1, hp: 30, blocks: true },
  { id: 'gunCab', x0: GUNCAB.x - 8, x1: GUNCAB.x + 8, y0: GUNCAB.y0, y1: GUNCAB.y1, hp: 10, back: true },
];
export const NAVE_ROOF = { x0: 1884, n: 10, w: 52, y0: ROOF_Y - 4, y1: ROOF_Y + 4 };   // panes nave1..nave10
export const DOME_ROOF = { x0: 2446, n: 10, w: 34.4, y0: 106, y1: 118 };              // panes dome1..dome10
export const SHARD = { warn: 0.9, dmg: [10, 14, 16, 18], melt: 4, meltW: 40 };

// ---- surfaces (ledges) ----
export function surfaces() {
  return [
    { x0: VAN1.x0, x1: VAN1.x1, y: VAN1.top },
    { x0: VAN2.x0, x1: VAN2.x1, y: VAN2.top },
    { x0: BUFFET_W.x0, x1: BUFFET_W.x1, y: BUFFET_W.top },
    { x0: CAKE.x0, x1: CAKE.x1, y: CAKE.top },
    { ...BALCONY, oneWay: true },
    { x0: PIANO.x0, x1: PIANO.x1, y: PIANO.top },
    { x0: BUFFET_E.x0, x1: BUFFET_E.x1, y: BUFFET_E.top },
    ...BENCHES.map(b => ({ x0: b.x0, x1: b.x1, y: BENCH_TOP, oneWay: true })),
    { ...WALKWAY, oneWay: true },
    { x0: DESK.x0, x1: DESK.x1, y: DESK.top },
    { x0: COAL.x0, x1: COAL.x1, y: COAL.top },
    { x0: GANTRY.x0, x1: GANTRY.x1, y: GANTRY.y },
    { x0: BRIDGE.x0, x1: BRIDGE.x1, y: BRIDGE.y, oneWay: true },
    { x0: GSTEP.x0, x1: GSTEP.x1, y: GSTEP.top },
    { ...NGALLERY, oneWay: true },
    { ...DGAL_W, oneWay: true }, { ...DGAL_E, oneWay: true },
    ...DPLANT.map(p => ({ x0: p.x0, x1: p.x1, y: p.top })),
    { x0: FOUNTAIN.x0, x1: FOUNTAIN.x1, y: FOUNTAIN.top, oneWay: true },
  ];
}
// the iron stairs (the engine's stair walk climbs them)
export function steps() {
  const out = [];
  for (let i = 0; i < STAIR.n; i++) { const x0 = STAIR.x0 + i * STAIR.step; out.push({ x0, x1: x0 + STAIR.step - 1, y: GROUND - (i + 1) * STAIR.step, step: true, dir: 1, k: 0 }); }
  return out;
}
export const STAIR_RANGE = { x0: STAIR.x0, x1: STAIR.x0 + STAIR.n * STAIR.step };
// sniper cover: opaque things between a nest (high above) and the floor. y: their top; a standing statue is added live
export const COVER = [
  { x0: BOILER.x0, x1: BOILER.x1, y: BOILER.over },
  { x0: STATUE_YARD.x - 8, x1: STATUE_YARD.x + 8, y: STATUE_YARD.top },
  { x0: NGALLERY.x0, x1: NGALLERY.x1, y: NGALLERY.y },
  { x0: DGAL_W.x0, x1: DGAL_W.x1, y: DGAL_W.y }, { x0: DGAL_E.x0, x1: DGAL_E.x1, y: DGAL_E.y },
  { x0: VAN1.x0, x1: VAN1.x1, y: VAN1.top }, { x0: VAN2.x0, x1: VAN2.x1, y: VAN2.top },
];

// ---- props and pickups ----
// the engine's own kinds stand in: bottle (champagne), bag (cash bags), crate (planters on castors), bigcrate (the ice swan), barrel
export const OBJ_START = [
  ['bottle', WAITER + 6, GROUND], ['bag', CASH[0], GROUND], ['bag', CASH[1], GROUND], ['bag', CASH[2], GROUND], ['crate', 404, GROUND],
  ['bottle', 570, BUFFET_W.top], ['bottle', 590, BUFFET_W.top], ['bigcrate', 880, GROUND], ['crate', 950, GROUND], ['crate', 1078, GROUND],
  ['can', 1190, BENCH_TOP], ['can', 1300, BENCH_TOP], ['crate', 1236, GROUND], ['crate', 1418, GROUND],
  ['barrel', 1700, GROUND], ['barrel', 1662, GROUND], ['crate', 2150, GROUND], ['crate', 2316, GROUND],
];
// weapons on stands; hidden: behind glass until it breaks; diff: only on these difficulties
export const PICKUPS = [
  { w: 2, x: SHED.axe, rack: true },                               // the groundskeeper's axe
  { w: 3, x: VAN2.win, hidden: 'vanWin', diff: [0, 1] },            // the shotgun behind the van's rear window (Easy, Medium)
  { w: 1, x: HONOUR, rack: true },                                  // the dress sabre (a katana)
  { w: 3, x: GUNCAB.x, hidden: 'gunCab' },                          // the office's gun cabinet
  { w: 4, x: 2190, rack: true },                                     // the riot squad's machine gun on the gallery (it rests there)
];
// bandages (band) and ammo boxes the level places
export const ITEMS = [
  { x: 504, ammo: true, diff: [2, 3] },                              // behind the van's window on Hard and Wicked: an ammo box
  { x: 1120, band: true, y: BUFFET_E.top }, { x: 1484, band: true }, { x: FIREBOX + 6, ammo: true },
  { x: 1530, band: true }, { x: 1548, band: true, diff: [0, 1] }, { x: 1574, ammo: true },
  { x: 1694, ammo: true }, { x: 2186, band: true },
];

// ---- the Blue Choir (docs/levels/06-palm-house.md 4) ----
export const LOOKS = {
  navy: { build: 'tall', top: 'jacket', hair: ['cap'], beards: ['none', 'stache', 'stubble'], cols: [['#28345a', '#1a2240']], pants: ['#1c2438'], hairC: '#1c2438', boots: '#0e0e12' },
  riot: { build: 'stocky', top: 'jacket', hair: ['souwester'], beards: ['none', 'stubble', 'chin'], cols: [['#1e2840', '#141a2c']], pants: ['#181e2e'], boots: '#0c0c10', hat: '#3a4664' },
  detective: { build: 'tall', top: 'coat', hair: ['short'], beards: ['none', 'stache', 'stubble'], cols: [['#6a5a44', '#4c3f2e'], ['#4a4a50', '#36363c']], pants: ['#16161c'], boots: '#0e0e12' },
  hook: { build: 'stocky', top: 'jacket', hair: ['cap'], beards: ['stubble', 'full'], cols: [['#28345a', '#1a2240']], pants: ['#1c2438'], hairC: '#1c2438', boots: '#0e0e12', apron: '#4e5a34' },
  spotter: { build: 'lean', top: 'jacket', hair: ['cap'], beards: ['none'], cols: [['#28345a', '#1a2240']], pants: ['#1c2438'], hairC: '#1c2438', boots: '#0e0e12', apron: '#a02424' },
  brandt: { build: 'buff', top: 'jacket', hair: ['souwester'], beards: ['full'], cols: [['#1a2236', '#10162a']], pants: ['#141a28'], boots: '#0c0c10', hat: '#2e3850' },
  vane: { build: 'tall', top: 'coat', hair: ['short'], beards: ['none'], cols: [['#1e2a4c', '#141c34']], pants: ['#141a2c'], hairC: '#c8ccd6', boots: '#0c0c10', apron: '#c8a040', skin: ['#e0c4ac', '#b89880'] },
};
// variant -> base role and look; the behaviour row (each one needs a different answer):
//   shield: a riot shield takes every blow from the front (shield HP; it shatters at 0)   -> get behind him, sweep him, throw something, or let a sniper hit it
//   baton: an officer with an extendable baton; his swings ride through light hits           -> dodge the swing, punish the recovery
//   pistol: a service pistol; holds fire with a guest in his line (Easy, Medium)              -> rush him, use the guests and the glass
//   detective: plain clothes and quick fists                                                    -> trade, then grab him when he stumbles
//   knifeDet: a detective with a flick knife (fast, short)                                      -> keep him at heavy range
//   billhook: a pruning hook: long reach, armour on the swing                                   -> roll inside it
//   spotter: radio and binoculars; while he lives every sniper dot in his room locks faster   -> kill him first: one dot goes dark 10 s
export const CHOIR = {
  shield: { role: 'shield', look: 'riot', type: 'Riot officer', weapon: 'shield', spdK: 0.7, shp: [80, 120, 140, 160], turn: [0.6, 0.45, 0.35, 0.25] },
  baton: { role: 'pipe', look: 'navy', type: 'Officer', weapon: null, R: { w: 'pipe', len: 8, reach: 22 }, snap: true },
  pistol: { role: 'pistol', look: 'navy', type: 'Officer', weapon: 'pistol', holdFire: true },
  detective: { role: 'brawler', look: 'detective', type: 'Detective', weapon: null },
  knifeDet: { role: 'knife', look: 'detective', type: 'Detective', weapon: 'knife' },
  billhook: { role: 'machete', look: 'hook', type: 'Billhook officer', weapon: null, R: { w: 'machete', len: 11, reach: 26 } },
  spotter: { role: 'pistol', look: 'spotter', type: 'Spotter', weapon: 'pistol', spot: true },
};
// shield damage by what hit it (docs 4: the shield table); anything else from the front only sparks
export const SHIELD_DMG = { light: 0, heavy: 25, katanaHeavy: 35, axeHeavy: 60, flying: 50, bullet: 10, shotNear: 60, shotFar: 20, thrown: 100, sniper: 120 };
export const NAMES = ['Kessler', 'Ruiz', 'Vandermeer', 'Holt', 'Szabo', 'Marsh', 'Dekker', 'Pryce', 'Lowe', 'Okafor', 'Brandis', 'Fenn', 'Quill', 'Ashby', 'Tobin', 'Varga', 'Hearne', 'Iles'];
export const LINES = ['Who invited the Sandman?', 'Hold the line.', 'Commissioner wants him breathing. Barely.', 'Sandman. In black tie.', 'Close him in!'];

// waves: roster by difficulty; from: sources (kind 'door' x | 'edge' dir | 'ledge' x (a perch) | 'placed' x); a source is used in turn.
// High roles (pistol, spotter) take the ledge sources when a wave has them. line: the first goon out says it
export const WAVES = {
  yard: { from: [{ kind: 'placed', x: 300 }, { kind: 'placed', x: 362 }, { kind: 'placed', x: 420 }, { kind: 'ledge', x: 310 }, { kind: 'placed', x: 470 }], line: "Malaspina's bags. Load them and shut up.",
    roster: [['baton', 'detective'], ['baton', 'baton', 'detective'], ['baton', 'baton', 'knifeDet', 'pistol'], ['baton', 'baton', 'knifeDet', 'knifeDet', 'pistol']] },
  b1a: { from: [{ kind: 'door', x: PORTICO_IN }, { kind: 'door', x: MAIN_DOORS }, { kind: 'placed', x: 1010 }, { kind: 'placed', x: 760 }], line: 'Get the guests out! Get him down!',
    roster: [['baton', 'baton', 'detective'], ['baton', 'baton', 'baton', 'detective'], ['baton', 'baton', 'baton', 'knifeDet', 'knifeDet'], ['baton', 'baton', 'baton', 'baton', 'knifeDet', 'knifeDet']] },
  b1b: { from: [{ kind: 'ledge', x: 800 }, { kind: 'ledge', x: 940 }, { kind: 'door', x: MAIN_DOORS }], line: 'Balcony! Take him from up here!',
    roster: [['pistol'], ['pistol', 'pistol'], ['pistol', 'pistol', 'baton'], ['pistol', 'pistol', 'pistol', 'baton']] },
  shields: { from: [{ kind: 'door', x: MAIN_DOORS }], line: 'Shields! Form up!', squad: true,
    roster: [['shield', 'baton'], ['shield', 'shield', 'shield', 'pistol'], ['shield', 'shield', 'pistol', 'pistol'], ['shield', 'shield', 'shield', 'pistol', 'pistol', 'baton']], firstAlone: [true, true, false, false] },
  o1: { from: [{ kind: 'edge', dir: 1 }, { kind: 'ledge', x: 1300 }, { kind: 'placed', x: 1290 }], line: 'He came through the Private door!',
    roster: [['baton', 'baton', 'billhook'], ['baton', 'baton', 'baton', 'billhook', 'pistol'], ['baton', 'baton', 'billhook', 'billhook', 'shield', 'pistol', 'pistol'], ['baton', 'baton', 'baton', 'billhook', 'billhook', 'shield', 'shield', 'pistol', 'pistol']] },
  o2: { from: [{ kind: 'placed', x: 1400 }, { kind: 'placed', x: 1478 }, { kind: 'ledge', x: 1460 }], behindGlass: true,
    roster: [['pistol', 'baton'], ['pistol', 'pistol', 'shield', 'baton'], ['pistol', 'pistol', 'shield', 'shield', 'baton'], ['pistol', 'pistol', 'pistol', 'shield', 'shield', 'baton', 'baton']] },
  yard2: { from: [{ kind: 'edge', dir: 1 }, { kind: 'placed', x: 1720 }, { kind: 'edge', dir: -1 }], line: 'Overwatch has him. Painting now.',
    roster: [['baton', 'baton'], ['shield', 'baton', 'baton', 'spotter'], ['shield', 'shield', 'baton', 'spotter'], ['shield', 'shield', 'baton', 'baton', 'spotter']] },
  gantry: { from: [{ kind: 'placed', x: 1966, y: GANTRY.y }], roster: [[], ['shield'], ['shield', 'baton'], ['shield', 'shield']] },
  drop: { from: [{ kind: 'placed', x: 2050 }, { kind: 'placed', x: 2096 }, { kind: 'placed', x: 1990 }, { kind: 'placed', x: 2140 }],
    roster: [['baton', 'pistol'], ['baton', 'pistol', 'baton'], ['baton', 'pistol', 'baton'], ['baton', 'pistol', 'baton', 'pistol']] },
  volley: { from: [{ kind: 'edge', dir: 1 }, { kind: 'ledge', x: 2200 }, { kind: 'placed', x: 2230 }], line: 'Riot squad! Hold the nave!',
    roster: [['baton', 'baton', 'shield'], ['baton', 'baton', 'shield', 'shield', 'spotter'], ['baton', 'baton', 'shield', 'shield', 'pistol', 'pistol', 'spotter'], ['baton', 'baton', 'baton', 'shield', 'shield', 'shield', 'pistol', 'pistol', 'spotter']] },
  brandtAdds: { from: [{ kind: 'edge', dir: 1 }], roster: [[], ['baton'], ['baton'], ['baton']] },
};
// the snipers (docs 4: off-screen emitters): nests high above; dots active by room; lock by difficulty; the round's damage
export const SNIPER = {
  nests: { water: { x: 1500, y: -420 }, trees: { x: 2300, y: -380 }, north: { x: 2900, y: -460 } },
  rooms: { boiler: ['water'], nave: ['water', 'trees'], dome: ['trees', 'north', 'water'] },
  max: [1, 2, 2, 3], lock: [1.2, 0.9, 0.75, 0.6], search: 1.2, lag: 0.35, vmax: 180, cd: 2.5, dmg: [20, 30, 30, 35], hitR: 6,
  spot: 0.7, spotOut: 10, palm: 2, goonDmg: 40, bossDmg: 60, bossStun: 1.5,
  dots: { yard2: [1, 1, 2, 2], nave: [1, 2, 2, 3], brandt: [0, 0, 1, 1] }, slowE: 1.5,
};
// the set pieces
export const TOWER = { slip: 8, r: 30 };                                 // a champagne tower: a slip zone 60 px wide for 8 s
export const CHAND = { warn: 1.0, dmg: 50, r: 25 };
export const STEAM = { t: 1.5, r: 25, dmg: 6 };
export const STATUE = { len: 70, dmg: 60 };
export const DROP = { slow: 1.6, fall: 0.9 };                            // the Drop: slow motion (s, sim) as he falls through the skylight
export const VOLLEY = { at: 2080, ids: [4, 5, 6, 7, 8, 9], gap: 0.15, slow: 2.0 };
export const ALARM = { radio: 12 };                                     // a yard goon who lives 12 s after he sees the hero radios in
// drops (docs/drops.md): pistols stand for a hero gun on later waves; riot squads drop the shotgun now and then
export const DROPS = {
  carry: { pistol: ['shotgun'] },
  tier: { volley: ['shotgun', 'mg'], drop: ['shotgun'], o2: ['shotgun'] },
};
