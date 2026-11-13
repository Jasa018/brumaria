// Hechizos. Se lanzan escribiendo sus palabras en el chat o con la barra de atajos.
import type { Element } from './items';
import type { VocId } from './vocations';

export type SpellKind = 'heal' | 'target' | 'area' | 'haste' | 'light' | 'conjure';

export interface SpellDef {
  id: string;
  name: string;
  words: string;
  kind: SpellKind;
  voc: VocId[];
  level: number;
  mana: number;
  /** Enfriamiento en segundos. */
  cd: number;
  element?: Element;
  /** Daño o curación: base + nivel*lv + nivelMágico*ml (o habilidad de arma para guerrero/arquero). */
  power?: { min: number; max: number };
  radius?: number;
  range?: number;
  conjure?: { item: string; count: number };
  duration?: number;
  /** Precio para aprenderlo con el maestro del gremio. 0 = se conoce desde el inicio. */
  price: number;
  desc: string;
}

const ALL: VocId[] = ['aprendiz', 'guerrero', 'arquero', 'brujo', 'chaman'];

export const SPELLS: SpellDef[] = [
  { id: 'sanar_menor', name: 'Sanar menor', words: 'vita lux', kind: 'heal', voc: ALL, level: 1, mana: 20, cd: 1, power: { min: 1.4, max: 2 }, price: 0, desc: 'Cura un poco de vida.' },
  { id: 'luz', name: 'Luz', words: 'lumen', kind: 'light', voc: ALL, level: 3, mana: 20, cd: 2, duration: 300, price: 0, desc: 'Ilumina a tu alrededor durante 5 minutos.' },
  { id: 'prisa', name: 'Prisa', words: 'celer pes', kind: 'haste', voc: ['guerrero', 'arquero', 'brujo', 'chaman'], level: 14, mana: 60, cd: 2, duration: 30, price: 600, desc: 'Aumenta tu velocidad durante 30 segundos.' },
  { id: 'crear_comida', name: 'Crear comida', words: 'panis', kind: 'conjure', voc: ['chaman', 'arquero'], level: 8, mana: 120, cd: 2, conjure: { item: 'pan', count: 2 }, price: 150, desc: 'Crea dos panes.' },

  // Guerrero
  { id: 'golpe_brutal', name: 'Golpe brutal', words: 'ira ferrum', kind: 'target', voc: ['guerrero'], level: 8, mana: 15, cd: 3, range: 1, element: 'physical', power: { min: 1, max: 2.2 }, price: 200, desc: 'Un golpe demoledor al enemigo adyacente.' },
  { id: 'remolino', name: 'Remolino', words: 'gyrus ferrum', kind: 'area', voc: ['guerrero'], level: 15, mana: 40, cd: 6, radius: 1, element: 'physical', power: { min: 1, max: 2 }, price: 800, desc: 'Golpea a todos los enemigos a tu alrededor.' },
  { id: 'aguante', name: 'Aguante', words: 'vita ferrum', kind: 'heal', voc: ['guerrero'], level: 10, mana: 40, cd: 2, power: { min: 4, max: 6 }, price: 300, desc: 'Cura heridas con pura voluntad.' },

  // Arquero
  { id: 'flecha_certera', name: 'Flecha certera', words: 'sagitta vera', kind: 'target', voc: ['arquero'], level: 8, mana: 25, cd: 2, range: 6, element: 'holy', power: { min: 1, max: 2 }, price: 200, desc: 'Una flecha de luz sagrada.' },
  { id: 'lluvia_flechas', name: 'Lluvia de flechas', words: 'imber sagitta', kind: 'area', voc: ['arquero'], level: 18, mana: 80, cd: 6, radius: 2, element: 'physical', power: { min: 1, max: 1.8 }, price: 1000, desc: 'Llueven flechas alrededor de ti.' },
  { id: 'sanar_mayor_a', name: 'Sanar mayor', words: 'vita magna', kind: 'heal', voc: ['arquero'], level: 12, mana: 70, cd: 2, power: { min: 5, max: 7 }, price: 500, desc: 'Cura una buena cantidad de vida.' },
  { id: 'crear_flechas', name: 'Crear flechas', words: 'faber sagitta', kind: 'conjure', voc: ['arquero'], level: 8, mana: 40, cd: 2, conjure: { item: 'flecha', count: 15 }, price: 100, desc: 'Crea 15 flechas.' },

  // Brujo
  { id: 'dardo_fuego', name: 'Dardo de fuego', words: 'ignis telum', kind: 'target', voc: ['brujo'], level: 8, mana: 20, cd: 2, range: 4, element: 'fire', power: { min: 1.6, max: 2.6 }, price: 200, desc: 'Lanza un dardo de fuego.' },
  { id: 'rayo', name: 'Rayo', words: 'fulgur telum', kind: 'target', voc: ['brujo'], level: 16, mana: 45, cd: 2, range: 4, element: 'energy', power: { min: 2.6, max: 4 }, price: 700, desc: 'Un rayo poderoso.' },
  { id: 'tormenta_fuego', name: 'Tormenta de fuego', words: 'ignis magna', kind: 'area', voc: ['brujo'], level: 20, mana: 110, cd: 6, radius: 2, element: 'fire', power: { min: 2, max: 3.4 }, price: 1500, desc: 'Fuego alrededor de ti.' },

  // Chamán
  { id: 'lanza_hielo', name: 'Lanza de hielo', words: 'glacies telum', kind: 'target', voc: ['chaman'], level: 8, mana: 20, cd: 2, range: 4, element: 'ice', power: { min: 1.6, max: 2.6 }, price: 200, desc: 'Lanza una esquirla de hielo.' },
  { id: 'raices', name: 'Raíces', words: 'terra magna', kind: 'area', voc: ['chaman'], level: 18, mana: 100, cd: 6, radius: 2, element: 'earth', power: { min: 1.8, max: 3 }, price: 1300, desc: 'Raíces brotan y golpean a todos alrededor.' },
  { id: 'sanar_mayor', name: 'Sanar mayor', words: 'vita magna', kind: 'heal', voc: ['chaman', 'brujo'], level: 11, mana: 70, cd: 1, power: { min: 6, max: 9 }, price: 500, desc: 'Cura una buena cantidad de vida.' },
  { id: 'sanar_suprema', name: 'Sanar suprema', words: 'vita suprema', kind: 'heal', voc: ['chaman'], level: 24, mana: 160, cd: 1, power: { min: 12, max: 16 }, price: 2000, desc: 'Una curación enorme.' },
];

export function spellsFor(voc: VocId): SpellDef[] {
  return SPELLS.filter((s) => s.voc.includes(voc));
}
