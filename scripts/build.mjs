// Builds every SVG used by the profile README.
//   node scripts/build.mjs
// Needs GITHUB_TOKEN (or GH_TOKEN) for the activity and language panels.
// Without a token only the static panels are rebuilt.

import { mkdir, readFile, writeFile } from 'node:fs/promises';

const LOGIN = 'mpgamer75';
const OUT = new URL('../assets/', import.meta.url);
const SRC = new URL('./src/', import.meta.url);

const WHOAMI = [
  'Charles Lantigua Jorge',
  'cybersecurity engineer / software engineer',
  'Paris, FR',
  'github.com/mpgamer75',
  '',
].join('\n');

const C = {
  bg: '#0a0b0e',
  raised: '#101216',
  line: '#24262c',
  track: '#1a1c21',
  ink: '#f3efe8',
  soft: '#b9b3a8',
  muted: '#7d786f',
  amber: '#f0a23b',
  hot: '#ffcf85',
  deep: '#6b3f0c',
};

const MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const r1 = (n) => Math.round(n * 10) / 10;

const STYLE = `
    .mono { font-family: ${MONO}; }
    .sans { font-family: ${SANS}; }
    .ink { fill: ${C.ink}; } .soft { fill: ${C.soft}; } .muted { fill: ${C.muted}; }
    .amber { fill: ${C.amber}; } .hot { fill: ${C.hot}; } .faint { fill: ${C.line}; }
    .rule { stroke: ${C.line}; fill: none; }
    .sa { stroke: ${C.amber}; fill: none; }
    @keyframes rise { from { opacity: 0; transform: translateY(8px); } }
    @keyframes fade { from { opacity: 0; } }
    @keyframes blink { 50% { opacity: 0; } }
    @keyframes pulse { 0%, 100% { opacity: .25; } 50% { opacity: 1; } }`;

const REDUCED = `@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }`;

