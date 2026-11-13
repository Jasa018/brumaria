// Arte a resolución completa (32 x 32 por casilla) con perspectiva oblicua:
// la altura de muros, montañas y árboles se proyecta hacia arriba a la izquierda.
import { G } from '../data/tiles';
import type { Look } from '../data/monsters';
import type { Style } from '../game/world';
import { tileHash, valueNoise } from '../game/rng';

type Ctx = CanvasRenderingContext2D;

export function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

export function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
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
  const h = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function prng(seed: number) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

const R = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};
const P1 = (c: Ctx, x: number, y: number, col: string) => R(c, x, y, 1, 1, col);
/** Elipse rellena, píxel a píxel (sin suavizado). */
function E(c: Ctx, cx: number, cy: number, rx: number, ry: number, col: string) {
  c.fillStyle = col;
  for (let y = Math.floor(-ry); y <= Math.ceil(ry); y++) {
    const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.01))) + 0.35);
    if (w <= 0 && Math.abs(y) > ry - 0.5) continue;
    c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}
function poly(c: Ctx, pts: [number, number][], col: string) {
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) c.lineTo(x, y);
  c.closePath();
  c.fill();
}

/**
 * Remate de un sprite: contorno oscuro de 1 píxel y luz desde arriba a la izquierda
 * (bordes superiores e izquierdos más claros, inferiores y derechos más oscuros).
 */
export function finish(src: HTMLCanvasElement, outline = true): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const d = src.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, w, h).data;
  const a = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[(y * w + x) * 4 + 3]);
  const out = new Uint8ClampedArray(d);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] >= 200) {
        const tl = a(x - 1, y) < 200 || a(x, y - 1) < 200;
        const br = a(x + 1, y) < 200 || a(x, y + 1) < 200;
        const f = tl && !br ? 0.2 : br && !tl ? -0.25 : 0;
        if (f > 0) for (let k = 0; k < 3; k++) out[i + k] = d[i + k] + (255 - d[i + k]) * f;
        else if (f < 0) for (let k = 0; k < 3; k++) out[i + k] = d[i + k] * (1 + f);
      } else if (outline && d[i + 3] < 60) {
        if (a(x - 1, y) >= 200 || a(x + 1, y) >= 200 || a(x, y - 1) >= 200 || a(x, y + 1) >= 200) {
          out[i] = 14;
          out[i + 1] = 10;
          out[i + 2] = 8;
          out[i + 3] = 235;
        }
      }
    }
  const [cv, c] = canvas(w, h);
  c.putImageData(new ImageData(out, w, h), 0, 0);
  return cv;
}

// =====================================================================
//                               Suelos
// =====================================================================

/** Textura de ruido por píxel con una paleta ordenada de oscuro a claro. */
function tex(c: Ctx, pal: string[], seed: number, scale: number, jitter = 0.35) {
  const r = prng(seed);
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const n = valueNoise(x / scale + seed * 0.37, y / scale, seed) * (1 - jitter) + r() * jitter;
      c.fillStyle = pal[Math.min(pal.length - 1, Math.floor(n * pal.length))];
      c.fillRect(x, y, 1, 1);
    }
}

function pebbles(c: Ctx, n: number, seed: number, cols: [string, string]) {
  const r = prng(seed);
  for (let i = 0; i < n; i++) {
    const x = Math.floor(r() * 31);
    const y = Math.floor(r() * 31);
    R(c, x, y, 2, 1, cols[0]);
    P1(c, x, y + 1, cols[1]);
    P1(c, x + 1, y + 1, cols[1]);
  }
}

function blades(c: Ctx, n: number, seed: number, light: string, dark: string) {
  const r = prng(seed);
  for (let i = 0; i < n; i++) {
    const x = Math.floor(r() * 32);
    const y = Math.floor(r() * 31);
    P1(c, x, y, light);
    P1(c, x, y + 1, dark);
  }
}

function puddle(c: Ctx, seed: number, col: string, hi: string) {
  const r = prng(seed);
  const x = 8 + r() * 14;
  const y = 8 + r() * 14;
  E(c, x, y, 5 + r() * 3, 2.5 + r() * 1.5, col);
  R(c, x - 2, y - 1, 3, 1, hi);
}

