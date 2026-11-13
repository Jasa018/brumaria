// Ventanas: tienda, botín, habilidades, misiones, hechizos, mapa, ayuda y pantallas completas.
import { item } from '../data/items';
import { NPCS } from '../data/npcs';
import { QUESTS } from '../data/quests';
import { SPELLS } from '../data/spells';
import { VOCATIONS } from '../data/vocations';
import type { Look } from '../data/monsters';
import { cheb, type Game } from '../game/game';
import type { Corpse, PlayerData } from '../game/types';
import { isComplete } from '../game/dialog';
import { creatureSprite, itemIcon } from '../gfx/sprites';
import { drawWorldMap } from '../gfx/render';
import { $, closeWin, el, esc, getWin, hideTip, itemTip, openWin, spriteEl, withTip } from './dom';
import { spellRune, type Panels } from './panels';

// ------------------------------------------------------------------ Tienda

export function openShop(game: Game, npcId: string, panels: Panels) {
  const npc = NPCS[npcId];
  const w = openWin('shop', `Tienda de ${npc.name}`, { x: 40, y: 60, width: 380 });
  let tab: 'buy' | 'sell' = npc.shop?.sells?.length ? 'buy' : 'sell';
  const render = () => {
    w.body.innerHTML = '';
    const p = game.player;
    const tabs = el('div', { cls: 'tabs' });
    for (const [t, label] of [['buy', 'Comprar'], ['sell', 'Vender']] as const) {
      const b = el('button', { textContent: label, cls: tab === t ? 'on' : '' });
      b.onclick = () => {
        tab = t;
        render();
      };
      tabs.append(b);
    }
    tabs.append(el('span', { cls: 'muted', innerHTML: `&nbsp; Oro: <span class="gold">${p.gold}</span> · Cap: ${Math.floor(game.freeCap())}` }));
    w.body.append(tabs);
    if (tab === 'buy') {
      for (const [id, price] of npc.shop?.sells ?? []) {
        const d = item(id);
        const qty = el('input', { type: 'number', value: '1', min: '1', max: '100' });
        const buy = el('button', { textContent: 'Comprar' });
        buy.onclick = () => {
          game.buy(npcId, id, Math.max(1, Math.min(100, Number(qty.value) || 1)));
          panels.forceInv();
          render();
        };
        const row = el('div', { cls: 'shop-row' }, spriteEl(itemIcon(d)), el('span', { cls: 'nm', textContent: d.name }), el('span', { cls: 'pr', textContent: `${price} oro` }), d.stack ? qty : el('span', { style: 'width:52px' } as never), buy);
        withTip(row.firstChild as HTMLElement, () => itemTip(id));
        w.body.append(row);
      }
    } else {
      const buys = npc.shop?.buys ?? [];
      const have = buys.filter((id) => game.count(id) > 0);
      if (!have.length) w.body.append(el('div', { cls: 'muted', textContent: buys.length ? 'No llevas nada que me interese.' : 'No compro nada.' }));
      for (const id of have) {
        const d = item(id);
        const n = game.count(id);
        const one = el('button', { textContent: 'Vender 1' });
        const all = el('button', { textContent: `Todo (${n})` });
        one.onclick = () => {
          game.sell(npcId, id, 1);
          panels.forceInv();
          render();
        };
        all.onclick = () => {
          game.sell(npcId, id, n);
          panels.forceInv();
          render();
        };
        const row = el('div', { cls: 'shop-row' }, spriteEl(itemIcon(d)), el('span', { cls: 'nm', textContent: `${d.name} x${n}` }), el('span', { cls: 'pr', textContent: `${d.value} c/u` }), one, all);
        withTip(row.firstChild as HTMLElement, () => itemTip(id, n));
        w.body.append(row);
      }
      if (have.length > 1) {
        const total = have.reduce((s, id) => s + item(id).value * game.count(id), 0);
        const b = el('button', { textContent: `Vender todo (${total} oro)` });
        b.style.marginTop = '6px';
        b.onclick = () => {
          for (const id of have) game.sell(npcId, id, game.count(id));
          panels.forceInv();
          render();
        };
        w.body.append(b);
      }
    }
  };
  render();
}

