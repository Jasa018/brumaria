// Pixel art generado por código (16x16 "píxeles" lógicos por casilla, dibujados a 2x).
import { G, O } from '../data/tiles';
import type { ItemDef } from '../data/items';
import type { Look } from '../data/monsters';
import type { Style } from '../game/world';
import { tileHash } from '../game/rng';

export const TILE = 32;
const P = 2; // tamaño de un píxel lógico

type Ctx = CanvasRenderingContext2D;

function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

/** Pinta un píxel lógico. */
const px = (c: Ctx, x: number, y: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(x * P, y * P, P, P);
};
const rect = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(x * P, y * P, w * P, h * P);
};
/** Círculo relleno en píxeles lógicos. */
const disc = (c: Ctx, cx: number, cy: number, r: number, col: string) => {
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) px(c, cx + x, cy + y, col);
};

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (f < 0) {
    r *= 1 + f;
    g *= 1 + f;
    b *= 1 + f;
  } else {
    r += (255 - r) * f;
    g += (255 - g) * f;
    b += (255 - b) * f;
  }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

/** Pseudo-aleatorio estable para texturas. */
function prng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

function speckle(c: Ctx, base: string, cols: string[], density: number, seed: number) {
  rect(c, 0, 0, 16, 16, base);
  const r = prng(seed);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (r() < density) px(c, x, y, cols[Math.floor(r() * cols.length)]);
}

// ===================================================================
//                              Suelos
// ===================================================================

const groundCache = new Map<string, HTMLCanvasElement>();

export function groundSprite(g: number, x: number, y: number, z: number, frame: number): HTMLCanvasElement {
  const v = Math.floor(tileHash(x, y, z) * 4);
  const animated = g === G.WATER || g === G.SEA || g === G.LAVA;
  const key = `${g}:${v}:${animated ? frame % 4 : 0}`;
  let cv = groundCache.get(key);
  if (!cv) {
    cv = drawGround(g, v, animated ? frame % 4 : 0);
    groundCache.set(key, cv);
  }
  return cv;
}

function drawGround(g: number, v: number, f: number): HTMLCanvasElement {
  const [cv, c] = canvas(TILE, TILE);
  const seed = g * 97 + v * 13 + 1;
  switch (g) {
    case G.GRASS:
      speckle(c, '#3f8a35', ['#4c9c40', '#367a2d', '#5aad4a'], 0.18, seed);
      if (v === 1) for (const [a, b] of [[3, 4], [11, 9], [6, 12]]) px(c, a, b, '#6cc055');
      break;
    case G.FOREST:
      speckle(c, '#2d6528', ['#26581f', '#357530', '#3c5a22', '#4a6a2a'], 0.25, seed);
      break;
    case G.DIRT:
      speckle(c, '#7a5a34', ['#6b4e2c', '#8a6a42', '#5e4426'], 0.22, seed);
      break;
    case G.ROAD:
      speckle(c, '#a58b5c', ['#97804f', '#b39a6a', '#8a7448'], 0.2, seed);
      for (const [a, b] of [[2, 3], [9, 7], [13, 12], [5, 11]]) px(c, (a + v * 3) % 16, b, '#c4ad80');
      break;
    case G.SAND:
      speckle(c, '#d6c48a', ['#c9b67a', '#e3d39e', '#bfae74'], 0.16, seed);
      break;
    case G.COBBLE: {
      rect(c, 0, 0, 16, 16, '#6f6f74');
      const r = prng(seed);
      for (let by = 0; by < 4; by++)
        for (let bx = 0; bx < 4; bx++) {
          const ox = by % 2 ? 2 : 0;
          const col = ['#8d8d92', '#9a9aa0', '#858589'][Math.floor(r() * 3)];
          rect(c, (bx * 4 + ox) % 16, by * 4, 3, 3, col);
          px(c, (bx * 4 + ox) % 16, by * 4, '#a8a8ae');
        }
      break;
    }
    case G.WOOD:
      rect(c, 0, 0, 16, 16, '#8a5a2b');
      for (let y = 0; y < 16; y += 4) {
        rect(c, 0, y + 3, 16, 1, '#6b4420');
        px(c, (y * 3 + v * 5) % 16, y + 1, '#7a4e24');
        rect(c, (y * 5 + 7) % 16, y, 1, 3, '#6b4420');
      }
      break;
    case G.TILE:
      for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) rect(c, x * 8, y * 8, 8, 8, (x + y) % 2 ? '#a8a090' : '#bdb6a6');
      rect(c, 0, 0, 16, 1, '#c9c2b2');
      break;
    case G.CAVE:
      speckle(c, '#5b4c3e', ['#4e4034', '#665646', '#544637'], 0.25, seed);
      break;
    case G.SWAMP:
      speckle(c, '#4c5e2e', ['#3e4f25', '#56693a', '#3a4a30'], 0.22, seed);
      if (v < 2) {
        rect(c, 4 + v * 4, 6, 5, 3, '#3a4a3a');
        rect(c, 5 + v * 4, 7, 3, 1, '#4a6a5a');
      }
      break;
    case G.SNOW:
      speckle(c, '#e6eef2', ['#d4e0e8', '#ffffff', '#c9d8e2'], 0.15, seed);
      break;
    case G.MUD:
      speckle(c, '#5a4628', ['#4e3c22', '#66512f', '#3f3220'], 0.25, seed);
      if (v === 2) rect(c, 6, 8, 4, 2, '#3f3a30');
      break;
    case G.BRIDGE:
      rect(c, 0, 0, 16, 16, '#9a6a35');
      for (let x = 0; x < 16; x += 4) rect(c, x + 3, 0, 1, 16, '#6e4a22');
      rect(c, 0, 0, 16, 1, '#5a3a1a');
      rect(c, 0, 15, 16, 1, '#5a3a1a');
      break;
    case G.WATER:
    case G.SEA: {
      const deep = g === G.SEA;
      rect(c, 0, 0, 16, 16, deep ? '#1d3b6b' : '#2f5e9e');
      const r = prng(seed);
      for (let i = 0; i < 6; i++) {
        const wx = Math.floor(r() * 16);
        const wy = Math.floor(r() * 16);
        const x = (wx + f) % 16;
        rect(c, x, wy, 3, 1, deep ? '#2c5288' : '#4a7ec0');
        if (r() < 0.4) px(c, (x + 1) % 16, (wy + 15) % 16, deep ? '#3a66a0' : '#7fb0e8');
      }
      break;
    }
    case G.LAVA: {
      rect(c, 0, 0, 16, 16, '#c0390c');
      const r = prng(seed);
      for (let i = 0; i < 10; i++) {
        const x = (Math.floor(r() * 16) + f) % 16;
        const y = Math.floor(r() * 16);
        rect(c, x, y, 2, 1, r() < 0.5 ? '#ff8a20' : '#ffd040');
      }
      break;
    }
    default:
      rect(c, 0, 0, 16, 16, '#000');
  }
  return cv;
}

