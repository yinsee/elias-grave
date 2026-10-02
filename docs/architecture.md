# Elias Grave: Architecture and Modularization Plan

Status: proposal (2026-10-02). Source reviewed: `ragdoll.html` (about 8,000 lines: HTML, CSS and one inline script), plus `tools/comfy.py` (the ComfyUI client). The project is under git; the baseline is committed.

Goals: separate assets, models, physics, level design and everything else; support 8 new data-driven levels with bosses, glass rooms, movers and cutscenes; keep 2D and 3D on one shared simulation (only 3D models and materials may be 3D-only); keep it a static web app.

---

## 1. Map of today's code

### 1.1 Layout of `ragdoll.html`

| Lines | Subsystem | Key names |
|---|---|---|
| 1-211 | CSS | `:root` vars, HUD, menu, toast, card, results |
| 213-317 | HTML shell | `#stage-canvas`, `#three-canvas`, `#tut #toast #card #say #results #title #menu`, HUD (`#hp-fill #bossbar #feed #w-icon #ammo #pocket #regen`), dev panel |
| 318 | three.js r0.160 UMD from a CDN (global `THREE`) | |
| 319-8005 | One IIFE, sloppy mode, about 660 top-level declarations, 61 top-level `let`s | |
| 321-401 | Constants, canvas, pixel primitives | `W H GROUND CW CHMAX CH DT G`, `buf`, `PAL`, `camX camY VW VH`, `plot plotV disc seg line1 snap rng`, `pickMask` |
| 403-510 | Level collision geometry (street-specific) | `GROUND_S GOAL KIOSK_X PLATS TRAMPS STEPS STAIR_X0/X1 PEDESTALS SIGNS SURF`, `floorBelow supportAt bodyFloor stairStep`, `LANE laneOf laneTick objLane` |
| 511-839 | Street look and the static world layer | `LAMPS WINL FEAT VPARTS HOUSEWIN DOORS ALLEYS CARDOORS CLUB_DOORS STREET_END`, `EMIT`, `PUDDLE`, `PROPS`, `STAT_BG`, the `stat` IIFE (facades, cars, scaffold, bar, kiosk, lamps, fire escape) |
| 840-1002 | Backdrop | `SKY STARS cityLayer LAYERS drawClub drawBackdrop drawSky` |
| 1003-1110 | Glass and residents | `glassReflect GLASS_C glassMask drawGlass`, `noise houseWinStep drawHouseWindows` |
| 1111-1433 | Skeleton and animation data | `NAMES mod ik fk IDLE GUARD ... MOVES WEAPONS P CONSTRAINTS solveDist hinge` |
| 1475-1871 | Objects | `KINDS OBJ_START objs makeObj removeObj damageObj shatterObj carryStep throwCarry pocket tossed objStep launchObj` |
| 1872-2003 | Weapon geometry and guns | `weaponGeom armIK holdGun fire bulletStep slam` |
| 2004-2155 | Blood | `GORE BLOOD VEH BPOOL stain gore goreFade drips bloodFlow bleed bodyStain` |
| 2156-3039 | Enemies | `ROLE ETYPE EMOVES DIFFS spawnEnemy knockDown hurtPlayer damageEnemy killEnemy eRagStep goonThink rangedThink bossThink bossSpecial enemyStep`, plus their drawing |
| 3040-4105 | Hero | state (`mode act ctl input weapon charge ammoBoxes thrown gun`), actions, `animStep` (about 330 lines), `ragStep`, secondary motion, `step(dt)`, `reset` |
| 4107-4360 | Tutorial and run | `ZONES WAVES tut tutGate toast runS secondWind tutTick pickups` |
| 4360-4700 | Demo AI | `DEMO demoBrawl demoBoss demoFight demoTick` |
| 4702-5211 | 2D character draws, club transition, set dressing | `poseTick drawCharacter drawObj enterClub clubTick crowdReact` |
| 5212-5566 | Weather, light, `render()`, camera | `rain lightPass lightList reflectPass render autoZoom updateCamera fit` |
| 5568-7305 | Three3D | `t3mat t3voxels t3lathe t3vehicle t3weaponGeo t3capture`, `buildWorld buildWindows buildFighters buildModels updateLayers frame` |
| 7307-8005 | Input, opening/ending, dog, menu, settings, HUD, `frame()`, boot | |

