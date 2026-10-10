// The chapter results: a score and a letter grade from the run, and the best one per chapter in localStorage.
//
//   import { gradeRun, rankHtml } from './feedback/results.js';
//   const r = gradeRun('ch1', { t, kills, maxRank, dmg, kos });   // saves the best score; r = { score, grade, best, isNew }
//   resultsEl.innerHTML = `...<dl>...</dl>` + rankHtml(r);
//
// The score (0-10 000) weighs: time against the chapter's par (20 %), the best style rank (30 %), the damage taken (20 %),
// the K.O.s used (20 %) and the kills against the chapter's count (10 %).

import { RANKS } from './style.js';

export const BEST_KEY = 'eliasgrave.best';
const CHAPTERS = { ch1: { par: 600, kills: 16 }, ch2: { par: 300, kills: 12 }, ch3: { par: 630, kills: 38 }, ch4: { par: 660, kills: 44 } };   // street tutorial (it teaches as it goes), Pier 9, Line Zero, House Always Wins
const GRADES = [['S', 8500], ['A', 7000], ['B', 5500], ['C', 4000], ['D', 0]];
const clamp01 = (v) => Math.max(0, Math.min(1, v));

function loadBest() { try { return JSON.parse(localStorage.getItem(BEST_KEY) || '{}') || {}; } catch (err) { return {}; } }

export function scoreRun(chapter, { t, kills, maxRank, dmg, kos }) {
  const C = CHAPTERS[chapter] || CHAPTERS.ch1;
  const k = 0.2 * clamp01(C.par / Math.max(1, t)) + 0.3 * (maxRank + 1) / RANKS.length + 0.2 * clamp01(1 - dmg / 400)
    + 0.2 * clamp01(1 - kos / 3) + 0.1 * clamp01(kills / C.kills);
  const score = Math.round(k * 10000);
  return { score, grade: GRADES.find(([, at]) => score >= at)[0] };
}

// score the run and keep the best per chapter; save = false for a run that must not count (the demo)
export function gradeRun(chapter, stats, save = true) {
  const r = scoreRun(chapter, stats), all = loadBest(), old = all[chapter];
  const isNew = save && (!old || r.score > old.score);
  if (isNew) {
    all[chapter] = { score: r.score, grade: r.grade, t: Math.round(stats.t), style: stats.maxRank < 0 ? '-' : RANKS[stats.maxRank].id };
    try { localStorage.setItem(BEST_KEY, JSON.stringify(all)); } catch (err) { /* private mode: no best kept */ }
  }
  return { ...r, isNew, best: isNew ? all[chapter] : old || null };
}

// the card's rank block: the grade, the score, and the best (or "New best")
export function rankHtml(r) {
  const best = r.isNew ? '<span class="best new">New best</span>' : r.best ? `<span class="best">Best: ${r.best.grade} · ${r.best.score}</span>` : '';
  return `<div class="rank" data-grade="${r.grade}">Rank<b>${r.grade}</b><span class="score">${r.score}</span>${best}</div>`;
}

export const rankName = (i) => (i < 0 ? '-' : `${RANKS[i].id} · ${RANKS[i].name}`);
CHAPTERS.ch6 = { par: 660, kills: 55 };   // St. Cecilia (src/levels/hospital/)
CHAPTERS.ch9 = { par: 960, kills: 70 };   // The Spire (src/levels/skyscraper/), the final level
