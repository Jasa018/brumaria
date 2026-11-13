// A* en 8 direcciones para caminar con clic y para la IA de las criaturas.

export interface Step {
  x: number;
  y: number;
}

/**
 * Devuelve los pasos desde (sx, sy) hasta (tx, ty), sin incluir el origen.
 * Con `adjacent`, basta con llegar a una casilla junto al destino.
 */
export function findPath(
  sx: number, sy: number, tx: number, ty: number,
  passable: (x: number, y: number) => boolean,
  opts: { maxNodes?: number; adjacent?: boolean } = {},
): Step[] | null {
  const maxNodes = opts.maxNodes ?? 2000;
  const goal = (x: number, y: number) =>
    opts.adjacent ? Math.max(Math.abs(x - tx), Math.abs(y - ty)) <= 1 && !(x === tx && y === ty) : x === tx && y === ty;
  if (goal(sx, sy)) return [];
  const key = (x: number, y: number) => (y << 12) | x;
  const g = new Map<number, number>();
  const came = new Map<number, number>();
  const open: [number, number, number, number][] = []; // f, g, x, y
  const h = (x: number, y: number) => Math.max(Math.abs(x - tx), Math.abs(y - ty));
  const push = (n: [number, number, number, number]) => {
    open.push(n);
    let c = open.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (open[p][0] <= open[c][0]) break;
      [open[p], open[c]] = [open[c], open[p]];
      c = p;
    }
  };
  const pop = () => {
    const top = open[0];
    const last = open.pop()!;
    if (open.length) {
      open[0] = last;
      let c = 0;
      for (;;) {
        const l = c * 2 + 1;
        const r = l + 1;
        let m = c;
        if (l < open.length && open[l][0] < open[m][0]) m = l;
        if (r < open.length && open[r][0] < open[m][0]) m = r;
        if (m === c) break;
        [open[m], open[c]] = [open[c], open[m]];
        c = m;
      }
    }
    return top;
  };
  g.set(key(sx, sy), 0);
  push([h(sx, sy), 0, sx, sy]);
  let nodes = 0;
  while (open.length && nodes++ < maxNodes) {
    const [, cg, x, y] = pop();
    if (cg > (g.get(key(x, y)) ?? Infinity)) continue;
    if (goal(x, y)) {
      const path: Step[] = [];
      let k = key(x, y);
      while (k !== key(sx, sy)) {
        path.push({ x: k & 4095, y: k >> 12 });
        k = came.get(k)!;
      }
      return path.reverse();
    }
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        const isGoalTile = nx === tx && ny === ty;
        if (!passable(nx, ny) && !(isGoalTile && !opts.adjacent)) continue;
        // Los pasos en diagonal cuestan más, como en el juego real.
        const ng = cg + (dx && dy ? 1.45 : 1);
        const k = key(nx, ny);
        if (ng < (g.get(k) ?? Infinity)) {
          g.set(k, ng);
          came.set(k, key(x, y));
          push([ng + h(nx, ny), ng, nx, ny]);
        }
      }
  }
  return null;
}

/** Línea de visión (Bresenham). Ignora los extremos. */
export function lineOfSight(x0: number, y0: number, x1: number, y1: number, blocks: (x: number, y: number) => boolean): boolean {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    if (x === x1 && y === y1) return true;
    if (!(x === x0 && y === y0) && blocks(x, y)) return false;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}
