"use client";

import { useState } from "react";

export default function QuestionsClient() {
  const [status, setStatus] = useState<string>("");

  const handleImport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("Импорт...");
    const formData = new FormData(event.currentTarget);
    const res = await fetch("/api/admin/questions/import", {
      method: "POST",
      body: formData,
    });
    const json = await res.json();
    setStatus(json.ok ? `Импортировано: ${json.imported}` : json.error);
    event.currentTarget.reset();
  };

  const handleMine = async () => {
    setStatus("Генерация интентов...");
    const res = await fetch("/api/admin/questions/mine-intents", {
      method: "POST",
    });
    const json = await res.json();
    setStatus(json.ok ? `Интентов создано: ${json.intents}` : json.error);
  };

  const handleGenerate = async () => {
    setStatus("Генерация сценариев...");
    const res = await fetch("/api/admin/questions/generate-pool", {
      method: "POST",
    });
    const json = await res.json();
    setStatus(json.ok ? `Сценариев: ${json.scenarios}` : json.error);
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleImport}
        className="soft-card flex flex-col gap-3 rounded-2xl p-6"
      >
        <div className="text-sm font-medium text-slate-700">
          Импортировать questions.csv
        </div>
        <input
          type="file"
          name="file"
          accept=".csv"
          className="text-sm"
          required
        />
        <button
          className="w-fit rounded-full bg-purple-700 px-4 py-2 text-sm text-white"
          type="submit"
        >
          Импорт
        </button>
      </form>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleMine}
          className="rounded-full border border-purple-300 px-4 py-2 text-sm text-purple-700 hover:bg-purple-50"
        >
          Построить интенты
        </button>
        <button
          onClick={handleGenerate}
          className="rounded-full border border-purple-300 px-4 py-2 text-sm text-purple-700 hover:bg-purple-50"
        >
          Сгенерировать пул
        </button>
      </div>

      {status && <p className="text-sm text-slate-600">{status}</p>}
    </div>
  );
}
