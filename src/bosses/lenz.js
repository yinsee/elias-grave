// Viktor Lenz, "First Violin": The Last Train's boss (docs/levels/07-last-train.md section 5), the Conductor's blade. Pale, young, a
// white suit grey with rain, a violin case with a thin sabre in it. He fights like Elias was taught, to a strict beat.
// The beat clock (the run keeps it: src/levels/train/run.js): 3 beats a bar (a waltz) at 84, 104, 126 BPM by phase. He picks a move
// only on beat 1; the tell is beats 1-2; the strike lands on beat 3 (the TOCK, a white rim light). Beat 1 of the next bar is his
// recovery (the punish window, longer on Easy). Hazards (gantries, tunnels) reach the arena on beat 1, warned one bar before; he
// never strikes on a beat a hazard crosses him: he ducks or vaults it.
//   lunge      beat 1 sabre back, beat 2 the point glints, beat 3 a 90 px thrust      -> roll through on 3, or jump
//   waltz      beat 1 sabre high; then a cut on each beat of the next bar: high, high, low -> crouch, crouch, jump
//   bow        beats 1-2 the sabre across him like a bow: a blow then is parried and answered (riposte) -> wait for beat 3
//   caseThrow  beat 1 the case swung back; thrown on 3 (it bounces once and lies there)    -> duck or roll; throw it back: 1 s stun
//   pizzicato  (phase 2+) steel pegs, one a beat of the next bar: high, low, high          -> crouch, jump, crouch
//   vault      (phase 2+, on a gantry) he swings over you on the beam, lands behind with a cut on 3 -> roll toward him on beat 2
//   cadenza    (phase 3) the bell rings twice (a bar's count-in), six cuts on half-beats    -> back off, or roll through the 4th; 1.6 s open after
//   rubato     (below 10 %, once) the metronome stops a bar: the silence is the tell; then an off-beat lunge -> roll in the silence
// The game calls lenzThink / lenzSpecial; the run calls lenzBeat on every beat (M: the level run).

export const LENZ = {
  kind: 'lenz', name: 'Viktor Lenz', title: 'First Violin', look: 'lenz',
  hp: [800, 1000, 1150, 1300], s: 1.06, m: 4, speed: 34, reach: 30, dmg: 16, heavyDmg: 26, poise: 35, windup: 0.4, cd: [0.6, 1.2],
  R: { w: 'machete', len: 12, off: -1.1, reach: 30 },
  bpm: [84, 104, 126], meter: 3,
  punish: [2, 1.5, 1, 1],            // beats after a strike
  lunge: { dmg: 18, v: 300, t: 0.3 }, waltz: { dmg: [12, 12, 16] }, bow: { rip: [14, 22, 26, 30] }, caseThrow: { dmg: 14, stun: 1 },
  pizz: { dmg: 8, h: ['high', 'low', 'high'] }, vault: { dmg: 18 }, cadenza: { dmg: 12, n: 6, rest: 1.6 }, rubato: { v: 320, dmg: 20, below: 0.1 },
  gantryHit: { k: 0.12, stun: 2 },
  ph2: { below: 0.65 }, ph3: { below: 0.3 },
  moves: {   // weights by phase
    1: { lunge: 3, waltz: 3, bow: 2, caseThrow: 1, taunt: 1 },
    2: { lunge: 2, waltz: 3, bow: 1, pizz: 2, vault: 2 },
    3: { lunge: 2, waltz: 2, pizz: 1, vault: 1, cadenza: 2 },
  },
  lines: {
    allegro: 'Allegro.', rushing: "You're rushing.", again: 'Again. From the top.', presto: "Presto. Let's lose the orchestra.", rest: 'You heard the rest.',
    count: ['One.', 'Two.', 'Three.'], dying: 'He said you would still drop your left guard.',
  },
};
const L = LENZ;

// between moves: keep a sabre's length and a half, face him
export function lenzThink(M, e, dt, px, dx, adx, level, aggro) {
  const G = M.G, dir = Math.sign(dx) || 1;
  e.tx = null; e.run = 1;
  if (e.stunT > 0) e.stunT -= dt;
  if (e.hold) { e.vx = 0; e.face = Math.sign(px - e.x) || -1; return; }
  if (e.recT > 0) { e.recT -= dt; return; }
  if (e.mv || e.act || e.sp || e.hurtT > 0 || e.air) return;
  const lim = M.lenzLimit(e);
  const want = 34;
  if (adx > want + 6) e.tx = Math.max(lim[0], Math.min(lim[1], px - dir * want));
  else if (adx < 20) e.tx = Math.max(lim[0], Math.min(lim[1], e.x - dir * 14));
  e.face = dir;
  void G;
}

