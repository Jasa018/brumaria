// Objetos: armas, armaduras, comida, pociones, botín y objetos de misión.
import type { VocId } from './vocations';

export type Slot = 'head' | 'body' | 'legs' | 'feet' | 'weapon' | 'shield' | 'neck' | 'ring';

export type ItemKind =
  | 'weapon' | 'armor' | 'food' | 'potion' | 'ammo' | 'loot' | 'gold' | 'quest' | 'tool';

export type Element = 'physical' | 'fire' | 'ice' | 'earth' | 'energy' | 'holy' | 'death';

export type Icon =
  | 'sword' | 'axe' | 'club' | 'bow' | 'wand' | 'rod' | 'arrow' | 'armor' | 'helmet' | 'legs' | 'boots'
  | 'shield' | 'amulet' | 'ring' | 'meat' | 'bread' | 'fish' | 'apple' | 'cheese' | 'potion' | 'coin'
  | 'bone' | 'fang' | 'pelt' | 'ore' | 'eye' | 'scale' | 'tail' | 'skull' | 'key' | 'torch' | 'gem'
  | 'leaf' | 'feather' | 'web' | 'claw' | 'scroll' | 'cloth' | 'mushroom' | 'heart' | 'horn';

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  icon: Icon;
  /** Color principal y secundario del icono. */
  c1: string;
  c2?: string;
  weight: number;
  stack?: boolean;
  /** Precio al que lo compran los mercaderes (0 = nadie lo compra). */
  value: number;
  desc?: string;
  slot?: Slot;
  // Combate
  attack?: number;
  defense?: number;
  armor?: number;
  range?: number;
  weaponType?: 'melee' | 'bow' | 'wand';
  /** Varitas: daño y maná por disparo. */
  dmg?: [number, number];
  manaCost?: number;
  element?: Element;
  voc?: VocId[];
  level?: number;
  /** Bonus de velocidad (botas) o de regeneración (anillos). */
  speed?: number;
  regen?: number;
  // Consumibles
  food?: number; // segundos de saciedad
  heal?: { hp?: number; mana?: number };
}

