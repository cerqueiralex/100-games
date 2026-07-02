/** Tiny WebAudio synth for UI feedback — no audio assets needed. */

let ctx: AudioContext | null = null;
let enabled = true;
let volume = 0.6;

export function configureAudio(on: boolean, vol: number): void {
  enabled = on;
  volume = vol;
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Tone with a frequency glide — used for pops and whooshes. */
function sweep(f0: number, f1: number, durMs: number, type: OscillatorType = 'sine', gainMul = 1): void {
  if (!enabled || volume <= 0) return;
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + durMs / 1000);
  const peak = 0.14 * volume * gainMul;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + durMs / 1000 + 0.05);
}

function tone(freq: number, durMs: number, type: OscillatorType, gainMul = 1, delayMs = 0): void {
  if (!enabled || volume <= 0) return;
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime + delayMs / 1000;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  const peak = 0.12 * volume * gainMul;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + durMs / 1000 + 0.05);
}

/** Play a single musical tone (used by games like Simon). Respects sound settings. */
export function playNote(freq: number, durMs = 300, type: OscillatorType = 'sine'): void {
  tone(freq, durMs, type);
}

export const sfx = {
  tap: () => tone(700, 50, 'sine', 0.7),
  /** soft short tick for continuous drag feedback */
  drag: () => tone(880, 26, 'sine', 0.35),
  /** bubbly pop for satisfying connections */
  pop: () => {
    sweep(260, 720, 90, 'sine', 1.1);
    tone(1150, 40, 'triangle', 0.5, 60);
  },
  place: () => tone(520, 80, 'triangle'),
  error: () => {
    tone(180, 160, 'sawtooth', 0.9);
    tone(140, 160, 'sawtooth', 0.7, 60);
  },
  hint: () => {
    tone(660, 90, 'sine');
    tone(880, 120, 'sine', 0.8, 90);
  },
  win: () => {
    tone(523, 120, 'triangle');
    tone(659, 120, 'triangle', 1, 110);
    tone(784, 160, 'triangle', 1, 220);
    tone(1047, 260, 'triangle', 1, 330);
  },
  lose: () => {
    tone(330, 200, 'triangle');
    tone(262, 260, 'triangle', 1, 180);
    tone(196, 380, 'triangle', 1, 360);
  }
};
