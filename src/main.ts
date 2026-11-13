// Punto de entrada: pantalla de título, bucle del juego, entrada y guardado.
import './style.css';
import { Game, newPlayerData } from './game/game';
import { generateWorld } from './game/world';
import type { PlayerData } from './game/types';
import { VOCATIONS } from './data/vocations';
import { O } from './data/tiles';
import { Renderer, drawMinimap } from './gfx/render';
import { isMuted, play, toggleMute } from './ui/audio';
import { $, closeAllWins, closeMenu, getWin, closeWin } from './ui/dom';
import { Panels } from './ui/panels';
import {
  banner, checkDepot, checkLoot, checkShop, openDepot, deathScreen, endingScreen, openHelp, openLoot, openMap, openQuests, openShop, openSkills,
  openSpells, refreshLoot, titleScreen,
} from './ui/windows';

const SAVE_KEY = 'brumaria-save-v1';

function loadSave(): PlayerData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as PlayerData;
    return d.version === 1 ? d : null;
  } catch {
    return null;
  }
}

function writeSave(game: Game) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(game.save()));
  } catch {
    /* almacenamiento lleno o bloqueado: se juega sin guardar */
  }
}

const MOVE_KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
  q: [-1, -1], e: [1, -1], z: [-1, 1], c: [1, 1],
};

