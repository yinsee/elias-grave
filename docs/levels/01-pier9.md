# Level 1: "Pier 9"

Status: design plan (2026-10-02). Sources: `docs/story-bible.md` (Level 1, the Saltmen, Marchetti) and `docs/architecture.md` sections 3 (level format) and 4 (boss framework). Level id `docks`, module `src/levels/docks/`, boss module `src/bosses/marchetti.js`.

Units: 22 px = 1 m. Ground at y 280. The hero is about 42 px tall (standing top y 238, crouch top about y 252). Difficulty counts read **E/M/H/W** (Easy, Medium, Hard, Wicked; aggression `A` = 1/2/4/8).

---

## 1. Summary

| Item | Value |
|---|---|
| Story beat | Elias follows the ledger page ("Collector: S. Marchetti, Pier 9"). He wants the collector. He learns that the fire was not Marchetti's idea. It was "just business": Marchetti only collects. The fire "came from below", from Switch's Tunnel Rats. The cash crates carry old Line 0 metro tokens, which point to Level 2. |
| Setting | The Pier 9 docks and fish market. Outdoor: the quay, the net loft, the container yard, the crane slip, the bait shack, the reefer-truck loading bay. Indoor: the fish market sorting floor, the auction ring, the walk-in freezer. |
| Time / weather | Dawn, 05:40 to 06:00. Slant sleet outdoors (grey-white streaks, heavier and slower than rain). Low harbour fog in the far backdrop. Fog horns every 20-40 s. Indoors: dry, cold, meltwater on the floor, breath vapour. |
| Mood | Cold, wet, industrial, exhausted. The first real level after the tutorial: the hero is a professional at work, the goons are scared of a story. Palette: grey-blue dawn, sodium amber lamps, red of the burning oil drum, cyan of the freezer. Red tint on every Choir sign (the tuning fork, the Choir coin, the stopped clock). |
| Faction | The Saltmen: yellow oilskins, sou'westers, rubber boots, fish knives, pipes, gaffs. |
| Length target | 10 min on Medium for a first play (8 min fast, 12 min careful). Budget per beat is in section 3. |
| Slow-motion set piece | The shotgun slide across the iced sorting floor between rows of tuna (beat 9). |
| Glass / environment set pieces | The fire-axe case and the loft office window (beat 3); the auctioneer's booth (beat 10); the crane crossing over the slip (beat 5); the conveyor of frozen tuna, the ice floor and the freezer fog in the boss arena. |
| Hook | The cash crates in the freezer are stamped with brass Line 0 metro tokens. |
| Twist setup | A Bell & Sons wall clock stopped at 3:17 hangs above the auctioneer's podium in the boss arena (bible rule for every boss lair). |

**Music and sound mood.**
- Exploration: a low cello drone in D minor that sits under the fog horn. The fog horn is tuned to the drone, so it reads as part of the score. Sparse metal percussion (chain links, a hull being struck).
- Combat: the drone stays; a work-song rhythm enters (stomped boots, hammered steel, a baritone hum with no words). Intensity layers add on wave count.
- Slow motion: all music drops a fifth and low-passes; the shotgun blasts are dry and close; ice hiss is loud.
- Boss: "Market Close". Brass and an accordion distorted through a loudspeaker horn, like an auction call. Phase 2 adds an auctioneer's rhythmic chant sample (wordless). Phase 3 removes everything except a heartbeat kick, wind and the freezer compressor hum.
- Constant ambience: sleet on steel, gulls (outdoor only), water slapping the piles, the hum of reefer units, the conveyor rattle.

---

## 2. Sections map

### 2.1 Sections

| Section id | x-range | Indoor | Backdrop | Lighting | Weather | Camera |
|---|---|---|---|---|---|---|
| `quay` | 0-1240 | No | Dawn sky (grey-blue to pale peach at the horizon); harbour water with sleet rings; far fog bank with ship silhouettes; distant cranes. | Ambient [0.45, 0.52, 0.70]. Sodium lamps at 120, 480, 860, 1180. Burning oil drum at 420 (red, flicker). | Sleet, k 0.8 | minZoom 0.30, maxZoom 0.60. Opens wide (0.30) for the arrival shot, then eases to 0.45. |
| `yard` | 1240-2200 | No | Same sky; container walls in the far layer; the crane in the mid layer (3D model). The slip (x 1860-1980) shows open water to the bottom of the screen. | Ambient [0.42, 0.50, 0.68]. Crane cab light (amber) at 1900, y 70. Container yard floodlight at 1560, y 40, wide cone. | Sleet, k 1.0 | minZoom 0.28 to keep stack tops (y 109) and the ground in view together. Camera y biases up 30 px while the hero is on stack tops. |
| `bay` | 2200-2600 | No (under a corrugated awning from 2440 to 2600) | Market building facade: painted sign *Marché de la Marée, Pier 9*; a row of lit bunkhouse windows above the awning (residents). | Ambient [0.46, 0.50, 0.62]. Reefer truck tail lights (red) at 2390 and 2550. Awning strip light 2460-2590 (cold white, flickers on hits). | Sleet, k 0.7; none under the awning (x >= 2440). | minZoom 0.32, maxZoom 0.55. |
| `hall` | 2620-3600 | Yes | Interior wall: white tile to 2 m, then grey painted brick; steel roof trusses; the conveyor rail at y 110. The freezer (3440-3600) is behind a sliding insulated door until boss phase 3. | Ambient [0.40, 0.42, 0.55]. Hanging enamel lamps every 120 px (warm). Booth window glow at 2830. Freezer: cyan [0.45, 0.70, 0.85]. Red warning lamp above the arena entry hatch at 2970, y 100. | None. Indoor drips from the roof at 2700, 3150, 3350. Breath vapour on all fighters. | Sorting floor: free follow. Arena: `bounds` locked to [2950, 3440], then [2950, 3600] in phase 3. maxZoom 0.55 for the arena. |

Section joins:
- `quay` to `yard` (x 1240): open, no transition. The ground continues.
- `yard` to `bay` (x 2200): open, no transition.
- `bay` to `hall` (x 2600): a rolling steel shutter (door transition with fade, 0.6 s). Wall `shutter` at x 2600 until the Bosun falls.
- Inside `hall`: wall `arenaGate` at x 2950 drops behind the hero at the boss start. Wall `freezerDoor` at x 3440 lifts in boss phase 3.

### 2.2 Side view of the whole strip

Scale: 1 character = 40 px across. Heights are approximate.

```
x:    0         400       800       1200      1600      2000      2400      2800      3200      3600
      |---------|---------|---------|---------|---------|---------|---------|---------|---------|
y 60                                         ===========CRANE JIB==========
                                                     |        |cab
y110                                         .------.|        |              :=CONVEYOR RAIL (loop)=:
                                             | C x3 | hook  hook                T   T   T   T  |
y166                                   .-----|      |-----.  [CT]<-->          |   |   |   |  |
                                       | C x2|      | C x2|  container            tuna (hazard) |
y200                    LOFT/OFFICE    |     |      |     |  mover   bunkhouse  BOOTH#  clock  |
              lamp      ===========[#] |     |      |     |  y196    windows    =====   3:17   | FREEZER
y223                    |  axe[#]  |.--|     |      |     |          =awning=   |  gallery     |  fog
              drum      |  warehouse||C1|     |      |     |  ~~~~~~  [REEFER][REEFER]|  ===    podium |  cash
y280 _________(*)_______|__________||__|_____|______|_____|__~~~~~~_shack_______|___[ice]__[ice]__==|crates__
     ^start   2           3                 4                5       6     7      8   9/10    11      11c
     QUAY (0-1240)                YARD (1240-2200)          SLIP    BAIT  BAY      HALL (2620-3600)
                                                       1860-1980  1980- 2200-   sort | ARENA 2950-3440 | 3440-
                                                                  2200  2600    2620-2950          FREEZER
```

Legend: `C` container (number = stack height), `[#]` breakable pane, `(*)` burning oil drum, `~~` open water (fall = `killY`), `[CT]` crane container (mover), `T` frozen tuna on a hook, `[ice]` friction zone, digits = encounter beats.

---

## 3. Encounter flow

Total budget on Medium, first play: about 10 min. Times in brackets.

### Beat 1. Arrival (x 0-260) [0:40]

- **Start:** after the opening panels (section 6.1). The hero spawns at x 60 in his coat. The coat-off pose plays when beat 2 starts (cosmetic).
- **Enemies:** none.
- **Placed:** fish crates (`crate`) at 140 and 200; a stack of nets (`bag` reskin) at 230. One bandage under the first lamp at x 120 (teaches that bandages exist without combat pressure).
- **Interaction:** the in-engine echo of panel 3: a fish crate at x 240 with the tuning fork on its lid. Walking past it plays a ring sfx and a 1 s voice-over caption ("I brought their bell back."). Residents: none (open quay).
- **Trigger in:** level start. **Trigger out:** `heroX >= 260`.
- **Why it works:** a quiet 30 seconds of sleet, fog horn and the camera easing in. The player reads the new palette and hears the score before the first punch.

### Beat 2. The burning drum (x 260-700) [1:30]

- **Enemies (wave `w_drum`):** the six Saltmen of panel 4.
  - E: 2 Deckhand, 1 Pipeman, 1 Filleter (4).
  - M: 2 Deckhand, 2 Pipeman, 1 Filleter, 1 Gaffer (6).
  - H: as M, plus 1 Filleter that arrives 8 s later from x 760 (7).
  - W: as H, plus 1 Gaffer from the left edge at x 0 (8, flanked).
