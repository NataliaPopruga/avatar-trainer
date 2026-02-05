import SamJs from 'sam-js';
import { Rhubarb } from 'rhubarb-lip-sync-wasm';
import * as WavDecoder from 'wav-decoder';
import { Buffer } from 'buffer';
import { resampleFloat32, floatToInt16PCM } from './resample';

const sam = new SamJs();

export interface GeneratedSpeech {
  audioBase64: string;
  mouthCues: { start: number; end: number; value: string }[];
}

export async function generateSpeech(text: string): Promise<GeneratedSpeech> {
  const wavBytes = sam.buf8(text) as Uint8Array | null;
  if (!wavBytes || typeof (wavBytes as any).length !== 'number') {
    throw new Error('sam-js failed to synthesize');
  }
  const wavBuffer = Buffer.from(new Uint8Array(wavBytes));
  const audioData = await WavDecoder.decode(wavBuffer);
  const mono = audioData.channelData[0];
  const resampled = resampleFloat32(mono, audioData.sampleRate, 16000);
  const int16 = floatToInt16PCM(resampled);
  const cues = await Rhubarb.getLipSync(Buffer.from(int16.buffer), { dialogText: text });
  const audioBase64 = `data:audio/wav;base64,${wavBuffer.toString('base64')}`;
  return { audioBase64, mouthCues: cues.mouthCues };
}
