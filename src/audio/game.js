// The game's audio: one runtime (audio.js) bound to the game's event bus (core/events.js).
//
//   import { gameAudio } from './audio/game.js';
//   gameAudio.playMusic('boss_marchetti');            // a music id or cue ('music:docks_boss_p1'); opts { volume, loop, fade }
//   gameAudio.stopMusic(2);                           // fade out over 2 s
//   await gameAudio.voice('marchetti_intro_01');      // resolves when the line ends (at once while audio is locked)
//   gameAudio.sfx('glass_large', { x });              // any sfx.js sound; x = a world x for the pan
//   gameAudio.setVolume(0.8);                         // master volume 0..1
//   gameAudio.slowmo(true);                           // the music drops a fifth and closes a low-pass
//
// Also on window.gameAudio, for code that is not a module (tests, the console).
// Browsers start audio only after a user gesture: install() unlocks on the first key or pointer press.
// Before that, nothing is created: no AudioContext, no listeners, no sound. A music request made before the unlock
// (the title theme) is kept and starts at the unlock. The audio never reads or changes the game state, and it never
// uses Math.random (sfx.js has its own generator), so the autotest hashes do not depend on it.

import { createAudio } from './audio.js';
import { bus } from '../core/events.js';

const MUSIC_GAIN = 0.7;   // the music bus level at volume 1 (audio.js default)

let rt = null, offs = [], panOf = () => 0, master = 0.8, want = null, lastMg = -9;

function sfxOpts(p, o = {}) {
  const x = p && typeof p.x === 'number' ? p.x : null;
  return { ...o, pan: x == null ? 0 : Math.max(-1, Math.min(1, panOf(x))) };
}

// boss tells ('boss:tell' {move}, and the conveyor's 'boss:telegraph' 'tuna'): move -> [sound, options]. Each boss move has a sound
// with its pose and its white flash (there are no signs over him)
const TELL = {
  roar: ['boss_roar', { vol: 0.9 }],
  charge: ['tell_charge', { vol: 0.9 }],
  shoulder: ['tell_charge', { vol: 0.9, pitch: 0.85 }],
  jslam: ['tell_jslam', { vol: 0.9 }],
  slam: ['tell_jslam', { vol: 0.7, pitch: 1.2 }],
  hook: ['chain_spin', { vol: 0.8 }],
  tuna: ['tuna_creak', { vol: 0.8 }],
  tunaBat: ['tuna_creak', { vol: 0.7, pitch: 1.3 }],
  iceSmash: ['tell_jslam', { vol: 0.75, pitch: 0.8 }],
  jab: ['grunt_goon', { vol: 0.45, pitch: 0.8 }],
  lunge: ['grunt_goon', { vol: 0.6, pitch: 0.7 }],
  cleaver: ['grunt_goon', { vol: 0.5, pitch: 0.65 }],
  overhead: ['grunt_goon', { vol: 0.8, pitch: 0.55 }],
  cleaverHeavy: ['grunt_goon', { vol: 0.8, pitch: 0.5 }],
  grab: ['grunt_goon', { vol: 0.75, pitch: 0.6 }],
  shove: ['grunt_goon', { vol: 0.6, pitch: 0.9 }],
  sweep: ['dodge_whoosh', { vol: 0.8, pitch: 0.5 }],
  lever: ['tuna_creak', { vol: 0.6, pitch: 0.6 }],
  hookPull: ['hook_clank', { vol: 0.8, pitch: 0.7 }],
};

