// A tiny event bus. Gameplay emits; audio, HUD and (later) networking listen.
// Events: roundStart, fight, swing, hit, block, guardBreak, ko, special, jump, land,
//         roundEnd, matchEnd, suddenDeath, tick
export class EventBus {
  constructor() { this.handlers = new Map(); }
  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
    return () => this.handlers.get(type)?.delete(fn);
  }
  emit(type, data) {
    const set = this.handlers.get(type);
    if (!set) return;
    for (const fn of set) {
      try { fn(data); } catch (err) { console.error(`[events] ${type} handler failed`, err); }
    }
  }
}

export const events = new EventBus();
