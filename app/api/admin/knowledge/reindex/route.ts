import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/api/auth';
import { reindexAllDocuments } from '@/lib/providers/retrieval';

export async function POST() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  await reindexAllDocuments();
  return NextResponse.json({ ok: true });
}
