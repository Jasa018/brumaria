// Charla cotidiana: responde a saludos, "¿cómo estás?", "¿dónde está...?", "¿quién es...?",
// "¿dónde compro...?", la hora, el tiempo, rumores y chistes. Sin DOM, como el resto de game/.
import { ITEMS } from '../data/items';
import { NPCS } from '../data/npcs';
import { QUESTS } from '../data/quests';
import { ABOUT, INSULT_REPLIES, INSULT_WORDS, JOKES, MOOD, ROLE_WORDS, RUMORS, THANKS } from '../data/smalltalk';
import { TOWNS, isUnderground } from '../data/world';
import { cheb, type Game } from './game';
import type { Creature } from './types';
import type { Pos } from './world';

const pick = <T>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const tokens = (t: string) => t.split(' ');
const hasAny = (t: string, words: string[]) => {
  const tk = tokens(t);
  return words.some((w) => (w.includes(' ') ? t.includes(w) : tk.includes(w)));
};

const STOP = new Set(['el', 'la', 'los', 'las', 'de', 'del', 'maese', 'hermana', 'capitan', 'anciano', 'maestra', 'rey', 'escribano', 'guardia', 'porton', 'tabernero', 'herrero', 'bardo', 'tejedora', 'bruja', 'pescador', 'curandera', 'sanadora', 'cochero', 'carretero', 'barquera', 'armero', 'armera', 'guardian', 'mina', 'oraculo']);

/** Frases que indican una pregunta que la charla sabe contestar (tienen prioridad sobre las palabras clave). */
export function isSmallTalkQuestion(t: string): boolean {
  return /\b(donde|quien es|quien vende|como llego|como voy|conoces a|sabes algo de|que hora|que tiempo|como estas|que tal|como te va)\b/.test(t);
}

const DIRS8 = ['este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste', 'norte', 'noreste'];
function direction(dx: number, dy: number): string {
  const a = Math.atan2(dy, dx);
  const i = Math.round(a / (Math.PI / 4));
  return DIRS8[(i + 8) % 8];
}

interface Place {
  label: string;
  pos: Pos;
  npc?: string;
  indoors?: boolean;
}

/** Entradas de superficie de cada cueva (por su nombre). */
function caveEntrance(game: Game, name: string): Pos | null {
  for (const [k, dst] of game.map.links) {
    const src = game.map.unkey(k);
    if (src.z === 0 && dst.z === 1 && game.map.areaName(dst.x, dst.y, dst.z) === name) return src;
  }
  return null;
}

const PLACE_WORDS: [string[], string][] = [
  [['ductos', 'rejilla', 'alcantarilla', 'alcantarillas', 'cloacas'], 'Los Ductos'],
  [['cueva de las ratas'], 'Cueva de las Ratas'],
  [['mina abandonada', 'mina vieja'], 'Mina Abandonada'],
  [['cripta'], 'Cripta de Valcorona'],
  [['catacumbas'], 'Catacumbas Profundas'],
  [['madriguera'], 'Madriguera Trasga'],
  [['trolls', 'cueva de los trolls'], 'Cueva de los Trolls'],
  [['minas', 'minas de hondaforja'], 'Minas de Hondaforja'],
  [['fauces'], 'Fauces de Ceniza'],
  [['gruta'], 'Gruta Inundada'],
];

/** Busca a quién o qué se refiere el jugador, prefiriendo lo que esté en el pueblo del NPC. */
function findPlace(game: Game, npc: Creature, t: string): Place | null {
  const map = game.map;
  const myTown = npc.npc!.town;
  const tk = tokens(t);
  const npcPlace = (id: string): Place | null => {
    const p = map.npcs.find((n) => n.npc === id);
    return p ? { label: NPCS[id].name, pos: p, npc: id, indoors: map.hasRoof(p.x, p.y) } : null;
  };
  // 1. Por nombre propio
  for (const def of Object.values(NPCS)) {
    const words = norm(def.name).split(/\s+/).filter((w) => w.length >= 3 && !STOP.has(w));
    if (words.some((w) => tk.includes(w))) {
      const p = npcPlace(def.id);
      if (p) return p;
    }
  }
  // 2. Lugares
  for (const [words, name] of PLACE_WORDS) {
    if (!hasAny(t, words)) continue;
    const town = name === 'Los Ductos' ? 'albor' : name === 'Cripta de Valcorona' ? 'valcorona' : name === 'Minas de Hondaforja' ? 'hondaforja' : null;
    const pos = town ? map.caveEntrances[town] : caveEntrance(game, name);
    if (pos) return { label: name, pos };
    if (name === 'Catacumbas Profundas') return { label: 'la cripta de Valcorona (las catacumbas están debajo)', pos: map.caveEntrances['valcorona'] };
    if (name === 'Fauces de Ceniza') return { label: 'las minas de Hondaforja (las Fauces están más abajo)', pos: map.caveEntrances['hondaforja'] };
  }
  if (hasAny(t, ['templo', 'iglesia', 'capilla'])) {
    const town = map.temples[myTown] ? myTown : 'valcorona';
    return { label: `el templo de ${TOWNS.find((tw) => tw.id === town)!.name}`, pos: map.temples[town], indoors: true };
  }
  if (hasAny(t, ['porton', 'salida', 'puerta de la ciudad']) && myTown === 'albor') {
    for (let y = 0; y < map.H; y++) for (let x = 0; x < map.W; x++) if (map.o(x, y, 0) === 42) return { label: 'el portón de Albor', pos: { x, y, z: 0 } };
  }
  // 3. Pueblos
  for (const tw of TOWNS) {
    if (tk.includes(norm(tw.name).split(' ').pop()!)) {
      const r = map.towns.find((x) => x.id === tw.id)!;
      return { label: tw.name, pos: { x: r.x + (r.w >> 1), y: r.y + (r.h >> 1), z: 0 } };
    }
  }
  // 4. Oficios ("el herrero", "la taberna"...): primero el del mismo pueblo
  for (const [word, ids] of Object.entries(ROLE_WORDS)) {
    if (!tk.includes(word)) continue;
    const sorted = [...ids].sort((a, b) => Number(NPCS[b]?.town === myTown) - Number(NPCS[a]?.town === myTown));
    for (const id of sorted) {
      const p = NPCS[id] && npcPlace(id);
      if (p) return p;
    }
  }
  return null;
}