// every beat of the clock: n = 0, 1, 2 (beats 1, 2, 3 of the bar)
export function lenzBeat(M, e, n) {
  const G = M.G, d = G.diffSel, bt = M.beatLen(), px = G.ctl.x, adx = Math.abs(px - e.x), dir = Math.sign(px - e.x) || 1;
  if (e.dead || e.hold || e.intro) return;
  if (e.stunT > 0 || e.hurtT > 0.3) { if (e.mv && e.mv.name !== 'cadenza') e.mv = null; return; }
  const P = L.punish[d] * bt;
  // a move in progress
  if (e.mv) {
    const m = e.mv; m.k++;
    const k = m.k;
    switch (m.name) {
      case 'lunge':
        if (d >= 2 && k === 1) { G.bStart(e, 'stab', bt - 0.02, 'lunge', L.lunge.dmg); M.glint(e); }
        if (k === 1 && d < 2) M.glint(e);
        if (k === 2) { e.dashT = L.lunge.t; e.dashV = L.lunge.v; M.tock(e); }
        if (k === 3) { endMove(M, e, P); }
        break;
      case 'waltz':
        if (k === 3) M.tock(e, true);   // (the first cut: the slash begun on beat 1 lands now)
        if (k === 4) { G.bStart(e, 'slash', 0.03, 'waltz', L.waltz.dmg[1]); M.tock(e, true); }
        if (k === 5) { G.bStart(e, 'lowstab', 0.03, 'waltz', L.waltz.dmg[2]); M.tock(e); }
        if (k === 6) endMove(M, e, P);
        break;
      case 'bow':
        if (k === 2) { e.bow = false; e.guardT = 0; e.exposed = Math.max(e.exposed || 0, bt * 1.1); M.tock(e); }
        if (k === 3) endMove(M, e, 0);
        break;
      case 'caseThrow':
        if (k === 2) M.tock(e);
        if (k === 3) endMove(M, e, P * 0.5);
        break;
      case 'pizz':
        if (k >= 3 && k <= 5) { M.peg(e, L.pizz.h[k - 3], L.pizz.dmg); M.tock(e, k !== 5); }
        if (k === 6) endMove(M, e, P);
        break;
      case 'vault':
        if (k === 1) M.vaultSwing(e, 2 * bt);
        if (k === 3) { G.bStart(e, 'slash', 0.03, 'vault', L.vault.dmg); M.tock(e); }   // he lands behind you as the beam passes
        if (k === 4) endMove(M, e, P * 1.5);
        break;
      case 'cadenza':
        if (k === 1) M.bell(e);
        if (k >= 3 && k < 6) { e.cadN = 0; M.cadenzaBeat(e, bt); }
        if (k === 6) { endMove(M, e, L.cadenza.rest); e.exposed = Math.max(e.exposed || 0, L.cadenza.rest); }
        break;
      case 'taunt':
        if (k < 3) G.bark(e, L.lines.count[k]);
        if (k === 3) endMove(M, e, 0);
        break;
      case 'rubato':
        if (k === 3) { e.mv = null; M.rubatoGo(e); }
        break;
      default: e.mv = null;
    }
    if (e.mv && e.mv.k > 9) e.mv = null;
    return;
  }
  if (n !== 0 || e.sp) return;   // (ducking a hazard, the roar, a lunge in flight: no new move)
  // beat 1: phase changes, desperation, then a move
  const hpK = e.hp / e.maxHp;
  if (e.ph === 1 && hpK < L.ph2.below) { M.lenzPhase(e, 2); return; }
  if (e.ph === 2 && hpK < L.ph3.below) { M.lenzPhase(e, 3); return; }
  if (e.ph === 3 && hpK < L.rubato.below && !e.rubatoDone) { e.rubatoDone = true; e.mv = { name: 'rubato', k: 0 }; M.rubato(e); return; }
  if (M.gantryWarned()) {   // a gantry reaches the arena on the next beat 1: from phase 2 he rides it (the vault); before that he ducks it
    if (e.ph >= 2 && adx < 140) { e.face = dir; e.mv = { name: 'vault', k: 0 }; G.bossTell(e, 'vault', 2 * bt); M.say('vault', 'He vaults the gantry', 'Roll toward him on beat 2: under the swing', true); return; }
    M.duck(e); return;
  }
  if (M.hazardNear(e)) { M.duck(e); return; }   // a tunnel portal crosses him this bar: he ducks it
  const W = { ...L.moves[e.ph] };
  delete W.vault;
  if (adx > 120) { delete W.waltz; delete W.bow; }
  if (adx > 70) delete W.waltz;
  if (adx < 40) delete W.caseThrow;
  if (!M.caseInHand(e)) delete W.caseThrow;
  if (d === 0 && W.taunt == null && e.ph === 1) W.taunt = 0;
  const names = Object.keys(W).filter(k => W[k] > 0); let sum = 0; for (const k of names) sum += W[k];
  let r = G.simRand() * sum, name = names[0];
  for (const k of names) { r -= W[k]; if (r <= 0) { name = k; break; } }
  if (!name) return;
  e.face = dir; e.mv = { name, k: 0 };
  if (d === 0 && e.ph === 1 && name !== 'taunt' && name !== 'bow') G.bark(e, 'One. Two.');
  switch (name) {
    case 'lunge': if (d < 2) G.bStart(e, 'stab', 2 * bt - 0.02, 'lunge', L.lunge.dmg); else G.bossTell(e, 'lunge', 2 * bt); break;
    case 'waltz': G.bStart(e, 'slash', 3 * bt - 0.03, 'waltz', L.waltz.dmg[0]); break;   // the wind-up holds three beats: the first cut lands on beat 1 of the next bar
    case 'bow': e.bow = true; e.guardT = 2 * bt; G.bossTell(e, 'bow', 2 * bt); M.sfx('bell_ting', e.x, 0.4, 2.2); break;
    case 'caseThrow': G.bStart(e, 'throw', 2 * bt, 'caseThrow'); e.caseThrow = true; break;
    case 'pizz': G.bossTell(e, 'pizzicato', 3 * bt); M.say('pizz', 'Pizzicato', 'Steel pegs, one a beat: high, low, high. Crouch, jump, crouch.', true); break;
    case 'cadenza': G.bossTell(e, 'cadenza', 3 * bt); M.say('cadenza', 'Cadenza', 'Six fast cuts after the bell. Back off, or roll through. He is open after.', true); break;
    case 'taunt': G.bossTell(e, 'taunt', 3 * bt); break;
  }
}
function endMove(M, e, punish) { e.mv = null; e.bow = false; if (punish > 0) { e.recT = Math.max(e.recT, punish); } }

