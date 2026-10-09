// Level 6, "The Palm House" (docs/levels/06-palm-house.md): the level module. Level id `palmhouse`.
//   data.js   the map, the Blue Choir, the waves, the snipers, the set pieces' numbers
//   paint.js  the art (the static layer, the per-frame painters)
//   set.js    the set pieces (glass, roof shards, snipers, towers, chandeliers, steam, statues, wet zones, snow)
//   run.js    the run (createPalmhouse(G): the hooks the game calls)
//   three.js  the 3D view's blocks
// Bosses: src/bosses/brandt.js (mini-boss), src/bosses/vane.js (boss).
export * from './data.js';
export { paint, drawWorld, drawFx, PC } from './paint.js';
export { createPalmhouse } from './run.js';
export { palmhouse3d } from './three.js';
export { BRANDT } from '../../bosses/brandt.js';
export { VANE } from '../../bosses/vane.js';
export const LEVEL = { id: 'palmhouse', title: 'The Palm House', order: 6, unlock: 'ch7', bossDialog: 'vane_intro', intro: 'palmhouse_intro', outro: 'palmhouse_outro' };
