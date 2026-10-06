# Golden autotest hashes

Run with a static server (`python3 -m http.server 8765`) and open the URL; the page title shows the result.
Two runs of the same URL must give the same hashes. A refactor step that keeps both hashes changed nothing.
A step that changes behaviour on purpose records new hashes here, with the reason.

## Current (from migration step 6, 2026-10-06)

| URL | state | buf | l3 | note |
|---|---|---|---|---|
| `index.html?autotest=demo&frames=1200` | `5ae6a552` | `e8b8b31b` | | 2D (attract demo, seed 1, 960x540 view) |
| `index.html?autotest=boss&frames=1800` | `daa2ec28` | `397917f1` | | 2D (skipToBoss + demo, seed 1) |
| `index.html?autotest=demo&frames=1200&view3d` | `5ae6a552` | `d2d255f9` | `0e3d61c3` | 3D view: the same state hash as 2D |
| `index.html?autotest=boss&frames=1800&view3d` | `daa2ec28` | `571dd39e` | `0cc1f74f` | 3D view: the same state hash as 2D |

Step 6 reasons:
- The simulation draws its random numbers from its own seeded generator (`simRand`), not from `Math.random`.
  Before, `?seed` replaced `Math.random`, and three.js used it too (every new 3D object takes a random id): `Three3D.init()` took 7296 numbers, so the 3D run played a different game.
  The 2D sequence is the same as before, so the 2D hashes did not change. The 3D state hash now equals the 2D one; the 3D `buf` and `l3` hashes changed because the 3D run now plays the same game as the 2D run.
- `laneTick()` runs at the end of each fixed step (it ran in `render()`); `poseTick()` runs once per frame before either view; the boss shockwaves, the HP regen and the bandage timer run in the fixed step (they ran per frame at a variable dt); the bench weapon pickups are taken in the fixed step (they were in `tutTick`).
  These are timing changes of up to one frame. The two autotests do not see them: the boss autotest leaves the club roof (the demo AI does not fight the boss), so no shockwave runs, and the lane and regen changes did not change a result in these 1200/1800 frames.
  They were play-tested with `?manual` (walk, fight, jump onto the sports car and roll off it, climb the scaffold, the boss fight with shockwaves, a K.O. and the regen).

Step 7 (event bus) and the audio wiring kept all four URLs' hashes (state, buf, l3). `?autotest=...&audio` turns audio on during the run: the hashes are the same.

Options: `?seed=N` (repeatable random numbers), `?fixed` (clock steps exactly 1/60 s per frame), `?autotest=demo|boss&frames=N`, `?view3d`,
`?manual` (no requestAnimationFrame: a test calls `window.__step(n)` and reads `window.__peek()`; `window.__skipToBoss()` starts at the club roof).

## History

| URL | state | buf | recorded | note |
|---|---|---|---|---|
| `ragdoll.html?autotest=demo&frames=1200` | `5ae6a552` | `e8b8b31b` | 2026-10-02 | step 0 baseline (attract demo, seed 1, 960x540 view) |
| `ragdoll.html?autotest=boss&frames=1800` | `daa2ec28` | `397917f1` | 2026-10-02 | step 0 baseline (skipToBoss + demo, seed 1) |
| `index.html?autotest=demo&frames=1200&view3d` | `6ce00b1a` | `3145a6f2` (l3=`aed6de1e`) | 2026-10-05 | 3D view before step 6 (three.js shifted the seeded `Math.random`) |
| `index.html?autotest=boss&frames=1800&view3d` | `c7b17c42` | `e0f868b8` (l3=`2e421eb5`) | 2026-10-05 | 3D view before step 6 |
