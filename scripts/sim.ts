// Simulación sin interfaz: comprueba el mundo, los diálogos, las misiones y el balance del combate.
// Uso: npm run sim
import { CAVES, TOWNS } from '../src/data/world';
import { NPCS } from '../src/data/npcs';
import { MONSTERS } from '../src/data/monsters';
import { QUESTS } from '../src/data/quests';
import { ITEMS } from '../src/data/items';
import { SPELLS } from '../src/data/spells';
import { Game, cheb, expForLevel, newPlayerData } from '../src/game/game';
import { O } from '../src/data/tiles';
import { UPPER_Z } from '../src/data/world';
import { generateWorld } from '../src/game/world';
import type { Creature } from '../src/game/types';
import type { VocId } from '../src/data/vocations';

let errors = 0;
const fail = (m: string) => {
  errors++;
  console.log('  ✗ ' + m);
};
const ok = (m: string) => console.log('  ✓ ' + m);

// ---------------------------------------------------------------- Mundo
console.log('Mundo');
const t0 = Date.now();
const map = generateWorld();
ok(`generado en ${Date.now() - t0} ms: ${map.spawns.length} criaturas, ${map.npcs.length} NPC, ${map.links.size / 2} escaleras`);
for (const w of map.warnings) fail(w);
for (const t of TOWNS) {
  if (!map.temples[t.id]) fail(`${t.name} no tiene templo (@)`);
  const widths = new Set(t.map.map((r) => r.length));
  if (widths.size > 1) fail(`${t.name}: filas de distinto ancho ${[...widths]}`);
}

// Conectividad: desde el templo de cada masa de tierra
const reach = (from: { x: number; y: number; z: number }) => map.bfs(from.x, from.y, from.z);
const valco = reach(map.temples['valcorona']);
const reachable = (x: number, y: number, z: number) => {
  if (z !== 0) return true;
  const i = y * map.W + x;
  if (valco[i] >= 0) return true;
  // Un NPC se considera alcanzable si se puede llegar a una casilla vecina
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const j = (y + dy) * map.W + x + dx;
    if (valco[j] >= 0) return true;
  }
  return false;
};
for (const t of TOWNS) if (map.temples[t.id] && !reachable(map.temples[t.id].x, map.temples[t.id].y, 0)) fail(`Templo de ${t.name} inalcanzable a pie (solo por viaje)`);
let npcBad = 0;
for (const n of map.npcs) {
  // Alcanzable desde el templo de su pueblo
  const temple = map.temples[NPCS[n.npc].town] ?? map.temples['valcorona'];
  const d = map.bfs(temple.x, temple.y, 0);
  let okN = false;
  for (let dy = -3; dy <= 3 && !okN; dy++) for (let dx = -3; dx <= 3; dx++) if (d[(n.y + dy) * map.W + n.x + dx] >= 0) okN = true;
  if (!okN) {
    npcBad++;
    fail(`NPC ${n.npc} inalcanzable desde su templo`);
  }
}
if (!npcBad) ok(`los ${map.npcs.length} NPC son alcanzables desde su templo`);
let stairsBad = 0;
for (const [k, dst] of map.links) {
  const src = map.unkey(k);
  if (!map.walkable(dst.x, dst.y, dst.z)) {
    stairsBad++;
    fail(`Escalera ${src.x},${src.y},${src.z} lleva a casilla bloqueada`);
  }
  if ((src.z === 0 || src.z === UPPER_Z) && !reachable(src.x, src.y, 0)) {
    stairsBad++;
    fail(`Entrada de cueva en ${src.x},${src.y} inalcanzable`);
  }
}
if (!stairsBad) ok('todas las escaleras llevan a casillas libres y las entradas son alcanzables');
// Cada cueva: desde su entrada se llega a todas sus criaturas
for (const cave of CAVES) {
  const entry = [...map.links.entries()].find(([k]) => {
    const p = map.unkey(k);
    return p.z === cave.z && map.areaName(p.x, p.y, p.z) === cave.name;
  });
  if (!entry) {
    fail(`Cueva ${cave.name} sin escalera de subida`);
    continue;
  }
  const e = map.unkey(entry[0]);
  const d = map.bfs(e.x, e.y, e.z);
  const spawns = map.spawns.filter((s) => s.z === cave.z && map.areaName(s.x, s.y, s.z) === cave.name);
  const bad = spawns.filter((s) => !s.tiles.some((t) => d[t] >= 0));
  if (bad.length) fail(`${cave.name}: ${bad.length} zonas de criaturas inalcanzables`);
  let size = 0;
  for (let i = 0; i < d.length; i++) if (d[i] >= 0) size++;
  ok(`${cave.name}: ${size} casillas, ${spawns.length} criaturas${cave.boss ? ', jefe incluido' : ''}`);
}
let surfaceBad = 0;
for (const s of map.spawns.filter((sp) => sp.z === 0)) {
  if (!s.tiles.some((t) => valco[t] >= 0)) surfaceBad++;
}
if (surfaceBad) fail(`${surfaceBad} criaturas de superficie en zonas inalcanzables`);
else ok('todas las zonas de superficie son alcanzables');

