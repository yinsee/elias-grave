# Level 3: "House Always Wins"

Status: design draft (2026-10-02). Sources: `docs/story-bible.md` (Level 3, the Choir, Count Brask) and `docs/architecture.md` sections 3 (level format) and 4 (boss framework). Module path: `src/levels/casino/`, boss module `src/bosses/brask.js`.

Difficulty names in this file follow `DIFFS`: **E**asy / **M**edium / **H**ard / **W**icked. Enemy counts are written `E/M/H/W`.

---

## 1. Summary

| Item | Value |
|---|---|
| Story beat | Elias wants the man who paid for the fire (the chips in Switch's hand). He learns the Choir's ranks. Brask calls him **"the Sandman"** in front of his men, and the player learns the hero's past: the Conductor's best enforcer. Exit hook: the Baritones' hard money moves through Nerissa Kalt's aquarium. Twist setup: Brask's office photo with one face cut out, and a Bell & Sons clock stopped at 3:17 in the boss arena. |
| Setting | The Grand Casino Orfeo, a Belle Époque casino on the river. Almost all indoors: gaming floor, kitchens, a short river terrace (the only outdoor part), the vault corridor and counting room, the mirrored lobby of the Salon Privé, the hall of mirrors, the roulette salon. |
| Time / weather | Late night, about 02:00. Heavy rain. Neon (red and gold) on the river, seen through tall arched windows and on the terrace. |
| Mood | Gold, red velvet and crystal over rot. Rich guests in evening dress run for the exits. Every room is too bright, and every surface reflects. The level gets colder and more fractured as it goes: warm gold floor, green-grey vault, then the silver mirrors, then the red-and-black wheel. |
| Faction | **The House**: tuxedo security, dealers with knives and rakes, card sharps, pit bosses with pistols, kitchen hands with cleavers. One elite: **Bruno "the Cooler" Ostrava**. |
| Slow-motion set piece | The dual-pistol dive across the craps table while chips and cards hang in the air (beat 3). Secondary glass set pieces: the mirrored lobby chandelier (beat 9), the mirror wall collapse at the boss phase shift (beat 10 to 11). |
| Length target | 10 minutes on Medium (8 on Easy for a fast player, 12 on Wicked). Budget: floor 3:00, kitchen 1:30, terrace 0:40, vault and Cooler 2:00, lobby 1:50, boss 3:00. |
| Music | Base: slow lounge jazz (upright bass, brushed drums, piano with a tired left hand). Fight layers add a distorted baritone sax and a hard tom groove. Terrace: rain only, plus a muted trumpet from a radio inside. Boss: a dark tango (bandoneon, pizzicato strings, castanets that sound like a roulette ball), with a harpsichord counter-line in the hall of mirrors and a full string section at "All In". |
| SFX mood | Clatter of chips, slap of cards, the dry *fwip* of razor cards, crystal tinkle on every heavy hit near a chandelier, slot jackpot bells when a slot machine breaks. Mirrors break with a sharper, higher shatter than windows, followed by a long tinkle tail. The croupier's voice ("Faites vos jeux", "Rien ne va plus") is part of the boss telegraph set. |

---

## 2. Sections map

World: `W 3600, H 320, groundY 280`. 22 px = 1 m. Sections sit side by side and are joined by door transitions (fade 0.35 s).

| # | Section id | x-range | In/Out | Backdrop | Lighting | Camera |
|---|---|---|---|---|---|---|
| A | `floor` (gaming floor) | 0-1060 | Indoor | Tall arched windows with rain and red/gold river neon; red velvet walls; slot row along the back wall (x 600-1050); cashier cage at the east end. | Warm gold ambient `[0.62, 0.50, 0.36]`; 3 chandelier lights (x 420, 660, 900) that swing when hit and go out when they fall; red table lamps on each table; slot screens flicker (cyan, amber). | `minZoom 0.30, maxZoom 0.60`. Zoom out to show the mezzanine (y 196) when the hero climbs. Bounds 0-1060. |
| B | `kitchen` | 1080-1580 | Indoor | White tiles, steel hoods, hanging pots and ladles on a rail, a swinging double door at each end. | Cool fluorescent `[0.50, 0.58, 0.55]`; 2 tubes flicker; orange glow from the gas range (x 1300-1350). | `maxZoom 0.65`, tighter. Bounds 1080-1580. |
| C | `terrace` | 1600-1880 | **Outdoor** | The river at night, the far bank with neon signs, a stone balustrade in the front lane, a striped awning. | Rain. Cold `[0.35, 0.40, 0.60]`; one wall lantern (x 1640, amber); the river neon reflects in puddles. | `minZoom 0.25`: a wide, quiet frame. Bounds 1600-1880. |
| D | `vault` (vault corridor and counting room) | 1900-2380 | Indoor | Green-painted concrete, a steel cage with cash carts, bulletproof cashier windows, money-counting machines, the round vault door at the far end. | Green-grey `[0.40, 0.45, 0.42]`; caged work lamps; one red alarm light that starts to spin at beat 7. | `maxZoom 0.62`. Bounds 1900-2380. Cooler fight locks 2150-2380. |
| E | `lobby` (mirrored lobby of the Salon Privé) | 2400-2900 | Indoor | Floor-to-ceiling mirror panels on the back wall, marble floor, a grand staircase up to a gallery (y 186), mirror pillars in the fight lane, the great chandelier at x 2700. | Gold `[0.60, 0.52, 0.42]`, strong reflections; the great chandelier is the main light; wall sconces between mirrors. | `minZoom 0.28` to show the gallery and the floor together. Bounds 2400-2900. |
| F1 | `hall` (hall of mirrors, boss phase 1) | 2920-3240 | Indoor | Eight tall mirrors on the back wall, two swivel mirrors on stands in the fight lane, black-and-white marble. A Bell & Sons wall clock stopped at 3:17 between mirrors 4 and 5. | Silver-cold `[0.55, 0.58, 0.66]`; each mirror has a thin edge light; the lights die one by one as mirrors break. | Arena lock 2930-3236. `maxZoom 0.55`. |
| F2 | `roulette` (roulette salon, boss phases 2-3) | 3240-3600 | Indoor | The giant roulette-wheel floor (x 3260-3580), a raised hub with a spindle at the centre (x 3400-3440), private balcony doors high on the back wall, the salon chandelier at x 3420. | Red and black; a ring of bulbs around the wheel chases in the spin direction; the called colour glows. | Arena lock 3250-3590 after the phase shift. `minZoom 0.30` so the whole wheel is in frame. |

### ASCII side view (not to scale; ground y 280, gallery and mezzanine about y 190-200)

```
x:  0        300       600       900  1060|1080     1300     1580|1600   1880|1900    2150     2380|2400      2700      2900|2920      3240        3600
    |  A  GAMING FLOOR                    |  B  KITCHEN           |C TERRACE   |  D VAULT / COUNTING |  E  MIRRORED LOBBY       | F1 HALL   | F2 ROULETTE
    |   *chand     *chand      *chand     |  ~~pots rail~~        |  rain ////  |                     |        ***GREAT***       | M M M M M |  balcony doors
    |   (420)      (660)       (900)      |                       |  ////////   |  ===cage catwalk=== |  [gallery y186======]   | M M M M M |  [ ]     [ ]
    |  [===mezzanine y196=======]         |      [pass y196]      |  [awning]  |  $ cage $ |  counting| /stair  M  M  M  M  M   | |sw|  |sw| |     *chand
    | bar    |RT|  |ct| |RT| |ct||ct| CRAPS| [counter] FIRE [ctr] |  cafe  T   | carts  ##  |  presses| /      (P)   (P)   (P)  |           |   __/hub\__
    |[====]  |__|  |__| |__| |__||__|[====]|  [====]  ^^^^ [====] |  T    lamp | >>>  [glass]   VAULT()|/                         |  3:17 clock|  ((((wheel))))
====+=====================================+=======================+============+=====================+==========================+===========+==================
 start x 120                    cashier cage          range      balustrade/river    Cooler arena       mirror pillars (P)       mirrors M  wheel 3260-3580
 RT roulette table   ct card table (flippable)   CRAPS dive table   sw swivel mirror   $ cash cart   # bulletproof cashier panes
```

---

## 3. Encounter flow

Thirteen beats. Each wave spawns from the nearest door unless noted. "Alive max" is the cap on goons at once; the rest wait and enter as others die.

### Beat 1. "Faites vos jeux" (gaming floor west, x 120-620)

- **Start:** the opening cutscene ends on "Get the Count." The croupier runs. The hero stands at x 360 beside the roulette table with the fork on red 17.
- **Enemies (wave `w1`):** Tux (brawler variant) 2/2/3/3, Croupier (knife variant) 1/2/2/3. Alive max 3/3/4/5. They enter from the main doors (x 20) and the bar door (x 230).
- **Props / pickups:** 4 chairs, 2 flippable card tables (x 300, 470), 2 roulette tables (x 380, 560; surface y 256), champagne bottles on the bar (pocketable, 6), chip stacks on every table (pocketable throwables, 10). No guns. A bandage on the bar on Easy only.
- **Environment:** 18 guests in evening dress run for the exits (crowd panic). A heavy hit near a roulette table spills chips; a goon who is knocked down on chips slides 20 px. A goon thrown into a card table flips it.
- **End trigger:** `killed: 'w1'`. The PA chimes: a calm woman's voice says "Security to the main floor. Discreetly, please."
- **Why it is exciting:** the first fight is in a crowd of panicked rich people, with chips flying from every hit. It shows the House's style: polite men in tuxedos who block well.

### Beat 2. "The Gallery Gunline" (mezzanine and floor, x 220-800)

- **Start:** `heroX >= 600` or `w1` dead plus 3 s.
- **Enemies (`w2a` on the mezzanine, y 196):** Pit Boss (pistol variant) 1/1/2/2, Card Sharp (thrower variant) 0/1/1/2. **(`w2b` on the floor, after 6 s):** Tux 1/2/2/3, Rake (pipe variant) 0/1/1/1.
- **Props / pickups:** the bar (x 60-200, y 250) is the step for a ledge climb to the mezzanine (y 196). Two flippable card tables (x 700, 760) give cover from mezzanine fire. **Chandelier 1** (x 420) and **chandelier 2** (x 660) hang over the floor; each has a chain with 20 HP. The katana rests on a display stand on the mezzanine (x 520, `stand: 'rack'`), the Count's "collection".
- **Environment:** the chandeliers can be dropped three ways: shoot the chain, throw a blade or bottle at it, or hit the chain anchor on the mezzanine rail. A falling chandelier shows a shadow for 0.5 s, then deals 40 damage and a knockdown in a 60 px circle and shatters into crystal (no damage to the hero if he is outside the shadow). Pit Bosses hide behind flipped tables on the mezzanine edge.
- **End trigger:** `killed: ['w2a', 'w2b']`.
- **Why it is exciting:** the first vertical fight. The player learns that a gun on a balcony is a target for a climb, and that chandeliers are bombs.

### Beat 3. "Snake Eyes": the slow-motion craps dive (x 800-1060)

- **Start:** `heroX >= 800`. The cashier cage door (x 1000) slams open.
- **Enemies (`w3`):** Pit Boss 2/2/3/3 behind the cashier counter (x 1000-1050), Card Sharp 1/1/2/2 on top of the slot row (back lane, y 210), Tux 1/1/2/3 rushing from the cage. Alive max 4/4/6/7.
- **Props / pickups:** the craps table (x 860-960, surface y 254) is the dive pad. **A pair of pistols** (new hero weapon `pistols`, 2 x 12 rounds) lies in the dealer's drawer at the near end of the table (x 870). Every Pit Boss also drops one pistol (6 rounds) that tops up the pair. An ammo box under the table.
- **The dive (bullet time):** any jump or dodge roll that leaves the craps table surface while the hero holds a gun starts bullet time: `timeScale 0.3` for 1.8 s of real time or until he lands. The table throws up a burst of 40 chips and 20 cards that hang in the air (they fall in slow motion and stay readable). Aim snaps to the nearest goon in a 25° cone; each trigger fires both pistols in turn. Kills in bullet time ragdoll in slow motion with a hard hit-stop on the last kill. The music drops to a low-pass and a heartbeat. The pad recharges after 8 s, so the player can dive again on the way back.
- **First time hint:** when the hero first lands on the table, the chips on it glint once and the toast says "Dive." (Easy and Medium only).
- **End trigger:** `killed: 'w3'`. The cashier cage alarm rings; the kitchen door (x 1070) swings open as two waiters run out of it.
- **Why it is exciting:** it is the Max Payne moment of the level and it is in the player's hands. A good dive clears the cage in one beautiful second.

### Beat 4. "Hot Line" (kitchen, x 1080-1580)

- **Start:** `section:enter` kitchen.
- **Enemies (`w4a`, from the far door x 1580):** Kitchen Hand (machete variant, cleaver) 2/2/3/3, Tux 0/1/1/2. **(`w4b`, when `w4a` is half dead):** Card Sharp 1/1/2/2 on the pass shelf (x 1290-1370, y 196), Croupier 1/1/1/2.
- **Props / pickups:** 2 steel counters (x 1150-1270 and 1380-1500, surface y 248), the pass shelf (one-way, y 196), 2 bins, 1 barrel of cooking oil, 3 stock pots (carry and throw, like a bin), a steel trolley (push box; rolls 2x farther than a crate). A bandage on the pass shelf.
- **Environment:** the **gas range** (x 1300-1350, a fight-lane island, top y 250) is a fire zone: 6 damage per second and a "burning" stagger to anyone who stands on it or is knocked onto it. Goons avoid it; a sweep or a heavy kick sends them onto it. The cooking-oil barrel, thrown onto the range, makes a 1.5 s flare (80 px, 20 damage). The pot rail clangs when a body hits it (cosmetic).
- **End trigger:** `killed: ['w4a', 'w4b']` and `heroX >= 1560`.
- **Why it is exciting:** a tight, hot room with an environment kill on every throw. It also is a change of colour and sound after the gold floor.

### Beat 5. "Smoke Break" (terrace, x 1600-1880): the breather

- **Start:** `section:enter` terrace. Music fades to rain and a muted trumpet from a radio.
- **Enemies:** none. One frightened **dealer NPC** smokes under the awning (x 1700).
- **Scene (in-engine, `timeline.js`, about 12 s, skippable):** the dealer drops his cigarette and raises his hands.
  - DEALER: "I just deal cards, mister."
  - HERO: "Where's the Count."
  - DEALER: "Upstairs. The hall of mirrors. He's never alone in there. Nobody knows which one is him."
  - He hands over a brass vault key card (it opens the service door at x 1890) and runs off left.
  - HERO: "Go home."
- **Props / pickups:** a bandage and an ammo box on a café table (x 1760). A **fire axe** in a glass case on the wall (x 1840): break the glass to take it. The awning (x 1660-1800, y 200) is a climbable one-way surface with a bottle cache (3 bottles) on top.
- **Environment:** rain, puddles that reflect the neon, the river beyond the balustrade (front lane; not a pit). Across the river, a green coupé flashes its headlights twice (Mags; a setup for the outro).
- **End trigger:** the hero uses the key card at the service door (`heroX >= 1880`), then transition to `vault`.
- **Why it matters:** 40 seconds of quiet. The rain, the river and a scared man give the level a pulse, and the dealer's line sets up the boss gimmick.

### Beat 6. "Counting House" (vault corridor, x 1900-2150)

- **Start:** `section:enter` vault. The red alarm light starts to spin.
- **Enemies (`w6`):** Pit Boss 2/2/2/3 behind **bulletproof cashier panes** (x 2000-2120, y 200-250), Tux 1/2/2/3 in the corridor, Card Sharp 0/0/1/1 on the cage catwalk (x 1960-2100, y 192).
- **Props / pickups:** 3 **cash carts** (push boxes that roll far, and stop bullets from the front). A **shotgun** at the guard post (x 1920). An ammo box on the catwalk.
- **Environment:** the cashier panes are glass that cracks in 3 stages (100 HP each; shotgun 34 per blast). The Pit Bosses fire through firing slots. Two ways in: push a cash cart under fire up to the slot and fight past it, or climb the cage to the catwalk and drop behind the glass through a hatch (x 2100). A cart that hits the cashier wall at speed bursts open: bills fly (cosmetic) and the goon behind it is stunned 1 s.
- **End trigger:** `killed: 'w6'`; the inner gate (x 2150) opens.
- **Why it is exciting:** a gunfight with cover that the player moves. It is a puzzle with two answers, and a shotgun answer.

### Beat 7. "The Cooler" (counting room, x 2150-2380): mini-boss

- **Start:** `heroX >= 2180`. Gate shuts behind at x 2150. Short portrait bark (no full dialog):
  - COOLER (Bored, cracking his knuckles): "Count says you're bad luck. I'm worse."
- **Enemy:** **Bruno "the Cooler" Ostrava**, elite (see section 4). HP 260/340/380/440. Crew: none on E/M; Tux every 10 s, alive max 1 on H/W.
- **Props / pickups:** 2 money-counting tables (breakable; a thrown body smashes them), 2 cash carts, a bin. The vault door (x 2370) is the wall the Cooler charges into. After the fight: a bandage and the **machine gun** in a weapon locker (x 2340).
- **Environment:** when the Cooler's charge misses and hits the vault door, he is stunned 1.6 s and the door rings like a bell. Money-counter machines spray bills when hit (cosmetic, slows nothing).
- **End trigger:** Cooler dead. The vault door rolls open; the service lift behind it goes up to the lobby (transition to `lobby`).
- **Why it is exciting:** a fair, readable heavy before the boss. It tests what the player learned in L1-L2 (roll through the charge, punish the wall stun).

### Beat 8. "Hall of Faces" (mirrored lobby floor, x 2400-2640)

- **Start:** `section:enter` lobby. The camera holds 1.5 s on the mirror wall: it shows the hero, and also goons who wait out of view behind the mirror pillars.
- **Enemies (`w8`):** Pit Boss 1/1/2/2 behind mirror pillars (x 2520, 2640), Tux 2/2/3/3, Croupier 0/1/1/2.
- **Props / pickups:** 10 back-wall mirrors (x 2420-2890, 48 px apart) and 3 **mirror pillars** in the fight lane (x 2520, 2640, 2760). A velvet rope and brass posts (posts are liftable, pipe-like). Chairs and an ottoman (carry and throw).
- **Environment:** **reflection spotting**: actors show in the back mirrors, so the player sees a goon who waits behind a pillar. A mirror pillar blocks bullets until it breaks (60 HP, or one heavy hit, or one shotgun blast). When it breaks, shards stagger anyone behind it for 0.8 s and leave a floor shard decal: a body knocked down on shards takes 4 extra damage. Every broken mirror kills its own reflection: the room grows darker and less readable as the fight goes on.
- **End trigger:** `killed: 'w8'`.
- **Why it is exciting:** the room shows the player the enemies, then the player breaks that advantage with every punch. The first of the two big glass rooms.

### Beat 9. "The Grand Stair" (lobby stair and gallery, x 2480-2900)

- **Start:** `heroX >= 2640` or `w8` dead.
- **Enemies (`w9a` on the gallery, y 186):** Card Sharp 1/2/2/3, Pit Boss 0/1/1/2. **(`w9b`, a rush up the stair after 5 s):** Tux 2/3/3/4, Rake 1/1/2/2.
- **Props / pickups:** the grand staircase (x 2480-2600) up to the gallery (x 2600-2880, y 186). A bandage at the top of the stair. On Easy, one more bandage at the salon door.
- **Set piece: the great chandelier (x 2700):** its rope is tied off on the gallery rail (x 2860). A blade hit, an axe hit or a shot on the tie cuts it. The chandelier falls 1.2 s (shadow telegraph) onto the marble, deals 60 damage in a 90 px circle and blasts the 3 nearest back-wall mirrors. If at least 2 goons are under it, the game runs a short bullet time (0.35x for 0.8 s) on the impact. Crystal shards cover x 2650-2750 (shard decal).
- **End trigger:** `killed: ['w9a', 'w9b']`, then `heroX >= 2900` opens the salon doors and starts the boss intro.
- **Why it is exciting:** the biggest crowd fight of the level, on two heights, with one huge environmental kill as the reward for reaching the gallery.

### Beat 10. "Rien ne va plus": boss intro and phase 1 (hall of mirrors, x 2920-3240)

- **Start:** transition to `hall`. Twenty reflections of Brask in the mirrors (the 8 mirrors show multiple angles). Portrait dialog `brask_intro` (section 6). Boss phase 1. See section 5.
- **End trigger:** phase shift (Brask HP <= 65% or 2 or fewer mirrors left).
- **Why it is exciting:** the player must find the real man among glass copies and break the room to do it.

### Beat 11. "The Wheel": boss phase 2 (roulette salon, x 3240-3600)

- **Start:** the phase shift scene: Brask backs into the far mirror wall (x 3240) and smashes it with his cane. The wall falls in a slow-motion shower (0.3x, 1.2 s). Behind it, the roulette salon. A croupier spins the wheel.
- **End trigger:** Brask HP <= 30%.

### Beat 12. "All In": boss phase 3 (roulette salon)

- **Start:** HP <= 30%. Brask throws his monocle away. The salon chandelier (x 3420) is now a weapon for the player.
- **End trigger:** Brask HP 0: finisher, freeze frame.

### Beat 13. "Zero" (defeat and exit)

- **Start:** `boss:defeated`. In-engine: the wheel slows over 3 s; Brask lies on the numbers; the ball drops into the green zero. Then the outro panels (section 6). Results card.
- **Why it matters:** a quiet end after the loudest fight, and the hook to Level 4.

---

## 4. New enemy variants: The House

All are reskins or small behaviour changes of existing roles in `ROLE`. Look ids are new palettes and clothes for the goon painter.

| Id | Base role | Look | Stat changes | Behaviour change |
|---|---|---|---|---|
| `tux` (Floor Security) | brawler | Black tuxedo, white shirt, earpiece, slicked hair | hp 60 (base 50), block window +30% | **Shove**: a two-hand push with knockback 30 px and no damage, used when the hero is cornered against a table or the gas range. Opens with a polite raised hand (0.3 s) before the first attack. |
| `croupier` (Dealer) | knife | Red waistcoat, sleeve garters, bow tie | windup 0.13 (base 0.16) | **Deal-in**: opens a fight with one thrown card (4 damage, range 40-80 px) and then closes in. |
| `rake` (Croupier with rake) | pipe | Red waistcoat, long brass chip rake | reach 30 (base 24), windup 0.34 | **Low rake sweep**: a low attack that the hero must jump or roll; it knocks down on hit. Never jumps to ledges. |
| `sharp` (Card Sharp) | thrower | Grey suit, open collar, cards fanned between fingers | projectile `card` (fast, flat, damage 5, sticks into walls), range 50-120 | Throws a 3-card fan on H/W (spread 8°). Keeps to platforms; drops down only when the platform is empty of other goons. |
| `pitboss` (Pit Boss) | pistol | Dinner jacket in dark red, gold cufflinks, radio | hp 55 | **Uses cover**: walks to the nearest flippable table or pillar and fires from behind it. **Radio**: if he stays alive for 8 s, the next wave in this section spawns 30% sooner. Drops a pistol (6 rounds) for the hero. |
| `cook` (Kitchen Hand) | machete | White jacket, apron, cleaver | none | Kitchen only. Will not step onto the gas range (path cost). |
| `cooler` (elite) | brawler, built on the boss runtime | Huge man, tight tuxedo, gold knuckle-dusters, shaved head, cold eyes | hp 260/340/380/440, s 1.2, speed 26, reach 20, dmg 14, heavyDmg 22, poise 24 | See below. |

**The Cooler (mini-boss, built with `defineBoss` and no phases beyond 2):**

- `string({ combos: [['jab','punch'], ['punch','punch'], ['jab','jab','punch']] })` with gold-knuckle hits.
- `charge({ windup: 0.6, v: 200, maxT: 1.0, wallStun: 1.6 })`: telegraph is a stamp of the foot and a lowered head; the vault door and the cash cage are walls.
- `grab({ range: 22, then: 'slamOnto', target: 'nearest countingTable' })`: telegraph is both arms wide (0.45 s). A roll or a jab breaks it. On hit he slams the hero through a counting table (16 damage).
- Phase 2 at 50%: `roar` and "**Cold streak**": his guard breaks only to heavy attacks for 6 s (a blue frost tint on his gloves shows it), then 4 s of normal guard.
- Punish windows: after the wall stun (1.6 s), after a missed grab (0.9 s).

**Placement rules:**

1. Tux appears everywhere; alive max 3 Tux at once in any section.
2. Croupier and Rake spawn only within 200 px of a gaming table or the wheel (they are table staff); Rake never on platforms.
3. Card Sharps spawn only on platforms (mezzanine, pass shelf, slot tops, cage catwalk, gallery, balcony doors).
4. Pit Bosses: alive max 2 (3 on Wicked). None before beat 2. Each must have cover (a flippable table, a mirror pillar or a cashier pane) within 60 px of its spawn.
5. Kitchen Hands only in the kitchen.
6. No two ranged goons spawn on the same platform within 60 px of each other.
7. Goons never spawn inside the terrace (the breather stays clean).

---

## 5. The boss: Count Teodor Brask

Baritone. Owner of the Grand Casino Orfeo. Tall and thin, white tuxedo, a monocle on a gold chain, slicked silver hair, a black cane with a silver crook. He throws razor-edged playing cards. He is a light, evasive duellist: he sidesteps, he never trades blows, he punishes greed. Stats are lighter than Malaspina's, and the gimmicks carry the difficulty.

### 5.1 Arena layout

```
             F1 HALL OF MIRRORS (phase 1)                     F2 ROULETTE SALON (phases 2-3)
 x: 2930                                     3236|3240                                         3590
    | M1   M2   M3   M4 [3:17] M5   M6   M7   M8 |   [balcony door 3300]      [balcony door 3540]
    |                                             |                *salon chandelier (3420)
    |      |S1|                   |S2|            |      ________________/HUB\________________
    |      |  |                   |  |            |     ((  fight lane  ---- drift -->      ))
    |______|__|___________________|__|____________|     ((  front lane  <--- drift ----     ))
    ============================================== ==================================================
     M = back-wall mirror (8, depth -40)   S = swivel mirror on a stand (fight lane)   mirror wall at 3240 breaks at the phase shift
```

- **Hall (x 2930-3236):** 8 back-wall mirrors `hm1`-`hm8` (each 30 px wide, y 150-270), 2 swivel mirrors `hs1` (x 3010), `hs2` (x 3150) in the fight lane, 40 px tall. The Bell & Sons clock stopped at 3:17 sits between `hm4` and `hm5` (required by the bible). Doors: none during the fight (the entry door locks).
- **Roulette salon (x 3250-3590):** the wheel floor spans x 3260-3580. The hub (x 3400-3440) is a raised fixed platform, top y 248, with spindle cross-handles as ledges at y 226. The rim lip at x 3260 and 3580 is a 6 px step. Two balcony doors (x 3300 and 3540, y 190) on the back wall are crew spawns in phase 3. The salon chandelier (x 3420) hangs over the hub; its chain anchor is on the spindle top (y 120).

### 5.2 Stats

```
stats: { hp: 840, s: 1.1, m: 5, speed: 30, reach: 26, dmg: 12, heavyDmg: 20, poise: 18, windup: 0.32, cd: [0.8, 1.5] }
```

HP by difficulty: 700 / 840 / 920 / 1000. Low poise means he staggers easily, but he has the **Sidestep** reaction: after the hero lands 3 hits in a row (4 on Easy), Brask sidesteps the next hit (0.25 s i-frames) and ripostes with a cane thrust (12). A heavy attack, a sweep or a thrown object breaks this rhythm: he cannot sidestep those.

### 5.3 Move list (boss primitives)

| Move id | Primitive | Telegraph `{t, pose, mark, light, cue}` | Effect | Punish window |
|---|---|---|---|---|
| `cane` | `string({ combos: [['caneJab'], ['caneJab','caneSweep'], ['caneThrust'], ['caneJab','caneJab','caneThrust']] })` | pose: cane raised to the shoulder; t 0.32 | jab 10, thrust 14, low sweep 12 (jump it) | 0.5 s after the last hit |
| `cardFan` | `volley({ proj: 'card', n: 3 (E/M) or 5 (H/W), spread: 12, v: 260, dmg: 7, stick: true })` | pose: fans the cards at the chest; **monocle glint** (white 1-pixel flash at the eye); cue `sfx:monocle_ting`; t 0.45 | cards fly flat; they stick into walls and mirrors (a card that hits a mirror cracks it, 10 HP) | 0.7 s while he draws a new deck |
| `caneHook` | `grab({ range: 36, pull: true, then: ['knee', 'throw'] })` | pose: turns the cane upside down; the silver crook glints; cue `sfx:cane_whoosh_low`; t 0.5 | pulls the hero in, knee (8) and a throw (10, knockdown). Roll breaks it | 1.0 s on a miss (he overbalances) |
| `shuffle` | `hazard('mirrorShuffle')` (gimmick) | all intact mirrors ripple (a wave of light runs along their edges); cue: a riffle shuffle; t 0.6 | Brask and all decoys step into mirrors and come out of random intact mirrors | 0.4 s as each figure re-forms |
| `decoys` | `summon({ kind: 'decoy', n: per difficulty })` (gimmick) | Brask snaps his fingers; mirrors flash; t 0.5 | creates decoys (see 5.4) | none (it is a setup move) |
| `callColour` | `hazard('rouletteCall')` (gimmick) | croupier voice "Rouge!" or "Noir!"; the pockets of that colour glow and hum; floor mark; t 1.1 (E 1.4, W 0.8) | the called pockets shock: 10 damage and a 0.6 s stun to anyone on them, goons and Brask included | n/a |
| `ballRelease` | `hazard('rouletteBall')` (gimmick) | ball clatter on the rim frets, the ball bounces into view on the back lane; t 0.8 | the ball rolls across the fight lane against the spin (see 5.5) | 2.0 s if the ball hits Brask |
| `cardRain` (phase 3) | `volley({ proj: 'card', up: true, n: 12, fallMarks: true })` | pose: throws a whole deck up; 12 small floor marks (red diamonds) appear; t 0.9 | each card hits its mark for 6 | 0.8 s |
| `allIn` (phase 3) | `charge({ windup: 0.7, v: 240, maxT: 1.2, wallStun: 1.8, spin: true })` | pose: cane spins like a propeller; cue: rising wheel rumble; t 0.7 | a spinning cane charge across the wheel, 16 damage and knockdown; the drift adds to or slows his speed | 1.8 s if he hits the hub or the rim lip |
| `taunt` | `taunt({ t: 1.0 })` | flips a gold chip and catches it | no damage | 1.0 s (a free opening, used only when the hero is far) |

### 5.4 Phase 1: the hall of mirrors (100% to 65%)

- **Moves:** `{ cane: 3, cardFan: 3, caneHook: 1, shuffle: 2 }`. He opens with `decoys` and repeats `decoys` when fewer than half of his decoys remain and the cooldown (10 s) is over.
- **The mirror decoy gimmick in detail:**
  - A **decoy** is an actor with `decoy: { owner: brask, pane: 'hmN' }`. It is anchored to one intact mirror and stays within 80 px of it.
  - Count: 2 / 3 / 4 / 5 by difficulty, never more than intact mirrors minus 1.
  - Decoys run the same brain as Brask with a 0.15 s delay and a random move choice, so they are not perfect copies. Their cards are real but do half damage (full on Wicked). Their cane hits do 6. Decoys cannot `caneHook`.
  - Any hit kills a decoy: it shatters like glass (no blood, a mirror-shard burst) and its mirror cracks. Hitting a decoy costs the player time, and on Hard and Wicked the real Brask throws a free card at the hero at that moment ("Wrong card, Grave.").
  - **Breaking a mirror** (40 HP: one heavy hit, two light hits, one bullet, one card) kills the decoy anchored to it. Swivel mirrors also block cards and bullets until they break.
  - **The tells for the real Brask** (always all three, so each player can use one):
    1. **Only the real Brask has a reflection.** Decoys show no reflection in intact mirrors. This uses the existing glass-reflection pass with a per-actor flag.
    2. **Only the real Brask casts a floor shadow** under the mirror edge lights.
    3. **Only the real Brask bleeds.** After his first hit, his white tuxedo has a red stain that stays.
    - On Easy, decoys are also 25% transparent.
  - As mirrors break, the room gets darker (each mirror's edge light dies), and tell 1 gets weaker, so the player must switch to tells 2 and 3. This is the escalation.
- **Crew:** none. The decoys are the crew.
- **Phase shift:** when HP <= 65% or 2 or fewer mirrors remain intact. If the mirrors run out first, Brask is at the HP he has; the next phases are not shorter.
- **Shift scene (`phaseShift`, 3 s, hero is invulnerable):** all decoys shatter at once. Brask backs to x 3236 and says "The house changes tables." He smashes the mirror wall with his cane. The wall breaks in bullet time (0.3x for 1.2 s, glass toward the camera). The arena bounds move to 3250-3590; the hall door behind locks. The croupier at the wheel spins it.

### 5.5 Phase 2: the roulette floor (65% to 30%)

- **Moves:** `{ cane: 3, cardFan: 2, caneHook: 2, callColour: 2, ballRelease: 1 }`. Big-move timer: one gimmick move every `[6, 9]` s (E `[8, 11]`, W `[4.5, 7]`).
- **The roulette floor in detail:**
  - **Spin = lane drift.** The wheel floor is one surface with two drift speeds by lane, the way a disc seen from the side moves: the fight lane (the far half of the wheel) drifts one way, the front lane (the near half) drifts the other way. Drift moves the hero, goons, Brask, dropped weapons, thrown objects and bodies (ragdolls). Speed: 14 / 20 / 24 / 28 px/s in phase 2. The hub does not drift.
  - **Reversal.** Every 12 s the croupier reverses the spin. Telegraph: the ring of bulbs chases the other way for 1.0 s and the wheel groans; then the drift ramps through zero to the new direction over 0.8 s.
  - **Pockets.** 37 pockets, each 16 px wide, red and black in turn, and one green zero. They scroll with the drift of each lane. The hero counts as "on" the pocket under his foot centre.
  - **Colour call (`callColour`).** "Rouge!" or "Noir!": the pockets of that colour glow for the telegraph time, then shock (10, 0.6 s stun). The **green zero** never shocks. Goons on the wheel and Brask himself are also shocked, so the player can kick a goon onto a lit pocket or bait Brask into one (he avoids lit pockets, but a sweep or a knockdown can leave him on one).
  - **The ball (`ballRelease`).** An 18 px steel ball. It runs on the back-wall lane along the rim (visible, harmless), clatters on the frets (telegraph 0.8 s), then drops into the fight lane at one rim lip and rolls across against the spin at 160 px/s, bouncing twice. It deals 14 and a knockdown. Jump it or roll through it (roll i-frames work). It hits anyone in the fight lane, Brask included: a ball hit stuns him for 2.0 s. It leaves at the other lip and goes back onto the rim.
  - **The hub.** The fixed centre platform (top y 248). Brask likes it in phase 2: from the hub he throws `cardFan` down at both sides. The hero can ledge-climb the spindle handles (y 226) or jump up from the wheel to knock him off; Brask on the hub cannot `caneHook`.
  - **Blood on the wheel** stains a separate scrolling stain layer, so the stains turn with the wheel (a strong image; see section 8).
- **Crew (phase 2):** Rake croupiers from the wheel's rim edges (x 3262 and 3578), every 7 s, alive max 1 / 2 / 2 / 3. They are affected by drift and shocks like everyone else.

### 5.6 Phase 3: All In (below 30%)

- **onEnter:** `roar` replaced by an `allIn` taunt: Brask throws his monocle away and says "All in." Stats change `{ speed: 34, cd: [0.5, 1.1], windup: 0.26 }`. Drift goes to 24 / 36 / 42 / 48 px/s. The reversal comes every 8 s. The colour call comes every 5-7 s and can now call **both colours in sequence** (red, then black 1.0 s later): only the zero and the hub are fully safe.
- **Moves:** `{ cane: 2, cardFan: 2, cardRain: 2, allIn: 2, caneHook: 1, callColour: 2, ballRelease: 2 }`.
- **Crew (phase 3):** Pit Bosses from the balcony doors (y 190), every 9 s, alive max 1 / 1 / 2 / 2. They fire down from the balcony; a card sharp can replace one on Wicked.
- **The salon chandelier (a one-time player weapon).** Its chain anchor is on the spindle top. When the hero hits the anchor (a blade throw from the wheel, a shot, or a melee hit from the spindle handles), the chandelier drops after a 0.6 s shadow. If Brask is in the shadow, he takes 12% of his max HP and a 3.0 s stun. It also shatters crystal over the wheel (shard decals scroll with the drift). It works once.
- **Second wind:** as for Malaspina, `{ afterKOs: 2, clearCrew: true }`.

### 5.7 Punish windows (summary)

| Situation | Window |
|---|---|
| After `cardFan` | 0.7 s |
| `caneHook` miss | 1.0 s |
| Decoy and Brask re-forming after `shuffle` | 0.4 s |
| `allIn` into the hub or a rim lip | 1.8 s |
| Ball hits Brask | 2.0 s |
| Brask on a shocked pocket | 0.6 s |
| Chandelier hit | 3.0 s |
| After `cardRain` | 0.8 s |

### 5.8 Difficulty scaling

| | Easy | Medium | Hard | Wicked |
|---|---|---|---|---|
| HP | 700 | 840 | 920 | 1000 |
| Decoys | 2 (25% transparent) | 3 | 4 | 5 |
| Decoy card damage | 50% | 50% | 50% | 100% |
| Wrong-decoy punish card | no | no | yes | yes |
| Cards per fan | 3 | 3 | 5 | 5 |
| Drift ph2 / ph3 (px/s) | 14 / 24 | 20 / 36 | 24 / 42 | 28 / 48 |
| Colour call telegraph | 1.4 s | 1.1 s | 1.0 s | 0.8 s |
| Double colour call (ph3) | no | yes | yes | yes |
| Rake crew alive max | 1 | 2 | 2 | 3 |
| Pit Boss crew alive max | 1 | 1 | 2 | 2 |
| Sidestep after hits | 4 | 3 | 3 | 3 |

All other telegraph times scale by `t / sqrt(A)` as the framework says, with the floor values above as fixed overrides.

### 5.9 Defeat sequence

1. HP 0: the finisher plays (hero's current weapon finisher) and ends on the standard **slow-motion freeze frame**: Brask in the air above the wheel, cards and chips suspended around him, the monocle glass cracking.
2. In-engine (4 s, input locked): all crew flee. The wheel slows from its speed to zero over 3 s. Brask lies across the numbers. The ball skips over the pockets and drops into the **green zero** (refinement of the bible's "black 0": in roulette the zero is green; the sound of the ball settling is the last sound of the fight). The croupier whispers "Zéro. La maison gagne." and runs.
3. Cut to the outro panels (section 6).

### 5.10 Boss module skeleton (`src/bosses/brask.js`)

```js
import { defineBoss, string, volley, grab, charge, summon, hazard, taunt } from '../sim/boss/primitives.js';
import { mirrorHall, rouletteFloor } from '../levels/casino/gimmicks.js';

export default defineBoss({
  id: 'brask', name: 'Count Teodor Brask', title: 'Baritone. Owner of the Grand Casino Orfeo', look: 'brask',
  stats: { hp: 840, hpBy: [700, 840, 920, 1000], s: 1.1, m: 5, speed: 30, reach: 26, dmg: 12, heavyDmg: 20,
           poise: 18, windup: 0.32, cd: [0.8, 1.5] },
  reactions: { sidestep: { afterHits: [4, 3, 3, 3], iframes: 0.25, riposte: 'caneThrust', brokenBy: ['heavy', 'sweep', 'thrown'] } },
  intro: { walkTo: 'arena.x0+180', spotlight: false, dialog: 'brask_intro', t: 1.5 },
  moves: {
    cane:     string({ combos: [['caneJab'], ['caneJab', 'caneSweep'], ['caneThrust'], ['caneJab', 'caneJab', 'caneThrust']] }),
    cardFan:  volley({ proj: 'card', n: [3, 3, 5, 5], spread: 12, v: 260, dmg: 7, stick: true,
                       tel: { t: 0.45, pose: 'fanCards', light: 'monocleGlint', cue: 'sfx:monocle_ting' } }),
    caneHook: grab({ range: 36, pull: true, then: ['knee', 'throw'], tel: { t: 0.5, pose: 'caneInvert', cue: 'sfx:cane_whoosh_low' }, missRecover: 1.0 }),
    decoys:   summon({ kind: 'decoy', n: [2, 3, 4, 5], anchor: 'mirror', cd: 10, tel: { t: 0.5, pose: 'snap', light: 'mirrorFlash' } }),
    shuffle:  hazard('mirrorShuffle', { tel: { t: 0.6, light: 'mirrorRipple', cue: 'sfx:card_riffle' } }),
    callColour:  hazard('rouletteCall', { tel: { t: [1.4, 1.1, 1.0, 0.8], floor: 'pockets', cue: 'voice:croupier_rouge|noir' }, dmg: 10, stun: 0.6 }),
    ballRelease: hazard('rouletteBall', { tel: { t: 0.8, cue: 'sfx:ball_clatter' }, v: 160, dmg: 14, stunBoss: 2.0 }),
    cardRain: volley({ proj: 'card', up: true, n: 12, fallMarks: true, dmg: 6, tel: { t: 0.9, pose: 'deckUp', floor: 'diamonds' } }),
    allIn:    charge({ windup: 0.7, v: 240, maxT: 1.2, wallStun: 1.8, spin: true, tel: { pose: 'caneSpin', cue: 'sfx:wheel_rumble_rise' } }),
    taunt:    taunt({ t: 1.0, pose: 'chipFlip', when: 'heroFar' }),
  },
  phases: [
    { id: 1, gimmick: 'mirrors', moves: { cane: 3, cardFan: 3, caneHook: 1, shuffle: 2 }, open: 'decoys',
      exit: (s) => s.boss.hpK <= 0.65 || s.arena.mirrorsLeft <= 2 },
    { id: 2, enter: 'phase1.exit', onEnter: ['shatterWall', { arena: { x0: 3250, x1: 3590 } }], gimmick: 'roulette',
      moves: { cane: 3, cardFan: 2, caneHook: 2 }, big: { every: [6, 9], pick: { callColour: 0.65, ballRelease: 0.35 } },
      crew: { roles: ['rake'], from: 'rimEdges', every: 7, alive: [1, 2, 2, 3] } },
    { id: 3, enter: { hpBelow: 0.30 }, onEnter: ['allInTaunt', { speed: 34, cd: [0.5, 1.1], windup: 0.26 }],
      moves: { cane: 2, cardFan: 2, cardRain: 2, allIn: 2, caneHook: 1 },
      big: { every: [5, 7], pick: { callColour: 0.6, ballRelease: 0.4 } },
      crew: { roles: ['pitboss'], from: 'balconyDoors', every: 9, alive: [1, 1, 2, 2] } },
  ],
  secondWind: { afterKOs: 2, clearCrew: true },
  gimmick: [mirrorHall, rouletteFloor],
  defeat: { freeze: true, then: 'wheelSlowToZero', outro: 'casino_outro' },
});
```

---

## 6. Cutscene and dialog script

Caption style per the bible: yellowed boxes for voice-over (VO), white balloons for dialogue, a red tint on Choir symbols (the fork, the gold chip).

### 6.1 Opening panels (`casino_intro`)

| # | Panel id | SHOT | TEXT |
|---|---|---|---|
| 1 | `casino_intro_01` | Wide. The casino facade on the river, gold lights blurred by rain. A doorman in a red coat holds an umbrella. The hero walks past it, soaked. | VO: "The Orfeo. Where the Choir washes its money in champagne." |
| 2 | `casino_intro_02` | Medium. The hero puts a gold Choir coin in the doorman's white glove. The doorman's face goes pale under the umbrella. | DOORMAN: "A Choir coin... Sir, the Count is not receiving." |
| 3 | `casino_intro_03` | Over-the-shoulder. The gaming floor: chandeliers, roulette tables, rich guests in evening dress. Four security men in tuxedos touch their earpieces at the same moment. | VO: "Every eye in the room counted me. None of them counted fast enough." |
| 4 | `casino_intro_04` | Close-up. The hero sets the scorched tuning fork on a roulette table, on red 17. The croupier's rake freezes in mid-pull. | HERO: "Get the Count." |
| 5 (new) | `casino_intro_05` | Insert. A dark office lit by a wall of security monitors. A white-gloved hand turns a monocle on its chain. On one screen, the hero at the table. | BRASK (off): "Let him play. The house always wins." |

### 6.2 Mini-boss bark (`cooler_intro`, portrait, no input lock beyond 2 s)

| Speaker | Mood | Line |
|---|---|---|
| COOLER | Bored, cracking his knuckles | "Count says you're bad luck. I'm worse." |
| HERO | Cold | "Prove it." |

### 6.3 Boss intro portrait dialog (`brask_intro`, hall of mirrors; twenty reflections of Brask)

| Speaker | Mood (portrait id) | Line |
|---|---|---|
| BRASK | Smug, adjusting the monocle (`brask_smug`) | "Gentlemen, the house welcomes the Sandman. Do you know what he was, before the grief made him dull?" |
| HERO | Silent (`elias_silent`) | "..." |
| BRASK | Amused, to his reflections (`brask_amused`) | "Twelve years the Conductor's best. Every man he visited went to sleep, and never woke. His favourite lullaby. Now you're just noise, Grave." |
| HERO | Cold (`elias_cold`) | "You paid for the fire." |
| BRASK | Smiling, fanning razor cards (`brask_smiling`) | "I only place bets. The house sets the odds. Which of me will you hit?" |

### 6.4 In-fight barks (boss bar subtitle, voice optional)

| When | Speaker | Mood | Line |
|---|---|---|---|
| Hero hits a decoy (H/W) | BRASK | Amused | "Wrong card, Grave." |
| Phase shift | BRASK | Smug | "The house changes tables." |
| First colour call | CROUPIER | Flat | "Faites vos jeux... Rouge!" |
| Phase 3 | BRASK | Furious, monocle gone (`brask_furious`) | "All in." |
| Ball hits Brask | BRASK | Furious | "Not *my* ball!" |
| Defeat | CROUPIER | Whisper | "Zéro. La maison gagne." |

### 6.5 Terrace scene (in-engine, `casino_terrace`)

See beat 5. Lines: DEALER "I just deal cards, mister." / HERO "Where's the Count." / DEALER "Upstairs. The hall of mirrors. He's never alone in there. Nobody knows which one is him." / HERO "Go home."

### 6.6 End panels (`casino_outro`)

| # | Panel id | SHOT | TEXT |
|---|---|---|---|
| 1 | `casino_outro_01` | The roulette wheel slows. Brask lies across the numbers, monocle cracked, white tuxedo red. The ball drops into the green zero. | BRASK: "The order came from the Board... from the Basses. The hard money goes through Kalt's aquarium." |
| 2 | `casino_outro_02` | Brask's office. On the wall, an old photo: six men in tuxedos, a young hero among them. One face, the man in the middle, is cut out with a razor. A Bell & Sons clock on the desk shows 3:17. | VO: "My old life in one picture. Someone had cut out the man in the middle." |
| 3 | `casino_outro_03` | Exterior, rain. Mags's old green coupé waits at the curb. **Mags** (red hair, leather jacket) leans out of the window. Nero is in the back seat. | MAGS: "Get in. The aquarium's closed. That's when it opens for them." |
| 4 (new) | `casino_outro_04` | Wide. The casino portico behind the car. A payphone on the wall rings and rings. The hero gets in without looking at it. | MAGS: "You gonna get that?" / HERO: "Drive." |

Panel 1 keeps the bible's rule that each boss names the next rank up (the Board, the Basses) and the next level (Kalt's aquarium). Panel 4 keeps the "every level ends with a payphone ringing" thread and adds a small doubt about Hale before Level 6.

---

## 7. Level data skeleton (`src/levels/casino/level.js`)

```js
import { defineLevel } from '../../director/define.js';
import brask from '../../bosses/brask.js';
import cooler from '../../bosses/cooler.js';
import { crapsDive, terraceScene, greatChandelier } from './gimmicks.js';

export default defineLevel({
  id: 'casino', title: 'House Always Wins', order: 3, palette: 'casino', music: 'music:casino',
  size: { W: 3600, H: 320, groundY: 280 },
  sections: [
    { id: 'floor', x0: 0, x1: 1060, indoor: true, weather: 'none', ambient: [0.62, 0.50, 0.36],
      camera: { minZoom: 0.30, maxZoom: 0.60, bounds: [0, 1060] },
      backdrop: [{ type: 'wall', set: 'velvet_red' }, { type: 'image', id: 'bg:casino_windows_rain', parallax: 0.2 }] },
    { id: 'kitchen', x0: 1080, x1: 1580, indoor: true, weather: 'none', ambient: [0.50, 0.58, 0.55],
      camera: { maxZoom: 0.65, bounds: [1080, 1580] }, backdrop: [{ type: 'wall', set: 'tile_white' }] },
    { id: 'terrace', x0: 1600, x1: 1880, indoor: false, weather: 'rain', ambient: [0.35, 0.40, 0.60],
      camera: { minZoom: 0.25, bounds: [1600, 1880] },
      backdrop: [{ type: 'sky', set: 'night_rain' }, { type: 'city', set: 'riverbank_neon' }, { type: 'water', y: 270 }] },
    { id: 'vault', x0: 1900, x1: 2380, indoor: true, weather: 'none', ambient: [0.40, 0.45, 0.42],
      camera: { maxZoom: 0.62, bounds: [1900, 2380] }, backdrop: [{ type: 'wall', set: 'concrete_green' }] },
    { id: 'lobby', x0: 2400, x1: 2900, indoor: true, weather: 'none', ambient: [0.60, 0.52, 0.42],
      camera: { minZoom: 0.28, bounds: [2400, 2900] }, backdrop: [{ type: 'wall', set: 'marble_gold' }] },
    { id: 'hall', x0: 2920, x1: 3240, indoor: true, weather: 'none', ambient: [0.55, 0.58, 0.66],
      camera: { maxZoom: 0.55, bounds: [2930, 3236] }, backdrop: [{ type: 'wall', set: 'marble_bw' }] },
    { id: 'roulette', x0: 3240, x1: 3600, indoor: true, weather: 'none', ambient: [0.50, 0.30, 0.30],
      camera: { minZoom: 0.30, bounds: [3250, 3590] }, backdrop: [{ type: 'wall', set: 'salon_red' }] },
  ],
  scene: { paint: [
    { type: 'casinoWall', x0: 0, x1: 1060, arches: [120, 360, 600, 840], neon: ['red', 'gold'] },
    { type: 'bar', x0: 60, x1: 200, top: 250 },
    { type: 'mezzanine', x0: 220, x1: 760, y: 196, rail: true, banner: 'ORFEO' },
    { type: 'slotRow', x0: 600, x1: 1050, depth: -30, every: 40 },
    { type: 'cashierCage', x0: 980, x1: 1050 },
    { type: 'kitchen', x0: 1080, x1: 1580, hoods: [1180, 1320, 1460], potRail: { x0: 1140, x1: 1540, y: 150 } },
    { type: 'terrace', x0: 1600, x1: 1880, awning: { x0: 1660, x1: 1800, y: 200 }, balustrade: 'front' },
    { type: 'lamp', style: 'lantern', xs: [1640] },
    { type: 'vaultCorridor', x0: 1900, x1: 2150, cage: { x0: 1940, x1: 2110 }, cashierWindows: [2000, 2120] },
    { type: 'countingRoom', x0: 2150, x1: 2380, vaultDoor: 2370 },
    { type: 'mirrorLobby', x0: 2400, x1: 2900, stair: { x0: 2480, x1: 2600 }, gallery: { x0: 2600, x1: 2880, y: 186 } },
    { type: 'mirrorHall', x0: 2920, x1: 3240, clock317: 3080 },
    { type: 'rouletteSalon', x0: 3240, x1: 3600, wheel: { x0: 3260, x1: 3580 }, hub: { x0: 3400, x1: 3440, y: 248 },
      balconyDoors: [3300, 3540] },
  ]},
  ground: [{ x0: 0, x1: 3600 }],
  killY: 330,
  surfaces: [
    { id: 'bar',        x0: 60,   x1: 200,  y: 250, oneWay: true, lane: 'fight' },
    { id: 'mezzanine',  x0: 220,  x1: 760,  y: 196, oneWay: true, lane: 'plat', depth: [-24, -8] },
    { id: 'craps',      x0: 860,  x1: 960,  y: 254, oneWay: true, lane: 'fight', tag: 'divePad' },
    { id: 'slotTops',   x0: 600,  x1: 1050, y: 210, oneWay: true, lane: 'wall' },
    { id: 'counterA',   x0: 1150, x1: 1270, y: 248, oneWay: true, lane: 'fight' },
    { id: 'pass',       x0: 1290, x1: 1370, y: 196, oneWay: true, lane: 'plat' },
    { id: 'range',      x0: 1300, x1: 1350, y: 250, lane: 'fight', hazard: { kind: 'fire', dps: 6 } },
    { id: 'counterB',   x0: 1380, x1: 1500, y: 248, oneWay: true, lane: 'fight' },
    { id: 'awning',     x0: 1660, x1: 1800, y: 200, oneWay: true, lane: 'plat' },
    { id: 'catwalk',    x0: 1960, x1: 2100, y: 192, oneWay: true, lane: 'plat', hatch: 2100 },
    { id: 'gallery',    x0: 2600, x1: 2880, y: 186, oneWay: true, lane: 'plat', depth: [-26, -10] },
    { id: 'hub',        x0: 3400, x1: 3440, y: 248, lane: 'fight', ledges: [{ x: 3404, y: 226 }, { x: 3436, y: 226 }] },
    { id: 'balconyL',   x0: 3290, x1: 3320, y: 190, oneWay: true, lane: 'wall' },
    { id: 'balconyR',   x0: 3530, x1: 3560, y: 190, oneWay: true, lane: 'wall' },
    { id: 'wheel',      x0: 3260, x1: 3580, y: 280, lane: 'fight', spinFloor: 'wheel' },
  ],
  stairs: [{ type: 'grand', x0: 2480, x1: 2600, flights: 1, topY: 186 }],
  walls: [
    { x: 1070, y0: 0, y1: 280, id: 'kitchenDoor' }, { x: 1590, y0: 0, y1: 280, id: 'terraceDoor' },
    { x: 1890, y0: 0, y1: 280, id: 'serviceDoor', lock: 'vaultCard' }, { x: 2150, y0: 0, y1: 280, id: 'innerGate' },
    { x: 2390, y0: 0, y1: 280, id: 'vaultLift' }, { x: 2910, y0: 0, y1: 280, id: 'salonDoor' },
    { x: 3240, y0: 0, y1: 280, id: 'mirrorWall', breakOn: 'boss:phase2' }, { x: 3596, y0: 0, y1: 280, id: 'end' },
  ],
  movers: [
    { id: 'wheel', kind: 'spinFloor', x0: 3260, x1: 3580, hubX: [3400, 3440], pockets: { n: 37, w: 16, zero: 18 },
      drift: { fight: +1, front: -1 }, speed: 0, mode: 'onTrigger', model: 'roulette_wheel' },
  ],
  panes: [
    { id: 'cashier1', x0: 2000, y0: 200, x1: 2055, y1: 250, hp: 100, kind: 'window', crackStages: 3, depth: -6 },
    { id: 'cashier2', x0: 2065, y0: 200, x1: 2120, y1: 250, hp: 100, kind: 'window', crackStages: 3, depth: -6 },
    { id: 'axeCase',  x0: 1832, y0: 220, x1: 1850, y1: 250, hp: 10, kind: 'window', depth: -38, contains: 'axe' },
    { id: 'katanaCase', x0: 510, y0: 170, x1: 530, y1: 196, hp: 10, kind: 'window', depth: -20, contains: 'katana' },
    // lobby: 10 back-wall mirrors + 3 pillars
    ...[2420, 2468, 2516, 2564, 2612, 2660, 2708, 2756, 2804, 2852].map((x, i) =>
      ({ id: `lm${i + 1}`, x0: x, y0: 120, x1: x + 40, y1: 270, hp: 40, kind: 'mirror', depth: -40, onBreak: 'shards' })),
    ...[2520, 2640, 2760].map((x, i) =>
      ({ id: `lp${i + 1}`, x0: x, y0: 200, x1: x + 18, y1: 280, hp: 60, kind: 'mirror', depth: 0, blocks: ['bullet', 'card'], onBreak: 'shards' })),
    // hall: 8 back-wall mirrors + 2 swivel mirrors
    ...[2944, 2980, 3016, 3052, 3108, 3144, 3180, 3206].map((x, i) =>
      ({ id: `hm${i + 1}`, x0: x, y0: 150, x1: x + 28, y1: 270, hp: 40, kind: 'mirror', depth: -40, onBreak: 'shards', anchor: true })),
    { id: 'hs1', x0: 3010, y0: 236, x1: 3030, y1: 280, hp: 40, kind: 'mirror', depth: 0, blocks: ['bullet', 'card'], anchor: true },
    { id: 'hs2', x0: 3150, y0: 236, x1: 3170, y1: 280, hp: 40, kind: 'mirror', depth: 0, blocks: ['bullet', 'card'], anchor: true },
  ],
  hanging: [
    { id: 'chand1', x: 420, chainTop: 24, body: [96, 128], chainHp: 20, crush: { r: 60, dmg: 40 }, light: true },
    { id: 'chand2', x: 660, chainTop: 24, body: [96, 128], chainHp: 20, crush: { r: 60, dmg: 40 }, light: true },
    { id: 'chand3', x: 900, chainTop: 24, body: [96, 128], chainHp: 20, crush: { r: 60, dmg: 40 }, light: true },
    { id: 'great',  x: 2700, chainTop: 20, body: [80, 140], tie: { x: 2860, y: 186, hp: 15 }, crush: { r: 90, dmg: 60, panes: ['lm6', 'lm7', 'lm8'] }, light: true },
    { id: 'salon',  x: 3420, chainTop: 20, body: [90, 130], anchor: { x: 3420, y: 120, hp: 15 }, crush: { r: 70, bossPct: 0.12, stun: 3 }, armed: 'boss:phase3' },
  ],
  lights: [
    { x: 420, y: 112, r: 140, rgb: [255, 214, 150], flicker: 0, hang: 'chand1' },
    { x: 660, y: 112, r: 140, rgb: [255, 214, 150], flicker: 0, hang: 'chand2' },
    { x: 900, y: 112, r: 140, rgb: [255, 214, 150], flicker: 0, hang: 'chand3' },
    { x: 1250, y: 60, r: 120, rgb: [210, 240, 230], flicker: 0.3 }, { x: 1325, y: 250, r: 70, rgb: [255, 140, 40], flicker: 0.5 },
    { x: 1640, y: 200, r: 90, rgb: [255, 180, 90], flicker: 0.1 },
    { x: 2040, y: 160, r: 110, rgb: [180, 220, 180], flicker: 0 }, { x: 2260, y: 120, r: 160, rgb: [255, 40, 40], flicker: 'spin' },
    { x: 2700, y: 110, r: 220, rgb: [255, 220, 170], flicker: 0, hang: 'great' },
    { x: 3420, y: 110, r: 180, rgb: [255, 90, 70], flicker: 0, hang: 'salon' },
  ],
  props: [
    ['chair', 250, 280], ['chair', 330, 280], ['chair', 520, 280], ['chair', 590, 280],
    ['cardTable', 300, 280], ['cardTable', 470, 280], ['cardTable', 700, 280], ['cardTable', 760, 280],
    ['rouletteTable', 380, 280], ['rouletteTable', 560, 280], ['crapsTable', 860, 280],
    ['chips', 380, 256], ['chips', 560, 256], ['chips', 300, 262], ['chips', 900, 254],
    ['bottle', 90, 250], ['bottle', 120, 250], ['bottle', 150, 250],
    ['bin', 1120, 280], ['bin', 1560, 280], ['barrel', 1530, 280], ['pot', 1200, 248], ['pot', 1440, 248], ['trolley', 1240, 280],
    ['cafeTable', 1760, 280], ['chair', 1720, 280], ['bottle', 1700, 200], ['bottle', 1730, 200],
    ['cashCart', 1960, 280], ['cashCart', 2020, 280], ['cashCart', 2280, 280], ['countTable', 2210, 280], ['countTable', 2310, 280],
    ['brassPost', 2440, 280], ['brassPost', 2490, 280], ['ottoman', 2580, 280], ['chair', 2820, 186],
  ],
  pickups: [
    { w: 'katana', x: 520, stand: 'case', pane: 'katanaCase' },
    { w: 'pistols', x: 870, stand: 'drawer' },
    { w: 'axe', x: 1840, stand: 'case', pane: 'axeCase' },
    { w: 'shotgun', x: 1920, stand: 'rack' },
    { w: 'machinegun', x: 2340, stand: 'locker', when: { killed: 'cooler' } },
    { kind: 'bandage', x: 150, diff: ['Easy'] }, { kind: 'bandage', x: 1330, y: 196 }, { kind: 'bandage', x: 1760 },
    { kind: 'bandage', x: 2300, when: { killed: 'cooler' } }, { kind: 'bandage', x: 2600, y: 186 }, { kind: 'bandage', x: 2890, diff: ['Easy'] },
    { kind: 'ammo', x: 920 }, { kind: 'ammo', x: 1770 }, { kind: 'ammo', x: 2050, y: 192 },
  ],
  start: { x: 360, section: 'floor', cutscene: 'casino_intro' },
  objectives: [{ id: 'count', text: 'Find the Count.' }],
  waves: {
    w1:  { at: [20, 230], roles: { Easy: ['tux', 'tux', 'croupier'], Medium: ['tux', 'tux', 'croupier', 'croupier'],
                                   Hard: ['tux', 'tux', 'tux', 'croupier', 'croupier'], Wicked: ['tux', 'tux', 'tux', 'croupier', 'croupier', 'croupier'] },
           alive: [3, 3, 4, 5], from: 'nearestDoor' },
    w2a: { at: [300, 700], y: 196, roles: { Easy: ['pitboss'], Medium: ['pitboss', 'sharp'], Hard: ['pitboss', 'pitboss', 'sharp'], Wicked: ['pitboss', 'pitboss', 'sharp', 'sharp'] } },
    w2b: { at: [20, 780], roles: { Easy: ['tux'], Medium: ['tux', 'tux', 'rake'], Hard: ['tux', 'tux', 'rake'], Wicked: ['tux', 'tux', 'tux', 'rake'] }, delay: 6 },
    w3:  { at: [1000, 1030, 1050], roles: { Easy: ['pitboss', 'pitboss', 'sharp', 'tux'], Medium: ['pitboss', 'pitboss', 'sharp', 'tux'],
                                            Hard: ['pitboss', 'pitboss', 'pitboss', 'sharp', 'sharp', 'tux', 'tux'], Wicked: ['pitboss', 'pitboss', 'pitboss', 'sharp', 'sharp', 'tux', 'tux', 'tux'] },
           alive: [4, 4, 6, 7], from: 'cashierCage' },
    w4a: { at: [1570], roles: { Easy: ['cook', 'cook'], Medium: ['cook', 'cook', 'tux'], Hard: ['cook', 'cook', 'cook', 'tux'], Wicked: ['cook', 'cook', 'cook', 'tux', 'tux'] } },
    w4b: { at: [1330, 1570], roles: { Easy: ['sharp', 'croupier'], Medium: ['sharp', 'croupier'], Hard: ['sharp', 'sharp', 'croupier'], Wicked: ['sharp', 'sharp', 'croupier', 'croupier'] },
           when: { killedPct: { w4a: 0.5 } } },
    w6:  { at: [2010, 2080, 2140], roles: { Easy: ['pitboss', 'pitboss', 'tux'], Medium: ['pitboss', 'pitboss', 'tux', 'tux'],
                                            Hard: ['pitboss', 'pitboss', 'tux', 'tux', 'sharp'], Wicked: ['pitboss', 'pitboss', 'pitboss', 'tux', 'tux', 'tux', 'sharp'] } },
    w8:  { at: [2530, 2650, 2400], roles: { Easy: ['pitboss', 'tux', 'tux'], Medium: ['pitboss', 'tux', 'tux', 'croupier'],
                                            Hard: ['pitboss', 'pitboss', 'tux', 'tux', 'tux', 'croupier'], Wicked: ['pitboss', 'pitboss', 'tux', 'tux', 'tux', 'croupier', 'croupier'] } },
    w9a: { at: [2700, 2860], y: 186, roles: { Easy: ['sharp'], Medium: ['sharp', 'sharp', 'pitboss'], Hard: ['sharp', 'sharp', 'pitboss'], Wicked: ['sharp', 'sharp', 'sharp', 'pitboss', 'pitboss'] } },
    w9b: { at: [2400, 2900], roles: { Easy: ['tux', 'tux', 'rake'], Medium: ['tux', 'tux', 'tux', 'rake'],
                                      Hard: ['tux', 'tux', 'tux', 'rake', 'rake'], Wicked: ['tux', 'tux', 'tux', 'tux', 'rake', 'rake'] }, delay: 5 },
  },
  triggers: [
    { when: { cutsceneDone: 'casino_intro' }, do: [{ spawnWave: 'w1' }, { crowd: 'panic', n: 18, exits: [20, 230, 1070] }] },
    { when: (s) => s.hero.x >= 600 || s.waveDone('w1', 3), do: [{ spawnWave: 'w2a' }, { spawnWave: 'w2b' }] },
    { when: { heroX: '>=800' }, do: [{ spawnWave: 'w3' }, { arm: 'divePad', fn: crapsDive }] },
    { when: { heroX: '>=1060', killed: 'w3' }, do: { transition: { to: 'kitchen', fade: true } } },
    { when: { inSection: 'kitchen' }, do: { spawnWave: 'w4a' } },
    { when: { heroX: '>=1580', killed: ['w4a', 'w4b'] }, do: { transition: { to: 'terrace', fade: true } } },
    { when: { inSection: 'terrace' }, do: [{ music: 'music:casino_terrace' }, { scene: terraceScene }] },
    { when: { heroX: '>=1880', has: 'vaultCard' }, do: { transition: { to: 'vault', fade: true } } },
    { when: { inSection: 'vault' }, do: [{ spawnWave: 'w6' }, { light: { id: 'alarm', on: true } }] },
    { when: { heroX: '>=2180', killed: 'w6' }, do: [{ lock: 'innerGate' }, { miniboss: cooler, dialog: 'cooler_intro' }] },
    { when: { killed: 'cooler' }, do: [{ open: 'vaultLift' }] },
    { when: { heroX: '>=2380', killed: 'cooler' }, do: { transition: { to: 'lobby', fade: true } } },
    { when: { inSection: 'lobby' }, do: [{ camera: { holdOn: 'lobbyMirrors', t: 1.5 } }, { spawnWave: 'w8' }] },
    { when: (s) => s.hero.x >= 2640 || s.waveDone('w8'), do: [{ spawnWave: 'w9a' }, { spawnWave: 'w9b' }, { arm: 'great', fn: greatChandelier }] },
    { when: { heroX: '>=2900', killed: ['w9a', 'w9b'] }, do: [{ transition: { to: 'hall', fade: true } }, { boss: 'start' }] },
    { when: { bossDefeated: true }, do: [{ cutscene: 'casino_outro' }, { results: true }] },
  ],
  boss: { module: brask, arena: { section: 'hall', x0: 2930, x1: 3236, doors: [], next: { section: 'roulette', x0: 3250, x1: 3590, doors: [3262, 3578, 3300, 3540] } },
          intro: 'brask_intro', crew: { roles: ['rake', 'pitboss'], every: 7, max: 8 } },
  cutscenes: { intro: 'casino_intro', outro: 'casino_outro' },
  dialog: { brask_intro: 'see dialog.js', cooler_intro: 'see dialog.js', casino_terrace: 'see dialog.js' },
  assets: ['panel:casino_*', 'portrait:brask_*', 'portrait:cooler_*', 'portrait:elias_*', 'music:casino*', 'music:brask*',
           'sfx:card_*', 'sfx:chip_*', 'sfx:mirror_*', 'sfx:chandelier_*', 'sfx:roulette_*', 'voice:croupier_*', 'bg:casino_*'],
});
```

New schema keys used here (to add to `defineLevel`): `hanging`, `surfaces[].hazard`, `surfaces[].spinFloor`, `surfaces[].ledges`, `walls[].lock` and `breakOn`, `panes[].blocks`, `contains`, `crackStages`, `anchor`, `waves[].roles` keyed by difficulty, `waves[].alive`, actions `crowd`, `arm`, `scene`, `music`, `light`, `lock`, `open`, `miniboss`, `camera.holdOn`, trigger keys `cutsceneDone`, `has`, `killedPct`, `bossDefeated`.

---

## 8. Engine features this level needs

| # | Feature | One-line spec | Shared with |
|---|---|---|---|
| 1 | **Breakable mirror panes** | `panes` with `kind: 'mirror'`: draw a live reflection of actors (reuse `glassReflect` with a per-pane flip), HP, crack stages, shatter into shard particles, a floor shard decal (+4 damage on knockdown), emit `glass:break`, kill the pane's edge light. | L8 (mirrored lobby), L4, L5, L6, L7 (all glass levels use panes) |
| 2 | **Standing panes as cover** | `panes[].blocks: ['bullet','card']` in the fight lane: a pane stops projectiles and actors until it breaks. | L4 tank walls, L5 isolation wards, L7 observation car |
| 3 | **Crack stages** | `crackStages: n` draws n crack overlays as HP drops (bulletproof cashier glass). | L4 (tunnel cracks), L5, L8 glass floor |
| 4 | **Decoy actors** | Enemy flag `decoy: { owner, pane }`: runs the owner's brain on a 0.15 s delay with random picks, hp 1, no blood, no reflection, no shadow, shatters like glass, dies when its pane breaks. | L3 only (could serve a Bell illusion in L8) |
| 5 | **Per-actor reflection and shadow flags** | `actor.reflect` and `actor.shadow` booleans read by `reflectPass` and the shadow draw, in 2D and 3D. | Any level with glass |
| 6 | **Mirror shuffle** | Boss gimmick action: the boss and decoys fade into a pane and re-form at another intact pane (0.4 s re-form with i-frames off). | L3 only |
| 7 | **Spinning floor** | `spinFloor` surface: lane-based drift (`fight` +v, `front` -v) applied to hero, enemies, boss, objects, ragdolls and pickups; speed curve with smooth reversal; a fixed hub; scrolling pocket tiles (37 x 16 px, red/black/green). | L8 gear platforms (rotating), L1 conveyor (generic surface drift) |
| 8 | **Floor telegraph zones with damage** | `hazards.zones` entries with a pattern mask (here: pockets of one colour, scrolling with the floor), telegraph glow, then a damage pulse that hits all actors. | L2 third rail, L6 sniper dots, L8 bell shockwave rings |
| 9 | **Rolling hazard** | A `roller` actor: radius, speed, lane, bounces, damages and knocks down all actors it touches, jumpable, roll i-frames apply; can travel on a non-lethal back lane. | L2 runaway cart, L8 gear teeth |
| 10 | **Scrolling stain layer** | Blood and shard decals on a spinning floor live in their own buffer that scrolls with the drift instead of in `stat`. | L7 train roof (stains that move with the train), L8 gears |
| 11 | **Chandelier drop (hanging props)** | `hanging` entries: a body on a chain or tie with HP; on break, a shadow telegraph, a fall, crush damage in a radius (enemies, boss percent, hero only inside the shadow), shard decals, the attached light goes out, optional panes it breaks. | L6 ballroom, L8 lobby; also a hanging tuna rig in L1 could reuse it |
| 12 | **Flippable cover tables** | Object kind `cardTable`: hit or kick it to flip; flipped, it blocks bullets and cards from one side; Pit Bosses path to it; it can be lifted and thrown when flipped. | L7 dining car, L6 gala tables |
| 13 | **Goon cover AI** | A brain option `useCover`: the ranged goon picks the nearest cover object or pane within 60 px and fires from behind it. | L6, L7 (the gunfight levels) |
| 14 | **Hero akimbo pistols** | Weapon `pistols`: two guns, alternating shots, 2 x 12 rounds, tops up from goon pistol drops; aim assist cone 25°; empty guns can be hurled like the others. | L7 (biggest gunfight), L8 |
| 15 | **Bullet-time dive pad** | Action `arm: 'divePad'`: a jump or roll that leaves a tagged surface with a gun starts `timeScale 0.3` for 1.8 s real time or until landing, with suspended particles, an audio low-pass and a recharge timer. | Every level's slow-motion set piece (L1 ice slide, L2 train gap, L5 glass dive, L7 car jump) |
| 16 | **Card projectile** | `proj: 'card'` for `volley` and the `sharp` goon: flat flight, sticks into walls and panes as a decal, damages panes. | L3 only (generic sticky projectile shared with L2 rail spikes, L4 harpoons) |
| 17 | **Pocketable chip stacks** | Pocket kind `chips`: a throw that bursts into chips (light stun 0.3 s); chips on the floor make knocked-down goons slide. | L3 only (data on the existing pocket system) |
| 18 | **Fire zone hazard** | A surface `hazard: { kind: 'fire', dps }` with a burning stagger; a thrown oil barrel makes a short flare. | L2 (burning drums), L6 (braziers) |
| 19 | **Crowd panic** | Extend the club crowd: civilians in evening dress flee toward exit x values, scream on `hit` events, do not block hits, and are never damaged. | L6 gala, L8 opening night |
| 20 | **Locked doors and key items** | `walls[].lock` and a key pickup (`vaultCard`) from an in-engine scene. | L4, L5 (key cards, ward doors) |
| 21 | **Breakable wall on a boss event** | `walls[].breakOn: 'boss:phase2'` removes the wall in a scripted shatter and moves the arena bounds. | L4 (tunnel to catwalk), L8 (clock face) |
| 22 | **3D: mirrors and wheel** | 3D-only: mirror planes render the scene with a cheap flipped copy of the fighters behind the plane (respecting `reflect` flags); a lathe-built roulette wheel mesh with a rotating pocket texture tied to the sim drift. | Mirrors: L8 lobby |

---

## 9. Art and audio asset list

### 9.1 Cutscene panels (1024 x 576 WebP, `assets/art/panels/casino/`)

| Id | Content |
|---|---|
| `casino_intro_01` | Facade on the river in rain, red-coat doorman with umbrella, hero walking past |
| `casino_intro_02` | Gold Choir coin in a white glove, the doorman's pale face |
| `casino_intro_03` | Gaming floor over the shoulder, chandeliers, guests, 4 tuxedo guards touching earpieces |
| `casino_intro_04` | Close-up: tuning fork on red 17, the croupier's rake frozen |
| `casino_intro_05` | Security office, wall of monitors, white glove turning a monocle |
| `casino_outro_01` | Slowing wheel, Brask on the numbers, cracked monocle, ball in the green zero |
| `casino_outro_02` | Office wall: photo of six men in tuxedos, young Elias, the middle face cut out; Bell & Sons clock at 3:17 on the desk |
| `casino_outro_03` | Mags's green coupé at the curb in rain, Mags leaning out, Nero in the back |
| `casino_outro_04` | Wide: the car at the portico, a payphone ringing on the wall, the hero getting in |

### 9.2 Portraits (512 x 512 WebP)

| Id | Use |
|---|---|
| `brask_smug` | Intro line 1, phase shift bark |
| `brask_amused` | Intro line 3, "Wrong card" bark |
| `brask_smiling` | Intro line 5 (fanning cards) |
| `brask_furious` | Phase 3 "All in", ball bark (monocle gone, hair loose) |
| `brask_beaten` | Optional, outro dialog if a portrait is used instead of the panel balloon |
| `cooler_bored` | Mini-boss bark |
| `elias_silent`, `elias_cold` | Shared with all levels (already planned) |
| `dealer_scared` | Terrace scene (optional; the scene can run with balloons only) |

Character reference images needed: `brask/ref.png` (white tuxedo, monocle, silver hair, cane), `cooler/ref.png`, `mags/ref.png` (shared with L4-L5 and the hub).

### 9.3 In-game art (pixel, code-drawn)

- Goon looks: `tux`, `croupier` (red waistcoat), `rake`, `sharp` (grey suit), `pitboss` (dark red jacket), `cook`, plus the `cooler` and `brask` bodies; Brask's cane and card sprites; decoy shader (silver tint, no shadow).
- Painters: `casinoWall`, `mezzanine`, `slotRow`, `cashierCage`, `kitchen`, `terrace`, `vaultCorridor`, `countingRoom`, `mirrorLobby`, `mirrorHall`, `rouletteSalon` (wheel, hub, pocket strip, bulb ring), the Bell & Sons clock at 3:17.
- Props: card table (upright, flipped), roulette table, craps table, slot machine (intact, broken), chip stack, cash cart, counting table, trolley, stock pot, brass post, ottoman, café table, chandeliers (small, great, salon), glass display case.
- Backdrop: `bg:casino_windows_rain` (arched windows with rain and river neon), `bg:casino_riverbank` (terrace far bank).

### 9.4 Music cues (`assets/audio/music/`)

| Id | Use |
|---|---|
| `casino` | Lounge jazz base, sections A, B, D, E |
| `casino_fight` | Fight layer (sax, toms), crossfades in on wave spawn |
| `casino_slowmo` | Low-pass heartbeat bed for bullet time (could be a shared `slowmo` cue) |
| `casino_terrace` | Rain and a muted trumpet from a radio |
| `cooler` | Short heavy loop for the mini-boss (bass and kick) |
| `brask_hall` | Tango with harpsichord, phase 1 |
| `brask_wheel` | Tango with full bandoneon and ball-clatter percussion, phase 2 |
| `brask_allin` | Strings join, tempo up, phase 3 |
| `casino_end` | Solo piano over rain for the outro panels |

### 9.5 SFX (`assets/audio/sfx/`)

`card_fwip`, `card_thud` (into wood), `card_glass` (into a mirror), `card_riffle`, `chip_spill`, `chip_clatter`, `chip_throw`, `table_flip`, `slot_break` (jackpot bells), `slot_spin`, `champagne_pop`, `glass_case_break`, `mirror_crack`, `mirror_shatter` (higher than the window shatter, with a long tinkle tail), `mirror_ripple` (shuffle telegraph), `chandelier_chain_snap`, `chandelier_fall_whistle`, `chandelier_crash`, `crystal_tinkle`, `monocle_ting`, `cane_whoosh`, `cane_whoosh_low`, `cane_spin`, `roulette_ball_clatter`, `roulette_ball_roll`, `roulette_ball_settle`, `roulette_wheel_rumble`, `roulette_wheel_rumble_rise`, `roulette_reverse_groan`, `pocket_hum`, `pocket_zap`, `gas_whoomph`, `fire_loop`, `pot_clang`, `trolley_roll`, `cash_cart_roll`, `money_counter_whirr`, `bills_burst`, `vault_door_bell` (the Cooler's charge into the door), `vault_door_roll`, `alarm_bell`, `pa_chime`, `crowd_scream_posh`, `crowd_run_heels`, `rain_awning`, `river_lap`.

### 9.6 Voice (`assets/audio/voice/`, optional)

`croupier_faites_vos_jeux`, `croupier_rouge`, `croupier_noir`, `croupier_rien_ne_va_plus`, `croupier_zero`, `pa_security_discreet`, `brask_intro_01`-`05`, `brask_wrong_card`, `brask_changes_tables`, `brask_all_in`, `brask_not_my_ball`, `cooler_intro_01`, `dealer_terrace_01`-`03`.