/** Cierra la tienda si el jugador deja de hablar con el NPC. */
export function checkShop(game: Game) {
  if (getWin('shop') && game.player.talkingTo === null) closeWin('shop');
}

// ------------------------------------------------------------------ Botín

let openCorpse: Corpse | null = null;

export function openLoot(game: Game, c: Corpse, panels: Panels) {
  openCorpse = c;
  const w = openWin('loot', `Cadáver de ${c.name}`, { x: window.innerWidth - 560, y: 80, width: 280 });
  w.onClose = () => (openCorpse = null);
  const render = () => {
    w.body.innerHTML = '';
    if (!c.items.length) w.body.append(el('div', { cls: 'muted', textContent: 'Está vacío.' }));
    c.items.forEach((s, i) => {
      const row = el('div', { cls: 'loot-row' }, spriteEl(itemIcon(item(s.id))), el('span', { textContent: `${s.n > 1 ? s.n + ' ' : ''}${item(s.id).name}` }));
      withTip(row, () => itemTip(s.id, s.n, '<span class="d">Clic: coger</span>'));
      row.onclick = () => {
        hideTip();
        game.takeFromCorpse(c, i);
        panels.forceInv();
        render();
      };
      w.body.append(row);
    });
    if (c.items.length) {
      const all = el('button', { textContent: 'Cogerlo todo (F)' });
      all.style.marginTop = '6px';
      all.onclick = () => {
        game.lootAll(c);
        panels.forceInv();
        render();
      };
      w.body.append(all);
    }
  };
  render();
}

export function checkLoot(game: Game) {
  const c = openCorpse;
  if (!c) return;
  const p = game.player;
  if (!game.corpses.includes(c) || c.z !== p.z || cheb(c, p) > 1) closeWin('loot');
}

export function refreshLoot(game: Game, panels: Panels) {
  if (openCorpse) openLoot(game, openCorpse, panels);
}

// ------------------------------------------------------------------ Habilidades

export function openSkills(game: Game) {
  const w = openWin('skills', 'Personaje', { width: 300 });
  const render = () => {
    const p = game.player;
    w.body.innerHTML = '';
    const v = VOCATIONS[p.voc];
    w.body.append(el('div', { innerHTML: `<b class="gold">${esc(p.name)}</b> — ${v.name}, nivel ${p.level}<br><span class="muted">${esc(v.desc)}</span><br><br>` }));
    const rows: [keyof PlayerData['skills'], string][] = [['melee', 'Cuerpo a cuerpo'], ['dist', 'Distancia'], ['shield', 'Escudo'], ['magic', 'Nivel mágico']];
    for (const [k, label] of rows) {
      const r = el('div', { cls: 'skill-row' });
      r.innerHTML = `<span>${label}</span><span class="gold" style="text-align:right">${p.skills[k].lvl}</span><div class="bar"><div style="width:${game.skillProgress(k) * 100}%"></div></div>`;
      w.body.append(r);
    }
    w.body.append(el('div', {
      cls: 'muted',
      innerHTML: `<br>Armadura total: ${game.armor()} · Velocidad: ${Math.round(game.speed())}<br>Hogar: ${esc(game.map.towns.find((t) => t.id === p.home)?.name ?? '')}<br>Criaturas derrotadas: ${p.stats.kills} · Muertes: ${p.stats.deaths}<br>Tiempo de juego: ${Math.floor(p.stats.playMs / 3_600_000)} h ${Math.floor((p.stats.playMs / 60_000) % 60)} min`,
    }));
  };
  render();
}

// ------------------------------------------------------------------ Misiones