// ---------------------------------------------------------------- Datos
console.log('Datos');
for (const n of Object.values(NPCS)) {
  for (const [id] of n.shop?.sells ?? []) if (!ITEMS[id]) fail(`${n.id} vende ${id}, que no existe`);
  for (const id of n.shop?.buys ?? []) if (!ITEMS[id]) fail(`${n.id} compra ${id}, que no existe`);
  // Ningún objeto se puede comprar más barato de lo que se vende (dinero infinito)
  for (const [id, price] of n.shop?.sells ?? []) {
    for (const other of Object.values(NPCS)) if (other.shop?.buys?.includes(id) && ITEMS[id].value > price) fail(`${id}: ${n.id} lo vende a ${price} y ${other.id} lo compra a ${ITEMS[id].value}`);
  }
  if (!map.npcs.some((p) => p.npc === n.id)) fail(`NPC ${n.id} no está colocado en ningún pueblo`);
}
for (const m of Object.values(MONSTERS)) for (const [id] of m.loot) if (!ITEMS[id]) fail(`${m.id} suelta ${id}, que no existe`);
for (const q of QUESTS) {
  if (!NPCS[q.giver]) fail(`Misión ${q.id}: NPC ${q.giver} no existe`);
  if (q.objective.type === 'kill') for (const m of q.objective.monsters) if (!MONSTERS[m]) fail(`Misión ${q.id}: criatura ${m}`);
  if (q.objective.type !== 'kill' && !ITEMS[q.objective.item]) fail(`Misión ${q.id}: objeto ${q.objective.item}`);
}
ok(`${Object.keys(ITEMS).length} objetos, ${Object.keys(MONSTERS).length} criaturas, ${Object.keys(NPCS).length} NPC, ${QUESTS.length} misiones, ${SPELLS.length} hechizos`);

