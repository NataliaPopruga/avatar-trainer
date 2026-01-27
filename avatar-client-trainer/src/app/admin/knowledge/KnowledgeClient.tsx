"use client";

import { useState } from "react";

export default function KnowledgeClient() {
  const [status, setStatus] = useState<string>("");

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("Загрузка...");
    const formData = new FormData(event.currentTarget);
    const res = await fetch("/api/admin/knowledge/upload", {
      method: "POST",
      body: formData,
    });
    const json = await res.json();
    setStatus(json.ok ? `Загружено. Чанков: ${json.chunks}` : json.error);
    event.currentTarget.reset();
  };

  const handleReindex = async () => {
    setStatus("Переиндексация...");
    const res = await fetch("/api/admin/knowledge/reindex", {
      method: "POST",
    });
    const json = await res.json();
    setStatus(json.ok ? `Переиндексировано. Чанков: ${json.totalChunks}` : json.error);
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleUpload}
        className="soft-card flex flex-col gap-3 rounded-2xl p-6"
      >
        <div className="text-sm font-medium text-slate-700">
          Загрузить markdown/txt
        </div>
        <input
          type="file"
          name="file"
          accept=".md,.txt"
          className="text-sm"
          required
        />
        <button
          className="w-fit rounded-full bg-purple-700 px-4 py-2 text-sm text-white"
          type="submit"
        >
          Загрузить
        </button>
      </form>

      <button
        onClick={handleReindex}
        className="rounded-full border border-purple-300 px-4 py-2 text-sm text-purple-700 hover:bg-purple-50"
      >
        Переиндексировать всё
      </button>

      {status && <p className="text-sm text-slate-600">{status}</p>}
    </div>
  );
}
