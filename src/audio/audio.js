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
  musicLP.connect(duck).connect(bus.music);

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
      cur = { src, g };
    },
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
    const offs = [
      events.on('hit', (p = {}) => sfx.play(p.blade ? 'blade_hit' : p.power > 1 ? 'punch_heavy' : 'punch_light', { pan: pan(p) })),
      events.on('hurt', (p = {}) => sfx.play(p.heavy ? 'punch_heavy' : 'punch_light', { pan: pan(p), vol: 0.9 })),
      events.on('ko', () => sfx.play('ko_thud')),
      events.on('kill', (p = {}) => sfx.play('body_fall', { pan: pan(p.enemy), when: 0.25 })),
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