// ---------------------------------------------------------------- Diálogos y misiones
console.log('Diálogos');
const look = { body: 'humanoid' as const, c1: '#3e5fa8', c2: '#5a3a1a', skin: '#e0b089', hair: '#3a2a1a' };
const game = new Game(map, newPlayerData('Prueba', look, map));
const p = game.player;
const npcCreature = (id: string) => [...game.creatures.values()].find((c) => c.npc?.id === id)!;
const goTo = (c: Creature) => {
  const spot = game.findFreeNear(c.x, c.y, c.z, 2)!;
  game.teleport(p, spot.x, spot.y, c.z);
};
const lastNpcLine = () => {
  const l = [...game.events].reverse().find((e) => e.t === 'chat' && e.npc);
  return l && l.t === 'chat' ? l.text : '';
};
const talk = (npc: string, ...lines: string[]) => {
  goTo(npcCreature(npc));
  p.talkingTo = null;
  game.say('hola');
  for (const l of lines) game.say(l);
  return lastNpcLine();
};
talk('teodoro', 'mision', 'si');
if (p.quests['ratas']?.state === 'active') ok('Teodoro da la misión de las ratas');
else fail('No se pudo aceptar la misión de las ratas');
p.quests['ratas'].count = 10;
talk('teodoro', 'mision');
if (p.quests['ratas'].state === 'done' && game.count('escudo_madera') === 1) ok('misión de las ratas completada y recompensa recibida');
else fail('La misión de las ratas no se completa');
let line = talk('oraculo', 'vocacion');
if (!line.includes('nivel 6')) fail('El Oráculo debería pedir nivel 6: ' + line);
p.level = 6;
p.exp = expForLevel(6);
talk('oraculo', 'quiero ser brujo', 'si');
if (p.voc === 'brujo') ok('vocación elegida con el Oráculo');
else fail(`Vocación: ${p.voc}`);
p.gold = 5000;
line = talk('selene', 'hechizos');
if (!line.includes('Dardo de fuego')) fail('Selene no ofrece Dardo de fuego: ' + line);
p.level = 8;
talk('selene', 'dardo de fuego', 'si');
if (p.spells.includes('dardo_fuego')) ok('hechizo aprendido en el gremio');
else fail('No se aprendió el hechizo');
const goldBefore = p.gold;
talk('ulric', 'comerciar');
if (game.buy('ulric', 'pocion_mana', 5) && p.gold === goldBefore - 250) ok('compra en tienda');
else fail('Fallo al comprar');
game.addItem('rubi', 2);
if (game.sell('ulric', 'rubi', 2) && p.gold === goldBefore - 250 + 300) ok('venta en tienda');
else fail('Fallo al vender');
talk('tobias', 'viajar', 'hondaforja', 'si');
if (map.areaName(p.x, p.y, p.z) === 'Hondaforja') ok('viaje en carro a Hondaforja');
else fail('No se llegó a Hondaforja: ' + map.areaName(p.x, p.y, p.z));
// Guardar y cargar
const saved = game.save();
const game2 = new Game(map, JSON.parse(JSON.stringify(saved)));
if (game2.player.level === p.level && game2.player.spells.includes('dardo_fuego') && game2.isExplored(p.x, p.y, p.z)) ok('guardar y cargar conserva el progreso y el mapa explorado');
else fail('Guardar/cargar pierde datos');

