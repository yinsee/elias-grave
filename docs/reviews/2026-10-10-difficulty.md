# Difficulty: one shared model, then per boss (2026-10-10)

Steps 2 and 3 of section 4 of `docs/reviews/2026-10-10-playtest.md`. The source table is the playtest's `cross_difficulty.md`.

## 1. The shared model (`src/core/difficulty.js`)

Every number below is in one place. Arrays are [Easy, Medium, Hard, Wicked].

| Rule | Data | Where it acts |
|---|---|---|
| Damage taken | `DIFFS[].dmg` 0.7 / 1 / 1.15 / 1.3 | `hurtPlayer` (every blow, shot, train, hazard) and `G.heroDmg(n)` for a level's own HP drains (fire on the floor, a bone saw's grind, drowning, Teague's dunk, Kalt's pin, the train door). Knock-back uses the blow's own size, not the scaled one. |
| Hazards that scaled on their own | flat now (the Medium value) | Pier 9 tuna 14, Line Zero fire 14/s and third rail 12, casino fire 6/s, oxygen 22, glass shards 14, Kalt's shark 22, Lenz's bow 22. After the scale they are close to the old arrays (for example shards 10/14/16/18 exactly). |
| Line Zero trains | `TRAIN_DMG` [40, 40, 48, 54] | after the scale: 28 / 40 / 55 / 70 (was 30 / 50 / 70 / 80) |
| Checkpoint HP | `DIFFS[].ckHp` 60 / 60 / 40 / 0 | `setCkpt`: on the first arrival at a section or boss checkpoint, HP = max(HP, ckHp). The checkpoint keeps that HP; a retry gives it back (was: always 100). A boss's phase checkpoint does not heal in the fight; its retry gets the same floor. |
| Falls | `FALL` { ledge: 30, hard: 40 } | Easy, Medium: -30 and back on the ledge (the train's boss car was 35, the Spire's voids 15 / 20, the mullion catch 20). Hard: `G.fallOut` (a second wind, or -40). Wicked: the Wasted card. The cable snap: 30 / 30 / 40 / lethal. Only the train and the Spire have falls. A fall is not scaled by `dmg`. |
| Boss HP | `BOSS_HP` x `HP_K` [0.8, 1, 1.2, 1.4] (`hpCurve`) | Malaspina 800, Marchetti 1080 (the curve's 900 + 20 %), Switch 900, Brask 920, Kalt 940, Krieg 960, Vane 1000, Lenz 1080, Bell 1200 (Medium). Phase lines are fractions, so they move with the HP. |
| Boss crews | `crewCap(d, alive, total, maxAlive = 3)` | at most `DIFFS[].crew.n` (6 / 8 / 10 / 12) in all and 3 alive; a boss may ask for fewer. New total caps: Brask (hall and salon share it), the Cooler, Teague, Lys, Kessel. Vane's yard keeps 5 alive on Wicked. |
| Phase checkpoints | `phaseCk(ph)` / `atPhaseCk(ph)` (engine) | the last phase of every boss on Easy, Medium and Hard (Wicked: a retry restarts the chapter). New: Malaspina (phase 2), Marchetti, Switch, Brask, Kalt, Vane (phase 3). Already there: Krieg's roof, Lenz, Bell's rooms. A retry starts the boss just under the line, so the phase change plays again. |
| Bandages | `STREET_BANDS` [2170], `P9.BANDS` [2250] | one before Malaspina (the club roof stage) and one before Marchetti (the market front). |

Found on the way: a retry at the casino's boss checkpoint gave the salon Brask full HP (the hall's intro code refilled him). Fixed in the
phase-checkpoint commit (`S.introDone` on the retry).

## 2. Per boss (step 3)