export function openQuests(game: Game) {
  const w = openWin('quests', 'Diario de misiones', { width: 420 });
  const p = game.player;
  const active = QUESTS.filter((q) => p.quests[q.id]?.state === 'active');
  const done = QUESTS.filter((q) => p.quests[q.id]?.state === 'done');
  if (!active.length && !done.length) w.body.append(el('div', { cls: 'muted', innerHTML: 'Aún no tienes misiones. Habla con la gente de los pueblos y pregunta por una <b>misión</b>.<br><br>Pista: el Anciano Teodoro, en Albor, necesita ayuda.' }));
  for (const q of active) {
    const st = p.quests[q.id];
    let progress = '';
    if (q.objective.type === 'kill') progress = ` (${st.count}/${q.objective.count})`;
    if (q.objective.type === 'bring') progress = ` (${Math.min(game.count(q.objective.item), q.objective.count)}/${q.objective.count})`;
    const ready = isComplete(game, q) ? ' — ¡listo para entregar!' : '';
    w.body.append(el('div', { cls: 'quest-row', innerHTML: `<span class="qn">${esc(q.name)}${progress}${ready}</span><span>${esc(q.journal)}</span><span class="muted">Encargo de ${esc(NPCS[q.giver].name)}</span>` }));
  }
  if (done.length) {
    w.body.append(el('h3', { textContent: 'Completadas', style: 'margin-top:10px' } as never));
    for (const q of done) w.body.append(el('div', { cls: 'quest-row done', innerHTML: `<span class="qn">✓ ${esc(q.name)}</span>` }));
  }
}

// ------------------------------------------------------------------ Hechizos

export function openSpells(game: Game, panels: Panels) {
  const w = openWin('spells', 'Libro de hechizos', { width: 440 });
  const p = game.player;
  const known = SPELLS.filter((s) => p.spells.includes(s.id));
  w.body.append(el('div', { cls: 'muted', innerHTML: 'Escribe las palabras en el chat para lanzarlos, o asígnalos a la barra de atajos (teclas 1-8).<br><br>' }));
  for (const s of known) {
    const assign = el('button', { textContent: 'Asignar' });
    assign.onclick = (e) => panels.assignMenu(`spell:${s.id}`, e.clientX, e.clientY);
    const row = el('div', { cls: 'spell-row' }, spellRune(s.id), el('div', { cls: 'nm', innerHTML: `<span class="gold">${esc(s.name)}</span> <span class="muted">"${esc(s.words)}"</span><br><span class="muted">${s.mana} maná · ${esc(s.desc)}</span>` }), assign);
    w.body.append(row);
  }
  const learnable = SPELLS.filter((s) => s.voc.includes(p.voc) && !p.spells.includes(s.id) && s.price > 0);
  if (learnable.length) {
    w.body.append(el('h3', { textContent: 'Por aprender (Maestra Selene, Valcorona)', style: 'margin-top:10px' } as never));
    for (const s of learnable.sort((a, b) => a.level - b.level))
      w.body.append(el('div', { cls: 'muted', textContent: `Nv ${s.level} — ${s.name} (${s.price} oro): ${s.desc}` }));
  } else if (p.voc === 'aprendiz') w.body.append(el('div', { cls: 'muted', innerHTML: '<br>Elige una vocación (nivel 6, Oráculo de Albor) para aprender más hechizos.' }));
}

// ------------------------------------------------------------------ Mapa

export function openMap(game: Game) {
  const w = openWin('map', 'Mapa de Brumaria');
  let z = game.player.z;
  const cv = el('canvas', { width: game.map.W * 3, height: game.map.H * 3 });
  cv.style.cssText = 'max-width:100%;image-rendering:pixelated;display:block;background:#000';
  const tabs = el('div', { cls: 'tabs' });
  const render = () => {
    tabs.innerHTML = '';
    ['Superficie', 'Subsuelo 1', 'Subsuelo 2'].forEach((label, i) => {
      const b = el('button', { textContent: label, cls: i === z ? 'on' : '' });
      b.onclick = () => {
        z = i;
        render();
      };
      tabs.append(b);
    });
    drawWorldMap(cv, game, z);
  };
  w.body.append(tabs, cv, el('div', { cls: 'muted', textContent: 'Solo se muestra lo que has explorado. Amarillo: escaleras.' }));
  render();
}

// ------------------------------------------------------------------ Ayuda

