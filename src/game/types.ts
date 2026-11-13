// Tipos compartidos entre la simulación, el dibujo y la interfaz.
import type { Element, Slot } from '../data/items';
import type { Look, MonsterDef, Missile } from '../data/monsters';
import type { NpcDef } from '../data/npcs';
import type { VocId } from '../data/vocations';

/** 0 = sur, 1 = oeste, 2 = norte, 3 = este. */
export type Dir = 0 | 1 | 2 | 3;

export interface Stack {
  id: string;
  n: number;
}

export interface Creature {
  id: number;
  kind: 'player' | 'monster' | 'npc';
  name: string;
  look: Look;
  x: number;
  y: number;
  z: number;
  dir: Dir;
  hp: number;
  maxHp: number;
  // Animación del paso
  fromX: number;
  fromY: number;
  moveStart: number;
  moveDur: number;
  nextMove: number;
  nextAttack: number;
  nextThink: number;
  speech?: { text: string; until: number; color: string };
  dead?: boolean;
  // Criaturas
  def?: MonsterDef;
  spawn?: number;
  provoked?: boolean;
  summoner?: number;
  hurtByPlayer?: boolean;
  // NPC
  npc?: NpcDef;
  homeX?: number;
  homeY?: number;
  pending?: Pending;
  nextIdle?: number;
}

export type Pending =
  | { kind: 'quest'; quest: string }
  | { kind: 'vocation'; voc: VocId }
  | { kind: 'travel'; town: string; price: number }
  | { kind: 'learn'; spell: string; price: number };

export interface Skill {
  lvl: number;
  tries: number;
}

export interface QuestState {
  state: 'active' | 'done';
  count: number;
}

/** Todo lo que se guarda del jugador. */
export interface PlayerData {
  version: 1;
  name: string;
  look: Look;
  voc: VocId;
  level: number;
  exp: number;
  hp: number;
  mana: number;
  gold: number;
  food: number;
  skills: { melee: Skill; dist: Skill; shield: Skill; magic: Skill };
  inv: Stack[];
  equip: Partial<Record<Slot, string>>;
  spells: string[];
  hotbar: (string | null)[];
  quests: Record<string, QuestState>;
  home: string;
  pos: { x: number; y: number; z: number };
  explored: string[];
  worldTime: number;
  stats: { kills: number; deaths: number; playMs: number };
  ended?: boolean;
}

export interface Corpse {
  id: number;
  x: number;
  y: number;
  z: number;
  name: string;
  look: Look;
  items: Stack[];
  until: number;
}

export type FxKind = 'hit' | 'block' | 'miss' | 'fire' | 'ice' | 'earth' | 'energy' | 'holy' | 'death' | 'heal' | 'poff' | 'levelup' | 'teleport' | 'physical';

export type MsgColor = 'white' | 'green' | 'red' | 'orange' | 'yellow' | 'blue' | 'gray' | 'purple';

export type GameEvent =
  | { t: 'msg'; text: string; color: MsgColor }
  | { t: 'dmg'; x: number; y: number; z: number; text: string; color: string }
  | { t: 'fx'; x: number; y: number; z: number; kind: FxKind }
  | { t: 'missile'; fx: number; fy: number; tx: number; ty: number; z: number; kind: Missile }
  | { t: 'chat'; name: string; text: string; npc: boolean }
  | { t: 'shop'; npc: string }
  | { t: 'levelup'; level: number }
  | { t: 'death' }
  | { t: 'floor' }
  | { t: 'area'; name: string }
  | { t: 'sound'; s: SoundName }
  | { t: 'ending' }
  | { t: 'inv' };

export type SoundName = 'hit' | 'miss' | 'hurt' | 'kill' | 'level' | 'spell' | 'heal' | 'coin' | 'step' | 'death' | 'quest' | 'eat' | 'stairs' | 'bow' | 'door';

export const ELEMENT_FX: Record<Element, FxKind> = {
  physical: 'hit', fire: 'fire', ice: 'ice', earth: 'earth', energy: 'energy', holy: 'holy', death: 'death',
};

export const ELEMENT_COLOR: Record<Element, string> = {
  physical: '#ff4040', fire: '#ff9a30', ice: '#7fe0ff', earth: '#7ad04a', energy: '#c07aff', holy: '#ffe070', death: '#a0a0c0',
};

export const ELEMENT_NAME: Record<Element, string> = {
  physical: 'físico', fire: 'fuego', ice: 'hielo', earth: 'tierra', energy: 'energía', holy: 'sagrado', death: 'muerte',
};
