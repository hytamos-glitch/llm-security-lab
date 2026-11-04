// Turns one recorded run into beats on a timeline. Everything on screen comes from the trace: what was called, what a
// guard stopped, the final balance. Durations are schematic, the order of events is the real one. No three.js in here.
import DATA from './traces.json' with {type: 'json'};

export const MODEL = DATA.model;
export const BALANCE_START = 20739.31;

export const AT = {
  phone: [-6.5, 0, 0],
  gateIn: [-3.3, 0.8, 0],
  gateOut: [-3.3, -0.8, 0],
  core: [0, 0, 0],
  web: [6.1, 3.3, 0],
  docs: [6.1, 0, 0],
  bank: [6.1, -3.3, 0],
  vault: [9, -3.3, 0],
  gWeb: [3.3, 1.8, 0],
  gDocs: [3.3, 0, 0],
  gBank: [3.3, -1.8, 0],
};
const STATION = {
  fetch_url: {at: 'web', gate: 'gWeb'},
  search_documents: {at: 'docs', gate: 'gDocs'},
  transfer_money: {at: 'bank', gate: 'gBank'},
};
const POISON = {llm01b: 'web', llm08: 'docs', llm02: 'docs'};

const line = (...keys) => keys.map((k) => AT[k]);

function build(clip) {
  const beats = [];
  let t = 0;
  const add = (kind, dur, extra = {}) => {
    beats.push({kind, t0: t, dur, ...extra});
    t += dur;
  };
  add('intro', 1.6);
  const refused = clip.steps.some((s) => s.type === 'guard' && s.stage === 'message');
  const direct = clip.case === 'llm01a';
  add('send', 1.5, {route: refused ? line('phone', 'gateIn') : line('phone', 'gateIn', 'core'), tone: direct ? 'atk' : 'ink', stop: refused ? 'gateIn' : null});
  if (refused) add('blocked', 1.1, {guard: 'gateIn', log: 'Filtre du message : refus avant le modèle'});

  const steps = clip.steps;
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (s.type === 'llm') {
      add('think', 1.3, {text: s.text});
    } else if (s.type === 'guard' && s.stage === 'tool') {
      const st = STATION[s.tool];
      add('call', 1.1, {route: line('core', st.gate), tone: 'ink', stop: st.gate, log: `${s.tool} : refusé, l'URL ne vient pas de l'utilisateur`, flag: 'no'});
      add('blocked', 0.9, {guard: st.gate});
    } else if (s.type === 'tool') {
      const st = STATION[s.name];
      if (!st) continue;
      const arg = s.name === 'transfer_money' ? `${s.args.amount} USD → ${s.args.to}` : s.name === 'fetch_url' ? s.args.url.replace(/^https?:\/\//, '') : s.args.query;
      add('call', 1.2, {route: line('core', st.gate, st.at), tone: 'ink', log: `${s.name} (${arg})`, station: st.at});
      if (s.name === 'transfer_money') {
        if (s.pending) add('hold', 1.8, {guard: st.gate, log: 'Virement en attente : confirmation humaine requise'});
        else add('money', 1.8, {route: line('bank', 'vault'), log: 'Débit exécuté, sans confirmation'});
      } else if (s.ok === false) {
        add('fail', 0.9, {log: 'Lecture impossible'});
      } else {
        const filtered = s.guardrail || s.confidential_filtered > 0 || steps[i - 1]?.type === 'guardrail';
        const poison = POISON[clip.case] === st.at;
        if (poison && filtered) {
          add('result', 1.2, {route: line(st.at, st.gate), tone: 'atk', stop: st.gate, log: s.confidential_filtered ? 'Document confidentiel écarté, consigne retirée' : 'Consigne cachée retirée du contenu'});
          add('blocked', 0.8, {guard: st.gate});
          add('result', 1, {route: line(st.gate, 'core'), tone: 'ink'});
        } else {
          add('result', 1.5, {route: line(st.at, st.gate, 'core'), tone: poison ? 'atk' : 'ink', poison});
        }
      }
    }
  }
  const replyGuard = steps.find((s) => s.type === 'guard' && s.stage === 'reply');
  if (replyGuard && replyGuard.reason !== 'pending') {
    add('reply', 1, {route: line('core', 'gateOut'), tone: 'atk', stop: 'gateOut', log: 'Contrôle final : réponse remplacée'});
    add('blocked', 0.9, {guard: 'gateOut'});
    add('reply', 1.1, {route: line('gateOut', 'phone'), tone: 'ink', showReply: true});
  } else {
    add('reply', 1.5, {route: refused ? line('gateIn', 'phone') : line('core', 'gateOut', 'phone'), tone: clip.verdict === 'compromised' ? 'atk' : 'ink', showReply: true});
  }
  add('verdict', 4, {showReply: true, showVerdict: true});
  return {beats, dur: t};
}

export const CLIPS = DATA.clips.map((c) => ({...c, ...build(c)}));
let cursor = 0;
for (const c of CLIPS) {
  c.start = cursor;
  cursor += c.dur;
}
export const DURATION = cursor;

export function clipAt(t) {
  const c = CLIPS.findLast((x) => x.start <= t) || CLIPS[0];
  return {clip: c, tau: t - c.start};
}

/** Pose of the whole machine at time tau of a clip. Pure. */
export function stateAt(clip, tau) {
  const done = clip.beats.filter((b) => b.t0 + b.dur <= tau);
  const beat = clip.beats.findLast((b) => b.t0 <= tau) || clip.beats[0];
  const u = Math.min(1, (tau - beat.t0) / beat.dur);
  const seen = [...done, beat];
  const logs = seen.filter((b) => b.log).map((b) => ({text: b.log, flag: b.flag}));
  const poisoned = done.some((b) => b.poison) || (clip.case === 'llm01a' && !clip.steps.some((s) => s.stage === 'message') && done.some((b) => b.kind === 'send'));
  const debited = seen.some((b) => b.kind === 'money');
  const moneyU = beat.kind === 'money' ? u : debited ? 1 : 0;
  return {
    beat, u, logs, poisoned, thinking: beat.kind === 'think',
    guard: beat.kind === 'blocked' || beat.kind === 'hold' ? beat.guard : null,
    guardU: u,
    bankLocked: seen.some((b) => b.kind === 'hold'),
    moneyU,
    balance: BALANCE_START + (clip.balance - BALANCE_START) * moneyU,
    station: seen.findLast((b) => b.station)?.station ?? null,
    showReply: seen.some((b) => b.showReply),
    showVerdict: beat.kind === 'verdict',
    verdictU: beat.kind === 'verdict' ? u : 0,
  };
}

/** A point at fraction u along a polyline, plus the trail behind it. */
export function along(route, u) {
  const lens = [];
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    const l = Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1], route[i][2] - route[i - 1][2]);
    lens.push(l);
    total += l;
  }
  let d = Math.max(0, Math.min(1, u)) * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const k = lens[i] ? d / lens[i] : 0;
      const a = route[i];
      const b = route[i + 1];
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
    }
    d -= lens[i];
  }
  return route[route.length - 1];
}
