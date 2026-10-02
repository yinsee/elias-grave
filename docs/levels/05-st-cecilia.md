# Level 5: "St. Cecilia"

Level id: `hospital`. Order: 5. Palette: `hospital`. Boss: Dr. Anselm Krieg (Baritone, the Choir's surgeon).
Sources: `docs/story-bible.md` §3 Level 5, `docs/architecture.md` §3 (level format) and §4 (boss framework).

Difficulty names in this file: **E** Easy, **N** Normal, **H** Hard, **W** Wicked. A count written `1/2/3/4` is E/N/H/W.

---

## 1. Summary

| Item | Value |
|---|---|
| Story beat | Mags is shot (end of L4). Elias pays Choir gold for a bed at St. Cecilia. Somebody paid more: Krieg's Orderlies come to finish her. **Nero guards her bed in Room 314.** Elias must go up to Krieg and cut the order at its source, but he must run back each time Nero barks. He learns that Mags was shot because she saw police collect Malaspina's money at Club Noir. Krieg's phone gives "A.V." and the Winter Gala invitation (hook to L6). |
| Twist setup | Krieg: "Your Maestro is closer than you think." A Bell & Sons clock stopped at 3:17 hangs over the scrub sinks in the boss theatre. |
| Setting | St. Cecilia Hospital, a 1930s Art Deco hospital with a Choir-owned private wing. Five floors on one strip: Ward 3 (hub), the closed Isolation Wing (3F), the Morgue and generator (B1), the ER and the ambulance bay (G), the Operating Theatres (4F), the Rooftop Helipad. |
| Time / weather | 04:10 to 05:30, before dawn. A thunderstorm. Lightning every 5-12 s outdoors and through windows. Power fails, flickers and comes back on a schedule (see §2). |
| Mood | Clinical horror plus noir. Green monitor light, red emergency strips, white coats in the dark, wet glass. The quietest level until the storm on the roof. |
| Slow-motion set piece | The gurney ride: Elias rides a gurney down the Isolation Wing corridor, it hits the glass wall of Ward 5, and he flies through the glass in slow motion, firing at three Orderlies (bible set piece). |
| Length target | 10-11 min on N (E about 9, W about 12 plus retries). Budget per beat in §3. |
| Music | Cue `music:hospital_dark`: low cello drones, a slow hospital-monitor beep in the rhythm section, no drums in the dark sections. `music:hospital_defend`: the same theme with a fast pulse and a dog-bark sample on the downbeat. `music:krieg`: a dissonant waltz on a detuned piano and a string quartet; phase 3 adds storm percussion and a choir. Music cuts to near silence in each blackout; only rain and the hero's breath remain. |
| SFX mood | Rain on glass. Thunder delayed after each flash (0.3-2 s, which tells the distance). Fluorescent tube buzz and click on power return. Monitor beeps from Room 314 that the player hears faintly in every 3F section (a heartbeat for Mags). Gurney wheels squeal. Defibrillator charge whine. Nero's bark, echoed and panned toward Ward 3. |

---

## 2. Sections map

All sections use ground y 280. Each floor is one section side by side on the strip. Doors, stairwells, the dead lift shaft and two lifts join them with section transitions. `W = 3600`, `H = 320`.

### 2.1 Whole strip (horizontal layout)

```
x:  0        560 600              1300 1340        1800 1840              2560 2600      3060 3100         3600
    |  WARD 3   |  | ISOLATION WING   |  |  MORGUE B1  |  |  ER  G   |  BAY G   |  | THEATRE 4F|  |  ROOF / PAD  |
    | hub, 314  |  | glass wards      |  | generator   |  | triage   | outdoor  |  | gallery   |  | helipad      |
    | indoor    |  | indoor, DARK     |  | indoor, DARK|  | indoor   | rain     |  | boss P1-2 |  | boss P3 rain |
```

### 2.2 Building side view (travel order and transitions)

```
              ____________________________________________________________
 ROOF        | [stair hut]   ~~ rain ~~  ( H )  helipad    ~~>wind  [mast]  |   section roof      (boss P3)
             |_____^______________________________________________________|
 4F THEATRE  |[lift]|scrub|=gallery=|##glass##|   OR table   [bed]  [stair]^  section theatre   (beats 12-13)
             |__^___|_____|_________|_________|_______________________|____|
 3F  WARD 3 + ISO WING                                                     
     [stair]  Room 314 |glass|  nurse   [door]==>[sheet] fishbowl  gurney>>|Ward 5| [dead lift]
       ^  |    (Mags, Nero)    station            glass wards       run   |glass |    |  drop
       |  |  <======= "bark" return: any [stair] door -> Ward 3 [stair] ====|      |    |
 G   ER + BAY                                                               |      |    |
       '->[stair] triage | curtain bays | security | {doors} | BAY: ambulance x2 | [trauma lift] -> 4F
 B1  MORGUE                                                                         |
      [stair] <- drawers | autopsy | cold room | GENERATOR [lever]  <----------------'
```

Travel order: Ward 3 -> Iso Wing -> (bark: Ward 3 -> back) -> drop shaft -> Morgue -> (bark: Ward 3) -> breather in Ward 3 -> stair -> ER -> Bay -> trauma lift -> Theatre -> stair -> Roof.

### 2.3 Section table

| id | x0-x1 | Floor | In/out | Backdrop | Lighting | Camera |
|---|---|---|---|---|---|---|
| `ward` | 0-560 | 3F | indoor | `wall`: green-tiled corridor, Art Deco doors, rain-streaked windows (back lane) at x 60, 420 show the city and lightning. | Starts in **blackout**: red emergency strips at floor level, green monitor glow in Room 314 (light r 70 at x 270), a candle-yellow nurse-station lamp on battery (x 460). Lightning through windows every 6-10 s. Fluorescents come back (white, buzzing) after beat 8. | Bounds 0-560. zoom 0.55-0.7 (tight, intimate). Camera bias +40 px toward Room 314 during defend events so bed and both doors stay in frame. |
| `iso` | 600-1300 | 3F | indoor | `wall`: plastic quarantine sheeting, biohazard signs, glass ward cubicles in the back lane (x 660-900), a long straight corridor east of x 930. | **Dark section.** Ambient 0.06. Light comes only from: the hero's torch cone, lightning through a skylight strip (x 700-1250), red exit signs over stair doors, enemy penlights and headlamps. Glass reflects each flash. | Bounds 600-1300. zoom 0.5-0.65. During the gurney ride the camera leads +120 px and zooms out to 0.45, then snaps in to 0.7 on the slow-mo dive. |
| `morgue` | 1340-1800 | B1 | indoor | `wall`: steel body drawers (3x6 grid, x 1380-1520), autopsy tables, a cold room door with frost, then the generator hall with pipes and a big diesel generator (x 1690-1770). | **Dark.** Cold blue fog (ground layer). Water leaks from pipes (puddles at x 1460-1520, 1600-1660). The generator's start sequence lights the room in stages: orange warning beacons, then sodium lamps. | Bounds 1340-1800. zoom 0.5-0.65. The hero enters from the top (shaft drop at x 1400). Camera pans down 40 px on the drop. |
| `er` | 1840-2300 | G | indoor | `wall`: triage desk, curtained bays (soft curtains in the fight lane), waiting chairs, a TV on the wall with storm news. | **Flicker.** Emergency power: tubes on but they **fail for 3-5 s every 14-20 s** when lightning hits the building. In a failure only red exit signs and the TV glow remain. | Bounds 1840-2560 (shared with bay). zoom 0.45-0.6. |
| `er` (bay part) | 2300-2560 | G | **outdoor** | `city`: rain, street, the red neon cross *St. Cecilia* over the canopy (x 2400), two ambulances (vehicle ledges). | Rain, heavy. Rotating ambulance light bars (red/blue, light r 90). Lightning every 5-9 s. The canopy at y 200 shelters x 2320-2460 from rain. | As above. |
| `theatre` | 2600-3060 | 4F | indoor | `wall`: scrub room (x 2600-2680) with sinks and the **Bell & Sons clock at 3:17** (x 2640, y 200); the observation gallery (platform y 196, x 2690-2860) with its glass window; the theatre floor with a big round surgical lamp over the table (x 2900), clerestory windows high on the back wall (x 2880-3040). | Boss lighting is driven by the gimmick (§5): surgical lamp on (white cone), then scheduled blackouts, then full dark with lightning. | Arena lock 2690-3050. zoom 0.5-0.6. Camera holds the gallery and the floor in frame at all times. |
| `roof` | 3100-3600 | Roof | **outdoor** | `sky`: storm clouds, the city below with the police HQ glowing across the river (L6 foreshadow). Stair hut (x 3110-3170, roof y 230). Helipad circle "H" (x 3220-3540). Landing-light mast (x 3545). Windsock (x 3575). | Ambient 0.12. Lightning every 3-6 s with a full-screen flash. The rotorless landing lights blink amber. | Arena lock 3110-3590. zoom 0.45-0.55. Small camera sway with wind gusts. |

---

## 3. Encounter flow

Each beat lists: location, enemies (role counts E/N/H/W), placed items, environment use, start/end trigger, and why it is exciting. Roles: `orderly` (brawler), `restrainer`, `syringe`, `scalpel` (thrower), `bonesaw`, `anaesthetist`, `security` (pistol) are defined in §4.

### Beat 1. "Room 314" (exploration, 0:30)
- **Location:** `ward` x 0-560. Start at x 290 beside the bed, after the opening cutscene.
- **Enemies:** none.
- **Items:** `torch` (flashlight) on the nurse-station counter x 470; 1 bandage x 430; IV stands x 150, 380; a wheelchair x 520; a payphone (prop, inert now) x 120.
- **Environment:** Lightning shows the corridor in flashes. The Room 314 glass wall (pane `room314`, x 360) has a sliding door that is open. A toast teaches: "Torch: lights a cone ahead. Enemies in the dark show only in light or lightning."
- **Trigger:** starts at level start. Ends when the hero picks up the torch (`pickup: torch`).
- **Why:** It shows the player what they protect (Mags, Nero, the beeping monitor) before the first threat. The bed and Nero become the anchor of the whole level.

### Beat 2. Defend D1 "First Visitors" (defend tutorial, 0:45)
- **Location:** `ward`. Enemies enter from the east door x 548. The ceiling vent x 300 is shown but not used yet.
- **Enemies:** `orderly` 2/2/3/3, `syringe` 0/1/1/2. One follow-up `restrainer` 0/0/1/1 on H/W.
- **Items:** wheelchair (kick it down the corridor to bowl a goon), IV stands (pick up as a short pole or throw), oxygen tank x 500 (shoot or hit: 1 s hiss, then 60 px blast).
- **Environment:** Krieg on the PA: "Code Black, room three-fourteen. Thank you, team." Nero growls and holds the line at x 340 (he pins one goon for 4 s). The defend HUD appears: Mags's vitals (3 hearts) and Nero's guard bar.
- **Trigger:** starts 4 s after the torch pickup. Ends on `killed: d1`.
- **Why:** The player learns the defend rules with zero travel: the bed is on screen. The "inject" ring over the bed is shown once, clearly, so later defends are fair.

### Beat 3. "The Closed Wing" (dark fight, 0:45)
- **Location:** `iso` x 600-930. Entry through the plastic sheets at x 640 and x 760 (sheets tear when hit; they hide enemy outlines until torn).
- **Enemies:** `orderly` 1/2/2/3, `syringe` 1/1/2/2, `scalpel` 0/1/1/1 on the maintenance walkway (platform y 200, x 700-900; ladder at x 700).
- **Items:** instrument trolley x 680 (push it; scalpels and tins pocket as throwables), fire extinguisher x 820 (throw: bursts a white cloud that hides the hero from shooters for 3 s), 1 ammo box (shotgun shells for later) x 900.
- **Environment:** No light but the torch and lightning. Each enemy blade shows a white **glint 0.35 s (scaled) before every strike** even in full dark. Penlights on syringe Orderlies make them visible.
- **Trigger:** `section:enter iso` spawns `w3` from the far sheets. Ends on `killed: w3`.
- **Why:** The first real dark fight. The player learns to turn toward sounds, wait for glints and use lightning. The sheets give jump scares that are fair (the outline shows when the torch hits the sheet).

### Beat 4. "Fishbowl" (glass-ward set piece, 0:45)
- **Location:** `iso` x 640-920. Three glass ward cubicles in the back lane (panes `fish1..3`, depth -30, hp 40 each).
- **Enemies:** 2/3/3/4 Orderlies wait *inside* the cubicles, standing still, seen only in lightning flashes (silhouettes against the glass). They burst out through the glass (front-lane spill of shards) one by one, every 2.5 s, after the hero passes x 860. Plus `anaesthetist` 0/0/1/1 behind the glass of cubicle 3, who fires darts **through** the glass (the shot cracks the pane; the third shot breaks it).
- **Items:** an `adrenaline` pen x 880 (clears sedation, 5 s immune), 1 bandage.
- **Environment:** The player can break a cubicle pane first with a thrown object to bring the Orderly out early on their own terms. Shards on the floor: running over them is loud (`noise`), so the next Orderly turns.
- **Trigger:** `heroX >= 860` (and w3 dead). Ends on `killed: w4`.
- **Why:** Horror staging. The player sees figures behind glass in each flash, then sees them gone in the next one. Glass breaks with full reflections and blood stains.

### Beat 5. Gurney ride and the Ward 5 dive (slow-motion set piece, 0:20)
- **Location:** `iso` x 940-1290. A long straight corridor. Gurney `gurneyRide` parked at x 950 with a **shotgun** lying on it (pickup `shotgun`, 8 shells).
- **Enemies:** 2/2/3/3 `orderly` in the corridor (x 1000-1100), who get bowled over by the gurney (knockdown, 10 dmg). Inside Ward 5 (x 1160-1290, closed by the vertical pane `ward5` at x 1150, hp 80): exactly **3** Orderlies (`syringe`, `bonesaw`, `scalpel`) on all difficulties; W adds 1 `orderly`.
- **Environment:** The hero picks up the shotgun, jumps on the gurney (ride prompt) and kicks off. The gurney rolls east at 260 px/s. The hero can fire forward while he rides. At x 1120 the gurney hits the `ward5` pane: `timeScale 0.3` for 2.5 s (real time), the pane bursts, the hero flies through in a dive pose and keeps aim control; shotgun fire is unlimited for the slow-mo window (shells refund). The three Orderlies stand in a row (x 1180, 1220, 1260), so a skilled player kills all three before landing. Landing ends slow-mo.
- **Trigger:** ride starts when the hero is on the gurney and presses forward + attack (`ride: gurneyRide`). Slow-mo starts on `glass:break ward5`. Ends on `killed: w5`.
- **Why:** The level's signature moment, built from a hospital object. It also hands the player the shotgun for the rest of the level.

### Beat 6. Defend D2 "Barking" (return and defend, 0:45)
- **Location:** starts in `iso` at Ward 5; fight in `ward`.
- **Trigger:** `killed: w5` + 2 s. **Checkpoint saved.** Nero barks (panned left, loud). HUD: Nero icon at the left screen edge, an arrow to the red-lit stair door `isoStair` (x 1120, 40 px from Ward 5). Warning timer before the goons enter Ward 3: 20/15/12/10 s.
- **Enemies:** from the east door x 548: `orderly` 1/2/2/2, `restrainer` 0/1/1/2. From the ceiling vent x 300 (telegraph: vent panel rattles and dust falls 1.5 s before the drop): `syringe` 1/1/2/2. W adds a second vent drop of 1 `bonesaw`.
- **Items:** respawned oxygen tank x 500 (one per defend), IV stands.
- **Environment:** The return is fast: the stair door transition takes 0.6 s and puts the hero at x 40 in `ward`, 230 px (about 2.5 s run) from the bed. The goons enter at x 548, 280 px from the bed, at walk speed (about 9 s). Nero intercepts the first one.
- **End:** `killed: d2`, then a "Back" toast; the `wardStair` door now returns the hero to `isoStair` x 1120.
- **Why:** The bark breaks the forward flow and makes the player feel the bond. It is fair: it fires only after a fight ends, the door is close, the timer is visible, and Nero buys time.

### Beat 7. Shaft drop and the Morgue drawers (dark, 0:40)
- **Location:** `iso` dead lift x 1280 -> `morgue` x 1340-1600.
- **Environment:** The service lift is dead. The hero pries the doors (hold interact 1 s) and drops down the shaft (transition with a fall; the hero lands at x 1400 in a crouch). The morgue is dark and foggy.
- **Enemies:** Ambushers in the body drawers and body bags: `orderly` 2/2/3/3, `syringe` 1/1/1/2, `bonesaw` 0/1/1/1. Spawn source `prop`: a drawer rattles and slides out 0.8 s before the goon sits up (fair telegraph; the torch makes the drawer handle glint).
- **Items:** autopsy tables x 1450, 1550 (platforms y 252: stand on them to stay out of the puddles), an instrument tray (pocket scalpels as throwables), 1 bandage, **fire axe** in a glass cabinet x 1570 (break the glass to take it; pickup `axe`).
- **Trigger:** `section:enter morgue` arms the drawer spawns one at a time as the hero passes x 1420, 1480, 1540. Ends on `killed: w7`.
- **Why:** A short horror beat with a change of floor and mood: cold, blue fog, steel. The fire axe is the reward for the next fight.

### Beat 8. "The Porter" elite fight and the generator (mini-boss, 1:00)
- **Location:** `morgue` generator hall x 1600-1800.
- **Enemies:** **The Porter** (elite `orderly`, see §4): a huge head porter with a steel oxygen tank as a club. HP 220/260/300/340. Support: `orderly` 0/1/1/2 from the cold room door x 1590 at 50% Porter HP.
- **Items:** 2 gurneys (pushable), 2 oxygen tanks x 1640, 1700 (explode), puddles x 1600-1660 (water zone), the generator lever x 1780.
- **Environment:** The Porter's moves: tank swing (3-hit string), **gurney charge** (he pushes a gurney at the hero at 220 px/s; jump on it or roll through), tank throw (the tank lands, hisses 1.2 s, then explodes; the player can kick it back). Shoot a tank near him for a 2 s stun. After he falls: pull the lever (hold 1.5 s). The generator coughs three times (beacons, then sodium lamps, then lifts live). Lights stay at emergency level.
- **Trigger:** `heroX >= 1610` and w7 dead. The doors behind lock. Ends on `killed: porter` + lever pulled (`flag: power`).
- **Why:** An elite with the axe in hand, explosive props and the payoff of turning the lights back on.

### Beat 9. Defend D3 "Code Black" (largest defend, 1:00)
- **Location:** starts in `morgue`; fight in `ward`.
- **Trigger:** `flag: power` + 3 s. **Checkpoint saved.** Krieg on the PA: "Power's back. Good. I prefer to see my work." Bark, timer 22/16/13/11 s, return via `morgueStair` x 1360.
- **Enemies (three sub-waves):**
  - D3a east door: `orderly` 2/2/3/3, `scalpel` 0/1/1/1 (stands on the nurse-station counter, platform y 250).
  - D3b vent (rattle telegraph): `syringe` 1/1/2/2, `restrainer` 0/1/1/1.
  - D3c **west stair door x 24** (the hero's own door; a 2 s door-handle rattle and a voice "Stairwell, go"): `bonesaw` 0/1/1/2, `anaesthetist` 0/0/1/1.
  - Each sub-wave starts when the previous one has 1 goon left, or after 15 s.
- **Items:** oxygen tank x 500, a fresh wheelchair, 1 bandage at the nurse station after D3b.
- **Environment:** The ward lights now work but the PA cuts them for 4 s at the start of D3c (red emergency light only). The `room314` pane is likely broken by now; if it is still whole, goons must break it (2 s), which buys time.
- **End:** `killed: d3`.
- **Why:** The climax of the defend thread. Three directions, one telegraph each, the hero's own exit turned against him.

### Beat 10. Breather (0:30)
- **Location:** `ward`, Room 314.
- **Environment:** Full ward lights (the storm still flashes the windows). Mags mumbles in her sleep (subtitle, no portrait): "Elias... the cops... in the club..." Elias puts his hand on Nero's head (in-engine pose, 2 s). The payphone at x 120 rings. The hero answers (interact): Hale (subtitle and portrait): "Krieg operates on four. The trauma lift from the ambulance bay goes straight up. Every coat in that building is his tonight." Elias: "Not for long."
- **Items:** 2 bandages, 1 ammo box, 1 adrenaline pen, the torch is recharged.
- **Trigger:** `killed: d3`. Ends when the hero uses `wardStair` (now routed to `erStair` x 1856). **Checkpoint saved.**
- **Why:** A pause in light and safety before the loudest fight. It plants the story clue (the cops) and the route.

### Beat 11. ER and the ambulance bay (big fight, 1:15)
- **Location:** `er` x 1840-2560.
- **Enemies:**
  - 11a ER (x 1880-2300): `orderly` 2/3/3/4, `syringe` 1/1/2/2, `security` 1/1/2/2 (pistol, from the security office x 2240), `scalpel` 0/1/1/1 on the triage desk.
  - 11b Bay (x 2320-2560, outdoor, rain): an ambulance (painted vehicle) arrives with lights; its rear doors open: `bonesaw` 1/1/1/2, `restrainer` 0/1/1/1, `anaesthetist` 0/1/1/1 on the ambulance roof (vehicle ledge y 236).
- **Items:** wheelchairs x 1960, 2120 (kick or throw), gurneys x 2050, 2400, IV stands, 2 oxygen tanks (one on the ambulance, x 2430), curtained bays (curtains hide enemies; they swing when an enemy passes), **machine gun** in the security office x 2260 (behind a glass door pane, hp 30), 1 ammo box, 1 bandage.
- **Environment:** Power flickers out for 3-5 s every 14-20 s (lightning hits the building). In each flicker the torch and the ambulance lights are the only light. The sliding glass doors x 2310 stay open while power is on and lock in a flicker (break them: pane hp 50). Rain makes the bay floor wet: puddle zones (no shock here; they show reflections and splash noise).
- **Trigger:** `section:enter er` spawns 11a; `heroX >= 2320` and 11a nearly dead spawns 11b. Ends on `killed: w11b`. The trauma lift x 2540 opens.
- **Why:** The biggest open brawl, inside and out, with the most weapons on the floor. It is the "power fantasy" beat before the boss.

### Beat 12. The gallery (boss approach, 0:15)
- **Location:** `theatre` x 2600-2860.
- **Environment:** The trauma lift opens in the scrub room. The Bell & Sons clock at 3:17 ticks once and stops (sfx). The hero climbs to the gallery (stairs at x 2690) and sees Krieg through the observation glass, at the lit table below, snapping on gloves. Boss intro portrait dialog plays (§6). On the last line Krieg throws a scalpel through the gallery glass (the pane `gallery` breaks), and the hero drops to the theatre floor.
- **Trigger:** `heroX >= 2760` (on the gallery). Ends with `{ boss: 'start' }`.
- **Why:** The view through glass makes the meeting theatrical, as the bible asks, and the broken window opens the arena.

### Beat 13. Boss Krieg, phases 1-2 (theatre, 1:30)
See §5. Arena `theatre` x 2690-3050. Ends at Krieg HP 30%: phase shift, he runs up the stair, in-engine transition to the roof.

### Beat 14. Boss Krieg, phase 3 (helipad, 1:00), defeat, end cutscene
See §5. Arena `roof` x 3110-3590. Ends on `boss:defeated`, then the slow-mo freeze frame, then the outro panels and the results card.

**Time budget (N):** 0:30 + 0:45 + 0:45 + 0:45 + 0:20 + 0:45 + 0:40 + 1:00 + 1:00 + 0:30 + 1:15 + 0:15 + 1:30 + 1:00 = **10:40**, plus cutscenes about 1:30.

### 3.1 Defend objective rules (all three defends)

| Rule | Value |
|---|---|
| Target | `magsBed` at x 270 (`ward`). Mags's vitals: 3 hearts (E 4). |
| Inject | A goon who reaches the bed (x 250-290) starts a 3.0 s inject channel (E 4.0, W 2.5). A ring fills over the bed; a rising monitor beep plays. Any hit on that goon cancels it. A finished inject removes 1 heart and sends the goon back 60 px (so the next inject takes time). |
| Fail | 0 hearts. A flatline tone, a 1 s fade to black, then a restart at the checkpoint of that defend (saved at the bark). No lives lost. |
| Nero | Ally actor at x 250-340. HP 100. He blocks one goon at a time at the pane line x 340, bites it and pins it for 4 s (3 s on W). Goons hit him; at 0 HP he is knocked down (yelp) for 8 s, then he gets up. **Nero never dies.** While the hero is in `ward`, the "Nero, hold!" button command picks the goon nearest the bed. |
| Warning | The bark plays 3 times. HUD shows the Nero icon on the screen edge toward the nearest stair door, a countdown ring, and Mags's hearts. In 3D the same icon is a world marker over the stair door. |
| Bark timing | A bark fires **only** after the current wave is dead and 2 s have passed. It never starts during a fight, a cutscene or a slow-mo set piece. |
| Return path | Every section with a bark has a stair door within 60 px of the bark point. The transition is 0.6 s. The hero arrives at x 40 in `ward`. |
| After the defend | `wardStair` returns the hero to the door he came from. Pickups in `ward` refill once per defend (1 oxygen tank, IV stands, 1 bandage on H and below). |
| Ignore case | If the player stays away, goons still need the full timer, the walk (about 9 s), Nero's pins and 3 injects (9 s or more). Total fail time is never under 35 s on W. |

---

## 4. New enemy variants: the Orderlies

All are reskins of today's goon roles, with three small additions (sedation stacks, the strap grab and a held light). White or pale-green scrubs, surgical masks, rubber clogs. They whisper "the Sandman" through their masks.

| Variant | Base role | Look | New behaviour | Stats vs base |
|---|---|---|---|---|
| `orderly` | brawler | Big, white scrubs, latex gloves | Pushes gurneys and wheelchairs at the hero (prop charge, 200 px/s, telegraph: grips the rail, wheel squeak 0.5 s). | Base. |
| `restrainer` | brawler | Heavier orderly with leather restraint straps | **Strap grab:** 0.6 s reach telegraph (strap snaps taut, a creak), then holds the hero 1.5 s; mash attack to escape in 0.6 s; free punches from allies during the hold are blocked on E/N. | HP +20%, speed -10%. |
| `syringe` | knife | Thin nurse in pale green, glowing yellow syringe | Jab and lunge. Each hit adds **1 sedation stack** (§5.4). Carries a penlight, so he is always visible in the dark. | Damage -30% (the stack is the threat). |
| `scalpel` | knife thrower | Surgical intern in a blood-spotted coat | Throws scalpels in pairs (0.15 s apart). Prefers platforms: walkway, counters, ambulance roof, gallery. Scalpels stick in walls and can be picked up as throwables. | Base. |
| `bonesaw` | machete | Surgeon in a leather apron, battery bone saw | **Grind:** the saw rev (0.5 s audio and sparks) then a 3-tick hit (3 x 7). It cannot be parried, only dodged or blocked by a carried object. If the saw hits a bed, table or wall it jams for 1.2 s (punish). | HP +10%. Max 1 alive on E/N. |
| `anaesthetist` | pistol | Surgical cap, headlamp, dart pistol | Fires sedative darts (3 then a 2 s reload). Darts add 1 stack each, deal 4 dmg. Darts crack glass and are blocked by beds and gurneys. Headlamp makes him visible and shows his aim line. | Base pistol stats. |
| `security` | pistol | Hospital guard, grey uniform, revolver | Only in the ER. Choir-paid; flees at 30% HP if he is the last alive. | Base. |
| **The Porter** (elite) | brawler | Huge head porter, rolled sleeves, an oxygen tank as a club | Tank string (3 hits, last one a knockdown), gurney charge, tank throw (delayed blast, kickable), ground stomp on W. Poise 20 (he does not stagger from light hits). | Unique, §3 beat 8. |

**Placement rules**

1. **Light rule.** In any dark section every enemy shows a strike glint (0.35 s / sqrt(A)) before each attack. `syringe` and `anaesthetist` always carry a light. At least one enemy in each dark wave carries a light, so the player always has a target to find.
2. **Sedation cap.** No more than **2** sedation sources (`syringe` + `anaesthetist`) alive at once on E/N, 3 on H/W. No `anaesthetist` in boss crew (Krieg is the dart source).
3. **Grab cap.** A `restrainer` never spawns in the same sub-wave as a `bonesaw` on E/N (a grab plus a grind is unfair). On H/W they may pair.
4. **Throwers high.** `scalpel` and `anaesthetist` spawn on a platform when one is within 200 px; else on the far side of the wave.
5. **Ambush telegraphs.** Spawns from vents, drawers, curtains and cubicles always have a 0.8-1.5 s audio and visual cue, and never within 60 px of the hero.
6. **Defend waves** use at most 2 entry points at once (D3c is the only third entry and it waits for the earlier waves).
7. **Weapons drop.** A killed `bonesaw` drops nothing (the saw is not a hero weapon). A killed `orderly` drops an IV stand or a tin 30% of the time; a `scalpel` drops 2 scalpels (throwables).

---

## 5. The boss: Dr. Anselm Krieg

### 5.1 Profile

Gaunt, tall, a surgical gown over a three-piece suit, a surgical headlamp, a bone saw in his right hand, a dart pistol on his hip, a portable defibrillator cart that he drags (P1-2) and then carries as a backpack unit (P3). Speaks softly and with pleasure.

```js
// src/bosses/krieg.js (sketch)
export default defineBoss({
  id: 'krieg', name: 'Dr. Anselm Krieg', title: 'The Choir\'s Surgeon', look: 'krieg',
  stats: { hp: 900, s: 1.1, m: 5, speed: 30, reach: 26, dmg: 18, heavyDmg: 24, poise: 22, windup: 0.4, cd: [0.8, 1.5] },
  intro: { walkTo: 'arena.x0+210', spotlight: 'surgicalLamp', dialog: 'krieg_intro', t: 1.5 },
  moves: {
    saw:      string({ combos: [['saw'], ['jab', 'saw'], ['saw', 'saw']], grind: { ticks: 3, dmg: 6 }, jamOn: ['bed', 'table', 'wall'], jamT: 1.6 }),
    darts:    volley({ proj: 'dart', n: 3, spread: 8, v: 260, onHit: { status: 'sedated', stacks: 1 } }),
    scalpels: volley({ proj: 'knife', n: 2, v: 320 }),
    shove:    throwObject({ pick: 'nearestBed', as: 'mover', v: 240, windup: 0.6 }),
    defib:    hazard('defibShock', { windup: 1.0, r: 64, dmg: 22, stun: 0.8, water: 'conduct', recover: 1.4 }),
    stalk:    charge({ windup: 0.6, v: 190, maxT: 0.9, requires: 'dark', from: 'outsideLight' }),
    codeBlue: hazard('codeBlue', { windup: 1.5, zones: 'water', dmg: 26, stun: 1.0, recover: 2.0 }),
    taunt:    roar({ t: 0.9, line: 'krieg_taunt' }),
  },
  phases: [
    { id: 1, arena: 'theatre', moves: { saw: 4, darts: 2, scalpels: 1, shove: 2, defib: 1 } },
    { id: 2, enter: { hpBelow: 0.6 }, arena: 'theatre',
      onEnter: ['taunt', { gimmick: 'blackout:full', cd: [0.7, 1.3] }],
      moves: { saw: 3, darts: 2, defib: 2, shove: 1, stalk: 2 } },
    { id: 3, enter: { hpBelow: 0.3 }, arena: 'roof',
      onEnter: [{ transition: { to: 'roof', scene: 'krieg_to_roof' } }, { speed: 33, windup: 0.32 }],
      moves: { saw: 3, darts: 3, scalpels: 1, defib: 2 },
      big: { every: [14, 18], pick: { codeBlue: 1 } } },
  ],
  crew: { every: 6, everyPh2: 8, max: 10, alive: 2, roles: ['syringe', 'restrainer', 'scalpel', 'orderly'],
          ph3: { roles: ['scalpel'], alive: 1, stopBelow: 0.15 } },
  secondWind: { afterKOs: 2, clearCrew: true, drop: 'bandage' },
  gimmick: [stormPower, rollingBeds, helipadStorm],
});
```

### 5.2 Arenas

**Theatre (P1-P2), x 2690-3050**

```
y 150   [clerestory windows: lightning]                       
y 196   ===gallery (broken glass)===|        ( surgical lamp )
y 250                               |   [bed A]   [OR table]   [bed B]       [stair]
y 280 __scrub|_stairs_______________|_____2770______2900_________3000_________3050__
         ^lift  ^Bell&Sons 3:17 (x2640)   breaker box (x 3030, y 230)
```

- Operating table x 2880-2920: a fixed platform (y 250). Darts and scalpels hit it. A saw that hits it jams.
- Rolling beds A (x 2770) and B (x 3000): movers, 48 px wide, 26 px tall, top is a one-way surface. The hero can push them (pushing boxes, faster), jump onto them, ride them when they are shoved, and hide behind them (they block darts and scalpels; 3 saw hits knock one onto its side, which makes a low fixed cover).
- Instrument trolleys x 2720, 3020 (throwables: tins, scalpels). Oxygen tank x 3040 (one; explodes).
- Gallery platform y 196, x 2690-2860, reached by stairs at x 2690. Crew `scalpel` throwers spawn here. The hero can use it to drop-attack Krieg (axe plunge).
- Breaker box x 3030: Krieg's P2 entry pulls it. The hero can hit it to restore light for 6 s (once per 20 s, 1 hit), a fair counter to the dark.

**Roof (P3), x 3110-3590**

```
y 230   [stair hut roof]             lightning target          ~> wind    
y 254                [bed C]                         [bed D]          |mast| windsock
y 280 __hut___|~~puddle~~|____ ( H  helipad ) ____|~~puddle~~|__~puddle~__|parapet
        3110-3170  3240-3300                      3380-3460   3500-3540   3545 3590
```

- Parapets (walls) at x 3110 and x 3590, 18 px high. No pit: knockback into a parapet gives a wall stun, never a fall.
- Puddle zones (water) x 3240-3300, 3380-3460, 3500-3540. Defib and Code Blue shocks fill a whole puddle zone.
- Dry islands: the stair hut roof (y 230), the tops of beds C and D, the mast base dais (x 3540-3560, y 268).
- Beds C (x 3200) and D (x 3470) are pushed by wind gusts.

### 5.3 Phases and moves

Telegraph format follows `{ t, pose, mark, floor, light, cue }`. Times are N values; they scale with `t / sqrt(A)`.

| Move | Phases | Telegraph | Effect | Punish window |
|---|---|---|---|---|
| `saw` string | 1-3 | pose `sawRaise`, saw rev cue, sparks light (orange, r 20) for 0.45 s | 1-2 swings; each swing grinds 3 x 6 dmg | 0.7 s after the last swing; **1.6 s** if the saw jams on a bed, table or wall |
| `darts` volley | 1-3 | pose `aimDarts`, cyan glint on 3 needle tips, a "tsk" cue, 0.5 s; mark: thin aim lines in P1 only | 3 darts (P3: 5 in a fan), 4 dmg + 1 sedation stack each; blocked by beds and the table; deflected by a katana or axe swing; dodge roll passes through | 0.9 s reload pose |
| `scalpels` | 1, 3 | flick of the wrist, glint, 0.3 s | 2 fast knives, 8 dmg | 0.4 s |
| `shove` (bed) | 1-2 | pose `gripRail` beside a bed, wheel squeal, floor arrow on the bed path, 0.6 s | The bed rolls at 240 px/s, 14 dmg + knockdown. The hero can jump onto it and ride it into Krieg (16 dmg, stagger) | Krieg is open 1.0 s after the shove |
| `defib` | 1-3 | "Charging!" voice, rising whine, blue-white arcs on the paddles (light, readable in full dark), floor ring r 64, 1.0 s (P2 0.85) | Area shock 22 dmg + 0.8 s stun. If Krieg stands in or touches a water zone, the shock fills that zone | **1.4 s** paddle recharge (pose `paddlesDown`) |
| `stalk` | 2 | Requires dark. He leaves the light. A whisper line ("Hold still.") and two quick glints at the edge of the torch cone, 0.6 s | Lunge from outside the light, 20 dmg | 0.8 s after a miss; if the hero's torch hits him in the windup he flinches (stagger) |
| `codeBlue` | 3 | "Code Blue!" shout, he kneels and plants both paddles in the nearest puddle, **all** puddle zones arc and glow, 1.5 s | Every water zone shocks for 26 dmg + 1 s stun. Dry islands are safe | **2.0 s** (he is on one knee) |
| `taunt` | 2 entry | voice line, pulls the breaker | Starts full dark | none (cutscene-like, 0.9 s) |

**Phase 1 "Consultation" (100% to 60%), theatre.**
- Lights: the surgical lamp is on. **Gimmick `stormPower` blackouts:** every 15-20 s the power fails for 6 s (E 4 s, W 8 s). In a blackout Krieg's headlamp stays on, so he is always visible as a lamp in the dark. Lightning flashes through the clerestory every 6-10 s.
- Mix: mostly saw and darts, bed shoves when the hero is behind a bed, defib when the hero is close for more than 1.5 s.
- Crew: every 6 s, max alive 1/2/2/3, roles `syringe`, `restrainer`, `orderly` from the scrub door; `scalpel` on the gallery.

**Phase 2 "Lights Out" (60% to 30%), theatre.**
- Entry: Krieg says "Count backwards from ten," pulls the breaker. The theatre goes to **full dark** (ambient 0.04). His headlamp goes **off**.
- He is visible only in: lightning flashes (every 4-7 s, with 0.6 s afterglow), the hero's torch cone, his own defib arcs and saw sparks, and the reflections in the broken gallery glass.
- Counter: the hero can hit the breaker box (x 3030) to bring the lamp back for 6 s (once per 20 s). Shotgun muzzle flashes light 60 px for 0.1 s.
- Crew: every 8 s, max alive 1/1/2/2. **Crew carry penlights** (always visible). No crew spawns during a defib telegraph.
- Move mix adds `stalk`; `defib` weight up.
- Exit at 30%: phase shift. Krieg drops a smoke canister (white, 1.5 s), runs to the stair x 3050. In-engine scene `krieg_to_roof`: "Let's get some air." Transition to `roof`; the hero arrives at the stair hut x 3140, Krieg stands at x 3400.

**Phase 3 "Helipad" (30% to 0%), roof.**
- **Gimmick `helipadStorm`:**
  - **Wind gusts** every 7-10 s, 2.5 s long, direction shown 1.0 s ahead by the windsock and the rain angle (and a whoosh cue). Force: hero +/-25 px/s drift (walking against it is slow; rolls with it go 30% farther), beds roll at up to 120 px/s, darts curve 6 px, thrown objects drift.
  - **Lightning strikes** every 8-12 s: target is the mast (x 3545) or the puddle nearest the hero. Telegraph 1.2 s: a ground glow ring, a crackle and the hero's hair lifting. 28 dmg in r 40, or the whole puddle zone. If Krieg is in the struck zone he is stunned 2.5 s (a big punish window the player can lure him into).
  - **Code Blue** every 14-18 s (§5.3). Beds are the main dry islands, but the wind moves them, so the player must read the wind and the Code Blue together.
- Crew: only `scalpel` on the stair hut roof, max alive 0/1/1/2; no crew below 15% Krieg HP.
- Krieg speed 33, windup 0.32. Dart volley 5.

### 5.4 Sedation (slow debuff)

| Stacks | Effect | Look and sound |
|---|---|---|
| 1 | Move x0.8, attack recovery x1.15, roll cooldown +0.3 s | Edge blur, slow heartbeat |
| 2 | Move x0.65, recovery x1.3, roll cooldown +0.6 s | Stronger blur, colours fade |
| 3 | Move x0.55, recovery x1.45, roll cooldown +0.9 s. **H/W:** at 3 stacks the hero staggers 1.0 s, then all stacks clear | Tunnel vision, muffled audio |

- Each stack lasts 4 s (E 3 s, W 5 s); a new stack refreshes the timer. Max 3.
- Cures: the `adrenaline` pickup (clears all, 5 s immune); each tap of dodge while sedated cuts 0.3 s from the timer (the hero shakes his head).
- Darts never stack when the hero is already in a hold (strap grab) on E/N.

### 5.5 Crew and fairness rules

- Crew never spawns within 80 px of the hero, never during a phase shift, never during a defib or Code Blue telegraph.
- Max one sedation source besides Krieg (crew `syringe` only).
- Second wind: after the hero is knocked down twice, crew is cleared and a bandage drops at the stair (theatre) or the stair hut (roof).
- Darkness never hides a telegraph: every Krieg telegraph has a light or audio component that works in full dark.

### 5.6 Difficulty scaling

| | E | N | H | W |
|---|---|---|---|---|
| Krieg HP | 700 | 900 | 1050 | 1200 |
| Aggression A (telegraph t / sqrt(A)) | 0.7 | 1.0 | 1.3 | 1.6 |
| P1 blackout length | 4 s | 6 s | 7 s | 8 s |
| P2 lightning interval | 3-5 s | 4-7 s | 5-8 s | 6-9 s |
| Dart volley P1-2 / P3 | 2 / 3 | 3 / 5 | 3 / 5 | 4 / 6 |
| Sedation stack time | 3 s | 4 s | 4 s | 5 s |
| Code Blue interval | 18-22 s | 14-18 s | 12-15 s | 10-13 s |
| Crew max alive (P1 / P2 / P3) | 1 / 1 / 0 | 2 / 1 / 1 | 2 / 2 / 1 | 3 / 2 / 2 |
| Breaker counter | 8 s, every 15 s | 6 s, every 20 s | 5 s, every 25 s | 4 s, every 30 s |

### 5.7 Defeat sequence

1. At 0 HP: hit-stop 0.3 s, then **slow-motion freeze frame** (`timeScale 0.1`, 1.2 s) of the last hit, with a lightning flash white-out.
2. Krieg staggers back against the landing-light mast (x 3545) and slides down to sit. His paddles fall into the puddle at x 3500 and spark (arcs loop; the puddle stays live, so the hero stands on the dais).
3. Krieg (subtitle, `krieg_calm`): "Time of death... yours, eventually." He drops his phone; it lights up on the wet concrete.
4. Input lock, fade to the outro panels (§6.4).
5. Results card.

---

## 6. Cutscene and dialog script

Panel ids use `panel:hospital_<scene>_<nn>`. VO = Elias's inner voice (yellowed caption). Dialogue = white balloon.

### 6.1 Opening panels (`hospital_intro`)

| # | SHOT | TEXT |
|---|---|---|
| 1 | ER entrance, rain and the red neon cross. Elias carries Mags through sliding glass doors; her blood on his white shirt. A nurse pushes a gurney toward them. Nero runs alongside. | VO: "I paid in Choir gold. In this hospital, gold buys a bed and no questions." |
| 2 | Room 314, green monitor light. Mags lies unconscious, her shoulder bandaged. Nero sits at the bedside, alert. Elias puts his hand on the dog's head. | HERO: "Guard." |
| 3 | Corridor, flickering lights. Men in white coats walk toward camera in a line. One unwraps a scalpel from cloth. A tuning fork pin glints on a lapel (red tint). | VO: "Choir rule: gold buys care. But someone had paid more." |
| 4 | Lightning flash. The power dies. Black panel; only Elias's eyes and a scalpel's edge catch the light. | VO: "Lights out. My kind of medicine." |

### 6.2 In-level lines (subtitles, PA voice, phone)

| Id | When | Speaker (portrait / mood) | Line |
|---|---|---|---|
| `krieg_pa_d1` | D1 start | KRIEG (PA, no portrait) | "Code Black, room three-fourteen. Thank you, team." |
| `krieg_pa_d2` | D2 bark | KRIEG (PA) | "Visiting hours are over, Mr. Grave." |
| `krieg_pa_d3` | D3 bark | KRIEG (PA) | "Power's back. Good. I prefer to see my work." |
| `krieg_pa_porter` | Porter fight | KRIEG (PA) | "Bruno, please take the gentleman to the cold room." |
| `mags_murmur` | Breather | MAGS (no portrait) | "Elias... the cops... in the club..." |
| `hale_call` | Breather, phone | HALE (`hale_hat`, tired) | "Krieg operates on four. The trauma lift from the bay goes straight up. Every coat in that building is his tonight." |
| `hale_call_2` | reply | HERO (`elias_cold`) | "Not for long." |
| `krieg_p2` | Phase 2 entry | KRIEG (subtitle) | "Count backwards from ten." |
| `krieg_stalk` | `stalk` windup | KRIEG (whisper) | "Hold still." / "Deep breath." / "Shh." |
| `krieg_p3` | Phase 3 scene | KRIEG (subtitle) | "Let's get some air." |
| `krieg_codeblue` | `codeBlue` | KRIEG (shout) | "Code Blue!" |
| `krieg_dying` | defeat | KRIEG (subtitle) | "Time of death... yours, eventually." |

### 6.3 Boss intro portrait dialog (`krieg_intro`; the theatre, seen through the gallery glass)

| Speaker | Mood (portrait) | Line |
|---|---|---|
| KRIEG | Calm, clinical, snapping on gloves (`krieg_calm`) | "Gunshot to the shoulder. She'll live, if I let her." |
| HERO | Furious, quiet (`elias_furious`) | "You won't." |
| KRIEG | Amused (`krieg_amused`) | "I have the order. Signed in a hand you would know. Your Maestro is closer than you think." |
| HERO | Cold (`elias_cold`) | "Prep yourself." |
| KRIEG | Delighted, revving the bone saw (`krieg_delighted`) | "Ah. The patient wants to operate." |

### 6.4 End panels (`hospital_outro`)

| # | SHOT | TEXT |
|---|---|---|
| 1 | The rooftop helipad in the storm. Krieg sits against the landing-light mast; his defibrillator paddles spark in a puddle. Lightning behind. | VO: "The doctor finally had a patient he couldn't save." |
| 2 | Close-up. Krieg's phone on wet concrete: *"Silence the bartender. — A.V."* Beside it, a red-sealed envelope: *Winter Gala, Royal Conservatory*. | VO: "A.V. Augusta Vane. The police commissioner." |
| 3 | Room 314 at dawn, grey light, the storm passing. Mags awake and weak; Nero rests his head on her bed. | MAGS: "I saw her men at the club. Taking Malaspina's money. That's why." |
| 4 | Elias at the window, back to camera. Police HQ glows across the river. | VO: "The law owned the guns. Now it owned a debt to me." |
| 5 | The ward payphone rings in the empty corridor, its receiver shaking on the hook. | VO: "Hale. Always on time." |

---

## 7. Level data skeleton

```js
// src/levels/hospital/level.js
import { defineLevel } from '../../director/define.js';
import krieg from '../../bosses/krieg.js';
import { stormPower } from './gimmicks/stormPower.js';

export default defineLevel({
  id: 'hospital', title: 'St. Cecilia', order: 5, palette: 'hospital', music: 'music:hospital_dark',
  size: { W: 3600, H: 320, groundY: 280 },
  sections: [
    { id: 'ward', x0: 0, x1: 560, indoor: true, weather: 'none', ambient: [0.18, 0.12, 0.14], power: 'off',
      camera: { minZoom: 0.55, maxZoom: 0.7, bounds: [0, 560] }, backdrop: [{ type: 'wall', set: 'ward_tile', windows: [60, 420] }] },
    { id: 'iso', x0: 600, x1: 1300, indoor: true, weather: 'none', ambient: [0.06, 0.07, 0.09], dark: true, power: 'off',
      camera: { minZoom: 0.5, maxZoom: 0.65, bounds: [600, 1300] }, backdrop: [{ type: 'wall', set: 'iso_sheeting', skylight: [700, 1250] }] },
    { id: 'morgue', x0: 1340, x1: 1800, indoor: true, weather: 'none', ambient: [0.05, 0.08, 0.12], dark: true, fog: 'cold', power: 'off',
      camera: { minZoom: 0.5, maxZoom: 0.65, bounds: [1340, 1800] }, backdrop: [{ type: 'wall', set: 'morgue_steel' }] },
    { id: 'er', x0: 1840, x1: 2560, indoor: true, weather: { kind: 'rain', from: 2300 }, ambient: [0.42, 0.45, 0.48], power: 'flicker',
      camera: { minZoom: 0.45, maxZoom: 0.6, bounds: [1840, 2560] },
      backdrop: [{ type: 'wall', set: 'er', x1: 2300 }, { type: 'city', set: 'storm_street', x0: 2300 }] },
    { id: 'theatre', x0: 2600, x1: 3060, indoor: true, weather: 'none', ambient: [0.3, 0.34, 0.36], power: 'boss',
      camera: { minZoom: 0.5, maxZoom: 0.6, bounds: [2600, 3060] }, backdrop: [{ type: 'wall', set: 'theatre', clerestory: [2880, 3040] }] },
    { id: 'roof', x0: 3100, x1: 3600, indoor: false, weather: 'storm', ambient: [0.12, 0.14, 0.2], wind: true,
      camera: { minZoom: 0.45, maxZoom: 0.55, bounds: [3110, 3590] }, backdrop: [{ type: 'sky', set: 'storm' }, { type: 'city', set: 'valmora_far', policeHQ: true }] },
  ],
  scene: { paint: [
    { type: 'wardRoom', id: 'room314', x0: 180, x1: 360, monitor: 300 },
    { type: 'counter', style: 'nurseStation', x0: 420, x1: 500 },
    { type: 'payphone', x: 120 },
    { type: 'vent', id: 'wardVent', x: 300, y: 160 },
    { type: 'quarantineSheet', xs: [640, 760] },
    { type: 'glassCubicle', ids: ['fish1', 'fish2', 'fish3'], x0: 660, x1: 900 },
    { type: 'drawerWall', x0: 1380, x1: 1520, rows: 3, cols: 6 },
    { type: 'generator', x: 1720 }, { type: 'lever', id: 'genLever', x: 1780 },
    { type: 'curtainBay', xs: [2060, 2110, 2160] },
    { type: 'vehicle', kind: 'ambulance', x: 2380, lights: true }, { type: 'vehicle', kind: 'ambulance', x: 2470, lights: true, arrives: 'w11b' },
    { type: 'canopy', x0: 2320, x1: 2460, y: 200 }, { type: 'neonCross', x: 2400, y: 150, text: 'St. Cecilia' },
    { type: 'clock', style: 'bellSons', x: 2640, y: 200, time: '3:17' },
    { type: 'surgicalLamp', id: 'orLamp', x: 2900, y: 150 },
    { type: 'breakerBox', id: 'breaker', x: 3030, y: 230 },
    { type: 'stairHut', x0: 3110, x1: 3170 }, { type: 'helipad', x0: 3220, x1: 3540 },
    { type: 'mast', x: 3545 }, { type: 'windsock', x: 3575 },
  ]},
  ground: [{ x0: 0, x1: 3600 }],
  killY: 330,
  surfaces: [
    { id: 'nurseTop', x0: 420, x1: 500, y: 250, oneWay: true, lane: 'plat' },
    { id: 'isoWalk', x0: 700, x1: 900, y: 200, oneWay: true, lane: 'plat' },
    { id: 'autopsy1', x0: 1435, x1: 1475, y: 252, oneWay: true }, { id: 'autopsy2', x0: 1535, x1: 1575, y: 252, oneWay: true },
    { id: 'triage', x0: 1900, x1: 1980, y: 248, oneWay: true },
    { id: 'gallery', x0: 2690, x1: 2860, y: 196, oneWay: true, lane: 'plat' },
    { id: 'orTable', x0: 2880, x1: 2920, y: 250, oneWay: true },
    { id: 'hutRoof', x0: 3110, x1: 3170, y: 230, oneWay: true },
    { id: 'mastDais', x0: 3535, x1: 3565, y: 268, oneWay: true },
  ],
  walls: [
    { x: 0, y0: 0, y1: 280, id: 'wardWest' }, { x: 560, y0: 0, y1: 280, id: 'wardEast' },
    { x: 1610, y0: 0, y1: 280, id: 'porterLock', when: 'porter' },
    { x: 2690, y0: 0, y1: 280, id: 'arenaLeft', when: 'boss' },
    { x: 3110, y0: 262, y1: 280, id: 'parapetW' }, { x: 3590, y0: 262, y1: 280, id: 'parapetE' },
  ],
  stairs: [{ type: 'flight', id: 'galleryStair', x0: 2690, x1: 2730, to: 'gallery' }, { type: 'ladder', x: 700, to: 'isoWalk' }],
  doors: [ // new: named transition doors (see §8)
    { id: 'wardEastDoor', x: 548, to: { section: 'iso', x: 612 } },
    { id: 'wardStair', x: 24, to: 'byFlag' },          // isoStair | morgueStair | erStair
    { id: 'isoStair', x: 1120, to: { section: 'ward', x: 40 } },
    { id: 'isoShaft', x: 1280, to: { section: 'morgue', x: 1400, drop: true }, use: 'pry' },
    { id: 'morgueStair', x: 1360, to: { section: 'ward', x: 40 } },
    { id: 'erStair', x: 1856, to: { section: 'ward', x: 40 }, locked: true },
    { id: 'traumaLift', x: 2540, to: { section: 'theatre', x: 2615 }, needs: 'power' },
    { id: 'roofStair', x: 3050, to: { section: 'roof', x: 3140 }, bossOnly: true },
  ],
  movers: [
    { id: 'gurneyRide', surface: { w: 44, y: 254 }, path: [[950, 254, 0], [1120, 254, 0.65]], mode: 'onTrigger', ride: true, bowl: { dmg: 10 }, breaksPanes: true, model: 'gurney' },
    { id: 'bedA', surface: { w: 48, y: 254 }, at: [2770, 254], mode: 'push', cover: true, model: 'hospitalBed' },
    { id: 'bedB', surface: { w: 48, y: 254 }, at: [3000, 254], mode: 'push', cover: true, model: 'hospitalBed' },
    { id: 'bedC', surface: { w: 48, y: 254 }, at: [3200, 254], mode: 'push', cover: true, wind: 1, model: 'hospitalBed' },
    { id: 'bedD', surface: { w: 48, y: 254 }, at: [3470, 254], mode: 'push', cover: true, wind: 1, model: 'hospitalBed' },
  ],
  panes: [
    { id: 'room314', x0: 358, y0: 200, x1: 362, y1: 280, hp: 40, kind: 'window', depth: 0, onBreak: 'shards', blocks: true },
    { id: 'fish1', x0: 665, y0: 205, x1: 735, y1: 275, hp: 40, kind: 'ward', depth: -30, onBreak: 'shards' },
    { id: 'fish2', x0: 745, y0: 205, x1: 815, y1: 275, hp: 40, kind: 'ward', depth: -30, onBreak: 'shards' },
    { id: 'fish3', x0: 825, y0: 205, x1: 895, y1: 275, hp: 40, kind: 'ward', depth: -30, onBreak: 'shards' },
    { id: 'ward5', x0: 1148, y0: 196, x1: 1152, y1: 280, hp: 80, kind: 'ward', depth: 0, onBreak: 'shards', blocks: true, slowmo: true },
    { id: 'axeCase', x0: 1562, y0: 236, x1: 1578, y1: 262, hp: 10, kind: 'window', depth: -10, onBreak: 'shards' },
    { id: 'erDoors', x0: 2308, y0: 210, x1: 2312, y1: 280, hp: 50, kind: 'window', depth: 0, onBreak: 'shards', blocks: 'whenPowerOff' },
    { id: 'secOffice', x0: 2238, y0: 214, x1: 2242, y1: 280, hp: 30, kind: 'window', depth: 0, onBreak: 'shards', blocks: true },
    { id: 'gallery', x0: 2860, y0: 150, x1: 2864, y1: 196, hp: 30, kind: 'window', depth: 0, onBreak: 'shards' },
    { id: 'clerestory', x0: 2880, y0: 120, x1: 3040, y1: 150, hp: 999, kind: 'window', depth: -40 },
  ],
  lights: [
    { x: 300, y: 230, r: 70, rgb: [80, 255, 140], id: 'monitor314' },
    { x: 460, y: 240, r: 50, rgb: [255, 200, 120], flicker: 0.1 },
    { xs: [24, 548, 1120, 1360, 1856, 3050], y: 190, r: 30, rgb: [255, 40, 40], kind: 'exitSign' },
    { x: 2420, y: 230, r: 90, rgb: 'ambulanceBar', flicker: 'rotate' },
    { x: 2900, y: 160, r: 120, rgb: [255, 255, 240], id: 'orLamp', cone: 'down' },
    { x: 3545, y: 210, r: 40, rgb: [255, 170, 40], flicker: 'blink' },
  ],
  props: [
    ['ivStand', 150, 280], ['ivStand', 380, 280], ['wheelchair', 520, 280], ['oxygenTank', 500, 280, { respawn: 'perDefend' }],
    ['trolley', 680, 280], ['extinguisher', 820, 280],
    ['instrumentTray', 1500, 252], ['gurney', 1650, 280], ['gurney', 1740, 280], ['oxygenTank', 1640, 280], ['oxygenTank', 1700, 280],
    ['wheelchair', 1960, 280], ['gurney', 2050, 280], ['wheelchair', 2120, 280], ['ivStand', 2180, 280], ['gurney', 2400, 280], ['oxygenTank', 2430, 236],
    ['trolley', 2720, 280], ['trolley', 3020, 280], ['oxygenTank', 3040, 280],
  ],
  pickups: [
    { w: 'torch', x: 470, stand: 'counter' }, { w: 'bandage', x: 430 },
    { w: 'ammo', x: 900 }, { w: 'adrenaline', x: 880 }, { w: 'bandage', x: 890 },
    { w: 'shotgun', x: 950, stand: 'gurney' },
    { w: 'axe', x: 1570, stand: 'case' }, { w: 'bandage', x: 1590 },
    { w: 'machinegun', x: 2260, stand: 'rack' }, { w: 'ammo', x: 2280 }, { w: 'bandage', x: 2000 },
  ],
  zones: [ // new: water / wind zones (see §8)
    { id: 'morguePuddle1', kind: 'water', x0: 1460, x1: 1520 }, { id: 'morguePuddle2', kind: 'water', x0: 1600, x1: 1660 },
    { id: 'roofPuddle1', kind: 'water', x0: 3240, x1: 3300, conduct: true },
    { id: 'roofPuddle2', kind: 'water', x0: 3380, x1: 3460, conduct: true },
    { id: 'roofPuddle3', kind: 'water', x0: 3500, x1: 3540, conduct: true },
    { id: 'roofWind', kind: 'wind', x0: 3110, x1: 3590, gust: { every: [7, 10], t: 2.5, force: 25 } },
  ],
  allies: [{ id: 'nero', kind: 'dog', guard: 'magsBed', x: 250, holdX: 340, hp: 100, downT: 8, immortal: true }],
  start: { x: 290, section: 'ward', cutscene: 'hospital_intro' },
  objectives: [
    { id: 'torch', type: 'pickup', w: 'torch', toast: 'Torch: light a cone ahead.' },
    { id: 'magsBed', type: 'defend', target: { x: 270, section: 'ward', w: 40 }, hearts: [4, 3, 3, 3],
      inject: { t: [4.0, 3.0, 3.0, 2.5], push: 60 }, guard: 'nero', fail: 'restartCheckpoint', hud: 'magsVitals' },
    { id: 'power', type: 'interact', target: 'genLever', hold: 1.5 },
    { id: 'krieg', type: 'boss' },
  ],
  waves: {
    d1:  { at: [548, 548], roles: { E: ['orderly', 'orderly'], N: ['orderly', 'orderly', 'syringe'], H: ['orderly', 'orderly', 'orderly', 'syringe', 'restrainer'], W: ['orderly', 'orderly', 'orderly', 'syringe', 'syringe', 'restrainer'] }, from: 'door:wardEastDoor', target: 'magsBed' },
    w3:  { at: [700, 860], roles: { N: ['orderly', 'orderly', 'syringe', 'scalpel@isoWalk'] }, from: 'sheet' },
    w4:  { at: [700, 780, 860], roles: { N: ['orderly', 'orderly', 'orderly'], H: ['orderly', 'orderly', 'orderly', 'anaesthetist@fish3'] }, from: 'pane:fish*', stagger: 2.5 },
    w5:  { at: [1000, 1060, 1180, 1220, 1260], roles: { N: ['orderly', 'orderly', 'syringe', 'bonesaw', 'scalpel'] }, from: 'placed' },
    d2:  { at: [548, 300], roles: { N: ['orderly', 'orderly', 'restrainer', 'syringe@vent'] }, from: ['door:wardEastDoor', 'vent:wardVent'], target: 'magsBed', delay: [20, 15, 12, 10] },
    w7:  { at: [1420, 1480, 1540], roles: { N: ['orderly', 'orderly', 'syringe', 'bonesaw'] }, from: 'prop:drawer', telegraph: 0.8 },
    porter: { at: [1740], roles: ['porter'], adds: { atHp: 0.5, roles: { N: ['orderly'] }, from: 'door:coldRoom' } },
    d3a: { at: [548], roles: { N: ['orderly', 'orderly', 'scalpel@nurseTop'] }, from: 'door:wardEastDoor', target: 'magsBed', delay: [22, 16, 13, 11] },
    d3b: { at: [300], roles: { N: ['syringe', 'restrainer'] }, from: 'vent:wardVent', after: { left: 'd3a', n: 1, orT: 15 } },
    d3c: { at: [24], roles: { N: ['bonesaw'], H: ['bonesaw', 'anaesthetist'] }, from: 'door:wardStair', after: { left: 'd3b', n: 1, orT: 15 }, onStart: { power: { section: 'ward', off: 4 } } },
    w11a:{ at: [1900, 2100, 2240], roles: { N: ['orderly', 'orderly', 'orderly', 'syringe', 'security', 'scalpel@triage'] }, from: 'nearestDoor' },
    w11b:{ at: [2470], roles: { N: ['bonesaw', 'restrainer', 'anaesthetist@ambulanceRoof'] }, from: 'vehicle:ambulance2' },
  },
  triggers: [
    { when: { picked: 'torch' }, do: [{ wait: 4 }, { dialog: 'krieg_pa_d1' }, { spawnWave: 'd1' }] },
    { when: { killed: 'd1' }, do: { unlock: 'wardEastDoor' } },
    { when: { inSection: 'iso' }, do: { spawnWave: 'w3' }, once: true },
    { when: { heroX: '>=860', killed: 'w3' }, do: { spawnWave: 'w4' } },
    { when: { riding: 'gurneyRide' }, do: { music: 'sting:gurney' } },
    { when: { glassBreak: 'ward5' }, do: { slowmo: { scale: 0.3, t: 2.5, infiniteAmmo: true } } },
    { when: { killed: 'w5' }, do: [{ wait: 2 }, { checkpoint: 'd2' }, { bark: { door: 'isoStair' } }, { dialog: 'krieg_pa_d2' }, { spawnWave: 'd2' }] },
    { when: { killed: 'd2' }, do: { setDoor: { wardStair: 'isoStair' } } },
    { when: { inSection: 'morgue' }, do: { spawnWave: 'w7' }, once: true },
    { when: { heroX: '>=1610', killed: 'w7' }, do: [{ lock: 'porterLock' }, { dialog: 'krieg_pa_porter' }, { spawnWave: 'porter' }] },
    { when: { killed: 'porter' }, do: [{ unlock: 'porterLock' }, { objective: 'power' }] },
    { when: { flag: 'power' }, do: [{ power: { section: 'morgue', to: 'emergency' } }, { power: { section: 'er', to: 'flicker' } },
      { wait: 3 }, { checkpoint: 'd3' }, { bark: { door: 'morgueStair' } }, { dialog: 'krieg_pa_d3' }, { spawnWave: 'd3a' }, { spawnWave: 'd3b' }, { spawnWave: 'd3c' }] },
    { when: { killed: ['d3a', 'd3b', 'd3c'] }, do: [{ power: { section: 'ward', to: 'on' } }, { dialog: 'mags_murmur' }, { phone: { x: 120, dialog: 'hale_call' } },
      { setDoor: { wardStair: 'erStair' } }, { checkpoint: 'breather' }] },
    { when: { inSection: 'er' }, do: { spawnWave: 'w11a' }, once: true },
    { when: { heroX: '>=2320', left: { w11a: 1 } }, do: { spawnWave: 'w11b' } },
    { when: { killed: 'w11b' }, do: [{ unlock: 'traumaLift' }, { checkpoint: 'boss' }] },
    { when: { heroX: '>=2760', inSection: 'theatre' }, do: [{ dialog: 'krieg_intro' }, { breakPane: 'gallery' }, { boss: 'start' }] },
    { when: { bossDefeated: 'krieg' }, do: [{ cutscene: 'hospital_outro' }, { results: true }] },
  ],
  boss: { module: krieg,
          arena: { section: 'theatre', x0: 2690, x1: 3050, doors: [2610, 3050] },
          arenas: { roof: { section: 'roof', x0: 3110, x1: 3590, doors: [3140] } },
          intro: 'krieg_intro', crew: { roles: ['syringe', 'restrainer', 'scalpel', 'orderly'], every: 6, max: 10 } },
  gimmicks: [stormPower({ lightning: { ward: [6, 10], iso: [5, 9], er: [5, 9], roof: [3, 6] }, flicker: { er: { every: [14, 20], t: [3, 5] } } })],
  cutscenes: { intro: 'hospital_intro', outro: 'hospital_outro' },
  dialog: { /* ids from §6.2 and §6.3 */ },
  assets: ['panel:hospital_*', 'portrait:krieg_*', 'portrait:elias_*', 'portrait:hale_*', 'music:hospital_*', 'music:krieg', 'sfx:hospital_*'],
});
```

---

## 8. Engine features this level needs

| # | Feature | One-line spec | Shared with |
|---|---|---|---|
| 1 | **Darkness and light mask** | Section `dark: true` renders a light mask: only `present.lights`, the hero torch cone, muzzle flashes, sparks and lightning reveal sprites; enemies outside light draw as eye-shine and glints only. Data in sim/present so 2D and 3D use the same light list. | L2 tunnels, L1 freezer fog, L8 storm |
| 2 | **Hero torch** | Pickup `torch`: a 140 px, 35-degree cone from the hero's chest in facing direction; it stays on while he fights (no button); a torch hit on a `stalk` windup staggers Krieg. | L2 |
| 3 | **Lightning scheduler** | `weather.lightning { every:[a,b], flash, afterglow, thunderDelay }`: a full-ambient flash (0.15 s) plus 0.6 s afterglow, a thunder cue after a delay; emits `weather:lightning`; can be targeted (strike zones with telegraph ring). | L4 exterior, L7, L8 |
| 4 | **Power state per section** | `power: on | off | flicker | emergency | boss`, a scheduler for flickers, and triggers `{ power: {...} }`; drives lights, sliding-door panes (`blocks: 'whenPowerOff'`), lifts (`needs: 'power'`) and the PA. | L8 (Spire lifts) |
| 5 | **Defend objective** | `objectives.defend { target, hearts, inject, guard, fail }`: goons with `target` path to it and channel an interruptible inject; HUD vitals widget; fail emits `run:fail` and restarts at the last checkpoint. | none obvious; reusable for escort later |
| 6 | **Ally dog AI (Nero)** | `allies: [{ kind: 'dog', guard, holdX, hp, downT, immortal }]`: guards a point, blocks and pins one goon for 4 s, gets knocked down but never dies; the "Nero, hold!" command. | L2, L6, L7, L8 (bible's optional assist) |
| 7 | **Bark call and return doors** | Action `{ bark: { door } }`: positional bark audio, an edge-of-screen icon and arrow to the door, a countdown ring; named `doors` with `to: 'byFlag'` and `setDoor` to reroute. | Section doors are general; bark is L5-only |
| 8 | **Checkpoints** | Action `{ checkpoint: id }` saves hero HP, weapons, pocket, flags and dead waves; restart reloads it (needed for the defend fail). | All levels |
| 9 | **Status effects: sedation (slow)** | `hero.status.sedated { stacks ≤ 3, t }` scales move speed, attack recovery and roll cooldown; screen blur and heartbeat; cured by `adrenaline` or dodge taps. Generic `status` slot for later effects. | L6 shock baton stun could reuse |
| 10 | **`volley({ proj: 'dart' })` with onHit status** | Dart projectile (small, fast, cyan glint) that applies a status; blocked by `cover` movers, deflected by blade swings. | none |
| 11 | **Rideable / pushable bed movers** | Mover `mode: 'push'` (hero push, enemy shove, wind push) and `ride: true` (actor stands on top and travels); `bowl` damage to actors in its path; `cover: true` blocks projectiles; `breaksPanes` with `slowmo` handoff. | L2 handcar, L7 decoupling cars |
| 12 | **Vertical glass walls** | Panes with `blocks: true` act as walls until broken; enemies break them (goon AI: attack pane when path is blocked). | L3 mirrors, L4 tunnel, L6, L8 |
| 13 | **Scripted slow-mo action** | `{ slowmo: { scale, t, infiniteAmmo } }` in triggers; hero keeps aim and fire control; ends on landing or time. | All levels (one set piece each) |
| 14 | **Water zones that conduct** | `zones.kind: 'water'` with `conduct: true`: an electric hazard touching a zone fills it (glow arc telegraph); dry islands are surfaces above it. | L2 third rail, L4 flooding |
| 15 | **Wind force zone** | `zones.kind: 'wind'` with a gust schedule and a 1 s visual telegraph (rain angle, windsock); applies drift to hero, movers with `wind`, projectiles and thrown objects. | L7 train roof, L8 clock face |
| 16 | **Goon strap grab** | Goon move `grab`: reach telegraph, hold with mash-to-escape, ally-hit rules per difficulty. | L6 riot police could reuse |
| 17 | **Spawn sources** | `from: 'vent:id' | 'prop:drawer' | 'pane:id' | 'sheet' | 'vehicle:id'` with telegraph time; drawers slide out, vents drop dust. | L1 containers, L7 doors |
| 18 | **Multi-section boss arenas** | `boss.arenas` plus phase `arena` key with a transition scene between phases (theatre to roof). | L8 Bell (three arenas) |
| 19 | **Shaft drop and pry doors** | Door `use: 'pry'` (hold interact) and `drop: true` (fall into the next section from above). | L8 lift shafts |
| 20 | **PA and phone dialog** | Portrait-less subtitle lines with a speaker filter (PA crackle); `{ phone: { x, dialog } }` ring-then-answer interact. | All levels (Hale's payphone) |
| 21 | **Explosive oxygen tank prop** | Prop `oxygenTank`: hit or shot, 1 s hiss telegraph, 60 px blast 30 dmg; kickable while hissing. | L7 (gas bottles), general |

3D notes: all of the above is sim data, so the 3D view reads the same light list, panes, movers and zones. 3D-only items: the hospital bed and gurney models, the helipad and mast meshes, the volumetric torch cone (2D draws a flat cone).

---

## 9. Art and audio asset list

### 9.1 Panels (1024x576, `assets/art/panels/hospital/`)

| Id | Content |
|---|---|
| `panel:hospital_intro_01` | ER doors, red neon cross, Elias carries Mags, nurse with gurney, Nero |
| `panel:hospital_intro_02` | Room 314, green monitor light, Mags asleep, hand on Nero's head |
| `panel:hospital_intro_03` | Corridor, line of white coats, scalpel unwrapped, tuning-fork pin (red) |
| `panel:hospital_intro_04` | Black panel, lightning edge, Elias's eyes and a scalpel edge |
| `panel:hospital_outro_01` | Helipad in storm, Krieg against the mast, paddles sparking in a puddle |
| `panel:hospital_outro_02` | Phone screen "Silence the bartender. — A.V.", red-sealed gala envelope |
| `panel:hospital_outro_03` | Room 314 at dawn, Mags awake, Nero's head on the bed |
| `panel:hospital_outro_04` | Elias at the window, police HQ across the river |
| `panel:hospital_outro_05` | Empty ward corridor, payphone ringing |

### 9.2 Portraits (512x512)

- `portrait:krieg_calm` (snapping gloves), `portrait:krieg_amused`, `portrait:krieg_delighted` (bone saw revving), `portrait:krieg_hurt` (phase 3, gown torn, rain).
- `portrait:elias_furious` (new if not made earlier), `portrait:elias_cold` (shared).
- `portrait:hale_hat` (shared, phone booth).
- `portrait:mags_weak` (optional, for the outro balloon or later hub scenes).
- Character reference: `assets/art/characters/krieg/ref.png` for face consistency.

### 9.3 Sprites and backdrops

- Goon reskins: `orderly`, `restrainer`, `syringe`, `scalpel`, `bonesaw`, `anaesthetist`, `security`, `porter`. Penlight and headlamp overlays.
- Krieg sprite set: idle, walk, saw string, grind, jam, aim darts, reload, shove, defib charge and shock, stalk lunge, kneel (Code Blue), hurt, phase-shift run, defeat slump.
- Nero: guard idle, growl, bite-pin, yelp-down, get up, bark.
- Props: hospital bed, gurney, wheelchair, IV stand, oxygen tank, instrument trolley, defib cart, extinguisher, body drawer, glass cubicle, quarantine sheet, curtain bay, ambulance (2D painter), generator, breaker box, Bell & Sons clock 3:17, mast, windsock, helipad "H".
- Backdrops: `bg:hospital_ward`, `bg:hospital_iso`, `bg:hospital_morgue`, `bg:hospital_er`, `bg:hospital_bay_city`, `bg:hospital_theatre`, `bg:hospital_roof_sky`.

### 9.4 Music

| Id | Use |
|---|---|
| `music:hospital_dark` | Exploration and dark fights (cello drone, monitor-beep pulse) |
| `music:hospital_defend` | Defend events (same theme, fast pulse, bark sample) |
| `music:hospital_breather` | Ward breather (solo piano over rain) |
| `music:hospital_er` | ER and bay brawl (full band, storm toms) |
| `music:krieg` | Boss P1-P2 (detuned piano waltz, strings) |
| `music:krieg_storm` | Boss P3 (waltz plus choir and storm percussion) |
| `sting:gurney` | Gurney ride and slow-mo dive (time-stretched hit) |

### 9.5 SFX (`sfx:hospital_*` unless shared)

- Weather: `thunder_near`, `thunder_far`, `rain_glass`, `rain_roof`, `wind_gust`.
- Power: `power_down` (hum dies), `power_up` (tube clicks), `flicker_buzz`, `generator_cough`, `generator_run`, `breaker_clunk`, `pa_crackle`.
- Ward: `monitor_beep`, `monitor_fast`, `flatline`, `inject_ring`, `vent_rattle`, `door_rattle`, `payphone_ring` (shared).
- Nero: `bark`, `bark_far`, `growl`, `bite`, `yelp`.
- Props: `gurney_roll`, `gurney_squeal`, `wheelchair_roll`, `iv_stand_clang`, `oxygen_hiss`, `oxygen_blast`, `curtain_swish`, `sheet_tear`, `drawer_slide`, `body_bag_zip`, `extinguisher_burst`.
- Glass: `glass_crack`, `glass_break` (shared), `pane_large_burst`, `shards_step`.
- Enemies: `scalpel_throw`, `scalpel_stick`, `syringe_jab`, `strap_snap`, `bonesaw_rev`, `bonesaw_grind`, `bonesaw_jam`, `dart_fire`, `dart_hit`, `mask_whisper_sandman`.
- Krieg: `defib_charge`, `defib_clear`, `defib_shock`, `water_arc`, `glove_snap`, `lightning_strike`, `hair_crackle`.
- Hero: `torch_click`, `sedated_heartbeat`, `adrenaline_inject`, `shaft_land`.
- Voice: `voice:krieg_intro_01..03`, `voice:krieg_pa_d1..d3`, `voice:krieg_pa_porter`, `voice:krieg_p2`, `voice:krieg_p3`, `voice:krieg_codeblue`, `voice:krieg_stalk_01..03`, `voice:krieg_dying`, `voice:hale_call`, `voice:mags_murmur`, `voice:mags_outro`, `voice:elias_guard`, `voice:elias_wont`, `voice:elias_prep`, `voice:elias_notforlong`.
