// Pixel art generado por código (16x16 "píxeles" lógicos por casilla, dibujados a 2x).
import { G, O } from '../data/tiles';
import type { ItemDef } from '../data/items';
import type { Look } from '../data/monsters';
import { tileHash } from '../game/rng';
import { boulderSprite, bushSprite, deadTree, doorBlock, drawGround, finish, gateBlock, gateOpenSprite, humanoid, mountainBlock, pineSprite, treeSprite, wallBlock } from './art';

export { edgeSprite, GROUND_PRIO, rockBlock, rockTop, roofSprite } from './art';

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

// ===================================================================
//                              Objetos
// ===================================================================

const objCache = new Map<string, HTMLCanvasElement>();

/** `flag` depende del objeto: nieve (montaña), madera (puerta) o abierto (portón). */
/** Desplazamiento del dibujo respecto a la esquina de su casilla (la altura se proyecta arriba a la izquierda). */
export function objectOffset(o: number, open = false): [number, number] {
  if (o === O.WALL || o === O.WOODWALL || o === O.DOOR || (o === O.GATE && !open)) return [-16, -16];
  if (o === O.MOUNTAIN) return [-24, -24];
  if (o === O.TREE || o === O.PINE || o === O.SNOWPINE || o === O.DEADTREE) return [-32, -32];
  if (o === O.LAMP || o === O.STATUE || o === O.BOOKSHELF) return [0, -16];
  return [0, 0];
}

export function objectSprite(o: number, x: number, y: number, frame: number, flag = false): HTMLCanvasElement {
  const v = Math.floor(tileHash(x, y, 3) * 3);
  const anim = o === O.BRAZIER || o === O.FOUNTAIN || o === O.FURNACE || o === O.CRYSTAL || o === O.LAMP;
  const key = `${o}:${v}:${anim ? frame % 4 : 0}:${flag ? 1 : 0}`;
  let cv = objCache.get(key);
  if (!cv) {
    cv = drawObject(o, v, anim ? frame % 4 : 0, flag);
    objCache.set(key, cv);
  }
  return cv;
}

function drawObject(o: number, v: number, f: number, flag: boolean): HTMLCanvasElement {
  switch (o) {
    case O.TREE: return treeSprite(v);
    case O.PINE: return pineSprite(v, false);
    case O.SNOWPINE: return pineSprite(v, true);
    case O.DEADTREE: return deadTree(v);
    case O.MOUNTAIN: return mountainBlock(v, flag);
    case O.DOOR: return doorBlock(flag, v);
    case O.GATE: return flag ? gateOpenSprite() : gateBlock(v);
    case O.WALL: return wallBlock(false, v);
    case O.WOODWALL: return wallBlock(true, v);
    case O.BUSH: return bushSprite(v);
    case O.BOULDER: return boulderSprite(v);
  }
  const h = o === O.LAMP || o === O.STATUE || o === O.BOOKSHELF ? 1.5 : 1;
  const H = Math.round(16 * h);
  const [cv, c] = canvas(TILE, H * P);
  const base = H - 16; // fila lógica donde empieza la casilla
  const at = (yy: number) => base + yy;
  switch (o) {
    case O.DOOR_OPEN:
      // marco y hoja abierta contra el lateral
      rect(c, 0, 0, 2, 16, '#5e3c1c');
      rect(c, 14, 0, 2, 16, '#5e3c1c');
      rect(c, 2, 0, 12, 1, '#3a2410');
      rect(c, 2, 1, 3, 13, '#8a5a2b');
      rect(c, 2, 1, 1, 13, '#a8743c');
      px(c, 4, 7, '#d9b44a');
      break;
    case O.CHEST:
      rect(c, 2, 6, 12, 8, '#7a4e24');
      rect(c, 2, 4, 12, 3, '#9a6a35');
      rect(c, 2, 4, 12, 1, '#b8854a');
      rect(c, 2, 9, 12, 1, '#3a3a40');
      rect(c, 2, 5, 1, 9, '#3a3a40');
      rect(c, 13, 5, 1, 9, '#3a3a40');
      rect(c, 7, 8, 2, 3, '#d9b44a');
      px(c, 7, 8, '#fff0a0');
      break;
    case O.PLANT:
      rect(c, 5, 10, 6, 5, '#9a5a2b');
      rect(c, 5, 10, 6, 1, '#b8743c');
      disc(c, 8, 6, 4, '#2f7a2a');
      px(c, 6, 4, '#4caf50');
      px(c, 10, 6, '#4caf50');
      px(c, 8, 3, '#e05555');
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
  return finish(cv);
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
  if (L.body !== 'humanoid') {
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(8, 28, 16, 3);
  }
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
  return finish(cv);
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
  cv = finish(cv);
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
  cv = finish(cv);
  iconCache.set(d.id, cv);
  return cv;
}