### 1.2 Globals everything touches (reference counts)

`ctl.` 425 · `GROUND` 228 · `club` 119 · `Math.random` 115 · `boss` 105 · `P[` 89 · `mode` 83 · `camX` 78 · `simTime` 59 · `buf` 49 · `GOAL` 39 · `tut(` 34 · `demo` 32. There are also 47 hard-coded world x-coordinates in the 2000s.

### 1.3 Order-of-init traps

1. `let Three3D = null` sits early only because `fit()` runs during load and calls `Three3D.resize()`.
2. `resetTutorial()` uses `weaponBtns`, declared much later. It works only because `reset()` never runs during load.
3. `sceneBox` contains `typeof eshots !== 'undefined'`, an old guard against the temporal dead zone.
4. `resetObjs()` runs during load and pushes object surfaces into the level's `SURF`.
5. The `stat` painter has side effects: it fills `STAT_BG, FEAT, VPARTS, HOUSEWIN, WINL, DOORS, ALLEYS, CARDOORS`. Spawn points and the whole 3D world depend on it.
6. `EMOVES` (enemy attacks) is cloned from the hero's `MOVES` and rewritten by `eTrim` during load.
7. `P`, `D/Dh/Dp`, `hair`, `pickups` and `dancers` are built during load at street coordinates.

### 1.4 Functions that mix sim, render and UI

- **`render()` mutates the simulation.** It calls `laneTick()` (writes `ctl.lane`, `e.lane`, `o.lane`, read by the sim one frame late) and `poseTick()` (builds `D`, which the 3D rig reads). The 3D view works only because `render()` runs first and returns early in 3D mode.
- **`frame()` runs gameplay at a variable time step, outside `step()`:** particle physics that write stains, quake shockwaves that call `hurtPlayer`, HP regen and the bandage timer, mixed with HUD DOM writes.
- **`tutTick()` does six jobs:** toasts, run stats, weapon pickup collection, wave spawning, boss and arena creation, the lesson panel HTML.
- **`killEnemy()`** mixes the kill feed (UI), crowd reactions, lessons, the boss-defeat toast, arena cleanup and drop tables. **`hurtPlayer()`** shows a toast and calls the crowd. **`hitFx()`** calls residents, crowd, hit-stop, camera kick and hair.
- **Hard-coded geometry:** `step()` uses `STREET_END` and `DOOR_X`; `enemyStep()`/`bossSpecial()` clamp at 2440/2441/2450; `lightList()` has club lights at 2600/2706/2720; `VEH` holds vehicle x-ranges for blood.
- **`Three3D.layer()` and `t3capture()`** temporarily overwrite `camX/camY/VW/VH` and the shared `buf` to reuse 2D draw code as a texture rasterizer.
- **`Three3D.buildWorld()`** reverse-engineers the 3D world from 2D pixels: it flood-fills `PROPS`, looks up depths in `ZD` indexed by `PLATS` order, and finds windows by colour.
- **Colour equality carries meaning.** `EMIT` and `GLASS_C` decide what glows and what is glass. A new palette colour equal to `WIN_A` would silently become a window.

---

## 2. Target architecture

### 2.1 Native ES modules, no build step

- `<script type="importmap">` maps `three` to a vendored `vendor/three-0.160.0/three.module.min.js`: the version is pinned, and it works offline.
- Modules need HTTP, which the project already uses (static server).
- Optional dev tooling, never needed to run: `tsc --checkJs` with JSDoc types, a level validator, smoke tests.
- Reconsider a bundler (esbuild) only if cold load passes about 2 s or the module count passes about 150.

### 2.2 Folder tree