export function drawGround(g: number, v: number, f: number): HTMLCanvasElement {
  const [cv, c] = canvas(32, 32);
  const seed = g * 131 + v * 17 + 3;
  const r = prng(seed + 1);
  switch (g) {
    case G.GRASS:
      tex(c, ['#2a6321', '#327027', '#3a7d2c', '#438a32', '#4f9739'], seed, 4);
      blades(c, 16, seed, '#62ad48', '#245a1c');
      if (v === 3) for (let i = 0; i < 3; i++) P1(c, 4 + r() * 24, 4 + r() * 24, r() < 0.5 ? '#e8e070' : '#f0f0f0');
      break;
    case G.FOREST:
      tex(c, ['#1d4818', '#24551d', '#2b6223', '#336e29'], seed, 4);
      blades(c, 10, seed, '#4c8a36', '#1a4014');
      for (let i = 0; i < 9; i++) P1(c, r() * 32, r() * 32, r() < 0.5 ? '#6b5a2a' : '#4e3f1e');
      break;
    case G.DIRT:
      tex(c, ['#573e23', '#63482a', '#705232', '#7b5c39'], seed, 3);
      pebbles(c, 4, seed, ['#958676', '#3e2c18']);
      break;
    case G.ROAD:
      tex(c, ['#836e48', '#907a51', '#9d865b', '#a99265'], seed, 4, 0.45);
      pebbles(c, 7, seed, ['#bdb3a0', '#5e5038']);
      break;
    case G.SAND:
      tex(c, ['#bfab70', '#cab67c', '#d5c289', '#dfcd96'], seed, 5, 0.45);
      for (let i = 0; i < 6; i++) P1(c, r() * 32, r() * 32, '#a8955e');
      for (let i = 0; i < 3; i++) P1(c, r() * 32, r() * 32, '#f2e6c0');
      break;
    case G.COBBLE: {
      R(c, 0, 0, 32, 32, '#3c3a37');
      for (let row = 0; row < 4; row++) {
        let x = -(row % 2) * 5 - Math.floor(r() * 3);
        while (x < 32) {
          const w = 7 + Math.floor(r() * 5);
          const base = ['#7a7873', '#85827c', '#706e69', '#8d8a84'][Math.floor(r() * 4)];
          for (const ox of [0, 32]) {
            const sx = x + ox;
            R(c, sx + 1, row * 8 + 1, w - 1, 6, base);
            R(c, sx + 1, row * 8 + 1, w - 1, 1, shade(base, 0.25));
            R(c, sx + 1, row * 8 + 1, 1, 6, shade(base, 0.15));
            R(c, sx + 1, row * 8 + 6, w - 1, 1, shade(base, -0.3));
            R(c, sx + w - 1, row * 8 + 1, 1, 6, shade(base, -0.2));
          }
          x += w;
        }
      }
      break;
    }
    case G.WOOD:
      for (let row = 0; row < 4; row++) {
        const base = ['#8a5a2b', '#82542a', '#93612f'][Math.floor(r() * 3)];
        R(c, 0, row * 8, 32, 8, base);
        for (let i = 0; i < 4; i++) R(c, r() * 28, row * 8 + 2 + r() * 4, 3 + r() * 6, 1, r() < 0.5 ? shade(base, 0.12) : shade(base, -0.15));
        R(c, 0, row * 8, 32, 1, shade(base, 0.18));
        R(c, 0, row * 8 + 7, 32, 1, '#4a2f14');
        const j = Math.floor(r() * 28) + 2;
        R(c, j, row * 8, 1, 8, '#4a2f14');
        P1(c, j - 2, row * 8 + 3, '#2a1a0c');
        P1(c, j + 2, row * 8 + 3, '#2a1a0c');
      }
      break;
    case G.TILE:
      for (let ty = 0; ty < 2; ty++)
        for (let tx = 0; tx < 2; tx++) {
          const base = (tx + ty) % 2 ? '#b1a999' : '#c3bcad';
          R(c, tx * 16, ty * 16, 16, 16, base);
          for (let i = 0; i < 10; i++) P1(c, tx * 16 + 1 + r() * 14, ty * 16 + 1 + r() * 14, shade(base, r() < 0.5 ? 0.08 : -0.06));
          R(c, tx * 16, ty * 16, 16, 1, shade(base, 0.2));
          R(c, tx * 16, ty * 16, 1, 16, shade(base, 0.12));
          R(c, tx * 16, ty * 16 + 15, 16, 1, shade(base, -0.25));
          R(c, tx * 16 + 15, ty * 16, 1, 16, shade(base, -0.2));
        }
      break;
    case G.CAVE:
      tex(c, ['#3c3128', '#463a2f', '#504236', '#5a4b3d'], seed, 3);
      pebbles(c, 5, seed, ['#6e6050', '#2a2018']);
      break;
    case G.SWAMP:
      tex(c, ['#30401f', '#394a25', '#42552b', '#3a4630'], seed, 4);
      if (v < 2) puddle(c, seed, '#26352f', '#4d6a5a');
      blades(c, 8, seed, '#5a7a3a', '#25321a');
      break;
    case G.SNOW:
      tex(c, ['#c9d6df', '#d8e3ea', '#e6eef3', '#f4f8fb'], seed, 5, 0.3);
      for (let i = 0; i < 5; i++) P1(c, r() * 32, r() * 32, '#aebfcd');
      for (let i = 0; i < 3; i++) P1(c, r() * 32, r() * 32, '#ffffff');
      break;
    case G.MUD:
      tex(c, ['#3c2e1e', '#473723', '#524129', '#5c4a2f'], seed, 3);
      if (v === 2) puddle(c, seed, '#2f2a22', '#5a5244');
      break;
    case G.BRIDGE:
      for (let k = 0; k < 4; k++) {
        const base = ['#8f6232', '#9a6a35', '#865b2e', '#94672f'][(k + v) % 4];
        R(c, k * 8, 0, 8, 32, base);
        R(c, k * 8, 0, 1, 32, shade(base, 0.18));
        R(c, k * 8 + 7, 0, 1, 32, '#3e2810');
        for (let i = 0; i < 3; i++) R(c, k * 8 + 2 + r() * 4, r() * 30, 1, 2 + r() * 3, shade(base, -0.15));
        P1(c, k * 8 + 3, 2, '#2a1a0c');
        P1(c, k * 8 + 3, 29, '#2a1a0c');
      }
      break;
    case G.WATER:
    case G.SEA: {
      const sea = g === G.SEA;
      tex(c, sea ? ['#162f5e', '#1b3867', '#214170', '#274a7a'] : ['#26508a', '#2d5a99', '#3464a6', '#3b6eb0'], g * 7 + v, 5, 0.25);
      const rr = prng(g * 7 + v + 11);
      for (let i = 0; i < 6; i++) {
        const wy = Math.floor(rr() * 30);
        const wx = Math.floor(rr() * 32);
        const len = 3 + Math.floor(rr() * 4);
        for (let k = 0; k < len; k++) P1(c, (wx + k + f * 2) % 32, wy + (k === 0 || k === len - 1 ? 1 : 0), sea ? '#3d68a0' : '#6a9edb');
        P1(c, (wx + 1 + f * 2) % 32, wy, sea ? '#5a86bc' : '#a6ccf2');
      }
      break;
    }
    case G.LAVA: {
      tex(c, ['#9a2a08', '#b4340b', '#cc420d', '#e05412'], seed, 3, 0.3);
      const rr = prng(seed + f * 3);
      for (let i = 0; i < 4; i++) {
        let x = rr() * 32;
        let y = rr() * 32;
        for (let k = 0; k < 7; k++) {
          P1(c, x, y, k % 3 ? '#ffb02a' : '#ffe060');
          x = (x + (rr() < 0.5 ? 1 : 0) + 32) % 32;
          y = (y + (rr() < 0.5 ? 1 : -1) + 32) % 32;
        }
      }
      break;
    }
    default:
      R(c, 0, 0, 32, 32, '#000');
  }
  return cv;
}