- **Placed:** the burning drum at 420 (`barrel` with fire light; see `burningDrum` in section 8). Barrels at 330 and 520. Fish crates at 360, 600. Bottles x3 by the drum (pocketable).
- **Interaction:** kick the burning drum to roll it. It burns goons it hits (8 dmg, knock-down) and leaves a 3 s burning oil patch (12 dmg/s to anyone in it, hero included). Throwing a fish crate breaks it into a fish spray that makes a small 4 s slippery patch (shared ice zone code).
- **Trigger in:** `heroX >= 300` (Saltmen step out of the fog in front of the drum; the drum light rim-lights them). **Trigger out:** `killed: 'w_drum'`.
- **Why it works:** it restates panel 4 in play. It is a fair first fight on open ground with one clear toy (the drum) that teaches "the environment kills".

### Beat 3. The net loft (x 700-1240) [1:30]

- **Layout:** a two-storey warehouse from 720 to 1220. Ground floor is open on the camera side (front wall cut away, like the club). An outside steel stair (`fireEscape`, x 700-740) leads to the loft floor (surface y 200, one-way, x 740-1200). The loft office at 1100-1180 has a window pane (`loftWindow`) facing the loft floor.
- **Enemies (wave `w_loft`):**
  - E: 1 Deckhand (ground), 1 Hookthrower in the office (2).
  - M: 2 Deckhand, 1 Pipeman (ground); 1 Hookthrower in the office; 1 Filleter on the loft floor (5).
  - H: as M, plus 1 Gaffer that climbs the outside stair after the hero (6).
  - W: as H, with 2 Hookthrowers in the office (7).
- **Placed:** a fire axe in a red glass case (`axeCase`, pane hp 30) on the ground floor wall at x 880. Bin at 960, chairs x2 at 1020 (break room). Barrel at 1180 on the loft floor (push it off the edge onto goons below: falling object damage).
- **Interaction:** the Hookthrower shoots from behind the office glass. Its first throw cracks the pane; the hero must climb and break in (any hit on the cracked pane, or a thrown object). Drop-through from the loft floor to the ground. Ledge climb on the loft edge.
- **Trigger in:** `heroX >= 760`. **Trigger out:** `killed: 'w_loft'`, and a toast hints the axe if it was not taken.
- **Why it works:** first vertical fight and first glass. Breaking the axe case is a satisfying "unlock" moment: the axe is the hero's tool for the next three beats.

### Beat 4. Container canyon (x 1240-1860) [1:45]

- **Layout:** four container stacks, each 132 px long (6 m). Tops: stack A 1260-1392 at y 223 (1 high); B 1400-1532 at y 166 (2 high); C 1560-1692 at y 109 (3 high); D 1700-1832 at y 166 (2 high). Ledge climb links A to B, B to C. The ground passes in front of the stacks (front lane), so the player can stay low or go high.
- **Container doors as spawns:** stacks A, B and D have a door on the camera side at ground level. Saltmen kick them open (`from: 'containerDoor'`).
- **Enemies (wave `w_yard1`, then `w_yard2` at 50% of `w_yard1` killed):**
  - `w_yard1` E/M/H/W: 2/3/3/4 (Deckhand, Pipeman, Gaffer mix) from container doors.
  - `w_yard2` E/M/H/W: 1/2/3/3. One Hookthrower on stack C top always; one Tallyman (pistol) on stack D top from M up; H and W add 1 Filleter that climbs.
- **Placed:** no ammo (the hero has no gun yet). Barrels on stack B top (2), pushable off the edge. A pallet of ice (`crate` reskin "ice block") at 1450 that shatters into a 5 s slippery patch. Pocket cans x2 on stack C (hero throws down at the Hookthrower or Tallyman).
- **Interaction:** pushing barrels down onto the ground lane; jumping from stack top to stack top; climbing to C to silence the ranged goons. Goons jump to ledges after the hero (existing behaviour).
- **Trigger in:** `heroX >= 1280`. **Trigger out:** `killed: 'w_yard2'`. The crane cab light turns green (signal that the crossing is live).
- **Why it works:** the first fight where height matters. Ranged goons on top force the player up; brawlers below pull the player down. The stacks are readable shapes for the 3D view.

### Beat 5. The crane crossing (x 1832-1980) [0:45]

- **Layout:** the slip, a ground gap from 1860 to 1980 (open water, `killY` 300). The crane jib runs from 1700 to 2060 at y 60. A crane container (`craneBox`) hangs on cables; its roof is a one-way surface 120 px wide at y 196. It moves pingpong between x 1780 and 2010 (4 s each way, 1 s pause at each end).
- **Enemies:** E: none. M: 1 Deckhand rides the container (2 if Hard/Wicked). W: also 1 Hookthrower on the far quay at 2000 who throws at the hero while the hero rides.
- **Interaction:** jump from stack D (top y 166, x 1832) down onto the container when it arrives at 1780. Ride across. Knock riders into the water (falling enemies die with a splash and a fog-horn sting). Dodge rolls continue off the container edge, so a careless roll means a swim.
- **Falling in:** the hero takes 25 / 25 / 35 / 50 damage, plays a splash and respawns at x 1800 on stack D top after 1.5 s (no instant death on any difficulty; Wicked damage can still kill).
- **Alternative route:** none. The crossing is the only way (the bridge to the right is raised; it shows in the backdrop).
- **Trigger in:** `heroX >= 1800`. **Trigger out:** `heroX >= 1990` on the ground. The crane stops at the far end so backtracking is possible.
- **Why it works:** a short, tense ride with water below and a fight on a moving 120 px platform. It is the first mover in the game; the testbed version teaches the code.

### Beat 6. The bait shack (x 1980-2200) [0:45] (breather)

- **Layout:** a wooden bait-and-tea shack on the quay (painter `shack`), an awning, a bench, a radio playing a 1950s chanson through static. A bunkhouse row above it (residents in lit windows).
- **Enemies:** none.
- **Placed:** bandage x1 (E/M: x2) on the shack counter; a box of shotgun shells is visible behind the counter (an ammo box, but the hero has no shotgun yet: it is a promise of beat 9). Pocket bottles x2.
- **Story beat:** a pinned flyer on the shack wall: *Auction 06:00 sharp. Buyers by invitation. S.M.* A chalkboard tally of names and sums, one line reads *"Bell & Sons: CLOSED"* in red (1 s voice-over: "Closed. That was one word for it.").
- **Trigger in:** `heroX >= 2000`. **Trigger out:** `heroX >= 2200`. The radio cuts off and the fog horn sounds twice.
- **Why it works:** heal, breathe, read the world. The residents switch their lights back on one by one as the hero passes (calm), which pays off when they switch them off in beat 7.

### Beat 7. Reefer trucks: the Bosun (x 2200-2600) [1:30] (elite fight)

- **Layout:** two refrigerated trucks (`vehicle: 'reefer'`), roofs at y 214: truck 1 at 2240-2400, truck 2 at 2420-2560. Cabs face left; cab roofs at y 228 act as a step. The loading dock (surface y 252, x 2560-2600) in front of the shutter.
- **Elite:** **Haak "the Bosun"** (elite variant, section 4). He enters by rolling the shutter up 1 m and ducking out, then the shutter falls shut.
- **Support (wave `w_bosun`):** E/M/H/W: 0/1/2/2 Deckhands at the start; at 50% Bosun HP, 1/1/2/3 more (Filleter, Gaffer).
- **Placed:** barrels at 2300 and 2470 (between and in front of the trucks). A chain hoist hook on the awning at 2500 (decor). Bandage on the dock (H and W: none).
- **Interaction:** the Bosun's gaff pulls the hero off truck roofs. His chain sweep covers two lanes. Reefer doors: a heavy hit on a closed reefer door at 2392 or 2552 swings it open and releases a cold blast (2 s slippery zone 60 px wide behind the truck). The Bosun slips on ice like any goon: knock him into it for a fall and a free 2 s.
- **Residents:** the bunkhouse lights go out window by window when the Bosun first roars.
- **Trigger in:** `heroX >= 2240`. **Trigger out:** `killed: 'w_bosun'` and Bosun dead. He drops the shutter key (cosmetic) and the shutter rolls up (door transition, fade 0.6 s).
- **Why it works:** a mini-boss before the boss. He previews Marchetti's pull-then-chop rhythm on a smaller scale, so the boss feels learned, not unfair.

### Beat 8. The shutter and the sorting floor (x 2620-2700) [0:20] (in-engine scene)

- **Scripted scene (timeline):** fade in inside the hall. Camera holds wide. Rows of frozen tuna hang from static rails (decor, not the boss conveyor). Steam from the ice. The hero walks forward on his own to x 2660 (input locked 2.5 s). A Tallyman on the booth gallery rings a hand bell: auction call. Two Gaffers turn from the counter.
- **Placed:** the shotgun on the fish counter at x 2680 (`pickups: { w: 'shotgun', stand: 'counter' }`), 6 shells. A crate of ice at 2640.
- **Trigger in:** `section:enter hall`. **Trigger out:** scene end, control returns.
- **Why it works:** it changes the rhythm and the colour (dry, cyan, enclosed) and it puts the gun in the player's hand exactly where it is needed.

### Beat 9. The shotgun slide (x 2700-2940) [0:50] (slow-motion set piece)

