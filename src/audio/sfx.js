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
    kick_light(v) {
      noise(v, { filter: 'bandpass', f0: 500, f1: 1800, q: 1.5, a: 0.04, d: 0.03, vol: 0.25, lin: true });   // leg swish
      v = { ...v, t: v.t + 0.06 * v.k };
      tone(v, { f0: 140, f1: 45, d: 0.12, vol: 0.95, drive: 3 });
      noise(v, { buf: brown, filter: 'lowpass', f0: 700, d: 0.09, vol: 0.9, drive: 2 });
      noise(v, { filter: 'bandpass', f0: 1800, q: 1, d: 0.025, vol: 0.4 });
    },
    kick_heavy(v) {
      noise(v, { filter: 'bandpass', f0: 300, f1: 1400, q: 1.2, a: 0.08, d: 0.04, vol: 0.35, lin: true });
      v = { ...v, t: v.t + 0.1 * v.k };
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
    ko_thud(v) {
      tone(v, { f0: 70, f1: 24, d: 0.9, vol: 1, drive: 8 });
      tone(v, { type: 'triangle', f0: 140, f1: 45, d: 0.4, vol: 0.5, drive: 3 });
      noise(v, { buf: brown, filter: 'lowpass', f0: 800, f1: 90, d: 0.7, vol: 1, drive: 4 });
      noise(v, { filter: 'bandpass', f0: 2500, f1: 600, q: 1, d: 0.06, vol: 0.5, drive: 3 });
      tone(v, { type: 'sawtooth', f0: 55, f1: 52, at: 0.1, a: 0.3, d: 1.2, vol: 0.06 });            // low drone after
      send(v, 0.4);
    },
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
