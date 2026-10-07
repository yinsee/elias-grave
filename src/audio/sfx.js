// Procedural sound effects (WebAudio only, no files).
//
//   const sfx = createSfx(ctx);              // ctx: an AudioContext
//   sfx.play('punch_heavy', { vol: 1, pan: -0.3, pitch: 1 });
//   sfx.names                                // every sound name
//   sfx.output                               // the master GainNode (already connected to ctx.destination,
//                                            //   pass { destination } to route it elsewhere)
//
// Style: gritty and punchy (distorted low thumps, filtered noise, metal rings), not chiptune.
// Every play has a small random detune and level change so repeats do not sound like a machine.
// `pitch` scales every frequency and divides every duration (pitch 0.5 = slow-motion version).

const TAU = Math.PI * 2;

// Its own random numbers (mulberry32), never Math.random: the game may seed Math.random for its tests, and sound
// must not use up or shift a random sequence that the game reads.
let rs = (Date.now() ^ 0x9e3779b9) >>> 0;
function rand() { rs = (rs + 0x6D2B79F5) >>> 0; let t = Math.imul(rs ^ (rs >>> 15), 1 | rs); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }

export function createSfx(ctx, { destination = ctx.destination, vary = true } = {}) {
  // ---- master chain: bus -> compressor -> master gain -> destination; a shared room reverb on a send
  const master = ctx.createGain();
  master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 6; comp.ratio.value = 6;
  comp.attack.value = 0.002; comp.release.value = 0.12;
  comp.connect(master).connect(destination);
  const verb = ctx.createConvolver();
  verb.buffer = impulse(1.6, 2.8);
  const verbOut = ctx.createGain();
  verbOut.gain.value = 0.5;
  verb.connect(verbOut).connect(comp);

  // ---- shared buffers and curves
  const white = noiseBuf('white', 2);
  const brown = noiseBuf('brown', 2);
  const curves = {};
  function curve(k) {               // soft clip; k = drive amount
    if (curves[k]) return curves[k];
    const n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); }
    return (curves[k] = c);
  }

  function noiseBuf(kind, sec) {
    const len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = rand() * 2 - 1;
      if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return b;
  }

  function impulse(sec, decay) {
    const len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (rand() * 2 - 1) * Math.pow(1 - i / len, decay) * (i < 200 ? i / 200 : 1);
    }
    return b;
  }

  // ---- building blocks. Each takes a voice `v` = { t, out, p (pitch), k (time scale) }
  function env(g, t, peak, a, d, curveExp = true) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    if (curveExp) g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    else g.gain.linearRampToValueAtTime(0, t + a + d);
  }

  // A tone: freq f0 -> f1 over `dur`, amplitude envelope (attack a, decay d).
  function tone(v, { type = 'sine', f0, f1 = f0, at = 0, a = 0.002, d = 0.2, vol = 1, sweep = d, drive = 0, to = v.out }) {
    const t = v.t + at * v.k, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0 * v.p, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1 * v.p), t + sweep * v.k);
    env(g, t, vol, a * v.k, d * v.k);
    let node = o;
    if (drive) { const s = ctx.createWaveShaper(); s.curve = curve(drive); node.connect(s); node = s; }
    node.connect(g).connect(to);
    o.start(t); o.stop(t + (a + d) * v.k + 0.05);
    return o;
  }

  // Filtered noise burst. filter: 'lowpass' | 'highpass' | 'bandpass'; f0 -> f1 sweep of the cutoff.
  function noise(v, { buf = white, filter = 'lowpass', f0 = 2000, f1 = f0, q = 0.7, at = 0, a = 0.001, d = 0.1, vol = 1, drive = 0, sweep = a + d, lin = false, to = v.out, rate = 1 }) {
    const t = v.t + at * v.k, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = buf;
    s.playbackRate.value = rate;
    f.type = filter; f.Q.value = q;
    f.frequency.setValueAtTime(Math.min(20000, f0 * v.p), t);
    f.frequency.exponentialRampToValueAtTime(Math.min(20000, Math.max(20, f1 * v.p)), t + sweep * v.k);
    env(g, t, vol, a * v.k, d * v.k, !lin);
    let node = s;
    node.connect(f); node = f;
    if (drive) { const w = ctx.createWaveShaper(); w.curve = curve(drive); node.connect(w); node = w; }
    node.connect(g).connect(to);
    s.start(t, rand() * 1.5); s.stop(t + (a + d) * v.k + 0.05);
    return { src: s, gain: g, filter: f };
  }

  // Inharmonic metal ring (several partials with their own decays).
  function ring(v, { f = 3000, ratios = [1, 1.47, 2.09, 2.76], at = 0, d = 0.4, vol = 0.2, to = v.out }) {
    ratios.forEach((r, i) => tone(v, { f0: f * r * (1 + (rand() - 0.5) * 0.02), at, a: 0.001, d: d / (1 + i * 0.5), vol: vol / (1 + i * 0.6), to }));
  }

  // A per-sound send to the reverb.
  function send(v, amount) {
    const g = ctx.createGain(); g.gain.value = amount;
    v.out.connect(g).connect(verb);
  }

  // ---- the sound bank. Each entry: (v) => void, plays at v.t through v.out.
  const bank = {
    punch_light(v) {
      tone(v, { f0: 170, f1: 55, d: 0.09, vol: 0.9, drive: 3 });
      noise(v, { filter: 'bandpass', f0: 2600, f1: 1200, q: 1.2, d: 0.03, vol: 0.6 });
      noise(v, { buf: brown, filter: 'lowpass', f0: 900, d: 0.06, vol: 0.8, drive: 2 });
    },
    punch_heavy(v) {
      tone(v, { f0: 130, f1: 38, d: 0.2, vol: 1, drive: 5 });
      tone(v, { type: 'triangle', f0: 70, f1: 30, at: 0.005, d: 0.25, vol: 0.6 });
      noise(v, { filter: 'bandpass', f0: 3200, f1: 900, q: 0.9, d: 0.05, vol: 0.7, drive: 4 });
      noise(v, { buf: brown, filter: 'lowpass', f0: 1200, f1: 300, d: 0.14, vol: 1, drive: 3 });
      send(v, 0.15);
    },
    // the kicks play on the hit (the swing event already plays the leg's whoosh), so the impact is at once
    kick_light(v) {
      tone(v, { f0: 140, f1: 45, d: 0.12, vol: 0.95, drive: 3 });
      noise(v, { buf: brown, filter: 'lowpass', f0: 700, d: 0.09, vol: 0.9, drive: 2 });
      noise(v, { filter: 'bandpass', f0: 1800, q: 1, d: 0.025, vol: 0.4 });
    },
    kick_heavy(v) {
      tone(v, { f0: 110, f1: 32, d: 0.28, vol: 1, drive: 6 });
      noise(v, { buf: brown, filter: 'lowpass', f0: 1000, f1: 200, d: 0.2, vol: 1, drive: 4 });
      noise(v, { filter: 'bandpass', f0: 2400, f1: 700, q: 0.8, d: 0.06, vol: 0.6, drive: 3 });
      send(v, 0.2);
    },
    blade_slash(v) {
      noise(v, { filter: 'bandpass', f0: 900, f1: 7000, q: 4, a: 0.06, d: 0.12, vol: 0.7, sweep: 0.15 });
      noise(v, { filter: 'highpass', f0: 5000, a: 0.03, d: 0.08, vol: 0.25 });
      ring(v, { f: 3400, at: 0.04, d: 0.35, vol: 0.06 });
      send(v, 0.1);
    },
    blade_hit(v) {
      noise(v, { filter: 'bandpass', f0: 2000, f1: 6000, q: 3, a: 0.02, d: 0.05, vol: 0.5 });
      tone(v, { f0: 220, f1: 70, at: 0.02, d: 0.12, vol: 0.8, drive: 3 });
      noise(v, { buf: brown, filter: 'bandpass', f0: 700, f1: 350, q: 3, at: 0.02, d: 0.18, vol: 0.9 });  // wet cut
      noise(v, { filter: 'bandpass', f0: 1400, f1: 500, q: 6, at: 0.05, d: 0.12, vol: 0.35 });            // squelch
      ring(v, { f: 2900, at: 0.02, d: 0.25, vol: 0.05 });
    },
    shotgun(v) {
      noise(v, { filter: 'lowpass', f0: 9000, f1: 700, d: 0.35, vol: 1, drive: 8, sweep: 0.25 });
      tone(v, { f0: 95, f1: 32, d: 0.4, vol: 1, drive: 6 });
      noise(v, { buf: brown, filter: 'lowpass', f0: 600, f1: 150, at: 0.02, d: 0.9, vol: 0.8 });   // tail
      noise(v, { filter: 'highpass', f0: 3000, d: 0.015, vol: 0.9 });                              // crack
      send(v, 0.35);
      // pump: two mechanical clacks after the shot
      noise(v, { filter: 'bandpass', f0: 2200, q: 2, at: 0.42, d: 0.03, vol: 0.4, drive: 3 });
      tone(v, { type: 'square', f0: 320, f1: 180, at: 0.42, d: 0.03, vol: 0.12 });
      noise(v, { filter: 'bandpass', f0: 1700, q: 2, at: 0.56, d: 0.04, vol: 0.5, drive: 3 });
      tone(v, { type: 'square', f0: 260, f1: 140, at: 0.56, d: 0.04, vol: 0.14 });
    },
    pistol(v) {   // a dry, short crack: no long tail, no pump
      noise(v, { filter: 'highpass', f0: 2800, d: 0.01, vol: 1 });
      noise(v, { filter: 'lowpass', f0: 6000, f1: 1200, d: 0.09, vol: 0.85, drive: 6, sweep: 0.07 });
      tone(v, { f0: 180, f1: 70, d: 0.08, vol: 0.7, drive: 4 });
      noise(v, { buf: brown, filter: 'lowpass', f0: 500, f1: 200, at: 0.02, d: 0.18, vol: 0.35 });
      send(v, 0.18);
    },
    bullet_flesh(v) {   // a round into a body: a snap, a wet thwack, a spatter
      noise(v, { filter: 'highpass', f0: 2500, d: 0.012, vol: 0.6 });
      tone(v, { f0: 160, f1: 60, d: 0.07, vol: 0.8, drive: 4 });
      noise(v, { buf: brown, filter: 'bandpass', f0: 900, f1: 400, q: 2.5, d: 0.12, vol: 0.9 });
      noise(v, { filter: 'bandpass', f0: 1800, f1: 700, q: 5, at: 0.02, d: 0.08, vol: 0.3 });
    },
    block(v) {   // the forearms take it: a dull, padded knock, no crack
      tone(v, { type: 'triangle', f0: 220, f1: 120, d: 0.06, vol: 0.7, drive: 2 });
      noise(v, { buf: brown, filter: 'lowpass', f0: 600, d: 0.05, vol: 0.7 });
      noise(v, { filter: 'bandpass', f0: 1200, q: 2, d: 0.02, vol: 0.35 });   // sleeve slap
    },
    guard_catch(v) {   // the fist caught in a palm: a sharp slap, then a shove
      noise(v, { filter: 'bandpass', f0: 2200, f1: 1400, q: 1.4, d: 0.035, vol: 0.9, drive: 2 });
      tone(v, { f0: 260, f1: 150, d: 0.05, vol: 0.4 });
      noise(v, { filter: 'bandpass', f0: 400, f1: 900, q: 1.2, at: 0.06, a: 0.05, d: 0.1, vol: 0.4, lin: true });
    },
    kill_confirm(v) {   // the last blow: a low boom and a bone crack under the hit
      tone(v, { f0: 60, f1: 28, d: 0.5, vol: 0.9, drive: 6 });
      noise(v, { filter: 'bandpass', f0: 3200, f1: 1500, q: 3, d: 0.03, vol: 0.6, drive: 4 });
      noise(v, { filter: 'bandpass', f0: 2400, q: 4, at: 0.018, d: 0.025, vol: 0.4, drive: 3 });
      noise(v, { buf: brown, filter: 'lowpass', f0: 400, f1: 80, d: 0.5, vol: 0.6 });
      send(v, 0.3);
    },
    hook_clank(v) {   // the meat hook hits a crate or a steel post: a hard knock and a ring
      tone(v, { type: 'triangle', f0: 320, f1: 140, d: 0.08, vol: 0.8, drive: 4 });
      noise(v, { filter: 'bandpass', f0: 2600, q: 2, d: 0.03, vol: 0.8, drive: 3 });
      ring(v, { f: 1450, d: 0.7, vol: 0.14 });
      send(v, 0.3);
    },
    // boss tells: one sound for each wind-up, so the ear reads the move as well as the eye
    boss_roar(v) {
      [55, 82, 110].forEach((f, i) => tone(v, { type: 'sawtooth', f0: f * 1.2, f1: f * 0.8, a: 0.12, d: 0.9, vol: 0.25 / (1 + i * 0.5), drive: 4, sweep: 1 }));
      noise(v, { buf: brown, filter: 'bandpass', f0: 300, f1: 180, q: 1.5, a: 0.1, d: 0.9, vol: 0.9, drive: 3 });
      noise(v, { filter: 'bandpass', f0: 900, f1: 500, q: 2, a: 0.1, d: 0.7, vol: 0.25 });   // the rasp in the throat
      send(v, 0.35);
    },
    tell_charge(v) {   // he digs in: two heavy foot scrapes and a snort
      for (const at of [0, 0.22]) {
        noise(v, { buf: brown, filter: 'lowpass', f0: 500, at, d: 0.07, vol: 1 });
        noise(v, { filter: 'bandpass', f0: 1400, f1: 600, q: 1.5, at, a: 0.02, d: 0.12, vol: 0.35, lin: true });
      }
      noise(v, { filter: 'bandpass', f0: 700, f1: 1100, q: 2, at: 0.4, a: 0.03, d: 0.15, vol: 0.4 });
    },
    tell_jslam(v) {   // a grunt and a rising strain before the leap
      noise(v, { buf: brown, filter: 'lowpass', f0: 500, d: 0.08, vol: 0.9 });
      noise(v, { buf: brown, filter: 'bandpass', f0: 250, f1: 420, q: 2, a: 0.08, d: 0.35, vol: 0.9, drive: 3 });
      tone(v, { type: 'sawtooth', f0: 70, f1: 130, a: 0.1, d: 0.35, vol: 0.18, drive: 3, sweep: 0.45 });
    },
    chain_spin(v) {   // the hook's chain whirled overhead: a rising whoosh and a link rattle on each turn, each turn faster
      for (let i = 0, at = 0; i < 4; i++, at += 0.2 - i * 0.025) {
        noise(v, { filter: 'bandpass', f0: 400 + i * 150, f1: 1400 + i * 300, q: 2, at, a: 0.07, d: 0.08, vol: 0.35 + i * 0.08, lin: true });
        for (let j = 0; j < 3; j++) noise(v, { filter: 'bandpass', f0: 3000 + rand() * 2500, q: 6, at: at + 0.04 + j * 0.02, d: 0.02, vol: 0.25 });
      }
    },
    tuna_creak(v) {   // the conveyor lurches: a chain clank and a long creak of the rail
      noise(v, { filter: 'bandpass', f0: 1800, q: 3, d: 0.04, vol: 0.6, drive: 3 });
      ring(v, { f: 900, d: 0.4, vol: 0.08 });
      tone(v, { type: 'sawtooth', f0: 140, f1: 95, at: 0.05, a: 0.1, d: 0.6, vol: 0.12, drive: 2, sweep: 0.7 });
      noise(v, { filter: 'bandpass', f0: 600, f1: 420, q: 8, at: 0.05, a: 0.1, d: 0.6, vol: 0.35 });
    },
    mg_burst(v) {
      for (let i = 0; i < 6; i++) {
        const j = { ...v, t: v.t + i * 0.075 * v.k, p: v.p * (1 + (rand() - 0.5) * 0.08) };
        noise(j, { filter: 'lowpass', f0: 7000, f1: 900, d: 0.09, vol: 0.85, drive: 7 });
        tone(j, { f0: 120, f1: 45, d: 0.08, vol: 0.8, drive: 5 });
        noise(j, { filter: 'highpass', f0: 3500, d: 0.01, vol: 0.6 });
      }
      noise(v, { buf: brown, filter: 'lowpass', f0: 500, f1: 120, at: 0.1, d: 0.8, vol: 0.5 });
      send(v, 0.3);
    },
    ricochet(v) {
      noise(v, { filter: 'highpass', f0: 4000, d: 0.012, vol: 0.7 });
      const o = tone(v, { f0: 3800 + rand() * 800, f1: 1100, at: 0.01, a: 0.005, d: 0.42, vol: 0.4, sweep: 0.42 });
      const lfo = ctx.createOscillator(), lg = ctx.createGain();      // the "wobble" of a spinning slug
      lfo.frequency.value = 38; lg.gain.value = 140 * v.p;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(v.t); lfo.stop(v.t + 0.5 * v.k);
      noise(v, { filter: 'bandpass', f0: 5000, f1: 2000, q: 8, at: 0.01, d: 0.3, vol: 0.15 });
      send(v, 0.35);
    },
    glass_small(v) { glass(v, 16, 0.35, 1.0); },
    glass_large(v) {
      tone(v, { f0: 120, f1: 50, d: 0.15, vol: 0.6, drive: 3 });
      noise(v, { filter: 'highpass', f0: 2500, f1: 5000, d: 0.5, vol: 0.7 });
      glass(v, 40, 1.0, 0.8);
      send(v, 0.3);
    },
    crate_break(v) {
      tone(v, { type: 'triangle', f0: 140, f1: 60, d: 0.15, vol: 0.9, drive: 4 });
      noise(v, { buf: brown, filter: 'lowpass', f0: 1500, f1: 300, d: 0.2, vol: 0.8, drive: 2 });
      for (let i = 0; i < 9; i++) {                                  // splinter cracks
        const at = rand() * 0.22;
        noise(v, { filter: 'bandpass', f0: 600 + rand() * 1600, q: 3, at, d: 0.02 + rand() * 0.04, vol: 0.5 + rand() * 0.4, drive: 3 });
      }
      [240, 410, 620].forEach((f) => noise(v, { filter: 'bandpass', f0: f, q: 12, d: 0.25, vol: 0.6 }));   // wood body
      for (let i = 0; i < 4; i++) noise(v, { filter: 'bandpass', f0: 900 + rand() * 900, q: 4, at: 0.25 + rand() * 0.35, d: 0.04, vol: 0.3 }); // debris
      send(v, 0.15);
    },
    body_fall(v) {
      noise(v, { filter: 'bandpass', f0: 800, f1: 400, q: 0.8, a: 0.03, d: 0.1, vol: 0.2, lin: true });      // cloth
      tone(v, { f0: 95, f1: 38, at: 0.08, d: 0.3, vol: 1, drive: 4 });
      noise(v, { buf: brown, filter: 'lowpass', f0: 500, f1: 150, at: 0.08, d: 0.3, vol: 1, drive: 2 });
      tone(v, { f0: 80, f1: 40, at: 0.24, d: 0.15, vol: 0.45, drive: 2 });                                    // bounce
      noise(v, { buf: brown, filter: 'lowpass', f0: 400, at: 0.24, d: 0.15, vol: 0.5 });
      send(v, 0.12);
    },
    footstep_wet(v) {
      noise(v, { buf: brown, filter: 'lowpass', f0: 380, d: 0.05, vol: 1.1 });                 // heel
      tone(v, { f0: 110, f1: 60, d: 0.04, vol: 0.3 });
      for (let i = 0; i < 3; i++)                                                              // splash droplets
        noise(v, { filter: 'bandpass', f0: 1600 + rand() * 2000, f1: 900, q: 3, at: 0.01 + i * 0.025 + rand() * 0.02, d: 0.05 + rand() * 0.05, vol: 0.25 });
      noise(v, { filter: 'highpass', f0: 2500, at: 0.015, a: 0.01, d: 0.08, vol: 0.12 });
    },
    dodge_whoosh(v) {
      const n = noise(v, { filter: 'bandpass', f0: 250, f1: 1600, q: 1.6, a: 0.16, d: 0.22, vol: 0.6, sweep: 0.18, lin: true });
      const lfo = ctx.createOscillator(), lg = ctx.createGain();     // coat flutter
      lfo.frequency.value = 26; lg.gain.value = 0.25;
      lfo.connect(lg).connect(n.gain.gain);
      lfo.start(v.t); lfo.stop(v.t + 0.45 * v.k);
      noise(v, { buf: brown, filter: 'lowpass', f0: 300, at: 0.3, d: 0.12, vol: 0.5 });       // landing scuff
    },
    pickup(v) {
      noise(v, { filter: 'bandpass', f0: 2600, q: 3, d: 0.02, vol: 0.6, drive: 3 });            // metal clack 1
      tone(v, { type: 'square', f0: 420, f1: 300, d: 0.025, vol: 0.1 });
      noise(v, { filter: 'bandpass', f0: 1900, q: 3, at: 0.09, d: 0.03, vol: 0.7, drive: 3 });  // clack 2
      ring(v, { f: 2100, at: 0.09, d: 0.18, vol: 0.05 });
      tone(v, { f0: 120, f1: 80, at: 0.09, d: 0.06, vol: 0.4 });
    },
    bandage(v) {
      const n = noise(v, { filter: 'bandpass', f0: 1800, f1: 3800, q: 1.5, a: 0.02, d: 0.35, vol: 0.5, lin: true });   // tape rip
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.type = 'square'; lfo.frequency.value = 55; lg.gain.value = 0.3;
      lfo.connect(lg).connect(n.gain.gain);
      lfo.start(v.t); lfo.stop(v.t + 0.4 * v.k);
      noise(v, { filter: 'bandpass', f0: 700, f1: 400, q: 0.7, at: 0.45, a: 0.15, d: 0.4, vol: 0.18, lin: true });   // breath out
    },
    ground_slam(v) {   // a body driven into the floor: a deep boom, the thud of the body, grit and a rattle
      tone(v, { f0: 62, f1: 22, d: 0.7, vol: 1, drive: 9 });
      noise(v, { buf: brown, filter: 'lowpass', f0: 900, f1: 80, d: 0.55, vol: 1.1, drive: 5 });
      tone(v, { f0: 120, f1: 45, d: 0.18, vol: 0.7, drive: 4 });                                              // the body
      noise(v, { filter: 'bandpass', f0: 2200, f1: 700, q: 1, d: 0.05, vol: 0.55, drive: 3 });                // the crack
      for (let i = 0; i < 5; i++) noise(v, { filter: 'bandpass', f0: 1200 + rand() * 1600, q: 5, at: 0.06 + rand() * 0.3, d: 0.03, vol: 0.22 });   // grit
      send(v, 0.35);
    },
    ko_thud(v) {
      tone(v, { f0: 70, f1: 24, d: 0.9, vol: 1, drive: 8 });
      tone(v, { type: 'triangle', f0: 140, f1: 45, d: 0.4, vol: 0.5, drive: 3 });
      noise(v, { buf: brown, filter: 'lowpass', f0: 800, f1: 90, d: 0.7, vol: 1, drive: 4 });
      noise(v, { filter: 'bandpass', f0: 2500, f1: 600, q: 1, d: 0.06, vol: 0.5, drive: 3 });
      tone(v, { type: 'sawtooth', f0: 55, f1: 52, at: 0.1, a: 0.3, d: 1.2, vol: 0.06 });            // low drone after
      send(v, 0.4);
    },
    // voices: a short grunt through two vowel formants ("uh"), with a breath. The hero is low and dry, a goon a little higher and rougher.
    grunt_hero(v) { grunt(v, 98, 0.16, 1); },
    grunt_goon(v) { grunt(v, 128, 0.14, 1.6); },
    grunt_die(v) { grunt(v, 112, 0.42, 2.2, 0.62); },   // a goon's last breath: longer, falling
    heartbeat(v) {   // lub-dub: two muffled low thumps
      for (const [at, f, vol] of [[0, 62, 1], [0.17, 54, 0.7]]) {
        tone(v, { f0: f * 1.4, f1: f, at, a: 0.006, d: 0.16, vol, sweep: 0.05, drive: 1.5 });
        noise(v, { buf: brown, filter: 'lowpass', f0: 160, at, a: 0.005, d: 0.1, vol: vol * 0.7 });
      }
    },
    // the music director: a percussion layer for fights (played on the beat of the track) and a stinger when a fight is won
    perc_kick(v) {
      tone(v, { f0: 120, f1: 42, d: 0.22, vol: 1, drive: 3, sweep: 0.08 });
      noise(v, { buf: brown, filter: 'lowpass', f0: 300, d: 0.06, vol: 0.5 });
    },
    perc_tom(v) {   // a low, dry floor tom
      tone(v, { f0: 150, f1: 92, d: 0.26, vol: 0.8, drive: 2, sweep: 0.1 });
      noise(v, { filter: 'bandpass', f0: 600, q: 1, d: 0.05, vol: 0.25 });
    },
    perc_snare(v) {   // a rim-heavy snare, more crack than body
      noise(v, { filter: 'bandpass', f0: 2200, f1: 1600, q: 0.9, d: 0.12, vol: 0.7, drive: 2 });
      tone(v, { type: 'triangle', f0: 230, f1: 170, d: 0.07, vol: 0.45 });
      send(v, 0.12);
    },
    perc_hat(v) {
      noise(v, { filter: 'highpass', f0: 7000, d: 0.035, vol: 0.4 });
    },
    stinger_clear(v) {   // the fight is won: a deep hit, a minor-key brass stab that swells and fades, a cymbal tail
      tone(v, { f0: 70, f1: 30, d: 0.9, vol: 0.9, drive: 4 });
      noise(v, { filter: 'highpass', f0: 4000, f1: 6000, a: 0.01, d: 1.6, vol: 0.25 });
      for (const [f, at] of [[146.8, 0], [174.6, 0.02], [220, 0.04], [293.7, 0.06]])   // D minor
        tone(v, { type: 'sawtooth', f0: f, at, a: 0.05, d: 1.4, vol: 0.09, drive: 2 });
      ring(v, { f: 880, ratios: [1, 2.01, 3], at: 0.05, d: 1.6, vol: 0.05 });
      send(v, 0.5);
    },
    // ---- Line Zero (docs/levels/02-line-zero.md 9.5): trains, rails, fire, Nero, the Rats' whistles; procedural stand-ins until files exist
    train_hum(v) {   // the rails sing before a train: a low hum that swells, a high whine on top
      tone(v, { type: 'sawtooth', f0: 55, f1: 62, a: 1.2, d: 1.6, vol: 0.22, drive: 2, sweep: 2.8 });
      tone(v, { f0: 880, f1: 1040, a: 1.0, d: 1.4, vol: 0.05, sweep: 2.4 });
      noise(v, { buf: brown, filter: 'lowpass', f0: 160, f1: 260, a: 1.2, d: 1.5, vol: 0.6, lin: true });
      send(v, 0.4);
    },
    train_horn(v) {   // two reeds a fifth apart (D and A), long, with a rough edge
      for (const [f, at] of [[146.8, 0], [220, 0.02]]) tone(v, { type: 'sawtooth', f0: f, f1: f * 0.99, at, a: 0.08, d: 1.3, vol: 0.18, drive: 3, sweep: 1.4 });
      noise(v, { filter: 'bandpass', f0: 600, q: 1.5, a: 0.08, d: 1.2, vol: 0.15, lin: true });
      send(v, 0.6);
    },
    train_clatter(v) {   // the wheels over the rail joints: clickety-clack, wind
      for (const at of [0, 0.09, 0.2, 0.29]) { noise(v, { filter: 'bandpass', f0: 1800, q: 3, at, d: 0.03, vol: 0.5, drive: 3 }); tone(v, { f0: 90, f1: 50, at, d: 0.06, vol: 0.5, drive: 2 }); }
      noise(v, { buf: brown, filter: 'lowpass', f0: 500, d: 0.4, vol: 0.8 });
      noise(v, { filter: 'highpass', f0: 3000, a: 0.1, d: 0.3, vol: 0.1, lin: true });
    },
    rat_whistle_long(v) { tone(v, { f0: 2100, f1: 2350, a: 0.04, d: 0.9, vol: 0.12, sweep: 0.6 }); tone(v, { f0: 2350, f1: 1900, at: 0.6, a: 0.01, d: 0.3, vol: 0.1 }); send(v, 0.5); },
    rat_whistle_short(v) { for (const at of [0, 0.22]) tone(v, { f0: 2200, f1: 2600, at, a: 0.01, d: 0.12, vol: 0.12 }); send(v, 0.5); },
    water_splash(v) { noise(v, { filter: 'bandpass', f0: 1200, f1: 500, q: 1, d: 0.3, vol: 0.8 }); for (let i = 0; i < 6; i++) noise(v, { filter: 'bandpass', f0: 1500 + rand() * 2500, q: 4, at: 0.03 + rand() * 0.25, d: 0.05, vol: 0.25 }); },
    nero_bark(v) {   // a big dog: a short rough woof, then a second
      for (const at of [0, 0.32]) { tone(v, { type: 'sawtooth', f0: 380, f1: 170, at, a: 0.01, d: 0.13, vol: 0.4, drive: 4 }); noise(v, { filter: 'bandpass', f0: 900, f1: 500, q: 2, at, d: 0.12, vol: 0.5 }); }
      send(v, 0.3);
    },
    nero_whine(v) { tone(v, { type: 'triangle', f0: 900, f1: 1300, a: 0.15, d: 0.5, vol: 0.12, sweep: 0.4 }); tone(v, { type: 'triangle', f0: 1300, f1: 800, at: 0.5, a: 0.05, d: 0.4, vol: 0.1 }); },
    nero_growl(v) { tone(v, { type: 'sawtooth', f0: 95, f1: 85, a: 0.1, d: 0.8, vol: 0.25, drive: 5 }); noise(v, { buf: brown, filter: 'bandpass', f0: 300, q: 2, a: 0.1, d: 0.8, vol: 0.5 }); },
    nero_bite(v) { noise(v, { filter: 'bandpass', f0: 1600, q: 2, d: 0.05, vol: 0.7, drive: 3 }); tone(v, { type: 'sawtooth', f0: 160, f1: 120, at: 0.04, a: 0.03, d: 0.5, vol: 0.2, drive: 4 }); },
    lever_clunk(v) { tone(v, { type: 'triangle', f0: 180, f1: 90, d: 0.15, vol: 0.9, drive: 4 }); noise(v, { filter: 'bandpass', f0: 2400, q: 3, d: 0.04, vol: 0.7, drive: 3 }); ring(v, { f: 900, at: 0.02, d: 0.5, vol: 0.1 }); send(v, 0.35); },
    rail_shock(v) {   // the third rail bites: a crackle and a buzz
      for (let i = 0; i < 10; i++) noise(v, { filter: 'highpass', f0: 2500 + rand() * 4000, at: rand() * 0.25, d: 0.015, vol: 0.5, drive: 4 });
      tone(v, { type: 'square', f0: 100, f1: 100, d: 0.4, vol: 0.12, drive: 3 });
    },
    spike_throw(v) { noise(v, { filter: 'bandpass', f0: 1800, f1: 4000, q: 3, a: 0.02, d: 0.12, vol: 0.5 }); ring(v, { f: 3600, at: 0.02, d: 0.15, vol: 0.04 }); },
    fire_bottle(v) { glass(v, 12, 0.3, 0.7); noise(v, { filter: 'lowpass', f0: 800, f1: 2400, at: 0.05, a: 0.1, d: 0.6, vol: 0.6, lin: true }); },
    flare_shot(v) { noise(v, { filter: 'lowpass', f0: 3000, f1: 600, d: 0.15, vol: 0.8, drive: 3 }); noise(v, { filter: 'bandpass', f0: 3000, q: 1, at: 0.05, a: 0.05, d: 0.9, vol: 0.2, lin: true }); },
    fire_ignite(v) { noise(v, { buf: brown, filter: 'lowpass', f0: 300, f1: 1800, a: 0.12, d: 0.9, vol: 1, drive: 2, sweep: 0.4 }); noise(v, { filter: 'bandpass', f0: 900, q: 0.8, a: 0.1, d: 1.0, vol: 0.35, lin: true }); send(v, 0.3); },
    fire_whoosh(v) { noise(v, { filter: 'bandpass', f0: 300, f1: 1500, q: 1, a: 0.08, d: 0.3, vol: 0.6, lin: true }); },
    douse_hiss(v) { noise(v, { filter: 'highpass', f0: 3000, f1: 1500, a: 0.02, d: 0.8, vol: 0.5, lin: true }); },
    breaker_clunk(v) { tone(v, { type: 'square', f0: 120, f1: 60, d: 0.1, vol: 0.5, drive: 3 }); noise(v, { filter: 'bandpass', f0: 1500, q: 3, d: 0.03, vol: 0.6 }); },
    tubes_on(v) { for (let i = 0; i < 4; i++) noise(v, { filter: 'highpass', f0: 4000, at: i * 0.11 + rand() * 0.05, d: 0.02, vol: 0.4 }); tone(v, { f0: 100, f1: 100, at: 0.4, a: 0.2, d: 1.2, vol: 0.05 }); },
    lamp_click(v) { noise(v, { filter: 'bandpass', f0: 3000, q: 4, d: 0.015, vol: 0.6 }); tone(v, { type: 'square', f0: 900, f1: 700, d: 0.02, vol: 0.1 }); },
    bell_ting(v) { ring(v, { f: 1980, ratios: [1, 2.76, 5.4], d: 1.6, vol: 0.12 }); send(v, 0.5); },
    handcar_bell(v) { for (const at of [0, 0.18]) ring(v, { f: 1650, ratios: [1, 2.4, 3.9], at, d: 0.5, vol: 0.12 }); },
    handcar_pump(v) { noise(v, { filter: 'bandpass', f0: 700, f1: 400, q: 2, d: 0.2, vol: 0.5 }); ring(v, { f: 600, at: 0.05, d: 0.3, vol: 0.05 }); },
    handcar_derail(v) { tone(v, { type: 'triangle', f0: 160, f1: 50, d: 0.5, vol: 1, drive: 6 }); for (let i = 0; i < 8; i++) ring(v, { f: 500 + rand() * 1500, at: rand() * 0.4, d: 0.3, vol: 0.05 }); noise(v, { filter: 'highpass', f0: 2000, d: 0.6, vol: 0.4 }); send(v, 0.4); },
    slowmo_in(v) { tone(v, { f0: 400, f1: 90, a: 0.05, d: 0.6, vol: 0.2, sweep: 0.5 }); noise(v, { filter: 'lowpass', f0: 2000, f1: 200, d: 0.6, vol: 0.3 }); },
    slowmo_out(v) { tone(v, { f0: 90, f1: 400, a: 0.05, d: 0.35, vol: 0.18, sweep: 0.3 }); },
    ui_blip(v) {
      tone(v, { type: 'square', f0: 1200, f1: 900, d: 0.04, vol: 0.4 });
      tone(v, { f0: 300, f1: 200, d: 0.03, vol: 0.3 });
      noise(v, { filter: 'bandpass', f0: 3000, q: 2, d: 0.012, vol: 0.6 });
    },
    ui_confirm(v) {
      tone(v, { type: 'sawtooth', f0: 220, d: 0.08, vol: 0.18, drive: 2 });
      tone(v, { type: 'sawtooth', f0: 330, at: 0.07, d: 0.18, vol: 0.18, drive: 2 });
      noise(v, { filter: 'bandpass', f0: 2500, q: 2, d: 0.015, vol: 0.3 });
      tone(v, { f0: 110, at: 0.07, d: 0.2, vol: 0.25 });
      send(v, 0.15);
    },
  };

  function glass(v, shards, len, vol) {
    noise(v, { filter: 'highpass', f0: 3000, d: 0.05, vol: vol * 0.9, drive: 2 });   // impact crack
    for (let i = 0; i < shards; i++) {
      const at = Math.pow(rand(), 1.8) * len, f = 2200 + rand() * 6000;
      tone(v, { f0: f, f1: f * 0.97, at, a: 0.001, d: 0.03 + rand() * 0.12, vol: vol * (0.08 + rand() * 0.12) * (1 - at / len * 0.6) });
      if (i % 3 === 0) noise(v, { filter: 'bandpass', f0: f, q: 6, at, d: 0.04, vol: vol * 0.25 });
    }
  }

  // A vocal grunt: a sawtooth glottal buzz at f0 (falls 25 %), shaped by "uh" formants, with a breath of noise. rough = drive.
  function grunt(v, f0, d, rough, fall = 0.75) {
    const t = v.t, o = ctx.createOscillator(), g = ctx.createGain(), sh = ctx.createWaveShaper();
    o.type = 'sawtooth';
    const f = f0 * (1 + (rand() - 0.5) * 0.12) * v.p;
    o.frequency.setValueAtTime(f * 1.08, t); o.frequency.exponentialRampToValueAtTime(f * fall, t + d * v.k);
    sh.curve = curve(rough);
    env(g, t, 0.55, 0.012 * v.k, d * v.k);
    o.connect(sh).connect(g);
    for (const [ff, q, gv] of [[640, 6, 1], [1150, 8, 0.55], [2500, 10, 0.18]]) {
      const bp = ctx.createBiquadFilter(), bg = ctx.createGain();
      bp.type = 'bandpass'; bp.frequency.value = ff * (0.9 + v.p * 0.1); bp.Q.value = q; bg.gain.value = gv * 2.2;
      g.connect(bp).connect(bg).connect(v.out);
    }
    o.start(t); o.stop(t + d * v.k + 0.05);
    noise(v, { filter: 'bandpass', f0: 1300, f1: 800, q: 1.2, a: 0.01, d: d * 0.8, vol: 0.18 });   // breath
  }

  function play(name, { vol = 1, pan = 0, pitch = 1, when = 0 } = {}) {
    const fn = bank[name];
    if (!fn) { console.warn('sfx: unknown sound', name); return false; }
    const p = pitch * (vary ? 1 + (rand() - 0.5) * 0.06 : 1);
    const out = ctx.createGain();
    out.gain.value = vol * (vary ? 1 + (rand() - 0.5) * 0.12 : 1);
    let node = out;
    if (pan && ctx.createStereoPanner) { const pn = ctx.createStereoPanner(); pn.pan.value = Math.max(-1, Math.min(1, pan)); out.connect(pn); node = pn; }
    node.connect(comp);
    fn({ t: ctx.currentTime + 0.005 + when, out, p, k: 1 / p });
    return true;
  }

  return { play, names: Object.keys(bank), output: master };
}
