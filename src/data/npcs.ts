// Habitantes de Brumaria. Se habla con ellos diciendo "hola" (o haciendo clic sobre ellos).
// Las palabras entre {llaves} se resaltan en el chat como sugerencias.
import type { Look } from './monsters';

export type NpcRole = 'heal' | 'home' | 'oracle' | 'spells' | 'travel' | 'guard' | 'houses';

export interface NpcDef {
  id: string;
  name: string;
  town: string;
  look: Look;
  greet: string;
  bye: string;
  job: string;
  keywords?: Record<string, string>;
  /** Lo que vende (id, precio) y lo que compra (ids; paga el valor del objeto). */
  shop?: { sells?: [string, number][]; buys?: string[] };
  roles?: NpcRole[];
  travel?: { town: string; price: number }[];
  /** Radio en el que pasea. 0 = quieto. */
  wander?: number;
  /** Frases que dice de vez en cuando. */
  idle?: string[];
}

const human = (c1: string, c2: string, hair: string, extra: Partial<Look> = {}): Look => ({
  body: 'humanoid', c1, c2, skin: '#e0b089', hair, weapon: 'none', ...extra,
});
const dwarf = (c1: string, c2: string, hair: string, extra: Partial<Look> = {}): Look => ({
  body: 'humanoid', c1, c2, skin: '#d99a6c', hair, weapon: 'none', scale: 0.85, ...extra,
});

const ISLAND_LOOT = ['cola_rata', 'piel_serpiente', 'piel_lobo', 'colmillo', 'carne', 'jamon', 'queso', 'garrote', 'daga', 'espada_corta', 'hacha', 'jubon', 'calzas', 'gorro_cuero', 'escudo_madera'];
const COMMON_LOOT = ['piel_lobo', 'piel_oso', 'colmillo', 'oreja_trasgo', 'hueso', 'craneo', 'tela_sucia', 'pluma_harpia', 'garra', 'cola_rata', 'piel_serpiente'];
const GEAR = ['daga', 'espada_corta', 'hacha', 'maza', 'espada_larga', 'arco', 'escudo_madera', 'escudo_hierro', 'casco_hierro', 'cota_malla', 'grebas', 'jubon', 'calzas', 'gorro_cuero', 'botas_cuero'];
const GEMS = ['rubi', 'zafiro', 'esmeralda'];

