#!/usr/bin/env python3
"""Turn a generated panel into pixel art that matches the game: a small pixel grid, a limited palette,
the game's 4x4 Bayer dither, then a hard-edged enlargement.

usage:
  tools/pixelate.py IN.png OUT.png [--w 320 --colors 32 --dither 0.6 --scale 4]
  tools/pixelate.py --dir assets/art-src/panels --out assets/art/panels   (every .png in a folder)

--w       width of the pixel grid (the height keeps the aspect); 320 suits 16:9 panels, 128 suits portraits
--colors  palette size (an adaptive palette per image, picked from the panel itself)
--dither  strength of the ordered dither (0 = none, 1 = full), the same matrix as the game's BAYER
--scale   enlargement for the saved file (1 = keep the tiny grid; the game scales it with crisp pixels)
"""
import argparse, os
from PIL import Image, ImageEnhance

BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]   # as in the game (src/legacy.js)


def pixelate(src, dst, w=320, colors=32, dither=0.6, scale=4, contrast=1.08):
    im = Image.open(src).convert('RGB')
    h = round(im.height * w / im.width)
    small = im.resize((w, h), Image.LANCZOS)                         # one sample per game pixel
    small = ImageEnhance.Contrast(small).enhance(contrast)            # (the shrink softens edges a little)
    if dither > 0:                                                    # ordered dither: nudge each pixel by the Bayer threshold before quantizing
        px = small.load(); amp = 32 * dither
        for y in range(h):
            for x in range(w):
                t = (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * amp
                r, g, b = px[x, y]
                px[x, y] = (max(0, min(255, int(r + t))), max(0, min(255, int(g + t))), max(0, min(255, int(b + t))))
    pal = small.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    out = pal.convert('RGB')
    if scale > 1:
        out = out.resize((w * scale, h * scale), Image.NEAREST)
    os.makedirs(os.path.dirname(dst) or '.', exist_ok=True)
    out.save(dst)
    return dst


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('src', nargs='?'); ap.add_argument('dst', nargs='?')
    ap.add_argument('--dir'); ap.add_argument('--out')
    ap.add_argument('--w', type=int, default=320); ap.add_argument('--colors', type=int, default=32)
    ap.add_argument('--dither', type=float, default=0.6); ap.add_argument('--scale', type=int, default=4)
    a = ap.parse_args()
    pairs = [(os.path.join(a.dir, f), os.path.join(a.out, f)) for f in sorted(os.listdir(a.dir)) if f.endswith('.png')] if a.dir else [(a.src, a.dst)]
    for s, d in pairs:
        print(pixelate(s, d, a.w, a.colors, a.dither, a.scale))
