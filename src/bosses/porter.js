// "The Porter" (Bruno): St. Cecilia's mini-boss (docs/levels/05-st-cecilia.md beat 8), the head porter of the morgue. A huge man in
// rolled sleeves who swings a steel oxygen tank as a club. He fights in the generator hall; the generator lever waits behind him.
//   string: tank swings, 3 hits, the last a knock-down                     -> dodge the wind-up, punish the long recovery after the third
//   gurney charge: he grips a gurney (a squeal, 0.5 s) and runs it at you  -> jump it or roll through; into the wall he is stunned
//   tank throw: a tank lands, hisses 1.2 s, then blows (60 px)              -> get clear, or kick it back at him: a blast stuns him 2 s
//   poise 20: light hits do not stagger him
// The game calls porterThink(M, e, ...) and porterSpecial(M, e, dt, px) (M: the level run, src/levels/hospital/run.js).

export const PORTER = {
  kind: 'porter', name: 'Bruno "The Porter"', title: 'Head porter of the morgue', look: 'porter',
  hp: [220, 260, 300, 340], s: 1.2, m: 5, speed: 26, reach: 25, dmg: 11, heavyDmg: 18, poise: 20, windup: 0.36, cd: [0.9, 1.6],
  R: { w: 'tank', len: 10, off: -1.1, reach: 25 },
  combos: [['chop'], ['chop', 'chop'], ['chop', 'chop', 'hchop']],
  charge: { windup: 0.5, v: 220, maxT: 1.3, dmg: 14, cd: [6, 9], range: [60, 200], wallStun: 1.6, rec: 1.0 },
  toss: { windup: 0.5, cd: [5, 8], range: [70, 220], fuse: 1.2, rec: 0.7 },
  adds: 0.5,   // the cold room's door opens at half his health
  lines: { intro: 'Cold room, Sandman. Doctor says.', charge: 'Mind your feet!', defeat: 'Doctor... the lights...' },
};

export function porterThink(M, e, dt, px, dx, adx, level, aggro) {
  const G = M.G, P = PORTER, dir = Math.sign(dx) || 1;
  e.tx = null; e.run = 1;
  if (e.stunT > 0) e.stunT -= dt;
  e.cdT -= dt; e.chgCd -= dt; e.tossCd -= dt;
  if (e.recT > 0) { e.recT -= dt; return; }
  if (!aggro || e.sp || e.act || e.hurtT > 0 || e.air || e.exposed > 0) return;
  const free = level && G.hero.mode === 'anim' && !G.ctl.air;
  if (e.chgCd <= 0 && free && adx > P.charge.range[0] && adx < P.charge.range[1]) {
    e.chgCd = G.bRand(P.charge.cd); G.bSpecial(e, 'gcharge', G.bTell(P.charge.windup), 'charge', px); G.bark(e, P.lines.charge);
    G.emit('sfx', { name: 'tuna_creak', x: e.x, vol: 0.8, pitch: 1.6 }); return;
  }
  if (e.tossCd <= 0 && G.hero.mode === 'anim' && adx > P.toss.range[0] && adx < P.toss.range[1]) {
    e.tossCd = G.bRand(P.toss.cd); G.bSpecial(e, 'ttoss', G.bTell(P.toss.windup), 'throw', px); return;
  }
  if (adx > e.reach + 1) { e.tx = px - dir * e.reach * 0.7; return; }
  e.face = dir;
  if (free && e.cdT <= 0) {
    const r = G.simRand(), Cb = P.combos;
    e.combo = Cb[r < 0.35 ? 0 : r < 0.65 ? 1 : 2]; e.ci = 0;
    G.bStart(e, e.combo[0], G.bTell(e.windup), 'tank');
  }
}

// his own committed moves (the game's bossSpecial runs this first); true = handled
export function porterSpecial(M, e, dt, px) {
  const G = M.G, P = PORTER, ctl = G.ctl;
  if (e.sp === 'gcharge') {
    const t0 = e.spT; e.spT += dt;
    if (e.spT < 0) { if (e.spT < -0.25) e.face = Math.sign(px - e.x) || e.face; e.vx = 0; M.gurneyAt(e); return true; }
    if (t0 < 0) { e.hitP = false; G.emit('sfx', { name: 'dodge_whoosh', x: e.x, vol: 0.8, pitch: 0.6 }); }
    e.vx = e.face * P.charge.v; M.gurneyAt(e);
    const gx = e.x + e.face * 20;
    if (!e.hitP && G.hero.mode === 'anim' && G.hero.invT <= 0 && Math.abs(ctl.x - gx) < 14 && ctl.y > G.GROUND - 22) {   // a jump clears the gurney
      e.hitP = true; G.hurtPlayer(P.charge.dmg, ctl.x, ctl.y - 8, e.face, true, 2, { e, kind: 'charge' });
    }
    M.bowl(gx, e.face, e);
    const A = M.porterArena(), wall = (e.face < 0 && e.x <= A.x0 + 22) || (e.face > 0 && e.x >= A.x1 - 22);
    if (wall || e.spT > P.charge.maxT) {
      e.sp = null; e.vx = 0; M.gurneyAt(null);
      if (wall) { e.stunT = e.recT = P.charge.wallStun; G.shakeIt(0.3, 3); G.hitStop = Math.max(G.hitStop, 0.08); G.emit('sfx', { name: 'crate_break', x: gx, vol: 1, pitch: 0.6 }); G.emit('boss:stun', { boss: e, x: e.x, t: e.recT, by: 'wall' }); }
      else e.recT = P.charge.rec;
      e.cdT = G.bCd(e);
    }
    return true;
  }
  if (e.sp === 'ttoss') {
    const t0 = e.spT; e.spT += dt;
    if (e.spT < 0) { if (e.spT < -0.2) e.face = Math.sign(px - e.x) || e.face; return true; }
    if (t0 < 0) { const h = e.J[6]; M.throwTank(e, h.x, h.y - 6, px, P.toss.fuse); G.emit('sfx', { name: 'dodge_whoosh', x: e.x, vol: 0.7, pitch: 0.8 }); }
    if (e.spT > 0.3) { e.sp = null; e.recT = P.toss.rec; e.cdT = G.bCd(e); }
    return true;
  }
  return false;
}