export const NPC_LIST: NpcDef[] = [
  // ======================= ALBOR =======================
  {
    id: 'oraculo', name: 'El Oráculo', town: 'albor', roles: ['oracle'],
    look: human('#f2f2f2', '#c9a24a', '#f2f2f2', { hood: true }),
    greet: 'Bienvenido, {aprendiz}. Veo en ti muchos caminos. Cuando estés listo, pregúntame por tu {vocación}.',
    bye: 'Que los caminos te sean leves.',
    job: 'Guío a los jóvenes hacia su {vocación}.',
    keywords: {
      aprendiz: 'Todos empiezan aquí, tras las murallas de Albor. Cuando alcances el {nivel 6}, podrás elegir tu {vocación}.',
      brumaria: 'Fuera de las murallas está Brumaria: la capital {Valcorona} al este, los Montes Ferrosos, el Pantano de Nieblaseca...',
      valcorona: 'La capital del reino, al este. Allí la Maestra Selene enseña hechizos.',
    },
  },
  {
    id: 'hermana_lia', name: 'Hermana Lía', town: 'albor', roles: ['heal', 'home'],
    look: human('#efe6d6', '#c9a24a', '#a8743c', { hood: true }),
    greet: 'La luz te saluda, viajero. Si estás herido puedo {curarte}. También puedo hacer de este templo tu {hogar}.',
    bye: 'Ve con la luz.',
    job: 'Cuido del templo de Albor. Aquí despiertan los que caen.',
    keywords: {
      muerte: 'Si caes en combate despertarás en el templo de tu {hogar}, pero perderás parte de tu experiencia.',
      comida: 'Sin comida no recuperarás vida ni maná. Mirta vende pan y manzanas.',
    },
  },
  {
    id: 'mirta', name: 'Mirta', town: 'albor', wander: 0,
    look: human('#6aa84f', '#efe6d6', '#c96a3a'),
    greet: '¡Hola, hola! Bienvenido a la tienda de Mirta. ¿Quieres {comerciar}?',
    bye: '¡Vuelve pronto!',
    job: 'Vendo un poco de todo: comida, antorchas, armas sencillas... y compro lo que traigas de los alrededores.',
    shop: {
      sells: [['pan', 3], ['manzana', 2], ['queso', 4], ['antorcha', 5], ['pocion_vida', 45], ['pocion_mana', 50], ['garrote', 5], ['daga', 10], ['honda', 15], ['gorro_cuero', 12], ['jubon', 20], ['calzas', 12], ['sandalias', 6], ['botas_cuero', 15]],
      buys: ISLAND_LOOT,
    },
  },
  {
    id: 'teodoro', name: 'Anciano Teodoro', town: 'albor', roles: ['houses'],
    look: human('#5a3fa0', '#3a2a1a', '#e8e8e8'),
    greet: 'Ah, un rostro nuevo. Siéntate, siéntate. ¿Buscas una {misión}? También llevo el registro de {casas} en venta.',
    bye: 'Cuídate, muchacho.',
    job: 'Soy el alcalde de Albor. También vendo las {casas} vacías de la ciudad.',
    keywords: {
      albor: 'Albor es una ciudad pequeña y amurallada, pero aquí empiezan todos los héroes de Brumaria.',
      ratas: 'Malditas ratas. Infestan los {Ductos}, bajo nuestros pies.',
      ductos: 'Las viejas alcantarillas. Se entra por la rejilla de la plaza. Dicen que allí abajo manda una rata enorme.',
      rurik: 'El capitán Rurik guarda el portón. Nadie sale sin su permiso.',
      bertran: 'El capitán Bertrán manda la guardia de Valcorona. Buen hombre, aunque gruñón.',
    },
  },
  {
    id: 'brann', name: 'Brann el Herrero', town: 'albor',
    look: human('#6b4a2a', '#2a2a2a', '#3a2a1a'),
    greet: '*Clang* ¿Eh? Ah, hola. ¿Vienes a {comerciar} o buscas una {misión}?',
    bye: '*Clang, clang*',
    job: 'Forjo y vendo armas y armaduras. Lo básico para sobrevivir en la isla.',
    shop: {
      sells: [['espada_corta', 40], ['hacha', 55], ['escudo_madera', 25], ['casco_hierro', 90], ['grebas', 120], ['flecha', 1]],
      buys: ['garrote', 'daga', 'espada_corta', 'hacha', 'escudo_madera', 'casco_hierro', 'jubon', 'calzas', 'gorro_cuero'],
    },
  },




  {
    id: 'capitan_rurik', name: 'Capitán Rurik', town: 'albor',
    look: human('#9aa0a6', '#a83a3a', '#5a3a1a', { helmet: true, weapon: 'sword' }),
    greet: 'Soy el capitán Rurik, guardián del portón de Albor. Si quieres salir, antes tendrás que cumplir una {misión}.',
    bye: 'Mantén la guardia alta.',
    job: 'Mando la guardia de Albor. Nadie sale de la ciudad sin mi permiso.',
    keywords: {
      salir: 'Fuera hay bandidos, lobos y cosas peores. Demuestra tu valía en los {Ductos} y te dejaré pasar.',
      ductos: 'Las alcantarillas bajo la ciudad. La entrada es la rejilla de la plaza.',
      corona: 'El Rey de las Ratas lleva una corona robada. Tráemela como prueba.',
    },
  },
  {
    id: 'guardia_albor', name: 'Guardia del portón', town: 'albor', roles: ['guard'],
    look: human('#9aa0a6', '#a83a3a', '#3a2a1a', { helmet: true, weapon: 'sword' }),
    greet: 'Alto. Nadie sale de Albor sin el permiso del capitán Rurik. Lo encontrarás en el cuartel, aquí al lado.',
    bye: 'Circule.',
    job: 'Vigilo el portón de Albor.',
    idle: ['Sin permiso del capitán, nadie sale.', 'Todo tranquilo en el portón.'],
  },
  {
    id: 'lena', name: 'Lena la Tejedora', town: 'albor',
    look: human('#c96a9a', '#5a3a5a', '#c96a3a'),
    greet: 'Oh, ¡visita! Pasa, pasa. Esta casa tiene dos plantas, ¿sabes? Arriba tengo mis telares.',
    bye: 'Vuelve cuando quieras.',
    job: 'Tejo las capas de la guardia.',
    keywords: {
      ductos: 'Por las noches se oye a las ratas correr bajo el suelo. ¡Qué asco!',
      rurik: 'El capitán es serio, pero justo. Si le traes lo que pide, te dejará salir.',
    },
    idle: ['¿Dónde habré dejado la lana azul...?'],
  },

  {
    id: 'brom', name: 'Brom el Tabernero', town: 'albor',
    look: human('#8a5a2b', '#3a2a1a', '#c96a3a'),
    greet: '¡Bienvenido a La Rata Borracha! Siéntate donde quieras. ¿Te pongo algo? Di {comerciar}.',
    bye: '¡Vuelve cuando tengas sed!',
    job: 'Llevo la taberna más famosa de Albor. Bueno, la única.',
    keywords: {
      taberna: 'La Rata Borracha. El nombre se lo puso mi abuelo, después de una noche muy larga.',
      cerveza: 'La mejor de la ciudad. La fermento yo mismo en el sótano... lejos de los Ductos, tranquilo.',
      lirio: 'Lirio toca aquí cada noche a cambio de cerveza. Un buen trato para los dos.',
    },
    shop: { sells: [['cerveza', 3], ['pan', 3], ['queso', 4], ['jamon', 8]], buys: ['carne', 'jamon', 'queso', 'cola_rata', 'piel_serpiente'] },
    idle: ['¡Otra ronda!', '¿Alguien ha visto mi trapo?', 'Hoy la cerveza está mejor que nunca.'],
  },
  {
    id: 'lirio', name: 'Lirio el Bardo', town: 'albor',
    look: human('#3e8a6a', '#c9a24a', '#f2d14c', { hood: true }),
    greet: '¡Un público nuevo! Siéntate, que te canto una {canción} o te cuento una {historia}.',
    bye: 'Que tus pasos rimen con tu suerte.',
    job: 'Canto canciones y cuento historias a cambio de cerveza.',
    keywords: {
      cancion: '♪ Bajo la plaza duerme un rey, de cola larga y sin ley; quien le quite la corona, cruzará la puerta sola... ♪',
      historia: 'Dicen que antes de Valcorona hubo un reino que ardió en una sola noche. Un wyrm de ceniza dormía bajo las montañas... y dicen que despierta.',
    },
    idle: ['♪ La la laaa... ♪', '¿Alguien conoce una rima para «Rurik»?', '♪ Albor, Albor, de piedra y de flor... ♪'],
  },

  // ======================= VALCORONA =======================
  {
    id: 'elena', name: 'Hermana Elena', town: 'valcorona', roles: ['heal', 'home'],
    look: human('#efe6d6', '#f2c94c', '#f2d14c', { hood: true }),
    greet: 'Bienvenido al Gran Templo de Valcorona. Puedo {curarte}, hacer de este templo tu {hogar}, o quizá tenga una {misión} para ti.',
    bye: 'Que el Alba te acompañe.',
    job: 'Soy la suma sacerdotisa del Alba.',
    keywords: {
      cripta: 'Bajo el cementerio, al noreste de la ciudad, están las criptas de los antiguos reyes.',
      morvaine: 'Morvaine fue un sacerdote de este templo. Buscó la vida eterna en los libros prohibidos.',
      rey: 'El rey Aldric está en el castillo, al noreste. Solo recibe a quienes han demostrado su valía.',
    },
  },
  {
    id: 'rey_aldric', name: 'Rey Aldric', town: 'valcorona',
    look: human('#c0392b', '#f2c94c', '#8a6a4a', { helmet: true }),
    greet: 'Bienvenido a mi corte, súbdito. ¿Qué te trae ante el trono? Si eres un héroe, quizá tenga una {misión} para ti.',
    bye: 'Larga vida a Brumaria.',
    job: 'Soy el rey de Brumaria, por la gracia del Alba.',
    keywords: {
      ignaroth: 'El wyrm de ceniza. Mi abuelo decía que su aliento podía fundir montañas.',
      brumaria: 'Mi reino. Cuatro tierras unidas bajo una corona: Albor, Valcorona, Hondaforja y Juncal.',
    },
  },
  {
    id: 'bertran', name: 'Capitán Bertrán', town: 'valcorona',
    look: human('#9aa0a6', '#3e5fa8', '#3a2a1a', { helmet: true, weapon: 'sword' }),
    greet: '¡Firmes! Ah, un civil. ¿Qué quieres? Si buscas trabajo, pregunta por una {misión}.',
    bye: '¡Descanse!',
    job: 'Mando la guardia de Valcorona y mantengo seguros los caminos.',
    keywords: {
      trasgos: 'Esas alimañas verdes del Bosque Umbrío. Se multiplican como conejos.',
      bandidos: 'Ladrones y desertores. Acampan al sureste, junto al río.',
      carta: 'Si traes una carta, dímelo con una {misión}.',
    },
  },
  {
    id: 'gorm', name: 'Gorm el Armero', town: 'valcorona',
    look: human('#5a3a1a', '#2a2a2a', '#c96a3a'),
    greet: 'Las mejores armas de Brumaria, al alcance de tu bolsa. ¿Quieres {comerciar}?',
    bye: 'Que tu filo no se mella.',
    job: 'Vendo armas: espadas, hachas, mazas, arcos y munición.',
    shop: {
      sells: [['espada_corta', 40], ['hacha', 55], ['maza', 110], ['espada_larga', 400], ['arco', 160], ['arco_compuesto', 1200], ['flecha', 1], ['flecha_fuego', 4]],
      buys: [...GEAR, 'arco_compuesto', 'hacha_enana'],
    },
  },
  {
    id: 'ilsa', name: 'Ilsa la Armera', town: 'valcorona',
    look: human('#9aa0a6', '#c0392b', '#2a1a10'),
    greet: 'Buen día. Cascos, corazas, escudos... lo que necesites para volver vivo. ¿Quieres {comerciar}?',
    bye: 'Vuelve entero.',
    job: 'Vendo armaduras y escudos.',
    shop: {
      sells: [['escudo_hierro', 180], ['escudo_corona', 1600], ['casco_hierro', 90], ['casco_guardia', 900], ['cota_malla', 300], ['coraza', 1800], ['grebas', 120], ['grebas_corona', 1300], ['botas_cuero', 15]],
      buys: [...GEAR, 'escudo_corona', 'casco_guardia', 'coraza', 'grebas_corona'],
    },
  },
  {
    id: 'ulric', name: 'Maese Ulric', town: 'valcorona',
    look: human('#5a3fa0', '#7a5cff', '#e8e8e8', { hood: true, weapon: 'staff' }),
    greet: 'Ah, ¿un aficionado a lo arcano? Pociones, varitas y báculos. ¿Quieres {comerciar}?',
    bye: 'Que tu maná nunca se agote.',
    job: 'Vendo objetos mágicos y compro gemas.',
    shop: {
      sells: [['pocion_vida', 45], ['pocion_mana', 50], ['pocion_vida_g', 190], ['pocion_mana_g', 120], ['varita_chispa', 200], ['varita_brasa', 1000], ['baculo_musgo', 200], ['baculo_escarcha', 1000], ['libro_runas', 700], ['capucha_mago', 400], ['tunica_mago', 800], ['anillo_vida', 900]],
      buys: [...GEMS, 'varita_chispa', 'varita_brasa', 'baculo_musgo', 'baculo_escarcha', 'libro_runas', 'tunica_mago', 'capucha_mago', 'seda_arana', 'nucleo_golem'],
    },
  },
  {
    id: 'rosa', name: 'Rosa la Tabernera', town: 'valcorona',
    look: human('#c0392b', '#efe6d6', '#c96a3a'),
    greet: '¡Bienvenido a El Jabalí Dorado! ¿Algo de {comer}? También compro pieles y carne. ¿Quieres {comerciar}?',
    bye: '¡Vuelve cuando tengas hambre!',
    job: 'Llevo la mejor taberna de la capital.',
    keywords: { comer: 'Tengo pan, queso, jamón y pescado. Di {comerciar}.', rumores: 'Dicen que algo despierta bajo las minas de Hondaforja... y que de la cripta salen ruidos por las noches.' },
    shop: {
      sells: [['pan', 3], ['queso', 4], ['jamon', 8], ['pescado', 4], ['manzana', 2], ['carne', 5], ['antorcha', 5]],
      buys: [...COMMON_LOOT, 'carne', 'jamon', 'escama_lagarto', 'ojo_sapo', 'colmillo_troll'],
    },
    idle: ['¡Jamón recién cortado!', '¿Has oído los últimos {rumores}?'],
  },
  {
    id: 'selene', name: 'Maestra Selene', town: 'valcorona', roles: ['spells'],
    look: human('#3e5fa8', '#f2c94c', '#2a1a10', { hood: true, weapon: 'staff' }),
    greet: 'Bienvenido al Gremio de los Cuatro Caminos. Puedo enseñarte {hechizos} de tu vocación.',
    bye: 'Practica cada día.',
    job: 'Enseño hechizos a guerreros, arqueros, brujos y chamanes.',
  },
  {
    id: 'tobias', name: 'Tobías el Cochero', town: 'valcorona', roles: ['travel'],
    travel: [{ town: 'hondaforja', price: 80 }, { town: 'juncal', price: 60 }, { town: 'albor', price: 40 }],
    look: human('#6b4a2a', '#efe6d6', '#8a6a4a'),
    greet: '¿Necesitas transporte? Voy a {Hondaforja}, {Juncal} y {Albor}. Di {viajar}.',
    bye: '¡Arre!',
    job: 'Llevo viajeros en mi carro por los caminos del reino.',
  },
  {
    id: 'guardia', name: 'Guardia', town: 'valcorona', roles: ['guard'], wander: 3,
    look: human('#9aa0a6', '#3e5fa8', '#3a2a1a', { helmet: true, weapon: 'sword' }),
    greet: 'Circule, ciudadano. La ciudad es segura: ningún monstruo cruza nuestras murallas.',
    bye: 'Circule.',
    job: 'Vigilo las calles de Valcorona.',
    idle: ['Todo en orden.', 'Circulen.'],
  },

  // ======================= HONDAFORJA =======================
  {
    id: 'durgin', name: 'Durgin Barbahierro', town: 'hondaforja',
    look: dwarf('#6b4a2a', '#2a2a2a', '#c96a3a'),
    greet: '¡Hola, larguirucho! Soy Durgin, el mejor herrero bajo la montaña. ¿Quieres {comerciar} o tienes ganas de una {misión}?',
    bye: '¡Que tu acero no se oxide!',
    job: 'Forjo las mejores armas de Brumaria. Las de Valcorona son de juguete.',
    keywords: { minas: 'Las minas eran nuestro orgullo. Ahora están llenas de gólems locos, arañas... y algo peor, más abajo.' },
    shop: {
      sells: [['hacha_enana', 2500], ['espada_larga', 380], ['escudo_hierro', 170], ['coraza', 1700], ['casco_guardia', 850], ['grebas_corona', 1250], ['flecha_fuego', 4]],
      buys: [...GEAR, 'hacha_enana', 'coraza', 'casco_guardia', 'grebas_corona', 'escudo_corona', 'escudo_escamas', 'coraza_escamas', 'mineral_hierro'],
    },
  },
  {
    id: 'bruna', name: 'Bruna', town: 'hondaforja',
    look: dwarf('#c0392b', '#efe6d6', '#f2d14c'),
    greet: '¡Bienvenido a la despensa de Bruna! Comida, pociones y antorchas, ¡las vas a necesitar ahí abajo! ¿Quieres {comerciar}?',
    bye: '¡Come bien!',
    job: 'Abastezco a los mineros. Y compro lo que saquen de las minas.',
    shop: {
      sells: [['jamon', 8], ['pan', 3], ['seta', 2], ['antorcha', 5], ['pocion_vida', 45], ['pocion_mana', 50], ['pocion_vida_g', 190], ['pocion_mana_g', 120]],
      buys: ['mineral_hierro', 'nucleo_golem', 'colmillo_troll', 'seda_arana', 'escama_dragon', 'garra', 'pluma_harpia', ...GEMS],
    },
  },
  {
    id: 'hilda', name: 'Hilda la Sanadora', town: 'hondaforja', roles: ['heal', 'home'],
    look: dwarf('#efe6d6', '#4ad0ff', '#e8e8e8', { hood: true }),
    greet: 'Que la piedra te sostenga. Puedo {curarte} o hacer de esta capilla tu {hogar}.',
    bye: 'Firme como la roca.',
    job: 'Atiendo la capilla de la Piedra.',
  },
  {
    id: 'thrain', name: 'Thrain, Guardián de la Mina', town: 'hondaforja',
    look: dwarf('#9aa0a6', '#c0392b', '#3a2a1a', { helmet: true, weapon: 'axe' }),
    greet: 'Alto. Esta es la entrada a las minas. Si bajas, que sea con una {misión} y bien armado.',
    bye: 'Vuelve vivo.',
    job: 'Guardo la entrada a las minas.',
    keywords: {
      minas: 'El primer nivel tiene gólems, arañas y trolls. Más abajo están las {Fauces de Ceniza}.',
      fauces: 'Una caverna de lava, abierta hace poco. El calor sube por las grietas. Algo enorme respira ahí. Algunos dicen {Ignaroth}.',
      ignaroth: 'Si de verdad es Ignaroth, solo el rey de Valcorona puede encargar semejante locura.',
    },
  },
  {
    id: 'korr', name: 'Korr el Carretero', town: 'hondaforja', roles: ['travel'],
    travel: [{ town: 'valcorona', price: 80 }, { town: 'juncal', price: 100 }],
    look: dwarf('#6b4a2a', '#9aa0a6', '#8a6a4a'),
    greet: '¿Bajar al llano? Voy a {Valcorona} y a {Juncal}. Di {viajar}.',
    bye: 'Sujétate fuerte.',
    job: 'Llevo mineral y pasajeros montaña abajo.',
  },

  // ======================= JUNCAL =======================
  {
    id: 'agata', name: 'Ágata la Bruja', town: 'juncal',
    look: human('#2a2a2a', '#6aa84f', '#e8e8e8', { hood: true, weapon: 'staff' }),
    greet: 'Je, je, je... Un visitante. ¿Vienes a {comerciar}, o te atreves con una {misión}?',
    bye: 'Je, je. Vuelve pronto, vuelve...',
    job: 'Preparo pociones y otras cosas que es mejor no preguntar.',
    keywords: { pantano: 'La niebla esconde muchas cosas. Sapos, babosas, lagartos... y secretos.' },
    shop: {
      sells: [['pocion_vida', 42], ['pocion_mana', 48], ['pocion_vida_g', 180], ['pocion_mana_g', 115], ['seta', 2]],
      buys: ['ojo_sapo', 'escama_lagarto', 'seda_arana', 'pluma_harpia', ...GEMS],
    },
  },
  {
    id: 'nilo', name: 'Nilo el Pescador', town: 'juncal',
    look: human('#8fb3c9', '#5a4a3a', '#2a1a10'),
    greet: 'Buenas. Pescado del pantano, sabroso aunque feo. ¿Quieres {comerciar}?',
    bye: 'Cuidado con los lagartos.',
    job: 'Pesco en los canales de Juncal.',
    shop: { sells: [['pescado', 3], ['pan', 3], ['antorcha', 5], ['flecha', 1]], buys: [...COMMON_LOOT, 'escama_lagarto', 'ojo_sapo', 'carne'] },
  },
  {
    id: 'yara', name: 'Yara la Curandera', town: 'juncal', roles: ['heal', 'home'],
    look: human('#3f8a6a', '#efe6d6', '#2a1a10', { hood: true }),
    greet: 'Bienvenido a Juncal. Puedo {curarte}, hacer de mi cabaña tu {hogar}... y tengo una {misión} para quien sea valiente.',
    bye: 'Que la niebla no te pierda.',
    job: 'Curo a los pescadores y cazadores de Juncal.',
    keywords: { gruta: 'La Gruta Inundada está al sureste del pueblo. De ahí salen los hombres lagarto.' },
  },
  {
    id: 'ciro', name: 'Escribano Ciro', town: 'juncal', roles: ['houses'],
    look: human('#5a4a3a', '#efe6d6', '#8a6a4a'),
    greet: 'Buenas. Soy el escribano de Juncal. Si quieres una casa propia, pregúntame por las {casas} en venta.',
    bye: 'Que tus papeles estén siempre en orden.',
    job: 'Llevo el registro de las {casas} de Brumaria.',
  },
  {
    id: 'mosca', name: 'Mosca la Barquera', town: 'juncal', roles: ['travel'],
    travel: [{ town: 'valcorona', price: 60 }, { town: 'hondaforja', price: 100 }],
    look: human('#5a7a2a', '#efe6d6', '#c96a3a'),
    greet: 'Mi barca cruza los canales hasta el camino real. Voy a {Valcorona} y a {Hondaforja}. Di {viajar}.',
    bye: 'Cuidado al bajar.',
    job: 'Llevo pasajeros por el pantano.',
  },
];

export const NPCS: Record<string, NpcDef> = Object.fromEntries(NPC_LIST.map((n) => [n.id, n]));