/** Prioridad para los bordes: el suelo de más prioridad se derrama sobre el vecino. -1 = sin bordes. */
export const GROUND_PRIO: Record<number, number> = {
  [G.SEA]: 0, [G.WATER]: 0, [G.LAVA]: 0, [G.MUD]: 1, [G.SWAMP]: 2, [G.SAND]: 3, [G.CAVE]: 4, [G.DIRT]: 4,
  [G.ROAD]: 5, [G.FOREST]: 6, [G.GRASS]: 7, [G.SNOW]: 8,
};

const edgeCache = new Map<string, HTMLCanvasElement>();

/** Franja irregular del suelo `src` sobre el borde `dir` (0 norte, 1 este, 2 sur, 3 oeste) de una casilla. */
export function edgeSprite(srcTile: HTMLCanvasElement, g2: number, dir: number, x: number, y: number): HTMLCanvasElement {
  const v = Math.floor(tileHash(x, y, 5) * 3);
  const key = `${g2}:${dir}:${v}`;
  let cv = edgeCache.get(key);
  if (cv) return cv;
  const src = srcTile.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, 32, 32).data;
  const [out, c] = canvas(32, 32);
  const img = c.createImageData(32, 32);
  const d = img.data;
  for (let t = 0; t < 32; t++) {
    const depth = 2 + Math.floor(valueNoise(t / 4 + v * 10 + dir * 3, 1.5, 99) * 6);
    for (let k = 0; k <= depth; k++) {
      if (k === depth && (t + v) % 2) continue;
      const [px, py] = dir === 0 ? [t, k] : dir === 1 ? [31 - k, t] : dir === 2 ? [t, 31 - k] : [k, t];
      const i = (py * 32 + px) * 4;
      const dark = k >= depth - 1 ? 0.82 : 1;
      d[i] = src[i] * dark;
      d[i + 1] = src[i + 1] * dark;
      d[i + 2] = src[i + 2] * dark;
      d[i + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
  edgeCache.set(key, out);
  cv = out;
  return cv;
}

// =====================================================================
//                Roca y muros (bloques con altura oblicua)
// =====================================================================

const ROCK: Record<Style, { top: string[]; south: string; east: string; line: string }> = {
  surface: { top: ['#1e1914', '#241e18', '#2a231c'], south: '#4a3e32', east: '#382e25', line: '#2c241c' },
  cave: { top: ['#1d1813', '#231d17', '#29221b'], south: '#5a4a3a', east: '#43372b', line: '#30271e' },
  crypt: { top: ['#1b1b21', '#212128', '#27272f'], south: '#55555f', east: '#40404a', line: '#2c2c34' },
  mine: { top: ['#1f1810', '#261d13', '#2d2317'], south: '#5e4a2e', east: '#463722', line: '#33281a' },
  lava: { top: ['#160f0e', '#1c1311', '#221714'], south: '#4a2a20', east: '#371f18', line: '#ff5a1a' },
  flooded: { top: ['#141c24', '#19232d', '#1f2a36'], south: '#3e5466', east: '#2e3f4d', line: '#25333f' },
  sewer: { top: ['#161a14', '#1b2019', '#20261e'], south: '#4a5444', east: '#373f33', line: '#262c22' },
};

const rockCache = new Map<string, HTMLCanvasElement>();

export function rockTop(style: Style, x: number, y: number): HTMLCanvasElement {
  const v = Math.floor(tileHash(x, y, 9) * 3);
  const key = `top:${style}:${v}`;
  let cv = rockCache.get(key);
  if (cv) return cv;
  const [c0, c] = canvas(32, 32);
  tex(c, ROCK[style].top, 400 + v, 4, 0.3);
  rockCache.set(key, c0);
  return (cv = c0);
}

/** Bloque de 48 x 48: la casilla ocupa la esquina inferior derecha; la cara superior sube 16 px a la izquierda. */
export function rockBlock(style: Style, x: number, y: number): HTMLCanvasElement {
  const v = Math.floor(tileHash(x, y, 9) * 3);
  const key = `block:${style}:${v}`;
  let cv = rockCache.get(key);
  if (cv) return cv;
  const [b, c] = canvas(48, 48);
  const k = ROCK[style];
  const r = prng(500 + v);
  // cara sur
  poly(c, [[0, 32], [32, 32], [48, 48], [16, 48]], k.south);
  // cara este
  poly(c, [[32, 0], [48, 16], [48, 48], [32, 32]], k.east);
  if (style === 'crypt' || style === 'sewer') {
    c.save();
    c.beginPath();
    c.moveTo(0, 32);
    c.lineTo(32, 32);
    c.lineTo(48, 48);
    c.lineTo(16, 48);
    c.closePath();
    c.clip();
    for (let yy = 36; yy < 48; yy += 4) R(c, 0, yy, 48, 1, k.line);
    for (let yy = 32; yy < 48; yy += 4) for (let xx = (yy % 8) * 1.5; xx < 48; xx += 9) R(c, xx + (yy - 32), yy, 1, 4, k.line);
    c.restore();
  } else {
    for (let i = 0; i < 18; i++) {
      const t = r();
      const yy = 33 + Math.floor(r() * 14);
      const xx = (yy - 32) + Math.floor(t * 30);
      R(c, xx, yy, 2 + r() * 4, 1, i % 3 ? k.line : shade(k.south, 0.18));
    }
    for (let i = 0; i < 10; i++) {
      const xx = 33 + Math.floor(r() * 14);
      const yy = (xx - 32) + 2 + Math.floor(r() * 28);
      R(c, xx, yy, 1, 2 + r() * 3, i % 2 ? k.line : shade(k.east, 0.15));
    }
    if (style === 'mine' && v === 0) {
      poly(c, [[6, 32], [10, 32], [26, 48], [22, 48]], '#7a5530');
      poly(c, [[24, 32], [28, 32], [44, 48], [40, 48]], '#7a5530');
    }
  }
  // cara superior
  c.drawImage(rockTop(style, x, y), 0, 0);
  rockCache.set(key, b);
  return (cv = b);
}

export function wallBlock(wood: boolean, v: number): HTMLCanvasElement {
  const [b, c] = canvas(48, 48);
  const top = wood ? '#6b4420' : '#8a8a94';
  const south = wood ? '#8a5a2b' : '#6c6c78';
  const east = wood ? '#6e4622' : '#555560';
  const line = wood ? '#4a2e14' : '#44444e';
  poly(c, [[0, 32], [32, 32], [48, 48], [16, 48]], south);
  poly(c, [[32, 0], [48, 16], [48, 48], [32, 32]], east);
  c.save();
  c.beginPath();
  c.moveTo(0, 32);
  c.lineTo(32, 32);
  c.lineTo(48, 48);
  c.lineTo(16, 48);
  c.closePath();
  c.clip();
  if (wood) for (let xx = -16; xx < 48; xx += 6) poly(c, [[xx, 32], [xx + 1, 32], [xx + 17, 48], [xx + 16, 48]], line);
  else {
    for (let yy = 36; yy < 48; yy += 4) R(c, 0, yy, 48, 1, line);
    for (let yy = 32; yy < 48; yy += 4) for (let xx = ((yy / 4) % 2) * 4; xx < 40; xx += 8) R(c, xx + (yy - 32), yy, 1, 4, line);
  }
  c.restore();
  c.save();
  c.beginPath();
  c.moveTo(32, 0);
  c.lineTo(48, 16);
  c.lineTo(48, 48);
  c.lineTo(32, 32);
  c.closePath();
  c.clip();
  for (let yy = 0; yy < 48; yy += wood ? 6 : 4) poly(c, [[32, yy], [48, yy + 16], [48, yy + 17], [32, yy + 1]], line);
  c.restore();
  // cara superior
  R(c, 0, 0, 32, 32, top);
  const r = prng(70 + v + (wood ? 9 : 0));
  for (let i = 0; i < 40; i++) P1(c, r() * 32, r() * 32, shade(top, r() < 0.5 ? 0.1 : -0.1));
  R(c, 0, 0, 32, 1, shade(top, 0.3));
  R(c, 0, 0, 1, 32, shade(top, 0.2));
  R(c, 0, 31, 32, 1, shade(top, -0.3));
  R(c, 31, 0, 1, 32, shade(top, -0.25));
  return b;
}

/** Montaña: bloque más alto (24 px) con textura rocosa y nieve opcional. */
export function mountainBlock(v: number, snow: boolean): HTMLCanvasElement {
  const H = 24;
  const S = 32 + H;
  const [b, c] = canvas(S, S);
  const r = prng(90 + v);
  const south = ['#6b6158', '#635a51', '#72685e'][v];
  const east = shade(south, -0.22);
  poly(c, [[0, 32], [32, 32], [S, S], [H, S]], south);
  poly(c, [[32, 0], [S, H], [S, S], [32, 32]], east);
  for (let i = 0; i < 26; i++) {
    const yy = 33 + Math.floor(r() * (H - 1));
    const xx = (yy - 32) + Math.floor(r() * 30);
    R(c, xx, yy, 2 + r() * 5, 1, r() < 0.6 ? shade(south, -0.25) : shade(south, 0.2));
  }
  for (let i = 0; i < 14; i++) {
    const xx = 33 + Math.floor(r() * (H - 1));
    const yy = (xx - 32) + 2 + Math.floor(r() * 28);
    R(c, xx, yy, 1, 2 + r() * 4, shade(east, r() < 0.5 ? -0.25 : 0.15));
  }
  const top = snow ? ['#c4d0d8', '#d4dee5', '#e4ecf1', '#f2f7fa'] : ['#5e554c', '#6a6056', '#766b60', '#82766a'];
  const [, tctx] = [null, c];
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const n = valueNoise(x / 4 + v * 5, y / 4, 77) * 0.7 + r() * 0.3;
      tctx.fillStyle = top[Math.min(3, Math.floor(n * 4))];
      tctx.fillRect(x, y, 1, 1);
    }
  for (let i = 0; i < 4; i++) {
    let x = r() * 30;
    let y = r() * 30;
    for (let k = 0; k < 6; k++) {
      P1(c, x, y, snow ? '#9fb2c0' : '#433b34');
      x += r() < 0.5 ? 1 : 0;
      y += 1;
    }
  }
  return b;
}

// =====================================================================
//                         Vegetación y rocas
// =====================================================================

/** Árbol de 64 x 64 anclado abajo a la derecha (la casilla es el cuadrante inferior derecho). */
export function treeSprite(v: number): HTMLCanvasElement {
  const [b, c] = canvas(64, 64);
  const r = prng(200 + v);
  // tronco y raíces
  R(c, 41, 40, 8, 20, '#5a3a1c');
  R(c, 41, 40, 3, 20, '#6e4824');
  R(c, 47, 40, 2, 20, '#43290f');
  R(c, 37, 57, 6, 3, '#5a3a1c');
  R(c, 48, 57, 6, 3, '#4a2e14');
  const leaf = [['#1f5a1d', '#2b7027', '#378532', '#4a9c3e'], ['#24561c', '#2f6a25', '#3d7f2f', '#529440'], ['#2a5a1a', '#3a6e22', '#4a832b', '#62983a']][v];
  // copa: racimos oscuros, medios y luces
  const blobs: [number, number, number][] = [[38, 26, 17], [26, 30, 11], [50, 30, 11], [38, 14, 12], [30, 20, 10], [47, 19, 10], [38, 36, 12]];
  for (const [x, y, rad] of blobs) E(c, x, y, rad, rad * 0.9, leaf[0]);
  for (const [x, y, rad] of blobs) E(c, x - 2, y - 2, rad - 3, (rad - 3) * 0.9, leaf[1]);
  for (const [x, y, rad] of blobs.slice(3, 6)) E(c, x - 4, y - 4, rad - 6, (rad - 6) * 0.85, leaf[2]);
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * 16;
    const x = 38 + Math.cos(a) * d * 1.1;
    const y = 24 + Math.sin(a) * d;
    if (y < 34) P1(c, x, y, x + y < 58 ? leaf[3] : leaf[0]);
  }
  if (v === 0) for (let i = 0; i < 5; i++) R(c, 26 + r() * 26, 14 + r() * 22, 2, 2, '#c43c32');
  return finish(b);
}

