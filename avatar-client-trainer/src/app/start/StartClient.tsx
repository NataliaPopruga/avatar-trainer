"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StartClient() {
  const router = useRouter();
  const [mode, setMode] = useState<"exam" | "training">("training");
  const [domain, setDomain] = useState<string>("auto");
  const [status, setStatus] = useState<string>("");

  const readJsonSafe = async (res: Response) => {
    try {
      return await res.json();
    } catch {
      const text = await res.text();
      return { error: text || "Server error" };
    }
  };

  const handleStart = async () => {
    setStatus("Запускаем сессию...");
    const res = await fetch("/api/session/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        domain: domain === "auto" ? undefined : domain,
      }),
    });
    const json = await readJsonSafe(res);
    if (json.sessionId) {
      router.push(`/session/${json.sessionId}`);
      return;
    }
    setStatus(json.error || "Не удалось начать");
  };

  return (
    <div className="soft-card rounded-3xl p-8">
      <div className="grid gap-6 md:grid-cols-3">
        <div>
          <div className="text-sm text-slate-500">Режим</div>
          <div className="mt-3 flex flex-col gap-2">
            {(["training", "exam"] as const).map((item) => (
              <label key={item} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="mode"
                  value={item}
                  checked={mode === item}
                  onChange={() => setMode(item)}
                />
                {item === "training" ? "Тренировка" : "Экзамен"}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm text-slate-500">Домен</div>
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="mt-3 w-full rounded-lg border border-purple-200 px-3 py-2 text-sm"
          >
            <option value="auto">Авто</option>
            <option value="access">Доступ</option>
            <option value="cards">Карты</option>
            <option value="transfers">Переводы</option>
            <option value="fees">Тарифы/Комиссии</option>
            <option value="disputes">Споры</option>
            <option value="compliance">Комплаенс</option>
            <option value="service">Сервис</option>
            <option value="app">Приложение</option>
          </select>
        </div>

        <div className="flex flex-col justify-end">
          <button
            onClick={handleStart}
            className="rounded-full bg-purple-700 px-5 py-2 text-sm font-medium text-white shadow-[0_10px_30px_rgba(108,54,255,0.3)] hover:bg-purple-800"
          >
            Начать
          </button>
          {status && <p className="mt-2 text-xs text-slate-500">{status}</p>}
        </div>
      </div>
    </div>
  );
}