function svg(w, h, title, desc, body, extraStyle = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="t d">
  <title id="t">${esc(title)}</title>
  <desc id="d">${esc(desc)}</desc>
  <style>${STYLE}${extraStyle}
    ${REDUCED}
  </style>
${body}
</svg>
`;
}

// A light that travels round the border of a panel.
function beam(w, h, rx = 16) {
  const p = Math.round(2 * (w + h - 4 * rx) + 2 * Math.PI * rx);
  const dur = Math.round(p / 300);
  const dash = `stroke-dasharray="${Math.round(p * 0.07)} ${p - Math.round(p * 0.07)}"`;
  const anim = `<animate attributeName="stroke-dashoffset" from="${p}" to="0" dur="${dur}s" repeatCount="indefinite"/>`;
  const rect = `x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="${rx}" fill="none" stroke-linecap="round"`;
  return `<rect ${rect} stroke="${C.amber}" stroke-width="5" opacity=".16" ${dash}>${anim}</rect><rect ${rect} stroke="${C.hot}" stroke-width="1.4" ${dash}>${anim}</rect>`;
}

const panel = (w, h, rx = 16) =>
  `<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="${rx}" fill="${C.bg}" stroke="${C.line}"/>${beam(w, h, rx)}`;

// Monospace text on a fixed grid: every glyph gets its own x, so columns line
// up whatever monospace font the viewer ends up with.
function grid(runs, x, y, cell, size) {
  let col = 0;
  const spans = runs
    .map(([text, cls]) => {
      const xs = [...text].map((_, i) => r1(x + (col + i) * cell)).join(' ');
      col += text.length;
      return text.trim() ? `<tspan class="${cls}" x="${xs}">${esc(text)}</tspan>` : '';
    })
    .join('');
  return `<text class="mono" y="${y}" font-size="${size}" xml:space="preserve">${spans}</text>`;
}

function wrap(text, max) {
  const lines = [''];
  for (const word of text.split(' ')) {
    const cur = lines[lines.length - 1];
    if (cur && (cur + ' ' + word).length > max) lines.push(word);
    else lines[lines.length - 1] = cur ? cur + ' ' + word : word;
  }
  return lines;
}

// ---------------------------------------------------------------- hero

// Deterministic noise, so rebuilding does not change the file.
function rng(seed) {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

function hero(jpeg) {
  const W = 1200;
  const H = 514;
  const X = 64;
  const rand = rng(75);
  const lines = [
    'I build security tooling for the terminal.',
    'I ship web and mobile software.',
    'Co-founder of Lanjo Technologies.',
  ];
  const meta = [
    ['BASED IN', 'Paris, France', X],
    ['CO-FOUNDER', 'Lanjo Technologies', X + 190],
    ['FOCUS', 'Recon / applied crypto / SOC tooling', X + 430],
    ['SPEAKS', 'EN / FR / ES', X + 830],
  ];

  // threat-map overlay, laid over the map on the monitor wall
  const city = { par: [785, 112], sdq: [700, 166], nyc: [684, 138], sao: [722, 203], jnb: [806, 200], dxb: [838, 150], tyo: [892, 96], sgp: [876, 134], syd: [938, 207] };
  const links = [['par', 'sdq'], ['par', 'nyc'], ['par', 'tyo'], ['par', 'jnb'], ['sdq', 'sao'], ['par', 'dxb'], ['dxb', 'sgp'], ['sgp', 'syd']];
  const arcs = links
    .map(([a, b], i) => {
      const [x1, y1] = city[a];
      const [x2, y2] = city[b];
      const lift = Math.hypot(x2 - x1, y2 - y1) * 0.32;
      const d = `M${x1} ${y1}Q${(x1 + x2) / 2} ${r1((y1 + y2) / 2 - lift)} ${x2} ${y2}`;
      const dur = r1(2.2 + (i % 3) * 0.5);
      const begin = r1(2.4 + i * 0.5);
      return `<path class="arc" style="animation-delay:${r1(1.4 + i * 0.5)}s" pathLength="1" d="${d}"/>
      <circle r="2.6" fill="#fff3d6" opacity="0"><animateMotion dur="${dur}s" begin="${begin}s" repeatCount="indefinite" path="${d}"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.1;.85;1" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/></circle>`;
    })
    .join('\n      ');
  const nodes = Object.entries(city)
    .map(
      ([k, [x, y]], i) =>
        `<circle class="ping" style="animation-delay:${r1(i * 0.45)}s" cx="${x}" cy="${y}" r="9" fill="none" stroke="${C.hot}"/><circle cx="${x}" cy="${y}" r="${k === 'par' ? 4 : 2.6}" fill="${k === 'par' ? '#fff3d6' : C.hot}"/>`,
    )
    .join('\n      ');
  const [px, py] = city.par;

  // kicker: every character resolves out of noise
  const kicker = 'CYBERSECURITY  x  SOFTWARE';
  const pool = '#$%01<>/[]{}*+=?';
  const cell = 13.2;
  const decode = [...kicker]
    .map((ch, i) => {
      if (ch === ' ') return '';
      const x = r1(X + i * cell);
      const t0 = 0.4 + i * 0.05;
      const noise = [0, 1, 2]
        .map((k) => `<text class="mono muted sc" style="animation-delay:${r1(t0 + k * 0.09)}s" x="${x}" y="186" font-size="16">${esc(pool[Math.floor(rand() * pool.length)])}</text>`)
        .join('');
      return `${noise}<text class="mono amber fin" style="animation-delay:${r1(t0 + 0.27)}s" x="${x}" y="186" font-size="16">${ch}</text>`;
    })
    .join('');

  const name = (cls) =>
    `<text class="sans ${cls}" x="${X - 4}" y="262" font-size="74" font-weight="700" letter-spacing="-2.2">Charles Lantigua Jorge</text>`;

  const body = `  <defs>
    <clipPath id="r"><rect width="${W}" height="${H}" rx="18"/></clipPath>
    <clipPath id="s1"><rect x="0" y="206" width="${W}" height="19"/></clipPath>
    <clipPath id="s2"><rect x="0" y="238" width="${W}" height="15"/></clipPath>
    <linearGradient id="shade" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#050506" stop-opacity=".97"/>
      <stop offset=".42" stop-color="#050506" stop-opacity=".8"/>
      <stop offset=".7" stop-color="#050506" stop-opacity=".12"/>
      <stop offset="1" stop-color="#050506" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="floor" x1="0" x2="0" y1="0" y2="1">
      <stop offset=".5" stop-color="#050506" stop-opacity="0"/>
      <stop offset="1" stop-color="#050506" stop-opacity=".94"/>
    </linearGradient>
    <linearGradient id="sweep" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="${C.hot}" stop-opacity="0"/>
      <stop offset=".85" stop-color="${C.hot}" stop-opacity=".12"/>
      <stop offset="1" stop-color="${C.hot}" stop-opacity=".34"/>
    </linearGradient>
    <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" opacity=".28"/></pattern>
  </defs>
  <g clip-path="url(#r)">
    <rect width="${W}" height="${H}" fill="#050506"/>
    <g class="drift">
      <image width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice" xlink:href="data:image/jpeg;base64,${jpeg}" href="data:image/jpeg;base64,${jpeg}"/>
      ${arcs}
      ${nodes}
      <g><circle cx="${px}" cy="${py}" r="17" fill="none" stroke="#fff3d6" stroke-width="1.2" stroke-dasharray="5 7"/><animateTransform attributeName="transform" type="rotate" from="0 ${px} ${py}" to="360 ${px} ${py}" dur="9s" repeatCount="indefinite"/></g>
      <g><circle cx="${px}" cy="${py}" r="25" fill="none" stroke="${C.hot}" stroke-width="1" stroke-dasharray="2 12" opacity=".8"/><animateTransform attributeName="transform" type="rotate" from="360 ${px} ${py}" to="0 ${px} ${py}" dur="14s" repeatCount="indefinite"/></g>
      <text class="mono" x="${px + 32}" y="${py - 14}" font-size="11" letter-spacing="1.5" fill="#fff3d6">PAR</text>
      <text class="mono" x="${city.sdq[0] - 38}" y="${city.sdq[1] + 4}" font-size="11" letter-spacing="1.5" fill="${C.hot}">SDQ</text>
    </g>
    <rect width="${W}" height="${H}" fill="url(#scan)"/>
    <rect width="${W}" height="${H}" fill="url(#shade)"/>
    <rect width="${W}" height="${H}" fill="url(#floor)"/>
    <rect class="sweep" x="-260" y="0" width="260" height="${H}" fill="url(#sweep)"/>

    <g class="in" style="animation-delay:.1s">
      <rect class="amber" x="${X}" y="57" width="9" height="9"/>
      <text class="mono soft" x="${X + 20}" y="67" font-size="15" letter-spacing="1.5">MPGAMER75</text>
      <text class="mono muted" x="${X + 138}" y="67" font-size="15" letter-spacing="1.5">/  48.8566 N  2.3522 E</text>
    </g>

    ${decode}
    <g class="in" style="animation-delay:.5s">
      <g class="jit">${name('ink')}</g>
      <g class="gl1" clip-path="url(#s1)">${name('amber')}</g>
      <g class="gl2" clip-path="url(#s2)">${name('hot')}</g>
    </g>
    <rect class="amber underline" x="${X}" y="288" width="96" height="3"/>

    ${lines.map((l, i) => `<text class="sans soft rot${i ? '' : ' first'}" style="animation-delay:${1.2 + i * 4}s" x="${X}" y="338" font-size="27">${esc(l)}</text>`).join('\n    ')}

    <g class="in" style="animation-delay:1s">
      <line x1="${X}" y1="408" x2="${W - X}" y2="408" stroke="#3a3530"/>
      ${meta
        .map(
          ([k, v, x]) => `<text class="mono muted" x="${x}" y="440" font-size="13" letter-spacing="2">${k}</text>
      <text class="sans ink" x="${x}" y="466" font-size="18">${esc(v)}</text>`,
        )
        .join('\n      ')}
    </g>

    <path class="sa" stroke-width="1.5" d="M24 44V24H44M${W - 44} 24H${W - 24}V44M24 ${H - 44}V${H - 24}H44M${W - 44} ${H - 24}H${W - 24}V${H - 44}" opacity=".75"/>
  </g>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="18" fill="none" stroke="${C.line}"/>
  ${beam(W, H, 18)}`;

  return svg(
    W,
    H,
    'Charles Lantigua Jorge',
    'Cybersecurity engineer and software engineer based in Paris, co-founder of Lanjo Technologies. Security tooling for the terminal, web and mobile software.',
    body,
    `
    .drift { transform-origin: 70% 40%; animation: drift 26s ease-in-out infinite alternate; }
    .arc { fill: none; stroke: ${C.hot}; stroke-width: 1.4; stroke-linecap: round; stroke-dasharray: 1; stroke-dashoffset: 1; animation: arc 9s ease-in-out infinite; }
    .ping { transform-box: fill-box; transform-origin: center; animation: ping 3.2s ease-out infinite; }
    .sweep { animation: sweep 9s cubic-bezier(.6,0,.3,1) infinite; }
    .in { animation: rise .9s cubic-bezier(.2,.8,.2,1) both; }
    .sc { opacity: 0; animation: on .09s linear; }
    .fin { animation: fade .02s steps(1) both; }
    .jit { animation: jit 7s steps(1) infinite; }
    .gl1 { opacity: 0; animation: gl1 7s steps(1) infinite; }
    .gl2 { opacity: 0; animation: gl2 7s steps(1) infinite; }
    .underline { transform-box: fill-box; transform-origin: 0 50%; animation: draw 1s cubic-bezier(.2,.8,.2,1) .9s both; }
    .rot { opacity: 0; animation: rot 12s linear infinite; }
    @keyframes drift { from { transform: scale(1); } to { transform: scale(1.07); } }
    @keyframes arc { 0% { stroke-dashoffset: 1; opacity: 1; } 22%, 70% { stroke-dashoffset: 0; opacity: 1; } 86%, 100% { stroke-dashoffset: 0; opacity: 0; } }
    @keyframes ping { from { transform: scale(.3); opacity: 1; } to { transform: scale(1.6); opacity: 0; } }
    @keyframes sweep { 0%, 55% { transform: translateX(0); } 100% { transform: translateX(${W + 300}px); } }
    @keyframes on { from, to { opacity: 1; } }
    @keyframes draw { from { transform: scaleX(0); } }
    @keyframes jit { 0%, 91%, 97%, 100% { transform: none; } 92% { transform: translateX(3px) skewX(-4deg); } 94% { transform: translateX(-2px); } 96% { transform: skewX(2deg); } }
    @keyframes gl1 { 0%, 91%, 97%, 100% { opacity: 0; } 92% { opacity: .95; transform: translateX(-14px); } 94% { opacity: .95; transform: translateX(9px); } 96% { opacity: .95; transform: translateX(-4px); } }
    @keyframes gl2 { 0%, 91%, 97%, 100% { opacity: 0; } 92% { opacity: .95; transform: translateX(12px); } 94% { opacity: .95; transform: translateX(-16px); } 96% { opacity: .95; transform: translateX(5px); } }
    @keyframes rot {
      0% { opacity: 0; transform: translateY(10px); }
      3%, 30% { opacity: 1; transform: none; }
      33.3%, 100% { opacity: 0; transform: translateY(-10px); }
    }
    @media (prefers-reduced-motion: reduce) { .rot.first { opacity: 1; } .sweep { display: none; } .arc { stroke-dashoffset: 0; } }`,
  );
}

