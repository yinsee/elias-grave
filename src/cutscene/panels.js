// Comic-panel cutscene player: a DOM overlay over the game stage (docs/architecture.md 2.2, 2.5).
//
//   import { playPanels } from './cutscene/panels.js';
//   const script = await fetch('assets/cutscenes/prologue_intro.json').then((r) => r.json());
//   const { skipped } = await playPanels(script, { root: stageEl, audio, bus });
//
// Options
//   root      element to cover (the game stage); required. It should be position: relative/absolute/fixed.
//   audio     the runtime from src/audio/audio.js (optional). Voice lines and music play directly through it,
//             so the player can wait for a line to end.
//   bus       event bus { emit } (optional): 'cutscene:start' {id, kind:'panels'}, 'dialog:line' {id, speaker,
//             text, line, panel}, 'cutscene:end' {id, kind, skipped}. With `audio` given, these payloads carry
//             no `voice`/`music` fields (audio.bind would play them a second time); without `audio`, they do.
//   base      prefix for asset paths (e.g. '../' from tests/), default ''.
//   auto      true: move on by itself after each voice line (attract mode); default false (wait for input).
//   cps       typing speed in characters per second (default 42).
//   musicEnd  'keep' | 'stop' (overrides script.musicEnd).
//
// Input: Enter / Space / click / tap = show the full line, then next line. Escape or the SKIP button = end
// the whole scene. Resolves { id, skipped } after the overlay is removed. It never rejects for a missing
// image or voice file: a missing panel shows a dark placeholder with its shot description.
//
// Script (JSON):
//   { id, music?, musicLoop?, musicEnd?: 'keep'|'stop',
//     pages: [ { layout: 'full' | 'row', panels: [ Panel, ... ] } ] }      ('panels': [...] = one full page each)
//   Panel: { image: 'panel:prologue_intro_01' | 'path/to.png', shot: 'description', minTime?: s,
//            sfx?: 'Mmmmmm...' | { text, at: [x%, y%] }, sound?: sfx name, music?: cue,
//            rain?: bool, tint?: 'sepia' | 'cold', focus?: 'x% y%', lines: [ Line, ... ] }
//   Line:  { type: 'vo' | 'say', text, voice?, speaker?, pos?: 'top' | 'bottom',
//            style?: 'caption' | 'bubble', at?: [x%, y%], tail?: 'left' | 'right' | 'none', align?: 'left' | 'right' }

import { SKIP, artUrl, loadImage, el, openOverlay, closeOverlay, presentLine, reducedMotion } from './common.js';

export function normalizePanels(script) {
  const pages = script.pages || (script.panels || []).map((p) => ({ layout: 'full', panels: [p] }));
  return pages.map((pg) => ({
    layout: pg.layout === 'row' && pg.panels.length > 1 ? 'row' : 'full',
    panels: pg.panels.map((p) => ({ ...p, lines: p.lines || [] })),
  }));
}

function buildFrame(panel, img, idx) {
  const fig = el('figure', 'cs-panel');
  fig.style.setProperty('--enter', idx % 2 ? '1' : '-1');
  const frame = el('div', 'cs-frame');
  if (panel.tint) frame.classList.add('tint-' + panel.tint);
  if (img) {
    const im = img.cloneNode();
    im.alt = panel.shot || '';
    im.draggable = false;
    if (panel.focus) im.style.transformOrigin = panel.focus;
    frame.append(im);
  } else {
    frame.classList.add('missing');
    const ph = el('div', 'cs-missing');
    ph.append(el('b', null, 'PANEL ' + String(panel.image || '?').replace(/^panel:/, '')), el('p', null, panel.shot || ''));
    frame.append(ph);
  }
  if (panel.rain) frame.append(el('div', 'cs-rain'));
  const top = el('div', 'cs-caps top'), bottom = el('div', 'cs-caps bottom');
  fig.append(frame, top, bottom);
  return { fig, frame, top, bottom };
}

function buildLine(line, parts) {
  const isVo = line.type === 'vo' || (!line.speaker && line.type !== 'say');
  const style = isVo ? 'caption' : line.style || 'caption';
  let box;
  if (style === 'bubble') {
    box = el('div', 'cs-bubble tail-' + (line.tail || 'left'));
    const [x, y] = line.at || [6, 8];
    box.style.left = x + '%'; box.style.top = y + '%';
    if (line.speaker) box.append(el('span', 'cs-tag', line.speaker));
    parts.frame.append(box);
  } else {
    box = el('div', isVo ? 'cs-cap vo' : 'cs-cap say');
    if (!isVo && line.speaker) box.append(el('span', 'cs-tag', line.speaker));
    if (line.align === 'right' || line.align === 'left') box.classList.add(line.align);
    (line.pos === 'bottom' || (!line.pos && !isVo) ? parts.bottom : parts.top).append(box);
  }
  const text = el('span', 'cs-text');
  text.setAttribute('aria-hidden', 'true');
  box.append(text);
  return text;
}

