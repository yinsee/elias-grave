// Level 8, "The Spire": the crown. The Conductor's fight (docs/levels/08-the-spire.md section 5) and the game's ending (5.8, 6.5, 6.6).
//   the crown clock: the quarter, the peal (rings along the floor), "Again. From the top.", winding forward, the phase shifts
//   phase 1 the gear room: rotating tooth platforms (riders carried), the mesh points (a crush), the crew by the hatch
//   phase 2 the pendulum hall: the bob hits anyone standing in its path (roll or squat under it), Bell too when he is open
//   phase 3 the face, outside (the game's club): the minute hand is a sloped platform, wind gusts toward the drop, the radial ring
//   the Last Movement: Nero's bite, FINISH (slow motion), Last Breath on a miss; the freeze frame
//   the ending: Bell hangs from the minute hand; "I am home."; twelve strikes; he falls on the seventh; the rain stops on the twelfth;
//   the epilogue panels; the final card (this run and the whole story); the credits; back to the title
import { BELL } from '../../bosses/bell.js';
import { C } from '../../core/color.js';

const BEST_KEY = 'eliasgrave.best';

export function installCrown(X) {
  const { G, M, S, H, D } = X, ctl = G.ctl, hero = G.hero, GROUND = D.GROUND;
  const { dif, sfx, say, later, clamp } = H;
  const B = BELL, F = D.FACE;
  const QUARTER = [[15, 30], [30, 45], [45, 59]];

  X.crownReset = () => {
    Object.assign(S, {
      bell: null, bph: 0, bellHp: 0, shiftPending: false, shift: null, ladderOpen: false, faceOpen: false, faceStarted: false, dialBroken: false,
      clock: { m: 15, q0: 15, mark: 30, st: 'off', t: 0, id: 0, ring: 0, rn: 0, from: 0 }, peal: { lift: 0, swing: 0, k: 0 }, pealFx: [], radial: 0,
      teeth: [], gearA: [0, 0, 0], gearT: 0, crushT: 0, pend: null, pendPh: 0, pendFast: 0, clutch: 0, hand: null, handS: null,
      crewT: 6, crewN: 0, bandN: 0, lessonFam: null, lessonN: 0, neroRun: null, bitten: false, biteWin: null, lastBreath: false, fin: null,
      hatchOpen: false, hang: null, end: null, dry: false, rainK: 1, introSeen: S.introSeen || false, credits: null,
    });
    for (let g = 0; g < D.GEARS.length; g++) for (let k = 0; k < 4; k++) S.teeth.push({ g, k, s: H.addSurf({ x0: 0, x1: 0, y: 999, oneWay: true }) });
    gearsStep(0);
  };
  X.startBoss = () => H.teleport(1886, () => arriveGears(false), 5);

  // ---------------- the Conductor's body: spawned per room, his health carried ----------------
  function spawnBell(x, ph, hp, real) {
    const e = G.spawnEnemy('boss', x, real ? 'boss' : 'bell', { boss: B });
    Object.assign(e, { alert: true, face: -1, ph, bigBar: true, mini: !real, kind: 'bell', hold: !real });
    e.pal.hair = C('#d8d8d0');
    if (hp) e.hp = Math.max(1, Math.min(e.maxHp, hp));
    S.bell = e; S.bph = ph; return e;
  }
  function startClock(ph) { const [a, b] = QUARTER[ph - 1]; Object.assign(S.clock, { m: a, q0: a, mark: b, st: 'run', t: 0, ring: 0 }); }
  function arriveGears(quiet) {
    S.grp = 5; if (!G.flags.demo) G.setCkpt('sp:gears', 0, true);
    G.enc.arena = { x0: D.GEAR_ARENA.x0, x1: D.GEAR_ARENA.x1 };
    const e = spawnBell(2070, 1, S.bellHp || 0, false);
    G.setMusic('music:boss_bell_1', 0.8); H.setObjective('The crown', `${B.name}`);
    const go = () => { e.hold = false; e.cdT = 0.8; startClock(1); S.kos0 = G.kos; say('bell', 'The crown clock', 'At the quarter the bell rings: the rings run along the floor. Jump them. He lunges with the ring: jump, land behind him.', false); };
    if (G.flags.demo || quiet || S.introSeen) later(go, 0.6); else { S.introSeen = true; G.playScene('dialog', 'bell_intro').then(go); }
  }
  function arrivePend(quiet) {
    S.grp = 6; if (!G.flags.demo) G.setCkpt('sp:pend', 0, quiet === true);
    G.enc.arena = { x0: D.PEND_ARENA.x0, x1: D.PEND_ARENA.x1 };
    const e = spawnBell(2390, 2, S.bellHp, false);
    G.setMusic('music:boss_bell_2', 0.8); H.setObjective('The pendulum hall', B.name);
    later(() => { e.hold = false; e.cdT = 0.6; startClock(2); say('pend', 'The pendulum', 'It hits anyone standing in its path, him too when he is open: roll or squat under it. Bait his drop under it.', false); }, 0.8);
  }
  function startFace() {
    S.faceStarted = true; S.grp = 7;
    const enc = G.enc;
    enc.arena = { x0: D.FACE_ARENA.x0, x1: D.FACE_ARENA.x1 }; enc.spawnT = 99; enc.arenaSpawned = 0;
    const e = spawnBell(2640, 3, S.bellHp || Math.round(B.hp[dif()] * B.lines3[1]), true);
    e.hold = false; e.cdT = 1;
    enc.boss = e; enc.introT = -1; G.bossBarK = 1;
    if (G.ckBoss) { G.ckBoss = false; G.bossDlg.on = G.bossDlg.done = true; }
    G.setCkpt('boss');
    G.dog = G.makeDog(F.hatch, 1); G.dog.hidden = true; S.hatchOpen = false;
    S.handS = H.addSurf({ x0: F.cx - D.HAND.len, x1: F.cx, y: F.cy, oneWay: true });
    startClock(3); S.windNext = 3;
    G.setMusic('music:boss_bell_3', 1); G.bark(e, B.lines.p3);
    H.setObjective('The face', B.name);
    say('face', 'The face', 'The minute hand is a ledge until it tilts too far. Gusts push toward the drop.', false);
  }

  // ---------------- the crown clock and the quarter peal ----------------
  M.clock = () => ({ tele: S.clock.st === 'tele', left: S.clock.t, id: S.clock.id });
  const bellX = () => S.bph === 1 ? D.GEAR_ARENA.bell[0] : S.bph === 2 ? D.PEND_ARENA.bell[0] : F.bell[0];
  function startPeal() {
    const c = S.clock; c.st = 'tele'; c.t = B.peal.tele; c.id++;
    [0, 0.4, 0.8, 1.2].forEach((at, i) => later(() => sfx('bell_ting', bellX(), 1, [1.25, 1.0, 1.12, 0.84][i]), at));   // the Westminster quarter
    S.hudLow = true;
  }
  function clockStep(dt) {
    const c = S.clock, e = S.bell; if (c.st === 'off' || !e || e.dead || G.endPh) return;
    const Q = B.Q[dif()];
    if (c.st === 'run') {
      c.m += 15 / Q * dt;
      if (S.shiftPending && S.bph < 3) { c.st = 'wind'; c.from = c.m; c.t = 0; G.bark(e, 'Allegro.'); sfx('roulette_rumble', bellX(), 0.6, 1.6); }
      else if (c.m >= c.mark) { c.m = c.mark; startPeal(); }
    } else if (c.st === 'wind') { c.t += dt; c.m = c.from + (c.mark - c.from) * Math.min(1, c.t / 1.5); if (c.t >= 1.5) startPeal(); }
    else if (c.st === 'tele') { c.t -= dt; S.peal.lift = clamp(1 - c.t / B.peal.tele, 0, 1); if (c.t <= 0) { c.st = 'rings'; c.ring = 0; c.rn = B.rings[dif()][S.bph - 1]; c.t = 0; } }
    else if (c.st === 'rings') {
      c.t -= dt;
      if (c.t <= 0 && c.ring < c.rn) { c.ring++; c.t = B.peal.gap; ring(); }
      if (c.ring >= c.rn && c.t <= 0) afterPeal();
    } else if (c.st === 'reset') { c.t += dt; c.m = c.mark + (c.q0 - c.mark) * Math.min(1, c.t / (S.bph === 3 ? 2 : 1.5)); if (c.t >= (S.bph === 3 ? 2 : 1.5)) { c.st = 'run'; } }
    S.peal.k = Math.max(0, S.peal.k - dt); S.peal.swing += dt; if (c.st !== 'tele') S.peal.lift = Math.max(0, S.peal.lift - dt * 3);
    S.hudTxt = `XI · ${String(Math.floor(c.m)).padStart(2, '0')}`; S.hudK = (c.m - c.q0) / (c.mark - c.q0); S.hudLow = c.st === 'tele' || c.st === 'rings';
  }
  function ring() {   // one ring: it falls from the bell and runs both ways along the floor (jump it); riders are thrown off
    const bx = clamp(bellX(), G.enc.arena ? G.enc.arena.x0 + 10 : 0, G.enc.arena ? G.enc.arena.x1 - 10 : G.W);
    for (const dir of [-1, 1]) G.quakes.push({ x: bx + dir * 6, y: GROUND, dir, t: 0, hit: false, dmg: 16 });
    sfx('ground_slam', bx, 1, 0.7); sfx('bell_ting', bx, 1, 0.5); G.shakeIt(0.3, 3); S.peal.k = 1; S.peal.swing = 0;
    S.pealFx.push({ x: bx, y: GROUND - 2, r: 4, k: 0 });
    G.emit('boss:tell', { boss: S.bell, move: 'peal', t: 0, x: bx });
    const onTooth = S.teeth.find(t => ctl.surf === t.s);
    if (onTooth || (S.handS && ctl.surf === S.handS)) { const s = ctl.surf; ctl.x = ctl.x < (s.x0 + s.x1) / 2 ? s.x0 - 6 : s.x1 + 6; ctl.spd = 0; say('thrown', 'The peal throws riders off', 'Off the teeth and the hand', true); }
    if (S.bph === 3) S.radial = B.peal.pushT;
  }
  function afterPeal() {
    const c = S.clock, e = S.bell;
    if (S.shiftPending && S.bph < 3) { c.st = 'off'; phaseShift(); return; }
    G.bark(e, B.lines.again); c.st = 'reset'; c.t = 0; sfx('lever_clunk', bellX(), 0.9, 0.7);
    if (dif() <= 1 && S.bandN < 2 && S.bph < 3) { S.bandN++; G.ammoBoxes.push({ band: true, x: S.bph === 1 ? 1880 : 2176, y: GROUND - 8, vx: 0, vy: 0, life: 60 }); }
  }
  // ---------------- phase shifts: he climbs the ladder; he smashes the dial and steps outside ----------------
  function phaseShift() {
    const e = S.bell; S.shiftPending = false;
    e.exit = true; e.sp = null; e.act = null; e.combo = null; e.hold = false; S.bandN = 0;
    for (const g of G.enemies) if (!g.dead && g.zone === 'bcrew') G.killEnemy(g, 1, 200, 0.4);
    if (S.bph === 1) { e.exitX = D.GEAR_ARENA.ladder - 2; G.bark(e, B.lines.p2); }
    else { e.exitX = D.PEND_ARENA.dial - 8; G.bark(e, B.lines.p3); }
    G.emit('boss:phase', { boss: e, phase: S.bph + 1, line: S.bph === 1 ? B.lines.p2 : B.lines.p3 });
  }
  M.exitStep = (e, dt) => {
    e.tx = e.exitX; e.run = 0.8;
    if (Math.abs(e.x - e.exitX) > 4) return;
    S.bellHp = e.hp; const i = G.enemies.indexOf(e); if (i >= 0) G.enemies.splice(i, 1); if (G.zoneAlive[e.zone] > 0) G.zoneAlive[e.zone]--;
    S.bell = null; G.enc.arena = null; S.hudTxt = null;
    if (S.bph === 1) { S.ladderOpen = true; sfx('ladder_step', e.x, 0.8); G.toast('He climbs', 'The ladder ↑: the second movement', true); H.setObjective('The gear room', 'The ladder ↑'); }
    else {
      S.dialBroken = true; S.faceOpen = true; sfx('glass_burst_large', e.x, 1); sfx('mirror_shatter', e.x, 1, 0.7); G.shakeIt(0.4, 3);
      for (let k = 0; k < 30; k++) S.pages.push({ x: e.x - 30 + G.simRand() * 40, y: 120 + G.simRand() * 120, vx: 60 + G.simRand() * 80, vy: -20 + G.simRand() * 30, t: 0 });
      G.toast('The dial is broken', 'Follow him outside →', true); H.setObjective('The pendulum hall', 'Through the broken dial →');
    }
  };
  // ---------------- the brain's helpers ----------------
  M.lastMovement = e => e.ph >= 3 && e.hp <= e.maxHp * B.last[dif()] && !S.bitten;
  M.windingStart = e => {   // the Last Movement: his Winding starts; Nero bursts out of the hatch
    if (!M.lastMovement(e) || S.neroRun) return;
    S.neroRun = { t: 0 }; S.hatchOpen = true; sfx('door_slam', F.hatch, 1, 1.2); sfx('nero_bark', F.hatch, 1);
    const d = G.dog; if (d) { d.hidden = false; d.x = F.hatch; d.face = Math.sign(e.x - F.hatch) || 1; d.st = 'walk'; }
  };
  M.toothFor = e => S.bph === 1 ? S.teeth.filter(t => t.s.y > 100 && t.s.y < 200 && Math.abs(t.s.x0 + 10 - e.x) < 90).sort((a, b) => a.s.y - b.s.y)[0] || null : null;
  M.bob = () => S.pend || { x: 0, y: 0 };
  M.bobDir = () => Math.sign(Math.cos(S.pendPh)) || 1;
  M.bobNear = e => !!S.pend && S.pend.y > 210 && Math.abs(S.pend.x - e.x) < 60 && Math.sign(e.x - S.pend.x) === M.bobDir();
  M.unpin = () => { S.pendFast = D.PEND.fastT; S.clutch = 0.8; sfx('breaker_clunk', 2290, 1); sfx('douse_hiss', 2290, 0.9); G.toast('Unpinned', 'The pendulum runs fast for a while', true); };
  // his armour: invulnerable while he leaves a room; the Lesson; bullets turned aside; the phase lines; the finisher
  X.bellPreHit = (e, dmg) => {
    if (e.exit || e.hold) return null;
    const kind = G.enc.eHitKind, pm = G.MOVES[hero.act], heavy = kind === 1 && pm && pm.power >= 200, close = Math.abs(ctl.x - e.x) < 50;
    const blast = kind === 2 && hero.weapon === 3 && close;
    if (S.biteWin) { if ((kind === 1 && (heavy || dif() === 0)) || blast) finisher(e); return null; }
    if (S.lastBreath) { if (heavy || blast || kind === 0) finisher(e); return null; }
    if (kind === 2) {
      if (blast) { e.hurtT = Math.max(e.hurtT, 0.5); }
      else if (G.simRand() < B.deflect[dif()]) { G.sparks.push({ x: e.x + e.face * 6, y: e.y - 20, t: 0 }); sfx('ricochet', e.x, 0.8); say('deflect', 'He turns bullets aside', 'The cane. A shotgun up close always lands.', true); return null; }
    }
    if (kind === 1 && hero.act) {
      const fam = hero.act.replace(/\d+$/, '');
      if (fam === S.lessonFam) S.lessonN++; else { S.lessonFam = fam; S.lessonN = 1; }
      if (S.lessonN >= B.lesson.n[dif()] && !e.sp && !e.act) {
        S.lessonN = 0; G.sparks.push({ x: e.x + e.face * 8, y: e.y - 20, t: 0 }); sfx('block', e.x, 1, 1.4); G.hitStop = Math.max(G.hitStop, 0.08);
        G.bark(e, B.lines.lesson); e.face = Math.sign(ctl.x - e.x) || e.face; G.bSpecial(e, 'riposte', G.bTell(B.lesson.windup), 'lesson');
        say('lesson', 'The Lesson', 'Repeat the same blow and he reads it. Mix your strings.', false);
        return null;
      }
    }
    return clampDmg(e, dmg);
  };
  function clampDmg(e, dmg) {
    const floor = S.bph === 1 ? e.maxHp * B.lines3[0] : S.bph === 2 ? e.maxHp * B.lines3[1] : 1;
    if (e.hp - dmg <= floor) { if (S.bph < 3) S.shiftPending = true; return Math.max(0, e.hp - floor); }
    return dmg;
  }
  function rawHit(e, dmg, dir, stun) {
    dmg = clampDmg(e, dmg); S.raw = true; G.enc.eHitKind = 0; G.killBy = 5; G.damageEnemy(e, dmg, dir, 260, 0.2, e.x, e.y - 18, false); G.killBy = null; S.raw = false;
    if (!e.dead && stun) { e.stunT = e.recT = stun; e.sp = null; e.act = null; e.combo = null; G.emit('boss:stun', { boss: e, x: e.x, t: stun, by: 'crown' }); }
  }
  // ---------------- the gears: tooth platforms that ride the rims, level, carrying riders; the mesh points crush ----------------
  function shiftHero(dx, dy) { ctl.x += dx; ctl.y += dy; for (const p of G.P) { p.x += dx; p.px += dx; p.y += dy; p.py += dy; } S.prevX = ctl.x; }
  function gearsStep(dt) {
    S.gearT += dt;
    D.GEARS.forEach((g, gi) => { S.gearA[gi] = g.dir * S.gearT * Math.PI * 2 / g.T; });
    for (const t of S.teeth) {
      const g = D.GEARS[t.g], a = S.gearA[t.g] + t.k * Math.PI / 2 - Math.PI / 2, x = g.cx + Math.cos(a) * g.r, y = g.cy + Math.sin(a) * g.r - 3;
      const s = t.s, ox = s.x0 + D.TOOTH_W / 2, oy = s.y, dx = s.y === 999 ? 0 : x - ox, dy = s.y === 999 ? 0 : y - oy;
      if (dt > 0 && ctl.surf === s && !ctl.air && hero.mode === 'anim') shiftHero(dx, dy);
      if (dt > 0) for (const e of G.enemies) if (!e.dead && !e.air && e.sp !== 'ride' && Math.abs(e.y + 2 - oy) < 1.5 && e.x >= s.x0 - 1 && e.x <= s.x1 + 1) { e.x += dx; e.y += dy; }
      s.x0 = x - D.TOOTH_W / 2; s.x1 = x + D.TOOTH_W / 2; s.y = y;
    }
    if (dt <= 0 || S.grp !== 5) return;
    if (S.crushT > 0) S.crushT -= dt;
    for (const m of D.MESH) {
      if (S.crushT <= 0 && hero.mode === 'anim' && hero.invT <= 0 && Math.hypot(ctl.x - m.x, ctl.y - 14 - m.y) < 10) { S.crushT = 1; G.hurtPlayer(30, ctl.x, ctl.y - 14, Math.sign(ctl.x - m.x) || 1, true, 1.2, { kind: 'crush' }); G.lockT = Math.max(G.lockT, 0.6); sfx('crate_break', m.x, 1, 0.5); say('mesh', 'The mesh', 'Where two gears meet, they crush', true); }
      for (const e of G.enemies) if (!e.dead && !e.crushT && Math.hypot(e.x - m.x, e.y - 14 - m.y) < 10) { e.crushT = 1; if (e.kind === 'bell') rawHit(e, 30, 1, 0.6); else { S.raw = true; G.enc.eHitKind = 0; G.killBy = -1; G.damageEnemy(e, 30, 1, 200, 0.3, e.x, e.y - 14, false); G.killBy = null; S.raw = false; } }
      for (const e of G.enemies) if (e.crushT > 0) e.crushT = Math.max(0, e.crushT - dt / D.MESH.length);
    }
  }
  // ---------------- the pendulum: hits anyone standing in its path; a roll or a squat goes under ----------------
  function pendStep(dt) {
    if (S.grp !== 6 && !S.pend) { if (S.grp !== 6) return; }
    const d = dif(), P = D.PEND.period[d] * (S.pendFast > 0 ? D.PEND.fast : 1);
    if (S.pendFast > 0) S.pendFast -= dt; if (S.clutch > 0) S.clutch -= dt;
    S.pendPh += dt * Math.PI * 2 / P;
    const th = D.PEND.amp * Math.PI / 180 * Math.sin(S.pendPh), [px, py] = D.PEND.pivot;
    const pd = S.pend || (S.pend = { x: 0, y: 0, hit: new Map() });
    pd.x = px + Math.sin(th) * D.PEND.len; pd.y = py + Math.cos(th) * D.PEND.len;
    const r = D.PEND.r, dir = M.bobDir(), cool = o => (pd.hit.get(o) || 0) < G.simTime;
    if (G.simRand() < dt * 2 && Math.abs(th) < 0.2) sfx('dodge_whoosh', pd.x, 0.5, 0.5);
    const duck = (G.input.downHeld && !ctl.air) || hero.act === 'dash' || hero.act === 'squat';
    if (hero.mode === 'anim' && hero.invT <= 0 && !duck && cool(hero) && Math.abs(ctl.x - pd.x) < r + 3 && ctl.y - 36 < pd.y + r && ctl.y > pd.y - r) {
      pd.hit.set(hero, G.simTime + 0.8); G.hurtPlayer(D.PEND.dmg, ctl.x, ctl.y - 20, dir, true, 2, { kind: 'pendulum' }); sfx('ground_slam', pd.x, 0.9, 1.6);
      say('pendhit', 'The pendulum', 'Roll (Space) or squat (↓) under the bob', true);
    }
    for (const e of G.enemies) {
      if (e.dead || e.riding || !cool(e) || Math.abs(e.x - pd.x) > r + 3 || !(e.y - 36 < pd.y + r && e.y > pd.y - r)) continue;
      pd.hit.set(e, G.simTime + 0.8);
      if (e.kind === 'bell') {
        if (e.recT > 0 || e.stunT > 0 || e.stuck > 0) { rawHit(e, D.PEND.bossDmg, dir, D.PEND.bossStun); G.bark(e, B.lines.pend); sfx('ground_slam', pd.x, 1, 1.2); G.emit('feat', 'pendulumbait'); }
        else e.x += (Math.sign(e.x - pd.x) || 1) * 24;
      } else { S.raw = true; G.enc.eHitKind = 0; G.killBy = -1; G.damageEnemy(e, D.PEND.dmg, dir, 320, 0.4, e.x, e.y - 20, false); G.killBy = null; S.raw = false; if (!e.dead && !e.down) G.knockDown(e, dir, 320, 'hp'); }
    }
    for (const o of G.objs) if (o.kind === 'crate' && !o.carried && Math.abs(o.x - pd.x) < r && Math.abs(o.y - pd.y) < r + 6) { G.damageObj(o, 999, dir); for (let k = 0; k < 10; k++) S.pages.push({ x: o.x, y: o.y - 4, vx: (G.simRand() - 0.5) * 80 + dir * 40, vy: -40 - G.simRand() * 40, t: 0 }); sfx('crate_break', o.x, 1); }
  }
  // ---------------- the face: the minute hand (a sloped ledge), wind, the radial ring ----------------
  function faceStep(dt) {
    const m = S.clock.m, a = m / 60 * Math.PI * 2, L = D.HAND.len;
    const tx = F.cx + Math.sin(a) * L, ty = F.cy - Math.cos(a) * L;
    S.hand = { tx, ty };
    if (!G.flags.club || !S.handS) return;
    const s = S.handS, tilt = (m - 45) / 15 * 90, yAt = x => F.cy + (x - F.cx) * (ty - F.cy) / ((tx - F.cx) || -1);
    if (tilt > D.HAND.slideMax || tx > F.cx - 4) { s.x0 = s.x1 = -999; s.y = 999; return; }
    s.x0 = tx; s.x1 = F.cx;
    const on = ctl.surf === s && !ctl.air && hero.mode === 'anim';
    if (on) {
      if (tilt > D.HAND.walkMax) { ctl.x += D.HAND.slide * dt; S.prevX = ctl.x; say('slide', 'The hand tilts', 'Past 30 degrees you slide; past 50 you fall', true); }
      const ny = yAt(clamp(ctl.x, s.x0, s.x1)); if (Math.abs(ny - s.y) > 0.01) { const dy = ny - s.y; s.y = ny; shiftHero(0, dy); }
    } else s.y = yAt(clamp(ctl.x, s.x0, s.x1));
    if (S.bell && !S.bell.dead && !G.endPh) X.windPush(D.WIND.face[dif()], dt);
    if (S.radial > 0) { S.radial -= dt; if (hero.mode === 'anim') { ctl.x += (Math.sign(ctl.x - F.cx) || 1) * B.peal.push * dt; S.prevX = ctl.x; } }
  }
  // ---------------- the Last Movement: Nero, FINISH, Last Breath ----------------
  function neroStep(dt, rdt) {
    const N = S.neroRun, d = G.dog; if (!N || !d) return;
    const e = S.bell;
    if (!S.bitten && e && !e.dead) {
      const tx = e.x - (Math.sign(e.x - d.x) || 1) * 6; d.st = 'walk'; d.face = Math.sign(tx - d.x) || d.face; d.vx = d.face * 260; d.x += d.vx * dt;
      if (Math.abs(d.x - tx) < 8) {   // the leap: he bites the flail arm
        S.bitten = true; e.sp = 'bitten'; e.spT = 0; e.act = null; e.combo = null; e.stunT = e.recT = B.bite.stun; e.vx = 0;
        sfx('nero_bite', e.x, 1); sfx('nero_growl', e.x, 1); G.bark(e, B.lines.bite); G.hitStop = Math.max(G.hitStop, 0.1);
        S.biteWin = { t: B.bite.window[dif()] }; G.slowMo(Math.min(3, S.biteWin.t), 'nero'); sfx('slowmo_in', ctl.x, 1);
        S.prompt = { x: e.x, y: e.y - 18, r: 14 };
        G.toast('FINISH', dif() === 0 ? 'Any attack on him' : 'A heavy attack on him (hold Q or W)', false); G.emit('feat', 'nerobite');
        G.setMusic('music:boss_bell_3', 0.2);
      }
    } else { d.vx = 0; d.st = S.biteWin ? 'stand' : 'sit'; d.face = e ? Math.sign(e.x - d.x) || d.face : d.face; if (e && S.biteWin) d.x = e.x - 8 * (Math.sign(e.x - d.x) || 1); }
    G.dogStep(d, dt);
    if (S.biteWin) {
      if (S.prompt && e) { S.prompt.x = e.x; S.prompt.y = e.y - 18; }
      if (dif() === 0) G.slowMo(0.3, 'nero');
      else if ((S.biteWin.t -= rdt) <= 0) {   // a miss: he shakes the dog off; Last Breath
        S.biteWin = null; S.prompt = null; S.lastBreath = true; if (e) { e.sp = null; e.stunT = e.recT = 0.5; e.hp = 1; }
        if (d) { d.x = F.hatch + 10; d.st = 'sit'; }
        G.toast('Last Breath', 'He shook the dog off. The next heavy blow, or anything that floors him, ends it.', false);
      }
    }
  }
  function finisher(e) {
    if (S.fin) return;
    S.biteWin = null; S.lastBreath = false; S.prompt = null;
    const w = hero.weapon, how = w === 1 ? 'A draw cut: the sword-cane spins away into the storm.' : w === 2 ? 'The axe haft, to the chest.' : w >= 3 ? 'A pistol-whip with the empty gun, then the gun.' : 'A heavy kick to the chest.';
    S.fin = { x: e.x, y: e.y, dir: Math.sign(e.x - ctl.x) || 1 };
    G.hitStop = Math.max(G.hitStop, 0.6); S.flash = 1; G.shakeIt(0.5, 4); sfx('kill_confirm', e.x, 1); sfx('punch_heavy', e.x, 1, 0.7);
    G.toast('Freeze frame', how, false); G.barkHero(B.lines.hold);
    S.bellHp = 0; S.raw = true; e.hp = 1; G.enc.eHitKind = 1; G.killEnemy(e, S.fin.dir, 300, 0.3); S.raw = false;
    const i = G.enemies.indexOf(e); if (i >= 0) G.enemies.splice(i, 1);
    S.hang = { x: e.x, y: e.y - 40, slip: 0, gone: false, watchGone: false, fly: 0, x0: e.x, y0: e.y - 40 };
    S.clock.st = 'off'; S.hudTxt = null;
  }

  // ---------------- the crew in the gear room; second wind ----------------
  function crewStep(dt) {
    const e = S.bell; if (!e || e.dead || e.hold || e.exit || S.bph !== 1) return;
    const d = dif(), Cw = B.crew;
    if (G.kos - S.kos0 >= B.secondWind[d]) { S.kos0 = G.kos; for (const g of G.enemies) if (!g.dead && g.zone === 'bcrew') G.killEnemy(g, 1, 200, 0.4); G.ammoBoxes.push({ band: true, x: 1880, y: GROUND - 8, vx: 0, vy: 0, life: 60 }); G.toast('Second wind', 'The crew is down. Catch your breath.', true); }
    if ((S.crewT -= dt) > 0) return;
    const n = G.enemies.filter(g => !g.dead && g.zone === 'bcrew').length;
    if (n >= Cw.alive[d] || S.crewN >= Cw.max) { S.crewT = 2; return; }
    S.crewT = Cw.every; const v = Cw.roles[S.crewN++ % Cw.roles.length];
    const g = H.spawnChoir(v, 1872, 'bcrew'); g.cdT = 1.2; sfx('door_open', 1872, 0.7);
  }

  // ---------------- per frame and per step ----------------
  X.crownBeats = (dt, rdt) => {
    if (S.grp === 6 && !S.bell && S.faceOpen && !G.flags.club && G.fadeDir === 0 && hero.mode === 'anim' && !ctl.air && ctl.x >= D.PEND_ARENA.dial - 10) G.fadeDir = 1;
    if (G.flags.club && !S.faceStarted) startFace();
    if (S.bell && !S.bell.dead && S.bph) H.setObjective(D.SEC_NAMES[S.bph + 4], `Beat ${B.name}`);
    for (const p of S.pealFx) { p.k += dt * 0.8; p.r += dt * 140; } S.pealFx = S.pealFx.filter(p => p.k < 1);
    for (const pg of S.pages) { pg.t += dt; pg.x += pg.vx * dt; pg.y += pg.vy * dt; pg.vy = Math.min(30, pg.vy + 40 * dt); pg.vx *= Math.exp(-0.5 * dt); } S.pages = S.pages.filter(p => p.t < 6);
    neroStep(dt, rdt);
  };
  function offTooth(e) {   // a staggered Conductor left up on a tooth steps off it (he fights on the floor; the teeth are his ride)
    const t = S.teeth.find(t => Math.abs(e.y + 2 - t.s.y) < 2 && e.x >= t.s.x0 - 1 && e.x <= t.s.x1 + 1); if (!t) return;
    e.x = ctl.x < e.x ? t.s.x0 - 4 : t.s.x1 + 4; e.air = true;
  }
  X.crownStep = dt => { gearsStep(dt); if (S.bph === 1 && S.bell && !S.bell.dead && !S.bell.sp && !S.bell.air && S.bell.y < GROUND - 20 && (S.offT = (S.offT || 0) + dt) > 0.6) { S.offT = 0; offTooth(S.bell); } if (S.grp === 6 || S.pend) pendStep(dt); faceStep(dt); clockStep(dt); crewStep(dt); if (S.bell && S.bell.stuck > 0) S.bell.stuck -= dt; };
  X.arenaWall = () => {
    const A_ = G.enc.arena; if (!A_ || !S.bell || S.bell.dead || hero.mode !== 'anim') return;
    if (ctl.x < A_.x0 + 4) { ctl.x = A_.x0 + 4; ctl.spd = 0; } else if (ctl.x > A_.x1 - 4 && !G.flags.club) { ctl.x = A_.x1 - 4; ctl.spd = 0; }
  };
  X.doors.push({ x: D.GEAR_ARENA.ladder, ok: () => S.ladderOpen, no: 'He is not done with you here.', go: () => H.teleport(2182, () => arrivePend(false), 6) });
  X.mini = () => X.miniSet() || (S.bell && !S.bell.dead && !S.bell.hold && S.bph < 3 ? S.bell : null);
  X.fxTells = tells => { for (const p of S.pealFx) tells.push({ kind: 'peal', x: p.x, y: p.y, r: p.r, k: p.k }); };
  X.crownLights = add => { if (S.peal.k > 0) add(bellX(), 40, 120, 1.2 * S.peal.k, 0.9 * S.peal.k, 0.4 * S.peal.k, 10, 4); if (S.dry) add(F.cx, 0, 260, 0.6, 0.6, 0.7, 0, 3); };
  X.ambient = sec => sec.id === 'face' && S.dry ? [0.42, 0.44, 0.52] : sec.amb;

  // ---------------- the ending (5.8): the hand, the twelve strikes, the rain stops ----------------
  M.endTick = rdt => {
    const E = S.end || (S.end = { ph: 'fly', t: 0, n: 0 }), I = G.input, h = S.hang;
    E.t += rdt;
    for (const k of ['jump', 'jumpHeld', 'attack', 'fireHeld', 'dash', 'dashHeld', 'downHeld']) I[k] = k === 'attack' ? null : false;
    I.dir = 0; I.run = false;
    const a = (S.clock.m = E.ph === 'fly' || E.ph === 'walk' || E.ph === 'panels' ? 59 : 60) / 60 * Math.PI * 2;
    const tipX = F.cx + Math.sin(a) * D.HAND.len, tipY = F.cy - Math.cos(a) * D.HAND.len;
    if (h && !h.gone) { const k = clamp(E.ph === 'fly' ? E.t / 0.9 : 1, 0, 1); h.x = h.x0 + (tipX - h.x0) * k; h.y = h.y0 + (tipY - h.y0) * k - Math.sin(Math.PI * k) * 40; }
    const d = G.dog;
    if (E.ph === 'fly') { if (E.t > 1.2) { E.ph = 'walk'; E.t = 0; if (d) { d.hidden = false; } } }
    else if (E.ph === 'walk') {
      const dx = 2704 - ctl.x; if (Math.abs(dx) > 3) { I.dir = Math.sign(dx); if (Math.abs(dx) < 26) ctl.spd = Math.min(ctl.spd, 20); } else ctl.face = 1;
      if (d) { const tx = 2690; d.st = Math.abs(tx - d.x) > 4 ? 'walk' : 'sit'; d.face = 1; if (d.st === 'walk') { d.vx = Math.sign(tx - d.x) * 90; d.x += d.vx * rdt; } else d.vx = 0; G.dogStep(d, rdt); }
      if ((Math.abs(dx) <= 3 && E.t > 1.5) || E.t > 5) { E.ph = 'panels'; E.t = 0; G.endPh = 'sscene'; G.playScene('panels', 'spire_end').then(() => { E.ph = 'clunk'; E.t = 0; G.endPh = 'swait'; }); }
    }
    else if (E.ph === 'clunk') { if (E.t < rdt * 1.5) { sfx('lever_clunk', F.cx, 1, 0.5); G.shakeIt(0.3, 2); } if (E.t > 1.0) { E.ph = 'strikes'; E.t = 1.2; } }
    else if (E.ph === 'strikes') {
      if (E.t >= 1.2 && E.n < 12) {
        E.t = 0; E.n++;
        sfx('bell_ting', F.bell[0], 1, 0.35); sfx('ground_slam', F.bell[0], 0.5, 0.5); G.shakeIt(0.15, 1);
        S.pealFx.push({ x: F.bell[0], y: 40, r: 6, k: 0 }); S.pealFx.push({ x: ctl.x, y: GROUND - 2, r: 4, k: 0.2 });
        if (E.n === 1 && h) h.slip = 2;
        if (E.n === 4 && h) { h.watchGone = true; S.fallers.push({ x: h.x - 8, y: h.y + 28, vx: 0, vy: 0, t: 0, cols: [C('#e0c070'), C('#e0c070'), C('#e0c070')] }); }
        if (E.n === 7 && h) { h.gone = true; S.fallers.push({ x: h.x - 2, y: h.y + 40, vx: 6, vy: 0, t: 0, cols: [C('#5a4632'), C('#d8bca0'), C('#2a2622')] }); }
        if (E.n === 12) { S.dry = true; G.rain.goal = 0; for (let k = 0; k < 40; k++) S.pages.push({ x: 2480 + G.simRand() * 300, y: -G.simRand() * 120, vx: (G.simRand() - 0.5) * 20, vy: 10 + G.simRand() * 10, t: 0 }); }
      }
      if (E.n >= 12) { S.rainK = Math.max(0, S.rainK - rdt / 3); if (E.t > 3.5) { E.ph = 'outro'; M.outro(); } }
    }
    if (d && E.ph !== 'walk' && !d.hidden) G.dogStep(d, rdt);
  };
  M.camZoom = () => S.end && S.end.ph !== 'card' ? 0.45 : null;   // the ending: a wide shot of the face, the hand, the edge
  M.camAim = () => S.end && S.end.ph !== 'card' ? { x: 2680, y: 170 } : null;
  M.outro = async () => {
    if (S.end && (S.end.ph === 'scenes' || S.end.ph === 'card')) return;
    if (!S.end) S.end = { ph: 'scenes', t: 0, n: 12 }; S.end.ph = 'scenes';
    S.dry = true; S.rainK = 0; G.endPh = 'sscene'; G.dom.toast.hidden = true;
    await G.playScene('panels', 'spire_midnight');
    await G.playScene('panels', 'epilogue');
    showCard();
  };
  function showCard() {
    S.end.ph = 'card'; G.endPh = 'done';
    G.emit('run:over', { result: 'cleared' });
    const t = Math.round(G.runS.t), mm = Math.floor(t / 60), ss = String(t % 60).padStart(2, '0');
    const r = G.gradeRun('ch9', { t: G.runS.t, kills: G.runS.kills, maxRank: G.styleM.maxRank, dmg: G.runS.dmg, kos: G.kos }, !G.flags.demo);
    let best = {}; try { best = JSON.parse(localStorage.getItem(BEST_KEY) || '{}') || {}; } catch (err) { best = {}; }
    const names = [['ch1', 'The Street'], ['ch2', 'Pier 9'], ['ch3', 'Line Zero'], ['ch4', 'House Always Wins'], ['ch5', 'The Leviathan'], ['ch6', 'St. Cecilia'], ['ch7', 'The Palm House'], ['ch8', 'Last Train'], ['ch9', 'The Spire']];
    const rows = names.filter(([k]) => best[k]), total = rows.reduce((n, [k]) => n + (best[k].score || 0), 0), secs = rows.reduce((n, [k]) => n + (best[k].t || 0), 0);
    const story = rows.length ? `<h3>The whole story</h3><dl>${rows.map(([k, n]) => `<dt>${n}</dt><dd>${best[k].grade} · ${best[k].score}</dd>`).join('')}<dt>All chapters</dt><dd>${rows.length} of ${names.length} · ${Math.floor(secs / 60)} min · score ${total}</dd></dl>` : '';
    G.dom.results.innerHTML = `<h2>The Spire cleared</h2><dl><dt>Difficulty</dt><dd>${G.DIF().name}</dd><dt>Time</dt><dd>${mm}:${ss}</dd><dt>Kills</dt><dd>${G.runS.kills}</dd>`
      + `<dt>Top style</dt><dd>${G.rankName(G.styleM.maxRank)}</dd><dt>Damage taken</dt><dd>${Math.round(G.runS.dmg)}</dd><dt>Knock-outs</dt><dd>${G.kos}</dd>`
      + `<dt>Midnight</dt><dd>The Conductor fell on the seventh strike. The rain stopped on the twelfth.</dd></dl>${G.rankHtml(r)}${story}<small>Enter: the credits</small>`;
    G.dom.results.hidden = false; G.dom.toast.hidden = true;
  }
  // the credits: short and plain; Enter, Escape or a click ends them; then the title
  M.next = () => {
    if (S.credits) return false;
    G.dom.results.hidden = true;
    const host = (G.dom.card && G.dom.card.parentElement) || document.body, el = document.createElement('div');
    el.className = 'spire-credits';
    el.style.cssText = 'position:absolute;inset:0;background:#000;color:#e8e4d8;z-index:7;overflow:hidden;font:14px/1.7 Georgia,serif;text-align:center;cursor:pointer';
    const lines = ['<b style="font-size:30px;letter-spacing:6px">ELIAS GRAVE</b>', '', 'Elias Grave, the Sandman', 'Nero, Elena\'s dog', 'Margaux "Mags" Ferrand', 'Augustin Bell, the Conductor', '', 'A story of rain, glass and clocks', 'in the city of Valmora', '',
      'Made with JavaScript, canvas pixels and three.js', 'Every sprite and set painted in code', 'Comic panels and portraits made with ComfyUI', '', 'Thank you for playing.', '', '<i>Time moves on.</i>'];
    el.innerHTML = `<div style="position:absolute;left:0;right:0;top:100%;transition:transform 26s linear">${lines.map(l => `<div>${l || '&nbsp;'}</div>`).join('')}</div>`;
    host.appendChild(el);
    const roll = el.firstChild; setTimeout(() => { roll.style.transform = `translateY(-${(roll.offsetHeight || 500) + host.clientHeight + 40}px)`; }, 60);
    const end = () => { if (!S.credits) return; S.credits = null; removeEventListener('keydown', onKey, true); el.remove(); G.quitToTitle(); };
    const onKey = ev => { if (ev.key === 'Enter' || ev.key === 'Escape' || ev.key === ' ') { ev.preventDefault(); ev.stopPropagation(); end(); } };
    addEventListener('keydown', onKey, true); el.addEventListener('click', end);
    S.credits = { el, timer: setTimeout(end, 28000) };
    return true;
  };

  // ---------------- checkpoints, retries, skips (tests) ----------------
  const ORDER = ['sp:lift', 'sp:garden', 'sp:pent', 'sp:vestry', 'sp:gears', 'sp:pend', 'boss'];
  X.retry = C => {
    const lv = ORDER.indexOf(C.kind) + 1; if (lv <= 0) return null;
    X.restoreSet(Math.min(lv, 4));
    const maxHp = B.hp[dif()];
    if (lv === 1) { S.grp = 1; later(() => X.arriveLift(true), 0.01); return 660; }
    if (lv === 2) { S.grp = 2; X.arriveGarden(true); return 860; }
    if (lv === 3) { S.grp = 3; X.arrivePent(true); return 1376; }
    if (lv === 4) { S.grp = 4; X.arriveVestry(true); return 1730; }
    S.introSeen = true;
    if (lv === 5) { S.grp = 5; later(() => arriveGears(true), 0.01); return 1886; }
    if (lv === 6) { S.grp = 6; S.bellHp = Math.round(maxHp * B.lines3[0]); later(() => arrivePend(true), 0.01); return 2182; }
    S.bellHp = Math.round(maxHp * B.lines3[1]); S.faceOpen = true; S.dialBroken = true; S.ladderOpen = true;
    return null;   // the face: the game puts him through the door (enterClub); the boss comes on the next frame
  };
  M.skipTo = where => {   // tests: jump to a beat with what came before done
    G.reset();
    const at = { lift: 1, snap: 1, garden: 2, kessel: 2, pent: 3, sweep: 3, vestry: 4, gears: 5, pend: 6, face: 7, last: 7 }[where] || 0;
    S.queue.length = 0; G.enemies.length = 0; for (const k in G.zoneAlive) G.zoneAlive[k] = 0;   // (the lobby's first goons go)
    if (where === 'lys') { for (const id of ['l1', 'l2a', 'l2b']) S.w[id] = { out: true, n: 0, reinf: true }; G.heroTo(380); return; }
    X.restoreSet(Math.min(at, 4));
    if (at === 1) { G.heroTo(660); S.grp = 1; X.arriveLift(true); if (where === 'snap') { for (const id of ['e1', 'e2', 'e3']) S.w[id] = { out: true, n: 0, reinf: true }; for (const e of G.enemies) e.dead = true; G.enemies.length = 0; G.zoneAlive.e1 = 0; S.lift.st = 'up72'; S.lift.floor = 70; } return; }
    if (at === 2) { G.heroTo(860); S.grp = 2; X.arriveGarden(true); if (where === 'kessel') { S.w.g1 = { out: true, n: 0, reinf: true }; S.w.g2 = { out: true, n: 0, reinf: true }; G.heroTo(1180); } return; }
    if (at === 3) { G.heroTo(1376); S.grp = 3; X.arrivePent(true); if (where === 'sweep') { S.w.p1 = { out: true, n: 0, reinf: true }; S.p1T = -1; G.heroTo(1460); } return; }
    if (at === 4) { G.heroTo(1730); S.grp = 4; S.scarf = null; X.arriveVestry(true); return; }
    S.introSeen = true;
    if (at === 5) { G.heroTo(1886); S.grp = 5; arriveGears(true); return; }
    if (at === 6) { S.bellHp = Math.round(B.hp[dif()] * B.lines3[0]); G.heroTo(2182); S.grp = 6; arrivePend(true); return; }
    S.bellHp = Math.round(B.hp[dif()] * (where === 'last' ? 0.14 : B.lines3[1])); S.faceOpen = true; S.dialBroken = true; S.grp = 6; G.heroTo(2400); G.autoWalk = true;
  };
  M.skipToBoss = () => M.skipTo('gears');
  X.peekCrown = () => ({
    bph: S.bph, bell: S.bell && S.bell.J ? { hp: Math.round(S.bell.hp), max: S.bell.maxHp, ph: S.bell.ph, sp: S.bell.sp, act: S.bell.act, x: Math.round(S.bell.x), y: Math.round(S.bell.y), exit: !!S.bell.exit, hold: !!S.bell.hold } : null,
    clock: { m: +S.clock.m.toFixed(1), st: S.clock.st, ring: S.clock.ring }, shiftPending: S.shiftPending, ladder: S.ladderOpen, faceOpen: S.faceOpen, faceStarted: S.faceStarted,
    pend: S.pend ? [Math.round(S.pend.x), Math.round(S.pend.y)] : null, hand: S.hand ? [Math.round(S.hand.tx), Math.round(S.hand.ty)] : null, bitten: S.bitten, biteWin: S.biteWin ? +S.biteWin.t.toFixed(2) : null, lastBreath: S.lastBreath,
    end: S.end ? [S.end.ph, S.end.n] : null, hang: S.hang ? { gone: S.hang.gone, slip: S.hang.slip } : null, dry: S.dry, credits: !!S.credits,
  });
}
