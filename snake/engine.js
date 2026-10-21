// Drex Snake engine, shared by the page (you vs Drex Max) and the recorder.
// Drex gets facts about each move (crash, room ahead, apple distance, room left to move in), never a ready-made score.
export const N = 16, MAX_STEPS = 900, STARVE = 220;
export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

export function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const key = (x, y) => `${x},${y}`;
/** plan: optional list of apple spots by apple number (the page gives you the apples Drex got); free spots are used first. */
export function newGame(seed, plan = null) {
  const g = { r: rng(seed), plan, snake: [[6, 8], [5, 8], [4, 8]], dir: 'right', apples: 0, steps: 0, since: 0, alive: true, why: '' };
  g.apple = spawnApple(g);
  return g;
}
function spawnApple(g) {
  const busy = new Set(g.snake.map(([x, y]) => key(x, y)));
  const planned = g.plan?.[g.apples];
  if (planned && !busy.has(key(planned[0], planned[1]))) return planned.slice();
  for (let k = 0; k < 4000; k++) { const x = Math.floor(g.r() * N), y = Math.floor(g.r() * N); if (!busy.has(key(x, y))) return [x, y]; }
  return null;
}
const inside = (x, y) => x >= 0 && y >= 0 && x < N && y < N;

/** What happens if the snake moves `dir` now: crash, eats, room ahead, apple distance and open cells it can still reach. */
export function look(g, dir) {
  const [hx, hy] = g.snake[0], [dx, dy] = DIRS[dir], nx = hx + dx, ny = hy + dy;
  const eats = g.apple && nx === g.apple[0] && ny === g.apple[1];
  const body = g.snake.slice(0, eats ? g.snake.length : g.snake.length - 1); // the tail moves away unless the snake grows
  const busy = new Set(body.map(([x, y]) => key(x, y)));
  if (!inside(nx, ny)) return { dir, crash: 'wall' };
  if (busy.has(key(nx, ny))) return { dir, crash: 'body' };
  let ahead = 0; for (let x = nx + dx, y = ny + dy; inside(x, y) && !busy.has(key(x, y)); x += dx, y += dy) ahead++;
  busy.add(key(nx, ny));
  const seen = new Set([key(nx, ny)]), q = [[nx, ny]];
  while (q.length) { const [x, y] = q.pop(); for (const [ex, ey] of Object.values(DIRS)) { const X = x + ex, Y = y + ey, k = key(X, Y); if (inside(X, Y) && !busy.has(k) && !seen.has(k)) { seen.add(k); q.push([X, Y]); } } }
  const dist = (x, y) => (g.apple ? Math.abs(g.apple[0] - x) + Math.abs(g.apple[1] - y) : 0);
  return { dir, crash: null, eats, ahead, room: seen.size - 1, closer: dist(hx, hy) - dist(nx, ny), length: g.snake.length + (eats ? 1 : 0) };
}

/** The moves the snake can try (every direction but straight back), with the facts Drex reads. */
export function options(g) {
  return Object.keys(DIRS).filter((d) => d !== OPPOSITE[g.dir]).map((d) => {
    const o = look(g, d);
    if (o.crash) return { ...o, text: `${d}: crashes into ${o.crash === 'wall' ? 'the wall' : 'its own body'}` };
    const apple = o.eats ? 'eats the apple' : o.closer > 0 ? 'one step closer to the apple' : 'one step further from the apple';
    const trap = o.room < o.length ? `, only ${o.room} open cells reachable afterwards, fewer than the snake's length ${o.length}: likely trapped` : `, ${o.room} open cells reachable afterwards`;
    return { ...o, text: `${d}: ${apple}, ${o.ahead} free cells straight ahead${trap}` };
  });
}

export const INSTRUCTIONS = 'You steer a snake on a 16 by 16 board. Pick the one move that keeps the snake alive and gets it to the apple. '
  + 'Priorities, in order: 1) never pick a move that crashes; 2) never pick a move that leaves fewer reachable open cells than the snake is long, '
  + 'because the snake then traps itself; 3) among the safe moves, prefer eating the apple, then getting closer to it; 4) when equal, prefer more open cells.';

export function boardText(g) {
  const rows = Array.from({ length: N }, () => Array(N).fill('.'));
  if (g.apple) rows[g.apple[1]][g.apple[0]] = '*';
  g.snake.forEach(([x, y], i) => { rows[y][x] = i === 0 ? 'H' : 'o'; });
  return rows.map((r) => r.join(''));
}
export function requestFor(g) {
  const list = options(g);
  const state = { board_top_to_bottom: boardText(g), legend: 'H = snake head, o = snake body, * = apple, . = empty', heading: g.dir, snake_length: g.snake.length, apples_eaten: g.apples, apple_at: g.apple ? { column: g.apple[0] + 1, row: g.apple[1] + 1 } : null };
  const questions = { move: { type: 'choice', instructions: INSTRUCTIONS, criteria: Object.fromEntries(list.map((o) => [o.dir, o.text])) } };
  return { list, state, questions };
}

/** One step in `dir` (straight back counts as straight on). Returns what happened. */
/** Where each apple appeared in a recorded game, by apple number, so another game can get the same apples. */
export function applePlan(seed, moves) {
  const g = newGame(seed), plan = [g.apple];
  for (const m of moves) { if (!g.alive) break; if (step(g, m.choice) === 'eat' && g.apple) plan.push(g.apple); }
  return plan;
}

export function step(g, dir) {
  if (!g.alive) return 'dead';
  if (dir && dir !== OPPOSITE[g.dir]) g.dir = dir;
  const o = look(g, g.dir);
  g.steps++; g.since++;
  if (o.crash) { g.alive = false; g.why = o.crash === 'wall' ? 'hit the wall' : 'ran into itself'; return 'crash'; }
  const [hx, hy] = g.snake[0], [dx, dy] = DIRS[g.dir];
  g.snake.unshift([hx + dx, hy + dy]);
  if (o.eats) { g.apples++; g.since = 0; g.apple = spawnApple(g); if (!g.apple) { g.alive = false; g.why = 'filled the board'; } return 'eat'; }
  g.snake.pop();
  if (g.since > STARVE) { g.alive = false; g.why = `went ${STARVE} moves without an apple`; return 'starve'; }
  if (g.steps >= MAX_STEPS) { g.alive = false; g.why = `reached the ${MAX_STEPS}-move limit`; return 'limit'; }
  return 'move';
}