export function pineSprite(v: number, snow: boolean): HTMLCanvasElement {
  const [b, c] = canvas(64, 64);
  const r = prng(300 + v);
  R(c, 43, 50, 5, 11, '#5a3a1c');
  R(c, 43, 50, 2, 11, '#6e4824');
  const col = snow ? ['#1f4030', '#2a5440', '#36664e'] : [['#163f20', '#1f5229', '#2a6633'], ['#143a1c', '#1c4b24', '#265e2d'], ['#1a4422', '#23582c', '#2e6c36']][v];
  for (let tier = 0; tier < 4; tier++) {
    const top = 2 + tier * 11;
    const h = 16;
    for (let k = 0; k < h; k++) {
      const half = Math.floor(((k + 1) / h) * (7 + tier * 3.2));
      const y = top + k;
      for (let x = -half; x <= half; x++) {
        if (Math.abs(x) === half && r() < 0.4) continue;
        const col2 = x < -half / 3 ? col[2] : x > half / 2 ? col[0] : col[1];
        P1(c, 45 + x, y, snow && k < 3 + (tier === 0 ? 2 : 0) ? (r() < 0.8 ? '#eef4f8' : '#c4d4de') : col2);
      }
    }
    if (snow) for (let x = -5; x <= 3; x++) if (r() < 0.6) P1(c, 45 + x - tier, top + 13 + Math.floor(r() * 2), '#e4eef4');
  }
  return finish(b);
}