// ---------------------------------------------------------------- terminal

function terminal() {
  const W = 1200;
  const X = 56;
  const SIZE = 19;
  const CELL = 11.6;
  const LH = 30;
  const top = 164;
  const cmd = 'hexdump -C whoami';
  const typed = 1.9;
  const nameLen = Buffer.byteLength(WHOAMI.split('\n')[0]);
  const bytes = [...Buffer.from(WHOAMI, 'utf8')];
  const rows = [];
  for (let off = 0; off < bytes.length; off += 16) rows.push({ off, bytes: bytes.slice(off, off + 16) });

  const lines = rows.map(({ off, bytes: b }, i) => {
    const runs = [[off.toString(16).padStart(8, '0') + '  ', 'muted']];
    for (let k = 0; k < 16; k++) {
      const cls = off + k < nameLen ? 'amber' : 'soft';
      runs.push([k < b.length ? b[k].toString(16).padStart(2, '0') : '  ', cls], [k === 7 ? '  ' : ' ', 'soft']);
    }
    runs.push([' |', 'faint']);
    b.forEach((v, k) => runs.push([v >= 32 && v < 127 ? String.fromCharCode(v) : '.', off + k < nameLen ? 'amber' : 'ink']));
    runs.push(['|', 'faint']);
    return `<g class="row" style="animation-delay:${r1(typed + 0.25 + i * 0.13)}s">${grid(runs, X, top + i * LH, CELL, SIZE)}</g>`;
  });
  const endY = top + rows.length * LH;
  const H = endY + 40;
  const typing = [...cmd]
    .map((ch, i) =>
      ch === ' ' ? '' : `<text class="mono ink ch" style="animation-delay:${r1(0.4 + (i * (typed - 0.4)) / cmd.length)}s" x="${r1(X + (2 + i) * CELL)}" y="116" font-size="${SIZE}">${esc(ch)}</text>`,
    )
    .join('');

  const body = `  ${panel(W, H)}
  <path d="M.5 58H${W - 0.5}" class="rule"/>
  <circle cx="${X + 6}" cy="30" r="6" fill="${C.line}"/><circle cx="${X + 28}" cy="30" r="6" fill="${C.line}"/><circle cx="${X + 50}" cy="30" r="6" fill="${C.line}"/>
  <text class="mono muted" x="${W / 2}" y="35" font-size="14" letter-spacing="1" text-anchor="middle">charles@paris: ~</text>
  ${grid([['$', 'amber']], X, 116, CELL, SIZE)}
  ${typing}
  ${lines.join('\n  ')}
  <g class="row" style="animation-delay:${r1(typed + 0.25 + rows.length * 0.13)}s">${grid([[bytes.length.toString(16).padStart(8, '0'), 'muted']], X, endY, CELL, SIZE)}<rect class="amber cursor" x="${r1(X + 9 * CELL)}" y="${endY - 16}" width="10" height="19"/></g>`;

  return svg(W, H, 'hexdump -C whoami', `A hexdump of: ${WHOAMI.trim().split('\n').join(', ')}.`, body, `
    .row { animation: rise .45s ease-out both; }
    .ch { animation: fade .05s steps(1) both; }
    .cursor { animation: blink 1.1s steps(1) infinite; }`);
}

// ---------------------------------------------------------------- project cards

const CW = 590;
const BAND = 136;

const motifs = {
  radar() {
    const cx = 478;
    const cy = BAND / 2;
    const ids = [['T1595', 'Active Scanning'], ['T1046', 'Network Service Discovery'], ['T1190', 'Exploit Public-Facing App']];
    const blips = [[22, -34, 0.35], [40, 18, 1.4], [-30, 30, 2.6], [-38, -22, 3.3]];
    return `<g>
      ${[19, 38, 57].map((r) => `<circle cx="${cx}" cy="${cy}" r="${r}" class="rule" stroke-opacity=".9"/>`).join('')}
      <path class="rule" d="M${cx - 64} ${cy}H${cx + 64}M${cx} ${cy - 64}V${cy + 64}"/>
      <g><path d="M${cx} ${cy}L${cx} ${cy - 57}A57 57 0 0 1 ${r1(cx + 40.3)} ${r1(cy - 40.3)}Z" fill="${C.amber}" opacity=".2"/>
        <path d="M${cx} ${cy}L${r1(cx + 40.3)} ${r1(cy - 40.3)}" stroke="${C.hot}" stroke-width="1.5"/>
        <animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="4s" repeatCount="indefinite"/></g>
      ${blips.map(([dx, dy, t]) => `<circle cx="${cx + dx}" cy="${cy + dy}" r="3" fill="${C.hot}" opacity="0"><animate attributeName="opacity" values="0;1;0" keyTimes="0;.08;1" dur="4s" begin="${t}s" repeatCount="indefinite"/></circle>`).join('')}
      ${ids.map(([id, name], i) => `<g class="tick" style="animation-delay:${i * 1.3}s"><text class="mono amber" x="32" y="${48 + i * 28}" font-size="14">${id}</text><text class="mono muted" x="92" y="${48 + i * 28}" font-size="14">${name}</text></g>`).join('')}
    </g>`;
  },
  cipher() {
    const plain = 'ENCRYPTOR/3 file';
    const hex = ['9f', '3a', 'c1', '07', 'e4', '5b', 'd2', '88', '1e', 'a6', '70', 'f3', '2c', 'b9', '44', '0d'];
    const cell = 32;
    const x0 = (CW - plain.length * cell) / 2;
    return `<g>
      ${[...plain].map((ch, i) => {
        const x = x0 + i * cell;
        const d = `animation-delay:${r1(i * 0.16)}s`;
        return `<rect x="${x + 2}" y="34" width="${cell - 4}" height="38" rx="5" fill="${C.raised}" stroke="${C.line}"/>
      <text class="mono ink pa" style="${d}" x="${x + cell / 2}" y="59" font-size="16" text-anchor="middle">${esc(ch === ' ' ? '_' : ch)}</text>
      <text class="mono amber pb" style="${d}" x="${x + cell / 2}" y="59" font-size="15" text-anchor="middle">${hex[i]}</text>`;
      }).join('\n      ')}
      <text class="mono muted" x="${CW / 2}" y="104" font-size="14" text-anchor="middle" letter-spacing=".5">scrypt  &gt;  cipher  &gt;  HMAC-SHA256  /  encrypt-then-MAC</text>
    </g>`;
  },
  logs() {
    const rows = [
      ['02:14:07', 'auth', 'login ok        user=m.reyes    src=10.4.2.11', 0],
      ['02:14:09', 'auth', 'FAILED LOGIN    user=svc-backup src=10.4.2.19', 1],
      ['02:14:09', 'auth', 'FAILED LOGIN    user=svc-backup src=10.4.2.19', 1],
      ['02:14:12', 'diff', 'export_0611.xlsx  3 rows changed', 0],
      ['02:14:15', 'auth', 'login ok        user=a.diaz     src=10.4.3.40', 0],
      ['02:14:18', 'rprt', 'consolidated report written', 0],
    ];
    const lh = 24;
    const one = (yo) =>
      rows
        .map(([t, k, m, hot], i) => `<text class="mono" x="32" y="${yo + i * lh}" font-size="13.5" xml:space="preserve"><tspan class="muted">${t}  </tspan><tspan class="${hot ? 'amber' : 'muted'}">${k}  </tspan><tspan class="${hot ? 'hot' : 'soft'}">${esc(m)}</tspan></text>`)
        .join('');
    return `<g><g>${one(26)}${one(26 + rows.length * lh)}
      <animateTransform attributeName="transform" type="translate" from="0 0" to="0 ${-rows.length * lh}" dur="11s" repeatCount="indefinite"/></g></g>`;
  },
  orbit() {
    const cx = CW / 2;
    const cy = BAND / 2 + 2;
    const rings = [[230, 44, 9, 0], [160, 30, 6.5, -2], [92, 17, 4.5, -1]];
    return `<g>
      <circle cx="${cx}" cy="${cy}" r="34" fill="${C.amber}" opacity=".1"/>
      ${rings
        .map(([rx, ry, dur, begin], i) => {
          const d = `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0`;
          return `<path d="${d}" class="rule" transform="rotate(-9 ${cx} ${cy})"/>
      <g transform="rotate(-9 ${cx} ${cy})"><circle r="${i === 0 ? 4.5 : 3.5}" fill="${i === 1 ? C.ink : C.hot}"><animateMotion dur="${dur}s" begin="${begin}s" repeatCount="indefinite" path="${d}"/></circle></g>`;
        })
        .join('\n      ')}
      <circle cx="${cx}" cy="${cy}" r="9" fill="${C.amber}"/><circle class="halo" cx="${cx}" cy="${cy}" r="16" fill="none" stroke="${C.amber}"/>
    </g>`;
  },
  browser() {
    const x = 120;
    const w = CW - 2 * x;
    const blocks = [[x + 18, 58, 150, 12], [x + 18, 78, 96, 8], [x + 18, 98, 60, 18], [x + 204, 54, w - 222, 64]];
    return `<g>
      <rect x="${x}" y="20" width="${w}" height="${BAND}" rx="10" fill="${C.raised}" stroke="${C.line}"/>
      <path class="rule" d="M${x} 44H${x + w}"/>
      <circle cx="${x + 16}" cy="32" r="3.5" fill="${C.line}"/><circle cx="${x + 28}" cy="32" r="3.5" fill="${C.line}"/>
      <text class="mono muted" x="${x + 46}" y="36" font-size="11">orthoprotesis-francis-valerio.vercel.app</text>
      ${blocks.map(([bx, by, bw, bh], i) => `<rect class="sk" style="animation-delay:${i * 0.35}s" x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="3" fill="${i === 2 ? C.amber : C.line}"/>`).join('')}
    </g>`;
  },
  prompt() {
    const chapters = ['Ultramarines', 'Blood Angels', 'Dark Angels', 'Space Wolves', 'Imperial Fists'];
    return `<g>
      <text class="mono muted" x="32" y="50" font-size="14" letter-spacing="2">IMPERIAL COMMAND TERMINAL</text>
      <path class="rule" d="M32 64H${CW - 32}"/>
      <text class="mono amber" x="32" y="100" font-size="19">chapter &gt;</text>
      ${chapters.map((c, i) => `<text class="mono ink cyc${i ? '' : ' first'}" style="animation-delay:${i * 2}s" x="150" y="100" font-size="19">${c}</text>`).join('')}
      <rect class="amber cursor" x="${CW - 44}" y="84" width="10" height="20"/>
    </g>`;
  },
};

