// goon looks, builds, roles and base stats
export const EPAL = {
  skins: [['#e0b892', '#b48b68'], ['#cf9d74', '#a07552'], ['#ad7c5c', '#80583f'], ['#86604a', '#634333']],
  hair: ['#2c1f18', '#4e3322', '#6e4c2c', '#24242c', '#8c867a', '#7a3a22'],
  loud: ['#d8483a', '#5cb04e', '#8e6ad8', '#e0b040'],
  shoe: '#1b1b22', steel: '#c9d2dc', steelD: '#7d8794', grip: '#5a3a26', iron: '#8a8f99', gun: '#767b8c', scar: '#e8a49a', glove: '#2e2a30',
};
// build: s = height, bw = bulk (limb and torso width), hk = head size
export const BUILD = { lean: { s: 1, bw: 0.85, hk: 0.95, spd: 1.1, hp: 0.9 }, stocky: { s: 0.95, bw: 1.3, hk: 1.06, spd: 0.9, hp: 1.15 },
  tall: { s: 1.1, bw: 0.95, hk: 1, spd: 1, hp: 1 }, buff: { s: 1.25, bw: 1.6, hk: 1.04, spd: 1, hp: 1 } };
// outfits: top = torso cut, hair = head top, beards = picked per goon; cols = [top, top shade] pairs, pants
export const LOOK = {
  leather: { build: 'stocky', top: 'jacket', hair: ['short', 'bald'], beards: ['full', 'stubble', 'chin', 'stache'], cols: [['#8a5634', '#653d24'], ['#5e5a66', '#45414c']], pants: ['#4a5a7c', '#4a4a3c'] },
  hood: { build: 'lean', top: 'hood', hair: ['hood'], beards: ['stubble', 'goatee', 'chin', 'none'], cols: [['#5f826c', '#46604f'], ['#727488', '#545669'], ['#8e5252', '#6a3a3a']], pants: ['#3e3e4e', '#4a4a3c'] },
  vest: { build: 'tall', top: 'vest', hair: ['mohawk', 'short'], beards: ['goatee', 'chin', 'stache', 'full'], cols: [['#6a80a6', '#4d5d7c'], ['#82603e', '#5f452c']], pants: ['#363c4c', '#544838'] },
  coat: { build: 'tall', top: 'coat', hair: ['cap', 'short'], beards: ['stache', 'full', 'goatee'], cols: [['#50608e', '#3a466c'], ['#82404e', '#5e2e39'], ['#5a6860', '#424d47']], pants: ['#30303c'] },
  tank: { build: 'stocky', top: 'tank', hair: ['bald', 'short'], beards: ['chin', 'full', 'goatee', 'stache'], cols: [['#cdc6b2', '#a6a08c'], ['#b8423e', '#8c302d']], pants: ['#4a5a7c', '#5c5242'] },
  boss: { build: 'buff', top: 'tank', hair: ['bald'], beards: ['huge'], cols: [['#4c3c5e', '#382b46']], pants: ['#302440'] },
};
// roles: what a goon fights with. ranged = [near, far] range it keeps; aim = tell time before the shot
export const ROLE = {
  brawler: { reach: 17, dmg: 8, heavyDmg: 14, windup: 0.22, hp: 50, looks: ['tank', 'leather'], cmb: [['jab'], ['punch'], ['jab', 'jab'], ['jab', 'punch'], ['jab', 'jab', 'punch']] },
  knife: { reach: 20, dmg: 9, heavyDmg: 13, windup: 0.16, hp: 45, w: 'knife', len: 5, off: -0.2, looks: ['hood'], cmb: [['stab'], ['stab', 'stab'], ['stab', 'slash'], ['slash', 'stab', 'stab']] },
  pipe: { reach: 24, dmg: 10, heavyDmg: 17, windup: 0.3, hp: 60, w: 'pipe', len: 10, off: -1.1, looks: ['leather', 'vest'], cmb: [['chop'], ['hchop'], ['chop', 'chop']] },
  machete: { reach: 23, dmg: 11, heavyDmg: 16, windup: 0.24, hp: 55, w: 'machete', len: 9, off: -1.1, looks: ['vest'], cmb: [['slash'], ['slash', 'chop'], ['hchop'], ['chop', 'slash']] },
  thrower: { reach: 17, dmg: 6, heavyDmg: 10, windup: 0.22, hp: 45, w: 'tknife', len: 4, off: -0.2, ranged: [60, 115], shot: 6, aim: 0.45, looks: ['hood', 'coat'], cmb: [['jab']] },
  pistol: { reach: 17, dmg: 6, heavyDmg: 10, windup: 0.22, hp: 45, w: 'pistol', len: 4.5, off: 0, ranged: [75, 135], shot: 7, aim: 0.6, looks: ['coat'], cmb: [['jab']] },
};
// difficulty: stage 1 bare hands, then hand weapons, knife throwers, pistols, mixed squads; the boss calls in tougher help over time
export const ZROLES = { 1: ['brawler', 'brawler'], 2: ['brawler', 'knife', 'brawler'], 3: ['knife', 'thrower', 'pipe'], 4: ['machete', 'pistol', 'thrower', 'brawler'], 5: ['pistol', 'pipe', 'thrower', 'machete'] };
export const AROLES = ['brawler', 'knife', 'brawler', 'thrower', 'pipe', 'knife', 'pistol', 'machete'], AMIX = ['knife', 'pipe', 'machete', 'thrower', 'pistol', 'brawler'];
// s = size; poise = damage needed to stagger; cd = seconds between attacks
export const ETYPE = {
  goon: { s: 1, hp: 50, m: 1, speed: 30, reach: 17, dmg: 8, heavyDmg: 14, cd: [0.9, 1.7], poise: 0, windup: 0.22 },
  boss: { s: 1.25, hp: 780, hpD: [600, 780, 950, 1150], m: 6, speed: 27, reach: 22, dmg: 22, heavyDmg: 30, cd: [0.7, 1.4], poise: 30, windup: 0.35 },
};
