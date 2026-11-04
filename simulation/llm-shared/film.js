// The recorded plans: every clip one after another, a pure function of t. Vertical 9:16 with all the text inside the
// central 4:5 band, so the footage can be cropped either way. Text blocks read from the same trace as the machine.
import {runSim} from 'teardown-kit/runtime.js';
import {COL, createStage} from './stage.js';
import {AT, BALANCE_START, clipAt, DURATION, MODEL, stateAt} from './timeline.js';

const TITLE = {
  llm06: 'Un virement sans confirmation',
  llm01b: 'Une facture avec une consigne cachée',
  llm02: 'La clé API dans les documents',
  llm08: 'Un document empoisonné',
  llm01a: 'Changer le rôle de l\'assistant',
};
const VERDICT = {
  compromised: {llm06: 'Argent débité', llm01b: 'Attaque réussie : il ment à l\'utilisateur', llm02: 'Secret divulgué', llm08: 'Il relaie la fraude', llm01a: 'Il sort de son rôle'},
  contained: {llm06: 'Rien n\'est débité sans ton accord'},
  safe: {llm01b: 'Consigne retirée, aucun paiement', llm02: 'Le secret reste protégé', llm08: 'Le document piégé est neutralisé', llm01a: 'Refusé avant le modèle'},
};
const CSS = `
.o{position:absolute;inset:0;pointer-events:none;color:${COL.ink};font-family:'Inter',system-ui,sans-serif;font-variant-numeric:tabular-nums}
.ztop{position:absolute;left:54px;right:54px;top:300px}
.zpill{display:inline-block;font:700 30px 'JetBrains Mono',monospace;padding:8px 18px;border-radius:6px;color:#fff}
.zref{font:700 30px 'JetBrains Mono',monospace;color:${COL.mid};margin-left:16px}
h1{font-size:50px;line-height:1.08;letter-spacing:-.8px;margin:14px 0 14px;font-weight:800}
.zmsg{font-size:30px;line-height:1.25;background:${COL.ink};color:#fff;border-radius:18px;padding:18px 24px;overflow-wrap:anywhere}
.zbot{position:absolute;left:54px;right:54px;top:1262px;display:grid;gap:12px}
.zlog{font:600 26px/1.3 'JetBrains Mono',monospace;display:grid;gap:5px;min-height:72px;padding-right:250px}
.zlog div{overflow-wrap:anywhere}
.zlog b{color:${COL.accent};font-weight:700}
.zrep{font-size:32px;line-height:1.3;background:#fff;border:2px solid ${COL.line};border-radius:18px;padding:12px 20px;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}
.zver{border-radius:16px;padding:16px 22px;color:#fff;transform-origin:left center}
.zver b{display:block;font-size:42px;line-height:1.1;font-weight:800;letter-spacing:-.4px}
.zver span{display:block;font:600 27px 'JetBrains Mono',monospace;margin-top:7px;opacity:.95}
.ztag{position:absolute;left:0;top:0;font:700 25px 'JetBrains Mono',monospace;background:rgba(251,252,251,.92);padding:3px 10px;border-radius:5px;white-space:nowrap;transform:translate(-50%,-50%)}
.zfoot{margin-top:12px;font:500 23px 'JetBrains Mono',monospace;color:${COL.mid}}
`;
const ease = (x) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c]));

function createOverlay(app) {
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  const root = document.createElement('div');
  root.className = 'o';
  app.appendChild(root);
  const el = (cls, parent = root, tag = 'div') => {
    const e = document.createElement(tag);
    e.className = cls;
    parent.appendChild(e);
    return e;
  };
  const top = el('ztop');
  const pill = el('zpill', top, 'span');
  const ref = el('zref', top, 'span');
  const title = el('', top, 'h1');
  const msg = el('zmsg', top);
  const bot = el('zbot');
  const log = el('zlog', bot);
  const rep = el('zrep', bot);
  const ver = el('zver', bot);
  const foot = el('zfoot', top);
  const tags = [
    {at: [AT.phone[0], 2.55, 0], text: 'Utilisateur'},
    {at: [0, 3.5, 0], text: 'Modèle + contexte'},
    {at: [AT.web[0], 1.72 + AT.web[1] - 0.2, 0], text: 'fetch_url'},
    {at: [AT.docs[0], 1.45, 0], text: 'search_documents'},
    {at: [AT.bank[0], -1.75, 0], text: 'transfer_money'},
    {at: [AT.bank[0], -4.95, 0], id: 'bal'},
  ].map((t) => ({...t, e: el('ztag')}));
  let drawn = null;
  return (clip, s, project) => {
    if (drawn !== clip.id) {
      drawn = clip.id;
      pill.textContent = clip.secure ? 'SECURE_MODE=1' : 'SECURE_MODE=0';
      pill.style.background = clip.secure ? COL.brand : COL.accent;
      ref.textContent = `${clip.ref} · OWASP LLM`;
      title.textContent = TITLE[clip.case];
      msg.textContent = clip.message;
      rep.textContent = clip.reply.replace(/\{"name".*/s, '').trim();
      foot.textContent = `Banque fictive · lab local · ${MODEL} · durées schématiques`;
      const good = clip.verdict !== 'compromised';
      ver.style.background = good ? COL.brand : COL.accent;
      const r = clip.rate;
      const count = `Attaque réussie : ${r.compromised} essai${r.compromised > 1 ? 's' : ''} sur ${r.n}`;
      ver.innerHTML = `<b>${esc(VERDICT[clip.verdict]?.[clip.case] ?? '')}</b><span>${count}</span>`;
    }
    log.innerHTML = s.logs.slice(-2).map((l) => `<div>${l.flag === 'no' ? '<b>✕</b> ' : '› '}${esc(l.text)}</div>`).join('');
    rep.style.visibility = s.showReply ? 'visible' : 'hidden';
    ver.style.visibility = s.showVerdict ? 'visible' : 'hidden';
    const k = ease(s.verdictU * 4);
    ver.style.transform = `scale(${0.96 + 0.04 * k})`;
    ver.style.opacity = k;
    for (const t of tags) {
      const p = project(...t.at);
      if (t.id === 'bal') t.e.textContent = `Solde ${s.balance.toFixed(2)} $`;
      else if (t.e.textContent !== t.text) t.e.textContent = t.text;
      t.e.style.left = `${p[0]}px`;
      t.e.style.top = `${p[1]}px`;
      if (t.id === 'bal') t.e.style.color = s.balance < BALANCE_START - 0.01 ? COL.accent : COL.ink;
    }
  };
}

export function run() {
  runSim({duration: DURATION, fps: 60, theme: 'light', hud: {enabled: false, title: 'Finora', subtitle: ''}, director: {enabled: false}}, async ({canvas}) => {
    await Promise.all([document.fonts.load('700 30px "JetBrains Mono"'), document.fonts.load('800 50px "Inter"')]).catch(() => {});
    const stage = createStage({canvas});
    const overlay = createOverlay(document.getElementById('app'));
    const resize = () => stage.resize(innerWidth, innerHeight, window.devicePixelRatio || 1);
    resize();
    return {
      resize,
      render(t) {
        const {clip, tau} = clipAt(t);
        const s = stateAt(clip, tau);
        stage.frame(clip, s, t);
        overlay(clip, s, stage.project);
        return {};
      },
    };
  });
}