const CARDS = [
  { file: 'security-scanner', motif: 'radar', title: 'security-scanner', desc: 'Recon tool for authorized penetration tests. OSINT, network and web stages, findings mapped to MITRE ATT&CK, one offline HTML report.', tags: ['Bash', 'Python', 'Docker'] },
  { file: 'encryptor', motif: 'cipher', title: 'encryptor', desc: 'Authenticated file encryption and X.509 toolkit in nothing but Bash and OpenSSL. A format you can decrypt by hand.', tags: ['Bash', 'OpenSSL', 'CI tested'] },
  { file: 'soc-automation', motif: 'logs', title: 'SOC automation', desc: 'Tooling written for the SOC team at Altice Dominicana: an export comparator and a failed-login report generator.', tags: ['Python', 'TypeScript', 'SQLite'] },
  { file: 'portfolio', motif: 'orbit', title: 'Portfolio', desc: 'My personal site. The skills section is an orbital map rendered in WebGL with hand-written shaders and no textures.', tags: ['Next.js', 'TypeScript', 'WebGL'] },
  { file: 'dental-clinic', motif: 'browser', title: 'dental-clinic', desc: 'Client work through Lanjo: the production website of a dental clinic in Santiago de los Caballeros.', tags: ['TypeScript', 'Vercel'] },
  { file: 'imperial-terminal', motif: 'prompt', title: 'Imperial terminal', desc: 'The one I made for fun: a Warhammer 40K theme for zsh and bash, around fifty commands and five playable chapters.', tags: ['Zsh', 'Bash', 'ShellCheck'] },
];

function card(c, n) {
  const H = 348;
  const lines = wrap(c.desc, 66);
  let tx = 32;
  const tags = c.tags
    .map((t) => {
      const w = Math.round(t.length * 8.2 + 24);
      const out = `<rect x="${tx}" y="${H - 58}" width="${w}" height="28" rx="14" fill="none" stroke="${C.line}"/><text class="mono soft" x="${tx + w / 2}" y="${H - 39.5}" font-size="13" text-anchor="middle">${esc(t)}</text>`;
      tx += w + 8;
      return out;
    })
    .join('');

  const body = `  <defs><clipPath id="band"><path d="M0 16A16 16 0 0 1 16 0H${CW - 16}A16 16 0 0 1 ${CW} 16V${BAND}H0Z"/></clipPath></defs>
  ${panel(CW, H)}
  <g clip-path="url(#band)">
    <rect width="${CW}" height="${BAND}" fill="#0d0e12"/>
    ${motifs[c.motif]()}
  </g>
  <path class="rule" d="M.5 ${BAND}H${CW - 0.5}"/>
  <rect x=".5" y=".5" width="${CW - 1}" height="${H - 1}" rx="16" fill="none" stroke="${C.line}"/>
  ${beam(CW, H)}
  <text class="mono amber" x="32" y="${BAND + 42}" font-size="13" letter-spacing="2">${String(n).padStart(2, '0')}</text>
  <text class="sans ink" x="64" y="${BAND + 45}" font-size="25" font-weight="700" letter-spacing="-.4">${esc(c.title)}</text>
  <path class="sa arrow" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M${CW - 52} ${BAND + 46}L${CW - 36} ${BAND + 30}M${CW - 48} ${BAND + 30}H${CW - 36}V${BAND + 42}"/>
  ${lines.map((l, i) => `<text class="sans soft" x="32" y="${BAND + 80 + i * 24}" font-size="16.5">${esc(l)}</text>`).join('\n  ')}
  ${tags}`;

  return svg(CW, H, c.title, c.desc, body, `
    .tick { animation: tick 3.9s ease-in-out infinite; }
    .pa { animation: pa 5s ease-in-out infinite; } .pb { opacity: 0; animation: pb 5s ease-in-out infinite; }
    .halo { transform-box: fill-box; transform-origin: center; animation: halo 2.8s ease-out infinite; }
    .sk { animation: pulse 2.6s ease-in-out infinite; }
    .cyc { opacity: 0; animation: cyc 10s linear infinite; }
    .cursor { animation: blink 1.1s steps(1) infinite; }
    .arrow { animation: nudge 2.4s ease-in-out infinite; }
    @keyframes tick { 0%, 100% { opacity: .35; } 12%, 30% { opacity: 1; } 45% { opacity: .35; } }
    @keyframes pa { 0%, 22% { opacity: 1; } 30%, 78% { opacity: 0; } 86%, 100% { opacity: 1; } }
    @keyframes pb { 0%, 22% { opacity: 0; } 30%, 78% { opacity: 1; } 86%, 100% { opacity: 0; } }
    @keyframes halo { from { transform: scale(.6); opacity: .9; } to { transform: scale(2.2); opacity: 0; } }
    @keyframes cyc { 0% { opacity: 0; } 2%, 18% { opacity: 1; } 20%, 100% { opacity: 0; } }
    @keyframes nudge { 50% { transform: translate(3px, -3px); } }
    @media (prefers-reduced-motion: reduce) { .cyc.first { opacity: 1; } }`);
}

