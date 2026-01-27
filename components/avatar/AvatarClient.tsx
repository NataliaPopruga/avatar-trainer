'use client';

import { AvatarProvider } from '@/lib/providers/avatar';
import { MockAvatarClient } from './providers/MockAvatarClient';
import { HeygenAvatarClient } from './providers/HeygenAvatarClient';
import { TavusAvatarClient } from './providers/TavusAvatarClient';

type Props = {
  provider: AvatarProvider;
  avatarUrl: string;
  speechText?: string;
  personaLabel?: string;
};

export function AvatarClient(props: Props) {
  const { provider } = props;
  if (provider === 'heygen') {
    return <HeygenAvatarClient {...props} />;
  }
  if (provider === 'tavus') {
    return <TavusAvatarClient {...props} />;
  }

  return <MockAvatarClient {...props} />;
}
