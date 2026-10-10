# Performance pass (playtest step 6, section 7) — 2026-10-10

Goal: every level, 2D and 3D, mean frame under ~8 ms and p95 under ~16 ms on this machine, with no change to gameplay or to
the picture. Result: met in every level and view. All the changes are bit-exact. The pixels, the state and the buf/l3 hashes
are the same as before.

## How it was measured

- Machine: M1 Max, Chrome through `agent-browser` (real GPU, ANGLE Metal), viewport 1280x720 (view 640x360).
  Other agents ran browsers at the same time (load average 4-7), so the numbers are noisy by about ±10 %.
- Scene: `index.html?manual&seed=1`, `__<level>.setDiff(1)` (Medium), `start()` (the tutorial street: `__pier9.street()`),
  view 2D or 3D. Then the playtest bot (`playtest/xbot.js`, real key events, walks right and fights) runs 480 frames to
  reach the first fight. Then 300 frames are timed (`performance.now()` around each `__step(1)`, which is sim + render).
  Then 180 more frames run under the Chrome profiler (self time per function, top 5).
- The same scene in each run. A hash of the 2D canvas, the 3D layer data (`Three3D` typed arrays), and the hero's x and HP
  after the run show that the run and the picture did not change.
- First-frame spike: a fresh page, `view3d(on)`, then `__<level>.chapter()` (the intro panels). The player reads for 2.5 s
  and presses Escape. The table shows the first `__step` after the panels.
- Scripts (scratchpad `perf6/`): `one.sh` / `all.sh` (the table), `ph.js` (harness), `prof.mjs` (trace → self time),
  `spike.sh`, `shots.sh` + `pxdiff.py` (before/after screenshots against a copy of main d00f5dc on its own port).

## Results: frame time (ms), the same scene before and after

