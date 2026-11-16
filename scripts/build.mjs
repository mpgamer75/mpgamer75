// Builds the SVGs used by the profile README.
//   node scripts/build.mjs
// Needs GITHUB_TOKEN (or GH_TOKEN) in the environment for the activity and
// language panels. Without a token only the hero is rebuilt.

import { mkdir, writeFile } from 'node:fs/promises';

const LOGIN = 'mpgamer75';
const OUT = new URL('../assets/', import.meta.url);

const WHOAMI = [
  'Charles Lantigua Jorge',
  'cybersecurity engineer / software engineer',
  'Paris, FR',
  'github.com/mpgamer75',
  '',
].join('\n');

const THEMES = {
  dark: {
    ink: '#e6edf3',
    soft: '#9aa4af',
    muted: '#7d8590',
    line: '#30363d',
    track: '#21262d',
    accent: '#f0a23b',
  },
  light: {
    ink: '#1f2328',
    soft: '#4b535d',
    muted: '#656d76',
    line: '#d0d7de',
    track: '#eaeef2',
    accent: '#b35900',
  },
};

const MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const r1 = (n) => Math.round(n * 10) / 10;

function baseStyle(t) {
  return `
    .mono { font-family: ${MONO}; }
    .sans { font-family: ${SANS}; }
    .ink { fill: ${t.ink}; } .soft { fill: ${t.soft}; } .muted { fill: ${t.muted}; }
    .accent { fill: ${t.accent}; } .faint { fill: ${t.line}; }
    .frame { fill: none; stroke: ${t.line}; }
    .rule { stroke: ${t.line}; }`;
}

// Monospace text laid out on a fixed grid: every glyph gets its own x, so the
// columns line up whatever monospace font the viewer ends up with.
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

// ---------------------------------------------------------------- hero

function hexdumpRows(text) {
  const bytes = [...Buffer.from(text, 'utf8')];
  const rows = [];
  for (let off = 0; off < bytes.length; off += 16) {
    rows.push({ off, bytes: bytes.slice(off, off + 16) });
  }
  return { rows, length: bytes.length };
}

