// what a dead goon leaves (docs/drops.md). Per difficulty arrays: [Easy, Medium, Hard, Wicked]
export const LOOT = {
  k: [1.4, 1, 0.8, 0.6],     // chance scale (weapon, ammo and bandage)
  wGap: [2, 3, 4, 5],        // kills since the last weapon drop before the next one can come (all kills count: the pity counter)
  wP: 0.35, wPity: 0.25,     // weapon chance at the gap, + per kill past it (x k): it gets sure soon after
  wMax: 2,                   // dropped weapons on the ground at once: the oldest goes
  gunAmmo: [0.2, 0.4],       // a dropped gun holds 20-40% of a full load
  boxP: 0.4, boxLowP: 0.75,  // ammo box chance (x k); low = his gun under a quarter full
  boxMax: 2, boxReach: 200,  // ammo boxes on the ground at once; a gun on the ground this close to him counts as his
  bossBox: [2, 2, 1, 1],     // ammo boxes from a boss
  bandP: 0.12, bandLowP: 0.5, bandLow: 35,   // bandage chance (x k); below 35 HP the pity chance
  bandMax: [2, 1, 1, 1],     // bandages on the ground at once (a boss drops one over the cap)
};
// the street (the tutorial). carry: a goon's own weapon (ROLE w) -> the hero weapons it stands for; an unarmed goon or a weapon
// not listed (thrown knives) drops nothing. tier: by the goon's stage (zone 2 = stage 3 · Katana ...), the weapons open there:
// none before the stage that teaches it on its bench
const MELEE = ['katana', 'axe'];
export const STREET_DROPS = {
  carry: { knife: ['katana'], machete: ['katana'], pipe: ['axe'], pistol: ['shotgun', 'mg'] },
  tier: { 2: ['katana'], 3: MELEE, 4: [...MELEE, 'shotgun'], 5: [...MELEE, 'shotgun', 'mg'], arena: [...MELEE, 'shotgun', 'mg'] },
};
