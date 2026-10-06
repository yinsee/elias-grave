// Game audio runtime: one AudioContext, three buses (music, sfx, voice), and a binder to the event bus
// (docs/architecture.md 2.5). The simulation never calls audio directly: it emits events, audio listens.
//
//   import { createAudio } from './audio/audio.js';
//   const audio = createAudio();
//   window.addEventListener('pointerdown', () => audio.unlock(), { once: true });   // browsers need a gesture
//   const off = audio.bind(bus, { panOf: (x) => (x - present.cam.x) / present.cam.vw * 2 - 1 });
//   audio.music.play('docks_explore');   audio.voice.play('marchetti_intro_01');   audio.sfx.play('shotgun');

import { createSfx } from './sfx.js';
import { MUSIC, MUSIC_CUES, musicUrl, voiceUrl } from './manifest.js';

// the hero's kicks (src/sim/hero/moves.js ids; ks*, kw, kh, kair are katana moves, not kicks)
const KICK = /^(lk|hk|airkick|sweep|slk)/, HEAVY_KICK = /^(hk|sweep)/;

export function createAudio({ base = '', ctx = new (window.AudioContext || window.webkitAudioContext)() } = {}) {
  const master = ctx.createGain();
  master.connect(ctx.destination);
  const bus = {};
  for (const name of ['music', 'sfx', 'voice']) { bus[name] = ctx.createGain(); bus[name].connect(master); }
  bus.music.gain.value = 0.7;

  // Music runs through a low-pass so slow motion can close it.
  const musicLP = ctx.createBiquadFilter();
  musicLP.type = 'lowpass'; musicLP.frequency.value = 20000;
  const duck = ctx.createGain();
  // the music director's layer (director.js): the state filter and level on the track, and a percussion input under it.
  // Both go through the voice duck, so a voice line ducks the drums too.
  const layerLP = ctx.createBiquadFilter(), layerGain = ctx.createGain(), percIn = ctx.createGain();
  layerLP.type = 'lowpass'; layerLP.frequency.value = 20000;
  musicLP.connect(layerLP).connect(layerGain).connect(duck).connect(bus.music);
  percIn.connect(duck);

  const sfx = createSfx(ctx, { destination: bus.sfx });

  // ---- buffers (decoded once, kept)
  const cache = new Map();
  function load(url) {
    if (!cache.has(url))
      cache.set(url, fetch(base + url).then((r) => { if (!r.ok) throw new Error(`${r.status} ${url}`); return r.arrayBuffer(); })
        .then((b) => ctx.decodeAudioData(b)).catch((e) => { cache.delete(url); throw e; }));
    return cache.get(url);
  }

  // ---- music: one track at a time, cross-faded
  let cur = null, slow = false;
  const music = {
    id: null,
    async play(idOrCue, { loop = true, fade = 1.5, seed } = {}) {
      const id = MUSIC_CUES[idOrCue] || idOrCue;
      if (!MUSIC[id]) { console.warn('audio: unknown music', idOrCue); return; }
      if (music.id === id && cur) return;
      music.id = id;
      const buf = await load(musicUrl(id, { loop, seed }));
      if (music.id !== id) return;              // another play() won the race
      music.stop(fade);
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = buf; src.loop = loop && MUSIC[id].loop;
      src.playbackRate.value = slow ? 2 / 3 : 1;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(1, ctx.currentTime + fade);
      src.connect(g).connect(musicLP);
      src.start();
      cur = { src, g, buf, t0: ctx.currentTime, loop: src.loop };
    },
    // what plays now, for the director's beat clock: { buf, t0 (ctx time at its start), loop }; null when nothing plays
    get now() { return cur ? { id: music.id, buf: cur.buf, t0: cur.t0, loop: cur.loop } : null; },
    get slow() { return slow; },
    layer: { lp: layerLP, gain: layerGain, perc: percIn },
    stop(fade = 1.5) {
      if (!cur) return;
      const { src, g } = cur, t = ctx.currentTime;
      g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + fade);
      src.stop(t + fade + 0.05);
      cur = null;
    },
    // Slow motion: the score drops a fifth (rate 2/3) and closes a low-pass (docs/levels/01-pier9.md 1).
    slowmo(on) {
      slow = on;
      const t = ctx.currentTime;
      musicLP.frequency.setTargetAtTime(on ? 900 : 20000, t, 0.15);
      if (cur) cur.src.playbackRate.setTargetAtTime(on ? 2 / 3 : 1, t, 0.12);
    },
  };

  // ---- voice: one line at a time; music ducks under it
  let line = null;
  const voice = {
    async play(id, { vol = 1, pan = 0 } = {}) {
      voice.stop();
      const buf = await load(voiceUrl(id));
      const src = ctx.createBufferSource(), g = ctx.createGain(), p = ctx.createStereoPanner();
      src.buffer = buf; g.gain.value = vol; p.pan.value = pan;
      src.connect(g).connect(p).connect(bus.voice);
      duck.gain.setTargetAtTime(0.35, ctx.currentTime, 0.08);
      src.onended = () => { if (line === src) { line = null; duck.gain.setTargetAtTime(1, ctx.currentTime, 0.4); } };
      src.start();
      line = src;
      return new Promise((res) => src.addEventListener('ended', res));
    },
    stop() { if (line) { try { line.stop(); } catch (e) { /* already stopped */ } line = null; } },
  };

  function setVolume(name, v) { (name === 'master' ? master : bus[name]).gain.value = v; }
  function unlock() { return ctx.state === 'suspended' ? ctx.resume() : Promise.resolve(); }

  // ---- event bus binding. Payload fields follow docs/architecture.md 2.5; unknown fields are ignored.
  function bind(events, { panOf = () => 0, sectionMusic = {} } = {}) {
    const pan = (p) => (p && typeof p.x === 'number' ? Math.max(-1, Math.min(1, panOf(p.x))) : 0);
    // A shotgun blast hits a body with several pellets in one step: one bullet sound per target. The sim sends every pellet
    // in the same task, so the set clears in a microtask after it.
    const shotNow = new Set();
    const shotOnce = (k) => {
      if (shotNow.has(k)) return false;
      if (!shotNow.size) queueMicrotask(() => shotNow.clear());
      shotNow.add(k); return true;
    };
    // hit: the sound tells the result. outcome (clean | blocked | caught) and move (the hero's move id) are optional:
    // without them every hit plays as a clean blow.
    const hitSound = (p) => {
      const o = { pan: pan(p) }, heavy = p.power > 1, mv = typeof p.move === 'string' ? p.move : '';
      if (p.by === 'shot') return shotOnce(p.target ?? p.x) && sfx.play('bullet_flesh', o);
      if (p.outcome === 'blocked') return sfx.play('block', { ...o, pitch: heavy ? 0.8 : 1 });
      if (p.outcome === 'caught') return sfx.play('guard_catch', o);
      if (p.blade) return sfx.play('blade_hit', { ...o, pitch: heavy ? 0.85 : 1 });
      if (KICK.test(mv)) return sfx.play(heavy || HEAVY_KICK.test(mv) ? 'kick_heavy' : 'kick_light', o);
      return sfx.play(heavy ? 'punch_heavy' : 'punch_light', o);
    };
    // grunts: the hero on every blow he takes; a goon on a heavy blow and on every other light one (never two at once)
    let gruntT = -9, lightN = 0;
    const grunt = (name, p, o) => { const t = ctx.currentTime; if (t - gruntT < 0.16) return; gruntT = t; sfx.play(name, { pan: pan(p), ...o }); };
    const goonGrunt = (p) => {
      if (p.outcome !== 'clean' || !p.target || typeof p.target !== 'object' || p.by === 'enemy') return;
      if (p.power <= 1 && (lightN++ & 1)) return;
      grunt('grunt_goon', p, { vol: p.power > 1 ? 0.8 : 0.55, pitch: p.isBoss ? 0.7 : 1, when: 0.02 });
    };
    // the parry ring: a 'parry' event and a 'parry' feat for the same parry ring once
    let parryT = -9;
    const parryRing = (p) => { const t = ctx.currentTime; if (t - parryT < 0.08) return; parryT = t; sfx.play('parry_ring', { pan: pan(p) }); };
    const featName = (f) => String(f && typeof f === 'object' ? f.name || f.feat || f.id || '' : f || '').toLowerCase().replace(/[^a-z]/g, '');
    const offs = [
      events.on('hit', (p = {}) => { hitSound(p); goonGrunt(p); }),
      events.on('hurt', (p = {}) => {
        sfx.play(p.heavy ? 'punch_heavy' : 'punch_light', { pan: pan(p), vol: 0.9 });
        grunt('grunt_hero', p, { vol: p.heavy ? 0.9 : 0.6, pitch: p.outcome === 'ko' ? 0.85 : 1, when: 0.02 });
      }),
      events.on('parry', (p = {}) => parryRing(p)),
      events.on('feat', (f) => { if (featName(f) === 'parry') parryRing(f && typeof f === 'object' ? f : null); }),
      events.on('ko', () => sfx.play('ko_thud')),
      events.on('kill', (p = {}) => {   // the kill confirm under the last blow, then the body hits the floor
        sfx.play('kill_confirm', { pan: pan(p), vol: p.isBoss ? 1 : 0.7, pitch: p.isBoss ? 0.75 : 1 });
        sfx.play('body_fall', { pan: pan(p.enemy), when: 0.25 });
        sfx.play('grunt_die', { pan: pan(p), vol: 0.6, pitch: p.isBoss ? 0.62 : 1, when: 0.04 });
      }),
      events.on('pickup', (p = {}) => sfx.play(p.kind === 'bandage' ? 'bandage' : 'pickup')),
      events.on('glass:break', (p = {}) => sfx.play((p.pane && p.pane.w * p.pane.h > 2400) ? 'glass_large' : 'glass_small', { pan: pan(p) })),
      events.on('object:break', (p = {}) => sfx.play('crate_break', { pan: pan(p) })),
      events.on('sfx', (p = {}) => sfx.play(p.name, { pan: pan(p), vol: p.vol, pitch: p.pitch })),     // generic: emit('sfx', {name, x})
      events.on('music', (p = {}) => (p.id ? music.play(p.id, p) : music.stop(p.fade))),               // generic: emit('music', {id})
      events.on('section:enter', (p = {}) => sectionMusic[p.to] && music.play(sectionMusic[p.to])),
      events.on('boss:intro', (p = {}) => p.music && music.play(p.music)),
      events.on('boss:defeated', () => music.stop(2.5)),
      events.on('dialog:line', (p = {}) => p.voice && voice.play(p.voice)),
      events.on('cutscene:start', (p = {}) => p.music && music.play(p.music, { loop: false })),
      events.on('slowmo:start', () => music.slowmo(true)),
      events.on('slowmo:end', () => music.slowmo(false)),
    ];
    return () => offs.forEach((off) => off && off());
  }

  return { ctx, sfx, music, voice, bind, unlock, setVolume, load, buses: bus };
}