- **Layout:** an ice strip (friction zone `sortIce`) on the ground from 2700 to 2920, between two rows of hanging tuna (decor rows at depth -20 and +20, so the slide reads as a corridor in 3D).
- **Enemies (wave `w_slide`):** E/M/H/W: 3/4/5/6. Gaffers and Filleters stand along the ice; 1 Tallyman (2 on H/W) on the booth gallery above (see beat 10).
- **Slow-motion trigger:** the hero holds the shotgun and enters `sortIce` at run speed (or presses run + down at its start). The hero drops into a knee slide (`slide` state, section 8). Time scale goes to 0.35 for up to 2.4 real seconds or until the slide stops. During the slide the hero can fire, pump and turn to fire behind; each shell knocks a goon off its feet on the ice (slip knockback x1.5). Shots that hit a hanging tuna spin it and spray ice crystals. Music drops a fifth.
- **Fallback:** if the player walks onto the ice without a shotgun, no slow motion; the goons fight on the ice, and the player can still slide by running (no time scale). A toast hints "Run onto the ice with the shotgun" once.
- **Trigger in:** `heroX >= 2700` (goons react to the hand bell). **Trigger out:** `killed: 'w_slide'`.
- **Why it works:** it is the level's signature image from the bible. The ice strip makes the slide physical, not just a cinematic: the player controls when to enter it and where to point the barrel.

### Beat 10. The auctioneer's booth (x 2760-2900, upper) [0:50] (glass set piece)

- **Layout:** a glass booth on a gallery (surface y 196, x 2760-2900, one-way). Front pane `boothGlass` (x 2760-2900, y 150-194, hp 80, kind `window`) faces the floor. Access: a stack of ice crates at 2740 (ledge climb), or the steel ladder at 2910.
- **Enemies:** the Tallymen of beat 9 shoot through the glass; when the pane is cracked they shoot through holes (accuracy +). One Filleter guards the booth door (M+).
- **Placed:** an ammo box (shells x6) in the booth. A cash crate (`crate`, unbreakable decor) with a brass Line 0 token nailed to its lid: first glimpse of the hook (a toast-free visual; the 3D view gets a close prop). A loudspeaker horn on the booth roof.
- **Interaction:** shotgun the glass from below (one blast shatters it, glass rains onto the goons under it, 6 dmg each, and leaves shards that crunch). Or climb and throw a Tallyman through it: he falls to the floor with the glass (ragdoll through pane).
- **Trigger in:** with beat 9. **Trigger out:** `killed: 'w_booth'` (part of `w_slide`). Then the arena hatch light turns red and the hand bell rings three times.
- **Why it works:** it gives the shotgun a second, vertical use and delivers the first glass shatter with an audience of falling goons. The cash crate seeds the outro.

### Beat 11. Boss: Sal "the Scale" Marchetti (x 2950-3600) [3:00]

- **Trigger in:** `heroX >= 2960` and `killed: 'w_slide'`. The `arenaGate` wall drops at x 2950 (a steel hatch slams). Boss intro dialog (section 6.2).
- Full design in section 5. Ends with the defeat sequence and the outro cutscene.

### Beat 12. Outro and the payphone (cutscene) [0:40]

- End panels (section 6.3), then the results card. The payphone panel hands the player to Level 2.

---

## 4. Saltmen enemy variants

All variants are data rows on the existing `ROLE` table: a `look` reskin plus small behaviour flags. No new brain is needed except where marked.

| Variant | Base role | Look | Behaviour change | HP mod |
|---|---|---|---|---|
| **Deckhand** | brawler | Yellow oilskin, sou'wester, rubber boots, rope coil on shoulder | `throwsProps: true`: when the hero is 40-110 px away and a crate, bin or barrel is within 20 px, he lifts and throws it (uses the hero's carry/throw code on the enemy side). Cooldown 6 s. | x1.1 |
| **Pipeman** | pipe | Grey waders, knitted cap; a rusted bilge-pump handle as the pipe | `heavyBias: 0.4`: more `hchop`. On ice he plants (no slip) during wind-up, then slips on recovery. | x1.0 |
| **Filleter** | knife | White rubber apron over the oilskin, blood-stained; a long fish knife | `iceBoots: true`: ignores friction zones (the only Saltman that does). `lowBias: 0.35`: more low stabs (forces the hero to block low or jump). | x0.9 |
| **Gaffer** | machete | Oilskin, leather gloves; a long-handled gaff hook | Heavy attack `gaffPull`: on hit, pulls the hero 24 px toward him (no damage on the pull, 11 on the follow-up chop). Wind-up 0.35 s, telegraphed by the hook raised behind the head. Dodge roll through it causes a 0.8 s miss recovery. | x1.0 |
| **Hookthrower** | thrower | Fisherman's jersey, net bag on the hip; throws ice picks / bait hooks | `perch: true`: prefers high surfaces (office, stack tops, booth). Thrown hooks stick in walls and floor as decor for 10 s. | x1.0 |
| **Tallyman** | pistol | Brown storeman's coat, pencil behind ear, clipboard in the off hand, revolver | Only from beat 4 (M+) and indoors. `perch: true`. Fires 2 shots then reloads 1.4 s (a clear punish window). Never more than 2 alive at once. | x1.0 |
| **Haak "the Bosun"** (elite) | brawler body, machete rig | Huge, bald, grey beard, yellow oilskin open over a cable-knit sweater, a ship's chain wrapped on the left forearm, a gaff in the right hand | See below. | x3.5 (HP 175 at Medium base) |

**The Bosun (elite) move set.** Uses boss primitives at small scale; it is an enemy with a mini-brain, not a boss bar (a short name tag only).
- `gaffPull` (as the Gaffer, range 70 px, can pull the hero off a truck roof or ledge to the ground).
- `chainSweep`: wind-up 0.5 s (chain spins overhead, whirr cue), 360 degree sweep that hits 2 lanes, 14 dmg, knock-down. Punish: 1.0 s while he re-wraps the chain.
- `barrelKick`: kicks a barrel within 30 px so it rolls at the hero (uses `throwObject`). 
- Poise 18: light hits do not flinch him; heavies, the axe and thrown objects do.
- Slips on ice like any goon (on purpose; it teaches the boss arena).

**Placement rules.**
1. Max 2 ranged Saltmen (Hookthrower + Tallyman) alive at once on any difficulty; max 1 on Easy.
2. Ranged variants spawn only on a perch (a surface above y 230) and always with a reachable climb route within 160 px.
3. Tallymen appear only from beat 4 on Medium+, and only indoors on Easy.
4. Filleters lead every wave that fights on ice (they keep their feet; the rest slip).
5. Deckhands spawn only where at least one throwable prop is within 80 px.
6. Gaffers never spawn on a mover or within 40 px of the water's edge on Easy (an unavoidable pull into water is not fair).
7. A wave never mixes more than 3 variants. Each wave has one "teacher" variant (the new one) placed nearest the hero.
8. Off-screen spawns are not used outdoors; Saltmen come from container doors, the warehouse doors, the fog (fade-in from the far lane) and the shutter. Indoors they come from the hall side doors (2640, 2980, 3400).

---

## 5. The boss: Salvatore "Sal the Scale" Marchetti

**Look.** A huge man (1.3x hero scale), rubber apron over a stained vest, black rubber boots, forearms like hams, a gold fish-scale necklace (it glints; it is his telegraph light in the fog), a toothpick. Weapons: a heavy cleaver (right hand) and a meat hook on a 4 m chain (left hand). Tenor of the Choir.

### 5.1 Arena layout (x 2950-3600)

```
x:  2950      3050      3150      3250      3350      3440        3600
y100  [red lamp] :====== CONVEYOR RAIL (closed loop, enters 2970, exits 3430) ======:   |
y110      hatch  T         T         T         T         T            |  FREEZER
y180  ===gallery===            CLOCK 3:17                     [lever]  |  (behind door
      (drop-through)              |                           [lever]  |   until P3)
y236            [ice A]     [PODIUM y236]       [ice B]        door    |  cash crates
y280 __|door______________________________________________________|door_|__ice axes__
       2980                                                     3400  3440
```

- **Floor:** 2950-3440 (490 px, 22 m) in phases 1-2; extends to 3600 in phase 3.
- **Gallery:** a catwalk at y 180 from 2960 to 3090 (one-way, drop-through, ledge climb from a crate at 3000). Escape spot; Tallymen use it on Hard/Wicked.
- **Podium:** the auctioneer's podium at 3180-3240, top y 236 (one-way). The Bell & Sons clock stopped at 3:17 hangs on the wall above it at y 90 (red tint, prop `clock317`).
- **Ice patches (fixed):** A at 3050-3120, B at 3280-3350.
- **Doors (crew):** 2980 (left side door) and 3400 (cold-store door).
- **Levers:** conveyor speed lever at 3420, y 230; freezer lever at 3430, y 230 (both on the wall next to the freezer door).
- **Props:** fish crates at 3020, 3150, 3300; barrels at 3100, 3370; an ice bin at 3260 (`iceBin`, breakable, makes ice); pocket bottles x2 on the podium; ammo box (shells x6) under the gallery at 2990 (H/W: shells x3).
- **Freezer (3440-3600):** stacked cash crates (Line 0 tokens), hanging carcasses (static), two ice axes on a rack at 3560 (`pickups: { w: 'axe', stand: 'rack' }`), and the fog machine vents.

### 5.2 Stats

```js
stats: { hp: 1050, s: 1.3, m: 7, speed: 24, reach: 26, dmg: 18, heavyDmg: 30, poise: 34,
         windup: 0.4, cd: [0.8, 1.5] }
```

HP is the Medium value; see scaling in 5.8.

### 5.3 Moves (primitives)