function directions(game: Game, npc: Creature, place: Place): string {
  if (place.npc === npc.npc!.id) return '¡Soy yo! Me tienes delante.';
  const d = cheb(npc, place.pos);
  const where = direction(place.pos.x - npc.x, place.pos.y - npc.y);
  const inside = place.indoors && place.npc ? ' Lo encontrarás dentro de su casa o su tienda.' : '';
  const town = game.map.townAt(place.pos.x, place.pos.y, 0);
  const myTown = game.map.townAt(npc.homeX ?? npc.x, npc.homeY ?? npc.y, 0);
  if (d <= 3) return `${cap(place.label)} está aquí mismo, a tu lado.${inside}`;
  if (town && myTown && town.id === myTown.id) return `${cap(place.label)} está aquí en ${town.name}, hacia el ${where}, a unos ${d} pasos.${inside}`;
  const leagues = d > 60 ? ' Es un buen trecho: lleva comida.' : '';
  return `${cap(place.label)} queda hacia el ${where} de aquí, a unos ${d} pasos${town ? `, en ${town.name}` : ''}.${inside}${leagues}`;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Busca un objeto mencionado y quién lo vende. */
function whoSells(t: string, npc: Creature, game: Game): string | null {
  let best: { id: string; len: number } | null = null;
  for (const it of Object.values(ITEMS)) {
    const names = [norm(it.name)];
    const last = norm(it.name).split(' ')[0];
    if (last.length >= 4) names.push(last);
    for (const n of names) if (t.includes(n) && (!best || n.length > best.len)) best = { id: it.id, len: n.length };
  }
  if (!best) return null;
  const it = ITEMS[best.id];
  const sellers = Object.values(NPCS).filter((n) => n.shop?.sells?.some(([id]) => id === best!.id));
  if (!sellers.length) return `${cap(it.name)}... eso no lo vende nadie que yo sepa. Habrá que encontrarlo por ahí.`;
  const myTown = npc.npc!.town;
  sellers.sort((a, b) => Number(b.town === myTown) - Number(a.town === myTown));
  const s = sellers[0];
  const price = s.shop!.sells!.find(([id]) => id === best!.id)![1];
  if (s.id === npc.npc!.id) return `¡Yo vendo ${it.name}! ${price} de oro. Di {comerciar}.`;
  const town = TOWNS.find((tw) => tw.id === s.town)!.name;
  const more = sellers.length > 1 ? ` También lo vende ${sellers[1].name}.` : '';
  void game;
  return `${cap(it.name)} lo vende ${s.name}, en ${town}, por ${price} de oro.${more}`;
}

function hint(game: Game): string {
  const p = game.player;
  if (p.quests['ductos']?.state !== 'done') return 'Si quieres salir de Albor, habla con el capitán Rurik, en el cuartel junto al portón. Te mandará a los Ductos.';
  if (p.voc === 'aprendiz' && p.level >= 6) return 'Ya tienes nivel para elegir vocación. Ve a ver al Oráculo, en el templo de Albor.';
  if (p.voc === 'aprendiz') return 'Sigue entrenando. Al nivel 6 el Oráculo te dejará elegir vocación.';
  const next = QUESTS.find((q) => !p.quests[q.id] && (!q.requires || p.quests[q.requires]?.state === 'done') && (!q.minLevel || p.level >= q.minLevel));
  if (next) {
    const g = NPCS[next.giver];
    return `Quizá ${g.name} tenga trabajo para ti, en ${TOWNS.find((t) => t.id === g.town)!.name}.`;
  }
  return 'Ya has hecho más que nadie en Brumaria. Descansa un poco, te lo has ganado.';
}

/** Respuesta a una frase cotidiana, o null si no sabe qué contestar. */
export function smallTalk(game: Game, npc: Creature, t: string): string | null {
  const def = npc.npc!;
  const p = game.player;
  const town = TOWNS.find((tw) => tw.id === def.town)!.name;

  if (hasAny(t, INSULT_WORDS)) return pick(INSULT_REPLIES);
  if (hasAny(t, ['gracias', 'muchas gracias', 'te lo agradezco'])) return pick(THANKS);
  if (hasAny(t, ['como estas', 'que tal', 'como te va', 'como andas', 'como va todo', 'como va'])) return pick(MOOD);
  if (hasAny(t, ['que hora', 'hora es'])) {
    if (isUnderground(p.z)) return 'Aquí abajo no hay manera de saberlo.';
    const h = Math.floor(game.hour());
    const part = h < 6 ? 'de madrugada' : h < 12 ? 'de la mañana' : h < 20 ? 'de la tarde' : 'de la noche';
    return `Deben de ser más o menos las ${h % 12 || 12} ${part}.`;
  }
  if (hasAny(t, ['que tiempo', 'tiempo hace', 'clima', 'llueve', 'hace frio', 'hace calor'])) {
    if (game.darkness() > 0.3) return 'Ya es de noche. Mejor no alejarse de las murallas sin una antorcha.';
    if (def.town === 'juncal') return 'Niebla, como siempre. En Juncal el sol es un rumor.';
    if (def.town === 'hondaforja') return 'Frío. En la montaña siempre hace frío, pero en la forja se está de maravilla.';
    return 'Hace un buen día. Ideal para salir de caza... o para quedarse a la sombra.';
  }
  if (hasAny(t, ['de donde eres', 'donde vives', 'eres de aqui'])) return `Soy de ${town}, de toda la vida.`;
  if (/\b(quien es|conoces a|sabes algo de|que sabes de|quien era)\b/.test(t)) {
    const place = findPlace(game, npc, t);
    if (place?.npc) return place.npc === def.id ? `Soy yo, ${def.name}. ${def.job.replace(/[{}]/g, '')}` : ABOUT[place.npc] ?? `${place.label} vive en ${town}.`;
    if (place) return directions(game, npc, place);
  }
  if (/\b(donde compro|donde venden|donde vende|quien vende|donde consigo|donde puedo comprar|quiero comprar|necesito)\b/.test(t)) {
    const r = whoSells(t, npc, game);
    if (r) return r;
  }
  if (/\b(donde|como llego|como voy|por donde|hacia donde)\b/.test(t)) {
    const place = findPlace(game, npc, t);
    if (place) return directions(game, npc, place);
    const r = whoSells(t, npc, game);
    if (r) return r;
    return '¿Dónde está qué? Dime un nombre, un lugar o un pueblo.';
  }
  if (hasAny(t, ['rumor', 'rumores', 'noticias', 'que se cuenta', 'cotilleo', 'novedades', 'chismes'])) return pick(RUMORS);
  if (hasAny(t, ['chiste', 'broma', 'hazme reir', 'algo gracioso'])) return pick(JOKES);
  if (hasAny(t, ['ayuda', 'que hago', 'consejo', 'pista', 'estoy perdido', 'no se que hacer'])) return hint(game);
  if (hasAny(t, ['comida', 'hambre', 'comer'])) {
    const r = whoSells('pan', npc, game);
    return `Si tienes hambre, come algo pronto. ${r ?? ''}`.trim();
  }
  if (hasAny(t, ['cuantos anos', 'edad', 'eres viejo'])) return 'Más de los que aparento y menos de los que siento.';
  if (hasAny(t, ['familia', 'hijos', 'esposa', 'marido'])) return 'Mi familia es este pueblo. Y eso ya da bastante trabajo.';
  if (hasAny(t, ['te gusta', 'que te gusta', 'favorito'])) return 'Me gustan los días tranquilos y la buena comida. ¿A quién no?';
  if (hasAny(t, ['nivel', 'soy fuerte', 'que tal lucho'])) return p.level < 5 ? 'Aún estás verde, sin ofender. Empieza por las ratas.' : p.level < 20 ? 'Ya se nota que has visto mundo.' : 'Se nota que eres de los buenos. Pocos llegan tan lejos.';
  if (hasAny(t, ['bien', 'genial', 'muy bien', 'estupendo'])) return '¡Me alegro!';
  if (hasAny(t, ['mal', 'fatal', 'cansado', 'triste'])) return 'Vaya. Descansa un poco y come algo, que todo se ve mejor con el estómago lleno.';
  if (t === 'si' || t === 'no' || t === 'vale') return '¿Hmm? No te había preguntado nada.';
  return null;
}
