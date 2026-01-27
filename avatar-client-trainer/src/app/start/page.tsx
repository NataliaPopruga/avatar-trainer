import StartClient from "@/app/start/StartClient";
import { ensureDbReady } from "@/lib/db/ensure";
import { BackButton } from "@/components/BackButton";

export const dynamic = "force-dynamic";

export default async function StartPage() {
  await ensureDbReady();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Начать сессию</h2>
        <p className="mt-2 text-sm text-slate-600">
          Выберите режим и домен, чтобы начать диалог с аватаром.
        </p>
      </div>
      <BackButton />
      <StartClient />
    </div>
  );
}
