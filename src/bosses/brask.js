// Count Teodor Brask: the House Always Wins boss (docs/levels/03-house-always-wins.md section 5), a Baritone of the Choir and the
// owner of the Grand Casino Orfeo. Tall and thin, a white tuxedo, a monocle on a gold chain, silver hair, a black cane with a silver
// crook. Razor-edged cards. A light, evasive duellist: he sidesteps, he never trades blows, he punishes greed.
//   Phase 1 "Rien ne va plus" (the hall of mirrors, 100-65 %): cane strings, the card fan (a monocle glint), the cane hook (the crook
//     turned down: roll it), the shuffle (every mirror ripples: he and his decoys step into the glass and out of other panes), the
//     decoys (a snap: glass copies of him, one per mirror). Only the real Count has a reflection, a floor shadow, and blood on his suit.
//     The phase ends at 65 % or when 2 mirrors or fewer are left: he backs into the far mirror wall and smashes it.
//   Phase 2 "The Wheel" (the roulette salon, 65-30 %): the wheel floor drifts (it reverses every 12 s); the croupier calls a colour
//     (those pockets glow, then shock everyone on them, the Count too); the ball rolls across the floor (jump or roll it; it stuns him);
//     he likes the hub (cards from up there); Rake croupiers come over the rim.
//   Phase 3 "All In" (below 30 %): the monocle goes; faster; the spinning-cane charge (into the hub or a rim lip he is stunned), the card
//     rain (12 marks on the floor), double colour calls, Pit Bosses on the balconies; the salon chandelier is the hero's one-time weapon.
//   The sidestep: after 3 hits in a row (4 on Easy) he slips the next light blow and ripostes with a cane thrust. A heavy, a sweep or a
//     thrown thing breaks the rhythm.
// The game calls braskThink(M, e, ...) and braskSpecial(M, e, dt, px) (M: the level run, src/levels/casino/run.js); the decoys run
// decoyThink. The arena gimmicks (mirrors, the wheel, the ball, the calls) live in the run.

export const BRASK = {
  kind: 'brask', name: 'Count Teodor Brask', title: 'Baritone · owner of the Grand Casino Orfeo', look: 'brask',
  hp: [700, 840, 920, 1000], s: 1.1, m: 5, speed: 30, reach: 26, dmg: 12, heavyDmg: 20, poise: 18, windup: 0.32, cd: [0.8, 1.5],
  R: { w: 'cane', len: 13, off: -0.35, reach: 26 }, skin: ['#ecd6c0', '#c4aa92'],
  combos: [['stab'], ['stab', 'lowstab'], ['clunge'], ['stab', 'stab', 'clunge']],   // a cane jab; jab and the low sweep (jump it); the thrust; jab jab thrust
  moveDmg: { stab: 10, lowstab: 12, clunge: 14, slash: 10 },   // per blow (a second `dmg` key here overrode the number above: a NaN hit, the freeze)
  sidestep: { after: [4, 3, 3, 3], riposte: 12 },
  fan: { n: [3, 3, 5, 5], spread: 0.09, v: 260, dmg: 7, windup: 0.45, rec: 0.7, cd: [2.6, 4.4], range: [44, 190] },
  hook: { reach: 36, windup: 0.5, knee: 8, toss: 10, miss: 1.0, cd: [5, 8] },
  shuffle: { windup: 0.6, re: 0.4, cd: [7, 11] },
  decoys: { n: [2, 3, 4, 5], cd: 10, windup: 0.5, dmgK: [0.5, 0.5, 0.5, 1], cane: 6, punish: [false, false, true, true] },
  ph2: { below: 0.65, mirrors: 2 },
  ph3: { below: 0.30, speed: 34, cd: [0.5, 1.1], windup: 0.26 },
  drift: { p2: [14, 20, 24, 28], p3: [24, 36, 42, 48], every: [12, 8], ramp: 0.8, warn: 1.0 },
  call: { t: [1.4, 1.1, 1.0, 0.8], dmg: 10, stun: 0.6, every: [[8, 11], [6, 9], [6, 9], [4.5, 7]], every3: [5, 7], double: [false, true, true, true], pick: 0.65 },
  ball: { warn: 0.8, v: 160, dmg: 14, stun: 2.0 },
  rain: { n: 12, windup: 0.9, dmg: 6, rec: 0.8, cd: [6, 9] },
  allIn: { windup: 0.7, v: 240, maxT: 1.2, stun: 1.8, dmg: 16, cd: [6, 9] },
  crew2: { every: 7, alive: [1, 2, 2, 3], roles: ['rake'] }, crew3: { every: 9, alive: [1, 1, 2, 2], roles: ['pitboss', 'pitboss', 'sharp'] },
  chand: { bossK: 0.12, stun: 3 },
  lines: { wrong: 'Wrong card, Grave.', shift: 'The house changes tables.', allin: 'All in.', ball: 'Not *my* ball!', defeat: 'Zéro. La maison gagne.', taunt: 'Place your bets.', rouge: 'Faites vos jeux... Rouge!', noir: 'Rien ne va plus... Noir!' },
};
const B_ = BRASK;
const heroFree = G => G.hero.mode === 'anim' && !G.ctl.air;