```
index.html                  shell only (ragdoll.html kept as an alias)
css/game.css
vendor/three-0.160.0/
src/
  main.js                   boot: settings -> assets -> menu -> game loop
  core/      loop.js (fixed step, hitStop, timeScale, ?seed, ?fixed)  state.js  events.js  rng.js
             math.js  color.js  input.js (driver stack: player | demo | cutscene)  difficulty.js
  sim/       step.js (the order of one fixed step)
             physics/  verlet.js  surfaces.js  lanes.js
             hero/     skeleton.js  poses.js  moves.js  controller.js  ragdoll.js  secondary.js  combat.js
             weapons/  defs.js  melee.js  guns.js  thrown.js  pickups.js (ammo, bandages)
             objects/  kinds.js  objects.js  carry.js
             enemies/  roster.js  moves.js  spawn.js  body.js  damage.js  goon-brain.js  step.js
             boss/     runtime.js  primitives.js            (section 4)
             blood/blood.js  hazards/quakes.js
             world/    movers.js  panes.js (breakable glass)  water.js  weather.js  residents.js  crowd.js
  world/     world.js (createWorld)  material.js (per-pixel material ids)  painter.js
             painters/ facade vehicle scaffold bar lamp bench stairs kiosk container crane ...
             backdrop.js
  levels/    index.js (registry, order, unlocks)
             street/   level.js lessons.js waves.js cutscenes.js dialog.js   (today's tutorial + Club Noir)
             docks/ metro/ casino/ aquarium/ hospital/ conservatory/ train/ skyscraper/
             _testbed/ dev rooms for movers, panes, water, bosses
  bosses/    malaspina.js (port)  marchetti.js  switch.js  brask.js  kalt.js  krieg.js  vane.js  lenz.js  bell.js
  director/  director.js (triggers, waves, gates, transitions)  objectives.js  demo.js
  present/   pose.js (poseTick)  fx.js (particles)  camera.js  lights.js     shared by both renderers, not gameplay
  render2d/  raster.js (buf, view, plot, withView)  character.js enemy.js objects.js weapons.js dog.js
             effects.js world.js glass.js lighting.js reflect.js post.js frame.js
  render3d/  three.js materials.js geo.js models/ world.js windows.js fighters.js objects.js layers.js fx.js post.js frame.js
  cutscene/  panels.js (comic-panel player)  dialog.js (portrait dialog)  timeline.js (in-engine scenes)
  ui/        hud.js toast.js lessons-panel.js bossbar.js killfeed.js results.js menu.js title.js settings.js
  assets/    loader.js  manifest.js  palettes/  sprites/
  audio/     music.js  sfx.js  voice.js    (bus subscribers)
assets/      binary files (section 5)
tools/       comfy.py  quantize.py  check-levels.mjs
```

### 2.3 Main module APIs

| Module | Public API |
|---|---|
| `core/loop` | `start(state, systems)`, `setTimeScale`, `addHitStop(s)` |
| `sim/step` | `simStep(state, dt)` in a fixed order: movers, hero, objects, enemies/boss, weapons, pickups, hazards, blood, weather, residents/crowd, lanes, director |
| `world/world` | `createWorld(levelDef)` -> `{W, H, groundY, stat, statBg, props, mat, surfaces, walls, stairs, blocks, windows, panes, movers, lights, spawns, sections}` |
| `present/*` | `present.update(state, rdt)`; reads sim state only |
| `render2d/frame` | `render2d(state, present)`; `raster.withView(rect, drawFn)` is the only legal way for 3D to borrow 2D art |
| `render3d/frame` | `init(state)`, `rebuildWorld(world)`, `frame(state, present, rdt)`, `resize()` |
| `director` | `load(levelDef, state)`, `step(state, dt)` |
| `ui/*` | `mount(bus, state)`; DOM only; changes the sim only through commands (`restart`, `pause`) |
| `cutscene/*` | `play(script) -> Promise`; pushes an input driver and can pause the sim |

### 2.4 Shared game state (all gameplay; both renderers read it)

```js
// core/state.js
export function createState(levelDef, opts) {
  return {
    t: 0, timeScale: 1, hitStop: 0, paused: false, rng: rng(opts.seed),
    diff: opts.difficulty,
    flags: { demo: false, attract: false, cinematic: false },
    level: { def: levelDef, section: 'street', world: null, transition: null },
    hero: { ctl: {}, P: [], mode: 'anim', ko: false, act: null, actT: 0, hp: 100, invT: 0, bandT: 0,
            weapon: 0, charge: [0, 0, 0, 0, 0], pocket: [], carry: null, atkId: 0, lane: 2, gun: {} },
    enemies: [], boss: null, arena: null,
    objs: [], boards: [], thrown: [], bullets: [], eshots: [], ammoBoxes: [], pickups: [], tossed: [],
    hazards: { quakes: [], zones: [] },
    movers: [], panes: [],
    blood: { drips: [] },
    weather: { kind: 'rain', k: 0, goal: 0, drops: [] },
    run: { t: 0, kills: 0, dmg: 0, kos: 0, streak: 0, landed: 0, lessons: new Set(), killFeed: [] },
    input: { dir: 0, run: false, jump: false, jumpHeld: false, downHeld: false, attack: null, dash: false },
  };
}
// present (visual only, shared by both views): { D, Dh, Dp, particles, sparks, waves, flashes, spawnFx,
//   cam: { x, y, vw, vh, zoom, kick, shake }, lights }
```

