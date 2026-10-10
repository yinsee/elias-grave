// Mattias "Tinder" Rook: Line Zero's mini-boss (docs/levels/02-line-zero.md beat 10), the Tunnel Rats' bomb-maker.
// A thin man in a burnt welder's apron and goggles, a road flare in one hand, a bandolier of bottles.
//   string: flare-torch combos; a hit sets the hero burning (4 dmg/s for 2 s)          -> dodge, or hit him in the wind-up
//   volley: 1-3 fire bottles in an arc; each leaves a 40 px fire patch for 3 s          -> keep moving; 0.8 s open after the throw
//   kick: kicks an oil drum rolling at the hero                                          -> jump it, or hit it back into him (1.5 s open)
//   phase 2 (half health): he lights the fuel pool (a 4 s fire wall) and speeds up 20 %
//   the waterfall: walking through the vent's waterfall puts his flare out: 4 s doused, slower, +50 % damage taken
// The game calls tinderThink(M, e, dt, px, dx, adx, level, aggro) and tinderSpecial(M, e, dt, px) (M: the level run, src/levels/metro/run.js).

export const TINDER = {
  kind: 'tinder', name: 'Mattias "Tinder" Rook', title: 'Bomb-maker of the Tunnel Rats', look: 'tinder',
  hp: [520, 640, 760, 880],   // (x2: he was over in 7-15 s)
  s: 1.05, m: 2.5, speed: 30, reach: 21, dmg: 10, heavyDmg: 15, poise: 16, windup: 0.3, cd: [0.8, 1.5],
  R: { w: 'flare', len: 7, off: -0.4, reach: 21 },
  combos: [['slash', 'slash'], ['slash', 'stab'],   // (every torch string is at least a 2-hit chain)
    ['stab', 'slash'], ['slash', 'slash', 'chop']],
  burn: { dps: 4, t: 2 },
  volley: { n: [1, 2, 2, 3], windup: 0.5, rec: 0.8, cd: [3.5, 6], range: [50, 170] },
  kick: { r: 34, v: 210, windup: 0.4, cd: [5, 8], rec: 1.5 },
  ph2: { below: 0.5, speedK: 1.2, line: 'Burn with me, Sandman!' },
  douse: { t: 4, speedK: 0.6, dmgK: 1.5 },
  lines: { intro: "The clock man's boy! He ticked so loud when he burned.", doused: 'No, no, no, light, light!', defeat: "I only built it! Switch lit it! She's at the junction!" },
};

