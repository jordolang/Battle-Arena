// Screens for online play: host or join a room, the room lobby, the in-match
// menu and the results buttons. Plugs into Menus through its onAct/onOpt/onShow hooks.
import { ROSTER, SPECIALS, DIFFICULTY } from '../config.js';
import { ONLINE_COLORS, MAX_PLAYERS, cleanCode, cleanName, saveOnlineSettings } from './session.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

const OFFLINE_HELP = 'Online play needs an internet connection and the standalone game file. It cannot connect from inside the Claude preview: open battle-arena.html in Chrome, Edge, Firefox or Safari.';

export class OnlineMenus {
  constructor({ menus, session }) {
    this.menus = menus;
    this.session = session;
    this.busy = false;
    this.screen = menus.screens.online;
    this.lobbyEl = menus.screens.lobby;
    this.nameInput = this.screen.querySelector('#net-name');
    this.codeInput = this.screen.querySelector('#net-code');
    this.statusEl = this.screen.querySelector('.net-status');
    const results = menus.screens.results.querySelector('.actions');
    this.resultsActions = results;
    this.localResults = results.innerHTML;

    this.nameInput.addEventListener('input', () => {
      session.settings.name = this.nameInput.value;
      saveOnlineSettings(session.settings);
    });
    this.codeInput.addEventListener('input', () => {
      const v = cleanCode(this.codeInput.value);
      if (v !== this.codeInput.value) this.codeInput.value = v;
    });

    session.onLobby = (back) => {
      if (this.menus.active === 'lobby') this.renderLobby(true);
      else if (back) this.menus.show('lobby');
      else if (this.menus.active === 'results') this.decorateResults();
    };
    session.onLeft = (reason) => {
      this.menus.show('online');
      this.setStatus(reason || 'You left the room.', !!reason);
    };
  }

  setStatus(text, bad = false) {
    this.statusEl.textContent = text;
    this.statusEl.classList.toggle('bad', bad);
  }

  onShow(name) {
    if (name === 'online') {
      this.nameInput.value = this.session.settings.name || '';
      if (!this.busy) this.setStatus('');
    }
    if (name === 'lobby') this.renderLobby(false);
    if (name === 'results') this.decorateResults();
  }

  async onAct(act) {
    const s = this.session;
    switch (act) {
      case 'to-online': this.menus.show('online'); break;
      case 'net-host': {
        if (this.busy) return;
        this.prepareName();
        this.busy = true;
        this.setStatus('Opening a room…');
        try {
          await s.host();
          this.menus.show('lobby');
        } catch (err) {
          this.setStatus(this.explain(err), true);
        } finally { this.busy = false; }
        break;
      }
      case 'net-join': {
        if (this.busy) return;
        const code = cleanCode(this.codeInput.value);
        if (code.length !== 5) { this.setStatus('Type the 5-character room code from the host first.', true); this.codeInput.focus(); return; }
        this.prepareName();
        this.busy = true;
        this.setStatus(`Joining room ${code}…`);
        try {
          await s.join(code);
          this.menus.show(s.game.online === 'client' ? null : 'lobby');
        } catch (err) {
          this.setStatus(this.explain(err), true);
        } finally { this.busy = false; }
        break;
      }
      case 'net-start':
      case 'net-rematch': s.startMatch(); break;
      case 'net-lobby': s.backToLobby(); this.menus.show('lobby'); break;
      case 'net-leave': s.leave(null); break;
      case 'net-resume': this.menus.hideAll(); break;
    }
  }

  onOpt(key, el, d) {
    const s = this.session;
    if (!s.connected) return;
    if (key === 'net-fighter') s.pickFighter(d);
    else if (s.isHost && key.startsWith('net-')) s.setRule(key.slice(4), d);
    this.renderLobby(true);
  }

  prepareName() {
    const s = this.session;
    s.settings.name = cleanName(this.nameInput.value);
    this.nameInput.value = s.settings.name;
    saveOnlineSettings(s.settings);
  }

  explain(err) {
    if (err?.kind === 'server' || err?.kind === 'unsupported') return `${err.message} ${OFFLINE_HELP}`;
    return err?.message || 'Something went wrong. Try again.';
  }

