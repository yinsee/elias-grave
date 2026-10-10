# Level 8: "The Spire" (final level)

Level plan for `src/levels/skyscraper/`. It uses the vocabulary of `docs/architecture.md` sections 3 (level format) and 4 (boss framework). Story source: `docs/story-bible.md`, Level 8, sections 4 and 6.

Notation:
- Enemy counts are given as **E/N/H/W** (Easy / Normal / Hard / Wicked).
- Coordinates are world pixels: 22 px = 1 m, ground at y 280, world height 320.
- **[NEW]** marks an engine feature that does not exist yet (see section 8).

---

## 1. Summary

| Item | Value |
|---|---|
| Story beat | Elias wants the truth and an end to it. Bell is alive, and Bell is the Conductor. He faked his death and used Elias to kill every traitor in the Board's "Silent Night" coup. In the crown, Bell offers Elias the Choir. Elias refuses. At midnight the great bell strikes twelve, and the shockwave shakes Bell off the minute hand. Time ends the Choir, and Elias does not push him. |
| Setting | The **Meridian Spire**, the tallest tower in Valmora, on its opening night. Meridian Holdings is the public face of the Choir. The climb goes: mirrored marble lobby (floor 1), glass elevator on the outside of the tower (floors 1 to 75), sky garden (floor 75), glass-floored penthouse (floor 90), the vestry stair, then the clockwork crown: gear room, pendulum hall, and the outside of the giant glass clock face. |
| Time / weather | 23:40 to midnight. The storm is at its peak: heavy slanted rain, wind gusts above floor 70, lightning every 8 to 20 s. After the twelfth strike the rain stops. This is the first dry frame in the game. |
| Faction | **The Choir Proper**: elites in black tie with every weapon type (section 4). |
| Mood | Cold luxury becomes clockwork menace and then open sky. The lobby is gold and black marble with a hundred reflections. The elevator is vertigo: the city falls away under glass. The garden is wild, wet green in the wind. The penthouse is a silent white room over a 90-floor drop. The crown is warm brass and amber, like Bell's workshop made huge. The clock face is black storm, lit only by the clock's own lit glass. |
| Slow-motion set pieces | 1. The elevator cable snaps: a jump from the falling car to the window-cleaning cradle. 2. **The bible set piece**: a machine-gun volley shatters the penthouse glass floor, and Elias dives across the falling shards to the stair rail. 3. Nero's bite opens the boss finisher, which ends in a freeze frame. |
| Length target | 14 to 16 min on Normal: lobby 3, elevator 2, sky garden 2.5, penthouse 2, vestry 0.5, boss 5 to 6. |
| Checkpoints | Elevator entry, sky garden entry, penthouse entry, vestry, each boss phase. |

**Music and sfx mood.**
- The level score is built on two motifs from earlier levels. **Bell's motif** is a music-box figure over a clock tick; it first played in the prologue workshop. **The Choir chant** is a low male hum on A440, the pitch of a tuning fork.
- The lobby adds walking bass, brushed snare and a muted trumpet ("noir jazz in a tuxedo").
- The elevator cue rises in pitch with the floor counter (Shepard-tone strings).
- The sky garden has wind and taiko-like timpani.
- The penthouse is almost silent: rain on glass, the creak of the floor, a solo piano that goes out of tune as the glass cracks.
- The vestry plays Elena's theme (solo upright bass and piano).
- The boss theme, **"The Last Movement"**, keeps strict time with the crown clock. The tempo follows the pendulum (P2), and each quarter peal is in the key of the cue.
- The ending removes all percussion. The twelve hour strikes become the only rhythm.
- The epilogue is the first cue without rain ambience: one acoustic guitar and a ticking watch.

---

## 2. Sections map

World: `W 3800, H 320, groundY 280`. This is 200 px over the usual strip because the crown has three boss arenas side by side. The vertical tower is a row of floor sections joined by transitions. The **height comes from backdrops**: the city 90 floors below, cloud layers and the facade scroll. The world height does not change.

| # | Section id | x-range | In/out | Floor | Backdrop | Lighting | Camera |
|---|---|---|---|---|---|---|---|
| 1 | `lobby` | 0-680 | indoor | 1 | Mirror wall (`panes kind:'mirror'`) on the back wall. Through the revolving door (x 0-40) you see the street in the rain. | Warm gold chandeliers (3), floor uplights, lightning through the high windows. Ambient [0.55, 0.48, 0.38]. | minZoom 0.45, maxZoom 0.7. Bounds 0-680. The mirrors double every fighter (`reflect.js`). |
| 2 | `lift` | 720-1100 | outdoor (the car is glass) | 1 → 75 | **[NEW] vertical scroll**: the facade strips scroll down past the car. The city lights shrink below. Cloud layer at floor 55; inside the clouds from floor 60. | Car ceiling strip light (cold white). The flash of the passing floors. Lightning. Ambient [0.35, 0.4, 0.55]. | Locked on the car, zoom 0.6. A small camera shake on each floor seam. A wider view (zoom 0.4) for the snap. |
| 3 | `garden` | 1140-1860 | outdoor | 75 | Above the clouds in places: the storm in layers, the city lights through gaps, the Spire's crown lit above (the clock face glows amber; the hands read the real time). | Garden lanterns (sodium-amber), lightning. Ambient [0.32, 0.4, 0.38]. | minZoom 0.4, maxZoom 0.65. The camera leans into the wind direction during gusts. |
| 4 | `penthouse` | 1900-2440 | indoor | 90 | The window wall shows the storm. **The glass floor shows the city 90 floors below** (an abyss backdrop under y 280 [NEW]: street grid, car lights, rain falling away). | Cold white and silver. Champagne-gold bar light. Ambient [0.5, 0.52, 0.6]. | minZoom 0.45, maxZoom 0.7. During the floor break, the camera tilts down 30 px to show the drop. |
| 5 | `vestry` | 2480-2680 | indoor | 91-92 | Brick and brass. A stair to the crown. | One warm lamp, pipe smoke haze. Ambient [0.55, 0.42, 0.3]. | Tight, zoom 0.75. Quiet. |
| 6 | `gears` | 2720-3080 | indoor | crown | **Boss phase 1.** Three huge brass gears turn in the plat lane. Behind them is the back of the glass dial, seen in reverse (amber light, the shadows of the hands). | Amber through the dial. Red tally lamps. Ambient [0.6, 0.45, 0.28]. | Bounds 2720-3080, zoom 0.55. Frames gear tops at y 80. |
| 7 | `pendulum` | 3120-3440 | indoor | crown | **Boss phase 2.** A tall shaft. The pendulum rod comes down from the dark. Iron ledger boxes are stacked on the balconies. | The pendulum bob carries a lamp, so the light swings with it. Ambient [0.45, 0.36, 0.26]. | Bounds 3120-3440, zoom 0.55. |
| 8 | `face` | 3480-3800 | outdoor | crown exterior | **Boss phase 3.** The giant glass clock face (12 m wide) on the wall lane, lit from inside. A cornice ledge at the bottom (the ground). The storm and the city far below. | The dial glow (amber), lightning, a red aircraft-warning beacon at the top. Ambient [0.3, 0.32, 0.42]. | Bounds 3480-3800, zoom 0.5. Wide enough to show the whole face. |

**ASCII side view of the climb** (not to scale; left to right is the play order, bottom to top is height in the fiction):

```
                                                    ____[ bell chamber ]____
                                                   |  great hour bell  (o)  |
                                       crown       |GEARS  |PENDULUM| FACE  |   <- phases 1-3
                                                   | ()()()|   |    | (XII) |
                                                   |  ()   |   O    |  /    |
                                                   |_______|________|_(o)___|___ storm
                                       vestry ->  _/  stair, 3:17 clock
              PENTHOUSE  fl.90   ______[MG nest]__/
                                |grand piano |~~~~glass floor~~~~|rail|
                                |____________|....90 floors......|____|
                                                   |
              SKY GARDEN fl.75  pergola  koi  windbreak  gap  Understudy Kessel
                       ~wind~>  |##|  ~~~~  |/|/|/|   ___   ___
                    gondola ->  []________________|___|_____|
                                ^
              GLASS LIFT  fl.1-75  [car]  <- twin car (back lane) at fl.30-55
                                  [car]  <- rappellers fl.55-72, cable snaps fl.72
                                  [car]
              LOBBY fl.1   revolving door | mezzanine | mirrors | Understudy Lys | lift doors
                           ______________|___________|_________|________________|___
                                        the street, rain                              
```

Section joins:
- lobby → lift: in-engine elevator doors at x 640-680, with a fade.
- lift → garden: the gondola is winched up past the parapet, with a fade.
- garden → penthouse: a service lift at x 1840. It is a plain door transition.
- penthouse → vestry: the stair rail at x 2350 leads to the door at 2430.
- vestry → gears: a hatch at the stair top.
- gears → pendulum: a phase shift. Bell climbs a ladder, the hero follows, and the screen fades.
- pendulum → face: a phase shift. Bell smashes the dial glass and steps outside.

---

## 3. Encounter flow

Damage values follow today's tuning. "Choir Proper" roles are defined in section 4.

### Beat 1: "Black Tie": the revolving door
- **Location:** x 0-320 (`lobby`).
- **Enemies:** 2/3/4/4 Choristers (brawler) and 0/0/1/1 Stiletto (knife), already in the room. Each one gets a short spawn-free reveal: they turn from the mirrors at once, as in opening panel 2.
- **Placed:** the hero starts with the **shotgun loaded** (4 shells, from panel 3). A brass queue stanchion at x 120 (carry and throw, pipe-like). A luggage trolley at x 220 (push; it knocks goons down). Champagne bottles on a tray at x 260 (pocket). An ammo box behind the reception desk at x 300.
- **Environment:** the reception desk (x 280-340, a platform at y 248) gives cover from pistol fire. The mirrors (back wall, 6 panes) break on any heavy hit or bullet. Each one breaks with shards and less reflection.
- **Nero:** present. The optional "Nero, hold!" assist [NEW, shared] pins one goon for 4 s, with an 18 s cooldown.
- **Start trigger:** the end of the opening cutscene. **End:** wave `l1` is killed.
- **Why exciting:** the whole Choir in one room, a hundred reflections, and a shotgun from the first second. It is a power-fantasy start for the final level.

### Beat 2: "A Hundred Reflections": the lobby melee
- **Location:** x 160-520. The mezzanine surface is at y 196 (x 140-560) with stairs at x 140.
- **Enemies:** two waves.
  - `l2a` from the stair doors: 1/2/2/3 Canes (pipe), 1/1/2/2 Stilettos, 0/1/1/1 Soloist (pistol) on the mezzanine.
  - `l2b` at x ≥ 400: 1/1/2/2 Forkers (knife thrower) on the mezzanine, 1/2/2/3 Choristers. On H/W one Chorister is a Cantor (section 4).
- **Placed:** a **katana in a glass display case** at x 360 (`pane kind:'window'`, hp 20; break it to take the blade). Two bandages on the concierge stand at x 470 (Easy: 3). A shotgun shell box at x 500.
- **Environment:**
  - **Chandelier drop [NEW: shootable hanging prop]:** the centre chandelier at x 330, y 60. One shotgun blast or two pistol hits on its chain drops it. It does 60 damage in a 50 px circle and knocks down everyone near it. The crystals then spread on the floor as a slip patch (friction zone, as in L1 ice).
  - Mirrors keep breaking. A goon thrown into a mirror takes +10 damage.
- **Start:** heroX ≥ 300 (`l2a`); `l2a` killed or heroX ≥ 400 (`l2b`). **End:** `l2b` killed.
- **Why exciting:** a vertical brawl. Gunmen and fork throwers on the balcony force the player up the stair, and the chandelier is a one-shot room clear for a sharp player.

### Beat 3: "The Understudy": mini-boss Lys Moreau (Brask callback)
- **Location:** x 460-680. Arena walls at 460 and 680 during the fight.
- **Mini-boss:** **Lys Moreau, the Understudy**. Bell trained her to replace Count Brask. She wears a white tuxedo jacket over a black gown and fights with **razor cards** (`volley({proj:'card'})`, fans of 3/3/4/5) and a short cane. HP 240/300/360/420.
- **Gimmick:** the L3 hall-of-mirrors rule in small form. Four mirror panes (x 480-660) each show a **decoy** Lys. The decoys throw card fans with no damage on E and half damage on N+. Breaking a mirror removes its decoy. The real Lys has no reflection. Her portrait bark tells the player: "A gentleman looks for the one with no reflection."
- **Crew:** none on E/N. One Stiletto every 12 s on H/W (max 2).
- **Placed:** a fire axe in a wall case at x 600 (pane hp 20).
- **Start:** `l2b` killed and heroX ≥ 470. A short portrait bark (2 lines, section 6). **End:** Lys is defeated. Her last word names the next rank up: "The Maestro... is upstairs. He wants you on time."
- **Why exciting:** a callback that rewards the L3 skill (find the one with no reflection). Glass flies everywhere in a room that is already half broken.

