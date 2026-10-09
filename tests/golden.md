# Golden autotest hashes

Run with a static server (`tools/serve.py`, port 8765, no browser cache; or `python3 -m http.server 8765`) and open the URL; the page title shows the result.
Two runs of the same URL must give the same hashes. A refactor step that keeps both hashes changed nothing.
A step that changes behaviour on purpose records new hashes here, with the reason.

## Current (main 9186e57 + the instant turn in an attack, 2026-10-09)

| URL | state | buf | l3 | note |
|---|---|---|---|---|
| `index.html?autotest=demo&frames=1200` | `f251a100` | `234a451e` | | 2D (attract demo, seed 1, 960x540 view) |
| `index.html?autotest=boss&frames=1800` | `d21e863f` | `fb321a08` | | 2D (skipToBoss + demo, seed 1) |
| `index.html?autotest=demo&frames=1200&view3d` | `f251a100` | `31eeae79` | `49596c37` | 3D view: the same state hash as 2D |
| `index.html?autotest=boss&frames=1800&view3d` | `d21e863f` | `d75f280a` | `1aef668c` | 3D view: the same state hash as 2D |

Each URL run twice in headless Chrome (`PORT=8765 sh tools/golden.sh`); each pair matched, and the 3D state hashes equal the 2D ones.
- The instant turn in an attack (2026-10-09: ←/→ against the face turns the hero at once in a ground attack, and every ground
  attack, a chained or a low one too, starts the way the stick points) changed the two demo URLs on purpose: the attract demo's bot
  holds a direction while a swing plays, so the hero now turns there. Before: demo state `c4892f44`, buf `e1b927a6` (2D),
  `bd8fc5f8` / l3 `1438e83d` (3D). The boss URLs kept their hashes. Two runs each, each pair matched, 2D state = 3D state.
- Main at fb19376 (the street blood fixes merged; never recorded here) already gives these four hashes: checked on a worktree of
  fb19376. The blood fixes are the cause of the change from the db738f4 table below (see "Street blood" for why).
- The boss set pieces merge (10b2262) kept them: the attract demo never reaches a boss, the boss autotest leaves the club roof
  before Malaspina spawns, and the goons' rules did not change (the boss-only jab-spam read, armor, body push and hug check,
  the '!' drawn over goons only).
- The early perfect dodge (bf7d930) kept them too: the attract demo dodges close to contact, inside the old 0.1 s window,
  and the stretched i-frames never pass the old 0.3 s there.

