// CPU opponents. Each AI reads the same world state a player sees and
// produces the same intent a keyboard would, so it can be swapped for a
// network-driven controller later without touching fighter code.
import { DIFFICULTY, SPECIAL_COST } from './config.js';
import { wrapAngle } from './fighter.js';

const PREFERRED_SPECIAL_RANGE = {
  fireball: [3, 12], spear: [3, 9.5], frost: [1, 4.2], slam: [0, 3.2], venom: [2, 7],
  storm: [2, 12], shadow: [3, 11], ironwill: [0, 2.6],
};

export class AIController {
  constructor(difficulty = 'normal') {
    this.isHuman = false;
    this.p = DIFFICULTY[difficulty] || DIFFICULTY.normal;
    this.target = null;
    this.targetUntil = 0;
    this.nextThink = 0;
    this.plan = 'approach';
    this.planUntil = 0;
    this.strafe = Math.random() < 0.5 ? 1 : -1;
    this.blockUntil = 0;
    this.comboLeft = 0;
    this.pressQueue = [];
    this.bias = new Map();
    this.wantMove = { x: 0, z: 0 };
  }

  pickTarget(me, world) {
    let best = null, bestScore = Infinity;
    for (const o of world.fighters) {
      if (o === me || !o.alive) continue;
      if (!this.bias.has(o.id)) this.bias.set(o.id, Math.random() * 4);
      const d = Math.hypot(o.pos.x - me.pos.x, o.pos.z - me.pos.z);
      let score = d + this.bias.get(o.id) + (o.hp / o.maxHp) * 3;
      if (o === me.lastAttacker && world.time - me.lastHitTime < 3) score -= 5;
      // avoid everyone piling onto the same victim
      let crowd = 0;
      for (const f of world.fighters) if (f !== me && f.alive && f.controller?.target === o) crowd++;
      score += crowd * 2.2;
      if (score < bestScore) { bestScore = score; best = o; }
    }
    return best;
  }

  getIntent(me, world) {
    const now = world.time;
    this._now = now;
    const intent = { mx: 0, mz: 0, block: false, punch: false, kick: false, special: false, jump: false };

    // queued button presses from an earlier decision
    if (this.pressQueue.length && this.pressQueue[0].at <= now) {
      const p = this.pressQueue.shift();
      intent[p.action] = true;
    }

    if (now >= this.nextThink) {
      this.nextThink = now + this.p.reaction * (0.7 + Math.random() * 0.6);
      this.think(me, world);
    }
    intent.block = now < this.blockUntil;
    intent.mx = this.wantMove.x;
    intent.mz = this.wantMove.z;
    return intent;
  }

