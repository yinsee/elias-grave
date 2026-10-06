// The music director: two states on the level's track, driven by the fight.
//
//   import { createMusicDirector } from './audio/director.js';
//   const director = createMusicDirector(gameAudio, bus);
//   director.tick(dt, { active, boss, hot, near });   // once per frame
//
// explore: the track sits back (a low-pass at EXPLORE.lp, its own level). combat: the filter opens, the level comes up and a
// percussion layer from the procedural bank (sfx.js) plays on the beat of the track. The beat is found once per track from
// the decoded file (an onset envelope, its autocorrelation for the period, then the best phase), so the drums line up with
// the music without stems. A fight that ends with goons down plays a stinger.
// The director only shapes the music bus (gain, filter, drums under the voice duck), so the volume setting covers it.
// Boss fights, the title screen, cutscenes and endings: the layer goes neutral and the track plays as it is.
// It never reads or writes the game state: the game passes what it needs (active, boss, hot, near) to tick().

import { createSfx } from './sfx.js';

const EXPLORE = { lp: 1700, gain: 1, perc: 0 };
const COMBAT = { lp: 20000, gain: 1.45, perc: 0.5 };
const NEUTRAL = { lp: 20000, gain: 1, perc: 0 };
const CALM_T = 2.5;          // s with no goon on him before the fight is over
const LOOKAHEAD = 0.25;      // s of drum hits scheduled ahead of the clock

// ---- beat tracking: period and phase of a decoded track (cached per buffer)
const beatCache = new WeakMap();
export function findBeat(buf) {
  if (beatCache.has(buf)) return beatCache.get(buf);
  const sr = buf.sampleRate, hop = Math.round(sr / 100), n = Math.floor(buf.length / hop) - 1;
  const a = buf.getChannelData(0), b = buf.numberOfChannels > 1 ? buf.getChannelData(1) : a;
  const on = new Float32Array(n);
  let lo = 0, pe = 0, pl = 0;
  const kLo = 1 - Math.exp(-2 * Math.PI * 180 / sr);   // the bass band (kick drums)
  for (let i = 0; i < n; i++) {
    let e = 0, el = 0;
    for (let j = i * hop, J = j + hop; j < J; j++) { const x = (a[j] + b[j]) * 0.5; lo += kLo * (x - lo); e += x * x; el += lo * lo; }
    const le = Math.log(1e-6 + e), ll = Math.log(1e-6 + el);
    on[i] = (i ? Math.max(0, le - pe) + 1.5 * Math.max(0, ll - pl) : 0);
    pe = le; pl = ll;
  }
  // the period: autocorrelation over 60-180 bpm, weighted toward 120 bpm (a log-normal prior)
  const ac = (L) => { let s = 0; for (let i = 0; i + L < n; i++) s += on[i] * on[i + L]; return s / (n - L); };
  let best = 0, bestL = 50;
  const vals = [];
  for (let L = 33; L <= 100; L++) {
    const bpm = 6000 / L, w = Math.exp(-0.5 * (Math.log2(bpm / 120) / 0.9) ** 2), v = ac(L) * w;
    vals[L] = v; if (v > best) { best = v; bestL = L; }
  }
  const y0 = vals[bestL - 1] ?? best, y2 = vals[bestL + 1] ?? best, den = y0 - 2 * best + y2;
  const Lf = bestL + (den < 0 ? 0.5 * (y0 - y2) / den : 0), period = Lf / 100;
  // the phase: the offset whose beat grid collects the most onset
  let bp = 0, bestS = -1;
  for (let ph = 0; ph < Lf; ph += 0.5) {
    let s = 0; for (let t = ph; t < n; t += Lf) s += on[Math.round(t)] || 0;
    if (s > bestS) { bestS = s; bp = ph; }
  }
  const r = { period, phase: bp / 100, bpm: 60 / period, dur: buf.duration };
  beatCache.set(buf, r);
  return r;
}

