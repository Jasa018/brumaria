// Criaturas de Brumaria.
import type { Element } from './items';

export type Body = 'humanoid' | 'quad' | 'slime' | 'spider' | 'bat' | 'snake' | 'dragon' | 'golem' | 'ghost' | 'toad' | 'bird';

export interface Look {
  body: Body;
  /** Colores: principal, secundario, detalle. */
  c1: string;
  c2: string;
  c3?: string;
  /** Escala visual (los jefes se ven más grandes, pero ocupan una casilla). */
  scale?: number;
  // Solo humanoides
  skin?: string;
  hair?: string;
  weapon?: 'sword' | 'bow' | 'staff' | 'axe' | 'club' | 'none';
  hood?: boolean;
  helmet?: boolean;
}

export type Missile = 'arrow' | 'stone' | 'fire' | 'ice' | 'poison' | 'energy' | 'death' | 'holy';

export interface MonsterDef {
  id: string;
  name: string;
  hp: number;
  exp: number;
  /** Velocidad: 100 ≈ un jugador de nivel 1. */
  speed: number;
  armor: number;
  defense: number;
  melee: [number, number] | null;
  ranged?: { dmg: [number, number]; range: number; element: Element; missile: Missile; chance: number };
  /** Ataque de área alrededor de sí mismo. */
  area?: { dmg: [number, number]; radius: number; element: Element; chance: number };
  /** Se cura a sí mismo. */
  selfHeal?: { amount: [number, number]; chance: number };
  /** Convoca criaturas (máximo 2 vivas). */
  summon?: { id: string; chance: number };
  /** Huye con esta fracción de vida. */
  flee?: number;
  /** false = no ataca si no lo atacas primero. */
  aggressive?: boolean;
  /** Mantiene distancia en vez de pegarse a ti. */
  keepDistance?: boolean;
  boss?: boolean;
  resist?: Partial<Record<Element, number>>;
  look: Look;
  loot: [item: string, chance: number, max: number][];
  gold: [number, number];
  desc: string;
}

