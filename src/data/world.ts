import { buildAlbor } from './albor';

// Geografía de Brumaria: tamaño del mundo, pueblos, cuevas y zonas de criaturas.
// El terreno se genera con una semilla fija, así que el mundo es siempre el mismo.

export const WORLD_W = 260;
export const WORLD_H = 180;
export const WORLD_Z = 4; // 0 = superficie, 1 y 2 = subterráneo, 3 = plantas altas de las casas
export const UPPER_Z = 3;
export const isUnderground = (z: number) => z === 1 || z === 2;
export const WORLD_SEED = 20261113;

/*
Leyenda de las plantillas:
  ' ' sin tocar     '.' hierba        ',' adoquines     '_' madera        ':' baldosas
  '=' camino        's' arena         '~' agua          'H' muelle/puente 'm' barro
  '#' muro          'W' pared madera  '+' puerta        'T' roble         'Y' pino
  'f' valla         't' mesa          'b' cama          'c' mostrador     'o' barril
  'x' caja          'A' altar         'F' fuente        'g' lápida        'B' estantería
  'N' yunque        'K' horno         'L' farol         '*' flores        'S' cartel
  'w' pozo          'D' escalera baja 'h' silla         'P' poste muelle  'Z' estatua
  'r' brasero       'M' montaña       '@' punto de reaparición del templo
  '^' escalera a la planta alta  'v' escalera a la planta baja  'G' portón  'p' maceta
  '0'-'9' NPC (ver `npcs` de cada pueblo)
*/

export interface TownDef {
  id: string;
  name: string;
  x: number;
  y: number;
  map: string[];
  /** Planta alta (mismo tamaño que map; ' ' = sin suelo). */
  upper?: string[];
  npcs: Record<string, string>;
}

const ALBOR = buildAlbor();

