// Records real Drex API decisions for the Drex Arcade replays. One request at a time, so the latencies are
// single-user latencies and no call is rate limited.
// Run from the arcade folder: node --env-file="$HOME/File project/.env.drex" scripts/record.mjs [stack|drex|beat ...]
import { writeFileSync } from 'node:fs';
import * as stack from '../stack/engine.js';
import * as drex from '../d-rex/engine.js';
import * as beat from '../beat/messages.js';

const MODELS = ['drex-max', 'drex-v2.0'];
const key = process.env.NACE_API_KEY;
if (!key) throw new Error('NACE_API_KEY is not set');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const which = process.argv.slice(2).length ? process.argv.slice(2) : ['beat', 'drex', 'stack'];

async function decide(model, state, questions, name) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const t = performance.now();
    const res = await fetch('https://console.nace.ai/v1/systemone', {
      method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model, state, questions }),
    });
    const ms = Math.round(performance.now() - t);
    if (res.status === 429) { await sleep(700 * (attempt + 1)); continue; }
    const out = await res.json();
    if (!res.ok) throw new Error(out.error?.message ?? res.status);
    const a = out.answers[name];
    return { choice: a.choice, probs: a.probabilities, ms, evalMs: Math.round(out.evaluation_time_ms ?? 0), model: out.model };
  }
  throw new Error('rate limited after retries');
}
const round = (probs, top = 0) => {
  const entries = Object.entries(probs).sort((a, b) => b[1] - a[1]);
  return Object.fromEntries((top ? entries.slice(0, top) : entries).map(([k, v]) => [k, Math.round(v * 1e4) / 1e4]));
};
const meta = (extra) => ({ recordedAt: new Date().toISOString(), api: 'https://console.nace.ai/v1/systemone', note: 'Real Drex API answers, one request at a time.', ...extra });

if (which.includes('beat')) {
  const answers = {};
  for (const model of MODELS) {
    answers[model] = [];
    for (const m of beat.MESSAGES) {
      const r = await decide(model, beat.stateFor(m), beat.question(), 'bucket');
      answers[model].push({ id: m.id, choice: r.choice, probs: round(r.probs), ms: r.ms, evalMs: r.evalMs });
    }
    const right = answers[model].filter((a, i) => a.choice === beat.MESSAGES[i].label).length;
    console.log(`beat ${model}: ${right}/${beat.MESSAGES.length} right, avg ${Math.round(answers[model].reduce((s, a) => s + a.ms, 0) / answers[model].length)} ms`);
  }
  writeFileSync('beat/answers.json', JSON.stringify(meta({ answers }), null, 1));
}

if (which.includes('drex')) {
  const SEED = 20261020, N = 90;
  const obstacles = drex.schedule(SEED, N);
  const runs = {};
  for (const model of MODELS) {
    runs[model] = [];
    for (const o of obstacles) {
      const r = await decide(model, drex.stateFor(o), drex.QUESTION, 'action');
      runs[model].push({ i: o.i, choice: r.choice, probs: round(r.probs), ms: r.ms, evalMs: r.evalMs });
    }
    const SAFE = { 'cactus-small': ['jump'], 'cactus-tall': ['jump'], 'bird-low': ['jump'], 'bird-head': ['duck', 'jump'], 'bird-high': ['nothing', 'duck'] };
    const right = runs[model].filter((d) => SAFE[obstacles[d.i].kind.id].includes(d.choice)).length;
    console.log(`d-rex ${model}: ${right}/${N} safe choices, avg ${Math.round(runs[model].reduce((s, d) => s + d.ms, 0) / N)} ms`);
  }
  writeFileSync('d-rex/replay.json', JSON.stringify(meta({ seed: SEED, runs }), null, 1));
}

if (which.includes('stack')) {
  const SEED = 33, VERSION = 'full', MAX = 150;
  const seq = stack.pieceSequence(SEED, MAX + 2), garbage = stack.garbageHoles(SEED, 100);
  const runs = {};
  for (const model of MODELS) {
    let board = stack.emptyBoard(), lines = 0, pieces = 0;
    runs[model] = [];
    while (pieces < MAX) {
      const { list, state, questions } = stack.requestFor(board, seq, pieces, lines, VERSION);
      if (!list.length) break;
      const r = await decide(model, state, questions, 'move');
      const pick = list.find((o) => o.key === r.choice) ?? list[0];
      runs[model].push({ choice: pick.key, probs: round(r.probs, 3), ms: r.ms, evalMs: r.evalMs });
      board = stack.normalize(pick.after); lines += pick.cleared; pieces++;
      if (pieces % stack.GARBAGE_EVERY === 0) { const g = stack.addGarbage(board, garbage[pieces / stack.GARBAGE_EVERY]); if (g.toppedOut) break; board = g.board; }
    }
    console.log(`stack ${model}: ${lines} rows in ${pieces} pieces`);
  }
  writeFileSync('stack/replay.json', JSON.stringify(meta({ seed: SEED, version: VERSION, maxPieces: MAX, runs }), null, 1));
}
