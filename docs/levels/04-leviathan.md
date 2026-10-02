# Level 4: "The Leviathan"

Level plan for the Valmora City Aquarium after hours. This plan uses the level format in `docs/architecture.md` section 3 and the boss framework in section 4. Story facts come from `docs/story-bible.md` (Level 4). Where this plan changes the bible's wording, the change is marked **(refined)**.

Level id: `aquarium`. Order: 4. Palette: `aquarium`. Size: `W 3600, H 320, groundY 280`. Scale: 22 px = 1 m; Elias is 42 px tall.

Difficulty names are the game's: Easy (A 1), Medium (A 2), Hard (A 4), Wicked (A 8). Counts below are written `E/M/H/W`.

---

## 1. Summary

**Story beat.** Elias follows the money trail from Brask. Kalt's aquarium is where the Baritones' hard money leaves the city by boat. He wants the name behind the fire order. He learns that **the Board (the Basses), not the Baritones, gave the fire order**: Kalt's dive-locker manifest shows it, and her last words confirm it. Mags drives him in and out. On the way out, a sniper shoots Mags. This sends the story to St. Cecilia (Level 5).

**Setting.** The Valmora City Aquarium ("the Leviathan"), a 1930s building with a whale-shaped facade on the sea wall. All indoors. The route goes down through the building: lobby and gift shop, the reef gallery, the jellyfish rotunda, the life-support pump hall, Kalt's smuggling dock in the basement, and the glass shark tunnel under the Ocean Tank.

**Glass is the whole level.** Every room has tank glass. The player learns in steps: glass cracks (reef gallery), cracked glass leaks and makes floors slippery (reef gallery), glass bursts and the water is a weapon (rotunda), water rises and slows you (pump hall), and the boss fight puts all of it together (shark tunnel and catwalks).

**Time / weather.** After midnight. A storm surge hits the sea wall outside. There is no rain inside, but the storm is always heard: waves boom on the outer wall every 8-14 s, the building creaks, and the tank water shivers on each boom (a small backdrop ripple). Rain is visible only on the lobby skylight and in the cutscene exteriors. This keeps the bible rule "rain in every level".

**Mood.** Cold, blue and quiet, then wet and loud. The aquarium is a church of glass: dim blue tank light, dark floors, and red emergency lamps that come on as the level floods. The sharks move slowly and do not care. Kalt is calm and patient. She is a smuggler, not a brawler, and she lets the water do her work.

**Length target.** 8-12 minutes on Medium for a first play (about 10 min): exploration and fights about 6.5 min, set pieces about 1.5 min, boss about 2.5 min.

