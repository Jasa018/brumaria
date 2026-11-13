// Geografía de Brumaria: tamaño del mundo, pueblos, cuevas y zonas de criaturas.
// El terreno se genera con una semilla fija, así que el mundo es siempre el mismo.

export const WORLD_W = 240;
export const WORLD_H = 170;
export const WORLD_Z = 3; // 0 = superficie, 1 y 2 = subterráneo
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
  '0'-'9' NPC (ver `npcs` de cada pueblo)
*/

export interface TownDef {
  id: string;
  name: string;
  x: number;
  y: number;
  map: string[];
  npcs: Record<string, string>;
}

export const TOWNS: TownDef[] = [
  {
    id: 'albor', name: 'Albor', x: 18, y: 121,
    npcs: { '1': 'oraculo', '3': 'hermana_lia', '2': 'mirta', '4': 'teodoro', '5': 'brann', '6': 'odo' },
    map: [
      '..T.............==..........T...sss~~~~~',
      '..#########.....==...WWWWWWWW...sss~~~~~',
      '..#:::::::#.....==...W______W...sss~~~~~',
      '..#:r:A:r:#..*..==...W_cccc_W...sss~~~~~',
      '..#:::1:::#.....==...W__2___W...sss~~~~~',
      '..#:::::::#.....==...W_o__xxW...sss~~~~~',
      '..#:3:@:::#..*..==...W______W....ss~~~~~',
      '..####+####.....==...WWW+WWWW....ssP~~~~',
      '.L,,,,,,,,,,,,,,==,,,,,,,,,,,,L..ssHHH6~',
      '========================================',
      '.L,,,,,,,,,,,,F,==,,,,,,,,,,,,L..ssHHHH~',
      '..WWWW+WWWW.....==...WWWW+WWW....ssP~~~~',
      '..W_______W.....==...W_______W...sss~~~~',
      '..W_b___4_W.....==...W_N__5__W...sss~~~~',
      '..W_b_____W..*..==...W_K_____W...sss~~~~',
      '..W____t__W.....==...W_______W...sss~~~~',
      '..WWWWWWWWW.....==...WWWWWWWWW...sss~~~~',
      '..*....T........==.........T.....ss~~~~~',
    ],
  },
  {
    id: 'sauce', name: 'Puerto Sauce', x: 64, y: 112,
    npcs: { '1': 'marela', '2': 'ismael' },
    map: [
      '~~~sss........T...',
      '~~~sss..WWW+WWW...',
      '~~~sss..W_____W...',
      '~~~sss..W_2_o_W...',
      '~~~sss..WWWWWWW...',
      '~~~sss..L.........',
      '~PHHHHHs==========',
      '~1HHHHHs==========',
      '~PHHHHHs.....L....',
      '~~~sss............',
      '~~~ssss.....T.....',
      '~~~~sss...........',
    ],
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
      'mm______________________mm',
      'HH__L________4_____L____mm',
      'HH______________________mm',
      'mm______________________mm',
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
  // Albor: hacia la cueva del norte y la playa sur
  [34, 121, 34, 114],
  [34, 138, 34, 146],
  // Puerto Sauce -> Valcorona (puerta oeste)
  [82, 118, 112, 80],
  // Valcorona -> Hondaforja (puerta norte -> puerta sur)
  [135, 64, 193, 39],
  // Valcorona -> Juncal (puerta este -> entrada oeste)
  [157, 80, 186, 116],
  // Valcorona -> sur (campamento de bandidos)
  [135, 97, 140, 138],
];

export type CaveStyle = 'cave' | 'crypt' | 'mine' | 'lava' | 'flooded';

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
}