export const TOWNS: TownDef[] = [
  {
    id: 'albor', name: 'Albor', x: 30, y: 100,
    npcs: { '1': 'oraculo', '2': 'mirta', '3': 'hermana_lia', '4': 'teodoro', '5': 'brann', '6': 'capitan_rurik', '7': 'guardia_albor', '9': 'lena' },
    map: ALBOR.map,
    upper: ALBOR.upper,
  },
  {
    id: 'valcorona', name: 'Valcorona', x: 112, y: 64,
    npcs: { '1': 'elena', '2': 'rey_aldric', '3': 'bertran', '4': 'gorm', '5': 'ilsa', '6': 'ulric', '7': 'rosa', '8': 'selene', '9': 'tobias', '0': 'guardia' },
    map: [
      '......................==......................',
      '.#####################,,#####################.',
      '.#,,,,,,,,,,,,,,,,,,,0,,,,,,,,,,,,,,,,,,,,,,#.',
      '.#,############,,,,,,,,,,############,fffff,#.',
      '.#,#::::::::::#,WWWWW,,,,#__________#,f.g.f,#.',
      '.#,#:r::AA::r:#,W___W,,,,#_Z__2___Z_#,fg.gf,#.',
      '.#,#:::::1::::#,W_8_W,,,,#__________#,f...f,#.',
      '.#,#::::::::::#,W___W,,,,#_t______t_#,f.D.f,#.',
      '.#,#:B::@:::B:#,W_B_W,,,,#__________#,fg.gf,#.',
      '.#,#::::::::::#,WW+WW,,,,#__________#,f...f,#.',
      '.#,#::::::::::#,,,,,,,,,,#####++#####,ff.ff,#.',
      '.#,#####++#####,,L,,,,,,,,,,,,,,,,,,,,,,,,,,#.',
      '.#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#.',
      '.#,,*,,L,,,F,,,,L,,*,,,,,,L,,,,,,,,,,,L,,,,,#.',
      '.#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#.',
      '.#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#.',
      '=,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,=',
      '=,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,=',
      '.#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#.',
      '.#,WWW+WWW,,WWW+WWW,,,,,,WWWW+WWWWW,,#####+##.',
      '.#,W_____W,,W_____W,,,,,,W________W,,#_____##.',
      '.#,W_4___W,,W_5___W,,,,,,W_t_hh_t_W,,#_3___##.',
      '.#,W_ccc_W,,W_ccc_W,,,,,,W_t____t_W,,#_x_x_##.',
      '.#,W_N_x_W,,W_x_o_W,,,,,,W___7____W,,#_____##.',
      '.#,WWWWWWW,,WWWWWWW,,,,,,Wccccc_ooW,,########.',
      '.#,,,,,,,,,,,,,,,,,,,,,,,WWWWWWWWWW,,,,,,,,,#.',
      '.#,,,WWWWWW+WWWWWW,,,,,,,,,,,,,,,,,,,,,,,,,,#.',
      '.#,,,W___________W,,,,,,,fffffff,,,,,,,,,,,,#.',
      '.#,,,W_B__6____B_W,,,,,,,f.....f,,9,,,,,,,,,#.',
      '.#,,,W_o________xW,,,,,,,f.....f,,,,,,,,,,,,#.',
      '.#,,,WWWWWWWWWWWWW,,,,,,,fff.fff,,,,,,,,,,,,#.',
      '.#,,,,,,,,,,,,,,,,,,,,0,,,,,,,,,,,,,,,,,,,,,#.',
      '.#####################,,#####################.',
      '......................==......................',
    ],
  },
  {
    id: 'hondaforja', name: 'Hondaforja', x: 180, y: 20,
    npcs: { '1': 'durgin', '2': 'bruna', '3': 'hilda', '4': 'thrain', '5': 'korr' },
    map: [
      'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
      'MM,,,,,,,,,,,,,,,,,,,,,,,,,,MM',
      'MM,#########,,,,,,#########,MM',
      'MM,#_K___N_#,,,,,,#:::::::#,MM',
      'MM,#___1___#,,LL,,#:r:3:r:#,MM',
      'MM,#_ccc___#,,,,,,#:::@:::#,MM',
      'MM,####+####,,,,,,####+####,MM',
      'MM,,,,,,,,,,,,,,,,,,,,,,,,,,MM',
      'MM,,,L,,,,,,,,w,,,,,,,,,L,,,MM',
      'MM,,,,,,,,,,,,,,,,,,,,,,,,,,MM',
      'MM,#########,,,,,,#########,MM',
      'MM,#_______#,,,,,,#,,,,,,,#,MM',
      'MM,#_2_____#,,,,,,#,,,D,,,#,MM',
      'MM,#_cccc__#,,,,,,#,,4,,,,#,MM',
      'MM,#_o___x_#,,,,,,#,o,,,x,#,MM',
      'MM,####+####,,,,,,####+####,MM',
      'MM,,,,,,,,,,,,,,,,,,,,,,,,,,MM',
      'MM,,,,5,,,,,,,,,,,,,,,,,,,,,MM',
      'MM,,,,,,,,,,,,,,,,,,,,,,,,,,MM',
      'MMMMMMMMMMMM====MMMMMMMMMMMMMM',
    ],
  },
  {
    id: 'juncal', name: 'Juncal', x: 186, y: 108,
    npcs: { '1': 'agata', '2': 'nilo', '3': 'yara', '4': 'mosca' },
    map: [
      '~~~mmmmmmmmmmmmmmmmmmmm~~~',
      '~~mWWWWWWWWmmmmWWWWWWWWm~~',
      '~~mW______WmmmmW______Wm~~',
      '~~mW_1__o_WmmmmW_3__r_Wm~~',
      '~~mW_c_B__WmmmmW__@___Wm~~',
      '~~mW______WmmmmW______Wm~~',
      '~~mWWWW+WWWmmmmWWWW+WWWm~~',
      'mmHHHHHHHHHHHHHHHHHHHHHHmm',
      'HHHHLHHHHHHHH4HHHHHLHHHHmm',
      'HHHHHHHHHHHHHHHHHHHHHHHHmm',
      'mmHHHHHHHHHHHHHHHHHHHHHHmm',
      '~~mWWW+WWWWmmmmWWWW+WWWm~~',
      '~~mW______WmmmmW______Wm~~',
      '~~mW_2____WmmmmW_t__h_Wm~~',
      '~~mW_cccx_WmmmmW_b____Wm~~',
      '~~mWWWWWWWWmmmmWWWWWWWWm~~',
      '~~~mmmmmmmmmmmmmmmmmmmm~~~',
      '~~~~~~~mmmm~~~~~~~~~~~~~~~',
    ],
  },
];