// ------------- Roca (paredes de cueva), según el estilo de la zona -------------

const ROCK_COLORS: Record<Style, [string, string, string]> = {
  surface: ['#2a2420', '#3a3028', '#4a3e32'],
  cave: ['#2a2420', '#3d332a', '#54473a'],
  crypt: ['#25252c', '#3e3e48', '#5a5a66'],
  mine: ['#2c2218', '#43341f', '#5e4a2e'],
  lava: ['#1c1414', '#2e1e1a', '#4a2a20'],
  flooded: ['#1c2630', '#2a3a48', '#3e5466'],
};

export function rockSprite(style: Style, face: boolean, x: number, y: number): HTMLCanvasElement {
  const v = Math.floor(tileHash(x, y, 9) * 3);
  const key = `rock:${style}:${face ? 1 : 0}:${v}`;
  let cv = groundCache.get(key);
  if (cv) return cv;
  [cv] = canvas(TILE, TILE);
  const c = cv.getContext('2d')!;
  const [dark, mid, light] = ROCK_COLORS[style];
  speckle(c, dark, [mid, shade(dark, -0.3)], 0.2, 77 + v);
  if (face) {
    if (style === 'crypt') {
      rect(c, 0, 6, 16, 10, mid);
      for (let row = 0; row < 3; row++) {
        rect(c, 0, 6 + row * 3 + 2, 16, 1, dark);
        for (let b = 0; b < 4; b++) rect(c, b * 4 + (row % 2) * 2, 6 + row * 3, 1, 2, dark);
      }
      rect(c, 0, 6, 16, 1, light);
    } else {
      rect(c, 0, 7, 16, 9, mid);
      const r = prng(31 + v);
      for (let i = 0; i < 14; i++) px(c, Math.floor(r() * 16), 8 + Math.floor(r() * 8), r() < 0.5 ? light : dark);
      rect(c, 0, 7, 16, 1, light);
      if (style === 'mine' && v === 0) {
        rect(c, 2, 6, 2, 10, '#7a5530');
        rect(c, 12, 6, 2, 10, '#7a5530');
        rect(c, 1, 6, 14, 2, '#8a6338');
      }
      if (style === 'lava' && v === 1) for (let i = 0; i < 5; i++) px(c, 4 + i * 2, 10 + (i % 2), '#ff5a1a');
    }
  }
  groundCache.set(key, cv);
  return cv;
}

// ===================================================================
//                              Objetos
// ===================================================================

const objCache = new Map<string, HTMLCanvasElement>();

/** Altura en casillas del dibujo del objeto (se dibuja hacia arriba desde su casilla). */
export function objectHeight(o: number): number {
  return o === O.TREE || o === O.PINE || o === O.SNOWPINE || o === O.DEADTREE || o === O.MOUNTAIN ? 2 : o === O.WALL || o === O.WOODWALL || o === O.LAMP || o === O.STATUE || o === O.BOOKSHELF ? 1.5 : 1;
}

export function objectSprite(o: number, x: number, y: number, frame: number): HTMLCanvasElement {
  const v = Math.floor(tileHash(x, y, 3) * 3);
  const anim = o === O.BRAZIER || o === O.FOUNTAIN || o === O.FURNACE || o === O.CRYSTAL || o === O.LAMP;
  const key = `${o}:${v}:${anim ? frame % 4 : 0}`;
  let cv = objCache.get(key);
  if (!cv) {
    cv = drawObject(o, v, anim ? frame % 4 : 0);
    objCache.set(key, cv);
  }
  return cv;
}

