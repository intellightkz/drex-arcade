// Small helpers shared by the you-vs-Drex game pages.

/** Brings the play area fully into view when a game starts, mostly for phones where the board sits below the head. */
export function bringIntoView(el) {
  const r = el.getBoundingClientRect();
  if (r.top >= 0 && r.bottom <= innerHeight) return;
  el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

/** Calls onAway when the window or tab loses focus, so a game can pause instead of playing on without you. */
export function whenAway(onAway) {
  addEventListener('blur', onAway);
  document.addEventListener('visibilitychange', () => { if (document.hidden) onAway(); });
}

/**
 * The largest whole cell size for a cols×rows board inside `box` (the paper panel), leaving `side` px for the side
 * panel (0 when it sits below) and keeping the board within the window height minus `reserveY`.
 */
export function fitCell({ box, cols, rows, side, reserveY, min = 12, max = 32 }) {
  const cs = getComputedStyle(box), padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const gap = side ? parseFloat(cs.columnGap) || 16 : 0;
  const byWidth = Math.floor((box.clientWidth - padX - side - gap - 2) / cols);
  const byHeight = Math.floor((innerHeight - reserveY) / rows);
  return Math.max(min, Math.min(max, byWidth, byHeight));
}