| Move id | Primitive | Wind-up | Telegraph (data) | Effect | Punish window |
|---|---|---|---|---|---|
| `cleaver` | `string({ combos: [['chop'], ['chop','chop'], ['jab','chop'], ['chop','hchop']] })` | 0.4 s (`hchop` 0.55) | `{ t: 0.4, pose: 'cleaverUp', cue: 'cleaver_scrape' }` | 18 / heavy 30, knock-down on `hchop` | 0.6 s after `hchop` (cleaver sticks in the floor; he wrenches it free) |
| `hook` | `grab({ range: 150, proj: 'chainHook', pull: 'toBoss', follow: 'hchop' })` | 0.65 s | `{ t: 0.65, pose: 'hookSpin', mark: 'chainLine', floor: 'line to hero', cue: 'chain_whirr' }` | Hook flies in a straight line at hip height. On hit: pull the hero to 24 px, then a free `hchop` (30). Escape the follow-up: mash attack or dodge input in the 0.3 s after the pull lands (stagger him 0.4 s). | Missed hook: 1.2 s while he reels the chain in. The chain lies on the floor; hitting the chain during the reel yanks him 1 lane-step forward (stagger 0.5 s). |
| `shoulder` | `charge({ windup: 0.7, v: 190, maxT: 1.1, wallStun: 1.6 })` | 0.7 s | `{ t: 0.7, pose: 'bullLow', light: 'neckGlint', cue: 'boots_stamp' }` | 22 dmg, knock-down. On ice he cannot stop: `maxT` +0.4 s and he slides past. | 1.6 s if he hits a wall, the podium or a barrel; 1.0 s if he hits a tuna. |
| `tunaBat` (P2+) | `throwObject({ source: 'conveyor', kind: 'tuna', mode: 'swing' or 'throw' })` | 0.6 s | `{ t: 0.6, pose: 'reachUp', mark: 'tunaFlash', cue: 'hook_unclip' }` | Rips the nearest tuna off its hook. `swing`: a wide arc, 2 lanes, 24 dmg, knock-down. `throw`: lobbed arc, 20 dmg. The tuna stays on the floor as a heavy object (`tuna`, section 8) the hero can lift and throw back (26 dmg, stagger him). | 0.8 s after a swing; 0.5 s after a throw. |
| `iceSmash` (P2+) | `groundSlam({ target: 'iceBin' or 'floor', quake: { v: 120, life: 0.8, dmg: 10 }, zone: 'ice', w: 80, life: 12 })` | 0.55 s | `{ t: 0.55, pose: 'cleaverHigh', floor: 'frostRing', cue: 'ice_crack' }` | A short quake (jump it) and a new ice patch, 80 px, 12 s. Max 2 extra patches at once. | 0.7 s |
| `fogStalk` (P3) | `hazard('freezerFog')` + `charge` + `grab` from fog | see 5.5 | breath puff + necklace glint + boot crunch (panned) | He moves hidden in fog and attacks from it. | see 5.5 |
| `roar` | `roar({ t: 1.2 })` | — | `{ t: 1.2, pose: 'roar', light: 'flicker', cue: 'marchetti_roar' }` | Phase shift; pushes the hero back 30 px (no damage). | Hero gets i-frames; no punish. |
| `lever` | scripted walk to 3420 or 3430 | 1.5 s walk + 0.6 s pull | `{ t: 0.6, pose: 'leverPull', light: 'redLamp', cue: 'klaxon' }` | Changes the conveyor speed or floods fog. | His back is turned for the whole walk and pull: the biggest window in the fight (free combo, the pull is cancelled by a heavy hit or thrown object on Easy/Medium only). |

### 5.4 The arena gimmick: the conveyor, the ice, the freezer fog

Implemented as one gimmick object `pier9Market` with the interface `{ init, step, onEvent, lights, hazards, draw2d, build3d, update3d }`. All gameplay state lives in `state.movers`, `state.hazards.zones` and the gimmick's sim record; 2D and 3D only draw it.

**A. The conveyor of frozen tuna.**
- A closed-loop rail at y 110 (a `mover` with `mode: 'loop'`). Only the lower run, from x 2970 to 3430, is inside the arena; the upper run is hidden in the roof.
- Hooks hang every 120 px. Each loaded hook carries a frozen tuna (2 m, 44 px tall, bottom at y 246). A hook may be empty.
- **Hazard:** a moving tuna is a `hazard` body (a capsule 20 x 44 px). Contact: 14 dmg + knock-down to anyone (hero, crew, boss). The boss takes 40 dmg and a 1.0 s stagger.
- **Avoid:** crouch or low attacks pass under (crouch top y 252 > tuna bottom 246). Dodge roll passes under. Jumping does not clear it.
- **Telegraph:** the red lamp at 2970 blinks and the rail clunks 1.0 s before each loaded hook enters the arena (`{ t: 1.0, light: 'redLamp', cue: 'rail_clunk' }`). Every tuna also casts a moving shadow on the floor (both views).
- **Swing physics:** each tuna is a pendulum on its hook (angle limit 35 degrees). A heavy hit, a shotgun blast or a thrown object sets it swinging in the hit direction. A swinging tuna hits with the same hazard rule. The player can aim a swing at Marchetti: this is the main "use the arena" tool.
- **Phase 1:** speed 40 px/s, 3 of 4 hooks loaded, swing on start/stop only.
- **Phase 2:** he pulls the speed lever (`lever` move). Speed 70 px/s, 5 of 6 hooks loaded, hooks now sway ±15 degrees all the time. He also rips tuna off (`tunaBat`), so the loop slowly empties: each empty hook removes one hazard and adds one heavy throwable on the floor.
- **Breaking it:** the speed lever (3420) is also usable by the hero (hold interact 0.8 s): it toggles the conveyor between "stop" and "run" for 8 s, then it resumes. Stopping it when a tuna hangs over Marchetti's lane is a valid tactic; stopped tuna swing harder when hit.

**B. The ice floor.**
- Friction zones (`hazards.zones` with `kind: 'ice'`). Fixed patches A and B; up to 2 extra from `iceSmash` (12 s); small 4 s patches from broken ice crates and fish crates.
- **Hero on ice:** acceleration x0.35, deceleration x0.15, top speed unchanged; run-to-stop slides 40 px. Dodge roll on ice travels x1.6. Knock-back on the hero x1.3.
- **Enemies on ice:** knock-back x1.5; a heavy hit has a 50% chance to cause a fall (2 s down). Filleters ignore ice.
- **Marchetti on ice:** walks normally (rubber boots), but `shoulder` overshoots (+0.4 s) and cannot steer. Luring the charge across a patch into the podium or a wall gives the 1.6 s stun.
- Visual: white-blue sheen, crushed-ice texture, reflections of the lamps (reuse the puddle reflection pass).

**C. The freezer fog (phase 3).**
- At 35% HP he walks to the freezer lever (`lever` move). The freezer door wall at 3440 lifts; the camera bounds extend to 3600. A fog volume (`hazards.zones` with `kind: 'fog'`) pours out from 3440 leftward at 60 px/s.
- **Density:** 0.85 from 3200 to 3600, 0.5 from 2950 to 3200, reached in 6 s. Fog is a sim value per 20 px column (both renderers read it).
- **Visibility rule:** fighters inside fog of density d draw with alpha (1 - d), except within 60 px of the hero (clear bubble). Marchetti uses `hidden: true` when d >= 0.6 and he is more than 60 px from the hero.
- **His tells in the fog:** a breath puff every 1.2 s at his head (always visible, white); the gold necklace glints when he faces the hero (a 2 px amber flash, 0.15 s, every 1.5 s); boot crunch footsteps panned left/right in audio.
- **Fog moves:** `stalk` (circles at 100-160 px, hidden), then picks `hook` from the fog (wind-up 0.8 s; the chain whirr is the only cue; the chain line mark appears 0.4 s before the throw) or `shoulder` from the fog edge (wind-up 0.7 s, the necklace glints twice).
- **Clearing the fog:**
  1. **Vent covers:** two breakable panes on the wall (`ventA` at 3080, `ventB` at 3340, y 120-150, hp 40, kind `vent`). Breaking one (thrown object, shotgun, or axe from the gallery or podium) pulls the fog out of a 120 px column for 8 s, then it slowly refills. He will not hide in a clear column.
  2. **The freezer lever (3430):** the hero can pull it back (hold interact 1.0 s). All fog clears over 2 s and stays clear for 6 s. Marchetti then walks back to pull it again: his back is turned for about 2 s (big punish).
- **Cold:** on Hard and Wicked, bandage regen pauses while the hero stands in fog density >= 0.6. On Wicked, the hero's dodge cooldown rises to 1.3 s in dense fog.
- **Ice axes:** the freezer rack (3560) has two axes. Phase 3 is where the axe plunge (from the podium or the gallery) and axe finishers shine.

**Lights override (`lights()`):** phase 1-2: normal enamel lamps + red lamp. Phase 2 lever pull: lamps flicker for 1 s. Phase 3: lamps dim to 50%, freezer cyan dominates, the fog scatters light (a soft glow around each lamp). Defeat: all lamps return to 100% with the slow-motion freeze.

### 5.5 Phases

```js
phases: [
  { id: 1, moves: { cleaver: 5, hook: 3, shoulder: 2 } },
  { id: 2, enter: { hpBelow: 0.65 },
    onEnter: ['roar', { lever: 'speed' }, { speed: 26, cd: [0.6, 1.2], windup: 0.36 }],
    moves: { cleaver: 4, hook: 3, shoulder: 2, tunaBat: 3, iceSmash: 2 } },
  { id: 3, enter: { hpBelow: 0.35 },
    onEnter: ['roar', { lever: 'freezer' }, { speed: 28, cd: [0.7, 1.3] }],
    moves: { fogStalk: 5, hook: 3, shoulder: 3, tunaBat: 1 } },
]
```

