// Convierte el empedrado de una plantilla de pueblo en hierba y deja adoquines solo en los caminos
// que unen el centro con puertas, portones, escaleras y NPC de la calle.

const BLOCKING = new Set([...'#W~MTYftbcoxAFgBNKLSwPZrpu&']);
const WALKABLE_OUT = new Set([',', '.', '=', 's', 'H', 'm', '*']);
const DOORS = new Set(['+', '$']);

function prng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

const DIRS: [number, number][] = [[1, 0], [0, 1], [-1, 0], [0, -1]];

/**
 * @param rows plantilla del pueblo
 * @param hub casilla desde la que salen todos los caminos (por ejemplo, junto al portón)
 */
export function greenify(rows: string[], hub: [number, number], seed: number): string[] {
  const H = rows.length;
  const W = Math.max(...rows.map((r) => r.length));
  const g = rows.map((r) => [...r.padEnd(W, '.')]);
  const inb = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
  const walk = (x: number, y: number) => inb(x, y) && !BLOCKING.has(g[y][x]) && (WALKABLE_OUT.has(g[y][x]) || DOORS.has(g[y][x]) || /[0-9GD@^]/.test(g[y][x]));

  // Destinos: la casilla de fuera de cada puerta, los portones, escaleras, NPC al aire libre y caminos del borde
  const targets: [number, number][] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const ch = g[y][x];
      if (DOORS.has(ch) || ch === 'G') {
        for (const [dx, dy] of DIRS) if (inb(x + dx, y + dy) && g[y + dy][x + dx] === ',') targets.push([x + dx, y + dy]);
      } else if (ch === 'D' || (/[0-9]/.test(ch) && DIRS.some(([dx, dy]) => inb(x + dx, y + dy) && g[y + dy][x + dx] === ','))) targets.push([x, y]);
      else if (ch === '=' && (x === 0 || y === 0 || x === W - 1 || y === H - 1)) targets.push([x, y]);
    }

  // Dijkstra con penalización por giro: caminos rectos que comparten tramo
  const N = W * H;
  const INF = 1e9;
  const dist = new Float64Array(N * 4).fill(INF);
  const prev = new Int32Array(N * 4).fill(-1);
  const heap: [number, number][] = [];
  const push = (d: number, s: number) => {
    heap.push([d, s]);
    let c = heap.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (heap[p][0] <= heap[c][0]) break;
      [heap[p], heap[c]] = [heap[c], heap[p]];
      c = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let c = 0;
      for (;;) {
        const l = c * 2 + 1;
        const r = l + 1;
        let m = c;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === c) break;
        [heap[m], heap[c]] = [heap[c], heap[m]];
        c = m;
      }
    }
    return top;
  };
  const [hx, hy] = hub;
  for (let d = 0; d < 4; d++) {
    dist[(hy * W + hx) * 4 + d] = 0;
    push(0, (hy * W + hx) * 4 + d);
  }
  while (heap.length) {
    const [d, s] = pop();
    if (d > dist[s]) continue;
    const cell = s >> 2;
    const dir = s & 3;
    const x = cell % W;
    const y = (cell - x) / W;
    DIRS.forEach(([dx, dy], nd) => {
      const nx = x + dx;
      const ny = y + dy;
      if (!walk(nx, ny)) return;
      // Las puertas no se atraviesan: los caminos van por fuera
      if (DOORS.has(g[ny][nx])) return;
      const ns = (ny * W + nx) * 4 + nd;
      const cost = d + 1 + (nd !== dir ? 0.7 : 0);
      if (cost < dist[ns]) {
        dist[ns] = cost;
        prev[ns] = s;
        push(cost, ns);
      }
    });
  }
  const path = new Uint8Array(N);
  for (const [tx, ty] of targets) {
    let best = -1;
    for (let d = 0; d < 4; d++) {
      const s = (ty * W + tx) * 4 + d;
      if (dist[s] < INF && (best < 0 || dist[s] < dist[best])) best = s;
    }
    for (let s = best; s >= 0; s = prev[s]) path[s >> 2] = 1;
  }
  // Caminos de 2 casillas de ancho
  const wide = new Uint8Array(path);
  for (let i = 0; i < N; i++) {
    if (!path[i]) continue;
    const x = i % W;
    const y = (i - x) / W;
    for (const [dx, dy] of [[1, 0], [0, 1]]) if (inb(x + dx, y + dy) && g[y + dy][x + dx] === ',') wide[(y + dy) * W + x + dx] = 1;
  }

  // El resto del empedrado se vuelve jardín
  const r = prng(seed);
  const nearPath = (x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inb(x + dx, y + dy) && wide[(y + dy) * W + x + dx]) return true;
    return false;
  };
  const nearSolid = (x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!inb(x + dx, y + dy)) return true;
        const c = g[y + dy][x + dx];
        if (BLOCKING.has(c) || DOORS.has(c) || c === 'G' || c === 'D') return true;
      }
    return false;
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (g[y][x] !== ',' || wide[y * W + x]) continue;
      const v = r();
      if (!nearPath(x, y) && !nearSolid(x, y) && v < 0.06) g[y][x] = 'T';
      else if (!nearPath(x, y) && !nearSolid(x, y) && v < 0.09) g[y][x] = 'u';
      else if (v < 0.2) g[y][x] = '*';
      else g[y][x] = '.';
    }
  return g.map((row) => row.join(''));
}