export function braskThink(M, e, dt, px, dx, adx, level, aggro) {
  const G = M.G, dir = Math.sign(dx) || 1, d = G.diffSel;
  e.tx = null; e.run = 1;
  if (e.stunT > 0) e.stunT -= dt;
  e.cdT -= dt; e.fanCd -= dt; e.hookCd -= dt; e.shufCd -= dt; e.decoyCd -= dt; e.rainCd -= dt; e.allInCd -= dt; e.tauntCd -= dt;
  if (e.recT > 0) { e.recT -= dt; return; }
  if (!aggro || e.sp || e.act || e.hurtT > 0 || e.air || e.exposed > 0) return;
  // the phase changes
  if (e.ph === 1 && (e.hp <= e.maxHp * B_.ph2.below || M.mirrorsLeft() <= B_.ph2.mirrors)) { M.braskShift(e); return; }
  if (e.ph === 2 && e.hp <= e.maxHp * B_.ph3.below) {
    G.bossPhase(e, 3, B_.lines.allin);
    Object.assign(e, { speed: B_.ph3.speed, cd: B_.ph3.cd.slice(), windup: B_.ph3.windup, rainCd: 2, allInCd: 3.5 });
    M.braskPhase3(e);
    return;
  }
  const free = level && heroFree(G), P1 = e.ph === 1, P3 = e.ph >= 3;
  // phase 1: the decoys (opening and when fewer than half are left), the shuffle
  if (P1 && e.decoyCd <= 0 && M.decoysLeft() < Math.ceil(M.decoyN() / 2) && M.mirrorsLeft() > 1) {
    e.decoyCd = B_.decoys.cd; G.bSpecial(e, 'decoys', G.bTell(B_.decoys.windup), 'snap'); G.emit('sfx', { name: 'card_riffle', x: e.x, vol: 0.5, pitch: 1.6 }); return;
  }
  if (P1 && e.shufCd <= 0 && M.decoysLeft() > 0 && G.simRand() < 0.5) {
    e.shufCd = G.bRand(B_.shuffle.cd); G.bSpecial(e, 'shuffle', G.bTell(B_.shuffle.windup), 'shuffle'); M.ripple(B_.shuffle.windup); G.emit('sfx', { name: 'card_riffle', x: e.x, vol: 0.8 }); return;
  }
  // phase 3: the all-in charge (the cane spins), the card rain
  if (P3 && e.allInCd <= 0 && free && adx > 50 && adx < 260) {
    e.allInCd = G.bRand(B_.allIn.cd); G.bSpecial(e, 'charge', G.bTell(B_.allIn.windup), 'allIn', px); e.allIn = true; G.emit('sfx', { name: 'roulette_rumble', x: e.x, vol: 0.9, pitch: 1.3 }); return;
  }
  if (P3 && e.rainCd <= 0 && level) {
    e.rainCd = G.bRand(B_.rain.cd); G.bSpecial(e, 'tuna', G.bTell(B_.rain.windup), 'cardRain'); M.rainMarks(e, px); return;
  }
  // phase 2: he likes the hub: from up there the card fan at both sides (and no hook)
  const onHub = M.onHub(e);
  if (!onHub && adx <= e.reach + 1 && free && e.cdT <= 0) {   // close: the cane first (he never trades blows long: a jab and out)
    e.face = dir; e.goHub = false; const r = G.simRand(), Cb = B_.combos;
    e.combo = Cb[r < 0.35 ? 0 : r < 0.6 ? 1 : r < 0.8 ? 2 : 3]; e.ci = 0;
    G.bStart(e, e.combo[0], G.bTell(e.windup), 'cane', B_.moveDmg[e.combo[0]]); return;
  }
  if (e.ph === 2 && !onHub && e.hubCd <= 0 && adx > 50 && G.simRand() < dt * 0.6) { e.hubCd = 9; e.goHub = true; e.goHubT = 3; }
  if (e.goHub && !onHub && (e.goHubT -= dt) > 0) { e.run = 2; if (M.toHub(e, dt)) { e.run = 2; return; } }
  else e.goHub = false;
  if (onHub) { e.goHub = false; e.hubT = (e.hubT || 0) + dt; if (e.hubT > 5 || adx < 30) { e.hubT = 0; e.tx = M.hubEdge(e, px); e.run = 1.2; } }
  e.hubCd = (e.hubCd || 0) - dt;
  // the card fan from range (a monocle glint)
  if (e.fanCd <= 0 && level && adx > B_.fan.range[0] && adx < B_.fan.range[1]) {
    e.fanCd = G.bRand(B_.fan.cd) * (onHub ? 0.7 : 1); e.face = dir; G.bStart(e, 'throw', G.bTell(B_.fan.windup), 'cardFan'); M.glint(e);
    G.emit('sfx', { name: 'monocle_ting', x: e.x, vol: 0.8 }); return;
  }
  // the taunt: the hero is far: a gold chip flipped and caught (a free opening)
  if (e.tauntCd <= 0 && adx > 200) { e.tauntCd = 9; e.sp = 'taunt'; e.spT = -1.0; G.bossTell(e, 'taunt', 1.0); G.bark(e, B_.lines.taunt); return; }
  // the cane hook: the crook turned down, then a pull, the knee and a throw (roll it)
  if (!onHub && e.hookCd <= 0 && free && adx > 18 && adx < B_.hook.reach + 8) {
    e.hookCd = G.bRand(B_.hook.cd); e.hookHp = e.hp; G.bSpecial(e, 'grab', G.bTell(B_.hook.windup), 'caneHook'); G.emit('sfx', { name: 'cane_whoosh', x: e.x, vol: 0.6, pitch: 0.6 }); return;
  }
  if (onHub) { e.face = dir; if (adx < e.reach + 2 && free && e.cdT <= 0) { e.combo = B_.combos[0]; e.ci = 0; G.bStart(e, 'stab', G.bTell(e.windup), 'cane', B_.moveDmg.stab); } return; }
  if (adx > e.reach + 1) { e.tx = px - dir * e.reach * 0.7; e.run = P3 ? 1.25 : 1; return; }
  e.face = dir;
  if (free && e.cdT <= 0) {
    const r = G.simRand(), Cb = B_.combos;
    e.combo = Cb[r < 0.35 ? 0 : r < 0.6 ? 1 : r < 0.8 ? 2 : 3]; e.ci = 0;
    G.bStart(e, e.combo[0], G.bTell(e.windup), 'cane', B_.moveDmg[e.combo[0]]);
  }
  void d;
}