- **Phase 1, "The Scale" (100% to 65%).** He tests the hero with cleaver strings and the hook. The conveyor runs slowly. Lesson: the hook is the big threat; its miss is the big opening; tuna hit everyone.
- **Phase 2, "Market Close" (65% to 35%).** Roar, then the speed lever (first back-turned punish). Fast conveyor with swaying tuna. He rips tuna off and swings them; he smashes the ice bin and the floor for new ice. Crew arrives. Lesson: turn his tuna and his ice against him.
- **Phase 3, "Cold Storage" (35% to 0%).** Roar, then the freezer lever. The fog fills; he hunts from it. Crew stops (except Wicked). Lesson: read tells, clear the fog with vents and the lever, use the axes.

### 5.6 Crew rules

```js
crew: { roles: ['gaffer', 'filleter', 'deckhand', 'tallyman'], doors: [2980, 3400],
        ph1: { delay: 20, every: 7, alive: [1, 1, 2, 2], roles: ['deckhand', 'filleter'] },
        ph2: { every: 5, alive: [2, 2, 3, 4], roles: ['gaffer', 'filleter', 'deckhand'], perch: { tallyman: [0, 0, 1, 1] } },
        ph3: { every: 0, onEnter: { wicked: ['filleter', 'filleter'] } },
        max: [4, 6, 9, 12] }
```

- Crew uses the same tuna and ice rules: the conveyor hits them, and they slip.
- Crew never attacks during a Marchetti `hook` pull (they hold for the chop: no stun-lock).
- When Marchetti uses `lever`, alive crew rush the hero to cover his back (on Hard/Wicked only).
- `secondWind: { afterKOs: 2, clearCrew: true }` (the existing rule): after the hero is knocked out twice, the crew clears and he gets a full bandage.

### 5.7 Punish windows (summary for tuning)

| Event | Window |
|---|---|
| Missed `hook` (he reels the chain) | 1.2 s, +0.5 s stagger if the hero hits the chain |
| `shoulder` into wall / podium / barrel | 1.6 s stun |
| `shoulder` into a tuna | 1.0 s + 40 dmg |
| Swinging tuna hits him | 1.0 s stagger + 40 dmg |
| `hchop` stuck in the floor | 0.6 s |
| `tunaBat` swing recovery | 0.8 s |
| `lever` walk and pull (phase entries, P3 fog re-pull) | about 2 s, back turned |
| Thrown tuna hits him | 0.7 s stagger + 26 dmg |
| He falls on ice from a heavy hit (P2+, 25% chance) | 1.5 s down; axe plunge allowed |

### 5.8 Difficulty scaling

Telegraph time scales by `t / sqrt(A)` (framework rule). Additional per-difficulty values:

| Value | Easy | Medium | Hard | Wicked |
|---|---|---|---|---|
| HP | 800 | 1050 | 1250 | 1450 |
| Hook range | 120 | 150 | 160 | 175 |
| Hook pull follow-up escape window | 0.5 s | 0.3 s | 0.2 s | 0.15 s |
| Conveyor speed P1 / P2 | 30 / 55 | 40 / 70 | 45 / 80 | 50 / 90 px/s |
| Tuna hazard dmg (hero) | 8 | 14 | 18 | 24 |
| Extra ice patches max | 1 | 2 | 2 | 3 |
| Fog density (dense zone) | 0.6 | 0.85 | 0.9 | 0.95 |
| Clear bubble radius | 90 | 60 | 50 | 40 |
| Lever pull cancellable by a hit | Yes | Yes | No | No |
| Crew alive (P1/P2) | 1/2 | 1/2 | 2/3 | 2/4 |

### 5.9 Defeat sequence

1. At 0 HP, `dead` state: he staggers backward toward the freezer (scripted 1.2 s), slips on the nearest ice patch, and falls against the cash crates at 3480 (or at the nearest crate if the fight is elsewhere; the outro panel matches either).
2. **Finisher prompt:** the last hit that brings him to 0 always triggers the boss freeze frame: time scale 0.1 for 0.8 s, then a 0.6 s full freeze, desaturate to 20%, red tint only on the necklace and the clock. Camera punches in (zoom 0.75) on the impact.
3. The cleaver drops point-first into the ice and freezes in place (frost spreads from it, 1 s).
4. Crew still alive flee through the doors ("Sandman!"). The residents' windows (outside, heard through the shutter) do not matter here; instead the hall lamps buzz back to full.
5. `boss:defeated` emits; 1.5 s hold; then the outro panels (section 6.3), then the results card.

---

## 6. Cutscene and dialog script

Caption style: yellowed boxes for voice-over (VO), white balloons for dialogue, red tint on Choir symbols.

### 6.1 Opening panels (`docks_intro`)

| # | Shot | Text |
|---|---|---|
| 1 | Wide. Grey-blue dawn over the docks. Sleet falls slant across cranes and stacked containers. A tiny figure (the hero) walks along the quay edge. A fog horn's sound lines cross the panel. | VO: "Pier 9. Where the city guts its fish, and its debts." |
| 2 | Medium. Saltmen in yellow oilskins drag a fish crate past a burning oil drum. One looks up; the cigarette drops from his lips. | SALTMAN (whispering): "That's him. The Sandman." |
| 3 | Close-up on the hero's hand. He drops the scorched tuning fork onto a fish crate. Ring lines in red. | VO: "I brought their bell back. Let them hear it ring." |
| 4 | Low angle. Six Saltmen spread out with hooks, pipes and knives, lit red by the drum. The hero takes off his coat. | SALTMAN: "Sandman's just a story. Get him!" |

### 6.2 Boss intro portrait dialog (`marchetti_intro`)

Staging: the arena hatch slams. Marchetti steps out from behind the podium, a frozen tuna swinging behind him on the conveyor. He taps the cleaver on the podium like an auctioneer's gavel.

| Speaker | Mood (portrait id) | Line |
|---|---|---|
| MARCHETTI | Amused, chewing a toothpick (`marchetti_amused`) | "The Sandman. I thought you were a bedtime story they tell to scare tenors." |
| HERO | Cold (`elias_cold`) | "The watchmaker." |
| MARCHETTI | Shrugging, smug (`marchetti_smug`) | "Business. You broke Malaspina, you carry his debt. Rules are rules." |
| HERO | Cold (`elias_cold`) | "Then collect." |
| MARCHETTI | Furious grin, raising the cleaver (`marchetti_furious`) | "With pleasure. I'll weigh you by the pound!" |

**In-fight barks** (speech bubble, no portrait, max one per 8 s):
- Phase 2 enter (at the lever): "Market's closing, Sandman! Everything must go!"
- After a hook pull lands: "On the scale!"
- Phase 3 enter (at the freezer lever): "Let's see how a story keeps on ice."
- In the fog (random, 1 of 3): "Cold, Grave?" / "I can hear you breathe." / "Nobody sleeps in my freezer."
- Saltman crew on entry (1 of 3): "For Sal!" / "Is that really him?" / "Don't look at his eyes."

### 6.3 End panels (`docks_outro`)

| # | Shot | Text |
|---|---|---|
| 1 | Inside the freezer, blue light, frost breath. Marchetti lies against the cash crates, his cleaver frozen into the floor. The hero kneels over him, one hand on the gold necklace. | MARCHETTI: "I just collect... The fire came from below. Switch's rats." |
| 2 | Close-up. A cash crate lid is open. Stacks of bills, each band stamped with an old brass Line 0 metro token. | VO: "Old metro tokens. The money took the train nobody rides anymore." |
| 3 | Exterior. Sleet turns to rain. The hero walks away from the market. Steam rises from a street grate marked *Saint-Ambrose, Ligne 0*. Nero waits at the stairs. | VO: "Saint-Ambrose station. Closed for thirty years. Open for business." |
| 4 | A payphone on the market gate rings. Cut-in: Hale in a phone booth, hat brim low, rain on the glass. (Every level ends with a payphone.) | HALE: "Switch runs the tunnels. Take a light. And take the dog." |

Refinements against the bible: panel 1 adds the necklace (it ties the defeat to his telegraph motif); panel 3 adds "sleet turns to rain" to mark the move toward the city; panel 4 is new, following the bible's rule that every level ends with a ringing payphone, and it sets up Nero joining in Level 2.

### 6.4 Small in-level captions

- Beat 1 (tuning fork crate): VO "I brought their bell back." (reuse of panel 3, 1 s).
- Beat 6 (chalkboard): VO "Closed. That was one word for it."
- Beat 10 (cash crate token, first look): VO "Metro brass. Thirty years out of service."

---

## 7. Level data skeleton

