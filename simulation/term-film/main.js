// The terminal plan: the verdicts of the real run, line by line, from reports/traces/finale.json. Accelerated, and it
// says so on screen.
import {runSim} from 'teardown-kit/runtime.js';
import DATA from '../llm-shared/terminal.json' with {type: 'json'};

const GAP = 0.34;
const START = 3.2;
const END = START + DATA.lines.length * GAP;
const DURATION = END + 7;
const CMD = 'python -m redteam.replay --repeats 3';
const CSS = `
html,body{background:#0d1017}
#gl{display:none}
.t{position:absolute;inset:0;padding:64px 54px;color:#d8e0da;font:500 25px/1.48 'JetBrains Mono',monospace}
.t .h{color:#7c8a83;margin-bottom:20px;font-size:23px}
.t .c{color:#fff;margin-bottom:14px}
.t .c i{font-style:normal;color:#34d399}
.t .l{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.t .k1{color:#34d399}.t .k0{color:#fb923c}
.t b{font-weight:700}.t .bad{color:#f87171}.t .ok{color:#34d399}.t .mid{color:#fbbf24}
.t .sum{margin-top:22px;border-top:1px solid #36403b;padding-top:18px;font-size:36px;line-height:1.3;color:#fff;font-weight:700}
.t .sum span{color:#f87171}.t .sum em{font-style:normal;color:#34d399}
.t .sum small{display:block;font-size:23px;color:#9aa8a1;font-weight:500;margin-top:8px}
`;
const CLS = {compromised: 'bad', contained: 'mid', safe: 'ok', works: 'ok', broken: 'bad'};

runSim({duration: DURATION, fps: 30, theme: 'dark', hud: {enabled: false, title: 'terminal', subtitle: ''}, director: {enabled: false}}, async () => {
  await document.fonts.load('500 25px "JetBrains Mono"').catch(() => {});
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  const root = document.createElement('div');
  root.className = 't';
  document.getElementById('app').appendChild(root);
  let last = '';
  return {
    resize() {},
    render(t) {
      const typed = Math.floor(Math.min(1, Math.max(0, (t - 0.6) / 1.8)) * CMD.length);
      const n = Math.max(0, Math.floor((t - START) / GAP) + 1);
      const shown = DATA.lines.slice(0, n).slice(-24);
      const sum = t > END + 0.6;
      const html = `<div class="h">Lab local · ${DATA.model} · vitesse accélérée (${DATA.minutes} min d'exécution réelle)</div>` +
        `<div class="c"><i>$</i> ${CMD.slice(0, typed)}</div>` +
        shown.map((l) => `<div class="l"><span class="k${l.secure}">SECURE_MODE=${l.secure}</span>  ${l.id} #${l.repeat}  <b class="${CLS[l.verdict]}">${l.verdict}</b></div>`).join('') +
        (sum ? `<div class="sum">Attaques réussies : <span>${DATA.before} / ${DATA.n}</span> → <em>${DATA.after} / ${DATA.n}</em><small>3 essais par cas · témoins : ${DATA.controls}</small></div>` : '');
      if (html !== last) {
        last = html;
        root.innerHTML = html;
      }
      return {};
    },
  };
});