// a decoy: the Count's brain on a delay, with random picks; it stays near its mirror; one hit and it shatters (the run does that)
export function decoyThink(M, e, dt, px, dx, adx, level, aggro) {
  const G = M.G, dir = Math.sign(dx) || 1;
  e.tx = null; e.run = 1;
  e.cdT -= dt; e.fanCd -= dt;
  if (e.recT > 0) { e.recT -= dt; return; }
  if (!aggro || e.sp || e.act || e.hurtT > 0 || e.air) return;
  const pane = M.paneOf(e), x0 = pane ? (pane.x0 + pane.x1) / 2 - 80 : e.x - 80, x1 = pane ? (pane.x0 + pane.x1) / 2 + 80 : e.x + 80;
  if (e.fanCd <= 0 && level && adx > 50 && adx < 170 && G.simRand() < 0.5) {
    e.fanCd = 3 + G.simRand() * 3; e.face = dir; G.bStart(e, 'throw', G.bTell(B_.fan.windup + 0.15), 'cardFan'); return;
  }
  const want = px - dir * e.reach * 0.7;
  e.tx = Math.max(x0, Math.min(x1, want));
  if (adx <= e.reach + 1 && level && heroFree(G) && e.cdT <= 0) {
    e.face = dir; e.combo = G.simRand() < 0.5 ? ['stab'] : ['stab', 'lowstab']; e.ci = 0;
    G.bStart(e, 'stab', G.bTell(e.windup + 0.15), 'cane', B_.decoys.cane);
  }
}

