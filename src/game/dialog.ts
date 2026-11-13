// Conversaciones con NPC por palabras clave: "hola", "comerciar", "misión", "viajar"...
import { item } from '../data/items';
import { QUESTS, QUEST_BY_ID, type QuestDef } from '../data/quests';
import { SPELLS } from '../data/spells';
import { TOWNS } from '../data/world';
import { PLAYABLE_VOCS, VOCATIONS, type VocId } from '../data/vocations';
import type { Game } from './game';
import { isSmallTalkQuestion, smallTalk } from './smalltalk';
import { UNKNOWN } from '../data/smalltalk';
import type { Creature } from './types';

const GREET = ['hola', 'hi', 'hello', 'buenas', 'saludos', 'buenos dias', 'buenas tardes', 'buenas noches'];
const BYE = ['adios', 'chao', 'bye', 'hasta luego', 'nos vemos'];
const YES = ['si', 'yes', 'claro', 'vale', 'acepto', 'de acuerdo', 'ok'];
const NO = ['no', 'nop', 'nunca'];

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function has(text: string, words: string[]): boolean {
  const tokens = text.split(' ');
  return words.some((w) => (w.includes(' ') ? text.includes(w) : tokens.includes(w)));
}

export function hear(game: Game, npc: Creature, text: string) {
  const p = game.player;
  const def = npc.npc!;
  const say = (s: string) => game.npcSay(npc, s);

  if (p.talkingTo !== npc.id) {
    if (!has(text, GREET)) return;
    p.talkingTo = npc.id;
    npc.pending = undefined;
    say(def.greet);
    return;
  }
  if (has(text, BYE)) {
    say(def.bye);
    p.talkingTo = null;
    npc.pending = undefined;
    return;
  }

  // Respuesta a una pregunta pendiente
  const pending = npc.pending;
  if (pending) {
    npc.pending = undefined;
    if (has(text, YES)) return resolve(game, npc, pending);
    if (has(text, NO)) return say('Como quieras.');
  }

  if (has(text, GREET) && !isSmallTalkQuestion(text)) return say(def.greet);
  if (has(text, ['nombre', 'quien eres', 'como te llamas'])) return say(`Me llamo ${def.name}.`);
  if (has(text, ['trabajo', 'oficio', 'que haces', 'a que te dedicas'])) return say(def.job);
  // Preguntas cotidianas ("¿dónde está...?", "¿quién es...?", "¿qué hora es?"): antes que las palabras clave
  if (isSmallTalkQuestion(text)) {
    const r = smallTalk(game, npc, text);
    if (r) return say(r);
  }

  if (def.shop && has(text, ['comerciar', 'tienda', 'comprar', 'vender', 'ofertas', 'trade', 'mercancia'])) {
    say('Echa un vistazo a mi mercancía.');
    game.emit({ t: 'shop', npc: def.id });
    return;
  }

  const roles = def.roles ?? [];
  if (roles.includes('houses') && has(text, ['casa', 'casas', 'propiedad', 'vivienda', 'mis casas', 'comprar casa'])) return housesTalk(game, npc, text);
  if (roles.includes('heal') && has(text, ['curar', 'curame', 'cura', 'sanar', 'curacion', 'heal'])) {
    if (p.hp >= p.maxHp) return say('No veo heridas en ti. Vuelve si las tienes.');
    p.hp = p.maxHp;
    game.fx(p.x, p.y, p.z, 'heal');
    game.sound('heal');
    return say('¡Que la luz cierre tus heridas!');
  }
  if (roles.includes('home') && has(text, ['hogar', 'casa', 'templo'])) {
    p.home = def.town;
    const town = TOWNS.find((t) => t.id === def.town)!;
    game.msg(`Tu hogar ahora es ${town.name}. Si caes, despertarás aquí.`, 'yellow');
    return say(`Que así sea. Desde hoy, ${town.name} es tu hogar.`);
  }

  if (roles.includes('oracle')) {
    const v = PLAYABLE_VOCS.find((id) => text.includes(norm(VOCATIONS[id].name)));
    if (v || has(text, ['vocacion', 'camino', 'clase'])) {
      if (p.voc !== 'aprendiz') return say(`Ya eres ${VOCATIONS[p.voc].name.toLowerCase()}. Tu camino está trazado.`);
      if (p.level < 6) return say('Aún eres demasiado joven. Vuelve cuando hayas alcanzado el {nivel 6}.');
      if (!v) return say('Hay cuatro caminos: {guerrero}, {arquero}, {brujo} y {chamán}. ¿Cuál eliges?');
      npc.pending = { kind: 'vocation', voc: v };
      return say(`${VOCATIONS[v].name}: ${VOCATIONS[v].desc} ¿Es esta tu decisión definitiva? {Sí} o {no}.`);
    }
  }

  if (roles.includes('spells')) {
    const learnable = SPELLS.filter((s) => s.price > 0 && s.voc.includes(p.voc) && !p.spells.includes(s.id));
    const chosen = learnable.find((s) => text.includes(norm(s.name)));
    if (chosen) {
      if (p.level < chosen.level) return say(`Necesitas el nivel ${chosen.level} para aprender ${chosen.name}.`);
      npc.pending = { kind: 'learn', spell: chosen.id, price: chosen.price };
      return say(`${chosen.name} (palabras: "${chosen.words}"). ${chosen.desc} ¿Quieres aprenderlo por ${chosen.price} de oro?`);
    }
    if (has(text, ['hechizos', 'hechizo', 'aprender', 'magia', 'conjuros'])) {
      if (p.voc === 'aprendiz') return say('Primero debes elegir una vocación con el Oráculo de Albor.');
      if (!learnable.length) return say('Ya conoces todos los hechizos que puedo enseñarte.');
      const list = learnable.sort((a, b) => a.level - b.level).map((s) => `{${s.name}} (nv ${s.level}, ${s.price} oro)`).join(', ');
      return say(`Puedo enseñarte: ${list}.`);
    }
  }

  if (roles.includes('travel') && def.travel) {
    const dest = def.travel.find((d) => {
      const t = TOWNS.find((tw) => tw.id === d.town)!;
      return text.includes(norm(t.name)) || text.includes(norm(t.name.split(' ').pop()!));
    });
    if (dest) {
      const t = TOWNS.find((tw) => tw.id === dest.town)!;
      npc.pending = { kind: 'travel', town: dest.town, price: dest.price };
      return say(dest.price ? `¿Quieres viajar a ${t.name} por ${dest.price} de oro?` : `¿Quieres viajar a ${t.name}?`);
    }
    if (has(text, ['viajar', 'viaje', 'barco', 'carro', 'destinos', 'llevame', 'pasaje'])) {
      const list = def.travel.map((d) => `{${TOWNS.find((t) => t.id === d.town)!.name}} (${d.price ? d.price + ' oro' : 'gratis'})`).join(', ');
      return say(`Puedo llevarte a: ${list}. ¿A dónde?`);
    }
  }

  if (has(text, ['mision', 'misiones', 'tarea', 'quest', 'encargo', 'trabajo para mi', 'entregar', 'carta'])) return questTalk(game, npc);

  if (def.keywords) {
    for (const [k, v] of Object.entries(def.keywords)) if (has(text, [norm(k)])) return say(v);
  }
  if (roles.includes('guard') && has(text, ['salir', 'pasar', 'abrir', 'abre', 'porton'])) return say(def.greet);
  say(smallTalk(game, npc, text) ?? UNKNOWN[Math.floor(Math.random() * UNKNOWN.length)]);
}

