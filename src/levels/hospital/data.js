// Level 5, "St. Cecilia" (docs/levels/05-st-cecilia.md): the level's data. Level id `hospital`.
// The plan's 3600 px strip is folded into the engine's 2800 x 320 world, as Pier 9 and Line Zero fold theirs. Walls part the floors;
// stair doors (↑ by one) join them. The roof (boss phase 3) is the game's "club", behind the theatre's stair door (x 2414).
//   ward 0-392 · isolation wing 400-1000 · morgue (B1) 1008-1484 · ER and bay (G) 1492-2062 · theatre (4F) 2070-2414 · roof 2436-2800
// All arrays "by difficulty" are [Easy, Medium, Hard, Wicked].

export const GROUND = 280;
const hy = h => GROUND - h;

// ---- the map ----
// amb: ambient light [r, g, b]; lit: after the power comes back; dark: the torch lights the way, goons far from light show as eyes;
// out: outdoors (rain); flash: lightning every [a, b] s through its windows (null: none); g: the camera group (walls part the groups)
export const SECTIONS = [
  { id: 'ward', x0: -99, x1: 396, amb: [0.17, 0.12, 0.14], lit: [0.5, 0.52, 0.5], dark: true, flash: [6, 10], g: 0 },
  { id: 'iso', x0: 396, x1: 1004, amb: [0.06, 0.07, 0.09], dark: true, flash: [5, 9], g: 0 },
  { id: 'morgue', x0: 1004, x1: 1488, amb: [0.08, 0.1, 0.15], lit: [0.2, 0.17, 0.15], dark: true, flash: null, g: 1 },
  { id: 'er', x0: 1488, x1: 1822, amb: [0.42, 0.45, 0.48], flicker: true, flash: [5, 9], g: 2 },
  { id: 'bay', x0: 1822, x1: 2066, amb: [0.3, 0.32, 0.4], out: true, flash: [5, 9], g: 2 },
  { id: 'theatre', x0: 2066, x1: 2420, amb: [0.34, 0.36, 0.38], flash: null, g: 3 },
  { id: 'roof', x0: 2420, x1: 2900, amb: [0.14, 0.16, 0.22], out: true, flash: [3, 6], g: 4 },
];
export const GROUPS = [[0, 1004], [1008, 1484], [1492, 2062], [2070, 2414], [2436, 2800]];   // the camera's bounds; the walls between them
export const WALLS = [1004, 1488, 2066];   // nobody walks through these (the doors are the way)