async function boot() {
  // Espera a la fuente pixelada (con límite, por si no hay conexión)
  await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1500))]);
  const map = generateWorld();
  const saved = loadSave();
  const info = saved ? `${saved.name} — ${VOCATIONS[saved.voc].name}, nivel ${saved.level}` : '';
  const choice = await titleScreen(!!saved, info);
  const data = choice.action === 'continue' && saved ? saved : newPlayerData(choice.action === 'new' ? choice.name : 'Aventurero', choice.action === 'new' ? choice.look : { body: 'humanoid', c1: '#3e5fa8', c2: '#5a3a1a' }, map);
  const game = new Game(map, data);
  if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = game;

  const renderer = new Renderer($('#view') as HTMLCanvasElement);
  const panels = new Panels(game);
  const chat = $('#chat') as HTMLInputElement;
  const say = (text: string) => {
    game.say(text);
  };
  panels.onSay = say;

  const toggle = (id: string, open: () => void) => (getWin(id) ? closeWin(id) : open());
  const muteLabel = () => (isMuted() ? 'Sonido: no' : 'Sonido: sí');
  panels.buttons = [
    ['Personaje', 'K', () => toggle('skills', () => openSkills(game))],
    ['Misiones', 'J', () => toggle('quests', () => openQuests(game))],
    ['Hechizos', 'L', () => toggle('spells', () => openSpells(game, panels))],
    ['Mapa', 'M', () => toggle('map', () => openMap(game))],
    ['Ayuda', 'H', () => toggle('help', openHelp)],
    [muteLabel(), '', () => {
      toggleMute();
      panels.buttons[5][0] = muteLabel();
      panels.renderButtons();
    }],
  ];
  panels.renderButtons();

  if (choice.action === 'new') {
    panels.log(`Bienvenido a Brumaria, ${data.name}.`, 'yellow');
    panels.log('Estás en el templo de Albor, una ciudad amurallada. El portón (al este) está cerrado: habla con el capitán Rurik, en el cuartel junto a él, para saber cómo salir.', 'white');
    panels.log('Las puertas se abren con un clic a su lado. Haz clic en un NPC o escribe "hola" junto a él para hablar. Pulsa H para ver los controles.', 'gray');
    banner('Albor');
  } else {
    panels.log(`Bienvenido de nuevo, ${data.name}.`, 'yellow');
    banner(map.areaName(game.player.x, game.player.y, game.player.z));
  }

  // ------------------------------------------------------------ Entrada
  const held = new Set<string>();
  let dying = false;

  window.addEventListener('keydown', (e) => {
    if (document.querySelector('.screen')) return;
    if (document.activeElement === chat) {
      if (e.key === 'Enter') {
        const t = chat.value.trim();
        chat.value = '';
        chat.blur();
        if (t) say(t);
      } else if (e.key === 'Escape') chat.blur();
      return;
    }
    if (document.activeElement instanceof HTMLInputElement) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (MOVE_KEYS[k]) {
      e.preventDefault();
      held.add(k);
      return;
    }
    if (k === 'Enter') {
      e.preventDefault();
      chat.focus();
      return;
    }
    const hot = /^[1-8]$/.test(k) ? Number(k) - 1 : /^F[1-8]$/.test(k) ? Number(k.slice(1)) - 1 : -1;
    if (hot >= 0) {
      e.preventDefault();
      game.useHotbar(hot);
      return;
    }
    switch (k) {
      case ' ':
        e.preventDefault();
        game.nextTarget();
        break;
      case 'Escape':
        closeMenu();
        if (!closeAllWins()) game.setTarget(null);
        break;
      case 'f':
        game.lootNearby();
        refreshLoot(game, panels);
        break;
      case 'k':
        panels.buttons[0][2]();
        break;
      case 'j':
        panels.buttons[1][2]();
        break;
      case 'l':
        panels.buttons[2][2]();
        break;
      case 'm':
        panels.buttons[3][2]();
        break;
      case 'h':
        panels.buttons[4][2]();
        break;
    }
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    held.delete(k);
  });
  window.addEventListener('blur', () => held.clear());

  const view = renderer.canvas;
  view.addEventListener('mousemove', (e) => (renderer.hover = renderer.screenToTile(e.clientX, e.clientY)));
  view.addEventListener('mouseleave', () => (renderer.hover = null));
  view.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const t = renderer.screenToTile(e.clientX, e.clientY);
    game.look(t.x, t.y);
  });
  view.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    closeMenu();
    chat.blur();
    const t = renderer.screenToTile(e.clientX, e.clientY);
    const p = game.player;
    if (e.shiftKey) return game.look(t.x, t.y);
    const c = game.creatureAt(t.x, t.y, p.z);
    if (c && c.kind === 'monster') return game.setTarget(p.target === c.id ? null : c.id);
    if (c && c.kind === 'npc') return game.talkTo(c.id);
    const o = game.map.o(t.x, t.y, p.z);
    if (o === O.CHEST) return void game.openChest(t.x, t.y);
    if ((o === O.DOOR || o === O.DOOR_OPEN) && !c) {
      if (Math.max(Math.abs(t.x - p.x), Math.abs(t.y - p.y)) <= 1) return void game.toggleDoor(t.x, t.y);
      return void game.walkTo(t.x, t.y);
    }
    const corpse = game.corpseAt(t.x, t.y, p.z);
    if (corpse && game.canLoot(corpse)) return openLoot(game, corpse, panels);
    if (c && c.kind === 'player') return;
    game.walkTo(t.x, t.y);
  });
  $('#minimap').addEventListener('click', () => toggle('map', () => openMap(game)));

  // ------------------------------------------------------------ Guardado
  setInterval(() => !game.player.dead && writeSave(game), 20_000);
  window.addEventListener('beforeunload', () => writeSave(game));
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && writeSave(game));

  // ------------------------------------------------------------ Bucle
  let last = performance.now();
  let uiAt = 0;
  let miniAt = 0;
  const minimap = $('#minimap') as HTMLCanvasElement;

  const frame = (now: number) => {
    const dt = Math.min(100, now - last);
    last = now;
    // Movimiento con teclas mantenidas
    if (held.size && !game.player.dead) {
      let dx = 0;
      let dy = 0;
      for (const k of held) {
        dx += MOVE_KEYS[k][0];
        dy += MOVE_KEYS[k][1];
      }
      dx = Math.sign(dx);
      dy = Math.sign(dy);
      if (dx || dy) game.walk(dx, dy);
    }
    game.update(dt);
    for (const ev of game.events) {
      renderer.onEvent(ev, now);
      switch (ev.t) {
        case 'msg':
          panels.log(ev.text, ev.color);
          break;
        case 'chat':
          panels.chat(ev.name, ev.text, ev.npc);
          break;
        case 'sound':
          play(ev.s);
          break;
        case 'shop':
          openShop(game, ev.npc, panels);
          break;
        case 'inv':
          panels.forceInv();
          break;
        case 'depot':
          openDepot(game, panels);
          break;
        case 'levelup':
          banner(`¡Nivel ${ev.level}!`);
          writeSave(game);
          break;
        case 'area':
          if (ev.name) banner(ev.name);
          break;
        case 'floor':
          closeWin('loot');
          break;
        case 'ending':
          writeSave(game);
          setTimeout(() => endingScreen(game), 1500);
          break;
        case 'death':
          if (!dying) {
            dying = true;
            held.clear();
            closeAllWins();
            setTimeout(async () => {
              await deathScreen(game);
              game.respawn();
              dying = false;
              writeSave(game);
            }, 900);
          }
          break;
      }
    }
    game.events.length = 0;
    renderer.draw(game, now);
    if (now - uiAt > 150) {
      uiAt = now;
      panels.refresh();
      checkLoot(game);
      checkShop(game);
      checkDepot(game);
    }
    if (now - miniAt > 300) {
      miniAt = now;
      drawMinimap(minimap, game);
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

void boot();
