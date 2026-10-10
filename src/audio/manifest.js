// Audio manifest: which generated file the game uses for each music id.
// tools/music.py makes 2+ seeds per id (assets/audio/music/<id>_s<seed>.ogg); the director picks one here.
// `alts` lists every candidate so tests/audio.html can audition them.

export const MUSIC_DIR = 'assets/audio/music/';
export const VOICE_DIR = 'assets/audio/voice/';

export const MUSIC = {
  title:          { pick: 'title_s1101',          alts: ['title_s1101', 'title_s1102'],                   loop: true },
  prologue:       { pick: 'prologue_s2102',       alts: ['prologue_s2102', 'prologue_s3101'],             loop: false },
  docks_explore:  { pick: 'docks_explore_s3101',  alts: ['docks_explore_s3101', 'docks_explore_s3102'],   loop: true },
  boss_marchetti: { pick: 'boss_marchetti_s4101', alts: ['boss_marchetti_s4101', 'boss_marchetti_s5102'], loop: true },
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
  // Line Zero (docs/levels/02-line-zero.md 9.4): no files yet; the nearest existing tracks stand in
  'music:metro': 'docks_explore',             // TODO: D minor drone, drips, a far trumpet
  'music:metro_fight': 'docks_explore',       // TODO
  'music:metro_radio': 'prologue',            // TODO: a French jazz ballad on a crackly radio
  'music:tinder': 'boss_marchetti',           // TODO
  'music:switch': 'boss_marchetti',           // TODO: 152 bpm punk-industrial, train-rhythm drums
  'music:switch_p3': 'boss_marchetti',        // TODO: the countdown riser
  'music:metro_outro': 'prologue',            // TODO: solo trumpet, rain, a far train
  // The Leviathan (docs/levels/04-leviathan.md 9.4): no files yet; the nearest existing tracks stand in
  'music:aquarium': 'docks_explore',          // TODO: cello drone, sonar ping, whale-song pad
  'music:aquarium_combat': 'docks_explore',   // TODO: muffled kick and toms
  'music:aquarium_flood': 'docks_explore',    // TODO: the rising pad, the alarm bell motif
  'music:aquarium_teague': 'boss_marchetti',  // TODO: heavy, slow, chain-rattle percussion
  'music:kalt': 'boss_marchetti',             // TODO: kalt_p1..p3: low strings and a fog-horn brass
  'music:aquarium_outro': 'prologue',         // TODO: piano and rain, cut short by the gunshot
  // House Always Wins (docs/levels/03-house-always-wins.md 9.4): no files yet; the nearest existing tracks stand in
  'music:casino': 'docks_explore',            // TODO: slow lounge jazz (upright bass, brushed drums, a tired piano)
  'music:casino_fight': 'docks_explore',      // TODO: baritone sax and toms
  'music:casino_terrace': 'prologue',         // TODO: rain and a muted trumpet from a radio
  'music:cooler': 'boss_marchetti',           // TODO: a short heavy loop (bass and kick)
  'music:brask_hall': 'boss_marchetti',       // TODO: tango with harpsichord
  'music:brask_wheel': 'boss_marchetti',      // TODO: tango, bandoneon, ball-clatter percussion
  'music:brask_allin': 'boss_marchetti',      // TODO: strings join, tempo up
  'music:casino_end': 'prologue',             // TODO: solo piano over rain
  // The Palm House (docs/levels/06-palm-house.md 9.4): no files yet; the nearest existing tracks stand in
  'music:palmhouse': 'prologue',              // TODO: stems waltz (the quartet), combat, orchids, roof
  'music:boss_vane': 'boss_marchetti',        // TODO: a military march under a choir
  'music:palmhouse_outro': 'prologue',        // TODO: one violin, the waltz, slow and broken
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
