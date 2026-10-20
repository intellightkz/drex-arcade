// Drex Stack game engine, shared by the browser page and the headless bench (bench.mjs).
export const W = 10, H = 20, GARBAGE_EVERY = 12;

// Each piece: its rotations as [x, y] cells, y downward.
export const SHAPES = {
  I: [[[0,0],[1,0],[2,0],[3,0]], [[0,0],[0,1],[0,2],[0,3]]],
  O: [[[0,0],[1,0],[0,1],[1,1]]],
  T: [[[0,0],[1,0],[2,0],[1,1]], [[1,0],[0,1],[1,1],[1,2]], [[1,0],[0,1],[1,1],[2,1]], [[0,0],[0,1],[1,1],[0,2]]],
  S: [[[1,0],[2,0],[0,1],[1,1]], [[0,0],[0,1],[1,1],[1,2]]],
  Z: [[[0,0],[1,0],[1,1],[2,1]], [[1,0],[0,1],[1,1],[0,2]]],
  L: [[[0,0],[1,0],[2,0],[0,1]], [[0,0],[1,0],[1,1],[1,2]], [[2,0],[0,1],[1,1],[2,1]], [[0,0],[0,1],[0,2],[1,2]]],
  J: [[[0,0],[1,0],[2,0],[2,1]], [[1,0],[1,1],[0,2],[1,2]], [[0,0],[0,1],[1,1],[2,1]], [[0,0],[1,0],[0,1],[0,2]]],
};
const TURN = ['flat', 'turned once', 'upside down', 'turned three times'];

// Two versions of how the game explains itself to Drex. "basic" was the first version; "full" adds priorities,
// surface facts and a one-piece lookahead. Neither gives Drex a ready-made score: only facts about each option.
export const INSTRUCTIONS = {
  basic: 'You are playing a falling-block puzzle on a 10-wide, 20-tall board. Choose where to drop the current piece. '
    + 'Good moves: complete full rows (they disappear), create no new holes, keep the stack low and the surface flat. '
    + 'A hole is an empty cell with a block above it; holes are very bad because they block rows from clearing. The game is lost when the stack reaches the top.',
  full: 'You are playing a falling-block puzzle on a 10-wide, 20-tall board. Choose where to drop the current piece. '
    + 'A hole is an empty cell with a block above it; holes block rows from clearing and are the main way games are lost. '
    + 'Priorities, in order: (1) do not create a new hole when any option avoids one; (2) clear rows, and more rows at once is better; '
    + '(3) keep the tallest column low, which becomes urgent above 12; (4) keep the surface flat; '
    + '(5) prefer options after which the next piece also fits without a new hole. '
    + 'A deep one-wide gap is only worth leaving for a straight I piece.',
};

export function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function pieceSequence(seed, n) {
  const r = rng(seed), out = [];
  while (out.length < n) { const bag = Object.keys(SHAPES); for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; } out.push(...bag); }
  return out;
}
export function garbageHoles(seed, n) { const r = rng(seed ^ 0x9e3779b9); return Array.from({ length: n }, () => Math.floor(r() * W)); }

export const emptyBoard = () => Array.from({ length: H }, () => Array(W).fill(0));
const fits = (b, cells, ox, oy) => cells.every(([x, y]) => { const X = x + ox, Y = y + oy; return X >= 0 && X < W && Y < H && (Y < 0 || !b[Y][X]); });
export function heights(b) { return Array.from({ length: W }, (_, x) => { for (let y = 0; y < H; y++) if (b[y][x]) return H - y; return 0; }); }
export function holes(b) { let n = 0; for (let x = 0; x < W; x++) { let seen = false; for (let y = 0; y < H; y++) { if (b[y][x]) seen = true; else if (seen) n++; } } return n; }
const bumpiness = (hs) => hs.slice(1).reduce((a, h, i) => a + Math.abs(h - hs[i]), 0);
function deepWells(hs) { let n = 0; for (let x = 0; x < W; x++) { const l = x === 0 ? H : hs[x - 1], r = x === W - 1 ? H : hs[x + 1]; if (Math.min(l, r) - hs[x] >= 3) n++; } return n; }
function place(b, cells, ox, oy) { const nb = b.map((r) => r.slice()); for (const [x, y] of cells) nb[y + oy][x + ox] = 2; return nb; }
export function clearRows(b) { const kept = b.filter((r) => r.some((c) => !c)); const n = H - kept.length; return { board: [...Array.from({ length: n }, () => Array(W).fill(0)), ...kept], cleared: n }; }
export const boardText = (b) => b.map((r) => r.map((c) => (c ? '#' : '.')).join(''));

