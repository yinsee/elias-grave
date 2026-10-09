// Bruno "the Cooler" Ostrava: the House Always Wins mini-boss (docs/levels/03-house-always-wins.md beat 7), the Orfeo's floor boss.
// A huge man in a tight tuxedo, gold knuckle-dusters, a shaved head, cold eyes. The counting room is his arena; the vault door
// (and the inner gate) are the walls he charges into.
//   string: gold-knuckle combos (jab punch; punch punch; jab jab punch)                -> dodge, punish the last punch
//   charge: a stamp and the head lowered (0.6 s), then a run (200 px/s, at most 1 s)     -> roll through it or jump; into a wall he is stunned 1.6 s
//   grab: both arms wide (0.45 s), then a lunge; caught: he slams the hero through a counting crate (16) -> roll, or hit him in the wind-up (a jab breaks it); a miss leaves him open 0.9 s
//   phase 2 at half health: a roar, then the "cold streak": 6 s his guard breaks only to heavy blows (his gloves frost blue), 4 s normal
// The game calls coolerThink(M, e, ...) and coolerSpecial(M, e, dt, px) (M: the level run, src/levels/casino/run.js).
import { C } from '../core/color.js';

export const COOLER = {
  kind: 'cooler', name: 'Bruno "the Cooler" Ostrava', title: 'Floor boss of the Orfeo', look: 'cooler',
  hp: [260, 340, 380, 440], s: 1.2, m: 4, speed: 26, reach: 20, dmg: 14, heavyDmg: 22, poise: 24, windup: 0.3, cd: [0.8, 1.5],
  R: { w: undefined, len: 0, off: 0, reach: 20 },
  combos: [['jab', 'punch'], ['punch', 'punch'], ['jab', 'jab', 'punch']],
  charge: { windup: 0.6, v: 200, maxT: 1.0, stun: 1.6, dmg: 22, cd: [5, 8], range: [50, 200] },
  grab: { reach: 22, windup: 0.45, lunge: 0.25, v: 120, hold: 0.5, dmg: 16, miss: 0.9, cd: [4, 7] },
  ph2: { below: 0.5, line: "Cold streak, Sandman. The table's mine." },
  cold: { on: 6, off: 4 },
  crew: { every: 10, alive: [0, 0, 1, 1] },
  gloves: { gold: C('#d8b040'), cold: C('#8ad0ff') },
  lines: { intro: "Count says you're bad luck. I'm worse.", wall: 'Ngh...!', defeat: "Go on, then. He's upstairs. Lose." },
};
const T_ = COOLER;

export function coolerThink(M, e, dt, px, dx, adx, level, aggro) {
  const G = M.G, dir = Math.sign(dx) || 1, ctl = G.ctl;
  e.tx = null; e.run = 1;
  if (e.stunT > 0) e.stunT -= dt;
  e.cdT -= dt; e.chgCd -= dt; e.grabCd -= dt;
  // the cold streak: 6 s on (light blows ring off his guard), 4 s off; the gloves show it
  if (e.ph >= 2) {
    e.coldT = (e.coldT + dt) % (T_.cold.on + T_.cold.off);
    e.cold = e.coldT < T_.cold.on;
    e.pal.glove = e.cold ? T_.gloves.cold : T_.gloves.gold;
    if (e.cold && !e.act && !e.sp && !(e.stunT > 0) && !(e.recT > 0)) e.guardT = Math.max(e.guardT, 0.15);
  }
  if (e.recT > 0) { e.recT -= dt; return; }
  if (!aggro || e.sp || e.act || e.hurtT > 0 || e.air || e.exposed > 0) return;
  if (e.ph === 1 && e.hp < e.maxHp * T_.ph2.below) { G.bossPhase(e, 2, T_.ph2.line); e.coldT = 0; e.cd = [0.6, 1.2]; return; }
  const free = level && G.hero.mode === 'anim' && !ctl.air;
  // the charge from range: a stamp, the head down, then he runs
  if (e.chgCd <= 0 && free && adx > T_.charge.range[0] && adx < T_.charge.range[1]) {
    e.chgCd = G.bRand(T_.charge.cd); G.bSpecial(e, 'charge', G.bTell(T_.charge.windup), 'charge', px);
    G.emit('sfx', { name: 'kick_heavy', x: e.x, vol: 0.9, pitch: 0.5 });
    return;
  }
  // the grab: a hero who stays close, or now and then
  e.stillT = free && Math.abs(ctl.spd) < 4 && adx < 34 ? (e.stillT || 0) + dt : 0;
  if (e.grabCd <= 0 && free && adx < T_.grab.reach + 14 && (e.stillT > 0.35 || G.simRand() < dt * 0.6)) {
    e.grabCd = G.bRand(T_.grab.cd); e.stillT = 0; e.grabHp = e.hp; G.bSpecial(e, 'grab', G.bTell(T_.grab.windup), 'grab');
    return;
  }
  if (adx > e.reach + 1) { e.tx = px - dir * e.reach * 0.7; return; }
  e.face = dir;
  if (free && e.cdT <= 0) {
    const r = G.simRand(), Cb = T_.combos;
    e.combo = Cb[r < 0.4 ? 0 : r < 0.7 ? 1 : 2]; e.ci = 0;
    G.bStart(e, e.combo[0], G.bTell(e.windup), 'fist');
  }
}

