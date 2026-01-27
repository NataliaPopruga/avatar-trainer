import { NextRequest, NextResponse } from 'next/server';
import { generateSpeech } from '@/lib/audio/tts';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const text = (body?.text as string)?.slice(0, 500);
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });
  try {
    const result = await generateSpeech(text);
    return NextResponse.json(result);
  } catch (err) {
    console.error('tts failed', err);
    return NextResponse.json({ error: 'tts_failed' }, { status: 500 });
  }
}