export async function playPanels(script, opts = {}) {
  const { root, audio = null, bus = null, base = '', auto = false, cps = 42 } = opts;
  if (!root) throw new Error('playPanels: options.root is required');
  const id = script.id || 'cutscene';
  const pages = normalizePanels(script);
  const all = pages.flatMap((p) => p.panels);
  const loads = all.map((p) => loadImage(artUrl(p.image, base)));   // preload everything at once
  const reduced = reducedMotion();

  const stage = el('div', 'cs-stage');
  const ui = openOverlay(root, { kind: 'panels', label: script.title || 'Cutscene', children: [stage] });
  const { overlay, live, ctl } = ui;

  const withAudio = !!audio;
  bus && bus.emit('cutscene:start', { id, kind: 'panels', ...(withAudio ? {} : { music: script.music }) });
  if (audio && script.music) audio.music.play(script.music, { loop: !!script.musicLoop });

  let skipped = false, k = 0;
  try {
    await ctl.sleep(reduced ? 0 : 60);
    for (const page of pages) {
      const old = stage.querySelector('.cs-page');
      const pageEl = el('div', `cs-page layout-${page.layout} n${page.panels.length}`);
      if (old) { old.classList.add('out'); setTimeout(() => old.remove(), reduced ? 0 : 260); await ctl.sleep(reduced ? 0 : 200); }
      // build every frame of the page first (hidden), so a row keeps its slots as panels appear
      const imgs = await Promise.all(page.panels.map((_, i) => loads[k + i]));
      ctl.check();
      const frames = page.panels.map((panel, i) => {
        if (!imgs[i]) console.info('cutscene: missing panel image, placeholder shown:', panel.image);
        const parts = buildFrame(panel, imgs[i], k + i);
        parts.fig.classList.add('pending');
        pageEl.append(parts.fig);
        return parts;
      });
      stage.append(pageEl);
      for (let i = 0; i < page.panels.length; i++, k++) {
        const panel = page.panels[i];
        const parts = frames[i];
        pageEl.querySelectorAll('.cs-panel.current').forEach((f) => f.classList.replace('current', 'past'));
        parts.fig.classList.replace('pending', 'current');
        const t0 = performance.now();
        if (audio && panel.music) audio.music.play(panel.music, { loop: !!panel.musicLoop });
        if (audio && panel.sound) audio.sfx.play(panel.sound);
        await ctl.sleep(reduced ? 0 : 320);                    // the slide-in
        if (panel.sfx) {
          const s = typeof panel.sfx === 'string' ? { text: panel.sfx } : panel.sfx;
          const sx = el('div', 'cs-sfx', s.text);
          const [x, y] = s.at || [52, 18];
          sx.style.left = x + '%'; sx.style.top = y + '%';
          parts.frame.append(sx);
          await ctl.sleep(reduced ? 0 : 650);
        }
        const minMs = (panel.minTime || 0) * 1000;
        if (!panel.lines.length) {
          live.textContent = panel.shot || '';
          if (auto) await Promise.race([ctl.sleep(Math.max(minMs, 2500)), ctl.waitAdvance()]);
          else for (;;) { await ctl.waitAdvance(); if (performance.now() - t0 >= minMs) break; }
        }
        for (let j = 0; j < panel.lines.length; j++) {
          const line = panel.lines[j];
          const node = buildLine(line, parts);
          live.textContent = (line.speaker ? line.speaker + ': ' : '') + line.text;
          const last = j === panel.lines.length - 1;
          await presentLine(ctl, node, line.text, {
            voice: line.voice, audio, cps, auto, bus,
            busPayload: { id, speaker: line.speaker || 'vo', text: line.text, line: j, panel: k, ...(withAudio ? {} : { voice: line.voice }) },
            minMs: last ? minMs - (performance.now() - t0) : 0,
          });
        }
      }
    }
  } catch (e) {
    if (e !== SKIP) { ctl.dispose(); overlay.remove(); throw e; }
    skipped = true;
  }
  if (audio) {
    audio.voice.stop();
    const end = opts.musicEnd || script.musicEnd || 'keep';
    if (end === 'stop') audio.music.stop(script.musicFade ?? 1.5);
  }
  await closeOverlay(ui, 380);
  bus && bus.emit('cutscene:end', { id, kind: 'panels', skipped });
  return { id, skipped };
}