  think(me, world) {
    const now = world.time;
    if (!this.target || !this.target.alive || now > this.targetUntil) {
      this.target = this.pickTarget(me, world);
      this.targetUntil = now + 2.5 + Math.random() * 3;
    }
    const T = this.target;
    this.wantMove = { x: 0, z: 0 };
    if (!T) return;

    const dx = T.pos.x - me.pos.x, dz = T.pos.z - me.pos.z;
    const dist = Math.hypot(dx, dz) || 0.001;
    const nx = dx / dist, nz = dz / dist;

    // 1) escape the fire ring
    const myR = Math.hypot(me.pos.x, me.pos.z);
    if (world.ringRadius < 30 && myR > world.ringRadius - 1.6) {
      const l = myR || 1;
      this.wantMove = { x: -me.pos.x / l, z: -me.pos.z / l };
      return;
    }

    // 2) defend against an incoming attack or projectile
    const threat = this.findThreat(me, world);
    if (threat && Math.random() < this.p.block) {
      if (threat.type === 'projectile' && Math.random() < 0.45) {
        // sidestep instead of blocking
        this.wantMove = { x: -threat.dz * this.strafe, z: threat.dx * this.strafe };
        return;
      }
      if (threat.type === 'melee' && Math.random() < 0.15 * this.p.accuracy) {
        this.press('jump', 0);
      } else {
        this.blockUntil = now + 0.3 + Math.random() * 0.35;
        return;
      }
    }

    // only act when free
    if (!me.canAct() && me.state !== 'block') return;
    if (now < this.blockUntil) return;

    // 3) special when it makes sense
    const sp = me.def.special;
    if (me.energy >= SPECIAL_COST && Math.random() < this.p.special * 0.55) {
      const [lo, hi] = PREFERRED_SPECIAL_RANGE[sp];
      let ok = dist >= lo && dist <= hi;
      if (sp === 'slam' || sp === 'ironwill') {
        let near = 0;
        for (const o of world.fighters) if (o !== me && o.alive && Math.hypot(o.pos.x - me.pos.x, o.pos.z - me.pos.z) < 3.4) near++;
        ok = near >= 2 || (near >= 1 && Math.random() < 0.5);
      }
      if (ok && (sp === 'fireball' || sp === 'spear') && this.lineBlocked(me, T, world)) ok = false;
      if (ok) {
        // aim then fire
        this.wantMove = { x: nx * 0.01, z: nz * 0.01 };
        me.facing = Math.atan2(nx, nz) + (Math.random() - 0.5) * (1 - this.p.accuracy) * 0.6;
        this.press('special', 0);
        return;
      }
    }

    const lowHp = me.hp / me.maxHp < 0.25;
    const reach = 1.55 * me.def.scale + T.radius;

    // 4) back off sometimes when hurt, or after a combo
    if (now < this.planUntil && this.plan === 'retreat') {
      this.wantMove = { x: -nx * 0.7 + -nz * this.strafe * 0.7, z: -nz * 0.7 + nx * this.strafe * 0.7 };
      return;
    }
    if (lowHp && Math.random() < 0.25 * (1.2 - this.p.aggression)) {
      this.plan = 'retreat'; this.planUntil = now + 0.8 + Math.random();
      return;
    }

    // 5) close in or attack
    if (dist > reach * 0.95) {
      // approach with some circling; separate from other fighters
      let mx = nx, mz = nz;
      if (dist < 5) { mx += -nz * this.strafe * 0.45; mz += nx * this.strafe * 0.45; }
      for (const o of world.fighters) {
        if (o === me || o === T || !o.alive) continue;
        const ox = me.pos.x - o.pos.x, oz = me.pos.z - o.pos.z, od = Math.hypot(ox, oz);
        if (od < 2.2 && od > 0.01) { mx += (ox / od) * (2.2 - od) * 0.6; mz += (oz / od) * (2.2 - od) * 0.6; }
      }
      // steer round pillars
      for (const p of world.arena.pillars) {
        const px = me.pos.x - p.x, pz = me.pos.z - p.z, pd = Math.hypot(px, pz);
        if (pd < 2.4) { mx += (px / pd) * 0.8 + (-pz / pd) * this.strafe * 0.8; mz += (pz / pd) * 0.8 + (px / pd) * this.strafe * 0.8; }
      }
      const l = Math.hypot(mx, mz) || 1;
      const hesitate = Math.random() > this.p.aggression ? 0.35 : 1;
      this.wantMove = { x: (mx / l) * hesitate, z: (mz / l) * hesitate };
      if (Math.random() < 0.04) this.strafe *= -1;
      // occasional jump-in kick
      if (dist < 4 && dist > 2.6 && Math.random() < 0.05 * this.p.aggression) {
        this.press('jump', 0); this.press('kick', 0.22);
      }
      return;
    }

    // in range: face and attack
    me.facing += wrapAngle(Math.atan2(nx, nz) - me.facing) * 0.8;
    if (Math.random() < this.p.aggression) {
      const r = Math.random();
      if (r < 0.55) {
        const hits = Math.random() < this.p.combo ? 3 : 1 + (Math.random() < 0.5 ? 1 : 0);
        for (let i = 0; i < hits; i++) this.press('punch', i * 0.2);
        if (hits === 3 && Math.random() < this.p.combo * 0.3) { /* hook ends it */ }
        else if (Math.random() < this.p.combo * 0.5) this.press('kick', hits * 0.2);
      } else if (r < 0.85) {
        this.press('kick', 0);
        if (Math.random() < this.p.combo) this.press('kick', 0.32);
      } else {
        this.blockUntil = now + 0.4;
      }
      this.nextThink = now + 0.55 + this.p.reaction;
      if (Math.random() < 0.3) { this.plan = 'retreat'; this.planUntil = now + 0.9 + 0.4 * Math.random(); }
    } else {
      this.wantMove = { x: -nz * this.strafe, z: nx * this.strafe };
    }
  }

  press(action, delay) {
    this.pressQueue.push({ action, at: this._now + delay });
  }

  findThreat(me, world) {
    for (const o of world.fighters) {
      if (o === me || !o.alive) continue;
      const dx = me.pos.x - o.pos.x, dz = me.pos.z - o.pos.z, d = Math.hypot(dx, dz);
      if (d > 3) continue;
      const attacking = (o.state === 'attack' && o.attackPhase < 1.6) || (o.state === 'special' && o.specialPhase < 1);
      if (!attacking) continue;
      const da = Math.abs(wrapAngle(Math.atan2(dx, dz) - o.facing));
      if (da < 0.8) return { type: 'melee', dx: dx / d, dz: dz / d };
    }
    for (const p of world.projectiles) {
      if (p.owner === me) continue;
      const rx = me.pos.x - p.pos.x, rz = me.pos.z - p.pos.z, d = Math.hypot(rx, rz);
      if (d > 8) continue;
      if ((rx * p.dir.x + rz * p.dir.z) / d > 0.85) return { type: 'projectile', dx: p.dir.x, dz: p.dir.z };
    }
    return null;
  }

  lineBlocked(me, T, world) {
    for (let t = 0.1; t < 1; t += 0.1) {
      if (world.arena.blocksProjectile(me.pos.x + (T.pos.x - me.pos.x) * t, me.pos.z + (T.pos.z - me.pos.z) * t)) return true;
    }
    return false;
  }
}