| level | view | mean before | p95 before | mean after | p95 after | same picture | top 5 before | top 5 after |
|---|---|---|---|---|---|---|---|---|
| street | 2D | 8.22 | 8.7 | 5.29 | 5.6 | yes | postPass 29%, lightPass 19%, drawGlass 16%, drawSky 13%, glassReflect 9% | postPass 29%, lightPass 19%, drawGlass 18%, drawSky 11%, glassReflect 6% |
| street | 3D | 5.87 | 6.5 | 3.82 | 4.4 | yes | lightPass 25%, layer 18%, drawSky 17%, getParameters 4%, Qt 3% | lightPass 21%, drawSky 14%, layer 12%, getParameters 6%, reflect 3% |
| pier9 | 2D | 6.04 | 7.0 | 4.18 | 5.0 | yes | postPass 24%, lightPass 16%, drawSky 12%, drawGlass 7%, plot 7% | postPass 20%, lightPass 14%, drawSky 10%, plot 9%, drawGlass 9% |
| pier9 | 3D | 6.14 | 8.2 | 3.50 | 4.8 | yes | layer 26%, lightPass 15%, drawSky 12%, updateBackground 3%, bloodFlow 3% | lightPass 12%, drawSky 12%, layer 10%, updateBackground 4%, bloodFlow 4% |
| metro | 2D | 4.92 | 5.6 | 3.02 | 3.6 | yes | postPass 21%, lightPass 14%, drawDog 11%, plot 10%, drawBackdrop 5% | postPass 20%, lightPass 11%, plot 11%, drawBackdrop 6%, rimPass 6% |
| metro | 3D | 4.15 | 5.2 | 2.55 | 3.5 | yes | layer 23%, t3merge 6%, getParameters 4%, get 4%, set 3% | t3merge 8%, layer 8%, getParameters 5%, get 4%, set 4% |
| casino | 2D | 4.42 | 7.3 | 3.00 | 4.8 | yes | postPass 45%, lightPass 26%, drawBackdrop 4%, rimPass 3%, plot 3% | postPass 38%, lightPass 21%, drawBackdrop 6%, glassReflect 4%, plot 4% |
| casino | 3D | 4.31 | 6.2 | 2.72 | 3.8 | yes | layer 57%, bloodFlow 3%, texSubImage2D 2%, get 2%, getParameters 2% | layer 26%, bloodFlow 5%, get 3%, texSubImage2D 3%, getParameters 3% |
| aquarium | 2D | 3.93 | 4.9 | 2.59 | 3.3 | yes | postPass 39%, lightPass 25%, plot 5%, drawBackdrop 5%, reflectPass 3% | postPass 31%, lightPass 15%, plot 7%, drawBackdrop 6%, reflectPass 4% |
| aquarium | 3D | 4.32 | 5.2 | 2.83 | 3.4 | yes | layer 46%, getParameters 3%, C 3%, bloodFlow 2%, texSubImage2D 2% | layer 19%, getParameters 6%, C 5%, bloodFlow 4%, texSubImage2D 3% |
| hospital | 2D | 7.54 | 12.0 | 4.14 | 5.8 | yes | postPass 32%, lightPass 24%, drawDog 6%, plot 6%, drawBackdrop 5% | postPass 29%, lightPass 18%, plot 7%, drawBackdrop 6%, rimPass 5% |
| hospital | 3D | 5.19 | 7.6 | 3.02 | 4.0 | yes | layer 46%, bloodFlow 3%, texSubImage2D 3%, getParameters 3%, set 2% | layer 19%, getParameters 5%, bloodFlow 5%, texSubImage2D 5%, t3merge 3% |
| palmhouse | 2D | 4.43 | 5.6 | 3.30 | 4.2 | yes | postPass 37%, lightPass 19%, plot 7%, drawDog 6%, drawBackdrop 4% | postPass 38%, lightPass 14%, plot 7%, drawBackdrop 6%, bloodFlow 4% |
| palmhouse | 3D | 2.65 | 3.2 | 2.25 | 2.8 | yes | layer 35%, bloodFlow 4%, Zt 4%, multiplyMatrices 3%, texSubImage2D 3% | layer 13%, bloodFlow 6%, Zt 4%, texSubImage2D 4%, set 4% |
| train | 2D | 3.87 | 4.4 | 2.28 | 2.9 | yes | backPix 29%, postPass 20%, lightPass 12%, drawBack 7%, plot 5% | plot 29% (drawBack's), postPass 19%, lightPass 7%, bloodFlow 7%, drawBackdrop 6% |
| train | 3D | 4.89 | 5.6 | 2.77 | 3.4 | yes | layer 28%, backPix 27%, drawBack 6%, bloodFlow 3%, texSubImage2D 2% | drawBack 20%, layer 13%, bloodFlow 6%, texSubImage2D 4%, set 3% |
| spire | 2D | 3.99 | 5.0 | 2.98 | 3.9 | yes | postPass 37%, lightPass 22%, drawDog 6%, plot 5%, drawBackdrop 4% | postPass 33%, lightPass 19%, plot 9%, drawBackdrop 6%, rimPass 4% |
| spire | 3D | 3.02 | 3.9 | 2.08 | 2.7 | yes | layer 54%, bloodFlow 5%, texSubImage2D 3%, set 2%, renderBufferDirect 2% | layer 26%, bloodFlow 6%, texSubImage2D 5%, drawWorld 4%, get 3% |

The mean falls by 25-45 % in 17 of 18 cells (Palm House 3D was already the cheapest). The 2D view stays a little slower
than the 3D view because the 3D view does its post pass on the GPU. The 3D times are CPU time only.

Max frame (single outliers in 300 frames, both before and after): up to 20-29 ms in the casino, hospital and Palm House.
These are one-off frames (GC, or a first draw of a new model), not a steady cost. They are not fixed here.

The playtest measured 4-19 ms mean / up to 50 ms p95 with four other playtest browsers on the machine. The "before"
column here (4-8 ms) was measured with less load. Compare the columns with each other, not with the playtest.

## Results: first frame of a level (ms), after its intro panels

| level | 2D before | 2D after | 3D before | 3D after |
|---|---|---|---|---|
| Pier 9 | 49 | 42 | 367 | 37 |
| Line Zero | 34 | 32 | 275 | 31 |
| House Always Wins | 36 | 35 | 281 | 36 |
| The Leviathan | 35 | 36 | 302 | 56 |
| St. Cecilia | 30 | 37 | 272 | 34 |
| The Palm House | 36 | 34 | 269 | 32 |
| The Last Train | 28 | 36 | 236 | 29 |
| The Spire | 35 | 28 | 261 | 23 |

The 3D spike (the level's world built, shaders compiled, textures uploaded) now happens behind the first panel. The 2D first
frame (30-50 ms) did not change. It is JIT warm-up of the level's code and is below one dropped frame at 30 fps.

## What changed (biggest wins first)

All the changes keep the same arithmetic in the same order, so every pixel is the same (see "Checks").

1. **`postPass` (2D finish), legacy.js.**
   - The vignette was rebuilt on every frame where the view size changed. That is every frame of a zoom (half the frames
     in a fight). Each rebuild made a new array and ran a pow and a smoothstep per pixel. Now one buffer is kept, and the
     per-column and per-row terms are calculated once.
   - The blur used `clamp()` calls and array destructuring per tap. Now the index clamps are inline. A row of cells with
     no bright pixel within reach is written as zeros without the 9-tap sums.
   - `v / 255` and the bright-pass weight come from 256-entry tables.
   - The "glow near" test is calculated once per cell, not four lookups per pixel.
   - A pixel with no glow near it gets its grade from a 4096-entry cache by colour, because the grade before the vignette
     depends on the colour only. About 77 % of pixels use the cache, and about 1 % of those miss.
2. **`layer()` (3D view: the 2D art copied into the layer textures), legacy.js.** This was 23-57 % of the 3D frame. Most
   layers are mostly empty. Now:
   - An empty row is skipped where the texture row is already empty (each texture row keeps the column range that can
     hold a pixel).
   - A plain layer copies whole rows with `set()`.
   - A glow layer checks the glow and glass sets once per run of one colour.
3. **`lightPass` (2D, and the 3D sky background), legacy.js.**
   - The glow-set check (`EMIT.has`) happens once per run of one colour.
   - A run of unlit pixels (ambient light only) reuses the last result.
   - A row that no pool reaches is not cleared again.
4. **The Last Train's backdrop (`drawBack`), train/paint.js.** `backPix()` ran per pixel (27-29 %). Now each column
   calculates its parallax offsets, mountain line, dam, far lights and poles once, and each row calculates its sky colour
   once. `backPix()` stays as the reference rule.
5. **Pier 9's `drawSky`, pier9.js.**
   - The rows above the horizon (sky, sun, far ships, their fog) depend only on the view. They are stored and copied back
     while the view stays on the same pixel.
   - The sea moves every frame, so it is drawn every frame. Its slow swell (one sine per column) is calculated once per
     column, not per pixel.
   - Fog mixing happens once per run of one colour.
   - Note: a cache keyed on "a new tile" (as the review suggested) cannot be exact. The sea and the street's clouds move
     with time, and the street's fog follows the rain. The cache therefore covers only the static rows.
6. **Street sky and glass, legacy.js.**
   - The far-town fog is mixed once per run.
   - The parallax layers step their index instead of using `%` per pixel.
   - `drawGlass` checks the glass set once per run.
   - `glassReflect` first finds the box around everything that is not the scene (people and what they carry). A glass
     pixel whose 5x5 sample lies outside that box skips the sample. With no people in view, the pass ends at once.
7. **`drawDog`, legacy.js.** It built a `Map` with string keys every frame, also when the dog was off-screen (6-12 % in
   Line Zero, St. Cecilia, Palm House, Spire). Now it returns when the dog and its tail are out of the view, and the keys
   are numbers.
8. **3D pre-warm, legacy.js (`prewarm3D`).** 150 ms after a cutscene starts, if the 3D view is on and its world belongs to
   another level, one 3D frame is drawn behind the panels. That frame builds the world, compiles the shaders and uploads
   the textures. The 3D frame only reads the game state, so the game does not change.

Not done:
- Half resolution for the light and post passes. It is not needed for the target, and it would blur the pixel art and
  change the picture.
- `drawGlass` per glass pixel (sheen band and lamp distance) and the 3D texture uploads (`texSubImage2D`, the whole layer
  each frame) are the next candidates if more headroom is needed.

## Checks

- **Same picture:** the canvas hash and the 3D layer hash, together with the hero's x and HP, are the same before and
  after for all 18 level/view scenes (the "same picture" column).
- **Screenshots:** made at the same frame against a copy of main d00f5dc served on its own port (`shots.sh`, then a pixel
  diff).
  - Pier 9 2D/3D, casino 3D, train 2D/3D, hospital 2D: 0 pixels differ.
  - Street 2D: 17,913 pixels differ, only in the tutorial card (top right, DOM). Its CSS animation was at a different
    moment. The canvas is the same.
  - Spire 3D: 8 pixels differ in the weapon icon ring (bottom left, DOM).
- **3D after the pre-warm:** a screenshot of the Palm House and the casino after their intro panels in 3D shows the
  level drawn normally.
- **Golden hashes** (`PORT=8807 sh tools/golden.sh`): all four URLs give the "Current" hashes (demo `76752384`/`ae334fff`,
  3D `bc51a93b`/`75c14d2a`; boss `acf4859b`/`77cb15c1`, 3D `de1871a3`/`4c7f7dca`). The state, buf and l3 hashes did not
  change, so tests/golden.md is unchanged.
