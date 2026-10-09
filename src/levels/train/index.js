// Level 7, "The Last Train" (docs/levels/07-last-train.md): the level module. Level id `train`.
//   data.js   the map (the cars folded into 2800 px), the Ushers, the waves, the sweepers, the wind, falls, drops
//   paint.js  the art (the static layer; the moving backdrop, the cars, the props live; the gantries, tunnels and glass over the scene)
//   run.js    the run (createTrain(G): the hooks the game calls)
//   three.js  the 3D view's blocks
// Bosses: src/bosses/grau.js (mini-boss), src/bosses/lenz.js (boss).
export * from './data.js';
export { paint, drawWorld, drawFx, TC } from './paint.js';
export { createTrain } from './run.js';
export { train3d } from './three.js';
export { GRAU } from '../../bosses/grau.js';
export { LENZ } from '../../bosses/lenz.js';
export const LEVEL = { id: 'train', title: 'The Last Train', order: 7, unlock: 'ch8', bossDialog: 'lenz_intro', intro: 'train_intro', outro: 'train_outro' };
