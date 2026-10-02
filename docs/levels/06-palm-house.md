# Level 6: "The Palm House"

Level plan. Level id: `palmhouse`. Order: 6. Faction: the Blue Choir. Boss: Commissioner Augusta Vane (Bass).

Sources: `docs/story-bible.md` (Level 6, §3-§5) and `docs/architecture.md` §3 (level format) and §4 (boss framework). Terms in `code` refer to the schema and the boss primitives. Items marked **NEW** need engine work (see §8).

Difficulty names and scale are as in the game: Easy (A 1), Medium (A 2), Hard (A 4), Wicked (A 8). Enemy counts are written `E/M/H/W`.

---

## 1. Summary

**Story beat.** Elias wants Vane for the order on Mags ("Silence the bartender. — A.V."). He walks into her winter gala in black tie, with Nero as his "date". In her private office he finds the Basses' plan, "Silent Night". He also finds the smell of cherry pipe tobacco: Bell's tobacco. Nero smells a ghost. Under the great dome, Vane fights him with a riot shield, a shock baton, whistle-called riot squads and snipers outside the glass. After her defeat, Inspector Hale is seen on the phone to the Maestro. Viktor Lenz kills Hale through a glass wall. Hale's notebook names the Meridian Express.

**What the player learns.**
1. The Basses (the Board) planned "Silent Night": kill the Conductor and sell Valmora.
2. Someone smoked cherry tobacco in Vane's office tonight (twist setup, Nero's reaction).
3. Hale was the Maestro's man (the first twist).
4. The Board leaves tonight on the Meridian Express (hook to Level 7).

**Setting.** The Royal Botanic Conservatory, a Victorian glass-and-iron palm house in a park on the edge of the old town. Outside: a snowy park, a limousine drive with a red carpet, a service yard with riot vans, a boiler yard. Inside: the gala ballroom, the private orchid rooms, the curator's office (now Vane's "Private" office), the palm house nave and the great dome.

**Time and weather.** Evening, the first snow of winter. Outside: blue-white snow, wind gusts, breath vapour, footprints. Inside: warm, wet air, gold light, mist at floor level, condensation on the glass. Every door between outside and inside is a temperature cut: cold blue to warm gold.

**Mood.** Rich people in a glass box, warm and safe, while the city freezes. The level starts as a polite party and ends as a demolition. The glass breaks more and more as the level goes on. At the end, snow falls through the broken dome onto the palms. This is the visual statement of the level: the cold comes in.

