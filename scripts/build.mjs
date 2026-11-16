// Builds every SVG used by the profile README, in two layouts:
//   assets/*.svg    wide, for desktop
//   assets/m/*.svg  narrow, for phones (picked by <picture media> in the README)
//
//   node scripts/build.mjs
//
// Needs GITHUB_TOKEN (or GH_TOKEN) for the activity, language and trophy
// panels. Without a token only the static panels are rebuilt.
//
// Rendering cost is a design constraint here: animations only touch small
// areas, prefer transform and opacity, and nothing repaints a whole panel.

import { mkdir, readFile, writeFile } from 'node:fs/promises';

const LOGIN = 'mpgamer75';
const OUT = new URL('../assets/', import.meta.url);
const SRC = new URL('./src/', import.meta.url);
const DW = 1200; // desktop viewBox width
const MW = 640; // phone viewBox width

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
};

const MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const r1 = (n) => Math.round(n * 10) / 10;
const num = (v) => v.toLocaleString('en-US');

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
    @keyframes pulse { 0%, 100% { opacity: .3; } 50% { opacity: 1; } }
    @keyframes nudge { 50% { transform: translate(3px, -3px); } }`;

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

// Row of outlined pills; returns the markup and the x where the row ends.
function pills(labels, x, y, size) {
  const h = Math.round(size * 2.15);
  let cx = x;
  const out = labels
    .map((t) => {
      const w = Math.round(t.length * size * 0.63 + size * 1.9);
      const s = `<rect x="${cx}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="none" stroke="${C.line}"/><text class="mono soft" x="${cx + w / 2}" y="${r1(y + h / 2 + size * 0.35)}" font-size="${size}" text-anchor="middle">${esc(t)}</text>`;
      cx += w + 8;
      return s;
    })
    .join('');
  return { out, end: cx, h };
}

const arrow = (x, y, colour = C.amber, k = 1) =>
  `<path class="arrow" fill="none" stroke="${colour}" stroke-width="${2.2 * k}" stroke-linecap="round" stroke-linejoin="round" d="M${x} ${y + 18 * k}L${x + 18 * k} ${y}M${x + 4 * k} ${y}H${x + 18 * k}V${y + 14 * k}"/>`;

