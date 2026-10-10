// the difficulty levels (the menu picks one; DIF() in the game resolves the demo to Hard)
// wind: second-wind tokens per checkpoint (a K.O. spends one; at 0 a K.O. is 'Wasted': retry from the checkpoint); rise: HP he gets up with
// mobs (readable on every level): tok = goons that may close in to attack at once; swing = goons that may swing at once (starts at least
// gap s apart); cdA = the A the goons' rest and wind-up times use (Wicked rests no shorter than Hard: it is harder through reads, not speed);
// feint / mix = extra chance of a feint / a high-low mix-up (a feint that turns into a low attack); ender = a raised guard is broken only
// by a combo ender (a lone heavy is blocked and often countered); readHold = how much a predictable held heavy adds to the goons' read of it
// reinf = the street's reinforcement waves per fight stage (goons in each; the next walks in when half the stage's goons are down; Easy teaches: none);
// crew = the street boss's crew: n in all, at most alive at once (n is also every boss crew's total cap: crewCap below)
// dmg = damage taken, times the blow's own (every source: goons, bosses, hazards, trains, fire; a fall is a rule, not scaled)
// ckHp = the HP a checkpoint lifts him to on first arrival (max(HP, ckHp); a retry gives the HP he had there, never more; 0: none)
export const DIFFS = [
  { name: 'Easy', dmg: 0.7, ckHp: 60, A: 1, cdA: 1, regen: 2.5, tok: 2, swing: 1, gap: 0.25, side: 1, feint: 0, mix: 0, ender: false, readHold: 0, dura: 1.5, wind: 3, rise: 50, reinf: [], crew: { n: 6, alive: 2 } },   // dura: blade hits, times the weapon's own (8: Easy 12, Medium 8, Hard 6, Wicked 4)
  { name: 'Medium', dmg: 1, ckHp: 60, A: 2, cdA: 2, regen: 1, tok: 3, swing: 2, gap: 0.25, side: 2, feint: 0, mix: 0, ender: false, readHold: 0.05, dura: 1, wind: 2, rise: 35, reinf: [2], crew: { n: 8, alive: 2 } },
  { name: 'Hard', dmg: 1.15, ckHp: 40, A: 4, cdA: 4, regen: 0, tok: 3, swing: 2, gap: 0.25, side: 2, feint: 0.05, mix: 0.1, ender: true, readHold: 0.12, dura: 0.75, wind: 1, rise: 35, reinf: [2, 3], crew: { n: 10, alive: 3 } },
  { name: 'Wicked', dmg: 1.3, ckHp: 0, A: 8, cdA: 4, regen: 0, tok: 4, swing: 3, gap: 0.25, side: 3, feint: 0.3, mix: 0.45, ender: true, readHold: 0.15, perma: true, dura: 0.5, wind: 0, rise: 0, reinf: [2, 3, 3], crew: { n: 12, alive: 3 } },
];

// one boss HP curve (docs/reviews/2026-10-10-playtest.md section 4): each boss's Medium HP; Easy x0.8, Hard x1.2, Wicked x1.4.
// A boss's phase lines are fractions of its HP, so they move with it. Marchetti: +20 % over the curve (900), the bots found him too easy
export const HP_K = [0.8, 1, 1.2, 1.4];
export const BOSS_HP = { malaspina: 800, marchetti: 1080, switch: 900, brask: 920, kalt: 940, krieg: 960, vane: 1000, lenz: 1080, bell: 1200 };
export const hpCurve = m => HP_K.map(k => Math.round(m * k / 10) * 10);
// one crew rule for every boss and mini-boss crew: at most DIFFS[d].crew.n in all ([6, 8, 10, 12]) and at most 3 alive at once; a boss
// may ask for fewer. maxAlive: the one exception (Vane's yard on Wicked: 5)
export const crewCap = (d, alive = 3, total = Infinity, maxAlive = 3) => ({ alive: Math.min(alive, maxAlive), n: Math.min(total, DIFFS[d].crew.n) });