**Music and sfx mood.**
- Exploration: a low cello drone, a slow sonar ping every 4 bars, and a far whale-song pad. No drums.
- Combat: the drone stays and a dry, muffled kick and toms start (as if heard through water). Harpoon shots get a metal "thunk-hiss" stinger.
- Flood beats: the pitch of the pad rises with the water level; an alarm bell and red lamps on the beat.
- Slow motion: all audio goes through a low-pass filter and a pitch drop of -7 semitones. One deep glass "crack" and the heartbeat. On the burst, the full mix comes back in one hit.
- Under water (hero head below the surface): a strong low-pass filter, bubbles, a heartbeat that speeds up as the breath meter drops.
- Boss: a minor-key theme on low strings and a detuned brass "fog horn" motif (Kalt's sea). Phase 2 adds a fast tom pattern and wind from the open tank roof. Phase 3 drops to only the drone plus heartbeat until the finisher.

---

## 2. Sections map

All sections are `indoor: true`, `weather: 'none'`. Sections are side by side. Door transitions join them (fade, 0.4 s). Gaps between sections are 20 px.

| Section id | x-range | Room | Backdrop (behind the fight lane) | Lighting (ambient rgb) | Camera |
|---|---|---|---|---|---|
| `lobby` | 0-620 | Entrance hall, ticket turnstiles, gift shop | A whale skeleton hangs from the ceiling. A small reef wall tank behind the gift-shop counter. The skylight shows rain and lightning. | Dim, cold [0.30, 0.36, 0.48]. Exit signs green. Lightning flashes on the skylight every 6-12 s. | Zoom 0.45-0.6. Bounds 0-620. |
| `reef` | 640-1240 | The Reef Gallery: a long corridor of wall tanks | The full back wall is tank glass (6 panes). Reef fish in schools, a moray eel, rays. A big reef tank at the far end (x 1040-1200) with two Undertow divers inside it. | Blue tank light from behind [0.25, 0.42, 0.60]. Caustic light patterns move on the floor and on actors. | Zoom 0.4-0.6. Bounds 640-1240. The camera rises 30 px when the hero is on the gantry. |
| `jelly` | 1260-1700 | The Jellyfish Rotunda: a round dark room | A central glass cylinder (x 1450-1510, floor to ceiling) full of moon jellies. 4 small wall columns. Dark walls with star-like UV dots. | UV dark [0.18, 0.12, 0.30]. The cylinder glows magenta and cyan and pulses slowly (period 4 s). After the burst: red emergency lamps. | Zoom 0.5-0.7. Locked to the room (bounds 1260-1700). |
| `pumps` | 1720-2220 | Life Support / Pump Hall | Big filter tanks, pipe racks, pressure gauges. The sea gate valve on the left wall. A view port to the storm sea (waves hit it). | Work light, green-grey [0.30, 0.38, 0.32]. Red rotating alarm lamps when the flood starts. | Zoom 0.45-0.6. The camera follows the hero up; bounds y 40-320. |
| `dock` | 2240-2860 | Kalt's smuggling dock (basement) | A sea channel with a moored boat. Cargo nets, crates of cash and contraband, a cargo hoist. Sea doors at the back; storm waves crash on them. Dive locker on a mezzanine. | Sodium amber work lamps [0.42, 0.34, 0.26] with blue water reflections from the channel. | Zoom 0.4-0.6. Bounds 2240-2860. |
| `tunnel` | 2880-3600 | Boss arena: the glass shark tunnel under the Ocean Tank, and the catwalks above the open tank top | Phase 1: the tunnel arch. Water and sharks above and behind. Moon jellies and a sunken whale-bone sculpture in the tank. Phase 2-3: the open tank top, catwalks, the feeding crane, the dark roof. | Phase 1: deep blue [0.20, 0.34, 0.55] with moving caustics. Flood stages add red lamps. Phase 2: cold top light from roof lamps [0.32, 0.40, 0.52]. | Phase 1: zoom 0.55-0.7, bounds x 2880-3600, y 150-320. Phase 2-3: bounds y 0-220, zoom 0.45-0.6. |

**Depth lanes in this level.**
- Building wall lane: tank glass (back panes), walls, view ports.
- Platform lane: gantries, balconies, filter-tank tops, pipe racks, catwalks, the boat deck.
- Fight lane: the floor.
- Front lane: foreground pillars, the turnstiles, foreground glass of the tunnel arch (3D only; in 2D it is a thin highlight line at the front edge).

**ASCII side view of the whole strip** (1 column is about 36 px; y grows down; `~` is water, `#` is glass, `=` is a walkable surface, `H` is a ladder, `|` is a door).

```
 x: 0         620 640           1240 1260       1700 1720         2220 2240           2860 2880                    3600
    | LOBBY      | REEF GALLERY    | ROTUNDA      | PUMP HALL       | KALT'S DOCK       | SHARK TUNNEL + CATWALKS   |
y 20 . skylight .                                                                         .  roof lamps . crane rail .
y 96                                                                                     =A====  =B===  =C===  ==D=== (catwalks)
y112                                                                                     ~~~~~~~~ open tank top ~~~~~~
y136                                                    ===gantry=|hatch>                ~  sharks  ~  jellies   ~  H
y150                                             (water max) [dive lkr]=                 ~                       ~  H
y168           ==== maintenance gantry ====                                               ~                      ~  H
y184                                            ==rack==                                  ~                      ~  H
y196 whale bone     ##############        ==bal==  ##  ==bal==                            ######## tunnel roof #####H
y226                ##reef tanks##          (cyl)##  [filt][filt]                         #                      #  H
y250  [counter]     ##############   #       ##  #                     [crates]  _boat_  #   (tunnel interior)  #  H
y280 ==turnstiles==shop===|============H======|=====##=====|====sea gate=====|====dock====~~chan~~====|=====tunnel floor=====|
      start x 60                                                               channel 2560-2680       entry 2900  hatch 3560
```

---

## 3. Encounter flow

Twelve beats. Times are Medium targets.

### Beat 1: "Closed for the Night" (exploration, stealth-light opener)
- **Location:** `lobby`, x 0-360.
- **Enemies:** smugglers at the turnstiles; one on a payphone, one smoking. Counts `1/2/2/3`. They do not see the hero until he is within 140 px or makes noise (`noise` event).
- **Props / pickups:** 2 benches (one has a **katana** on it in a display case, `stand: 'bench'`, behind a breakable display pane). Cans and bottles at the snack kiosk (x 150). A wet-floor sign (light throwable).
- **Environment:** the first tank glass. Hitting the small lobby reef tank (x 300, hp 40) cracks it, but it does not break (`hpMin: 1` lock): the first lesson that glass reacts. The whale skeleton hangs overhead (decor; it sways on each storm boom).
- **Trigger:** level start after the intro cutscene. Ends when the lobby wave is dead (`killed: 'l1'`).
- **Why it is exciting:** a quiet, cold start. A first-strike opportunity on unaware goons. The goon on the payphone whispers "...the Sandman. Here." before the fight.

### Beat 2: "Gift Shop Brawl"
- **Location:** `lobby`, x 360-620.
- **Enemies:** `3/4/5/6`: smugglers (machete) and divers (knife), plus 1 hauler from Hard.
- **Props / pickups:** shelves of plush sharks (light throwables, 0 dmg, they stagger), 6 snow globes (pocket like bottles; they shatter and splash), a cash register (crate weight, throwable), the counter (platform surface y 250). One **bandage** under the counter.
- **Environment:** two glass display cases (panes `kind: 'window'`, hp 30, shards). Throwing a goon into one breaks it.
- **Trigger:** `heroX >= 380`. Ends when the wave dies. Then the staff door to the reef gallery opens.
- **Why it is exciting:** a toy box of silly throwables in a dark, serious place. It sets the tone: improvised violence.

### Beat 3: "Harpoon Alley" (glass teaches cracks and leaks)
- **Location:** `reef`, x 640-1040.
- **Enemies:** 1 harpooner on the maintenance gantry (y 168) from the start; floor goons `2/3/4/5` (smugglers and divers). From Hard, a second harpooner arrives at the far end of the gantry 12 s later.
- **Props / pickups:** a service ladder up to the gantry at x 740. Crates stacked at x 1100 (a second way up). A barrel. A **machine gun** in a dead guard's hand at x 900 (ammo 30, Easy 45).
- **Environment:** the harpooner's misses hit the back wall tanks. Each wall pane has hp 100 and 3 crack stages. Stage 2 leaks: a spray of water makes a **wet floor zone** 60 px wide under the pane (friction 0.45; goons and the hero slide on a run stop, and a sweep on a wet floor slides 30 px further). Panes here do not burst before Beat 4 (`hpMin` lock 10); they only leak. Harpoons that stick in the wall become **harpoon bolt** pickups (a one-use spear throw, like the blade throw).
- **Trigger:** `heroX >= 700`. Ends when the wave dies, or when the hero reaches x 1040.
- **Why it is exciting:** ranged threat above, crowd below, and the floor becomes worse the longer the fight lasts. The player sees that misses have a cost.

### Beat 4: "Through the Glass" (divers break in)
- **Location:** `reef`, x 1040-1240 (the big reef tank).
- **Enemies:** 2 divers are inside the big reef tank from the start of the level (visible, they swim and watch). On this beat they each fire one harpoon through the tank front. The pane bursts and they swim out with the water. Total `2/2/3/4` divers (extra divers drop in from the tank top hatch).
- **Props / pickups:** an **ammo box** at x 1180. A fire axe on a wall rack (`stand: 'rack'`, x 1220).
- **Environment:** the first real **pane burst** (`onBreak: 'flood'`, volume small). A burst wave runs 140 px from the pane: it knocks over anything in its path that is not rolling, jumping or on a platform. The floor here becomes ankle-deep for 15 s, then wet. Reef fish flop on the floor (decor; they disappear after 20 s).
- **Trigger:** `heroX >= 1050`. A 0.8 s telegraph: both divers raise their guns and press their masks to the glass; a crack sound. Ends when the divers die. The rotunda door opens.
- **Why it is exciting:** the enemy uses the glass first. The player learns what a burst does by being the target of one, before the player can use it.

### Beat 5: "The Rotunda" (ambush in the dark)
- **Location:** `jelly`, x 1260-1700. The doors lock (walls at 1262 and 1698) until Beat 6 ends.
- **Enemies:** wave `r1` `3/4/5/6`: 1 harpooner on the right balcony (y 196), the rest smugglers and divers from both doors. Wave `r2` `2/3/4/5` from both doors when `r1` has 2 or fewer alive.
- **Props / pickups:** a **shotgun** on the left balcony (x 1300, y 196), reached by a ledge climb. Benches around the cylinder. 4 small wall jelly columns (hp 40, they break into shards and a puddle).
- **Environment:** very dark. The cylinder's glow is the main light; actors are in silhouette in front of it. The harpooner's misses go into the cylinder (the cylinder sits in the platform lane, so shots aimed at the hero in front of it hit it when the hero dodges). The cylinder has hp 120, 3 crack stages, and a lock at stage 2 (`hpMin: 30`) until Beat 6 is armed.
- **Trigger:** `inSection: 'jelly'`. Ends when Beat 6 fires.
- **Why it is exciting:** a crowd fight in near-darkness lit by a slowly pulsing glass column that the player can see cracking. The tension builds toward one shot.

### Beat 6: "Bloom" (the slow-motion set piece)
- **Location:** `jelly`, cylinder at x 1450-1510.
- **Arming condition:** `r2` has spawned, the cylinder is at crack stage 2, and 3 or more goons are within 160 px of the cylinder. Then the cylinder lock lifts. A glint cue runs up the crack, a high glass "tink" plays, and a short toast shows: **"The glass is ready."**
- **The shot:** any gun shot, blade throw, harpoon bolt throw, thrown object, or heavy attack that hits the cylinder bursts it.
- **Slow motion:** `timeScale 0.25` for 1.8 s of real time. The camera zooms to 0.8 on the cylinder. The crack runs up the glass in three steps, then the glass goes white and bursts. Jellyfish hang in the air. The goons turn. The HUD stays.
- **The wave:** a radial burst wave (volume large) runs 300 px left and right at 380 px/s. Every goon it touches goes into a new `washed` state: a tumble, 25 dmg, a slide to the nearest wall, and 1.5 s down. On Easy and Medium this kills goons below 25 hp. The hero is safe if he is on a balcony, rolling, in the air, or more than 120 px away when the wave starts; otherwise he is washed too (15 dmg).
- **After:** the floor is knee-deep for 4 s, then ankle-deep for 16 s, then wet (puddles) for the rest of the level. 8-10 **jellyfish** lie on the floor: stepping on one stings (4 dmg, 0.3 s stagger). Kicking one throws it as a projectile (6 dmg, 0.5 s stagger on a goon). The room lights go red. The doors unlock.
- **Fallback:** if the player does not burst it in 40 s after arming, the harpooner's next shot bursts it with no slow motion, and the hero is in the wave if he is close.
- **Trigger / end:** armed as above. Ends when no goon in the room is alive, or 8 s after the burst.
- **Why it is exciting:** this is the level's signature moment from the bible. One shot, a frozen bloom of jellyfish in the air, and the room washed clean.

### Beat 7: "High Water" (rising water and a climb)
- **Location:** `pumps`, x 1720-2220.
- **Story:** the hero goes down the staff stair from the rotunda into the pump hall. The door behind him locks. Kalt's voice on the PA: she opens the sea gate. The lower door to the dock (x 2215, floor) is sealed with a steel shutter. The only way out is the high hatch at x 2200, y 136.
- **Water:** the pump hall water rises in surges (data, see section 7):
  1. at 3 s: to y 250 (waist on the floor). Hold until wave `p1` dies or 20 s.
  2. then to y 200 (over the floor; the floor is now under water). Hold until wave `p2` dies or 20 s.
  3. then to y 128 at 4/5/6/7 px/s (E/M/H/W) and hold. The gantry (y 136) is ankle-deep.
- **Climb route:** floor -> filter-tank tops (y 226; x 1790-1850 and 1890-1950) -> pipe rack (y 184; x 1960-2090) -> gantry (y 136; x 2070-2220) -> hatch. A service ladder at x 1740 goes from the floor to the pipe-rack height (new ladder feature). A heavy crate on the pipe rack must be pushed off the rack's right end to open the gap to the gantry ledge; while it is there, the ledge climb is blocked. The crate falls into the water and floats (a floating surface, see section 8).
- **Enemies:** `p1`: divers `2/2/3/4` swim in from the sea gate. In water they are fast; they grab the hero's ankle when he is in water knee-deep or more (1.0 s drag down, mash attack to break; 8 dmg). `p2`: 1 harpooner on the gantry from Medium, plus smugglers `1/2/2/3` on the filter-tank tops.
- **Props / pickups:** a **bandage** on the first filter-tank top. Barrels that float when the water reaches them (they become small floating surfaces and throwables).
- **Environment:** water levels slow movement (see section 8, water depth bands). Electric junction box on the wall at x 1880, y 240: when the water reaches it (surge 2), it sparks; any actor in the water within 120 px takes 10 dmg and a 0.6 s stun once. A telegraph: it buzzes and sparks for 1.5 s first. The hero can use it to stun divers.
- **Trigger:** `inSection: 'pumps'`. Ends when the hero enters the hatch (`heroX >= 2190` and `heroY <= 140`): transition to `dock` (mezzanine).
- **Failure:** if the hero is under water when the water is at max, the breath meter runs (12 s, then 6 dmg/s). No instant death.
- **Why it is exciting:** a clear, readable goal (go up), a clock you can see (the water line), and fights where height is safety and depth is danger.

### Beat 8: "The Dive Locker" (breather)
- **Location:** `dock`, mezzanine x 2240-2400, y 150.
- **Enemies:** none.
- **Props / pickups:** a **bandage**, an **ammo box**, a **katana** on a weapon rack, wetsuits on hooks, diving tanks (heavy throwables; a thrown tank hisses and flies an extra 120 px, then hits for 30 dmg).
- **Story clue (interactable, optional):** a waterproof manifest on the desk. A close-up card (in-engine, 1 panel, no voice): *"Cargo 0412. Bell & Sons, Horloger: ACCOUNT CLOSED. Authorised: the Board. Meridian Holdings."* The red wax seal shows a tuning fork. VO caption: *"Not the Baritones. The Board. The ones who never sign."*
- **Environment:** a window looks down on the dock floor. Smugglers load cash crates onto the boat below and do not see the hero. The hero can open the window (it is a pane) and drop on them for a first strike.
- **Trigger:** enters at the end of Beat 7. Ends when the hero drops through the mezzanine edge or the window.
- **Why it is exciting:** 30 s of quiet after the flood, the story payoff, and a choice of how to start the next fight.

### Beat 9: "Loading Bay" (dock assault)
- **Location:** `dock` floor, x 2240-2860.
- **Enemies:** wave `d1` `4/5/6/7`: smugglers, 1-2 haulers (they throw crates and barrels), 1 harpooner on the boat deck (from Medium; deck y 266, it bobs). Wave `d2` `2/3/4/5`: divers come up from the channel when `d1` has 2 or fewer alive.
- **Props / pickups:** cash crates (heavy; on break they burst into a cloud of bills, which is visual only), barrels, a stack of crates at x 2440 (platform), a cargo net hanging from the hoist.
- **Environment:** the sea channel (x 2560-2680) is a ground gap with water (surface y 288). An actor who falls in swims; he climbs out with a ledge climb. Throwing a goon into the channel makes him swim for 3 s (out of the fight). The **cargo hoist** (mover) carries a pallet across the channel on a loop (8 s): it is a moving platform and, if hit with a heavy attack at its control box (x 2520), it drops its pallet (40 dmg area below). Storm waves hit the sea doors; on each boom a small surge runs up the channel and wets the floor 40 px either side.
- **Trigger:** the hero lands on the dock floor. Ends when `d2` dies.
- **Why it is exciting:** a big mixed fight on a busy floor with a hole in the middle and a moving platform over it.

### Beat 10: "Ballast" (elite fight: Hollis Teague, the Dockmaster)
- **Location:** `dock`, x 2400-2860. Walls at 2400 (the stair is blocked by falling crates in an in-engine shot) and 2860.
- **Enemy:** **Hollis "Ballast" Teague**, Kalt's dockmaster. A huge man in an old brass diving helmet with a round glass faceplate, lead boots, and a short anchor on a chain. Uses the boss runtime with one phase and no portrait intro (he has a 1-line bark, see section 6). Crew: none on Easy; `0/1/2/2` divers alive at a time from Medium, every 8 s.
- **Moves (boss primitives):**
  - `anchorSwing` (`string`): a wide arc in front, 120 px reach, 26 dmg. Telegraph: he lifts the anchor over his shoulder, chain rattle, 0.7 s.
  - `anchorThrow` (`throwObject` with return): the anchor flies 260 px on the chain and comes back. Hits on the way out and on the way back (20 dmg each). Telegraph: he spins the chain twice over his head, 0.9 s; a floor mark shows the line.
  - `leadStomp` (`groundSlam`): a short quake, 90 px each side, 14 dmg. Telegraph: lifts a boot, 0.5 s.
  - `dunk` (`grab`): only within 80 px of the channel edge. He grabs the hero and holds his head under water: 2.0 s, 6 dmg/s, mash attack to escape early. Telegraph: arms open wide, a red flash on the hands, 0.6 s.
- **The helmet:** the faceplate is a pane on the actor (hp 80). In front of him, head hits (high attacks, thrown objects, shots at head height) hit the faceplate, not him, and do no damage to him. When the faceplate breaks, water from the helmet's ballast spills out, he takes double damage, and he loses poise (he staggers on every heavy hit). Low attacks and sweeps always hit him for normal damage; sweeps do not knock him down (lead boots) unless the faceplate is broken.
- **Punish windows:** 1.0 s after `anchorThrow` (the chain is out); 1.4 s after `leadStomp` on a wet floor (he slips on his own stomp if he is in a wet zone).
- **Trigger:** `killed: 'd2'`. Teague climbs out of the channel by the boat. Ends at his death. The boat's ledger drops (a cash crate pickup is visual only), the watertight door to the tunnel at x 2860 opens.
- **Why it is exciting:** a "glass" mini-boss: the player must break the glass on him before the fight opens up. It mirrors the boss gimmick in small.

### Beat 11: "Under the Ocean" (quiet approach, in-engine)
- **Location:** `tunnel`, x 2880-3100.
- **Enemies:** none.
- **In-engine scene (5 s, input stays on, walk speed only):** the hero walks into the dark glass tunnel. A great white shark (the "Leviathan") passes slowly overhead from right to left; its shadow slides over the hero (a moving dark light). Moon jellies drift. Far ahead, Kalt stands in the tunnel with her back to him, loading a harpoon. On the wall by the service hatch: a **Bell & Sons clock stopped at 3:17** (bible rule).
- **Trigger:** `inSection: 'tunnel'`. Ends at `heroX >= 3040`: boss intro.
- **Why it is exciting:** silence before the storm; the player sees the whole arena and the threat over it.

### Beat 12: Boss: Nerissa Kalt
- **Location:** `tunnel`, x 2900-3580 (phase 1), then the catwalks at y 96 (phases 2-3).
- See section 5 for the full plan.
- **Trigger:** `heroX >= 3040` starts the intro dialog, then `{boss: 'start'}`. Ends at `boss:defeated` -> outro cutscene -> results card.

**Pacing check (Medium):** B1 0:40, B2 1:00, B3 1:00, B4 0:40, B5 1:00, B6 0:20, B7 1:20, B8 0:30, B9 1:10, B10 1:15, B11 0:10, B12 2:30 = about 11:35 for a careful first play; about 8 min for a skilled play.

**Enemy totals per difficulty (excluding boss crew):**

| Beat | Easy | Medium | Hard | Wicked |
|---|---|---|---|---|
| 1 Lobby | 1 | 2 | 2 | 3 |
| 2 Gift shop | 3 | 4 | 5 | 6 |
| 3 Harpoon alley | 3 | 4 | 6 | 7 |
| 4 Through the glass | 2 | 2 | 3 | 4 |
| 5 Rotunda | 5 | 7 | 9 | 11 |
| 7 High water | 2 | 5 | 6 | 8 |
| 9 Loading bay | 6 | 8 | 10 | 12 |
| 10 Teague crew | 0 | 2 | 4 | 5 |
| Total | 22 | 34 | 45 | 56 |

---

## 4. New enemy variants: "The Undertow"

All variants are reskins of existing roles with small behaviour additions. The bible lists the faction as knife, machete and harpoon (pistol reskin). This plan adds one brawler reskin (hauler) and one elite.

| Id | Base role | Look | Weapon | New behaviour |
|---|---|---|---|---|
| `diver` | `knife` | Black wetsuit, mask pushed up on the forehead, rebreather on the chest, fins clipped on the back | Dive knife | **Swims** at full speed (no water slow-down). Spawns from water (`from: 'water'`): tank tops, flooded floors, the dock channel, burst panes. **Ankle grab:** when the hero is in water knee-deep or more and within 40 px, the diver dives and grabs (telegraph: a bubble trail toward the hero, 0.6 s). 1.0 s drag, 8 dmg, mash to break. On a wet floor, does not slip. |
| `harpoon` | `pistol` | Wetsuit and an oilskin jacket, a pneumatic harpoon gun | Harpoon gun | **One shot, then reload.** Aim: a thin glint line from the gun to the target for 0.7 s (scaled by difficulty). Bolt: 420 px/s, slight upward arc of 4 degrees, 14 dmg. **Reel:** a hit that is not blocked pulls the hero 40 px toward the shooter and staggers him 0.4 s. Reload 2.4 s (kneels, exposed). Misses fly on and damage panes (25 to 34 dmg) or stick in walls and become `harpoonBolt` pickups. Prefers platforms. Backs away from melee; when cornered, swings the gun as a club (pistol-whip). |
| `smuggler` | `machete` | Yellow oilskin coat, rubber boots, wool cap | Machete or boat hook (same moveset; the hook adds 10 px reach) | Same as machete. Slips on wet floors like the hero. |
| `hauler` | `brawler` | Big man, bare forearms, cargo gloves, oilskin bib | Fists | **Throws objects:** walks to the nearest crate, barrel, cash crate or diving tank within 200 px, lifts it (0.6 s telegraph) and throws it (`throwObject`, 22 dmg). Uses the existing carry and throw system. |
| `teague` | elite (boss runtime) | See Beat 10 | Anchor on a chain | Elite, one per level. |

**Placement rules.**
1. **Harpooners** spawn only on platforms or at range: on a surface at least 40 px above the floor, or at least 200 px from the hero. At most 1 harpooner per 300 px on Easy and Medium, 2 on Hard and Wicked. At most 2 alive in any section.
2. **Harpooners and scripted panes:** a pane that a script needs (the rotunda cylinder, the big reef tank, the tunnel panes in phase 1) has an `hpMin` lock until its script arms it. Misses still crack it visibly but cannot burst it early.
3. **Divers** spawn only from water: a water body with a surface the hero can see, or a pane that has just burst. Never from a dry door. Never more than 3 divers in water at the same time (ankle grabs must stay readable).
4. **Haulers** spawn only where 2 or more throwables lie within 200 px of the spawn point. At most 1 hauler alive per section (2 on Wicked).
5. **Smugglers** spawn from doors (`nearestDoor`) or are pre-placed.
6. **Wet floors:** no wave starts with a goon already standing on a wet zone (avoids free slips at spawn).
7. **Mix:** each wave from Medium up has at least one ranged or water threat (harpoon or diver) and at least two melee goons, so the player must move between them.
8. **Faction barks:** whisper lines for the Sandman legend: "That's the Sandman." / "Kalt said he'd drown." / "Keep him off the glass!" / divers on spawn: "Water's ours."

---

## 5. The boss: Nerissa Kalt

### 5.1 Profile
**Nerissa Kalt**, Baritone, smuggling queen of the Choir. Tall, short grey-blonde hair slicked back wet, a black wetsuit under a long, open oilskin coat, a diving knife on her thigh, a pneumatic harpoon gun with a reel. She is calm, slow to move and fast to strike. She lets the glass and the water fight for her. Her weakness: every harpoon she misses breaks her own tunnel.

### 5.2 Arena layout (`tunnel`, x 2880-3600)

**Phase 1: the tunnel (floor).**
- Tunnel floor: y 280, x 2900-3580. Entry bulkhead (wall) at x 2900, closes behind the hero at the intro. Service hatch (wall) at x 3570, locked in phase 1.
- Tunnel roof: 8 glass panes, each 80 px wide, at y 192-204, x 2900-3540 (`t1` to `t8`). The inner tunnel height is 3.6 m (y 204 to 280). Over the roof is tank water up to the tank surface at y 112.
- Tunnel back wall: glass (backdrop, not breakable in 2D; in 3D it is the side of the arch). It shows the tank, the sharks, the jellies.
- A service shaft at x 3540-3580 with a ladder (y 280 to y 96). It is behind the locked hatch until phase 2.
- The Bell & Sons clock (3:17) on the shaft wall.
- Lighting: blue caustics from above. Each broken pane adds a red emergency lamp at its x.

**Phase 2-3: the catwalks over the open tank.**
- Tank surface: y 112, x 2890-3600 (water body; the tunnel is under it, its roof at y 192).
- Catwalks at y 96 (grates; `oneWay: false`, but the hero can drop through at gaps only):
  - `cwA` x 2890-3060: the left landing. A ladder from the water at x 2900.
  - `cwB` x 3100-3240: hanging section on 2 chains (chains at x 3110 and x 3230).
  - `cwC` x 3280-3400: hanging section on 2 chains (x 3290, x 3390).
  - `cwD` x 3440-3600: the feeding platform. Fixed. The shaft ladder ends here. A ladder from the water at x 3450.
  - Gaps: 40 px (1.8 m); a running jump clears them.
- **Feeding crane:** a rail at y 24 over the tank. A bait cage hangs from it (`mover`, cage floor surface w 40 at y 74). It moves pingpong x 3080-3420 in 6 s. It is a platform, and in phase 3 also a hazard.
- **Sharks:** 2 shark actors in the tank volume (x 2900-3590, y 118-186). Phase 1: they circle above the tunnel roof (visible through it). Phase 2-3: they circle under the catwalks; dorsal fins break the surface.
- Ladders out of the water: x 2900 (to `cwA`), x 3330 (to `cwC`), x 3450 (to `cwD`). From the water the hero can also ledge-climb onto any catwalk edge.

### 5.3 Boss definition (maps to section 4 primitives)

```js
// src/bosses/kalt.js
import { defineBoss, string, volley, charge, grab, throwObject, hazard, roar } from '../sim/boss/primitives.js';
import sharkTunnel from './gimmicks/sharkTunnel.js';
export default defineBoss({
  id: 'kalt', name: 'Nerissa Kalt', title: 'The Undertow', look: 'kalt',
  stats: { hp: 840, s: 1.1, m: 4, speed: 30, reach: 20, dmg: 18, heavyDmg: 26, poise: 22, windup: 0.32, cd: [0.8, 1.5] },
  intro: { walkTo: 'arena.x0+260', spotlight: false, dialog: 'kalt_intro', t: 1.5 },
  moves: {
    knife:    string({ combos: [['slash'], ['slash', 'stab'], ['kick', 'slash'], ['slash', 'slash', 'stab']] }),
    harpoon:  volley({ proj: 'harpoon', count: 1, v: 440, arc: 4, dmg: 18, reel: 60, aim: 0.8, reload: 1.6 }),
    reelStab: grab({ from: 'harpoonHit', pull: true, then: ['stab', 'stab'], dmg: 12 }),
    lunge:    charge({ windup: 0.5, v: 260, maxT: 0.45, paneStick: 1.2 }),
    pinCrack: hazard('aimedCrack'),          // shoots a pane on purpose over the hero
    chainShot: hazard('catwalkChain'),       // phase 2: shoots a catwalk chain
    zipLine:  charge({ windup: 0.6, path: 'craneRail', v: 300 }),
    chum:     throwObject({ obj: 'chumBucket', arc: true, dmg: 6, onLand: 'frenzy' }),
    dive:     hazard('kaltDive'),            // submerge, bubble trail, burst-up attack
    taunt:    roar({ t: 0.9, line: 'kalt_taunt' }),
  },
  phases: [
    { id: 1, moves: { knife: 0.45, harpoon: 0.4, lunge: 0.15 },
      big: { every: [6, 9], pick: { pinCrack: 1 } } },
    { id: 2, enter: (s) => s.boss.hpFrac < 0.6 || s.arena.flood >= 3,
      onEnter: ['tunnelFloodOut', { speed: 32, cd: [0.6, 1.2] }],
      moves: { harpoon: 0.4, knife: 0.3, zipLine: 0.15, chum: 0.15 },
      big: { every: [5, 8], pick: { chainShot: 0.6, dive: 0.4 } } },
    { id: 3, enter: { hpBelow: 0.3 }, onEnter: ['taunt', { windup: 0.26, cd: [0.5, 1.0] }],
      moves: { harpoon: 0.3, knife: 0.3, chum: 0.1 },
      big: { every: [3.5, 6], pick: { dive: 0.7, chainShot: 0.3 } } },
  ],
  crew: { every: 6, everyPh2: 7, max: 8, alive: 2, roles: 'arena' },
  secondWind: null,
  finisher: 'deepPlunge',
  gimmick: sharkTunnel,
});
```

### 5.4 Phase 1: "Glass Breaks" (the tunnel)

**Behaviour.** She keeps 120-220 px of distance and fires. When the hero closes, she uses the knife strings and backsteps. She reloads after every shot. She does not care about the glass until the third pane goes.

**Move list and telegraphs** (telegraph `t` is the Medium value before the `t / sqrt(A)` scale; listed values are the Easy base).

| Move | What happens | Telegraph `{t, pose, mark, floor, light, cue}` | Punish window |
|---|---|---|---|
| `harpoon` | One bolt, 440 px/s, 4 degree upward arc, 18 dmg. A hit that is not blocked reels the hero 60 px to her and opens `reelStab`. A miss flies on and hits the tunnel roof about 180-260 px down range (the arc decides where). | `{ t: 0.8, pose: 'aimHip', mark: 'glintLine', light: 'gunGlint', cue: 'harpoon_prime' }` | Reload 1.6 s (E 2.2, M 1.6, H 1.2, W 0.9). She kneels. Free hits from the front. |
| `reelStab` | Follows a harpoon hit: pull, 2 stabs, 12 dmg each. Mash attack during the pull to cut the line (the hero's blade or axe cuts it at once). | Part of the hit; a 0.3 s pull. | If the line is cut, she stumbles for 1.0 s. |
| `knife` strings | 1-3 hit strings, 18 dmg per hit. Fast. | `{ t: 0.35, pose: 'knifeLow', cue: 'knife_draw' }` | 0.6 s after the last hit. |
| `lunge` | A low knife dash, 260 px/s for 0.45 s, 22 dmg. | `{ t: 0.5, pose: 'crouchKnife', floor: 'dashLine', cue: 'boot_squeak' }` | If she misses and hits the bulkhead or a cracked-roof support pillar, her knife sticks: 1.2 s. On a wet zone, she slips and falls: 1.5 s. |
| `pinCrack` (big) | She aims up and shoots the roof pane over the hero on purpose. The pane takes 50 dmg and its leak spray hits the zone under it (wet zone, and 4 dmg per second for 2 s while the spray is at full). | `{ t: 1.0, pose: 'aimUp', mark: 'paneHighlight', floor: 'dripCircle', light: 'paneGlow', cue: 'glass_creak' }` | Reload 1.6 s. The hero should step out of the drip circle. |

**The cracking and flooding tunnel gimmick (detail).**
- Each roof pane `t1`-`t8`: hp 100. Stages: hp 99-67 hairline (drip, decor); 66-34 spiderweb (**leak**: a spray stream and a wet zone 60 px wide under it, friction 0.45); 33-1 bulging (louder creak, the spray gets wider: wet zone 90 px); 0 **burst** (`glass:break`, `onBreak: 'flood'`).
- Damage sources: Kalt's missed harpoons (34), `pinCrack` (50), the hero's shots that go up (shotgun 10 per hit, machine gun 3), thrown objects that hit the roof (10), and a shark ramming a broken neighbour (20 to the next pane, at most once per 8 s).
- **Burst:** a water column falls from the hole for 1.2 s. Anyone under it (60 px wide) is knocked down (12 dmg). Then it adds water to the tunnel volume.
- **Flood stages** (tunnel water surface, set by the count of burst panes):
  - 0 panes: dry (y 280, only wet zones).
  - 1 pane: **ankle** (y 272). Whole floor is a wet zone. Running stops slide.
  - 2 panes: **knee** (y 262). Move speed x0.75, no run, roll distance x0.7, sweeps and low attacks still work.
  - 3 panes: **waist** (y 250). Move x0.55, no low attacks, jump height x0.7. Triggers phase 2 (if the hp gate has not already).
- **Crew from holes:** each burst pane lets 1 diver drop in through the hole (from Medium). This is the price of misses.
- **The player's control:** the harpoon arc means a miss hits the roof about 180-260 px behind the hero. The player decides where the cracks go by where he dodges. Smart players dodge so that misses crack the panes over Kalt (she slips in her own leaks). Smart players also fight close: no shots, no misses, no flood.
- **Damage to the hero is never the flood itself** in phase 1. The flood is a speed tax and a terrain change.

**Crew rules, phase 1.** Smugglers from the entry bulkhead door (it opens 1 s for each spawn): every 6 s, `alive` `1/1/2/2`. Divers from burst panes as above. The crew stops spawning when Kalt is in a telegraph for `pinCrack` (so the big move is readable).

### 5.5 Phase shift: "Flood Out"
- **Trigger:** Kalt hp below 60% **or** 3 panes burst.
- **Sequence (scripted, 6 s of play, the hero has control):**
  1. Kalt fires a harpoon line straight up through a cracked pane (the line is visible) and reels herself up and out through the hole (`zipLine` path, invulnerable). Her line: *"Swim, Sandman."*
  2. All remaining roof panes burst one after another from her hole outward (0.25 s apart). The tunnel floods fast: the surface rises from its stage to y 204 in 6 s (E 9 s, W 5 s). Alarm, red light everywhere.
  3. The service hatch at x 3570 unlocks with a clank and a green light. A toast: **"Climb."** The ladder in the shaft goes from y 280 to `cwD` at y 96.
  4. Crew in the tunnel: divers stay (they are fine in water); smugglers in the tunnel drown out (they swim to the entry door and leave).
- **If the hero is slow:** under the water he swims (see section 8). The breath meter starts when his head is under. 12 s (E 18, W 9), then 6 dmg/s. Swimming to the shaft and climbing still works. No instant death.
- **Camera:** the bounds slide up to y 0-220 as the hero climbs. Phase 2 starts when he stands on `cwD`.

### 5.6 Phase 2: "Over the Tank" (catwalks)

**Behaviour.** Kalt stands on `cwB` or `cwC` and fights from range. She moves between catwalks with `zipLine`. She uses the sharks and the drop as weapons.

| Move | What happens | Telegraph | Punish window |
|---|---|---|---|
| `harpoon` | As phase 1, no roof to crack. A reel pull near an edge can pull the hero off a catwalk into the water (only if the hero is within 30 px of an edge on the pull line). | Same as phase 1. | Reload as phase 1. |
| `knife` | As phase 1. | As phase 1. | As phase 1. |
| `chainShot` (big) | She shoots one chain of the catwalk the hero stands on (`cwB` or `cwC`). That section tilts 25 degrees toward the broken chain. The hero slides toward the low end at 90 px/s and falls into the water unless he jumps, rolls toward the high end, or grabs the high edge (ledge). The section stays tilted for 5 s, then a crewman winches it back (or, in phase 3, it falls). | `{ t: 1.1, pose: 'aimHigh', mark: 'chainGlint', light: 'chainSpark', cue: 'chain_creak' }` | Reload 1.6 s. If she is on the same section, she also slides (1.0 s helpless). |
| `zipLine` | She fires a line to the crane rail and swings to another catwalk. Passes through the hero's catwalk at chest height: 20 dmg, knockback toward the water. | `{ t: 0.6, pose: 'aimRail', mark: 'swingArc', cue: 'reel_whine' }` | Lands with a 0.7 s crouch. |
| `chum` | She throws a bucket of chum on an arc. On a catwalk: a 70 px slippery zone (friction 0.3) for 8 s. In the water: a **frenzy zone** 80 px wide for 4 s: sharks rush there; anyone in the water there takes 18 dmg per bite, one bite per 0.8 s. | `{ t: 0.7, pose: 'bucketBack', mark: 'landCircle', cue: 'bucket_slosh' }` | 0.8 s after the throw. |
| `dive` (big) | She drops off the catwalk into the tank. Under water she is not targetable. A bubble trail moves toward the hero's catwalk position. After 0.9 s she bursts up through the water by the catwalk edge under the hero and slashes up (24 dmg, launch). | `{ t: 0.9, mark: 'bubbleTrail', floor: 'edgeRipple', cue: 'bubbles_rise' }` | After the burst-up attack she clings to the catwalk edge for 1.0 s (E 1.6, W 0.7). Hits on her hands (low attacks, stomp) knock her back into the water: 1.2 s stunned, then she climbs a ladder. A sweep while she clings gives a "heavy" stagger. |

**Sharks (phase 2-3).** Two sharks circle in the tank. They never jump onto the catwalks. If the hero is in the water: the nearest shark turns to him (fin telegraph: the dorsal fin comes up and moves straight toward him, 1.5 s, E 2.2 s, W 1.0 s) and bites: 22 dmg, then a throw toward the nearest catwalk or ladder (so the hero is not stuck). Divers and Kalt are never bitten except in a chum frenzy zone (Kalt avoids her own frenzy; divers do not, and the player can knock them into it).

**The water in phase 2.** Falling into the tank is not death. The hero swims (section 8). He climbs out at the ladders or with a ledge climb at any catwalk edge. He keeps his melee weapon. A gun he is holding is dropped (it floats for 4 s, then sinks).

**Crew rules, phase 2.** Divers climb the ladders out of the water every 7 s, `alive` `1/2/2/3`. From Hard, one harpooner stands on `cwA` (the far landing) and stays until killed (not replaced). No crew spawns while the hero is in the water (the shark is the threat then).

### 5.7 Phase 3: "Blood in the Water"
- **Trigger:** Kalt hp below 30%.
- **On enter:** she taunts (`roar`, 0.9 s; a free hit window). Her line: *"You smell like the sea now."* Every crew member alive dives off and leaves (clear crew). No more crew.
- **Changes:**
  - `chainShot` no longer gets winched back: the section falls into the tank after 4 s tilted. One section (`cwB` or `cwC`) can fall; the other stays (so the arena never loses its middle). The fallen section floats, half-sunk, as a sloped surface in the water.
  - `dive` is her main move. More bubble trails, and on Hard and Wicked one decoy trail (a diver) runs at the same time.
  - The bait cage on the feeding crane now drops on her command once (a heavy drop into the water, 30 dmg to anything under it; telegraph: chain release clank, cage shakes 1.0 s).
  - Her blood (when hurt) in the water attracts the sharks to her for 2 s after each hit while she is in the water: the sharks become the player's allies. If she is hit while clinging to an edge, a shark fin passes close and she pulls herself up in fear (an extra 0.6 s on the edge).
- **The goal:** knock her into the water at low hp, or bring her to 0 hp anywhere.

### 5.8 Punish windows (summary)
1. Reload after every harpoon shot (the main window, every phase).
2. Cut the reel line during `reelStab`: 1.0 s stumble.
3. A missed `lunge` into a wall or support: 1.2 s stuck.
4. Kalt in a wet or chum zone during a lunge or a dash: 1.5 s fall.
5. `zipLine` landing: 0.7 s crouch.
6. Clinging after `dive`: 1.0 s; hits on the hands knock her back for 1.2 s.
7. The phase-3 taunt: 0.9 s.
8. A `chainShot` on the section she stands on: 1.0 s slide.

### 5.9 Difficulty scaling

| Value | Easy | Medium | Hard | Wicked |
|---|---|---|---|---|
| Kalt hp | 700 | 840 | 940 | 1040 |
| Telegraph scale (`t / sqrt(A)`) | x1.0 | x0.71 | x0.5 | x0.35 (floor: 0.3 s) |
| Harpoon speed | 380 | 440 | 500 | 560 px/s |
| Reload window | 2.2 s | 1.6 s | 1.2 s | 0.9 s |
| Phase 1 crew alive (from door) | 1 | 1 | 2 | 2 |
| Divers from burst panes | 0 | 1 | 1 | 2 |
| Phase 2 crew alive (divers) | 1 | 2 | 2 | 3 |
| Harpooner on `cwA` | no | no | yes | yes |
| Phase-shift flood time | 9 s | 6 s | 6 s | 5 s |
| Breath meter | 18 s | 12 s | 12 s | 9 s |
| Shark fin telegraph | 2.2 s | 1.5 s | 1.2 s | 1.0 s |
| Shark bite | 14 | 22 | 26 | 30 |
| Phase 3 decoy bubble trails | 0 | 0 | 1 | 1 |
| Cling window after `dive` | 1.6 s | 1.0 s | 0.85 s | 0.7 s |

Telegraph floor: no telegraph goes below 0.3 s, so Wicked stays fair.

### 5.10 Defeat sequence: "Deep Plunge"
1. **At 0 hp** (anywhere): hit-stop 0.2 s. If she is on a catwalk, she staggers back and falls off the edge into the tank. If she is in the water, she is stunned at the surface.
2. **Finisher prompt** (attack within 1.5 s; if missed, it plays anyway): Elias jumps from the catwalk in a plunge (the axe-plunge animation, any weapon).
3. **Slow motion** (`timeScale 0.25`, 1.6 s real): he goes into the water on top of her, bubbles, the camera follows down through the tank. They hit the cracked tunnel roof together; the last pane bursts; both crash through into the flooded tunnel. The sharks turn away.
4. **Freeze frame** (bible rule for boss finishers): a still of Elias under water, hair floating, Kalt below him among glass shards and moon jellies, the red emergency lamp behind. 1.2 s. Then the boss's last-words dialog (portrait, see section 6).
5. **In-engine:** Elias swims up through the hole and climbs onto `cwB`/`cwA` (whichever is still up), soaked. The `boss:defeated` event fires. Fade to the outro panels.
6. **Effects:** all crew leave; the alarm stops; the music drops to the drone; a final storm boom.

### 5.11 Gimmick module: `sharkTunnel`
Interface from architecture section 4.1.
- `init(ctx)`: registers the roof panes `t1-t8` with `hpMin` locks off, the tunnel water volume (surface y 280), the tank water volume (surface y 112), the sharks (2 actors with patrol paths), the catwalk sections and chains, the crane mover, the hatch lock. Sets `arena.flood = 0`.
- `step(ctx, dt)`: moves sharks along their paths (above the roof in phase 1; under the catwalks in phase 2-3); applies frenzy zones; updates leak sprays to wet zones; raises the tunnel water toward the target for `arena.flood`; manages catwalk tilt and winch timers; ramming rule.
- `onEvent('glass:break', pane)`: `arena.flood += 1`, sets the water target for the new stage, emits a burst column hazard, spawns a diver from the hole (difficulty rule), adds a red lamp at `pane.x`.
- `onEvent('boss:phase', 2)`: runs the "Flood Out" script.
- `lights(ctx)`: caustic projector (phase 1), red lamps per burst pane, the roof work lamps in phase 2, the moving shark-shadow light.
- `hazards(ctx)`: burst columns, leak sprays (dps), frenzy zones, the bait-cage drop, the tilted-catwalk slide force.
- `draw2d / build3d / update3d`: the tunnel arch and roof cracks (shared crack texture), water surfaces, sharks, catwalks and chains. Both views read the same sim state (the sharks, the water levels and the tilts are sim data, not render data).

---

## 6. Cutscene and dialog script

Caption style per the bible: yellowed paper boxes for VO, white balloons for dialogue, red tint on Choir symbols.

### 6.1 Opening cutscene: `aquarium_intro` (5 panels)

| # | Panel id | SHOT | TEXT |
|---|---|---|---|
| 1 | `aquarium_intro_01` | Exterior, night. The sea wall. The aquarium's whale-shaped facade, dark; the sign "THE LEVIATHAN - VALMORA CITY AQUARIUM" with half its neon dead. Storm waves smash over the wall in white spray. Mags's old green coupé, headlights off, wipers moving. | VO: "The Leviathan. Kids come here by day. Contraband by night." |
| 2 | `aquarium_intro_02` | Interior of the car, close. Mags lights a cigarette; the match lights both faces. Rain runs down the windscreen. Nero's head between the seats from the back. | MAGS: "I'll keep the engine warm. Don't make me come in after you." |
| 3 | `aquarium_intro_03` | Medium. Elias at the staff door, the lock already broken. He looks back once at the car. Nero's nose at the car's window. | HERO: "Stay." VO: "The dog obeyed. He always does when it matters." **(refined: added panel)** |
| 4 | `aquarium_intro_04` | Wide. The hero in the blue glass tunnel. A shark passes overhead, its shadow sliding across his face. | VO: "Glass between me and the teeth. Same as every night of my life." |
| 5 | `aquarium_intro_05` | Medium. Divers in black wetsuits load crates onto a boat at a basement dock. One raises a harpoon gun toward the camera. | DIVER: "Intruder in the tunnel!" |

Note: panel 4 is a flash-forward (the tunnel is at the end of the level). It sets the promise of the boss arena. Panel 5 is the dock (Beat 9) and gives the player the faction look.

### 6.2 In-level barks and PA lines (`dialog`, no portraits; shown as a radio-style caption with a static crackle)

| Id | Where | Speaker | Line |
|---|---|---|---|
| `l1_payphone` | Beat 1 | SMUGGLER (whispering into the payphone) | "...the Sandman. Here. Tell Kalt." |
| `reef_pa` | Beat 3 start | KALT (PA) | "Visitors, the aquarium is closed. Please mind the glass." |
| `jelly_pa` | after the burst | KALT (PA) | "That was a forty-year-old bloom. Pay for it." |
| `pumps_pa` | Beat 7 start | KALT (PA, calm) | "Open the sea gate. Let the tide meet our guest." |
| `pumps_pa2` | Beat 7, surge 3 | KALT (PA) | "Still climbing? Men always climb. The sea is patient." |
| `teague_bark` | Beat 10 start | TEAGUE (muffled through the helmet) | "Kalt says you float. Let's check." |
| `teague_dead` | Beat 10 end | TEAGUE | "...told her... glass..." |
| `kalt_taunt` | phase 3 enter | KALT | "You smell like the sea now." |
| `kalt_flood` | phase shift | KALT | "Swim, Sandman." |

### 6.3 Boss intro portrait dialog: `kalt_intro` (inside the glass shark tunnel)

| Speaker | Mood (portrait id) | Line |
|---|---|---|
| KALT | Cool, bored, loading a harpoon (`kalt_bored`) | "You followed the money. Most men drown first." |
| HERO | Cold (`elias_cold`) | "The Board." |
| KALT | Amused (`kalt_amused`) | "The Board doesn't sign orders. It nods. Somebody always understands the nod." |
| HERO | Cold (`elias_cold`) | "I understand." |
| KALT | Sharp, aiming (`kalt_sharp`) | "Then understand this. Glass breaks. You'll break first." |

(Unchanged from the bible. The "nod" line is the bible's L4 twist clue; keep it word for word.)

### 6.4 Boss last words: `kalt_defeat` (portrait dialog after the freeze frame)

| Speaker | Mood | Line |
|---|---|---|
| KALT | Hurt, half-drowned (`kalt_hurt`) | "Brask only paid for the matches. The Board gave the fire order." |
| HERO | Cold (`elias_cold`) | "Who on the Board?" |
| KALT | Bitter smile (`kalt_bitter`) | "The ones who never get wet. Look up, Sandman. Look all the way up." |

This follows the bible rule that each beaten boss names the next rank up (the Board, the Basses). **(refined: new lines)**

### 6.5 End-of-level cutscene: `aquarium_outro` (5 panels)

| # | Panel id | SHOT | TEXT |
|---|---|---|---|
| 1 | `aquarium_outro_01` | The flooded tunnel, blue-green. Kalt floats face-down among broken glass and drifting jellyfish. Above, through the broken roof, the hero climbs out onto a catwalk, soaked. | VO: "The sea took her back. It always collects." |
| 2 | `aquarium_outro_02` | The dark lobby. A payphone on the wall rings. Wet footprints pass it. The whale skeleton above. | SFX: "RRRING. RRRING." VO: "A phone rang behind me. For once, I let it ring." **(refined: added panel; keeps the bible's "every level ends with a payphone ringing" thread and makes the sniper a missed warning)** |
| 3 | `aquarium_outro_03` | Exterior. Mags's coupé speeds along the sea wall in the storm. A red laser dot slides across the windscreen. | MAGS: "We're clear, we're..." |
| 4 | `aquarium_outro_04` | Close-up. Shattered windscreen, a bullet hole. Mags slumps, holding her bloody shoulder. Nero barks wildly in the back seat. | VO: "They didn't aim at me. They aimed at what I had left." |
| 5 | `aquarium_outro_05` | The hero drives with one hand, holding Mags with the other. A red neon cross ahead: *St. Cecilia Hospital*. | VO: "St. Cecilia. Patron saint of music. Of course it belonged to the Choir." |

### 6.6 Manifest card: `aquarium_manifest` (Beat 8, one in-engine panel)
- Image: close-up of a waterproof manifest under a dive lamp. A red wax seal with a tuning fork.
- Text on the page: *"Cargo 0412. Bell & Sons, Horloger: ACCOUNT CLOSED. Authorised: the Board. Meridian Holdings."*
- VO: *"Not the Baritones. The Board. The ones who never sign."*

---

## 7. Level data skeleton

New keys this level needs are marked `// NEW` (see section 8).

```js
// src/levels/aquarium/level.js
import { defineLevel } from '../../director/define.js';
import kalt from '../../bosses/kalt.js';
import teague from '../../bosses/teague.js';
export default defineLevel({
  id: 'aquarium', title: 'The Leviathan', order: 4, palette: 'aquarium', music: 'music:aquarium_explore',
  size: { W: 3600, H: 320, groundY: 280 },
  sections: [
    { id: 'lobby',  x0: 0,    x1: 620,  indoor: true, weather: 'none', ambient: [0.30, 0.36, 0.48],
      camera: { minZoom: 0.45, maxZoom: 0.6, bounds: [0, 620] },
      backdrop: [{ type: 'wall', set: 'aquariumLobby' }, { type: 'skylight', rain: true, lightning: [6, 12] }, // NEW skylight
                 { type: 'tank', x0: 470, x1: 600, y0: 190, y1: 270, fauna: 'reefSmall' }] },                // NEW tank backdrop
    { id: 'reef',   x0: 640,  x1: 1240, indoor: true, weather: 'none', ambient: [0.25, 0.42, 0.60],
      camera: { minZoom: 0.4, maxZoom: 0.6, bounds: [640, 1240] },
      backdrop: [{ type: 'tank', x0: 660, x1: 1220, y0: 150, y1: 272, fauna: 'reef', caustics: true }] },
    { id: 'jelly',  x0: 1260, x1: 1700, indoor: true, weather: 'none', ambient: [0.18, 0.12, 0.30],
      camera: { minZoom: 0.5, maxZoom: 0.7, bounds: [1260, 1700] },
      backdrop: [{ type: 'wall', set: 'rotundaUV' }] },
    { id: 'pumps',  x0: 1720, x1: 2220, indoor: true, weather: 'none', ambient: [0.30, 0.38, 0.32],
      camera: { minZoom: 0.45, maxZoom: 0.6, bounds: [1720, 2220], boundsY: [40, 320] },                    // NEW boundsY
      backdrop: [{ type: 'wall', set: 'pumpHall' }, { type: 'porthole', x: 1800, y: 150, sea: 'storm' }] },
    { id: 'dock',   x0: 2240, x1: 2860, indoor: true, weather: 'none', ambient: [0.42, 0.34, 0.26],
      camera: { minZoom: 0.4, maxZoom: 0.6, bounds: [2240, 2860] },
      backdrop: [{ type: 'wall', set: 'seaDoors', storm: true }] },
    { id: 'tunnel', x0: 2880, x1: 3600, indoor: true, weather: 'none', ambient: [0.20, 0.34, 0.55],
      camera: { minZoom: 0.55, maxZoom: 0.7, bounds: [2880, 3600], boundsY: [150, 320] },
      backdrop: [{ type: 'tank', x0: 2880, x1: 3600, y0: 112, y1: 280, fauna: 'ocean', sharks: 'actors', caustics: true }] },
  ],
  scene: { paint: [
    { type: 'turnstiles', x: 200 }, { type: 'kiosk', x: 150 }, { type: 'whaleSkeleton', x0: 60, x1: 420, y: 60 },
    { type: 'shopShelves', x0: 380, x1: 500 }, { type: 'counter', x0: 500, x1: 580 },
    { type: 'gantry', x0: 760, x1: 1180, y: 168 }, { type: 'jellyCylinder', x: 1480, glow: ['magenta', 'cyan'] },
    { type: 'balcony', x0: 1280, x1: 1400, y: 196 }, { type: 'balcony', x0: 1560, x1: 1680, y: 196 },
    { type: 'filterTank', x0: 1790, x1: 1850, top: 226 }, { type: 'filterTank', x0: 1890, x1: 1950, top: 226 },
    { type: 'pipeRack', x0: 1960, x1: 2090, y: 184 }, { type: 'gantry', x0: 2070, x1: 2220, y: 136 },
    { type: 'seaGate', x: 1740 }, { type: 'junctionBox', x: 1880, y: 240 },
    { type: 'mezzanine', x0: 2240, x1: 2400, y: 150, room: 'diveLocker' },
    { type: 'boat', x0: 2560, x1: 2680, deck: 266 }, { type: 'hoist', x0: 2500, x1: 2740, y: 120 },
    { type: 'tunnelArch', x0: 2900, x1: 3580, roofY: 192 }, { type: 'catwalkFrame', y: 96 },
    { type: 'clock', x: 3548, y: 230, time: '3:17', brand: 'Bell & Sons' },
    { type: 'lamp', style: 'exit', xs: [20, 610, 1250, 1710, 2230] },
  ]},
  ground: [{ x0: 0, x1: 2560 }, { x0: 2680, x1: 3600 }],               // the dock channel is a gap
  killY: 340,                                                            // only reachable in a glitch; water catches falls
  water: [                                                               // NEW world/water
    { id: 'reefFloor', x0: 1040, x1: 1240, surface: 280, rise: 'onBreak:reefBig', peak: 272, drainT: 15 },
    { id: 'jellyFloor', x0: 1260, x1: 1700, surface: 280, rise: 'onBreak:cylinder', peak: 262, holdT: 4, then: [272, 16], drainT: 20 },
    { id: 'pumpHall', x0: 1720, x1: 2220, surface: 280,
      stages: [{ to: 250, at: { t: 3 }, v: 20 }, { to: 200, at: { killed: 'p1', orT: 20 }, v: 12 },
               { to: 128, at: { killed: 'p2', orT: 20 }, v: [4, 5, 6, 7] }] },
    { id: 'channel', x0: 2560, x1: 2680, surface: 288, swell: { on: 'storm:boom', amp: 6 } },
    { id: 'tunnelIn', x0: 2900, x1: 3580, surface: 280, ceiling: 204, stages: 'gimmick' },
    { id: 'tank', x0: 2890, x1: 3600, surface: 112, floor: 192, fauna: 'sharks' },
  ],
  zones: [                                                               // NEW friction zones (shared with L1 ice)
    { id: 'shopSpill', x0: 140, x1: 170, friction: 0.5, kind: 'wet' },
  ],
  surfaces: [
    { id: 'counter',  x0: 500,  x1: 580,  y: 250, oneWay: true, lane: 'plat' },
    { id: 'reefGantry', x0: 760, x1: 1180, y: 168, oneWay: true, lane: 'plat' },
    { id: 'reefCrates', x0: 1090, x1: 1130, y: 230, oneWay: true, lane: 'plat' },
    { id: 'balL', x0: 1280, x1: 1400, y: 196, oneWay: true, lane: 'plat' },
    { id: 'balR', x0: 1560, x1: 1680, y: 196, oneWay: true, lane: 'plat' },
    { id: 'filt1', x0: 1790, x1: 1850, y: 226, oneWay: false, lane: 'plat' },
    { id: 'filt2', x0: 1890, x1: 1950, y: 226, oneWay: false, lane: 'plat' },
    { id: 'rack', x0: 1960, x1: 2090, y: 184, oneWay: true, lane: 'plat' },
    { id: 'pumpGantry', x0: 2070, x1: 2220, y: 136, oneWay: true, lane: 'plat' },
    { id: 'mezz', x0: 2240, x1: 2400, y: 150, oneWay: true, lane: 'plat' },
    { id: 'dockCrates', x0: 2430, x1: 2480, y: 236, oneWay: true, lane: 'plat' },
    { id: 'cwA', x0: 2890, x1: 3060, y: 96, oneWay: false, lane: 'fight', active: 'phase>=2' },        // NEW active gate
    { id: 'cwB', x0: 3100, x1: 3240, y: 96, oneWay: false, lane: 'fight', chains: [3110, 3230], tilt: true }, // NEW tilt
    { id: 'cwC', x0: 3280, x1: 3400, y: 96, oneWay: false, lane: 'fight', chains: [3290, 3390], tilt: true },
    { id: 'cwD', x0: 3440, x1: 3600, y: 96, oneWay: false, lane: 'fight' },
  ],
  walls: [
    { x: 622, y0: 0, y1: 280, id: 'reefDoor' }, { x: 1262, y0: 0, y1: 280, id: 'jellyDoorL' },
    { x: 1698, y0: 0, y1: 280, id: 'jellyDoorR' }, { x: 1722, y0: 0, y1: 280, id: 'pumpDoorIn' }, { x: 2215, y0: 140, y1: 280, id: 'pumpShutter' },
    { x: 2400, y0: 150, y1: 280, id: 'teagueL', active: false }, { x: 2860, y0: 0, y1: 280, id: 'tunnelDoor' },
    { x: 2900, y0: 204, y1: 280, id: 'tunnelEntry' }, { x: 3570, y0: 204, y1: 280, id: 'serviceHatch' },
  ],
  ladders: [                                                             // NEW ladders
    { x: 740, y0: 168, y1: 280 }, { x: 1740, y0: 184, y1: 280 },
    { x: 3560, y0: 96, y1: 280, locked: 'serviceHatch' },
    { x: 2900, y0: 96, y1: 112 }, { x: 3330, y0: 96, y1: 112 }, { x: 3450, y0: 96, y1: 112 },
  ],
  movers: [
    { id: 'hoist', surface: { w: 50, y: 214 }, path: [[2500, 214, 0], [2740, 214, 4]], mode: 'pingpong', model: 'pallet',
      drop: { trigger: 'hit:hoistBox', dmg: 40, w: 50 } },                                                // NEW drop
    { id: 'boat', surface: { w: 110, y: 266 }, path: [[2565, 266, 0], [2565, 268, 1.5]], mode: 'pingpong', model: 'boat' },
    { id: 'baitCage', surface: { w: 40, y: 74 }, path: [[3080, 74, 0], [3420, 74, 6]], mode: 'pingpong', model: 'cage',
      active: 'phase>=2', drop: { trigger: 'boss:baitDrop', dmg: 30, w: 50 } },
  ],
  panes: [
    { id: 'lobbyTank', x0: 470, x1: 600, y0: 190, y1: 270, hp: 40, hpMin: 1, kind: 'tank', depth: -30, onBreak: 'flood' },
    { id: 'case1', x0: 400, x1: 430, y0: 240, y1: 270, hp: 30, kind: 'window', depth: -8, onBreak: 'shards' },
    { id: 'case2', x0: 450, x1: 480, y0: 240, y1: 270, hp: 30, kind: 'window', depth: -8, onBreak: 'shards' },
    { id: 'katanaCase', x0: 96, x1: 128, y0: 252, y1: 272, hp: 10, kind: 'window', depth: -6, onBreak: 'shards' },
    ...[0, 1, 2, 3].map((i) => ({ id: `reef${i + 1}`, x0: 660 + i * 95, x1: 750 + i * 95, y0: 160, y1: 270,
      hp: 100, hpMin: 10, kind: 'tank', depth: -30, onBreak: 'flood', leakAt: 66 })),                     // NEW leakAt
    { id: 'reefBig', x0: 1040, x1: 1200, y0: 150, y1: 272, hp: 60, kind: 'tank', depth: -30, onBreak: 'flood', volume: 'small', script: 'b4' },
    { id: 'cylinder', x0: 1450, x1: 1510, y0: 110, y1: 280, hp: 120, hpMin: 30, kind: 'tank', depth: -12,
      onBreak: 'flood', volume: 'large', shape: 'cylinder', script: 'bloom' },                              // NEW shape, volume
    ...[1300, 1360, 1600, 1660].map((x, i) => ({ id: `jcol${i + 1}`, x0: x - 10, x1: x + 10, y0: 200, y1: 270,
      hp: 40, kind: 'tank', depth: -30, onBreak: 'shards' })),
    { id: 'lockerWin', x0: 2380, x1: 2400, y0: 160, y1: 200, hp: 20, kind: 'window', depth: 0, onBreak: 'shards' },
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ id: `t${i + 1}`, x0: 2900 + i * 80, x1: 2980 + i * 80, y0: 192, y1: 204,
      hp: 100, kind: 'tank', depth: 0, onBreak: 'flood', leakAt: 66, owner: 'gimmick' })),
  ],
  lights: [
    { x: 1480, y: 190, r: 220, rgb: [0.9, 0.3, 0.9], pulse: 4 },                                          // NEW pulse
    { x: 1800, y: 60, r: 160, rgb: [1.0, 0.15, 0.1], flicker: 'rotate', on: 'water:pumpHall' },
    { x: 2600, y: 100, r: 260, rgb: [1.0, 0.75, 0.4] }, { x: 3240, y: 20, r: 300, rgb: [0.6, 0.75, 1.0], on: 'phase>=2' },
  ],
  props: [
    ['bin', 40, 280], ['wetSign', 180, 280], ['bench', 260, 280], ['plush', 390, 268], ['plush', 420, 268],
    ['register', 540, 250], ['crate', 1100, 280], ['crate', 1100, 254], ['barrel', 960, 280],
    ['bench', 1340, 280], ['bench', 1620, 280], ['barrel', 1830, 280], ['barrel', 1990, 184], ['crateHeavy', 2060, 184],
    ['diveTank', 2280, 150], ['diveTank', 2300, 150], ['cashCrate', 2460, 280], ['cashCrate', 2500, 280],
    ['barrel', 2720, 280], ['crate', 2780, 280], ['crate', 2780, 254], ['bucket', 3480, 96],
  ],
  pocket: [['snowGlobe', 360, 6], ['can', 150, 4], ['bottle', 150, 3], ['bottle', 2420, 2]],              // NEW pocket stashes
  pickups: [
    { w: 'katana', x: 112, stand: 'bench', behind: 'katanaCase' }, { item: 'bandage', x: 560 },
    { w: 'mg', x: 900, ammo: [45, 30, 30, 24] }, { item: 'ammo', x: 1180 }, { w: 'axe', x: 1220, stand: 'rack' },
    { w: 'shotgun', x: 1300, y: 196 }, { item: 'bandage', x: 1820, y: 226 },
    { item: 'bandage', x: 2260, y: 150 }, { item: 'ammo', x: 2300, y: 150 }, { w: 'katana', x: 2340, y: 150, stand: 'rack' },
  ],
  start: { x: 60, section: 'lobby', cutscene: 'aquarium_intro' },
  objectives: [
    { id: 'manifest', kind: 'read', x: 2320, y: 150, card: 'aquarium_manifest', optional: true },
  ],
  waves: {
    l1: { at: [220, 260, 300], roles: ['smuggler', 'smuggler', 'diver'], count: [1, 2, 2, 3], preplaced: true, unaware: 140 },
    l2: { at: [420, 480, 560, 600], roles: ['smuggler', 'diver', 'smuggler', 'hauler'], count: [3, 4, 5, 6], from: 'nearestDoor', when: { heroX: '>=380' } },
    r1: { at: [1000], roles: ['harpoon'], perch: 'reefGantry', preplaced: true },
    r2: { at: [700, 820, 1000], roles: ['smuggler', 'diver', 'smuggler'], count: [2, 3, 4, 5], from: 'nearestDoor', when: { heroX: '>=700' } },
    r3: { at: [1170], roles: ['harpoon'], perch: 'reefGantry', minDiff: 'Hard', when: { t: '>12', after: 'r2' } },
    b4: { at: [1080, 1160], roles: ['diver', 'diver'], count: [2, 2, 3, 4], from: 'pane:reefBig', when: { heroX: '>=1050' } },
    j1: { at: [1620, 1300, 1680], roles: ['harpoon', 'smuggler', 'diver'], count: [3, 4, 5, 6], from: 'nearestDoor', perch: { harpoon: 'balR' }, when: { inSection: 'jelly' } },
    j2: { at: [1290, 1690], roles: ['smuggler', 'diver', 'hauler'], count: [2, 3, 4, 5], from: 'nearestDoor', when: { aliveIn: 'j1', lte: 2 } },
    p1: { at: [1760, 1860], roles: ['diver'], count: [2, 2, 3, 4], from: 'water:pumpHall', when: { water: 'pumpHall', lte: 250 } },
    p2: { at: [1820, 1920, 2150], roles: ['smuggler', 'smuggler', 'harpoon'], count: [1, 3, 3, 4], perch: { harpoon: 'pumpGantry' }, when: { killed: 'p1', orT: 20 } },
    d1: { at: [2440, 2520, 2600, 2760, 2800], roles: ['smuggler', 'hauler', 'harpoon', 'smuggler', 'hauler'], count: [4, 5, 6, 7], perch: { harpoon: 'boat' }, when: { heroOn: 'ground', inSection: 'dock' } },
    d2: { at: [2580, 2640], roles: ['diver'], count: [2, 3, 4, 5], from: 'water:channel', when: { aliveIn: 'd1', lte: 2 } },
  },
  triggers: [
    { when: { killed: 'l1' }, do: { toast: '' } },
    { when: { killed: 'l2' }, do: { open: 'reefDoor' } },                                               // NEW open action
    { when: { heroX: '>=700' }, do: { dialog: 'reef_pa' } },
    { when: { heroX: '>=1050' }, do: [{ telegraph: { pane: 'reefBig', t: 0.8 } }, { spawnWave: 'b4' }] },
    { when: { killed: 'b4' }, do: { open: 'jellyDoorL' } },
    { when: { inSection: 'jelly' }, do: [{ close: 'jellyDoorL' }, { spawnWave: 'j1' }] },
    { when: (s) => s.waves.j2.spawned && s.panes.cylinder.stage >= 2 && s.near('cylinder', 160).goons >= 3,
      do: { arm: 'cylinder', toast: 'The glass is ready.', cue: 'glass_tink' } },                       // NEW arm action
    { when: { glassBreak: 'cylinder' }, do: { slowmo: { scale: 0.25, t: 1.8, zoom: 0.8, focus: 'cylinder' }, burst: 'cylinder' } }, // NEW slowmo, burst
    { when: { armedFor: 'cylinder', t: '>40' }, do: { scriptShot: { by: 'harpoon', at: 'cylinder' } } },
    { when: { glassBreak: 'cylinder', t: '>8' }, do: [{ open: 'jellyDoorR' }, { dialog: 'jelly_pa' }] },
    { when: { inSection: 'pumps' }, do: [{ close: 'pumpDoorIn' }, { dialog: 'pumps_pa' }, { water: { id: 'pumpHall', start: true } }] },
    { when: { heroX: '>=2190', heroY: '<=140' }, do: { transition: { to: 'dock', at: { x: 2260, y: 150 }, fade: true } } },
    { when: { killed: 'd2' }, do: [{ wall: { id: 'teagueL', active: true } }, { elite: 'teague' }] },  // NEW elite action
    { when: { killed: 'teague' }, do: [{ open: 'tunnelDoor' }, { wall: { id: 'teagueL', active: false } }] },
    { when: { inSection: 'tunnel' }, do: { scene: 'tunnel_approach' } },                                // in-engine shark pass
    { when: { heroX: '>=3040' }, do: [{ close: 'tunnelEntry' }, { boss: 'start' }] },
  ],
  elites: { teague: { module: teague, arena: { section: 'dock', x0: 2400, x1: 2860 }, bark: 'teague_bark',
            crew: { roles: ['diver'], every: 8, alive: [0, 1, 2, 2], from: 'water:channel' } } },          // NEW elites
  boss: { module: kalt, arena: { section: 'tunnel', x0: 2900, x1: 3580, doors: [2900], y: [0, 320] },
          intro: 'kalt_intro', crew: { roles: ['smuggler', 'knife'], every: 6, max: 8, from: 'door:tunnelEntry' } },
  cutscenes: { intro: 'aquarium_intro', outro: 'aquarium_outro', cards: ['aquarium_manifest'] },
  dialog: { /* ids from section 6: l1_payphone, reef_pa, jelly_pa, pumps_pa, pumps_pa2, teague_bark, teague_dead,
               kalt_intro, kalt_taunt, kalt_flood, kalt_defeat */ },
  assets: ['panel:aquarium_*', 'portrait:kalt_*', 'portrait:elias_*', 'music:aquarium_*', 'sfx:glass_*', 'sfx:water_*',
           'sfx:harpoon_*', 'sfx:shark_*', 'bg:aquarium_*'],
});
```

---

## 8. Engine features this level needs (do not exist yet)

The architecture plan names some of these (`world/panes.js`, `world/water.js`, migration step 16 testbed rooms). All of them are sim features in shared code; the 2D and 3D renderers only read the state. Each needs a testbed room in `_testbed/`.

| # | Feature | One-line spec | Shared with |
|---|---|---|---|
| 1 | **Breakable panes with crack stages** | `panes[]` with `hp`, 3 visual crack stages at 66/33 hp, `hpMin` lock, `leakAt`, `glass:break` event, shard particles, works on any `kind`. | L3 mirrors, L5 wards, L6 palm-house roof, L8 clock face |
| 2 | **Pane burst wave** | `onBreak: 'flood'` with `volume: small/large` spawns a directional water wave hazard (speed, range, knockdown, dmg; safe if rolling, airborne or on a platform) and adds volume to the nearest water body. | L2 (flooded platforms, optional) |
| 3 | **Leaks** | A pane at stage 2 or more emits a spray particle stream and a wet friction zone under it that grows with stage. | L5 (burst pipes, optional) |
| 4 | **Water bodies** | `water[]` with surface y, x-range, optional ceiling/floor, scripted `stages` (target, trigger, rise speed), drain timers, storm `swell`; sim reads depth per actor. | L1 (quay water), L2 (flooded tracks) |
| 5 | **Wading** | Depth bands from the actor's feet: ankle (< 10 px: wet friction), knee (10-21 px: speed x0.75, no run, roll x0.7), waist (22-33 px: speed x0.55, no low attacks, jump x0.7), chest (>= 34 px: swim). Goons use the same bands (divers ignore them). | L2 |
| 6 | **Swimming and breath** | Swim mode: 2-axis movement at 55% walk speed, no guns (held gun dropped, floats 4 s), melee at 60% speed, ledge climb out at any edge, breath meter (12 s base) then 6 dmg/s; HUD bubble meter. | L2 (optional) |
| 7 | **Underwater rendering and audio** | When the camera centre or the hero's head is below a surface: blue tint, caustic overlay, wobble, bubble particles, low-pass audio filter; a visible surface line with highlights in 2D and a water plane in 3D. | L2 |
| 8 | **Friction zones** | `zones[]` with `friction`, `kind: 'wet' | 'ice' | 'chum'`; affects stops, slides, sweeps and charges for all actors; goon slip on a lunge = 1.5 s fall. | L1 (ice; already planned) |
| 9 | **Slow-motion action** | Trigger action `slowmo: { scale, t, zoom, focus }` that sets `state.timeScale`, drives the camera and the audio filter, and keeps HUD time in real seconds. | Every level (bible rule) |
| 10 | **Arm / lock scripted panes** | Trigger actions `arm` (lift `hpMin`, cue, toast) and `scriptShot` (force a goon to shoot a target). | L3, L6 |
| 11 | **Aquarium fauna backdrop** | `backdrop: { type: 'tank', fauna }`: schooling fish (boids, 20-60 per tank), rays and eels on paths, moon jellies with a pulse animation, storm ripple on `storm:boom`; drawn behind the glass layer with tint and caustics; fish scatter from a crack or a hit on the glass. | L3 (casino aquarium decor, optional) |
| 12 | **Shark actors** | Sim actors that move in a water body on paths; fin telegraph; bite hazard on swimmers; frenzy-zone attraction; blood attraction; never leave water. Their shadows are moving dark lights. | none |
| 13 | **Water-sourced spawns** | `from: 'water:<id>'` and `from: 'pane:<id>'`: spawn under the surface and swim up or come out with the burst. | L2 |
| 14 | **Diver ankle grab** | A goon `grab` variant usable only when the hero's depth band is knee or more; drag down, mash to break. | none |
| 15 | **Harpoon projectile** | `volley('harpoon')` (listed in the architecture): slow bolt with arc, reel pull on hit, pane damage on a miss, sticks in walls as a `harpoonBolt` pickup (one-use throw). | L2 (rail spikes reuse the "sticks in wall" part) |
| 16 | **Ladders** | `ladders[]`: climb up and down at 60 px/s, attack-off (a kick drops you), jump off; goons use them; `locked` by a wall id. | L2, L5, L6, L8 |
| 17 | **Tilting surfaces on chains** | A surface with `chains[]`: shooting a chain tilts it (angle, slide force), timers to restore or fall; a fallen section floats. | L8 (gears, minute hand) |
| 18 | **Floating objects** | Props and crates in a water body float at the surface, bob, and act as small one-way platforms. | L2 |
| 19 | **Mover drop** | A mover with `drop`: a hit on a named box or an event releases its load as a falling hazard. | L1 (tuna conveyor), L8 |
| 20 | **Camera vertical bounds** | `camera.boundsY` per section and per boss phase; smooth pan when the hero climbs. | L5 helipad, L8 |
| 21 | **Elite runtime** | `elites{}`: run the boss runtime with one phase, no portrait intro, a bark, and a local arena lock; no boss bar (a small name tag instead). | All levels (mini-bosses) |
| 22 | **Actor-mounted pane (helmet)** | An enemy can carry a pane (`armor: { pane, zone: 'head', hp }`) that absorbs hits to a zone until it breaks, then a stat change. | L6 (riot shield, optional) |
| 23 | **Floor creatures** | Jellyfish as small floor hazards: sting on step, kick to throw as a projectile, despawn after 60 s. | none |
| 24 | **Radio / PA dialog** | A dialog line type without a portrait: a caption with a speaker tag and a static filter on voice. | L5, L6 (police radio) |
| 25 | **Pulsing and on-event lights** | `lights[].pulse` (period) and `lights[].on` (condition: water level, phase, event). | All levels |
| 26 | **Read card objective** | `objectives[].kind: 'read'`: an interact prompt shows one in-engine panel card; optional; adds to a "clues" count on the results card. | All levels |
| 27 | **Boss finisher hook** | `finisher: 'deepPlunge'`: a scripted sequence at 0 hp (prompt, slow motion, camera path, freeze frame, then last-words dialog). | All bosses (bible: slow-motion freeze frame) |
| 28 | **Optional: harpoon gun for the hero** | Pick up a dropped harpoon gun: 3 bolts, pins a goon to a wall (kill on Easy/Medium), cracks panes, reel pull on a hit. Can ship later; the level works without it. | none |

---

## 9. Art and audio asset list

### 9.1 Cutscene panels (1024x576, `assets/art/panels/aquarium/`)
- `aquarium_intro_01` facade on the sea wall, storm, coupé
- `aquarium_intro_02` in the car, match light, Mags and Elias, Nero between the seats
- `aquarium_intro_03` Elias at the broken staff door, looks back at the car
- `aquarium_intro_04` Elias in the glass tunnel, shark shadow on his face
- `aquarium_intro_05` divers loading a boat, harpoon gun toward the camera
- `aquarium_manifest` the manifest card with the red tuning-fork seal
- `aquarium_kalt_freeze` the finisher freeze frame (Elias under water above Kalt, glass, jellies, red lamp)
- `aquarium_outro_01` Kalt floating in the flooded tunnel, Elias climbing out above
- `aquarium_outro_02` the dark lobby, ringing payphone, wet footprints
- `aquarium_outro_03` coupé on the sea wall, red laser dot on the windscreen
- `aquarium_outro_04` shattered windscreen, Mags hurt, Nero barking
- `aquarium_outro_05` Elias driving, St. Cecilia neon cross ahead

### 9.2 Portraits (512x512, `assets/art/portraits/`)
- Kalt: `kalt_bored` (loading a harpoon), `kalt_amused`, `kalt_sharp` (aiming), `kalt_hurt` (half-drowned), `kalt_bitter` (last smile)
- Elias: `elias_cold`, `elias_silent` (existing; reuse), `elias_wet` (new: soaked hair, for the defeat dialog)
- Teague: `teague_helmet` (bark tag only; small)
- Character references: `art/characters/kalt/ref.png`, `art/characters/teague/ref.png`

### 9.3 Sprites and backdrops (code-drawn palettes or `bg:` layers)
- Goon looks: `diver`, `harpoon`, `smuggler`, `hauler`; elite `teague` (helmet with crack stages); boss `kalt` (coat that flaps, wet variant after phase shift)
- Fauna: reef fish (3 species), moray eel, ray, moon jelly (swim and floor variants), great white shark (2 sizes), small shark
- Backdrops: `bg:aquarium_lobby` (whale skeleton), `bg:aquarium_reef`, `bg:aquarium_rotunda`, `bg:aquarium_pumps`, `bg:aquarium_dock`, `bg:aquarium_tank_far` (deep blue, light shafts)
- Glass: crack overlays (3 stages, 4 variants), shard particles, burst splash sheets, leak spray, puddle decals
- Props: plush shark, snow globe, register, wet-floor sign, dive tank, cash crate, chum bucket, harpoon bolt, boat, hoist pallet, bait cage, catwalk with chains
- 3D-only models (`render3d/models/aquarium/`): the tunnel arch, the jelly cylinder, the boat hull, the catwalk frame, the crane rail

### 9.4 Music (`audio/music/`)
- `aquarium_explore` cello drone, sonar ping, whale-song pad (loop)
- `aquarium_combat` adds muffled kick and toms (stem over the explore loop)
- `aquarium_flood` rising pad, alarm bell motif (Beat 7)
- `aquarium_teague` heavy, slow, chain-rattle percussion (Beat 10)
- `kalt_p1`, `kalt_p2`, `kalt_p3` boss stems (low strings and fog-horn brass; p2 fast toms and wind; p3 drone and heartbeat)
- `aquarium_stinger_slowmo` (bloom and finisher)
- `aquarium_outro` (piano and rain, cut short by the gunshot)

### 9.5 Sfx (`audio/sfx/`)
- Glass: `glass_tink`, `glass_creak`, `glass_crack_1`, `glass_crack_2`, `glass_crack_3`, `glass_burst_small`, `glass_burst_large`, `glass_case_break`
- Water: `water_wave_rush`, `water_splash_small`, `water_splash_body`, `water_wade_step`, `water_swim_stroke`, `water_underwater_loop`, `water_leak_spray`, `water_rise_loop`, `water_drip`, `bubbles_rise`, `breath_gasp`
- Harpoon: `harpoon_prime`, `harpoon_fire`, `harpoon_hit_flesh`, `harpoon_hit_glass`, `harpoon_hit_wall`, `harpoon_reel`, `reel_whine`, `line_cut`
- Sharks: `shark_pass_low` (sub-bass whoosh), `shark_fin_cut` (fin through the surface), `shark_bite`, `shark_ram_glass`
- Environment: `storm_boom` (wave on the outer wall), `building_creak`, `alarm_bell`, `pa_click`, `pa_static`, `sea_gate_open`, `steel_shutter`, `junction_spark`, `hoist_motor`, `chain_creak`, `chain_snap`, `catwalk_tilt`, `cage_release`, `hatch_unlock`, `payphone_ring`
- Props: `plush_squeak`, `snowglobe_smash`, `register_ching`, `dive_tank_hiss`, `bucket_slosh`, `jelly_squish`, `jelly_sting`
- Teague: `helmet_clang`, `helmet_crack`, `helmet_flood`, `lead_boot_stomp`, `anchor_swing`, `anchor_chain_out`
- Cutscene: `match_strike`, `coupe_engine_idle`, `windscreen_shot`, `nero_bark`
- Voice lines (`audio/voice/`): every line id in section 6, plus faction barks (`undertow_sandman_1..4`).
