// Records Drex Max playing Drex Snake through the hosted API, one request at a time (every move is a real call).
// Run from the arcade folder: node --env-file="$HOME/File project/.env.drex" scripts/record-snake.mjs [seed] [model]
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import * as snake from '../snake/engine.js';

const seed = Number(process.argv[2] ?? 7), model = process.argv[3] ?? 'drex-max';
const key = process.env.NACE_API_KEY;
if (!key) throw new Error('NACE_API_KEY is not set');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let lastCall = 0;
async function decide(state, questions) {
  for (let attempt = 0; attempt < 30; attempt++) {
    await sleep(Math.max(0, 450 - (performance.now() - lastCall))); // stay under the per-minute limit
    lastCall = performance.now();
    const t = performance.now();
    const res = await fetch('https://console.nace.ai/v1/systemone', {
      method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model, state, questions }),
    });
    const ms = Math.round(performance.now() - t);
    if (res.status === 429) { const wait = Number(res.headers.get('retry-after')) * 1000 || Math.min(30000, 1000 * 2 ** attempt); console.log(`429, waiting ${Math.round(wait / 1000)} s`); await sleep(wait); continue; }
    const out = await res.json();
    if (!res.ok) throw new Error(out.error?.message ?? res.status);
    const a = out.answers.move;
    return { choice: a.choice, probs: Object.fromEntries(Object.entries(a.probabilities).map(([k, v]) => [k, Math.round(v * 1e4) / 1e4])), ms, evalMs: Math.round(out.evaluation_time_ms ?? 0) };
  }
  throw new Error('rate limited after retries');
}

const g = snake.newGame(seed), moves = [];
// Resume: replay the moves already recorded for this seed and model (the game is deterministic), then go on.
const file = new URL('../snake/replay.json', import.meta.url);
if (existsSync(file)) {
  const old = JSON.parse(readFileSync(file, 'utf8'));
  if (old.seed === seed && old.runs?.[model]?.length && old.final?.alive === false) {
    console.log(`snake/replay.json already holds a finished ${model} game for seed ${seed} (${old.final.apples} apples); move it away to record again.`);
    process.exit(0);
  }
  if (old.seed === seed && old.runs?.[model]?.length) {
    for (const d of old.runs[model]) { moves.push(d); snake.step(g, d.choice); }
    console.log(`resuming at step ${g.steps} (${g.apples} apples)`);
  }
}
const tmp = new URL('../snake/replay.json.tmp', import.meta.url);
const save = () => { writeFileSync(tmp, JSON.stringify({
  recordedAt: new Date().toISOString(), api: 'https://console.nace.ai/v1/systemone', note: 'Real Drex API answers, one request at a time; every move is one call.',
  seed, N: snake.N, maxSteps: snake.MAX_STEPS, starve: snake.STARVE, runs: { [model]: moves },
  final: { apples: g.apples, steps: g.steps, alive: g.alive, why: g.why },
})); renameSync(tmp, file); }; // a crash mid-write never leaves a broken replay
while (g.alive) {
  const { state, questions } = snake.requestFor(g);
  const d = await decide(state, questions);
  moves.push(d);
  snake.step(g, d.choice);
  if (g.steps % 10 === 0) save();
  if (g.steps % 50 === 0) console.log(`step ${g.steps}: ${g.apples} apples, ${d.ms} ms`);
}
save();
const ms = moves.map((m) => m.ms);
console.log(`${model} seed ${seed}: ${g.apples} apples in ${g.steps} moves, ${g.why}; avg ${Math.round(ms.reduce((a, b) => a + b, 0) / ms.length)} ms per move`);