export function openHelp() {
  const w = openWin('help', 'Cómo jugar', { width: 520 });
  w.body.classList.add('help');
  w.body.innerHTML = `
    <p><b class="gold">Moverse:</b> <kbd>Flechas</kbd> o <kbd>WASD</kbd> (diagonales con <kbd>Q</kbd> <kbd>E</kbd> <kbd>Z</kbd> <kbd>C</kbd>), o clic en el suelo.</p>
    <p><b class="gold">Atacar:</b> clic sobre una criatura, o <kbd>Espacio</kbd> para elegir el enemigo más cercano. Tu personaje ataca solo cada 2 segundos. <kbd>Esc</kbd> deja de atacar.</p>
    <p><b class="gold">Hablar:</b> clic en un NPC o escribe <kbd>hola</kbd> junto a él (<kbd>Enter</kbd> abre el chat). Prueba palabras como <i>misión</i>, <i>comerciar</i>, <i>viajar</i>, <i>hechizos</i>, <i>curar</i>, <i>hogar</i>... Las palabras resaltadas se pueden pulsar.</p>
    <p><b class="gold">Hechizos y objetos:</b> teclas <kbd>1</kbd>-<kbd>8</kbd> para la barra de atajos. También puedes escribir las palabras mágicas (por ejemplo <i>vita lux</i> para curarte).</p>
    <p><b class="gold">Botín:</b> clic en un cadáver junto a ti, o <kbd>F</kbd> para cogerlo todo de los cadáveres de alrededor. Clic derecho en cualquier casilla para mirarla.</p>
    <p><b class="gold">Ventanas:</b> <kbd>K</kbd> personaje · <kbd>J</kbd> misiones · <kbd>L</kbd> hechizos · <kbd>M</kbd> mapa · <kbd>H</kbd> ayuda.</p>
    <p><b class="gold">Supervivencia:</b> sin comida no recuperas vida ni maná. Las cuevas son oscuras: usa antorchas o el hechizo <i>lumen</i>. Los pueblos son zonas protegidas. Si mueres, despiertas en el templo de tu hogar y pierdes algo de experiencia.</p>
    <p><b class="gold">Progreso:</b> empieza en la isla de Albor. Al nivel 6 elige tu vocación con el Oráculo y viaja a la capital, Valcorona. La partida se guarda sola.</p>`;
}

// ------------------------------------------------------------------ Pantallas completas

const OUTFITS: { c1: string; c2: string; hair: string; skin: string }[] = [
  { c1: '#3e5fa8', c2: '#5a3a1a', hair: '#3a2a1a', skin: '#e0b089' },
  { c1: '#a83a3a', c2: '#3a3a3a', hair: '#c96a3a', skin: '#f0c8a0' },
  { c1: '#4a8a3a', c2: '#6b4a2a', hair: '#f2d14c', skin: '#e0b089' },
  { c1: '#6a4a9a', c2: '#2a2a3a', hair: '#1a1010', skin: '#a8754a' },
  { c1: '#c9a24a', c2: '#4a3a2a', hair: '#e8e8e8', skin: '#d99a6c' },
  { c1: '#2a7a8a', c2: '#3a2a1a', hair: '#7a3a1a', skin: '#8a5a3a' },
];