**Slow-motion set pieces.** Two:
1. **The Drop** (beat 9): a sniper round breaks the skylight under Elias. He falls into the nave in slow motion and fires at the officers below.
2. **The Sniper Volley** (beat 10, the bible's set piece): the dome panes burst in a chain in slow motion while Elias runs under falling glass and snow.

**Length target.** About 10 minutes on Medium (Easy 8, Wicked 12). Boss: about 3 minutes on Medium.

**Music and sound mood.**
- Arrival and ballroom: a diegetic string quartet plays a slow waltz. Outside, it is muffled through glass. The alarm stops it with a bow screech, and the combat stem starts: snare, low brass, batons on shields as percussion.
- Orchid rooms: humid drones, water drips, a soft marimba pulse, mist hiss.
- Office: no music. Only a clock tick and the room tone. A three-note piano phrase from Bell's theme plays once when Nero whines.
- Boiler yard and roof: wind, a cello pulse, distant sirens.
- The Drop and the Volley: music cuts to a heartbeat and high glass sounds pitched down.
- Boss: a military march (snare, brass) under a choir. Whistle blasts sit on the beat.
- Outro: the waltz returns, slow and broken, on one violin.

---

## 2. Sections map

World: `size: { W: 3600, H: 320, groundY: 280 }`. Scale: 22 px = 1 m. Hero height 42 px.

| Section | x-range | In/out | Backdrop | Lighting (`ambient`) | Weather | Camera |
|---|---|---|---|---|---|---|
| `park` | 0-820 | outdoor | Snowy park, bare trees with lights, the gold palm house dome far right, limousines, the red carpet to the portico. City lights and the police HQ across the river. | Cold blue night `[0.42, 0.50, 0.72]`, warm gold spill from the portico and lamps. | Snow, light wind. | `minZoom 0.3, maxZoom 0.6`. Wide on the arrival walk; tighter in the yard fight. |
| `ballroom` | 840-1580 | indoor | Gala hall: cream and gold walls, tall windows to the snowy park, a balcony, two chandeliers, a bandstand. | Warm gold `[0.78, 0.66, 0.48]`. On alarm: the house lights go to half, police strobes (red and blue) flash through the windows. | None. Snow seen through windows. | `bounds [840, 1580]`. A pan to the balcony in the Toast scene. |
| `orchids` | 1600-2100 | indoor | Low glasshouses: orchid cabinets, potting benches, misting pipes, heat lamps, hanging baskets. | Green-gold, humid `[0.55, 0.66, 0.50]`, heat lamps as warm pools. | Floor mist (NEW), drips, condensation. | `minZoom 0.45, maxZoom 0.7`. Closer, more claustrophobic. |
| `office` | 2120-2200 | indoor | The curator's office, now Vane's: a desk, a gun cabinet, a green lamp, a frosted window, a phone. | Low amber `[0.50, 0.40, 0.30]`, one green desk lamp. | None. | Locked: `bounds [2120, 2200]`, zoom 0.75. |
| `boiler` | 2220-2440 | outdoor | Boiler house, chimney with steam, coal heap, iron stairs up the side of the palm house. The lit glass flank of the nave fills the right side. | Cold blue `[0.40, 0.46, 0.66]`, orange boiler-door glow. | Heavy snow, strong wind gusts. | Vertical framing: the camera rises with the stairs (`bounds y` to 40). |
| `nave` | 2460-3000 | indoor (upper band outdoor) | Palm house nave: iron columns, palms, a koi bridge, a gallery, the sloped glass roof. Gantry outside the glass at y 100. | Warm gold-green `[0.66, 0.68, 0.52]`. Snow-blue light falls through broken panes. | Gantry band (y < 104): snow. Below the glass: none, except under broken panes (NEW weather mask). | Starts high on the gantry, then follows the drop down. |
| `dome` | 3020-3600 | indoor | The great dome: a ring of iron ribs, a central fountain, a giant palm, two galleries, statues, Hale's glass office on the east side. | Gold `[0.70, 0.66, 0.50]`; cold blue shafts under each broken pane; sniper lasers as red lines in the mist. | Snow only under broken panes. More snow each phase. | Boss arena: `bounds [3020, 3600]`, zoom 0.45 so the dome panes stay in frame. |

**Door transitions.** `park` -> `ballroom`: kitchen door at x 820. `ballroom` -> `orchids`: the "Private" door at x 1580. `orchids` -> `office`: x 2100. `office` -> `boiler`: back door at x 2200 (cold cut). `boiler` -> `nave`: the roof door at the top of the iron stairs (x 2440, y 100), onto the gantry. `nave` -> `dome`: the iron gate at x 3000 (locked until the mini-boss falls).

**ASCII side view** (1 char = 40 px; y not to scale; `~` snow, `/\` glass, `=` platform, `|` door/wall, `*` sniper nest off-screen).

```
 *nest W (water tower)                                                         *nest E (trees)          *nest N
 ~  ~   ~    ~   ~    ~  ~                                ~  ~ ~   ~  ~ ~ ===gantry===  /\/\/\/\/\/\/\/\/\/\/\/\
   ~   ~   ~   ~    ~   ~         .chandelier.  .chand.          ~ chimney  /\/\/\/\/\/\/\ /   great dome panes   \
  ~ trees  ~  ~   ~  ~  ~  ~      [ balcony====== ]   /\/\/\/\/\/\  ~ |# ~  /  palms   [gallery==]  [gal==] (o) [==gal]
 limo  limo  hedge  van   van  |  champ  swan  piano |  benches  cab |off| coal stairs/ bridge  palm |gate| statue fountain statue |Hale|
 ~~~red carpet~~~ |shed| cash bags |  tower  tower    | ==== ==== [] |desk| heap  /|   ___      iron  |    |       ~~~~       [glass]
=======================================|=================|=============|====|=======|=======================|===========================|
0          300          560         820 840            1580 1600      2100 2200  2440                       3000 3020      3310      3600
  park (snow)                          ballroom (warm)    orchids(mist) office boiler   nave (warm, sniper run)      dome (boss arena)
  b1 First Snow | b2 Service Yard      b3 Toast b4 Brawl  b6 Orchid     b7    b8 roof  b9 Drop b10 Volley b11 Door  b12 Vane  b13 Hale
                                       b5 Shield Wall     Rooms         Smoke
```

---

## 3. Encounter flow

Thirteen beats. Times are for Medium.

### Beat 1: "First Snow" (x 0-300, `park`), about 0:40

- **Enemies:** none. 8 guests (NEW civilians) walk right along the red carpet in furs and tuxedos. Two police officers stand at the portico in the back lane (not hostile).
- **Props and pickups:** a waiter with a tray at x 180 (the hero can take a champagne bottle; it goes into the pocket and teaches pocketing). Limousines (vehicle ledges). Snow on everything.
- **Environment:** snow, breath vapour, footprints. Nero walks at heel. Run is allowed; attacks are allowed but no target exists.
- **Start:** level start, after opening panels 1-2.
- **End:** `heroX >= 300`. Nero tugs toward the service gate in the hedge; a caption says: "The front door had a metal detector. The back door had two cops and someone else's money."
- **Why it is exciting:** a calm, beautiful start. The player sees the gold dome far right: the destination. The contrast makes the later wreck hit harder.

### Beat 2: "Service Yard" (x 300-820, `park`), about 0:50

- **Enemies (wave `yard`):** officers load bags of cash marked *Club Noir* into a riot van (the money Mags saw).
  - E: 1 baton, 1 detective (brawler). M: 2 baton, 1 detective. H: 2 baton, 1 detective (knife), 1 pistol. W: 2 baton, 2 detective (knife), 1 pistol.
- **Props and pickups:**
  - 2 riot vans (x 470, 700; roof ledges at y 236).
  - Cash bags (lift and throw, x 520-560).
  - Groundskeeper shed (x 600): an **axe** on a wall rack (pickup `axe`, `stand: 'rack'`). A snow shovel and a rake as throwable objects.
  - A snowy statue of a botanist (x 400, cover).
  - Van 2 has a rear window pane (`hp 20`). Behind it: a **shotgun** (E/M) or an ammo box (H/W).
- **Environment:** blood on snow stays bright and fades slowly (NEW, small). A lamp post can be hit to drop its snow on a goon (visual only).
- **Alarm rule (NEW alarm flag):** if a pistol fires, or if any goon lives 12 s after he first sees the hero (he uses his radio), set `alarm: true`. With the alarm, beat 3 skips to panel 5 only, the guests are already running, and beat 4 adds 1 shield officer.
- **Start:** `heroX >= 300`.
- **End:** wave `yard` killed and `heroX >= 800`. Then the transition through the kitchen door into the ballroom.
- **Why it is exciting:** first blood on white snow. The player has a reason to fight fast and quiet. The cash bags tie the police to Club Noir.

### Beat 3: "The Toast" (x 840-1580, `ballroom`), about 0:30, in-engine plus panels

- **Enemies:** none hostile yet. 12 guests, 4 waiters, the quartet on the bandstand, 6 officers along the walls (they become wave `b1a`).
- **Script:** the hero enters from the kitchen with Nero. Control stays on, walk only (run is allowed but guests block). At `heroX >= 1000` or after 20 s: the camera pans to the balcony; panel 3 (the toast). Nero runs to the *Private* door at x 1560 and paws it; panel 4. Vane sees Elias; panel 5. 
- **Alarm:** the quartet stops (bow screech). House lights fade to half, police strobes start outside. Guests scream and flee to the two exits (kitchen door x 840, portico door in the back wall at x 1000). Waiters drop trays: 6 bottles on the floor (pocketable).
- **Why it is exciting:** the player is inside the enemy's party. The tension of a crowd that does not know yet, then the moment it knows.

### Beat 4: "Ballroom Brawl" (x 840-1560, `ballroom`), about 1:20

- **Enemies:** two sub-waves. `b1b` spawns when `b1a` has 1 alive. Pistol officers take the balcony.
  - `b1a`: E 2 baton, 1 detective. M 3 baton, 1 detective. H 3 baton, 2 knife detective. W 4 baton, 2 knife detective.
  - `b1b`: E 1 pistol (balcony). M 2 pistol (balcony). H 2 pistol (balcony), 1 baton. W 3 pistol (2 balcony, 1 floor), 1 baton, + 1 shield if `alarm` was set early.
- **Props and pickups:**
  - 3 champagne towers (x 960, 1120, 1460) (NEW prop): a hit or a thrown body shatters a tower. Glass shards and a wet, slippery zone (8 s, NEW friction zone) spread 60 px. Goons that run in it slip and fall.
  - 2 chandeliers (x 1000, 1300; chain at y 60) (NEW prop): hit the chain from the balcony, or shoot it. A shadow mark shows on the floor for 1.0 s, then the chandelier falls: 50 damage in 50 px, then it stays as a low obstacle.
  - Ice swan sculpture (x 1240): heavy object; lift and throw; it knocks down anyone it hits, including shield officers.
  - Buffet tables (x 900-980 and 1500-1560, platform y 252), grand piano on the bandstand (x 1400-1480, platform y 248; cover from balcony fire).
  - "Police Honour Guard" display under the balcony (x 1180): a dress sabre (pickup `katana`, `stand: 'rack'`).
  - 1 bandage on the buffet (x 1530).
- **Environment:** fleeing guests block pistol lines. On E/M, pistol officers hold fire when a guest is in line. On H/W they fire anyway (and a hit guest falls, crawls, gets up and runs; no deaths). The balcony is reachable by the grand stairs at each end (x 1160 and 1440) and by ledge climbing from the piano.
- **Start:** end of beat 3.
- **End:** `b1a` and `b1b` killed.
- **Why it is exciting:** a fight in a crowd, in black tie, among champagne and crystal. The room is a toy box: towers, chandeliers, a swan. The balcony adds height and a gun line.

### Beat 5: "Shield Wall" (x 1300-1560, `ballroom`), about 0:50

- **Enemies (wave `shields`):** the main doors (x 1400, back wall) slam open. The first riot squad enters. This is the teaching beat for shields (§4).
  - E: 1 shield (alone), then 1 baton. M: 1 shield alone, then a phalanx of 2 shield + 1 pistol behind. H: phalanx of 2 shield + 2 pistol. W: phalanx of 3 shield + 2 pistol + 1 baton.
- **Props:** the ice swan (if not used) and 2 planters on castors (push boxes, x 1350 and 1500). The balcony above lets the hero drop behind the line.
- **Hint toast** (first shield only, E/M): "Shields block the front. Go around, go over, or break it."
- **Start:** `b1b` killed.
- **End:** wave `shields` killed. The Private door unlocks; Nero scratches it; the hero kicks it open; transition to `orchids`.
- **Why it is exciting:** a new enemy shape that the player must read and solve in motion. The first phalanx looks like a wall; the player learns three ways through it.

### Beat 6: "The Orchid Rooms" (x 1600-2100, `orchids`), about 1:20

- **Enemies:** two waves. Some officers have grabbed tools from the potting sheds: the **billhook officer** (machete reskin, pruning hook).
  - `o1` (x 1600-1840): E 2 baton, 1 billhook. M 3 baton, 1 billhook, 1 pistol. H 2 baton, 2 billhook, 1 shield, 2 pistol. W 3 baton, 2 billhook, 2 shield, 2 pistol.
  - `o2` (x 1840-2100), spawns at `heroX >= 1840` or `o1` killed: pistol officers stand behind glass orchid cabinets and fire through the glass. E 1 pistol, 1 baton. M 2 pistol, 1 shield, 1 baton. H 2 pistol, 2 shield, 1 baton. W 3 pistol, 2 shield, 2 baton.
- **Props and pickups:**
  - 3 glass orchid cabinets at fight-lane depth (x 1720, 1860, 2000; `hp 30`) (NEW blocking glass): they block movement until broken. Bullets crack them; 2 shots break them. A thrown goon breaks them at once.
  - Potting benches (platforms y 246) at x 1640-1700, 1780-1840, 1940-1990. A gardener's walkway (platform y 196, x 1760-2040) under the hanging baskets.
  - Terracotta pots (throwable), fertiliser cans (pocketable), watering cans (throwable).
  - Misting pipes (x 1680, 1900) (NEW hazard): a hit bursts a pipe; hot steam fills a 50 px zone for 1.5 s; goons inside are blinded (no attacks) and take 6 damage.
  - A rake on the floor (x 1800) (NEW, optional): a goon who walks on it is hit in the face and staggers 1 s. The hero who walks on it takes the same.
  - "In case of fire" box (x 1940): an axe (if the shed axe was not taken, the box holds an ammo box instead).
  - 1 bandage (x 2060).
- **Environment:** floor mist hides low attacks and the feet of goons (fair telegraphs stay: weapon glints show above the mist). Nero runs ahead along the scent trail and waits at the office door (x 2100), whining.
- **Start:** transition into `orchids`.
- **End:** `o2` killed. The office door unlocks.
- **Why it is exciting:** close fights in fog and glass. Every wall can shatter. Steam pipes and pots make the room a weapon. Nero's scent trail pulls the player forward.

### Beat 7: "Cherry Smoke" (x 2120-2200, `office`), about 0:40, breather

- **Enemies:** none.
- **Script (in-engine):**
  1. Nero circles the desk, nose up, whines, then sits and stares at an empty chair. A crystal ashtray holds still-warm pipe ash and the lid of a cherry tobacco tin. A Bell & Sons desk clock ticks (not stopped; the stopped clock is in the boss arena).
  2. Interact with the desk (NEW inspect): an insert panel shows a folder stamped *SILENT NIGHT: Board eyes only*. The hero now knows the name.
  3. The desk phone rings (NEW answer-phone interact). Hale's call (§6). 
- **Pickups:** gun cabinet (break the glass, `hp 10`): **shotgun** (`stand: 'rack'`). Bandages: E/M 2, H/W 1. 1 ammo box.
- **Start:** transition into `office`.
- **End:** dossier read and phone answered. The back door (x 2200) unlocks.
- **Why it is exciting:** silence after noise. The story's two big setups land here: the name "Silent Night" and the cherry tobacco. The phone call is a small, cold doubt about Hale.

### Beat 8: "Boiler Yard" (x 2220-2440, `boiler`), about 0:50

- **Enemies (wave `yard2`):** the first **sniper dots** (§4). One officer is a **spotter** (radio, binoculars, red armband).
  - E: 2 baton; 1 dot, slow lock. M: 1 shield, 2 baton, 1 spotter; 1 dot. H: 2 shield, 1 baton, 1 spotter; 2 dots. W: 2 shield, 2 baton, 1 spotter; 2 dots, fast lock.
- **Props and pickups:** coal heap (platform y 250, x 2260-2320), coal shovel and barrels (throwable), the boiler house overhang (x 2240-2320: sniper cover), the underside of the iron stairs (cover). 1 ammo box at the boiler door.
- **Environment:** the stairs up the palm house flank (x 2340-2440, three flights, top at y 100). Wind gusts push snow sideways; the dots look like red sparks in the snow. Laser lines show in the falling snow.
- **Hint toast** (first dot): "Red dot: keep moving, or get under cover."
- **Start:** transition into `boiler`.
- **End:** wave `yard2` killed, then the hero walks through the roof door at the top of the stairs (transition to the gantry in `nave`).
- **Why it is exciting:** the player learns the sniper threat in a small, clear space with obvious cover before the big sniper set pieces.

### Beat 9: "The Drop" (x 2460-2640, `nave` gantry at y 100, then the floor), about 0:20

- **Enemies:** on the gantry (M+): M 1 shield. H 1 shield, 1 baton. W 2 shield. Below on the nave floor (seen through the glass): E 2, M 3, H 3, W 4 baton/pistol mix (wave `drop`).
- **Script:**
  1. The hero walks the gantry outside the glass in the snow. Below, the warm nave and the officers are visible through the roof panes.
  2. 2 dots search, then lock on him. At x 2600 the gantry ends on a skylight pane (NEW walkable pane, `hp 1` to sniper fire). A sniper round breaks it.
  3. **Slow motion** (NEW trigger action `slowmo`: `timeScale 0.25` for 1.6 s real time): the hero falls 180 px among hanging shards and snowflakes. The player can aim and fire the shotgun or any gun in the air. If he holds the axe, he can do the axe plunge on a goon below. Unarmed: a flying kick on landing.
  4. He lands with an automatic roll.
- **Start:** `heroX >= 2600` on the gantry, or any gantry pane breaks.
- **End:** wave `drop` killed.
- **Why it is exciting:** the Max Payne moment. The cold outside drops into the warm inside in one long, slow fall.

### Beat 10: "The Sniper Volley" (x 2640-2960, `nave`), about 0:50

- **Enemies (wave `volley`):** snipers from 2 nests, plus a riot squad in the path.
  - E: 2 baton, 1 shield; 1 dot. M: 2 baton, 2 shield, 1 spotter (gallery); 2 dots. H: 2 baton, 2 shield, 2 pistol (gallery), 1 spotter; 2 dots. W: 3 baton, 3 shield, 2 pistol, 1 spotter; 3 dots.
- **Set piece:** at `heroX >= 2700` both nests fire a scripted volley. 6 roof panes burst in a chain from left to right, 0.15 s apart. Slow motion `timeScale 0.35` for 2 s with full control. Each pane shows a frost-white floor mark 0.9 s before its shards land. Snow pours in through the holes. The player runs under the falling glass to the gallery (cover).
- **Props and pickups:**
  - Iron gallery (platform y 190, x 2700-2860; reach by a spiral stair at x 2680 or by ledge climb). The gallery floor is sniper cover for anyone under it.
  - Palm canopies (x 2560, 2780, 2920): partial cover (dot lock time x2 under them).
  - Koi bridge (platform y 262, x 2560-2640).
  - 2 planters on castors (push boxes, x 2740 and 2880): mobile cover; they also knock down shield officers when pushed into them at run speed.
  - Botanist statue (x 2820) (NEW topple prop): push it to topple; it falls in the push direction and deals 60 damage in its length (70 px). Then it is low cover.
  - **Machine gun** on the gallery (x 2820, an open riot-squad crate, `stand: 'bench'`).
  - 1 bandage under the gallery (x 2760).
- **Start:** `heroX >= 2640` after wave `drop`.
- **End:** wave `volley` killed and `heroX >= 2900`. Then the mini-boss intro.
- **Why it is exciting:** the screen is full of motion: red lines, glass, snow, shields. The player must keep moving and choose cover, guns and targets fast.

### Beat 11: "The Door" (x 2820-3000, `nave`), mini-boss, about 1:10

- **Enemy:** **Sergeant Ruud Brandt, "the Door"**, Vane's riot sergeant (elite, built on `defineBoss`, §4). Crew: M+ 1 baton every 20 s while he "holds the line". H/W: 1 sniper dot.
- **Arena:** locked between walls at x 2820 and the iron gate at x 3000. The gallery end (x 2860, y 190) lets the hero drop behind him.
- **Props:** 1 planter, the toppled statue (if used), shards on the floor.
- **Start:** `heroX >= 2900` and wave `volley` killed. Bark dialog (§6).
- **End:** Brandt defeated. He drops his **shotgun** and the gate key. The gate opens.
- **Why it is exciting:** a clean one-on-one test of every shield lesson before the boss, and a big body to break.

### Beat 12: "Order and Silence" (x 3020-3600, `dome`), boss, about 3:00

Commissioner Vane. See §5.

### Beat 13: "The Informant" (x 3480-3600, `dome`), outro, about 0:40

- **Script (in-engine, then panels):** Vane falls. The sniper dots go out one by one; the radio says: "Commissioner down. Pull out." Nero runs to Hale's glass office (x 3520) and growls. The hero walks to the glass. End panels 1-5 (§6).
- **End:** `run:over` with result `win`; the results card.
- **Why it is exciting:** the victory turns cold. The man who guided the player all game dies in front of him, and the player sees the killer from the next level.

---

## 4. New enemy variants: the Blue Choir

Look: navy dress uniforms with silver buttons (ballroom), navy riot armour with visored helmets (riot squads), snow on the shoulders outside. A tiny silver tuning fork pin on every collar (red-tinted in panels).

| Role id | Name | Base | Weapon | Spec |
|---|---|---|---|---|
| `shield` | Riot officer | NEW role | Clear riot shield + baton | HP 70, speed x0.7, cannot jump to ledges. Moves: `shieldBash` (shove, 8 dmg, knockback 30 px, breaks the hero's combo), `overhead` (baton over the shield, 14 dmg), `advance` (step 12 px every 0.6 s, shield up). When the shield breaks, he becomes `baton`. |
| `baton` | Officer | `pipe` reskin | Extendable baton | As pipe. Snaps the baton open on spawn (sound cue). |
| `pistol` | Officer | `pistol` reskin | Service pistol | As pistol. Kneels behind a shield officer when one is within 40 px (fires over the shield). Holds fire if a civilian is in line (E/M only). |
| `detective` | Plainclothes detective | `brawler` / `knife` reskin | Fists or a flick knife | Trench coat over black tie. Ballroom and yard only. |
| `billhook` | Officer with a pruning hook | `machete` reskin | Billhook | Orchid rooms only. |
| `spotter` | Spotter | `pistol` variant | Pistol + radio + binoculars | Red armband, radio aerial. While alive, all dots in his section lock 30% faster. On his death, one dot in the section goes out for 10 s. |
| sniper | Sniper (off-screen) | NEW emitter, not an actor | Rifle with laser | See below. |

### Shield rules (must be fair and readable)

**What the shield blocks.** All frontal hits on the officer's facing side, high and mid. A blocked hit makes sparks and a "thunk" and does no HP damage. It does shield damage:

| Hit | Shield damage |
|---|---|
| Light punch or kick | 0 (sparks only) |
| Heavy punch or kick | 25 |
| Katana heavy / finisher | 35 |
| Axe heavy | 60 |
| Flying kick | 50, and pushes the officer back 40 px |
| Pistol or MG bullet | 10 each (cracks show) |
| Shotgun blast, within 66 px (3 m) | 60 |
| Shotgun blast, farther | 20 |
| Thrown heavy object (ice swan, planter, body, statue) | 100 and knockdown |
| Sniper round | 120 |

Shield HP: E 80, M 120, H 140, W 160. The shield shows cracks at 50%. At 0 it shatters (glass sound, pieces) and the officer is stunned 1.2 s.

**How to bypass a shield.**
1. **Hit the back.** Hits from behind do full damage and stagger. The officer needs E 0.6 / M 0.45 / H 0.35 / W 0.25 s to turn.
2. **Jump or roll over or past.** A shield officer cannot hit upward. A jump over him, or a drop from a balcony or gallery behind him, gives the back. A dodge roll passes a lone officer (not a phalanx).
3. **Sweep a lone officer.** A sweep trips a lone shield officer. He falls and the shield drops for 1.5 s. In a phalanx, a neighbour braces him and the sweep does nothing.
4. **Knock him down with a heavy object.** See the table.
5. **"Nero, hold!"** (if the assist is on): Nero bites the shield arm and pulls the shield down for 2 s.
6. **Let the snipers do it.** A sniper round that hits a shield deals 120. Lure a dot onto a shield officer.

**Phalanx.** Two or three shield officers within 40 px of each other line up and move as one. A pistol officer kneels behind. The phalanx turns as one (slow: +0.3 s). Break it by flanking from above, by a thrown heavy object (knocks down the first man, the next one staggers), or by breaking the front shield.

**Placement rules for designers.**
1. Never place a shield officer where the hero has no bypass. Every shield encounter needs at least one of: 110 px of headroom to jump over, a throwable heavy object within 120 px, or a platform that lets the hero drop behind.
2. The first shield officer of the level is alone (beat 5). Phalanxes come only after that.
3. Max 3 shields in one phalanx. Max 2 phalanxes alive at once (W only).
4. On Easy, a sniper dot and a shield officer are never active within 200 px of each other.
5. Shield officers do not spawn on the gantry on Easy.
6. A riot squad always enters from a door the player can see (doors flash blue and a whistle sounds 1 s before).

### Sniper rules (off-screen emitter, NEW)

- **Nests** are fixed points outside the screen: `{ id, x, y }` with y above the top (for example y -400). The shot travels on the straight line from the nest to the dot.
- **States:**
  1. `search` (1.2 s): a dim dot wanders near the hero.
  2. `track`: the dot follows the hero with a 0.35 s lag, max speed 180 px/s.
  3. `lock` (E 1.2, M 0.9, H 0.75, W 0.6 s; scaled `t / sqrt(A)` from a base of 1.2 s and a floor of 0.6): the dot stops and gets bright. A rising beep plays.
  4. `fire`: a distant crack. The round hits the first actor (hero, goon, Vane, shield) inside ±6 px of the dot. It deals 30 (E 20, W 35) and a knockdown.
  5. `cooldown` 2.5 s.
- **Cover:** if an opaque surface (gallery, roof girder, overhang, statue, planter) is on the line from the nest to the dot, the dot cannot lock; it shows a small "blocked" flicker. Palm canopies double the lock time.
- **Glass:** each round crossing a roof pane cracks it (+1 crack). A pane breaks at 2 cracks (§5 shards).
- **Dodge:** a roll during `lock` moves the hero 60 px; the dot keeps its locked place, so the round misses. This is the main skill.
- **Visuals:** the red dot on floor, walls and bodies; a thin red line visible only where it crosses snow, mist or steam. In 3D, a volumetric red beam from the sky through the glass.
- **Limits:** max dots active at once, by difficulty: E 1, M 2, H 2, W 3. Indoors under intact glass and outside cover, the line is always visible through the roof.

### Mini-boss: Sergeant Ruud Brandt, "the Door"

- Look: a huge man in riot armour, a full-height tower shield with a gun slot, a combat shotgun.
- Stats: HP E 300 / M 380 / H 440 / W 520. Shield: frontal immune (no shield HP; it cannot break). Speed x0.8.
- Moves:
  - `string`: bash, bash-overhead (baton). Telegraph: shield shifts back.
  - `charge` (shield charge): windup 0.6 s, v 190, wall stun 1.6 s. He drops the shield on a wall stun; the shield stays down 1.6 s.
  - `slotShot` (shotgun through the slot): the slot opens with a glint and a click, 0.5 s; a 70 px cone, 22 dmg. After 2 shots he reloads: 1.4 s with the shield lowered (punish window).
  - `holdLine`: he plants the shield and calls 1 baton officer (M+), every 20 s.
- Weak points: his back; the reload; the wall stun. The gallery end at x 2860 lets the hero drop behind him.
- On H/W, 1 sniper dot is active; a round that hits Brandt from above deals 40 and knocks his helmet off (he is stunned 1 s).

---

## 5. The boss: Commissioner Augusta Vane

### 5.1 Arena: the great dome (x 3020-3600)

```
 y 30-60    [p1][p2][p3][p4][p5][p6][p7][p8][p9][p10]   10 dome panes (kind 'roof'), 52 px each, x 3040-3560
                         (lantern, chain at y 70, x 3310)
 y 176   [W gallery=======]                         [=======E gallery]   x 3040-3150 / 3470-3580
                                                        [CLOCK 3:17]
 y 232      [planter]   statue       ( fountain )      statue  [planter]  [Hale's glass office, back lane]
 y 256                              [===rim===]
 y 280 |gate|=====================================================================|east door|
        3020    3120     3200      3280  3310  3340    3420    3500       3540    3580   3600
                          <------- wet ring 3240-3380 ------->
```

- **Doors for riot waves:** the west gate (x 3030, locked behind the hero) and the east door (x 3590). Each door flashes blue and plays a whistle 1 s before a squad comes in.
- **Galleries:** west (x 3040-3150) and east (x 3470-3580), y 176. Reach by ledge climbing from the planters (x 3120 and 3500, top y 232). The galleries are sniper cover for the floor below them. Pistol officers take the galleries.
- **Fountain:** x 3280-3340, rim platform y 256. Around it, a **wet ring** (x 3240-3380) that conducts the shock baton (NEW wet zone).
- **Statues:** "Flora" at x 3200, "Pomona" at x 3420. Each can topple once (push), 60 damage on its length. A standing statue is sniper cover and a wall for Vane's charge.
- **Iron columns:** x 3160 and 3460. Walls for the charge (wall stun).
- **Lantern:** the iron dome lantern on a chain at x 3310 (phase 3 hazard).
- **Hale's office:** a lit glass office in the back lane at x 3500-3580 (pane `kind: 'window'`, depth -30). Dark in phase 1. In phase 2 a lamp switches on and a silhouette in a hat is on the phone. Nero barks at it during the fight (the hero cannot reach it).
- **Bell & Sons clock**, stopped at 3:17, on the east gallery rail above Hale's office door (bible rule: one in every boss lair).
- **Pane rows:** 10 dome panes, `hp 2` cracks each. A broken pane drops its shards on its floor mark and lets snow fall in its column. Under each broken pane, a **melt zone** (wet, 40 px) appears after 4 s and joins the shock rules.

### 5.2 Boss definition (maps to §4.1)

```js
export default defineBoss({
  id: 'vane', name: 'Augusta Vane', title: 'Commissioner of Police', look: 'vane',
  stats: { hp: 960, s: 1.15, m: 5, speed: 25, reach: 24, dmg: 18, heavyDmg: 28, poise: 40, windup: 0.4, cd: [0.8, 1.5] },
  shield: { hp: 320, front: true, dropOnWallStun: 1.8, retrieve: true },          // NEW boss sub-state
  intro: { walkTo: 'arena.x0+380', spotlight: false, dialog: 'vane_intro', t: 1.6 },
  moves: {
    string:   string({ combos: [['jab', 'jab', 'bash'], ['overhead'], ['bash', 'overhead'], ['jab', 'lowSweep']] }),
    charge:   charge({ windup: 0.6, v: 200, maxT: 1.0, wallStun: 1.8 }),          // shield charge
    whistle:  summon({ windup: 0.8, interruptible: true, wave: 'phaseWave' }),     // whistle-called riot squad
    mark:     hazard('sniperDot', { n: 'phase', lockT: 1.2, windup: 0.5 }),        // "Mark!"
    arrest:   grab({ range: 26, windup: 0.5, hold: 1.2, follow: 'sniperLockOnHero', struggle: true }),
    shock:    hazard('shockZone', { windup: 0.7, t: 0.6, dmg: 16, stun: 0.8, zones: 'wet' }),
    revolver: volley({ proj: 'bullet', n: 3, gap: 0.3, windup: 0.45 }),            // phase 3 only
    roar:     roar({ t: 1.2 }),                                                     // long whistle
  },
  phases: [
    { id: 1, name: 'Order',
      moves: { string: 3, charge: 1, mark: 1 },
      big: { every: [18, 24], pick: { whistle: 1 } } },
    { id: 2, name: 'Open Fire', enter: { hpBelow: 0.65 },
      onEnter: ['roar', { cd: [0.7, 1.3] }, 'gimmick:volley(4)', 'gimmick:haleLight'],
      moves: { string: 3, charge: 1, mark: 2, arrest: 1, shock: 1 },
      big: { every: [14, 20], pick: { whistle: 1 } } },
    { id: 3, name: 'Silence', enter: { hpBelow: 0.30 },
      onEnter: ['gimmick:shieldSplit', 'gimmick:lanternDrop', { speed: 30, cd: [0.5, 1.0], windup: 0.32 }],
      moves: { string: 3, revolver: 2, shock: 1, arrest: 1 },
      big: { every: [10, 12], pick: { 'gimmick:blindVolley': 1 } } },
  ],
  crew: { every: null, max: 'diff', alive: 'diff', roles: ['shield', 'baton', 'pistol'], only: 'summon' },
  secondWind: { afterKOs: 2, clearCrew: true },
  gimmick: palmHouseDome,     // panes, sniper nests, floor marks, wet zones, snow mask, lantern, Hale light
});
```

### 5.3 Phases and move list

**Phase 1, "Order" (100% to 65%).** Vane fights behind the shield. She is slow and controlled. She lets the riot squads and one sniper do the work.

| Move | What happens | Telegraph (`{ t, pose, mark, floor, light, cue }`) | Punish |
|---|---|---|---|
| `string` | Baton jabs, shield bash, overhead, low sweep. Shield stays up between hits. | 0.3-0.4 s; baton raised or shield pulled back; `cue: 'baton_whoosh'`. | Back hits only. After the 3rd hit of a string she holds 0.5 s. |
| `charge` | Shield charge across the arena. | 0.6 s; she ducks behind the shield, boots scrape; floor arrow along her path; `cue: 'whistle_short'`. | Jump over or roll aside. If she hits a column, statue or wall: stunned 1.8 s and the shield falls. Full damage on her. The hero can pick up the dropped shield and throw it at her (100 dmg, knockdown). If he does not, she picks it up after the stun. |
| `whistle` | She blows the whistle: a riot squad comes in through a door. | 0.8 s; whistle to the lips, arm up; the chosen door flashes blue; `cue: 'whistle_inhale'`. | **Any hit during the windup cancels it** (no squad, 0.6 s stagger). This is the key aggressive play. |
| `mark` | She points the baton at the hero: "Mark!" 1 dot (E/M/H) or 2 (W). | 0.5 s point pose; then the normal dot states. | Roll on lock. Lure the dot onto her: if the round hits her back during a recover state, 60 damage, knockdown. |

Whistle waves (phase 1): E 2 baton; M 1 shield + 1 baton; H 2 shield + 1 pistol; W 2 shield + 2 pistol.

**Phase 2, "Open Fire" (65% to 30%).**

- **On enter:** a long whistle (`roar`, 1.2 s, hero pushed back). She shouts: "Open fire! Bring the roof down on him!" Scripted **volley(4)**: 4 panes burst at once over the hero's half of the arena. `timeScale 0.5` for 1.5 s. Floor marks show 0.9 s before each shard group lands (14 dmg each, knockdown). Snow falls into the arena from now on. Hale's office light switches on (`haleLight`).
- **New moves:**
  - `arrest` (grab): she hooks the baton round his neck and slams him to the floor (10 dmg). "Mark him!" A dot locks on the pinned hero (1.2 s). The player mashes to struggle free (E 3 presses, M 5, H 6, W 8). Free: the round hits the floor; Vane staggers back 0.8 s (punish). Not free: 30 damage. Telegraph: 0.5 s, she reaches forward with the baton crook, `cue: 'cuffs_rattle'`. Counter: roll or jump during the windup.
  - `shock`: she stabs the baton into a wet zone (the fountain ring or a melt zone). Every wet zone she touches flashes. After the telegraph, 16 damage and a 0.8 s stun to anyone on it, goons included. Telegraph: 0.7 s, baton crackles blue, the wet zone outlines flicker blue, `light: 'blue_pulse'`, `cue: 'shock_charge'`. Counter: jump, stand on dry floor, the fountain rim or a gallery. Punish: her baton is stuck for 1.0 s after.
  - `mark` now places 2 dots (E 1, W 3). Missed rounds crack panes; more panes fall over time.
- Whistle waves (phase 2): E 1 shield + 1 baton; M 2 shield + 1 pistol; H 2 shield + 2 pistol; W 3 shield + 2 pistol.

**Phase 3, "Silence" (below 30%).**

- **On enter (`shieldSplit`):** if the shield still has HP, a sniper round splits it (scripted friendly fire). Vane: "Hold fire! HOLD FIRE!" Then: "Fine. I'll do it myself." She drops the shield and the whistle, and draws a service revolver. No more whistles. Crew still alive keeps fighting.
- **`lanternDrop`:** the snipers shoot the lantern chain. A 2.0 s floor mark at x 3310 (60 px). The iron lantern falls (40 dmg) and stays: a solid obstacle in the centre (a wall for wall-stuns and sniper cover).
- **Moves:** faster `string` (baton only, no shield, so the front is open), `revolver` (3 shots, 0.3 s apart, 12 dmg each; telegraph 0.45 s: hammer click and muzzle glint, never a red dot, so it reads apart from the snipers), `shock`, `arrest`. After the 3rd shot she reloads: 1.4 s punish window.
- **`blindVolley`** (big move, every 10-12 s): the snipers fire blind. A row of dots (E 3, M 4, H 5, W 6) appears across the floor 60 px apart and locks together (0.8 s, `t / sqrt(A)`). The gaps are safe. A roll through a gap is the answer. Vane uses this time to reload or move.

### 5.4 Crew rules

- Crew spawns **only** through `whistle` (phases 1-2). No timer spawns.
- Max alive: E 2, M 3, H 4, W 5. Total crew for the fight: E 8, M 12, H 16, W 20. A whistle at the max still plays its telegraph but brings no one (Vane stays open for 0.8 s).
- Pistol officers go to the galleries (one per gallery). Shield officers move between Vane and the hero.
- H/W only: when Vane is in a recover state and a shield officer is within 60 px, he steps in front of her (an "escort").
- Snipers fire at the locked spot regardless of who is there. Vane's AI steps off any dot she sees, except when stunned or grabbing. Crew does not avoid dots on H/W (the player can use them).
- `secondWind`: after the hero's 2nd K.O., all crew is cleared (as Malaspina).

### 5.5 Difficulty scaling

| Item | Easy | Medium | Hard | Wicked |
|---|---|---|---|---|
| Vane HP | 760 | 960 | 1080 | 1200 |
| Shield HP | 240 | 320 | 380 | 440 |
| Telegraph time | base / sqrt(A) for all telegraphs, with floors (charge 0.4, whistle 0.5, shock 0.45) |||
| Dots per `mark` | 1 | 1 (2 in ph2) | 2 | 2 (3 in ph2) |
| Dot lock | 1.2 s | 0.9 s | 0.75 s | 0.6 s |
| Shard damage | 10 | 14 | 16 | 18 |
| Arrest struggle presses | 3 | 5 | 6 | 8 |
| Crew alive / total | 2 / 8 | 3 / 12 | 4 / 16 | 5 / 20 |
| Escort behaviour | no | no | yes | yes |
| K.O. rule | as game | as game | as game | a K.O. ends the run |

### 5.6 Punish windows (summary)

1. Charge into a column, statue, wall or the lantern: 1.8 s, shield down. Throw her own shield at her.
2. Whistle windup: any hit cancels it.
3. After a struggle escape from `arrest`: 0.8 s.
4. After `shock`: 1.0 s, baton stuck.
5. Phase 3 reload after 3 revolver shots: 1.4 s.
6. A sniper round that hits her: knockdown, 1.5 s.

### 5.7 Defeat sequence

1. The last hit triggers the boss finisher freeze frame (slow motion, then a still). Her medals tear off and hang in the air with the snow.
2. She falls to her knees in broken glass under the hole in the dome.
3. The sniper dots go out one by one. Radio: "Commissioner down. Pull out. Pull out."
4. Remaining crew drops weapons and kneels (they do not run; they are police, and they wait for the next owner).
5. Outro: end panel 1, then the Hale scene (§6).

---

## 6. Cutscene and dialog script

Caption style as the bible: yellowed boxes for VO, white balloons for dialogue, red tint on Choir symbols.

### 6.1 Opening panels, part A (level start, `palmhouse_intro`)

| # | SHOT | TEXT |
|---|---|---|
| 1 | Wide. The glass palm house glows gold in a snowy park. Limousines arrive. Guests in furs climb red-carpet steps. Police at the portico. | VO: "First snow. The owners of the city, in their glass house, warm as summer." |
| 2 | Medium. The hero in his black suit, snow on his shoulders, among the guests. A waiter offers champagne. Nero is with him, off the leash, head high. | VO: "Nobody stops a man in black tie. Nobody stops a dog with his eyes." |

### 6.2 Opening panels, part B (ballroom entry, `palmhouse_toast`; after the alarm, only panel 5)

| # | SHOT | TEXT |
|---|---|---|
| 3 | The ballroom balcony. **Commissioner Vane** (silver hair, dress uniform, medals) raises a glass. Policemen line the walls. A red wax seal on the programme in a guest's hand. | VANE: "To a safer Valmora. And to silence, which is the beginning of order." |
| 4 | Close-up. Nero lifts his nose at a door marked *Private*, whining and pawing. | VO: "Cherry tobacco. Bell's tobacco. The dog smelled a ghost." |
| 5 | Vane, from the balcony, sees the hero. She lowers her glass and touches her radio. | VANE: "Close the doors. All units." |

### 6.3 In-level barks

| Where | Speaker | Line |
|---|---|---|
| Beat 2, yard | OFFICER | "Malaspina's bags. Load them and shut up." |
| Beat 2, on sight | DETECTIVE | "Who invited the Sandman?" |
| Beat 4, alarm | OFFICER | "Get the guests out! Get him down!" |
| Beat 5, squad entry | SQUAD LEADER | "Shields! Form up!" |
| Beat 8, first dot | RADIO | "Overwatch has him. Painting now." |
| Beat 9, gantry | VO | "Under the glass, summer. Over it, the snipers. I chose the short way down." |

### 6.4 Office scene (beat 7, in-engine with portraits)

Insert panel `palmhouse_office_01`: a folder on the desk, stamped *SILENT NIGHT: Board eyes only*. Typed lines: *"1. Leverage: the dog. 2. Remove the Maestro. 3. Sale to outside partners."* Initials at the bottom: *A.V., O.K., C.A.* and the mayor's seal.
VO: "Silent Night. The Board wanted the Maestro dead. And my dog was step one."

The desk phone rings.

| Speaker | Mood | Line |
|---|---|---|
| HALE | Tired, on the phone (face in hat shadow) | "You found her office. Good." |
| HERO | Cold | "Silent Night." |
| HALE | Pause, careful | "Then you know more than I do. Vane's under the dome. Snipers hold the park. Go over the roof." |
| HERO | Cold | "How'd you get this number?" |
| HALE | Flat | "I'm a detective, Grave. Go." |

VO (caption, as the line clicks off): "Hale always knew which phone to ring. I never asked how."

### 6.5 Mini-boss bark dialog (beat 11)

| Speaker | Mood | Line |
|---|---|---|
| BRANDT | Gruff, planting the tower shield | "Twenty years I've held this door." |
| HERO | Cold | "Retire." |
| BRANDT | Grim, racking the shotgun | "Nobody passes the Door." |

### 6.6 Boss intro portrait dialog (`vane_intro`, under the dome; laser dots dance on the glass)

| Speaker | Mood | Line |
|---|---|---|
| VANE | Stern, raising the riot shield | "Elias Grave. You are under arrest for every corpse from the docks to the hospital." |
| HERO | Cold | "Mags." |
| VANE | Contemptuous | "The bartender saw what she shouldn't. You put half this city to sleep, Grave. Don't lecture me." |
| HERO | Cold | "Silent Night." |
| VANE | Shocked, then furious | "Who told you that name? Snipers! Open fire!" |

### 6.7 Boss barks

| When | Line |
|---|---|
| `whistle` | "Squad, on me!" |
| `mark` | "Mark!" |
| `arrest` | "Hands where I can see them. Mark him!" |
| Phase 2 enter | "Open fire! Bring the roof down on him!" |
| Phase 3 enter | "Hold fire! HOLD FIRE!" ... "Fine. I'll do it myself." |
| Hero K.O. | "Lights out, Sandman." |

### 6.8 End panels (`palmhouse_outro`)

| # | SHOT | TEXT |
|---|---|---|
| 1 | The palm house wrecked. Snow falls through the broken dome onto the palms. Vane kneels in shattered glass, her medals torn off. | VANE: "The Board leaves tonight. You're too late. You were always going to be." |
| 2 | Through a glass office wall: **Inspector Hale** (trench coat, hat) on the phone, his back turned. Nero growls at the glass. | HALE: "He's on schedule, Maestro. Vane's done. Next, the train." |
| 3 | A thin sabre bursts through the glass and through Hale. Behind the cracks, a pale man in a white suit (Lenz) bows and leaves into the snow. | VO: "My informant. His leads were never his. Someone was writing my score." |
| 4 | Close-up. The hero holds Hale's bloody notebook: *"Meridian Express, 23:40, Platform 9. The Board leaves with the ledgers."* Nero sniffs Hale's coat and whines. | VO: "The last train out of Valmora. I had a ticket." |
| 5 | Close-up. The phone receiver hangs from its cord over the glass. The line is still open. | VO: "On the other end, a clock was ticking. Then someone hung up." |

Panel 5 is new. It keeps the "every level ends with a phone" thread and seeds the clock motif for Level 7.

---

## 7. Level data skeleton

```js
import { defineLevel } from '../../director/define.js';
import vane from '../../bosses/vane.js';
import brandt from '../../bosses/brandt.js';
import { palmHouseDome } from './gimmicks.js';

export default defineLevel({
  id: 'palmhouse', title: 'The Palm House', order: 6, palette: 'palmhouse', music: 'music:palmhouse',
  size: { W: 3600, H: 320, groundY: 280 },
  sections: [
    { id: 'park', x0: 0, x1: 820, indoor: false, weather: 'snow', ambient: [0.42, 0.50, 0.72],
      camera: { minZoom: 0.3, maxZoom: 0.6 },
      backdrop: [{ type: 'sky', set: 'snowNight' }, { type: 'city', set: 'riverLights' }, { type: 'image', id: 'bg:palmhouse_park_far' }] },
    { id: 'ballroom', x0: 840, x1: 1580, indoor: true, weather: 'none', ambient: [0.78, 0.66, 0.48],
      camera: { bounds: [840, 1580] }, backdrop: [{ type: 'wall', set: 'ballroomGold', windows: 'snowPark' }] },
    { id: 'orchids', x0: 1600, x1: 2100, indoor: true, weather: 'mist', ambient: [0.55, 0.66, 0.50],      // NEW weather kind
      camera: { minZoom: 0.45, maxZoom: 0.7 }, backdrop: [{ type: 'wall', set: 'glasshouseLow' }] },
    { id: 'office', x0: 2120, x1: 2200, indoor: true, weather: 'none', ambient: [0.50, 0.40, 0.30],
      camera: { bounds: [2120, 2200], minZoom: 0.75, maxZoom: 0.75 }, backdrop: [{ type: 'wall', set: 'curatorOffice' }] },
    { id: 'boiler', x0: 2220, x1: 2440, indoor: false, weather: 'snow', wind: 0.6, ambient: [0.40, 0.46, 0.66],
      camera: { minZoom: 0.4, maxZoom: 0.6, boundsY: [40, 320] }, backdrop: [{ type: 'sky', set: 'snowNight' }] },
    { id: 'nave', x0: 2460, x1: 3000, indoor: true, weather: 'snow', weatherMask: 'roofPanes', ambient: [0.66, 0.68, 0.52], // NEW mask
      camera: { minZoom: 0.4, maxZoom: 0.6, boundsY: [40, 320] }, backdrop: [{ type: 'wall', set: 'palmNave' }] },
    { id: 'dome', x0: 3020, x1: 3600, indoor: true, weather: 'snow', weatherMask: 'roofPanes', ambient: [0.70, 0.66, 0.50],
      camera: { bounds: [3020, 3600], minZoom: 0.45, maxZoom: 0.45 }, backdrop: [{ type: 'wall', set: 'greatDome' }] },
  ],
  scene: { paint: [
    { type: 'vehicle', kind: 'limo', x: 60 }, { type: 'vehicle', kind: 'limo', x: 210 },
    { type: 'carpet', x0: 0, x1: 300, col: 'red' },
    { type: 'hedge', x0: 290, x1: 320 },
    { type: 'vehicle', kind: 'riotVan', x: 470 }, { type: 'vehicle', kind: 'riotVan', x: 700 },
    { type: 'shed', x: 600, w: 60 },
    { type: 'lamp', style: 'parkGlobe', xs: [40, 180, 340, 520, 760] },
    { type: 'balcony', x0: 1180, x1: 1420, y: 196, stairs: [1160, 1440] },
    { type: 'chandelier', xs: [1000, 1300] },
    { type: 'bandstand', x0: 1400, x1: 1480 },
    { type: 'door', x: 1000, wall: true, kind: 'portico' }, { type: 'door', x: 1400, wall: true, kind: 'double' },
    { type: 'door', x: 1560, kind: 'private' },
    { type: 'glasshouse', x0: 1600, x1: 2100, ceilingY: 150, baskets: true },
    { type: 'boilerHouse', x0: 2230, x1: 2330, chimney: true },
    { type: 'palm', xs: [2560, 2780, 2920, 3310] },
    { type: 'ironColumns', xs: [2520, 2680, 2860, 3160, 3460] },
    { type: 'fountain', x: 3310, w: 60 },
    { type: 'clock', x: 3520, y: 160, stopped: '3:17', maker: 'Bell & Sons' },
  ]},
  ground: [{ x0: 0, x1: 3600 }],
  killY: 400,
  walls: [
    { x: 820, y0: 0, y1: 280, id: 'kitchenDoor' }, { x: 1580, y0: 0, y1: 280, id: 'privateDoor' },
    { x: 2100, y0: 0, y1: 280, id: 'officeDoor' }, { x: 2200, y0: 0, y1: 280, id: 'backDoor' },
    { x: 2440, y0: 0, y1: 280, id: 'naveFlank' },          // the stair top door leads onto the gantry
    { x: 2820, y0: 0, y1: 280, id: 'doorArenaW', on: 'brandt' },
    { x: 3000, y0: 0, y1: 280, id: 'domeGate' },
  ],
  surfaces: [
    { id: 'van1', x0: 440, x1: 500, y: 236, oneWay: true, lane: 'plat' },
    { id: 'van2', x0: 670, x1: 730, y: 236, oneWay: true, lane: 'plat' },
    { id: 'buffetW', x0: 900, x1: 980, y: 252, oneWay: true, lane: 'plat' },
    { id: 'balcony', x0: 1180, x1: 1420, y: 196, oneWay: true, lane: 'plat' },
    { id: 'piano', x0: 1400, x1: 1480, y: 248, oneWay: true, lane: 'plat' },
    { id: 'buffetE', x0: 1500, x1: 1560, y: 252, oneWay: true, lane: 'plat' },
    { id: 'bench1', x0: 1640, x1: 1700, y: 246, oneWay: true, lane: 'plat' },
    { id: 'bench2', x0: 1780, x1: 1840, y: 246, oneWay: true, lane: 'plat' },
    { id: 'bench3', x0: 1940, x1: 1990, y: 246, oneWay: true, lane: 'plat' },
    { id: 'walkway', x0: 1760, x1: 2040, y: 196, oneWay: true, lane: 'plat' },
    { id: 'coal', x0: 2260, x1: 2320, y: 250, oneWay: true, lane: 'plat' },
    { id: 'gantry', x0: 2460, x1: 2590, y: 100, oneWay: false, lane: 'plat' },
    { id: 'skylight', x0: 2590, x1: 2640, y: 100, oneWay: false, lane: 'plat', pane: 'sky1' },   // NEW: surface dies with pane
    { id: 'bridge', x0: 2560, x1: 2640, y: 262, oneWay: true, lane: 'plat' },
    { id: 'naveGallery', x0: 2700, x1: 2860, y: 190, oneWay: true, lane: 'plat', cover: true },  // NEW: sniper occluder
    { id: 'galleryW', x0: 3040, x1: 3150, y: 176, oneWay: true, lane: 'plat', cover: true },
    { id: 'galleryE', x0: 3470, x1: 3580, y: 176, oneWay: true, lane: 'plat', cover: true },
    { id: 'rim', x0: 3280, x1: 3340, y: 256, oneWay: true, lane: 'plat' },
  ],
  stairs: [
    { type: 'fireEscape', x0: 2340, x1: 2440, flights: 3 },     // iron stairs up the nave flank
    { type: 'spiral', x0: 2670, x1: 2700, to: 190 },            // NEW stair type (or ledge climb)
  ],
  panes: [
    { id: 'vanWin', x0: 712, y0: 238, x1: 728, y1: 252, hp: 20, kind: 'window', depth: 10 },
    { id: 'cab1', x0: 1716, y0: 200, x1: 1724, y1: 280, hp: 30, kind: 'window', depth: 0, blocks: true }, // NEW blocking glass
    { id: 'cab2', x0: 1856, y0: 200, x1: 1864, y1: 280, hp: 30, kind: 'window', depth: 0, blocks: true },
    { id: 'cab3', x0: 1996, y0: 200, x1: 2004, y1: 280, hp: 30, kind: 'window', depth: 0, blocks: true },
    { id: 'gunCab', x0: 2180, y0: 220, x1: 2196, y1: 262, hp: 10, kind: 'window', depth: -10 },
    { id: 'sky1', x0: 2590, y0: 100, x1: 2640, y1: 108, hp: 1, kind: 'roof', onBreak: 'shards' },
    // nave roof: 8 panes, 50 px each, x 2640-3040, y 104-120, hp 2 cracks
    ...row('nave', { x0: 2640, n: 8, w: 50, y0: 104, y1: 120, hp: 2, kind: 'roof', onBreak: 'shards' }),
    // dome: 10 panes, 52 px each, x 3040-3560, y 30-60
    ...row('dome', { x0: 3040, n: 10, w: 52, y0: 30, y1: 60, hp: 2, kind: 'roof', onBreak: 'shards' }),
    { id: 'haleOffice', x0: 3500, y0: 180, x1: 3580, y1: 270, hp: 999, kind: 'window', depth: -30 },
  ],
  lights: [
    { x: 1000, y: 80, r: 160, rgb: [255, 220, 150] }, { x: 1300, y: 80, r: 160, rgb: [255, 220, 150] },
    { x: 1700, y: 160, r: 60, rgb: [255, 150, 70], flicker: 0.05 }, { x: 1960, y: 160, r: 60, rgb: [255, 150, 70] },
    { x: 2160, y: 230, r: 50, rgb: [140, 255, 160] },
    { x: 2280, y: 260, r: 70, rgb: [255, 130, 50], flicker: 0.2 },
    { x: 3540, y: 210, r: 50, rgb: [255, 220, 160], id: 'haleLamp', on: false },
  ],
  props: [
    ['bottleTray', 180, 280], ['cashBags', 530, 280], ['shovel', 610, 280], ['rake', 620, 280], ['statue', 400, 280],
    ['champTower', 960, 280], ['champTower', 1120, 280], ['champTower', 1460, 280],     // NEW
    ['chandelier', 1000, 60], ['chandelier', 1300, 60],                                // NEW
    ['iceSwan', 1240, 280], ['planterCastor', 1350, 280], ['planterCastor', 1500, 280],
    ['pot', 1660, 246], ['pot', 1800, 246], ['fertCan', 1700, 280], ['wateringCan', 1960, 280],
    ['steamPipe', 1680, 230], ['steamPipe', 1900, 230], ['rakeTrap', 1800, 280],       // NEW
    ['coalShovel', 2300, 280], ['barrel', 2380, 280],
    ['planterCastor', 2740, 280], ['planterCastor', 2880, 280], ['toppleStatue', 2820, 280],
    ['planterTall', 3120, 280], ['toppleStatue', 3200, 280], ['toppleStatue', 3420, 280], ['planterTall', 3500, 280],
    ['lantern', 3310, 70],
  ],
  pickups: [
    { w: 'axe', x: 600, stand: 'rack' },
    { w: 'shotgun', x: 720, stand: 'van', diff: ['easy', 'medium'], behind: 'vanWin' },
    { kind: 'ammo', x: 720, diff: ['hard', 'wicked'], behind: 'vanWin' },
    { w: 'katana', x: 1180, stand: 'rack', skin: 'dressSabre' },
    { kind: 'bandage', x: 1530 }, { kind: 'bandage', x: 2060 },
    { w: 'axe', x: 1940, stand: 'rack', ifTaken: 'axe@600', else: { kind: 'ammo' } },
    { w: 'shotgun', x: 2188, stand: 'rack', behind: 'gunCab' },
    { kind: 'bandage', x: 2150, n: { easy: 2, medium: 2, hard: 1, wicked: 1 } }, { kind: 'ammo', x: 2170 },
    { kind: 'ammo', x: 2240 },
    { w: 'mg', x: 2820, stand: 'bench', surface: 'naveGallery' },
    { kind: 'bandage', x: 2760 },
  ],
  civilians: {                                                   // NEW
    park: { n: 8, path: [0, 300], exit: 'portico' },
    ballroom: { n: 16, kinds: ['guest', 'waiter', 'musician'], exits: [840, 1000], fleeOn: 'alarm' },
  },
  snipers: {                                                     // NEW
    nests: [{ id: 'water', x: 2300, y: -420 }, { id: 'trees', x: 3200, y: -380 }, { id: 'north', x: 3700, y: -460 }],
    sections: { boiler: ['water'], nave: ['water', 'trees'], dome: ['trees', 'north', 'water'] },
    max: { easy: 1, medium: 2, hard: 2, wicked: 3 }, lockBase: 1.2, lockMin: 0.6, dmg: { easy: 20, medium: 30, hard: 30, wicked: 35 },
  },
  flags: { alarm: false },                                       // NEW level flag
  start: { x: 40, section: 'park', cutscene: 'palmhouse_intro' },
  objectives: [
    { id: 'find', text: 'Find Vane.' },
    { id: 'office', text: 'Follow Nero.', after: 'shields' },
    { id: 'roof', text: 'Go over the roof.', after: 'phone' },
    { id: 'vane', text: 'Commissioner Vane.', after: 'brandt' },
  ],
  waves: {
    yard:    { at: [480, 540, 640, 700, 760], roles: ['baton', 'detective', 'baton', 'pistol', 'knife'],
               count: { easy: 2, medium: 3, hard: 4, wicked: 5 }, from: 'nearestDoor' },
    b1a:     { at: [900, 1000, 1240, 1400, 1500], roles: ['baton', 'detective', 'baton', 'knife', 'baton', 'knife'],
               count: { easy: 3, medium: 4, hard: 5, wicked: 6 }, from: 'nearestDoor' },
    b1b:     { at: [1200, 1380, 1100], roles: ['pistol@balcony', 'pistol@balcony', 'baton', 'pistol'],
               count: { easy: 1, medium: 2, hard: 3, wicked: 4 }, from: 'nearestDoor', addIf: { alarmEarly: 'shield' } },
    shields: { at: [1400], roles: { easy: ['shield', 'baton'], medium: ['shield', 'shield', 'shield', 'pistol'],
               hard: ['shield', 'shield', 'pistol', 'pistol'], wicked: ['shield', 'shield', 'shield', 'pistol', 'pistol', 'baton'] },
               from: 'door:1400', formation: 'phalanx', first: 'alone' },
    o1:      { at: [1640, 1760, 1820], roles: ['baton', 'billhook', 'baton', 'pistol', 'shield', 'billhook', 'shield', 'baton', 'pistol'],
               count: { easy: 3, medium: 5, hard: 7, wicked: 9 }, from: 'nearestDoor' },
    o2:      { at: [1880, 2020, 2060], roles: ['pistol@behindGlass', 'baton', 'shield', 'pistol@behindGlass', 'shield', 'baton', 'pistol'],
               count: { easy: 2, medium: 4, hard: 5, wicked: 7 }, from: 'nearestDoor' },
    yard2:   { at: [2280, 2400], roles: ['baton', 'baton', 'shield', 'spotter', 'shield', 'baton'],
               count: { easy: 2, medium: 4, hard: 4, wicked: 6 }, dots: { easy: 1, medium: 1, hard: 2, wicked: 2 }, from: 'offscreen' },
    gantry:  { at: [2560], roles: ['shield', 'baton', 'shield'], count: { easy: 0, medium: 1, hard: 2, wicked: 2 }, from: 'roofDoor' },
    drop:    { at: [2600, 2660, 2700], roles: ['baton', 'pistol', 'baton', 'pistol'],
               count: { easy: 2, medium: 3, hard: 3, wicked: 4 }, from: 'placed' },
    volley:  { at: [2760, 2860, 2940], roles: ['shield', 'baton', 'baton', 'spotter@gallery', 'shield', 'pistol@gallery', 'pistol@gallery', 'shield', 'baton'],
               count: { easy: 3, medium: 5, hard: 7, wicked: 9 }, dots: { easy: 1, medium: 2, hard: 2, wicked: 3 }, from: 'nearestDoor' },
  },
  triggers: [
    { when: { heroX: '>=300' }, do: [{ toast: 'The back door.' }, { spawnWave: 'yard' }] },
    { when: (s) => s.level.yardAlert, do: { setFlag: { alarm: true } } },                         // NEW action
    { when: { killed: 'yard', heroX: '>=800' }, do: { transition: { to: 'ballroom', fade: true } } },
    { when: { inSection: 'ballroom', heroX: '>=1000' }, do: [{ cutscene: 'palmhouse_toast' }, { setFlag: { alarm: true } }, { spawnWave: 'b1a' }] },
    { when: (s) => s.waves.b1a.alive <= 1, do: { spawnWave: 'b1b' } },
    { when: { killed: 'b1b' }, do: [{ spawnWave: 'shields' }, { toast: 'Shields block the front. Go around, go over, or break it.', diff: ['easy', 'medium'] }] },
    { when: { killed: 'shields' }, do: [{ unlock: 'privateDoor' }, { nero: 'scratch:1560' }] },                     // NEW actions
    { when: { heroX: '>=1580', killed: 'shields' }, do: [{ transition: { to: 'orchids', fade: true } }, { spawnWave: 'o1' }, { nero: 'lead:2100' }] },
    { when: [{ heroX: '>=1840' }, { killed: 'o1' }], any: true, do: { spawnWave: 'o2' } },
    { when: { killed: 'o2', heroX: '>=2100' }, do: { transition: { to: 'office', fade: true } } },
    { when: { interact: 'dossier' }, do: [{ panel: 'palmhouse_office_01' }, { ring: 'deskPhone' }] },                // NEW
    { when: { interact: 'deskPhone' }, do: [{ dialog: 'hale_call' }, { unlock: 'backDoor' }] },
    { when: { heroX: '>=2200', flag: 'halecall' }, do: [{ transition: { to: 'boiler', fade: true } }, { spawnWave: 'yard2' }] },
    { when: { killed: 'yard2', heroX: '>=2430', heroY: '<=110' }, do: [{ transition: { to: 'nave', at: [2470, 100] } }, { spawnWave: 'gantry' }, { spawnWave: 'drop' }] },
    { when: [{ heroX: '>=2600', heroY: '<=110' }, { paneBroken: 'sky1' }], any: true,
      do: [{ snipe: { at: 'hero', pane: 'sky1' } }, { slowmo: { scale: 0.25, t: 1.6, aim: true } }] },               // NEW
    { when: { killed: 'drop', heroX: '>=2640' }, do: { spawnWave: 'volley' } },
    { when: { heroX: '>=2700', inSection: 'nave' }, once: true,
      do: [{ breakPanes: { ids: 'nave3..nave8', gap: 0.15 } }, { slowmo: { scale: 0.35, t: 2.0 } }] },
    { when: { killed: 'volley', heroX: '>=2900' }, do: [{ dialog: 'brandt_intro' }, { miniBoss: 'brandt' }] },       // NEW action (boss def, no level end)
    { when: { killed: 'brandt' }, do: [{ unlock: 'domeGate' }, { pickup: { w: 'shotgun', x: 2960 } }] },
    { when: { heroX: '>=3060', inSection: 'dome' }, do: [{ lock: 'domeGate' }, { boss: 'start' }] },
    { when: { bossDefeated: 'vane' }, do: [{ script: 'haleScene' }, { cutscene: 'palmhouse_outro' }, { runOver: 'win' }] },
  ],
  miniBosses: { brandt: { module: brandt, arena: { section: 'nave', x0: 2820, x1: 3000 }, intro: 'brandt_intro' } },
  boss: { module: vane, arena: { section: 'dome', x0: 3030, x1: 3590, doors: [3030, 3590] },
          intro: 'vane_intro', crew: { roles: ['shield', 'baton', 'pistol'], every: null, max: { easy: 2, medium: 3, hard: 4, wicked: 5 } },
          gimmick: palmHouseDome },
  cutscenes: { intro: 'palmhouse_intro', toast: 'palmhouse_toast', outro: 'palmhouse_outro' },
  dialog: { hale_call: [...], brandt_intro: [...], vane_intro: [...] },
  assets: ['panel:palmhouse_*', 'portrait:vane_*', 'portrait:hale_*', 'portrait:brandt_*', 'portrait:elias_*',
           'music:palmhouse', 'music:boss_vane', 'bg:palmhouse_*', 'sfx:snow_*', 'sfx:sniper_*', 'sfx:shield_*', 'sfx:glass_roof_*'],
});
```

The gimmick module `palmHouseDome` implements `{ init, step, onEvent, lights, hazards, draw2d, build3d, update3d }`:
- `init`: binds dome panes, nests, wet zones, the lantern and the Hale lamp.
- `step`: dot state machines, shard falls, melt zones (4 s after a pane breaks), snow columns.
- `onEvent`: `glass:break` -> shards and snow column; `boss:phase` -> `volley(4)`, `haleLight`, `shieldSplit`, `lanternDrop`; `boss:telegraph` with `move: 'shock'` -> flicker the wet zones.
- `lights`: cold blue shafts under broken panes; blue pulse on shock; red laser lines.
- `build3d` / `update3d`: the iron dome ribs (3D-only shape), glass panes, beams.

---

## 8. Engine features needed (not in the game today)

| # | Feature | One-line spec | Shared with |
|---|---|---|---|
| 1 | **Snow weather** | `weather.kind: 'snow'`: slow, drifting flakes with `wind` gusts; a white layer builds on surface tops (visual); breath puffs from actors outdoors; footprints that fill in. | Epilogue (ledger pages fall "like snow", same particle system with a paper sprite) |
| 2 | **Weather mask by roof panes** | In an indoor section with `weatherMask: 'roofPanes'`, weather particles exist only above the glass and in the column under each broken pane. | L7 dome car, L8 clock face and penthouse |
| 3 | **Mist and humid interior** | `weather: 'mist'`: a floor fog layer 40 px high that hides feet, plus condensation on glass; a 1.5 s lens-fog overlay when the hero goes from a cold section to a warm one. | L1 freezer fog (Marchetti), L5 |
| 4 | **Shield role** | New `shield` role with a directional block, shield HP, the damage table in §4, phalanx grouping and a break that converts him to `baton`. | L8 (all types), Brandt, Vane |
| 5 | **Off-screen sniper emitter** | `snipers.nests` per section; dot state machine (search, track, lock, fire, cooldown); line-of-sight occluders (`cover: true` surfaces and props); rounds hit anyone on the dot and crack panes. | L4 outro (dot on the windscreen, in-engine option), L7, L8 |
| 6 | **Spotter link** | An enemy flag that speeds up all dots in its section by 30% and removes one dot for 10 s on its death. | L7, L8 |
| 7 | **Roof panes that break and fall** | `panes kind: 'roof', onBreak: 'shards'`: crack count, a floor mark 0.9 s before impact, a falling shard hazard (dmg, knockdown), glass debris left on the floor. | L5, L7 dome car, L8 glass floor and clock face |
| 8 | **Walkable pane** | `surfaces[].pane`: a surface that is removed when its pane breaks, so actors fall. | L8 glass floor penthouse |
| 9 | **Blocking glass at the fight-lane depth** | `panes[].blocks: true`: a pane acts as a wall until broken; bullets crack it; thrown bodies break it. | L3 mirrors, L5 isolation wards (dive through glass) |
| 10 | **Civilians** | Non-hostile actors that walk paths, flee to exits on `alarm` or `noise`, can be knocked down but not killed, and block enemy gun lines (E/M rule). | L3 casino guests, L5 patients, L8 opening-night guests |
| 11 | **Level flags and alarm** | `flags` on the level plus a `setFlag` action and `flag` trigger; waves can read flags (`addIf`). | L3, L7 |
| 12 | **Scripted slow motion with aim** | Trigger action `slowmo: { scale, t, aim }` that sets `state.timeScale` and allows free aim while airborne. | Every level's slow-motion set piece |
| 13 | **Set-piece props** | `champTower` (shatter, shards, slip zone), `chandelier` (chain hit, floor mark, fall hazard), `toppleStatue` (push to fall, line damage), `steamPipe` (burst, blind zone), `rakeTrap` (optional). | L3 chandeliers and champagne, L8 lobby |
| 14 | **Friction (slip) zones** | `hazards.zones` of kind `slip`, timed, that make actors slide and fall at run speed. | L1 crushed ice, L4 leak puddles |
| 15 | **Wet zones and electric shock** | Zones of kind `wet` (static or spawned under broken panes) that a `shockZone` hazard charges. | L2 third rail, L5 defibrillator in a puddle |
| 16 | **Nero companion** | Nero as an actor: heel, `lead:x` (run ahead along a scent trail and wait), emotes (whine, growl, scratch), and the optional "Nero, hold!" assist (pins a goon, or pulls a shield down 2 s). | L2, L5, L7, L8 |
| 17 | **Interactables** | `interact` triggers for an inspect object (shows an insert panel) and a ringing phone (starts a dialog). | Every level's phone ending |
| 18 | **Boss shield sub-state** | `shield: { hp, front, dropOnWallStun, retrieve }` in `defineBoss`; the dropped shield becomes a throwable object. | Brandt |
| 19 | **Grab with a follow-up and a struggle** | `grab({ follow, struggle })`: holds the hero, runs a follow-up (here a sniper lock) and shows a mash prompt. | L1 meat hook (Marchetti) |
| 20 | **`volley({ proj: 'bullet' })`** | Add a bullet projectile to the volley primitive, with a click-and-glint telegraph (not a red dot). | L7 Ushers' bosses, L8 |
| 21 | **Mini-boss without level end** | `miniBosses` in the level and a `miniBoss` action: a `defineBoss` record with a small bar, no outro, no run end. | Any level elite |
| 22 | **Blood on snow** | Blood decals on snow fade at 1/3 speed and render brighter red. | Small; L8 roof if snow is used |
| 23 | **Spiral stair** (optional) | `stairs type: 'spiral'` between the floor and one platform; ledge climbing is the fallback. | L8 |

---

## 9. Art and audio assets

### 9.1 Comic panels (1024x576, `art/panels/palmhouse/`)

| Id | Content |
|---|---|
| `panel:palmhouse_intro_01` | Snowy park, the gold palm house, limousines, guests in furs on the red carpet. |
| `panel:palmhouse_intro_02` | The hero in black tie with snow on his shoulders, a waiter with champagne, Nero off the leash. |
| `panel:palmhouse_toast_03` | Vane on the balcony raising a glass; officers along the walls; red wax seal on a programme. |
| `panel:palmhouse_toast_04` | Close-up: Nero at the *Private* door, nose up. A thin curl of pipe smoke under the door (subtle). |
| `panel:palmhouse_toast_05` | Vane lowers her glass and touches her radio; her eyes on the reader. |
| `panel:palmhouse_office_01` | Insert: the *SILENT NIGHT* folder, the ashtray with pipe ash, a cherry tobacco tin lid (red-tinted label). |
| `panel:palmhouse_outro_01` | The wrecked dome, snow on palms, Vane kneeling in glass, medals torn. A clock at 3:17 in the background. |
| `panel:palmhouse_outro_02` | Through the glass office wall: Hale on the phone, back turned; Nero growling in the foreground. |
| `panel:palmhouse_outro_03` | The sabre through the glass and through Hale; Lenz bows behind the cracks. |
| `panel:palmhouse_outro_04` | Close-up: the hero's hand on Hale's bloody notebook, "Meridian Express, 23:40, Platform 9". |
| `panel:palmhouse_outro_05` | The phone receiver hanging on its cord over broken glass. |

### 9.2 Portraits (512x512, `art/portraits/`)

| Character | Moods (ids) |
|---|---|
| Vane | `vane_stern`, `vane_contemptuous`, `vane_shocked`, `vane_furious`, `vane_broken` (defeat, for barks) |
| Elias | `elias_cold`, `elias_silent` (existing from earlier levels if made); `elias_furious_quiet` (from L5) |
| Hale | `hale_tired_phone` (face half in hat shadow), `hale_careful_phone` |
| Brandt | `brandt_gruff`, `brandt_grim` |

Character references (`art/characters/<char>/ref.png`): `vane`, `brandt`. Hale's reference must exist before L6 (his face shows for the first time only half-lit; keep it consistent with the prologue's hat brim).

### 9.3 Sprites, backdrops and 3D

- Sprites: riot officer with shield (walk, advance, bash, overhead, broken-shield stagger), baton officer, pistol officer, detective, billhook officer, spotter; guests (fur coat, gown, tuxedo), waiter, musicians; Vane (shield set and phase-3 revolver set, whistle pose, point pose, arrest grab, shock stab, kneel); Brandt (tower shield, slot shot, reload); Hale and Lenz silhouettes for the in-engine outro.
- Props: champagne tower (whole and shattered), chandelier (hanging, falling, fallen), ice swan, planters, botanist statues (standing, toppled), terracotta pots, fertiliser can, watering can, rake, steam pipe, cash bags, riot van, iron lantern, Bell & Sons clock at 3:17.
- Backdrops: `bg:palmhouse_park_far` (snowy park and river lights), `bg:palmhouse_dome_sky` (snowy night seen through the dome).
- 3D-only shapes (`render3d/models/palmhouse/`): the dome ribs and nave roof frame, the gantry. Palms and the fountain from `t3lathe`; the riot van from `t3vehicle`.

### 9.4 Music (`audio/music/`)

| Id | Use |
|---|---|
| `music:palmhouse` | Stems: `waltz` (diegetic quartet, arrival and toast; low-pass filter outdoors), `combat` (snare, low brass, baton-on-shield hits), `orchids` (drones, drips, marimba), `roof` (wind bed, cello pulse). |
| `music:boss_vane` | Military march with choir; phase 2 adds brass and timpani; phase 3 drops to snare and solo choir voice. |
| `music:palmhouse_outro` | One violin plays the waltz, slow and broken. |
| Stingers | `sfx:sting_alarm` (bow screech and crowd gasp), `sfx:sting_cherry` (three piano notes from Bell's theme), `sfx:sting_hale` (low string cluster on the sabre). |

### 9.5 Sound effects (`audio/sfx/`)

- Weather and rooms: `snow_step`, `snow_land`, `wind_gust`, `breath_cold`, `mist_hiss`, `water_drip`, `boiler_rumble`, `door_warm_whoosh` (cold-to-warm cut), `room_tone_glasshouse`.
- Crowd: `crowd_murmur`, `crowd_gasp`, `crowd_scream_flee`, `tray_drop`, `quartet_stop`.
- Police: `police_whistle_short`, `police_whistle_long`, `whistle_inhale`, `radio_chatter`, `radio_painting_now`, `baton_extend`, `cuffs_rattle`, `door_slam_double`.
- Shields: `shield_block_thunk`, `shield_spark`, `shield_crack`, `shield_break`, `shield_bash`, `shield_drop`.
- Snipers: `sniper_lock_beep` (rising), `sniper_shot_distant`, `sniper_glass_pierce`, `sniper_ricochet`.
- Glass: `glass_roof_crack`, `glass_roof_burst`, `shard_fall_whistle`, `shard_impact`, `glass_crunch_step`, `champagne_tower_crash`, `cabinet_shatter`, `sabre_through_glass`.
- Props: `chandelier_chain_snap`, `chandelier_crash`, `statue_topple`, `steam_burst`, `pot_smash`, `rake_whack`, `lantern_chain_snap`, `lantern_impact`.
- Weapons: `shock_charge`, `shock_zap_water`, `revolver_cock`, `revolver_shot`, `revolver_reload`, `shotgun_slot_open`.
- Nero: `dog_whine`, `dog_growl`, `dog_bark`, `dog_scratch_door`.
- Story: `phone_ring_old`, `phone_click`, `clock_tick`, `receiver_swing`.

### 9.6 Voice (`audio/voice/`, optional)

`voice:vane_intro_01..03`, `voice:vane_bark_mark`, `voice:vane_bark_whistle`, `voice:vane_bark_openfire`, `voice:vane_bark_holdfire`, `voice:vane_outro_01`, `voice:hale_call_01..03`, `voice:hale_outro_01`, `voice:brandt_intro_01..02`, `voice:elias_*` (one to five words each).
