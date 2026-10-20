// D-Rex engine, shared by the page (replay) and the recorder. Same rules as the local prototype.
export const W = 960, H = 210, GROUND = 170;
export const DINO_X = 70, DINO_W = 40, DINO_H = 44, DUCK_W = 54, DUCK_H = 26;
export const G = 2600, JUMP_V = 850;            // px/s², px/s: apex ~139 px, ~0.65 s in the air
export const ASK_PX = 640;                      // Drex is asked when the obstacle is this close
export const SPEED0 = 380, SPEED_GAIN = 16, SPEED_MAX = 2000;

export const KINDS = [
  { id: 'cactus-small', w: 18, h: 34, lift: 0, say: ['a short cactus on the ground, about knee height', 'a small spiky cactus sticking out of the sand'] },
  { id: 'cactus-tall', w: 40, h: 48, lift: 0, say: ['a cluster of tall cacti rooted in the sand, about as tall as the dino', 'two tall cacti side by side on the ground'] },
  { id: 'bird-low', w: 40, h: 24, lift: 6, say: ['a pterodactyl skimming just above the ground', "a low-flying pterodactyl at the height of the dino's feet"] },
  { id: 'bird-head', w: 40, h: 24, lift: 30, say: ["a pterodactyl flying straight at the dino's head height", 'a pterodactyl at eye level, coming fast'] },
  { id: 'bird-high', w: 40, h: 24, lift: 62, say: ["a pterodactyl gliding high in the sky, well above the dino's head", 'a pterodactyl soaring far overhead'] },
];

export const QUESTION = {
  action: {
    type: 'choice',
    instructions: 'You control the dinosaur in an endless runner. One obstacle is coming. Pick the one move that gets past it without touching it. '
      + 'Rules: things on the ground (cacti) must be jumped over. A bird flying low, near the feet, must be jumped over: ducking does not help because it is below the crouched dino. '
      + 'A bird at head height must be ducked under. A bird high in the sky passes overhead if the dino does nothing; jumping into it is a crash.',
    criteria: {
      jump: 'Jump over it. Right for cacti and for birds flying low near the ground. Wrong for a bird high in the sky.',
      duck: "Duck under it. Right for a bird at the dino's head height.",
      nothing: "Do nothing and keep running. Right only when the obstacle is high above the dino's head.",
    },
  },
};

export function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/** One obstacle schedule per seed: spawn time (s), kind and the words Drex reads. */
export function schedule(seed, n = 400) {
  const r = rng(seed), list = [];
  let t = 1.6;
  for (let i = 0; i < n; i++) {
    const kind = KINDS[Math.floor(r() * KINDS.length)];
    list.push({ i, t, kind, say: kind.say[Math.floor(r() * kind.say.length)] });
    t += 1.15 + r() * 1.1;
  }
  return list;
}
export const speedAt = (t) => Math.min(SPEED_MAX, SPEED0 + SPEED_GAIN * t);
export function travelled(t) {
  const tMax = (SPEED_MAX - SPEED0) / SPEED_GAIN;
  if (t <= tMax) return SPEED0 * t + SPEED_GAIN * t * t / 2;
  return SPEED0 * tMax + SPEED_GAIN * tMax * tMax / 2 + SPEED_MAX * (t - tMax);
}
export const obstacleX = (o, t) => W + 10 - (travelled(t) - travelled(o.t));

/** The moment an obstacle is ASK_PX from the dino's nose, when the game asks Drex about it. */
export function askTime(o) {
  const target = travelled(o.t) + (W + 10 - (DINO_X + DINO_W) - ASK_PX);
  let lo = o.t, hi = o.t + 30;
  for (let k = 0; k < 60; k++) { const mid = (lo + hi) / 2; if (travelled(mid) < target) lo = mid; else hi = mid; }
  return hi;
}

/** What Drex is told about an obstacle at the moment it is asked. */
export function stateFor(o) {
  const t = askTime(o), speed = speedAt(t);
  return {
    dino: 'running on the ground, 44 px tall, 40 px wide',
    obstacle_ahead: o.say,
    distance_px: ASK_PX,
    speed_px_per_s: Math.round(speed),
    seconds_until_contact: +(ASK_PX / speed).toFixed(2),
  };
}

