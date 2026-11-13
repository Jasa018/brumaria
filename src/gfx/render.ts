// Dibuja la vista del juego (15 x 11 casillas), la iluminación, los efectos y el minimapa.
import { G, GROUNDS, O, OBJECTS } from '../data/tiles';
import type { Missile } from '../data/monsters';
import { VIEW_H, VIEW_W, type Game } from '../game/game';
import type { Creature, FxKind, GameEvent } from '../game/types';
import { GROUND_PRIO, TILE, corpseSprite, creatureSprite, edgeSprite, groundSprite, objectOffset, objectSprite, rockBlock, rockTop, roofSprite } from './sprites';
import { UPPER_Z } from '../data/world';

/** Los personajes se dibujan elevados hacia arriba a la izquierda, como si tuvieran altura. */
const DISP = 6;
const DIRS4 = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;

const S = 2; // escala del canvas respecto a los píxeles del mundo
const COLS = VIEW_W * 2 + 1;
const ROWS = VIEW_H * 2 + 1;

const FLAT = new Set<number>([O.DOOR_OPEN, O.STAIRS_DOWN, O.STAIRS_UP, O.FLOWERS, O.BONES, O.WEB, O.MUSHROOMS, O.RUBBLE, O.REEDS, O.CHAIR]);

interface Fx { x: number; y: number; z: number; kind: FxKind; start: number }
interface Dmg { x: number; y: number; z: number; text: string; color: string; start: number }
interface Shot { fx: number; fy: number; tx: number; ty: number; z: number; kind: Missile; start: number; dur: number }

const FX_COLORS: Record<FxKind, string[]> = {
  hit: ['#ff3030', '#c01010', '#ff8080'],
  physical: ['#ff3030', '#c01010'],
  block: ['#c0d0ff', '#ffffff'],
  miss: ['#a0a0a0', '#d0d0d0'],
  poff: ['#a0a0a0', '#d0d0d0', '#808080'],
  fire: ['#ff9a30', '#ffd040', '#ff5a1a'],
  ice: ['#7fe0ff', '#ffffff', '#4ab0e0'],
  earth: ['#7ad04a', '#3a8a2a', '#c9e04a'],
  energy: ['#c07aff', '#ffffff', '#8a4aff'],
  holy: ['#ffe070', '#ffffff', '#fff6c0'],
  death: ['#504060', '#a080c0', '#202030'],
  heal: ['#7fb0ff', '#ffffff', '#4a80ff'],
  levelup: ['#ffd040', '#ffffff', '#ff9a30'],
  teleport: ['#c07aff', '#7fd6ff', '#ffffff'],
};

