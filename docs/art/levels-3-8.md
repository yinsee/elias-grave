# Art for Levels 3-8: file names and notes

The art lead makes the comic panels, the dialog portraits and the character references for Levels 3-8 with the local ComfyUI and `tools/comfy.py`. The jobs files are in `assets/prompts/<levelid>.json`. Character descriptions are in `assets/prompts/characters.json`.

## General rules

- **Format.** Section 9 of some level docs says WebP or 512x512. All files are PNG, the same as Levels 1-2. Panels are 1280x720 (320 px pixel art, scaled x4). Portraits are 832x1024 (208 px pixel art, scaled x4). The source images (before re-pixelation) are in `assets/art-src/`.
- **Names.** The file name is the id in section 9 without the `panel:` or `portrait:` prefix.
  - Panels: `assets/art/panels/<levelid>/<id>.png`
  - Portraits: `assets/art/portraits/<id>.png`
  - References: `assets/art/characters/<char>/ref.png`
- **No text in the art.** Signs, labels, phone screens, notebooks, newspapers and the photo are blank. The game must draw any words in the caption boxes or as an overlay. For example: "Orfeo, Reserved: the Count", "Silence the bartender. - A.V.", "SILENT NIGHT", "Meridian Express, 23:40, Platform 9", "THE CHOIR EXPOSED", and the ELIAS GRAVE title.
- **Faces.** ReActor puts the reference face on every panel where a recurring character's face shows, so Elias, Bell, Hale, Mags and each boss look the same in all levels.

## Face-swap fix in tools/comfy.py

Every character reference is called `ref.png`. `upload()` sent each one to ComfyUI under that same name and cached the name per path. In a batch that used two or more references, a later job could get the face that was uploaded last (for example, `mags_weak` came out with Hale's moustache). Now each upload has a unique name (`<folder>_<file>`). The Level 3-5 images were repaired: ReActor ran again on each finished image with the correct reference.

Levels 1-2 were made with the old code. Look at the Level 1-2 panels and portraits that use two or more references in one jobs file (for example `metro.json`: Elias, Switch, Tinder, Hale) for wrong faces.

## Level 3: casino

Panels and portraits follow section 9 of `03-house-always-wins.md`.

- `elias_silent` is new. Levels 4-8 use it again.
- `casino_outro_02`: the model could not draw the cut-out face or the 3:17 clock. The cut-out hole on the middle man and the clock hands are painted onto the source image by hand, and the panel is re-pixelated. If you regenerate this panel, paint them again.
- `casino_outro_01` is a close shot of Brask's head and shoulders on the wheel. Wide shots always drew a second Brask.
- `casino_outro_02` shows seven men in the photo, not six.

## Level 4: aquarium

Panels and portraits follow section 9 of `04-leviathan.md`.

- `aquarium_manifest`: the model painted header words on the page. They are painted out by hand on the source image. The page and the red seal are blank, so the game must draw the manifest text.
- `aquarium_outro_02` shows a hanging whale model, not a whale skeleton.
- `elias_wet` is new.

## Level 5: hospital

Panels and portraits follow section 9 of `05-st-cecilia.md`, without the `panel:` and `portrait:` prefixes.

- `hospital_outro_02`: the phone screen and the envelope are blank. The game must draw "Silence the bartender. - A.V." and "Winter Gala, Royal Conservatory".
- `elias_furious`, `hale_hat` and `mags_weak` are new. Level 6 asks for `elias_furious_quiet` "from L5": Level 6 makes it as its own portrait.

## Level 6: palmhouse

Panels and portraits follow section 9 of `06-palm-house.md`, without the `panel:` prefix.

- `palmhouse_office_01` and `palmhouse_outro_04`: the folder, the tobacco tin and the notebook are blank. The game must draw "SILENT NIGHT" and "Meridian Express, 23:40, Platform 9".
- `elias_furious_quiet` is its own portrait (Level 5 has `elias_furious`). Level 7 uses it again.
- The Lenz reference (`lenz/ref.png`) is made here, because Lenz first shows in `palmhouse_outro_03`.

## Level 7: train

Panels and portraits follow section 9 of `07-last-train.md`, without the `panel:` prefix.

- `train_intro_01`: the platform clock is not exact (23:39). The game can put the time in the caption.
- `train_intro_05` shows Lenz standing on the roof of the last car, with the metronome beside him.
- `elias_cold` and `elias_furious_quiet` are shared with earlier levels.

## Level 8: skyscraper

Panels follow section 9.1 of `08-the-spire.md`, without the `panel:` prefix: `spire_intro_1`..`4`, `spire_end_1`..`3`, `epilogue_1`..`4` and `title_card` (no zero padding, as in the doc).

Section 9.2 gives only mood names. The portrait files are `<character>_<mood>.png`:

- Bell: `bell_warm`, `bell_proud`, `bell_calm`, `bell_regretful`, `bell_cold`, `bell_amused`, `bell_stern`, `bell_hurt`, `bell_hanging`
- Elias: `elias_quiet` and `elias_grieving` are new. `elias_cold` and `elias_furious` exist from earlier levels.
- Lys Moreau: `lys_amused`, `lys_breathless`
- Kessel: `kessel_grinning`, `kessel_fading`

Notes:

- `title_card` has no words: a dark rain panel with a small man and dog at the bottom. The game must draw the ELIAS GRAVE title on it.
- `epilogue_1`: the newspaper is blank. The game must draw "THE CHOIR EXPOSED".
- `spire_intro_4` (the sepia flashback) uses Bell's reference face. The boy is not face-swapped, because the Elias reference is an adult.