// his own committed moves (the game's bossSpecial runs this first); true = handled. 'roar' is the shared one
export function braskSpecial(M, e, dt, px) {
  const G = M.G, ctl = G.ctl, hero = G.hero;
  if (e.sp === 'taunt') { e.spT += dt; e.vx = 0; if (e.spT >= 0) { e.sp = null; e.cdT = 0.2; } return true; }
  if (e.sp === 'decoys') { const t0 = e.spT; e.spT += dt; if (t0 < 0 && e.spT >= 0) { M.summonDecoys(e); } if (e.spT > 0.25) { e.sp = null; e.cdT = G.bCd(e); } return true; }
  if (e.sp === 'shuffle') { const t0 = e.spT; e.spT += dt; e.vx = 0; if (t0 < 0 && e.spT >= 0) M.shuffle(e); if (e.spT > B_.shuffle.re) { e.sp = null; e.cdT = G.bCd(e); } return true; }
  if (e.sp === 'tuna') {   // the card rain: a whole deck up (both hands high), the marks on the floor, then the cards come down
    const t0 = e.spT; e.spT += dt; e.vx = 0;
    if (t0 < 0 && e.spT >= 0) M.cardRain(e);
    if (e.spT > 0.3) { e.sp = null; e.recT = B_.rain.rec; e.cdT = G.bCd(e); }
    return true;
  }
  if (e.sp === 'charge') {   // all in: the cane spins like a propeller, a charge across the wheel (the drift adds to it)
    e.spT += dt;
    if (e.spT < 0) { if (e.spT < -0.3) e.face = Math.sign(px - e.x) || e.face; return true; }
    e.vx = e.face * B_.allIn.v + M.driftAt(e);
    if (G.simRand() < dt * 30) G.dust(e.x - e.face * 5, e.y + 1, 1);
    if (!e.hitP && hero.mode === 'anim' && hero.invT <= 0 && !ctl.air && Math.abs(G.P[2].x - e.x) < 10 * e.s && Math.abs(ctl.y - e.y) < 12) { e.hitP = true; G.hurtPlayer(B_.allIn.dmg, G.P[2].x, G.P[2].y, e.face, true, 1.2, { e, kind: 'charge' }); }
    const wall = M.allInWall(e);
    if (wall || e.spT > B_.allIn.maxT) {
      e.sp = null; e.allIn = false; e.vx *= wall ? -0.3 : 0.3; e.cdT = G.bCd(e);
      if (wall) { e.recT = e.stunT = B_.allIn.stun; G.shakeIt(0.3, 3); G.dust(e.x + e.face * 8, e.y - 10, 8); G.hitStop = Math.max(G.hitStop, 0.08); G.emit('boss:stun', { boss: e, x: e.x, t: e.recT, by: wall }); G.emit('feat', 'wallstun'); }
      else e.recT = 0.6;
    }
    return true;
  }
  if (e.sp === 'grab') {   // the cane hook: the crook turned down (0.5 s); a lunge; caught: pulled in, the knee, a throw
    e.spT += dt;
    if (e.spT < 0) { if (e.hp < e.hookHp) { e.sp = null; e.recT = 0.4; return true; } if (e.spT < -0.15) e.face = Math.sign(px - e.x) || e.face; return true; }
    if (!e.mHold) {
      if (e.spT < 0.2) {
        e.vx = e.face * 90;
        if (hero.mode === 'anim' && hero.invT <= 0 && !ctl.air && Math.abs(ctl.x - (e.x + e.face * 14)) < B_.hook.reach * 0.6 && Math.abs(ctl.y - e.y) < 12) {
          e.mHold = true; e.holdT = 0; e.vx = 0; G.lockT = Math.max(G.lockT, 0.9); hero.act = null; ctl.spd = 0; G.emit('sfx', { name: 'cane_whoosh', x: e.x, vol: 0.8, pitch: 0.8 });
        }
        return true;
      }
      e.sp = null; e.vx = 0; e.recT = B_.hook.miss; e.exposed = Math.max(e.exposed || 0, B_.hook.miss); e.cdT = G.bCd(e);   // he overbalances
      return true;
    }
    const h0 = e.holdT; e.holdT += dt; e.vx = 0;
    const tx = e.x + e.face * 10; ctl.x += (tx - ctl.x) * Math.min(1, dt * 18); ctl.spd = 0; ctl.face = -e.face;
    if (h0 < 0.25 && e.holdT >= 0.25) { hero.invT = 0; G.hurtPlayer(B_.hook.knee, G.P[1].x, G.P[1].y, e.face, false, 0.3, { e, kind: 'grab' }); }   // the knee
    if (e.holdT >= 0.6) { e.sp = null; e.mHold = false; e.recT = 0.4; e.cdT = G.bCd(e); G.lockT = 0; hero.invT = 0; G.hurtPlayer(B_.hook.toss, G.P[1].x, G.P[1].y, e.face, true, 2.2, { e, kind: 'grab' }); }   // the throw
    return true;
  }
  return false;
}