Rules: sim modules take `state` and `world` as parameters. No module-level mutable `let` crosses a module boundary (`camX = ...` elsewhere becomes `present.cam.x = ...`). Only `render3d/*` owns 3D-only data (meshes, lane depths, materials).

### 2.5 Event bus

`core/events.js`: synchronous, by name, subscribers run in registration order: `bus.on(type, fn) -> off`, `bus.emit(type, payload)`.

| Event | Payload | Emitted by (today) | Listeners |
|---|---|---|---|
| `hit` | `{by, target, x, y, dir, power, dmg, zone, blade}` | `hitEnemies`, `bulletHitsEnemy`, thrown objects | feel (hit-stop, shake, camera kick), residents, crowd, audio |
| `hurt` | `{dmg, x, y, dir, heavy, outcome}` | `hurtPlayer` | feel, crowd, HUD, run stats |
| `ko` | `{perma}` | `hurtPlayer` | toast, run stats, second wind |
| `kill` | `{enemy, weapon, zone, isBoss}` | `killEnemy` | kill feed, objectives, waves, crowd, drops |
| `feat` | `'roll'`, `'sweep'`, `'pick1'` ... | the 34 `tut()` calls | objectives (lessons) |
| `noise` | `{x, loud}` | shots, hits, goon attacks | residents |
| `pickup` | `{kind, w}` | pickups | toast, HUD |
| `object:break` / `glass:break` | `{o or pane, x, y}` | objects, panes | objectives, render3d, audio, gimmicks (flood) |
| `spawn` | `{enemy, source}` | director | spawn effects, 3D doors |
| `boss:intro` / `boss:phase` / `boss:telegraph` / `boss:defeated` | `{boss, phase, move, mark}` | boss runtime | dialog, boss bar, lights, camera, crowd, audio |
| `section:enter` | `{from, to}` | director transitions | camera, weather, 3D background, objectives |
| `cutscene:start/end`, `dialog:line` | | cutscene | input lock, HUD hide, voice |
| `run:over` | `{result}` | director | results card, progress save |

Synchronous dispatch keeps timing identical during the migration. A dev-mode check warns when a UI listener writes into `state`; only director, feel and boss listeners may change the sim.

### 2.6 Per-frame data flow

```
rAF frame(now)
 ├─ input.poll(state)           driver stack: cutscene > dialog lock > demo > player
 ├─ while acc >= DT:            simStep(state, DT)  (events fire synchronously inside the step)
 ├─ present.update(state, rdt)  pose, particles, camera, lights
 ├─ mode3D ? render3d.frame(state, present) : render2d(state, present)
 └─ ui.update(state)            diffed DOM writes, toast timers
```

---

## 3. Level format

Levels are JS modules that export a plain object (painters and gimmick functions may be imported). The pure-data parts stay JSON-shaped for a future editor. `defineLevel` validates ids, ranges and asset references.

### 3.1 Schema (abridged)