export const CAVES: CaveDef[] = [
  {
    id: 'cueva_ratas', name: 'Cueva de las Ratas', z: 1, style: 'cave', gen: 'ca',
    entrance: { x: 34, y: 113 }, rect: { x: 12, y: 96, w: 38, h: 24 },
    spawns: [['rata', 10], ['murcielago', 3], ['arana_cueva', 3]],
  },
  {
    id: 'cripta', name: 'Cripta de Valcorona', z: 1, style: 'crypt', gen: 'rooms',
    entrance: { town: 'valcorona' }, rect: { x: 126, y: 50, w: 48, h: 34 },
    spawns: [['esqueleto', 12], ['necrofago', 5]],
  },
  {
    id: 'catacumbas', name: 'Catacumbas Profundas', z: 2, style: 'crypt', gen: 'rooms',
    from: 'cripta', rect: { x: 0, y: 0, w: 44, h: 32 },
    spawns: [['espectro', 6], ['necrofago', 5], ['esqueleto', 6]], boss: 'nigromante',
  },
  {
    id: 'madriguera', name: 'Madriguera Trasga', z: 1, style: 'cave', gen: 'ca',
    entrance: { x: 100, y: 42 }, rect: { x: 78, y: 26, w: 44, h: 30 },
    spawns: [['trasgo', 10], ['trasgo_arquero', 6], ['trasgo_chaman', 4]],
  },
  {
    id: 'cueva_troll', name: 'Cueva de los Trolls', z: 1, style: 'cave', gen: 'ca',
    entrance: { x: 166, y: 40 }, rect: { x: 152, y: 26, w: 24, h: 22 },
    spawns: [['troll', 8], ['murcielago', 3]],
  },
  {
    id: 'minas', name: 'Minas de Hondaforja', z: 1, style: 'mine', gen: 'rooms',
    entrance: { town: 'hondaforja' }, rect: { x: 178, y: 8, w: 56, h: 32 },
    spawns: [['golem', 9], ['arana_gigante', 6], ['troll', 4], ['murcielago', 3]],
  },
  {
    id: 'fauces', name: 'Fauces de Ceniza', z: 2, style: 'lava', gen: 'ca',
    from: 'minas', rect: { x: 0, y: 0, w: 52, h: 38 },
    spawns: [['salamandra', 9], ['draco', 5]], boss: 'ignaroth',
  },
  {
    id: 'gruta', name: 'Gruta Inundada', z: 1, style: 'flooded', gen: 'ca',
    entrance: { x: 206, y: 138 }, rect: { x: 184, y: 126, w: 46, h: 32 },
    spawns: [['lagarto', 8], ['lagarto_sabio', 4], ['sapo', 4]],
  },
];

/** Zonas de criaturas en la superficie: [criatura, x, y, radio, cantidad]. */
export const SURFACE_SPAWNS: [string, number, number, number, number][] = [
  // Isla de Albor
  ['rata', 40, 145, 5, 4],
  ['rata', 16, 143, 4, 3],
  ['serpiente', 48, 141, 5, 4],
  ['serpiente', 24, 147, 4, 3],
  ['lobo', 44, 115, 6, 3],
  ['ciervo', 18, 116, 6, 2],
  ['jabali', 10, 124, 4, 2],
  // Llanuras de Valcorona
  ['lobo', 100, 102, 8, 4],
  ['ciervo', 112, 110, 8, 3],
  ['jabali', 92, 90, 7, 3],
  ['lobo', 168, 94, 8, 4],
  ['ciervo', 150, 122, 8, 3],
  ['jabali', 122, 126, 8, 3],
  ['bandido', 140, 142, 6, 6],
  ['bandido', 84, 98, 5, 3],
  // Bosque Umbrío
  ['trasgo', 86, 56, 7, 5],
  ['trasgo_arquero', 86, 56, 7, 2],
  ['trasgo', 122, 42, 7, 5],
  ['trasgo_arquero', 122, 42, 6, 3],
  ['trasgo_chaman', 122, 42, 5, 1],
  ['oso', 72, 76, 8, 3],
  ['oso', 142, 30, 8, 3],
  ['lobo', 106, 30, 8, 4],
  ['arpia', 158, 52, 6, 3],
  // Montes Ferrosos
  ['troll', 196, 56, 7, 4],
  ['troll', 180, 62, 6, 3],
  ['arpia', 212, 46, 6, 3],
  ['golem', 206, 64, 6, 2],
  // Pantano de Nieblaseca
  ['babosa', 180, 130, 8, 5],
  ['sapo', 200, 142, 8, 5],
  ['lagarto', 216, 120, 7, 4],
  ['sapo', 176, 146, 7, 4],
  ['lagarto', 196, 152, 7, 3],
  ['babosa', 214, 98, 6, 3],
];

/** Zonas con nombre, para el letrero de zona. Se elige la primera que contenga el punto. */
export const AREAS: { name: string; x: number; y: number; w: number; h: number }[] = [
  { name: 'Isla de Albor', x: 0, y: 100, w: 62, h: 70 },
  { name: 'Montes Ferrosos', x: 165, y: 0, w: 75, h: 75 },
  { name: 'Pantano de Nieblaseca', x: 165, y: 90, w: 75, h: 80 },
  { name: 'Bosque Umbrío', x: 55, y: 0, w: 110, h: 62 },
  { name: 'Llanuras de Valcorona', x: 55, y: 62, w: 120, h: 108 },
];
