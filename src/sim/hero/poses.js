// hero pose data: pose params, the base poses, the get-up keys (pure: no world, no state)
import { clamp, smooth, lerpA } from '../../core/math.js';

// joints: 0 head, 1 neck, 2 pelvis, 3 elbowB, 4 handB, 5 elbowF, 6 handF, 7 kneeB, 8 footB, 9 kneeF, 10 footF
// pose params: rx, ry (pelvis height), lean, head, f0x, f0y, f1x, f1y (feet: forward, lift), a0s, a0e, a1s, a1e (arm swing, elbow bend), wr (wrist turn of a held blade), yw (blade swing through depth: 0 = in the picture, pi/2 = pointing at the viewer)
export const NAMES = ['rx', 'ry', 'lean', 'head', 'f0x', 'f0y', 'f1x', 'f1y', 'a0s', 'a0e', 'a1s', 'a1e', 'wr', 'yw'];
export const mod = (base, o) => { const q = base.slice(); for (const k in o) q[NAMES.indexOf(k)] = o[k]; return q; };

export const IDLE = [0, 17.4, 0, 0, -2, 0, 2, 0, 0.05, 0.15, 0.08, 0.2, 0, 0];
export const GUARD = mod(IDLE, { rx: -0.5, ry: 15.6, lean: 0.1, head: -0.08, f0x: -6, f1x: 4, a0s: 0.65, a0e: 2.3, a1s: 1.05, a1e: 1.95 });
// deep squat: hips low, chest over the knees, hands up in guard
export const SQUAT = mod(IDLE, { ry: 6.2, lean: 0.62, head: -0.55, f0x: -4.5, f1x: 4.5, a0s: 1.0, a0e: 1.7, a1s: 1.3, a1e: 1.8 });
export const RISE = mod(IDLE, { ry: 9.5, lean: 0.75, head: -0.35, f0x: -2, f1x: 3, a0s: 0.35, a0e: 0.4, a1s: 0.5, a1e: 0.4 });
// getting up goes through pose params, never straight joint-to-joint: face up sits up, face down pushes up; both kneel, then rise
export const SITUP = mod(IDLE, { ry: 4.5, lean: 0.2, head: -0.15, f0x: 3, f1x: 7, a0s: -0.7, a0e: 0.2, a1s: -0.5, a1e: 0.3 });
export const PUSHUP = mod(IDLE, { ry: 5, lean: 1.2, head: -0.5, f0x: -10, f1x: -7, a0s: 0.6, a0e: 0.3, a1s: 0.7, a1e: 0.3 });
export const KNEEL = mod(IDLE, { ry: 6.5, lean: 0.8, head: -0.45, f0x: -8.5, f1x: 4, a0s: 0.9, a0e: 0.3, a1s: 1.1, a1e: 0.5 });
export const GU_T = [0.24, 0.48, 0.72];   // reach the sit-up / push-up, the kneel, the rise
export function fitPose(J, x0, fy, f) {   // pose params whose fk lands on the joints J ([x, y] each); fk angles are world angles
  const q = IDLE.slice(), [hd, nk, pl, eB, hB, eF, hF, , fB, , fF] = J;
  const up = (a, b) => Math.atan2((b[0] - a[0]) * f, a[1] - b[1]), dn = (a, b) => Math.atan2((b[0] - a[0]) * f, b[1] - a[1]);
  q[0] = (pl[0] - x0) * f; q[1] = fy - pl[1]; q[2] = up(pl, nk); q[3] = up(nk, hd) - q[2];
  q[4] = (fB[0] - x0) * f; q[5] = Math.max(0, fy - fB[1]); q[6] = (fF[0] - x0) * f; q[7] = Math.max(0, fy - fF[1]);
  q[8] = dn(nk, eB); q[9] = dn(eB, hB) - q[8]; q[10] = dn(nk, eF); q[11] = dn(eF, hF) - q[10];
  return q;
}

export function getupPose(g) {
  const t = g.t, A = g.down ? PUSHUP : SITUP, seg = (a, b, u) => lerpA(a, b, smooth(clamp(u, 0, 1)));
  if (t < GU_T[0]) return seg(g.q0, A, t / GU_T[0]);
  if (t < GU_T[1]) return seg(A, KNEEL, (t - GU_T[0]) / (GU_T[1] - GU_T[0]));
  return seg(KNEEL, RISE, (t - GU_T[1]) / (GU_T[2] - GU_T[1]));
}

// ez = how the pose eases INTO this key: 'in' accelerates into a strike (contact), 'out' decelerates out of it (recovery), none = smooth
export const K = (t, o, base = GUARD, ez) => ez ? [t, mod(base, o), ez] : [t, mod(base, o)];
export const AIR = mod(IDLE, { ry: 17, lean: 0.05, f0x: -3, f0y: 6, f1x: 3, f1y: 6, a0s: 1.0, a0e: 0.8, a1s: 1.2, a1e: 1.6 });
export const FLY_OUT = { lean: -0.45, head: 0.25, f1x: 14, f1y: 8, f0x: -5, f0y: 8, a0s: -1.2, a0e: 0.3, a1s: 1.1, a1e: 2.2 };

// teeter: k = +1 edge in front, -1 edge behind; arms circle (swing + elbow out of phase), torso sways over the drop
export function teeterPose(t, k) {
  const w = Math.sin(t * 3.4), c = t * 9, lean = k * (0.12 + 0.2 * w);
  return mod(IDLE, { rx: 0.7 * k * w, ry: 16.8, lean, head: -0.6 * lean,
    f0x: k > 0 ? -4 : -2, f0y: k > 0 ? 2.5 + 1.2 * Math.max(0, w) : 0, f1x: k > 0 ? 2 : 4, f1y: k > 0 ? 0 : 2.5 + 1.2 * Math.max(0, w),
    a0s: 1.9 + 1.2 * Math.sin(c), a0e: 0.8 + 0.7 * Math.cos(c), a1s: 1.9 + 1.2 * Math.sin(c + 2.2), a1e: 0.8 + 0.7 * Math.cos(c + 2.2) });
}