export function deadTree(v: number): HTMLCanvasElement {
  const [b, c] = canvas(64, 64);
  const r = prng(350 + v);
  const col = '#4a3626';
  R(c, 43, 26, 5, 34, col);
  R(c, 43, 26, 2, 34, '#5e4632');
  const branch = (x: number, y: number, dx: number, dy: number, n: number, w: number) => {
    for (let k = 0; k < n; k++) {
      R(c, x, y, w, w, col);
      x += dx;
      y += dy;
      if (r() < 0.3) y -= 1;
    }
  };
  branch(44, 34, -1, -1, 12, 2);
  branch(46, 30, 1, -1, 11, 2);
  branch(45, 26, 0, -1, 14, 2);
  branch(36, 26, -1, -1, 6, 1);
  branch(52, 22, 1, -1, 6, 1);
  branch(45, 16, -1, -1, 5, 1);
  return finish(b);
}

export function bushSprite(v: number): HTMLCanvasElement {
  const [b, c] = canvas(32, 32);
  const r = prng(400 + v);
  const leaf = ['#225f1f', '#2f7a2a', '#3f8f36', '#56a646'];
  for (const [x, y, rad] of [[16, 20, 10], [10, 22, 7], [22, 22, 7], [16, 14, 8]] as const) E(c, x, y, rad, rad * 0.8, leaf[0]);
  for (const [x, y, rad] of [[14, 18, 7], [20, 20, 5], [12, 14, 5]] as const) E(c, x, y, rad, rad * 0.8, leaf[1]);
  for (let i = 0; i < 25; i++) P1(c, 6 + r() * 20, 8 + r() * 18, r() < 0.6 ? leaf[3] : leaf[2]);
  if (v === 0) for (let i = 0; i < 4; i++) R(c, 8 + r() * 16, 12 + r() * 12, 2, 2, '#d63c3c');
  return finish(b);
}

