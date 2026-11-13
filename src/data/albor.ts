// Albor: ciudad amurallada de inicio. Se construye a partir de piezas para que las filas cuadren.
// Usa la misma leyenda que las plantillas de data/world.ts, más:
//   '^' escalera que sube (planta baja)   'v' escalera que baja (planta alta)
//   'G' portón de la ciudad              'p' maceta
//   '$' puerta de una casa en venta (con llave hasta que es tuya)   '&' baúl de la casa

const W = 62;
const H = 38;

/** Casas de 9 x 7 con la puerta abajo; las de la fila sur se usan volteadas (puerta arriba). */
const HOUSES: { ground: string[]; upper: string[] }[] = [
  {
    ground: [
      'WWWWWWWWW',
      'W_B_t_h_W',
      'W_______W',
      'W_o___^_W',
      'W_t_h___W',
      'Wp______W',
      'WWWW+WWWW',
    ],
    upper: [
      'WWWWWWWWW',
      'W_b___b_W',
      'W_______W',
      'W_&___v_W',
      'W_______W',
      'W_t__h__W',
      'WWWWWWWWW',
    ],
  },
  {
    ground: [
      'WWWWWWWWW',
      'W^___o_xW',
      'W_______W',
      'Wt_h___KW',
      'W_t_____W',
      'W______pW',
      'WWWW+WWWW',
    ],
    upper: [
      'WWWWWWWWW',
      'Wv__b_b_W',
      'W_______W',
      'W_B___t_W',
      'W_______W',
      'W_&_h___W',
      'WWWWWWWWW',
    ],
  },
  {
    ground: [
      'WWWWWWWWW',
      'W_B_B_B_W',
      'W_______W',
      'W_t_t_t_W',
      'W_h_h_h_W',
      'Wp_____^W',
      'WWWW+WWWW',
    ],
    upper: [
      'WWWWWWWWW',
      'W_b_____W',
      'W___t_h_W',
      'W_______W',
      'W_B___&_W',
      'W______vW',
      'WWWWWWWWW',
    ],
  },
  {
    ground: [
      'WWWWWWWWW',
      'W_o_o_x_W',
      'W_______W',
      'W_^___t_W',
      'W_____h_W',
      'Wp_____pW',
      'WWWW+WWWW',
    ],
    upper: [
      'WWWWWWWWW',
      'W_b_b_b_W',
      'W_______W',
      'W_v_____W',
      'W_______W',
      'W_&_t_h_W',
      'WWWWWWWWW',
    ],
  },
];

const TEMPLE = [
  '###############',
  '#:::::::::::::#',
  '#:r:::A:A:::r:#',
  '#:::::::::::::#',
  '#::B:::1:::B::#',
  '#:::::::::::::#',
  '#::3:::@::::::#',
  '#:::::::::::::#',
  '######++#######',
];

const SHOP = [
  'WWWW+WWWW',
  'W_______W',
  'W_cccc__W',
  'W__2____W',
  'W_o__pxxW',
  'Wp______W',
  'WWWWWWWWW',
];

const TEODORO = [
  'WWWW+WWWW',
  'W_______W',
  'W_B___t_W',
  'W___4_h_W',
  'Wb______W',
  'Wb___o_pW',
  'WWWWWWWWW',
];

const SMITHY = [
  'WWWW+WWWW',
  'W_______W',
  'W_N___K_W',
  'W___5___W',
  'W_x___o_W',
  'W_______W',
  'WWWWWWWWW',
];

const BARRACKS = [
  '####+####',
  '#_______#',
  '#_b_b_b_#',
  '#___6___#',
  '#_x___x_#',
  '#_______#',
  '#########',
];

const PLAZA = [
  'L,,,,,*,*,,,,,L',
  ',,,,,,,,,,,,,,,',
  ',,T,,,,,,,,,T,,',
  ',,,,,,,F,,,,,,,',
  ',,*,,,,,,,,,*,,',
  ',,,,,,,D,,,,,,,',
  ',,T,,,,,,,,,T,,',
  'L,,,,,,,,,,,,,L',
];

/** Taberna «La Rata Borracha»: barra, barriles, mesas y chimenea. */
const PUB = [
  'WWWWWW++WWWWWWW',
  'W_____________W',
  'W_t_h___h_t_h_W',
  'W_h_____t_____W',
  'W____0________W',
  'Wcccccc_____K_W',
  'Wo8o_o______p_W',
  'WWWWWWWWWWWWWWW',
];

import { greenify } from './greenify';

type Grid = string[][];

function put(g: Grid, x: number, y: number, rows: string[]) {
  rows.forEach((r, j) => [...r].forEach((ch, i) => {
    if (ch !== ' ') g[y + j][x + i] = ch;
  }));
}

const forSale = (rows: string[]) => rows.map((r) => r.replace('+', '$'));

export function buildAlbor(): { map: string[]; upper: string[] } {
  const g: Grid = Array.from({ length: H }, () => Array(W).fill(','));
  const u: Grid = Array.from({ length: H }, () => Array(W).fill(' '));
  // Muralla con el portón al este
  for (let x = 0; x < W; x++) g[0][x] = g[H - 1][x] = '#';
  for (let y = 0; y < H; y++) g[y][0] = g[y][W - 1] = '#';
  g[23][W - 1] = 'G';
  g[24][W - 1] = 'G';
  // 4 casas al norte (puerta al sur) y 4 al sur (puerta al norte)
  const cols = [2, 12, 41, 51];
  cols.forEach((x, i) => {
    const h = HOUSES[i % 4];
    // La segunda casa del norte es de Lena; las demás están a la venta
    put(g, x, 2, i === 1 ? h.ground : forSale(h.ground));
    put(u, x, 2, h.upper);
    const s = HOUSES[(i + 2) % 4];
    put(g, x, 28, forSale([...s.ground].reverse()));
    put(u, x, 28, [...s.upper].reverse());
  });
  put(g, 24, 2, TEMPLE);
  put(g, 2, 14, SHOP);
  put(g, 12, 14, TEODORO);
  put(g, 41, 14, SMITHY);
  put(g, 51, 14, BARRACKS);
  put(g, 24, 13, PLAZA);
  put(g, 24, 28, PUB);
  // Faroles en la avenida principal
  for (const x of [8, 18, 22, 39, 47, 57]) {
    g[21][x] = 'L';
    g[26][x] = 'L';
  }
  // Guardias a los lados del portón y una vecina en la segunda casa
  g[22][W - 2] = '7';
  g[25][W - 2] = '7';
  g[4][15] = '9';
  return { map: greenify(g.map((r) => r.join('')), [W - 2, 23], 4242), upper: u.map((r) => r.join('')) };
}
