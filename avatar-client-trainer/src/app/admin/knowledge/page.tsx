import KnowledgeClient from "@/app/admin/knowledge/KnowledgeClient";
import { prisma } from "@/lib/prisma";
import { ensureDbReady } from "@/lib/db/ensure";
import { BackButton } from "@/components/BackButton";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  await ensureDbReady();
  const docs = await prisma.knowledgeDoc.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">База знаний</h2>
        <p className="mt-2 text-sm text-slate-600">
          Загружайте документы и запускайте переиндексацию для поиска.
        </p>
      </div>
      <BackButton />

      <KnowledgeClient />

      <div className="soft-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold">Документы</h3>
        <div className="mt-4 space-y-3 text-sm text-slate-600">
          {docs.length === 0 && <p>Документов пока нет.</p>}
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-800">{doc.title}</div>
                <div className="text-xs text-slate-500">{doc.version}</div>
              </div>
              <div className="text-xs text-slate-500">
                {doc.createdAt.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