export function titleScreen(hasSave: boolean, saveInfo: string): Promise<{ action: 'continue' } | { action: 'new'; name: string; look: Look }> {
  return new Promise((resolve) => {
    const scr = el('div', { cls: 'screen' });
    const box = el('div', { cls: 'box' });
    scr.append(box);
    document.body.append(scr);
    const main = () => {
      box.innerHTML = `<h1>Crónicas de<br>Brumaria</h1><h2>Un mundo de casillas, monstruos y leyendas</h2>`;
      const col = el('div', { cls: 'col' });
      if (hasSave) {
        const c = el('button', { textContent: 'Continuar' });
        c.onclick = () => {
          scr.remove();
          resolve({ action: 'continue' });
        };
        col.append(c, el('div', { cls: 'muted', textContent: saveInfo }));
      }
      const n = el('button', { textContent: 'Nueva partida' });
      n.onclick = () => {
        if (hasSave && !confirm('Se borrará tu partida actual. ¿Seguro?')) return;
        create();
      };
      col.append(n);
      box.append(col, el('p', { cls: 'muted', innerHTML: '<br>Flechas para moverte · clic para atacar · Enter para hablar' }));
      setTimeout(() => (hasSave ? (col.firstChild as HTMLElement) : n).focus(), 50);
    };
    const create = () => {
      box.innerHTML = '<h1 style="font-size:18px">Nuevo aventurero</h1>';
      let sel = 0;
      const name = el('input', { maxLength: 16, placeholder: 'Tu nombre', value: '' });
      name.style.cssText = 'font-size:24px;text-align:center;width:260px';
      const outfits = el('div', { cls: 'outfits' });
      const drawOutfits = () => {
        outfits.innerHTML = '';
        OUTFITS.forEach((o, i) => {
          const cv = spriteEl(creatureSprite({ body: 'humanoid', ...o, weapon: 'none' }, 0, 0));
          if (i === sel) cv.classList.add('on');
          cv.onclick = () => {
            sel = i;
            drawOutfits();
          };
          outfits.append(cv);
        });
      };
      drawOutfits();
      const go = el('button', { textContent: 'Empezar la aventura' });
      const back = el('button', { textContent: 'Volver' });
      const start = () => {
        const nm = name.value.trim().replace(/[<>{}]/g, '');
        if (nm.length < 2) {
          name.focus();
          name.style.borderColor = '#ff5050';
          return;
        }
        scr.remove();
        resolve({ action: 'new', name: nm[0].toUpperCase() + nm.slice(1), look: { body: 'humanoid', ...OUTFITS[sel], weapon: 'none' } });
      };
      go.onclick = start;
      back.onclick = main;
      name.onkeydown = (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') start();
      };
      const col = el('div', { cls: 'col' }, name, el('div', { cls: 'muted', textContent: 'Elige tu aspecto:' }), outfits, go, back);
      box.append(col, el('p', { cls: 'muted', innerHTML: 'Despiertas en la isla de Albor, donde empiezan todos los aventureros.<br>El Anciano Teodoro y el Oráculo te esperan en el pueblo.' }));
      setTimeout(() => name.focus(), 50);
    };
    main();
  });
}

export function deathScreen(game: Game): Promise<void> {
  return new Promise((resolve) => {
    const p = game.player;
    const scr = el('div', { cls: 'screen death' });
    const town = game.map.towns.find((t) => t.id === p.home)?.name ?? 'Albor';
    const b = el('button', { textContent: 'Despertar en el templo' });
    scr.append(el('div', { cls: 'box' }, el('h1', { textContent: 'Has caído' }), el('p', { innerHTML: `Tu viaje no acaba aquí.<br>Despertarás en el templo de <b>${esc(town)}</b>, algo más débil.` }), b));
    document.body.append(scr);
    b.onclick = () => {
      scr.remove();
      resolve();
    };
    setTimeout(() => b.focus(), 50);
  });
}

export function endingScreen(game: Game) {
  const p = game.player;
  const scr = el('div', { cls: 'screen' });
  const b = el('button', { textContent: 'Seguir explorando' });
  const h = Math.floor(p.stats.playMs / 3_600_000);
  const m = Math.floor((p.stats.playMs / 60_000) % 60);
  scr.append(el('div', { cls: 'box' },
    el('h1', { innerHTML: '¡Campeón de<br>Brumaria!' }),
    el('p', { innerHTML: `Con el corazón de Ignaroth en las manos del rey, Brumaria respira tranquila por primera vez en siglos.<br><br><b class="gold">${esc(p.name)}</b>, ${VOCATIONS[p.voc].name.toLowerCase()} de nivel ${p.level}.<br>${p.stats.kills} criaturas derrotadas · ${p.stats.deaths} muertes · ${h} h ${m} min de aventura.<br><br>El mundo sigue ahí: quedan criaturas por cazar y botín por encontrar.` }),
    b));
  document.body.append(scr);
  b.onclick = () => scr.remove();
}

/** Banner con el nombre de la zona. */
let bannerTimer = 0;
export function banner(text: string) {
  const b = $('#banner');
  b.textContent = text;
  b.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = window.setTimeout(() => b.classList.remove('show'), 2200);
}
