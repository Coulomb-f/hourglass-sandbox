let ctx: AudioContext | null = null;

export function unlockAudio() {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!ctx) ctx = new Ctx();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** A single low bell — sung, not beeped. */
export function playChime() {
  const context = unlockAudio();
  if (!context) return;
  const now = context.currentTime;
  const master = context.createGain();
  master.gain.setValueAtTime(0.85, now);
  master.connect(context.destination);

  const partials = [
    { freq: 392, gain: 0.06, decay: 2.8 },
    { freq: 587.33, gain: 0.03, decay: 2.2 },
    { freq: 783.99, gain: 0.016, decay: 1.7 },
    { freq: 987.77, gain: 0.008, decay: 1.3 },
  ];

  for (const partial of partials) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(partial.freq, now);
    osc.frequency.exponentialRampToValueAtTime(partial.freq * 0.985, now + partial.decay);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(partial.gain, now + 0.028);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + partial.decay);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + partial.decay + 0.05);
  }
}
