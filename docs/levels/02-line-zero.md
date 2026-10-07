# Level 2: "Line Zero" (level plan)

Level id `metro` (`src/levels/metro/`), order 2. Boss module `src/bosses/switch.js`. Mini-boss module `src/bosses/tinder.js`.
Source of truth for story: `docs/story-bible.md` (Level 2, Switch Varga). Vocabulary: `docs/architecture.md` sections 3 and 4.

Difficulty shorthand in this file: **E / M / H / W** = Easy / Medium / Hard / Wicked (`A` = 1 / 2 / 4 / 8, attack tokens 2 / 3 / 4 / 6; on Wicked a K.O. ends the run). "M 4" means "4 on Medium".

Items marked **NEW** do not exist in the engine yet. Section 8 specifies each one.

---

## 1. Summary

| | |
|---|---|
| **Story beat** | Elias wants the people who lit the fire that killed Bell. Marchetti named "Switch's rats". He goes down into the closed Saint-Ambrose line with Nero, cuts through the Tunnel Rats, finds the arson job written on their chalk board ("paid in chips"), kills their bomb-maker Tinder, and beats Switch Varga at the rail junction. He pulls her off the rails before the 23:10 freight hits her, because he needs her to talk. She gives him a gold Orfeo chip: "Reserved: the Count". |
| **What the player learns** | The fire was a paid job. The pay was casino chips. Count Brask (Level 3) paid. |
| **Setting** | The abandoned Saint-Ambrose metro line, all underground: the ticket hall stairs, a flooded platform, a dark service tunnel still used by night freight, a train graveyard, and the live rail junction. |
| **Time / weather** | Night, about 22:30 to 23:10 in story time. No sky. Rain from the street falls down vent shafts as thin lit columns and makes puddles under them (**NEW** weather `drip`). Water on the track bed. Steam from hot pipes. |
| **Mood** | Claustrophobic, wet, loud when trains pass, silent between. The tutorial was neon and open; this level is narrow light in big darkness. The dog is the hero's eyes and ears. Firebug punks against a grieving man: their fire against his cold. |
| **Colour** | Desaturated green-grey tiles, black tunnels. Accents: sodium amber work lamps, red flares and fire, cyan signal lamps and third-rail arcs. Switch's red coat is the only clean red in the level. |
| **Length target** | 9 to 11 minutes on Medium for a first play (see beat times in section 3; boss about 3 minutes). |
| **New verbs this level teaches** | Follow Nero's bark; "Nero, hold!"; read a train warning and get clear; step into a refuge niche; ignite oil; dive through a train gap (slow motion); pull a points lever. |

**Music and sound mood**

