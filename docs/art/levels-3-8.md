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