function drawObject(o: number, v: number, f: number): HTMLCanvasElement {
  const h = objectHeight(o);
  const H = Math.round(16 * h);
  const [cv, c] = canvas(TILE, H * P);
  const base = H - 16; // fila lógica donde empieza la casilla
  const at = (yy: number) => base + yy;
  switch (o) {
    case O.TREE: {
      rect(c, 7, at(9), 3, 7, '#5e3c1c');
      px(c, 7, at(10), '#4a2e14');
      const leaf = ['#2f7a2a', '#2a6e26', '#357f2e'][v];
      disc(c, 8, at(3), 7, shade(leaf, -0.25));
      disc(c, 8, at(2), 6, leaf);
      disc(c, 6, at(0), 3, shade(leaf, 0.15));
      for (const [a, b] of [[4, -1], [10, 2], [7, 5], [12, -2]]) px(c, a, at(b), shade(leaf, 0.3));
      break;
    }
    case O.PINE:
    case O.SNOWPINE: {
      const snow = o === O.SNOWPINE;
      rect(c, 7, at(12), 2, 4, '#5e3c1c');
      const col = snow ? '#2e5a3a' : ['#1f5a2a', '#1c5226', '#22622e'][v];
      for (let i = 0; i < 4; i++) {
        const w = 3 + i * 2;
        const yy = at(-12 + i * 6);
        for (let r = 0; r < 6; r++) {
          const ww = Math.min(w, 1 + r * 2);
          rect(c, 8 - ww / 2, yy + r, ww, 1, r < 2 ? shade(col, 0.15) : col);
          if (snow && r < 2) rect(c, 8 - ww / 2, yy + r, ww, 1, '#e8f0f4');
        }
      }
      break;
    }
    case O.DEADTREE:
      rect(c, 7, at(-2), 2, 18, '#4a3626');
      rect(c, 4, at(1), 4, 1, '#4a3626');
      rect(c, 3, at(-1), 1, 2, '#4a3626');
      rect(c, 9, at(-4), 4, 1, '#4a3626');
      rect(c, 12, at(-6), 1, 2, '#4a3626');
      rect(c, 9, at(4), 3, 1, '#4a3626');
      break;
    case O.MOUNTAIN: {
      const col = ['#6b6158', '#615850', '#736a60'][v];
      for (let r = 0; r < 30; r++) {
        const w = Math.min(16, 2 + r);
        rect(c, 8 - w / 2, at(-14) + r, w, 1, r < 6 ? '#e8eef0' : r % 5 === 0 ? shade(col, -0.15) : col);
      }
      rect(c, 8, at(-8), 6, 20, shade(col, -0.2));
      for (let r = 0; r < 10; r++) px(c, 9 + (r % 3), at(-6) + r * 2, shade(col, -0.35));
      break;
    }
    case O.BUSH:
      disc(c, 8, at(10), 5, '#2a6e26');
      disc(c, 7, at(9), 4, '#36852f');
      px(c, 5, at(8), '#4caf50');
      if (v === 0) {
        px(c, 9, at(9), '#d63c3c');
        px(c, 6, at(11), '#d63c3c');
      }
      break;
    case O.BOULDER:
      disc(c, 8, at(10), 5, '#5e5a55');
      disc(c, 7, at(9), 4, '#7a756e');
      px(c, 5, at(7), '#9a958e');
      break;
    case O.WALL:
    case O.WOODWALL: {
      const wood = o === O.WOODWALL;
      const top = wood ? '#6e4520' : '#7d7d88';
      const face = wood ? '#8a5a2b' : '#5f5f6a';
      rect(c, 0, at(-8), 16, 8, top);
      rect(c, 0, at(-8), 16, 1, shade(top, 0.25));
      rect(c, 0, at(0), 16, 16, face);
      if (wood) for (let x = 0; x < 16; x += 4) rect(c, x, at(0), 1, 16, '#6b4420');
      else
        for (let row = 0; row < 4; row++) {
          rect(c, 0, at(row * 4 + 3), 16, 1, '#4a4a54');
          for (let b = 0; b < 3; b++) rect(c, b * 6 + (row % 2) * 3, at(row * 4), 1, 3, '#4a4a54');
        }
      break;
    }
    case O.DOOR:
      rect(c, 2, 0, 12, 16, '#3a2410');
      rect(c, 3, 1, 10, 15, '#8a5a2b');
      rect(c, 3, 1, 2, 15, '#6b4420');
      px(c, 11, 8, '#d9b44a');
      break;
    case O.STAIRS_DOWN:
      rect(c, 1, 1, 14, 14, '#1a1410');
      for (let i = 0; i < 4; i++) rect(c, 2 + i, 2 + i * 3, 12 - i * 2, 2, shade('#6b5a48', -i * 0.18));
      rect(c, 1, 1, 14, 1, '#ffd23f');
      break;
    case O.STAIRS_UP:
      rect(c, 2, 0, 12, 16, '#3a2c20');
      for (let i = 0; i < 5; i++) rect(c, 2, 14 - i * 3, 12, 2, shade('#9a7a58', i * 0.08));
      rect(c, 2, 0, 1, 16, '#5e4430');
      rect(c, 13, 0, 1, 16, '#5e4430');
      break;
    case O.FENCE:
      rect(c, 0, 7, 16, 1, '#8a6338');
      rect(c, 0, 11, 16, 1, '#8a6338');
      rect(c, 2, 5, 2, 10, '#6e4a22');
      rect(c, 12, 5, 2, 10, '#6e4a22');
      break;
    case O.TABLE:
      rect(c, 1, 5, 14, 6, '#9a6a35');
      rect(c, 1, 5, 14, 1, '#b8854a');
      rect(c, 2, 11, 2, 4, '#5e3c1c');
      rect(c, 12, 11, 2, 4, '#5e3c1c');
      if (v === 1) rect(c, 6, 4, 3, 2, '#efe6d6');
      break;
    case O.CHAIR:
      rect(c, 5, 3, 6, 6, '#7a4e24');
      rect(c, 5, 9, 6, 2, '#9a6a35');
      rect(c, 5, 11, 1, 4, '#5e3c1c');
      rect(c, 10, 11, 1, 4, '#5e3c1c');
      break;
    case O.BED:
      rect(c, 1, 1, 14, 14, '#6b4420');
      rect(c, 2, 2, 12, 4, '#efe6d6');
      rect(c, 2, 6, 12, 8, ['#a83a3a', '#3e5fa8', '#4a8a3a'][v]);
      break;
    case O.COUNTER:
      rect(c, 0, 3, 16, 11, '#7a4e24');
      rect(c, 0, 3, 16, 2, '#b8854a');
      rect(c, 0, 13, 16, 1, '#4a2e14');
      break;
    case O.BARREL:
      disc(c, 8, 9, 6, '#7a4e24');
      rect(c, 2, 6, 12, 1, '#4a4a4a');
      rect(c, 2, 12, 12, 1, '#4a4a4a');
      disc(c, 8, 4, 3, '#9a6a35');
      break;
    case O.CRATE:
      rect(c, 2, 3, 12, 12, '#a8743c');
      rect(c, 2, 3, 12, 1, '#c9965a');
      for (let i = 0; i < 12; i++) px(c, 2 + i, 3 + i, '#7a5028');
      rect(c, 2, 3, 1, 12, '#7a5028');
      rect(c, 13, 3, 1, 12, '#7a5028');
      break;
    case O.ALTAR:
      rect(c, 1, 6, 14, 9, '#d9d0c0');
      rect(c, 1, 6, 14, 2, '#f2ecdf');
      rect(c, 6, 2, 4, 4, '#f2c94c');
      px(c, 7, 1, '#fff6c0');
      break;
    case O.FOUNTAIN:
      disc(c, 8, 9, 7, '#8d8d92');
      disc(c, 8, 9, 5, '#2f5e9e');
      rect(c, 7, 2, 2, 7, '#a8a8ae');
      for (let i = 0; i < 4; i++) px(c, 5 + ((i * 3 + f) % 7), 7 + ((i + f) % 3), '#9fd0ff');
      break;
    case O.GRAVE:
      rect(c, 4, 3, 8, 10, '#77777f');
      rect(c, 5, 2, 6, 1, '#77777f');
      rect(c, 4, 3, 8, 1, '#9a9aa2');
      rect(c, 7, 5, 2, 5, '#55555c');
      rect(c, 6, 6, 4, 1, '#55555c');
      rect(c, 3, 13, 10, 2, '#4a4a3a');
      break;
    case O.REEDS:
      for (let i = 0; i < 5; i++) {
        const x = 2 + i * 3;
        rect(c, x, 4 + (i % 2) * 2, 1, 10, '#6a8a3a');
        rect(c, x, 3 + (i % 2) * 2, 1, 2, '#7a5a34');
      }
      break;
    case O.BOOKSHELF: {
      rect(c, 1, at(-8), 14, 24, '#5e3c1c');
      const books = ['#a83a3a', '#3e5fa8', '#4a8a3a', '#d9a441', '#7a5cff'];
      for (let s = 0; s < 3; s++) for (let b = 0; b < 6; b++) rect(c, 2 + b * 2, at(-7) + s * 7, 2, 5, books[(b + s + v) % 5]);
      break;
    }
    case O.ANVIL:
      rect(c, 3, 6, 11, 3, '#4a4a54');
      rect(c, 2, 6, 3, 2, '#4a4a54');
      rect(c, 6, 9, 4, 3, '#3a3a44');
      rect(c, 4, 12, 8, 2, '#3a3a44');
      rect(c, 3, 6, 11, 1, '#7a7a88');
      break;
    case O.FURNACE:
      rect(c, 1, 2, 14, 13, '#5f5f6a');
      rect(c, 4, 7, 8, 6, '#1a1410');
      rect(c, 5, 9 + (f % 2), 6, 4 - (f % 2), f % 2 ? '#ff9a30' : '#ffd040');
      break;
    case O.LAMP:
      rect(c, 7, at(-2), 2, 18, '#3a3a3a');
      rect(c, 5, at(-7), 6, 6, '#2a2a2a');
      rect(c, 6, at(-6), 4, 4, f % 2 ? '#ffe070' : '#ffd040');
      break;
    case O.FLOWERS: {
      const cols = [['#e05555', '#f2f2f2'], ['#f2d14c', '#c07aff'], ['#ffffff', '#ff9ad0']][v];
      for (const [a, b, k] of [[3, 5, 0], [9, 3, 1], [12, 9, 0], [5, 11, 1], [10, 13, 0]] as const) {
        px(c, a, b + 1, '#2f7a2a');
        px(c, a, b, cols[k]);
      }
      break;
    }
    case O.STALAGMITE:
      for (let r = 0; r < 13; r++) rect(c, 8 - Math.ceil(r / 3), 2 + r, Math.ceil(r / 3) * 2 + 1, 1, r < 3 ? '#7a6a58' : '#5e5040');
      break;
    case O.CRYSTAL: {
      const col = f % 2 ? '#9fe8ff' : '#7fd6ff';
      for (let r = 0; r < 11; r++) rect(c, 6 - Math.floor(r / 4), 3 + r, 3 + Math.floor(r / 4), 1, col);
      for (let r = 0; r < 7; r++) rect(c, 10, 7 + r, 2 + Math.floor(r / 3), 1, '#4ab0e0');
      px(c, 7, 4, '#ffffff');
      break;
    }
    case O.BONES:
      rect(c, 3, 10, 7, 1, '#e8e0c8');
      px(c, 2, 9, '#e8e0c8');
      px(c, 2, 11, '#e8e0c8');
      disc(c, 11, 9, 2, '#e8e0c8');
      px(c, 10, 9, '#3a3020');
      px(c, 12, 9, '#3a3020');
      break;
    case O.SIGN:
      rect(c, 7, 8, 2, 8, '#5e3c1c');
      rect(c, 2, 2, 12, 7, '#9a6a35');
      rect(c, 4, 4, 8, 1, '#5e3c1c');
      rect(c, 4, 6, 6, 1, '#5e3c1c');
      break;
    case O.WELL:
      disc(c, 8, 10, 6, '#7d7d88');
      disc(c, 8, 10, 4, '#1d3b6b');
      rect(c, 2, 1, 1, 9, '#5e3c1c');
      rect(c, 13, 1, 1, 9, '#5e3c1c');
      rect(c, 1, 1, 14, 2, '#7a4e24');
      break;
    case O.CACTUS:
      rect(c, 7, 2, 3, 13, '#3a8a3a');
      rect(c, 3, 6, 2, 5, '#3a8a3a');
      rect(c, 3, 10, 4, 2, '#3a8a3a');
      break;
    case O.BRAZIER: {
      rect(c, 4, 9, 8, 3, '#4a4a54');
      rect(c, 7, 12, 2, 3, '#3a3a44');
      const fl = ['#ff9a30', '#ffd040', '#ff5a1a'];
      for (let i = 0; i < 4; i++) rect(c, 5 + i * 2, 4 + ((i + f) % 3), 2, 5 - ((i + f) % 3), fl[(i + f) % 3]);
      break;
    }
    case O.STATUE:
      rect(c, 3, at(10), 10, 6, '#8d8d92');
      rect(c, 5, at(-2), 6, 12, '#b0b0b8');
      disc(c, 8, at(-5), 3, '#c0c0c8');
      rect(c, 3, at(1), 2, 6, '#b0b0b8');
      rect(c, 11, at(1), 2, 6, '#b0b0b8');
      break;
    case O.WEB:
      c.strokeStyle = 'rgba(240,240,240,0.7)';
      c.lineWidth = 1;
      for (let a = 0; a < 8; a++) {
        c.beginPath();
        c.moveTo(16, 16);
        c.lineTo(16 + Math.cos((a * Math.PI) / 4) * 16, 16 + Math.sin((a * Math.PI) / 4) * 16);
        c.stroke();
      }
      for (const r of [5, 10, 15]) {
        c.beginPath();
        c.arc(16, 16, r, 0, Math.PI * 2);
        c.stroke();
      }
      break;
    case O.MUSHROOMS:
      for (const [a, b] of [[4, 9], [10, 6], [11, 12]]) {
        rect(c, a, b + 1, 1, 2, '#efe6d6');
        rect(c, a - 1, b, 3, 1, v === 1 ? '#c0392b' : '#c9a27a');
      }
      break;
    case O.DOCK_POST:
      disc(c, 8, 8, 4, '#5e3c1c');
      disc(c, 8, 7, 3, '#7a4e24');
      break;
    case O.RUBBLE:
      for (const [a, b] of [[3, 10], [8, 12], [11, 8], [6, 7]]) rect(c, a, b, 2 + (a % 2), 2, '#6f6a64');
      break;
  }
  return cv;
}