const LIST: MonsterDef[] = [
  // ---------- Los Ductos, bajo Albor (niveles 1-6) ----------
  {
    id: 'cucaracha', name: 'cucaracha gigante', hp: 30, exp: 12, speed: 90, armor: 2, defense: 3, melee: [0, 10],
    look: { body: 'spider', c1: '#5a3a1a', c2: '#c9a27a', scale: 0.7 },
    loot: [], gold: [0, 3], desc: 'Cruje cuando anda. Y cuando muerde.',
  },
  {
    id: 'rata_gigante', name: 'rata gigante', hp: 55, exp: 22, speed: 85, armor: 2, defense: 4, melee: [0, 16],
    look: { body: 'quad', c1: '#5a4e44', c2: '#c98a8a', scale: 0.9 },
    loot: [['cola_rata', 0.6, 2], ['queso', 0.2, 1]], gold: [0, 8], desc: 'Del tamaño de un perro y con peor humor.',
  },
  {
    id: 'rey_rata', name: 'Rey de las Ratas', hp: 420, exp: 300, speed: 90, armor: 4, defense: 8, melee: [0, 28],
    summon: { id: 'rata', chance: 0.15 }, boss: true,
    look: { body: 'quad', c1: '#6b5a4a', c2: '#f2c94c', scale: 1.4 },
    loot: [['corona_rata', 1, 1], ['pocion_vida', 1, 2], ['escudo_madera', 0.5, 1], ['espada_corta', 0.5, 1]], gold: [40, 100],
    desc: 'Gobierna los Ductos desde un trono de basura.',
  },

  // ---------- Isla de Albor (niveles 1-6) ----------
  {
    id: 'rata', name: 'rata', hp: 20, exp: 5, speed: 75, armor: 1, defense: 2, melee: [0, 8],
    flee: 0.15, look: { body: 'quad', c1: '#8a7a6a', c2: '#c98a8a', scale: 0.7 },
    loot: [['cola_rata', 0.5, 1], ['queso', 0.15, 1]], gold: [0, 4], desc: 'Una rata gorda y malhumorada.',
  },
  {
    id: 'serpiente', name: 'serpiente', hp: 25, exp: 10, speed: 70, armor: 1, defense: 3, melee: [0, 9],
    look: { body: 'snake', c1: '#5e9e3a', c2: '#c9d84a' },
    loot: [['piel_serpiente', 0.3, 1]], gold: [0, 3], desc: 'Silba y muerde. Cuidado con su veneno.',
  },
  {
    id: 'murcielago', name: 'murciélago', hp: 30, exp: 10, speed: 110, armor: 1, defense: 4, melee: [0, 8],
    look: { body: 'bat', c1: '#4a3a4a', c2: '#c95a5a' },
    loot: [], gold: [0, 2], desc: 'Revolotea en la oscuridad.',
  },
  {
    id: 'arana_cueva', name: 'araña de cueva', hp: 40, exp: 18, speed: 90, armor: 2, defense: 5, melee: [0, 14],
    look: { body: 'spider', c1: '#4a3828', c2: '#c9a27a', scale: 0.8 },
    loot: [['seda_arana', 0.1, 1]], gold: [0, 6], desc: 'Una araña del tamaño de un perro.',
  },
  {
    id: 'lobo', name: 'lobo', hp: 25, exp: 18, speed: 105, armor: 2, defense: 5, melee: [0, 18],
    flee: 0.2, look: { body: 'quad', c1: '#7d7d85', c2: '#dcdce2' },
    loot: [['carne', 0.4, 2], ['piel_lobo', 0.25, 1], ['colmillo', 0.1, 1]], gold: [0, 0], desc: 'Caza en manada.',
  },
  {
    id: 'ciervo', name: 'ciervo', hp: 25, exp: 0, speed: 120, armor: 0, defense: 3, melee: null,
    aggressive: false, flee: 1, look: { body: 'quad', c1: '#a8743c', c2: '#efe6d6' },
    loot: [['carne', 0.8, 3]], gold: [0, 0], desc: 'Huye en cuanto te ve.',
  },
  {
    id: 'jabali', name: 'jabalí', hp: 60, exp: 25, speed: 95, armor: 3, defense: 6, melee: [0, 22],
    aggressive: false, look: { body: 'quad', c1: '#5a3a28', c2: '#efe6d6', scale: 0.85 },
    loot: [['jamon', 0.4, 1], ['carne', 0.5, 2], ['colmillo', 0.2, 1]], gold: [0, 0], desc: 'Tranquilo... hasta que lo molestas.',
  },

  // ---------- Bosque Umbrío y praderas (niveles 6-20) ----------
  {
    id: 'trasgo', name: 'trasgo', hp: 50, exp: 25, speed: 100, armor: 3, defense: 8, melee: [0, 22],
    flee: 0.15, look: { body: 'humanoid', c1: '#6b5a3a', c2: '#3a2a1a', skin: '#7aa83a', weapon: 'sword', scale: 0.8 },
    loot: [['oreja_trasgo', 0.3, 1], ['daga', 0.05, 1], ['manzana', 0.3, 2], ['tela_sucia', 0.2, 1]], gold: [0, 12], desc: 'Pequeño, rápido y ruin.',
  },
  {
    id: 'trasgo_arquero', name: 'trasgo arquero', hp: 45, exp: 30, speed: 100, armor: 2, defense: 6, melee: [0, 10],
    ranged: { dmg: [0, 22], range: 5, element: 'physical', missile: 'arrow', chance: 0.6 }, keepDistance: true,
    look: { body: 'humanoid', c1: '#4a6a2a', c2: '#3a2a1a', skin: '#7aa83a', weapon: 'bow', scale: 0.8 },
    loot: [['oreja_trasgo', 0.3, 1], ['flecha', 0.5, 8], ['arco', 0.02, 1]], gold: [0, 15], desc: 'Dispara desde detrás de los árboles.',
  },
  {
    id: 'trasgo_chaman', name: 'chamán trasgo', hp: 65, exp: 45, speed: 95, armor: 2, defense: 6, melee: [0, 8],
    ranged: { dmg: [5, 28], range: 4, element: 'earth', missile: 'poison', chance: 0.5 }, selfHeal: { amount: [15, 30], chance: 0.15 }, keepDistance: true,
    look: { body: 'humanoid', c1: '#5a3fa0', c2: '#3a2a1a', skin: '#7aa83a', weapon: 'staff', hood: true, scale: 0.8 },
    loot: [['oreja_trasgo', 0.3, 1], ['pocion_mana', 0.1, 1], ['seta', 0.4, 3]], gold: [5, 25], desc: 'Murmura maldiciones en lengua trasga.',
  },
  {
    id: 'bandido', name: 'bandido', hp: 90, exp: 45, speed: 100, armor: 5, defense: 10, melee: [0, 35],
    flee: 0.1, look: { body: 'humanoid', c1: '#5a4a3a', c2: '#2a2a2a', skin: '#e0b089', hair: '#3a2a1a', weapon: 'sword', hood: true },
    loot: [['espada_corta', 0.08, 1], ['jubon', 0.06, 1], ['pan', 0.4, 2], ['pocion_vida', 0.08, 1]], gold: [5, 35], desc: 'Vive de asaltar a los viajeros.',
  },
  {
    id: 'oso', name: 'oso', hp: 110, exp: 30, speed: 90, armor: 4, defense: 8, melee: [0, 40],
    look: { body: 'quad', c1: '#5a3a1a', c2: '#3a2410', scale: 1.15 },
    loot: [['carne', 0.6, 4], ['piel_oso', 0.2, 1], ['garra', 0.1, 1]], gold: [0, 0], desc: 'El rey del Bosque Umbrío.',
  },
  {
    id: 'arpia', name: 'arpía', hp: 120, exp: 70, speed: 120, armor: 5, defense: 10, melee: [0, 38],
    look: { body: 'bird', c1: '#c9a27a', c2: '#e0b089', c3: '#5a3a1a' },
    loot: [['pluma_harpia', 0.4, 2], ['garra', 0.15, 1]], gold: [5, 30], desc: 'Medio mujer, medio ave. Toda furia.',
  },

  // ---------- Pantano de Nieblaseca (niveles 12-30) ----------
  {
    id: 'babosa', name: 'babosa del pantano', hp: 90, exp: 40, speed: 60, armor: 6, defense: 4, melee: [0, 28],
    resist: { earth: 0.5, physical: 0.8 }, look: { body: 'slime', c1: '#6aa84f', c2: '#b6d77a' },
    loot: [['seta', 0.2, 2]], gold: [0, 15], desc: 'Gelatina viva y ácida.',
  },
  {
    id: 'sapo', name: 'sapo gigante', hp: 120, exp: 55, speed: 85, armor: 5, defense: 6, melee: [0, 36],
    ranged: { dmg: [5, 30], range: 3, element: 'earth', missile: 'poison', chance: 0.3 },
    look: { body: 'toad', c1: '#5a7a2a', c2: '#d9e04a' },
    loot: [['ojo_sapo', 0.35, 1], ['carne', 0.3, 1]], gold: [0, 20], desc: 'Escupe veneno a distancia.',
  },
  {
    id: 'lagarto', name: 'hombre lagarto', hp: 200, exp: 110, speed: 100, armor: 10, defense: 14, melee: [0, 60],
    ranged: { dmg: [10, 45], range: 5, element: 'physical', missile: 'stone', chance: 0.25 },
    resist: { earth: 0.6, ice: 1.3 }, look: { body: 'humanoid', c1: '#3f8a6a', c2: '#a8743c', skin: '#3f8a6a', weapon: 'axe' },
    loot: [['escama_lagarto', 0.3, 2], ['hacha', 0.08, 1], ['escudo_hierro', 0.04, 1], ['esmeralda', 0.03, 1], ['pocion_vida', 0.1, 1]], gold: [10, 60], desc: 'Guerreros escamosos de la ciénaga.',
  },
  {
    id: 'lagarto_sabio', name: 'sabio lagarto', hp: 180, exp: 140, speed: 95, armor: 8, defense: 10, melee: [0, 30],
    ranged: { dmg: [20, 70], range: 4, element: 'ice', missile: 'ice', chance: 0.45 }, selfHeal: { amount: [30, 60], chance: 0.12 }, keepDistance: true,
    resist: { earth: 0.6, ice: 0.5 }, look: { body: 'humanoid', c1: '#3e5fa8', c2: '#efe6d6', skin: '#3f8a6a', weapon: 'staff', hood: true },
    loot: [['escama_lagarto', 0.3, 2], ['pocion_mana', 0.15, 1], ['baculo_escarcha', 0.02, 1], ['zafiro', 0.03, 1]], gold: [10, 70], desc: 'Conoce la vieja magia de las aguas.',
  },

  // ---------- Cripta de Valcorona (niveles 15-30) ----------
  {
    id: 'esqueleto', name: 'esqueleto', hp: 60, exp: 35, speed: 85, armor: 4, defense: 9, melee: [0, 30],
    resist: { holy: 1.6, death: 0, fire: 0.9, physical: 0.9 }, look: { body: 'humanoid', c1: '#e8e0c8', c2: '#a8a090', skin: '#e8e0c8', weapon: 'sword' },
    loot: [['hueso', 0.4, 2], ['espada_corta', 0.06, 1], ['casco_hierro', 0.03, 1]], gold: [0, 15], desc: 'Huesos que no saben que están muertos.',
  },
  {
    id: 'necrofago', name: 'necrófago', hp: 140, exp: 85, speed: 80, armor: 6, defense: 10, melee: [0, 50],
    resist: { holy: 1.5, death: 0, earth: 0.7 }, look: { body: 'humanoid', c1: '#6a7a5a', c2: '#3a3a2a', skin: '#8a9a7a', weapon: 'none' },
    loot: [['craneo', 0.2, 1], ['tela_sucia', 0.3, 1], ['anillo_vida', 0.01, 1]], gold: [5, 40], desc: 'Se alimenta de los muertos... y de los vivos.',
  },
  {
    id: 'espectro', name: 'espectro', hp: 160, exp: 120, speed: 95, armor: 2, defense: 15, melee: [0, 40],
    ranged: { dmg: [15, 55], range: 4, element: 'death', missile: 'death', chance: 0.35 },
    resist: { physical: 0.5, holy: 1.8, death: 0 }, look: { body: 'ghost', c1: '#cfe2f2', c2: '#7a8aa0' },
    loot: [['tela_sucia', 0.2, 1], ['pocion_mana', 0.1, 1]], gold: [10, 50], desc: 'Un lamento hecho niebla.',
  },
  {
    id: 'nigromante', name: 'Morvaine el Nigromante', hp: 1400, exp: 1500, speed: 90, armor: 12, defense: 18, melee: [0, 60],
    ranged: { dmg: [40, 120], range: 5, element: 'death', missile: 'death', chance: 0.5 },
    area: { dmg: [30, 90], radius: 2, element: 'death', chance: 0.12 }, summon: { id: 'esqueleto', chance: 0.12 }, selfHeal: { amount: [60, 120], chance: 0.06 },
    boss: true, keepDistance: true, resist: { holy: 1.4, death: 0 },
    look: { body: 'humanoid', c1: '#2a1a3a', c2: '#7a5cff', skin: '#c9c0b0', weapon: 'staff', hood: true, scale: 1.35 },
    loot: [['filacteria', 1, 1], ['tunica_mago', 0.4, 1], ['libro_runas', 0.4, 1], ['zafiro', 0.6, 2], ['pocion_mana', 1, 4]], gold: [200, 500], desc: 'El que robó los muertos de Valcorona.',
  },

  // ---------- Montes Ferrosos y Minas de Hondaforja (niveles 20-45) ----------
  {
    id: 'troll', name: 'troll de las rocas', hp: 230, exp: 120, speed: 90, armor: 10, defense: 12, melee: [0, 70],
    selfHeal: { amount: [10, 25], chance: 0.2 }, look: { body: 'humanoid', c1: '#6a7a6a', c2: '#4a3a2a', skin: '#7a8a7a', weapon: 'club', scale: 1.15 },
    loot: [['colmillo_troll', 0.3, 1], ['carne', 0.4, 2], ['maza', 0.06, 1], ['escudo_madera', 0.1, 1]], gold: [10, 50], desc: 'Se regenera mientras pelea.',
  },
  {
    id: 'golem', name: 'gólem de piedra', hp: 380, exp: 200, speed: 70, armor: 20, defense: 18, melee: [0, 90],
    resist: { physical: 0.7, earth: 0.3, energy: 1.2, fire: 0.8 }, look: { body: 'golem', c1: '#8d8478', c2: '#4ad0ff' },
    loot: [['mineral_hierro', 0.5, 2], ['nucleo_golem', 0.1, 1], ['rubi', 0.03, 1]], gold: [15, 70], desc: 'Los enanos lo crearon. Ya no los obedece.',
  },
  {
    id: 'arana_gigante', name: 'araña gigante', hp: 320, exp: 230, speed: 105, armor: 12, defense: 14, melee: [0, 80],
    ranged: { dmg: [20, 60], range: 3, element: 'earth', missile: 'poison', chance: 0.3 }, resist: { earth: 0.3, fire: 1.3 },
    look: { body: 'spider', c1: '#2a2a2a', c2: '#c0392b', scale: 1.2 },
    loot: [['seda_arana', 0.4, 3], ['grebas', 0.06, 1], ['pocion_vida', 0.15, 1]], gold: [20, 80], desc: 'Teje en las minas abandonadas.',
  },
  {
    id: 'salamandra', name: 'salamandra de fuego', hp: 280, exp: 210, speed: 100, armor: 10, defense: 12, melee: [0, 60],
    ranged: { dmg: [30, 80], range: 4, element: 'fire', missile: 'fire', chance: 0.4 }, resist: { fire: 0, ice: 1.4 },
    look: { body: 'snake', c1: '#e0561c', c2: '#ffd23f', scale: 1.2 },
    loot: [['flecha_fuego', 0.3, 10], ['rubi', 0.05, 1], ['pocion_mana', 0.1, 1]], gold: [20, 80], desc: 'Vive cerca de la lava.',
  },
  {
    id: 'draco', name: 'draco joven', hp: 800, exp: 600, speed: 95, armor: 18, defense: 20, melee: [0, 120],
    ranged: { dmg: [50, 140], range: 4, element: 'fire', missile: 'fire', chance: 0.3 }, area: { dmg: [40, 110], radius: 1, element: 'fire', chance: 0.1 },
    resist: { fire: 0, ice: 1.2, earth: 0.8 }, look: { body: 'dragon', c1: '#4a8a3a', c2: '#d9c04a' },
    loot: [['escama_dragon', 0.3, 2], ['escudo_escamas', 0.01, 1], ['pocion_vida_g', 0.1, 1], ['rubi', 0.1, 1]], gold: [50, 200], desc: 'Aún no ha crecido. Aun así, aterra.',
  },
  {
    id: 'ignaroth', name: 'Ignaroth, el Wyrm de Ceniza', hp: 6000, exp: 8000, speed: 90, armor: 25, defense: 25, melee: [0, 220],
    ranged: { dmg: [100, 260], range: 5, element: 'fire', missile: 'fire', chance: 0.4 }, area: { dmg: [80, 220], radius: 2, element: 'fire', chance: 0.12 },
    summon: { id: 'salamandra', chance: 0.06 }, boss: true, resist: { fire: 0, ice: 1.3 },
    look: { body: 'dragon', c1: '#3a2a2a', c2: '#ff7a3d', scale: 1.8 },
    loot: [['corazon_ceniza', 1, 1], ['coraza_escamas', 0.5, 1], ['espada_ceniza', 0.34, 1], ['arco_ceniza', 0.34, 1], ['varita_tormenta', 0.34, 1], ['baculo_glaciar', 0.34, 1], ['rubi', 1, 4], ['pocion_vida_g', 1, 3]],
    gold: [1500, 3000], desc: 'El wyrm que duerme bajo los Montes Ferrosos. Su aliento convirtió un reino en ceniza.',
  },
];

export const MONSTERS: Record<string, MonsterDef> = Object.fromEntries(LIST.map((m) => [m.id, m]));