- No signs over characters (83f9364) and the dead block/parry code removed (14377d1) kept all four URLs' hashes (state, buf, l3),
  two runs each in headless Chrome, each pair matched, 2D state = 3D state. The buf and l3 hashes see only the last frame: at frame
  1200 / 1800 no goon is hurt in view, winding up a heavy, reloading, stunned or backing off, so no removed sign was on it. The new
  poses (a stunned boss's sway, the Tallyman's reload, a hurt goon's fists up as he backs off: arms only) do not reach the hashed state.
  The gbreak act, DEF.block/parry and the parry ring had no caller. Checked by hand with `?manual` in both views instead.

- Line Zero (Level 2, branch of 36ba9f8, commits d2febef..): all four URLs keep these hashes (state, buf, l3; checked twice for
  the 2D boss and the 3D pair, the 2D demo once after a cold-launch timeout). The street path is untouched: the level hooks (LVH)
  are empty there, `isP9()` branches that meant "the street" became `isStreet()`, and the shared changes (a boss's own hook data,
  `e.dmgK`, a shot passing the surface it was thrown from, `lockT`, the boss dialog flags) do not run in these demos.
  Line Zero itself is tested with `?manual` and `window.__metro` (`start`, `chapter`, `toTinder`, `toBoss`, `tp`, `peek`, `kill`,
  `setDiff`, `train`, `equip`, `view3d`) and the helpers in `tests/metrobot.js` (`await import('/tests/metrobot.js')`: `K`, `bot`, `run`, `skipScene`, `toFight`).

- The Leviathan (Level 4, branch of 0628cb3): all four URLs keep these hashes (state, buf, l3; one run each in headless Chrome,
  2D state = 3D state). The new shared hooks (`LVH.preHit`, `LVH.sprites3d`, `R.gun`, the harpoon and anchor weapon draws) do not
  run on the street; `isAqua()` branches are off there. The level is tested with `?manual`, `window.__aquarium` and `tests/aquabot.js`.

Boss fights are tested with bots, not hashes: `PORT=8765 sh tools/bossbot.sh street|pier <diff 0-3> jab|varied [seed]`
(`tests/bossbot.html`; run them one at a time: side-by-side headless runs can stall). No block, no parry: the varied bot
perfect-dodges, jumps, grabs and finishes crewmen. Tests with `?manual`: `__sim` also holds `EMOVES`, `MOVES`, `MAL`, `p9`,
`eshots`, `pickups`, `bossMash`, `sceneOn`, `simTime`, `kos`, `runT`.

### main db738f4: + combo depth and focus, the slam, the Q/W controls, reinforcements (2026-10-07)

| URL | state | buf | l3 | note |
|---|---|---|---|---|
| `index.html?autotest=demo&frames=1200` | `dfa7b445` | `5438cdf3` | | 2D (attract demo, seed 1, 960x540 view) |
| `index.html?autotest=boss&frames=1800` | `d8e18a0e` | `61597e44` | | 2D (skipToBoss + demo, seed 1) |
| `index.html?autotest=demo&frames=1200&view3d` | `dfa7b445` | `51bae86d` | `15c0972f` | 3D view: the same state hash as 2D |
| `index.html?autotest=boss&frames=1800&view3d` | `d8e18a0e` | `56611753` | `a57a0412` | 3D view: the same state hash as 2D |

Each URL run twice in headless Chrome (a cold first launch can time out with the title `Elias Grave`: run it again); each pair matched,
and the 3D state hashes equal the 2D ones. Reasons, in order on main since the drop rules:
- The combo depth and focus merge (8993b7a): the demo takes finishers, Sandman time and the clinch; the fixed step runs on the hero's
  clock (`wk`); last-kill slow motion (see the branch notes below).
- The ground slam (6807514): the demo slams in the clinch and takes the slam finisher now and then (more `simRand` calls).
- The controls (aa438fb, cc21cff, db738f4): Q and W only. The finisher is Q by a staggering beaten goon; Sandman time starts by itself;
  no block, no parry (the demo's parry tap became a perfect dodge); the grab set W knee, Q elbow, ←/→ + Q shoulder throw, ↓ + Q slam,
  ←/→ + W kick away; no wall-splats, no lpw; run is the default. The demo's choices and the goons' answers change from the first fight.
- Reinforcement waves (34e833a): they come only from the player's stage spawner and Pier 9 waves, not the attract demo's own goons,
  so they do not change these runs by themselves. The street boss crew (`DIFFS[].crew`) is behind the boss door (the boss run leaves the roof).
- Kicked cans and bottles roll on (bb788b8, the lead's commit) were included in this run.
- 2D and 3D art: the beaten and off-balance poses, no key caps or exposed diamonds over goons.

Tests with `?manual`: `__pier9.kill(n)` kills at most n; `__sim` holds `foc`, `finE`, `wk`, `JUG`, `GRAB`, `FOCUS`, `FIN`, `OTG`, `DIVE`, `FLY`.

### Street blood, no stain in the air (branch fix-street-blood)

| URL | state | buf | l3 | note |
|---|---|---|---|---|
| `index.html?autotest=demo&frames=1200` | `af279324` | `090f291a` | | 2D: unchanged from the base (6f4ca49) |
| `index.html?autotest=boss&frames=1800` | `c82a5697` | `dde6bb4b` | | 2D (base: `8b84e8d9` / `ac6bdd37`) |
| `index.html?autotest=demo&frames=1200&view3d` | `af279324` | `428e93fc` | `cddbc172` | 3D: unchanged from the base |
| `index.html?autotest=boss&frames=1800&view3d` | `c82a5697` | `7781e9d5` | `6c05fb48` | 3D (base buf `bd80b093`, l3 `6035917a`); state = 2D |

Two runs each in headless Chrome, each pair matched; 2D state = 3D state. The demo is unchanged (no blood reaches a ledge, a prop
behind a wall drip, or the sky edge in it). The boss changes: a drop that lands on a ledge with no prop pixel under it, or a wall drip
behind a prop, no longer calls `stain`/`gore`, so fewer `simRand` values are used and the random sequence shifts. The 3D buf also
changes from the new gore sheets (per-part depth, sloped car glass, awnings).

### The drop rules on their branch (base acc7610)

| URL | state | buf | l3 | note |
|---|---|---|---|---|
| `index.html?autotest=demo&frames=1200` | `42c63444` | `af711dee` | | 2D (attract demo, seed 1, 960x540 view) |
| `index.html?autotest=boss&frames=1800` | `30f266d5` | `28567ba5` | | 2D (skipToBoss + demo, seed 1) |
| `index.html?autotest=demo&frames=1200&view3d` | `42c63444` | `07a9f99a` | `baf6df5a` | 3D view: the same state hash as 2D |
| `index.html?autotest=boss&frames=1800&view3d` | `30f266d5` | `d3634768` | `90089939` | 3D view: the same state hash as 2D |

The drop rules (2026-10-06, `docs/drops.md`: `lootDrop()`, `src/sim/weapons/drops.js`, `DROPS` in `src/levels/pier9.js`) changed all four URLs' hashes (two runs each in Chrome, the same hashes; 2D state = 3D state).
The attract demo kills goons: a kill now takes a different number of `simRand` values (a weapon only from an armed goon of an opened tier, a pity counter,
ammo boxes only near a gun, capped bandages), so the random sequence and what lies on the street differ from then on.

Drop tests: `?manual&seed=1`, `__pier9.street()` or `.start()`, `.setDiff(i)`, then spawn a goon with `__sim.spawnEnemy('goon', x, zone, opts)`, `__pier9.kill()`, and read `__sim.thrown` (`drop: true`), `__sim.ammoBoxes` and `__sim.loot.n` (`__sim.setWeapon`, `__sim.charge` arm the hero). The numbers are in `docs/drops.md`.

Before the drop rules, on that base (migration step 6): demo `5ae6a552` / `e8b8b31b` (3D `d2d255f9`, l3 `0e3d61c3`); boss `daa2ec28` / `397917f1` (3D `571dd39e`, l3 `0cc1f74f`).

### Readable mobs and the Saltmen on their branch (base b120624: the combat rework, no feedback layer)

| URL | state | buf | l3 | note |
|---|---|---|---|---|
| `index.html?autotest=demo&frames=1200` | `92fb3f4e` | `7bb42149` | | 2D (attract demo, seed 1, 960x540 view) |
| `index.html?autotest=boss&frames=1800` | `7afcc5eb` | `d11e6333` | | 2D (skipToBoss + demo, seed 1) |
| `index.html?autotest=demo&frames=1200&view3d` | `92fb3f4e` | `03b6e245` | `6b974618` | 3D view: the same state hash as 2D |
| `index.html?autotest=boss&frames=1800&view3d` | `7afcc5eb` | `bc6a1252` | `5075de6b` | 3D view: the same state hash as 2D |

Readable-mob and Saltmen reasons (all four URLs run twice or more in headless Chrome; each set matched, and the 3D state hashes equal the 2D ones.
A cold first launch can time out with the title still `Elias Grave`: run it again):
- The demo plays Hard. Hard now allows 3 attack tokens (was 4) and at most 2 goons swinging at once, each new swing at least 0.25 s after
  the last (`DIFFS` `tok`, `swing`, `gap`). Goons keep 14 px apart, token holders too (`sepStep`). Hard adds high-low mix-ups and a few
  feints, a raised guard needs a combo ender (a lone heavy is blocked and often punished), and a predictable held heavy is read sooner (`enc.holdK`).
- Goon rest and wind-up times use `cdA` (Wicked: as Hard), so Wicked is harder through feints and mix-ups, not speed.
- Enemy bullets and thrown knives hit the goons in their way (bodies are cover).
- Every goon gets a few new fields at spawn (two more `simRand` calls), so the random sequence shifts.
- The 2D and 3D art changes: the rim flash on a melee wind-up, the glint on a ranged wind-up, the big arrow for a shooter off the screen.

The previous hashes (combat rework): demo `97d2d0dc` / `cc0931b9` (3D buf `99d61b63`, l3 `d39d8e05`), boss `59a01970` / `ed268240` (3D buf `cfaa9fc5`, l3 `8999f2ab`).

Pier 9 tests with `?manual`: `__pier9.spawn(v, x)` puts one Saltman of variant `v` (deckhand, pipeman, filleter, gaffer, hookthrower,
tallyman, bulwark, bosun) at x; `__pier9.zoom(z)` and `__pier9.view3d(on)` set the camera and the view (not saved); `__pier9.peek()`
lists each enemy as [variant, x, y, hp, wave, act, name] and shows `gaffHold`, `swingN`, `holdK`.

### Combo depth and focus on its branch (base b120624: the combat rework)

| URL | state | buf | l3 | note |
|---|---|---|---|---|
| `index.html?autotest=demo&frames=1200` | `428d5053` | `f616d5b5` | | 2D (attract demo, seed 1, 960x540 view) |
| `index.html?autotest=boss&frames=1800` | `4f8864db` | `be84bbc8` | | 2D (skipToBoss + demo, seed 1) |
| `index.html?autotest=demo&frames=1200&view3d` | `428d5053` | `da93f804` | `5598769a` | 3D view: the same state hash as 2D |
| `index.html?autotest=boss&frames=1800&view3d` | `4f8864db` | `52b6b14a` | `b02b27c7` | 3D view: the same state hash as 2D |

Combo depth and focus reasons (each URL run twice in headless Chrome; each pair matched, and the 3D state hashes equal the 2D ones):
- The demo takes a finisher when the F prompt shows, uses Sandman time with a full meter and 2+ goons near, plays the fist string
  (Q x4, with → held for the wall-splat), knees and throws a goon it walks into while he reels. Its random numbers shift with these choices.
- The fixed step is now on the hero's clock: the world takes `wk` of each step (1, or FOCUS.slow in Sandman time, when the other steps are
  `heroStep`). The hero's i-frames count down after his own move (they counted at the start of `enemyStep`); particles, sparks, waves and
  flashes run on the world clock. With wk = 1 this is one full step per tick as before.
- The last kill of a wave and the boss kill get a beat of slow motion (`slowMo`); the enders step in further (`m.lunge`), and no heavy's step-in
  is stopped by a goon lying on the floor.

The previous hashes (combat rework): demo `97d2d0dc` / `cc0931b9` (3D buf `99d61b63`, l3 `d39d8e05`), boss `59a01970` / `ed268240` (3D buf `cfaa9fc5`, l3 `8999f2ab`).

Combo and focus tests with `?manual`: `window.__sim` also holds `foc` (the meter: `m`, Sandman time left: `t`), `finE` (the goon the
finisher prompt is over), `wk`, `finCam`, `equip(w)` and the tuning tables `JUG`, `GRAB`, `FOCUS`, `FIN`, `OTG`, `DIVE`, `SPLAT`.

### Earlier: the combat rework

Combat rework reasons (all four URLs run twice in Chrome; each pair matched, and the 3D state hashes equal the 2D ones):
- The demo plays differently: Space is now a short dodge (the long roll is ↓ at a run), and the demo parries (E tap), perfect-dodges
  and tech-rolls by timing instead of rolling on any wind-up. Its strings meet the new rules: goon poise by role, armor on pipe and
  machete swings, string damage scaling, knock-downs only from an ender, a sweep, kh/ah/aair or a heavy counter-hit, and goons that
  slip a lone heavy.
- Knock-downs end sooner (at most 1.2 s on the floor), and a K.O. spends a second wind and rises at 35-50 HP (no full heal).

The previous hashes (migration step 6 to the play-test fixes): demo `5ae6a552` / `e8b8b31b` (3D buf `d2d255f9`, l3 `0e3d61c3`),
boss `daa2ec28` / `397917f1` (3D buf `571dd39e`, l3 `0cc1f74f`).

Step 6 reasons:
- The simulation draws its random numbers from its own seeded generator (`simRand`), not from `Math.random`.
  Before, `?seed` replaced `Math.random`, and three.js used it too (every new 3D object takes a random id): `Three3D.init()` took 7296 numbers, so the 3D run played a different game.
  The 2D sequence is the same as before, so the 2D hashes did not change. The 3D state hash now equals the 2D one; the 3D `buf` and `l3` hashes changed because the 3D run now plays the same game as the 2D run.
- `laneTick()` runs at the end of each fixed step (it ran in `render()`); `poseTick()` runs once per frame before either view; the boss shockwaves, the HP regen and the bandage timer run in the fixed step (they ran per frame at a variable dt); the bench weapon pickups are taken in the fixed step (they were in `tutTick`).
  These are timing changes of up to one frame. The two autotests do not see them: the boss autotest leaves the club roof (the demo AI does not fight the boss), so no shockwave runs, and the lane and regen changes did not change a result in these 1200/1800 frames.
  They were play-tested with `?manual` (walk, fight, jump onto the sports car and roll off it, climb the scaffold, the boss fight with shockwaves, a K.O. and the regen).

Step 7 (event bus) and the audio wiring kept all four URLs' hashes (state, buf, l3).

The Pier 9 slice (2026-10-06: `loadLevel`, `src/levels/pier9.js`, Saltmen, Marchetti, the Chapter menu, the cutscene flow) kept the hashes: the autotests play the street, and every Pier 9 branch is behind `isP9()`.
Pier 9 itself has no golden hash yet. Test it with `?manual`: `window.__pier9.start()` (the level), `.chapter()` (with the cutscenes), `.toBoss()`, `.peek()`, `.tp(x)`, `.kill()`, `.setDiff(i)`. `?autotest=...&audio` turns audio on during the run: the hashes are the same.

The Pier 9 3D view (2026-10-06: `Three3D.rebuildWorld`, the `p9*` builders) kept all four URLs' hashes (state, buf, l3): every Pier 9 branch in the 3D view is behind `isP9()`.
Test it with `?manual`: `__pier9.start()` then the 3D button; `__pier9.street()` goes back to the street; `__pier9.t3mem()` reads the 3D view's GPU object counts (they must stay the same after many level switches).

The play-test sim fixes (2026-10-06: the restart soft-lock, no boss knock-down from objects, the tutorial ammo lessons, no ledge camping,
the difficulty lock, the travelling boss slam, the `hit` event after the guard, the blade throw on ↓ + hold Q, M only with `?dev`, the Pier 9
wave alert, the street boss scaled by difficulty, the hook clank, the settings key) kept all four URLs' hashes (state, buf, l3), run in Chrome.
The attract demo does not reach these branches in 1200 frames, and the boss autotest leaves the club roof before the boss spawns.
They were play-tested with `?manual` (`window.__sim` holds the live sim state for such tests).

The play-test fixes for audio, visuals and UI (2026-10-06: hit sounds by move and outcome, the Pier 9 wall mask for blood, the 3D belt and hair, the title logo, key labels, fonts) kept all four URLs' hashes (state, buf, l3), two runs each.
The blood wall mask is null on the street, the 3D belt and hair changes touch only the Pier 9 boss and the hero's 3D hair (the 3D hashes did not see a change), and the rest is audio, HTML and CSS.

The boss rework (2026-10-06: Malaspina's cane, coat and phase 2, Marchetti's three phases, `boss:tell`, the boss bots) kept all four
URLs' hashes (state, buf, l3), two runs each in headless Chrome (`sh tools/golden.sh`): the attract demo never reaches a boss, and the
boss autotest leaves the club roof before Malaspina spawns. The 2D and 3D state hashes are still equal.
The fights are tested with bots instead: `sh tools/bossbot.sh street|pier <diff 0-3> jab|varied [seed]` runs `tests/bossbot.html`
headless (a static server on port 8779, or `PORT=`) and prints the fight length, the HP left and the defence counts.

Combat tests with `?manual`: `window.__sim` also holds `blk` (parry window), `hstr` (the hero's string), `DEF` (timings), `input`,
`slowT`, `ckpt`, `ragT`, `setDiff(i)` (also refills the second winds) and `retry()`; `__peek()` shows `wind` and `wasted`.
Dispatch KeyboardEvents (Q, W, E, Space, arrows) with frames stepped between down and up.

The tutorial objective panel (2026-10-06: one lesson at a time in `#obj`, new lesson texts with `[Q]` key caps, the L list, the gate pulse in place of the gate toast) kept all four URLs' hashes (state, buf, l3), run in Chrome.
It is DOM only and hidden in the attract demo; the lesson ids, the gate and the lesson detection did not change.

### Main with the combat rework and the feedback layer (894ffc9)

| URL | state | buf | l3 | note |
|---|---|---|---|---|
| `index.html?autotest=demo&frames=1200` | `97d2d0dc` | `487e57f7` | | 2D (attract demo, seed 1, 960x540 view) |
| `index.html?autotest=boss&frames=1800` | `a349580f` | `fc27d8c8` | | 2D (skipToBoss + demo, seed 1) |
| `index.html?autotest=demo&frames=1200&view3d` | `97d2d0dc` | `99d61b63` | `d39d8e05` | 3D view: the same state hash as 2D |
| `index.html?autotest=boss&frames=1800&view3d` | `a349580f` | `8bbe397b` | `d2ddfe0a` | 3D view: the same state hash as 2D |

Merged main (7cff000), two runs each in headless Chrome, the same hashes both times. The demo state is the combat rework's (`97d2d0dc`).
The boss run's state changed (`a349580f`); the only sim line that reads the camera is the off-screen wave spawn (see the feedback-layer
notes below), so the fight camera is the likely cause (not traced step by step). The 2D buf hashes see the rim light; the 3D demo
keeps its buf and l3, and the 3D boss buf and l3 follow the boss run's new state.

### The feedback layer on its own branch (base acc7610, before the combat rework)

| URL | state | buf | l3 | note |
|---|---|---|---|---|
| `index.html?autotest=demo&frames=1200` | `c5dbe2b2` | `5e2e219f` | | 2D (attract demo, seed 1, 960x540 view) |
| `index.html?autotest=boss&frames=1800` | `daa2ec28` | `7faca013` | | 2D (skipToBoss + demo, seed 1) |
| `index.html?autotest=demo&frames=1200&view3d` | `c5dbe2b2` | `f05556a9` | `b922f55b` | 3D view: the same state hash as 2D |
| `index.html?autotest=boss&frames=1800&view3d` | `daa2ec28` | `571dd39e` | `0cc1f74f` | 3D view: the same state hash as 2D |

The feedback layer (review improvement #10: style meter, music director, grunts, heartbeat and vignette, graded results card,
toasts, fight camera, 2D rim light, 3D head yaw), two runs each in headless Chrome, the same hashes both times:
- **demo state `5ae6a552` -> `c5dbe2b2`: the fight camera.** The sim has no combat change, but one sim line reads the camera:
  a wave goon with no door near his spot walks in from just off screen (`cam.x + cam.vw + 14`, the `spawned` loop in `tutTick`).
  The camera now frames the middle of a fight (the hero within 30 % of the view width of the centre) instead of sliding just
  enough to fit everyone, so `cam.x` differs during the demo's street fights, and such a goon steps in at another x.
  Checked: with only the camera change switched off, the demo state hash is `5ae6a552` again. The zoom rules did not change.
  The boss run's state is the same (`daa2ec28`): it leaves the club roof before such a spawn.
- **2D buf (both URLs): the 2D rim light** (`rimPass` after `lightPass`; fighters are marked with `figArt` in `render2d/raster.js`).
  The demo buf also sees the other fight framing.
- **3D demo buf and l3: the camera** (the 2D art in the 3D layers is drawn for the camera's window). The 3D boss run keeps its
  buf and l3: the 3D view has no rim pass (its fighter shader already has a rim light), and the head yaw is GPU-only.
- The style meter, the vignette, the music director and the results card are DOM and audio only.

### The combat rework hashes (its reasons are under "Earlier: the combat rework")

| URL | state | buf | l3 | note |
|---|---|---|---|---|
| `index.html?autotest=demo&frames=1200` | `97d2d0dc` | `cc0931b9` | | 2D |
| `index.html?autotest=boss&frames=1800` | `59a01970` | `ed268240` | | 2D |
| `index.html?autotest=demo&frames=1200&view3d` | `97d2d0dc` | `99d61b63` | `d39d8e05` | 3D |
| `index.html?autotest=boss&frames=1800&view3d` | `59a01970` | `cfaa9fc5` | `8999f2ab` | 3D |

Options: `?seed=N` (repeatable random numbers), `?fixed` (clock steps exactly 1/60 s per frame), `?autotest=demo|boss&frames=N`, `?view3d`,
`?manual` (no requestAnimationFrame: a test calls `window.__step(n)` and reads `window.__peek()`; `window.__skipToBoss()` starts at the club roof).

## History

| URL | state | buf | recorded | note |
|---|---|---|---|---|
| `ragdoll.html?autotest=demo&frames=1200` | `5ae6a552` | `e8b8b31b` | 2026-10-02 | step 0 baseline (attract demo, seed 1, 960x540 view) |
| `ragdoll.html?autotest=boss&frames=1800` | `daa2ec28` | `397917f1` | 2026-10-02 | step 0 baseline (skipToBoss + demo, seed 1) |
| `index.html?autotest=demo&frames=1200&view3d` | `6ce00b1a` | `3145a6f2` (l3=`aed6de1e`) | 2026-10-05 | 3D view before step 6 (three.js shifted the seeded `Math.random`) |
| `index.html?autotest=boss&frames=1800&view3d` | `c7b17c42` | `e0f868b8` (l3=`2e421eb5`) | 2026-10-05 | 3D view before step 6 |
