// Shared constants, the fighter roster, move data and default key bindings.

export const SIM_HZ = 120;
export const SIM_DT = 1 / SIM_HZ;

export const ARENA = {
  radius: 17,          // playable radius (inner face of the wall)
  wallHeight: 1.1,
  pillarRadius: 11.2,  // pillars stand on this circle
  pillarCount: 4,
  pillarSize: 0.85,    // collision radius of a pillar
};

export const GRAVITY = 26;
export const ENERGY_MAX = 100;
export const SPECIAL_COST = 50;
export const GUARD_MAX = 100;

// Base movement in metres per second, multiplied by each fighter's speed stat.
export const BASE_SPEED = 5.4;

// Frame data is in seconds. `next` lists the moves this one can chain into
// when the same button (or the other attack button) is pressed in time.
export const MOVES = {
  jab1: { kind: 'punch', startup: 0.07, active: 0.08, recovery: 0.16, damage: 5, range: 1.55, arc: 1.4,
          knock: 2.6, hitstun: 0.3, lunge: 2.2, chain: { punch: 'jab2', kick: 'kick1' } },
  jab2: { kind: 'punch', startup: 0.07, active: 0.08, recovery: 0.16, damage: 5, range: 1.55, arc: 1.4,
          knock: 2.6, hitstun: 0.3, lunge: 2.2, chain: { punch: 'hook', kick: 'kick1' } },
  hook: { kind: 'punch', startup: 0.13, active: 0.1, recovery: 0.32, damage: 10, range: 1.7, arc: 1.7,
          knock: 7.5, hitstun: 0.5, lunge: 3.2, heavy: true, chain: {} },
  kick1: { kind: 'kick', startup: 0.16, active: 0.12, recovery: 0.3, damage: 10, range: 2.0, arc: 1.3,
           knock: 6.5, hitstun: 0.45, lunge: 2.6, chain: { kick: 'kick2' } },
  kick2: { kind: 'kick', startup: 0.2, active: 0.14, recovery: 0.42, damage: 13, range: 2.1, arc: 2.4,
           knock: 9, hitstun: 0.6, lunge: 2.0, heavy: true, knockdown: true, chain: {} },
  airkick: { kind: 'kick', startup: 0.06, active: 0.5, recovery: 0.2, damage: 10, range: 1.7, arc: 1.6,
             knock: 8, hitstun: 0.5, lunge: 0, heavy: true, knockdown: true, air: true, chain: {} },
};

export const SPECIALS = {
  fireball: { label: 'Hellfire Orb', startup: 0.28, recovery: 0.32, hint: 'Hurls a blazing fireball' },
  frost:    { label: 'Glacial Breath', startup: 0.3, recovery: 0.4, hint: 'Freezes enemies in a cone' },
  slam:     { label: 'Quake Slam', startup: 0.5, recovery: 0.45, hint: 'Leaps and smashes the ground' },
  venom:    { label: 'Venom Rush', startup: 0.12, recovery: 0.35, hint: 'Poisoned dash through foes' },
  storm:    { label: 'Storm Call', startup: 0.35, recovery: 0.35, hint: 'Lightning strikes the nearest foe' },
  shadow:   { label: 'Shadow Step', startup: 0.12, recovery: 0.4, hint: 'Teleports behind a foe and strikes' },
  spear:    { label: 'Chain Spear', startup: 0.22, recovery: 0.38, hint: 'Harpoons a foe and drags them in' },
  ironwill: { label: 'Iron Will', startup: 0.3, recovery: 0.3, hint: 'Armors up, shrugs off hits, hits harder' },
};