### Beat 4: "Stay.": the elevator doors (story beat, ~25 s)
- **Location:** x 600-680.
- **Enemies:** none.
- **Scripted (in-engine timeline):** the car arrives (a chime and glass doors at x 640-680). Elias kneels to Nero: **"Stay."** This time Nero sits. The doors close between them. Nero's nose is on the glass as the car rises. Then Nero turns and runs for the stairwell door (sfx: claws on marble, the stair door banging). This sets up the Nero assist; the player believes he obeyed.
- **Start:** Lys defeated and heroX ≥ 620. **End:** the transition to `lift`.
- **Why exciting:** a pause before the vertigo, and a quiet setup for the payoff 10 minutes later.

### Beat 5: "Going Up": floors 1-30 (inside the car)
- **Location:** `lift`. The car interior is x 800-1000. Car floor y 280, ceiling y 180, roof surface y 176.
- **Enemies:** 2/3/3/4 already in the car "as passengers" (Choristers and 1 Stiletto). They wait until the doors close, then pull their gloves on.
- **Placed:** a fire axe in an emergency case at x 990 (pane hp 15). A bandage in the car first-aid box at x 810.
- **Environment:**
  - The car side walls are glass panes `carL` (x 798-804) and `carR` (x 996-1002), hp 80. A heavy throw or flying kick into a side wall cracks it, and a second hit breaks it. **A goon thrown through a broken side pane falls out of the world** (void kill, ragdoll tumbles into the city: a high-value kill).
  - The hero can fall out too. On E/N the void edge has a **ledge-grab assist** (a 24 px catch zone on the car sill).
  - Floor counter HUD (top right): `01 → 30`. The car pauses between floors while a wave lives ("the Choir holds the car"), and it moves while the wave is clear.
- **Start:** `section:enter lift`. **End:** wave `e1` killed. The car rises to floor 30.
- **Why exciting:** close quarters in a glass box, with the city falling away through the floor seams.

### Beat 6: "The Twin Car": floors 30-55
- **Location:** `lift`, back lane.
- **Enemies:** the twin car rises in the **back lane** at the same speed (mover `twin`). Its crew are 2/3/4/4 (Canes, Stiletto, 1 Soloist). They smash the car's back pane `carBack` (depth -20, hp 30) and jump across to the fight lane in pairs, 2 s apart. On H/W the Soloist stays in the twin car and shoots through the glass. Hit him with a thrown bottle, or break his pane with the shotgun.
- **Placed:** the twin car drops an ammo box when its crew is gone.
- **Environment:** lightning lights both cars. Rain now blows in through the broken back pane: the floor near it gets wet and a dodge roll slides 30% farther.
- **Start:** floor 30. **End:** `e2` killed. The twin car stops, then drops away (sfx: brakes screaming below).
- **Why exciting:** an attack from a second moving room, in plain view, before it reaches you.

### Beat 7: "Rappel": floors 55-72 (car roof)
- **Location:** `lift`. The car roof (y 176, x 800-1000) is reached through the roof hatch at x 880-920 (ledge climb). Inside the cloud layer, visibility drops: fog layer, camera zoom 0.55.
- **Enemies:** `e3` Rappellers [NEW spawn mode `from:'rope'`] drop onto the roof and the car sides: 2/3/4/5 (Sabreurs and Choristers). Then 1/1/2/2 Forkers throw from the roof down through the hatch. If the hero stays inside, the Forkers kick through the side glass to come in.
- **Environment:** **wind on the roof** (gusts as in section 8, force 40/50/60/70 px/s, toward +x). A roll on the roof can carry the hero off the edge. On E/N the edge has the ledge-grab assist.
- **Start:** floor 55. **End:** `e3` killed. Floor 72.
- **Why exciting:** you fight on top of a glass box in the clouds, and the choice to stay inside or go up changes the fight.

### Beat 8: "Cable Snap": floors 72-75 (slow-motion set piece 1)
- **Location:** `lift`, then the gondola at x 1010-1080.
- **Scripted:** a quick cutaway (in-engine, 1.2 s, letterbox): on the machine-room ledge far above, a Choir man brings down a fire axe on the cable. **Bang.** The car lurches and drops (the backdrop scroll reverses fast). The **window-cleaning cradle** (mover `gondola`, surface w 70 at y 250) is parked on the facade at x 1010-1080.
- **Slow motion [NEW prompt]:** time scale 0.3 for 2.5 s real. A ring marker on the cradle and the text "JUMP" appear. If `carR` is still whole, the hero breaks through it automatically (glass bursts in slow motion). Jump in any direction toward +x, or a roll toward +x (rolls continue off ledges), lands on the cradle.
- **Fail:** on E/N, the emergency brake catches the car 3 floors down. The hero takes 25 damage, and the cradle lowers to meet the car (+8 s). On H, 40 damage. On W the fall is lethal and the player restarts at the `lift` checkpoint.
- **End:** the cradle is winched up, then a fade to `garden`. The car falls past the camera, empty, into the clouds.
- **Why exciting:** the classic "elevator falls" moment, made playable in one clear button press.

### Beat 9: "The Sky Garden": floor 75 terraces
- **Location:** x 1140-1600 (`garden`).
- **Enemies:** two waves.
  - `g1` at x ≥ 1200: 2/2/3/3 Choristers, 1/1/2/2 Canes, 1/1/1/2 Soloists on the pergola (surface y 190, x 1240-1360).
  - `g2` at x ≥ 1420: 1/1/2/2 Sabreurs, 1/1/1/1 Bass (shotgun), 0/1/1/2 Forkers on the planter tops.
- **Placed:** planter boxes (props `planter`, pushable, x 1220, 1300, 1470; tops at y 244 as platforms). Stone garden lanterns (carry and throw). A machete on the gardener's bench at x 1380. Two bandages at the tea pavilion (x 1520).
- **Environment:**
  - **Wind gusts** toward +x every 6-9 s with a 1 s telegraph (the rain angle tilts and a rising whistle plays). Gusts push all actors and loose objects 50/60/70/80 px/s. Thrown objects curve with the wind.
  - **Koi pool** (x 1400-1480, water 12 px deep) slows movement 40%. A knocked-down goon in the pool stays down 1 s longer.
  - **Glass windbreak panes** (x 1560-1600, 3 panes, hp 40) along the terrace edge. Once broken, the edge behind them is a **void kill zone**: goons can be thrown off, and so can the hero.
  - Nero cue: at x 1180 a stairwell door, and a muffled bark behind it (sfx `nero_bark_far`, toast "...a bark, far below."). This is the first hint.
- **Start:** `section:enter garden`. **End:** `g2` killed.
- **Why exciting:** the first open-air fight in the storm. The wind turns every throw and every roll into a choice.

### Beat 10: "The Understudy, Second Chair": mini-boss Bruno Kessel (Marchetti and Switch callback)
- **Location:** x 1600-1860. A 50 px **void gap** at x 1640-1690 between the terrace and the helipad deck (deck x 1690-1860).
- **Mini-boss:** **Bruno Kessel, the Understudy**. He was Bell's choice to replace Marchetti. He is a huge man in black tie with the sleeves torn off and a **hook on a chain** (`grab`: pull, then a heavy chop). HP 320/400/480/560.
- **Gimmick:** the hook pull and the wind. His hook pull drags the hero 80 px toward him. When a gust and a pull line up, they can carry the hero over the gap. He also swings the chain as a whip across the gap (`whip` [NEW, shared with L2 Switch], reach 90 px). The gap has a narrow steel beam at y 268 (x 1640-1690, 8 px wide, one-way) to cross.
- **Crew:** 0/0/1/1 Canes every 14 s, max 2.
- **Punish:** a missed hook gets stuck in a planter or the windbreak frame for 1.4 s (E 2.0 s, W 1.0 s).
- **Start:** `g2` killed and heroX ≥ 1620. **End:** Kessel is defeated. On a kill near the edge, he can go over the void in a ragdoll. His last word: "Ninety... the old man waits at ninety." A service lift at x 1840 opens.
- **Why exciting:** a strong man fight over a drop. The hook pull rewrites the L1 boss in the wind.

### Beat 11: "Champagne on Glass": the penthouse party
- **Location:** x 1900-2340 (`penthouse`). Solid floor 1900-2000. **Glass floor tiles** `gf1` 2000-2108, `gf2` 2114-2226, `gf3` 2232-2340, with steel mullion beams between them (6 px solid). Solid floor 2340-2440.
- **Enemies:**
  - A crowd of 6 guests in evening dress (crowd system) flees to x 1900 on the first hit and leaves by the service lift.
  - Wave `p1`: 2/3/3/4 Choristers and Canes, 1/1/2/2 Stilettos, 1/1/1/2 Forkers.
  - **Forks stuck in glass tiles do 6 damage to the tile.**
- **Placed:** a grand piano at x 2060 (pushable heavy object; 400 kg; it moves slowly; a hit with it does 40 damage). A bar cart with bottles at x 1960 (pocket). An ammo box at x 1930. A machine gun on the bar at x 1940 (once per checkpoint).
- **Environment: the glass floor cracks in stages [NEW].** Each tile has hp 100. Damage to a tile comes from:

  | Source | Tile damage |
  |---|---|
  | heavy landing (flying kick, axe plunge) | 15 |
  | knocked-down body or thrown heavy object | 10 |
  | missed bullet (pistol 4, MG 4 per round, shotgun 12) | as listed |
  | stuck fork | 6 |
  | piano on the tile, per second | 5 |

  Stage 1 (≥ 35): white cracks. Stage 2 (≥ 70): crazed, creaks underfoot (an audio telegraph), and the hero walks 10% slower on it. Stage 3 (100): it shatters, the surface is removed, and a **void** opens. On H/W, goons avoid stage-2 tiles. On E/N, they walk onto them.
- **Start:** `section:enter penthouse`. **End:** `p1` killed.
- **Why exciting:** the floor is the enemy. Every big move the player makes costs floor, so a smart player fights on the mullions, or uses the piano as a battering ram and lets it fall through.

### Beat 12: "Ninety Floors": the machine-gun volley (slow-motion set piece 2, from the bible)
- **Location:** x 2200-2440. The **MG nest** is on the mezzanine (surface y 190, x 2260-2440).
- **Enemies:** 1/1/2/2 Ushers (machine gun, section 4) on the mezzanine and 0/1/1/2 Soloists.
- **Scripted:** at `p1` killed and heroX ≥ 2150, the gunners open fire in a sweep across `gf2` → `gf3` (2.0 s). Any tile under the sweep goes to stage 2 at once. The tile under the hero goes to stage 3.
- **Slow motion [NEW prompt]:** time scale 0.3 for 2.2 s real. The camera tilts down. The city is visible through the falling shards. A marker on the **stair rail** at x 2350 (a ledge at y 230). Dive with jump or roll toward +x. A **rail auto-grab** zone of 40/32/24/18 px (E/N/H/W) catches the hero, who climbs onto the stair.
- **Fail:** the hero falls into the void, and the player restarts at the penthouse checkpoint. On E/N, the first fail each checkpoint gives a "second chance": the hero catches a mullion and takes 20 damage.
- **After:** the hero is on the stair, above the gunners' side. The player climbs to the mezzanine and kills them. The piano (if still in the room) falls through the floor with a last chord. Goons on the glass fall with it.
- **End:** `p2` killed. The door at x 2430 opens.
- **Why exciting:** this is the set piece the whole level builds toward: the floor that the player has been afraid of for two minutes finally goes, under fire, in slow motion.

### Beat 13: "The Vestry": breather (~40 s)
- **Location:** x 2480-2680 (`vestry`). A stair climbs from y 280 at x 2500 to a hatch at x 2660.
- **Enemies:** none.
- **Placed:**
  - On a rack: **Elias's old Choir katana** with a tuning-fork mark on the guard. Bell kept it. It is the same katana stats; only the skin differs.
  - 2 bandages (E 3, W 1). 1 ammo box.
  - **A Bell & Sons clock stopped at 3:17** on the wall (bible rule).
  - A bowl of soup, still warm, and a cherry-wood pipe still smoking on a bench. This is a callback to prologue panel 2.
- **Scripted (in-engine, skippable):** walking past the bench, Elias stops. He takes Elena's red scarf out of his inside pocket, looks at it for 2 s and puts it back. Far below, a bark echoes up the stairwell, closer now.
- **Start:** `section:enter vestry`; checkpoint. **End:** the hatch at x 2660, then the boss intro.
- **Why exciting:** silence before the last fight, and one look at what he fights for.