// ===================================================================
//                              Criaturas
// ===================================================================

const creatureCache = new Map<string, HTMLCanvasElement>();

export function creatureSprite(look: Look, dir: number, frame: number): HTMLCanvasElement {
  const key = `${JSON.stringify(look)}:${dir}:${frame}`;
  let cv = creatureCache.get(key);
  if (!cv) {
    cv = drawCreature(look, dir, frame);
    creatureCache.set(key, cv);
  }
  return cv;
}

function drawCreature(L: Look, dir: number, f: number): HTMLCanvasElement {
  const [cv, c] = canvas(TILE, TILE);
  const flip = dir === 1;
  if (flip) {
    c.translate(TILE, 0);
    c.scale(-1, 1);
  }
  const side = dir === 1 || dir === 3;
  // sombra
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.fillRect(8, 28, 16, 3);
  switch (L.body) {
    case 'humanoid':
      humanoid(c, L, dir, f);
      break;
    case 'quad': {
      const b = f ? 1 : 0;
      rect(c, 3, 7 + b, 9, 5, L.c1);
      rect(c, 3, 11 + b, 9, 1, L.c2);
      rect(c, 11, 5 + b, 4, 4, L.c1);
      px(c, 13, 6 + b, '#101010');
      px(c, 15, 7 + b, shade(L.c1, -0.4));
      px(c, 11, 4 + b, shade(L.c1, -0.2));
      rect(c, 1, 7 + b, 2, 1, L.c1);
      const legs = f ? [[4, 12], [6, 13], [9, 12], [11, 13]] : [[4, 13], [6, 12], [9, 13], [11, 12]];
      for (const [x, y] of legs) rect(c, x, y, 1, 15 - y, shade(L.c1, -0.25));
      break;
    }
    case 'slime': {
      const s = f ? 1 : 0;
      for (let r = 0; r < 9 - s; r++) {
        const w = Math.min(12, 4 + r * 2);
        rect(c, 8 - w / 2, 6 + s + r, w, 1, r < 2 ? L.c2 : L.c1);
      }
      px(c, 6, 9, '#101010');
      px(c, 10, 9, '#101010');
      px(c, 5, 8 + s, '#ffffff');
      break;
    }
    case 'spider': {
      disc(c, 8, 10, 3, L.c1);
      disc(c, 8, 6, 2, L.c1);
      px(c, 7, 5, L.c2);
      px(c, 9, 5, L.c2);
      for (let i = 0; i < 4; i++) {
        const y = 7 + i * 2;
        const k = (i + f) % 2;
        rect(c, 2, y + k, 4, 1, shade(L.c1, -0.2));
        rect(c, 10, y + 1 - k, 4, 1, shade(L.c1, -0.2));
        px(c, 1, y + 1 + k, shade(L.c1, -0.2));
        px(c, 14, y + 2 - k, shade(L.c1, -0.2));
      }
      px(c, 8, 11, L.c2);
      break;
    }
    case 'bat': {
      disc(c, 8, 7, 2, L.c1);
      const up = f === 0;
      for (let i = 0; i < 5; i++) {
        rect(c, 2 + i, up ? 3 + i : 8 - i / 2, 1, 3, L.c1);
        rect(c, 13 - i, up ? 3 + i : 8 - i / 2, 1, 3, L.c1);
      }
      px(c, 7, 6, L.c2);
      px(c, 9, 6, L.c2);
      break;
    }
    case 'snake': {
      const o = f ? 1 : 0;
      for (let i = 0; i < 12; i++) {
        const y = 11 + Math.round(Math.sin((i + o * 2) * 0.9) * 1.5);
        rect(c, 2 + i, y, 1, 2, i % 3 === 0 ? L.c2 : L.c1);
      }
      rect(c, 13, 8, 3, 3, L.c1);
      px(c, 15, 9, '#101010');
      px(c, 16 - 0.5, 10, '#e04040');
      break;
    }
    case 'toad': {
      disc(c, 8, 10, 5, L.c1);
      rect(c, 3, 12, 10, 2, L.c2);
      disc(c, 5, 6, 2, L.c1);
      disc(c, 11, 6, 2, L.c1);
      px(c, 5, 6, '#101010');
      px(c, 11, 6, '#101010');
      if (f) rect(c, 6, 9, 4, 1, '#c95a5a');
      break;
    }
    case 'golem': {
      const b = f ? 1 : 0;
      rect(c, 3, 4 + b, 10, 8, L.c1);
      rect(c, 5, 1 + b, 6, 4, shade(L.c1, 0.1));
      rect(c, 1, 5 + b, 2, 6, shade(L.c1, -0.15));
      rect(c, 13, 5 + b, 2, 6, shade(L.c1, -0.15));
      rect(c, 4, 12, 3, 3, shade(L.c1, -0.2));
      rect(c, 9, 12, 3, 3, shade(L.c1, -0.2));
      if (!side || dir === 3) {
        px(c, 6, 3 + b, L.c2);
        px(c, 9, 3 + b, L.c2);
      }
      for (const [x, y] of [[5, 7], [10, 9], [7, 10]]) px(c, x, y + b, shade(L.c1, -0.3));
      px(c, 8, 8 + b, L.c2);
      break;
    }
    case 'ghost': {
      c.globalAlpha = 0.75;
      const b = f ? 1 : 0;
      disc(c, 8, 6 + b, 4, L.c1);
      rect(c, 4, 6 + b, 9, 7, L.c1);
      for (let i = 0; i < 5; i++) px(c, 4 + i * 2, 13 + b + ((i + f) % 2), L.c1);
      px(c, 6, 6 + b, '#101018');
      px(c, 10, 6 + b, '#101018');
      rect(c, 7, 9 + b, 3, 1, L.c2);
      c.globalAlpha = 1;
      break;
    }
    case 'bird': {
      rect(c, 6, 5, 4, 6, L.c1);
      disc(c, 8, 3, 2, L.c2);
      px(c, 8, 3, '#101010');
      const up = f === 0;
      for (let i = 0; i < 5; i++) {
        rect(c, 1 + i, up ? 2 + i : 7, 1, 3, L.c3 ?? L.c1);
        rect(c, 14 - i, up ? 2 + i : 7, 1, 3, L.c3 ?? L.c1);
      }
      rect(c, 6, 11, 1, 3, L.c3 ?? '#5a3a1a');
      rect(c, 9, 11, 1, 3, L.c3 ?? '#5a3a1a');
      break;
    }
    case 'dragon': {
      const b = f ? 1 : 0;
      // cola
      for (let i = 0; i < 5; i++) px(c, 1 + i, 11 - Math.floor(i / 2) + b, L.c1);
      rect(c, 4, 7 + b, 8, 6, L.c1);
      rect(c, 5, 11 + b, 6, 2, L.c2);
      // alas
      for (let i = 0; i < 5; i++) rect(c, 5 + i, (f ? 2 : 4) - Math.floor(i / 2) + i, 1, 4 - Math.floor(i / 2), shade(L.c1, -0.25));
      // cuello y cabeza
      rect(c, 11, 4 + b, 2, 4, L.c1);
      rect(c, 12, 2 + b, 4, 3, L.c1);
      px(c, 14, 3 + b, '#ffd040');
      px(c, 12, 1 + b, L.c2);
      // patas
      rect(c, 5, 13, 2, 2, shade(L.c1, -0.3));
      rect(c, 9, 13, 2, 2, shade(L.c1, -0.3));
      break;
    }
  }
  return cv;
}