// ---------------------------------------------------------------- Albor: portón, puertas y plantas
console.log('Albor');
{
  const g = new Game(map, newPlayerData('Portón', look, map));
  const pl = g.player;
  let gx = -1;
  let gy = -1;
  for (let y = 0; y < map.H && gx < 0; y++) for (let x = 0; x < map.W; x++) if (map.o(x, y, 0) === O.GATE) { gx = x; gy = y; break; }
  if (gx < 0) fail('Albor no tiene portón');
  else {
    g.teleport(pl, gx - 1, gy, 0);
    g.update(1000);
    g.walk(1, 0);
    const blocked = pl.x === gx - 1;
    g.events.length = 0;
    g.update(5000);
    const guardSpoke = [...g.creatures.values()].some((c) => c.npc?.id === 'guardia_albor' && c.speech);
    if (blocked && guardSpoke) ok('el portón no deja salir sin permiso y el guardia lo dice');
    else fail(`portón: bloqueado=${blocked}, guardia habló=${guardSpoke}`);
    pl.quests['ductos'] = { state: 'done', count: 0 };
    g.update(1000);
    g.walk(1, 0);
    if (pl.x === gx) ok('con la misión de los Ductos completada, el portón deja pasar');
    else fail('el portón sigue cerrado tras la misión');
  }
  // Desde el templo se llega a pie hasta fuera (con el portón abierto) y hasta la entrada de los Ductos
  const t = map.temples['albor'];
  const d = map.bfs(t.x, t.y, 0);
  const ductos = map.caveEntrances['albor'];
  if (d[ductos.y * map.W + ductos.x] >= 0) ok('la rejilla de los Ductos es alcanzable desde el templo');
  else fail('la rejilla de los Ductos no es alcanzable');
  // Puertas
  let door: { x: number; y: number } | null = null;
  for (let y = 0; y < map.H && !door; y++) for (let x = 0; x < map.W; x++) if (map.o(x, y, 0) === O.DOOR && map.townAt(x, y, 0)?.id === 'albor' && !map.houseDoors.has(map.key(x, y, 0))) { door = { x, y }; break; }
  if (!door) fail('no hay puertas en Albor');
  else {
    const spot = g.findFreeNear(door.x, door.y, 0, 1)!;
    g.teleport(pl, spot.x, spot.y, 0);
    const opened = g.toggleDoor(door.x, door.y) && map.o(door.x, door.y, 0) === O.DOOR_OPEN;
    const closed = g.toggleDoor(door.x, door.y) && map.o(door.x, door.y, 0) === O.DOOR;
    const monsterBlocked = !g.free(door.x, door.y, 0, 'monster');
    if (opened && closed && monsterBlocked) ok('las puertas se abren y cierran, y cerradas bloquean a las criaturas');
    else fail(`puertas: abrir=${opened} cerrar=${closed} bloquea=${monsterBlocked}`);
  }
  // Casas con planta alta
  let houses = 0;
  for (const [k, dst] of map.links) if (map.unkey(k).z === 0 && dst.z === UPPER_Z) houses++;
  if (houses >= 8) ok(`${houses} casas con segunda planta`);
  else fail(`solo ${houses} casas con segunda planta`);
  let roofs = 0;
  for (let i = 0; i < map.roof.length; i++) roofs += map.roof[i];
  if (roofs > 300) ok(`${roofs} casillas con tejado`);
  else fail(`pocos tejados: ${roofs}`);
}

