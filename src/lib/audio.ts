import type { GameSettings } from "../game/types";

type Sound =
  | "click"
  | "kickoff"
  | "goal"
  | "enhance-success"
  | "enhance-fail"
  | "trophy"
  | "retire";

const patterns: Record<
  Sound,
  Array<[frequency: number, duration: number, offset: number]>
> = {
  click: [[420, 0.045, 0]],
  kickoff: [
    [260, 0.09, 0],
    [520, 0.12, 0.08],
  ],
  goal: [
    [440, 0.11, 0],
    [660, 0.13, 0.1],
    [880, 0.2, 0.22],
  ],
  "enhance-success": [
    [392, 0.12, 0],
    [523, 0.12, 0.1],
    [784, 0.28, 0.2],
  ],
  "enhance-fail": [
    [180, 0.18, 0],
    [125, 0.25, 0.16],
  ],
  trophy: [
    [523, 0.12, 0],
    [659, 0.12, 0.1],
    [784, 0.12, 0.2],
    [1046, 0.3, 0.3],
  ],
  retire: [
    [392, 0.18, 0],
    [330, 0.18, 0.17],
    [262, 0.35, 0.34],
  ],
};

export function playSound(sound: Sound, settings: GameSettings) {
  if (settings.muted || settings.volume <= 0 || typeof window === "undefined")
    return;
  const AudioContextClass =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const start = context.currentTime;
  for (const [frequency, duration, offset] of patterns[sound]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type =
      sound === "goal" || sound === "trophy" ? "triangle" : "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(settings.volume * 0.12, start + offset);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start + offset);
    oscillator.stop(start + offset + duration);
  }
  window.setTimeout(() => {
    void context.close();
  }, 1000);
}