export function boulderSprite(v: number): HTMLCanvasElement {
  const [b, c] = canvas(32, 32);
  const r = prng(450 + v);
  const base = ['#6f6a64', '#67625c', '#77716a'][v];
  E(c, 16, 21, 11, 8, shade(base, -0.25));
  E(c, 15, 19, 10, 7, base);
  E(c, 12, 16, 5, 3, shade(base, 0.2));
  for (let i = 0; i < 3; i++) {
    let x = 10 + r() * 12;
    let y = 16 + r() * 6;
    for (let k = 0; k < 4; k++) P1(c, (x += r() < 0.5 ? 1 : -1), (y += 1), shade(base, -0.4));
  }
  return finish(b);
}

// =====================================================================
//                     Personajes humanoides (32 x 32)
// =====================================================================

/** Dibuja un humanoide visto en 3/4 desde arriba. dir: 0 sur, 1 oeste (se espeja fuera), 2 norte, 3 este. */
export function humanoid(c: Ctx, L: Look, dir: number, f: number) {
  const skin = L.skin ?? '#e0b089';
  const hair = L.hair ?? '#3a2a1a';
  const c1 = L.c1;
  const c2 = L.c2;
  const boots = '#33210f';
  const side = dir === 1 || dir === 3;
  const back = dir === 2;
  // sombra
  c.fillStyle = 'rgba(0,0,0,0.28)';
  E(c, 16, 29, 8, 2, 'rgba(0,0,0,0.28)');
  // piernas
  if (side) {
    const a = f === 1 ? 3 : f === 2 ? -3 : 0;
    R(c, 13 + a, 21, 4, 7, shade(c2, -0.2));
    R(c, 13 + a, 27, 6, 2, boots);
    R(c, 15 - a, 21, 4, 7, c2);
    R(c, 15 - a, 27, 6, 2, boots);
  } else {
    const l = f === 1 ? 2 : 0;
    const rr = f === 2 ? 2 : 0;
    R(c, 11, 21, 4, 7 - l, c2);
    R(c, 10, 27 - l, 6, 2, boots);
    R(c, 17, 21, 4, 7 - rr, shade(c2, -0.1));
    R(c, 17, 27 - rr, 6, 2, boots);
  }
  // torso
  if (side) {
    R(c, 11, 12, 10, 10, c1);
    R(c, 11, 20, 10, 1, shade(c1, -0.35));
    R(c, 11, 12, 2, 8, shade(c1, -0.15));
  } else {
    R(c, 9, 13, 14, 9, c1);
    R(c, 10, 12, 12, 1, c1);
    R(c, 9, 20, 14, 1, shade(c1, -0.35));
    if (!back) {
      R(c, 15, 13, 2, 7, shade(c1, 0.14));
      P1(c, 16, 20, '#d9b44a');
    } else R(c, 15, 13, 2, 7, shade(c1, -0.12));
  }
  // brazos
  if (side) {
    const s = f === 1 ? 2 : f === 2 ? -2 : 0;
    R(c, 15 + s, 13, 4, 7, shade(c1, -0.18));
    R(c, 15 + s, 20, 4, 2, skin);
  } else {
    const s1 = f === 1 ? 1 : 0;
    const s2 = f === 2 ? 1 : 0;
    R(c, 6, 13 + s1, 3, 7, shade(c1, -0.12));
    R(c, 23, 13 + s2, 3, 7, shade(c1, -0.12));
    R(c, 6, 20 + s1, 3, 2, skin);
    R(c, 23, 20 + s2, 3, 2, skin);
  }
  // cabeza (grande, como en los RPG clásicos de vista cenital)
  R(c, 14, 11, 4, 2, shade(skin, -0.25));
  E(c, side ? 17 : 16, 7, 6, 5.5, skin);
  if (L.helmet) {
    E(c, side ? 17 : 16, 5, 7, 4.5, '#9aa0a6');
    R(c, side ? 10 : 9, 5, 14, 3, '#9aa0a6');
    R(c, 12, 2, 6, 1, '#dde3e8');
    if (!back && !side) R(c, 15, 8, 2, 4, '#80868e');
    if (side) R(c, 10, 5, 4, 7, '#80868e');
  } else if (L.hood) {
    E(c, side ? 16 : 16, 6, 7.5, 7, c1);
    if (!back) E(c, side ? 19 : 16, 8, 4, 4, skin);
    R(c, 9, 12, 14, 1, shade(c1, -0.3));
  } else {
    E(c, side ? 16 : 16, 3.5, 6.5, 3.5, hair);
    if (back) E(c, 16, 7, 6.5, 5, hair);
    else if (side) R(c, 10, 3, 6, 8, hair);
    else {
      R(c, 10, 3, 2, 7, hair);
      R(c, 20, 3, 2, 7, hair);
      R(c, 13, 3, 6, 2, shade(hair, 0.15));
    }
  }
  // cara
  if (!back) {
    if (side) {
      R(c, 20, 7, 2, 2, '#1a1010');
      P1(c, 22, 9, shade(skin, -0.15));
    } else {
      R(c, 13, 7, 2, 2, '#1a1010');
      R(c, 17, 7, 2, 2, '#1a1010');
      P1(c, 13, 7, '#ffffff');
      P1(c, 17, 7, '#ffffff');
      R(c, 15, 10, 2, 1, shade(skin, -0.3));
    }
  }
  // arma en la mano
  const w = L.weapon ?? 'none';
  const hx = side ? 17 : 24;
  const hy = 21;
  if (w === 'sword') {
    R(c, hx, hy - 13, 2, 13, '#d7dde2');
    R(c, hx, hy - 13, 1, 13, '#ffffff');
    R(c, hx - 2, hy - 1, 6, 2, '#8a6530');
    R(c, hx, hy + 1, 2, 3, '#5a3a1a');
  } else if (w === 'axe') {
    R(c, hx, hy - 12, 2, 16, '#6b4a2a');
    poly(c, [[hx + 2, hy - 13], [hx + 8, hy - 15], [hx + 8, hy - 5], [hx + 2, hy - 7]], '#b9bec3');
    R(c, hx + 7, hy - 15, 1, 10, '#e8edf0');
  } else if (w === 'club') {
    R(c, hx, hy - 8, 2, 12, '#6b4a2a');
    E(c, hx + 1, hy - 10, 3, 3.5, '#5a3a1a');
    P1(c, hx, hy - 12, '#8a6a4a');
  } else if (w === 'staff') {
    R(c, hx, hy - 19, 2, 26, '#6b4a2a');
    E(c, hx + 1, hy - 20, 2.5, 2.5, c2);
    P1(c, hx, hy - 21, '#ffffff');
  } else if (w === 'bow') {
    for (let t = 0; t <= 20; t++) R(c, hx + 2 + Math.round(Math.sin((t / 20) * Math.PI) * 4), hy - 12 + t, 2, 1, '#a8743c');
    R(c, hx + 2, hy - 12, 1, 21, 'rgba(240,240,240,0.7)');
  }
}