// ---------------------------------------------------------------- Charla, casas y baúl
console.log('Charla y casas');
{
  const g = new Game(map, newPlayerData('Charla', look, map));
  const pl = g.player;
  const npcOf = (id: string) => [...g.creatures.values()].find((c) => c.npc?.id === id)!;
  const ask = (id: string, ...lines: string[]) => {
    const n = npcOf(id);
    const spot = g.findFreeNear(n.x, n.y, n.z, 2)!;
    g.teleport(pl, spot.x, spot.y, n.z);
    pl.talkingTo = null;
    g.events.length = 0;
    g.say('hola');
    for (const l of lines) g.say(l);
    const said = g.events.filter((e) => e.t === 'chat' && e.npc).map((e) => (e.t === 'chat' ? e.text : ''));
    return said[said.length - 1] ?? '';
  };
  const checks: [string, string[], RegExp][] = [
    ['mirta', ['¿cómo estás?'], /.{10,}/],
    ['mirta', ['¿dónde está el herrero?'], /Brann.*(este|oeste|norte|sur)/],
    ['brann', ['¿quién es Teodoro?'], /alcalde/],
    ['teodoro', ['¿dónde compro pan?'], /Mirta|Brom/],
    ['brom', ['¿qué hora es?'], /las \d+/],
    ['lena', ['cuéntame un chiste'], /.{15,}/],
    ['lirio', ['¿algún rumor?'], /.{15,}/],
    ['mirta', ['¿dónde está Valcorona?'], /Valcorona.*(este|norte)/],
    ['hermana_lia', ['¿dónde están los ductos?'], /Ductos/],
    ['teodoro', ['gracias'], /nada|placer|estamos|qué/i],
    ['brom', ['blablabla xyz'], /trabajo|rumores|dónde/],
  ];
  let bad = 0;
  for (const [id, lines, re] of checks) {
    const r = ask(id, ...lines);
    if (!re.test(r)) {
      bad++;
      fail(`charla con ${id} "${lines.join(' / ')}": ${r}`);
    }
  }
  if (!bad) ok(`${checks.length} preguntas cotidianas respondidas con sentido`);
  // Casas
  const sale = map.houses.filter((h) => h.town === 'albor');
  const juncal = map.houses.filter((h) => h.town === 'juncal');
  if (sale.length >= 7 && juncal.length >= 1 && map.houses.every((h) => h.chest)) ok(`${map.houses.length} casas en venta (${sale.length} en Albor, ${juncal.length} en Juncal), todas con baúl`);
  else fail(`casas: Albor ${sale.length}, Juncal ${juncal.length}, sin baúl: ${map.houses.filter((h) => !h.chest).map((h) => h.id)}`);
  const h = sale[0];
  const spot = g.findFreeNear(h.door.x, h.door.y, 0, 1)!;
  g.teleport(pl, spot.x, spot.y, 0);
  const lockedBefore = !g.toggleDoor(h.door.x, h.door.y);
  pl.gold = 100000;
  const reply = ask('teodoro', 'casas', h.name.toLowerCase(), 'si');
  const owned = g.ownsHouse(h.id);
  g.teleport(pl, spot.x, spot.y, 0);
  const opens = g.toggleDoor(h.door.x, h.door.y);
  if (lockedBefore && owned && opens) ok(`la puerta está cerrada con llave hasta comprar la casa ("${reply}")`);
  else fail(`compra de casa: cerrada=${lockedBefore} comprada=${owned} abre=${opens} (${reply})`);
  // Baúl compartido: se guarda en una casa y se saca en otra
  const c1 = h.chest!;
  const near1 = g.findFreeNear(c1.x, c1.y, c1.z, 1)!;
  g.teleport(pl, near1.x, near1.y, c1.z);
  g.addItem('rubi', 3, true);
  const idx = pl.inv.findIndex((x) => x.id === 'rubi');
  g.deposit(idx);
  const stored = (pl.depot ?? []).some((x) => x.id === 'rubi' && x.n === 3) && g.count('rubi') === 0;
  const h2 = juncal[0];
  pl.houses!.push(h2.id);
  const c2 = h2.chest!;
  const near2 = g.findFreeNear(c2.x, c2.y, c2.z, 1)!;
  g.teleport(pl, near2.x, near2.y, c2.z);
  g.withdraw((pl.depot ?? []).findIndex((x) => x.id === 'rubi'));
  if (stored && g.count('rubi') === 3) ok('el baúl es compartido entre casas de distintos pueblos');
  else fail(`baúl: guardado=${stored}, recuperado=${g.count('rubi')}`);
  const saved = JSON.parse(JSON.stringify(g.save()));
  if (saved.houses.includes(h.id)) ok('las casas compradas se guardan con la partida');
  else fail('las casas no se guardan');
}