```js
// src/levels/docks/level.js
import { defineLevel } from '../../director/define.js';
import marchetti from '../../bosses/marchetti.js';
import { pier9Market } from './gimmick.js';

export default defineLevel({
  id: 'docks', title: 'Pier 9', order: 1, palette: 'docks', music: 'music:docks_explore',
  size: { W: 3600, H: 320, groundY: 280 },

  sections: [
    { id: 'quay', x0: 0, x1: 1240, indoor: false, weather: 'sleet', ambient: [0.45, 0.52, 0.70],
      camera: { minZoom: 0.30, maxZoom: 0.60 },
      backdrop: [{ type: 'sky', set: 'dawn' }, { type: 'fogbank', y: 210, k: 0.5 },
                 { type: 'city', set: 'harbour_far' }, { type: 'water', y: 284 }] },
    { id: 'yard', x0: 1240, x1: 2200, indoor: false, weather: 'sleet', ambient: [0.42, 0.50, 0.68],
      camera: { minZoom: 0.28, maxZoom: 0.55, biasUpOnSurface: 30 },
      backdrop: [{ type: 'sky', set: 'dawn' }, { type: 'city', set: 'container_wall' }, { type: 'water', y: 284 }] },
    { id: 'bay', x0: 2200, x1: 2600, indoor: false, weather: 'sleet', ambient: [0.46, 0.50, 0.62],
      camera: { minZoom: 0.32, maxZoom: 0.55 },
      shelter: [{ x0: 2440, x1: 2600 }],                       // no sleet under the awning
      backdrop: [{ type: 'sky', set: 'dawn' }, { type: 'wall', set: 'market_facade' }] },
    { id: 'hall', x0: 2620, x1: 3600, indoor: true, weather: 'none', ambient: [0.40, 0.42, 0.55],
      camera: { minZoom: 0.35, maxZoom: 0.55 }, breath: true,
      backdrop: [{ type: 'wall', set: 'fish_hall_tile' }] },
  ],

  scene: { paint: [
    { type: 'lamp', style: 'sodium', xs: [120, 480, 860, 1180] },
    { type: 'bollard', xs: [40, 300, 640, 1000] },
    { type: 'oilDrum', x: 420, burning: true },
    { type: 'warehouse', x0: 720, x1: 1220, storeys: 2, openFront: true, loftY: 200, doors: [760, 1200],
      office: { x0: 1100, x1: 1180 } },
    { type: 'container', x: 1260, w: 132, stack: 1, col: 'rust',  doors: true },
    { type: 'container', x: 1400, w: 132, stack: 2, col: 'teal',  doors: true },
    { type: 'container', x: 1560, w: 132, stack: 3, col: ['rust', 'blue', 'grey'] },
    { type: 'container', x: 1700, w: 132, stack: 2, col: 'red',   doors: true },
    { type: 'crane', x: 1900, jib: [1700, 2060], jibY: 60, cabLight: 'amber' },
    { type: 'quayEdge', x0: 1840, x1: 1860 }, { type: 'quayEdge', x0: 1980, x1: 2000 },
    { type: 'shack', x0: 2010, x1: 2150, sign: 'Appâts & Thé', radio: true },
    { type: 'bunkhouse', x0: 1990, x1: 2590, y: 120, windows: 9 },  // residents
    { type: 'vehicle', kind: 'reefer', x0: 2240, x1: 2400, roofY: 214, facing: -1 },
    { type: 'vehicle', kind: 'reefer', x0: 2420, x1: 2560, roofY: 214, facing: -1 },
    { type: 'awning', x0: 2440, x1: 2600, y: 200 },
    { type: 'shutter', x: 2600 },
    { type: 'fishCounter', x0: 2650, x1: 2720 },
    { type: 'tunaRow', x0: 2700, x1: 2920, depth: [-20, 20], decor: true },
    { type: 'booth', x0: 2760, x1: 2900, floorY: 196, ladderX: 2910 },
    { type: 'gallery', x0: 2960, x1: 3090, y: 180 },
    { type: 'podium', x0: 3180, x1: 3240, top: 236 },
    { type: 'clock317', x: 3210, y: 90 },                         // Bell & Sons, stopped at 3:17 (bible rule)
    { type: 'conveyorRail', x0: 2960, x1: 3440, y: 110 },
    { type: 'lever', id: 'speedLever', x: 3420, y: 230 },
    { type: 'lever', id: 'freezerLever', x: 3430, y: 230 },
    { type: 'freezer', x0: 3440, x1: 3600, cashCrates: 6, rack: 3560 },
  ]},

  ground: [{ x0: 0, x1: 1860 }, { x0: 1980, x1: 3600 }],        // the slip is open water
  killY: 300,
  water: [{ x0: 1860, x1: 1980, y: 284, onFall: { dmg: [25, 25, 35, 50], respawn: [1800, 166], t: 1.5 } }],

  surfaces: [
    { id: 'loft', x0: 740, x1: 1200, y: 200, oneWay: true, lane: 'plat' },
    { id: 'stackA', x0: 1260, x1: 1392, y: 223, lane: 'plat' },
    { id: 'stackB', x0: 1400, x1: 1532, y: 166, lane: 'plat' },
    { id: 'stackC', x0: 1560, x1: 1692, y: 109, lane: 'plat' },
    { id: 'stackD', x0: 1700, x1: 1832, y: 166, lane: 'plat' },
    { id: 'truck1', x0: 2240, x1: 2400, y: 214, lane: 'plat' },
    { id: 'truck2', x0: 2420, x1: 2560, y: 214, lane: 'plat' },
    { id: 'dock', x0: 2560, x1: 2600, y: 252, lane: 'plat' },
    { id: 'booth', x0: 2760, x1: 2900, y: 196, oneWay: true, lane: 'plat' },
    { id: 'gallery', x0: 2960, x1: 3090, y: 180, oneWay: true, lane: 'plat' },
    { id: 'podium', x0: 3180, x1: 3240, y: 236, oneWay: true, lane: 'fight' },
  ],
  walls: [
    { x: 0, y0: 0, y1: 280, id: 'levelStart' },
    { x: 2600, y0: 0, y1: 280, id: 'shutter' },                 // removed when the Bosun dies
    { x: 2950, y0: 0, y1: 280, id: 'arenaGate', active: false }, // drops at boss start
    { x: 3440, y0: 0, y1: 280, id: 'freezerDoor' },             // lifts in boss phase 3
    { x: 3600, y0: 0, y1: 280, id: 'levelEnd' },
  ],
  stairs: [{ type: 'fireEscape', x0: 700, x1: 740, flights: 1, topY: 200 }],

  movers: [
    { id: 'craneBox', surface: { w: 120, y: 196 }, path: [[1780, 196, 0], [1780, 196, 1], [2010, 196, 5], [2010, 196, 6]],
      mode: 'pingpong', model: 'container_hung', cables: { toY: 60 } },
    { id: 'tunaLine', rail: { x0: 2970, x1: 3430, y: 110 }, mode: 'loop', speed: 40, spacing: 120,
      hooks: { load: 'tuna', loaded: 3, of: 4, pendulum: { len: 136, maxDeg: 35 } },
      hazard: { dmg: [8, 14, 18, 24], knock: true, box: [20, 44], hitsBoss: 40 },
      telegraph: { t: 1.0, light: 'redLamp2970', cue: 'sfx:rail_clunk' }, active: false },
  ],

  zones: [
    { id: 'sortIce', kind: 'ice', x0: 2700, x1: 2920 },
    { id: 'iceA', kind: 'ice', x0: 3050, x1: 3120 },
    { id: 'iceB', kind: 'ice', x0: 3280, x1: 3350 },
    { id: 'slideSlowmo', kind: 'slowmo', x0: 2700, x1: 2920, need: { weapon: 'shotgun', speed: 'run' },
      timeScale: 0.35, maxT: 2.4, once: false, cooldown: 6 },
  ],

  panes: [
    { id: 'axeCase', x0: 872, y0: 246, x1: 892, y1: 270, hp: 30, kind: 'window', depth: -28, onBreak: 'shards', reveals: 'axe1' },
    { id: 'loftWindow', x0: 1100, y0: 150, x1: 1180, y1: 194, hp: 60, kind: 'window', depth: -10, onBreak: 'shards' },
    { id: 'boothGlass', x0: 2760, y0: 150, x1: 2900, y1: 194, hp: 80, kind: 'window', depth: 10, onBreak: 'shards',
      fallDmg: 6 },
    { id: 'ventA', x0: 3070, y0: 120, x1: 3100, y1: 150, hp: 40, kind: 'vent', depth: -30, onBreak: 'fogClear' },
    { id: 'ventB', x0: 3330, y0: 120, x1: 3360, y1: 150, hp: 40, kind: 'vent', depth: -30, onBreak: 'fogClear' },
  ],

  lights: [
    { x: 120, y: 150, r: 110, rgb: [255, 170, 70] }, { x: 480, y: 150, r: 110, rgb: [255, 170, 70] },
    { x: 860, y: 150, r: 110, rgb: [255, 170, 70] }, { x: 1180, y: 150, r: 110, rgb: [255, 170, 70] },
    { x: 420, y: 262, r: 90, rgb: [255, 90, 40], flicker: 0.35 },          // burning drum
    { x: 1560, y: 40, r: 260, rgb: [210, 225, 255] },                      // yard floodlight
    { x: 1900, y: 70, r: 60, rgb: [255, 190, 90], id: 'craneCab' },        // turns green after w_yard2
    { x: 2390, y: 262, r: 40, rgb: [255, 40, 40] }, { x: 2550, y: 262, r: 40, rgb: [255, 40, 40] },
    { x: 2520, y: 198, r: 120, rgb: [220, 235, 255], flicker: 0.1 },
    { x: 2830, y: 172, r: 80, rgb: [255, 210, 140] },                      // booth
    { x: 2970, y: 100, r: 50, rgb: [255, 30, 30], id: 'redLamp2970' },
    { x: 3020, y: 130, r: 100, rgb: [255, 200, 130] }, { x: 3140, y: 130, r: 100, rgb: [255, 200, 130] },
    { x: 3260, y: 130, r: 100, rgb: [255, 200, 130] }, { x: 3380, y: 130, r: 100, rgb: [255, 200, 130] },
    { x: 3520, y: 160, r: 160, rgb: [120, 200, 255] },                     // freezer
  ],

  props: [
    ['crate', 140, 280], ['crate', 200, 280], ['bag', 230, 280], ['forkCrate', 240, 280],
    ['barrel', 330, 280], ['crate', 360, 280], ['burningDrum', 420, 280], ['barrel', 520, 280], ['crate', 600, 280],
    ['bottle', 410, 280], ['bottle', 430, 280], ['bottle', 440, 280],
    ['bin', 960, 280], ['chair', 1020, 280], ['chair', 1030, 280], ['barrel', 1180, 200],
    ['iceBlock', 1450, 280], ['barrel', 1420, 166], ['barrel', 1500, 166], ['can', 1600, 109], ['can', 1640, 109],
    ['bottle', 2100, 280], ['bottle', 2110, 280],
    ['barrel', 2300, 280], ['barrel', 2470, 280],
    ['iceBlock', 2640, 280], ['iceStack', 2740, 280],
    ['crate', 3000, 280], ['crate', 3020, 280], ['barrel', 3100, 280], ['crate', 3150, 280],
    ['iceBin', 3260, 280], ['crate', 3300, 280], ['barrel', 3370, 280],
    ['bottle', 3200, 236], ['bottle', 3220, 236],
  ],

  pickups: [
    { kind: 'bandage', x: 120 }, { kind: 'bandage', x: 2080, count: [2, 2, 1, 1] },
    { kind: 'bandage', x: 2580, count: [1, 1, 0, 0] },
    { id: 'axe1', w: 'axe', x: 882, stand: 'case' },
    { w: 'shotgun', x: 2680, stand: 'counter', ammo: 6 },
    { kind: 'ammo', w: 'shotgun', x: 2860, y: 196, count: 6 },
    { kind: 'ammo', w: 'shotgun', x: 2990, count: [6, 6, 3, 3] },
    { w: 'axe', x: 3560, stand: 'rack', count: 2, hidden: 'freezerDoor' },
  ],

  start: { x: 60, section: 'quay', cutscene: 'docks_intro' },

  objectives: [
    { id: 'collector', text: 'Find the collector: S. Marchetti.', done: { bossDefeated: true } },
  ],

  waves: {
    w_drum:  { at: [380, 460, 540, 620, 660, 700], roles: { E: ['deckhand', 'deckhand', 'pipeman', 'filleter'],
               M: ['deckhand', 'deckhand', 'pipeman', 'pipeman', 'filleter', 'gaffer'],
               H: '+M,filleter@8s', W: '+H,gaffer@x0' }, from: 'fog' },
    w_loft:  { at: [800, 900, 1140, 1000], roles: { E: ['deckhand', 'hookthrower@office'],
               M: ['deckhand', 'deckhand', 'pipeman', 'hookthrower@office', 'filleter@loft'],
               H: '+M,gaffer@stair', W: '+H,hookthrower@office' }, from: 'warehouseDoor' },
    w_yard1: { count: [2, 3, 3, 4], roles: ['deckhand', 'pipeman', 'gaffer'], from: 'containerDoor' },
    w_yard2: { count: [1, 2, 3, 3], roles: ['hookthrower@stackC', 'tallyman@stackD:M+', 'filleter:H+'], from: 'containerDoor' },
    w_crane: { count: [0, 1, 2, 2], roles: ['deckhand@craneBox'], extra: { W: ['hookthrower@2000'] } },
    w_bosun: { roles: ['bosun'], support: { start: [0, 1, 2, 2], half: [1, 1, 2, 3] },
               supportRoles: ['deckhand', 'filleter', 'gaffer'], from: 'shutter' },
    w_slide: { count: [3, 4, 5, 6], roles: ['filleter', 'gaffer', 'gaffer', 'filleter'], from: 'hallDoor',
               perch: { tallyman: [1, 1, 2, 2], at: 'booth' }, guard: { filleter: [0, 1, 1, 1], at: 2900 } },
  },

  triggers: [
    { when: { heroX: '>=240' }, do: { caption: 'vo_fork' }, once: true },
    { when: { heroX: '>=300' }, do: [{ spawnWave: 'w_drum' }, { music: 'combat' }] },
    { when: { heroX: '>=760', killed: 'w_drum' }, do: { spawnWave: 'w_loft' } },
    { when: { heroX: '>=1280', killed: 'w_loft' }, do: { spawnWave: 'w_yard1' } },
    { when: { killedPct: ['w_yard1', 0.5] }, do: { spawnWave: 'w_yard2' } },
    { when: { killed: 'w_yard2' }, do: [{ light: { craneCab: [80, 255, 120] } }, { mover: { craneBox: 'start' } }] },
    { when: { heroX: '>=1800' }, do: { spawnWave: 'w_crane' }, once: true },
    { when: { heroX: '>=2000' }, do: [{ music: 'explore' }, { residents: 'lightsOn' }] },
    { when: { heroX: '>=2060' }, do: { caption: 'vo_chalkboard' }, once: true },
    { when: { heroX: '>=2240' }, do: [{ spawnWave: 'w_bosun' }, { music: 'combat' }] },
    { when: { killed: 'w_bosun' }, do: [{ removeWall: 'shutter' }, { transition: { to: 'hall', fade: 0.6 } }] },
    { when: { inSection: 'hall' }, do: { cutscene: 'docks_hall_entry' }, once: true },   // in-engine timeline
    { when: { heroX: '>=2700' }, do: { spawnWave: 'w_slide' }, once: true },
    { when: { heroX: '>=2840', y: '<=200' }, do: { caption: 'vo_token' }, once: true },
    { when: { heroX: '>=2960', killed: 'w_slide' },
      do: [{ addWall: 'arenaGate' }, { mover: { tunaLine: 'start' } }, { boss: 'start' }] },
    { when: { bossDefeated: 'marchetti' }, do: [{ cutscene: 'docks_outro' }, { results: true }] },
  ],

  boss: { module: marchetti, arena: { section: 'hall', x0: 2950, x1: 3440, x1Phase3: 3600, doors: [2980, 3400] },
          intro: 'marchetti_intro', gimmick: pier9Market,
          crew: { roles: ['gaffer', 'filleter', 'deckhand', 'tallyman'], every: 7, max: [4, 6, 9, 12] } },

  cutscenes: { intro: 'docks_intro', outro: 'docks_outro', scenes: ['docks_hall_entry'] },
  dialog: { marchetti_intro: './dialog.js#marchetti_intro', barks: './dialog.js#marchetti_barks' },

  assets: ['panel:docks_intro_*', 'panel:docks_outro_*', 'portrait:marchetti_*', 'portrait:elias_cold',
           'music:docks_*', 'sfx:fog_horn', 'sfx:sleet_*', 'sfx:rail_clunk', 'sfx:chain_*', 'sfx:ice_*',
           'sfx:freezer_*', 'sfx:tuna_*', 'sfx:splash_*', 'sfx:hand_bell', 'sfx:shutter_roll'],
});
```