export function createMusicDirector(gameAudio, bus) {
  let rt = null, drums = null, perc = null, stingSfx = null;
  let state = 'off', calmT = 0, fightKills = 0, schedUntil = 0, cur = null;
  const log = [];
  const say = (s) => { log.push(`${s}`); if (log.length > 40) log.shift(); };

  bus.on('kill', (p = {}) => { if (state === 'combat' && !p.isBoss) fightKills++; });

  function bind() {   // the audio runtime appears at the first user gesture
    const r = gameAudio.runtime;
    if (r === rt) return !!rt;
    rt = r; if (!rt) return false;
    perc = rt.ctx.createGain(); perc.gain.value = 0; perc.connect(rt.music.layer.perc);
    drums = createSfx(rt.ctx, { destination: perc });
    stingSfx = createSfx(rt.ctx, { destination: rt.music.layer.perc });
    cur = null; apply(state, 0.05);
    return true;
  }

  function apply(s, tau) {
    if (!rt) return;
    const L = s === 'combat' ? COMBAT : s === 'explore' ? EXPLORE : NEUTRAL, t = rt.ctx.currentTime, lay = rt.music.layer;
    lay.lp.frequency.cancelScheduledValues(t); lay.lp.frequency.setTargetAtTime(L.lp, t, tau);
    lay.gain.gain.cancelScheduledValues(t); lay.gain.gain.setTargetAtTime(L.gain, t, tau);
    perc.gain.cancelScheduledValues(t); perc.gain.setTargetAtTime(L.perc, t, tau * 0.8);
  }

  function setState(s) {
    if (s === state) return;
    const was = state;
    state = s;
    if (s === 'combat') fightKills = 0;
    apply(s, s === 'combat' ? 0.35 : 1.2);
    say(`${was}->${s}`);
  }

  function stinger() {
    say('stinger');
    if (!rt) return;
    stingSfx.play('stinger_clear', { vol: 0.75 });
    const g = rt.music.layer.gain.gain, t = rt.ctx.currentTime;   // the track steps back under it, then returns
    g.cancelScheduledValues(t); g.setTargetAtTime(0.45, t, 0.05); g.setTargetAtTime(EXPLORE.gain, t + 1.4, 0.8);
  }

  // the drums: a backbeat on the track's beat grid (kick 1 and 3, snare 2 and 4, eighth hats); half time when the beat is fast
  function schedule() {
    const now = rt.music.now, ctx = rt.ctx;
    if (!now || rt.music.slow || state !== 'combat') { schedUntil = ctx.currentTime; return; }
    if (!cur || cur.buf !== now.buf || cur.t0 !== now.t0) { cur = { ...now, beat: findBeat(now.buf) }; say(`beat ${now.id} ${cur.beat.bpm.toFixed(1)} bpm`); schedUntil = ctx.currentTime; }
    const { period, phase, dur } = cur.beat, half = period < 0.45, t0 = cur.t0;
    const a = Math.max(schedUntil, ctx.currentTime), b = ctx.currentTime + LOOKAHEAD;
    if (b <= a) return;
    for (let m = Math.max(0, Math.floor((a - t0) / dur)); t0 + m * dur < b; m++) {
      if (!cur.loop && m > 0) break;
      const base = t0 + m * dur;
      for (let k = Math.max(0, Math.ceil((a - base - phase) / period * 2) / 2); phase + k * period < dur; k += 0.5) {
        const tb = base + phase + k * period; if (tb >= b) break; if (tb < a) continue;
        const when = tb - ctx.currentTime, beat = Math.round(k * 2), q = half ? beat / 2 : beat;   // q counts eighths at the felt tempo
        if (half && beat % 2) continue;
        const pos = ((q % 8) + 8) % 8;
        if (pos === 0 || pos === 4 || pos === 5) drums.play('perc_kick', { when, vol: pos === 5 ? 0.6 : 0.95 });
        if (pos === 2 || pos === 6) drums.play('perc_snare', { when, vol: 0.7 });
        if (pos === 7) drums.play('perc_tom', { when, vol: 0.55 });
        drums.play('perc_hat', { when, vol: pos % 2 ? 0.35 : 0.55 });
      }
    }
    schedUntil = b;
  }

  return {
    get state() { return state; },
    get log() { return log; },
    get beat() { return cur && cur.beat; },
    // active: a game is on (not the title, a cutscene or an ending); boss: a boss fight (its music plays as it is);
    // hot: goons after him close by; near: goons alive close by (aggro or not)
    tick(dt, { active, boss, hot, near }) {
      bind();
      if (!active || boss) { setState(boss && active ? 'boss' : 'off'); calmT = 0; }
      else if (hot > 0) { setState('combat'); calmT = 0; }
      else if (state === 'combat') {
        if ((calmT += dt) >= CALM_T) { const won = fightKills > 0 && !near; setState('explore'); if (won) stinger(); }
      } else setState('explore');
      if (rt) schedule();
    },
    // a level change or a restart: back to explore at once, no stinger
    reset() { calmT = 0; fightKills = 0; if (state === 'combat') setState('explore'); },
  };
}