// ---------------------------------------------------------------- Combate
console.log('Combate (piloto automático, 10 minutos de juego por prueba)');
interface Trial {
  label: string;
  voc: VocId;
  level: number;
  equip: Record<string, string>;
  spells: string[];
  where: string;
  minutes?: number;
}
const trials: Trial[] = [
  { label: 'Aprendiz nv1 en los Ductos (ratas)', voc: 'aprendiz', level: 1, equip: { weapon: 'garrote', body: 'jubon' }, spells: ['sanar_menor'], where: 'rata' },
  { label: 'Aprendiz nv3 en los Ductos (cucarachas)', voc: 'aprendiz', level: 3, equip: { weapon: 'garrote', body: 'jubon' }, spells: ['sanar_menor'], where: 'cucaracha' },
  { label: 'Aprendiz nv5 contra el Rey de las Ratas', voc: 'aprendiz', level: 5, equip: { weapon: 'espada_corta', shield: 'escudo_madera', body: 'jubon', head: 'casco_hierro' }, spells: ['sanar_menor'], where: 'rey_rata', minutes: 5 },
  { label: 'Aprendiz nv4 con arañas de cueva', voc: 'aprendiz', level: 4, equip: { weapon: 'espada_corta', shield: 'escudo_madera', body: 'jubon', head: 'casco_hierro' }, spells: ['sanar_menor'], where: 'arana_cueva' },
  { label: 'Guerrero nv8 contra trasgos', voc: 'guerrero', level: 8, equip: { weapon: 'espada_corta', shield: 'escudo_madera', body: 'jubon', head: 'casco_hierro', legs: 'calzas' }, spells: ['sanar_menor', 'golpe_brutal'], where: 'trasgo' },
  { label: 'Arquero nv12 contra bandidos', voc: 'arquero', level: 12, equip: { weapon: 'arco', body: 'cota_malla', head: 'casco_hierro', legs: 'grebas' }, spells: ['sanar_menor', 'flecha_certera'], where: 'bandido' },
  { label: 'Brujo nv15 en la cripta (esqueletos)', voc: 'brujo', level: 15, equip: { weapon: 'varita_brasa', body: 'tunica_mago', head: 'capucha_mago' }, spells: ['sanar_menor', 'sanar_mayor', 'dardo_fuego'], where: 'esqueleto' },
  { label: 'Chamán nv22 contra hombres lagarto', voc: 'chaman', level: 22, equip: { weapon: 'baculo_escarcha', body: 'tunica_mago', head: 'capucha_mago', shield: 'libro_runas' }, spells: ['sanar_menor', 'sanar_mayor', 'lanza_hielo', 'raices'], where: 'lagarto' },
  { label: 'Guerrero nv28 en las minas (gólems)', voc: 'guerrero', level: 28, equip: { weapon: 'hacha_enana', shield: 'escudo_corona', body: 'coraza', head: 'casco_guardia', legs: 'grebas_corona' }, spells: ['sanar_menor', 'aguante', 'golpe_brutal', 'remolino'], where: 'golem' },
  { label: 'Guerrero nv25 contra Morvaine', voc: 'guerrero', level: 25, equip: { weapon: 'hacha_enana', shield: 'escudo_corona', body: 'coraza', head: 'casco_guardia', legs: 'grebas_corona' }, spells: ['sanar_menor', 'aguante', 'golpe_brutal', 'remolino'], where: 'nigromante', minutes: 5 },
  { label: 'Guerrero nv45 contra Ignaroth', voc: 'guerrero', level: 45, equip: { weapon: 'hacha_enana', shield: 'escudo_escamas', body: 'coraza_escamas', head: 'casco_guardia', legs: 'grebas_corona', feet: 'botas_viento' }, spells: ['sanar_menor', 'aguante', 'golpe_brutal', 'remolino'], where: 'ignaroth', minutes: 6 },
];

