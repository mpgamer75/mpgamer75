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

const panel = (w, h, rx = 16) =>
  `<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="${rx}" fill="${C.bg}" stroke="${C.line}"/>`;

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

function hero(jpeg) {
  const W = 1200;
  const H = 514;
  const X = 64;
  const leds = [[946, 254, 26], [1051, 397, 30], [1093, 313, 18], [1120, 304, 18], [824, 78, 16], [864, 60, 16]];
  const lines = [
    'I build security tooling for the terminal.',
    'I ship web and mobile software.',
    'Recon, applied cryptography, SOC automation.',
  ];
  const meta = [
    ['BASED IN', 'Paris, France'],
    ['FOCUS', 'Offensive recon / applied crypto / SOC tooling'],
    ['SPEAKS', 'EN / FR / ES'],
  ];
  const metaX = [X, X + 210, X + 700];

  const body = `  <defs>
    <clipPath id="r"><rect width="${W}" height="${H}" rx="18"/></clipPath>
    <linearGradient id="shade" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#050506" stop-opacity=".96"/>
      <stop offset=".5" stop-color="#050506" stop-opacity=".72"/>
      <stop offset=".8" stop-color="#050506" stop-opacity=".08"/>
      <stop offset="1" stop-color="#050506" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="floor" x1="0" x2="0" y1="0" y2="1">
      <stop offset=".55" stop-color="#050506" stop-opacity="0"/>
      <stop offset="1" stop-color="#050506" stop-opacity=".9"/>
    </linearGradient>
    <linearGradient id="beam" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="${C.hot}" stop-opacity="0"/>
      <stop offset=".85" stop-color="${C.hot}" stop-opacity=".16"/>
      <stop offset="1" stop-color="${C.hot}" stop-opacity=".34"/>
    </linearGradient>
    <radialGradient id="led">
      <stop offset="0" stop-color="#fff3d6" stop-opacity=".95"/>
      <stop offset=".25" stop-color="${C.hot}" stop-opacity=".55"/>
      <stop offset="1" stop-color="${C.amber}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <g clip-path="url(#r)">
    <rect width="${W}" height="${H}" fill="#050506"/>
    <g class="drift">
      <image width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice" xlink:href="data:image/jpeg;base64,${jpeg}" href="data:image/jpeg;base64,${jpeg}"/>
      ${leds
        .map(
          ([x, y, r], i) =>
            `<circle class="led" style="animation-delay:${-i * 0.9}s;animation-duration:${3.2 + (i % 3) * 1.1}s" cx="${x}" cy="${y}" r="${r}" fill="url(#led)"/>`,
        )
        .join('\n      ')}
    </g>
    <rect width="${W}" height="${H}" fill="url(#shade)"/>
    <rect width="${W}" height="${H}" fill="url(#floor)"/>
    <rect class="beam" x="-260" y="0" width="260" height="${H}" fill="url(#beam)"/>

    <g class="in" style="animation-delay:.1s">
      <rect class="amber" x="${X}" y="57" width="9" height="9"/>
      <text class="mono soft" x="${X + 20}" y="67" font-size="15" letter-spacing="1.5">MPGAMER75</text>
      <text class="mono muted" x="${X + 138}" y="67" font-size="15" letter-spacing="1.5">/  48.8566 N  2.3522 E</text>
    </g>

    <text class="mono amber in" style="animation-delay:.35s" x="${X}" y="186" font-size="16" letter-spacing="4">CYBERSECURITY  x  SOFTWARE</text>
    <text class="sans ink in" style="animation-delay:.5s" x="${X - 4}" y="262" font-size="74" font-weight="700" letter-spacing="-2.2">Charles Lantigua Jorge</text>
    <rect class="amber underline" x="${X}" y="288" width="96" height="3"/>

    ${lines
      .map(
        (l, i) =>
          `<text class="sans soft rot${i ? '' : ' first'}" style="animation-delay:${1.2 + i * 4}s" x="${X}" y="338" font-size="27">${esc(l)}</text>`,
      )
      .join('\n    ')}

    <g class="in" style="animation-delay:1s">
      <line class="rule" x1="${X}" y1="408" x2="${W - X}" y2="408" stroke-opacity=".9"/>
      ${meta
        .map(
          ([k, v], i) =>
            `<text class="mono muted" x="${metaX[i]}" y="440" font-size="13" letter-spacing="2">${k}</text>
      <text class="sans ink" x="${metaX[i]}" y="466" font-size="18">${esc(v)}</text>`,
        )
        .join('\n      ')}
    </g>

    <path class="sa" stroke-width="1.5" d="M24 44V24H44M${W - 44} 24H${W - 24}V44M24 ${H - 44}V${H - 24}H44M${W - 44} ${H - 24}H${W - 24}V${H - 44}" opacity=".75"/>
  </g>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="18" fill="none" stroke="${C.line}"/>`;

  return svg(
    W,
    H,
    'Charles Lantigua Jorge',
    'Cybersecurity engineer and software engineer based in Paris. Security tooling for the terminal, web and mobile software.',
    body,
    `
    .drift { transform-origin: 85% 50%; animation: drift 26s ease-in-out infinite alternate; }
    .led { animation: pulse 3s ease-in-out infinite; }
    .beam { animation: beam 9s cubic-bezier(.6,0,.3,1) infinite; }
    .in { animation: rise .9s cubic-bezier(.2,.8,.2,1) both; }
    .underline { transform-box: fill-box; transform-origin: 0 50%; animation: draw 1s cubic-bezier(.2,.8,.2,1) .9s both; }
    .rot { opacity: 0; animation: rot 12s linear infinite; }
    @keyframes drift { from { transform: scale(1); } to { transform: scale(1.07); } }
    @keyframes beam { 0%, 55% { transform: translateX(0); } 100% { transform: translateX(${W + 300}px); } }
    @keyframes draw { from { transform: scaleX(0); } }
    @keyframes rot {
      0% { opacity: 0; transform: translateY(10px); }
      3%, 30% { opacity: 1; transform: none; }
      33.3%, 100% { opacity: 0; transform: translateY(-10px); }
    }
    @media (prefers-reduced-motion: reduce) { .rot.first { opacity: 1; } .beam { display: none; } }`,
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
  { file: 'dental-clinic', motif: 'browser', title: 'dental-clinic', desc: 'Production website for a dental clinic in Santiago de los Caballeros, Dominican Republic.', tags: ['TypeScript', 'Vercel'] },
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

// ---------------------------------------------------------------- data

async function fetchData(token) {
  const query = `query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        totalCommitContributions
        totalPullRequestContributions
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount } }
        }
      }
      repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) {
        totalCount
        nodes { languages(first: 20, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name } } } }
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

function summarise(user) {
  const cc = user.contributionsCollection;
  const cal = cc.contributionCalendar;
  const weeks = cal.weeks.map((w) => ({
    start: w.contributionDays[0].date,
    total: w.contributionDays.reduce((s, d) => s + d.contributionCount, 0),
  }));
  const bytes = new Map();
  for (const repo of user.repositories.nodes) {
    for (const { size, node } of repo.languages.edges) bytes.set(node.name, (bytes.get(node.name) ?? 0) + size);
  }
  const all = [...bytes.values()].reduce((a, b) => a + b, 0);
  const languages = [...bytes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, size]) => ({ name, share: size / all }));
  return {
    total: cal.totalContributions,
    commits: cc.totalCommitContributions,
    prs: cc.totalPullRequestContributions,
    repos: user.repositories.totalCount,
    weeks,
    languages,
  };
}

// ---------------------------------------------------------------- activity

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function activity(s) {
  const W = 1200;
  const H = 340;
  const X = 56;
  const plotL = 440;
  const plotR = W - X;
  const base = 262;
  const plotH = 156;
  const step = (plotR - plotL) / s.weeks.length;
  const bw = Math.max(4, Math.round(step - 4));
  const max = Math.max(1, ...s.weeks.map((w) => w.total));
  const peak = s.weeks.findIndex((w) => w.total === max);

  const bars = s.weeks
    .map((w, i) => {
      const x = r1(plotL + i * step + (step - bw) / 2);
      if (w.total === 0) return `<rect x="${x}" y="${base - 2}" width="${bw}" height="2" fill="${C.line}"/>`;
      const h = Math.max(3, r1((w.total / max) * plotH));
      const r = Math.min(3, h / 2);
      const y = r1(base - h);
      const d = `M${x} ${base}V${r1(y + r)}Q${x} ${y} ${r1(x + r)} ${y}H${r1(x + bw - r)}Q${x + bw} ${y} ${x + bw} ${r1(y + r)}V${base}Z`;
      return `<path class="bar" style="animation-delay:${i * 16}ms" fill="${i === peak ? C.hot : C.amber}" d="${d}"/>`;
    })
    .join('\n    ');

  let last = -1;
  let lastX = -Infinity;
  const ticks = s.weeks
    .map((w, i) => {
      const m = Number(w.start.slice(5, 7)) - 1;
      const x = r1(plotL + i * step + (step - bw) / 2);
      if (m === last) return '';
      last = m;
      if (i === 0 || x - lastX < 44 || x > plotR - 30) return '';
      lastX = x;
      return `<text class="mono muted" x="${x}" y="${base + 24}" font-size="13">${MONTHS[m]}</text>`;
    })
    .join('');

  const peakX = r1(plotL + peak * step + step / 2);
  const anchor = peakX > plotR - 60 ? 'end' : peakX < plotL + 60 ? 'start' : 'middle';
  const stat = (x, value, label) =>
    `<text class="sans ink" x="${x}" y="240" font-size="28" font-weight="600">${value}</text>
  <text class="mono muted" x="${x}" y="264" font-size="12.5" letter-spacing="1">${label}</text>`;

  const body = `  ${panel(W, H)}
  <text class="mono muted" x="${X}" y="58" font-size="14" letter-spacing="2">CONTRIBUTIONS  /  LAST 52 WEEKS</text>
  <text class="mono muted" x="${plotR}" y="58" font-size="14" letter-spacing="2" text-anchor="end">PER WEEK</text>
  <text class="sans ink" x="${X - 3}" y="160" font-size="88" font-weight="700" letter-spacing="-3">${s.total.toLocaleString('en-US')}</text>
  <rect class="amber" x="${X}" y="184" width="56" height="3"/>
  ${stat(X, s.commits, 'COMMITS')}
  ${stat(X + 120, s.prs, 'PULL REQUESTS')}
  ${stat(X + 286, s.repos, 'REPOS')}
  <g>
    ${bars}
  </g>
  <line class="rule" x1="${plotL}" y1="${base + 0.5}" x2="${plotR}" y2="${base + 0.5}"/>
  <text class="mono soft" x="${peakX}" y="${base - plotH - 12}" font-size="13" text-anchor="${anchor}">peak week  ${max}</text>
  ${ticks}`;

  return svg(W, H, 'GitHub activity over the last 52 weeks', `${s.total} contributions in the last year: ${s.commits} commits and ${s.prs} pull requests across ${s.repos} public repositories. Busiest week ${max}.`, body, `
    .bar { transform-box: fill-box; transform-origin: 50% 100%; animation: grow .8s cubic-bezier(.2,.8,.2,1) both; }
    @keyframes grow { from { transform: scaleY(0); } }`);
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
  const stats = summarise(await fetchData(token));
  await write('activity.svg', activity(stats));
  await write('languages.svg', languages(stats));
  console.log(`Built for ${LOGIN}: ${stats.total} contributions, ${stats.languages.map((l) => l.name).join(', ')}`);
}