// =====================================================================
//                    Puertas, portón y tejados
// =====================================================================

/** Puerta cerrada: un bloque como el muro, con la hoja de madera encima. */
export function doorBlock(wood: boolean, v: number): HTMLCanvasElement {
  const [b, c] = canvas(48, 48);
  c.drawImage(wallBlock(wood, v), 0, 0);
  // hoja de la puerta sobre la cara superior y la cara sur
  R(c, 3, 2, 26, 29, '#7a4e24');
  for (let x = 3; x < 29; x += 5) R(c, x, 2, 1, 29, '#5a3816');
  R(c, 3, 2, 26, 1, '#a8743c');
  R(c, 3, 8, 26, 2, '#3a3a40');
  R(c, 3, 23, 26, 2, '#3a3a40');
  R(c, 23, 15, 3, 3, '#d9b44a');
  P1(c, 23, 15, '#fff0a0');
  poly(c, [[3, 32], [29, 32], [45, 48], [19, 48]], '#5e3c1c');
  for (let x = 5; x < 29; x += 5) poly(c, [[x, 32], [x + 1, 32], [x + 17, 48], [x + 16, 48]], '#4a2e14');
  return finish(b, false);
}

/** Portón cerrado: rejas de hierro. */
export function gateBlock(v: number): HTMLCanvasElement {
  const [b, c] = canvas(48, 48);
  c.drawImage(wallBlock(false, v), 0, 0);
  R(c, 1, 1, 30, 30, '#1c1c22');
  for (let x = 3; x < 31; x += 5) {
    R(c, x, 1, 2, 30, '#8a8a94');
    R(c, x, 1, 1, 30, '#b8b8c2');
  }
  for (const y of [7, 22]) R(c, 1, y, 30, 2, '#6a6a74');
  poly(c, [[1, 32], [31, 32], [47, 48], [17, 48]], '#2a2a30');
  for (let x = 3; x < 31; x += 5) poly(c, [[x, 32], [x + 2, 32], [x + 18, 48], [x + 16, 48]], '#8a8a94');
  return finish(b, false);
}