```js
export default defineLevel({
  id, title, order, music,
  size: { W, H, groundY },                     // typed arrays are sized per level
  palette: 'docks',
  sections: [{ id, x0, x1, indoor, weather, ambient: [r, g, b], camera: { minZoom, maxZoom, bounds },
               backdrop: [{ type: 'sky' | 'city' | 'image' | 'wall', ... }] }],
  scene: { paint: [{ type: 'facade' | 'vehicle' | 'container' | 'crane' | 'lamp' | ..., ...params }] },
  ground: [{ x0, x1 }],                        // gaps are pits
  killY,                                        // fall into water or the void
  surfaces: [{ id, x0, x1, y, oneWay: true, lane: 'plat', depth: [z0, z1] }],
  walls: [{ x, y0, y1, id }],                   // replaces STREET_END / DOOR_X clamps
  stairs: [{ type: 'fireEscape', x0, x1, flights }],
  movers: [{ id, surface: { w, y }, path: [[x, y, t], ...], mode: 'loop' | 'pingpong' | 'onTrigger', model }],
  panes: [{ id, x0, y0, x1, y1, hp, kind: 'window' | 'tank' | 'roof' | 'mirror', depth, onBreak: 'flood' | 'shards' }],
  lights: [{ x, y, r, rgb, flicker }],
  props: [['crate', x, top], ...],
  pickups: [{ w: 'katana', x, stand: 'bench' | 'rack' }],
  start: { x, section, cutscene },
  objectives: [...],                            // lessons (tutorial) or goals (story)
  waves: { id: { at: [x, ...], roles: [...], from: 'nearestDoor' | 'offscreen', when: Trigger } },
  triggers: [{ when: Trigger, do: Action | [Action], once: true }],
  boss: { module, arena: { section, x0, x1, doors }, intro: 'dialog id', crew: { roles, every, max } },
  cutscenes: { intro, outro },
  dialog: {},
  assets: ['panel:docks_intro_*', 'portrait:marchetti_*', 'music:docks', ...],
});
// Trigger: {heroX: '>=770'} | {inSection: 'club'} | {stageDone: 6} | {killed: 'w2'} | {t: '>30'} | (state) => bool
// Action:  {spawnWave} | {toast} | {cutscene} | {dialog} | {transition: {to, fade}} | {boss: 'start'} | (state, api) => void
```

### 3.2 Example skeleton: Level 1, "Pier 9" (`src/levels/docks/level.js`)

```js
import { defineLevel } from '../../director/define.js';
import marchetti from '../../bosses/marchetti.js';
export default defineLevel({
  id: 'docks', title: 'Pier 9', order: 1, palette: 'docks',
  size: { W: 3600, H: 320, groundY: 280 },
  sections: [
    { id: 'quay', x0: 0, x1: 2900, indoor: false, weather: 'sleet', ambient: [0.45, 0.52, 0.7],
      camera: { minZoom: 0.25, maxZoom: 0.6 }, backdrop: [{ type: 'sky', set: 'dawn' }, { type: 'water', y: 284 }] },
    { id: 'hall', x0: 2960, x1: 3600, indoor: true, weather: 'none', ambient: [0.4, 0.38, 0.5], camera: { bounds: [2960, 3600] } },
  ],
  scene: { paint: [
    { type: 'warehouse', x0: 0, x1: 640, storeys: 2, doors: 3 },
    { type: 'container', x: 700, stack: 2, col: 'rust', depth: 26 },
    { type: 'crane', x: 1400, armTo: 1650 },
    { type: 'lamp', style: 'sodium', xs: [120, 480, 860, 1240] },
  ]},
  ground: [{ x0: 0, x1: 1880 }, { x0: 1960, x1: 3600 }],
  killY: 300,
  walls: [{ x: 2900, y0: 0, y1: 280, id: 'hallDoor' }],
  movers: [{ id: 'hook', surface: { w: 14, y: 150 }, path: [[1450, 150, 0], [1650, 150, 3]], mode: 'pingpong', hazard: { dmg: 18 } }],
  panes: [{ id: 'office', x0: 520, y0: 200, x1: 600, y1: 240, hp: 60, kind: 'window', depth: -30 }],
  props: [['crate', 760, 280], ['barrel', 820, 280], ['stack', 1020, 280]],
  waves: {
    w1: { at: [600, 660], roles: ['brawler', 'knife'], from: 'nearestDoor' },
    w2: { at: [1200, 1260, 1320], roles: ['pipe', 'thrower', 'pistol'], from: 'nearestDoor' },
  },
  triggers: [
    { when: { heroX: '>=560' }, do: { spawnWave: 'w1' } },
    { when: { heroX: '>=1150' }, do: { spawnWave: 'w2' } },
    { when: { heroX: '>=2880', killed: 'w2' }, do: [{ transition: { to: 'hall', fade: true } }, { boss: 'start' }] },
  ],
  boss: { module: marchetti, arena: { section: 'hall', x0: 2970, x1: 3590, doors: [3100, 3480] },
          intro: 'marchetti_intro', crew: { roles: ['knife', 'pipe', 'pistol'], every: 4, max: 8 } },
  cutscenes: { intro: 'docks_intro', outro: 'docks_outro' },
  assets: ['panel:docks_*', 'portrait:marchetti_*', 'portrait:elias_*'],
});
```

