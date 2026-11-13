// Suelos y objetos del mapa. Contenido puro: la lógica y el dibujo leen estas tablas.

export const G = {
  VOID: 0,
  SEA: 1,
  WATER: 2,
  GRASS: 3,
  FOREST: 4,
  DIRT: 5,
  ROAD: 6,
  SAND: 7,
  COBBLE: 8,
  WOOD: 9,
  CAVE: 10,
  ROCK: 11,
  SWAMP: 12,
  SNOW: 13,
  BRIDGE: 14,
  LAVA: 15,
  TILE: 16,
  MUD: 17,
} as const;

export interface GroundDef {
  name: string;
  walk: boolean;
  /** Multiplicador del tiempo de paso (1 = camino). */
  slow: number;
  /** Color para el minimapa. */
  map: string;
}

export const GROUNDS: Record<number, GroundDef> = {
  [G.VOID]: { name: 'vacío', walk: false, slow: 1, map: '#000000' },
  [G.SEA]: { name: 'mar', walk: false, slow: 1, map: '#1d3b6b' },
  [G.WATER]: { name: 'agua', walk: false, slow: 1, map: '#2f5e9e' },
  [G.GRASS]: { name: 'hierba', walk: true, slow: 1.1, map: '#3f8a35' },
  [G.FOREST]: { name: 'suelo de bosque', walk: true, slow: 1.15, map: '#2c6528' },
  [G.DIRT]: { name: 'tierra', walk: true, slow: 1.05, map: '#7a5a34' },
  [G.ROAD]: { name: 'camino', walk: true, slow: 0.9, map: '#a58b5c' },
  [G.SAND]: { name: 'arena', walk: true, slow: 1.2, map: '#d6c48a' },
  [G.COBBLE]: { name: 'adoquines', walk: true, slow: 0.85, map: '#8d8d8d' },
  [G.WOOD]: { name: 'suelo de madera', walk: true, slow: 0.9, map: '#8a5a2b' },
  [G.CAVE]: { name: 'suelo de cueva', walk: true, slow: 1.05, map: '#5b4c3e' },
  [G.ROCK]: { name: 'roca', walk: false, slow: 1, map: '#2a2420' },
  [G.SWAMP]: { name: 'ciénaga', walk: true, slow: 1.6, map: '#4c5e2e' },
  [G.SNOW]: { name: 'nieve', walk: true, slow: 1.3, map: '#e6eef2' },
  [G.BRIDGE]: { name: 'puente', walk: true, slow: 0.9, map: '#9a6a35' },
  [G.LAVA]: { name: 'lava', walk: false, slow: 1, map: '#e0561c' },
  [G.TILE]: { name: 'baldosas', walk: true, slow: 0.85, map: '#b9b2a2' },
  [G.MUD]: { name: 'barro', walk: true, slow: 1.35, map: '#5a4628' },
};

export const O = {
  NONE: 0,
  TREE: 1,
  PINE: 2,
  BUSH: 3,
  BOULDER: 4,
  WALL: 5,
  WOODWALL: 6,
  DOOR: 7,
  STAIRS_DOWN: 8,
  STAIRS_UP: 9,
  FENCE: 10,
  TABLE: 11,
  BED: 12,
  COUNTER: 13,
  BARREL: 14,
  CRATE: 15,
  ALTAR: 16,
  FOUNTAIN: 17,
  GRAVE: 18,
  DEADTREE: 19,
  REEDS: 20,
  BOOKSHELF: 21,
  ANVIL: 22,
  LAMP: 23,
  FLOWERS: 24,
  STALAGMITE: 25,
  CRYSTAL: 26,
  BONES: 27,
  SIGN: 28,
  WELL: 29,
  MOUNTAIN: 30,
  CACTUS: 31,
  BRAZIER: 32,
  STATUE: 33,
  WEB: 34,
  MUSHROOMS: 35,
  CHAIR: 36,
  FURNACE: 37,
  SNOWPINE: 38,
  DOCK_POST: 39,
  RUBBLE: 40,
  DOOR_OPEN: 41,
  GATE: 42,
  PLANT: 43,
  CHEST: 44,
} as const;

export interface ObjectDef {
  name: string;
  /** Bloquea el paso. */
  block: boolean;
  /** Bloquea la línea de visión (proyectiles, hechizos). */
  sight?: boolean;
  /** Radio de luz que emite. */
  light?: number;
  /** Color para el minimapa (si no, se usa el del suelo). */
  map?: string;
  /** Se dibuja más alto que una casilla (árboles, muros). */
  tall?: boolean;
  desc?: string;
}

