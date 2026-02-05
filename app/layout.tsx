import type { Metadata } from 'next';
import './globals.css';
import { BackButton } from '@/components/back-button';

export const metadata: Metadata = {
  title: 'Avatar Trainer | CX Coach',
  description: 'Simulate tough customer conversations with adaptive avatars and get instant coaching.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gradient-to-b from-white via-[#f4f6fb] to-[#eef1ff] text-slate-900 font-sans">
        <BackButton hideOnPaths={['/']} />
        {children}
      </body>
    </html>
  );
}
