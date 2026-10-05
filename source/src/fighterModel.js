// Procedural articulated fighter: a jointed hierarchy of capsules with a
// pose blender. No external assets, so it loads instantly.
import * as THREE from 'three';

const geoCache = new Map();
function geo(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}
const capsule = (r, len) => geo(`cap${r}_${len}`, () => new THREE.CapsuleGeometry(r, len, 6, 12));
const sphere = (r) => geo(`sph${r}`, () => new THREE.SphereGeometry(r, 20, 14));
const box = (x, y, z) => geo(`box${x}_${y}_${z}`, () => new THREE.BoxGeometry(x, y, z));

// Joint names used by poses.
export const JOINTS = ['hips', 'spine', 'chest', 'head', 'shL', 'elL', 'shR', 'elR', 'hipL', 'knL', 'hipR', 'knR'];

function limb(parent, material, r, len, name) {
  // pivot at the joint, capsule hanging down along -Y
  const pivot = new THREE.Group();
  pivot.name = name;
  const m = new THREE.Mesh(capsule(r, len), material);
  m.position.y = -(len / 2 + r * 0.6);
  m.castShadow = true;
  pivot.add(m);
  parent.add(pivot);
  return pivot;
}

export function buildFighterModel(def) {
  const giMat = new THREE.MeshStandardMaterial({ color: def.gi, roughness: 0.62, metalness: 0.05 });
  const trimMat = new THREE.MeshStandardMaterial({ color: def.trim, roughness: 0.75, metalness: 0.1 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x8a5a3c, roughness: 0.55 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x9aa2ad, roughness: 0.3, metalness: 0.85 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: def.eyes, emissive: def.eyes, emissiveIntensity: 2.6 });
  const mats = [giMat, trimMat, skinMat, metalMat];

  const root = new THREE.Group();      // world position + facing
  const body = new THREE.Group();      // falls over as a whole (pivot at the feet)
  root.add(body);
  const s = def.scale;
  body.scale.setScalar(s);

  const J = {};
  const hips = new THREE.Group(); hips.position.y = 0.98; body.add(hips); J.hips = hips;
  const pelvis = new THREE.Mesh(box(0.36, 0.2, 0.22), trimMat); pelvis.castShadow = true; hips.add(pelvis);
  const belt = new THREE.Mesh(box(0.4, 0.07, 0.25), metalMat); belt.position.y = 0.1; hips.add(belt);

  const spine = new THREE.Group(); spine.position.y = 0.1; hips.add(spine); J.spine = spine;
  const abdomen = new THREE.Mesh(capsule(0.16, 0.16), giMat); abdomen.position.y = 0.14; abdomen.castShadow = true; spine.add(abdomen);
  const chest = new THREE.Group(); chest.position.y = 0.26; spine.add(chest); J.chest = chest;
  const torso = new THREE.Mesh(capsule(0.21, 0.2), giMat); torso.position.y = 0.12; torso.scale.set(1.15, 1, 0.8); torso.castShadow = true; chest.add(torso);
  const sash = new THREE.Mesh(box(0.08, 0.5, 0.36), trimMat); sash.position.set(0, 0.1, 0); sash.rotation.z = 0.6; chest.add(sash);

  const head = new THREE.Group(); head.position.y = 0.42; chest.add(head); J.head = head;
  const neck = new THREE.Mesh(capsule(0.06, 0.06), skinMat); neck.position.y = 0.0; head.add(neck);
  const skull = new THREE.Mesh(sphere(0.135), trimMat); skull.position.y = 0.14; skull.scale.set(0.95, 1.08, 1); skull.castShadow = true; head.add(skull);
  const mask = new THREE.Mesh(box(0.25, 0.1, 0.18), giMat); mask.position.set(0, 0.09, 0.06); head.add(mask);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(box(0.06, 0.018, 0.02), eyeMat);
    eye.position.set(side * 0.05, 0.165, 0.125); eye.rotation.z = side * -0.18;
    head.add(eye);
  }
  addAccessory(def.accessory, head, chest, { giMat, trimMat, metalMat });

  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? 1 : -1;  // fighter faces +Z, so its left is +X
    const sh = limb(chest, giMat, 0.075, 0.2, 'sh' + side);
    sh.position.set(sx * 0.29, 0.24, 0);
    J['sh' + side] = sh;
    const el = limb(sh, skinMat, 0.062, 0.18, 'el' + side);
    el.position.y = -0.32;
    J['el' + side] = el;
    const bracer = new THREE.Mesh(capsule(0.072, 0.1), metalMat); bracer.position.y = -0.18; el.add(bracer);
    const fist = new THREE.Mesh(sphere(0.075), trimMat); fist.position.y = -0.33; fist.scale.set(1, 1.05, 1.1); fist.castShadow = true; el.add(fist);
    el.userData.fist = fist;
    if (def.accessory === 'pads') {
      const pad = new THREE.Mesh(sphere(0.13), metalMat); pad.scale.set(1.1, 0.7, 1.1); pad.position.set(sx * 0.04, 0.02, 0);
      sh.add(pad);
    }

    const hip = limb(hips, giMat, 0.095, 0.3, 'hip' + side);
    hip.position.set(sx * 0.12, -0.05, 0);
    J['hip' + side] = hip;
    const kn = limb(hip, giMat, 0.08, 0.3, 'kn' + side);
    kn.position.y = -0.46;
    J['kn' + side] = kn;
    const wrap = new THREE.Mesh(capsule(0.083, 0.12), trimMat); wrap.position.y = -0.3; kn.add(wrap);
    const foot = new THREE.Mesh(box(0.12, 0.08, 0.24), trimMat); foot.position.set(0, -0.48, 0.05); foot.castShadow = true; kn.add(foot);
  }

  // Floor marker in the fighter's colour so everyone can be told apart.
  const ring = new THREE.Mesh(
    geo('ring', () => new THREE.RingGeometry(0.52, 0.68, 40).rotateX(-Math.PI / 2)),
    new THREE.MeshBasicMaterial({ color: def.eyes, transparent: true, opacity: 0.75, depthWrite: false })
  );
  ring.position.y = 0.025;
  ring.renderOrder = 1;
  root.add(ring);

  // Ice shell shown while frozen, armor glow while Iron Will is up.
  const ice = new THREE.Mesh(capsule(0.48, 1.0), new THREE.MeshStandardMaterial({
    color: 0xbfe9ff, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.45, emissive: 0x2a6f9a, emissiveIntensity: 0.6,
  }));
  ice.position.y = 0.95; ice.visible = false; body.add(ice);
  const aura = new THREE.Mesh(capsule(0.55, 1.0), new THREE.MeshBasicMaterial({
    color: def.eyes, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  aura.position.y = 0.95; aura.visible = false; body.add(aura);
  // Barrier bubble for shield skills; lives on the root so it stays up while the body flickers.
  const shell = new THREE.Mesh(geo('shell', () => new THREE.SphereGeometry(1, 24, 16)), new THREE.MeshBasicMaterial({
    color: 0x9fe8ff, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  shell.scale.set(0.8 * s, 1.15 * s, 0.8 * s); shell.position.y = 1.0 * s; shell.visible = false; root.add(shell);

  const rest = {};
  for (const k of JOINTS) rest[k] = { x: 0, y: 0, z: 0 };
  return { root, body, joints: J, ring, ice, aura, shell, mats, eyeMat, current: rest, hipsBaseY: 0.98 };
}

// Dress a fighter in team colours: the gi takes the team colour (keeping a hint of the
// fighter's own), and team-coloured pauldrons and a tabard go on over it.
export function applyTeamOutfit(model, color) {
  const [giMat] = model.mats;
  const team = new THREE.Color(color);
  giMat.color.lerp(team, 0.72);
  const teamMat = new THREE.MeshStandardMaterial({ color: team, roughness: 0.4, metalness: 0.55, emissive: team, emissiveIntensity: 0.12 });
  model.mats.push(teamMat);
  const chest = model.joints.chest;
  for (const side of [-1, 1]) {
    const pad = new THREE.Mesh(sphere(0.12), teamMat);
    pad.scale.set(1.15, 0.65, 1.1);
    pad.position.set(side * 0.3, 0.27, 0);
    pad.castShadow = true;
    chest.add(pad);
  }
  const tabard = new THREE.Mesh(box(0.22, 0.42, 0.03), teamMat);
  tabard.position.set(0, -0.32, 0.135);
  model.joints.hips.add(tabard);
  model.ring.material.color.copy(team);
}

function addAccessory(kind, head, chest, { giMat, trimMat, metalMat }) {
  if (kind === 'topknot') {
    const knot = new THREE.Mesh(sphere(0.06), trimMat); knot.position.set(0, 0.3, -0.04); head.add(knot);
    const tail = new THREE.Mesh(capsule(0.025, 0.18), trimMat); tail.position.set(0, 0.22, -0.16); tail.rotation.x = 1.0; head.add(tail);
  } else if (kind === 'horns') {
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(geo('horn', () => new THREE.ConeGeometry(0.035, 0.2, 10)), metalMat);
      horn.position.set(side * 0.1, 0.27, 0.0); horn.rotation.z = side * -0.5;
      head.add(horn);
    }
  } else if (kind === 'hood') {
    const hood = new THREE.Mesh(geo('hood', () => new THREE.ConeGeometry(0.2, 0.42, 16, 1, true)), giMat);
    hood.position.set(0, 0.2, -0.03); hood.material = giMat; head.add(hood);
    const cape = new THREE.Mesh(box(0.42, 0.7, 0.03), trimMat); cape.position.set(0, -0.15, -0.17); cape.rotation.x = 0.12; chest.add(cape);
  }
}

// ---- Poses -------------------------------------------------------------
// A pose is { joint: [x, y, z] } plus optional `lift` (vertical body offset)
// and `lean` (whole-body pitch). Missing joints default to 0.

const guard = {
  shL: [-0.85, 0, 0.32], elL: [-1.95, 0, 0], shR: [-0.7, 0, -0.32], elR: [-2.05, 0, 0],
  hipL: [-0.28, 0, 0.12], knL: [0.42, 0, 0], hipR: [0.22, 0, -0.12], knR: [0.36, 0, 0],
  spine: [0.06, 0.25, 0], chest: [0.06, 0.15, 0], head: [-0.08, -0.35, 0], lift: -0.06,
};

function mix(a, b, t) {
  const out = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const va = a[k] ?? (k === 'lift' || k === 'lean' ? 0 : [0, 0, 0]);
    const vb = b[k] ?? (k === 'lift' || k === 'lean' ? 0 : [0, 0, 0]);
    out[k] = typeof va === 'number' ? va + (vb - va) * t : [va[0] + (vb[0] - va[0]) * t, va[1] + (vb[1] - va[1]) * t, va[2] + (vb[2] - va[2]) * t];
  }
  return out;
}
const ease = (t) => t * t * (3 - 2 * t);

function idlePose(t) {
  const b = Math.sin(t * 3.2) * 0.03;
  return { ...guard, lift: guard.lift + b * 0.6, chest: [0.06 + b, 0.15, 0], shL: [-0.85 - b, 0, 0.32], shR: [-0.7 + b, 0, -0.32] };
}

function runPose(phase, amount) {
  const s = Math.sin(phase), c = Math.cos(phase);
  const run = {
    hipL: [-0.85 * s, 0, 0.05], knL: [0.25 + Math.max(0, c) * 1.1, 0, 0],
    hipR: [0.85 * s, 0, -0.05], knR: [0.25 + Math.max(0, -c) * 1.1, 0, 0],
    shL: [0.7 * s - 0.4, 0, 0.2], elL: [-1.5, 0, 0], shR: [-0.7 * s - 0.4, 0, -0.2], elR: [-1.5, 0, 0],
    spine: [0.22, 0.12 * s, 0], chest: [0.05, 0.15 * s, 0], head: [-0.15, -0.2 * s, 0],
    lift: Math.abs(Math.cos(phase)) * 0.07 - 0.03,
  };
  return mix(guard, run, amount);
}

function attackPose(move, side, p) {
  // p: 0..1 windup, 1..2 strike, 2..3 recover
  const w = Math.min(1, p), st = Math.min(1, Math.max(0, p - 1)), rc = Math.min(1, Math.max(0, p - 2));
  let windup, strike;
  const R = side > 0; // strike with right limb
  const sh = R ? 'shR' : 'shL', el = R ? 'elR' : 'elL', sz = R ? -1 : 1;
  if (move.kind === 'punch' && !move.heavy) {
    windup = { ...guard, [sh]: [-0.5, 0, sz * 0.4], [el]: [-2.2, 0, 0], chest: [0.05, sz * -0.35, 0] };
    strike = { ...guard, [sh]: [-1.6, 0, sz * 0.05], [el]: [-0.05, 0, 0], chest: [0.12, sz * 0.55, 0], spine: [0.12, sz * 0.3, 0], lift: -0.08 };
  } else if (move.kind === 'punch') { // hook / uppercut
    windup = { ...guard, [sh]: [-0.3, 0, sz * 0.9], [el]: [-1.6, 0, 0], chest: [0.15, sz * -0.7, 0], lift: -0.16, knL: [0.8, 0, 0], knR: [0.8, 0, 0], hipL: [-0.5, 0, 0.12], hipR: [-0.1, 0, -0.12] };
    strike = { ...guard, [sh]: [-2.5, 0, sz * 0.1], [el]: [-0.6, 0, 0], chest: [-0.2, sz * 0.7, 0], spine: [-0.15, sz * 0.4, 0], lift: 0.05, head: [-0.3, 0, 0] };
  } else if (move.air) {
    windup = { ...guard, hipL: [-1.2, 0, 0.1], knL: [2.0, 0, 0], hipR: [-0.3, 0, -0.1], knR: [0.4, 0, 0] };
    strike = { ...guard, hipR: [-0.9, 0, -0.1], knR: [0.05, 0, 0], hipL: [-1.4, 0, 0.1], knL: [2.1, 0, 0], spine: [0.3, 0, 0] };
  } else if (!move.heavy) { // front kick
    const hip = R ? 'hipR' : 'hipL', kn = R ? 'knR' : 'knL';
    windup = { ...guard, [hip]: [-1.2, 0, 0], [kn]: [1.9, 0, 0], spine: [-0.1, 0, 0] };
    strike = { ...guard, [hip]: [-1.55, 0, sz * 0.05], [kn]: [0.05, 0, 0], spine: [-0.35, 0, 0], chest: [-0.05, 0, 0], head: [0.2, 0, 0] };
  } else { // roundhouse
    const hip = R ? 'hipR' : 'hipL', kn = R ? 'knR' : 'knL';
    windup = { ...guard, [hip]: [-0.9, 0, sz * 0.6], [kn]: [1.6, 0, 0], spine: [0.0, sz * -0.6, sz * 0.2], lift: 0.02 };
    strike = { ...guard, [hip]: [-0.5, 0, sz * 1.5], [kn]: [0.1, 0, 0], spine: [0.0, sz * 0.9, sz * -0.45], chest: [0, sz * 0.3, 0], lift: 0.04 };
  }
  if (p < 1) return mix(guard, windup, ease(w));
  if (p < 2) return mix(windup, strike, Math.min(1, st * 2.5));
  return mix(strike, guard, ease(rc));
}

function specialPose(kind, p) {
  const w = Math.min(1, p), rc = Math.min(1, Math.max(0, p - 1));
  let charge, release;
  switch (kind) {
    case 'slam':
      charge = { shL: [-3.0, 0, 0.3], elL: [-0.4, 0, 0], shR: [-3.0, 0, -0.3], elR: [-0.4, 0, 0], spine: [-0.2, 0, 0], hipL: [-0.9, 0, 0.1], knL: [1.6, 0, 0], hipR: [-0.9, 0, -0.1], knR: [1.6, 0, 0] };
      release = { ...guard, shL: [-1.2, 0, 0.3], elL: [-0.2, 0, 0], shR: [-1.2, 0, -0.3], elR: [-0.2, 0, 0], spine: [0.6, 0, 0], lift: -0.35, knL: [1.3, 0, 0], knR: [1.3, 0, 0], hipL: [-1.0, 0, 0.2], hipR: [-1.0, 0, -0.2] };
      break;
    case 'spear':
      charge = { ...guard, shR: [-2.6, 0, -0.5], elR: [-1.3, 0, 0], chest: [0, -0.6, 0], spine: [-0.1, -0.3, 0] };
      release = { ...guard, shR: [-1.6, 0, 0], elR: [0, 0, 0], chest: [0.1, 0.5, 0], spine: [0.15, 0.3, 0] };
      break;
    case 'ironwill':
      charge = { ...guard, shL: [-0.3, 0, 0.9], elL: [-1.9, 0, 0], shR: [-0.3, 0, -0.9], elR: [-1.9, 0, 0], spine: [0.25, 0, 0], lift: -0.15 };
      release = { ...guard, shL: [-0.2, 0, 1.3], elL: [-1.6, 0, 0], shR: [-0.2, 0, -1.3], elR: [-1.6, 0, 0], spine: [-0.25, 0, 0], head: [-0.4, 0, 0], lift: 0.02 };
      break;
    case 'venom': case 'shadow':
      charge = { ...guard, spine: [0.5, 0, 0], lift: -0.18, hipL: [-0.9, 0, 0.1], knL: [1.3, 0, 0], hipR: [0.4, 0, -0.1], knR: [0.6, 0, 0] };
      release = { ...guard, shR: [-1.6, 0, 0], elR: [-0.1, 0, 0], shL: [0.6, 0, 0.3], spine: [0.5, 0.4, 0], lift: -0.12 };
      break;
    case 'storm':
      charge = { ...guard, shR: [-3.05, 0, -0.15], elR: [-0.1, 0, 0], shL: [-0.4, 0, 0.6], spine: [-0.2, 0, 0] };
      release = { ...guard, shR: [-1.4, 0, -0.1], elR: [0, 0, 0], spine: [0.25, 0, 0] };
      break;
    default: // fireball / frost: two-palm thrust
      charge = { ...guard, shL: [-0.4, 0, -0.3], elL: [-2.0, 0, 0], shR: [-0.4, 0, 0.3], elR: [-2.0, 0, 0], chest: [0, -0.8, 0], spine: [0, -0.4, 0], lift: -0.12 };
      release = { ...guard, shL: [-1.55, 0, -0.18], elL: [-0.05, 0, 0], shR: [-1.55, 0, 0.18], elR: [-0.05, 0, 0], chest: [0.1, 0, 0], spine: [0.15, 0, 0], lift: -0.1 };
  }
  if (p < 1) return mix(guard, charge, ease(w));
  if (p < 1.25) return mix(charge, release, (p - 1) * 4);
  return mix(release, guard, ease(Math.max(0, rc - 0.25) / 0.75));
}

const blockPose = {
  ...guard, shL: [-1.35, 0, -0.45], elL: [-1.7, 0, 0], shR: [-1.45, 0, 0.45], elR: [-1.7, 0, 0],
  spine: [0.18, 0, 0], chest: [0.12, 0, 0], head: [0.15, 0, 0],
  hipL: [-0.45, 0, 0.18], knL: [0.75, 0, 0], hipR: [0.15, 0, -0.18], knR: [0.6, 0, 0], lift: -0.13,
};
const hurtPose = {
  ...guard, spine: [-0.45, 0, 0.1], chest: [-0.25, 0, 0], head: [-0.45, 0, 0.2],
  shL: [-0.4, 0, 0.9], elL: [-0.8, 0, 0], shR: [-0.3, 0, -0.9], elR: [-0.9, 0, 0], lift: -0.04,
};
const jumpPose = {
  ...guard, hipL: [-1.1, 0, 0.1], knL: [1.8, 0, 0], hipR: [-0.6, 0, -0.1], knR: [1.4, 0, 0],
  shL: [-1.2, 0, 0.6], elL: [-1.5, 0, 0], shR: [-1.2, 0, -0.6], elR: [-1.5, 0, 0], spine: [0.15, 0, 0],
};
const downPose = {
  shL: [-2.6, 0, 0.6], elL: [-0.3, 0, 0], shR: [-2.8, 0, -0.5], elR: [-0.4, 0, 0],
  hipL: [-0.15, 0, 0.2], knL: [0.25, 0, 0], hipR: [-0.35, 0, -0.15], knR: [0.5, 0, 0], head: [0.3, 0.4, 0],
};
const dodgePose = {
  ...guard, spine: [0.75, 0, 0], chest: [0.35, 0, 0], head: [-0.4, 0, 0], lift: -0.36,
  hipL: [-1.3, 0, 0.15], knL: [2.0, 0, 0], hipR: [-0.6, 0, -0.15], knR: [1.7, 0, 0],
  shL: [-1.0, 0, 0.5], elL: [-1.9, 0, 0], shR: [-1.0, 0, -0.5], elR: [-1.9, 0, 0],
};
const frozenPose = { ...guard, spine: [-0.15, 0, 0], shL: [-0.6, 0, 0.7], shR: [-0.5, 0, -0.7] };

function victoryPose(t) {
  const b = Math.abs(Math.sin(t * 4));
  return {
    shR: [-3.0, 0, -0.25], elR: [-0.2, 0, 0], shL: [0.2, 0, 0.4], elL: [-1.8, 0, 0],
    head: [-0.35, 0, 0], spine: [-0.12, 0, 0], hipL: [0, 0, 0.12], hipR: [0, 0, -0.12], lift: b * 0.08,
  };
}

export function computePose(f) {
  const t = f.animTime;
  switch (f.state) {
    case 'attack': return attackPose(f.move, f.attackSide, f.attackPhase);
    case 'special': return specialPose(f.def.special, f.specialPhase);
    case 'skill': return specialPose(f.skill?.pose || 'fireball', f.specialPhase);
    case 'dodge': return dodgePose;
    case 'block': return blockPose;
    case 'hitstun': case 'blockstun': case 'guardbreak': {
      const w = Math.sin(Math.min(1, f.stateTime / 0.12) * Math.PI * 0.5);
      const base = f.state === 'blockstun' ? blockPose : hurtPose;
      return f.state === 'guardbreak' ? mix(hurtPose, { ...hurtPose, head: [0.5, Math.sin(t * 7) * 0.4, 0], spine: [0.4, 0, 0], lift: -0.2 }, 0.7) : mix(idlePose(t), base, w);
    }
    case 'knockdown': case 'ko': case 'getup': return downPose;
    case 'frozen': return frozenPose;
    case 'victory': return victoryPose(t);
    default:
      if (!f.grounded) return jumpPose;
      return runPose(f.runPhase, f.moveAmount);
  }
}

// Blend each joint toward the target pose with critically damped smoothing.
export function applyPose(model, target, dt, sharp) {
  const k = 1 - Math.exp(-(sharp ? 34 : 16) * dt);
  for (const name of JOINTS) {
    const tv = target[name] || [0, 0, 0];
    const cur = model.current[name];
    cur.x += (tv[0] - cur.x) * k;
    cur.y += (tv[1] - cur.y) * k;
    cur.z += (tv[2] - cur.z) * k;
    model.joints[name].rotation.set(cur.x, cur.y, cur.z);
  }
  const lift = target.lift ?? 0;
  model.current.lift = (model.current.lift ?? 0) + (lift - (model.current.lift ?? 0)) * k;
  model.joints.hips.position.y = model.hipsBaseY + model.current.lift;
}