// the ward (3F): Room 314, the nurse station, the payphone
export const WARD_STAIR = 18;             // the stair door (↑): after a defend it takes him back where he came from
export const PAYPHONE = 58;
export const WARD_WIN = [100, 330];       // rain-streaked windows (lightning shows through them)
export const ROOM314 = { x0: 120, x1: 258 };
export const BED = { x0: 150, x1: 200, x: 175, top: hy(26) };   // Mags's bed: a goon in [x0 - 8, x1 + 8] can start the inject
export const MONITOR = { x: 136, y: hy(58) };
export const NERO = { x: 214, hold: 238, hp: 100, down: 8, pin: [4, 4, 4, 3], holdCd: [3, 4, 4, 5] };
export const VENT = { x: 205, y: 150 };
export const NURSE = { x0: 292, x1: 352, top: hy(30) };          // the nurse station's counter (its top is a ledge)
export const TORCH_X = 322;
export const EAST_DOOR = 386;
// the isolation wing (3F, closed): quarantine sheets, the walkway, the fishbowl cubicles, the gurney corridor, Ward 5, the dead lift
export const SHEETS = [424, 498];
export const WALKWAY = { x0: 432, x1: 540, y: hy(84) };          // the maintenance walkway (one-way)
export const CAB = { x0: 540, x1: 562, top: hy(42) };            // a supply cabinet: the step up to the walkway
export const FISH = [{ id: 'fish1', x0: 574, x1: 626 }, { id: 'fish2', x0: 636, x1: 688 }, { id: 'fish3', x0: 698, x1: 750 }];
export const FISH_Y = [hy(76), hy(4)];
export const GURNEY = { x: 790, w: 40, top: hy(24), stop: 858, v: 210 };   // the ride: from x to stop at v px/s, then the dive through Ward 5's pane
export const WARD5 = { x: 874, room: [880, 962], row: [902, 926, 950] };
export const ISO_STAIR = 972;
export const SHAFT = 990;                 // the dead service lift: ↑ pries the doors, then the drop into the morgue
// the morgue (B1): drawers, autopsy tables, the axe case, the cold room, the generator hall
export const MORGUE_STAIR = 1022;
export const SHAFT_LAND = 1056;
export const DRAWERS = { x0: 1068, x1: 1188, rows: 3, cols: 6, y0: hy(66), y1: hy(10) };
export const DRAWER_X = [1084, 1128, 1172];
export const TABLES = [{ x0: 1120, x1: 1150 }, { x0: 1200, x1: 1230 }];
export const TABLE_TOP = hy(28);
export const AXE_CASE = { x: 1246, w: 16, h: 30, hp: 10 };
export const COLD_DOOR = 1268;
export const PORTER_ARENA = { x0: 1278, x1: 1478 };
export const GENERATOR = { x0: 1396, x1: 1452 };
export const LEVER = 1468;
// the ER (G): triage desk, curtain bays, the security office, the sliding doors; the ambulance bay outside
export const ER_STAIR = 1504;
export const TRIAGE = { x0: 1530, x1: 1590, top: hy(32) };
export const CURTAINS = [{ x0: 1680, x1: 1720 }, { x0: 1724, x1: 1764 }];
export const SEC = { pane: 1774, x0: 1778, x1: 1812, mg: 1796 };
export const SLIDE = 1818;
export const CANOPY = { x0: 1830, x1: 1934, y: 200 };
export const CROSS = { x: 1882, y: 150 };
export const AMB = { x0: 1960, x1: 2034, top: hy(44), doors: 1956 };
export const LIFT = 2050;                 // the trauma lift (↑ once the bay is clear): up to the theatre
// the theatre (4F): the scrub room and the clock, the gallery, the operating table, the beds, the breaker box, the roof stair
export const LIFT_OUT = 2088;
export const CLOCK = { x: 2098, y: 188 };
export const SCRUB_CAB = { x0: 2112, x1: 2130, top: hy(40) };
export const GALLERY = { x0: 2132, x1: 2236, y: hy(84) };
export const GALLERY_PANE = { x: 2238, y0: 152, y1: hy(85) };
export const SCRUB_DOOR = 2124;            // the crew comes in through the scrub room
export const ARENA = { x0: 2120, x1: 2406 };
export const OR_TABLE = { x0: 2300, x1: 2340, top: hy(30) };
export const OR_LAMP = { x: 2320, y: 154 };
export const BREAKER = { x: 2400, y: 226 };
export const ROOF_STAIR = 2412;
export const CLERESTORY = { x0: 2270, x1: 2400, y0: 112, y1: 144 };
// the roof (the club): the stair hut, the helipad, puddles, the mast and its dais, the windsock
export const HUT = { x0: 2440, x1: 2494, top: hy(52) };
export const PAD = { x0: 2520, x1: 2740 };
export const MAST = { x: 2772, dais: { x0: 2762, x1: 2784, top: hy(12) } };
export const WINDSOCK = { x: 2792, y: 196 };
export const ROOF_ARENA = { x0: 2446, x1: 2788 };

// water on the floor: slow = move speed factor; live: a shock there fills the whole zone (the roof); splash: footsteps splash
export const WATER = [
  { id: 'mp1', x0: 1160, x1: 1196, slow: 0.9 }, { id: 'mp2', x0: 1300, x1: 1340, slow: 0.9 },
  { id: 'rp1', x0: 2500, x1: 2540, slow: 0.95, live: true }, { id: 'rp2', x0: 2610, x1: 2670, slow: 0.95, live: true }, { id: 'rp3', x0: 2716, x1: 2752, slow: 0.95, live: true },
];
// glass: x0..x1 (a vertical pane is 4 px wide), y0..y1; hp; blocks: a wall until broken ('off': only while the power is out);
// back: a back-lane pane (the fishbowl: a blow near it breaks it); onBreak: what it lets out
export const PANES = [
  { id: 'fish1', x0: 574, x1: 626, y0: FISH_Y[0], y1: FISH_Y[1], hp: 40, back: true },
  { id: 'fish2', x0: 636, x1: 688, y0: FISH_Y[0], y1: FISH_Y[1], hp: 40, back: true },
  { id: 'fish3', x0: 698, x1: 750, y0: FISH_Y[0], y1: FISH_Y[1], hp: 40, back: true },
  { id: 'ward5', x0: WARD5.x - 2, x1: WARD5.x + 2, y0: 196, y1: GROUND - 1, hp: 80, blocks: true },
  { id: 'axeCase', x0: AXE_CASE.x - 8, x1: AXE_CASE.x + 8, y0: hy(38), y1: hy(8), hp: 10, back: true },
  { id: 'secOffice', x0: SEC.pane - 2, x1: SEC.pane + 2, y0: 214, y1: GROUND - 1, hp: 30, blocks: true },
  { id: 'erDoors', x0: SLIDE - 2, x1: SLIDE + 2, y0: 210, y1: GROUND - 1, hp: 50, blocks: 'off' },
  { id: 'gallery', x0: GALLERY_PANE.x - 2, x1: GALLERY_PANE.x + 2, y0: GALLERY_PANE.y0, y1: GALLERY_PANE.y1, hp: 30, blocks: true },
];

