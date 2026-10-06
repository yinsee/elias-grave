// The event bus (docs/architecture.md 2.5): synchronous, by name; listeners run in the order they were added,
// inside emit(), so an event fired in the middle of a sim step is handled before the step goes on.
//
//   import { bus } from './core/events.js';
//   const off = bus.on('kill', (p) => console.log(p.enemy.name));
//   bus.emit('kill', { enemy });
//   off();
//
// A listener that throws does not stop the others or the game: the error goes to the console.
// UI, audio and other presentation listeners must not change the simulation state.

export function createBus() {
  const subs = new Map();
  function on(type, fn) {
    let list = subs.get(type);
    if (!list) subs.set(type, (list = []));
    list.push(fn);
    return () => off(type, fn);
  }
  function off(type, fn) {
    const list = subs.get(type);
    if (!list) return;
    const i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  }
  function emit(type, payload) {
    const list = subs.get(type);
    if (!list || !list.length) return;
    for (const fn of list.slice()) {   // (a listener may remove itself while the event runs)
      try { fn(payload, type); } catch (err) { console.error(`bus: a '${type}' listener failed`, err); }
    }
  }
  function once(type, fn) { const o = on(type, (p, t) => { o(); fn(p, t); }); return o; }
  return { on, off, emit, once };
}

// the game's one bus: the simulation emits on it; UI, audio, cutscenes and levels listen
export const bus = createBus();