/** Caminos entre puertas de pueblos (coordenadas absolutas). */
export const ROADS: [number, number, number, number][] = [
  // Albor (portón este) -> Valcorona (puerta oeste)
  [92, 123, 112, 80],
  // Albor -> Cueva de las Ratas (norte) y Mina Abandonada (sur)
  [92, 124, 62, 93],
  [92, 124, 110, 139],
  // Valcorona -> Hondaforja (puerta norte -> puerta sur)
  [135, 64, 193, 39],
  // Valcorona -> Juncal (puerta este -> entrada oeste)
  [157, 80, 186, 116],
  // Valcorona -> sur (campamento de bandidos)
  [135, 97, 140, 138],
];

export type CaveStyle = 'cave' | 'crypt' | 'mine' | 'lava' | 'flooded' | 'sewer';

export interface CaveDef {
  id: string;
  name: string;
  z: number;
  style: CaveStyle;
  gen: 'ca' | 'rooms';
  /** Entrada desde la superficie (se busca la casilla libre más cercana) o desde un pueblo ('D' de la plantilla). */
  entrance?: { x: number; y: number } | { town: string };
  /** O bien se baja desde otra cueva (escalera en el punto más lejano de esa cueva). */
  from?: string;
  /** Rectángulo de la cueva. Si viene de otra cueva, solo se usan w y h, centrados en la escalera. */
  rect: { x: number; y: number; w: number; h: number };
  spawns: [monster: string, count: number][];
  boss?: string;
  /** Número de salas (generador por salas). */
  rooms?: number;
}

export const CAVES: CaveDef[] = [
  {
    id: 'ductos', name: 'Los Ductos', z: 1, style: 'sewer', gen: 'rooms', rooms: 22,
    entrance: { town: 'albor' }, rect: { x: 24, y: 96, w: 72, h: 48 },
    spawns: [['rata', 7], ['cucaracha', 5], ['rata_gigante', 4]], boss: 'rey_rata',
  },
  {
    id: 'cueva_ratas', name: 'Cueva de las Ratas', z: 1, style: 'cave', gen: 'ca',
    entrance: { x: 60, y: 90 }, rect: { x: 30, y: 66, w: 46, h: 27 },
    spawns: [['rata', 5], ['murcielago', 2], ['arana_cueva', 3]],
  },
  {
    id: 'mina_vieja', name: 'Mina Abandonada', z: 1, style: 'mine', gen: 'rooms', rooms: 18,
    entrance: { x: 110, y: 141 }, rect: { x: 98, y: 124, w: 52, h: 34 },
    spawns: [['arana_cueva', 4], ['murcielago', 2], ['trasgo', 3], ['serpiente', 2]],
  },
  {
    id: 'cripta', name: 'Cripta de Valcorona', z: 1, style: 'crypt', gen: 'rooms', rooms: 20,
    entrance: { town: 'valcorona' }, rect: { x: 126, y: 50, w: 48, h: 34 },
    spawns: [['esqueleto', 7], ['necrofago', 3]],
  },
  {
    id: 'catacumbas', name: 'Catacumbas Profundas', z: 2, style: 'crypt', gen: 'rooms', rooms: 18,
    from: 'cripta', rect: { x: 0, y: 0, w: 46, h: 34 },
    spawns: [['espectro', 4], ['necrofago', 3], ['esqueleto', 4]], boss: 'nigromante',
  },
  {
    id: 'madriguera', name: 'Madriguera Trasga', z: 1, style: 'cave', gen: 'ca',
    entrance: { x: 100, y: 42 }, rect: { x: 78, y: 26, w: 44, h: 30 },
    spawns: [['trasgo', 6], ['trasgo_arquero', 4], ['trasgo_chaman', 2]],
  },
  {
    id: 'cueva_troll', name: 'Cueva de los Trolls', z: 1, style: 'cave', gen: 'ca',
    entrance: { x: 166, y: 40 }, rect: { x: 152, y: 26, w: 24, h: 22 },
    spawns: [['troll', 5], ['murcielago', 2]],
  },
  {
    id: 'minas', name: 'Minas de Hondaforja', z: 1, style: 'mine', gen: 'rooms', rooms: 22,
    entrance: { town: 'hondaforja' }, rect: { x: 178, y: 8, w: 60, h: 32 },
    spawns: [['golem', 6], ['arana_gigante', 4], ['troll', 3], ['murcielago', 2]],
  },
  {
    id: 'fauces', name: 'Fauces de Ceniza', z: 2, style: 'lava', gen: 'ca',
    from: 'minas', rect: { x: 0, y: 0, w: 52, h: 38 },
    spawns: [['salamandra', 6], ['draco', 3]], boss: 'ignaroth',
  },
  {
    id: 'gruta', name: 'Gruta Inundada', z: 1, style: 'flooded', gen: 'ca',
    entrance: { x: 206, y: 138 }, rect: { x: 184, y: 126, w: 46, h: 32 },
    spawns: [['lagarto', 5], ['lagarto_sabio', 3], ['sapo', 3]],
  },
];

