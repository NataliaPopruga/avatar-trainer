import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/api/auth';

export async function GET() {
  const session = await getAdminSession();
  return NextResponse.json({ authorized: Boolean(session) });
}
