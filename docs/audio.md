# Audio plan

Status: first pass (music candidates, procedural sfx, voice lines for the prologue and the Level 1 boss intro).
Audition everything on **`tests/audio.html`** (serve the repo root with `python3 -m http.server 8765`).

## 1. Three sources

| Kind | Made with | Where it runs | Output |
|---|---|---|---|
| Music | ACE-Step v1 3.5B through the local ComfyUI (`tools/music.py`) | offline, on the dev machine | `assets/audio/music/<id>_s<seed>.ogg` (+ `.loop.ogg`) |
| Sound effects | WebAudio synthesis (`src/audio/sfx.js`) | in the browser, at play time | no files |
| Voice | F5-TTS (MLX) voice cloning (`tools/voice.py`), checked with whisper.cpp | offline | `assets/audio/voice/<id>.ogg` |

All files are Ogg Opus (48 kHz). Music: stereo 160 kbit/s, -16 LUFS integrated, true peak -1.5 dB. Voice: mono 64 kbit/s, -18 LUFS (-16 for shouted lines).
Safari plays Ogg Opus from Safari 17 (macOS 14 / iOS 17). If older Safari matters, add an `.m4a` (AAC) export to `encode()` in `tools/music.py`.

## 2. File layout and naming

```
assets/prompts/audio_music.json      music jobs (tags, lyrics, seconds, seeds, loop, xfade)
assets/prompts/audio_voice.json      voices (reference recipe), moods, lines
assets/audio/music/<id>_s<seed>.ogg       full track, ends with a short fade
assets/audio/music/<id>_s<seed>.loop.ogg  seamless loop (tail cross-faded into the head, no fades)
assets/audio/music/index.json             every candidate with duration, peak, RMS, silent share
assets/audio/voices/<speaker>/ref.wav     fixed reference clip of a character (24 kHz mono) + ref.txt transcript
assets/audio/voice/<id>.ogg               one line of dialog or voice-over
assets/audio/voice/index.json             every line with text, whisper transcript and word error rate
assets/audio/.cache/                      raw ComfyUI FLAC and raw TTS WAV (git-ignored)
src/audio/sfx.js        createSfx(ctx) -> { play(name, {vol, pan, pitch, when}), names, output }
src/audio/manifest.js   the picked seed per music id, cue -> id map, url helpers
src/audio/audio.js      createAudio(): buses, music cross-fade, slow motion, voice with ducking, bind(bus)
tests/audio.html        test bench: a button per sound, per music candidate, per voice line
```

