// Level 8, "The Spire": the climb's set pieces (docs/levels/08-the-spire.md beats 1-13).
//   the lobby: the Choir in one room, the chandelier, the mirrors, the cases; Lys Moreau and her decoys; Nero: "Stay."
//   the glass lift: the floor counter, the passengers, the twin car, the rappellers, wind on the roof, the cable snap (slow motion)
//   the sky garden: wind gusts, the koi pool, the windbreak, Bruno Kessel over the gap
//   the penthouse: the guests, the piano, the glass floor, the machine-gun volley and the dive to the stair rail (slow motion)
//   the vestry: the old Choir katana, the 3:17 clock, the soup and the pipe, Elena's scarf, the hatch
import { LYS, KESSEL } from '../../bosses/understudies.js';
import { C } from '../../core/color.js';

export function installSet(X) {
  const { G, M, S, H, D } = X, ctl = G.ctl, hero = G.hero, GROUND = D.GROUND;
  const { dif, sfx, say, later, clamp, alive, allDown, startWave, reinfWave } = H;
  const DRESSES = ['#8a1a2a', '#1a3a6a', '#e0d8c8', '#2a5a3a', '#6a2a6a', '#c8a050'].map(C);

  X.setReset = () => {
    Object.assign(S, {
      chand: { st: 'hang', y: D.CHAND.y, hp: D.CHAND.chainHp, vy: 0 }, slip: null,
      lys: null, lysOn: false, lysDone: false, decoys: [], decoyT: 0, lysCrewT: 12,
      nero: { st: 'follow', pin: null, pinT: 0, cd: 6 }, stay: null,
      lift: { floor: 1, st: 'off', twin: { on: false, y: 300 }, cradle: { on: false, y: D.CRADLE.from }, snapped: false, gone: false, rate: 0 }, snap: null, cradleS: null,
      kessel: null, kesselOn: false, kesselDone: false, kCrewT: 14, wind: null, windNext: 8, barkFar: false,
      guests: D.GUESTS.map((x, i) => ({ x, run: false, gone: false, dress: DRESSES[i % DRESSES.length] })), guestsRun: false,
      piano: { x: D.PIANO.x, vx: 0, gone: false, y: GROUND, surf: null, hit: new Set() }, sweep: null, dive: null, secondUsed: false,
      p1T: -1, p2Started: false, p2done: false, vestryIn: false, scarf: null, gardenIn: false, pentIn: false,
    });
    S.piano.surf = H.addSurf({ x0: D.PIANO.x - 20, x1: D.PIANO.x + 20, y: D.PIANO.top, box: true });
    G.dog = G.makeDog(40, 1); G.dog.st = 'walk';
    startWave('l1');
    H.setObjective('The Meridian Spire', 'The lobby. The whole Choir.');
  };

  // ---------------- doors (↑ by one) ----------------
  X.doors = [
    { x: D.LIFT_DOORS, ok: () => S.lysDone, no: 'The lift. Not with the Choir in the lobby.', go: () => stayScene() },
    { x: D.SERVICE_LIFT, ok: () => S.kesselDone, no: 'The service lift. Kessel holds the deck.', go: () => H.teleport(1376, arrivePent, 3) },
    { x: D.VESTRY_DOOR, ok: () => S.p2done, no: 'The stair door. The gunners hold the room.', go: () => H.teleport(1730, arriveVestry, 4) },
    { x: D.VESTRY.hatch, ok: () => S.vestryIn, go: () => X.startBoss() },
  ];

  // ---------------- the lobby ----------------
  function chandStep(dt) {
    const c = S.chand; if (!c) return;
    if (c.st === 'hang') {
      for (let i = G.bullets.length - 1; i >= 0; i--) { const b = G.bullets[i]; if (Math.abs(b.x - D.CHAND.x) < 5 && b.y > 36 && b.y < c.y + 4) { G.bullets.splice(i, 1); c.hp -= 40; G.sparks.push({ x: b.x, y: b.y, t: 0 }); sfx('chandelier_snap', D.CHAND.x, 0.6); } }
      for (const t of G.thrown) if (!t.stuck && Math.abs(t.x - D.CHAND.x) < 8 && t.y < c.y + 6 && t.y > 36) c.hp = 0;
      if (c.hp <= 0) { c.st = 'fall'; c.vy = 0; sfx('chandelier_whistle', D.CHAND.x, 1); }
      else if (!S.said.has('chand') && Math.abs(ctl.x - D.CHAND.x) < 120 && G.enemies.filter(e => !e.dead && Math.abs(e.x - D.CHAND.x) < 50).length >= 2) say('chand', 'The chandelier', 'Shoot its chain: it drops on everyone under it', true);
    } else if (c.st === 'fall') {
      c.vy += 400 * dt; c.y += c.vy * dt;
      if (c.y >= GROUND - 8) {
        c.st = 'down'; c.y = GROUND - 8; sfx('chandelier_crash', D.CHAND.x, 1); G.shakeIt(0.45, 3); G.hitStop = Math.max(G.hitStop, 0.08);
        for (let k = 0; k < 40; k++) G.particles.push({ x: D.CHAND.x + (G.simRand() - 0.5) * 30, y: GROUND - 6, vx: (G.simRand() - 0.5) * 220, vy: -60 - G.simRand() * 140, life: 0.6 + G.simRand() * 0.4, c: k % 3 ? 0xfff0e0c8 : 0xff60d0f0 });
        let n = 0;
        for (const e of G.enemies) {
          if (e.dead || Math.abs(e.x - D.CHAND.x) > D.CHAND.r || e.y < 150) continue;
          const dir = Math.sign(e.x - D.CHAND.x) || 1; S.raw = true; G.enc.eHitKind = 0; G.killBy = -1; G.damageEnemy(e, D.CHAND.dmg, dir, 300, 0.4, e.x, e.y - 14, false); G.killBy = null; S.raw = false;
          if (!e.dead && !e.down) G.knockDown(e, dir, 300, 'hp'); n++;
        }
        if (hero.mode === 'anim' && Math.abs(ctl.x - D.CHAND.x) < D.CHAND.r * 0.6 && hero.invT <= 0) G.hurtPlayer(25, ctl.x, ctl.y - 20, Math.sign(ctl.x - D.CHAND.x) || 1, true, 1.4, { kind: 'blast' });
        if (n >= 2) G.slowMo(1.0, 'chandelier');
        S.slip = { x0: D.CHAND.slip[0], x1: D.CHAND.slip[1], t: D.CHAND.slipT };
        G.emit('feat', 'chandelier');
      }
    }
    if (S.slip && S.slip.t > 0) {
      S.slip.t -= dt;
      for (const e of G.enemies) if (!e.dead && !e.down && e.type === 'goon' && !e.air && e.x >= S.slip.x0 && e.x <= S.slip.x1 && Math.abs(e.vx) > 30 && G.simRand() < dt * 1.5) { G.knockDown(e, Math.sign(e.vx) || 1, 140, 'sweep'); sfx('body_fall', e.x, 0.6); say('slip', 'Crystal on marble', 'They slip on it', true); }
    }
  }
  // Lys Moreau and her decoys
  function startLys() {
    S.lysOn = true; G.enc.arena = { x0: D.LYS_ARENA.x0, x1: D.LYS_ARENA.x1 };
    const e = G.spawnEnemy('boss', 490, 'lys', { boss: LYS });
    Object.assign(e, { alert: true, face: -1, hold: true, fanCd: 1.5, bigBar: false, mini: true });
    e.pal.hair = C('#2a1a14'); e.team = 'lys';
    S.lys = e; G.setMusic('music:spire_lys', 0.8);
    const go = () => { e.hold = false; e.cdT = 0.8; spawnDecoys(); say('lys', 'Lys Moreau', 'Her decoys stand in the mirrors. The real one has no reflection.', false); };
    if (G.flags.demo || S.lysSeen) go(); else { S.lysSeen = true; G.playScene('dialog', 'lys_intro').then(go); }
  }
  function spawnDecoys() {
    const L = S.lys; if (!L || L.dead) return;
    for (const p of S.panes) {
      if (!p.def.lys || p.broken || S.decoys.some(d => !d.dead && d.pane === p)) continue;
      const x = (p.x0 + p.x1) / 2, d = G.spawnEnemy('boss', x, 'lysDecoy', { boss: LYS });
      Object.assign(d, { kind: 'lysDecoy', decoy: true, noBlood: true, pane: p, homeX: x, hp: 999, maxHp: 999, alert: true, fanCd: 1 + G.simRand() * 2, cdT: 0.8, face: Math.sign(ctl.x - x) || -1, team: 'lys' });
      d.pal = { ...L.pal }; d.name = LYS.name; p.ripple = 0.4;
      S.decoys.push(d);
    }
    sfx('mirror_ripple', 440, 0.8);
  }
  X.shatterDecoy = (e, byHero) => {
    if (!G.enemies.includes(e)) return;
    sfx('mirror_shatter', e.x, 0.9, 1.2);
    for (let k = 0; k < 20; k++) G.particles.push({ x: e.x + (G.simRand() - 0.5) * 8, y: e.y - 10 - G.simRand() * 20, vx: (G.simRand() - 0.5) * 140, vy: -40 - G.simRand() * 80, life: 0.6, c: k % 2 ? 0xfff0e0c8 : 0xffffffff });
    const i = G.enemies.indexOf(e); G.enemies.splice(i, 1); if (G.zoneAlive.lysDecoy > 0) G.zoneAlive.lysDecoy--;
    e.dead = true;
    if (byHero) { if (e.pane && !e.pane.broken) H.paneHit(e.pane, 12); G.emit('feat', 'decoy'); if (S.lys && !S.lys.dead && dif() >= 2) { const L = S.lys; L.face = Math.sign(ctl.x - L.x) || L.face; M.cards(L, 1, LYS.fan.dmg, 0, LYS.fan.v); G.bark(L, LYS.lines.wrong); } }
  };
  X.lysMirrorBroken = p => { for (const d of S.decoys) if (!d.dead && d.pane === p) X.shatterDecoy(d, false); };
  function lysStep(dt) {
    const L = S.lys; if (!L || !S.lysOn) return;
    if (!L.dead && !L.hold) {
      if ((S.decoyT += dt) >= LYS.decoys.every) { S.decoyT = 0; spawnDecoys(); }
      if (dif() >= 2 && (S.lysCrewT -= dt) <= 0) { S.lysCrewT = 12; if (G.enemies.filter(e => !e.dead && e.zone === 'lysCrew').length < 2) { const e = H.spawnChoir('stiletto', 380, 'lysCrew'); e.cdT = 1; } }
    }
    if (L.dead && !S.lysDone) {
      S.lysDone = true; G.enc.arena = null; G.slowMo(1.0, 'boss');
      for (const d of S.decoys.slice()) if (!d.dead) X.shatterDecoy(d, false);
      G.toast('Lys Moreau', `"${LYS.lines.defeat}"`, false);
      later(() => G.toast('The lift', '↑ at the brass doors', true), 2.5);
      H.setObjective('The lobby', 'The lift doors →'); G.setMusic('music:spire_lobby', 0.4);
    }
  }
  // Nero in the lobby: at heel; "Nero, hold!": he pins one goon near the hero 4 s (18 s cooldown); then "Stay." at the lift
  function neroStep(dt) {
    const d = G.dog, N = S.nero; if (!d || d.hidden) return;
    if (N.st === 'stay') { d.st = 'sit'; d.vx = 0; d.face = 1; G.dogStep(d, dt); return; }
    if (N.st !== 'follow') return;
    N.cd -= dt;
    let tx = ctl.x - ctl.face * 18, still = false;
    if (!N.pin && N.cd <= 0) {
      const g = G.enemies.filter(e => !e.dead && !e.down && e.type === 'goon' && Math.abs(e.x - ctl.x) < 60 && e.y > GROUND - 8).sort((a, b) => Math.abs(a.x - ctl.x) - Math.abs(b.x - ctl.x))[0];
      if (g) { N.pin = g; N.pinT = -1; sfx('nero_growl', d.x, 0.8); }
    }
    if (N.pin) {
      const e = N.pin;
      if (e.dead || e.down || Math.abs(e.x - d.x) > 160) { N.pin = null; N.cd = 18; }
      else {
        tx = e.x - (Math.sign(e.x - d.x) || 1) * 7;
        if (N.pinT < 0 && Math.abs(d.x - tx) < 6) { N.pinT = 4; sfx('nero_bite', d.x, 0.9); say('nero', 'Nero, hold!', 'He pins one goon for a few seconds', true); }
        if (N.pinT > 0) { tx = d.x; still = true; d.headDip = 2 + Math.sin(G.simTime * 30) * 0.8; e.act = null; e.hurtT = Math.max(e.hurtT, 0.12); e.cdT = Math.max(e.cdT, 0.4); e.vx = 0; e.tx = null; if ((N.pinT -= dt) <= 0) { N.pin = null; N.cd = 18; } }
      }
    }
    tx = clamp(tx, 8, 500);
    const dx = tx - d.x;
    if (Math.abs(dx) > 4 && !still) { d.st = 'walk'; d.face = Math.sign(dx); const want = clamp(dx * 3, -150, 150); d.vx += (want - d.vx) * (1 - Math.exp(-7 * dt)); d.x += d.vx * dt; }
    else { d.vx = 0; d.st = 'stand'; if (!still) d.face = ctl.face; }
    d.wag = N.pin ? 0.3 : 0.8;
    G.dogStep(d, dt);
  }
  function stayScene() {   // Beat 4: "Stay." This time he sits. The doors close between them.
    if (S.stay) return;
    S.stay = { t: 0 }; S.nero.st = 'stay'; G.lockT = Math.max(G.lockT, 3.2); hero.invT = 3;
    const d = G.dog; if (d) { d.x = D.LIFT_DOORS - 28; d.face = 1; }
    ctl.face = -1; sfx('bell_ting', D.LIFT_DOORS, 0.9, 1.4);
    later(() => G.barkHero('Stay.'), 0.6);
    later(() => sfx('door_slam', D.LIFT_DOORS, 0.7, 1.3), 2.0);
    later(() => H.teleport(660, arriveLift, 1), 2.6);
  }
  // ---------------- the glass lift ----------------
  function arriveLift(quiet) {
    if (G.dog) G.dog.hidden = true; S.nero.st = 'gone';
    if (!G.flags.demo) G.setCkpt('sp:lift', 0, quiet === true);
    G.setMusic('music:spire_lift', 0.6); S.lift.st = 'e1'; S.lift.floor = 1;
    later(() => sfx('nero_bark', 600, 0.25, 0.8), 1.2);   // claws on marble, far below: he ran for the stairwell
    startWave('e1');
    H.setObjective('The glass lift', 'Floor 1 → 75. The Choir holds the car.');
    say('lift', 'The glass lift', 'Break a side pane and throw them out. The car stops while they live.', true);
  }
  X.arriveLift = arriveLift;
  function liftStep(dt) {
    const L = S.lift; if (L.st === 'off' || L.gone) return;
    const go = (to, next) => { L.floor = Math.min(to, L.floor + D.FLOORS.rate * dt); if (L.floor >= to) { L.floor = to; next(); } if (Math.floor(L.floor) !== Math.floor(L.floor - D.FLOORS.rate * dt)) { G.shakeIt(0.05, 1); sfx('lever_clunk', 680, 0.2, 2); } };
    if (L.st === 'e1') { if (allDown('e1')) L.st = 'up30'; }
    else if (L.st === 'up30') go(D.FLOORS.twin, () => { L.st = 'twin'; L.twin.on = true; L.twin.y = 300; sfx('train_hum', 680, 0.7, 0.6); say('twin', 'The twin car', 'It rises beside you. They come across through the back pane.', true); });
    else if (L.st === 'twin') { L.twin.y = Math.max(0, L.twin.y - 150 * dt); if (L.twin.y <= 0) { L.st = 'e2'; H.breakPane(H.paneById('carBack')); startWave('e2'); } }
    else if (L.st === 'e2') { if (allDown('e2')) { L.st = 'up55'; G.ammoBoxes.push({ band: false, x: 700, y: GROUND - 20, vx: 0, vy: -60, life: 60 }); sfx('handcar_derail', 680, 0.6, 0.6); } }
    else if (L.st === 'up55') { L.twin.y += 240 * dt; if (L.twin.y > 320) L.twin.on = false; go(D.FLOORS.rope, () => { L.st = 'e3'; startWave('e3'); say('roof', 'The roof', 'The hatch: climb onto the car roof. Wind up there: a roll can carry you off.', true); }); }
    else if (L.st === 'e3') { reinfWave('e3'); if (allDown('e3')) L.st = 'up72'; }
    else if (L.st === 'up72') go(D.FLOORS.snap, () => { L.st = 'snap'; snap(); });
    else if (L.st === 'snap' || L.st === 'fell') { L.floor = Math.max(60, L.floor - 6 * dt); }
    S.hudTxt = `FLOOR ${String(Math.floor(L.floor)).padStart(2, '0')}`; S.hudK = L.floor / 75; S.hudLow = L.st === 'snap';
    // wind on the car roof (from floor 55)
    if (L.floor >= 55 && ctl.surf && ctl.surf.y === D.CAR.roof && ctl.surf.x0 === D.CAR.x0) windPush(D.LIFT.roofWind[dif()], dt, true);
    else if (L.floor >= 55) windTick(dt, null);
  }
  function snap() {   // Beat 8: the cable snaps; slow motion; the jump to the window-cleaning cradle
    const L = S.lift; L.snapped = true;
    sfx('chain_snap', 680, 1); sfx('ground_slam', 680, 1, 0.6); G.shakeIt(0.6, 4);
    G.toast('The cable!', 'A Choir man took an axe to it. JUMP → to the cradle', false);
    L.cradle.on = true; L.cradle.y = D.CRADLE.y;
    S.cradleS = H.addSurf({ x0: D.CRADLE.x0, x1: D.CRADLE.x1, y: D.CRADLE.y, oneWay: true });
    const pR = H.paneById('carR'); if (pR && !pR.broken) H.breakPane(pR);
    S.snap = { t: 0, win: 2.2 }; S.prompt = { x: (D.CRADLE.x0 + D.CRADLE.x1) / 2, y: D.CRADLE.y, r: 16 };
    G.slowMo(D.LIFT.snapSlow, 'snap'); sfx('slowmo_in', ctl.x, 1); G.emit('feat', 'cablesnap');
  }
  function snapStep(dt) {
    const s = S.snap; if (!s) return;
    s.t += dt;
    if (ctl.surf === S.cradleS && !ctl.air) { snapDone(true); return; }
    if (s.t > s.win && !ctl.air) snapFail();
  }
  function snapDone(ok) {
    S.snap = null; S.prompt = null; S.lift.st = 'fell'; S.lift.gone = true; G.emit('feat', ok ? 'cradle' : 'cradlefail');
    if (ok) G.toast('The cradle', 'The car falls past you into the clouds', true);
    sfx('handcar_pump', 790, 0.8, 0.6);
    later(() => H.teleport(860, arriveGarden, 2), 1.4);
  }
  function snapFail() {
    const d = dif(), dmg = D.LIFT.snapFail[d];
    if (dmg < 0) { S.snap = null; S.prompt = null; H.fallHero(true); return; }   // Wicked: the fall is lethal
    hero.hp = Math.max(1, hero.hp - dmg); G.toast('The brake catches', `Three floors down. The cradle comes down to meet you. −${dmg}`, true);
    G.shakeIt(0.4, 3); sfx('handcar_derail', 680, 1, 0.8);
    S.snap = null; S.prompt = null;
    later(() => { G.placeHero(795, S.cradleS); snapDone(false); }, 1.0);
  }
  // ---------------- the sky garden ----------------
  function arriveGarden(quiet) {
    S.gardenIn = true; S.hudTxt = null; S.lift.gone = true;
    if (S.cradleS) { H.dropSurf(S.cradleS); S.cradleS = null; } S.lift.cradle.on = false;
    if (!G.flags.demo) G.setCkpt('sp:garden', 0, quiet === true);
    G.setMusic('music:spire_garden', 0.6);
    H.setObjective('The sky garden · floor 75', 'Wind. Mind the edges.');
  }
  X.arriveGarden = arriveGarden;
  function windTick(dt, force) {   // a gust: a rising whistle and the rain's slant tilt for 1 s, then the push
    if (!S.wind) { if ((S.windNext -= dt) <= 0) { S.wind = { dir: 1, t: 0, on: false, force }; sfx('dodge_whoosh', ctl.x, 0.6, 0.4); } return; }
    const w = S.wind; w.t += dt; w.on = w.t >= D.WIND.warn;
    if (w.t >= D.WIND.warn + D.WIND.t) { S.wind = null; S.windNext = G.bRand(G.flags.club ? D.WIND.faceEvery : D.WIND.every); }
  }
  X.windTick = windTick;
  function windPush(force, dt, heroOnly) {
    windTick(dt, force);
    const w = S.wind; if (!w || !w.on) return;
    if (hero.mode === 'anim' && !S.pull) { ctl.x += w.dir * force * dt * (ctl.air ? 1.2 : 0.7); }
    if (G.simRand() < dt * 3) sfx('dodge_whoosh', ctl.x, 0.4, 0.5);
    if (heroOnly) return;
    for (const e of G.enemies) if (!e.dead && e.type === 'goon') e.x += w.dir * force * dt * (e.down || e.air ? 1.2 : 0.5);
    for (const o of G.objs) if (!o.carried && (o.thrown > 0 || Math.abs(o.vx) > 20)) o.vx += w.dir * force * dt;
    for (const t of G.thrown) if (!t.stuck) t.vx += w.dir * force * dt * 0.8;
    say('wind', 'Wind', 'A rising whistle, then the gust: it pushes everyone toward the edge, and throws curve with it', true);
  }
  X.windPush = windPush;
  function gardenStep(dt) {
    if (!S.gardenIn || G.flags.club || H.grpAt(ctl.x) !== 2) return;
    windPush(D.WIND.garden[dif()], dt);
    // the koi pool: slow; a knocked-down goon in it stays down longer
    if (hero.mode === 'anim' && !ctl.air && ctl.surf === G.GROUND_S && ctl.x >= D.KOI.x0 && ctl.x <= D.KOI.x1) { ctl.spd = Math.min(ctl.spd, G.RUN * D.KOI.slow); if (ctl.spd > 20 && G.simRand() < dt * 8) G.particles.push({ x: ctl.x, y: GROUND - 1, vx: (G.simRand() - 0.5) * 30, vy: -30 - G.simRand() * 30, life: 0.3, c: 0xffa09080 }); }
    for (const e of G.enemies) if (!e.dead && e.down && e.x >= D.KOI.x0 && e.x <= D.KOI.x1 && !e.koi) { e.koi = true; e.downT = (e.downT || 0) - D.KOI.down; sfx('water_splash', e.x, 0.7); }
  }
  function startKessel() {
    S.kesselOn = true; G.enc.arena = { x0: D.KESSEL_ARENA.x0, x1: D.KESSEL_ARENA.x1 };
    const e = G.spawnEnemy('boss', 1300, 'kessel', { boss: KESSEL });
    Object.assign(e, { alert: true, face: -1, hold: true, hookCd: 2, whipCd: 1.5, bigBar: false, mini: true });
    S.kessel = e; G.setMusic('music:spire_kessel', 0.8);
    const go = () => { e.hold = false; e.cdT = 0.8; say('kessel', 'Bruno Kessel', 'His hook pulls you in (dodge the throw); a missed hook sticks: punish it. The chain whips across the gap: jump it.', false); };
    if (G.flags.demo || S.kSeen) go(); else { S.kSeen = true; G.playScene('dialog', 'kessel_intro').then(go); }
  }
  function kesselStep(dt) {
    const K = S.kessel; if (!K || !S.kesselOn) return;
    if (!K.dead && !K.hold && dif() >= 2 && (S.kCrewT -= dt) <= 0) { S.kCrewT = KESSEL.crew.every; if (G.enemies.filter(e => !e.dead && e.zone === 'kesselCrew').length < KESSEL.crew.max) { const e = H.spawnChoir('cane', 1196, 'kesselCrew'); e.cdT = 1; } }
    if (K.dead && !S.kesselDone) {
      S.kesselDone = true; G.enc.arena = null; G.slowMo(1.0, 'boss');
      G.toast('Bruno Kessel', `"${KESSEL.lines.defeat}"`, false);
      later(() => G.toast('The service lift', '↑ at its doors: up to ninety', true), 2.5);
      H.setObjective('The sky garden', 'The service lift: floor 90'); G.setMusic('music:spire_garden', 0.4);
    }
  }
  // ---------------- the penthouse: "Champagne on Glass" ----------------
  function arrivePent(quiet) {
    S.pentIn = true; if (!G.flags.demo) G.setCkpt('sp:pent', 0, quiet === true);
    G.setMusic('music:spire_penthouse', 0.5); S.p1T = 1.5;
    H.setObjective('The penthouse · floor 90', 'A party on a glass floor');
    say('glass', 'Ninety floors of glass', 'Heavy landings, bodies and stray rounds crack the tiles. Fight on the steel beams; push the piano.', false);
  }
  X.arrivePent = arrivePent;
  function guestsStep(dt) {
    if (!S.pentIn) return;
    if (!S.guestsRun && (G.enemies.some(e => !e.dead && e.grp === 3 && e.hurtT > 0) || G.bullets.length > 0 && H.grpAt(ctl.x) === 3)) { S.guestsRun = true; sfx('grunt_goon', 1500, 0.8, 1.8); }
    for (const g of S.guests) { if (g.gone) continue; if (S.guestsRun) { g.run = true; g.x -= 90 * dt; if (g.x < 1368) g.gone = true; } }
  }
  function pianoStep(dt) {
    const p = S.piano; if (p.gone) return;
    if (hero.mode === 'anim' && !ctl.air && ctl.surf === G.GROUND_S && Math.abs(ctl.x - p.x) < 25) {
      const side = Math.sign(ctl.x - p.x) || 1; ctl.x = p.x + side * 25;
      if (ctl.spd > 10 && ctl.face === -side) { p.vx = -side * D.PIANO.v; say('piano', 'The grand piano', 'Four hundred kilos. It flattens whoever it meets, and the floor feels it.', true); }
    }
    if (Math.abs(p.vx) > 1) {
      const onIt = ctl.surf === p.surf && !ctl.air; p.x += p.vx * dt; if (onIt) ctl.x += p.vx * dt;
      p.x = clamp(p.x, 1384, 1680);
      const lead = p.x + Math.sign(p.vx) * 22;
      for (const e of G.enemies) if (!e.dead && !e.down && e.type === 'goon' && !p.hit.has(e) && Math.abs(e.x - lead) < 8 && e.y > GROUND - 10) { p.hit.add(e); S.raw = true; G.enc.eHitKind = 0; G.killBy = -1; G.damageEnemy(e, D.PIANO.dmg, Math.sign(p.vx), 300, 0.3, e.x, e.y - 12, false); G.killBy = null; S.raw = false; if (!e.dead && !e.down) G.knockDown(e, Math.sign(p.vx), 300, 'hp'); G.emit('feat', 'piano'); }
      p.vx *= Math.exp(-2.5 * dt); if (Math.abs(p.vx) < 2) { p.vx = 0; p.hit.clear(); }
      sfx('tuna_creak', p.x, 0.15, 0.5);
    }
    const t = H.tileAt(p.x); if (t && Math.abs(p.vx) > 1) H.tileHit(t, 5 * dt);   // (its weight tells on the glass as it rolls)
    if (S.tiles.some(t => t.broken && p.x >= t.x0 - 4 && p.x <= t.x1 + 4)) {   // its tile is gone: the piano goes through, with a last chord
      p.gone = true; H.dropSurf(p.surf); sfx('chandelier_crash', p.x, 1, 0.5); sfx('perc_kick', p.x, 1, 0.4);
      S.fallers.push({ x: p.x, y: GROUND, vx: 0, vy: 0, t: 0, cols: [C('#141216'), C('#141216'), C('#141216')] });
      for (const e of G.enemies) if (!e.dead && Math.abs(e.x - p.x) < 30) H.makeFaller(e);
      G.toast('The piano', 'A last chord, ninety floors down', true);
    }
    p.surf.x0 = p.x - 20; p.surf.x1 = p.x + 20;
  }
  // Beat 12: the machine-gun volley sweeps the floor; the tile under him goes; slow motion; the dive to the stair rail
  function startSweep() {
    S.p2Started = true; startWave('p2');
    S.sweep = { t: 0, T: 2.0 }; sfx('mg_burst', 1680, 1); G.toast('MG nest!', 'They open up on the glass', true);
  }
  function sweepStep(dt) {
    const sw = S.sweep;
    if (sw) {
      sw.t += dt; const k = Math.min(1, sw.t / sw.T), x = 1500 + k * 154;
      S.tellT.push({ kind: 'laser', x0: 1690, y0: D.PH_MEZZ.y - 14, x1: x, t: 0.02 });
      if (G.simRand() < dt * 14) { sfx('mg_burst', 1680, 0.6); G.sparks.push({ x, y: GROUND - 1, t: 0 }); }
      for (const t of S.tiles) if ((t.id === 'gf2' || t.id === 'gf3') && x >= t.x0 && !t.broken && t.hp > 30) { t.hp = 30; t.stage = 2; sfx('glass_creak', x, 0.8); }
      if (k >= 1) {
        S.sweep = null;
        const t = H.tileAt(ctl.x);
        if (t && hero.mode === 'anim' && !ctl.air) { H.tileHit(t, 999); S.coyote = 0.5; }
        S.dive = { t: 0 }; S.prompt = { x: D.RAIL.x0 + 6, y: D.RAIL.y, r: 14 };
        G.slowMo(D.MG_SWEEP.slow, 'mgsweep'); sfx('slowmo_in', ctl.x, 1);
        G.toast('DIVE', 'Jump or roll → to the stair rail', false); G.emit('feat', 'mgsweep');
      }
    }
    const dv = S.dive;
    if (dv) {
      dv.t += dt;
      const grab = D.MG_SWEEP.grab[dif()], rail = H.plat({ x0: D.RAIL.x0, y: D.RAIL.y });
      if (hero.mode === 'anim' && ctl.air && ctl.x >= D.RAIL.x0 - grab && ctl.y > D.RAIL.y - 30 && rail) { G.placeHero(D.RAIL.x0 + 6, rail); diveDone(); }
      else if (hero.mode === 'anim' && !ctl.air && (ctl.x >= D.RAIL.x0 || (ctl.surf && ctl.surf !== G.GROUND_S && ctl.surf.y <= D.RAIL.y))) diveDone();
      else if (dv.t > 4) { S.dive = null; S.prompt = null; }
    }
  }
  function diveDone() { S.dive = null; S.prompt = null; G.toast('The rail', 'Up the stair: the gunners are above you', true); G.emit('feat', 'raildive'); }
  X.onFall = F => {   // a set piece's own fail branch for a fall
    if (S.dive || (S.pentIn && H.grpAt(ctl.x) === 3 && !S.p2done && S.p2Started)) {
      if (D.MG_SWEEP.second[dif()] && !S.secondUsed) { S.secondUsed = true; S.dive = null; S.prompt = null; G.heroTo(1662); hero.hp = Math.max(1, hero.hp - 20); G.toast('He catches a mullion', 'A second chance. −20', true); return true; }
      return false;
    }
    if (S.snap || S.lift.st === 'snap') { S.snap = null; S.prompt = null; if (D.LIFT.snapFail[dif()] >= 0) { hero.hp = Math.max(1, hero.hp - D.LIFT.snapFail[dif()]); G.placeHero(795, S.cradleS); snapDone(false); return true; } return false; }
    return false;
  };
  // ---------------- the vestry ----------------
  function arriveVestry(quiet) {
    S.vestryIn = true; if (!G.flags.demo) G.setCkpt('sp:vestry', 0, quiet === true);
    G.setMusic('music:spire_vestry', 0.5);
    H.setObjective('The vestry', 'The hatch to the crown ↑');
    say('vestry', 'The vestry', 'His old Choir katana on the rack. The clock on the wall stopped at 3:17.', true);
  }
  X.arriveVestry = arriveVestry;
  function vestryStep() {
    if (!S.vestryIn || S.scarf || ctl.x < D.VESTRY.scarf) return;
    S.scarf = { t: 0 }; G.lockT = Math.max(G.lockT, 2.4); ctl.face = 1;
    G.toast("Elena's red scarf", 'He takes it out. He looks at it. He puts it back.', true);
    later(() => { sfx('nero_bark', 1780, 0.5, 0.9); G.toast('...a bark', 'closer now, up the stairwell', true); }, 2.6);
  }

  // ---------------- per frame beats and the fixed step ----------------
  X.beats = (dt) => {
    const px = ctl.x;
    if (S.grp === 0) {
      if (S.w.l1.out && !S.w.l2a.out && (px >= 240 || allDown('l1'))) startWave('l2a');
      reinfWave('l2a');
      if (S.w.l2a.out && !S.w.l2b.out && (allDown('l2a') || px >= 330)) startWave('l2b');
      if (allDown('l2b') && allDown('l2a') && allDown('l1') && !S.lysOn && px >= D.LYS_ARENA.x0 + 4) startLys();
      if (!S.lysOn) H.setObjective('The lobby', `The Choir: ${['l1', 'l2a', 'l2b'].reduce((n, id) => n + alive(id), 0) + S.queue.length} · up the stair to the mezzanine`);
      else if (S.lys && !S.lys.dead) H.setObjective('The lobby', `Beat ${LYS.name}`);
    }
    if (S.grp === 2 && S.gardenIn) {
      if (!S.barkFar && px >= 880) { S.barkFar = true; sfx('nero_bark', D.NERO_DOOR, 0.3, 0.8); G.toast('...a bark, far below.', '', true); }
      if (!S.w.g1.out && px >= 900) startWave('g1');
      reinfWave('g1');
      if (S.w.g1.out && !S.w.g2.out && px >= 1100) startWave('g2');
      if (allDown('g1') && allDown('g2') && !S.kesselOn && px >= D.KESSEL_ARENA.x0 + 6) startKessel();
      if (S.kessel && !S.kessel.dead) H.setObjective('The helideck', `Beat ${KESSEL.name}`);
    }
    if (S.grp === 3 && S.pentIn) {
      if (S.p1T > 0 && (S.p1T -= dt) <= 0) { S.p1T = -1; startWave('p1'); }
      reinfWave('p1');
      if (allDown('p1') && !S.p2Started && px >= 1470) startSweep();
      if (S.p2Started && allDown('p2') && !S.p2done && !S.sweep) { S.p2done = true; G.toast('The stair door', '↑ by it: the vestry', true); H.setObjective('The penthouse', 'The stair door →'); }
    }
  };
  X.setStep = dt => {
    chandStep(dt); lysStep(dt); neroStep(dt); liftStep(dt); snapStep(dt); gardenStep(dt); kesselStep(dt); guestsStep(dt); pianoStep(dt); sweepStep(dt); vestryStep();
  };
  X.miniSet = () => S.lys && !S.lys.dead && S.lysOn && !S.lys.hold ? S.lys : S.kessel && !S.kessel.dead && S.kesselOn && !S.kessel.hold ? S.kessel : null;
  X.extraLights = add => {
    if (S.prompt) add(S.prompt.x, S.prompt.y - 6, 40, 1.2, 1.0, 0.5, 20, 5);
    if (S.lift && S.lift.twin.on) add(680, S.lift.twin.y + D.CAR.ceil + 6, 90, 0.7, 0.8, 1.0, 5, 2);
    if (X.crownLights) X.crownLights(add);
  };
  // the climb restored to a checkpoint (lv: 1 lift, 2 garden, 3 penthouse, 4 vestry, 5+ the crown)
  X.restoreSet = lv => {
    const mark = ids => { for (const id of ids) S.w[id] = { out: true, n: 0, reinf: true }; };
    if (lv < 1) return;
    mark(['l1', 'l2a', 'l2b']); S.lysOn = true; S.lysDone = true; S.lys = { dead: true }; S.nero.st = 'gone'; if (G.dog) G.dog.hidden = true;
    if (lv < 2) return;
    mark(['e1', 'e2', 'e3']); S.lift.gone = true; S.lift.st = 'fell'; S.gardenIn = true;
    if (lv < 3) return;
    mark(['g1', 'g2']); S.kesselOn = true; S.kesselDone = true; S.kessel = { dead: true }; S.barkFar = true; S.pentIn = true;
    if (lv < 4) return;
    mark(['p1', 'p2']); S.p2Started = true; S.p2done = true; S.guestsRun = true; for (const g of S.guests) g.gone = true; S.p1T = -1;
    for (const t of S.tiles) if (t.id !== 'gf1') { t.broken = true; t.stage = 3; t.hp = 0; }
    S.piano.gone = true; H.dropSurf(S.piano.surf); S.vestryIn = true; S.scarf = { t: 9 };
  };
  X.peekSet = () => ({
    lys: S.lys && S.lys.J ? { hp: Math.round(S.lys.hp), dead: S.lys.dead, sp: S.lys.sp } : null, decoys: S.decoys.filter(d => !d.dead).length, chand: S.chand.st,
    lift: { st: S.lift.st, floor: +S.lift.floor.toFixed(1), twin: S.lift.twin.on }, snap: S.snap ? +S.snap.t.toFixed(2) : null,
    kessel: S.kessel && S.kessel.J ? { hp: Math.round(S.kessel.hp), dead: S.kessel.dead, sp: S.kessel.sp } : null, wind: S.wind ? S.wind.on : null,
    piano: S.piano.gone ? 'gone' : Math.round(S.piano.x), sweep: !!S.sweep, dive: !!S.dive, p2done: S.p2done, nero: G.dog ? { x: Math.round(G.dog.x), st: S.nero.st, hidden: !!G.dog.hidden } : null,
  });
}
