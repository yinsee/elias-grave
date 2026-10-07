// Level 2, "Line Zero" (docs/levels/02-line-zero.md): the level module. Level id `metro`.
//   data.js   the map, the Tunnel Rats, the waves, drops, trains, fire, the third rail, Nero's numbers
//   paint.js  the art (the static layer, the per-frame painters, the train cars)
//   run.js    the run (createMetro(G): the hooks the game calls)
//   three.js  the 3D view's blocks and models (trains, the handcar)
// Bosses: src/bosses/tinder.js (mini-boss), src/bosses/switch.js (boss).
export * from './data.js';
export { paint, drawWorld, drawFx, drawTrain, drawHandcar, carPx, trainCars, text, MC } from './paint.js';
export { createMetro } from './run.js';
export { TINDER } from '../../bosses/tinder.js';
export { SWITCH } from '../../bosses/switch.js';
export const LEVEL = { id: 'metro', title: 'Line Zero', order: 2, unlock: 'ch3', bossDialog: 'switch_intro', intro: 'metro_intro', outro: 'metro_outro' };