const ITEM_LIST: ItemDef[] = [
  // ---- Dinero ----
  { id: 'oro', name: 'moneda de oro', kind: 'gold', icon: 'coin', c1: '#f2c94c', c2: '#b8860b', weight: 0.1, stack: true, value: 1 },

  // ---- Armas cuerpo a cuerpo ----
  { id: 'garrote', name: 'garrote', kind: 'weapon', slot: 'weapon', weaponType: 'melee', icon: 'club', c1: '#8a5a2b', weight: 25, value: 1, attack: 7, defense: 3 },
  { id: 'daga', name: 'daga', kind: 'weapon', slot: 'weapon', weaponType: 'melee', icon: 'sword', c1: '#c0c6cc', c2: '#6b4a2a', weight: 9, value: 2, attack: 8, defense: 6 },
  { id: 'espada_corta', name: 'espada corta', kind: 'weapon', slot: 'weapon', weaponType: 'melee', icon: 'sword', c1: '#d7dde2', c2: '#7a5530', weight: 35, value: 10, attack: 11, defense: 10 },
  { id: 'hacha', name: 'hacha', kind: 'weapon', slot: 'weapon', weaponType: 'melee', icon: 'axe', c1: '#b9bec3', c2: '#6b4a2a', weight: 40, value: 15, attack: 13, defense: 8 },
  { id: 'maza', name: 'maza', kind: 'weapon', slot: 'weapon', weaponType: 'melee', icon: 'club', c1: '#9aa0a6', c2: '#5a3a1a', weight: 38, value: 30, attack: 16, defense: 11, voc: ['guerrero'] },
  { id: 'espada_larga', name: 'espada larga', kind: 'weapon', slot: 'weapon', weaponType: 'melee', icon: 'sword', c1: '#e8edf0', c2: '#3e5fa8', weight: 42, value: 80, attack: 20, defense: 14, voc: ['guerrero'], level: 10 },
  { id: 'hacha_enana', name: 'hacha enana', kind: 'weapon', slot: 'weapon', weaponType: 'melee', icon: 'axe', c1: '#d9a441', c2: '#4a2f17', weight: 55, value: 300, attack: 28, defense: 16, voc: ['guerrero'], level: 20, desc: 'Forjada en Hondaforja.' },
  { id: 'espada_ceniza', name: 'espada de ceniza', kind: 'weapon', slot: 'weapon', weaponType: 'melee', icon: 'sword', c1: '#ff7a3d', c2: '#2a2a2a', weight: 48, value: 1200, attack: 36, defense: 20, voc: ['guerrero'], level: 30, element: 'fire', desc: 'Aún humea.' },

  // ---- Distancia ----
  { id: 'honda', name: 'honda', kind: 'weapon', slot: 'weapon', weaponType: 'bow', icon: 'bow', c1: '#8a5a2b', weight: 5, value: 3, attack: 6, range: 4, desc: 'No necesita flechas.' },
  { id: 'arco', name: 'arco', kind: 'weapon', slot: 'weapon', weaponType: 'bow', icon: 'bow', c1: '#a8743c', weight: 31, value: 40, attack: 12, range: 6, voc: ['arquero'] },
  { id: 'arco_compuesto', name: 'arco compuesto', kind: 'weapon', slot: 'weapon', weaponType: 'bow', icon: 'bow', c1: '#4a7a3a', c2: '#d9a441', weight: 35, value: 250, attack: 20, range: 6, voc: ['arquero'], level: 15 },
  { id: 'arco_ceniza', name: 'arco de ceniza', kind: 'weapon', slot: 'weapon', weaponType: 'bow', icon: 'bow', c1: '#ff7a3d', c2: '#2a2a2a', weight: 38, value: 1200, attack: 30, range: 7, voc: ['arquero'], level: 30, element: 'fire' },
  { id: 'flecha', name: 'flecha', kind: 'ammo', icon: 'arrow', c1: '#c9b48a', weight: 0.7, stack: true, value: 0, attack: 0, desc: 'Munición para arcos.' },
  { id: 'flecha_fuego', name: 'flecha de fuego', kind: 'ammo', icon: 'arrow', c1: '#ff7a3d', weight: 0.8, stack: true, value: 0, attack: 6, element: 'fire', desc: 'Munición para arcos. Quema.' },

  // ---- Varitas (brujo) y báculos (chamán) ----
  { id: 'varita_chispa', name: 'varita de chispas', kind: 'weapon', slot: 'weapon', weaponType: 'wand', icon: 'wand', c1: '#7a5cff', c2: '#f2f2f2', weight: 19, value: 50, range: 4, dmg: [8, 18], manaCost: 2, element: 'energy', voc: ['brujo'] },
  { id: 'varita_brasa', name: 'varita de brasas', kind: 'weapon', slot: 'weapon', weaponType: 'wand', icon: 'wand', c1: '#ff7a3d', c2: '#ffd23f', weight: 19, value: 200, range: 4, dmg: [18, 34], manaCost: 4, element: 'fire', voc: ['brujo'], level: 13 },
  { id: 'varita_tormenta', name: 'varita de tormenta', kind: 'weapon', slot: 'weapon', weaponType: 'wand', icon: 'wand', c1: '#4ad0ff', c2: '#ffffff', weight: 19, value: 800, range: 4, dmg: [32, 56], manaCost: 7, element: 'energy', voc: ['brujo'], level: 26 },
  { id: 'baculo_musgo', name: 'báculo de musgo', kind: 'weapon', slot: 'weapon', weaponType: 'wand', icon: 'rod', c1: '#4caf50', c2: '#6b4a2a', weight: 19, value: 50, range: 4, dmg: [8, 18], manaCost: 2, element: 'earth', voc: ['chaman'] },
  { id: 'baculo_escarcha', name: 'báculo de escarcha', kind: 'weapon', slot: 'weapon', weaponType: 'wand', icon: 'rod', c1: '#9fe3ff', c2: '#6b4a2a', weight: 19, value: 200, range: 4, dmg: [18, 34], manaCost: 4, element: 'ice', voc: ['chaman'], level: 13 },
  { id: 'baculo_glaciar', name: 'báculo glaciar', kind: 'weapon', slot: 'weapon', weaponType: 'wand', icon: 'rod', c1: '#e0f7ff', c2: '#3e5fa8', weight: 19, value: 800, range: 4, dmg: [32, 56], manaCost: 7, element: 'ice', voc: ['chaman'], level: 26 },

  // ---- Escudos ----
  { id: 'escudo_madera', name: 'escudo de madera', kind: 'armor', slot: 'shield', icon: 'shield', c1: '#8a5a2b', c2: '#5a3a1a', weight: 40, value: 5, defense: 14 },
  { id: 'escudo_hierro', name: 'escudo de hierro', kind: 'armor', slot: 'shield', icon: 'shield', c1: '#9aa0a6', c2: '#5c5c66', weight: 60, value: 40, defense: 19 },
  { id: 'escudo_corona', name: 'escudo de la Corona', kind: 'armor', slot: 'shield', icon: 'shield', c1: '#3e5fa8', c2: '#f2c94c', weight: 70, value: 400, defense: 27, level: 15 },
  { id: 'escudo_escamas', name: 'escudo de escamas', kind: 'armor', slot: 'shield', icon: 'shield', c1: '#c0392b', c2: '#2a2a2a', weight: 75, value: 1500, defense: 33, level: 30 },
  { id: 'libro_runas', name: 'libro de runas', kind: 'armor', slot: 'shield', icon: 'scroll', c1: '#7a5cff', c2: '#2a2a2a', weight: 20, value: 150, defense: 12, voc: ['brujo', 'chaman'], regen: 2, desc: 'Regenera maná.' },

  // ---- Armaduras ----
  { id: 'gorro_cuero', name: 'gorro de cuero', kind: 'armor', slot: 'head', icon: 'helmet', c1: '#8a5a2b', weight: 22, value: 3, armor: 1 },
  { id: 'casco_hierro', name: 'casco de hierro', kind: 'armor', slot: 'head', icon: 'helmet', c1: '#9aa0a6', weight: 32, value: 30, armor: 3 },
  { id: 'casco_guardia', name: 'casco de guardia', kind: 'armor', slot: 'head', icon: 'helmet', c1: '#cfd6dc', c2: '#3e5fa8', weight: 40, value: 200, armor: 5, level: 15 },
  { id: 'capucha_mago', name: 'capucha de mago', kind: 'armor', slot: 'head', icon: 'helmet', c1: '#5a3fa0', weight: 10, value: 80, armor: 2, voc: ['brujo', 'chaman'], regen: 1 },
  { id: 'jubon', name: 'jubón de cuero', kind: 'armor', slot: 'body', icon: 'armor', c1: '#8a5a2b', weight: 60, value: 5, armor: 3 },
  { id: 'cota_malla', name: 'cota de malla', kind: 'armor', slot: 'body', icon: 'armor', c1: '#9aa0a6', weight: 100, value: 70, armor: 7 },
  { id: 'coraza', name: 'coraza de placas', kind: 'armor', slot: 'body', icon: 'armor', c1: '#cfd6dc', c2: '#3e5fa8', weight: 120, value: 400, armor: 10, level: 15, voc: ['guerrero', 'arquero'] },
  { id: 'tunica_mago', name: 'túnica de mago', kind: 'armor', slot: 'body', icon: 'armor', c1: '#5a3fa0', c2: '#f2c94c', weight: 30, value: 150, armor: 4, voc: ['brujo', 'chaman'], regen: 2 },
  { id: 'coraza_escamas', name: 'coraza de escamas', kind: 'armor', slot: 'body', icon: 'armor', c1: '#c0392b', c2: '#2a2a2a', weight: 110, value: 2000, armor: 14, level: 30 },
  { id: 'calzas', name: 'calzas de cuero', kind: 'armor', slot: 'legs', icon: 'legs', c1: '#8a5a2b', weight: 18, value: 3, armor: 1 },
  { id: 'grebas', name: 'grebas de hierro', kind: 'armor', slot: 'legs', icon: 'legs', c1: '#9aa0a6', weight: 35, value: 40, armor: 3 },
  { id: 'grebas_corona', name: 'grebas de la Corona', kind: 'armor', slot: 'legs', icon: 'legs', c1: '#cfd6dc', c2: '#3e5fa8', weight: 45, value: 300, armor: 6, level: 15 },
  { id: 'sandalias', name: 'sandalias', kind: 'armor', slot: 'feet', icon: 'boots', c1: '#a8743c', weight: 6, value: 2, armor: 0 },
  { id: 'botas_cuero', name: 'botas de cuero', kind: 'armor', slot: 'feet', icon: 'boots', c1: '#6b4a2a', weight: 9, value: 5, armor: 1 },
  { id: 'botas_viento', name: 'botas de viento', kind: 'armor', slot: 'feet', icon: 'boots', c1: '#9fe3ff', c2: '#ffffff', weight: 8, value: 500, armor: 1, speed: 20, level: 20, desc: 'Aumentan la velocidad.' },

  // ---- Joyas ----
  { id: 'amuleto_hueso', name: 'amuleto de hueso', kind: 'armor', slot: 'neck', icon: 'amulet', c1: '#e8e0c8', weight: 4, value: 20, armor: 1 },
  { id: 'amuleto_alba', name: 'amuleto del Alba', kind: 'armor', slot: 'neck', icon: 'amulet', c1: '#f2c94c', c2: '#ffffff', weight: 5, value: 600, armor: 3, regen: 3, desc: 'Bendecido en el templo de Valcorona.' },
  { id: 'anillo_vida', name: 'anillo de vida', kind: 'armor', slot: 'ring', icon: 'ring', c1: '#e05555', weight: 1, value: 150, regen: 3 },
  { id: 'anillo_bruma', name: 'anillo de bruma', kind: 'armor', slot: 'ring', icon: 'ring', c1: '#9fb8c8', weight: 1, value: 400, speed: 10, regen: 2, desc: 'Regalo de la bruja del pantano.' },

  // ---- Comida ----
  { id: 'manzana', name: 'manzana', kind: 'food', icon: 'apple', c1: '#d63c3c', weight: 1.5, stack: true, value: 1, food: 60 },
  { id: 'pan', name: 'pan', kind: 'food', icon: 'bread', c1: '#d9a45a', weight: 5, stack: true, value: 1, food: 120 },
  { id: 'queso', name: 'queso', kind: 'food', icon: 'cheese', c1: '#f2d14c', weight: 4, stack: true, value: 2, food: 108 },
  { id: 'pescado', name: 'pescado', kind: 'food', icon: 'fish', c1: '#8fb3c9', weight: 5, stack: true, value: 2, food: 144 },
  { id: 'carne', name: 'carne', kind: 'food', icon: 'meat', c1: '#b5523b', weight: 13, stack: true, value: 2, food: 180 },
  { id: 'jamon', name: 'jamón', kind: 'food', icon: 'meat', c1: '#d97a6b', weight: 20, stack: true, value: 4, food: 360 },
  { id: 'seta', name: 'seta blanca', kind: 'food', icon: 'mushroom', c1: '#efe6d6', c2: '#c9a27a', weight: 0.4, stack: true, value: 1, food: 108 },

  // ---- Pociones ----
  { id: 'pocion_vida', name: 'poción de vida', kind: 'potion', icon: 'potion', c1: '#e04040', weight: 1.8, stack: true, value: 0, heal: { hp: 75 } },
  { id: 'pocion_vida_g', name: 'gran poción de vida', kind: 'potion', icon: 'potion', c1: '#a01818', c2: '#f2c94c', weight: 2.5, stack: true, value: 0, heal: { hp: 250 }, level: 30 },
  { id: 'pocion_mana', name: 'poción de maná', kind: 'potion', icon: 'potion', c1: '#4060e0', weight: 1.8, stack: true, value: 0, heal: { mana: 80 } },
  { id: 'pocion_mana_g', name: 'gran poción de maná', kind: 'potion', icon: 'potion', c1: '#1830a0', c2: '#f2c94c', weight: 2.5, stack: true, value: 0, heal: { mana: 180 }, level: 30 },

  // ---- Herramientas ----
  { id: 'antorcha', name: 'antorcha', kind: 'tool', icon: 'torch', c1: '#ff9a3d', c2: '#6b4a2a', weight: 5, stack: true, value: 0, desc: 'Úsala para iluminar las cuevas durante un buen rato.' },

  // ---- Botín ----
  { id: 'cola_rata', name: 'cola de rata', kind: 'loot', icon: 'tail', c1: '#c98a8a', weight: 0.5, stack: true, value: 1 },
  { id: 'piel_serpiente', name: 'piel de serpiente', kind: 'loot', icon: 'scale', c1: '#6aa84f', weight: 1, stack: true, value: 4 },
  { id: 'piel_lobo', name: 'piel de lobo', kind: 'loot', icon: 'pelt', c1: '#8d8d8d', weight: 3, stack: true, value: 8 },
  { id: 'piel_oso', name: 'piel de oso', kind: 'loot', icon: 'pelt', c1: '#6b4a2a', weight: 6, stack: true, value: 25 },
  { id: 'colmillo', name: 'colmillo', kind: 'loot', icon: 'fang', c1: '#efe6d6', weight: 0.5, stack: true, value: 5 },
  { id: 'oreja_trasgo', name: 'oreja de trasgo', kind: 'loot', icon: 'leaf', c1: '#7a9a3a', weight: 0.5, stack: true, value: 6 },
  { id: 'hueso', name: 'hueso', kind: 'loot', icon: 'bone', c1: '#e8e0c8', weight: 2, stack: true, value: 2 },
  { id: 'craneo', name: 'cráneo', kind: 'loot', icon: 'skull', c1: '#e8e0c8', weight: 5, stack: true, value: 15 },
  { id: 'tela_sucia', name: 'tela sucia', kind: 'loot', icon: 'cloth', c1: '#8a8060', weight: 2, stack: true, value: 3 },
  { id: 'seda_arana', name: 'seda de araña', kind: 'loot', icon: 'web', c1: '#f2f2f2', weight: 0.5, stack: true, value: 12 },
  { id: 'ojo_sapo', name: 'ojo de sapo', kind: 'loot', icon: 'eye', c1: '#d9e04a', weight: 0.3, stack: true, value: 10 },
  { id: 'escama_lagarto', name: 'escama de lagarto', kind: 'loot', icon: 'scale', c1: '#3f8a6a', weight: 1, stack: true, value: 20 },
  { id: 'mineral_hierro', name: 'mineral de hierro', kind: 'loot', icon: 'ore', c1: '#8d8d8d', c2: '#c96a3a', weight: 10, stack: true, value: 15 },
  { id: 'nucleo_golem', name: 'núcleo de gólem', kind: 'loot', icon: 'gem', c1: '#4ad0ff', weight: 4, stack: true, value: 60 },
  { id: 'colmillo_troll', name: 'colmillo de troll', kind: 'loot', icon: 'horn', c1: '#d9d0a0', weight: 1, stack: true, value: 18 },
  { id: 'pluma_harpia', name: 'pluma de arpía', kind: 'loot', icon: 'feather', c1: '#c9a27a', weight: 0.2, stack: true, value: 14 },
  { id: 'garra', name: 'garra', kind: 'loot', icon: 'claw', c1: '#efe6d6', weight: 1, stack: true, value: 12 },
  { id: 'rubi', name: 'rubí', kind: 'loot', icon: 'gem', c1: '#e04040', weight: 0.1, stack: true, value: 150 },
  { id: 'zafiro', name: 'zafiro', kind: 'loot', icon: 'gem', c1: '#4060e0', weight: 0.1, stack: true, value: 150 },
  { id: 'esmeralda', name: 'esmeralda', kind: 'loot', icon: 'gem', c1: '#40c060', weight: 0.1, stack: true, value: 150 },
  { id: 'escama_dragon', name: 'escama de dragón', kind: 'loot', icon: 'scale', c1: '#c0392b', weight: 2, stack: true, value: 90 },
  { id: 'corazon_ceniza', name: 'corazón de ceniza', kind: 'quest', icon: 'heart', c1: '#ff7a3d', c2: '#2a2a2a', weight: 5, value: 0, desc: 'El corazón del wyrm Ignaroth. Aún late.' },

  // ---- Misiones ----
  { id: 'carta_teodoro', name: 'carta sellada', kind: 'quest', icon: 'scroll', c1: '#efe6d6', c2: '#c0392b', weight: 0.5, value: 0, desc: 'Para el capitán Bertrán de Valcorona.' },
  { id: 'filacteria', name: 'filacteria del nigromante', kind: 'quest', icon: 'skull', c1: '#7a5cff', weight: 3, value: 0, desc: 'El alma del nigromante Morvaine estaba encerrada aquí.' },
  { id: 'llave_mina', name: 'llave oxidada', kind: 'quest', icon: 'key', c1: '#c96a3a', weight: 1, value: 0 },
];

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(ITEM_LIST.map((i) => [i.id, i]));

export function item(id: string): ItemDef {
  const d = ITEMS[id];
  if (!d) throw new Error(`Objeto desconocido: ${id}`);
  return d;
}