export function tinderThink(M, e, dt, px, dx, adx, level, aggro) {
  const G = M.G, T = TINDER, dir = Math.sign(dx) || 1;
  e.tx = null; e.run = 1;
  if (e.stunT > 0) e.stunT -= dt;
  e.cdT -= dt; e.volCd -= dt; e.kickCd -= dt;
  if (e.douseT > 0) {   // doused: the flare is out, he fumbles to relight it (slower, takes more damage)
    if ((e.douseT -= dt) <= 0) { e.dmgK = 1; e.speed = e.baseSpeed * (e.ph >= 2 ? T.ph2.speedK : 1); G.emit('sfx', { name: 'fire_ignite', x: e.x, vol: 0.5, pitch: 1.6 }); }
  }
  if (e.recT > 0) { e.recT -= dt; return; }
  if (!aggro || e.sp || e.act || e.hurtT > 0 || e.air || e.exposed > 0) return;
  if (e.ph === 1 && e.hp < e.maxHp * T.ph2.below) {   // phase 2: the fuel pool goes up, he is faster
    G.bossPhase(e, 2, T.ph2.line);
    e.speed = e.baseSpeed * T.ph2.speedK * (e.douseT > 0 ? T.douse.speedK : 1); e.cd = [T.cd[0] / T.ph2.speedK, T.cd[1] / T.ph2.speedK]; e.windup = T.windup / T.ph2.speedK;
    M.ignite('pool', e.x, { wall: true, t: 4 });
    return;
  }
  if (hasCooled(e) && level && hero(G) && adx > T.volley.range[0] && adx < T.volley.range[1] && e.volCd <= 0 && !(e.douseT > 0)) {   // fire bottles from range
    e.volCd = G.bRand(T.volley.cd); G.bSpecial(e, 'volley', G.bTell(T.volley.windup), 'volley'); return;
  }
  if (e.kickCd <= 0 && level && hero(G) && adx > 46 && adx < 220) {   // a drum at his feet, kicked at the hero
    const o = G.objs.find(o => o.kind === 'barrel' && !o.carried && Math.abs(o.x - e.x) < T.kick.r && (o.x - e.x) * dir > -4 && Math.hypot(o.vx, o.vy) < 20);
    if (o) { e.kickObj = o; e.kickCd = G.bRand(T.kick.cd); G.bSpecial(e, 'kick', G.bTell(T.kick.windup), 'kick'); return; }
    // none at hand: walk to the nearest drum when it is not far behind him
    const n = G.objs.filter(o => o.kind === 'barrel' && !o.carried && Math.abs(o.x - e.x) < 90).sort((a, b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x))[0];
    if (n && e.kickCd > -4) { e.tx = n.x - dir * 8; e.run = 1.1; return; }
  }
  if (adx > e.reach + 1) { e.tx = px - dir * e.reach * 0.7; return; }
  e.face = dir;
  if (level && hero(G) && e.cdT <= 0) {
    const r = G.simRand(), Cb = T.combos;
    e.combo = Cb[Math.min(Cb.length - 1, Math.floor(r * (e.ph >= 2 ? Cb.length : Cb.length - 1)))]; e.ci = 0;
    G.bStart(e, e.combo[0], G.bTell(e.windup), 'flare');
  }
}
const hero = G => G.hero.mode === 'anim' && !G.ctl.air;
const hasCooled = e => !(e.recT > 0);

// his own committed moves (the game's bossSpecial runs this first); true = handled
export function tinderSpecial(M, e, dt, px) {
  const G = M.G, T = TINDER;
  if (e.sp === 'volley') {
    const t0 = e.spT; e.spT += dt;
    if (e.spT < 0) { if (e.spT < -0.2) e.face = Math.sign(px - e.x) || e.face; return true; }
    if (t0 < 0) {   // the bottles: lit from the flare, lobbed in a spread around where the hero stands
      const n = T.volley.n[G.diffSel], h = e.J[6];
      for (let i = 0; i < n; i++) M.throwBottle(e, h.x, h.y - 3, px + (i - (n - 1) / 2) * 26 + (G.simRand() - 0.5) * 10, 0.08 * i);
      G.emit('sfx', { name: 'dodge_whoosh', x: e.x, vol: 0.6, pitch: 1.2 });
    }
    if (e.spT > 0.25) { e.sp = null; e.recT = T.volley.rec; e.cdT = G.bCd(e); }
    return true;
  }
  if (e.sp === 'kick') {
    const t0 = e.spT; e.spT += dt;
    if (e.spT < 0) return true;
    if (t0 < 0) {
      const o = e.kickObj; e.kickObj = null;
      if (o && G.objs.includes(o) && !o.carried && Math.abs(o.x - e.x) < T.kick.r + 8) {
        o.vx = e.face * T.kick.v; o.vy = -40; o.av = e.face * 20; o.ethrown = 1.6; o.thrower = e; o.hitIds = new Set([e]); o.dodged = false; o.safeT = 0.2; o.tinderKick = true;
        G.dust(o.x, o.y + o.r - 1, 3); G.emit('sfx', { name: 'kick_heavy', x: o.x, vol: 0.8, pitch: 0.7 });
      }
    }
    if (e.spT > 0.3) { e.sp = null; e.recT = 0.4; e.cdT = G.bCd(e); }
    return true;
  }
  return false;
}