export const OBJECTS: Record<number, ObjectDef> = {
  [O.NONE]: { name: '', block: false },
  [O.TREE]: { name: 'roble', block: true, sight: true, map: '#1f5a1d', tall: true },
  [O.PINE]: { name: 'pino', block: true, sight: true, map: '#18461c', tall: true },
  [O.BUSH]: { name: 'arbusto', block: true, map: '#2f7a2a' },
  [O.BOULDER]: { name: 'peñasco', block: true, map: '#6f6a64' },
  [O.WALL]: { name: 'muro de piedra', block: true, sight: true, map: '#5c5c66', tall: true },
  [O.WOODWALL]: { name: 'pared de madera', block: true, sight: true, map: '#5e3b1c', tall: true },
  // Las puertas cerradas y el portón no bloquean a nivel de mapa (para la conectividad); la simulación decide quién pasa.
  [O.DOOR]: { name: 'puerta cerrada', block: false, sight: true, map: '#9b6b38', desc: 'Haz clic a su lado para abrirla.' },
  [O.DOOR_OPEN]: { name: 'puerta abierta', block: false, map: '#9b6b38', desc: 'Haz clic a su lado para cerrarla.' },
  [O.GATE]: { name: 'portón de la ciudad', block: false, sight: true, map: '#9a9aa0', desc: 'Vigilado por los guardias de Albor.' },
  [O.PLANT]: { name: 'maceta', block: true },
  [O.CHEST]: { name: 'baúl', block: true, desc: 'Si la casa es tuya, haz clic para guardar o sacar cosas. Lo que guardas se comparte entre todas tus casas.' },
  [O.STAIRS_DOWN]: { name: 'escalera que baja', block: false, map: '#ffd23f', desc: 'Lleva a un nivel inferior.' },
  [O.STAIRS_UP]: { name: 'escalera que sube', block: false, map: '#ffd23f', desc: 'Lleva a un nivel superior.' },
  [O.FENCE]: { name: 'valla', block: true, map: '#7c5a30' },
  [O.TABLE]: { name: 'mesa', block: true },
  [O.BED]: { name: 'cama', block: true },
  [O.COUNTER]: { name: 'mostrador', block: true },
  [O.BARREL]: { name: 'barril', block: true },
  [O.CRATE]: { name: 'caja', block: true },
  [O.ALTAR]: { name: 'altar', block: true, light: 3 },
  [O.FOUNTAIN]: { name: 'fuente', block: true, map: '#4f86c6' },
  [O.GRAVE]: { name: 'lápida', block: true, map: '#77777f' },
  [O.DEADTREE]: { name: 'árbol muerto', block: true, map: '#463626', tall: true },
  [O.REEDS]: { name: 'juncos', block: false },
  [O.BOOKSHELF]: { name: 'estantería', block: true, sight: true },
  [O.ANVIL]: { name: 'yunque', block: true },
  [O.LAMP]: { name: 'farol', block: true, light: 4, tall: true },
  [O.FLOWERS]: { name: 'flores', block: false },
  [O.STALAGMITE]: { name: 'estalagmita', block: true, map: '#3b322a' },
  [O.CRYSTAL]: { name: 'cristal', block: true, light: 3, map: '#7fd6ff' },
  [O.BONES]: { name: 'huesos', block: false },
  [O.SIGN]: { name: 'cartel', block: true },
  [O.WELL]: { name: 'pozo', block: true },
  [O.MOUNTAIN]: { name: 'montaña', block: true, sight: true, map: '#6b6158', tall: true },
  [O.CACTUS]: { name: 'cactus', block: true },
  [O.BRAZIER]: { name: 'brasero', block: true, light: 5 },
  [O.STATUE]: { name: 'estatua', block: true, tall: true },
  [O.WEB]: { name: 'telaraña', block: false },
  [O.MUSHROOMS]: { name: 'setas', block: false },
  [O.CHAIR]: { name: 'silla', block: false },
  [O.FURNACE]: { name: 'horno', block: true, light: 3 },
  [O.SNOWPINE]: { name: 'pino nevado', block: true, sight: true, map: '#c9d8dc', tall: true },
  [O.DOCK_POST]: { name: 'poste del muelle', block: true },
  [O.RUBBLE]: { name: 'escombros', block: false },
};
