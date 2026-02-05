import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/api/auth';
import { setWebEnabled, getWebConfig, setPlaceholderEnabled } from '@/lib/web-config';

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const cfg = await getWebConfig();
  return NextResponse.json(cfg);
}

export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const webEnabled = body?.webEnabled;
  const placeholderEnabled = body?.placeholderEnabled;
  if (typeof webEnabled === 'boolean') await setWebEnabled(webEnabled);
  if (typeof placeholderEnabled === 'boolean') await setPlaceholderEnabled(placeholderEnabled);
  const cfg = await getWebConfig();
  return NextResponse.json(cfg);
}
