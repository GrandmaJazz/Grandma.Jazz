// Keep long mixes streamed, but control their signal with Web Audio. iOS
// ignores HTMLMediaElement.volume; GainNode works on both phones and desktops.
export const MAX_MUSIC_VOLUME = 0.8;
export const clampMusicVolume = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.min(MAX_MUSIC_VOLUME, value)) : 0;

let musicContext: AudioContext | null = null;
interface AudioSlot {
  audio: HTMLAudioElement;
  context: AudioContext;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
  inUse: boolean;
  unlocked: boolean;
}
const audioSlots: AudioSlot[] = [];

function getMusicContext() {
  if (!musicContext || musicContext.state === 'closed') {
    const AudioContextClass = window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) throw new Error('Web Audio is unavailable');
    musicContext = new AudioContextClass();
  }
  return musicContext;
}

function createAudioSlot(): AudioSlot {
  const context = getMusicContext();
  const audio = new Audio();
  audio.crossOrigin = 'anonymous';
  audio.preload = 'auto';
  const slot = { audio, context, source: context.createMediaElementSource(audio),
    gain: context.createGain(), inUse: false, unlocked: false };
  audioSlots.push(slot);
  return slot;
}

export function unlockMusicAudio() {
  const context = getMusicContext();
  // Safari also unlocks media per element. Prepare a spare during the gesture
  // so the turntable can start it later, and reuse each element's source node.
  if (!audioSlots.some(slot => !slot.inUse)) createAudioSlot();
  for (const slot of audioSlots) {
    if (!slot.unlocked) {
      slot.audio.load();
      slot.unlocked = true;
    }
  }
  if (context.state !== 'running') {
    void context.resume().catch(() => { /* The next play gesture can retry. */ });
  }
}

interface StreamingMusicOptions {
  src: string;
  volume: number;
  loop: boolean;
  onload: () => void;
  onplay: () => void;
  onpause: () => void;
  onstop: () => void;
  onend: () => void;
  onerror: () => void;
}

export class StreamingMusic {
  private readonly slot: AudioSlot;
  private readonly audio: HTMLAudioElement;
  private readonly context: AudioContext;
  private readonly source: MediaElementAudioSourceNode;
  private readonly gain: GainNode;
  private level: number;
  private disposed = false;
  private wantsPlayback = false;

  constructor(private readonly options: StreamingMusicOptions) {
    this.slot = audioSlots.find(slot => !slot.inUse) || createAudioSlot();
    this.slot.inUse = true;
    this.context = this.slot.context;
    this.audio = this.slot.audio;
    this.audio.loop = options.loop;
    this.level = clampMusicVolume(options.volume);
    this.source = this.slot.source;
    this.gain = this.slot.gain;
    this.gain.gain.cancelScheduledValues(this.context.currentTime);
    this.gain.gain.value = this.level;
    this.source.connect(this.gain);
    this.gain.connect(this.context.destination);
    this.audio.addEventListener('loadedmetadata', options.onload);
    this.audio.addEventListener('playing', options.onplay);
    this.audio.addEventListener('pause', options.onpause);
    this.audio.addEventListener('ended', options.onend);
    this.audio.addEventListener('error', options.onerror);
    this.audio.src = options.src;
    this.audio.load();
  }

  play() {
    if (this.disposed) return;
    this.wantsPlayback = true;
    // Start both inside the gesture, rather than awaiting resume first and
    // losing Safari's user activation before audio.play().
    const resume = this.context.state === 'running' ? Promise.resolve() : this.context.resume();
    const playback = this.audio.play();
    void Promise.all([resume, playback]).catch((error) => {
      if (this.disposed || !this.wantsPlayback || error?.name === 'AbortError') return;
      this.wantsPlayback = false;
      this.audio.pause();
      this.options.onerror();
    });
  }

  pause() {
    this.wantsPlayback = false;
    this.audio.pause();
  }

  stop() {
    this.pause();
    this.audio.currentTime = 0;
    this.options.onstop();
  }

  unload() {
    if (this.disposed) return;
    this.disposed = true;
    this.wantsPlayback = false;
    this.audio.removeEventListener('loadedmetadata', this.options.onload);
    this.audio.removeEventListener('playing', this.options.onplay);
    this.audio.removeEventListener('pause', this.options.onpause);
    this.audio.removeEventListener('ended', this.options.onend);
    this.audio.removeEventListener('error', this.options.onerror);
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    this.source.disconnect();
    this.gain.disconnect();
    this.slot.inUse = false;
  }

  volume(value: number) {
    this.level = clampMusicVolume(value);
    // A short ramp prevents clicks without delaying slider feedback.
    this.gain.gain.cancelScheduledValues(this.context.currentTime);
    this.gain.gain.setTargetAtTime(this.level, this.context.currentTime, 0.015);
  }

  playing() { return this.wantsPlayback && !this.audio.paused; }
  duration() { return Number.isFinite(this.audio.duration) ? this.audio.duration : 0; }
  seek(position?: number) {
    if (position !== undefined && Number.isFinite(position)) {
      this.audio.currentTime = Math.max(0, Math.min(this.duration(), position));
    }
    return this.audio.currentTime;
  }
}