| Boss | Change | Why (the playtest) |
|---|---|---|
| Marchetti | HP +20 % over the curve (864 / 1080 / 1296 / 1512) | 31 HP lost on Hard |
| Tinder | HP x1.5 (390 / 480 / 570 / 660); every torch string at least 2 hits | down in 7-15 s. The review asked x2; with the 2-hit strings x2 lost the bot the fight on Medium (3 of 3 seeds), so x1.5 |
| The Porter | poise 20 -> 40, HP +25 % (280 / 330 / 380 / 430) | 0 HP lost on Hard |
| Lys | HP 360 / 450 / 540 / 630; a decoy's fan cuts like hers from Medium (Easy: harmless) | 15-30 s, even on Wicked |
| Teague | faceplate 80 -> 50; a front body hit while the glass holds x0.7 on Easy and Medium (x0.5 Hard, Wicked) | the glass soaked the fight |
| Kalt | the dive's bubble trail 1.2 s on Easy and Medium (0.9 Hard, Wicked) | the dive: 72 of 304 HP on Easy |
| Vane (Medium) | one dot per "Mark!", sniper lock 0.9 -> 1.1 s, crew alive 2, a sniper round 22 (15 / 22 / 30 / 35 after the scale) | 8 tries on Medium |
| Bell | phase-1 crew: none on Easy, one on Medium (`BELL.crew.max` [0, 1, 4, 4]) | 3 deaths in 3 min on Medium |
| Line Zero trains | see above | one hit was 50 on Medium |
| Pier 9 (Wicked) | at most 5 Saltmen alive (`P9.ALIVE`) | 7-8 alive in the yard |

Design choices the review did not settle (the simplest fair option):
- "Decoys from Medium" (Lys): decoys already stood in the mirrors on every setting, so their fans now do full damage from Medium.
- The Kalt "0.6 -> 0.9 s": the data already said 0.9; the trail is now 1.2 s on Easy and Medium (+0.3 s).
- Hazard arrays that already rose with the setting are flat, so the setting's scale is not counted twice.
- A phase checkpoint refills the second winds (as Lenz's and Kalt's did before).

## 3. Bot runs: before and after

**Method.** `tests/bossbot.html` now runs every boss and the step-3 mini-bosses with one bot: `sh tools/bossbot.sh <boss> <diff>
varied <seed> "&retries=3&max=420"`, boss = `street`, `pier`, `metro` (Switch), `casino` (Brask, hall and salon), `aquarium` (Kalt),
`hospital` (Krieg, theatre and roof), `palmhouse` (Vane), `train` (Lenz), `spire` (Bell, all rooms), or a mini (`tinder`, `teague`,
`porter`, `lys`, ...). Real key events only; a hook only jumps to the fight and sets the setting. The bot reads tells (it dodges a
blow just before it lands), pokes an idle boss and strings attacks into an opening. It has no level-specific reads: it does not dodge
trains, climb to Switch's balcony, follow Kalt up the hatch or use Bell's gears. After a Wasted card it retries from the checkpoint up
to 3 times (Wicked: one life, a retry restarts the chapter). "Before" = main at 46c7f40 (a copy served on its own port), "after" =
this branch: the same bot and seeds. K.O. counts every knock-down (a second wind spent, or the Wasted K.O.); HP counts every HP drop
over all tries; time is the fight time over all tries (cap 420 s). "n/a": the headless page did not load in 4 tries (the machine
ran at a load average of 40-50 from parallel agents).

**Limits.** One seed per cell except the Medium summary (seeds 1-3). The bot is weaker than a player in the fights with a set piece
(Switch, Kalt, Vane, Bell), before and after alike: there, the numbers compare the two builds, not the real length of the fight. A
mini is fought alone: when it is not up (after a retry from a section checkpoint) the bot walks on and ignores goons, so a "no fight"
row (Tinder on Hard) is the bot's limit, not the boss.

