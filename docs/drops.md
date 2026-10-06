# Enemy drops

Status: in the game (2026-10-06). Code: `lootDrop()` and `dropWeapon()` in `src/legacy.js`; the tuning in `src/sim/weapons/drops.js` (`LOOT`, `STREET_DROPS`); the Pier 9 table in `src/levels/pier9.js` (`DROPS`).
A level gives its table as `LV.drops` (`{ carry, tier }`). A new level adds its own `DROPS` export and sets it on its `LV` object.
Every roll uses `simRand` (never `Math.random`), so a seeded run gives the same drops in 2D and 3D.

## 1. Rules

When a goon dies, `lootDrop` runs three checks in this order: a weapon, an ammo box, a bandage.

### 1.1 Weapons

1. **Only what he carried.** The goon's own weapon (`ROLE.w`, or the Saltman's `R.w`) goes through the level's `carry` map to a hero weapon. A goon with no weapon (brawler, deckhand) drops no weapon. A weapon that is not in the map (thrown knives) drops nothing.
2. **Only an open tier.** The level's `tier` map lists the hero weapons open by the goon's stage (`e.zone`: the street stage number, the Pier 9 wave id, or `arena`). A weapon that is not open there drops nothing.
3. **A gap and a pity counter, not pure chance.** `loot.n` counts every kill since the last weapon drop. A drop can come only when `n >= wGap`. The chance is then `(wP + wPity x (n - wGap)) x k`, so it becomes sure a few kills after the gap.
4. **At most 2 on the ground** (`wMax`). A third drop removes the oldest one.
5. **A dropped gun holds 20-40% of a full load** (`gunAmmo`). A dropped blade has its full durability for the difficulty.
6. A boss drops no weapon.

### 1.2 Ammo boxes

- A box drops only when the hero holds a gun, or a gun lies on the ground within 200 px of him (`boxReach`).
- The chance is `boxP x k` (0.4 x k). When his gun is below a quarter full, it is `boxLowP x k` (0.75 x k). The maximum is 0.9.
- At most 2 boxes lie on the ground (`boxMax`).
- A boss drops 2 boxes (Easy, Medium) or 1 box (Hard, Wicked), inside the same cap, and only with a gun in reach.
- The tutorial gun lessons are not changed: `tutGate` still drops a box near the hero when a lesson needs rounds and the stage has no box.

### 1.3 Bandages

- The chance is `bandP x k` (0.12 x k). When the hero has less than 35 HP, it is `bandLowP x k` (0.5 x k).
- At most 1 bandage lies on the ground (2 on Easy) (`bandMax`).
- A boss always drops one, also over the cap.

### 1.4 Difficulty

The arrays in `LOOT` are `[Easy, Medium, Hard, Wicked]`. The attract demo plays as Hard (`DIF()`).

| | Easy | Medium | Hard | Wicked |
|---|---|---|---|---|
| `k` (chance scale) | 1.4 | 1 | 0.8 | 0.6 |
| `wGap` (kills between weapons, at least) | 2 | 3 | 4 | 5 |
| weapon chance at the gap | 0.49 | 0.35 | 0.28 | 0.21 |
| ammo box chance (low gun) | 0.56 (0.9) | 0.4 (0.75) | 0.32 (0.6) | 0.24 (0.45) |
| bandage chance (below 35 HP) | 0.17 (0.7) | 0.12 (0.5) | 0.1 (0.4) | 0.07 (0.3) |
| bandages on the ground | 2 | 1 | 1 | 1 |
| boss ammo boxes | 2 | 2 | 1 | 1 |

## 2. Level tables

### 2.1 The street (the tutorial)

The bench pickups stay the source of each weapon. A stage drops only the weapons that it or an earlier stage teaches.

| Goon weapon | Hero weapon |
|---|---|
| knife, machete | katana |
| pipe | axe |
| pistol | shotgun or machine gun (whichever is open) |
| fists, thrown knives | nothing |

