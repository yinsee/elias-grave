// Boss-intro portrait dialog (docs/architecture.md 2.2): Elias on the left, the boss on the right, the
// active speaker lit, the other dimmed, the boss portrait changing with the mood of each line.
//
//   import { playDialog } from './cutscene/dialog.js';
//   const script = await fetch('assets/cutscenes/marchetti_intro.json').then((r) => r.json());
//   await playDialog(script, { root: stageEl, audio, bus });      // then start the fight
//
// Options: the same as playPanels (root, audio, bus, base, auto, cps, musicEnd).
// Events on `bus`: 'cutscene:start' {id, kind:'dialog'}, 'dialog:line' {id, speaker, mood, text, line},
// 'cutscene:end' {id, kind, skipped}. Resolves { id, skipped }.
//
// Script (JSON):
//   { id, music?, musicLoop?,
//     left:  { id: 'elias',     name: 'ELIAS GRAVE', role?: '...', portrait: 'portrait:elias_cold' },
//     right: { id: 'marchetti', name: '...',         role?: '...', portrait: 'portrait:marchetti_amused' },
//     lines: [ { speaker: 'marchetti', mood: 'amused', text, voice?, portrait? } ] }
//   A line's portrait is `portrait` if given, else 'portrait:<speaker>_<mood>'; a missing file keeps the
//   previous portrait.

import { SKIP, artUrl, loadImage, el, openOverlay, closeOverlay, presentLine, reducedMotion } from './common.js';

function portraitRef(line) {
  return line.portrait || (line.mood ? `portrait:${line.speaker}_${line.mood}` : null);
}

export async function playDialog(script, opts = {}) {
  const { root, audio = null, bus = null, base = '', auto = false, cps = 40 } = opts;
  if (!root) throw new Error('playDialog: options.root is required');
  const id = script.id || 'dialog';
  const sides = { left: script.left, right: script.right };
  const sideOf = (speaker) => (speaker === sides.left.id ? 'left' : 'right');
  const reduced = reducedMotion();

  // preload every portrait the scene can show
  const refs = new Set([sides.left.portrait, sides.right.portrait, ...script.lines.map(portraitRef)].filter(Boolean));
  const imgs = new Map(await Promise.all([...refs].map(async (r) => [r, await loadImage(artUrl(r, base))])));

  function portraitImg(img, side) {
    const im = img.cloneNode();
    im.alt = sides[side].name;
    im.draggable = false;
    return im;
  }

  const ports = {};
  for (const side of ['left', 'right']) {
    const p = el('div', `cs-port ${side} dim`);
    p.dataset.who = sides[side].id;
    const frame = el('div', 'cs-port-frame');
    const img = imgs.get(sides[side].portrait);
    if (img) frame.append(portraitImg(img, side));
    else frame.append(el('div', 'cs-missing', sides[side].name));
    p.append(frame);
    ports[side] = { el: p, frame, ref: sides[side].portrait };
  }
  const box = el('div', 'cs-dlg-box');
  const plate = el('div', 'cs-plate');
  const plateName = el('b'), plateRole = el('small');
  plate.append(plateName, plateRole);
  const textNode = el('span', 'cs-text');
  textNode.setAttribute('aria-hidden', 'true');
  const textWrap = el('p', 'cs-dlg-text');
  textWrap.append(textNode);
  box.append(plate, textWrap);
  const ui = openOverlay(root, { kind: 'dialog', label: script.title || 'Dialog', children: [ports.left.el, ports.right.el, box] });
  const { overlay, live, ctl } = ui;

  const withAudio = !!audio;
  bus && bus.emit('cutscene:start', { id, kind: 'dialog', ...(withAudio ? {} : { music: script.music }) });
  if (audio && script.music) audio.music.play(script.music, { loop: script.musicLoop !== false });

  function setPortrait(side, ref) {
    const port = ports[side];
    if (!ref || ref === port.ref) return;
    const img = imgs.get(ref);
    if (!img) return;                       // missing mood art: keep the previous face
    port.frame.replaceChildren(portraitImg(img, side));
    port.ref = ref;
    port.el.classList.remove('swap'); void port.el.offsetWidth; port.el.classList.add('swap');
  }

  let skipped = false;
  try {
    await ctl.sleep(reduced ? 0 : 450);     // portraits slide in
    for (let i = 0; i < script.lines.length; i++) {
      const line = script.lines[i];
      const side = sideOf(line.speaker);
      const other = side === 'left' ? 'right' : 'left';
      setPortrait(side, portraitRef(line));
      ports[side].el.classList.remove('dim'); ports[side].el.classList.add('active');
      ports[other].el.classList.add('dim'); ports[other].el.classList.remove('active');
      ports[side].el.dataset.mood = line.mood || '';
      const who = sides[side];
      plateName.textContent = line.name || who.name;
      plateRole.textContent = who.role || '';
      box.dataset.side = side;
      box.dataset.who = who.id;
      box.dataset.mood = line.mood || '';
      live.textContent = `${line.name || who.name}: ${line.text}`;
      await presentLine(ctl, textNode, line.text, {
        voice: line.voice, audio, cps, auto, bus,
        busPayload: { id, speaker: line.speaker, mood: line.mood, text: line.text, line: i, ...(withAudio ? {} : { voice: line.voice }) },
        minMs: (line.minTime || 0) * 1000,
      });
    }
  } catch (e) {
    if (e !== SKIP) { ctl.dispose(); overlay.remove(); throw e; }
    skipped = true;
  }
  if (audio) {
    audio.voice.stop();
    if ((opts.musicEnd || script.musicEnd) === 'stop') audio.music.stop(1.5);
  }
  await closeOverlay(ui, 320);
  bus && bus.emit('cutscene:end', { id, kind: 'dialog', skipped });
  return { id, skipped };
}