| Boss | Setting | Before | After |
|---|---|---|---|
| Malaspina | Easy | won, 1 K.O., 128 HP, 119 s | won, 0 K.O., 56 HP, 92 s |
| Malaspina | Medium | n/a | won, 0 K.O., 65 HP, 96 s |
| Malaspina | Hard | won, 2 K.O., 1 retry, 225 HP, 216 s | won, 0 K.O., 147 HP, 122 s |
| Malaspina | Wicked | Wasted, boss 47 %, 1 K.O., 100 HP, 102 s | Wasted, boss 47 %, 1 K.O., 158 HP, 102 s |
| Marchetti | Easy | won, 1 K.O., 100 HP, 82 s | won, 0 K.O., 71 HP, 79 s |
| Marchetti | Medium | won, 9 K.O., 3 retries, 582 HP, 425 s | won, 1 K.O., 100 HP, 117 s |
| Marchetti | Hard | Wasted, boss 7 %, 8 K.O., 3 retries, 569 HP, 381 s | Wasted, boss 54 %, 8 K.O., 3 retries, 540 HP, 313 s |
| Marchetti | Wicked | Wasted, boss 79 %, 1 K.O., 100 HP, 52 s | Wasted, boss 82 %, 1 K.O., 100 HP, 45 s |
| Tinder | Easy | n/a | won, 2 K.O., 196 HP, 87 s |
| Tinder | Medium | won, 1 K.O., 118 HP, 46 s | n/a |
| Tinder | Hard | Wasted, no fight, 8 K.O., 3 retries, 540 HP, 145 s | Wasted, no fight, 8 K.O., 3 retries, 540 HP, 159 s |
| Switch | Easy | won, 5 K.O., 1 retry, 473 HP, 284 s | won, 3 K.O., 263 HP, 138 s |
| Switch | Medium | Wasted, boss 20 %, 12 K.O., 3 retries, 874 HP, 336 s | Wasted, boss 75 %, 12 K.O., 3 retries, 759 HP, 311 s |
| Switch | Hard | Wasted, boss 100 %, 8 K.O., 3 retries, 547 HP, 159 s | Wasted, boss 94 %, 8 K.O., 3 retries, 619 HP, 180 s |
| Switch | Wicked | n/a | Wasted, boss 66 %, 1 K.O., 100 HP, 37 s |
| Brask (hall + salon) | Easy | won, 2 K.O., 210 HP, 122 s | won, 2 K.O., 208 HP, 139 s |
| Brask (hall + salon) | Medium | Wasted, boss 54 %, 13 K.O., 3 retries, 859 HP, 377 s | won, 8 K.O., 1 retry, 570 HP, 249 s |
| Brask (hall + salon) | Hard | n/a | Wasted, boss 74 %, 8 K.O., 3 retries, 623 HP, 207 s |
| Brask (hall + salon) | Wicked | Wasted, boss 93 %, 1 K.O., 100 HP, 28 s | Wasted, boss 97 %, 1 K.O., 100 HP, 21 s |
| Teague | Medium | won, 5 K.O., 1 retry, 305 HP, 129 s | won, 8 K.O., 2 retries, 475 HP, 197 s |
| Teague | Hard | won, 5 K.O., 2 retries, 397 HP, 146 s | Wasted, boss 65 %, 8 K.O., 3 retries, 540 HP, 196 s |
| Kalt | Easy | Wasted, boss 60 %, 17 K.O., 3 retries, 1122 HP, 386 s | Wasted, boss 60 %, 16 K.O., 3 retries, 945 HP, 412 s |
| Kalt | Medium | Wasted, boss 60 %, 13 K.O., 3 retries, 715 HP, 318 s | Wasted, boss 60 %, 13 K.O., 3 retries, 635 HP, 310 s |
| Kalt | Hard | Wasted, boss 77 %, 9 K.O., 3 retries, 575 HP, 211 s | Wasted, boss 60 %, 9 K.O., 3 retries, 515 HP, 215 s |
| Kalt | Wicked | Wasted, boss 95 %, 1 K.O., 100 HP, 25 s | n/a |
| The Porter | Medium | won, 0 K.O., 44 HP, 32 s | won, 0 K.O., 96 HP, 46 s |
| The Porter | Hard | n/a | won, 0 K.O., 63 HP, 33 s |
| Krieg (theatre + roof) | Easy | won, 2 K.O., 320 HP, 137 s | won, 1 K.O., 235 HP, 110 s |
| Krieg (theatre + roof) | Medium | won, 0 K.O., 72 HP, 81 s | won, 0 K.O., 142 HP, 98 s |
| Krieg (theatre + roof) | Hard | Wasted, boss 90 %, 8 K.O., 3 retries, 616 HP, 258 s | Wasted, boss 90 %, 8 K.O., 3 retries, 540 HP, 278 s |
| Krieg (theatre + roof) | Wicked | Wasted, boss 39 %, 1 K.O., 100 HP, 62 s | Wasted, boss 72 %, 1 K.O., 100 HP, 45 s |
| Vane | Easy | time out, boss 92 %, 9 K.O., 2 retries, 620 HP, 420 s | won, 4 K.O., 278 HP, 263 s |
| Vane | Medium | Wasted, boss 71 %, 12 K.O., 3 retries, 680 HP, 340 s | time out, boss 57 %, 9 K.O., 3 retries, 782 HP, 420 s |
| Vane | Hard | Wasted, boss 90 %, 8 K.O., 3 retries, 540 HP, 212 s | Wasted, boss 72 %, 8 K.O., 3 retries, 540 HP, 220 s |
| Vane | Wicked | Wasted, boss 100 %, 1 K.O., 100 HP, 33 s | Wasted, boss 100 %, 1 K.O., 100 HP, 29 s |
| Lenz | Easy | n/a | won, 1 K.O., 162 HP, 129 s |
| Lenz | Medium | Wasted, boss 18 %, 13 K.O., 3 retries, 808 HP, 312 s | won, 4 K.O., 264 HP, 153 s |
| Lenz | Hard | Wasted, boss 66 %, 8 K.O., 3 retries, 610 HP, 414 s | Wasted, boss 30 %, 7 K.O., 3 retries, 561 HP, 360 s |
| Lenz | Wicked | Wasted, boss 72 %, 1 K.O., 126 HP, 74 s | Wasted, boss 86 %, 1 K.O., 134 HP, 78 s |
| Lys | Medium | won, 0 K.O., 19 HP, 26 s | won, 0 K.O., 82 HP, 61 s |
| Lys | Hard | won, 0 K.O., 129 HP, 35 s | won, 0 K.O., 163 HP, 65 s |
| Bell (gears, pendulum, face) | Easy | time out, boss 64 %, 1 K.O., 157 HP, 420 s | won, 15 K.O., 3 retries, 920 HP, 282 s |
| Bell (gears, pendulum, face) | Medium | time out, boss 65 %, 4 K.O., 1 retry, 298 HP, 420 s | time out, boss 66 %, 1 K.O., 116 HP, 420 s |
| Bell (gears, pendulum, face) | Hard | Wasted, boss 33 %, 9 K.O., 3 retries, 575 HP, 149 s | time out, boss 66 %, 5 K.O., 2 retries, 370 HP, 420 s |
| Bell (gears, pendulum, face) | Wicked | Wasted, boss 80 %, 1 K.O., 100 HP, 26 s | Wasted, boss 82 %, 1 K.O., 100 HP, 26 s |

