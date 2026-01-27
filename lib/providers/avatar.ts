import { Persona } from '@/lib/types';

export type AvatarProvider = 'mock' | 'heygen' | 'tavus';

const personaMap: Record<Persona, string> = {
  calm: '/avatars/calm.png',
  anxious: '/avatars/anxious.png',
  aggressive: '/avatars/aggressive.png',
  slangy: '/avatars/slangy.png',
  elderly: '/avatars/elderly.png',
  corporate: '/avatars/corporate.png',
  impatient: '/avatars/impatient.png',
  zoomer: '/avatars/zoomer.svg',
};

export function avatarForPersona(persona: Persona) {
  return personaMap[persona] || '/avatars/calm.png';
}

export function currentAvatarProvider(): AvatarProvider {
  const value = process.env.AVATAR_PROVIDER as AvatarProvider | undefined;
  if (value === 'heygen' || value === 'tavus') return value;
  return 'mock';
}