function humanoid(c: Ctx, L: Look, dir: number, f: number) {
  const skin = L.skin ?? '#e0b089';
  const hair = L.hair ?? '#3a2a1a';
  const side = dir === 1 || dir === 3;
  const back = dir === 2;
  // piernas
  const lA = f === 1 ? 1 : 0;
  const lB = f === 2 ? 1 : 0;
  if (side) {
    rect(c, 6 + lA, 12, 2, 3 - lB, L.c2);
    rect(c, 8 - lB, 12, 2, 3 - lA, shade(L.c2, -0.2));
    rect(c, 6 + lA, 15 - lB, 2, 1, '#2a1a10');
  } else {
    rect(c, 5, 12, 2, 3 - lA, L.c2);
    rect(c, 9, 12, 2, 3 - lB, L.c2);
    rect(c, 5, 15 - lA, 2, 1, '#2a1a10');
    rect(c, 9, 15 - lB, 2, 1, '#2a1a10');
  }
  // cuerpo
  rect(c, 4, 7, 8, 5, L.c1);
  rect(c, 4, 11, 8, 1, shade(L.c1, -0.25));
  if (!side && !back) rect(c, 7, 7, 2, 4, shade(L.c1, 0.15));
  // brazos
  if (side) rect(c, 7, 8, 2, 4, shade(L.c1, -0.15));
  else {
    rect(c, 3, 7, 1, 4, shade(L.c1, -0.15));
    rect(c, 12, 7, 1, 4, shade(L.c1, -0.15));
    px(c, 3, 11, skin);
    px(c, 12, 11, skin);
  }
  // cabeza
  rect(c, 5, 2, 6, 5, skin);
  if (L.helmet) {
    rect(c, 4, 1, 8, 3, '#9aa0a6');
    rect(c, 4, 1, 8, 1, '#cfd6dc');
  } else if (L.hood) {
    rect(c, 4, 1, 8, 3, L.c1);
    rect(c, 4, 3, 1, 4, L.c1);
    rect(c, 11, 3, 1, 4, L.c1);
    if (back) rect(c, 5, 2, 6, 5, L.c1);
  } else {
    rect(c, 5, 1, 6, 2, hair);
    if (back) rect(c, 5, 1, 6, 5, hair);
    else if (side) rect(c, 5, 1, 3, 4, hair);
  }
  if (!back) {
    if (side) px(c, 9, 4, '#1a1010');
    else {
      px(c, 6, 4, '#1a1010');
      px(c, 9, 4, '#1a1010');
    }
  }
  // arma
  const w = L.weapon ?? 'none';
  const hx = side ? 9 : 12;
  if (w === 'sword') {
    rect(c, hx, 4, 1, 7, '#d7dde2');
    rect(c, hx - 1, 10, 3, 1, '#7a5530');
  } else if (w === 'axe') {
    rect(c, hx, 4, 1, 8, '#6b4a2a');
    rect(c, hx + 1, 4, 2, 3, '#b9bec3');
  } else if (w === 'club') {
    rect(c, hx, 5, 1, 7, '#6b4a2a');
    rect(c, hx - 1, 3, 3, 3, '#5a3a1a');
  } else if (w === 'staff') {
    rect(c, hx, 1, 1, 13, '#6b4a2a');
    px(c, hx, 0, L.c2);
    px(c, hx, 1, L.c2);
  } else if (w === 'bow') {
    rect(c, hx + 1, 4, 1, 8, '#a8743c');
    px(c, hx, 3, '#a8743c');
    px(c, hx, 12, '#a8743c');
    rect(c, hx, 4, 1, 8, 'rgba(255,255,255,0.4)');
  }
}

