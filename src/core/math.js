// small pure math helpers shared by the simulation and both renderers
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = u => u * u * (3 - 2 * u);
export const norm = (x, y) => { const d = Math.hypot(x, y) || 1; return [x / d, y / d]; };
export const snap = v => Math.floor(v) + 0.5;
export const lerpA = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
// distance from point c to the segment a-b
export function segDist(ax, ay, bx, by, cx, cy) {
  const ex = bx - ax, ey = by - ay, t = clamp(((cx - ax) * ex + (cy - ay) * ey) / (ex * ex + ey * ey || 1), 0, 1);
  return Math.hypot(cx - ax - ex * t, cy - ay - ey * t);
}
// critically damped spring (ease out, no overshoot): moves the value toward the target, keeping its velocity in st[key]
export function smoothDamp(cur, target, st, key, T, dt) {
  const w = 2 / T, x = w * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x), c = cur - target;
  const tmp = (st[key] + w * c) * dt;
  st[key] = (st[key] - w * tmp) * e;
  return target + (c + tmp) * e;
}