/** Every legal hard drop of a piece on a board: where it lands and what the board looks like after. */
function rawPlacements(b, piece) {
  const out = [];
  SHAPES[piece].forEach((cells, rot) => {
    const w = Math.max(...cells.map(([x]) => x)) + 1;
    for (let ox = 0; ox + w <= W; ox++) {
      if (!fits(b, cells, ox, 0)) continue;
      let oy = 0; while (fits(b, cells, ox, oy + 1)) oy++;
      const { board: after, cleared } = clearRows(place(b, cells, ox, oy));
      out.push({ key: `${'abcd'[rot]}${ox + 1}`, rot, ox, oy, w, cells, cleared, after });
    }
  });
  return out;
}

/** Placements with the facts Drex reads, in the given description version. */
export function placements(b, piece, next, version = 'full') {
  const holesNow = holes(b), hsNow = heights(b), bumpNow = bumpiness(hsNow), wellsNow = deepWells(hsNow);
  return rawPlacements(b, piece).map((p) => {
    const hs = heights(p.after), hl = holes(p.after), bump = bumpiness(hs), maxH = Math.max(...hs), wells = deepWells(hs);
    const newHoles = hl - holesNow;
    const where = `${TURN[p.rot]}, columns ${p.ox + 1}-${p.ox + p.w}`;
    const rows = `clears ${p.cleared} row${p.cleared === 1 ? '' : 's'}`;
    const holeText = newHoles > 0 ? `creates ${newHoles} new hole${newHoles === 1 ? '' : 's'}` : 'no new holes';
    let text = `${where}: ${rows}, ${holeText}, tallest column ${maxH}, surface bumpiness ${bump}`;
    let follow = null;
    if (version === 'full') {
      const flat = bump < bumpNow ? `surface gets flatter (bumpiness ${bump}, was ${bumpNow})` : bump > bumpNow ? `surface gets bumpier (bumpiness ${bump}, was ${bumpNow})` : `surface unchanged (bumpiness ${bump})`;
      const wellText = wells > wellsNow ? ', leaves a deep one-wide gap' : '';
      if (next) {
        // One-piece lookahead: the best the next piece can do on the board this option leaves.
        let best = null;
        for (const q of rawPlacements(p.after, next)) {
          const qh = holes(q.after) - hl, s = q.cleared * 10 - Math.max(0, qh) * 30 - Math.max(...heights(q.after));
          if (!best || s > best.s) best = { s, cleared: q.cleared, newHoles: Math.max(0, qh) };
        }
        follow = best;
      }
      const nextText = !next ? '' : !follow ? `; the next piece ${next} would have nowhere to go`
        : `; then the next piece ${next} can ${follow.cleared ? `clear ${follow.cleared} row${follow.cleared === 1 ? '' : 's'}` : 'land'} ${follow.newHoles ? `but only by making ${follow.newHoles} hole${follow.newHoles === 1 ? '' : 's'}` : 'with no new holes'}`;
      text = `${where}: ${rows}, ${holeText}, tallest column ${maxH}, ${flat}${wellText}${nextText}`;
    }
    return { ...p, newHoles, maxH, bump, text, follow };
  });
}

export function addGarbage(b, hole) {
  const toppedOut = b[0].some((c) => c);
  return { board: [...b.slice(1), Array.from({ length: W }, (_, x) => (x === hole ? 0 : 3))], toppedOut };
}
export const normalize = (b) => b.map((r) => r.map((c) => (c ? (c === 3 ? 3 : 1) : 0)));

export function requestFor(board, seq, i, lines, version) {
  const piece = seq[i], next = seq[i + 1];
  const list = placements(board, piece, next, version);
  const state = { board_top_to_bottom: boardText(board), current_piece: piece, next_piece: next, holes_now: holes(board), tallest_column: Math.max(...heights(board)), rows_cleared_so_far: lines };
  const questions = { move: { type: 'choice', instructions: INSTRUCTIONS[version], criteria: Object.fromEntries(list.map((o) => [o.key, o.text])) } };
  return { list, state, questions };
}
