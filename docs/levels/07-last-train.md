# Level 7: "Last Train from Valmora"

Level plan. Sources: `docs/story-bible.md` (section 3, Level 7, and section 4, The Twist) and `docs/architecture.md` (section 3, level format; section 4, boss framework). Level id: `train`. Order: 7. Palette: `train`.

---

## 1. Summary

**Story beat.** Hale's notebook said: *"Meridian Express, 23:40, Platform 9. The Board leaves with the ledgers."* Elias boards the Board's armoured private train. He wants the ledgers and the Maestro's name. He fights back through the train, car by car. In panic, the Board cuts their own cars loose from the locomotive to escape him. He jumps the gap over the Vargas Dam. The Board surrenders without a fight. They confirm that "Silent Night" was real, and they see what Elias does not: someone fed him their names, in order. Lenz, the Conductor's blade, waits on the roof of the runaway tail. After Lenz falls, the last car holds a perfect copy of Bell's workshop, and Bell's voice on a gramophone. **The main twist lands here: Bell is alive, and he is the Conductor.**

**What the player learns.** The traitors were real. Someone used Elias to remove them. Only one man ever corrected his left guard.

**Setting.** The Meridian Express: black armoured cars with gold trim, gold "M" crests, riveted steel shutters. It leaves Valmora Central at 23:40, climbs into the mountains, crosses the **Vargas Dam viaduct** (a curved concrete dam 120 m high, with a rail viaduct along its crest), then runs down a long grade through tunnels and rock cuttings to the valley floor. From the valley, the Meridian Spire is visible on the horizon.

**Train order (front to rear):** locomotive, baggage car, dining car, sleeper A, sleeper B, glass dome observation car, vault car, last car (private, sealed).

**Route of play.** The hero boards at the FRONT (on the baggage car behind the locomotive) and fights toward the REAR. The last car is the goal and the reveal. (This refines the bible's panel 4, where he jumped onto the last car's rear platform. The change puts the workshop at the end of the route.)

**Time / weather.** 23:40 to about 00:20. A gale with heavy slanted rain. Lightning over the dam. Lightning rate increases toward the boss.

**Mood.** Speed, noise and pressure, then silence. The first nine-tenths are the loudest level in the game: wheel clatter, gunfire, wind. The last minute is the quietest: a stopped car, rain on the roof, a scratchy record.

**Length target.** 10 to 11 minutes on Medium (8 minutes for a fast player on Easy, 12 minutes on Wicked). Budget per beat is in section 3.

**Music and sfx mood.**
- **Main cue (`music:train`):** dark noir jazz over a driving rail rhythm. The kick drum doubles the rail-joint clatter (about 140 BPM, 4/4). Muted trumpet and low strings. It drops to bass and percussion during tunnels.
- **Dining-car slow motion (`music:train_aisle`):** the main cue pitched down and slowed by the time scale; one sustained string chord.
- **Boss cue (`music:lenz`):** a strict waltz (3/4) for solo violin and string quartet, with a metronome click in the mix. One stem per phase at 84, 104 and 126 BPM. The sim beat clock is the master; the music follows it (section 5).
- **Ending (`music:train_outro`):** no score. Rain, the brake hiss, then a 1930s gramophone waltz under Bell's voice.
- **Sound rules:** the wheel clatter never stops while the train moves. Inside, it is muffled. On the roof, it is loud and mixed with wind. In a tunnel, all sound becomes a pressure roar for the tunnel's length. A signal bell rings before each gantry. The locomotive whistle blows before each tunnel.

---

## 2. Sections map

World: `W 3600, H 320, groundY 280`. 22 px = 1 m. In roof sections, y 280 is the roof surface of the cars. In interior sections, y 280 is the car floor and the ceiling is at y 180.