function runTrial(t: Trial) {
  const data = newPlayerData('Bot', look, map);
  data.voc = t.voc;
  data.level = t.level;
  data.exp = expForLevel(t.level);
  data.equip = t.equip as never;
  data.spells = t.spells;
  data.inv = [{ id: 'pocion_vida', n: 40 }, { id: 'pocion_mana', n: 60 }, { id: 'jamon', n: 30 }, { id: 'flecha', n: 2000 }];
  data.skills = {
    melee: { lvl: t.voc === 'guerrero' ? 10 + t.level * 1.7 : 10 + t.level * 0.3, tries: 0 },
    dist: { lvl: t.voc === 'arquero' ? 10 + t.level * 1.6 : 10 + t.level * 0.3, tries: 0 },
    shield: { lvl: t.voc === 'guerrero' ? 10 + t.level * 1.5 : 10 + t.level * 0.6, tries: 0 },
    magic: { lvl: t.voc === 'brujo' || t.voc === 'chaman' ? t.level * 2 : t.voc === 'arquero' ? t.level * 0.6 : 2, tries: 0 },
  };
  for (const k of Object.keys(data.skills) as (keyof typeof data.skills)[]) data.skills[k].lvl = Math.round(data.skills[k].lvl);
  const target = map.spawns.find((s) => s.monster === t.where)!;
  // Para los jefes, empieza junto a otra criatura de la misma cueva (los jefes no nacen a la vista)
  const spawn = MONSTERS[t.where].boss ? map.spawns.find((s) => s.z === target.z && s !== target && cheb(s, target) > 15 && map.areaName(s.x, s.y, s.z) === map.areaName(target.x, target.y, target.z))! : target;
  const tile = spawn.tiles[0];
  data.pos = { x: tile % map.W, y: Math.floor(tile / map.W), z: spawn.z };
  data.food = 1200;
  const g = new Game(map, data);
  const pl = g.player;
  const tf = g.findFreeNear(pl.x, pl.y, pl.z, 6);
  if (tf) g.teleport(pl, tf.x, tf.y, pl.z);
  pl.mana = g.maxMana();
  pl.hp = pl.maxHp;
  const startExp = pl.exp;
  let kills = 0;
  let deaths = 0;
  let bossKilled = false;
  const ms = (t.minutes ?? 10) * 60_000;
  const attackSpell = t.spells.find((s) => SPELLS.find((x) => x.id === s)!.kind === 'target');
  const areaSpell = t.spells.find((s) => SPELLS.find((x) => x.id === s)!.kind === 'area');
  const healSpell = [...t.spells].reverse().find((s) => SPELLS.find((x) => x.id === s)!.kind === 'heal');
  for (let time = 0; time < ms; time += 50) {
    g.update(50);
    for (const e of g.events) {
      if (e.t === 'death') deaths++;
      if (e.t === 'msg' && e.text.startsWith('Botín de')) kills++;
      if (e.t === 'msg' && e.text.startsWith('¡Has derrotado a')) bossKilled = true;
    }
    g.events.length = 0;
    if (pl.dead) {
      // Reaparece donde estaba, para seguir midiendo
      pl.dead = false;
      pl.hp = pl.maxHp;
      pl.mana = g.maxMana();
      continue;
    }
    if (pl.hp < pl.maxHp * 0.45) {
      if (healSpell && pl.mana >= SPELLS.find((x) => x.id === healSpell)!.mana && g.cast(healSpell)) continue;
      const i = pl.inv.findIndex((s) => s.id === 'pocion_vida');
      if (i >= 0) g.useItem(i);
    }
    if (pl.mana < g.maxMana() * 0.3) {
      const i = pl.inv.findIndex((s) => s.id === 'pocion_mana');
      if (i >= 0 && pl.hp > pl.maxHp * 0.6) g.useItem(i);
    }
    if (pl.target === null) {
      const near = g.visibleMonsters().filter((m) => m.def!.exp > 0);
      if (near.length) g.setTarget(near[0].id);
      else if (pl.path.length === 0 && time % 3000 === 0) {
        // Busca criaturas por la zona
        const sp = map.spawns.filter((s) => s.z === pl.z && s.monster === t.where);
        const any = sp[Math.floor(Math.random() * sp.length)];
        if (!any) {
          // Ha pisado una escalera: vuelve a la zona de prueba
          g.teleport(pl, data.pos.x, data.pos.y, data.pos.z);
          continue;
        }
        const k = any.tiles[Math.floor(Math.random() * any.tiles.length)];
        g.walkTo(k % map.W, Math.floor(k / map.W));
      }
    } else {
      const tg = g.creatures.get(pl.target);
      if (tg && areaSpell && g.visibleMonsters().filter((m) => cheb(m, pl) <= 1).length >= 2) g.cast(areaSpell);
      else if (tg && attackSpell && pl.mana > g.maxMana() * 0.35) g.cast(attackSpell);
    }
  }
  const expH = Math.round(((pl.exp - startExp) / ms) * 3_600_000);
  const verdict = deaths === 0 ? '' : deaths <= 2 ? '  (peligroso)' : '  (DEMASIADO DIFÍCIL)';
  console.log(`  • ${t.label}: ${kills} bajas, ${deaths} muertes, ${expH.toLocaleString('es')} exp/h${MONSTERS[t.where].boss ? (bossKilled ? ', JEFE DERROTADO' : ', jefe vivo') : ''}${verdict}`);
  return { kills, deaths };
}
for (const t of trials) runTrial(t);

console.log(errors ? `\n${errors} errores` : '\nTodo correcto');
process.exit(errors ? 1 : 0);