// Colours are linear-ish hex values for MeshStandardMaterial.
export const ROSTER = [
  { id: 'ember', name: 'Ember', title: 'The Pyre Monk', gi: 0xd8641c, trim: 0x2a120a, eyes: 0xffb347,
    special: 'fireball', speed: 1.0, power: 1.0, health: 100, scale: 1.0, accessory: 'topknot' },
  { id: 'frost', name: 'Frost', title: 'Warden of the North', gi: 0x2f7fd0, trim: 0x0d1f33, eyes: 0x9fe8ff,
    special: 'frost', speed: 0.98, power: 0.95, health: 104, scale: 1.0, accessory: 'none' },
  { id: 'titan', name: 'Titan', title: 'The Mountain', gi: 0x8b6a3e, trim: 0x2b2116, eyes: 0xffdd77,
    special: 'slam', speed: 0.84, power: 1.2, health: 125, scale: 1.16, accessory: 'pads' },
  { id: 'viper', name: 'Viper', title: 'Fang of the Marsh', gi: 0x3f9b3a, trim: 0x10240f, eyes: 0xc6ff4a,
    special: 'venom', speed: 1.12, power: 0.9, health: 92, scale: 0.96, accessory: 'none' },
  { id: 'volt', name: 'Volt', title: 'Thunder Herald', gi: 0xe0c13a, trim: 0x2e2708, eyes: 0xfff6a8,
    special: 'storm', speed: 1.04, power: 0.98, health: 98, scale: 1.0, accessory: 'horns' },
  { id: 'shade', name: 'Shade', title: 'The Unseen', gi: 0x6b3fa8, trim: 0x170c26, eyes: 0xe08bff,
    special: 'shadow', speed: 1.1, power: 0.92, health: 94, scale: 0.98, accessory: 'hood' },
  { id: 'kane', name: 'Kane', title: 'Blood Hunter', gi: 0xa8202c, trim: 0x22070a, eyes: 0xff5a4a,
    special: 'spear', speed: 1.0, power: 1.03, health: 100, scale: 1.02, accessory: 'none' },
  { id: 'onyx', name: 'Onyx', title: 'Iron Revenant', gi: 0x3a3d44, trim: 0x0b0c0e, eyes: 0xd0e4ff,
    special: 'ironwill', speed: 0.92, power: 1.1, health: 115, scale: 1.08, accessory: 'horns' },
];

export const ACTIONS = ['up', 'down', 'left', 'right', 'punch', 'kick', 'block', 'special', 'jump'];
export const ACTION_LABELS = {
  up: 'Move up', down: 'Move down', left: 'Move left', right: 'Move right',
  punch: 'Punch', kick: 'Kick', block: 'Block (hold)', special: 'Special', jump: 'Jump',
};

// KeyboardEvent.code values, so bindings work on any keyboard layout.
export const DEFAULT_BINDINGS = [
  { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
    punch: 'KeyF', kick: 'KeyG', block: 'KeyH', special: 'KeyR', jump: 'Space' },
  { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
    punch: 'KeyK', kick: 'KeyL', block: 'Semicolon', special: 'KeyO', jump: 'Enter' },
  { up: 'Numpad8', down: 'Numpad5', left: 'Numpad4', right: 'Numpad6',
    punch: 'Numpad1', kick: 'Numpad2', block: 'Numpad3', special: 'Numpad7', jump: 'Numpad0' },
  { up: 'KeyY', down: 'KeyN', left: 'KeyB', right: 'KeyM',
    punch: 'KeyU', kick: 'KeyI', block: 'KeyJ', special: 'Digit7', jump: 'Digit8' },
];

export const PLAYER_COLORS = ['#ff6b3d', '#3db8ff', '#7dff6b', '#ffd23d'];

export const DIFFICULTY = {
  easy:   { label: 'Rookie',  reaction: 0.42, block: 0.15, aggression: 0.45, combo: 0.25, special: 0.35, accuracy: 0.6 },
  normal: { label: 'Fighter', reaction: 0.27, block: 0.38, aggression: 0.7,  combo: 0.55, special: 0.65, accuracy: 0.8 },
  hard:   { label: 'Veteran', reaction: 0.17, block: 0.6,  aggression: 0.85, combo: 0.8,  special: 0.85, accuracy: 0.92 },
  brutal: { label: 'Brutal',  reaction: 0.1,  block: 0.8,  aggression: 1.0,  combo: 1.0,  special: 1.0,  accuracy: 1.0 },
};

export function keyLabel(code) {
  if (!code) return '—';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'Num ' + code.slice(6);
  const map = {
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Space', Enter: 'Enter',
    Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', BracketLeft: '[',
    BracketRight: ']', Minus: '-', Equal: '=', ShiftLeft: 'L Shift', ShiftRight: 'R Shift',
    ControlLeft: 'L Ctrl', ControlRight: 'R Ctrl', AltLeft: 'L Alt', AltRight: 'R Alt', Backquote: '`',
    Tab: 'Tab', Backspace: 'Bksp',
  };
  return map[code] || code;
}
