// Simulación en tiempo real de Brumaria. Sin DOM ni canvas: emite `events` que la interfaz muestra.
import { ITEMS, item, type Element, type ItemDef, type Slot } from '../data/items';
import { MONSTERS, type Look, type MonsterDef } from '../data/monsters';
import { NPCS } from '../data/npcs';
import { QUESTS, QUEST_BY_ID } from '../data/quests';
import { SPELLS, type SpellDef } from '../data/spells';
import { G, GROUNDS, O, OBJECTS } from '../data/tiles';
import { VOCATIONS, type VocId } from '../data/vocations';
import { isUnderground } from '../data/world';
import { hear } from './dialog';
import { findPath, lineOfSight, type Step } from './path';
import { rand } from './rng';
import {
  ELEMENT_COLOR, ELEMENT_FX, type Corpse, type Creature, type FxKind, type GameEvent, type MsgColor,
  type PlayerData, type Skill, type SoundName, type Stack,
} from './types';
import type { WorldMap } from './world';

export const ATTACK_MS = 2000;
export const EXHAUST_MS = 1000;
export const FOOD_MAX = 1200;
export const INV_SLOTS = 24;
export const HOTBAR = 8;
/** Duración de un día completo en el juego (ms reales). */
export const DAY_MS = 20 * 60_000;
/** Mitad del campo de visión (15 x 11 casillas). */
export const VIEW_W = 7;
export const VIEW_H = 5;

/** Multiplicador de experiencia por nivel (se sube rápido al principio). */
export const expStage = (level: number) => (level < 8 ? 3 : level < 20 ? 2 : level < 35 ? 1.5 : 1);

export const expForLevel = (l: number) => Math.round((50 / 3) * (l ** 3 - 6 * l ** 2 + 17 * l - 12));

export const cheb = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

export function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[¿?¡!.,;:"']/g, ' ').replace(/\s+/g, ' ').trim();
}

export type Player = Creature & PlayerData & {
  target: number | null;
  chase: boolean;
  path: Step[];
  pathGoal: { x: number; y: number } | null;
  talkingTo: number | null;
  lightUntil: number;
  lightRadius: number;
  hasteUntil: number;
  exhaustUntil: number;
  spellCd: Record<string, number>;
  regenAt: number;
  hungerMsgAt: number;
  lastArea: string;
  exploredBits: Uint8Array[];
};

export function newPlayerData(name: string, look: Look, map: WorldMap): PlayerData {
  const t = map.temples['albor'];
  return {
    version: 1, name, look, voc: 'aprendiz', level: 1, exp: 0, hp: 150, mana: 55, gold: 20, food: 600,
    skills: { melee: { lvl: 10, tries: 0 }, dist: { lvl: 10, tries: 0 }, shield: { lvl: 10, tries: 0 }, magic: { lvl: 0, tries: 0 } },
    inv: [{ id: 'pan', n: 4 }, { id: 'manzana', n: 5 }, { id: 'pocion_vida', n: 3 }, { id: 'antorcha', n: 2 }],
    equip: { weapon: 'garrote', body: 'jubon', feet: 'sandalias' },
    spells: ['sanar_menor', 'luz'],
    hotbar: ['spell:sanar_menor', 'item:pocion_vida', 'item:pan', 'spell:luz', null, null, null, null],
    quests: {}, home: 'albor', pos: { ...t }, explored: [], worldTime: 0,
    stats: { kills: 0, deaths: 0, playMs: 0 },
  };
}

export class Game {
  map: WorldMap;
  time = 0;
  events: GameEvent[] = [];
  creatures = new Map<number, Creature>();
  /** Casilla -> id de criatura. */
  occ = new Map<number, number>();
  corpses: Corpse[] = [];
  player: Player;
  private nextId = 1;
  private spawnLive: (number | null)[];
  private spawnAt: number[];

  constructor(map: WorldMap, data: PlayerData) {
    this.map = map;
    const id = this.nextId++;
    const p = data.pos;
    this.player = {
      ...structuredClone(data),
      id, kind: 'player', x: p.x, y: p.y, z: p.z, dir: 0, maxHp: 1,
      fromX: p.x, fromY: p.y, moveStart: 0, moveDur: 0, nextMove: 0, nextAttack: 0, nextThink: 0,
      target: null, chase: false, path: [], pathGoal: null, talkingTo: null,
      lightUntil: 0, lightRadius: 0, hasteUntil: 0, exhaustUntil: 0, spellCd: {}, regenAt: 3000, hungerMsgAt: 0,
      lastArea: '', exploredBits: [],
    };
    this.time = 0;
    const pl = this.player;
    pl.maxHp = this.maxHp();
    pl.hp = Math.min(pl.hp, pl.maxHp);
    for (let z = 0; z < map.Z; z++) {
      const bits = new Uint8Array(Math.ceil((map.W * map.H) / 8));
      const saved = data.explored[z];
      if (saved) {
        const bin = atob(saved);
        for (let i = 0; i < bin.length && i < bits.length; i++) bits[i] = bin.charCodeAt(i);
      }
      pl.exploredBits.push(bits);
    }
    if (!map.walkable(pl.x, pl.y, pl.z)) Object.assign(pl, map.temples[pl.home] ?? map.temples['albor']);
    this.creatures.set(id, pl);
    this.occ.set(map.key(pl.x, pl.y, pl.z), id);
    this.explore();

    for (const n of map.npcs) {
      const def = NPCS[n.npc];
      if (!def) throw new Error(`NPC desconocido: ${n.npc}`);
      const c = this.makeCreature('npc', def.name, def.look, n.x, n.y, n.z, 100);
      c.npc = def;
      c.homeX = n.x;
      c.homeY = n.y;
      c.nextIdle = rand(10_000, 40_000);
    }
    this.spawnLive = map.spawns.map(() => null);
    this.spawnAt = map.spawns.map(() => 0);
    for (let i = 0; i < map.spawns.length; i++) this.trySpawn(i, true);
    pl.lastArea = map.areaName(pl.x, pl.y, pl.z);
  }

  // ======================================================================
  //                          Utilidades
  // ======================================================================

  emit(e: GameEvent) {
    this.events.push(e);
  }
  msg(text: string, color: MsgColor = 'white') {
    this.emit({ t: 'msg', text, color });
  }
  sound(s: SoundName) {
    this.emit({ t: 'sound', s });
  }
  fx(x: number, y: number, z: number, kind: FxKind) {
    this.emit({ t: 'fx', x, y, z, kind });
  }
  speak(c: Creature, text: string, color = '#ffe14a', ms = 4000) {
    c.speech = { text, until: this.time + ms, color };
  }

  private makeCreature(kind: Creature['kind'], name: string, look: Look, x: number, y: number, z: number, hp: number): Creature {
    const c: Creature = {
      id: this.nextId++, kind, name, look, x, y, z, dir: 0, hp, maxHp: hp,
      fromX: x, fromY: y, moveStart: 0, moveDur: 0, nextMove: this.time + rand(0, 1000), nextAttack: this.time + 1000, nextThink: 0,
    };
    this.creatures.set(c.id, c);
    this.occ.set(this.map.key(x, y, z), c.id);
    return c;
  }

  creatureAt(x: number, y: number, z: number): Creature | undefined {
    const id = this.occ.get(this.map.key(x, y, z));
    return id === undefined ? undefined : this.creatures.get(id);
  }

  /**
   * Libre para pisar: suelo transitable, sin nadie encima, sin puerta cerrada y, para el portón de Albor,
   * solo el jugador que ya tiene permiso.
   */
  free(x: number, y: number, z: number, who: 'player' | 'monster' | 'any' = 'any'): boolean {
    if (!this.map.walkable(x, y, z) || this.occ.has(this.map.key(x, y, z))) return false;
    const o = this.map.o(x, y, z);
    if (o === O.DOOR) return false;
    if (o === O.GATE) return who === 'player' && this.gateOpen();
    return true;
  }

  /** El portón de Albor se abre al terminar la misión de los Ductos. */
  gateOpen(): boolean {
    return this.player.quests['ductos']?.state === 'done';
  }

  private gateMsgAt = 0;
  private gateBlocked() {
    if (this.time < this.gateMsgAt) return;
    this.gateMsgAt = this.time + 4000;
    const p = this.player;
    let guard: Creature | undefined;
    for (const c of this.creatures.values()) if (c.npc?.id === 'guardia_albor' && c.z === p.z && cheb(c, p) <= 6 && (!guard || cheb(c, p) < cheb(guard, p))) guard = c;
    const text = '¡Alto! Nadie sale de Albor sin el permiso del capitán Rurik. Lo encontrarás en el cuartel, aquí al lado.';
    if (guard) this.npcSay(guard, text);
    else this.msg(text, 'orange');
  }

