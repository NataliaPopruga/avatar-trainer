import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';

export async function getAdminSession() {
  const token = cookies().get('admin_token')?.value;
  if (!token) return null;
  return prisma.adminSession.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() },
    },
  });
}

export async function createAdminSession() {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await prisma.adminSession.create({ data: { token, expiresAt } });
  cookies().set('admin_token', token, { httpOnly: true, path: '/', maxAge: 7 * 24 * 60 * 60 });
  return session;
}