### Beat 14: Boss phase 1, "The Gear Room"
x 2720-3080. See section 5. Boss intro portrait dialog first.

### Beat 15: Boss phase 2, "The Pendulum Hall"
x 3120-3440. See section 5.

### Beat 16: Boss phase 3, "The Face", then Nero, then midnight
x 3480-3800. See section 5. The ending sequence and epilogue follow (section 6).

---

## 4. The Choir Proper (new enemy variants)

All wear black tie: tails or dinner jackets, white gloves, and a silver tuning-fork lapel pin. The look is one shared skin (`look:'choir'`) with per-role accessories. Base stats are today's role stats, with the changes below. **Every elite has +25% hp and +20% poise** over the base role, and blocks and counters at the next difficulty's rate. For example, on Normal a Choir Proper blocks like a Hard goon.

| Variant | Base role | Weapon / look | Behaviour changes | Drops |
|---|---|---|---|---|
| **Chorister** | brawler | Bare hands, white gloves | **Close harmony:** two Choristers who flank the hero attack on alternating beats, 0.4 s apart, so one always threatens. | — |
| **Stiletto** | knife | Thin blade from the cane | Lunges from 90 px (base 70). After every hit, it backs off 40 px. | knife |
| **Cane** | pipe | Steel walking cane | **Parry:** turns aside the hero's heavy attack 15/25/35/45% of the time, then strikes (1.0 s telegraph: the cane spins). Light attacks break the parry stance. | pipe (cane skin) |
| **Sabreur** | machete | Sabre (Lenz's students, in white gloves) | Attacks in a **3-beat string on a metronome tick** (L7 callback). The tick is audible; the third beat is a lunge. A dodge on beat 3 gives a 1.0 s punish. | machete (sabre skin) |
| **Forker** | knife thrower | Steel tuning forks | Projectile `fork`: it rings on impact (a visual ring). Forks that miss stick in floors and walls for 4 s. On glass tiles they do 6 damage. | 3 throwing knives |
| **Soloist** | pistol | Pearl-grip pistol | Uses platforms and the desk as cover. Shoots only with a clear line. 2-shot burst, 1.4 s apart. | pistol ammo |
| **Bass** | **[NEW] shotgun goon** | Sawn-off double barrel | Big and slow (speed 80%). 5-pellet spread at short range (90 px), with knockback. 1.2 s telegraph: he breaks the gun open and loads it. He breaks panes he shoots through. | shotgun (2 shells) |
| **Usher** | **[NEW] machine-gun goon** (shared with L7) | Compact MG, grey gloves | Suppression burst of 8 rounds, 1.5 s telegraph (laser sight sweep). He stays on platforms. | machine gun |
| **Cantor** | any melee role + a red pocket square | — | The squad leader. While a Cantor lives and 3+ Choir Proper are alive, the Choir **hums** (the chant cue) and all of them get +10% speed and 0.8x attack cooldowns. Killing the Cantor stops the hum. One per wave at most. |
| **Rappeller** | spawn mode (any melee) | Rope harness | Enters `from:'rope'` [NEW]. Lands on a platform or roof and drops the rope. 0.8 s of landing lag (a punish chance). |

**Placement rules.**
1. **Ranged cap:** at most 2 ranged elites (Forker, Soloist, Bass, Usher) alive at once on E/N, and 3 on H/W. An Usher counts as 2.
2. **High ground:** Soloists, Forkers and Ushers spawn on platforms (mezzanines, pergola, planters, car roof). Melee roles spawn on the fight lane.
3. **One heavy at a time:** at most 1 Bass and 1 Usher alive at once.
4. **Cantor:** from Beat 2 on, H/W only. On N, only in Beat 9.
5. **Glass sense:** goons never spawn on a glass tile at stage 2 or more. On H/W they avoid those tiles; on E/N they do not.
6. **Pacing:** a new wave never spawns within 3 s of a slow-motion set piece ending.
7. **Crew in the boss fight:** only Choristers, Canes and Stilettos (no ranged goons). The quarter peal must stay readable.
8. **Variety:** no wave has more than 2 of the same variant on E/N, or 3 on H/W.
9. **Introduction:** each variant first appears alone or with one other role, so the player can learn its tell: Cane in Beat 2, Sabreur in Beat 7, Bass in Beat 9, Usher in Beat 12.

---

## 5. The ultimate boss: Augustin Bell, "the Conductor"

**Look.** An old man in shirtsleeves and a waistcoat, with a jeweller's loupe on his brow and a cherry-wood pipe in his teeth during the intro. He fights with:
- a **weighted pocket-watch chain flail** in his left hand. The watch is a heavy gold hunter case on 2.5 m of chain.
- a **sword-cane** in his right hand: an ebony cane with a thin blade.

He is fast, exact and unafraid. He never runs. He walks or steps, and he never takes a hit he did not choose.

### 5.1 The crown clock (the shared timer for all three phases)

The crown clock is the boss's timer, and the player can see it. Its minute hand is the countdown for the **quarter peal**.

- **Phase quarters.** Phase 1 runs the hand from :15 to :30. Phase 2 runs it from :30 to :45. Phase 3 runs it from :45 to :59.
- **Hand speed.** One quarter takes **Q seconds**: Q = 60/50/40/32 (E/N/H/W). In phases 1 and 2, you see the hand through the back of the dial. In phase 3, you stand on it.
- **The peal.** When the hand reaches the quarter mark, the **quarter peal** sounds. Then one of two things happens:
  - The boss HP has crossed the phase threshold: a **phase shift**.
  - The boss HP is still above the threshold: Bell says **"Again. From the top."**, pulls the winding lever and turns the hand back to the start of the quarter. He gets no heal. This is a rehearsal callback; the Conductor makes the orchestra repeat.
- **Early phase end.** If the HP threshold is crossed before the hand reaches the mark, Bell **winds forward**. The hand sweeps to the mark in 1.5 s, the peal sounds as the phase-shift telegraph, and the phase shift starts.
- **Phase 3.** The hand is not reset from :59 to :00. The twelve strikes at midnight are only for the ending. In phase 3, when the hand reaches :59 and Bell still stands, the peal sounds and Bell turns the hand back to :45. The minute-hand platform becomes flat again.

**The quarter peal shockwave (the Malaspina echo).** Use `groundSlam` / `leapSlam` quakes from `hazards/quakes.js`.
- **Telegraph:** 1.6 s. The bell hammer lifts (a visual mark on the bell) and the Westminster quarter notes play. The floor dust jumps on each note. In 3D, the bell swings.
- **Effect:** a ring falls from the bell, hits the floor under it and runs both ways as a quake: `{ v: 165, life: 1.25, dmg: 16, h: 12 }`. It is the same value as Malaspina's slam, as a deliberate echo. A jump clears it.
- **Number of rings** = the phase number (1, 2 or 3), 0.45 s apart. +1 ring on Wicked.
- **Riders:** the peal **throws riders off gear platforms and the minute hand** (a 60 px/s upward kick and a loss of footing) in phases 1 and 3.
- **Radial ring in phase 3:** the bell chamber is above the face, so the ring hits the cornice and also pushes outward from x 3640 at 120 px/s for 0.3 s. Near the edge at x 3780, with a gust, this is lethal.
- **Bell's sync move "On the Bell":** Bell always tries to **lunge on the peal**. His thrust arrives at ground level with the ring. One jump clears both the ring and the blade, and a landing behind him gives a **1.2 s punish window**. This is opening panel 4 as a mechanic: "Strike when the bell rings."

### 5.2 Stats

```js
stats: { hp: { E: 1000, N: 1200, H: 1350, W: 1500 }, s: 1.0, m: 4, speed: 34, reach: 26, dmg: 18,
         heavyDmg: 26, poise: 40, windup: 0.28, cd: [0.5, 1.1] }
```
Phase thresholds: hpBelow 0.66 (phase 2) and hpBelow 0.33 (phase 3). The "Last Movement" starts at hpBelow 0.15 (E 0.2).

### 5.3 Move list

All telegraph times are base values. The runtime scales them by `t / sqrt(A)` (difficulty).

| Move | Primitive | Telegraph (pose / mark / cue) | Active | Punish window (recover) | Phases |
|---|---|---|---|---|---|
| **Sword-cane strings**: `[thrust]`, `[cut, cut]`, `[feint, thrust]`, `[thrust, cut, pommel]` | `string(combos)` | 0.35 s; the blade glints. The feint has a bright glint and no strike. | 0.12 s per hit, 18 dmg | 0.6 s after the last hit | 1-3 |
| **Pendulum Sweep**: the flail swings level at hip height, reach 70 px | `whip({reach:70, arc:'low'})` [NEW, shared with L2] | 0.55 s; the watch drops to his knee and swings back; a tick-tock cue | 0.3 s, 20 dmg | 0.8 s (the chain winds back) | 1-3 |
| **Escapement Drop**: the watch is swung high and brought straight down; a small quake | `groundSlam({ quake: { v:120, life:0.8, dmg:10 } })` | 0.7 s; the watch is raised high and a floor mark shows | 0.15 s, 26 dmg | **1.3 s** (the watch is stuck in the floor). The best window. | 1-3 |
| **Reel**: the watch is thrown; the chain wraps the hero and pulls him in, then a cane thrust | `grab({ reach:110, pull:true, then:'thrust' })` | 0.6 s; he spins the watch in a small circle next to his ear | pull 0.4 s, then thrust 22 dmg | 0.9 s if it misses (the chain is out) | 1-3 |
| **Winding**: a 360° flail spin around him, radius 60 px, then a release toss | `hazard('spin')`, then `volley({proj:'watch', n:1})` | 1.0 s; a whirring sound that rises in pitch, and a ring mark on the floor | 1.2 s spin, 14 dmg per hit | 1.0 s after the toss | 2-3 |
| **On the Bell**: a lunge timed to arrive with the quarter peal | `charge({ v: 230, maxT: 0.5, sync: 'chime' })` | the peal telegraph is his telegraph | 0.5 s, 24 dmg | 1.2 s if the hero jumped over | 1-3 |
| **The Lesson**: a counter that reads repeats | `readCounter({ repeat: 4/3/3/2 })` [NEW] | 0.4 s; he taps his loupe and the lens flashes | a parry, then a riposte for 20 dmg | none | 1-3 |
| **Gear Ride**: he steps onto a gear tooth and rides it up, then makes an Escapement Drop from above | movers + `leapSlam` | 0.5 s; he looks up at the tooth | — | 1.3 s on landing | 1 |
| **Swing**: he takes the pendulum rod and swings across the hall, kicking | `leapSlam` with a mover attach [NEW: `ride(moverId)`] | 0.6 s; he jumps to the rod as it comes near | 0.4 s, 22 dmg | 1.0 s on landing | 2 |
| **Unpinned**: he cuts the pendulum's damping, so the period drops 25% for 8 s | `hazard('pendulumFast')` | 0.8 s; he strikes the clutch with the cane, and a clank and steam rise | — | 0.8 s (he is at the clutch) | 2 (hp < 0.45) |
| **Taunt**: he wipes his loupe, or relights his pipe | `taunt({ t: 1.2 })` | — | — | the full 1.2 s is open | 1-3, after the hero is knocked down |

**The Lesson (left guard).** The brain keeps the hero's last attack ids. When the same attack id lands or is blocked **N times in a row** (N = 4/3/3/2), the next one is parried and punished. Bell's bark: "Left guard, boy." This makes the player mix strings, the way Bell taught him. It does not trigger on gun fire.

**Guns.** Bell turns aside pistol and machine-gun bullets with the cane at 60% (N); this is a deflect animation. Shotgun blasts at close range always hit and stagger him for 0.5 s. Thrown objects hit him when he is in recover. Otherwise he steps aside.

### 5.4 Phase 1: the Gear Room (hp 100% → 66%), x 2720-3080

- **Gimmick `crownGears` [NEW: rotating gear platforms].** Three gears in the plat lane:
  - G1 at (2810, 170), r 60, clockwise, period 9 s.
  - G2 at (2930, 140), r 50, counterclockwise, period 7.5 s.
  - G3 at (3020, 180), r 55, clockwise, period 9 s.
- **Teeth.** Each gear carries 4 tooth platforms (w 26, one-way). They ride its rim and stay level, like a Ferris wheel (`movers mode:'orbit'`).
- **Mesh points** (G1-G2 at (2868, 152), G2-G3 at (2975, 160)) are **crush hazards**: 30 damage and a 0.6 s pin for a hero, a goon or Bell.
- The quarter bell hangs at (2900, 36).
- **Use:** the gear tops (y 80-110) are the high ground. Bell rides them to make Escapement Drops. The hero can ride them to drop with an axe plunge, a flying kick or a blade throw from above. The peal throws everyone off the teeth.
- **Crew:** `{ roles: ['chorister','cane','stiletto'], every: 14, max: 4, alive: 1/1/2/2 }`. They enter by the hatch at x 2730.
- **Pickups:** a bandage appears on the hatch landing at each "From the top" reset (E/N only, max 2 in the phase).
- **Phase shift** (`phaseShift`, 3 s, invulnerable): Bell winds forward if needed. The peal sounds. Bell climbs the ladder at x 3070 with the bark "Come. The second movement." Then a transition to `pendulum`. The arena moves [NEW: `phases[].arena`].

### 5.5 Phase 2: the Pendulum Hall (66% → 33%), x 3120-3440

- **Gimmick `greatPendulum` [NEW: pendulum hazard].**
  - Pivot (3280, -10), rod length 250, amplitude 34°, period 4.2/4.2/3.8/3.4 s.
  - The bob is a 44 px brass disc. At the bottom of the swing, its centre is at y 236, so its lower edge is at y 258.
  - **The bob hits anything standing** in its path: 30 damage, with big knockback along the swing.
  - It passes **over a rolling or sweeping hero**: a roll or a low attack gets under it.
  - It **hits Bell and goons too**. Bell steps clear unless he is in a recover window. Baiting an Escapement Drop under the pendulum's path is the skilled play: the bob hits him for 60 damage and a 2.0 s stun.
- **Balconies:** plat surfaces at y 200 (x 3130-3200 and x 3360-3430). They are safe from the bob and have ledger-box stacks.
- **Ledger boxes:** iron boxes from the L7 train (props `ledgerBox`, heavy, throwable, 30 dmg). The pendulum bursts any box in its path, and paper fills the air. This sets up the epilogue.
- **Lights:** the bob lamp swings the only strong light. Fighters' shadows sweep across the walls (2D: a light pass; 3D: a point light on the bob).
- **The peal:** 2 rings from the bell at (3280, 30).
- **Unpinned** below 45% HP.
- **Crew:** none. The duel is pure.
- **Phase shift:** the peal sounds. Bell walks to the dial wall (the back of the face at x 3440). He swings the watch through the glass and steps out into the storm: "Come outside, Elias. Let the city watch." Wind and rain blow in. Paper from the burst ledger boxes is pulled out through the hole into the storm. Then a transition to `face`.

### 5.6 Phase 3: the Face (33% → 0%), x 3480-3800, outside, in the storm

- **Layout:**
  - The **cornice** is the ground: x 3500-3780, y 280. Beyond x 3780 is the **void**. The broken opening at x 3480-3500 leads back into the crown; the camera blocks it with a wall.
  - The face centre is (3640, 150), with the numerals on a radius of 110.
  - **Numeral ledges** (one-way, w 30) at: IX (3530, 150), X (3545, 95), XI (3585, 55), I (3695, 55), II (3735, 95), III (3750, 150), IV (3735, 205), V (3695, 245), VII (3585, 245), VIII (3545, 205).
  - The hour hand stands near XII. It is decoration only.
- **Minute-hand platform [NEW: rotating sloped surface].**
  - The hand rotates on pivot (3640, 150), length 120. The phase starts at :45, so the hand is flat and points left: a 120 px beam from 3520 to 3640 at y 150.
  - As the hand moves toward :59, it tilts.
  - Up to 30° it can be walked. From 30° to 50°, actors slide toward the pivot at 40 px/s and cannot stand still. Above 50°, nobody can stand on it, and actors fall to the numeral ledges or the cornice.
  - The "From the top" reset at :59 sweeps the hand back to flat in 2 s. Anyone on it is carried around.
- **Wind gusts:** toward +x (the void edge), every 5-8 s, with a 1 s telegraph. Force 60/70/80/95 px/s. Loose light objects blow away, and thrown items curve with the wind.
- **Lightning:** every 8-14 s. On W, a 0.15 s whiteout of the whole screen; Bell still telegraphs on the cue sound.
- **The peal:** 3 rings, with the radial push (5.1).
- **Bell's patterns:** all moves except Gear Ride, Swing and Unpinned. He uses the minute hand himself: he stands on its tip and makes Escapement Drops onto the cornice.
- **Crew:** none.

### 5.7 Nero's assist (scripted, once)

- **Condition:** Bell's HP is below the Last Movement threshold (0.15, E 0.2), and Bell **starts a Winding**.
- **Event:**
  1. The service hatch on the cornice at x 3520 bursts open. **Nero** comes out at full speed, wet and panting (in-engine; a dog actor [NEW: scripted dog NPC with a bite action]).
  2. He leaps and **bites Bell's flail arm** in the middle of the spin.
  3. The spin stops, and the watch and chain fall on the cornice.
  4. Bell is **stunned** for 3.0 s of game time. His bark: "...Elena's dog."
- **Slow motion:** time scale 0.25. A ring marker on Bell and the prompt "FINISH" (heavy attack, or any attack on E).
- **Window:** 1.6/1.2/1.0/0.8 s real time (E/N/H/W) inside the slow motion. On E, the window is extended until any input.
- **Finisher:** it depends on the weapon and ends in a **freeze frame** (bible rule):
  - katana: a draw cut that sends the sword-cane spinning into the storm.
  - axe: a haft blow to the chest.
  - unarmed: a heavy kick to the chest.
  - gun: a pistol-whip, then a hurled empty gun.
  In each case Bell goes backward over the cornice edge.
- **Miss:** Bell shakes Nero off (Nero lands safely and stays by the hatch, growling). Bell enters **"Last Breath"**: hp is clamped to 1, and **the next heavy hit or knockdown of any kind** plays the same finisher (without the slow-motion prompt). Nero is never hurt.
- **Design reason:** the bible says the dog makes the opening. The player still makes the hit.

### 5.8 The ending sequence (`defeat: { type: 'scripted', timeline: 'bell_end' }`)

1. **Freeze frame** on the finisher hit. Then the scene moves to an in-engine timeline, with input locked and the HUD hidden.
2. Bell flies back past the edge. His left hand catches the **minute hand** as it passes over the void. Its tip now hangs over the drop: the timeline moves the hand to :59 and sets the face so its tip is beyond the cornice line. He hangs one-handed, 90 floors up, in the storm.
3. Elias walks to the edge (an automatic walk). Nero sits beside him.
4. **Ending panels 1-2** (comic panels over a darkened frame; section 6).
5. **Back in engine:** the minute hand **jumps to twelve**. A tower clock's minute hand moves in one step: clunk. The **great hour bell** strikes 12 times, 1.2 s apart. Each strike is a quake ring in the rain (the shockwave rings from the bible panel). They do no damage; the hazard is disabled.
6. On the **first strike**, Bell's grip slips one finger. On the **fourth**, the chain watch, caught on the hand, falls. On the **seventh**, his hand opens. He falls into the storm, calm, with his eyes open. The camera does not follow him down; it holds on the empty hand.
7. Strikes 8-12 continue over Elias and Nero on the edge. **On the twelfth, the rain stops**: weather goal 0, and the rain drops fade over 3 s. Above, the clouds break. The ledger pages that blew out of the crown fall slowly past the camera.
8. **Ending panel 3** (VO: "I didn't push him. Time did."). Then the epilogue (section 6).

**Difficulty scaling summary**

| Parameter | E | N | H | W |
|---|---|---|---|---|
| HP | 1000 | 1200 | 1350 | 1500 |
| Quarter length Q (s) | 60 | 50 | 40 | 32 |
| Peal rings (P1/P2/P3) | 1/2/3 | 1/2/3 | 1/2/3 | 2/3/4 |
| Lesson repeat N | 4 | 3 | 3 | 2 |
| Bullet deflect | 40% | 60% | 75% | 90% |
| Pendulum period (s) | 4.2 | 4.2 | 3.8 | 3.4 |
| Wind force P3 (px/s) | 60 | 70 | 80 | 95 |
| Crew alive (P1) | 1 | 1 | 2 | 2 |
| Nero window (s, real) | until input | 1.2 | 1.0 | 0.8 |
| Last Movement at | 20% | 15% | 15% | 15% |
| Telegraph time | `t/sqrt(A)` (runtime) | | | |
| Second wind (`secondWind`) | after 1 KO, crew cleared, bandage drop | after 2 KOs | after 2 KOs | none |

### 5.9 Boss module skeleton (`src/bosses/bell.js`)

```js
import { defineBoss, string, whip, groundSlam, grab, charge, leapSlam, hazard, volley, taunt, readCounter, ride } from '../sim/boss/primitives.js';
import { crownClock, crownGears, greatPendulum, clockFace } from './gimmicks/spire.js';

export default defineBoss({
  id: 'bell', name: 'Augustin Bell', title: 'The Conductor', look: 'bell',
  stats: { hp: { E: 1000, N: 1200, H: 1350, W: 1500 }, s: 1.0, m: 4, speed: 34, reach: 26, dmg: 18,
           heavyDmg: 26, poise: 40, windup: 0.28, cd: [0.5, 1.1], deflect: { N: 0.6 } },
  intro: { walkTo: 'arena.x0+200', spotlight: false, dialog: 'bell_intro', t: 2.2 },
  moves: {
    cane:    string({ combos: [['thrust'], ['cut', 'cut'], ['feint', 'thrust'], ['thrust', 'cut', 'pommel']] }),
    sweep:   whip({ reach: 70, arc: 'low', windup: 0.55, recover: 0.8 }),
    drop:    groundSlam({ windup: 0.7, quake: { v: 120, life: 0.8, dmg: 10 }, recover: 1.3 }),
    reel:    grab({ reach: 110, pull: true, then: 'thrust', windup: 0.6 }),
    winding: [hazard('spin', { r: 60, t: 1.2, dmg: 14 }), volley({ proj: 'watch', n: 1 })],
    onBell:  charge({ v: 230, maxT: 0.5, sync: 'chime', recover: 1.2 }),
    lesson:  readCounter({ repeat: { E: 4, N: 3, H: 3, W: 2 }, bark: 'bell_left_guard' }),
    gearRide: leapSlam({ via: 'gearTooth', windup: 0.5, quake: { v: 120, life: 0.8, dmg: 10 } }),
    swing:   ride({ mover: 'pendulum', then: 'kick', dmg: 22 }),
    unpin:   hazard('pendulumFast', { k: 0.75, t: 8 }),
    taunt:   taunt({ t: 1.2, pose: ['loupe', 'pipe'] }),
  },
  phases: [
    { id: 1, arena: 'gears', moves: { cane: 4, sweep: 2, drop: 2, reel: 1, gearRide: 2 }, gimmick: crownGears,
      crew: { roles: ['chorister', 'cane', 'stiletto'], every: 14, max: 4, alive: { E: 1, N: 1, H: 2, W: 2 } } },
    { id: 2, arena: 'pendulum', enter: { hpBelow: 0.66 }, onEnter: ['windForward', 'peal', 'exitLadder'],
      moves: { cane: 4, sweep: 2, drop: 2, reel: 1, winding: 1, swing: 2 }, gimmick: greatPendulum,
      big: { when: { hpBelow: 0.45 }, every: [14, 18], pick: { unpin: 1 } } },
    { id: 3, arena: 'face', enter: { hpBelow: 0.33 }, onEnter: ['windForward', 'peal', 'smashDial'],
      moves: { cane: 4, sweep: 2, drop: 3, reel: 2, winding: 2 }, gimmick: clockFace },
    { id: 'last', enter: { hpBelow: { E: 0.2, N: 0.15 } }, assist: 'nero_bite', on: 'winding' },
  ],
  always: { lesson: true, chime: crownClock /* Q per difficulty; the peal drives onBell */ },
  secondWind: { afterKOs: { E: 1, N: 2, H: 2 }, clearCrew: true },
  defeat: { type: 'scripted', timeline: 'bell_end' },
});
```

---

## 6. Cutscene and dialog script

Caption style follows the bible: yellowed boxes for VO, white balloons for dialogue, red tint on Choir symbols, sepia for memories.

### 6.1 Opening panels (`spire_intro`)

| # | SHOT | TEXT |
|---|---|---|
| 1 | Extreme low angle. The Spire rises into black storm clouds. Lightning lights its glass clock crown; the hands read 11:40. The hero stands at the base, tiny, in the rain. Nero sits at his heel. | VO: "Every road in Valmora leads up. Tonight, so did mine." |
| 2 | The mirrored marble lobby. A hundred reflections of the hero. Dozens of Choir men in black tie turn toward him at once. Every lapel has a silver tuning-fork pin (red tint). | VO: "The whole Choir. All its voices, in one room." |
| 3 | Close-up. The hero loads the shotgun. A raindrop falls from his hair onto the shell. | HERO: "Last song." |
| 4 | Flashback panel, sepia: the young hero and Bell in the old workshop. Bell corrects the boy's left guard with a ruler. Clocks tick on every wall. | BELL (memory): "Time is everything, boy. Strike when the bell rings." |

### 6.2 Mid-level barks (portrait dialog, 1-2 lines, no pause on N+)

| Where | Speaker | Mood | Line |
|---|---|---|---|
| Beat 3 start | LYS | Amused, fanning cards | "The Count was a bore. I'm his understudy. A gentleman looks for the one with no reflection." |
| Beat 3 start | HERO | Cold | "No gentleman here." |
| Beat 3 end | LYS | Breathless | "The Maestro is upstairs. He wants you on time." |
| Beat 4 | HERO | Quiet | "Stay." |
| Beat 10 start | KESSEL | Grinning, swinging the hook | "Second chair. Marchetti's chair. Let's see how far you fly." |
| Beat 10 end | KESSEL | Fading | "Ninety... the old man waits at ninety." |

### 6.3 Boss intro portrait dialog (`bell_intro`; in the gear room, gears turning, the pendulum heard through the wall)

| Speaker | Mood | Line |
|---|---|---|
| BELL | Warm, proud, wiping his loupe | "You came on time, Elias. You always did." |
| HERO | Grieving, quiet | "The fire." |
| BELL | Calm, regretful | "The Board wanted me dead. They took your dog to make you do it. I gave you a better song." |
| HERO | Furious | "You used me." |
| BELL | Cold, drawing the sword-cane | "I conducted you. Now the last movement. Keep your left guard up." |

### 6.4 In-fight barks (voice + small subtitle, no pause)

| Trigger | Line |
|---|---|
| The Lesson counter | BELL: "Left guard, boy." |
| A peal with "From the top" | BELL: "Again. From the top." |
| Phase 1 → 2 | BELL: "Come. The second movement." |
| A pendulum hit on Bell | BELL: "...Good. You listened." |
| Phase 2 → 3 | BELL: "Come outside, Elias. Let the city watch." |
| Bell knocks the hero down (Taunt) | BELL: "Up. I did not raise a quitter." |
| Nero's bite | BELL: "...Elena's dog." |
| Prompt success | HERO: "Hold." (to Nero, as Nero lets go) |

### 6.5 Ending panels (`spire_end`, around the in-engine timeline in 5.8)

| # | SHOT | TEXT |
|---|---|---|
| 1 | Outside the shattered clock face. Bell hangs from the minute hand over the storm, ninety floors up. He reaches out his free hand. His loupe hangs from its cord and turns in the wind. | BELL: "The Choir needs a Conductor. Come home, Elias." |
| 2 | Medium. The hero on the clock edge, rain-soaked. Nero beside him, panting. The hero looks at the dog, not at Bell. | HERO: "I am home." |
| (engine) | The minute hand jumps to twelve. Twelve strikes. Bell falls on the seventh. The rain stops on the twelfth. | — |
| 3 | Wide. The great clock face reads 12:00. Two small figures on the cornice, a man and a dog. Rings spread in the last of the rain. Far below, the storm swallows a tiny falling shape. | VO: "I didn't push him. Time did. He taught me that too." |

### 6.6 Epilogue (`epilogue`)

Panels 1, 3 and 4 are still panels. Panel 2 is a short **playable walk** in the tutorial street, with a still panel as a fallback when the street level is not loaded.

| # | SHOT | TEXT |
|---|---|---|
| 1 | Dawn. The storm breaks. Pages from the Board's ledgers fall from the Spire over the city like snow. A newsboy holds up a paper: *"THE CHOIR EXPOSED."* | VO: "By morning, the city could read its own sins. The rain had stopped. First time in weeks." |
| 2 (playable) | **The old-town street from the tutorial**, `street` level, dawn palette, `weather: 'none'`, no waves, no club music. The input is walk-only (no attacks). Nero follows at heel. As the hero passes each facade, its **residents switch their lights ON** (the reverse of the resident system). A ledger page drifts down at x 900. The club at the end is dark and boarded. The walk ends at x 2300. | VO (at x 400): "They had switched off their lights for every fight." VO (at x 1600): "Now they switched them on." |
| 3 | The Low Note, warm light. Mags, arm in a sling, puts a whisky on the bar and a bowl of water on the floor. Nero drinks. The hero's hand rests on the bar beside Elena's red scarf, folded. | MAGS: "On the house. Since there isn't one anymore." |
| 4 | The burned watch shop, boarded up. In the cracked window, one small new watch ticks. Its hands move past 3:17. | VO: "Time moves on. That's the only rule it ever had." |
| card | Black. Title: **ELIAS GRAVE**. Then the credits roll over the dry street at dawn, with Nero asleep in a doorway. | — |

---

## 7. Level data skeleton (`src/levels/skyscraper/level.js`)

```js
import { defineLevel } from '../../director/define.js';
import bell from '../../bosses/bell.js';
import { lys, kessel } from './understudies.js';           // mini-bosses: defineBoss, one phase each

export default defineLevel({
  id: 'skyscraper', title: 'The Spire', order: 8, palette: 'spire', music: 'spire_lobby',
  size: { W: 3800, H: 320, groundY: 280 },
  sections: [
    { id: 'lobby', x0: 0, x1: 680, indoor: true, weather: 'none', ambient: [0.55, 0.48, 0.38],
      camera: { minZoom: 0.45, maxZoom: 0.7, bounds: [0, 680] }, backdrop: [{ type: 'wall', set: 'marbleMirror' }] },
    { id: 'lift', x0: 720, x1: 1100, indoor: false, weather: 'storm', ambient: [0.35, 0.4, 0.55],
      camera: { minZoom: 0.6, maxZoom: 0.6, bounds: [720, 1100] },
      backdrop: [{ type: 'sky', set: 'storm' }, { type: 'city', set: 'valmoraNight', below: true },
                 { type: 'facade', set: 'spireGlass', scroll: { axis: 'y', floors: [1, 75], pxPerFloor: 64 } }] }, // [NEW] scroll
    { id: 'garden', x0: 1140, x1: 1860, indoor: false, weather: 'storm', ambient: [0.32, 0.4, 0.38],
      camera: { minZoom: 0.4, maxZoom: 0.65, bounds: [1140, 1860] },
      backdrop: [{ type: 'sky', set: 'stormHigh' }, { type: 'image', id: 'spire_crown_far' }, { type: 'city', set: 'valmoraNight', y: 300 }] },
    { id: 'penthouse', x0: 1900, x1: 2440, indoor: true, weather: 'none', ambient: [0.5, 0.52, 0.6],
      camera: { minZoom: 0.45, maxZoom: 0.7, bounds: [1900, 2440] },
      backdrop: [{ type: 'image', id: 'storm_windows' }, { type: 'abyss', set: 'valmora90', under: [2000, 2340] }] }, // [NEW] abyss
    { id: 'vestry', x0: 2480, x1: 2680, indoor: true, weather: 'none', ambient: [0.55, 0.42, 0.3], camera: { maxZoom: 0.75, bounds: [2480, 2680] } },
    { id: 'gears', x0: 2720, x1: 3080, indoor: true, weather: 'none', ambient: [0.6, 0.45, 0.28], camera: { maxZoom: 0.55, bounds: [2720, 3080] },
      backdrop: [{ type: 'image', id: 'dial_back' }] },
    { id: 'pendulum', x0: 3120, x1: 3440, indoor: true, weather: 'none', ambient: [0.45, 0.36, 0.26], camera: { maxZoom: 0.55, bounds: [3120, 3440] } },
    { id: 'face', x0: 3480, x1: 3800, indoor: false, weather: 'storm', ambient: [0.3, 0.32, 0.42], camera: { maxZoom: 0.5, bounds: [3480, 3800] },
      backdrop: [{ type: 'sky', set: 'stormPeak' }, { type: 'city', set: 'valmoraNight', below: true }, { type: 'image', id: 'clock_face', at: [3640, 150] }] },
  ],
  scene: { paint: [
    { type: 'revolvingDoor', x: 20 },
    { type: 'marbleHall', x0: 0, x1: 680, pillars: [160, 400, 560], mezzanine: { x0: 140, x1: 560, y: 196 } },
    { type: 'desk', x0: 280, x1: 340, top: 248 },
    { type: 'liftDoors', x: 640 },
    { type: 'glassCar', x0: 800, x1: 1000, floorY: 280, roofY: 176, hatch: [880, 920] },
    { type: 'pergola', x0: 1240, x1: 1360, y: 190 }, { type: 'pavilion', x: 1520 },
    { type: 'helideck', x0: 1690, x1: 1860 },
    { type: 'penthouse', x0: 1900, x1: 2440, mezzanine: { x0: 2260, x1: 2440, y: 190 }, glassFloor: [2000, 2340] },
    { type: 'vestryStair', x0: 2480, x1: 2680 }, { type: 'clock317', x: 2560, y: 200 },
    { type: 'crownGears', gears: [[2810, 170, 60], [2930, 140, 50], [3020, 180, 55]] }, { type: 'clock317', x: 2740, y: 120 },
    { type: 'pendulumShaft', x0: 3120, x1: 3440 },
    { type: 'cornice', x0: 3500, x1: 3780, y: 280 },
  ]},
  ground: [{ x0: 0, x1: 680 }, { x0: 800, x1: 1000 }, { x0: 1140, x1: 1640 }, { x0: 1690, x1: 1860 },
           { x0: 1900, x1: 2000 }, { x0: 2340, x1: 2440 }, { x0: 2480, x1: 2680 },
           { x0: 2720, x1: 3080 }, { x0: 3120, x1: 3440 }, { x0: 3500, x1: 3780 }],
  killY: 300,
  voids: [{ x0: 720, x1: 800 }, { x0: 1000, x1: 1100 }, { x0: 1640, x1: 1690 }, { x0: 2000, x1: 2340 }, { x0: 3780, x1: 3800 }], // [NEW] fall cam + ledge assist
  surfaces: [
    { id: 'mezz', x0: 140, x1: 560, y: 196, oneWay: true, lane: 'plat' },
    { id: 'carRoof', x0: 800, x1: 1000, y: 176, oneWay: true, lane: 'plat' },
    { id: 'pergola', x0: 1240, x1: 1360, y: 190, oneWay: true, lane: 'plat' },
    { id: 'gapBeam', x0: 1640, x1: 1690, y: 268, oneWay: true },
    { id: 'mull1', x0: 2108, x1: 2114, y: 280 }, { id: 'mull2', x0: 2226, x1: 2232, y: 280 },
    { id: 'phMezz', x0: 2260, x1: 2440, y: 190, oneWay: true, lane: 'plat' },
    { id: 'rail', x0: 2340, x1: 2370, y: 230, ledge: true },
    { id: 'balcL', x0: 3130, x1: 3200, y: 200, oneWay: true, lane: 'plat' },
    { id: 'balcR', x0: 3360, x1: 3430, y: 200, oneWay: true, lane: 'plat' },
    ...[['IX', 3530, 150], ['X', 3545, 95], ['XI', 3585, 55], ['I', 3695, 55], ['II', 3735, 95], ['III', 3750, 150],
        ['IV', 3735, 205], ['V', 3695, 245], ['VII', 3585, 245], ['VIII', 3545, 205]]
      .map(([id, x, y]) => ({ id: 'num' + id, x0: x - 15, x1: x + 15, y, oneWay: true, lane: 'wall' })),
  ],
  walls: [{ x: 460, y0: 0, y1: 280, id: 'lysL', off: true }, { x: 680, y0: 0, y1: 280, id: 'liftDoors' },
          { x: 798, y0: 180, y1: 280, id: 'carL', pane: 'carL' }, { x: 1002, y0: 180, y1: 280, id: 'carR', pane: 'carR' },
          { x: 1600, y0: 0, y1: 280, id: 'kesselL', off: true }, { x: 2430, y0: 0, y1: 280, id: 'vestryDoor' },
          { x: 3500, y0: 0, y1: 280, id: 'dialHole' }],
  stairs: [{ type: 'grand', x0: 100, x1: 140, flights: 1 }, { type: 'service', x0: 2500, x1: 2660, flights: 2 }],
  movers: [
    { id: 'twin', surface: { w: 200, y: 280 }, lane: 'back', path: [[900, 420, 0], [900, 280, 3]], mode: 'onTrigger', model: 'glassCar' },
    { id: 'gondola', surface: { w: 70, y: 250 }, path: [[1045, -40, 0], [1045, 250, 4]], mode: 'onTrigger', model: 'cradle' },
    ...[[2810, 170, 60, 9, 1], [2930, 140, 50, 7.5, -1], [3020, 180, 55, 9, 1]].flatMap(([cx, cy, r, T, dir], g) =>
      [0, 1, 2, 3].map(k => ({ id: `g${g}t${k}`, surface: { w: 26 }, mode: 'orbit',          // [NEW] orbit mode
        orbit: { cx, cy, r, period: T, dir, phase: k / 4 }, model: 'gearTooth' }))),
    { id: 'pendulum', mode: 'swing', swing: { pivot: [3280, -10], len: 250, amp: 34, period: { E: 4.2, N: 4.2, H: 3.8, W: 3.4 } },
      hazard: { shape: 'disc', r: 22, dmg: 30, hitsBoss: true }, light: { r: 90, rgb: [255, 190, 110] } },        // [NEW] swing mode
    { id: 'minuteHand', mode: 'rotate', rotate: { pivot: [3640, 150], len: 120, drive: 'crownClock' },
      surface: { sloped: true, walkMax: 30, slideMax: 50 } },                                                         // [NEW] sloped rotating surface
  ],
  panes: [
    ...[60, 160, 260, 360, 460, 560].map((x, i) => ({ id: 'mir' + i, x0: x, y0: 150, x1: x + 80, y1: 270, hp: 30, kind: 'mirror', depth: -30, onBreak: 'shards' })),
    { id: 'katanaCase', x0: 352, y0: 250, x1: 372, y1: 278, hp: 20, kind: 'window', depth: 6, onBreak: 'shards' },
    { id: 'axeCaseL', x0: 594, y0: 230, x1: 606, y1: 262, hp: 20, kind: 'window', depth: -24 },
    { id: 'carL', x0: 798, y0: 180, x1: 804, y1: 280, hp: 80, kind: 'window', depth: 0, onBreak: 'shards' },
    { id: 'carR', x0: 996, y0: 180, x1: 1002, y1: 280, hp: 80, kind: 'window', depth: 0, onBreak: 'shards' },
    { id: 'carBack', x0: 800, y0: 180, x1: 1000, y1: 280, hp: 30, kind: 'window', depth: -20, onBreak: 'shards' },
    { id: 'axeCaseCar', x0: 984, y0: 230, x1: 994, y1: 260, hp: 15, kind: 'window', depth: -18 },
    ...[1560, 1574, 1588].map((x, i) => ({ id: 'wind' + i, x0: x, y0: 220, x1: x + 12, y1: 280, hp: 40, kind: 'window', depth: 10, onBreak: 'shards' })),
    { id: 'gf1', x0: 2000, y0: 278, x1: 2108, y1: 284, hp: 100, kind: 'floor', stages: [35, 70, 100], onBreak: 'void' },   // [NEW] kind 'floor'
    { id: 'gf2', x0: 2114, y0: 278, x1: 2226, y1: 284, hp: 100, kind: 'floor', stages: [35, 70, 100], onBreak: 'void' },
    { id: 'gf3', x0: 2232, y0: 278, x1: 2340, y1: 284, hp: 100, kind: 'floor', stages: [35, 70, 100], onBreak: 'void' },
    { id: 'dial', x0: 3436, y0: 40, x1: 3444, y1: 280, hp: 9999, kind: 'window', scripted: true, onBreak: 'shards' },
  ],
  lights: [
    { x: 120, y: 60, r: 120, rgb: [255, 214, 150] }, { x: 330, y: 60, r: 140, rgb: [255, 214, 150], id: 'chandelier' },
    { x: 540, y: 60, r: 120, rgb: [255, 214, 150] }, { x: 900, y: 182, r: 110, rgb: [210, 230, 255], flicker: 0.05 },
    { x: 1300, y: 200, r: 70, rgb: [255, 170, 80] }, { x: 1520, y: 220, r: 70, rgb: [255, 170, 80] },
    { x: 1960, y: 240, r: 80, rgb: [255, 220, 150] }, { x: 2580, y: 210, r: 90, rgb: [255, 180, 110] },
    { x: 2900, y: 120, r: 200, rgb: [255, 170, 80] }, { x: 3640, y: 150, r: 180, rgb: [255, 200, 120] },
    { x: 3640, y: 10, r: 40, rgb: [255, 40, 40], flicker: 0.5 },
  ],
  props: [['stanchion', 120, 280], ['trolley', 220, 280], ['tray', 260, 248], ['chandelier', 330, 60],
          ['planter', 1220, 280], ['planter', 1300, 280], ['planter', 1470, 280], ['lantern', 1260, 280], ['lantern', 1440, 280],
          ['piano', 2060, 280], ['barCart', 1960, 280],
          ['ledgerBox', 3150, 200], ['ledgerBox', 3170, 200], ['ledgerBox', 3380, 200], ['ledgerBox', 3400, 200]],
  pickups: [{ w: 'shotgun', held: true, ammo: 4 }, { w: 'katana', x: 362, stand: 'case' }, { w: 'axe', x: 600, stand: 'case' },
            { w: 'axe', x: 990, stand: 'case' }, { w: 'machete', x: 1380, stand: 'bench' }, { w: 'mg', x: 1940, stand: 'bar', once: 'checkpoint' },
            { w: 'katana', x: 2600, stand: 'rack', skin: 'choirKatana' },
            { kind: 'bandage', x: 470, n: { E: 3, N: 2, H: 2, W: 1 } }, { kind: 'bandage', x: 810 },
            { kind: 'bandage', x: 1520, n: 2 }, { kind: 'bandage', x: 2620, n: { E: 3, N: 2, H: 2, W: 1 } },
            { kind: 'ammo', x: 300 }, { kind: 'ammo', x: 500 }, { kind: 'ammo', x: 1930 }, { kind: 'ammo', x: 2640 }],
  water: [{ x0: 1400, x1: 1480, depth: 12, slow: 0.4 }],
  wind: { sections: ['lift', 'garden', 'face'], dir: 1,                                                             // [NEW] wind gusts
          force: { lift: [40, 50, 60, 70], garden: [50, 60, 70, 80], face: [60, 70, 80, 95] }, every: [6, 9], telegraph: 1.0 },
  npcs: [{ id: 'nero', kind: 'dog', at: 60, follow: 'hero', until: 'liftDoors', assist: 'hold' }],                  // [NEW] scripted dog
  start: { x: 60, section: 'lobby', cutscene: 'spire_intro', checkpoint: true },
  objectives: [{ id: 'climb', text: 'Climb the Spire.' }, { id: 'bell', text: 'Find the Conductor.' }],
  waves: {
    l1:  { at: [140, 200, 260, 300], roles: ['chorister', 'chorister', 'stiletto', 'chorister'], count: { E: 2, N: 3, H: 5, W: 5 }, from: 'present' },
    l2a: { at: [140, 200, 420, 300], roles: ['cane', 'stiletto', 'soloist@mezz', 'cane', 'stiletto'], count: { E: 2, N: 4, H: 5, W: 6 }, from: 'nearestDoor' },
    l2b: { at: [380, 460, 520], roles: ['forker@mezz', 'chorister', 'chorister+cantor', 'forker@mezz'], count: { E: 2, N: 3, H: 4, W: 5 }, from: 'nearestDoor' },
    e1:  { at: [830, 880, 940, 970], roles: ['chorister', 'chorister', 'stiletto', 'chorister'], count: { E: 2, N: 3, H: 3, W: 4 }, from: 'present' },
    e2:  { at: [900, 900, 900, 900], roles: ['cane', 'stiletto', 'soloist@twin', 'cane'], count: { E: 2, N: 3, H: 4, W: 4 }, from: 'mover:twin' },
    e3:  { at: [820, 900, 980, 860, 940], roles: ['sabreur', 'chorister', 'sabreur', 'forker@carRoof', 'chorister'], count: { E: 3, N: 4, H: 6, W: 7 }, from: 'rope' },
    g1:  { at: [1200, 1260, 1300, 1340], roles: ['chorister', 'chorister', 'cane', 'soloist@pergola'], count: { E: 4, N: 4, H: 6, W: 7 }, from: 'offscreen' },
    g2:  { at: [1440, 1500, 1560], roles: ['sabreur', 'bass', 'forker@planter'], count: { E: 3, N: 4, H: 5, W: 6 }, from: 'offscreen' },
    p1:  { at: [2000, 2100, 2200, 2300], roles: ['chorister', 'cane', 'stiletto', 'forker@phMezz'], count: { E: 4, N: 5, H: 7, W: 8 }, from: 'nearestDoor' },
    p2:  { at: [2300, 2400], roles: ['usher@phMezz', 'soloist@phMezz'], count: { E: 1, N: 2, H: 3, W: 4 }, from: 'present' },
  },
  triggers: [
    { when: { heroX: '>=300' }, do: { spawnWave: 'l2a' } },
    { when: [{ killed: 'l2a' }, { heroX: '>=400' }], any: true, do: { spawnWave: 'l2b' } },
    { when: { killed: 'l2b', heroX: '>=470' }, do: [{ wall: { lysL: 'on' } }, { miniBoss: lys }, { dialog: 'lys_intro' }] },
    { when: { killed: 'lys', heroX: '>=620' }, do: [{ timeline: 'nero_stay' }, { transition: { to: 'lift', fade: true } }] },
    { when: { inSection: 'lift' }, do: [{ checkpoint: 'lift' }, { lift: { from: 1, to: 30, holdWhile: 'e1' } }] },  // [NEW] lift driver
    { when: { liftFloor: 30 }, do: [{ mover: { twin: 'go' } }, { spawnWave: 'e2' }, { lift: { to: 55, holdWhile: 'e2' } }] },
    { when: { liftFloor: 55 }, do: [{ spawnWave: 'e3' }, { lift: { to: 72, holdWhile: 'e3' } }] },
    { when: { liftFloor: 72 }, do: [{ timeline: 'cable_cut' }, { mover: { gondola: 'go' } },
        { slowmo: { scale: 0.3, t: 2.5, prompt: 'jump', target: 'gondola', fail: { E: 'brake25', N: 'brake25', H: 'brake40', W: 'death' } } }] },
    { when: { slowmo: 'success', onMover: 'gondola' }, do: { transition: { to: 'garden', fade: true } } },
    { when: { inSection: 'garden' }, do: [{ checkpoint: 'garden' }, { music: 'spire_garden' }] },
    { when: { heroX: '>=1180' }, do: { sfx: 'nero_bark_far', toast: '...a bark, far below.' }, once: true },
    { when: { heroX: '>=1200' }, do: { spawnWave: 'g1' } },
    { when: { heroX: '>=1420' }, do: { spawnWave: 'g2' } },
    { when: { killed: 'g2', heroX: '>=1620' }, do: [{ wall: { kesselL: 'on' } }, { miniBoss: kessel }, { dialog: 'kessel_intro' }] },
    { when: { killed: 'kessel', heroX: '>=1840' }, do: { transition: { to: 'penthouse', fade: true } } },
    { when: { inSection: 'penthouse' }, do: [{ checkpoint: 'penthouse' }, { music: 'spire_penthouse' }, { spawnWave: 'p1' }] },
    { when: { killed: 'p1', heroX: '>=2150' }, do: [{ spawnWave: 'p2' }, { script: 'mgSweep', panes: ['gf2', 'gf3'] },
        { slowmo: { scale: 0.3, t: 2.2, prompt: 'jump', target: 'rail', grab: { E: 40, N: 32, H: 24, W: 18 }, fail: 'voidOrSecondChance' } }] },
    { when: { killed: 'p2' }, do: { wall: { vestryDoor: 'open' } } },
    { when: { inSection: 'vestry' }, do: [{ checkpoint: 'vestry' }, { music: 'spire_vestry' }, { timeline: 'scarf', skippable: true }] },
    { when: { heroX: '>=2660' }, do: [{ transition: { to: 'gears', fade: true } }, { boss: 'start' }] },
    { when: { bossDefeated: 'bell' }, do: [{ timeline: 'bell_end' }, { cutscene: 'spire_end' }, { cutscene: 'epilogue' }] },
  ],
  boss: { module: bell, arena: { section: 'gears', x0: 2730, x1: 3070, doors: [2730] },
          arenas: { pendulum: { x0: 3130, x1: 3430 }, face: { x0: 3500, x1: 3780 } },                                 // [NEW] arena per phase
          intro: 'bell_intro', crew: { roles: ['chorister', 'cane', 'stiletto'], every: 14, max: 4 } },
  cutscenes: { intro: 'spire_intro', outro: 'spire_end', epilogue: 'epilogue' },
  dialog: { /* lys_intro, kessel_intro, bell_intro, bell_barks: see section 6 */ },
  assets: ['panel:spire_*', 'panel:epilogue_*', 'portrait:bell_*', 'portrait:elias_*', 'portrait:lys_*', 'portrait:kessel_*',
           'music:spire_*', 'music:boss_bell_*', 'music:ending_*', 'sfx:spire_*', 'model:bell', 'model:nero', 'model:glassCar', 'model:gear'],
});
```

---

## 8. Engine features needed (not in the game today)

All features are sim-side and read by both renderers. The 3D view gets models and lights only, never its own rules (2D/3D sync rule). "Shared" names other levels that use the feature.

| # | Feature | One-line spec | Shared with |
|---|---|---|---|
| 1 | **Elevator mover arena (lift driver)** | A section action `lift: {from, to, holdWhile}` that drives a floor counter (HUD), scrolls a backdrop layer on y at `pxPerFloor`, pauses while a wave lives, and exposes `liftFloor` as a trigger. | Scroll part: L7 train (x scroll), L2 passing trains |
| 2 | **Backdrop vertical scroll and "abyss" layer** | `backdrop.scroll: {axis, v}` plus a `type:'abyss'` layer drawn under groundY inside a glass-floor range (city far below, parallax 0.05). | L4 tank floor view, L7 viaduct |
| 3 | **Glass floor that cracks in stages** | `panes kind:'floor'` attached to a surface: hp with `stages` thresholds (crack decal, creak sfx, 10% slow at stage 2); damage from landings, bodies, bullets and stuck projectiles; at 100 the surface is removed and becomes a void; `glass:break` with `stage`. | L4 Kalt (staged cracks), L6 palm-house roof |
| 4 | **Void kill zone** | `voids: [{x0, x1}]` and per-section killY: a fall cam (0.6 s follow, then a tiny ragdoll into the backdrop), goons die as kills (`kill` with `zone:'void'`), a hero fall leads to a checkpoint restart, plus a ledge-grab assist width per difficulty. | L4 open tank, L7 viaduct, L6 roof |
| 5 | **Slow-motion prompt** | Trigger action `slowmo: {scale, t, prompt, target, grab, fail}`: sets timeScale, shows a marker and an input word, checks success (hero on target mover or ledge), runs the fail branch. | Every level's slow-motion set piece (bible rule) |
| 6 | **Rotating gear platforms** | `movers mode:'orbit'` with `{cx, cy, r, period, dir, phase}`: the platform stays level and carries riders; a mesh-point crush zone between two orbits (dmg + pin). | L1 tuna conveyor (closed loop), L3 roulette floor |
| 7 | **Pendulum hazard** | `movers mode:'swing'` with `{pivot, len, amp, period}`; a disc hazard on the bob that hits hero, goons and boss (`hitsBoss`); a light attached; a runtime period multiplier for `pendulumFast`; `ride(moverId)` attach for the boss. | L1 swinging hooks, L3 chandeliers |
| 8 | **Sloped rotating surface (minute hand)** | `mode:'rotate'` with a sloped surface: actors stand below `walkMax`°, slide between `walkMax` and `slideMax`, fall above; the angle comes from the clock drive. | L7 tilting decoupled cars |
| 9 | **Wind gusts** | `wind: {sections, dir, force[diff], every, telegraph}`: a horizontal force on actors, ragdolls and thrown objects; rain angle and whistle telegraph; camera lean. | L4 sea wall, L6 snow park, L7 train roof |
| 10 | **Timed bell shockwave (crown clock)** | Gimmick `crownClock`: a minute hand driven by Q seconds per quarter; at the mark it emits `boss:telegraph {move:'peal'}`, then N quakes `{v:165, life:1.25, dmg:16}` from the bell x; optional radial push; it knocks riders off movers; "from the top" reset; `windForward` for phase shifts; `sync:'chime'` for boss moves. | L7 metronome timing (same beat clock) |
| 11 | **Boss arena per phase** | `phases[].arena` plus `boss.arenas`: the phase shift runs an exit script, a section transition and new arena walls, keeping boss HP and state. | Any multi-room boss (L4 catwalks, L2 handcar) |
| 12 | **Scripted dog NPC (Nero)** | `npcs: [{kind:'dog', follow, until, assist}]`; actions `hold` (pin one goon 4 s, 18 s cooldown) and `bite` (boss stun, scripted); Nero is never damaged. | L2, L5, L6, L7 ("Nero, hold!" from the bible) |
| 13 | **`whip` primitive** | Long-reach chain attack: reach, arc (low/high), a wind-back recover; used by Bell's flail and Kessel's chain. | L2 Switch chain whip |
| 14 | **`readCounter` primitive (The Lesson)** | The boss brain records the hero's last attack ids; N repeats lead to a parry and a riposte with a telegraph. | L7 Lenz (the rhythm reader) |
| 15 | **Bullet deflect for bosses** | `stats.deflect` chance turns pistol and MG rounds aside, with a spark and a ricochet into panes. | L7 Lenz sabre |
| 16 | **Shotgun goon (Bass) and MG goon (Usher)** | New goon roles: a spread hitscan and a burst with a laser-sweep telegraph; both use the existing guns code. | MG: L7 Ushers; shotgun: L1, L6 |
| 17 | **Rope spawn** | Wave `from:'rope'`: the goon descends on a line from above the camera to a target surface, with 0.8 s landing lag. | L6 riot police, L5 roof |
| 18 | **Spawn from a mover** | Wave `from:'mover:id'` plus a lane hop through a broken pane (back lane to fight lane). | L7 parallel train |
| 19 | **Shootable hanging prop (chandelier)** | A prop with a chain hp; on break it falls (a quake + a 50 px damage circle), then leaves a slip patch. | L3 casino, L6 ballroom |
| 20 | **Choir hum aura (Cantor)** | While a Cantor lives and 3+ allies live: +10% speed, 0.8x cooldown, a chant audio stem. | L3 pit boss, L6 sergeant (re-skin) |
| 21 | **Scripted defeat timeline** | `defeat: {type:'scripted', timeline}`: the boss survives at 1 hp into an in-engine timeline (hang, twelve strikes, fall, weather stop). | L2 Switch rescue, L4 Kalt drown |
| 22 | **Epilogue walk mode** | Load `street` with `{weather:'none', palette:'dawn', waves:false, input:'walkOnly'}`, and residents switch lights ON in order. | Credits / New Game+ menu backdrop |
| 23 | **Weather stop** | `weather.goal = 0` with a fade time; the first "no rain" state in the game (ambient and music stem change). | Epilogue |

---

## 9. Art and audio asset list

### 9.1 Comic panels (ComfyUI; 2D panel art shared by both views)
- `panel:spire_intro_1..4` (opening).
- `panel:spire_end_1..3` (ending).
- `panel:epilogue_1`, `panel:epilogue_2` (still fallback for the walk), `panel:epilogue_3`, `panel:epilogue_4`.
- `panel:title_card` (ELIAS GRAVE on black).

### 9.2 Portraits (moods)
- **Bell:** `warm`, `proud`, `calm`, `regretful`, `cold`, `amused`, `stern` (Lesson), `hurt` (Nero's bite), `hanging` (ending, used for the dialog line in panel 1 if the panel art is not ready).
- **Elias:** `cold`, `quiet`, `grieving`, `furious` (most exist from earlier levels; add `grieving`).
- **Lys Moreau:** `amused`, `breathless`.
- **Kessel:** `grinning`, `fading`.

### 9.3 Sprites and models (2D sprite + 3D model for each)
- **Bell:** walk, step, thrust, cut, feint, pommel, flail sweep, escapement drop, reel throw, winding spin, swing on rod, taunt (loupe, pipe), stunned (bitten), hanging, falling.
- **Choir Proper skin:** shared tux plus accessories (gloves, cane, sabre, forks, sawn-off, MG, red pocket square). Lys and Kessel skins.
- **Nero:** sprint, leap-bite, hold, sit, drink (the dog exists; add leap-bite and hold).
- **Props and set:** glass car, twin car, gondola cradle, gear tooth, three gear wheels, pendulum (rod + bob with lamp), minute hand, hour hand, clock face (lit glass, numerals), the dial back (reversed numerals), the cornice, revolving door, marble hall, mirrors, chandelier (whole, falling, wreck), glass floor (4 crack stages), grand piano, bar cart, planters, stone lanterns, pergola, koi pool, windbreak, helideck, ledger box (whole, burst, paper particles), the 3:17 clock, the Choir katana skin, and the soup bowl and pipe.
- **Backdrops:** storm sky (3 heights), Valmora at night from 75 and 90 floors, the facade scroll strip, the abyss under the glass floor, the crown seen from the garden, and the dawn street palette.

### 9.4 Music cues
| Cue | Use | Notes |
|---|---|---|
| `spire_lobby` "Black Tie" | Beats 1-3 | Noir jazz in a tuxedo; the Choir hum stem rises when a Cantor lives. |
| `spire_lift` "Ninety Floors" | Beats 5-8 | Shepard-tone strings that rise with the floor counter; drops out for the snap. |
| `spire_garden` "High Wind" | Beats 9-10 | Timpani and wind; the gust whistle is in key. |
| `spire_penthouse` "Glass" | Beats 11-12 | Sparse piano that detunes per floor-tile stage; silence for the slow-motion dive. |
| `spire_vestry` "Elena" | Beat 13 | Elena's theme: upright bass and piano. |
| `boss_bell_1/2/3` "The Last Movement" | Boss | One piece in three movements. P1 is a fugue on Bell's motif with the gear ticks as percussion. P2 follows the pendulum period. P3 is full orchestra, choir and storm. The quarter peal is in key. Stem cut on the Nero bite. |
| `ending_twelve` "Twelve" | Ending | No percussion; the twelve strikes are the beat; strings resolve on the twelfth. |
| `epilogue_morning` "No Rain" | Epilogue + credits | Acoustic guitar and a ticking watch; the first cue without rain ambience. |

### 9.5 Sfx
- **Lobby:** revolving door, marble footsteps, mirror shatter (3 variants), chandelier chain snap, chandelier crash and tinkle, lift chime, lift doors.
- **Lift:** car hum, floor-seam thump, twin car brake scream, rope zip, landing on the roof, the cable axe bang, the cable whip, the car free-fall, the cradle winch.
- **Garden:** gust whistle (telegraph), gust push, koi splash, planter scrape, windbreak shatter, Kessel's hook throw and chain rattle.
- **Penthouse:** guests' screams, glass creak (stage 2), crack (stage 1), shatter-through (stage 3), MG sweep, the piano's last chord as it falls, the distant city noise from below.
- **Crown:** gear grind, tooth clunk, crush, pendulum whoosh (Doppler), pendulum hit, ledger box burst and paper flutter, winding lever, the Westminster quarter notes, the peal shockwave boom, "From the top" ratchet, clutch clank and steam, dial glass smash.
- **Bell:** cane draw (click and shing), thrust, feint glint chime, flail tick-tock, watch impact, chain wrap, spin whir (rising), bullet deflect ping, loupe tap.
- **Face:** storm bed, lightning crack, beacon hum, minute-hand clunk, the twelve hour strikes (one deep bell, 12 takes with slight variation).
- **Nero:** far bark (muffled), closer bark, claws on marble and metal, hatch burst, leap snarl, bite and growl.
- **Epilogue:** dawn birds, dripping gutters, light switches clicking on (resident windows), newsboy call, Low Note glass on bar, ticking watch.
- **Voice:** Bell's barks (section 6.4), Lys and Kessel barks, Elias ("Last song.", "Stay.", "Hold.", "I am home."), VO lines for all panels.

---

## 10. As built (first pass, 2026-10-10)

Code: `src/levels/skyscraper/` (`data.js` map and numbers, `paint.js` the static layer, `draw.js` the per-frame painters, `run.js`
the core run, `set.js` the climb's set pieces, `crown.js` the Conductor and the ending, `three.js` the 3D blocks, `index.js`),
`src/bosses/bell.js` (the Conductor), `src/bosses/understudies.js` (Lys Moreau, Bruno Kessel). The game calls the run's hooks (`LVH`
in `src/legacy.js`; `isSpire()`). Chapter 8 in the menu: locked until `progress.ch8` ("Beat Lenz on the last train"). Bell's defeat
unlocks `done`, which opens every chapter (`unlock('done')` sets `ch1`..`ch8`).

### 10.1 The folded map (world 2800 x 320)

The plan's 3800 px climb is folded into the engine's strip. Walls part the sections (the camera stays in the section the hero is in);
each join is a fade.

| Section | x | What is there |
|---|---|---|
| `lobby` | 0-520 | Revolving door x 14, the grand stair x 96-180 up to the mezzanine (y 196, x 180-396), the reception desk x 226-266 (top y 250), three back-wall mirrors, the chandelier x 300 (y 172), the katana case x 330, Lys's arena x 366-514 with her four mirrors, the axe case x 512, the lift doors x 506 |
| `lift` | 540-820 | The glass car x 600-760 (side panes block until broken, the back pane, the roof y 210, the hatch), the drop outside both sides, the window-cleaning cradle x 774-816 (y 264) at the snap, the axe case x 748 |
| `garden` | 840-1340 | Nero's stairwell door x 860, the pergola (y 214), three planters (top y 254), the koi pool x 1100-1150, the gardener's axe x 1046, the pavilion x 1130, Kessel's arena x 1190-1318: the gap x 1236-1268 with a beam flush with the deck, the helideck, the windbreak x 1322 and the drop behind it, the service lift x 1296 |
| `penthouse` | 1360-1700 | The bar x 1366-1402 (the machine gun, champagne), the grand piano x 1450, the glass floor gf1 1420-1494 / gf2 1500-1574 / gf3 1580-1654 (steel mullions between), the mezzanine (MG nest) y 214 x 1612-1700, the stair rail x 1654-1668 (y 240), the vestry door x 1696 |
| `vestry` | 1720-1840 | The 3:17 clock, the Choir katana on its rack x 1772, bandages, the soup and the smoking pipe x 1800, the hatch x 1832 |
| `gears` | 1860-2140 | Boss phase 1: three gears (4 level tooth platforms each), two mesh points, the quarter bell (2000, 40), a 3:17 clock, the hatch the crew uses x 1872, the ladder x 2130 |
| `pendulum` | 2160-2424 | Boss phase 2: the pendulum (pivot 2290, rod 250), two balconies with ledger boxes, the bell (2290, 30), the back of the dial x 2420 |
| `face` (the game's "club") | 2436-2800 | Boss phase 3, outside: the cornice 2450-2720, the drop beyond, the face (centre 2730, 200; r 80) with six numeral ledges (IX, VIII, VII, X, XI, I), the minute hand (a sloped ledge), the bell above, the red beacon, Nero's hatch x 2470 |

Travel: lobby → (Lys) → ↑ the lift doors ("Stay.") → the lift (floors 1-72) → the snap: the jump to the cradle → the garden →
(Kessel) → ↑ the service lift → the penthouse → the volley and the dive → ↑ the stair door → the vestry → ↑ the hatch → the gear room
→ ↑ the ladder → the pendulum hall → through the broken dial → the face.

Checkpoints: `start` (the lobby), `sp:lift`, `sp:garden`, `sp:pent`, `sp:vestry`, `sp:gears`, `sp:pend`, `boss` (the face).
Bell's health per checkpoint: full, 66 %, 33 %.

### 10.2 The new verbs, on the existing keys

| Verb | Keys | Notes |
|---|---|---|
| Use the lift doors, the service lift, a stair door, the hatch, the ladder | ↑ by it | A 0.7 s fade |
| The cable snap | Jump (or roll) → onto the cradle | Slow motion 2.5 s real; a 2.2 s (game) window; fail: the brake (−25/−25/−40) and the cradle meets the car; Wicked: lethal |
| The dive to the rail | Jump or roll → | The tile under him goes at the end of the sweep (0.8 s game grace); the rail grabs him within 40/32/24/18 px; fail on Easy and Medium: a mullion catches him once (−20) |
| FINISH | A heavy attack on Bell (hold Q or W); any attack on Easy; a shotgun blast up close | Slow motion; 1.2/1.0/0.8 s real (Easy: until he is hit) |
| Push the piano | Walk into it | 32 px/s; it flattens goons (40) and loads the glass under it as it rolls |
| Squat or roll under the pendulum | ↓ or Space | The bob hits anyone standing in its path |

No new key, no sign over anyone. Tells: the bell's hammer lifting and the Westminster quarter before a peal (and the HUD clock),
a floor mark under the Escapement Drop and the Gear Ride's landing, the chain line and ring for the sweep, the reel and the spin,
a white glint at his hand in every wind-up, the laser sweep before an Usher fires, the rain's slant and a whistle before a gust,
the creak of a crazed glass tile, the Sabreur's metronome tick, the Cane's parry spark. Toasts explain each mechanic once.

### 10.3 The Choir Proper (data: `CHOIR` in `data.js`)

Every one: black tie, white gloves, +25 % hp, +20 % poise.

| Variant | Base | What it does | The answer |
|---|---|---|---|
| Chorister | brawler | Close harmony: the next one near you strikes 0.4 s after the first | Break the pair: fight them from one side |
| Stiletto | knife | Lunges from 90 px; backs off 40 px after a hit | Wait for the back-off, then step in |
| Cane | pipe (cane) | Turns aside a heavy blow (15/25/35/45 %), then a 1.0 s cane-spin riposte | Light strings |
| Sabreur | machete | A slash-slash-lunge string on a metronome tick; a missed lunge leaves him open 1.0 s | Dodge the third beat |
| Forker | thrower | Tuning forks that ring; a miss sticks 4 s and does 6 to a glass tile; drops 3 knives | Close in; he comes down after 3 throws or 8 s |
| Soloist | pistol | 2-round bursts, 1.4 s apart, from high ground | Rush him in the reload |
| Bass | pistol (sawn-off) | 1.2 s tell (he breaks it open), 5 pellets at 90 px; breaks panes; drops his shotgun | Keep out of 90 px |
| Usher | pistol (machine gun) | A 1.5 s laser sweep, then 8 rounds; stays high; drops his machine gun | Out of line, or up to him |
| Cantor | any melee + a red pocket square | With 3+ Choir in the room: they hum (+10 % speed, 0.8x rests) | Kill him first |
| Rappeller | spawn mode | Drops on a rope from above; 0.8 s of landing lag | Punish the landing |

Caps: ranged 2/2/3/3 alive (an Usher counts 2), one Bass and one Usher at a time. Ledge goons come down (a ranged one after 3 shots or
8 s, a melee one after 1.5 s, anyone when hit), on the hero's side unless a wall is there. Reinforcements on Hard and Wicked (`REINF`).

### 10.4 Mini-bosses and the boss

- **Lys Moreau** (`LYS`): cane strings, card fans (3/3/4/5). Four mirror decoys throw fans (no damage on Easy, half above); a blow or a
  broken mirror shatters a decoy; the decoys come back every 9 s from whole mirrors. The real Lys has no reflection (every fighter in
  front of a lobby mirror shows in it; she never does). Stilettos every 12 s on Hard and Wicked (max 2).
- **Bruno Kessel** (`KESSEL`): the hook (110 px: pulled 80 px toward him, then a heavy chop; a miss sticks 2.0/1.4/1.4/1.0 s), the
  chain whip (90 px, low: jump it), chops. A pull that ends over the gap drops the hero. Canes every 14 s on Hard and Wicked (max 2).
- **Augustin Bell** (`BELL`): every move in 5.3 is in (`bellThink`/`bellSpecial`): cane strings with the feint, the Pendulum Sweep, the
  Escapement Drop (1.3 s stuck), the Reel, the Winding (spin + the watch thrown), On the Bell (lunges with the peal: land behind him
  for 1.2 s), the Lesson (N = 4/3/3/2 repeats of one attack family: parried, a riposte, "Left guard, boy."), the Gear Ride, the
  Swing (he rides the bob), Unpinned (the pendulum 25 % faster for 8 s), the Taunt. Bullets turned aside 40/60/75/90 %; a shotgun up
  close always lands and staggers him. The crown clock: Q = 60/50/40/32 s a quarter, rings 1/2/3 (+1 Wicked), "Again. From the top."
  with a bandage on Easy and Medium (max 2 a phase), the wind forward under the line. Crew in phase 1 only (Chorister, Cane,
  Stiletto; every 14 s, 1/1/2/2 alive, 4 in all); second wind after 1/2/2 knock-outs (none on Wicked).
- The phase shifts are walks, not cutscenes: he climbs the ladder (follow him: ↑), he smashes the dial and steps out (follow him →).
  Phases 1 and 2 use the mini-boss bar (big); phase 3 is the game's boss (`enc.boss`) in the club.
- **The Last Movement** (15 %, Easy 20 %): his next Winding opens the hatch; Nero runs in and bites the flail arm (3 s stun), slow
  motion, FINISH. A miss: Last Breath (health 1; the next heavy hit, blast or knockdown ends it). The finisher text follows the weapon
  (katana, axe, gun, unarmed); a white flash and a hit-stop are the freeze frame.

### 10.5 The ending (5.8)

The finisher kills Bell through the engine (`killEnemy`: the unlock, the boss-defeated flow), then his body is taken out and the run
draws him (`S.hang`) flying back and catching the minute hand at :59. `LVH.endTick` runs the timeline: Elias walks to the edge and Nero
sits by him; `spire_end` (panels 1-2); the hand clunks to twelve; twelve strikes 1.2 s apart (a slipped finger on 1, the watch falls on
4, he falls on 7; the camera holds; on 12 the rain stops and ledger pages fall); `spire_midnight` (panel 3); `epilogue` (panels 1-4
and the title card). Then the final card: this run's results and grade (`ch9`), and a whole-story table from `eliasgrave.best`
(every chapter's best grade and score, the total). Enter: the credits (short and plain, 28 s, Enter/Escape/click ends them), then the
title. Esc or Enter during the timeline jumps to the epilogue.

### 10.6 What was cut or folded

- The lift's vertical scroll is a painted illusion: the facade strips and the floor seams scroll past a fixed car; the twin car rises
  beside it. The twin car's Soloist does not stay behind to shoot through the glass; its crew cross in pairs with a hop.
- The ledge-grab assist for drops is a stop at the edge for a walk; a body knocked into a drop: Easy and Medium catch the edge (−15/−20),
  Hard and Wicked restart at the checkpoint. Goons knocked in fall as small tumbling figures (a kill).
- Wind pushes everyone toward +x with a 1 s warning (the whistle, the rain's slant); the camera does not lean.
- The minute hand is a ledge whose height follows the hero along it (up to 30° walkable, 30-50° sliding to the pivot, then gone). Bell
  does not stand on it.
- Kessel's whip and the pull are his own specials (not a shared `whip` primitive); Bell's moves are written out in `bell.js` (no
  `defineBoss` framework exists).
- Choir elites do not block or counter at the next difficulty's rate (the engine's block rules are shared).
- The epilogue's playable dawn walk in the street is not built: the `epilogue` panels (with `panel:epilogue_2`) stand in.
- The guests are drawn figures (no crowd system); they flee to the service door at the first blow or shot.
- The hero has no machete: an axe lies on the gardener's bench instead.
- The ledger boxes are crates; the pendulum bursts them into pages.

### 10.7 Asset names used

Panels: `panel:spire_intro_1..4`, `panel:spire_end_1..3`, `panel:epilogue_1..4`, `panel:title_card` (all from section 9.1).
Portraits: `portrait:elias_cold|grieving|furious`, `portrait:lys_amused`, `portrait:kessel_grinning`,
`portrait:bell_warm|proud|regretful|cold`. Cutscene scripts: `spire_intro`, `lys_intro`, `kessel_intro`, `bell_intro`, `spire_end`,
`spire_midnight` (new: panel 3 on its own, after the twelve strikes), `epilogue`. Voice ids are in the scripts (none exist yet).
Music cues (`src/audio/manifest.js`, stand-ins until files exist): `spire_lobby`, `spire_lys`, `spire_lift`, `spire_garden`,
`spire_kessel`, `spire_penthouse`, `spire_vestry`, `boss_bell_1..3`, `ending_twelve`, `epilogue_morning`.
Missing audio: every Spire cue above; the hour strike, the Westminster quarter, the gear grind, the cable snap and car fall, the gust
whistle, the glass floor's stages (existing procedural sfx stand in: `bell_ting` at pitches, `ground_slam`, `chain_snap`,
`dodge_whoosh`, `glass_crack`, `glass_creak`, `glass_burst_large`).

### 10.8 Test hooks (`?manual`)

`window.__spire`: `chapter()`, `start()`, `skip(where)` with where = `lys`, `lift`, `snap`, `garden`, `kessel`, `pent`, `sweep`,
`vestry`, `gears`, `pend`, `face`, `last` (the face at 14 %), `toBoss()`, `peek()` (the level's state: waves, panes, tiles, the lift, the
clock, Bell, the ending), `tp(x)`, `kill(n)`, `hurtBoss(n)`, `hurtMini(n)`, `hurtHero(n)`, `heal()`, `setDiff(i)`, `view3d(on)`,
`zoom(z)`, `equip(w)`, `retry()`, `unlock(id)`, `progress`, `SR` (the run), `ENG`.

### 10.9 Shared code touched

`src/legacy.js`: the import, `isSpire()` in `ownWorld()`/`L3D()`, `LOOK_X` (the Choir looks), the `loadLevel` branch, `startChapter8()`,
the Chapter 8 menu item, the `done` unlock (and `unlock('done')` opening every chapter), the results card's Enter (`LVH.next`: the
credits), `window.__spire`; `isSpire()` added to the street-sign and club-floor guards, the club crowd's toss, the dog's draw in the club
(2D and 3D); two generic hooks: `LVH.camZoom` and `LVH.camAim` (a level's own camera shot); `ENG.dropWeapon`, `ENG.quitToTitle`.
`src/feedback/results.js`: `CHAPTERS.ch9`. `src/audio/manifest.js`: the music cues.