/** Restos de una criatura (cadáver). */
export function corpseSprite(look: Look): HTMLCanvasElement {
  const key = `corpse:${look.body}:${look.c1}`;
  let cv = creatureCache.get(key);
  if (cv) return cv;
  [cv] = canvas(TILE, TILE);
  const c = cv.getContext('2d')!;
  if (look.body === 'humanoid' || look.body === 'ghost') {
    rect(c, 3, 10, 10, 3, look.c1);
    rect(c, 11, 9, 3, 3, look.skin ?? '#e0b089');
    rect(c, 3, 12, 4, 2, look.c2);
  } else if (look.body === 'golem') {
    for (const [a, b] of [[3, 10], [8, 11], [11, 8], [6, 8]]) rect(c, a, b, 3, 2, look.c1);
  } else if (look.body === 'slime') {
    rect(c, 3, 11, 10, 2, look.c1);
    rect(c, 5, 10, 5, 1, look.c2);
  } else {
    rect(c, 3, 9, 9, 3, look.c1);
    rect(c, 3, 12, 9, 1, look.c2);
    rect(c, 11, 8, 3, 3, look.c1);
    for (const x of [4, 7, 10]) rect(c, x, 7, 1, 2, shade(look.c1, -0.3));
  }
  rect(c, 2, 13, 12, 2, 'rgba(120,10,10,0.55)');
  creatureCache.set(key, cv);
  return cv;
}

