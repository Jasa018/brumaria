// Misiones. Se piden a un NPC diciendo "misión".
import type { VocId } from './vocations';

export type Objective =
  | { type: 'kill'; monsters: string[]; count: number; label: string }
  | { type: 'bring'; item: string; count: number }
  | { type: 'deliver'; item: string; to: string };

export interface QuestDef {
  id: string;
  name: string;
  giver: string;
  minLevel?: number;
  requires?: string;
  /** Texto con que el NPC ofrece la misión (termina en pregunta de sí/no). */
  offer: string;
  accept: string;
  /** Lo que dice el NPC si vuelves sin terminar. */
  progress: string;
  done: string;
  /** Texto para el diario. */
  journal: string;
  objective: Objective;
  /** Objeto que te entregan al aceptar. */
  give?: [string, number];
  reward: { gold?: number; exp?: number; items?: [string, number][]; vocItems?: Partial<Record<VocId, string>> };
  /** Al terminarla, el juego muestra el final. */
  ending?: boolean;
}

export const QUESTS: QuestDef[] = [
  {
    id: 'ratas', name: 'Ratas en el granero', giver: 'teodoro',
    offer: 'Las ratas de la cueva del norte se están comiendo el grano de Albor. ¿Podrías matar {10 ratas}? ¿Sí o no?',
    accept: 'Bien dicho. La cueva está al norte del pueblo, siguiendo el camino. Lleva {comida}.',
    progress: 'Aún quedan ratas. Vuelve cuando hayas matado {10}.',
    done: '¡Magnífico! Albor te lo agradece. Toma este escudo, lo necesitarás.',
    journal: 'Mata 10 ratas en la cueva al norte de Albor.',
    objective: { type: 'kill', monsters: ['rata'], count: 10, label: 'ratas' },
    reward: { gold: 40, exp: 100, items: [['escudo_madera', 1]] },
  },
  {
    id: 'lobos', name: 'Pieles para el invierno', giver: 'brann',
    offer: 'Necesito {3 pieles de lobo} para forrar unas capas. Los lobos rondan el noreste de la isla. ¿Me las traes?',
    accept: 'Te espero aquí, junto al yunque.',
    progress: 'Todavía me faltan pieles. Necesito {3}.',
    done: 'Buenas pieles. Ten, un casco de verdad para esa cabeza tuya.',
    journal: 'Lleva 3 pieles de lobo a Brann, el herrero de Albor.',
    objective: { type: 'bring', item: 'piel_lobo', count: 3 },
    reward: { gold: 20, exp: 150, items: [['casco_hierro', 1]] },
  },
  {
    id: 'carta', name: 'Una carta para la capital', giver: 'teodoro', requires: 'ratas', minLevel: 5,
    offer: 'Debo avisar a la capital de lo que pasa en el continente. ¿Llevarías esta carta al {capitán Bertrán} de Valcorona?',
    accept: 'Aquí tienes la carta. Bertrán está en el cuartel, al sureste de la ciudad.',
    progress: '¿Aún no has entregado la carta a Bertrán?',
    done: '',
    journal: 'Entrega la carta sellada al capitán Bertrán en el cuartel de Valcorona.',
    objective: { type: 'deliver', item: 'carta_teodoro', to: 'bertran' },
    give: ['carta_teodoro', 1],
    reward: { gold: 100, exp: 300 },
  },
  {
    id: 'trasgos', name: 'La amenaza trasga', giver: 'bertran', minLevel: 8,
    offer: 'Los trasgos del Bosque Umbrío asaltan nuestras caravanas. Mata {20 trasgos} de cualquier tipo. ¿Aceptas?',
    accept: 'El bosque está al norte de la ciudad. Tienen una madriguera bajo tierra.',
    progress: 'Siguen llegando informes de trasgos. Necesito {20} bajas.',
    done: 'Las caravanas vuelven a pasar. Te has ganado este escudo de la guardia.',
    journal: 'Mata 20 trasgos en el Bosque Umbrío, al norte de Valcorona.',
    objective: { type: 'kill', monsters: ['trasgo', 'trasgo_arquero', 'trasgo_chaman'], count: 20, label: 'trasgos' },
    reward: { gold: 300, exp: 1500, items: [['escudo_hierro', 1]] },
  },
  {
    id: 'bandidos', name: 'Caminos seguros', giver: 'bertran', requires: 'trasgos', minLevel: 12,
    offer: 'Una banda de {bandidos} acampa en las llanuras del sureste. Acaba con {15} de ellos. ¿Lo harás?',
    accept: 'Su campamento está al sureste de la ciudad, cerca del río.',
    progress: 'Los bandidos siguen robando. Necesito {15} bajas.',
    done: 'Los mercaderes cantan tu nombre. Toma tu recompensa.',
    journal: 'Mata 15 bandidos en las llanuras al sureste de Valcorona.',
    objective: { type: 'kill', monsters: ['bandido'], count: 15, label: 'bandidos' },
    reward: { gold: 500, exp: 2500, items: [['pocion_vida', 5]] },
  },
  {
    id: 'cripta', name: 'Los muertos inquietos', giver: 'elena', minLevel: 15,
    offer: 'Algo se ha despertado en la {cripta} bajo el cementerio. Los muertos se levantan. Dicen que un nigromante, {Morvaine}, está detrás. Destrúyelo y tráeme su {filacteria}. ¿Lo harás?',
    accept: 'Que la luz te guarde. La entrada está en el cementerio, al noreste de la ciudad. Morvaine se esconde en lo más hondo.',
    progress: 'La cripta sigue maldita. Tráeme la {filacteria} de Morvaine.',
    done: 'La filacteria... por fin descansarán. Lleva este amuleto del Alba. Ya eres digno de hablar con el {rey}.',
    journal: 'Baja a la cripta de Valcorona, destruye a Morvaine el Nigromante y lleva su filacteria a la hermana Elena.',
    objective: { type: 'bring', item: 'filacteria', count: 1 },
    reward: { gold: 800, exp: 6000, items: [['amuleto_alba', 1]] },
  },
  {
    id: 'ojos', name: 'Ingredientes de bruja', giver: 'agata', minLevel: 12,
    offer: 'Je, je. Necesito {8 ojos de sapo} para mi caldero. Los sapos gigantes abundan en la ciénaga. ¿Me los traerás?',
    accept: 'No tardes, el caldero se enfría.',
    progress: 'Mi caldero sigue esperando {8} ojos de sapo.',
    done: '¡Qué ojos tan jugosos! Toma este anillo de bruma, te hará ligero como la niebla.',
    journal: 'Lleva 8 ojos de sapo a Ágata, la bruja de Juncal.',
    objective: { type: 'bring', item: 'ojo_sapo', count: 8 },
    reward: { gold: 100, exp: 3000, items: [['anillo_bruma', 1]] },
  },
  {
    id: 'lagartos', name: 'La gruta inundada', giver: 'yara', minLevel: 20,
    offer: 'Los {hombres lagarto} salen de la Gruta Inundada, al sureste, y atacan a nuestros pescadores. Mata {20}. ¿Aceptas?',
    accept: 'La gruta está al sureste de Juncal, entre los juncos.',
    progress: 'Siguen saliendo de la gruta. Necesito {20} bajas.',
    done: 'Juncal puede volver a pescar en paz. Gracias, de corazón.',
    journal: 'Mata 20 hombres lagarto (o sabios lagarto) cerca de Juncal o en la Gruta Inundada.',
    objective: { type: 'kill', monsters: ['lagarto', 'lagarto_sabio'], count: 20, label: 'hombres lagarto' },
    reward: { gold: 1500, exp: 8000, items: [['pocion_mana', 10], ['pocion_vida', 10]] },
  },
  {
    id: 'mineral', name: 'Hierro para la forja', giver: 'durgin', minLevel: 18,
    offer: 'Mi forja está fría. Tráeme {10 minerales de hierro} de las minas. Los gólems los llevan dentro. Te forjaré un arma digna de tu vocación. ¿Trato hecho?',
    accept: '¡Ja! La entrada a las minas está en la casa del este, aquí en Hondaforja.',
    progress: 'Aún no veo {10} minerales de hierro sobre mi yunque.',
    done: '¡Por mi barba! Buen hierro. Mira lo que he forjado para ti.',
    journal: 'Lleva 10 minerales de hierro a Durgin, el herrero de Hondaforja.',
    objective: { type: 'bring', item: 'mineral_hierro', count: 10 },
    reward: { exp: 5000, vocItems: { guerrero: 'hacha_enana', arquero: 'arco_compuesto', brujo: 'varita_brasa', chaman: 'baculo_escarcha', aprendiz: 'hacha' } },
  },
  {
    id: 'golems', name: 'Gólems desbocados', giver: 'thrain', minLevel: 25,
    offer: 'Nuestros gólems se han vuelto locos en las minas. Destruye {10} de ellos. ¿Aceptas?',
    accept: 'Ten cuidado ahí abajo. Y no bajes más hondo si no estás preparado.',
    progress: 'Aún oigo a los gólems golpeando las paredes. Necesito {10}.',
    done: 'Silencio en las minas, por fin. Estas botas de viento eran de mi padre. Ahora son tuyas.',
    journal: 'Destruye 10 gólems de piedra en las Minas de Hondaforja.',
    objective: { type: 'kill', monsters: ['golem'], count: 10, label: 'gólems' },
    reward: { gold: 1000, exp: 10000, items: [['botas_viento', 1]] },
  },
  {
    id: 'ignaroth', name: 'El Wyrm de Ceniza', giver: 'rey_aldric', requires: 'cripta', minLevel: 35,
    offer: 'Hace siglos, el wyrm {Ignaroth} redujo a ceniza el reino que había antes de Valcorona. Los enanos dicen que vuelve a despertar bajo las minas. Mátalo y tráeme su {corazón}. ¿Aceptas, campeón?',
    accept: 'Ve a Hondaforja y baja a lo más profundo de las minas, a las Fauces de Ceniza. Toda Brumaria cuenta contigo.',
    progress: 'Mientras Ignaroth respire, Brumaria vivirá con miedo.',
    done: '¡El corazón de ceniza! Lo has logrado. Desde hoy eres {Campeón de Brumaria}.',
    journal: 'Baja a las Fauces de Ceniza bajo las minas de Hondaforja, mata a Ignaroth y lleva su corazón al rey Aldric.',
    objective: { type: 'bring', item: 'corazon_ceniza', count: 1 },
    reward: { gold: 10000, exp: 30000 },
    ending: true,
  },
];

export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(QUESTS.map((q) => [q.id, q]));