- Exploration: a low drone in D minor, sub-bass rumble, water drips as the only percussion, a muted trumpet line (Elias's theme from Club Noir) that plays once per section, far away and with echo.
- Fights: the same key; brushed snare and a dry upright-bass ostinato enter; distorted trash-can hits for Rat attacks. Music drops to drone when the last goon of a wave dies.
- Trains: every train has its own mix moment. Music ducks by 8 dB from the first rail hum to the end of the pass. The pass is a wall of sound: wheel clatter, wind, sparks.
- Breather: a crackly radio plays an old French jazz ballad (diegetic). It is the only warm sound in the level.
- Boss: punk-industrial at 152 bpm. The drums play the train's "clickety-clack" rhythm. Train horns are tuned to the key of the cue (D and A). Phase 3 adds a rising riser and a tick track that follows the freight countdown.
- Rats talk to each other with finger whistles. Two short whistles = "he is coming". One long whistle = "train". Players learn the code.

---

## 2. Sections map

World `W 3600, H 320, groundY 280`. All sections are indoor. Ceiling heights are stylised to leave room for catwalks above the trains (a car roof is at y 200).

| Section | x-range | In/Out | Backdrop | Lighting | Weather | Camera |
|---|---|---|---|---|---|---|
| `stairs` (ticket hall and stairs) | 0 to 420 | Indoor | Cream tiles with black trim, 1950s posters, broken turnstiles on the mezzanine, two street grates in the ceiling (x 120, 360) | Medium-low ambient `[0.30, 0.32, 0.38]`. Two cold columns of street light under the grates. | `drip` columns at x 120 and 360 | Zoom 0.45 to 0.7, tight. Opens with a slow pan down the stairs. |
| `platform` (Saint-Ambrose platform) | 420 to 1300 | Indoor | Green-grey tiles, station name plates "SAINT-AMBROSE", red crowned-rat graffiti, a ticket booth, benches. Foreground: the flooded track bed. Above: a maintenance catwalk (y 170, x 760 to 1120). | Starts lit by one green work lamp (x 560). The lamp dies at beat 2: ambient `[0.10, 0.12, 0.14]`, the hero's coat lamp is the main light. After the breaker (x 740): sodium tubes, ambient `[0.30, 0.30, 0.26]`, some tubes flicker. | `drip` at x 640, 1180 | Zoom 0.4 to 0.65. Rises 30 px when the hero is on the catwalk. |
| `tunnel` (service tunnel) | 1300 to 2100 | Indoor | Brick vault, cable runs, red "DANGER - LIGNE SOUS TENSION" plates, refuge niches in the wall. From x 1780 the tunnel widens to two tracks: Track 2 in the back lane, a far service ledge behind it. | Darkness, ambient `[0.05, 0.06, 0.07]`. Lights: the coat lamp cone, Rats' cigarettes, flares, a few dead-blue emergency lamps, train headlights. | `drip` at x 1500 | Zoom 0.45 to 0.7. On a train warning the camera leans 40 px toward the train's side. |
| `yard` (train graveyard) | 2100 to 2860 | Indoor | A wide cavern. Rusted 1930s metro cars on blocks, a dead gantry crane, a collapsed vent shaft (x 2760) with a waterfall of rain. The Rats' camp in a gutted car. | Low-medium ambient `[0.18, 0.16, 0.20]`. Warm points: oil-drum fires, candles, string lights in the camp. The vent shaft is a cool blue column. | `drip`, heavy at x 2760 | Zoom 0.35 to 0.6, wider for roof fights. |
| (blast door) | 2860 to 2900 | Wall | A steel blast door, x 2880 | | | Door transition with fade. |
| `junction` (boss arena) | 2900 to 3600 | Indoor | A tall cavern where two tracks cross. Tunnel portals in both end walls. A raised signal box (west), an overhead gantry (east), a points lever frame on the ground (x 3470). Bell & Sons clock in the signal box window, stopped at 3:17. | Ambient `[0.16, 0.16, 0.20]`. Sodium work lamps on the walls. Two signal heads over each portal (amber = Track 1, cyan = Track 2). Train headlights flood the room. | `drip` at x 3220 and 3400 (these make the wet zone) | Locked to bounds `[2900, 3600]`, zoom 0.36 to 0.5 so both portals stay on screen. |

**Side view (1 character = 40 px; y grows downward)**

```
x: 0         400       800       1200      1600      2000      2400      2800      3200      3600
   |STAIRS   |PLATFORM flood + oil |SERVICE TUNNEL dark|TRAIN GRAVEYARD   |D|JUNCTION  (boss) |
y100  g        g                 roof: tiled vault      brick vault        vent           cavern roof  
y150                                                                       |V          ====gantry==   y150
y170 ####               ===catwalk===                                      |V                         
y190    \                 R  R    #     ---cw---  --         [SB]                 [SB balcony]        y190
y204     \                                                   [car A=====] [B==]                       y204
y240      \  [booth]  bench   [crates]  n   N/h   n   :....ledge....:  camp         c                 y240
y280 _____\_~~~~~~~~~~~~~~~~ooooooooo|____________________T2===T2=====|___________oo___|D|__xxx__xx___LB_y280
     N1     B2 lamp  brk  B3   N2  B4|  B5       B6    B7 N4 (MG)   |  B8   B9    B10 |  B11-B13
          (560) (740)        (1100)    (1440)(1560)(1680)                                (3080)(3470)
Legend: #### mezzanine   \ stair flight   g street grate   ~ flooded floor   o oil slick / fuel pool
        R Ratcatcher on catwalk   # hidden ladder   n refuge niche   N/h Nero bark spot + hidden niche
        T2 Track 2 (back lane)   .... far service ledge   [car] dead metro car roof   V vent waterfall
        [SB] signal box   xx third-rail live segments   LB ground lever frame   D blast door
        N1..N4 Nero bark spots   B2..B13 beat numbers (section 3)
```

---

## 3. Encounter flow

Each beat lists: place, enemies (E / M / H / W), items, environment, start and end triggers, and why it is exciting. Times are a Medium first play.

### Beat 1. "Going Under" (exploration, 0:40)

- **Place:** x 0 to 420 (`stairs`). Start on the mezzanine at x 40, y 170.
- **Enemies:** none.
- **Items:** behind bark spot N1 (a torn poster on a plywood board at x 300, breakable, hp 20): 1 bandage, 4 bottles to pocket, 1 pipe.
- **Environment:** the stair flight from x 150 to 330. Rain columns at x 120 and 360 make puddles with reflections. A dead turnstile can be kicked loose (a heavy prop, `bin` class).
- **Nero:** first `scout` lesson. He trots ahead, stops at the poster, barks. Toast: "Nero barks at hidden things." After the stash, toast: "Press [Hold] and Nero pins a goon."
- **Start:** end of the opening cutscene. **End:** `heroX >= 420`.
- **Why it is exciting:** it is the calm before the dark. The player meets the companion and gets a reward for trusting him in the first 30 seconds.

### Beat 2. "Lights Out" (ambush in the dark, 1:00)

- **Place:** x 420 to 760 (`platform`, west half).
- **Enemies:** E 3 (2 Shiv, 1 Lineman) / M 4 (2 Shiv, 2 Lineman) / H 5 (+1 Crawler) / W 6 (+1 Crawler, +1 Shiv). From the dark east end (`from: 'offscreen'`) and 1 Crawler from the drain at x 640.
- **Items:** pipe on the bench at x 600; 2 bins and 2 chairs at the ticket booth (x 520); 1 crate at x 700.
- **Environment:** a scripted knife hits the green work lamp at x 560 (the knife from panel 4). The lamp sparks and dies. The hero's coat lamp clicks on (**NEW** darkness and lamp cone). Rats outside the cone show only as eye glints and cigarette ends. Nero growls toward each hidden Rat. When the wave is dead, the breaker box at x 740 starts to flash; one hit on it brings the platform tubes back on (**NEW** interactable).
- **Start:** `heroX >= 440` (one-shot script: knife, lamp off, wave `w2`). **End:** `killed: 'w2'` and the breaker is hit.
- **Why it is exciting:** the comic panel becomes gameplay in one second. The player fights eyes in the dark and then wins back the light with a punch.

### Beat 3. "Gantry Knives" (vertical fight, 0:50)

- **Place:** x 760 to 1120. The catwalk is at y 170, x 760 to 1120.
- **Enemies:** catwalk Ratcatchers E 1 / M 2 / H 2 / W 3; floor E 2 Shiv / M 2 (Shiv, Lineman) / H 3 + 1 Flare Rat / W 3 + 1 Flare Rat.
- **Items:** a visible service ladder at x 780 (under fire); a hidden ladder at x 1100 in a dark corner (bark spot N2), which comes up behind the throwers. 2 pushable crates at x 880 and 940: push one under the catwalk and use it as a step for a ledge climb. Dead Ratcatchers drop 3 throwing knives each.
- **Environment:** a Ratcatcher hit off the catwalk falls 110 px and lands hard (out of the fight on M and below). Hurled pipes and bottles reach the catwalk.
- **Start:** `heroX >= 770`. **End:** `killed: 'w3'`.
- **Why it is exciting:** the player picks a route: run the ladder under fire, build a step with crates, or trust the dog and flank. Each choice is a different fight.

### Beat 4. "Oil on the Water" (environment set piece, 0:50)

- **Place:** x 960 to 1300. The floor from 980 to 1280 is flooded to ankle depth (**NEW** flooded floor) with an oil sheen (**NEW** oil slick).
- **Enemies:** a wave wades in from the tunnel mouth at x 1300: E 4 / M 6 / H 7 / W 8. Mix: Shiv and Lineman; +1 Firebug on H and W. They wade (speed x 0.75 in water).
- **Items:** a burning oil-drum brazier on dry ground at x 950 (kick it over: it rolls into the slick). A hanging work lantern over the water at x 1150 (hit it with a pocketed bottle or a thrown knife: it drops). A Firebug's own bottle also ignites it. 1 bandage on the booth roof at x 1240 (y 230, ledge climb).
- **Environment:** fire runs along the slick at 300 px/s and burns for E 6 / M 5 / H 5 / W 4 s. Any fighter in it takes 25 dmg/s and panics (goons run and flail; the hero takes 10 / 14 / 18 / 22 dmg/s). After the fire: steam, black water, burnt Rats. If the player never ignites it, the wave fights in the water as normal (harder, but fair).
- **Start:** `heroX >= 1000` and `killed: 'w3'`; a long Rat whistle sounds and the wave walks into view. **End:** `killed: 'w4'`.
- **Why it is exciting:** one smart move wipes half a wave. The orange fire light reflected on black water is the level's postcard. It is also poetic: the arsonists burn.

### Beat 5. "The Dark Mile" (exploration, first train, 0:40)

- **Place:** x 1300 to 1640 (`tunnel`).
- **Enemies:** none, but 2 Shiv lurkers sit in niche 1680 on H and W (they join beat 6).
- **Items:** bark spot N3 at x 1560: a bricked-up niche with old boards (hp 40). Inside: **shotgun**, 1 ammo box, 1 bandage. The niche is also a refuge.
- **Environment:** the first train **T1** (service loco + 3 boxcars, 220 px/s, east to west) on Track 1, which is the fight-lane floor. Warning chain (the order every train uses; **NEW** train hazard):
  1. Nero stops, ears up, whines and looks toward the train (5 s before).
  2. Rail hum and a light glow on the tunnel curve (3.5 s).
  3. Horn (2.5 s). Long Rat whistle if Rats are near.
  4. Headlight beam on screen (1.2 s).
  Escapes: refuge niches at x 1440, 1560 (hidden), 1680 (press Up to step in; **NEW** refuge niche), or the wall catwalk at y 186 (x 1380 to 1560, ledge climb). Train hit: E 30 / M 50 / H 70 / W 80 dmg and a long knockdown.
- **Start:** `heroX >= 1320` (toast: "Trains still run on Line Zero. Watch Nero."). T1 is sent at `heroX >= 1420`. **End:** `heroX >= 1600`.
- **Why it is exciting:** the first train is a jump scare that the player can read. Nero warns first, so the player learns to watch the dog.

### Beat 6. "Eyes in the Dark" (dark fight with a train mid-fight, 1:00)

- **Place:** x 1560 to 1780.
- **Enemies:** E 3 + 1 Flare Rat / M 5 + 1 Flare Rat / H 6 + 2 Flare Rats / W 7 + 2 Flare Rats. Mix: Shiv, Lineman, Crawlers from drains at x 1620 and 1720 (M 2, H 2, W 3).
- **Items:** a cable drum (rolls like a barrel) at x 1640; a toolbox crate at x 1700; knives from Shivs.
- **Environment:** darkness; flares light a 90 px circle for 6 s (they help the hero too). Nero barks at a drain 1.5 s before a Crawler rises. Train **T2** (loco + 4 boxcars, 240 px/s, west to east) is sent 25 s into the fight. Goons on the floor are hit like the hero (a train kill counts as a kill, feat `trainKill`). Linemen try to shove the hero onto the track during the warning.
- **Start:** `heroX >= 1600`. **End:** `killed: 'w6'` or 60 s after the start (survivors run east).
- **Why it is exciting:** red flares, eyes in the dark, and a train that cuts the fight in half. The player who kicks a Rat into the train path feels like John Wick.

### Beat 7. "The 22:52 Freight" (slow-motion gun-fu, 0:40)

- **Place:** x 1780 to 2060. The tunnel widens. Track 2 runs in the back lane. The far service ledge (surface y 240, x 1820 to 2040) is behind it.
- **Enemies on the far ledge:** E 3 / M 4 / H 5 / W 6. Mix: 1 to 2 Ratcatchers, 1 to 2 Flare Rats, the rest Shivs. 2 Shivs on the near side on H and W.
- **Items:** bark spot N4 at x 1760: a toolbox with the **machine gun** (stolen Choir hardware) and 1 ammo box.
- **Environment:** freight **T3** (8 boxcars and flatcars, 160 px/s, east to west) passes on Track 2 for about 14 s. The cars block shots and throws. The gaps between cars (40 px) show the Rats as strobing silhouettes; they throw and shoot through the gaps.
  **The set piece:** the hero holds Up and dodges toward the back lane while a gap is within 60 px (**NEW** lane dive; the gap "magnet" lines it up). Time drops to 0.25 for 2.4 s real time. The hero flies through the gap, side-on, the machine gun firing. Aim assist hits up to 4 targets on the ledge. Shell casings and sparks hang in the air. He lands on the ledge; time returns with a hit-stop and a camera kick. If the player does not dive, the train passes and the fight continues in normal time (they can step across Track 2 after it).
- **Start:** `heroX >= 1790` (T3 is sent; toast on first visit: "Dive through a gap. [Up] + [Roll]"). **End:** `killed: 'w7'`.
- **Why it is exciting:** it is the bible's signature move and the trailer shot: a man in a black suit, sideways in the air between two boxcars, a machine gun lighting the dark.

### Beat 8. "The Rats' Nest" (breather, 0:40)

- **Place:** x 2100 to 2300 (`yard`, west). The Rats' camp in a gutted metro car (car A, 2140 to 2420).
- **Enemies:** none. The Rats left in a hurry: a pot still boils on a gas ring.
- **Items:** 1 bandage, 1 ammo box (shotgun and machine gun), a **fire axe** on the car wall (x 2240, stand `rack`). A radio playing a French jazz ballad.
- **Environment and story:** an in-engine scene (no input lock; it plays if the hero stands still near the board for 2 s):
  - A chalk job board: "HORLOGER - RUE DES CLOCHES - 4 BIDONS - 03:00 - PAYÉ EN JETONS." VO caption: "Four cans of petrol. A whole life, paid in chips."
  - A trophy shelf: the brass door bell from Bell & Sons, scorched. The hero takes it (it goes in his pocket, a story item). VO: "They kept his door bell. Like a scalp."
  - Nero drinks from the vent puddle. If the hero walks to him, the existing `pet` action plays.
- **Start:** `heroX >= 2120`. **End:** `heroX >= 2300`.
- **Why it is exciting:** the player learns that the fire was bought and sold, and the level stops for 30 seconds of grief before the hardest fights.

### Beat 9. "Graveyard Roofs" (platform fight, 0:50)

- **Place:** x 2300 to 2620. Car A roof (y 204, x 2140 to 2420), car B roof (y 210, x 2470 to 2610), roof hatches (drop-through).
- **Enemies:** E 4 / M 5 / H 6 / W 8. Shiv and Lineman on the ground, 1 Ratcatcher on car B (2 on W), Rats jump to roofs and lunge from them.
- **Items:** a rail trolley at x 2340 on the yard track (pushable box on rails: a push sends it rolling 160 px; it knocks down goons in its path); 2 crates, 2 barrels, 2 chairs from the camp.
- **Environment:** the hero can fight on the roofs or below. Axe plunge from a roof onto a goon below is a natural combo.
- **Start:** `heroX >= 2300`. **End:** `killed: 'w9'`.
- **Why it is exciting:** after the narrow tunnel the space opens. The fire axe (from the breather) makes this a strong power moment.

### Beat 10. Mini-boss: "Tinder" (elite fight, 1:15)

- **Place:** x 2620 to 2860. A fuel pool on the floor (x 2700 to 2780), 4 oil drums, the vent waterfall at x 2760 (a column of falling water, 30 px wide), the dead gantry crane hook at y 150 (decor).
- **Enemy:** **Mattias "Tinder" Rook**, the Rats' bomb-maker. A thin man in a burnt welder's apron and goggles, a road flare in one hand, a bandolier of bottles. Uses the boss framework (`miniBoss: true`, **NEW** small boss bar, no portrait dialog). HP E 260 / M 320 / H 380 / W 440. Crew: none on E and M; 1 Firebug on H; 2 on W.
- **Moves:** `string` flare-torch combos (burns 4 dmg/s for 2 s on hit); `volley({ proj: 'firebottle' })` 1 / 2 / 2 / 3 bottles in an arc, each makes a 40 px fire patch for 3 s; `throwObject` kicks an oil drum that rolls toward the hero (jump it or hit it back); phase 2 (`hpBelow: 0.5`): he lights the fuel pool (a 4 s fire wall) and his moves speed up 20 %.
- **Punish windows:** 0.8 s after each bottle throw; 1.5 s if the hero kicks a drum back into him; **the waterfall trick:** if Tinder walks through the vent waterfall, his flare goes out. He is "doused" for 4 s: no burn damage, slower moves, and he takes +50 % damage while he relights.
- **Defeat:** a short slow-motion freeze. He drops the blast-door key. Bark (speech bubble): "I only built it! Switch lit it! She's at the junction!" Hero: "I know."
- **Start:** `heroX >= 2640` and `killed: 'w9'`: walls close at 2600 and 2860 for the fight. **End:** Tinder defeated: the blast door at 2880 opens.
- **Why it is exciting:** it is the man who built the bomb. Fire is his weapon; rain from the city puts it out. The player who notices the waterfall feels clever.

### Beat 11. "The Junction" (boss intro, 0:30)

- **Place:** door transition (fade) from `yard` to `junction`. The hero enters at x 2930.
- **Scene:** a far horn. Switch sits on the signal box balcony rail, swinging her legs, chain in her lap. The boss intro portrait dialog plays (section 6). On her last line she pulls the lever: the first train comes 6 s after the dialog ends.
- **Start:** `heroX >= 2870` and `bossKilled: 'tinder'`. **End:** dialog end, `{ boss: 'start' }`.

### Beat 12. Boss: Switch Varga (2:30 to 3:30)

See section 5.

### Beat 13. "Last Second" (defeat sequence, 0:20)

See section 5, defeat sequence. Then the outro panels, the payphone, and the results card.

**Beat time total (Medium, first play):** about 10:30. Easy runs near 8:30; Wicked runs with deaths go past 12.

**Checkpoints:** at beat 5 start (x 1320), beat 8 (x 2120), and the boss intro (x 2930). On Wicked a K.O. ends the run (no checkpoint).

---

## 4. Faction: the Tunnel Rats (enemy variants)

Look: young punks in layered hoodies and work jackets, patched jeans, rain-soaked beanies, scarves over the mouth. Tin miners' lamps on some heads (turned off in fights). Red crowned-rat patches. Pale skin, dirty from soot. They whistle signals.

| Variant | Base role | Look | Behaviour change | Stat change |
|---|---|---|---|---|
| **Shiv Rat** | knife | Hoodie, scarf mask, two small knives | **Lurk:** in dark zones it waits still (eyes glint) until the hero is within 70 px or turns his back, then lunges. Rolls under high attacks 20 % of the time on H and W. | speed +10 %, hp -15 % |
| **Lineman** | pipe | Orange railway vest stolen from a crew, a short rail wrench | **Shove:** during a train warning it tries to push the hero onto the track (a grab-push with 0.4 s windup; dodge or hit to break). Heavy hits knock the hero back 30 % further (toward the third rail in the arena). | knockback +30 % |
| **Ratcatcher** | knife thrower | Long coat, goggles, a bandolier of rail spikes | Throws rail spikes (`proj: 'spike'`, flat and fast, 14 dmg). Stays on raised surfaces only. When the hero climbs up, it jumps down to the floor instead of fighting on the catwalk. | throw cooldown x 0.8 |
| **Crawler** | knife | Wet, shirtless under an oilskin, a hooked blade | **Rises from drains and water** (spawn source `drain`): 0.6 s rise animation, can be hit only by low attacks while rising. Opens with a low slash. | hp -25 % |
| **Firebug** | knife thrower | Gas mask, welder's gloves, a satchel of bottles | Throws fire bottles (`proj: 'firebottle'`): a 40 px fire patch for 3 s. Ignites oil slicks. If it is hit while it holds a lit bottle (0.5 s windup), the bottle drops at its own feet. | |
| **Flare Rat** | pistol | Rain cape, a brass flare pistol | Fires a slow arcing flare (2 shots, then reload 3 s): 10 dmg + burn 2 s; the flare lights a 90 px circle for 6 s. In dark sections that light also helps the hero. | |

**Placement rules**

1. Max 2 Ratcatchers alive at once (3 on W). Ratcatchers only spawn on surfaces at least 40 px above the ground, at least 120 px from the nearest ladder or climbable edge.
2. Crawlers only spawn from tagged drains or flooded floor, never within 60 px behind the hero (within 100 px on E). Nero always barks 1.5 s before (E 2.5 s).
3. Max 1 Flare Rat per wave on E and M, 2 on H and W. Never put a Flare Rat and 2 Ratcatchers in the same wave on E.
4. Firebugs never spawn within 200 px of an unlit oil slick before the hero has seen it (the slick is the player's toy first). Max 1 Firebug per wave below W.
5. Shiv lurk only happens in sections with ambient below 0.15.
6. No goon spawns within 3 s before a train arrives or while a train passes. Goons on the floor try to reach a refuge when a train warns: success chance 50 % on E and M, 80 % on H and W (on easy levels the trains help the player more).
7. Linemen get the shove behaviour only on M and above.
8. Waves enter from the dark side of the screen (`from: 'offscreen'`) or from tagged drains, ladders and niches; never from the side the hero just cleared.

---

## 5. The boss: Ilsa "Switch" Varga

**Who:** a Tenor. A wiry punk in a red rail coat, cropped hair, goggles on the forehead. A chain whip with a hook on its end, a bandolier of rail spikes. Manic, laughing, proud of the fire. She runs the tunnels and the night freight schedule.

### 5.1 Arena layout (`junction`, x 2900 to 3600)

```
y150                                   [=========== gantry ===========]   (x 3260-3460)
y190      [ SIGNAL BOX balcony ]                                     /     stair 3470-3560
          [ lever A @3120  clock 3:17 ]                             /
y240      / stair 2960-3010                         c c (relay cabinets 3240, top y 236)
y280  |P1| ===================== TRACK 1 (fight-lane floor) ====================== |P1|
          back lane: TRACK 2 ............................................... (lane step)
          ~~~~~ wet zone 3180-3440 ~~~~~   live third-rail segments: 3180-3300, 3380-3440
          LB = ground lever frame @3470 (the hero can pull it)
      west portal x 2900                                                east portal x 3600
```

- **Track 1** is the whole arena floor (the fight lane). A train on Track 1 hits everyone on the floor.
- **Track 2** runs in the back lane. The hero can step into the back lane anywhere in the arena (hold Up; **NEW** lane step, arena-wide here). A train on Track 2 hits only the back lane.
- **Safe high places:** the signal box balcony (y 190, x 3010 to 3150, reached by the stair at 2960 or a ledge climb), the gantry (y 150, x 3260 to 3460, reached by the stair at 3470 or a ledge climb from the relay cabinets at 3240).
- **Third rail:** two live segments in the floor (x 3180 to 3300 and 3380 to 3440), drawn as a raised rail with a yellow guard board. Stepping on a live segment: shock E 8 / M 12 / H 16 / W 20 and a stun of 0.4 / 0.6 / 0.7 / 0.8 s. The segments arc on a cycle in phase 1 (live 2 s, dead 1.5 s, blue crackle 0.5 s before live), always live in phase 3.
- **Wet zone:** rain from two vent grates (x 3220, 3400) keeps a shallow puddle from 3180 to 3440. When a train passes on Track 2, its pickup shoe arcs the third rail and the whole wet zone is live for the pass (same shock values, crackle 0.6 s before).
- **Props:** 3 barrels, 3 crates, 1 cable drum. The crew brings 1 new crate or barrel every 30 s from a portal (max 6 in the arena).
- **Pickups:** 1 bandage on the balcony (respawns once, in phase 3). 1 ammo box by the cabinets.
- **Bell & Sons clock:** in the signal box window, stopped at 3:17 (bible rule for every boss lair).

### 5.2 Telegraphs for trains (the arena gimmick's cue chain)

Each train uses the same cue chain as the level, plus the signal heads:

| Time before arrival (M) | Cue (`boss:telegraph` with `{ light, cue, mark }`) |
|---|---|
| 5.0 s | Nero whines and turns to the portal. Signal head over that portal lights: **amber "1"** (Track 1, floor) or **cyan "2"** (Track 2, back lane). |
| 3.5 s | Rail hum (audio), the portal glows. A floor mark: an amber stripe along the floor (Track 1) or a cyan stripe in the back lane (Track 2). |
| 2.5 s | Horn. The music ducks. |
| 1.2 s | Headlight beam crosses the arena. |

Lead time per difficulty (first cue to arrival): E 6.0 / M 5.0 / H 4.2 / W 3.6 s. It also scales by `t / sqrt(A)` for the boss's own lever pose, not for the train chain (the train chain is a fixed fairness contract).

A **fake-out** (phase 2 and 3): Switch kicks the lever late. Cue: a loud lever clunk, the signal head flips colour, the floor stripe moves to the other track, Nero barks twice. Minimum time from the flip to arrival: E (no fake-outs) / M 1.6 / H 1.2 / W 1.0 s.

Train damage: E 30 / M 50 / H 70 / W 80, plus a long knockdown. Trains hit Switch and the crew as well. Switch always gets clear (she climbs or steps back) except when stunned.

### 5.3 Phases and moves

`stats: { hp: 820 (M), s: 1.0, m: 4, speed: 36, reach: 30, dmg: 14, heavyDmg: 22, poise: 18, windup: 0.3, cd: [0.6, 1.2] }`

**Phase 1, "Schedule" (100 % to 60 % hp).** She fights on the floor and the balcony.

| Move (primitive) | What it does | Telegraph | Counter | Punish window |
|---|---|---|---|---|
| `lash` (`string`, combos `[lash]`, `[lash, lash]`, `[lash, sweep]`) | Chain strike at 46 px reach, 14 dmg. `sweep` is a low spin at 50 px, must be jumped. | `lash`: chain rattle, she pulls her arm back, goggles glint (0.3 s). `sweep`: she crouches, chain circles overhead, a floor arc mark (0.45 s). | Step inside her reach; she is weak up close. Jump the sweep. | 0.5 s after a whiffed string |
| `hook` (`grab`) | Throws the hooked chain 90 px. On hit: pulls the hero to her and knees him (20 dmg). Near a live third rail she pulls him across it. | Chain twirls at the shoulder 0.6 s, a red glint on the hook, a line mark on the floor. | Dodge roll through it, or jump. | 1.0 s on a miss: the hook sticks in a sleeper and she yanks it free |
| `spikes` (`volley({ proj: 'spike' })`) | 3 rail spikes in a fan: straight, high, low (E 2, W 4). 10 dmg each. | She pulls spikes from the bandolier; three glints (0.5 s). | Duck the high one, jump the low one, roll through all. | 0.6 s |
| `lever` (`hazard('train')`) | She runs to lever A (balcony, x 3120) and throws it. A train comes on the track she chose (she picks the track the hero stands on, 70 % of the time). | The run itself (she always laughs "Tickets, please!"), then the train chain (5.2). | Read the signal; get high or change track. | **1.2 s** at the lever, at a known place: the best punish in phase 1 if the hero follows her up the stair |
| `taunt` | Spins the chain and laughs after a train hits the hero. | 1.0 s | | Free hits during the full taunt |

Weights: `lash 0.45, hook 0.2, spikes 0.2, lever 0.15`. At most 1 train per 12 s (E 18 s, W 9 s).

**Phase 2, "Handcar" (60 % to 25 % hp).** `onEnter`: a `phaseShift` scene (1.5 s, she is invulnerable): she jumps from the balcony onto a red handcar that rolls out of the west portal. Line: "Let's take a ride!" Music adds its second drum layer.

| Move | What it does | Telegraph | Counter | Punish |
|---|---|---|---|---|
| `ram` (`charge` on the handcar **mover**) | The handcar crosses the arena on Track 1 at E 120 / M 150 / H 175 / W 200 px/s; 18 dmg and knockdown. She lashes from the car on the way (one `lash` at the closest point). | Handcar bell "ding-ding", wheel squeal, a small headlamp; the car rolls back 20 px before it goes (0.5 s). | Jump over the handcar (it is 18 px tall) and hit her in the air. Get high. Step into the back lane. | At the far end she must pump to turn: 0.9 s |
| `spikes` from the car | Same as phase 1, while moving. | Same | Same | None |
| `lever` (late) | She throws lever A from the handcar as she passes the signal box. Fake-outs from M up (5.2). | Lever clunk | Read the flip | None |
| **Derail** (environment) | A crate, barrel or cable drum on Track 1 in front of the handcar derails it. A heavy kick or axe hit on the handcar also derails it (H and W: needs 2 heavy hits). She is thrown 60 px and lies stunned. | | | **2.2 s** stun (E 3.0, W 1.6): the biggest punish of the fight |
| **Player lever** (environment) | The hero can pull ground lever LB (x 3470, interact by attacking it). The next train then runs on Track 1 while she is on the handcar. She bails (screams "You little—!") and the train smashes the handcar to pieces. | Same train chain | | 1.5 s as she lands from the bail; the rest of phase 2 is on foot with `cd` x 0.85 |

Wet zone: each Track 2 train electrifies it (5.1). Weights in phase 2: `ram 0.45, spikes 0.2, lash 0.2, lever 0.15`. After a derail or a bail she fights on foot with phase 1 moves until the next phase.

**Phase 3, "The 23:10" (25 % to 0 %).** `onEnter`: she jams both lever frames with her chain and sends a flare up: "Points jammed! Beat the 23:10, Sandman!" A countdown meter appears under the boss bar (**NEW**): E 50 / M 40 / H 35 / W 30 s. The far east portal light grows; horns at 20, 10 and 5 s left. Third-rail segments stay live. The crew flees ("Not on the 23:10!") and despawns: this is a duel.

| Move | What it does | Telegraph | Counter | Punish |
|---|---|---|---|---|
| `lash` string, faster | `cd: [0.4, 0.9]`, windup 0.25 | as phase 1 | | 0.4 s |
| `slide` (`charge` on foot, low) | A slide kick along the floor under high attacks, 16 dmg | She drops her shoulder and skids back 1 step (0.35 s), a short floor streak | Jump, low attack, or block | 0.8 s as she gets up |
| `hook` | Now aims to pull the hero onto a live segment | as phase 1 | | 1.0 s |
| `gantryDrop` (`leapSlam`, no quake) | She climbs to the gantry and drops on the hero with spikes first (20 dmg) | A shadow mark on the floor (0.6 s), spikes glint above | Roll out of the mark | 1.2 s on landing |

If the countdown ends: the 23:10 freight (12 cars, 220 px/s, about 12 s) passes on Track 1. Switch climbs to the gantry; the hero must be high or in the back lane (Track 2 is safe in phase 3). The duel continues on the gantry for the pass (tight space, she uses `lash` and `slide`). Then a new countdown starts at 30 s ("Next one's the empty stock!"). This repeats until she is beaten.

### 5.4 The arena gimmick (`gimmick: railJunction`)

Maps onto the gimmick interface `{ init, step, onEvent, lights, hazards, draw2d, build3d, update3d }`:

- `init(ctx)`: creates Track 1 and Track 2 as lane rails; the train pool (service train: loco + 3 cars; freight: loco + 11 cars); the handcar mover (hidden until phase 2); the third-rail segments and the wet zone; the two lever frames as interactables; the countdown (inactive).
- `step(ctx, dt)`: runs the train schedule (requests from `lever`, the player lever, and the phase 3 countdown); advances the cue chain; moves cars; checks car bodies against fighters by lane; cycles third-rail segments; sets the wet zone live during Track 2 passes; derails the handcar when it overlaps a prop or takes enough heavy damage; respawns props from portals.
- `onEvent(ev)`: `boss:phase` (spawn the handcar, start the countdown), `lever:pulled` (by the hero: force the next train to Track 1), `hit` on the handcar, `boss:defeated` (start the defeat sequence; stop the schedule except the scripted freight).
- `lights()`: signal heads (amber / cyan), portal glow, the sweeping headlight cone, third-rail arcs (cyan flashes with short light radius), the handcar headlamp, the phase 3 red flare that hangs under the roof.
- `hazards()`: train cars (by lane), live third-rail segments, the live wet zone, the moving handcar.
- `draw2d`: the train as code-drawn cars (shared painters with the tunnel trains), sparks under wheels, wet reflections of the headlight, the signal heads, the countdown "clock" painted on the portal arch.
- `build3d / update3d`: train and handcar models (`render3d/models/metro/`); everything else derives from the 2D painters.

### 5.5 Crew rules

| | E | M | H | W |
|---|---|---|---|---|
| Spawn every | 5.0 s | 4.5 s | 4.0 s | 3.5 s |
| Max alive | 1 | 2 | 3 | 3 |
| Max total (phases 1 and 2) | 6 | 9 | 12 | 15 |
| Roles | Shiv, Lineman | + Ratcatcher on gantry (phase 2, max 1) | same | same, + Firebug (phase 2, max 1) |

- Crew enter from the west and east portals and the gantry stair. Never during the 3 s before a train or during a pass.
- Crew react to trains with the placement rule 6 chances. A crew kill by train counts for the player.
- Phase 3: no crew; living crew flee into the portals.
- `secondWind: { afterKOs: 2, clearCrew: true }` (not on W, where a K.O. ends the run).
- Nero: he stays at the foot of the signal box stair. He gives the first train cue. "Nero, hold!" pins a crew Rat for 3 s. He can pin Switch only when she is on foot and in the recover state, once per phase, for 1.2 s.

### 5.6 Difficulty scaling summary

| | E | M | H | W |
|---|---|---|---|---|
| HP | 650 | 820 | 950 | 1080 |
| Train lead | 6.0 s | 5.0 s | 4.2 s | 3.6 s |
| Train damage | 30 | 50 | 70 | 80 |
| Third-rail shock / stun | 8 / 0.4 s | 12 / 0.6 s | 16 / 0.7 s | 20 / 0.8 s |
| Fake-outs | never | 1 in phase 2, 1 in phase 3 | 30 % of trains in phases 2 and 3 | 50 % |
| Fake-out min warning | | 1.6 s | 1.2 s | 1.0 s |
| Spikes per volley | 2 | 3 | 3 | 4 |
| Handcar speed / derail hits | 120 / 1 | 150 / 1 | 175 / 2 | 200 / 2 |
| Derail stun | 3.0 s | 2.2 s | 2.0 s | 1.6 s |
| Phase 3 countdown | 50 s | 40 s | 35 s | 30 s |
| Boss telegraphs | `t / sqrt(A)` with A = 1, 2, 4, 8 | | | |

### 5.7 Defeat sequence

1. The final hit: slow-motion freeze frame (0.6 s, colour drained, only her red coat and the far headlight in colour). Hit-stop, camera kick.
2. `boss:defeated`. She staggers back and falls across Track 1 near x 3300, conscious, coughing. The crew is gone. The input driver switches to `cutscene`.
3. The 23:10 headlight fills the east portal. If the countdown is above 4 s it jumps to 4 s. The horn holds. Nero barks without stopping.
4. Scripted (in-engine timeline): the hero runs to her, grabs her collar and drags her into the back lane. The freight arrives 0.3 s after his last step. Camera shake, sparks, wind pulls his coat and hair, her goggles fly off and are crushed.
5. The pass shakes the signal box. The Bell & Sons clock falls from its shelf onto the balcony, face up, its hands at 3:17. Hold for 1 s.
6. Cut to outro panel 1 (the freight from behind, her across the rails as he pulls). Then panels 2 to 4, then the results card.

---

## 6. Cutscene and dialog script

Panel ids follow `panel:metro_<scene>_<nn>` (1024 x 576). Captions on yellowed paper for VO, white balloons for dialogue, red tint on Choir symbols.

### 6.1 Opening panels (`metro_intro`)

| # | Shot | Text |
|---|---|---|
| 1 | Top-down. Elias and Nero go down broken tiled stairs into black. Rain falls through a street grate in a thin column of light. A torn 1950s poster: a smiling family on a metro car, "LIGNE 0 - LA VILLE SOUS LA VILLE". | VO: "Under Valmora there is a second city. It never sees rain. It only hears it." |
| 2 | Wide. A dead platform under a single green work lamp. A red rat with a crown is sprayed on the tiles. Black water covers the tracks, with an oil rainbow on it. | VO: "The Tunnel Rats. Firebugs for hire. Bell's fire had a price, and they had a price list." |
| 3 | Close-up. Nero growls, ears flat, looking into a black tunnel mouth. Elias's hand rests on the dog's back. | VO: "Elena's dog. He hears what I can't." |
| 4 | Medium. In the tunnel, a dozen eyes and lit cigarettes glow. A knife flies out of the dark toward the camera. | RAT: "Lights out, old man!" |

(Panel 4 hands over to beat 2: the same knife kills the work lamp in-engine.)

### 6.2 In-level lines

| When | Who | Line |
|---|---|---|
| First Nero bark (beat 1) | Toast | "Nero barks at hidden things." |
| Beat 2 start, Rats in the dark | RAT (shout) | "It's him! The Sandman's in the tunnels!" |
| First train warning | RAT (shout, offscreen) | "Train! Get flat!" |
| Beat 7 start | RAT (on the ledge) | "Let the freight eat him!" |
| Beat 8, chalk board | VO caption | "Four cans of petrol. A whole life, paid in chips." |
| Beat 8, the door bell | VO caption | "They kept his door bell. Like a scalp." |
| Beat 10, Tinder appears | TINDER (bubble) | "The clock man's boy! He ticked so loud when he burned." |
| | HERO (bubble) | "Loud. Like you." |
| Beat 10, Tinder doused | TINDER | "No, no, no, light, light!" |
| Beat 10, Tinder beaten | TINDER | "I only built it! Switch lit it! She's at the junction!" |
| | HERO | "I know." |

### 6.3 Boss intro portrait dialog (`switch_intro`)

At the rail junction. A train horn echoes far away. Switch sits on the signal box rail.

| Speaker | Mood (portrait) | Line |
|---|---|---|
| SWITCH | Manic, laughing, goggles up (`switch_manic`) | "You came all this way for an old clockmaker? Sweet." |
| HERO | Cold (`elias_cold`) | "You lit it." |
| SWITCH | Proud, spinning the chain (`switch_proud`) | "Best fire of my life. The clocks went off like fireworks." |
| HERO | Cold (`elias_cold`) | "Who paid?" |
| SWITCH | Wild, pulling a lever (`switch_wild`) | "Beat the 23:10 freight, then ask me!" |

Mid-fight barks (voice only, no portrait): phase 2 "Let's take a ride!"; player lever "You little—!"; phase 3 "Points jammed! Beat the 23:10, Sandman!"; on a train hit "Mind the gap!"; on a derail "My car!".

### 6.4 End panels (`metro_outro`)

| # | Shot | Text |
|---|---|---|
| 1 | Freight headlights fill the frame from behind. Switch lies across the rails, beaten. Elias pulls her clear by the collar at the last second. Sparks, wind in his coat. | VO: "I didn't save her. I needed her to talk." |
| 2 | Close-up. A gold casino chip in her shaking palm, lit by a passing car's lamp: *ORFEO - Reserved: the Count*. | SWITCH: "Paid in chips. Count Brask's chips. Now let me go." |
| 3 | Low angle in the signal box. Elias picks up the fallen clock. *Bell & Sons*, hands stopped at 3:17. He puts it back on the shelf. (Short, quiet panel; twist setup.) | VO: "Every clock Bell made stopped at the same minute. I told myself it was the fire." |
| 4 | Exterior, night. Elias rises out of a vent grate into neon rain, Nero jumping out behind him. Across the river the Grand Casino Orfeo glows gold and red. | VO: "The Orfeo. The house always wins. Tonight it would lose." |
| 5 | A payphone on the corner by the grate rings. Elias picks it up. Cut-in: Inspector Hale in a phone booth, hat brim low. | HALE: "Brask doesn't see walk-ins. Bring a Choir coin. And Grave... keep your head down." |

Note: panel 3 is a refinement of the bible. Panel 5 follows the recurring rule "every level ends with a payphone ringing" and sets up the Choir coin at the Orfeo door in Level 3.

---

## 7. Level data skeleton (`src/levels/metro/level.js`)

Keys and actions marked `// NEW` are proposed additions to the schema (section 8).

```js
import { defineLevel } from '../../director/define.js';
import switchVarga from '../../bosses/switch.js';
import tinder from '../../bosses/tinder.js';
import { breakerBox, oilSlickPlatform } from './gimmicks.js';

export default defineLevel({
  id: 'metro', title: 'Line Zero', order: 2, palette: 'metro', music: 'metro',
  size: { W: 3600, H: 320, groundY: 280 },
  sections: [
    { id: 'stairs', x0: 0, x1: 420, indoor: true, weather: 'drip', ambient: [0.30, 0.32, 0.38],
      camera: { minZoom: 0.45, maxZoom: 0.7 },
      backdrop: [{ type: 'wall', set: 'tiles_cream', grime: 0.7 }, { type: 'shaft', xs: [120, 360] }] },          // shaft: NEW
    { id: 'platform', x0: 420, x1: 1300, indoor: true, weather: 'drip', ambient: [0.10, 0.12, 0.14],
      camera: { minZoom: 0.4, maxZoom: 0.65 },
      backdrop: [{ type: 'wall', set: 'tiles_green', signs: ['SAINT-AMBROSE'] }, { type: 'trackbed', water: true }] },
    { id: 'tunnel', x0: 1300, x1: 2100, indoor: true, weather: 'drip', ambient: [0.05, 0.06, 0.07], dark: true,     // dark: NEW
      camera: { minZoom: 0.45, maxZoom: 0.7, leanToTrain: 40 },                                                    // leanToTrain: NEW
      backdrop: [{ type: 'wall', set: 'brick_vault' }, { type: 'cables' }] },
    { id: 'yard', x0: 2100, x1: 2860, indoor: true, weather: 'drip', ambient: [0.18, 0.16, 0.20],
      camera: { minZoom: 0.35, maxZoom: 0.6 },
      backdrop: [{ type: 'wall', set: 'cavern' }, { type: 'shaft', xs: [2760], heavy: true }] },
    { id: 'junction', x0: 2900, x1: 3600, indoor: true, weather: 'drip', ambient: [0.16, 0.16, 0.20],
      camera: { minZoom: 0.36, maxZoom: 0.5, bounds: [2900, 3600] },
      backdrop: [{ type: 'wall', set: 'cavern' }, { type: 'portal', xs: [2900, 3600] }] },
  ],
  scene: { paint: [
    { type: 'turnstiles', x0: 20, x1: 140, y: 170 },
    { type: 'poster', x: 300, y: 236, art: 'ligne0_family', board: 'n1' },
    { type: 'booth', x: 500, w: 60 },
    { type: 'bench', xs: [600, 1040] },
    { type: 'lamp', style: 'worklamp_green', xs: [560], id: 'greenLamp' },
    { type: 'lamp', style: 'sodium_tube', xs: [480, 680, 880, 1080, 1260], group: 'platformTubes', on: false },
    { type: 'graffiti', x: 820, art: 'rat_king' },
    { type: 'catwalk', x0: 760, x1: 1120, y: 170 },
    { type: 'ladder', x: 780, y0: 170, y1: 280 },
    { type: 'ladder', x: 1100, y0: 170, y1: 280, hidden: true, bark: 'n2' },
    { type: 'tunnelArch', x: 1300 },
    { type: 'niche', xs: [1440, 1560, 1680] },
    { type: 'emergencyLamp', xs: [1400, 1620, 1900] },
    { type: 'track', lane: 'back', x0: 1780, x1: 2100 },
    { type: 'metroCar', x0: 2140, x1: 2420, roofY: 204, state: 'camp' },
    { type: 'metroCar', x0: 2470, x1: 2610, roofY: 210, state: 'half' },
    { type: 'gantryCrane', x: 2700, y: 150 },
    { type: 'blastDoor', x: 2880 },
    { type: 'signalBox', x0: 3010, x1: 3150, floorY: 190, clock: 'bell_317' },
    { type: 'gantry', x0: 3260, x1: 3460, y: 150 },
    { type: 'leverFrame', x: 3470 },
    { type: 'thirdRail', segments: [[3180, 3300], [3380, 3440]] },
    { type: 'signalHead', xs: [2920, 3580] },
  ]},
  ground: [{ x0: 0, x1: 3600 }],
  killY: 330,
  water: [                                                                                                       // NEW
    { x0: 420, x1: 1300, depth: 6, slow: 0.85 },
    { x0: 980, x1: 1280, depth: 8, slow: 0.75, oil: 'slick1' },
    { x0: 2700, x1: 2780, depth: 2, fuel: 'pool1' },
    { x0: 3180, x1: 3440, depth: 3, conductive: 'thirdRail' },
  ],
  surfaces: [
    { id: 'mezz', x0: 0, x1: 150, y: 170, lane: 'plat' },
    { id: 'catwalk', x0: 760, x1: 1120, y: 170, oneWay: true, lane: 'plat' },
    { id: 'booth', x0: 500, x1: 560, y: 230, lane: 'plat' },
    { id: 'tunnelCw', x0: 1380, x1: 1560, y: 186, oneWay: true, lane: 'plat' },
    { id: 'farLedge', x0: 1820, x1: 2040, y: 240, lane: 'back' },                                                   // lane 'back': NEW
    { id: 'carA', x0: 2140, x1: 2420, y: 204, oneWay: true, lane: 'plat', hatches: [2220, 2360] },
    { id: 'carB', x0: 2470, x1: 2610, y: 210, oneWay: true, lane: 'plat' },
    { id: 'sbBalcony', x0: 3010, x1: 3150, y: 190, oneWay: true, lane: 'plat' },
    { id: 'gantry', x0: 3260, x1: 3460, y: 150, oneWay: true, lane: 'plat' },
    { id: 'cabinets', x0: 3230, x1: 3262, y: 236, lane: 'plat' },
  ],
  walls: [
    { x: 0, y0: 0, y1: 280, id: 'west' },
    { x: 2600, y0: 0, y1: 280, id: 'tinderL', active: false },
    { x: 2860, y0: 0, y1: 280, id: 'blastDoor' },
    { x: 2900, y0: 0, y1: 280, id: 'arenaWest' },
    { x: 3600, y0: 0, y1: 280, id: 'arenaEast' },
  ],
  stairs: [
    { type: 'flight', x0: 150, x1: 330, from: 170, to: 280 },
    { type: 'flight', x0: 2960, x1: 3010, from: 280, to: 190 },
    { type: 'flight', x0: 3470, x1: 3560, from: 280, to: 150 },
  ],
  refuges: [{ x: 1440, w: 28 }, { x: 1560, w: 28, boards: 'n3' }, { x: 1680, w: 28 }],                              // NEW
  boards: [{ id: 'n1', x0: 290, x1: 318, y0: 220, y1: 270, hp: 20 }, { id: 'n3', x0: 1548, x1: 1576, y0: 230, y1: 280, hp: 40 }], // NEW (hidden doors)
  barkSpots: [                                                                                                    // NEW
    { id: 'n1', x: 300, reveals: 'board:n1' }, { id: 'n2', x: 1100, reveals: 'ladder' },
    { id: 'n3', x: 1560, reveals: 'board:n3' }, { id: 'n4', x: 1760, reveals: 'pickup:mg' },
  ],
  drains: [640, 1620, 1720],                                                                                     // NEW spawn source
  rails: [                                                                                                        // NEW
    { id: 'track1', lane: 'fight', x0: 1300, x1: 2100 },
    { id: 'track2', lane: 'back', x0: 1780, x1: 2100 },
    { id: 'yard', lane: 'fight', x0: 2300, x1: 2600, trolley: { x: 2340 } },
  ],
  trains: {                                                                                                       // NEW
    T1: { rail: 'track1', from: 'east', cars: ['loco', 'box', 'box', 'box'], v: 220, lead: 5.0 },
    T2: { rail: 'track1', from: 'west', cars: ['loco', 'box', 'box', 'flat', 'box'], v: 240, lead: 5.0 },
    T3: { rail: 'track2', from: 'east', cars: ['loco', 'box', 'flat', 'box', 'box', 'flat', 'box', 'box', 'box'], v: 160, lead: 5.0, gap: 40 },
  },
  lights: [
    { x: 560, y: 210, r: 120, rgb: [0.4, 1.0, 0.5], id: 'greenLamp' },
    { x: 1150, y: 230, r: 60, rgb: [1.0, 0.75, 0.4], id: 'lantern', flicker: 0.2 },
    { x: 950, y: 260, r: 70, rgb: [1.0, 0.55, 0.2], flicker: 0.4 },
    { x: 2260, y: 250, r: 90, rgb: [1.0, 0.7, 0.4], flicker: 0.3 },
    { x: 3080, y: 180, r: 80, rgb: [1.0, 0.8, 0.5] },
  ],
  interactables: [                                                                                                 // NEW
    { id: 'breaker', x: 740, y: 240, kind: 'breaker', hp: 1, armed: false },
    { id: 'brazier', x: 950, kind: 'brazier', ignites: 'slick1' },
    { id: 'lantern', x: 1150, y: 230, kind: 'hanging', ignites: 'slick1' },
    { id: 'jobBoard', x: 2200, kind: 'read', scene: 'metro_board' },
    { id: 'leverB', x: 3470, kind: 'lever', event: 'lever:pulled' },
  ],
  props: [
    ['bin', 510, 280], ['bin', 540, 280], ['chair', 525, 280], ['chair', 552, 280], ['crate', 700, 280],
    ['crate', 880, 280], ['crate', 940, 280], ['barrel', 950, 280],
    ['drum', 1640, 280], ['crate', 1700, 280],
    ['crate', 2290, 280], ['crate', 2450, 280], ['barrel', 2320, 280], ['barrel', 2440, 280],
    ['chair', 2250, 280], ['chair', 2270, 280],
    ['barrel', 2650, 280], ['barrel', 2690, 280], ['barrel', 2800, 280], ['barrel', 2830, 280],
    ['barrel', 3000, 280], ['barrel', 3330, 280], ['barrel', 3520, 280],
    ['crate', 3060, 280], ['crate', 3200, 280], ['crate', 3420, 280], ['drum', 3150, 280],
  ],
  pickups: [
    { w: 'pipe', x: 600, stand: 'bench' },
    { w: 'shotgun', x: 1560, stand: 'niche' },
    { w: 'mg', x: 1760, stand: 'toolbox', hidden: 'n4' },
    { w: 'axe', x: 2240, stand: 'rack' },
    { kind: 'bandage', x: 305 }, { kind: 'bandage', x: 1240, y: 230 }, { kind: 'bandage', x: 1565 },
    { kind: 'bandage', x: 2230 }, { kind: 'bandage', x: 3080, y: 190, respawn: 'phase3' },
    { kind: 'ammo', x: 1570 }, { kind: 'ammo', x: 1765 }, { kind: 'ammo', x: 2260 }, { kind: 'ammo', x: 3250 },
    { kind: 'bottles', n: 4, x: 300 },
  ],
  companion: { kind: 'nero', start: 70, modes: ['heel', 'scout', 'warn', 'hold'], holdCd: { easy: 15, medium: 20, hard: 20, wicked: 25 } }, // NEW
  start: { x: 40, y: 170, section: 'stairs', cutscene: 'metro_intro' },
  objectives: [
    { id: 'followNero', toast: 'Nero barks at hidden things.', when: { barked: 'n1' } },                           // barked: NEW
    { id: 'hold', toast: 'Press [Hold]: Nero pins a goon.', when: { stageDone: 'followNero' } },
    { id: 'trains', toast: 'Trains still run on Line Zero. Watch Nero.', when: { heroX: '>=1320' } },
    { id: 'dive', toast: 'Dive through a gap: [Up] + [Roll].', when: { heroX: '>=1790' }, once: true },
  ],
  waves: {
    w2: { at: [700, 740, 760], roles: ['shiv', 'shiv', 'lineman'], extra: { medium: ['lineman'], hard: ['crawler'], wicked: ['crawler', 'shiv'] }, from: 'offscreen' }, // extra: NEW
    w3: { at: [860, 1000, 1080], roles: ['ratcatcher@catwalk', 'shiv', 'shiv'], extra: { medium: ['ratcatcher@catwalk'], hard: ['lineman', 'flare'], wicked: ['ratcatcher@catwalk', 'lineman', 'flare'] }, from: 'offscreen' },
    w4: { at: [1300, 1320, 1340, 1360], roles: ['shiv', 'lineman', 'shiv', 'lineman'], extra: { medium: ['shiv', 'lineman'], hard: ['shiv', 'lineman', 'firebug'], wicked: ['shiv', 'lineman', 'firebug', 'shiv'] }, from: 'offscreen' },
    w6: { at: [1620, 1720, 1780], roles: ['shiv', 'crawler@drain', 'flare'], extra: { medium: ['lineman', 'crawler@drain'], hard: ['lineman', 'crawler@drain', 'shiv', 'flare'], wicked: ['lineman', 'crawler@drain', 'shiv', 'flare', 'crawler@drain'] }, from: 'offscreen' },
    w7: { at: [1850, 1930, 2010], roles: ['ratcatcher@farLedge', 'flare@farLedge', 'shiv@farLedge'], extra: { medium: ['shiv@farLedge'], hard: ['shiv@farLedge', 'shiv@farLedge', 'shiv', 'shiv'], wicked: ['ratcatcher@farLedge', 'flare@farLedge', 'shiv@farLedge', 'shiv', 'shiv'] }, from: 'offscreen' },
    w9: { at: [2380, 2500, 2560], roles: ['shiv', 'lineman', 'ratcatcher@carB', 'shiv'], extra: { medium: ['lineman'], hard: ['lineman', 'shiv'], wicked: ['lineman', 'shiv', 'ratcatcher@carB', 'shiv'] }, from: 'offscreen' },
  },
  triggers: [
    { when: { heroX: '>=440' }, do: [{ script: 'knifeKillsLamp' }, { lights: { off: 'greenLamp' } }, { heroLamp: true }, { spawnWave: 'w2' }] }, // script, lights, heroLamp: NEW
    { when: { killed: 'w2' }, do: { arm: 'breaker' } },                                                           // arm: NEW
    { when: { event: 'breaker:hit' }, do: [{ lights: { on: 'platformTubes', flicker: 0.6 } }, { ambient: { section: 'platform', to: [0.30, 0.30, 0.26], t: 1.2 } }] },
    { when: { heroX: '>=770' }, do: { spawnWave: 'w3' } },
    { when: { heroX: '>=1000', killed: 'w3' }, do: [{ sfx: 'rat_whistle_long' }, { spawnWave: 'w4' }] },
    { when: { heroX: '>=1320' }, do: [{ heroLamp: true }, { checkpoint: 'tunnel' }] },
    { when: { heroX: '>=1420' }, do: { train: 'T1' } },                                                           // train: NEW
    { when: { heroX: '>=1600' }, do: { spawnWave: 'w6' } },
    { when: { wave: 'w6', t: '>25' }, do: { train: 'T2' } },
    { when: { heroX: '>=1790' }, do: [{ spawnWave: 'w7' }, { train: 'T3' }] },
    { when: { event: 'lane:dive', train: 'T3', weapon: 'mg' }, do: { slowmo: { scale: 0.25, t: 2.4, aimAssist: 4, freezeEnd: 0.12 } } }, // slowmo: NEW
    { when: { heroX: '>=2120' }, do: [{ checkpoint: 'yard' }, { heroLamp: false }, { music: 'metro_radio', diegetic: { x: 2230 } }] },
    { when: { heroX: '>=2300' }, do: { spawnWave: 'w9' } },
    { when: { heroX: '>=2640', killed: 'w9' }, do: [{ walls: { on: ['tinderL'] } }, { miniBoss: 'tinder' }] },     // miniBoss: NEW
    { when: { bossKilled: 'tinder' }, do: [{ walls: { off: ['tinderL', 'blastDoor'] } }, { toast: 'The blast door is open.' }] },
    { when: { heroX: '>=2870', bossKilled: 'tinder' }, do: [{ transition: { to: 'junction', fade: true } }, { checkpoint: 'junction' }, { boss: 'start' }] },
    { when: { event: 'boss:defeated', boss: 'switch' }, do: { cutscene: 'metro_outro' } },
  ],
  miniBosses: { tinder: { module: tinder, arena: { section: 'yard', x0: 2620, x1: 2860 } } },                      // NEW
  boss: { module: switchVarga, arena: { section: 'junction', x0: 2910, x1: 3590, doors: [2920, 3580] },
          intro: 'switch_intro', crew: { roles: ['shiv', 'lineman', 'ratcatcher', 'firebug'], every: 4.5, max: 9 } },
  cutscenes: { intro: 'metro_intro', outro: 'metro_outro' },
  assets: ['panel:metro_*', 'portrait:switch_*', 'portrait:elias_cold', 'music:metro*', 'music:switch*',
           'sfx:train_*', 'sfx:rail_*', 'sfx:nero_*', 'sfx:fire_*', 'voice:switch_*', 'voice:tinder_*', 'voice:rat_*'],
});
```

Boss module outline (`src/bosses/switch.js`), in the section 4.2 format:

```js
export default defineBoss({
  id: 'switch', name: 'Ilsa "Switch" Varga', title: 'Tenor of the Tunnels', look: 'switch',
  stats: { hp: 820, s: 1.0, m: 4, speed: 36, reach: 30, dmg: 14, heavyDmg: 22, poise: 18, windup: 0.3, cd: [0.6, 1.2] },
  hpByDiff: [650, 820, 950, 1080],                                                                  // NEW (or scale in defineBoss)
  intro: { pose: 'sitRail', at: 'sbBalcony', dialog: 'switch_intro', t: 1.5, then: 'lever' },
  moves: {
    lash:    string({ combos: [['lash'], ['lash', 'lash'], ['lash', 'sweep']] }),
    hook:    grab({ range: 90, windup: 0.6, pull: true, onMiss: { stuck: 1.0 } }),
    spikes:  volley({ proj: 'spike', n: [2, 3, 3, 4], fan: ['mid', 'high', 'low', 'mid'], windup: 0.5 }),
    lever:   hazard('train', { goTo: 'leverA', recover: 1.2, pickTrack: 'heroLane', p: 0.7 }),
    ram:     charge({ mover: 'handcar', v: [120, 150, 175, 200], dmg: 18, turn: 0.9 }),
    slide:   charge({ low: true, windup: 0.35, v: 260, maxT: 0.6, recover: 0.8 }),
    gantryDrop: leapSlam({ windup: 0.6, quake: null, from: 'gantry', recover: 1.2 }),
    taunt:   roar({ t: 1.0, after: 'trainHitHero' }),
  },
  phases: [
    { id: 1, moves: { lash: 0.45, hook: 0.2, spikes: 0.2, lever: 0.15 } },
    { id: 2, enter: { hpBelow: 0.6 }, onEnter: ['phaseShift:handcar'], moves: { ram: 0.45, spikes: 0.2, lash: 0.2, lever: 0.15 },
      fakeOut: [0, 'once', 0.3, 0.5] },
    { id: 3, enter: { hpBelow: 0.25 }, onEnter: ['phaseShift:jam', { cd: [0.4, 0.9], windup: 0.25 }],
      moves: { lash: 0.35, slide: 0.25, hook: 0.2, gantryDrop: 0.2 }, crew: null,
      countdown: { t: [50, 40, 35, 30], then: 'freight2310', repeat: 30 } },
  ],
  crew: { every: [5, 4.5, 4, 3.5], max: [6, 9, 12, 15], alive: [1, 2, 3, 3], roles: 'arena', quietBeforeTrain: 3 },
  secondWind: { afterKOs: 2, clearCrew: true },
  defeat: { freeze: 0.6, timeline: 'switch_rescue' },
  gimmick: railJunction,
});
```

---

## 8. Engine features this level needs (not in the engine today)

| # | Feature | One-line spec | Shared with |
|---|---|---|---|
| 1 | **Trains as lane hazards** | `trains` / `rails`: a chain of cars (loco, box, flat) moving along x on a rail in the `fight` or `back` lane; each car is a hazard body (dmg by difficulty, long knockdown, hits hero, goons and boss) and a moving one-way roof surface; gaps between cars are open; schedule by trigger; a fixed cue chain (dog, hum, horn, beam) emits `train:warn` / `train:pass`; 3D model per car type. | L7 (train roof, scrolling cars), L8 none |
| 2 | **Lane step and refuge niches** | `refuges` and arena flag `backLaneWalk`: hold Up inside a niche (or anywhere in a flagged area) to move the hero to the back lane (`LANE.BUILD`) and back; fight-lane trains pass in front; goons can use refuges too. | L7 (ducking into vestibules), L4 (tank alcoves) |
| 3 | **Lane dive through gaps** | Up + dodge near a back-lane train gap: a 0.5 s arc into the back lane; collision with a car body only while crossing; a 60 px gap magnet; lands on a `lane: 'back'` surface; emits `lane:dive`. | L7 (jump between decoupling cars) |
| 4 | **Scripted slow motion** | Director action `{ slowmo: { scale, t, aimAssist, freezeEnd } }`: sets `state.timeScale` for real-time `t`, auto-aims the current gun at up to N targets, ends in a short freeze frame; also used by boss finishers. Today slow motion is only a debug toggle. | All levels (each has a slow-motion set piece and boss freeze frame) |
| 5 | **Darkness and the coat lamp cone** | Section flag `dark`: ambient near zero; the hero carries a cone light (60 degrees, 140 px) in his facing direction; fighters outside every light draw as silhouettes with eye glints and cigarette ends; light sources: flares, fire, lanterns, headlights; both renderers. | L5 (blackout, lightning), L8 (power cuts optional) |
| 6 | **Flooded floor** | `water` zones: depth in px, move speed factor, shorter rolls, splash noise (`noise` event), floor reflections, small objects sink from view, conductive flag. | L4 (staged flood), L5 (defib puddles), L8 storm |
| 7 | **Oil slick, fuel pool and fire zones** | A zone tagged `oil`/`fuel` ignites from fire sources (brazier knocked over, lantern dropped, fire bottle, flare); fire spreads along the zone at 300 px/s, burns for a set time, hurts per second, sets fighters `burning` (panic run for goons), emits light and smoke. | L3 (kitchens), L6 (if braziers), Tinder only otherwise |
| 8 | **Third rail and live water** | A floor strip hazard with an on/off cycle and a crackle telegraph; shock = damage + stun; a `conductive` water zone becomes live when its source arcs (a Track 2 pass). | L5 (defibrillator in puddles) |
| 9 | **Nero companion AI** | A dog actor in gameplay (today only in the ending scene): `heel` (follow 25 px), `scout` (in dark sections trot 60 to 120 px ahead, stop and bark at `barkSpots` within 140 px), `alert` (growl toward hidden goons within 160 px), `warn` (whine 5 s before a train, then run to the nearest refuge), `hold` (on a new input, bite and pin the nearest goon within 120 px for 3 s; cooldown by difficulty), `shelter` (keeps 60 px off a brawl). Never takes damage; a kick makes him yelp and back off 4 s; teleports to the hero if 400 px behind. Both renderers already have dog art. | L5 (guards Mags), L6 (sniffs), L7 (stays), L8 (assist bite) |
| 10 | **Bark spots and hidden doors** | `barkSpots` and breakable `boards` (plywood, brick-board) that hide stashes, ladders and niches; a hidden ladder is not climbable until revealed (barked at, or in the lamp cone for 1 s). | L5, L6, L8 (secrets) |
| 11 | **Interactables** | Props that react to a hit or an "interact" attack: breaker (relight a group of lamps), lever (emit an event), brazier (tip over), hanging lantern (drop), read board (play an in-engine scene). | L1 (freezer lever), L8 (clock mechanisms), L7 (decouple lever) |
| 12 | **Rail trolley and boss handcar** | A rolling object locked to a rail: pushable (trolley) or driven by a boss (handcar, a `mover` with `mode: 'onTrigger'`); derails when it hits a prop or takes N heavy hits, throwing the rider. | L7 (decoupled cars, similar physics) |
| 13 | **Drip weather** | Weather `drip`: rain only in vertical columns under listed shaft x positions, with puddles below and a light shaft; a heavy variant is a waterfall that douses fire and burning fighters. | L4 (leaks), L5 (roof leaks), L6 (melt drips) |
| 14 | **Per-difficulty wave extras** | `waves.*.extra: { medium, hard, wicked }` adds roles per difficulty; spawn tags `role@surface` and `@drain` (spawn source `drain` with a rise animation). | All levels |
| 15 | **Mini-boss support** | `miniBosses` in the level and `miniBoss: true` in `defineBoss`: a small boss bar, speech-bubble barks instead of portrait dialog, local walls, no crew by default. | All levels with an elite fight |
| 16 | **Boss countdown meter** | A timed hazard in a phase (`countdown`) with a HUD bar under the boss bar and audio ticks; on zero it fires a scripted hazard and can repeat. | L8 (quarter-hour chimes) |
| 17 | **New projectiles** | `spike` (flat, fast, sticks in walls), `firebottle` (arc, fire patch), `flare` (slow arc, burn + temporary light). | `spike` none; `flare` L6 (police flares) |
| 18 | **Story items** | A pocket slot for non-weapon story objects (Bell's door bell, the Orfeo chip) shown in the results card and later cutscenes. | All levels (hooks) |
| 19 | **Diegetic music source** | A music cue tied to a world position (the radio), panned and filtered by distance, that the level score ducks under. | L3 (casino band), L6 (gala orchestra) |

Rule from the project memory: all of this is shared sim and painter code, so 2D and 3D stay in sync. Only the 3D models (train cars, handcar) are 3D-only.

---

## 9. Art and audio asset list

### 9.1 Comic panels (`assets/art/panels/metro/`, 1024 x 576)

| Id | Content |
|---|---|
| `panel:metro_intro_01` | Top-down, hero and Nero on broken tiled stairs, rain column, Ligne 0 poster |
| `panel:metro_intro_02` | Dead platform, green work lamp, crowned-rat graffiti, oily water |
| `panel:metro_intro_03` | Close-up of Nero growling at a tunnel mouth, hero's hand on his back |
| `panel:metro_intro_04` | Eyes and cigarettes in a tunnel, a knife flying at the camera |
| `panel:metro_outro_01` | Freight headlights behind; hero drags Switch off the rails |
| `panel:metro_outro_02` | Close-up: gold Orfeo chip "Reserved: the Count" in a shaking palm |
| `panel:metro_outro_03` | Signal box, hero holding a Bell & Sons clock at 3:17 |
| `panel:metro_outro_04` | Hero rising from a vent grate, Nero behind, Orfeo across the river |
| `panel:metro_outro_05` | Payphone ringing by the grate; cut-in of Hale in a booth |

### 9.2 Portraits (`assets/art/portraits/`, 512 x 512) and character references

- `portrait:switch_manic` (laughing, goggles up), `portrait:switch_proud` (spinning chain, grin), `portrait:switch_wild` (hand on lever, eyes wide), `portrait:switch_beaten` (goggles gone, bloody lip; for the results card and later callbacks).
- `portrait:elias_cold` (exists from Level 1).
- Optional: `portrait:tinder_grin` for the mini-boss name card.
- Character references: `art/characters/switch/ref.png`, `art/characters/tinder/ref.png`, plus the Tunnel Rat look sheet (hoodie, vest, gas mask, oilskin variants).

### 9.3 Backdrops and painters

- `bg:metro_tiles` (cream and green tile walls), `bg:metro_tunnel` (brick vault, cables), `bg:metro_yard` (cavern with dead cars far away), `bg:metro_junction` (cavern, portals).
- Code painters: tiled wall, station name plate, poster board, ticket booth, track bed, tunnel arch, refuge niche, cable runs, emergency lamp, metro car (dead), gantry crane, blast door, signal box (with the 3:17 clock), signal head, lever frame, third rail, catwalk, ladder.
- 3D models (`render3d/models/metro/`): loco, boxcar, flatcar, dead 1930s metro car hull, handcar, rail trolley.

### 9.4 Music (`assets/audio/music/`)

| Id | Use | Notes |
|---|---|---|
| `music:metro` | Exploration | D minor drone, drips, distant trumpet motif |
| `music:metro_fight` | Fight layer (stems over `metro`) | Brushed snare, upright bass ostinato, trash-can hits |
| `music:metro_radio` | Breather (diegetic radio) | Old French jazz ballad, vinyl crackle, mono |
| `music:tinder` | Mini-boss | Fight layer plus a crackling fire bed and a low brass figure |
| `music:switch` | Boss phases 1 and 2 | 152 bpm punk-industrial, train-rhythm drums, horn stings in D and A |
| `music:switch_p3` | Boss phase 3 | Faster, a rising riser locked to the countdown, tick track |
| `music:metro_outro` | Outro panels | Solo trumpet, rain, a far train fading |

### 9.5 Sound effects (`assets/audio/sfx/`)

- Trains: `sfx:train_hum`, `sfx:train_horn_far`, `sfx:train_horn_near`, `sfx:train_pass_loop`, `sfx:train_clatter`, `sfx:train_brake_squeal`, `sfx:train_coupling_clank`, `sfx:train_wind`.
- Rail: `sfx:rail_lever_clunk`, `sfx:rail_signal_flip`, `sfx:rail_third_arc`, `sfx:rail_third_hum`, `sfx:rail_shock_hit`, `sfx:handcar_pump`, `sfx:handcar_bell`, `sfx:handcar_derail`, `sfx:trolley_roll`.
- Boss: `sfx:chain_whip`, `sfx:chain_rattle`, `sfx:chain_hook_stick`, `sfx:spike_throw`, `sfx:spike_impact`.
- Fire: `sfx:fire_ignite_oil`, `sfx:fire_whoosh`, `sfx:fire_loop`, `sfx:fire_bottle_smash`, `sfx:fire_douse_hiss`, `sfx:flare_shot`, `sfx:flare_burn`.
- Water and space: `sfx:water_wade`, `sfx:water_splash`, `sfx:drip_loop`, `sfx:vent_rain`, `sfx:waterfall_loop`, `sfx:tunnel_room_tone`, `sfx:steam_hiss`.
- Light: `sfx:lamp_click`, `sfx:lamp_shatter`, `sfx:breaker_clunk`, `sfx:tubes_on_hum`.
- Nero: `sfx:nero_bark`, `sfx:nero_bark_double`, `sfx:nero_whine`, `sfx:nero_growl`, `sfx:nero_bite`, `sfx:nero_yelp`, `sfx:nero_drink`.
- Rats: `sfx:rat_whistle_short`, `sfx:rat_whistle_long`, `sfx:rat_squeak_amb` (real rats in the walls).
- Story: `sfx:board_break`, `sfx:chalk_scrape`, `sfx:brass_bell_ting` (Bell's door bell), `sfx:payphone_ring`, `sfx:slowmo_in`, `sfx:slowmo_out`.

### 9.6 Voice (`assets/audio/voice/`)

- `voice:switch_intro_01..03`, `voice:switch_ride`, `voice:switch_lever_bail`, `voice:switch_jammed`, `voice:switch_mindgap`, `voice:switch_mycar`, `voice:switch_outro_02`.
- `voice:tinder_intro`, `voice:tinder_doused`, `voice:tinder_defeat`.
- `voice:rat_lightsout`, `voice:rat_sandman`, `voice:rat_train`, `voice:rat_freight`, `voice:rat_2310` (each with 2 to 3 takes).
- `voice:hale_metro_outro`, `voice:elias_*` (short lines: "You lit it.", "Who paid?", "I know.", "Loud. Like you.").

---

## 10. As built (first pass, 2026-10-07)

Code: `src/levels/metro/` (`data.js` map and numbers, `paint.js` art, `run.js` the run, `three.js` the 3D blocks), `src/bosses/tinder.js`, `src/bosses/switch.js`. The game calls the run's hooks (`LVH` in `src/legacy.js`; `isLv('metro')`).

### 10.1 The folded map (world 2800 x 320, like Pier 9)

| Section | x | What is there |
|---|---|---|
| `stairs` | 0-300 | Mezzanine (y 170, x 0-120, the start), a stair flight of 27 treads (x 120-228), grates at x 56, 262, the poster board stash N1 (x 288) |
| `platform` | 300-1000 | Booth (roof y 236), green work lamp (x 420), breaker (x 560), relay hut (x 598-634, roof y 228), catwalk (y 170, x 640-862), flooded floor, oil slick (x 780-990), brazier (x 762), lantern (x 912) |
| `tunnel` | 1000-1640 | Niches at x 1120, 1222 (boarded, N3: shotgun), 1320; cable catwalk (y 196, x 1048-1182); drains x 1270, 1372; the Choir toolbox N4 (x 1402: machine gun); track 2 and the far ledge (y 240, x 1462-1622) |
| `yard` | 1640-2414 | Camp car A (roof y 204, x 1684-1904, job board, Bell's door bell, fire axe), car B (roof y 210), Tinder's arena 2104-2410 (fuel pool 2200-2290, waterfall x 2338), blast door x 2414 |
| `junction` | 2436-2800 | The boss arena (the game's "club"): balcony y 190 x 2450-2532 (lever A x 2476), cabinets A (x 2538-2562) and B (x 2778-2798), gantry y 182 x 2642-2772, niches x 2600 and 2690 (the back lane), third rail 2610-2660 and 2712-2750, wet zone 2596-2764, lever B x 2770, portals x 2440 and 2796 |

Checkpoints: the start, the tunnel (x 1004), w6 (the tunnel fight), the yard (x 1660), the junction (the boss door).

### 10.2 The new verbs, on the existing keys

| Verb | Keys | Notes |
|---|---|---|
| Step into a refuge niche | ↑ by a niche (on the floor) | ← or → (or an attack) steps out. In the tunnel a niche is safe from track 1. In the junction the niches are the back lane: safe from track 1, hit by track 2 |
| Dive through a freight's gap | ↑ + Space (or Space in a jump) by a gap of the train on track 2 | A 60 px magnet; slow motion; with a gun he fires at up to 4 Rats on the far ledge; he lands on the far ledge |
| Pull lever B (junction) | Q or W by it | The next train runs on track 1; on her handcar Switch bails and the car is smashed |
| Hit the breaker | Q or W by it | After the lights-out wave; the tubes come back |
| Light the slick | Hit the brazier (a blow, a shot or a thrown thing knocks it over); or hit the lantern with a bottle, a thrown weapon or a shot; a Firebug's bottle or a flare lights it too | |
| Break a stash | Hit the board or the box (a shot works too) | Nero barks at it first |
| "Nero, hold!" | (automatic) | When the hero has a goon in the clinch, Nero pins another one within 120 px for 3 s; cooldown 15/20/20/25 s. He pins Switch once a phase for 1.2 s when she is getting her breath back near him |

No new key, no sign over anyone. Train warnings read from the world: Nero stops and whines (5 s), the rail hum and the portal's glow (3.5 s), the horn (2.5 s), the headlight (1.2 s); in the junction the signal head over the portals (amber = track 1, cyan = track 2) and a stripe on the track's floor.

### 10.3 Asset names (stable: the panel and portrait generator uses these)

- Panels (`assets/art/panels/metro/<id>.png`, 1024 x 576): `metro_intro_01`, `metro_intro_02`, `metro_intro_03`, `metro_intro_04`, `metro_outro_01`, `metro_outro_02`, `metro_outro_03`, `metro_outro_04`, `metro_outro_05` (script ids `panel:metro_intro_01` ...).
- Portraits (`assets/art/portraits/<id>.png`, 512 x 512): `switch_manic`, `switch_proud`, `switch_wild`, `switch_beaten`, `tinder_grin` (and the existing `elias_cold`).
- Cutscene scripts: `assets/cutscenes/metro_intro.json`, `tinder_intro.json`, `switch_intro.json`, `metro_outro.json`.
- Voice ids: see `docs/audio.md` section 11.

### 10.4 Not done in this pass

- Trains are hazards only: no riding on car roofs; the yard's rail trolley is not there (its props are plain crates and barrels).
- The camera does not lean toward a coming train; the music does not duck under a pass; the diegetic radio is not there.
- Darkness: low ambient, the coat lamp as a pool ahead of him, eyes and cigarette embers on goons far from light; no true cone, no silhouettes.
- The hidden ladder (N2) and the pushable step crates are not there (the relay hut is the step to the catwalk).
- The Crawler's rise has no "only low attacks hit it" rule. Ratcatchers do not leave throwing knives. Story items (the door bell, the chip) are a toast and a line on the results card only.
- Switch: no fake-out cue beyond the clunk, the flip and Nero's double bark; the gantry drop is the shared jump slam; she dodges trains by leaping to the nearest high place.
- 3D: the trains and the handcar are models; everything else derives from the 2D painters.