function housesTalk(game: Game, npc: Creature, text: string) {
  const p = game.player;
  const def = npc.npc!;
  const say = (s: string) => game.npcSay(npc, s);
  const houses = game.map.houses;
  if (has(text, ['mis casas'])) {
    const mine = houses.filter((h) => game.ownsHouse(h.id));
    return say(mine.length ? `Tienes a tu nombre: ${mine.map((h) => h.name).join(', ')}.` : 'Aún no tienes ninguna casa a tu nombre.');
  }
  // ¿Ha dicho una casa concreta? ("casa 3 de albor", o "casa 3" en el pueblo de este NPC)
  const num = /casa (\d+)/.exec(text)?.[1];
  if (num) {
    const townId = TOWNS.find((t) => text.includes(norm(t.name).split(' ').pop()!))?.id ?? def.town;
    const h = houses.find((hh) => hh.town === townId && hh.id === `${townId}-${num}`);
    if (!h) return say('No tengo registrada esa casa.');
    if (game.ownsHouse(h.id)) return say(`La ${h.name} ya es tuya.`);
    npc.pending = { kind: 'house', house: h.id, price: h.price };
    const floors = h.size > 40 ? 'de dos plantas' : 'de una planta';
    return say(`La ${h.name} es ${floors}, con baúl propio para guardar tus cosas. Cuesta ${h.price} de oro. ¿La compras?`);
  }
  const free = houses.filter((h) => !game.ownsHouse(h.id));
  if (!free.length) return say('Ya no me quedan casas en venta.');
  const list = free.map((h) => `{${h.name}} (${h.price} oro)`).join(', ');
  return say(`Tengo en venta: ${list}. Lo que guardes en el baúl de una casa lo tendrás en todas las tuyas. Tienes ${p.gold} de oro.`);
}