// ---------------------------------------------------------------- stack

const STACK = [
  ['SECURITY', [['Recon / OSINT'], ['MITRE ATT&CK'], ['nmap'], ['OpenSSL'], ['X.509 / PKI'], ['SOC tooling']]],
  ['LANGUAGES', [['Bash', 'gnubash'], ['Python', 'python'], ['TypeScript', 'typescript'], ['JavaScript', 'javascript'], ['PowerShell'], ['Dart', 'dart'], ['Java', 'openjdk'], ['C', 'c']]],
  ['WEB AND MOBILE', [['Next.js', 'nextdotjs'], ['React', 'react'], ['Tailwind CSS', 'tailwindcss'], ['Flutter', 'flutter']]],
  ['DATA', [['PostgreSQL', 'postgresql'], ['Supabase', 'supabase'], ['Firebase', 'firebase'], ['SQLite', 'sqlite']]],
  ['SYSTEMS', [['Linux', 'linux'], ['Docker', 'docker'], ['GitHub Actions', 'githubactions'], ['Git', 'git'], ['Vercel', 'vercel']]],
];

function stack(icons) {
  const W = 1200;
  const X = 56;
  const chipX = 268;
  const chipH = 44;
  const rowGap = 20;
  let y = 44;
  let n = 0;
  const out = [];

  for (const [label, items] of STACK) {
    let x = chipX;
    const rowTop = y;
    for (const [name, icon] of items) {
      const w = Math.round(46 + name.length * 9.7 + 18);
      if (x + w > W - X) {
        x = chipX;
        y += chipH + 10;
      }
      const glyph = icon
        ? `<path transform="translate(${x + 15} ${y + 12}) scale(${20 / 24})" fill="${C.ink}" d="${icons[icon]}"/>`
        : `<rect x="${x + 19}" y="${y + 16}" width="12" height="12" fill="none" stroke="${C.amber}" stroke-width="1.5" transform="rotate(45 ${x + 25} ${y + 22})"/>`;
      out.push(`<g class="chip" style="animation-delay:${n++ * 45}ms"><rect x="${x}" y="${y}" width="${w}" height="${chipH}" rx="10" fill="${C.raised}" stroke="${C.line}"/>${glyph}<text class="mono ink" x="${x + 46}" y="${y + 27.5}" font-size="16">${esc(name)}</text></g>`);
      x += w + 10;
    }
    out.push(`<text class="mono muted" x="${X}" y="${rowTop + 27}" font-size="13" letter-spacing="2">${label}</text>`);
    y += chipH + rowGap;
    if (label !== STACK.at(-1)[0]) out.push(`<path class="rule" d="M${X} ${y - rowGap / 2}H${W - X}" stroke-opacity=".6"/>`);
  }
  const H = y - rowGap + 44;
  const desc = STACK.map(([l, items]) => `${l}: ${items.map((i) => i[0]).join(', ')}`).join('. ');
  return svg(W, H, 'Stack', desc, `  ${panel(W, H)}\n  ${out.join('\n  ')}`, `
    .chip { animation: rise .6s cubic-bezier(.2,.8,.2,1) both; }`);
}

// ---------------------------------------------------------------- featured card

function lanjo() {
  const W = 1200;
  const H = 320;
  const X = 56;
  const desc = wrap('The studio I co-founded in Santiago de los Caballeros: cybersecurity, IT infrastructure, web and custom software from one team that builds the technology and knows how to attack and defend it. I built the company site.', 64);
  const services = ['CYBERSECURITY', 'IT INFRASTRUCTURE', 'WEB', 'SOFTWARE'];
  let tx = X;
  const tags = ['Next.js 16', 'React 19', 'Tailwind v4']
    .map((t) => {
      const w = Math.round(t.length * 8.6 + 28);
      const out = `<rect x="${tx}" y="${H - 66}" width="${w}" height="30" rx="15" fill="none" stroke="${C.line}"/><text class="mono soft" x="${tx + w / 2}" y="${H - 46}" font-size="13.5" text-anchor="middle">${esc(t)}</text>`;
      tx += w + 8;
      return out;
    })
    .join('');
  let sx = 700;
  const svc = services
    .map((s, i) => {
      const out = `<text class="mono svc" style="animation-delay:${i * 1.5}s" x="${sx}" y="246" font-size="13" letter-spacing="2">${s}</text>`;
      sx += s.length * 9.8 + 30;
      return out;
    })
    .join('');
  const word = (cls) =>
    `<text class="sans ${cls}" x="${W - X - 4}" y="196" font-size="150" font-weight="800" letter-spacing="4" text-anchor="end">LANJO</text>`;

  const body = `  <defs>
    <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="${C.line}"/></pattern>
    <linearGradient id="fadeL" x1="0" x2="1"><stop offset="0" stop-color="${C.bg}"/><stop offset="1" stop-color="${C.bg}" stop-opacity="0"/></linearGradient>
    <clipPath id="pr"><rect width="${W}" height="${H}" rx="16"/></clipPath>
  </defs>
  ${panel(W, H)}
  <g clip-path="url(#pr)">
    <rect x="600" y="1" width="${W - 601}" height="${H - 2}" fill="url(#dots)"/>
    <rect x="600" y="1" width="240" height="${H - 2}" fill="url(#fadeL)"/>
    ${word('wfill')}
    ${word('wline')}
    <path class="rule" d="M700 222H${W - X}"/>
    <rect class="amber run" x="700" y="221" width="70" height="2"/>
    ${svc}
    <text class="mono muted" x="${W - X}" y="282" font-size="12" letter-spacing="2" text-anchor="end">SANTIAGO DE LOS CABALLEROS  /  19.4517 N  70.6970 W</text>
  </g>
  <text class="mono amber" x="${X}" y="62" font-size="13" letter-spacing="2">FEATURED  /  CO-FOUNDER</text>
  <text class="sans ink" x="${X - 2}" y="112" font-size="40" font-weight="700" letter-spacing="-1">Lanjo Technologies</text>
  ${desc.map((l, i) => `<text class="sans soft" x="${X}" y="${150 + i * 26}" font-size="17.5">${esc(l)}</text>`).join('\n  ')}
  ${tags}
  <path class="sa arrow" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M${tx + 14} ${H - 42}L${tx + 32} ${H - 60}M${tx + 18} ${H - 60}H${tx + 32}V${H - 46}"/>`;

  return svg(W, H, 'Lanjo Technologies', 'Co-founder. Cybersecurity, IT infrastructure, web and custom software studio in Santiago de los Caballeros. Company site built with Next.js 16, React 19 and Tailwind v4.', body, `
    .wline { fill: none; stroke: ${C.amber}; stroke-width: 1.6; stroke-dasharray: 620; stroke-dashoffset: 620; animation: wline 10s ease-in-out infinite; }
    .wfill { fill: ${C.amber}; opacity: 0; animation: wfill 10s ease-in-out infinite; }
    .svc { fill: ${C.muted}; animation: svc 6s linear infinite; }
    .run { animation: run 6s cubic-bezier(.6,0,.3,1) infinite; }
    .arrow { animation: nudge 2.4s ease-in-out infinite; }
    @keyframes wline { 0% { stroke-dashoffset: 620; opacity: 1; } 35%, 82% { stroke-dashoffset: 0; opacity: 1; } 94%, 100% { stroke-dashoffset: 0; opacity: 0; } }
    @keyframes wfill { 0%, 30% { opacity: 0; } 45%, 82% { opacity: .16; } 94%, 100% { opacity: 0; } }
    @keyframes svc { 0%, 25%, 100% { fill: ${C.muted}; } 4%, 20% { fill: ${C.hot}; } }
    @keyframes run { 0% { transform: translateX(0); } 100% { transform: translateX(${W - X - 770}px); } }
    @keyframes nudge { 50% { transform: translate(3px, -3px); } }
    @media (prefers-reduced-motion: reduce) { .wline { stroke-dashoffset: 0; } .wfill { opacity: .16; } }`);
}