  renderLobby(keepFocus) {
    const s = this.session;
    const L = s.lobby;
    if (!L) return;
    const el = this.lobbyEl;
    const focused = document.activeElement;
    const focusKey = keepFocus && el.contains(focused) ? `${focused.dataset.opt || ''}|${focused.dataset.act || ''}` : null;

    el.querySelector('.room-code').textContent = L.code;
    const link = /^https?:$/.test(location.protocol) ? `${location.origin}${location.pathname}?room=${L.code}` : '';
    el.querySelector('.lobby-share').innerHTML = s.isHost
      ? `Share this code. Friends open the game, choose <b>Fight online</b> and type it in.${link ? ` Or send them <span class="invite">${esc(link)}</span>` : ''}`
      : 'You are in. The host starts the fight when everyone is ready.';

    const r = L.rules;
    const count = Math.max(r.count, L.members.length);
    const ruleRows = [
      ['count', 'Fighters', count],
      ['wins', 'Rounds to win', r.winsNeeded],
      ['diff', 'CPU skill', DIFFICULTY[r.difficulty]?.label || r.difficulty],
      ['sudden', 'Sudden death', r.suddenDeath ? `after ${r.suddenDeath}s` : 'Off'],
    ];
    el.querySelector('.net-rules').innerHTML = ruleRows.map(([k, label, v]) => s.isHost
      ? `<button class="nav opt row" data-opt="net-${k}"><span class="lbl">${label}</span><span class="val"><i>‹</i>${esc(v)}<i>›</i></span></button>`
      : `<div class="row static"><span class="lbl">${label}</span><span class="val">${esc(v)}</span></div>`).join('');

    const rows = [];
    for (let i = 0; i < count; i++) {
      const m = L.members[i];
      const fighter = m ? m.fighter : null;
      const def = fighter != null && fighter >= 0 ? ROSTER[fighter] : null;
      const mine = m && m.id === s.myId;
      const color = m ? ONLINE_COLORS[m.color] : '';
      const who = m ? `<span style="color:${color}">${esc(m.name)}</span>${mine ? '<small>You</small>' : ''}` : '<span>CPU</span>';
      const fname = m ? (def ? esc(def.name) : 'Random') : 'Random';
      const ftitle = def ? `${esc(def.title)} · ${esc(SPECIALS[def.special].label)}` : m ? 'Any of the eight' : 'Fills the empty seat';
      const inner = `<span class="fname">${fname}</span><span class="ftitle">${ftitle}</span>`;
      rows.push(`<div class="slot" style="--fc:${def ? hex(def.eyes) : '#888'}">
        <span class="slot-n">${i + 1}</span>
        <div class="who">${who}</div>
        ${mine ? `<button class="nav opt fighter" data-opt="net-fighter">${inner}</button>` : `<div class="fighter">${inner}</div>`}
      </div>`);
    }
    el.querySelector('.net-slots').innerHTML = rows.join('');

    const humans = L.members.length;
    el.querySelector('.net-note').textContent = L.inMatch
      ? 'A match is running. You join the next one.'
      : `${humans} ${humans === 1 ? 'player' : 'players'} in the room${count > humans ? `, ${count - humans} CPU` : ''}. Up to ${MAX_PLAYERS} people can join.`;
    el.querySelector('.net-actions').innerHTML = s.isHost
      ? '<button class="nav big primary" data-act="net-start">Begin the fight</button><button class="nav big" data-act="to-controls">Controls</button><button class="nav big" data-act="net-leave">Close room</button>'
      : '<span class="waiting">Waiting for the host…</span><button class="nav big" data-act="to-controls">Controls</button><button class="nav big" data-act="net-leave">Leave room</button>';

    if (focusKey) {
      const again = [...el.querySelectorAll('.nav')].find((x) => `${x.dataset.opt || ''}|${x.dataset.act || ''}` === focusKey);
      again?.focus({ preventScroll: true });
    }
  }

  // The results screen offers different buttons online: only the host restarts.
  decorateResults() {
    const s = this.session;
    const el = this.resultsActions;
    const screen = this.menus.screens.results;
    if (!s.connected) { screen.dataset.back = 'quit'; if (el.dataset.mode !== 'local') { el.innerHTML = this.localResults; el.dataset.mode = 'local'; } return; }
    const mode = s.isHost ? 'host' : 'client';
    screen.dataset.back = s.isHost ? 'net-lobby' : '';
    if (el.dataset.mode === mode) return;
    el.dataset.mode = mode;
    el.innerHTML = s.isHost
      ? '<button class="nav big primary" data-act="net-rematch">Rematch</button><button class="nav big" data-act="net-lobby">Back to the room</button><button class="nav big" data-act="net-leave">Close room</button>'
      : '<span class="waiting">The host picks a rematch or heads back to the room.</span><button class="nav big" data-act="net-leave">Leave room</button>';
    if (this.menus.active === 'results') el.querySelector('.nav')?.focus({ preventScroll: true });
  }
}
