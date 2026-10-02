# Golden autotest hashes

Run with a static server (`python3 -m http.server 8765`) and open the URL; the page title shows the result.
Two runs of the same URL must give the same hashes. A refactor step that keeps both hashes changed nothing.
A step that changes behaviour on purpose records new hashes here, with the reason.

| URL | state | buf | recorded | note |
|---|---|---|---|---|
| `ragdoll.html?autotest=demo&frames=1200` | `5ae6a552` | `e8b8b31b` | 2026-10-02 | step 0 baseline (attract demo, seed 1, 960x540 view) |
| `ragdoll.html?autotest=boss&frames=1800` | `daa2ec28` | `397917f1` | 2026-10-02 | step 0 baseline (skipToBoss + demo, seed 1) |

Options: `?seed=N` (repeatable random numbers), `?fixed` (clock steps exactly 1/60 s per frame), `?autotest=demo|boss&frames=N`.
