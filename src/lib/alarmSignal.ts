let ctx: AudioContext | null = null;

const audio = (): AudioContext | null => {
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx) ctx = new Ctor();
    if (ctx.state === 'suspended') ctx.resume().catch(() => undefined);
    return ctx;
  } catch {
    return null;
  }
};

export const beep = () => {
  const a = audio();
  if (!a) return;
  try {
    const now = a.currentTime;
    [0, 0.35, 0.7].forEach((offset) => {
      const osc = a.createOscillator();
      const gain = a.createGain();
      osc.type = 'square';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.35, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.22);
      osc.connect(gain);
      gain.connect(a.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.25);
    });
  } catch {
    /* звук недоступен — останется вибрация */
  }
};

export const buzz = () => {
  try {
    navigator.vibrate?.([400, 200, 400, 200, 700]);
  } catch {
    /* устройство без вибромотора */
  }
};

export const alarm = () => {
  buzz();
  beep();
};

export default alarm;
