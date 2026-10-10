// ---------- the 2D raster: the pixel buffer, the view into the world, and the pixel helpers ----------
// All drawing takes world coordinates; the view (x, y = its top-left corner in whole world pixels, vw, vh = its size) maps them into buf.
// initRaster(buf, stride, rows, view) runs once at boot: the game passes its camera as the view, so the 2D frame draws what the camera sees.
// withView(rect, fn) is the only legal way for other code (the 3D view) to borrow 2D art: it points the view at rect, clears that window
// of buf, runs fn, and puts the view back.
import { snap } from '../core/math.js';

let buf = null, CW = 0, view = null;
// pickables (weapons, ammo, bandages, cans and bottles) are drawn with pickArt.on set: plot marks their pixels in mask (and grows the
// box x0..x1, y0..y1 around them), and the pick glow rings them
export const pickArt = { on: false, x0: 1e9, y0: 1e9, x1: -1, y1: -1, mask: null };
// fighters (the hero, goons, bosses) are drawn with figArt.on set: plot marks their pixels the same way, for the 2D rim light
export const figArt = { on: false, x0: 1e9, y0: 1e9, x1: -1, y1: -1, mask: null };

export function initRaster(buffer, stride, rows, v) {
  buf = buffer; CW = stride; view = v;
  pickArt.mask = new Uint8Array(stride * rows);
  figArt.mask = new Uint8Array(stride * rows);
}

export const plot = (x, y, c) => {
  x -= view.x; y -= view.y; if (x < 0 || y < 0 || x >= view.vw || y >= view.vh) return; buf[y * CW + x] = c;
  if (pickArt.on) { pickArt.mask[y * CW + x] = 1; if (x < pickArt.x0) pickArt.x0 = x; if (x > pickArt.x1) pickArt.x1 = x; if (y < pickArt.y0) pickArt.y0 = y; if (y > pickArt.y1) pickArt.y1 = y; }
  if (figArt.on) { figArt.mask[y * CW + x] = 1; if (x < figArt.x0) figArt.x0 = x; if (x > figArt.x1) figArt.x1 = x; if (y < figArt.y0) figArt.y0 = y; if (y > figArt.y1) figArt.y1 = y; }
};
export const plotV = (x, y, c) => { if (x < 0 || y < 0 || x >= view.vw || y >= view.vh) return; buf[y * CW + x] = c; };   // view coordinates
// disc, seg and line1 skip non-finite input: a NaN or an infinite end point never ends line1's walk (the Brask freeze) and makes
// the disc and seg loops run for ever or not at all
export function disc(cx, cy, r, c) {
  if (!Number.isFinite(cx + cy + r)) return;
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r2) plot(x, y, c);
    }
}
export function seg(ax, ay, bx, by, r, c) {
  if (!Number.isFinite(ax + ay + bx + by)) return;
  const dx = bx - ax, dy = by - ay;
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
  for (let i = 0; i <= n; i++) disc(snap(ax + dx * i / n), snap(ay + dy * i / n), r, c);
}
export function line1(x0, y0, x1, y1, c) {
  if (!Number.isFinite(x0 + y0 + x1 + y1)) return;
  x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.floor(x1); y1 = Math.floor(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let e = dx + dy;
  for (;;) { plot(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}

// rect: { x, y, vw, vh } (vw <= the stride, vh <= the rows). The window's pixels are left in buf rows 0..vh-1, columns 0..vw-1.
export function withView(rect, fn) {
  const sx = view.x, sy = view.y, sw = view.vw, sh = view.vh;
  view.x = rect.x; view.y = rect.y; view.vw = rect.vw; view.vh = rect.vh;
  try {
    for (let y = 0; y < rect.vh; y++) buf.fill(0, y * CW, y * CW + rect.vw);
    return fn();
  } finally {
    view.x = sx; view.y = sy; view.vw = sw; view.vh = sh;
  }
}