const MISSILE_COLORS: Record<Missile, string> = {
  arrow: '#e8d8b0', stone: '#8d8d8d', fire: '#ff8a20', ice: '#9fe8ff', poison: '#7ad04a', energy: '#c07aff', death: '#7a5c9a', holy: '#ffe070',
};

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private light: HTMLCanvasElement;
  private lctx: CanvasRenderingContext2D;
  private fx: Fx[] = [];
  private dmg: Dmg[] = [];
  private shots: Shot[] = [];
  private ox = 0;
  private oy = 0;
  hover: { x: number; y: number } | null = null;
  /** Hora real (ms) para animaciones. */
  private now = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.width = COLS * TILE * S;
    canvas.height = ROWS * TILE * S;
    this.ctx = canvas.getContext('2d')!;
    this.light = document.createElement('canvas');
    this.light.width = canvas.width;
    this.light.height = canvas.height;
    this.lctx = this.light.getContext('2d')!;
  }

  onEvent(e: GameEvent, now: number) {
    if (e.t === 'fx') this.fx.push({ x: e.x, y: e.y, z: e.z, kind: e.kind, start: now });
    else if (e.t === 'dmg') {
      // Si ya hay números en la misma casilla, el nuevo empieza un poco más arriba
      const stacked = this.dmg.filter((d) => d.x === e.x && d.y === e.y && now - d.start < 300).length;
      this.dmg.push({ x: e.x, y: e.y, z: e.z, text: e.text, color: e.color, start: now - stacked * 180 });
    } else if (e.t === 'missile') {
      const dist = Math.max(Math.abs(e.tx - e.fx), Math.abs(e.ty - e.fy));
      this.shots.push({ ...e, start: now, dur: 80 + dist * 55 });
    }
  }

  /** Casilla del mundo bajo un punto de la pantalla. */
  screenToTile(clientX: number, clientY: number): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    const fx = ((clientX - r.left) / r.width) * COLS;
    const fy = ((clientY - r.top) / r.height) * ROWS;
    return { x: Math.floor(fx + this.ox), y: Math.floor(fy + this.oy) };
  }

  private interp(c: Creature, time: number): [number, number, number] {
    if (!c.moveDur) return [c.x, c.y, 1];
    const t = Math.min(1, Math.max(0, (time - c.moveStart) / c.moveDur));
    return [c.fromX + (c.x - c.fromX) * t, c.fromY + (c.y - c.fromY) * t, t];
  }

  draw(game: Game, now: number) {
    this.now = now;
    const ctx = this.ctx;
    const map = game.map;
    const p = game.player;
    const z = p.z;
    const time = game.time;
    const frame = Math.floor(now / 250);
    const [px, py] = this.interp(p, time);
    this.ox = px - VIEW_W;
    this.oy = py - VIEW_H;
    const ox = this.ox;
    const oy = this.oy;
    const sx = (x: number) => Math.round((x - ox) * TILE);
    const sy = (y: number) => Math.round((y - oy) * TILE);

    ctx.setTransform(S, 0, 0, S, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, COLS * TILE, ROWS * TILE);

    const x0 = Math.floor(ox) - 1;
    const y0 = Math.floor(oy) - 1;
    const x1 = Math.ceil(ox + COLS) + 1;
    const y1 = Math.ceil(oy + ROWS) + 2;

    // 1. Suelo y objetos planos
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        if (!map.inBounds(x, y, z) || !game.isExplored(x, y, z)) continue;
        if (z === UPPER_Z && map.g(x, y, z) === G.VOID) {
          const g0 = map.g(x, y, 0);
          if (g0 !== G.ROCK && g0 !== G.VOID) {
            ctx.drawImage(groundSprite(g0, x, y, 0, frame), sx(x), sy(y));
            ctx.fillStyle = 'rgba(8,6,14,0.55)';
            ctx.fillRect(sx(x), sy(y), TILE, TILE);
          }
          continue;
        }
        const g = map.g(x, y, z);
        if (g === G.ROCK) ctx.drawImage(rockTop(map.style(x, y, z), x, y), sx(x), sy(y));
        else {
          ctx.drawImage(groundSprite(g, x, y, z, frame), sx(x), sy(y));
          // Bordes: el suelo vecino de más prioridad se derrama sobre esta casilla
          const pr = GROUND_PRIO[g] ?? -1;
          if (pr >= 0)
            DIRS4.forEach(([dx, dy], dir) => {
              const ng = map.g(x + dx, y + dy, z);
              if ((GROUND_PRIO[ng] ?? -1) > pr) ctx.drawImage(edgeSprite(groundSprite(ng, 0, 0, 0, 0), ng, dir, x, y), sx(x), sy(y));
            });
        }
        const o = map.o(x, y, z);
        if (o && FLAT.has(o)) ctx.drawImage(objectSprite(o, x, y, frame), sx(x), sy(y));
      }

    // Casilla bajo el ratón
    if (this.hover) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx(this.hover.x) + 0.5, sy(this.hover.y) + 0.5, TILE - 1, TILE - 1);
    }

    // 2. Por filas: cadáveres, objetos altos y criaturas
    const byRow = new Map<number, Creature[]>();
    for (const c of game.creatures.values()) {
      if (c.z !== z || c.dead) continue;
      if (c.x < x0 - 1 || c.x > x1 + 1 || c.y < y0 - 1 || c.y > y1 + 1) continue;
      const row = Math.max(c.y, c.fromY);
      const list = byRow.get(row) ?? [];
      list.push(c);
      byRow.set(row, list);
    }
    const target = p.target !== null ? game.creatures.get(p.target) : undefined;
    for (let y = y0; y <= y1; y++) {
      for (const cp of game.corpses) if (cp.z === z && cp.y === y && cp.x >= x0 && cp.x <= x1) ctx.drawImage(corpseSprite(cp.look), sx(cp.x), sy(cp.y));
      for (let x = x0; x <= x1; x++) {
        if (!game.isExplored(x, y, z)) continue;
        // Roca con caras visibles: bloque con altura
        if (map.g(x, y, z) === G.ROCK && (GROUNDS[map.g(x, y + 1, z)]?.walk || GROUNDS[map.g(x + 1, y, z)]?.walk || GROUNDS[map.g(x + 1, y + 1, z)]?.walk))
          ctx.drawImage(rockBlock(map.style(x, y, z), x, y), sx(x) - 16, sy(y) - 16);
        const o = map.o(x, y, z);
        if (!o || FLAT.has(o)) continue;
        const gateOpen = o === O.GATE && game.gateOpen();
        const flag = o === O.MOUNTAIN ? map.g(x, y, z) === G.SNOW : o === O.DOOR ? [map.o(x - 1, y, z), map.o(x + 1, y, z), map.o(x, y - 1, z), map.o(x, y + 1, z)].includes(O.WOODWALL) : gateOpen;
        const spr = objectSprite(o, x, y, frame, flag);
        const [ox2, oy2] = objectOffset(o, gateOpen);
        ctx.drawImage(spr, sx(x) + ox2, sy(y) + oy2);
      }
      for (const c of byRow.get(y) ?? []) {
        const [cx, cy, t] = this.interp(c, time);
        const moving = t < 1 && c.moveDur > 0;
        const walk = moving ? 1 + (Math.floor(t * 2) % 2) : 0;
        const body = c.look.body;
        const idleAnim = body === 'bat' || body === 'slime' || body === 'ghost' || body === 'bird' || body === 'dragon';
        const f = body === 'humanoid' ? walk : moving ? walk % 2 : idleAnim ? frame % 2 : 0;
        const spr = creatureSprite(c.look, c.dir, f);
        const scale = c.look.scale ?? 1;
        const w = TILE * scale;
        const dx = sx(cx) + (TILE - w) / 2 - DISP;
        const dy = sy(cy) + TILE - w - DISP;
        if (c === target) {
          ctx.strokeStyle = '#ff2020';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(sx(cx) + 1 - DISP, sy(cy) + 1 - DISP, TILE - 2, TILE - 2);
        }
        ctx.drawImage(spr, dx, dy, w, w);
      }
    }

    // Tejados (como en los RPG clásicos: desaparecen al entrar en un edificio)
    if (z === 0 && !map.hasRoof(p.x, p.y)) {
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          if (!map.hasRoof(x, y) || !game.isExplored(x, y, 0)) continue;
          const mask = (map.hasRoof(x, y - 1) ? 1 : 0) | (map.hasRoof(x + 1, y) ? 2 : 0) | (map.hasRoof(x, y + 1) ? 4 : 0) | (map.hasRoof(x - 1, y) ? 8 : 0);
          ctx.drawImage(roofSprite(mask, (x * 7 + y * 3) % 3), sx(x) - 16, sy(y) - 16);
        }
    }

    // 3. Efectos y proyectiles
    this.fx = this.fx.filter((f) => now - f.start < 600);
    for (const f of this.fx) if (f.z === z) this.drawFx(f, sx(f.x) + TILE / 2, sy(f.y) + TILE / 2);
    this.shots = this.shots.filter((s) => now - s.start < s.dur);
    for (const s of this.shots) {
      if (s.z !== z) continue;
      const t = (now - s.start) / s.dur;
      const x = sx(s.fx + (s.tx - s.fx) * t) + TILE / 2;
      const y = sy(s.fy + (s.ty - s.fy) * t) + TILE / 2;
      ctx.fillStyle = MISSILE_COLORS[s.kind];
      if (s.kind === 'arrow') {
        const ang = Math.atan2(s.ty - s.fy, s.tx - s.fx);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.fillRect(-7, -0.5, 12, 1.5);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(3, -1.5, 3, 3);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, s.kind === 'stone' ? 2.5 : 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }

    // 4. Iluminación
    const dark = game.darkness();
    if (dark > 0.01) {
      const l = this.lctx;
      l.setTransform(S, 0, 0, S, 0, 0);
      l.globalCompositeOperation = 'source-over';
      l.clearRect(0, 0, COLS * TILE, ROWS * TILE);
      l.fillStyle = `rgba(4,4,12,${dark})`;
      l.fillRect(0, 0, COLS * TILE, ROWS * TILE);
      l.globalCompositeOperation = 'destination-out';
      const glow = (wx: number, wy: number, r: number, a = 1) => {
        const cx = sx(wx) + TILE / 2;
        const cy = sy(wy) + TILE / 2;
        const rad = r * TILE;
        const grad = l.createRadialGradient(cx, cy, rad * 0.15, cx, cy, rad);
        grad.addColorStop(0, `rgba(0,0,0,${a})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        l.fillStyle = grad;
        l.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
      };
      glow(px, py, game.lightRadius() + 1.5);
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const lr = OBJECTS[map.o(x, y, z)]?.light;
          if (lr) glow(x, y, lr + 0.5 + Math.sin(now / 180 + x) * 0.08, 0.95);
          else if (map.g(x, y, z) === G.LAVA) glow(x, y, 1.6, 0.55);
        }
      for (const f of this.fx) if (f.z === z && (f.kind === 'fire' || f.kind === 'energy' || f.kind === 'holy' || f.kind === 'levelup')) glow(f.x, f.y, 2, 0.8);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.light, 0, 0);
      ctx.setTransform(S, 0, 0, S, 0, 0);
    }

    // 5. Nombres, barras de vida, globos y números
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    for (const list of byRow.values())
      for (const c of list) {
        const [cx, cy] = this.interp(c, time);
        const scale = c.look.scale ?? 1;
        const topY = sy(cy) + TILE - TILE * scale - DISP;
        const midX = sx(cx) + TILE / 2 - DISP;
        if (c.kind !== 'npc') {
          const pct = Math.max(0, c.hp / c.maxHp);
          const col = pct > 0.6 ? '#3fd040' : pct > 0.3 ? '#e0c030' : pct > 0.1 ? '#e06020' : '#c01010';
          ctx.fillStyle = '#000';
          ctx.fillRect(midX - 14, topY - 4, 28, 4);
          ctx.fillStyle = col;
          ctx.fillRect(midX - 13, topY - 3, Math.round(26 * pct), 2);
          this.text(c.name, midX, topY - 6, col, 9);
        } else this.text(c.name, midX, topY - 3, '#7fd6ff', 9);
        if (c.speech && c.speech.until > time) this.bubble(c.speech.text, midX, topY - (c.kind === 'npc' ? 13 : 16), c.speech.color);
      }
    this.dmg = this.dmg.filter((d) => now - d.start < 1100);
    for (const d of this.dmg) {
      if (d.z !== z) continue;
      const t = Math.max(0, now - d.start) / 1100;
      this.text(d.text, sx(d.x) + TILE / 2, sy(d.y) + 6 - t * 22, d.color, 10, 1 - Math.max(0, t - 0.7) / 0.3);
    }
  }

  private text(s: string, x: number, y: number, color: string, size: number, alpha = 1) {
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    ctx.font = `${size}px VT323, monospace`;
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.strokeText(s, x, y);
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
    ctx.globalAlpha = 1;
  }

  private bubble(s: string, x: number, y: number, color: string) {
    const ctx = this.ctx;
    ctx.font = '9px VT323, monospace';
    const maxW = 150;
    const words = s.split(' ');
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else cur = test;
    }
    if (cur) lines.push(cur);
    const shown = lines.slice(0, 5);
    const left = Math.max(80, Math.min(COLS * TILE - 80, x));
    shown.forEach((l, i) => this.text(l, left, y - (shown.length - 1 - i) * 9, color, 9));
  }

  private drawFx(f: Fx, cx: number, cy: number) {
    const ctx = this.ctx;
    const t = (this.now - f.start) / 600;
    const cols = FX_COLORS[f.kind];
    const rise = f.kind === 'heal' || f.kind === 'levelup' || f.kind === 'teleport';
    const n = f.kind === 'levelup' ? 18 : f.kind === 'block' || f.kind === 'miss' ? 5 : 10;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + f.start * 0.001;
      const sp = 4 + ((i * 37) % 9);
      let x: number;
      let y: number;
      if (rise) {
        x = cx + Math.cos(a) * (6 + (i % 3) * 3) * (f.kind === 'teleport' ? 1 - t : 1);
        y = cy + 8 - t * (18 + (i % 4) * 4);
      } else {
        x = cx + Math.cos(a) * sp * t * 2.2;
        y = cy + Math.sin(a) * sp * t * 2.2;
      }
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = cols[i % cols.length];
      const sz = f.kind === 'poff' || f.kind === 'miss' ? 4 - t * 2 : 2;
      ctx.fillRect(Math.round(x - sz / 2), Math.round(y - sz / 2), sz, sz);
    }
    if (f.kind === 'block') {
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = '#c0d0ff';
      ctx.beginPath();
      ctx.arc(cx, cy, 6 + t * 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

/** Color de una casilla en el minimapa. */
function mapColor(game: Game, x: number, y: number, z: number): string | null {
  if (!game.isExplored(x, y, z)) return null;
  const map = game.map;
  if (z === UPPER_Z && map.g(x, y, z) === G.VOID) return game.isExplored(x, y, 0) ? mapColor(game, x, y, 0) : null;
  const o = map.o(x, y, z);
  if (map.isStairs(x, y, z)) return '#ffd23f';
  const oc = OBJECTS[o]?.map;
  if (oc) return oc;
  const g = map.g(x, y, z);
  if (g === G.ROCK) return z > 0 ? '#14110e' : '#2a2420';
  return GROUNDS[g].map;
}

/** Minimapa centrado en el jugador (2 píxeles por casilla). */
export function drawMinimap(cv: HTMLCanvasElement, game: Game) {
  const ctx = cv.getContext('2d')!;
  const p = game.player;
  const k = 2;
  const w = cv.width / k;
  const h = cv.height / k;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cv.width, cv.height);
  const x0 = p.x - Math.floor(w / 2);
  const y0 = p.y - Math.floor(h / 2);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = mapColor(game, x0 + x, y0 + y, p.z);
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x * k, y * k, k, k);
    }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect((p.x - x0) * k - 1, (p.y - y0) * k - 1, k + 2, k + 2);
}

/** Mapa del mundo explorado en una planta. */
export function drawWorldMap(cv: HTMLCanvasElement, game: Game, z: number) {
  const map = game.map;
  const k = Math.max(1, Math.floor(Math.min(cv.width / map.W, cv.height / map.H)));
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cv.width, cv.height);
  for (let y = 0; y < map.H; y++)
    for (let x = 0; x < map.W; x++) {
      const c = mapColor(game, x, y, z);
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(x * k, y * k, k, k);
    }
  // Nombres de los pueblos descubiertos
  if (z === 0) {
    ctx.font = `${Math.max(12, k * 5)}px VT323, monospace`;
    ctx.textAlign = 'center';
    for (const t of map.towns) {
      const cx = t.x + t.w / 2;
      const cy = t.y + t.h / 2;
      if (!game.isExplored(Math.floor(cx), Math.floor(cy), 0)) continue;
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000';
      ctx.strokeText(t.name, cx * k, cy * k);
      ctx.fillStyle = '#ffe070';
      ctx.fillText(t.name, cx * k, cy * k);
    }
  }
  const p = game.player;
  if (p.z === z) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(p.x * k - 2, p.y * k - 2, k + 4, k + 4);
    ctx.fillStyle = '#e03030';
    ctx.fillRect(p.x * k - 1, p.y * k - 1, k + 2, k + 2);
  }
}