function questTalk(game: Game, npc: Creature) {
  const p = game.player;
  const def = npc.npc!;
  const say = (s: string) => game.npcSay(npc, s);

  // Entregas para este NPC
  for (const q of QUESTS) {
    const st = p.quests[q.id];
    if (q.objective.type !== 'deliver' || q.objective.to !== def.id || st?.state !== 'active') continue;
    if (!game.removeItem(q.objective.item, 1)) return say(`Dicen que traes algo para mí, pero no veo ninguna ${item(q.objective.item).name}.`);
    say(`¿Una carta de Teodoro? Veamos... Malas noticias de los caminos. Gracias por traerla. Toma tu recompensa, y si buscas más trabajo, pídeme otra {misión}.`);
    game.completeQuest(q.id);
    return;
  }

  const mine = QUESTS.filter((q) => q.giver === def.id);
  if (!mine.length) return say('No tengo ninguna tarea para ti.');

  const active = mine.find((q) => p.quests[q.id]?.state === 'active');
  if (active) {
    if (isComplete(game, active)) {
      if (active.objective.type === 'bring') game.removeItem(active.objective.item, active.objective.count);
      say(active.done);
      game.completeQuest(active.id);
      return;
    }
    return say(active.progress);
  }
  const next = mine.find((q) => !p.quests[q.id] && (!q.requires || p.quests[q.requires]?.state === 'done'));
  if (!next) {
    const blocked = mine.find((q) => !p.quests[q.id]);
    if (blocked?.requires) return say(`Antes deberías ocuparte de otros asuntos. Quizá ${QUEST_BY_ID[blocked.requires].giver === def.id ? 'de lo que te pedí' : 'alguien más necesite tu ayuda'}.`);
    return say('Ya has hecho mucho por mí. ¡Gracias!');
  }
  if (next.minLevel && p.level < next.minLevel) return say(`Tengo una tarea, pero es peligrosa. Vuelve cuando seas al menos de nivel ${next.minLevel}.`);
  npc.pending = { kind: 'quest', quest: next.id };
  say(next.offer);
}

export function isComplete(game: Game, q: QuestDef): boolean {
  const st = game.player.quests[q.id];
  if (!st) return false;
  const o = q.objective;
  if (o.type === 'kill') return st.count >= o.count;
  if (o.type === 'bring') return game.count(o.item) >= o.count;
  return false;
}

function resolve(game: Game, npc: Creature, pending: NonNullable<Creature['pending']>) {
  const p = game.player;
  const say = (s: string) => game.npcSay(npc, s);
  switch (pending.kind) {
    case 'quest': {
      const q = QUEST_BY_ID[pending.quest];
      p.quests[q.id] = { state: 'active', count: 0 };
      if (q.give) game.addItem(q.give[0], q.give[1], true);
      say(q.accept);
      game.msg(`Nueva misión: «${q.name}». ${q.journal}`, 'yellow');
      game.sound('quest');
      return;
    }
    case 'vocation': {
      say(`Que así sea. ¡Ve, ${VOCATIONS[pending.voc as VocId].name.toLowerCase()}, y que tus pasos dejen huella en Brumaria!`);
      p.talkingTo = null;
      game.chooseVocation(pending.voc);
      return;
    }
    case 'travel': {
      if (p.gold < pending.price) return say('No tienes suficiente oro.');
      p.gold -= pending.price;
      say('¡Allá vamos!');
      game.travelTo(pending.town);
      return;
    }
    case 'learn': {
      const s = SPELLS.find((sp) => sp.id === pending.spell)!;
      if (p.gold < pending.price) return say('No tienes suficiente oro.');
      p.gold -= pending.price;
      p.spells.push(s.id);
      const free = p.hotbar.indexOf(null);
      if (free >= 0) p.hotbar[free] = `spell:${s.id}`;
      game.msg(`Has aprendido ${s.name}. Palabras: "${s.words}".${free >= 0 ? ` Está en el atajo ${free + 1}.` : ''}`, 'blue');
      game.sound('quest');
      game.emit({ t: 'inv' });
      return say(`Ya conoces ${s.name}. Úsalo con sabiduría.`);
    }
    case 'house': {
      if (p.gold < pending.price) return say(`No tienes suficiente oro. La casa cuesta ${pending.price} y llevas ${p.gold}.`);
      if (!game.buyHouse(pending.house)) return say('Algo no cuadra con los papeles. Prueba otra vez.');
      game.emit({ t: 'inv' });
      return say('¡Trato hecho! Aquí tienes la llave. Que la disfrutes.');
    }
  }
}