/** Zonas de criaturas en la superficie: [criatura, x, y, radio, cantidad]. */
export const SURFACE_SPAWNS: [string, number, number, number, number][] = [
  // Campos de Albor (fuera de la muralla)
  ['rata', 45, 150, 6, 2],
  ['serpiente', 80, 150, 6, 2],
  ['lobo', 52, 88, 7, 2],
  ['ciervo', 102, 132, 7, 2],
  ['jabali', 22, 124, 5, 2],
  ['rata', 102, 104, 5, 2],
  // Llanuras de Valcorona
  ['lobo', 100, 102, 8, 2],
  ['ciervo', 112, 110, 8, 2],
  ['jabali', 92, 90, 7, 2],
  ['lobo', 168, 94, 8, 2],
  ['ciervo', 150, 122, 8, 2],
  ['jabali', 122, 126, 8, 2],
  ['bandido', 140, 142, 6, 4],
  ['bandido', 84, 98, 5, 2],
  // Bosque Umbrío
  ['trasgo', 86, 56, 7, 3],
  ['trasgo_arquero', 86, 56, 7, 1],
  ['trasgo', 122, 42, 7, 3],
  ['trasgo_arquero', 122, 42, 6, 2],
  ['trasgo_chaman', 122, 42, 5, 1],
  ['oso', 72, 76, 8, 2],
  ['oso', 142, 30, 8, 2],
  ['lobo', 106, 30, 8, 2],
  ['arpia', 158, 52, 6, 2],
  // Montes Ferrosos
  ['troll', 196, 56, 7, 3],
  ['troll', 180, 62, 6, 2],
  ['arpia', 212, 46, 6, 2],
  ['golem', 206, 64, 6, 1],
  // Pantano de Nieblaseca
  ['babosa', 180, 130, 8, 3],
  ['sapo', 200, 142, 8, 3],
  ['lagarto', 216, 120, 7, 3],
  ['sapo', 176, 146, 7, 2],
  ['lagarto', 196, 152, 7, 2],
  ['babosa', 214, 98, 6, 2],
];

/** Zonas con nombre, para el letrero de zona. Se elige la primera que contenga el punto. */
export const AREAS: { name: string; x: number; y: number; w: number; h: number }[] = [
  { name: 'Campos de Albor', x: 0, y: 86, w: 108, h: 94 },
  { name: 'Montes Ferrosos', x: 165, y: 0, w: 75, h: 75 },
  { name: 'Pantano de Nieblaseca', x: 165, y: 90, w: 75, h: 80 },
  { name: 'Bosque Umbrío', x: 55, y: 0, w: 110, h: 62 },
  { name: 'Llanuras de Valcorona', x: 55, y: 62, w: 120, h: 108 },
];