| Boss (Medium, seeds 1-3) | Before | After |
|---|---|---|
| Malaspina | n/a | 3/3 won, 0.7 K.O., 135 HP, 123 s |
| Marchetti | 3/3 won, 5.7 K.O., 389 HP, 273 s | 2/2 won, 1.5 K.O., 129 HP, 119 s |
| Tinder | 1/1 won, 1.0 K.O., 118 HP, 46 s | 1/2 won, 6.5 K.O., 399 HP, 136 s |
| Switch | 0/2 won, 12.0 K.O., 879 HP, 339 s | 0/2 won, 12.0 K.O., 796 HP, 296 s |
| Brask (hall + salon) | 0/1 won, 13.0 K.O., 859 HP, 377 s | 3/3 won, 7.0 K.O., 521 HP, 233 s |
| Teague | 2/3 won, 6.0 K.O., 369 HP, 156 s | 3/3 won, 4.7 K.O., 303 HP, 133 s |
| Kalt | 0/3 won, 13.7 K.O., 759 HP, 306 s | 0/3 won, 13.7 K.O., 655 HP, 304 s |
| The Porter | 3/3 won, 0.0 K.O., 57 HP, 31 s | 3/3 won, 0.0 K.O., 65 HP, 38 s |
| Krieg (theatre + roof) | 2/2 won, 0.5 K.O., 125 HP, 96 s | 1/2 won, 1.0 K.O., 138 HP, 259 s |
| Vane | 0/3 won, 11.0 K.O., 689 HP, 370 s | 0/2 won, 10.5 K.O., 731 HP, 375 s |
| Lenz | 1/3 won, 9.7 K.O., 595 HP, 290 s | 2/3 won, 8.7 K.O., 475 HP, 267 s |
| Lys | 3/3 won, 0.0 K.O., 38 HP, 24 s | 2/2 won, 0.0 K.O., 80 HP, 49 s |
| Bell (gears, pendulum, face) | 0/2 won, 9.5 K.O., 582 HP, 354 s | 0/3 won, 8.7 K.O., 443 HP, 252 s |

