# Battle Arena

A 3D last-one-standing brawler in Three.js. 2 to 8 fighters, up to four people on one keyboard, CPU fighters fill the rest.

## Play
- **Easiest:** open `dist/battle-arena.html` in Chrome, Edge, Firefox or Safari. It is one self-contained file.
- **From source:** serve this folder with any static server (for example `python3 -m http.server`) and open `index.html`.
  ES modules need a server, so double-clicking `index.html` will not work.
- Rebuild the single-file versions after changing the source: `npm i --no-save esbuild && node tools/build.mjs`.

## Online play (2 to 8 browsers)
- Open `dist/battle-arena.html` (or the hosted page) in each player's browser and choose **Fight online**.
- One person picks **Host a room** and shares the 5-character code. Everyone else types it under **Join**.
  On a hosted page the lobby also shows an invite link (`?room=CODE`) that opens the join screen with the code filled in.
- In the room each player picks a fighter; the host sets fighters (2 to 8), rounds, CPU skill and sudden death, then starts.
  CPU fighters fill empty seats, a player who leaves mid-match is replaced by a CPU, and late joiners watch and fight next match.
- Online, each player uses the P1 keys (or arrows with K/L/;/O/Enter). Esc opens a menu but never pauses the shared match.
- Needs internet for the room code lookup (PeerJS's free public server); the match itself runs browser to browser over WebRTC.
  It cannot run inside the Claude Artifact preview, which blocks WebRTC: use the standalone file or a hosted copy.
- Very strict networks (some offices) can block direct connections; PeerJS's public relay servers are tried as a fallback.

How it works (`src/net/`): the host runs the only simulation. Remote players send input (movement plus running tap counters,
so a lost packet never drops a punch) and draw the match from 30 Hz snapshots, 100 ms behind the host for smooth interpolation.
Effects, announcer lines, the kill feed and every gameplay event are replayed on clients at the matching moment, so
`events` listeners (the audio pass) fire on every machine. `transport.js` wraps PeerJS; add `?net=local` to test with two tabs
of one browser and no network, or `?peerserver=host:port` to use your own PeerJS server.

## Controls (rebindable in the Controls screen, saved in the browser)
| | Move | Punch | Kick | Block | Special | Jump |
|---|---|---|---|---|---|---|
| P1 | W A S D | F | G | H | R | Space |
| P2 | Arrows | K | L | ; | O | Enter |
| P3 | Numpad 8 4 5 6 | Num 1 | Num 2 | Num 3 | Num 7 | Num 0 |
| P4 | Y B N M | U | I | J | 7 | 8 |

Esc or P pauses. Menus: arrows/WASD, Enter, Esc. When every keyboard player is out, hold X to fast-forward.

Combos: punch ×3 (ends in a hook), punch-punch-kick, kick-kick (knockdown roundhouse), jump then kick (dive kick).
Block stops frontal hits but drains a guard meter that breaks. Specials cost half the energy bar.
Sudden death (default 75 s) brings in a closing ring of fire.

## Roster
Ember (fireball), Frost (freezing breath), Titan (ground slam), Viper (poison dash), Volt (lightning strike),
Shade (teleport strike), Kane (chain spear pull), Onyx (armor buff).

## Code map (`src/`)
- `main.js` boot and wiring · `game.js` renderer, fixed 120 Hz simulation, rounds and match flow
- `fighter.js` fighter state machine, movement, attacks, hit reactions · `fighterModel.js` procedural jointed model and poses
- `specials.js` special moves and projectiles · `ai.js` CPU controller · `input.js` keyboard and human controller
- `arena.js` coliseum, lighting, crowd, fire ring, collision · `effects.js` pooled particles and FX
- `camera.js` framing camera · `hud.js` in-fight overlay · `ui.js` menus and key rebinding
- `net/session.js` online rooms, host sync and client playback · `net/transport.js` PeerJS links · `net/online-ui.js` online screens
- `events.js` event bus · `audio.js` empty hook for the sound pass · `config.js` roster, frame data, bindings, AI tuning

## Extension points for later passes
- **Audio:** subscribe to `events` (`hit`, `block`, `guardBreak`, `ko`, `swing`, `specialStart`, `special`, `thunder`,
  `spearPull`, `jump`, `land`, `wallHit`, `roundStart`, `fight`, `suddenDeath`, `roundEnd`, `matchEnd`) inside `audio.js`.
- **Online multiplayer:** built (see above). Every fighter is driven by a controller with `getIntent(fighter, world)`;
  remote players use `NetController` on the host. Online clients receive `events` too, with fighters resolved locally.
- Debug: `window.__arena.game.stats()`; `?autotest=8` starts an all-CPU match.

Three.js r180 and PeerJS 1.5.5 are vendored in `vendor/` (both MIT, see `vendor/three-LICENSE` and `vendor/peerjs-LICENSE`).