### 3.3 The current tutorial street in this format

- `size: { W: 2800, H: 320, groundY: 280 }`; sections `street` (x 0-2414, rain) and `club` (x 2436-2800, indoor, club lights from a provider).
- `scene.paint`: today's facades, vehicles (`sports | saloon | van | pickup` with their ledges, replacing `PLATS[0..6]` and `ZD`), scaffolds, the bar, benches, lamps, the club building with roof and kiosk, signs, puddles.
- `stairs`: the fire escape (replaces `STEPS`). `walls`: `streetEnd` 2414, `clubDoor` 2446, `arenaLeft` 2440.
- `props: OBJ_START`; `pickups`: the 4 benches and the club machine gun.
- `objectives`: the 8 `ZONES` with `gate: true` (today's `tutGate`) and the goon/prop refill rules.
- `waves`: `WAVES` with roles from `ZROLES`; the spawn rule (`learned or 30 s or past the middle or rushing`) becomes a named function.
- `triggers`: the roof door into the club, then the boss; boss defeated, then the ending cutscene and the results card.
- **Parity test:** painting the street through the new painters must give a byte-identical `stat` buffer (hash) to the old code.

---

## 4. Boss framework

### 4.1 Runtime (`src/sim/boss/`)

- `createBoss(def, state, arena)` returns an enemy record plus a brain. It replaces `bossThink`/`bossSpecial`; `enemyStep` still does movement, ground and strike resolution for every enemy.
- **State machine:** `intro -> neutral -> select -> telegraph -> active -> recover (punish window) -> neutral`, plus `stunned`, `phaseShift`, `dead`.
- **Phases:** `{ id, enter: { hpBelow: 0.5 } | (s) => bool, onEnter, moves: weighted table, crew, gimmick }`.
- **Move primitives** (`primitives.js`, generalized from today's code): `string(combos)`, `charge`, `leapSlam` (with `quakes`), `groundSlam`, `volley({proj: 'knife' | 'card' | 'harpoon' | 'dart'})`, `summon`, `grab`, `throwObject`, `hazard(name)`, `taunt/roar`.
- **Telegraphs are data:** `{ t, pose, mark, floor, light, cue }`. The runtime emits `boss:telegraph`; both renderers, lights and audio react. Telegraph time scales with difficulty (`t / sqrt(A)`).
- **Arena gimmick interface:** `{ init, step, onEvent, lights, hazards, draw2d, build3d, update3d }` with a context `{ state, boss, arena, bus, spawn, hurtPlayer, world, rng }`. This context is the only API a boss module sees.

### 4.2 Example: the current boss (`src/bosses/malaspina.js`)

```js
export default defineBoss({
  id: 'malaspina', name: 'Don Lucien Malaspina', title: 'Owner of Club Noir', look: 'boss',
  stats: { hp: 780, s: 1.25, m: 6, speed: 27, reach: 22, dmg: 22, heavyDmg: 30, poise: 30, windup: 0.35, cd: [0.7, 1.4] },
  intro: { walkTo: 'arena.doors[0]+56', spotlight: true, dialog: 'malaspina_intro', t: 1.7 },
  moves: {
    string: string({ combos: [['punch'], ['slam'], ['punch', 'slam'], ['punch', 'punch']] }),
    roar:   roar({ t: 1.1 }),
    charge: charge({ windup: 0.7, v: 215, maxT: 1.1, wallStun: 1.5 }),
    jslam:  leapSlam({ windup: 0.55, quake: { v: 165, life: 1.25, dmg: 16 } }),
  },
  phases: [
    { id: 1, moves: { string: 1 } },
    { id: 2, enter: { hpBelow: 0.5 }, onEnter: ['roar', { speed: 31, cd: [0.5, 1.0], windup: 0.3 }],
      big: { every: [4.5, 7], pick: { charge: 0.5, jslam: 0.5 } } },
  ],
  crew: { every: 3, everyPh2: 4.5, max: 10, alive: 4, roles: 'arena' },
  secondWind: { afterKOs: 2, clearCrew: true },
  gimmick: clubLights,
});
```

### 4.3 The eight story bosses (from `docs/story-bible.md`), built from the same primitives

| Level | Boss | Gimmick | Built from |
|---|---|---|---|
| 1 Pier 9 | Sal Marchetti | Swinging frozen tuna on a conveyor, ice floor, freezer fog | mover hazard + `grab` (meat hook) + friction zone + light override |
| 2 Line Zero | Switch Varga | Trains cross the arena (headlight telegraph), live third rail, handcar phase | lane hazard + mover + `volley('spike')` |
| 3 House Always Wins | Count Brask | Hall of mirrors (decoys; smash mirrors), roulette floor | panes `kind: 'mirror'` + decoy actors + `volley('card')` |
| 4 The Leviathan | Nerissa Kalt | Missed harpoons crack the tunnel; staged flood; catwalks | `glass:break` -> `world/water` + `volley('harpoon')` |
| 5 St. Cecilia | Dr. Krieg | Blackout; seen only in lightning; rolling beds as cover | `lights()` override + movers + slow debuff |
| 6 The Palm House | Commissioner Vane | Sniper dots through the glass; panes rain down; whistle waves | panes `kind: 'roof'` + floor telegraphs + `summon` |
| 7 Last Train | Viktor Lenz | Metronome-timed attacks on a train roof; tunnels force a duck | scrolling backdrop + duck check + strict telegraph timing |
| 8 The Spire | Augustin Bell | Gear platforms, pendulum, quarter-hour bell shockwaves, minute-hand finale | movers + `leapSlam`-style quakes + wind force |

---

## 5. Assets pipeline

### 5.1 Layout

```
assets/
  art/panels/<level>/<level>_<scene>_<nn>.webp     docks_intro_01.webp (1024x576)
  art/portraits/<char>_<mood>.webp                 marchetti_amused.webp, elias_cold.webp (512x512)
  art/characters/<char>/ref.png + face model       identity references for consistent faces
  art/backdrops/<level>_<layer>.png                optional quantized far backdrops
  audio/music/<level>.ogg   audio/sfx/<name>.ogg   audio/voice/<line-id>.ogg
  art-src/                                         full-resolution ComfyUI originals (not loaded by the game)
  prompts/<level>.json                             tools/comfy.py --batch job files (reproducible)
src/assets/manifest.js                             id -> { path, w, h, kind }
src/assets/palettes/  sprites/                     code-drawn palettes and sprite data
```

### 5.2 Naming

Lower-case snake case. Manifest ids carry a kind prefix: `panel:docks_intro_01`, `portrait:elias_cold`, `bg:docks_far`, `music:docks`, `sfx:glass_break`, `voice:marchetti_intro_01`. Levels and cutscene scripts refer only to ids, never to paths.

### 5.3 ComfyUI flow

1. Write prompts in `assets/prompts/<level>.json`; `tools/comfy.py` appends the shared art direction.
2. Keep faces consistent with a per-character reference image (identity guide plus face swap, see the cutscene plan).
3. Run `tools/comfy.py --batch`; a `tools/quantize.py` step converts to WebP and updates the manifest.
4. Commit prompts and outputs; prompt plus seed makes every image reproducible.

### 5.4 Loading

`assets/loader.js` provides `preload(ids, onProgress) -> Promise`. At boot: title, menu and HUD. Before a level: its `assets` list behind a loading card. While playing: prefetch the next level's cutscene panels when idle.

### 5.5 3D models

Keep runtime generation from 2D pixels (`t3voxels`, `t3lathe`, `t3vehicle`), memoized by pixel hash. 3D-only shapes (train hull, elevator cab, crane jib) go in `render3d/models/<level>/`. No glTF for now.

---

## 6. Migration plan

**Step 0, safety net:** add `?seed=N` (replace `Math.random`), `?fixed` (exact 1/60 frame clock), and `?autotest=demo&frames=3600` / `?autotest=boss` that log a hash of the game state and the frame buffer. Record golden hashes. Two runs with the same seed must give the same hash.

| # | Step | Risk | Test | Parallel? |
|---|---|---|---|---|
| 1 | Shell split: `index.html` + `css/game.css`; the script moves verbatim to `src/legacy.js` | Very low | Golden hash identical | — |
| 2 | `'use strict'`, then load `legacy.js` as a module | Low | Hash identical; play demo, boss, ending, 3D toggle | — |
| 3 | Extract pure leaves: math, color, rng, poses, moves, weapon defs, object kinds, enemy roster/moves, difficulty, palettes, glyphs | Low | Hash identical | Yes |
| 4 | Replace top-level `let`s with state objects, cluster by cluster (camera, hero, encounter, flags) | Medium | Hash identical after each cluster | No (sequential) |
| 5 | `render2d/raster.js` with `withView`; 3D stops overwriting globals | Low-medium | 2D hash identical; 3D screenshot equal | — |
| 6 | Untangle sim from render: `laneTick` into the step, `poseTick` into `present`, quakes/regen/bandage into the step, pickups out of `tutTick` | Medium (intended 1-frame timing changes) | Play-test, then re-baseline the hash | — |
| 7 | Event bus: `tut()` -> `emit('feat')`, toasts, residents, crowd, kill feed, feel as listeners | Low | Hash identical; lessons tick | UI listeners in parallel |
| 8 | Extract sim modules: physics, then blood, objects, weapons in parallel, then enemies, then hero | Medium | Hash identical per module; demo runs 10 min | blood, objects, weapons |
| 9 | Extract render2d draws and split Three3D; switch to the import map with vendored three | Medium | 2D hash; 3D screenshots | render2d, render3d, step 10 |
| 10 | UI modules on the bus; input driver stack | Low | Menu/HUD checklist; old settings still load | Yes |
| 11 | `createWorld()` sizes the typed arrays per level; surfaces/walls/sections replace the hard-coded clamps; per-pixel `mat` buffer replaces colour tests | Medium-high | Street hash identical; 3D windows and glass unchanged | — |
| 12 | Painters and `levels/street/level.js`; 3D builds from painter `blocks` | High | Byte-identical `stat`; same surfaces, stairs, doors, windows; 3D screenshot | Painters in parallel once the API is fixed |
| 13 | Director and objectives: zones, waves, gates, club transition, opening/ending as data | Medium | Full tutorial run; demo autotest | Yes |
| 14 | Boss framework; port Malaspina | Medium | Seeded boss autotest; manual phase checks | — |
| 15 | Cutscene panels, portrait dialog, asset loader, level registry, progress save, level select | Low | Test level with 3 panels and 2 dialogs | Yes, after 7 |
| 16 | New engine features, each with a testbed room: movers, panes, ground gaps + killY, walls/ceilings, water, wind, scrolling backdrop | Medium each | Testbed rooms in 2D and 3D | Yes, after 11 |
| 17 | The eight levels and eight bosses | Content | Per-level playthrough checklist; seeded boss autotests | Yes, after 12-14 (+16) |

Can start now, in parallel with the code work: ComfyUI panel and portrait generation, level design on paper in the schema (section 3), and boss design in the primitives vocabulary (section 4).

---

## 7. Risks and open decisions

1. **ES modules vs a bundler:** native modules, import map, vendored three; esbuild only if load time demands it.
2. **Level files, JS vs JSON:** JS modules with `defineLevel` validation; pure-data parts JSON-shaped.
3. **Colour as meaning:** add the per-pixel `mat` buffer (step 11), or new palettes create phantom glass and windows.
4. **One world strip with sections vs separate scenes:** one world per level with sections side by side. Each typed array is `W*H*4` bytes (about 3.6 MB at 2800 x 320), so do not raise `H`.
5. **Determinism:** `state.rng` for the sim, a separate rng for visuals; needed for golden-hash refactor tests and boss autotests.
6. **Step 6 changes timing on purpose** and ends hash parity; isolate it, play-test, re-baseline.
7. **3D init cost on larger levels:** build from painter blocks (no flood fill), lazy init on the 3D toggle, rebuild per level.
8. **ComfyUI for backdrops:** use it for cutscene panels and portraits; keep gameplay geometry procedural pixel art.
9. **`animStep` size:** extract it last (step 8), behind the state objects; do not redesign it during the move.
10. **Demo AI is tied to street coordinates:** keep it street-only for attract mode; new levels get a generic demo driver.
11. **Audio:** design `audio/` as a pure bus subscriber from the start, so telegraph cues are in the data.
12. **Strict mode:** low risk, but isolated in step 2.

**Hot spots in `ragdoll.html`:** the `stat` painter (540-839), `tutTick` (4245-4319), `enemyStep`/`bossThink`/`bossSpecial` (2725-2887), `render`/`lightList` (5260-5400), `Three3D.buildWorld` and `layer` (6232-6382, 7113-7136), `frame` (7885-7999).