**The playtest's own bots (before, from the playtest reports), for reference:** Malaspina Hard 168 HP, 1 K.O.; Marchetti Hard 31 HP
(with the shotgun); Tinder 7-15 s; Switch Medium 54 HP, 0 K.O. from `toBoss`, Hard Wasted at 9 %; Brask Medium 117 HP, 0 K.O.;
Teague Medium Wasted once (cleared at 95 % dodges with 4 K.O.); Kalt never beaten; the Porter on Hard 0 HP; Krieg Medium 135 + 36 HP,
2 K.O.; Vane Medium 8 tries; Lenz Medium 118 HP; Lys 15-30 s; Bell Medium 3 deaths in 3 minutes in phase 1.

## 4. What the runs show

- **Medium, 0-2 K.O.** Malaspina (0.7), Marchetti (1.5), the Porter (0), Krieg (1.0; one seed timed out in the theatre with the boss
  at 49 %, 2 K.O.) and Lys (0). Marchetti went from 5.7 K.O. over three tries to 1.5: the phase-3 checkpoint and the arrival HP keep
  one slip from costing the whole fight. Brask: 0 of 1 won -> 3 of 3 won (the salon retry no longer refills him to full HP).
  Teague: 6.0 -> 4.7 K.O., 3 of 3 won (the glass breaks sooner). Lenz: 1 of 3 -> 2 of 3 won. Switch, Kalt, Vane and Bell stay over
  2 K.O. for this bot before and after: their set pieces need reads the bot does not have (the playtest bots above did better there).
- **Order.** On Medium the boss HP now rises with each chapter (800, 1080, 900, 920, 940, 960, 1000, 1080, 1200); Marchetti is the
  one step over the curve (+20 %), as the review asked. Medium fight times rise from Malaspina (123 s) and Marchetti (119 s) to Brask
  (233 s) and Lenz (267 s).
- **Hard is harder than Medium** in every fight the bot can play: Malaspina 65 -> 147 HP; Marchetti won -> Wasted at 54 %; Brask won
  -> Wasted at 74 %; Teague won -> Wasted at 65 %; Krieg won -> Wasted at 90 %; Lenz won -> Wasted at 30 %.
- **Wicked** stays one life: each Wicked run ends at the first K.O. (100-158 HP taken with the x1.3 scale). The Pier 9 yard cap and
  the crew caps take away the crowds that made it unfair; a bot cannot judge "readable".
- **Tinder:** x2 overshot (0 of 3 won on Medium, the first try lost each time); x1.5 gives 1 of 2 won on Medium (1 K.O. in the win)
  and a win with 2 K.O. on Easy.
- **Lys** now lasts 37-65 s (was 20-35 s) and costs 80-163 HP (was 19-129). **The Porter** costs a little more (57 -> 65 HP on
  Medium) and lasts longer; with poise 40 the bot no longer stun-locks him.
- **One stuck run:** a casino Wicked page did not finish in 68 minutes once (headless, under load); its re-run and a run in a normal
  browser ended in 21 s. Not reproduced.

## 5. Golden hashes

`tests/golden.md`: the street demo and the street boss autotest change on purpose (the demo runs on Hard: x1.15 damage, Malaspina's
HP 1000 -> 960, the bandage at x 2170, the checkpoint HP).
