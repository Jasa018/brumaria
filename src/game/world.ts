// Generación del mundo. Sin DOM: lo usa también scripts/sim.ts en Node.
import { G, GROUNDS, O, OBJECTS } from '../data/tiles';
import { AREAS, CAVES, ROADS, SURFACE_SPAWNS, TOWNS, WORLD_H, WORLD_SEED, WORLD_W, WORLD_Z, type CaveDef, type CaveStyle } from '../data/world';
import { MONSTERS } from '../data/monsters';
import { Rng, fbm } from './rng';

export interface Pos {
  x: number;
  y: number;
  z: number;
}

export interface SpawnPoint {
  monster: string;
  z: number;
  /** Casillas posibles donde aparece. */
  tiles: number[];
  /** Centro y radio (las criaturas no se alejan demasiado). */
  x: number;
  y: number;
  radius: number;
  respawn: number;
}

export interface NpcPlacement {
  npc: string;
  x: number;
  y: number;
  z: number;
}

export interface TownRect {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Style = 'surface' | CaveStyle;

const DIRS4 = [[0, 1], [1, 0], [0, -1], [-1, 0]] as const;
const DIRS8 = [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const;

export class WorldMap {
  readonly W = WORLD_W;
  readonly H = WORLD_H;
  readonly Z = WORLD_Z;
  ground: Uint8Array[] = [];
  obj: Uint8Array[] = [];
  pz: Uint8Array[] = [];
  /** Índice de zona (para el nombre) por casilla. */
  area: Uint8Array[] = [];
  areaNames: string[] = ['Brumaria'];
  areaStyles: Style[] = ['surface'];
  /** Escaleras: casilla -> destino. La clave es key(x, y, z). */
  links = new Map<number, Pos>();
  spawns: SpawnPoint[] = [];
  npcs: NpcPlacement[] = [];
  temples: Record<string, Pos> = {};
  towns: TownRect[] = [];
  caveEntrances: Record<string, Pos> = {};
  warnings: string[] = [];

  constructor() {
    for (let z = 0; z < this.Z; z++) {
      const n = this.W * this.H;
      this.ground.push(new Uint8Array(n).fill(z === 0 ? G.SEA : G.ROCK));
      this.obj.push(new Uint8Array(n));
      this.pz.push(new Uint8Array(n));
      this.area.push(new Uint8Array(n));
    }
  }

  key(x: number, y: number, z: number): number {
    return (z * this.H + y) * this.W + x;
  }
  unkey(k: number): Pos {
    const x = k % this.W;
    const r = (k - x) / this.W;
    const y = r % this.H;
    return { x, y, z: (r - y) / this.H };
  }
  inBounds(x: number, y: number, z = 0): boolean {
    return x >= 0 && y >= 0 && x < this.W && y < this.H && z >= 0 && z < this.Z;
  }
  g(x: number, y: number, z: number): number {
    return this.inBounds(x, y, z) ? this.ground[z][y * this.W + x] : G.VOID;
  }
  o(x: number, y: number, z: number): number {
    return this.inBounds(x, y, z) ? this.obj[z][y * this.W + x] : O.NONE;
  }
  setG(x: number, y: number, z: number, v: number) {
    if (this.inBounds(x, y, z)) this.ground[z][y * this.W + x] = v;
  }
  setO(x: number, y: number, z: number, v: number) {
    if (this.inBounds(x, y, z)) this.obj[z][y * this.W + x] = v;
  }
  /** Se puede pisar (sin contar criaturas). */
  walkable(x: number, y: number, z: number): boolean {
    if (!this.inBounds(x, y, z)) return false;
    const i = y * this.W + x;
    return GROUNDS[this.ground[z][i]].walk && !OBJECTS[this.obj[z][i]].block;
  }
  blocksSight(x: number, y: number, z: number): boolean {
    if (!this.inBounds(x, y, z)) return true;
    const i = y * this.W + x;
    const gr = this.ground[z][i];
    if (gr === G.ROCK || gr === G.VOID) return true;
    return !!OBJECTS[this.obj[z][i]].sight;
  }
  isPz(x: number, y: number, z: number): boolean {
    return this.inBounds(x, y, z) && this.pz[z][y * this.W + x] === 1;
  }
  areaName(x: number, y: number, z: number): string {
    if (!this.inBounds(x, y, z)) return '';
    return this.areaNames[this.area[z][y * this.W + x]];
  }
  style(x: number, y: number, z: number): Style {
    if (!this.inBounds(x, y, z)) return 'cave';
    return this.areaStyles[this.area[z][y * this.W + x]];
  }
  townAt(x: number, y: number, z: number): TownRect | undefined {
    if (z !== 0) return undefined;
    return this.towns.find((t) => x >= t.x && y >= t.y && x < t.x + t.w && y < t.y + t.h);
  }
  /** Casilla transitable junto a (x, y), prefiriendo el sur. */
  freeNeighbor(x: number, y: number, z: number): Pos | null {
    for (const [dx, dy] of DIRS8) if (this.walkable(x + dx, y + dy, z) && !this.isStairs(x + dx, y + dy, z)) return { x: x + dx, y: y + dy, z };
    return null;
  }
  isStairs(x: number, y: number, z: number): boolean {
    const o = this.o(x, y, z);
    return o === O.STAIRS_DOWN || o === O.STAIRS_UP;
  }
  private addArea(name: string, style: Style): number {
    this.areaNames.push(name);
    this.areaStyles.push(style);
    return this.areaNames.length - 1;
  }

  /** Búsqueda en anchura desde un punto. Devuelve distancias (-1 = inalcanzable). */
  bfs(sx: number, sy: number, z: number, passable = (x: number, y: number) => this.walkable(x, y, z) || (x === sx && y === sy)): Int32Array {
    const dist = new Int32Array(this.W * this.H).fill(-1);
    const q = new Int32Array(this.W * this.H);
    let h = 0;
    let t = 0;
    dist[sy * this.W + sx] = 0;
    q[t++] = sy * this.W + sx;
    while (h < t) {
      const i = q[h++];
      const x = i % this.W;
      const y = (i - x) / this.W;
      for (const [dx, dy] of DIRS8) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= this.W || ny >= this.H) continue;
        const j = ny * this.W + nx;
        if (dist[j] >= 0 || !passable(nx, ny)) continue;
        dist[j] = dist[i] + 1;
        q[t++] = j;
      }
    }
    return dist;
  }

