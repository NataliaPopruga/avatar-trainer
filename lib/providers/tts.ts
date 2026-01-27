export type TTSProvider = 'browser' | 'openai' | 'elevenlabs' | 'azure';

export function currentTTSProvider(): TTSProvider {
  const value = process.env.TTS_PROVIDER as TTSProvider;
  return value || 'browser';
}

export const ttsConfig = {
  provider: currentTTSProvider(),
  voice: process.env.TTS_VOICE || 'alloy',
  useAudioElementForTTS: process.env.USE_AUDIO_ELEMENT_FOR_TTS !== 'false',
};
