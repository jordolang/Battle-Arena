// Sponsor branding: the Jose Madrid Salsa mark, the opening title sequence and
// the "presented by" touches on the title and results screens.
// The logo is drawn here as SVG (an original badge, not an official artwork file);
// swap SPONSOR.logo for the official mark if one is supplied.

export const GAME_TITLE = 'Battle for the Salsa King';
export const SPONSOR = {
  name: 'Jose Madrid Salsa',
  site: 'josemadridsalsa.com',
  line: 'Official sponsor of the Battle for the Salsa King',
};

let uid = 0;
// A round badge: chili pepper over the name, flame ring around it.
export function sponsorLogo(size = 220) {
  const id = `jms${uid++}`;
  return `<svg class="jms-logo" width="${size}" height="${size}" viewBox="0 0 240 240" role="img" aria-label="${SPONSOR.name}">
  <defs>
    <radialGradient id="${id}bg" cx="50%" cy="42%" r="60%"><stop offset="0" stop-color="#3a0d08"/><stop offset="1" stop-color="#120403"/></radialGradient>
    <linearGradient id="${id}pep" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5a2a"/><stop offset="0.55" stop-color="#d4141c"/><stop offset="1" stop-color="#7a0a0e"/></linearGradient>
    <linearGradient id="${id}gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7a3"/><stop offset="1" stop-color="#e2a02e"/></linearGradient>
    <path id="${id}top" d="M 38 120 A 82 82 0 0 1 202 120"/>
    <path id="${id}bot" d="M 30 120 A 90 90 0 0 0 210 120"/>
  </defs>
  <circle cx="120" cy="120" r="114" fill="url(#${id}bg)" stroke="url(#${id}gold)" stroke-width="5"/>
  <circle cx="120" cy="120" r="101" fill="none" stroke="#e2a02e" stroke-opacity="0.45" stroke-width="1.5" stroke-dasharray="3 5"/>
  <text font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="25" letter-spacing="5" fill="url(#${id}gold)" text-anchor="middle">
    <textPath href="#${id}top" startOffset="50%">JOSE MADRID</textPath></text>
  <text font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="17" letter-spacing="7" fill="#ffcf7a" text-anchor="middle" dy="14">
    <textPath href="#${id}bot" startOffset="50%">★ SALSA ★</textPath></text>
  <g transform="translate(120 128) rotate(-28)">
    <path d="M -46 -6 C -40 -26 0 -24 36 -14 C 58 -8 66 4 58 10 C 40 22 -6 22 -34 14 C -50 9 -52 2 -46 -6 Z" fill="url(#${id}pep)"/>
    <path d="M -30 -10 C -10 -16 18 -14 36 -8" fill="none" stroke="#ffb08a" stroke-opacity="0.7" stroke-width="4" stroke-linecap="round"/>
    <path d="M -46 -4 C -56 -10 -60 -22 -54 -30 C -50 -36 -42 -36 -40 -30" fill="none" stroke="#3f8f2a" stroke-width="7" stroke-linecap="round"/>
    <path d="M -50 -8 C -58 -2 -60 6 -52 8 C -46 10 -42 4 -44 -2 Z" fill="#4fae34"/>
  </g>
  <path d="M 120 52 C 112 64 128 66 120 80 C 136 70 132 58 120 52 Z" fill="#ffb347" opacity="0.9"/>
</svg>`;
}

// Opening sequence: sponsor card, then the game title. Any key or click skips.
export function playIntro(onDone) {
  const el = document.createElement('div');
  el.id = 'intro';
  el.innerHTML = `
    <div class="intro-card intro-sponsor">
      ${sponsorLogo(240)}
      <div class="intro-presents">${SPONSOR.name}<span>presents</span></div>
    </div>
    <div class="intro-card intro-thanks">
      <div class="intro-eyebrow">Sponsored by</div>
      ${sponsorLogo(120)}
      <div class="intro-sponsor-name">${SPONSOR.name}</div>
      <p>${SPONSOR.line}</p>
      <div class="intro-site">${SPONSOR.site}</div>
    </div>
    <div class="intro-card intro-title">
      <div class="intro-eyebrow">${SPONSOR.name} presents</div>
      <h1 class="salsa-logo">Battle <small>for the</small> <em>Salsa King</em></h1>
    </div>
    <div class="intro-skip">Press any key to skip</div>`;
  document.getElementById('app').appendChild(el);
  const cards = [...el.querySelectorAll('.intro-card')];
  const timings = [0, 3200, 6400];
  const total = 9600;
  const timers = timings.map((t, i) => setTimeout(() => {
    cards.forEach((c, j) => c.classList.toggle('on', j === i));
  }, t + 50));
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    clearTimeout(endTimer);
    window.removeEventListener('keydown', onKey, true);
    el.classList.add('out');
    setTimeout(() => el.remove(), 700);
    onDone?.();
  };
  const onKey = (e) => { e.preventDefault(); e.stopImmediatePropagation(); finish(); };
  window.addEventListener('keydown', onKey, true);
  el.addEventListener('pointerdown', finish);
  const endTimer = setTimeout(finish, total);
}
