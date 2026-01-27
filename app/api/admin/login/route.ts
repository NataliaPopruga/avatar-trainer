import { NextRequest, NextResponse } from 'next/server';
import { createAdminSession } from '@/lib/api/auth';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const pin = (body?.pin as string) || '';
  const expected = process.env.ADMIN_PIN || '1234';
  if (pin !== expected) {
    return NextResponse.json({ error: 'Неверный PIN' }, { status: 401 });
  }
  await createAdminSession();
  return NextResponse.json({ ok: true });
}