  private lockMsgAt = 0;

  ownsHouse(id: string): boolean {
    return (this.player.houses ?? []).includes(id);
  }

  buyHouse(id: string): boolean {
    const p = this.player;
    const h = this.map.houses.find((hh) => hh.id === id);
    if (!h || this.ownsHouse(id) || p.gold < h.price) return false;
    p.gold -= h.price;
    p.houses = [...(p.houses ?? []), id];
    this.msg(`¡Ahora eres dueño de la ${h.name}! Su puerta ya se abre para ti. En el baúl puedes guardar objetos: lo que guardes estará en todas tus casas.`, 'yellow');
    this.sound('quest');
    return true;
  }

  /** Clic en un baúl: si la casa es tuya, abre el almacén compartido. */
  openChest(x: number, y: number) {
    const p = this.player;
    const house = this.map.houseChests.get(this.map.key(x, y, p.z));
    if (cheb({ x, y }, p) > 1) return void this.walkTo(x, y);
    if (!house || !this.ownsHouse(house)) return void this.msg('Este baúl no es tuyo.', 'gray');
    this.emit({ t: 'depot' });
  }

  /** ¿Está el jugador junto a un baúl de una casa suya? */
  nearOwnChest(): boolean {
    const p = this.player;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const h = this.map.houseChests.get(this.map.key(p.x + dx, p.y + dy, p.z));
        if (h && this.ownsHouse(h)) return true;
      }
    return false;
  }

  static readonly DEPOT_SLOTS = 60;

  deposit(idx: number) {
    const p = this.player;
    const s = p.inv[idx];
    if (!s || !this.nearOwnChest()) return;
    const depot = (p.depot ??= []);
    const same = item(s.id).stack ? depot.find((d) => d.id === s.id) : undefined;
    if (same) same.n += s.n;
    else if (depot.length < Game.DEPOT_SLOTS) depot.push({ ...s });
    else return void this.msg('El baúl está lleno.', 'gray');
    p.inv.splice(idx, 1);
    this.emit({ t: 'inv' });
  }

  withdraw(idx: number) {
    const p = this.player;
    const depot = p.depot ?? [];
    const s = depot[idx];
    if (!s || !this.nearOwnChest()) return;
    const n = this.addItem(s.id, s.n);
    if (n <= 0) return void this.msg(p.inv.length >= INV_SLOTS ? 'Tu mochila está llena.' : 'No puedes cargar tanto peso.', 'gray');
    s.n -= n;
    if (s.n <= 0) depot.splice(idx, 1);
  }

  /** Abre o cierra una puerta junto al jugador. */
  toggleDoor(x: number, y: number): boolean {
    const p = this.player;
    if (p.dead || cheb({ x, y }, p) > 1) return false;
    const o = this.map.o(x, y, p.z);
    if (o === O.DOOR) {
      const house = this.map.houseDoors.get(this.map.key(x, y, p.z));
      if (house && !this.ownsHouse(house)) {
        if (this.time >= this.lockMsgAt) {
          this.lockMsgAt = this.time + 3000;
          const h = this.map.houses.find((hh) => hh.id === house)!;
          this.msg(`La puerta está cerrada con llave. ${h.name} está a la venta por ${h.price} de oro: pregunta por las casas al alcalde Teodoro (Albor) o al escribano Ciro (Juncal).`, 'gray');
        }
        return false;
      }
      this.map.setO(x, y, p.z, O.DOOR_OPEN);
    }
    else if (o === O.DOOR_OPEN) {
      if (this.occ.has(this.map.key(x, y, p.z))) return void this.msg('Hay alguien en la puerta.', 'gray'), false;
      this.map.setO(x, y, p.z, O.DOOR);
    } else return false;
    this.sound('door');
    return true;
  }

  inView(c: { x: number; y: number; z: number }): boolean {
    const p = this.player;
    return c.z === p.z && Math.abs(c.x - p.x) <= VIEW_W + 1 && Math.abs(c.y - p.y) <= VIEW_H + 1;
  }

  // ======================================================================
  //                          Estadísticas
  // ======================================================================

  voc() {
    return VOCATIONS[this.player.voc];
  }
  maxHp(): number {
    return 150 + (this.player.level - 1) * this.voc().hpPerLevel;
  }
  maxMana(): number {
    return 55 + (this.player.level - 1) * this.voc().manaPerLevel;
  }
  maxCap(): number {
    return 400 + (this.player.level - 1) * this.voc().capPerLevel;
  }
  weight(): number {
    const p = this.player;
    let w = 0;
    for (const s of p.inv) w += item(s.id).weight * s.n;
    for (const id of Object.values(p.equip)) if (id) w += item(id).weight;
    return Math.round(w * 10) / 10;
  }
  freeCap(): number {
    return this.maxCap() - this.weight();
  }
  equipped(slot: Slot): ItemDef | undefined {
    const id = this.player.equip[slot];
    return id ? ITEMS[id] : undefined;
  }
  armor(): number {
    let a = 0;
    for (const id of Object.values(this.player.equip)) if (id) a += item(id).armor ?? 0;
    return a;
  }
  gearRegen(): number {
    let r = 0;
    for (const id of Object.values(this.player.equip)) if (id) r += item(id).regen ?? 0;
    return r;
  }
  speed(): number {
    const p = this.player;
    let s = 100 + (p.level - 1) * 0.8;
    for (const id of Object.values(p.equip)) if (id) s += item(id).speed ?? 0;
    if (p.hasteUntil > this.time) s *= 1.4;
    return s;
  }
  lightRadius(): number {
    const p = this.player;
    let r = 2;
    if (p.lightUntil > this.time) r = Math.max(r, p.lightRadius);
    return r;
  }
  /** Hora del día (0-24). */
  hour(): number {
    return ((((this.player.worldTime + this.time) / DAY_MS) * 24 + 10) % 24 + 24) % 24;
  }
  /** Oscuridad ambiente entre 0 (día) y 1 (cueva negra). */
  darkness(): number {
    if (isUnderground(this.player.z)) return 0.93;
    const h = this.hour();
    // Noche de 21 a 5, con amanecer y atardecer de 2 horas
    if (h >= 7 && h < 19) return 0;
    if (h >= 21 || h < 5) return 0.72;
    if (h >= 19) return ((h - 19) / 2) * 0.72;
    return (1 - (h - 5) / 2) * 0.72;
  }

  // ======================================================================
  //                          Bucle principal
  // ======================================================================

  update(dt: number) {
    this.time += dt;
    const p = this.player;
    p.stats.playMs += dt;
    if (!p.dead) this.updatePlayer(dt);
    for (const c of this.creatures.values()) {
      if (c.dead || c.kind === 'player') continue;
      if (c.z !== p.z || cheb(c, p) > 22) continue; // fuera de alcance: congelada
      if (this.time < c.nextThink) continue;
      c.nextThink = this.time + 100;
      if (c.kind === 'monster') this.monsterThink(c);
      else this.npcThink(c);
    }
    for (let i = 0; i < this.spawnLive.length; i++) if (this.spawnLive[i] === null && this.time >= this.spawnAt[i]) this.trySpawn(i, false);
    if (this.corpses.length) this.corpses = this.corpses.filter((c) => c.until > this.time);
  }

  private updatePlayer(dt: number) {
    const p = this.player;
    // Hambre y regeneración
    const hadFood = p.food > 0;
    p.food = Math.max(0, p.food - dt / 1000);
    if (hadFood && p.food <= 0) {
      this.msg('Tienes hambre. Sin comer no recuperarás vida ni maná.', 'orange');
      p.hungerMsgAt = this.time + 60_000;
    } else if (p.food <= 0 && this.time >= p.hungerMsgAt) {
      this.msg('Tienes hambre.', 'orange');
      p.hungerMsgAt = this.time + 60_000;
    }
    if (this.time >= p.regenAt) {
      p.regenAt = this.time + 3000;
      if (p.food > 0) {
        const v = this.voc();
        const bonus = this.gearRegen();
        p.hp = Math.min(p.maxHp, p.hp + v.regenHp + Math.ceil(p.level / 10) + bonus);
        p.mana = Math.min(this.maxMana(), p.mana + v.regenMana + Math.ceil(p.level / 6) + bonus);
      }
    }
    // Objetivo
    const target = p.target !== null ? this.creatures.get(p.target) : undefined;
    if (p.target !== null && (!target || target.dead || target.z !== p.z || !this.inView(target))) {
      if (target && !target.dead) this.msg('Has perdido de vista a tu objetivo.', 'gray');
      p.target = null;
      p.chase = false;
    }
    // Caminar (ruta de clic o persecución)
    if (this.time >= p.nextMove) {
      if (p.path.length) {
        const s = p.path[0];
        if (this.map.o(s.x, s.y, p.z) === O.DOOR || (this.map.o(s.x, s.y, p.z) === O.GATE && !this.gateOpen())) {
          // Abre la puerta (o avisa el guardia) y sigue
          this.step(p, s.x - p.x, s.y - p.y);
          if (this.map.o(s.x, s.y, p.z) === O.GATE) {
            p.path = [];
            p.pathGoal = null;
          }
        } else if (this.free(s.x, s.y, p.z, 'player')) {
          p.path.shift();
          this.step(p, s.x - p.x, s.y - p.y);
        } else if (p.pathGoal) {
          const goal = p.pathGoal;
          const path = findPath(p.x, p.y, goal.x, goal.y, this.playerPassable(), { maxNodes: 4000 });
          p.path = path ?? [];
          if (!path) p.pathGoal = null;
          p.nextMove = this.time + 150;
        }
      } else if (target && p.chase && this.weaponType() === 'melee' && cheb(p, target) > 1) {
        const path = findPath(p.x, p.y, target.x, target.y, (x, y) => this.free(x, y, p.z, 'player'), { maxNodes: 600, adjacent: true });
        if (path && path.length) this.step(p, path[0].x - p.x, path[0].y - p.y);
        else p.nextMove = this.time + 300;
      }
    }
    // Atacar
    if (target && !target.dead && this.time >= p.nextAttack) this.playerAttack(target);
    // Conversación
    if (p.talkingTo !== null) {
      const npc = this.creatures.get(p.talkingTo);
      if (!npc || npc.z !== p.z || cheb(npc, p) > 4) {
        if (npc?.npc) this.npcSay(npc, npc.npc.bye);
        p.talkingTo = null;
      }
    }
    // Zona
    const area = this.map.areaName(p.x, p.y, p.z);
    if (area !== p.lastArea) {
      p.lastArea = area;
      this.emit({ t: 'area', name: area });
    }
  }

  // ======================================================================
  //                          Movimiento
  // ======================================================================

  stepTime(c: Creature, dx: number, dy: number): number {
    const slow = GROUNDS[this.map.g(c.x, c.y, c.z)]?.slow ?? 1;
    const speed = c.kind === 'player' ? this.speed() : (c.def?.speed ?? 60);
    const diag = dx && dy ? 1.4 : 1;
    return Math.round((300 * slow * diag * 100) / speed);
  }

  /** Mueve una criatura una casilla. Devuelve false si no puede. */
  step(c: Creature, dx: number, dy: number): boolean {
    const nx = c.x + dx;
    const ny = c.y + dy;
    if (dx || dy) c.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 1) : dy > 0 ? 0 : 2;
    const who = c.kind === 'player' ? 'player' : c.kind === 'monster' ? 'monster' : 'any';
    if (c.kind === 'player') {
      const o = this.map.o(nx, ny, c.z);
      if (o === O.DOOR && !this.occ.has(this.map.key(nx, ny, c.z))) {
        this.toggleDoor(nx, ny);
        c.nextMove = this.time + 250;
        return false;
      }
      if (o === O.GATE && !this.gateOpen()) {
        this.gateBlocked();
        c.nextMove = this.time + 400;
        return false;
      }
    }
    if (!this.free(nx, ny, c.z, who)) return false;
    if (c.kind === 'monster' && (this.map.isPz(nx, ny, c.z) || this.map.isStairs(nx, ny, c.z))) return false;
    this.occ.delete(this.map.key(c.x, c.y, c.z));
    c.fromX = c.x;
    c.fromY = c.y;
    c.x = nx;
    c.y = ny;
    this.occ.set(this.map.key(nx, ny, c.z), c.id);
    const t = this.stepTime(c, dx, dy);
    c.moveStart = this.time;
    c.moveDur = t;
    c.nextMove = this.time + t;
    if (c.kind === 'player') this.afterPlayerStep();
    return true;
  }

  private afterPlayerStep() {
    const p = this.player;
    const dest = this.map.links.get(this.map.key(p.x, p.y, p.z));
    if (dest) {
      const goingDown = dest.z > p.z;
      this.teleport(p, dest.x, dest.y, dest.z);
      this.msg(goingDown ? `Bajas a: ${this.map.areaName(p.x, p.y, p.z)}.` : `Subes a: ${this.map.areaName(p.x, p.y, p.z)}.`, 'gray');
      this.sound('stairs');
      this.emit({ t: 'floor' });
      p.path = [];
      p.pathGoal = null;
    }
    this.explore();
  }

  teleport(c: Creature, x: number, y: number, z: number) {
    let tx = x;
    let ty = y;
    if (!this.free(tx, ty, z)) {
      const n = this.findFreeNear(x, y, z);
      if (n) {
        tx = n.x;
        ty = n.y;
      }
    }
    this.occ.delete(this.map.key(c.x, c.y, c.z));
    c.x = c.fromX = tx;
    c.y = c.fromY = ty;
    c.z = z;
    c.moveDur = 0;
    this.occ.set(this.map.key(tx, ty, z), c.id);
    if (c.kind === 'player') {
      this.player.target = null;
      this.explore();
    }
  }

  findFreeNear(x: number, y: number, z: number, maxR = 4): { x: number; y: number } | null {
    for (let r = 1; r <= maxR; r++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (this.free(x + dx, y + dy, z) && !this.map.isStairs(x + dx, y + dy, z)) return { x: x + dx, y: y + dy };
        }
    return null;
  }

  private explore() {
    const p = this.player;
    const bits = p.exploredBits[p.z];
    for (let y = p.y - VIEW_H - 1; y <= p.y + VIEW_H + 1; y++)
      for (let x = p.x - VIEW_W - 1; x <= p.x + VIEW_W + 1; x++) {
        if (!this.map.inBounds(x, y, p.z)) continue;
        const i = y * this.map.W + x;
        bits[i >> 3] |= 1 << (i & 7);
      }
  }

  isExplored(x: number, y: number, z: number): boolean {
    if (!this.map.inBounds(x, y, z)) return false;
    const i = y * this.map.W + x;
    return (this.player.exploredBits[z][i >> 3] & (1 << (i & 7))) !== 0;
  }

  /** Movimiento manual con el teclado. */
  walk(dx: number, dy: number): boolean {
    const p = this.player;
    if (p.dead) return false;
    p.path = [];
    p.pathGoal = null;
    p.chase = false;
    if (this.time < p.nextMove) return false;
    if (this.step(p, dx, dy)) return true;
    // Gira hacia la dirección aunque no pueda moverse
    p.nextMove = this.time + 120;
    return false;
  }

  /** Para planear rutas: las criaturas solo cuentan como obstáculo si están al lado (las demás se moverán). */
  private playerPassable() {
    const p = this.player;
    const gate = this.gateOpen();
    return (x: number, y: number) => this.map.walkable(x, y, p.z) && (gate || this.map.o(x, y, p.z) !== O.GATE) && (cheb({ x, y }, p) > 1 || !this.occ.has(this.map.key(x, y, p.z)));
  }

  /** Caminar hasta una casilla haciendo clic. */
  walkTo(x: number, y: number): boolean {
    const p = this.player;
    if (p.dead) return false;
    if (x === p.x && y === p.y) return true;
    const passable = this.playerPassable();
    let path = this.map.walkable(x, y, p.z) ? findPath(p.x, p.y, x, y, passable, { maxNodes: 6000 }) : null;
    if (!path) path = findPath(p.x, p.y, x, y, passable, { maxNodes: 6000, adjacent: true });
    if (!path) {
      this.msg('No hay camino.', 'gray');
      return false;
    }
    p.path = path;
    p.pathGoal = path.length ? path[path.length - 1] : null;
    p.chase = false;
    return true;
  }

  // ======================================================================
  //                          Combate del jugador
  // ======================================================================

  weaponType(): 'melee' | 'bow' | 'wand' {
    return this.equipped('weapon')?.weaponType ?? 'melee';
  }

  setTarget(id: number | null) {
    const p = this.player;
    if (id === null) {
      p.target = null;
      p.chase = false;
      return;
    }
    const c = this.creatures.get(id);
    if (!c || c.kind !== 'monster' || c.dead) return;
    if (this.map.isPz(p.x, p.y, p.z)) {
      this.msg('No puedes atacar dentro de una zona protegida.', 'gray');
      return;
    }
    p.target = id;
    p.chase = true;
    p.path = [];
    p.pathGoal = null;
    c.provoked = true;
  }

  /** Apunta al enemigo visible más cercano (o al siguiente). */
  nextTarget() {
    const p = this.player;
    const list = this.visibleMonsters();
    if (!list.length) return;
    const i = list.findIndex((c) => c.id === p.target);
    this.setTarget(list[(i + 1) % list.length].id);
  }

  visibleMonsters(): Creature[] {
    const p = this.player;
    const out: Creature[] = [];
    for (const c of this.creatures.values()) if (c.kind === 'monster' && !c.dead && this.inView(c)) out.push(c);
    return out.sort((a, b) => cheb(a, p) - cheb(b, p));
  }

  private los(a: { x: number; y: number }, b: { x: number; y: number }, z: number): boolean {
    return lineOfSight(a.x, a.y, b.x, b.y, (x, y) => this.map.blocksSight(x, y, z));
  }

  private playerAttack(t: Creature) {
    const p = this.player;
    if (this.map.isPz(p.x, p.y, p.z)) return;
    const w = this.equipped('weapon');
    const type = this.weaponType();
    const d = cheb(p, t);
    if (type === 'melee') {
      if (d > 1) return;
      p.nextAttack = this.time + ATTACK_MS;
      const atk = w?.attack ?? 5;
      const skill = p.skills.melee.lvl;
      const max = Math.round(0.085 * atk * skill + p.level / 5 + 2);
      this.train('melee', 1);
      this.faceTo(p, t);
      this.damageMonster(t, rand(Math.round(max * 0.3), max), w?.element ?? 'physical', 'melee');
      return;
    }
    const range = w?.range ?? 4;
    if (d > range || !this.los(p, t, p.z)) return;
    if (type === 'wand') {
      const cost = w?.manaCost ?? 0;
      if (p.mana < cost) {
        p.nextAttack = this.time + ATTACK_MS;
        this.msg('No tienes maná suficiente para usar la varita.', 'gray');
        return;
      }
      p.mana -= cost;
      this.train('magic', cost);
      p.nextAttack = this.time + ATTACK_MS;
      const el = w?.element ?? 'energy';
      this.emit({ t: 'missile', fx: p.x, fy: p.y, tx: t.x, ty: t.y, z: p.z, kind: el === 'fire' ? 'fire' : el === 'ice' ? 'ice' : el === 'earth' ? 'poison' : 'energy' });
      const [mn, mx] = w?.dmg ?? [5, 10];
      this.faceTo(p, t);
      this.damageMonster(t, rand(mn, mx), el, 'magic');
      return;
    }
    // Arco u honda
    let ammoAtk = 0;
    let el: Element = w?.element ?? 'physical';
    if (w?.id !== 'honda') {
      const ammo = this.count('flecha_fuego') > 0 ? 'flecha_fuego' : this.count('flecha') > 0 ? 'flecha' : null;
      if (!ammo) {
        p.nextAttack = this.time + ATTACK_MS;
        this.msg('No tienes flechas.', 'gray');
        return;
      }
      this.removeItem(ammo, 1);
      const a = item(ammo);
      ammoAtk = a.attack ?? 0;
      if (a.element) el = a.element;
    }
    p.nextAttack = this.time + ATTACK_MS;
    this.train('dist', 1);
    this.faceTo(p, t);
    this.sound('bow');
    this.emit({ t: 'missile', fx: p.x, fy: p.y, tx: t.x, ty: t.y, z: p.z, kind: w?.id === 'honda' ? 'stone' : el === 'fire' ? 'fire' : 'arrow' });
    const skill = p.skills.dist.lvl;
    const hit = Math.min(0.92, 0.55 + skill * 0.008);
    if (Math.random() > hit) {
      this.fx(t.x, t.y, t.z, 'miss');
      this.sound('miss');
      t.provoked = true;
      return;
    }
    const max = Math.round(0.09 * ((w?.attack ?? 5) + ammoAtk) * skill + p.level / 5 + 2);
    this.damageMonster(t, rand(Math.round(max * 0.3), max), el, 'dist');
  }

  private faceTo(a: Creature, b: { x: number; y: number }) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (!dx && !dy) return;
    a.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 1) : dy > 0 ? 0 : 2;
  }

  damageMonster(m: Creature, raw: number, el: Element, src: 'melee' | 'dist' | 'magic') {
    const def = m.def!;
    let dmg = raw * (def.resist?.[el] ?? 1);
    if (src !== 'magic' && el === 'physical') {
      dmg -= rand(0, Math.floor(def.defense / 2));
      dmg -= rand(Math.floor(def.armor / 2), def.armor);
    }
    dmg = Math.round(dmg);
    m.provoked = true;
    m.hurtByPlayer = true;
    if (dmg <= 0) {
      this.fx(m.x, m.y, m.z, src === 'magic' ? 'poff' : 'block');
      this.sound('miss');
      return;
    }
    this.fx(m.x, m.y, m.z, ELEMENT_FX[el]);
    this.emit({ t: 'dmg', x: m.x, y: m.y, z: m.z, text: String(dmg), color: ELEMENT_COLOR[el] });
    this.sound('hit');
    m.hp -= dmg;
    if (m.hp <= 0) this.killMonster(m);
  }

  private killMonster(m: Creature) {
    const p = this.player;
    const def = m.def!;
    m.dead = true;
    this.occ.delete(this.map.key(m.x, m.y, m.z));
    this.creatures.delete(m.id);
    if (m.spawn !== undefined) {
      this.spawnLive[m.spawn] = null;
      this.spawnAt[m.spawn] = this.time + this.map.spawns[m.spawn].respawn;
    }
    if (p.target === m.id) {
      p.target = null;
      p.chase = false;
    }
    this.sound('kill');
    const items: Stack[] = [];
    if (m.summoner === undefined) {
      for (const [id, chance, max] of def.loot) {
        if (Math.random() >= chance) continue;
        items.push({ id, n: ITEMS[id].stack ? rand(1, max) : 1 });
      }
      const gold = rand(def.gold[0], def.gold[1]);
      if (gold > 0) items.unshift({ id: 'oro', n: gold });
    }
    this.corpses.push({ id: this.nextId++, x: m.x, y: m.y, z: m.z, name: def.name, look: def.look, items, until: this.time + (def.boss ? 600_000 : 120_000) });
    if (!m.hurtByPlayer) return;
    p.stats.kills++;
    const loot = items.length ? items.map((s) => `${s.n > 1 ? s.n + ' ' : ''}${item(s.id).name}`).join(', ') : 'nada';
    this.msg(`Botín de ${def.name}: ${loot}.`, 'green');
    for (const q of QUESTS) {
      const st = p.quests[q.id];
      if (!st || st.state !== 'active' || q.objective.type !== 'kill' || !q.objective.monsters.includes(def.id)) continue;
      if (st.count < q.objective.count) {
        st.count++;
        this.msg(`Misión «${q.name}»: ${st.count}/${q.objective.count} ${q.objective.label}.`, 'yellow');
        if (st.count === q.objective.count) this.msg(`¡Objetivo cumplido! Vuelve con ${NPCS[q.giver].name}.`, 'yellow');
      }
    }
    if (def.boss) this.msg(`¡Has derrotado a ${def.name}!`, 'purple');
    if (def.exp > 0) this.gainExp(Math.round(def.exp * expStage(p.level)));
  }

  gainExp(n: number) {
    const p = this.player;
    p.exp += n;
    this.msg(`Ganas ${n} puntos de experiencia.`, 'white');
    this.emit({ t: 'dmg', x: p.x, y: p.y, z: p.z, text: `+${n}`, color: '#ffffff' });
    while (p.exp >= expForLevel(p.level + 1)) {
      p.level++;
      p.maxHp = this.maxHp();
      p.hp = p.maxHp;
      p.mana = this.maxMana();
      this.msg(`¡Has subido al nivel ${p.level}!`, 'yellow');
      this.fx(p.x, p.y, p.z, 'levelup');
      this.sound('level');
      this.emit({ t: 'levelup', level: p.level });
      if (p.level === 6 && p.voc === 'aprendiz') this.msg('Ya puedes elegir tu vocación. Habla con el Oráculo en el templo de Albor.', 'yellow');
      const newSpells = SPELLS.filter((s) => s.price > 0 && s.level === p.level && s.voc.includes(p.voc));
      if (newSpells.length) this.msg(`Nuevos hechizos disponibles en el gremio de Valcorona: ${newSpells.map((s) => s.name).join(', ')}.`, 'blue');
    }
  }

  private train(skill: keyof PlayerData['skills'], tries: number) {
    const p = this.player;
    const s: Skill = p.skills[skill];
    const v = this.voc();
    const rate = skill === 'melee' ? v.meleeRate : skill === 'dist' ? v.distRate : skill === 'shield' ? v.shieldRate : v.magicRate;
    const r = 1 + (rate - 1) * 0.6;
    s.tries += tries;
    const need = (l: number) => (skill === 'magic' ? 150 * r ** l : 20 * r ** (l - 10));
    while (s.tries >= need(s.lvl)) {
      s.tries -= need(s.lvl);
      s.lvl++;
      const names = { melee: 'cuerpo a cuerpo', dist: 'distancia', shield: 'escudo', magic: 'nivel mágico' };
      this.msg(`Has mejorado tu habilidad de ${names[skill]} a ${s.lvl}.`, 'blue');
    }
  }

  skillProgress(skill: keyof PlayerData['skills']): number {
    const s = this.player.skills[skill];
    const v = this.voc();
    const rate = skill === 'melee' ? v.meleeRate : skill === 'dist' ? v.distRate : skill === 'shield' ? v.shieldRate : v.magicRate;
    const r = 1 + (rate - 1) * 0.6;
    const need = skill === 'magic' ? 150 * r ** s.lvl : 20 * r ** (s.lvl - 10);
    return Math.min(1, s.tries / need);
  }

  // ======================================================================
  //                          Daño al jugador
  // ======================================================================

  damagePlayer(raw: number, el: Element, from: Creature, melee: boolean) {
    const p = this.player;
    if (p.dead) return;
    let dmg = raw;
    if (melee) {
      const shield = this.equipped('shield')?.defense ?? 0;
      const wdef = this.equipped('weapon')?.defense ?? 0;
      const def = (shield + wdef * 0.4) * (p.skills.shield.lvl / 40 + 0.25);
      dmg -= rand(0, Math.round(def));
      this.train('shield', 1);
    }
    const arm = this.armor();
    if (el === 'physical') dmg -= rand(Math.floor(arm / 2), arm);
    else dmg = Math.round(dmg * (1 - Math.min(0.3, arm * 0.012)));
    dmg = Math.round(dmg);
    if (dmg <= 0) {
      this.fx(p.x, p.y, p.z, melee ? 'block' : 'poff');
      return;
    }
    p.hp -= dmg;
    this.fx(p.x, p.y, p.z, ELEMENT_FX[el]);
    this.emit({ t: 'dmg', x: p.x, y: p.y, z: p.z, text: String(dmg), color: ELEMENT_COLOR[el] });
    this.msg(`Pierdes ${dmg} de vida por un ataque de ${from.name}.`, 'red');
    this.sound('hurt');
    if (p.hp <= 0) this.die(from);
  }

  private die(killer: Creature) {
    const p = this.player;
    p.hp = 0;
    p.dead = true;
    p.target = null;
    p.path = [];
    p.talkingTo = null;
    p.stats.deaths++;
    const lost = Math.round(p.exp * 0.08);
    p.exp -= lost;
    while (p.level > 1 && p.exp < expForLevel(p.level)) p.level--;
    p.maxHp = this.maxHp();
    this.msg(`Has muerto a manos de ${killer.name}. Pierdes ${lost} de experiencia.`, 'red');
    this.sound('death');
    this.emit({ t: 'death' });
  }

  respawn() {
    const p = this.player;
    const t = this.map.temples[p.home] ?? this.map.temples['albor'];
    p.dead = false;
    p.maxHp = this.maxHp();
    p.hp = p.maxHp;
    p.mana = this.maxMana();
    p.food = Math.max(p.food, 300);
    this.teleport(p, t.x, t.y, t.z);
    this.fx(p.x, p.y, p.z, 'teleport');
    this.emit({ t: 'floor' });
    this.msg('Despiertas en el templo.', 'white');
  }

  // ======================================================================
  //                          Criaturas
  // ======================================================================

  private trySpawn(i: number, initial: boolean) {
    const sp = this.map.spawns[i];
    const def = MONSTERS[sp.monster];
    const p = this.player;
    for (let a = 0; a < 8; a++) {
      const k = sp.tiles[rand(0, sp.tiles.length - 1)];
      const x = k % this.map.W;
      const y = (k - x) / this.map.W;
      if (!this.free(x, y, sp.z)) continue;
      // No aparecen a la vista del jugador (salvo al cargar el mundo, lejos de él)
      const near = sp.z === p.z && Math.abs(x - p.x) <= VIEW_W + 2 && Math.abs(y - p.y) <= VIEW_H + 2;
      if (near) continue;
      const m = this.makeCreature('monster', def.name, def.look, x, y, sp.z, def.hp);
      m.def = def;
      m.spawn = i;
      this.spawnLive[i] = m.id;
      if (!initial && def.boss) this.msg(`Sientes un escalofrío... ${def.name} ha regresado.`, 'purple');
      return;
    }
    this.spawnAt[i] = this.time + 5000;
  }

  private monsterThink(m: Creature) {
    const p = this.player;
    const def = m.def!;
    const d = cheb(m, p);
    const canTarget = !p.dead && p.z === m.z && d <= 8 && !this.map.isPz(p.x, p.y, p.z) && (def.aggressive !== false || m.provoked) && (d <= 1 || this.los(m, p, m.z) || m.provoked);
    const fleeing = def.flee !== undefined && m.hp < m.maxHp * def.flee;
    if (canTarget && this.time >= m.nextAttack && !fleeing) this.monsterAttack(m, d);
    if (this.time < m.nextMove) return;
    if (canTarget) {
      if (fleeing) return this.moveAway(m, p);
      const ranged = def.ranged;
      if (def.keepDistance && ranged) {
        if (d <= 2) return this.moveAway(m, p);
        if (d > ranged.range || !this.los(m, p, m.z)) return this.moveToward(m, p.x, p.y);
        m.nextMove = this.time + 400;
        return;
      }
      if (d > 1) return this.moveToward(m, p.x, p.y);
      m.nextMove = this.time + 300;
      return;
    }
    if (m.provoked && p.z !== m.z) m.provoked = false;
    // Vuelve a su zona o pasea
    const sp = m.spawn !== undefined ? this.map.spawns[m.spawn] : null;
    if (sp && cheb(m, sp) > sp.radius + 4) return this.moveToward(m, sp.x, sp.y);
    if (Math.random() < 0.35) {
      const dx = rand(-1, 1);
      const dy = rand(-1, 1);
      const inRange = !sp || cheb({ x: m.x + dx, y: m.y + dy }, sp) <= sp.radius;
      if ((dx || dy) && inRange && this.step(m, dx, dy)) {
        m.nextMove += rand(400, 1500);
        return;
      }
    }
    m.nextMove = this.time + rand(600, 1800);
  }

  private monsterPassable(m: Creature) {
    return (x: number, y: number) => this.free(x, y, m.z, 'monster') && !this.map.isPz(x, y, m.z) && !this.map.isStairs(x, y, m.z);
  }

  private moveToward(m: Creature, tx: number, ty: number) {
    const dx = Math.sign(tx - m.x);
    const dy = Math.sign(ty - m.y);
    const pass = this.monsterPassable(m);
    const tryStep = (sx: number, sy: number) => (sx || sy) && pass(m.x + sx, m.y + sy) && this.step(m, sx, sy);
    // Primero en línea recta; si está bloqueado, A* corto
    if (tryStep(dx, dy)) return;
    const path = findPath(m.x, m.y, tx, ty, pass, { maxNodes: 350, adjacent: true });
    if (path && path.length && this.step(m, path[0].x - m.x, path[0].y - m.y)) return;
    if (tryStep(dx, 0) || tryStep(0, dy)) return;
    m.nextMove = this.time + 500;
  }

  private moveAway(m: Creature, from: { x: number; y: number }) {
    const pass = this.monsterPassable(m);
    let best: [number, number] | null = null;
    let bd = cheb(m, from);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dy) || !pass(m.x + dx, m.y + dy)) continue;
        const d = cheb({ x: m.x + dx, y: m.y + dy }, from) + Math.random() * 0.5;
        if (d > bd) {
          bd = d;
          best = [dx, dy];
        }
      }
    if (best && this.step(m, best[0], best[1])) return;
    m.nextMove = this.time + 400;
  }

  private monsterAttack(m: Creature, d: number) {
    const def = m.def!;
    const p = this.player;
    let acted = false;
    if (def.selfHeal && m.hp < m.maxHp * 0.7 && Math.random() < def.selfHeal.chance) {
      const v = rand(def.selfHeal.amount[0], def.selfHeal.amount[1]);
      m.hp = Math.min(m.maxHp, m.hp + v);
      this.fx(m.x, m.y, m.z, 'heal');
      acted = true;
    }
    if (def.summon && Math.random() < def.summon.chance) {
      let alive = 0;
      for (const c of this.creatures.values()) if (c.summoner === m.id && !c.dead) alive++;
      const spot = alive < 2 ? this.findFreeNear(m.x, m.y, m.z, 2) : null;
      if (spot && !this.map.isPz(spot.x, spot.y, m.z)) {
        const sd = MONSTERS[def.summon.id];
        const s = this.makeCreature('monster', sd.name, sd.look, spot.x, spot.y, m.z, sd.hp);
        s.def = sd;
        s.summoner = m.id;
        s.provoked = true;
        this.fx(spot.x, spot.y, m.z, 'teleport');
        this.speak(m, '¡Levantaos!', '#c07aff', 2000);
      }
    }
    if (def.area && d <= def.area.radius && Math.random() < def.area.chance) {
      for (let dy = -def.area.radius; dy <= def.area.radius; dy++)
        for (let dx = -def.area.radius; dx <= def.area.radius; dx++)
          if ((dx || dy) && this.map.walkable(m.x + dx, m.y + dy, m.z)) this.fx(m.x + dx, m.y + dy, m.z, ELEMENT_FX[def.area.element]);
      this.damagePlayer(rand(def.area.dmg[0], def.area.dmg[1]), def.area.element, m, false);
      m.nextAttack = this.time + ATTACK_MS;
      return;
    }
    const r = def.ranged;
    if (r && d <= r.range && (d > 1 || !def.melee) && Math.random() < (def.melee && d <= 1 ? r.chance * 0.5 : Math.max(r.chance, 0.6)) && this.los(m, p, m.z)) {
      this.faceTo(m, p);
      this.emit({ t: 'missile', fx: m.x, fy: m.y, tx: p.x, ty: p.y, z: m.z, kind: r.missile });
      this.damagePlayer(rand(r.dmg[0], r.dmg[1]), r.element, m, false);
      m.nextAttack = this.time + ATTACK_MS;
      return;
    }
    if (def.melee && d <= 1) {
      this.faceTo(m, p);
      this.damagePlayer(rand(def.melee[0], def.melee[1]), 'physical', m, true);
      m.nextAttack = this.time + ATTACK_MS;
      return;
    }
    if (acted) m.nextAttack = this.time + ATTACK_MS;
  }

  private npcThink(n: Creature) {
    const p = this.player;
    const talking = p.talkingTo === n.id;
    if (talking) {
      this.faceTo(n, p);
      return;
    }
    if (n.nextIdle !== undefined && this.time >= n.nextIdle) {
      n.nextIdle = this.time + rand(25_000, 60_000);
      const lines = n.npc?.idle;
      if (lines && cheb(n, p) <= 6 && p.z === n.z) this.npcSay(n, lines[rand(0, lines.length - 1)]);
    }
    const r = n.npc?.wander ?? 0;
    if (r > 0 && this.time >= n.nextMove && Math.random() < 0.2) {
      const dx = rand(-1, 1);
      const dy = rand(-1, 1);
      const nx = n.x + dx;
      const ny = n.y + dy;
      if (Math.abs(nx - n.homeX!) <= r && Math.abs(ny - n.homeY!) <= r && !this.map.isStairs(nx, ny, n.z) && this.map.isPz(nx, ny, n.z)) this.step(n, dx, dy);
      n.nextMove = this.time + rand(1500, 4000);
    }
  }

  npcSay(n: Creature, text: string) {
    this.speak(n, text.replace(/[{}]/g, ''), '#7fd6ff', Math.min(9000, 2500 + text.length * 45));
    this.emit({ t: 'chat', name: n.name, text, npc: true });
  }

  // ======================================================================
  //                          Hablar y hechizos
  // ======================================================================

  say(raw: string) {
    const p = this.player;
    const text = raw.trim();
    if (!text || p.dead) return;
    const t = normalize(text);
    const spell = SPELLS.find((s) => normalize(s.words) === t);
    this.speak(p, text);
    this.emit({ t: 'chat', name: p.name, text, npc: false });
    if (spell) {
      this.cast(spell.id, true);
      return;
    }
    // ¿Con qué NPC hablamos?
    let npc = p.talkingTo !== null ? this.creatures.get(p.talkingTo) : undefined;
    if (!npc) {
      let best: Creature | undefined;
      for (const c of this.creatures.values()) {
        if (c.kind !== 'npc' || c.z !== p.z) continue;
        const d = cheb(c, p);
        if (d <= 3 && (!best || d < cheb(best, p))) best = c;
      }
      npc = best;
    }
    if (npc) hear(this, npc, t);
  }

  /** Hace clic en un NPC: se acerca y lo saluda. */
  talkTo(id: number) {
    const p = this.player;
    const n = this.creatures.get(id);
    if (!n || n.kind !== 'npc') return;
    if (cheb(n, p) > 3) {
      this.walkTo(n.x, n.y);
      return;
    }
    if (p.talkingTo === id) return;
    if (p.talkingTo !== null) p.talkingTo = null;
    this.say('hola');
  }

  spellValue(s: SpellDef): number {
    const p = this.player;
    const w = this.equipped('weapon');
    let base: number;
    if (p.voc === 'guerrero') base = p.level / 5 + p.skills.melee.lvl + (w?.attack ?? 5) / 2 + 10;
    else if (p.voc === 'arquero' && s.kind !== 'heal') base = p.level / 5 + p.skills.dist.lvl + (w?.attack ?? 5) / 2 + 10;
    else base = p.level / 5 + p.skills.magic.lvl + 10;
    const { min, max } = s.power ?? { min: 1, max: 1 };
    return Math.round(base * (min + Math.random() * (max - min)));
  }

  cast(spellId: string, spoken = false): boolean {
    const p = this.player;
    const s = SPELLS.find((sp) => sp.id === spellId);
    if (!s || p.dead) return false;
    const fail = (m: string) => {
      this.msg(m, 'gray');
      this.fx(p.x, p.y, p.z, 'poff');
      return false;
    };
    if (!p.spells.includes(s.id)) return fail('No conoces ese hechizo.');
    if (!s.voc.includes(p.voc)) return fail('Tu vocación no puede usar ese hechizo.');
    if (p.level < s.level) return fail(`Necesitas nivel ${s.level}.`);
    if (p.mana < s.mana) return fail('No tienes maná suficiente.');
    if (this.time < p.exhaustUntil) return fail('Estás agotado.');
    if ((p.spellCd[s.id] ?? 0) > this.time) return fail('El hechizo aún no está listo.');
    if (!spoken) this.speak(p, s.words, '#ffb347', 2000);
    switch (s.kind) {
      case 'heal': {
        const v = this.spellValue(s);
        p.hp = Math.min(p.maxHp, p.hp + v);
        this.fx(p.x, p.y, p.z, 'heal');
        this.emit({ t: 'dmg', x: p.x, y: p.y, z: p.z, text: `+${v}`, color: '#7fe07f' });
        this.sound('heal');
        break;
      }
      case 'target': {
        const t = p.target !== null ? this.creatures.get(p.target) : undefined;
        if (!t || t.dead) return fail('Necesitas un objetivo.');
        if (cheb(p, t) > (s.range ?? 4) || !this.los(p, t, p.z)) return fail('Tu objetivo está demasiado lejos.');
        if (this.map.isPz(p.x, p.y, p.z)) return fail('No puedes atacar en una zona protegida.');
        const el = s.element ?? 'physical';
        if ((s.range ?? 4) > 1) this.emit({ t: 'missile', fx: p.x, fy: p.y, tx: t.x, ty: t.y, z: p.z, kind: el === 'fire' ? 'fire' : el === 'ice' ? 'ice' : el === 'holy' ? 'holy' : el === 'earth' ? 'poison' : el === 'physical' ? 'arrow' : 'energy' });
        this.faceTo(p, t);
        this.damageMonster(t, this.spellValue(s), el, 'magic');
        this.sound('spell');
        break;
      }
      case 'area': {
        if (this.map.isPz(p.x, p.y, p.z)) return fail('No puedes atacar en una zona protegida.');
        const r = s.radius ?? 1;
        const el = s.element ?? 'physical';
        for (let dy = -r; dy <= r; dy++)
          for (let dx = -r; dx <= r; dx++) if ((dx || dy) && this.map.walkable(p.x + dx, p.y + dy, p.z)) this.fx(p.x + dx, p.y + dy, p.z, ELEMENT_FX[el]);
        for (const c of [...this.creatures.values()]) if (c.kind === 'monster' && !c.dead && c.z === p.z && cheb(c, p) <= r) this.damageMonster(c, this.spellValue(s), el, 'magic');
        this.sound('spell');
        break;
      }
      case 'haste':
        p.hasteUntil = this.time + (s.duration ?? 30) * 1000;
        this.fx(p.x, p.y, p.z, 'energy');
        this.sound('spell');
        break;
      case 'light':
        p.lightUntil = this.time + (s.duration ?? 300) * 1000;
        p.lightRadius = 6;
        this.fx(p.x, p.y, p.z, 'holy');
        this.sound('spell');
        break;
      case 'conjure': {
        const c = s.conjure!;
        if (this.addItem(c.item, c.count) <= 0) return fail('No tienes sitio o capacidad.');
        this.fx(p.x, p.y, p.z, 'energy');
        this.sound('spell');
        break;
      }
    }
    p.mana -= s.mana;
    this.train('magic', s.mana);
    p.exhaustUntil = this.time + EXHAUST_MS;
    p.spellCd[s.id] = this.time + s.cd * 1000;
    return true;
  }

  useHotbar(i: number) {
    const entry = this.player.hotbar[i];
    if (!entry) return;
    const [kind, id] = entry.split(':');
    if (kind === 'spell') this.cast(id);
    else {
      const idx = this.player.inv.findIndex((s) => s.id === id);
      if (idx < 0) this.msg(`No te quedan ${item(id).name}.`, 'gray');
      else this.useItem(idx);
    }
  }

  // ======================================================================
  //                          Inventario
  // ======================================================================

  count(id: string): number {
    let n = 0;
    for (const s of this.player.inv) if (s.id === id) n += s.n;
    return n;
  }

  /** Añade objetos. Devuelve cuántos cupieron. */
  addItem(id: string, n: number, ignoreCap = false): number {
    const p = this.player;
    const def = item(id);
    if (id === 'oro') {
      p.gold += n;
      this.emit({ t: 'inv' });
      return n;
    }
    let fit = n;
    if (!ignoreCap && def.weight > 0) fit = Math.min(n, Math.floor((this.freeCap() + 1e-6) / def.weight));
    let added = 0;
    if (def.stack) {
      const s = p.inv.find((st) => st.id === id);
      if (s) {
        s.n += fit;
        added = fit;
      } else if (p.inv.length < INV_SLOTS || ignoreCap) {
        p.inv.push({ id, n: fit });
        added = fit;
      }
    } else {
      while (added < fit && (p.inv.length < INV_SLOTS || ignoreCap)) {
        p.inv.push({ id, n: 1 });
        added++;
      }
    }
    if (added > 0) this.emit({ t: 'inv' });
    return added;
  }

  removeItem(id: string, n: number): boolean {
    const p = this.player;
    if (this.count(id) < n) return false;
    let left = n;
    for (let i = p.inv.length - 1; i >= 0 && left > 0; i--) {
      const s = p.inv[i];
      if (s.id !== id) continue;
      const take = Math.min(left, s.n);
      s.n -= take;
      left -= take;
      if (s.n <= 0) p.inv.splice(i, 1);
    }
    this.emit({ t: 'inv' });
    return true;
  }

  useItem(idx: number) {
    const p = this.player;
    const s = p.inv[idx];
    if (!s || p.dead) return;
    const def = item(s.id);
    switch (def.kind) {
      case 'food':
        if (p.food + (def.food ?? 0) > FOOD_MAX) {
          this.msg('Estás lleno.', 'gray');
          return;
        }
        p.food += def.food ?? 0;
        this.removeItem(s.id, 1);
        this.speak(p, 'Ñam ñam.', '#ffb347', 1500);
        this.sound('eat');
        return;
      case 'potion':
        if (this.time < p.exhaustUntil) return void this.msg('Estás agotado.', 'gray');
        if (def.level && p.level < def.level) return void this.msg(`Necesitas nivel ${def.level}.`, 'gray');
        if (def.heal?.hp) {
          const v = Math.min(def.heal.hp, p.maxHp - p.hp);
          p.hp += v;
          this.emit({ t: 'dmg', x: p.x, y: p.y, z: p.z, text: `+${v}`, color: '#7fe07f' });
        }
        if (def.heal?.mana) {
          const v = Math.min(def.heal.mana, this.maxMana() - p.mana);
          p.mana += v;
          this.emit({ t: 'dmg', x: p.x, y: p.y, z: p.z, text: `+${v}`, color: '#7fb0ff' });
        }
        this.removeItem(s.id, 1);
        this.fx(p.x, p.y, p.z, 'heal');
        this.speak(p, 'Aaah...', '#ffb347', 1200);
        this.sound('heal');
        p.exhaustUntil = this.time + EXHAUST_MS;
        return;
      case 'tool':
        if (s.id === 'antorcha') {
          this.removeItem(s.id, 1);
          p.lightUntil = Math.max(p.lightUntil, this.time) + 600_000;
          p.lightRadius = Math.max(p.lightUntil > this.time ? p.lightRadius : 0, 5);
          this.msg('Enciendes una antorcha. Durará unos 10 minutos.', 'white');
        }
        return;
      case 'weapon':
      case 'armor':
        this.equip(idx);
        return;
      default:
        this.msg(def.desc ?? `Es ${def.name}.`, 'gray');
    }
  }

  equip(idx: number) {
    const p = this.player;
    const s = p.inv[idx];
    if (!s) return;
    const def = item(s.id);
    if (!def.slot) return;
    if (def.voc && !def.voc.includes(p.voc)) return void this.msg(`Solo pueden usarlo: ${def.voc.map((v) => VOCATIONS[v].name).join(', ')}.`, 'gray');
    if (def.level && p.level < def.level) return void this.msg(`Necesitas nivel ${def.level}.`, 'gray');
    p.inv.splice(idx, 1);
    const old = p.equip[def.slot];
    p.equip[def.slot] = def.id;
    if (old) p.inv.push({ id: old, n: 1 });
    // Los arcos se usan con las dos manos
    if (def.weaponType === 'bow' && p.equip.shield) {
      p.inv.push({ id: p.equip.shield, n: 1 });
      delete p.equip.shield;
      this.msg('Los arcos necesitan las dos manos: guardas el escudo.', 'gray');
    }
    if (def.slot === 'shield' && this.equipped('weapon')?.weaponType === 'bow') {
      p.inv.push({ id: p.equip.weapon!, n: 1 });
      delete p.equip.weapon;
      this.msg('Necesitas una mano libre para el escudo: guardas el arco.', 'gray');
    }
    this.msg(`Te equipas: ${def.name}.`, 'white');
    this.emit({ t: 'inv' });
  }

  unequip(slot: Slot) {
    const p = this.player;
    const id = p.equip[slot];
    if (!id) return;
    if (p.inv.length >= INV_SLOTS) return void this.msg('Tu mochila está llena.', 'gray');
    delete p.equip[slot];
    p.inv.push({ id, n: 1 });
    this.emit({ t: 'inv' });
  }

  destroyItem(idx: number) {
    const p = this.player;
    const s = p.inv[idx];
    if (!s) return;
    p.inv.splice(idx, 1);
    this.msg(`Tiras: ${s.n > 1 ? s.n + ' ' : ''}${item(s.id).name}.`, 'gray');
    this.emit({ t: 'inv' });
  }

  setHotbar(i: number, entry: string | null) {
    this.player.hotbar[i] = entry;
  }

  // ======================================================================
  //                          Cadáveres y botín
  // ======================================================================

  corpseAt(x: number, y: number, z: number): Corpse | undefined {
    for (let i = this.corpses.length - 1; i >= 0; i--) {
      const c = this.corpses[i];
      if (c.x === x && c.y === y && c.z === z) return c;
    }
    return undefined;
  }

  /** Abre un cadáver si está al lado; si no, camina hacia él. */
  canLoot(c: Corpse): boolean {
    const p = this.player;
    if (c.z === p.z && cheb(c, p) <= 1) return true;
    this.walkTo(c.x, c.y);
    return false;
  }

  takeFromCorpse(c: Corpse, idx: number): boolean {
    const s = c.items[idx];
    if (!s || cheb(c, this.player) > 1) return false;
    const n = this.addItem(s.id, s.n);
    if (n <= 0) {
      this.msg(this.player.inv.length >= INV_SLOTS ? 'Tu mochila está llena.' : 'No puedes cargar tanto peso.', 'gray');
      return false;
    }
    if (s.id === 'oro') this.sound('coin');
    s.n -= n;
    if (s.n <= 0) c.items.splice(idx, 1);
    return true;
  }

  lootAll(c: Corpse) {
    for (let i = c.items.length - 1; i >= 0; i--) this.takeFromCorpse(c, i);
  }

  /** Recoge todo de los cadáveres adyacentes (atajo de teclado). */
  lootNearby() {
    const p = this.player;
    let any = false;
    for (const c of this.corpses) {
      if (c.z !== p.z || cheb(c, p) > 1 || !c.items.length) continue;
      this.lootAll(c);
      any = true;
    }
    if (!any) this.msg('No hay nada que recoger a tu alrededor.', 'gray');
  }

  // ======================================================================
  //                          Comercio
  // ======================================================================

  private shopNpc(npcId: string): Creature | undefined {
    const p = this.player;
    const n = p.talkingTo !== null ? this.creatures.get(p.talkingTo) : undefined;
    return n?.npc?.id === npcId && cheb(n, p) <= 4 ? n : undefined;
  }

  buy(npcId: string, itemId: string, n: number): boolean {
    const npc = this.shopNpc(npcId);
    const offer = npc?.npc?.shop?.sells?.find(([id]) => id === itemId);
    if (!npc || !offer) return false;
    const p = this.player;
    const price = offer[1] * n;
    if (p.gold < price) return void this.msg('No tienes suficiente oro.', 'gray'), false;
    const added = this.addItem(itemId, n);
    if (added <= 0) return void this.msg(p.inv.length >= INV_SLOTS ? 'Tu mochila está llena.' : 'No puedes cargar tanto peso.', 'gray'), false;
    p.gold -= offer[1] * added;
    this.sound('coin');
    this.msg(`Compras ${added > 1 ? added + ' ' : ''}${item(itemId).name} por ${offer[1] * added} de oro.`, 'white');
    return true;
  }

  sell(npcId: string, itemId: string, n: number): boolean {
    const npc = this.shopNpc(npcId);
    if (!npc || !npc.npc?.shop?.buys?.includes(itemId)) return false;
    const have = this.count(itemId);
    const k = Math.min(have, n);
    if (k <= 0) return false;
    const value = item(itemId).value * k;
    this.removeItem(itemId, k);
    this.player.gold += value;
    this.sound('coin');
    this.msg(`Vendes ${k > 1 ? k + ' ' : ''}${item(itemId).name} por ${value} de oro.`, 'white');
    return true;
  }

  // ======================================================================
  //                          Mirar
  // ======================================================================

  look(x: number, y: number) {
    const p = this.player;
    const z = p.z;
    if (!this.isExplored(x, y, z)) return;
    const c = this.creatureAt(x, y, z);
    if (c) {
      if (c.kind === 'player') return void this.msg(`Te ves a ti mismo: ${p.name}, ${VOCATIONS[p.voc].name.toLowerCase()} de nivel ${p.level}.`, 'gray');
      if (c.kind === 'npc') return void this.msg(`Ves a ${c.name}. ${c.npc?.job ?? ''}`.replace(/[{}]/g, ''), 'gray');
      const def = c.def as MonsterDef;
      return void this.msg(`Ves a un ${def.name} (${Math.max(0, Math.round((c.hp / c.maxHp) * 100))}% de vida). ${def.desc}`, 'gray');
    }
    const corpse = this.corpseAt(x, y, z);
    if (corpse) return void this.msg(`Ves el cadáver de ${corpse.name}.${corpse.items.length ? ' Puede que tenga algo.' : ' Está vacío.'}`, 'gray');
    const o = this.map.o(x, y, z);
    if (o !== O.NONE) {
      const od = OBJECTS[o];
      return void this.msg(`Ves: ${od.name}.${od.desc ? ' ' + od.desc : ''}`, 'gray');
    }
    const gr = this.map.g(x, y, z);
    if (gr === G.ROCK) return void this.msg('Ves roca maciza.', 'gray');
    this.msg(`Ves: ${GROUNDS[gr].name}.`, 'gray');
  }

  // ======================================================================
  //                          Vocación, viajes, misiones
  // ======================================================================

  chooseVocation(v: VocId) {
    const p = this.player;
    p.voc = v;
    p.maxHp = this.maxHp();
    p.hp = p.maxHp;
    p.mana = this.maxMana();
    const starter: Record<string, [string, number][]> = {
      guerrero: [['espada_corta', 1], ['pocion_vida', 5]],
      arquero: [['arco', 1], ['flecha', 100], ['pocion_vida', 3], ['pocion_mana', 3]],
      brujo: [['varita_chispa', 1], ['pocion_mana', 6]],
      chaman: [['baculo_musgo', 1], ['pocion_mana', 6]],
    };
    for (const [id, n] of starter[v] ?? []) this.addItem(id, n, true);
    this.msg(`¡Ahora eres ${VOCATIONS[v].name.toLowerCase()}! Equipa tu nueva arma desde la mochila.`, 'yellow');
    this.fx(p.x, p.y, p.z, 'levelup');
    this.msg('En Valcorona, la capital (siguiendo el camino al este de Albor), la Maestra Selene enseña los hechizos de tu vocación.', 'yellow');
    this.sound('quest');
  }

  travelTo(town: string) {
    const p = this.player;
    const npcPlace = this.map.npcs.find((n) => NPCS[n.npc].town === town && NPCS[n.npc].roles?.includes('travel'));
    const dest = npcPlace ? this.findFreeNear(npcPlace.x, npcPlace.y, npcPlace.z, 3) : this.map.temples[town];
    if (!dest) return;
    p.talkingTo = null;
    this.teleport(p, dest.x, dest.y, 0);
    this.fx(p.x, p.y, p.z, 'teleport');
    this.emit({ t: 'floor' });
  }

  completeQuest(id: string) {
    const p = this.player;
    const q = QUEST_BY_ID[id];
    const st = p.quests[id];
    st.state = 'done';
    const r = q.reward;
    if (r.gold) {
      p.gold += r.gold;
      this.msg(`Recibes ${r.gold} de oro.`, 'green');
    }
    for (const [it, n] of r.items ?? []) {
      this.addItem(it, n, true);
      this.msg(`Recibes: ${n > 1 ? n + ' ' : ''}${item(it).name}.`, 'green');
    }
    const vi = r.vocItems?.[p.voc];
    if (vi) {
      this.addItem(vi, 1, true);
      this.msg(`Recibes: ${item(vi).name}.`, 'green');
    }
    this.msg(`Misión completada: «${q.name}».`, 'yellow');
    this.sound('quest');
    if (r.exp) this.gainExp(r.exp);
    this.emit({ t: 'inv' });
    if (q.ending) {
      p.ended = true;
      this.emit({ t: 'ending' });
    }
  }

  // ======================================================================
  //                          Guardar
  // ======================================================================

  save(): PlayerData {
    const p = this.player;
    const toB64 = (bits: Uint8Array) => {
      let s = '';
      for (let i = 0; i < bits.length; i++) s += String.fromCharCode(bits[i]);
      return btoa(s);
    };
    const safe = p.dead || !this.map.walkable(p.x, p.y, p.z) ? this.map.temples[p.home] : { x: p.x, y: p.y, z: p.z };
    return {
      version: 1, name: p.name, look: p.look, voc: p.voc, level: p.level, exp: p.exp,
      hp: p.dead ? this.maxHp() : p.hp, mana: p.mana, gold: p.gold, food: p.food,
      skills: structuredClone(p.skills), inv: structuredClone(p.inv), equip: { ...p.equip },
      spells: [...p.spells], hotbar: [...p.hotbar], quests: structuredClone(p.quests), home: p.home,
      pos: { ...safe }, explored: p.exploredBits.map(toB64), worldTime: p.worldTime + this.time,
      stats: { ...p.stats }, ended: p.ended,
      houses: [...(p.houses ?? [])], depot: structuredClone(p.depot ?? []),
    };
  }
}
