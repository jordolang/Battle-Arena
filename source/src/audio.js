// Audio hook point. The sound-and-music pass plugs in here by listening to
// gameplay events (hit, block, ko, swing, special, thunder, roundStart, fight,
// suddenDeath, matchEnd ...) from events.js. Nothing plays yet.
export function initAudio(/* events */) {
  return { unlock() {}, setMuted() {} };
}