// ===================================================================
//                              Iconos de objetos
// ===================================================================

const iconCache = new Map<string, HTMLCanvasElement>();

export function itemIcon(d: ItemDef): HTMLCanvasElement {
  let cv = iconCache.get(d.id);
  if (cv) return cv;
  [cv] = canvas(TILE, TILE);
  const c = cv.getContext('2d')!;
  const a = d.c1;
  const b = d.c2 ?? shade(d.c1, -0.35);
  const hi = shade(a, 0.35);
  switch (d.icon) {
    case 'sword':
      for (let i = 0; i < 9; i++) rect(c, 4 + i, 11 - i, 2, 1, i === 8 ? hi : a);
      rect(c, 2, 10, 5, 1, b);
      rect(c, 4, 12, 1, 3, b);
      rect(c, 3, 11, 1, 1, b);
      break;
    case 'axe':
      for (let i = 0; i < 10; i++) px(c, 3 + i, 13 - i, b);
      rect(c, 9, 2, 5, 5, a);
      px(c, 13, 2, hi);
      break;
    case 'club':
      for (let i = 0; i < 8; i++) px(c, 3 + i, 13 - i, b);
      disc(c, 11, 4, 3, a);
      px(c, 10, 3, hi);
      break;
    case 'bow':
      for (let i = 0; i < 12; i++) px(c, 4 + Math.round(Math.sin((i / 11) * Math.PI) * 4), 2 + i, a);
      rect(c, 4, 2, 1, 12, 'rgba(240,240,240,0.8)');
      if (d.c2) px(c, 8, 8, d.c2);
      break;
    case 'wand':
    case 'rod':
      for (let i = 0; i < 10; i++) px(c, 3 + i, 13 - i, d.icon === 'rod' ? '#6b4a2a' : '#d9d0c0');
      disc(c, 12, 4, 2, a);
      px(c, 12, 3, b);
      break;
    case 'arrow':
      for (let k = 0; k < 3; k++) {
        for (let i = 0; i < 9; i++) px(c, 2 + i + k * 2, 12 - i + k, '#c9b48a');
        px(c, 11 + k * 2, 3 + k, a);
        px(c, 2 + k * 2, 12 + k, '#f2f2f2');
      }
      break;
    case 'armor':
      rect(c, 3, 3, 10, 11, a);
      rect(c, 1, 3, 2, 5, a);
      rect(c, 13, 3, 2, 5, a);
      rect(c, 6, 3, 4, 2, '#00000000');
      c.clearRect(6 * P, 3 * P, 4 * P, 2 * P);
      rect(c, 3, 8, 10, 1, b);
      rect(c, 4, 4, 1, 9, hi);
      break;
    case 'helmet':
      rect(c, 3, 5, 10, 6, a);
      rect(c, 4, 3, 8, 2, a);
      rect(c, 3, 11, 10, 2, b);
      rect(c, 5, 4, 2, 1, hi);
      break;
    case 'legs':
      rect(c, 4, 2, 8, 4, a);
      rect(c, 4, 6, 3, 8, a);
      rect(c, 9, 6, 3, 8, a);
      rect(c, 4, 2, 8, 1, b);
      break;
    case 'boots':
      rect(c, 3, 3, 4, 9, a);
      rect(c, 3, 11, 7, 3, a);
      rect(c, 9, 4, 4, 8, shade(a, -0.15));
      rect(c, 3, 13, 7, 1, b);
      break;
    case 'shield':
      rect(c, 3, 2, 10, 8, a);
      for (let r = 0; r < 4; r++) rect(c, 4 + r, 10 + r, 8 - r * 2, 1, a);
      rect(c, 7, 3, 2, 9, b);
      rect(c, 4, 5, 8, 2, b);
      rect(c, 4, 3, 1, 5, hi);
      break;
    case 'amulet':
      for (let i = 0; i < 7; i++) {
        px(c, 4 + i, 2 + Math.round(Math.sin((i / 6) * Math.PI) * 5), '#d9c48a');
      }
      disc(c, 8, 10, 3, a);
      px(c, 7, 9, d.c2 ?? hi);
      break;
    case 'ring':
      disc(c, 8, 9, 4, '#d9b44a');
      disc(c, 8, 9, 2, '#00000000');
      c.clearRect(7 * P, 8 * P, 3 * P, 3 * P);
      disc(c, 8, 4, 2, a);
      break;
    case 'meat':
      disc(c, 9, 7, 4, a);
      rect(c, 3, 10, 4, 2, '#efe6d6');
      px(c, 2, 9, '#efe6d6');
      px(c, 2, 12, '#efe6d6');
      px(c, 8, 6, hi);
      break;
    case 'bread':
      for (let r = 0; r < 6; r++) rect(c, 3 + (r < 2 ? 2 - r : 0), 5 + r, 10 - (r < 2 ? (2 - r) * 2 : 0), 1, r < 2 ? hi : a);
      for (const x of [5, 8, 11]) px(c, x, 6, b);
      break;
    case 'cheese':
      for (let r = 0; r < 8; r++) rect(c, 3, 5 + r, 2 + r, 1, a);
      rect(c, 3, 12, 10, 2, a);
      px(c, 5, 10, b);
      px(c, 8, 12, b);
      break;
    case 'fish':
      disc(c, 7, 8, 3, a);
      rect(c, 4, 7, 8, 3, a);
      rect(c, 12, 6, 2, 5, b);
      px(c, 5, 7, '#101010');
      break;
    case 'apple':
      disc(c, 8, 9, 4, a);
      rect(c, 8, 3, 1, 3, '#6b4a2a');
      px(c, 9, 3, '#4caf50');
      px(c, 6, 7, hi);
      break;
    case 'mushroom':
      rect(c, 7, 9, 3, 5, a);
      for (let r = 0; r < 4; r++) rect(c, 4 + (3 - r), 4 + r, 2 + r * 2 + 3, 1, b);
      break;
    case 'potion':
      rect(c, 7, 2, 2, 3, '#d9d0c0');
      disc(c, 8, 10, 4, a);
      rect(c, 6, 5, 4, 2, '#cfd6dc');
      px(c, 6, 8, hi);
      if (d.c2) rect(c, 7, 1, 2, 1, d.c2);
      break;
    case 'coin':
      disc(c, 7, 9, 3, b);
      disc(c, 9, 7, 3, a);
      px(c, 8, 6, hi);
      break;
    case 'bone':
      for (let i = 0; i < 9; i++) px(c, 4 + i, 11 - i, a);
      disc(c, 3, 12, 1, a);
      disc(c, 13, 2, 1, a);
      break;
    case 'fang':
    case 'horn':
    case 'claw':
      for (let r = 0; r < 10; r++) rect(c, 6 + Math.floor(r / 4), 3 + r, 4 - Math.floor(r / 3), 1, a);
      if (d.icon === 'claw') for (let r = 0; r < 7; r++) rect(c, 11, 5 + r, 1, 1, a);
      break;
    case 'pelt':
      rect(c, 3, 4, 10, 8, a);
      rect(c, 2, 3, 2, 2, a);
      rect(c, 12, 3, 2, 2, a);
      rect(c, 2, 11, 2, 2, a);
      rect(c, 12, 11, 2, 2, a);
      for (let i = 0; i < 6; i++) px(c, 4 + i * 2, 6 + (i % 2) * 3, shade(a, -0.25));
      break;
    case 'ore':
      disc(c, 8, 9, 5, a);
      for (const [x, y] of [[6, 7], [10, 9], [7, 11]]) px(c, x, y, b);
      break;
    case 'eye':
      disc(c, 8, 8, 4, a);
      disc(c, 8, 8, 2, '#101010');
      px(c, 7, 7, '#ffffff');
      break;
    case 'scale':
      for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) disc(c, 5 + k * 3 + (r % 2), 5 + r * 3, 1, r % 2 ? shade(a, -0.2) : a);
      break;
    case 'tail':
      for (let i = 0; i < 12; i++) px(c, 2 + i, 8 + Math.round(Math.sin(i * 0.7) * 2), a);
      break;
    case 'skull':
      disc(c, 8, 7, 4, a);
      rect(c, 6, 10, 5, 3, a);
      px(c, 6, 7, '#101010');
      px(c, 10, 7, '#101010');
      px(c, 8, 9, '#101010');
      break;
    case 'key':
      disc(c, 5, 5, 2, a);
      for (let i = 0; i < 8; i++) px(c, 6 + i, 6 + i, a);
      px(c, 11, 13, a);
      px(c, 13, 11, a);
      break;
    case 'torch':
      for (let i = 0; i < 9; i++) px(c, 5 + i * 0.5, 14 - i, b);
      disc(c, 9, 4, 2, a);
      px(c, 9, 2, '#ffe070');
      break;
    case 'gem':
      for (let r = 0; r < 4; r++) rect(c, 7 - r, 4 + r, 2 + r * 2, 1, hi);
      for (let r = 0; r < 5; r++) rect(c, 4 + r, 8 + r, 8 - r * 2, 1, a);
      break;
    case 'leaf':
      for (let r = 0; r < 9; r++) rect(c, 8 - Math.min(r, 8 - r) / 2, 3 + r, Math.min(r, 8 - r) + 1, 1, a);
      break;
    case 'feather':
      for (let i = 0; i < 11; i++) {
        px(c, 3 + i, 13 - i, '#efe6d6');
        rect(c, 4 + i, 11 - i, 2, 1, a);
      }
      break;
    case 'web':
      c.strokeStyle = a;
      c.lineWidth = 1;
      for (const r of [4, 8, 12]) {
        c.beginPath();
        c.arc(16, 16, r, 0, Math.PI * 2);
        c.stroke();
      }
      c.beginPath();
      c.moveTo(4, 16);
      c.lineTo(28, 16);
      c.moveTo(16, 4);
      c.lineTo(16, 28);
      c.stroke();
      break;
    case 'scroll':
      rect(c, 3, 4, 10, 9, a);
      rect(c, 2, 3, 12, 2, shade(a, -0.15));
      rect(c, 2, 12, 12, 2, shade(a, -0.15));
      rect(c, 5, 7, 6, 1, b);
      rect(c, 5, 9, 4, 1, b);
      break;
    case 'cloth':
      rect(c, 3, 5, 10, 8, a);
      for (let i = 0; i < 4; i++) px(c, 4 + i * 2, 13, a);
      rect(c, 3, 8, 10, 1, shade(a, -0.2));
      break;
    case 'heart':
      disc(c, 6, 7, 3, a);
      disc(c, 10, 7, 3, a);
      for (let r = 0; r < 5; r++) rect(c, 4 + r, 9 + r, 9 - r * 2, 1, a);
      px(c, 5, 6, '#ffe070');
      break;
  }
  iconCache.set(d.id, cv);
  return cv;
}
