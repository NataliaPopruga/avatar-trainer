export type STTProvider = 'browser' | 'openai' | 'azure';

export function currentSTTProvider(): STTProvider {
  const value = process.env.STT_PROVIDER as STTProvider;
  return value || 'browser';
}

export const sttConfig = {
  provider: currentSTTProvider(),
};
