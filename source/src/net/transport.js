// Peer-to-peer links between browsers. The host registers its room code with a
// public PeerJS signalling server, players connect to it by code, and from then
// on all traffic flows directly between browsers over WebRTC data channels.
//
// Each player has two channels to the host:
//   ctl  reliable and ordered: lobby, match start, effects and game events
//   rt   unordered: snapshots and inputs, where a late packet is worth less than a fresh one
//
// `?net=local` swaps in a BroadcastChannel transport so two tabs of one browser
// can play each other without any network (handy for testing).
// `?peerserver=host:port` points at your own PeerJS server instead of the public one.

const ID_PREFIX = 'battle-arena-v1-';
const CHANNELS = ['ctl', 'rt'];

export class TransportError extends Error {
  constructor(kind, message) { super(message); this.kind = kind; }
}

export function createTransport() {
  const params = new URLSearchParams(location.search);
  if (params.get('net') === 'local') return new LocalTransport();
  return new PeerTransport(params.get('peerserver'));
}

class BaseTransport {
  constructor() {
    this.onMessage = () => {};   // (peerId, msg, channel)
    this.onPeerJoin = () => {};  // host: a player's channels are open
    this.onPeerLeave = () => {}; // host: a player's link closed
    this.onHostLost = () => {};  // player: the link to the host closed
  }
}

class PeerTransport extends BaseTransport {
  constructor(server) {
    super();
    this.options = { debug: 1 };
    if (server) {
      const [host, port] = server.split(':');
      Object.assign(this.options, { host, port: +port || 9000, path: '/', secure: location.protocol === 'https:' });
    }
    this.peer = null;
    this.links = new Map(); // peerId -> { ctl, rt }
    this.hostId = null;
    this.closed = false;
  }

  makePeer(id) {
    const Peer = globalThis.peerjs?.Peer || globalThis.Peer;
    if (!Peer) throw new TransportError('unsupported', 'The networking library did not load.');
    if (typeof RTCPeerConnection === 'undefined') throw new TransportError('unsupported', 'This browser cannot open peer-to-peer connections.');
    return id ? new Peer(id, this.options) : new Peer(this.options);
  }

  host(code) {
    return new Promise((resolve, reject) => {
      let peer;
      try { peer = this.makePeer(ID_PREFIX + code); } catch (err) { reject(err); return; }
      let open = false;
      const timer = setTimeout(() => { if (!open) { peer.destroy(); reject(new TransportError('server', 'The matchmaking server did not answer.')); } }, 15000);
      peer.on('open', () => { open = true; clearTimeout(timer); this.peer = peer; resolve(); });
      peer.on('error', (err) => {
        if (open) { console.warn('[net]', err.type, err); return; }
        clearTimeout(timer);
        peer.destroy();
        reject(err.type === 'unavailable-id'
          ? new TransportError('taken', 'That room code is in use.')
          : new TransportError('server', 'Could not reach the matchmaking server.'));
      });
      // losing the signalling server only stops new joins; reconnect quietly
      peer.on('disconnected', () => { if (!this.closed && !peer.destroyed) setTimeout(() => { try { peer.reconnect(); } catch { /* retry later */ } }, 1500); });
      peer.on('connection', (conn) => this.adopt(conn, false));
    });
  }

  join(code) {
    return new Promise((resolve, reject) => {
      let peer;
      try { peer = this.makePeer(null); } catch (err) { reject(err); return; }
      this.peer = peer;
      this.hostId = ID_PREFIX + code;
      let done = false;
      const fail = (err) => { if (done) return; done = true; clearTimeout(timer); peer.destroy(); reject(err); };
      const timer = setTimeout(() => fail(new TransportError('timeout', 'The room did not answer. Check the code and try again.')), 20000);
      peer.on('error', (err) => {
        if (done) { console.warn('[net]', err.type, err); return; }
        if (err.type === 'peer-unavailable') fail(new TransportError('noroom', `No open room has the code ${code}.`));
        else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') fail(new TransportError('server', 'Could not reach the matchmaking server.'));
        else fail(new TransportError('failed', 'Could not connect to the room.'));
      });
      peer.on('open', () => {
        const ctl = peer.connect(this.hostId, { label: 'ctl', reliable: true, serialization: 'json' });
        const rt = peer.connect(this.hostId, { label: 'rt', reliable: false, serialization: 'json' });
        this.adopt(ctl, true);
        this.adopt(rt, true);
        const check = () => {
          const l = this.links.get(this.hostId);
          if (l?.ctl?.open && l?.rt?.open && !done) { done = true; clearTimeout(timer); resolve(); }
        };
        ctl.on('open', check);
        rt.on('open', check);
      });
    });
  }