| Stage (zone) | Goons (`ZROLES`) | Open |
|---|---|---|
| 2 · Bare hands (1) | brawler x2 | nothing |
| 3 · Katana (2) | brawler, knife, brawler | katana |
| 4 · Axe (3) | knife, thrower, pipe | katana, axe |
| 5 · Shotgun (4) | machete, pistol, thrower, brawler | katana, axe, shotgun |
| 6 · Machine gun (5) | pistol, pipe, thrower, machete | katana, axe, shotgun, machine gun |
| 8 · Boss (arena) | the crew | katana, axe, shotgun, machine gun |

### 2.2 Pier 9 (chapter 1, the docks)

Melee only on the quay and in the container yard. The shotgun opens at the market front (wave `w3`, where its trestle stands) and in the hall. Pier 9 has no machine gun (the level plan places none).

| Saltman | Weapon | Hero weapon |
|---|---|---|
| Deckhand | fists | nothing |
| Filleter | knife | katana |
| Pipeman | pipe | axe |
| Gaffer | gaff | axe |
| Hookthrower | thrown knives | nothing |
| Tallyman | pistol | shotgun |

| Wave | Where | Open |
|---|---|---|
| `w1` | the quay, the net loft | katana, axe |
| `w2`, `w2b` | the container yard | katana, axe |
| `w3` | the crane, the market front | katana, axe, shotgun |
| `arena` | Marchetti's crew in the hall | katana, axe, shotgun |

Note: today the Tallymen come only in `w2b` (before the shotgun opens), so no Saltman drops a gun. The shotgun on the trestle and the shell boxes are the Pier 9 gun source. To give a gun drop late in the level, add a Tallyman to `w3` or to the hall crew.

## 3. Measured (seed 1, `?manual`)

Test: spawn one goon of the stage 70 px from the hero, kill him with `__pier9.kill()`, step 60 frames (1 s), 50 times; count every new drop. The hero holds fists unless the row says so. The hero does not pick anything up, so the caps and the 30 s box life limit the box and bandage counts.
Columns: weapons dropped; ammo boxes; bandages; the most on the ground at once (weapons / boxes / bandages).

The street, by stage (E = Easy, M = Medium, H = Hard, W = Wicked):

| Stage (zone) | E | M | H | W |
|---|---|---|---|---|
| 2 (1) | none; 0; 4 | none; 0; 2 | | |
| 3 (2) | katana 14; 0; 5 | katana 10; 0; 4 | katana 7; 0; 2 | katana 6; 0; 1 |
| 4 (3) | axe 12, katana 4; 0; 4 | axe 7, katana 5; 0; 2 | axe 5, katana 3; 0; 2 | katana 6, axe 1; 0; 2 |
| 5 (4) | katana 12, shotgun 1; 2; 5 | katana 9, shotgun 2; 2; 3 | katana 5, shotgun 3; 4; 2 | katana 5, shotgun 1; 2; 2 |
| 6 (5) | katana 10, axe 5, shotgun 2; 2; 4 | katana 6, axe 2, shotgun 2, mg 2; 2; 2 | axe 4, katana 2, shotgun 2, mg 2; 2; 2 | axe 3, katana 2, shotgun 1; 2; 1 |
| arena | katana 9, axe 7, shotgun 1, mg 1; 2; 2 | katana 5, axe 3, shotgun 2, mg 1; 3; 2 | katana 4, axe 1, shotgun 1, mg 1; 4; 2 | axe 3, katana 2, shotgun 1, mg 1; 2; 1 |

Weapons per 50 kills over all street stages 3-8: Easy 13-18 (one per 3-4 kills), Medium 10-12 (one per 4-5), Hard 7-10 (one per 5-7), Wicked 6-7 (one per 7-8). The most on the ground was always 2 weapons, 2 boxes, 2 bandages (Easy) or 1 (the rest).
Gun ammo when dropped: 20-40% in every run.

Pier 9, by wave (the Medium rosters, in order):

