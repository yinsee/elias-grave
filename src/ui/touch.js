// On-screen controls for a touch device: a d-pad on the left (← → ↑ ↓), Q, W and Space on the right, Esc and Enter at the top.
// Each button sends the same key events as the keyboard (keydown on press, keyup on release), so the game, its menu and the
// cutscenes need no touch code of their own, and there are no new controls: the buttons are the game's keys.
// They show only on a device with a touch screen, and go away for good once a real key is pressed (a tablet with a keyboard).
// ?touch shows them on any device (tests).
const FORCE = /[?&]touch\b/.test(location.search);
const touchy = FORCE || (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0;

const KEYS = [   // [code, label, area, aria]
  ['ArrowLeft', '◀', 'pad l', 'Left'], ['ArrowRight', '▶', 'pad r', 'Right'], ['ArrowUp', '▲', 'pad u', 'Up: jump, climb, a doorway'], ['ArrowDown', '▼', 'pad d', 'Down: squat'],
  ['KeyQ', 'Q', 'act q', 'Q: punch or swing (hold: heavy, or throw)'], ['KeyW', 'W', 'act w', 'W: kick (hold: heavy)'], ['Space', 'Space', 'act s', 'Space: dodge'],
  ['Escape', 'Esc', 'sys esc', 'Escape: menu'], ['Enter', 'Enter', 'sys ent', 'Enter'],
];

function send(code, down) {
  const key = code === 'Space' ? ' ' : code.startsWith('Key') ? code.slice(3).toLowerCase() : code;
  window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key, bubbles: true }));
}

function build() {
  const root = document.createElement('div');
  root.id = 'touch'; root.className = 'touch'; root.setAttribute('aria-label', 'On-screen controls');
  for (const [code, label, area, aria] of KEYS) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tk ' + area; b.textContent = label; b.setAttribute('aria-label', aria);
    let held = null;
    const up = () => { if (held === null) return; held = null; b.classList.remove('held'); send(code, false); };
    b.addEventListener('pointerdown', e => {
      e.preventDefault(); if (held !== null) return;
      held = e.pointerId; b.classList.add('held'); send(code, true);
      try { b.setPointerCapture(e.pointerId); } catch (err) { /* (a pointer the browser no longer tracks: the release still comes) */ }
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, up);
    b.addEventListener('contextmenu', e => e.preventDefault());
    root.appendChild(b);
  }
  const rot = document.createElement('p');   // a phone held upright: the view is small; say how to make it bigger
  rot.className = 'touch-rot'; rot.textContent = 'Turn the phone sideways for a bigger view';
  root.appendChild(rot);
  document.body.appendChild(root);
  document.body.classList.add('touch-on');
  // a real keyboard: the keys win, the buttons go (a synthetic event from a button is not trusted, so it does not count)
  const off = e => { if (!e.isTrusted || FORCE) return; root.remove(); document.body.classList.remove('touch-on'); removeEventListener('keydown', off, true); };
  addEventListener('keydown', off, true);
}

if (touchy) { if (document.body) build(); else addEventListener('DOMContentLoaded', build); }