  adopt(conn, toHost) {
    const id = conn.peer;
    if (!this.links.has(id)) this.links.set(id, {});
    const link = this.links.get(id);
    if (!CHANNELS.includes(conn.label)) { conn.close(); return; }
    link[conn.label] = conn;
    conn.on('open', () => {
      if (!toHost && link.ctl?.open && link.rt?.open && !link.announced) { link.announced = true; this.onPeerJoin(id); }
    });
    conn.on('data', (msg) => { if (msg && typeof msg === 'object') this.onMessage(id, msg, conn.label); });
    const lost = () => {
      if (this.links.get(id) !== link) return;
      this.links.delete(id);
      for (const c of CHANNELS) try { link[c]?.close(); } catch { /* already closed */ }
      if (this.closed) return;
      if (toHost) this.onHostLost(); else if (link.announced) this.onPeerLeave(id);
    };
    conn.on('close', lost);
    conn.on('error', lost);
  }

  send(peerId, msg, channel = 'ctl') {
    const c = this.links.get(peerId)?.[channel];
    if (c?.open) try { c.send(msg); } catch (err) { console.warn('[net] send failed', err); }
  }

  sendHost(msg, channel = 'ctl') { this.send(this.hostId, msg, channel); }

  broadcast(msg, channel = 'ctl') { for (const id of this.links.keys()) this.send(id, msg, channel); }

  kick(peerId) {
    const link = this.links.get(peerId);
    this.links.delete(peerId);
    if (link) setTimeout(() => { for (const c of CHANNELS) try { link[c]?.close(); } catch { /* ignore */ } }, 300);
  }

  close() {
    this.closed = true;
    for (const link of this.links.values()) for (const c of CHANNELS) try { link[c]?.close(); } catch { /* ignore */ }
    this.links.clear();
    try { this.peer?.destroy(); } catch { /* ignore */ }
  }
}

// Same interface over BroadcastChannel: tabs of one browser only.
class LocalTransport extends BaseTransport {
  constructor() {
    super();
    this.id = 'tab-' + Math.random().toString(36).slice(2, 10);
    this.bc = null;
    this.peers = new Set();
    this.hostId = null;
    this.isHost = false;
    this.unload = () => this.close();
    window.addEventListener('pagehide', this.unload);
  }
  open(code) {
    this.bc = new BroadcastChannel('battle-arena-room-' + code);
    this.bc.onmessage = (e) => this.receive(e.data);
  }
  post(to, kind, msg, ch) { this.bc?.postMessage({ from: this.id, to, kind, msg, ch }); }
  host(code) {
    return new Promise((resolve, reject) => {
      this.open(code);
      let taken = false;
      this.probe = () => { taken = true; };
      this.post('*', 'probe');
      setTimeout(() => {
        this.probe = null;
        if (taken) { this.bc.close(); reject(new TransportError('taken', 'That room code is in use.')); return; }
        this.isHost = true;
        resolve();
      }, 250);
    });
  }
  join(code) {
    return new Promise((resolve, reject) => {
      this.open(code);
      this.joined = () => { clearTimeout(timer); resolve(); };
      const timer = setTimeout(() => { this.joined = null; this.bc.close(); reject(new TransportError('noroom', `No open room has the code ${code}.`)); }, 1500);
      this.post('*', 'hi');
    });
  }
  receive(d) {
    if (!d || d.from === this.id || (d.to !== '*' && d.to !== this.id)) return;
    if (d.kind === 'probe') { if (this.isHost) this.post(d.from, 'here'); return; }
    if (d.kind === 'here') { this.probe?.(); return; }
    if (d.kind === 'hi' && this.isHost) { this.peers.add(d.from); this.post(d.from, 'ok'); this.onPeerJoin(d.from); return; }
    if (d.kind === 'ok' && this.joined) { this.hostId = d.from; this.joined(); this.joined = null; return; }
    if (d.kind === 'bye') {
      if (this.isHost && this.peers.delete(d.from)) this.onPeerLeave(d.from);
      else if (d.from === this.hostId) { this.hostId = null; this.onHostLost(); }
      return;
    }
    if (d.kind === 'm') this.onMessage(d.from, d.msg, d.ch);
  }
  send(peerId, msg, channel = 'ctl') { this.post(peerId, 'm', msg, channel); }
  sendHost(msg, channel = 'ctl') { if (this.hostId) this.send(this.hostId, msg, channel); }
  broadcast(msg, channel = 'ctl') { for (const p of this.peers) this.send(p, msg, channel); }
  kick(peerId) { this.peers.delete(peerId); }
  close() {
    if (!this.bc) return;
    this.post('*', 'bye');
    this.bc.close();
    this.bc = null;
    window.removeEventListener('pagehide', this.unload);
  }
}