// ---- surfaces (ledges) ----
export function surfaces() {
  return [
    { x0: NURSE.x0, x1: NURSE.x1, y: NURSE.top },
    { ...WALKWAY, oneWay: true },
    { x0: CAB.x0, x1: CAB.x1, y: CAB.top },
    { x0: TABLES[0].x0, x1: TABLES[0].x1, y: TABLE_TOP, oneWay: true },
    { x0: TABLES[1].x0, x1: TABLES[1].x1, y: TABLE_TOP, oneWay: true },
    { x0: TRIAGE.x0, x1: TRIAGE.x1, y: TRIAGE.top },
    { x0: AMB.x0, x1: AMB.x1, y: AMB.top },
    { x0: SCRUB_CAB.x0, x1: SCRUB_CAB.x1, y: SCRUB_CAB.top },
    { ...GALLERY, oneWay: true },
    { x0: OR_TABLE.x0, x1: OR_TABLE.x1, y: OR_TABLE.top, oneWay: true },
    { x0: HUT.x0, x1: HUT.x1, y: HUT.top },
    { x0: MAST.dais.x0, x1: MAST.dais.x1, y: MAST.dais.top },
  ];
}

// ---- props and pickups ----
// chair: a wheelchair (kick it along; an Orderly shoves one at you); barrel: an oxygen tank (oxy: hit or shot, it hisses 1 s, then a
// 60 px blast); can: an instrument tin; knife: a scalpel (pocket it, throw it)
export const OBJ_START = [
  ['chair', 112, GROUND], ['barrel', 368, GROUND, { oxy: true }], ['can', 300, NURSE.top],
  ['can', 552, CAB.top], ['knife', 548, CAB.top], ['barrel', 610, GROUND, { oxy: true }],
  ['knife', 1130, TABLE_TOP], ['knife', 1140, TABLE_TOP], ['can', 1210, TABLE_TOP], ['barrel', 1330, GROUND, { oxy: true }], ['barrel', 1424, GROUND, { oxy: true }],
  ['chair', 1612, GROUND], ['chair', 1660, GROUND], ['can', 1560, TRIAGE.top], ['barrel', 1900, GROUND, { oxy: true }], ['chair', 1990, GROUND],
  ['can', 2270, GROUND], ['knife', 2276, GROUND], ['barrel', 2160, GROUND, { oxy: true }], ['knife', 2392, GROUND],
];
// weapons on stands; hidden: behind glass until it breaks
export const PICKUPS = [
  { w: 3, x: 772 },                          // the shotgun by the gurney
  { w: 2, x: AXE_CASE.x, hidden: 'axeCase' }, // the fire axe in its glass case
  { w: 4, x: SEC.mg, rack: true },           // the machine gun in the security office (behind its glass door)
];
// small things of the level's own: walk over them (the torch: the light in the dark; adrenaline: clears sedation, 5 s immune)
export const ITEMS = [
  { id: 'torch', x: TORCH_X, y: NURSE.top },
  { id: 'adren', x: 760, y: GROUND },
  { id: 'band', x: 300, y: GROUND, band: true }, { id: 'band2', x: 766, y: GROUND, band: true }, { id: 'ammo1', x: 520, y: GROUND, ammo: true },
  { id: 'band3', x: 1262, y: GROUND, band: true },
  { id: 'band4', x: 1606, y: GROUND, band: true }, { id: 'ammo2', x: 1806, y: GROUND, ammo: true },
];

