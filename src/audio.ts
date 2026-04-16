const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

const playSound = (freq: number, type: OscillatorType, duration: number, volume: number) => {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + duration);
};

export const sounds = {
  move: () => playSound(150, 'square', 0.05, 0.05),
  rotate: () => playSound(300, 'triangle', 0.1, 0.05),
  land: () => playSound(100, 'sine', 0.1, 0.1),
  clear: (isTetris: boolean) => {
    if (isTetris) {
      playSound(400, 'square', 0.5, 0.1);
      setTimeout(() => playSound(600, 'square', 0.5, 0.1), 100);
    } else {
      playSound(500, 'sine', 0.2, 0.1);
    }
  },
  attack: () => {
    playSound(200, 'sawtooth', 0.3, 0.05);
    playSound(150, 'sawtooth', 0.3, 0.05);
  },
  gameOver: () => {
    playSound(300, 'sawtooth', 0.5, 0.1);
    playSound(200, 'sawtooth', 0.5, 0.1);
    playSound(100, 'sawtooth', 0.8, 0.1);
  }
};
