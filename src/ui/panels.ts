// Panel lateral (estado, equipo, mochila, enemigos), barra de atajos y consola.
import { item, type Slot } from '../data/items';
import { SPELLS } from '../data/spells';
import { VOCATIONS } from '../data/vocations';
import { EXHAUST_MS, FOOD_MAX, HOTBAR, INV_SLOTS, expForLevel, type Game } from '../game/game';
import type { MsgColor } from '../game/types';
import { creatureSprite, itemIcon } from '../gfx/sprites';
import { $, contextMenu, el, esc, hideTip, itemTip, keywordHtml, spriteEl, withTip } from './dom';

const SLOTS: [Slot, string][] = [
  ['head', 'casco'], ['neck', 'amuleto'], ['weapon', 'arma'], ['body', 'armadura'],
  ['shield', 'escudo'], ['ring', 'anillo'], ['legs', 'piernas'], ['feet', 'botas'],
];

const ELEMENT_RUNE: Record<string, string> = {
  fire: '#c0501c', ice: '#2a8ab0', earth: '#3a8a2a', energy: '#7a3ad0', holy: '#b09020', physical: '#8a3030', death: '#403050',
};

export function spellRune(id: string): HTMLElement {
  const s = SPELLS.find((sp) => sp.id === id)!;
  const color = s.kind === 'heal' ? '#2a5ac0' : s.kind === 'light' ? '#b09020' : s.kind === 'haste' ? '#2a9a7a' : s.kind === 'conjure' ? '#7a6a4a' : ELEMENT_RUNE[s.element ?? 'physical'];
  const abbr = s.name.split(' ').map((w) => w[0]).join('').slice(0, 3).toUpperCase();
  const d = el('div', { cls: 'rune', textContent: abbr });
  d.style.background = color;
  return d;
}

export class Panels {
  private sig = new Map<string, string>();
  private logEl = $('#log');
  onSay: (text: string) => void = () => {};
  onOpenCorpse: () => void = () => {};
  buttons: [string, string, () => void][] = [];

  constructor(private game: Game) {
    this.logEl.addEventListener('click', (e) => {
      const kw = (e.target as HTMLElement).dataset?.kw;
      if (kw) this.onSay(kw);
    });
  }

  setGame(g: Game) {
    this.game = g;
    this.sig.clear();
  }

  /** Actualiza solo lo que haya cambiado. */
  private changed(key: string, sig: string): boolean {
    if (this.sig.get(key) === sig) return false;
    this.sig.set(key, sig);
    return true;
  }

