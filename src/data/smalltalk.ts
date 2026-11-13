// Charla cotidiana de los NPC: saludos, preguntas sencillas, rumores y chistes.
// Todo es texto fijo; dialog.ts elige la respuesta según lo que dice el jugador.

/** Cómo describen los demás a cada NPC (para "¿quién es X?"). */
export const ABOUT: Record<string, string> = {
  oraculo: 'El Oráculo guía a los jóvenes a elegir su vocación. Está en el templo de Albor.',
  hermana_lia: 'La hermana Lía cuida el templo de Albor y cura a los heridos.',
  mirta: 'Mirta tiene la tienda de Albor. Vende comida, antorchas y armas sencillas.',
  teodoro: 'El anciano Teodoro es el alcalde de Albor. Él vende las casas vacías.',
  brann: 'Brann es el herrero de Albor. Vende armas y armaduras para empezar.',
  capitan_rurik: 'El capitán Rurik manda la guardia de Albor. Sin su permiso nadie cruza el portón.',
  guardia_albor: 'Los guardias del portón obedecen al capitán Rurik.',
  lena: 'Lena teje las capas de la guardia. Vive en una casa de dos plantas al norte de Albor.',
  brom: 'Brom lleva La Rata Borracha, la taberna de Albor.',
  lirio: 'Lirio es el bardo que canta en La Rata Borracha cada noche.',
  elena: 'La hermana Elena es la suma sacerdotisa del Gran Templo de Valcorona.',
  rey_aldric: 'El rey Aldric gobierna Brumaria desde el castillo de Valcorona.',
  bertran: 'El capitán Bertrán manda la guardia de Valcorona.',
  gorm: 'Gorm vende armas en Valcorona.',
  ilsa: 'Ilsa vende armaduras y escudos en Valcorona.',
  ulric: 'Maese Ulric vende pociones, varitas y báculos en Valcorona.',
  rosa: 'Rosa lleva El Jabalí Dorado, la taberna de Valcorona.',
  selene: 'La maestra Selene enseña hechizos en el gremio de Valcorona.',
  tobias: 'Tobías es el cochero de Valcorona. Lleva viajeros a otros pueblos.',
  guardia: 'Los guardias de Valcorona vigilan las calles.',
  durgin: 'Durgin es el mejor herrero de Hondaforja, o eso dice él.',
  bruna: 'Bruna abastece a los mineros de Hondaforja.',
  hilda: 'Hilda atiende la capilla de Hondaforja y cura a los heridos.',
  thrain: 'Thrain guarda la entrada a las minas de Hondaforja.',
  korr: 'Korr lleva pasajeros montaña abajo desde Hondaforja.',
  agata: 'Ágata es la bruja de Juncal. Prepara pociones.',
  nilo: 'Nilo pesca en los canales de Juncal.',
  yara: 'Yara es la curandera de Juncal.',
  ciro: 'Ciro es el escribano de Juncal. Vende casas.',
  mosca: 'Mosca lleva su barca por el pantano de Juncal.',
};

/** Palabras con las que se puede referir a alguien (además de su nombre). */
export const ROLE_WORDS: Record<string, string[]> = {
  herrero: ['brann', 'durgin'], herrera: ['brann', 'durgin'],
  tabernero: ['brom', 'rosa'], tabernera: ['rosa', 'brom'], taberna: ['brom', 'rosa'], pub: ['brom', 'rosa'], bar: ['brom', 'rosa'],
  sacerdotisa: ['hermana_lia', 'elena', 'hilda', 'yara'], sacerdote: ['hermana_lia', 'elena', 'hilda', 'yara'], curandera: ['yara', 'hermana_lia', 'hilda'], sanadora: ['hilda', 'hermana_lia', 'yara'],
  alcalde: ['teodoro'], rey: ['rey_aldric'], oraculo: ['oraculo'], bardo: ['lirio'], tejedora: ['lena'],
  capitan: ['capitan_rurik', 'bertran'], guardia: ['guardia_albor', 'guardia'], guardias: ['guardia_albor', 'guardia'],
  tienda: ['mirta', 'bruna', 'nilo'], tendera: ['mirta'], mercader: ['mirta', 'bruna', 'nilo'],
  armero: ['gorm', 'brann'], armera: ['ilsa'], mago: ['ulric', 'selene'], maestra: ['selene'], bruja: ['agata'],
  cochero: ['tobias', 'korr'], carro: ['tobias', 'korr'], barquera: ['mosca'], pescador: ['nilo'],
  notario: ['teodoro', 'ciro'], escribano: ['ciro', 'teodoro'], casas: ['teodoro', 'ciro'],
};