// ---- the Orderlies (docs/levels/05-st-cecilia.md 4) ----
// looks: src/sim/enemies/roster.js LOOK format
export const LOOKS = {
  scrubs: { build: 'stocky', top: 'jacket', hair: ['short', 'bald'], beards: ['none', 'stubble'], cols: [['#d8e4dc', '#b4c4ba'], ['#e6ece8', '#c0cac4']], pants: ['#c8d8ce'], boots: '#e8ece8' },
  strapper: { build: 'buff', top: 'tank', hair: ['bald', 'short'], beards: ['stubble', 'chin'], cols: [['#d0dcd4', '#a8b8ae']], pants: ['#c0d0c6'], boots: '#e8ece8', apron: '#6a4a2e' },
  nurse: { build: 'lean', top: 'jacket', hair: ['cap'], beards: ['none'], cols: [['#a8d0b8', '#86b098']], pants: ['#a8d0b8'], hairC: '#a8d0b8', boots: '#e8ece8' },
  intern: { build: 'lean', top: 'coat', hair: ['short'], beards: ['none', 'stubble'], cols: [['#eceae4', '#c8c4ba']], pants: ['#4a5060'], boots: '#1a1a1e' },
  surgeon: { build: 'tall', top: 'jacket', hair: ['cap'], beards: ['none', 'stache'], cols: [['#7aa898', '#5a8878']], pants: ['#7aa898'], hairC: '#7aa898', apron: '#3a2a20', boots: '#1a1a1e' },
  anaes: { build: 'tall', top: 'jacket', hair: ['cap'], beards: ['none'], cols: [['#6a90b8', '#4e7096']], pants: ['#6a90b8'], hairC: '#6a90b8', boots: '#e8ece8' },
  guard: { build: 'stocky', top: 'jacket', hair: ['cap'], beards: ['stache', 'full'], cols: [['#6a6e78', '#4e5258']], pants: ['#3a3c44'], hairC: '#3a3c44', boots: '#141418' },
  porter: { build: 'buff', top: 'tank', hair: ['bald'], beards: ['full'], cols: [['#c8c0a8', '#a09880']], pants: ['#3a4a5a'], boots: '#141418', apron: '#4a5a6a' },
  krieg: { build: 'tall', top: 'coat', hair: ['short'], beards: ['none'], cols: [['#d8dcd4', '#aeb4aa']], pants: ['#2a2a30'], hairC: '#8a8a8a', boots: '#141418', apron: '#3a3a44', skin: ['#d8c0a8', '#b09880'] },
};
// variant -> base role and look; the behaviour row (each one needs a different answer):
//   push: an Orderly kicks a wheelchair at you from range (0.5 s tell: he grips it)        -> step out of its line, or jump it
//   strap: a Restrainer's strap grab (0.6 s reach tell), then a hold                       -> dodge the reach, or hit him in it; held: mash Q/W/Space
//   sed: a Syringe Nurse's hit adds a sedation stack (slow); he carries a penlight         -> keep him out of reach; adrenaline, or dodge taps
//   pair: a Scalpel Intern throws scalpels in pairs from high places; drops 2 scalpels     -> climb to him or wait for him to come down
//   grind: a Bone Surgeon's saw rev (0.5 s), then a 3-tick grind; a miss jams the saw      -> dodge the rev, punish the jam
//   proj 'dart': an Anaesthetist's dart pistol (3, then a 2 s reload), +1 sedation a hit  -> rush him while he reloads; beds block darts
//   flee: Security runs at 30 % health when he is the last one left                         -> chase him, or let him go
export const ORDERLIES = {
  orderly: { role: 'brawler', look: 'scrubs', type: 'Orderly', weapon: null, push: { windup: 0.5, near: [50, 200], cd: 6 } },
  restrainer: { role: 'brawler', look: 'strapper', type: 'Restrainer', weapon: null, hpK: 1.2, spdK: 0.9, strap: { windup: 0.6, hold: 1.5, mash: [3, 4, 5, 6], cd: 4, reach: 20 } },
  syringe: { role: 'knife', look: 'nurse', type: 'Syringe Nurse', weapon: 'knife', R: { w: 'syringe', len: 5, reach: 20 }, dmgK: 0.7, sed: 1, light: 'pen' },
  scalpel: { role: 'thrower', look: 'intern', type: 'Scalpel Intern', weapon: 'tknife', pair: true, perch: true },
  bonesaw: { role: 'machete', look: 'surgeon', type: 'Bone Surgeon', weapon: null, R: { w: 'bonesaw', len: 9, reach: 23 }, hpK: 1.1, grind: { n: 2, dmg: 7, gap: 0.16 }, jam: 1.2, max: [1, 1, 2, 2] },
  anaesthetist: { role: 'pistol', look: 'anaes', type: 'Anaesthetist', weapon: null, proj: 'dart', clip: 3, reload: 2, gap: 0.5, light: 'head', dmg: 4 },
  security: { role: 'pistol', look: 'guard', type: 'Security', weapon: 'pistol', flee: 0.3 },
};
export const NAMES = ['Brandt', 'Ostrova', 'Pell', 'Lindqvist', 'Moreau', 'Vasko', 'Haller', 'Dunne', 'Iversen', 'Roche', 'Kade', 'Sorel', 'Abend', 'Faulk', 'Greer', 'Nadel', 'Weiss', 'Crane', 'Tolle', 'Vey'];
export const SED_SRC = new Set(['syringe', 'anaesthetist']);
export const SED_CAP = [2, 2, 3, 3];   // sedation sources (Syringe Nurses and Anaesthetists) alive at once
export const LINES = ['The Sandman...', 'Hold him down.', 'Visiting hours are over.', 'Code Black.', 'Doctor wants him alive. Mostly.'];

