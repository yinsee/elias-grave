// Audio manifest: which generated file the game uses for each music id.
// tools/music.py makes 2+ seeds per id (assets/audio/music/<id>_s<seed>.ogg); the director picks one here.
// `alts` lists every candidate so tests/audio.html can audition them.

export const MUSIC_DIR = 'assets/audio/music/';
export const VOICE_DIR = 'assets/audio/voice/';

export const MUSIC = {
  title:          { pick: 'title_s1101',          alts: ['title_s1101', 'title_s1102'],                   loop: true },
  prologue:       { pick: 'prologue_s2101',       alts: ['prologue_s2101', 'prologue_s2102'],             loop: false },
  docks_explore:  { pick: 'docks_explore_s3101',  alts: ['docks_explore_s3101', 'docks_explore_s3102'],   loop: true },
  boss_marchetti: { pick: 'boss_marchetti_s4101', alts: ['boss_marchetti_s4101', 'boss_marchetti_s4102'], loop: true },
};

// Game music cue -> music id. Level data uses 'music:docks_explore' style ids (docs/levels/01-pier9.md 9.3).
// Cues without a file yet fall back to the nearest existing track.
export const MUSIC_CUES = {
  'music:title': 'title',
  'music:prologue': 'prologue',
  'music:docks_explore': 'docks_explore',
  'music:docks_combat': 'docks_explore',      // TODO: own stem
  'music:docks_boss_p1': 'boss_marchetti',
  'music:docks_boss_p2': 'boss_marchetti',    // TODO: own stem
  'music:docks_boss_p3': 'boss_marchetti',    // TODO: own stem
};

export function musicUrl(id, { loop = true, seed } = {}) {
  const m = MUSIC[id];
  if (!m) return null;
  const base = seed ? `${id}_s${seed}` : m.pick;
  return MUSIC_DIR + base + (loop && m.loop ? '.loop.ogg' : '.ogg');
}

export function voiceUrl(id) {
  return VOICE_DIR + id + '.ogg';
}
