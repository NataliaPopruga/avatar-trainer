import SessionClient from "@/app/session/[id]/SessionClient";
import { prisma } from "@/lib/prisma";
import { ensureDbReady } from "@/lib/db/ensure";
import { BackButton } from "@/components/BackButton";

export const dynamic = "force-dynamic";

export default async function SessionPage({
  params,
}: {
  params: { id?: string };
}) {
  await ensureDbReady();
  const { id } = params ?? {};
  if (!id) return <div>Сессия не найдена</div>;
  const session = await prisma.session.findUnique({
    where: { id },
    include: { turns: true },
  });

  if (!session) {
    return <div>Сессия не найдена</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Сессия</h2>
        <p className="mt-2 text-sm text-slate-600">
          Режим: {session.mode}
        </p>
      </div>
      <BackButton />
      <SessionClient
        sessionId={session.id}
        initialTurns={session.turns}
        mode={session.mode}
      />
    </div>
  );
}
