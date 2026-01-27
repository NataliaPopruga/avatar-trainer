// Lightweight bridge to rhubarb-lip-sync-wasm with graceful fallback.
// Runs only in the browser. Returns mouth cues or null on failure.

export type MouthCue = { start: number; end: number; value: string };

let rhubarbPromise: Promise<any> | null = null;

// Load rhubarb via runtime dynamic import so build works even if the package is absent.
async function loadRhubarb() {
  if (typeof window === 'undefined') return null;
  if (!rhubarbPromise) {
    const dynamicImport = new Function('m', 'return import(m)');
    rhubarbPromise = dynamicImport('rhubarb-lip-sync-wasm').catch(() => null);
  }
  return rhubarbPromise;
}

// Resample audio data to 16k mono PCM (Int16).
async function toPCM16(audioBuffer: AudioBuffer, targetRate = 16000) {
  const offline = new OfflineAudioContext(1, Math.ceil((audioBuffer.duration || 0) * targetRate), targetRate);
  const src = offline.createBufferSource();
  // mono mixdown
  const mono = offline.createBuffer(1, audioBuffer.length, audioBuffer.sampleRate);
  const ch = mono.getChannelData(0);
  for (let i = 0; i < audioBuffer.length; i++) {
    let sum = 0;
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) sum += audioBuffer.getChannelData(c)[i];
    ch[i] = sum / audioBuffer.numberOfChannels;
  }
  src.buffer = mono;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();
  const data = rendered.getChannelData(0);
  const pcm = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return pcm.buffer;
}

export async function generateMouthCuesFromUrl(url: string, dialogText?: string): Promise<MouthCue[] | null> {
  try {
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    const audioCtx = new AudioContext();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);
    const pcmBuffer = await toPCM16(decoded, 16000);
    const rhubarb = await loadRhubarb();
    if (!rhubarb?.Rhubarb) return null;
    const result = await rhubarb.Rhubarb.getLipSync(pcmBuffer as any, { dialogText });
    return (result?.mouthCues as MouthCue[]) || null;
  } catch {
    return null;
  }
}
