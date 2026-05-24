'use client'

const BASE_VOLUME = 0.5;
let volumeOn = true;
let volumeLevel = 1.0;
let audioCtx = null;
// Tracks per-event: true = loaded OK, false = failed to load, undefined = loading
const audioReady = {};
const audioCache = {};

const SOUND_FILES = {
  draw:    '/sounds/draw.mp3',
  win:     '/sounds/win.mp3',
  bust:    '/sounds/bust.mp3',
  chip:    '/sounds/chip.mp3',
  clearbet: '/sounds/clearbet.mp3',
  stand:   '/sounds/stand.mp3',
};

// Pre-load all audio files as soon as we're on the client.
// By the time the user interacts, files are buffered and ready.
if (typeof window !== 'undefined') {
  Object.entries(SOUND_FILES).forEach(([event, src]) => {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.volume = BASE_VOLUME * volumeLevel;
    audio.addEventListener('canplaythrough', () => { audioReady[event] = true; }, { once: true });
    audio.addEventListener('error', () => { audioReady[event] = false; }, { once: true });
    audioCache[event] = audio;
  });
}

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function resumeAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
}

function setVolumeEnabled(enabled) {
  volumeOn = !!enabled;
  Object.values(audioCache).forEach(audio => {
    if (audio) audio.volume = volumeOn ? BASE_VOLUME * volumeLevel : 0;
  });
}

export function setVolumeLevel(level) {
  volumeLevel = Math.max(0, Math.min(1, level));
  if (volumeOn) {
    Object.values(audioCache).forEach(audio => {
      if (audio) audio.volume = BASE_VOLUME * volumeLevel;
    });
  }
}

// Returns true if the audio file played (or will play async).
// Returns false if the file failed to load — callers use synthesized fallback.
function playAudioEvent(event) {
  if (!volumeOn) return false;
  if (audioReady[event] === false) return false; // known bad file → use fallback

  const audio = audioCache[event];
  if (!audio) return false;

  audio.volume = BASE_VOLUME * volumeLevel;
  audio.currentTime = 0;
  const promise = audio.play();
  if (promise !== undefined) {
    promise.catch(() => {
      // Play was rejected (e.g. autoplay policy). Mark as failed so next call
      // goes straight to fallback synthesis instead of silently doing nothing.
      audioReady[event] = false;
    });
  }
  return true;
}

function playTone({ frequency, duration = 0.12, type = 'sine', volume = 0.18, when = 0 }) {
  if (!volumeOn) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;

  gain.gain.setValueAtTime(0, ctx.currentTime + when);
  gain.gain.linearRampToValueAtTime(volume * BASE_VOLUME * volumeLevel, ctx.currentTime + when + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + when);
  osc.stop(ctx.currentTime + when + duration + 0.02);
}

function playNoise({ duration = 0.14, volume = 0.18, when = 0 }) {
  if (!volumeOn) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const bufferSize = ctx.sampleRate * duration;
  const buffer     = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data       = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume * BASE_VOLUME * volumeLevel, ctx.currentTime + when);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + duration);

  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(ctx.currentTime + when);
  source.stop(ctx.currentTime + when + duration);
}

function playCardDraw({ duration = 0.16, volume = 0.16, when = 0 }) {
  if (!volumeOn) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const bufferSize = ctx.sampleRate * duration;
  const buffer     = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data       = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize * 0.5);
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2000, ctx.currentTime + when);
  filter.Q.setValueAtTime(8, ctx.currentTime + when);
  filter.frequency.linearRampToValueAtTime(1200, ctx.currentTime + when + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume * BASE_VOLUME * volumeLevel, ctx.currentTime + when);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(ctx.currentTime + when);
  source.stop(ctx.currentTime + when + duration);
}

export function playSound(event) {
  if (!volumeOn) return;
  // Ensure the AudioContext is running — harmless if already running.
  resumeAudio();

  switch (event) {
    case 'shuffle':
      if (!playAudioEvent('shuffle')) playNoise({ duration: 0.18, volume: 0.14 });
      break;
    case 'deal':
      if (!playAudioEvent('deal')) playTone({ frequency: 540, duration: 0.08, type: 'triangle', volume: 0.14 });
      break;
    case 'draw':
    case 'hit':
      if (!playAudioEvent('draw')) playCardDraw({ duration: 0.16, volume: 0.16 });
      break;
    case 'win':
      if (!playAudioEvent('win')) {
        playTone({ frequency: 820, duration: 0.12, type: 'sine', volume: 0.16 });
        playTone({ frequency: 1020, duration: 0.16, type: 'sine', volume: 0.16, when: 0.11 });
      }
      break;
    case 'bust':
      if (!playAudioEvent('bust')) {
        playTone({ frequency: 520, duration: 0.14, type: 'sawtooth', volume: 0.15 });
        playTone({ frequency: 360, duration: 0.14, type: 'sawtooth', volume: 0.15, when: 0.12 });
      }
      break;
    case 'push':
      if (!playAudioEvent('push')) playTone({ frequency: 680, duration: 0.12, type: 'triangle', volume: 0.14 });
      break;
    case 'chip':
      if (!playAudioEvent('chip')) playTone({ frequency: 900, duration: 0.06, type: 'sine', volume: 0.12 });
      break;
    case 'clearbet':
      if (!playAudioEvent('clearbet')) playTone({ frequency: 600, duration: 0.08, type: 'triangle', volume: 0.10 });
      break;
    case 'stand':
      if (!playAudioEvent('stand')) {
        playTone({ frequency: 500, duration: 0.1,  type: 'triangle', volume: 0.13 });
        playTone({ frequency: 360, duration: 0.13, type: 'triangle', volume: 0.11, when: 0.09 });
      }
      break;
    default:
      break;
  }
}

export { setVolumeEnabled };