// waves: roster by difficulty; from: spawn sources (kind 'door' x | 'vent' | 'sheet' x | 'ledge' x | 'cubicle' i | 'placed' x |
// 'drawer' x | 'amb' (the ambulance's doors) | 'ambroof' | 'edge' dir); a source is used in turn (i % from.length).
// defend: the goons go for Mags's bed; reinf: more on Hard and Wicked when half are down
export const WAVES = {
  d1: { defend: true, from: [{ kind: 'door', x: EAST_DOOR }], roster: [['orderly', 'orderly'], ['orderly', 'orderly', 'syringe'], ['orderly', 'orderly', 'orderly', 'syringe', 'restrainer'], ['orderly', 'orderly', 'orderly', 'syringe', 'syringe', 'restrainer']] },
  w3: { from: [{ kind: 'sheet', x: SHEETS[1] }, { kind: 'sheet', x: SHEETS[0] }, { kind: 'ledge', x: 500 }], line: 'The Sandman. In the closed wing.',
    roster: [['orderly', 'syringe'], ['orderly', 'orderly', 'syringe', 'scalpel'], ['orderly', 'orderly', 'syringe', 'syringe', 'scalpel'], ['orderly', 'orderly', 'orderly', 'syringe', 'syringe', 'scalpel']], then: 'w3b' },
  w3b: { reinf: true, from: [{ kind: 'sheet', x: SHEETS[1] }], roster: [[], [], ['orderly'], ['orderly', 'syringe']] },
  w4: { cubicles: true, roster: [['orderly', 'orderly'], ['orderly', 'orderly', 'orderly'], ['orderly', 'orderly', 'orderly', 'anaesthetist'], ['orderly', 'orderly', 'orderly', 'orderly', 'anaesthetist']], stagger: 2.5 },
  w5: { placed: true, corridor: [['orderly', 'orderly'], ['orderly', 'orderly'], ['orderly', 'orderly', 'orderly'], ['orderly', 'orderly', 'orderly']],
    ward5: [['syringe', 'bonesaw', 'scalpel'], ['syringe', 'bonesaw', 'scalpel'], ['syringe', 'bonesaw', 'scalpel'], ['syringe', 'bonesaw', 'scalpel', 'orderly']] },
  d2: { defend: true, from: [{ kind: 'door', x: EAST_DOOR }, { kind: 'vent' }],
    roster: [['orderly', 'syringe'], ['orderly', 'orderly', 'syringe', 'restrainer'], ['orderly', 'orderly', 'syringe', 'restrainer', 'syringe'], ['orderly', 'orderly', 'syringe', 'restrainer', 'syringe', 'restrainer']],
    vent: ['syringe'], ventW: ['bonesaw'] },
  w7: { from: [{ kind: 'drawer' }], roster: [['orderly', 'orderly', 'syringe'], ['orderly', 'orderly', 'syringe', 'bonesaw'], ['orderly', 'orderly', 'orderly', 'syringe', 'bonesaw'], ['orderly', 'orderly', 'orderly', 'syringe', 'syringe', 'bonesaw']], then: 'w7b' },
  w7b: { reinf: true, from: [{ kind: 'drawer' }], roster: [[], [], ['orderly'], ['orderly', 'syringe']] },
  porterAdds: { from: [{ kind: 'door', x: COLD_DOOR }], roster: [[], ['orderly'], ['orderly'], ['orderly', 'orderly']] },
  d3a: { defend: true, from: [{ kind: 'door', x: EAST_DOOR }, { kind: 'ledge', x: 330 }], roster: [['orderly', 'orderly'], ['orderly', 'scalpel', 'orderly'], ['orderly', 'scalpel', 'orderly', 'orderly'], ['orderly', 'scalpel', 'orderly', 'orderly']] },
  d3b: { defend: true, from: [{ kind: 'vent' }], roster: [['syringe'], ['syringe', 'restrainer'], ['syringe', 'syringe', 'restrainer'], ['syringe', 'syringe', 'restrainer']] },
  d3c: { defend: true, from: [{ kind: 'door', x: WARD_STAIR }], roster: [[], ['bonesaw'], ['bonesaw', 'anaesthetist'], ['bonesaw', 'bonesaw', 'anaesthetist']] },
  w11a: { from: [{ kind: 'edge', dir: 1 }, { kind: 'edge', dir: 1 }, { kind: 'edge', dir: -1 }, { kind: 'ledge', x: 1560 }], line: "He's in the ER! Lock the doors!",
    roster: [['orderly', 'orderly', 'syringe', 'security'], ['orderly', 'orderly', 'orderly', 'syringe', 'security', 'scalpel'], ['orderly', 'orderly', 'orderly', 'syringe', 'syringe', 'security', 'security', 'scalpel'], ['orderly', 'orderly', 'orderly', 'orderly', 'syringe', 'syringe', 'security', 'security', 'scalpel']], then: 'w11c' },
  w11c: { reinf: true, from: [{ kind: 'edge', dir: 1 }, { kind: 'edge', dir: -1 }], roster: [[], [], ['orderly', 'security'], ['orderly', 'orderly', 'security']] },
  // the bay: Rule 3 (no strap grab with a saw in one sub-wave on Easy and Medium) puts an Orderly where the plan had a Restrainer on Medium
  w11b: { from: [{ kind: 'amb' }, { kind: 'amb' }, { kind: 'ambroof' }], roster: [['bonesaw'], ['bonesaw', 'orderly', 'anaesthetist'], ['bonesaw', 'restrainer', 'anaesthetist'], ['bonesaw', 'bonesaw', 'restrainer', 'anaesthetist']] },
};
// the defends: the warning (s) after the bark before the goons come; the sub-wave chain for D3 (next one when the last has `left`
// alive or after `orT` s); Mags's hearts; the inject (s) and the push back after one
export const DEFEND = {
  warn: { d2: [20, 15, 12, 10], d3: [22, 16, 13, 11] },
  chain: { left: 1, orT: 15 }, d3cDark: 4,
  hearts: [4, 3, 3, 3], inject: [4.0, 3.0, 3.0, 2.5], push: 60,
};
// sedation (docs 5.4): stack life (s), move factor and attack slow by stacks; adrenaline immunity; a dodge tap trims the timer
export const SED = { life: [3, 4, 4, 5], move: [1, 0.8, 0.65, 0.55], immune: 5, tap: 0.3, stagger: 1.0 };
// drops (docs/drops.md): only the guards' revolvers stand for a hero gun; the saw is not a hero weapon
export const DROPS = {
  carry: { pistol: ['shotgun'] },
  tier: { w11a: ['shotgun', 'mg'], w11b: ['shotgun', 'mg'], w11c: ['shotgun', 'mg'] },
};
// the power: the ER's tubes fail when lightning hits the building (every, for)
export const POWER = { erFail: { every: [14, 20], t: [3, 5] } };
// lightning: the flash (s) and its afterglow; thunder comes 0.3-2 s after
export const LIGHTNING = { flash: 0.15, glow: 0.6, thunder: [0.3, 2] };
// the oxygen tank: its fuse once hit (s), the blast
export const OXY = { fuse: 1.0, r: 60, dmg: 30, heroDmg: [18, 22, 26, 30], stunBoss: 2 };
// the gurney ride's slow motion (s, sim) and the dive's auto-aim
export const DIVE = { t: 0.9, slow: 2.5, aim: 3 };
