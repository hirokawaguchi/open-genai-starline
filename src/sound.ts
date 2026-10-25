let audio: AudioContext | null = null;

const context = (): AudioContext | null => {
  const Ctx = window.AudioContext;
  if (!Ctx) {
    return null;
  }
  if (!audio) {
    audio = new Ctx();
  }
  if (audio.state === 'suspended') {
    void audio.resume();
  }
  return audio;
};

const tone = (freq: number, duration: number, type: OscillatorType, gain: number) => {
  const ctx = context();
  if (!ctx) {
    return;
  }
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(gain, ctx.currentTime);
  amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
};

export const playStarlineCue = (
  muted: boolean,
  kind: 'fire' | 'down' | 'hurt' | 'clear' | 'over' | 'bonus',
) => {
  if (muted) {
    return;
  }
  try {
    if (kind === 'fire') {
      tone(640, 0.06, 'square', 0.03);
      return;
    }
    if (kind === 'down') {
      tone(220, 0.08, 'triangle', 0.04);
      return;
    }
    if (kind === 'hurt') {
      tone(110, 0.18, 'sawtooth', 0.04);
      return;
    }
    if (kind === 'clear') {
      tone(520, 0.12, 'sine', 0.04);
      return;
    }
    if (kind === 'bonus') {
      tone(880, 0.1, 'sine', 0.04);
      return;
    }
    tone(90, 0.28, 'triangle', 0.05);
  } catch {
    // 音が出せない環境でも遊びは続ける。
  }
};
