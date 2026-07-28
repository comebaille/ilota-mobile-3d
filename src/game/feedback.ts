export type FeedbackEvent =
  | 'ui'
  | 'harvest'
  | 'deposit'
  | 'build'
  | 'recruit'
  | 'level'
  | 'skill'
  | 'power'
  | 'victory';

interface FeedbackSettings {
  version: 1;
  sound: boolean;
  haptics: boolean;
}

const SETTINGS_KEY = 'ilota-feedback-v1';
const DEFAULT_SETTINGS: FeedbackSettings = { version: 1, sound: true, haptics: true };

const readSettings = (): FeedbackSettings => {
  try {
    const value = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '') as Partial<FeedbackSettings>;
    return {
      version: 1,
      sound: value.sound !== false,
      haptics: value.haptics !== false,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

const EVENT_TONES: Record<FeedbackEvent, readonly [number, number, OscillatorType]> = {
  ui: [520, 0.045, 'sine'],
  harvest: [190, 0.07, 'triangle'],
  deposit: [340, 0.08, 'sine'],
  build: [220, 0.24, 'triangle'],
  recruit: [440, 0.2, 'sine'],
  level: [620, 0.28, 'triangle'],
  skill: [720, 0.3, 'sine'],
  power: [125, 0.36, 'sawtooth'],
  victory: [520, 0.6, 'triangle'],
};

const EVENT_HAPTICS: Record<FeedbackEvent, number | number[]> = {
  ui: 8,
  harvest: 12,
  deposit: 10,
  build: [18, 30, 28],
  recruit: [12, 25, 18],
  level: [16, 25, 16, 25, 30],
  skill: [12, 20, 26],
  power: [24, 35, 24],
  victory: [25, 45, 35, 45, 55],
};

export class FeedbackController {
  private settings = readSettings();
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambience: { source: AudioBufferSourceNode; gain: GainNode } | null = null;

  get soundEnabled(): boolean { return this.settings.sound; }
  get hapticsEnabled(): boolean { return this.settings.haptics; }

  async unlock(): Promise<void> {
    if (!this.settings.sound) return;
    const AudioContextConstructor = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;
    if (!this.context) {
      this.context = new AudioContextConstructor();
      this.master = this.context.createGain();
      this.master.gain.value = 0.38;
      this.master.connect(this.context.destination);
      this.startAmbience();
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }

  setSoundEnabled(enabled: boolean): void {
    this.settings.sound = enabled;
    this.persist();
    if (enabled) void this.unlock();
    else if (this.context?.state === 'running') void this.context.suspend();
  }

  setHapticsEnabled(enabled: boolean): void {
    this.settings.haptics = enabled;
    this.persist();
    if (enabled && navigator.vibrate) navigator.vibrate(12);
  }

  play(event: FeedbackEvent): void {
    this.vibrate(event);
    if (!this.settings.sound) return;
    void this.unlock().then(() => {
      if (!this.context || !this.master || this.context.state !== 'running') return;
      const [frequency, duration, type] = EVENT_TONES[event];
      const now = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      if (event === 'level' || event === 'skill' || event === 'victory') {
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.5, now + duration);
      } else {
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(70, frequency * 0.78), now + duration);
      }
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(event === 'power' ? 0.07 : 0.12, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain).connect(this.master);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.02);
    });
  }

  private vibrate(event: FeedbackEvent): void {
    if (this.settings.haptics && navigator.vibrate) navigator.vibrate(EVENT_HAPTICS[event]);
  }

  private startAmbience(): void {
    if (!this.context || !this.master || this.ambience) return;
    const length = this.context.sampleRate * 2;
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const samples = buffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < length; index += 1) {
      previous = previous * 0.985 + (Math.random() * 2 - 1) * 0.015;
      samples[index] = previous;
    }
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = buffer;
    source.loop = true;
    filter.type = 'lowpass';
    filter.frequency.value = 780;
    gain.gain.value = 0.055;
    source.connect(filter).connect(gain).connect(this.master);
    source.start();
    this.ambience = { source, gain };
  }

  private persist(): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
  }
}