| Wave | E | M | W |
|---|---|---|---|
| `w1` | axe 11, katana 6; 0; 5 | axe 7, katana 3; 0; 2 | axe 7; 0; 2 |
| `w2` | axe 16; 0; 5 | axe 11; 0; 2 | axe 7; 0; 2 |
| `w2b` (Hookthrower, Tallyman) | none; 0; 4 | none; 0; 1 | none; 0; 3 |
| `w3` | katana 12; 0; 5 | katana 7, axe 4; 0; 1 | axe 5, katana 2; 0; 2 |
| `arena` | axe 12, katana 7; 0; 4 | axe 9, katana 2; 0; 2 | axe 5, katana 1; 0; 1 |

No gun and no ammo box dropped on Pier 9 with fists (no Saltman carries a gun where the shotgun is open).

Special cases (street):

| Case | M | W |
|---|---|---|
| stage 5, shotgun held, 6 rounds | 4 boxes | 2 boxes |
| stage 5, shotgun held, 1 round | 4 boxes | 4 boxes |
| arena, hero at 30 HP | 5 bandages (E: 6) | 2 bandages |

## Goons by difficulty (waves and reinforcements)

More goons on a higher difficulty come as reinforcement waves, not as bigger first waves. The data is `DIFFS[].reinf` and
`DIFFS[].crew` in `src/core/difficulty.js` (the street) and the `reinf` waves (`w1b`, `w2c`, `w3b`) in `src/levels/pier9.js`.

- Street: each fight stage keeps its first wave (`WAVES` in `src/legacy.js`). When half of the stage's goons are down, the next
  reinforcement wave walks in from a door, an alley, a car or off the screen, on both sides, never on top of the hero, with a
  "Reinforcements" toast. The stage's kill lesson and its gate wait for the last wave. Easy has none (it teaches).
- Pier 9: on Hard and Wicked, w1, w2b and w3 each call one reinforcement wave (`then`) at half down; the Bosun waits for w3 and w3b.
- The street boss's crew: `crew.n` goons in all, at most `crew.alive` at once. Marchetti's crew was already scaled (`MARCHETTI.crew`).
- The swing cap and the spacing rules (`DIFFS` `swing`, `gap`, `sepStep`) keep the bigger fights readable. The drop caps hold: they
  count what lies on the ground, not the kills (more kills only feed the pity counter).

| Stage (street) | first wave | Easy | Medium | Hard | Wicked |
|---|---|---|---|---|---|
| reinforcement waves | | none | 2 | 2, 3 | 2, 3, 3 |
| 2 Bare hands | 2 | 2 | 4 | 7 | 10 |
| 3 Katana | 3 | 3 | 5 | 8 | 11 |
| 4 Axe | 3 | 3 | 5 | 8 | 11 |
| 5 Shotgun | 4 | 4 | 6 | 9 | 12 |
| 6 Machine gun | 4 | 4 | 6 | 9 | 12 |
| Street waves in all | 16 | 16 | 26 | 41 | 56 |
| Boss crew (in all / at once) | | 6 / 2 | 8 / 2 | 10 / 3 | 12 / 3 |

| Pier 9 wave | Easy | Medium | Hard | Wicked |
|---|---|---|---|---|
| w1 + w1b | 4 | 6 | 7 + 2 | 8 + 3 |
| w2 + w2b + w2c | 2 + 1 | 3 + 2 | 3 + 3 + 2 | 4 + 4 + 3 |
| w3 + w3b | 3 | 4 | 5 + 2 | 6 + 3 |
| wb + wb2 (the Bosun and help) | 1 + 1 | 2 + 1 | 3 + 2 | 3 + 3 |
| Pier 9 waves in all | 12 | 18 | 29 | 37 |
| Marchetti's crew (at most) | 4 | 6 | 9 | 12 |

Measured with `?manual`: `__pier9.street()`, `.setDiff(i)`, the stage's other lessons in `__sim.done`, then `__pier9.kill(1)` with steps
between (`__pier9.kill(n)` kills at most n); Pier 9 with `__pier9.start()` and `.tp(x)`. Lesson goons (the stage gate's spare goon for an
unlearned goon lesson) are not counted.