// Deterministic noise, so rebuilding does not change the file.
function rng(seed) {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------- hero

function hero(jpeg, m) {
  const W = m ? MW : DW;
  const H = m ? 930 : 514;
  const X = m ? 40 : 64;
  const rand = rng(75);
  const lines = ['I build security tooling for the terminal.', 'I ship web and mobile software.', 'Co-founder of Lanjo Technologies.'];

  // The photo is drawn at its native 1200x514 on desktop. On phones it is
  // enlarged and shifted so the map on the monitor wall sits in the middle.
  const k = m ? 560 / 514 : 1;
  const ox = m ? 320 - 800 * k : 0;
  const place = `transform="translate(${r1(ox)} 0) scale(${r1(k * 1000) / 1000})"`;

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
      ([key, [x, y]], i) =>
        `<circle class="ping" style="animation-delay:${r1(i * 0.45)}s" cx="${x}" cy="${y}" r="9" fill="none" stroke="${C.hot}"/><circle cx="${x}" cy="${y}" r="${key === 'par' ? 4 : 2.6}" fill="${key === 'par' ? '#fff3d6' : C.hot}"/>`,
    )
    .join('\n      ');
  const [px, py] = city.par;

  // kicker: every character resolves out of noise
  const kicker = 'CYBERSECURITY  x  SOFTWARE';
  const pool = '#$%01<>/[]{}*+=?';
  const kSize = m ? 19 : 16;
  const kCell = m ? 15.4 : 13.2;
  const kY = m ? 430 : 186;
  const decode = [...kicker]
    .map((ch, i) => {
      if (ch === ' ') return '';
      const x = r1(X + i * kCell);
      const t0 = 0.4 + i * 0.05;
      const noise = [0, 1, 2]
        .map((n) => `<text class="mono muted sc" style="animation-delay:${r1(t0 + n * 0.09)}s" x="${x}" y="${kY}" font-size="${kSize}">${esc(pool[Math.floor(rand() * pool.length)])}</text>`)
        .join('');
      return `${noise}<text class="mono amber fin" style="animation-delay:${r1(t0 + 0.27)}s" x="${x}" y="${kY}" font-size="${kSize}">${ch}</text>`;
    })
    .join('');

  const nameAttrs = `font-size="${m ? 68 : 74}" font-weight="700" letter-spacing="-2.2"`;
  const name = (cls) =>
    m
      ? `<text class="sans ${cls}" x="${X - 3}" y="506" ${nameAttrs}>Charles</text><text class="sans ${cls}" x="${X - 3}" y="580" ${nameAttrs}>Lantigua Jorge</text>`
      : `<text class="sans ${cls}" x="${X - 4}" y="262" ${nameAttrs}>Charles Lantigua Jorge</text>`;
  const base = m ? 580 : 262;

  const meta = m
    ? [['BASED IN', 'Paris, France', X, 716], ['SPEAKS', 'EN / FR / ES', 340, 716], ['CO-FOUNDER', 'Lanjo Technologies', X, 790], ['FOCUS', 'Recon / applied crypto / SOC tooling', X, 864]]
    : [['BASED IN', 'Paris, France', X, 440], ['CO-FOUNDER', 'Lanjo Technologies', X + 190, 440], ['FOCUS', 'Recon / applied crypto / SOC tooling', X + 430, 440], ['SPEAKS', 'EN / FR / ES', X + 830, 440]];
  const shade = m
    ? `<linearGradient id="shade" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#050506" stop-opacity=".25"/><stop offset=".3" stop-color="#050506" stop-opacity=".1"/><stop offset=".6" stop-color="#050506" stop-opacity="1"/></linearGradient>`
    : `<linearGradient id="shade" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#050506" stop-opacity=".97"/><stop offset=".42" stop-color="#050506" stop-opacity=".8"/><stop offset=".7" stop-color="#050506" stop-opacity=".12"/><stop offset="1" stop-color="#050506" stop-opacity="0"/></linearGradient>
    <linearGradient id="floor" x1="0" x2="0" y1="0" y2="1"><stop offset=".5" stop-color="#050506" stop-opacity="0"/><stop offset="1" stop-color="#050506" stop-opacity=".94"/></linearGradient>`;

  const body = `  <defs>
    <clipPath id="r"><rect width="${W}" height="${H}" rx="18"/></clipPath>
    <clipPath id="s1"><rect x="0" y="${base - 56}" width="${W}" height="19"/></clipPath>
    <clipPath id="s2"><rect x="0" y="${base - 24}" width="${W}" height="15"/></clipPath>
    ${shade}
  </defs>
  <g clip-path="url(#r)">
    <rect width="${W}" height="${H}" fill="#050506"/>
    <g ${place}>
      <image width="1200" height="514" xlink:href="data:image/jpeg;base64,${jpeg}" href="data:image/jpeg;base64,${jpeg}"/>
      ${arcs}
      ${nodes}
      <g><circle cx="${px}" cy="${py}" r="17" fill="none" stroke="#fff3d6" stroke-width="1.2" stroke-dasharray="5 7"/><animateTransform attributeName="transform" type="rotate" from="0 ${px} ${py}" to="360 ${px} ${py}" dur="9s" repeatCount="indefinite"/></g>
      <text class="mono" x="${px + 28}" y="${py - 14}" font-size="11" letter-spacing="1.5" fill="#fff3d6">PAR</text>
      <text class="mono" x="${city.sdq[0] - 38}" y="${city.sdq[1] + 4}" font-size="11" letter-spacing="1.5" fill="${C.hot}">SDQ</text>
    </g>
    <rect width="${W}" height="${H}" fill="url(#shade)"/>
    ${m ? '' : `<rect width="${W}" height="${H}" fill="url(#floor)"/>`}

    <g class="in" style="animation-delay:.1s">
      <rect class="amber" x="${X}" y="${m ? 48 : 57}" width="${m ? 11 : 9}" height="${m ? 11 : 9}"/>
      <text class="mono soft" x="${X + (m ? 24 : 20)}" y="${m ? 60 : 67}" font-size="${m ? 19 : 15}" letter-spacing="1.5">MPGAMER75</text>
      ${m ? '' : `<text class="mono muted" x="${X + 138}" y="67" font-size="15" letter-spacing="1.5">/  48.8566 N  2.3522 E</text>`}
    </g>

    ${decode}
    <g class="in" style="animation-delay:.5s">
      <g class="jit">${name('ink')}</g>
      <g class="gl1" clip-path="url(#s1)">${name('amber')}</g>
      <g class="gl2" clip-path="url(#s2)">${name('hot')}</g>
    </g>
    <rect class="amber underline" x="${X}" y="${base + 26}" width="96" height="3"/>

    ${lines.map((l, i) => `<text class="sans soft rot${i ? '' : ' first'}" style="animation-delay:${1.2 + i * 4}s" x="${X}" y="${base + 76}" font-size="${m ? 28 : 27}">${esc(l)}</text>`).join('\n    ')}

    <g class="in" style="animation-delay:1s">
      ${m ? '' : `<line x1="${X}" y1="408" x2="${W - X}" y2="408" stroke="#3a3530"/>`}
      ${meta
        .map(
          ([key, v, x, y]) => `<text class="mono muted" x="${x}" y="${y}" font-size="${m ? 15 : 13}" letter-spacing="2">${key}</text>
      <text class="sans ink" x="${x}" y="${y + (m ? 32 : 26)}" font-size="${m ? 24 : 18}">${esc(v)}</text>`,
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
    'Cybersecurity engineer and software engineer based in Paris, co-founder of Lanjo Technologies. Security tooling for the terminal, web and mobile software.',
    body,
    `
    .arc { fill: none; stroke: ${C.hot}; stroke-width: 1.4; stroke-linecap: round; stroke-dasharray: 1; stroke-dashoffset: 1; animation: arc 9s ease-in-out infinite; }
    .ping { transform-box: fill-box; transform-origin: center; animation: ping 3.2s ease-out infinite; }
    .in { animation: rise .9s cubic-bezier(.2,.8,.2,1) both; }
    .sc { opacity: 0; animation: on .09s linear; }
    .fin { animation: fade .02s steps(1) both; }
    .jit { animation: jit 7s steps(1) infinite; }
    .gl1 { opacity: 0; animation: gl1 7s steps(1) infinite; }
    .gl2 { opacity: 0; animation: gl2 7s steps(1) infinite; }
    .underline { transform-box: fill-box; transform-origin: 0 50%; animation: draw 1s cubic-bezier(.2,.8,.2,1) .9s both; }
    .rot { opacity: 0; animation: rot 12s linear infinite; }
    @keyframes arc { 0% { stroke-dashoffset: 1; opacity: 1; } 22%, 70% { stroke-dashoffset: 0; opacity: 1; } 86%, 100% { stroke-dashoffset: 0; opacity: 0; } }
    @keyframes ping { from { transform: scale(.3); opacity: 1; } to { transform: scale(1.6); opacity: 0; } }
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
    @media (prefers-reduced-motion: reduce) { .rot.first { opacity: 1; } .arc { stroke-dashoffset: 0; } }`,
  );
}

// ---------------------------------------------------------------- terminal

function terminal(m) {
  const W = m ? MW : DW;
  const X = m ? 34 : 56;
  const SIZE = m ? 23 : 19;
  const CELL = m ? 14 : 11.6;
  const LH = m ? 36 : 30;
  const per = m ? 8 : 16;
  const top = m ? 176 : 164;
  const cmdY = m ? 122 : 116;
  const cmd = 'hexdump -C whoami';
  const typed = 1.9;
  const nameLen = Buffer.byteLength(WHOAMI.split('\n')[0]);
  const bytes = [...Buffer.from(WHOAMI, 'utf8')];
  const rows = [];
  for (let off = 0; off < bytes.length; off += per) rows.push({ off, bytes: bytes.slice(off, off + per) });

  const lines = rows.map(({ off, bytes: b }, i) => {
    const runs = m ? [] : [[off.toString(16).padStart(8, '0') + '  ', 'muted']];
    for (let n = 0; n < per; n++) {
      const cls = off + n < nameLen ? 'amber' : 'soft';
      runs.push([n < b.length ? b[n].toString(16).padStart(2, '0') : '  ', cls], [!m && n === 7 ? '  ' : ' ', 'soft']);
    }
    runs.push([' |', 'faint']);
    b.forEach((v, n) => runs.push([v >= 32 && v < 127 ? String.fromCharCode(v) : '.', off + n < nameLen ? 'amber' : 'ink']));
    runs.push(['|', 'faint']);
    return `<g class="row" style="animation-delay:${r1(typed + 0.25 + i * 0.1)}s">${grid(runs, X, top + i * LH, CELL, SIZE)}</g>`;
  });
  const endY = top + rows.length * LH;
  const H = endY + (m ? 44 : 40);
  const typing = [...cmd]
    .map((ch, i) =>
      ch === ' ' ? '' : `<text class="mono ink ch" style="animation-delay:${r1(0.4 + (i * (typed - 0.4)) / cmd.length)}s" x="${r1(X + (2 + i) * CELL)}" y="${cmdY}" font-size="${SIZE}">${esc(ch)}</text>`,
    )
    .join('');
  const endLabel = bytes.length.toString(16).padStart(8, '0');

  const body = `  ${panel(W, H)}
  <path d="M.5 58H${W - 0.5}" class="rule"/>
  <circle cx="${X + 6}" cy="30" r="6" fill="${C.line}"/><circle cx="${X + 28}" cy="30" r="6" fill="${C.line}"/><circle cx="${X + 50}" cy="30" r="6" fill="${C.line}"/>
  <text class="mono muted" x="${W / 2}" y="35" font-size="${m ? 17 : 14}" letter-spacing="1" text-anchor="middle">charles@paris: ~</text>
  ${grid([['$', 'amber']], X, cmdY, CELL, SIZE)}
  ${typing}
  ${lines.join('\n  ')}
  <g class="row" style="animation-delay:${r1(typed + 0.25 + rows.length * 0.1)}s">${grid([[endLabel, 'muted']], X, endY, CELL, SIZE)}<rect class="amber cursor" x="${r1(X + 9 * CELL)}" y="${endY - SIZE + 3}" width="${m ? 12 : 10}" height="${SIZE}"/></g>`;

  return svg(W, H, 'hexdump -C whoami', `A hexdump of: ${WHOAMI.trim().split('\n').join(', ')}.`, body, `
    .row { animation: rise .45s ease-out both; }
    .ch { animation: fade .05s steps(1) both; }
    .cursor { animation: blink 1.1s steps(1) infinite; }`);
}

// ---------------------------------------------------------------- about

const ABOUT = {
  en: {
    kicker: 'ABOUT',
    h1: 'I build software,',
    h2: 'and the tools that test it.',
    para: 'Most of what is public here is security tooling for the terminal: a recon framework mapped to MITRE ATT&CK, an authenticated encryption toolkit on top of OpenSSL, and the automation I wrote for a SOC team. Alongside it I ship web and mobile products, and I co-founded Lanjo Technologies.',
    rows: [['ROLE', 'Cybersecurity and software engineer'], ['COMPANY', 'Lanjo Technologies, co-founder'], ['BASED IN', 'Paris, France'], ['WORKS ON', 'Recon, applied crypto, SOC tooling'], ['SHIPS WITH', 'Bash, Python, Next.js, Flutter'], ['SPEAKS', 'English, French, Spanish']],
  },
  fr: {
    kicker: 'A PROPOS',
    h1: 'Je construis des logiciels,',
    h2: 'et les outils qui les testent.',
    para: "L'essentiel de ce qui est public ici, ce sont des outils de sécurité pour le terminal : un framework de reconnaissance aligné sur MITRE ATT&CK, une boîte à outils de chiffrement authentifié au-dessus d'OpenSSL, et l'automatisation écrite pour une équipe SOC. En parallèle, je livre des produits web et mobiles, et j'ai cofondé Lanjo Technologies.",
    rows: [['ROLE', 'Ingénieur cybersécurité et logiciel'], ['ENTREPRISE', 'Lanjo Technologies, cofondateur'], ['BASE A', 'Paris, France'], ['TRAVAILLE SUR', 'Recon, crypto appliquée, outils SOC'], ['LIVRE AVEC', 'Bash, Python, Next.js, Flutter'], ['LANGUES', 'Anglais, français, espagnol']],
  },
  es: {
    kicker: 'SOBRE MI',
    h1: 'Construyo software,',
    h2: 'y lo que lo pone a prueba.',
    para: 'La mayor parte de lo que es público aquí son herramientas de seguridad para la terminal: un framework de reconocimiento alineado con MITRE ATT&CK, un conjunto de herramientas de cifrado autenticado sobre OpenSSL, y la automatización que escribí para un equipo SOC. En paralelo entrego productos web y móviles, y cofundé Lanjo Technologies.',
    rows: [['ROL', 'Ingeniero de ciberseguridad y software'], ['EMPRESA', 'Lanjo Technologies, cofundador'], ['BASE', 'París, Francia'], ['TRABAJA EN', 'Recon, cripto aplicada, SOC'], ['ENTREGA CON', 'Bash, Python, Next.js, Flutter'], ['IDIOMAS', 'Inglés, francés, español']],
  },
};

function about(lang, m) {
  const t = ABOUT[lang];
  const W = m ? MW : DW;
  const X = m ? 34 : 56;
  const para = wrap(t.para, m ? 44 : 60);
  const hSize = m ? 39 : 38;
  const pSize = m ? 23 : 17;
  const pLH = m ? 33 : 27;
  const paraTop = m ? 236 : 244;
  const RX = m ? X : 668;
  const rowH = m ? 78 : 46;
  const rowsTop = m ? paraTop + para.length * pLH + 26 : 86;
  const H = m ? rowsTop + t.rows.length * rowH + 30 : Math.max(rowsTop + t.rows.length * rowH + 44, 226 + para.length * pLH + 40);
  const barH = m ? paraTop + para.length * pLH - 86 - 12 : H - 86 - 44;

  const rows = t.rows
    .map(([key, v], i) => {
      const y = rowsTop + i * rowH;
      const text = m
        ? `<text class="mono muted" x="${RX + 18}" y="${y + 30}" font-size="15" letter-spacing="2">${esc(key)}</text>
    <text class="sans ink" x="${RX + 18}" y="${y + 60}" font-size="23">${esc(v)}</text>`
        : `<text class="mono muted" x="${RX + 20}" y="${y + 29}" font-size="12" letter-spacing="2">${esc(key)}</text>
    <text class="sans ink" x="${RX + 158}" y="${y + 30}" font-size="16">${esc(v)}</text>`;
      return `<g class="row" style="animation-delay:${r1(0.5 + i * 0.12)}s">
    ${text}
    <path class="rule" d="M${RX} ${y + rowH + 0.5}H${W - X}" stroke-opacity=".7"/>
  </g>`;
    })
    .join('\n  ');

  const body = `  <defs>
    <linearGradient id="hl" x1="0" x2="1"><stop offset="0" stop-color="${C.amber}" stop-opacity=".16"/><stop offset="1" stop-color="${C.amber}" stop-opacity="0"/></linearGradient>
    <linearGradient id="wipe" x1="0" x2="1"><stop offset="0" stop-color="${C.amber}"/><stop offset="1" stop-color="${C.hot}"/></linearGradient>
  </defs>
  ${panel(W, H)}
  <rect class="amber bar" x="${X}" y="86" width="3" height="${barH}"/>
  <text class="mono amber in" x="${X + 24}" y="100" font-size="${m ? 16 : 13}" letter-spacing="3">${esc(t.kicker)}</text>
  <text class="sans ink in" style="animation-delay:.15s" x="${X + 22}" y="${m ? 154 : 152}" font-size="${hSize}" font-weight="700" letter-spacing="-1">${esc(t.h1)}</text>
  <text class="sans in" style="animation-delay:.3s" x="${X + 22}" y="${m ? 202 : 198}" font-size="${hSize}" font-weight="700" letter-spacing="-1" fill="url(#wipe)">${esc(t.h2)}</text>
  ${para.map((l, i) => `<text class="sans soft in" style="animation-delay:${r1(0.45 + i * 0.07)}s" x="${X + 24}" y="${paraTop + i * pLH}" font-size="${pSize}">${esc(l)}</text>`).join('\n  ')}
  <path class="rule" d="M${RX} ${rowsTop + 0.5}H${W - X}" stroke-opacity=".7"/>
  <g class="hl"><rect x="${RX}" y="${rowsTop + 1}" width="${W - X - RX}" height="${rowH - 1}" fill="url(#hl)"/><rect class="amber" x="${RX}" y="${rowsTop + 1}" width="3" height="${rowH - 1}"/></g>
  ${rows}`;

  return svg(W, H, t.kicker, `${t.h1} ${t.h2} ${t.para} ${t.rows.map(([key, v]) => `${key}: ${v}`).join('. ')}.`, body, `
    .in { animation: rise .8s cubic-bezier(.2,.8,.2,1) both; }
    .row { animation: rise .7s cubic-bezier(.2,.8,.2,1) both; }
    .bar { transform-box: fill-box; transform-origin: 50% 0; animation: barin 1.1s cubic-bezier(.2,.8,.2,1) both; }
    .hl { animation: hl ${t.rows.length * 1.6}s steps(${t.rows.length}) 1.4s infinite both; }
    @keyframes barin { from { transform: scaleY(0); } }
    @keyframes hl { from { transform: translateY(0); } to { transform: translateY(${t.rows.length * rowH}px); } }
    @media (prefers-reduced-motion: reduce) { .hl { display: none; } }`);
}

// ---------------------------------------------------------------- featured cards

// Shared frame: copy on the left and art on the right (desktop), or art on
// top and copy below (phones). `art(box)` draws inside the box it is given.
function feature({ m, accent, kicker, title, text, tags, art, style, alt }) {
  const W = m ? MW : DW;
  const X = m ? 34 : 56;
  const artH = m ? 250 : 320;
  const desc = wrap(text, m ? 45 : 64);
  const dSize = m ? 23 : 17.5;
  const dLH = m ? 33 : 26;
  const kY = m ? artH + 46 : 62;
  const tY = m ? artH + 104 : 112;
  const dY = m ? artH + 150 : 150;
  const tagY = m ? dY + desc.length * dLH + 6 : 320 - 66;
  const p = pills(tags, X, tagY, m ? 17 : 13.5);
  const H = m ? tagY + p.h + 38 : 320;
  const box = m ? { x: 0, y: 0, w: W, h: artH } : { x: 600, y: 0, w: 600, h: 320 };

  const body = `  <defs>
    <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="${C.line}"/></pattern>
    <linearGradient id="fadeE" ${m ? 'x1="0" x2="0" y1="1" y2="0"' : 'x1="0" x2="1"'}><stop offset="0" stop-color="${C.bg}"/><stop offset="1" stop-color="${C.bg}" stop-opacity="0"/></linearGradient>
    <clipPath id="pr"><rect width="${W}" height="${H}" rx="16"/></clipPath>
  </defs>
  ${panel(W, H)}
  <g clip-path="url(#pr)">
    <rect x="${box.x}" y="1" width="${box.w - 1}" height="${box.h - 2}" fill="url(#dots)"/>
    ${m ? `<rect x="0" y="${box.h - 90}" width="${W}" height="90" fill="url(#fadeE)"/>` : `<rect x="600" y="1" width="240" height="318" fill="url(#fadeE)"/>`}
    ${art(box)}
  </g>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="16" fill="none" stroke="${C.line}"/>
  <text class="mono" x="${X}" y="${kY}" font-size="${m ? 16 : 13}" letter-spacing="2" fill="${accent}">${esc(kicker)}</text>
  <text class="sans ink" x="${X - 2}" y="${tY}" font-size="${m ? 46 : 40}" font-weight="700" letter-spacing="-1">${esc(title)}</text>
  ${desc.map((l, i) => `<text class="sans soft" x="${X}" y="${dY + i * dLH}" font-size="${dSize}">${esc(l)}</text>`).join('\n  ')}
  ${p.out}
  ${arrow(p.end + 12, tagY + (m ? 8 : 5), accent, m ? 1.2 : 1)}`;

  return svg(W, H, title, alt, body, `
    .arrow { animation: nudge 2.4s ease-in-out infinite; }${style}`);
}

function lanjo(m) {
  return feature({
    m,
    accent: C.amber,
    kicker: 'FEATURED  /  CO-FOUNDER',
    title: 'Lanjo Technologies',
    text: 'The studio I co-founded in Santiago de los Caballeros: cybersecurity, IT infrastructure, web and custom software from one team that builds the technology and knows how to attack and defend it. I built the company site.',
    tags: ['Next.js 16', 'React 19', 'Tailwind v4'],
    alt: 'Co-founder. Cybersecurity, IT infrastructure, web and custom software studio in Santiago de los Caballeros. Company site built with Next.js 16, React 19 and Tailwind v4.',
    art: (b) => {
      const right = b.x + b.w - 60;
      const word = (cls) => `<text class="sans ${cls}" x="${right}" y="${b.y + (m ? 160 : 196)}" font-size="${m ? 128 : 150}" font-weight="800" letter-spacing="4" text-anchor="end">LANJO</text>`;
      const services = ['CYBERSECURITY', 'IT INFRASTRUCTURE', 'WEB', 'SOFTWARE'];
      let sx = b.x + 100;
      const svc = m
        ? ''
        : services
            .map((s, i) => {
              const out = `<text class="mono svc" style="animation-delay:${i * 1.5}s" x="${sx}" y="246" font-size="13" letter-spacing="2">${s}</text>`;
              sx += s.length * 9.8 + 30;
              return out;
            })
            .join('');
      return `${word('wfill')}${word('wline')}
    ${m ? '' : `<path class="rule" d="M${b.x + 100} 222H${right + 4}"/>`}
    ${svc}
    <text class="mono muted" x="${right + 4}" y="${b.y + (m ? 214 : 282)}" font-size="${m ? 14 : 12}" letter-spacing="${m ? 1 : 2}" text-anchor="end">SANTIAGO DE LOS CABALLEROS  /  19.4517 N  70.6970 W</text>`;
    },
    style: `
    .wline { fill: none; stroke: ${C.amber}; stroke-width: 1.6; stroke-dasharray: 620; stroke-dashoffset: 620; animation: wline 10s ease-in-out infinite; }
    .wfill { fill: ${C.amber}; opacity: 0; animation: wfill 10s ease-in-out infinite; }
    .svc { fill: ${C.muted}; animation: svc 6s linear infinite; }
    @keyframes wline { 0% { stroke-dashoffset: 620; opacity: 1; } 35%, 82% { stroke-dashoffset: 0; opacity: 1; } 94%, 100% { stroke-dashoffset: 0; opacity: 0; } }
    @keyframes wfill { 0%, 30% { opacity: 0; } 45%, 82% { opacity: .16; } 94%, 100% { opacity: 0; } }
    @keyframes svc { 0%, 25%, 100% { fill: ${C.muted}; } 4%, 20% { fill: ${C.hot}; } }
    @media (prefers-reduced-motion: reduce) { .wline { stroke-dashoffset: 0; } .wfill { opacity: .16; } }`,
  });
}

function saludrd(logo, m) {
  const TEAL = '#4fd1d9';
  const BLUE = '#2f7fd6';
  return feature({
    m,
    accent: TEAL,
    kicker: 'PRODUCT  /  LANJO TECHNOLOGIES',
    title: 'Mi SaludRD',
    text: "Lanjo's own product, in beta: a digital health platform for the Dominican Republic. Patients book appointments with verified professionals; doctors get scheduling, clinical records and modules per specialty.",
    tags: ['Next.js', 'Flutter', 'Supabase', 'Stripe'],
    alt: 'Digital health platform for the Dominican Republic, built and operated by Lanjo Technologies. Next.js, Flutter, Supabase, Stripe.',
    art: (b) => {
      const cx = b.x + b.w / 2 + (m ? 0 : 30);
      const cy = b.y + (m ? 118 : 150);
      const l = b.x + (m ? 30 : 40);
      const r = b.x + b.w - (m ? 30 : 56);
      const ecg = `M${l} ${cy}H${cx - 190}l10 -8 10 8h20l8 16 12 -70 14 96 10 -42h22M${cx + 82} ${cy}h20l8 16 12 -70 14 96 10 -42h22l10 -8 10 8H${r}`;
      return `<defs><radialGradient id="halo"><stop offset="0" stop-color="${TEAL}" stop-opacity=".22"/><stop offset="1" stop-color="${TEAL}" stop-opacity="0"/></radialGradient></defs>
    <circle cx="${cx}" cy="${cy}" r="170" fill="url(#halo)"/>
    <path d="${ecg}" fill="none" stroke="${C.line}" stroke-width="1.5" stroke-linejoin="round"/>
    <path class="ecg" pathLength="1" d="${ecg}" fill="none" stroke="${TEAL}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle class="ring" cx="${cx}" cy="${cy}" r="62" fill="none" stroke="${TEAL}" stroke-width="1.5"/>
    <circle class="ring" style="animation-delay:1.5s" cx="${cx}" cy="${cy}" r="62" fill="none" stroke="${BLUE}" stroke-width="1.5"/>
    <circle cx="${cx}" cy="${cy}" r="62" fill="#0d1218" stroke="${C.line}"/>
    <image class="beat" x="${cx - 66}" y="${cy - 66}" width="132" height="132" xlink:href="data:image/png;base64,${logo}" href="data:image/png;base64,${logo}"/>
    ${m ? '' : `<text class="mono muted" x="${r}" y="282" font-size="12" letter-spacing="2" text-anchor="end">MI-SALUDRD.COM  /  REPUBLICA DOMINICANA</text>`}`;
    },
    style: `
    .ecg { stroke-dasharray: .22 .78; animation: ecg 3.2s linear infinite; }
    .ring { transform-box: fill-box; transform-origin: center; animation: ring 3s ease-out infinite; }
    .beat { transform-box: fill-box; transform-origin: center; animation: beat 1.6s ease-in-out infinite; }
    @keyframes ecg { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
    @keyframes ring { from { transform: scale(1); opacity: .9; } to { transform: scale(1.9); opacity: 0; } }
    @keyframes beat { 0%, 30%, 100% { transform: scale(1); } 12% { transform: scale(1.08); } 22% { transform: scale(.98); } }
    @media (prefers-reduced-motion: reduce) { .ecg { stroke-dasharray: none; } .ring { display: none; } }`,
  });
}

// ---------------------------------------------------------------- project cards

const CW = 590; // width the motifs are drawn for
const BAND = 136; // and their height

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
        .map(([t, key, msg, hot], i) => `<text class="mono" x="32" y="${yo + i * lh}" font-size="13.5" xml:space="preserve"><tspan class="muted">${t}  </tspan><tspan class="${hot ? 'amber' : 'muted'}">${key}  </tspan><tspan class="${hot ? 'hot' : 'soft'}">${esc(msg)}</tspan></text>`)
        .join('');
    // steps(): the log advances one line at a time instead of repainting every frame
    return `<g><g class="scroll">${one(26)}${one(26 + rows.length * lh)}</g></g>`;
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
    const blocks = [[x + 18, 54, 150, 12], [x + 18, 74, 96, 8], [x + 18, 92, 60, 18], [x + 204, 52, w - 222, 58]];
    return `<g>
      <rect x="${x}" y="14" width="${w}" height="${BAND - 28}" rx="10" fill="${C.raised}" stroke="${C.line}"/>
      <path class="rule" d="M${x} 40H${x + w}"/>
      <circle cx="${x + 16}" cy="27" r="3.5" fill="${C.line}"/><circle cx="${x + 28}" cy="27" r="3.5" fill="${C.line}"/>
      <text class="mono muted" x="${x + 46}" y="31" font-size="11">orthoprotesis-francis-valerio.vercel.app</text>
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

const CARD_STYLE = `
    .tick { animation: tick 3.9s ease-in-out infinite; }
    .pa { animation: pa 5s ease-in-out infinite; } .pb { opacity: 0; animation: pb 5s ease-in-out infinite; }
    .halo { transform-box: fill-box; transform-origin: center; animation: halo 2.8s ease-out infinite; }
    .sk { animation: pulse 2.6s ease-in-out infinite; }
    .cyc { opacity: 0; animation: cyc 10s linear infinite; }
    .cursor { animation: blink 1.1s steps(1) infinite; }
    .arrow { animation: nudge 2.4s ease-in-out infinite; }
    .scroll { animation: scroll 9s steps(6) infinite; }
    @keyframes scroll { to { transform: translateY(-144px); } }
    @keyframes tick { 0%, 100% { opacity: .35; } 12%, 30% { opacity: 1; } 45% { opacity: .35; } }
    @keyframes pa { 0%, 22% { opacity: 1; } 30%, 78% { opacity: 0; } 86%, 100% { opacity: 1; } }
    @keyframes pb { 0%, 22% { opacity: 0; } 30%, 78% { opacity: 1; } 86%, 100% { opacity: 0; } }
    @keyframes halo { from { transform: scale(.6); opacity: .9; } to { transform: scale(2.2); opacity: 0; } }
    @keyframes cyc { 0% { opacity: 0; } 2%, 18% { opacity: 1; } 20%, 100% { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .cyc.first { opacity: 1; } }`;

// Desktop: a wide row, motif on the left and copy on the right.
// Phones: motif on top, copy below in a larger size.
function card(c, n, m) {
  const no = String(n).padStart(2, '0');
  if (m) {
    const lines = wrap(c.desc, 45);
    const tagY = BAND + 94 + lines.length * 31 + 2;
    const p = pills(c.tags, 30, tagY, 17);
    const H = tagY + p.h + 32;
    const body = `  <defs><clipPath id="band"><path d="M0 16A16 16 0 0 1 16 0H${CW - 16}A16 16 0 0 1 ${CW} 16V${BAND}H0Z"/></clipPath></defs>
  ${panel(CW, H)}
  <g clip-path="url(#band)"><rect width="${CW}" height="${BAND}" fill="#0d0e12"/>${motifs[c.motif]()}</g>
  <path class="rule" d="M.5 ${BAND}H${CW - 0.5}"/>
  <rect x=".5" y=".5" width="${CW - 1}" height="${H - 1}" rx="16" fill="none" stroke="${C.line}"/>
  <text class="mono amber" x="30" y="${BAND + 50}" font-size="16" letter-spacing="2">${no}</text>
  <text class="sans ink" x="68" y="${BAND + 54}" font-size="31" font-weight="700" letter-spacing="-.4">${esc(c.title)}</text>
  ${arrow(CW - 54, BAND + 30, C.amber, 1.15)}
  ${lines.map((l, i) => `<text class="sans soft" x="30" y="${BAND + 94 + i * 31}" font-size="22">${esc(l)}</text>`).join('\n  ')}
  ${p.out}`;
    return svg(CW, H, c.title, c.desc, body, CARD_STYLE);
  }

  const W = DW;
  const H = 220;
  const TX = 634;
  const lines = wrap(c.desc, 60);
  const p = pills(c.tags, TX, H - 54, 13);
  const body = `  <defs><clipPath id="band"><path d="M0 16A16 16 0 0 1 16 0H${CW}V${H}H16A16 16 0 0 1 0 ${H - 16}Z"/></clipPath></defs>
  ${panel(W, H)}
  <g clip-path="url(#band)"><rect width="${CW}" height="${H}" fill="#0d0e12"/><g transform="translate(0 ${(H - BAND) / 2})">${motifs[c.motif]()}</g></g>
  <path class="rule" d="M${CW + 0.5} .5V${H - 0.5}"/>
  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="16" fill="none" stroke="${C.line}"/>
  <text class="mono amber" x="${TX}" y="56" font-size="13" letter-spacing="2">${no}</text>
  <text class="sans ink" x="${TX + 32}" y="59" font-size="26" font-weight="700" letter-spacing="-.4">${esc(c.title)}</text>
  ${arrow(W - 76, 38)}
  ${lines.map((l, i) => `<text class="sans soft" x="${TX}" y="${94 + i * 25}" font-size="17">${esc(l)}</text>`).join('\n  ')}
  ${p.out}`;
  return svg(W, H, c.title, c.desc, body, CARD_STYLE);
}

// ---------------------------------------------------------------- stack

const STACK = [
  ['SECURITY', [['Recon / OSINT', null, '#f0a23b'], ['MITRE ATT&CK', null, '#ff5a5f'], ['nmap', null, '#4c9aff'], ['OpenSSL', null, '#ff8a65'], ['X.509 / PKI', null, '#b48cff'], ['SOC tooling', null, '#3fcf8e']]],
  ['LANGUAGES', [['Bash', 'gnubash', '#4eaa25'], ['Python', 'python', '#4b8bbe'], ['TypeScript', 'typescript', '#3178c6'], ['JavaScript', 'javascript', '#f7df1e'], ['PowerShell', null, '#5391fe'], ['Dart', 'dart', '#29b6f6'], ['Java', 'openjdk', '#f89820'], ['C', 'c', '#a8b9cc']]],
  ['WEB AND MOBILE', [['Next.js', 'nextdotjs', '#ffffff'], ['React', 'react', '#61dafb'], ['Tailwind CSS', 'tailwindcss', '#38bdf8'], ['Flutter', 'flutter', '#54c5f8']]],
  ['DATA', [['PostgreSQL', 'postgresql', '#5a8dee'], ['Supabase', 'supabase', '#3fcf8e'], ['Firebase', 'firebase', '#ffca28'], ['SQLite', 'sqlite', '#7ec8f0']]],
  ['SYSTEMS', [['Linux', 'linux', '#fcc624'], ['Docker', 'docker', '#2496ed'], ['GitHub Actions', 'githubactions', '#2088ff'], ['Git', 'git', '#f05032'], ['Vercel', 'vercel', '#ffffff']]],
];

function stack(icons, m) {
  const W = m ? MW : DW;
  const X = m ? 34 : 56;
  const k = m ? 1.32 : 1; // chip scale
  const chipX = m ? X : 268;
  const chipH = 44 * k;
  const gapX = 10;
  const rowGap = m ? 26 : 20;
  let y = m ? 40 : 44;
  let n = 0;
  const out = [];

  for (const [label, items] of STACK) {
    if (m) {
      out.push(`<text class="mono muted" x="${X}" y="${y + 16}" font-size="16" letter-spacing="2">${label}</text>`);
      y += 34;
    } else {
      out.push(`<text class="mono muted" x="${X}" y="${y + 27}" font-size="13" letter-spacing="2">${label}</text>`);
    }
    let x = chipX;
    for (const [name, icon, colour] of items) {
      const w = Math.round((46 + name.length * 9.7 + 18) * k);
      if (x + w > W - X) {
        x = chipX;
        y += chipH + 10;
      }
      const glyph = icon
        ? `<path transform="translate(15 12) scale(${20 / 24})" fill="${colour}" d="${icons[icon]}"/>`
        : `<rect x="19" y="16" width="12" height="12" fill="${colour}" fill-opacity=".25" stroke="${colour}" stroke-width="1.5" transform="rotate(45 25 22)"/>`;
      const w1 = r1(w / k);
      out.push(
        `<g class="chip" style="animation-delay:${n++ * 40}ms"><g transform="translate(${x} ${r1(y)}) scale(${k})"><rect width="${w1}" height="44" rx="10" fill="${C.raised}" stroke="${colour}" stroke-opacity=".42"/>${glyph}<text class="mono ink" x="46" y="27.5" font-size="16">${esc(name)}</text></g></g>`,
      );
      x += w + gapX;
    }
    y += chipH + rowGap;
    if (label !== STACK.at(-1)[0]) out.push(`<path class="rule" d="M${X} ${r1(y - rowGap / 2)}H${W - X}" stroke-opacity=".6"/>`);
  }
  const H = Math.round(y - rowGap + (m ? 36 : 44));
  const desc = STACK.map(([l, items]) => `${l}: ${items.map((i) => i[0]).join(', ')}`).join('. ');
  return svg(W, H, 'Stack', desc, `  ${panel(W, H)}\n  ${out.join('\n  ')}`, `
    .chip { animation: rise .6s cubic-bezier(.2,.8,.2,1) both; }`);
}

// ---------------------------------------------------------------- data

const START_YEAR = 2023; // the account's first year

async function fetchData(token) {
  const years = [];
  for (let y = START_YEAR; y <= new Date().getUTCFullYear(); y++) years.push(y);
  const yearly = years
    .map((y) => `y${y}: contributionsCollection(from: "${y}-01-01T00:00:00Z", to: "${y}-12-31T23:59:59Z") { totalCommitContributions totalPullRequestReviewContributions contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } } }`)
    .join('\n      ');
  const query = `query($login: String!) {
    user(login: $login) {
      createdAt
      pullRequests { totalCount }
      issues { totalCount }
      followers { totalCount }
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount } }
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
  const cal = user.contributionsCollection.contributionCalendar;
  const weeks = cal.weeks.map((w) => ({
    start: w.contributionDays[0].date,
    total: w.contributionDays.reduce((a, d) => a + d.contributionCount, 0),
  }));
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
  const yearly = Object.entries(user)
    .filter(([key]) => /^y\d{4}$/.test(key))
    .map(([, v]) => v);
  const sum = (f) => yearly.reduce((a, y) => a + f(y), 0);
  const best = yearly
    .flatMap((y) => y.contributionCalendar.weeks.flatMap((w) => w.contributionDays))
    .reduce((a, d) => (d.contributionCount > a.contributionCount ? d : a));
  return {
    total: cal.totalContributions,
    weeks,
    repos: user.repositories.totalCount,
    languages,
    totalAll: sum((y) => y.contributionCalendar.totalContributions),
    commitsAll: sum((y) => y.totalCommitContributions),
    reviews: sum((y) => y.totalPullRequestReviewContributions),
    prsAll: user.pullRequests.totalCount,
    issues: user.issues.totalCount,
    followers: user.followers.totalCount,
    best: { count: best.contributionCount, date: best.date },
    stars,
    langCount: bytes.size,
    years: (Date.now() - new Date(user.createdAt).getTime()) / (365.25 * 24 * 3600 * 1000),
  };
}

// ---------------------------------------------------------------- activity: scan report + radar

// The last 52 weeks drawn as a radar: one spoke per week, clockwise from the
// top, oldest first. A sweep turns once every six seconds and each spoke
// lights up as it passes. Next to it, the all-time figures are printed the
// way a port scanner prints its findings.
function activity(s, m) {
  const W = m ? MW : DW;
  const X = m ? 34 : 56;
  const R = m ? 190 : 150;
  const r0 = m ? 58 : 46;
  const cx = m ? W / 2 : 946;
  const cy = m ? 300 : 232;
  const size = m ? 21 : 16.5;
  const cell = m ? 12.7 : 10;
  const LH = m ? 33 : 27;
  const top = m ? cy + R + 76 : 118;
  const n = s.weeks.length;
  const max = Math.max(1, ...s.weeks.map((w) => w.total));
  const SPIN = 6;

  const xy = (deg, r) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [r1(cx + r * Math.cos(a)), r1(cy + r * Math.sin(a))];
  };
  const pt = (deg, r) => xy(deg, r).join(' ');
  const spokes = s.weeks
    .map((w, i) => {
      const deg = (i / n) * 360;
      if (w.total === 0) {
        const [x, y] = xy(deg, r0 + 8);
        return `<circle cx="${x}" cy="${y}" r="1.6" fill="${C.line}"/>`;
      }
      const len = 8 + (w.total / max) * (R - r0 - 22);
      return `<path class="spoke" style="animation-delay:${r1((i / n) * SPIN)}s" d="M${pt(deg, r0 + 6)}L${pt(deg, r0 + 6 + len)}"/>`;
    })
    .join('\n    ');
  const wedge = `M${cx} ${cy}L${pt(-34, R)}A${R} ${R} 0 0 1 ${pt(0, R)}Z`;

  const rowsData = [
    ['contributions', num(s.totalAll)],
    ['commits', num(s.commitsAll)],
    ['pull-requests', num(s.prsAll)],
    ['public-repos', num(s.repos)],
    ['languages', num(s.langCount)],
    ['best-day', `${s.best.count}  (${s.best.date})`],
  ];
  const report = [
    [['$ ', 'amber'], [m ? 'scan --target mpgamer75' : 'scan --target github.com/mpgamer75 --all-time', 'ink']],
    [[m ? 'Host is up. Reading activity.' : 'Host is up. Reading activity since 2023.', 'muted']],
    [],
    [['FIELD'.padEnd(17) + 'STATE'.padEnd(8) + 'VALUE', 'muted']],
    ...rowsData.map(([key, v]) => [[key.padEnd(17), 'soft'], ['open'.padEnd(8), 'amber'], [v, 'ink']]),
    [],
    [[`Scan done: ${rowsData.length} fields open, 0 filtered.`, 'muted']],
  ];
  const lines = report
    .map((runs, i) => (runs.length ? `<g class="ln" style="animation-delay:${r1(0.3 + i * 0.16)}s">${grid(runs, X, top + i * LH, cell, size)}</g>` : ''))
    .join('\n  ');
  const endY = top + (report.length - 1) * LH;
  const lastLen = report.at(-1)[0][0].length;
  const H = m ? endY + 50 : 450;

  const body = `  <defs>
    <radialGradient id="glow"><stop offset="0" stop-color="${C.amber}" stop-opacity=".16"/><stop offset="1" stop-color="${C.amber}" stop-opacity="0"/></radialGradient>
  </defs>
  ${panel(W, H)}
  <text class="mono muted" x="${X}" y="${m ? 56 : 58}" font-size="${m ? 16 : 14}" letter-spacing="2">ACTIVITY  /  SCAN REPORT</text>
  <circle cx="${cx}" cy="${cy}" r="${R + 30}" fill="url(#glow)"/>
  ${[r0, (r0 + R) / 2, R].map((r) => `<circle cx="${cx}" cy="${cy}" r="${r1(r)}" class="rule"/>`).join('')}
  <path class="rule" d="M${cx - R - 10} ${cy}H${cx - r0}M${cx + r0} ${cy}H${cx + R + 10}M${cx} ${cy - R - 10}V${cy - r0}M${cx} ${cy + r0}V${cy + R + 10}"/>
  <g>
    ${spokes}
  </g>
  <g><path d="${wedge}" fill="${C.amber}" opacity=".13"/><path d="M${cx} ${cy}L${pt(0, R)}" stroke="${C.hot}" stroke-width="1.6"/>
    <animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="${SPIN}s" repeatCount="indefinite"/></g>
  <circle cx="${cx}" cy="${cy}" r="${r0 - 1}" fill="${C.bg}" stroke="${C.line}"/>
  <text class="sans ink" x="${cx}" y="${cy + (m ? 6 : 4)}" font-size="${m ? 36 : 29}" font-weight="700" text-anchor="middle">${num(s.total)}</text>
  <text class="mono muted" x="${cx}" y="${cy + (m ? 26 : 21)}" font-size="${m ? 12 : 10}" letter-spacing="1.5" text-anchor="middle">52 WEEKS</text>
  <text class="mono muted" x="${cx + 8}" y="${cy - R - 16}" font-size="${m ? 13 : 11}" letter-spacing="1.5">NOW</text>
  <text class="mono soft" x="${cx}" y="${cy + R + (m ? 44 : 40)}" font-size="${m ? 15 : 12.5}" letter-spacing="1.5" text-anchor="middle">PEAK WEEK  ${max}</text>
  ${lines}
  <rect class="amber cursor" x="${r1(X + (lastLen + 1) * cell)}" y="${endY - size + 3}" width="${m ? 11 : 9}" height="${size}"/>`;

  return svg(W, H, 'Activity scan report', `${s.totalAll} contributions all time: ${s.commitsAll} commits, ${s.prsAll} pull requests, ${s.repos} public repositories, ${s.langCount} languages. Best day ${s.best.count} on ${s.best.date}. ${s.total} contributions in the last 52 weeks, busiest week ${max}.`, body, `
    .spoke { stroke: ${C.amber}; stroke-width: ${m ? 6 : 5}; stroke-linecap: round; opacity: .42; animation: lit ${SPIN}s linear infinite; }
    .ln { animation: fade .3s steps(1) both; }
    .cursor { animation: blink 1.1s steps(1) infinite; }
    @keyframes lit { 0% { opacity: 1; stroke: ${C.hot}; } 30%, 100% { opacity: .42; stroke: ${C.amber}; } }
    @media (prefers-reduced-motion: reduce) { .spoke { opacity: .8; } }`);
}

// ---------------------------------------------------------------- languages

function languages(s, m) {
  const W = m ? MW : DW;
  const X = m ? 34 : 56;
  const colsN = m ? 1 : 2;
  const perCol = Math.ceil(s.languages.length / colsN);
  const rowH = m ? 58 : 46;
  const top = m ? 112 : 106;
  const H = top + perCol * rowH + (m ? 4 : 14);
  const colW = (W - 2 * X - 64 * (colsN - 1)) / colsN;
  const nameW = m ? 170 : 130;
  const trackW = colW - nameW - (m ? 86 : 64);
  const maxShare = s.languages[0].share;
  const fs = m ? 22 : 16;

  const rows = s.languages
    .map((l, i) => {
      const cx = X + Math.floor(i / perCol) * (colW + 64);
      const y = top + (i % perCol) * rowH;
      const w = Math.max(4, r1((l.share / maxShare) * trackW));
      return `<text class="mono ink" x="${cx}" y="${y + 6}" font-size="${fs}">${esc(l.name)}</text>
  <rect x="${cx + nameW}" y="${y - 5}" width="${r1(trackW)}" height="8" rx="4" fill="${C.track}"/>
  <rect class="bar" style="animation-delay:${i * 80}ms" x="${cx + nameW}" y="${y - 5}" width="${w}" height="8" rx="4" fill="${C.amber}"/>
  <text class="mono soft" x="${r1(cx + colW)}" y="${y + 6}" font-size="${fs - 1}" text-anchor="end">${(l.share * 100).toFixed(1)}%</text>`;
    })
    .join('\n  ');

  const body = `  ${panel(W, H)}
  <text class="mono muted" x="${X}" y="${m ? 56 : 58}" font-size="${m ? 16 : 14}" letter-spacing="2">LANGUAGES  /  ${m ? 'SHARE OF BYTES' : 'PUBLIC REPOSITORIES'}</text>
  ${m ? '' : `<text class="mono muted" x="${W - X}" y="58" font-size="14" letter-spacing="2" text-anchor="end">SHARE OF BYTES</text>`}
  ${rows}`;
  return svg(W, H, 'Languages across public repositories', `Share of code by bytes: ${s.languages.map((l) => `${l.name} ${(l.share * 100).toFixed(1)}%`).join(', ')}.`, body, `
    .bar { transform-box: fill-box; transform-origin: 0 50%; animation: grow .9s cubic-bezier(.2,.8,.2,1) both; }
    @keyframes grow { from { transform: scaleX(0); } }`);
}

// ---------------------------------------------------------------- trophies

const TIERS = ['C', 'B', 'A', 'AA', 'AAA', 'S', 'SS', 'SSS'];

function rank(value, steps) {
  let i = -1;
  while (i + 1 < steps.length && value >= steps[i + 1]) i++;
  const next = i + 1 < steps.length ? steps[i + 1] : null;
  const floor = i >= 0 ? steps[i] : 0;
  return { tier: i, next, progress: next === null ? 1 : (value - floor) / (next - floor) };
}

function trophies(s, m) {
  const W = m ? MW : DW;
  const X = m ? 34 : 56;
  const gap = 14;
  const perRow = m ? 2 : 5;
  const TW = 206; // a tile is drawn at 206 x 214 and scaled to fit
  const TH = 214;
  const k = (W - 2 * X - gap * (perRow - 1)) / perRow / TW;
  const items = [
    ['COMMITS', s.commitsAll, num(s.commitsAll), [1, 10, 100, 200, 500, 1000, 2000, 4000]],
    ['PULL REQUESTS', s.prsAll, num(s.prsAll), [1, 10, 20, 50, 100, 200, 500, 1000]],
    ['CONTRIBUTIONS', s.totalAll, num(s.totalAll), [1, 50, 100, 250, 500, 1000, 2500, 5000]],
    ['LANGUAGES', s.langCount, s.langCount, [1, 2, 3, 5, 8, 10, 15, 20]],
    ['EXPERIENCE', s.years, `${s.years.toFixed(1)} yrs`, [0.5, 1, 1.5, 2, 3, 5, 7.5, 10]],
    ['REPOSITORIES', s.repos, s.repos, [1, 10, 20, 30, 35, 40, 45, 50]],
    ['STARS', s.stars, s.stars, [1, 10, 30, 50, 100, 200, 700, 2000]],
    ['FOLLOWERS', s.followers, s.followers, [1, 10, 20, 50, 100, 200, 400, 1000]],
    ['REVIEWS', s.reviews, s.reviews, [1, 3, 8, 20, 30, 45, 57, 70]],
    ['ISSUES', s.issues, s.issues, [1, 10, 20, 50, 100, 200, 500, 1000]],
  ];
  const rows = Math.ceil(items.length / perRow);
  const top = m ? 80 : 74;
  const H = Math.round(top + rows * TH * k + (rows - 1) * gap + 34);
  const hex = (hx, hy, r) =>
    'M' + Array.from({ length: 6 }, (_, n) => `${r1(hx + r * Math.cos((Math.PI / 180) * (60 * n - 90)))} ${r1(hy + r * Math.sin((Math.PI / 180) * (60 * n - 90)))}`).join('L') + 'Z';
  const cx = TW / 2;
  const cy = 62;

  const tiles = items
    .map(([label, value, shown, steps], i) => {
      const x = X + (i % perRow) * (TW * k + gap);
      const y = top + Math.floor(i / perRow) * (TH * k + gap);
      const { tier, next, progress } = rank(value, steps);
      const name = tier < 0 ? '?' : TIERS[tier];
      const colour = tier < 0 ? '#565a63' : tier >= 5 ? '#ffe2a6' : tier >= 2 ? C.amber : '#c08a55';
      const barW = TW - 48;
      const nextLabel = next === null ? 'top rank' : `${TIERS[tier + 1]} at ${num(next)}`;
      const shimmer = tier < 0 ? '' : `<g clip-path="url(#hx)"><rect class="shine" style="animation-delay:${r1(1.4 + i * 0.3)}s" x="${cx - 80}" y="${cy - 45}" width="22" height="90" fill="#fff" opacity=".3"/></g>`;
      return `<g class="tile" style="animation-delay:${i * 90}ms"><g transform="translate(${r1(x)} ${r1(y)}) scale(${r1(k * 1000) / 1000})">
    <rect width="${TW}" height="${TH}" rx="12" fill="${C.raised}" stroke="${C.line}"/>
    <path d="${hex(cx, cy, 38)}" fill="${colour}" opacity=".1"/>
    ${shimmer}
    <path class="hexl" style="animation-delay:${r1(0.3 + i * 0.1)}s" pathLength="1" d="${hex(cx, cy, 38)}" fill="none" stroke="${colour}" stroke-width="2" stroke-linejoin="round"/>
    <path d="${hex(cx, cy, 30)}" fill="none" stroke="${colour}" stroke-width="1" opacity=".35"/>
    <text class="sans" x="${cx}" y="${cy + (name.length > 2 ? 7 : 9)}" font-size="${name.length > 2 ? 20 : 26}" font-weight="800" text-anchor="middle" fill="${colour}" letter-spacing="${name.length > 1 ? 1 : 0}">${name}</text>
    <text class="mono muted" x="${cx}" y="132" font-size="12" letter-spacing="1.5" text-anchor="middle">${label}</text>
    <text class="sans ${tier < 0 ? 'muted' : 'ink'}" x="${cx}" y="163" font-size="25" font-weight="600" text-anchor="middle">${shown}</text>
    <rect x="24" y="178" width="${barW}" height="4" rx="2" fill="${C.track}"/>
    ${progress > 0 ? `<rect class="prog" style="animation-delay:${r1(0.6 + i * 0.1)}s" x="24" y="178" width="${r1(barW * Math.max(0.04, Math.min(1, progress)))}" height="4" rx="2" fill="${colour}"/>` : ''}
    <text class="mono muted" x="${cx}" y="201" font-size="11.5" text-anchor="middle">${nextLabel}</text>
  </g></g>`;
    })
    .join('\n  ');

  const body = `  <defs><clipPath id="hx"><path d="${hex(cx, cy, 38)}"/></clipPath></defs>
  ${panel(W, H)}
  <text class="mono muted" x="${X}" y="${m ? 54 : 52}" font-size="${m ? 16 : 14}" letter-spacing="2">TROPHIES  /  ALL TIME</text>
  <text class="mono muted" x="${W - X}" y="${m ? 54 : 52}" font-size="${m ? 16 : 14}" letter-spacing="2" text-anchor="end">${m ? 'C  &gt;  SSS' : 'RANKED  C  &gt;  SSS'}</text>
  ${tiles}`;
  const desc = items.map(([l, v, shown, steps]) => `${l} ${shown}, rank ${TIERS[rank(v, steps).tier] ?? 'none yet'}`).join('; ');
  return svg(W, H, 'Trophies', desc, body, `
    .tile { animation: rise .7s cubic-bezier(.2,.8,.2,1) both; }
    .hexl { stroke-dasharray: 1; stroke-dashoffset: 1; animation: hexl 1.4s cubic-bezier(.4,0,.2,1) both; }
    .prog { transform-box: fill-box; transform-origin: 0 50%; animation: grow .9s cubic-bezier(.2,.8,.2,1) both; }
    .shine { animation: shine 5s ease-in-out infinite; }
    @keyframes hexl { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
    @keyframes grow { from { transform: scaleX(0); } }
    @keyframes shine { 0% { transform: translateX(0) skewX(-20deg); } 26%, 100% { transform: translateX(190px) skewX(-20deg); } }
    @media (prefers-reduced-motion: reduce) { .hexl { stroke-dashoffset: 0; } .shine { display: none; } }`);
}

// ---------------------------------------------------------------- small parts

function divider() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${DW} 24" width="${DW}" height="24" aria-hidden="true">
  <style>.p { animation: p 3.2s ease-in-out infinite; } @keyframes p { 50% { opacity: .35; } } @media (prefers-reduced-motion: reduce) { .p { animation: none; } }</style>
  <path d="M0 12.5H${DW}" stroke="#8a8f98" stroke-opacity=".28"/>
  <rect class="p" x="${DW / 2 - 4.5}" y="8" width="9" height="9" fill="${C.amber}" transform="rotate(45 ${DW / 2} 12.5)"/>
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

function footer(m) {
  const W = m ? MW : DW;
  const H = m ? 150 : 120;
  const fs = m ? 20 : 16;
  const cell = fs * 0.6;
  const hex = [...Buffer.from(WHOAMI, 'utf8')].map((b) => b.toString(16).padStart(2, '0')).join(' ');
  const shown = hex.slice(0, Math.floor((W - 60) / cell / 3) * 3 - 1);
  const body = `  <defs>
    <linearGradient id="edge" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".14" stop-color="#fff"/><stop offset=".86" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="mk"><rect width="${W}" height="${H}" fill="url(#edge)"/></mask>
  </defs>
  ${panel(W, H)}
  <g mask="url(#mk)"><text class="mono muted" x="${W / 2}" y="${m ? 58 : 50}" font-size="${fs}" text-anchor="middle" textLength="${r1(shown.length * cell)}" lengthAdjust="spacingAndGlyphs">${shown}</text></g>
  <rect class="amber dot" x="${W / 2 - 4.5}" y="${m ? 92 : 74}" width="9" height="9" transform="rotate(45 ${W / 2} ${m ? 96.5 : 78.5})"/>
  <text class="mono soft" x="${W / 2 - 22}" y="${m ? 102 : 84}" font-size="${m ? 15 : 14}" letter-spacing="2" text-anchor="end">${m ? 'CHARLES L. J.' : 'CHARLES LANTIGUA JORGE'}</text>
  <text class="mono muted" x="${W / 2 + 22}" y="${m ? 102 : 84}" font-size="${m ? 15 : 14}" letter-spacing="2">PARIS  /  EOF</text>`;
  return svg(W, H, 'End of file', 'The first bytes of the hexdump above.', body, `
    .dot { animation: pulse 3s ease-in-out infinite; }`);
}

// ---------------------------------------------------------------- main

await mkdir(new URL('m/', OUT), { recursive: true });
// each panel is written twice: wide into assets/, narrow into assets/m/
const write2 = async (name, make) => {
  await writeFile(new URL(name, OUT), make(false));
  await writeFile(new URL(`m/${name}`, OUT), make(true));
};
const write = (name, content) => writeFile(new URL(name, OUT), content);

const jpeg = (await readFile(new URL('hero.jpg', SRC))).toString('base64');
const logo = (await readFile(new URL('saludrd-logo.png', SRC))).toString('base64');
const icons = JSON.parse(await readFile(new URL('icons.json', SRC), 'utf8'));

await write2('hero.svg', (m) => hero(jpeg, m));
await write2('terminal.svg', terminal);
for (const lang of Object.keys(ABOUT)) await write2(`about-${lang}.svg`, (m) => about(lang, m));
await write2('card-lanjo.svg', lanjo);
await write2('card-saludrd.svg', (m) => saludrd(logo, m));
for (const [i, c] of CARDS.entries()) await write2(`card-${c.file}.svg`, (m) => card(c, i + 1, m));
await write2('stack.svg', (m) => stack(icons, m));
await write2('footer.svg', footer);
await write('divider.svg', divider());
for (const [file, label] of [['portfolio', 'Portfolio'], ['linkedin', 'LinkedIn'], ['repositories', 'All repositories']]) {
  await write(`btn-${file}.svg`, button(label));
}

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!token) {
  console.log('No GITHUB_TOKEN set: rebuilt the static panels only.');
} else {
  const stats = await applyFloors(summarise(await fetchData(token)));
  await write2('activity.svg', (m) => activity(stats, m));
  await write2('languages.svg', (m) => languages(stats, m));
  await write2('trophies.svg', (m) => trophies(stats, m));
  console.log(`Built for ${LOGIN}: ${stats.totalAll} contributions all time, ${stats.total} in the last 52 weeks`);
}