  // ===================================================================
  //                         GENERACIÓN
  // ===================================================================

  generate() {
    const rng = new Rng(WORLD_SEED);
    this.genTerrain(rng);
    this.genRiver();
    this.genObjects(rng);
    this.stampTowns();
    this.genRoads(rng);
    this.genAreas();
    this.genCaves(rng);
    this.ensureConnected();
    this.genSurfaceSpawns();
    return this;
  }

  private biome: Uint8Array = new Uint8Array(0); // 0 mar, 1 llanura, 2 bosque, 3 montaña, 4 pantano

  private genTerrain(_rng: Rng) {
    const S = WORLD_SEED;
    const W = this.W;
    const H = this.H;
    this.biome = new Uint8Array(W * H);
    const centers: [number, number, number][] = [
      [130, 110, 1], [100, 95, 1], [150, 135, 1], [90, 125, 1], [160, 85, 1],
      [100, 40, 2], [135, 35, 2], [75, 70, 2], [70, 40, 2],
      [200, 30, 3], [215, 55, 3], [182, 42, 3],
      [200, 115, 4], [215, 135, 4], [178, 138, 4],
    ];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const n = fbm(x / 22, y / 22, S) - 0.5;
        const dx = (x - 140) / 92;
        const dy = (y - 82) / 74;
        const eMain = dx ** 4 + dy ** 4 + n * 0.9;
        const ix = (x - 32) / 26;
        const iy = (y - 130) / 20;
        const rawIsl = ix * ix + iy * iy;
        const eIsl = rawIsl + n * 0.6;
        let land: 0 | 1 | 2 = eIsl < 1 ? 2 : eMain < 1 ? 1 : 0;
        if (land === 1 && rawIsl < 2.0) land = 0; // canal entre la isla y el continente
        if (x < 5 || y < 5 || x >= W - 5 || y >= H - 5) land = 0;
        if (!land) continue;
        let b: number;
        if (land === 2) {
          b = fbm(x / 10, y / 10, S + 9) > 0.6 ? 2 : 1;
        } else {
          const px = x + (fbm(x / 15, y / 15, S + 5) - 0.5) * 34;
          const py = y + (fbm(x / 15, y / 15, S + 6) - 0.5) * 34;
          let best = 1e9;
          b = 1;
          for (const [cx, cy, cb] of centers) {
            const d = (px - cx) ** 2 + (py - cy) ** 2;
            if (d < best) {
              best = d;
              b = cb;
            }
          }
        }
        this.biome[i] = b;
        const v = fbm(x / 8, y / 8, S + 21);
        let gr: number = G.GRASS;
        if (b === 1) gr = v > 0.72 ? G.DIRT : G.GRASS;
        else if (b === 2) gr = G.FOREST;
        else if (b === 3) gr = y < 24 + (fbm(x / 9, 0, S + 31) - 0.5) * 14 ? G.SNOW : G.DIRT;
        else if (b === 4) gr = v > 0.64 ? G.WATER : v < 0.36 ? G.MUD : v < 0.42 ? G.GRASS : G.SWAMP;
        this.ground[0][i] = gr;
      }
    }
    // Playas: tierra a 2 casillas o menos del mar
    const dist = new Int8Array(W * H).fill(-1);
    const q: number[] = [];
    for (let i = 0; i < W * H; i++) if (this.ground[0][i] === G.SEA) {
      dist[i] = 0;
      q.push(i);
    }
    for (let h = 0; h < q.length; h++) {
      const i = q[h];
      if (dist[i] >= 2) continue;
      const x = i % W;
      const y = (i - x) / W;
      for (const [dx, dy] of DIRS4) {
        const nx = x + dx;
        const ny = y + dy;
        if (!this.inBounds(nx, ny)) continue;
        const j = ny * W + nx;
        if (dist[j] >= 0) continue;
        dist[j] = dist[i] + 1;
        q.push(j);
        const b = this.biome[j];
        if (b === 1 || b === 2) this.ground[0][j] = G.SAND;
      }
    }
  }

  private genRiver() {
    const S = WORLD_SEED;
    for (let y = 52; y < this.H; y++) {
      const x0 = Math.round(167 + (fbm(y / 18, 3, S + 77) - 0.5) * 30);
      const w = 2 + (fbm(y / 6, 9, S + 78) > 0.6 ? 1 : 0);
      let hitSea = false;
      for (let x = x0; x < x0 + w; x++) {
        const gr = this.g(x, y, 0);
        if (gr === G.SEA) hitSea = true;
        else if (gr !== G.VOID) this.setG(x, y, 0, G.WATER);
      }
      if (hitSea && y > 120) break;
    }
  }

  private genObjects(rng: Rng) {
    const S = WORLD_SEED;
    for (let y = 0; y < this.H; y++) {
      for (let x = 0; x < this.W; x++) {
        const i = y * this.W + x;
        const gr = this.ground[0][i];
        if (!GROUNDS[gr].walk) continue;
        const b = this.biome[i];
        const d = fbm(x / 9, y / 9, S + 3);
        let o: number = O.NONE;
        const r = rng.next();
        if (gr === G.SAND) {
          if (r < 0.01) o = O.BOULDER;
        } else if (b === 1) {
          if (d > 0.68) o = r < 0.3 ? O.TREE : r < 0.34 ? O.BUSH : O.NONE;
          else if (r < 0.022) o = O.TREE;
          else if (r < 0.032) o = O.BUSH;
          else if (r < 0.06) o = O.FLOWERS;
          else if (r < 0.064) o = O.BOULDER;
        } else if (b === 2) {
          const dens = d < 0.4 ? 0.05 : Math.min(0.55, 0.22 + (d - 0.4) * 1.3);
          const pine = fbm(x / 30, y / 30, S + 4) > 0.52;
          if (r < dens) o = pine ? O.PINE : O.TREE;
          else if (r < dens + 0.04) o = O.BUSH;
          else if (r < dens + 0.06) o = O.MUSHROOMS;
        } else if (b === 3) {
          const mnt = fbm(x / 7, y / 7, S + 11);
          if (mnt > 0.57) o = O.MOUNTAIN;
          else if (r < 0.06) o = O.BOULDER;
          else if (r < 0.1) o = gr === G.SNOW ? O.SNOWPINE : O.PINE;
        } else if (b === 4) {
          if (gr === G.SWAMP) o = r < 0.12 ? O.REEDS : r < 0.17 ? O.DEADTREE : O.NONE;
          else o = r < 0.03 ? O.TREE : r < 0.06 ? O.DEADTREE : r < 0.09 ? O.REEDS : O.NONE;
        }
        this.obj[0][i] = o;
      }
    }
  }

  private stampTowns() {
    const markerTiles: { x: number; y: number }[] = [];
    for (const t of TOWNS) {
      const w = Math.max(...t.map.map((r) => r.length));
      const h = t.map.length;
      this.towns.push({ id: t.id, name: t.name, x: t.x, y: t.y, w, h });
      // Margen sin objetos alrededor del pueblo
      for (let y = t.y - 2; y < t.y + h + 2; y++)
        for (let x = t.x - 2; x < t.x + w + 2; x++) {
          const o = this.o(x, y, 0);
          if (OBJECTS[o].block && o !== O.MOUNTAIN) this.setO(x, y, 0, O.NONE);
        }
      for (let ry = 0; ry < h; ry++) {
        const row = t.map[ry].padEnd(w, '.');
        for (let rx = 0; rx < w; rx++) {
          const x = t.x + rx;
          const y = t.y + ry;
          const ch = row[rx];
          this.pz[0][y * this.W + x] = 1;
          if (ch === ' ') continue;
          const set = (gr: number, o: number = O.NONE) => {
            this.setG(x, y, 0, gr);
            this.setO(x, y, 0, o);
          };
          switch (ch) {
            case '.': set(G.GRASS); break;
            case ',': set(G.COBBLE); break;
            case '_': set(G.WOOD); break;
            case ':': set(G.TILE); break;
            case '=': set(G.ROAD); break;
            case 's': set(G.SAND); break;
            case '~': set(G.WATER); break;
            case 'H': set(G.BRIDGE); break;
            case 'm': set(G.MUD); break;
            case '#': set(G.COBBLE, O.WALL); break;
            case 'W': set(G.WOOD, O.WOODWALL); break;
            case '+': set(G.WOOD, O.DOOR); break;
            case 'T': set(G.GRASS, O.TREE); break;
            case 'Y': set(G.GRASS, O.PINE); break;
            case 'f': set(G.GRASS, O.FENCE); break;
            case 't': set(G.WOOD, O.TABLE); break;
            case 'b': set(G.WOOD, O.BED); break;
            case 'c': set(G.WOOD, O.COUNTER); break;
            case 'o': set(G.WOOD, O.BARREL); break;
            case 'x': set(G.WOOD, O.CRATE); break;
            case 'A': set(G.TILE, O.ALTAR); break;
            case 'F': set(G.COBBLE, O.FOUNTAIN); break;
            case 'g': set(G.GRASS, O.GRAVE); break;
            case 'B': set(G.WOOD, O.BOOKSHELF); break;
            case 'N': set(G.WOOD, O.ANVIL); break;
            case 'K': set(G.WOOD, O.FURNACE); break;
            case 'L': set(G.COBBLE, O.LAMP); break;
            case '*': set(G.GRASS, O.FLOWERS); break;
            case 'S': set(G.COBBLE, O.SIGN); break;
            case 'w': set(G.COBBLE, O.WELL); break;
            case 'h': set(G.WOOD, O.CHAIR); break;
            case 'P': set(G.BRIDGE, O.DOCK_POST); break;
            case 'Z': set(G.TILE, O.STATUE); break;
            case 'r': set(G.TILE, O.BRAZIER); break;
            case 'M': set(G.DIRT, O.MOUNTAIN); break;
            case 'D':
              set(G.COBBLE, O.STAIRS_DOWN);
              this.caveEntrances[t.id] = { x, y, z: 0 };
              markerTiles.push({ x, y });
              break;
            case '@':
              set(G.TILE);
              this.temples[t.id] = { x, y, z: 0 };
              markerTiles.push({ x, y });
              break;
            default:
              if (ch >= '0' && ch <= '9') {
                const npc = t.npcs[ch];
                if (!npc) throw new Error(`Pueblo ${t.id}: marcador ${ch} sin NPC`);
                this.npcs.push({ npc, x, y, z: 0 });
                set(G.WOOD);
                markerTiles.push({ x, y });
              } else throw new Error(`Pueblo ${t.id}: carácter desconocido '${ch}'`);
          }
        }
      }
    }
    // El suelo bajo los marcadores imita a sus vecinos
    for (const { x, y } of markerTiles) {
      const count = new Map<number, number>();
      for (const [dx, dy] of DIRS4) {
        const gr = this.g(x + dx, y + dy, 0);
        if (GROUNDS[gr]?.walk && !this.isStairs(x + dx, y + dy, 0)) count.set(gr, (count.get(gr) ?? 0) + 1);
      }
      let best = -1;
      for (const [gr, c] of count) if (best < 0 || c > (count.get(best) ?? 0)) best = gr;
      if (best >= 0) this.setG(x, y, 0, best);
    }
  }

  private inTownRect(x: number, y: number): boolean {
    return this.towns.some((t) => x >= t.x && y >= t.y && x < t.x + t.w && y < t.y + t.h);
  }

  /** A* sobre la superficie con costes de "obra" (romper obstáculos, tender puentes). */
  private carvePath(sx: number, sy: number, tx: number, ty: number, roadCost: (x: number, y: number) => number): number[] | null {
    const W = this.W;
    const N = W * this.H;
    const gCost = new Float32Array(N).fill(Infinity);
    const came = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const heap: [number, number][] = [];
    const push = (f: number, i: number) => {
      heap.push([f, i]);
      let c = heap.length - 1;
      while (c > 0) {
        const p = (c - 1) >> 1;
        if (heap[p][0] <= heap[c][0]) break;
        [heap[p], heap[c]] = [heap[c], heap[p]];
        c = p;
      }
    };
    const pop = (): number => {
      const top = heap[0][1];
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
    const s = sy * W + sx;
    const t = ty * W + tx;
    gCost[s] = 0;
    push(0, s);
    while (heap.length) {
      const i = pop();
      if (i === t) break;
      if (closed[i]) continue;
      closed[i] = 1;
      const x = i % W;
      const y = (i - x) / W;
      for (const [dx, dy] of DIRS4) {
        const nx = x + dx;
        const ny = y + dy;
        if (!this.inBounds(nx, ny)) continue;
        const j = ny * W + nx;
        if (closed[j]) continue;
        const c = j === t ? 1 : roadCost(nx, ny);
        if (!isFinite(c)) continue;
        const ng = gCost[i] + c;
        if (ng < gCost[j]) {
          gCost[j] = ng;
          came[j] = i;
          push(ng + (Math.abs(nx - tx) + Math.abs(ny - ty)) * 0.9, j);
        }
      }
    }
    if (came[t] < 0 && s !== t) return null;
    const path: number[] = [];
    for (let i = t; i !== -1; i = came[i]) path.push(i);
    return path.reverse();
  }

  private genRoads(rng: Rng) {
    const cost = (x: number, y: number) => {
      if (this.inTownRect(x, y)) return Infinity;
      const gr = this.g(x, y, 0);
      if (gr === G.SEA || gr === G.VOID) return Infinity;
      if (gr === G.ROAD || gr === G.BRIDGE) return 0.3;
      if (gr === G.WATER) return 7;
      const o = this.o(x, y, 0);
      if (o === O.MOUNTAIN) return 4;
      if (OBJECTS[o].block) return 2;
      if (gr === G.SWAMP || gr === G.MUD) return 1.6;
      return 1;
    };
    for (const [sx, sy, tx, ty] of ROADS) {
      const path = this.carvePath(sx, sy, tx, ty, cost);
      if (!path) {
        this.warnings.push(`Camino sin ruta: ${sx},${sy} -> ${tx},${ty}`);
        continue;
      }
      for (const i of path) {
        const x = i % this.W;
        const y = (i - x) / this.W;
        if (this.inTownRect(x, y)) continue;
        const gr = this.ground[0][i];
        this.ground[0][i] = gr === G.WATER || gr === G.SEA ? G.BRIDGE : G.ROAD;
        this.obj[0][i] = O.NONE;
        for (const [dx, dy] of DIRS8) {
          const o = this.o(x + dx, y + dy, 0);
          if (OBJECTS[o].block && !this.inTownRect(x + dx, y + dy) && rng.chance(o === O.MOUNTAIN ? 0.8 : 0.6)) this.setO(x + dx, y + dy, 0, O.NONE);
        }
      }
    }
  }

  private genAreas() {
    const ids = AREAS.map((a) => this.addArea(a.name, 'surface'));
    const townIds = this.towns.map((t) => this.addArea(t.name, 'surface'));
    for (let y = 0; y < this.H; y++)
      for (let x = 0; x < this.W; x++) {
        const t = this.towns.findIndex((r) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h);
        let a = 0;
        if (t >= 0) a = townIds[t];
        else {
          const k = AREAS.findIndex((r) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h);
          if (k >= 0) a = ids[k];
        }
        this.area[0][y * this.W + x] = a;
      }
  }

  // ------------------------------ Cuevas ------------------------------

  private genCaves(rng: Rng) {
    const claims: Int16Array[] = [];
    for (let z = 0; z < this.Z; z++) claims.push(new Int16Array(this.W * this.H).fill(-1));
    const downPoints: Record<string, Pos> = {};

    CAVES.forEach((cave, ci) => {
      let entry: Pos;
      let rect = { ...cave.rect };
      if (cave.from) {
        const p = downPoints[cave.from];
        if (!p) throw new Error(`Cueva ${cave.id}: ${cave.from} no tiene bajada`);
        entry = { x: p.x, y: p.y, z: cave.z };
        rect.x = Math.max(1, Math.min(this.W - rect.w - 1, p.x - (rect.w >> 1)));
        rect.y = Math.max(1, Math.min(this.H - rect.h - 1, p.y - (rect.h >> 1)));
      } else if (cave.entrance && 'town' in cave.entrance) {
        const e = this.caveEntrances[cave.entrance.town];
        if (!e) throw new Error(`Cueva ${cave.id}: el pueblo no tiene 'D'`);
        entry = { x: e.x, y: e.y, z: cave.z };
      } else if (cave.entrance) {
        const e = this.placeSurfaceEntrance(cave.entrance.x, cave.entrance.y);
        entry = { x: e.x, y: e.y, z: cave.z };
      } else throw new Error(`Cueva ${cave.id} sin entrada`);

      const claim = claims[cave.z];
      for (let y = rect.y; y < rect.y + rect.h; y++)
        for (let x = rect.x; x < rect.x + rect.w; x++)
          if (this.inBounds(x, y) && claim[y * this.W + x] < 0) claim[y * this.W + x] = ci;
      claim[entry.y * this.W + entry.x] = ci;

      const areaId = this.addArea(cave.name, cave.style);
      for (let i = 0; i < claim.length; i++) if (claim[i] === ci) this.area[cave.z][i] = areaId;

      const carveable = (x: number, y: number) => {
        if (x < 1 || y < 1 || x >= this.W - 1 || y >= this.H - 1) return false;
        for (const [dx, dy] of DIRS8) if (claim[(y + dy) * this.W + x + dx] !== ci) return false;
        return claim[y * this.W + x] === ci;
      };
      // Asegura que la entrada pueda abrirse
      for (const [dx, dy] of [[0, 0], ...DIRS8]) claim[(entry.y + dy) * this.W + entry.x + dx] = ci;
      for (const [dx, dy] of [[0, 0], ...DIRS8]) {
        const k = (entry.y + dy) * this.W + entry.x + dx;
        this.area[cave.z][k] = areaId;
      }

      const open = cave.gen === 'ca' ? this.caGen(rng, rect, entry, carveable) : this.roomsGen(rng, rect, entry, carveable, cave.style === 'mine' ? 2 : 1);
      // Aplica al mapa
      const floor = cave.style === 'crypt' ? G.TILE : G.CAVE;
      for (const i of open) {
        this.ground[cave.z][i] = floor;
        this.obj[cave.z][i] = O.NONE;
      }
      this.decorateCave(rng, cave, open, entry);

      // Escaleras de entrada
      this.setO(entry.x, entry.y, cave.z, O.STAIRS_UP);
      const above: Pos = { x: entry.x, y: entry.y, z: cave.z - 1 };
      const down = this.freeNeighbor(entry.x, entry.y, cave.z);
      const up = this.freeNeighbor(above.x, above.y, above.z);
      if (!down || !up) throw new Error(`Cueva ${cave.id}: sin sitio junto a la escalera`);
      this.links.set(this.key(above.x, above.y, above.z), down);
      this.links.set(this.key(entry.x, entry.y, cave.z), up);

      // Distancias desde la entrada para colocar bajadas, jefe y criaturas
      const dist = this.bfs(entry.x, entry.y, cave.z);
      const reach: number[] = [];
      for (const i of open) if (dist[i] >= 0) reach.push(i);
      const farthest = (ok: (i: number) => boolean) => {
        let best = -1;
        for (const i of reach) if (ok(i) && (best < 0 || dist[i] > dist[best])) best = i;
        return best;
      };
      const roomy = (i: number) => {
        const x = i % this.W;
        const y = (i - x) / this.W;
        return DIRS8.every(([dx, dy]) => this.walkable(x + dx, y + dy, cave.z));
      };

      // ¿Alguna cueva baja desde esta?
      if (CAVES.some((c) => c.from === cave.id)) {
        const d = farthest(roomy);
        if (d < 0) throw new Error(`Cueva ${cave.id}: no hay sitio para la bajada`);
        const x = d % this.W;
        const y = (d - x) / this.W;
        this.setO(x, y, cave.z, O.STAIRS_DOWN);
        downPoints[cave.id] = { x, y, z: cave.z };
      }
      if (cave.boss) {
        const b = farthest((i) => roomy(i) && this.obj[cave.z][i] === O.NONE);
        const x = b % this.W;
        const y = (b - x) / this.W;
        this.spawns.push({ monster: cave.boss, z: cave.z, tiles: [b], x, y, radius: 4, respawn: 15 * 60_000 });
      }
      const candidates = reach.filter((i) => dist[i] >= 6 && this.obj[cave.z][i] === O.NONE);
      for (const [monster, count] of cave.spawns) {
        if (!MONSTERS[monster]) throw new Error(`Criatura desconocida: ${monster}`);
        for (let k = 0; k < count; k++) {
          if (!candidates.length) break;
          const c = candidates[rng.int(0, candidates.length - 1)];
          const x = c % this.W;
          const y = (c - x) / this.W;
          const tiles = candidates.filter((i) => {
            const ix = i % this.W;
            const iy = (i - ix) / this.W;
            return Math.abs(ix - x) <= 3 && Math.abs(iy - y) <= 3;
          });
          this.spawns.push({ monster, z: cave.z, tiles, x, y, radius: 6, respawn: 60_000 });
        }
      }
    });
  }

  /** Coloca una boca de cueva en la superficie cerca de (x, y). */
  private placeSurfaceEntrance(tx: number, ty: number): Pos {
    for (let r = 0; r <= 10; r++) {
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = tx + dx;
          const y = ty + dy;
          const gr = this.g(x, y, 0);
          if (!GROUNDS[gr].walk || gr === G.BRIDGE || gr === G.ROAD || this.isPz(x, y, 0)) continue;
          if (!GROUNDS[this.g(x, y + 1, 0)].walk) continue;
          this.setO(x, y, 0, O.STAIRS_DOWN);
          this.setG(x, y, 0, G.DIRT);
          const ring = this.biome[y * this.W + x] === 3 ? O.MOUNTAIN : O.BOULDER;
          for (const [ox, oy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0]]) {
            const g2 = this.g(x + ox, y + oy, 0);
            if (GROUNDS[g2].walk && g2 !== G.ROAD && g2 !== G.BRIDGE && !this.isPz(x + ox, y + oy, 0)) this.setO(x + ox, y + oy, 0, ring);
          }
          for (const ox of [-1, 0, 1]) if (OBJECTS[this.o(x + ox, y + 1, 0)].block) this.setO(x + ox, y + 1, 0, O.NONE);
          return { x, y, z: 0 };
        }
    }
    throw new Error(`No hay sitio para una cueva cerca de ${tx},${ty}`);
  }

  private caGen(rng: Rng, rect: { x: number; y: number; w: number; h: number }, e: Pos, carveable: (x: number, y: number) => boolean): number[] {
    const W = this.W;
    let open = new Uint8Array(W * this.H);
    const forced = new Uint8Array(W * this.H);
    const cells: number[] = [];
    for (let y = rect.y; y < rect.y + rect.h; y++)
      for (let x = rect.x; x < rect.x + rect.w; x++) if (carveable(x, y)) cells.push(y * W + x);
    for (const i of cells) open[i] = rng.chance(0.56) ? 1 : 0;
    // Túneles desde la entrada para que la cueva se extienda
    const tunnels = 5;
    const len = Math.floor((rect.w * rect.h) / 14);
    for (let t = 0; t < tunnels; t++) {
      let x = e.x;
      let y = e.y;
      let [dx, dy] = rng.pick(DIRS4);
      for (let s = 0; s < len; s++) {
        if (rng.chance(0.25)) [dx, dy] = rng.pick(DIRS4);
        const nx = x + dx;
        const ny = y + dy;
        if (!carveable(nx, ny) || !carveable(nx + 1, ny) || !carveable(nx, ny + 1)) {
          [dx, dy] = rng.pick(DIRS4);
          continue;
        }
        x = nx;
        y = ny;
        for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) if (carveable(x + ox, y + oy)) forced[(y + oy) * W + x + ox] = 1;
      }
    }
    for (const [dx, dy] of [[0, 0], ...DIRS8]) forced[(e.y + dy) * W + e.x + dx] = 1;
    for (let it = 0; it < 5; it++) {
      const next = new Uint8Array(open);
      for (const i of cells) {
        const x = i % W;
        const y = (i - x) / W;
        let walls = 0;
        for (const [dx, dy] of DIRS8) {
          const j = (y + dy) * W + x + dx;
          if (!open[j] && !forced[j]) walls++;
        }
        next[i] = walls >= 5 ? 0 : 1;
      }
      open = next;
    }
    for (let i = 0; i < forced.length; i++) if (forced[i]) open[i] = 1;
    // Solo la parte conectada con la entrada
    return this.component(open, e);
  }

  private roomsGen(rng: Rng, rect: { x: number; y: number; w: number; h: number }, e: Pos, carveable: (x: number, y: number) => boolean, corridor: number): number[] {
    const W = this.W;
    const open = new Uint8Array(W * this.H);
    const rooms: { x: number; y: number; w: number; h: number }[] = [{ x: e.x - 2, y: e.y - 2, w: 5, h: 5 }];
    for (let a = 0; a < 300 && rooms.length < 14; a++) {
      const w = rng.int(5, 10);
      const h = rng.int(4, 8);
      const x = rng.int(rect.x + 1, rect.x + rect.w - w - 1);
      const y = rng.int(rect.y + 1, rect.y + rect.h - h - 1);
      if (rooms.some((r) => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)) continue;
      rooms.push({ x, y, w, h });
    }
    const carve = (x: number, y: number) => {
      if (carveable(x, y)) open[y * W + x] = 1;
    };
    for (const r of rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) carve(x, y);
    const center = (r: (typeof rooms)[number]) => [r.x + (r.w >> 1), r.y + (r.h >> 1)];
    for (let i = 1; i < rooms.length; i++) {
      let best = 0;
      let bd = Infinity;
      const [cx, cy] = center(rooms[i]);
      for (let j = 0; j < i; j++) {
        const [jx, jy] = center(rooms[j]);
        const d = Math.abs(jx - cx) + Math.abs(jy - cy);
        if (d < bd) {
          bd = d;
          best = j;
        }
      }
      const [tx, ty] = center(rooms[best]);
      const horizFirst = rng.chance(0.5);
      const line = (x0: number, y0: number, x1: number, y1: number) => {
        const sx = Math.sign(x1 - x0);
        const sy = Math.sign(y1 - y0);
        let x = x0;
        let y = y0;
        for (;;) {
          for (let k = 0; k < corridor; k++) carve(x + (sy ? k : 0), y + (sx ? k : 0));
          if (x === x1 && y === y1) break;
          x += sx;
          y += sy;
        }
      };
      if (horizFirst) {
        line(cx, cy, tx, cy);
        line(tx, cy, tx, ty);
      } else {
        line(cx, cy, cx, ty);
        line(cx, ty, tx, ty);
      }
    }
    for (const [dx, dy] of [[0, 0], ...DIRS8]) open[(e.y + dy) * W + e.x + dx] = 1;
    return this.component(open, e);
  }

  private component(open: Uint8Array, e: Pos): number[] {
    const W = this.W;
    const seen = new Uint8Array(open.length);
    const out: number[] = [];
    const q = [e.y * W + e.x];
    seen[q[0]] = 1;
    while (q.length) {
      const i = q.pop()!;
      out.push(i);
      const x = i % W;
      const y = (i - x) / W;
      for (const [dx, dy] of DIRS4) {
        const j = (y + dy) * W + x + dx;
        if (!seen[j] && open[j]) {
          seen[j] = 1;
          q.push(j);
        }
      }
    }
    return out;
  }

  private decorateCave(rng: Rng, cave: CaveDef, open: number[], e: Pos) {
    const z = cave.z;
    const W = this.W;
    const S = WORLD_SEED + z * 13;
    const nearEntry = (x: number, y: number) => Math.abs(x - e.x) <= 2 && Math.abs(y - e.y) <= 2;
    // Los objetos que bloquean solo van pegados a una pared de sala (3 vecinos abiertos) y sin otro
    // bloqueo alrededor: así nunca cortan un pasillo, porque se puede rodear en diagonal.
    const wallNear = (x: number, y: number) => {
      let openN = 0;
      for (const [dx, dy] of DIRS4) if (GROUNDS[this.g(x + dx, y + dy, z)].walk) openN++;
      if (openN !== 3) return false;
      for (const [dx, dy] of DIRS8) if (OBJECTS[this.o(x + dx, y + dy, z)].block) return false;
      return true;
    };
    const orig = this.ground[z].slice();
    const solidAround = (x: number, y: number) => DIRS8.every(([dx, dy]) => orig[(y + dy) * W + x + dx] === orig[y * W + x]);
    for (const i of open) {
      const x = i % W;
      const y = (i - x) / W;
      if (nearEntry(x, y)) continue;
      const r = rng.next();
      const n = fbm(x / 6, y / 6, S + cave.id.length);
      const set = (o: number) => {
        if (!OBJECTS[o].block || wallNear(x, y)) this.obj[z][i] = o;
      };
      switch (cave.style) {
        case 'cave':
          if (wallNear(x, y) && r < 0.05) set(O.STALAGMITE);
          else if (r < 0.07) set(O.MUSHROOMS);
          else if (r < 0.085) set(O.BONES);
          else if (r < 0.095) set(O.WEB);
          else if (r < 0.1) set(O.CRYSTAL);
          break;
        case 'crypt':
          if (wallNear(x, y) && r < 0.08) set(O.GRAVE);
          else if (wallNear(x, y) && r < 0.1) set(O.BRAZIER);
          else if (r < 0.14) set(O.BONES);
          else if (r < 0.16) set(O.WEB);
          else if (r < 0.17) set(O.RUBBLE);
          break;
        case 'mine':
          if (wallNear(x, y) && r < 0.04) set(rng.chance(0.5) ? O.CRATE : O.BARREL);
          else if (wallNear(x, y) && r < 0.06) set(O.CRYSTAL);
          else if (wallNear(x, y) && r < 0.07) set(O.BRAZIER);
          else if (r < 0.12) set(O.RUBBLE);
          else if (r < 0.13) set(O.WEB);
          break;
        case 'lava':
          if (n > 0.66 && solidAround(x, y)) this.ground[z][i] = G.LAVA;
          else if (wallNear(x, y) && r < 0.05) set(O.STALAGMITE);
          else if (r < 0.06) set(O.CRYSTAL);
          else if (r < 0.08) set(O.BONES);
          break;
        case 'flooded':
          if (n > 0.64 && solidAround(x, y)) this.ground[z][i] = G.WATER;
          else if (n < 0.4) this.ground[z][i] = G.MUD;
          if (this.ground[z][i] !== G.WATER) {
            if (r < 0.08) set(O.REEDS);
            else if (wallNear(x, y) && r < 0.11) set(O.STALAGMITE);
            else if (r < 0.12) set(O.CRYSTAL);
          }
          break;
      }
    }
  }

  /** Abre paso hasta los sitios importantes que hayan quedado aislados. */
  private ensureConnected() {
    const valco = this.temples['valcorona'];
    const albor = this.temples['albor'];
    const points: Pos[] = [];
    for (const t of TOWNS) if (this.temples[t.id]) points.push(this.temples[t.id]);
    for (const [, dst] of this.links) if (dst.z === 0) points.push(dst);
    for (const [, x, y] of SURFACE_SPAWNS) points.push({ x, y, z: 0 });
    const cost = (x: number, y: number) => {
      const gr = this.g(x, y, 0);
      if (gr === G.SEA || gr === G.VOID || gr === G.LAVA) return Infinity;
      if (this.isPz(x, y, 0) && !this.walkable(x, y, 0)) return Infinity;
      if (this.walkable(x, y, 0)) return 1;
      if (gr === G.WATER) return 6;
      return 3;
    };
    for (let pass = 0; pass < 2; pass++) {
      const dMain = this.bfs(valco.x, valco.y, 0);
      const dIsl = this.bfs(albor.x, albor.y, 0);
      for (const p of points) {
        const island = p.x < 62 && p.y > 100;
        const d = island ? dIsl : dMain;
        if (d[p.y * this.W + p.x] >= 0) continue;
        if (!GROUNDS[this.g(p.x, p.y, 0)].walk) continue; // zona de criaturas en el agua: se avisa luego
        const home = island ? albor : valco;
        const path = this.carvePath(p.x, p.y, home.x, home.y, cost);
        if (!path) {
          this.warnings.push(`No se pudo conectar ${p.x},${p.y}`);
          continue;
        }
        for (const i of path) {
          if (this.pz[0][i]) continue;
          if (this.ground[0][i] === G.WATER) this.ground[0][i] = G.BRIDGE;
          if (OBJECTS[this.obj[0][i]].block) this.obj[0][i] = O.NONE;
        }
      }
    }
  }

  private genSurfaceSpawns() {
    for (const [monster, cx, cy, radius, count] of SURFACE_SPAWNS) {
      if (!MONSTERS[monster]) throw new Error(`Criatura desconocida: ${monster}`);
      let tiles: number[] = [];
      for (let r = radius; r <= radius * 3 && tiles.length < count * 3; r += radius) {
        tiles = [];
        for (let y = cy - r; y <= cy + r; y++)
          for (let x = cx - r; x <= cx + r; x++)
            if (this.walkable(x, y, 0) && !this.isPz(x, y, 0) && !this.isStairs(x, y, 0) && this.g(x, y, 0) !== G.ROAD) tiles.push(y * this.W + x);
      }
      if (!tiles.length) {
        this.warnings.push(`Zona de ${monster} en ${cx},${cy} sin casillas libres`);
        continue;
      }
      for (let k = 0; k < count; k++) this.spawns.push({ monster, z: 0, tiles, x: cx, y: cy, radius: radius + 4, respawn: 45_000 });
    }
  }
}

export function generateWorld(): WorldMap {
  return new WorldMap().generate();
}
