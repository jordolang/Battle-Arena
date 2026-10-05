// In-fight overlay: fighter cards, floating name tags, announcer, KO feed.
import * as THREE from 'three';
import { ENERGY_MAX, SPECIAL_COST, PLAYER_COLORS, SPECIALS, keyLabel } from './config.js';

const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class Hud {
  constructor(root) {
    this.root = root;
    this.cardsEl = root.querySelector('#roster');
    this.tagsEl = root.querySelector('#tags');
    this.timerEl = root.querySelector('#timer');
    this.announceEl = root.querySelector('#announce');
    this.feedEl = root.querySelector('#feed');
    this.hintEl = root.querySelector('#hint');
    this.items = [];
    this.v = new THREE.Vector3();
    this.announceTimer = null;
  }

  show(on) { this.root.hidden = !on; }

  build(fighters, winsNeeded) {
    this.cardsEl.innerHTML = '';
    this.cardsEl.classList.toggle('few', fighters.length <= 4);
    this.tagsEl.innerHTML = '';
    this.feedEl.innerHTML = '';
    this.items = fighters.map((f) => {
      const color = hex(f.def.eyes);
      const who = f.label;
      const whoColor = f.labelColor;
      const card = document.createElement('div');
      card.className = 'card';
      card.style.setProperty('--fc', color);
      card.innerHTML = `
        <div class="card-top">
          <span class="who" ${whoColor ? `style="color:${whoColor}"` : ''}>${esc(who)}</span>
          <span class="nm">${esc(f.name)}</span>
          <span class="pips">${Array.from({ length: winsNeeded }, () => '<i></i>').join('')}</span>
        </div>
        <div class="bar hp"><div class="trail"></div><div class="fill"></div></div>
        <div class="bar en"><div class="fill"></div><span class="notch"></span></div>`;
      this.cardsEl.appendChild(card);
      const tag = document.createElement('div');
      tag.className = 'tag' + (f.isPlayer ? ' human' : '') + (f.isYou ? ' you' : '');
      tag.style.setProperty('--fc', whoColor || color);
      tag.innerHTML = `<span>${f.isYou ? 'You' : f.isPlayer ? esc(who) : esc(f.name)}</span><div class="mini"><div></div></div>`;
      this.tagsEl.appendChild(tag);
      return {
        f, card, tag,
        hpFill: card.querySelector('.hp .fill'), hpTrail: card.querySelector('.hp .trail'),
        enFill: card.querySelector('.en .fill'), pips: [...card.querySelectorAll('.pips i')],
        mini: tag.querySelector('.mini div'), trail: f.hp, lastHp: -1, lastEn: -1, lastWins: -1, lastAlive: true,
      };
    });
  }

  setHints(lines) {
    this.hintEl.innerHTML = lines.map((l) => `<div>${l}</div>`).join('');
    this.hintEl.classList.toggle('on', lines.length > 0);
  }

  static controlHint(index, b) {
    const k = (a) => `<kbd>${esc(keyLabel(b[a]))}</kbd>`;
    return `<b style="color:${PLAYER_COLORS[index]}">P${index + 1}</b> ${k('up')}${k('left')}${k('down')}${k('right')} move · ${k('punch')} punch · ${k('kick')} kick · ${k('block')} block · ${k('special')} special · ${k('jump')} jump`;
  }

  static onlineHint(b) {
    const k = (a) => `<kbd>${esc(keyLabel(b[0][a]))}</kbd>`;
    return `<b>You</b> ${k('up')}${k('left')}${k('down')}${k('right')} or arrows move · ${k('punch')} punch · ${k('kick')} kick · ${k('block')} block · ${k('special')} special · ${k('jump')} jump`;
  }

  announce(text, cls = '', ms = 1400) {
    const el = this.announceEl;
    el.className = '';
    void el.offsetWidth; // restart the animation
    el.textContent = text;
    el.className = 'on ' + cls;
    clearTimeout(this.announceTimer);
    if (ms > 0) this.announceTimer = setTimeout(() => { el.className = ''; }, ms);
  }

  clearAnnounce() { this.announceEl.className = ''; clearTimeout(this.announceTimer); }

  feed(html) {
    const row = document.createElement('div');
    row.className = 'feed-row';
    row.innerHTML = html;
    this.feedEl.prepend(row);
    while (this.feedEl.children.length > 5) this.feedEl.lastChild.remove();
    setTimeout(() => row.classList.add('out'), 4200);
    setTimeout(() => row.remove(), 5000);
  }

  setTimer(text, urgent) {
    this.timerEl.textContent = text;
    this.timerEl.classList.toggle('urgent', !!urgent);
  }

  update(dt, camera, width, height) {
    for (const it of this.items) {
      const f = it.f;
      const hp = Math.max(0, f.hp / f.maxHp);
      // damage trail drains after a short delay, like the classic arcade bars
      if (f.hp < it.trail) it.trail = Math.max(f.hp, it.trail - f.maxHp * dt * (f.alive ? 0.45 : 1.2));
      else it.trail = f.hp;
      if (Math.abs(hp - it.lastHp) > 0.001) {
        it.hpFill.style.transform = `scaleX(${hp})`;
        it.mini.style.transform = `scaleX(${hp})`;
        it.card.classList.toggle('low', hp < 0.25 && hp > 0);
        it.lastHp = hp;
      }
      it.hpTrail.style.transform = `scaleX(${Math.max(0, it.trail / f.maxHp)})`;
      const en = f.energy / ENERGY_MAX;
      if (Math.abs(en - it.lastEn) > 0.004) {
        it.enFill.style.transform = `scaleX(${en})`;
        it.card.classList.toggle('ready', f.energy >= SPECIAL_COST);
        it.lastEn = en;
      }
      if (f.stats.wins !== it.lastWins) {
        it.pips.forEach((p, i) => p.classList.toggle('won', i < f.stats.wins));
        it.lastWins = f.stats.wins;
      }
      if (f.alive !== it.lastAlive) {
        it.card.classList.toggle('dead', !f.alive);
        it.lastAlive = f.alive;
      }
      // floating tag above the head
      if (!f.alive) { it.tag.style.opacity = '0'; continue; }
      this.v.set(f.pos.x, f.pos.y + 2.25 * f.def.scale, f.pos.z).project(camera);
      if (this.v.z > 1) { it.tag.style.opacity = '0'; continue; }
      const x = (this.v.x * 0.5 + 0.5) * width, y = (-this.v.y * 0.5 + 0.5) * height;
      it.tag.style.opacity = '1';
      it.tag.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    }
  }
}

export function specialName(def) { return SPECIALS[def.special].label; }