Ids follow the level docs: music `music:docks_explore` -> file id `docks_explore`; voice `voice:marchetti_intro_01` -> `marchetti_intro_01.ogg`.
Voice ids are `<scene>_<nn>`, numbered by dialog line (Elias's replies are in the same sequence), so `marchetti_intro_01..05` covers the whole boss intro (the level doc's `01..03` counted only Marchetti's lines).

## 3. How the game loads and plays audio (event bus, architecture 2.5)

The simulation never calls audio. `audio.bind(bus, { panOf, sectionMusic })` subscribes to events:

| Event | Sound |
|---|---|
| `hit` | `blade_hit` if `blade`, else `punch_heavy` when `power > 1`, else `punch_light`; pan from `x` |
| `hurt` | `punch_heavy` if `heavy`, else `punch_light` |
| `ko` | `ko_thud` |
| `kill` | `body_fall` 0.25 s later |
| `pickup` | `bandage` when `kind === 'bandage'`, else `pickup` |
| `glass:break` | `glass_large` when the pane area > 2400 px², else `glass_small` |
| `object:break` | `crate_break` |
| `sfx` `{name, x, vol, pitch}` | any sfx by name (generic hook for shots, footsteps, dodges, UI) |
| `music` `{id}` / `{}` | play a music id or cue (`music:docks_explore`) / stop |
| `section:enter` | `sectionMusic[to]` if given |
| `boss:intro` `{music}` | boss track; `boss:defeated` fades music out over 2.5 s |
| `cutscene:start` `{music}` | cutscene track, no loop |
| `dialog:line` `{voice}` | voice line by id; music ducks to 35 % while it plays |
| `slowmo:start/end` | music drops a fifth (rate 2/3) and closes a 900 Hz low-pass |

Payload fields marked above that do not exist yet (`blade`, `power`, `voice`, `music`) are the contract for the refactor: the emitters should add them.
Browsers start audio only after a user gesture: call `audio.unlock()` on the first key or pointer press (the title screen).
Music and voice files are fetched and decoded on first use and then cached; preload a level's files with `audio.load(url)` during the level card.

## 4. Music

`tools/music.py` builds a ComfyUI graph (CheckpointLoaderSimple -> ModelSamplingSD3 shift 5 -> Reinhard tonemap CFG -> KSampler 50 steps, cfg 5, euler/simple -> VAEDecodeAudio -> SaveAudio), fetches the FLAC, trims silence, makes the loop version (equal-power cross-fade of the last `xfade` seconds into the head), runs a two-pass `loudnorm`, encodes Opus, and prints duration, peak, RMS and the share of silent 100 ms blocks for each file.
A shared STYLE string ("dark industrial, cold, tense, cinematic") is added to every job's tags.
One 85 s track takes about 2.5-3 min on this machine.

```
python3 tools/music.py                    # all jobs, skips files that exist
python3 tools/music.py --only title --force
python3 tools/music.py --check            # levels only, rewrites index.json
```

### Generated (2026-10-05)

| File | Length | Peak / RMS dBFS | Note |
|---|---|---|---|
| `title_s1101.ogg` | 84.2 s | -2.7 / -18.3 | default pick |
| `title_s1101.loop.ogg` | 80.2 s | -2.6 / -18.1 |  |
| `title_s1102.ogg` | 84.6 s | -1.9 / -19.9 |  |
| `title_s1102.loop.ogg` | 80.6 s | -1.8 / -19.7 |  |
| `prologue_s2102.ogg` | 54.8 s | -4.5 / -20.4 | default pick |
| `prologue_s3101.ogg` | 55.0 s | -1.4 / -17.6 |  |
| `docks_explore_s3101.ogg` | 85.0 s | -2.9 / -19.2 | default pick |
| `docks_explore_s3101.loop.ogg` | 80.0 s | -3.0 / -19.2 |  |
| `docks_explore_s3102.ogg` | 84.9 s | -1.5 / -18.2 |  |
| `docks_explore_s3102.loop.ogg` | 79.9 s | -1.5 / -18.1 |  |
| `boss_marchetti_s4101.ogg` | 84.7 s | -3.8 / -18.6 | default pick |
| `boss_marchetti_s4101.loop.ogg` | 81.7 s | -3.9 / -18.5 |  |
| `boss_marchetti_s5102.ogg` | 84.5 s | -1.6 / -19.2 |  |
| `boss_marchetti_s5102.loop.ogg` | 81.5 s | -1.6 / -19.1 |  |

Checks (numbers only; nobody has listened yet): no file is silent (silent 100 ms blocks below 4 %), all peaks are at or below -1.4 dBFS, every loop file is a cross-fade of the same take (the seam is continuous by construction; the test bench "seam" button plays the joint).
Estimated tempo (librosa): title 118 / 136-144 bpm, docks explore 161 / 99 bpm, boss 152 / 129 bpm (asked: 95, 80, 140; ACE-Step does not follow bpm tags exactly).

**Rejected renders.** Seeds 2101 (prologue) and 4102 (boss) gave a frozen high whine (about 15 kHz, 1 % of the energy below 500 Hz) for the whole track. `tools/music.py` now rejects such a render (low-band share < 0.05 or spectral change < 0.02 between 1 s blocks) and tries seed + 1000; the replacements are 3101 and 5102. Opus can also overshoot dense, distorted mixes by about 2 dB, so the encoder re-measures the decoded file and turns it down until the peak is below -1 dBFS.

## 5. Sound effects

20 procedural sounds, built from distorted low sine thumps, filtered white and brown noise, inharmonic metal partials and a shared room reverb, through a compressor. Each play has a small random detune (±3 %) and level change, so repeats do not sound identical. `pitch` scales every frequency and divides every duration (use 0.6-0.7 for slow motion).

`punch_light punch_heavy kick_light kick_heavy blade_slash blade_hit shotgun (with pump) mg_burst ricochet glass_small glass_large crate_break body_fall footstep_wet dodge_whoosh pickup bandage ko_thud ui_blip ui_confirm`

The test bench "Analyse all" button renders each sound in an OfflineAudioContext and lists length, peak and RMS: no sound is silent or clips (peaks between -1 and -17 dBFS; footsteps are the quietest by design).

## 6. Voice

**Method.** ChatTTS could not run (no PyTorch). Each character's reference is a macOS `say` voice, pitch-shifted with rubberband (formants move with the pitch, so a lower shift sounds like a bigger man) and coloured with ffmpeg EQ, saturation or vibrato. F5-TTS clones that reference for every line, so the voice stays fixed. Clones drift toward about 95 Hz, so a per-speaker `line_pitch_st` shift pushes each line back to the speaker's register.

| Speaker | Reference voice | Pitch shift (ref / line) | Colour | Line pitch (median) |
|---|---|---|---|---|
| elias | Daniel (UK), slow | -2.5 / -1.5 st | low-pass 7 kHz, warm low end, compressed | 83-104 Hz |
| marchetti | Rocko (US) | -3 / -3 st | +5 dB at 120 Hz, mid push, tanh saturation (coarse) | 69-78 Hz |
| bell | Grandpa (UK), slow | -1 / -0.5 st | 5.5 Hz vibrato (age), presence boost, soft clip (rasp) | 91 Hz |
| hale | Reed (US) | -1.5 / +1 st | phone band-pass 320-3200 Hz on his line | 99 Hz |

Distinctness check (MFCC timbre centroids, 16 lines): the distance between speakers is 27-69, the spread inside one speaker is 21. Bell and Marchetti are the closest pair in timbre, but they are 3 semitones apart in pitch.

**Quality control.** `make_line` tries seeds 7, 21, 42, 99 and keeps the first take that whisper.cpp (ggml-small.en) hears with word error rate <= 0.1 and that stays within 4 semitones of the speaker's pitch. This caught a take of "Then collect." that F5 rendered as a squeak (338 Hz) although whisper heard the words.
Mood is set by duration speed (`cold` 0.9, `furious` 1.08) and filters (`phone`, `furious` saturation); F5 has no emotion control, so the acting is flat. Names that whisper or F5 get wrong use a spoken spelling in `say` ("Club Nwar", "Peer nine", "Mala-speena").

| Id | Speaker / mood | Length | WER | whisper heard |
|---|---|---|---|---|
| `prologue_01` | elias / vo | 8.04 s | 0.14 | Three nights since club no war. The rain had not stopped. Neither had the clocks. |
| `prologue_02` | bell / warm | 7.39 s | 0.0 | Eat Elias. You look like a man who broke something expensive. |
| `prologue_03` | bell / serious | 10.79 s | 0.0 | Malaspina was a tenor. There is a whole choir. And every choir needs someone to keep time. |
| `prologue_04` | elias / vo | 4.34 s | 0.0 | In this city, a tuning fork is a death notice. |
| `prologue_05` | elias / vo | 5.13 s | 0.11 | The dog pulled me out. Nobody pulled Belle out. |
| `prologue_06` | elias / vo | 7.17 s | 0.08 | They said it was Belle. The ring said so. The dog said nothing. |
| `prologue_07` | elias / vo | 7.99 s | 0.07 | Underworld ruled, break a man, inherit his debts. They had sent me the bill. |
| `prologue_08` | elias / cold | 1.99 s | 0.0 | Who? |
| `prologue_09` | hale / phone | 8.9 s | 0.0 | The fork means the choir. Start at Pier 9 and keep your head down. |
| `docks_intro_01` | elias / vo | 5.89 s | 0.0 | Pier 9. Where the city guts its fish, and its debts. |
| `docks_intro_03` | elias / vo | 4.81 s | 0.0 | I brought their bell back. Let them hear it ring. |
| `marchetti_intro_01` | marchetti / amused | 7.39 s | 0.07 | The Sandman. I thought you were a bedtime story they tell to scare sinners. |
| `marchetti_intro_02` | elias / cold | 2.47 s | 0.0 | The Watchmaker |
| `marchetti_intro_03` | marchetti / smug | 9.69 s | 0.09 | Business. You broke Mollaspina. You carry his debt. Rules are rules. |
| `marchetti_intro_04` | elias / cold | 2.3 s | 0.0 | Then collect. |
| `marchetti_intro_05` | marchetti / furious | 4.59 s | 0.0 | With pleasure, I'll weigh you by the pound. |

**Word error notes.**
- "Club Noir" is heard as "club no war": the sound is right (spoken as "Nwar"); whisper does not know the name.
- "Bell" is heard as "Belle" (same sound).
- `marchetti_intro_01`: "tenors" is heard as "sinners" in the best of 4 takes. This is the only real word error. Re-roll with other seeds (`"seed": N` on the line) or accept.
- `marchetti_intro_03`: "Malaspina" is heard as "Mollaspina" (close).
- `prologue_07`: "rule:" is heard as "ruled," (the colon pause is short).

Total: 16 lines, 99 s of speech, 0.9 MB.

## 7. Still missing

- **Level 1 stems and stingers**: `docks_combat` (layer over explore), `docks_slowmo` (4 s stinger), `docks_boss_p2/p3`, `docks_victory`. ACE-Step makes full songs, not stems that line up; for layers, generate at a fixed bpm and key and cut, or make combat a separate loop and cross-fade.
- **Ambience and level sfx** (fog horn, sleet, gulls, water, reefer hum, conveyor, chain, ice, cleaver): the procedural bank covers combat only. Recorded-style ambience needs a sample generator. Stable Audio Open would make these from text; it is gated on Hugging Face. If the user accepts its licence and downloads it into ComfyUI, add a `tools/sfx_gen.py` with the same job-JSON pattern as `tools/music.py`.
- **Saltman voices** ("That's him. The Sandman.") and barks: no voice defined yet; add a `saltman` entry (whisper mood) to `audio_voice.json`.
- **Hale's docks outro line** and the Pier 9 outro voice-over.
- **ChatTTS** is in the Hugging Face cache, but its Python package needs PyTorch, which is not installed (about 1 GB). It was skipped; the macOS `say` + F5 route gives four distinct voices without it.
- Real-game wiring: done (2026-10-06), see section 9.

## 9. Game wiring (2026-10-06)

`src/audio/game.js` exports `gameAudio` (also `window.gameAudio`). `src/legacy.js` configures it at boot and calls `gameAudio.install()`: the first key or pointer press creates the AudioContext, resumes it and binds `audio.bind(bus)` to the game bus (`src/core/events.js`). Before that press nothing is created. The autotest never presses a key, so audio cannot change its hashes; `?autotest=...&audio` unlocks audio at once to prove it (same hashes).

| Call | Use |
|---|---|
| `gameAudio.playMusic(id, { volume, loop, fade })` | a music id or cue; a request before the unlock is kept and starts at the unlock |
| `gameAudio.stopMusic(fade)` | fade out |
| `gameAudio.voice(id)` | one voice line, music ducks; resolves when it ends (at once while locked) |
| `gameAudio.sfx(name, { x, vol, pitch })` | any `sfx.js` sound; `x` is a world x for the pan |
| `gameAudio.slowmo(on)` | or emit `slowmo:start` / `slowmo:end` (the dev slow-motion toggle does) |
| `gameAudio.setVolume(v)` / `getVolume()` | master volume 0..1; the menu item "Volume" steps it by 10 % and saves it in the settings |

Music today: `title` on the title screen; `docks_explore` at volume 0.45 in the tutorial street, up to 0.85 at the club boss intro; it fades out when the boss falls and stops on a Wicked K.O. `boss_marchetti` is not used: it is for Level 1.

Event payloads the game emits (all synchronous, from the fixed sim step): `hit {by, target, x, y, dir, power (1 = a solid blow), force, dmg, blade, weapon, isBoss}`, `hurt {dmg, x, y, dir, heavy, outcome}`, `ko {perma}`, `kill {enemy, weapon, zone, isBoss, x, y}`, `pickup {kind: weapon|ammo|bandage|can|bottle|knife, w, source, x, y}`, `object:break {o, kind, x, y}`, `glass:break {o, kind: 'bottle', x, y}`, `shot {by, w, x, y, dir, pellets, auto}`, `swing {move, weapon, w, blade, heavy, x, y, dir}`, `roll {x, y, dir, air}`, `jump {x, y, double}`, `land {x, y, v, heavy, surface}`, `step {x, y, foot, run, wet}`, `spawn {enemy, type, source, x}`, `boss:intro {boss, name}`, `boss:phase {boss, phase}`, `boss:telegraph {boss, move, t, x, mark}`, `boss:defeated {boss, x}`, `section:enter {from, to}`, `run:over {result}`, `noise {x, loud}`, `feat` (a lesson key string).
`game.js` adds sounds for `roll`, `swing`, `shot` (the machine gun plays one burst per 0.3 s), `step`, `land`, `boss:telegraph` and `run:over`; menu moves play `ui_blip`, menu actions `ui_confirm`.
`sfx.js` uses its own random generator, never `Math.random`.

## 8. Choices for the director

1. **Music seeds**: pick one seed per id on the test bench and set `pick` in `src/audio/manifest.js`. Defaults are the first seed.
2. **Voices**: approve or replace the four reference voices. To change one, edit its recipe in `audio_voice.json` (`say_voice`, `pitch_st`, `ref_fx`), then `tools/voice.py --refs --only <speaker>` and `tools/voice.py --force --only <ids>`. A real actor's 5-10 s recording dropped in as `ref.wav` + `ref.txt` gives the best result with no code change.
3. **Voice on or off**: the level doc says voice is optional (text by default). The lines exist; the game can play them with the captions or keep text only.
4. **Loudness**: music sits at -16 LUFS and the music bus at 0.7; adjust after a play-through with sfx.

## Approval (2026-10-06)

The director listened to the music and the voices and approved them: the manifest seeds (title 1101, prologue 2102, docks_explore 3101, boss_marchetti 4101), the four character voices and the 16 voice lines, including marchetti_intro_01 as it is.

## 10. Feedback layer (2026-10-06, review improvement #10)

| Part | File | What it does |
|---|---|---|
| Music director | `src/audio/director.js` | Two states on the level track. **explore**: a 1.7 kHz low-pass, normal level. **combat** (a goon with aggro within 320 px): the filter opens, the level goes up 1.45x, and a percussion layer (`perc_kick`, `perc_snare`, `perc_tom`, `perc_hat`) plays on the beat of the track. The fight ends 2.5 s after the last goon leaves him; when goons died in it and none stand near, `stinger_clear` plays and the track steps back under it. Boss fights, the title, cutscenes and endings: the layer is neutral (the boss music plays as it is). |
| Beat clock | `findBeat(buf)` in `director.js` | An onset envelope of the decoded track (10 ms frames, full band + bass band), its autocorrelation over 60-180 bpm (weighted to 120) for the period, then the phase with the most onset. `docks_explore` reads as 130 bpm. The drums are scheduled 0.25 s ahead on that grid, per loop pass; none in slow motion. |
| Grunts | `audio.js` `bind()` | `grunt_hero` on every `hurt`; `grunt_goon` on a clean heavy blow and on every other clean light one (one grunt per 0.16 s); `grunt_die` under each kill (lower for a boss). |
| Parry | `audio.js` `bind()` | `parry_ring` on a `parry` event or a `feat` named parry (one ring for both). |
| Heartbeat | `src/feedback/danger.js` | Below 25 % HP: `heartbeat` at 63-100 bpm and a red vignette (DOM, both views) that beats with it. |

New sounds in `sfx.js`: `grunt_hero grunt_goon grunt_die heartbeat parry_ring perc_kick perc_tom perc_snare perc_hat stinger_clear`.
The drums and the stinger go into the music chain (under the voice duck), so the volume setting and the voice ducking cover them.
`gameAudio.runtime` gives the director the audio.js runtime; `music.now` (buffer, start time, loop) and `music.layer` (`lp`, `gain`, `perc`) are its hooks.
