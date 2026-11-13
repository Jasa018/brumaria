// Sonido 8-bit sintetizado con WebAudio (sin archivos).
import type { SoundName } from '../game/types';

let ctx: AudioContext | null = null;
let muted = false;
try {
  muted = localStorage.getItem('brumaria-mute') === '1';
} catch {
  /* sin almacenamiento */
}

export function isMuted() {
  return muted;
}
export function toggleMute() {
  muted = !muted;
  try {
    localStorage.setItem('brumaria-mute', muted ? '1' : '0');
  } catch {
    /* sin almacenamiento */
  }
  return muted;
}

function ac(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.06, slide = 0, delay = 0) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.05, delay = 0) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  const g = a.createGain();
  src.buffer = buf;
  g.gain.value = vol;
  src.connect(g).connect(a.destination);
  src.start(t);
}

const last: Partial<Record<SoundName, number>> = {};

export function play(s: SoundName) {
  const now = performance.now();
  if ((last[s] ?? 0) > now - 60) return;
  last[s] = now;
  switch (s) {
    case 'hit': noise(0.08, 0.06); tone(140, 0.08, 'square', 0.04, -60); break;
    case 'miss': tone(500, 0.06, 'triangle', 0.03, -200); break;
    case 'hurt': tone(220, 0.15, 'sawtooth', 0.05, -120); break;
    case 'kill': tone(330, 0.08, 'square', 0.05); tone(220, 0.15, 'square', 0.05, -100, 0.08); break;
    case 'level': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'square', 0.05, 0, i * 0.1)); break;
    case 'spell': tone(700, 0.2, 'triangle', 0.05, 500); break;
    case 'heal': tone(600, 0.25, 'sine', 0.06, 300); tone(900, 0.2, 'sine', 0.04, 200, 0.08); break;
    case 'coin': tone(988, 0.06, 'square', 0.04); tone(1318, 0.12, 'square', 0.04, 0, 0.06); break;
    case 'step': noise(0.02, 0.01); break;
    case 'death': [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'triangle', 0.06, 0, i * 0.22)); break;
    case 'quest': [659, 784, 988].forEach((f, i) => tone(f, 0.15, 'triangle', 0.06, 0, i * 0.09)); break;
    case 'eat': noise(0.05, 0.03); noise(0.05, 0.03, 0.12); break;
    case 'stairs': tone(300, 0.12, 'triangle', 0.04, -100); tone(200, 0.12, 'triangle', 0.04, -80, 0.1); break;
    case 'bow': tone(900, 0.07, 'triangle', 0.03, -500); break;
  }
}