// game sounds for events audio.js does not map itself (it maps hit, hurt, ko, kill, pickup, glass/object:break, music, voice)
function bindGame(a) {
  const play = (name, p, o) => a.sfx.play(name, sfxOpts(p, o));
  return [
    bus.on('roll', (p) => play('dodge_whoosh', p, { vol: p.air ? 0.5 : 0.7 })),
    bus.on('swing', (p) => {
      if (p.blade) play('blade_slash', p, { vol: p.heavy ? 0.9 : 0.7, pitch: p.heavy ? 0.85 : 1 });
      else if (p.move !== 'tw') play('dodge_whoosh', p, { vol: p.heavy ? 0.35 : 0.2, pitch: p.heavy ? 1.1 : 1.5 });
    }),
    bus.on('shot', (p) => {
      if (p.by === 'enemy') return p.w === 'shotgun' ? play('shotgun', p, { vol: 0.6 }) : play('pistol', p, { vol: 0.7 });   // a goon's gun
      if (p.w === 'shotgun') return play('shotgun', p);
      const t = a.ctx.currentTime;   // the machine gun: one burst sound covers several rounds
      if (t - lastMg > 0.3) { lastMg = t; play('mg_burst', p, { vol: 0.8 }); }
    }),
    bus.on('step', (p) => play('footstep_wet', p, { vol: p.run ? 0.55 : 0.35, pitch: p.wet ? 1 : 1.25 })),
    bus.on('land', (p) => play('footstep_wet', p, { vol: p.heavy ? 1 : 0.6, pitch: p.heavy ? 0.7 : 0.85 })),
    bus.on('boss:telegraph', (p) => {   // a sound for each wind-up (an unknown move: a low blip)
      const s = TELL[p.move];
      if (s) play(s[0], p, s[1]); else play('ui_blip', p, { vol: 0.5, pitch: 0.7 });
    }),
    bus.on('boss:tell', (p) => { const s = TELL[p.move]; if (s) play(s[0], p, s[1]); }),   // a boss move's tell (tunaBack: the hit carries it)
    bus.on('hook:clank', (p) => play('hook_clank', p)),   // Marchetti's hook stops on a prop
    bus.on('slam', (p) => play('ground_slam', p, { vol: p.fin ? 1 : 0.85 })),   // the clinch's ground slam
    bus.on('run:over', () => play('ui_confirm', null, { vol: 0.6 })),
  ];
}

function ensure() {
  if (rt) return rt;
  rt = createAudio();
  rt.setVolume('master', master);
  offs = [rt.bind(bus, { panOf: (x) => panOf(x) }), ...bindGame(rt)];
  return rt;
}

function startWanted() {
  if (!rt || !want) return;
  rt.buses.music.gain.value = MUSIC_GAIN * want.volume;
  rt.music.play(want.id, want.opts).catch((e) => console.warn('audio: music', want && want.id, e));
}

export const gameAudio = {
  get ctx() { return rt ? rt.ctx : null; },
  get unlocked() { return !!rt && rt.ctx.state === 'running'; },
  get runtime() { return rt; },   // the audio.js runtime (null before the unlock): the music director shapes its music layer
  // panOf(x): a world x to a pan -1..1 (the game passes its camera)
  configure(opts = {}) { if (opts.panOf) panOf = opts.panOf; if (opts.volume != null) gameAudio.setVolume(opts.volume); },
  // call on a user gesture; safe to call often
  unlock() {
    const first = !rt;
    const a = ensure();
    return a.unlock().then(() => { if (first) startWanted(); });
  },
  // unlock on the first key or pointer press (keeps listening until the context runs)
  install(target = window) {
    const go = () => { gameAudio.unlock().then(() => { if (rt && rt.ctx.state === 'running') for (const t of ['keydown', 'pointerdown']) target.removeEventListener(t, go, true); }); };
    for (const t of ['keydown', 'pointerdown']) target.addEventListener(t, go, true);
  },
  playMusic(id, { volume = 1, loop = true, fade = 1.5 } = {}) {
    want = { id, volume, opts: { loop, fade } };
    if (rt) startWanted();
  },
  stopMusic(fade = 1.5) { want = null; if (rt) rt.music.stop(fade); },
  get musicId() { return want ? want.id : null; },
  voice(id, opts) { return rt ? rt.voice.play(id, opts).catch((e) => console.warn('audio: voice', id, e)) : Promise.resolve(); },
  stopVoice() { if (rt) rt.voice.stop(); },
  sfx(name, opts = {}) { if (rt) rt.sfx.play(name, sfxOpts(opts, opts)); },
  slowmo(on) { if (rt) rt.music.slowmo(on); },
  setVolume(v) { master = Math.max(0, Math.min(1, v)); if (rt) rt.setVolume('master', master); },
  getVolume() { return master; },
  // unbind and close (tests)
  dispose() { offs.forEach((off) => off && off()); offs = []; if (rt) rt.ctx.close(); rt = null; },
};

if (typeof window !== 'undefined') window.gameAudio = gameAudio;
