# Golden autotest hashes

Run with a static server (`python3 -m http.server 8765`) and open the URL; the page title shows the result.
Two runs of the same URL must give the same hashes. A refactor step that keeps both hashes changed nothing.
A step that changes behaviour on purpose records new hashes here, with the reason.

## Current (combat rework, 2026-10-06)

| URL | state | buf | l3 | note |
|---|---|---|---|---|
| `index.html?autotest=demo&frames=1200` | `97d2d0dc` | `cc0931b9` | | 2D (attract demo, seed 1, 960x540 view) |
| `index.html?autotest=boss&frames=1800` | `59a01970` | `ed268240` | | 2D (skipToBoss + demo, seed 1) |
| `index.html?autotest=demo&frames=1200&view3d` | `97d2d0dc` | `99d61b63` | `d39d8e05` | 3D view: the same state hash as 2D |
| `index.html?autotest=boss&frames=1800&view3d` | `59a01970` | `cfaa9fc5` | `8999f2ab` | 3D view: the same state hash as 2D |

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

Combat tests with `?manual`: `window.__sim` also holds `blk` (parry window), `hstr` (the hero's string), `DEF` (timings), `input`,
`slowT`, `ckpt`, `ragT`, `setDiff(i)` (also refills the second winds) and `retry()`; `__peek()` shows `wind` and `wasted`.
Dispatch KeyboardEvents (Q, W, E, Space, arrows) with frames stepped between down and up.

Options: `?seed=N` (repeatable random numbers), `?fixed` (clock steps exactly 1/60 s per frame), `?autotest=demo|boss&frames=N`, `?view3d`,
`?manual` (no requestAnimationFrame: a test calls `window.__step(n)` and reads `window.__peek()`; `window.__skipToBoss()` starts at the club roof).

## History

| URL | state | buf | recorded | note |
|---|---|---|---|---|
| `ragdoll.html?autotest=demo&frames=1200` | `5ae6a552` | `e8b8b31b` | 2026-10-02 | step 0 baseline (attract demo, seed 1, 960x540 view) |
| `ragdoll.html?autotest=boss&frames=1800` | `daa2ec28` | `397917f1` | 2026-10-02 | step 0 baseline (skipToBoss + demo, seed 1) |
| `index.html?autotest=demo&frames=1200&view3d` | `6ce00b1a` | `3145a6f2` (l3=`aed6de1e`) | 2026-10-05 | 3D view before step 6 (three.js shifted the seeded `Math.random`) |
| `index.html?autotest=boss&frames=1800&view3d` | `c7b17c42` | `e0f868b8` (l3=`2e421eb5`) | 2026-10-05 | 3D view before step 6 |