// ---- Race simulation, shared by the page (animated) and anything that needs the result (headless). ----
export const STEP = 1 / 120;
export function newLane(run) {
  return { run, alive: true, y: 0, vy: 0, ducking: false, decided: new Map(), late: 0, latency: [], diedAt: null, diedSpeed: 0, log: 'waiting for the first obstacle…' };
}
/** Advance one lane to time t by one fixed STEP. Answers arrive after their recorded round-trip time. */
export function stepLane(l, t, sched) {
  if (!l.alive) return;
  const speed = speedAt(t);
  for (const o of sched) {
    if (o.t > t) break;
    const x = obstacleX(o, t);
    if (x + o.kind.w < 0) continue;
    const dist = x - (DINO_X + DINO_W), tc = dist / speed;
    if (!l.decided.has(o) && dist <= ASK_PX) { const d = l.run[o.i]; l.decided.set(o, { status: 'asking', readyAt: d ? t + d.ms / 1000 : Infinity, d }); }
    const rec = l.decided.get(o);
    if (!rec) continue;
    if (rec.status === 'asking' && t >= rec.readyAt) {
      Object.assign(rec, { status: 'ready', choice: rec.d.choice, probs: rec.d.probs });
      l.latency.push(rec.d.ms);
      l.log = `“${o.say}” → ${rec.choice.toUpperCase()} ${Math.round((rec.probs[rec.choice] ?? 0) * 100)}% · ${rec.d.ms} ms`;
    }
    if (rec.status !== 'ready' && tc < 0.12 && !rec.lateMarked) { rec.lateMarked = true; l.late++; l.log = `“${o.say}” → answer not back in time (${rec.d ? rec.d.ms + ' ms' : 'no answer'}), keeps running`; }
    if (rec.status === 'ready' && !rec.done) {
      if (rec.choice === 'jump' && tc <= 0.1 && l.y === 0) { l.vy = JUMP_V; rec.done = true; }
      if (rec.choice === 'duck' && tc <= 0.3) { l.ducking = true; rec.duckFor = o; rec.done = true; }
      if (rec.choice === 'nothing') rec.done = true;
    }
  }
  if (l.ducking && ![...l.decided.entries()].some(([o, r]) => r.duckFor === o && obstacleX(o, t) + o.kind.w > DINO_X - 4)) l.ducking = false;
  if (l.y > 0 || l.vy > 0) { l.vy -= G * STEP; l.y = Math.max(0, l.y + l.vy * STEP); if (l.y === 0) l.vy = 0; }
  const duck = l.ducking && l.y === 0, dw = duck ? DUCK_W : DINO_W, dh = duck ? DUCK_H : DINO_H;
  for (const o of sched) {
    if (o.t > t) break;
    const x = obstacleX(o, t);
    if (x > DINO_X + dw || x + o.kind.w < DINO_X) continue;
    if (DINO_X + 4 < x + o.kind.w - 2 && DINO_X + dw - 4 > x + 2 && l.y + 2 < o.kind.lift + o.kind.h && l.y + dh - 2 > o.kind.lift) {
      l.alive = false; l.diedAt = t; l.diedSpeed = speed;
      const r = l.decided.get(o);
      l.log = `crashed into “${o.say}”` + (r?.lateMarked ? (r.status === 'ready' ? `: answered ${r.choice.toUpperCase()}, but ${r.d.ms} ms was too late at this speed` : ': the answer did not arrive in time') : r?.status === 'ready' ? ` after choosing ${r.choice.toUpperCase()}` : '');
      return;
    }
  }
}
/** Run a whole recorded lane without drawing: where and how it ends. */
export function simulate(run, sched, maxSeconds = 300) {
  const l = newLane(run);
  for (let t = STEP; t < maxSeconds && l.alive; t += STEP) stepLane(l, t, sched);
  return { score: Math.floor(travelled(l.diedAt ?? maxSeconds) / 10), speed: +((l.diedSpeed || speedAt(maxSeconds)) / SPEED0).toFixed(1), decisions: l.latency.length, late: l.late, log: l.log, alive: l.alive };
}