export const RUMORS: string[] = [
  'Dicen que en los Ductos vive una rata tan grande como un cerdo, y que lleva una corona robada.',
  'He oído que en la Mina Abandonada, al sur de Albor, aún queda mineral... y arañas del tamaño de un perro.',
  'Los mercaderes cuentan que hay bandidos acampados al sureste de Valcorona.',
  'Por las noches salen ruidos de la cripta de Valcorona. Nadie quiere bajar.',
  'Los enanos de Hondaforja juran que algo enorme respira bajo sus minas.',
  'Dicen que la bruja de Juncal paga bien por ojos de sapo. ¡Puaj!',
  'Un viajero contó que en el Bosque Umbrío los trasgos tienen una madriguera bajo tierra.',
  'Si te quedas sin comida, no recuperarás fuerzas. Lleva siempre algo en la mochila.',
  'El Oráculo dice que al nivel 6 cualquiera puede elegir su camino.',
  'Quien tiene casa propia guarda sus cosas en el baúl, y las encuentra en cualquiera de sus casas.',
];

export const JOKES: string[] = [
  '¿Sabes por qué el esqueleto no fue a la fiesta? Porque no tenía cuerpo para ello.',
  '¿Qué le dice un trasgo a otro? Nada, los trasgos no saben hablar... y aun así no se callan.',
  'Mi abuelo luchó contra un dragón. Bueno, contra una lagartija muy decidida.',
  '¿Cuál es el colmo de un herrero? Tener un hijo que sea un hierro... digo, un yerro.',
  'Un enano entra en una taberna. Nadie lo ve, porque la barra es muy alta.',
  'Las ratas de los Ductos y yo tenemos algo en común: las dos odiamos madrugar.',
];

/** Respuestas a "¿cómo estás?", según la hora y un poco al azar. */
export const MOOD: string[] = [
  'Bien, gracias. No me puedo quejar... bueno, sí puedo, pero no lo haré.',
  'Tirando. Con tanto monstruo suelto, cualquier día tranquilo es un buen día.',
  'Muy bien. ¿Y tú, aventurero?',
  'Cansado, pero contento. El trabajo no se hace solo.',
  'Mejor ahora que alguien viene a charlar.',
];

export const THANKS: string[] = ['De nada.', '¡No hay de qué!', 'Para eso estamos.', 'Un placer.'];

export const INSULT_WORDS = ['idiota', 'tonto', 'tonta', 'estupido', 'estupida', 'feo', 'fea', 'imbecil', 'inutil', 'payaso'];
export const INSULT_REPLIES: string[] = [
  '¡Oye! Esa lengua, que aquí somos gente decente.',
  'Qué maleducado. Vuelve cuando aprendas modales.',
  'Si tienes ganas de pelea, los Ductos están llenos de ratas.',
];

export const UNKNOWN: string[] = [
  'Hmm, de eso no sé nada. Pregúntame por mi {trabajo}, por {rumores}, o dónde está alguien.',
  'No te sigo. Puedes preguntarme por mi {trabajo}, por {rumores} o pedirme un {chiste}.',
  '¿Cómo dices? Si buscas a alguien, pregúntame «¿dónde está...?».',
];
