// Vocaciones. Se empieza como Aprendiz y se elige vocación con el Oráculo de Albor.

export type VocId = 'aprendiz' | 'guerrero' | 'arquero' | 'brujo' | 'chaman';

export interface VocationDef {
  id: VocId;
  name: string;
  desc: string;
  hpPerLevel: number;
  manaPerLevel: number;
  capPerLevel: number;
  /** Multiplicador de cuánto cuesta subir cada habilidad (menor = más rápido). */
  meleeRate: number;
  distRate: number;
  shieldRate: number;
  magicRate: number;
  /** Regeneración por tic (cada 3 s) mientras se está saciado. */
  regenHp: number;
  regenMana: number;
}

export const VOCATIONS: Record<VocId, VocationDef> = {
  aprendiz: {
    id: 'aprendiz', name: 'Aprendiz', desc: 'Aún no has elegido tu camino.',
    hpPerLevel: 5, manaPerLevel: 5, capPerLevel: 10,
    meleeRate: 1.5, distRate: 1.5, shieldRate: 1.5, magicRate: 3,
    regenHp: 2, regenMana: 2,
  },
  guerrero: {
    id: 'guerrero', name: 'Guerrero', desc: 'Lucha cuerpo a cuerpo con espadas, hachas y mazas. Aguanta muchísimo.',
    hpPerLevel: 15, manaPerLevel: 5, capPerLevel: 25,
    meleeRate: 1.1, distRate: 1.4, shieldRate: 1.1, magicRate: 3,
    regenHp: 6, regenMana: 2,
  },
  arquero: {
    id: 'arquero', name: 'Arquero', desc: 'Dispara flechas desde lejos y domina la magia sagrada menor.',
    hpPerLevel: 10, manaPerLevel: 15, capPerLevel: 20,
    meleeRate: 1.2, distRate: 1.1, shieldRate: 1.1, magicRate: 1.4,
    regenHp: 4, regenMana: 4,
  },
  brujo: {
    id: 'brujo', name: 'Brujo', desc: 'Domina el fuego y el rayo. Golpea fuerte, pero es frágil.',
    hpPerLevel: 5, manaPerLevel: 30, capPerLevel: 10,
    meleeRate: 2, distRate: 2, shieldRate: 1.5, magicRate: 1.1,
    regenHp: 2, regenMana: 7,
  },
  chaman: {
    id: 'chaman', name: 'Chamán', desc: 'Usa el hielo y la tierra, y es el mejor sanador de Brumaria.',
    hpPerLevel: 5, manaPerLevel: 30, capPerLevel: 10,
    meleeRate: 2, distRate: 2, shieldRate: 1.5, magicRate: 1.1,
    regenHp: 2, regenMana: 7,
  },
};

export const PLAYABLE_VOCS: VocId[] = ['guerrero', 'arquero', 'brujo', 'chaman'];