function hero(t) {
  const W = 1200;
  const X = 56;
  const SIZE = 19;
  const CELL = 11.6;
  const LH = 30;
  const nameLen = Buffer.byteLength(WHOAMI.split('\n')[0]);
  const { rows, length } = hexdumpRows(WHOAMI);
  const top = 318;

  const lines = rows.map(({ off, bytes }, i) => {
    const runs = [[off.toString(16).padStart(8, '0') + '  ', 'muted']];
    for (let b = 0; b < 16; b++) {
      const cls = off + b < nameLen ? 'accent' : 'soft';
      const hex = b < bytes.length ? bytes[b].toString(16).padStart(2, '0') : '  ';
      runs.push([hex, cls], [b === 7 ? '  ' : ' ', 'soft']);
    }
    runs.push([' |', 'faint']);
    bytes.forEach((v, b) => {
      const ch = v >= 32 && v < 127 ? String.fromCharCode(v) : '.';
      runs.push([ch, off + b < nameLen ? 'accent' : 'ink']);
    });
    runs.push(['|', 'faint']);
    return `<g class="row" style="animation-delay:${400 + i * 130}ms">${grid(runs, X, top + i * LH, CELL, SIZE)}</g>`;
  });

  const endY = top + rows.length * LH;
  const end = `<g class="row" style="animation-delay:${400 + rows.length * 130}ms">${grid(
    [[length.toString(16).padStart(8, '0'), 'muted']],
    X,
    endY,
    CELL,
    SIZE,
  )}<rect class="accent cursor" x="${r1(X + 9 * CELL)}" y="${endY - 16}" width="10" height="19"/></g>`;

  const H = endY + 44;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
  <title id="t">Charles Lantigua Jorge</title>
  <desc id="d">Cybersecurity engineer and software engineer based in Paris. Below the name, a hexdump of the same information.</desc>
  <style>${baseStyle(t)}
    .row { opacity: 0; animation: in .5s ease-out both; }
    .cursor { animation: blink 1.1s steps(1) infinite; }
    @keyframes in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
    @keyframes blink { 50% { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .row, .cursor { animation: none; opacity: 1; } }
  </style>
  <rect class="frame" x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="14"/>

  <rect class="accent" x="${X}" y="45" width="9" height="9"/>
  <text class="mono muted" x="${X + 20}" y="55" font-size="15" letter-spacing=".5">mpgamer75</text>
  <text class="mono muted" x="${W - X}" y="55" font-size="15" letter-spacing=".5" text-anchor="end">PARIS  48.8566 N  2.3522 E</text>

  <text class="sans ink" x="${X - 3}" y="152" font-size="70" font-weight="700" letter-spacing="-2">Charles Lantigua Jorge</text>
  <text class="sans soft" x="${X}" y="200" font-size="25">Cybersecurity engineer &amp; software engineer</text>

  <line class="rule" x1="${X}" y1="240" x2="${W - X}" y2="240"/>

  ${grid([['$ ', 'accent'], ['hexdump -C whoami', 'muted']], X, 280, CELL, SIZE)}
  ${lines.join('\n  ')}
  ${end}
</svg>
`;
}

// ---------------------------------------------------------------- data

async function fetchData(token) {
  const query = `query($login: String!) {
    user(login: $login) {
      contributionsCollection {
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
  const cal = user.contributionsCollection.contributionCalendar;
  const days = cal.weeks.flatMap((w) => w.contributionDays);
  const weeks = cal.weeks.map((w) => ({
    start: w.contributionDays[0].date,
    total: w.contributionDays.reduce((s, d) => s + d.contributionCount, 0),
  }));

  const bytes = new Map();
  for (const repo of user.repositories.nodes) {
    for (const { size, node } of repo.languages.edges) {
      bytes.set(node.name, (bytes.get(node.name) ?? 0) + size);
    }
  }
  const allBytes = [...bytes.values()].reduce((a, b) => a + b, 0);
  const languages = [...bytes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, size]) => ({ name, share: size / allBytes }));

  return {
    total: cal.totalContributions,
    weeks,
    repos: user.repositories.totalCount,
    activeDays: days.filter((d) => d.contributionCount > 0).length,
    bestDay: Math.max(...days.map((d) => d.contributionCount)),
    languages,
  };
}

// ---------------------------------------------------------------- activity

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function activity(t, s) {
  const W = 1200;
  const H = 320;
  const X = 56;
  const plotL = 424;
  const plotR = W - X;
  const base = 246;
  const plotH = 150;
  const n = s.weeks.length;
  const step = (plotR - plotL) / n;
  const bw = Math.max(4, Math.round(step - 4));
  const max = Math.max(1, ...s.weeks.map((w) => w.total));
  const peak = s.weeks.findIndex((w) => w.total === max);

  const bars = s.weeks
    .map((w, i) => {
      const x = r1(plotL + i * step + (step - bw) / 2);
      if (w.total === 0) return `<rect class="track" x="${x}" y="${base - 2}" width="${bw}" height="2"/>`;
      const h = Math.max(3, r1((w.total / max) * plotH));
      const r = Math.min(3, h / 2);
      const y = r1(base - h);
      // rounded at the data end, square on the baseline
      const d = `M${x} ${base}V${r1(y + r)}Q${x} ${y} ${r1(x + r)} ${y}H${r1(x + bw - r)}Q${x + bw} ${y} ${x + bw} ${r1(y + r)}V${base}Z`;
      return `<path class="bar" style="animation-delay:${i * 14}ms" d="${d}"><title>Week of ${w.start}: ${w.total}</title></path>`;
    })
    .join('\n    ');

  // month labels: first week that starts in a new month
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
  const peakAnchor = peakX > plotR - 60 ? 'end' : peakX < plotL + 60 ? 'start' : 'middle';
  const peakLabel = `<text class="mono soft" x="${peakX}" y="${base - plotH - 12}" font-size="13" text-anchor="${peakAnchor}">peak week  ${max}</text>`;

  const stat = (x, value, label) =>
    `<text class="sans ink" x="${x}" y="226" font-size="26" font-weight="600">${value}</text>
  <text class="mono muted" x="${x}" y="250" font-size="13">${label}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
  <title id="t">GitHub activity over the last 52 weeks</title>
  <desc id="d">${s.total} contributions in the last year. ${s.activeDays} active days, ${s.repos} public repositories, busiest day ${s.bestDay} contributions, busiest week ${max}.</desc>
  <style>${baseStyle(t)}
    .track { fill: ${t.line}; }
    .bar { fill: ${t.accent}; transform-box: fill-box; transform-origin: 50% 100%; animation: grow .7s cubic-bezier(.2,.8,.2,1) both; }
    @keyframes grow { from { transform: scaleY(0); } to { transform: none; } }
    @media (prefers-reduced-motion: reduce) { .bar { animation: none; } }
  </style>
  <rect class="frame" x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="14"/>

  <text class="mono muted" x="${X}" y="55" font-size="15" letter-spacing=".5">CONTRIBUTIONS  /  LAST 52 WEEKS</text>
  <text class="sans ink" x="${X - 3}" y="150" font-size="84" font-weight="700" letter-spacing="-3">${s.total.toLocaleString('en-US')}</text>

  ${stat(X, s.activeDays, 'active days')}
  ${stat(X + 124, s.bestDay, 'best day')}
  ${stat(X + 232, s.repos, 'public repos')}

  <g>
    ${bars}
  </g>
  <line class="rule" x1="${plotL}" y1="${base + 0.5}" x2="${plotR}" y2="${base + 0.5}"/>
  ${peakLabel}
  ${ticks}
  <text class="mono muted" x="${plotR}" y="55" font-size="15" letter-spacing=".5" text-anchor="end">PER WEEK</text>
</svg>
`;
}

// ---------------------------------------------------------------- languages

function languages(t, s) {
  const W = 1200;
  const X = 56;
  const cols = 2;
  const perCol = Math.ceil(s.languages.length / cols);
  const rowH = 44;
  const top = 98;
  const H = top + perCol * rowH + 16;
  const colW = (W - 2 * X - 64) / cols;
  const nameW = 130;
  const pctW = 64;
  const trackW = colW - nameW - pctW;
  const maxShare = s.languages[0].share;

  const rows = s.languages
    .map((l, i) => {
      const cx = X + Math.floor(i / perCol) * (colW + 64);
      const y = top + (i % perCol) * rowH;
      const w = Math.max(4, r1((l.share / maxShare) * trackW));
      return `<text class="mono ink" x="${cx}" y="${y + 5}" font-size="16">${esc(l.name)}</text>
  <rect class="track" x="${cx + nameW}" y="${y - 5}" width="${r1(trackW)}" height="8" rx="4"/>
  <rect class="bar" style="animation-delay:${i * 70}ms" x="${cx + nameW}" y="${y - 5}" width="${w}" height="8" rx="4"/>
  <text class="mono soft" x="${r1(cx + colW)}" y="${y + 5}" font-size="15" text-anchor="end">${(l.share * 100).toFixed(1)}%</text>`;
    })
    .join('\n  ');

  const desc = s.languages.map((l) => `${l.name} ${(l.share * 100).toFixed(1)}%`).join(', ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
  <title id="t">Languages across public repositories</title>
  <desc id="d">Share of code by bytes: ${esc(desc)}.</desc>
  <style>${baseStyle(t)}
    .track { fill: ${t.track}; }
    .bar { fill: ${t.accent}; transform-box: fill-box; transform-origin: 0 50%; animation: grow .8s cubic-bezier(.2,.8,.2,1) both; }
    @keyframes grow { from { transform: scaleX(0); } to { transform: none; } }
    @media (prefers-reduced-motion: reduce) { .bar { animation: none; } }
  </style>
  <rect class="frame" x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="14"/>
  <text class="mono muted" x="${X}" y="55" font-size="15" letter-spacing=".5">LANGUAGES  /  PUBLIC REPOSITORIES</text>
  <text class="mono muted" x="${W - X}" y="55" font-size="15" letter-spacing=".5" text-anchor="end">SHARE OF BYTES</text>
  ${rows}
</svg>
`;
}

// ---------------------------------------------------------------- main

await mkdir(OUT, { recursive: true });
const write = (name, svg) => writeFile(new URL(name, OUT), svg);

for (const [name, t] of Object.entries(THEMES)) {
  await write(`hero-${name}.svg`, hero(t));
}

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!token) {
  console.log('No GITHUB_TOKEN set: rebuilt the hero only.');
} else {
  const stats = summarise(await fetchData(token));
  for (const [name, t] of Object.entries(THEMES)) {
    await write(`activity-${name}.svg`, activity(t, stats));
    await write(`languages-${name}.svg`, languages(t, stats));
  }
  console.log(`Built for ${LOGIN}: ${stats.total} contributions, ${stats.languages.map((l) => l.name).join(', ')}`);
}