Boss module outline (`src/bosses/marchetti.js`):

```js
export default defineBoss({
  id: 'marchetti', name: 'Salvatore "Sal the Scale" Marchetti', title: 'Tenor of Pier 9', look: 'marchetti',
  stats: { hp: [800, 1050, 1250, 1450], s: 1.3, m: 7, speed: 24, reach: 26, dmg: 18, heavyDmg: 30, poise: 34,
           windup: 0.4, cd: [0.8, 1.5] },
  intro: { walkTo: 'podium.x0-20', spotlight: false, dialog: 'marchetti_intro', t: 1.8 },
  moves: {
    cleaver:  string({ combos: [['chop'], ['chop', 'chop'], ['jab', 'chop'], ['chop', 'hchop']], stickAfter: 'hchop' }),
    hook:     grab({ range: [120, 150, 160, 175], proj: 'chainHook', windup: 0.65, pull: 24, follow: 'hchop',
                     escape: [0.5, 0.3, 0.2, 0.15], missRecover: 1.2,
                     telegraph: { t: 0.65, pose: 'hookSpin', mark: 'chainLine', cue: 'chain_whirr' } }),
    shoulder: charge({ windup: 0.7, v: 190, maxT: 1.1, iceExtra: 0.4, wallStun: 1.6,
                       telegraph: { t: 0.7, pose: 'bullLow', light: 'neckGlint', cue: 'boots_stamp' } }),
    tunaBat:  throwObject({ source: 'mover:tunaLine', kind: 'tuna', modes: { swing: 0.6, throw: 0.4 } }),
    iceSmash: groundSlam({ windup: 0.55, quake: { v: 120, life: 0.8, dmg: 10 }, zone: { kind: 'ice', w: 80, life: 12 },
                           maxZones: [1, 2, 2, 3] }),
    fogStalk: hazard('freezerFog', { orbit: [100, 160], then: { hook: 0.5, shoulder: 0.5 } }),
    lever:    scripted('walkToLever', { back: true, cancelOnHit: [true, true, false, false] }),
    roar:     roar({ t: 1.2, push: 30 }),
  },
  phases: [ /* see 5.5 */ ],
  crew: { /* see 5.6 */ },
  secondWind: { afterKOs: 2, clearCrew: true },
  defeat: { stagger: 'toward:freezer', freeze: { slow: 0.1, t: 0.8, hold: 0.6, tint: 'red:necklace,clock' } },
  gimmick: pier9Market,
});
```

---

## 8. Engine features this level needs

Ordered by priority. "Shared" lists other levels that reuse the feature.