/** Portón abierto: postes y la reja levantada arriba. */
export function gateOpenSprite(): HTMLCanvasElement {
  const [b, c] = canvas(32, 32);
  R(c, 0, 0, 4, 32, '#6c6c78');
  R(c, 28, 0, 4, 32, '#555560');
  R(c, 0, 0, 32, 4, '#3a3a40');
  for (let x = 5; x < 28; x += 5) R(c, x, 0, 2, 4, '#8a8a94');
  return finish(b);
}

const roofCache = new Map<string, HTMLCanvasElement>();

/** Teja roja; los bordes sin tejado vecino llevan alero oscuro. mask: bits N=1, E=2, S=4, O=8 (con tejado). */
export function roofSprite(mask: number, v: number): HTMLCanvasElement {
  const key = mask + ':' + v;
  let cv = roofCache.get(key);
  if (cv) return cv;
  const [b, c] = canvas(32, 32);
  const r = prng(800 + v);
  const base = ['#8e3a28', '#86362a', '#963f2c'][v];
  R(c, 0, 0, 32, 32, base);
  for (let row = 0; row < 32; row += 6) {
    R(c, 0, row + 5, 32, 1, '#5a2018');
    R(c, 0, row, 32, 1, shade(base, 0.18));
    for (let x = (row / 6) % 2 ? 0 : 4; x < 32; x += 8) R(c, x, row, 1, 5, '#6a281c');
  }
  for (let i = 0; i < 20; i++) P1(c, r() * 32, r() * 32, shade(base, r() < 0.5 ? 0.12 : -0.15));
  if (!(mask & 1)) R(c, 0, 0, 32, 3, '#b8584a');
  if (!(mask & 2)) R(c, 29, 0, 3, 32, '#4a1a12');
  if (!(mask & 4)) R(c, 0, 29, 32, 3, '#3e1610');
  if (!(mask & 8)) R(c, 0, 0, 3, 32, '#a84c3c');
  roofCache.set(key, b);
  return (cv = b);
}
