// Utilidades del DOM: elementos, ventanas arrastrables, menús contextuales y descripciones.
import { item, type ItemDef } from '../data/items';
import { VOCATIONS } from '../data/vocations';
import { ELEMENT_NAME } from '../game/types';

export const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> & { cls?: string } = {}, ...children: (Node | string | null | undefined)[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  const { cls, ...rest } = props as { cls?: string };
  if (cls) e.className = cls;
  Object.assign(e, rest);
  for (const c of children) if (c !== null && c !== undefined) e.append(c);
  return e;
}

export function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

/** Copia un canvas de sprite en uno nuevo (para meterlo en el DOM). */
export function spriteEl(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  c.getContext('2d')!.drawImage(src, 0, 0);
  return c;
}

// ----------------------------------------------------------- Descripción de objetos

export function itemTooltip(d: ItemDef, n = 1, extra = ''): string {
  const lines: string[] = [`<div class="t">${esc(d.name)}${n > 1 ? ` x${n}` : ''}</div>`];
  const stats: string[] = [];
  if (d.attack) stats.push(`Ataque ${d.attack}`);
  if (d.dmg) stats.push(`Daño ${d.dmg[0]}-${d.dmg[1]} (${d.manaCost} maná)`);
  if (d.element && d.element !== 'physical') stats.push(`Elemento: ${ELEMENT_NAME[d.element]}`);
  if (d.defense) stats.push(`Defensa ${d.defense}`);
  if (d.armor) stats.push(`Armadura ${d.armor}`);
  if (d.range) stats.push(`Alcance ${d.range}`);
  if (d.speed) stats.push(`Velocidad +${d.speed}`);
  if (d.regen) stats.push(`Regeneración +${d.regen}`);
  if (d.food) stats.push(`Sacia ${Math.round(d.food / 60)} min`);
  if (d.heal?.hp) stats.push(`Cura ${d.heal.hp} de vida`);
  if (d.heal?.mana) stats.push(`Restaura ${d.heal.mana} de maná`);
  if (stats.length) lines.push(stats.join(' · '));
  const req: string[] = [];
  if (d.voc) req.push(d.voc.map((v) => VOCATIONS[v].name).join(', '));
  if (d.level) req.push(`nivel ${d.level}`);
  if (req.length) lines.push(`<span class="d">Requiere: ${req.join(', ')}</span>`);
  if (d.weaponType === 'bow' && d.id !== 'honda') lines.push('<span class="d">A dos manos. Usa flechas.</span>');
  if (d.desc) lines.push(`<span class="d">${esc(d.desc)}</span>`);
  lines.push(`<span class="d">Peso ${(d.weight * n).toFixed(1)} oz${d.value ? ` · Valor ${d.value} oro` : ''}</span>`);
  if (extra) lines.push(extra);
  return lines.join('<br>');
}

const tip = () => $('#tooltip');

export function showTip(html: string, x: number, y: number) {
  const t = tip();
  t.innerHTML = html;
  t.style.display = 'block';
  const w = t.offsetWidth;
  const h = t.offsetHeight;
  t.style.left = `${Math.min(window.innerWidth - w - 6, x + 14)}px`;
  t.style.top = `${Math.min(window.innerHeight - h - 6, y + 14)}px`;
}
export function hideTip() {
  tip().style.display = 'none';
}

/** Muestra la descripción al pasar el ratón por encima. */
export function withTip(e: HTMLElement, html: () => string) {
  e.addEventListener('mousemove', (ev) => showTip(html(), ev.clientX, ev.clientY));
  e.addEventListener('mouseleave', hideTip);
}

export const itemTip = (id: string, n = 1, extra = '') => itemTooltip(item(id), n, extra);

// ----------------------------------------------------------- Menú contextual

export function contextMenu(x: number, y: number, options: [string, () => void][]) {
  const m = $('#menu');
  m.innerHTML = '';
  for (const [label, fn] of options) {
    const d = el('div', { textContent: label });
    d.onclick = () => {
      closeMenu();
      fn();
    };
    m.append(d);
  }
  m.style.display = 'block';
  m.style.left = `${Math.min(window.innerWidth - m.offsetWidth - 4, x)}px`;
  m.style.top = `${Math.min(window.innerHeight - m.offsetHeight - 4, y)}px`;
  hideTip();
}
export function closeMenu() {
  $('#menu').style.display = 'none';
}

// ----------------------------------------------------------- Ventanas

export interface Win {
  root: HTMLDivElement;
  body: HTMLDivElement;
  close: () => void;
  onClose?: () => void;
}

const open = new Map<string, Win>();

export function getWin(id: string): Win | undefined {
  return open.get(id);
}

export function closeWin(id: string) {
  open.get(id)?.close();
}

export function closeAllWins(): boolean {
  if (!open.size) return false;
  for (const w of [...open.values()]) w.close();
  return true;
}

/** Abre (o reutiliza) una ventana arrastrable. */
export function openWin(id: string, title: string, opts: { x?: number; y?: number; width?: number } = {}): Win {
  const existing = open.get(id);
  if (existing) {
    existing.body.innerHTML = '';
    (existing.root.querySelector('.wt span') as HTMLElement).textContent = title;
    return existing;
  }
  const root = el('div', { cls: 'win' });
  if (opts.width) root.style.width = `${opts.width}px`;
  const close = el('button', { textContent: '×', title: 'Cerrar (Esc)' });
  const bar = el('div', { cls: 'wt' }, el('span', { textContent: title }), close);
  const body = el('div', { cls: 'wb' });
  root.append(bar, body);
  $('#modal').append(root);
  if (opts.x !== undefined && opts.y !== undefined) {
    root.style.left = `${opts.x}px`;
    root.style.top = `${opts.y}px`;
  } else root.classList.add('center');
  const w: Win = {
    root,
    body,
    close: () => {
      root.remove();
      open.delete(id);
      hideTip();
      w.onClose?.();
    },
  };
  close.onclick = w.close;
  // Arrastrar por la barra de título
  bar.addEventListener('mousedown', (e) => {
    if (e.target === close) return;
    const r = root.getBoundingClientRect();
    root.classList.remove('center');
    root.style.left = `${r.left}px`;
    root.style.top = `${r.top}px`;
    const dx = e.clientX - r.left;
    const dy = e.clientY - r.top;
    const move = (ev: MouseEvent) => {
      root.style.left = `${Math.max(0, Math.min(window.innerWidth - 60, ev.clientX - dx))}px`;
      root.style.top = `${Math.max(0, Math.min(window.innerHeight - 30, ev.clientY - dy))}px`;
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  });
  open.set(id, w);
  return w;
}

/** Resalta las palabras clave {así} de los NPC y las hace clicables. */
export function keywordHtml(text: string): string {
  return esc(text).replace(/\{([^}]+)\}/g, (_, k) => `<span class="kw" data-kw="${k}">${k}</span>`);
}