| # | Feature | One-line spec | Shared with |
|---|---|---|---|
| 1 | **Ground gaps, `killY`, water fall** | `ground` segments with gaps; falling below `killY` into a `water` region applies damage and respawns at a point (or kills enemies with a splash); water surface draws with sleet rings and reflections. | L2 (flooded tracks), L4, L7 (viaduct), L8 |
| 2 | **Movers (platform)** | `movers[]` with a surface that carries anyone standing on it (add mover delta to body position before ground resolution), path keys `[x, y, t]`, `loop / pingpong / onTrigger`, start/stop actions. | L2 handcar, L5 rolling beds, L7 decoupling cars, L8 gears |
| 3 | **Rail movers with hanging pendulum hazards** | A loop rail carrying hooks at fixed spacing; each hook holds an object as a damped pendulum (angle limit); hits add angular velocity; the swinging body is a hazard capsule that damages hero, goons and boss; hooks can be emptied (object becomes a free object). | L8 pendulum (same pendulum code) |
| 4 | **Friction zones (`kind: 'ice'`)** | Per-x-range accel/decel multipliers and knock-back multiplier; per-actor `iceBoots` flag; zones can be added at runtime with a lifetime (ice smash, broken ice blocks). | L4 (slippery leak puddles), L6 (snow / wet marble) |
| 5 | **Breakable panes** | `panes[]` with hp, crack stages (2 crack decals, then shatter), bullets and thrown objects pass through holes, bodies can be thrown through, shard particles and floor shards, `onBreak` events (`shards`, `fogClear`, `reveals: pickupId`). | L3-L8 (core of every glass level) |
| 6 | **Volume fog (gameplay)** | `hazards.zones` `kind: 'fog'` with density per 20 px column, fill/clear rates; renderers draw fighters with alpha by density and a clear bubble around the hero; actors get `hidden` when density passes a threshold; AI reads it for stealth. | L5 (blackout uses the same visibility rule), L2 steam vents |
| 7 | **Slow-motion trigger zones** | A zone with conditions (weapon, speed, state) that sets `state.timeScale` for up to `maxT` real seconds with a cooldown; emits `slowmo:start/end` for music low-pass and the 3D camera. | Every level's set piece |
| 8 | **Hero knee slide (`slide` state)** | Entered from run on ice (or run + down): keeps run momentum with ice friction, low hitbox (passes under tuna), can fire guns and turn 180 degrees, ends when speed < 30 px/s. | L3 craps-table dive, L7 roof slide |
| 9 | **Interactable levers** | Prop with an id, a hold-to-use time, and an action list; usable by the hero and by bosses (scripted `lever` move); emits `lever:pulled`. | L2 switch levers (Switch), L8 crown machinery |
| 10 | **Sleet weather** | `weather: 'sleet'`: rain variant with slower, thicker, whiter streaks at a steeper angle, small ground splats, no long puddle ripples; per-section `shelter` ranges with no precipitation. | L6 first snow (same particle path, different params) |
| 11 | **Runtime walls (`addWall`/`removeWall`)** | Walls with ids that director actions can add or remove (arena gate, shutter, freezer door), with an optional animated door painter in both views. | All boss arenas |
| 12 | **Spawn sources from painters** | Painters export named spawn points (`containerDoor`, `warehouseDoor`, `shutter`, `hallDoor`, `fog`) with an open-door animation; `fog` spawns fade in from the far lane. | All levels |
| 13 | **Enemy behaviour flags** | `throwsProps`, `iceBoots`, `perch`, `lowBias`, `heavyBias`, `gaffPull` (pull-on-hit heavy) as data on `ROLE` rows; `perch` picks spawn/goal surfaces above y 230. | All factions (L4 harpoon pull, L6 snipers perch) |
| 14 | **`grab` primitive with a chain projectile and pull** | Boss primitive: a projectile with a line telegraph; on hit, pull the target to a distance, then run a follow-up move; a mash/dodge escape window; a reeling miss state with a hittable chain. | L2 Switch chain whip, L4 Kalt harpoon line |
| 15 | **Heavy object kind `tuna` and `iceBlock`** | `tuna`: two-hand carry, slow throw, 26 dmg, stagger, slides on ice. `iceBlock`: breakable crate that leaves a 4-5 s ice zone. | Level 1 only |
| 16 | **Burning drum / burning oil patch** | A rollable barrel with a fire light; on a hard hit it rolls and burns what it touches, then leaves a 3 s fire zone that damages per second. | L2 (Tunnel Rats are firebugs) |
| 17 | **Breath vapour** | Per-section flag `breath: true`: a small white puff from each fighter's head every 1-2 s (faster when running); always visible through fog. | L6 (snow park), L7 (gale) |
| 18 | **Backdrop `fogbank` and `water` layers** | Far-layer fog band with slow drift and a horizon water layer with sleet rings; 3D gets a matching fog plane. | L4 sea wall, L7 dam |
| 19 | **3D models (3D-only)** | `render3d/models/docks/`: crane (jib, cab, cables), hung container, conveyor rail with hooks and tuna, reefer trucks, roll shutter, freezer door. | Crane jib also L8 (construction crane in the backdrop) |

Implementation notes:
- Per the project rule, every feature above lives in the shared simulation (`sim/world/*`, `sim/boss/*`) and both renderers only draw it. Only item 19 is 3D-only.
- Build testbed rooms in `src/levels/_testbed/` for items 2, 3, 4, 5 and 6 before this level.

---

## 9. Art and audio asset list

### 9.1 Comic panels (1024 x 576 WebP, `assets/art/panels/docks/`)

| Id | Content |
|---|---|
| `panel:docks_intro_01` | Wide dawn docks, sleet, cranes, tiny hero on the quay edge. |
| `panel:docks_intro_02` | Saltmen dragging a crate past a burning drum; dropping cigarette. |
| `panel:docks_intro_03` | Close-up hand, tuning fork on a fish crate, red ring lines. |
| `panel:docks_intro_04` | Low angle, six Saltmen with hooks, pipes, knives; hero removing coat. |
| `panel:docks_outro_01` | Freezer, blue light, Marchetti against cash crates, frozen cleaver, hero kneeling. |
| `panel:docks_outro_02` | Cash crate close-up, bill bands with brass Line 0 tokens. |
| `panel:docks_outro_03` | Hero leaving the market, steam from the *Saint-Ambrose, Ligne 0* grate, Nero at the stairs. |
| `panel:docks_outro_04` | Payphone ringing on the market gate; cut-in of Hale in a booth. |

### 9.2 Portraits (512 x 512 WebP, `assets/art/portraits/`)

| Id | Mood |
|---|---|
| `portrait:marchetti_amused` | Amused, toothpick in the mouth corner, eyes half-lidded. |
| `portrait:marchetti_smug` | Shrug, palms out, gold scale necklace prominent. |
| `portrait:marchetti_furious` | Wide grin of rage, cleaver raised into frame. |
| `portrait:marchetti_hurt` | Bleeding lip, frost on brows (reserve for barks or a future retry line). |
| `portrait:elias_cold` | Shared; existing if made for the tutorial, else new. |

Character reference: `assets/art/characters/marchetti/ref.png` (identity reference for the panels and portraits).

### 9.3 Music (`assets/audio/music/`)

| Id | Use |
|---|---|
| `music:docks_explore` | Cello drone in D minor, fog horn tuned to the drone, sparse metal hits. Loop 2:00. |
| `music:docks_combat` | Layer over the explore stem: stomped boots, hammered steel, wordless baritone hum. 3 intensity layers. |
| `music:docks_slowmo` | 4 s stinger: pitched-down hit, reverse cymbal, used with the low-pass. |
| `music:docks_boss_p1` | "Market Close" A: brass + loudspeaker accordion. |
| `music:docks_boss_p2` | Adds the auctioneer chant sample and faster percussion. |
| `music:docks_boss_p3` | Heartbeat kick, wind, compressor hum; the brass returns only on hits. |
| `music:docks_victory` | Short sting into the outro panels: one fog horn and a single cello note. |

### 9.4 Sound effects (`assets/audio/sfx/`)

Ambience: `fog_horn` (x2 variants), `sleet_light`, `sleet_heavy`, `sleet_on_steel`, `gulls`, `water_slap`, `reefer_hum`, `radio_chanson` (static, short loop), `hall_drips`, `freezer_compressor`.

World: `burning_drum_roll`, `oil_fire_loop`, `container_door_bang`, `crane_motor`, `crane_cable_creak`, `splash_body`, `splash_small`, `shutter_roll`, `hatch_slam`, `hand_bell`, `lever_pull`, `klaxon_short`, `freezer_door_lift`, `fog_hiss`, `vent_break`, `axe_case_break` (shared `glass_break` variant), `booth_glass_break`, `glass_shards_crunch`.

Conveyor and ice: `rail_clunk`, `conveyor_rattle_loop`, `hook_unclip`, `tuna_swing_whoosh`, `tuna_hit_body` (dull frozen thud), `tuna_drop`, `ice_crack`, `ice_slide_loop`, `ice_shatter`, `ice_crunch_step`.

Combat: `cleaver_scrape`, `cleaver_chop`, `cleaver_stick`, `chain_whirr`, `chain_throw`, `chain_reel`, `hook_hit`, `boots_stamp`, `marchetti_roar`, `gaff_pull`, `bosun_chain_spin`, `hookthrower_throw`, `revolver_shot` (Tallyman), `shotgun_slowmo` (dry close variant).

Voice (optional, text-only by default): `voice:marchetti_intro_01..03`, `voice:marchetti_bark_*`, `voice:saltman_sandman_*` (whispers: "Sandman"), `voice:hale_docks_outro`.