// his own committed moves (the game's bossSpecial runs this first); true = handled
export function coolerSpecial(M, e, dt, px) {
  const G = M.G, ctl = G.ctl, hero = G.hero;
  if (e.sp === 'charge') {
    e.spT += dt;
    if (e.spT < 0) { if (e.spT < -0.3) e.face = Math.sign(px - e.x) || e.face; if (G.simRand() < dt * 14) G.dust(e.x - e.face * 7 * e.s, e.y + 1, 1); return true; }
    e.vx = e.face * T_.charge.v;
    if (G.simRand() < dt * 30) G.dust(e.x - e.face * 5, e.y + 1, 1);
    if (!e.hitP && hero.mode === 'anim' && !ctl.air && Math.abs(G.P[2].x - e.x) < 10 * e.s && Math.abs(ctl.y - e.y) < 12) { e.hitP = true; G.hurtPlayer(T_.charge.dmg, G.P[2].x, G.P[2].y, e.face, true, 1, { e, kind: 'charge' }); }
    const A = M.coolerArena(), wall = (e.face < 0 && e.x <= A.x0 + 6) || (e.face > 0 && e.x >= A.x1 - 6);
    if (wall || e.spT > T_.charge.maxT || (e.spT > 0.25 && (px - e.x) * e.face < -40)) {
      e.sp = null; e.vx *= wall ? -0.3 : 0.3; e.cdT = G.bCd(e);
      if (wall) {   // into the vault door (or the gate): it rings like a bell; he is out on his feet
        e.recT = e.stunT = T_.charge.stun; G.shakeIt(0.3, 3); G.dust(e.x + e.face * 8, e.y - 12, 8); G.hitStop = Math.max(G.hitStop, 0.08);
        M.coolerWall(e); G.bark(e, T_.lines.wall);
        G.emit('boss:stun', { boss: e, x: e.x, t: e.recT, by: 'wall' }); G.emit('feat', 'wallstun');
      } else e.recT = 0.6;
    }
    return true;
  }
  if (e.sp === 'grab') {
    const t0 = e.spT; e.spT += dt;
    if (e.spT < 0) {   // arms wide: a jab (any blow) breaks it
      if (e.hp < e.grabHp) { e.sp = null; e.recT = 0.5; e.mHold = false; G.emit('feat', 'grabbreak'); return true; }
      if (e.spT < -0.15) e.face = Math.sign(px - e.x) || e.face;
      return true;
    }
    if (!e.mHold) {
      if (e.spT < T_.grab.lunge) {   // the lunge
        e.vx = e.face * T_.grab.v;
        if (hero.mode === 'anim' && hero.invT <= 0 && !ctl.air && Math.abs(ctl.x - (e.x + e.face * 8)) < T_.grab.reach * 0.7 && Math.abs(ctl.y - e.y) < 12) {
          e.mHold = true; e.holdT = 0; e.vx = 0; G.lockT = Math.max(G.lockT, T_.grab.hold + 0.3); hero.act = null; ctl.spd = 0;
          G.emit('sfx', { name: 'punch_heavy', x: e.x, vol: 0.6, pitch: 0.6 });
        }
        return true;
      }
      e.sp = null; e.vx = 0; e.recT = T_.grab.miss; e.exposed = Math.max(e.exposed || 0, T_.grab.miss); e.cdT = G.bCd(e);   // a miss: he stumbles, open
      if (hero.invT > 0 || ctl.air) G.emit('feat', 'grabslip');
      return true;
    }
    // he has him: lifted over his head, then down through the nearest counting crate
    e.holdT += dt; e.vx = 0;
    const tx = e.x + e.face * 9; ctl.x += (tx - ctl.x) * Math.min(1, dt * 20); ctl.spd = 0; ctl.face = -e.face;
    if (e.holdT >= T_.grab.hold) {
      e.sp = null; e.mHold = false; e.recT = 0.5; e.cdT = G.bCd(e);
      G.lockT = 0;
      G.hurtPlayer(T_.grab.dmg, G.P[1].x, G.P[1].y, e.face, true, 1.6, { e, kind: 'grab' });
      M.smashNear(e.x + e.face * 14, 40);
      G.shakeIt(0.3, 3); G.hitStop = Math.max(G.hitStop, 0.1);
    }
    void t0;
    return true;
  }
  return false;
}