  log(text: string, color: MsgColor | 'npc' | 'me' = 'white', html = false) {
    const atBottom = this.logEl.scrollTop + this.logEl.clientHeight >= this.logEl.scrollHeight - 30;
    const line = el('div', { cls: color });
    line.innerHTML = html ? text : esc(text);
    this.logEl.append(line);
    while (this.logEl.childElementCount > 250) this.logEl.firstElementChild!.remove();
    if (atBottom) this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  chat(name: string, text: string, npc: boolean) {
    this.log(`<b>${esc(name)}:</b> ${npc ? keywordHtml(text) : esc(text)}`, npc ? 'npc' : 'me', true);
  }

  refresh() {
    this.stats();
    this.equip();
    this.inv();
    this.battle();
    this.hotbar();
    this.where();
  }

  forceInv() {
    this.sig.delete('inv');
    this.sig.delete('equip');
    this.sig.delete('hot');
  }

  private where() {
    const g = this.game;
    const p = g.player;
    const h = g.hour();
    const hh = String(Math.floor(h)).padStart(2, '0');
    const mm = String(Math.floor((h % 1) * 60 / 10) * 10).padStart(2, '0');
    const area = g.map.areaName(p.x, p.y, p.z);
    const s = `${area}|${hh}:${mm}|${p.z}`;
    if (!this.changed('where', s)) return;
    $('#where').innerHTML = `<span>${esc(area)}</span><span>${p.z > 0 ? `Subsuelo ${p.z}` : `${h >= 7 && h < 19 ? '☀' : '☾'} ${hh}:${mm}`}</span>`;
  }

  private stats() {
    const g = this.game;
    const p = g.player;
    const mm = g.maxMana();
    const lo = expForLevel(p.level);
    const hi = expForLevel(p.level + 1);
    const pct = Math.max(0, Math.min(1, (p.exp - lo) / (hi - lo)));
    const food = p.food <= 0 ? '<span style="color:#ff7070">Hambriento</span>' : p.food > FOOD_MAX * 0.8 ? 'Lleno' : p.food > 120 ? 'Saciado' : '<span style="color:#ffa040">Con hambre</span>';
    const sig = [p.hp, p.maxHp, p.mana, mm, p.level, Math.round(pct * 200), p.gold, Math.round(g.weight()), g.maxCap(), food, p.voc].join('|');
    if (!this.changed('stats', sig)) return;
    const root = $('#stats');
    root.innerHTML = `
      <div class="name-line"><span>${esc(p.name)}</span><b>${VOCATIONS[p.voc].name} · Nv ${p.level}</b></div>
      <div class="bar hp"><div style="width:${(p.hp / p.maxHp) * 100}%"></div><span>${Math.max(0, p.hp)} / ${p.maxHp}</span></div>
      <div class="bar mana"><div style="width:${(p.mana / mm) * 100}%"></div><span>${p.mana} / ${mm}</span></div>
      <div class="bar exp" title=""><div style="width:${pct * 100}%"></div></div>
      <div class="mini-stats">
        <span>Oro <b class="gold">${p.gold}</b></span><span>Comida <b>${food}</b></span>
        <span>Exp <b>${Math.floor(pct * 100)}%</b></span><span>Cap <b>${Math.floor(g.freeCap())}</b></span>
      </div>`;
    withTip(root.querySelector('.bar.exp') as HTMLElement, () => `Experiencia: ${p.exp.toLocaleString('es')}<br>Para el nivel ${p.level + 1}: ${(hi - p.exp).toLocaleString('es')}`);
  }

  private equip() {
    const g = this.game;
    const p = g.player;
    const sig = SLOTS.map(([s]) => p.equip[s] ?? '').join('|');
    if (!this.changed('equip', sig)) return;
    const root = $('#equip');
    root.innerHTML = '<h3>Equipo</h3>';
    const grid = el('div', { cls: 'slots' });
    for (const [slot, label] of SLOTS) {
      const id = p.equip[slot];
      const s = el('div', { cls: 'slot' });
      if (id) {
        s.append(spriteEl(itemIcon(item(id))));
        withTip(s, () => itemTip(id, 1, '<span class="d">Clic: quitar</span>'));
        s.onclick = () => {
          hideTip();
          g.unequip(slot);
          this.forceInv();
        };
      } else s.append(el('span', { cls: 'ghost', textContent: label }));
      grid.append(s);
    }
    root.append(grid);
  }

  private inv() {
    const g = this.game;
    const p = g.player;
    const sig = p.inv.map((s) => `${s.id}:${s.n}`).join('|') + `|${Math.round(g.weight())}`;
    if (!this.changed('inv', sig)) return;
    const root = $('#inv');
    root.innerHTML = '<h3>Mochila</h3>';
    const grid = el('div', { cls: 'slots' });
    for (let i = 0; i < INV_SLOTS; i++) {
      const st = p.inv[i];
      const s = el('div', { cls: 'slot' });
      if (st) {
        const d = item(st.id);
        s.append(spriteEl(itemIcon(d)));
        if (st.n > 1) s.append(el('span', { cls: 'n', textContent: String(st.n) }));
        const action = d.kind === 'food' ? 'comer' : d.kind === 'potion' ? 'beber' : d.slot ? 'equipar' : d.id === 'antorcha' ? 'encender' : 'mirar';
        withTip(s, () => itemTip(st.id, st.n, `<span class="d">Clic: ${action} · Clic derecho: más opciones</span>`));
        s.onclick = () => {
          hideTip();
          g.useItem(i);
          this.forceInv();
        };
        s.oncontextmenu = (e) => {
          e.preventDefault();
          this.itemMenu(i, e.clientX, e.clientY);
        };
      }
      grid.append(s);
    }
    root.append(grid);
    root.append(el('div', { cls: 'cap-line', innerHTML: `<span>${p.inv.length}/${INV_SLOTS} huecos</span><span>${g.weight().toFixed(0)}/${g.maxCap()} oz</span>` }));
  }

  private itemMenu(i: number, x: number, y: number) {
    const g = this.game;
    const st = g.player.inv[i];
    if (!st) return;
    const d = item(st.id);
    const opts: [string, () => void][] = [];
    if (d.kind === 'food') opts.push(['Comer', () => g.useItem(i)]);
    if (d.kind === 'potion') opts.push(['Beber', () => g.useItem(i)]);
    if (d.slot) opts.push(['Equipar', () => g.useItem(i)]);
    if (d.id === 'antorcha') opts.push(['Encender', () => g.useItem(i)]);
    if (d.kind === 'food' || d.kind === 'potion' || d.id === 'antorcha')
      opts.push(['Asignar a atajo…', () => this.assignMenu(`item:${st.id}`, x, y)]);
    opts.push(['Mirar', () => g.msg(`${d.name}${d.desc ? ': ' + d.desc : '.'}`, 'gray')]);
    opts.push([st.n > 1 ? `Tirar (${st.n})` : 'Tirar', () => g.destroyItem(i)]);
    contextMenu(x, y, opts.map(([l, f]) => [l, () => {
      f();
      this.forceInv();
    }]));
  }

  assignMenu(entry: string, x: number, y: number) {
    const g = this.game;
    setTimeout(() =>
      contextMenu(x, y, Array.from({ length: HOTBAR }, (_, k) => [`Atajo ${k + 1}${g.player.hotbar[k] ? ' (reemplazar)' : ''}`, () => {
        g.setHotbar(k, entry);
        this.forceInv();
      }])), 0);
  }

  private battle() {
    const g = this.game;
    const list = g.visibleMonsters();
    const sig = list.map((c) => `${c.id}:${Math.round((c.hp / c.maxHp) * 20)}`).join('|') + `|${g.player.target}`;
    if (!this.changed('battle', sig)) return;
    const root = $('#battle');
    root.innerHTML = '<h3>Enemigos cercanos</h3>';
    if (!list.length) root.append(el('div', { cls: 'empty', textContent: 'Nadie a la vista.' }));
    for (const c of list.slice(0, 8)) {
      const row = el('div', { cls: 'row' + (c.id === g.player.target ? ' sel' : '') });
      row.append(spriteEl(creatureSprite(c.look, 0, 0)), el('span', { textContent: c.name }));
      const hb = el('div', { cls: 'hpb' }, el('div'));
      (hb.firstChild as HTMLElement).style.width = `${(c.hp / c.maxHp) * 100}%`;
      row.append(hb);
      row.onclick = () => g.setTarget(c.id === g.player.target ? null : c.id);
      root.append(row);
    }
  }

  private hotbar() {
    const g = this.game;
    const p = g.player;
    const cds = p.hotbar.map((e) => {
      if (!e) return 0;
      const [k, id] = e.split(':');
      if (k === 'spell') {
        const s = SPELLS.find((sp) => sp.id === id)!;
        const until = Math.max(p.spellCd[id] ?? 0, p.exhaustUntil);
        const total = Math.max(s.cd * 1000, EXHAUST_MS);
        return Math.max(0, Math.round(((until - g.time) / total) * 10));
      }
      return Math.max(0, Math.round(((p.exhaustUntil - g.time) / EXHAUST_MS) * 10));
    });
    const sig = p.hotbar.join('|') + '|' + p.hotbar.map((e) => (e?.startsWith('item:') ? g.count(e.slice(5)) : '')).join(',') + '|' + cds.join(',') + '|' + p.mana;
    if (!this.changed('hot', sig)) return;
    const root = $('#hotbar');
    root.innerHTML = '';
    p.hotbar.forEach((entry, i) => {
      const s = el('div', { cls: 'hot' }, el('span', { cls: 'key', textContent: String(i + 1) }));
      if (entry) {
        const [k, id] = entry.split(':');
        if (k === 'spell') {
          const sp = SPELLS.find((x) => x.id === id)!;
          const rune = spellRune(id);
          if (p.mana < sp.mana) rune.style.opacity = '0.4';
          s.append(rune);
          withTip(s, () => `<div class="t">${esc(sp.name)}</div>"${esc(sp.words)}"<br>${sp.mana} maná · nivel ${sp.level}<br><span class="d">${esc(sp.desc)}</span>`);
        } else {
          const d = item(id);
          const n = g.count(id);
          const ic = spriteEl(itemIcon(d));
          if (!n) ic.style.opacity = '0.35';
          s.append(ic, el('span', { cls: 'num', textContent: String(n) }));
          withTip(s, () => itemTip(id, Math.max(1, n)));
        }
        if (cds[i] > 0) {
          const cd = el('div', { cls: 'cd' });
          cd.style.height = `${cds[i] * 10}%`;
          s.append(cd);
        }
        s.onclick = () => g.useHotbar(i);
        s.oncontextmenu = (e) => {
          e.preventDefault();
          contextMenu(e.clientX, e.clientY, [['Quitar del atajo', () => g.setHotbar(i, null)]]);
        };
      } else {
        withTip(s, () => 'Atajo vacío.<br><span class="d">Asigna hechizos desde el libro de hechizos (L) o comida y pociones con clic derecho en la mochila.</span>');
      }
      root.append(s);
    });
  }

  renderButtons() {
    const root = $('#buttons');
    root.innerHTML = '';
    for (const [label, key, fn] of this.buttons) {
      const b = el('button', { textContent: label, title: key ? `Tecla ${key}` : '' });
      b.onclick = () => {
        b.blur();
        fn();
      };
      root.append(b);
    }
  }
}