// ---------------------------------------------------------------- data

const START_YEAR = 2023; // the account's first year

async function fetchData(token) {
  const years = [];
  for (let y = START_YEAR; y <= new Date().getUTCFullYear(); y++) years.push(y);
  const yearly = years
    .map((y) => `y${y}: contributionsCollection(from: "${y}-01-01T00:00:00Z", to: "${y}-12-31T23:59:59Z") { totalCommitContributions }`)
    .join('\n      ');
  const query = `query($login: String!) {
    user(login: $login) {
      createdAt
      pullRequests { totalCount }
      contributionsCollection {
        totalCommitContributions
        totalPullRequestContributions
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount contributionLevel } }
        }
      }
      ${yearly}
      repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) {
        totalCount
        nodes { stargazerCount languages(first: 20, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name } } } }
      }
    }
  }`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { authorization: `bearer ${token}`, 'content-type': 'application/json', 'user-agent': 'profile-readme-build' },
    body: JSON.stringify({ query, variables: { login: LOGIN } }),
  });
  if (!res.ok) throw new Error(`GitHub API responded ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data.user;
}

const LEVELS = ['NONE', 'FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE'];

// The token GitHub Actions provides only sees public activity. floors.json
// holds counts measured with a token that also sees private repositories, so
// a public-only run never reports less than what was already measured.
const FLOORS_URL = new URL('floors.json', SRC);

async function applyFloors(stats) {
  const floors = JSON.parse(await readFile(FLOORS_URL, 'utf8'));
  if (stats.prsAll > floors.pullRequests) {
    floors.pullRequests = stats.prsAll;
    floors.measured = new Date().toISOString().slice(0, 10);
    await writeFile(FLOORS_URL, JSON.stringify(floors, null, 2) + String.fromCharCode(10));
  }
  stats.prsAll = Math.max(stats.prsAll, floors.pullRequests);
  return stats;
}

function summarise(user) {
  const cc = user.contributionsCollection;
  const cal = cc.contributionCalendar;
  const weeks = cal.weeks.map((w) =>
    w.contributionDays.map((d) => ({
      date: d.date,
      count: d.contributionCount,
      level: LEVELS.indexOf(d.contributionLevel),
      weekday: new Date(`${d.date}T00:00:00Z`).getUTCDay(),
    })),
  );
  const bytes = new Map();
  let stars = 0;
  for (const repo of user.repositories.nodes) {
    stars += repo.stargazerCount;
    for (const { size, node } of repo.languages.edges) bytes.set(node.name, (bytes.get(node.name) ?? 0) + size);
  }
  const all = [...bytes.values()].reduce((a, b) => a + b, 0);
  const languages = [...bytes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, size]) => ({ name, share: size / all }));
  const commitsAll = Object.entries(user)
    .filter(([k]) => /^y\d{4}$/.test(k))
    .reduce((sum, [, v]) => sum + v.totalCommitContributions, 0);
  return {
    total: cal.totalContributions,
    commits: cc.totalCommitContributions,
    prs: cc.totalPullRequestContributions,
    repos: user.repositories.totalCount,
    weeks,
    languages,
    commitsAll,
    prsAll: user.pullRequests.totalCount,
    stars,
    langCount: bytes.size,
    years: (Date.now() - new Date(user.createdAt).getTime()) / (365.25 * 24 * 3600 * 1000),
  };
}

// ---------------------------------------------------------------- activity: contribution calendar

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const GREEN = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];

function activity(s) {
  const W = 1200;
  const X = 56;
  const gridL = X + 46;
  const gridT = 246;
  const step = (W - X - gridL) / s.weeks.length;
  const size = Math.floor(step - 3.5);
  const gridB = gridT + 7 * step;
  const H = Math.round(gridB + 62);
  const days = s.weeks.flat();
  const best = days.reduce((a, b) => (b.count > a.count ? b : a));

  let bestXY = null;
  const cells = s.weeks
    .map((week, w) =>
      week
        .map((d) => {
          const x = r1(gridL + w * step);
          const y = r1(gridT + d.weekday * step);
          if (d === best) bestXY = [x + size / 2, y + size / 2];
          const delay = Math.round(w * 22 + d.weekday * 45);
          const inner = `<rect${d.level === 4 ? ' class="glow"' : ''} x="${x}" y="${y}" width="${size}" height="${size}" rx="3.5" fill="${GREEN[d.level]}"${d.level === 0 ? ` stroke="#1f242c" stroke-width=".8"` : ''}/>`;
          return `<g class="c" style="animation-delay:${delay}ms">${inner}</g>`;
        })
        .join(''),
    )
    .join('\n    ');

  let last = -1;
  let lastX = -Infinity;
  const months = s.weeks
    .map((week, w) => {
      const m = Number(week[0].date.slice(5, 7)) - 1;
      const x = r1(gridL + w * step);
      if (m === last) return '';
      last = m;
      if (x - lastX < 50 || x > W - X - 30) return '';
      lastX = x;
      return `<text class="mono muted" x="${x}" y="${gridT - 12}" font-size="13">${MONTHS[m]}</text>`;
    })
    .join('');
  const dayLabels = [[1, 'Mon'], [3, 'Wed'], [5, 'Fri']]
    .map(([d, l]) => `<text class="mono muted" x="${X}" y="${r1(gridT + d * step + size - 3)}" font-size="13">${l}</text>`)
    .join('');

  const stat = (x, value, label) =>
    `<text class="sans ink" x="${x}" y="142" font-size="30" font-weight="600">${value}</text>
  <text class="mono muted" x="${x}" y="168" font-size="12.5" letter-spacing="1.5">${label}</text>`;

  const legendX = W - X - 5 * (size + 4) - 44;
  const legend = `<text class="mono muted" x="${legendX - 12}" y="${r1(gridB + 30)}" font-size="13" text-anchor="end">Less</text>
  ${GREEN.map((c, i) => `<rect x="${legendX + i * (size + 4)}" y="${r1(gridB + 17)}" width="${size}" height="${size}" rx="3.5" fill="${c}"${i === 0 ? ` stroke="#1f242c" stroke-width=".8"` : ''}/>`).join('')}
  <text class="mono muted" x="${W - X}" y="${r1(gridB + 30)}" font-size="13" text-anchor="end">More</text>`;

  const body = `  <defs>
    <linearGradient id="scan" x1="0" x2="1"><stop offset="0" stop-color="#39d353" stop-opacity="0"/><stop offset=".9" stop-color="#39d353" stop-opacity=".22"/><stop offset="1" stop-color="#b6ffc6" stop-opacity=".9"/></linearGradient>
    <clipPath id="grid"><rect x="${gridL - 4}" y="${gridT - 4}" width="${W - X - gridL + 8}" height="${r1(7 * step + 4)}"/></clipPath>
  </defs>
  ${panel(W, H)}
  <text class="mono muted" x="${X}" y="58" font-size="14" letter-spacing="2">CONTRIBUTIONS  /  LAST 52 WEEKS</text>
  <text class="mono muted" x="${W - X}" y="58" font-size="14" letter-spacing="2" text-anchor="end">${esc(days[0].date)}  &gt;  ${esc(days.at(-1).date)}</text>
  <text class="sans ink" x="${X - 3}" y="168" font-size="88" font-weight="700" letter-spacing="-3">${s.total.toLocaleString('en-US')}</text>
  <rect x="${X}" y="188" width="56" height="3" fill="#39d353"/>
  ${stat(330, s.commits, 'COMMITS')}
  ${stat(470, s.prs, 'PULL REQUESTS')}
  ${stat(680, s.repos, 'PUBLIC REPOS')}
  ${stat(880, best.count, `BEST DAY  ${best.date.slice(5)}`)}
  ${months}
  ${dayLabels}
  <g>
    ${cells}
  </g>
  ${bestXY ? `<circle class="pingc" cx="${r1(bestXY[0])}" cy="${r1(bestXY[1])}" r="${size}" fill="none" stroke="#b6ffc6" stroke-width="1.5"/>` : ''}
  <g clip-path="url(#grid)"><rect class="scanbar" x="${gridL - 120}" y="${gridT - 4}" width="120" height="${r1(7 * step + 4)}" fill="url(#scan)"/></g>
  ${legend}`;

  return svg(W, H, 'GitHub contribution calendar, last 52 weeks', `${s.total} contributions in the last year: ${s.commits} commits and ${s.prs} pull requests across ${s.repos} public repositories. Best day ${best.count} on ${best.date}.`, body, `
    .c { transform-box: fill-box; transform-origin: center; animation: pop .55s cubic-bezier(.2,1.4,.4,1) both; }
    .glow { animation: glow 2.6s ease-in-out 2.4s infinite; }
    .pingc { transform-box: fill-box; transform-origin: center; animation: pingc 2.8s ease-out 2.6s infinite both; }
    .scanbar { animation: scanbar 7s cubic-bezier(.5,0,.4,1) 2.4s infinite both; }
    @keyframes pop { from { transform: scale(0); opacity: 0; } }
    @keyframes glow { 50% { fill: #9dffb0; } }
    @keyframes pingc { from { transform: scale(.4); opacity: 1; } to { transform: scale(2.4); opacity: 0; } }
    @keyframes scanbar { 0% { transform: translateX(0); } 60%, 100% { transform: translateX(${Math.round(W - X - gridL + 140)}px); } }
    @media (prefers-reduced-motion: reduce) { .scanbar, .pingc { display: none; } }`);
}

// ---------------------------------------------------------------- trophies

const TIERS = ['C', 'B', 'A', 'AA', 'AAA', 'S', 'SS', 'SSS'];

function rank(value, steps) {
  let i = -1;
  while (i + 1 < steps.length && value >= steps[i + 1]) i++;
  const next = i + 1 < steps.length ? steps[i + 1] : null;
  const floor = i >= 0 ? steps[i] : 0;
  return { tier: i, next, progress: next === null ? 1 : Math.max(0.04, (value - floor) / (next - floor)) };
}

function trophies(s) {
  const W = 1200;
  const H = 330;
  const X = 56;
  const gap = 14;
  const items = [
    ['COMMITS', s.commitsAll, s.commitsAll.toLocaleString('en-US'), [1, 10, 100, 200, 500, 1000, 2000, 4000]],
    ['PULL REQUESTS', s.prsAll, s.prsAll.toLocaleString('en-US'), [1, 10, 20, 50, 100, 200, 500, 1000]],
    ['EXPERIENCE', s.years, `${s.years.toFixed(1)} yrs`, [0.5, 1, 1.5, 2, 3, 5, 7.5, 10]],
    ['LANGUAGES', s.langCount, s.langCount, [1, 2, 3, 5, 8, 10, 15, 20]],
    ['REPOSITORIES', s.repos, s.repos, [1, 5, 10, 20, 30, 40, 50, 80]],
    ['STARS', s.stars, s.stars, [1, 10, 30, 50, 100, 200, 700, 2000]],
  ];
  const tw = (W - 2 * X - gap * (items.length - 1)) / items.length;
  const hex = (cx, cy, r) =>
    'M' + Array.from({ length: 6 }, (_, k) => `${r1(cx + r * Math.cos((Math.PI / 180) * (60 * k - 90)))} ${r1(cy + r * Math.sin((Math.PI / 180) * (60 * k - 90)))}`).join('L') + 'Z';

  const tiles = items
    .map(([label, value, shown, steps], i) => {
      const x = X + i * (tw + gap);
      const cx = x + tw / 2;
      const cy = 128;
      const { tier, next, progress } = rank(value, steps);
      const name = tier < 0 ? '-' : TIERS[tier];
      const colour = tier >= 5 ? '#ffe2a6' : tier >= 2 ? C.amber : '#b07a45';
      const barW = tw - 40;
      const nextLabel = next === null ? 'top rank' : `${TIERS[tier + 1]} at ${next.toLocaleString('en-US')}`;
      return `<g class="tile" style="animation-delay:${i * 110}ms">
    <rect x="${r1(x)}" y="74" width="${r1(tw)}" height="${H - 74 - 34}" rx="12" fill="${C.raised}" stroke="${C.line}"/>
    <clipPath id="h${i}"><path d="${hex(cx, cy, 38)}"/></clipPath>
    <path d="${hex(cx, cy, 38)}" fill="${colour}" opacity=".1"/>
    <g clip-path="url(#h${i})"><rect x="${r1(cx - 80)}" y="${cy - 45}" width="22" height="90" fill="#fff" opacity=".28" transform="skewX(-20)"><animate attributeName="x" values="${r1(cx - 80)};${r1(cx + 100)};${r1(cx + 100)}" keyTimes="0;.28;1" dur="4.5s" begin="${r1(1.2 + i * 0.35)}s" repeatCount="indefinite"/></rect></g>
    <path class="hexl" style="animation-delay:${r1(0.3 + i * 0.12)}s" pathLength="1" d="${hex(cx, cy, 38)}" fill="none" stroke="${colour}" stroke-width="2" stroke-linejoin="round"/>
    <path d="${hex(cx, cy, 30)}" fill="none" stroke="${colour}" stroke-width="1" opacity=".35"/>
    <text class="sans" x="${r1(cx)}" y="${cy + (name.length > 2 ? 7 : 9)}" font-size="${name.length > 2 ? 20 : 26}" font-weight="800" text-anchor="middle" fill="${colour}" letter-spacing="${name.length > 1 ? 1 : 0}">${name}</text>
    <text class="mono muted" x="${r1(cx)}" y="200" font-size="12" letter-spacing="1.5" text-anchor="middle">${label}</text>
    <text class="sans ink" x="${r1(cx)}" y="232" font-size="25" font-weight="600" text-anchor="middle">${shown}</text>
    <rect x="${r1(x + 20)}" y="248" width="${r1(barW)}" height="4" rx="2" fill="${C.track}"/>
    <rect class="prog" style="animation-delay:${r1(0.6 + i * 0.12)}s" x="${r1(x + 20)}" y="248" width="${r1(barW * Math.min(1, progress))}" height="4" rx="2" fill="${colour}"/>
    <text class="mono muted" x="${r1(cx)}" y="274" font-size="11.5" text-anchor="middle">${nextLabel}</text>
  </g>`;
    })
    .join('\n  ');

  const body = `  ${panel(W, H)}
  <text class="mono muted" x="${X}" y="52" font-size="14" letter-spacing="2">TROPHIES  /  ALL TIME</text>
  <text class="mono muted" x="${W - X}" y="52" font-size="14" letter-spacing="2" text-anchor="end">RANKED  C  &gt;  SSS</text>
  ${tiles}`;
  const desc = items.map(([l, v, shown, steps]) => `${l} ${shown}, rank ${TIERS[rank(v, steps).tier] ?? 'none'}`).join('; ');
  return svg(W, H, 'Trophies', desc, body, `
    .tile { animation: rise .7s cubic-bezier(.2,.8,.2,1) both; }
    .hexl { stroke-dasharray: 1; stroke-dashoffset: 1; animation: hexl 1.4s cubic-bezier(.4,0,.2,1) both; }
    .prog { transform-box: fill-box; transform-origin: 0 50%; animation: grow .9s cubic-bezier(.2,.8,.2,1) both; }
    @keyframes hexl { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
    @keyframes grow { from { transform: scaleX(0); } }
    @media (prefers-reduced-motion: reduce) { .hexl { stroke-dashoffset: 0; } }`);
}

// ---------------------------------------------------------------- languages

function languages(s) {
  const W = 1200;
  const X = 56;
  const perCol = Math.ceil(s.languages.length / 2);
  const rowH = 46;
  const top = 106;
  const H = top + perCol * rowH + 14;
  const colW = (W - 2 * X - 64) / 2;
  const nameW = 130;
  const trackW = colW - nameW - 64;
  const maxShare = s.languages[0].share;

  const rows = s.languages
    .map((l, i) => {
      const cx = X + Math.floor(i / perCol) * (colW + 64);
      const y = top + (i % perCol) * rowH;
      const w = Math.max(4, r1((l.share / maxShare) * trackW));
      return `<text class="mono ink" x="${cx}" y="${y + 5}" font-size="16">${esc(l.name)}</text>
  <rect x="${cx + nameW}" y="${y - 5}" width="${r1(trackW)}" height="8" rx="4" fill="${C.track}"/>
  <rect class="bar" style="animation-delay:${i * 80}ms" x="${cx + nameW}" y="${y - 5}" width="${w}" height="8" rx="4" fill="${C.amber}"/>
  <text class="mono soft" x="${r1(cx + colW)}" y="${y + 5}" font-size="15" text-anchor="end">${(l.share * 100).toFixed(1)}%</text>`;
    })
    .join('\n  ');

  const body = `  ${panel(W, H)}
  <text class="mono muted" x="${X}" y="58" font-size="14" letter-spacing="2">LANGUAGES  /  PUBLIC REPOSITORIES</text>
  <text class="mono muted" x="${W - X}" y="58" font-size="14" letter-spacing="2" text-anchor="end">SHARE OF BYTES</text>
  ${rows}`;
  return svg(W, H, 'Languages across public repositories', `Share of code by bytes: ${s.languages.map((l) => `${l.name} ${(l.share * 100).toFixed(1)}%`).join(', ')}.`, body, `
    .bar { transform-box: fill-box; transform-origin: 0 50%; animation: grow .9s cubic-bezier(.2,.8,.2,1) both; }
    @keyframes grow { from { transform: scaleX(0); } }`);
}

// ---------------------------------------------------------------- small parts

function divider() {
  const W = 1200;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 24" width="${W}" height="24" aria-hidden="true">
  <defs><linearGradient id="p" x1="0" x2="1"><stop offset="0" stop-color="${C.amber}" stop-opacity="0"/><stop offset=".8" stop-color="${C.amber}"/><stop offset="1" stop-color="${C.hot}"/></linearGradient></defs>
  <path d="M0 12.5H${W}" stroke="#8a8f98" stroke-opacity=".28"/>
  <rect x="-180" y="11.5" width="180" height="2" fill="url(#p)"><animate attributeName="x" from="-180" to="${W}" dur="5s" repeatCount="indefinite"/></rect>
  <rect x="-5" y="8" width="9" height="9" fill="${C.amber}" transform="translate(${W / 2} 0) rotate(45 0 12.5)"/>
</svg>
`;
}

function button(label) {
  const w = Math.round(label.length * 10 + 78);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} 46" width="${w}" height="46" role="img" aria-label="${esc(label)}">
  <style>.a { animation: n 2.4s ease-in-out infinite; } @keyframes n { 50% { transform: translate(3px, -3px); } } @media (prefers-reduced-motion: reduce) { .a { animation: none; } }</style>
  <rect x=".75" y=".75" width="${w - 1.5}" height="44.5" rx="22.25" fill="${C.bg}" stroke="${C.amber}" stroke-width="1.5"/>
  <text x="26" y="29" font-family="${MONO}" font-size="16" fill="${C.ink}" letter-spacing=".5">${esc(label)}</text>
  <path class="a" d="M${w - 38} 29L${w - 26} 17M${w - 35} 17H${w - 26}V26" fill="none" stroke="${C.amber}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;
}

function footer() {
  const W = 1200;
  const H = 120;
  const hex = [...Buffer.from(WHOAMI, 'utf8')].map((b) => b.toString(16).padStart(2, '0')).join(' ');
  const cell = 9.6;
  const span = (hex.length + 3) * cell;
  const line = (x) => `<text class="mono" x="${r1(x)}" y="50" font-size="16" fill="${C.muted}" textLength="${r1(hex.length * cell)}" lengthAdjust="spacingAndGlyphs">${hex}</text>`;
  const body = `  <defs>
    <linearGradient id="edge" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".12" stop-color="#fff"/><stop offset=".88" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="m"><rect width="${W}" height="${H}" fill="url(#edge)"/></mask>
  </defs>
  ${panel(W, H)}
  <g mask="url(#m)"><g>${line(0)}${line(span)}${line(2 * span)}
    <animateTransform attributeName="transform" type="translate" from="0 0" to="${r1(-span)} 0" dur="40s" repeatCount="indefinite"/></g></g>
  <rect class="amber" x="${W / 2 - 4.5}" y="74" width="9" height="9" transform="rotate(45 ${W / 2} 78.5)"/>
  <text class="mono soft" x="${W / 2 - 22}" y="84" font-size="14" letter-spacing="2" text-anchor="end">CHARLES LANTIGUA JORGE</text>
  <text class="mono muted" x="${W / 2 + 22}" y="84" font-size="14" letter-spacing="2">PARIS  /  EOF</text>`;
  return svg(W, H, 'End of file', 'The same bytes as the hexdump above, scrolling.', body);
}

// ---------------------------------------------------------------- main

await mkdir(OUT, { recursive: true });
const write = (name, content) => writeFile(new URL(name, OUT), content);

const jpeg = (await readFile(new URL('hero.jpg', SRC))).toString('base64');
const icons = JSON.parse(await readFile(new URL('icons.json', SRC), 'utf8'));

await write('hero.svg', hero(jpeg));
await write('terminal.svg', terminal());
await write('stack.svg', stack(icons));
await write('card-lanjo.svg', lanjo());
await write('divider.svg', divider());
await write('footer.svg', footer());
for (const [i, c] of CARDS.entries()) await write(`card-${c.file}.svg`, card(c, i + 1));
for (const [file, label] of [['portfolio', 'Portfolio'], ['linkedin', 'LinkedIn'], ['repositories', 'All repositories']]) {
  await write(`btn-${file}.svg`, button(label));
}

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!token) {
  console.log('No GITHUB_TOKEN set: rebuilt the static panels only.');
} else {
  const stats = await applyFloors(summarise(await fetchData(token)));
  await write('activity.svg', activity(stats));
  await write('trophies.svg', trophies(stats));
  await write('languages.svg', languages(stats));
  console.log(`Built for ${LOGIN}: ${stats.total} contributions, ${stats.languages.map((l) => l.name).join(', ')}`);
}
