import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  const token = cookies().get('admin_token')?.value;
  if (token) {
    await prisma.adminSession.deleteMany({ where: { token } });
    cookies().set('admin_token', '', { maxAge: 0, path: '/' });
  }
  return NextResponse.json({ ok: true });
}