**Direction convention.** Strip x increases toward the REAR of the train. The train moves toward -x. So the backdrop scrolls toward +x, the wind blows toward +x (into the hero's back as he moves forward through the level), and tunnels and gantries come from the left edge of the screen.

### 2.1 Physical train vs. strip

```
PHYSICAL TRAIN (side view, moving <<< left)

 [LOCO]==[BAGGAGE]==[DINING]==[SLEEPER A]==[SLEEPER B]=//=[ DOME (*) ]==[ VAULT ]=~=[LAST CAR]
  armour   hatch      aisle     corridor     roof only    cut      glass dome     safe    chain   workshop
                                                         HERE                             (ph.3)

STRIP (x ->, each box is a section; doors/hatches/ladders join them)

 x 0      400 420     760 780        1200 1220     1580 1600                  2280 2300      2620 2640  2820 2840                    3420 3440  3600
   |roof_front| |baggage | |dining+kitchen| |sleepers   | |roof_mid  (dam viaduct)| |dome (glass)| |vault | |roof_boss (Lenz)        | |workshop|
   | outdoor  | | indoor | |  indoor      | |  indoor   | |  outdoor               | |  glass     | |indoor| |  outdoor                | | indoor |
        hatch v    door >      door >         window ^          drop through glass v    door >   ladder ^          rear platform > door
```

### 2.2 Roof profile (roof sections, side view)

```
 y                       TUNNEL CEILING (dynamic, y 250)        GANTRY BEAM (y 236-262, sweeps +x)
 180  ~ ~ rain slant ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ >>> wind
 250  =============================== (only inside a tunnel) ===========
 262        _vent_          _vent_         ladder|                  _lantern(3:17)_
 280  ======roof A===========|30px gap|======roof B=====|gap grows|=====dome stub====...
 300  .. car bodies, windows (painted) ..        .. viaduct deck / void below: killY 316 ..
```

### 2.3 Section table

| id | x0-x1 | Type | Backdrop | Lighting | Weather | Camera |
|---|---|---|---|---|---|---|
| `roof_front` | 0-400 | Outdoor, roof of baggage car. Locomotive tender is a wall at x 0-20. | Scroll: storm sky, Valmora lights falling away, mountain foothills, track bed. | Dark blue ambient [0.30, 0.34, 0.50]. Firebox glow (amber, flicker) at x 10. Lightning flashes. | `gale` (rain k 0.8) | minZoom 0.45, maxZoom 0.7. Lead 40% to the left (hazards come from the left). |
| `baggage` | 420-760 | Indoor. Mezzanine of stacked crates at y 236. Open sliding side door at x 600-660 (front lane). | Window view: scroll (mid and near layers) through the side door and two barred windows. | Caged work lamps [0.42, 0.40, 0.36]. Swinging bulb at x 590. | None inside. Rain and wind blow in through the side door (wind zone x 580-680). | Bounds 420-760. Fixed zoom 0.7. |
| `dining` | 780-1200 | Indoor. Aisle 780-1120; galley kitchen 1120-1200. | Window view through 6 windows (panes). | Warm amber [0.55, 0.42, 0.30]. 3 chandeliers. Table lamps. | Wind enters through each broken window pane. | Bounds 780-1200. Zoom 0.55 for the slow-motion wide shot, 0.7 after. |
| `sleepers` | 1220-1580 | Indoor. Side corridor along the windows. Compartment doors in the wall lane. | Window view. | Dim blue night lamps [0.28, 0.32, 0.45]. Each open compartment spills amber light. | None. | Bounds 1220-1580. Zoom 0.75 (narrow, claustrophobic). |
| `roof_mid` | 1600-2280 | Outdoor. Roofs of sleeper A and sleeper B, and the front stub of the dome car (a mover). | Scroll sequence: rock cutting, the Vargas tunnel, then the **Vargas Dam** (dam wall, spillway jets, lit turbine house 120 m below, reservoir under lightning). | Blue-black [0.26, 0.30, 0.46]. Lightning every 5-9 s. Dome car glows gold ahead. | `gale` (rain k 1.0), strong gusts on the dam. | minZoom 0.4, maxZoom 0.65. Widens to 0.4 during the decouple. |
| `dome` | 2300-2620 | Indoor under a glass dome (ceiling panes y 150-196). Bar counter in the wall lane at 2530-2610. | Through the glass: the front train's red tail lamps pulling away; the dam behind. | Cold [0.36, 0.40, 0.52]. Red bar glow at 2570. Lightning through glass. | Each broken pane adds rain and wind in its x-range. | Bounds 2300-2620. Zoom 0.6. |
| `vault` | 2640-2820 | Indoor. Armoured. Safe in the wall lane at 2720. | No windows. Steel shutters. | Green banker's lamp [0.30, 0.40, 0.32]. | None. | Bounds 2640-2820. Zoom 0.75. |
| `roof_boss` | 2840-3420 | Outdoor. Vault car roof 2850-3110; gangway plate 3110-3140; last car roof 3140-3360 (a mover in phase 3); rear platform and brake wheel at 3360-3400. | Scroll by phase: ph.1 the last viaduct span with the dam behind; ph.2 rock cuttings and tunnels on the downgrade; ph.3 the valley floor, the **Meridian Spire** on the horizon. | [0.28, 0.32, 0.50]. Roof-lantern glow at 3330. Lightning on bar lines in ph.3. | `gale` (rain k 1.0). | Bounds 2840-3420. Zoom 0.5. Lead left before each hazard. |
| `workshop` | 3440-3600 | Indoor. Copy of Bell & Sons workshop. | One window: valley, the Spire. Speed 0 (train stopped). | Warm amber [0.62, 0.48, 0.32]. Pipe smoke. | Rain on the roof (sound only). | Bounds 3440-3600. Zoom 0.85. Slow push-in. |

**Train speed (scroll speed of the near layer).** Base speed 600 px/s (about 98 km/h). Parallax factors: track bed and posts 1.0, poles and rocks 0.5, mountains 0.08, dam 0.2, storm sky 0.01, the Spire 0.002. Interiors show the same scroll through windows. After the Board cuts the tail section loose, the tail is a runaway on the downgrade: speed 520 px/s at the dam, then 600, 690 and 780 px/s across boss phases 1-3. At the end, the hand brake brings it to 0 over 6 s.

**Train motion feel.** Every rail joint (each 0.43 s at 600 px/s) gives a 1 px camera bob and a "clack" sfx. Curves give a **lurch** event (section 8): loose objects and unbraced actors slide 12-20 px toward +x.

---

## 3. Encounter flow

Difficulty names: Easy (E), Medium (M), Hard (H), Wicked (W). Counts are written as E/M/H/W. Faction skins: **Usher** (pistol), **Gunner** (machine gun), **Doorman** (brawler), **Steward** (knife or plate thrower). See section 4.

Checkpoints: CP1 start, CP2 dining door, CP3 roof_mid start, CP4 dome landing, CP5 vault (before the boss).

### Beat 1. "Platform's End" (boarding)
- **Location:** `roof_front`, x 20-400. Time: about 45 s.
- **Enemies:** Ushers on the roof: 1/2/2/3. On Wicked, add 1 Doorman who climbs up at x 380.
- **Props / pickups:** 2 roof ventilators (x 140, 290) as low cover (crouch behind them to block pistol shots). A coal shovel on the tender (x 30): a light carry object to throw. No guns yet.
- **Environment:** The **first signal gantry** passes 6 s after control starts. Toast: "GANTRY. Hold DOWN." Gantry 2 comes at 20 s. A goon who stands in its path is swept off the train (kill). Firebox glow at the left. The lights of Valmora fall away in the backdrop.
- **Starts:** the end of the intro cutscene. The hero drops from the platform footbridge onto x 40 (scripted landing, 0.4 s slow motion).
- **Ends:** wave `r1` killed and heroX >= 370. Prompt at the roof hatch (x 380). DOWN on the hatch: transition to `baggage`.
- **Why it is exciting:** the first two seconds teach the level: speed, wind, a beam out of the dark. The first kill can be a gantry kill.

### Beat 2. Baggage car
- **Location:** `baggage`, x 420-760. Time: about 70 s.
- **Enemies:** wave `b1` at entry: Doormen 1/2/2/2 + Ushers 1/1/2/2. Wave `b2` from the rear gangway door (x 750) when `b1` is half dead: Ushers 0/1/1/2, Doormen 1/0/1/1.
- **Props / pickups:** 6 crates (push, stack to reach the crate mezzanine at y 236), 4 mail sacks (soft, light throw), 3 iron ledger boxes (heavy carry, 30 dmg throw), a caged crate of Choir coins (break the cage: +score only). Fire **axe** on a wall bracket at x 520 ("In case of fire"). Ammo box at x 700 (for later guns). Bandage at x 455 on Easy and Medium only.
- **Environment:** the **open side door** at x 600-660 (front lane). An enemy knocked or thrown into the front lane there is ejected off the train (kill, with a falling scream). A Doorman can try to throw the hero out: the hero catches the door frame (existing ledge hang) and climbs back in, at 15 dmg. A **lurch** at 30 s slides crates and staggers goons who are mid-attack. Nero waits here; he jumped in through this door at the station. From now on, "Nero, hold!" works in every interior.
- **Starts:** `section:enter baggage`.
- **Ends:** `b2` killed. The gangway door to the dining car unlocks.
- **Why it is exciting:** a heavy-object brawl with an open door to the void. The axe and the side door reward aggressive positioning.

### Beat 3. The Dining Car Aisle (slow-motion set piece 1)
- **Location:** `dining`, aisle x 780-1120. Time: about 90 s.
- **Enemies:** wave `d1`: "diners", Ushers seated at tables in grey suits with napkins: 3/4/5/6. They stand and draw together when the hero is 40 px inside.
- **Props / pickups:** 8 tables (4 in the wall lane, 4 in the front lane), each with 2 bottles (pocket and throw) and plates. A dessert trolley at x 900 (push; it rolls by itself in a lurch: 20 dmg to anyone it hits). A champagne bucket at x 1000 (throw: knockdown). 3 chandeliers at x 860, 960, 1060, y 196 (shoot or hit with a thrown object: it falls, 25 dmg and knockdown within 20 px). 6 window panes (`kind: 'window'`, hp 20). Ammo box under the bar at x 1100.
- **Environment:** **Scripted slow motion.** The time scale goes to 0.35 for 2.5 s of real time. It starts on the hero's first dodge roll, first shot or first throw after the Ushers stand, or after 0.6 s, whichever comes first. A prompt "ROLL" shows on Easy. Shot windows shatter, the gale enters, and tablecloths and napkins fly toward +x. At 40 s, **the train enters a tunnel**: the interior lamps go out for 2.5 s; only muzzle flashes, sparks at the windows and the chandeliers' sway light the car.
- **Starts:** heroX >= 820.
- **Ends:** `d1` 60% dead: wave `d2` starts (Beat 4).
- **Why it is exciting:** this is the poster image of the level: a dive down a dining aisle in slow motion, with glass, champagne and a chandelier coming down.

### Beat 4. The Galley
- **Location:** `dining` kitchen, x 1120-1200. Time: about 30 s (it overlaps Beat 3).
- **Enemies:** wave `d2`: Stewards from the galley door: 1/2/2/3 (knife), plus Steward plate-throwers 0/0/1/1.
- **Props / pickups:** a cleaver rack at x 1150 (machete pickup). Pots (carry, throw). A steam valve at x 1180 (hit it: a steam jet for 2 s, 6 dmg per 0.25 s, blinds goons). A bandage at x 1190.
- **Environment:** a tight space. Steam. A second lurch slides the pots.
- **Starts:** `d1` 60% dead.
- **Ends:** `d1` and `d2` killed. The galley door to the sleepers opens. CP2.
- **Why it is exciting:** a change of rhythm after the gunfight: close knife work with improvised weapons.

### Beat 5. Sleeper Corridor (first Gunner)
- **Location:** `sleepers`, x 1220-1580. Time: about 75 s.
- **Enemies:** a **Gunner** at x 1550, behind an overturned luggage trolley: 1/1/1/2 (the second Gunner on Wicked comes out of compartment 6 after the first dies). Ushers from compartments: 2/2/3/3. Doormen: 0/1/1/2.
- **Props / pickups:** 6 compartment doors in the wall lane (x 1260, 1310, 1360, 1410, 1460, 1510). An open compartment is cover: step into the wall lane to leave the corridor's line of fire. Luggage on the corridor floor (suitcases: light throw). **Shotgun** with 6 shells in the conductor's emergency cabinet at x 1570. Ammo box at x 1565.
- **Environment:** the corridor is one long sightline. The Gunner's bursts shred the wall panels and the windows (cosmetic) as he sweeps. Nero scratches at compartment 3 (x 1360): inside are a bandage and a gold Choir coin. The killed Gunner drops his **machine gun** (60 rounds).
- **Starts:** `section:enter sleepers`. The Gunner opens fire after a 1.2 s wind-up (E 1.6 s).
- **Ends:** all killed. The gangway door at x 1580 is chained shut from the far side. The prompt points to the end window: UP to climb out onto the roof. Transition to `roof_mid`. CP3.
- **Why it is exciting:** a cover-to-cover hallway shootout. The reward is the machine gun and the shotgun, which the next two beats show off.

### Beat 6. Roof Run over the Vargas Dam
- **Location:** `roof_mid`, x 1600-2050 (sleeper A roof 1600-1850, a fixed 30 px car gap at 1850-1880, sleeper B roof 1880-2050). Time: about 60 s.
- **Enemies:** wave `rm1`: roof Ushers who climb the car-end ladders (x 1845, 1885, 2045): 2/3/4/5. Gunner on sleeper B roof at x 2030: 0/1/1/1. Doorman 0/0/1/1.
- **Props / pickups:** roof vents at x 1700, 1960 (cover). Ammo box strapped to the vent at x 1960. A loose tarpaulin (cosmetic, it blows off in the first gust).
- **Environment:**
  - **The Vargas tunnel** arrives 3 s after the hero reaches the roof (whistle at -1.5 s). It lasts 3.5 s. Inside, the dynamic ceiling forces a crouch or crawl. A crouched Usher crawls toward the hero for a knife-low fight in the dark; use low attacks and sweeps.
  - **Out of the tunnel: the dam.** The camera widens to 0.4. The backdrop shows the dam wall, the spillway and the 120 m drop. Gusts double the wind force for 1.5 s (a howl 0.8 s before).
  - **Gantries** at 12 s and 26 s after the tunnel. Ushers who stand get swept off.
  - **The car gap** at 1850-1880: a run-jump. The wind helps toward +x.
- **Starts:** `section:enter roof_mid`.
- **Ends:** `rm1` killed and heroX >= 1990: the decouple starts (Beat 7).
- **Why it is exciting:** the vista. Machine gun on a train roof above a dam in a gale, while ducking beams.

### Beat 7. "Cut the Car!" (slow-motion set piece 2, the bible's set piece)
- **Location:** `roof_mid`, x 1990-2280. Time: about 20 s.
- **Enemies:** on the dome car's front stub (mover, x 2070-2170 at start): Ushers 2/2/2/3, Gunner 0/0/1/1.
- **Props / pickups:** none new. The shotgun from Beat 5 (if the hero dropped it, a second shotgun lies at x 1995).
- **Environment:** Judge Kern's voice on the train speaker: "Cut it! Cut us loose!" Two Ushers kick the coupling pin out (visible at x 2060). The Board's tail (dome, vault, last car) **drops back**. The stub mover moves toward +x: the gap grows from 20 px to 120 px over 4 s (E 6 s, max 100 px; M 5 s). When the hero leaves the roof over the gap with the gap >= 50 px, **slow motion**: time scale 0.3 for 1.6 s real. The hero can fire the shotgun in mid-air (2-3 shots; each shot's recoil pushes him back 6 px). Below him: the viaduct arches and the spillway, lit by lightning.
- **Starts:** `rm1` killed and heroX >= 1990.
- **Ends:** the hero lands on the stub and the stub Ushers are dead, or 8 s pass: the dome glass under his feet cracks (two creaks, then it breaks). The hero falls into the dome car: transition to `dome` (no fade; a fall cut). CP4.
- **Fail:** if the hero falls into the gap: on E/M, he restarts at x 1990 with 30 dmg and the gap reset; on H/W, he restarts at CP3.
- **Why it is exciting:** the jump is the level's signature stunt: a widening gap, a 120 m drop, slow motion and a shotgun.

### Beat 8. The Glass Dome (elite fight: Head Usher Grau)
- **Location:** `dome`, x 2300-2620. Time: about 90 s.
- **Enemies:** **Head Usher Anton Grau** (mini-boss, section 5.8), plus his crew (Ushers from the rear door at x 2615, every 8 s, max alive 1/2/2/3).
- **Non-combatants:** the Board, behind the bar in the wall lane (x 2540-2600): **the Mayor**, **Judge Orsolya Kern**, **Cornelius Aldane**. They cower and cannot be targeted.
- **Props / pickups:** observation armchairs (carry, throw), a drinks cart (push), bottles on the bar (pocket), a bandage at x 2320. A **Bell & Sons** clock over the bar, stopped at **3:17** (twist rule: one in every boss arena).
- **Environment:** 12 dome panes overhead (`kind: 'roof'`, hp 15, `onBreak: 'shards'`). Every missed bullet that rises hits a pane. Each broken pane lets rain and wind into its x-range and drops shards (6 dmg, floor telegraph circle 0.5 s). Lightning lights the car through the glass. Through the dome, the front train's red tail lamps pull away and vanish into a tunnel.
- **Starts:** the fall into the car. 1 s slow motion on the landing (the hero lands on a table, which breaks). Short portrait bark (section 6.2), then the fight.
- **Ends:** Grau defeated (slow-motion freeze frame). The remaining crew drop their guns and kneel.
- **Why it is exciting:** an elite gunfight inside a glass bubble that shatters more with each burst, with the city's rulers watching from behind the bar.

### Beat 9. The Board Surrenders
- **Location:** `dome`, x 2540. Time: about 40 s.
- **Enemies:** none.
- **Environment:** an in-engine scene with portrait dialog (section 6.3). The hero holsters his weapon automatically; attack input is locked. Aldane slides the **vault key** across the bar (pickup). The metronome starts ticking, faintly, from the roof above.
- **Starts:** Grau defeated.
- **Ends:** the dialog ends. The rear door (x 2615) opens into the vault car.
- **Why it is exciting:** the payoff of six levels of chasing "the Board". They are small, scared people. Aldane's line plants the doubt that the twist confirms.

### Beat 10. The Vault (breather)
- **Location:** `vault`, x 2640-2820. Time: about 30 s.
- **Enemies:** none.
- **Props / pickups:** 2 bandages (x 2660, 2800), 2 ammo boxes, a **katana** on a display stand (x 2700, a Choir ceremonial blade), a shotgun in the wall rack. The **Silent Night ledger** (objective item) in the open safe at x 2720. A second Bell & Sons clock on the safe door, stopped at 3:17.
- **Environment:** a quiet car. The metronome is clearly audible through the roof: 84 BPM, three ticks per bar. Nero lies down by the safe and stays. A ladder at x 2810 goes up to the roof. CP5 (boss checkpoint).
- **Starts:** `section:enter vault`.
- **Ends:** UP on the ladder: transition to `roof_boss`, then the boss intro.
- **Why it is exciting:** the quiet before the duel. The player can hear the boss's rhythm before they see him.

### Beat 11. Boss: Viktor Lenz, "First Violin"
- **Location:** `roof_boss`, x 2850-3400. Time: 3 to 4 minutes.
- Full design in section 5.
- **Starts:** `section:enter roof_boss`: Lenz intro (portrait dialog 6.4).
- **Ends:** `boss:defeated`: the defeat sequence (5.7), then Beat 12.

### Beat 12. The Brake and the Last Car
- **Location:** `roof_boss` rear platform (x 3380) then `workshop`, x 3440-3600. Time: about 60 s with panels.
- **Enemies:** none.
- **Environment:** end panels 1-2 play. The hero climbs down to the rear platform. Prompt: hold UP at the brake wheel (2 s). The scroll speed falls from 780 to 0 over 6 s, with sparks and a brake squeal. Silence, then rain. The last car's door clicks open by itself. The hero walks into the workshop: every clock is stopped at 3:17, a pipe smokes on the bench, Nero (who came across from the vault car) growls at the gramophone. When the hero reaches x 3540, the needle drops by itself (a tripwire) and end panels 3-5 play.
- **Ends:** the outro ends: `run:over` (win).
- **Why it is exciting:** the loudest level ends in silence, and the twist plays in-engine first, so the player stands in the room when the voice starts.

**Time budget (Medium):** B1 0:45, B2 1:10, B3+B4 2:00, B5 1:15, B6 1:00, B7 0:20, B8 1:30, B9 0:40, B10 0:30, B11 3:30, B12 1:00. Total about 13:40 including cutscenes; about 10:30 of play.

---

## 4. The Ushers (faction for Level 7)

The Board's private guards. Grey three-piece suits, grey gloves, a white carnation, an earpiece, and a small brass tuning-fork lapel pin. They are disciplined and quiet. They do not taunt. They whisper "Sandman" into their earpieces.

### 4.1 Variants

| Variant | Base role | Look | Behaviour change | Drops |
|---|---|---|---|---|
| **Usher** | `pistol` | Grey suit, carnation, earpiece | Keeps 120-200 px from the hero. Fires paired shots. Uses a **cover** prop when one is within 40 px (crouches behind it; shots over it miss). Steps back when the hero closes to 50 px. | Ammo (small, 15% chance) |
| **Gunner** | `gunner` (NEW role) | Grey waistcoat, sleeves rolled, drum-magazine machine gun, ear defenders | Plants his feet (1.2 s wind-up: the drum rattles, a red glow at the muzzle, `boss:telegraph`-style mark on the lane). Fires a **sweeping burst**: 10 rounds over 1.0 s, 7 dmg each, aimed along the lane from low to high. Then reloads for 2.2 s (punish window). Moves slowly (60% speed). A heavy hit or a thrown object during the wind-up cancels it. | Machine gun (60 rounds) |
| **Doorman** | `brawler` | A huge man in a grey greatcoat and white gloves | Grab-and-throw. Near an eject zone (side door, car gap), he throws toward it. Shoulder charge 1.5 s cooldown. | None |
| **Steward** | `knife` | White waiter jacket, grey trousers, carving knife | Dining car and galley only. Quick lunges. | None |
| **Steward (plates)** | `thrower` | Same, with a stack of plates | Throws plates (knife projectile reskin, 8 dmg, breaks on impact). | None |
| **Roof Usher** | `pistol` | Goggles, coat buttoned to the neck | Climbs car-end ladders (existing jump to ledges). Ducks tunnels and gantries by chance per difficulty (E 40%, M 60%, H 80%, W 95%); if he fails, he is swept off (kill). | Ammo (15%) |

### 4.2 Placement rules

1. **Fire tokens.** At most N ranged enemies may shoot in the same 1 s window: E 1, M 2, H 3, W 4. A Gunner counts as 2 tokens. Others hold their aim (laser-free, a visible raised pistol) until a token frees.
2. **Gunner sightlines.** Never place a Gunner at the end of a straight sightline longer than 240 px without a cover prop between him and the hero's entry point.
3. **Gunner spacing.** A Gunner spawns at least 200 px from the hero and never behind the hero (except Wicked, wave `rm1` only).
4. **One Gunner per section** on E/M. Two maximum on H/W.
5. **Ranged share.** On E and M, ranged enemies are at most 50% of any wave. On H and W, at most 70%.
6. **Pair melee with guns.** Every Doorman spawns with at least one Usher, so the Doorman's grab sets up the Usher's shots.
7. **Stewards only in the dining car and galley.** No knives on roofs.
8. **Eject zones.** At most one eject zone per interior. Do not place a Gunner within 60 px of one (an eject kill on a Gunner is too cheap).
9. **Roofs.** Only Roof Ushers, Gunners and Doormen. No roof wave spawns during the 1.5 s before a tunnel or gantry arrives, so new spawns are not swept at once.

---

## 5. The boss: Viktor Lenz, "First Violin"

**Who he is.** The Conductor's personal blade. He replaced the Sandman. Pale, young, in a white suit; rain makes it grey. He carries a violin case with a thin sabre inside. He fights like Elias was taught: a mirror. He fights to a strict beat.

**Story role.** He is on the train to make sure the Board does not escape, and to test Elias. The Ushers are not his crew; they fear him.

### 5.1 Definition (maps to `defineBoss`)

```js
export default defineBoss({
  id: 'lenz', name: 'Viktor Lenz', title: 'First Violin', look: 'lenz',
  stats: { hp: 1000, s: 1.0, m: 4, speed: 34, reach: 30, dmg: 16, heavyDmg: 26, poise: 35, windup: 'beats', cd: 'bars' },
  intro: { walkTo: 'arena.x0+300', spotlight: false, dialog: 'lenz_intro', t: 1.2, prop: 'metronome@3330' },
  beat: { meter: 3, bpm: [84, 104, 126], strikeOn: 3, countIn: 'by difficulty' },  // NEW: beat clock
  moves: {
    lunge:     charge({ windup: '2 beats', v: 280, maxT: 0.3, strikeOnBeat: 3 }),
    waltz:     string({ combos: [['cutHigh', 'cutHigh', 'cutLow']], step: '1 beat' }),
    bow:       counter({ window: '2 beats', riposte: { dmg: 22 } }),            // NEW primitive
    caseThrow: throwObject({ obj: 'violinCase', onBeat: 3, bounce: 1, pickup: true }),
    pizzicato: volley({ proj: 'peg', count: 3, perBeat: 1, heights: ['high', 'low', 'high'] }),
    vault:     leapSlam({ windup: '1 beat', anchor: 'gantry', quake: null, landBehind: true }),
    pinKick:   hazard('decouple'),
    cadenza:   string({ combos: [['c', 'c', 'c', 'c', 'c', 'c']], step: '1/2 beat', countIn: '1 bar' }),
    rubato:    charge({ windup: 'silence 1 bar', v: 320, offBeat: true, once: true }),
    taunt:     taunt({ line: 'count', t: '1 bar' }),
  },
  phases: [
    { id: 1, name: 'Allegro',  moves: { lunge: 3, waltz: 3, bow: 2, caseThrow: 1, taunt: 1 } },
    { id: 2, name: 'Scherzo',  enter: { hpBelow: 0.65 }, onEnter: ['taunt', { bpm: 104 }],
      moves: { lunge: 2, waltz: 3, bow: 1, pizzicato: 2, vault: 2 }, crew: 'stragglers' },
    { id: 3, name: 'Presto',   enter: { hpBelow: 0.30 }, onEnter: ['pinKick', { bpm: 126 }],
      moves: { lunge: 2, waltz: 2, pizzicato: 1, vault: 1, cadenza: 2 },
      desperation: { hpBelow: 0.10, once: 'rubato' } },
  ],
  crew: { roles: ['pistol'], every: '4 bars', max: 2, alive: 2, phases: [2] },
  secondWind: { afterKOs: 2, clearCrew: true },
  gimmick: trainRoof,   // tunnels, gantries, lightning, decouple, beat-quantized hazards
});
```

### 5.2 The metronome rhythm (the core rule)

- The boss runtime runs a **beat clock**: `beat = 60 / bpm`. Bars are 3 beats (a waltz). A small brass **metronome** stands on the last car's roof lantern at x 3330. It is part of the arena and it ticks on every beat. A HUD pendulum icon next to the boss bar shows the same beat, for players who play without sound.
- Lenz **selects a move only on beat 1** of a bar. The telegraph uses beats 1 and 2. **The strike lands on beat 3.** Beat 3 has an accented "TOCK" and a white rim light on Lenz.
- **Recover = beat 1 of the next bar.** This is the punish window (one beat, longer on low difficulty and after some moves; see 5.5).
- Each telegraph is data: `{ t: '2 beats', pose, mark, light: 'rim_white', cue: 'tick' }`. The runtime emits `boss:telegraph` on beat 1 with the strike time, so audio, lights and both renderers line up on the beat.
- **Tempo is fixed per phase**, so the music stems stay in sync: phase 1 84 BPM (bar 2.14 s), phase 2 104 BPM (bar 1.73 s), phase 3 126 BPM (bar 1.43 s). Difficulty changes the count-in, the punish length and the tricks, not the tempo. (This overrides the default `t / sqrt(A)` telegraph scaling for this boss only.)
- **World hazards are on the grid too.** Gantries and tunnel portals reach the arena's left edge on beat 1. The warning (signal bell or whistle) comes exactly one bar before. **Lenz never strikes on a beat when a hazard crosses him**; he ducks or vaults it instead. The player who counts can always read the next danger.
- **Rail joints.** The wheel clatter is re-timed during the fight to land on the beats (sfx only).

### 5.3 Arena

- `roof_boss`, x 2850-3400. Left wall: the dome car's rear bulkhead with its shattered glass (x 2850, 40 px higher than the roof, not climbable).
- **Vault car roof:** x 2850-3110. Two vents (x 2950, 3060) as low cover. Ladder hatch at x 2860 (entry and crew spawn).
- **Gangway plate:** x 3110-3140, a removable surface (`bellows`). It covers the coupler gap in phases 1-2.
- **Last car roof:** x 3140-3360, a mover (`lastCar`). The roof lantern (x 3300-3350) holds a **Bell & Sons clock stopped at 3:17** behind its glass, and the metronome on top. The rear platform with the brake wheel is at x 3360-3400 (1 step down, y 286). Ladder at x 3395 (crew spawn).
- **Kill zone:** the coupler gap in phase 3 (killY 316: falls are lethal on H/W, 35 dmg and a reset to x 3080 on E/M).

**Scroll and hazard schedule (all on beat 1, warning one bar before):**

| Phase | Speed | Gantries | Tunnels | Lightning |
|---|---|---|---|---|
| 1 Allegro | 690 px/s, last viaduct span | every 8 bars | none | random, 6-10 s |
| 2 Scherzo | 690 px/s, cuttings on the downgrade | every 6 bars | every 12 bars, 2 bars long | random, 4-8 s |
| 3 Presto | 780 px/s, valley floor, the Spire on the horizon | every 4 bars | every 10 bars, 2 bars long | on beat 1 of every 2nd bar |

- **Gantry:** a steel beam (y 236-262) sweeps across the arena toward +x at the scroll speed. Standing actors are hit (14 dmg, knockdown; goons are swept off). Crouch, roll or lie prone to pass.
- **Tunnel:** the dynamic ceiling (y 250) sweeps in. Inside, only crouch, crawl, roll and low attacks work. Standing or jumping: 10 dmg and knockdown. Lenz fights crouched in the tunnel too: in the dark, his sabre is visible only by sparks on beat 3.

### 5.4 Phases and move lists

**Phase 1, "Allegro" (100% to 65%).** A pure duel. No crew. Lenz teaches the beat.

| Move | Telegraph (beats 1-2) | Strike (beat 3) | Counter-play | Punish |
|---|---|---|---|---|
| `lunge` | Beat 1: sabre back, weight on the rear foot. Beat 2: the point glints. | A thrust lunge, 90 px, 18 dmg. | Roll through on beat 3, or jump. | 1 beat; Lenz is stuck at the end of the lunge. |
| `waltz` | Beat 1: he raises the sabre high. | Three cuts, one per beat of the NEXT bar: high (1), high (2), low (3). 12/12/16 dmg. | Crouch, crouch, jump. Learn the bar. | 1 beat after the low cut; he is low and open. |
| `bow` | Beat 1: sabre held across his body like a bow on a string. | No strike. If the hero attacks on beats 1-2, Lenz parries and ripostes (22 dmg). | Wait. Do not attack until beat 3. | On beat 3 he lowers the sabre: a free 1-beat window. |
| `caseThrow` | Beat 1: he swings the violin case back. | Throws the case on beat 3 (14 dmg, bounces once). | Duck or roll. | The case stays on the roof: pick it up and throw it back for a 1 s stun. |
| `taunt` | Beat 1-3: he counts aloud. | None. | Free hits on beats 1-2; he blocks on beat 3. | |

**Phase 2, "Scherzo" (65% to 30%).** Tempo 104 BPM. Tunnels begin. Crew stragglers appear. Lenz uses the gantries.

- Adds `pizzicato`: beat 1, he snaps steel violin pegs from the case; he throws one peg per beat (beats 1-2-3 of the next bar) at high, low, high (8 dmg each). Answer: crouch, jump, crouch. Punish: 1 beat.
- Adds `vault`: only when a gantry is warned. On beat 1 (the gantry's arrival), he grabs the beam, swings over the hero and lands behind him on beat 3 with a cut (18 dmg). Answer: roll toward him on beat 2 (under the swing). Punish: 1.5 beats on landing.
- **Crew rule ("stragglers").** Every 4 bars, one pistol Usher climbs a ladder (x 2860 or 3395); max alive 0/1/2/2 (E/M/H/W). They are scared and shoot at **both** the hero and Lenz (their bullets do 50% damage to Lenz). Lenz kills any Usher in his reach on beat 3 (a free "conducted" kill; it costs him that bar's attack). The player can lure Usher fire into Lenz. Fallback if faction hostility is not built: Ushers shoot only the hero, and Lenz still cuts them down in reach.
- On phase entry: he taunts: "Allegro." The music stem changes on the next bar line.

**Phase 3, "Presto" (30% to 0%).** Tempo 126 BPM. No crew. The cars split.

- **onEnter `pinKick`:** Lenz jumps onto the last car on beat 1, kicks the coupling pin on beat 3. The gangway plate falls away. The two roofs are now joined only by the **safety chain**. The `lastCar` mover "breathes": the gap swings between 30 px and 110 px with a period of 2 bars (narrowest on beat 1 of odd bars, widest on beat 1 of even bars). The chain snaps taut with a clank at its widest point (screen kick).
- Lenz stays on the last car for all of phase 3. The hero must cross the gap on the narrow bars to fight him, or attack across it with guns and thrown objects (Lenz cuts thrown objects out of the air on beat 3).
- Adds `cadenza`: count-in of one bar (the metronome bell rings twice), then six cuts on half-beats (12 dmg each). Answer: back off out of reach, or roll through on the 4th cut. **Punish: 1.6 s.** He is out of breath (the biggest window in the fight).
- Gantries every 4 bars. Knock Lenz into a passing gantry (a heavy hit or a thrown object on the beat before it arrives): 12% of his HP and a 2 s stun.
- **Desperation (`rubato`, below 10%, once).** The metronome **stops** for one bar. The silence is the telegraph. Then Lenz attacks off the beat with a 320 px/s lunge. Answer: roll in the silence (any time in the last half of the bar works). After it, the metronome restarts and Lenz smiles: "You heard the rest."

### 5.5 Punish windows and difficulty scaling

| Rule | Easy | Medium | Hard | Wicked |
|---|---|---|---|---|
| HP | 800 | 1000 | 1150 | 1300 |
| Count-in (telegraph) | 2 beats + Lenz counts aloud "One. Two." | 2 beats | 2 beats; `lunge` 1 beat (beat 2 only) | Same as Hard; plus a **hemiola** in phase 3: 3 strikes across 2 bars (beats 1, 3, 2), telegraphed by a double tick |
| Punish window (normal) | 2 beats | 1.5 beats | 1 beat | 1 beat |
| `bow` riposte damage | 14 | 22 | 26 | 30 |
| Phase 3 gap range | 30-80 px | 30-100 px | 30-110 px | 30-120 px |
| Crew max alive (ph. 2) | 0 | 1 | 2 | 2, plus one Gunner once |
| Gantry warning | 1 bar + a floor stripe | 1 bar | 1 bar | 1 bar |
| Fall into the gap | 35 dmg, reset | 35 dmg, reset | death, CP5 | death, CP5 |

Checkpoint inside the boss: on E/M, a death in phase 3 restarts at phase 3 with Lenz at 30%. On H/W, it restarts at CP5.

### 5.6 Signature tells (for art and audio)

- Beat 1: a soft tick; Lenz shifts his weight; his tie flicks in the wind.
- Beat 2: a tick; a glint runs along the sabre (2D: 2 px white line; 3D: specular streak).
- Beat 3: an accented "TOCK"; a white rim light on Lenz; the strike.
- `bow`: a sustained violin harmonic for 2 beats.
- `cadenza`: the metronome's bell rings twice; the music stem plays a fast run.
- `rubato`: the metronome and music stop; only rain and wheels.

### 5.7 Defeat sequence

1. HP reaches 0 on any hit: the boss finisher plays in **slow motion with a freeze frame** (the hero's current weapon finisher; the katana finisher breaks the sabre in two).
2. Lenz falls back onto the last car's roof, near the lantern, at x 3320. The metronome slows (126 to 60 BPM over 4 s) and stops. Music cuts to rain and wheels.
3. The safety chain holds; the cars stay together.
4. End panel 1 (Lenz's last words) and panel 2 (the Board collected) play.
5. Beat 12 runs (the brake, the workshop, panels 3-5).

### 5.8 Mini-boss: Head Usher Anton Grau (Beat 8)

A built-in elite using the same framework (a short `defineBoss`).

- **Look:** a broad man of 55 in a grey frock coat, white gloves, a steel-bound ledger case chained to his left wrist, a drum-magazine machine gun.
- **Stats:** hp 380 (E 300, H 440, W 500), speed 24, poise 45.
- **Phase 1 (100-50%):**
  - `sweep`: Gunner burst, 14 rounds over 1.4 s, low to high. Wind-up 1.0 s (drum rattle, red muzzle glow). Rising rounds break dome panes above. Punish: 2.2 s reload.
  - `caseGuard`: holds the steel case in front: front shots and light hits are blocked. Break it with a heavy kick, an axe hit, or a thrown chair; or roll behind him.
  - `caseBash`: a charge with the case (`charge`, windup 0.6 s, 20 dmg). If he hits the bar or a wall: 1.5 s stun.
- **Phase 2 (below 50%):** the machine gun runs dry. He throws it (`throwObject`), and it lies on the floor as a pickup with 30 rounds. He draws two pistols: `volley` of 3 paired shots. Adds `glassDrop`: he shoots the panes above the hero; shards fall in 2 floor circles (0.6 s telegraph, 10 dmg).
- **Crew:** Ushers from the rear door, every 8 s, max alive 1/2/2/3.
- **Defeat:** slow-motion freeze frame. He falls against the bar. The Board screams.

---

## 6. Cutscene and dialog script

Panels: 1024x576, comic style, yellowed voice-over captions, white dialogue balloons. Red tint on Choir symbols. Ids `panel:train_intro_NN`, `panel:train_outro_NN`.

### 6.1 Opening cutscene (`train_intro`)

| # | SHOT | TEXT |
|---|---|---|
| 1 | Wide. A black armoured train with gold trim at a steam-filled platform. Platform clock: 23:39. Ushers in grey suits load iron ledger boxes. At the far end, two Ushers carry a long crate stencilled with a small clock face into the last car. | VO: "The Board was leaving with the city's memory in iron boxes." |
| 2 | The hero, low on the platform behind a luggage cart, tucks a pistol into his belt. Nero sits at his side. He kneels to the dog. | HERO: "Stay. Go home." |
| 3 | Nero refuses; he sits harder, staring. The hero almost smiles. | VO: "Elena's dog. Just as stubborn as her." |
| 4 | The train pulls out. From the platform's end footbridge, the hero drops toward the roof of the baggage car behind the locomotive. Below, Nero leaps through the baggage car's open side door. Steam swallows the station. | VO: "Last train. No return ticket." |
| 5 | Night, rain. On the roof of the last car, unseen, a pale man in a white suit sits on a closed violin case. A brass metronome ticks beside him. | SFX: "tick... tick... tock." |

### 6.2 Head Usher bark (`grau_intro`, portrait dialog, 3 lines)

| Speaker | Mood | Line |
|---|---|---|
| GRAU | Stern, raising the drum gun | "This car is private, Sandman. Members only." |
| HERO | Cold | "I was a member." |
| GRAU | Furious | "Ushers! Seat him!" |

### 6.3 The Board surrenders (`board_surrender`, portrait dialog)

| Speaker | Mood | Line |
|---|---|---|
| JUDGE KERN | Terrified, clutching her fur | "Don't. We can pay. Name a number." |
| HERO | Cold | "Silent Night." |
| ALDANE | Sweating, wiping his glasses | "It was real. The old man had to go. The city was for sale, and we were the only buyers." |
| THE MAYOR | Whining | "Malaspina took the dog. A lever, that's all. Just a lever." |
| HERO | Furious, quiet | "Nero." |
| ALDANE | Hollow laugh | "Don't you see it? Every man you broke was one of ours. In order. Someone has been reading you our guest list." |
| HERO | Cold | "Who." |
| JUDGE KERN | Trembling, pointing up | "Ask the man on the roof. He isn't ours." |

(Above them, the metronome ticks. Aldane slides a brass key across the bar.)

### 6.4 Boss intro (`lenz_intro`, portrait dialog; on the roof, lightning over the dam; Lenz opens his violin case)

| Speaker | Mood | Line |
|---|---|---|
| LENZ | Serene, tilting his head | "The Sandman. My predecessor. I have studied your work. Elegant, but sentimental." |
| HERO | Cold | "Move." |
| LENZ | Amused | "First Violin plays on the beat. One, two, three. Count with me." |
| HERO | Cold | "Who's the Maestro?" |
| LENZ | Smiling, drawing the sabre | "You'll meet him at the end of the piece. If you keep tempo." |

**In-fight barks (caption only, 1.5 s):** phase 2 entry: LENZ: "Allegro." After a parried attack: LENZ: "You're rushing." After the hero takes a hit: LENZ: "Again. From the top." Phase 3 entry: LENZ: "Presto. Let's lose the orchestra." After `rubato`: LENZ: "You heard the rest."

### 6.5 End cutscene (`train_outro`)

Panels 1-2 play right after the defeat. Beat 12 plays in-engine. Panels 3-5 play when the needle drops.

| # | SHOT | TEXT |
|---|---|---|
| 1 | Train roof, rain. Lenz lies by the roof lantern, his sabre broken, smiling up at the hero. The metronome beside him has stopped. | LENZ: "He said you'd still drop your left guard. He taught you that." |
| 2 | Wide, high angle. The front of the train disappears into a tunnel, its tail lamps going out. On the valley road beside the stopped dome car, a row of black cars waits with headlights on. Men in black tie lead the Board into the rain. One of them tips his hat toward the roof. | VO: "The Choir collects. I had only been the collector." |
| 3 | The last car's door opens. Inside, a perfect copy of Bell's workshop: warm lamplight, the same bench, every clock stopped at 3:17. Nero growls. | VO: "Only one man ever corrected my left guard." |
| 4 | Close-up. A brass gramophone horn. The needle drops. A pipe rests on the bench, still smoking cherry tobacco. | BELL (recording): "Hello, Elias. Midnight. The Spire. We'll finish the lesson." |
| 5 | Wide, through the train window: across the valley, the Meridian Spire pierces the storm clouds, its giant clock face lit. | VO: "Bell was alive. And he had been conducting me the whole time." |

Note: no payphone this time. Hale is dead. The gramophone takes the payphone's place at the end of the level.

---

## 7. Level data skeleton

`src/levels/train/level.js`. New schema fields are marked `// NEW` (see section 8).

```js
import { defineLevel } from '../../director/define.js';
import lenz from '../../bosses/lenz.js';
import grau from '../../bosses/grau.js';
import { trainScroll } from './gimmicks.js';

const SCROLL = { type: 'scroll', layers: [            // NEW backdrop type
  { set: 'storm_sky', k: 0.01 }, { set: 'spire_far', k: 0.002, from: 'roof_boss.ph3' },
  { set: 'mountains', k: 0.08 }, { set: 'vargas_dam', k: 0.2, in: ['roof_mid', 'roof_boss.ph1'] },
  { set: 'poles_rocks', k: 0.5 }, { set: 'trackbed', k: 1.0 } ] };

export default defineLevel({
  id: 'train', title: 'Last Train from Valmora', order: 7, palette: 'train', music: 'music:train',
  size: { W: 3600, H: 320, groundY: 280 },
  faction: 'ushers',                                                        // NEW: skin map
  skins: { pistol: 'usher', gunner: 'usher_gunner', brawler: 'usher_doorman', knife: 'usher_steward', thrower: 'usher_steward_plates' },
  train: { speed: 600, joint: 0.43, lurch: { every: [25, 40], push: [12, 20] } },   // NEW
  sections: [
    { id: 'roof_front', x0: 0,    x1: 400,  indoor: false, weather: 'gale', ambient: [0.30, 0.34, 0.50],
      camera: { minZoom: 0.45, maxZoom: 0.7, lead: -0.4 }, backdrop: [SCROLL], wind: { ax: 35, gust: [8, 14] } },
    { id: 'baggage',    x0: 420,  x1: 760,  indoor: true,  weather: 'none', ambient: [0.42, 0.40, 0.36],
      camera: { bounds: [420, 760], minZoom: 0.7, maxZoom: 0.7 }, backdrop: [{ type: 'windowView', of: SCROLL }],
      ceilingY: 180 },                                                      // NEW
    { id: 'dining',     x0: 780,  x1: 1200, indoor: true,  weather: 'none', ambient: [0.55, 0.42, 0.30],
      camera: { bounds: [780, 1200], minZoom: 0.55, maxZoom: 0.7 }, backdrop: [{ type: 'windowView', of: SCROLL }], ceilingY: 180 },
    { id: 'sleepers',   x0: 1220, x1: 1580, indoor: true,  weather: 'none', ambient: [0.28, 0.32, 0.45],
      camera: { bounds: [1220, 1580], minZoom: 0.75, maxZoom: 0.75 }, backdrop: [{ type: 'windowView', of: SCROLL }], ceilingY: 180 },
    { id: 'roof_mid',   x0: 1600, x1: 2280, indoor: false, weather: 'gale', ambient: [0.26, 0.30, 0.46],
      camera: { minZoom: 0.4, maxZoom: 0.65, lead: -0.4 }, backdrop: [SCROLL], wind: { ax: 40, gust: [5, 9], gustMul: 2 } },
    { id: 'dome',       x0: 2300, x1: 2620, indoor: true,  weather: 'perPane', ambient: [0.36, 0.40, 0.52],
      camera: { bounds: [2300, 2620], minZoom: 0.6, maxZoom: 0.6 }, backdrop: [{ type: 'windowView', of: SCROLL, speed: 520 }] },
    { id: 'vault',      x0: 2640, x1: 2820, indoor: true,  weather: 'none', ambient: [0.30, 0.40, 0.32],
      camera: { bounds: [2640, 2820], minZoom: 0.75, maxZoom: 0.75 }, ceilingY: 180 },
    { id: 'roof_boss',  x0: 2840, x1: 3420, indoor: false, weather: 'gale', ambient: [0.28, 0.32, 0.50],
      camera: { bounds: [2840, 3420], minZoom: 0.5, maxZoom: 0.5, lead: -0.3 }, backdrop: [{ ...SCROLL, speed: 690 }], wind: { ax: 40, gust: [6, 10] } },
    { id: 'workshop',   x0: 3440, x1: 3600, indoor: true,  weather: 'none', ambient: [0.62, 0.48, 0.32],
      camera: { bounds: [3440, 3600], minZoom: 0.85, maxZoom: 0.85 }, backdrop: [{ type: 'windowView', of: SCROLL, speed: 0 }], ceilingY: 180 },
  ],
  scene: { paint: [                                                         // NEW painters: trainCar, locomotive, domeGlass, ...
    { type: 'locomotive', x: 0, view: 'rearOfTender' },
    { type: 'trainCar', style: 'baggage',  view: 'roof',     x0: 20,   x1: 400 },
    { type: 'trainCar', style: 'baggage',  view: 'interior', x0: 420,  x1: 760, sideDoor: [600, 660] },
    { type: 'trainCar', style: 'dining',   view: 'interior', x0: 780,  x1: 1200, galley: [1120, 1200] },
    { type: 'trainCar', style: 'sleeper',  view: 'interior', x0: 1220, x1: 1580, compartments: [1260, 1310, 1360, 1410, 1460, 1510] },
    { type: 'trainCar', style: 'sleeper',  view: 'roof',     x0: 1600, x1: 1850 },
    { type: 'trainCar', style: 'sleeper',  view: 'roof',     x0: 1880, x1: 2050 },
    { type: 'trainCar', style: 'dome',     view: 'roofStub', mover: 'tailStub' },
    { type: 'trainCar', style: 'dome',     view: 'interior', x0: 2300, x1: 2620, bar: [2530, 2610] },
    { type: 'trainCar', style: 'vault',    view: 'interior', x0: 2640, x1: 2820 },
    { type: 'trainCar', style: 'vault',    view: 'roof',     x0: 2850, x1: 3110 },
    { type: 'trainCar', style: 'private',  view: 'roof',     mover: 'lastCar', lantern: 3330 },
    { type: 'workshop', x0: 3440, x1: 3600, replica: 'bell_and_sons' },
    { type: 'clock', maker: 'Bell & Sons', time: '3:17', at: [[2570, 200], [2720, 236], [3330, 262], [3500, 220]] },
    { type: 'chandelier', xs: [860, 960, 1060], y: 196 },
    { type: 'roofVent', xs: [140, 290, 1700, 1960, 2950, 3060] },
    { type: 'ladder', xs: [1845, 1885, 2045, 2860, 3395] },
  ]},
  ground: [{ x0: 20, x1: 400 }, { x0: 420, x1: 1580 /* baggage, dining, sleepers floors */ },
           { x0: 1600, x1: 1850 }, { x0: 1880, x1: 2050 },                    // 30 px car gap 1850-1880
           { x0: 2300, x1: 2820 }, { x0: 2850, x1: 3110 }, { x0: 3440, x1: 3600 }],
  killY: 316,
  surfaces: [
    { id: 'crateDeck', x0: 640, x1: 740, y: 236, oneWay: true, lane: 'plat', depth: [-20, -6] },
    { id: 'bellows',   x0: 3110, x1: 3140, y: 280, removable: true },         // NEW: removed by pinKick
  ],
  walls: [{ x: 20, y0: 200, y1: 280, id: 'tender' }, { x: 2850, y0: 240, y1: 280, id: 'domeBulkhead' }],
  movers: [
    { id: 'tailStub', surface: { w: 100, y: 280 }, path: [[2070, 280, 0], [2170, 280, 4]], mode: 'onTrigger', riders: true },   // NEW riders
    { id: 'lastCar',  surface: { w: 220, y: 280 }, path: [[3140, 280, 0], [3200, 280, 'bar'], [3140, 280, '2 bars']],
      mode: 'breathe', riders: true, onPeak: 'chainSnapFx' },               // NEW mode
  ],
  sweepers: [                                                               // NEW: tunnels and gantries
    { id: 'g1', kind: 'gantry', section: 'roof_front', at: { t: 6 },  band: [236, 262], dmg: 14, warn: 1.5 },
    { id: 'g2', kind: 'gantry', section: 'roof_front', at: { t: 20 }, band: [236, 262], dmg: 14, warn: 1.5 },
    { id: 't1', kind: 'tunnel', section: 'dining',     at: { t: 40 }, len: 2.5, lightsOut: true },
    { id: 't2', kind: 'tunnel', section: 'roof_mid',   at: { t: 3 },  len: 3.5, ceilingY: 250, dmg: 10, warn: 1.5 },
    { id: 'g3', kind: 'gantry', section: 'roof_mid',   at: { after: 't2', t: 12 }, band: [236, 262], dmg: 14 },
    { id: 'g4', kind: 'gantry', section: 'roof_mid',   at: { after: 't2', t: 26 }, band: [236, 262], dmg: 14 },
    // roof_boss sweepers are scheduled by the lenz gimmick on the beat grid
  ],
  ejectZones: [{ section: 'baggage', x0: 600, x1: 660, lane: 'front' }],    // NEW
  panes: [
    ...[810, 860, 910, 960, 1010, 1060].map((x, i) => ({ id: 'dw' + i, x0: x, y0: 214, x1: x + 30, y1: 250, hp: 20, kind: 'window', depth: -30 })),
    ...Array.from({ length: 12 }, (_, i) => ({ id: 'dome' + i, x0: 2305 + i * 26, y0: 150, x1: 2329 + i * 26, y1: 196,
       hp: 15, kind: 'roof', onBreak: 'shards', letsWeather: true })),
    { id: 'tailDome', x0: 2090, y0: 262, x1: 2160, y1: 280, hp: 999, kind: 'roof', mover: 'tailStub', onBreak: 'fallThrough' },
  ],
  lights: [
    { x: 10, y: 250, r: 70, rgb: [255, 140, 40], flicker: 0.4 },
    { x: 590, y: 200, r: 90, rgb: [255, 220, 160], flicker: 0.1, swing: true },
    { x: 860, y: 196, r: 80, rgb: [255, 200, 120] }, { x: 960, y: 196, r: 80, rgb: [255, 200, 120] }, { x: 1060, y: 196, r: 80, rgb: [255, 200, 120] },
    { x: 2570, y: 230, r: 60, rgb: [220, 40, 40] },
    { x: 2720, y: 210, r: 60, rgb: [90, 200, 110] },
    { x: 3330, y: 262, r: 50, rgb: [255, 190, 110], mover: 'lastCar' },
    { x: 3520, y: 210, r: 120, rgb: [255, 180, 100] },
  ],
  props: [
    ['vent', 140, 280], ['vent', 290, 280], ['shovel', 30, 280],
    ['crate', 640, 280], ['crate', 660, 280], ['crate', 700, 280], ['crate', 720, 280], ['crate', 640, 258], ['crate', 700, 258],
    ['mailSack', 470, 280], ['mailSack', 500, 280], ['mailSack', 560, 280], ['mailSack', 740, 280],
    ['ledgerBox', 540, 280], ['ledgerBox', 680, 280], ['ledgerBox', 730, 280], ['coinCage', 480, 280],
    ['table', 820, 280], ['table', 880, 280], ['table', 940, 280], ['table', 1000, 280],   // wall lane + front lane pairs
    ['bottle', 822, 262], ['bottle', 882, 262], ['bottle', 942, 262], ['bottle', 1002, 262],
    ['trolley', 900, 280], ['champagneBucket', 1000, 262], ['pot', 1140, 262], ['pot', 1160, 262], ['steamValve', 1180, 250],
    ['luggageTrolley', 1540, 280], ['suitcase', 1300, 280], ['suitcase', 1420, 280],
    ['vent', 1700, 280], ['vent', 1960, 280],
    ['armchair', 2340, 280], ['armchair', 2420, 280], ['armchair', 2480, 280], ['drinksCart', 2450, 280], ['bottle', 2560, 252],
    ['vent', 2950, 280], ['vent', 3060, 280], ['metronome', 3330, 248, { mover: 'lastCar' }],
    ['brakeWheel', 3380, 286, { interact: 'hold', t: 2, mover: 'lastCar' }],          // NEW interact prop
    ['gramophone', 3540, 252, { trip: 3540 }],
  ],
  pickups: [
    { w: 'axe', x: 520, stand: 'rack' }, { w: 'machete', x: 1150, stand: 'rack' },
    { w: 'shotgun', x: 1570, stand: 'rack', ammo: 6 }, { w: 'shotgun', x: 1995, stand: 'none', ammo: 6, if: 'heroLacksShotgun' },
    { w: 'katana', x: 2700, stand: 'bench' }, { w: 'shotgun', x: 2780, stand: 'rack', ammo: 8 },
    { kind: 'bandage', x: 455, diff: ['easy', 'medium'] }, { kind: 'bandage', x: 1190 }, { kind: 'bandage', x: 1360, hidden: 'compartment3' },
    { kind: 'bandage', x: 2320 }, { kind: 'bandage', x: 2660 }, { kind: 'bandage', x: 2800 },
    { kind: 'ammo', x: 700 }, { kind: 'ammo', x: 1100 }, { kind: 'ammo', x: 1565 }, { kind: 'ammo', x: 1960 },
    { kind: 'ammo', x: 2680 }, { kind: 'ammo', x: 2760 },
    { kind: 'item', id: 'vaultKey', x: 2560, hidden: true }, { kind: 'item', id: 'silentNightLedger', x: 2720 },
  ],
  start: { x: 40, section: 'roof_front', cutscene: 'train_intro', drop: true },
  companion: { id: 'nero', from: 'baggage', interiorsOnly: true, waitAt: 'nextInteriorDoor' },      // NEW
  checkpoints: [{ id: 'cp1', x: 40 }, { id: 'cp2', x: 800 }, { id: 'cp3', x: 1620 }, { id: 'cp4', x: 2320 }, { id: 'cp5', x: 2660 }],  // NEW
  objectives: [
    { id: 'board',  text: 'Find the Board',        done: { killed: 'grau' } },
    { id: 'ledger', text: 'Take the ledger',        done: { picked: 'silentNightLedger' } },
    { id: 'lenz',   text: 'Silence First Violin',   done: { bossDefeated: 'lenz' } },
  ],
  waves: {
    r1:  { at: [260, 330, 380],      roles: ['pistol', 'pistol', 'pistol', 'brawler'], count: [1, 2, 2, 4], from: 'ladder' },
    b1:  { at: [560, 640, 700, 730], roles: ['brawler', 'pistol', 'brawler', 'pistol'], count: [2, 3, 4, 4], from: 'placed' },
    b2:  { at: [750],                roles: ['pistol', 'brawler', 'pistol'],            count: [1, 1, 2, 3], from: 'nearestDoor' },
    d1:  { at: [830, 890, 950, 1010, 1060, 1090], roles: ['pistol'], count: [3, 4, 5, 6], from: 'seated' },          // NEW spawn mode
    d2:  { at: [1130, 1160],         roles: ['knife', 'knife', 'thrower', 'knife'],     count: [1, 2, 3, 4], from: 'nearestDoor' },
    s1:  { at: [1550],               roles: ['gunner'],                                  count: [1, 1, 1, 1], from: 'placed' },
    s2:  { at: [1260, 1310, 1410, 1460, 1510], roles: ['pistol', 'pistol', 'brawler', 'pistol', 'brawler'], count: [2, 3, 4, 5], from: 'nearestDoor' },
    s3:  { at: [1510],               roles: ['gunner'],                                  count: [0, 0, 0, 1], from: 'nearestDoor' },
    rm1: { at: [1845, 1885, 2030, 2045], roles: ['pistol', 'pistol', 'gunner', 'pistol', 'brawler', 'pistol'], count: [2, 4, 6, 7], from: 'ladder' },
    cut: { at: [2090, 2120, 2150],   roles: ['pistol', 'pistol', 'gunner', 'pistol'],   count: [2, 2, 3, 4], from: 'placed', mover: 'tailStub' },
  },
  triggers: [
    { when: { inSection: 'roof_front' }, do: { spawnWave: 'r1' } },
    { when: { killed: 'r1', heroX: '>=370' }, do: { hatch: { at: 380, to: 'baggage', x: 440 } } },
    { when: { inSection: 'baggage' }, do: [{ spawnWave: 'b1' }, { companion: 'nero' }] },
    { when: { killedPct: ['b1', 0.5] }, do: { spawnWave: 'b2' } },
    { when: { killed: 'b2' }, do: { door: { at: 760, to: 'dining', x: 790 } } },
    { when: { heroX: '>=820', inSection: 'dining' }, do: [{ spawnWave: 'd1' }, { slowmo: { scale: 0.35, t: 2.5, startOn: ['roll', 'shot', 'throw', { t: 0.6 }] } }] },
    { when: { killedPct: ['d1', 0.6] }, do: { spawnWave: 'd2' } },
    { when: { killed: ['d1', 'd2'] }, do: [{ door: { at: 1200, to: 'sleepers', x: 1230 } }, { checkpoint: 'cp2' }] },
    { when: { inSection: 'sleepers' }, do: [{ spawnWave: 's1' }, { spawnWave: 's2' }] },
    { when: { killed: 's1' }, do: { spawnWave: 's3' } },
    { when: { killed: ['s1', 's2', 's3'] }, do: { climb: { at: 1575, to: 'roof_mid', x: 1620 } } },
    { when: { inSection: 'roof_mid' }, do: [{ spawnWave: 'rm1' }, { checkpoint: 'cp3' }] },
    { when: { killed: 'rm1', heroX: '>=1990' }, do: [{ dialog: 'kern_cut' }, { spawnWave: 'cut' }, { mover: 'tailStub', go: true, t: { easy: 6, medium: 5 } }] },
    { when: (s) => s.hero.air && s.hero.x > 2050 && gap(s) >= 50, do: { slowmo: { scale: 0.3, t: 1.6 } }, once: true },
    { when: { killed: 'cut', onMover: 'tailStub' }, do: { breakPane: 'tailDome', then: { transition: { to: 'dome', fall: true, x: 2400 } } } },
    { when: { t: '>8', onMover: 'tailStub' }, do: { breakPane: 'tailDome', then: { transition: { to: 'dome', fall: true, x: 2400 } } } },
    { when: { inSection: 'dome' }, do: [{ checkpoint: 'cp4' }, { dialog: 'grau_intro' }, { miniBoss: 'grau' }] },
    { when: { killed: 'grau' }, do: [{ dialog: 'board_surrender' }, { reveal: 'vaultKey' }] },
    { when: { picked: 'vaultKey' }, do: { door: { at: 2620, to: 'vault', x: 2650 } } },
    { when: { inSection: 'vault' }, do: { checkpoint: 'cp5' } },
    { when: { picked: 'silentNightLedger' }, do: { climb: { at: 2810, to: 'roof_boss', x: 2870 } } },
    { when: { inSection: 'roof_boss' }, do: { boss: 'start' } },
    { when: { bossDefeated: 'lenz' }, do: [{ cutscene: 'train_outro', panels: [1, 2] }, { prompt: 'brakeWheel' }] },
    { when: { used: 'brakeWheel' }, do: [{ trainSpeed: { to: 0, t: 6 } }, { door: { at: 3400, to: 'workshop', x: 3450, auto: true } }] },
    { when: { heroX: '>=3540', inSection: 'workshop' }, do: [{ cutscene: 'train_outro', panels: [3, 4, 5] }, { runOver: 'win' }] },
  ],
  miniBosses: { grau: { module: grau, arena: { section: 'dome', x0: 2310, x1: 2610, doors: [2615] } } },    // NEW (or reuse boss slot)
  boss: { module: lenz, arena: { section: 'roof_boss', x0: 2850, x1: 3400, doors: [2860, 3395] },
          intro: 'lenz_intro', crew: { roles: ['pistol'], every: '4 bars', max: 2 }, gimmick: trainScroll },
  cutscenes: { intro: 'train_intro', outro: 'train_outro' },
  dialog: { grau_intro: {}, board_surrender: {}, kern_cut: {}, lenz_intro: {}, lenz_barks: {} },
  assets: ['panel:train_*', 'portrait:lenz_*', 'portrait:grau_*', 'portrait:kern_*', 'portrait:aldane_*', 'portrait:mayor_*',
           'portrait:elias_*', 'bg:train_*', 'music:train', 'music:train_aisle', 'music:lenz', 'music:train_outro',
           'sfx:train_*', 'sfx:mg_*', 'sfx:metronome_*', 'sfx:glass_*', 'voice:bell_gramophone_01', 'voice:lenz_*'],
});
```

Note on `ground`: interiors and roofs are separate sections, so the floors of interiors (y 280) and roofs (y 280) never overlap in x. The validator in `defineLevel` should accept per-section ground lists; the flattened list above is for reading only.

---

## 8. Engine features needed (not in the game today)

Rule: everything is shared sim and shared 2D/3D presentation. Only the 3D models (train hull, tunnel portal, dam, gantry) are 3D-only.

| # | Feature | One-line spec | Shared with |
|---|---|---|---|
| 1 | **Scrolling parallax at speed** | Backdrop type `scroll`: layers with factor `k`, a section speed (px/s) that can ramp (`trainSpeed: {to, t}`), per-phase layer sets; `windowView` draws the same scroll clipped to window rects; 3D uses scrolling ground tiles and far planes. | L8 glass elevator (a vertical variant), L2 passing trains (window flicker). |
| 2 | **Wind force** | Section `wind: {ax, gust, gustMul}` adds horizontal acceleration to hero, goons, thrown objects, particles, rain slant and blood drips; gusts have a 0.8 s audio-visual warning; running against wind is 15% slower, air drift +25 px/s. | L8 clock face in the storm, L6 broken dome (light). |
| 3 | **Sweepers with duck check** | `sweepers: [{kind: 'gantry'|'tunnel', band or ceilingY, dmg, warn}]`: a hit edge moves toward +x at scroll speed; a standing actor whose box crosses the band is hit; crouch, roll or prone pass; tunnels leave a dynamic ceiling until the exit edge passes. | L2 Line Zero (low tunnels), L8 pendulum (a swinging variant). |
| 4 | **Crouch as a hitbox state and goon duck AI** | Hero crouch/crawl lowers the hurtbox to 26 px and allows crawl move and low attacks; goons get a per-difficulty duck chance against sweepers. | Any level with low hazards. |
| 5 | **Dynamic and static ceilings** | `ceilingY` per section and per sweeper: jumps stop at it; standing under a lower ceiling forces crouch or damage. | L2, L4 glass tunnel. |
| 6 | **Car gaps and pit respawn** | Ground gaps already make pits; add a rule per difficulty: E/M take 30-35 dmg and respawn at the gap's near edge; H/W restart at the last checkpoint. Plus `checkpoints`. | All levels (L4 catwalks, L8 drop). |
| 7 | **Decoupling movers with riders** | Movers carry actors, props, lights and panes standing on them (`riders: true`); new modes `onTrigger` with a duration and `breathe` (a beat-synced oscillation with an `onPeak` event). | L8 gear platforms and minute hand, L2 handcar. |
| 8 | **Machine-gun enemy role `gunner`** | Plant, 1.2 s wind-up (scaled by difficulty), 10-round sweeping burst low to high, 2.2 s reload, 60% move speed, wind-up cancelled by a heavy hit, drops a machine gun. | L8 Choir Proper, L6 (riot gunner, optional). |
| 9 | **Fire tokens** | A per-level limit on how many ranged enemies may fire in the same 1 s window (E 1, M 2, H 3, W 4; a Gunner costs 2). | L3, L6, L8 (all gunfights). |
| 10 | **Cover behaviour** | Props flagged `cover` block bullets for actors crouched behind them; Ushers seek cover within 40 px. | L3, L6, L8. |
| 11 | **Scripted slow motion** | Trigger action `slowmo: {scale, t, startOn}` sets `timeScale` with audio pitch-down and a desaturate pass; real-time duration. | Every level's set piece. |
| 12 | **Air fire** | The hero can fire the shotgun and machine gun while airborne; shotgun recoil pushes him 6 px back. | L8 penthouse dive, L5 ward dive. |
| 13 | **Eject zones** | `ejectZones: [{x0, x1, lane}]`: an actor knocked or thrown into that lane and range leaves the world (kill); the hero instead catches a ledge. | L8 glass elevator, L4 tank edge. |
| 14 | **Train lurch and rail-joint bob** | `train.lurch` emits a `lurch` event: loose props and unbraced actors slide 12-20 px toward +x; a 1 px camera bob per rail joint. | None (L7 only). |
| 15 | **Beat clock for bosses** | Boss runtime `beat: {meter, bpm[]}`: select on beat 1, telegraph in beats, strike on a set beat, recover in beats; gimmicks can schedule hazards on bar lines; `boss:telegraph` carries the beat time; music stems follow the beat clock. | L8 Bell (quarter-hour chimes, pendulum period). |
| 16 | **`counter` primitive** | A guard stance for N beats: an attack inside the window is parried and answered with a riposte. | L8 Bell (sword-cane parry). |
| 17 | **Non-combatant actors** | A `civilian` role: cowers, cannot be targeted, plays scripted lines, blocks nothing. | L6 gala guests, L8 lobby guests. |
| 18 | **Faction hostility (optional)** | A per-enemy `hostileTo` list, so crew can shoot the boss; bullets from crew do 50% damage to a boss. Fallback: crew shoot only the hero. | L8 (Choir Proper vs. traitors, optional). |
| 19 | **Interact props** | `interact: 'hold'` props (brake wheel, levers): hold UP for `t` s, emits `used`. | L1 freezer lever, L2 switch levers. |
| 20 | **Gale weather** | Weather kind `gale`: slanted heavy rain with wind gusts and a lightning scheduler that can be beat-synced; `perPane` weather for rain only under broken panes. | L5 thunderstorm, L8 storm. |
| 21 | **Companion follow (Nero)** | `companion` follows the hero in interiors, waits at roof ladders, rejoins at the next interior, supports "Nero, hold!". | L2, L5, L6, L8. |
| 22 | **Mini-boss slot** | Run a `defineBoss` module as an elite inside a level, separate from the level boss (its own bar, intro, defeat freeze frame). | Any level with an elite. |
| 23 | **Train painters and 3D models** | 2D painters `trainCar`, `locomotive`, `domeGlass`, `roofVent`, `ladder`, `workshop`; 3D-only models in `render3d/models/train/` (car hulls, tunnel portal, gantry, dam). | None. |

---

## 9. Art and audio asset list

### 9.1 Panels (1024x576)

| Id | Content |
|---|---|
| `panel:train_intro_01` | Platform, armoured train, clock 23:39, Ushers loading ledger boxes; clock-stencil crate into the last car |
| `panel:train_intro_02` | Elias kneels to Nero behind a luggage cart |
| `panel:train_intro_03` | Nero refuses; Elias almost smiles |
| `panel:train_intro_04` | Elias drops from the footbridge onto the baggage car; Nero leaps in the side door |
| `panel:train_intro_05` | Lenz on the last car's roof, violin case, metronome, rain |
| `panel:train_outro_01` | Lenz by the roof lantern, broken sabre, stopped metronome |
| `panel:train_outro_02` | Front train into the tunnel; black cars on the valley road; the Board led away |
| `panel:train_outro_03` | The workshop replica, clocks at 3:17, Nero growling |
| `panel:train_outro_04` | Gramophone horn, needle drop, smoking cherry pipe |
| `panel:train_outro_05` | Through the window: the Spire across the valley |

### 9.2 Portraits (512x512)

| Character | Moods |
|---|---|
| Lenz | `lenz_serene`, `lenz_amused`, `lenz_smiling`, `lenz_dying` |
| Grau | `grau_stern`, `grau_furious` |
| Judge Kern | `kern_terrified`, `kern_pointing` |
| Aldane | `aldane_sweating`, `aldane_hollow` |
| The Mayor | `mayor_whining` |
| Elias | `elias_cold`, `elias_furious_quiet` (reuse from earlier levels if present) |

Character refs needed: `lenz`, `grau`, `kern`, `aldane`, `mayor` (`art/characters/<char>/ref.png`).

### 9.3 Backdrops and sprites

- `bg:train_storm_sky`, `bg:train_mountains`, `bg:train_vargas_dam`, `bg:train_valley`, `bg:train_spire_far`, `bg:train_poles_rocks`, `bg:train_trackbed` (tileable, horizontal).
- Sprites: Usher, Gunner, Doorman, Steward (two), Roof Usher (goggles), Grau, Lenz (white suit, sabre, violin case, peg throw, gantry swing, crouched tunnel stance, broken-sabre fall). The Board (3 cowering poses). Nero lying down.
- Props: violin case (throwable), metronome (animated pendulum), brake wheel, gramophone, steel ledger case, chandelier (fall frames), dessert trolley, dome panes (crack stages), roof vents, ladders, gantry beam, tunnel portal.

### 9.4 Music

| Id | Notes |
|---|---|
| `music:train` | Noir jazz on a rail rhythm, about 140 BPM 4/4; tunnel variant (bass and percussion only) |
| `music:train_aisle` | Slow-motion layer: one sustained string chord over the slowed main cue |
| `music:lenz` | Strict waltz, violin and string quartet with a click; 3 stems at 84, 104, 126 BPM; a 1-bar silence point for `rubato`; a cadenza run |
| `music:train_outro` | A scratchy 1930s gramophone waltz under Bell's recording |

### 9.5 SFX

- **Train:** `sfx:train_clatter_loop` (inside and roof mixes), `sfx:train_joint`, `sfx:train_whistle`, `sfx:train_tunnel_roar`, `sfx:train_gantry_bell`, `sfx:train_gantry_whoosh`, `sfx:train_lurch`, `sfx:train_coupler_clank`, `sfx:train_pin_kick`, `sfx:train_chain_taut`, `sfx:train_brake_squeal`, `sfx:train_brake_hiss`, `sfx:train_door_slide`.
- **Weather:** `sfx:gale_loop`, `sfx:gale_gust_howl`, `sfx:thunder_near`, `sfx:rain_on_roof` (interior).
- **Guns:** `sfx:mg_windup_drum_rattle`, `sfx:mg_burst`, `sfx:mg_reload`, `sfx:mg_empty_click`, `sfx:pistol_usher`, `sfx:shotgun_pump` (existing if present), `sfx:bullet_ricochet_steel`.
- **Glass:** `sfx:glass_dome_crack`, `sfx:glass_dome_creak`, `sfx:glass_dome_shatter`, `sfx:glass_window_train`, `sfx:chandelier_crash`.
- **Dining:** `sfx:cutlery_scatter`, `sfx:plate_break`, `sfx:champagne_pop`, `sfx:trolley_roll`, `sfx:steam_jet`.
- **Boss:** `sfx:metronome_tick`, `sfx:metronome_tock_accent`, `sfx:metronome_bell`, `sfx:metronome_winddown`, `sfx:sabre_draw`, `sfx:sabre_ring`, `sfx:sabre_parry`, `sfx:sabre_break`, `sfx:violin_case_latch`, `sfx:violin_harmonic`, `sfx:peg_throw`.
- **Ending:** `sfx:gramophone_needle_drop`, `sfx:gramophone_crackle`, `sfx:clock_silence_room` (room tone without ticks), `sfx:nero_growl`.
- **Voice:** `voice:kern_cut_01` ("Cut it! Cut us loose!"), Usher barks (`voice:usher_sandman_01`: "Sandman, car two.", `voice:usher_roof_01`: "He's on the roof."), Lenz barks (`voice:lenz_allegro`, `voice:lenz_rushing`, `voice:lenz_again`, `voice:lenz_presto`, `voice:lenz_rest`, `voice:lenz_count` for Easy), `voice:bell_gramophone_01` ("Hello, Elias. Midnight. The Spire. We'll finish the lesson.").

---

## 10. As built (branch `worktree-agent-ac65d69a2c43084f5`)

Module: `src/levels/train/` (`data.js`, `paint.js`, `run.js`, `three.js`, `index.js`); bosses `src/bosses/grau.js` (mini-boss) and
`src/bosses/lenz.js` (boss). Cutscenes: `assets/cutscenes/train_intro.json`, `grau_intro.json`, `board_surrender.json`,
`lenz_intro.json`, `train_outro.json` (end panels 1-2), `train_reveal.json` (end panels 3-5).

### 10.1 The fold (the plan's 3600 px into the engine's 2800 x 320 world)

Each car is a camera group. The car ends are walls. Doors, the hatch, the window and the ladders (↑ by one) join the cars with a short
fade. The boss roof is the game's club (x 2436-2800). The workshop is before the club wall: after the boss, the level leaves the club.

| Section | x | Joined by |
|---|---|---|
| roof_front | 0-300 | the hatch (x 284, ↑ when the roof Ushers are down) |
| baggage | 308-556 | the gangway door (x 550, ↑ when b1 and b2 are down) |
| dining (aisle and galley) | 564-880 | the galley door (x 874, ↑ when d1 and d2 are down) |
| sleepers | 888-1140 | the end window (x 1132, ↑: up onto the roof) |
| roof_mid (sleeper A, the 28 px car gap, sleeper B, the tail stub) | 1148-1750 | the dome glass breaks under him (a drop) |
| dome | 1758-2040 | the rear door (x 2034, ↑ with the vault key) |
| vault | 2048-2200 | the ladder (x 2192, ↑ with the ledger): into the club |
| roof_boss (club): vault roof, gangway plate, last car, rear platform | 2436-2800 | the last car's door (scripted, after the brake) |
| workshop | 2208-2414 | the end |

When a car is narrower than the view, the cars beyond its ends are drawn dark (drawFx).

### 10.2 The moving train (shared code; the same pixels in 2D and 3D)

- **Scroll**: `S.sc` moves at the train's speed: 600 px/s; 520 for the Board's tail; 690, 690, 780 in Lenz's phases. The brake takes
  it to 0 in 6 s. `paint.js backPix` draws the sky and the clouds (k 0.01), the mountains (0.08), far lights (0.3), the Vargas Dam
  (0.2, roof_mid and phase 1), telegraph poles (0.5) and, in phase 3 and the workshop, the valley and the Spire. It fills the sky of
  the roofs and every window hole (`WINDOWS`) on the wall layer.
- **Rail joints**: a clack every 0.43 s. **Lurches** indoors every 25-40 s: loose things slide toward the rear, a goon mid-swing
  staggers, the hero slides 12-20 px unless he crouches. **Wind** on the roofs: a steady push toward the rear; a howl, then a gust.
- **Sweepers** (`SWEEP` in `data.js`): gantries (a beam at y 236-262, 14 dmg) and tunnels (the mouth hits like a gantry; inside, a
  body that stands is hit again once a second, 10 dmg). Crouch (↓), roll or lie down to pass. Warnings: the signal bell or the whistle
  1.5 s before; the front edge of the roof flashes red (on Easy, a stripe across the whole roof). Goons duck by chance (E 40, M 60,
  H 80, W 95 %); a goon who fails is swept off the train. Roof spawns wait while a sweeper is warned or passes. The dining car's tunnel
  is a 2.5 s blackout. After the scripted list, a gantry comes every 16 s while the hero stays on a roof.
- **Gaps**: the 28 px car gap, the decouple gap, the breathing gap on the boss roof. A body on the floor over a gap falls. A goon
  leaves the train. The hero falls; on Easy and Medium he takes 30 (35 on the boss roof) and is back at the near edge; on Hard and
  Wicked it is a retry from the checkpoint.
- **Eject zone**: the open side door of the baggage car (x 424-462). A goon knocked down, thrown or flying into it leaves the train.
  A Doorman's bear hug next to it throws the hero at it: he catches the frame (15 dmg) and is pulled back in.

### 10.3 Set pieces

- The drop from the footbridge (a slow-motion landing). Nero is in the baggage car: he follows inside the cars, waits on the roofs,
  lies by the safe, growls at the gramophone. No "hold" command: there is no key for it.
- **The aisle**: the diners sit; they stand when he is 40 px in. Slow motion on his first roll, shot or throw, or after 0.6 s (a "ROLL"
  toast on Easy). The galley's Stewards come at 60 % down. Three chandeliers (a shot or a thrown thing drops one: 25 dmg and a
  knock-down within 20 px), six window panes (shots crack and break them), the steam valve (a blow: a 2 s jet, 6 dmg every 0.25 s; it
  blinds), the cleaver rack (a katana stands in for the long cleaver: the hero has no machete).
- **The sleeper corridor**: the Gunner behind the luggage trolley (cover), Ushers from the compartments, compartment 3 (↑: a bandage and
  a gold Choir coin), the shotgun in the emergency cabinet. A Gunner always drops his machine gun (60 rounds).
- **The roof over the dam**: the Vargas tunnel, then the dam and the gantries; Ushers climb the ladders at the car ends.
- **"Cut the car!"**: Kern on the speaker (a toast), the coupling pin, the stub drops back (the gap grows from 20 px to 100 / 120 px in
  6 / 5 / 5 / 5 s; riders move with it). A jump from the edge while the gap is open is the slow-motion leap onto the stub (an assist
  carries him; his gun fires in the air as usual). On the stub: the cut wave. When it is down (or after 8 s) the glass creaks twice and
  breaks: the drop into the dome (a slow-motion landing on a table).
- **The dome**: 12 panes overhead. Climbing rounds break them; a broken pane drops shards (a 0.5 s ring, 6 dmg) and lets the rain in.
  The Board (the Mayor, Kern, Aldane) cower behind the bar (drawn heads that duck and peek). A Bell & Sons clock at 3:17.
- **The Board surrenders** (portrait dialog), the vault key on the bar, the vault (the ledger in the safe, the katana, the shotgun; the
  metronome is audible), the ladder.
- **The ending**: the metronome winds down, end panels 1-2, he walks to the rear platform and turns the brake wheel (the speed falls
  to 0 in 6 s, sparks), silence, the last car's door opens, the workshop (every clock at 3:17, a pipe smoking, Nero growling), the
  needle drops (a tripwire at x 2318), panels 3-5, the results card. The ending is an in-engine cinematic (the game ignores keys during
  an ending; Esc or Enter goes to the card), not a "hold ↑" prompt.

### 10.4 The Ushers (data: `USHERS` in `data.js`)

| Variant | Base | What it does | The answer |
|---|---|---|---|
| Usher | pistol | Paired shots; steps back when you come within 50 px | Crouch behind a vent or the trolley (cover stops shots at its height), then close in |
| Roof Usher | pistol | Climbs over the ladders at the car ends; ducks sweepers by chance | Knock him into the path of a gantry |
| Gunner | pistol (long gun), HP +40 %, speed 60 % | Plants (1.2 s; E 1.6, W 1.0: a drum rattle, a red stripe down the lane, a red muzzle glow), a 10-round sweep low to high, a 2.2 s reload | A heavy blow (14+) or a thrown thing stops the wind-up; roll through; punish the reload |
| Doorman | brawler, HP +50 % | A 0.55 s reach for a bear hug, then a throw (at the side door: out of it) | Dodge the reach; keep your back away from the door |
| Steward | knife, speed +15 % | Quick lunges (dining car and galley only) | Keep distance; hit him after the lunge |
| Steward (plates) | thrower, 8 dmg | Thrown "plates" (the engine's thrown knives) | Close in |

Fire tokens: at most 1 / 2 / 3 / 4 shooters in any 1 s window (a Gunner costs 2); a shooter without a token holds his aim.
Reinforcements on Hard and Wicked (`b2` and `rm2` are bigger there; `s3` is the second Gunner on Wicked). No wave spawns on a ledge.
Ambushes never open within 50 px of the hero.

### 10.5 Bosses

- **Head Usher Grau** (`src/bosses/grau.js`, the mini-boss slot `M.mini()`): HP 300 / 380 / 440 / 500, poise 45. Phase 1: the sweep
  (14 rounds, a 1.0 s wind-up; the last rounds climb into the glass; a 2.2 s reload), the case guard (front blows ring off it unless
  they do 22+ dmg or come from the axe or a thrown thing: those break the guard), the case bash (0.6 s; into the bar or a wall: a 1.5 s
  stun). Phase 2 (50 %): he throws the empty gun (a machine gun with 30 rounds on the floor), pistol volleys (3 paired shots), the glass
  drop (2 floor rings, 0.6 s, 10 dmg). Crew: Ushers from the rear door every 8 s, alive 1 / 2 / 2 / 3. Defeated: slow motion, the crew
  kneel, the Board's scene.
- **Viktor Lenz** (`src/bosses/lenz.js`, the game's boss): HP 800 / 1000 / 1150 / 1300. The run keeps the beat clock: 3 beats a bar at
  84, 104, 126 BPM by phase; tick, tick, TOCK; the metronome on the lantern swings with it. He picks a move only on beat 1; strikes
  land on beat 3 (a white rim light, the TOCK). Moves: lunge (a 90 px thrust; on Hard and Wicked the tell is beat 2 only), waltz (high,
  high, low in the next bar), bow (a blow on beats 1-2 is parried and answered: riposte 14 / 22 / 26 / 30), the case throw (the case
  stays on the roof; thrown back at him: a 1 s stun), pizzicato (pegs high, low, high), the vault (phase 2+: on a warned gantry he
  swings over you and lands behind with a cut), cadenza (phase 3: the bell twice, six cuts on half beats, 1.6 s open after), rubato
  (below 10 %, once: the metronome stops for a bar, then an off-beat lunge). Punish window 2 / 1.5 / 1 / 1 beats.
  Hazards on the grid: a gantry every 8 / 6 / 4 bars, tunnels every 12 / 10 bars in phases 2 / 3 (2 bars long), each warned one bar
  before. He ducks every warned hazard (or rides a gantry in phase 2+). Stunned, he cannot duck: a gantry then takes 12 % of his health
  and stuns him for 2 s. Phase 2 stragglers: a roof Usher climbs a ladder every 4 bars (alive 0 / 1 / 2 / 2); he cuts down any Usher in
  reach on beat 3; their stray shots hit him (the engine's bodies-are-cover rule; no 50 % rule). Phase 3: he leaps to the last car and
  kicks the pin; the plate falls; the gap breathes between 30 px and 80 / 100 / 110 / 120 px over 2 bars (the chain clanks at its
  widest); he stays on the last car and cuts thrown things out of the air on beat 3. A phase-3 checkpoint on Easy and Medium (the retry
  starts at phase 3 with him at 30 %). Barks: "Allegro.", "You're rushing." (a parry), "Again. From the top." (he hits you), "Presto.
  Let's lose the orchestra.", "You heard the rest." (after rubato); on Easy he counts "One. Two.".

### 10.6 Chapter flow

`startChapter7()` plays the intro panels, then the level. The menu item "Chapter 7: The Last Train" is locked until `progress.ch7` (the
lock text names Commissioner Vane at the Palm House). Beating Lenz unlocks `ch8`; results key `ch8` (par 720 s). Level 6 is not in this
branch: at merge, its results card should lead here (`else if (<level 6>() && progress.ch7) startChapter7();`). The menu index of this
item (`menuSel` 6) assumes that Chapter 6 is not listed yet.

### 10.7 Asset names (stable)

- Panels: `train_intro_01`..`05`, `train_outro_01`..`05` (`assets/art/panels/train/`). Portraits: `lenz_serene`, `lenz_amused`,
  `lenz_smiling` (`lenz_dying` is not used: panel 1 carries his last line), `grau_stern`, `grau_furious`, `kern_terrified`,
  `kern_pointing`, `aldane_sweating`, `aldane_hollow`, `mayor_whining`, `elias_cold`, `elias_furious_quiet`.
- Cutscene scripts: the six above. `kern_cut` is a toast, not a script.
- Music cues (stand-ins in `src/audio/manifest.js`): `music:train`, `music:train_aisle`, `music:lenz`, `music:train_outro`. In the
  level: `docks_explore` (calm), `boss_marchetti` (Grau, Lenz).
- SFX: no new sounds. Stand-ins: `train_clatter` (joints, lurch), `train_horn` (the whistle), `bell_ting` (the signal bell, the
  metronome's accent and bell), `perc_hat` / `perc_tom` (tick and TOCK), `chain_creak` (the drum rattle), `mg_burst`, `chain_snap`,
  `hook_clank`, `glass_*`, `chandelier_*`, `douse_hiss` (steam, the brake), `door_open`, `ladder_step`, `pa_click`. Every
  `sfx:train_*`, `sfx:metronome_*`, `sfx:gramophone_*` and `sfx:sabre_*` name in 9.5 is missing.
- Voice ids in the scripts (none exist): `train_intro_01`, `_03`, `_04`, `elias_stay`, `grau_intro_01`, `_02`, `elias_member`,
  `board_01`..`05`, `elias_silent`, `elias_nero`, `elias_who`, `lenz_intro_01`..`03`, `elias_move`, `elias_maestro`, `lenz_dying`,
  `train_outro_02`, `_03`, `_05`, `bell_gramophone_01`.

### 10.8 Test hooks (`?manual`)

`window.__train`: `chapter()`, `start()`, `skip('baggage'|'dining'|'sleepers'|'roof'|'cut'|'dome'|'vault'|'boss')`, `toBoss()`,
`peek()` (section, waves, sweepers, the stub, the dome, Grau, Lenz's move and the beat, the plate and the gap, the ending), `tp(x)`,
`kill(n)`, `setDiff(i)`, `hurtBoss(n)`, `hurtMini(n)`, `hurtHero(n)`, `heal()`, `view3d(on)`, `zoom(z)`, `equip(w)`, `retry()`,
`unlock(id)`, `progress`, `input`, `TR` (the run: `TR.sendSweep('gantry'|'tunnel')`, `TR.S`), `ENG`.

### 10.9 Not done in this pass

- No zoom control per section (the engine has no hook): no wide shot over the dam, no push-in in the workshop.
- Ushers do not walk to cover by themselves (the vents and the trolley stop shots for anyone who crouches behind them, the hero too).
- No dessert trolley that rolls in a lurch (a chair stands in), no champagne bucket, no coin cage; ledger boxes are big crates;
  napkins and tablecloths do not fly.
- The leap is an assist (any jump from the edge while the gap is open lands on the stub); no shotgun recoil push in the air.
- In 3D the decouple gap on roof_mid does not open in the floor (only the boss roof's floor is drawn live in 3D); the wall layer shows
  the stub and the chain.
- Faction hostility: the stragglers shoot only the hero; their stray rounds hurt Lenz only as cover.
- No hemiola on Wicked; the rubato stops the metronome, not the music track.
- The crew kneel after Grau without a surrender animation; the Board are drawn heads, not sprites.
