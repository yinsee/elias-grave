// Level 5, "St. Cecilia" (docs/levels/05-st-cecilia.md): the level module. Level id `hospital`.
//   data.js   the map, the Orderlies, the waves, the defends, drops, sedation, the oxygen tanks, the lights' numbers
//   paint.js  the art (the static layer, the per-frame painters, the beds and gurneys)
//   run.js    the run (createHospital(G): the hooks the game calls)
//   three.js  the 3D view's blocks
// Bosses: src/bosses/porter.js (mini-boss), src/bosses/krieg.js (boss).
export * from './data.js';
export { paint, drawWorld, drawFx, drawBed, drawGurney, HC } from './paint.js';
export { createHospital } from './run.js';
export { hospital3d } from './three.js';
export { PORTER } from '../../bosses/porter.js';
export { KRIEG } from '../../bosses/krieg.js';
export const LEVEL = { id: 'hospital', title: 'St. Cecilia', order: 5, unlock: 'ch6', bossDialog: 'krieg_intro', intro: 'hospital_intro', outro: 'hospital_outro' };