// his committed specials (the rubato's off-beat lunge, the vault's swing): true = handled
export function lenzSpecial(M, e, dt, px) {
  const G = M.G, ctl = G.ctl;
  if (e.sp === 'lrubato') {
    e.spT += dt; e.vx = e.face * L.rubato.v;
    if (!e.hitP && G.hero.mode === 'anim' && G.hero.invT <= 0 && Math.abs(ctl.x - e.x) < 14 && Math.abs(ctl.y - e.y) < 14) { e.hitP = true; G.hurtPlayer(L.rubato.dmg, ctl.x, ctl.y - 14, e.face, true, 1.4, { e, kind: 'charge' }); }
    const lim = M.lenzLimit(e);
    if (e.spT > 0.7 || e.x <= lim[0] || e.x >= lim[1]) { e.sp = null; e.vx = 0; e.recT = 1.2; M.rubatoEnd(e); }
    return true;
  }
  if (e.sp === 'lvault') {
    e.spT += dt; const k = Math.min(1, e.spT / e.vT);
    e.x = e.vx0 + (e.vx1 - e.vx0) * k; e.y = M.GROUND - 2 - Math.sin(Math.PI * k) * 34; e.vx = 0; e.air = false;
    if (k >= 1) { e.sp = null; e.y = M.GROUND - 2; e.face = Math.sign(px - e.x) || e.face; }
    return true;
  }
  if (e.sp === 'lduck') { e.spT += dt; e.vx = 0; e.crouchT = 0.1; if (e.spT > e.duckT) e.sp = null; return true; }
  return false;
}
