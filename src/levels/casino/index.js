// Level 3, "House Always Wins" (docs/levels/03-house-always-wins.md): the level module. Level id `casino`.
//   data.js   the map, the House, the waves, drops, the set pieces' numbers
//   paint.js  the art (the static layer, the per-frame painters: mirrors and their reflections, chandeliers, the wheel)
//   run.js    the run (createCasino(G): the hooks the game calls)
//   three.js  the 3D view's blocks
// Bosses: src/bosses/cooler.js (mini-boss), src/bosses/brask.js (boss).
export * from './data.js';
export { paint, drawWorld, drawFloor, drawGround, drawFx, figure, pocketAt, pocketCol, CC } from './paint.js';
export { createCasino } from './run.js';
export { COOLER } from '../../bosses/cooler.js';
export { BRASK } from '../../bosses/brask.js';
export const LEVEL = { id: 'casino', title: 'House Always Wins', order: 3, unlock: 'ch4', intro: 'casino_intro', outro: 'casino_outro', bossDialog: 'brask_intro' };
